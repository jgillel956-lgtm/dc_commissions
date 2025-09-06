import React, { useState, useMemo } from 'react';
import { 
  Search, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Users, 
  Building, 
  UserCheck,
  Check,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Employee } from '../../services/employeeApi';

export interface EmployeeMultiSelectProps {
  employees: Employee[];
  selectedIds: number[];
  onSelectionChange: (selectedIds: number[]) => void;
  loading?: boolean;
  error?: string | null;
  placeholder?: string;
  showEmployeeIds?: boolean;
  showEmployeeEmails?: boolean;
  showEmployeeDepartments?: boolean;
  showEmployeeRoles?: boolean;
  allowSelectAll?: boolean;
  enableDepartmentFiltering?: boolean;
  enableRoleFiltering?: boolean;
  className?: string;
}

const EmployeeMultiSelect: React.FC<EmployeeMultiSelectProps> = ({
  employees,
  selectedIds,
  onSelectionChange,
  loading = false,
  error = null,
  placeholder = 'Select employees...',
  showEmployeeIds = true,
  showEmployeeEmails = true,
  showEmployeeDepartments = true,
  showEmployeeRoles = true,
  allowSelectAll = true,
  enableDepartmentFiltering = true,
  enableRoleFiltering = true,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'selected'>('all');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  // Get departments and roles for filtering
  const departments = useMemo(() => {
    const deptMap = new Map<string, number>();
    employees.forEach(emp => {
      deptMap.set(emp.department, (deptMap.get(emp.department) || 0) + 1);
    });
    return Array.from(deptMap.entries()).map(([dept, count]) => ({ value: dept, label: dept, count }));
  }, [employees]);

  const roles = useMemo(() => {
    const roleMap = new Map<string, number>();
    employees.forEach(emp => {
      roleMap.set(emp.role, (roleMap.get(emp.role) || 0) + 1);
    });
    return Array.from(roleMap.entries()).map(([role, count]) => ({ value: role, label: role, count }));
  }, [employees]);

  // Filter employees based on search, department, and role filters
  const filteredEmployees = useMemo(() => {
    let filtered = employees;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply department filter
    if (enableDepartmentFiltering && selectedDepartments.length > 0) {
      filtered = filtered.filter(emp => selectedDepartments.includes(emp.department));
    }

    // Apply role filter
    if (enableRoleFiltering && selectedRoles.length > 0) {
      filtered = filtered.filter(emp => selectedRoles.includes(emp.role));
    }

    // Apply view mode filter
    if (viewMode === 'selected') {
      filtered = filtered.filter(emp => selectedIds.includes(emp.id));
    }

    return filtered;
  }, [employees, searchTerm, selectedDepartments, selectedRoles, viewMode, selectedIds, enableDepartmentFiltering, enableRoleFiltering]);

  // Toggle employee selection
  const toggleEmployee = (employeeId: number) => {
    const newSelectedIds = selectedIds.includes(employeeId)
      ? selectedIds.filter(id => id !== employeeId)
      : [...selectedIds, employeeId];
    onSelectionChange(newSelectedIds);
  };

  // Select all visible employees
  const selectAllVisible = () => {
    const visibleIds = filteredEmployees.map(emp => emp.id);
    const newSelectedIds = [...new Set([...selectedIds, ...visibleIds])];
    onSelectionChange(newSelectedIds);
  };

  // Deselect all employees
  const deselectAll = () => {
    onSelectionChange([]);
  };

  // Toggle department filter
  const toggleDepartmentFilter = (department: string) => {
    setSelectedDepartments(prev =>
      prev.includes(department)
        ? prev.filter(d => d !== department)
        : [...prev, department]
    );
  };

  // Toggle role filter
  const toggleRoleFilter = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDepartments([]);
    setSelectedRoles([]);
    setViewMode('all');
  };

  // Get selected employees
  const selectedEmployees = useMemo(() => {
    return employees.filter(emp => selectedIds.includes(emp.id));
  }, [employees, selectedIds]);

  // Remove selected employee
  const removeSelected = (employeeId: number) => {
    onSelectionChange(selectedIds.filter(id => id !== employeeId));
  };

  const hasActiveFilters = searchTerm || selectedDepartments.length > 0 || selectedRoles.length > 0 || viewMode === 'selected';

  return (
    <div className={`relative ${className}`}>
      {/* Selected employees display */}
      {selectedEmployees.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {selectedEmployees.map(emp => (
            <span
              key={emp.id}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            >
              <span className="truncate max-w-32">
                {emp.name}
                {showEmployeeIds && ` (${emp.employee_id})`}
              </span>
              <button
                onClick={() => removeSelected(emp.id)}
                className="ml-1 rounded-full p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800"
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
        className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
          error
            ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-600 dark:bg-red-900/20 dark:text-red-200'
            : loading
            ? 'border-gray-300 bg-gray-50 text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400'
            : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-gray-500'
        }`}
      >
        <span className="flex items-center gap-2">
          <Users size={16} />
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Loading employees...
            </span>
          ) : error ? (
            <span className="flex items-center gap-2">
              <AlertCircle size={16} />
              Error loading employees
            </span>
          ) : selectedEmployees.length > 0 ? (
            <span>
              {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? 's' : ''} selected
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
                placeholder="Search employees..."
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
                All ({employees.length})
              </button>
              <button
                onClick={() => setViewMode('selected')}
                className={`flex-1 px-3 py-1 text-xs transition-colors ${
                  viewMode === 'selected'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Selected ({selectedEmployees.length})
              </button>
            </div>

            {/* Department filters */}
            {enableDepartmentFiltering && departments.length > 0 && (
              <div className="mb-3">
                <div className="mb-2 flex items-center gap-2">
                  <Building size={14} />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Departments</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {departments.map(dept => (
                    <button
                      key={dept.value}
                      onClick={() => toggleDepartmentFilter(dept.value)}
                      className={`rounded-full px-2 py-1 text-xs transition-colors ${
                        selectedDepartments.includes(dept.value)
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {dept.label} ({dept.count})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Role filters */}
            {enableRoleFiltering && roles.length > 0 && (
              <div className="mb-3">
                <div className="mb-2 flex items-center gap-2">
                  <UserCheck size={14} />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Roles</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {roles.map(role => (
                    <button
                      key={role.value}
                      onClick={() => toggleRoleFilter(role.value)}
                      className={`rounded-full px-2 py-1 text-xs transition-colors ${
                        selectedRoles.includes(role.value)
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {role.label} ({role.count})
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
          {allowSelectAll && filteredEmployees.length > 0 && (
            <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
              <div className="flex gap-2">
                <button
                  onClick={selectAllVisible}
                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Select all visible ({filteredEmployees.length})
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

          {/* Employee list */}
          <div className="max-h-60 overflow-y-auto">
            {filteredEmployees.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                {searchTerm || selectedDepartments.length > 0 || selectedRoles.length > 0
                  ? 'No employees match the current filters'
                  : 'No employees available'}
              </div>
            ) : (
              filteredEmployees.map(emp => (
                <div
                  key={emp.id}
                  onClick={() => toggleEmployee(emp.id)}
                  className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    selectedIds.includes(emp.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className={`flex h-4 w-4 items-center justify-center rounded border ${
                    selectedIds.includes(emp.id)
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {selectedIds.includes(emp.id) && <Check size={12} className="text-white" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {emp.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                      {showEmployeeIds && (
                        <div>ID: {emp.employee_id}</div>
                      )}
                      {showEmployeeEmails && (
                        <div>Email: {emp.email}</div>
                      )}
                      {showEmployeeDepartments && (
                        <div>Department: {emp.department}</div>
                      )}
                      {showEmployeeRoles && (
                        <div>Role: {emp.role} ({emp.commission_rate}% commission)</div>
                      )}
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

export default EmployeeMultiSelect;




