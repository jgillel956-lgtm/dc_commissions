import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommissionTypeMultiSelect from './CommissionTypeMultiSelect';
import { CommissionType } from '../../services/commissionTypeApi';

// Mock commission types data
const mockCommissionTypes: CommissionType[] = [
  {
    id: 'emp-001',
    name: 'Employee Commission',
    code: 'EMP-COMM',
    description: 'Standard employee commission',
    category: 'employee',
    commission_rate: 5.0,
    is_active: true,
    total_commissions: 15000,
    total_transactions: 150,
    average_commission: 100,
    color: '#3B82F6',
    icon: '👤'
  },
  {
    id: 'ref-001',
    name: 'Referral Partner Commission',
    code: 'REF-COMM',
    description: 'Referral partner commission',
    category: 'referral_partner',
    commission_rate: 3.5,
    is_active: true,
    total_commissions: 8500,
    total_transactions: 85,
    average_commission: 100,
    color: '#10B981',
    icon: '🤝'
  },
  {
    id: 'int-001',
    name: 'Interest Commission',
    code: 'INT-COMM',
    description: 'Interest-based commission',
    category: 'interest',
    commission_rate: 2.0,
    is_active: true,
    total_commissions: 5000,
    total_transactions: 50,
    average_commission: 100,
    color: '#F59E0B',
    icon: '💰'
  },
  {
    id: 'oth-001',
    name: 'Other Commission',
    code: 'OTH-COMM',
    description: 'Other commission types',
    category: 'other',
    commission_rate: 1.5,
    is_active: true,
    total_commissions: 2500,
    total_transactions: 25,
    average_commission: 100,
    color: '#8B5CF6',
    icon: '📊'
  }
];

