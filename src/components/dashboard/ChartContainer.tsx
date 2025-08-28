import React, { useState, useCallback, ReactNode, useRef, useEffect } from 'react';
import { ResponsiveText, ResponsiveCard } from '../dashboard/ResponsiveDesign';

// Chart container types and interfaces
export type ChartType = 'pie' | 'bar' | 'line' | 'waterfall' | 'table' | 'custom';
export type ChartSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type ChartTheme = 'light' | 'dark' | 'auto';
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// Chart data interface
interface ChartData {
  title?: string;
  subtitle?: string;
  data: any[];
  metadata?: {
    totalRecords?: number;
    lastUpdated?: string;
    dataSource?: string;
  };
}

// Chart container props interface
interface ChartContainerProps {
  title: string;
  subtitle?: string;
  type: ChartType;
  size?: ChartSize;
  theme?: ChartTheme;
  loading?: boolean;
  error?: string | null;
  data?: ChartData;
  children: ReactNode;
  className?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  showLegend?: boolean;
  showToolbar?: boolean;
  showExport?: boolean;
  showRefresh?: boolean;
  showFullscreen?: boolean;
  onRefresh?: () => void;
  onExport?: (format: 'png' | 'pdf' | 'csv' | 'json') => void;
  onFullscreen?: () => void;
  onDrillDown?: (data: any) => void;
  emptyStateMessage?: string;
  emptyStateIcon?: ReactNode;
  height?: string | number;
  minHeight?: string | number;
  maxHeight?: string | number;
  backgroundColor?: string;
  borderColor?: string;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  responsive?: boolean;
  interactive?: boolean;
  animated?: boolean;
  tooltip?: {
    enabled?: boolean;
    position?: 'top' | 'bottom' | 'left' | 'right';
    content?: (data: any) => ReactNode;
  };
}

// Size configuration
const SIZE_CONFIG = {
  sm: {
    height: 'h-48',
    minHeight: 'min-h-48',
    padding: 'p-4',
    titleSize: 'text-sm',
    subtitleSize: 'text-xs'
  },
  md: {
    height: 'h-64',
    minHeight: 'min-h-64',
    padding: 'p-6',
    titleSize: 'text-base',
    subtitleSize: 'text-sm'
  },
  lg: {
    height: 'h-80',
    minHeight: 'min-h-80',
    padding: 'p-8',
    titleSize: 'text-lg',
    subtitleSize: 'text-base'
  },
  xl: {
    height: 'h-96',
    minHeight: 'min-h-96',
    padding: 'p-10',
    titleSize: 'text-xl',
    subtitleSize: 'text-lg'
  },
  full: {
    height: 'h-full',
    minHeight: 'min-h-full',
    padding: 'p-12',
    titleSize: 'text-2xl',
    subtitleSize: 'text-xl'
  }
};

// Theme configuration
const THEME_CONFIG = {
  light: {
    backgroundColor: 'bg-white',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-900',
    subtitleColor: 'text-gray-600'
  },
  dark: {
    backgroundColor: 'bg-gray-900',
    borderColor: 'border-gray-700',
    textColor: 'text-white',
    subtitleColor: 'text-gray-400'
  },
  auto: {
    backgroundColor: 'bg-white dark:bg-gray-900',
    borderColor: 'border-gray-200 dark:border-gray-700',
    textColor: 'text-gray-900 dark:text-white',
    subtitleColor: 'text-gray-600 dark:text-gray-400'
  }
};

// Shadow configuration
const SHADOW_CONFIG = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow',
  lg: 'shadow-lg'
};

// Padding configuration
const PADDING_CONFIG = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8'
};

