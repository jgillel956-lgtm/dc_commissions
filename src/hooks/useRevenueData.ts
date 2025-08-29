import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchRevenueData } from '../services/revenueApi';
import { DashboardFilters } from '../types/dashboard';

export interface RevenueData {
  totalRevenue: number;
  totalTransactions: number;
  averageTransactionValue: number;
  revenueGrowth: number;
  revenueByCompany: Array<{
    company: string;
    revenue: number;
    transactions: number;
  }>;
  revenueByPaymentMethod: Array<{
    method: string;
    revenue: number;
    percentage: number;
  }>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
  }>;
}

export interface UseRevenueDataResult {
  data: RevenueData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  retry: () => void;
  refresh: () => void;
  lastUpdated: Date | null;
  formattedData?: {
    totalRevenue: string;
    averageTransactionValue: string;
    revenueGrowth: string;
  };
  sortedData?: {
    revenueByCompany: Array<{
      company: string;
      revenue: number;
      transactions: number;
    }>;
  };
}

export const useRevenueData = (filters: DashboardFilters): UseRevenueDataResult => {
  const [data, setData] = useState<RevenueData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const previousFiltersRef = useRef<string>('');

  // Function to fetch data
  const fetchData = useCallback(async (currentFilters: DashboardFilters) => {
    if (!currentFilters) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchRevenueData(currentFilters);
      
      // Validate data
      if (!result) {
        throw new Error('No data received');
      }

      // Transform DashboardDataResponse to RevenueData
      // Handle both API response format and direct mock data format
      let revenueData: RevenueData;
      
      if ('data' in result && Array.isArray(result.data)) {
        // This is a DashboardDataResponse - transform from RevenueMasterRecord[]
        const records = result.data;
        const totalRevenue = records.reduce((sum, record) => sum + record.Total_Combined_Revenue, 0);
        const totalTransactions = records.length;
        const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
        
        // Group by company
        const companyMap = new Map<string, { revenue: number; transactions: number }>();
        records.forEach(record => {
          const company = record.company;
          const existing = companyMap.get(company) || { revenue: 0, transactions: 0 };
          companyMap.set(company, {
            revenue: existing.revenue + record.Total_Combined_Revenue,
            transactions: existing.transactions + 1
          });
        });
        
        // Group by payment method
        const paymentMap = new Map<string, { revenue: number; count: number }>();
        records.forEach(record => {
          const method = record.payment_method_description;
          const existing = paymentMap.get(method) || { revenue: 0, count: 0 };
          paymentMap.set(method, {
            revenue: existing.revenue + record.Total_Combined_Revenue,
            count: existing.count + 1
          });
        });
        
        revenueData = {
          totalRevenue,
          totalTransactions,
          averageTransactionValue,
          revenueGrowth: 0, // Would need historical data to calculate
          revenueByCompany: Array.from(companyMap.entries()).map(([company, data]) => ({
            company,
            revenue: data.revenue,
            transactions: data.transactions
          })),
          revenueByPaymentMethod: Array.from(paymentMap.entries()).map(([method, data]) => ({
            method,
            revenue: data.revenue,
            percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0
          })),
          monthlyRevenue: [] // Would need to group by month
        };
      } else {
        // This is direct mock data format
        revenueData = result as unknown as RevenueData;
      }

      if (typeof revenueData.totalRevenue !== 'number') {
        throw new Error('Invalid numeric value');
      }

      if (!revenueData.revenueByCompany || !Array.isArray(revenueData.revenueByCompany)) {
        throw new Error('Invalid data format');
      }

      setData(revenueData);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Don't update state for aborted requests
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch revenue data';
      setError(errorMessage);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check if filters have changed and fetch data if needed
  useEffect(() => {
    if (!filters) return;

    const currentFiltersString = JSON.stringify(filters);
    const previousFiltersString = previousFiltersRef.current;

    // Only fetch if filters have actually changed or this is the initial load
    if (currentFiltersString !== previousFiltersString) {
      previousFiltersRef.current = currentFiltersString;
      fetchData(filters);
    }
  }, [filters, fetchData]);

  const refetch = useCallback(() => {
    if (!filters) return;
    fetchData(filters);
  }, [filters, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Format data for display
  const formattedData = data ? {
    totalRevenue: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(data.totalRevenue),
    averageTransactionValue: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(data.averageTransactionValue),
    revenueGrowth: `${Math.round(data.revenueGrowth * 100)}%`
  } : undefined;

  // Sort data by revenue descending
  const sortedData = data ? {
    revenueByCompany: [...data.revenueByCompany].sort((a, b) => b.revenue - a.revenue)
  } : undefined;

  return {
    data,
    isLoading,
    error,
    refetch,
    retry: refetch, // Alias for backward compatibility
    refresh: refetch, // Alias for backward compatibility
    lastUpdated,
    formattedData,
    sortedData
  };
};

export default useRevenueData;
