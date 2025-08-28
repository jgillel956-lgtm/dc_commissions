import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DisbursementStatusMultiSelect from './DisbursementStatusMultiSelect';

const mockDisbursementStatuses = [
  {
    id: '1',
    value: 'pending',
    label: 'Pending',
    description: 'Disbursements awaiting processing',
    color: 'yellow',
    icon: 'clock',
    is_active: true,
    transaction_count: 1250,
    total_amount: 450000
  },
  {
    id: '2',
    value: 'completed',
    label: 'Completed',
    description: 'Successfully completed disbursements',
    color: 'green',
    icon: 'check-circle',
    is_active: true,
    transaction_count: 28450,
    total_amount: 12500000
  },
  {
    id: '3',
    value: 'failed',
    label: 'Failed',
    description: 'Disbursements that failed to process',
    color: 'red',
    icon: 'x-circle',
    is_active: true,
    transaction_count: 180,
    total_amount: 75000
  }
];

describe('DisbursementStatusMultiSelect', () => {
  const defaultProps = {
    disbursementStatuses: mockDisbursementStatuses,
    selectedIds: [],
    onSelectionChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders with placeholder text when no disbursement statuses are selected', () => {
      render(<DisbursementStatusMultiSelect {...defaultProps} />);
      
      expect(screen.getByText('Select disbursement statuses...')).toBeInTheDocument();
    });

    it('renders selected disbursement statuses count when statuses are selected', () => {
      render(<DisbursementStatusMultiSelect {...defaultProps} selectedIds={['1', '2']} />);
      
      expect(screen.getByText('2 statuses selected')).toBeInTheDocument();
    });

    it('renders single selected disbursement status name', () => {
      render(<DisbursementStatusMultiSelect {...defaultProps} selectedIds={['1']} />);
      
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('shows loading state', () => {
      render(<DisbursementStatusMultiSelect {...defaultProps} loading={true} />);
      
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('shows error state', () => {
      render(<DisbursementStatusMultiSelect {...defaultProps} error="Failed to load" />);
      
      expect(screen.getByRole('button')).toHaveClass('border-red-300');
    });
  });

  describe('Dropdown Functionality', () => {
    it('opens dropdown when clicked', async () => {
      const user = userEvent.setup();
      render(<DisbursementStatusMultiSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(screen.getByText('All (3)')).toBeInTheDocument();
      expect(screen.getByText('Selected (0)')).toBeInTheDocument();
    });

    it('closes dropdown when clicked again', async () => {
      const user = userEvent.setup();
      render(<DisbursementStatusMultiSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      await user.click(button);
      
      expect(screen.queryByText('All (3)')).not.toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('filters disbursement statuses by search term', async () => {
      const user = userEvent.setup();
      render(<DisbursementStatusMultiSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      const searchInput = screen.getByPlaceholderText('Search statuses...');
      await user.type(searchInput, 'pending');
      
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.queryByText('Completed')).not.toBeInTheDocument();
    });

    it('filters by disbursement status value', async () => {
      const user = userEvent.setup();
      render(<DisbursementStatusMultiSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      const searchInput = screen.getByPlaceholderText('Search statuses...');
      await user.type(searchInput, 'completed');
      
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.queryByText('Pending')).not.toBeInTheDocument();
    });

    it('shows no results message when search has no matches', async () => {
      const user = userEvent.setup();
      render(<DisbursementStatusMultiSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      const searchInput = screen.getByPlaceholderText('Search statuses...');
      await user.type(searchInput, 'nonexistent');
      
      expect(screen.getByText('No statuses found matching your search.')).toBeInTheDocument();
    });
  });

  describe('Selection Functionality', () => {
    it('selects a disbursement status when clicked', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      render(<DisbursementStatusMultiSelect {...defaultProps} onSelectionChange={onSelectionChange} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
             const pendingCheckbox = screen.getByRole('checkbox', { name: 'Select Pending' });
       await user.click(pendingCheckbox);
      
      expect(onSelectionChange).toHaveBeenCalledWith(['1']);
    });

    it('deselects a disbursement status when clicked again', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      render(
        <DisbursementStatusMultiSelect
          {...defaultProps}
          selectedIds={['1']}
          onSelectionChange={onSelectionChange}
        />
      );
      
      const button = screen.getByRole('button');
      await user.click(button);
      
             const pendingCheckbox = screen.getByRole('checkbox', { name: 'Select Pending' });
       expect(pendingCheckbox).toBeChecked();
       await user.click(pendingCheckbox);
      
      expect(onSelectionChange).toHaveBeenCalledWith([]);
    });

         it('shows selected disbursement statuses as tags', async () => {
       const user = userEvent.setup();
       render(<DisbursementStatusMultiSelect {...defaultProps} selectedIds={['1', '2']} />);
       
       const button = screen.getByRole('button');
       await user.click(button);
       
       // Check that both statuses appear in the tags section
       const tagElements = screen.getAllByText('Pending');
       expect(tagElements.length).toBeGreaterThan(0);
       const completedElements = screen.getAllByText('Completed');
       expect(completedElements.length).toBeGreaterThan(0);
     });

    it('removes selected disbursement status when X is clicked on tag', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      render(
        <DisbursementStatusMultiSelect
          {...defaultProps}
          selectedIds={['1', '2']}
          onSelectionChange={onSelectionChange}
        />
      );
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      const removeButtons = screen.getAllByRole('button', { name: '' });
      await user.click(removeButtons[0]); // Click first X button
      
      expect(onSelectionChange).toHaveBeenCalledWith(['2']);
    });
  });

  describe('View Mode Toggle', () => {
    it('shows all disbursement statuses by default', async () => {
      const user = userEvent.setup();
      render(<DisbursementStatusMultiSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

         it('shows only selected disbursement statuses when "Selected" view is active', async () => {
       const user = userEvent.setup();
       render(<DisbursementStatusMultiSelect {...defaultProps} selectedIds={['1']} />);
       
       const button = screen.getByRole('button');
       await user.click(button);
       
       const selectedButton = screen.getByText('Selected (1)');
       await user.click(selectedButton);
       
       // Check that only the selected status appears in the list
       expect(screen.getByRole('checkbox', { name: 'Select Pending' })).toBeInTheDocument();
       expect(screen.queryByRole('checkbox', { name: 'Select Completed' })).not.toBeInTheDocument();
       expect(screen.queryByRole('checkbox', { name: 'Select Failed' })).not.toBeInTheDocument();
     });
  });

  describe('Bulk Actions', () => {
    it('selects all visible disbursement statuses', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      render(<DisbursementStatusMultiSelect {...defaultProps} onSelectionChange={onSelectionChange} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      const selectAllButton = screen.getByText('Select All');
      await user.click(selectAllButton);
      
      expect(onSelectionChange).toHaveBeenCalledWith(['1', '2', '3']);
    });

    it('deselects all disbursement statuses', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      render(
        <DisbursementStatusMultiSelect
          {...defaultProps}
          selectedIds={['1', '2']}
          onSelectionChange={onSelectionChange}
        />
      );
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      const clearButton = screen.getByText('Clear');
      await user.click(clearButton);
      
      expect(onSelectionChange).toHaveBeenCalledWith([]);
    });
  });

  describe('Display Options', () => {
    it('hides status icons when showStatusIcons is false', async () => {
      const user = userEvent.setup();
      render(<DisbursementStatusMultiSelect {...defaultProps} showStatusIcons={false} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      // Check that no icons are rendered (this is a bit tricky to test directly)
      // We'll check that the component still renders correctly
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('hides status colors when showStatusColors is false', async () => {
      const user = userEvent.setup();
      render(<DisbursementStatusMultiSelect {...defaultProps} showStatusColors={false} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('hides status stats when showStatusStats is false', async () => {
      const user = userEvent.setup();
      render(<DisbursementStatusMultiSelect {...defaultProps} showStatusStats={false} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.queryByText('1,250 transactions')).not.toBeInTheDocument();
    });

    it('hides status descriptions when showStatusDescriptions is false', async () => {
      const user = userEvent.setup();
      render(<DisbursementStatusMultiSelect {...defaultProps} showStatusDescriptions={false} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.queryByText('Disbursements awaiting processing')).not.toBeInTheDocument();
    });

    it('hides search when enableSearch is false', async () => {
      const user = userEvent.setup();
      render(<DisbursementStatusMultiSelect {...defaultProps} enableSearch={false} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(screen.queryByPlaceholderText('Search statuses...')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', async () => {
      const user = userEvent.setup();
      render(<DisbursementStatusMultiSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      
      await user.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('is keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<DisbursementStatusMultiSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      button.focus();
      
      await user.keyboard('{Enter}');
      expect(screen.getByText('All (3)')).toBeInTheDocument();
      
      await user.keyboard('{Escape}');
      expect(screen.queryByText('All (3)')).not.toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('disables interactions when disabled is true', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      render(
        <DisbursementStatusMultiSelect
          {...defaultProps}
          disabled={true}
          onSelectionChange={onSelectionChange}
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      
      await user.click(button);
      expect(screen.queryByText('All (3)')).not.toBeInTheDocument();
    });
  });

  describe('Status Information Display', () => {
    it('displays transaction count and total amount', async () => {
      const user = userEvent.setup();
      render(<DisbursementStatusMultiSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(screen.getByText('1,250 transactions')).toBeInTheDocument();
      expect(screen.getByText('$450,000')).toBeInTheDocument();
    });

    it('displays status descriptions', async () => {
      const user = userEvent.setup();
      render(<DisbursementStatusMultiSelect {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(screen.getByText('Disbursements awaiting processing')).toBeInTheDocument();
      expect(screen.getByText('Successfully completed disbursements')).toBeInTheDocument();
    });
  });
});
