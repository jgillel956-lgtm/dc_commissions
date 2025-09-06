import axios from 'axios';
import { zohoAnalyticsAPI } from './zohoAnalyticsAPI';

export interface Company {
  id: number;
  name: string;
  code?: string;
  status?: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface Employee {
  id?: number;
  name: string;
  status?: 'active' | 'inactive';
}

export interface CompanyApiResponse {
  companies: Company[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CompanyFilterParams {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  page?: number;
  page_size?: number;
  sort_by?: 'name' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

/**
 * Fetch companies from the API (legacy - kept for compatibility)
 */
export const fetchCompanies = async (params: CompanyFilterParams = {}): Promise<CompanyApiResponse> => {
  try {
    const response = await axios.get('/api/companies', {
      params: {
        search: params.search || '',
        status: params.status || 'all',
        page: params.page || 1,
        page_size: params.page_size || 100,
        sort_by: params.sort_by || 'name',
        sort_order: params.sort_order || 'asc'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching companies:', error);
    throw new Error('Failed to fetch companies');
  }
};

/**
 * Fetch companies from revenue_master_view via Zoho Analytics API
 */
export const fetchCompaniesFromRevenueView = async (): Promise<Company[]> => {
  try {
    const response = await zohoAnalyticsAPI.getDistinctCompanies();
    
    if (response.status.code === 200 && response.data) {
      // Transform Zoho Analytics response to Company interface
      return response.data.map(item => ({
        id: item.company_id,
        name: item.company,
        status: 'active' as const
      }));
    } else {
      console.warn('Zoho Analytics response not successful, falling back to mock data');
      return getMockCompanies();
    }
  } catch (error) {
    console.error('Error fetching companies from revenue_master_view:', error);
    // Fallback to mock data
    return getMockCompanies();
  }
};

/**
 * Fetch all companies (for dropdown/select components)
 */
export const fetchAllCompanies = async (): Promise<Company[]> => {
  try {
    // Use the new revenue_master_view API for production data
    return await fetchCompaniesFromRevenueView();
  } catch (error) {
    console.error('Error fetching all companies:', error);
    // Fallback to legacy API if needed
    try {
      const response = await fetchCompanies({
        status: 'active',
        page_size: 1000,
        sort_by: 'name',
        sort_order: 'asc'
      });
      return response.companies;
    } catch (fallbackError) {
      console.error('Legacy API also failed, using mock data:', fallbackError);
      return getMockCompanies();
    }
  }
};

/**
 * Search companies by name or code
 */
export const searchCompanies = async (searchTerm: string): Promise<Company[]> => {
  try {
    const response = await fetchCompanies({
      search: searchTerm,
      status: 'active',
      page_size: 50,
      sort_by: 'name',
      sort_order: 'asc'
    });

    return response.companies;
  } catch (error) {
    console.error('Error searching companies:', error);
    throw new Error('Failed to search companies');
  }
};

/**
 * Get company by ID
 */
export const getCompanyById = async (id: number): Promise<Company> => {
  try {
    const response = await axios.get(`/api/companies/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching company by ID:', error);
    throw new Error('Failed to fetch company');
  }
};

/**
 * Get companies by IDs (batch fetch)
 */
export const getCompaniesByIds = async (ids: number[]): Promise<Company[]> => {
  try {
    if (ids.length === 0) return [];
    
    const response = await axios.post('/api/companies/batch', {
      ids: ids
    });

    return response.data.companies;
  } catch (error) {
    console.error('Error fetching companies by IDs:', error);
    throw new Error('Failed to fetch companies');
  }
};

/**
 * Mock data for development/testing
 */
export const getMockCompanies = (): Company[] => [
  { id: 1, name: 'Acme Corporation', code: 'ACME', status: 'active' },
  { id: 2, name: 'Tech Solutions Inc.', code: 'TECH', status: 'active' },
  { id: 3, name: 'Global Industries Ltd.', code: 'GLOBAL', status: 'active' },
  { id: 4, name: 'Innovation Systems', code: 'INNOV', status: 'active' },
  { id: 5, name: 'Digital Dynamics', code: 'DIGITAL', status: 'active' },
  { id: 6, name: 'Future Technologies', code: 'FUTURE', status: 'active' },
  { id: 7, name: 'Smart Solutions', code: 'SMART', status: 'active' },
  { id: 8, name: 'Advanced Systems', code: 'ADVANCED', status: 'active' },
  { id: 9, name: 'NextGen Corp', code: 'NEXTGEN', status: 'active' },
  { id: 10, name: 'Elite Enterprises', code: 'ELITE', status: 'active' },
  { id: 11, name: 'Premier Partners', code: 'PREMIER', status: 'active' },
  { id: 12, name: 'Strategic Solutions', code: 'STRATEGIC', status: 'active' },
  { id: 13, name: 'Peak Performance', code: 'PEAK', status: 'active' },
  { id: 14, name: 'Summit Services', code: 'SUMMIT', status: 'active' },
  { id: 15, name: 'Vertex Ventures', code: 'VERTEX', status: 'active' },
  { id: 16, name: 'Nexus Networks', code: 'NEXUS', status: 'active' },
  { id: 17, name: 'Quantum Quests', code: 'QUANTUM', status: 'active' },
  { id: 18, name: 'Pinnacle Partners', code: 'PINNACLE', status: 'active' },
  { id: 19, name: 'Apex Analytics', code: 'APEX', status: 'active' },
  { id: 20, name: 'Zenith Zone', code: 'ZENITH', status: 'active' }
];

/**
 * Mock search function for development
 */
export const mockSearchCompanies = (searchTerm: string): Company[] => {
  const companies = getMockCompanies();
  if (!searchTerm) return companies;
  
  return companies.filter(company => 
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );
};

// Employee API functions for commission persons

/**
 * Fetch employees/commission persons from revenue_master_view via Zoho Analytics API
 */
export const fetchEmployeesFromRevenueView = async (): Promise<Employee[]> => {
  try {
    const response = await zohoAnalyticsAPI.getDistinctEmployees();
    
    if (response.status.code === 200 && response.data) {
      // Transform Zoho Analytics response to Employee interface
      return response.data.map((item, index) => ({
        id: index + 1, // Generate ID since employee_name doesn't have ID
        name: item.employee_name,
        status: 'active' as const
      }));
    } else {
      console.warn('Zoho Analytics employee response not successful, falling back to mock data');
      return getMockEmployees();
    }
  } catch (error) {
    console.error('Error fetching employees from revenue_master_view:', error);
    // Fallback to mock data
    return getMockEmployees();
  }
};

/**
 * Fetch all employees/commission persons (for dropdown/select components)
 */
export const fetchAllEmployees = async (): Promise<Employee[]> => {
  try {
    return await fetchEmployeesFromRevenueView();
  } catch (error) {
    console.error('Error fetching all employees:', error);
    return getMockEmployees();
  }
};

/**
 * Search employees by name
 */
export const searchEmployees = async (searchTerm: string): Promise<Employee[]> => {
  try {
    const employees = await fetchAllEmployees();
    if (!searchTerm) return employees;
    
    return employees.filter(employee => 
      employee.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  } catch (error) {
    console.error('Error searching employees:', error);
    return getMockEmployees().filter(employee => 
      employee.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
};

/**
 * Mock employee data for development/testing
 */
export const getMockEmployees = (): Employee[] => [
  { id: 1, name: 'John Smith', status: 'active' },
  { id: 2, name: 'Jane Doe', status: 'active' },
  { id: 3, name: 'Bob Wilson', status: 'active' },
  { id: 4, name: 'Sarah Johnson', status: 'active' },
  { id: 5, name: 'Mike Davis', status: 'active' },
  { id: 6, name: 'Lisa Brown', status: 'active' },
  { id: 7, name: 'Tom Anderson', status: 'active' },
  { id: 8, name: 'Amy Taylor', status: 'active' }
];




