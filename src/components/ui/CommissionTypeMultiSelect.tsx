import React, { useState, useMemo } from 'react';
import { 
  Search, 
  X, 
  ChevronDown, 
  Percent, 
  Tag,
  Check,
  Loader2,
  AlertCircle,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { CommissionType } from '../../services/commissionTypeApi';

export interface CommissionTypeMultiSelectProps {
  commissionTypes: CommissionType[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  loading?: boolean;
  error?: string | null;
  placeholder?: string;
  showCommissionCodes?: boolean;
  showCommissionRates?: boolean;
  showCommissionStats?: boolean;
  allowSelectAll?: boolean;
  enableCategoryFiltering?: boolean;
  className?: string;
}

const CommissionTypeMultiSelect: React.FC<CommissionTypeMultiSelectProps> = ({
  commissionTypes,
  selectedIds,
  onSelectionChange,
  loading = false,
  error = null,
  placeholder = 'Select commission types...',
  showCommissionCodes = true,
  showCommissionRates = true,
  showCommissionStats = true,
  allowSelectAll = true,
  enableCategoryFiltering = true,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'selected'>('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Handle keyboard events
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  // Get categories for filtering
  const categories = useMemo(() => {
    const catMap = new Map<string, { count: number; color: string; icon: string }>();
    commissionTypes.forEach(type => {
      if (!catMap.has(type.category)) {
        catMap.set(type.category, {
          count: 0,
          color: type.color || '#6B7280',
          icon: type.icon || '📊'
        });
      }
      catMap.get(type.category)!.count++;
    });
    return Array.from(catMap.entries()).map(([category, data]) => ({
      value: category,
      label: category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count: data.count,
      color: data.color,
      icon: data.icon
    }));
  }, [commissionTypes]);

  // Filter commission types based on search and category filters
  const filteredCommissionTypes = useMemo(() => {
    let filtered = commissionTypes;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(type =>
        type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        type.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        type.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        type.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    if (enableCategoryFiltering && selectedCategories.length > 0) {
      filtered = filtered.filter(type => selectedCategories.includes(type.category));
    }

    // Apply view mode filter
    if (viewMode === 'selected') {
      filtered = filtered.filter(type => selectedIds.includes(type.id));
    }

    return filtered;
  }, [commissionTypes, searchTerm, selectedCategories, viewMode, selectedIds, enableCategoryFiltering]);

  // Toggle commission type selection
  const toggleCommissionType = (commissionTypeId: string) => {
    const newSelectedIds = selectedIds.includes(commissionTypeId)
      ? selectedIds.filter(id => id !== commissionTypeId)
      : [...selectedIds, commissionTypeId];
    onSelectionChange(newSelectedIds);
  };

  // Select all visible commission types
  const selectAllVisible = () => {
    const visibleIds = filteredCommissionTypes.map(type => type.id);
    const newSelectedIds = [...new Set([...selectedIds, ...visibleIds])];
    onSelectionChange(newSelectedIds);
  };

  // Deselect all commission types
  const deselectAll = () => {
    onSelectionChange([]);
  };

  // Toggle category filter
  const toggleCategoryFilter = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategories([]);
    setViewMode('all');
  };

  // Get selected commission types
  const selectedCommissionTypes = useMemo(() => {
    return commissionTypes.filter(type => selectedIds.includes(type.id));
  }, [commissionTypes, selectedIds]);

  // Remove selected commission type
  const removeSelected = (commissionTypeId: string) => {
    onSelectionChange(selectedIds.filter(id => id !== commissionTypeId));
  };

  const hasActiveFilters = searchTerm || selectedCategories.length > 0 || viewMode === 'selected';

  // Calculate total selected commission rate
  const totalSelectedRate = useMemo(() => {
    return selectedCommissionTypes.reduce((sum, type) => sum + type.commission_rate, 0);
  }, [selectedCommissionTypes]);

  return (
    <div className={`relative ${className}`}>
      {/* Selected commission types display */}
      {selectedCommissionTypes.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {selectedCommissionTypes.map(type => (
            <span
              key={type.id}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs"
              style={{ backgroundColor: `${type.color}20`, color: type.color, border: `1px solid ${type.color}40` }}
            >
              <span className="truncate max-w-32">
                {type.icon} {type.name}
                {showCommissionCodes && ` (${type.code})`}
                {showCommissionRates && ` ${type.commission_rate}%`}
              </span>
              <button
                onClick={() => removeSelected(type.id)}
                className="ml-1 rounded-full p-0.5 hover:bg-black hover:bg-opacity-10"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Main select button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
          error
            ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-600 dark:bg-red-900/20 dark:text-red-200'
            : loading
            ? 'border-gray-300 bg-gray-50 text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400'
            : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-gray-500'
        }`}
      >
        <span className="flex items-center gap-2">
          <Percent size={16} />
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Loading commission types...
            </span>
          ) : error ? (
            <span className="flex items-center gap-2">
              <AlertCircle size={16} />
              Error loading commission types
            </span>
          ) : selectedCommissionTypes.length > 0 ? (
            <span className="flex items-center gap-2">
              <span>
                {selectedCommissionTypes.length} commission type{selectedCommissionTypes.length !== 1 ? 's' : ''} selected
              </span>
              {showCommissionRates && (
                <span className="text-xs text-gray-500">
                  ({totalSelectedRate.toFixed(1)}% total rate)
                </span>
              )}
            </span>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
          )}
        </span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && !loading && !error && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {/* Search and filters */}
          <div className="border-b border-gray-200 p-3 dark:border-gray-700">
            {/* Search input */}
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search commission types..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pl-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>

            {/* View mode toggle */}
            <div className="mb-3 flex rounded-md border border-gray-200 dark:border-gray-600">
              <button
                onClick={() => setViewMode('all')}
                className={`flex-1 px-3 py-1 text-xs transition-colors ${
                  viewMode === 'all'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                All ({commissionTypes.length})
              </button>
              <button
                onClick={() => setViewMode('selected')}
                className={`flex-1 px-3 py-1 text-xs transition-colors ${
                  viewMode === 'selected'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Selected ({selectedCommissionTypes.length})
              </button>
            </div>

            {/* Category filters */}
            {enableCategoryFiltering && categories.length > 0 && (
              <div className="mb-3">
                <div className="mb-2 flex items-center gap-2">
                  <Tag size={14} />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Categories</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {categories.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => toggleCategoryFilter(cat.value)}
                      className={`rounded-full px-2 py-1 text-xs transition-colors ${
                        selectedCategories.includes(cat.value)
                          ? 'text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                      }`}
                      style={{
                        backgroundColor: selectedCategories.includes(cat.value) ? cat.color : undefined
                      }}
                    >
                      {cat.icon} {cat.label} ({cat.count})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Bulk actions */}
          {allowSelectAll && filteredCommissionTypes.length > 0 && (
            <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
              <div className="flex gap-2">
                <button
                  onClick={selectAllVisible}
                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Select all visible ({filteredCommissionTypes.length})
                </button>
                <button
                  onClick={deselectAll}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Deselect all
                </button>
              </div>
            </div>
          )}

          {/* Commission type list */}
          <div className="max-h-60 overflow-y-auto">
            {filteredCommissionTypes.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                {searchTerm || selectedCategories.length > 0
                  ? 'No commission types match the current filters'
                  : 'No commission types available'}
              </div>
            ) : (
              filteredCommissionTypes.map(type => (
                <div
                  key={type.id}
                  onClick={() => toggleCommissionType(type.id)}
                  className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    selectedIds.includes(type.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className={`flex h-4 w-4 items-center justify-center rounded border ${
                    selectedIds.includes(type.id)
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {selectedIds.includes(type.id) && <Check size={12} className="text-white" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{type.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {type.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                          {showCommissionCodes && (
                            <div className="flex items-center gap-1">
                              <Tag size={10} />
                              {type.code}
                            </div>
                          )}
                          {showCommissionRates && (
                            <div className="flex items-center gap-1">
                              <Percent size={10} />
                              {type.commission_rate}% commission rate
                            </div>
                          )}
                          {showCommissionStats && type.total_commissions && (
                            <div className="flex items-center gap-1">
                              <DollarSign size={10} />
                              ${type.total_commissions.toLocaleString()} total
                              {type.total_transactions && (
                                <span className="ml-1">
                                  ({type.total_transactions} transactions)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: type.color }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionTypeMultiSelect;
