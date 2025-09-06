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
export const export const useEmployeeData = (options: UseEmployeeDataOptions = {}): UseEmployeeDataReturn => {
  const {
    initialSelectedIds = [],
    enableSearch = true,
    useMockData = true, // Use mock data for development
    autoLoad = true
  } = options;

  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>(initialSelectedIds);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Employee[]>([]);

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
    return employees.filter(employee => selectedIds.includes(employee.id || 0));
  }, [employees, selectedIds]);

  // Filtered employees (either search results or all employees)
  const filteredEmployees = useMemo(() => {
    if (searchTerm && searchResults.length > 0) {
      return searchResults;
    }
    return employees;
  }, [searchTerm, searchResults, employees]);

  // Statistics - simplified for Employee interface
  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(e => e.status === 'active').length;
    const inactive = employees.filter(e => e.status === 'inactive').length;
    const byDepartment = { 'All': total };
    const byRole = { 'Employee': total };
    const totalCommissions = 0;
    const totalTransactions = 0;
    const averageCommissionRate = 0;

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
    const allIds = filteredEmployees.map(employee => employee.id || 0);
    setSelectedIds(allIds);
  }, [filteredEmployees]);

  const deselectAllEmployees = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // Utility functions
  const getEmployeeById = useCallback((id: number): Employee | undefined => {
    return employees.find(employee => employee.id === id);
  }, [employees]);

  const getEmployeesByIds = useCallback((ids: number[]): Employee[] => {
    return employees.filter(employee => employee.id && ids.includes(employee.id));
  }, [employees]);

  const refreshEmployees = useCallback(async () => {
    await loadEmployees();
  }, [loadEmployees]);

  // Sorting function
  const sortEmployees = useCallback((sortBy: 'name' | 'employee_id' | 'department' | 'role' | 'commission_rate' | 'hire_date') => {
    setEmployees(prev => [...prev].sort((a, b) => {
      // For Employee interface, only 'name' is available
      return a.name.localeCompare(b.name);
    }));
  }, []);

  // Simplified department and role filtering for Employee interface
  const selectedDepartments: string[] = [];
  const selectedRoles: string[] = [];

  const toggleDepartmentFilter = useCallback((department: string) => {
    // No-op for simplified Employee interface
  }, []);

  const clearDepartmentFilters = useCallback(() => {
    // No-op for simplified Employee interface
  }, []);

  const getEmployeesByDepartment = useCallback((department: string) => {
    return employees;
  }, [employees]);

  const toggleRoleFilter = useCallback((role: string) => {
    // No-op for simplified Employee interface
  }, []);

  const clearRoleFilters = useCallback(() => {
    // No-op for simplified Employee interface
  }, []);

  const getEmployeesByRole = useCallback((role: string) => {
    return employees;
  }, [employees]);

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
};;

export default useEmployeeData;




