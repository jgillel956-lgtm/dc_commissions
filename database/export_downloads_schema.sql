-- Export Downloads Database Schema

-- Table for storing export download records
CREATE TABLE IF NOT EXISTS export_downloads (
    id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    export_id VARCHAR(255) NOT NULL REFERENCES export_history(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT DEFAULT 0,
    download_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    downloaded_at TIMESTAMP WITH TIME ZONE,
    download_count INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'downloaded', 'expired', 'failed')),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_export_downloads_user_id ON export_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_export_downloads_export_id ON export_downloads(export_id);
CREATE INDEX IF NOT EXISTS idx_export_downloads_download_token ON export_downloads(download_token);
CREATE INDEX IF NOT EXISTS idx_export_downloads_status ON export_downloads(status);
CREATE INDEX IF NOT EXISTS idx_export_downloads_expires_at ON export_downloads(expires_at);
CREATE INDEX IF NOT EXISTS idx_export_downloads_created_at ON export_downloads(created_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_export_downloads_user_status ON export_downloads(user_id, status);
CREATE INDEX IF NOT EXISTS idx_export_downloads_token_expires ON export_downloads(download_token, expires_at);
CREATE INDEX IF NOT EXISTS idx_export_downloads_user_created ON export_downloads(user_id, created_at DESC);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_export_downloads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_export_downloads_updated_at
    BEFORE UPDATE ON export_downloads
    FOR EACH ROW
    EXECUTE FUNCTION update_export_downloads_updated_at();

-- Function to get user download count
CREATE OR REPLACE FUNCTION get_user_download_count(user_id_param INTEGER)
RETURNS INTEGER AS $$
DECLARE
    download_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO download_count
    FROM export_downloads
    WHERE user_id = user_id_param AND status != 'expired';
    
    RETURN download_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get download statistics
CREATE OR REPLACE FUNCTION get_download_statistics(user_id_param INTEGER)
RETURNS TABLE (
    total_downloads BIGINT,
    completed_downloads BIGINT,
    expired_downloads BIGINT,
    total_downloaded_size BIGINT,
    downloads_last_7_days BIGINT,
    downloads_last_30_days BIGINT,
    avg_file_size BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_downloads,
        COUNT(CASE WHEN downloaded_at IS NOT NULL THEN 1 END) as completed_downloads,
        COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_downloads,
        COALESCE(SUM(file_size), 0) as total_downloaded_size,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as downloads_last_7_days,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as downloads_last_30_days,
        COALESCE(AVG(file_size), 0) as avg_file_size
    FROM export_downloads
    WHERE user_id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to get downloads by date range
CREATE OR REPLACE FUNCTION get_downloads_by_date_range(
    user_id_param INTEGER,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    id VARCHAR(255),
    export_id VARCHAR(255),
    file_name VARCHAR(255),
    file_size BIGINT,
    status VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE,
    downloaded_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ed.id,
        ed.export_id,
        ed.file_name,
        ed.file_size,
        ed.status,
        ed.created_at,
        ed.downloaded_at
    FROM export_downloads ed
    WHERE ed.user_id = user_id_param
      AND ed.created_at >= start_date
      AND ed.created_at <= end_date
    ORDER BY ed.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired downloads
CREATE OR REPLACE FUNCTION cleanup_expired_downloads()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE export_downloads
    SET status = 'expired'
    WHERE expires_at < NOW() AND status = 'pending';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get active downloads for user
CREATE OR REPLACE FUNCTION get_active_downloads(user_id_param INTEGER)
RETURNS TABLE (
    id VARCHAR(255),
    export_id VARCHAR(255),
    file_name VARCHAR(255),
    file_size BIGINT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ed.id,
        ed.export_id,
        ed.file_name,
        ed.file_size,
        ed.expires_at,
        ed.created_at
    FROM export_downloads ed
    WHERE ed.user_id = user_id_param
      AND ed.status = 'pending'
      AND ed.expires_at > NOW()
    ORDER BY ed.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to validate download token
CREATE OR REPLACE FUNCTION validate_download_token(token_param VARCHAR(255))
RETURNS TABLE (
    is_valid BOOLEAN,
    download_id VARCHAR(255),
    user_id INTEGER,
    file_path TEXT,
    file_name VARCHAR(255),
    file_size BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE WHEN ed.id IS NOT NULL AND ed.expires_at > NOW() THEN TRUE ELSE FALSE END as is_valid,
        ed.id as download_id,
        ed.user_id,
        ed.file_path,
        ed.file_name,
        ed.file_size
    FROM export_downloads ed
    WHERE ed.download_token = token_param;
END;
$$ LANGUAGE plpgsql;

-- Function to get download history with export details
CREATE OR REPLACE FUNCTION get_download_history_with_exports(
    user_id_param INTEGER,
    limit_param INTEGER DEFAULT 50,
    offset_param INTEGER DEFAULT 0
)
RETURNS TABLE (
    download_id VARCHAR(255),
    export_id VARCHAR(255),
    file_name VARCHAR(255),
    file_size BIGINT,
    export_type VARCHAR(50),
    format VARCHAR(20),
    template_name VARCHAR(255),
    status VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE,
    downloaded_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ed.id as download_id,
        ed.export_id,
        ed.file_name,
        ed.file_size,
        eh.export_type,
        eh.format,
        eh.template_name,
        ed.status,
        ed.created_at,
        ed.downloaded_at
    FROM export_downloads ed
    LEFT JOIN export_history eh ON ed.export_id = eh.id
    WHERE ed.user_id = user_id_param
    ORDER BY ed.created_at DESC
    LIMIT limit_param OFFSET offset_param;
END;
$$ LANGUAGE plpgsql;

-- Views for common queries
CREATE OR REPLACE VIEW user_download_summary AS
SELECT 
    user_id,
    COUNT(*) as total_downloads,
    COUNT(CASE WHEN status = 'downloaded' THEN 1 END) as completed_downloads,
    COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_downloads,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_downloads,
    COALESCE(SUM(file_size), 0) as total_size,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as downloads_last_7_days,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as downloads_last_30_days,
    MAX(created_at) as last_download_date
FROM export_downloads
GROUP BY user_id;

CREATE OR REPLACE VIEW download_format_statistics AS
SELECT 
    eh.format,
    COUNT(*) as total_downloads,
    COUNT(CASE WHEN ed.status = 'downloaded' THEN 1 END) as completed_downloads,
    COUNT(CASE WHEN ed.status = 'expired' THEN 1 END) as expired_downloads,
    COALESCE(AVG(ed.file_size), 0) as avg_file_size,
    COALESCE(SUM(ed.file_size), 0) as total_size
FROM export_downloads ed
LEFT JOIN export_history eh ON ed.export_id = eh.id
GROUP BY eh.format
ORDER BY total_downloads DESC;

CREATE OR REPLACE VIEW download_type_statistics AS
SELECT 
    eh.export_type,
    COUNT(*) as total_downloads,
    COUNT(CASE WHEN ed.status = 'downloaded' THEN 1 END) as completed_downloads,
    COUNT(CASE WHEN ed.status = 'expired' THEN 1 END) as expired_downloads,
    COALESCE(AVG(ed.file_size), 0) as avg_file_size,
    COALESCE(SUM(ed.file_size), 0) as total_size
FROM export_downloads ed
LEFT JOIN export_history eh ON ed.export_id = eh.id
GROUP BY eh.export_type
ORDER BY total_downloads DESC;

-- Insert sample data for testing
INSERT INTO export_downloads (id, user_id, export_id, file_path, file_name, file_size, download_token, expires_at, status, created_at) VALUES
('download-1', 1, 'sample-export-1', '/temp/exports/user_1/2024-01-15/revenue_analysis/2024-01-15_14-30-00_user_1_revenue_analysis_Revenue_Analysis_PDF.pdf', '2024-01-15_14-30-00_user_1_revenue_analysis_Revenue_Analysis_PDF.pdf', 1024000, 'token123456789abcdef', NOW() + INTERVAL '24 hours', 'pending', NOW() - INTERVAL '2 hours'),
('download-2', 1, 'sample-export-2', '/temp/exports/user_1/2024-01-14/commission_analysis/2024-01-14_10-15-30_user_1_commission_analysis_Commission_Analysis_2_companies_EXCEL.xlsx', '2024-01-14_10-15-30_user_1_commission_analysis_Commission_Analysis_2_companies_EXCEL.xlsx', 2048000, 'tokenabcdef123456789', NOW() + INTERVAL '12 hours', 'downloaded', NOW() - INTERVAL '1 hour'),
('download-3', 1, 'sample-export-3', '/temp/exports/user_1/2024-01-10/comprehensive/2024-01-10_16-45-20_user_1_comprehensive_Comprehensive_Report_CSV.csv', '2024-01-10_16-45-20_user_1_comprehensive_Comprehensive_Report_CSV.csv', 512000, 'tokenexpired123456789', NOW() - INTERVAL '1 hour', 'expired', NOW() - INTERVAL '25 hours'),
('download-4', 2, 'sample-export-4', '/temp/exports/user_2/2024-01-12/executive/2024-01-12_09-20-15_user_2_executive_Executive_Summary_PDF.pdf', '2024-01-12_09-20-15_user_2_executive_Executive_Summary_PDF.pdf', 1536000, 'tokenuser2download123', NOW() + INTERVAL '6 hours', 'pending', NOW() - INTERVAL '30 minutes'),
('download-5', 2, 'sample-export-5', '/temp/exports/user_2/2024-01-13/operational/2024-01-13_11-30-45_user_2_operational_Operational_Report_3_methods_EXCEL.xlsx', '2024-01-13_11-30-45_user_2_operational_Operational_Report_3_methods_EXCEL.xlsx', 3072000, 'tokenuser2download456', NOW() + INTERVAL '18 hours', 'downloaded', NOW() - INTERVAL '2 hours');

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON export_downloads TO your_app_user;
-- GRANT USAGE ON SEQUENCE export_downloads_id_seq TO your_app_user;
