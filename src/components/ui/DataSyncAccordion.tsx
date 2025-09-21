import React, { useState } from 'react';
import Accordion from './Accordion';
import { SyncZohoButton } from './SyncZohoButton';
import { FileUploadButton } from './FileUploadButton';
import { MigrationButton } from './MigrationButton';
import { ClearDataButton } from './ClearDataButton';
import { DebugCommissionButton } from './DebugCommissionButton';
import { Database, RefreshCw, Upload, CheckCircle, ArrowRight, Info } from 'lucide-react';

const DataSyncAccordion: React.FC = () => {
  const [syncComplete, setSyncComplete] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  const handleSyncComplete = (success: boolean, data: any) => {
    setSyncComplete(success);
    if (success) {
      console.log('✅ Zoho sync completed:', data);
      window.dispatchEvent(new CustomEvent('zoho-tables-synced', { detail: data }));
    }
  };

  const handleUploadComplete = (success: boolean, data: any) => {
    setUploadComplete(success);
    if (success) {
      console.log('✅ CSV upload completed:', data);
      window.dispatchEvent(new CustomEvent('revenue-data-refreshed', { detail: data }));
    }
  };

  return (
    <Accordion 
      title="Data Synchronization & Management" 
      defaultOpen={false}
      icon={<Database className="h-5 w-5 text-blue-500" />}
    >
      <div className="space-y-6">
        {/* Step 1: Sync All Zoho Data */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              syncComplete ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
            }`}>
              {syncComplete ? <CheckCircle className="h-5 w-5" /> : '1'}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Sync All Zoho Analytics Data</h3>
              <p className="text-sm text-gray-600">Fetch and store data from all Zoho Analytics tables</p>
            </div>
          </div>
          
          <SyncZohoButton onSyncComplete={handleSyncComplete} />
          
          <div className="mt-4 p-4 bg-blue-50 rounded-md">
            <div className="flex items-start space-x-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">What this does:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Syncs revenue data from Zoho Analytics API (last 3 months by default)</li>
                  <li>Updates 7 database tables: company upcharge fees, employee commissions, insurance companies, interchange income, interest revenue, payment modalities, and referral partners</li>
                  <li>Handles schema initialization and status checking automatically</li>
                  <li>Incrementally updates existing data without duplicates</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: CSV Upload (Optional) */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              uploadComplete ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'
            }`}>
              {uploadComplete ? <CheckCircle className="h-5 w-5" /> : '2'}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Upload CSV File (Optional)</h3>
              <p className="text-sm text-gray-600">Manually upload revenue data from CSV files</p>
            </div>
          </div>
          
          <FileUploadButton onUploadComplete={handleUploadComplete} />
          
          <div className="mt-4 p-4 bg-purple-50 rounded-md">
            <div className="flex items-start space-x-2">
              <Info className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-purple-800">
                <p className="font-medium mb-1">When to use this:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>When API sync fails or is unavailable</li>
                  <li>For one-time data imports from exported CSV files</li>
                  <li>To upload historical data not available through API</li>
                  <li>Supports large files with automatic chunking</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Database Migration */}
        <MigrationButton />

        {/* Step 4: Clear Data (Optional) */}
        <ClearDataButton />

        {/* Step 5: Debug Commission Mapping */}
        <DebugCommissionButton />
        
        {/* Quick Database Check */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
              🔍
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Quick Database Check</h3>
              <p className="text-sm text-gray-600">Check what's actually stored in the database</p>
            </div>
          </div>
          
          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/zoho-analytics', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    tableName: 'revenue_master_view_cache',
                    action: 'records',
                    limit: 5
                  })
                });
                const data = await response.json();
                console.log('🔍 Database Records:', data);
                console.log('🔍 Sample Record:', data.data?.[0]);
                console.log('🔍 All Fields in Sample Record:', data.data?.[0] ? Object.keys(data.data[0]) : 'No records');
                console.log('🔍 Commission Fields:', {
                  employee_commission: data.data?.[0]?.employee_commission,
                  applied_employee_commission_amount: data.data?.[0]?.applied_employee_commission_amount,
                  employee_commission_amount: data.data?.[0]?.employee_commission_amount,
                  Employee_Commission: data.data?.[0]?.Employee_Commission
                });
                alert(`Found ${data.total} records. Check console for detailed field analysis.`);
              } catch (error) {
                console.error('❌ Database check failed:', error);
                alert('Database check failed. Check console for details.');
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            🔍 Check Database Records
          </button>
        </div>

        {/* Process Flow Indicator */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                syncComplete ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'
              }`}>
                {syncComplete ? <CheckCircle className="h-5 w-5" /> : '1'}
              </div>
              <span className="text-sm font-medium text-gray-700">Sync Zoho Data</span>
            </div>
            
            <ArrowRight className="h-4 w-4 text-gray-400" />
            
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                uploadComplete ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'
              }`}>
                {uploadComplete ? <CheckCircle className="h-5 w-5" /> : '2'}
              </div>
              <span className="text-sm font-medium text-gray-700">Upload CSV (Optional)</span>
            </div>
          </div>
          
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500">
              <strong>Recommended:</strong> Use Step 1 for regular data sync. Step 2 is only needed for special cases or when API sync fails.
            </p>
          </div>
        </div>
      </div>
    </Accordion>
  );
};

export default DataSyncAccordion;
