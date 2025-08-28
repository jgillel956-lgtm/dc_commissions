import React, { useState, useEffect, ReactNode } from 'react';

// Responsive design types and interfaces
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type Orientation = 'portrait' | 'landscape';

// Responsive configuration
export const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const;

export const DEVICE_CONFIG = {
  mobile: {
    maxWidth: BREAKPOINTS.md - 1,
    gridCols: 1,
    spacing: 'space-y-4',
    padding: 'p-4',
    fontSize: 'text-sm'
  },
  tablet: {
    maxWidth: BREAKPOINTS.lg - 1,
    gridCols: 2,
    spacing: 'space-y-6',
    padding: 'p-6',
    fontSize: 'text-base'
  },
  desktop: {
    maxWidth: Infinity,
    gridCols: 4,
    spacing: 'space-y-8',
    padding: 'p-8',
    fontSize: 'text-lg'
  }
} as const;

// Responsive hook for detecting screen size and device type
export const useResponsive = () => {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('lg');
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const updateResponsive = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Determine breakpoint
      let newBreakpoint: Breakpoint = 'lg';
      if (width >= BREAKPOINTS['2xl']) newBreakpoint = '2xl';
      else if (width >= BREAKPOINTS.xl) newBreakpoint = 'xl';
      else if (width >= BREAKPOINTS.lg) newBreakpoint = 'lg';
      else if (width >= BREAKPOINTS.md) newBreakpoint = 'md';
      else if (width >= BREAKPOINTS.sm) newBreakpoint = 'sm';
      else newBreakpoint = 'xs';
      
      // Determine device type
      let newDeviceType: DeviceType = 'desktop';
      if (width < BREAKPOINTS.md) newDeviceType = 'mobile';
      else if (width < BREAKPOINTS.lg) newDeviceType = 'tablet';
      else newDeviceType = 'desktop';
      
      // Determine orientation
      const newOrientation: Orientation = width > height ? 'landscape' : 'portrait';
      
      // Update state
      setBreakpoint(newBreakpoint);
      setDeviceType(newDeviceType);
      setOrientation(newOrientation);
      setIsMobile(newDeviceType === 'mobile');
      setIsTablet(newDeviceType === 'tablet');
      setIsDesktop(newDeviceType === 'desktop');
    };

    // Initial update
    updateResponsive();
    
    // Add event listener
    window.addEventListener('resize', updateResponsive);
    window.addEventListener('orientationchange', updateResponsive);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', updateResponsive);
      window.removeEventListener('orientationchange', updateResponsive);
    };
  }, []);

  return {
    breakpoint,
    deviceType,
    orientation,
    isMobile,
    isTablet,
    isDesktop,
    config: DEVICE_CONFIG[deviceType]
  };
};

// Responsive grid component
interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  mobileCols?: number;
  tabletCols?: number;
  desktopCols?: number;
  gap?: string;
  autoFit?: boolean;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  className = '',
  mobileCols = 1,
  tabletCols = 2,
  desktopCols = 4,
  gap = 'gap-4 md:gap-6 lg:gap-8',
  autoFit = false
}) => {
  const gridCols = autoFit 
    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
    : `grid-cols-${mobileCols} md:grid-cols-${tabletCols} lg:grid-cols-${desktopCols}`;
  
  return (
    <div className={`grid ${gridCols} ${gap} ${className}`}>
      {children}
    </div>
  );
};

// Responsive container component
interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: string;
  padding?: string;
  center?: boolean;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  maxWidth = 'max-w-7xl',
  padding = 'px-4 sm:px-6 lg:px-8',
  center = true
}) => {
  return (
    <div className={`w-full ${maxWidth} ${padding} ${center ? 'mx-auto' : ''} ${className}`}>
      {children}
    </div>
  );
};

// Mobile-first responsive text component
interface ResponsiveTextProps {
  children: ReactNode;
  className?: string;
  mobileSize?: string;
  tabletSize?: string;
  desktopSize?: string;
  mobileWeight?: string;
  tabletWeight?: string;
  desktopWeight?: string;
}

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  children,
  className = '',
  mobileSize = 'text-sm',
  tabletSize = 'text-base',
  desktopSize = 'text-lg',
  mobileWeight = 'font-normal',
  tabletWeight = 'font-normal',
  desktopWeight = 'font-medium'
}) => {
  const textClasses = `${mobileSize} ${mobileWeight} md:${tabletSize} md:${tabletWeight} lg:${desktopSize} lg:${desktopWeight} ${className}`;
  
  return (
    <span className={textClasses}>
      {children}
    </span>
  );
};

// Responsive spacing component
interface ResponsiveSpacingProps {
  children: ReactNode;
  className?: string;
  mobileSpacing?: string;
  tabletSpacing?: string;
  desktopSpacing?: string;
}

export const ResponsiveSpacing: React.FC<ResponsiveSpacingProps> = ({
  children,
  className = '',
  mobileSpacing = 'space-y-4',
  tabletSpacing = 'space-y-6',
  desktopSpacing = 'space-y-8'
}) => {
  const spacingClasses = `${mobileSpacing} md:${tabletSpacing} lg:${desktopSpacing} ${className}`;
  
  return (
    <div className={spacingClasses}>
      {children}
    </div>
  );
};

