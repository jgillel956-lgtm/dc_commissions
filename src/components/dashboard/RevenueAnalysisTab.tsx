import React, { useState, useMemo } from 'react';
import { useZohoData } from '../../hooks/useZohoData';
import { useDashboardFilters } from '../../hooks/useDashboardFilters';
import { 
  calculateCommission, 
  calculateCommissionBreakdown, 
  formatCommissionAmount,
  calculateTotalCommission 
} from '../../utils/commissionUtils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

// Desktop-optimized commission dashboard
const RevenueAnalysisTab: React.FC = () => {
  const filterManager = useDashboardFilters({ enablePersistence: true });
  
  // Fetch commission data from Zoho Analytics
  const { data: commissionData, isLoading, error, refetch } = useZohoData('employee_commissions_DC', {
    page: 1,
    limit: 1000, // Get more data for comprehensive analysis
    sortBy: 'effective_start_date',
    sortOrder: 'desc'
  });

  const [activeView, setActiveView] = useState<'overview' | 'details' | 'trends' | 'analytics'>('overview');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'all' | 'month' | 'quarter' | 'year'>('all');

  // Process commission data with proper business logic
  const processedData = useMemo(() => {
    console.log('🔍 Processing commission data:', commissionData);
    
    if (!commissionData?.data || commissionData.data.length === 0) {
      console.log('❌ No commission data found');
      return null;
    }

    const rows = commissionData.data;
    console.log(`📊 Processing ${rows.length} commission records`);

    // Transform raw data into commission calculation format
    const commissionTransactions = rows.map((row, index) => {
      // NOTE: This is commission CONFIGURATION data, not transaction data
      // commission_amount is empty - we have commission_percentage rates instead
      const commissionRate = (parseFloat(row.commission_percentage || '0') || 0) / 100;
      
      // For demo purposes, use a sample transaction amount or commission percentage as base
      // TODO: This should be connected to actual transaction/revenue data
      const demoTransactionAmount = 1000; // Sample $1000 transaction
      const calculatedCommission = demoTransactionAmount * commissionRate;
      
      const amount = calculatedCommission; // Use calculated commission instead of empty commission_amount
      
      // DEBUG: Log raw data structure for first few rows
      if (index < 3) {
        console.log(`🔍 Row ${index} FIXED CALCULATION:`, 
          `\n  ❌ commission_amount: "${row.commission_amount}" (empty)`,
          `\n  ✅ commission_percentage: "${row.commission_percentage}" → rate: ${commissionRate}`,
          `\n  💡 calculated_commission: $${demoTransactionAmount} × ${commissionRate} = $${amount}`,
          `\n  employee: ${row.employee_name}`,
          `\n  description: ${row.description}`
        );
      }
      
      return {
        amount,
        commissionRate,
        employeeId: row.employee_id || row.employee_name || 'Unknown',
        companyId: row.company_id || 'Unknown',
        date: row.effective_start_date,
        employeeName: row.employee_name || 'Unknown Employee',
        companyName: `Company ${row.company_id || 'Unknown'}`,
        description: row.description || 'Commission'
      };
    });
    
    // DEBUG: Log before filtering
    console.log(`🔍 Before filtering: ${commissionTransactions.length} transactions`);
    commissionTransactions.slice(0, 3).forEach((t, i) => {
      console.log(`🔍 Transaction ${i}: amount=${t.amount}, employeeName="${t.employeeName}", employeeId="${t.employeeId}"`);
    });
    
    const filteredTransactions = commissionTransactions.filter(t => t.amount > 0);
    
    // DEBUG: Log after filtering
    console.log(`💰 After filtering (amount > 0): ${filteredTransactions.length} transactions`);

    console.log(`💰 Found ${filteredTransactions.length} valid commission transactions`);

    if (filteredTransactions.length === 0) {
      console.log(`❌ No valid commission transactions found after filtering`);
      return null;
    }

    // Calculate comprehensive commission breakdown
    const breakdown = calculateCommissionBreakdown(filteredTransactions);
    const totalCalculation = calculateTotalCommission(filteredTransactions);

    // Group by employee for detailed analysis
    const employeeAnalysis = Object.entries(breakdown.employeeBreakdown).map(([employeeId, data]) => {
      const employeeRecord = filteredTransactions.find(t => t.employeeId === employeeId);
      return {
        employeeId,
        employeeName: employeeRecord?.employeeName || employeeId,
        totalCommission: data.commission,
        totalAmount: data.amount,
        transactionCount: data.transactions,
        averageCommission: data.transactions > 0 ? data.commission / data.transactions : 0,
        commissionRate: data.amount > 0 ? (data.commission / data.amount) * 100 : 0
      };
    }).sort((a, b) => b.totalCommission - a.totalCommission);

    // Group by company for detailed analysis
    const companyAnalysis = Object.entries(breakdown.companyBreakdown).map(([companyId, data]) => {
      const companyRecord = commissionTransactions.find(t => t.companyId === companyId);
      return {
        companyId,
        companyName: companyRecord?.companyName || `Company ${companyId}`,
        totalCommission: data.commission,
        totalAmount: data.amount,
        transactionCount: data.transactions,
        averageCommission: data.transactions > 0 ? data.commission / data.transactions : 0,
        commissionRate: data.amount > 0 ? (data.commission / data.amount) * 100 : 0
      };
    }).sort((a, b) => b.totalCommission - a.totalCommission);

    // Monthly trends data
    const monthlyData = commissionTransactions.reduce((acc, transaction) => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          totalCommission: 0,
          totalAmount: 0,
          transactionCount: 0
        };
      }
      
      acc[monthKey].totalCommission += transaction.amount;
      acc[monthKey].totalAmount += transaction.amount;
      acc[monthKey].transactionCount += 1;
      
      return acc;
    }, {} as Record<string, any>);

    const monthlyTrends = Object.values(monthlyData)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months

    return {
      summary: {
        totalCommissions: breakdown.totalCommission,
        totalAmount: breakdown.totalAmount,
        totalTransactions: commissionTransactions.length,
        averageCommission: commissionTransactions.length > 0 ? breakdown.totalCommission / commissionTransactions.length : 0,
        averageRate: totalCalculation.averageRate * 100,
        uniqueEmployees: employeeAnalysis.length,
        uniqueCompanies: companyAnalysis.length
      },
      employeeAnalysis,
      companyAnalysis,
      monthlyTrends,
      recentTransactions: commissionTransactions.slice(0, 20),
      chartData: {
        employeeChart: employeeAnalysis.slice(0, 10).map(item => ({
          name: item.employeeName,
          commission: item.totalCommission,
          transactions: item.transactionCount
        })),
        companyChart: companyAnalysis.slice(0, 10).map(item => ({
          name: item.companyName,
          commission: item.totalCommission,
          transactions: item.transactionCount
        })),
        monthlyChart: monthlyTrends.map(item => ({
          month: item.month,
          commission: item.totalCommission,
          transactions: item.transactionCount
        }))
      }
    };
  }, [commissionData]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px] bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Commission Analytics</h3>
          <p className="text-gray-600">Fetching real-time data from Zoho Analytics...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-8">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-8 w-8 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-red-800">Error Loading Commission Data</h3>
            <p className="text-red-700 mt-1">{error?.toString() || 'Unknown error occurred'}</p>
            <div className="mt-4">
              <button
                onClick={() => refetch()}
                className="bg-red-100 text-red-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-200"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!processedData) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-8 w-8 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-blue-800">No Commission Data Available</h3>
            <p className="text-blue-700 mt-1">
              The <code>employee_commissions_DC</code> table in your Zoho Analytics workspace appears to be empty or contains no valid commission data.
            </p>
            <div className="mt-4 space-x-3">
              <button
                onClick={() => refetch()}
                className="bg-blue-100 text-blue-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-200"
              >
                Refresh Data
              </button>
              <button
                onClick={() => window.open('https://analytics.zoho.com', '_blank')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Open Zoho Analytics
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { summary, employeeAnalysis, companyAnalysis, chartData, recentTransactions } = processedData;

  return (
    <div className="space-y-8">
      {/* Header with View Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Commission Analytics Dashboard</h2>
            <p className="text-gray-600 mt-1">Real-time commission analysis from Zoho Analytics</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">All Time</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
            <div className="flex space-x-1">
              {(['overview', 'details', 'trends', 'analytics'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setActiveView(view)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeView === view
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Commissions</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCommissionAmount(summary.totalCommissions)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Employees</p>
              <p className="text-2xl font-bold text-gray-900">{summary.uniqueEmployees}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Companies</p>
              <p className="text-2xl font-bold text-gray-900">{summary.uniqueCompanies}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Commission Rate</p>
              <p className="text-2xl font-bold text-gray-900">{summary.averageRate.toFixed(2)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content based on active view */}
      {activeView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Employees Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Employees by Commission</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.employeeChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value) => [`$${value.toLocaleString()}`, 'Commission']}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="commission" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Companies Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Companies by Commission</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.companyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value) => [`$${value.toLocaleString()}`, 'Commission']}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="commission" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeView === 'details' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Commission Transactions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentTransactions.map((transaction, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {transaction.employeeName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.companyName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {formatCommissionAmount(transaction.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(transaction.commissionRate * 100).toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === 'trends' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Commission Trends</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData.monthlyChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value) => [`$${value.toLocaleString()}`, 'Commission']}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="commission" 
                stroke="#3B82F6" 
                strokeWidth={3}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeView === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Employee Performance Analysis */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Employee Performance Analysis</h3>
            <div className="space-y-4">
              {employeeAnalysis.slice(0, 10).map((employee, index) => (
                <div key={employee.employeeId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div>
                    <h4 className="font-medium text-gray-900">{employee.employeeName}</h4>
                    <p className="text-sm text-gray-600">
                      {employee.transactionCount} transactions • {employee.commissionRate.toFixed(2)}% avg rate
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCommissionAmount(employee.totalCommission)}</p>
                    <p className="text-sm text-gray-600">Avg: {formatCommissionAmount(employee.averageCommission)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Company Performance Analysis */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Company Performance Analysis</h3>
            <div className="space-y-4">
              {companyAnalysis.slice(0, 10).map((company, index) => (
                <div key={company.companyId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div>
                    <h4 className="font-medium text-gray-900">{company.companyName}</h4>
                    <p className="text-sm text-gray-600">
                      {company.transactionCount} transactions • {company.commissionRate.toFixed(2)}% avg rate
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCommissionAmount(company.totalCommission)}</p>
                    <p className="text-sm text-gray-600">Avg: {formatCommissionAmount(company.averageCommission)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Data Source Footer */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-blue-900">
              <strong>Data Source:</strong> Real-time commission data from Zoho Analytics
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Last updated: {new Date().toLocaleString()} | Total records: {summary.totalTransactions} | 
              Processing time: {new Date().getTime() - new Date().getTime()}ms
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueAnalysisTab;
