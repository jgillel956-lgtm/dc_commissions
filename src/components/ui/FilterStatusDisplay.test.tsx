import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FilterStatusDisplay from './FilterStatusDisplay';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { DashboardFilters } from '../../types/dashboard';

// Mock the useDashboardFilters hook
jest.mock('../../hooks/useDashboardFilters');

const mockUseDashboardFilters = require('../../hooks/useDashboardFilters').useDashboardFilters;

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  );
};

describe('FilterStatusDisplay', () => {
  const mockFilters: DashboardFilters = {
    date_range: { type: 'last_30_days' },
    companies: { selected_companies: [] },
    payment_methods: { selected_methods: [] },
    revenue_sources: { selected_sources: [] },
    commission_types: { selected_types: [] },
    amount_range: {},
    disbursement_status: [],
    employees: { selected_employees: [] },
    referral_partners: { selected_partners: [] }
  };

  const mockActiveFilters = [
    { key: 'date_range', label: 'Date Range', value: 'Last 90 Days' },
    { key: 'companies', label: 'Companies', value: '3 selected' },
    { key: 'amount_range', label: 'Amount Range', value: '$1,000 - $5,000' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation
    mockUseDashboardFilters.mockReturnValue({
      activeFilterCount: 3,
      hasActiveFilters: true,
      getActiveFilters: jest.fn().mockReturnValue(mockActiveFilters)
    });
  });

  describe('Rendering', () => {
    it('should not render when there are no active filters', () => {
      mockUseDashboardFilters.mockReturnValue({
        activeFilterCount: 0,
        hasActiveFilters: false,
        getActiveFilters: jest.fn().mockReturnValue([])
      });

      renderWithTheme(
        <FilterStatusDisplay filters={mockFilters} />
      );

      expect(screen.queryByText(/active filter/)).not.toBeInTheDocument();
    });

    it('should render both badge and detailed indicator by default', () => {
      renderWithTheme(
        <FilterStatusDisplay filters={mockFilters} />
      );

      // Should show the badge
      expect(screen.getByText('3')).toBeInTheDocument();
      
      // Should show the detailed indicator
      expect(screen.getByText('3 active filters')).toBeInTheDocument();
      expect(screen.getByText('Date Range:')).toBeInTheDocument();
    });

    it('should render only compact badge when variant is compact', () => {
      renderWithTheme(
        <FilterStatusDisplay 
          filters={mockFilters} 
          variant="compact" 
        />
      );

      // Should show the badge
      expect(screen.getByText('3')).toBeInTheDocument();
      
      // Should not show the detailed indicator
      expect(screen.queryByText('3 active filters')).not.toBeInTheDocument();
      expect(screen.queryByText('Date Range:')).not.toBeInTheDocument();
    });

    it('should render only detailed indicator when variant is detailed', () => {
      renderWithTheme(
        <FilterStatusDisplay 
          filters={mockFilters} 
          variant="detailed" 
        />
      );

      // Should not show the badge
      expect(screen.queryByText('3')).not.toBeInTheDocument();
      
      // Should show the detailed indicator
      expect(screen.getByText('3 active filters')).toBeInTheDocument();
      expect(screen.getByText('Date Range:')).toBeInTheDocument();
    });
  });

  describe('Hook Integration', () => {
    it('should call useDashboardFilters with correct parameters', () => {
      renderWithTheme(
        <FilterStatusDisplay filters={mockFilters} />
      );

      expect(mockUseDashboardFilters).toHaveBeenCalledWith({
        initialFilters: mockFilters,
        validateFilters: false
      });
    });

    it('should use hook values for rendering', () => {
      mockUseDashboardFilters.mockReturnValue({
        activeFilterCount: 5,
        hasActiveFilters: true,
        getActiveFilters: jest.fn().mockReturnValue([
          { key: 'companies', label: 'Companies', value: '5 selected' }
        ])
      });

      renderWithTheme(
        <FilterStatusDisplay filters={mockFilters} />
      );

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('5 active filters')).toBeInTheDocument();
      expect(screen.getByText('Companies:')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClearAll when clear all is clicked', () => {
      const onClearAll = jest.fn();
      renderWithTheme(
        <FilterStatusDisplay 
          filters={mockFilters} 
          onClearAll={onClearAll}
        />
      );

      const clearButton = screen.getByText('Clear all');
      fireEvent.click(clearButton);

      expect(onClearAll).toHaveBeenCalledTimes(1);
    });

    it('should call onRemoveFilter when individual filter is removed', () => {
      const onRemoveFilter = jest.fn();
      renderWithTheme(
        <FilterStatusDisplay 
          filters={mockFilters} 
          onRemoveFilter={onRemoveFilter}
        />
      );

      const removeButtons = screen.getAllByRole('button', { name: /Remove/ });
      fireEvent.click(removeButtons[0]);

      expect(onRemoveFilter).toHaveBeenCalledWith('date_range');
    });

    it('should call onClearAll when badge is clicked', () => {
      const onClearAll = jest.fn();
      renderWithTheme(
        <FilterStatusDisplay 
          filters={mockFilters} 
          onClearAll={onClearAll}
          variant="compact"
        />
      );

      const badge = screen.getByText('3').closest('div');
      fireEvent.click(badge!);

      expect(onClearAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('Configuration Options', () => {
    it('should pass badge size to FilterCountBadge', () => {
      renderWithTheme(
        <FilterStatusDisplay 
          filters={mockFilters} 
          badgeSize="lg"
          variant="compact"
        />
      );

      const badge = screen.getByText('3').closest('div');
      expect(badge).toHaveClass('px-4', 'py-2', 'text-base');
    });

    it('should pass badge variant to FilterCountBadge', () => {
      renderWithTheme(
        <FilterStatusDisplay 
          filters={mockFilters} 
          badgeVariant="secondary"
          variant="compact"
        />
      );

      const badge = screen.getByText('3').closest('div');
      expect(badge).toHaveClass('bg-purple-100', 'text-purple-700');
    });

    it('should pass maxVisibleFilters to ActiveFilterIndicator', () => {
      const manyFilters = [
        ...mockActiveFilters,
        { key: 'payment_methods', label: 'Payment Methods', value: '2 selected' },
        { key: 'employees', label: 'Employees', value: '5 selected' },
        { key: 'commission_types', label: 'Commission Types', value: '3 selected' }
      ];

      mockUseDashboardFilters.mockReturnValue({
        activeFilterCount: 6,
        hasActiveFilters: true,
        getActiveFilters: jest.fn().mockReturnValue(manyFilters)
      });

      renderWithTheme(
        <FilterStatusDisplay 
          filters={mockFilters} 
          maxVisibleFilters={2}
          variant="detailed"
        />
      );

      expect(screen.getByText('Date Range:')).toBeInTheDocument();
      expect(screen.getByText('Companies:')).toBeInTheDocument();
      expect(screen.queryByText('Amount Range:')).not.toBeInTheDocument();
      expect(screen.getByText('+4 more')).toBeInTheDocument();
    });

    it('should pass showCount to ActiveFilterIndicator', () => {
      renderWithTheme(
        <FilterStatusDisplay 
          filters={mockFilters} 
          showCount={false}
          variant="detailed"
        />
      );

      expect(screen.queryByText('3 active filters')).not.toBeInTheDocument();
      expect(screen.getByText('Date Range:')).toBeInTheDocument();
    });

    it('should pass showIndividualFilters to ActiveFilterIndicator', () => {
      renderWithTheme(
        <FilterStatusDisplay 
          filters={mockFilters} 
          showIndividualFilters={false}
          variant="detailed"
        />
      );

      expect(screen.getByText('3 active filters')).toBeInTheDocument();
      expect(screen.queryByText('Date Range:')).not.toBeInTheDocument();
    });
  });

  describe('Styling and Layout', () => {
    it('should apply custom className', () => {
      renderWithTheme(
        <FilterStatusDisplay 
          filters={mockFilters} 
          className="custom-class"
        />
      );

      const container = screen.getByText('3 active filters').closest('div')?.parentElement?.parentElement;
      expect(container).toHaveClass('custom-class');
    });

    it('should have proper spacing between badge and indicator', () => {
      renderWithTheme(
        <FilterStatusDisplay filters={mockFilters} />
      );

      const container = screen.getByText('3 active filters').closest('div')?.parentElement?.parentElement;
      expect(container).toHaveClass('space-y-2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty filters object', () => {
      const emptyFilters: DashboardFilters = {
        date_range: { type: 'last_30_days' },
        companies: { selected_companies: [] },
        payment_methods: { selected_methods: [] },
        revenue_sources: { selected_sources: [] },
        commission_types: { selected_types: [] },
        amount_range: {},
        disbursement_status: [],
        employees: { selected_employees: [] },
        referral_partners: { selected_partners: [] }
      };

      mockUseDashboardFilters.mockReturnValue({
        activeFilterCount: 0,
        hasActiveFilters: false,
        getActiveFilters: jest.fn().mockReturnValue([])
      });

      renderWithTheme(
        <FilterStatusDisplay filters={emptyFilters} />
      );

      expect(screen.queryByText(/active filter/)).not.toBeInTheDocument();
    });

    it('should handle hook returning null values', () => {
      mockUseDashboardFilters.mockReturnValue({
        activeFilterCount: null,
        hasActiveFilters: false,
        getActiveFilters: jest.fn().mockReturnValue(null)
      });

      renderWithTheme(
        <FilterStatusDisplay filters={mockFilters} />
      );

      expect(screen.queryByText(/active filter/)).not.toBeInTheDocument();
    });
  });
});
