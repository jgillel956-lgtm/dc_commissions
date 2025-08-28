import React, { useMemo, useCallback } from 'react';
import { useDashboardState } from '../../hooks/useDashboardState';
import { RevenueMasterRecord } from '../../types/dashboard';
import KPIWidget from './KPIWidget';
import ChartContainer from './ChartContainer';
import PieChart from '../charts/PieChart';
import BarChart from '../charts/BarChart';
import LineChart from '../charts/LineChart';
import DataTable from '../charts/DataTable';
import { formatCurrency, formatNumber, formatPercentage } from '../../utils/formatters';

interface CommissionKPIs {
  totalRevenue: number;
  totalVendorCosts: number;
  revenueAfterUpcharges: number;
  revenueAfterOperationalCosts: number;
  totalEmployeeCommissions: number;
  totalReferralCommissions: number;
  finalNetProfit: number;
  profitMargin: number;
  commissionEfficiency: number;
  averageCommissionRate: number;
}

interface CommissionBreakdown {
  employeeCommissions: number;
  referralCommissions: number;
  totalCommissions: number;
  revenueAfterCommissions: number;
}

interface FinancialWaterfall {
  grossRevenue: number;
  vendorCosts: number;
  upchargeFees: number;
  operationalCosts: number;
  employeeCommissions: number;
  referralCommissions: number;
  netProfit: number;
}

interface EmployeeCommissionAnalysis {
  employee: string;
  totalCommission: number;
  transactionCount: number;
  averageCommission: number;
  commissionRate: number;
  revenueGenerated: number;
  commissionEfficiency: number;
}

interface ReferralPartnerAnalysis {
  partner: string;
  partnerType: string;
  totalCommission: number;
  transactionCount: number;
  averageCommission: number;
  commissionRate: number;
  revenueGenerated: number;
  commissionEfficiency: number;
}

interface CommissionTrends {
  daily: CommissionTrend[];
  weekly: CommissionTrend[];
  monthly: CommissionTrend[];
  summary: CommissionTrendSummary;
}

interface CommissionTrend {
  date: string;
  totalCommissions: number;
  employeeCommissions: number;
  referralCommissions: number;
  transactionCount: number;
  averageCommission: number;
  commissionGrowth: number;
  transactionGrowth: number;
  movingAverage: number;
  cumulativeCommissions: number;
  commissionEfficiency: number;
  period: 'daily' | 'weekly' | 'monthly';
}

interface CommissionTrendSummary {
  totalCommissions: number;
  totalTransactions: number;
  averageDailyCommissions: number;
  averageMonthlyCommissions: number;
  commissionGrowthRate: number;
  transactionGrowthRate: number;
  bestDay: string;
  worstDay: string;
  bestMonth: string;
  worstMonth: string;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  seasonalPattern: string;
}

interface CommissionAnalysisTabProps {
  className?: string;
}

