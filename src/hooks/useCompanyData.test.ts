import { renderHook, act, waitFor } from '@testing-library/react';
import { useCompanyData } from './useCompanyData';
import { getMockCompanies, mockSearchCompanies } from '../services/companyApi';

// Mock the company API
jest.mock('../services/companyApi', () => ({
  fetchAllCompanies: jest.fn(),
  searchCompanies: jest.fn(),
  getMockCompanies: jest.fn(),
  mockSearchCompanies: jest.fn()
}));

describe('useCompanyData', () => {
  const mockCompanies = [
    { id: 1, name: 'Acme Corporation', code: 'ACME', status: 'active' },
    { id: 2, name: 'Tech Solutions Inc.', code: 'TECH', status: 'active' },
    { id: 3, name: 'Global Industries Ltd.', code: 'GLOBAL', status: 'active' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (getMockCompanies as jest.Mock).mockReturnValue(mockCompanies);
    (mockSearchCompanies as jest.Mock).mockImplementation((term) => 
      mockCompanies.filter(company => 
        company.name.toLowerCase().includes(term.toLowerCase()) ||
        company.code?.toLowerCase().includes(term.toLowerCase())
      )
    );
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useCompanyData({ autoLoad: false }));

    expect(result.current.companies).toEqual([]);
    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.searchTerm).toBe('');
    expect(result.current.isSearching).toBe(false);
  });

  it('should load companies on mount when autoLoad is true', async () => {
    const { result } = renderHook(() => useCompanyData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.companies).toEqual(mockCompanies);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should not load companies when autoLoad is false', () => {
    const { result } = renderHook(() => useCompanyData({ autoLoad: false }));

    expect(result.current.companies).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should initialize with selected company IDs', () => {
    const initialSelectedIds = [1, 3];
    const { result } = renderHook(() => 
      useCompanyData({ initialSelectedIds, autoLoad: false })
    );

    expect(result.current.selectedIds).toEqual(initialSelectedIds);
  });

  it('should toggle company selection', () => {
    const { result } = renderHook(() => useCompanyData({ autoLoad: false }));

    act(() => {
      result.current.toggleCompany(1);
    });

    expect(result.current.selectedIds).toEqual([1]);

    act(() => {
      result.current.toggleCompany(1);
    });

    expect(result.current.selectedIds).toEqual([]);
  });

  it('should select and deselect companies', () => {
    const { result } = renderHook(() => useCompanyData({ autoLoad: false }));

    act(() => {
      result.current.selectCompany(1);
    });

    expect(result.current.selectedIds).toEqual([1]);

    act(() => {
      result.current.selectCompany(2);
    });

    expect(result.current.selectedIds).toEqual([1, 2]);

    act(() => {
      result.current.deselectCompany(1);
    });

    expect(result.current.selectedIds).toEqual([2]);
  });

  it('should select all companies', async () => {
    const { result } = renderHook(() => useCompanyData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.companies).toEqual(mockCompanies);
    });

    act(() => {
      result.current.selectAllCompanies();
    });

    expect(result.current.selectedIds).toEqual([1, 2, 3]);
  });

  it('should deselect all companies', () => {
    const { result } = renderHook(() => 
      useCompanyData({ initialSelectedIds: [1, 2, 3], autoLoad: false })
    );

    act(() => {
      result.current.deselectAllCompanies();
    });

    expect(result.current.selectedIds).toEqual([]);
  });

  it('should set selected IDs', () => {
    const { result } = renderHook(() => useCompanyData({ autoLoad: false }));

    act(() => {
      result.current.setSelectedIds([1, 2]);
    });

    expect(result.current.selectedIds).toEqual([1, 2]);
  });

  it('should get company by ID', async () => {
    const { result } = renderHook(() => useCompanyData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.companies).toEqual(mockCompanies);
    });

    const company = result.current.getCompanyById(1);
    expect(company).toEqual(mockCompanies[0]);
  });

  it('should get companies by IDs', async () => {
    const { result } = renderHook(() => useCompanyData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.companies).toEqual(mockCompanies);
    });

    const companies = result.current.getCompaniesByIds([1, 3]);
    expect(companies).toEqual([mockCompanies[0], mockCompanies[2]]);
  });

  it('should return undefined for non-existent company ID', async () => {
    const { result } = renderHook(() => useCompanyData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.companies).toEqual(mockCompanies);
    });

    const company = result.current.getCompanyById(999);
    expect(company).toBeUndefined();
  });

  it('should filter companies based on search term', async () => {
    const { result } = renderHook(() => useCompanyData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.companies).toEqual(mockCompanies);
    });

    act(() => {
      result.current.setSearchTerm('tech');
    });

    await waitFor(() => {
      expect(result.current.searchResults).toHaveLength(1);
      expect(result.current.searchResults[0].name).toBe('Tech Solutions Inc.');
    });
  });

  it('should handle empty search results', async () => {
    const { result } = renderHook(() => useCompanyData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.companies).toEqual(mockCompanies);
    });

    act(() => {
      result.current.setSearchTerm('nonexistent');
    });

    await waitFor(() => {
      expect(result.current.searchResults).toEqual([]);
    });
  });

  it('should return selected companies', async () => {
    const { result } = renderHook(() => 
      useCompanyData({ initialSelectedIds: [1, 2], autoLoad: true })
    );

    await waitFor(() => {
      expect(result.current.companies).toEqual(mockCompanies);
    });

    expect(result.current.selectedCompanies).toEqual([mockCompanies[0], mockCompanies[1]]);
  });

  it('should return filtered companies (search results when available)', async () => {
    const { result } = renderHook(() => useCompanyData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.companies).toEqual(mockCompanies);
    });

    act(() => {
      result.current.setSearchTerm('tech');
    });

    await waitFor(() => {
      expect(result.current.filteredCompanies).toHaveLength(1);
      expect(result.current.filteredCompanies[0].name).toBe('Tech Solutions Inc.');
    });
  });

  it('should return all companies when no search term', async () => {
    const { result } = renderHook(() => useCompanyData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.companies).toEqual(mockCompanies);
    });

    expect(result.current.filteredCompanies).toEqual(mockCompanies);
  });

  it('should sort companies by name', async () => {
    const { result } = renderHook(() => useCompanyData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.companies).toEqual(mockCompanies);
    });

    act(() => {
      result.current.sortCompanies('name');
    });

    // Companies should be sorted alphabetically by name
    expect(result.current.companies[0].name).toBe('Acme Corporation');
    expect(result.current.companies[1].name).toBe('Global Industries Ltd.');
    expect(result.current.companies[2].name).toBe('Tech Solutions Inc.');
  });

  it('should sort companies by code', async () => {
    const { result } = renderHook(() => useCompanyData({ autoLoad: true }));

    await waitFor(() => {
      expect(result.current.companies).toEqual(mockCompanies);
    });

    act(() => {
      result.current.sortCompanies('code');
    });

    // Companies should be sorted alphabetically by code
    expect(result.current.companies[0].code).toBe('ACME');
    expect(result.current.companies[1].code).toBe('GLOBAL');
    expect(result.current.companies[2].code).toBe('TECH');
  });

  it('should refresh companies', async () => {
    const { result } = renderHook(() => useCompanyData({ autoLoad: false }));

    expect(result.current.companies).toEqual([]);

    await act(async () => {
      await result.current.refreshCompanies();
    });

    expect(result.current.companies).toEqual(mockCompanies);
  });
});
