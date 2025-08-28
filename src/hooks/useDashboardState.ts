import { useState, useCallback, useRef, useEffect } from 'react';
import { DashboardFilters, RevenueMasterRecord } from '../types/dashboard';

export type DashboardTab = 'revenue' | 'commission' | 'interest';

export interface DashboardState {
  activeTab: DashboardTab;
  filters: DashboardFilters;
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
  dataVersion: number;
}

export interface TabState {
  filters: DashboardFilters;
  data: RevenueMasterRecord[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    pageSize: number;
  };
  lastUpdated: Date | null;
  dataVersion: number;
}

export interface DashboardStateManager {
  // Current state
  state: DashboardState;
  
  // Tab management
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  getTabState: (tab: DashboardTab) => TabState;
  
  // Filter management
  filters: DashboardFilters;
  updateFilters: (newFilters: Partial<DashboardFilters>) => void;
  resetFilters: () => void;
  clearFilters: () => void;
  
  // Data management
  data: RevenueMasterRecord[];
  setData: (data: RevenueMasterRecord[]) => void;
  updateData: (updater: (data: RevenueMasterRecord[]) => RevenueMasterRecord[]) => void;
  
  // Loading and error states
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  
  // Pagination
  pagination: DashboardState['pagination'];
  setPagination: (pagination: Partial<DashboardState['pagination']>) => void;
  goToPage: (page: number) => void;
  
  // Cache management
  invalidateCache: () => void;
  refreshData: () => void;
  
  // Utility functions
  hasUnsavedChanges: () => boolean;
  exportState: () => DashboardState;
  importState: (state: Partial<DashboardState>) => void;
}

// Default filter values
const DEFAULT_FILTERS: DashboardFilters = {
  date_range: {
    type: 'last_30_days'
  },
  companies: {
    selected_companies: []
  },
  payment_methods: {
    selected_methods: []
  },
  revenue_sources: {
    transaction_fees: false,
    payor_fees: false,
    interest_revenue: false
  },
  employees: {
    selected_employees: []
  },
  commission_types: {
    employee_commissions: false,
    referral_partner_commissions: false,
    interest_commissions: false
  },
  amount_range: {
    min_amount: undefined,
    max_amount: undefined
  },
  disbursement_status: undefined,
  referral_partners: {
    selected_partners: []
  }
};

// Default pagination
const DEFAULT_PAGINATION = {
  currentPage: 1,
  totalPages: 1,
  totalRecords: 0,
  pageSize: 50
};

// Default tab state
const DEFAULT_TAB_STATE: TabState = {
  filters: DEFAULT_FILTERS,
  data: [],
  pagination: DEFAULT_PAGINATION,
  lastUpdated: null,
  dataVersion: 0
};

