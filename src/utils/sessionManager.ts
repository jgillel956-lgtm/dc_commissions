interface SessionData {
  token: string;
  user: {
    id: number;
    username: string;
    role: 'admin' | 'user';
  };
  expiresAt: number;
}

class SessionManager {
  private static readonly TOKEN_KEY = 'authToken';
  private static readonly USER_KEY = 'authUser';
  private static readonly SESSION_KEY = 'sessionData';
  private static readonly TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes buffer

  /**
   * Save session data to localStorage
   */
  static saveSession(token: string, user: any): void {
    try {
      const sessionData: SessionData = {
        token,
        user,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours from now
      };

      localStorage.setItem(this.TOKEN_KEY, token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));

      console.log('Session saved successfully');
    } catch (error) {
      console.error('Error saving session:', error);
      throw new Error('Failed to save session data');
    }
  }

  /**
   * Get session data from localStorage
   */
  static getSession(): SessionData | null {
    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY);
      if (!sessionData) {
        return null;
      }

      const session: SessionData = JSON.parse(sessionData);
      
      // Check if session has expired
      if (Date.now() > session.expiresAt) {
        this.clearSession();
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error reading session:', error);
      this.clearSession();
      return null;
    }
  }

  /**
   * Get token from localStorage
   */
  static getToken(): string | null {
    try {
      const session = this.getSession();
      return session?.token || null;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  /**
   * Get user data from localStorage
   */
  static getUser(): any | null {
    try {
      const session = this.getSession();
      return session?.user || null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  /**
   * Check if session is valid and not expired
   */
  static isSessionValid(): boolean {
    try {
      const session = this.getSession();
      if (!session) {
        return false;
      }

      // Check if session expires within the buffer time
      const expiresSoon = Date.now() > (session.expiresAt - this.TOKEN_EXPIRY_BUFFER);
      
      if (expiresSoon) {
        console.log('Session expires soon, should refresh token');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking session validity:', error);
      return false;
    }
  }

  /**
   * Check if session is about to expire (within buffer time)
   */
  static isSessionExpiringSoon(): boolean {
    try {
      const session = this.getSession();
      if (!session) {
        return false;
      }

      return Date.now() > (session.expiresAt - this.TOKEN_EXPIRY_BUFFER);
    } catch (error) {
      console.error('Error checking if session expires soon:', error);
      return false;
    }
  }

  /**
   * Update session with new token
   */
  static updateSession(newToken: string): void {
    try {
      const currentUser = this.getUser();
      if (!currentUser) {
        throw new Error('No current user found');
      }

      this.saveSession(newToken, currentUser);
      console.log('Session updated with new token');
    } catch (error) {
      console.error('Error updating session:', error);
      throw new Error('Failed to update session');
    }
  }

  /**
   * Clear all session data from localStorage
   */
  static clearSession(): void {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      localStorage.removeItem(this.SESSION_KEY);
      console.log('Session cleared successfully');
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  }

  /**
   * Get session expiry time
   */
  static getSessionExpiryTime(): number | null {
    try {
      const session = this.getSession();
      return session?.expiresAt || null;
    } catch (error) {
      console.error('Error getting session expiry time:', error);
      return null;
    }
  }

  /**
   * Get time until session expires (in milliseconds)
   */
  static getTimeUntilExpiry(): number | null {
    try {
      const expiryTime = this.getSessionExpiryTime();
      if (!expiryTime) {
        return null;
      }

      return expiryTime - Date.now();
    } catch (error) {
      console.error('Error calculating time until expiry:', error);
      return null;
    }
  }

  /**
   * Get session duration (how long the session has been active in milliseconds)
   */
  static getSessionDuration(): number | null {
    try {
      const session = this.getSession();
      if (!session) {
        return null;
      }

      // Calculate duration from session creation to now
      // Since we don't store creation time, we'll estimate based on expiry time
      const sessionLifetime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      const timeUntilExpiry = this.getTimeUntilExpiry();
      
      if (timeUntilExpiry === null) {
        return null;
      }

      return sessionLifetime - timeUntilExpiry;
    } catch (error) {
      console.error('Error calculating session duration:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return this.isSessionValid();
  }

  /**
   * Get user role
   */
  static getUserRole(): 'admin' | 'user' | null {
    try {
      const user = this.getUser();
      return user?.role || null;
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }

  /**
   * Check if user is admin
   */
  static isAdmin(): boolean {
    return this.getUserRole() === 'admin';
  }
}

export default SessionManager;