const CommissionAnalysisTab: React.FC<CommissionAnalysisTabProps> = ({ className = '' }) => {
  const dashboardState = useDashboardState('commission');

  // Calculate commission KPIs
  const commissionKPIs = useMemo((): CommissionKPIs => {
    if (!dashboardState.data || dashboardState.data.length === 0) {
      return {
        totalRevenue: 0,
        totalVendorCosts: 0,
        revenueAfterUpcharges: 0,
        revenueAfterOperationalCosts: 0,
        totalEmployeeCommissions: 0,
        totalReferralCommissions: 0,
        finalNetProfit: 0,
        profitMargin: 0,
        commissionEfficiency: 0,
        averageCommissionRate: 0,
      };
    }

    const data = dashboardState.data as RevenueMasterRecord[];
    
    const totalRevenue = data.reduce((sum, record) => sum + record.Total_Combined_Revenue, 0);
    const totalVendorCosts = data.reduce((sum, record) => sum + record.Total_Vendor_Cost, 0);
    const revenueAfterUpcharges = data.reduce((sum, record) => sum + record.Revenue_After_Upcharges, 0);
    const revenueAfterOperationalCosts = data.reduce((sum, record) => sum + record.Revenue_After_Operational_Costs, 0);
    const totalEmployeeCommissions = data.reduce((sum, record) => sum + record.Employee_Commission, 0);
    const totalReferralCommissions = data.reduce((sum, record) => sum + record.Referral_Partner_Commission, 0);
    const finalNetProfit = data.reduce((sum, record) => sum + record.Final_Net_Profit, 0);

    const profitMargin = totalRevenue > 0 ? (finalNetProfit / totalRevenue) * 100 : 0;
    const commissionEfficiency = totalRevenue > 0 ? ((totalEmployeeCommissions + totalReferralCommissions) / totalRevenue) * 100 : 0;
    const averageCommissionRate = data.length > 0 ? 
      data.reduce((sum, record) => sum + record.applied_employee_commission_percentage + record.applied_referral_rate, 0) / data.length : 0;

    return {
      totalRevenue,
      totalVendorCosts,
      revenueAfterUpcharges,
      revenueAfterOperationalCosts,
      totalEmployeeCommissions,
      totalReferralCommissions,
      finalNetProfit,
      profitMargin,
      commissionEfficiency,
      averageCommissionRate,
    };
  }, [dashboardState.data]);

  // Calculate commission breakdown
  const commissionBreakdown = useMemo((): CommissionBreakdown => {
    if (!dashboardState.data || dashboardState.data.length === 0) {
      return {
        employeeCommissions: 0,
        referralCommissions: 0,
        totalCommissions: 0,
        revenueAfterCommissions: 0,
      };
    }

    const data = dashboardState.data as RevenueMasterRecord[];
    
    const employeeCommissions = data.reduce((sum, record) => sum + record.Employee_Commission, 0);
    const referralCommissions = data.reduce((sum, record) => sum + record.Referral_Partner_Commission, 0);
    const totalCommissions = employeeCommissions + referralCommissions;
    const revenueAfterCommissions = data.reduce((sum, record) => sum + record.Revenue_After_Employee_Commission, 0);

    return {
      employeeCommissions,
      referralCommissions,
      totalCommissions,
      revenueAfterCommissions,
    };
  }, [dashboardState.data]);

  // Calculate financial waterfall
  const financialWaterfall = useMemo((): FinancialWaterfall => {
    if (!dashboardState.data || dashboardState.data.length === 0) {
      return {
        grossRevenue: 0,
        vendorCosts: 0,
        upchargeFees: 0,
        operationalCosts: 0,
        employeeCommissions: 0,
        referralCommissions: 0,
        netProfit: 0,
      };
    }

    const data = dashboardState.data as RevenueMasterRecord[];
    
    const grossRevenue = data.reduce((sum, record) => sum + record.Gross_Revenue, 0);
    const vendorCosts = data.reduce((sum, record) => sum + record.Total_Vendor_Cost, 0);
    const upchargeFees = data.reduce((sum, record) => sum + record.Company_Upcharge_Fees, 0);
    const operationalCosts = grossRevenue - data.reduce((sum, record) => sum + record.Revenue_After_Operational_Costs, 0);
    const employeeCommissions = data.reduce((sum, record) => sum + record.Employee_Commission, 0);
    const referralCommissions = data.reduce((sum, record) => sum + record.Referral_Partner_Commission, 0);
    const netProfit = data.reduce((sum, record) => sum + record.Final_Net_Profit, 0);

    return {
      grossRevenue,
      vendorCosts,
      upchargeFees,
      operationalCosts,
      employeeCommissions,
      referralCommissions,
      netProfit,
    };
  }, [dashboardState.data]);

  // Calculate employee commission analysis
  const employeeCommissionAnalysis = useMemo((): EmployeeCommissionAnalysis[] => {
    if (!dashboardState.data || dashboardState.data.length === 0) {
      return [];
    }

    const data = dashboardState.data as RevenueMasterRecord[];
    const employeeMap = new Map<string, {
      totalCommission: number;
      transactionCount: number;
      revenueGenerated: number;
    }>();

    data.forEach(record => {
      if (record.employee_name) {
        const existing = employeeMap.get(record.employee_name) || {
          totalCommission: 0,
          transactionCount: 0,
          revenueGenerated: 0,
        };

        employeeMap.set(record.employee_name, {
          totalCommission: existing.totalCommission + record.Employee_Commission,
          transactionCount: existing.transactionCount + 1,
          revenueGenerated: existing.revenueGenerated + record.Total_Combined_Revenue,
        });
      }
    });

    return Array.from(employeeMap.entries())
      .map(([employee, stats]) => ({
        employee,
        totalCommission: stats.totalCommission,
        transactionCount: stats.transactionCount,
        averageCommission: stats.transactionCount > 0 ? stats.totalCommission / stats.transactionCount : 0,
        commissionRate: stats.revenueGenerated > 0 ? (stats.totalCommission / stats.revenueGenerated) * 100 : 0,
        revenueGenerated: stats.revenueGenerated,
        commissionEfficiency: stats.revenueGenerated > 0 ? (stats.totalCommission / stats.revenueGenerated) * 100 : 0,
      }))
      .sort((a, b) => b.totalCommission - a.totalCommission);
  }, [dashboardState.data]);

  // Calculate referral partner analysis
  const referralPartnerAnalysis = useMemo((): ReferralPartnerAnalysis[] => {
    if (!dashboardState.data || dashboardState.data.length === 0) {
      return [];
    }

    const data = dashboardState.data as RevenueMasterRecord[];
    const partnerMap = new Map<string, {
      partnerType: string;
      totalCommission: number;
      transactionCount: number;
      revenueGenerated: number;
    }>();

    data.forEach(record => {
      if (record.referral_partner_name) {
        const key = `${record.referral_partner_name}-${record.referral_partner_type}`;
        const existing = partnerMap.get(key) || {
          partnerType: record.referral_partner_type || 'Unknown',
          totalCommission: 0,
          transactionCount: 0,
          revenueGenerated: 0,
        };

        partnerMap.set(key, {
          partnerType: existing.partnerType,
          totalCommission: existing.totalCommission + record.Referral_Partner_Commission,
          transactionCount: existing.transactionCount + 1,
          revenueGenerated: existing.revenueGenerated + record.Total_Combined_Revenue,
        });
      }
    });

    return Array.from(partnerMap.entries())
      .map(([key, stats]) => {
        const [partner] = key.split('-');
        return {
          partner,
          partnerType: stats.partnerType,
          totalCommission: stats.totalCommission,
          transactionCount: stats.transactionCount,
          averageCommission: stats.transactionCount > 0 ? stats.totalCommission / stats.transactionCount : 0,
          commissionRate: stats.revenueGenerated > 0 ? (stats.totalCommission / stats.revenueGenerated) * 100 : 0,
          revenueGenerated: stats.revenueGenerated,
          commissionEfficiency: stats.revenueGenerated > 0 ? (stats.totalCommission / stats.revenueGenerated) * 100 : 0,
        };
      })
      .sort((a, b) => b.totalCommission - a.totalCommission);
  }, [dashboardState.data]);

  // Calculate commission trends
  const commissionTrends = useMemo((): CommissionTrends => {
    if (!dashboardState.data || dashboardState.data.length === 0) {
      return {
        daily: [],
        weekly: [],
        monthly: [],
        summary: {
          totalCommissions: 0,
          totalTransactions: 0,
          averageDailyCommissions: 0,
          averageMonthlyCommissions: 0,
          commissionGrowthRate: 0,
          transactionGrowthRate: 0,
          bestDay: '',
          worstDay: '',
          bestMonth: '',
          worstMonth: '',
          trendDirection: 'stable',
          seasonalPattern: 'No pattern detected',
        },
      };
    }

    const data = dashboardState.data as RevenueMasterRecord[];
    
    // Group by date
    const dailyMap = new Map<string, {
      totalCommissions: number;
      employeeCommissions: number;
      referralCommissions: number;
      transactionCount: number;
    }>();

    data.forEach(record => {
      const date = new Date(record.created_at).toISOString().split('T')[0];
      const existing = dailyMap.get(date) || {
        totalCommissions: 0,
        employeeCommissions: 0,
        referralCommissions: 0,
        transactionCount: 0,
      };

      dailyMap.set(date, {
        totalCommissions: existing.totalCommissions + record.Employee_Commission + record.Referral_Partner_Commission,
        employeeCommissions: existing.employeeCommissions + record.Employee_Commission,
        referralCommissions: existing.referralCommissions + record.Referral_Partner_Commission,
        transactionCount: existing.transactionCount + 1,
      });
    });

    const dailyTrends: CommissionTrend[] = Array.from(dailyMap.entries())
      .map(([date, stats]) => ({
        date,
        totalCommissions: stats.totalCommissions,
        employeeCommissions: stats.employeeCommissions,
        referralCommissions: stats.referralCommissions,
        transactionCount: stats.transactionCount,
        averageCommission: stats.transactionCount > 0 ? stats.totalCommissions / stats.transactionCount : 0,
        commissionGrowth: 0, // Would need historical data for growth calculation
        transactionGrowth: 0,
        movingAverage: 0,
        cumulativeCommissions: 0,
        commissionEfficiency: 0,
        period: 'daily' as const,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate cumulative commissions
    let cumulative = 0;
    dailyTrends.forEach(trend => {
      cumulative += trend.totalCommissions;
      trend.cumulativeCommissions = cumulative;
    });

    // Calculate summary statistics
    const totalCommissions = dailyTrends.reduce((sum, trend) => sum + trend.totalCommissions, 0);
    const totalTransactions = dailyTrends.reduce((sum, trend) => sum + trend.transactionCount, 0);
    const averageDailyCommissions = dailyTrends.length > 0 ? totalCommissions / dailyTrends.length : 0;
    
    const bestDay = dailyTrends.length > 0 ? 
      dailyTrends.reduce((best, current) => current.totalCommissions > best.totalCommissions ? current : best).date : '';
    const worstDay = dailyTrends.length > 0 ? 
      dailyTrends.reduce((worst, current) => current.totalCommissions < worst.totalCommissions ? current : worst).date : '';

    return {
      daily: dailyTrends,
      weekly: [], // Would need weekly aggregation logic
      monthly: [], // Would need monthly aggregation logic
      summary: {
        totalCommissions,
        totalTransactions,
        averageDailyCommissions,
        averageMonthlyCommissions: averageDailyCommissions * 30, // Rough estimate
        commissionGrowthRate: 0, // Would need historical data
        transactionGrowthRate: 0,
        bestDay,
        worstDay,
        bestMonth: '',
        worstMonth: '',
        trendDirection: dailyTrends.length > 1 ? 
          (dailyTrends[dailyTrends.length - 1].totalCommissions > dailyTrends[dailyTrends.length - 2].totalCommissions ? 'increasing' : 'decreasing') : 'stable',
        seasonalPattern: 'No pattern detected',
      },
    };
  }, [dashboardState.data]);

  // Handle export functionality
  const handleExport = useCallback((format: 'png' | 'pdf' | 'csv' | 'json') => {
    console.log('Exporting commission analysis:', format);
    // Implement export functionality
  }, []);

  if (dashboardState.loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
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
                Error loading commission analysis data
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
    <div className={`space-y-4 sm:space-y-6 ${className}`}>
      {/* Commission KPI Widgets Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3 sm:gap-4">
        <KPIWidget
          title="Total Revenue"
          value={commissionKPIs.totalRevenue}
          type="revenue"
          format="currency"
          subtitle="Gross revenue before costs"
          className="min-h-[120px] sm:min-h-[140px]"
        />

        <KPIWidget
          title="Total Vendor Costs"
          value={commissionKPIs.totalVendorCosts}
          type="currency"
          format="currency"
          subtitle="Direct vendor costs"
          className="min-h-[120px] sm:min-h-[140px]"
        />

        <KPIWidget
          title="Revenue After Upcharges"
          value={commissionKPIs.revenueAfterUpcharges}
          type="revenue"
          format="currency"
          subtitle="Revenue after company upcharges"
          className="min-h-[120px] sm:min-h-[140px]"
        />

        <KPIWidget
          title="Total Employee Commissions"
          value={commissionKPIs.totalEmployeeCommissions}
          type="commission"
          format="currency"
          subtitle="Employee commission payments"
          className="min-h-[120px] sm:min-h-[140px]"
        />

        <KPIWidget
          title="Total Referral Commissions"
          value={commissionKPIs.totalReferralCommissions}
          type="commission"
          format="currency"
          subtitle="Referral partner commission payments"
          className="min-h-[120px] sm:min-h-[140px]"
        />

        <KPIWidget
          title="Final Net Profit"
          value={commissionKPIs.finalNetProfit}
          type="profit"
          format="currency"
          subtitle="Net profit after all costs and commissions"
          trend={{
            value: commissionKPIs.profitMargin,
            direction: commissionKPIs.profitMargin >= 0 ? 'up' : 'down',
            percentage: Math.abs(commissionKPIs.profitMargin),
            period: 'profit margin',
            isPositive: commissionKPIs.profitMargin >= 0,
          }}
          showTrend={true}
          className="min-h-[120px] sm:min-h-[140px]"
        />
      </div>

      {/* Financial Waterfall Chart */}
      <ChartContainer
        title="Financial Waterfall Analysis"
        subtitle="Complete cost breakdown from gross revenue to net profit"
        type="waterfall"
        size="xl"
        showExport={true}
        onExport={handleExport}
        className="bg-white rounded-lg shadow min-h-[500px] sm:min-h-[600px]"
      >
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
              <span className="font-medium text-green-800">Gross Revenue</span>
              <span className="font-bold text-green-800">{formatCurrency(financialWaterfall.grossRevenue)}</span>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
              <span className="font-medium text-red-800">Vendor Costs</span>
              <span className="font-bold text-red-800">-{formatCurrency(financialWaterfall.vendorCosts)}</span>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
              <span className="font-medium text-blue-800">Company Upcharges</span>
              <span className="font-bold text-blue-800">+{formatCurrency(financialWaterfall.upchargeFees)}</span>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg">
              <span className="font-medium text-orange-800">Operational Costs</span>
              <span className="font-bold text-orange-800">-{formatCurrency(financialWaterfall.operationalCosts)}</span>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg">
              <span className="font-medium text-purple-800">Employee Commissions</span>
              <span className="font-bold text-purple-800">-{formatCurrency(financialWaterfall.employeeCommissions)}</span>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-indigo-50 rounded-lg">
              <span className="font-medium text-indigo-800">Referral Commissions</span>
              <span className="font-bold text-indigo-800">-{formatCurrency(financialWaterfall.referralCommissions)}</span>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-lg border-2 border-emerald-200">
              <span className="font-medium text-emerald-800">Final Net Profit</span>
              <span className="font-bold text-emerald-800">{formatCurrency(financialWaterfall.netProfit)}</span>
            </div>
          </div>
        </div>
      </ChartContainer>

      {/* Commission Breakdown Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Commission Breakdown Pie Chart */}
        <ChartContainer
          title="Commission Breakdown"
          subtitle="Employee vs Referral Partner Commission Distribution"
          type="pie"
          size="lg"
          showExport={true}
          onExport={handleExport}
          className="bg-white rounded-lg shadow min-h-[400px] sm:min-h-[450px]"
        >
          <PieChart
            data={[
              { name: 'Employee Commissions', value: commissionBreakdown.employeeCommissions, color: '#3B82F6' },
              { name: 'Referral Commissions', value: commissionBreakdown.referralCommissions, color: '#10B981' },
            ]}
            title="Commission Breakdown"
            subtitle="Employee vs Referral Partner Commission Distribution"
            showLabels={true}
            showPercentage={true}
            showLegend={true}
            legendPosition="bottom"
            ariaLabel="Commission breakdown pie chart showing employee and referral partner commission distribution"
            ariaDescription="Interactive pie chart displaying the breakdown of commissions between employees and referral partners"
          />
        </ChartContainer>

        {/* Commission Trends Line Chart */}
        <ChartContainer
          title="Commission Trends"
          subtitle="Daily commission performance over time"
          type="line"
          size="lg"
          showExport={true}
          onExport={handleExport}
          className="bg-white rounded-lg shadow min-h-[400px] sm:min-h-[450px]"
        >
          <LineChart
            data={commissionTrends.daily.map(trend => ({
              name: trend.date,
              value: trend.totalCommissions,
              date: trend.date,
              totalCommissions: trend.totalCommissions,
              employeeCommissions: trend.employeeCommissions,
              referralCommissions: trend.referralCommissions,
              transactionCount: trend.transactionCount,
              averageCommission: trend.averageCommission,
            }))}
            title="Commission Trends"
            subtitle="Daily commission performance over time"
            xAxisDataKey="date"
            yAxisDataKey="totalCommissions"
            showLegend={true}
            ariaLabel="Line chart showing commission trends over time"
            ariaDescription="Interactive line chart displaying daily commission trends with employee and referral partner breakdowns"
          />
        </ChartContainer>
      </div>

      {/* Employee Commission Analysis Table */}
      <ChartContainer
        title="Employee Commission Analysis"
        subtitle="Detailed breakdown of employee commission performance"
        type="table"
        size="xl"
        showExport={true}
        onExport={handleExport}
        className="bg-white rounded-lg shadow overflow-hidden"
      >
        <div className="overflow-x-auto">
          <DataTable
            data={employeeCommissionAnalysis}
            columns={[
                             {
                 key: 'employee',
                 label: 'Employee',
                 sortable: true,
                 render: (value: string) => <span className="font-medium text-gray-900 text-xs sm:text-sm">{value}</span>,
               },
               {
                 key: 'totalCommission',
                 label: 'Total Commission',
                 sortable: true,
                 render: (value: number) => <span className="text-green-600 font-medium text-xs sm:text-sm">{formatCurrency(value)}</span>,
               },
               {
                 key: 'transactionCount',
                 label: 'Transactions',
                 sortable: true,
                 render: (value: number) => <span className="text-gray-600 text-xs sm:text-sm">{formatNumber(value)}</span>,
               },
               {
                 key: 'averageCommission',
                 label: 'Avg. Commission',
                 sortable: true,
                 render: (value: number) => <span className="text-blue-600 font-medium text-xs sm:text-sm">{formatCurrency(value)}</span>,
               },
               {
                 key: 'commissionRate',
                 label: 'Commission Rate',
                 sortable: true,
                 render: (value: number) => <span className="text-purple-600 font-medium text-xs sm:text-sm">{formatPercentage(value)}</span>,
               },
               {
                 key: 'revenueGenerated',
                 label: 'Revenue Generated',
                 sortable: true,
                 render: (value: number) => <span className="text-indigo-600 font-medium text-xs sm:text-sm">{formatCurrency(value)}</span>,
               },
               {
                 key: 'commissionEfficiency',
                 label: 'Commission Efficiency',
                 sortable: true,
                 render: (value: number) => (
                   <span className={`font-medium text-xs sm:text-sm ${value >= 5 ? 'text-green-600' : value >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                     {formatPercentage(value)}
                   </span>
                 ),
               },
            ]}
            sortable={true}
            searchable={true}
            pagination={true}
            itemsPerPage={15}
            ariaLabel="Employee commission analysis data table"
            ariaDescription="Comprehensive sortable and searchable table showing detailed employee commission performance metrics"
          />
        </div>
      </ChartContainer>

      {/* Referral Partner Commission Analysis Table */}
      <ChartContainer
        title="Referral Partner Commission Analysis"
        subtitle="Detailed breakdown of referral partner commission performance"
        type="table"
        size="xl"
        showExport={true}
        onExport={handleExport}
        className="bg-white rounded-lg shadow overflow-hidden"
      >
        <div className="overflow-x-auto">
          <DataTable
            data={referralPartnerAnalysis}
            columns={[
                             {
                 key: 'partner',
                 label: 'Partner',
                 sortable: true,
                 render: (value: string) => <span className="font-medium text-gray-900 text-xs sm:text-sm">{value}</span>,
               },
               {
                 key: 'partnerType',
                 label: 'Partner Type',
                 sortable: true,
                 render: (value: string) => <span className="text-gray-600 text-xs sm:text-sm">{value}</span>,
               },
               {
                 key: 'totalCommission',
                 label: 'Total Commission',
                 sortable: true,
                 render: (value: number) => <span className="text-green-600 font-medium text-xs sm:text-sm">{formatCurrency(value)}</span>,
               },
               {
                 key: 'transactionCount',
                 label: 'Transactions',
                 sortable: true,
                 render: (value: number) => <span className="text-gray-600 text-xs sm:text-sm">{formatNumber(value)}</span>,
               },
               {
                 key: 'averageCommission',
                 label: 'Avg. Commission',
                 sortable: true,
                 render: (value: number) => <span className="text-blue-600 font-medium text-xs sm:text-sm">{formatCurrency(value)}</span>,
               },
               {
                 key: 'commissionRate',
                 label: 'Commission Rate',
                 sortable: true,
                 render: (value: number) => <span className="text-purple-600 font-medium text-xs sm:text-sm">{formatPercentage(value)}</span>,
               },
               {
                 key: 'revenueGenerated',
                 label: 'Revenue Generated',
                 sortable: true,
                 render: (value: number) => <span className="text-indigo-600 font-medium text-xs sm:text-sm">{formatCurrency(value)}</span>,
               },
               {
                 key: 'commissionEfficiency',
                 label: 'Commission Efficiency',
                 sortable: true,
                 render: (value: number) => (
                   <span className={`font-medium text-xs sm:text-sm ${value >= 5 ? 'text-green-600' : value >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                     {formatPercentage(value)}
                   </span>
                 ),
               },
            ]}
            sortable={true}
            searchable={true}
            pagination={true}
            itemsPerPage={15}
            ariaLabel="Referral partner commission analysis data table"
            ariaDescription="Comprehensive sortable and searchable table showing detailed referral partner commission performance metrics"
          />
        </div>
      </ChartContainer>
    </div>
  );
};

export default CommissionAnalysisTab;
