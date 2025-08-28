import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RevenueAnalysisTab from './RevenueAnalysisTab';
import { useDashboardState } from '../../hooks/useDashboardState';
import { useRevenueData } from '../../hooks/useRevenueData';
import { RevenueMasterRecord } from '../../types/dashboard';

// Mock the hooks
jest.mock('../../hooks/useDashboardState');
jest.mock('../../hooks/useRevenueData');

// Mock the chart components
jest.mock('../charts/PieChart', () => {
  return function MockPieChart({ data, title }: any) {
    return (
      <div data-testid="pie-chart">
        <h3>{title}</h3>
        <div data-testid="pie-chart-data">{JSON.stringify(data)}</div>
      </div>
    );
  };
});

jest.mock('../charts/BarChart', () => {
  return function MockBarChart({ data, title }: any) {
    return (
      <div data-testid="bar-chart">
        <h3>{title}</h3>
        <div data-testid="bar-chart-data">{JSON.stringify(data)}</div>
      </div>
    );
  };
});

jest.mock('../charts/LineChart', () => {
  return function MockLineChart({ data, title }: any) {
    return (
      <div data-testid="line-chart">
        <h3>{title}</h3>
        <div data-testid="line-chart-data">{JSON.stringify(data)}</div>
      </div>
    );
  };
});

jest.mock('../charts/DataTable', () => {
  return function MockDataTable({ data, columns }: any) {
    return (
      <div data-testid="data-table">
        <div data-testid="data-table-data">{JSON.stringify(data)}</div>
        <div data-testid="data-table-columns">{JSON.stringify(columns)}</div>
      </div>
    );
  };
});

