import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ReferralPartner, 
  getMockReferralPartners, 
  fetchAllReferralPartners, 
  searchReferralPartners,
  getReferralPartnerById,
  getReferralPartnersByType,
  getReferralPartnersByStatus,
  getReferralPartnerTypes,
  getReferralPartnerStats,
  mockSearchReferralPartners
} from '../services/referralPartnerApi';

/**
 * Options for the useReferralPartnerData hook
 */
export interface UseReferralPartnerDataOptions {
  initialSelectedIds?: string[];
  enableSearch?: boolean;
  useMockData?: boolean;
  autoLoad?: boolean;
  enableTypeFiltering?: boolean;
  enableStatusFiltering?: boolean;
  enableStats?: boolean;
}

/**
 * Return type for the useReferralPartnerData hook
 */
export interface UseReferralPartnerDataReturn {
  // Data
  referralPartners: ReferralPartner[] | undefined;
  selectedReferralPartners: ReferralPartner[];
  filteredReferralPartners: ReferralPartner[];
  
  // State
  loading: boolean;
  error: string | null;
  searchTerm: string;
  selectedIds: string[];
  selectedTypes: string[];
  selectedStatuses: string[];
  
  // Actions
  setSearchTerm: (term: string) => void;
  selectReferralPartner: (id: string) => void;
  deselectReferralPartner: (id: string) => void;
  toggleReferralPartner: (id: string) => void;
  selectAllReferralPartners: () => void;
  deselectAllReferralPartners: () => void;
  setSelectedIds: (ids: string[]) => void;
  
  // Filtering
  addTypeFilter: (type: string) => void;
  removeTypeFilter: (type: string) => void;
  addStatusFilter: (status: string) => void;
  removeStatusFilter: (status: string) => void;
  
  // Statistics
  stats: {
    totalPartners: number;
    selectedPartners: number;
    totalTransactions: number;
    selectedTransactions: number;
    totalAmount: number;
    selectedAmount: number;
    totalCommission: number;
    selectedCommission: number;
  };
  
  // Utility functions
  getReferralPartnerById: (id: string) => ReferralPartner | undefined;
  getReferralPartnersByType: (type: string) => ReferralPartner[];
  getReferralPartnersByStatus: (status: string) => ReferralPartner[];
  getReferralPartnerTypes: () => string[];
  isSelected: (id: string) => boolean;
  loadReferralPartners: () => Promise<void>;
}

/**
 * Custom hook for managing referral partner data with search, selection, and filtering
 */
