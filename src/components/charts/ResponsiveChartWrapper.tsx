import React, { ReactNode } from 'react';
import { useChartResponsive } from '../../hooks/useChartResponsive';
import { useResponsive } from '../dashboard/ResponsiveDesign';

interface ResponsiveChartWrapperProps {
  children: ReactNode;
  chartType: 'pie' | 'bar' | 'line' | 'area' | 'waterfall';
  title?: string;
  subtitle?: string;
  className?: string;
  customHeight?: number;
  customWidth?: string | number;
  showLegend?: boolean;
  showTooltip?: boolean;
  showGrid?: boolean;
  enableInteractions?: boolean;
  orientation?: 'horizontal' | 'vertical';
  // Additional responsive options
  mobileHeight?: number;
  tabletHeight?: number;
  desktopHeight?: number;
  mobileWidth?: string | number;
  tabletWidth?: string | number;
  desktopWidth?: string | number;
}

const ResponsiveChartWrapper: React.FC<ResponsiveChartWrapperProps> = ({
  children,
  chartType,
  title,
  subtitle,
  className = '',
  customHeight,
  customWidth,
  showLegend = true,
  showTooltip = true,
  showGrid = true,
  enableInteractions = true,
  orientation = 'vertical',
  mobileHeight,
  tabletHeight,
  desktopHeight,
  mobileWidth,
  tabletWidth,
  desktopWidth,
}) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  
  // Calculate responsive dimensions
  const responsiveHeight = customHeight || (() => {
    if (mobileHeight && isMobile) return mobileHeight;
    if (tabletHeight && isTablet) return tabletHeight;
    if (desktopHeight && isDesktop) return desktopHeight;
    
    // Default responsive heights
    if (isMobile) return chartType === 'pie' ? 300 : 250;
    if (isTablet) return chartType === 'pie' ? 350 : 300;
    return chartType === 'pie' ? 400 : 350;
  })();

  const responsiveWidth = customWidth || (() => {
    if (mobileWidth && isMobile) return mobileWidth;
    if (tabletWidth && isTablet) return tabletWidth;
    if (desktopWidth && isDesktop) return desktopWidth;
    return '100%';
  })();

  const responsiveConfig = useChartResponsive({
    chartType,
    orientation,
    showLegend,
    showTooltip,
    showGrid,
    enableInteractions,
    customHeight: responsiveHeight,
    customWidth: responsiveWidth,
  });

  return (
    <div
      className={`responsive-chart-wrapper ${className}`}
      style={{
        width: responsiveConfig.width,
        height: responsiveConfig.height,
        minHeight: 200,
        minWidth: 200,
      }}
    >
      {/* Header */}
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className={`font-semibold text-gray-900 dark:text-white mb-1 ${responsiveConfig.fontSize.title}`}>
              {title}
            </h3>
          )}
          {subtitle && (
            <p className={`text-gray-600 dark:text-gray-400 ${responsiveConfig.fontSize.subtitle}`}>
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Chart Container */}
      <div 
        className="relative"
        style={{ 
          height: responsiveConfig.height - (title || subtitle ? 80 : 40),
          width: '100%',
        }}
      >
        {children}
      </div>

      {/* Responsive Indicators (for debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          <span className="mr-2">📱 {isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}</span>
          <span className="mr-2">📏 {responsiveConfig.height}px</span>
          <span>🎯 {chartType}</span>
        </div>
      )}
    </div>
  );
};

export default ResponsiveChartWrapper;





