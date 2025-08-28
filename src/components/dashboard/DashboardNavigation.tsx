import React, { useState, useCallback } from 'react';
import { DashboardTab } from '../../hooks/useDashboardState';
import { ResponsiveText, ResponsiveButton } from './ResponsiveDesign';
import Breadcrumbs from './Breadcrumbs';

export interface NavigationItem {
  id: string;
  label: string;
  path?: string;
  tab?: DashboardTab;
  description?: string;
}

export interface DashboardNavigationProps {
  currentTab: DashboardTab;
  breadcrumbs: Array<{ label: string; onClick?: () => void }>;
  navigationItems?: NavigationItem[];
  onNavigate?: (path: string) => void;
  onTabChange?: (tab: DashboardTab) => void;
  className?: string;
}

const DashboardNavigation: React.FC<DashboardNavigationProps> = ({
  currentTab,
  breadcrumbs,
  navigationItems = [],
  onNavigate,
  onTabChange,
  className = ''
}) => {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);

  const handleNavigate = useCallback((path: string) => {
    if (onNavigate) {
      onNavigate(path);
    }
    setIsNavigationOpen(false);
  }, [onNavigate]);

  const handleTabChange = useCallback((tab: DashboardTab) => {
    if (onTabChange) {
      onTabChange(tab);
    }
    setIsNavigationOpen(false);
  }, [onTabChange]);

  const toggleNavigation = useCallback(() => {
    setIsNavigationOpen(prev => !prev);
  }, []);

  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={breadcrumbs.map((item, index) => ({
              label: item.label,
              isActive: index === breadcrumbs.length - 1,
              onClick: item.onClick
            }))}
          />

          {/* Navigation Toggle */}
          {navigationItems.length > 0 && (
                         <ResponsiveButton
               onClick={toggleNavigation}
               variant="ghost"
               size="sm"
               className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 text-sm"
             >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Navigation
            </ResponsiveButton>
          )}
        </div>

        {/* Navigation Menu */}
        {isNavigationOpen && navigationItems.length > 0 && (
          <div className="mx-4 sm:mx-6 lg:mx-8 mb-4 p-4 bg-white border border-gray-200 rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <ResponsiveText
                mobileSize="text-sm"
                tabletSize="text-base"
                desktopSize="text-lg"
                className="font-medium text-gray-900"
              >
                Quick Navigation
              </ResponsiveText>
                             <ResponsiveButton
                 onClick={toggleNavigation}
                 variant="ghost"
                 size="sm"
                 className="text-gray-400 hover:text-gray-600 text-sm"
               >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </ResponsiveButton>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {navigationItems.map((item) => {
                const isActive = item.tab === currentTab;

                return (
                                     <ResponsiveButton
                     key={item.id}
                     onClick={() => {
                       if (item.tab) {
                         handleTabChange(item.tab);
                       } else if (item.path) {
                         handleNavigate(item.path);
                       }
                     }}
                     disabled={isActive}
                     className={`
                       w-full justify-start px-3 py-2 rounded-md text-sm font-medium transition-colors
                       ${isActive
                         ? 'bg-blue-100 text-blue-700 border border-blue-200 cursor-default'
                         : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 cursor-pointer'
                       }
                     `}
                   >
                    <div className="text-left">
                      <ResponsiveText
                        mobileSize="text-xs"
                        tabletSize="text-sm"
                        desktopSize="text-sm"
                        className="font-medium"
                      >
                        {item.label}
                      </ResponsiveText>
                      {item.description && (
                        <ResponsiveText
                          mobileSize="text-xs"
                          tabletSize="text-xs"
                          desktopSize="text-xs"
                          className="text-gray-500 mt-0.5"
                        >
                          {item.description}
                        </ResponsiveText>
                      )}
                    </div>
                  </ResponsiveButton>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardNavigation;
