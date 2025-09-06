import axios from 'axios';

export interface RevenueSource {
  id: number;
  name: string;
  code: string;
  type: 'transaction' | 'payor' | 'interest' | 'other';
  category: string;
  description?: string;
  is_active: boolean;
  default_rate?: number;
  created_at?: string;
  updated_at?: string;
}

export interface RevenueSourceApiResponse {
  revenue_sources: RevenueSource[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface RevenueSourceFilterParams {
  search?: string;
  type?: 'transaction' | 'payor' | 'interest' | 'other' | 'all';
  category?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
  sort_by?: 'name' | 'type' | 'category' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

/**
 * Fetch revenue sources from the API
 */
export const fetchRevenueSources = async (params: RevenueSourceFilterParams = {}): Promise<RevenueSourceApiResponse> => {
  try {
    const response = await axios.get('/api/revenue-sources', {
      params: {
        search: params.search || '',
        type: params.type || 'all',
        category: params.category || '',
        is_active: params.is_active !== undefined ? params.is_active : true,
        page: params.page || 1,
        page_size: params.page_size || 100,
        sort_by: params.sort_by || 'name',
        sort_order: params.sort_order || 'asc'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching revenue sources:', error);
    throw new Error('Failed to fetch revenue sources');
  }
};

/**
 * Fetch all revenue sources (for dropdown/select components)
 */
export const fetchAllRevenueSources = async (): Promise<RevenueSource[]> => {
  try {
    const response = await fetchRevenueSources({
      is_active: true,
      page_size: 1000, // Get all active revenue sources
      sort_by: 'name',
      sort_order: 'asc'
    });

    return response.revenue_sources;
  } catch (error) {
    console.error('Error fetching all revenue sources:', error);
    throw new Error('Failed to fetch all revenue sources');
  }
};

/**
 * Search revenue sources by name, code, or description
 */
export const searchRevenueSources = async (searchTerm: string): Promise<RevenueSource[]> => {
  try {
    const response = await fetchRevenueSources({
      search: searchTerm,
      is_active: true,
      page_size: 50,
      sort_by: 'name',
      sort_order: 'asc'
    });

    return response.revenue_sources;
  } catch (error) {
    console.error('Error searching revenue sources:', error);
    throw new Error('Failed to search revenue sources');
  }
};

/**
 * Get revenue source by ID
 */
export const getRevenueSourceById = async (id: number): Promise<RevenueSource> => {
  try {
    const response = await axios.get(`/api/revenue-sources/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching revenue source by ID:', error);
    throw new Error('Failed to fetch revenue source');
  }
};

/**
 * Get revenue sources by IDs (batch fetch)
 */
export const getRevenueSourcesByIds = async (ids: number[]): Promise<RevenueSource[]> => {
  try {
    if (ids.length === 0) return [];
    
    const response = await axios.post('/api/revenue-sources/batch', {
      ids: ids
    });

    return response.data.revenue_sources;
  } catch (error) {
    console.error('Error fetching revenue sources by IDs:', error);
    throw new Error('Failed to fetch revenue sources');
  }
};

/**
 * Get revenue sources by type
 */
export const getRevenueSourcesByType = async (type: RevenueSource['type']): Promise<RevenueSource[]> => {
  try {
    const response = await fetchRevenueSources({
      type: type || 'all',
      is_active: true,
      page_size: 100,
      sort_by: 'name',
      sort_order: 'asc'
    });

    return response.revenue_sources;
  } catch (error) {
    console.error('Error fetching revenue sources by type:', error);
    throw new Error('Failed to fetch revenue sources by type');
  }
};

/**
 * Get revenue sources by category
 */
export const getRevenueSourcesByCategory = async (category: string): Promise<RevenueSource[]> => {
  try {
    const response = await fetchRevenueSources({
      category: category,
      is_active: true,
      page_size: 100,
      sort_by: 'name',
      sort_order: 'asc'
    });

    return response.revenue_sources;
  } catch (error) {
    console.error('Error fetching revenue sources by category:', error);
    throw new Error('Failed to fetch revenue sources by category');
  }
};

/**
 * Mock data for development/testing
 */
export const getMockRevenueSources = (): RevenueSource[] => [
  // Transaction Revenue Sources
  { id: 1, name: 'Transaction Processing Fee', code: 'TPF', type: 'transaction', category: 'Processing Fees', description: 'Standard transaction processing fees', is_active: true, default_rate: 2.9 },
  { id: 2, name: 'Transaction Settlement Fee', code: 'TSF', type: 'transaction', category: 'Settlement Fees', description: 'Fees for transaction settlement services', is_active: true, default_rate: 0.25 },
  { id: 3, name: 'Transaction Authorization Fee', code: 'TAF', type: 'transaction', category: 'Authorization Fees', description: 'Fees for transaction authorization', is_active: true, default_rate: 0.10 },
  { id: 4, name: 'Transaction Network Fee', code: 'TNF', type: 'transaction', category: 'Network Fees', description: 'Network processing fees', is_active: true, default_rate: 0.05 },
  
  // Payor Fee Sources
  { id: 5, name: 'Payor Processing Fee', code: 'PPF', type: 'payor', category: 'Payor Fees', description: 'Fees charged to payors for processing', is_active: true, default_rate: 1.5 },
  { id: 6, name: 'Payor Setup Fee', code: 'PSF', type: 'payor', category: 'Setup Fees', description: 'One-time setup fees for payors', is_active: true, default_rate: 50.0 },
  { id: 7, name: 'Payor Monthly Fee', code: 'PMF', type: 'payor', category: 'Monthly Fees', description: 'Monthly subscription fees for payors', is_active: true, default_rate: 25.0 },
  { id: 8, name: 'Payor Compliance Fee', code: 'PCF', type: 'payor', category: 'Compliance Fees', description: 'Fees for compliance and regulatory requirements', is_active: true, default_rate: 5.0 },
  
  // Interest Revenue Sources
  { id: 9, name: 'Interest on Reserves', code: 'IOR', type: 'interest', category: 'Reserve Interest', description: 'Interest earned on reserve accounts', is_active: true, default_rate: 2.5 },
  { id: 10, name: 'Interest on Deposits', code: 'IOD', type: 'interest', category: 'Deposit Interest', description: 'Interest earned on deposit accounts', is_active: true, default_rate: 1.8 },
  { id: 11, name: 'Interest on Investments', code: 'IOI', type: 'interest', category: 'Investment Interest', description: 'Interest earned on investment portfolios', is_active: true, default_rate: 3.2 },
  { id: 12, name: 'Interest on Loans', code: 'IOL', type: 'interest', category: 'Loan Interest', description: 'Interest earned on loan portfolios', is_active: true, default_rate: 4.5 },
  
  // Other Revenue Sources
  { id: 13, name: 'Late Payment Fee', code: 'LPF', type: 'other', category: 'Penalty Fees', description: 'Fees for late payments', is_active: true, default_rate: 15.0 },
  { id: 14, name: 'Overdraft Fee', code: 'ODF', type: 'other', category: 'Penalty Fees', description: 'Fees for overdraft transactions', is_active: true, default_rate: 25.0 },
  { id: 15, name: 'Returned Payment Fee', code: 'RPF', type: 'other', category: 'Penalty Fees', description: 'Fees for returned payments', is_active: true, default_rate: 20.0 },
  { id: 16, name: 'Account Maintenance Fee', code: 'AMF', type: 'other', category: 'Maintenance Fees', description: 'Monthly account maintenance fees', is_active: true, default_rate: 10.0 }
];

/**
 * Mock search function for development
 */
export const mockSearchRevenueSources = (searchTerm: string): RevenueSource[] => {
  const revenueSources = getMockRevenueSources();
  if (!searchTerm) return revenueSources;
  
  return revenueSources.filter(source => 
    source.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    source.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    source.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    source.category.toLowerCase().includes(searchTerm.toLowerCase())
  );
};

/**
 * Get revenue source types for filtering
 */
export const getRevenueSourceTypes = (): Array<{ value: string; label: string; description: string; color: string }> => [
  { value: 'transaction', label: 'Transaction Revenue', description: 'Fees from transaction processing', color: 'blue' },
  { value: 'payor', label: 'Payor Fees', description: 'Fees charged to payors', color: 'green' },
  { value: 'interest', label: 'Interest Revenue', description: 'Interest earned on accounts and investments', color: 'purple' },
  { value: 'other', label: 'Other Revenue', description: 'Miscellaneous fees and charges', color: 'orange' }
];

/**
 * Get revenue source categories for filtering
 */
export const getRevenueSourceCategories = (): Array<{ value: string; label: string; count: number }> => {
  const sources = getMockRevenueSources();
  const categories = sources.reduce((acc, source) => {
    acc[source.category] = (acc[source.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(categories).map(([category, count]) => ({
    value: category,
    label: category,
    count
  })).sort((a, b) => a.label.localeCompare(b.label));
};

/**
 * Get revenue source statistics
 */
export const getRevenueSourceStats = () => {
  const sources = getMockRevenueSources();
  const stats = {
    total: sources.length,
    byType: sources.reduce((acc, source) => {
      acc[source.type] = (acc[source.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byCategory: sources.reduce((acc, source) => {
      acc[source.category] = (acc[source.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    active: sources.filter(s => s.is_active).length,
    inactive: sources.filter(s => !s.is_active).length
  };
  
  return stats;
};




