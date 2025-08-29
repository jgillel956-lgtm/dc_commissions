import React, { useState } from 'react';
import { 
  useRevenueAnalytics, 
  useRevenueChartData, 
  useEmployeeCommissionData,
  useCompanyRevenueData,
  usePaymentMethodRevenueData,
  useRefreshRevenueAnalytics,
  useRevenueAnalyticsWithErrorHandling
} from '../../hooks/useRevenueAnalytics';
import { RevenueAnalyticsQueryParams } from '../../types/revenueAnalytics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const RevenueAnalyticsDemo: React.FC = () => {
  const [filters, setFilters] = useState<RevenueAnalyticsQueryParams>({
    page: 1,
    limit: 50,
    filters: {
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
        end: new Date().toISOString().split('T')[0]
      }
    }
  });

  // Main revenue analytics data
  const { 
    data: analyticsData, 
    isLoading: analyticsLoading, 
    error: analyticsError,
    refetch: refetchAnalytics 
  } = useRevenueAnalyticsWithErrorHandling(filters);

  // Chart data
  const { data: chartData, isLoading: chartLoading } = useRevenueChartData(filters);
  
  // Employee commission data
  const { data: employeeData, isLoading: employeeLoading } = useEmployeeCommissionData(filters);
  
  // Company revenue data
  const { data: companyData, isLoading: companyLoading } = useCompanyRevenueData(filters);
  
  // Payment method revenue data
  const { data: paymentMethodData, isLoading: paymentMethodLoading } = usePaymentMethodRevenueData(filters);

  // Refresh functionality
  const { mutate: refreshData, isPending: isRefreshing } = useRefreshRevenueAnalytics();

  const handleRefresh = () => {
    refreshData(filters);
  };

  const handleDateRangeChange = (start: string, end: string) => {
    setFilters(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        dateRange: { start, end }
      }
    }));
  };

  if (analyticsError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Revenue Analytics</h3>
        <p className="text-red-600 mb-4">{analyticsError.message}</p>
        <button
          onClick={() => refetchAnalytics()}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Revenue Analytics Dashboard</h2>
            <p className="text-gray-600">Complex query results from Zoho Analytics</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.filters?.dateRange?.start || ''}
              onChange={(e) => handleDateRangeChange(e.target.value, filters.filters?.dateRange?.end || '')}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.filters?.dateRange?.end || ''}
              onChange={(e) => handleDateRangeChange(filters.filters?.dateRange?.start || '', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {analyticsData?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Revenue</h3>
            <p className="text-2xl font-bold text-green-600">
              ${analyticsData.summary.totalRevenue.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Net Profit</h3>
            <p className="text-2xl font-bold text-blue-600">
              ${analyticsData.summary.netProfit.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Transactions</h3>
            <p className="text-2xl font-bold text-purple-600">
              {analyticsData.summary.totalTransactions.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Avg Revenue/Transaction</h3>
            <p className="text-2xl font-bold text-orange-600">
              ${analyticsData.summary.averageRevenuePerTransaction.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          {chartLoading ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-gray-500">Loading chart data...</p>
            </div>
          ) : chartData && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                <Line type="monotone" dataKey="revenue" stroke="#0088FE" strokeWidth={2} />
                <Line type="monotone" dataKey="profit" stroke="#00C49F" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <p className="text-gray-500">No chart data available</p>
            </div>
          )}
        </div>

        {/* Employee Commission Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Employee Commissions</h3>
          {employeeLoading ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-gray-500">Loading employee data...</p>
            </div>
          ) : employeeData && employeeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={employeeData.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="employee_name" />
                <YAxis />
                <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                <Bar dataKey="total_commission" fill="#8884D8" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <p className="text-gray-500">No employee commission data available</p>
            </div>
          )}
        </div>

        {/* Company Revenue Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Revenue</h3>
          {companyLoading ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-gray-500">Loading company data...</p>
            </div>
          ) : companyData && companyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={companyData.slice(0, 5)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ company, total_revenue }) => `${company}: $${Number(total_revenue).toLocaleString()}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="total_revenue"
                >
                  {companyData.slice(0, 5).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <p className="text-gray-500">No company revenue data available</p>
            </div>
          )}
        </div>

        {/* Payment Method Revenue Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method Revenue</h3>
          {paymentMethodLoading ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-gray-500">Loading payment method data...</p>
            </div>
          ) : paymentMethodData && paymentMethodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={paymentMethodData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="payment_method" />
                <YAxis />
                <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                <Bar dataKey="total_revenue" fill="#FFBB28" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <p className="text-gray-500">No payment method data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Details</h3>
        {analyticsLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-500">Loading transaction data...</p>
          </div>
        ) : analyticsData?.data && analyticsData.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Commission</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Profit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                                 {analyticsData.data.slice(0, 10).map((record) => {
                   // Use the calculated fields from revenue_master_view
                   const grossRevenue = record.Gross_Revenue || 0;
                   const employeeCommission = record.Total_Employee_Commission || 0;
                   const netProfit = record.Net_Profit || 0;
                   
                   return (
                     <tr key={record.id}>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.id}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.company || '-'}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.payment_method_description || '-'}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">${grossRevenue.toLocaleString()}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">${employeeCommission.toLocaleString()}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600">${netProfit.toLocaleString()}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                         {record.created_at ? new Date(record.created_at).toLocaleDateString() : '-'}
                       </td>
                     </tr>
                   );
                 })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-500">No transaction data available</p>
          </div>
        )}
      </div>

      {/* Loading State */}
      {analyticsLoading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading revenue analytics data...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueAnalyticsDemo;
