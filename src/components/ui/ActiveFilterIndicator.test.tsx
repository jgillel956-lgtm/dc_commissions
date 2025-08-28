import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ActiveFilterIndicator from './ActiveFilterIndicator';
import { ThemeProvider } from '../../contexts/ThemeContext';

// Mock theme context
const mockTheme = {
  mode: 'light' as const,
  toggleTheme: jest.fn()
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  );
};

describe('ActiveFilterIndicator', () => {
  const mockActiveFilters = [
    { key: 'date_range', label: 'Date Range', value: 'Last 90 Days' },
    { key: 'companies', label: 'Companies', value: '3 selected' },
    { key: 'amount_range', label: 'Amount Range', value: '$1,000 - $5,000' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when there are no active filters', () => {
      renderWithTheme(
        <ActiveFilterIndicator
          activeFilters={[]}
          totalCount={0}
        />
      );

      expect(screen.queryByText(/active filter/)).not.toBeInTheDocument();
    });

    it('should render filter count correctly', () => {
      renderWithTheme(
        <ActiveFilterIndicator
          activeFilters={mockActiveFilters}
          totalCount={3}
        />
      );

      expect(screen.getByText('3 active filters')).toBeInTheDocument();
    });

    it('should render singular form for single filter', () => {
      renderWithTheme(
        <ActiveFilterIndicator
          activeFilters={[mockActiveFilters[0]]}
          totalCount={1}
        />
      );

      expect(screen.getByText('1 active filter')).toBeInTheDocument();
    });

    it('should render individual filter tags', () => {
      renderWithTheme(
        <ActiveFilterIndicator
          activeFilters={mockActiveFilters}
          totalCount={3}
        />
      );

      expect(screen.getByText('Date Range:')).toBeInTheDocument();
      expect(screen.getByText('Last 90 Days')).toBeInTheDocument();
      expect(screen.getByText('Companies:')).toBeInTheDocument();
      expect(screen.getByText('3 selected')).toBeInTheDocument();
      expect(screen.getByText('Amount Range:')).toBeInTheDocument();
      expect(screen.getByText('$1,000 - $5,000')).toBeInTheDocument();
    });

    it('should show clear all button when onClearAll is provided', () => {
      const onClearAll = jest.fn();
      renderWithTheme(
        <ActiveFilterIndicator
          activeFilters={mockActiveFilters}
          totalCount={3}
          onClearAll={onClearAll}
        />
      );

      const clearButton = screen.getByText('Clear all');
      expect(clearButton).toBeInTheDocument();
    });

    it('should not show clear all button when onClearAll is not provided', () => {
      renderWithTheme(
        <ActiveFilterIndicator
          activeFilters={mockActiveFilters}
          totalCount={3}
        />
      );

      expect(screen.queryByText('Clear all')).not.toBeInTheDocument();
    });
  });

  describe('Configuration Options', () => {
    it('should hide count when showCount is false', () => {
      renderWithTheme(
        <ActiveFilterIndicator
          activeFilters={mockActiveFilters}
          totalCount={3}
          showCount={false}
        />
      );

      expect(screen.queryByText(/active filter/)).not.toBeInTheDocument();
    });

    it('should hide individual filters when showIndividualFilters is false', () => {
      renderWithTheme(
        <ActiveFilterIndicator
          activeFilters={mockActiveFilters}
          totalCount={3}
          showIndividualFilters={false}
        />
      );

      expect(screen.getByText('3 active filters')).toBeInTheDocument();
      expect(screen.queryByText('Date Range:')).not.toBeInTheDocument();
      expect(screen.queryByText('Companies:')).not.toBeInTheDocument();
    });

    it('should limit visible filters based on maxVisibleFilters', () => {
      const manyFilters = [
        ...mockActiveFilters,
        { key: 'payment_methods', label: 'Payment Methods', value: '2 selected' },
        { key: 'employees', label: 'Employees', value: '5 selected' },
        { key: 'commission_types', label: 'Commission Types', value: '3 selected' }
      ];

      renderWithTheme(
        <ActiveFilterIndicator
          activeFilters={manyFilters}
          totalCount={6}
          maxVisibleFilters={3}
        />
      );

      expect(screen.getByText('Date Range:')).toBeInTheDocument();
      expect(screen.getByText('Companies:')).toBeInTheDocument();
      expect(screen.getByText('Amount Range:')).toBeInTheDocument();
      expect(screen.queryByText('Payment Methods:')).not.toBeInTheDocument();
      expect(screen.getByText('+3 more')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClearAll when clear all button is clicked', () => {
      const onClearAll = jest.fn();
      renderWithTheme(
        <ActiveFilterIndicator
          activeFilters={mockActiveFilters}
          totalCount={3}
          onClearAll={onClearAll}
        />
      );

      const clearButton = screen.getByText('Clear all');
      fireEvent.click(clearButton);

      expect(onClearAll).toHaveBeenCalledTimes(1);
    });

    it('should call onRemoveFilter when individual filter remove button is clicked', () => {
      const onRemoveFilter = jest.fn();
      renderWithTheme(
        <ActiveFilterIndicator
          activeFilters={mockActiveFilters}
          totalCount={3}
          onRemoveFilter={onRemoveFilter}
        />
      );

      const removeButtons = screen.getAllByRole('button', { name: /Remove/ });
      fireEvent.click(removeButtons[0]);

      expect(onRemoveFilter).toHaveBeenCalledWith('date_range');
    });

    it('should not show remove buttons when onRemoveFilter is not provided', () => {
      renderWithTheme(
        <ActiveFilterIndicator
          activeFilters={mockActiveFilters}
          totalCount={3}
        />
      );

      expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for remove buttons', () => {
      const onRemoveFilter = jest.fn();
      renderWithTheme(
        <ActiveFilterIndicator
          activeFilters={mockActiveFilters}
          totalCount={3}
          onRemoveFilter={onRemoveFilter}
        />
      );

      expect(screen.getByLabelText('Remove Date Range filter')).toBeInTheDocument();
      expect(screen.getByLabelText('Remove Companies filter')).toBeInTheDocument();
      expect(screen.getByLabelText('Remove Amount Range filter')).toBeInTheDocument();
    });

    it('should handle keyboard navigation for clear all button', () => {
      const onClearAll = jest.fn();
      renderWithTheme(
        <ActiveFilterIndicator
          activeFilters={mockActiveFilters}
          totalCount={3}
          onClearAll={onClearAll}
        />
      );

      const clearButton = screen.getByText('Clear all');
      fireEvent.keyDown(clearButton, { key: 'Enter' });

      expect(onClearAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('Styling and Layout', () => {
    it('should apply custom className', () => {
      renderWithTheme(
        <ActiveFilterIndicator
          activeFilters={mockActiveFilters}
          totalCount={3}
          className="custom-class"
        />
      );

      const container = screen.getByText('3 active filters').closest('div')?.parentElement;
      expect(container).toHaveClass('custom-class');
    });

    it('should truncate long filter values', () => {
      const longValueFilter = [
        { key: 'companies', label: 'Companies', value: 'This is a very long company name that should be truncated' }
      ];

      renderWithTheme(
        <ActiveFilterIndicator
          activeFilters={longValueFilter}
          totalCount={1}
        />
      );

      const valueElement = screen.getByText('This is a very long company name that should be truncated');
      expect(valueElement).toHaveClass('truncate');
    });
  });
});
