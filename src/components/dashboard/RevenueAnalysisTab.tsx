import React, { useMemo, useCallback } from 'react';
import { ResponsiveContainer, ResponsiveText } from '../dashboard/ResponsiveDesign';
import KPIWidget from './KPIWidget';
import ChartContainer from './ChartContainer';
import PieChart from '../charts/PieChart';
import BarChart from '../charts/BarChart';
import LineChart from '../charts/LineChart';
import DataTable from '../charts/DataTable';
import { useRevenueData } from '../../hooks/useRevenueData';
import { useDashboardState } from '../../hooks/useDashboardState';
import { RevenueMasterRecord } from '../../types/dashboard';
import { formatCurrency, formatNumber, formatPercentage } from '../../utils/formatters';

interface RevenueAnalysisTabProps {
  className?: string;
}

interface RevenueKPIs {
  totalRevenue: number;
  totalTransactions: number;
  averageTransactionValue: number;
  payeeFeeRevenue: number;
  payorFeeRevenue: number;
  revenuePerTransaction: number;
  totalCombinedRevenue: number;
  revenueGrowthRate: number;
}

interface RevenueBreakdown {
  payeeFees: number;
  payorFees: number;
  total: number;
}

interface CompanyPerformance {
  company: string;
  totalRevenue: number;
  transactionCount: number;
  averageValue: number;
  revenueShare: number;
}

interface PaymentMethodAnalysis {
  method: string;
  totalRevenue: number;
  transactionCount: number;
  averageValue: number;
  revenueShare: number;
}

interface RevenueTrend {
  date: string;
  revenue: number;
  transactions: number;
  averageValue: number;
}

