import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDashboardState, DashboardTab } from './useDashboardState';
import { DashboardFilters, RevenueMasterRecord } from '../types/dashboard';

export interface DataFetchOptions {
  tab: DashboardTab;
  filters: DashboardFilters;
  page?: number;
  pageSize?: number;
  forceRefresh?: boolean;
  includeCache?: boolean;
}

export interface DataFetchResult {
  data: RevenueMasterRecord[];
  loading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    pageSize: number;
  };
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
  invalidateCache: () => void;
}

export interface ChartDataResult {
  data: any[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
}

export interface CacheEntry {
  data: RevenueMasterRecord[];
  timestamp: number;
  filters: DashboardFilters;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    pageSize: number;
  };
}

// Cache configuration
const CACHE_CONFIG = {
  TTL: 5 * 60 * 1000, // 5 minutes
  MAX_ENTRIES: 50,
  CLEANUP_INTERVAL: 10 * 60 * 1000, // 10 minutes
};

// API endpoints
const API_ENDPOINTS = {
  revenue: '/api/revenue-dashboard',
  commission: '/api/commission-analysis',
  interest: '/api/interest-analysis',
};

export const useRevenueData = (): {
  fetchData: (options: DataFetchOptions) => Promise<DataFetchResult>;
  fetchChartData: (chartType: string, options: DataFetchOptions) => Promise<ChartDataResult>;
  getCachedData: (cacheKey: string) => CacheEntry | null;
  clearCache: () => void;
  getCacheStats: () => { size: number; hits: number; misses: number };
} => {
  const dashboardState = useDashboardState();
  const [cache, setCache] = useState<Map<string, CacheEntry>>(new Map());
  const [cacheStats, setCacheStats] = useState({ hits: 0, misses: 0 });
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup old cache entries
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now();
      setCache(prevCache => {
        const newCache = new Map();
        prevCache.forEach((entry, key) => {
          if (now - entry.timestamp < CACHE_CONFIG.TTL) {
            newCache.set(key, entry);
          }
        });
        return newCache;
      });
    };

    const interval = setInterval(cleanup, CACHE_CONFIG.CLEANUP_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Generate cache key from filters and options
  const generateCacheKey = useCallback((options: DataFetchOptions): string => {
    const { tab, filters, page = 1, pageSize = 50 } = options;
    const filterString = JSON.stringify({
      ...filters,
      page,
      pageSize,
    });
    return `${tab}_${btoa(filterString)}`;
  }, []);

  // Check if filters have changed
  const hasFilterChanges = useCallback((oldFilters: DashboardFilters, newFilters: DashboardFilters): boolean => {
    return JSON.stringify(oldFilters) !== JSON.stringify(newFilters);
  }, []);

  // Fetch data from API
  const fetchFromAPI = useCallback(async (options: DataFetchOptions): Promise<DataFetchResult> => {
    const { tab, filters, page = 1, pageSize = 50 } = options;
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      const endpoint = API_ENDPOINTS[tab];
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        filters: JSON.stringify(filters),
      });

      const response = await fetch(`${endpoint}?${params}`, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        data: result.data || [],
        loading: false,
        error: null,
        pagination: result.pagination || {
          currentPage: page,
          totalPages: 1,
          totalRecords: 0,
          pageSize,
        },
        lastUpdated: new Date(),
        refetch: async () => {
          await fetchFromAPI(options);
        },
        invalidateCache: () => {
          const cacheKey = generateCacheKey(options);
          setCache(prev => {
            const newCache = new Map(prev);
            newCache.delete(cacheKey);
            return newCache;
          });
        },
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      
      return {
        data: [],
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        pagination: {
          currentPage: page,
          totalPages: 1,
          totalRecords: 0,
          pageSize,
        },
        lastUpdated: null,
        refetch: async () => {
          await fetchFromAPI(options);
        },
        invalidateCache: () => {
          const cacheKey = generateCacheKey(options);
          setCache(prev => {
            const newCache = new Map(prev);
            newCache.delete(cacheKey);
            return newCache;
          });
        },
      };
    }
  }, [generateCacheKey]);

  // Main data fetching function
  const fetchData = useCallback(async (options: DataFetchOptions): Promise<DataFetchResult> => {
    const { forceRefresh = false, includeCache = true } = options;
    const cacheKey = generateCacheKey(options);
    
    // Check cache first
    if (includeCache && !forceRefresh) {
      const cachedEntry = cache.get(cacheKey);
      if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_CONFIG.TTL) {
        setCacheStats(prev => ({ ...prev, hits: prev.hits + 1 }));
        
        return {
          data: cachedEntry.data,
          loading: false,
          error: null,
          pagination: cachedEntry.pagination,
          lastUpdated: new Date(cachedEntry.timestamp),
          refetch: async () => {
            await fetchData({ ...options, forceRefresh: true });
          },
          invalidateCache: () => {
            setCache(prev => {
              const newCache = new Map(prev);
              newCache.delete(cacheKey);
              return newCache;
            });
          },
        };
      }
      
      setCacheStats(prev => ({ ...prev, misses: prev.misses + 1 }));
    }

    // Fetch from API
    const result = await fetchFromAPI(options);
    
    // Cache the result
    if (result.data.length > 0 && includeCache) {
      setCache(prev => {
        const newCache = new Map(prev);
        
        // Remove oldest entries if cache is full
        if (newCache.size >= CACHE_CONFIG.MAX_ENTRIES) {
          const oldestKey = newCache.keys().next().value;
          newCache.delete(oldestKey);
        }
        
        newCache.set(cacheKey, {
          data: result.data,
          timestamp: Date.now(),
          filters: options.filters,
          pagination: result.pagination,
        });
        
        return newCache;
      });
    }

    return result;
  }, [cache, generateCacheKey, fetchFromAPI]);

  // Chart-specific data fetching
  const fetchChartData = useCallback(async (
    chartType: string,
    options: DataFetchOptions
  ): Promise<ChartDataResult> => {
    const { tab, filters } = options;
    
    try {
      // Fetch base data
      const baseResult = await fetchData(options);
      
      if (baseResult.error) {
        return {
          data: [],
          loading: false,
          error: baseResult.error,
          lastUpdated: null,
          refetch: async () => {
            await fetchChartData(chartType, options);
          },
        };
      }

      // Transform data for specific chart type
      const transformedData = transformDataForChart(chartType, baseResult.data, filters);
      
      return {
        data: transformedData,
        loading: false,
        error: null,
        lastUpdated: baseResult.lastUpdated,
        refetch: async () => {
          await fetchChartData(chartType, options);
        },
      };
    } catch (error) {
      return {
        data: [],
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch chart data',
        lastUpdated: null,
        refetch: async () => {
          await fetchChartData(chartType, options);
        },
      };
    }
  }, [fetchData]);

  // Transform data for different chart types
  const transformDataForChart = useCallback((
    chartType: string,
    data: RevenueMasterRecord[],
    filters: DashboardFilters
  ): any[] => {
    switch (chartType) {
      case 'pie':
        return transformForPieChart(data, filters);
      case 'bar':
        return transformForBarChart(data, filters);
      case 'line':
        return transformForLineChart(data, filters);
      case 'waterfall':
        return transformForWaterfallChart(data, filters);
      case 'table':
        return transformForDataTable(data, filters);
      default:
        return data;
    }
  }, []);

  // Get cached data
  const getCachedData = useCallback((cacheKey: string): CacheEntry | null => {
    return cache.get(cacheKey) || null;
  }, [cache]);

  // Clear all cache
  const clearCache = useCallback(() => {
    setCache(new Map());
  }, []);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    return {
      size: cache.size,
      hits: cacheStats.hits,
      misses: cacheStats.misses,
    };
  }, [cache.size, cacheStats]);

  return {
    fetchData,
    fetchChartData,
    getCachedData,
    clearCache,
    getCacheStats,
  };
};

