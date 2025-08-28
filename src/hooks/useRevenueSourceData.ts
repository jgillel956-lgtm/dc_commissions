import { useState, useEffect, useCallback, useMemo } from 'react';
import { RevenueSource, fetchAllRevenueSources, searchRevenueSources, getMockRevenueSources, mockSearchRevenueSources } from '../services/revenueSourceApi';

export interface UseRevenueSourceDataReturn {
  // Revenue source data
  revenueSources: RevenueSource[];
  selectedRevenueSources: RevenueSource[];
  
  // Loading and error states
  loading: boolean;
  error: string | null;
  
  // Search functionality
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchResults: RevenueSource[];
  isSearching: boolean;
  
  // Selection management
  selectedIds: number[];
  toggleRevenueSource: (revenueSourceId: number) => void;
  selectRevenueSource: (revenueSourceId: number) => void;
  deselectRevenueSource: (revenueSourceId: number) => void;
  selectAllRevenueSources: () => void;
  deselectAllRevenueSources: () => void;
  setSelectedIds: (ids: number[]) => void;
  
  // Utility functions
  getRevenueSourceById: (id: number) => RevenueSource | undefined;
  getRevenueSourcesByIds: (ids: number[]) => RevenueSource[];
  refreshRevenueSources: () => Promise<void>;
  
  // Filtering and sorting
  filteredRevenueSources: RevenueSource[];
  sortRevenueSources: (sortBy: 'name' | 'type' | 'category' | 'code') => void;
  
  // Type filtering
  selectedTypes: string[];
  toggleTypeFilter: (type: string) => void;
  clearTypeFilters: () => void;
  getRevenueSourcesByType: (type: string) => RevenueSource[];
  
  // Category filtering
  selectedCategories: string[];
  toggleCategoryFilter: (category: string) => void;
  clearCategoryFilters: () => void;
  getRevenueSourcesByCategory: (category: string) => RevenueSource[];
  
  // Statistics
  stats: {
    total: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
    active: number;
    inactive: number;
  };
}

export interface UseRevenueSourceDataOptions {
  initialSelectedIds?: number[];
  enableSearch?: boolean;
  useMockData?: boolean;
  autoLoad?: boolean;
  enableTypeFiltering?: boolean;
  enableCategoryFiltering?: boolean;
}

/**
 * Custom hook for managing revenue source data with search and selection functionality
 */
