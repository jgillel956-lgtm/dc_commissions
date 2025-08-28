import { fetchRevenueData, fetchCommissionData, fetchCompanyData, fetchPaymentData } from '../../src/services/revenueApi';

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock data
const mockRevenueResponse = {
  totalRevenue: 1500000,
  totalTransactions: 1250,
  averageTransactionValue: 1200,
  revenueGrowth: 0.15,
  revenueByCompany: [
    { company: 'Acme Corp', revenue: 500000, transactions: 400 },
    { company: 'Tech Solutions', revenue: 300000, transactions: 250 },
    { company: 'Global Industries', revenue: 700000, transactions: 600 }
  ],
  revenueByPaymentMethod: [
    { method: 'Credit Card', revenue: 900000, percentage: 60 },
    { method: 'ACH', revenue: 450000, percentage: 30 },
    { method: 'Wire Transfer', revenue: 150000, percentage: 10 }
  ],
  monthlyRevenue: [
    { month: 'Jan', revenue: 120000 },
    { month: 'Feb', revenue: 135000 },
    { month: 'Mar', revenue: 150000 }
  ]
};

const mockCommissionResponse = {
  totalCommission: 75000,
  totalPayments: 500,
  averageCommission: 150,
  commissionGrowth: 0.12,
  commissionByEmployee: [
    { employee: 'John Doe', commission: 25000, payments: 150 },
    { employee: 'Jane Smith', commission: 20000, payments: 120 },
    { employee: 'Bob Johnson', commission: 30000, payments: 230 }
  ],
  commissionByType: [
    { type: 'Employee', commission: 45000, percentage: 60 },
    { type: 'Referral Partner', commission: 20000, percentage: 27 },
    { type: 'Interest', commission: 10000, percentage: 13 }
  ]
};

const mockFilters = {
  dateRange: { type: 'last_30_days' },
  companies: ['Acme Corp'],
  paymentMethods: ['Credit Card'],
  revenueSources: ['transaction'],
  employees: [],
  commissionTypes: [],
  amountRange: { min: 0, max: 100000 },
  disbursementStatus: [],
  referralPartners: []
};