// Loading skeleton component
const LoadingSkeleton: React.FC<{ size: ChartSize; theme: ChartTheme }> = ({ size, theme }) => {
  const config = SIZE_CONFIG[size];
  const themeConfig = THEME_CONFIG[theme];
  
  return (
    <div className={`${config.height} ${config.padding} ${themeConfig.backgroundColor} ${themeConfig.borderColor} border rounded-lg animate-pulse`}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        <div className="flex space-x-2">
          <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
      
      {/* Chart area skeleton */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
      
      {/* Footer skeleton */}
      <div className="mt-4 flex justify-between items-center">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/6"></div>
      </div>
    </div>
  );
};

// Error state component
const ErrorState: React.FC<{ 
  error: string; 
  size: ChartSize; 
  theme: ChartTheme;
  onRefresh?: () => void;
}> = ({ error, size, theme, onRefresh }) => {
  const config = SIZE_CONFIG[size];
  const themeConfig = THEME_CONFIG[theme];
  
  return (
    <div className={`${config.height} ${config.padding} ${themeConfig.backgroundColor} ${themeConfig.borderColor} border rounded-lg`}>
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="flex-shrink-0 mb-4">
          <svg className="h-12 w-12 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className={`text-sm font-medium ${themeConfig.textColor} mb-2`}>
          Chart Error
        </h3>
        <p className={`text-sm ${themeConfig.subtitleColor} mb-4 max-w-sm`}>
          {error}
        </p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

// Empty state component
const EmptyState: React.FC<{ 
  message: string; 
  icon: ReactNode; 
  size: ChartSize; 
  theme: ChartTheme;
}> = ({ message, icon, size, theme }) => {
  const config = SIZE_CONFIG[size];
  const themeConfig = THEME_CONFIG[theme];
  
  return (
    <div className={`${config.height} ${config.padding} ${themeConfig.backgroundColor} ${themeConfig.borderColor} border rounded-lg`}>
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="flex-shrink-0 mb-4 text-gray-400">
          {icon}
        </div>
        <h3 className={`text-sm font-medium ${themeConfig.textColor} mb-2`}>
          No Data Available
        </h3>
        <p className={`text-sm ${themeConfig.subtitleColor} max-w-sm`}>
          {message}
        </p>
      </div>
    </div>
  );
};

// Toolbar component
const ChartToolbar: React.FC<{
  showExport?: boolean;
  showRefresh?: boolean;
  showFullscreen?: boolean;
  onRefresh?: () => void;
  onExport?: (format: 'png' | 'pdf' | 'csv' | 'json') => void;
  onFullscreen?: () => void;
  theme: ChartTheme;
}> = ({ 
  showExport, 
  showRefresh, 
  showFullscreen, 
  onRefresh, 
  onExport, 
  onFullscreen, 
  theme 
}) => {
  const themeConfig = THEME_CONFIG[theme];
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  const handleExport = useCallback((format: 'png' | 'pdf' | 'csv' | 'json') => {
    if (onExport) {
      onExport(format);
    }
    setShowExportMenu(false);
  }, [onExport]);
  
  return (
    <div className="flex items-center space-x-2">
      {showRefresh && onRefresh && (
        <button
          onClick={onRefresh}
          className={`p-1 rounded-md ${themeConfig.subtitleColor} hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}
          title="Refresh data"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}
      
      {showExport && onExport && (
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className={`p-1 rounded-md ${themeConfig.subtitleColor} hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}
            title="Export chart"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          
          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
              <div className="py-1">
                <button
                  onClick={() => handleExport('png')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Export as PNG
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Export as PDF
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Export as CSV
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Export as JSON
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {showFullscreen && onFullscreen && (
        <button
          onClick={onFullscreen}
          className={`p-1 rounded-md ${themeConfig.subtitleColor} hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}
          title="Fullscreen"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      )}
    </div>
  );
};

// Main Chart Container component
const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  subtitle,
  type,
  size = 'md',
  theme = 'auto',
  loading = false,
  error = null,
  data,
  children,
  className = '',
  showHeader = true,
  showFooter = true,
  showLegend = false,
  showToolbar = true,
  showExport = false,
  showRefresh = false,
  showFullscreen = false,
  onRefresh,
  onExport,
  onFullscreen,
  onDrillDown,
  emptyStateMessage = 'No data available for this chart',
  emptyStateIcon,
  height,
  minHeight,
  maxHeight,
  backgroundColor,
  borderColor,
  shadow = 'md',
  padding = 'md',
  responsive = true,
  interactive = true,
  animated = true,
  tooltip = { enabled: true, position: 'top' }
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Get configurations
  const sizeConfig = SIZE_CONFIG[size];
  const themeConfig = THEME_CONFIG[theme];
  const shadowConfig = SHADOW_CONFIG[shadow];
  const paddingConfig = PADDING_CONFIG[padding];
  
  // Determine if data is empty
  const isEmpty = !data || !data.data || data.data.length === 0;
  
  // Handle fullscreen toggle
  const handleFullscreen = useCallback(() => {
    if (onFullscreen) {
      onFullscreen();
    } else {
      setIsFullscreen(!isFullscreen);
    }
  }, [onFullscreen, isFullscreen]);
  
  // Handle click outside export menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // Close any open menus
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Loading state
  if (loading) {
    return <LoadingSkeleton size={size} theme={theme} />;
  }
  
  // Error state
  if (error) {
    return <ErrorState error={error} size={size} theme={theme} onRefresh={onRefresh} />;
  }
  
  // Empty state
  if (isEmpty) {
    const defaultIcon = (
      <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    );
    
    return (
      <EmptyState 
        message={emptyStateMessage} 
        icon={emptyStateIcon || defaultIcon} 
        size={size} 
        theme={theme} 
      />
    );
  }
  
  // Custom height styles
  const customHeight = height ? { height: typeof height === 'number' ? `${height}px` : height } : {};
  const customMinHeight = minHeight ? { minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight } : {};
  const customMaxHeight = maxHeight ? { maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight } : {};
  
  // Custom background and border
  const customBackground = backgroundColor || themeConfig.backgroundColor;
  const customBorder = borderColor || themeConfig.borderColor;
  
  return (
    <ResponsiveCard
      className={`
        ${!height ? sizeConfig.height : ''}
        ${!minHeight ? sizeConfig.minHeight : ''}
        ${customBackground}
        ${customBorder}
        ${shadowConfig}
        ${responsive ? 'w-full' : ''}
        ${interactive ? 'cursor-pointer' : ''}
        ${animated ? 'transition-all duration-200' : ''}
        ${isFullscreen ? 'fixed inset-0 z-50' : ''}
        ${className}
      `}
      style={{
        ...customHeight,
        ...customMinHeight,
        ...customMaxHeight
      }}
      mobilePadding="p-4"
      tabletPadding="p-5"
      desktopPadding="p-6"
    >
      {/* Header */}
      {showHeader && (
        <div className={`${paddingConfig} border-b ${themeConfig.borderColor}`}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <ResponsiveText
                mobileSize="text-base"
                tabletSize="text-lg"
                desktopSize="text-xl"
                className={`font-medium ${themeConfig.textColor} truncate`}
              >
                {title}
              </ResponsiveText>
              {subtitle && (
                <ResponsiveText
                  mobileSize="text-sm"
                  tabletSize="text-sm"
                  desktopSize="text-base"
                  className={`${themeConfig.subtitleColor} truncate`}
                >
                  {subtitle}
                </ResponsiveText>
              )}
            </div>
            
            {showToolbar && (
              <ChartToolbar
                showExport={showExport}
                showRefresh={showRefresh}
                showFullscreen={showFullscreen}
                onRefresh={onRefresh}
                onExport={onExport}
                onFullscreen={handleFullscreen}
                theme={theme}
              />
            )}
          </div>
        </div>
      )}
      
      {/* Chart Content */}
      <div className={`flex-1 ${paddingConfig} relative`}>
        <div className="w-full h-full">
          {children}
        </div>
      </div>
      
      {/* Footer */}
      {showFooter && data?.metadata && (
        <div className={`${paddingConfig} border-t ${themeConfig.borderColor} bg-gray-50 dark:bg-gray-800`}>
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            {data.metadata.totalRecords && (
              <span>{data.metadata.totalRecords.toLocaleString()} records</span>
            )}
            {data.metadata.lastUpdated && (
              <span>Updated: {new Date(data.metadata.lastUpdated).toLocaleString()}</span>
            )}
            {data.metadata.dataSource && (
              <span>Source: {data.metadata.dataSource}</span>
            )}
          </div>
        </div>
      )}
      
      {/* Legend */}
      {showLegend && (
        <div className={`${paddingConfig} border-t ${themeConfig.borderColor}`}>
          {/* Legend content will be implemented by individual chart components */}
        </div>
      )}
    </ResponsiveCard>
  );
};

// Export additional components for flexibility
export const ChartGrid: React.FC<{ 
  children: ReactNode; 
  columns?: number; 
  gap?: number; 
  className?: string;
  responsive?: boolean;
}> = ({ 
  children, 
  columns = 2, 
  gap = 6, 
  className = '',
  responsive = true
}) => {
  const gridClasses = responsive 
    ? `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-${gap}`
    : `grid grid-cols-${columns} gap-${gap}`;
    
  return (
    <div className={`${gridClasses} ${className}`}>
      {children}
    </div>
  );
};

export const ChartRow: React.FC<{ 
  children: ReactNode; 
  className?: string;
  gap?: number;
}> = ({ 
  children, 
  className = '',
  gap = 6
}) => {
  return (
    <div className={`flex flex-wrap gap-${gap} ${className}`}>
      {children}
    </div>
  );
};

export default ChartContainer;
