/**
 * Utility functions for formatting data in the dashboard
 */

/**
 * Format a number as currency
 * @param value - The number to format
 * @param currency - The currency code (default: 'USD')
 * @param locale - The locale to use for formatting (default: 'en-US')
 * @returns Formatted currency string
 */
export const formatCurrency = (
  value: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '$0.00';
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch (error) {
    // Fallback formatting
    return `$${value.toFixed(2)}`;
  }
};

/**
 * Format a number with appropriate separators
 * @param value - The number to format
 * @param locale - The locale to use for formatting (default: 'en-US')
 * @param minimumFractionDigits - Minimum number of decimal places (default: 0)
 * @param maximumFractionDigits - Maximum number of decimal places (default: 2)
 * @returns Formatted number string
 */
export const formatNumber = (
  value: number,
  locale: string = 'en-US',
  minimumFractionDigits: number = 0,
  maximumFractionDigits: number = 2
): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }

  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(value);
  } catch (error) {
    // Fallback formatting
    return value.toFixed(maximumFractionDigits);
  }
};

/**
 * Format a number as a percentage
 * @param value - The number to format (should be a decimal, e.g., 0.15 for 15%)
 * @param locale - The locale to use for formatting (default: 'en-US')
 * @param minimumFractionDigits - Minimum number of decimal places (default: 1)
 * @param maximumFractionDigits - Maximum number of decimal places (default: 2)
 * @returns Formatted percentage string
 */
export const formatPercentage = (
  value: number,
  locale: string = 'en-US',
  minimumFractionDigits: number = 1,
  maximumFractionDigits: number = 2
): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.0%';
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(value / 100); // Convert from percentage to decimal
  } catch (error) {
    // Fallback formatting
    return `${value.toFixed(maximumFractionDigits)}%`;
  }
};

/**
 * Format a number with compact notation (K, M, B)
 * @param value - The number to format
 * @param locale - The locale to use for formatting (default: 'en-US')
 * @returns Formatted compact number string
 */
export const formatCompactNumber = (
  value: number,
  locale: string = 'en-US'
): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }

  try {
    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  } catch (error) {
    // Fallback formatting
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B`;
    } else if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    } else {
      return value.toString();
    }
  }
};

/**
 * Format a date string
 * @param dateString - The date string to format
 * @param locale - The locale to use for formatting (default: 'en-US')
 * @param options - Intl.DateTimeFormatOptions for custom formatting
 * @returns Formatted date string
 */
export const formatDate = (
  dateString: string | Date,
  locale: string = 'en-US',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
): string => {
  if (!dateString) {
    return '';
  }

  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    if (isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch (error) {
    return '';
  }
};

/**
 * Format a date range
 * @param startDate - The start date
 * @param endDate - The end date
 * @param locale - The locale to use for formatting (default: 'en-US')
 * @returns Formatted date range string
 */
export const formatDateRange = (
  startDate: string | Date,
  endDate: string | Date,
  locale: string = 'en-US'
): string => {
  if (!startDate || !endDate) {
    return '';
  }

  try {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return '';
    }

    const startFormatted = formatDate(start, locale, { month: 'short', day: 'numeric' });
    const endFormatted = formatDate(end, locale, { month: 'short', day: 'numeric', year: 'numeric' });
    
    return `${startFormatted} - ${endFormatted}`;
  } catch (error) {
    return '';
  }
};

/**
 * Format a file size in bytes
 * @param bytes - The number of bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted file size string
 */
export const formatFileSize = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Format a duration in milliseconds
 * @param milliseconds - The duration in milliseconds
 * @returns Formatted duration string
 */
export const formatDuration = (milliseconds: number): string => {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

/**
 * Format a phone number
 * @param phoneNumber - The phone number string
 * @returns Formatted phone number string
 */
export const formatPhoneNumber = (phoneNumber: string): string => {
  if (!phoneNumber) return '';

  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Check if the number is valid
  if (cleaned.length !== 10) {
    return phoneNumber; // Return original if not 10 digits
  }

  // Format as (XXX) XXX-XXXX
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
};

/**
 * Format a credit card number (masked)
 * @param cardNumber - The credit card number string
 * @returns Masked credit card number string
 */
export const formatCreditCard = (cardNumber: string): string => {
  if (!cardNumber) return '';

  // Remove all non-digit characters
  const cleaned = cardNumber.replace(/\D/g, '');
  
  if (cleaned.length < 4) {
    return cardNumber;
  }

  // Show only last 4 digits
  return `**** **** **** ${cleaned.slice(-4)}`;
};

/**
 * Truncate text to a specified length
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @param suffix - Suffix to add when truncated (default: '...')
 * @returns Truncated text string
 */
export const truncateText = (text: string, maxLength: number, suffix: string = '...'): string => {
  if (!text || text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength - suffix.length) + suffix;
};

/**
 * Capitalize the first letter of each word
 * @param text - The text to capitalize
 * @returns Capitalized text string
 */
export const capitalizeWords = (text: string): string => {
  if (!text) return '';

  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Format a number as ordinal (1st, 2nd, 3rd, etc.)
 * @param value - The number to format
 * @returns Formatted ordinal string
 */
export const formatOrdinal = (value: number): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0th';
  }

  const j = value % 10;
  const k = value % 100;

  if (j === 1 && k !== 11) {
    return value + 'st';
  }
  if (j === 2 && k !== 12) {
    return value + 'nd';
  }
  if (j === 3 && k !== 13) {
    return value + 'rd';
  }
  return value + 'th';
};




