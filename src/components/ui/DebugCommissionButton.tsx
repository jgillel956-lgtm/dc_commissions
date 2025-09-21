import React, { useState } from 'react';
import Button from './Button';
import Tooltip from './Tooltip';
import { Bug, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

interface DebugStatus {
  isRunning: boolean;
  isComplete: boolean;
  success: boolean | null;
  message: string;
  data: any;
}

export const DebugCommissionButton: React.FC = () => {
  const [status, setStatus] = useState<DebugStatus>({
    isRunning: false,
    isComplete: false,
    success: null,
    message: '',
    data: null,
  });

  const getApiUrl = (endpoint: string = '/api/zoho-analytics'): string => {
    return new URL(endpoint, window.location.origin).toString();
  };

  const getHeaders = (): Record<string, string> => {
    return {
      'Content-Type': 'application/json',
      'x-vercel-protection-bypass': 'uecJcaAEY8pr8Gx3d50jRkzybc0ofwkt' // Bypass Vercel protection
    };
  };

  const handleDebugCommission = async () => {
    setStatus({ ...status, isRunning: true, isComplete: false, success: null, message: '' });
    try {
      console.log('🔍 Starting commission mapping debug...');
      const response = await axios.post(getApiUrl(), {
        action: 'debug-commission-mapping',
      }, {
        headers: getHeaders(),
        timeout: 60000 // 60 second timeout
      });

      if (response.data.success) {
        setStatus({
          isRunning: false,
          isComplete: true,
          success: true,
          message: response.data.message,
          data: response.data.data,
        });
        console.log('✅ Debug successful:', response.data);
      } else {
        setStatus({
          isRunning: false,
          isComplete: true,
          success: false,
          message: response.data.message || 'Failed to debug commission mapping',
          data: response.data.data,
        });
        console.error('❌ Debug failed:', response.data);
      }
    } catch (error: any) {
      setStatus({
        isRunning: false,
        isComplete: true,
        success: false,
        message: error.message || 'An unknown error occurred during debugging.',
        data: null,
      });
      console.error('❌ Debug failed:', error);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          status.isComplete && status.success ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
        }`}>
          {status.isComplete && status.success ? <CheckCircle className="h-5 w-5" /> : <Bug className="h-5 w-5" />}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Debug Commission Mapping</h3>
          <p className="text-sm text-gray-600">Compare commission fields between Zoho Analytics and local cache</p>
        </div>
      </div>

      <Tooltip
        content={
          <div className="text-xs">
            <div className="font-semibold mb-1">🔍 Debug Commission Mapping</div>
            <div className="space-y-1">
              <div>• Analyzes commission field values in the cache table</div>
              <div>• Shows sample records for Skip employee</div>
              <div>• Compares employee_commission vs applied_employee_commission_amount</div>
              <div>• Helps identify data mapping issues</div>
            </div>
          </div>
        }
        position="top"
        delay={300}
      >
        <Button
          onClick={handleDebugCommission}
          disabled={status.isRunning}
          size="sm"
          variant="secondary"
          className="flex items-center justify-center gap-2"
        >
          <Bug className="h-4 w-4" />
          {status.isRunning ? 'Debugging...' : '🔍 Debug Commission Mapping'}
        </Button>
      </Tooltip>

      {status.isComplete && (
        <div className={`mt-4 p-4 rounded-md ${status.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          <div className="flex items-start space-x-2">
            {status.success ? <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
            <div className="text-sm">
              <p className="font-medium mb-2">{status.message}</p>
              
              {status.success && status.data && (
                <div className="space-y-3">
                  {/* Summary */}
                  {status.data.summary && (
                    <div className="bg-white p-3 rounded border">
                      <h4 className="font-semibold mb-2">📊 Cache Table Summary</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>Total Records: {status.data.summary.total_records}</div>
                        <div>Skip Records: {status.data.summary.skip_records}</div>
                        <div>Employee Commission &gt; 0: {status.data.summary.records_with_employee_commission}</div>
                        <div>Applied Commission &gt; 0: {status.data.summary.records_with_applied_commission}</div>
                      </div>
                    </div>
                  )}

                  {/* Field Analysis */}
                  {status.data.fieldAnalysis && (
                    <div className="bg-white p-3 rounded border">
                      <h4 className="font-semibold mb-2">🔍 Field Analysis</h4>
                      {status.data.fieldAnalysis.map((field: any, index: number) => (
                        <div key={index} className="mb-2 p-2 bg-gray-50 rounded text-xs">
                          <div className="font-medium">{field.field_name}</div>
                          <div className="grid grid-cols-2 gap-1 mt-1">
                            <div>Non-null: {field.non_null_count}</div>
                            <div>Positive: {field.positive_count}</div>
                            <div>Min: {field.min_value || 'N/A'}</div>
                            <div>Max: {field.max_value || 'N/A'}</div>
                            <div>Avg: {field.avg_value ? field.avg_value.toFixed(2) : 'N/A'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Skip Records */}
                  {status.data.skipRecords && status.data.skipRecords.length > 0 && (
                    <div className="bg-white p-3 rounded border">
                      <h4 className="font-semibold mb-2">👤 Sample Skip Records</h4>
                      <div className="space-y-2">
                        {status.data.skipRecords.map((record: any, index: number) => (
                          <div key={index} className="p-2 bg-gray-50 rounded text-xs">
                            <div className="grid grid-cols-2 gap-1">
                              <div>Employee Commission: {record.employee_commission || 'NULL'}</div>
                              <div>Applied Commission: {record.applied_employee_commission_amount || 'NULL'}</div>
                              <div>Commission Amount: {record.employee_commission_amount || 'NULL'}</div>
                              <div>Source: {record.source_table}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
