import { query } from './db/connection.mjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RBAC_CONFIG = {
  ROLES: {
    ADMIN: 'admin',
    MANAGER: 'manager',
    EMPLOYEE: 'employee',
    VIEWER: 'viewer'
  },
  PERMISSIONS: {
    // Dashboard access
    VIEW_DASHBOARD: 'view_dashboard',
    VIEW_REVENUE_ANALYSIS: 'view_revenue_analysis',
    VIEW_COMMISSION_ANALYSIS: 'view_commission_analysis',
    
    // Data access
    VIEW_ALL_COMPANIES: 'view_all_companies',
    VIEW_OWN_COMPANY: 'view_own_company',
    VIEW_FINANCIAL_DATA: 'view_financial_data',
    VIEW_SENSITIVE_DATA: 'view_sensitive_data',
    
    // Export and reporting
    EXPORT_DATA: 'export_data',
    SCHEDULE_REPORTS: 'schedule_reports',
    VIEW_EXPORT_HISTORY: 'view_export_history',
    
    // Administrative
    MANAGE_USERS: 'manage_users',
    MANAGE_ROLES: 'manage_roles',
    VIEW_AUDIT_LOGS: 'view_audit_logs',
    CONFIGURE_SYSTEM: 'configure_system',
    
    // Performance and monitoring
    VIEW_PERFORMANCE_METRICS: 'view_performance_metrics',
    MANAGE_CACHE: 'manage_cache',
    VIEW_SYSTEM_HEALTH: 'view_system_health'
  },
  ROLE_PERMISSIONS: {
    admin: [
      'view_dashboard', 'view_revenue_analysis', 'view_commission_analysis',
      'view_all_companies', 'view_financial_data', 'view_sensitive_data',
      'export_data', 'schedule_reports', 'view_export_history',
      'manage_users', 'manage_roles', 'view_audit_logs', 'configure_system',
      'view_performance_metrics', 'manage_cache', 'view_system_health'
    ],
    manager: [
      'view_dashboard', 'view_revenue_analysis', 'view_commission_analysis',
      'view_own_company', 'view_financial_data',
      'export_data', 'schedule_reports', 'view_export_history',
      'view_audit_logs', 'view_performance_metrics'
    ],
    employee: [
      'view_dashboard', 'view_revenue_analysis', 'view_commission_analysis',
      'view_own_company',
      'export_data', 'view_export_history'
    ],
    viewer: [
      'view_dashboard', 'view_revenue_analysis',
      'view_own_company'
    ]
  },
  DATA_MASKING: {
    SENSITIVE_FIELDS: ['commission_amount', 'profit_margin', 'cost_breakdown'],
    MASK_PATTERN: '***',
    PARTIAL_MASK_PATTERN: '***'
  },
  AUDIT: {
    LOG_ACTIONS: [
      'login', 'logout', 'view_dashboard', 'export_data', 'access_sensitive_data',
      'role_change', 'permission_change', 'data_access', 'configuration_change'
    ],
    RETENTION_DAYS: 365
  }
};

class RoleBasedAccessControlService {
  constructor() {
    this.config = RBAC_CONFIG;
    this.ensureDirectories();
  }

  ensureDirectories() {
    const auditLogDir = path.join(__dirname, '../logs/audit');
    if (!fs.existsSync(auditLogDir)) {
      fs.mkdirSync(auditLogDir, { recursive: true });
    }
  }

  // User authentication and role validation
  async validateUserToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await this.getUserById(decoded.userId);
      
      if (!user || !user.is_active) {
        return { valid: false, error: 'Invalid or inactive user' };
      }

