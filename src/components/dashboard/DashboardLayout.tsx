import React, { useState, useCallback, ReactNode } from 'react';
import { DashboardFilters } from '../../types/dashboard';
import { useResponsive, MobileNav, MobileMenuButton, ResponsiveContainer } from '../dashboard/ResponsiveDesign';

// Layout configuration types
interface LayoutConfig {
  sidebarWidth: number;
  filterPanelCollapsed: boolean;
  gridColumns: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  spacing: {
    gap: number;
    padding: number;
  };
}

// Component props interface
interface DashboardLayoutProps {
  children: ReactNode;
  filters?: DashboardFilters;
  onFilterChange?: (filters: Partial<DashboardFilters>) => void;
  showFilterPanel?: boolean;
  showSidebar?: boolean;
  sidebarContent?: ReactNode;
  filterPanelContent?: ReactNode;
  headerContent?: ReactNode;
  footerContent?: ReactNode;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

// Default layout configuration
const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  sidebarWidth: 280,
  filterPanelCollapsed: false,
  gridColumns: {
    sm: 1,
    md: 2,
    lg: 3,
    xl: 4
  },
  spacing: {
    gap: 6,
    padding: 8
  }
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  filters,
  onFilterChange,
  showFilterPanel = true,
  showSidebar = false,
  sidebarContent,
  filterPanelContent,
  headerContent,
  footerContent,
  loading = false,
  error = null,
  className = ''
}) => {
  const { isMobile, isTablet, deviceType, config } = useResponsive();
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(DEFAULT_LAYOUT_CONFIG);
  const [isFilterPanelCollapsed, setIsFilterPanelCollapsed] = useState(isMobile);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Toggle filter panel
  const toggleFilterPanel = useCallback(() => {
    setIsFilterPanelCollapsed(prev => !prev);
    setLayoutConfig(prev => ({
      ...prev,
      filterPanelCollapsed: !prev.filterPanelCollapsed
    }));
  }, []);

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
  }, []);

  // Toggle mobile navigation
  const toggleMobileNav = useCallback(() => {
    setIsMobileNavOpen(prev => !prev);
  }, []);

  // Generate responsive grid classes
  const getGridClasses = useCallback(() => {
    const { gridColumns } = layoutConfig;
    return `grid grid-cols-${gridColumns.sm} md:grid-cols-${gridColumns.md} lg:grid-cols-${gridColumns.lg} xl:grid-cols-${gridColumns.xl}`;
  }, [layoutConfig]);

  // Generate spacing classes
  const getSpacingClasses = useCallback(() => {
    const { spacing } = layoutConfig;
    return `gap-${spacing.gap} p-${spacing.padding}`;
  }, [layoutConfig]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<DashboardFilters>) => {
    if (onFilterChange) {
      onFilterChange(newFilters);
    }
  }, [onFilterChange]);

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    </div>
  );

  // Error display component
  const ErrorDisplay = ({ message }: { message: string }) => (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            Error loading dashboard content
          </h3>
          <div className="mt-2 text-sm text-red-700">
            {message}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header Section */}
      {headerContent && (
        <div className="bg-white shadow-sm border-b border-gray-200">
          <ResponsiveContainer>
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <MobileMenuButton 
                  onClick={toggleMobileNav} 
                  isOpen={isMobileNavOpen}
                  className="lg:hidden"
                />
                {headerContent}
              </div>
            </div>
          </ResponsiveContainer>
        </div>
      )}

      {/* Main Layout Container */}
      <div className="flex h-full">
        {/* Sidebar */}
        {showSidebar && !isMobile && (
          <div
            className={`bg-white shadow-sm border-r border-gray-200 transition-all duration-300 ease-in-out ${
              isSidebarCollapsed ? 'w-16' : 'w-72'
            }`}
          >
            <div className="p-4">
              {/* Sidebar Toggle Button */}
              <button
                onClick={toggleSidebar}
                className="w-full flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg
                  className={`h-5 w-5 transition-transform ${isSidebarCollapsed ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Sidebar Content */}
              {!isSidebarCollapsed && (
                <div className="mt-4">
                  {sidebarContent}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Filter Panel */}
          {showFilterPanel && !isMobile && (
            <div
              className={`bg-white shadow-sm border-b border-gray-200 transition-all duration-300 ease-in-out ${
                isFilterPanelCollapsed ? 'h-12' : 'h-auto'
              }`}
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-2">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Filters</span>
                </div>
                
                <button
                  onClick={toggleFilterPanel}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <svg
                    className={`h-4 w-4 transition-transform ${isFilterPanelCollapsed ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Filter Panel Content */}
              {!isFilterPanelCollapsed && (
                <div className="px-4 pb-4">
                  {filterPanelContent || (
                    <div className="text-sm text-gray-500">
                      Filter panel content will be implemented in future tasks
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 overflow-auto">
            <ResponsiveContainer className="py-8">
              {/* Loading State */}
              {loading && <LoadingSkeleton />}

              {/* Error State */}
              {error && <ErrorDisplay message={error} />}

              {/* Content */}
              {!loading && !error && (
                <div className={`${getGridClasses()} ${getSpacingClasses()}`}>
                  {children}
                </div>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Footer */}
      {footerContent && (
        <div className="bg-white shadow-sm border-t border-gray-200">
          <ResponsiveContainer>
            <div className="py-4">
              {footerContent}
            </div>
          </ResponsiveContainer>
        </div>
      )}

      {/* Mobile Navigation */}
      <MobileNav 
        isOpen={isMobileNavOpen} 
        onClose={() => setIsMobileNavOpen(false)}
      >
        {sidebarContent}
        {showFilterPanel && filterPanelContent && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Filters</h3>
            {filterPanelContent}
          </div>
        )}
      </MobileNav>
    </div>
  );
};

// Grid item wrapper component for consistent spacing
interface GridItemProps {
  children: ReactNode;
  className?: string;
  colSpan?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

export const GridItem: React.FC<GridItemProps> = ({
  children,
  className = '',
  colSpan = {}
}) => {
  const getColSpanClasses = () => {
    const classes = [];
    if (colSpan.sm) classes.push(`col-span-${colSpan.sm}`);
    if (colSpan.md) classes.push(`md:col-span-${colSpan.md}`);
    if (colSpan.lg) classes.push(`lg:col-span-${colSpan.lg}`);
    if (colSpan.xl) classes.push(`xl:col-span-${colSpan.xl}`);
    return classes.join(' ');
  };

  return (
    <div className={`${getColSpanClasses()} ${className}`}>
      {children}
    </div>
  );
};

// Responsive grid container component
interface GridContainerProps {
  children: ReactNode;
  columns?: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  gap?: number;
  className?: string;
}

export const GridContainer: React.FC<GridContainerProps> = ({
  children,
  columns = { sm: 1, md: 2, lg: 3, xl: 4 },
  gap = 6,
  className = ''
}) => {
  const getGridClasses = () => {
    return `grid grid-cols-${columns.sm} md:grid-cols-${columns.md} lg:grid-cols-${columns.lg} xl:grid-cols-${columns.xl} gap-${gap}`;
  };

  return (
    <div className={`${getGridClasses()} ${className}`}>
      {children}
    </div>
  );
};

// Card wrapper component for dashboard items
interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  shadow?: 'sm' | 'md' | 'lg';
  border?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  shadow = 'md',
  border = true
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const shadowClasses = {
    sm: 'shadow-sm',
    md: 'shadow',
    lg: 'shadow-lg'
  };

  const borderClasses = border ? 'border border-gray-200' : '';

  return (
    <div className={`bg-white rounded-lg ${shadowClasses[shadow]} ${borderClasses} ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
};

export default DashboardLayout;
