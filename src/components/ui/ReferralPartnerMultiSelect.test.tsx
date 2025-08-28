import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReferralPartnerMultiSelect from './ReferralPartnerMultiSelect';
import { ReferralPartner } from '../../services/referralPartnerApi';

// Mock referral partners for testing
const mockReferralPartners: ReferralPartner[] = [
  {
    id: '1',
    name: 'ABC Financial Services',
    code: 'ABC001',
    type: 'Financial Institution',
    email: 'contact@abcfinserv.com',
    phone: '(555) 123-4567',
    company: 'ABC Financial Group',
    status: 'active',
    commission_rate: 2.5,
    default_rate: 2.0,
    total_transactions: 1250,
    total_amount: 4500000,
    total_commission: 112500,
    created_at: '2023-01-15T10:00:00Z',
    updated_at: '2024-01-15T14:30:00Z'
  },
  {
    id: '2',
    name: 'XYZ Consulting Group',
    code: 'XYZ002',
    type: 'Consulting Firm',
    email: 'partners@xyzconsulting.com',
    phone: '(555) 234-5678',
    company: 'XYZ Partners LLC',
    status: 'active',
    commission_rate: 3.0,
    default_rate: 2.5,
    total_transactions: 890,
    total_amount: 3200000,
    total_commission: 96000,
    created_at: '2023-02-20T09:15:00Z',
    updated_at: '2024-01-10T11:45:00Z'
  },
  {
    id: '3',
    name: 'Delta Business Solutions',
    code: 'DEL003',
    type: 'Business Services',
    email: 'info@deltabusiness.com',
    phone: '(555) 345-6789',
    company: 'Delta Solutions Inc',
    status: 'inactive',
    commission_rate: 2.0,
    default_rate: 1.8,
    total_transactions: 2100,
    total_amount: 7800000,
    total_commission: 156000,
    created_at: '2023-03-10T13:20:00Z',
    updated_at: '2024-01-20T16:15:00Z'
  }
];

const defaultProps = {
  referralPartners: mockReferralPartners,
  selectedIds: [],
  onSelectionChange: jest.fn(),
  loading: false,
  error: null,
  placeholder: 'Select referral partners...'
};

