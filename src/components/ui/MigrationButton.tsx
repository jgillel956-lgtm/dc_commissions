import React, { useState } from 'react';
import Button from './Button';
import Tooltip from './Tooltip';
import { Database, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

interface MigrationStatus {
  isRunning: boolean;
  success: boolean | null;
  message: string;
}

interface MigrationButtonProps {
  onMigrationComplete?: (success: boolean, data: any) => void;
  className?: string;
}

export const MigrationButton: React.FC<MigrationButtonProps> = ({
  onMigrationComplete,
  className = ''
}) => {
  const [status, setStatus] = useState<MigrationStatus>({
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

  const handleMigration = async () => {
    setStatus({ isRunning: true, success: null, message: 'Running migration...' });

    try {
      console.log('🔧 Starting emp_id column migration...');
      
      const response = await axios.post(getApiUrl(), {
        action: 'add-emp-id-column'
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
        
        if (onMigrationComplete) {
          onMigrationComplete(true, response.data);
        }
        
        console.log('✅ Migration completed successfully:', response.data);
      } else {
        setStatus({
          isRunning: false,
          success: false,
          message: response.data.error || 'Migration failed'
        });
        
        if (onMigrationComplete) {
          onMigrationComplete(false, response.data);
        }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Migration failed';
      setStatus({
        isRunning: false,
        success: false,
        message: errorMessage
      });
      
      if (onMigrationComplete) {
        onMigrationComplete(false, { error: errorMessage });
      }
      
      console.error('❌ Migration failed:', error);
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-center space-x-3 mb-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          status.success === true ? 'bg-green-100 text-green-600' : 
          status.success === false ? 'bg-red-100 text-red-600' :
          'bg-yellow-100 text-yellow-600'
        }`}>
          {status.success === true ? <CheckCircle className="h-5 w-5" /> :
           status.success === false ? <AlertCircle className="h-5 w-5" /> :
           status.isRunning ? <Loader2 className="h-5 w-5 animate-spin" /> : 'M'}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Database Migration</h3>
          <p className="text-sm text-gray-600">Add emp_id column to revenue_master_view_cache table</p>
        </div>
      </div>
      
      <Tooltip
        content={
          <div className="text-xs">
            <div className="font-semibold mb-1">🔧 Database Migration</div>
            <div className="space-y-1">
              <div>• Adds emp_id column to revenue_master_view_cache table</div>
              <div>• Creates index for better query performance</div>
              <div>• Required for proper employee data matching</div>
              <div>• <strong>Run this once after schema updates</strong></div>
            </div>
          </div>
        }
        position="top"
        delay={300}
      >
        <Button
          onClick={handleMigration}
          disabled={status.isRunning}
          size="sm"
          variant="secondary"
          className="flex items-center justify-center gap-2"
        >
          <Database className="h-4 w-4" />
          {status.isRunning ? 'Running Migration...' : '🔧 Run Migration'}
        </Button>
      </Tooltip>
      
      {status.message && (
        <div className={`mt-4 p-3 rounded-md text-sm ${
          status.success === true ? 'bg-green-50 text-green-700' :
          status.success === false ? 'bg-red-50 text-red-700' :
          'bg-yellow-50 text-yellow-700'
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
