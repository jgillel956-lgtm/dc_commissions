import { useCallback, useMemo, useRef, useState } from 'react';
import { CHART_ACCESSIBILITY } from '../config/chartConfig';

export interface AccessibilityState {
  focusedIndex: number | null;
  selectedIndex: number | null;
  announcedData: string | null;
  isNavigating: boolean;
}

export interface UseChartAccessibilityOptions {
  chartType: 'pieChart' | 'barChart' | 'lineChart' | 'areaChart' | 'scatterChart' | 'waterfallChart';
  data: any[];
  title?: string;
  subtitle?: string;
  enableKeyboardNavigation?: boolean;
  enableScreenReader?: boolean;
  customAriaLabel?: string;
  customAriaDescription?: string;
  onDataPointSelect?: (index: number, data: any) => void;
  onDataPointFocus?: (index: number, data: any) => void;
}

export interface AccessibilityActions {
  focusNext: () => void;
  focusPrevious: () => void;
  selectCurrent: () => void;
  announceData: (message: string) => void;
  getAriaProps: () => Record<string, any>;
  getKeyboardProps: () => Record<string, any>;
  getDataPointProps: (index: number, data: any) => Record<string, any>;
}

export const useChartAccessibility = (options: UseChartAccessibilityOptions): AccessibilityActions => {
  const {
    chartType,
    data,
    title,
    subtitle,
    enableKeyboardNavigation = true,
    enableScreenReader = true,
    customAriaLabel,
    customAriaDescription,
    onDataPointSelect,
    onDataPointFocus,
  } = options;

  const [state, setState] = useState<AccessibilityState>({
    focusedIndex: null,
    selectedIndex: null,
    announcedData: null,
    isNavigating: false,
  });

  const announcementRef = useRef<HTMLDivElement>(null);

  // Generate ARIA labels and descriptions
  const ariaLabel = useMemo(() => {
    if (customAriaLabel) return customAriaLabel;
    if (title) return `${CHART_ACCESSIBILITY.ariaLabels[chartType]}: ${title}`;
    return CHART_ACCESSIBILITY.ariaLabels[chartType];
  }, [customAriaLabel, title, chartType]);

  const ariaDescription = useMemo(() => {
    if (customAriaDescription) return customAriaDescription;
    const baseDescription = CHART_ACCESSIBILITY.descriptions[chartType];
    const dataPoints = data.length;
    return `${baseDescription}. Contains ${dataPoints} data points. Use arrow keys to navigate and Enter to select.`;
  }, [customAriaDescription, chartType, data.length]);

  // Keyboard navigation handlers
  const focusNext = useCallback(() => {
    if (!enableKeyboardNavigation || data.length === 0) return;

    setState(prev => {
      const nextIndex = prev.focusedIndex === null ? 0 : (prev.focusedIndex + 1) % data.length;
      const nextData = data[nextIndex];
      
      if (onDataPointFocus) {
        onDataPointFocus(nextIndex, nextData);
      }

      return {
        ...prev,
        focusedIndex: nextIndex,
        isNavigating: true,
      };
    });
  }, [enableKeyboardNavigation, data, onDataPointFocus]);

  const focusPrevious = useCallback(() => {
    if (!enableKeyboardNavigation || data.length === 0) return;

    setState(prev => {
      const prevIndex = prev.focusedIndex === null ? data.length - 1 : (prev.focusedIndex - 1 + data.length) % data.length;
      const prevData = data[prevIndex];
      
      if (onDataPointFocus) {
        onDataPointFocus(prevIndex, prevData);
      }

      return {
        ...prev,
        focusedIndex: prevIndex,
        isNavigating: true,
      };
    });
  }, [enableKeyboardNavigation, data, onDataPointFocus]);

  const selectCurrent = useCallback(() => {
    if (!enableKeyboardNavigation || state.focusedIndex === null) return;

    const currentData = data[state.focusedIndex];
    
    setState(prev => ({
      ...prev,
      selectedIndex: prev.focusedIndex,
    }));

    if (onDataPointSelect) {
      onDataPointSelect(state.focusedIndex, currentData);
    }
  }, [enableKeyboardNavigation, state.focusedIndex, data, onDataPointSelect]);

  // Screen reader announcement
  const announceData = useCallback((message: string) => {
    if (!enableScreenReader) return;

    setState(prev => ({
      ...prev,
      announcedData: message,
    }));

    // Clear announcement after a delay
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        announcedData: null,
      }));
    }, 1000);
  }, [enableScreenReader]);

  // Generate ARIA properties for the chart container
  const getAriaProps = useCallback(() => {
    const baseProps = {
      role: 'img',
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescription ? 'chart-description' : undefined,
      tabIndex: enableKeyboardNavigation ? 0 : undefined,
    };

    if (enableScreenReader) {
      return {
        ...baseProps,
        'aria-live': 'polite',
        'aria-atomic': 'false',
      };
    }

    return baseProps;
  }, [ariaLabel, ariaDescription, enableKeyboardNavigation, enableScreenReader]);

  // Generate keyboard navigation properties
  const getKeyboardProps = useCallback(() => {
    if (!enableKeyboardNavigation) return {};

    return {
      onKeyDown: (event: React.KeyboardEvent) => {
        switch (event.key) {
          case 'ArrowRight':
          case 'ArrowDown':
            event.preventDefault();
            focusNext();
            break;
          case 'ArrowLeft':
          case 'ArrowUp':
            event.preventDefault();
            focusPrevious();
            break;
          case 'Enter':
          case ' ':
            event.preventDefault();
            selectCurrent();
            break;
          case 'Home':
            event.preventDefault();
            setState(prev => ({
              ...prev,
              focusedIndex: 0,
              isNavigating: true,
            }));
            break;
          case 'End':
            event.preventDefault();
            setState(prev => ({
              ...prev,
              focusedIndex: data.length - 1,
              isNavigating: true,
            }));
            break;
          case 'Escape':
            event.preventDefault();
            setState(prev => ({
              ...prev,
              focusedIndex: null,
              selectedIndex: null,
            }));
            break;
        }
      },
      onFocus: () => {
        if (state.focusedIndex === null && data.length > 0) {
          setState(prev => ({
            ...prev,
            focusedIndex: 0,
          }));
        }
      },
      onBlur: () => {
        setState(prev => ({
          ...prev,
          focusedIndex: null,
          isNavigating: false,
        }));
      },
    };
  }, [enableKeyboardNavigation, focusNext, focusPrevious, selectCurrent, data.length, state.focusedIndex]);

  // Generate properties for individual data points
  const getDataPointProps = useCallback((index: number, dataPoint: any) => {
    if (!enableKeyboardNavigation && !enableScreenReader) return {};

    const isFocused = state.focusedIndex === index;
    const isSelected = state.selectedIndex === index;
    
    // Generate data point description
    const dataDescription = generateDataPointDescription(chartType, dataPoint, index);
    
    const props: Record<string, any> = {};

    if (enableScreenReader) {
      props['aria-label'] = dataDescription;
      props['aria-describedby'] = `data-point-${index}`;
    }

    if (enableKeyboardNavigation) {
      props.tabIndex = isFocused ? 0 : -1;
      props.role = 'button';
      props['aria-pressed'] = isSelected;
      props.onClick = () => {
        setState(prev => ({
          ...prev,
          selectedIndex: index,
        }));
        if (onDataPointSelect) {
          onDataPointSelect(index, dataPoint);
        }
      };
      props.onFocus = () => {
        setState(prev => ({
          ...prev,
          focusedIndex: index,
        }));
        if (onDataPointFocus) {
          onDataPointFocus(index, dataPoint);
        }
      };
    }

    return props;
  }, [enableKeyboardNavigation, enableScreenReader, state.focusedIndex, state.selectedIndex, chartType, onDataPointSelect, onDataPointFocus]);

  return {
    focusNext,
    focusPrevious,
    selectCurrent,
    announceData,
    getAriaProps,
    getKeyboardProps,
    getDataPointProps,
  };
};

// Helper function to generate data point descriptions
const generateDataPointDescription = (chartType: string, dataPoint: any, index: number): string => {
  const { name, value, revenue, commission, profit } = dataPoint;
  
  let description = `Data point ${index + 1}`;
  
  if (name) {
    description += `: ${name}`;
  }
  
  if (value !== undefined) {
    description += `. Value: ${formatValue(value)}`;
  }
  
  if (revenue !== undefined) {
    description += `. Revenue: ${formatValue(revenue)}`;
  }
  
  if (commission !== undefined) {
    description += `. Commission: ${formatValue(commission)}`;
  }
  
  if (profit !== undefined) {
    description += `. Profit: ${formatValue(profit)}`;
  }
  
  return description;
};

// Helper function to format values for screen readers
const formatValue = (value: any): string => {
  if (typeof value === 'number') {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)} million`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)} thousand`;
    } else {
      return value.toLocaleString();
    }
  }
  return String(value);
};

export default useChartAccessibility;