// Mobile navigation component
interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  isOpen,
  onClose,
  children,
  className = ''
}) => {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Navigation panel */}
      <div className={`
        fixed top-0 left-0 h-full w-80 max-w-[80vw] bg-white dark:bg-gray-900 
        shadow-xl transform transition-transform duration-300 ease-in-out z-50
        lg:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${className}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Navigation</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 overflow-y-auto h-full">
          {children}
        </div>
      </div>
    </>
  );
};

// Mobile menu button component
interface MobileMenuButtonProps {
  onClick: () => void;
  isOpen?: boolean;
  className?: string;
}

export const MobileMenuButton: React.FC<MobileMenuButtonProps> = ({
  onClick,
  isOpen = false,
  className = ''
}) => {
  return (
    <button
      onClick={onClick}
      className={`lg:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 ${className}`}
      aria-label="Toggle navigation menu"
    >
      <svg 
        className="w-6 h-6" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        {isOpen ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        )}
      </svg>
    </button>
  );
};

// Responsive table component
interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
  mobileScroll?: boolean;
  stickyHeader?: boolean;
}

export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  children,
  className = '',
  mobileScroll = true,
  stickyHeader = true
}) => {
  const tableClasses = `
    w-full ${mobileScroll ? 'overflow-x-auto' : ''} 
    ${stickyHeader ? 'sticky-header' : ''} 
    ${className}
  `;
  
  return (
    <div className={tableClasses}>
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        {children}
      </table>
    </div>
  );
};

// Responsive card component
interface ResponsiveCardProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  mobilePadding?: string;
  tabletPadding?: string;
  desktopPadding?: string;
  hover?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  title?: string;
}

export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  children,
  className = '',
  style,
  mobilePadding = 'p-4',
  tabletPadding = 'p-6',
  desktopPadding = 'p-8',
  hover = true,
  onClick,
  onMouseEnter,
  onMouseLeave,
  title
}) => {
  const cardClasses = `
    bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg
    ${mobilePadding} md:${tabletPadding} lg:${desktopPadding}
    ${hover ? 'hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200' : ''}
    ${className}
  `;
  
  return (
    <div 
      className={cardClasses}
      style={style}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      title={title}
    >
      {children}
    </div>
  );
};

// Responsive button component
interface ResponsiveButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  mobileSize?: string;
  tabletSize?: string;
  desktopSize?: string;
}

export const ResponsiveButton: React.FC<ResponsiveButtonProps> = ({
  children,
  onClick,
  className = '',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  type = 'button',
  mobileSize,
  tabletSize,
  desktopSize
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm md:text-base',
    lg: 'px-6 py-3 text-base md:text-lg'
  };
  
  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  
  // Handle responsive text sizing
  let textSizeClass = '';
  if (mobileSize || tabletSize || desktopSize) {
    const mobile = mobileSize || 'text-sm';
    const tablet = tabletSize || mobile;
    const desktop = desktopSize || tablet;
    textSizeClass = `${mobile} md:${tablet} lg:${desktop}`;
  }
  
  const buttonClasses = `
    ${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} 
    ${widthClass} ${disabledClass} ${textSizeClass} ${className}
  `;
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={buttonClasses}
    >
      {children}
    </button>
  );
};

// Responsive image component
interface ResponsiveImageProps {
  src: string;
  alt: string;
  className?: string;
  mobileWidth?: string;
  tabletWidth?: string;
  desktopWidth?: string;
  lazy?: boolean;
}

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  className = '',
  mobileWidth = 'w-full',
  tabletWidth = 'md:w-auto',
  desktopWidth = 'lg:w-auto',
  lazy = true
}) => {
  const imageClasses = `${mobileWidth} ${tabletWidth} ${desktopWidth} ${className}`;
  
  return (
    <img
      src={src}
      alt={alt}
      className={imageClasses}
      loading={lazy ? 'lazy' : 'eager'}
    />
  );
};

// Responsive utilities
export const responsiveUtils = {
  // Get responsive classes for different breakpoints
  getResponsiveClasses: (classes: Record<Breakpoint, string>) => {
    return Object.entries(classes)
      .map(([breakpoint, className]) => {
        if (breakpoint === 'xs') return className;
        return `${breakpoint}:${className}`;
      })
      .join(' ');
  },
  
  // Get device-specific configuration
  getDeviceConfig: (deviceType: DeviceType) => DEVICE_CONFIG[deviceType],
  
  // Check if current breakpoint matches
  isBreakpoint: (current: Breakpoint, target: Breakpoint) => {
    const currentIndex = Object.keys(BREAKPOINTS).indexOf(current);
    const targetIndex = Object.keys(BREAKPOINTS).indexOf(target);
    return currentIndex >= targetIndex;
  },
  
  // Get responsive grid columns
  getGridCols: (deviceType: DeviceType) => DEVICE_CONFIG[deviceType].gridCols,
  
  // Get responsive spacing
  getSpacing: (deviceType: DeviceType) => DEVICE_CONFIG[deviceType].spacing,
  
  // Get responsive padding
  getPadding: (deviceType: DeviceType) => DEVICE_CONFIG[deviceType].padding
};

// All components and utilities are exported individually above
