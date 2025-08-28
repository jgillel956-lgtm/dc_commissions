import React from 'react';
import { ChevronRight, Home, ArrowLeft } from 'lucide-react';

export interface DrillDownBreadcrumb {
  id: string;
  name: string;
  level: number;
}

export interface DrillDownBreadcrumbsProps {
  breadcrumbs: DrillDownBreadcrumb[];
  onBreadcrumbClick: (level: number) => void;
  onReset: () => void;
  className?: string;
  showHomeIcon?: boolean;
  showBackButton?: boolean;
  maxVisible?: number;
  truncateLongNames?: boolean;
  maxNameLength?: number;
}

const DrillDownBreadcrumbs: React.FC<DrillDownBreadcrumbsProps> = ({
  breadcrumbs,
  onBreadcrumbClick,
  onReset,
  className = '',
  showHomeIcon = true,
  showBackButton = true,
  maxVisible = 5,
  truncateLongNames = true,
  maxNameLength = 20
}) => {
  const visibleBreadcrumbs = breadcrumbs.slice(-maxVisible);
  const hasHiddenBreadcrumbs = breadcrumbs.length > maxVisible;

  const truncateName = (name: string): string => {
    if (!truncateLongNames || name.length <= maxNameLength) {
      return name;
    }
    return `${name.substring(0, maxNameLength)}...`;
  };

  const handleBreadcrumbClick = (level: number) => {
    onBreadcrumbClick(level);
  };

  const handleBackClick = () => {
    if (breadcrumbs.length > 0) {
      onBreadcrumbClick(breadcrumbs.length - 2);
    }
  };

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <div className={`drill-down-breadcrumbs flex items-center space-x-1 text-sm ${className}`}>
      {/* Back button */}
      {showBackButton && breadcrumbs.length > 0 && (
        <button
          onClick={handleBackClick}
          className="flex items-center px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          title="Go back one level"
          aria-label="Go back one level"
        >
          <ArrowLeft size={14} />
        </button>
      )}

      {/* Home/Reset button */}
      <button
        onClick={onReset}
        className="flex items-center px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
        title="Go to top level"
        aria-label="Go to top level"
      >
        {showHomeIcon ? <Home size={14} /> : 'Home'}
      </button>

      {/* Ellipsis for hidden breadcrumbs */}
      {hasHiddenBreadcrumbs && (
        <>
          <ChevronRight size={14} className="text-gray-400" />
          <span className="text-gray-500 px-1">...</span>
        </>
      )}

      {/* Visible breadcrumbs */}
      {visibleBreadcrumbs.map((breadcrumb, index) => {
        const isLast = index === visibleBreadcrumbs.length - 1;
        const actualLevel = breadcrumbs.length - visibleBreadcrumbs.length + index;
        
        return (
          <React.Fragment key={breadcrumb.id}>
            <ChevronRight size={14} className="text-gray-400" />
            <button
              onClick={() => handleBreadcrumbClick(actualLevel)}
              className={`px-2 py-1 rounded transition-colors ${
                isLast
                  ? 'text-gray-900 font-medium bg-gray-100'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title={breadcrumb.name}
              aria-label={`Go to ${breadcrumb.name}`}
              disabled={isLast}
            >
              {truncateName(breadcrumb.name)}
            </button>
          </React.Fragment>
        );
      })}

      {/* Level indicator */}
      <div className="ml-2 px-2 py-1 text-xs text-gray-500 bg-gray-50 rounded">
        Level {breadcrumbs.length}
      </div>
    </div>
  );
};

export default DrillDownBreadcrumbs;


