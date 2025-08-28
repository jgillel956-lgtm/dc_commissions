import React from 'react';
import { X, Filter } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export interface ActiveFilter {
  key: string;
  label: string;
  value: string;
  onRemove?: () => void;
}

export interface ActiveFilterIndicatorProps {
  activeFilters: ActiveFilter[];
  totalCount: number;
  onClearAll?: () => void;
  onRemoveFilter?: (filterKey: string) => void;
  className?: string;
  showCount?: boolean;
  showIndividualFilters?: boolean;
  maxVisibleFilters?: number;
}

const ActiveFilterIndicator: React.FC<ActiveFilterIndicatorProps> = ({
  activeFilters,
  totalCount,
  onClearAll,
  onRemoveFilter,
  className = '',
  showCount = true,
  showIndividualFilters = true,
  maxVisibleFilters = 5
}) => {
  const { theme } = useTheme();

  // Don't render if no active filters
  if (totalCount === 0) {
    return null;
  }

  const visibleFilters = activeFilters.slice(0, maxVisibleFilters);
  const hiddenCount = activeFilters.length - visibleFilters.length;

  return (
    <div className={`flex flex-wrap items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg ${className}`}>
      {/* Filter Icon and Count */}
      {showCount && (
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">
            {totalCount} active filter{totalCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Individual Filter Tags */}
      {showIndividualFilters && visibleFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {visibleFilters.map((filter) => (
            <div
              key={filter.key}
              className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-md border border-blue-200 dark:border-blue-700"
            >
              <span className="text-blue-600 dark:text-blue-300 font-semibold">
                {filter.label}:
              </span>
              <span className="max-w-32 truncate">{filter.value}</span>
              {onRemoveFilter && (
                <button
                  onClick={() => onRemoveFilter(filter.key)}
                  className="ml-1 p-0.5 hover:bg-blue-200 dark:hover:bg-blue-700 rounded transition-colors"
                  aria-label={`Remove ${filter.label} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}

          {/* Show hidden count if there are more filters */}
          {hiddenCount > 0 && (
            <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-md">
              +{hiddenCount} more
            </div>
          )}
        </div>
      )}

      {/* Clear All Button */}
      {onClearAll && (
        <button
          onClick={onClearAll}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClearAll();
            }
          }}
          className="ml-auto px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded-md transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
};

export default ActiveFilterIndicator;
