import React, { useState } from 'react';
import { useDashboardFilters } from '../../hooks/useDashboardFilters';
import { useFilterPersistence } from '../../hooks/useFilterPersistence';
import FilterPersistenceManager from './FilterPersistenceManager';
import FilterStatusDisplay from './FilterStatusDisplay';
import { DashboardFilters } from '../../types/dashboard';
import { Download, Upload, Database, Info } from 'lucide-react';

const FilterPersistenceDemo: React.FC = () => {
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

  // Initialize persistence settings
  const {
    settings,
    updateSettings,
    togglePersistence,
    hasSavedFilters,
    getStorageInfo,
    clearAllPersistence,
    exportSettings,
    importSettings
  } = useFilterPersistence({
    defaultSettings: {
      isEnabled: true,
      persistenceKey: 'demo-dashboard-filters',
      autoSave: true,
      saveOnChange: true
    }
  });

  // Initialize dashboard filters with persistence
  const {
    filters,
    updateFilters,
    clearFilters,
    saveFilters,
    loadFilters,
    clearPersistence: clearFilterPersistence,
    activeFilterCount,
    hasActiveFilters
  } = useDashboardFilters({
    initialFilters: demoFilters,
    enablePersistence: settings.isEnabled,
    persistenceKey: settings.persistenceKey,
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

  const handleTogglePersistence = (enabled: boolean) => {
    updateSettings({ isEnabled: enabled });
  };

  const handleClearPersistence = () => {
    clearFilterPersistence();
    clearAllPersistence();
  };

  const handleSaveFilters = () => {
    saveFilters();
  };

  const handleLoadFilters = () => {
    loadFilters();
  };

  const handleExportSettings = () => {
    const settingsJson = exportSettings();
    const blob = new Blob([settingsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `filter-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const success = importSettings(content);
        if (success) {
          alert('Settings imported successfully!');
        } else {
          alert('Failed to import settings. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  const storageInfo = getStorageInfo();
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Filter Persistence Demo
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive demonstration of filter persistence across browser sessions
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
          Current Filter Status
        </h2>
        <FilterStatusDisplay
          filters={filters}
          onClearAll={clearFilters}
          onRemoveFilter={handleRemoveFilter}
        />
      </div>

      {/* Persistence Manager */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Persistence Management
        </h2>
        <FilterPersistenceManager
          isEnabled={settings.isEnabled}
          onTogglePersistence={handleTogglePersistence}
          onClearPersistence={handleClearPersistence}
          onSaveFilters={handleSaveFilters}
          onLoadFilters={handleLoadFilters}
          hasSavedFilters={hasSavedFilters()}
          persistenceKey={settings.persistenceKey}
          showAdvancedOptions={true}
        />
      </div>

      {/* Storage Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
          <Database className="h-5 w-5" />
          Storage Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Size</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatBytes(storageInfo.totalSize)}
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Items Stored</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {storageInfo.itemCount}
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Available Space</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatBytes(storageInfo.availableSpace)}
            </p>
          </div>
        </div>
      </div>

      {/* Settings Export/Import */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Settings Management
        </h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleExportSettings}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export Settings
          </button>
          
          <label className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors cursor-pointer">
            <Upload className="h-4 w-4" />
            Import Settings
            <input
              type="file"
              accept=".json"
              onChange={handleImportSettings}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Current Settings Display */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Current Settings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">
              Persistence Settings
            </h3>
            <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto">
              {JSON.stringify(settings, null, 2)}
            </pre>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">
              Current Filter State
            </h3>
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Active Filters: {activeFilterCount}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Has Active Filters: {hasActiveFilters ? 'Yes' : 'No'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Persistence Enabled: {settings.isEnabled ? 'Yes' : 'No'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Has Saved Filters: {hasSavedFilters() ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-blue-900 dark:text-blue-100">
          How to Test Persistence
        </h2>
        <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <p>1. <strong>Add some filters</strong> using the buttons above</p>
          <p>2. <strong>Enable persistence</strong> in the Persistence Manager</p>
          <p>3. <strong>Save filters</strong> using the "Save Now" button</p>
          <p>4. <strong>Refresh the page</strong> or close and reopen the browser</p>
          <p>5. <strong>Verify</strong> that your filters are restored automatically</p>
          <p>6. <strong>Try clearing persistence</strong> to reset all saved data</p>
        </div>
      </div>
    </div>
  );
};

export default FilterPersistenceDemo;

