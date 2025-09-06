import React, { useState, useEffect, useMemo } from 'react';
import { Users, DollarSign, TrendingUp, Calendar, Filter, Download } from 'lucide-react';
import { employeeCommissionService } from '../../services/employeeCommissionService';
import {
  EmployeeEarningsSummary,
  CommissionByPaymentMethod,
  MonthlyCommissionStatement,
  TransactionCommissionDetail,
  EmployeeCommissionKPI,
  EmployeeCommissionByEmployee,
  EmployeeAverageCommissionRate,
  EmployeeCommissionFilters,
  EmployeeReportType
} from '../../types/employeeCommission';
import LoadingSpinner from '../ui/LoadingSpinner';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface EmployeeCommissionDashboardProps {
  className?: string;
}

const EmployeeCommissionDashboard: React.FC<EmployeeCommissionDashboardProps> = ({ className }) => {
  // State management
  const [activeReport, setActiveReport] = useState<EmployeeReportType>(EmployeeReportType.EARNINGS_SUMMARY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [filters, setFilters] = useState<EmployeeCommissionFilters>({
    dateRange: {
      start: format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd'),
      end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    }
  });

  // Data state
  const [earningsSummary, setEarningsSummary] = useState<EmployeeEarningsSummary[]>([]);
  const [commissionByPayment, setCommissionByPayment] = useState<CommissionByPaymentMethod[]>([]);
  const [monthlyStatements, setMonthlyStatements] = useState<MonthlyCommissionStatement[]>([]);
  const [transactionDetails, setTransactionDetails] = useState<TransactionCommissionDetail[]>([]);
  
  // KPI state
  const [totalCommission, setTotalCommission] = useState<EmployeeCommissionKPI>({ total_employee_commission: 0 });
  const [commissionByEmployee, setCommissionByEmployee] = useState<EmployeeCommissionByEmployee[]>([]);
  const [averageRates, setAverageRates] = useState<EmployeeAverageCommissionRate[]>([]);

  // Load data based on active report
  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Always load KPIs
      const [kpiResponse, employeeResponse, rateResponse] = await Promise.all([
        employeeCommissionService.getTotalEmployeeCommission(filters),
        employeeCommissionService.getCommissionByEmployee(filters),
        employeeCommissionService.getAverageCommissionRate(filters)
      ]);

      setTotalCommission(kpiResponse);
      setCommissionByEmployee(employeeResponse);
      setAverageRates(rateResponse);

      // Load specific report data
      switch (activeReport) {
        case EmployeeReportType.EARNINGS_SUMMARY:
          const summaryResponse = await employeeCommissionService.getEmployeeEarningsSummary(filters);
          setEarningsSummary(summaryResponse.data);
          break;

        case EmployeeReportType.COMMISSION_BY_PAYMENT_METHOD:
          const paymentResponse = await employeeCommissionService.getCommissionByPaymentMethod(filters);
          setCommissionByPayment(paymentResponse.data);
          break;

        case EmployeeReportType.MONTHLY_STATEMENTS:
          const monthlyResponse = await employeeCommissionService.getMonthlyCommissionStatements(filters);
          setMonthlyStatements(monthlyResponse.data);
          break;

        case EmployeeReportType.TRANSACTION_DETAILS:
          const detailResponse = await employeeCommissionService.getTransactionCommissionDetail(filters, 100);
          setTransactionDetails(detailResponse.data);
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employee commission data');
      console.error('Error loading employee commission data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeReport, filters]);

  // Memoized calculations
  const kpiStats = useMemo(() => {
    const totalEmployees = commissionByEmployee.length;
    const avgCommissionPerEmployee = totalEmployees > 0 
      ? totalCommission.total_employee_commission / totalEmployees 
      : 0;
    const topPerformer = commissionByEmployee[0]?.employee_name || 'N/A';
    const avgRate = averageRates.reduce((sum, rate) => sum + rate.avg_commission_rate, 0) / (averageRates.length || 1);

    return {
      totalEmployees,
      avgCommissionPerEmployee,
      topPerformer,
      avgRate: Math.round(avgRate * 100) / 100
    };
  }, [totalCommission, commissionByEmployee, averageRates]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (rate: number) => {
    return `${Math.round(rate * 100) / 100}%`;
  };

  // Export functionality
  const exportData = () => {
    let csvContent = '';
    let filename = '';
    
    switch (activeReport) {
      case EmployeeReportType.EARNINGS_SUMMARY:
        filename = `employee_earnings_summary_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        csvContent = 'Employee Name,Total Transactions,Total Commission,Avg Commission,Revenue Base,Commission Rate\\n';
        csvContent += earningsSummary.map(row => 
          `${row.employee_name},${row.total_transactions},${row.total_commission_earned},${row.average_commission_per_transaction},${row.total_revenue_base},${row.average_commission_rate}%`
        ).join('\\n');
        break;
        
      case EmployeeReportType.COMMISSION_BY_PAYMENT_METHOD:
        filename = `commission_by_payment_method_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        csvContent = 'Employee,Payment Method,Transactions,Commission,Avg Commission,Revenue Base,Rate\\n';
        csvContent += commissionByPayment.map(row => 
          `${row.employee_name},${row.payment_method},${row.transaction_count},${row.commission_earned},${row.avg_commission_per_transaction},${row.revenue_base},${row.commission_rate_applied}%`
        ).join('\\n');
        break;
        
      default:
        return;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className={`employee-commission-dashboard ${className || ''}`}>
      {/* Header */}
      <div className="dashboard-header flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-8 h-8 text-blue-600" />
            Employee Commission System
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Complete guide implementation - Multiple employee support with priority-based matching
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={exportData}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <TrendingUp className="w-4 h-4" />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-cards grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="kpi-card bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Commission</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(totalCommission.total_employee_commission)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="kpi-card bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Employees</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {kpiStats.totalEmployees}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="kpi-card bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Top Performer</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {kpiStats.topPerformer}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="kpi-card bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Commission Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatPercentage(kpiStats.avgRate)}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Report Navigation */}
      <div className="report-navigation mb-6">
        <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
          {[
            { key: EmployeeReportType.EARNINGS_SUMMARY, label: 'Earnings Summary' },
            { key: EmployeeReportType.COMMISSION_BY_PAYMENT_METHOD, label: 'By Payment Method' },
            { key: EmployeeReportType.MONTHLY_STATEMENTS, label: 'Monthly Statements' },
            { key: EmployeeReportType.TRANSACTION_DETAILS, label: 'Transaction Details' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveReport(tab.key)}
              className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                activeReport === tab.key
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Report Content */}
      {!loading && !error && (
        <div className="report-content">
          {activeReport === EmployeeReportType.EARNINGS_SUMMARY && (
            <EarningsSummaryReport data={earningsSummary} formatCurrency={formatCurrency} formatPercentage={formatPercentage} />
          )}
          
          {activeReport === EmployeeReportType.COMMISSION_BY_PAYMENT_METHOD && (
            <CommissionByPaymentMethodReport data={commissionByPayment} formatCurrency={formatCurrency} formatPercentage={formatPercentage} />
          )}
          
          {activeReport === EmployeeReportType.MONTHLY_STATEMENTS && (
            <MonthlyStatementsReport data={monthlyStatements} formatCurrency={formatCurrency} />
          )}
          
          {activeReport === EmployeeReportType.TRANSACTION_DETAILS && (
            <TransactionDetailsReport data={transactionDetails} formatCurrency={formatCurrency} />
          )}
        </div>
      )}

      {/* Commission Structure Info */}
      <div className="commission-info mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
          📊 Commission Calculation Formula
        </h3>
        <div className="text-blue-800 dark:text-blue-200">
          <p className="mb-2"><strong>Individual Commission per Employee:</strong></p>
          <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">
            Employee_Commission = (Revenue_After_Operational_Costs × commission_percentage) + commission_amount
          </code>
          <p className="mt-3 text-sm">
            ⚠️ <strong>Multiple Employee Effect:</strong> When multiple employees match the same transaction criteria, 
            each gets their own commission row with the same revenue base but different commission amounts.
          </p>
        </div>
      </div>
    </div>
  );
};

// Report Components
const EarningsSummaryReport: React.FC<{
  data: EmployeeEarningsSummary[];
  formatCurrency: (amount: number) => string;
  formatPercentage: (rate: number) => string;
}> = ({ data, formatCurrency, formatPercentage }) => (
  <div className="earnings-summary-report">
    <h2 className="text-xl font-bold mb-4">Individual Employee Earnings Summary</h2>
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Employee</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Transactions</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total Commission</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Avg Commission</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Revenue Base</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
          {data.map((row, index) => (
            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{row.employee_name}</td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 text-right">{row.total_transactions}</td>
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right font-semibold">
                {formatCurrency(row.total_commission_earned)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 text-right">
                {formatCurrency(row.average_commission_per_transaction)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 text-right">
                {formatCurrency(row.total_revenue_base)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 text-right">
                {formatPercentage(row.average_commission_rate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const CommissionByPaymentMethodReport: React.FC<{
  data: CommissionByPaymentMethod[];
  formatCurrency: (amount: number) => string;
  formatPercentage: (rate: number) => string;
}> = ({ data, formatCurrency, formatPercentage }) => (
  <div className="commission-payment-report">
    <h2 className="text-xl font-bold mb-4">Commission Breakdown by Payment Method</h2>
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Employee</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Payment Method</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Transactions</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Commission</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Avg Commission</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
          {data.map((row, index) => (
            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{row.employee_name}</td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">{row.payment_method}</td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 text-right">{row.transaction_count}</td>
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right font-semibold">
                {formatCurrency(row.commission_earned)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 text-right">
                {formatCurrency(row.avg_commission_per_transaction)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 text-right">
                {formatPercentage(row.commission_rate_applied)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const MonthlyStatementsReport: React.FC<{
  data: MonthlyCommissionStatement[];
  formatCurrency: (amount: number) => string;
}> = ({ data, formatCurrency }) => (
  <div className="monthly-statements-report">
    <h2 className="text-xl font-bold mb-4">Monthly Commission Statements</h2>
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Employee</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Month</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Transactions</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total Commission</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Avg Commission</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Revenue Base</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
          {data.map((row, index) => (
            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{row.employee_name}</td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">{row.commission_month}</td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 text-right">{row.monthly_transactions}</td>
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right font-semibold">
                {formatCurrency(row.monthly_commission_total)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 text-right">
                {formatCurrency(row.avg_commission_per_transaction)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 text-right">
                {formatCurrency(row.monthly_revenue_base)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const TransactionDetailsReport: React.FC<{
  data: TransactionCommissionDetail[];
  formatCurrency: (amount: number) => string;
}> = ({ data, formatCurrency }) => (
  <div className="transaction-details-report">
    <h2 className="text-xl font-bold mb-4">Transaction-Level Commission Detail</h2>
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Employee</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Company</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Payment Method</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Amount</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Commission</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
          {data.map((row, index) => (
            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{row.disbursement_id}</td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{row.employee_name}</td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">{row.company}</td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">{row.payment_method_description}</td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 text-right">
                {formatCurrency(row.transaction_amount)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right font-semibold">
                {formatCurrency(row.commission_earned)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">
                {format(new Date(row.transaction_date), 'MMM dd, yyyy')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default EmployeeCommissionDashboard;