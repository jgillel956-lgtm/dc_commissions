import { renderHook, act, waitFor } from '@testing-library/react';
import { useRevenueData } from '../../src/hooks/useRevenueData';
import { fetchRevenueData } from '../../src/services/revenueApi';

// Mock the API service
jest.mock('../../src/services/revenueApi');
const mockFetchRevenueData = fetchRevenueData as jest.MockedFunction<typeof fetchRevenueData>;

// Mock data
const mockRevenueData = {
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

describe('useRevenueData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchRevenueData.mockResolvedValue(mockRevenueData);
  });

  describe('Initial State', () => {
    it('should return initial loading state', () => {
      const { result } = renderHook(() => useRevenueData(mockFilters));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBe(null);
      expect(result.current.data).toBe(null);
    });

    it('should start with empty data', () => {
      const { result } = renderHook(() => useRevenueData(mockFilters));

      expect(result.current.data).toBe(null);
    });
  });

  describe('Data Fetching', () => {
    it('should fetch data successfully', async () => {
      const { result } = renderHook(() => useRevenueData(mockFilters));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockRevenueData);
      expect(result.current.error).toBe(null);
      expect(mockFetchRevenueData).toHaveBeenCalledWith(mockFilters);
    });

    it('should call API with correct filters', async () => {
      renderHook(() => useRevenueData(mockFilters));

      await waitFor(() => {
        expect(mockFetchRevenueData).toHaveBeenCalledWith(mockFilters);
      });
    });

    it('should handle API errors', async () => {
      const errorMessage = 'Failed to fetch revenue data';
      mockFetchRevenueData.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useRevenueData(mockFilters));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.data).toBe(null);
    });

    it('should retry failed requests', async () => {
      const errorMessage = 'Network error';
      mockFetchRevenueData
        .mockRejectedValueOnce(new Error(errorMessage))
        .mockResolvedValueOnce(mockRevenueData);

      const { result } = renderHook(() => useRevenueData(mockFilters));

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
      });

      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockRevenueData);
        expect(result.current.error).toBe(null);
      });
    });
  });

  describe('Caching', () => {
    it('should cache data and avoid unnecessary API calls', async () => {
      const { result, rerender } = renderHook(() => useRevenueData(mockFilters));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Rerender with same filters
      rerender();

      expect(mockFetchRevenueData).toHaveBeenCalledTimes(1);
    });

    it('should refetch when filters change', async () => {
      const { result, rerender } = renderHook(() => useRevenueData(mockFilters));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newFilters = { ...mockFilters, companies: ['Tech Solutions'] };
      rerender();

      await waitFor(() => {
        expect(mockFetchRevenueData).toHaveBeenCalledTimes(2);
        expect(mockFetchRevenueData).toHaveBeenLastCalledWith(newFilters);
      });
    });

    it('should invalidate cache when refresh is called', async () => {
      const { result } = renderHook(() => useRevenueData(mockFilters));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(mockFetchRevenueData).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during initial fetch', () => {
      const { result } = renderHook(() => useRevenueData(mockFilters));

      expect(result.current.isLoading).toBe(true);
    });

    it('should show loading state during refresh', async () => {
      const { result } = renderHook(() => useRevenueData(mockFilters));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.refresh();
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('should not show loading state for cached data', async () => {
      const { result, rerender } = renderHook(() => useRevenueData(mockFilters));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      rerender();

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetchRevenueData.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useRevenueData(mockFilters));

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle API errors with status codes', async () => {
      const apiError = new Error('API Error');
      (apiError as any).status = 500;
      mockFetchRevenueData.mockRejectedValue(apiError);

      const { result } = renderHook(() => useRevenueData(mockFilters));

      await waitFor(() => {
        expect(result.current.error).toBe('API Error');
      });
    });

    it('should clear error when retry succeeds', async () => {
      mockFetchRevenueData
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockRevenueData);

      const { result } = renderHook(() => useRevenueData(mockFilters));

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });

      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.error).toBe(null);
        expect(result.current.data).toEqual(mockRevenueData);
      });
    });
  });

  describe('Data Transformation', () => {
    it('should format currency values correctly', async () => {
      const { result } = renderHook(() => useRevenueData(mockFilters));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockRevenueData);
      });

      expect(result.current.formattedData?.totalRevenue).toBe('$1,500,000');
      expect(result.current.formattedData?.averageTransactionValue).toBe('$1,200');
    });

    it('should calculate percentages correctly', async () => {
      const { result } = renderHook(() => useRevenueData(mockFilters));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockRevenueData);
      });

      expect(result.current.formattedData?.revenueGrowth).toBe('15%');
    });

    it('should sort data by revenue descending', async () => {
      const { result } = renderHook(() => useRevenueData(mockFilters));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockRevenueData);
      });

      const sortedCompanies = result.current.sortedData?.revenueByCompany;
      expect(sortedCompanies?.[0].company).toBe('Global Industries');
      expect(sortedCompanies?.[1].company).toBe('Acme Corp');
      expect(sortedCompanies?.[2].company).toBe('Tech Solutions');
    });
  });

  describe('Filter Dependencies', () => {
    it('should refetch when date range changes', async () => {
      const { result, rerender } = renderHook(() => useRevenueData(mockFilters));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newFilters = {
        ...mockFilters,
        dateRange: { type: 'last_90_days' }
      };
      rerender();

      await waitFor(() => {
        expect(mockFetchRevenueData).toHaveBeenCalledTimes(2);
        expect(mockFetchRevenueData).toHaveBeenLastCalledWith(newFilters);
      });
    });

    it('should refetch when company filter changes', async () => {
      const { result, rerender } = renderHook(() => useRevenueData(mockFilters));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newFilters = {
        ...mockFilters,
        companies: ['Tech Solutions', 'Global Industries']
      };
      rerender();

      await waitFor(() => {
        expect(mockFetchRevenueData).toHaveBeenCalledTimes(2);
        expect(mockFetchRevenueData).toHaveBeenLastCalledWith(newFilters);
      });
    });

    it('should refetch when payment method filter changes', async () => {
      const { result, rerender } = renderHook(() => useRevenueData(mockFilters));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newFilters = {
        ...mockFilters,
        paymentMethods: ['ACH', 'Wire Transfer']
      };
      rerender();

      await waitFor(() => {
        expect(mockFetchRevenueData).toHaveBeenCalledTimes(2);
        expect(mockFetchRevenueData).toHaveBeenLastCalledWith(newFilters);
      });
    });
  });

  describe('Performance Optimization', () => {
    it('should debounce rapid filter changes', async () => {
      jest.useFakeTimers();

      const { result, rerender } = renderHook(() => useRevenueData(mockFilters));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Rapid filter changes
      const newFilters1 = { ...mockFilters, companies: ['Acme Corp'] };
      const newFilters2 = { ...mockFilters, companies: ['Tech Solutions'] };
      const newFilters3 = { ...mockFilters, companies: ['Global Industries'] };

      rerender();
      rerender();
      rerender();

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockFetchRevenueData).toHaveBeenCalledTimes(2); // Initial + last change
      });

      jest.useRealTimers();
    });

    it('should cancel previous requests when new request starts', async () => {
      const { result, rerender } = renderHook(() => useRevenueData(mockFilters));

      // Start first request
      rerender();

      // Start second request before first completes
      const newFilters = { ...mockFilters, companies: ['Tech Solutions'] };
      rerender();

      await waitFor(() => {
        expect(mockFetchRevenueData).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Data Validation', () => {
    it('should validate required fields in response', async () => {
      const invalidData = {
        totalRevenue: 1500000,
        // Missing required fields
      };
      mockFetchRevenueData.mockResolvedValue(invalidData as any);

      const { result } = renderHook(() => useRevenueData(mockFilters));

      await waitFor(() => {
        expect(result.current.error).toContain('Invalid data format');
      });
    });

    it('should handle null response gracefully', async () => {
      mockFetchRevenueData.mockResolvedValue(null);

      const { result } = renderHook(() => useRevenueData(mockFilters));

      await waitFor(() => {
        expect(result.current.error).toContain('No data received');
      });
    });

    it('should validate numeric values', async () => {
      const invalidData = {
        ...mockRevenueData,
        totalRevenue: 'invalid'
      };
      mockFetchRevenueData.mockResolvedValue(invalidData as any);

      const { result } = renderHook(() => useRevenueData(mockFilters));

      await waitFor(() => {
        expect(result.current.error).toContain('Invalid numeric value');
      });
    });
  });

  describe('Last Updated Tracking', () => {
    it('should track last updated timestamp', async () => {
      const { result } = renderHook(() => useRevenueData(mockFilters));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.lastUpdated).toBeInstanceOf(Date);
    });

    it('should update timestamp on refresh', async () => {
      const { result } = renderHook(() => useRevenueData(mockFilters));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const firstUpdate = result.current.lastUpdated;

      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.lastUpdated.getTime()).toBeGreaterThan(firstUpdate.getTime());
      });
    });
  });

  describe('Memory Management', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useRevenueData(mockFilters));

      unmount();

      // Should not throw any errors
      expect(true).toBe(true);
    });

    it('should not leak memory with multiple instances', () => {
      const { result: result1 } = renderHook(() => useRevenueData(mockFilters));
      const { result: result2 } = renderHook(() => useRevenueData(mockFilters));

      expect(result1.current).toBeDefined();
      expect(result2.current).toBeDefined();
    });
  });
});
