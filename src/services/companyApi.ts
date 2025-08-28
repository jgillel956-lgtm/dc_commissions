import axios from 'axios';

export interface Company {
  id: number;
  name: string;
  code?: string;
  status?: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
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
 * Fetch companies from the API
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
 * Fetch all companies (for dropdown/select components)
 */
export const fetchAllCompanies = async (): Promise<Company[]> => {
  try {
    const response = await fetchCompanies({
      status: 'active',
      page_size: 1000, // Get all active companies
      sort_by: 'name',
      sort_order: 'asc'
    });

    return response.companies;
  } catch (error) {
    console.error('Error fetching all companies:', error);
    throw new Error('Failed to fetch all companies');
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

