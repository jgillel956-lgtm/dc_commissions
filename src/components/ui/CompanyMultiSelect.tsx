import React, { useState, useMemo, useCallback } from 'react';
import { 
  Search, 
  X, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Building,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Company } from '../../services/companyApi';
import { useTheme } from '../../contexts/ThemeContext';

export interface CompanyMultiSelectProps {
  companies: Company[];
  selectedIds: number[];
  onSelectionChange: (selectedIds: number[]) => void;
  loading?: boolean;
  error?: string | null;
  placeholder?: string;
  maxHeight?: string;
  showCompanyCodes?: boolean;
  allowSelectAll?: boolean;
  className?: string;
}

const CompanyMultiSelect: React.FC<CompanyMultiSelectProps> = ({
  companies,
  selectedIds,
  onSelectionChange,
  loading = false,
  error = null,
  placeholder = "Select companies...",
  maxHeight = "max-h-60",
  showCompanyCodes = true,
  allowSelectAll = true,
  className = ""
}) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSelected, setShowSelected] = useState(false);

  // Filter companies based on search term
  const filteredCompanies = useMemo(() => {
    if (!searchTerm.trim()) {
      return companies;
    }

    const term = searchTerm.toLowerCase();
    return companies.filter(company => 
      company.name.toLowerCase().includes(term) ||
      company.code?.toLowerCase().includes(term)
    );
  }, [companies, searchTerm]);

  // Separate selected and unselected companies
  const { selectedCompanies, unselectedCompanies } = useMemo(() => {
    const selected = companies.filter(company => selectedIds.includes(company.id));
    const unselected = filteredCompanies.filter(company => !selectedIds.includes(company.id));
    return { selectedCompanies: selected, unselectedCompanies: unselected };
  }, [companies, filteredCompanies, selectedIds]);

  // Toggle company selection
  const toggleCompany = useCallback((companyId: number) => {
    const newSelected = selectedIds.includes(companyId)
      ? selectedIds.filter(id => id !== companyId)
      : [...selectedIds, companyId];
    onSelectionChange(newSelected);
  }, [selectedIds, onSelectionChange]);

  // Select all visible companies
  const selectAllVisible = useCallback(() => {
    const visibleIds = filteredCompanies.map(company => company.id);
    const newSelected = [...new Set([...selectedIds, ...visibleIds])];
    onSelectionChange(newSelected);
  }, [filteredCompanies, selectedIds, onSelectionChange]);

  // Deselect all
  const deselectAll = useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  // Remove selected company
  const removeSelected = useCallback((companyId: number) => {
    const newSelected = selectedIds.filter(id => id !== companyId);
    onSelectionChange(newSelected);
  }, [selectedIds, onSelectionChange]);

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

  return (
    <div className={`relative ${className}`}>
      {/* Selected Companies Display */}
      {selectedIds.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Selected Companies ({selectedIds.length})
            </span>
            <button
              onClick={deselectAll}
              className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedCompanies.map(company => (
              <div
                key={company.id}
                className="flex items-center space-x-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md text-sm"
              >
                <Building className="h-3 w-3" />
                <span>{company.name}</span>
                {showCompanyCodes && company.code && (
                  <span className="text-xs opacity-75">({company.code})</span>
                )}
                <button
                  onClick={() => removeSelected(company.id)}
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
          <Building className="h-4 w-4 text-gray-500" />
          <span className={selectedIds.length === 0 ? 'text-gray-500' : ''}>
            {selectedIds.length === 0 
              ? placeholder 
              : `${selectedIds.length} company${selectedIds.length !== 1 ? 's' : ''} selected`
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
                placeholder="Search companies..."
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
              All ({companies.length})
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

          {/* Company List */}
          <div className={`${maxHeight} overflow-y-auto`}>
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                <span className="ml-2 text-sm text-gray-500">Loading companies...</span>
              </div>
            ) : (showSelected ? selectedCompanies : unselectedCompanies).length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                {showSelected ? 'No companies selected' : 'No companies found'}
              </div>
            ) : (
              <div className="py-1">
                {(showSelected ? selectedCompanies : unselectedCompanies).map(company => (
                  <label
                    key={company.id}
                    className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(company.id)}
                      onChange={() => toggleCompany(company.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <Building className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {company.name}
                        </span>
                        {selectedIds.includes(company.id) && (
                          <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        )}
                      </div>
                      {showCompanyCodes && company.code && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                          Code: {company.code}
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

export default CompanyMultiSelect;