describe('revenueApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('fetchRevenueData', () => {
    it('should fetch revenue data successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRevenueResponse,
        status: 200
      } as Response);

      const result = await fetchRevenueData(mockFilters);

      expect(result).toEqual(mockRevenueResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/revenue'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify(mockFilters)
        })
      );
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      await expect(fetchRevenueData(mockFilters)).rejects.toThrow('Failed to fetch revenue data');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchRevenueData(mockFilters)).rejects.toThrow('Network error');
    });

    it('should handle invalid JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
        status: 200
      } as Response);

      await expect(fetchRevenueData(mockFilters)).rejects.toThrow('Invalid JSON');
    });

    it('should include authentication headers', async () => {
      const token = 'test-token';
      localStorage.setItem('authToken', token);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRevenueResponse,
        status: 200
      } as Response);

      await fetchRevenueData(mockFilters);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${token}`
          })
        })
      );
    });

    it('should handle missing authentication token', async () => {
      localStorage.removeItem('authToken');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRevenueResponse,
        status: 200
      } as Response);

      const result = await fetchRevenueData(mockFilters);

      expect(result).toEqual(mockRevenueResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String)
          })
        })
      );
    });
  });

  describe('fetchCommissionData', () => {
    it('should fetch commission data successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCommissionResponse,
        status: 200
      } as Response);

      const result = await fetchCommissionData(mockFilters);

      expect(result).toEqual(mockCommissionResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/commission'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify(mockFilters)
        })
      );
    });

    it('should handle commission API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response);

      await expect(fetchCommissionData(mockFilters)).rejects.toThrow('Failed to fetch commission data');
    });

    it('should validate commission data structure', async () => {
      const invalidResponse = {
        totalCommission: 75000,
        // Missing required fields
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidResponse,
        status: 200
      } as Response);

      await expect(fetchCommissionData(mockFilters)).rejects.toThrow('Invalid commission data format');
    });
  });

  describe('fetchCompanyData', () => {
    it('should fetch company data successfully', async () => {
      const mockCompanyResponse = {
        companies: [
          { id: 1, name: 'Acme Corp', revenue: 500000 },
          { id: 2, name: 'Tech Solutions', revenue: 300000 }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCompanyResponse,
        status: 200
      } as Response);

      const result = await fetchCompanyData(mockFilters);

      expect(result).toEqual(mockCompanyResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/companies'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockFilters)
        })
      );
    });

    it('should handle company data errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      } as Response);

      await expect(fetchCompanyData(mockFilters)).rejects.toThrow('Failed to fetch company data');
    });
  });

  describe('fetchPaymentData', () => {
    it('should fetch payment data successfully', async () => {
      const mockPaymentResponse = {
        payments: [
          { id: 1, method: 'Credit Card', amount: 1000, date: '2024-01-15' },
          { id: 2, method: 'ACH', amount: 500, date: '2024-01-16' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPaymentResponse,
        status: 200
      } as Response);

      const result = await fetchPaymentData(mockFilters);

      expect(result).toEqual(mockPaymentResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/payments'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockFilters)
        })
      );
    });

    it('should handle payment data errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      } as Response);

      await expect(fetchPaymentData(mockFilters)).rejects.toThrow('Failed to fetch payment data');
    });
  });

  describe('Data Validation', () => {
    it('should validate revenue data structure', async () => {
      const invalidResponse = {
        totalRevenue: 1500000,
        // Missing required fields
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidResponse,
        status: 200
      } as Response);

      await expect(fetchRevenueData(mockFilters)).rejects.toThrow('Invalid revenue data format');
    });

    it('should validate numeric values in response', async () => {
      const invalidResponse = {
        ...mockRevenueResponse,
        totalRevenue: 'invalid'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidResponse,
        status: 200
      } as Response);

      await expect(fetchRevenueData(mockFilters)).rejects.toThrow('Invalid numeric value');
    });

    it('should validate array structures', async () => {
      const invalidResponse = {
        ...mockRevenueResponse,
        revenueByCompany: 'not an array'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidResponse,
        status: 200
      } as Response);

      await expect(fetchRevenueData(mockFilters)).rejects.toThrow('Invalid array format');
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 Unauthorized errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      } as Response);

      await expect(fetchRevenueData(mockFilters)).rejects.toThrow('Authentication required');
    });

    it('should handle 403 Forbidden errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      } as Response);

      await expect(fetchRevenueData(mockFilters)).rejects.toThrow('Insufficient permissions');
    });

    it('should handle 404 Not Found errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response);

      await expect(fetchRevenueData(mockFilters)).rejects.toThrow('Resource not found');
    });

    it('should handle 500 Internal Server Error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      await expect(fetchRevenueData(mockFilters)).rejects.toThrow('Server error occurred');
    });

    it('should handle unknown HTTP status codes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 418,
        statusText: 'I\'m a teapot'
      } as Response);

      await expect(fetchRevenueData(mockFilters)).rejects.toThrow('HTTP 418: I\'m a teapot');
    });
  });

  describe('Request Configuration', () => {
    it('should use correct API base URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRevenueResponse,
        status: 200
      } as Response);

      await fetchRevenueData(mockFilters);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/^https?:\/\/[^\/]+\/api\/revenue/),
        expect.any(Object)
      );
    });

    it('should include proper request headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRevenueResponse,
        status: 200
      } as Response);

      await fetchRevenueData(mockFilters);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          })
        })
      );
    });

    it('should use POST method for data requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRevenueResponse,
        status: 200
      } as Response);

      await fetchRevenueData(mockFilters);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  describe('Filter Processing', () => {
    it('should serialize filters correctly', async () => {
      const complexFilters = {
        dateRange: { type: 'custom', start_date: '2024-01-01', end_date: '2024-01-31' },
        companies: ['Acme Corp', 'Tech Solutions'],
        paymentMethods: ['Credit Card', 'ACH'],
        amountRange: { min: 1000, max: 50000 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRevenueResponse,
        status: 200
      } as Response);

      await fetchRevenueData(complexFilters);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(complexFilters)
        })
      );
    });

    it('should handle empty filters', async () => {
      const emptyFilters = {};

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRevenueResponse,
        status: 200
      } as Response);

      await fetchRevenueData(emptyFilters);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(emptyFilters)
        })
      );
    });

    it('should handle null and undefined values in filters', async () => {
      const filtersWithNulls = {
        dateRange: { type: 'last_30_days' },
        companies: null,
        paymentMethods: undefined,
        amountRange: { min: 0, max: null }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRevenueResponse,
        status: 200
      } as Response);

      await fetchRevenueData(filtersWithNulls);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(filtersWithNulls)
        })
      );
    });
  });

  describe('Response Processing', () => {
    it('should handle empty response arrays', async () => {
      const emptyResponse = {
        totalRevenue: 0,
        totalTransactions: 0,
        averageTransactionValue: 0,
        revenueGrowth: 0,
        revenueByCompany: [],
        revenueByPaymentMethod: [],
        monthlyRevenue: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => emptyResponse,
        status: 200
      } as Response);

      const result = await fetchRevenueData(mockFilters);

      expect(result).toEqual(emptyResponse);
    });

    it('should handle response with null values', async () => {
      const responseWithNulls = {
        ...mockRevenueResponse,
        revenueByCompany: null,
        monthlyRevenue: undefined
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseWithNulls,
        status: 200
      } as Response);

      const result = await fetchRevenueData(mockFilters);

      expect(result).toEqual(responseWithNulls);
    });

    it('should preserve response structure', async () => {
      const customResponse = {
        ...mockRevenueResponse,
        customField: 'custom value',
        nestedObject: {
          key: 'value',
          number: 42
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => customResponse,
        status: 200
      } as Response);

      const result = await fetchRevenueData(mockFilters);

      expect(result).toEqual(customResponse);
      expect(result.customField).toBe('custom value');
      expect(result.nestedObject.key).toBe('value');
    });
  });

  describe('Timeout Handling', () => {
    it('should handle request timeouts', async () => {
      mockFetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      await expect(fetchRevenueData(mockFilters)).rejects.toThrow('Request timeout');
    });

    it('should handle slow responses', async () => {
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => mockRevenueResponse,
            status: 200
          } as Response), 2000)
        )
      );

      const result = await fetchRevenueData(mockFilters);

      expect(result).toEqual(mockRevenueResponse);
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed requests', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRevenueResponse,
          status: 200
        } as Response);

      const result = await fetchRevenueData(mockFilters, { retries: 1 });

      expect(result).toEqual(mockRevenueResponse);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 4xx errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      } as Response);

      await expect(fetchRevenueData(mockFilters, { retries: 3 })).rejects.toThrow('Bad Request');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on 5xx errors', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRevenueResponse,
          status: 200
        } as Response);

      const result = await fetchRevenueData(mockFilters, { retries: 1 });

      expect(result).toEqual(mockRevenueResponse);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
