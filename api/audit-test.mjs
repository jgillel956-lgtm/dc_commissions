import { query } from './db/connection.mjs';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Test creating an audit log entry
      const testLog = await query(`
        INSERT INTO audit_logs (
          user_id, action_type, table_name, record_id, 
          old_values, new_values, ip_address, user_agent
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, action_type, table_name, record_id, created_at
      `, [
        1, // user_id (assuming admin user exists)
        'TEST',
        'test_table',
        'test_record_123',
        { test: 'old_value' },
        { test: 'new_value' },
        '127.0.0.1',
        'Test User Agent'
      ]);

      // Get all audit logs
      const allLogs = await query(`
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
        ORDER BY al.created_at DESC
        LIMIT 10
      `);

      res.json({
        success: true,
        testLogCreated: testLog.rows[0],
        recentLogs: allLogs.rows,
        totalLogs: allLogs.rows.length
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Audit test error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
