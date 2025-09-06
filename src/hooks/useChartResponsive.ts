import { useMemo, useCallback } from 'react';
import { useResponsive } from '../components/dashboard/ResponsiveDesign';

export interface ChartResponsiveConfig {
  // Chart dimensions
  height: number;
  width: string | number;
  
  // Chart-specific responsive settings
  fontSize: {
    title: string;
    subtitle: string;
    axis: string;
    legend: string;
    tooltip: string;
    labels: string;
  };
  
  // Spacing and padding
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  
  // Chart element sizes
  barSize: number;
  barGap: number;
  barCategoryGap: number;
  pointRadius: number;
  lineStrokeWidth: number;
  
  // Legend configuration
  legend: {
    layout: 'horizontal' | 'vertical';
    align: 'left' | 'center' | 'right';
    verticalAlign: 'top' | 'middle' | 'bottom';
    wrapperStyle: React.CSSProperties;
  };
  
  // Tooltip configuration
  tooltip: {
    wrapperStyle: React.CSSProperties;
    contentStyle: React.CSSProperties;
  };
  
  // Axis configuration
  axis: {
    tickSize: number;
    tickPadding: number;
    axisLine: boolean;
    tickLine: boolean;
  };
  
  // Grid configuration
  grid: {
    strokeDasharray: string;
    strokeWidth: number;
  };
  
  // Interactive elements
  interactive: {
    enableZoom: boolean;
    enablePan: boolean;
    enableSelection: boolean;
    enableDrillDown: boolean;
  };
}

export interface UseChartResponsiveOptions {
  chartType?: 'pie' | 'bar' | 'line' | 'area' | 'waterfall';
  orientation?: 'horizontal' | 'vertical';
  showLegend?: boolean;
  showTooltip?: boolean;
  showGrid?: boolean;
  enableInteractions?: boolean;
  customHeight?: number;
  customWidth?: string | number;
}

