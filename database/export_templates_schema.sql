-- Export Templates Database Schema

-- Table for storing export template configurations
CREATE TABLE IF NOT EXISTS export_templates (
    id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('revenue_analysis', 'commission_analysis', 'comprehensive', 'custom', 'executive', 'operational')),
    content JSONB DEFAULT '{}',
    supported_formats JSONB DEFAULT '["pdf", "excel", "csv", "json"]',
    sections JSONB DEFAULT '[]',
    charts JSONB DEFAULT '[]',
    formatting JSONB DEFAULT '{}',
    layout JSONB DEFAULT '{}',
    is_default BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_export_templates_user_id ON export_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_export_templates_type ON export_templates(type);
CREATE INDEX IF NOT EXISTS idx_export_templates_status ON export_templates(status);
CREATE INDEX IF NOT EXISTS idx_export_templates_is_default ON export_templates(is_default);
CREATE INDEX IF NOT EXISTS idx_export_templates_created_at ON export_templates(created_at);

-- Composite index for user templates
CREATE INDEX IF NOT EXISTS idx_export_templates_user_status ON export_templates(user_id, status);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_export_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_export_templates_updated_at
    BEFORE UPDATE ON export_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_export_templates_updated_at();

-- Function to get user template count
CREATE OR REPLACE FUNCTION get_user_template_count(user_id_param INTEGER)
RETURNS INTEGER AS $$
DECLARE
    template_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO template_count
    FROM export_templates
    WHERE user_id = user_id_param AND status = 'active';
    
    RETURN template_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get templates by type
