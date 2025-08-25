import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from './db/connection.mjs';

// Initialize database tables if they don't exist
async function initializeDatabase() {
  try {
    // Create users table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create audit_logs table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action_type VARCHAR(50) NOT NULL,
        table_name VARCHAR(100),
        record_id VARCHAR(100),
        old_values JSONB,
        new_values JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for performance
    await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name)`);

    // Insert default admin user if it doesn't exist (using a more secure password)
    const adminPassword = 'AdminSecure2024!';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    await query(`
      INSERT INTO users (username, password_hash, role) 
      VALUES ($1, $2, 'admin')
      ON CONFLICT (username) DO NOTHING
    `, ['admin', hashedPassword]);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize database on first request
    await initializeDatabase();

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user in database
    const result = await query(
      'SELECT id, username, password_hash, role, status FROM users WHERE username = $1',
      [username]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key-2024',
      { expiresIn: '24h' }
    );

    // Log the login action
    await query(`
      INSERT INTO audit_logs (user_id, action_type, table_name, ip_address, user_agent)
      VALUES ($1, 'LOGIN', 'users', $2, $3)
    `, [user.id, req.headers['x-forwarded-for'] || req.connection.remoteAddress, req.headers['user-agent']]);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
