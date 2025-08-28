import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../ui/ThemeToggle';

const DashboardDemo: React.FC = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'charts', name: 'Charts', icon: '📈' },
    { id: 'drill-down', name: 'Drill Down', icon: '🔍' },
    { id: 'responsive', name: 'Responsive', icon: '📱' }
  ];

  return (
    <div className={`min-h-screen ${theme.mode === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`border-b ${theme.mode === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold">Revenue Analytics Dashboard</h1>
              <span className={`px-3 py-1 rounded-full text-sm ${
                theme.mode === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
              }`}>
                Demo Mode
              </span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className={`border-b ${theme.mode === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">Dashboard Overview</h2>
            
            {/* Filter Panel Demo Link */}
            <div className={`p-4 rounded-lg ${theme.mode === 'dark' ? 'bg-green-900' : 'bg-green-50'} border border-green-200`}>
              <h3 className="text-lg font-semibold text-green-800 mb-2">🔧 New: Comprehensive Filter System!</h3>
              <p className="text-green-700 mb-3">
                Advanced filtering capabilities with date ranges, multi-select options, search functionality, and real-time updates.
              </p>
              <a
                href="/demo/filters"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Try Filter Demo →
              </a>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className={`p-6 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                <h3 className="text-lg font-semibold text-gray-600">Total Revenue</h3>
                <p className="text-3xl font-bold text-green-600">$45,000</p>
                <p className="text-sm text-gray-500">+12% from last month</p>
              </div>
              <div className={`p-6 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                <h3 className="text-lg font-semibold text-gray-600">Commissions</h3>
                <p className="text-3xl font-bold text-blue-600">$12,000</p>
                <p className="text-sm text-gray-500">+8% from last month</p>
              </div>
              <div className={`p-6 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                <h3 className="text-lg font-semibold text-gray-600">Expenses</h3>
                <p className="text-3xl font-bold text-red-600">$8,000</p>
                <p className="text-sm text-gray-500">-3% from last month</p>
              </div>
              <div className={`p-6 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                <h3 className="text-lg font-semibold text-gray-600">Net Profit</h3>
                <p className="text-3xl font-bold text-purple-600">$25,000</p>
                <p className="text-sm text-gray-500">+15% from last month</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'charts' && (
          <div className="space-y-8">
            <h2 className="text-3xl font-bold">Chart Demonstrations</h2>
            <p className="text-lg text-gray-600">
              This section would show interactive charts. Visit the individual demo pages to see them in action.
            </p>
            
            {/* Export Demo Link */}
            <div className={`p-4 rounded-lg ${theme.mode === 'dark' ? 'bg-blue-900' : 'bg-blue-50'} border border-blue-200`}>
              <h3 className="text-lg font-semibold text-blue-800 mb-2">🎉 New: Chart Export Functionality!</h3>
              <p className="text-blue-700 mb-3">
                Export charts as PDF, PNG, or CSV with customizable options and high-quality output.
              </p>
              <a
                href="/demo/export"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Try Export Demo →
              </a>
            </div>

            {/* Filter State Demo Link */}
            <div className={`p-4 rounded-lg ${theme.mode === 'dark' ? 'bg-green-900' : 'bg-green-50'} border border-green-200`}>
              <h3 className="text-lg font-semibold text-green-800 mb-2">🔧 Advanced Filter State Management!</h3>
              <p className="text-green-700 mb-3">
                Comprehensive filter system with persistence, history, presets, and export/import functionality.
              </p>
              <a
                href="/demo/filter-state"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Try Filter State Demo →
              </a>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`p-6 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                <h3 className="text-xl font-semibold mb-4">Pie Charts</h3>
                <p className="text-gray-600">Revenue distribution and breakdown charts</p>
              </div>
              <div className={`p-6 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                <h3 className="text-xl font-semibold mb-4">Bar Charts</h3>
                <p className="text-gray-600">Quarterly performance and comparisons</p>
              </div>
              <div className={`p-6 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                <h3 className="text-xl font-semibold mb-4">Line Charts</h3>
                <p className="text-gray-600">Revenue trends over time</p>
              </div>
              <div className={`p-6 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                <h3 className="text-xl font-semibold mb-4">Waterfall Charts</h3>
                <p className="text-gray-600">Profit analysis and breakdown</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'drill-down' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">Drill-Down Functionality</h2>
            <p className="text-lg text-gray-600">
              Click on chart segments to explore data at different levels. Use breadcrumbs to navigate back.
            </p>
            <div className={`p-6 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <h3 className="text-xl font-semibold mb-4">Interactive Data Exploration</h3>
              <p className="text-gray-600">
                The drill-down functionality allows users to click on chart elements to see more detailed information.
                This feature is fully implemented in the EnhancedPieChart component.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'responsive' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">Responsive Design</h2>
            <p className="text-lg text-gray-600">
              Resize your browser window to see how the dashboard adapts to different screen sizes.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className={`p-4 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                <h3 className="text-lg font-semibold mb-2">Mobile View</h3>
                <p className="text-sm text-gray-600">Optimized for phones and tablets</p>
              </div>
              <div className={`p-4 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                <h3 className="text-lg font-semibold mb-2">Tablet View</h3>
                <p className="text-sm text-gray-600">Adaptive layout for medium screens</p>
              </div>
              <div className={`p-4 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                <h3 className="text-lg font-semibold mb-2">Desktop View</h3>
                <p className="text-sm text-gray-600">Full-featured layout for large screens</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardDemo;