// Data transformation functions for different chart types
const transformForPieChart = (data: RevenueMasterRecord[], filters: DashboardFilters): any[] => {
  // Group by company or payment method based on filters
  const groupBy = filters.companies.selected_companies.length > 0 ? 'company' : 'payment_method';
  
  const grouped = data.reduce((acc, record) => {
    const key = groupBy === 'company' ? record.company : record.payment_method_description;
    if (!acc[key]) {
      acc[key] = {
        name: key,
        value: 0,
        revenue: 0,
        transactions: 0,
      };
    }
    
    acc[key].value += record.Total_Combined_Revenue;
    acc[key].revenue += record.Total_Combined_Revenue;
    acc[key].transactions += 1;
    
    return acc;
  }, {} as Record<string, any>);

  return Object.values(grouped).sort((a, b) => b.value - a.value);
};

const transformForBarChart = (data: RevenueMasterRecord[], filters: DashboardFilters): any[] => {
  // Group by date for trend analysis
  const grouped = data.reduce((acc, record) => {
    const date = new Date(record.created_at).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = {
        name: date,
        revenue: 0,
        transactions: 0,
        commission: 0,
      };
    }
    
    acc[date].revenue += record.Total_Combined_Revenue;
    acc[date].transactions += 1;
    acc[date].commission += record.Employee_Commission;
    
    return acc;
  }, {} as Record<string, any>);

  return Object.values(grouped).sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
};

