import { DateRangeFilter } from '../types/dashboard';

/**
 * Date range utility functions for dashboard filtering
 */

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface DateRangePreset {
  label: string;
  value: string;
  description: string;
  getDateRange: () => DateRange;
}

/**
 * Get the current date range based on filter type
 */
export const getDateRangeFromFilter = (filter: DateRangeFilter): DateRange => {
  const now = new Date();
  
  switch (filter.type) {
    case 'last_30_days':
      return {
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate: now
      };
      
    case 'last_90_days':
      return {
        startDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        endDate: now
      };
      
    case 'last_12_months':
      return {
        startDate: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
        endDate: now
      };
      
    case 'ytd':
      return {
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: now
      };
      
    case 'custom':
      if (filter.start_date && filter.end_date) {
        return {
          startDate: new Date(filter.start_date),
          endDate: new Date(filter.end_date)
        };
      }
      // Fallback to last 30 days if custom dates are not provided
      return {
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate: now
      };
      
    default:
      return {
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate: now
      };
  }
};

/**
 * Get date range presets with descriptions
 */
export const getDateRangePresets = (): DateRangePreset[] => [
  {
    label: 'Last 30 Days',
    value: 'last_30_days',
    description: 'View data from the past 30 days',
    getDateRange: () => {
      const now = new Date();
      return {
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate: now
      };
    }
  },
  {
    label: 'Last 90 Days',
    value: 'last_90_days',
    description: 'View data from the past 90 days',
    getDateRange: () => {
      const now = new Date();
      return {
        startDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        endDate: now
      };
    }
  },
  {
    label: 'Last 12 Months',
    value: 'last_12_months',
    description: 'View data from the past 12 months',
    getDateRange: () => {
      const now = new Date();
      return {
        startDate: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
        endDate: now
      };
    }
  },
  {
    label: 'Year to Date',
    value: 'ytd',
    description: 'View data from January 1st of current year',
    getDateRange: () => {
      const now = new Date();
      return {
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: now
      };
    }
  },
  {
    label: 'Custom Range',
    value: 'custom',
    description: 'Select your own date range',
    getDateRange: () => {
      const now = new Date();
      return {
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate: now
      };
    }
  }
];

/**
 * Format date range for display
 */
export const formatDateRange = (filter: DateRangeFilter): string => {
  const dateRange = getDateRangeFromFilter(filter);
  
  if (filter.type === 'custom' && filter.start_date && filter.end_date) {
    const startDate = new Date(filter.start_date);
    const endDate = new Date(filter.end_date);
    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  }
  
  const startDate = dateRange.startDate.toLocaleDateString();
  const endDate = dateRange.endDate.toLocaleDateString();
  return `${startDate} - ${endDate}`;
};

/**
 * Validate custom date range
 */
export const validateCustomDateRange = (startDate: string, endDate: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!startDate) {
    errors.push('Start date is required');
  }
  
  if (!endDate) {
    errors.push('End date is required');
  }
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime())) {
      errors.push('Invalid start date format');
    }
    
    if (isNaN(end.getTime())) {
      errors.push('Invalid end date format');
    }
    
    if (start > end) {
      errors.push('Start date must be before end date');
    }
    
    // Check if date range is not too far in the future
    const now = new Date();
    if (end > now) {
      errors.push('End date cannot be in the future');
    }
    
    // Check if date range is not too far in the past (optional limit)
    const maxPastDate = new Date(now.getFullYear() - 10, 0, 1); // 10 years ago
    if (start < maxPastDate) {
      errors.push('Start date cannot be more than 10 years ago');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Get SQL WHERE clause for date filtering
 */
export const getDateRangeSQLWhere = (filter: DateRangeFilter, dateColumn: string = 'created_at'): string => {
  const dateRange = getDateRangeFromFilter(filter);
  
  const startDateStr = dateRange.startDate.toISOString().split('T')[0];
  const endDateStr = dateRange.endDate.toISOString().split('T')[0];
  
  return `${dateColumn} >= '${startDateStr}' AND ${dateColumn} <= '${endDateStr}'`;
};

/**
 * Get date range for API parameters
 */
export const getDateRangeForAPI = (filter: DateRangeFilter): { start_date: string; end_date: string } => {
  const dateRange = getDateRangeFromFilter(filter);
  
  return {
    start_date: dateRange.startDate.toISOString().split('T')[0],
    end_date: dateRange.endDate.toISOString().split('T')[0]
  };
};

/**
 * Check if a date is within the specified range
 */
export const isDateInRange = (date: Date, filter: DateRangeFilter): boolean => {
  const dateRange = getDateRangeFromFilter(filter);
  return date >= dateRange.startDate && date <= dateRange.endDate;
};

/**
 * Get relative date description
 */
export const getRelativeDateDescription = (filter: DateRangeFilter): string => {
  switch (filter.type) {
    case 'last_30_days':
      return 'Last 30 days';
    case 'last_90_days':
      return 'Last 90 days';
    case 'last_12_months':
      return 'Last 12 months';
    case 'ytd':
      return 'Year to date';
    case 'custom':
      return 'Custom range';
    default:
      return 'Last 30 days';
  }
};

/**
 * Get quick date range options for common business periods
 */
export const getQuickDateRanges = (): Array<{ label: string; filter: DateRangeFilter }> => {
  const now = new Date();
  
  return [
    {
      label: 'Today',
      filter: {
        type: 'custom',
        start_date: now.toISOString().split('T')[0],
        end_date: now.toISOString().split('T')[0]
      }
    },
    {
      label: 'Yesterday',
      filter: {
        type: 'custom',
        start_date: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    },
    {
      label: 'This Week',
      filter: {
        type: 'custom',
        start_date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: now.toISOString().split('T')[0]
      }
    },
    {
      label: 'This Month',
      filter: {
        type: 'custom',
        start_date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
        end_date: now.toISOString().split('T')[0]
      }
    },
    {
      label: 'Last Month',
      filter: {
        type: 'custom',
        start_date: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0],
        end_date: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
      }
    }
  ];
};




