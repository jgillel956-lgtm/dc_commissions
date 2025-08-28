import React from 'react';
import { DashboardTab } from '../../hooks/useDashboardState';
import { ResponsiveText, ResponsiveButton } from './ResponsiveDesign';

export interface TabNavigationProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  hasUnsavedChanges?: boolean;
  className?: string;
  showChangeIndicator?: boolean;
  disabled?: boolean;
}

export interface TabConfig {
  id: DashboardTab;
  label: string;
  icon: React.ReactNode;
  description: string;
  badge?: string | number;
  disabled?: boolean;
}

const TAB_CONFIG: Record<DashboardTab, TabConfig> = {
  revenue: {
    id: 'revenue',
    label: 'Revenue Analysis',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      </svg>
    ),
    description: 'Total revenue and transaction analysis'
  },
  commission: {
    id: 'commission',
    label: 'Commission Analysis',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    description: 'Commissions and profit analysis'
  },
  interest: {
    id: 'interest',
    label: 'Interest Analysis',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    description: 'Interest revenue and performance analysis'
  }
};

const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  hasUnsavedChanges = false,
  className = '',
  showChangeIndicator = true,
  disabled = false
}) => {
  const handleTabClick = (tab: DashboardTab) => {
    if (!disabled && tab !== activeTab) {
      onTabChange(tab);
    }
  };

  const renderTab = (tabConfig: TabConfig) => {
    const isActive = tabConfig.id === activeTab;
    const isDisabled = disabled || tabConfig.disabled;

    return (
      <ResponsiveButton
        key={tabConfig.id}
        onClick={() => handleTabClick(tabConfig.id)}
        disabled={isDisabled}
        className={`
          relative flex items-center justify-center px-4 py-3 border-b-2 font-medium text-sm
          transition-all duration-200 ease-in-out
          ${isActive
            ? 'border-blue-500 text-blue-600 bg-blue-50'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${hasUnsavedChanges && isActive ? 'ring-2 ring-yellow-400 ring-opacity-50' : ''}
        `}
        mobileSize="text-xs"
        tabletSize="text-sm"
        desktopSize="text-sm"
      >
        {/* Tab Icon */}
        <div className={`mr-2 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
          {tabConfig.icon}
        </div>

        {/* Tab Label */}
        <ResponsiveText
          mobileSize="text-xs"
          tabletSize="text-sm"
          desktopSize="text-sm"
          className={`font-medium ${isActive ? 'text-blue-600' : 'text-gray-700'}`}
        >
          {tabConfig.label}
        </ResponsiveText>

        {/* Badge */}
        {tabConfig.badge && (
          <span className={`
            ml-2 px-2 py-0.5 text-xs font-medium rounded-full
            ${isActive
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-600'
            }
          `}>
            {tabConfig.badge}
          </span>
        )}

        {/* Unsaved Changes Indicator */}
        {showChangeIndicator && hasUnsavedChanges && isActive && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white animate-pulse" />
        )}

        {/* Active Tab Indicator */}
        {isActive && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
        )}
      </ResponsiveButton>
    );
  };

  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto">
        <nav className="flex space-x-8" aria-label="Dashboard tabs">
          {Object.values(TAB_CONFIG).map(renderTab)}
        </nav>
      </div>
    </div>
  );
};

export default TabNavigation;