      return { valid: true, user };
    } catch (error) {
      return { valid: false, error: 'Invalid token' };
    }
  }

  async getUserById(userId) {
    const sql = `
      SELECT u.*, r.role_name, r.permissions
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1 AND u.is_active = true
    `;
    
    const result = await query(sql, [userId]);
    return result.rows[0] || null;
  }

  async getUserByEmail(email) {
    const sql = `
      SELECT u.*, r.role_name, r.permissions
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN user_roles r ON ur.role_id = r.id
      WHERE u.email = $1 AND u.is_active = true
    `;
    
    const result = await query(sql, [email]);
    return result.rows[0] || null;
  }

  // Permission checking
  async hasPermission(userId, permission) {
    const user = await this.getUserById(userId);
    if (!user) return false;

    // Check if user has the specific permission
    if (user.permissions && user.permissions.includes(permission)) {
      return true;
    }

    // Check role-based permissions
    const rolePermissions = this.config.ROLE_PERMISSIONS[user.role_name] || [];
    return rolePermissions.includes(permission);
  }

  async checkMultiplePermissions(userId, permissions) {
    const results = {};
    for (const permission of permissions) {
      results[permission] = await this.hasPermission(userId, permission);
    }
    return results;
  }

  // Data access control
  async getAccessibleCompanies(userId) {
    const user = await this.getUserById(userId);
    if (!user) return [];

    // Admin can access all companies
    if (await this.hasPermission(userId, this.config.PERMISSIONS.VIEW_ALL_COMPANIES)) {
      const sql = 'SELECT id, name FROM companies WHERE is_active = true ORDER BY name';
      const result = await query(sql);
      return result.rows;
    }

    // Other users can only access their assigned companies
    const sql = `
      SELECT c.id, c.name
      FROM companies c
      JOIN user_companies uc ON c.id = uc.company_id
      WHERE uc.user_id = $1 AND c.is_active = true
      ORDER BY c.name
    `;
    
    const result = await query(sql, [userId]);
    return result.rows;
  }

  async filterDataByUserAccess(userId, data, dataType) {
    const user = await this.getUserById(userId);
    if (!user) return [];

    // Admin can see all data
    if (await this.hasPermission(userId, this.config.PERMISSIONS.VIEW_ALL_COMPANIES)) {
      return this.maskSensitiveData(userId, data, dataType);
    }

    // Filter by accessible companies
    const accessibleCompanies = await this.getAccessibleCompanies(userId);
    const companyIds = accessibleCompanies.map(c => c.id);
    
    const filteredData = data.filter(item => {
      return companyIds.includes(item.company_id);
    });

    return this.maskSensitiveData(userId, filteredData, dataType);
  }

  // Data masking for sensitive information
  async maskSensitiveData(userId, data, dataType) {
    const user = await this.getUserById(userId);
    if (!user) return data;

    // Check if user has permission to view sensitive data
    const canViewSensitive = await this.hasPermission(userId, this.config.PERMISSIONS.VIEW_SENSITIVE_DATA);
    
    if (canViewSensitive) {
      return data;
    }

    // Apply data masking
    return data.map(item => {
      const maskedItem = { ...item };
      
      this.config.DATA_MASKING.SENSITIVE_FIELDS.forEach(field => {
        if (maskedItem[field] !== undefined) {
          maskedItem[field] = this.config.DATA_MASKING.MASK_PATTERN;
        }
      });

      return maskedItem;
    });
  }

  // Audit logging
  async logUserAction(userId, action, details = {}) {
    const user = await this.getUserById(userId);
    if (!user) return;

    const auditLog = {
      user_id: userId,
      user_email: user.email,
      role: user.role_name,
      action: action,
      details: details,
      timestamp: new Date().toISOString(),
      ip_address: details.ip_address || null,
      user_agent: details.user_agent || null
    };

    // Log to database
    const sql = `
      INSERT INTO audit_logs (user_id, user_email, role, action, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await query(sql, [
      auditLog.user_id,
      auditLog.user_email,
      auditLog.role,
      auditLog.action,
      JSON.stringify(auditLog.details),
      auditLog.ip_address,
      auditLog.user_agent
    ]);

    // Log to file for backup
    const logFile = path.join(__dirname, '../logs/audit', `${new Date().toISOString().split('T')[0]}.log`);
    const logEntry = JSON.stringify(auditLog) + '\n';
    fs.appendFileSync(logFile, logEntry);
  }

  // Session management
  async createUserSession(userId, sessionData = {}) {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const sql = `
      INSERT INTO user_sessions (session_id, user_id, session_data, expires_at)
      VALUES ($1, $2, $3, $4)
    `;
    
    await query(sql, [sessionId, userId, JSON.stringify(sessionData), expiresAt]);
    
    await this.logUserAction(userId, 'login', {
      session_id: sessionId,
      ...sessionData
    });

    return sessionId;
  }

  async validateSession(sessionId) {
    const sql = `
      SELECT us.*, u.email, u.is_active
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.session_id = $1 AND us.expires_at > NOW() AND u.is_active = true
    `;
    
    const result = await query(sql, [sessionId]);
    return result.rows[0] || null;
  }

  async destroySession(sessionId) {
    const session = await this.validateSession(sessionId);
    if (session) {
      await this.logUserAction(session.user_id, 'logout', { session_id: sessionId });
    }

    const sql = 'DELETE FROM user_sessions WHERE session_id = $1';
    await query(sql, [sessionId]);
  }

  // User activity monitoring
  async trackUserActivity(userId, activity) {
    const sql = `
      INSERT INTO user_activity (user_id, activity_type, activity_data, timestamp)
      VALUES ($1, $2, $3, NOW())
    `;
    
    await query(sql, [userId, activity.type, JSON.stringify(activity.data)]);
  }

  async getUserActivity(userId, options = {}) {
    const { limit = 50, offset = 0, activityType = null } = options;
    
    let sql = `
      SELECT * FROM user_activity 
      WHERE user_id = $1
    `;
    const params = [userId];
    
    if (activityType) {
      sql += ' AND activity_type = $2';
      params.push(activityType);
    }
    
    sql += ' ORDER BY timestamp DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);
    
    const result = await query(sql, params);
    return result.rows;
  }

  // Role and permission management (admin only)
  async createRole(roleData) {
    const { name, description, permissions } = roleData;
    
    const sql = `
      INSERT INTO roles (name, description, permissions)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await query(sql, [name, description, JSON.stringify(permissions)]);
    return result.rows[0];
  }

  async updateRole(roleId, roleData) {
    const { name, description, permissions } = roleData;
    
    const sql = `
      UPDATE roles 
      SET name = $1, description = $2, permissions = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `;
    
    const result = await query(sql, [name, description, JSON.stringify(permissions), roleId]);
    return result.rows[0];
  }

  async assignRoleToUser(userId, roleId) {
    // Remove existing role assignment
    await query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
    
    // Assign new role
    const sql = `
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, $2)
      RETURNING *
    `;
    
    const result = await query(sql, [userId, roleId]);
    return result.rows[0];
  }

  // Dashboard access control
  async getDashboardAccess(userId) {
    const permissions = await this.checkMultiplePermissions(userId, [
      this.config.PERMISSIONS.VIEW_DASHBOARD,
      this.config.PERMISSIONS.VIEW_REVENUE_ANALYSIS,
      this.config.PERMISSIONS.VIEW_COMMISSION_ANALYSIS,
      this.config.PERMISSIONS.VIEW_FINANCIAL_DATA,
      this.config.PERMISSIONS.VIEW_SENSITIVE_DATA,
      this.config.PERMISSIONS.EXPORT_DATA,
      this.config.PERMISSIONS.VIEW_PERFORMANCE_METRICS
    ]);

    const accessibleCompanies = await this.getAccessibleCompanies(userId);
    
    return {
      permissions,
      accessibleCompanies,
      canViewSensitiveData: permissions[this.config.PERMISSIONS.VIEW_SENSITIVE_DATA],
      canExportData: permissions[this.config.PERMISSIONS.EXPORT_DATA],
      canViewPerformanceMetrics: permissions[this.config.PERMISSIONS.VIEW_PERFORMANCE_METRICS]
    };
  }

  // Cleanup expired sessions and old audit logs
  async cleanupExpiredData() {
    // Cleanup expired sessions
    await query('DELETE FROM user_sessions WHERE expires_at < NOW()');
    
    // Cleanup old audit logs
    const retentionDate = new Date(Date.now() - this.config.AUDIT.RETENTION_DAYS * 24 * 60 * 60 * 1000);
    await query('DELETE FROM audit_logs WHERE created_at < $1', [retentionDate]);
    
    // Cleanup old user activity
    await query('DELETE FROM user_activity WHERE timestamp < $1', [retentionDate]);
  }

  startCleanupInterval() {
    // Run cleanup every hour
    setInterval(() => {
      this.cleanupExpiredData().catch(console.error);
    }, 60 * 60 * 1000);
  }
}

