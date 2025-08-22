import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import Button from '../ui/Button';
import { statusColors, columnFormatters } from '../../config/tableConfigs';
import { TableConfig } from '../../config/tableConfigs';

interface DataTableProps {
  data: any[];
  tableConfig: TableConfig;
  loading?: boolean;
  onEdit?: (record: any) => void;
  onDelete?: (record: any) => void;
  onSort?: (field: string, order: 'asc' | 'desc') => void;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

const DataTable: React.FC<DataTableProps> = ({
  data,
  tableConfig,
  loading = false,
  onEdit,
  onDelete,
  onSort,
  sortField,
  sortOrder,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}) => {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const handleSort = (field: string) => {
    if (!onSort) return;
    
    const newOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(field, newOrder);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(data.map(record => record.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (recordId: string, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(recordId);
    } else {
      newSelected.delete(recordId);
    }
    setSelectedRows(newSelected);
  };

  const formatCellValue = (value: any, field: string) => {
    const formatter = columnFormatters[field];
    if (formatter) {
      return formatter(value);
    }
    return value || '-';
  };

  const getStatusClass = (status: string) => {
    return statusColors[status as keyof typeof statusColors] || 'status-active';
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ChevronUp className="w-4 h-4 text-slate-400" />;
    }
    
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-slate-600" />
    ) : (
      <ChevronDown className="w-4 h-4 text-slate-600" />
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header">
                <input
                  type="checkbox"
                  checked={selectedRows.size === data.length && data.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-slate-600 bg-white border-slate-300 rounded focus:ring-slate-500"
                />
              </th>
              {tableConfig.displayColumns.map((column: string) => (
                <th
                  key={column}
                  className="table-header cursor-pointer hover:bg-slate-700 transition-colors duration-200"
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center space-x-2">
                    <span>{column.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
                    {onSort && renderSortIcon(column)}
                  </div>
                </th>
              ))}
              <th className="table-header w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((record) => (
              <tr
                key={record.id}
                className="hover:bg-slate-50 transition-colors duration-200"
              >
                <td className="table-cell">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(record.id)}
                    onChange={(e) => handleSelectRow(record.id, e.target.checked)}
                    className="w-4 h-4 text-slate-600 bg-white border-slate-300 rounded focus:ring-slate-500"
                  />
                </td>
                {tableConfig.displayColumns.map((column: string) => (
                  <td key={column} className="table-cell">
                    {column === 'status' ? (
                      <span className={`status-badge ${getStatusClass(record[column])}`}>
                        {record[column]}
                      </span>
                    ) : (
                      <span className="text-slate-900">
                        {formatCellValue(record[column], column)}
                      </span>
                    )}
                  </td>
                ))}
                <td className="table-cell">
                  <div className="flex items-center space-x-2">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(record)}
                        className="p-2 hover:bg-slate-100"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(record)}
                        className="p-2 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2 hover:bg-slate-100"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && onPageChange && (
        <div className="px-8 py-6 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Page {currentPage} of {totalPages}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                Previous
              </Button>
              
              {[...Array(totalPages)].map((_, i) => {
                const page = i + 1;
                const isCurrent = page === currentPage;
                const isNearCurrent = Math.abs(page - currentPage) <= 2;
                
                if (isCurrent || isNearCurrent || page === 1 || page === totalPages) {
                  return (
                    <Button
                      key={page}
                      variant={isCurrent ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => onPageChange(page)}
                      className="w-10 h-10 p-0"
                    >
                      {page}
                    </Button>
                  );
                } else if (page === currentPage - 3 || page === currentPage + 3) {
                  return (
                    <span key={page} className="px-2 text-slate-400">
                      ...
                    </span>
                  );
                }
                return null;
              })}
              
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
