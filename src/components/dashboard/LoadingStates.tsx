import React from 'react';

// Loading state types and interfaces
export type LoadingType = 'skeleton' | 'spinner' | 'pulse' | 'shimmer' | 'dots';
export type LoadingSize = 'sm' | 'md' | 'lg' | 'xl';
export type LoadingVariant = 'default' | 'card' | 'table' | 'chart' | 'kpi' | 'list';

// Loading state props interface
interface LoadingStateProps {
  type?: LoadingType;
  size?: LoadingSize;
  variant?: LoadingVariant;
  className?: string;
  count?: number;
  height?: string | number;
  width?: string | number;
  showText?: boolean;
  text?: string;
}

// Size configuration
const SIZE_CONFIG = {
  sm: {
    height: 'h-4',
    width: 'w-4',
    textSize: 'text-xs',
    spacing: 'space-y-2'
  },
  md: {
    height: 'h-6',
    width: 'w-6',
    textSize: 'text-sm',
    spacing: 'space-y-3'
  },
  lg: {
    height: 'h-8',
    width: 'w-8',
    textSize: 'text-base',
    spacing: 'space-y-4'
  },
  xl: {
    height: 'h-12',
    width: 'w-12',
    textSize: 'text-lg',
    spacing: 'space-y-6'
  }
};

// Spinner component
const Spinner: React.FC<{ size: LoadingSize; className?: string }> = ({ size, className = '' }) => {
  const config = SIZE_CONFIG[size];
  
  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${config.height} ${config.width} ${className}`} />
  );
};

// Pulse component
const Pulse: React.FC<{ size: LoadingSize; className?: string }> = ({ size, className = '' }) => {
  const config = SIZE_CONFIG[size];
  
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${config.height} ${config.width} ${className}`} />
  );
};

// Dots component
const Dots: React.FC<{ size: LoadingSize; className?: string }> = ({ size, className = '' }) => {
  const config = SIZE_CONFIG[size];
  
  return (
    <div className={`flex space-x-1 ${className}`}>
      <div className={`animate-bounce bg-gray-400 dark:bg-gray-600 rounded-full ${config.height} ${config.width}`} style={{ animationDelay: '0ms' }} />
      <div className={`animate-bounce bg-gray-400 dark:bg-gray-600 rounded-full ${config.height} ${config.width}`} style={{ animationDelay: '150ms' }} />
      <div className={`animate-bounce bg-gray-400 dark:bg-gray-600 rounded-full ${config.height} ${config.width}`} style={{ animationDelay: '300ms' }} />
    </div>
  );
};

