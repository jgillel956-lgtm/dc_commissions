import React, { useState, useEffect } from 'react';

interface TestResults {
  environment: {
    hasRefreshToken: boolean;
    hasClientId: boolean;
    hasClientSecret: boolean;
    hasWorkspaceId: boolean;
    hasOrgId: boolean;
    allCredentials: boolean;
    refreshTokenPreview: string;
    clientIdPreview: string;
    workspaceIdPreview: string;
    orgIdPreview: string;
  };
  tokenTest: {
    success: boolean;
    error?: string;
  };
  apiTest: {
    success: boolean;
    error?: string;
  };
  recommendations: string[];
}

const OAuthSetup: React.FC = () => {
  const [clientId, setClientId] = useState('');
  const [envStatus, setEnvStatus] = useState<any>(null);
  const [testResults, setTestResults] = useState<any>(null);
  const [authUrl, setAuthUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const checkEnvironment = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/zoho-analytics.mjs?debug=1');
      const data = await response.json();
      
      // Transform the data to match the expected format
      const envStatus = {
        hasRefreshToken: data.refreshTokenSet,
        hasClientId: data.clientIdSet,
        hasClientSecret: data.clientSecretSet,
        hasWorkspaceId: data.workspaceIdSet,
        hasOrgId: data.orgIdSet,
        allCredentials: data.refreshTokenSet && data.clientIdSet && data.clientSecretSet && data.workspaceIdSet && data.orgIdSet,
        refreshTokenPreview: data.refreshTokenSet ? 'Set' : 'Missing',
        clientIdPreview: data.clientIdSet ? 'Set' : 'Missing',
        workspaceIdPreview: data.workspaceIdSet ? 'Set' : 'Missing',
        orgIdPreview: data.orgIdSet ? 'Set' : 'Missing'
      };
      
      setEnvStatus(envStatus);
    } catch (error: any) {
      setEnvStatus({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const generateAuthUrl = () => {
    if (!clientId.trim()) {
      alert('Please enter your Client ID first');
      return;
    }
    
    const url = `https://accounts.zoho.com/oauth/v2/auth?response_type=code&client_id=${clientId}&scope=ZohoAnalytics.data.READ,ZohoAnalytics.data.WRITE&redirect_uri=https://dc-commissions.vercel.app/oauth-callback.html&access_type=offline`;
    setAuthUrl(url);
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      // Test OAuth token
      const oauthResponse = await fetch('/api/zoho-analytics.mjs?testOAuth=1');
      const oauthData = await oauthResponse.json();
      
      // Test API connection
      let apiTest: { success: boolean; error?: string } = { success: false, error: 'Unknown error' };
      try {
        const apiResponse = await fetch('/api/zoho-analytics.mjs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableName: 'employee_commissions_DC',
            action: 'records',
            params: { page: 1, limit: 1 }
          })
        });
        
        if (apiResponse.ok) {
          apiTest = { success: true };
        } else {
          const apiError = await apiResponse.json();
          apiTest = { success: false, error: apiError.error || 'Unknown error' };
        }
      } catch (apiError: any) {
        apiTest = { success: false, error: apiError.message };
      }
      
      // Create test results object
      const results: TestResults = {
        environment: {
          hasRefreshToken: false,
          hasClientId: false,
          hasClientSecret: false,
          hasWorkspaceId: false,
          hasOrgId: false,
          allCredentials: false,
          refreshTokenPreview: '',
          clientIdPreview: '',
          workspaceIdPreview: '',
          orgIdPreview: ''
        },
        tokenTest: {
          success: oauthData.success && oauthData.hasAccessToken,
          error: oauthData.error || (oauthData.data && oauthData.data.error)
        },
        apiTest: apiTest,
        recommendations: []
      };
      
      // Add recommendations if OAuth failed
      if (!oauthData.success || !oauthData.hasAccessToken) {
        results.recommendations = [
          'Your refresh token may have expired. Generate a new authorization code and refresh token.',
          'Make sure your Client ID and Client Secret are correct.',
          'Verify your redirect URI matches what\'s configured in Zoho.'
        ];
      }
      
      setTestResults(results);
    } catch (error: any) {
      setTestResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkEnvironment();
  }, []);

  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif',
      maxWidth: '800px',
      margin: '50px auto',
      padding: '20px',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1>🔧 Zoho Analytics OAuth Setup</h1>
        
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '4px',
          padding: '15px',
          margin: '15px 0'
        }}>
          <strong>⚠️ Important:</strong> This page helps you generate new OAuth tokens for Zoho Analytics. 
          Make sure you have your Client ID and Client Secret ready from the Zoho Developer Console.
        </div>

        {/* Step 1: Environment Variables */}
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          padding: '20px',
          margin: '20px 0'
        }}>
          <h3 style={{ color: '#007bff', marginTop: 0 }}>Step 1: Verify Environment Variables</h3>
          <p>First, let's check if your environment variables are set up correctly:</p>
          <button 
            onClick={checkEnvironment}
            disabled={loading}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              margin: '5px',
              fontSize: '16px'
            }}
          >
            {loading ? 'Checking...' : 'Check Environment Variables'}
          </button>
          
          {envStatus && (
            <div style={{
              backgroundColor: envStatus.error ? '#f8d7da' : '#d4edda',
              border: `1px solid ${envStatus.error ? '#f5c6cb' : '#c3e6cb'}`,
              borderRadius: '4px',
              padding: '15px',
              margin: '15px 0',
              color: envStatus.error ? '#721c24' : '#155724'
            }}>
              {envStatus.error ? (
                <div>
                  <h4>Error:</h4>
                  <p>{envStatus.error}</p>
                </div>
              ) : (
                <div>
                  <h4>Environment Variables Status:</h4>
                  <ul>
                    <li>Refresh Token: {envStatus.hasRefreshToken ? '✅ Set' : '❌ Missing'}</li>
                    <li>Client ID: {envStatus.hasClientId ? '✅ Set' : '❌ Missing'}</li>
                    <li>Client Secret: {envStatus.hasClientSecret ? '✅ Set' : '❌ Missing'}</li>
                    <li>Workspace ID: {envStatus.hasWorkspaceId ? '✅ Set' : '❌ Missing'}</li>
                    <li>Org ID: {envStatus.hasOrgId ? '✅ Set' : '❌ Missing'}</li>
                  </ul>
                  
                  {!envStatus.allCredentials && (
                    <div style={{
                      backgroundColor: '#fff3cd',
                      border: '1px solid #ffeaa7',
                      borderRadius: '4px',
                      padding: '15px',
                      margin: '15px 0'
                    }}>
                      <strong>Missing credentials detected!</strong> Please set all required environment variables in your Vercel dashboard.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Generate Authorization URL */}
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          padding: '20px',
          margin: '20px 0'
        }}>
          <h3 style={{ color: '#007bff', marginTop: 0 }}>Step 2: Generate Authorization URL</h3>
          <p>Click the button below to generate an authorization URL. You'll need to:</p>
          <ol>
            <li>Enter your Client ID</li>
            <li>Click "Generate Authorization URL"</li>
            <li>Open the generated URL in a new tab</li>
            <li>Authorize the application in Zoho</li>
          </ol>
          
          <div>
            <label htmlFor="clientId">Client ID:</label><br />
            <input 
              type="text" 
              id="clientId" 
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Enter your Zoho Client ID" 
              style={{ width: '100%', padding: '8px', margin: '5px 0' }}
            />
          </div>
          
          <button 
            onClick={generateAuthUrl}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              cursor: 'pointer',
              margin: '5px',
              fontSize: '16px'
            }}
          >
            Generate Authorization URL
          </button>
          
          {authUrl && (
            <div style={{
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '4px',
              padding: '15px',
              margin: '15px 0',
              color: '#155724'
            }}>
              <h4>Authorization URL Generated:</h4>
              <div style={{
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                padding: '15px',
                margin: '15px 0',
                fontFamily: 'monospace',
                wordBreak: 'break-all'
              }}>
                {authUrl}
              </div>
              <button 
                onClick={() => window.open(authUrl, '_blank')}
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  margin: '5px'
                }}
              >
                Open Authorization URL
              </button>
              <button 
                onClick={() => navigator.clipboard.writeText(authUrl)}
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  margin: '5px'
                }}
              >
                Copy URL
              </button>
            </div>
          )}
        </div>

        {/* Step 3: Test Connection */}
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          padding: '20px',
          margin: '20px 0'
        }}>
          <h3 style={{ color: '#007bff', marginTop: 0 }}>Step 3: Test Current Connection</h3>
          <p>Test if your current OAuth tokens are working:</p>
          <button 
            onClick={testConnection}
            disabled={loading}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              margin: '5px',
              fontSize: '16px'
            }}
          >
            {loading ? 'Testing...' : 'Test Connection'}
          </button>
          
          {testResults && (
            <div style={{
              backgroundColor: testResults.error ? '#f8d7da' : '#d4edda',
              border: `1px solid ${testResults.error ? '#f5c6cb' : '#c3e6cb'}`,
              borderRadius: '4px',
              padding: '15px',
              margin: '15px 0',
              color: testResults.error ? '#721c24' : '#155724'
            }}>
              <h4>Connection Test Results:</h4>
              
              {testResults.error ? (
                <p><strong>Error:</strong> {testResults.error}</p>
              ) : (
                <>
                  {testResults.tokenTest && (
                    <p>{testResults.tokenTest.success ? '✅ OAuth Token: Working' : '❌ OAuth Token: Failed'}</p>
                  )}
                  
                  {testResults.apiTest && (
                    <p>{testResults.apiTest.success ? '✅ API Connection: Working' : '❌ API Connection: Failed'}</p>
                  )}
                  
                  {testResults.recommendations && testResults.recommendations.length > 0 && (
                    <div style={{
                      backgroundColor: '#fff3cd',
                      border: '1px solid #ffeaa7',
                      borderRadius: '4px',
                      padding: '15px',
                      margin: '15px 0'
                    }}>
                      <h4>Recommendations:</h4>
                      <ul>
                        {testResults.recommendations.map((rec: string, index: number) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Step 4: Manual Token Exchange */}
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          padding: '20px',
          margin: '20px 0'
        }}>
          <h3 style={{ color: '#007bff', marginTop: 0 }}>Step 4: Manual Token Exchange (if needed)</h3>
          <p>If the automatic exchange doesn't work, you can manually exchange the authorization code:</p>
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            padding: '15px',
            margin: '15px 0',
            fontFamily: 'monospace',
            wordBreak: 'break-all'
          }}>
            <strong>Manual curl command:</strong><br />
            curl -X POST https://accounts.zoho.com/oauth/v2/token \<br />
            &nbsp;&nbsp;-d "code=AUTHORIZATION_CODE" \<br />
            &nbsp;&nbsp;-d "client_id=YOUR_CLIENT_ID" \<br />
            &nbsp;&nbsp;-d "client_secret=YOUR_CLIENT_SECRET" \<br />
            &nbsp;&nbsp;-d "redirect_uri=https://dc-commissions.vercel.app/oauth-callback.html" \<br />
            &nbsp;&nbsp;-d "grant_type=authorization_code"
          </div>
        </div>
      </div>
    </div>
  );
};

export default OAuthSetup;
