import { renderHook, act, waitFor } from '@testing-library/react';
import { useRevenueData } from '../../src/hooks/useRevenueData';
import { fetchRevenueData } from '../../src/services/revenueApi';
import { DashboardFilters } from '../../src/types/dashboard';
import { useState, useEffect } from 'react';
import { render } from '@testing-library/react';
import React from 'react';

// Mock the API service
jest.mock('../../src/services/revenueApi', () => ({
  fetchRevenueData: jest.fn()
}));
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

const mockFilters: DashboardFilters = {
  date_range: { type: 'last_30_days' },
  companies: { selected_companies: [1] },
  payment_methods: { selected_methods: [1] },
  revenue_sources: { 
    transaction_fees: true, 
    payor_fees: false, 
    interest_revenue: false 
  },
  commission_types: { 
    employee_commissions: true, 
    referral_partner_commissions: false, 
    interest_commissions: false 
  },
  amount_range: { min_amount: 0, max_amount: 100000 },
  disbursement_status: [],
  employees: { selected_employees: [] },
  referral_partners: { selected_partners: [] }
};

describe('useRevenueData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchRevenueData.mockResolvedValue(mockRevenueData);
  });

  describe('Caching', () => {
    it('should refetch when filters change', async () => {
      // Create a test component that manages filter state
      const TestComponent = () => {
        const [filters, setFilters] = useState(mockFilters);
        const result = useRevenueData(filters);
        
        // Change filters after initial render
        useEffect(() => {
          const timer = setTimeout(() => {
            const newFilters = { ...mockFilters, companies: { selected_companies: [2] } };
            setFilters(newFilters);
          }, 100);
          
          return () => clearTimeout(timer);
        }, []);
        
        return null;
      };

      render(React.createElement(TestComponent));

      // Wait for initial fetch
      await waitFor(() => {
        expect(mockFetchRevenueData).toHaveBeenCalledWith(mockFilters);
      });

      // Wait for filter change and second fetch
      await waitFor(() => {
        expect(mockFetchRevenueData).toHaveBeenCalledTimes(2);
        expect(mockFetchRevenueData).toHaveBeenLastCalledWith({ 
          ...mockFilters, 
          companies: { selected_companies: [2] } 
        });
      });
    });
  });
});
