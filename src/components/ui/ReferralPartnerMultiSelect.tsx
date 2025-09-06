import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  ChevronDown, 
  Search, 
  X, 
  Users, 
  Building, 
  Mail, 
  Phone, 
  Percent,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { ReferralPartner } from '../../services/referralPartnerApi';

export interface ReferralPartnerMultiSelectProps {
  referralPartners: ReferralPartner[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  loading?: boolean;
  error?: string | null;
  placeholder?: string;
  showPartnerCodes?: boolean;
  showPartnerTypes?: boolean;
  showPartnerEmails?: boolean;
  showPartnerPhones?: boolean;
  showPartnerCompanies?: boolean;
  showPartnerStatuses?: boolean;
  showPartnerRates?: boolean;
  showPartnerStats?: boolean;
  showPartnerDates?: boolean;
  allowSelectAll?: boolean;
  enableSearch?: boolean;
  enableTypeFiltering?: boolean;
  enableStatusFiltering?: boolean;
  disabled?: boolean;
  className?: string;
}

const ReferralPartnerMultiSelect: React.FC<ReferralPartnerMultiSelectProps> = ({
  referralPartners = [],
  selectedIds = [],
  onSelectionChange,
  loading = false,
  error = null,
  placeholder = "Select referral partners...",
  showPartnerCodes = true,
  showPartnerTypes = true,
  showPartnerEmails = true,
  showPartnerPhones = false,
  showPartnerCompanies = true,
  showPartnerStatuses = true,
  showPartnerRates = false,
  showPartnerStats = true,
  showPartnerDates = false,
  allowSelectAll = true,
  enableSearch = true,
  enableTypeFiltering = true,
  enableStatusFiltering = true,
  disabled = false,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'selected'>('all');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  // Get unique types and statuses
  const types = useMemo(() => {
    const partnerTypes = referralPartners.map(partner => partner.type).filter(Boolean) as string[];
    return [...new Set(partnerTypes)];
  }, [referralPartners]);

  const statuses = useMemo(() => {
    const partnerStatuses = referralPartners.map(partner => partner.status).filter(Boolean) as string[];
    return [...new Set(partnerStatuses)];
  }, [referralPartners]);

  // Filter referral partners based on search, view mode, and filters
  const filteredReferralPartners = useMemo(() => {
    let filtered = referralPartners;

    // Apply search filter
    if (enableSearch && searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(partner => 
        partner.name.toLowerCase().includes(lowerSearchTerm) ||
        partner.code?.toLowerCase().includes(lowerSearchTerm) ||
        partner.email?.toLowerCase().includes(lowerSearchTerm) ||
        partner.company?.toLowerCase().includes(lowerSearchTerm) ||
        partner.type?.toLowerCase().includes(lowerSearchTerm)
      );
    }

    // Apply view mode filter
    if (viewMode === 'selected') {
      filtered = filtered.filter(partner => selectedIds.includes(partner.id));
    }

    // Apply type filter
    if (enableTypeFiltering && selectedTypes.length > 0) {
      filtered = filtered.filter(partner => 
        partner.type && selectedTypes.includes(partner.type)
      );
    }

    // Apply status filter
    if (enableStatusFiltering && selectedStatuses.length > 0) {
      filtered = filtered.filter(partner => 
        partner.status && selectedStatuses.includes(partner.status)
      );
    }

    // Sort by name for better UX
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [referralPartners, searchTerm, viewMode, selectedIds, selectedTypes, selectedStatuses, enableSearch, enableTypeFiltering, enableStatusFiltering]);

  // Get selected referral partners
  const selectedReferralPartners = useMemo(() => {
    return referralPartners.filter(partner => selectedIds.includes(partner.id));
  }, [referralPartners, selectedIds]);

  // Get status icon and color
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20';
      case 'inactive':
        return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20';
      default:
        return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-900/20';
    }
  };

  // Format currency
  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Handle selection toggle
  const handleToggleSelection = useCallback((id: string) => {
    const newSelectedIds = selectedIds.includes(id)
      ? selectedIds.filter(selectedId => selectedId !== id)
      : [...selectedIds, id];
    onSelectionChange(newSelectedIds);
  }, [selectedIds, onSelectionChange]);

  // Handle select all visible
  const handleSelectAllVisible = useCallback(() => {
    const visibleIds = filteredReferralPartners.map(partner => partner.id);
    const newSelectedIds = [...new Set([...selectedIds, ...visibleIds])];
    onSelectionChange(newSelectedIds);
  }, [filteredReferralPartners, selectedIds, onSelectionChange]);

  // Handle deselect all
  const handleDeselectAll = useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  // Handle remove selected
  const handleRemoveSelected = useCallback((id: string) => {
    const newSelectedIds = selectedIds.filter(selectedId => selectedId !== id);
    onSelectionChange(newSelectedIds);
  }, [selectedIds, onSelectionChange]);

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

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      // Search logic is handled in the useMemo above
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

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
            : disabled
            ? 'border-gray-300 bg-gray-50 text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 cursor-not-allowed'
            : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-gray-500'
        }`}
      >
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="truncate">
            {selectedIds.length === 0
              ? placeholder
              : selectedIds.length === 1
              ? selectedReferralPartners[0]?.name || 'Selected partner'
              : `${selectedIds.length} partners selected`}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-96 overflow-hidden">
          {/* Search input */}
          {enableSearch && (
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search referral partners..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* View mode toggle */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex space-x-1">
              <button
                onClick={() => setViewMode('all')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  viewMode === 'all'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                All ({referralPartners.length})
              </button>
              <button
                onClick={() => setViewMode('selected')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  viewMode === 'selected'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                Selected ({selectedIds.length})
              </button>
            </div>

            {/* Bulk actions */}
            {allowSelectAll && viewMode === 'all' && (
              <div className="flex space-x-2">
                <button
                  onClick={handleSelectAllVisible}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Select All
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="text-xs text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Type filter */}
          {enableTypeFiltering && types.length > 0 && (
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Type</div>
              <div className="flex flex-wrap gap-1">
                {types.map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedTypes(prev => 
                        prev.includes(type) 
                          ? prev.filter(t => t !== type)
                          : [...prev, type]
                      );
                    }}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      selectedTypes.includes(type)
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Status filter */}
          {enableStatusFiltering && statuses.length > 0 && (
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Status</div>
              <div className="flex flex-wrap gap-1">
                {statuses.map(status => (
                  <button
                    key={status}
                    onClick={() => {
                      setSelectedStatuses(prev => 
                        prev.includes(status) 
                          ? prev.filter(s => s !== status)
                          : [...prev, status]
                      );
                    }}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      selectedStatuses.includes(status)
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected partners as tags */}
          {selectedIds.length > 0 && (
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Selected Partners</div>
              <div className="flex flex-wrap gap-1">
                {selectedReferralPartners.map(partner => (
                  <span
                    key={partner.id}
                    className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md dark:bg-blue-900/20 dark:text-blue-300"
                  >
                    <span>{partner.name}</span>
                    <button
                      onClick={() => handleRemoveSelected(partner.id)}
                      className="hover:text-blue-600 dark:hover:text-blue-200"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              Loading referral partners...
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="p-4 text-center text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Referral partners list */}
          {!loading && !error && (
            <div className="max-h-64 overflow-y-auto">
              {filteredReferralPartners.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  {searchTerm ? 'No partners found matching your search.' : 'No referral partners available.'}
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredReferralPartners.map(partner => (
                    <div
                      key={partner.id}
                      className="flex items-start space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() => handleToggleSelection(partner.id)}
                    >
                      {/* Checkbox */}
                      <div className="flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(partner.id)}
                          onChange={() => handleToggleSelection(partner.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          aria-label={`Select ${partner.name}`}
                        />
                      </div>

                      {/* Partner info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900 dark:text-white truncate">
                                {partner.name}
                              </span>
                              {showPartnerStatuses && partner.status && (
                                <span className={`inline-flex items-center space-x-1 px-2 py-1 text-xs rounded-full ${getStatusColor(partner.status)}`}>
                                  {getStatusIcon(partner.status)}
                                  <span className="capitalize">{partner.status}</span>
                                </span>
                              )}
                            </div>

                            {/* Partner details */}
                            <div className="mt-1 space-y-1">
                              {showPartnerCodes && partner.code && (
                                <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                                  <Building className="h-3 w-3" />
                                  <span>{partner.code}</span>
                                </div>
                              )}

                              {showPartnerTypes && partner.type && (
                                <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                                  <Users className="h-3 w-3" />
                                  <span>{partner.type}</span>
                                </div>
                              )}

                              {showPartnerCompanies && partner.company && (
                                <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                                  <Building className="h-3 w-3" />
                                  <span>{partner.company}</span>
                                </div>
                              )}

                              {showPartnerEmails && partner.email && (
                                <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                                  <Mail className="h-3 w-3" />
                                  <span>{partner.email}</span>
                                </div>
                              )}

                              {showPartnerPhones && partner.phone && (
                                <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                                  <Phone className="h-3 w-3" />
                                  <span>{partner.phone}</span>
                                </div>
                              )}

                              {showPartnerRates && partner.commission_rate && (
                                <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                                  <Percent className="h-3 w-3" />
                                  <span>{partner.commission_rate}% commission rate</span>
                                </div>
                              )}

                              {showPartnerDates && partner.created_at && (
                                <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                                  <Calendar className="h-3 w-3" />
                                  <span>Created {new Date(partner.created_at).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>

                            {/* Partner stats */}
                            {showPartnerStats && (
                              <div className="mt-2 flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400">
                                {partner.total_transactions !== undefined && (
                                  <div className="flex items-center space-x-1">
                                    <DollarSign className="h-3 w-3" />
                                    <span>{partner.total_transactions.toLocaleString()} transactions</span>
                                  </div>
                                )}
                                {partner.total_amount !== undefined && (
                                  <div className="flex items-center space-x-1">
                                    <DollarSign className="h-3 w-3" />
                                    <span>{formatCurrency(partner.total_amount)} total</span>
                                  </div>
                                )}
                                {partner.total_commission !== undefined && (
                                  <div className="flex items-center space-x-1">
                                    <Percent className="h-3 w-3" />
                                    <span>{formatCurrency(partner.total_commission)} commission</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReferralPartnerMultiSelect;




