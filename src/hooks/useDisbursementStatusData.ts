import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  DisbursementStatus, 
  getMockDisbursementStatuses, 
  mockSearchDisbursementStatuses,
  fetchAllDisbursementStatuses,
  searchDisbursementStatuses,
  getDisbursementStatusById,
  getDisbursementStatusesByValues,
  getDisbursementStatusStats,
  getActiveDisbursementStatuses,
  getDisbursementStatusByValue,
  getDisbursementStatusesByIds
} from '../services/disbursementStatusApi';

export interface UseDisbursementStatusDataOptions {
  initialSelectedIds?: string[];
  enableSearch?: boolean;
  useMockData?: boolean;
  autoLoad?: boolean;
  enableStats?: boolean;
}

export interface UseDisbursementStatusDataReturn {
  // Data
  disbursementStatuses: DisbursementStatus[] | undefined;
  selectedDisbursementStatuses: DisbursementStatus[];
  filteredDisbursementStatuses: DisbursementStatus[];
  
  // State
  loading: boolean;
  error: string | null;
  searchTerm: string;
  selectedIds: string[];
  
  // Actions
  setSearchTerm: (term: string) => void;
  selectDisbursementStatus: (id: string) => void;
  deselectDisbursementStatus: (id: string) => void;
  toggleDisbursementStatus: (id: string) => void;
  selectAllDisbursementStatuses: () => void;
  deselectAllDisbursementStatuses: () => void;
  setSelectedIds: (ids: string[]) => void;
  
  // Statistics
  stats: {
    totalStatuses: number;
    selectedStatuses: number;
    totalTransactions: number;
    selectedTransactions: number;
    totalAmount: number;
    selectedAmount: number;
  };
  
  // Utility functions
  getDisbursementStatusById: (id: string) => DisbursementStatus | undefined;
  getDisbursementStatusByValue: (value: string) => DisbursementStatus | undefined;
  getDisbursementStatusesByValues: (values: string[]) => DisbursementStatus[];
  isSelected: (id: string) => boolean;
  loadDisbursementStatuses: () => Promise<void>;
}

export const useDisbursementStatusData = (options: UseDisbursementStatusDataOptions = {}): UseDisbursementStatusDataReturn => {
  const {
    initialSelectedIds = [],
    enableSearch = true,
    useMockData = true, // Use mock data for development
    autoLoad = false, // Changed to false for better test control
    enableStats = true
  } = options;

  const [disbursementStatuses, setDisbursementStatuses] = useState<DisbursementStatus[] | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);

  // Load disbursement statuses
  const loadDisbursementStatuses = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let disbursementStatusData: DisbursementStatus[];

      if (useMockData) {
        const mockResult = getMockDisbursementStatuses();
        disbursementStatusData = mockResult instanceof Promise ? await mockResult : mockResult;
      } else {
        disbursementStatusData = await fetchAllDisbursementStatuses();
      }

      setDisbursementStatuses(disbursementStatusData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load disbursement statuses');
      console.error('Error loading disbursement statuses:', err);
    } finally {
      setLoading(false);
    }
  }, [useMockData]);

  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad) {
      loadDisbursementStatuses();
    }
  }, [autoLoad, loadDisbursementStatuses]);

  // Filtered disbursement statuses based on search term
  const filteredDisbursementStatuses = useMemo(() => {
    if (!disbursementStatuses) return [];
    if (!enableSearch || !searchTerm) return disbursementStatuses;

    if (useMockData) {
      return mockSearchDisbursementStatuses(searchTerm);
    } else {
      // In a real app, you might want to debounce this and call the API
      return disbursementStatuses.filter(status =>
        status.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        status.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
        status.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  }, [disbursementStatuses, searchTerm, enableSearch, useMockData]);

  // Selected disbursement statuses
  const selectedDisbursementStatuses = useMemo(() => {
    if (!disbursementStatuses) return [];
    return disbursementStatuses.filter(status => selectedIds.includes(status.id));
  }, [disbursementStatuses, selectedIds]);

  // Statistics
  const stats = useMemo(() => {
    if (!disbursementStatuses) {
      return {
        totalStatuses: 0,
        selectedStatuses: 0,
        totalTransactions: 0,
        selectedTransactions: 0,
        totalAmount: 0,
        selectedAmount: 0
      };
    }

    const totalTransactions = disbursementStatuses.reduce((sum, status) => sum + (status.transaction_count || 0), 0);
    const totalAmount = disbursementStatuses.reduce((sum, status) => sum + (status.total_amount || 0), 0);
    
    const selectedTransactions = selectedDisbursementStatuses.reduce((sum, status) => sum + (status.transaction_count || 0), 0);
    const selectedAmount = selectedDisbursementStatuses.reduce((sum, status) => sum + (status.total_amount || 0), 0);

    return {
      totalStatuses: disbursementStatuses.length,
      selectedStatuses: selectedDisbursementStatuses.length,
      totalTransactions,
      selectedTransactions,
      totalAmount,
      selectedAmount
    };
  }, [disbursementStatuses, selectedDisbursementStatuses]);

  // Selection actions
  const selectDisbursementStatus = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev : [...prev, id]);
  }, []);

  const deselectDisbursementStatus = useCallback((id: string) => {
    setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
  }, []);

  const toggleDisbursementStatus = useCallback((id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  }, []);

  const selectAllDisbursementStatuses = useCallback(() => {
    if (disbursementStatuses) {
      setSelectedIds(disbursementStatuses.map(status => status.id));
    }
  }, [disbursementStatuses]);

  const deselectAllDisbursementStatuses = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // Utility functions
  const getDisbursementStatusById = useCallback((id: string): DisbursementStatus | undefined => {
    if (!disbursementStatuses) return undefined;
    return disbursementStatuses.find(status => status.id === id);
  }, [disbursementStatuses]);

  const getDisbursementStatusByValue = useCallback((value: string): DisbursementStatus | undefined => {
    if (!disbursementStatuses) return undefined;
    return disbursementStatuses.find(status => status.value === value);
  }, [disbursementStatuses]);

  const getDisbursementStatusesByValues = useCallback((values: string[]): DisbursementStatus[] => {
    if (!disbursementStatuses) return [];
    return disbursementStatuses.filter(status => values.includes(status.value));
  }, [disbursementStatuses]);

  const isSelected = useCallback((id: string): boolean => {
    return selectedIds.includes(id);
  }, [selectedIds]);

  return {
    // Data
    disbursementStatuses,
    selectedDisbursementStatuses,
    filteredDisbursementStatuses,
    
    // State
    loading,
    error,
    searchTerm,
    selectedIds,
    
    // Actions
    setSearchTerm,
    selectDisbursementStatus,
    deselectDisbursementStatus,
    toggleDisbursementStatus,
    selectAllDisbursementStatuses,
    deselectAllDisbursementStatuses,
    setSelectedIds,
    
    // Statistics
    stats,
    
    // Utility functions
    getDisbursementStatusById,
    getDisbursementStatusByValue,
    getDisbursementStatusesByValues,
    isSelected,
    loadDisbursementStatuses
  };
};