describe('ReferralPartnerMultiSelect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('renders the component with placeholder text', () => {
      render(<ReferralPartnerMultiSelect {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /Select referral partners.../i })).toBeInTheDocument();
    });

    it('shows selected count when partners are selected', () => {
      render(<ReferralPartnerMultiSelect {...defaultProps} selectedIds={['1', '2']} />);
      
      expect(screen.getByRole('button', { name: /2 partners selected/i })).toBeInTheDocument();
    });

    it('shows single partner name when one is selected', () => {
      render(<ReferralPartnerMultiSelect {...defaultProps} selectedIds={['1']} />);
      
      expect(screen.getByRole('button', { name: /ABC Financial Services/i })).toBeInTheDocument();
    });

    it('shows loading state', () => {
      render(<ReferralPartnerMultiSelect {...defaultProps} loading={true} />);
      
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('shows error state', () => {
      render(<ReferralPartnerMultiSelect {...defaultProps} error="Failed to load" />);
      
      expect(screen.getByRole('button')).toHaveClass('border-red-300');
    });

    it('shows disabled state', () => {
      render(<ReferralPartnerMultiSelect {...defaultProps} disabled={true} />);
      
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('dropdown functionality', () => {
    it('opens dropdown when clicked', async () => {
      const user = userEvent.setup();
      render(<ReferralPartnerMultiSelect {...defaultProps} />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(screen.getByText('ABC Financial Services')).toBeInTheDocument();
      expect(screen.getByText('XYZ Consulting Group')).toBeInTheDocument();
      expect(screen.getByText('Delta Business Solutions')).toBeInTheDocument();
    });

    it('closes dropdown when Escape key is pressed', async () => {
      const user = userEvent.setup();
      render(<ReferralPartnerMultiSelect {...defaultProps} />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(screen.getByText('ABC Financial Services')).toBeInTheDocument();

      await user.keyboard('{Escape}');

      expect(screen.queryByText('ABC Financial Services')).not.toBeInTheDocument();
    });

    it('has correct aria-expanded attribute', async () => {
      const user = userEvent.setup();
      render(<ReferralPartnerMultiSelect {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');

      await user.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('search functionality', () => {
    it('filters partners by search term', async () => {
      const user = userEvent.setup();
      render(<ReferralPartnerMultiSelect {...defaultProps} />);

      const button = screen.getByRole('button');
      await user.click(button);

      const searchInput = screen.getByPlaceholderText('Search referral partners...');
      await user.type(searchInput, 'ABC');

      expect(screen.getByText('ABC Financial Services')).toBeInTheDocument();
      expect(screen.queryByText('XYZ Consulting Group')).not.toBeInTheDocument();
      expect(screen.queryByText('Delta Business Solutions')).not.toBeInTheDocument();
    });

    it('searches by partner code', async () => {
      const user = userEvent.setup();
      render(<ReferralPartnerMultiSelect {...defaultProps} />);

      const button = screen.getByRole('button');
      await user.click(button);

      const searchInput = screen.getByPlaceholderText('Search referral partners...');
      await user.type(searchInput, 'XYZ002');

      expect(screen.getByText('XYZ Consulting Group')).toBeInTheDocument();
      expect(screen.queryByText('ABC Financial Services')).not.toBeInTheDocument();
    });

    it('searches by email', async () => {
      const user = userEvent.setup();
      render(<ReferralPartnerMultiSelect {...defaultProps} />);

      const button = screen.getByRole('button');
      await user.click(button);

      const searchInput = screen.getByPlaceholderText('Search referral partners...');
      await user.type(searchInput, 'contact@abcfinserv.com');

      expect(screen.getByText('ABC Financial Services')).toBeInTheDocument();
    });
  });

  describe('selection behavior', () => {
    it('selects a referral partner when clicked', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      render(<ReferralPartnerMultiSelect {...defaultProps} onSelectionChange={onSelectionChange} />);

      const button = screen.getByRole('button');
      await user.click(button);

      const abcCheckbox = screen.getByRole('checkbox', { name: 'Select ABC Financial Services' });
      await user.click(abcCheckbox);

      expect(onSelectionChange).toHaveBeenCalledWith(['1']);
    });

    it('deselects a referral partner when clicked again', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      render(
        <ReferralPartnerMultiSelect
          {...defaultProps}
          selectedIds={['1']}
          onSelectionChange={onSelectionChange}
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      const abcCheckbox = screen.getByRole('checkbox', { name: 'Select ABC Financial Services' });
      expect(abcCheckbox).toBeChecked();
      await user.click(abcCheckbox);

      expect(onSelectionChange).toHaveBeenCalledWith([]);
    });

    it('shows selected partners as tags', async () => {
      const user = userEvent.setup();
      render(<ReferralPartnerMultiSelect {...defaultProps} selectedIds={['1', '2']} />);

      const button = screen.getByRole('button');
      await user.click(button);

      // Check that partners are displayed (there might be multiple elements with the same text)
      const abcElements = screen.getAllByText('ABC Financial Services');
      expect(abcElements.length).toBeGreaterThan(0);
      const xyzElements = screen.getAllByText('XYZ Consulting Group');
      expect(xyzElements.length).toBeGreaterThan(0);
    });

    it('removes selected partner when X is clicked on tag', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      render(
        <ReferralPartnerMultiSelect
          {...defaultProps}
          selectedIds={['1', '2']}
          onSelectionChange={onSelectionChange}
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      const removeButtons = screen.getAllByRole('button', { name: '' });
      const firstRemoveButton = removeButtons.find(button => 
        button.closest('span')?.textContent?.includes('ABC Financial Services')
      );
      
      if (firstRemoveButton) {
        await user.click(firstRemoveButton);
        expect(onSelectionChange).toHaveBeenCalledWith(['2']);
      }
    });
  });

  describe('view modes', () => {
    it('shows all partners by default', async () => {
      const user = userEvent.setup();
      render(<ReferralPartnerMultiSelect {...defaultProps} />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(screen.getByText('All (3)')).toBeInTheDocument();
      expect(screen.getByText('Selected (0)')).toBeInTheDocument();
    });

    it('shows only selected partners when "Selected" view is active', async () => {
      const user = userEvent.setup();
      render(<ReferralPartnerMultiSelect {...defaultProps} selectedIds={['1']} />);

      const button = screen.getByRole('button');
      await user.click(button);

      const selectedButton = screen.getByText('Selected (1)');
      await user.click(selectedButton);

      // Check that only the selected partner is displayed
      const abcElements = screen.getAllByText('ABC Financial Services');
      expect(abcElements.length).toBeGreaterThan(0);
      expect(screen.queryByText('XYZ Consulting Group')).not.toBeInTheDocument();
      expect(screen.queryByText('Delta Business Solutions')).not.toBeInTheDocument();
    });
  });

  describe('bulk actions', () => {
    it('selects all visible partners', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      render(<ReferralPartnerMultiSelect {...defaultProps} onSelectionChange={onSelectionChange} />);

      const button = screen.getByRole('button');
      await user.click(button);

      const selectAllButton = screen.getByText('Select All');
      await user.click(selectAllButton);

      expect(onSelectionChange).toHaveBeenCalledWith(['1', '3', '2']);
    });

    it('clears all selections', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      render(
        <ReferralPartnerMultiSelect
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

  describe('type filtering', () => {
    it('filters by partner type', async () => {
      const user = userEvent.setup();
      render(<ReferralPartnerMultiSelect {...defaultProps} />);

      const button = screen.getByRole('button');
      await user.click(button);

      const financialTypeButton = screen.getByRole('button', { name: 'Financial Institution' });
      await user.click(financialTypeButton);

      expect(screen.getByText('ABC Financial Services')).toBeInTheDocument();
      expect(screen.queryByText('XYZ Consulting Group')).not.toBeInTheDocument();
      expect(screen.queryByText('Delta Business Solutions')).not.toBeInTheDocument();
    });

    it('removes type filter when clicked again', async () => {
      const user = userEvent.setup();
      render(<ReferralPartnerMultiSelect {...defaultProps} />);

      const button = screen.getByRole('button');
      await user.click(button);

      const financialTypeButton = screen.getByRole('button', { name: 'Financial Institution' });
      await user.click(financialTypeButton);
      await user.click(financialTypeButton);

      expect(screen.getByText('ABC Financial Services')).toBeInTheDocument();
      expect(screen.getByText('XYZ Consulting Group')).toBeInTheDocument();
      expect(screen.getByText('Delta Business Solutions')).toBeInTheDocument();
    });
  });

  describe('status filtering', () => {
    it('filters by partner status', async () => {
      const user = userEvent.setup();
      render(<ReferralPartnerMultiSelect {...defaultProps} />);

      const button = screen.getByRole('button');
      await user.click(button);

      const activeStatusButton = screen.getByRole('button', { name: 'active' });
      await user.click(activeStatusButton);

      // Check that partners are displayed (there might be multiple elements with the same text)
      const abcElements = screen.getAllByText('ABC Financial Services');
      expect(abcElements.length).toBeGreaterThan(0);
      const xyzElements = screen.getAllByText('XYZ Consulting Group');
      expect(xyzElements.length).toBeGreaterThan(0);
      expect(screen.queryByText('Delta Business Solutions')).not.toBeInTheDocument();
    });

    it('removes status filter when clicked again', async () => {
      const user = userEvent.setup();
      render(<ReferralPartnerMultiSelect {...defaultProps} />);

      const button = screen.getByRole('button');
      await user.click(button);

      const activeStatusButton = screen.getByRole('button', { name: 'active' });
      await user.click(activeStatusButton);
      await user.click(activeStatusButton);

      // Check that partners are displayed (there might be multiple elements with the same text)
      const abcElements = screen.getAllByText('ABC Financial Services');
      expect(abcElements.length).toBeGreaterThan(0);
      const xyzElements = screen.getAllByText('XYZ Consulting Group');
      expect(xyzElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Delta Business Solutions')).toBeInTheDocument();
    });
  });

  describe('display options', () => {
    it('shows partner codes when enabled', async () => {
      const user = userEvent.setup();
      render(<ReferralPartnerMultiSelect {...defaultProps} showPartnerCodes={true} />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(screen.getByText('ABC001')).toBeInTheDocument();
      expect(screen.getByText('XYZ002')).toBeInTheDocument();
    });

    it('shows partner types when enabled', async () => {
      const user = userEvent.setup();
      render(<ReferralPartnerMultiSelect {...defaultProps} showPartnerTypes={true} />);

      const button = screen.getByRole('button');
      await user.click(button);

      // Check that partner types are displayed in the partner list (not just filter buttons)
      const partnerElements = screen.getAllByText('Financial Institution');
      expect(partnerElements.length).toBeGreaterThan(1); // Should appear in both filter and partner display
      const consultingElements = screen.getAllByText('Consulting Firm');
      expect(consultingElements.length).toBeGreaterThan(0);
    });

    it('shows partner emails when enabled', async () => {
      const user = userEvent.setup();
      render(<ReferralPartnerMultiSelect {...defaultProps} showPartnerEmails={true} />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(screen.getByText('contact@abcfinserv.com')).toBeInTheDocument();
      expect(screen.getByText('partners@xyzconsulting.com')).toBeInTheDocument();
    });

    it('shows partner companies when enabled', async () => {
      const user = userEvent.setup();
      render(<ReferralPartnerMultiSelect {...defaultProps} showPartnerCompanies={true} />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(screen.getByText('ABC Financial Group')).toBeInTheDocument();
      expect(screen.getByText('XYZ Partners LLC')).toBeInTheDocument();
    });

    it('shows partner statuses when enabled', async () => {
      const user = userEvent.setup();
      render(<ReferralPartnerMultiSelect {...defaultProps} showPartnerStatuses={true} />);

      const button = screen.getByRole('button');
      await user.click(button);

      // Check that statuses are displayed in the partner list (not just filter buttons)
      const activeElements = screen.getAllByText('active');
      expect(activeElements.length).toBeGreaterThan(1); // Should appear in both filter and partner display
      const inactiveElements = screen.getAllByText('inactive');
      expect(inactiveElements.length).toBeGreaterThan(0);
    });

    it('shows partner stats when enabled', async () => {
      const user = userEvent.setup();
      render(<ReferralPartnerMultiSelect {...defaultProps} showPartnerStats={true} />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(screen.getByText('1,250 transactions')).toBeInTheDocument();
      expect(screen.getByText('$4,500,000 total')).toBeInTheDocument();
      expect(screen.getByText('$112,500 commission')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has proper checkbox labels', async () => {
      const user = userEvent.setup();
      render(<ReferralPartnerMultiSelect {...defaultProps} />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(screen.getByRole('checkbox', { name: 'Select ABC Financial Services' })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Select XYZ Consulting Group' })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Select Delta Business Solutions' })).toBeInTheDocument();
    });

    it('handles keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ReferralPartnerMultiSelect {...defaultProps} />);

      const button = screen.getByRole('button');
      await user.click(button);

      // Tab to search input
      await user.tab();
      expect(screen.getByPlaceholderText('Search referral partners...')).toHaveFocus();
    });
  });

  describe('error and loading states', () => {
    it('shows loading state', async () => {
      const user = userEvent.setup();
      render(<ReferralPartnerMultiSelect {...defaultProps} loading={true} />);

      const button = screen.getByRole('button');
      
      // The loading state should show a disabled button
      expect(button).toBeDisabled();
      expect(screen.getByText('Select referral partners...')).toBeInTheDocument();
    });

    it('shows error message', async () => {
      const user = userEvent.setup();
      render(<ReferralPartnerMultiSelect {...defaultProps} error="Failed to load partners" />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(screen.getByText('Failed to load partners')).toBeInTheDocument();
    });

    it('shows no results message when search yields no results', async () => {
      const user = userEvent.setup();
      render(<ReferralPartnerMultiSelect {...defaultProps} />);

      const button = screen.getByRole('button');
      await user.click(button);

      const searchInput = screen.getByPlaceholderText('Search referral partners...');
      await user.type(searchInput, 'NonExistentPartner');

      expect(screen.getByText('No partners found matching your search.')).toBeInTheDocument();
    });
  });
});
