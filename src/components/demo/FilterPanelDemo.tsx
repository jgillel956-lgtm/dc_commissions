import React, { useState, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import FilterPanel from '../dashboard/FilterPanel';
import { DashboardFilters } from '../../types/dashboard';
import { Filter, RefreshCw, Eye, EyeOff } from 'lucide-react';

const FilterPanelDemo: React.FC = () => {
  const { theme } = useTheme();
  const [filters, setFilters] = useState<DashboardFilters>({
    date_range: { type: 'last_30_days' },
    companies: { selected_companies: [] },
    payment_methods: { selected_methods: [] },
    revenue_sources: { transaction_fees: false, payor_fees: false, interest_revenue: false },
    employees: { selected_employees: [] },
    commission_types: { employee_commissions: false, referral_partner_commissions: false, interest_commissions: false },
    amount_range: { min_amount: 0, max_amount: 100000 },
    disbursement_status: [],
    referral_partners: { selected_partners: [] },
  });

  const [showFilters, setShowFilters] = useState(true);
  const [isCollapsible, setIsCollapsible] = useState(false);
  const [defaultCollapsed, setDefaultCollapsed] = useState(false);
  const [showApplyButton, setShowApplyButton] = useState(true);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: DashboardFilters) => {
    setFilters(newFilters);
    console.log('Filters updated:', newFilters);
  }, []);

  // Clear all filters
  const handleClearAll = useCallback(() => {
    setFilters({
      date_range: { type: 'last_30_days' },
      companies: { selected_companies: [] },
      payment_methods: { selected_methods: [] },
      revenue_sources: { transaction_fees: false, payor_fees: false, interest_revenue: false },
      employees: { selected_employees: [] },
      commission_types: { employee_commissions: false, referral_partner_commissions: false, interest_commissions: false },
      amount_range: { min_amount: 0, max_amount: 100000 },
      disbursement_status: [],
      referral_partners: { selected_partners: [] },
    });
  }, []);

  // Apply filters
  const handleApplyFilters = useCallback(() => {
    console.log('Applying filters:', filters);
    // In a real app, this would trigger data fetching with the new filters
  }, [filters]);

  // Calculate active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    
    if (filters.date_range?.type && filters.date_range.type !== 'last_30_days') count++;
    if (filters.companies?.selected_companies?.length > 0) count++;
    if (filters.payment_methods?.selected_methods?.length > 0) count++;
    if (filters.revenue_sources?.transaction_fees || filters.revenue_sources?.payor_fees || filters.revenue_sources?.interest_revenue) count++;
    if (filters.commission_types?.employee_commissions || filters.commission_types?.referral_partner_commissions || filters.commission_types?.interest_commissions) count++;
    if (filters.amount_range?.min_amount || filters.amount_range?.max_amount) count++;
    if (filters.disbursement_status && filters.disbursement_status.length > 0) count++;
    if (filters.referral_partners?.selected_partners?.length > 0) count++;
    
    return count;
  };

  // Get filter summary
  const getFilterSummary = () => {
    const summary: string[] = [];
    
    if (filters.date_range?.type && filters.date_range.type !== 'last_30_days') {
      summary.push(`Date: ${filters.date_range.type}`);
    }
    if (filters.companies?.selected_companies?.length > 0) {
      summary.push(`Companies: ${filters.companies.selected_companies.length} selected`);
    }
    if (filters.payment_methods?.selected_methods?.length > 0) {
      summary.push(`Payment Methods: ${filters.payment_methods.selected_methods.length} selected`);
    }
    if (filters.revenue_sources?.transaction_fees || filters.revenue_sources?.payor_fees || filters.revenue_sources?.interest_revenue) {
      const sources = [];
      if (filters.revenue_sources.transaction_fees) sources.push('Transaction');
      if (filters.revenue_sources.payor_fees) sources.push('Payor Fees');
      if (filters.revenue_sources.interest_revenue) sources.push('Interest');
      summary.push(`Revenue Sources: ${sources.join(', ')}`);
    }
    if (filters.amount_range?.min_amount || filters.amount_range?.max_amount) {
      summary.push(`Amount: $${filters.amount_range.min_amount?.toLocaleString()} - $${filters.amount_range.max_amount?.toLocaleString()}`);
    }
    
    return summary;
  };

  return (
    <div className={`min-h-screen ${theme.mode === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`border-b ${theme.mode === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold">Filter Panel Demo</h1>
              <span className={`px-3 py-1 rounded-full text-sm ${
                theme.mode === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
              }`}>
                Filter System
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filter Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              {/* Filter Controls */}
              <div className={`mb-4 p-4 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme.mode === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}>
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Filter Controls</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Show Filters</span>
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`p-2 rounded-md ${showFilters ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {showFilters ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Collapsible</span>
                    <input
                      type="checkbox"
                      checked={isCollapsible}
                      onChange={(e) => setIsCollapsible(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Default Collapsed</span>
                    <input
                      type="checkbox"
                      checked={defaultCollapsed}
                      onChange={(e) => setDefaultCollapsed(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Show Apply Button</span>
                    <input
                      type="checkbox"
                      checked={showApplyButton}
                      onChange={(e) => setShowApplyButton(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Filter Panel */}
              {showFilters && (
                <FilterPanel
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  onClearAll={handleClearAll}
                  onApplyFilters={showApplyButton ? handleApplyFilters : undefined}
                  isCollapsible={isCollapsible}
                  defaultCollapsed={defaultCollapsed}
                />
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            {/* Active Filters Summary */}
            <div className={`mb-6 p-4 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme.mode === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900 dark:text-white">Active Filters</h3>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    getActiveFilterCount() > 0 
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {getActiveFilterCount()} active
                  </span>
                  {getActiveFilterCount() > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>
              
              {getActiveFilterCount() > 0 ? (
                <div className="space-y-2">
                  {getFilterSummary().map((summary, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Filter className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{summary}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No active filters</p>
              )}
            </div>

            {/* Filter Details */}
            <div className={`mb-6 p-4 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme.mode === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}>
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">Current Filter State</h3>
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
                <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
                  {JSON.stringify(filters, null, 2)}
                </pre>
              </div>
            </div>

            {/* Demo Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`p-6 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme.mode === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}>
                <h3 className="text-lg font-semibold mb-3">Filter Features</h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• Date range filtering with presets</li>
                  <li>• Multi-select company filtering</li>
                  <li>• Payment method selection</li>
                  <li>• Revenue source filtering</li>
                  <li>• Employee filtering</li>
                  <li>• Commission type filtering</li>
                  <li>• Amount range filtering</li>
                  <li>• Disbursement status filtering</li>
                  <li>• Referral partner filtering</li>
                </ul>
              </div>

              <div className={`p-6 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme.mode === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}>
                <h3 className="text-lg font-semibold mb-3">Interactive Features</h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• Collapsible sections</li>
                  <li>• Search functionality</li>
                  <li>• Active filter count</li>
                  <li>• Clear all filters</li>
                  <li>• Apply filters button</li>
                  <li>• Real-time updates</li>
                  <li>• Dark mode support</li>
                  <li>• Responsive design</li>
                  <li>• Keyboard navigation</li>
                </ul>
              </div>
            </div>

            {/* Usage Instructions */}
            <div className={`mt-6 p-6 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme.mode === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}>
              <h3 className="text-lg font-semibold mb-4">How to Use the Filter Panel</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Step 1: Configure Options</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Use the filter controls on the left to configure the panel behavior. You can toggle visibility, make it collapsible, and control the apply button.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Step 2: Set Filters</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Click on filter sections to expand them and set your desired filter values. The panel will show active filter count and summary.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Step 3: Apply Filters</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Click "Apply Filters" to trigger data fetching with the selected filters. In a real application, this would update the dashboard data.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Step 4: Clear Filters</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Use "Clear All" to reset all filters to their default values. Individual sections also have clear options.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FilterPanelDemo;
