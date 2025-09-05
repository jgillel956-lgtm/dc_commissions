import React, { useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardState, DashboardTab } from '../hooks/useDashboardState';
import TabNavigation from '../components/dashboard/TabNavigation';
import FilterPersistence from '../components/dashboard/FilterPersistence';
import DashboardNavigation from '../components/dashboard/DashboardNavigation';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import RevenueAnalysisTab from '../components/dashboard/RevenueAnalysisTab';
import CommissionAnalysisTab from '../components/dashboard/CommissionAnalysisTab';
import RevenueAnalyticsDemo from '../components/dashboard/RevenueAnalyticsDemo';

const RevenueDashboard: React.FC = () => {
  const { user } = useAuth();
  const dashboardState = useDashboardState('revenue');

  // Handle tab change
  const handleTabChange = useCallback((tab: DashboardTab) => {
    dashboardState.setActiveTab(tab);
  }, [dashboardState]);

  // Refresh data
  const handleRefresh = useCallback(() => {
    console.log('Refresh requested');
  }, []);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    dashboardState.clearFilters();
  }, [dashboardState]);

  // Clear specific filter
  const handleClearFilter = useCallback((filterKey: keyof typeof dashboardState.filters) => {
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
      interest: 'Interest Analysis',
      'analytics-demo': 'Analytics Demo'
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
    },
    {
      id: 'analytics-demo-tab',
      label: 'Analytics Demo',
      tab: 'analytics-demo' as DashboardTab,
      description: 'Complex query revenue analytics demo'
    }
  ], []);

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (dashboardState.activeTab) {
      case 'revenue':
        return <RevenueAnalysisTab />;

      case 'commission':
        return <CommissionAnalysisTab />;

      case 'interest':
        return (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-purple-100 mb-6">
                <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Interest Analysis Dashboard
              </h2>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Comprehensive interest revenue analysis and performance metrics. 
                Track interest earnings, analyze trends, and monitor financial performance.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
                  <h3 className="font-semibold text-purple-900 mb-2">Interest Revenue</h3>
                  <p className="text-sm text-purple-700">Track monthly and quarterly interest earnings</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2">Performance Metrics</h3>
                  <p className="text-sm text-blue-700">Analyze interest rate performance and trends</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-900 mb-2">Financial Insights</h3>
                  <p className="text-sm text-green-700">Monitor profitability and growth indicators</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'analytics-demo':
        // TEMPORARILY DISABLED: RevenueAnalyticsDemo causing API storm (16+ duplicate requests)
        // TODO: Fix multiple hook API calls before re-enabling
        return (
          <div className="p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics Demo Temporarily Disabled</h3>
            <p className="text-gray-600">This component is being optimized to fix performance issues.</p>
          </div>
        );
        // return <RevenueAnalyticsDemo />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">
                Revenue Analytics Dashboard
              </h1>
              <p className="text-gray-600 mt-2">
                Comprehensive analysis of revenue, commissions, and business performance
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.location.href = '/table-view'}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Configs
              </button>
              <button
                onClick={handleRefresh}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation and Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          {/* Breadcrumbs */}
          <nav className="flex py-3" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              {breadcrumbs.map((crumb, index) => (
                <li key={index}>
                  <div className="flex items-center">
                    {index > 0 && (
                      <svg className="flex-shrink-0 h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    <button
                      onClick={crumb.onClick}
                      className={`ml-4 text-sm font-medium ${
                        index === breadcrumbs.length - 1
                          ? 'text-blue-600 cursor-default'
                          : 'text-gray-500 hover:text-gray-700 cursor-pointer'
                      }`}
                    >
                      {crumb.label}
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          </nav>

          {/* Tab Navigation */}
          <div className="flex space-x-1 pb-4">
            {(['revenue', 'commission', 'interest', 'analytics-demo'] as const).map((tab) => {
              const isActive = dashboardState.activeTab === tab;
              const tabConfig = {
                revenue: { label: 'Revenue Analysis', icon: '📊' },
                commission: { label: 'Commission Analysis', icon: '💰' },
                interest: { label: 'Interest Analysis', icon: '📈' },
                'analytics-demo': { label: 'Analytics Demo', icon: '🔍' }
              };
              
              return (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`flex items-center px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                >
                  <span className="mr-2 text-base">{tabConfig[tab].icon}</span>
                  {tabConfig[tab].label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Message - Only show when no specific content is loaded */}
        {dashboardState.activeTab === 'revenue' && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
                  <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Welcome to Revenue Analytics Dashboard
                </h2>
                <p className="text-lg text-gray-600 mb-8 max-w-3xl mx-auto">
                  Select a tab above to view detailed analytics and insights from your Zoho Analytics data. 
                  Each section provides comprehensive analysis tools for different aspects of your business.
                </p>
                
                {/* Feature Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleTabChange('revenue')}>
                    <div className="flex items-center mb-4">
                      <div className="flex-shrink-0">
                        <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h3 className="ml-3 text-lg font-semibold text-blue-900">Revenue Analysis</h3>
                    </div>
                    <p className="text-blue-700">Track total revenue, transaction analysis, and revenue streams with comprehensive reporting tools.</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleTabChange('commission')}>
                    <div className="flex items-center mb-4">
                      <div className="flex-shrink-0">
                        <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                      <h3 className="ml-3 text-lg font-semibold text-green-900">Commission Analysis</h3>
                    </div>
                    <p className="text-green-700">Monitor employee and company commission performance with detailed analytics and trends.</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleTabChange('interest')}>
                    <div className="flex items-center mb-4">
                      <div className="flex-shrink-0">
                        <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      <h3 className="ml-3 text-lg font-semibold text-purple-900">Interest Analysis</h3>
                    </div>
                    <p className="text-purple-700">Analyze interest revenue, performance metrics, and financial insights with trend analysis.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Persistence */}
        <div className="mb-6">
          <FilterPersistence
            filters={dashboardState.filters}
            onClearFilters={handleClearFilters}
            onClearFilter={handleClearFilter}
            onUpdateFilter={handleUpdateFilter}
          />
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default RevenueDashboard;
