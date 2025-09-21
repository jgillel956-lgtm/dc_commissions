import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { createChartTheme, CHART_THEME_PRESETS } from '../config/chartConfig';

export type ChartThemePreset = 'professional' | 'modern' | 'minimal' | 'highContrast';

export interface UseChartThemeOptions {
  preset?: ChartThemePreset;
  customColors?: string[];
  fontSize?: number;
  borderRadius?: number;
}

export const useChartTheme = (options: UseChartThemeOptions = {}) => {
  const { theme, isDark } = useTheme();
  const { preset, customColors, fontSize, borderRadius } = options;

  const chartTheme = useMemo(() => {
    // Create base theme from current theme context
    const baseTheme = createChartTheme(theme.colors, theme.mode);
    
    // Apply preset if specified
    if (preset && CHART_THEME_PRESETS[preset]) {
      const presetConfig = CHART_THEME_PRESETS[preset];
      
      return {
        ...baseTheme,
        rechartsTheme: {
          ...baseTheme.rechartsTheme,
          colors: customColors || presetConfig.colors,
          fontSize: fontSize || presetConfig.fontSize,
        },
        styles: {
          ...baseTheme.styles,
          common: {
            ...baseTheme.styles.common,
            fontSize: fontSize || presetConfig.fontSize,
          },
          title: {
            ...baseTheme.styles.title,
            fontSize: (fontSize || presetConfig.fontSize) + 4,
          },
          axis: {
            ...baseTheme.styles.axis,
            fontSize: (fontSize || presetConfig.fontSize) - 1,
          },
          legend: {
            ...baseTheme.styles.legend,
            fontSize: (fontSize || presetConfig.fontSize) - 1,
          },
        },
        colorPalettes: {
          ...baseTheme.colorPalettes,
          qualitative: customColors || presetConfig.colors,
        },
      };
    }
    
    // Use custom colors if provided
    if (customColors) {
      return {
        ...baseTheme,
        rechartsTheme: {
          ...baseTheme.rechartsTheme,
          colors: customColors,
        },
        colorPalettes: {
          ...baseTheme.colorPalettes,
          qualitative: customColors,
        },
      };
    }
    
    return baseTheme;
  }, [theme, isDark, preset, customColors, fontSize, borderRadius]);

  // Helper functions for common chart operations
  const getColorByIndex = (index: number, palette: 'qualitative' | 'sequential' | 'diverging' = 'qualitative') => {
    const colors = chartTheme.colorPalettes[palette];
    return colors[index % colors.length];
  };

  const getSemanticColor = (type: 'positive' | 'negative' | 'neutral' | 'warning' | 'info') => {
    return chartTheme.colorPalettes.semantic[type];
  };

  const getChartStyles = () => {
    return {
      container: {
        backgroundColor: chartTheme.styles.container.backgroundColor,
        border: chartTheme.styles.container.border,
        borderRadius: chartTheme.styles.container.borderRadius,
        boxShadow: chartTheme.styles.container.boxShadow,
        padding: theme.spacing.md,
      },
      title: {
        color: chartTheme.styles.title.fill,
        fontSize: chartTheme.styles.title.fontSize,
        fontWeight: chartTheme.styles.title.fontWeight,
        marginBottom: chartTheme.styles.title.marginBottom,
      },
      subtitle: {
        color: theme.colors.textSecondary,
        fontSize: chartTheme.styles.common.fontSize - 1,
        marginBottom: theme.spacing.sm,
      },
      tooltip: {
        backgroundColor: chartTheme.styles.tooltip.backgroundColor,
        border: chartTheme.styles.tooltip.border,
        borderRadius: chartTheme.styles.tooltip.borderRadius,
        boxShadow: chartTheme.styles.tooltip.boxShadow,
        fontSize: chartTheme.styles.tooltip.fontSize,
        padding: chartTheme.styles.tooltip.padding,
        color: chartTheme.styles.tooltip.color,
      },
    };
  };

  return {
    // Theme configuration
    theme: chartTheme,
    isDark,
    
    // Recharts theme for direct use
    rechartsTheme: chartTheme.rechartsTheme,
    
    // Chart styles
    styles: chartTheme.styles,
    chartStyles: getChartStyles(),
    
    // Color utilities
    getColorByIndex,
    getSemanticColor,
    colorPalettes: chartTheme.colorPalettes,
    
    // Current theme colors
    colors: theme.colors,
    
    // Responsive breakpoints
    responsive: {
      mobile: { maxWidth: 640, fontSize: 10, padding: 8 },
      tablet: { maxWidth: 1024, fontSize: 11, padding: 12 },
      desktop: { maxWidth: 1280, fontSize: 12, padding: 16 },
      large: { maxWidth: 1536, fontSize: 13, padding: 20 },
    },
  };
};







