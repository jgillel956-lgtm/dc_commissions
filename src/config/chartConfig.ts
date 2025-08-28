import { ThemeColors, ThemeMode } from '../contexts/ThemeContext';

// Define Theme type locally to avoid import issues
interface RechartsTheme {
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  colors: string[];
}

// Chart color schemes - now integrated with theme system
export const CHART_COLORS = {
  primary: '#3B82F6', // Blue
  secondary: '#10B981', // Green
  accent: '#F59E0B', // Amber
  success: '#10B981', // Green
  warning: '#F59E0B', // Amber
  danger: '#EF4444', // Red
  info: '#06B6D4', // Cyan
  light: '#F3F4F6', // Gray-100
  dark: '#1F2937', // Gray-800
  
  // Revenue-specific colors
  revenue: '#3B82F6', // Blue
  commission: '#10B981', // Green
  profit: '#8B5CF6', // Purple
  cost: '#EF4444', // Red
  interest: '#F59E0B', // Amber
  
  // Payment method colors
  payeeFees: '#3B82F6', // Blue
  payorFees: '#10B981', // Green
  companyUpcharge: '#F59E0B', // Amber
  
  // Company performance colors
  company1: '#3B82F6', // Blue
  company2: '#10B981', // Green
  company3: '#F59E0B', // Amber
  company4: '#8B5CF6', // Purple
  company5: '#EF4444', // Red
  company6: '#06B6D4', // Cyan
  company7: '#84CC16', // Lime
  company8: '#F97316', // Orange
};

// Enhanced chart themes with better integration
export const CHART_THEMES: Record<string, RechartsTheme> = {
  light: {
    backgroundColor: '#FFFFFF',
    textColor: '#374151',
    fontSize: 12,
    colors: [
      CHART_COLORS.primary,
      CHART_COLORS.secondary,
      CHART_COLORS.accent,
      CHART_COLORS.success,
      CHART_COLORS.warning,
      CHART_COLORS.danger,
      CHART_COLORS.info,
    ],
  },
  dark: {
    backgroundColor: '#1F2937',
    textColor: '#F9FAFB',
    fontSize: 12,
    colors: [
      CHART_COLORS.primary,
      CHART_COLORS.secondary,
      CHART_COLORS.accent,
      CHART_COLORS.success,
      CHART_COLORS.warning,
      CHART_COLORS.danger,
      CHART_COLORS.info,
    ],
  },
};

// Theme-aware chart configuration
export const createChartTheme = (themeColors: ThemeColors, mode: ThemeMode) => {
  return {
    // Recharts theme
         rechartsTheme: {
       backgroundColor: themeColors.surface,
       textColor: themeColors.textPrimary,
       fontSize: 12,
       colors: themeColors.chartColors,
     } as RechartsTheme,
    
    // Chart styling
    styles: {
      // Common styles for all charts
      common: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 12,
        fontWeight: 400,
        color: themeColors.textPrimary,
      },
      
      // Title styles
      title: {
        fontSize: 16,
        fontWeight: 600,
        fill: themeColors.textPrimary,
        marginBottom: 8,
      },
      
      // Axis styles
      axis: {
        fontSize: 11,
        fontWeight: 400,
        fill: themeColors.chartAxis,
        stroke: themeColors.border,
        strokeWidth: 1,
      },
      
      // Grid styles
      grid: {
        stroke: themeColors.chartGrid,
        strokeWidth: 1,
        strokeDasharray: '3 3',
      },
      
      // Tooltip styles
      tooltip: {
        backgroundColor: themeColors.chartTooltip.background,
        border: `1px solid ${themeColors.chartTooltip.border}`,
        borderRadius: 6,
        boxShadow: mode === 'dark' 
          ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)' 
          : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        fontSize: 12,
        padding: 8,
        color: themeColors.chartTooltip.text,
      },
      
      // Legend styles
      legend: {
        fontSize: 11,
        fontWeight: 400,
        fill: themeColors.textSecondary,
      },
      
      // Chart container styles
      container: {
        backgroundColor: themeColors.surface,
        border: `1px solid ${themeColors.border}`,
        borderRadius: 8,
        boxShadow: mode === 'dark' 
          ? '0 1px 3px 0 rgba(0, 0, 0, 0.3)' 
          : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      },
      
      // Interactive elements
      interactive: {
        hover: {
          backgroundColor: themeColors.surfaceHover,
          borderColor: themeColors.borderHover,
        },
        active: {
          backgroundColor: themeColors.primary,
          color: themeColors.surface,
        },
        disabled: {
          opacity: 0.5,
          cursor: 'not-allowed',
        },
      },
    },
    
    // Color palettes for different chart types
    colorPalettes: {
      // Sequential color palette for data that has a natural order
      sequential: [
        themeColors.primary,
        themeColors.secondary,
        themeColors.accent,
        themeColors.success,
        themeColors.warning,
      ],
      
      // Diverging color palette for data that has a meaningful center point
      diverging: [
        themeColors.danger,
        themeColors.warning,
        themeColors.neutral,
        themeColors.success,
        themeColors.primary,
      ],
      
      // Qualitative color palette for categorical data
      qualitative: themeColors.chartColors,
      
      // Semantic color palette for specific meanings
      semantic: {
        positive: themeColors.success,
        negative: themeColors.danger,
        neutral: themeColors.neutral,
        warning: themeColors.warning,
        info: themeColors.info,
      },
    },
  };
};

