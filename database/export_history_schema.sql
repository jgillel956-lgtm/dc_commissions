-- Export History Database Schema

-- Table for storing export history and file management
CREATE TABLE IF NOT EXISTS export_history (
    id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    export_type VARCHAR(50) NOT NULL CHECK (export_type IN ('revenue_analysis', 'commission_analysis', 'comprehensive', 'custom', 'executive', 'operational')),
    format VARCHAR(20) NOT NULL CHECK (format IN ('pdf', 'excel', 'csv', 'json')),
    template_id VARCHAR(255) REFERENCES export_templates(id) ON DELETE SET NULL,
    template_name VARCHAR(255),
    filters JSONB DEFAULT '{}',
    file_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'archived', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_export_history_user_id ON export_history(user_id);
CREATE INDEX IF NOT EXISTS idx_export_history_export_type ON export_history(export_type);
CREATE INDEX IF NOT EXISTS idx_export_history_format ON export_history(format);
CREATE INDEX IF NOT EXISTS idx_export_history_status ON export_history(status);
CREATE INDEX IF NOT EXISTS idx_export_history_created_at ON export_history(created_at);
CREATE INDEX IF NOT EXISTS idx_export_history_template_id ON export_history(template_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_export_history_user_status ON export_history(user_id, status);
CREATE INDEX IF NOT EXISTS idx_export_history_user_type ON export_history(user_id, export_type);
CREATE INDEX IF NOT EXISTS idx_export_history_user_format ON export_history(user_id, format);
CREATE INDEX IF NOT EXISTS idx_export_history_user_created ON export_history(user_id, created_at DESC);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_export_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_export_history_updated_at
    BEFORE UPDATE ON export_history
    FOR EACH ROW
    EXECUTE FUNCTION update_export_history_updated_at();

-- Function to get user export count
CREATE OR REPLACE FUNCTION get_user_export_count(user_id_param INTEGER)
RETURNS INTEGER AS $$
DECLARE
    export_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO export_count
    FROM export_history
    WHERE user_id = user_id_param AND status != 'deleted';
    
    RETURN export_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get user export statistics
CREATE OR REPLACE FUNCTION get_user_export_statistics(user_id_param INTEGER)
RETURNS TABLE (
    total_exports BIGINT,
    completed_exports BIGINT,
    failed_exports BIGINT,
    total_size BIGINT,
    exports_last_7_days BIGINT,
    exports_last_30_days BIGINT,
    avg_file_size BIGINT,
    most_used_format VARCHAR(20),
    most_used_type VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_exports,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_exports,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_exports,
        COALESCE(SUM(file_size), 0) as total_size,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as exports_last_7_days,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as exports_last_30_days,
        COALESCE(AVG(file_size), 0) as avg_file_size,
        (SELECT format FROM export_history 
         WHERE user_id = user_id_param AND status != 'deleted'
         GROUP BY format ORDER BY COUNT(*) DESC LIMIT 1) as most_used_format,
        (SELECT export_type FROM export_history 
         WHERE user_id = user_id_param AND status != 'deleted'
         GROUP BY export_type ORDER BY COUNT(*) DESC LIMIT 1) as most_used_type
    FROM export_history
    WHERE user_id = user_id_param AND status != 'deleted';
END;
$$ LANGUAGE plpgsql;

-- Function to get exports by date range
CREATE OR REPLACE FUNCTION get_exports_by_date_range(
    user_id_param INTEGER,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    id VARCHAR(255),
    export_type VARCHAR(50),
    format VARCHAR(20),
    file_name VARCHAR(255),
    file_size BIGINT,
    status VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        eh.id,
        eh.export_type,
        eh.format,
        eh.file_name,
        eh.file_size,
        eh.status,
        eh.created_at
    FROM export_history eh
    WHERE eh.user_id = user_id_param
      AND eh.created_at >= start_date
      AND eh.created_at <= end_date
      AND eh.status != 'deleted'
    ORDER BY eh.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get exports by type and format
CREATE OR REPLACE FUNCTION get_exports_by_type_format(
    user_id_param INTEGER,
    export_type_param VARCHAR(50),
    format_param VARCHAR(20)
)
RETURNS TABLE (
    id VARCHAR(255),
    template_name VARCHAR(255),
    file_name VARCHAR(255),
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        eh.id,
        eh.template_name,
        eh.file_name,
        eh.file_size,
        eh.created_at
    FROM export_history eh
    WHERE eh.user_id = user_id_param
      AND eh.export_type = export_type_param
      AND eh.format = format_param
      AND eh.status = 'completed'
    ORDER BY eh.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old exports
CREATE OR REPLACE FUNCTION cleanup_old_exports(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM export_history
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL
      AND status IN ('completed', 'failed');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get export file paths for cleanup
CREATE OR REPLACE FUNCTION get_old_export_files(retention_days INTEGER DEFAULT 30)
RETURNS TABLE (
    file_path TEXT,
    file_name VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        eh.file_path,
        eh.file_name
    FROM export_history eh
    WHERE eh.created_at < NOW() - (retention_days || ' days')::INTERVAL
      AND eh.status IN ('completed', 'failed');
END;
$$ LANGUAGE plpgsql;

-- Views for common queries
CREATE OR REPLACE VIEW user_export_summary AS
SELECT 
    user_id,
    COUNT(*) as total_exports,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_exports,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_exports,
    COALESCE(SUM(file_size), 0) as total_size,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as exports_last_7_days,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as exports_last_30_days,
    MAX(created_at) as last_export_date
FROM export_history
WHERE status != 'deleted'
GROUP BY user_id;

CREATE OR REPLACE VIEW export_format_statistics AS
SELECT 
    format,
    COUNT(*) as total_exports,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_exports,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_exports,
    COALESCE(AVG(file_size), 0) as avg_file_size,
    COALESCE(SUM(file_size), 0) as total_size
FROM export_history
WHERE status != 'deleted'
GROUP BY format
ORDER BY total_exports DESC;

CREATE OR REPLACE VIEW export_type_statistics AS
SELECT 
    export_type,
    COUNT(*) as total_exports,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_exports,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_exports,
    COALESCE(AVG(file_size), 0) as avg_file_size,
    COALESCE(SUM(file_size), 0) as total_size
FROM export_history
WHERE status != 'deleted'
GROUP BY export_type
ORDER BY total_exports DESC;

-- Insert sample data for testing
INSERT INTO export_history (id, user_id, export_type, format, template_name, filters, file_path, file_name, file_size, metadata, status, created_at) VALUES
('sample-export-1', 1, 'revenue_analysis', 'pdf', 'Revenue Analysis Template', '{"dateRange": {"type": "last_30_days"}}', '/temp/exports/user_1/2024-01-15/revenue_analysis/2024-01-15_14-30-00_user_1_revenue_analysis_Revenue_Analysis_PDF.pdf', '2024-01-15_14-30-00_user_1_revenue_analysis_Revenue_Analysis_PDF.pdf', 1024000, '{"user_id": 1, "export_type": "revenue_analysis", "format": "pdf"}', 'completed', NOW() - INTERVAL '2 days'),
('sample-export-2', 1, 'commission_analysis', 'excel', 'Commission Analysis Template', '{"dateRange": {"type": "last_30_days"}, "companies": {"selected_companies": [1, 2]}}', '/temp/exports/user_1/2024-01-14/commission_analysis/2024-01-14_10-15-30_user_1_commission_analysis_Commission_Analysis_2_companies_EXCEL.xlsx', '2024-01-14_10-15-30_user_1_commission_analysis_Commission_Analysis_2_companies_EXCEL.xlsx', 2048000, '{"user_id": 1, "export_type": "commission_analysis", "format": "excel"}', 'completed', NOW() - INTERVAL '5 days'),
('sample-export-3', 1, 'comprehensive', 'csv', 'Comprehensive Report Template', '{"dateRange": {"type": "custom", "start_date": "2024-01-01", "end_date": "2024-01-31"}}', '/temp/exports/user_1/2024-01-10/comprehensive/2024-01-10_16-45-20_user_1_comprehensive_Comprehensive_Report_CSV.csv', '2024-01-10_16-45-20_user_1_comprehensive_Comprehensive_Report_CSV.csv', 512000, '{"user_id": 1, "export_type": "comprehensive", "format": "csv"}', 'completed', NOW() - INTERVAL '10 days'),
('sample-export-4', 2, 'executive', 'pdf', 'Executive Summary Template', '{"dateRange": {"type": "last_90_days"}}', '/temp/exports/user_2/2024-01-12/executive/2024-01-12_09-20-15_user_2_executive_Executive_Summary_PDF.pdf', '2024-01-12_09-20-15_user_2_executive_Executive_Summary_PDF.pdf', 1536000, '{"user_id": 2, "export_type": "executive", "format": "pdf"}', 'completed', NOW() - INTERVAL '8 days'),
('sample-export-5', 2, 'operational', 'excel', 'Operational Report Template', '{"dateRange": {"type": "last_7_days"}, "payment_methods": {"selected_methods": [1, 2, 3]}}', '/temp/exports/user_2/2024-01-13/operational/2024-01-13_11-30-45_user_2_operational_Operational_Report_3_methods_EXCEL.xlsx', '2024-01-13_11-30-45_user_2_operational_Operational_Report_3_methods_EXCEL.xlsx', 3072000, '{"user_id": 2, "export_type": "operational", "format": "excel"}', 'completed', NOW() - INTERVAL '7 days');

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON export_history TO your_app_user;
-- GRANT USAGE ON SEQUENCE export_history_id_seq TO your_app_user;
