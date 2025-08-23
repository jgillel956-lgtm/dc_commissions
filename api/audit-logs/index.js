const db = require('../../db/connection');
const { authenticateToken, requireAdmin } = require('../../middleware/auth');

module.exports = async (req, res) => {
  // Apply authentication middleware
  await authenticateToken(req, res, async () => {
    await requireAdmin(req, res, async () => {
      try {
        if (req.method !== 'GET') {
          return res.status(405).json({ error: 'Method not allowed' });
        }

        const { 
          page = 1, 
          limit = 50, 
          user_id, 
          action_type, 
          table_name, 
          start_date, 
          end_date 
        } = req.query;

        // Build query with filters
        let query = `
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
            u.username as user_username
          FROM audit_logs al
          LEFT JOIN users u ON al.user_id = u.id
          WHERE 1=1
        `;
        
        const params = [];
        let paramCount = 0;

        if (user_id) {
          paramCount++;
          query += ` AND al.user_id = $${paramCount}`;
          params.push(user_id);
        }

        if (action_type) {
          paramCount++;
          query += ` AND al.action_type = $${paramCount}`;
          params.push(action_type);
        }

        if (table_name) {
          paramCount++;
          query += ` AND al.table_name = $${paramCount}`;
          params.push(table_name);
        }

        if (start_date) {
          paramCount++;
          query += ` AND al.created_at >= $${paramCount}`;
          params.push(start_date);
        }

        if (end_date) {
          paramCount++;
          query += ` AND al.created_at <= $${paramCount}`;
          params.push(end_date);
        }

        // Add ordering and pagination
        query += ` ORDER BY al.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const logsResult = await db.query(query, params);

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) FROM audit_logs WHERE 1=1';
        const countParams = [];
        let countParamCount = 0;

        if (user_id) {
          countParamCount++;
          countQuery += ` AND user_id = $${countParamCount}`;
          countParams.push(user_id);
        }

        if (action_type) {
          countParamCount++;
          countQuery += ` AND action_type = $${countParamCount}`;
          countParams.push(action_type);
        }

        if (table_name) {
          countParamCount++;
          countQuery += ` AND table_name = $${countParamCount}`;
          countParams.push(table_name);
        }

        if (start_date) {
          countParamCount++;
          countQuery += ` AND created_at >= $${countParamCount}`;
          countParams.push(start_date);
        }

        if (end_date) {
          countParamCount++;
          countQuery += ` AND created_at <= $${countParamCount}`;
          countParams.push(end_date);
        }

        const countResult = await db.query(countQuery, countParams);
        const totalCount = parseInt(countResult.rows[0].count);

        res.status(200).json({
          logs: logsResult.rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / parseInt(limit))
          }
        });

      } catch (error) {
        console.error('Audit logs API error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  });
};
