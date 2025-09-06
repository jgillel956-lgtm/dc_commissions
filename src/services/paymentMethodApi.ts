import axios from 'axios';

export interface PaymentMethod {
  id: number;
  name: string;
  code?: string;
  type?: 'card' | 'ach' | 'wire' | 'check' | 'other';
  status?: 'active' | 'inactive';
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentMethodApiResponse {
  payment_methods: PaymentMethod[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaymentMethodFilterParams {
  search?: string;
  type?: 'card' | 'ach' | 'wire' | 'check' | 'other' | 'all';
  status?: 'active' | 'inactive' | 'all';
  page?: number;
  page_size?: number;
  sort_by?: 'name' | 'type' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

/**
 * Fetch payment methods from the API
 */
export const fetchPaymentMethods = async (params: PaymentMethodFilterParams = {}): Promise<PaymentMethodApiResponse> => {
  try {
    const response = await axios.get('/api/payment-methods', {
      params: {
        search: params.search || '',
        type: params.type || 'all',
        status: params.status || 'all',
        page: params.page || 1,
        page_size: params.page_size || 100,
        sort_by: params.sort_by || 'name',
        sort_order: params.sort_order || 'asc'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    throw new Error('Failed to fetch payment methods');
  }
};

/**
 * Fetch all payment methods (for dropdown/select components)
 */
export const fetchAllPaymentMethods = async (): Promise<PaymentMethod[]> => {
  try {
    const response = await fetchPaymentMethods({
      status: 'active',
      page_size: 1000, // Get all active payment methods
      sort_by: 'name',
      sort_order: 'asc'
    });

    return response.payment_methods;
  } catch (error) {
    console.error('Error fetching all payment methods:', error);
    throw new Error('Failed to fetch all payment methods');
  }
};

/**
 * Search payment methods by name or code
 */
export const searchPaymentMethods = async (searchTerm: string): Promise<PaymentMethod[]> => {
  try {
    const response = await fetchPaymentMethods({
      search: searchTerm,
      status: 'active',
      page_size: 50,
      sort_by: 'name',
      sort_order: 'asc'
    });

    return response.payment_methods;
  } catch (error) {
    console.error('Error searching payment methods:', error);
    throw new Error('Failed to search payment methods');
  }
};

/**
 * Get payment method by ID
 */
export const getPaymentMethodById = async (id: number): Promise<PaymentMethod> => {
  try {
    const response = await axios.get(`/api/payment-methods/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching payment method by ID:', error);
    throw new Error('Failed to fetch payment method');
  }
};

/**
 * Get payment methods by IDs (batch fetch)
 */
export const getPaymentMethodsByIds = async (ids: number[]): Promise<PaymentMethod[]> => {
  try {
    if (ids.length === 0) return [];
    
    const response = await axios.post('/api/payment-methods/batch', {
      ids: ids
    });

    return response.data.payment_methods;
  } catch (error) {
    console.error('Error fetching payment methods by IDs:', error);
    throw new Error('Failed to fetch payment methods');
  }
};

/**
 * Get payment methods by type
 */
export const getPaymentMethodsByType = async (type: PaymentMethod['type']): Promise<PaymentMethod[]> => {
  try {
    const response = await fetchPaymentMethods({
      type: type || 'all',
      status: 'active',
      page_size: 100,
      sort_by: 'name',
      sort_order: 'asc'
    });

    return response.payment_methods;
  } catch (error) {
    console.error('Error fetching payment methods by type:', error);
    throw new Error('Failed to fetch payment methods by type');
  }
};

/**
 * Mock data for development/testing
 */
export const getMockPaymentMethods = (): PaymentMethod[] => [
  { id: 1, name: 'Credit Card', code: 'CC', type: 'card', status: 'active', description: 'Credit card payments' },
  { id: 2, name: 'Debit Card', code: 'DC', type: 'card', status: 'active', description: 'Debit card payments' },
  { id: 3, name: 'ACH Transfer', code: 'ACH', type: 'ach', status: 'active', description: 'Automated Clearing House transfers' },
  { id: 4, name: 'Wire Transfer', code: 'WIRE', type: 'wire', status: 'active', description: 'Wire transfer payments' },
  { id: 5, name: 'Check', code: 'CHECK', type: 'check', status: 'active', description: 'Paper check payments' },
  { id: 6, name: 'Electronic Check', code: 'ECHECK', type: 'check', status: 'active', description: 'Electronic check payments' },
  { id: 7, name: 'PayPal', code: 'PAYPAL', type: 'other', status: 'active', description: 'PayPal digital payments' },
  { id: 8, name: 'Venmo', code: 'VENMO', type: 'other', status: 'active', description: 'Venmo mobile payments' },
  { id: 9, name: 'Zelle', code: 'ZELLE', type: 'other', status: 'active', description: 'Zelle bank-to-bank transfers' },
  { id: 10, name: 'Cash', code: 'CASH', type: 'other', status: 'active', description: 'Cash payments' },
  { id: 11, name: 'Money Order', code: 'MO', type: 'other', status: 'active', description: 'Money order payments' },
  { id: 12, name: 'Cashier\'s Check', code: 'CASHIERS', type: 'check', status: 'active', description: 'Cashier\'s check payments' },
  { id: 13, name: 'Bank Transfer', code: 'BANK', type: 'wire', status: 'active', description: 'Direct bank transfers' },
  { id: 14, name: 'Digital Wallet', code: 'DIGITAL', type: 'other', status: 'active', description: 'Digital wallet payments' },
  { id: 15, name: 'Cryptocurrency', code: 'CRYPTO', type: 'other', status: 'active', description: 'Cryptocurrency payments' }
];

/**
 * Mock search function for development
 */
export const mockSearchPaymentMethods = (searchTerm: string): PaymentMethod[] => {
  const paymentMethods = getMockPaymentMethods();
  if (!searchTerm) return paymentMethods;
  
  return paymentMethods.filter(method => 
    method.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    method.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    method.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );
};

/**
 * Get payment method types for filtering
 */
export const getPaymentMethodTypes = (): Array<{ value: string; label: string; description: string }> => [
  { value: 'card', label: 'Card Payments', description: 'Credit and debit card transactions' },
  { value: 'ach', label: 'ACH Transfers', description: 'Automated Clearing House transfers' },
  { value: 'wire', label: 'Wire Transfers', description: 'Wire transfer payments' },
  { value: 'check', label: 'Check Payments', description: 'Paper and electronic checks' },
  { value: 'other', label: 'Other Methods', description: 'Digital wallets, crypto, etc.' }
];