describe('CommissionTypeMultiSelect', () => {
  const defaultProps = {
    commissionTypes: mockCommissionTypes,
    selectedIds: [],
    onSelectionChange: jest.fn(),
    loading: false,
    error: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders with placeholder text when no commission types are selected', () => {
      render(<CommissionTypeMultiSelect {...defaultProps} />);
      expect(screen.getByText('Select commission types...')).toBeInTheDocument();
    });

    it('renders selected commission types count when commission types are selected', () => {
      render(
        <CommissionTypeMultiSelect
          {...defaultProps}
          selectedIds={['emp-001', 'ref-001']}
        />
      );
      expect(screen.getByText('2 commission types selected')).toBeInTheDocument();
    });

    it('renders total commission rate when commission types are selected', () => {
      render(
        <CommissionTypeMultiSelect
          {...defaultProps}
          selectedIds={['emp-001', 'ref-001']}
          showCommissionRates={true}
        />
      );
      expect(screen.getByText('(8.5% total rate)')).toBeInTheDocument();
    });

    it('shows loading state', () => {
      render(<CommissionTypeMultiSelect {...defaultProps} loading={true} />);
      expect(screen.getByText('Loading commission types...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('shows error state', () => {
      render(
        <CommissionTypeMultiSelect
          {...defaultProps}
          error="Failed to load commission types"
        />
      );
      expect(screen.getByText('Error loading commission types')).toBeInTheDocument();
    });
  });

  describe('Dropdown Functionality', () => {
    it('opens dropdown when clicked', async () => {
      const user = userEvent.setup();
      render(<CommissionTypeMultiSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(screen.getByText('Employee Commission')).toBeInTheDocument();
      expect(screen.getByText('Referral Partner Commission')).toBeInTheDocument();
    });

    it('closes dropdown when clicked again', async () => {
      const user = userEvent.setup();
      render(<CommissionTypeMultiSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      expect(screen.getByText('Employee Commission')).toBeInTheDocument();
      
      await user.click(button);
      expect(screen.queryByText('Employee Commission')).not.toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('filters commission types by search term', async () => {
      const user = userEvent.setup();
      render(<CommissionTypeMultiSelect {...defaultProps} />);
      
      // Open dropdown
      const button = screen.getByRole('button');
      await user.click(button);
      
      // Search for employee
      const searchInput = screen.getByPlaceholderText('Search commission types...');
      await user.type(searchInput, 'employee');
      
      expect(screen.getByText('Employee Commission')).toBeInTheDocument();
      expect(screen.queryByText('Referral Partner Commission')).not.toBeInTheDocument();
    });

    it('filters by commission code', async () => {
      const user = userEvent.setup();
      render(<CommissionTypeMultiSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      const searchInput = screen.getByPlaceholderText('Search commission types...');
      await user.type(searchInput, 'EMP-COMM');
      
      expect(screen.getByText('Employee Commission')).toBeInTheDocument();
      expect(screen.queryByText('Referral Partner Commission')).not.toBeInTheDocument();
    });

    it('shows no results message when search has no matches', async () => {
      const user = userEvent.setup();
      render(<CommissionTypeMultiSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      const searchInput = screen.getByPlaceholderText('Search commission types...');
      await user.type(searchInput, 'nonexistent');
      
      expect(screen.getByText('No commission types match the current filters')).toBeInTheDocument();
    });
  });

  describe('Selection Functionality', () => {
    it('selects a commission type when clicked', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      render(
        <CommissionTypeMultiSelect
          {...defaultProps}
          onSelectionChange={onSelectionChange}
        />
      );
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      const employeeCommission = screen.getByText('Employee Commission');
      await user.click(employeeCommission);
      
      expect(onSelectionChange).toHaveBeenCalledWith(['emp-001']);
    });

    it('deselects a commission type when clicked again', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      render(
        <CommissionTypeMultiSelect
          {...defaultProps}
          selectedIds={['emp-001']}
          onSelectionChange={onSelectionChange}
        />
      );
      
      const buttons = screen.getAllByRole('button');
      const mainButton = buttons.find(button => 
        button.textContent?.includes('1 commission type selected')
      );
      expect(mainButton).toBeInTheDocument();
      await user.click(mainButton!);
      
      const employeeCommission = screen.getByText('Employee Commission');
      await user.click(employeeCommission);
      
      expect(onSelectionChange).toHaveBeenCalledWith([]);
    });

    it('shows selected commission types as tags', () => {
      render(
        <CommissionTypeMultiSelect
          {...defaultProps}
          selectedIds={['emp-001', 'ref-001']}
        />
      );
      
      expect(screen.getByText('👤 Employee Commission (EMP-COMM) 5%')).toBeInTheDocument();
      expect(screen.getByText('🤝 Referral Partner Commission (REF-COMM) 3.5%')).toBeInTheDocument();
    });

    it('removes selected commission type when X is clicked on tag', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      render(
        <CommissionTypeMultiSelect
          {...defaultProps}
          selectedIds={['emp-001', 'ref-001']}
          onSelectionChange={onSelectionChange}
        />
      );
      
      const removeButtons = screen.getAllByRole('button');
      const removeButton = removeButtons.find(button => 
        button.querySelector('svg') && button.closest('span')?.textContent?.includes('Employee Commission')
      );
      
      if (removeButton) {
        await user.click(removeButton);
        expect(onSelectionChange).toHaveBeenCalledWith(['ref-001']);
      }
    });
  });

  describe('Category Filtering', () => {
    it('shows category filter buttons', async () => {
      const user = userEvent.setup();
      render(<CommissionTypeMultiSelect {...defaultProps} enableCategoryFiltering={true} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(screen.getByText('👤 Employee (1)')).toBeInTheDocument();
      expect(screen.getByText('🤝 Referral Partner (1)')).toBeInTheDocument();
      expect(screen.getByText('💰 Interest (1)')).toBeInTheDocument();
      expect(screen.getByText('📊 Other (1)')).toBeInTheDocument();
    });

    it('filters by selected category', async () => {
      const user = userEvent.setup();
      render(<CommissionTypeMultiSelect {...defaultProps} enableCategoryFiltering={true} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      const employeeCategory = screen.getByText('👤 Employee (1)');
      await user.click(employeeCategory);
      
      expect(screen.getByText('Employee Commission')).toBeInTheDocument();
      expect(screen.queryByText('Referral Partner Commission')).not.toBeInTheDocument();
    });

    it('allows multiple category selection', async () => {
      const user = userEvent.setup();
      render(<CommissionTypeMultiSelect {...defaultProps} enableCategoryFiltering={true} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      const employeeCategory = screen.getByText('👤 Employee (1)');
      const referralCategory = screen.getByText('🤝 Referral Partner (1)');
      
      await user.click(employeeCategory);
      await user.click(referralCategory);
      
      expect(screen.getByText('Employee Commission')).toBeInTheDocument();
      expect(screen.getByText('Referral Partner Commission')).toBeInTheDocument();
      expect(screen.queryByText('Interest Commission')).not.toBeInTheDocument();
    });
  });

  describe('View Mode Toggle', () => {
    it('shows all commission types by default', async () => {
      const user = userEvent.setup();
      render(<CommissionTypeMultiSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(screen.getByText('All (4)')).toBeInTheDocument();
      expect(screen.getByText('Selected (0)')).toBeInTheDocument();
      expect(screen.getByText('Employee Commission')).toBeInTheDocument();
      expect(screen.getByText('Referral Partner Commission')).toBeInTheDocument();
    });

    it('shows only selected commission types when "Selected" view is active', async () => {
      const user = userEvent.setup();
      render(
        <CommissionTypeMultiSelect
          {...defaultProps}
          selectedIds={['emp-001', 'ref-001']}
        />
      );
      
      const buttons = screen.getAllByRole('button');
      const mainButton = buttons.find(button => 
        button.textContent?.includes('2 commission types selected')
      );
      expect(mainButton).toBeInTheDocument();
      await user.click(mainButton!);
      
      const selectedButton = screen.getByText('Selected (2)');
      await user.click(selectedButton);
      
      expect(screen.getByText('Employee Commission')).toBeInTheDocument();
      expect(screen.getByText('Referral Partner Commission')).toBeInTheDocument();
      expect(screen.queryByText('Interest Commission')).not.toBeInTheDocument();
      expect(screen.queryByText('Other Commission')).not.toBeInTheDocument();
    });
  });

  describe('Bulk Actions', () => {
    it('selects all visible commission types', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      render(
        <CommissionTypeMultiSelect
          {...defaultProps}
          onSelectionChange={onSelectionChange}
          allowSelectAll={true}
        />
      );
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      const selectAllButton = screen.getByText('Select all visible (4)');
      await user.click(selectAllButton);
      
      expect(onSelectionChange).toHaveBeenCalledWith(['emp-001', 'ref-001', 'int-001', 'oth-001']);
    });

    it('deselects all commission types', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      render(
        <CommissionTypeMultiSelect
          {...defaultProps}
          selectedIds={['emp-001', 'ref-001']}
          onSelectionChange={onSelectionChange}
          allowSelectAll={true}
        />
      );
      
      const buttons = screen.getAllByRole('button');
      const mainButton = buttons.find(button => 
        button.textContent?.includes('2 commission types selected')
      );
      expect(mainButton).toBeInTheDocument();
      await user.click(mainButton!);
      
      const deselectAllButton = screen.getByText('Deselect all');
      await user.click(deselectAllButton);
      
      expect(onSelectionChange).toHaveBeenCalledWith([]);
    });
  });

  describe('Clear Filters', () => {
    it('clears all filters when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<CommissionTypeMultiSelect {...defaultProps} enableCategoryFiltering={true} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      // Set up some filters
      const searchInput = screen.getByPlaceholderText('Search commission types...');
      await user.type(searchInput, 'employee');
      
      const employeeCategory = screen.getByText('👤 Employee (1)');
      await user.click(employeeCategory);
      
      // Clear filters
      const clearButton = screen.getByText('Clear all filters');
      await user.click(clearButton);
      
      // Verify filters are cleared
      expect(searchInput).toHaveValue('');
      expect(screen.getByText('Employee Commission')).toBeInTheDocument();
      expect(screen.getByText('Referral Partner Commission')).toBeInTheDocument();
    });
  });

  describe('Display Options', () => {
    it('hides commission codes when showCommissionCodes is false', () => {
      render(
        <CommissionTypeMultiSelect
          {...defaultProps}
          selectedIds={['emp-001']}
          showCommissionCodes={false}
        />
      );
      
      expect(screen.getByText('👤 Employee Commission 5%')).toBeInTheDocument();
      expect(screen.queryByText('(EMP-COMM)')).not.toBeInTheDocument();
    });

    it('hides commission rates when showCommissionRates is false', () => {
      render(
        <CommissionTypeMultiSelect
          {...defaultProps}
          selectedIds={['emp-001']}
          showCommissionRates={false}
        />
      );
      
      expect(screen.getByText('👤 Employee Commission (EMP-COMM)')).toBeInTheDocument();
      expect(screen.queryByText('5%')).not.toBeInTheDocument();
    });

    it('hides commission stats when showCommissionStats is false', async () => {
      const user = userEvent.setup();
      render(
        <CommissionTypeMultiSelect
          {...defaultProps}
          showCommissionStats={false}
        />
      );
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(screen.getByText('Employee Commission')).toBeInTheDocument();
      expect(screen.queryByText('$15,000 total')).not.toBeInTheDocument();
    });

    it('hides category filtering when enableCategoryFiltering is false', async () => {
      const user = userEvent.setup();
      render(<CommissionTypeMultiSelect {...defaultProps} enableCategoryFiltering={false} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(screen.queryByText('Categories')).not.toBeInTheDocument();
      expect(screen.queryByText('👤 Employee (1)')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', async () => {
      const user = userEvent.setup();
      render(<CommissionTypeMultiSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      
      await user.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('is keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<CommissionTypeMultiSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      button.focus();
      
      await user.keyboard('{Enter}');
      expect(screen.getByText('Employee Commission')).toBeInTheDocument();
      
      await user.keyboard('{Escape}');
      expect(screen.queryByText('Employee Commission')).not.toBeInTheDocument();
    });
  });
});
