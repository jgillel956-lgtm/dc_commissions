import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RevenueDashboard from '../../src/components/RevenueDashboard';
import { useRevenueData } from '../../src/hooks/useRevenueData';
import { useDashboardFilters } from '../../src/hooks/useDashboardFilters';

// Mock the hooks
jest.mock('../../src/hooks/useRevenueData');
jest.mock('../../src/hooks/useDashboardFilters');
jest.mock('../../src/services/revenueApi');

const mockUseRevenueData = useRevenueData as jest.MockedFunction<typeof useRevenueData>;
const mockUseDashboardFilters = useDashboardFilters as jest.MockedFunction<typeof useDashboardFilters>;

// Mock data
const mockRevenueData = {
  isLoading: false,
  error: null,
  data: {
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
  }
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

describe('RevenueDashboard', () => {
  beforeEach(() => {
    mockUseRevenueData.mockReturnValue(mockRevenueData);
    mockUseDashboardFilters.mockReturnValue(mockFilters);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the dashboard with correct title', () => {
      render(
        <MemoryRouter>
          <RevenueDashboard />
        </MemoryRouter>
      );

      expect(screen.getByText('Revenue Analytics Dashboard')).toBeInTheDocument();
    });

    it('should render filter panel', () => {
      render(
        <MemoryRouter>
          <RevenueDashboard />
        </MemoryRouter>
      );

      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('should render tab navigation', () => {
      render(
        <MemoryRouter>
          <RevenueDashboard />
        </MemoryRouter>
      );

      expect(screen.getByText('Revenue Analysis')).toBeInTheDocument();
      expect(screen.getByText('Commission Analysis')).toBeInTheDocument();
    });

    it('should render KPI widgets', () => {
      render(
        <MemoryRouter>
          <RevenueDashboard />
        </MemoryRouter>
      );

      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      expect(screen.getByText('Total Transactions')).toBeInTheDocument();
      expect(screen.getByText('Average Transaction Value')).toBeInTheDocument();
      expect(screen.getByText('Revenue Growth')).toBeInTheDocument();
    });

    it('should display revenue values correctly', () => {
      render(
        <MemoryRouter>
          <RevenueDashboard />
        </MemoryRouter>
      );

      expect(screen.getByText('$1,500,000')).toBeInTheDocument();
      expect(screen.getByText('1,250')).toBeInTheDocument();
      expect(screen.getByText('$1,200')).toBeInTheDocument();
      expect(screen.getByText('15%')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner when data is loading', () => {
      mockUseRevenueData.mockReturnValue({
        ...mockRevenueData,
        isLoading: true
      });

      render(
        <MemoryRouter>
          <RevenueDashboard />
        </MemoryRouter>
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should hide loading spinner when data is loaded', () => {
      render(
        <MemoryRouter>
          <RevenueDashboard />
        </MemoryRouter>
      );

      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when data fetch fails', () => {
      mockUseRevenueData.mockReturnValue({
        ...mockRevenueData,
        error: 'Failed to fetch revenue data'
      });

      render(
        <MemoryRouter>
          <RevenueDashboard />
        </MemoryRouter>
      );

      expect(screen.getByText('Failed to fetch revenue data')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should call retry function when retry button is clicked', async () => {
      const mockRetry = jest.fn();
      mockUseRevenueData.mockReturnValue({
        ...mockRevenueData,
        error: 'Failed to fetch revenue data',
        retry: mockRetry
      });

      render(
        <MemoryRouter>
          <RevenueDashboard />
        </MemoryRouter>
      );

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockRetry).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should switch to Commission Analysis tab when clicked', () => {
      render(
        <MemoryRouter>
          <RevenueDashboard />
        </MemoryRouter>
      );

      const commissionTab = screen.getByText('Commission Analysis');
      fireEvent.click(commissionTab);

      expect(screen.getByText('Commission Breakdown')).toBeInTheDocument();
      expect(screen.getByText('Employee Commissions')).toBeInTheDocument();
    });

    it('should maintain active tab state', () => {
      render(
        <MemoryRouter>
          <RevenueDashboard />
        </MemoryRouter>
      );

      const revenueTab = screen.getByText('Revenue Analysis');
      const commissionTab = screen.getByText('Commission Analysis');

      expect(revenueTab).toHaveClass('active');
      expect(commissionTab).not.toHaveClass('active');

      fireEvent.click(commissionTab);

      expect(commissionTab).toHaveClass('active');
      expect(revenueTab).not.toHaveClass('active');
    });
  });

  describe('Filter Integration', () => {
    it('should display active filter count', () => {
      mockUseDashboardFilters.mockReturnValue({
        ...mockFilters,
        activeFilterCount: 3
      });

      render(
        <MemoryRouter>
          <RevenueDashboard />
        </MemoryRouter>
      );

      expect(screen.getByText('3 active filters')).toBeInTheDocument();
    });

    it('should call clear filters when clear button is clicked', () => {
      render(
        <MemoryRouter>
          <RevenueDashboard />
        </MemoryRouter>
      );

      const clearButton = screen.getByText('Clear All');
      fireEvent.click(clearButton);

      expect(mockFilters.clearFilters).toHaveBeenCalledTimes(1);
    });
  });

  describe('Chart Rendering', () => {
    it('should render revenue breakdown pie chart', () => {
      render(
        <MemoryRouter>
          <RevenueDashboard />
        </MemoryRouter>
      );

      expect(screen.getByText('Revenue by Payment Method')).toBeInTheDocument();
      expect(screen.getByText('Credit Card')).toBeInTheDocument();
      expect(screen.getByText('ACH')).toBeInTheDocument();
      expect(screen.getByText('Wire Transfer')).toBeInTheDocument();
    });

    it('should render company performance table', () => {
      render(
        <MemoryRouter>
          <RevenueDashboard />
        </MemoryRouter>
      );

      expect(screen.getByText('Company Performance')).toBeInTheDocument();
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Tech Solutions')).toBeInTheDocument();
      expect(screen.getByText('Global Industries')).toBeInTheDocument();
    });

    it('should render monthly revenue trend chart', () => {
      render(
        <MemoryRouter>
          <RevenueDashboard />
        </MemoryRouter>
      );

      expect(screen.getByText('Monthly Revenue Trend')).toBeInTheDocument();
      expect(screen.getByText('Jan')).toBeInTheDocument();
      expect(screen.getByText('Feb')).toBeInTheDocument();
      expect(screen.getByText('Mar')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should render mobile-friendly layout on small screens', () => {
      // Mock window.innerWidth for mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(
        <MemoryRouter>
          <RevenueDashboard />
        </MemoryRouter>
      );

      const dashboard = screen.getByTestId('revenue-dashboard');
      expect(dashboard).toHaveClass('mobile-layout');
    });

    it('should render desktop layout on large screens', () => {
      // Mock window.innerWidth for desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      render(
        <MemoryRouter>
          <RevenueDashboard />
        </MemoryRouter>
      );

      const dashboard = screen.getByTestId('revenue-dashboard');
      expect(dashboard).toHaveClass('desktop-layout');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <MemoryRouter>
          <RevenueDashboard />
        </MemoryRouter>
      );

      expect(screen.getByLabelText('Revenue Analytics Dashboard')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter panel')).toBeInTheDocument();
      expect(screen.getByLabelText('Tab navigation')).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(
        <MemoryRouter>
          <RevenueDashboard />
        </MemoryRouter>
      );

      const commissionTab = screen.getByText('Commission Analysis');
      commissionTab.focus();
      
      fireEvent.keyDown(commissionTab, { key: 'Enter' });
      
      expect(screen.getByText('Commission Breakdown')).toBeInTheDocument();
    });

    it('should have proper heading hierarchy', () => {
      render(
        <MemoryRouter>
          <RevenueDashboard />
        </MemoryRouter>
      );

      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('Revenue Analytics Dashboard');

      const sectionHeadings = screen.getAllByRole('heading', { level: 2 });
      expect(sectionHeadings.length).toBeGreaterThan(0);
    });
  });

  describe('Data Refresh', () => {
    it('should refresh data when refresh button is clicked', async () => {
      const mockRefresh = jest.fn();
      mockUseRevenueData.mockReturnValue({
        ...mockRevenueData,
        refresh: mockRefresh
      });

      render(
        <MemoryRouter>
          <RevenueDashboard />
        </MemoryRouter>
      );

      const refreshButton = screen.getByLabelText('Refresh data');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalledTimes(1);
      });
    });

    it('should show last updated timestamp', () => {
      const mockLastUpdated = new Date('2024-01-15T10:30:00Z');
      mockUseRevenueData.mockReturnValue({
        ...mockRevenueData,
        lastUpdated: mockLastUpdated
      });

      render(
        <MemoryRouter>
          <RevenueDashboard />
        </MemoryRouter>
      );

      expect(screen.getByText(/Last updated: 1\/15\/2024, 10:30 AM/)).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('should render export button', () => {
      render(
        <MemoryRouter>
          <RevenueDashboard />
        </MemoryRouter>
      );

      expect(screen.getByText('Export Data')).toBeInTheDocument();
    });

    it('should show export options when export button is clicked', () => {
      render(
        <MemoryRouter>
          <RevenueDashboard />
        </MemoryRouter>
      );

      const exportButton = screen.getByText('Export Data');
      fireEvent.click(exportButton);

      expect(screen.getByText('Export as PDF')).toBeInTheDocument();
      expect(screen.getByText('Export as Excel')).toBeInTheDocument();
      expect(screen.getByText('Export as CSV')).toBeInTheDocument();
    });
  });

  describe('Empty State Handling', () => {
    it('should show empty state when no data is available', () => {
      mockUseRevenueData.mockReturnValue({
        ...mockRevenueData,
        data: {
          totalRevenue: 0,
          totalTransactions: 0,
          averageTransactionValue: 0,
          revenueGrowth: 0,
          revenueByCompany: [],
          revenueByPaymentMethod: [],
          monthlyRevenue: []
        }
      });

      render(
        <MemoryRouter>
          <RevenueDashboard />
        </MemoryRouter>
      );

      expect(screen.getByText('No revenue data available')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your filters or date range')).toBeInTheDocument();
    });
  });
});
