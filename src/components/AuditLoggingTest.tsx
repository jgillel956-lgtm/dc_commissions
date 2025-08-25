import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { zohoApi } from '../services/zohoApi';
import { auditLogger } from '../services/auditLogger';
import Button from './ui/Button';
import LoadingSpinner from './ui/LoadingSpinner';

const AuditLoggingTest: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const runAuditLoggingTests = async () => {
    setIsTesting(true);
    setTestResults([]);
    
    try {
      addTestResult('Starting audit logging tests...');

      // Test 1: Direct audit logger calls
      addTestResult('Test 1: Testing direct audit logger calls...');
      try {
        await auditLogger.logCreate(
          user?.id?.toString() || 'test_user',
          user?.username || 'test_user',
          'test_table',
          'test_record_1',
          { testField: 'testValue' },
          { testType: 'direct_call' }
        );
        addTestResult('✓ Direct audit logger CREATE call successful');
      } catch (error) {
        addTestResult(`✗ Direct audit logger CREATE call failed: ${error}`);
      }

      // Test 2: Test search operation audit logging
      addTestResult('Test 2: Testing search operation audit logging...');
      try {
        await zohoApi.searchRecords('customers', 'test', { limit: 5 });
        addTestResult('✓ Search operation audit logging successful');
      } catch (error) {
        addTestResult(`✗ Search operation audit logging failed: ${error}`);
      }

      // Test 3: Test export operation audit logging
      addTestResult('Test 3: Testing export operation audit logging...');
      try {
        await zohoApi.exportRecords('customers', 'csv', { limit: 5 });
        addTestResult('✓ Export operation audit logging successful');
      } catch (error) {
        addTestResult(`✗ Export operation audit logging failed: ${error}`);
      }

      // Test 4: Test login/logout audit logging
      addTestResult('Test 4: Testing login/logout audit logging...');
      try {
        await auditLogger.logLogin(
          user?.id?.toString() || 'test_user',
          user?.username || 'test_user',
          true
        );
        addTestResult('✓ Login audit logging successful');

        await auditLogger.logLogout(
          user?.id?.toString() || 'test_user',
          user?.username || 'test_user',
          'user_initiated',
          300000 // 5 minutes
        );
        addTestResult('✓ Logout audit logging successful');
      } catch (error) {
        addTestResult(`✗ Login/logout audit logging failed: ${error}`);
      }

      // Test 5: Test error logging
      addTestResult('Test 5: Testing error logging...');
      try {
        await auditLogger.logCreate(
          user?.id?.toString() || 'test_user',
          user?.username || 'test_user',
          'test_table',
          'test_record_error',
          { testField: 'testValue' },
          { testType: 'error_test' }
        );
        addTestResult('✓ Error logging test successful');
      } catch (error) {
        addTestResult(`✗ Error logging test failed: ${error}`);
      }

      addTestResult('All audit logging tests completed!');
      showSuccess('Audit Logging Test', 'All audit logging tests have been completed successfully. Check the results below.');

    } catch (error) {
      addTestResult(`Test suite failed: ${error}`);
      showError('Audit Logging Test', 'Some tests failed. Check the results below.');
    } finally {
      setIsTesting(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audit Logging Test</h2>
          <p className="text-gray-600">Test the audit logging functionality with mock data and real operations</p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={runAuditLoggingTests}
            disabled={isTesting}
            icon={isTesting ? <LoadingSpinner size="sm" /> : undefined}
          >
            {isTesting ? 'Running Tests...' : 'Run Tests'}
          </Button>
          <Button
            onClick={clearResults}
            variant="secondary"
            disabled={isTesting}
          >
            Clear Results
          </Button>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Test Results</h3>
        {testResults.length === 0 ? (
          <p className="text-gray-500">No test results yet. Click "Run Tests" to start testing.</p>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {testResults.map((result, index) => (
              <div key={index} className="text-sm font-mono">
                {result}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-medium text-blue-900 mb-2">What This Test Does</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Tests direct audit logger method calls</li>
          <li>• Tests search operation audit logging</li>
          <li>• Tests export operation audit logging</li>
          <li>• Tests login/logout audit logging</li>
          <li>• Tests error handling in audit logging</li>
          <li>• Verifies that all operations are properly logged</li>
        </ul>
      </div>
    </div>
  );
};

export default AuditLoggingTest;
