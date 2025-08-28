import React, { useState, useCallback, ReactNode } from 'react';
import { ResponsiveText, ResponsiveCard } from '../dashboard/ResponsiveDesign';

// KPI widget types and interfaces
export type KPIType = 'revenue' | 'commission' | 'profit' | 'transaction' | 'percentage' | 'count' | 'currency' | 'custom';
export type TrendDirection = 'up' | 'down' | 'neutral' | 'none';
export type DisplayFormat = 'number' | 'currency' | 'percentage' | 'decimal' | 'custom';
export type Size = 'sm' | 'md' | 'lg' | 'xl';

// Trend data interface
interface TrendData {
  value: number;
  direction: TrendDirection;
  percentage: number;
  period: string;
  isPositive: boolean;
}

// KPI widget props interface
interface KPIWidgetProps {
  title: string;
  value: number | string;
  subtitle?: string;
  type?: KPIType;
  format?: DisplayFormat;
  size?: Size;
  trend?: TrendData;
  icon?: ReactNode;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  loading?: boolean;
  error?: string | null;
  onClick?: () => void;
  className?: string;
  showTrend?: boolean;
  showIcon?: boolean;
  showSubtitle?: boolean;
  currency?: string;
  decimalPlaces?: number;
  prefix?: string;
  suffix?: string;
  tooltip?: string;
  href?: string;
  target?: string;
}

// Default configuration for different KPI types
const KPI_CONFIG = {
  revenue: {
    format: 'currency' as DisplayFormat,
    color: 'text-green-600',
    backgroundColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: '💰'
  },
  commission: {
    format: 'currency' as DisplayFormat,
    color: 'text-blue-600',
    backgroundColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: '💼'
  },
  profit: {
    format: 'currency' as DisplayFormat,
    color: 'text-purple-600',
    backgroundColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    icon: '📈'
  },
  transaction: {
    format: 'number' as DisplayFormat,
    color: 'text-orange-600',
    backgroundColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: '🔄'
  },
  percentage: {
    format: 'percentage' as DisplayFormat,
    color: 'text-indigo-600',
    backgroundColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    icon: '📊'
  },
  count: {
    format: 'number' as DisplayFormat,
    color: 'text-gray-600',
    backgroundColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    icon: '🔢'
  },
  currency: {
    format: 'currency' as DisplayFormat,
    color: 'text-emerald-600',
    backgroundColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    icon: '💵'
  },
  custom: {
    format: 'custom' as DisplayFormat,
    color: 'text-gray-600',
    backgroundColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    icon: '📋'
  }
};

// Size configuration
const SIZE_CONFIG = {
  sm: {
    padding: 'p-4',
    titleSize: 'text-sm',
    valueSize: 'text-xl',
    subtitleSize: 'text-xs',
    iconSize: 'text-lg'
  },
  md: {
    padding: 'p-6',
    titleSize: 'text-sm',
    valueSize: 'text-2xl',
    subtitleSize: 'text-xs',
    iconSize: 'text-xl'
  },
  lg: {
    padding: 'p-8',
    titleSize: 'text-base',
    valueSize: 'text-3xl',
    subtitleSize: 'text-sm',
    iconSize: 'text-2xl'
  },
  xl: {
    padding: 'p-10',
    titleSize: 'text-lg',
    valueSize: 'text-4xl',
    subtitleSize: 'text-base',
    iconSize: 'text-3xl'
  }
};

// Format value based on display format
const formatValue = (
  value: number | string,
  format: DisplayFormat,
  currency: string = '$',
  decimalPlaces: number = 2,
  prefix: string = '',
  suffix: string = ''
): string => {
  if (typeof value === 'string') return value;

  switch (format) {
    case 'currency':
      return `${prefix}${currency}${value.toLocaleString('en-US', {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces
      })}${suffix}`;
    
    case 'percentage':
      return `${prefix}${value.toFixed(decimalPlaces)}%${suffix}`;
    
    case 'decimal':
      return `${prefix}${value.toFixed(decimalPlaces)}${suffix}`;
    
    case 'number':
      return `${prefix}${value.toLocaleString('en-US')}${suffix}`;
    
    case 'custom':
    default:
      return `${prefix}${value}${suffix}`;
  }
};

