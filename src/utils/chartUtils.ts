import { CHART_COLORS, CHART_FORMATTING, CHART_DIMENSIONS, CHART_STYLES } from '../config/chartConfig';

// Data formatting utilities
export const formatCurrency = (value: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatPercentage = (value: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
};

export const formatNumber = (value: number, decimals: number = 0): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatDate = (date: Date | string, format: keyof typeof CHART_FORMATTING.dates = 'medium'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const formatString = CHART_FORMATTING.dates[format];
  
  // Simple date formatting - in production, you might want to use a library like date-fns
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  
  if (format === 'short') {
    options.year = undefined;
  } else if (format === 'long') {
    options.month = 'long';
  } else if (format === 'time') {
    return dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } else if (format === 'datetime') {
    return dateObj.toLocaleString('en-US', { 
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  return dateObj.toLocaleDateString('en-US', options);
};

// Color utilities
export const getColorByIndex = (index: number): string => {
  const colors = Object.values(CHART_COLORS).filter(color => 
    !color.includes('company') && color !== CHART_COLORS.light && color !== CHART_COLORS.dark
  );
  return colors[index % colors.length];
};

export const getCompanyColor = (companyIndex: number): string => {
  const companyColors = [
    CHART_COLORS.company1,
    CHART_COLORS.company2,
    CHART_COLORS.company3,
    CHART_COLORS.company4,
    CHART_COLORS.company5,
    CHART_COLORS.company6,
    CHART_COLORS.company7,
    CHART_COLORS.company8,
  ];
  return companyColors[companyIndex % companyColors.length];
};

export const getRevenueColor = (type: 'revenue' | 'commission' | 'profit' | 'cost' | 'interest'): string => {
  return CHART_COLORS[type];
};

// Chart dimension utilities
export const getChartDimensions = (size: keyof typeof CHART_DIMENSIONS, responsive: boolean = true) => {
  const dimensions = CHART_DIMENSIONS[size];
  
  if (responsive && size === 'full') {
    return {
      width: '100%',
      height: dimensions.height,
    };
  }
  
  return dimensions;
};

// Data transformation utilities
export const aggregateDataByField = <T extends Record<string, any>>(
  data: T[],
  groupBy: keyof T,
  valueField: keyof T,
  aggregator: 'sum' | 'count' | 'average' = 'sum'
): Array<{ name: string; value: number }> => {
  const grouped = data.reduce((acc, item) => {
    const key = String(item[groupBy]);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<string, T[]>);

  return Object.entries(grouped).map(([name, items]) => {
    let value: number;
    
    switch (aggregator) {
      case 'sum':
        value = items.reduce((sum, item) => sum + (Number(item[valueField]) || 0), 0);
        break;
      case 'count':
        value = items.length;
        break;
      case 'average':
        value = items.reduce((sum, item) => sum + (Number(item[valueField]) || 0), 0) / items.length;
        break;
      default:
        value = 0;
    }
    
    return { name, value };
  });
};

export const sortDataByValue = <T extends { value: number }>(data: T[], order: 'asc' | 'desc' = 'desc'): T[] => {
  return [...data].sort((a, b) => {
    return order === 'asc' ? a.value - b.value : b.value - a.value;
  });
};

export const limitDataPoints = <T>(data: T[], limit: number): T[] => {
  return data.slice(0, limit);
};

// Chart configuration utilities
export const getChartStyle = (type: keyof typeof CHART_STYLES) => {
  return CHART_STYLES[type];
};

export const createCustomTooltip = (formatter?: (value: any, name: string) => [string, string]) => {
  return ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Return tooltip configuration object instead of JSX
      return {
        content: {
          label,
          entries: payload.map((entry: any, index: number) => ({
            key: index,
            color: entry.color,
            text: formatter ? formatter(entry.value, entry.name)[1] : `${entry.name}: ${formatCurrency(entry.value)}`
          }))
        },
        className: "bg-white border border-gray-200 rounded-lg shadow-lg p-3"
      };
    }
    return null;
  };
};

// Responsive utilities
export const getResponsiveFontSize = (baseSize: number, breakpoint: 'mobile' | 'tablet' | 'desktop' | 'large'): number => {
  const multipliers = {
    mobile: 0.8,
    tablet: 0.9,
    desktop: 1,
    large: 1.1,
  };
  
  return Math.round(baseSize * multipliers[breakpoint]);
};

export const getResponsivePadding = (breakpoint: 'mobile' | 'tablet' | 'desktop' | 'large'): number => {
  const paddings = {
    mobile: 8,
    tablet: 12,
    desktop: 16,
    large: 20,
  };
  
  return paddings[breakpoint];
};

// Chart accessibility utilities
export const generateAriaLabel = (chartType: string, title: string): string => {
  return `${chartType} showing ${title}`;
};

export const generateAriaDescription = (chartType: string, dataPoints: number): string => {
  return `Interactive ${chartType} with ${dataPoints} data points. Use keyboard navigation to explore the data.`;
};

// Enhanced accessibility utilities
export const generateDetailedAriaLabel = (
  chartType: string, 
  title: string, 
  dataPoints: number,
  totalValue?: number
): string => {
  let label = `${chartType} showing ${title}`;
  
  if (dataPoints > 0) {
    label += ` with ${dataPoints} data points`;
  }
  
  if (totalValue !== undefined) {
    label += `. Total value: ${formatCurrency(totalValue)}`;
  }
  
  return label;
};

export const generateDataPointAriaLabel = (
  chartType: string,
  dataPoint: any,
  index: number,
  total?: number
): string => {
  const { name, value, revenue, commission, profit } = dataPoint;
  
  let label = `${chartType} segment ${index + 1}`;
  
  if (name) {
    label += `: ${name}`;
  }
  
  if (value !== undefined) {
    label += `. Value: ${formatCurrency(value)}`;
    
    if (total && total > 0) {
      const percentage = ((value / total) * 100).toFixed(1);
      label += ` (${percentage}%)`;
    }
  }
  
  if (revenue !== undefined) {
    label += `. Revenue: ${formatCurrency(revenue)}`;
  }
  
  if (commission !== undefined) {
    label += `. Commission: ${formatCurrency(commission)}`;
  }
  
  if (profit !== undefined) {
    label += `. Profit: ${formatCurrency(profit)}`;
  }
  
  return label;
};

export const generateKeyboardInstructions = (chartType: string): string => {
  const baseInstructions = 'Use arrow keys to navigate between data points. Press Enter or Space to select.';
  
  const chartSpecificInstructions = {
    pieChart: 'Use arrow keys to navigate between pie segments.',
    barChart: 'Use arrow keys to navigate between bars.',
    lineChart: 'Use arrow keys to navigate between data points on the line.',
    areaChart: 'Use arrow keys to navigate between data points in the area.',
    scatterChart: 'Use arrow keys to navigate between scatter plot points.',
    waterfallChart: 'Use arrow keys to navigate between waterfall chart segments.',
  };
  
  return chartSpecificInstructions[chartType as keyof typeof chartSpecificInstructions] || baseInstructions;
};

export const generateScreenReaderSummary = (
  chartType: string,
  data: any[],
  title?: string
): string => {
  if (data.length === 0) {
    return `${chartType} has no data to display.`;
  }
  
  const totalValue = data.reduce((sum, item) => sum + (item.value || 0), 0);
  const maxValue = Math.max(...data.map(item => item.value || 0));
  const minValue = Math.min(...data.map(item => item.value || 0));
  
  let summary = `${chartType}`;
  
  if (title) {
    summary += ` titled "${title}"`;
  }
  
  summary += ` contains ${data.length} data points. `;
  summary += `Total value is ${formatCurrency(totalValue)}. `;
  summary += `Values range from ${formatCurrency(minValue)} to ${formatCurrency(maxValue)}. `;
  
  // Add information about the largest segment
  const largestSegment = data.reduce((max, item) => 
    (item.value || 0) > (max.value || 0) ? item : max
  );
  
  if (largestSegment.name) {
    summary += `The largest segment is "${largestSegment.name}" with ${formatCurrency(largestSegment.value || 0)}. `;
  }
  
  summary += generateKeyboardInstructions(chartType);
  
  return summary;
};

export const createAccessibleTooltip = (
  dataPoint: any,
  chartType: string,
  index: number
): string => {
  const { name, value, revenue, commission, profit } = dataPoint;
  
  let tooltip = '';
  
  if (name) {
    tooltip += `${name}\n`;
  }
  
  if (value !== undefined) {
    tooltip += `Value: ${formatCurrency(value)}\n`;
  }
  
  if (revenue !== undefined) {
    tooltip += `Revenue: ${formatCurrency(revenue)}\n`;
  }
  
  if (commission !== undefined) {
    tooltip += `Commission: ${formatCurrency(commission)}\n`;
  }
  
  if (profit !== undefined) {
    tooltip += `Profit: ${formatCurrency(profit)}\n`;
  }
  
  // Remove trailing newline
  return tooltip.trim();
};

export const generateFocusIndicatorStyles = (isFocused: boolean, isSelected: boolean) => {
  const baseStyles = {
    outline: 'none',
    transition: 'all 0.2s ease-in-out',
  };
  
  if (isFocused) {
    return {
      ...baseStyles,
      outline: '2px solid #3B82F6',
      outlineOffset: '2px',
      boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)',
    };
  }
  
  if (isSelected) {
    return {
      ...baseStyles,
      outline: '2px solid #10B981',
      outlineOffset: '2px',
      boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)',
    };
  }
  
  return baseStyles;
};

// Data validation utilities
export const validateChartData = (data: any[]): boolean => {
  if (!Array.isArray(data) || data.length === 0) {
    return false;
  }
  
  // Check if data has required properties
  const firstItem = data[0];
  if (!firstItem || typeof firstItem !== 'object') {
    return false;
  }
  
  return true;
};

export const sanitizeChartData = <T extends Record<string, any>>(data: T[]): T[] => {
  return data.filter(item => {
    if (!item || typeof item !== 'object') {
      return false;
    }
    
    // Remove items with null or undefined values
    return Object.values(item).every(value => value !== null && value !== undefined);
  });
};

// Export utilities
export const exportChartAsImage = (chartRef: React.RefObject<any>, format: 'png' | 'svg' = 'png'): void => {
  if (chartRef.current) {
    // This would integrate with a chart export library
    console.log(`Exporting chart as ${format}`);
  }
};

// Performance utilities
export const debounceChartUpdate = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const memoizeChartData = <T>(data: T[], key: string): T[] => {
  // Simple memoization - in production, you might want to use a more sophisticated approach
  const cacheKey = `${key}_${JSON.stringify(data).length}`;
  return data;
};

export default {
  formatCurrency,
  formatPercentage,
  formatNumber,
  formatDate,
  getColorByIndex,
  getCompanyColor,
  getRevenueColor,
  getChartDimensions,
  aggregateDataByField,
  sortDataByValue,
  limitDataPoints,
  getChartStyle,
  createCustomTooltip,
  getResponsiveFontSize,
  getResponsivePadding,
  generateAriaLabel,
  generateAriaDescription,
  generateDetailedAriaLabel,
  generateDataPointAriaLabel,
  generateKeyboardInstructions,
  generateScreenReaderSummary,
  createAccessibleTooltip,
  generateFocusIndicatorStyles,
  validateChartData,
  sanitizeChartData,
  exportChartAsImage,
  debounceChartUpdate,
  memoizeChartData,
};
