import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { revenueAnalyticsService } from '../services/revenueAnalyticsService';
import { 
  RevenueAnalyticsQueryParams, 
  RevenueAnalyticsResponse,
  RevenueChartData,
  EmployeeCommissionData,
  CompanyRevenueData,
  PaymentMethodRevenueData
} from '../types/revenueAnalytics';

// Query keys for React Query
export const revenueAnalyticsKeys = {
  all: ['revenueAnalytics'] as const,
  lists: () => [...revenueAnalyticsKeys.all, 'list'] as const,
  list: (params: RevenueAnalyticsQueryParams) => [...revenueAnalyticsKeys.lists(), params] as const,
  chartData: (params: RevenueAnalyticsQueryParams) => [...revenueAnalyticsKeys.all, 'chartData', params] as const,
  employeeCommissions: (params: RevenueAnalyticsQueryParams) => [...revenueAnalyticsKeys.all, 'employeeCommissions', params] as const,
  companyRevenue: (params: RevenueAnalyticsQueryParams) => [...revenueAnalyticsKeys.all, 'companyRevenue', params] as const,
  paymentMethodRevenue: (params: RevenueAnalyticsQueryParams) => [...revenueAnalyticsKeys.all, 'paymentMethodRevenue', params] as const,
};

/**
 * Hook for fetching revenue analytics data
 */
export const useRevenueAnalytics = (params: RevenueAnalyticsQueryParams = {}) => {
  return useQuery({
    queryKey: revenueAnalyticsKeys.list(params),
    queryFn: () => revenueAnalyticsService.executeRevenueAnalyticsQuery(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for fetching revenue chart data
 */
export const useRevenueChartData = (params: RevenueAnalyticsQueryParams = {}) => {
  return useQuery({
    queryKey: revenueAnalyticsKeys.chartData(params),
    queryFn: () => revenueAnalyticsService.getRevenueChartData(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for fetching employee commission data
 */
export const useEmployeeCommissionData = (params: RevenueAnalyticsQueryParams = {}) => {
  return useQuery({
    queryKey: revenueAnalyticsKeys.employeeCommissions(params),
    queryFn: () => revenueAnalyticsService.getEmployeeCommissionData(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for fetching company revenue data
 */
export const useCompanyRevenueData = (params: RevenueAnalyticsQueryParams = {}) => {
  return useQuery({
    queryKey: revenueAnalyticsKeys.companyRevenue(params),
    queryFn: () => revenueAnalyticsService.getCompanyRevenueData(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for fetching payment method revenue data
 */
export const usePaymentMethodRevenueData = (params: RevenueAnalyticsQueryParams = {}) => {
  return useQuery({
    queryKey: revenueAnalyticsKeys.paymentMethodRevenue(params),
    queryFn: () => revenueAnalyticsService.getPaymentMethodRevenueData(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for refreshing revenue analytics data
 */
export const useRefreshRevenueAnalytics = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params?: RevenueAnalyticsQueryParams) => {
      // Invalidate all revenue analytics queries
      await queryClient.invalidateQueries({ queryKey: revenueAnalyticsKeys.all });
      
      // Refetch the main analytics data
      if (params) {
        await queryClient.refetchQueries({ queryKey: revenueAnalyticsKeys.list(params) });
      } else {
        await queryClient.refetchQueries({ queryKey: revenueAnalyticsKeys.lists() });
      }
    },
    onSuccess: () => {
      console.log('✅ Revenue analytics data refreshed successfully');
    },
    onError: (error) => {
      console.error('❌ Error refreshing revenue analytics data:', error);
    },
  });
};

/**
 * Hook for prefetching revenue analytics data
 */
export const usePrefetchRevenueAnalytics = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: RevenueAnalyticsQueryParams) => {
      await queryClient.prefetchQuery({
        queryKey: revenueAnalyticsKeys.list(params),
        queryFn: () => revenueAnalyticsService.executeRevenueAnalyticsQuery(params),
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
      });
    },
  });
};

/**
 * Hook for getting summary statistics from cached data
 */
export const useRevenueAnalyticsSummary = (params: RevenueAnalyticsQueryParams = {}) => {
  const { data, isLoading, error } = useRevenueAnalytics(params);
  
  return {
    summary: data?.summary,
    isLoading,
    error,
  };
};

/**
 * Hook for getting paginated revenue analytics data
 */
export const usePaginatedRevenueAnalytics = (
  page: number = 1,
  limit: number = 50,
  filters?: any
) => {
  const params: RevenueAnalyticsQueryParams = {
    page,
    limit,
    filters,
  };
  
  const { data, isLoading, error, refetch } = useRevenueAnalytics(params);
  
  return {
    data: data?.data || [],
    summary: data?.summary,
    pagination: {
      currentPage: data?.page || 1,
      totalPages: data?.totalPages || 1,
      totalRecords: data?.total || 0,
      limit: data?.limit || 50,
    },
    isLoading,
    error,
    refetch,
  };
};

/**
 * Hook for getting filtered revenue analytics data
 */
export const useFilteredRevenueAnalytics = (filters: any) => {
  const params: RevenueAnalyticsQueryParams = {
    filters,
    page: 1,
    limit: 1000, // Get more records for filtered views
  };
  
  return useRevenueAnalytics(params);
};

/**
 * Hook for getting real-time revenue analytics data
 */
export const useRealTimeRevenueAnalytics = (params: RevenueAnalyticsQueryParams = {}) => {
  return useQuery({
    queryKey: revenueAnalyticsKeys.list(params),
    queryFn: () => revenueAnalyticsService.executeRevenueAnalyticsQuery(params),
    staleTime: 30 * 1000, // 30 seconds for real-time updates
    gcTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
};

/**
 * Hook for getting cached revenue analytics data without refetching
 */
export const useCachedRevenueAnalytics = (params: RevenueAnalyticsQueryParams = {}) => {
  return useQuery({
    queryKey: revenueAnalyticsKeys.list(params),
    queryFn: () => revenueAnalyticsService.executeRevenueAnalyticsQuery(params),
    staleTime: Infinity, // Never consider data stale
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
};

/**
 * Hook for getting revenue analytics data with error handling
 */
export const useRevenueAnalyticsWithErrorHandling = (params: RevenueAnalyticsQueryParams = {}) => {
  const { data, isLoading, error, refetch } = useRevenueAnalytics(params);
  
  const handleError = (error: any) => {
    console.error('Revenue Analytics Error:', error);
    
    // You can add custom error handling here
    // For example, showing toast notifications, logging to external services, etc.
    
    if (error?.message?.includes('authentication')) {
      // Handle authentication errors
      console.log('Authentication error detected');
    } else if (error?.message?.includes('network')) {
      // Handle network errors
      console.log('Network error detected');
    } else if (error?.message?.includes('timeout')) {
      // Handle timeout errors
      console.log('Timeout error detected');
    }
  };
  
  if (error) {
    handleError(error);
  }
  
  return {
    data,
    isLoading,
    error,
    refetch,
    hasError: !!error,
    errorMessage: error?.message || '',
  };
};

/**
 * Hook for getting revenue analytics data with loading states
 */
export const useRevenueAnalyticsWithLoadingStates = (params: RevenueAnalyticsQueryParams = {}) => {
  const { data, isLoading, error, refetch, isFetching, isError } = useRevenueAnalytics(params);
  
  return {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    loadingStates: {
      isInitialLoading: isLoading && !data,
      isRefetching: isFetching && data,
      isError,
      hasData: !!data,
      isEmpty: data?.data?.length === 0,
    },
  };
};
