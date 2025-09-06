import axios from 'axios';

/**
 * Commission type data structure
 */
export interface CommissionType {
  id: string;
  name: string;
  code: string;
  description: string;
  category: 'employee' | 'referral_partner' | 'interest' | 'other';
  commission_rate: number;
  is_active: boolean;
  total_commissions?: number;
  total_transactions?: number;
  average_commission?: number;
  color?: string;
  icon?: string;
}

/**
 * API response structure for commission type data
 */
export interface CommissionTypeApiResponse {
  commission_types: CommissionType[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * Parameters for fetching commission types
 */
export interface CommissionTypeFilterParams {
  search?: string;
  category?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
  sort_by?: 'name' | 'code' | 'category' | 'commission_rate';
  sort_order?: 'asc' | 'desc';
}

/**
 * Fetch commission types with filtering and pagination
 */
export const fetchCommissionTypes = async (params: CommissionTypeFilterParams = {}): Promise<CommissionTypeApiResponse> => {
  try {
    const response = await axios.get('/api/commission-types', {
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
    console.error('Error fetching commission types:', error);
    throw new Error('Failed to fetch commission types');
  }
};

/**
 * Fetch all commission types (for dropdown/select components)
 */
export const fetchAllCommissionTypes = async (): Promise<CommissionType[]> => {
  try {
    const response = await fetchCommissionTypes({
      is_active: true,
      page_size: 1000, // Get all active commission types
      sort_by: 'name',
      sort_order: 'asc'
    });

    return response.commission_types;
  } catch (error) {
    console.error('Error fetching all commission types:', error);
    throw new Error('Failed to fetch all commission types');
  }
};

/**
 * Search commission types by name, code, or description
 */
export const searchCommissionTypes = async (searchTerm: string): Promise<CommissionType[]> => {
  try {
    const response = await fetchCommissionTypes({
      search: searchTerm,
      is_active: true,
      page_size: 50,
      sort_by: 'name',
      sort_order: 'asc'
    });

    return response.commission_types;
  } catch (error) {
    console.error('Error searching commission types:', error);
    throw new Error('Failed to search commission types');
  }
};

/**
 * Get commission type by ID
 */
export const getCommissionTypeById = async (id: string): Promise<CommissionType> => {
  try {
    const response = await axios.get(`/api/commission-types/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching commission type by ID:', error);
    throw new Error('Failed to fetch commission type');
  }
};

/**
 * Get commission types by category
 */
export const getCommissionTypesByCategory = async (category: string): Promise<CommissionType[]> => {
  try {
    const response = await fetchCommissionTypes({
      category: category,
      is_active: true,
      page_size: 100,
      sort_by: 'name',
      sort_order: 'asc'
    });

    return response.commission_types;
  } catch (error) {
    console.error('Error fetching commission types by category:', error);
    throw new Error('Failed to fetch commission types by category');
  }
};

/**
 * Mock data for development/testing
 */
export const getMockCommissionTypes = (): CommissionType[] => [
  // Employee Commission Types
  {
    id: 'emp_sales_rep',
    name: 'Sales Representative Commission',
    code: 'EMP_SALES_REP',
    description: 'Standard commission for sales representatives',
    category: 'employee',
    commission_rate: 5.0,
    is_active: true,
    total_commissions: 125000,
    total_transactions: 1500,
    average_commission: 83.33,
    color: '#3B82F6',
    icon: '👤'
  },
  {
    id: 'emp_senior_sales',
    name: 'Senior Sales Commission',
    code: 'EMP_SENIOR_SALES',
    description: 'Enhanced commission for senior sales representatives',
    category: 'employee',
    commission_rate: 6.5,
    is_active: true,
    total_commissions: 187500,
    total_transactions: 2000,
    average_commission: 93.75,
    color: '#1D4ED8',
    icon: '👨‍💼'
  },
  {
    id: 'emp_sales_manager',
    name: 'Sales Manager Commission',
    code: 'EMP_SALES_MGR',
    description: 'Management commission for sales managers',
    category: 'employee',
    commission_rate: 3.0,
    is_active: true,
    total_commissions: 150000,
    total_transactions: 3000,
    average_commission: 50.00,
    color: '#1E40AF',
    icon: '👔'
  },
  {
    id: 'emp_operations',
    name: 'Operations Commission',
    code: 'EMP_OPS',
    description: 'Commission for operations team members',
    category: 'employee',
    commission_rate: 2.5,
    is_active: true,
    total_commissions: 45000,
    total_transactions: 1800,
    average_commission: 25.00,
    color: '#6366F1',
    icon: '⚙️'
  },
  {
    id: 'emp_customer_service',
    name: 'Customer Service Commission',
    code: 'EMP_CS',
    description: 'Commission for customer service representatives',
    category: 'employee',
    commission_rate: 1.0,
    is_active: true,
    total_commissions: 18000,
    total_transactions: 1800,
    average_commission: 10.00,
    color: '#8B5CF6',
    icon: '🎧'
  },

  // Referral Partner Commission Types
  {
    id: 'ref_partner_a',
    name: 'Partner A Commission',
    code: 'REF_PARTNER_A',
    description: 'Commission for Partner A referral program',
    category: 'referral_partner',
    commission_rate: 8.0,
    is_active: true,
    total_commissions: 80000,
    total_transactions: 800,
    average_commission: 100.00,
    color: '#10B981',
    icon: '🤝'
  },
  {
    id: 'ref_partner_b',
    name: 'Partner B Commission',
    code: 'REF_PARTNER_B',
    description: 'Commission for Partner B referral program',
    category: 'referral_partner',
    commission_rate: 7.5,
    is_active: true,
    total_commissions: 75000,
    total_transactions: 750,
    average_commission: 100.00,
    color: '#059669',
    icon: '🤝'
  },
  {
    id: 'ref_partner_c',
    name: 'Partner C Commission',
    code: 'REF_PARTNER_C',
    description: 'Commission for Partner C referral program',
    category: 'referral_partner',
    commission_rate: 9.0,
    is_active: true,
    total_commissions: 90000,
    total_transactions: 900,
    average_commission: 100.00,
    color: '#047857',
    icon: '🤝'
  },
  {
    id: 'ref_affiliate',
    name: 'Affiliate Commission',
    code: 'REF_AFFILIATE',
    description: 'Standard affiliate program commission',
    category: 'referral_partner',
    commission_rate: 5.0,
    is_active: true,
    total_commissions: 50000,
    total_transactions: 1000,
    average_commission: 50.00,
    color: '#065F46',
    icon: '🔗'
  },

  // Interest Commission Types
  {
    id: 'int_monthly',
    name: 'Monthly Interest Commission',
    code: 'INT_MONTHLY',
    description: 'Commission on monthly interest revenue',
    category: 'interest',
    commission_rate: 2.0,
    is_active: true,
    total_commissions: 20000,
    total_transactions: 1200,
    average_commission: 16.67,
    color: '#F59E0B',
    icon: '💰'
  },
  {
    id: 'int_quarterly',
    name: 'Quarterly Interest Commission',
    code: 'INT_QUARTERLY',
    description: 'Commission on quarterly interest revenue',
    category: 'interest',
    commission_rate: 2.5,
    is_active: true,
    total_commissions: 25000,
    total_transactions: 400,
    average_commission: 62.50,
    color: '#D97706',
    icon: '💵'
  },
  {
    id: 'int_annual',
    name: 'Annual Interest Commission',
    code: 'INT_ANNUAL',
    description: 'Commission on annual interest revenue',
    category: 'interest',
    commission_rate: 3.0,
    is_active: true,
    total_commissions: 30000,
    total_transactions: 100,
    average_commission: 300.00,
    color: '#B45309',
    icon: '🏦'
  },

  // Other Commission Types
  {
    id: 'other_bonus',
    name: 'Performance Bonus',
    code: 'OTHER_BONUS',
    description: 'Performance-based bonus commission',
    category: 'other',
    commission_rate: 1.5,
    is_active: true,
    total_commissions: 15000,
    total_transactions: 300,
    average_commission: 50.00,
    color: '#EF4444',
    icon: '🏆'
  },
  {
    id: 'other_special',
    name: 'Special Project Commission',
    code: 'OTHER_SPECIAL',
    description: 'Commission for special projects',
    category: 'other',
    commission_rate: 4.0,
    is_active: true,
    total_commissions: 40000,
    total_transactions: 200,
    average_commission: 200.00,
    color: '#DC2626',
    icon: '⭐'
  }
];

/**
 * Mock search function for development
 */
export const mockSearchCommissionTypes = (searchTerm: string): CommissionType[] => {
  const commissionTypes = getMockCommissionTypes();
  if (!searchTerm) return commissionTypes;
  
  return commissionTypes.filter(type => 
    type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    type.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    type.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    type.category.toLowerCase().includes(searchTerm.toLowerCase())
  );
};

/**
 * Get commission type categories for filtering
 */
export const getCommissionTypeCategories = (): Array<{ value: string; label: string; count: number; color: string; icon: string }> => {
  const commissionTypes = getMockCommissionTypes();
  const categories = commissionTypes.reduce((acc, type) => {
    if (!acc[type.category]) {
      acc[type.category] = {
        value: type.category,
        label: type.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count: 0,
        color: type.color || '#6B7280',
        icon: type.icon || '📊'
      };
    }
    acc[type.category].count++;
    return acc;
  }, {} as Record<string, { value: string; label: string; count: number; color: string; icon: string }>);
  
  return Object.values(categories).sort((a, b) => a.label.localeCompare(b.label));
};

/**
 * Get commission type statistics
 */
export const getCommissionTypeStats = () => {
  const commissionTypes = getMockCommissionTypes();
  const stats = {
    total: commissionTypes.length,
    active: commissionTypes.filter(t => t.is_active).length,
    inactive: commissionTypes.filter(t => !t.is_active).length,
    byCategory: commissionTypes.reduce((acc, type) => {
      acc[type.category] = (acc[type.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    totalCommissions: commissionTypes.reduce((sum, type) => sum + (type.total_commissions || 0), 0),
    totalTransactions: commissionTypes.reduce((sum, type) => sum + (type.total_transactions || 0), 0),
    averageCommissionRate: commissionTypes.length > 0 ? commissionTypes.reduce((sum, type) => sum + type.commission_rate, 0) / commissionTypes.length : 0,
    averageCommission: commissionTypes.length > 0 ? commissionTypes.reduce((sum, type) => sum + (type.average_commission || 0), 0) / commissionTypes.length : 0
  };
  
  return stats;
};




