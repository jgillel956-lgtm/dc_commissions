import React, { useState, useEffect } from 'react';
import { useZohoData } from '../../hooks/useZohoData';
import { useDashboardFilters } from '../../hooks/useDashboardFilters';

const RevenueAnalysisTab: React.FC = () => {
  const filterManager = useDashboardFilters({ enablePersistence: true });
  
  // Use commission data instead of revenue data
  const { data: commissionData, isLoading, error, refetch } = useZohoData('employee_commissions_DC', {
    page: 1,
    limit: 100,
    sortBy: 'effective_start_date',
    sortOrder: 'desc'
  });

  const [activeView, setActiveView] = useState<'overview' | 'details' | 'trends'>('overview');

  // Process commission data to create analytics
  const processedData = React.useMemo(() => {
    console.log('Commission data received:', commissionData);
    
    if (!commissionData?.data || commissionData.data.length === 0) {
      console.log('No commission data found');
      return null;
    }

    const rows = commissionData.data;
    
    // Calculate totals
    const totalCommissions = rows.reduce((sum, row) => {
      const amount = parseFloat(row.commission_amount) || 0;
      return sum + amount;
    }, 0);

    const totalEmployees = new Set(rows.map(row => row.employee_id)).size;
    const totalCompanies = new Set(rows.map(row => row.company_id)).size;

    // Group by company
    const companyBreakdown = rows.reduce((acc, row) => {
      const companyId = row.company_id;
      if (!acc[companyId]) {
        acc[companyId] = { company: companyId, totalCommissions: 0, employeeCount: 0 };
      }
      acc[companyId].totalCommissions += parseFloat(row.commission_amount) || 0;
      acc[companyId].employeeCount += 1;
      return acc;
    }, {} as Record<string, { company: string; totalCommissions: number; employeeCount: number }>);

    // Group by employee
    const employeeBreakdown = rows.reduce((acc, row) => {
      const employeeId = row.employee_id;
      if (!acc[employeeId]) {
        acc[employeeId] = { employee: row.employee_name || employeeId, totalCommissions: 0, commissionCount: 0 };
      }
      acc[employeeId].totalCommissions += parseFloat(row.commission_amount) || 0;
      acc[employeeId].commissionCount += 1;
      return acc;
    }, {} as Record<string, { employee: string; totalCommissions: number; commissionCount: number }>);

    return {
      totalCommissions,
      totalEmployees,
      totalCompanies,
      totalRecords: rows.length,
      averageCommission: totalCommissions / rows.length,
      companyBreakdown: Object.values(companyBreakdown).sort((a: any, b: any) => b.totalCommissions - a.totalCommissions),
      employeeBreakdown: Object.values(employeeBreakdown).sort((a: any, b: any) => b.totalCommissions - a.totalCommissions),
      recentCommissions: rows.slice(0, 10)
    };
  }, [commissionData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">🚀 Fetching fresh dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading commission data</h3>
            <p className="text-sm text-red-700 mt-1">{error?.toString() || 'Unknown error'}</p>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={() => refetch()}
            className="bg-red-100 text-red-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

           if (!processedData) {
           return (
             <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
               <div className="flex items-center">
                 <div className="flex-shrink-0">
                   <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                     <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                   </svg>
                 </div>
                 <div className="ml-3">
                   <h3 className="text-sm font-medium text-blue-800">No commission data found</h3>
                   <p className="text-sm text-blue-700 mt-1">
                     The <code>employee_commissions_DC</code> table in your Zoho Analytics workspace appears to be empty. 
                     Please add some commission data to see analytics here.
                   </p>
                   <div className="mt-3">
                     <button
                       onClick={() => refetch()}
                       className="bg-blue-100 text-blue-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-200"
                     >
                       Refresh Data
                     </button>
                   </div>
                 </div>
               </div>
             </div>
           );
         }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Commission Analysis</h2>
          <p className="text-gray-600">Real-time data from Zoho Analytics</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveView('overview')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              activeView === 'overview'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveView('details')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              activeView === 'details'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveView('trends')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              activeView === 'trends'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Trends
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Commissions</p>
              <p className="text-2xl font-bold text-gray-900">
                ${processedData.totalCommissions.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">
                {processedData.totalEmployees}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Companies</p>
              <p className="text-2xl font-bold text-gray-900">
                {processedData.totalCompanies}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded-md flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Commission</p>
              <p className="text-2xl font-bold text-gray-900">
                ${processedData.averageCommission.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content based on active view */}
      {activeView === 'overview' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Commission Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Commissions by Company</h4>
              <div className="space-y-2">
                {processedData.companyBreakdown.slice(0, 5).map((item: any, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">Company {item.company}</span>
                    <span className="text-sm font-medium text-gray-900">
                      ${item.totalCommissions.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Top Employees</h4>
              <div className="space-y-2">
                {processedData.employeeBreakdown.slice(0, 5).map((item: any, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">{item.employee}</span>
                    <span className="text-sm font-medium text-gray-900">
                      ${item.totalCommissions.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'details' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Commissions</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {processedData.recentCommissions.map((row, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.employee_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Company {row.company_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${parseFloat(row.commission_amount || '0').toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.commission_percentage}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.effective_start_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === 'trends' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Commission Trends</h3>
          <p className="text-gray-600">
            Trend analysis features are being developed. This will include:
          </p>
          <ul className="mt-2 text-gray-600 list-disc list-inside space-y-1">
            <li>Monthly commission trends</li>
            <li>Employee performance analysis</li>
            <li>Company commission patterns</li>
            <li>Commission rate analysis</li>
            <li>Performance comparisons</li>
          </ul>
        </div>
      )}

      {/* Data Source Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800">
              <strong>Data Source:</strong> Real-time commission data from Zoho Analytics
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Last updated: {new Date().toLocaleString()} | Total records: {processedData.totalRecords}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueAnalysisTab;
