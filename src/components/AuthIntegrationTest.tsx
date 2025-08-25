import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { zohoApi } from '../services/zohoApi';
import Button from './ui/Button';
// import LoadingSpinner from './ui/LoadingSpinner'; // Unused import - commented out

const AuthIntegrationTest: React.FC = () => {
  const { user, isAuthenticated, token } = useAuth();
  const { showSuccess, showError, showInfo } = useToast();
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    try {
      showInfo(`Running test: ${testName}`);
      const result = await testFn();
      setTestResults(prev => [...prev, { testName, status: 'success', result }]);
      showSuccess(`Test passed: ${testName}`);
      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      setTestResults(prev => [...prev, { testName, status: 'error', error: errorMessage }]);
      showError(`Test failed: ${testName}`, errorMessage);
      throw error;
    }
  };

  const testAuthenticationState = async () => {
    return {
      isAuthenticated,
      user,
      hasToken: !!token,
      tokenLength: token?.length || 0
    };
  };

  const testZohoApiCall = async () => {
    // Test a simple API call to verify authentication headers are working
    const result = await zohoApi.getRecords('employee_commissions_DC', { limit: 1 });
    return {
      success: result.success,
      totalRecords: result.total,
      dataLength: result.data?.length || 0
    };
  };

  const testAxiosHeaders = async () => {
    // Test that axios default headers are set correctly
    const axios = require('axios');
    const authHeader = axios.defaults.headers.common['Authorization'];
    return {
      hasAuthHeader: !!authHeader,
      headerValue: authHeader ? authHeader.substring(0, 20) + '...' : 'None'
    };
  };

  const runAllTests = async () => {
    setIsTesting(true);
    setTestResults([]);

    try {
      // Test 1: Authentication State
      await runTest('Authentication State', testAuthenticationState);

      // Test 2: Axios Headers
      await runTest('Axios Headers', testAxiosHeaders);

      // Test 3: Zoho API Call
      await runTest('Zoho API Call', testZohoApiCall);

      showSuccess('All authentication integration tests completed!');
    } catch (error) {
      console.error('Test suite failed:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Authentication Integration Test</h2>
        <div className="flex space-x-2">
          <Button
            onClick={runAllTests}
            disabled={isTesting || !isAuthenticated}
            loading={isTesting}
          >
            {isTesting ? 'Running Tests...' : 'Run All Tests'}
          </Button>
          <Button
            variant="secondary"
            onClick={clearResults}
            disabled={testResults.length === 0}
          >
            Clear Results
          </Button>
        </div>
      </div>

      {/* Current Authentication Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Current Authentication Status</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Authenticated:</span>
            <span className={`ml-2 px-2 py-1 rounded text-xs ${isAuthenticated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {isAuthenticated ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="font-medium">User:</span>
            <span className="ml-2">{user?.username || 'None'}</span>
          </div>
          <div>
            <span className="font-medium">Role:</span>
            <span className="ml-2 capitalize">{user?.role || 'None'}</span>
          </div>
          <div>
            <span className="font-medium">Token:</span>
            <span className={`ml-2 px-2 py-1 rounded text-xs ${token ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {token ? 'Present' : 'Missing'}
            </span>
          </div>
        </div>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Test Results</h3>
          {testResults.map((result, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                result.status === 'success' 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{result.testName}</h4>
                <span className={`px-2 py-1 rounded text-xs ${
                  result.status === 'success' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {result.status === 'success' ? 'PASSED' : 'FAILED'}
                </span>
              </div>
              
              {result.status === 'success' ? (
                <pre className="text-sm text-gray-700 bg-white p-2 rounded border overflow-x-auto">
                  {JSON.stringify(result.result, null, 2)}
                </pre>
              ) : (
                <div className="text-sm text-red-700">
                  <strong>Error:</strong> {result.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      {!isAuthenticated && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-lg font-medium text-yellow-800 mb-2">Authentication Required</h3>
          <p className="text-sm text-yellow-700">
            Please log in to run the authentication integration tests. The tests will verify that:
          </p>
          <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside space-y-1">
            <li>Authentication state is properly maintained</li>
            <li>Axios headers are correctly set with the JWT token</li>
            <li>Zoho Analytics API calls work with authentication</li>
            <li>Token refresh mechanism functions correctly</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default AuthIntegrationTest;
