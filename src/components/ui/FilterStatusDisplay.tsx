import React, { useMemo } from 'react';
import { useDashboardFilters } from '../../hooks/useDashboardFilters';
import ActiveFilterIndicator from './ActiveFilterIndicator';
import FilterCountBadge from './FilterCountBadge';
import { DashboardFilters } from '../../types/dashboard';

export interface FilterStatusDisplayProps {
  filters: DashboardFilters;
  onClearAll?: () => void;
  onRemoveFilter?: (filterKey: keyof DashboardFilters) => void;
  className?: string;
  variant?: 'compact' | 'detailed' | 'both';
  showCount?: boolean;
  showIndividualFilters?: boolean;
  maxVisibleFilters?: number;
  badgeSize?: 'sm' | 'md' | 'lg';
  badgeVariant?: 'default' | 'primary' | 'secondary';
}

const FilterStatusDisplay: React.FC<FilterStatusDisplayProps> = ({
  filters,
  onClearAll,
  onRemoveFilter,
  className = '',
  variant = 'both',
  showCount = true,
  showIndividualFilters = true,
  maxVisibleFilters = 5,
  badgeSize = 'md',
  badgeVariant = 'primary'
}) => {
  // Use the hook to get filter analysis
  const { activeFilterCount, hasActiveFilters, getActiveFilters } = useDashboardFilters({
    initialFilters: filters,
    validateFilters: false
  });

  // Convert active filters to the format expected by ActiveFilterIndicator
  const activeFilters = useMemo(() => {
    const rawActiveFilters = getActiveFilters();
    if (!rawActiveFilters || !Array.isArray(rawActiveFilters)) {
      return [];
    }
    return rawActiveFilters.map(filter => ({
      key: filter.key,
      label: filter.label,
      value: filter.value,
      onRemove: onRemoveFilter ? () => onRemoveFilter(filter.key) : undefined
    }));
  }, [getActiveFilters, onRemoveFilter]);

  // Don't render if no active filters
  if (!hasActiveFilters) {
    return null;
  }

  const handleRemoveFilter = (filterKey: string) => {
    if (onRemoveFilter) {
      onRemoveFilter(filterKey as keyof DashboardFilters);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Compact Badge */}
      {(variant === 'compact' || variant === 'both') && (
        <FilterCountBadge
          count={activeFilterCount}
          onClick={onClearAll}
          size={badgeSize}
          variant={badgeVariant}
        />
      )}

      {/* Detailed Indicator */}
      {(variant === 'detailed' || variant === 'both') && (
        <ActiveFilterIndicator
          activeFilters={activeFilters}
          totalCount={activeFilterCount}
          onClearAll={onClearAll}
          onRemoveFilter={handleRemoveFilter}
          showCount={showCount}
          showIndividualFilters={showIndividualFilters}
          maxVisibleFilters={maxVisibleFilters}
        />
      )}
    </div>
  );
};

export default FilterStatusDisplay;
