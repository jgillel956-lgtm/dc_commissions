import React, { useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { revenueApi } from '../services/revenueApi';
import { useDashboardState, DashboardTab } from '../hooks/useDashboardState';
import { useNavigationHistory } from '../hooks/useNavigationHistory';
import TabNavigation from '../components/dashboard/TabNavigation';
import FilterPersistence from '../components/dashboard/FilterPersistence';
import DashboardNavigation from '../components/dashboard/DashboardNavigation';
import NavigationHistory from '../components/dashboard/NavigationHistory';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { ResponsiveContainer, ResponsiveText } from '../components/dashboard/ResponsiveDesign';
import RevenueAnalysisTab from '../components/dashboard/RevenueAnalysisTab';

const RevenueDashboard: React.FC = () => {
  const { user } = useAuth();
  const dashboardState = useDashboardState('revenue');
  const navigationHistory = useNavigationHistory(50);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!user) return;

    dashboardState.setLoading(true);
    dashboardState.setError(null);

    try {
      const response = await revenueApi.fetchDashboardData({
        filters: dashboardState.filters
      });

      dashboardState.setData(response.data || []);
      dashboardState.setPagination({
        currentPage: 1,
        pageSize: 50,
        totalRecords: response.data?.length || 0,
        totalPages: 1
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      dashboardState.setError(error instanceof Error ? error.message : 'Failed to fetch dashboard data');
    } finally {
      dashboardState.setLoading(false);
    }
  }, [user, dashboardState]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<typeof dashboardState.filters>) => {
    dashboardState.updateFilters(newFilters);
    dashboardState.setPagination({ currentPage: 1 });
  }, [dashboardState]);

  // Handle tab change
  const handleTabChange = useCallback((tab: DashboardTab) => {
    dashboardState.setActiveTab(tab);
  }, [dashboardState]);

  // Handle pagination change
  const handlePaginationChange = useCallback((page: number, pageSize?: number) => {
    dashboardState.setPagination({ 
      currentPage: page,
      pageSize: pageSize || dashboardState.pagination.pageSize
    });
  }, [dashboardState]);

  // Handle sorting change
  const handleSortingChange = useCallback((field: string, order: 'asc' | 'desc') => {
    // Sorting will be implemented in future tasks
    console.log('Sorting:', field, order);
  }, []);

  // Refresh data
  const handleRefresh = useCallback(() => {
    dashboardState.refreshData();
  }, [dashboardState]);

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

  // Load initial data
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

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
        return (
          <div className="space-y-6">
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Commission Analysis Tab
              </h2>
              <p className="text-gray-600">
                This tab will contain commission breakdowns and profit analysis
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Coming soon - Tab implementation in progress
              </p>
            </div>
          </div>
        );
      
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
             loading={dashboardState.loading}
       error={dashboardState.error}
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
        {/* Data Summary */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <ResponsiveText
              mobileSize="text-base"
              tabletSize="text-lg"
              desktopSize="text-lg"
              className="font-medium text-gray-900"
            >
              Data Summary
            </ResponsiveText>
            <ResponsiveText
              mobileSize="text-xs"
              tabletSize="text-sm"
              desktopSize="text-sm"
              className="text-gray-500"
            >
              {dashboardState.pagination.totalRecords.toLocaleString()} total records
            </ResponsiveText>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">
                {dashboardState.pagination.totalRecords.toLocaleString()}
              </div>
              <div className="text-sm text-blue-600">Total Records</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                {dashboardState.pagination.totalPages}
              </div>
              <div className="text-sm text-green-600">Total Pages</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">
                {dashboardState.pagination.pageSize}
              </div>
              <div className="text-sm text-purple-600">Page Size</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-600">
                {dashboardState.pagination.currentPage}
              </div>
              <div className="text-sm text-orange-600">Current Page</div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </ResponsiveContainer>
    </DashboardLayout>
  );
};

export default RevenueDashboard;