const RevenueAnalysisTab: React.FC<RevenueAnalysisTabProps> = ({ className = '' }) => {
  const dashboardState = useDashboardState();
  const { fetchData, fetchChartData } = useRevenueData();

  // Calculate KPI metrics from revenue data
  const calculateKPIs = useCallback((data: RevenueMasterRecord[]): RevenueKPIs => {
    if (!data || data.length === 0) {
      return {
        totalRevenue: 0,
        totalTransactions: 0,
        averageTransactionValue: 0,
        payeeFeeRevenue: 0,
        payorFeeRevenue: 0,
        revenuePerTransaction: 0,
        totalCombinedRevenue: 0,
        revenueGrowthRate: 0,
      };
    }

    const totalRevenue = data.reduce((sum, record) => sum + record.Total_Combined_Revenue, 0);
    const totalTransactions = data.length;
    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const payeeFeeRevenue = data.reduce((sum, record) => sum + record.Payee_Fee_Revenue, 0);
    const payorFeeRevenue = data.reduce((sum, record) => sum + record.Payor_Fee_Revenue, 0);
    const revenuePerTransaction = data.reduce((sum, record) => sum + record.Revenue_Per_Transaction, 0) / totalTransactions;
    const totalCombinedRevenue = data.reduce((sum, record) => sum + record.Total_Combined_Revenue, 0);

    // Calculate growth rate (simplified - in real implementation, you'd compare with previous period)
    const revenueGrowthRate = 0; // Placeholder for growth calculation

    return {
      totalRevenue,
      totalTransactions,
      averageTransactionValue,
      payeeFeeRevenue,
      payorFeeRevenue,
      revenuePerTransaction,
      totalCombinedRevenue,
      revenueGrowthRate,
    };
  }, []);

  // Calculate revenue breakdown for pie chart
  const calculateRevenueBreakdown = useCallback((data: RevenueMasterRecord[]): RevenueBreakdown => {
    if (!data || data.length === 0) {
      return { payeeFees: 0, payorFees: 0, total: 0 };
    }

    const payeeFees = data.reduce((sum, record) => sum + record.Payee_Fee_Revenue, 0);
    const payorFees = data.reduce((sum, record) => sum + record.Payor_Fee_Revenue, 0);
    const total = payeeFees + payorFees;

    return { payeeFees, payorFees, total };
  }, []);

  // Calculate company performance data
  const calculateCompanyPerformance = useCallback((data: RevenueMasterRecord[]): CompanyPerformance[] => {
    if (!data || data.length === 0) return [];

    const companyMap = new Map<string, { revenue: number; count: number; totalValue: number }>();

    data.forEach(record => {
      const company = record.company;
      const existing = companyMap.get(company) || { revenue: 0, count: 0, totalValue: 0 };
      
      companyMap.set(company, {
        revenue: existing.revenue + record.Total_Combined_Revenue,
        count: existing.count + 1,
        totalValue: existing.totalValue + record.amount,
      });
    });

    const totalRevenue = data.reduce((sum, record) => sum + record.Total_Combined_Revenue, 0);

    return Array.from(companyMap.entries())
      .map(([company, stats]) => ({
        company,
        totalRevenue: stats.revenue,
        transactionCount: stats.count,
        averageValue: stats.count > 0 ? stats.totalValue / stats.count : 0,
        revenueShare: totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10); // Top 10 companies
  }, []);

  // Calculate payment method analysis
  const calculatePaymentMethodAnalysis = useCallback((data: RevenueMasterRecord[]): PaymentMethodAnalysis[] => {
    if (!data || data.length === 0) return [];

    const methodMap = new Map<string, { revenue: number; count: number; totalValue: number }>();

    data.forEach(record => {
      const method = record.payment_method_description;
      const existing = methodMap.get(method) || { revenue: 0, count: 0, totalValue: 0 };
      
      methodMap.set(method, {
        revenue: existing.revenue + record.Total_Combined_Revenue,
        count: existing.count + 1,
        totalValue: existing.totalValue + record.amount,
      });
    });

    const totalRevenue = data.reduce((sum, record) => sum + record.Total_Combined_Revenue, 0);

    return Array.from(methodMap.entries())
      .map(([method, stats]) => ({
        method,
        totalRevenue: stats.revenue,
        transactionCount: stats.count,
        averageValue: stats.count > 0 ? stats.totalValue / stats.count : 0,
        revenueShare: totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, []);

  // Calculate revenue trends over time
  const calculateRevenueTrends = useCallback((data: RevenueMasterRecord[]): RevenueTrend[] => {
    if (!data || data.length === 0) return [];

    const dateMap = new Map<string, { revenue: number; count: number; totalValue: number }>();

    data.forEach(record => {
      const date = new Date(record.created_at).toISOString().split('T')[0]; // YYYY-MM-DD
      const existing = dateMap.get(date) || { revenue: 0, count: 0, totalValue: 0 };
      
      dateMap.set(date, {
        revenue: existing.revenue + record.Total_Combined_Revenue,
        count: existing.count + 1,
        totalValue: existing.totalValue + record.amount,
      });
    });

    return Array.from(dateMap.entries())
      .map(([date, stats]) => ({
        date,
        revenue: stats.revenue,
        transactions: stats.count,
        averageValue: stats.count > 0 ? stats.totalValue / stats.count : 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30); // Last 30 days
  }, []);

  // Memoized calculations
  const kpis = useMemo(() => calculateKPIs(dashboardState.data), [dashboardState.data, calculateKPIs]);
  const revenueBreakdown = useMemo(() => calculateRevenueBreakdown(dashboardState.data), [dashboardState.data, calculateRevenueBreakdown]);
  const companyPerformance = useMemo(() => calculateCompanyPerformance(dashboardState.data), [dashboardState.data, calculateCompanyPerformance]);
  const paymentMethodAnalysis = useMemo(() => calculatePaymentMethodAnalysis(dashboardState.data), [dashboardState.data, calculatePaymentMethodAnalysis]);
  const revenueTrends = useMemo(() => calculateRevenueTrends(dashboardState.data), [dashboardState.data, calculateRevenueTrends]);

  // Prepare chart data
  const pieChartData = useMemo(() => [
    { name: 'Payee Fees', value: revenueBreakdown.payeeFees, color: '#3B82F6' },
    { name: 'Payor Fees', value: revenueBreakdown.payorFees, color: '#10B981' },
  ], [revenueBreakdown]);

  const companyBarData = useMemo(() => 
    companyPerformance.map(company => ({
      name: company.company,
      value: company.totalRevenue,
      revenue: company.totalRevenue,
      transactions: company.transactionCount,
      averageValue: company.averageValue,
    })), [companyPerformance]);

  const paymentMethodBarData = useMemo(() => 
    paymentMethodAnalysis.map(method => ({
      name: method.method,
      value: method.totalRevenue,
      revenue: method.totalRevenue,
      transactions: method.transactionCount,
      averageValue: method.averageValue,
    })), [paymentMethodAnalysis]);

  const trendLineData = useMemo(() => 
    revenueTrends.map(trend => ({
      name: trend.date,
      value: trend.revenue,
      date: trend.date,
      revenue: trend.revenue,
      transactions: trend.transactions,
      averageValue: trend.averageValue,
    })), [revenueTrends]);

  // Handle chart interactions
  const handlePieChartClick = useCallback((data: any) => {
    console.log('Pie chart clicked:', data);
    // Implement drill-down functionality
  }, []);

  // Handle drill-up navigation
  const handleDrillUp = useCallback((path: string[], parentSegment: string | null) => {
    console.log('Drilling up:', { path, parentSegment });
    // This would return to the previous level
  }, []);

  // Handle bar chart click
  const handleBarChartClick = useCallback((data: any) => {
    console.log('Bar chart clicked:', data);
    // Implement drill-down functionality
  }, []);

  // Handle line chart click
  const handleLineChartClick = useCallback((data: any) => {
    console.log('Line chart clicked:', data);
    // Implement drill-down functionality
  }, []);

  // Handle export functionality
  const handleExport = useCallback((format: 'png' | 'pdf' | 'csv' | 'json') => {
    console.log('Exporting revenue analysis:', format);
    // Implement export functionality
  }, []);

  if (dashboardState.loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (dashboardState.error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading revenue analysis data
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {dashboardState.error}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* KPI Widgets Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIWidget
          title="Total Revenue"
          value={kpis.totalRevenue}
          type="revenue"
          format="currency"
          subtitle="Combined revenue from all sources"
          trend={{
            value: kpis.revenueGrowthRate,
            direction: kpis.revenueGrowthRate >= 0 ? 'up' : 'down',
            percentage: Math.abs(kpis.revenueGrowthRate),
            period: 'vs last period',
            isPositive: kpis.revenueGrowthRate >= 0,
          }}
          showTrend={true}
        />

        <KPIWidget
          title="Total Transactions"
          value={kpis.totalTransactions}
          type="transaction"
          format="number"
          subtitle="Number of processed transactions"
        />

        <KPIWidget
          title="Average Transaction Value"
          value={kpis.averageTransactionValue}
          type="currency"
          format="currency"
          subtitle="Mean transaction amount"
        />

        <KPIWidget
          title="Revenue Per Transaction"
          value={kpis.revenuePerTransaction}
          type="revenue"
          format="currency"
          subtitle="Average revenue per transaction"
        />

        <KPIWidget
          title="Payee Fee Revenue"
          value={kpis.payeeFeeRevenue}
          type="revenue"
          format="currency"
          subtitle="Revenue from payee fees"
        />

        <KPIWidget
          title="Payor Fee Revenue"
          value={kpis.payorFeeRevenue}
          type="revenue"
          format="currency"
          subtitle="Revenue from payor fees"
        />

        <KPIWidget
          title="Total Combined Revenue"
          value={kpis.totalCombinedRevenue}
          type="revenue"
          format="currency"
          subtitle="Total revenue after all calculations"
        />

        <KPIWidget
          title="Revenue Growth Rate"
          value={kpis.revenueGrowthRate}
          type="percentage"
          format="percentage"
          subtitle="Period-over-period growth"
          trend={{
            value: kpis.revenueGrowthRate,
            direction: kpis.revenueGrowthRate >= 0 ? 'up' : 'down',
            percentage: Math.abs(kpis.revenueGrowthRate),
            period: 'vs last period',
            isPositive: kpis.revenueGrowthRate >= 0,
          }}
          showTrend={true}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown Pie Chart */}
        <ChartContainer
          title="Revenue Breakdown"
          subtitle="Payee vs Payor Fee Distribution"
          type="pie"
          size="lg"
          showExport={true}
          onExport={handleExport}
          className="bg-white rounded-lg shadow"
        >
          <PieChart
            data={pieChartData}
            title="Revenue Breakdown"
            subtitle="Payee vs Payor Fee Distribution"
            showLabels={true}
            showPercentage={true}
            showLegend={true}
            legendPosition="bottom"
            onDataPointClick={handlePieChartClick}
            enableDrillDown={true}
            ariaLabel="Revenue breakdown pie chart showing payee and payor fee distribution"
            ariaDescription="Interactive pie chart displaying the breakdown of revenue between payee fees and payor fees"
            customTooltipFormatter={(value, name) => {
              const segment = pieChartData.find(item => item.name === name);
              const percentage = revenueBreakdown.total > 0 ? (value / revenueBreakdown.total) * 100 : 0;
              return [
                `${name}: ${formatCurrency(value)}`,
                `Percentage: ${formatPercentage(percentage, 1)}`,
              ];
            }}
          />
        </ChartContainer>

        {/* Company Performance Bar Chart */}
        <ChartContainer
          title="Top Companies by Revenue"
          subtitle="Revenue performance by company"
          type="bar"
          size="lg"
          showExport={true}
          onExport={handleExport}
          className="bg-white rounded-lg shadow"
        >
          <BarChart
            data={companyBarData}
            title="Top Companies by Revenue"
            subtitle="Revenue performance by company"
            xAxisDataKey="name"
            yAxisDataKey="revenue"
            showLegend={true}
            onDataPointClick={handleBarChartClick}
            enableDrillDown={true}
            ariaLabel="Bar chart showing top companies by revenue"
            ariaDescription="Interactive bar chart displaying revenue performance for top companies"
          />
        </ChartContainer>
      </div>

      {/* Additional Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Method Analysis */}
        <ChartContainer
          title="Payment Method Analysis"
          subtitle="Revenue by payment method"
          type="bar"
          size="lg"
          showExport={true}
          onExport={handleExport}
          className="bg-white rounded-lg shadow"
        >
          <BarChart
            data={paymentMethodBarData}
            title="Payment Method Analysis"
            subtitle="Revenue by payment method"
            xAxisDataKey="name"
            yAxisDataKey="revenue"
            showLegend={true}
            onDataPointClick={handleBarChartClick}
            enableDrillDown={true}
            ariaLabel="Bar chart showing revenue by payment method"
            ariaDescription="Interactive bar chart displaying revenue breakdown by payment method"
          />
        </ChartContainer>

        {/* Revenue Trends Line Chart */}
        <ChartContainer
          title="Revenue Trends"
          subtitle="Daily revenue over time"
          type="line"
          size="lg"
          showExport={true}
          onExport={handleExport}
          className="bg-white rounded-lg shadow"
        >
          <LineChart
            data={trendLineData}
            title="Revenue Trends"
            subtitle="Daily revenue over time"
            xAxisDataKey="date"
            yAxisDataKey="revenue"
            showLegend={true}
            onDataPointClick={handleLineChartClick}
            enableDrillDown={true}
            ariaLabel="Line chart showing revenue trends over time"
            ariaDescription="Interactive line chart displaying daily revenue trends"
          />
        </ChartContainer>
      </div>

      {/* Company Performance Table */}
      <ChartContainer
        title="Company Performance Details"
        subtitle="Detailed breakdown of company performance metrics"
        type="table"
        size="xl"
        showExport={true}
        onExport={handleExport}
        className="bg-white rounded-lg shadow"
      >
        <DataTable
          data={companyPerformance}
          columns={[
            {
              key: 'company',
              header: 'Company',
              sortable: true,
              render: (value: string) => <span className="font-medium text-gray-900">{value}</span>,
            },
            {
              key: 'totalRevenue',
              header: 'Total Revenue',
              sortable: true,
              render: (value: number) => <span className="text-green-600 font-medium">{formatCurrency(value)}</span>,
            },
            {
              key: 'transactionCount',
              header: 'Transactions',
              sortable: true,
              render: (value: number) => <span className="text-gray-600">{formatNumber(value)}</span>,
            },
            {
              key: 'transactionVolume',
              header: 'Transaction Volume',
              sortable: true,
              render: (value: number) => <span className="text-purple-600 font-medium">{formatCurrency(value)}</span>,
            },
            {
              key: 'averageValue',
              header: 'Avg. Transaction',
              sortable: true,
              render: (value: number) => <span className="text-gray-600">{formatCurrency(value)}</span>,
            },
            {
              key: 'averageRevenuePerTransaction',
              header: 'Avg. Revenue/Transaction',
              sortable: true,
              render: (value: number) => <span className="text-blue-600 font-medium">{formatCurrency(value)}</span>,
            },
            {
              key: 'revenueShare',
              header: 'Revenue Share',
              sortable: true,
              render: (value: number) => <span className="text-indigo-600 font-medium">{formatPercentage(value)}</span>,
            },
            {
              key: 'revenueEfficiency',
              header: 'Revenue Efficiency',
              sortable: true,
              render: (value: number) => (
                <span className={`font-medium ${value >= 5 ? 'text-green-600' : value >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {formatPercentage(value)}
                </span>
              ),
            },
            {
              key: 'payeeFeeRevenue',
              header: 'Payee Fees',
              sortable: true,
              render: (value: number) => <span className="text-blue-500">{formatCurrency(value)}</span>,
            },
            {
              key: 'payorFeeRevenue',
              header: 'Payor Fees',
              sortable: true,
              render: (value: number) => <span className="text-green-500">{formatCurrency(value)}</span>,
            },
            {
              key: 'additionalCharges',
              header: 'Additional Charges',
              sortable: true,
              render: (value: number) => <span className="text-orange-500">{formatCurrency(value)}</span>,
            },
            {
              key: 'firstTransactionDate',
              header: 'First Transaction',
              sortable: true,
              render: (value: string) => <span className="text-gray-600 text-sm">{value}</span>,
            },
            {
              key: 'lastTransactionDate',
              header: 'Last Transaction',
              sortable: true,
              render: (value: string) => <span className="text-gray-600 text-sm">{value}</span>,
            },
          ]}
          sortable={true}
          searchable={true}
          pagination={true}
          pageSize={15}
          ariaLabel="Company performance analysis data table"
          ariaDescription="Comprehensive sortable and searchable table showing detailed company performance metrics including revenue breakdown, transaction analysis, and efficiency indicators"
        />
      </ChartContainer>
    </div>
  );
};

export default RevenueAnalysisTab;