// Trend indicator component
const TrendIndicator: React.FC<{ trend: TrendData; size: Size }> = ({ trend, size }) => {
  const { direction, percentage, period, isPositive } = trend;
  
  const getTrendIcon = () => {
    switch (direction) {
      case 'up':
        return (
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L12 10.586 15.586 7H12z" clipRule="evenodd" />
          </svg>
        );
      case 'down':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1v-5a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586l-4.293-4.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L12 9.414 15.586 13H12z" clipRule="evenodd" />
          </svg>
        );
      case 'neutral':
        return (
          <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    if (direction === 'none') return 'text-gray-500';
    return isPositive ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className={`flex items-center space-x-1 ${getTrendColor()}`}>
      {getTrendIcon()}
      <span className={`text-xs font-medium ${SIZE_CONFIG[size].subtitleSize}`}>
        {percentage > 0 ? '+' : ''}{percentage.toFixed(1)}%
      </span>
      <span className="text-xs text-gray-500">vs {period}</span>
    </div>
  );
};

// Loading skeleton component
const LoadingSkeleton: React.FC<{ size: Size }> = ({ size }) => {
  const config = SIZE_CONFIG[size];
  
  return (
    <div className={`${config.padding} bg-white rounded-lg border border-gray-200 animate-pulse`}>
      <div className="flex items-center justify-between mb-2">
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 w-4 bg-gray-200 rounded"></div>
      </div>
      <div className={`h-8 bg-gray-200 rounded w-3/4 mb-2`}></div>
      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
    </div>
  );
};

// Error state component
const ErrorState: React.FC<{ error: string; size: Size }> = ({ error, size }) => {
  const config = SIZE_CONFIG[size];
  
  return (
    <div className={`${config.padding} bg-red-50 border border-red-200 rounded-lg`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className={`text-sm text-red-800 ${config.titleSize}`}>
            {error}
          </p>
        </div>
      </div>
    </div>
  );
};

// Main KPI Widget component
const KPIWidget: React.FC<KPIWidgetProps> = ({
  title,
  value,
  subtitle,
  type = 'custom',
  format = 'number',
  size = 'md',
  trend,
  icon,
  color,
  backgroundColor,
  borderColor,
  loading = false,
  error = null,
  onClick,
  className = '',
  showTrend = true,
  showIcon = true,
  showSubtitle = true,
  currency = '$',
  decimalPlaces = 2,
  prefix = '',
  suffix = '',
  tooltip,
  href,
  target = '_blank'
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Get configuration based on type
  const config = KPI_CONFIG[type];
  const sizeConfig = SIZE_CONFIG[size];
  
  // Determine colors
  const finalColor = color || config.color;
  const finalBackgroundColor = backgroundColor || config.backgroundColor;
  const finalBorderColor = borderColor || config.borderColor;
  
  // Format the value
  const formattedValue = formatValue(value, format, currency, decimalPlaces, prefix, suffix);
  
  // Handle click
  const handleClick = useCallback(() => {
    if (onClick) {
      onClick();
    }
  }, [onClick]);
  
  // Handle hover
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);
  
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);
  
  // Loading state
  if (loading) {
    return <LoadingSkeleton size={size} />;
  }
  
  // Error state
  if (error) {
    return <ErrorState error={error} size={size} />;
  }
  
  // Base component
  const BaseComponent = (
    <ResponsiveCard
      className={`
        transition-all duration-200
        ${finalBorderColor}
        ${onClick || href ? 'cursor-pointer hover:shadow-md' : ''}
        ${isHovered ? 'transform scale-105' : ''}
        ${className}
      `}
      mobilePadding="p-4"
      tabletPadding="p-5"
      desktopPadding="p-6"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={tooltip}
    >
      {/* Header with title and icon */}
      <div className="flex items-center justify-between mb-2">
        <ResponsiveText
          mobileSize="text-sm"
          tabletSize="text-sm"
          desktopSize="text-base"
          className="font-medium text-gray-700"
        >
          {title}
        </ResponsiveText>
        {showIcon && (icon || config.icon) && (
          <div className={`${sizeConfig.iconSize} ${finalColor}`}>
            {icon || config.icon}
          </div>
        )}
      </div>
      
      {/* Main value */}
      <ResponsiveText
        mobileSize="text-xl"
        tabletSize="text-2xl"
        desktopSize="text-3xl"
        className={`font-bold ${finalColor} mb-1`}
      >
        {formattedValue}
      </ResponsiveText>
      
      {/* Subtitle and trend */}
      <div className="flex items-center justify-between">
        {showSubtitle && subtitle && (
          <ResponsiveText
            mobileSize="text-xs"
            tabletSize="text-xs"
            desktopSize="text-sm"
            className="text-gray-500"
          >
            {subtitle}
          </ResponsiveText>
        )}
        {showTrend && trend && (
          <TrendIndicator trend={trend} size={size} />
        )}
      </div>
    </ResponsiveCard>
  );
  
  // Wrap with link if href is provided
  if (href) {
    return (
      <a href={href} target={target} rel={target === '_blank' ? 'noopener noreferrer' : undefined}>
        {BaseComponent}
      </a>
    );
  }
  
  return BaseComponent;
};

// Export additional components for flexibility
export const KPIGrid: React.FC<{ children: ReactNode; columns?: number; gap?: number; className?: string }> = ({
  children,
  columns = 4,
  gap = 6,
  className = ''
}) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-${gap} ${className}`}>
      {children}
    </div>
  );
};

export const KPIRow: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = ''
}) => {
  return (
    <div className={`flex flex-wrap gap-6 ${className}`}>
      {children}
    </div>
  );
};

export default KPIWidget;
