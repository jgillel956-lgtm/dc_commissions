import { useState, useEffect, useCallback, useMemo } from 'react';
import { Employee, fetchAllEmployees, searchEmployees, getMockEmployees, mockSearchEmployees } from '../services/employeeApi';

export interface UseEmployeeDataReturn {
  // Employee data
  employees: Employee[];
  selectedEmployees: Employee[];
  
  // Loading and error states
  loading: boolean;
  error: string | null;
  
  // Search functionality
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchResults: Employee[];
  isSearching: boolean;
  
  // Selection management
  selectedIds: number[];
  toggleEmployee: (employeeId: number) => void;
  selectEmployee: (employeeId: number) => void;
  deselectEmployee: (employeeId: number) => void;
  selectAllEmployees: () => void;
  deselectAllEmployees: () => void;
  setSelectedIds: (ids: number[]) => void;
  
  // Utility functions
  getEmployeeById: (id: number) => Employee | undefined;
  getEmployeesByIds: (ids: number[]) => Employee[];
  refreshEmployees: () => Promise<void>;
  
  // Filtering and sorting
  filteredEmployees: Employee[];
  sortEmployees: (sortBy: 'name' | 'employee_id' | 'department' | 'role' | 'commission_rate' | 'hire_date') => void;
  
  // Department filtering
  selectedDepartments: string[];
  toggleDepartmentFilter: (department: string) => void;
  clearDepartmentFilters: () => void;
  getEmployeesByDepartment: (department: string) => Employee[];
  
  // Role filtering
  selectedRoles: string[];
  toggleRoleFilter: (role: string) => void;
  clearRoleFilters: () => void;
  getEmployeesByRole: (role: string) => Employee[];
  
  // Statistics
  stats: {
    total: number;
    active: number;
    inactive: number;
    byDepartment: Record<string, number>;
    byRole: Record<string, number>;
    totalCommissions: number;
    totalTransactions: number;
    averageCommissionRate: number;
  };
}

export interface UseEmployeeDataOptions {
  initialSelectedIds?: number[];
  enableSearch?: boolean;
  useMockData?: boolean;
  autoLoad?: boolean;
  enableDepartmentFiltering?: boolean;
  enableRoleFiltering?: boolean;
}

/**
 * Custom hook for managing employee data with search and selection functionality
 */
