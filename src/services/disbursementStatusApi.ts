import axios from 'axios';

/**
 * Disbursement status interface
 */
export interface DisbursementStatus {
  id: string;
  value: string;
  label: string;
  description?: string;
  color?: string;
  icon?: string;
  is_active?: boolean;
  transaction_count?: number;
  total_amount?: number;
}

/**
 * API response interface for disbursement statuses
 */
export interface DisbursementStatusApiResponse {
  data: DisbursementStatus[];
  total: number;
  success: boolean;
  message?: string;
}

/**
 * Filter parameters for disbursement status queries
 */
export interface DisbursementStatusFilterParams {
  search?: string;
  is_active?: boolean;
  include_stats?: boolean;
}

/**
 * Mock disbursement status data for development
 */
export const getMockDisbursementStatuses = (): DisbursementStatus[] => {
  return [
    {
      id: '1',
      value: 'pending',
      label: 'Pending',
      description: 'Disbursements awaiting processing',
      color: 'yellow',
      icon: 'clock',
      is_active: true,
      transaction_count: 1250,
      total_amount: 450000
    },
    {
      id: '2',
      value: 'processing',
      label: 'Processing',
      description: 'Disbursements currently being processed',
      color: 'blue',
      icon: 'loader',
      is_active: true,
      transaction_count: 320,
      total_amount: 180000
    },
    {
      id: '3',
      value: 'completed',
      label: 'Completed',
      description: 'Successfully completed disbursements',
      color: 'green',
      icon: 'check-circle',
      is_active: true,
      transaction_count: 28450,
      total_amount: 12500000
    },
    {
      id: '4',
      value: 'failed',
      label: 'Failed',
      description: 'Disbursements that failed to process',
      color: 'red',
      icon: 'x-circle',
      is_active: true,
      transaction_count: 180,
      total_amount: 75000
    },
    {
      id: '5',
      value: 'cancelled',
      label: 'Cancelled',
      description: 'Cancelled disbursements',
      color: 'gray',
      icon: 'x',
      is_active: true,
      transaction_count: 95,
      total_amount: 42000
    },
    {
      id: '6',
      value: 'on_hold',
      label: 'On Hold',
      description: 'Disbursements placed on hold',
      color: 'orange',
      icon: 'pause',
      is_active: true,
      transaction_count: 45,
      total_amount: 22000
    },
    {
      id: '7',
      value: 'returned',
      label: 'Returned',
      description: 'Disbursements returned by recipient',
      color: 'purple',
      icon: 'rotate-ccw',
      is_active: true,
      transaction_count: 12,
      total_amount: 8500
    }
  ];
};

/**
 * Fetch all disbursement statuses from API
 */
export const fetchAllDisbursementStatuses = async (): Promise<DisbursementStatus[]> => {
  try {
    const response = await axios.get<DisbursementStatusApiResponse>('/api/disbursement-statuses');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching disbursement statuses:', error);
    throw new Error('Failed to fetch disbursement statuses');
  }
};

/**
 * Search disbursement statuses
 */
export const searchDisbursementStatuses = async (searchTerm: string): Promise<DisbursementStatus[]> => {
  try {
    const response = await axios.get<DisbursementStatusApiResponse>('/api/disbursement-statuses/search', {
      params: { q: searchTerm }
    });
    return response.data.data;
  } catch (error) {
    console.error('Error searching disbursement statuses:', error);
    throw new Error('Failed to search disbursement statuses');
  }
};

/**
 * Get disbursement status by ID
 */
export const getDisbursementStatusById = async (id: string): Promise<DisbursementStatus | null> => {
  try {
    const response = await axios.get<DisbursementStatusApiResponse>(`/api/disbursement-statuses/${id}`);
    return response.data.data[0] || null;
  } catch (error) {
    console.error('Error fetching disbursement status by ID:', error);
    return null;
  }
};

/**
 * Get disbursement statuses by values
 */
export const getDisbursementStatusesByValues = async (values: string[]): Promise<DisbursementStatus[]> => {
  try {
    const response = await axios.get<DisbursementStatusApiResponse>('/api/disbursement-statuses/by-values', {
      params: { values: values.join(',') }
    });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching disbursement statuses by values:', error);
    return [];
  }
};

/**
 * Get disbursement status statistics
 */
export const getDisbursementStatusStats = async (): Promise<{
  total_statuses: number;
  active_statuses: number;
  total_transactions: number;
  total_amount: number;
}> => {
  try {
    const response = await axios.get('/api/disbursement-statuses/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching disbursement status stats:', error);
    return {
      total_statuses: 0,
      active_statuses: 0,
      total_transactions: 0,
      total_amount: 0
    };
  }
};

/**
 * Mock search function for development
 */
export const mockSearchDisbursementStatuses = (searchTerm: string): DisbursementStatus[] => {
  const allStatuses = getMockDisbursementStatuses();
  if (!searchTerm) return allStatuses;
  
  const lowerSearchTerm = searchTerm.toLowerCase();
  return allStatuses.filter(status => 
    status.label.toLowerCase().includes(lowerSearchTerm) ||
    status.value.toLowerCase().includes(lowerSearchTerm) ||
    status.description?.toLowerCase().includes(lowerSearchTerm)
  );
};

/**
 * Get active disbursement statuses only
 */
export const getActiveDisbursementStatuses = (): DisbursementStatus[] => {
  return getMockDisbursementStatuses().filter(status => status.is_active);
};

/**
 * Get disbursement status by value
 */
export const getDisbursementStatusByValue = (value: string): DisbursementStatus | undefined => {
  return getMockDisbursementStatuses().find(status => status.value === value);
};

/**
 * Get disbursement statuses by IDs
 */
export const getDisbursementStatusesByIds = (ids: string[]): DisbursementStatus[] => {
  const allStatuses = getMockDisbursementStatuses();
  return allStatuses.filter(status => ids.includes(status.id));
};




