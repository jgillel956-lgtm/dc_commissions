import React, { useMemo, useCallback, useState } from 'react';
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
  payeeFees: number;
  payorFees: number;
  additionalCharges: number;
  revenueGrowth: number;
  transactionGrowth: number;
  movingAverage: number;
  cumulativeRevenue: number;
  revenuePerTransaction: number;
  successRate: number;
  period: 'daily' | 'weekly' | 'monthly';
}

// Enhanced revenue trend analysis interface
interface RevenueTrendAnalysis {
  daily: RevenueTrend[];
  weekly: RevenueTrend[];
  monthly: RevenueTrend[];
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    averageDailyRevenue: number;
    averageMonthlyRevenue: number;
    revenueGrowthRate: number;
    transactionGrowthRate: number;
    bestDay: string;
    worstDay: string;
    bestMonth: string;
    worstMonth: string;
    seasonalPattern: string;
    trendDirection: 'increasing' | 'decreasing' | 'stable';
  };
}

// Drill-down state interface
interface DrillDownState {
  level: 'overview' | 'company' | 'paymentMethod' | 'transaction';
  selectedCompany?: string;
  selectedPaymentMethod?: string;
  selectedDate?: string;
  breadcrumb: string[];
  data: RevenueMasterRecord[];
}

// Enhanced drill-down data interface
interface DrillDownData {
  companyDetails?: {
    name: string;
    totalRevenue: number;
    transactionCount: number;
    averageValue: number;
    revenueShare: number;
    payeeFeeRevenue: number;
    payorFeeRevenue: number;
    additionalCharges: number;
    revenueEfficiency: number;
    successRate: number;
    paymentMethodBreakdown: PaymentMethodAnalysis[];
    monthlyTrends: RevenueTrend[];
    recentTransactions: RevenueMasterRecord[];
  };
  paymentMethodDetails?: {
    name: string;
    totalRevenue: number;
    transactionCount: number;
    averageValue: number;
    revenueShare: number;
    payeeFeeRevenue: number;
    payorFeeRevenue: number;
    additionalCharges: number;
    revenueEfficiency: number;
    successRate: number;
    companyBreakdown: CompanyPerformance[];
    monthlyTrends: RevenueTrend[];
    recentTransactions: RevenueMasterRecord[];
  };
}