// Chart dimensions and responsive breakpoints
export const CHART_DIMENSIONS = {
  small: {
    width: 300,
    height: 200,
  },
  medium: {
    width: 500,
    height: 300,
  },
  large: {
    width: 800,
    height: 400,
  },
  full: {
    width: '100%',
    height: 400,
  },
};

// Chart styling defaults (legacy - use createChartTheme instead)
export const CHART_STYLES = {
  // Common styles for all charts
  common: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    fontWeight: 400,
  },
  
  // Title styles
  title: {
    fontSize: 16,
    fontWeight: 600,
    fill: '#111827',
    marginBottom: 8,
  },
  
  // Axis styles
  axis: {
    fontSize: 11,
    fontWeight: 400,
    fill: '#6B7280',
    stroke: '#E5E7EB',
    strokeWidth: 1,
  },
  
  // Grid styles
  grid: {
    stroke: '#E5E7EB',
    strokeWidth: 1,
    strokeDasharray: '3 3',
  },
  
  // Tooltip styles
  tooltip: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: 6,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    fontSize: 12,
    padding: 8,
  },
  
  // Legend styles
  legend: {
    fontSize: 11,
    fontWeight: 400,
    fill: '#6B7280',
  },
};

// Chart animation settings
export const CHART_ANIMATIONS = {
  duration: 300,
  easing: 'ease-in-out',
};

// Chart accessibility settings
export const CHART_ACCESSIBILITY = {
  // ARIA labels for different chart types
  ariaLabels: {
    pieChart: 'Pie chart showing data distribution',
    barChart: 'Bar chart showing data comparison',
    lineChart: 'Line chart showing data trends',
    areaChart: 'Area chart showing data trends',
    scatterChart: 'Scatter plot showing data correlation',
    waterfallChart: 'Waterfall chart showing cumulative data',
  },
  
  // Screen reader descriptions
  descriptions: {
    pieChart: 'Interactive pie chart with clickable segments',
    barChart: 'Interactive bar chart with hover tooltips',
    lineChart: 'Interactive line chart showing trends over time',
    areaChart: 'Interactive area chart showing cumulative trends',
    scatterChart: 'Interactive scatter plot showing data correlation',
    waterfallChart: 'Interactive waterfall chart showing cumulative values',
  },
};

// Chart export settings
export const CHART_EXPORT = {
  formats: ['png', 'svg', 'pdf'],
  defaultFormat: 'png',
  quality: 0.9,
  backgroundColor: '#FFFFFF',
};

// Chart interaction settings
export const CHART_INTERACTIONS = {
  // Hover effects
  hover: {
    enabled: true,
    duration: 200,
  },
  
  // Click effects
  click: {
    enabled: true,
    highlight: true,
  },
  
  // Zoom and pan
  zoom: {
    enabled: false, // Can be enabled per chart
    minZoom: 0.5,
    maxZoom: 3,
  },
  
  // Brush selection
  brush: {
    enabled: false, // Can be enabled per chart
    stroke: CHART_COLORS.primary,
    strokeWidth: 2,
    fill: `${CHART_COLORS.primary}20`,
  },
};

// Chart data formatting
export const CHART_FORMATTING = {
  // Number formatting
  numbers: {
    currency: {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
    percentage: {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    },
    decimal: {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  },
  
  // Date formatting
  dates: {
    short: 'MMM dd',
    medium: 'MMM dd, yyyy',
    long: 'MMMM dd, yyyy',
    time: 'HH:mm',
    datetime: 'MMM dd, yyyy HH:mm',
  },
  
  // Text truncation
  text: {
    maxLength: 20,
    ellipsis: '...',
  },
};

// Chart responsive breakpoints
export const CHART_RESPONSIVE = {
  mobile: {
    maxWidth: 640,
    fontSize: 10,
    padding: 8,
  },
  tablet: {
    maxWidth: 1024,
    fontSize: 11,
    padding: 12,
  },
  desktop: {
    maxWidth: 1280,
    fontSize: 12,
    padding: 16,
  },
  large: {
    maxWidth: 1536,
    fontSize: 13,
    padding: 20,
  },
};

// Chart theme presets for different use cases
export const CHART_THEME_PRESETS = {
  // Professional theme for business dashboards
  professional: {
    colors: [
      '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444',
      '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#14B8A6'
    ],
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    borderRadius: 6,
  },
  
  // Modern theme with vibrant colors
  modern: {
    colors: [
      '#6366F1', '#8B5CF6', '#EC4899', '#F97316', '#F59E0B',
      '#10B981', '#06B6D4', '#3B82F6', '#84CC16', '#14B8A6'
    ],
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    borderRadius: 8,
  },
  
  // Minimal theme with subtle colors
  minimal: {
    colors: [
      '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB', '#F3F4F6',
      '#374151', '#4B5563', '#6B7280', '#9CA3AF', '#D1D5DB'
    ],
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    borderRadius: 4,
  },
  
  // High contrast theme for accessibility
  highContrast: {
    colors: [
      '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
      '#FFFF00', '#FF00FF', '#00FFFF', '#800000', '#008000'
    ],
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
    borderRadius: 0,
  },
};

export default {
  CHART_COLORS,
  CHART_THEMES,
  CHART_DIMENSIONS,
  CHART_STYLES,
  CHART_ANIMATIONS,
  CHART_ACCESSIBILITY,
  CHART_EXPORT,
  CHART_INTERACTIONS,
  CHART_FORMATTING,
  CHART_RESPONSIVE,
  CHART_THEME_PRESETS,
  createChartTheme,
};
