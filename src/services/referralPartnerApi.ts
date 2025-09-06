import axios from 'axios';

/**
 * Referral partner data structure
 */
export interface ReferralPartner {
  id: string;
  name: string;
  code?: string;
  type?: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: 'active' | 'inactive' | 'pending';
  commission_rate?: number;
  default_rate?: number;
  total_transactions?: number;
  total_amount?: number;
  total_commission?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * API response structure for referral partners
 */
export interface ReferralPartnerApiResponse {
  data: ReferralPartner[];
  total: number;
  page: number;
  limit: number;
  success: boolean;
  message?: string;
}

/**
 * Filter parameters for referral partner queries
 */
export interface ReferralPartnerFilterParams {
  search?: string;
  type?: string;
  status?: string;
  company?: string;
  limit?: number;
  offset?: number;
}

/**
 * Mock referral partner data for development
 */
export const getMockReferralPartners = (): ReferralPartner[] => {
  return [
    {
      id: '1',
      name: 'ABC Financial Services',
      code: 'ABC001',
      type: 'Financial Institution',
      email: 'contact@abcfinserv.com',
      phone: '(555) 123-4567',
      company: 'ABC Financial Group',
      status: 'active',
      commission_rate: 2.5,
      default_rate: 2.0,
      total_transactions: 1250,
      total_amount: 4500000,
      total_commission: 112500,
      created_at: '2023-01-15T10:00:00Z',
      updated_at: '2024-01-15T14:30:00Z'
    },
    {
      id: '2',
      name: 'XYZ Consulting Group',
      code: 'XYZ002',
      type: 'Consulting Firm',
      email: 'partners@xyzconsulting.com',
      phone: '(555) 234-5678',
      company: 'XYZ Partners LLC',
      status: 'active',
      commission_rate: 3.0,
      default_rate: 2.5,
      total_transactions: 890,
      total_amount: 3200000,
      total_commission: 96000,
      created_at: '2023-02-20T09:15:00Z',
      updated_at: '2024-01-10T11:45:00Z'
    },
    {
      id: '3',
      name: 'Delta Business Solutions',
      code: 'DEL003',
      type: 'Business Services',
      email: 'info@deltabusiness.com',
      phone: '(555) 345-6789',
      company: 'Delta Solutions Inc',
      status: 'active',
      commission_rate: 2.0,
      default_rate: 1.8,
      total_transactions: 2100,
      total_amount: 7800000,
      total_commission: 156000,
      created_at: '2023-03-10T13:20:00Z',
      updated_at: '2024-01-20T16:15:00Z'
    },
    {
      id: '4',
      name: 'Omega Investment Partners',
      code: 'OMG004',
      type: 'Investment Firm',
      email: 'partnerships@omegainvest.com',
      phone: '(555) 456-7890',
      company: 'Omega Capital Management',
      status: 'active',
      commission_rate: 4.0,
      default_rate: 3.5,
      total_transactions: 650,
      total_amount: 2800000,
      total_commission: 112000,
      created_at: '2023-04-05T08:45:00Z',
      updated_at: '2024-01-12T10:30:00Z'
    },
    {
      id: '5',
      name: 'Sigma Legal Services',
      code: 'SIG005',
      type: 'Legal Services',
      email: 'referrals@sigmalegal.com',
      phone: '(555) 567-8901',
      company: 'Sigma Law Group',
      status: 'active',
      commission_rate: 2.8,
      default_rate: 2.2,
      total_transactions: 980,
      total_amount: 3600000,
      total_commission: 100800,
      created_at: '2023-05-12T11:30:00Z',
      updated_at: '2024-01-18T15:20:00Z'
    },
    {
      id: '6',
      name: 'Gamma Technology Solutions',
      code: 'GAM006',
      type: 'Technology',
      email: 'partners@gammatech.com',
      phone: '(555) 678-9012',
      company: 'Gamma Tech Corp',
      status: 'inactive',
      commission_rate: 2.2,
      default_rate: 2.0,
      total_transactions: 450,
      total_amount: 1800000,
      total_commission: 39600,
      created_at: '2023-06-18T14:15:00Z',
      updated_at: '2023-12-15T09:45:00Z'
    },
    {
      id: '7',
      name: 'Beta Real Estate Group',
      code: 'BET007',
      type: 'Real Estate',
      email: 'referrals@betarealestate.com',
      phone: '(555) 789-0123',
      company: 'Beta Properties LLC',
      status: 'active',
      commission_rate: 3.2,
      default_rate: 2.8,
      total_transactions: 1200,
      total_amount: 4200000,
      total_commission: 134400,
      created_at: '2023-07-22T16:30:00Z',
      updated_at: '2024-01-25T12:00:00Z'
    },
    {
      id: '8',
      name: 'Theta Healthcare Partners',
      code: 'THE008',
      type: 'Healthcare',
      email: 'partnerships@thetahealth.com',
      phone: '(555) 890-1234',
      company: 'Theta Medical Group',
      status: 'pending',
      commission_rate: 2.6,
      default_rate: 2.3,
      total_transactions: 320,
      total_amount: 1200000,
      total_commission: 31200,
      created_at: '2023-08-30T10:45:00Z',
      updated_at: '2024-01-05T14:15:00Z'
    }
  ];
};

/**
 * Fetch all referral partners
 */
export const fetchAllReferralPartners = async (): Promise<ReferralPartner[]> => {
  try {
    const response = await axios.get<ReferralPartnerApiResponse>('/api/referral-partners');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching referral partners:', error);
    throw new Error('Failed to fetch referral partners');
  }
};

/**
 * Search referral partners
 */
export const searchReferralPartners = async (searchTerm: string): Promise<ReferralPartner[]> => {
  try {
    const response = await axios.get<ReferralPartnerApiResponse>('/api/referral-partners/search', {
      params: { search: searchTerm }
    });
    return response.data.data;
  } catch (error) {
    console.error('Error searching referral partners:', error);
    throw new Error('Failed to search referral partners');
  }
};

/**
 * Get referral partner by ID
 */
export const getReferralPartnerById = async (id: string): Promise<ReferralPartner | null> => {
  try {
    const response = await axios.get<ReferralPartnerApiResponse>(`/api/referral-partners/${id}`);
    return response.data.data[0] || null;
  } catch (error) {
    console.error('Error fetching referral partner by ID:', error);
    return null;
  }
};

/**
 * Get referral partners by type
 */
export const getReferralPartnersByType = async (type: string): Promise<ReferralPartner[]> => {
  try {
    const response = await axios.get<ReferralPartnerApiResponse>('/api/referral-partners', {
      params: { type }
    });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching referral partners by type:', error);
    throw new Error('Failed to fetch referral partners by type');
  }
};

/**
 * Get referral partners by status
 */
export const getReferralPartnersByStatus = async (status: string): Promise<ReferralPartner[]> => {
  try {
    const response = await axios.get<ReferralPartnerApiResponse>('/api/referral-partners', {
      params: { status }
    });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching referral partners by status:', error);
    throw new Error('Failed to fetch referral partners by status');
  }
};

/**
 * Get referral partner types
 */
export const getReferralPartnerTypes = (): string[] => {
  const partners = getMockReferralPartners();
  const types = partners.map(partner => partner.type).filter(Boolean) as string[];
  return [...new Set(types)];
};

/**
 * Get referral partner statistics
 */
export const getReferralPartnerStats = (): {
  totalPartners: number;
  activePartners: number;
  totalTransactions: number;
  totalAmount: number;
  totalCommission: number;
} => {
  const partners = getMockReferralPartners();
  
  return {
    totalPartners: partners.length,
    activePartners: partners.filter(p => p.status === 'active').length,
    totalTransactions: partners.reduce((sum, p) => sum + (p.total_transactions || 0), 0),
    totalAmount: partners.reduce((sum, p) => sum + (p.total_amount || 0), 0),
    totalCommission: partners.reduce((sum, p) => sum + (p.total_commission || 0), 0)
  };
};

/**
 * Mock search function for development
 */
export const mockSearchReferralPartners = (searchTerm: string): ReferralPartner[] => {
  const partners = getMockReferralPartners();
  if (!searchTerm) return partners;
  
  const lowerSearchTerm = searchTerm.toLowerCase();
  return partners.filter(partner => 
    partner.name.toLowerCase().includes(lowerSearchTerm) ||
    partner.code?.toLowerCase().includes(lowerSearchTerm) ||
    partner.email?.toLowerCase().includes(lowerSearchTerm) ||
    partner.company?.toLowerCase().includes(lowerSearchTerm) ||
    partner.type?.toLowerCase().includes(lowerSearchTerm)
  );
};




