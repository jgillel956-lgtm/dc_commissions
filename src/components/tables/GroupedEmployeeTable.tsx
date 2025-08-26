import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Edit, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import { statusColors, columnFormatters } from '../../config/tableConfigs';
import { TableConfig } from '../../config/tableConfigs';
import { useLookupData } from '../../hooks/useZohoData';

interface GroupedEmployeeTableProps {
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
  onToggleView?: () => void;
}

interface GroupedData {
  employeeName: string;
  employeeId: number;
  records: any[];
  totalCommission: number;
  avgCommissionPercentage: number;
  companies: string[];
  paymentMethods: string[];
}

const GroupedEmployeeTable: React.FC<GroupedEmployeeTableProps> = ({
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
  onToggleView,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [expandAll, setExpandAll] = useState(false);
  const [subrowSorting, setSubrowSorting] = useState<Record<string, { field: string; order: 'asc' | 'desc' }>>({});
  const lookupData = useLookupData(tableConfig.tableName);

  // Handle subrow sorting
  const handleSubrowSort = (employeeKey: string, field: string) => {
    const currentSort = subrowSorting[employeeKey];
    const newOrder = currentSort?.field === field && currentSort?.order === 'asc' ? 'desc' : 'asc';
    
    setSubrowSorting(prev => ({
      ...prev,
      [employeeKey]: { field, order: newOrder }
    }));
  };

  // Sort records for a specific employee
  const getSortedRecords = (records: any[], employeeKey: string) => {
    const sort = subrowSorting[employeeKey];
    if (!sort) return records;

    return [...records].sort((a, b) => {
      let aValue = a[sort.field];
      let bValue = b[sort.field];

      // Handle special cases
      if (sort.field === 'payment_method_id') {
        const aMethod = lookupData.paymentMethods?.find((m: any) => m.id.toString() === aValue?.toString());
        const bMethod = lookupData.paymentMethods?.find((m: any) => m.id.toString() === bValue?.toString());
        aValue = aMethod?.payment_method || '';
        bValue = bMethod?.payment_method || '';
      } else if (sort.field === 'company_id') {
        const aCompany = lookupData.companies?.find((c: any) => c.id.toString() === aValue?.toString());
        const bCompany = lookupData.companies?.find((c: any) => c.id.toString() === bValue?.toString());
        aValue = aCompany?.company || '';
        bValue = bCompany?.company || '';
      } else if (sort.field === 'commission_percentage' || sort.field === 'commission_amount') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      } else if (sort.field === 'effective_start_date') {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      }

      if (aValue < bValue) return sort.order === 'asc' ? -1 : 1;
      if (aValue > bValue) return sort.order === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Group data by employee
  const groupedData: GroupedData[] = useMemo(() => {
    const groups: Record<string, GroupedData> = {};

    data.forEach(record => {
      const employeeKey = `${record.employee_name}_${record.employee_id}`;
      
      if (!groups[employeeKey]) {
        groups[employeeKey] = {
          employeeName: record.employee_name,
          employeeId: record.employee_id,
          records: [],
          totalCommission: 0,
          avgCommissionPercentage: 0,
          companies: [],
          paymentMethods: []
        };
      }

      groups[employeeKey].records.push(record);
      
      // Calculate totals
      if (record.commission_amount) {
        groups[employeeKey].totalCommission += parseFloat(record.commission_amount);
      }

      // Collect unique companies and payment methods
      if (record.company_id) {
        const company = lookupData.companies?.find((c: any) => c.id.toString() === record.company_id.toString());
        if (company && !groups[employeeKey].companies.includes(company.company)) {
          groups[employeeKey].companies.push(company.company);
        }
      }

      if (record.payment_method_id) {
        const paymentMethod = lookupData.paymentMethods?.find((m: any) => m.id.toString() === record.payment_method_id.toString());
        if (paymentMethod && !groups[employeeKey].paymentMethods.includes(paymentMethod.payment_method)) {
          groups[employeeKey].paymentMethods.push(paymentMethod.payment_method);
        }
      }
    });

    // Calculate average commission percentage for each group
    Object.values(groups).forEach(group => {
      const totalPercentage = group.records.reduce((sum, record) => {
        return sum + (record.commission_percentage ? parseFloat(record.commission_percentage) : 0);
      }, 0);
      group.avgCommissionPercentage = group.records.length > 0 ? totalPercentage / group.records.length : 0;
    });

    return Object.values(groups);
  }, [data, lookupData]);

  // Use the grouped data directly since filtering is handled by the parent component
  const filteredGroupedData = groupedData;

  const toggleGroup = (employeeKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(employeeKey)) {
      newExpanded.delete(employeeKey);
    } else {
      newExpanded.add(employeeKey);
    }
    setExpandedGroups(newExpanded);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set<string>();
      filteredGroupedData.forEach(group => {
        group.records.forEach(record => allIds.add(record.id));
      });
      setSelectedRows(allIds);
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
    // Handle NaN values
    if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) {
      return '-';
    }

    if (tableConfig.tableName === 'employee_commissions_DC') {
      if (field === 'payment_method_id' && value) {
        const paymentMethod = lookupData.paymentMethods?.find((method: any) => method.id.toString() === value.toString());
        return paymentMethod?.payment_method || value || '-';
      }
      if (field === 'company_id' && value) {
        const company = lookupData.companies?.find((company: any) => company.id.toString() === value.toString());
        return company?.company || value || '-';
      }
    }

    const formatter = columnFormatters[field];
    if (formatter) {
      const formatted = formatter(value);
      return formatted === 'NaN' || formatted === '$NaN' ? '-' : formatted;
    }
    return value || '-';
  };

  const getStatusClass = (status: string) => {
    return statusColors[status as keyof typeof statusColors] || 'status-active';
  };

  const toggleExpandAll = () => {
    if (expandAll) {
      setExpandedGroups(new Set());
    } else {
      setExpandedGroups(new Set(filteredGroupedData.map(group => `${group.employeeName}_${group.employeeId}`)));
    }
    setExpandAll(!expandAll);
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
      {/* Table Header with Actions */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Employee Groups</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={toggleExpandAll}
              className="flex items-center gap-2"
            >
              {expandAll ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Collapse All
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Expand All
                </>
              )}
            </Button>
            {onToggleView && (
              <Button
                variant="primary"
                size="sm"
                onClick={onToggleView}
                className="flex items-center gap-2"
              >
                Regular View
              </Button>
            )}
          </div>
        </div>
      </div>

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
              <th className="table-header">Employee</th>
              <th className="table-header">Total Commission</th>
              <th className="table-header">Avg Commission %</th>
              <th className="table-header">Companies</th>
              <th className="table-header">Payment Methods</th>
              <th className="table-header">Records</th>
              <th className="table-header w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredGroupedData.map((group) => {
              const employeeKey = `${group.employeeName}_${group.employeeId}`;
              const isExpanded = expandedGroups.has(employeeKey);
              
              return (
                <React.Fragment key={employeeKey}>
                  {/* Group Header Row */}
                  <tr className="hover:bg-slate-50 transition-colors duration-200 border-b border-slate-100">
                    <td className="table-cell">
                      <input
                        type="checkbox"
                        checked={group.records.every(record => selectedRows.has(record.id))}
                        onChange={(e) => {
                          const newSelected = new Set(selectedRows);
                          if (e.target.checked) {
                            group.records.forEach(record => newSelected.add(record.id));
                          } else {
                            group.records.forEach(record => newSelected.delete(record.id));
                          }
                          setSelectedRows(newSelected);
                        }}
                        className="w-4 h-4 text-slate-600 bg-white border-slate-300 rounded focus:ring-slate-500"
                      />
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleGroup(employeeKey)}
                          className="p-1 hover:bg-slate-200 rounded transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-600" />
                          ) : (
                            <ChevronUp className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                        <div>
                          <div className="font-medium text-slate-900">{group.employeeName}</div>
                          <div className="text-sm text-slate-500">ID: {group.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="font-medium text-slate-900">
                        {formatCellValue(group.totalCommission, 'commission_amount')}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="font-medium text-slate-900">
                        {formatCellValue(group.avgCommissionPercentage, 'commission_percentage')}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-wrap gap-1">
                        {group.companies.slice(0, 2).map((company, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {company}
                          </span>
                        ))}
                        {group.companies.length > 2 && (
                          <div className="relative group">
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full cursor-help">
                              +{group.companies.length - 2} more
                            </span>
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10 bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-max">
                              <div className="text-xs font-medium text-slate-700 mb-2">All Companies:</div>
                              <div className="flex flex-wrap gap-1">
                                {group.companies.map((company, index) => (
                                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                    {company}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-wrap gap-1">
                        {group.paymentMethods.slice(0, 2).map((method, index) => (
                          <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            {method}
                          </span>
                        ))}
                        {group.paymentMethods.length > 2 && (
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">
                            +{group.paymentMethods.length - 2} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="text-slate-600">{group.records.length} records</span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleGroup(employeeKey)}
                          className="p-2 hover:bg-slate-100"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Records */}
                  {isExpanded && (
                    <>
                      <tr className="bg-slate-50">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="text-sm font-medium text-slate-700 mb-3">
                            Commission Records for {group.employeeName}
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-slate-200">
                                  <th 
                                    className="text-left py-2 px-3 font-medium text-slate-600 cursor-pointer hover:bg-slate-50 select-none"
                                    onClick={() => handleSubrowSort(employeeKey, 'payment_method_id')}
                                  >
                                    Payment Method
                                    {subrowSorting[employeeKey]?.field === 'payment_method_id' && (
                                      <span className="ml-1">
                                        {subrowSorting[employeeKey]?.order === 'asc' ? '↑' : '↓'}
                                      </span>
                                    )}
                                  </th>
                                  <th 
                                    className="text-left py-2 px-3 font-medium text-slate-600 cursor-pointer hover:bg-slate-50 select-none"
                                    onClick={() => handleSubrowSort(employeeKey, 'company_id')}
                                  >
                                    Company
                                    {subrowSorting[employeeKey]?.field === 'company_id' && (
                                      <span className="ml-1">
                                        {subrowSorting[employeeKey]?.order === 'asc' ? '↑' : '↓'}
                                      </span>
                                    )}
                                  </th>
                                  <th 
                                    className="text-left py-2 px-3 font-medium text-slate-600 cursor-pointer hover:bg-slate-50 select-none"
                                    onClick={() => handleSubrowSort(employeeKey, 'commission_percentage')}
                                  >
                                    Commission %
                                    {subrowSorting[employeeKey]?.field === 'commission_percentage' && (
                                      <span className="ml-1">
                                        {subrowSorting[employeeKey]?.order === 'asc' ? '↑' : '↓'}
                                      </span>
                                    )}
                                  </th>
                                  <th 
                                    className="text-left py-2 px-3 font-medium text-slate-600 cursor-pointer hover:bg-slate-50 select-none"
                                    onClick={() => handleSubrowSort(employeeKey, 'commission_amount')}
                                  >
                                    Commission Amount
                                    {subrowSorting[employeeKey]?.field === 'commission_amount' && (
                                      <span className="ml-1">
                                        {subrowSorting[employeeKey]?.order === 'asc' ? '↑' : '↓'}
                                      </span>
                                    )}
                                  </th>
                                  <th 
                                    className="text-left py-2 px-3 font-medium text-slate-600 cursor-pointer hover:bg-slate-50 select-none"
                                    onClick={() => handleSubrowSort(employeeKey, 'effective_start_date')}
                                  >
                                    Start Date
                                    {subrowSorting[employeeKey]?.field === 'effective_start_date' && (
                                      <span className="ml-1">
                                        {subrowSorting[employeeKey]?.order === 'asc' ? '↑' : '↓'}
                                      </span>
                                    )}
                                  </th>
                                  <th 
                                    className="text-left py-2 px-3 font-medium text-slate-600 cursor-pointer hover:bg-slate-50 select-none"
                                    onClick={() => handleSubrowSort(employeeKey, 'active')}
                                  >
                                    Status
                                    {subrowSorting[employeeKey]?.field === 'active' && (
                                      <span className="ml-1">
                                        {subrowSorting[employeeKey]?.order === 'asc' ? '↑' : '↓'}
                                      </span>
                                    )}
                                  </th>
                                  <th className="text-left py-2 px-3 font-medium text-slate-600">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {getSortedRecords(group.records, employeeKey).map((record) => (
                                  <tr key={record.id} className="border-b border-slate-100 hover:bg-white">
                                    <td className="py-2 px-3">
                                      {formatCellValue(record.payment_method_id, 'payment_method_id')}
                                    </td>
                                    <td className="py-2 px-3">
                                      {formatCellValue(record.company_id, 'company_id')}
                                    </td>
                                    <td className="py-2 px-3">
                                      {formatCellValue(record.commission_percentage, 'commission_percentage')}
                                    </td>
                                    <td className="py-2 px-3">
                                      {formatCellValue(record.commission_amount, 'commission_amount')}
                                    </td>
                                    <td className="py-2 px-3">
                                      {formatCellValue(record.effective_start_date, 'effective_start_date')}
                                    </td>
                                    <td className="py-2 px-3">
                                      <span className={`status-badge ${getStatusClass(record.active)}`}>
                                        {record.active ? 'Active' : 'Inactive'}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3">
                                      <div className="flex items-center space-x-1">
                                        {onEdit && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onEdit(record)}
                                            className="p-1 hover:bg-slate-100"
                                          >
                                            <Edit className="w-3 h-3" />
                                          </Button>
                                        )}
                                        {onDelete && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onDelete(record)}
                                            className="p-1 hover:bg-red-50 hover:text-red-600"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    </>
                  )}
                </React.Fragment>
              );
            })}
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

export default GroupedEmployeeTable;
