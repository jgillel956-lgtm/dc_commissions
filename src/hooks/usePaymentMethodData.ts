import { useState, useEffect, useCallback, useMemo } from 'react';
import { PaymentMethod, fetchAllPaymentMethods, searchPaymentMethods, getMockPaymentMethods, mockSearchPaymentMethods } from '../services/paymentMethodApi';

export interface UsePaymentMethodDataReturn {
  // Payment method data
  paymentMethods: PaymentMethod[];
  selectedPaymentMethods: PaymentMethod[];
  
  // Loading and error states
  loading: boolean;
  error: string | null;
  
  // Search functionality
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchResults: PaymentMethod[];
  isSearching: boolean;
  
  // Selection management
  selectedIds: number[];
  togglePaymentMethod: (paymentMethodId: number) => void;
  selectPaymentMethod: (paymentMethodId: number) => void;
  deselectPaymentMethod: (paymentMethodId: number) => void;
  selectAllPaymentMethods: () => void;
  deselectAllPaymentMethods: () => void;
  setSelectedIds: (ids: number[]) => void;
  
  // Utility functions
  getPaymentMethodById: (id: number) => PaymentMethod | undefined;
  getPaymentMethodsByIds: (ids: number[]) => PaymentMethod[];
  refreshPaymentMethods: () => Promise<void>;
  
  // Filtering and sorting
  filteredPaymentMethods: PaymentMethod[];
  sortPaymentMethods: (sortBy: 'name' | 'type' | 'code') => void;
  
  // Type filtering
  selectedTypes: string[];
  toggleTypeFilter: (type: string) => void;
  clearTypeFilters: () => void;
  getPaymentMethodsByType: (type: string) => PaymentMethod[];
}

export interface UsePaymentMethodDataOptions {
  initialSelectedIds?: number[];
  enableSearch?: boolean;
  useMockData?: boolean;
  autoLoad?: boolean;
  enableTypeFiltering?: boolean;
}

/**
 * Custom hook for managing payment method data with search and selection functionality
 */
export const usePaymentMethodData = (options: UsePaymentMethodDataOptions = {}): UsePaymentMethodDataReturn => {
  const {
    initialSelectedIds = [],
    enableSearch = true,
    useMockData = true, // Use mock data for development
    autoLoad = true,
    enableTypeFiltering = true
  } = options;

  // State
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>(initialSelectedIds);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PaymentMethod[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  // Load payment methods on mount
  useEffect(() => {
    if (autoLoad) {
      loadPaymentMethods();
    }
  }, [autoLoad]);

  // Load payment methods function
  const loadPaymentMethods = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let paymentMethodData: PaymentMethod[];
      
      if (useMockData) {
        // Use mock data for development
        paymentMethodData = getMockPaymentMethods();
      } else {
        // Use real API
        paymentMethodData = await fetchAllPaymentMethods();
      }
      
      setPaymentMethods(paymentMethodData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment methods');
      console.error('Error loading payment methods:', err);
    } finally {
      setLoading(false);
    }
  }, [useMockData]);

  // Search payment methods
  const performSearch = useCallback(async (term: string) => {
    if (!enableSearch || !term.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    try {
      let results: PaymentMethod[];
      
      if (useMockData) {
        // Use mock search for development
        results = mockSearchPaymentMethods(term);
      } else {
        // Use real API search
        results = await searchPaymentMethods(term);
      }
      
      setSearchResults(results);
    } catch (err) {
      console.error('Error searching payment methods:', err);
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

  // Selected payment methods (payment methods that are in selectedIds)
  const selectedPaymentMethods = useMemo(() => {
    return paymentMethods.filter(method => selectedIds.includes(method.id));
  }, [paymentMethods, selectedIds]);

  // Filtered payment methods (considering search results, type filters, and all payment methods)
  const filteredPaymentMethods = useMemo(() => {
    let filtered = paymentMethods;

    // Apply type filtering if enabled and types are selected
    if (enableTypeFiltering && selectedTypes.length > 0) {
      filtered = filtered.filter(method => 
        method.type && selectedTypes.includes(method.type)
      );
    }

    // Apply search results if available
    if (searchTerm && searchResults.length > 0) {
      const searchResultIds = searchResults.map(method => method.id);
      filtered = filtered.filter(method => searchResultIds.includes(method.id));
    }

    return filtered;
  }, [paymentMethods, searchTerm, searchResults, selectedTypes, enableTypeFiltering]);

  // Selection management functions
  const togglePaymentMethod = useCallback((paymentMethodId: number) => {
    setSelectedIds(prev => 
      prev.includes(paymentMethodId)
        ? prev.filter(id => id !== paymentMethodId)
        : [...prev, paymentMethodId]
    );
  }, []);

  const selectPaymentMethod = useCallback((paymentMethodId: number) => {
    setSelectedIds(prev => 
      prev.includes(paymentMethodId) ? prev : [...prev, paymentMethodId]
    );
  }, []);

  const deselectPaymentMethod = useCallback((paymentMethodId: number) => {
    setSelectedIds(prev => prev.filter(id => id !== paymentMethodId));
  }, []);

  const selectAllPaymentMethods = useCallback(() => {
    const allIds = filteredPaymentMethods.map(method => method.id);
    setSelectedIds(allIds);
  }, [filteredPaymentMethods]);

  const deselectAllPaymentMethods = useCallback(() => {
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

  const getPaymentMethodsByType = useCallback((type: string) => {
    return paymentMethods.filter(method => method.type === type);
  }, [paymentMethods]);

  // Utility functions
  const getPaymentMethodById = useCallback((id: number): PaymentMethod | undefined => {
    return paymentMethods.find(method => method.id === id);
  }, [paymentMethods]);

  const getPaymentMethodsByIds = useCallback((ids: number[]): PaymentMethod[] => {
    return paymentMethods.filter(method => ids.includes(method.id));
  }, [paymentMethods]);

  const refreshPaymentMethods = useCallback(async () => {
    await loadPaymentMethods();
  }, [loadPaymentMethods]);

  // Sorting function
  const sortPaymentMethods = useCallback((sortBy: 'name' | 'type' | 'code') => {
    setPaymentMethods(prev => [...prev].sort((a, b) => {
      let aValue: string;
      let bValue: string;

      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'type':
          aValue = a.type || '';
          bValue = b.type || '';
          break;
        case 'code':
          aValue = a.code || '';
          bValue = b.code || '';
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      return aValue.localeCompare(bValue);
    }));
  }, []);

  return {
    paymentMethods,
    selectedPaymentMethods,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    searchResults,
    isSearching,
    selectedIds,
    togglePaymentMethod,
    selectPaymentMethod,
    deselectPaymentMethod,
    selectAllPaymentMethods,
    deselectAllPaymentMethods,
    setSelectedIds,
    getPaymentMethodById,
    getPaymentMethodsByIds,
    refreshPaymentMethods,
    filteredPaymentMethods,
    sortPaymentMethods,
    selectedTypes,
    toggleTypeFilter,
    clearTypeFilters,
    getPaymentMethodsByType
  };
};

export default usePaymentMethodData;




