import React, { useState, useMemo, useCallback } from 'react';
import { 
  Search, 
  X, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  CreditCard,
  Loader2,
  AlertCircle,
  Filter
} from 'lucide-react';
import { PaymentMethod } from '../../services/paymentMethodApi';
import { useTheme } from '../../contexts/ThemeContext';

export interface PaymentMethodMultiSelectProps {
  paymentMethods: PaymentMethod[];
  selectedIds: number[];
  onSelectionChange: (selectedIds: number[]) => void;
  loading?: boolean;
  error?: string | null;
  placeholder?: string;
  maxHeight?: string;
  showPaymentMethodCodes?: boolean;
  showPaymentMethodTypes?: boolean;
  allowSelectAll?: boolean;
  enableTypeFiltering?: boolean;
  className?: string;
}

const PaymentMethodMultiSelect: React.FC<PaymentMethodMultiSelectProps> = ({
  paymentMethods,
  selectedIds,
  onSelectionChange,
  loading = false,
  error = null,
  placeholder = "Select payment methods...",
  maxHeight = "max-h-60",
  showPaymentMethodCodes = true,
  showPaymentMethodTypes = true,
  allowSelectAll = true,
  enableTypeFiltering = true,
  className = ""
}) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSelected, setShowSelected] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  // Get unique payment method types
  const paymentMethodTypes = useMemo(() => {
    const types = paymentMethods
      .map(method => method.type)
      .filter((type): type is string => !!type);
    return [...new Set(types)];
  }, [paymentMethods]);

  // Filter payment methods based on search term and type filters
  const filteredPaymentMethods = useMemo(() => {
    let filtered = paymentMethods;

    // Apply type filtering
    if (enableTypeFiltering && selectedTypes.length > 0) {
      filtered = filtered.filter(method => 
        method.type && selectedTypes.includes(method.type)
      );
    }

    // Apply search filtering
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(method => 
        method.name.toLowerCase().includes(term) ||
        method.code?.toLowerCase().includes(term) ||
        method.description?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [paymentMethods, searchTerm, selectedTypes, enableTypeFiltering]);

  // Separate selected and unselected payment methods
  const { selectedPaymentMethods, unselectedPaymentMethods } = useMemo(() => {
    const selected = paymentMethods.filter(method => selectedIds.includes(method.id));
    const unselected = filteredPaymentMethods.filter(method => !selectedIds.includes(method.id));
    return { selectedPaymentMethods: selected, unselectedPaymentMethods: unselected };
  }, [paymentMethods, filteredPaymentMethods, selectedIds]);

  // Toggle payment method selection
  const togglePaymentMethod = useCallback((paymentMethodId: number) => {
    const newSelected = selectedIds.includes(paymentMethodId)
      ? selectedIds.filter(id => id !== paymentMethodId)
      : [...selectedIds, paymentMethodId];
    onSelectionChange(newSelected);
  }, [selectedIds, onSelectionChange]);

  // Select all visible payment methods
  const selectAllVisible = useCallback(() => {
    const visibleIds = filteredPaymentMethods.map(method => method.id);
    const newSelected = [...new Set([...selectedIds, ...visibleIds])];
    onSelectionChange(newSelected);
  }, [filteredPaymentMethods, selectedIds, onSelectionChange]);

  // Deselect all
  const deselectAll = useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  // Remove selected payment method
  const removeSelected = useCallback((paymentMethodId: number) => {
    const newSelected = selectedIds.filter(id => id !== paymentMethodId);
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
      'card': 'Card',
      'ach': 'ACH',
      'wire': 'Wire',
      'check': 'Check',
      'other': 'Other'
    };
    return typeLabels[type] || type;
  }, []);

  // Get type color
  const getTypeColor = useCallback((type: string) => {
    const typeColors: Record<string, string> = {
      'card': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'ach': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'wire': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'check': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'other': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    return typeColors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Selected Payment Methods Display */}
      {selectedIds.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Selected Payment Methods ({selectedIds.length})
            </span>
            <button
              onClick={deselectAll}
              className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedPaymentMethods.map(method => (
              <div
                key={method.id}
                className="flex items-center space-x-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md text-sm"
              >
                <CreditCard className="h-3 w-3" />
                <span>{method.name}</span>
                {showPaymentMethodCodes && method.code && (
                  <span className="text-xs opacity-75">({method.code})</span>
                )}
                {showPaymentMethodTypes && method.type && (
                  <span className={`text-xs px-1 rounded ${getTypeColor(method.type)}`}>
                    {getTypeLabel(method.type)}
                  </span>
                )}
                <button
                  onClick={() => removeSelected(method.id)}
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
          <CreditCard className="h-4 w-4 text-gray-500" />
          <span className={selectedIds.length === 0 ? 'text-gray-500' : ''}>
            {selectedIds.length === 0 
              ? placeholder 
              : `${selectedIds.length} payment method${selectedIds.length !== 1 ? 's' : ''} selected`
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
                placeholder="Search payment methods..."
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
          {enableTypeFiltering && paymentMethodTypes.length > 0 && (
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
                {paymentMethodTypes.map(type => (
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
              All ({filteredPaymentMethods.length})
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

          {/* Payment Method List */}
          <div className={`${maxHeight} overflow-y-auto`}>
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                <span className="ml-2 text-sm text-gray-500">Loading payment methods...</span>
              </div>
            ) : (showSelected ? selectedPaymentMethods : unselectedPaymentMethods).length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                {showSelected ? 'No payment methods selected' : 'No payment methods found'}
              </div>
            ) : (
              <div className="py-1">
                {(showSelected ? selectedPaymentMethods : unselectedPaymentMethods).map(method => (
                  <label
                    key={method.id}
                    className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(method.id)}
                      onChange={() => togglePaymentMethod(method.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {method.name}
                        </span>
                        {selectedIds.includes(method.id) && (
                          <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center space-x-2 ml-6 mt-1">
                        {showPaymentMethodCodes && method.code && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Code: {method.code}
                          </span>
                        )}
                        {showPaymentMethodTypes && method.type && (
                          <span className={`text-xs px-1 rounded ${getTypeColor(method.type)}`}>
                            {getTypeLabel(method.type)}
                          </span>
                        )}
                      </div>
                      {method.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 ml-6 mt-1">
                          {method.description}
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

export default PaymentMethodMultiSelect;

