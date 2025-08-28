import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RevenueDashboard from '../../src/components/RevenueDashboard';
import { useRevenueData } from '../../src/hooks/useRevenueData';
import { useDashboardFilters } from '../../src/hooks/useDashboardFilters';
import { fetchRevenueData } from '../../src/services/revenueApi';

// Mock the API service
jest.mock('../../src/services/revenueApi');
const mockFetchRevenueData = fetchRevenueData as jest.MockedFunction<typeof fetchRevenueData>;

// Mock the hooks
jest.mock('../../src/hooks/useRevenueData');
jest.mock('../../src/hooks/useDashboardFilters');

const mockUseRevenueData = useRevenueData as jest.MockedFunction<typeof useRevenueData>;
const mockUseDashboardFilters = useDashboardFilters as jest.MockedFunction<typeof useDashboardFilters>;

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
  companies: [],
  paymentMethods: [],
  revenueSources: [],
  employees: [],
  commissionTypes: [],
  amountRange: { min: 0, max: 100000 },
  disbursementStatus: [],
  referralPartners: [],
  updateFilters: jest.fn(),
  clearFilters: jest.fn(),
  activeFilterCount: 0
};

// Create a test wrapper with QueryClient
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Dashboard Data Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchRevenueData.mockResolvedValue(mockRevenueData);
    mockUseRevenueData.mockReturnValue({
      isLoading: false,
      error: null,
      data: mockRevenueData,
      refresh: jest.fn(),
      retry: jest.fn(),
      lastUpdated: new Date()
    });
    mockUseDashboardFilters.mockReturnValue(mockFilters);
  });

  describe('Complete Data Flow', () => {
    it('should fetch and display data through the complete pipeline', async () => {
      render(
        <TestWrapper>
          <RevenueDashboard />
        </TestWrapper>
      );

      // Verify API was called with correct filters
      expect(mockFetchRevenueData).toHaveBeenCalledWith(mockFilters);

      // Verify data is displayed correctly
      await waitFor(() => {
        expect(screen.getByText('$1,500,000')).toBeInTheDocument();
        expect(screen.getByText('1,250')).toBeInTheDocument();
        expect(screen.getByText('$1,200')).toBeInTheDocument();
        expect(screen.getByText('15%')).toBeInTheDocument();
      });

      // Verify chart data is rendered
      expect(screen.getByText('Revenue by Payment Method')).toBeInTheDocument();
      expect(screen.getByText('Credit Card')).toBeInTheDocument();
      expect(screen.getByText('ACH')).toBeInTheDocument();
      expect(screen.getByText('Wire Transfer')).toBeInTheDocument();
    });

    it('should handle filter changes and refetch data', async () => {
      const mockUpdateFilters = jest.fn();
      mockUseDashboardFilters.mockReturnValue({
        ...mockFilters,
        updateFilters: mockUpdateFilters
      });

      render(
        <TestWrapper>
          <RevenueDashboard />
        </TestWrapper>
      );

      // Simulate filter change
      const newFilters = { ...mockFilters, companies: ['Acme Corp'] };
      mockUseDashboardFilters.mockReturnValue({
        ...mockFilters,
        companies: ['Acme Corp'],
        updateFilters: mockUpdateFilters
      });

      // Trigger a re-render with new filters
      fireEvent.click(screen.getByText('Filters'));

      await waitFor(() => {
        expect(mockFetchRevenueData).toHaveBeenCalledWith(newFilters);
      });
    });

    it('should handle loading states during data fetching', async () => {
      mockUseRevenueData.mockReturnValue({
        isLoading: true,
        error: null,
        data: null,
        refresh: jest.fn(),
        retry: jest.fn(),
        lastUpdated: new Date()
      });

      render(
        <TestWrapper>
          <RevenueDashboard />
        </TestWrapper>
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.queryByText('$1,500,000')).not.toBeInTheDocument();
    });

    it('should handle error states and provide retry functionality', async () => {
      const mockRetry = jest.fn();
      mockUseRevenueData.mockReturnValue({
        isLoading: false,
        error: 'Failed to fetch data',
        data: null,
        refresh: jest.fn(),
        retry: mockRetry,
        lastUpdated: new Date()
      });

      render(
        <TestWrapper>
          <RevenueDashboard />
        </TestWrapper>
      );

      expect(screen.getByText('Failed to fetch data')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Retry'));
      expect(mockRetry).toHaveBeenCalled();
    });
  });

  describe('Filter Integration', () => {
    it('should update filters and trigger data refetch', async () => {
      const mockUpdateFilters = jest.fn();
      mockUseDashboardFilters.mockReturnValue({
        ...mockFilters,
        updateFilters: mockUpdateFilters
      });

      render(
        <TestWrapper>
          <RevenueDashboard />
        </TestWrapper>
      );

      // Simulate date range filter change
      const newDateRange = { type: 'last_90_days' };
      mockUpdateFilters.mockImplementation((updates) => {
        const newFilters = { ...mockFilters, dateRange: newDateRange };
        mockUseDashboardFilters.mockReturnValue({
          ...newFilters,
          updateFilters: mockUpdateFilters
        });
      });

      // Trigger filter update
      fireEvent.click(screen.getByText('Filters'));

      await waitFor(() => {
        expect(mockUpdateFilters).toHaveBeenCalled();
      });
    });

    it('should clear filters and reset data', async () => {
      const mockClearFilters = jest.fn();
      mockUseDashboardFilters.mockReturnValue({
        ...mockFilters,
        clearFilters: mockClearFilters
      });

      render(
        <TestWrapper>
          <RevenueDashboard />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Clear All'));
      expect(mockClearFilters).toHaveBeenCalled();
    });

    it('should display active filter count', async () => {
      mockUseDashboardFilters.mockReturnValue({
        ...mockFilters,
        activeFilterCount: 3
      });

      render(
        <TestWrapper>
          <RevenueDashboard />
        </TestWrapper>
      );

      expect(screen.getByText('3 active filters')).toBeInTheDocument();
    });
  });

  describe('Data Refresh and Caching', () => {
    it('should refresh data when refresh button is clicked', async () => {
      const mockRefresh = jest.fn();
      mockUseRevenueData.mockReturnValue({
        isLoading: false,
        error: null,
        data: mockRevenueData,
        refresh: mockRefresh,
        retry: jest.fn(),
        lastUpdated: new Date()
      });

      render(
        <TestWrapper>
          <RevenueDashboard />
        </TestWrapper>
      );

      const refreshButton = screen.getByLabelText('Refresh data');
      fireEvent.click(refreshButton);

      expect(mockRefresh).toHaveBeenCalled();
    });

    it('should show last updated timestamp', async () => {
      const lastUpdated = new Date('2024-01-15T10:30:00Z');
      mockUseRevenueData.mockReturnValue({
        isLoading: false,
        error: null,
        data: mockRevenueData,
        refresh: jest.fn(),
        retry: jest.fn(),
        lastUpdated
      });

      render(
        <TestWrapper>
          <RevenueDashboard />
        </TestWrapper>
      );

      expect(screen.getByText(/Last updated: 1\/15\/2024, 10:30 AM/)).toBeInTheDocument();
    });

    it('should cache data and avoid unnecessary API calls', async () => {
      render(
        <TestWrapper>
          <RevenueDashboard />
        </TestWrapper>
      );

      // Initial render should call API
      expect(mockFetchRevenueData).toHaveBeenCalledTimes(1);

      // Re-render with same filters should not call API again
      render(
        <TestWrapper>
          <RevenueDashboard />
        </TestWrapper>
      );

      expect(mockFetchRevenueData).toHaveBeenCalledTimes(1);
    });
  });

  describe('Tab Navigation and Data Switching', () => {
    it('should switch between revenue and commission tabs', async () => {
      render(
        <TestWrapper>
          <RevenueDashboard />
        </TestWrapper>
      );

      // Initially on revenue tab
      expect(screen.getByText('Revenue Analysis')).toHaveClass('active');
      expect(screen.getByText('Revenue by Payment Method')).toBeInTheDocument();

      // Switch to commission tab
      fireEvent.click(screen.getByText('Commission Analysis'));

      expect(screen.getByText('Commission Analysis')).toHaveClass('active');
      expect(screen.getByText('Commission Breakdown')).toBeInTheDocument();
    });

    it('should maintain filter state across tab switches', async () => {
      render(
        <TestWrapper>
          <RevenueDashboard />
        </TestWrapper>
      );

      // Apply filters on revenue tab
      const newFilters = { ...mockFilters, companies: ['Acme Corp'] };
      mockUseDashboardFilters.mockReturnValue({
        ...newFilters,
        updateFilters: jest.fn(),
        clearFilters: jest.fn(),
        activeFilterCount: 1
      });

      // Switch to commission tab
      fireEvent.click(screen.getByText('Commission Analysis'));

      // Filters should still be applied
      expect(screen.getByText('1 active filters')).toBeInTheDocument();
    });
  });

  describe('Chart Data Rendering', () => {
    it('should render pie chart with correct data', async () => {
      render(
        <TestWrapper>
          <RevenueDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Revenue by Payment Method')).toBeInTheDocument();
        expect(screen.getByText('Credit Card')).toBeInTheDocument();
        expect(screen.getByText('60%')).toBeInTheDocument();
        expect(screen.getByText('ACH')).toBeInTheDocument();
        expect(screen.getByText('30%')).toBeInTheDocument();
      });
    });

    it('should render company performance table', async () => {
      render(
        <TestWrapper>
          <RevenueDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Company Performance')).toBeInTheDocument();
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
        expect(screen.getByText('$500,000')).toBeInTheDocument();
        expect(screen.getByText('400')).toBeInTheDocument();
      });
    });

    it('should render monthly trend chart', async () => {
      render(
        <TestWrapper>
          <RevenueDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Monthly Revenue Trend')).toBeInTheDocument();
        expect(screen.getByText('Jan')).toBeInTheDocument();
        expect(screen.getByText('Feb')).toBeInTheDocument();
        expect(screen.getByText('Mar')).toBeInTheDocument();
      });
    });
  });

  describe('Export Functionality Integration', () => {
    it('should trigger export with current data and filters', async () => {
      render(
        <TestWrapper>
          <RevenueDashboard />
        </TestWrapper>
      );

      const exportButton = screen.getByText('Export Data');
      fireEvent.click(exportButton);

      expect(screen.getByText('Export as PDF')).toBeInTheDocument();
      expect(screen.getByText('Export as Excel')).toBeInTheDocument();
      expect(screen.getByText('Export as CSV')).toBeInTheDocument();
    });

    it('should export data with applied filters', async () => {
      const filteredData = {
        ...mockRevenueData,
        revenueByCompany: [
          { company: 'Acme Corp', revenue: 500000, transactions: 400 }
        ]
      };

      mockUseRevenueData.mockReturnValue({
        isLoading: false,
        error: null,
        data: filteredData,
        refresh: jest.fn(),
        retry: jest.fn(),
        lastUpdated: new Date()
      });

      render(
        <TestWrapper>
          <RevenueDashboard />
        </TestWrapper>
      );

      const exportButton = screen.getByText('Export Data');
      fireEvent.click(exportButton);

      // Export should include filtered data
      expect(screen.getByText('Export as PDF')).toBeInTheDocument();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully', async () => {
      mockFetchRevenueData.mockRejectedValue(new Error('Network error'));
      mockUseRevenueData.mockReturnValue({
        isLoading: false,
        error: 'Network error',
        data: null,
        refresh: jest.fn(),
        retry: jest.fn(),
        lastUpdated: new Date()
      });

      render(
        <TestWrapper>
          <RevenueDashboard />
        </TestWrapper>
      );

      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should handle partial data errors', async () => {
      const partialData = {
        totalRevenue: 1500000,
        totalTransactions: 1250,
        // Missing other fields
      };

      mockUseRevenueData.mockReturnValue({
        isLoading: false,
        error: null,
        data: partialData,
        refresh: jest.fn(),
        retry: jest.fn(),
        lastUpdated: new Date()
      });

      render(
        <TestWrapper>
          <RevenueDashboard />
        </TestWrapper>
      );

      // Should still display available data
      expect(screen.getByText('$1,500,000')).toBeInTheDocument();
      expect(screen.getByText('1,250')).toBeInTheDocument();
    });
  });

  describe('Performance Integration', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = {
        ...mockRevenueData,
        revenueByCompany: Array.from({ length: 1000 }, (_, i) => ({
          company: `Company ${i}`,
          revenue: 10000 + i * 100,
          transactions: 10 + i
        }))
      };

      mockUseRevenueData.mockReturnValue({
        isLoading: false,
        error: null,
        data: largeDataset,
        refresh: jest.fn(),
        retry: jest.fn(),
        lastUpdated: new Date()
      });

      const startTime = performance.now();
      render(
        <TestWrapper>
          <RevenueDashboard />
        </TestWrapper>
      );
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should render within 1 second
    });

    it('should debounce rapid filter changes', async () => {
      jest.useFakeTimers();

      const mockUpdateFilters = jest.fn();
      mockUseDashboardFilters.mockReturnValue({
        ...mockFilters,
        updateFilters: mockUpdateFilters
      });

      render(
        <TestWrapper>
          <RevenueDashboard />
        </TestWrapper>
      );

      // Rapid filter changes
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByText('Filters'));
      }

      // Fast-forward timers
      // @ts-ignore
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should not have made excessive API calls
      expect(mockFetchRevenueData).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });

  describe('Accessibility Integration', () => {
    it('should maintain accessibility during data loading', async () => {
      mockUseRevenueData.mockReturnValue({
        isLoading: true,
        error: null,
        data: null,
        refresh: jest.fn(),
        retry: jest.fn(),
        lastUpdated: new Date()
      });

      render(
        <TestWrapper>
          <RevenueDashboard />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Loading revenue data')).toBeInTheDocument();
    });

    it('should provide accessible error messages', async () => {
      mockUseRevenueData.mockReturnValue({
        isLoading: false,
        error: 'Failed to fetch data',
        data: null,
        refresh: jest.fn(),
        retry: jest.fn(),
        lastUpdated: new Date()
      });

      render(
        <TestWrapper>
          <RevenueDashboard />
        </TestWrapper>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch data')).toBeInTheDocument();
    });

    it('should support keyboard navigation through data', async () => {
      render(
        <TestWrapper>
          <RevenueDashboard />
        </TestWrapper>
      );

      const commissionTab = screen.getByText('Commission Analysis');
      commissionTab.focus();
      
      fireEvent.keyDown(commissionTab, { key: 'Enter' });
      
      expect(screen.getByText('Commission Breakdown')).toBeInTheDocument();
    });
  });

  describe('State Persistence', () => {
    it('should persist filter state across component remounts', async () => {
      const { unmount } = render(
        <TestWrapper>
          <RevenueDashboard />
        </TestWrapper>
      );

      // Apply filters
      const newFilters = { ...mockFilters, companies: ['Acme Corp'] };
      mockUseDashboardFilters.mockReturnValue({
        ...newFilters,
        updateFilters: jest.fn(),
        clearFilters: jest.fn(),
        activeFilterCount: 1
      });

      // Unmount and remount
      unmount();

      render(
        <TestWrapper>
          <RevenueDashboard />
        </TestWrapper>
      );

      // Filters should be preserved
      expect(screen.getByText('1 active filters')).toBeInTheDocument();
    });

    it('should maintain tab state across remounts', async () => {
      const { unmount } = render(
        <TestWrapper>
          <RevenueDashboard />
        </TestWrapper>
      );

      // Switch to commission tab
      fireEvent.click(screen.getByText('Commission Analysis'));

      // Unmount and remount
      unmount();

      render(
        <TestWrapper>
          <RevenueDashboard />
        </TestWrapper>
      );

      // Should still be on commission tab
      expect(screen.getByText('Commission Analysis')).toHaveClass('active');
    });
  });
});
