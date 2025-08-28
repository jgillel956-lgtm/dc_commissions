import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useDashboardFilters } from '../../hooks/useDashboardFilters';
import FilterPanel from '../dashboard/FilterPanel';
import { 
  Filter, 
  History, 
  Save, 
  Download, 
  Upload, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Bookmark,
  Trash2,
  Copy,
  FileText
} from 'lucide-react';

const FilterStateDemo: React.FC = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('filters');
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [importData, setImportData] = useState('');

  // Use the comprehensive filter hook
  const {
    filters,
    activeFilters,
    updateFilter,
    updateFilters,
    resetFilters,
    clearAllFilters,
    isValid,
    validationErrors,
    activeFilterCount,
    filterSummary,
    filterHistory,
    saveToHistory,
    loadFromHistory,
    clearHistory,
    filterPresets,
    saveAsPreset,
    loadPreset,
    deletePreset,
    hasChanges,
    originalFilters,
    exportFilters,
    importFilters,
    getFilterDiff,
  } = useDashboardFilters();

  const tabs = [
    { id: 'filters', name: 'Filter Panel', icon: Filter },
    { id: 'history', name: 'Filter History', icon: History },
    { id: 'presets', name: 'Filter Presets', icon: Bookmark },
    { id: 'export', name: 'Export/Import', icon: Download },
    { id: 'state', name: 'State Info', icon: FileText },
  ];

  const handleSavePreset = () => {
    if (presetName.trim()) {
      saveAsPreset(presetName.trim(), presetDescription.trim());
      setPresetName('');
      setPresetDescription('');
      setShowPresetModal(false);
    }
  };

  const handleImportFilters = () => {
    if (importData.trim()) {
      const success = importFilters(importData);
      if (success) {
        setImportData('');
        alert('Filters imported successfully!');
      } else {
        alert('Failed to import filters. Please check the format.');
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className={`min-h-screen ${theme.mode === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`border-b ${theme.mode === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold">Filter State Management Demo</h1>
              <span className={`px-3 py-1 rounded-full text-sm ${
                theme.mode === 'dark' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800'
              }`}>
                Advanced Filter System
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 text-xs rounded-full ${
                activeFilterCount > 0 
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {activeFilterCount} active filters
              </span>
              {hasChanges && (
                <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  Unsaved changes
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className={`border-b ${theme.mode === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'filters' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Filter Panel */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <FilterPanel
                  filters={filters}
                  onFiltersChange={updateFilters}
                  onClearAll={clearAllFilters}
                  onApplyFilters={() => saveToHistory('Applied filters')}
                  isCollapsible={true}
                  defaultCollapsed={false}
                />
              </div>
            </div>

            {/* Content Area */}
            <div className="lg:col-span-3">
              {/* Filter Status */}
              <div className={`mb-6 p-4 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme.mode === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900 dark:text-white">Filter Status</h3>
                  <div className="flex items-center space-x-2">
                    {isValid ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className={`text-sm ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {isValid ? 'Valid' : 'Invalid'}
                    </span>
                  </div>
                </div>
                
                {validationErrors.length > 0 && (
                  <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                    <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">Validation Errors:</h4>
                    <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {filterSummary.length > 0 && (
                  <div className="space-y-2">
                    {filterSummary.map((summary, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Filter className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{summary}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className={`mb-6 p-4 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme.mode === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}>
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    onClick={() => saveToHistory()}
                    className="flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    <span className="text-sm">Save</span>
                  </button>
                  <button
                    onClick={resetFilters}
                    className="flex items-center justify-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span className="text-sm">Reset</span>
                  </button>
                  <button
                    onClick={() => setShowPresetModal(true)}
                    className="flex items-center justify-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    <Bookmark className="h-4 w-4" />
                    <span className="text-sm">Save Preset</span>
                  </button>
                  <button
                    onClick={() => copyToClipboard(exportFilters())}
                    className="flex items-center justify-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                    <span className="text-sm">Export</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Filter History</h2>
              <button
                onClick={clearHistory}
                className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>Clear History</span>
              </button>
            </div>

            {filterHistory.length === 0 ? (
              <div className={`p-8 text-center ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg border ${theme.mode === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No filter history yet. Start using filters to build history.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filterHistory.map((item) => (
                  <div key={item.id} className={`p-4 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme.mode === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">{item.name}</h3>
                      <Clock className="h-4 w-4 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                    <button
                      onClick={() => loadFromHistory(item)}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Load
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'presets' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Filter Presets</h2>
              <button
                onClick={() => setShowPresetModal(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>Save Current as Preset</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterPresets.map((preset) => (
                <div key={preset.id} className={`p-4 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme.mode === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">{preset.name}</h3>
                    {preset.isDefault && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  {preset.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{preset.description}</p>
                  )}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => loadPreset(preset)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Load
                    </button>
                    {!preset.isDefault && (
                      <button
                        onClick={() => deletePreset(preset.id)}
                        className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Export & Import Filters</h2>

            {/* Export Section */}
            <div className={`p-6 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme.mode === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}>
              <h3 className="text-lg font-semibold mb-4">Export Current Filters</h3>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md mb-4">
                <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
                  {exportFilters()}
                </pre>
              </div>
              <button
                onClick={() => copyToClipboard(exportFilters())}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Copy className="h-4 w-4" />
                <span>Copy to Clipboard</span>
              </button>
            </div>

            {/* Import Section */}
            <div className={`p-6 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme.mode === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}>
              <h3 className="text-lg font-semibold mb-4">Import Filters</h3>
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="Paste filter JSON here..."
                className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <div className="flex space-x-3 mt-3">
                <button
                  onClick={handleImportFilters}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  <span>Import</span>
                </button>
                <button
                  onClick={() => setImportData('')}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'state' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Filter State Information</h2>

            {/* Current State */}
            <div className={`p-6 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme.mode === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}>
              <h3 className="text-lg font-semibold mb-4">Current Filter State</h3>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md">
                <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
                  {JSON.stringify(filters, null, 2)}
                </pre>
              </div>
            </div>

            {/* Active Filters */}
            <div className={`p-6 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme.mode === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}>
              <h3 className="text-lg font-semibold mb-4">Active Filters (Non-Default)</h3>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md">
                <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
                  {JSON.stringify(activeFilters, null, 2)}
                </pre>
              </div>
            </div>

            {/* Changes from Original */}
            {hasChanges && (
              <div className={`p-6 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme.mode === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}>
                <h3 className="text-lg font-semibold mb-4">Changes from Original</h3>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md">
                  <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
                    {JSON.stringify(getFilterDiff(), null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Preset Modal */}
      {showPresetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} max-w-md w-full mx-4`}>
            <h3 className="text-lg font-semibold mb-4">Save Filter Preset</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Preset Name
                </label>
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter preset name..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter description..."
                  rows={3}
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleSavePreset}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Save Preset
                </button>
                <button
                  onClick={() => setShowPresetModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterStateDemo;

