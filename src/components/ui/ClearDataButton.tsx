import React, { useState } from 'react';
import Button from './Button';
import Tooltip from './Tooltip';
import { Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

interface ClearDataStatus {
  isRunning: boolean;
  success: boolean | null;
  message: string;
}

interface ClearDataButtonProps {
  onClearComplete?: (success: boolean, data: any) => void;
  className?: string;
}

export const ClearDataButton: React.FC<ClearDataButtonProps> = ({
  onClearComplete,
  className = ''
}) => {
  const [status, setStatus] = useState<ClearDataStatus>({
    isRunning: false,
    success: null,
    message: ''
  });

  const getApiUrl = (endpoint: string = '/api/zoho-analytics'): string => {
    return new URL(endpoint, window.location.origin).toString();
  };

  const getHeaders = (): Record<string, string> => {
    return {
      'Content-Type': 'application/json',
      'x-vercel-protection-bypass': 'uecJcaAEY8pr8Gx3d50jRkzybc0ofwkt'
    };
  };

  const handleClearData = async () => {
    setStatus({ isRunning: true, success: null, message: 'Clearing revenue data...' });

    try {
      console.log('🗑️ Starting revenue data clear...');
      
      const response = await axios.post(getApiUrl(), {
        action: 'clear-revenue-data'
      }, {
        headers: getHeaders(),
        timeout: 30000 // 30 second timeout
      });

      if (response.data.success) {
        setStatus({
          isRunning: false,
          success: true,
          message: response.data.message
        });
        
        if (onClearComplete) {
          onClearComplete(true, response.data);
        }
        
        console.log('✅ Data clear completed successfully:', response.data);
      } else {
        setStatus({
          isRunning: false,
          success: false,
          message: response.data.error || 'Data clear failed'
        });
        
        if (onClearComplete) {
          onClearComplete(false, response.data);
        }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Data clear failed';
      setStatus({
        isRunning: false,
        success: false,
        message: errorMessage
      });
      
      if (onClearComplete) {
        onClearComplete(false, { error: errorMessage });
      }
      
      console.error('❌ Data clear failed:', error);
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-center space-x-3 mb-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          status.success === true ? 'bg-green-100 text-green-600' : 
          status.success === false ? 'bg-red-100 text-red-600' :
          'bg-orange-100 text-orange-600'
        }`}>
          {status.success === true ? <CheckCircle className="h-5 w-5" /> :
           status.success === false ? <AlertCircle className="h-5 w-5" /> :
           status.isRunning ? <Loader2 className="h-5 w-5 animate-spin" /> : '🗑️'}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Clear Revenue Data</h3>
          <p className="text-sm text-gray-600">Remove all records from revenue_master_view_cache table</p>
        </div>
      </div>
      
      <Tooltip
        content={
          <div className="text-xs">
            <div className="font-semibold mb-1">🗑️ Clear Revenue Data</div>
            <div className="space-y-1">
              <div>• Removes all records from revenue_master_view_cache table</div>
              <div>• Required before uploading updated CSV with emp_id column</div>
              <div>• This action cannot be undone</div>
              <div>• <strong>Use this before uploading new CSV data</strong></div>
            </div>
          </div>
        }
        position="top"
        delay={300}
      >
        <Button
          onClick={handleClearData}
          disabled={status.isRunning}
          size="sm"
          variant="danger"
          className="flex items-center justify-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          {status.isRunning ? 'Clearing Data...' : '🗑️ Clear Data'}
        </Button>
      </Tooltip>
      
      {status.message && (
        <div className={`mt-4 p-3 rounded-md text-sm ${
          status.success === true ? 'bg-green-50 text-green-700' :
          status.success === false ? 'bg-red-50 text-red-700' :
          'bg-orange-50 text-orange-700'
        }`}>
          <div className="flex items-center gap-2">
            {status.success === true ? <CheckCircle className="h-4 w-4" /> :
             status.success === false ? <AlertCircle className="h-4 w-4" /> :
             <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{status.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};
