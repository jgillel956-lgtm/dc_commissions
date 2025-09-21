import React, { useState } from 'react';
import { RefreshCw, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import Button from './Button';
import axios from 'axios';

interface RefreshStatus {
  isRefreshing: boolean;
  lastRefresh?: string;
  rowCount?: number;
  fetchMethod?: string;
  error?: string;
  progress?: number;
  estimatedTotal?: number;
  syncResult?: {
    recordsInserted: number;
    recordsUpdated: number;
    durationSeconds: number;
  };
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

interface ManualRefreshButtonProps {
  onRefreshComplete?: (success: boolean, data?: any) => void;
  className?: string;
}

export const ManualRefreshButton: React.FC<ManualRefreshButtonProps> = ({
  onRefreshComplete,
  className = ''
}) => {
  const [status, setStatus] = useState<RefreshStatus>({
    isRefreshing: false
  });
  
  const [dateRange, setDateRange] = useState(() => {
    // Default to last 3 months
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
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

  const handleRefresh = async () => {
    setStatus({ isRefreshing: true });

    try {
      console.log('🔄 Starting manual refresh...');
      
      const response = await axios.post(getApiUrl(), {
        tableName: 'revenue_master_view',
        action: 'refresh',
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        syncType: 'incremental'
      }, {
        headers: getHeaders(),
        timeout: 300000 // 5 minute timeout for large datasets (80k rows)
      });

      if (response.data.success) {
        setStatus({
          isRefreshing: false,
          lastRefresh: response.data.timestamp,
          rowCount: response.data.rowCount,
          fetchMethod: response.data.fetchMethod,
          syncResult: response.data.syncResult,
          dateRange: response.data.dateRange
        });

        console.log('✅ Refresh completed successfully:', response.data);
        onRefreshComplete?.(true, response.data);
      } else {
        throw new Error(response.data.details || 'Refresh failed');
      }
    } catch (error: any) {
      console.error('❌ Refresh failed:', error);
      
      setStatus({
        isRefreshing: false,
        error: error.response?.data?.details || error.message || 'Refresh failed'
      });

      onRefreshComplete?.(false, error);
    }
  };

  const handleCsvImport = async () => {
    setStatus({ isRefreshing: true });

    try {
      console.log('📁 Starting CSV import for revenue_master_view');
      
      const response = await axios.post(getApiUrl(), {
        tableName: 'revenue_master_view',
        action: 'import-csv'
      }, {
        headers: getHeaders(),
        timeout: 300000 // 5 minute timeout for large CSV files
      });

      if (response.data.success) {
        setStatus({
          isRefreshing: false,
          lastRefresh: response.data.timestamp,
          rowCount: response.data.syncResult?.recordsInserted + response.data.syncResult?.recordsUpdated || 0,
          fetchMethod: 'csv-import',
          syncResult: response.data.syncResult
        });

        console.log('✅ CSV import completed successfully:', response.data);
        onRefreshComplete?.(true, response.data);
      } else {
        throw new Error(response.data.details || 'CSV import failed');
      }
    } catch (error: any) {
      console.error('❌ CSV import failed:', error);
      
      setStatus({
        isRefreshing: false,
        error: error.response?.data?.details || error.message || 'CSV import failed'
      });

      onRefreshComplete?.(false, error);
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="p-4">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Revenue Master View Data
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleRefresh}
              disabled={status.isRefreshing}
              size="sm"
              variant="secondary"
              className="flex items-center justify-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${status.isRefreshing ? 'animate-spin' : ''}`}
              />
              {status.isRefreshing ? 'Syncing...' : '🔄 Sync Data'}
            </Button>
            <Button
              onClick={handleCsvImport}
              disabled={status.isRefreshing}
              size="sm"
              variant="ghost"
              className="flex items-center justify-center gap-2"
            >
              📁 Import CSV
            </Button>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
          <div className="flex items-center gap-2 text-xs">
            <label className="text-gray-600 dark:text-gray-400">Date Range:</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              disabled={status.isRefreshing}
              className="px-2 py-1 border rounded text-xs"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              disabled={status.isRefreshing}
              className="px-2 py-1 border rounded text-xs"
            />
            <button
              onClick={() => {
                const endDate = new Date();
                const startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 3);
                setDateRange({
                  startDate: startDate.toISOString().split('T')[0],
                  endDate: endDate.toISOString().split('T')[0]
                });
              }}
              disabled={status.isRefreshing}
              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
            >
              Last 3 Months
            </button>
          </div>
        </div>

        <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>Last Updated: {formatTimestamp(status.lastRefresh)}</span>
          </div>

          {status.rowCount && (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>
                {status.rowCount.toLocaleString()} rows via {status.fetchMethod}
                {status.syncResult && (
                  <span className="text-blue-600 ml-2">
                    ({status.syncResult.recordsInserted} new, {status.syncResult.recordsUpdated} updated)
                  </span>
                )}
              </span>
            </div>
          )}

          {status.dateRange && (
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-blue-500" />
              <span>Range: {status.dateRange.startDate} to {status.dateRange.endDate}</span>
            </div>
          )}

          {status.error && (
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3 w-3 text-red-500" />
              <span className="text-red-600 dark:text-red-400">{status.error}</span>
            </div>
          )}

                  {status.isRefreshing && (
                    <div className="space-y-2">
                      <div className="text-blue-600 dark:text-blue-400">
                        Fetching data from Zoho Analytics... This may take up to 5 minutes for large datasets (80k+ rows).
                      </div>
                      {status.progress && status.estimatedTotal && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${Math.min(status.progress, 100)}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  )}
        </div>

        <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
          <p className="text-gray-600 dark:text-gray-400">
            💡 <strong>Tip:</strong> Click "Sync Data" to fetch and store data from Zoho Analytics in the database.
            Use date range to limit data (recommended: last 3 months). Data is incrementally updated.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ManualRefreshButton;
