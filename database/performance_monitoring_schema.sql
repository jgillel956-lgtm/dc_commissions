-- Performance Monitoring Database Schema

-- Table for storing performance metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
    id VARCHAR(255) PRIMARY KEY,
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('query', 'cache', 'response', 'system', 'error')),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(20),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    request_id VARCHAR(255),
    endpoint VARCHAR(255),
    method VARCHAR(10),
    status_code INTEGER,
    execution_time INTEGER, -- milliseconds
    memory_usage BIGINT,
    cpu_usage DECIMAL(5,2),
    additional_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing query performance logs
CREATE TABLE IF NOT EXISTS query_performance_logs (
    id VARCHAR(255) PRIMARY KEY,
    query_id VARCHAR(255) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    sql_query TEXT NOT NULL,
    sql_params JSONB DEFAULT '[]',
    execution_time INTEGER NOT NULL, -- milliseconds
    row_count INTEGER DEFAULT 0,
    result_size BIGINT DEFAULT 0,
    cache_hit BOOLEAN DEFAULT FALSE,
    cache_key VARCHAR(255),
    error_message TEXT,
    stack_trace TEXT,
    query_plan JSONB,
    index_used VARCHAR(255)[],
    table_scanned VARCHAR(255)[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing cache performance data
CREATE TABLE IF NOT EXISTS cache_performance (
    id VARCHAR(255) PRIMARY KEY,
    cache_key VARCHAR(255) NOT NULL,
    cache_type VARCHAR(50) NOT NULL CHECK (cache_type IN ('response', 'query', 'session', 'user')),
    hit_count INTEGER DEFAULT 0,
    miss_count INTEGER DEFAULT 0,
    hit_rate DECIMAL(5,4) DEFAULT 0,
    avg_response_time INTEGER DEFAULT 0, -- milliseconds
    cache_size BIGINT DEFAULT 0,
    ttl_seconds INTEGER DEFAULT 300,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing slow query alerts
CREATE TABLE IF NOT EXISTS slow_query_alerts (
    id VARCHAR(255) PRIMARY KEY,
    query_id VARCHAR(255) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    execution_time INTEGER NOT NULL, -- milliseconds
    threshold_time INTEGER NOT NULL, -- milliseconds
    sql_query TEXT NOT NULL,
    sql_params JSONB DEFAULT '[]',
    row_count INTEGER DEFAULT 0,
    query_plan JSONB,
    alert_level VARCHAR(20) NOT NULL CHECK (alert_level IN ('warning', 'critical', 'error')),
    alert_message TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by INTEGER REFERENCES users(id),
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing system resource monitoring
CREATE TABLE IF NOT EXISTS system_resources (
    id VARCHAR(255) PRIMARY KEY,
    server_id VARCHAR(255) NOT NULL,
    cpu_usage DECIMAL(5,2) NOT NULL,
    memory_usage BIGINT NOT NULL,
    memory_total BIGINT NOT NULL,
    memory_available BIGINT NOT NULL,
    disk_usage BIGINT NOT NULL,
    disk_total BIGINT NOT NULL,
    disk_available BIGINT NOT NULL,
    network_in BIGINT DEFAULT 0,
    network_out BIGINT DEFAULT 0,
    active_connections INTEGER DEFAULT 0,
    max_connections INTEGER DEFAULT 0,
    uptime_seconds BIGINT NOT NULL,
    load_average DECIMAL(8,4)[],
    additional_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing API endpoint performance
CREATE TABLE IF NOT EXISTS api_endpoint_performance (
    id VARCHAR(255) PRIMARY KEY,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    request_id VARCHAR(255) NOT NULL,
    response_time INTEGER NOT NULL, -- milliseconds
    status_code INTEGER NOT NULL,
    response_size BIGINT DEFAULT 0,
    request_size BIGINT DEFAULT 0,
    cache_hit BOOLEAN DEFAULT FALSE,
    database_queries INTEGER DEFAULT 0,
    total_query_time INTEGER DEFAULT 0, -- milliseconds
    memory_peak BIGINT DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user ON performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created ON performance_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(metric_name);

CREATE INDEX IF NOT EXISTS idx_query_performance_user ON query_performance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_query_performance_time ON query_performance_logs(execution_time DESC);
CREATE INDEX IF NOT EXISTS idx_query_performance_created ON query_performance_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_performance_cache ON query_performance_logs(cache_hit);

CREATE INDEX IF NOT EXISTS idx_cache_performance_type ON cache_performance(cache_type);
CREATE INDEX IF NOT EXISTS idx_cache_performance_key ON cache_performance(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_performance_hit_rate ON cache_performance(hit_rate DESC);
CREATE INDEX IF NOT EXISTS idx_cache_performance_accessed ON cache_performance(last_accessed DESC);

CREATE INDEX IF NOT EXISTS idx_slow_query_user ON slow_query_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_slow_query_level ON slow_query_alerts(alert_level);
CREATE INDEX IF NOT EXISTS idx_slow_query_resolved ON slow_query_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_slow_query_created ON slow_query_alerts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_resources_server ON system_resources(server_id);
CREATE INDEX IF NOT EXISTS idx_system_resources_created ON system_resources(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_resources_cpu ON system_resources(cpu_usage DESC);

CREATE INDEX IF NOT EXISTS idx_api_endpoint_performance_endpoint ON api_endpoint_performance(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_endpoint_performance_user ON api_endpoint_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_api_endpoint_performance_time ON api_endpoint_performance(response_time DESC);
CREATE INDEX IF NOT EXISTS idx_api_endpoint_performance_created ON api_endpoint_performance(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type_created ON performance_metrics(metric_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_performance_user_time ON query_performance_logs(user_id, execution_time DESC);
CREATE INDEX IF NOT EXISTS idx_cache_performance_type_hit_rate ON cache_performance(cache_type, hit_rate DESC);
CREATE INDEX IF NOT EXISTS idx_slow_query_level_created ON slow_query_alerts(alert_level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_endpoint_performance_endpoint_time ON api_endpoint_performance(endpoint, response_time DESC);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_cache_performance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_cache_performance_updated_at
    BEFORE UPDATE ON cache_performance
    FOR EACH ROW
    EXECUTE FUNCTION update_cache_performance_updated_at();

-- Function to calculate cache hit rate
CREATE OR REPLACE FUNCTION calculate_cache_hit_rate(cache_type_param VARCHAR(50))
RETURNS DECIMAL(5,4) AS $$
DECLARE
    total_hits INTEGER;
    total_misses INTEGER;
    hit_rate DECIMAL(5,4);
BEGIN
    SELECT 
        COALESCE(SUM(hit_count), 0),
        COALESCE(SUM(miss_count), 0)
    INTO total_hits, total_misses
    FROM cache_performance
    WHERE cache_type = cache_type_param;
    
    IF total_hits + total_misses = 0 THEN
        RETURN 0;
    END IF;
    
    hit_rate := total_hits::DECIMAL / (total_hits + total_misses);
    RETURN hit_rate;
END;
$$ LANGUAGE plpgsql;

-- Function to get slow queries
CREATE OR REPLACE FUNCTION get_slow_queries(
    threshold_time_param INTEGER DEFAULT 5000,
    limit_param INTEGER DEFAULT 100
)
RETURNS TABLE (
    query_id VARCHAR(255),
    execution_time INTEGER,
    sql_query TEXT,
    user_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        qpl.query_id,
        qpl.execution_time,
        qpl.sql_query,
        qpl.user_id,
        qpl.created_at
    FROM query_performance_logs qpl
    WHERE qpl.execution_time > threshold_time_param
    ORDER BY qpl.execution_time DESC
    LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Function to get performance metrics summary
CREATE OR REPLACE FUNCTION get_performance_metrics_summary(
    metric_type_param VARCHAR(50),
    hours_back INTEGER DEFAULT 24
)
RETURNS TABLE (
    metric_name VARCHAR(100),
    avg_value DECIMAL(15,4),
    min_value DECIMAL(15,4),
    max_value DECIMAL(15,4),
    count_records BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.metric_name,
        AVG(pm.metric_value) as avg_value,
        MIN(pm.metric_value) as min_value,
        MAX(pm.metric_value) as max_value,
        COUNT(*) as count_records
    FROM performance_metrics pm
    WHERE pm.metric_type = metric_type_param
      AND pm.created_at >= NOW() - INTERVAL '1 hour' * hours_back
    GROUP BY pm.metric_name
    ORDER BY avg_value DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get API endpoint performance summary
CREATE OR REPLACE FUNCTION get_api_endpoint_performance_summary(
    hours_back INTEGER DEFAULT 24
)
RETURNS TABLE (
    endpoint VARCHAR(255),
    method VARCHAR(10),
    avg_response_time INTEGER,
    total_requests BIGINT,
    error_count BIGINT,
    cache_hit_rate DECIMAL(5,4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        aep.endpoint,
        aep.method,
        AVG(aep.response_time)::INTEGER as avg_response_time,
        COUNT(*) as total_requests,
        SUM(aep.error_count) as error_count,
        AVG(CASE WHEN aep.cache_hit THEN 1.0 ELSE 0.0 END) as cache_hit_rate
    FROM api_endpoint_performance aep
    WHERE aep.created_at >= NOW() - INTERVAL '1 hour' * hours_back
    GROUP BY aep.endpoint, aep.method
    ORDER BY avg_response_time DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old performance data
CREATE OR REPLACE FUNCTION cleanup_old_performance_data(
    days_to_keep INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete old performance metrics
    DELETE FROM performance_metrics 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete old query performance logs
    DELETE FROM query_performance_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    -- Delete old cache performance data
    DELETE FROM cache_performance 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    -- Delete old system resources data
    DELETE FROM system_resources 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    -- Delete old API endpoint performance data
    DELETE FROM api_endpoint_performance 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get system health status
CREATE OR REPLACE FUNCTION get_system_health_status()
RETURNS TABLE (
    metric_name VARCHAR(100),
    current_value DECIMAL(15,4),
    threshold_value DECIMAL(15,4),
    status VARCHAR(20),
    last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'cpu_usage' as metric_name,
        sr.cpu_usage as current_value,
        80.0 as threshold_value,
        CASE WHEN sr.cpu_usage > 80 THEN 'critical' 
             WHEN sr.cpu_usage > 60 THEN 'warning' 
             ELSE 'healthy' END as status,
        sr.created_at as last_updated
    FROM system_resources sr
    WHERE sr.created_at = (SELECT MAX(created_at) FROM system_resources)
    
    UNION ALL
    
    SELECT 
        'memory_usage_percent' as metric_name,
        (sr.memory_usage::DECIMAL / sr.memory_total * 100) as current_value,
        85.0 as threshold_value,
        CASE WHEN (sr.memory_usage::DECIMAL / sr.memory_total * 100) > 85 THEN 'critical'
             WHEN (sr.memory_usage::DECIMAL / sr.memory_total * 100) > 70 THEN 'warning'
             ELSE 'healthy' END as status,
        sr.created_at as last_updated
    FROM system_resources sr
    WHERE sr.created_at = (SELECT MAX(created_at) FROM system_resources)
    
    UNION ALL
    
    SELECT 
        'disk_usage_percent' as metric_name,
        (sr.disk_usage::DECIMAL / sr.disk_total * 100) as current_value,
        90.0 as threshold_value,
        CASE WHEN (sr.disk_usage::DECIMAL / sr.disk_total * 100) > 90 THEN 'critical'
             WHEN (sr.disk_usage::DECIMAL / sr.disk_total * 100) > 80 THEN 'warning'
             ELSE 'healthy' END as status,
        sr.created_at as last_updated
    FROM system_resources sr
    WHERE sr.created_at = (SELECT MAX(created_at) FROM system_resources);
END;
$$ LANGUAGE plpgsql;

-- Views for common queries
CREATE OR REPLACE VIEW performance_dashboard_summary AS
SELECT 
    'metrics' as data_type,
    COUNT(*) as total_records,
    MAX(created_at) as last_updated
FROM performance_metrics
WHERE created_at >= NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
    'queries' as data_type,
    COUNT(*) as total_records,
    MAX(created_at) as last_updated
FROM query_performance_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
    'cache' as data_type,
    COUNT(*) as total_records,
    MAX(created_at) as last_updated
FROM cache_performance
WHERE created_at >= NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
    'alerts' as data_type,
    COUNT(*) as total_records,
    MAX(created_at) as last_updated
FROM slow_query_alerts
WHERE created_at >= NOW() - INTERVAL '24 hours' AND resolved = FALSE;

CREATE OR REPLACE VIEW slow_queries_summary AS
SELECT 
    COUNT(*) as total_slow_queries,
    AVG(execution_time) as avg_execution_time,
    MAX(execution_time) as max_execution_time,
    COUNT(CASE WHEN execution_time > 10000 THEN 1 END) as critical_queries,
    COUNT(CASE WHEN execution_time BETWEEN 5000 AND 10000 THEN 1 END) as warning_queries
FROM query_performance_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
  AND execution_time > 5000;

CREATE OR REPLACE VIEW cache_performance_summary AS
SELECT 
    cache_type,
    COUNT(*) as total_entries,
    AVG(hit_rate) as avg_hit_rate,
    SUM(cache_size) as total_cache_size,
    COUNT(CASE WHEN hit_rate > 0.8 THEN 1 END) as high_performance_entries,
    COUNT(CASE WHEN hit_rate < 0.2 THEN 1 END) as low_performance_entries
FROM cache_performance
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY cache_type
ORDER BY avg_hit_rate DESC;

-- Insert sample data for testing
INSERT INTO performance_metrics (id, metric_type, metric_name, metric_value, metric_unit, user_id, endpoint, method, status_code, execution_time, created_at) VALUES
('metric-1', 'query', 'avg_execution_time', 125.5, 'ms', 1, '/api/dashboard', 'GET', 200, 125, NOW() - INTERVAL '2 hours'),
('metric-2', 'cache', 'hit_rate', 0.85, 'percent', 1, '/api/dashboard', 'GET', 200, 45, NOW() - INTERVAL '1 hour'),
('metric-3', 'response', 'avg_response_time', 180.2, 'ms', 1, '/api/export', 'POST', 200, 180, NOW() - INTERVAL '30 minutes'),
('metric-4', 'system', 'memory_usage', 2048576, 'bytes', 1, '/api/dashboard', 'GET', 200, 95, NOW() - INTERVAL '15 minutes'),
('metric-5', 'error', 'error_rate', 0.02, 'percent', 1, '/api/dashboard', 'GET', 500, 250, NOW() - INTERVAL '5 minutes');

INSERT INTO query_performance_logs (id, query_id, user_id, sql_query, sql_params, execution_time, row_count, cache_hit, created_at) VALUES
('qpl-1', 'query-1', 1, 'SELECT * FROM transactions WHERE user_id = $1', '[1]', 150, 25, FALSE, NOW() - INTERVAL '2 hours'),
('qpl-2', 'query-2', 1, 'SELECT SUM(amount) FROM transactions WHERE created_at >= $1', '["2024-01-01"]', 75, 1, TRUE, NOW() - INTERVAL '1 hour'),
('qpl-3', 'query-3', 1, 'SELECT * FROM companies WHERE id IN (SELECT DISTINCT company_id FROM transactions)', '[]', 8500, 150, FALSE, NOW() - INTERVAL '30 minutes'),
('qpl-4', 'query-4', 1, 'SELECT COUNT(*) FROM transactions WHERE status = $1', '["completed"]', 45, 1, TRUE, NOW() - INTERVAL '15 minutes'),
('qpl-5', 'query-5', 1, 'SELECT * FROM transactions ORDER BY created_at DESC LIMIT 1000', '[]', 12000, 1000, FALSE, NOW() - INTERVAL '5 minutes');

INSERT INTO cache_performance (id, cache_key, cache_type, hit_count, miss_count, hit_rate, avg_response_time, cache_size, ttl_seconds, created_at) VALUES
('cache-1', 'dashboard_data_user_1', 'response', 15, 3, 0.83, 45, 1024000, 300, NOW() - INTERVAL '2 hours'),
('cache-2', 'user_profile_1', 'user', 25, 1, 0.96, 12, 512000, 1800, NOW() - INTERVAL '1 hour'),
('cache-3', 'export_template_1', 'query', 8, 12, 0.40, 180, 2048000, 600, NOW() - INTERVAL '30 minutes'),
('cache-4', 'session_data_1', 'session', 50, 2, 0.96, 8, 256000, 3600, NOW() - INTERVAL '15 minutes'),
('cache-5', 'analytics_data_user_1', 'response', 5, 8, 0.38, 220, 3072000, 900, NOW() - INTERVAL '5 minutes');

INSERT INTO slow_query_alerts (id, query_id, user_id, execution_time, threshold_time, sql_query, alert_level, alert_message, created_at) VALUES
('alert-1', 'query-3', 1, 8500, 5000, 'SELECT * FROM companies WHERE id IN (SELECT DISTINCT company_id FROM transactions)', 'warning', 'Query execution time exceeded 5 second threshold', NOW() - INTERVAL '30 minutes'),
('alert-2', 'query-5', 1, 12000, 5000, 'SELECT * FROM transactions ORDER BY created_at DESC LIMIT 1000', 'critical', 'Query execution time exceeded 10 second threshold', NOW() - INTERVAL '5 minutes');

INSERT INTO system_resources (id, server_id, cpu_usage, memory_usage, memory_total, memory_available, disk_usage, disk_total, disk_available, active_connections, max_connections, uptime_seconds, load_average, created_at) VALUES
('sys-1', 'server-1', 45.2, 8589934592, 17179869184, 8589934592, 107374182400, 1073741824000, 966367641600, 25, 100, 86400, '{1.2, 1.1, 0.9}', NOW() - INTERVAL '2 hours'),
('sys-2', 'server-1', 52.8, 9126805504, 17179869184, 8053063680, 107374182400, 1073741824000, 966367641600, 28, 100, 86400, '{1.5, 1.3, 1.0}', NOW() - INTERVAL '1 hour'),
('sys-3', 'server-1', 68.5, 10307921510, 17179869184, 6871947674, 107374182400, 1073741824000, 966367641600, 35, 100, 86400, '{2.1, 1.8, 1.4}', NOW() - INTERVAL '30 minutes'),
('sys-4', 'server-1', 75.2, 11166914970, 17179869184, 6012954214, 107374182400, 1073741824000, 966367641600, 42, 100, 86400, '{2.8, 2.3, 1.8}', NOW() - INTERVAL '15 minutes'),
('sys-5', 'server-1', 82.1, 12025908430, 17179869184, 5153960754, 107374182400, 1073741824000, 966367641600, 48, 100, 86400, '{3.2, 2.7, 2.1}', NOW() - INTERVAL '5 minutes');

INSERT INTO api_endpoint_performance (id, endpoint, method, user_id, request_id, response_time, status_code, response_size, request_size, cache_hit, database_queries, total_query_time, memory_peak, created_at) VALUES
('api-1', '/api/dashboard', 'GET', 1, 'req-1', 180, 200, 51200, 1024, TRUE, 3, 125, 5242880, NOW() - INTERVAL '2 hours'),
('api-2', '/api/export', 'POST', 1, 'req-2', 2500, 200, 2048000, 2048, FALSE, 8, 1800, 10485760, NOW() - INTERVAL '1 hour'),
('api-3', '/api/analytics', 'GET', 1, 'req-3', 450, 200, 102400, 512, FALSE, 5, 380, 8388608, NOW() - INTERVAL '30 minutes'),
('api-4', '/api/reports', 'GET', 1, 'req-4', 120, 200, 25600, 1024, TRUE, 2, 85, 4194304, NOW() - INTERVAL '15 minutes'),
('api-5', '/api/dashboard', 'GET', 1, 'req-5', 95, 200, 51200, 1024, TRUE, 3, 75, 5242880, NOW() - INTERVAL '5 minutes');

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON performance_metrics TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON query_performance_logs TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON cache_performance TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON slow_query_alerts TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON system_resources TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON api_endpoint_performance TO your_app_user;