// Shimmer component
const Shimmer: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] ${className}`} />
  );
};

// KPI Widget Skeleton
const KPIWidgetSkeleton: React.FC<{ size?: LoadingSize; className?: string }> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const config = SIZE_CONFIG[size];
  
  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 animate-pulse ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
      
      {/* Value */}
      <div className={`h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3`}></div>
      
      {/* Subtitle and trend */}
      <div className="flex items-center justify-between">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
      </div>
    </div>
  );
};

// Chart Skeleton
const ChartSkeleton: React.FC<{ 
  type?: 'pie' | 'bar' | 'line' | 'table'; 
  size?: LoadingSize; 
  className?: string;
  height?: string | number;
}> = ({ 
  type = 'bar', 
  size = 'md', 
  className = '',
  height
}) => {
  const config = SIZE_CONFIG[size];
  const chartHeight = height || 'h-64';
  
  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg animate-pulse ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="flex space-x-2">
            <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
      
      {/* Chart Area */}
      <div className={`p-6 ${chartHeight}`}>
        {type === 'pie' && (
          <div className="flex items-center justify-center h-full">
            <div className="w-32 h-32 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          </div>
        )}
        
        {type === 'bar' && (
          <div className="flex items-end justify-between h-full space-x-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-gray-200 dark:bg-gray-700 rounded-t"
                style={{ 
                  height: `${Math.random() * 60 + 20}%`,
                  width: '12%'
                }}
              />
            ))}
          </div>
        )}
        
        {type === 'line' && (
          <div className="relative h-full">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1/2 h-1 bg-gray-200 dark:bg-gray-700 rounded transform rotate-12"></div>
            </div>
          </div>
        )}
        
        {type === 'table' && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex space-x-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/6"></div>
        </div>
      </div>
    </div>
  );
};

// Table Skeleton
const TableSkeleton: React.FC<{ 
  rows?: number; 
  columns?: number; 
  className?: string;
  showHeader?: boolean;
}> = ({ 
  rows = 5, 
  columns = 4, 
  className = '',
  showHeader = true
}) => {
  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg animate-pulse ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex space-x-4">
            {Array.from({ length: columns }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
            ))}
          </div>
        </div>
      )}
      
      {/* Rows */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4">
            <div className="flex space-x-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div 
                  key={colIndex} 
                  className="h-4 bg-gray-200 dark:bg-gray-700 rounded"
                  style={{ width: `${Math.random() * 40 + 60}px` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// List Skeleton
const ListSkeleton: React.FC<{ 
  items?: number; 
  className?: string;
  showAvatars?: boolean;
}> = ({ 
  items = 5, 
  className = '',
  showAvatars = false
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 animate-pulse">
          {showAvatars && (
            <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          )}
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Dashboard Grid Skeleton
const DashboardGridSkeleton: React.FC<{ 
  kpiCount?: number;
  chartCount?: number;
  className?: string;
}> = ({ 
  kpiCount = 4, 
  chartCount = 2, 
  className = '' 
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: kpiCount }).map((_, i) => (
          <KPIWidgetSkeleton key={i} />
        ))}
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: chartCount }).map((_, i) => (
          <ChartSkeleton key={i} type={i % 2 === 0 ? 'bar' : 'line'} />
        ))}
      </div>
    </div>
  );
};

// Main Loading State component
const LoadingState: React.FC<LoadingStateProps> = ({
  type = 'skeleton',
  size = 'md',
  variant = 'default',
  className = '',
  count = 1,
  height,
  width,
  showText = false,
  text = 'Loading...'
}) => {
  const config = SIZE_CONFIG[size];
  
  // Custom dimensions
  const customHeight = height ? { height: typeof height === 'number' ? `${height}px` : height } : {};
  const customWidth = width ? { width: typeof width === 'number' ? `${width}px` : width } : {};
  
  // Render based on type
  const renderLoadingElement = () => {
    switch (type) {
      case 'spinner':
        return <Spinner size={size} className={className} />;
      case 'pulse':
        return <Pulse size={size} className={className} />;
      case 'dots':
        return <Dots size={size} className={className} />;
      case 'shimmer':
        return <Shimmer className={`${config.height} ${className}`} />;
      case 'skeleton':
      default:
        switch (variant) {
          case 'kpi':
            return <KPIWidgetSkeleton size={size} className={className} />;
          case 'chart':
            return <ChartSkeleton size={size} className={className} height={height} />;
          case 'table':
            return <TableSkeleton className={className} />;
          case 'list':
            return <ListSkeleton className={className} />;
          case 'card':
            return (
              <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 animate-pulse ${className}`}>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
              </div>
            );
          default:
            return <Pulse size={size} className={className} />;
        }
    }
  };
  
  // Render multiple items if count > 1
  if (count > 1) {
    return (
      <div className={`${config.spacing}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ ...customHeight, ...customWidth }}>
            {renderLoadingElement()}
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center space-y-2" style={{ ...customHeight, ...customWidth }}>
      {renderLoadingElement()}
      {showText && (
        <p className={`text-gray-500 dark:text-gray-400 ${config.textSize}`}>
          {text}
        </p>
      )}
    </div>
  );
};

// Export individual components for flexibility
export {
  Spinner,
  Pulse,
  Dots,
  Shimmer,
  KPIWidgetSkeleton,
  ChartSkeleton,
  TableSkeleton,
  ListSkeleton,
  DashboardGridSkeleton
};

export default LoadingState;

