import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface ThemeColors {
  // Primary colors
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  
  // Neutral colors
  light: string;
  dark: string;
  neutral: string;
  
  // Background colors
  background: string;
  surface: string;
  surfaceHover: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  
  // Border colors
  border: string;
  borderHover: string;
  
  // Chart-specific colors
  chartColors: string[];
  chartGrid: string;
  chartAxis: string;
  chartTooltip: {
    background: string;
    border: string;
    text: string;
  };
}

export interface ThemeConfig {
  mode: ThemeMode;
  colors: ThemeColors;
  fonts: {
    family: string;
    sizes: {
      xs: number;
      sm: number;
      base: number;
      lg: number;
      xl: number;
      '2xl': number;
    };
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

interface ThemeContextType {
  theme: ThemeConfig;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Light theme colors
const lightColors: ThemeColors = {
  primary: '#3B82F6', // Blue
  secondary: '#10B981', // Green
  accent: '#F59E0B', // Amber
  success: '#10B981', // Green
  warning: '#F59E0B', // Amber
  danger: '#EF4444', // Red
  info: '#06B6D4', // Cyan
  light: '#F3F4F6', // Gray-100
  dark: '#1F2937', // Gray-800
  neutral: '#6B7280', // Gray-500
  
  background: '#F8FAFC', // Slate-50
  surface: '#FFFFFF',
  surfaceHover: '#F1F5F9', // Slate-100
  
  textPrimary: '#0F172A', // Slate-900
  textSecondary: '#475569', // Slate-600
  textMuted: '#64748B', // Slate-500
  
  border: '#E2E8F0', // Slate-200
  borderHover: '#CBD5E1', // Slate-300
  
  chartColors: [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EF4444', // Red
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#EC4899', // Pink
    '#14B8A6', // Teal
  ],
  chartGrid: '#E2E8F0', // Slate-200
  chartAxis: '#64748B', // Slate-500
  chartTooltip: {
    background: '#FFFFFF',
    border: '#E2E8F0',
    text: '#0F172A',
  },
};

// Dark theme colors
const darkColors: ThemeColors = {
  primary: '#60A5FA', // Blue-400
  secondary: '#34D399', // Green-400
  accent: '#FBBF24', // Amber-400
  success: '#34D399', // Green-400
  warning: '#FBBF24', // Amber-400
  danger: '#F87171', // Red-400
  info: '#22D3EE', // Cyan-400
  light: '#374151', // Gray-700
  dark: '#F9FAFB', // Gray-50
  neutral: '#9CA3AF', // Gray-400
  
  background: '#0F172A', // Slate-900
  surface: '#1E293B', // Slate-800
  surfaceHover: '#334155', // Slate-700
  
  textPrimary: '#F8FAFC', // Slate-50
  textSecondary: '#CBD5E1', // Slate-300
  textMuted: '#94A3B8', // Slate-400
  
  border: '#334155', // Slate-700
  borderHover: '#475569', // Slate-600
  
  chartColors: [
    '#60A5FA', // Blue-400
    '#34D399', // Green-400
    '#FBBF24', // Amber-400
    '#A78BFA', // Purple-400
    '#F87171', // Red-400
    '#22D3EE', // Cyan-400
    '#A3E635', // Lime-400
    '#FB923C', // Orange-400
    '#F472B6', // Pink-400
    '#2DD4BF', // Teal-400
  ],
  chartGrid: '#334155', // Slate-700
  chartAxis: '#94A3B8', // Slate-400
  chartTooltip: {
    background: '#1E293B', // Slate-800
    border: '#334155', // Slate-700
    text: '#F8FAFC', // Slate-50
  },
};

// Default theme configuration
const defaultTheme: ThemeConfig = {
  mode: 'light',
  colors: lightColors,
  fonts: {
    family: 'Inter, system-ui, sans-serif',
    sizes: {
      xs: 10,
      sm: 12,
      base: 14,
      lg: 16,
      xl: 18,
      '2xl': 20,
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
  initialMode?: ThemeMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  initialMode = 'light' 
}) => {
  const [theme, setTheme] = useState<ThemeConfig>(() => {
    // Try to get theme from localStorage
    const savedMode = localStorage.getItem('theme-mode') as ThemeMode;
    const mode = savedMode || initialMode;
    
    return {
      ...defaultTheme,
      mode,
      colors: mode === 'dark' ? darkColors : lightColors,
    };
  });

  // Update theme colors based on mode
  const updateThemeColors = (mode: ThemeMode) => {
    const colors = mode === 'dark' ? darkColors : lightColors;
    setTheme(prev => ({
      ...prev,
      mode,
      colors,
    }));
  };

  // Set theme mode
  const setThemeMode = (mode: ThemeMode) => {
    localStorage.setItem('theme-mode', mode);
    updateThemeColors(mode);
  };

  // Toggle between light and dark
  const toggleTheme = () => {
    const newMode = theme.mode === 'light' ? 'dark' : 'light';
    setThemeMode(newMode);
  };

  // Handle system theme preference
  useEffect(() => {
    if (theme.mode === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        updateThemeColors(e.matches ? 'dark' : 'light');
      };

      mediaQuery.addEventListener('change', handleChange);
      updateThemeColors(mediaQuery.matches ? 'dark' : 'light');

      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme.mode]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Set CSS custom properties
    Object.entries(theme.colors).forEach(([key, value]) => {
      if (typeof value === 'string') {
        root.style.setProperty(`--color-${key}`, value);
      } else if (typeof value === 'object') {
        Object.entries(value).forEach(([subKey, subValue]) => {
          root.style.setProperty(`--color-${key}-${subKey}`, String(subValue));
        });
      }
    });

    // Set theme class on body
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${theme.mode}`);
  }, [theme]);

  const value: ThemeContextType = {
    theme,
    setThemeMode,
    toggleTheme,
    isDark: theme.mode === 'dark' || (theme.mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches),
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
