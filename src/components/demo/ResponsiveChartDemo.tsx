import React, { useState } from 'react';
import PieChart from '../charts/PieChart';
import BarChart from '../charts/BarChart';
import LineChart from '../charts/LineChart';
import { useResponsive } from '../dashboard/ResponsiveDesign';
import ThemeToggle from '../ui/ThemeToggle';

const ResponsiveChartDemo: React.FC = () => {
  const { breakpoint, deviceType, isMobile, isTablet, isDesktop } = useResponsive();
  const [activeTab, setActiveTab] = useState<'pie' | 'bar' | 'line'>('pie');

  // Sample data for different chart types
  const pieData = [
    { name: 'Payee Fees', value: 45000, color: '#3B82F6' },
    { name: 'Payor Fees', value: 32000, color: '#10B981' },
    { name: 'Interest', value: 18000, color: '#F59E0B' },
    { name: 'Other', value: 12000, color: '#EF4444' },
  ];

  const barData = [
    { name: 'Company A', value: 25000, color: '#3B82F6' },
    { name: 'Company B', value: 18000, color: '#10B981' },
    { name: 'Company C', value: 22000, color: '#F59E0B' },
    { name: 'Company D', value: 15000, color: '#EF4444' },
    { name: 'Company E', value: 20000, color: '#8B5CF6' },
  ];

  const lineData = [
    { name: 'Jan', value: 12000, date: '2024-01-01' },
    { name: 'Feb', value: 15000, date: '2024-02-01' },
    { name: 'Mar', value: 18000, date: '2024-03-01' },
    { name: 'Apr', value: 14000, date: '2024-04-01' },
    { name: 'May', value: 22000, date: '2024-05-01' },
    { name: 'Jun', value: 25000, date: '2024-06-01' },
  ];

  const tabs = [
    { id: 'pie', label: 'Pie Chart', icon: '🥧' },
    { id: 'bar', label: 'Bar Chart', icon: '📊' },
    { id: 'line', label: 'Line Chart', icon: '📈' },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Responsive Chart Demo
            </h1>
            <ThemeToggle />
          </div>
          
          {/* Device Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Current Device Information
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Breakpoint:</span>
                <p className="font-medium text-gray-900 dark:text-white">{breakpoint}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Device Type:</span>
                <p className="font-medium text-gray-900 dark:text-white">{deviceType}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Screen Size:</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Width:</span>
                <p className="font-medium text-gray-900 dark:text-white">{window.innerWidth}px</p>
              </div>
            </div>
          </div>

          {/* Responsive Guidelines */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold mb-2 text-blue-900 dark:text-blue-100">
              Responsive Features
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Charts automatically adjust height and font sizes based on screen size</li>
              <li>• Interactive features (zoom, drill-down) are disabled on mobile for better UX</li>
              <li>• Legend positioning adapts to screen orientation</li>
              <li>• Tooltip and axis styling scales appropriately</li>
              <li>• Grid and spacing adjust for optimal viewing on each device</li>
            </ul>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Container */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {tabs.find(t => t.id === activeTab)?.label}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This chart demonstrates responsive behavior. Try resizing your browser window or using browser dev tools to simulate different screen sizes.
            </p>
          </div>

          {/* Chart */}
          <div className="w-full">
            {activeTab === 'pie' && (
              <PieChart
                data={pieData}
                title="Revenue Breakdown"
                subtitle="Distribution of revenue by source"
                responsive={true}
                showLegend={true}
                showTooltip={true}
                enableDrillDown={true}
                enableZoom={true}
                className="w-full"
              />
            )}

            {activeTab === 'bar' && (
              <BarChart
                data={barData}
                title="Company Performance"
                subtitle="Revenue by company"
                responsive={true}
                showTooltip={true}
                enableDrillDown={true}
                enableZoom={true}
                className="w-full"
              />
            )}

            {activeTab === 'line' && (
              <LineChart
                data={lineData}
                title="Revenue Trends"
                subtitle="Monthly revenue over time"
                responsive={true}
                showTooltip={true}
                enableZoom={true}
                className="w-full"
              />
            )}
          </div>
        </div>

        {/* Responsive Testing Instructions */}
        <div className="mt-8 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 text-yellow-900 dark:text-yellow-100">
            Testing Responsive Behavior
          </h3>
          <div className="text-sm text-yellow-800 dark:text-yellow-200 space-y-2">
            <p><strong>Desktop:</strong> Full interactive features, larger charts, horizontal legends</p>
            <p><strong>Tablet:</strong> Medium-sized charts, some interactive features disabled</p>
            <p><strong>Mobile:</strong> Compact charts, simplified interactions, vertical legends</p>
            <p className="mt-2">
              <strong>Try:</strong> Resize browser window, use browser dev tools device simulation, 
              or rotate your device to see the responsive behavior in action.
            </p>
          </div>
        </div>

        {/* Chart Comparison Grid */}
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            All Charts (Responsive Grid)
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <h4 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">Pie Chart</h4>
              <PieChart
                data={pieData.slice(0, 3)}
                title="Revenue Sources"
                responsive={true}
                showLegend={true}
                showTooltip={true}
                className="w-full"
                height={250}
              />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <h4 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">Bar Chart</h4>
              <BarChart
                data={barData.slice(0, 4)}
                title="Top Companies"
                responsive={true}
                showTooltip={true}
                className="w-full"
                height={250}
              />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <h4 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">Line Chart</h4>
              <LineChart
                data={lineData}
                title="Trends"
                responsive={true}
                showTooltip={true}
                className="w-full"
                height={250}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResponsiveChartDemo;
