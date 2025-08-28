import React, { useState, useCallback, useEffect } from 'react';
import { DashboardTab } from '../../hooks/useDashboardState';
import { ResponsiveText, ResponsiveButton, ResponsiveCard } from './ResponsiveDesign';

export interface NavigationHistoryItem {
  id: string;
  label: string;
  path: string;
  tab?: DashboardTab;
  timestamp: Date;
  icon?: React.ReactNode;
  description?: string;
  visitCount: number;
}

export interface NavigationHistoryProps {
  history: NavigationHistoryItem[];
  onNavigate?: (path: string) => void;
  onTabChange?: (tab: DashboardTab) => void;
  maxItems?: number;
  showVisitCount?: boolean;
  showTimestamps?: boolean;
  className?: string;
  title?: string;
}

const NavigationHistory: React.FC<NavigationHistoryProps> = ({
  history,
  onNavigate,
  onTabChange,
  maxItems = 10,
  showVisitCount = true,
  showTimestamps = true,
  className = '',
  title = 'Recent Navigation'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleItemClick = useCallback((item: NavigationHistoryItem) => {
    if (item.tab && onTabChange) {
      onTabChange(item.tab);
    } else if (onNavigate) {
      onNavigate(item.path);
    }
  }, [onNavigate, onTabChange]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const formatTimestamp = useCallback((timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  }, []);

  const displayHistory = isExpanded ? history : history.slice(0, 5);

  if (history.length === 0) {
    return null;
  }

  return (
    <ResponsiveCard
      className={`bg-gray-50 border-gray-200 ${className}`}
      mobilePadding="p-3"
      tabletPadding="p-4"
      desktopPadding="p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <ResponsiveText
            mobileSize="text-sm"
            tabletSize="text-base"
            desktopSize="text-base"
            className="font-medium text-gray-900"
          >
            {title}
          </ResponsiveText>
          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
            {history.length}
          </span>
        </div>
        
        {history.length > 5 && (
          <ResponsiveButton
            onClick={toggleExpanded}
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            mobileSize="text-xs"
            tabletSize="text-sm"
            desktopSize="text-sm"
          >
            {isExpanded ? 'Show Less' : 'Show More'}
          </ResponsiveButton>
        )}
      </div>

      <div className="space-y-2">
        {displayHistory.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors cursor-pointer"
            onClick={() => handleItemClick(item)}
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {item.icon && (
                <div className="flex-shrink-0 text-gray-400">
                  {item.icon}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <ResponsiveText
                  mobileSize="text-xs"
                  tabletSize="text-sm"
                  desktopSize="text-sm"
                  className="font-medium text-gray-900 truncate"
                >
                  {item.label}
                </ResponsiveText>
                {item.description && (
                  <ResponsiveText
                    mobileSize="text-xs"
                    tabletSize="text-xs"
                    desktopSize="text-xs"
                    className="text-gray-500 truncate"
                  >
                    {item.description}
                  </ResponsiveText>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2 flex-shrink-0">
              {showVisitCount && item.visitCount > 1 && (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                  {item.visitCount}
                </span>
              )}
              
              {showTimestamps && (
                <ResponsiveText
                  mobileSize="text-xs"
                  tabletSize="text-xs"
                  desktopSize="text-xs"
                  className="text-gray-500"
                >
                  {formatTimestamp(item.timestamp)}
                </ResponsiveText>
              )}
              
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {history.length > maxItems && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <ResponsiveText
            mobileSize="text-xs"
            tabletSize="text-sm"
            desktopSize="text-sm"
            className="text-gray-500 text-center"
          >
            Showing {displayHistory.length} of {history.length} recent items
          </ResponsiveText>
        </div>
      )}
    </ResponsiveCard>
  );
};

export default NavigationHistory;

