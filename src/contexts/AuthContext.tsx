import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import axios from 'axios';
import SessionManager from '../utils/sessionManager';

interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
}

interface LoadingStates {
  initializing: boolean;
  loggingIn: boolean;
  refreshing: boolean;
  loggingOut: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: (reason?: 'user_initiated' | 'session_expired' | 'token_refresh_failed') => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  error: string | null;
  clearError: () => void;
  loading: LoadingStates;
  refreshToken: () => Promise<void>;
  isInitializing: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<LoadingStates>({
    initializing: true,
    loggingIn: false,
    refreshing: false,
    loggingOut: false
  });

  // Token refresh function
  const refreshToken = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, refreshing: true }));
      setError(null);

      const currentToken = SessionManager.getToken();
      if (!currentToken) {
        throw new Error('No token to refresh');
      }

      // For development, we'll simulate a token refresh
      // In production, this would call a refresh endpoint
      const response = await axios.post('/api/auth/refresh', {}, {
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      });

      const { token: newToken, user: userData } = response.data;

      // Update session using SessionManager
      SessionManager.updateSession(newToken);
      setToken(newToken);
      setUser(userData);

      // Update axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

      console.log('Token refreshed successfully');
    } catch (error: any) {
      console.error('Token refresh failed:', error);
      // If refresh fails, logout the user
      logout();
      throw new Error('Session expired. Please login again.');
    } finally {
      setLoading(prev => ({ ...prev, refreshing: false }));
    }
  }, []);

  // Validate token on app start and set up automatic refresh
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(prev => ({ ...prev, initializing: true }));
        
        // Check if session is valid using SessionManager
        if (SessionManager.isSessionValid()) {
          const sessionUser = SessionManager.getUser();
          const sessionToken = SessionManager.getToken();
          
          if (sessionUser && sessionToken) {
            setUser(sessionUser);
            setToken(sessionToken);
            axios.defaults.headers.common['Authorization'] = `Bearer ${sessionToken}`;
            
            // Set up automatic token refresh if session expires soon
            if (SessionManager.isSessionExpiringSoon()) {
              try {
                await refreshToken();
              } catch (error) {
                console.error('Initial token refresh failed:', error);
              }
            }
            
            // Set up periodic session check (every 5 minutes)
            const sessionCheckInterval = setInterval(() => {
              if (SessionManager.isSessionExpiringSoon()) {
                refreshToken().catch(error => {
                  console.error('Periodic token refresh failed:', error);
                });
              }
            }, 5 * 60 * 1000); // 5 minutes

            // Cleanup interval on unmount
            return () => clearInterval(sessionCheckInterval);
          }
        } else {
          // Session is invalid or expired, clear it
          SessionManager.clearSession();
          setError('Session expired. Please login again.');
          // Log the session expiry
          logout('session_expired');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setError('Failed to initialize authentication.');
      } finally {
        setLoading(prev => ({ ...prev, initializing: false }));
      }
    };

    initializeAuth();
  }, [refreshToken]);

  // Set up axios interceptor for automatic token refresh on 401 errors
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Skip token refresh for Zoho Analytics API calls
        if (originalRequest.url && originalRequest.url.includes('/api/zoho-analytics')) {
          return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await refreshToken();
            // Retry the original request with new token
            const newToken = SessionManager.getToken();
            if (newToken) {
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
              return axios(originalRequest);
            }
                  } catch (refreshError) {
          // Refresh failed, redirect to login
          logout('token_refresh_failed');
          return Promise.reject(refreshError);
        }
        }

        return Promise.reject(error);
      }
    );

    // Cleanup interceptor on unmount
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [refreshToken]);

  const clearError = () => {
    setError(null);
  };

  const login = async (username: string, password: string) => {
    try {
      setError(null);
      setLoading(prev => ({ ...prev, loggingIn: true }));

      const response = await axios.post('/api/login.mjs', {
        username,
        password
      });

      const { token: newToken, user: userData } = response.data;

      // Save session using SessionManager
      SessionManager.saveSession(newToken, userData);

      // Update state
      setToken(newToken);
      setUser(userData);

      // Set default authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

      // Log successful login
      try {
        const { auditLogger } = await import('../services/auditLogger');
        await auditLogger.logLogin(
          userData.id?.toString() || 'unknown',
          userData.username || 'Unknown User',
          true
        );
      } catch (auditError) {
        console.error('Audit logging failed during login:', auditError);
        // Don't block login if audit logging fails
      }

    } catch (error: any) {
      console.error('Login error:', error);
      
      // Log failed login attempt
      try {
        const { auditLogger } = await import('../services/auditLogger');
        const errorMessage = error.response?.data?.error || 'Login failed';
        await auditLogger.logLogin(
          'unknown',
          username,
          false,
          errorMessage
        );
      } catch (auditError) {
        console.error('Audit logging failed for failed login:', auditError);
        // Don't block error handling if audit logging fails
      }
      
      // Handle different types of errors
      if (error.response) {
        const { status, data } = error.response;
        
        switch (status) {
          case 400:
            setError(data.error || 'Invalid request. Please check your input.');
            break;
          case 401:
            setError(data.error || 'Invalid username or password.');
            break;
          case 403:
            setError('Access denied. Your account may be deactivated.');
            break;
          case 404:
            setError('Authentication service not found. Please try again later.');
            break;
          case 500:
            setError('Server error. Please try again later.');
            break;
          default:
            setError(data.error || 'An unexpected error occurred. Please try again.');
        }
      } else if (error.request) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      
      throw new Error(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(prev => ({ ...prev, loggingIn: false }));
    }
  };

  const logout = async (reason: 'user_initiated' | 'session_expired' | 'token_refresh_failed' = 'user_initiated') => {
    try {
      setLoading(prev => ({ ...prev, loggingOut: true }));
      
      // Get current user info before clearing session
      const currentUser = user;
      const currentToken = token;
      
      // Call logout API endpoint to log the event server-side
      if (currentUser && currentToken) {
        try {
          await axios.post('/api/auth/logout', {
            userId: currentUser.id,
            username: currentUser.username,
            logoutReason: reason
          });
        } catch (apiError) {
          console.error('Logout API call failed:', apiError);
          // Continue with logout even if API call fails
        }
        
        // Also log locally for audit
        try {
          const { auditLogger } = await import('../services/auditLogger');
          await auditLogger.logLogout(
            currentUser.id?.toString() || 'unknown',
            currentUser.username || 'Unknown User',
            reason,
            SessionManager.getSessionDuration() || undefined,
            { clientSide: true }
          );
        } catch (auditError) {
          console.error('Audit logging failed during logout:', auditError);
          // Don't block logout if audit logging fails
        }
      }
      
      // Clear session using SessionManager
      SessionManager.clearSession();

      // Clear state
      setToken(null);
      setUser(null);
      setError(null);

      // Clear authorization header
      delete axios.defaults.headers.common['Authorization'];
      
      // Clear any cached data
      if (window.sessionStorage) {
        sessionStorage.removeItem('audit_session_id');
      }
      
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      setError('Error during logout. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, loggingOut: false }));
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!user && !!token,
    isAdmin: user?.role === 'admin',
    error,
    clearError,
    loading,
    refreshToken,
    isInitializing: loading.initializing
  };

  if (loading.initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-white text-lg">Initializing...</div>
          <div className="text-gray-400 text-sm mt-2">Loading your session</div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
