import { renderHook, act, waitFor } from '@testing-library/react';
import { useDashboardFilters } from './useDashboardFilters';
import { DashboardFilters } from '../types/dashboard';

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useDashboardFilters', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default filters', () => {
      const { result } = renderHook(() => useDashboardFilters());

      expect(result.current.filters).toEqual({
        date_range: { type: 'last_30_days' },
        companies: { selected_companies: [] },
        payment_methods: { selected_methods: [] },
        revenue_sources: { 
          transaction_fees: false,
          payor_fees: false,
          interest_revenue: false,
          selected_sources: [] 
        },
        commission_types: { 
          employee_commissions: false,
          referral_partner_commissions: false,
          interest_commissions: false,
          selected_types: [] 
        },
        amount_range: {},
        disbursement_status: [],
        employees: { selected_employees: [] },
        referral_partners: { selected_partners: [] }
      });
    });

    it('should initialize with custom initial filters', () => {
      const initialFilters: Partial<DashboardFilters> = {
        date_range: { type: 'last_90_days' },
        companies: { selected_companies: [1, 2, 3] }
      };

      const { result } = renderHook(() => useDashboardFilters({ initialFilters }));

      expect(result.current.filters.date_range).toEqual({ type: 'last_90_days' });
      expect(result.current.filters.companies.selected_companies).toEqual([1, 2, 3]);
    });

    it('should load filters from persistence when enabled', () => {
      const savedFilters = {
        date_range: { type: 'ytd' },
        companies: { selected_companies: [5, 6] }
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedFilters));

      const { result } = renderHook(() => useDashboardFilters({ 
        enablePersistence: true,
        persistenceKey: 'test-filters'
      }));

      expect(localStorageMock.getItem).toHaveBeenCalledWith('test-filters');
      expect(result.current.filters.date_range).toEqual({ type: 'ytd' });
      expect(result.current.filters.companies.selected_companies).toEqual([5, 6]);
    });

    it('should handle persistence loading errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const { result } = renderHook(() => useDashboardFilters({ 
        enablePersistence: true 
      }));

      expect(result.current.filters).toEqual({
        date_range: { type: 'last_30_days' },
        companies: { selected_companies: [] },
        payment_methods: { selected_methods: [] },
        revenue_sources: { 
          transaction_fees: false,
          payor_fees: false,
          interest_revenue: false,
          selected_sources: [] 
        },
        commission_types: { 
          employee_commissions: false,
          referral_partner_commissions: false,
          interest_commissions: false,
          selected_types: [] 
        },
        amount_range: {},
        disbursement_status: [],
        employees: { selected_employees: [] },
        referral_partners: { selected_partners: [] }
      });
    });
  });

  describe('Filter Updates', () => {
    it('should update filters with updateFilters', async () => {
      const { result } = renderHook(() => useDashboardFilters());

      await act(async () => {
        result.current.updateFilters({
          date_range: { type: 'last_90_days' },
          companies: { selected_companies: [1, 2] }
        });
      });

      expect(result.current.filters.date_range.type).toBe('last_90_days');
      expect(result.current.filters.companies.selected_companies).toEqual([1, 2]);
    });

    it('should update single filter with updateFilter', async () => {
      const { result } = renderHook(() => useDashboardFilters());

      await act(async () => {
        result.current.updateFilter('date_range', { type: 'ytd' });
      });

      expect(result.current.filters.date_range.type).toBe('ytd');
    });

    it('should call onFiltersChange callback when filters change', async () => {
      const onFiltersChange = jest.fn();
      const { result } = renderHook(() => useDashboardFilters({ onFiltersChange }));

      await act(async () => {
        result.current.updateFilters({ date_range: { type: 'last_90_days' } });
      });

      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          date_range: { type: 'last_90_days' }
        })
      );
    });
  });

  describe('Individual Filter Updates', () => {
    it('should update date range', async () => {
      const { result } = renderHook(() => useDashboardFilters());

      await act(async () => {
        result.current.updateDateRange({ type: 'custom', start_date: '2024-01-01', end_date: '2024-01-31' });
      });

      expect(result.current.filters.date_range).toEqual({
        type: 'custom',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      });
    });

    it('should update companies', async () => {
      const { result } = renderHook(() => useDashboardFilters());

      await act(async () => {
        result.current.updateCompanies({ selected_companies: [1, 2, 3] });
      });

      expect(result.current.filters.companies.selected_companies).toEqual([1, 2, 3]);
    });

    it('should update payment methods', async () => {
      const { result } = renderHook(() => useDashboardFilters());

      await act(async () => {
        result.current.updatePaymentMethods({ selected_methods: [10, 20] });
      });

      expect(result.current.filters.payment_methods.selected_methods).toEqual([10, 20]);
    });

    it('should update revenue sources', async () => {
      const { result } = renderHook(() => useDashboardFilters());

      await act(async () => {
        result.current.updateRevenueSources({ selected_sources: [100, 200] });
      });

      expect(result.current.filters.revenue_sources.selected_sources).toEqual([100, 200]);
    });

    it('should update commission types', async () => {
      const { result } = renderHook(() => useDashboardFilters());

      await act(async () => {
        result.current.updateCommissionTypes({ selected_types: ['employee', 'referral'] });
      });

      expect(result.current.filters.commission_types.selected_types).toEqual(['employee', 'referral']);
    });

    it('should update amount range', async () => {
      const { result } = renderHook(() => useDashboardFilters());

      await act(async () => {
        result.current.updateAmountRange({ min_amount: 1000, max_amount: 5000 });
      });

      expect(result.current.filters.amount_range).toEqual({ min_amount: 1000, max_amount: 5000 });
    });

    it('should update disbursement status', async () => {
      const { result } = renderHook(() => useDashboardFilters());

      await act(async () => {
        result.current.updateDisbursementStatus(['pending', 'completed']);
      });

      expect(result.current.filters.disbursement_status).toEqual(['pending', 'completed']);
    });

    it('should update employees', async () => {
      const { result } = renderHook(() => useDashboardFilters());

      await act(async () => {
        result.current.updateEmployees({ selected_employees: [50, 60] });
      });

      expect(result.current.filters.employees.selected_employees).toEqual([50, 60]);
    });

    it('should update referral partners', async () => {
      const { result } = renderHook(() => useDashboardFilters());

      await act(async () => {
        result.current.updateReferralPartners({ selected_partners: [1000, 2000] });
      });

      expect(result.current.filters.referral_partners.selected_partners).toEqual([1000, 2000]);
    });
  });

  describe('Selection Utilities', () => {
    it('should add company', async () => {
      const { result } = renderHook(() => useDashboardFilters());

      await act(async () => {
        result.current.addCompany(1);
      });

      await act(async () => {
        result.current.addCompany(2);
      });

      await act(async () => {
        result.current.addCompany(1); // Duplicate should be ignored
      });

      expect(result.current.filters.companies.selected_companies).toEqual([1, 2]);
    });

    it('should remove company', async () => {
      const { result } = renderHook(() => useDashboardFilters({
        initialFilters: { companies: { selected_companies: [1, 2, 3] } }
      }));

      await act(async () => {
        result.current.removeCompany(2);
      });

      expect(result.current.filters.companies.selected_companies).toEqual([1, 3]);
    });

    it('should add payment method', async () => {
      const { result } = renderHook(() => useDashboardFilters());

      await act(async () => {
        result.current.addPaymentMethod(10);
      });

      await act(async () => {
        result.current.addPaymentMethod(20);
      });

      expect(result.current.filters.payment_methods.selected_methods).toEqual([10, 20]);
    });

    it('should remove payment method', async () => {
      const { result } = renderHook(() => useDashboardFilters({
        initialFilters: { payment_methods: { selected_methods: [10, 20, 30] } }
      }));

      await act(async () => {
        result.current.removePaymentMethod(20);
      });

      expect(result.current.filters.payment_methods.selected_methods).toEqual([10, 30]);
    });

    it('should add revenue source', async () => {
      const { result } = renderHook(() => useDashboardFilters());

      await act(async () => {
        result.current.addRevenueSource(100);
      });

      await act(async () => {
        result.current.addRevenueSource(200);
      });

      expect(result.current.filters.revenue_sources.selected_sources).toEqual([100, 200]);
    });

    it('should remove revenue source', async () => {
      const { result } = renderHook(() => useDashboardFilters({
        initialFilters: { 
          revenue_sources: { 
            transaction_fees: false,
            payor_fees: false,
            interest_revenue: false,
            selected_sources: [100, 200, 300] 
          } 
        }
      }));

      await act(async () => {
        result.current.removeRevenueSource(200);
      });

      expect(result.current.filters.revenue_sources.selected_sources).toEqual([100, 300]);
    });

    it('should add commission type', async () => {
      const { result } = renderHook(() => useDashboardFilters());

      await act(async () => {
        result.current.addCommissionType('employee');
      });

      await act(async () => {
        result.current.addCommissionType('referral');
      });

      expect(result.current.filters.commission_types.selected_types).toEqual(['employee', 'referral']);
    });

    it('should remove commission type', async () => {
      const { result } = renderHook(() => useDashboardFilters({
        initialFilters: { 
          commission_types: { 
            employee_commissions: false,
            referral_partner_commissions: false,
            interest_commissions: false,
            selected_types: ['employee', 'referral', 'interest'] 
          } 
        }
      }));

      await act(async () => {
        result.current.removeCommissionType('referral');
      });

      expect(result.current.filters.commission_types.selected_types).toEqual(['employee', 'interest']);
    });

    it('should add employee', async () => {
      const { result } = renderHook(() => useDashboardFilters());

      await act(async () => {
        result.current.addEmployee(50);
      });

      await act(async () => {
        result.current.addEmployee(60);
      });

      expect(result.current.filters.employees.selected_employees).toEqual([50, 60]);
    });

    it('should remove employee', async () => {
      const { result } = renderHook(() => useDashboardFilters({
        initialFilters: { employees: { selected_employees: [50, 60, 70] } }
      }));

      await act(async () => {
        result.current.removeEmployee(60);
      });

      expect(result.current.filters.employees.selected_employees).toEqual([50, 70]);
    });

    it('should add referral partner', async () => {
      const { result } = renderHook(() => useDashboardFilters());

      await act(async () => {
        result.current.addReferralPartner(1000);
      });

      await act(async () => {
        result.current.addReferralPartner(2000);
      });

      expect(result.current.filters.referral_partners.selected_partners).toEqual([1000, 2000]);
    });

    it('should remove referral partner', async () => {
      const { result } = renderHook(() => useDashboardFilters({
        initialFilters: { referral_partners: { selected_partners: [1000, 2000, 3000] } }
      }));

      await act(async () => {
        result.current.removeReferralPartner(2000);
      });

      expect(result.current.filters.referral_partners.selected_partners).toEqual([1000, 3000]);
    });

    it('should add disbursement status', async () => {
      const { result } = renderHook(() => useDashboardFilters());

      await act(async () => {
        result.current.addDisbursementStatus('pending');
      });

      await act(async () => {
        result.current.addDisbursementStatus('completed');
      });

      expect(result.current.filters.disbursement_status).toEqual(['pending', 'completed']);
    });

    it('should remove disbursement status', async () => {
      const { result } = renderHook(() => useDashboardFilters({
        initialFilters: { disbursement_status: ['pending', 'completed', 'failed'] }
      }));

      await act(async () => {
        result.current.removeDisbursementStatus('completed');
      });

      expect(result.current.filters.disbursement_status).toEqual(['pending', 'failed']);
    });
  });

  describe('Filter Analysis', () => {
    it('should calculate active filter count correctly', async () => {
      const { result } = renderHook(() => useDashboardFilters());

      // Initially no active filters
      expect(result.current.activeFilterCount).toBe(0);
      expect(result.current.hasActiveFilters).toBe(false);

      // Add some filters
      await act(async () => {
        result.current.updateFilters({
          date_range: { type: 'last_90_days' },
          companies: { selected_companies: [1, 2] },
          amount_range: { min_amount: 1000, max_amount: 5000 }
        });
      });

      expect(result.current.activeFilterCount).toBe(3);
      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should get active filters for display', async () => {
      const { result } = renderHook(() => useDashboardFilters());

      await act(async () => {
        result.current.updateFilters({
          date_range: { type: 'last_90_days' },
          companies: { selected_companies: [1, 2, 3] },
          amount_range: { min_amount: 1000, max_amount: 5000 }
        });
      });

      const activeFilters = result.current.getActiveFilters();
      
      expect(activeFilters).toHaveLength(3);
      expect(activeFilters.find(f => f.key === 'date_range')).toBeDefined();
      expect(activeFilters.find(f => f.key === 'companies')?.value).toBe('3 selected');
      expect(activeFilters.find(f => f.key === 'amount_range')?.value).toBe('$1,000 - $5,000');
    });

    it('should not count default date range as active', async () => {
      const { result } = renderHook(() => useDashboardFilters());

      await act(async () => {
        result.current.updateFilters({
          companies: { selected_companies: [1, 2] }
        });
      });

      expect(result.current.activeFilterCount).toBe(1);
      expect(result.current.hasActiveFilters).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should validate custom date range', async () => {
      const { result } = renderHook(() => useDashboardFilters({ validateFilters: true }));

      await act(async () => {
        result.current.updateDateRange({ 
          type: 'custom', 
          start_date: '2024-01-31', 
          end_date: '2024-01-01' // Invalid: end before start
        });
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.validationErrors.length).toBeGreaterThan(0);
    });

    it('should validate amount range', async () => {
      const { result } = renderHook(() => useDashboardFilters({ validateFilters: true }));

      await act(async () => {
        result.current.updateAmountRange({ 
          min_amount: 5000, 
          max_amount: 1000 // Invalid: min greater than max
        });
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.validationErrors).toContain('Minimum amount cannot be greater than maximum amount');
    });

    it('should validate negative amount', async () => {
      const { result } = renderHook(() => useDashboardFilters({ validateFilters: true }));

      await act(async () => {
        result.current.updateAmountRange({ 
          min_amount: -100, 
          max_amount: 1000
        });
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.validationErrors).toContain('Minimum amount cannot be negative');
    });

    it('should be valid with proper filters', async () => {
      const { result } = renderHook(() => useDashboardFilters({ validateFilters: true }));

      await act(async () => {
        result.current.updateFilters({
          date_range: { type: 'last_90_days' },
          companies: { selected_companies: [1, 2] },
          amount_range: { min_amount: 1000, max_amount: 5000 }
        });
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.validationErrors).toHaveLength(0);
    });
  });

  describe('Persistence', () => {
    it('should save filters to localStorage when enabled', async () => {
      const { result } = renderHook(() => useDashboardFilters({ 
        enablePersistence: true,
        persistenceKey: 'test-filters'
      }));

      await act(async () => {
        result.current.updateFilters({
          date_range: { type: 'last_90_days' },
          companies: { selected_companies: [1, 2] }
        });
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'test-filters',
        expect.stringContaining('"type":"last_90_days"')
      );
    });

    it('should load filters from localStorage', async () => {
      const savedFilters = {
        date_range: { type: 'ytd' },
        companies: { selected_companies: [5, 6] }
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedFilters));

      const { result } = renderHook(() => useDashboardFilters({ 
        enablePersistence: true,
        persistenceKey: 'test-filters'
      }));

      await act(async () => {
        result.current.loadFilters();
      });

      expect(localStorageMock.getItem).toHaveBeenCalledWith('test-filters');
      expect(result.current.filters.date_range.type).toBe('ytd');
    });

    it('should clear persistence', async () => {
      const { result } = renderHook(() => useDashboardFilters({ 
        enablePersistence: true,
        persistenceKey: 'test-filters'
      }));

      await act(async () => {
        result.current.clearPersistence();
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('test-filters');
    });

    it('should handle persistence save errors gracefully', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const { result } = renderHook(() => useDashboardFilters({ 
        enablePersistence: true 
      }));

      // Should not throw error
      await act(async () => {
        result.current.updateFilters({ date_range: { type: 'last_90_days' } });
      });

      expect(result.current.filters.date_range.type).toBe('last_90_days');
    });
  });

  describe('Reset and Clear', () => {
    it('should reset filters to defaults', async () => {
      const { result } = renderHook(() => useDashboardFilters({
        initialFilters: {
          date_range: { type: 'ytd' },
          companies: { selected_companies: [1, 2, 3] }
        }
      }));

      await act(async () => {
        result.current.resetFilters();
      });

      expect(result.current.filters.date_range.type).toBe('last_30_days');
      expect(result.current.filters.companies.selected_companies).toEqual([]);
    });

    it('should clear all filters', async () => {
      const { result } = renderHook(() => useDashboardFilters({
        initialFilters: {
          date_range: { type: 'ytd' },
          companies: { selected_companies: [1, 2, 3] },
          amount_range: { min_amount: 1000, max_amount: 5000 }
        }
      }));

      await act(async () => {
        result.current.clearFilters();
      });

      expect(result.current.filters.date_range.type).toBe('last_30_days');
      expect(result.current.filters.companies.selected_companies).toEqual([]);
      expect(result.current.filters.amount_range).toEqual({});
    });
  });
});