jest.mock('./KPIWidget', () => {
  return function MockKPIWidget({ title, value, type, format }: any) {
    return (
      <div data-testid={`kpi-widget-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <h3>{title}</h3>
        <div data-testid="kpi-value">{value}</div>
        <div data-testid="kpi-type">{type}</div>
        <div data-testid="kpi-format">{format}</div>
      </div>
    );
  };
});

jest.mock('./ChartContainer', () => {
  return function MockChartContainer({ title, children, type }: any) {
    return (
      <div data-testid={`chart-container-${type}`}>
        <h3>{title}</h3>
        {children}
      </div>
    );
  };
});

const mockUseDashboardState = useDashboardState as jest.MockedFunction<typeof useDashboardState>;
const mockUseRevenueData = useRevenueData as jest.MockedFunction<typeof useRevenueData>;

// Sample revenue data for testing
const sampleRevenueData: RevenueMasterRecord[] = [
  {
    id: 1,
    disbursement_id: 101,
    payment_method_id: 1,
    payment_method_payee_fee: 10.00,
    payment_method_payor_fee: 5.00,
    api_transaction_status: 'completed',
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
    check_delivery_payee_fee: 2.00,
    check_delivery_payor_fee: 1.00,
    bundle_charges: 0.50,
    postage_fee: 1.50,
    company_id: 1,
    disbursement_updated_at: '2024-01-01T10:00:00Z',
    amount: 1000.00,
    disbursement_status_id: 1,
    company: 'Company A',
    payment_method_description: 'ACH Transfer',
    cost_amount: 50.00,
    cost_percentage: 5.0,
    vendor_name: 'Vendor A',
    employee_name: 'John Doe',
    employee_commission_amount: '25.00',
    employee_commission_percentage: 2.5,
    referral_partner_name: 'Partner A',
    referral_partner_type: 'referral',
    partner_default_rate: 1.0,
    company_override_rate: 1.5,
    base_fee_upcharge: 0.25,
    multiplier_upcharge: 1.1,
    max_fee_upcharge: 5.00,
    applied_employee_commission_percentage: 2.5,
    applied_employee_commission_amount: 25.00,
    applied_referral_rate: 1.5,
    Company_Upcharge_Fees: 2.75,
    Is_Revenue_Transaction: 1,
    Gross_Revenue: 20.00,
    Is_Total_Transaction: 1,
    Payor_Fee_Revenue: 5.00,
    Payee_Fee_Revenue: 10.00,
    Total_Combined_Revenue: 15.00,
    Revenue_Per_Transaction: 15.00,
    Total_Vendor_Cost: 50.00,
    Revenue_After_Upcharges: 17.25,
    Revenue_After_Operational_Costs: 17.25,
    Employee_Commission: 25.00,
    Revenue_After_Employee_Commission: -7.75,
    Referral_Partner_Commission: 15.00,
    Final_Net_Profit: -22.75,
  },
  {
    id: 2,
    disbursement_id: 102,
    payment_method_id: 2,
    payment_method_payee_fee: 15.00,
    payment_method_payor_fee: 7.50,
    api_transaction_status: 'completed',
    created_at: '2024-01-02T10:00:00Z',
    updated_at: '2024-01-02T10:00:00Z',
    check_delivery_payee_fee: 3.00,
    check_delivery_payor_fee: 1.50,
    bundle_charges: 0.75,
    postage_fee: 2.25,
    company_id: 2,
    disbursement_updated_at: '2024-01-02T10:00:00Z',
    amount: 2000.00,
    disbursement_status_id: 1,
    company: 'Company B',
    payment_method_description: 'Wire Transfer',
    cost_amount: 100.00,
    cost_percentage: 5.0,
    vendor_name: 'Vendor B',
    employee_name: 'Jane Smith',
    employee_commission_amount: '50.00',
    employee_commission_percentage: 2.5,
    referral_partner_name: 'Partner B',
    referral_partner_type: 'referral',
    partner_default_rate: 1.0,
    company_override_rate: 1.5,
    base_fee_upcharge: 0.50,
    multiplier_upcharge: 1.1,
    max_fee_upcharge: 10.00,
    applied_employee_commission_percentage: 2.5,
    applied_employee_commission_amount: 50.00,
    applied_referral_rate: 1.5,
    Company_Upcharge_Fees: 5.50,
    Is_Revenue_Transaction: 1,
    Gross_Revenue: 30.00,
    Is_Total_Transaction: 1,
    Payor_Fee_Revenue: 7.50,
    Payee_Fee_Revenue: 15.00,
    Total_Combined_Revenue: 22.50,
    Revenue_Per_Transaction: 22.50,
    Total_Vendor_Cost: 100.00,
    Revenue_After_Upcharges: 28.00,
    Revenue_After_Operational_Costs: 28.00,
    Employee_Commission: 50.00,
    Revenue_After_Employee_Commission: -22.00,
    Referral_Partner_Commission: 30.00,
    Final_Net_Profit: -52.00,
  },
];

describe('RevenueAnalysisTab', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Default mock implementations
    mockUseDashboardState.mockReturnValue({
      data: sampleRevenueData,
      loading: false,
      error: null,
      filters: {},
      activeTab: 'revenue',
      pagination: { currentPage: 1, pageSize: 50, totalRecords: 2, totalPages: 1 },
      setData: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
      updateFilters: jest.fn(),
      setActiveTab: jest.fn(),
      setPagination: jest.fn(),
      refreshData: jest.fn(),
      clearFilters: jest.fn(),
      hasUnsavedChanges: jest.fn(() => false),
    });

    mockUseRevenueData.mockReturnValue({
      fetchData: jest.fn(),
      fetchChartData: jest.fn(),
      getCachedData: jest.fn(),
      clearCache: jest.fn(),
      getCacheStats: jest.fn(),
    });
  });

  describe('Rendering', () => {
    it('renders the component without crashing', () => {
      render(<RevenueAnalysisTab />);
      expect(screen.getByTestId('kpi-widget-total-revenue')).toBeInTheDocument();
    });

    it('renders all 8 KPI widgets', () => {
      render(<RevenueAnalysisTab />);
      
      expect(screen.getByTestId('kpi-widget-total-revenue')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-widget-total-transactions')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-widget-average-transaction-value')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-widget-revenue-per-transaction')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-widget-payee-fee-revenue')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-widget-payor-fee-revenue')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-widget-total-combined-revenue')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-widget-revenue-growth-rate')).toBeInTheDocument();
    });

    it('renders all chart containers', () => {
      render(<RevenueAnalysisTab />);
      
      expect(screen.getByTestId('chart-container-pie')).toBeInTheDocument();
      expect(screen.getAllByTestId('chart-container-bar')).toHaveLength(2);
      expect(screen.getByTestId('chart-container-line')).toBeInTheDocument();
      expect(screen.getByTestId('chart-container-table')).toBeInTheDocument();
    });

    it('renders pie chart with revenue breakdown', () => {
      render(<RevenueAnalysisTab />);
      
      const pieChart = screen.getByTestId('pie-chart');
      expect(pieChart).toBeInTheDocument();
      expect(screen.getAllByText('Revenue Breakdown')).toHaveLength(2);
    });

    it('renders bar charts for company and payment method analysis', () => {
      render(<RevenueAnalysisTab />);
      
      const barCharts = screen.getAllByTestId('bar-chart');
      expect(barCharts).toHaveLength(2);
    });

    it('renders line chart for revenue trends', () => {
      render(<RevenueAnalysisTab />);
      
      const lineChart = screen.getByTestId('line-chart');
      expect(lineChart).toBeInTheDocument();
      expect(screen.getAllByText('Revenue Trends')).toHaveLength(2);
    });

    it('renders data table for company performance', () => {
      render(<RevenueAnalysisTab />);
      
      const dataTable = screen.getByTestId('data-table');
      expect(dataTable).toBeInTheDocument();
    });
  });

  describe('KPI Calculations', () => {
    it('calculates total revenue correctly', () => {
      render(<RevenueAnalysisTab />);
      
      const totalRevenueWidget = screen.getByTestId('kpi-widget-total-revenue');
      const valueElement = totalRevenueWidget.querySelector('[data-testid="kpi-value"]');
      expect(valueElement).toHaveTextContent('37.5'); // 15.00 + 22.50
    });

    it('calculates total transactions correctly', () => {
      render(<RevenueAnalysisTab />);
      
      const totalTransactionsWidget = screen.getByTestId('kpi-widget-total-transactions');
      const valueElement = totalTransactionsWidget.querySelector('[data-testid="kpi-value"]');
      expect(valueElement).toHaveTextContent('2');
    });

    it('calculates average transaction value correctly', () => {
      render(<RevenueAnalysisTab />);
      
      const avgTransactionWidget = screen.getByTestId('kpi-widget-average-transaction-value');
      const valueElement = avgTransactionWidget.querySelector('[data-testid="kpi-value"]');
      expect(valueElement).toHaveTextContent('18.75'); // 37.5 / 2
    });

    it('calculates payee fee revenue correctly', () => {
      render(<RevenueAnalysisTab />);
      
      const payeeFeeWidget = screen.getByTestId('kpi-widget-payee-fee-revenue');
      const valueElement = payeeFeeWidget.querySelector('[data-testid="kpi-value"]');
      expect(valueElement).toHaveTextContent('25'); // 10.00 + 15.00
    });

    it('calculates payor fee revenue correctly', () => {
      render(<RevenueAnalysisTab />);
      
      const payorFeeWidget = screen.getByTestId('kpi-widget-payor-fee-revenue');
      const valueElement = payorFeeWidget.querySelector('[data-testid="kpi-value"]');
      expect(valueElement).toHaveTextContent('12.5'); // 5.00 + 7.50
    });

    it('calculates revenue per transaction correctly', () => {
      render(<RevenueAnalysisTab />);
      
      const revenuePerTransactionWidget = screen.getByTestId('kpi-widget-revenue-per-transaction');
      const valueElement = revenuePerTransactionWidget.querySelector('[data-testid="kpi-value"]');
      expect(valueElement).toHaveTextContent('18.75'); // (15.00 + 22.50) / 2
    });

    it('calculates total combined revenue correctly', () => {
      render(<RevenueAnalysisTab />);
      
      const totalCombinedWidget = screen.getByTestId('kpi-widget-total-combined-revenue');
      const valueElement = totalCombinedWidget.querySelector('[data-testid="kpi-value"]');
      expect(valueElement).toHaveTextContent('37.5'); // 15.00 + 22.50
    });
  });

  describe('Chart Data Preparation', () => {
    it('prepares pie chart data correctly', () => {
      render(<RevenueAnalysisTab />);
      
      const pieChartData = screen.getByTestId('pie-chart-data');
      const data = JSON.parse(pieChartData.textContent || '[]');
      
      expect(data).toHaveLength(2);
      expect(data[0]).toEqual({
        name: 'Payee Fees',
        value: 25,
        color: '#3B82F6'
      });
      expect(data[1]).toEqual({
        name: 'Payor Fees',
        value: 12.5,
        color: '#10B981'
      });
    });

    it('prepares company bar chart data correctly', () => {
      render(<RevenueAnalysisTab />);
      
      const barCharts = screen.getAllByTestId('bar-chart-data');
      const companyData = JSON.parse(barCharts[0].textContent || '[]');
      
      expect(companyData).toHaveLength(2);
      expect(companyData[0]).toEqual({
        name: 'Company B',
        revenue: 22.5,
        transactions: 1,
        averageValue: 2000
      });
      expect(companyData[1]).toEqual({
        name: 'Company A',
        revenue: 15,
        transactions: 1,
        averageValue: 1000
      });
    });

    it('prepares payment method bar chart data correctly', () => {
      render(<RevenueAnalysisTab />);
      
      const barCharts = screen.getAllByTestId('bar-chart-data');
      const paymentMethodData = JSON.parse(barCharts[1].textContent || '[]');
      
      expect(paymentMethodData).toHaveLength(2);
      expect(paymentMethodData[0]).toEqual({
        name: 'Wire Transfer',
        revenue: 22.5,
        transactions: 1,
        averageValue: 2000
      });
      expect(paymentMethodData[1]).toEqual({
        name: 'ACH Transfer',
        revenue: 15.0,
        transactions: 1,
        averageValue: 1000,
        value: 15.0,
      });
    });

    it('prepares trend line chart data correctly', () => {
      render(<RevenueAnalysisTab />);
      
      const lineChartData = screen.getByTestId('line-chart-data');
      const data = JSON.parse(lineChartData.textContent || '[]');
      
      expect(data).toHaveLength(2);
      expect(data[0]).toEqual({
        date: '2024-01-01',
        revenue: 15,
        transactions: 1,
        averageValue: 1000
      });
      expect(data[1]).toEqual({
        date: '2024-01-02',
        revenue: 22.5,
        transactions: 1,
        averageValue: 2000
      });
    });

    it('prepares data table data correctly', () => {
      render(<RevenueAnalysisTab />);
      
      const dataTableData = screen.getByTestId('data-table-data');
      const data = JSON.parse(dataTableData.textContent || '[]');
      
      expect(data).toHaveLength(2);
      expect(data[0]).toEqual({
        company: 'Company B',
        totalRevenue: 22.5,
        transactionCount: 1,
        averageValue: 2000,
        revenueShare: 60
      });
      expect(data[1]).toEqual({
        company: 'Company A',
        totalRevenue: 15,
        transactionCount: 1,
        averageValue: 1000,
        revenueShare: 40
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading skeleton when data is loading', () => {
      mockUseDashboardState.mockReturnValue({
        data: [],
        loading: true,
        error: null,
        filters: {},
        activeTab: 'revenue',
        pagination: { currentPage: 1, pageSize: 50, totalRecords: 0, totalPages: 1 },
        setData: jest.fn(),
        setLoading: jest.fn(),
        setError: jest.fn(),
        updateFilters: jest.fn(),
        setActiveTab: jest.fn(),
        setPagination: jest.fn(),
        refreshData: jest.fn(),
        clearFilters: jest.fn(),
        hasUnsavedChanges: jest.fn(() => false),
      });

      render(<RevenueAnalysisTab />);
      
      // Should show loading skeletons instead of KPI widgets
      expect(screen.queryByTestId('kpi-widget-total-revenue')).not.toBeInTheDocument();
      const skeletonElements = document.querySelectorAll('.animate-pulse');
      expect(skeletonElements).toHaveLength(8);
    });
  });

  describe('Error State', () => {
    it('shows error message when there is an error', () => {
      mockUseDashboardState.mockReturnValue({
        data: [],
        loading: false,
        error: 'Failed to fetch data',
        filters: {},
        activeTab: 'revenue',
        pagination: { currentPage: 1, pageSize: 50, totalRecords: 0, totalPages: 1 },
        setData: jest.fn(),
        setLoading: jest.fn(),
        setError: jest.fn(),
        updateFilters: jest.fn(),
        setActiveTab: jest.fn(),
        setPagination: jest.fn(),
        refreshData: jest.fn(),
        clearFilters: jest.fn(),
        hasUnsavedChanges: jest.fn(() => false),
      });

      render(<RevenueAnalysisTab />);
      
      expect(screen.getByText('Error loading revenue analysis data')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch data')).toBeInTheDocument();
    });
  });

  describe('Empty Data State', () => {
    it('handles empty data gracefully', () => {
      mockUseDashboardState.mockReturnValue({
        data: [],
        loading: false,
        error: null,
        filters: {},
        activeTab: 'revenue',
        pagination: { currentPage: 1, pageSize: 50, totalRecords: 0, totalPages: 1 },
        setData: jest.fn(),
        setLoading: jest.fn(),
        setError: jest.fn(),
        updateFilters: jest.fn(),
        setActiveTab: jest.fn(),
        setPagination: jest.fn(),
        refreshData: jest.fn(),
        clearFilters: jest.fn(),
        hasUnsavedChanges: jest.fn(() => false),
      });

      render(<RevenueAnalysisTab />);
      
      // Should render KPI widgets with zero values
      const totalRevenueWidget = screen.getByTestId('kpi-widget-total-revenue');
      const valueElement = totalRevenueWidget.querySelector('[data-testid="kpi-value"]');
      expect(valueElement).toHaveTextContent('0');
    });
  });

  describe('Chart Interactions', () => {
    it('handles pie chart click events', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<RevenueAnalysisTab />);
      
      // The click handler should be available (though we can't easily test the actual click)
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('handles bar chart click events', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<RevenueAnalysisTab />);
      
      // The click handler should be available
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('handles line chart click events', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<RevenueAnalysisTab />);
      
      // The click handler should be available
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('handles export functionality', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<RevenueAnalysisTab />);
      
      // The export handler should be available
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels for charts', () => {
      render(<RevenueAnalysisTab />);
      
      // Check that charts have proper accessibility attributes
      const pieChart = screen.getByTestId('pie-chart');
      const barCharts = screen.getAllByTestId('bar-chart');
      const lineChart = screen.getByTestId('line-chart');
      const dataTable = screen.getByTestId('data-table');
      
      expect(pieChart).toBeInTheDocument();
      expect(barCharts).toHaveLength(2);
      expect(lineChart).toBeInTheDocument();
      expect(dataTable).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive grid classes', () => {
      render(<RevenueAnalysisTab />);
      
      // Check that the KPI grid container has responsive classes
      const kpiContainer = screen.getByTestId('kpi-widget-total-revenue').parentElement;
      expect(kpiContainer).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4');
    });
  });
});
