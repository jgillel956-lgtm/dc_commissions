const bcrypt = require('bcrypt');
const db = require('../../db/connection');
const { authenticateToken, requireAdmin } = require('../../middleware/auth');

module.exports = async (req, res) => {
  // Apply authentication middleware
  await authenticateToken(req, res, async () => {
    await requireAdmin(req, res, async () => {
      try {
        switch (req.method) {
          case 'GET':
            // Get all users
            const usersResult = await db.query(
              'SELECT id, username, role, status, created_at, updated_at FROM users ORDER BY created_at DESC'
            );
            res.status(200).json(usersResult.rows);
            break;

          case 'POST':
            // Create new user
            const { username, password, role } = req.body;

            if (!username || !password || !role) {
              return res.status(400).json({ error: 'Username, password, and role are required' });
            }

            if (!['admin', 'user'].includes(role)) {
              return res.status(400).json({ error: 'Role must be admin or user' });
            }

            // Check if username already exists
            const existingUser = await db.query('SELECT id FROM users WHERE username = $1', [username]);
            if (existingUser.rows.length > 0) {
              return res.status(400).json({ error: 'Username already exists' });
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, 10);

            // Create user
            const newUserResult = await db.query(
              'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role, status, created_at',
              [username, passwordHash, role]
            );

            // Log user creation
            await db.query(
              'INSERT INTO audit_logs (user_id, action_type, new_values, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5)',
              [
                req.user.id,
                'user_management',
                JSON.stringify({ action: 'create', username, role }),
                req.headers['x-forwarded-for'] || req.connection.remoteAddress,
                req.headers['user-agent']
              ]
            );

            res.status(201).json(newUserResult.rows[0]);
            break;

          default:
            res.status(405).json({ error: 'Method not allowed' });
        }
      } catch (error) {
        console.error('Users API error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  });
};
