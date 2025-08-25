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

      // Try to make a test request to Zoho Analytics via backend proxy
      const testConnection = async () => {
        try {
          const response = await fetch('/api/zoho-analytics.mjs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tableName: 'referral_partners_DC',
              action: 'records',
              params: { limit: 1 }
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            // Check if we got a valid response (not an error)
            return data && !data.error;
          } else if (response.status === 503) {
            // Rate limited - still consider it a successful connection test
            // since we got a proper response from our API
            console.warn('Connection test: Zoho rate limited, but API is working');
            return true;
          } else {
            return false;
          }
        } catch (error: any) {
          console.error('Connection test failed:', error);
          return false;
        }
      };

      const connected = await testConnection();
      
      // Only use mock-data if explicitly enabled, otherwise show error
      const finalStatus = connected ? 'connected' : (useMockData ? 'mock-data' : 'error');
      setStatus(finalStatus);
      
      // Log the connection status for debugging
      console.log(`🔗 Connection Status: ${finalStatus.toUpperCase()}`);
      if (finalStatus === 'connected') {
        console.log('✅ Successfully connected to Zoho Analytics');
      } else if (finalStatus === 'mock-data') {
        console.log('📊 Using mock data (explicitly enabled)');
      } else {
        console.log('❌ Zoho Analytics connection failed');
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