const rbacService = new RoleBasedAccessControlService();

// API Handlers
export async function rbacHandler(req, res) {
  try {
    const { method, url } = req;
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const validation = await rbacService.validateUserToken(token);
    if (!validation.valid) {
      return res.status(401).json({ error: validation.error });
    }

    const userId = validation.user.id;

    // Log the API access
    await rbacService.logUserAction(userId, 'api_access', {
      method,
      url,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    if (method === 'GET' && url.startsWith('/api/rbac/dashboard-access')) {
      return await handleGetDashboardAccess(req, res, userId);
    } else if (method === 'GET' && url.startsWith('/api/rbac/permissions')) {
      return await handleGetPermissions(req, res, userId);
    } else if (method === 'GET' && url.startsWith('/api/rbac/companies')) {
      return await handleGetCompanies(req, res, userId);
    } else if (method === 'POST' && url.startsWith('/api/rbac/session')) {
      return await handleCreateSession(req, res, userId);
    } else if (method === 'DELETE' && url.startsWith('/api/rbac/session')) {
      return await handleDestroySession(req, res, userId);
    } else if (method === 'GET' && url.startsWith('/api/rbac/activity')) {
      return await handleGetActivity(req, res, userId);
    } else if (method === 'GET' && url.startsWith('/api/rbac/audit-logs')) {
      return await handleGetAuditLogs(req, res, userId);
    } else if (method === 'POST' && url.startsWith('/api/rbac/roles')) {
      return await handleCreateRole(req, res, userId);
    } else if (method === 'PUT' && url.startsWith('/api/rbac/roles/')) {
      return await handleUpdateRole(req, res, userId);
    } else if (method === 'POST' && url.startsWith('/api/rbac/assign-role')) {
      return await handleAssignRole(req, res, userId);
    } else {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
  } catch (error) {
    console.error('RBAC Handler Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGetDashboardAccess(req, res, userId) {
  try {
    const dashboardAccess = await rbacService.getDashboardAccess(userId);
    res.json({ success: true, data: dashboardAccess });
  } catch (error) {
    console.error('Get Dashboard Access Error:', error);
    res.status(500).json({ error: 'Failed to get dashboard access' });
  }
}

async function handleGetPermissions(req, res, userId) {
  try {
    const { permissions } = req.query;
    const permissionList = permissions ? permissions.split(',') : Object.values(rbacService.config.PERMISSIONS);
    
    const userPermissions = await rbacService.checkMultiplePermissions(userId, permissionList);
    res.json({ success: true, data: userPermissions });
  } catch (error) {
    console.error('Get Permissions Error:', error);
    res.status(500).json({ error: 'Failed to get permissions' });
  }
}

async function handleGetCompanies(req, res, userId) {
  try {
    const companies = await rbacService.getAccessibleCompanies(userId);
    res.json({ success: true, data: companies });
  } catch (error) {
    console.error('Get Companies Error:', error);
    res.status(500).json({ error: 'Failed to get companies' });
  }
}

async function handleCreateSession(req, res, userId) {
  try {
    const sessionData = {
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    };
    
    const sessionId = await rbacService.createUserSession(userId, sessionData);
    res.json({ success: true, data: { sessionId } });
  } catch (error) {
    console.error('Create Session Error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
}

async function handleDestroySession(req, res, userId) {
  try {
    const { sessionId } = req.body;
    await rbacService.destroySession(sessionId);
    res.json({ success: true, message: 'Session destroyed' });
  } catch (error) {
    console.error('Destroy Session Error:', error);
    res.status(500).json({ error: 'Failed to destroy session' });
  }
}

async function handleGetActivity(req, res, userId) {
  try {
    const { limit, offset, activityType } = req.query;
    const options = {
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
      activityType: activityType || null
    };
    
    const activity = await rbacService.getUserActivity(userId, options);
    res.json({ success: true, data: activity });
  } catch (error) {
    console.error('Get Activity Error:', error);
    res.status(500).json({ error: 'Failed to get activity' });
  }
}

async function handleGetAuditLogs(req, res, userId) {
  try {
    // Check if user has permission to view audit logs
    if (!await rbacService.hasPermission(userId, rbacService.config.PERMISSIONS.VIEW_AUDIT_LOGS)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { limit = 100, offset = 0, user_id, action, start_date, end_date } = req.query;
    
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (user_id) {
      paramCount++;
      sql += ` AND user_id = $${paramCount}`;
      params.push(user_id);
    }

    if (action) {
      paramCount++;
      sql += ` AND action = $${paramCount}`;
      params.push(action);
    }

    if (start_date) {
      paramCount++;
      sql += ` AND created_at >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      sql += ` AND created_at <= $${paramCount}`;
      params.push(end_date);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get Audit Logs Error:', error);
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
}

async function handleCreateRole(req, res, userId) {
  try {
    // Check if user has permission to manage roles
    if (!await rbacService.hasPermission(userId, rbacService.config.PERMISSIONS.MANAGE_ROLES)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const roleData = req.body;
    const role = await rbacService.createRole(roleData);
    
    await rbacService.logUserAction(userId, 'role_created', { role_id: role.id, role_name: role.name });
    res.json({ success: true, data: role });
  } catch (error) {
    console.error('Create Role Error:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
}

async function handleUpdateRole(req, res, userId) {
  try {
    // Check if user has permission to manage roles
    if (!await rbacService.hasPermission(userId, rbacService.config.PERMISSIONS.MANAGE_ROLES)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const roleId = req.url.split('/').pop();
    const roleData = req.body;
    const role = await rbacService.updateRole(roleId, roleData);
    
    await rbacService.logUserAction(userId, 'role_updated', { role_id: role.id, role_name: role.name });
    res.json({ success: true, data: role });
  } catch (error) {
    console.error('Update Role Error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
}

async function handleAssignRole(req, res, userId) {
  try {
    // Check if user has permission to manage users
    if (!await rbacService.hasPermission(userId, rbacService.config.PERMISSIONS.MANAGE_USERS)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { target_user_id, role_id } = req.body;
    const assignment = await rbacService.assignRoleToUser(target_user_id, role_id);
    
    await rbacService.logUserAction(userId, 'role_assigned', { 
      target_user_id, 
      role_id,
      assigned_by: userId 
    });
    res.json({ success: true, data: assignment });
  } catch (error) {
    console.error('Assign Role Error:', error);
    res.status(500).json({ error: 'Failed to assign role' });
  }
}

export async function healthHandler(req, res) {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'role-based-access-control',
      version: '1.0.0'
    };
    
    res.json(health);
  } catch (error) {
    console.error('Health Check Error:', error);
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
}

// Start cleanup interval
rbacService.startCleanupInterval();

export { rbacService, RBAC_CONFIG };
