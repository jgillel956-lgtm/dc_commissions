-- Role-Based Access Control Database Schema
-- This schema supports user roles, permissions, sessions, audit logging, and activity tracking

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by INTEGER REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

-- Companies table (if not already exists)
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User companies junction table
CREATE TABLE IF NOT EXISTS user_companies (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  assigned_by INTEGER REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  session_id UUID UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_data JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  role VARCHAR(100),
  action VARCHAR(100) NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User activity table
CREATE TABLE IF NOT EXISTS user_activity (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(100) NOT NULL,
  activity_data JSONB DEFAULT '{}',
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_active ON roles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_user_id ON user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_company_id ON user_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_timestamp ON user_activity(timestamp);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Functions for RBAC operations
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id INTEGER)
RETURNS JSONB AS $$
DECLARE
  user_permissions JSONB;
BEGIN
  SELECT COALESCE(
    (SELECT permissions FROM roles r
     JOIN user_roles ur ON r.id = ur.role_id
     WHERE ur.user_id = p_user_id AND r.is_active = true
     LIMIT 1),
    '[]'::JSONB
  ) INTO user_permissions;
  
  RETURN user_permissions;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_role(p_user_id INTEGER)
RETURNS VARCHAR AS $$
DECLARE
  user_role VARCHAR;
BEGIN
  SELECT r.name INTO user_role
  FROM roles r
  JOIN user_roles ur ON r.id = ur.role_id
  WHERE ur.user_id = p_user_id AND r.is_active = true
  LIMIT 1;
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_companies(p_user_id INTEGER)
RETURNS TABLE(company_id INTEGER, company_name VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name
  FROM companies c
  JOIN user_companies uc ON c.id = uc.company_id
  WHERE uc.user_id = p_user_id AND c.is_active = true
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION log_user_action(
  p_user_id INTEGER,
  p_action VARCHAR,
  p_details JSONB DEFAULT '{}'::JSONB,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  user_email VARCHAR;
  user_role VARCHAR;
BEGIN
  SELECT email INTO user_email FROM users WHERE id = p_user_id;
  SELECT get_user_role(p_user_id) INTO user_role;
  
  INSERT INTO audit_logs (user_id, user_email, role, action, details, ip_address, user_agent)
  VALUES (p_user_id, user_email, user_role, p_action, p_details, p_ip_address, p_user_agent);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(p_retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs 
  WHERE created_at < NOW() - INTERVAL '1 day' * p_retention_days;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_user_activity(p_retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_activity 
  WHERE timestamp < NOW() - INTERVAL '1 day' * p_retention_days;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Views for common queries
CREATE OR REPLACE VIEW user_permissions_view AS
SELECT 
  u.id as user_id,
  u.email,
  u.first_name,
  u.last_name,
  r.name as role_name,
  r.permissions,
  array_agg(c.name) as accessible_companies
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
LEFT JOIN user_companies uc ON u.id = uc.user_id
LEFT JOIN companies c ON uc.company_id = c.id
WHERE u.is_active = true
GROUP BY u.id, u.email, u.first_name, u.last_name, r.name, r.permissions;

CREATE OR REPLACE VIEW audit_summary_view AS
SELECT 
  action,
  COUNT(*) as action_count,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(created_at) as first_occurrence,
  MAX(created_at) as last_occurrence
FROM audit_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY action
ORDER BY action_count DESC;

CREATE OR REPLACE VIEW user_activity_summary_view AS
SELECT 
  u.email,
  ua.activity_type,
  COUNT(*) as activity_count,
  MAX(ua.timestamp) as last_activity
FROM user_activity ua
JOIN users u ON ua.user_id = u.id
WHERE ua.timestamp >= NOW() - INTERVAL '7 days'
GROUP BY u.email, ua.activity_type
ORDER BY activity_count DESC;

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
('admin', 'Administrator with full access', '["view_dashboard", "view_revenue_analysis", "view_commission_analysis", "view_all_companies", "view_financial_data", "view_sensitive_data", "export_data", "schedule_reports", "view_export_history", "manage_users", "manage_roles", "view_audit_logs", "configure_system", "view_performance_metrics", "manage_cache", "view_system_health"]'),
('manager', 'Manager with company-level access', '["view_dashboard", "view_revenue_analysis", "view_commission_analysis", "view_own_company", "view_financial_data", "export_data", "schedule_reports", "view_export_history", "view_audit_logs", "view_performance_metrics"]'),
('employee', 'Employee with limited access', '["view_dashboard", "view_revenue_analysis", "view_commission_analysis", "view_own_company", "export_data", "view_export_history"]'),
('viewer', 'Viewer with read-only access', '["view_dashboard", "view_revenue_analysis", "view_own_company"]')
ON CONFLICT (name) DO NOTHING;

-- Insert sample companies
INSERT INTO companies (name) VALUES
('Acme Corporation'),
('Tech Solutions Inc'),
('Global Industries'),
('Startup Ventures'),
('Enterprise Systems')
ON CONFLICT DO NOTHING;

-- Insert sample users (password_hash should be properly hashed in production)
INSERT INTO users (email, password_hash, first_name, last_name) VALUES
('admin@example.com', '$2b$10$sample.hash.for.admin', 'Admin', 'User'),
('manager@example.com', '$2b$10$sample.hash.for.manager', 'Manager', 'User'),
('employee@example.com', '$2b$10$sample.hash.for.employee', 'Employee', 'User'),
('viewer@example.com', '$2b$10$sample.hash.for.viewer', 'Viewer', 'User')
ON CONFLICT (email) DO NOTHING;

-- Assign roles to users
INSERT INTO user_roles (user_id, role_id, assigned_by) 
SELECT u.id, r.id, u.id
FROM users u, roles r
WHERE u.email = 'admin@example.com' AND r.name = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_by) 
SELECT u.id, r.id, u.id
FROM users u, roles r
WHERE u.email = 'manager@example.com' AND r.name = 'manager'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_by) 
SELECT u.id, r.id, u.id
FROM users u, roles r
WHERE u.email = 'employee@example.com' AND r.name = 'employee'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_by) 
SELECT u.id, r.id, u.id
FROM users u, roles r
WHERE u.email = 'viewer@example.com' AND r.name = 'viewer'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Assign companies to users
INSERT INTO user_companies (user_id, company_id, assigned_by)
SELECT u.id, c.id, u.id
FROM users u, companies c
WHERE u.email IN ('manager@example.com', 'employee@example.com', 'viewer@example.com')
  AND c.name IN ('Acme Corporation', 'Tech Solutions Inc')
ON CONFLICT (user_id, company_id) DO NOTHING;

-- Grant permissions to the application user (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
