// Logout API endpoint
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, username, logoutReason = 'user_initiated' } = req.body;

    // Log the logout event for audit
    try {
      const { auditLogger } = await import('../../../src/services/auditLogger');
      await auditLogger.logCreate(
        userId?.toString() || 'unknown',
        username || 'Unknown User',
        'auth_system',
        'logout_' + Date.now(),
        { 
          action: 'LOGOUT', 
          timestamp: new Date().toISOString(),
          logoutReason,
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          userAgent: req.headers['user-agent']
        },
        { 
          operation: 'LOGOUT',
          logoutReason,
          serverSide: true
        }
      );
    } catch (auditError) {
      console.error('Audit logging failed during logout:', auditError);
      // Don't block logout if audit logging fails
    }

    // In a production environment, you might want to:
    // 1. Add the token to a blacklist
    // 2. Update user's last logout time in database
    // 3. Send logout notification to other sessions
    // 4. Clear any server-side session data

    // For now, we'll just return success
    // The client is responsible for clearing local storage and state

    res.status(200).json({ 
      success: true, 
      message: 'Logout successful',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Internal server error during logout',
      timestamp: new Date().toISOString()
    });
  }
}
