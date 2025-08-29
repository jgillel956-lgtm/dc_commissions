import { renderHook, act, waitFor } from '@testing-library/react';
import { useCommissionTypeData } from './useCommissionTypeData';

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  })),
}));

// Mock the commission type API
jest.mock('../services/commissionTypeApi', () => ({
  fetchCommissionTypes: jest.fn(),
  fetchAllCommissionTypes: jest.fn(),
  searchCommissionTypes: jest.fn(),
  getCommissionTypeById: jest.fn(),
  getCommissionTypesByCategory: jest.fn(),
  getMockCommissionTypes: jest.fn(),
  mockSearchCommissionTypes: jest.fn(),
  getCommissionTypeCategories: jest.fn(),
  getCommissionTypeStats: jest.fn(),
}));

import * as commissionTypeApi from '../services/commissionTypeApi';
const mockedCommissionTypeApi = commissionTypeApi as jest.Mocked<typeof commissionTypeApi>;

describe('useCommissionTypeData', () => {
  const mockCommissionTypes = [
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
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockedCommissionTypeApi.getMockCommissionTypes.mockReturnValue(mockCommissionTypes);
    mockedCommissionTypeApi.mockSearchCommissionTypes.mockReturnValue(mockCommissionTypes);
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useCommissionTypeData());

      expect(result.current.commissionTypes).toBeUndefined();
      expect(result.current.selectedIds).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.searchTerm).toBe('');
      expect(result.current.selectedCategories).toEqual([]);
    });

    it('should initialize with provided selected IDs', () => {
      const { result } = renderHook(() => 
        useCommissionTypeData({ initialSelectedIds: ['emp-001', 'ref-001'] })
      );

      expect(result.current.selectedIds).toEqual(['emp-001', 'ref-001']);
    });

    it('should load commission types on mount when useMockData is true', async () => {
      const { result } = renderHook(() => 
        useCommissionTypeData({ useMockData: true, autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.commissionTypes).toHaveLength(3);
      expect(result.current.commissionTypes[0].name).toBe('Employee Commission');
    });
  });

  describe('Loading States', () => {
    it('should set loading to true when fetching data', async () => {
      // Mock the function to return a promise that resolves after a small delay
      mockedCommissionTypeApi.getMockCommissionTypes.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockCommissionTypes), 10))
      );

      const { result } = renderHook(() => 
        useCommissionTypeData({ useMockData: true, autoLoad: true })
      );

      // The loading should be true initially
      expect(result.current.loading).toBe(true);

      // Wait for the loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify the data was loaded
      expect(result.current.commissionTypes).toHaveLength(3);
    });

    it('should handle API errors', async () => {
      const errorMessage = 'Failed to fetch commission types';
      mockedCommissionTypeApi.getMockCommissionTypes.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      const { result } = renderHook(() => 
        useCommissionTypeData({ useMockData: true, autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('Selection Management', () => {
    it('should add commission type to selection', () => {
      const { result } = renderHook(() => useCommissionTypeData());

      act(() => {
        result.current.addToSelection('emp-001');
      });

      expect(result.current.selectedIds).toContain('emp-001');
    });

    it('should remove commission type from selection', () => {
      const { result } = renderHook(() => 
        useCommissionTypeData({ initialSelectedIds: ['emp-001', 'ref-001'] })
      );

      act(() => {
        result.current.removeFromSelection('emp-001');
      });

      expect(result.current.selectedIds).not.toContain('emp-001');
      expect(result.current.selectedIds).toContain('ref-001');
    });

    it('should toggle commission type selection', () => {
      const { result } = renderHook(() => 
        useCommissionTypeData({ initialSelectedIds: ['emp-001'] })
      );

      act(() => {
        result.current.toggleSelection('emp-001');
      });

      expect(result.current.selectedIds).not.toContain('emp-001');

      act(() => {
        result.current.toggleSelection('emp-001');
      });

      expect(result.current.selectedIds).toContain('emp-001');
    });

    it('should clear all selections', () => {
      const { result } = renderHook(() => 
        useCommissionTypeData({ initialSelectedIds: ['emp-001', 'ref-001'] })
      );

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedIds).toEqual([]);
    });

    it('should select all commission types', async () => {
      const { result } = renderHook(() => 
        useCommissionTypeData({ useMockData: true, autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedIds).toHaveLength(3);
      expect(result.current.selectedIds).toContain('emp-001');
      expect(result.current.selectedIds).toContain('ref-001');
      expect(result.current.selectedIds).toContain('int-001');
    });
  });

  describe('Search Functionality', () => {
    it('should perform search with debouncing', async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => 
        useCommissionTypeData({ useMockData: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setSearchTerm('employee');
      });

      expect(result.current.searchTerm).toBe('employee');

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockedCommissionTypeApi.mockSearchCommissionTypes).toHaveBeenCalledWith('employee');
      });

      jest.useRealTimers();
    });

    it('should clear search results when search term is empty', async () => {
      const { result } = renderHook(() => 
        useCommissionTypeData({ useMockData: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setSearchTerm('employee');
      });

      act(() => {
        result.current.setSearchTerm('');
      });

      expect(result.current.searchResults).toEqual([]);
    });
  });

  describe('Category Filtering', () => {
    it('should add category to filter', () => {
      const { result } = renderHook(() => useCommissionTypeData());

      act(() => {
        result.current.addCategoryFilter('employee');
      });

      expect(result.current.selectedCategories).toContain('employee');
    });

    it('should remove category from filter', () => {
      const { result } = renderHook(() => 
        useCommissionTypeData({ initialSelectedCategories: ['employee', 'referral_partner'] })
      );

      // First add the categories
      act(() => {
        result.current.addCategoryFilter('employee');
        result.current.addCategoryFilter('referral_partner');
      });

      // Then remove one
      act(() => {
        result.current.removeCategoryFilter('employee');
      });

      expect(result.current.selectedCategories).not.toContain('employee');
      expect(result.current.selectedCategories).toContain('referral_partner');
    });

    it('should toggle category filter', () => {
      const { result } = renderHook(() => useCommissionTypeData());

      act(() => {
        result.current.toggleCategoryFilter('employee');
      });

      expect(result.current.selectedCategories).toContain('employee');

      act(() => {
        result.current.toggleCategoryFilter('employee');
      });

      expect(result.current.selectedCategories).not.toContain('employee');
    });

    it('should clear all category filters', () => {
      const { result } = renderHook(() => 
        useCommissionTypeData({ initialSelectedCategories: ['employee', 'referral_partner'] })
      );

      act(() => {
        result.current.clearCategoryFilters();
      });

      expect(result.current.selectedCategories).toEqual([]);
    });
  });

  describe('Filtered Data', () => {
    it('should filter commission types by selected categories', async () => {
      const { result } = renderHook(() => 
        useCommissionTypeData({ useMockData: true, autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.addCategoryFilter('employee');
      });

      expect(result.current.filteredCommissionTypes).toHaveLength(1);
      expect(result.current.filteredCommissionTypes[0].category).toBe('employee');
    });

    it('should filter commission types by search term', async () => {
      const { result } = renderHook(() => 
        useCommissionTypeData({ useMockData: true, autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockedCommissionTypeApi.mockSearchCommissionTypes.mockReturnValue([mockCommissionTypes[0]]);

      act(() => {
        result.current.setSearchTerm('employee');
      });

      await waitFor(() => {
        expect(result.current.searchResults).toHaveLength(1);
      });
    });

    it('should combine search and category filtering', async () => {
      const { result } = renderHook(() => 
        useCommissionTypeData({ useMockData: true, autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.addCategoryFilter('employee');
        result.current.setSearchTerm('employee commission');
      });

      expect(result.current.filteredCommissionTypes).toHaveLength(1);
      expect(result.current.filteredCommissionTypes[0].name).toBe('Employee Commission');
    });
  });

  describe('Selected Commission Types', () => {
    it('should return selected commission types', async () => {
      const { result } = renderHook(() => 
        useCommissionTypeData({ 
          useMockData: true,
          autoLoad: true,
          initialSelectedIds: ['emp-001', 'ref-001']
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.selectedCommissionTypes).toHaveLength(2);
      expect(result.current.selectedCommissionTypes[0].name).toBe('Employee Commission');
      expect(result.current.selectedCommissionTypes[1].name).toBe('Referral Partner Commission');
    });
  });

  describe('Statistics', () => {
    it('should calculate statistics for selected commission types', async () => {
      const { result } = renderHook(() => 
        useCommissionTypeData({ 
          useMockData: true,
          autoLoad: true,
          initialSelectedIds: ['emp-001', 'ref-001']
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.stats.totalSelected).toBe(2);
      expect(result.current.stats.totalCommissionRate).toBe(8.5);
      expect(result.current.stats.selectedTotalCommissions).toBe(23500);
      expect(result.current.stats.selectedTotalTransactions).toBe(235);
    });
  });

  describe('Utility Functions', () => {
    it('should check if commission type is selected', () => {
      const { result } = renderHook(() => 
        useCommissionTypeData({ initialSelectedIds: ['emp-001'] })
      );

      expect(result.current.isSelected('emp-001')).toBe(true);
      expect(result.current.isSelected('ref-001')).toBe(false);
    });

    it('should get commission type by ID', async () => {
      const { result } = renderHook(() => 
        useCommissionTypeData({ useMockData: true, autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const commissionType = result.current.getCommissionTypeById('emp-001');
      expect(commissionType?.name).toBe('Employee Commission');
    });

    it('should return undefined for non-existent commission type ID', async () => {
      const { result } = renderHook(() => 
        useCommissionTypeData({ useMockData: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const commissionType = result.current.getCommissionTypeById('non-existent');
      expect(commissionType).toBeUndefined();
    });
  });

  describe('Data Loading', () => {
    it('should load commission types manually', async () => {
      const { result } = renderHook(() => useCommissionTypeData());

      act(() => {
        result.current.loadCommissionTypes();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.commissionTypes).toHaveLength(3);
    });

    it('should handle loading errors gracefully', async () => {
      const errorMessage = 'Network error';
      mockedCommissionTypeApi.getMockCommissionTypes.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      const { result } = renderHook(() => useCommissionTypeData());

      act(() => {
        result.current.loadCommissionTypes();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.commissionTypes).toBeUndefined();
    });
  });
});
