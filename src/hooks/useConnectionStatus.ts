import { useState, useEffect } from 'react';

export type ConnectionStatus = 'checking' | 'connected' | 'mock-data' | 'error';

interface UseConnectionStatusReturn {
  status: ConnectionStatus;
  isLoading: boolean;
  refresh: () => void;
}

export const useConnectionStatus = (): UseConnectionStatusReturn => {
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [isLoading, setIsLoading] = useState(true);

  const checkConnection = async () => {
    setIsLoading(true);
    setStatus('checking');

    try {
      // Check if environment variables are loaded
      const hasEnvVars = !!(
        process.env.REACT_APP_ZOHO_REFRESH_TOKEN &&
        process.env.REACT_APP_ZOHO_CLIENT_ID &&
        process.env.REACT_APP_ZOHO_CLIENT_SECRET &&
        process.env.REACT_APP_ZOHO_WORKSPACE_ID &&
        process.env.REACT_APP_ZOHO_ORG_ID
      );

      if (!hasEnvVars) {
        setStatus('mock-data');
        setIsLoading(false);
        return;
      }

      // Check if mock data is enabled
      const useMockData = process.env.REACT_APP_ENABLE_MOCK_DATA === 'true';
      
      if (useMockData) {
        setStatus('mock-data');
        setIsLoading(false);
        return;
      }

      // Try to make a test request to Zoho Analytics
      const testConnection = async () => {
        try {
          // Import the API dynamically to avoid circular dependencies
          const { zohoAnalyticsAPI } = await import('../services/zohoAnalyticsAPI');
          await zohoAnalyticsAPI.testConnection();
          return true;
        } catch (error: any) {
          // If we get the CORS fallback error, we're not connected
          if (error.message === 'CORS_BLOCKED_FALLBACK_TO_MOCK') {
            return false;
          }
          // For other errors, we might be connected but have other issues
          return true;
        }
      };

      const connected = await testConnection();
      const finalStatus = connected ? 'connected' : 'mock-data';
      setStatus(finalStatus);
      
      // Log the connection status for debugging
      console.log(`🔗 Connection Status: ${finalStatus.toUpperCase()}`);
      if (finalStatus === 'connected') {
        console.log('✅ Successfully connected to Zoho Analytics');
      } else {
        console.log('📊 Using mock data (Zoho Analytics not connected)');
      }
    } catch (error) {
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = () => {
    checkConnection();
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return {
    status,
    isLoading,
    refresh
  };
};
