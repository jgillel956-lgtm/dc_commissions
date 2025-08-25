import { query } from './db/connection.mjs';
import jwt from 'jsonwebtoken';

// Helper function to authenticate token
const authenticateToken = async (req) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new Error('Access token required');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-2024');
  
  const result = await query(
    'SELECT id, username, role, status FROM users WHERE id = $1',
    [decoded.userId]
  );

  const user = result.rows[0];
  if (!user || user.status !== 'active') {
    throw new Error('Invalid user');
  }

  return user;
};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let user = null;

    // For POST requests with LOGIN action, allow without authentication
    if (req.method === 'POST' && req.body.action_type === 'LOGIN') {
      // For login operations, we'll handle user lookup differently
      user = { id: req.body.user_id || null };
    } else {
      // Authenticate token for all other requests
      user = await authenticateToken(req);
    }

    if (req.method === 'GET') {
      const { 
        page = 1, 
        limit = 50, 
        action_type, 
        table_name, 
        user_id,
        start_date,
        end_date,
        search
      } = req.query;

      let whereConditions = [];
      let queryParams = [];
      let paramCount = 1;

      if (action_type) {
        whereConditions.push(`action_type = $${paramCount++}`);
        queryParams.push(action_type);
      }

      if (table_name) {
        whereConditions.push(`table_name = $${paramCount++}`);
        queryParams.push(table_name);
      }

      if (user_id) {
        whereConditions.push(`user_id = $${paramCount++}`);
        queryParams.push(user_id);
      }

      if (start_date) {
        whereConditions.push(`created_at >= $${paramCount++}`);
        queryParams.push(start_date);
      }

      if (end_date) {
        whereConditions.push(`created_at <= $${paramCount++}`);
        queryParams.push(end_date);
      }

      if (search) {
        whereConditions.push(`(
          action_type ILIKE $${paramCount} OR 
          table_name ILIKE $${paramCount} OR 
          record_id ILIKE $${paramCount}
        )`);
        queryParams.push(`%${search}%`);
        paramCount++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await query(`
        SELECT COUNT(*) as total
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ${whereClause}
      `, queryParams);

      const total = parseInt(countResult.rows[0].total);
      const offset = (page - 1) * limit;

      // Get audit logs with pagination
      const logsResult = await query(`
        SELECT 
          al.id,
          al.action_type,
          al.table_name,
          al.record_id,
          al.old_values,
          al.new_values,
          al.ip_address,
          al.user_agent,
          al.created_at,
          u.username,
          u.role
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ${whereClause}
        ORDER BY al.created_at DESC
        LIMIT $${paramCount++} OFFSET $${paramCount++}
      `, [...queryParams, limit, offset]);

      res.json({
        success: true,
        logs: logsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } else if (req.method === 'POST') {
      // Create new audit log entry
      const { 
        action_type, 
        table_name, 
        record_id, 
        old_values, 
        new_values,
        ip_address,
        user_agent
      } = req.body;

      if (!action_type) {
        return res.status(400).json({ error: 'Action type is required' });
      }

      const newLog = await query(`
        INSERT INTO audit_logs (
          user_id, action_type, table_name, record_id, 
          old_values, new_values, ip_address, user_agent
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, action_type, table_name, record_id, created_at
      `, [user.id, action_type, table_name, record_id, old_values, new_values, ip_address, user_agent]);

      res.json({
        success: true,
        log: newLog.rows[0]
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Audit API error:', error);
    if (error.message === 'Access token required' || error.message === 'Invalid user') {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
