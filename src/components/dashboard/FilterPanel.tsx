import React, { useState, useCallback, useMemo } from 'react';
import { 
  Calendar, 
  Building, 
  CreditCard, 
  DollarSign, 
  Users, 
  Percent, 
  Sliders, 
  CheckCircle, 
  UserCheck, 
  Search,
  X,
  Filter,
  ChevronDown,
  ChevronUp,
  Clock,
  CalendarDays
} from 'lucide-react';
import { DashboardFilters } from '../../types/dashboard';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  getDateRangePresets, 
  getQuickDateRanges, 
  validateCustomDateRange, 
  formatDateRange 
} from '../../utils/dateRangeUtils';
import { useCompanyData } from '../../hooks/useCompanyData';
import CompanyMultiSelect from '../ui/CompanyMultiSelect';
import { usePaymentMethodData } from '../../hooks/usePaymentMethodData';
import PaymentMethodMultiSelect from '../ui/PaymentMethodMultiSelect';
import { useRevenueSourceData } from '../../hooks/useRevenueSourceData';
import RevenueSourceMultiSelect from '../ui/RevenueSourceMultiSelect';
import { useEmployeeData } from '../../hooks/useEmployeeData';
import EmployeeMultiSelect from '../ui/EmployeeMultiSelect';
import { useCommissionTypeData } from '../../hooks/useCommissionTypeData';
import CommissionTypeMultiSelect from '../ui/CommissionTypeMultiSelect';
import AmountRangeSlider from '../ui/AmountRangeSlider';
import { useDisbursementStatusData } from '../../hooks/useDisbursementStatusData';
import DisbursementStatusMultiSelect from '../ui/DisbursementStatusMultiSelect';
import { useReferralPartnerData } from '../../hooks/useReferralPartnerData';
import ReferralPartnerMultiSelect from '../ui/ReferralPartnerMultiSelect';

