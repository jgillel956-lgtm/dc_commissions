import { useState, useEffect, useCallback, useMemo } from 'react';
import { CommissionType, fetchAllCommissionTypes, searchCommissionTypes, getMockCommissionTypes, mockSearchCommissionTypes } from '../services/commissionTypeApi';

export interface UseCommissionTypeDataReturn {
  // Commission type data
  commissionTypes: CommissionType[];
  selectedCommissionTypes: CommissionType[];
  
  // Loading and error states
  loading: boolean;
  error: string | null;
  
  // Search functionality
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchResults: CommissionType[];
  isSearching: boolean;
  
  // Selection management
  selectedIds: string[];
  toggleCommissionType: (commissionTypeId: string) => void;
  selectCommissionType: (commissionTypeId: string) => void;
  deselectCommissionType: (commissionTypeId: string) => void;
  selectAllCommissionTypes: () => void;
  deselectAllCommissionTypes: () => void;
  setSelectedIds: (ids: string[]) => void;
  
  // Utility functions
  getCommissionTypeById: (id: string) => CommissionType | undefined;
  getCommissionTypesByIds: (ids: string[]) => CommissionType[];
  refreshCommissionTypes: () => Promise<void>;
  
  // Filtering and sorting
  filteredCommissionTypes: CommissionType[];
  sortCommissionTypes: (sortBy: 'name' | 'code' | 'category' | 'commission_rate') => void;
  
  // Category filtering
  selectedCategories: string[];
  toggleCategoryFilter: (category: string) => void;
  clearCategoryFilters: () => void;
  getCommissionTypesByCategory: (category: string) => CommissionType[];
  
  // Statistics
  stats: {
    total: number;
    active: number;
    inactive: number;
    byCategory: Record<string, number>;
    totalCommissions: number;
    totalTransactions: number;
    averageCommissionRate: number;
    averageCommission: number;
  };
}

export interface UseCommissionTypeDataOptions {
  initialSelectedIds?: string[];
  enableSearch?: boolean;
  useMockData?: boolean;
  autoLoad?: boolean;
  enableCategoryFiltering?: boolean;
}

/**
 * Custom hook for managing commission type data with search and selection functionality
 */
