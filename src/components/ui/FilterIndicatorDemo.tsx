import React, { useState } from 'react';
import { useDashboardFilters } from '../../hooks/useDashboardFilters';
import FilterStatusDisplay from './FilterStatusDisplay';
import FilterCountBadge from './FilterCountBadge';
import ActiveFilterIndicator from './ActiveFilterIndicator';
import { DashboardFilters } from '../../types/dashboard';

const FilterIndicatorDemo: React.FC = () => {
  const [demoFilters, setDemoFilters] = useState<DashboardFilters>({
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

  const {
    filters,
    updateFilters,
    clearFilters,
    activeFilterCount,
    hasActiveFilters,
    getActiveFilters
  } = useDashboardFilters({
    initialFilters: demoFilters,
    onFiltersChange: setDemoFilters
  });

  const handleAddFilter = (filterType: keyof DashboardFilters) => {
    switch (filterType) {
      case 'date_range':
        updateFilters({ date_range: { type: 'last_90_days' } });
        break;
      case 'companies':
        updateFilters({ companies: { selected_companies: [1, 2, 3] } });
        break;
      case 'amount_range':
        updateFilters({ amount_range: { min_amount: 1000, max_amount: 5000 } });
        break;
      case 'payment_methods':
        updateFilters({ payment_methods: { selected_methods: [10, 20] } });
        break;
      case 'employees':
        updateFilters({ employees: { selected_employees: [50, 60, 70] } });
        break;
    }
  };

  const handleRemoveFilter = (filterKey: keyof DashboardFilters) => {
    switch (filterKey) {
      case 'date_range':
        updateFilters({ date_range: { type: 'last_30_days' } });
        break;
      case 'companies':
        updateFilters({ companies: { selected_companies: [] } });
        break;
      case 'amount_range':
        updateFilters({ amount_range: {} });
        break;
      case 'payment_methods':
        updateFilters({ payment_methods: { selected_methods: [] } });
        break;
      case 'employees':
        updateFilters({ employees: { selected_employees: [] } });
        break;
    }
  };

  const activeFilters = getActiveFilters().map(filter => ({
    key: filter.key,
    label: filter.label,
    value: filter.value,
    onRemove: () => handleRemoveFilter(filter.key as keyof DashboardFilters)
  }));

  return (
    <div className="p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Filter Indicator Components Demo
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Interactive demonstration of active filter indicators and badges
        </p>
      </div>

      {/* Filter Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Add Filters
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleAddFilter('date_range')}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Add Date Range
          </button>
          <button
            onClick={() => handleAddFilter('companies')}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            Add Companies
          </button>
          <button
            onClick={() => handleAddFilter('amount_range')}
            className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors"
          >
            Add Amount Range
          </button>
          <button
            onClick={() => handleAddFilter('payment_methods')}
            className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
          >
            Add Payment Methods
          </button>
          <button
            onClick={() => handleAddFilter('employees')}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
          >
            Add Employees
          </button>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Filter Status Display */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          FilterStatusDisplay Component
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">
              Default (Both Badge and Detailed)
            </h3>
            <FilterStatusDisplay
              filters={filters}
              onClearAll={clearFilters}
              onRemoveFilter={handleRemoveFilter}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">
              Compact Badge Only
            </h3>
            <FilterStatusDisplay
              filters={filters}
              variant="compact"
              onClearAll={clearFilters}
              badgeSize="lg"
              badgeVariant="primary"
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">
              Detailed Indicator Only
            </h3>
            <FilterStatusDisplay
              filters={filters}
              variant="detailed"
              onClearAll={clearFilters}
              onRemoveFilter={handleRemoveFilter}
              maxVisibleFilters={3}
            />
          </div>
        </div>
      </div>

      {/* Individual Components */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Individual Components
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">
              FilterCountBadge Variants
            </h3>
            <div className="flex flex-wrap gap-4">
              <FilterCountBadge count={activeFilterCount} size="sm" variant="default" />
              <FilterCountBadge count={activeFilterCount} size="md" variant="primary" />
              <FilterCountBadge count={activeFilterCount} size="lg" variant="secondary" />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">
              ActiveFilterIndicator
            </h3>
            <ActiveFilterIndicator
              activeFilters={activeFilters}
              totalCount={activeFilterCount}
              onClearAll={clearFilters}
              onRemoveFilter={(filterKey) => handleRemoveFilter(filterKey as keyof DashboardFilters)}
              maxVisibleFilters={3}
            />
          </div>
        </div>
      </div>

      {/* Current Filter State */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Current Filter State
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">
              Active Filters: {activeFilterCount}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Has Active Filters: {hasActiveFilters ? 'Yes' : 'No'}
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">
              Filter Details
            </h3>
            <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto">
              {JSON.stringify(filters, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterIndicatorDemo;

