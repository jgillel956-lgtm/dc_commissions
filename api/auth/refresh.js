const jwt = require('jsonwebtoken');

// Mock users for development (same as in login.js)
const MOCK_USERS = [
  {
    id: 1,
    username: 'admin',
    role: 'admin',
    status: 'active'
  },
  {
    id: 2,
    username: 'user',
    role: 'user',
    status: 'active'
  }
];

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify the current token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token has expired' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Find user in mock data
    const user = MOCK_USERS.find(u => u.id === decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Create new JWT token
    const newToken = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log(`Token refreshed for user: ${user.username} (${user.role})`);

    res.status(200).json({
      token: newToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      message: 'Token refreshed successfully'
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
