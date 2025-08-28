import React, { useMemo, useCallback, useRef, useState } from 'react';
import { DataTableProps, DataTableColumn, DataTableRow, SortDirection, FilterType } from '../../types/charts';
import { CHART_COLORS, CHART_STYLES } from '../../config/chartConfig';
import {
  formatCurrency,
  formatNumber,
  formatDate,
  formatPercentage,
  generateAriaLabel,
  generateAriaDescription,
  validateChartData,
  sanitizeChartData,
} from '../../utils/chartUtils';

interface DataTableState {
  sortColumn: string | null;
  sortDirection: SortDirection;
  currentPage: number;
  itemsPerPage: number;
  filters: Record<string, any>;
  selectedRows: Set<string>;
  expandedRows: Set<string>;
}

interface ProcessedColumn extends DataTableColumn {
  sortable: boolean;
  filterable: boolean;
  width: string;
  minWidth: string;
  maxWidth: string;
}

const DataTable: React.FC<DataTableProps> = ({
  data,
  columns,
  title,
  subtitle,
  width = '100%',
  height = 400,
  className = '',
  theme = 'light',
  responsive = true,
  loading = false,
  error = null,
  sortable = true,
  filterable = true,
  selectable = false,
  expandable = false,
  pagination = true,
  searchable = true,
  exportable = true,
  itemsPerPage = 10,
  maxItemsPerPage = 100,
  showRowNumbers = false,
  showColumnHeaders = true,
  showFooter = true,
  striped = true,
  hoverable = true,
  compact = false,
  onRowClick,
  onRowSelect,
  onSort,
  onFilter,
  onExport,
  onRefresh,
  ariaLabel,
  ariaDescription,
  emptyMessage = 'No data available',
  loadingMessage = 'Loading data...',
  errorMessage = 'Error loading data',
}) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<DataTableState>({
    sortColumn: null,
    sortDirection: 'asc',
    currentPage: 1,
    itemsPerPage: itemsPerPage,
    filters: {},
    selectedRows: new Set(),
    expandedRows: new Set(),
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Validate and sanitize data
  const validData = useMemo(() => {
    if (!validateChartData(data)) {
      return [];
    }
    return sanitizeChartData(data);
  }, [data]);

  // Process columns with defaults
  const processedColumns = useMemo(() => {
    return columns.map((col): ProcessedColumn => ({
      key: col.key,
      label: col.label,
      type: col.type || 'text',
      sortable: col.sortable !== false && sortable,
      filterable: col.filterable !== false && filterable,
      width: col.width || 'auto',
      minWidth: col.minWidth || '100px',
      maxWidth: col.maxWidth || 'none',
      align: col.align || 'left',
      format: col.format,
      render: col.render,
      tooltip: col.tooltip,
      className: col.className || '',
    }));
  }, [columns, sortable, filterable]);

  // Apply search filter
  const searchFilteredData = useMemo(() => {
    if (!searchTerm.trim()) return validData;

    return validData.filter(row => {
      return processedColumns.some(col => {
        const value = row[col.key];
        if (value == null) return false;
        
        const stringValue = String(value).toLowerCase();
        return stringValue.includes(searchTerm.toLowerCase());
      });
    });
  }, [validData, searchTerm, processedColumns]);

  // Apply column filters
  const filteredData = useMemo(() => {
    let result = searchFilteredData;

    Object.entries(state.filters).forEach(([columnKey, filterValue]) => {
      if (filterValue != null && filterValue !== '') {
        result = result.filter(row => {
          const value = row[columnKey];
          if (value == null) return false;

          switch (typeof filterValue) {
            case 'string':
              return String(value).toLowerCase().includes(filterValue.toLowerCase());
            case 'number':
              return Number(value) === filterValue;
            case 'boolean':
              return Boolean(value) === filterValue;
            default:
              return true;
          }
        });
      }
    });

    return result;
  }, [searchFilteredData, state.filters]);

  // Apply sorting
  const sortedData = useMemo(() => {
    if (!state.sortColumn) return filteredData;

    const column = processedColumns.find(col => col.key === state.sortColumn);
    if (!column || !column.sortable) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[state.sortColumn!];
      const bValue = b[state.sortColumn!];

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      let comparison = 0;

      switch (column.type) {
        case 'number':
          comparison = Number(aValue) - Number(bValue);
          break;
        case 'date':
          comparison = new Date(aValue).getTime() - new Date(bValue).getTime();
          break;
        case 'currency':
          comparison = Number(aValue) - Number(bValue);
          break;
        case 'percentage':
          comparison = Number(aValue) - Number(bValue);
          break;
        default:
          comparison = String(aValue).localeCompare(String(bValue));
      }

      return state.sortDirection === 'desc' ? -comparison : comparison;
    });
  }, [filteredData, state.sortColumn, state.sortDirection, processedColumns]);

  // Apply pagination
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;

    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = startIndex + state.itemsPerPage;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, pagination, state.currentPage, state.itemsPerPage]);

  // Calculate pagination info
  const paginationInfo = useMemo(() => {
    const totalItems = sortedData.length;
    const totalPages = Math.ceil(totalItems / state.itemsPerPage);
    const startItem = (state.currentPage - 1) * state.itemsPerPage + 1;
    const endItem = Math.min(state.currentPage * state.itemsPerPage, totalItems);

    return {
      totalItems,
      totalPages,
      currentPage: state.currentPage,
      startItem,
      endItem,
      hasNextPage: state.currentPage < totalPages,
      hasPrevPage: state.currentPage > 1,
    };
  }, [sortedData.length, state.currentPage, state.itemsPerPage]);

  // Handle sorting
  const handleSort = useCallback((columnKey: string) => {
    const column = processedColumns.find(col => col.key === columnKey);
    if (!column || !column.sortable) return;

    setState(prev => {
      const newDirection = prev.sortColumn === columnKey && prev.sortDirection === 'asc' ? 'desc' : 'asc';
      return {
        ...prev,
        sortColumn: columnKey,
        sortDirection: newDirection,
        currentPage: 1, // Reset to first page when sorting
      };
    });

    if (onSort) {
      onSort(columnKey, state.sortDirection === 'asc' ? 'desc' : 'asc');
    }
  }, [processedColumns, onSort, state.sortDirection]);

  // Handle filtering
  const handleFilter = useCallback((columnKey: string, value: any) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, [columnKey]: value },
      currentPage: 1, // Reset to first page when filtering
    }));

    if (onFilter) {
      onFilter(columnKey, value);
    }
  }, [onFilter]);

  // Handle row selection
  const handleRowSelect = useCallback((rowId: string, selected: boolean) => {
    setState(prev => {
      const newSelectedRows = new Set(prev.selectedRows);
      if (selected) {
        newSelectedRows.add(rowId);
      } else {
        newSelectedRows.delete(rowId);
      }
      return { ...prev, selectedRows: newSelectedRows };
    });

    if (onRowSelect) {
      onRowSelect(rowId, selected);
    }
  }, [onRowSelect]);

  // Handle select all
  const handleSelectAll = useCallback((selected: boolean) => {
    setState(prev => {
      const newSelectedRows = new Set<string>();
      if (selected) {
        paginatedData.forEach(row => {
          newSelectedRows.add(String(row.id || row[processedColumns[0]?.key]));
        });
      }
      return { ...prev, selectedRows: newSelectedRows };
    });
  }, [paginatedData, processedColumns]);

  // Handle row expansion
  const handleRowExpand = useCallback((rowId: string) => {
    setState(prev => {
      const newExpandedRows = new Set(prev.expandedRows);
      if (newExpandedRows.has(rowId)) {
        newExpandedRows.delete(rowId);
      } else {
        newExpandedRows.add(rowId);
      }
      return { ...prev, expandedRows: newExpandedRows };
    });
  }, []);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setState(prev => ({ ...prev, currentPage: page }));
  }, []);

  // Handle items per page change
  const handleItemsPerPageChange = useCallback((items: number) => {
    setState(prev => ({ ...prev, itemsPerPage: items, currentPage: 1 }));
  }, []);

  // Format cell value
  const formatCellValue = useCallback((value: any, column: ProcessedColumn) => {
    if (value == null) return '-';

    if (column.format) {
      return column.format(value);
    }

    switch (column.type) {
      case 'currency':
        return formatCurrency(value);
      case 'number':
        return formatNumber(value);
      case 'percentage':
        return formatPercentage(value);
      case 'date':
        return formatDate(value);
      case 'boolean':
        return value ? 'Yes' : 'No';
      default:
        return String(value);
    }
  }, []);

  // Render cell content
  const renderCell = useCallback((row: DataTableRow, column: ProcessedColumn) => {
    const value = row[column.key];
    const formattedValue = formatCellValue(value, column);

    if (column.render) {
      return column.render(value, row, column);
    }

    return (
      <div className={`truncate ${column.className}`} title={column.tooltip ? String(value) : undefined}>
        {formattedValue}
      </div>
    );
  }, [formatCellValue]);

  // Generate ARIA attributes
  const ariaLabelText = useMemo(() => {
    return ariaLabel || generateAriaLabel('data table', title || 'data display');
  }, [ariaLabel, title]);

  const ariaDescriptionText = useMemo(() => {
    return ariaDescription || generateAriaDescription('data table', validData.length);
  }, [ariaDescription, validData.length]);

  // Loading state
  if (loading) {
    return (
      <div
        ref={tableRef}
        className={`bg-white rounded-lg shadow p-4 ${className}`}
        style={{ width, height }}
        role="status"
        aria-label="Loading data table"
      >
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-2">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-4 bg-gray-200 rounded flex-1"></div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        ref={tableRef}
        className={`bg-white rounded-lg shadow p-4 ${className}`}
        style={{ width, height }}
        role="alert"
        aria-label="Data table error"
      >
        <div className="text-center text-red-600">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="font-medium">Error loading data</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (validData.length === 0) {
    return (
      <div
        ref={tableRef}
        className={`bg-white rounded-lg shadow p-4 ${className}`}
        style={{ width, height }}
        role="status"
        aria-label="No data available"
      >
        <div className="text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="font-medium">No data available</p>
          <p className="text-sm">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={tableRef}
      className={`bg-white rounded-lg shadow ${className}`}
      style={{ width, height }}
      role="table"
      aria-label={ariaLabelText}
      aria-describedby={`data-table-description-${title?.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-600">{subtitle}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {searchable && (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            )}

            {filterable && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  showFilters
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                </svg>
              </button>
            )}

            {exportable && (
              <button
                onClick={() => onExport?.(paginatedData)}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            )}

            {onRefresh && (
              <button
                onClick={onRefresh}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Hidden description for screen readers */}
        <div
          id={`data-table-description-${title?.toLowerCase().replace(/\s+/g, '-')}`}
          className="sr-only"
        >
          {ariaDescriptionText}
        </div>

        {/* Filters */}
        {showFilters && filterable && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {processedColumns.filter(col => col.filterable).map(column => (
                <div key={column.key} className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">
                    {column.label}
                  </label>
                  <input
                    type="text"
                    placeholder={`Filter ${column.label}...`}
                    value={state.filters[column.key] || ''}
                    onChange={(e) => handleFilter(column.key, e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            {/* Header */}
            {showColumnHeaders && (
              <thead>
                <tr className="border-b border-gray-200">
                  {selectable && (
                    <th className="px-3 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={paginatedData.length > 0 && paginatedData.every(row => 
                          state.selectedRows.has(String(row.id || row[processedColumns[0]?.key]))
                        )}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                  )}
                  {expandable && (
                    <th className="px-3 py-3 text-left w-8"></th>
                  )}
                  {showRowNumbers && (
                    <th className="px-3 py-3 text-left text-sm font-medium text-gray-500 w-12">#</th>
                  )}
                  {processedColumns.map(column => (
                    <th
                      key={column.key}
                      className={`px-3 py-3 text-left text-sm font-medium text-gray-500 ${
                        column.sortable ? 'cursor-pointer hover:text-gray-700' : ''
                      }`}
                      style={{
                        width: column.width,
                        minWidth: column.minWidth,
                        maxWidth: column.maxWidth,
                      }}
                      onClick={() => column.sortable && handleSort(column.key)}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{column.label}</span>
                        {column.sortable && state.sortColumn === column.key && (
                          <svg
                            className={`w-4 h-4 ${
                              state.sortDirection === 'asc' ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
            )}

            {/* Body */}
            <tbody>
              {paginatedData.map((row, index) => {
                const rowId = String(row.id || row[processedColumns[0]?.key]);
                const isSelected = state.selectedRows.has(rowId);
                const isExpanded = state.expandedRows.has(rowId);
                const rowNumber = (state.currentPage - 1) * state.itemsPerPage + index + 1;

                return (
                  <React.Fragment key={rowId}>
                    <tr
                      className={`border-b border-gray-100 ${
                        striped && index % 2 === 1 ? 'bg-gray-50' : ''
                      } ${hoverable ? 'hover:bg-gray-100' : ''} ${
                        isSelected ? 'bg-blue-50' : ''
                      } transition-colors`}
                      onClick={() => onRowClick?.(row)}
                    >
                      {selectable && (
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleRowSelect(rowId, e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                      )}
                      {expandable && (
                        <td className="px-3 py-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowExpand(rowId);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <svg
                              className={`w-4 h-4 transition-transform ${
                                isExpanded ? 'rotate-90' : ''
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </td>
                      )}
                      {showRowNumbers && (
                        <td className="px-3 py-3 text-sm text-gray-500">
                          {rowNumber}
                        </td>
                      )}
                      {processedColumns.map(column => (
                        <td
                          key={column.key}
                          className={`px-3 py-3 text-sm ${
                            column.align === 'right' ? 'text-right' :
                            column.align === 'center' ? 'text-center' : 'text-left'
                          }`}
                          style={{
                            width: column.width,
                            minWidth: column.minWidth,
                            maxWidth: column.maxWidth,
                          }}
                        >
                          {renderCell(row, column)}
                        </td>
                      ))}
                    </tr>
                    {/* Expanded row content */}
                    {expandable && isExpanded && (
                      <tr>
                        <td colSpan={processedColumns.length + (selectable ? 1 : 0) + (showRowNumbers ? 1 : 0)}>
                          <div className="px-3 py-4 bg-gray-50 border-b border-gray-100">
                            {/* Custom expanded content can be added here */}
                            <pre className="text-xs text-gray-600 overflow-auto">
                              {JSON.stringify(row, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {showFooter && (
          <div className="mt-4 flex items-center justify-between">
            {/* Pagination Info */}
            <div className="text-sm text-gray-600">
              Showing {paginationInfo.startItem} to {paginationInfo.endItem} of {paginationInfo.totalItems} results
            </div>

            {/* Pagination Controls */}
            {pagination && paginationInfo.totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(paginationInfo.currentPage - 1)}
                  disabled={!paginationInfo.hasPrevPage}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, paginationInfo.totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1 text-sm border rounded-md ${
                        page === paginationInfo.currentPage
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(paginationInfo.currentPage + 1)}
                  disabled={!paginationInfo.hasNextPage}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>

                {/* Items per page */}
                <select
                  value={state.itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[10, 25, 50, 100].filter(n => n <= maxItemsPerPage).map(n => (
                    <option key={n} value={n}>
                      {n} per page
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DataTable;

