-- Scheduled Reports Database Schema

-- Table for storing scheduled report configurations
CREATE TABLE IF NOT EXISTS scheduled_reports (
    id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    cron_expression VARCHAR(255) NOT NULL,
    format VARCHAR(20) NOT NULL CHECK (format IN ('pdf', 'excel', 'csv', 'json')),
    template VARCHAR(100),
    filters JSONB DEFAULT '{}',
    recipients JSONB DEFAULT '[]',
    next_run TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing scheduled report execution history
CREATE TABLE IF NOT EXISTS scheduled_report_executions (
    id SERIAL PRIMARY KEY,
    schedule_id VARCHAR(255) NOT NULL REFERENCES scheduled_reports(id) ON DELETE CASCADE,
    execution_time TIMESTAMP WITH TIME ZONE NOT NULL,
    export_id VARCHAR(255),
    file_name VARCHAR(255),
    file_size BIGINT,
    record_count INTEGER,
    status VARCHAR(20) NOT NULL CHECK (status IN ('completed', 'failed', 'running')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_user_id ON scheduled_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_status ON scheduled_reports(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON scheduled_reports(next_run);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_frequency ON scheduled_reports(frequency);

CREATE INDEX IF NOT EXISTS idx_scheduled_report_executions_schedule_id ON scheduled_report_executions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_report_executions_status ON scheduled_report_executions(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_report_executions_created_at ON scheduled_report_executions(created_at);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at column
CREATE TRIGGER update_scheduled_reports_updated_at 
    BEFORE UPDATE ON scheduled_reports 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to get scheduled reports statistics
CREATE OR REPLACE FUNCTION get_scheduled_reports_stats(user_id_param INTEGER)
RETURNS TABLE (
    total_schedules INTEGER,
    active_schedules INTEGER,
    paused_schedules INTEGER,
    total_executions INTEGER,
    successful_executions INTEGER,
    failed_executions INTEGER,
    last_execution_time TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(sr.id)::INTEGER as total_schedules,
        COUNT(CASE WHEN sr.status = 'active' THEN 1 END)::INTEGER as active_schedules,
        COUNT(CASE WHEN sr.status = 'paused' THEN 1 END)::INTEGER as paused_schedules,
        COUNT(sre.id)::INTEGER as total_executions,
        COUNT(CASE WHEN sre.status = 'completed' THEN 1 END)::INTEGER as successful_executions,
        COUNT(CASE WHEN sre.status = 'failed' THEN 1 END)::INTEGER as failed_executions,
        MAX(sre.created_at) as last_execution_time
    FROM scheduled_reports sr
    LEFT JOIN scheduled_report_executions sre ON sr.id = sre.schedule_id
    WHERE sr.user_id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to get execution history with pagination
CREATE OR REPLACE FUNCTION get_execution_history(
    schedule_id_param VARCHAR(255),
    limit_param INTEGER DEFAULT 10,
    offset_param INTEGER DEFAULT 0
)
RETURNS TABLE (
    id INTEGER,
    execution_time TIMESTAMP WITH TIME ZONE,
    export_id VARCHAR(255),
    file_name VARCHAR(255),
    file_size BIGINT,
    record_count INTEGER,
    status VARCHAR(20),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sre.id,
        sre.execution_time,
        sre.export_id,
        sre.file_name,
        sre.file_size,
        sre.record_count,
        sre.status,
        sre.error_message,
        sre.created_at
    FROM scheduled_report_executions sre
    WHERE sre.schedule_id = schedule_id_param
    ORDER BY sre.created_at DESC
    LIMIT limit_param
    OFFSET offset_param;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old executions (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_executions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM scheduled_report_executions 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get schedules due for execution
CREATE OR REPLACE FUNCTION get_schedules_due_for_execution()
RETURNS TABLE (
    id VARCHAR(255),
    user_id INTEGER,
    name VARCHAR(255),
    frequency VARCHAR(50),
    cron_expression VARCHAR(255),
    format VARCHAR(20),
    template VARCHAR(100),
    filters JSONB,
    recipients JSONB,
    next_run TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sr.id,
        sr.user_id,
        sr.name,
        sr.frequency,
        sr.cron_expression,
        sr.format,
        sr.template,
        sr.filters,
        sr.recipients,
        sr.next_run
    FROM scheduled_reports sr
    WHERE sr.status = 'active' 
    AND sr.next_run <= CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to update next run time for a schedule
CREATE OR REPLACE FUNCTION update_schedule_next_run(
    schedule_id_param VARCHAR(255),
    next_run_param TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE scheduled_reports 
    SET next_run = next_run_param,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = schedule_id_param;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's schedule count
CREATE OR REPLACE FUNCTION get_user_schedule_count(user_id_param INTEGER, status_param VARCHAR(20) DEFAULT 'active')
RETURNS INTEGER AS $$
DECLARE
    count_result INTEGER;
BEGIN
    SELECT COUNT(*) INTO count_result
    FROM scheduled_reports
    WHERE user_id = user_id_param 
    AND status = status_param;
    
    RETURN count_result;
END;
$$ LANGUAGE plpgsql;

-- Function to get schedule execution summary
CREATE OR REPLACE FUNCTION get_schedule_execution_summary(schedule_id_param VARCHAR(255))
RETURNS TABLE (
    total_executions INTEGER,
    successful_executions INTEGER,
    failed_executions INTEGER,
    success_rate DECIMAL(5,2),
    avg_file_size BIGINT,
    total_records_processed BIGINT,
    last_execution_time TIMESTAMP WITH TIME ZONE,
    last_execution_status VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_executions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::INTEGER as successful_executions,
        COUNT(CASE WHEN status = 'failed' THEN 1 END)::INTEGER as failed_executions,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                (COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL * 100)
            ELSE 0 
        END as success_rate,
        AVG(file_size)::BIGINT as avg_file_size,
        SUM(record_count)::BIGINT as total_records_processed,
        MAX(created_at) as last_execution_time,
        (SELECT status FROM scheduled_report_executions 
         WHERE schedule_id = schedule_id_param 
         ORDER BY created_at DESC LIMIT 1) as last_execution_status
    FROM scheduled_report_executions
    WHERE schedule_id = schedule_id_param;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE scheduled_reports IS 'Stores scheduled report configurations for automated report generation';
COMMENT ON TABLE scheduled_report_executions IS 'Stores execution history for scheduled reports';
COMMENT ON FUNCTION get_scheduled_reports_stats(INTEGER) IS 'Returns statistics for a user''s scheduled reports';
COMMENT ON FUNCTION get_execution_history(VARCHAR(255), INTEGER, INTEGER) IS 'Returns paginated execution history for a schedule';
COMMENT ON FUNCTION cleanup_old_executions() IS 'Removes execution records older than 90 days';
COMMENT ON FUNCTION get_schedules_due_for_execution() IS 'Returns schedules that are due for execution';
COMMENT ON FUNCTION update_schedule_next_run(VARCHAR(255), TIMESTAMP WITH TIME ZONE) IS 'Updates the next run time for a schedule';
COMMENT ON FUNCTION get_user_schedule_count(INTEGER, VARCHAR(20)) IS 'Returns the count of schedules for a user';
COMMENT ON FUNCTION get_schedule_execution_summary(VARCHAR(255)) IS 'Returns execution summary statistics for a schedule';
