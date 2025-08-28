import { renderHook, act, waitFor } from '@testing-library/react';
import { useEmployeeData } from './useEmployeeData';
import { getMockEmployees, mockSearchEmployees } from '../services/employeeApi';

// Mock the employee API
jest.mock('../services/employeeApi', () => ({
  fetchAllEmployees: jest.fn(),
  searchEmployees: jest.fn(),
  getMockEmployees: jest.fn(),
  mockSearchEmployees: jest.fn()
}));

describe('useEmployeeData', () => {
  const mockEmployees = [
    { id: 1, name: 'John Smith', email: 'john.smith@company.com', employee_id: 'EMP001', department: 'Sales', role: 'Sales Representative', commission_rate: 5.0, is_active: true, hire_date: '2023-01-15', total_commissions: 12500, total_transactions: 150, average_commission: 83.33 },
    { id: 2, name: 'Sarah Johnson', email: 'sarah.johnson@company.com', employee_id: 'EMP002', department: 'Sales', role: 'Senior Sales Representative', commission_rate: 6.5, is_active: true, hire_date: '2022-08-20', manager_id: 5, manager_name: 'Michael Davis', total_commissions: 18750, total_transactions: 200, average_commission: 93.75 },
    { id: 3, name: 'David Wilson', email: 'david.wilson@company.com', employee_id: 'EMP003', department: 'Operations', role: 'Operations Specialist', commission_rate: 2.5, is_active: true, hire_date: '2023-03-10', manager_id: 9, manager_name: 'Robert Taylor', total_commissions: 8900, total_transactions: 120, average_commission: 74.17 },
    { id: 4, name: 'Emily Brown', email: 'emily.brown@company.com', employee_id: 'EMP004', department: 'Customer Service', role: 'Customer Service Representative', commission_rate: 1.0, is_active: true, hire_date: '2023-06-05', manager_id: 13, manager_name: 'Christopher Lee', total_commissions: 7200, total_transactions: 95, average_commission: 75.79 },
    { id: 5, name: 'Michael Davis', email: 'michael.davis@company.com', employee_id: 'EMP005', department: 'Sales', role: 'Sales Manager', commission_rate: 3.0, is_active: false, hire_date: '2021-11-15', total_commissions: 15000, total_transactions: 300, average_commission: 50.00 }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (getMockEmployees as jest.Mock).mockReturnValue(mockEmployees);
    (mockSearchEmployees as jest.Mock).mockImplementation((term) => 
      mockEmployees.filter(employee => 
        employee.name.toLowerCase().includes(term.toLowerCase()) ||
        employee.email.toLowerCase().includes(term.toLowerCase()) ||
        employee.employee_id.toLowerCase().includes(term.toLowerCase()) ||
        employee.department.toLowerCase().includes(term.toLowerCase()) ||
        employee.role.toLowerCase().includes(term.toLowerCase())
      )
    );
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useEmployeeData({ autoLoad: false }));

    expect(result.current.employees).toEqual([]);
    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.searchTerm).toBe('');
    expect(result.current.isSearching).toBe(false);
    expect(result.current.selectedDepartments).toEqual([]);
    expect(result.current.selectedRoles).toEqual([]);
  });

  it('should load employees on mount when autoLoad is true', async () => {
    const { result } = renderHook(() => useEmployeeData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.employees).toEqual(mockEmployees);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should not load employees when autoLoad is false', () => {
    const { result } = renderHook(() => useEmployeeData({ autoLoad: false }));

    expect(result.current.employees).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should initialize with selected employee IDs', () => {
    const initialSelectedIds = [1, 3];
    const { result } = renderHook(() => 
      useEmployeeData({ initialSelectedIds, autoLoad: false })
    );

    expect(result.current.selectedIds).toEqual(initialSelectedIds);
  });

  it('should toggle employee selection', () => {
    const { result } = renderHook(() => useEmployeeData({ autoLoad: false }));

    act(() => {
      result.current.toggleEmployee(1);
    });

    expect(result.current.selectedIds).toEqual([1]);

    act(() => {
      result.current.toggleEmployee(1);
    });

    expect(result.current.selectedIds).toEqual([]);
  });

  it('should select and deselect employees', () => {
    const { result } = renderHook(() => useEmployeeData({ autoLoad: false }));

    act(() => {
      result.current.selectEmployee(1);
    });

    expect(result.current.selectedIds).toEqual([1]);

    act(() => {
      result.current.selectEmployee(2);
    });

    expect(result.current.selectedIds).toEqual([1, 2]);

    act(() => {
      result.current.deselectEmployee(1);
    });

    expect(result.current.selectedIds).toEqual([2]);
  });

  it('should select all employees', async () => {
    const { result } = renderHook(() => useEmployeeData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.employees).toEqual(mockEmployees);
    });

    act(() => {
      result.current.selectAllEmployees();
    });

    expect(result.current.selectedIds).toEqual([1, 2, 3, 4, 5]);
  });

  it('should deselect all employees', () => {
    const { result } = renderHook(() => 
      useEmployeeData({ initialSelectedIds: [1, 2, 3], autoLoad: false })
    );

    act(() => {
      result.current.deselectAllEmployees();
    });

    expect(result.current.selectedIds).toEqual([]);
  });

  it('should set selected IDs', () => {
    const { result } = renderHook(() => useEmployeeData({ autoLoad: false }));

    act(() => {
      result.current.setSelectedIds([1, 2]);
    });

    expect(result.current.selectedIds).toEqual([1, 2]);
  });

  it('should get employee by ID', async () => {
    const { result } = renderHook(() => useEmployeeData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.employees).toEqual(mockEmployees);
    });

    const employee = result.current.getEmployeeById(1);
    expect(employee).toEqual(mockEmployees[0]);
  });

  it('should get employees by IDs', async () => {
    const { result } = renderHook(() => useEmployeeData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.employees).toEqual(mockEmployees);
    });

    const employees = result.current.getEmployeesByIds([1, 3]);
    expect(employees).toEqual([mockEmployees[0], mockEmployees[2]]);
  });

  it('should return undefined for non-existent employee ID', async () => {
    const { result } = renderHook(() => useEmployeeData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.employees).toEqual(mockEmployees);
    });

    const employee = result.current.getEmployeeById(999);
    expect(employee).toBeUndefined();
  });

  it('should filter employees based on search term', async () => {
    const { result } = renderHook(() => useEmployeeData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.employees).toEqual(mockEmployees);
    });

    act(() => {
      result.current.setSearchTerm('john');
    });

    await waitFor(() => {
      expect(result.current.searchResults).toHaveLength(2);
      expect(result.current.searchResults[0].name).toBe('John Smith');
      expect(result.current.searchResults[1].name).toBe('Sarah Johnson');
    });
  });

  it('should handle empty search results', async () => {
    const { result } = renderHook(() => useEmployeeData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.employees).toEqual(mockEmployees);
    });

    act(() => {
      result.current.setSearchTerm('nonexistent');
    });

    await waitFor(() => {
      expect(result.current.searchResults).toEqual([]);
    });
  });

  it('should return selected employees', async () => {
    const { result } = renderHook(() => 
      useEmployeeData({ initialSelectedIds: [1, 2], autoLoad: true })
    );

    await waitFor(() => {
      expect(result.current.employees).toEqual(mockEmployees);
    });

    expect(result.current.selectedEmployees).toEqual([mockEmployees[0], mockEmployees[1]]);
  });

  it('should return filtered employees (search results when available)', async () => {
    const { result } = renderHook(() => useEmployeeData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.employees).toEqual(mockEmployees);
    });

    act(() => {
      result.current.setSearchTerm('sales');
    });

    await waitFor(() => {
      expect(result.current.filteredEmployees).toHaveLength(3);
      expect(result.current.filteredEmployees[0].name).toBe('John Smith');
      expect(result.current.filteredEmployees[1].name).toBe('Sarah Johnson');
      expect(result.current.filteredEmployees[2].name).toBe('Michael Davis');
    });
  });

  it('should return all employees when no search term', async () => {
    const { result } = renderHook(() => useEmployeeData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.employees).toEqual(mockEmployees);
    });

    expect(result.current.filteredEmployees).toEqual(mockEmployees);
  });

  it('should sort employees by name', async () => {
    const { result } = renderHook(() => useEmployeeData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.employees).toEqual(mockEmployees);
    });

    act(() => {
      result.current.sortEmployees('name');
    });

    // Employees should be sorted alphabetically by name
    expect(result.current.employees[0].name).toBe('David Wilson');
    expect(result.current.employees[1].name).toBe('Emily Brown');
    expect(result.current.employees[2].name).toBe('John Smith');
  });

  it('should sort employees by department', async () => {
    const { result } = renderHook(() => useEmployeeData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.employees).toEqual(mockEmployees);
    });

    act(() => {
      result.current.sortEmployees('department');
    });

    // Employees should be sorted alphabetically by department
    expect(result.current.employees[0].department).toBe('Customer Service');
    expect(result.current.employees[1].department).toBe('Operations');
    expect(result.current.employees[2].department).toBe('Sales');
  });

  it('should sort employees by role', async () => {
    const { result } = renderHook(() => useEmployeeData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.employees).toEqual(mockEmployees);
    });

    act(() => {
      result.current.sortEmployees('role');
    });

    // Employees should be sorted alphabetically by role
    expect(result.current.employees[0].role).toBe('Customer Service Representative');
    expect(result.current.employees[1].role).toBe('Operations Specialist');
    expect(result.current.employees[2].role).toBe('Sales Manager');
  });

  it('should sort employees by commission rate', async () => {
    const { result } = renderHook(() => useEmployeeData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.employees).toEqual(mockEmployees);
    });

    act(() => {
      result.current.sortEmployees('commission_rate');
    });

    // Employees should be sorted by commission rate (ascending)
    expect(result.current.employees[0].commission_rate).toBe(1.0);
    expect(result.current.employees[1].commission_rate).toBe(2.5);
    expect(result.current.employees[2].commission_rate).toBe(3.0);
  });

  it('should refresh employees', async () => {
    const { result } = renderHook(() => useEmployeeData({ autoLoad: false }));

    expect(result.current.employees).toEqual([]);

    await act(async () => {
      await result.current.refreshEmployees();
    });

    expect(result.current.employees).toEqual(mockEmployees);
  });

  it('should toggle department filter', () => {
    const { result } = renderHook(() => useEmployeeData({ autoLoad: false }));

    act(() => {
      result.current.toggleDepartmentFilter('Sales');
    });

    expect(result.current.selectedDepartments).toEqual(['Sales']);

    act(() => {
      result.current.toggleDepartmentFilter('Sales');
    });

    expect(result.current.selectedDepartments).toEqual([]);
  });

  it('should clear department filters', () => {
    const { result } = renderHook(() => 
      useEmployeeData({ autoLoad: false })
    );

    act(() => {
      result.current.toggleDepartmentFilter('Sales');
      result.current.toggleDepartmentFilter('Operations');
    });

    expect(result.current.selectedDepartments).toEqual(['Sales', 'Operations']);

    act(() => {
      result.current.clearDepartmentFilters();
    });

    expect(result.current.selectedDepartments).toEqual([]);
  });

  it('should get employees by department', async () => {
    const { result } = renderHook(() => useEmployeeData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.employees).toEqual(mockEmployees);
    });

    const salesEmployees = result.current.getEmployeesByDepartment('Sales');
    expect(salesEmployees).toHaveLength(3);
    expect(salesEmployees[0].name).toBe('John Smith');
    expect(salesEmployees[1].name).toBe('Sarah Johnson');
    expect(salesEmployees[2].name).toBe('Michael Davis');

    const operationsEmployees = result.current.getEmployeesByDepartment('Operations');
    expect(operationsEmployees).toHaveLength(1);
    expect(operationsEmployees[0].name).toBe('David Wilson');
  });

  it('should filter employees by selected departments', async () => {
    const { result } = renderHook(() => useEmployeeData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.employees).toEqual(mockEmployees);
    });

    act(() => {
      result.current.toggleDepartmentFilter('Sales');
    });

    expect(result.current.filteredEmployees).toHaveLength(3);
    expect(result.current.filteredEmployees[0].department).toBe('Sales');
    expect(result.current.filteredEmployees[1].department).toBe('Sales');
    expect(result.current.filteredEmployees[2].department).toBe('Sales');

    act(() => {
      result.current.toggleDepartmentFilter('Operations');
    });

    expect(result.current.filteredEmployees).toHaveLength(4);
    expect(result.current.filteredEmployees.map(e => e.department)).toEqual(['Sales', 'Sales', 'Sales', 'Operations']);
  });

  it('should toggle role filter', () => {
    const { result } = renderHook(() => useEmployeeData({ autoLoad: false }));

    act(() => {
      result.current.toggleRoleFilter('Sales Representative');
    });

    expect(result.current.selectedRoles).toEqual(['Sales Representative']);

    act(() => {
      result.current.toggleRoleFilter('Sales Representative');
    });

    expect(result.current.selectedRoles).toEqual([]);
  });

  it('should clear role filters', () => {
    const { result } = renderHook(() => 
      useEmployeeData({ autoLoad: false })
    );

    act(() => {
      result.current.toggleRoleFilter('Sales Representative');
      result.current.toggleRoleFilter('Operations Specialist');
    });

    expect(result.current.selectedRoles).toEqual(['Sales Representative', 'Operations Specialist']);

    act(() => {
      result.current.clearRoleFilters();
    });

    expect(result.current.selectedRoles).toEqual([]);
  });

  it('should get employees by role', async () => {
    const { result } = renderHook(() => useEmployeeData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.employees).toEqual(mockEmployees);
    });

    const salesReps = result.current.getEmployeesByRole('Sales Representative');
    expect(salesReps).toHaveLength(1);
    expect(salesReps[0].name).toBe('John Smith');

    const operationsSpecialists = result.current.getEmployeesByRole('Operations Specialist');
    expect(operationsSpecialists).toHaveLength(1);
    expect(operationsSpecialists[0].name).toBe('David Wilson');
  });

  it('should filter employees by selected roles', async () => {
    const { result } = renderHook(() => useEmployeeData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.employees).toEqual(mockEmployees);
    });

    act(() => {
      result.current.toggleRoleFilter('Sales Representative');
    });

    expect(result.current.filteredEmployees).toHaveLength(1);
    expect(result.current.filteredEmployees[0].role).toBe('Sales Representative');

    act(() => {
      result.current.toggleRoleFilter('Operations Specialist');
    });

    expect(result.current.filteredEmployees).toHaveLength(2);
    expect(result.current.filteredEmployees.map(e => e.role)).toEqual(['Sales Representative', 'Operations Specialist']);
  });

  it('should combine search and department filtering', async () => {
    const { result } = renderHook(() => useEmployeeData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.employees).toEqual(mockEmployees);
    });

    act(() => {
      result.current.toggleDepartmentFilter('Sales');
      result.current.setSearchTerm('john smith');
    });

    await waitFor(() => {
      expect(result.current.filteredEmployees).toHaveLength(1);
      expect(result.current.filteredEmployees[0].name).toBe('John Smith');
    });
  });

  it('should combine search and role filtering', async () => {
    const { result } = renderHook(() => useEmployeeData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.employees).toEqual(mockEmployees);
    });

    act(() => {
      result.current.toggleRoleFilter('Sales Representative');
      result.current.setSearchTerm('john');
    });

    await waitFor(() => {
      expect(result.current.filteredEmployees).toHaveLength(1);
      expect(result.current.filteredEmployees[0].name).toBe('John Smith');
    });
  });

  it('should provide statistics', async () => {
    const { result } = renderHook(() => useEmployeeData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.employees).toEqual(mockEmployees);
    });

    expect(result.current.stats.total).toBe(5);
    expect(result.current.stats.active).toBe(4);
    expect(result.current.stats.inactive).toBe(1);
    expect(result.current.stats.byDepartment).toEqual({
      'Sales': 3,
      'Operations': 1,
      'Customer Service': 1
    });
    expect(result.current.stats.byRole).toEqual({
      'Sales Representative': 1,
      'Senior Sales Representative': 1,
      'Operations Specialist': 1,
      'Customer Service Representative': 1,
      'Sales Manager': 1
    });
    expect(result.current.stats.totalCommissions).toBe(62350);
    expect(result.current.stats.totalTransactions).toBe(865);
    expect(result.current.stats.averageCommissionRate).toBe(3.6);
  });
});