export const useRevenueSourceData = (options: UseRevenueSourceDataOptions = {}): UseRevenueSourceDataReturn => {
  const {
    initialSelectedIds = [],
    enableSearch = true,
    useMockData = true, // Use mock data for development
    autoLoad = true,
    enableTypeFiltering = true,
    enableCategoryFiltering = true
  } = options;

  // State
  const [revenueSources, setRevenueSources] = useState<RevenueSource[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>(initialSelectedIds);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<RevenueSource[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Load revenue sources on mount
  useEffect(() => {
    if (autoLoad) {
      loadRevenueSources();
    }
  }, [autoLoad]);

  // Load revenue sources function
  const loadRevenueSources = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let revenueSourceData: RevenueSource[];
      
      if (useMockData) {
        // Use mock data for development
        revenueSourceData = getMockRevenueSources();
      } else {
        // Use real API
        revenueSourceData = await fetchAllRevenueSources();
      }
      
      setRevenueSources(revenueSourceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load revenue sources');
      console.error('Error loading revenue sources:', err);
    } finally {
      setLoading(false);
    }
  }, [useMockData]);

  // Search revenue sources
  const performSearch = useCallback(async (term: string) => {
    if (!enableSearch || !term.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    try {
      let results: RevenueSource[];
      
      if (useMockData) {
        // Use mock search for development
        results = mockSearchRevenueSources(term);
      } else {
        // Use real API search
        results = await searchRevenueSources(term);
      }
      
      setSearchResults(results);
    } catch (err) {
      console.error('Error searching revenue sources:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [enableSearch, useMockData]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchTerm);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchTerm, performSearch]);

  // Selected revenue sources (revenue sources that are in selectedIds)
  const selectedRevenueSources = useMemo(() => {
    return revenueSources.filter(source => selectedIds.includes(source.id));
  }, [revenueSources, selectedIds]);

  // Filtered revenue sources (considering search results, type filters, category filters, and all revenue sources)
  const filteredRevenueSources = useMemo(() => {
    let filtered = revenueSources;

    // Apply type filtering if enabled and types are selected
    if (enableTypeFiltering && selectedTypes.length > 0) {
      filtered = filtered.filter(source => 
        source.type && selectedTypes.includes(source.type)
      );
    }

    // Apply category filtering if enabled and categories are selected
    if (enableCategoryFiltering && selectedCategories.length > 0) {
      filtered = filtered.filter(source => 
        source.category && selectedCategories.includes(source.category)
      );
    }

    // Apply search results if available
    if (searchTerm && searchResults.length > 0) {
      const searchResultIds = searchResults.map(source => source.id);
      filtered = filtered.filter(source => searchResultIds.includes(source.id));
    }

    // Sort by type first, then by name for better user experience
    if (enableTypeFiltering && selectedTypes.length > 0) {
      filtered = filtered.sort((a, b) => {
        // First sort by type (in the order of selectedTypes)
        const aTypeIndex = selectedTypes.indexOf(a.type);
        const bTypeIndex = selectedTypes.indexOf(b.type);
        if (aTypeIndex !== bTypeIndex) {
          return aTypeIndex - bTypeIndex;
        }
        // Then sort by name within each type
        return a.name.localeCompare(b.name);
      });
    }

    return filtered;
  }, [revenueSources, searchTerm, searchResults, selectedTypes, selectedCategories, enableTypeFiltering, enableCategoryFiltering]);

  // Statistics
  const stats = useMemo(() => {
    const total = revenueSources.length;
    const byType = revenueSources.reduce((acc, source) => {
      acc[source.type] = (acc[source.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const byCategory = revenueSources.reduce((acc, source) => {
      acc[source.category] = (acc[source.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const active = revenueSources.filter(s => s.is_active).length;
    const inactive = revenueSources.filter(s => !s.is_active).length;

    return { total, byType, byCategory, active, inactive };
  }, [revenueSources]);

  // Selection management functions
  const toggleRevenueSource = useCallback((revenueSourceId: number) => {
    setSelectedIds(prev => 
      prev.includes(revenueSourceId)
        ? prev.filter(id => id !== revenueSourceId)
        : [...prev, revenueSourceId]
    );
  }, []);

  const selectRevenueSource = useCallback((revenueSourceId: number) => {
    setSelectedIds(prev => 
      prev.includes(revenueSourceId) ? prev : [...prev, revenueSourceId]
    );
  }, []);

  const deselectRevenueSource = useCallback((revenueSourceId: number) => {
    setSelectedIds(prev => prev.filter(id => id !== revenueSourceId));
  }, []);

  const selectAllRevenueSources = useCallback(() => {
    const allIds = filteredRevenueSources.map(source => source.id);
    setSelectedIds(allIds);
  }, [filteredRevenueSources]);

  const deselectAllRevenueSources = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // Type filtering functions
  const toggleTypeFilter = useCallback((type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  }, []);

  const clearTypeFilters = useCallback(() => {
    setSelectedTypes([]);
  }, []);

  const getRevenueSourcesByType = useCallback((type: string) => {
    return revenueSources.filter(source => source.type === type);
  }, [revenueSources]);

  // Category filtering functions
  const toggleCategoryFilter = useCallback((category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  }, []);

  const clearCategoryFilters = useCallback(() => {
    setSelectedCategories([]);
  }, []);

  const getRevenueSourcesByCategory = useCallback((category: string) => {
    return revenueSources.filter(source => source.category === category);
  }, [revenueSources]);

  // Utility functions
  const getRevenueSourceById = useCallback((id: number): RevenueSource | undefined => {
    return revenueSources.find(source => source.id === id);
  }, [revenueSources]);

  const getRevenueSourcesByIds = useCallback((ids: number[]): RevenueSource[] => {
    return revenueSources.filter(source => ids.includes(source.id));
  }, [revenueSources]);

  const refreshRevenueSources = useCallback(async () => {
    await loadRevenueSources();
  }, [loadRevenueSources]);

  // Sorting function
  const sortRevenueSources = useCallback((sortBy: 'name' | 'type' | 'category' | 'code') => {
    setRevenueSources(prev => [...prev].sort((a, b) => {
      let aValue: string;
      let bValue: string;

      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'category':
          aValue = a.category;
          bValue = b.category;
          break;
        case 'code':
          aValue = a.code;
          bValue = b.code;
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      return aValue.localeCompare(bValue);
    }));
  }, []);

  return {
    revenueSources,
    selectedRevenueSources,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    searchResults,
    isSearching,
    selectedIds,
    toggleRevenueSource,
    selectRevenueSource,
    deselectRevenueSource,
    selectAllRevenueSources,
    deselectAllRevenueSources,
    setSelectedIds,
    getRevenueSourceById,
    getRevenueSourcesByIds,
    refreshRevenueSources,
    filteredRevenueSources,
    sortRevenueSources,
    selectedTypes,
    toggleTypeFilter,
    clearTypeFilters,
    getRevenueSourcesByType,
    selectedCategories,
    toggleCategoryFilter,
    clearCategoryFilters,
    getRevenueSourcesByCategory,
    stats
  };
};

export default useRevenueSourceData;
