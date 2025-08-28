import { 
  getDateRangeFromFilter, 
  getDateRangePresets, 
  validateCustomDateRange, 
  formatDateRange,
  getDateRangeForAPI,
  getDateRangeSQLWhere,
  isDateInRange,
  getQuickDateRanges
} from './dateRangeUtils';
import { DateRangeFilter } from '../types/dashboard';

describe('dateRangeUtils', () => {
  const mockDate = new Date('2024-01-15T12:00:00Z');
  
  beforeEach(() => {
    // Mock the current date
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getDateRangeFromFilter', () => {
    it('should return last 30 days range', () => {
      const filter: DateRangeFilter = { type: 'last_30_days' };
      const result = getDateRangeFromFilter(filter);
      
      expect(result.startDate).toEqual(new Date('2023-12-16T12:00:00Z'));
      expect(result.endDate).toEqual(mockDate);
    });

    it('should return last 90 days range', () => {
      const filter: DateRangeFilter = { type: 'last_90_days' };
      const result = getDateRangeFromFilter(filter);
      
      expect(result.startDate).toEqual(new Date('2023-10-17T12:00:00Z'));
      expect(result.endDate).toEqual(mockDate);
    });

    it('should return last 12 months range', () => {
      const filter: DateRangeFilter = { type: 'last_12_months' };
      const result = getDateRangeFromFilter(filter);
      
      // Use toDateString() to avoid timezone issues
      expect(result.startDate.toDateString()).toEqual(new Date('2023-01-15T12:00:00Z').toDateString());
      expect(result.endDate).toEqual(mockDate);
    });

    it('should return year to date range', () => {
      const filter: DateRangeFilter = { type: 'ytd' };
      const result = getDateRangeFromFilter(filter);
      
      // Check that it's the first day of the current year
      expect(result.startDate.getFullYear()).toBe(2024);
      expect(result.startDate.getMonth()).toBe(0); // January
      expect(result.startDate.getDate()).toBe(1);
      expect(result.endDate).toEqual(mockDate);
    });

    it('should return custom date range', () => {
      const filter: DateRangeFilter = {
        type: 'custom',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };
      const result = getDateRangeFromFilter(filter);
      
      expect(result.startDate).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(result.endDate).toEqual(new Date('2024-01-31T00:00:00Z'));
    });

    it('should fallback to last 30 days for custom without dates', () => {
      const filter: DateRangeFilter = { type: 'custom' };
      const result = getDateRangeFromFilter(filter);
      
      expect(result.startDate).toEqual(new Date('2023-12-16T12:00:00Z'));
      expect(result.endDate).toEqual(mockDate);
    });
  });

  describe('getDateRangePresets', () => {
    it('should return all preset options', () => {
      const presets = getDateRangePresets();
      
      expect(presets).toHaveLength(5);
      expect(presets.map(p => p.value)).toEqual([
        'last_30_days',
        'last_90_days', 
        'last_12_months',
        'ytd',
        'custom'
      ]);
    });

    it('should have descriptions for all presets', () => {
      const presets = getDateRangePresets();
      
      presets.forEach(preset => {
        expect(preset.description).toBeDefined();
        expect(preset.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validateCustomDateRange', () => {
    it('should validate valid date range', () => {
      // Use dates that are in the past relative to the mock date
      const result = validateCustomDateRange('2023-12-01', '2023-12-31');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing start date', () => {
      const result = validateCustomDateRange('', '2024-01-31');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Start date is required');
    });

    it('should reject missing end date', () => {
      const result = validateCustomDateRange('2024-01-01', '');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('End date is required');
    });

    it('should reject invalid start date format', () => {
      const result = validateCustomDateRange('invalid-date', '2024-01-31');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid start date format');
    });

    it('should reject invalid end date format', () => {
      const result = validateCustomDateRange('2024-01-01', 'invalid-date');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid end date format');
    });

    it('should reject start date after end date', () => {
      const result = validateCustomDateRange('2024-01-31', '2024-01-01');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Start date must be before end date');
    });

    it('should reject future end date', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];
      
      const result = validateCustomDateRange('2024-01-01', futureDateStr);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('End date cannot be in the future');
    });

    it('should reject dates too far in the past', () => {
      const result = validateCustomDateRange('2010-01-01', '2024-01-31');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Start date cannot be more than 10 years ago');
    });
  });

  describe('formatDateRange', () => {
    it('should format preset date ranges', () => {
      const filter: DateRangeFilter = { type: 'last_30_days' };
      const result = formatDateRange(filter);
      
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4} - \d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it('should format custom date ranges', () => {
      const filter: DateRangeFilter = {
        type: 'custom',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };
      const result = formatDateRange(filter);
      
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4} - \d{1,2}\/\d{1,2}\/\d{4}/);
    });
  });

  describe('getDateRangeForAPI', () => {
    it('should return API parameters for preset range', () => {
      const filter: DateRangeFilter = { type: 'last_30_days' };
      const result = getDateRangeForAPI(filter);
      
      expect(result.start_date).toBe('2023-12-16');
      expect(result.end_date).toBe('2024-01-15');
    });

    it('should return API parameters for custom range', () => {
      const filter: DateRangeFilter = {
        type: 'custom',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };
      const result = getDateRangeForAPI(filter);
      
      expect(result.start_date).toBe('2024-01-01');
      expect(result.end_date).toBe('2024-01-31');
    });
  });

  describe('getDateRangeSQLWhere', () => {
    it('should generate SQL WHERE clause for preset range', () => {
      const filter: DateRangeFilter = { type: 'last_30_days' };
      const result = getDateRangeSQLWhere(filter);
      
      expect(result).toBe("created_at >= '2023-12-16' AND created_at <= '2024-01-15'");
    });

    it('should generate SQL WHERE clause with custom column', () => {
      const filter: DateRangeFilter = { type: 'last_30_days' };
      const result = getDateRangeSQLWhere(filter, 'updated_at');
      
      expect(result).toBe("updated_at >= '2023-12-16' AND updated_at <= '2024-01-15'");
    });
  });

  describe('isDateInRange', () => {
    it('should return true for date within range', () => {
      const filter: DateRangeFilter = {
        type: 'custom',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };
      const testDate = new Date('2024-01-15');
      
      const result = isDateInRange(testDate, filter);
      
      expect(result).toBe(true);
    });

    it('should return false for date outside range', () => {
      const filter: DateRangeFilter = {
        type: 'custom',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };
      const testDate = new Date('2024-02-15');
      
      const result = isDateInRange(testDate, filter);
      
      expect(result).toBe(false);
    });
  });

  describe('getQuickDateRanges', () => {
    it('should return quick date range options', () => {
      const quickRanges = getQuickDateRanges();
      
      expect(quickRanges).toHaveLength(5);
      expect(quickRanges.map(r => r.label)).toEqual([
        'Today',
        'Yesterday', 
        'This Week',
        'This Month',
        'Last Month'
      ]);
    });

    it('should have custom type for all quick ranges', () => {
      const quickRanges = getQuickDateRanges();
      
      quickRanges.forEach(range => {
        expect(range.filter.type).toBe('custom');
        expect(range.filter.start_date).toBeDefined();
        expect(range.filter.end_date).toBeDefined();
      });
    });
  });
});
