import React, { useState, useMemo, useCallback } from 'react';
import { 
  Search, 
  X, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  DollarSign,
  Loader2,
  AlertCircle,
  Filter,
  Tag
} from 'lucide-react';
import { RevenueSource } from '../../services/revenueSourceApi';
import { useTheme } from '../../contexts/ThemeContext';

export interface RevenueSourceMultiSelectProps {
  revenueSources: RevenueSource[];
  selectedIds: number[];
  onSelectionChange: (selectedIds: number[]) => void;
  loading?: boolean;
  error?: string | null;
  placeholder?: string;
  maxHeight?: string;
  showRevenueSourceCodes?: boolean;
  showRevenueSourceTypes?: boolean;
  showRevenueSourceCategories?: boolean;
  allowSelectAll?: boolean;
  enableTypeFiltering?: boolean;
  enableCategoryFiltering?: boolean;
  className?: string;
}

const RevenueSourceMultiSelect: React.FC<RevenueSourceMultiSelectProps> = ({
  revenueSources,
  selectedIds,
  onSelectionChange,
  loading = false,
  error = null,
  placeholder = "Select revenue sources...",
  maxHeight = "max-h-60",
  showRevenueSourceCodes = true,
  showRevenueSourceTypes = true,
  showRevenueSourceCategories = true,
  allowSelectAll = true,
  enableTypeFiltering = true,
  enableCategoryFiltering = true,
  className = ""
}) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSelected, setShowSelected] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Get unique revenue source types
  const revenueSourceTypes = useMemo(() => {
    const types = revenueSources
      .map(source => source.type)
      .filter((type): type is string => !!type);
    return [...new Set(types)];
  }, [revenueSources]);

  // Get unique revenue source categories
  const revenueSourceCategories = useMemo(() => {
    const categories = revenueSources
      .map(source => source.category)
      .filter((category): category is string => !!category);
    return [...new Set(categories)];
  }, [revenueSources]);

  // Filter revenue sources based on search term, type filters, and category filters
  const filteredRevenueSources = useMemo(() => {
    let filtered = revenueSources;

    // Apply type filtering
    if (enableTypeFiltering && selectedTypes.length > 0) {
      filtered = filtered.filter(source => 
        source.type && selectedTypes.includes(source.type)
      );
    }

    // Apply category filtering
    if (enableCategoryFiltering && selectedCategories.length > 0) {
      filtered = filtered.filter(source => 
        source.category && selectedCategories.includes(source.category)
      );
    }

    // Apply search filtering
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(source => 
        source.name.toLowerCase().includes(term) ||
        source.code.toLowerCase().includes(term) ||
        source.description?.toLowerCase().includes(term) ||
        source.category.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [revenueSources, searchTerm, selectedTypes, selectedCategories, enableTypeFiltering, enableCategoryFiltering]);

  // Separate selected and unselected revenue sources
  const { selectedRevenueSources, unselectedRevenueSources } = useMemo(() => {
    const selected = revenueSources.filter(source => selectedIds.includes(source.id));
    const unselected = filteredRevenueSources.filter(source => !selectedIds.includes(source.id));
    return { selectedRevenueSources: selected, unselectedRevenueSources: unselected };
  }, [revenueSources, filteredRevenueSources, selectedIds]);

  // Toggle revenue source selection
  const toggleRevenueSource = useCallback((revenueSourceId: number) => {
    const newSelected = selectedIds.includes(revenueSourceId)
      ? selectedIds.filter(id => id !== revenueSourceId)
      : [...selectedIds, revenueSourceId];
    onSelectionChange(newSelected);
  }, [selectedIds, onSelectionChange]);

  // Select all visible revenue sources
  const selectAllVisible = useCallback(() => {
    const visibleIds = filteredRevenueSources.map(source => source.id);
    const newSelected = [...new Set([...selectedIds, ...visibleIds])];
    onSelectionChange(newSelected);
  }, [filteredRevenueSources, selectedIds, onSelectionChange]);

  // Deselect all
  const deselectAll = useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  // Remove selected revenue source
  const removeSelected = useCallback((revenueSourceId: number) => {
    const newSelected = selectedIds.filter(id => id !== revenueSourceId);
    onSelectionChange(newSelected);
  }, [selectedIds, onSelectionChange]);

  // Toggle type filter
  const toggleTypeFilter = useCallback((type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  }, []);

  // Clear type filters
  const clearTypeFilters = useCallback(() => {
    setSelectedTypes([]);
  }, []);

  // Toggle category filter
  const toggleCategoryFilter = useCallback((category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  }, []);

  // Clear category filters
  const clearCategoryFilters = useCallback(() => {
    setSelectedCategories([]);
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  // Toggle dropdown
  const toggleDropdown = useCallback(() => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
  }, []);

  // Get type label
  const getTypeLabel = useCallback((type: string) => {
    const typeLabels: Record<string, string> = {
      'transaction': 'Transaction',
      'payor': 'Payor',
      'interest': 'Interest',
      'other': 'Other'
    };
    return typeLabels[type] || type;
  }, []);

  // Get type color
  const getTypeColor = useCallback((type: string) => {
    const typeColors: Record<string, string> = {
      'transaction': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'payor': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'interest': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'other': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    };
    return typeColors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }, []);

  // Get category color
  const getCategoryColor = useCallback((category: string) => {
    const categoryColors: Record<string, string> = {
      'Processing Fees': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      'Settlement Fees': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      'Authorization Fees': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
      'Network Fees': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
      'Payor Fees': 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
      'Setup Fees': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      'Monthly Fees': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'Compliance Fees': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'Reserve Interest': 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
      'Deposit Interest': 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-200',
      'Investment Interest': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      'Loan Interest': 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
      'Penalty Fees': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'Maintenance Fees': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    return categoryColors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Selected Revenue Sources Display */}
      {selectedIds.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Selected Revenue Sources ({selectedIds.length})
            </span>
            <button
              onClick={deselectAll}
              className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedRevenueSources.map(source => (
              <div
                key={source.id}
                className="flex items-center space-x-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md text-sm"
              >
                <DollarSign className="h-3 w-3" />
                <span>{source.name}</span>
                {showRevenueSourceCodes && source.code && (
                  <span className="text-xs opacity-75">({source.code})</span>
                )}
                {showRevenueSourceTypes && source.type && (
                  <span className={`text-xs px-1 rounded ${getTypeColor(source.type)}`}>
                    {getTypeLabel(source.type)}
                  </span>
                )}
                {showRevenueSourceCategories && source.category && (
                  <span className={`text-xs px-1 rounded ${getCategoryColor(source.category)}`}>
                    {source.category}
                  </span>
                )}
                <button
                  onClick={() => removeSelected(source.id)}
                  className="ml-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dropdown Trigger */}
      <button
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between p-3 border rounded-md text-left ${
          theme.mode === 'dark' 
            ? 'bg-gray-700 border-gray-600 text-white' 
            : 'bg-white border-gray-300 text-gray-900'
        } hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors`}
      >
        <div className="flex items-center space-x-2">
          <DollarSign className="h-4 w-4 text-gray-500" />
          <span className={selectedIds.length === 0 ? 'text-gray-500' : ''}>
            {selectedIds.length === 0 
              ? placeholder 
              : `${selectedIds.length} revenue source${selectedIds.length !== 1 ? 's' : ''} selected`
            }
          </span>
        </div>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
        ) : (
          isOpen ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )
        )}
      </button>

      {/* Error Display */}
      {error && (
        <div className="mt-2 flex items-center space-x-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`absolute z-50 w-full mt-1 ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} border border-gray-300 dark:border-gray-600 rounded-md shadow-lg`}>
          {/* Search Bar */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search revenue sources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                autoFocus
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Type Filter */}
          {enableTypeFiltering && revenueSourceTypes.length > 0 && (
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                  <Filter className="h-4 w-4 mr-1" />
                  Filter by Type
                </span>
                {selectedTypes.length > 0 && (
                  <button
                    onClick={clearTypeFilters}
                    className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {revenueSourceTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => toggleTypeFilter(type)}
                    className={`px-2 py-1 text-xs rounded-full transition-colors ${
                      selectedTypes.includes(type)
                        ? `${getTypeColor(type)}`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {getTypeLabel(type)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category Filter */}
          {enableCategoryFiltering && revenueSourceCategories.length > 0 && (
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                  <Tag className="h-4 w-4 mr-1" />
                  Filter by Category
                </span>
                {selectedCategories.length > 0 && (
                  <button
                    onClick={clearCategoryFilters}
                    className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {revenueSourceCategories.map(category => (
                  <button
                    key={category}
                    onClick={() => toggleCategoryFilter(category)}
                    className={`px-2 py-1 text-xs rounded-full transition-colors ${
                      selectedCategories.includes(category)
                        ? `${getCategoryColor(category)}`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* View Toggle */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowSelected(false)}
              className={`flex-1 px-3 py-2 text-sm font-medium ${
                !showSelected 
                  ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              All ({filteredRevenueSources.length})
            </button>
            <button
              onClick={() => setShowSelected(true)}
              className={`flex-1 px-3 py-2 text-sm font-medium ${
                showSelected 
                  ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Selected ({selectedIds.length})
            </button>
          </div>

          {/* Action Buttons */}
          {allowSelectAll && !showSelected && (
            <div className="flex justify-between items-center p-2 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={selectAllVisible}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Select All Visible
              </button>
              {selectedIds.length > 0 && (
                <button
                  onClick={deselectAll}
                  className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                >
                  Deselect All
                </button>
              )}
            </div>
          )}

          {/* Revenue Source List */}
          <div className={`${maxHeight} overflow-y-auto`}>
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                <span className="ml-2 text-sm text-gray-500">Loading revenue sources...</span>
              </div>
            ) : (showSelected ? selectedRevenueSources : unselectedRevenueSources).length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                {showSelected ? 'No revenue sources selected' : 'No revenue sources found'}
              </div>
            ) : (
              <div className="py-1">
                {(showSelected ? selectedRevenueSources : unselectedRevenueSources).map(source => (
                  <label
                    key={source.id}
                    className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(source.id)}
                      onChange={() => toggleRevenueSource(source.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {source.name}
                        </span>
                        {selectedIds.includes(source.id) && (
                          <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center space-x-2 ml-6 mt-1">
                        {showRevenueSourceCodes && source.code && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Code: {source.code}
                          </span>
                        )}
                        {showRevenueSourceTypes && source.type && (
                          <span className={`text-xs px-1 rounded ${getTypeColor(source.type)}`}>
                            {getTypeLabel(source.type)}
                          </span>
                        )}
                        {showRevenueSourceCategories && source.category && (
                          <span className={`text-xs px-1 rounded ${getCategoryColor(source.category)}`}>
                            {source.category}
                          </span>
                        )}
                      </div>
                      {source.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 ml-6 mt-1">
                          {source.description}
                        </div>
                      )}
                      {source.default_rate !== undefined && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 ml-6 mt-1">
                          Default Rate: {source.default_rate}%
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueSourceMultiSelect;

