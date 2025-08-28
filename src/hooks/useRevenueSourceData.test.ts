import { renderHook, act, waitFor } from '@testing-library/react';
import { useRevenueSourceData } from './useRevenueSourceData';
import { getMockRevenueSources, mockSearchRevenueSources } from '../services/revenueSourceApi';

// Mock the revenue source API
jest.mock('../services/revenueSourceApi', () => ({
  fetchAllRevenueSources: jest.fn(),
  searchRevenueSources: jest.fn(),
  getMockRevenueSources: jest.fn(),
  mockSearchRevenueSources: jest.fn()
}));

describe('useRevenueSourceData', () => {
  const mockRevenueSources = [
    { id: 1, name: 'Transaction Processing Fee', code: 'TPF', type: 'transaction', category: 'Processing Fees', description: 'Standard transaction processing fees', is_active: true, default_rate: 2.9 },
    { id: 2, name: 'Payor Processing Fee', code: 'PPF', type: 'payor', category: 'Payor Fees', description: 'Fees charged to payors for processing', is_active: true, default_rate: 1.5 },
    { id: 3, name: 'Interest on Reserves', code: 'IOR', type: 'interest', category: 'Reserve Interest', description: 'Interest earned on reserve accounts', is_active: true, default_rate: 2.5 },
    { id: 4, name: 'Late Payment Fee', code: 'LPF', type: 'other', category: 'Penalty Fees', description: 'Fees for late payments', is_active: true, default_rate: 15.0 },
    { id: 5, name: 'Transaction Settlement Fee', code: 'TSF', type: 'transaction', category: 'Settlement Fees', description: 'Fees for transaction settlement services', is_active: true, default_rate: 0.25 }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (getMockRevenueSources as jest.Mock).mockReturnValue(mockRevenueSources);
    (mockSearchRevenueSources as jest.Mock).mockImplementation((term) => 
      mockRevenueSources.filter(source => 
        source.name.toLowerCase().includes(term.toLowerCase()) ||
        source.code.toLowerCase().includes(term.toLowerCase()) ||
        source.description?.toLowerCase().includes(term.toLowerCase()) ||
        source.category.toLowerCase().includes(term.toLowerCase())
      )
    );
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useRevenueSourceData({ autoLoad: false }));

    expect(result.current.revenueSources).toEqual([]);
    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.searchTerm).toBe('');
    expect(result.current.isSearching).toBe(false);
    expect(result.current.selectedTypes).toEqual([]);
    expect(result.current.selectedCategories).toEqual([]);
  });

  it('should load revenue sources on mount when autoLoad is true', async () => {
    const { result } = renderHook(() => useRevenueSourceData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.revenueSources).toEqual(mockRevenueSources);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should not load revenue sources when autoLoad is false', () => {
    const { result } = renderHook(() => useRevenueSourceData({ autoLoad: false }));

    expect(result.current.revenueSources).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should initialize with selected revenue source IDs', () => {
    const initialSelectedIds = [1, 3];
    const { result } = renderHook(() => 
      useRevenueSourceData({ initialSelectedIds, autoLoad: false })
    );

    expect(result.current.selectedIds).toEqual(initialSelectedIds);
  });

  it('should toggle revenue source selection', () => {
    const { result } = renderHook(() => useRevenueSourceData({ autoLoad: false }));

    act(() => {
      result.current.toggleRevenueSource(1);
    });

    expect(result.current.selectedIds).toEqual([1]);

    act(() => {
      result.current.toggleRevenueSource(1);
    });

    expect(result.current.selectedIds).toEqual([]);
  });

  it('should select and deselect revenue sources', () => {
    const { result } = renderHook(() => useRevenueSourceData({ autoLoad: false }));

    act(() => {
      result.current.selectRevenueSource(1);
    });

    expect(result.current.selectedIds).toEqual([1]);

    act(() => {
      result.current.selectRevenueSource(2);
    });

    expect(result.current.selectedIds).toEqual([1, 2]);

    act(() => {
      result.current.deselectRevenueSource(1);
    });

    expect(result.current.selectedIds).toEqual([2]);
  });

  it('should select all revenue sources', async () => {
    const { result } = renderHook(() => useRevenueSourceData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.revenueSources).toEqual(mockRevenueSources);
    });

    act(() => {
      result.current.selectAllRevenueSources();
    });

    expect(result.current.selectedIds).toEqual([1, 2, 3, 4, 5]);
  });

  it('should deselect all revenue sources', () => {
    const { result } = renderHook(() => 
      useRevenueSourceData({ initialSelectedIds: [1, 2, 3], autoLoad: false })
    );

    act(() => {
      result.current.deselectAllRevenueSources();
    });

    expect(result.current.selectedIds).toEqual([]);
  });

  it('should set selected IDs', () => {
    const { result } = renderHook(() => useRevenueSourceData({ autoLoad: false }));

    act(() => {
      result.current.setSelectedIds([1, 2]);
    });

    expect(result.current.selectedIds).toEqual([1, 2]);
  });

  it('should get revenue source by ID', async () => {
    const { result } = renderHook(() => useRevenueSourceData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.revenueSources).toEqual(mockRevenueSources);
    });

    const revenueSource = result.current.getRevenueSourceById(1);
    expect(revenueSource).toEqual(mockRevenueSources[0]);
  });

  it('should get revenue sources by IDs', async () => {
    const { result } = renderHook(() => useRevenueSourceData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.revenueSources).toEqual(mockRevenueSources);
    });

    const revenueSources = result.current.getRevenueSourcesByIds([1, 3]);
    expect(revenueSources).toEqual([mockRevenueSources[0], mockRevenueSources[2]]);
  });

  it('should return undefined for non-existent revenue source ID', async () => {
    const { result } = renderHook(() => useRevenueSourceData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.revenueSources).toEqual(mockRevenueSources);
    });

    const revenueSource = result.current.getRevenueSourceById(999);
    expect(revenueSource).toBeUndefined();
  });

  it('should filter revenue sources based on search term', async () => {
    const { result } = renderHook(() => useRevenueSourceData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.revenueSources).toEqual(mockRevenueSources);
    });

    act(() => {
      result.current.setSearchTerm('transaction');
    });

    await waitFor(() => {
      expect(result.current.searchResults).toHaveLength(2);
      expect(result.current.searchResults[0].name).toBe('Transaction Processing Fee');
      expect(result.current.searchResults[1].name).toBe('Transaction Settlement Fee');
    });
  });

  it('should handle empty search results', async () => {
    const { result } = renderHook(() => useRevenueSourceData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.revenueSources).toEqual(mockRevenueSources);
    });

    act(() => {
      result.current.setSearchTerm('nonexistent');
    });

    await waitFor(() => {
      expect(result.current.searchResults).toEqual([]);
    });
  });

  it('should return selected revenue sources', async () => {
    const { result } = renderHook(() => 
      useRevenueSourceData({ initialSelectedIds: [1, 2], autoLoad: true })
    );

    await waitFor(() => {
      expect(result.current.revenueSources).toEqual(mockRevenueSources);
    });

    expect(result.current.selectedRevenueSources).toEqual([mockRevenueSources[0], mockRevenueSources[1]]);
  });

  it('should return filtered revenue sources (search results when available)', async () => {
    const { result } = renderHook(() => useRevenueSourceData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.revenueSources).toEqual(mockRevenueSources);
    });

    act(() => {
      result.current.setSearchTerm('transaction');
    });

    await waitFor(() => {
      expect(result.current.filteredRevenueSources).toHaveLength(2);
      expect(result.current.filteredRevenueSources[0].name).toBe('Transaction Processing Fee');
      expect(result.current.filteredRevenueSources[1].name).toBe('Transaction Settlement Fee');
    });
  });

  it('should return all revenue sources when no search term', async () => {
    const { result } = renderHook(() => useRevenueSourceData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.revenueSources).toEqual(mockRevenueSources);
    });

    expect(result.current.filteredRevenueSources).toEqual(mockRevenueSources);
  });

  it('should sort revenue sources by name', async () => {
    const { result } = renderHook(() => useRevenueSourceData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.revenueSources).toEqual(mockRevenueSources);
    });

    act(() => {
      result.current.sortRevenueSources('name');
    });

    // Revenue sources should be sorted alphabetically by name
    expect(result.current.revenueSources[0].name).toBe('Interest on Reserves');
    expect(result.current.revenueSources[1].name).toBe('Late Payment Fee');
    expect(result.current.revenueSources[2].name).toBe('Payor Processing Fee');
  });

  it('should sort revenue sources by type', async () => {
    const { result } = renderHook(() => useRevenueSourceData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.revenueSources).toEqual(mockRevenueSources);
    });

    act(() => {
      result.current.sortRevenueSources('type');
    });

    // Revenue sources should be sorted alphabetically by type
    expect(result.current.revenueSources[0].type).toBe('interest');
    expect(result.current.revenueSources[1].type).toBe('other');
    expect(result.current.revenueSources[2].type).toBe('payor');
  });

  it('should sort revenue sources by category', async () => {
    const { result } = renderHook(() => useRevenueSourceData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.revenueSources).toEqual(mockRevenueSources);
    });

    act(() => {
      result.current.sortRevenueSources('category');
    });

    // Revenue sources should be sorted alphabetically by category
    expect(result.current.revenueSources[0].category).toBe('Payor Fees');
    expect(result.current.revenueSources[1].category).toBe('Penalty Fees');
    expect(result.current.revenueSources[2].category).toBe('Processing Fees');
  });

  it('should sort revenue sources by code', async () => {
    const { result } = renderHook(() => useRevenueSourceData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.revenueSources).toEqual(mockRevenueSources);
    });

    act(() => {
      result.current.sortRevenueSources('code');
    });

    // Revenue sources should be sorted alphabetically by code
    expect(result.current.revenueSources[0].code).toBe('IOR');
    expect(result.current.revenueSources[1].code).toBe('LPF');
    expect(result.current.revenueSources[2].code).toBe('PPF');
  });

  it('should refresh revenue sources', async () => {
    const { result } = renderHook(() => useRevenueSourceData({ autoLoad: false }));

    expect(result.current.revenueSources).toEqual([]);

    await act(async () => {
      await result.current.refreshRevenueSources();
    });

    expect(result.current.revenueSources).toEqual(mockRevenueSources);
  });

  it('should toggle type filter', () => {
    const { result } = renderHook(() => useRevenueSourceData({ autoLoad: false }));

    act(() => {
      result.current.toggleTypeFilter('transaction');
    });

    expect(result.current.selectedTypes).toEqual(['transaction']);

    act(() => {
      result.current.toggleTypeFilter('transaction');
    });

    expect(result.current.selectedTypes).toEqual([]);
  });

  it('should clear type filters', () => {
    const { result } = renderHook(() => 
      useRevenueSourceData({ autoLoad: false })
    );

    act(() => {
      result.current.toggleTypeFilter('transaction');
      result.current.toggleTypeFilter('payor');
    });

    expect(result.current.selectedTypes).toEqual(['transaction', 'payor']);

    act(() => {
      result.current.clearTypeFilters();
    });

    expect(result.current.selectedTypes).toEqual([]);
  });

  it('should get revenue sources by type', async () => {
    const { result } = renderHook(() => useRevenueSourceData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.revenueSources).toEqual(mockRevenueSources);
    });

    const transactionSources = result.current.getRevenueSourcesByType('transaction');
    expect(transactionSources).toHaveLength(2);
    expect(transactionSources[0].name).toBe('Transaction Processing Fee');
    expect(transactionSources[1].name).toBe('Transaction Settlement Fee');

    const payorSources = result.current.getRevenueSourcesByType('payor');
    expect(payorSources).toHaveLength(1);
    expect(payorSources[0].name).toBe('Payor Processing Fee');
  });

  it('should filter revenue sources by selected types', async () => {
    const { result } = renderHook(() => useRevenueSourceData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.revenueSources).toEqual(mockRevenueSources);
    });

    act(() => {
      result.current.toggleTypeFilter('transaction');
    });

    expect(result.current.filteredRevenueSources).toHaveLength(2);
    expect(result.current.filteredRevenueSources[0].type).toBe('transaction');
    expect(result.current.filteredRevenueSources[1].type).toBe('transaction');

    act(() => {
      result.current.toggleTypeFilter('payor');
    });

    expect(result.current.filteredRevenueSources).toHaveLength(3);
    expect(result.current.filteredRevenueSources.map(s => s.type)).toEqual(['transaction', 'transaction', 'payor']);
  });

  it('should toggle category filter', () => {
    const { result } = renderHook(() => useRevenueSourceData({ autoLoad: false }));

    act(() => {
      result.current.toggleCategoryFilter('Processing Fees');
    });

    expect(result.current.selectedCategories).toEqual(['Processing Fees']);

    act(() => {
      result.current.toggleCategoryFilter('Processing Fees');
    });

    expect(result.current.selectedCategories).toEqual([]);
  });

  it('should clear category filters', () => {
    const { result } = renderHook(() => 
      useRevenueSourceData({ autoLoad: false })
    );

    act(() => {
      result.current.toggleCategoryFilter('Processing Fees');
      result.current.toggleCategoryFilter('Payor Fees');
    });

    expect(result.current.selectedCategories).toEqual(['Processing Fees', 'Payor Fees']);

    act(() => {
      result.current.clearCategoryFilters();
    });

    expect(result.current.selectedCategories).toEqual([]);
  });

  it('should get revenue sources by category', async () => {
    const { result } = renderHook(() => useRevenueSourceData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.revenueSources).toEqual(mockRevenueSources);
    });

    const processingFees = result.current.getRevenueSourcesByCategory('Processing Fees');
    expect(processingFees).toHaveLength(1);
    expect(processingFees[0].name).toBe('Transaction Processing Fee');

    const payorFees = result.current.getRevenueSourcesByCategory('Payor Fees');
    expect(payorFees).toHaveLength(1);
    expect(payorFees[0].name).toBe('Payor Processing Fee');
  });

  it('should filter revenue sources by selected categories', async () => {
    const { result } = renderHook(() => useRevenueSourceData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.revenueSources).toEqual(mockRevenueSources);
    });

    act(() => {
      result.current.toggleCategoryFilter('Processing Fees');
    });

    expect(result.current.filteredRevenueSources).toHaveLength(1);
    expect(result.current.filteredRevenueSources[0].category).toBe('Processing Fees');

    act(() => {
      result.current.toggleCategoryFilter('Payor Fees');
    });

    expect(result.current.filteredRevenueSources).toHaveLength(2);
    expect(result.current.filteredRevenueSources.map(s => s.category)).toEqual(['Processing Fees', 'Payor Fees']);
  });

  it('should combine search and type filtering', async () => {
    const { result } = renderHook(() => useRevenueSourceData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.revenueSources).toEqual(mockRevenueSources);
    });

    act(() => {
      result.current.toggleTypeFilter('transaction');
      result.current.setSearchTerm('processing');
    });

    await waitFor(() => {
      expect(result.current.filteredRevenueSources).toHaveLength(1);
      expect(result.current.filteredRevenueSources[0].name).toBe('Transaction Processing Fee');
    });
  });

  it('should combine search and category filtering', async () => {
    const { result } = renderHook(() => useRevenueSourceData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.revenueSources).toEqual(mockRevenueSources);
    });

    act(() => {
      result.current.toggleCategoryFilter('Processing Fees');
      result.current.setSearchTerm('transaction');
    });

    await waitFor(() => {
      expect(result.current.filteredRevenueSources).toHaveLength(1);
      expect(result.current.filteredRevenueSources[0].name).toBe('Transaction Processing Fee');
    });
  });

  it('should provide statistics', async () => {
    const { result } = renderHook(() => useRevenueSourceData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.revenueSources).toEqual(mockRevenueSources);
    });

    expect(result.current.stats.total).toBe(5);
    expect(result.current.stats.byType).toEqual({
      transaction: 2,
      payor: 1,
      interest: 1,
      other: 1
    });
    expect(result.current.stats.byCategory).toEqual({
      'Processing Fees': 1,
      'Payor Fees': 1,
      'Reserve Interest': 1,
      'Penalty Fees': 1,
      'Settlement Fees': 1
    });
    expect(result.current.stats.active).toBe(5);
    expect(result.current.stats.inactive).toBe(0);
  });
});
