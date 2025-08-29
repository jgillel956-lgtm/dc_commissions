import { renderHook, waitFor, act } from '@testing-library/react';
import { useReferralPartnerData } from './useReferralPartnerData';
import * as referralPartnerApi from '../services/referralPartnerApi';
import { ReferralPartner } from '../services/referralPartnerApi';

// Mock the referral partner API
jest.mock('../services/referralPartnerApi', () => ({
  fetchAllReferralPartners: jest.fn(),
  searchReferralPartners: jest.fn(),
  getReferralPartnerById: jest.fn(),
  getReferralPartnersByType: jest.fn(),
  getReferralPartnersByStatus: jest.fn(),
  getReferralPartnerTypes: jest.fn(),
  getReferralPartnerStats: jest.fn(),
  getMockReferralPartners: jest.fn(),
  mockSearchReferralPartners: jest.fn(),
}));

const mockedReferralPartnerApi = referralPartnerApi as jest.Mocked<typeof referralPartnerApi>;

// Mock referral partners for testing
const mockReferralPartners: ReferralPartner[] = [
  {
    id: '1',
    name: 'ABC Financial Services',
    code: 'ABC001',
    type: 'Financial Institution',
    email: 'contact@abcfinserv.com',
    company: 'ABC Financial Group',
    status: 'active',
    commission_rate: 2.5,
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
    company: 'XYZ Partners LLC',
    status: 'active',
    commission_rate: 3.0,
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
    company: 'Delta Solutions Inc',
    status: 'inactive',
    commission_rate: 2.0,
    total_transactions: 2100,
    total_amount: 7800000,
    total_commission: 156000,
    created_at: '2023-03-10T13:20:00Z',
    updated_at: '2024-01-20T16:15:00Z'
  }
];

