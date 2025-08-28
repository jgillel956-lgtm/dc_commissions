import { useState, useEffect, useCallback, useMemo } from 'react';
import { Company, fetchAllCompanies, searchCompanies, getMockCompanies, mockSearchCompanies } from '../services/companyApi';

export interface UseCompanyDataReturn {
  // Company data
  companies: Company[];
  selectedCompanies: Company[];
  
  // Loading and error states
  loading: boolean;
  error: string | null;
  
  // Search functionality
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchResults: Company[];
  isSearching: boolean;
  
  // Selection management
  selectedIds: number[];
  toggleCompany: (companyId: number) => void;
  selectCompany: (companyId: number) => void;
  deselectCompany: (companyId: number) => void;
  selectAllCompanies: () => void;
  deselectAllCompanies: () => void;
  setSelectedIds: (ids: number[]) => void;
  
  // Utility functions
  getCompanyById: (id: number) => Company | undefined;
  getCompaniesByIds: (ids: number[]) => Company[];
  refreshCompanies: () => Promise<void>;
  
  // Filtering and sorting
  filteredCompanies: Company[];
  sortCompanies: (sortBy: 'name' | 'code') => void;
}

export interface UseCompanyDataOptions {
  initialSelectedIds?: number[];
  enableSearch?: boolean;
  useMockData?: boolean;
  autoLoad?: boolean;
}

/**
 * Custom hook for managing company data with search and selection functionality
 */
export const useCompanyData = (options: UseCompanyDataOptions = {}): UseCompanyDataReturn => {
  const {
    initialSelectedIds = [],
    enableSearch = true,
    useMockData = true, // Use mock data for development
    autoLoad = true
  } = options;

  // State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>(initialSelectedIds);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Company[]>([]);

  // Load companies on mount
  useEffect(() => {
    if (autoLoad) {
      loadCompanies();
    }
  }, [autoLoad]);

  // Load companies function
  const loadCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let companyData: Company[];
      
      if (useMockData) {
        // Use mock data for development
        companyData = getMockCompanies();
      } else {
        // Use real API
        companyData = await fetchAllCompanies();
      }
      
      setCompanies(companyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load companies');
      console.error('Error loading companies:', err);
    } finally {
      setLoading(false);
    }
  }, [useMockData]);

  // Search companies
  const performSearch = useCallback(async (term: string) => {
    if (!enableSearch || !term.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    try {
      let results: Company[];
      
      if (useMockData) {
        // Use mock search for development
        results = mockSearchCompanies(term);
      } else {
        // Use real API search
        results = await searchCompanies(term);
      }
      
      setSearchResults(results);
    } catch (err) {
      console.error('Error searching companies:', err);
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

  // Selected companies (companies that are in selectedIds)
  const selectedCompanies = useMemo(() => {
    return companies.filter(company => selectedIds.includes(company.id));
  }, [companies, selectedIds]);

  // Filtered companies (either search results or all companies)
  const filteredCompanies = useMemo(() => {
    if (searchTerm && searchResults.length > 0) {
      return searchResults;
    }
    return companies;
  }, [searchTerm, searchResults, companies]);

  // Selection management functions
  const toggleCompany = useCallback((companyId: number) => {
    setSelectedIds(prev => 
      prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  }, []);

  const selectCompany = useCallback((companyId: number) => {
    setSelectedIds(prev => 
      prev.includes(companyId) ? prev : [...prev, companyId]
    );
  }, []);

  const deselectCompany = useCallback((companyId: number) => {
    setSelectedIds(prev => prev.filter(id => id !== companyId));
  }, []);

  const selectAllCompanies = useCallback(() => {
    const allIds = filteredCompanies.map(company => company.id);
    setSelectedIds(allIds);
  }, [filteredCompanies]);

  const deselectAllCompanies = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // Utility functions
  const getCompanyById = useCallback((id: number): Company | undefined => {
    return companies.find(company => company.id === id);
  }, [companies]);

  const getCompaniesByIds = useCallback((ids: number[]): Company[] => {
    return companies.filter(company => ids.includes(company.id));
  }, [companies]);

  const refreshCompanies = useCallback(async () => {
    await loadCompanies();
  }, [loadCompanies]);

  // Sorting function
  const sortCompanies = useCallback((sortBy: 'name' | 'code') => {
    setCompanies(prev => [...prev].sort((a, b) => {
      const aValue = sortBy === 'name' ? a.name : a.code || '';
      const bValue = sortBy === 'name' ? b.name : b.code || '';
      return aValue.localeCompare(bValue);
    }));
  }, []);

  return {
    companies,
    selectedCompanies,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    searchResults,
    isSearching,
    selectedIds,
    toggleCompany,
    selectCompany,
    deselectCompany,
    selectAllCompanies,
    deselectAllCompanies,
    setSelectedIds,
    getCompanyById,
    getCompaniesByIds,
    refreshCompanies,
    filteredCompanies,
    sortCompanies
  };
};

export default useCompanyData;