export const useCommissionTypeData = (options: UseCommissionTypeDataOptions = {}): UseCommissionTypeDataReturn => {
  const {
    initialSelectedIds = [],
    enableSearch = true,
    useMockData = true, // Use mock data for development
    autoLoad = false, // Don't auto-load by default for testing
    enableCategoryFiltering = true
  } = options;

  // State
  const [commissionTypes, setCommissionTypes] = useState<CommissionType[] | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<CommissionType[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Load commission types on mount
  useEffect(() => {
    if (autoLoad) {
      loadCommissionTypes();
    }
  }, [autoLoad]);

  // Load commission types function
  const loadCommissionTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let commissionTypeData: CommissionType[];
      
      if (useMockData) {
        // Use mock data for development
        const mockResult = getMockCommissionTypes();
        commissionTypeData = mockResult instanceof Promise ? await mockResult : mockResult;
      } else {
        // Use real API
        commissionTypeData = await fetchAllCommissionTypes();
      }
      
      setCommissionTypes(commissionTypeData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load commission types');
      console.error('Error loading commission types:', err);
    } finally {
      setLoading(false);
    }
  }, [useMockData]);

  // Search commission types
  const performSearch = useCallback(async (term: string) => {
    if (!enableSearch || !term.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    try {
      let results: CommissionType[];
      
      if (useMockData) {
        // Use mock search for development
        results = mockSearchCommissionTypes(term);
      } else {
        // Use real API search
        results = await searchCommissionTypes(term);
      }
      
      setSearchResults(results);
    } catch (err) {
      console.error('Error searching commission types:', err);
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

  // Selected commission types (commission types that are in selectedIds)
  const selectedCommissionTypes = useMemo(() => {
    if (!commissionTypes) return [];
    return commissionTypes.filter(type => selectedIds.includes(type.id));
  }, [commissionTypes, selectedIds]);

  // Filtered commission types (considering search results, category filters, and all commission types)
  const filteredCommissionTypes = useMemo(() => {
    if (!commissionTypes) return [];
    
    let filtered = commissionTypes;

    // Apply category filtering if enabled and categories are selected
    if (enableCategoryFiltering && selectedCategories.length > 0) {
      filtered = filtered.filter(type => 
        type.category && selectedCategories.includes(type.category)
      );
    }

    // Apply search results if available
    if (searchTerm && searchResults.length > 0) {
      const searchResultIds = searchResults.map(type => type.id);
      filtered = filtered.filter(type => searchResultIds.includes(type.id));
    }

    // Sort by category first, then by name for better user experience
    if (enableCategoryFiltering && selectedCategories.length > 0) {
      filtered = filtered.sort((a, b) => {
        // First sort by category (in the order of selectedCategories)
        const aCatIndex = selectedCategories.indexOf(a.category);
        const bCatIndex = selectedCategories.indexOf(b.category);
        if (aCatIndex !== bCatIndex) {
          return aCatIndex - bCatIndex;
        }
        // Then sort by name within each category
        return a.name.localeCompare(b.name);
      });
    }

    return filtered;
  }, [commissionTypes, searchTerm, searchResults, selectedCategories, enableCategoryFiltering]);

  // Statistics
  const stats = useMemo(() => {
    if (!commissionTypes) {
      return {
        total: 0,
        active: 0,
        inactive: 0,
        byCategory: {},
        totalCommissions: 0,
        totalTransactions: 0,
        averageCommissionRate: 0,
        averageCommission: 0,
        totalSelected: 0,
        totalCommissionRate: 0,
        totalCommissions: 0,
        totalTransactions: 0
      };
    }
    
    const total = commissionTypes.length;
    const active = commissionTypes.filter(t => t.is_active).length;
    const inactive = commissionTypes.filter(t => !t.is_active).length;
    const byCategory = commissionTypes.reduce((acc, type) => {
      acc[type.category] = (acc[type.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const totalCommissions = commissionTypes.reduce((sum, type) => sum + (type.total_commissions || 0), 0);
    const totalTransactions = commissionTypes.reduce((sum, type) => sum + (type.total_transactions || 0), 0);
    const averageCommissionRate = commissionTypes.length > 0 ? commissionTypes.reduce((sum, type) => sum + type.commission_rate, 0) / commissionTypes.length : 0;
    const averageCommission = commissionTypes.length > 0 ? commissionTypes.reduce((sum, type) => sum + (type.average_commission || 0), 0) / commissionTypes.length : 0;

    // Selected commission types statistics
    const selectedCommissionTypes = commissionTypes.filter(type => selectedIds.includes(type.id));
    const totalSelected = selectedCommissionTypes.length;
    const totalCommissionRate = selectedCommissionTypes.reduce((sum, type) => sum + type.commission_rate, 0);
    const selectedTotalCommissions = selectedCommissionTypes.reduce((sum, type) => sum + (type.total_commissions || 0), 0);
    const selectedTotalTransactions = selectedCommissionTypes.reduce((sum, type) => sum + (type.total_transactions || 0), 0);

    return { 
      total, 
      active, 
      inactive, 
      byCategory, 
      totalCommissions, 
      totalTransactions, 
      averageCommissionRate, 
      averageCommission,
      totalSelected,
      totalCommissionRate,
      selectedTotalCommissions,
      selectedTotalTransactions
    };
  }, [commissionTypes, selectedIds]);

  // Selection management functions
  const toggleCommissionType = useCallback((commissionTypeId: string) => {
    setSelectedIds(prev => 
      prev.includes(commissionTypeId)
        ? prev.filter(id => id !== commissionTypeId)
        : [...prev, commissionTypeId]
    );
  }, []);

  const selectCommissionType = useCallback((commissionTypeId: string) => {
    setSelectedIds(prev => 
      prev.includes(commissionTypeId) ? prev : [...prev, commissionTypeId]
    );
  }, []);

  const deselectCommissionType = useCallback((commissionTypeId: string) => {
    setSelectedIds(prev => prev.filter(id => id !== commissionTypeId));
  }, []);

  const selectAllCommissionTypes = useCallback(() => {
    const allIds = filteredCommissionTypes.map(type => type.id);
    setSelectedIds(allIds);
  }, [filteredCommissionTypes]);

  const deselectAllCommissionTypes = useCallback(() => {
    setSelectedIds([]);
  }, []);

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

  const getCommissionTypesByCategory = useCallback((category: string) => {
    if (!commissionTypes) return [];
    return commissionTypes.filter(type => type.category === category);
  }, [commissionTypes]);

  // Utility functions
  const getCommissionTypeById = useCallback((id: string): CommissionType | undefined => {
    if (!commissionTypes) return undefined;
    return commissionTypes.find(type => type.id === id);
  }, [commissionTypes]);

  const getCommissionTypesByIds = useCallback((ids: string[]): CommissionType[] => {
    if (!commissionTypes) return [];
    return commissionTypes.filter(type => ids.includes(type.id));
  }, [commissionTypes]);

  const refreshCommissionTypes = useCallback(async () => {
    await loadCommissionTypes();
  }, [loadCommissionTypes]);

  // Sorting function
  const sortCommissionTypes = useCallback((sortBy: 'name' | 'code' | 'category' | 'commission_rate') => {
    setCommissionTypes(prev => [...prev].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'code':
          aValue = a.code;
          bValue = b.code;
          break;
        case 'category':
          aValue = a.category;
          bValue = b.category;
          break;
        case 'commission_rate':
          aValue = a.commission_rate;
          bValue = b.commission_rate;
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        return aValue - bValue;
      }
      return 0;
    }));
  }, []);

  return {
    commissionTypes,
    selectedCommissionTypes,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    searchResults,
    isSearching,
    selectedIds,
    toggleCommissionType,
    selectCommissionType,
    deselectCommissionType,
    selectAllCommissionTypes,
    deselectAllCommissionTypes,
    setSelectedIds,
    getCommissionTypeById,
    getCommissionTypesByIds,
    refreshCommissionTypes,
    filteredCommissionTypes,
    sortCommissionTypes,
    selectedCategories,
    toggleCategoryFilter,
    clearCategoryFilters,
    getCommissionTypesByCategory,
    stats,
    // Additional functions for testing
    addToSelection: selectCommissionType,
    removeFromSelection: deselectCommissionType,
    toggleSelection: toggleCommissionType,
    clearSelection: deselectAllCommissionTypes,
    selectAll: selectAllCommissionTypes,
    addCategoryFilter: (category: string) => setSelectedCategories(prev => [...prev, category]),
    removeCategoryFilter: (category: string) => setSelectedCategories(prev => prev.filter(c => c !== category)),
    isSelected: (id: string) => selectedIds.includes(id),
    loadCommissionTypes
  };
};

export default useCommissionTypeData;
