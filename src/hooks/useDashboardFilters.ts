import { useState, useCallback, useMemo, useEffect } from 'react';
import { DashboardFilters, DateRangeFilter, CompanyFilter, PaymentMethodFilter, RevenueSourceFilter, CommissionTypeFilter, AmountRangeFilter, EmployeeFilter, ReferralPartnerFilter } from '../types/dashboard';
import { getDateRangePresets, validateCustomDateRange } from '../utils/dateRangeUtils';

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
    selected_sources: []
  },
  commission_types: {
    selected_types: []
  },
  amount_range: {},
  disbursement_status: [],
  employees: {
    selected_employees: []
  },
  referral_partners: {
    selected_partners: []
  }
};

export interface UseDashboardFiltersOptions {
  initialFilters?: Partial<DashboardFilters>;
  enablePersistence?: boolean;
  persistenceKey?: string;
  onFiltersChange?: (filters: DashboardFilters) => void;
  validateFilters?: boolean;
}

export interface UseDashboardFiltersReturn {
  // Current filter state
  filters: DashboardFilters;
  
  // Filter update functions
  updateFilters: (newFilters: Partial<DashboardFilters>) => void;
  updateFilter: <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => void;
  resetFilters: () => void;
  clearFilters: () => void;
  
  // Individual filter utilities
  updateDateRange: (dateRange: Partial<DateRangeFilter>) => void;
  updateCompanies: (companies: Partial<CompanyFilter>) => void;
  updatePaymentMethods: (paymentMethods: Partial<PaymentMethodFilter>) => void;
  updateRevenueSources: (revenueSources: Partial<RevenueSourceFilter>) => void;
  updateCommissionTypes: (commissionTypes: Partial<CommissionTypeFilter>) => void;
  updateAmountRange: (amountRange: Partial<AmountRangeFilter>) => void;
  updateDisbursementStatus: (statuses: string[]) => void;
  updateEmployees: (employees: Partial<EmployeeFilter>) => void;
  updateReferralPartners: (referralPartners: Partial<ReferralPartnerFilter>) => void;
  
  // Selection utilities
  addCompany: (companyId: number) => void;
  removeCompany: (companyId: number) => void;
  addPaymentMethod: (methodId: number) => void;
  removePaymentMethod: (methodId: number) => void;
  addRevenueSource: (sourceId: number) => void;
  removeRevenueSource: (sourceId: number) => void;
  addCommissionType: (type: string) => void;
  removeCommissionType: (type: string) => void;
  addEmployee: (employeeId: number) => void;
  removeEmployee: (employeeId: number) => void;
  addReferralPartner: (partnerId: number) => void;
  removeReferralPartner: (partnerId: number) => void;
  addDisbursementStatus: (status: string) => void;
  removeDisbursementStatus: (status: string) => void;
  
  // Filter analysis
  activeFilterCount: number;
  hasActiveFilters: boolean;
  getActiveFilters: () => Array<{ key: keyof DashboardFilters; label: string; value: any }>;
  
  // Validation
  validationErrors: string[];
  isValid: boolean;
  
  // Persistence
  saveFilters: () => void;
  loadFilters: () => void;
  clearPersistence: () => void;
}