const RevenueAnalysisTab: React.FC<RevenueAnalysisTabProps> = ({ className = '' }) => {
  const dashboardState = useDashboardState();
  const { fetchData, fetchChartData } = useRevenueData();

  // Drill-down state management
  const [drillDownState, setDrillDownState] = useState<DrillDownState>({
    level: 'overview',
    breadcrumb: ['Revenue Analysis'],
    data: dashboardState.data,
  });

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

  // Calculate comprehensive revenue trends over time
  const calculateRevenueTrends = useCallback((data: RevenueMasterRecord[]): RevenueTrendAnalysis => {
    if (!data || data.length === 0) {
      return {
        daily: [],
        weekly: [],
        monthly: [],
        summary: {
          totalRevenue: 0,
          totalTransactions: 0,
          averageDailyRevenue: 0,
          averageMonthlyRevenue: 0,
          revenueGrowthRate: 0,
          transactionGrowthRate: 0,
          bestDay: '',
          worstDay: '',
          bestMonth: '',
          worstMonth: '',
          seasonalPattern: 'No pattern detected',
          trendDirection: 'stable',
        },
      };
    }

    // Daily trends
    const dailyMap = new Map<string, { 
      revenue: number; 
      count: number; 
      totalValue: number;
      payeeFees: number;
      payorFees: number;
      additionalCharges: number;
      successfulTransactions: number;
    }>();

    // Weekly trends
    const weeklyMap = new Map<string, { 
      revenue: number; 
      count: number; 
      totalValue: number;
      payeeFees: number;
      payorFees: number;
      additionalCharges: number;
      successfulTransactions: number;
    }>();

    // Monthly trends
    const monthlyMap = new Map<string, { 
      revenue: number; 
      count: number; 
      totalValue: number;
      payeeFees: number;
      payorFees: number;
      additionalCharges: number;
      successfulTransactions: number;
    }>();

    data.forEach(record => {
      const date = new Date(record.created_at);
      const dailyKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const weeklyKey = `${date.getFullYear()}-W${Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7)}`;
      const monthlyKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
      
      const additionalCharges = (record.bundle_charges || 0) + (record.postage_fee || 0);
      const isSuccessful = record.api_transaction_status === 'completed';

      // Daily aggregation
      const dailyExisting = dailyMap.get(dailyKey) || { 
        revenue: 0, count: 0, totalValue: 0, payeeFees: 0, payorFees: 0, additionalCharges: 0, successfulTransactions: 0 
      };
      dailyMap.set(dailyKey, {
        revenue: dailyExisting.revenue + record.Total_Combined_Revenue,
        count: dailyExisting.count + 1,
        totalValue: dailyExisting.totalValue + record.amount,
        payeeFees: dailyExisting.payeeFees + record.Payee_Fee_Revenue,
        payorFees: dailyExisting.payorFees + record.Payor_Fee_Revenue,
        additionalCharges: dailyExisting.additionalCharges + additionalCharges,
        successfulTransactions: dailyExisting.successfulTransactions + (isSuccessful ? 1 : 0),
      });

      // Weekly aggregation
      const weeklyExisting = weeklyMap.get(weeklyKey) || { 
        revenue: 0, count: 0, totalValue: 0, payeeFees: 0, payorFees: 0, additionalCharges: 0, successfulTransactions: 0 
      };
      weeklyMap.set(weeklyKey, {
        revenue: weeklyExisting.revenue + record.Total_Combined_Revenue,
        count: weeklyExisting.count + 1,
        totalValue: weeklyExisting.totalValue + record.amount,
        payeeFees: weeklyExisting.payeeFees + record.Payee_Fee_Revenue,
        payorFees: weeklyExisting.payorFees + record.Payor_Fee_Revenue,
        additionalCharges: weeklyExisting.additionalCharges + additionalCharges,
        successfulTransactions: weeklyExisting.successfulTransactions + (isSuccessful ? 1 : 0),
      });

      // Monthly aggregation
      const monthlyExisting = monthlyMap.get(monthlyKey) || { 
        revenue: 0, count: 0, totalValue: 0, payeeFees: 0, payorFees: 0, additionalCharges: 0, successfulTransactions: 0 
      };
      monthlyMap.set(monthlyKey, {
        revenue: monthlyExisting.revenue + record.Total_Combined_Revenue,
        count: monthlyExisting.count + 1,
        totalValue: monthlyExisting.totalValue + record.amount,
        payeeFees: monthlyExisting.payeeFees + record.Payee_Fee_Revenue,
        payorFees: monthlyExisting.payorFees + record.Payor_Fee_Revenue,
        additionalCharges: monthlyExisting.additionalCharges + additionalCharges,
        successfulTransactions: monthlyExisting.successfulTransactions + (isSuccessful ? 1 : 0),
      });
    });

    // Convert to arrays and calculate additional metrics
    const processTrendData = (map: Map<string, any>, period: 'daily' | 'weekly' | 'monthly'): RevenueTrend[] => {
      const entries = Array.from(map.entries())
        .map(([key, stats]) => ({
          date: key,
          revenue: stats.revenue,
          transactions: stats.count,
          averageValue: stats.count > 0 ? stats.totalValue / stats.count : 0,
          payeeFees: stats.payeeFees,
          payorFees: stats.payorFees,
          additionalCharges: stats.additionalCharges,
          revenueGrowth: 0, // Will be calculated below
          transactionGrowth: 0, // Will be calculated below
          movingAverage: 0, // Will be calculated below
          cumulativeRevenue: 0, // Will be calculated below
          revenuePerTransaction: stats.count > 0 ? stats.revenue / stats.count : 0,
          successRate: stats.count > 0 ? (stats.successfulTransactions / stats.count) * 100 : 0,
          period,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate growth rates, moving averages, and cumulative revenue
      let cumulativeRevenue = 0;
      for (let i = 0; i < entries.length; i++) {
        cumulativeRevenue += entries[i].revenue;
        entries[i].cumulativeRevenue = cumulativeRevenue;

        if (i > 0) {
          const prevRevenue = entries[i - 1].revenue;
          const prevTransactions = entries[i - 1].transactions;
          
          entries[i].revenueGrowth = prevRevenue > 0 ? ((entries[i].revenue - prevRevenue) / prevRevenue) * 100 : 0;
          entries[i].transactionGrowth = prevTransactions > 0 ? ((entries[i].transactions - prevTransactions) / prevTransactions) * 100 : 0;
        }

        // Calculate 7-day moving average for daily data
        if (period === 'daily' && i >= 6) {
          const movingSum = entries.slice(i - 6, i + 1).reduce((sum, entry) => sum + entry.revenue, 0);
          entries[i].movingAverage = movingSum / 7;
        }
      }

      return entries;
    };

    const dailyTrends = processTrendData(dailyMap, 'daily').slice(-90); // Last 90 days
    const weeklyTrends = processTrendData(weeklyMap, 'weekly').slice(-52); // Last 52 weeks
    const monthlyTrends = processTrendData(monthlyMap, 'monthly').slice(-24); // Last 24 months

    // Calculate summary statistics
    const totalRevenue = data.reduce((sum, record) => sum + record.Total_Combined_Revenue, 0);
    const totalTransactions = data.length;
    const averageDailyRevenue = dailyTrends.length > 0 ? dailyTrends.reduce((sum, day) => sum + day.revenue, 0) / dailyTrends.length : 0;
    const averageMonthlyRevenue = monthlyTrends.length > 0 ? monthlyTrends.reduce((sum, month) => sum + month.revenue, 0) / monthlyTrends.length : 0;

    // Calculate growth rates
    const revenueGrowthRate = monthlyTrends.length >= 2 
      ? ((monthlyTrends[monthlyTrends.length - 1].revenue - monthlyTrends[monthlyTrends.length - 2].revenue) / monthlyTrends[monthlyTrends.length - 2].revenue) * 100 
      : 0;
    
    const transactionGrowthRate = monthlyTrends.length >= 2 
      ? ((monthlyTrends[monthlyTrends.length - 1].transactions - monthlyTrends[monthlyTrends.length - 2].transactions) / monthlyTrends[monthlyTrends.length - 2].transactions) * 100 
      : 0;

    // Find best and worst periods
    const bestDay = dailyTrends.length > 0 ? dailyTrends.reduce((max, day) => day.revenue > max.revenue ? day : max).date : '';
    const worstDay = dailyTrends.length > 0 ? dailyTrends.reduce((min, day) => day.revenue < min.revenue ? day : min).date : '';
    const bestMonth = monthlyTrends.length > 0 ? monthlyTrends.reduce((max, month) => month.revenue > max.revenue ? month : max).date : '';
    const worstMonth = monthlyTrends.length > 0 ? monthlyTrends.reduce((min, month) => month.revenue < min.revenue ? month : min).date : '';

    // Determine trend direction
    const trendDirection = revenueGrowthRate > 5 ? 'increasing' : revenueGrowthRate < -5 ? 'decreasing' : 'stable';

    // Detect seasonal patterns (simplified)
    const seasonalPattern = monthlyTrends.length >= 12 ? 'Annual pattern detected' : 'Insufficient data for seasonal analysis';

    return {
      daily: dailyTrends,
      weekly: weeklyTrends,
      monthly: monthlyTrends,
      summary: {
        totalRevenue,
        totalTransactions,
        averageDailyRevenue,
        averageMonthlyRevenue,
        revenueGrowthRate,
        transactionGrowthRate,
        bestDay,
        worstDay,
        bestMonth,
        worstMonth,
        seasonalPattern,
        trendDirection,
      },
    };
  }, []);

  // Memoized calculations
  const kpis = useMemo(() => calculateKPIs(dashboardState.data), [dashboardState.data, calculateKPIs]);
  const revenueBreakdown = useMemo(() => calculateRevenueBreakdown(dashboardState.data), [dashboardState.data, calculateRevenueBreakdown]);
  const companyPerformance = useMemo(() => calculateCompanyPerformance(dashboardState.data), [dashboardState.data, calculateCompanyPerformance]);
  const paymentMethodAnalysis = useMemo(() => calculatePaymentMethodAnalysis(dashboardState.data), [dashboardState.data, calculatePaymentMethodAnalysis]);
  const revenueTrends = useMemo(() => calculateRevenueTrends(dashboardState.data), [dashboardState.data, calculateRevenueTrends]);

  // Drill-down data calculations
  const drillDownData = useMemo((): DrillDownData => {
    if (drillDownState.level === 'overview') return {};

    const filteredData = drillDownState.data.filter(record => {
      if (drillDownState.level === 'company' && drillDownState.selectedCompany) {
        return record.company === drillDownState.selectedCompany;
      }
      if (drillDownState.level === 'paymentMethod' && drillDownState.selectedPaymentMethod) {
        return record.payment_method_description === drillDownState.selectedPaymentMethod;
      }
      return true;
    });

    if (drillDownState.level === 'company' && drillDownState.selectedCompany) {
      const companyData = filteredData;
      const totalRevenue = companyData.reduce((sum, record) => sum + record.Total_Combined_Revenue, 0);
      const totalTransactions = companyData.length;
      const payeeFeeRevenue = companyData.reduce((sum, record) => sum + record.Payee_Fee_Revenue, 0);
      const payorFeeRevenue = companyData.reduce((sum, record) => sum + record.Payor_Fee_Revenue, 0);
      const additionalCharges = companyData.reduce((sum, record) => sum + (record.bundle_charges || 0) + (record.postage_fee || 0), 0);
      const successfulTransactions = companyData.filter(record => record.api_transaction_status === 'completed').length;
      
      // Calculate payment method breakdown for this company
      const paymentMethodMap = new Map<string, { revenue: number; count: number; totalValue: number }>();
      companyData.forEach(record => {
        const method = record.payment_method_description;
        const existing = paymentMethodMap.get(method) || { revenue: 0, count: 0, totalValue: 0 };
        paymentMethodMap.set(method, {
          revenue: existing.revenue + record.Total_Combined_Revenue,
          count: existing.count + 1,
          totalValue: existing.totalValue + record.amount,
        });
      });

      const paymentMethodBreakdown = Array.from(paymentMethodMap.entries())
        .map(([method, stats]) => ({
          method,
          totalRevenue: stats.revenue,
          transactionCount: stats.count,
          averageValue: stats.count > 0 ? stats.totalValue / stats.count : 0,
          revenueShare: totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

      // Calculate monthly trends for this company
      const monthlyMap = new Map<string, { revenue: number; count: number; totalValue: number }>();
      companyData.forEach(record => {
        const date = new Date(record.created_at);
        const monthlyKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const existing = monthlyMap.get(monthlyKey) || { revenue: 0, count: 0, totalValue: 0 };
        monthlyMap.set(monthlyKey, {
          revenue: existing.revenue + record.Total_Combined_Revenue,
          count: existing.count + 1,
          totalValue: existing.totalValue + record.amount,
        });
      });

      const monthlyTrends = Array.from(monthlyMap.entries())
        .map(([date, stats]) => ({
          date,
          revenue: stats.revenue,
          transactions: stats.count,
          averageValue: stats.count > 0 ? stats.totalValue / stats.count : 0,
          payeeFees: 0, // Would need to calculate from individual records
          payorFees: 0,
          additionalCharges: 0,
          revenueGrowth: 0,
          transactionGrowth: 0,
          movingAverage: 0,
          cumulativeRevenue: 0,
          revenuePerTransaction: stats.count > 0 ? stats.revenue / stats.count : 0,
          successRate: 0,
          period: 'monthly' as const,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return {
        companyDetails: {
          name: drillDownState.selectedCompany!,
          totalRevenue,
          transactionCount: totalTransactions,
          averageValue: totalTransactions > 0 ? companyData.reduce((sum, record) => sum + record.amount, 0) / totalTransactions : 0,
          revenueShare: dashboardState.data.length > 0 ? (totalRevenue / dashboardState.data.reduce((sum, record) => sum + record.Total_Combined_Revenue, 0)) * 100 : 0,
          payeeFeeRevenue,
          payorFeeRevenue,
          additionalCharges,
          revenueEfficiency: companyData.reduce((sum, record) => sum + record.amount, 0) > 0 ? (totalRevenue / companyData.reduce((sum, record) => sum + record.amount, 0)) * 100 : 0,
          successRate: totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0,
          paymentMethodBreakdown,
          monthlyTrends,
          recentTransactions: companyData.slice(-10).reverse(), // Last 10 transactions
        },
      };
    }

    if (drillDownState.level === 'paymentMethod' && drillDownState.selectedPaymentMethod) {
      const methodData = filteredData;
      const totalRevenue = methodData.reduce((sum, record) => sum + record.Total_Combined_Revenue, 0);
      const totalTransactions = methodData.length;
      const payeeFeeRevenue = methodData.reduce((sum, record) => sum + record.Payee_Fee_Revenue, 0);
      const payorFeeRevenue = methodData.reduce((sum, record) => sum + record.Payor_Fee_Revenue, 0);
      const additionalCharges = methodData.reduce((sum, record) => sum + (record.bundle_charges || 0) + (record.postage_fee || 0), 0);
      const successfulTransactions = methodData.filter(record => record.api_transaction_status === 'completed').length;
      
      // Calculate company breakdown for this payment method
      const companyMap = new Map<string, { revenue: number; count: number; totalValue: number }>();
      methodData.forEach(record => {
        const company = record.company;
        const existing = companyMap.get(company) || { revenue: 0, count: 0, totalValue: 0 };
        companyMap.set(company, {
          revenue: existing.revenue + record.Total_Combined_Revenue,
          count: existing.count + 1,
          totalValue: existing.totalValue + record.amount,
        });
      });

      const companyBreakdown = Array.from(companyMap.entries())
        .map(([company, stats]) => ({
          company,
          totalRevenue: stats.revenue,
          transactionCount: stats.count,
          averageValue: stats.count > 0 ? stats.totalValue / stats.count : 0,
          revenueShare: totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

      // Calculate monthly trends for this payment method
      const monthlyMap = new Map<string, { revenue: number; count: number; totalValue: number }>();
      methodData.forEach(record => {
        const date = new Date(record.created_at);
        const monthlyKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const existing = monthlyMap.get(monthlyKey) || { revenue: 0, count: 0, totalValue: 0 };
        monthlyMap.set(monthlyKey, {
          revenue: existing.revenue + record.Total_Combined_Revenue,
          count: existing.count + 1,
          totalValue: existing.totalValue + record.amount,
        });
      });

      const monthlyTrends = Array.from(monthlyMap.entries())
        .map(([date, stats]) => ({
          date,
          revenue: stats.revenue,
          transactions: stats.count,
          averageValue: stats.count > 0 ? stats.totalValue / stats.count : 0,
          payeeFees: 0,
          payorFees: 0,
          additionalCharges: 0,
          revenueGrowth: 0,
          transactionGrowth: 0,
          movingAverage: 0,
          cumulativeRevenue: 0,
          revenuePerTransaction: stats.count > 0 ? stats.revenue / stats.count : 0,
          successRate: 0,
          period: 'monthly' as const,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return {
        paymentMethodDetails: {
          name: drillDownState.selectedPaymentMethod!,
          totalRevenue,
          transactionCount: totalTransactions,
          averageValue: totalTransactions > 0 ? methodData.reduce((sum, record) => sum + record.amount, 0) / totalTransactions : 0,
          revenueShare: dashboardState.data.length > 0 ? (totalRevenue / dashboardState.data.reduce((sum, record) => sum + record.Total_Combined_Revenue, 0)) * 100 : 0,
          payeeFeeRevenue,
          payorFeeRevenue,
          additionalCharges,
          revenueEfficiency: methodData.reduce((sum, record) => sum + record.amount, 0) > 0 ? (totalRevenue / methodData.reduce((sum, record) => sum + record.amount, 0)) * 100 : 0,
          successRate: totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0,
          companyBreakdown,
          monthlyTrends,
          recentTransactions: methodData.slice(-10).reverse(), // Last 10 transactions
        },
      };
    }

    return {};
  }, [drillDownState, dashboardState.data]);

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

  // Prepare trend data
  const trendLineData = useMemo(() => 
    revenueTrends.daily.map(trend => ({
      name: trend.date,
      value: trend.revenue,
      date: trend.date,
      revenue: trend.revenue,
      transactions: trend.transactions,
      averageValue: trend.averageValue,
      payeeFees: trend.payeeFees,
      payorFees: trend.payorFees,
      additionalCharges: trend.additionalCharges,
      revenueGrowth: trend.revenueGrowth,
      transactionGrowth: trend.transactionGrowth,
      movingAverage: trend.movingAverage,
      cumulativeRevenue: trend.cumulativeRevenue,
      revenuePerTransaction: trend.revenuePerTransaction,
      successRate: trend.successRate,
    })), [revenueTrends.daily]);

  // Prepare weekly trend data
  const weeklyTrendData = useMemo(() => 
    revenueTrends.weekly.map(trend => ({
      name: trend.date,
      value: trend.revenue,
      date: trend.date,
      revenue: trend.revenue,
      transactions: trend.transactions,
      averageValue: trend.averageValue,
      payeeFees: trend.payeeFees,
      payorFees: trend.payorFees,
      additionalCharges: trend.additionalCharges,
      revenueGrowth: trend.revenueGrowth,
      transactionGrowth: trend.transactionGrowth,
      movingAverage: trend.movingAverage,
      cumulativeRevenue: trend.cumulativeRevenue,
      revenuePerTransaction: trend.revenuePerTransaction,
      successRate: trend.successRate,
    })), [revenueTrends.weekly]);

  // Prepare monthly trend data
  const monthlyTrendData = useMemo(() => 
    revenueTrends.monthly.map(trend => ({
      name: trend.date,
      value: trend.revenue,
      date: trend.date,
      revenue: trend.revenue,
      transactions: trend.transactions,
      averageValue: trend.averageValue,
      payeeFees: trend.payeeFees,
      payorFees: trend.payorFees,
      additionalCharges: trend.additionalCharges,
      revenueGrowth: trend.revenueGrowth,
      transactionGrowth: trend.transactionGrowth,
      movingAverage: trend.movingAverage,
      cumulativeRevenue: trend.cumulativeRevenue,
      revenuePerTransaction: trend.revenuePerTransaction,
      successRate: trend.successRate,
    })), [revenueTrends.monthly]);

  // Enhanced drill-down handlers
  const handlePieChartClick = useCallback((data: any) => {
    console.log('Pie chart clicked:', data);
    if (data.name === 'Payee Fees' || data.name === 'Payor Fees') {
      // Could drill down to show breakdown by company or payment method
      setDrillDownState(prev => ({
        ...prev,
        level: 'overview',
        breadcrumb: ['Revenue Analysis', data.name],
      }));
    }
  }, []);

  // Handle drill-up navigation
  const handleDrillUp = useCallback((path: string[], parentSegment: string | null) => {
    console.log('Drilling up:', { path, parentSegment });
    if (drillDownState.level !== 'overview') {
      setDrillDownState(prev => ({
        level: 'overview',
        breadcrumb: ['Revenue Analysis'],
        data: dashboardState.data,
      }));
    }
  }, [drillDownState.level, dashboardState.data]);

  // Enhanced bar chart click handler
  const handleBarChartClick = useCallback((data: any) => {
    console.log('Bar chart clicked:', data);
    
    // Determine which chart was clicked based on context
    const isCompanyChart = companyPerformance.some(company => company.company === data.name);
    const isPaymentMethodChart = paymentMethodAnalysis.some(method => method.method === data.name);
    
    if (isCompanyChart) {
      setDrillDownState(prev => ({
        level: 'company',
        selectedCompany: data.name,
        breadcrumb: ['Revenue Analysis', 'Companies', data.name],
        data: dashboardState.data,
      }));
    } else if (isPaymentMethodChart) {
      setDrillDownState(prev => ({
        level: 'paymentMethod',
        selectedPaymentMethod: data.name,
        breadcrumb: ['Revenue Analysis', 'Payment Methods', data.name],
        data: dashboardState.data,
      }));
    }
  }, [companyPerformance, paymentMethodAnalysis, dashboardState.data]);

  // Enhanced line chart click handler
  const handleLineChartClick = useCallback((data: any) => {
    console.log('Line chart clicked:', data);
    // Could drill down to show transactions for that specific date
    setDrillDownState(prev => ({
      ...prev,
      level: 'transaction',
      selectedDate: data.date,
      breadcrumb: [...prev.breadcrumb, data.date],
    }));
  }, []);

  // Navigation handler
  const handleBreadcrumbClick = useCallback((index: number) => {
    if (index === 0) {
      // Return to overview
      setDrillDownState({
        level: 'overview',
        breadcrumb: ['Revenue Analysis'],
        data: dashboardState.data,
      });
    } else if (index === 1) {
      // Return to category level
      setDrillDownState(prev => ({
        level: 'overview',
        breadcrumb: ['Revenue Analysis'],
        data: dashboardState.data,
      }));
    }
  }, [dashboardState.data]);

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

  // Render drill-down view
  if (drillDownState.level !== 'overview') {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Breadcrumb Navigation */}
        <div className="bg-white rounded-lg shadow p-4">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              {drillDownState.breadcrumb.map((item, index) => (
                <li key={index} className="inline-flex items-center">
                  {index > 0 && (
                    <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  <button
                    onClick={() => handleBreadcrumbClick(index)}
                    className={`inline-flex items-center text-sm font-medium ${
                      index === drillDownState.breadcrumb.length - 1
                        ? 'text-gray-500 cursor-default'
                        : 'text-blue-600 hover:text-blue-800 cursor-pointer'
                    }`}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {/* Drill-down Content */}
        {drillDownState.level === 'company' && drillDownData.companyDetails && (
          <div className="space-y-6">
            {/* Company Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(drillDownData.companyDetails.totalRevenue)}</p>
                    <p className="text-sm text-gray-500">{formatPercentage(drillDownData.companyDetails.revenueShare)} of total</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-full">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Transactions</p>
                    <p className="text-2xl font-bold text-gray-900">{formatNumber(drillDownData.companyDetails.transactionCount)}</p>
                    <p className="text-sm text-gray-500">Avg: {formatCurrency(drillDownData.companyDetails.averageValue)}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-full">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{formatPercentage(drillDownData.companyDetails.successRate)}</p>
                    <p className="text-sm text-gray-500">Revenue Efficiency: {formatPercentage(drillDownData.companyDetails.revenueEfficiency)}</p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-full">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Fee Breakdown</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(drillDownData.companyDetails.payeeFeeRevenue + drillDownData.companyDetails.payorFeeRevenue)}</p>
                    <p className="text-sm text-gray-500">Payee: {formatCurrency(drillDownData.companyDetails.payeeFeeRevenue)} | Payor: {formatCurrency(drillDownData.companyDetails.payorFeeRevenue)}</p>
                  </div>
                  <div className="p-2 bg-orange-100 rounded-full">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method Breakdown for Company */}
            <ChartContainer
              title={`Payment Methods for ${drillDownData.companyDetails.name}`}
              subtitle="Revenue breakdown by payment method for this company"
              type="bar"
              size="lg"
              showExport={true}
              onExport={handleExport}
              className="bg-white rounded-lg shadow"
            >
              <BarChart
                data={drillDownData.companyDetails.paymentMethodBreakdown.map(method => ({
                  name: method.method,
                  value: method.totalRevenue,
                  revenue: method.totalRevenue,
                  transactions: method.transactionCount,
                  averageValue: method.averageValue,
                }))}
                title={`Payment Methods for ${drillDownData.companyDetails.name}`}
                subtitle="Revenue breakdown by payment method for this company"
                xAxisDataKey="name"
                yAxisDataKey="revenue"
                showLegend={true}
                onDataPointClick={handleBarChartClick}
                enableDrillDown={true}
                ariaLabel="Bar chart showing payment method breakdown for selected company"
                ariaDescription="Interactive bar chart displaying revenue breakdown by payment method for the selected company"
              />
            </ChartContainer>

            {/* Monthly Trends for Company */}
            <ChartContainer
              title={`Monthly Trends for ${drillDownData.companyDetails.name}`}
              subtitle="Revenue performance over time for this company"
              type="line"
              size="lg"
              showExport={true}
              onExport={handleExport}
              className="bg-white rounded-lg shadow"
            >
              <LineChart
                data={drillDownData.companyDetails.monthlyTrends.map(trend => ({
                  name: trend.date,
                  value: trend.revenue,
                  date: trend.date,
                  revenue: trend.revenue,
                  transactions: trend.transactions,
                  averageValue: trend.averageValue,
                }))}
                title={`Monthly Trends for ${drillDownData.companyDetails.name}`}
                subtitle="Revenue performance over time for this company"
                xAxisDataKey="date"
                yAxisDataKey="revenue"
                showLegend={true}
                onDataPointClick={handleLineChartClick}
                enableDrillDown={true}
                ariaLabel="Line chart showing monthly revenue trends for selected company"
                ariaDescription="Interactive line chart displaying monthly revenue trends for the selected company"
              />
            </ChartContainer>

            {/* Recent Transactions for Company */}
            <ChartContainer
              title={`Recent Transactions for ${drillDownData.companyDetails.name}`}
              subtitle="Latest transactions for this company"
              type="table"
              size="xl"
              showExport={true}
              onExport={handleExport}
              className="bg-white rounded-lg shadow"
            >
              <DataTable
                data={drillDownData.companyDetails.recentTransactions}
                columns={[
                  {
                    key: 'created_at',
                    title: 'Date',
                    sortable: true,
                    render: (value: string) => <span className="text-gray-600">{new Date(value).toLocaleDateString()}</span>,
                  },
                  {
                    key: 'payment_method_description',
                    title: 'Payment Method',
                    sortable: true,
                    render: (value: string) => <span className="font-medium text-gray-900">{value}</span>,
                  },
                  {
                    key: 'amount',
                    title: 'Amount',
                    sortable: true,
                    render: (value: number) => <span className="text-green-600 font-medium">{formatCurrency(value)}</span>,
                  },
                  {
                    key: 'Total_Combined_Revenue',
                    title: 'Revenue',
                    sortable: true,
                    render: (value: number) => <span className="text-blue-600 font-medium">{formatCurrency(value)}</span>,
                  },
                  {
                    key: 'api_transaction_status',
                    title: 'Status',
                    sortable: true,
                    render: (value: string) => (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        value === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {value}
                      </span>
                    ),
                  },
                ]}
                sortable={true}
                searchable={true}
                pagination={true}
                pageSize={10}
                ariaLabel="Recent transactions data table for selected company"
                ariaDescription="Sortable and searchable table showing recent transactions for the selected company"
              />
            </ChartContainer>
          </div>
        )}

        {drillDownState.level === 'paymentMethod' && drillDownData.paymentMethodDetails && (
          <div className="space-y-6">
            {/* Payment Method Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(drillDownData.paymentMethodDetails.totalRevenue)}</p>
                    <p className="text-sm text-gray-500">{formatPercentage(drillDownData.paymentMethodDetails.revenueShare)} of total</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-full">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Transactions</p>
                    <p className="text-2xl font-bold text-gray-900">{formatNumber(drillDownData.paymentMethodDetails.transactionCount)}</p>
                    <p className="text-sm text-gray-500">Avg: {formatCurrency(drillDownData.paymentMethodDetails.averageValue)}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-full">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{formatPercentage(drillDownData.paymentMethodDetails.successRate)}</p>
                    <p className="text-sm text-gray-500">Revenue Efficiency: {formatPercentage(drillDownData.paymentMethodDetails.revenueEfficiency)}</p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-full">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Fee Breakdown</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(drillDownData.paymentMethodDetails.payeeFeeRevenue + drillDownData.paymentMethodDetails.payorFeeRevenue)}</p>
                    <p className="text-sm text-gray-500">Payee: {formatCurrency(drillDownData.paymentMethodDetails.payeeFeeRevenue)} | Payor: {formatCurrency(drillDownData.paymentMethodDetails.payorFeeRevenue)}</p>
                  </div>
                  <div className="p-2 bg-orange-100 rounded-full">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Company Breakdown for Payment Method */}
            <ChartContainer
              title={`Companies using ${drillDownData.paymentMethodDetails.name}`}
              subtitle="Revenue breakdown by company for this payment method"
              type="bar"
              size="lg"
              showExport={true}
              onExport={handleExport}
              className="bg-white rounded-lg shadow"
            >
              <BarChart
                data={drillDownData.paymentMethodDetails.companyBreakdown.map(company => ({
                  name: company.company,
                  value: company.totalRevenue,
                  revenue: company.totalRevenue,
                  transactions: company.transactionCount,
                  averageValue: company.averageValue,
                }))}
                title={`Companies using ${drillDownData.paymentMethodDetails.name}`}
                subtitle="Revenue breakdown by company for this payment method"
                xAxisDataKey="name"
                yAxisDataKey="revenue"
                showLegend={true}
                onDataPointClick={handleBarChartClick}
                enableDrillDown={true}
                ariaLabel="Bar chart showing company breakdown for selected payment method"
                ariaDescription="Interactive bar chart displaying revenue breakdown by company for the selected payment method"
              />
            </ChartContainer>

            {/* Monthly Trends for Payment Method */}
            <ChartContainer
              title={`Monthly Trends for ${drillDownData.paymentMethodDetails.name}`}
              subtitle="Revenue performance over time for this payment method"
              type="line"
              size="lg"
              showExport={true}
              onExport={handleExport}
              className="bg-white rounded-lg shadow"
            >
              <LineChart
                data={drillDownData.paymentMethodDetails.monthlyTrends.map(trend => ({
                  name: trend.date,
                  value: trend.revenue,
                  date: trend.date,
                  revenue: trend.revenue,
                  transactions: trend.transactions,
                  averageValue: trend.averageValue,
                }))}
                title={`Monthly Trends for ${drillDownData.paymentMethodDetails.name}`}
                subtitle="Revenue performance over time for this payment method"
                xAxisDataKey="date"
                yAxisDataKey="revenue"
                showLegend={true}
                onDataPointClick={handleLineChartClick}
                enableDrillDown={true}
                ariaLabel="Line chart showing monthly revenue trends for selected payment method"
                ariaDescription="Interactive line chart displaying monthly revenue trends for the selected payment method"
              />
            </ChartContainer>

            {/* Recent Transactions for Payment Method */}
            <ChartContainer
              title={`Recent Transactions for ${drillDownData.paymentMethodDetails.name}`}
              subtitle="Latest transactions for this payment method"
              type="table"
              size="xl"
              showExport={true}
              onExport={handleExport}
              className="bg-white rounded-lg shadow"
            >
              <DataTable
                data={drillDownData.paymentMethodDetails.recentTransactions}
                columns={[
                  {
                    key: 'created_at',
                    title: 'Date',
                    sortable: true,
                    render: (value: string) => <span className="text-gray-600">{new Date(value).toLocaleDateString()}</span>,
                  },
                  {
                    key: 'company',
                    title: 'Company',
                    sortable: true,
                    render: (value: string) => <span className="font-medium text-gray-900">{value}</span>,
                  },
                  {
                    key: 'amount',
                    title: 'Amount',
                    sortable: true,
                    render: (value: number) => <span className="text-green-600 font-medium">{formatCurrency(value)}</span>,
                  },
                  {
                    key: 'Total_Combined_Revenue',
                    title: 'Revenue',
                    sortable: true,
                    render: (value: number) => <span className="text-blue-600 font-medium">{formatCurrency(value)}</span>,
                  },
                  {
                    key: 'api_transaction_status',
                    title: 'Status',
                    sortable: true,
                    render: (value: string) => (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        value === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {value}
                      </span>
                    ),
                  },
                ]}
                sortable={true}
                searchable={true}
                pagination={true}
                pageSize={10}
                ariaLabel="Recent transactions data table for selected payment method"
                ariaDescription="Sortable and searchable table showing recent transactions for the selected payment method"
              />
            </ChartContainer>
          </div>
        )}
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

        {/* Revenue Trends Section */}
        <div className="space-y-6">
          {/* Revenue Trends Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(revenueTrends.summary.totalRevenue)}</p>
                  <p className={`text-sm ${revenueTrends.summary.revenueGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {revenueTrends.summary.revenueGrowthRate >= 0 ? '+' : ''}{formatPercentage(revenueTrends.summary.revenueGrowthRate)} vs last month
                  </p>
                </div>
                <div className="p-2 bg-green-100 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg. Daily Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(revenueTrends.summary.averageDailyRevenue)}</p>
                  <p className="text-sm text-gray-500">Last 90 days</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Trend Direction</p>
                  <p className={`text-2xl font-bold ${
                    revenueTrends.summary.trendDirection === 'increasing' ? 'text-green-600' : 
                    revenueTrends.summary.trendDirection === 'decreasing' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {revenueTrends.summary.trendDirection.charAt(0).toUpperCase() + revenueTrends.summary.trendDirection.slice(1)}
                  </p>
                  <p className="text-sm text-gray-500">{revenueTrends.summary.seasonalPattern}</p>
                </div>
                <div className={`p-2 rounded-full ${
                  revenueTrends.summary.trendDirection === 'increasing' ? 'bg-green-100' : 
                  revenueTrends.summary.trendDirection === 'decreasing' ? 'bg-red-100' : 'bg-gray-100'
                }`}>
                  <svg className={`w-6 h-6 ${
                    revenueTrends.summary.trendDirection === 'increasing' ? 'text-green-600' : 
                    revenueTrends.summary.trendDirection === 'decreasing' ? 'text-red-600' : 'text-gray-600'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Best Performing Day</p>
                  <p className="text-2xl font-bold text-gray-900">{revenueTrends.summary.bestDay || 'N/A'}</p>
                  <p className="text-sm text-gray-500">Highest revenue day</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-full">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Revenue Trends */}
          <ChartContainer
            title="Daily Revenue Trends"
            subtitle="Revenue performance over the last 90 days with growth indicators"
            type="line"
            size="lg"
            showExport={true}
            onExport={handleExport}
            className="bg-white rounded-lg shadow"
          >
            <LineChart
              data={trendLineData}
              title="Daily Revenue Trends"
              subtitle="Revenue performance over the last 90 days with growth indicators"
              xAxisDataKey="date"
              yAxisDataKey="revenue"
              showLegend={true}
              onDataPointClick={handleLineChartClick}
              enableDrillDown={true}
              ariaLabel="Line chart showing daily revenue trends over time"
              ariaDescription="Interactive line chart displaying daily revenue trends with growth indicators and moving averages"
            />
          </ChartContainer>

          {/* Weekly and Monthly Trends Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Revenue Trends */}
            <ChartContainer
              title="Weekly Revenue Trends"
              subtitle="Revenue performance by week with cumulative analysis"
              type="line"
              size="md"
              showExport={true}
              onExport={handleExport}
              className="bg-white rounded-lg shadow"
            >
              <LineChart
                data={weeklyTrendData}
                title="Weekly Revenue Trends"
                subtitle="Revenue performance by week with cumulative analysis"
                xAxisDataKey="date"
                yAxisDataKey="revenue"
                showLegend={true}
                onDataPointClick={handleLineChartClick}
                enableDrillDown={true}
                ariaLabel="Line chart showing weekly revenue trends"
                ariaDescription="Interactive line chart displaying weekly revenue trends with cumulative analysis"
              />
            </ChartContainer>

            {/* Monthly Revenue Trends */}
            <ChartContainer
              title="Monthly Revenue Trends"
              subtitle="Revenue performance by month with seasonal patterns"
              type="line"
              size="md"
              showExport={true}
              onExport={handleExport}
              className="bg-white rounded-lg shadow"
            >
              <LineChart
                data={monthlyTrendData}
                title="Monthly Revenue Trends"
                subtitle="Revenue performance by month with seasonal patterns"
                xAxisDataKey="date"
                yAxisDataKey="revenue"
                showLegend={true}
                onDataPointClick={handleLineChartClick}
                enableDrillDown={true}
                ariaLabel="Line chart showing monthly revenue trends"
                ariaDescription="Interactive line chart displaying monthly revenue trends with seasonal pattern analysis"
              />
            </ChartContainer>
          </div>

          {/* Revenue Trends Analysis Table */}
          <ChartContainer
            title="Revenue Trends Analysis"
            subtitle="Detailed breakdown of revenue trends with growth metrics and performance indicators"
            type="table"
            size="xl"
            showExport={true}
            onExport={handleExport}
            className="bg-white rounded-lg shadow"
          >
            <DataTable
              data={revenueTrends.daily.slice(-30)} // Last 30 days
              columns={[
                {
                  key: 'date',
                  title: 'Date',
                  sortable: true,
                  render: (value: string) => <span className="font-medium text-gray-900">{value}</span>,
                },
                {
                  key: 'revenue',
                  title: 'Revenue',
                  sortable: true,
                  render: (value: number) => <span className="text-green-600 font-medium">{formatCurrency(value)}</span>,
                },
                {
                  key: 'transactions',
                  title: 'Transactions',
                  sortable: true,
                  render: (value: number) => <span className="text-gray-600">{formatNumber(value)}</span>,
                },
                {
                  key: 'revenuePerTransaction',
                  title: 'Revenue/Transaction',
                  sortable: true,
                  render: (value: number) => <span className="text-blue-600 font-medium">{formatCurrency(value)}</span>,
                },
                {
                  key: 'revenueGrowth',
                  title: 'Revenue Growth',
                  sortable: true,
                  render: (value: number) => (
                    <span className={`font-medium ${value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {value >= 0 ? '+' : ''}{formatPercentage(value)}
                    </span>
                  ),
                },
                {
                  key: 'transactionGrowth',
                  title: 'Transaction Growth',
                  sortable: true,
                  render: (value: number) => (
                    <span className={`font-medium ${value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {value >= 0 ? '+' : ''}{formatPercentage(value)}
                    </span>
                  ),
                },
                {
                  key: 'movingAverage',
                  title: '7-Day Moving Avg',
                  sortable: true,
                  render: (value: number) => <span className="text-purple-600 font-medium">{formatCurrency(value)}</span>,
                },
                {
                  key: 'cumulativeRevenue',
                  title: 'Cumulative Revenue',
                  sortable: true,
                  render: (value: number) => <span className="text-indigo-600 font-medium">{formatCurrency(value)}</span>,
                },
                {
                  key: 'successRate',
                  title: 'Success Rate',
                  sortable: true,
                  render: (value: number) => (
                    <span className={`font-medium ${value >= 95 ? 'text-green-600' : value >= 90 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {formatPercentage(value)}
                    </span>
                  ),
                },
              ]}
              sortable={true}
              searchable={true}
              pagination={true}
              pageSize={15}
              ariaLabel="Revenue trends analysis data table"
              ariaDescription="Comprehensive sortable and searchable table showing detailed revenue trends with growth metrics, moving averages, and performance indicators"
            />
          </ChartContainer>
        </div>
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
              title: 'Company',
              sortable: true,
              render: (value: string) => <span className="font-medium text-gray-900">{value}</span>,
            },
            {
              key: 'totalRevenue',
              title: 'Total Revenue',
              sortable: true,
              render: (value: number) => <span className="text-green-600 font-medium">{formatCurrency(value)}</span>,
            },
            {
              key: 'transactionCount',
              title: 'Transactions',
              sortable: true,
              render: (value: number) => <span className="text-gray-600">{formatNumber(value)}</span>,
            },
            {
              key: 'transactionVolume',
              title: 'Transaction Volume',
              sortable: true,
              render: (value: number) => <span className="text-purple-600 font-medium">{formatCurrency(value)}</span>,
            },
            {
              key: 'averageValue',
              title: 'Avg. Transaction',
              sortable: true,
              render: (value: number) => <span className="text-gray-600">{formatCurrency(value)}</span>,
            },
            {
              key: 'averageRevenuePerTransaction',
              title: 'Avg. Revenue/Transaction',
              sortable: true,
              render: (value: number) => <span className="text-blue-600 font-medium">{formatCurrency(value)}</span>,
            },
            {
              key: 'revenueShare',
              title: 'Revenue Share',
              sortable: true,
              render: (value: number) => <span className="text-indigo-600 font-medium">{formatPercentage(value)}</span>,
            },
            {
              key: 'revenueEfficiency',
              title: 'Revenue Efficiency',
              sortable: true,
              render: (value: number) => (
                <span className={`font-medium ${value >= 5 ? 'text-green-600' : value >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {formatPercentage(value)}
                </span>
              ),
            },
            {
              key: 'payeeFeeRevenue',
              title: 'Payee Fees',
              sortable: true,
              render: (value: number) => <span className="text-blue-500">{formatCurrency(value)}</span>,
            },
            {
              key: 'payorFeeRevenue',
              title: 'Payor Fees',
              sortable: true,
              render: (value: number) => <span className="text-green-500">{formatCurrency(value)}</span>,
            },
            {
              key: 'additionalCharges',
              title: 'Additional Charges',
              sortable: true,
              render: (value: number) => <span className="text-orange-500">{formatCurrency(value)}</span>,
            },
            {
              key: 'firstTransactionDate',
              title: 'First Transaction',
              sortable: true,
              render: (value: string) => <span className="text-gray-600 text-sm">{value}</span>,
            },
            {
              key: 'lastTransactionDate',
              title: 'Last Transaction',
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

