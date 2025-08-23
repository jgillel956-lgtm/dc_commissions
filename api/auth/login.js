const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// For development, we'll use a mock user system
// In production, this would connect to the database
const MOCK_USERS = [
  {
    id: 1,
    username: 'admin',
    password_hash: '$2b$10$rQZ8K9mN2pL1vX3yW6tA7uB4cD5eF8gH9iJ0kL1mN2oP3qR4sT5uV6wX7yZ8', // admin123
    role: 'admin',
    status: 'active'
  },
  {
    id: 2,
    username: 'user',
    password_hash: '$2b$10$rQZ8K9mN2pL1vX3yW6tA7uB4cD5eF8gH9iJ0kL1mN2oP3qR4sT5uV6wX7yZ8', // admin123
    role: 'user',
    status: 'active'
  }
];

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    // Input validation
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required',
        details: {
          username: !username ? 'Username is required' : null,
          password: !password ? 'Password is required' : null
        }
      });
    }

    // Trim whitespace and validate length
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (trimmedUsername.length === 0) {
      return res.status(400).json({ error: 'Username cannot be empty' });
    }

    if (trimmedPassword.length === 0) {
      return res.status(400).json({ error: 'Password cannot be empty' });
    }

    if (trimmedUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long' });
    }

    if (trimmedPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Find user in mock data
    const user = MOCK_USERS.find(u => u.username === trimmedUsername);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is deactivated. Please contact an administrator.' });
    }

    // Verify password (using the same hash for both users in development)
    const isValidPassword = trimmedPassword === 'admin123'; // Simple check for development
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // In development, we'll skip database logging
    console.log(`Login successful for user: ${trimmedUsername} (${user.role})`);

    res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    
    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(500).json({ error: 'Token generation failed' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired' });
    }
    
    res.status(500).json({ error: 'Internal server error. Please try again later.' });
  }
};