export const useChartResponsive = (options: UseChartResponsiveOptions = {}): ChartResponsiveConfig => {
  const {
    breakpoint,
    deviceType,
    isMobile,
    isTablet,
    isDesktop
  } = useResponsive();

  const {
    chartType = 'bar',
    orientation = 'vertical',
    showLegend = true,
    showTooltip = true,
    showGrid = true,
    enableInteractions = true,
    customHeight,
    customWidth
  } = options;

  // Responsive height calculation
  const height = useMemo(() => {
    if (customHeight) return customHeight;
    
    if (isMobile) {
      return chartType === 'pie' ? 300 : 250;
    } else if (isTablet) {
      return chartType === 'pie' ? 350 : 300;
    } else {
      return chartType === 'pie' ? 400 : 350;
    }
  }, [customHeight, isMobile, isTablet, isDesktop, chartType]);

  // Responsive width calculation
  const width = useMemo(() => {
    if (customWidth) return customWidth;
    return '100%';
  }, [customWidth]);

  // Responsive font sizes
  const fontSize = useMemo(() => {
    if (isMobile) {
      return {
        title: 'text-sm',
        subtitle: 'text-xs',
        axis: 'text-xs',
        legend: 'text-xs',
        tooltip: 'text-xs',
        labels: 'text-xs'
      };
    } else if (isTablet) {
      return {
        title: 'text-base',
        subtitle: 'text-sm',
        axis: 'text-sm',
        legend: 'text-sm',
        tooltip: 'text-sm',
        labels: 'text-sm'
      };
    } else {
      return {
        title: 'text-lg',
        subtitle: 'text-base',
        axis: 'text-sm',
        legend: 'text-sm',
        tooltip: 'text-sm',
        labels: 'text-sm'
      };
    }
  }, [isMobile, isTablet, isDesktop]);

  // Responsive padding
  const padding = useMemo(() => {
    if (isMobile) {
      return {
        top: 10,
        right: 10,
        bottom: 30,
        left: 10
      };
    } else if (isTablet) {
      return {
        top: 15,
        right: 15,
        bottom: 40,
        left: 15
      };
    } else {
      return {
        top: 20,
        right: 20,
        bottom: 50,
        left: 20
      };
    }
  }, [isMobile, isTablet, isDesktop]);

  // Responsive chart element sizes
  const chartElements = useMemo(() => {
    if (isMobile) {
      return {
        barSize: 20,
        barGap: 4,
        barCategoryGap: 8,
        pointRadius: 3,
        lineStrokeWidth: 2
      };
    } else if (isTablet) {
      return {
        barSize: 30,
        barGap: 6,
        barCategoryGap: 12,
        pointRadius: 4,
        lineStrokeWidth: 2
      };
    } else {
      return {
        barSize: 40,
        barGap: 8,
        barCategoryGap: 16,
        pointRadius: 5,
        lineStrokeWidth: 3
      };
    }
  }, [isMobile, isTablet, isDesktop]);

  // Responsive legend configuration
  const legend = useMemo(() => {
    const isVertical = orientation === 'vertical' || isMobile;
    
    return {
      layout: isVertical ? 'vertical' : 'horizontal' as 'horizontal' | 'vertical',
      align: isMobile ? 'center' : 'right' as 'left' | 'center' | 'right',
      verticalAlign: isMobile ? 'bottom' : 'middle' as 'top' | 'middle' | 'bottom',
      wrapperStyle: {
        fontSize: isMobile ? 12 : 14,
        padding: isMobile ? '8px' : '12px',
        marginTop: isMobile ? '8px' : '12px'
      }
    };
  }, [orientation, isMobile, isTablet, isDesktop]);

  // Responsive tooltip configuration
  const tooltip = useMemo(() => {
    return {
      wrapperStyle: {
        fontSize: isMobile ? 12 : 14,
        padding: isMobile ? '8px' : '12px',
        borderRadius: '6px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      },
      contentStyle: {
        fontSize: isMobile ? 11 : 13,
        lineHeight: 1.4
      }
    };
  }, [isMobile, isTablet, isDesktop]);

  // Responsive axis configuration
  const axis = useMemo(() => {
    return {
      tickSize: isMobile ? 4 : 6,
      tickPadding: isMobile ? 4 : 6,
      axisLine: !isMobile,
      tickLine: !isMobile
    };
  }, [isMobile, isTablet, isDesktop]);

  // Responsive grid configuration
  const grid = useMemo(() => {
    return {
      strokeDasharray: isMobile ? '2 2' : '3 3',
      strokeWidth: isMobile ? 0.5 : 1
    };
  }, [isMobile, isTablet, isDesktop]);

  // Responsive interactive elements
  const interactive = useMemo(() => {
    return {
      enableZoom: enableInteractions && !isMobile,
      enablePan: enableInteractions && !isMobile,
      enableSelection: enableInteractions && !isMobile,
      enableDrillDown: enableInteractions && !isMobile
    };
  }, [enableInteractions, isMobile, isTablet, isDesktop]);

  // Utility functions
  const getResponsiveValue = useCallback((mobile: any, tablet: any, desktop: any) => {
    if (isMobile) return mobile;
    if (isTablet) return tablet;
    return desktop;
  }, [isMobile, isTablet, isDesktop]);

  const getResponsiveStyle = useCallback((styles: Record<string, any>) => {
    return getResponsiveValue(styles.mobile, styles.tablet, styles.desktop);
  }, [getResponsiveValue]);

  return {
    height,
    width,
    fontSize,
    padding,
    barSize: chartElements.barSize,
    barGap: chartElements.barGap,
    barCategoryGap: chartElements.barCategoryGap,
    pointRadius: chartElements.pointRadius,
    lineStrokeWidth: chartElements.lineStrokeWidth,
    legend,
    tooltip,
    axis,
    grid,
    interactive
  };
};

export default useChartResponsive;