describe('useReferralPartnerData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedReferralPartnerApi.getMockReferralPartners.mockReturnValue(mockReferralPartners);
    mockedReferralPartnerApi.mockSearchReferralPartners.mockImplementation((searchTerm: string) => {
      if (!searchTerm) return mockReferralPartners;
      const lowerSearchTerm = searchTerm.toLowerCase();
      return mockReferralPartners.filter(partner => 
        partner.name.toLowerCase().includes(lowerSearchTerm) ||
        partner.code?.toLowerCase().includes(lowerSearchTerm) ||
        partner.email?.toLowerCase().includes(lowerSearchTerm) ||
        partner.company?.toLowerCase().includes(lowerSearchTerm) ||
        partner.type?.toLowerCase().includes(lowerSearchTerm)
      );
    });
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useReferralPartnerData());

      expect(result.current.referralPartners).toBeUndefined();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.searchTerm).toBe('');
      expect(result.current.selectedIds).toEqual([]);
      expect(result.current.selectedTypes).toEqual([]);
      expect(result.current.selectedStatuses).toEqual([]);
    });

    it('should initialize with provided selected IDs', () => {
      const { result } = renderHook(() => 
        useReferralPartnerData({ initialSelectedIds: ['1', '2'] })
      );

      expect(result.current.selectedIds).toEqual(['1', '2']);
    });

    it('should not auto-load data by default', () => {
      const { result } = renderHook(() => useReferralPartnerData());

      expect(result.current.referralPartners).toBeUndefined();
      expect(mockedReferralPartnerApi.getMockReferralPartners).not.toHaveBeenCalled();
    });

    it('should auto-load data when autoLoad is true', async () => {
      const { result } = renderHook(() => 
        useReferralPartnerData({ autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.referralPartners).toHaveLength(3);
      });

      expect(mockedReferralPartnerApi.getMockReferralPartners).toHaveBeenCalled();
    });
  });

  describe('loading states', () => {
    it('should set loading to true when fetching data', async () => {
      // Mock the function to return a promise that resolves after a small delay
      mockedReferralPartnerApi.getMockReferralPartners.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockReferralPartners), 10))
      );

      const { result } = renderHook(() =>
        useReferralPartnerData({ useMockData: true, autoLoad: true })
      );

      // The loading should be true initially
      expect(result.current.loading).toBe(true);

      // Wait for the loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify the data was loaded
      expect(result.current.referralPartners).toHaveLength(3);
    });

    it('should handle loading errors', async () => {
      const errorMessage = 'Failed to load referral partners';
      mockedReferralPartnerApi.getMockReferralPartners.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      const { result } = renderHook(() =>
        useReferralPartnerData({ useMockData: true, autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
        expect(result.current.loading).toBe(false);
      }, { timeout: 5000 });
    });
  });

  describe('selection management', () => {
    it('should select a referral partner', async () => {
      const { result } = renderHook(() => useReferralPartnerData());

      await act(async () => {
        result.current.selectReferralPartner('1');
      });

      await waitFor(() => {
        expect(result.current.selectedIds).toEqual(['1']);
      });
    });

    it('should not duplicate selected IDs', async () => {
      const { result } = renderHook(() => 
        useReferralPartnerData({ initialSelectedIds: ['1'] })
      );

      await act(async () => {
        result.current.selectReferralPartner('1');
      });

      expect(result.current.selectedIds).toEqual(['1']);
    });

    it('should deselect a referral partner', async () => {
      const { result } = renderHook(() => 
        useReferralPartnerData({ initialSelectedIds: ['1', '2'] })
      );

      await act(async () => {
        result.current.deselectReferralPartner('1');
      });

      await waitFor(() => {
        expect(result.current.selectedIds).toEqual(['2']);
      });
    });

    it('should toggle referral partner selection', async () => {
      const { result } = renderHook(() => useReferralPartnerData());

      await act(async () => {
        result.current.toggleReferralPartner('1');
      });
      await waitFor(() => {
        expect(result.current.selectedIds).toEqual(['1']);
      });

      await act(async () => {
        result.current.toggleReferralPartner('1');
      });
      await waitFor(() => {
        expect(result.current.selectedIds).toEqual([]);
      });
    });

    it('should select all referral partners', async () => {
      const { result } = renderHook(() => 
        useReferralPartnerData({ autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.referralPartners).toHaveLength(3);
      });

      await act(async () => {
        result.current.selectAllReferralPartners();
      });

      await waitFor(() => {
        expect(result.current.selectedIds).toEqual(['1', '3', '2']);
      });
    });

    it('should deselect all referral partners', async () => {
      const { result } = renderHook(() => 
        useReferralPartnerData({ initialSelectedIds: ['1', '2'] })
      );

      await act(async () => {
        result.current.deselectAllReferralPartners();
      });

      await waitFor(() => {
        expect(result.current.selectedIds).toEqual([]);
      });
    });

    it('should set selected IDs directly', async () => {
      const { result } = renderHook(() => useReferralPartnerData());

      await act(async () => {
        result.current.setSelectedIds(['1', '2']);
      });

      await waitFor(() => {
        expect(result.current.selectedIds).toEqual(['1', '2']);
      });
    });
  });

  describe('search functionality', () => {
    it('should update search term', async () => {
      const { result } = renderHook(() => useReferralPartnerData());

      await act(async () => {
        result.current.setSearchTerm('ABC');
      });

      await waitFor(() => {
        expect(result.current.searchTerm).toBe('ABC');
      });
    });

    it('should filter referral partners by search term', async () => {
      const { result } = renderHook(() => 
        useReferralPartnerData({ autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.referralPartners).toHaveLength(3);
      });

      await act(async () => {
        result.current.setSearchTerm('ABC');
      });

      await waitFor(() => {
        expect(result.current.filteredReferralPartners).toHaveLength(1);
        expect(result.current.filteredReferralPartners[0].name).toBe('ABC Financial Services');
      });
    });
  });

  describe('filtered data', () => {
    beforeEach(async () => {
      mockedReferralPartnerApi.getMockReferralPartners.mockReturnValue(mockReferralPartners);
    });

    it('should return all referral partners when no filters are applied', async () => {
      const { result } = renderHook(() => 
        useReferralPartnerData({ autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.filteredReferralPartners).toHaveLength(3);
      });
    });

    it('should filter by selected types', async () => {
      const { result } = renderHook(() => 
        useReferralPartnerData({ autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.referralPartners).toHaveLength(3);
      });

      await act(async () => {
        result.current.addTypeFilter('Financial Institution');
      });

      await waitFor(() => {
        expect(result.current.filteredReferralPartners).toHaveLength(1);
        expect(result.current.filteredReferralPartners[0].type).toBe('Financial Institution');
      });
    });

    it('should filter by selected statuses', async () => {
      const { result } = renderHook(() => 
        useReferralPartnerData({ autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.referralPartners).toHaveLength(3);
      });

      await act(async () => {
        result.current.addStatusFilter('active');
      });

      await waitFor(() => {
        expect(result.current.filteredReferralPartners).toHaveLength(2);
        expect(result.current.filteredReferralPartners.every(p => p.status === 'active')).toBe(true);
      });
    });

    it('should remove type filter', async () => {
      const { result } = renderHook(() => 
        useReferralPartnerData({ autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.referralPartners).toHaveLength(3);
      });

      await act(async () => {
        result.current.addTypeFilter('Financial Institution');
      });
      await waitFor(() => {
        expect(result.current.filteredReferralPartners).toHaveLength(1);
      });

      await act(async () => {
        result.current.removeTypeFilter('Financial Institution');
      });
      await waitFor(() => {
        expect(result.current.filteredReferralPartners).toHaveLength(3);
      });
    });

    it('should remove status filter', async () => {
      const { result } = renderHook(() => 
        useReferralPartnerData({ autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.referralPartners).toHaveLength(3);
      });

      await act(async () => {
        result.current.addStatusFilter('active');
      });
      await waitFor(() => {
        expect(result.current.filteredReferralPartners).toHaveLength(2);
      });

      await act(async () => {
        result.current.removeStatusFilter('active');
      });
      await waitFor(() => {
        expect(result.current.filteredReferralPartners).toHaveLength(3);
      });
    });
  });

  describe('selected referral partners', () => {
    it('should return selected referral partners', async () => {
      const { result } = renderHook(() => 
        useReferralPartnerData({ initialSelectedIds: ['1', '2'], autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.referralPartners).toHaveLength(3);
      });

      expect(result.current.selectedReferralPartners).toHaveLength(2);
      expect(result.current.selectedReferralPartners.map(p => p.id)).toEqual(['1', '2']);
    });
  });

  describe('statistics', () => {
    it('should calculate statistics for all referral partners', async () => {
      const { result } = renderHook(() => 
        useReferralPartnerData({ autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.referralPartners).toHaveLength(3);
      });

      expect(result.current.stats.totalPartners).toBe(3);
      expect(result.current.stats.totalTransactions).toBe(4240);
      expect(result.current.stats.totalAmount).toBe(15500000);
      expect(result.current.stats.totalCommission).toBe(364500);
    });

    it('should calculate statistics for selected referral partners', async () => {
      const { result } = renderHook(() => 
        useReferralPartnerData({ initialSelectedIds: ['1', '2'], autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.referralPartners).toHaveLength(3);
      });

      expect(result.current.stats.selectedPartners).toBe(2);
      expect(result.current.stats.selectedTransactions).toBe(2140);
      expect(result.current.stats.selectedAmount).toBe(7700000);
      expect(result.current.stats.selectedCommission).toBe(208500);
    });
  });

  describe('utility functions', () => {
    it('should get referral partner by ID', async () => {
      const { result } = renderHook(() => 
        useReferralPartnerData({ autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.referralPartners).toHaveLength(3);
      });

      const partner = result.current.getReferralPartnerById('1');
      expect(partner?.name).toBe('ABC Financial Services');
    });

    it('should get referral partners by type', async () => {
      const { result } = renderHook(() => 
        useReferralPartnerData({ autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.referralPartners).toHaveLength(3);
      });

      const partners = result.current.getReferralPartnersByType('Financial Institution');
      expect(partners).toHaveLength(1);
      expect(partners[0].name).toBe('ABC Financial Services');
    });

    it('should get referral partners by status', async () => {
      const { result } = renderHook(() => 
        useReferralPartnerData({ autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.referralPartners).toHaveLength(3);
      });

      const partners = result.current.getReferralPartnersByStatus('active');
      expect(partners).toHaveLength(2);
      expect(partners.every(p => p.status === 'active')).toBe(true);
    });

    it('should get referral partner types', async () => {
      const { result } = renderHook(() => 
        useReferralPartnerData({ autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.referralPartners).toHaveLength(3);
      });

      const types = result.current.getReferralPartnerTypes();
      expect(types).toEqual(['Business Services', 'Consulting Firm', 'Financial Institution']);
    });

    it('should check if referral partner is selected', () => {
      const { result } = renderHook(() => 
        useReferralPartnerData({ initialSelectedIds: ['1'] })
      );

      expect(result.current.isSelected('1')).toBe(true);
      expect(result.current.isSelected('2')).toBe(false);
    });
  });

  describe('manual data loading', () => {
    it('should load referral partners manually', async () => {
      const { result } = renderHook(() => useReferralPartnerData());

      expect(result.current.referralPartners).toBeUndefined();

      await act(async () => {
        await result.current.loadReferralPartners();
      });

      await waitFor(() => {
        expect(result.current.referralPartners).toHaveLength(3);
      });
    });
  });
});
