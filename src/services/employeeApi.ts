import { Employee, fetchAllEmployees, searchEmployees, getMockEmployees } from './companyApi';

// Export all employee-related functions from companyApi
export {
  Employee,
  fetchAllEmployees,
  searchEmployees,
  getMockEmployees
};

// Mock search function for development
export const mockSearchEmployees = (searchTerm: string): Employee[] => {
  const employees = getMockEmployees();
  if (!searchTerm) return employees;
  
  return employees.filter(employee => 
    employee.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
};