export const useEmployeeData = (options: UseEmployeeDataOptions = {}): UseEmployeeDataReturn => {
  const {
    initialSelectedIds = [],
    enableSearch = true,
    useMockData = true, // Use mock data for development
    autoLoad = true,
    enableDepartmentFiltering = true,
    enableRoleFiltering = true
  } = options;

  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>(initialSelectedIds);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  // Load employees on mount
  useEffect(() => {
    if (autoLoad) {
      loadEmployees();
    }
  }, [autoLoad]);

  // Load employees function
  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let employeeData: Employee[];
      
      if (useMockData) {
        // Use mock data for development
        employeeData = getMockEmployees();
      } else {
        // Use real API
        employeeData = await fetchAllEmployees();
      }
      
      setEmployees(employeeData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employees');
      console.error('Error loading employees:', err);
    } finally {
      setLoading(false);
    }
  }, [useMockData]);

  // Search employees
  const performSearch = useCallback(async (term: string) => {
    if (!enableSearch || !term.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    try {
      let results: Employee[];
      
      if (useMockData) {
        // Use mock search for development
        results = mockSearchEmployees(term);
      } else {
        // Use real API search
        results = await searchEmployees(term);
      }
      
      setSearchResults(results);
    } catch (err) {
      console.error('Error searching employees:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [enableSearch, useMockData]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchTerm);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchTerm, performSearch]);

  // Selected employees (employees that are in selectedIds)
  const selectedEmployees = useMemo(() => {
    return employees.filter(employee => selectedIds.includes(employee.id));
  }, [employees, selectedIds]);

  // Filtered employees (considering search results, department filters, role filters, and all employees)
  const filteredEmployees = useMemo(() => {
    let filtered = employees;

    // Apply department filtering if enabled and departments are selected
    if (enableDepartmentFiltering && selectedDepartments.length > 0) {
      filtered = filtered.filter(employee => 
        employee.department && selectedDepartments.includes(employee.department)
      );
    }

    // Apply role filtering if enabled and roles are selected
    if (enableRoleFiltering && selectedRoles.length > 0) {
      filtered = filtered.filter(employee => 
        employee.role && selectedRoles.includes(employee.role)
      );
    }

    // Apply search results if available
    if (searchTerm && searchResults.length > 0) {
      const searchResultIds = searchResults.map(employee => employee.id);
      filtered = filtered.filter(employee => searchResultIds.includes(employee.id));
    }

    // Sort by department first, then by role, then by name for better user experience
    if ((enableDepartmentFiltering && selectedDepartments.length > 0) || 
        (enableRoleFiltering && selectedRoles.length > 0)) {
      filtered = filtered.sort((a, b) => {
        // First sort by department (in the order of selectedDepartments)
        if (enableDepartmentFiltering && selectedDepartments.length > 0) {
          const aDeptIndex = selectedDepartments.indexOf(a.department);
          const bDeptIndex = selectedDepartments.indexOf(b.department);
          if (aDeptIndex !== bDeptIndex) {
            return aDeptIndex - bDeptIndex;
          }
        }
        
        // Then sort by role (in the order of selectedRoles)
        if (enableRoleFiltering && selectedRoles.length > 0) {
          const aRoleIndex = selectedRoles.indexOf(a.role);
          const bRoleIndex = selectedRoles.indexOf(b.role);
          if (aRoleIndex !== bRoleIndex) {
            return aRoleIndex - bRoleIndex;
          }
        }
        
        // Then sort by name within each group
        return a.name.localeCompare(b.name);
      });
    }

    return filtered;
  }, [employees, searchTerm, searchResults, selectedDepartments, selectedRoles, enableDepartmentFiltering, enableRoleFiltering]);

  // Statistics
  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(e => e.is_active).length;
    const inactive = employees.filter(e => !e.is_active).length;
    const byDepartment = employees.reduce((acc, employee) => {
      acc[employee.department] = (acc[employee.department] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const byRole = employees.reduce((acc, employee) => {
      acc[employee.role] = (acc[employee.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const totalCommissions = employees.reduce((sum, employee) => sum + (employee.total_commissions || 0), 0);
    const totalTransactions = employees.reduce((sum, employee) => sum + (employee.total_transactions || 0), 0);
    const averageCommissionRate = employees.length > 0 ? employees.reduce((sum, employee) => sum + employee.commission_rate, 0) / employees.length : 0;

    return { total, active, inactive, byDepartment, byRole, totalCommissions, totalTransactions, averageCommissionRate };
  }, [employees]);

  // Selection management functions
  const toggleEmployee = useCallback((employeeId: number) => {
    setSelectedIds(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  }, []);

  const selectEmployee = useCallback((employeeId: number) => {
    setSelectedIds(prev => 
      prev.includes(employeeId) ? prev : [...prev, employeeId]
    );
  }, []);

  const deselectEmployee = useCallback((employeeId: number) => {
    setSelectedIds(prev => prev.filter(id => id !== employeeId));
  }, []);

  const selectAllEmployees = useCallback(() => {
    const allIds = filteredEmployees.map(employee => employee.id);
    setSelectedIds(allIds);
  }, [filteredEmployees]);

  const deselectAllEmployees = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // Department filtering functions
  const toggleDepartmentFilter = useCallback((department: string) => {
    setSelectedDepartments(prev => 
      prev.includes(department)
        ? prev.filter(d => d !== department)
        : [...prev, department]
    );
  }, []);

  const clearDepartmentFilters = useCallback(() => {
    setSelectedDepartments([]);
  }, []);

  const getEmployeesByDepartment = useCallback((department: string) => {
    return employees.filter(employee => employee.department === department);
  }, [employees]);

  // Role filtering functions
  const toggleRoleFilter = useCallback((role: string) => {
    setSelectedRoles(prev => 
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  }, []);

  const clearRoleFilters = useCallback(() => {
    setSelectedRoles([]);
  }, []);

  const getEmployeesByRole = useCallback((role: string) => {
    return employees.filter(employee => employee.role === role);
  }, [employees]);

  // Utility functions
  const getEmployeeById = useCallback((id: number): Employee | undefined => {
    return employees.find(employee => employee.id === id);
  }, [employees]);

  const getEmployeesByIds = useCallback((ids: number[]): Employee[] => {
    return employees.filter(employee => ids.includes(employee.id));
  }, [employees]);

  const refreshEmployees = useCallback(async () => {
    await loadEmployees();
  }, [loadEmployees]);

  // Sorting function
  const sortEmployees = useCallback((sortBy: 'name' | 'employee_id' | 'department' | 'role' | 'commission_rate' | 'hire_date') => {
    setEmployees(prev => [...prev].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'employee_id':
          aValue = a.employee_id;
          bValue = b.employee_id;
          break;
        case 'department':
          aValue = a.department;
          bValue = b.department;
          break;
        case 'role':
          aValue = a.role;
          bValue = b.role;
          break;
        case 'commission_rate':
          aValue = a.commission_rate;
          bValue = b.commission_rate;
          break;
        case 'hire_date':
          aValue = a.hire_date;
          bValue = b.hire_date;
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        return aValue - bValue;
      }
      return 0;
    }));
  }, []);

  return {
    employees,
    selectedEmployees,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    searchResults,
    isSearching,
    selectedIds,
    toggleEmployee,
    selectEmployee,
    deselectEmployee,
    selectAllEmployees,
    deselectAllEmployees,
    setSelectedIds,
    getEmployeeById,
    getEmployeesByIds,
    refreshEmployees,
    filteredEmployees,
    sortEmployees,
    selectedDepartments,
    toggleDepartmentFilter,
    clearDepartmentFilters,
    getEmployeesByDepartment,
    selectedRoles,
    toggleRoleFilter,
    clearRoleFilters,
    getEmployeesByRole,
    stats
  };
};

export default useEmployeeData;

