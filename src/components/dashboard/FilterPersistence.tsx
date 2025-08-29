import React, { useMemo } from 'react';
import { DashboardFilters } from '../../types/dashboard';
import { ResponsiveText, ResponsiveButton, ResponsiveCard } from './ResponsiveDesign';

export interface FilterPersistenceProps {
  filters: DashboardFilters;
  onClearFilters: () => void;
  onClearFilter: (filterKey: keyof DashboardFilters) => void;
  onUpdateFilter: (filterKey: keyof DashboardFilters, value: any) => void;
  className?: string;
  showCount?: boolean;
  showClearAll?: boolean;
  showIndividualClear?: boolean;
}

export interface ActiveFilter {
  key: keyof DashboardFilters;
  label: string;
  value: any;
  displayValue: string;
  count?: number;
}

const FilterPersistence: React.FC<FilterPersistenceProps> = ({
  filters,
  onClearFilters,
  onClearFilter,
  onUpdateFilter,
  className = '',
  showCount = true,
  showClearAll = true,
  showIndividualClear = true
}) => {
  // Calculate active filters and their counts
  const activeFilters = useMemo((): ActiveFilter[] => {
    const activeFiltersList: ActiveFilter[] = [];

    // Date range filter
    if (filters.date_range.start_date || filters.date_range.end_date || filters.date_range.type !== 'last_30_days') {
      const startDate = filters.date_range.start_date ? new Date(filters.date_range.start_date).toLocaleDateString() : '';
      const endDate = filters.date_range.end_date ? new Date(filters.date_range.end_date).toLocaleDateString() : '';
      const preset = filters.date_range.type !== 'last_30_days' ? filters.date_range.type : '';
      
      let displayValue = '';
      if (preset) {
        displayValue = preset.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      } else if (startDate && endDate) {
        displayValue = `${startDate} - ${endDate}`;
      } else if (startDate) {
        displayValue = `From ${startDate}`;
      } else if (endDate) {
        displayValue = `Until ${endDate}`;
      }

      activeFiltersList.push({
        key: 'date_range',
        label: 'Date Range',
        value: filters.date_range,
        displayValue
      });
    }

    // Companies filter
    if (filters.companies.selected_companies.length > 0) {
      activeFiltersList.push({
        key: 'companies',
        label: 'Companies',
        value: filters.companies,
        displayValue: filters.companies.selected_companies.length === 1 
          ? `Company ${filters.companies.selected_companies[0]}` 
          : `${filters.companies.selected_companies.length} companies`,
        count: filters.companies.selected_companies.length
      });
    }

    // Payment methods filter
    if (filters.payment_methods.selected_methods.length > 0) {
      activeFiltersList.push({
        key: 'payment_methods',
        label: 'Payment Methods',
        value: filters.payment_methods,
        displayValue: filters.payment_methods.selected_methods.length === 1 
          ? `Method ${filters.payment_methods.selected_methods[0]}` 
          : `${filters.payment_methods.selected_methods.length} methods`,
        count: filters.payment_methods.selected_methods.length
      });
    }

    // Revenue sources filter
    if (filters.revenue_sources?.selected_sources && filters.revenue_sources.selected_sources.length > 0) {
      activeFiltersList.push({
        key: 'revenue_sources',
        label: 'Revenue Sources',
        value: filters.revenue_sources,
        displayValue: filters.revenue_sources.selected_sources.length === 1 
          ? `Source ${filters.revenue_sources.selected_sources[0]}` 
          : `${filters.revenue_sources.selected_sources.length} sources`,
        count: filters.revenue_sources.selected_sources.length
      });
    }

    // Employees filter
    if (filters.employees.selected_employees.length > 0) {
      activeFiltersList.push({
        key: 'employees',
        label: 'Employees',
        value: filters.employees,
        displayValue: filters.employees.selected_employees.length === 1 
          ? `Employee ${filters.employees.selected_employees[0]}` 
          : `${filters.employees.selected_employees.length} employees`,
        count: filters.employees.selected_employees.length
      });
    }

    // Commission types filter
    if (filters.commission_types?.selected_types && filters.commission_types.selected_types.length > 0) {
      activeFiltersList.push({
        key: 'commission_types',
        label: 'Commission Types',
        value: filters.commission_types,
        displayValue: filters.commission_types.selected_types.length === 1 
          ? `Type ${filters.commission_types.selected_types[0]}` 
          : `${filters.commission_types.selected_types.length} types`,
        count: filters.commission_types.selected_types.length
      });
    }

    // Amount range filter
    if (filters.amount_range.min_amount || filters.amount_range.max_amount) {
      const min = filters.amount_range.min_amount ? `$${filters.amount_range.min_amount.toLocaleString()}` : '';
      const max = filters.amount_range.max_amount ? `$${filters.amount_range.max_amount.toLocaleString()}` : '';
      
      let displayValue = '';
      if (min && max) {
        displayValue = `${min} - ${max}`;
      } else if (min) {
        displayValue = `Min ${min}`;
      } else if (max) {
        displayValue = `Max ${max}`;
      }

      activeFiltersList.push({
        key: 'amount_range',
        label: 'Amount Range',
        value: filters.amount_range,
        displayValue
      });
    }

    // Disbursement statuses filter
    if (filters.disbursement_status && filters.disbursement_status.length > 0) {
      activeFiltersList.push({
        key: 'disbursement_status',
        label: 'Disbursement Statuses',
        value: filters.disbursement_status,
        displayValue: filters.disbursement_status.length === 1 
          ? filters.disbursement_status[0] 
          : `${filters.disbursement_status.length} statuses`,
        count: filters.disbursement_status.length
      });
    }

    // Referral partners filter
    if (filters.referral_partners.selected_partners.length > 0) {
      activeFiltersList.push({
        key: 'referral_partners',
        label: 'Referral Partners',
        value: filters.referral_partners,
        displayValue: filters.referral_partners.selected_partners.length === 1 
          ? `Partner ${filters.referral_partners.selected_partners[0]}` 
          : `${filters.referral_partners.selected_partners.length} partners`,
        count: filters.referral_partners.selected_partners.length
      });
    }

    return activeFiltersList;
  }, [filters]);

  const totalActiveFilters = activeFilters.length;

  if (totalActiveFilters === 0) {
    return null;
  }

  return (
    <ResponsiveCard
      className={`bg-blue-50 border-blue-200 ${className}`}
      mobilePadding="p-3"
      tabletPadding="p-4"
      desktopPadding="p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
          </svg>
          <ResponsiveText
            mobileSize="text-sm"
            tabletSize="text-base"
            desktopSize="text-base"
            className="font-medium text-blue-900"
          >
            Active Filters
          </ResponsiveText>
          {showCount && (
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              {totalActiveFilters}
            </span>
          )}
        </div>
        
        {showClearAll && (
          <ResponsiveButton
            onClick={onClearFilters}
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
            mobileSize="text-xs"
            tabletSize="text-sm"
            desktopSize="text-sm"
          >
            Clear All
          </ResponsiveButton>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {activeFilters.map((filter) => (
          <div
            key={filter.key}
            className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-blue-200 rounded-lg shadow-sm"
          >
            <ResponsiveText
              mobileSize="text-xs"
              tabletSize="text-sm"
              desktopSize="text-sm"
              className="font-medium text-blue-900"
            >
              {filter.label}:
            </ResponsiveText>
            
            <ResponsiveText
              mobileSize="text-xs"
              tabletSize="text-sm"
              desktopSize="text-sm"
              className="text-blue-700"
            >
              {filter.displayValue}
            </ResponsiveText>

            {showCount && filter.count && filter.count > 1 && (
              <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                {filter.count}
              </span>
            )}

            {showIndividualClear && (
              <button
                onClick={() => onClearFilter(filter.key)}
                className="ml-1 p-0.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title={`Clear ${filter.label} filter`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </ResponsiveCard>
  );
};

export default FilterPersistence;