export const useDashboardFilters = (options: UseDashboardFiltersOptions = {}): UseDashboardFiltersReturn => {
  const {
    initialFilters = {},
    enablePersistence = false,
    persistenceKey = 'dashboard-filters',
    onFiltersChange,
    validateFilters = true
  } = options;

  // Initialize filters with defaults and initial values
  const [filters, setFilters] = useState<DashboardFilters>(() => {
    const mergedFilters = { ...DEFAULT_FILTERS, ...initialFilters };
    
    // Load from persistence if enabled
    if (enablePersistence) {
      try {
        const saved = localStorage.getItem(persistenceKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          return { ...mergedFilters, ...parsed };
        }
      } catch (error) {
        console.warn('Failed to load filters from persistence:', error);
      }
    }
    
    return mergedFilters;
  });

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Update filters function
  const updateFilters = useCallback((newFilters: Partial<DashboardFilters>) => {
    setFilters(prev => {
      const updated = { ...prev, ...newFilters };
      
      // Validate if enabled
      if (validateFilters) {
        const errors = validateDashboardFilters(updated);
        setValidationErrors(errors);
      }
      
      // Call callback if provided
      if (onFiltersChange) {
        onFiltersChange(updated);
      }
      
      return updated;
    });
  }, [validateFilters, onFiltersChange]);

  // Update single filter function
  const updateFilter = useCallback(<K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => {
    updateFilters({ [key]: value } as Partial<DashboardFilters>);
  }, [updateFilters]);

  // Reset filters to defaults
  const resetFilters = useCallback(() => {
    updateFilters(DEFAULT_FILTERS);
  }, [updateFilters]);

  // Clear all filters (set to empty/default values)
  const clearFilters = useCallback(() => {
    updateFilters({
      date_range: { type: 'last_30_days' },
      companies: { selected_companies: [] },
      payment_methods: { selected_methods: [] },
      revenue_sources: { selected_sources: [] },
      commission_types: { selected_types: [] },
      amount_range: {},
      disbursement_status: [],
      employees: { selected_employees: [] },
      referral_partners: { selected_partners: [] }
    });
  }, [updateFilters]);

  // Individual filter update functions
  const updateDateRange = useCallback((dateRange: Partial<DateRangeFilter>) => {
    updateFilter('date_range', { ...filters.date_range, ...dateRange });
  }, [filters.date_range, updateFilter]);

  const updateCompanies = useCallback((companies: Partial<CompanyFilter>) => {
    updateFilter('companies', { ...filters.companies, ...companies });
  }, [filters.companies, updateFilter]);

  const updatePaymentMethods = useCallback((paymentMethods: Partial<PaymentMethodFilter>) => {
    updateFilter('payment_methods', { ...filters.payment_methods, ...paymentMethods });
  }, [filters.payment_methods, updateFilter]);

  const updateRevenueSources = useCallback((revenueSources: Partial<RevenueSourceFilter>) => {
    updateFilter('revenue_sources', { ...filters.revenue_sources, ...revenueSources });
  }, [filters.revenue_sources, updateFilter]);

  const updateCommissionTypes = useCallback((commissionTypes: Partial<CommissionTypeFilter>) => {
    updateFilter('commission_types', { ...filters.commission_types, ...commissionTypes });
  }, [filters.commission_types, updateFilter]);

  const updateAmountRange = useCallback((amountRange: Partial<AmountRangeFilter>) => {
    updateFilter('amount_range', { ...filters.amount_range, ...amountRange });
  }, [filters.amount_range, updateFilter]);

  const updateDisbursementStatus = useCallback((statuses: string[]) => {
    updateFilter('disbursement_status', statuses);
  }, [updateFilter]);

  const updateEmployees = useCallback((employees: Partial<EmployeeFilter>) => {
    updateFilter('employees', { ...filters.employees, ...employees });
  }, [filters.employees, updateFilter]);

  const updateReferralPartners = useCallback((referralPartners: Partial<ReferralPartnerFilter>) => {
    updateFilter('referral_partners', { ...filters.referral_partners, ...referralPartners });
  }, [filters.referral_partners, updateFilter]);

  // Selection utility functions
  const addCompany = useCallback((companyId: number) => {
    if (!filters.companies.selected_companies.includes(companyId)) {
      updateFilters({
        companies: {
          ...filters.companies,
          selected_companies: [...filters.companies.selected_companies, companyId]
        }
      });
    }
  }, [filters.companies, updateFilters]);

  const removeCompany = useCallback((companyId: number) => {
    updateFilters({
      companies: {
        ...filters.companies,
        selected_companies: filters.companies.selected_companies.filter(id => id !== companyId)
      }
    });
  }, [filters.companies, updateFilters]);

  const addPaymentMethod = useCallback((methodId: number) => {
    if (!filters.payment_methods.selected_methods.includes(methodId)) {
      updateFilters({
        payment_methods: {
          ...filters.payment_methods,
          selected_methods: [...filters.payment_methods.selected_methods, methodId]
        }
      });
    }
  }, [filters.payment_methods, updateFilters]);

  const removePaymentMethod = useCallback((methodId: number) => {
    updateFilters({
      payment_methods: {
        ...filters.payment_methods,
        selected_methods: filters.payment_methods.selected_methods.filter(id => id !== methodId)
      }
    });
  }, [filters.payment_methods, updateFilters]);

  const addRevenueSource = useCallback((sourceId: number) => {
    if (!filters.revenue_sources.selected_sources.includes(sourceId)) {
      updateFilters({
        revenue_sources: {
          ...filters.revenue_sources,
          selected_sources: [...filters.revenue_sources.selected_sources, sourceId]
        }
      });
    }
  }, [filters.revenue_sources, updateFilters]);

  const removeRevenueSource = useCallback((sourceId: number) => {
    updateFilters({
      revenue_sources: {
        ...filters.revenue_sources,
        selected_sources: filters.revenue_sources.selected_sources.filter(id => id !== sourceId)
      }
    });
  }, [filters.revenue_sources, updateFilters]);

  const addCommissionType = useCallback((type: string) => {
    if (!filters.commission_types.selected_types.includes(type)) {
      updateFilters({
        commission_types: {
          ...filters.commission_types,
          selected_types: [...filters.commission_types.selected_types, type]
        }
      });
    }
  }, [filters.commission_types, updateFilters]);

  const removeCommissionType = useCallback((type: string) => {
    updateFilters({
      commission_types: {
        ...filters.commission_types,
        selected_types: filters.commission_types.selected_types.filter(t => t !== type)
      }
    });
  }, [filters.commission_types, updateFilters]);

  const addEmployee = useCallback((employeeId: number) => {
    if (!filters.employees.selected_employees.includes(employeeId)) {
      updateFilters({
        employees: {
          ...filters.employees,
          selected_employees: [...filters.employees.selected_employees, employeeId]
        }
      });
    }
  }, [filters.employees, updateFilters]);

  const removeEmployee = useCallback((employeeId: number) => {
    updateFilters({
      employees: {
        ...filters.employees,
        selected_employees: filters.employees.selected_employees.filter(id => id !== employeeId)
      }
    });
  }, [filters.employees, updateFilters]);

  const addReferralPartner = useCallback((partnerId: number) => {
    if (!filters.referral_partners.selected_partners.includes(partnerId)) {
      updateFilters({
        referral_partners: {
          ...filters.referral_partners,
          selected_partners: [...filters.referral_partners.selected_partners, partnerId]
        }
      });
    }
  }, [filters.referral_partners, updateFilters]);

  const removeReferralPartner = useCallback((partnerId: number) => {
    updateFilters({
      referral_partners: {
        ...filters.referral_partners,
        selected_partners: filters.referral_partners.selected_partners.filter(id => id !== partnerId)
      }
    });
  }, [filters.referral_partners, updateFilters]);

  const addDisbursementStatus = useCallback((status: string) => {
    if (!(filters.disbursement_status || []).includes(status)) {
      updateFilters({
        disbursement_status: [...(filters.disbursement_status || []), status]
      });
    }
  }, [filters.disbursement_status, updateFilters]);

  const removeDisbursementStatus = useCallback((status: string) => {
    updateFilters({
      disbursement_status: (filters.disbursement_status || []).filter(s => s !== status)
    });
  }, [filters.disbursement_status, updateFilters]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    
    // Date range (count if not default)
    if (filters.date_range?.type && filters.date_range.type !== 'last_30_days') count++;
    
    // Companies
    if (filters.companies?.selected_companies?.length > 0) count++;
    
    // Payment methods
    if (filters.payment_methods?.selected_methods?.length > 0) count++;
    
    // Revenue sources
    if (filters.revenue_sources?.selected_sources?.length > 0) count++;
    
    // Employees
    if (filters.employees?.selected_employees?.length > 0) count++;
    
    // Commission types
    if (filters.commission_types?.selected_types?.length > 0) count++;
    
    // Amount range
    if (filters.amount_range?.min_amount !== undefined || filters.amount_range?.max_amount !== undefined) {
      if (filters.amount_range.min_amount !== 0 || filters.amount_range.max_amount !== 100000) {
        count++;
      }
    }
    
    // Disbursement status
    if (filters.disbursement_status && filters.disbursement_status.length > 0) count++;
    
    // Referral partners
    if (filters.referral_partners?.selected_partners?.length > 0) count++;
    
    return count;
  }, [filters]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => activeFilterCount > 0, [activeFilterCount]);

  // Get active filters for display
  const getActiveFilters = useCallback(() => {
    const active: Array<{ key: keyof DashboardFilters; label: string; value: any }> = [];
    
    // Date range
    if (filters.date_range?.type && filters.date_range.type !== 'last_30_days') {
      const presets = getDateRangePresets();
      const preset = presets.find(p => p.value === filters.date_range.type);
      active.push({
        key: 'date_range',
        label: 'Date Range',
        value: preset?.label || filters.date_range.type
      });
    }
    
    // Companies
    if (filters.companies?.selected_companies?.length > 0) {
      active.push({
        key: 'companies',
        label: 'Companies',
        value: `${filters.companies.selected_companies.length} selected`
      });
    }
    
    // Payment methods
    if (filters.payment_methods?.selected_methods?.length > 0) {
      active.push({
        key: 'payment_methods',
        label: 'Payment Methods',
        value: `${filters.payment_methods.selected_methods.length} selected`
      });
    }
    
    // Revenue sources
    if (filters.revenue_sources?.selected_sources?.length > 0) {
      active.push({
        key: 'revenue_sources',
        label: 'Revenue Sources',
        value: `${filters.revenue_sources.selected_sources.length} selected`
      });
    }
    
    // Employees
    if (filters.employees?.selected_employees?.length > 0) {
      active.push({
        key: 'employees',
        label: 'Employees',
        value: `${filters.employees.selected_employees.length} selected`
      });
    }
    
    // Commission types
    if (filters.commission_types?.selected_types?.length > 0) {
      active.push({
        key: 'commission_types',
        label: 'Commission Types',
        value: `${filters.commission_types.selected_types.length} selected`
      });
    }
    
    // Amount range
    if (filters.amount_range?.min_amount !== undefined || filters.amount_range?.max_amount !== undefined) {
      if (filters.amount_range.min_amount !== 0 || filters.amount_range.max_amount !== 100000) {
        const min = filters.amount_range.min_amount || 0;
        const max = filters.amount_range.max_amount || 100000;
        active.push({
          key: 'amount_range',
          label: 'Amount Range',
          value: `$${min.toLocaleString()} - $${max.toLocaleString()}`
        });
      }
    }
    
    // Disbursement status
    if (filters.disbursement_status && filters.disbursement_status.length > 0) {
      active.push({
        key: 'disbursement_status',
        label: 'Disbursement Status',
        value: `${filters.disbursement_status.length} selected`
      });
    }
    
    // Referral partners
    if (filters.referral_partners?.selected_partners?.length > 0) {
      active.push({
        key: 'referral_partners',
        label: 'Referral Partners',
        value: `${filters.referral_partners.selected_partners.length} selected`
      });
    }
    
    return active;
  }, [filters]);

  // Validation
  const isValid = useMemo(() => validationErrors.length === 0, [validationErrors]);

  // Persistence functions
  const saveFilters = useCallback(() => {
    if (enablePersistence) {
      try {
        localStorage.setItem(persistenceKey, JSON.stringify(filters));
      } catch (error) {
        console.warn('Failed to save filters to persistence:', error);
      }
    }
  }, [enablePersistence, persistenceKey, filters]);

  const loadFilters = useCallback(() => {
    if (enablePersistence) {
      try {
        const saved = localStorage.getItem(persistenceKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          updateFilters(parsed);
        }
      } catch (error) {
        console.warn('Failed to load filters from persistence:', error);
      }
    }
  }, [enablePersistence, persistenceKey, updateFilters]);

  const clearPersistence = useCallback(() => {
    if (enablePersistence) {
      try {
        localStorage.removeItem(persistenceKey);
      } catch (error) {
        console.warn('Failed to clear filters from persistence:', error);
      }
    }
  }, [enablePersistence, persistenceKey]);

  // Auto-save filters when they change
  useEffect(() => {
    if (enablePersistence) {
      saveFilters();
    }
  }, [filters, enablePersistence, saveFilters]);

  return {
    // Current filter state
    filters,
    
    // Filter update functions
    updateFilters,
    updateFilter,
    resetFilters,
    clearFilters,
    
    // Individual filter utilities
    updateDateRange,
    updateCompanies,
    updatePaymentMethods,
    updateRevenueSources,
    updateCommissionTypes,
    updateAmountRange,
    updateDisbursementStatus,
    updateEmployees,
    updateReferralPartners,
    
    // Selection utilities
    addCompany,
    removeCompany,
    addPaymentMethod,
    removePaymentMethod,
    addRevenueSource,
    removeRevenueSource,
    addCommissionType,
    removeCommissionType,
    addEmployee,
    removeEmployee,
    addReferralPartner,
    removeReferralPartner,
    addDisbursementStatus,
    removeDisbursementStatus,
    
    // Filter analysis
    activeFilterCount,
    hasActiveFilters,
    getActiveFilters,
    
    // Validation
    validationErrors,
    isValid,
    
    // Persistence
    saveFilters,
    loadFilters,
    clearPersistence
  };
};

// Validation function
function validateDashboardFilters(filters: DashboardFilters): string[] {
  const errors: string[] = [];
  
  // Validate date range
  if (filters.date_range?.type === 'custom') {
    if (!filters.date_range.start_date || !filters.date_range.end_date) {
      errors.push('Custom date range requires both start and end dates');
    } else {
      const validation = validateCustomDateRange(filters.date_range.start_date, filters.date_range.end_date);
      errors.push(...validation.errors);
    }
  }
  
  // Validate amount range
  if (filters.amount_range?.min_amount !== undefined && filters.amount_range?.max_amount !== undefined) {
    if (filters.amount_range.min_amount > filters.amount_range.max_amount) {
      errors.push('Minimum amount cannot be greater than maximum amount');
    }
    if (filters.amount_range.min_amount < 0) {
      errors.push('Minimum amount cannot be negative');
    }
  }
  
  return errors;
}
