import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRevenueData } from './useRevenueData';
import { useDashboardFilters } from './useDashboardFilters';
import { DashboardTab } from './useDashboardState';
import { DashboardFilters } from '../types/dashboard';

export interface UseChartDataOptions {
  chartType: 'pie' | 'bar' | 'line' | 'waterfall' | 'table';
  tab: DashboardTab;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableCache?: boolean;
  forceRefresh?: boolean;
  onDataChange?: (data: any[]) => void;
  onError?: (error: string) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export interface ChartDataState {
  data: any[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  cacheHit: boolean;
  filterSummary: string;
  dataVersion: number;
}

export interface UseChartDataReturn {
  // Data state
  data: any[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  cacheHit: boolean;
  filterSummary: string;
  dataVersion: number;
  
  // Actions
  refetch: () => Promise<void>;
  refresh: () => Promise<void>;
  invalidateCache: () => void;
  
  // Filter integration
  updateFilters: (updates: Partial<DashboardFilters>) => void;
  resetFilters: () => void;
  clearFilters: () => void;
  
  // Utilities
  hasData: boolean;
  dataCount: number;
  getDataSummary: () => string;
}

export const useChartData = (options: UseChartDataOptions): UseChartDataReturn => {
  const {
    chartType,
    tab,
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
    enableCache = true,
    forceRefresh = false,
    onDataChange,
    onError,
    onLoadingChange,
  } = options;

  // Hooks
  const { fetchChartData, getCacheStats } = useRevenueData();
  const filterManager = useDashboardFilters({
    enablePersistence: true,
    validateOnChange: true,
    debounceMs: 500,
  });

  // State
  const [state, setState] = useState<ChartDataState>({
    data: [],
    loading: false,
    error: null,
    lastUpdated: null,
    cacheHit: false,
    filterSummary: '',
    dataVersion: 0,
  });

  // Refs
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<{ filters: DashboardFilters; timestamp: number } | null>(null);

  // Memoized filter summary
  const filterSummary = useMemo(() => {
    return filterManager.getFilterSummary();
  }, [filterManager]);

  // Check if filters have changed significantly
  const hasFilterChanges = useCallback((oldFilters: DashboardFilters, newFilters: DashboardFilters): boolean => {
    return JSON.stringify(oldFilters) !== JSON.stringify(newFilters);
  }, []);

  // Fetch data function
  const fetchData = useCallback(async (force: boolean = false) => {
    const currentFilters = filterManager.filters;
    const now = Date.now();
    
    // Check if we need to fetch new data
    const shouldFetch = force || 
      !lastFetchRef.current ||
      hasFilterChanges(lastFetchRef.current.filters, currentFilters) ||
      (now - lastFetchRef.current.timestamp > refreshInterval);

    if (!shouldFetch) {
      return;
    }

    setState(prev => ({ ...prev, loading: true }));
    onLoadingChange?.(true);

    try {
      const result = await fetchChartData(chartType, {
        tab,
        filters: currentFilters,
        forceRefresh: force,
        includeCache: enableCache,
      });

      if (result.error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: result.error,
          cacheHit: false,
        }));
        onError?.(result.error);
        onLoadingChange?.(false);
        return;
      }

      // Update last fetch info
      lastFetchRef.current = {
        filters: currentFilters,
        timestamp: now,
      };

      setState(prev => ({
        ...prev,
        data: result.data,
        loading: false,
        error: null,
        lastUpdated: result.lastUpdated,
        cacheHit: result.lastUpdated !== null,
        filterSummary: filterSummary,
        dataVersion: prev.dataVersion + 1,
      }));

      onDataChange?.(result.data);
      onLoadingChange?.(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch chart data';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        cacheHit: false,
      }));
      
      onError?.(errorMessage);
      onLoadingChange?.(false);
    }
  }, [chartType, tab, filterManager.filters, filterSummary, fetchChartData, enableCache, refreshInterval, hasFilterChanges, onDataChange, onError, onLoadingChange]);

  // Effect to fetch data when filters change
  useEffect(() => {
    fetchData(forceRefresh);
  }, [fetchData, forceRefresh]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshTimerRef.current = setInterval(() => {
        fetchData(false);
      }, refreshInterval);

      return () => {
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, fetchData]);

  // Effect to update filter summary
  useEffect(() => {
    setState(prev => ({
      ...prev,
      filterSummary,
    }));
  }, [filterSummary]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  // Refetch function (same as refresh but with different semantics)
  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  // Invalidate cache function
  const invalidateCache = useCallback(() => {
    lastFetchRef.current = null;
    setState(prev => ({
      ...prev,
      cacheHit: false,
    }));
  }, []);

  // Filter integration functions
  const updateFilters = useCallback((updates: Partial<DashboardFilters>) => {
    filterManager.updateFilters(updates);
  }, [filterManager]);

  const resetFilters = useCallback(() => {
    filterManager.resetFilters();
  }, [filterManager]);

  const clearFilters = useCallback(() => {
    filterManager.clearFilters();
  }, [filterManager]);

  // Utility functions
  const hasData = useMemo(() => {
    return state.data.length > 0;
  }, [state.data]);

  const dataCount = useMemo(() => {
    return state.data.length;
  }, [state.data]);

  const getDataSummary = useCallback(() => {
    if (!hasData) {
      return 'No data available';
    }

    const summary = [`${dataCount} records`];
    
    if (state.filterSummary !== 'No filters applied') {
      summary.push(`(${state.filterSummary})`);
    }
    
    if (state.lastUpdated) {
      summary.push(`Last updated: ${state.lastUpdated.toLocaleTimeString()}`);
    }
    
    if (state.cacheHit) {
      summary.push('(cached)');
    }

    return summary.join(' • ');
  }, [hasData, dataCount, state.filterSummary, state.lastUpdated, state.cacheHit]);

  return {
    // Data state
    data: state.data,
    loading: state.loading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    cacheHit: state.cacheHit,
    filterSummary: state.filterSummary,
    dataVersion: state.dataVersion,
    
    // Actions
    refetch,
    refresh,
    invalidateCache,
    
    // Filter integration
    updateFilters,
    resetFilters,
    clearFilters,
    
    // Utilities
    hasData,
    dataCount,
    getDataSummary,
  };
};

// Specialized hooks for different chart types
export const usePieChartData = (tab: DashboardTab, options?: Omit<UseChartDataOptions, 'chartType'>) => {
  return useChartData({ ...options, chartType: 'pie', tab });
};

export const useBarChartData = (tab: DashboardTab, options?: Omit<UseChartDataOptions, 'chartType'>) => {
  return useChartData({ ...options, chartType: 'bar', tab });
};

export const useLineChartData = (tab: DashboardTab, options?: Omit<UseChartDataOptions, 'chartType'>) => {
  return useChartData({ ...options, chartType: 'line', tab });
};

export const useWaterfallChartData = (tab: DashboardTab, options?: Omit<UseChartDataOptions, 'chartType'>) => {
  return useChartData({ ...options, chartType: 'waterfall', tab });
};

export const useTableData = (tab: DashboardTab, options?: Omit<UseChartDataOptions, 'chartType'>) => {
  return useChartData({ ...options, chartType: 'table', tab });
};

export default useChartData;


