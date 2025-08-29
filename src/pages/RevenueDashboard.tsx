import React, { useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardState, DashboardTab } from '../hooks/useDashboardState';
import TabNavigation from '../components/dashboard/TabNavigation';
import FilterPersistence from '../components/dashboard/FilterPersistence';
import DashboardNavigation from '../components/dashboard/DashboardNavigation';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { ResponsiveContainer, ResponsiveText } from '../components/dashboard/ResponsiveDesign';
import RevenueAnalysisTab from '../components/dashboard/RevenueAnalysisTab';
import CommissionAnalysisTab from '../components/dashboard/CommissionAnalysisTab';

const RevenueDashboard: React.FC = () => {
  const { user } = useAuth();
  const dashboardState = useDashboardState('revenue');

  // Handle tab change
  const handleTabChange = useCallback((tab: DashboardTab) => {
    dashboardState.setActiveTab(tab);
  }, [dashboardState]);

  // Refresh data
  const handleRefresh = useCallback(() => {
    // Refresh will be handled by individual tabs
    console.log('Refresh requested');
  }, []);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    dashboardState.clearFilters();
  }, [dashboardState]);

  // Clear specific filter
  const handleClearFilter = useCallback((filterKey: keyof typeof dashboardState.filters) => {
    // Reset specific filter to default value
    const defaultFilters = {
      dateRange: { startDate: null, endDate: null, preset: 'last30days' },
      companies: [],
      paymentMethods: [],
      revenueSources: [],
      employees: [],
      commissionTypes: [],
      amountRange: { min: null, max: null },
      disbursementStatuses: [],
      referralPartners: [],
      searchTerm: ''
    };
    
    dashboardState.updateFilters({ [filterKey]: defaultFilters[filterKey as keyof typeof defaultFilters] });
  }, [dashboardState]);

  // Update specific filter
  const handleUpdateFilter = useCallback((filterKey: keyof typeof dashboardState.filters, value: any) => {
    dashboardState.updateFilters({ [filterKey]: value });
  }, [dashboardState]);

  // Generate breadcrumbs based on current tab
  const breadcrumbs = useMemo(() => {
    const baseBreadcrumbs = [
      { label: 'Dashboard', onClick: () => {} },
      { label: 'Revenue Analytics', onClick: () => {} }
    ];

    const tabLabels = {
      revenue: 'Revenue Analysis',
      commission: 'Commission Analysis',
      interest: 'Interest Analysis'
    };

    return [
      ...baseBreadcrumbs,
      { label: tabLabels[dashboardState.activeTab], onClick: () => {} }
    ];
  }, [dashboardState.activeTab]);

  // Navigation items for quick access
  const navigationItems = useMemo(() => [
    {
      id: 'revenue-tab',
      label: 'Revenue Analysis',
      tab: 'revenue' as DashboardTab,
      description: 'Total revenue and transaction analysis'
    },
    {
      id: 'commission-tab',
      label: 'Commission Analysis',
      tab: 'commission' as DashboardTab,
      description: 'Commissions and profit analysis'
    },
    {
      id: 'interest-tab',
      label: 'Interest Analysis',
      tab: 'interest' as DashboardTab,
      description: 'Interest revenue and performance analysis'
    }
  ], []);

  // Tab configuration - now handled by TabNavigation component

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (dashboardState.activeTab) {
      case 'revenue':
        return <RevenueAnalysisTab />;
      
      case 'commission':
        return <CommissionAnalysisTab />;
      
      case 'interest':
        return (
          <div className="space-y-6">
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Interest Analysis Tab
              </h2>
              <p className="text-gray-600">
                This tab will contain interest revenue and performance metrics
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Coming soon - Tab implementation in progress
              </p>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <DashboardLayout
      headerContent={
        <div className="flex justify-between items-center w-full">
          <div>
            <ResponsiveText
              mobileSize="text-xl"
              tabletSize="text-2xl"
              desktopSize="text-3xl"
              className="font-bold text-gray-900"
            >
              Revenue Analytics Dashboard
            </ResponsiveText>
            <ResponsiveText
              mobileSize="text-xs"
              tabletSize="text-sm"
              desktopSize="text-sm"
              className="mt-1 text-gray-500"
            >
              Comprehensive analysis of revenue, commissions, and business performance
            </ResponsiveText>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={handleRefresh}
              disabled={dashboardState.loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {dashboardState.loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </>
              )}
            </button>
          </div>
        </div>
      }
                   loading={false}
      error={null}
     >
       {/* Dashboard Navigation */}
       <DashboardNavigation
         currentTab={dashboardState.activeTab}
         breadcrumbs={breadcrumbs}
         navigationItems={navigationItems}
         onTabChange={handleTabChange}
         className="mb-4"
       />

       {/* Tab Navigation */}
       <TabNavigation
         activeTab={dashboardState.activeTab}
         onTabChange={handleTabChange}
         hasUnsavedChanges={dashboardState.hasUnsavedChanges()}
         className="mb-6"
       />

      {/* Filter Persistence */}
      <FilterPersistence
        filters={dashboardState.filters}
        onClearFilters={handleClearFilters}
        onClearFilter={handleClearFilter}
        onUpdateFilter={handleUpdateFilter}
        className="mb-6"
      />

      {/* Dashboard Content */}
      <ResponsiveContainer>
        {/* Welcome Message - Only show when no tab is selected */}
        {dashboardState.activeTab === 'revenue' && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome to Revenue Analytics Dashboard
              </h2>
              <p className="text-gray-600">
                Select a tab below to view detailed analytics and insights
              </p>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {renderTabContent()}
      </ResponsiveContainer>
    </DashboardLayout>
  );
};

export default RevenueDashboard;
