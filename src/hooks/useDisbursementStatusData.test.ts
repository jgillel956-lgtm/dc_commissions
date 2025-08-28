import { renderHook, act, waitFor } from '@testing-library/react';
import { useDisbursementStatusData } from './useDisbursementStatusData';
import * as disbursementStatusApi from '../services/disbursementStatusApi';

// Mock the disbursement status API
jest.mock('../services/disbursementStatusApi', () => ({
  getMockDisbursementStatuses: jest.fn(),
  mockSearchDisbursementStatuses: jest.fn(),
  fetchAllDisbursementStatuses: jest.fn(),
  searchDisbursementStatuses: jest.fn(),
  getDisbursementStatusById: jest.fn(),
  getDisbursementStatusesByValues: jest.fn(),
  getDisbursementStatusStats: jest.fn(),
  getActiveDisbursementStatuses: jest.fn(),
  getDisbursementStatusByValue: jest.fn(),
  getDisbursementStatusesByIds: jest.fn(),
}));

const mockedDisbursementStatusApi = disbursementStatusApi as jest.Mocked<typeof disbursementStatusApi>;

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

describe('useDisbursementStatusData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDisbursementStatusApi.getMockDisbursementStatuses.mockReturnValue(mockDisbursementStatuses);
    mockedDisbursementStatusApi.mockSearchDisbursementStatuses.mockReturnValue(mockDisbursementStatuses);
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useDisbursementStatusData());

      expect(result.current.disbursementStatuses).toBeUndefined();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.searchTerm).toBe('');
      expect(result.current.selectedIds).toEqual([]);
      expect(result.current.selectedDisbursementStatuses).toEqual([]);
      expect(result.current.filteredDisbursementStatuses).toEqual([]);
    });

    it('should initialize with provided selected IDs', () => {
      const { result } = renderHook(() => 
        useDisbursementStatusData({ initialSelectedIds: ['1', '2'] })
      );

      expect(result.current.selectedIds).toEqual(['1', '2']);
    });

    it('should load disbursement statuses on mount when autoLoad is true', async () => {
      const { result } = renderHook(() => 
        useDisbursementStatusData({ useMockData: true, autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.disbursementStatuses).toHaveLength(3);
    });
  });

  describe('Loading States', () => {
    it('should set loading to true when fetching data', async () => {
      // Mock the function to return a promise that resolves after a small delay
      mockedDisbursementStatusApi.getMockDisbursementStatuses.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockDisbursementStatuses), 10))
      );

      const { result } = renderHook(() =>
        useDisbursementStatusData({ useMockData: true, autoLoad: true })
      );

      // The loading should be true initially
      expect(result.current.loading).toBe(true);

      // Wait for the loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify the data was loaded
      expect(result.current.disbursementStatuses).toHaveLength(3);
    });

    it('should handle API errors', async () => {
      mockedDisbursementStatusApi.fetchAllDisbursementStatuses.mockRejectedValue(
        new Error('Failed to fetch disbursement statuses')
      );

      const { result } = renderHook(() =>
        useDisbursementStatusData({ useMockData: false })
      );

      await act(async () => {
        await result.current.loadDisbursementStatuses();
      });

      expect(result.current.error).toBe('Failed to fetch disbursement statuses');
      expect(result.current.loading).toBe(false);
    });
  });

  describe('Selection Management', () => {
    it('should add disbursement status to selection', () => {
      const { result } = renderHook(() => useDisbursementStatusData());

      act(() => {
        result.current.selectDisbursementStatus('1');
      });

      expect(result.current.selectedIds).toEqual(['1']);
    });

    it('should remove disbursement status from selection', () => {
      const { result } = renderHook(() => 
        useDisbursementStatusData({ initialSelectedIds: ['1', '2'] })
      );

      act(() => {
        result.current.deselectDisbursementStatus('1');
      });

      expect(result.current.selectedIds).toEqual(['2']);
    });

    it('should toggle disbursement status selection', () => {
      const { result } = renderHook(() => useDisbursementStatusData());

      act(() => {
        result.current.toggleDisbursementStatus('1');
      });

      expect(result.current.selectedIds).toEqual(['1']);

      act(() => {
        result.current.toggleDisbursementStatus('1');
      });

      expect(result.current.selectedIds).toEqual([]);
    });

    it('should clear all selections', () => {
      const { result } = renderHook(() => 
        useDisbursementStatusData({ initialSelectedIds: ['1', '2'] })
      );

      act(() => {
        result.current.deselectAllDisbursementStatuses();
      });

      expect(result.current.selectedIds).toEqual([]);
    });

    it('should select all disbursement statuses', async () => {
      const { result } = renderHook(() => 
        useDisbursementStatusData({ useMockData: true, autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.disbursementStatuses).toHaveLength(3);
      });

      act(() => {
        result.current.selectAllDisbursementStatuses();
      });

      expect(result.current.selectedIds).toEqual(['1', '2', '3']);
    });
  });

  describe('Search Functionality', () => {
    it('should perform search with debouncing', async () => {
      const { result } = renderHook(() => 
        useDisbursementStatusData({ useMockData: true, autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.disbursementStatuses).toHaveLength(3);
      });

      mockedDisbursementStatusApi.mockSearchDisbursementStatuses.mockReturnValue([mockDisbursementStatuses[0]]);

      act(() => {
        result.current.setSearchTerm('pending');
      });

      expect(result.current.searchTerm).toBe('pending');
      expect(result.current.filteredDisbursementStatuses).toHaveLength(1);
    });

    it('should clear search results when search term is empty', async () => {
      const { result } = renderHook(() => 
        useDisbursementStatusData({ useMockData: true, autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.disbursementStatuses).toHaveLength(3);
      });

      act(() => {
        result.current.setSearchTerm('pending');
      });

      act(() => {
        result.current.setSearchTerm('');
      });

      expect(result.current.filteredDisbursementStatuses).toHaveLength(3);
    });
  });

  describe('Filtered Data', () => {
    it('should filter disbursement statuses by search term', async () => {
      const { result } = renderHook(() => 
        useDisbursementStatusData({ useMockData: true, autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.disbursementStatuses).toHaveLength(3);
      });

      mockedDisbursementStatusApi.mockSearchDisbursementStatuses.mockReturnValue([mockDisbursementStatuses[0]]);

      act(() => {
        result.current.setSearchTerm('pending');
      });

      expect(result.current.filteredDisbursementStatuses).toHaveLength(1);
      expect(result.current.filteredDisbursementStatuses[0].value).toBe('pending');
    });
  });

  describe('Selected Disbursement Statuses', () => {
    it('should return selected disbursement statuses', async () => {
      const { result } = renderHook(() => 
        useDisbursementStatusData({ 
          useMockData: true, 
          autoLoad: true,
          initialSelectedIds: ['1', '2']
        })
      );

      await waitFor(() => {
        expect(result.current.disbursementStatuses).toHaveLength(3);
      });

      expect(result.current.selectedDisbursementStatuses).toHaveLength(2);
      expect(result.current.selectedDisbursementStatuses[0].value).toBe('pending');
      expect(result.current.selectedDisbursementStatuses[1].value).toBe('completed');
    });
  });

  describe('Statistics', () => {
    it('should calculate statistics for selected disbursement statuses', async () => {
      const { result } = renderHook(() => 
        useDisbursementStatusData({ 
          useMockData: true, 
          autoLoad: true,
          initialSelectedIds: ['1', '2']
        })
      );

      await waitFor(() => {
        expect(result.current.disbursementStatuses).toHaveLength(3);
      });

      expect(result.current.stats.totalStatuses).toBe(3);
      expect(result.current.stats.selectedStatuses).toBe(2);
      expect(result.current.stats.totalTransactions).toBe(29880);
      expect(result.current.stats.selectedTransactions).toBe(29700);
      expect(result.current.stats.totalAmount).toBe(13025000);
      expect(result.current.stats.selectedAmount).toBe(12950000);
    });
  });

  describe('Utility Functions', () => {
    it('should check if disbursement status is selected', () => {
      const { result } = renderHook(() => 
        useDisbursementStatusData({ initialSelectedIds: ['1'] })
      );

      expect(result.current.isSelected('1')).toBe(true);
      expect(result.current.isSelected('2')).toBe(false);
    });

    it('should get disbursement status by ID', async () => {
      const { result } = renderHook(() => 
        useDisbursementStatusData({ useMockData: true, autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.disbursementStatuses).toHaveLength(3);
      });

      const status = result.current.getDisbursementStatusById('1');
      expect(status?.value).toBe('pending');
    });

    it('should return undefined for non-existent disbursement status ID', async () => {
      const { result } = renderHook(() => 
        useDisbursementStatusData({ useMockData: true, autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.disbursementStatuses).toHaveLength(3);
      });

      const status = result.current.getDisbursementStatusById('999');
      expect(status).toBeUndefined();
    });
  });

  describe('Data Loading', () => {
    it('should load disbursement statuses manually', async () => {
      const { result } = renderHook(() => 
        useDisbursementStatusData({ useMockData: true })
      );

      await act(async () => {
        await result.current.loadDisbursementStatuses();
      });

      expect(result.current.disbursementStatuses).toHaveLength(3);
      expect(result.current.loading).toBe(false);
    });

    it('should handle loading errors gracefully', async () => {
      mockedDisbursementStatusApi.getMockDisbursementStatuses.mockImplementation(() => {
        throw new Error('Network error');
      });

      const { result } = renderHook(() => 
        useDisbursementStatusData({ useMockData: true })
      );

      await act(async () => {
        await result.current.loadDisbursementStatuses();
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.loading).toBe(false);
    });
  });
});