const transformForLineChart = (data: RevenueMasterRecord[], filters: DashboardFilters): any[] => {
  // Similar to bar chart but with more detailed time series
  const grouped = data.reduce((acc, record) => {
    const date = new Date(record.created_at).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = {
        name: date,
        revenue: 0,
        commission: 0,
        profit: 0,
        transactions: 0,
      };
    }
    
    acc[date].revenue += record.Total_Combined_Revenue;
    acc[date].commission += record.Employee_Commission;
    acc[date].profit += record.Final_Net_Profit;
    acc[date].transactions += 1;
    
    return acc;
  }, {} as Record<string, any>);

  return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
};

const transformForWaterfallChart = (data: RevenueMasterRecord[], filters: DashboardFilters): any[] => {
  // Calculate waterfall components
  const totalRevenue = data.reduce((sum, record) => sum + record.Total_Combined_Revenue, 0);
  const totalCosts = data.reduce((sum, record) => sum + record.Total_Vendor_Cost, 0);
  const totalCommissions = data.reduce((sum, record) => sum + record.Employee_Commission, 0);
  const totalPartnerCommissions = data.reduce((sum, record) => sum + record.Referral_Partner_Commission, 0);
  const netProfit = data.reduce((sum, record) => sum + record.Final_Net_Profit, 0);

  return [
    { name: 'Gross Revenue', value: totalRevenue, type: 'start' },
    { name: 'Vendor Costs', value: -totalCosts, type: 'negative' },
    { name: 'Employee Commissions', value: -totalCommissions, type: 'negative' },
    { name: 'Partner Commissions', value: -totalPartnerCommissions, type: 'negative' },
    { name: 'Net Profit', value: netProfit, type: 'end' },
  ];
};

const transformForDataTable = (data: RevenueMasterRecord[], filters: DashboardFilters): any[] => {
  // Return data suitable for table display
  return data.map(record => ({
    id: record.id,
    company: record.company,
    payment_method: record.payment_method_description,
    amount: record.amount,
    revenue: record.Total_Combined_Revenue,
    commission: record.Employee_Commission,
    profit: record.Final_Net_Profit,
    created_at: record.created_at,
    status: record.api_transaction_status,
  }));
};

export default useRevenueData;
