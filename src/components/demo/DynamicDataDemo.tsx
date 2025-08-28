import React, { useState } from 'react';
import PieChart from '../charts/PieChart';
import BarChart from '../charts/BarChart';
import LineChart from '../charts/LineChart';
import { useChartData, usePieChartData, useBarChartData, useLineChartData } from '../../hooks/useChartData';
import { DashboardTab } from '../../hooks/useDashboardState';
import ThemeToggle from '../ui/ThemeToggle';

const DynamicDataDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('revenue');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30000);

  // Chart data hooks
  const pieChartData = usePieChartData(activeTab, {
    tab: activeTab,
    autoRefresh,
    refreshInterval,
    onDataChange: (data) => console.log('Pie chart data updated:', data),
    onError: (error) => console.error('Pie chart error:', error),
  });

  const barChartData = useBarChartData(activeTab, {
    tab: activeTab,
    autoRefresh,
    refreshInterval,
    onDataChange: (data) => console.log('Bar chart data updated:', data),
    onError: (error) => console.error('Bar chart error:', error),
  });

  const lineChartData = useLineChartData(activeTab, {
    tab: activeTab,
    autoRefresh,
    refreshInterval,
    onDataChange: (data) => console.log('Line chart data updated:', data),
    onError: (error) => console.error('Line chart error:', error),
  });

  // Sample data for demonstration
  const samplePieData = [
    { name: 'Revenue', value: 45000 },
    { name: 'Commission', value: 12000 },
    { name: 'Interest', value: 8000 },
    { name: 'Fees', value: 5000 },
  ];

  const sampleBarData = [
    { name: 'Jan', value: 12000 },
    { name: 'Feb', value: 15000 },
    { name: 'Mar', value: 18000 },
    { name: 'Apr', value: 14000 },
    { name: 'May', value: 22000 },
    { name: 'Jun', value: 25000 },
  ];

  const sampleLineData = [
    { name: 'Jan', revenue: 12000, commission: 3000 },
    { name: 'Feb', revenue: 15000, commission: 3750 },
    { name: 'Mar', revenue: 18000, commission: 4500 },
    { name: 'Apr', revenue: 14000, commission: 3500 },
    { name: 'May', revenue: 22000, commission: 5500 },
    { name: 'Jun', revenue: 25000, commission: 6250 },
  ];

  // Filter controls
  const handleFilterChange = (filterType: string, value: any) => {
    switch (filterType) {
      case 'dateRange':
        pieChartData.updateFilters({ date_range: { type: value } });
        barChartData.updateFilters({ date_range: { type: value } });
        lineChartData.updateFilters({ date_range: { type: value } });
        break;
      case 'companies':
        pieChartData.updateFilters({ companies: { selected_companies: value } });
        barChartData.updateFilters({ companies: { selected_companies: value } });
        lineChartData.updateFilters({ companies: { selected_companies: value } });
        break;
      case 'amountRange':
        pieChartData.updateFilters({ amount_range: value });
        barChartData.updateFilters({ amount_range: value });
        lineChartData.updateFilters({ amount_range: value });
        break;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Dynamic Data Fetching Demo
            </h1>
            <ThemeToggle size="lg" />
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Test dynamic data fetching with filters and real-time updates
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 mb-8 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Data Controls
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tab Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Dashboard Tab
              </label>
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as DashboardTab)}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="revenue">Revenue Analysis</option>
                <option value="commission">Commission Analysis</option>
                <option value="interest">Interest Analysis</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Date Range
              </label>
              <select
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="last_30_days">Last 30 Days</option>
                <option value="last_90_days">Last 90 Days</option>
                <option value="last_12_months">Last 12 Months</option>
                <option value="ytd">Year to Date</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Auto Refresh */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Auto Refresh
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-600"
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {autoRefresh ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            {/* Refresh Interval */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Refresh Interval (seconds)
              </label>
              <input
                type="number"
                value={refreshInterval / 1000}
                onChange={(e) => setRefreshInterval(Number(e.target.value) * 1000)}
                min="5"
                max="300"
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4 mt-6">
            <button
              onClick={() => {
                pieChartData.refresh();
                barChartData.refresh();
                lineChartData.refresh();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Refresh All Charts
            </button>
            
            <button
              onClick={() => {
                pieChartData.invalidateCache();
                barChartData.invalidateCache();
                lineChartData.invalidateCache();
              }}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
            >
              Invalidate Cache
            </button>
            
            <button
              onClick={() => {
                pieChartData.clearFilters();
                barChartData.clearFilters();
                lineChartData.clearFilters();
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        </div>

        {/* Data Status */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-8 border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
            Data Status
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Pie Chart</h4>
              <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <div>Status: {pieChartData.loading ? 'Loading...' : pieChartData.error ? 'Error' : 'Ready'}</div>
                <div>Data: {pieChartData.dataCount} records</div>
                <div>Cache: {pieChartData.cacheHit ? 'Hit' : 'Miss'}</div>
                {pieChartData.lastUpdated && (
                  <div>Updated: {pieChartData.lastUpdated.toLocaleTimeString()}</div>
                )}
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Bar Chart</h4>
              <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <div>Status: {barChartData.loading ? 'Loading...' : barChartData.error ? 'Error' : 'Ready'}</div>
                <div>Data: {barChartData.dataCount} records</div>
                <div>Cache: {barChartData.cacheHit ? 'Hit' : 'Miss'}</div>
                {barChartData.lastUpdated && (
                  <div>Updated: {barChartData.lastUpdated.toLocaleTimeString()}</div>
                )}
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Line Chart</h4>
              <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <div>Status: {lineChartData.loading ? 'Loading...' : lineChartData.error ? 'Error' : 'Ready'}</div>
                <div>Data: {lineChartData.dataCount} records</div>
                <div>Cache: {lineChartData.cacheHit ? 'Hit' : 'Miss'}</div>
                {lineChartData.lastUpdated && (
                  <div>Updated: {lineChartData.lastUpdated.toLocaleTimeString()}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Chart Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pie Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Pie Chart with Dynamic Data
              </h3>
              <button
                onClick={() => pieChartData.refresh()}
                disabled={pieChartData.loading}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50 transition-colors"
              >
                {pieChartData.loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            
            {pieChartData.error ? (
              <div className="text-red-600 text-center py-8">
                Error: {pieChartData.error}
              </div>
            ) : (
              <PieChart
                data={pieChartData.hasData ? pieChartData.data : samplePieData}
                title="Revenue Distribution"
                subtitle={pieChartData.getDataSummary()}
                height={300}
                showLegend={true}
                showPercentage={true}
                enableDrillDown={true}
                enableZoom={true}
                enableKeyboardNavigation={true}
                enableScreenReader={true}
              />
            )}
          </div>

          {/* Bar Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Bar Chart with Dynamic Data
              </h3>
              <button
                onClick={() => barChartData.refresh()}
                disabled={barChartData.loading}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50 transition-colors"
              >
                {barChartData.loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            
            {barChartData.error ? (
              <div className="text-red-600 text-center py-8">
                Error: {barChartData.error}
              </div>
            ) : (
              <BarChart
                data={barChartData.hasData ? barChartData.data : sampleBarData}
                title="Monthly Revenue"
                subtitle={barChartData.getDataSummary()}
                height={300}
                showLegend={false}
                showValues={true}
                enableKeyboardNavigation={true}
                enableScreenReader={true}
              />
            )}
          </div>

          {/* Line Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Line Chart with Dynamic Data
              </h3>
              <button
                onClick={() => lineChartData.refresh()}
                disabled={lineChartData.loading}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50 transition-colors"
              >
                {lineChartData.loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            
            {lineChartData.error ? (
              <div className="text-red-600 text-center py-8">
                Error: {lineChartData.error}
              </div>
            ) : (
              <LineChart
                data={lineChartData.hasData ? lineChartData.data : sampleLineData}
                title="Revenue vs Commission Trends"
                subtitle={lineChartData.getDataSummary()}
                height={300}
                showLegend={true}
                showGrid={true}
                enableKeyboardNavigation={true}
                enableScreenReader={true}
              />
            )}
          </div>
        </div>

        {/* Features List */}
        <div className="mt-8 bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Dynamic Data Fetching Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Data Management</h4>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <li>• Intelligent caching with TTL</li>
                <li>• Automatic data invalidation</li>
                <li>• Request deduplication</li>
                <li>• Error handling and retry logic</li>
                <li>• Loading states and progress indicators</li>
                <li>• Real-time data updates</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Filter Integration</h4>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <li>• Dynamic filter-based queries</li>
                <li>• Filter validation and error handling</li>
                <li>• Filter persistence across sessions</li>
                <li>• Filter history and undo/redo</li>
                <li>• Filter presets and templates</li>
                <li>• Filter export/import functionality</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Performance</h4>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <li>• Debounced filter updates</li>
                <li>• Optimistic UI updates</li>
                <li>• Background data prefetching</li>
                <li>• Memory-efficient caching</li>
                <li>• Request cancellation on unmount</li>
                <li>• Cache size management</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Developer Experience</h4>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <li>• TypeScript support throughout</li>
                <li>• Specialized hooks for chart types</li>
                <li>• Comprehensive error boundaries</li>
                <li>• Debug logging and monitoring</li>
                <li>• Easy integration with existing components</li>
                <li>• Extensible architecture</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicDataDemo;
