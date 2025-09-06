import { fetchAllEmployees, searchEmployees, getMockEmployees } from './companyApi';
import type { Employee } from './companyApi';

// Export type separately to satisfy TypeScript isolatedModules
export type { Employee } from './companyApi';

// Export all employee-related functions from companyApi
export {
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