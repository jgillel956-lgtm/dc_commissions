import React, { useState, useMemo, useEffect } from 'react';
import { 
  CheckCircle, 
  Clock, 
  Loader, 
  XCircle, 
  X, 
  Pause, 
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Search,
  Check,
  Filter,
  RefreshCw
} from 'lucide-react';
import { DisbursementStatus } from '../../services/disbursementStatusApi';

export interface DisbursementStatusMultiSelectProps {
  disbursementStatuses: DisbursementStatus[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  loading?: boolean;
  error?: string | null;
  placeholder?: string;
  showStatusIcons?: boolean;
  showStatusColors?: boolean;
  showStatusStats?: boolean;
  showStatusDescriptions?: boolean;
  allowSelectAll?: boolean;
  enableSearch?: boolean;
  className?: string;
  disabled?: boolean;
}

const DisbursementStatusMultiSelect: React.FC<DisbursementStatusMultiSelectProps> = ({
  disbursementStatuses,
  selectedIds,
  onSelectionChange,
  loading = false,
  error = null,
  placeholder = 'Select disbursement statuses...',
  showStatusIcons = true,
  showStatusColors = true,
  showStatusStats = true,
  showStatusDescriptions = true,
  allowSelectAll = true,
  enableSearch = true,
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'selected'>('all');

  // Filter disbursement statuses based on search term
  const filteredDisbursementStatuses = useMemo(() => {
    let filtered = disbursementStatuses;

    // Filter by search term
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(status =>
        status.label.toLowerCase().includes(lowerSearchTerm) ||
        status.value.toLowerCase().includes(lowerSearchTerm) ||
        status.description?.toLowerCase().includes(lowerSearchTerm)
      );
    }

    // Filter by view mode
    if (viewMode === 'selected') {
      filtered = filtered.filter(status => selectedIds.includes(status.id));
    }

    return filtered;
  }, [disbursementStatuses, searchTerm, viewMode, selectedIds]);

  // Selected disbursement statuses
  const selectedDisbursementStatuses = useMemo(() => {
    return disbursementStatuses.filter(status => selectedIds.includes(status.id));
  }, [disbursementStatuses, selectedIds]);

  // Get status icon component
  const getStatusIcon = (status: DisbursementStatus) => {
    const iconProps = { className: 'h-4 w-4' };
    
    switch (status.icon) {
      case 'clock':
        return <Clock {...iconProps} />;
      case 'loader':
        return <Loader {...iconProps} />;
      case 'check-circle':
        return <CheckCircle {...iconProps} />;
      case 'x-circle':
        return <XCircle {...iconProps} />;
      case 'pause':
        return <Pause {...iconProps} />;
      case 'rotate-ccw':
        return <RotateCcw {...iconProps} />;
      default:
        return <CheckCircle {...iconProps} />;
    }
  };

  // Get status color classes
  const getStatusColorClasses = (status: DisbursementStatus) => {
    switch (status.color) {
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border-yellow-800';
      case 'blue':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800';
      case 'green':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800';
      case 'red':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800';
      case 'orange':
        return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-200 dark:border-orange-800';
      case 'purple':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-200 dark:border-purple-800';
      case 'gray':
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-200 dark:border-gray-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-200 dark:border-gray-800';
    }
  };

  // Handle selection toggle
  const handleToggleSelection = (statusId: string) => {
    if (disabled) return;
    
    const newSelectedIds = selectedIds.includes(statusId)
      ? selectedIds.filter(id => id !== statusId)
      : [...selectedIds, statusId];
    
    onSelectionChange(newSelectedIds);
  };

  // Handle select all visible
  const handleSelectAllVisible = () => {
    if (disabled) return;
    const visibleIds = filteredDisbursementStatuses.map(status => status.id);
    const newSelectedIds = [...new Set([...selectedIds, ...visibleIds])];
    onSelectionChange(newSelectedIds);
  };

  // Handle deselect all
  const handleDeselectAll = () => {
    if (disabled) return;
    onSelectionChange([]);
  };

  // Handle remove selected status
  const handleRemoveSelected = (statusId: string) => {
    if (disabled) return;
    const newSelectedIds = selectedIds.filter(id => id !== statusId);
    onSelectionChange(newSelectedIds);
  };

  // Handle keyboard events
  useEffect(() => {
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

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main select button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading || disabled}
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
          error
            ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-600 dark:bg-red-900/20 dark:text-red-200'
            : loading
            ? 'border-gray-300 bg-gray-50 text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400'
            : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-gray-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
          {error && <XCircle className="h-4 w-4 text-red-500" />}
          
          <span className="truncate">
            {selectedIds.length === 0
              ? placeholder
              : selectedIds.length === 1
              ? selectedDisbursementStatuses[0]?.label
              : `${selectedIds.length} status${selectedIds.length !== 1 ? 'es' : ''} selected`}
          </span>
        </div>
        
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-96 overflow-hidden">
          {/* Header with search and controls */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            {/* Search input */}
            {enableSearch && (
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search statuses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {/* View mode toggle and bulk actions */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-1">
                <button
                  onClick={() => setViewMode('all')}
                  className={`px-2 py-1 text-xs rounded ${
                    viewMode === 'all'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  All ({disbursementStatuses.length})
                </button>
                <button
                  onClick={() => setViewMode('selected')}
                  className={`px-2 py-1 text-xs rounded ${
                    viewMode === 'selected'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Selected ({selectedIds.length})
                </button>
              </div>

              {allowSelectAll && (
                <div className="flex space-x-1">
                  <button
                    onClick={handleSelectAllVisible}
                    className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Selected statuses tags */}
          {selectedIds.length > 0 && (
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap gap-2">
                {selectedDisbursementStatuses.map(status => (
                  <div
                    key={status.id}
                    className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs border ${getStatusColorClasses(status)}`}
                  >
                    {showStatusIcons && getStatusIcon(status)}
                    <span>{status.label}</span>
                    <button
                      onClick={() => handleRemoveSelected(status.id)}
                      className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status list */}
          <div className="max-h-64 overflow-y-auto">
            {filteredDisbursementStatuses.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                {searchTerm ? 'No statuses found matching your search.' : 'No statuses available.'}
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredDisbursementStatuses.map(status => (
                  <div
                    key={status.id}
                    className="flex items-center space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => handleToggleSelection(status.id)}
                  >
                    {/* Checkbox */}
                                         <div className="flex-shrink-0">
                       <input
                         type="checkbox"
                         checked={selectedIds.includes(status.id)}
                         onChange={() => handleToggleSelection(status.id)}
                         className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                         aria-label={`Select ${status.label}`}
                       />
                     </div>

                    {/* Status icon */}
                    {showStatusIcons && (
                      <div className="flex-shrink-0">
                        {getStatusIcon(status)}
                      </div>
                    )}

                    {/* Status content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {status.label}
                        </span>
                        {showStatusColors && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColorClasses(status)}`}>
                            {status.value}
                          </span>
                        )}
                      </div>
                      
                      {showStatusDescriptions && status.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {status.description}
                        </p>
                      )}
                      
                      {showStatusStats && (status.transaction_count !== undefined || status.total_amount !== undefined) && (
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {status.transaction_count !== undefined && (
                            <span>{status.transaction_count.toLocaleString()} transactions</span>
                          )}
                          {status.total_amount !== undefined && (
                            <span>{formatCurrency(status.total_amount)}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Selected indicator */}
                    {selectedIds.includes(status.id) && (
                      <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DisbursementStatusMultiSelect;