export const useReferralPartnerData = (options: UseReferralPartnerDataOptions = {}): UseReferralPartnerDataReturn => {
  const {
    initialSelectedIds = [],
    enableSearch = true,
    useMockData = true,
    autoLoad = false,
    enableTypeFiltering = true,
    enableStatusFiltering = true,
    enableStats = true
  } = options;

  // State
  const [referralPartners, setReferralPartners] = useState<ReferralPartner[] | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  // Load referral partners
  const loadReferralPartners = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let referralPartnerData: ReferralPartner[];

      if (useMockData) {
        const mockResult = getMockReferralPartners();
        referralPartnerData = mockResult instanceof Promise ? await mockResult : mockResult;
      } else {
        referralPartnerData = await fetchAllReferralPartners();
      }

      setReferralPartners(referralPartnerData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load referral partners');
      console.error('Error loading referral partners:', err);
    } finally {
      setLoading(false);
    }
  }, [useMockData]);

  // Auto-load data
  useEffect(() => {
    if (autoLoad) {
      loadReferralPartners();
    }
  }, [autoLoad, loadReferralPartners]);

  // Filtered referral partners based on search term
  const filteredReferralPartners = useMemo(() => {
    if (!referralPartners) return [];
    
    let filtered = referralPartners;

    // Apply search filter
    if (enableSearch && searchTerm) {
      if (useMockData) {
        const searchResult = mockSearchReferralPartners(searchTerm);
        filtered = Array.isArray(searchResult) ? searchResult : [];
      } else {
        // For real API, we would need to implement search
        filtered = filtered.filter(partner => 
          partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          partner.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          partner.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          partner.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          partner.type?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
    }

    // Apply type filter
    if (enableTypeFiltering && selectedTypes.length > 0) {
      filtered = filtered.filter(partner => 
        partner.type && selectedTypes.includes(partner.type)
      );
    }

    // Apply status filter
    if (enableStatusFiltering && selectedStatuses.length > 0) {
      filtered = filtered.filter(partner => 
        partner.status && selectedStatuses.includes(partner.status)
      );
    }

    // Sort by name for better UX
    return Array.isArray(filtered) ? filtered.sort((a, b) => a.name.localeCompare(b.name)) : [];
  }, [referralPartners, searchTerm, selectedTypes, selectedStatuses, enableSearch, enableTypeFiltering, enableStatusFiltering, useMockData]);

  // Selected referral partners
  const selectedReferralPartners = useMemo(() => {
    if (!referralPartners || !Array.isArray(referralPartners)) return [];
    return referralPartners.filter(partner => selectedIds.includes(partner.id));
  }, [referralPartners, selectedIds]);

  // Statistics
  const stats = useMemo(() => {
    if (!referralPartners || !Array.isArray(referralPartners)) {
      return {
        totalPartners: 0,
        selectedPartners: 0,
        totalTransactions: 0,
        selectedTransactions: 0,
        totalAmount: 0,
        selectedAmount: 0,
        totalCommission: 0,
        selectedCommission: 0
      };
    }

    const totalStats = referralPartners.reduce((acc, partner) => ({
      totalPartners: acc.totalPartners + 1,
      totalTransactions: acc.totalTransactions + (partner.total_transactions || 0),
      totalAmount: acc.totalAmount + (partner.total_amount || 0),
      totalCommission: acc.totalCommission + (partner.total_commission || 0)
    }), {
      totalPartners: 0,
      totalTransactions: 0,
      totalAmount: 0,
      totalCommission: 0
    });

    const selectedStats = selectedReferralPartners.reduce((acc, partner) => ({
      selectedPartners: acc.selectedPartners + 1,
      selectedTransactions: acc.selectedTransactions + (partner.total_transactions || 0),
      selectedAmount: acc.selectedAmount + (partner.total_amount || 0),
      selectedCommission: acc.selectedCommission + (partner.total_commission || 0)
    }), {
      selectedPartners: 0,
      selectedTransactions: 0,
      selectedAmount: 0,
      selectedCommission: 0
    });

    return {
      ...totalStats,
      ...selectedStats
    };
  }, [referralPartners, selectedReferralPartners]);

  // Selection actions
  const selectReferralPartner = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev : [...prev, id]);
  }, []);

  const deselectReferralPartner = useCallback((id: string) => {
    setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
  }, []);

  const toggleReferralPartner = useCallback((id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  }, []);

  const selectAllReferralPartners = useCallback(() => {
    if (referralPartners && Array.isArray(referralPartners)) {
      setSelectedIds(referralPartners.map(partner => partner.id));
    }
  }, [referralPartners]);

  const deselectAllReferralPartners = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // Filtering actions
  const addTypeFilter = useCallback((type: string) => {
    setSelectedTypes(prev => [...prev, type]);
  }, []);

  const removeTypeFilter = useCallback((type: string) => {
    setSelectedTypes(prev => prev.filter(t => t !== type));
  }, []);

  const addStatusFilter = useCallback((status: string) => {
    setSelectedStatuses(prev => [...prev, status]);
  }, []);

  const removeStatusFilter = useCallback((status: string) => {
    setSelectedStatuses(prev => prev.filter(s => s !== status));
  }, []);

  // Utility functions
  const getReferralPartnerById = useCallback((id: string) => {
    if (!referralPartners || !Array.isArray(referralPartners)) return undefined;
    return referralPartners.find(partner => partner.id === id);
  }, [referralPartners]);

  const getReferralPartnersByType = useCallback((type: string) => {
    if (!referralPartners || !Array.isArray(referralPartners)) return [];
    return referralPartners.filter(partner => partner.type === type);
  }, [referralPartners]);

  const getReferralPartnersByStatus = useCallback((status: string) => {
    if (!referralPartners || !Array.isArray(referralPartners)) return [];
    return referralPartners.filter(partner => partner.status === status);
  }, [referralPartners]);

  const getReferralPartnerTypes = useCallback(() => {
    if (!referralPartners || !Array.isArray(referralPartners)) return [];
    const types = referralPartners.map(partner => partner.type).filter(Boolean) as string[];
    return [...new Set(types)].sort();
  }, [referralPartners]);

  const isSelected = useCallback((id: string) => {
    return selectedIds.includes(id);
  }, [selectedIds]);

  return {
    // Data
    referralPartners,
    selectedReferralPartners,
    filteredReferralPartners,
    
    // State
    loading,
    error,
    searchTerm,
    selectedIds,
    selectedTypes,
    selectedStatuses,
    
    // Actions
    setSearchTerm,
    selectReferralPartner,
    deselectReferralPartner,
    toggleReferralPartner,
    selectAllReferralPartners,
    deselectAllReferralPartners,
    setSelectedIds,
    
    // Filtering
    addTypeFilter,
    removeTypeFilter,
    addStatusFilter,
    removeStatusFilter,
    
    // Statistics
    stats,
    
    // Utility functions
    getReferralPartnerById,
    getReferralPartnersByType,
    getReferralPartnersByStatus,
    getReferralPartnerTypes,
    isSelected,
    loadReferralPartners
  };
};
