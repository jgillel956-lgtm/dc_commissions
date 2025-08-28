import { renderHook, act, waitFor } from '@testing-library/react';
import { usePaymentMethodData } from './usePaymentMethodData';
import { getMockPaymentMethods, mockSearchPaymentMethods } from '../services/paymentMethodApi';

// Mock the payment method API
jest.mock('../services/paymentMethodApi', () => ({
  fetchAllPaymentMethods: jest.fn(),
  searchPaymentMethods: jest.fn(),
  getMockPaymentMethods: jest.fn(),
  mockSearchPaymentMethods: jest.fn()
}));

describe('usePaymentMethodData', () => {
  const mockPaymentMethods = [
    { id: 1, name: 'Credit Card', code: 'CC', type: 'card', status: 'active', description: 'Credit card payments' },
    { id: 2, name: 'ACH Transfer', code: 'ACH', type: 'ach', status: 'active', description: 'Automated Clearing House transfers' },
    { id: 3, name: 'Wire Transfer', code: 'WIRE', type: 'wire', status: 'active', description: 'Wire transfer payments' },
    { id: 4, name: 'Check', code: 'CHECK', type: 'check', status: 'active', description: 'Paper check payments' },
    { id: 5, name: 'PayPal', code: 'PAYPAL', type: 'other', status: 'active', description: 'PayPal digital payments' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (getMockPaymentMethods as jest.Mock).mockReturnValue(mockPaymentMethods);
    (mockSearchPaymentMethods as jest.Mock).mockImplementation((term) => 
      mockPaymentMethods.filter(method => 
        method.name.toLowerCase().includes(term.toLowerCase()) ||
        method.code?.toLowerCase().includes(term.toLowerCase()) ||
        method.description?.toLowerCase().includes(term.toLowerCase())
      )
    );
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => usePaymentMethodData({ autoLoad: false }));

    expect(result.current.paymentMethods).toEqual([]);
    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.searchTerm).toBe('');
    expect(result.current.isSearching).toBe(false);
    expect(result.current.selectedTypes).toEqual([]);
  });

  it('should load payment methods on mount when autoLoad is true', async () => {
    const { result } = renderHook(() => usePaymentMethodData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.paymentMethods).toEqual(mockPaymentMethods);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should not load payment methods when autoLoad is false', () => {
    const { result } = renderHook(() => usePaymentMethodData({ autoLoad: false }));

    expect(result.current.paymentMethods).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should initialize with selected payment method IDs', () => {
    const initialSelectedIds = [1, 3];
    const { result } = renderHook(() => 
      usePaymentMethodData({ initialSelectedIds, autoLoad: false })
    );

    expect(result.current.selectedIds).toEqual(initialSelectedIds);
  });

  it('should toggle payment method selection', () => {
    const { result } = renderHook(() => usePaymentMethodData({ autoLoad: false }));

    act(() => {
      result.current.togglePaymentMethod(1);
    });

    expect(result.current.selectedIds).toEqual([1]);

    act(() => {
      result.current.togglePaymentMethod(1);
    });

    expect(result.current.selectedIds).toEqual([]);
  });

  it('should select and deselect payment methods', () => {
    const { result } = renderHook(() => usePaymentMethodData({ autoLoad: false }));

    act(() => {
      result.current.selectPaymentMethod(1);
    });

    expect(result.current.selectedIds).toEqual([1]);

    act(() => {
      result.current.selectPaymentMethod(2);
    });

    expect(result.current.selectedIds).toEqual([1, 2]);

    act(() => {
      result.current.deselectPaymentMethod(1);
    });

    expect(result.current.selectedIds).toEqual([2]);
  });

  it('should select all payment methods', async () => {
    const { result } = renderHook(() => usePaymentMethodData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.paymentMethods).toEqual(mockPaymentMethods);
    });

    act(() => {
      result.current.selectAllPaymentMethods();
    });

    expect(result.current.selectedIds).toEqual([1, 2, 3, 4, 5]);
  });

  it('should deselect all payment methods', () => {
    const { result } = renderHook(() => 
      usePaymentMethodData({ initialSelectedIds: [1, 2, 3], autoLoad: false })
    );

    act(() => {
      result.current.deselectAllPaymentMethods();
    });

    expect(result.current.selectedIds).toEqual([]);
  });

  it('should set selected IDs', () => {
    const { result } = renderHook(() => usePaymentMethodData({ autoLoad: false }));

    act(() => {
      result.current.setSelectedIds([1, 2]);
    });

    expect(result.current.selectedIds).toEqual([1, 2]);
  });

  it('should get payment method by ID', async () => {
    const { result } = renderHook(() => usePaymentMethodData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.paymentMethods).toEqual(mockPaymentMethods);
    });

    const paymentMethod = result.current.getPaymentMethodById(1);
    expect(paymentMethod).toEqual(mockPaymentMethods[0]);
  });

  it('should get payment methods by IDs', async () => {
    const { result } = renderHook(() => usePaymentMethodData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.paymentMethods).toEqual(mockPaymentMethods);
    });

    const paymentMethods = result.current.getPaymentMethodsByIds([1, 3]);
    expect(paymentMethods).toEqual([mockPaymentMethods[0], mockPaymentMethods[2]]);
  });

  it('should return undefined for non-existent payment method ID', async () => {
    const { result } = renderHook(() => usePaymentMethodData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.paymentMethods).toEqual(mockPaymentMethods);
    });

    const paymentMethod = result.current.getPaymentMethodById(999);
    expect(paymentMethod).toBeUndefined();
  });

  it('should filter payment methods based on search term', async () => {
    const { result } = renderHook(() => usePaymentMethodData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.paymentMethods).toEqual(mockPaymentMethods);
    });

    act(() => {
      result.current.setSearchTerm('credit');
    });

    await waitFor(() => {
      expect(result.current.searchResults).toHaveLength(1);
      expect(result.current.searchResults[0].name).toBe('Credit Card');
    });
  });

  it('should handle empty search results', async () => {
    const { result } = renderHook(() => usePaymentMethodData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.paymentMethods).toEqual(mockPaymentMethods);
    });

    act(() => {
      result.current.setSearchTerm('nonexistent');
    });

    await waitFor(() => {
      expect(result.current.searchResults).toEqual([]);
    });
  });

  it('should return selected payment methods', async () => {
    const { result } = renderHook(() => 
      usePaymentMethodData({ initialSelectedIds: [1, 2], autoLoad: true })
    );

    await waitFor(() => {
      expect(result.current.paymentMethods).toEqual(mockPaymentMethods);
    });

    expect(result.current.selectedPaymentMethods).toEqual([mockPaymentMethods[0], mockPaymentMethods[1]]);
  });

  it('should return filtered payment methods (search results when available)', async () => {
    const { result } = renderHook(() => usePaymentMethodData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.paymentMethods).toEqual(mockPaymentMethods);
    });

    act(() => {
      result.current.setSearchTerm('credit');
    });

    await waitFor(() => {
      expect(result.current.filteredPaymentMethods).toHaveLength(1);
      expect(result.current.filteredPaymentMethods[0].name).toBe('Credit Card');
    });
  });

  it('should return all payment methods when no search term', async () => {
    const { result } = renderHook(() => usePaymentMethodData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.paymentMethods).toEqual(mockPaymentMethods);
    });

    expect(result.current.filteredPaymentMethods).toEqual(mockPaymentMethods);
  });

  it('should sort payment methods by name', async () => {
    const { result } = renderHook(() => usePaymentMethodData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.paymentMethods).toEqual(mockPaymentMethods);
    });

    act(() => {
      result.current.sortPaymentMethods('name');
    });

    // Payment methods should be sorted alphabetically by name
    expect(result.current.paymentMethods[0].name).toBe('ACH Transfer');
    expect(result.current.paymentMethods[1].name).toBe('Check');
    expect(result.current.paymentMethods[2].name).toBe('Credit Card');
  });

  it('should sort payment methods by type', async () => {
    const { result } = renderHook(() => usePaymentMethodData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.paymentMethods).toEqual(mockPaymentMethods);
    });

    act(() => {
      result.current.sortPaymentMethods('type');
    });

    // Payment methods should be sorted alphabetically by type
    expect(result.current.paymentMethods[0].type).toBe('ach');
    expect(result.current.paymentMethods[1].type).toBe('card');
    expect(result.current.paymentMethods[2].type).toBe('check');
  });

  it('should sort payment methods by code', async () => {
    const { result } = renderHook(() => usePaymentMethodData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.paymentMethods).toEqual(mockPaymentMethods);
    });

    act(() => {
      result.current.sortPaymentMethods('code');
    });

    // Payment methods should be sorted alphabetically by code
    expect(result.current.paymentMethods[0].code).toBe('ACH');
    expect(result.current.paymentMethods[1].code).toBe('CC');
    expect(result.current.paymentMethods[2].code).toBe('CHECK');
  });

  it('should refresh payment methods', async () => {
    const { result } = renderHook(() => usePaymentMethodData({ autoLoad: false }));

    expect(result.current.paymentMethods).toEqual([]);

    await act(async () => {
      await result.current.refreshPaymentMethods();
    });

    expect(result.current.paymentMethods).toEqual(mockPaymentMethods);
  });

  it('should toggle type filter', () => {
    const { result } = renderHook(() => usePaymentMethodData({ autoLoad: false }));

    act(() => {
      result.current.toggleTypeFilter('card');
    });

    expect(result.current.selectedTypes).toEqual(['card']);

    act(() => {
      result.current.toggleTypeFilter('card');
    });

    expect(result.current.selectedTypes).toEqual([]);
  });

  it('should clear type filters', () => {
    const { result } = renderHook(() => 
      usePaymentMethodData({ autoLoad: false })
    );

    act(() => {
      result.current.toggleTypeFilter('card');
      result.current.toggleTypeFilter('ach');
    });

    expect(result.current.selectedTypes).toEqual(['card', 'ach']);

    act(() => {
      result.current.clearTypeFilters();
    });

    expect(result.current.selectedTypes).toEqual([]);
  });

  it('should get payment methods by type', async () => {
    const { result } = renderHook(() => usePaymentMethodData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.paymentMethods).toEqual(mockPaymentMethods);
    });

    const cardMethods = result.current.getPaymentMethodsByType('card');
    expect(cardMethods).toHaveLength(1);
    expect(cardMethods[0].name).toBe('Credit Card');

    const achMethods = result.current.getPaymentMethodsByType('ach');
    expect(achMethods).toHaveLength(1);
    expect(achMethods[0].name).toBe('ACH Transfer');
  });

  it('should filter payment methods by selected types', async () => {
    const { result } = renderHook(() => usePaymentMethodData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.paymentMethods).toEqual(mockPaymentMethods);
    });

    act(() => {
      result.current.toggleTypeFilter('card');
    });

    expect(result.current.filteredPaymentMethods).toHaveLength(1);
    expect(result.current.filteredPaymentMethods[0].type).toBe('card');

    act(() => {
      result.current.toggleTypeFilter('ach');
    });

    expect(result.current.filteredPaymentMethods).toHaveLength(2);
    expect(result.current.filteredPaymentMethods.map(m => m.type)).toEqual(['card', 'ach']);
  });

  it('should combine search and type filtering', async () => {
    const { result } = renderHook(() => usePaymentMethodData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.paymentMethods).toEqual(mockPaymentMethods);
    });

    act(() => {
      result.current.toggleTypeFilter('card');
      result.current.setSearchTerm('credit');
    });

    await waitFor(() => {
      expect(result.current.filteredPaymentMethods).toHaveLength(1);
      expect(result.current.filteredPaymentMethods[0].name).toBe('Credit Card');
    });
  });
});

