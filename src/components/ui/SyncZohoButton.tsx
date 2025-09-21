import React, { useState } from 'react';
import { RefreshCw, Clock, CheckCircle, AlertCircle, Database, Table } from 'lucide-react';
import Button from './Button';
import Tooltip from './Tooltip';
import axios from 'axios';

interface SyncStatus {
  isSyncing: boolean;
  lastSync?: string;
  syncResult?: {
    success: boolean;
    syncType: string;
    totalDuration: number;
    totalFetched: number;
    totalInserted: number;
    totalUpdated: number;
    tableResults: Array<{
      tableName: string;
      recordsFetched: number;
      recordsInserted: number;
      recordsUpdated: number;
      durationSeconds: number;
      error?: string;
    }>;
  };
  error?: string;
  syncStatus?: Record<string, {
    recordCount: number;
    lastUpdated: string;
    error?: string;
  }>;
}

interface SyncZohoButtonProps {
  onSyncComplete?: (success: boolean, data?: any) => void;
  className?: string;
  showStatus?: boolean;
}

export const SyncZohoButton: React.FC<SyncZohoButtonProps> = ({
  onSyncComplete,
  className = '',
  showStatus = true
}) => {
  const [status, setStatus] = useState<SyncStatus>({
    isSyncing: false
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

  const handleSyncAll = async () => {
    setStatus({ isSyncing: true });

    try {
      console.log('🔄 Starting sync for all Zoho tables...');
      
      const response = await axios.post(getApiUrl(), {
        action: 'sync-all-tables',
        syncType: 'full'
      }, {
        headers: getHeaders(),
        timeout: 600000 // 10 minute timeout for all tables
      });

      if (response.data.success) {
        setStatus({
          isSyncing: false,
          lastSync: response.data.timestamp,
          syncResult: response.data.syncResult
        });

        console.log('✅ Sync completed successfully:', response.data);
        
        // Debug: Log detailed sync results for each table
        if (response.data.syncResult?.tableResults) {
          console.log('📊 Detailed sync results:');
          response.data.syncResult.tableResults.forEach((table: any) => {
            console.log(`  ${table.tableName}: ${table.recordsFetched} fetched, ${table.recordsInserted} inserted, ${table.recordsUpdated} updated${table.recordsWithErrors ? `, ${table.recordsWithErrors} errors` : ''}`);
            if (table.error) {
              console.error(`  ❌ ${table.tableName} error:`, table.error);
            }
            
            // Special debugging for employee_commissions_DC
            if (table.tableName === 'employee_commissions_DC') {
              console.log('🔍 Employee Commissions Debug:');
              console.log(`  - Records fetched from Zoho: ${table.recordsFetched}`);
              console.log(`  - Records inserted to DB: ${table.recordsInserted}`);
              console.log(`  - Records updated in DB: ${table.recordsUpdated}`);
              console.log(`  - Missing records: ${table.recordsFetched - table.recordsInserted}`);
              if (table.recordsFetched > table.recordsInserted) {
                console.error(`  ❌ ISSUE: ${table.recordsFetched - table.recordsInserted} records were fetched but not inserted!`);
                console.error(`  ❌ This suggests a data transformation or database insertion problem.`);
                
                // Show error details if available
                if (table.errors && table.errors.length > 0) {
                  console.error(`  ❌ Error Details (first ${table.errors.length} errors):`);
                  table.errors.forEach((error: any, index: number) => {
                    console.error(`    Error ${index + 1}:`, error.error);
                    console.error(`    Row ID:`, error.rowId);
                    console.error(`    Row Data:`, error.rowData);
                  });
                }
              }
            }
          });
        }
        
        onSyncComplete?.(true, response.data);
      } else {
        throw new Error(response.data.details || 'Sync failed');
      }
    } catch (error: any) {
      console.error('❌ Sync failed:', error);
      
      let errorMessage = 'Sync failed';
      if (error.response?.data?.details) {
        errorMessage = error.response.data.details;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setStatus({
        isSyncing: false,
        error: errorMessage
      });

      onSyncComplete?.(false, error);
    }
  };

  const handleGetStatus = async () => {
    try {
      console.log('📊 Getting sync status...');
      
      const response = await axios.post(getApiUrl(), {
        action: 'sync-status'
      }, {
        headers: getHeaders(),
        timeout: 30000
      });

      if (response.data.success) {
        setStatus(prev => ({
          ...prev,
          syncStatus: response.data.syncStatus
        }));
      }
    } catch (error: any) {
      console.error('❌ Failed to get sync status:', error);
    }
  };

  const handleInitSchema = async () => {
    setStatus({ isSyncing: true });

    try {
      console.log('🔧 Initializing database schema...');
      
      const response = await axios.post(getApiUrl(), {
        action: 'init-schema'
      }, {
        headers: getHeaders(),
        timeout: 60000 // 1 minute timeout for schema initialization
      });

      if (response.data.success) {
        setStatus({
          isSyncing: false,
          lastSync: response.data.timestamp,
          syncResult: {
            success: true,
            syncType: 'schema-init',
            totalDuration: 0,
            totalFetched: 0,
            totalInserted: 0,
            totalUpdated: 0,
            tableResults: []
          }
        });

        console.log('✅ Schema initialization completed:', response.data);
        onSyncComplete?.(true, response.data);
      } else {
        throw new Error(response.data.details || 'Schema initialization failed');
      }
    } catch (error: any) {
      console.error('❌ Schema initialization failed:', error);
      
      let errorMessage = 'Schema initialization failed';
      if (error.response?.data?.details) {
        errorMessage = error.response.data.details;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setStatus({
        isSyncing: false,
        error: errorMessage
      });

      onSyncComplete?.(false, error);
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

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const handleImportRevenueMasterView = async () => {
    setStatus({ isSyncing: true });

    try {
      console.log('📁 Starting CSV import for revenue_master_view...');
      
      const response = await axios.post(getApiUrl(), {
        tableName: 'revenue_master_view',
        action: 'import-csv'
      }, {
        headers: getHeaders(),
        timeout: 300000 // 5 minute timeout for CSV import
      });

      if (response.data.success) {
        setStatus({
          isSyncing: false,
          lastSync: response.data.timestamp,
          syncResult: {
            success: true,
            syncType: 'csv-import',
            totalDuration: 0,
            totalFetched: response.data.syncResult?.totalFetched || 0,
            totalInserted: response.data.syncResult?.totalInserted || 0,
            totalUpdated: response.data.syncResult?.totalUpdated || 0,
            tableResults: [{
              tableName: 'revenue_master_view',
              recordsFetched: response.data.syncResult?.totalFetched || 0,
              recordsInserted: response.data.syncResult?.totalInserted || 0,
              recordsUpdated: response.data.syncResult?.totalUpdated || 0,
              durationSeconds: 0
            }]
          }
        });

        console.log('✅ Revenue master view CSV import completed:', response.data);
        onSyncComplete?.(true, response.data);
      } else {
        throw new Error(response.data.error || 'CSV import failed');
      }
    } catch (error: any) {
      console.error('❌ Revenue master view CSV import failed:', error);
      
      let errorMessage = 'CSV import failed';
      if (error.response?.data?.details) {
        errorMessage = error.response.data.details;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setStatus({
        isSyncing: false,
        error: errorMessage
      });
      
      onSyncComplete?.(false, error.response?.data);
    }
  };

  const tableNames = [
    'company_upcharge_fees_DC',
    'employee_commissions_DC',
    'insurance_companies_DC',
    'monthly_interchange_income_DC',
    'monthly_interest_revenue_DC',
    'payment_modalities',
    'referral_partners_DC'
  ];

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="p-4">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
            <Database className="h-4 w-4" />
            Zoho Analytics Tables
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Tooltip
              content={
                <div className="text-xs">
                  <div className="font-semibold mb-1">🔄 Sync All Zoho Analytics Data</div>
                  <div className="space-y-1">
                    <div>• Fetches live data from Zoho Analytics API</div>
                    <div>• Syncs 7 tables: employee commissions, company upcharge fees, insurance companies, interchange income, interest revenue, payment modalities, referral partners</div>
                    <div>• Also syncs revenue data (last 3 months)</div>
                    <div>• Incrementally updates existing data</div>
                    <div>• <strong>Use this for regular data synchronization</strong></div>
                  </div>
                </div>
              }
              position="top"
              delay={300}
            >
              <Button
                onClick={handleSyncAll}
                disabled={status.isSyncing}
                size="sm"
                variant="primary"
                className="flex items-center justify-center gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${status.isSyncing ? 'animate-spin' : ''}`}
                />
                {status.isSyncing ? 'Syncing...' : '🔄 Sync Zoho'}
              </Button>
            </Tooltip>
            
            <Tooltip
              content={
                <div className="text-xs">
                  <div className="font-semibold mb-1">📊 Check Sync Status</div>
                  <div>Shows current record counts and last sync timestamps for all database tables</div>
                </div>
              }
              position="top"
              delay={300}
            >
              <Button
                onClick={handleGetStatus}
                disabled={status.isSyncing}
                size="sm"
                variant="ghost"
                className="flex items-center justify-center gap-2 border border-gray-300"
              >
                📊 Status
              </Button>
            </Tooltip>
            
            <Tooltip
              content={
                <div className="text-xs">
                  <div className="font-semibold mb-1">🔧 Initialize Database Schema</div>
                  <div>Creates all required database tables and indexes. Only needed if tables don't exist or schema has changed.</div>
                </div>
              }
              position="top"
              delay={300}
            >
              <Button
                onClick={handleInitSchema}
                disabled={status.isSyncing}
                size="sm"
                variant="secondary"
                className="flex items-center justify-center gap-2"
              >
                🔧 Init Schema
              </Button>
            </Tooltip>
            
            <Tooltip
              content={
                <div className="text-xs">
                  <div className="font-semibold mb-1">📁 Import CSV File</div>
                  <div className="space-y-1">
                    <div>• Uploads CSV files manually (primarily for revenue_master_view)</div>
                    <div>• Use when API sync fails or is unavailable</div>
                    <div>• Supports large files with automatic chunking</div>
                    <div>• <strong>Use this only when API sync doesn't work</strong></div>
                  </div>
                </div>
              }
              position="top"
              delay={300}
            >
              <Button
                onClick={handleImportRevenueMasterView}
                disabled={status.isSyncing}
                size="sm"
                variant="secondary"
                className="flex items-center justify-center gap-2"
              >
                📁 Import CSV
              </Button>
            </Tooltip>
          </div>
        </div>

        {showStatus && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <Clock className="h-3 w-3" />
              <span>Last Sync: {formatTimestamp(status.lastSync)}</span>
            </div>

            {status.syncResult && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span className="text-green-600 dark:text-green-400">
                    Sync completed in {formatDuration(status.syncResult.totalDuration)}
                  </span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-medium">{status.syncResult.totalFetched.toLocaleString()}</span> fetched,{' '}
                  <span className="font-medium text-blue-600">{status.syncResult.totalInserted.toLocaleString()}</span> inserted,{' '}
                  <span className="font-medium text-orange-600">{status.syncResult.totalUpdated.toLocaleString()}</span> updated
                </div>
              </div>
            )}

            {status.error && (
              <div className="flex items-center gap-2 text-xs">
                <AlertCircle className="h-3 w-3 text-red-500" />
                <span className="text-red-600 dark:text-red-400">{status.error}</span>
              </div>
            )}

            {status.isSyncing && (
              <div className="space-y-2">
                <div className="text-blue-600 dark:text-blue-400 text-xs">
                  Syncing all tables from Zoho Analytics... This may take several minutes.
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Table className="h-3 w-3" />
                  <span>Syncing: {tableNames.join(', ')}</span>
                </div>
              </div>
            )}

            {/* Table Results */}
            {status.syncResult?.tableResults && (
              <div className="mt-3 space-y-1">
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Table Results:</div>
                {status.syncResult.tableResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="font-mono text-gray-600 dark:text-gray-400">
                      {result.tableName.replace('_DC', '').replace(/_/g, ' ')}
                    </span>
                    <div className="flex items-center gap-2">
                      {result.error ? (
                        <span className="text-red-600 dark:text-red-400">Error</span>
                      ) : (
                        <>
                          <span className="text-blue-600">{result.recordsInserted}</span>
                          <span className="text-orange-600">{result.recordsUpdated}</span>
                          <span className="text-gray-500">({formatDuration(result.durationSeconds)})</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Current Status */}
            {status.syncStatus && (
              <div className="mt-3 space-y-1">
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Current Status:</div>
                {Object.entries(status.syncStatus).map(([tableName, tableStatus]) => (
                  <div key={tableName} className="flex items-center justify-between text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="font-mono text-gray-600 dark:text-gray-400">
                      {tableName.replace('_DC', '').replace(/_/g, ' ')}
                    </span>
                    <div className="flex items-center gap-2">
                      {tableStatus.error ? (
                        <span className="text-red-600 dark:text-red-400">Error</span>
                      ) : (
                        <span className="text-green-600">{tableStatus.recordCount.toLocaleString()} records</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
          <p className="text-gray-600 dark:text-gray-400">
            💡 <strong>Sync Zoho:</strong> Fetches and stores data from all Zoho Analytics tables into the database.
            This includes company upcharge fees, employee commissions, insurance companies, interchange income, interest revenue, payment modalities, and referral partners.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SyncZohoButton;