export const useDashboardState = (initialTab: DashboardTab = 'revenue'): DashboardStateManager => {
  // Main state
  const [state, setState] = useState<DashboardState>({
    activeTab: initialTab,
    filters: DEFAULT_FILTERS,
    data: [],
    loading: false,
    error: null,
    pagination: DEFAULT_PAGINATION,
    lastUpdated: null,
    dataVersion: 0
  });

  // Tab-specific state storage
  const tabStates = useRef<Record<DashboardTab, TabState>>({
    revenue: { ...DEFAULT_TAB_STATE },
    commission: { ...DEFAULT_TAB_STATE },
    interest: { ...DEFAULT_TAB_STATE }
  });

  // Unsaved changes tracking
  const unsavedChanges = useRef<Set<string>>(new Set());

  // Initialize tab state from localStorage if available
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('dashboard-state');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (parsed.tabStates && typeof parsed.tabStates === 'object') {
          tabStates.current = {
            ...tabStates.current,
            ...parsed.tabStates
          };
        }
      }
    } catch (error) {
      console.warn('Failed to load dashboard state from localStorage:', error);
    }
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    try {
      const stateToSave = {
        tabStates: tabStates.current,
        lastSaved: new Date().toISOString()
      };
      localStorage.setItem('dashboard-state', JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('Failed to save dashboard state to localStorage:', error);
    }
  }, [state]);

  // Tab management functions
  const setActiveTab = useCallback((tab: DashboardTab) => {
    setState(prevState => {
      // Save current tab state
      tabStates.current[prevState.activeTab] = {
        filters: prevState.filters,
        data: prevState.data,
        pagination: prevState.pagination,
        lastUpdated: prevState.lastUpdated,
        dataVersion: prevState.dataVersion
      };

      // Load new tab state
      const newTabState = tabStates.current[tab];
      
      return {
        ...prevState,
        activeTab: tab,
        filters: newTabState.filters,
        data: newTabState.data,
        pagination: newTabState.pagination,
        lastUpdated: newTabState.lastUpdated,
        dataVersion: newTabState.dataVersion,
        loading: false,
        error: null
      };
    });
  }, []);

  const getTabState = useCallback((tab: DashboardTab): TabState => {
    return tabStates.current[tab];
  }, []);

  // Filter management functions
  const updateFilters = useCallback((newFilters: Partial<DashboardFilters>) => {
    setState(prevState => {
      const updatedFilters = { ...prevState.filters, ...newFilters };
      
      // Track unsaved changes
      const filterKeys = Object.keys(newFilters);
      filterKeys.forEach(key => unsavedChanges.current.add(`filter-${key}`));
      
      return {
        ...prevState,
        filters: updatedFilters,
        dataVersion: prevState.dataVersion + 1
      };
    });
  }, []);

  const resetFilters = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      filters: DEFAULT_FILTERS,
      dataVersion: prevState.dataVersion + 1
    }));
    unsavedChanges.current.clear();
  }, []);

  const clearFilters = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      filters: DEFAULT_FILTERS,
      dataVersion: prevState.dataVersion + 1
    }));
    unsavedChanges.current.clear();
  }, []);

  // Data management functions
  const setData = useCallback((data: RevenueMasterRecord[]) => {
    setState(prevState => ({
      ...prevState,
      data,
      lastUpdated: new Date(),
      dataVersion: prevState.dataVersion + 1
    }));
  }, []);

  const updateData = useCallback((updater: (data: RevenueMasterRecord[]) => RevenueMasterRecord[]) => {
    setState(prevState => ({
      ...prevState,
      data: updater(prevState.data),
      lastUpdated: new Date(),
      dataVersion: prevState.dataVersion + 1
    }));
  }, []);

  // Loading and error state functions
  const setLoading = useCallback((loading: boolean) => {
    setState(prevState => ({ ...prevState, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prevState => ({ ...prevState, error }));
  }, []);

  // Pagination functions
  const setPagination = useCallback((pagination: Partial<DashboardState['pagination']>) => {
    setState(prevState => ({
      ...prevState,
      pagination: { ...prevState.pagination, ...pagination },
      dataVersion: prevState.dataVersion + 1
    }));
  }, []);

  const goToPage = useCallback((page: number) => {
    setState(prevState => ({
      ...prevState,
      pagination: { ...prevState.pagination, currentPage: page },
      dataVersion: prevState.dataVersion + 1
    }));
  }, []);

  // Cache management functions
  const invalidateCache = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      dataVersion: prevState.dataVersion + 1,
      lastUpdated: null
    }));
  }, []);

  const refreshData = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      dataVersion: prevState.dataVersion + 1,
      lastUpdated: null
    }));
  }, []);

  // Utility functions
  const hasUnsavedChanges = useCallback(() => {
    return unsavedChanges.current.size > 0;
  }, []);

  const exportState = useCallback((): DashboardState => {
    return { ...state };
  }, [state]);

  const importState = useCallback((newState: Partial<DashboardState>) => {
    setState(prevState => ({
      ...prevState,
      ...newState
    }));
  }, []);

  return {
    // Current state
    state,
    
    // Tab management
    activeTab: state.activeTab,
    setActiveTab,
    getTabState,
    
    // Filter management
    filters: state.filters,
    updateFilters,
    resetFilters,
    clearFilters,
    
    // Data management
    data: state.data,
    setData,
    updateData,
    
    // Loading and error states
    loading: state.loading,
    setLoading,
    error: state.error,
    setError,
    
    // Pagination
    pagination: state.pagination,
    setPagination,
    goToPage,
    
    // Cache management
    invalidateCache,
    refreshData,
    
    // Utility functions
    hasUnsavedChanges,
    exportState,
    importState
  };
};