export interface FilterPanelProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  onClearAll?: () => void;
  onApplyFilters?: () => void;
  className?: string;
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
  showActiveFilters?: boolean;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  onClearAll,
  onApplyFilters,
  className = '',
  isCollapsible = false,
  defaultCollapsed = false,
  showActiveFilters = true,
}) => {
  const { theme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['date-range']));

  // Toggle section expansion
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  // Update specific filter
  const updateFilter = useCallback((key: keyof DashboardFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  }, [filters, onFiltersChange]);

  // Date range presets and quick options
  const datePresets = getDateRangePresets();
  const quickDateRanges = getQuickDateRanges();
  
  // Custom date validation state
  const [customDateErrors, setCustomDateErrors] = useState<string[]>([]);

  // Revenue source data management
  const {
    revenueSources,
    loading: revenueSourcesLoading,
    error: revenueSourcesError,
    selectedIds: selectedRevenueSourceIds,
    setSelectedIds: setSelectedRevenueSourceIds
  } = useRevenueSourceData({
    initialSelectedIds: filters.revenue_sources?.selected_sources || [],
    useMockData: true // Use mock data for development
  });

  // Employee data management
  const {
    employees,
    loading: employeesLoading,
    error: employeesError,
    selectedIds: selectedEmployeeIds,
    setSelectedIds: setSelectedEmployeeIds
  } = useEmployeeData({
    initialSelectedIds: filters.employees?.selected_employees || [],
    useMockData: true // Use mock data for development
  });

  // Commission type data management
  const {
    commissionTypes,
    loading: commissionTypesLoading,
    error: commissionTypesError,
    selectedIds: selectedCommissionTypeIds,
    setSelectedIds: setSelectedCommissionTypeIds
  } = useCommissionTypeData({
    initialSelectedIds: filters.commission_types?.selected_types || [],
    useMockData: true // Use mock data for development
  });

  // Disbursement status data management
  const {
    disbursementStatuses,
    loading: disbursementStatusesLoading,
    error: disbursementStatusesError,
    selectedIds: selectedDisbursementStatusIds,
    setSelectedIds: setSelectedDisbursementStatusIds
  } = useDisbursementStatusData({
    initialSelectedIds: filters.disbursement_status || [],
    useMockData: true // Use mock data for development
  });

  // Company data management
  const {
    companies,
    loading: companiesLoading,
    error: companiesError,
    selectedIds: selectedCompanyIds,
    setSelectedIds: setSelectedCompanyIds
  } = useCompanyData({
    initialSelectedIds: filters.companies?.selected_companies || [],
    useMockData: true // Use mock data for development
  });

  // Payment method data management
  const {
    paymentMethods,
    loading: paymentMethodsLoading,
    error: paymentMethodsError,
    selectedIds: selectedPaymentMethodIds,
    setSelectedIds: setSelectedPaymentMethodIds
  } = usePaymentMethodData({
    initialSelectedIds: filters.payment_methods?.selected_methods || [],
    useMockData: true // Use mock data for development
  });

  // Referral partner data management
  const {
    referralPartners,
    loading: referralPartnersLoading,
    error: referralPartnersError,
    selectedIds: selectedReferralPartnerIds,
    setSelectedIds: setSelectedReferralPartnerIds
  } = useReferralPartnerData({
    initialSelectedIds: filters.referral_partners?.selected_partners?.map(String) || [],
    useMockData: true // Use mock data for development
  });

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    
    // Date range
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

  // Handle custom date validation
  const handleCustomDateChange = useCallback((field: 'start_date' | 'end_date', value: string) => {
    const newDateRange = {
      ...filters.date_range,
      [field]: value
    };
    
    // Validate custom dates
    if (newDateRange.start_date && newDateRange.end_date) {
      const validation = validateCustomDateRange(newDateRange.start_date, newDateRange.end_date);
      setCustomDateErrors(validation.errors);
    } else {
      setCustomDateErrors([]);
    }
    
    updateFilter('date_range', newDateRange);
  }, [filters.date_range, updateFilter]);

  // Filter section component
  const FilterSection = ({ 
    id, 
    title, 
    icon: Icon, 
    children, 
    isExpanded = true 
  }: {
    id: string;
    title: string;
    icon: any;
    children: React.ReactNode;
    isExpanded?: boolean;
  }) => (
    <div className={`border-b ${theme.mode === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <Icon className="h-5 w-5 text-gray-500" />
          <span className="font-medium text-gray-900 dark:text-white">{title}</span>
        </div>
        {expandedSections.has(id) ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>
      {expandedSections.has(id) && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );

  // Multi-select component
  const MultiSelect = ({ 
    options, 
    selected, 
    onSelectionChange, 
    placeholder = "Select options...",
    searchable = false 
  }: {
    options: Array<{ id: string; name: string }>;
    selected: number[];
    onSelectionChange: (selected: number[]) => void;
    placeholder?: string;
    searchable?: boolean;
  }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredOptions = useMemo(() => {
      if (!searchable || !searchTerm) return options;
      return options.filter(option => 
        option.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }, [options, searchTerm, searchable]);

    const toggleOption = (optionId: string) => {
      const numericId = parseInt(optionId);
      const newSelected = selected.includes(numericId)
        ? selected.filter(id => id !== numericId)
        : [...selected, numericId];
      onSelectionChange(newSelected);
    };

    return (
      <div className="space-y-2">
        {searchable && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        )}
        <div className="max-h-40 overflow-y-auto space-y-1">
          {filteredOptions.map(option => (
            <label key={option.id} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(parseInt(option.id))}
                onChange={() => toggleOption(option.id)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{option.name}</span>
            </label>
          ))}
        </div>
        {selected.length > 0 && (
          <button
            onClick={() => onSelectionChange([])}
            className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
          >
            Clear selection
          </button>
        )}
      </div>
    );
  };



  return (
    <div className={`${className} ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme.mode === 'dark' ? 'border-gray-700' : 'border-gray-200'} rounded-lg shadow-sm`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${theme.mode === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="font-medium text-gray-900 dark:text-white">Filters</h3>
          {activeFilterCount > 0 && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900 dark:text-blue-200">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {onClearAll && activeFilterCount > 0 && (
            <button
              onClick={onClearAll}
              className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              Clear All
            </button>
          )}
          {isCollapsible && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {/* Date Range Filter */}
          <FilterSection id="date-range" title="Date Range" icon={Calendar}>
            <div className="space-y-4">
              {/* Current Date Range Display */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center space-x-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900 dark:text-blue-100">Current Range:</span>
                  <span className="text-blue-700 dark:text-blue-200">
                    {formatDateRange(filters.date_range || { type: 'last_30_days' })}
                  </span>
                </div>
              </div>

              {/* Quick Date Options */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Quick Options
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {quickDateRanges.map(quickRange => (
                    <button
                      key={quickRange.label}
                      onClick={() => updateFilter('date_range', quickRange.filter)}
                      className="px-3 py-2 text-xs border border-gray-300 rounded-md hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300 transition-colors"
                    >
                      {quickRange.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range Presets */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preset Ranges</h4>
                <div className="space-y-2">
                  {datePresets.map(preset => (
                    <label key={preset.value} className="flex items-start space-x-3 cursor-pointer p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">
                      <input
                        type="radio"
                        name="datePreset"
                        value={preset.value}
                        checked={filters.date_range?.type === preset.value}
                        onChange={() => updateFilter('date_range', { type: preset.value })}
                        className="mt-0.5 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {preset.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {preset.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom Date Range */}
              {filters.date_range?.type === 'custom' && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Custom Range</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={filters.date_range?.start_date || ''}
                        onChange={(e) => handleCustomDateChange('start_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={filters.date_range?.end_date || ''}
                        onChange={(e) => handleCustomDateChange('end_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  </div>
                  
                  {/* Custom Date Validation Errors */}
                  {customDateErrors.length > 0 && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                      <div className="text-sm text-red-800 dark:text-red-200">
                        {customDateErrors.map((error, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <X className="h-3 w-3" />
                            <span>{error}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </FilterSection>

          {/* Company Filter */}
          <FilterSection id="companies" title="Companies" icon={Building}>
            <CompanyMultiSelect
              companies={companies}
              selectedIds={selectedCompanyIds}
              onSelectionChange={(selectedIds) => {
                setSelectedCompanyIds(selectedIds);
                updateFilter('companies', { selected_companies: selectedIds });
              }}
              loading={companiesLoading}
              error={companiesError}
              placeholder="Select companies..."
              showCompanyCodes={true}
              allowSelectAll={true}
            />
          </FilterSection>

          {/* Payment Methods Filter */}
          <FilterSection id="payment-methods" title="Payment Methods" icon={CreditCard}>
            <PaymentMethodMultiSelect
              paymentMethods={paymentMethods}
              selectedIds={selectedPaymentMethodIds}
              onSelectionChange={(selectedIds) => {
                setSelectedPaymentMethodIds(selectedIds);
                updateFilter('payment_methods', { selected_methods: selectedIds });
              }}
              loading={paymentMethodsLoading}
              error={paymentMethodsError}
              placeholder="Select payment methods..."
              showPaymentMethodCodes={true}
              showPaymentMethodTypes={true}
              allowSelectAll={true}
              enableTypeFiltering={true}
            />
          </FilterSection>

          {/* Revenue Sources Filter */}
          <FilterSection id="revenue-sources" title="Revenue Sources" icon={DollarSign}>
            <RevenueSourceMultiSelect
              revenueSources={revenueSources}
              selectedIds={selectedRevenueSourceIds}
              onSelectionChange={(selectedIds) => {
                setSelectedRevenueSourceIds(selectedIds);
                updateFilter('revenue_sources', { selected_sources: selectedIds });
              }}
              loading={revenueSourcesLoading}
              error={revenueSourcesError}
              placeholder="Select revenue sources..."
              showRevenueSourceCodes={true}
              showRevenueSourceTypes={true}
              showRevenueSourceCategories={true}
              allowSelectAll={true}
              enableTypeFiltering={true}
              enableCategoryFiltering={true}
            />
          </FilterSection>

          {/* Employees Filter */}
          <FilterSection id="employees" title="Employees" icon={Users}>
            <EmployeeMultiSelect
              employees={employees}
              selectedIds={selectedEmployeeIds}
              onSelectionChange={(selectedIds) => {
                setSelectedEmployeeIds(selectedIds);
                updateFilter('employees', { selected_employees: selectedIds });
              }}
              loading={employeesLoading}
              error={employeesError}
              placeholder="Select employees..."
              showEmployeeIds={true}
              showEmployeeEmails={true}
              showEmployeeDepartments={true}
              showEmployeeRoles={true}
              allowSelectAll={true}
              enableDepartmentFiltering={true}
              enableRoleFiltering={true}
            />
          </FilterSection>

          {/* Commission Types Filter */}
          <FilterSection id="commission-types" title="Commission Types" icon={Percent}>
            <CommissionTypeMultiSelect
              commissionTypes={commissionTypes}
              selectedIds={selectedCommissionTypeIds}
              onSelectionChange={(selectedIds) => {
                setSelectedCommissionTypeIds(selectedIds);
                updateFilter('commission_types', { selected_types: selectedIds });
              }}
              loading={commissionTypesLoading}
              error={commissionTypesError}
              placeholder="Select commission types..."
              showCommissionCodes={true}
              showCommissionRates={true}
              showCommissionStats={true}
              allowSelectAll={true}
              enableCategoryFiltering={true}
            />
          </FilterSection>

          {/* Amount Range Filter */}
          <FilterSection id="amount-range" title="Amount Range" icon={Sliders}>
            <AmountRangeSlider
              min={0}
              max={100000}
              value={{
                min: filters.amount_range?.min_amount || 0,
                max: filters.amount_range?.max_amount || 100000
              }}
              onChange={(value) => updateFilter('amount_range', {
                min_amount: value.min,
                max_amount: value.max
              })}
              step={100}
              label="Transaction Amount"
              showQuickPresets={true}
              showInputs={true}
            />
          </FilterSection>

          {/* Disbursement Status Filter */}
          <FilterSection id="disbursement-status" title="Disbursement Status" icon={CheckCircle}>
            <DisbursementStatusMultiSelect
              disbursementStatuses={disbursementStatuses || []}
              selectedIds={selectedDisbursementStatusIds}
              onSelectionChange={(selectedIds) => {
                setSelectedDisbursementStatusIds(selectedIds);
                // Convert IDs to values for the filter
                const selectedValues = selectedIds.map(id => {
                  const status = disbursementStatuses?.find(s => s.id === id);
                  return status?.value || '';
                }).filter(value => value !== '');
                updateFilter('disbursement_status', selectedValues);
              }}
              loading={disbursementStatusesLoading}
              error={disbursementStatusesError}
              placeholder="Select disbursement statuses..."
              showStatusIcons={true}
              showStatusColors={true}
              showStatusStats={true}
              showStatusDescriptions={true}
              allowSelectAll={true}
              enableSearch={true}
            />
          </FilterSection>

          {/* Referral Partners Filter */}
          <FilterSection id="referral-partners" title="Referral Partners" icon={UserCheck}>
            <ReferralPartnerMultiSelect
              referralPartners={referralPartners || []}
              selectedIds={selectedReferralPartnerIds}
              onSelectionChange={(selectedIds) => {
                setSelectedReferralPartnerIds(selectedIds);
                // Convert string IDs to numbers for the filter
                const selectedNumericIds = selectedIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
                updateFilter('referral_partners', { selected_partners: selectedNumericIds });
              }}
              loading={referralPartnersLoading}
              error={referralPartnersError}
              placeholder="Select referral partners..."
              showPartnerCodes={true}
              showPartnerTypes={true}
              showPartnerEmails={true}
              showPartnerCompanies={true}
              showPartnerStatuses={true}
              showPartnerStats={true}
              allowSelectAll={true}
              enableSearch={true}
              enableTypeFiltering={true}
              enableStatusFiltering={true}
            />
          </FilterSection>
        </div>
      )}

      {/* Footer with Apply Button */}
      {onApplyFilters && !isCollapsed && (
        <div className={`p-4 border-t ${theme.mode === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={onApplyFilters}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;
