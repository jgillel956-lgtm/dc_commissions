import axios from 'axios';

/**
 * Employee data structure
 */
export interface Employee {
  id: number;
  name: string;
  email: string;
  employee_id: string;
  department: string;
  role: string;
  commission_rate: number;
  is_active: boolean;
  hire_date: string;
  manager_id?: number;
  manager_name?: string;
  total_commissions?: number;
  total_transactions?: number;
  average_commission?: number;
}

/**
 * API response structure for employee data
 */
export interface EmployeeApiResponse {
  employees: Employee[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * Parameters for fetching employees
 */
export interface EmployeeFilterParams {
  search?: string;
  department?: string;
  role?: string;
  is_active?: boolean;
  manager_id?: number;
  page?: number;
  page_size?: number;
  sort_by?: 'name' | 'employee_id' | 'department' | 'role' | 'commission_rate' | 'hire_date';
  sort_order?: 'asc' | 'desc';
}

/**
 * Fetch employees with filtering and pagination
 */
export const fetchEmployees = async (params: EmployeeFilterParams = {}): Promise<EmployeeApiResponse> => {
  try {
    const response = await axios.get('/api/employees', {
      params: {
        page: 1,
        page_size: 100,
        sort_by: 'name',
        sort_order: 'asc',
        ...params
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw new Error('Failed to fetch employees');
  }
};

/**
 * Fetch all employees (for dropdown/select components)
 */
export const fetchAllEmployees = async (): Promise<Employee[]> => {
  try {
    const response = await fetchEmployees({
      is_active: true,
      page_size: 1000, // Get all active employees
      sort_by: 'name',
      sort_order: 'asc'
    });

    return response.employees;
  } catch (error) {
    console.error('Error fetching all employees:', error);
    throw new Error('Failed to fetch all employees');
  }
};

/**
 * Search employees by name, email, or employee ID
 */
export const searchEmployees = async (searchTerm: string): Promise<Employee[]> => {
  try {
    const response = await fetchEmployees({
      search: searchTerm,
      is_active: true,
      page_size: 50,
      sort_by: 'name',
      sort_order: 'asc'
    });

    return response.employees;
  } catch (error) {
    console.error('Error searching employees:', error);
    throw new Error('Failed to search employees');
  }
};

/**
 * Get employee by ID
 */
export const getEmployeeById = async (id: number): Promise<Employee> => {
  try {
    const response = await axios.get(`/api/employees/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching employee by ID:', error);
    throw new Error('Failed to fetch employee');
  }
};

/**
 * Get employees by IDs (batch fetch)
 */
export const getEmployeesByIds = async (ids: number[]): Promise<Employee[]> => {
  try {
    if (ids.length === 0) return [];
    
    const response = await axios.post('/api/employees/batch', {
      ids: ids
    });

    return response.data.employees;
  } catch (error) {
    console.error('Error fetching employees by IDs:', error);
    throw new Error('Failed to fetch employees');
  }
};

/**
 * Get employees by department
 */
export const getEmployeesByDepartment = async (department: string): Promise<Employee[]> => {
  try {
    const response = await fetchEmployees({
      department: department,
      is_active: true,
      page_size: 100,
      sort_by: 'name',
      sort_order: 'asc'
    });

    return response.employees;
  } catch (error) {
    console.error('Error fetching employees by department:', error);
    throw new Error('Failed to fetch employees by department');
  }
};

/**
 * Get employees by role
 */
export const getEmployeesByRole = async (role: string): Promise<Employee[]> => {
  try {
    const response = await fetchEmployees({
      role: role,
      is_active: true,
      page_size: 100,
      sort_by: 'name',
      sort_order: 'asc'
    });

    return response.employees;
  } catch (error) {
    console.error('Error fetching employees by role:', error);
    throw new Error('Failed to fetch employees by role');
  }
};

/**
 * Mock data for development/testing
 */
export const getMockEmployees = (): Employee[] => [
  // Sales Team
  { id: 1, name: 'John Smith', email: 'john.smith@company.com', employee_id: 'EMP001', department: 'Sales', role: 'Sales Representative', commission_rate: 5.0, is_active: true, hire_date: '2023-01-15', total_commissions: 12500, total_transactions: 150, average_commission: 83.33 },
  { id: 2, name: 'Sarah Johnson', email: 'sarah.johnson@company.com', employee_id: 'EMP002', department: 'Sales', role: 'Senior Sales Representative', commission_rate: 6.5, is_active: true, hire_date: '2022-08-20', manager_id: 5, manager_name: 'Michael Davis', total_commissions: 18750, total_transactions: 200, average_commission: 93.75 },
  { id: 3, name: 'David Wilson', email: 'david.wilson@company.com', employee_id: 'EMP003', department: 'Sales', role: 'Sales Representative', commission_rate: 5.0, is_active: true, hire_date: '2023-03-10', manager_id: 5, manager_name: 'Michael Davis', total_commissions: 8900, total_transactions: 120, average_commission: 74.17 },
  { id: 4, name: 'Emily Brown', email: 'emily.brown@company.com', employee_id: 'EMP004', department: 'Sales', role: 'Sales Representative', commission_rate: 5.0, is_active: true, hire_date: '2023-06-05', manager_id: 5, manager_name: 'Michael Davis', total_commissions: 7200, total_transactions: 95, average_commission: 75.79 },
  { id: 5, name: 'Michael Davis', email: 'michael.davis@company.com', employee_id: 'EMP005', department: 'Sales', role: 'Sales Manager', commission_rate: 3.0, is_active: true, hire_date: '2021-11-15', total_commissions: 15000, total_transactions: 300, average_commission: 50.00 },
  
  // Operations Team
  { id: 6, name: 'Lisa Anderson', email: 'lisa.anderson@company.com', employee_id: 'EMP006', department: 'Operations', role: 'Operations Specialist', commission_rate: 2.5, is_active: true, hire_date: '2022-12-01', manager_id: 9, manager_name: 'Robert Taylor', total_commissions: 4500, total_transactions: 180, average_commission: 25.00 },
  { id: 7, name: 'James Martinez', email: 'james.martinez@company.com', employee_id: 'EMP007', department: 'Operations', role: 'Operations Coordinator', commission_rate: 2.0, is_active: true, hire_date: '2023-02-28', manager_id: 9, manager_name: 'Robert Taylor', total_commissions: 3200, total_transactions: 160, average_commission: 20.00 },
  { id: 8, name: 'Jennifer Garcia', email: 'jennifer.garcia@company.com', employee_id: 'EMP008', department: 'Operations', role: 'Operations Specialist', commission_rate: 2.5, is_active: true, hire_date: '2023-04-12', manager_id: 9, manager_name: 'Robert Taylor', total_commissions: 3800, total_transactions: 152, average_commission: 25.00 },
  { id: 9, name: 'Robert Taylor', email: 'robert.taylor@company.com', employee_id: 'EMP009', department: 'Operations', role: 'Operations Manager', commission_rate: 1.5, is_active: true, hire_date: '2021-09-10', total_commissions: 6000, total_transactions: 400, average_commission: 15.00 },
  
  // Customer Service Team
  { id: 10, name: 'Amanda White', email: 'amanda.white@company.com', employee_id: 'EMP010', department: 'Customer Service', role: 'Customer Service Representative', commission_rate: 1.0, is_active: true, hire_date: '2023-01-20', manager_id: 13, manager_name: 'Christopher Lee', total_commissions: 1800, total_transactions: 180, average_commission: 10.00 },
  { id: 11, name: 'Kevin Rodriguez', email: 'kevin.rodriguez@company.com', employee_id: 'EMP011', department: 'Customer Service', role: 'Customer Service Specialist', commission_rate: 1.2, is_active: true, hire_date: '2023-05-15', manager_id: 13, manager_name: 'Christopher Lee', total_commissions: 2160, total_transactions: 180, average_commission: 12.00 },
  { id: 12, name: 'Michelle Thompson', email: 'michelle.thompson@company.com', employee_id: 'EMP012', department: 'Customer Service', role: 'Customer Service Representative', commission_rate: 1.0, is_active: true, hire_date: '2023-07-08', manager_id: 13, manager_name: 'Christopher Lee', total_commissions: 1200, total_transactions: 120, average_commission: 10.00 },
  { id: 13, name: 'Christopher Lee', email: 'christopher.lee@company.com', employee_id: 'EMP013', department: 'Customer Service', role: 'Customer Service Manager', commission_rate: 0.8, is_active: true, hire_date: '2022-03-15', total_commissions: 2400, total_transactions: 300, average_commission: 8.00 },
  
  // Inactive Employees
  { id: 14, name: 'Daniel Clark', email: 'daniel.clark@company.com', employee_id: 'EMP014', department: 'Sales', role: 'Sales Representative', commission_rate: 5.0, is_active: false, hire_date: '2022-06-10', total_commissions: 8500, total_transactions: 110, average_commission: 77.27 },
  { id: 15, name: 'Rachel Green', email: 'rachel.green@company.com', employee_id: 'EMP015', department: 'Operations', role: 'Operations Specialist', commission_rate: 2.5, is_active: false, hire_date: '2022-10-20', total_commissions: 4200, total_transactions: 168, average_commission: 25.00 }
];

/**
 * Mock search function for development
 */
export const mockSearchEmployees = (searchTerm: string): Employee[] => {
  const employees = getMockEmployees();
  if (!searchTerm) return employees;
  
  return employees.filter(employee => 
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.role.toLowerCase().includes(searchTerm.toLowerCase())
  );
};

/**
 * Get employee departments for filtering
 */
export const getEmployeeDepartments = (): Array<{ value: string; label: string; count: number }> => {
  const employees = getMockEmployees();
  const departments = employees.reduce((acc, employee) => {
    acc[employee.department] = (acc[employee.department] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(departments).map(([department, count]) => ({
    value: department,
    label: department,
    count
  })).sort((a, b) => a.label.localeCompare(b.label));
};

/**
 * Get employee roles for filtering
 */
export const getEmployeeRoles = (): Array<{ value: string; label: string; count: number }> => {
  const employees = getMockEmployees();
  const roles = employees.reduce((acc, employee) => {
    acc[employee.role] = (acc[employee.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(roles).map(([role, count]) => ({
    value: role,
    label: role,
    count
  })).sort((a, b) => a.label.localeCompare(b.label));
};

/**
 * Get employee statistics
 */
export const getEmployeeStats = () => {
  const employees = getMockEmployees();
  const stats = {
    total: employees.length,
    active: employees.filter(e => e.is_active).length,
    inactive: employees.filter(e => !e.is_active).length,
    byDepartment: employees.reduce((acc, employee) => {
      acc[employee.department] = (acc[employee.department] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byRole: employees.reduce((acc, employee) => {
      acc[employee.role] = (acc[employee.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    totalCommissions: employees.reduce((sum, employee) => sum + (employee.total_commissions || 0), 0),
    totalTransactions: employees.reduce((sum, employee) => sum + (employee.total_transactions || 0), 0),
    averageCommissionRate: employees.length > 0 ? employees.reduce((sum, employee) => sum + employee.commission_rate, 0) / employees.length : 0
  };
  
  return stats;
};

