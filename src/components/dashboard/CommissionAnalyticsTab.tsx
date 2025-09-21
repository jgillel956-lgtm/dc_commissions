import React, { useState, useMemo } from 'react';
import { useZohoData } from '../../hooks/useZohoData';
import { useCommissionCalculator } from '../../hooks/useCommissionCalculator';
import { CommissionData } from '../../services/commissionCalculator';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Calendar, 
  BarChart3, 
  PieChart,
  Download,
  Filter,
  Search
} from 'lucide-react';

interface CommissionAnalyticsTabProps {
  className?: string;
}

const CommissionAnalyticsTab: React.FC<CommissionAnalyticsTabProps> = ({ className = '' }) => {
  // State for filters
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string }>({
    startDate: '',
    endDate: ''
  });
  const [viewMode, setViewMode] = useState<'summary' | 'breakdown' | 'comparison' | 'trends'>('summary');

  // Fetch revenue data
  const { data: revenueData, isLoading: revenueLoading, error: revenueError } = useZohoData('revenue_master_view_cache');

  // Commission calculator hook
  const {
    calculateEmployeeCommissionSummary,
    getEmployeePaymentBreakdown,
    generateEmployeeStatement,
    calculateEmployeeEfficiency,
    compareEmployees,
    getAllEmployees,
    getTopPerformers,
    getCommissionTrends
  } = useCommissionCalculator();

  // Transform revenue data to CommissionData format
  const commissionData: CommissionData[] = useMemo(() => {
    if (!revenueData?.data) return [];
    
    return revenueData.data.map(record => ({
      emp_id: record.emp_id || 0,
      employee_name: record.employee_name || 'Unknown Employee',
      Is_Revenue_Transaction: record.Is_Revenue_Transaction || 0,
      Gross_Revenue: parseFloat(String(record.Gross_Revenue || 0)),
      Revenue_After_Operational_Costs: parseFloat(String(record.Revenue_After_Operational_Costs || 0)),
      applied_employee_commission_percentage: parseFloat(String(record.applied_employee_commission_percentage || 0)),
      applied_employee_commission_amount: parseFloat(String(record.applied_employee_commission_amount || 0)),
      Employee_Commission: parseFloat(String(record.Employee_Commission || 0)),
      payment_method_id: record.payment_method_id || 0,
      company_id: record.company_id || 0,
      created_at: record.created_at || '',
      disbursement_updated_at: record.disbursement_updated_at || ''
    }));
  }, [revenueData]);

  // Get all employees
  const employees = useMemo(() => {
    return getAllEmployees(commissionData);
  }, [commissionData, getAllEmployees]);

  // Calculate selected employee's commission summary
  const employeeSummary = useMemo(() => {
    if (!selectedEmployee) return null;
    return calculateEmployeeCommissionSummary(
      commissionData,
      selectedEmployee,
      dateRange.startDate || undefined,
      dateRange.endDate || undefined
    );
  }, [selectedEmployee, dateRange, commissionData, calculateEmployeeCommissionSummary]);

  // Get payment method breakdown for selected employee
  const paymentBreakdown = useMemo(() => {
    if (!selectedEmployee) return [];
    return getEmployeePaymentBreakdown(
      commissionData,
      selectedEmployee,
      dateRange.startDate || undefined,
      dateRange.endDate || undefined
    );
  }, [selectedEmployee, dateRange, commissionData, getEmployeePaymentBreakdown]);

  // Get employee efficiency metrics
  const efficiencyMetrics = useMemo(() => {
    if (!selectedEmployee) return null;
    return calculateEmployeeEfficiency(
      commissionData,
      selectedEmployee,
      dateRange.startDate || undefined,
      dateRange.endDate || undefined
    );
  }, [selectedEmployee, dateRange, commissionData, calculateEmployeeEfficiency]);

  // Get employee comparison data
  const employeeComparison = useMemo(() => {
    return compareEmployees(
      commissionData,
      dateRange.startDate || undefined,
      dateRange.endDate || undefined
    );
  }, [dateRange, commissionData, compareEmployees]);

  // Get top performers
  const topPerformers = useMemo(() => {
    return getTopPerformers(
      commissionData,
      10,
      dateRange.startDate || undefined,
      dateRange.endDate || undefined
    );
  }, [dateRange, commissionData, getTopPerformers]);

  // Get commission trends for selected employee
  const commissionTrends = useMemo(() => {
    if (!selectedEmployee) return [];
    return getCommissionTrends(commissionData, selectedEmployee, 12);
  }, [selectedEmployee, commissionData, getCommissionTrends]);

  // Loading state
  if (revenueLoading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (revenueError) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Loading Commission Data</h3>
          <p className="text-red-600 text-sm mt-1">{revenueError?.message || 'Unknown error occurred'}</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!commissionData.length) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-yellow-800 font-medium">No Commission Data Available</h3>
          <p className="text-yellow-600 text-sm mt-1">
            Please upload revenue data or sync from Zoho Analytics to view commission analytics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Commission Analytics</h2>
        <p className="text-gray-600">
          Comprehensive commission analysis and reporting for all employees
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Employee Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee
            </label>
            <select
              value={selectedEmployee || ''}
              onChange={(e) => setSelectedEmployee(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Employees</option>
              {employees.map(employee => (
                <option key={employee.empId} value={employee.empId}>
                  {employee.employeeName} ({employee.transactionCount} transactions)
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* View Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              View Mode
            </label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="summary">Summary</option>
              <option value="breakdown">Payment Breakdown</option>
              <option value="comparison">Employee Comparison</option>
              <option value="trends">Trends</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary View */}
      {viewMode === 'summary' && (
        <div className="space-y-6">
          {/* Top Performers */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Top Performers
              </h3>
              <span className="text-sm text-gray-500">
                {dateRange.startDate && dateRange.endDate 
                  ? `${dateRange.startDate} to ${dateRange.endDate}`
                  : 'All Time'
                }
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topPerformers.slice(0, 6).map((employee, index) => (
                <div key={employee.empId} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">#{employee.rank}</span>
                    <span className="text-xs text-gray-500">{employee.totalTransactions} transactions</span>
                  </div>
                  <h4 className="font-semibold text-gray-900">{employee.employeeName}</h4>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Commission:</span>
                      <span className="font-medium">${employee.totalCommission.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Revenue:</span>
                      <span className="font-medium">${employee.totalRevenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Efficiency:</span>
                      <span className="font-medium">{employee.commissionEfficiency.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Employee Summary */}
          {selectedEmployee && employeeSummary && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Employee Summary: {employees.find(e => e.empId === selectedEmployee)?.employeeName}
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <DollarSign className="h-8 w-8 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-600">Total Commission</p>
                      <p className="text-2xl font-bold text-blue-900">${employeeSummary.totalCommission.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <BarChart3 className="h-8 w-8 text-green-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-900">${employeeSummary.totalRevenue.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-purple-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-purple-600">Transactions</p>
                      <p className="text-2xl font-bold text-purple-900">{employeeSummary.totalTransactions}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-orange-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-orange-600">Efficiency</p>
                      <p className="text-2xl font-bold text-orange-900">{employeeSummary.efficiency.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Breakdown View */}
      {viewMode === 'breakdown' && selectedEmployee && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Payment Method Breakdown: {employees.find(e => e.empId === selectedEmployee)?.employeeName}
          </h3>
          
          {paymentBreakdown.length > 0 ? (
            <div className="space-y-4">
              {paymentBreakdown.map((method, index) => (
                <div key={method.payment_method_id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{method.paymentMethodName}</h4>
                    <span className="text-sm text-gray-500">{method.transactionCount} transactions</span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Commission</p>
                      <p className="text-lg font-semibold">${method.totalCommission.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Revenue</p>
                      <p className="text-lg font-semibold">${method.totalRevenue.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Avg Commission</p>
                      <p className="text-lg font-semibold">${method.averageCommission.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Rate</p>
                      <p className="text-lg font-semibold">{method.commissionRate.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No payment method data available for the selected period.</p>
          )}
        </div>
      )}

      {/* Employee Comparison View */}
      {viewMode === 'comparison' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Employee Performance Comparison</h3>
          
          {employeeComparison.employees.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Efficiency</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employeeComparison.employees.map((employee) => (
                    <tr key={employee.empId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{employee.rank}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employee.employeeName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${employee.totalCommission.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${employee.totalRevenue.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employee.totalTransactions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employee.commissionEfficiency.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No employee data available for the selected period.</p>
          )}
        </div>
      )}

      {/* Trends View */}
      {viewMode === 'trends' && selectedEmployee && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Commission Trends: {employees.find(e => e.empId === selectedEmployee)?.employeeName}
          </h3>
          
          {commissionTrends.length > 0 ? (
            <div className="space-y-4">
              {commissionTrends.map((trend, index) => (
                <div key={trend.month} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{trend.month}</h4>
                    <span className="text-sm text-gray-500">{trend.transactions} transactions</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Commission</p>
                      <p className="text-lg font-semibold">${trend.commission.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Revenue</p>
                      <p className="text-lg font-semibold">${trend.revenue.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No trend data available for the selected employee.</p>
          )}
        </div>
      )}

      {/* No Employee Selected */}
      {!selectedEmployee && viewMode !== 'comparison' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Employee</h3>
            <p className="text-gray-500">
              Choose an employee from the dropdown above to view detailed commission analytics.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionAnalyticsTab;
