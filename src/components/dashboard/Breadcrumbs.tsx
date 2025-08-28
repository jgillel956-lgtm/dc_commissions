import React from 'react';
import { ResponsiveText } from './ResponsiveDesign';

export interface BreadcrumbItem {
  label: string;
  path?: string;
  isActive?: boolean;
  onClick?: () => void;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  separator?: React.ReactNode;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  className = '',
  separator
}) => {
  const defaultSeparator = (
    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );

  return (
    <nav className={`flex items-center space-x-2 ${className}`} aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isActive = item.isActive || isLast;

        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <div className="flex-shrink-0">
                {separator || defaultSeparator}
              </div>
            )}
            
            <div className="flex items-center">
              {isActive ? (
                <ResponsiveText
                  mobileSize="text-xs"
                  tabletSize="text-sm"
                  desktopSize="text-sm"
                  className="font-medium text-gray-900"
                >
                  {item.label}
                </ResponsiveText>
              ) : (
                <button
                  onClick={item.onClick}
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-2 py-1 rounded text-sm font-medium transition-colors"
                >
                  {item.label}
                </button>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