CREATE OR REPLACE FUNCTION get_templates_by_type(user_id_param INTEGER, template_type VARCHAR(50))
RETURNS TABLE (
    id VARCHAR(255),
    name VARCHAR(255),
    description TEXT,
    type VARCHAR(50),
    is_default BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        et.id,
        et.name,
        et.description,
        et.type,
        et.is_default,
        et.created_at
    FROM export_templates et
    WHERE (et.user_id = user_id_param OR et.is_default = true)
      AND et.status = 'active'
      AND et.type = template_type
    ORDER BY et.is_default DESC, et.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to search templates
CREATE OR REPLACE FUNCTION search_templates(user_id_param INTEGER, search_term VARCHAR(255))
RETURNS TABLE (
    id VARCHAR(255),
    name VARCHAR(255),
    description TEXT,
    type VARCHAR(50),
    is_default BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        et.id,
        et.name,
        et.description,
        et.type,
        et.is_default,
        et.created_at
    FROM export_templates et
    WHERE (et.user_id = user_id_param OR et.is_default = true)
      AND et.status = 'active'
      AND (
          et.name ILIKE '%' || search_term || '%'
          OR et.description ILIKE '%' || search_term || '%'
      )
    ORDER BY et.is_default DESC, et.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get template statistics
CREATE OR REPLACE FUNCTION get_template_statistics(user_id_param INTEGER)
RETURNS TABLE (
    total_templates INTEGER,
    custom_templates INTEGER,
    default_templates INTEGER,
    templates_by_type JSONB
) AS $$
DECLARE
    total_count INTEGER;
    custom_count INTEGER;
    default_count INTEGER;
    type_stats JSONB;
BEGIN
    -- Get total templates
    SELECT COUNT(*) INTO total_count
    FROM export_templates
    WHERE (user_id = user_id_param OR is_default = true) AND status = 'active';
    
    -- Get custom templates
    SELECT COUNT(*) INTO custom_count
    FROM export_templates
    WHERE user_id = user_id_param AND status = 'active';
    
    -- Get default templates
    SELECT COUNT(*) INTO default_count
    FROM export_templates
    WHERE is_default = true AND status = 'active';
    
    -- Get templates by type
    SELECT jsonb_object_agg(type, count) INTO type_stats
    FROM (
        SELECT type, COUNT(*) as count
        FROM export_templates
        WHERE (user_id = user_id_param OR is_default = true) AND status = 'active'
        GROUP BY type
    ) type_counts;
    
    RETURN QUERY SELECT total_count, custom_count, default_count, type_stats;
END;
$$ LANGUAGE plpgsql;

-- Insert default templates
INSERT INTO export_templates (id, user_id, name, description, type, content, supported_formats, sections, charts, formatting, layout, is_default, status) VALUES
(
    'default_revenue_analysis',
    1,
    'Revenue Analysis',
    'Standard revenue analysis report with KPIs and breakdowns',
    'revenue_analysis',
    '{"sections": ["kpis", "revenue_breakdown", "company_performance", "payment_methods", "trends"], "charts": ["pie_chart", "bar_chart", "line_chart"]}',
    '["pdf", "excel", "csv", "json"]',
    '["kpis", "revenue_breakdown", "company_performance", "payment_methods", "trends"]',
    '["pie_chart", "bar_chart", "line_chart"]',
    '{"headerStyle": {"fontSize": 16, "bold": true, "color": "#2E86AB"}, "subheaderStyle": {"fontSize": 14, "bold": true, "color": "#A23B72"}, "bodyStyle": {"fontSize": 12, "color": "#333333"}, "highlightStyle": {"fontSize": 12, "bold": true, "color": "#F18F01"}}',
    '{"pageOrientation": "portrait", "margins": {"top": 20, "right": 20, "bottom": 20, "left": 20}, "spacing": {"section": 15, "paragraph": 8, "line": 4}}',
    true,
    'active'
),
(
    'default_commission_analysis',
    1,
    'Commission Analysis',
    'Detailed commission analysis with financial waterfall',
    'commission_analysis',
    '{"sections": ["kpis", "financial_waterfall", "employee_commissions", "referral_commissions", "trends"], "charts": ["waterfall_chart", "pie_chart", "line_chart"]}',
    '["pdf", "excel", "csv", "json"]',
    '["kpis", "financial_waterfall", "employee_commissions", "referral_commissions", "trends"]',
    '["waterfall_chart", "pie_chart", "line_chart"]',
    '{"headerStyle": {"fontSize": 16, "bold": true, "color": "#2E86AB"}, "subheaderStyle": {"fontSize": 14, "bold": true, "color": "#A23B72"}, "bodyStyle": {"fontSize": 12, "color": "#333333"}, "highlightStyle": {"fontSize": 12, "bold": true, "color": "#F18F01"}}',
    '{"pageOrientation": "portrait", "margins": {"top": 20, "right": 20, "bottom": 20, "left": 20}, "spacing": {"section": 15, "paragraph": 8, "line": 4}}',
    true,
    'active'
),
(
    'default_comprehensive',
    1,
    'Comprehensive Dashboard',
    'Complete dashboard report with all sections and charts',
    'comprehensive',
    '{"sections": ["kpis", "revenue_breakdown", "financial_waterfall", "company_performance", "commissions", "trends"], "charts": ["all"]}',
    '["pdf", "excel", "csv", "json"]',
    '["kpis", "revenue_breakdown", "financial_waterfall", "company_performance", "commissions", "trends"]',
    '["all"]',
    '{"headerStyle": {"fontSize": 16, "bold": true, "color": "#2E86AB"}, "subheaderStyle": {"fontSize": 14, "bold": true, "color": "#A23B72"}, "bodyStyle": {"fontSize": 12, "color": "#333333"}, "highlightStyle": {"fontSize": 12, "bold": true, "color": "#F18F01"}}',
    '{"pageOrientation": "landscape", "margins": {"top": 15, "right": 15, "bottom": 15, "left": 15}, "spacing": {"section": 12, "paragraph": 6, "line": 3}}',
    true,
    'active'
)
ON CONFLICT (id) DO NOTHING;

-- Create view for active templates
CREATE OR REPLACE VIEW active_export_templates AS
SELECT 
    id,
    user_id,
    name,
    description,
    type,
    content,
    supported_formats,
    sections,
    charts,
    formatting,
    layout,
    is_default,
    created_at,
    updated_at
FROM export_templates
WHERE status = 'active'
ORDER BY is_default DESC, created_at DESC;

-- Create view for template usage statistics
CREATE OR REPLACE VIEW template_usage_stats AS
SELECT 
    et.id,
    et.name,
    et.type,
    et.is_default,
    COUNT(seh.template_id) as usage_count,
    MAX(seh.created_at) as last_used
FROM export_templates et
LEFT JOIN scheduled_export_history seh ON et.id = seh.template_id
WHERE et.status = 'active'
GROUP BY et.id, et.name, et.type, et.is_default
ORDER BY usage_count DESC, last_used DESC;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON export_templates TO dashboard_user;
GRANT SELECT ON active_export_templates TO dashboard_user;
GRANT SELECT ON template_usage_stats TO dashboard_user;
GRANT EXECUTE ON FUNCTION get_user_template_count(INTEGER) TO dashboard_user;
GRANT EXECUTE ON FUNCTION get_templates_by_type(INTEGER, VARCHAR) TO dashboard_user;
GRANT EXECUTE ON FUNCTION search_templates(INTEGER, VARCHAR) TO dashboard_user;
GRANT EXECUTE ON FUNCTION get_template_statistics(INTEGER) TO dashboard_user;
