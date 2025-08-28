import React, { useState } from 'react';
import PieChart from '../charts/PieChart';
import BarChart from '../charts/BarChart';
import LineChart from '../charts/LineChart';
import ThemeToggle from '../ui/ThemeToggle';

const AccessibilityDemo: React.FC = () => {
  const [accessibilityMode, setAccessibilityMode] = useState<'full' | 'keyboard' | 'screenReader' | 'none'>('full');

  // Sample data for charts
  const pieData = [
    { name: 'Revenue', value: 45000 },
    { name: 'Commission', value: 12000 },
    { name: 'Interest', value: 8000 },
    { name: 'Fees', value: 5000 },
  ];

  const barData = [
    { name: 'Jan', value: 12000 },
    { name: 'Feb', value: 15000 },
    { name: 'Mar', value: 18000 },
    { name: 'Apr', value: 14000 },
    { name: 'May', value: 22000 },
    { name: 'Jun', value: 25000 },
  ];

  const lineData = [
    { date: '2024-01-01', value: 12000 },
    { date: '2024-02-01', value: 15000 },
    { date: '2024-03-01', value: 18000 },
    { date: '2024-04-01', value: 14000 },
    { date: '2024-05-01', value: 22000 },
    { date: '2024-06-01', value: 25000 },
  ];

  const getAccessibilityProps = () => {
    switch (accessibilityMode) {
      case 'full':
        return {
          enableKeyboardNavigation: true,
          enableScreenReader: true,
        };
      case 'keyboard':
        return {
          enableKeyboardNavigation: true,
          enableScreenReader: false,
        };
      case 'screenReader':
        return {
          enableKeyboardNavigation: false,
          enableScreenReader: true,
        };
      case 'none':
        return {
          enableKeyboardNavigation: false,
          enableScreenReader: false,
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Chart Accessibility Demo
            </h1>
            <ThemeToggle size="lg" />
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Test the accessibility features of our chart components
          </p>
        </div>

        {/* Accessibility Controls */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 mb-8 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Accessibility Settings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Accessibility Mode
              </label>
              <select
                value={accessibilityMode}
                onChange={(e) => setAccessibilityMode(e.target.value as any)}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="full">Full Accessibility</option>
                <option value="keyboard">Keyboard Only</option>
                <option value="screenReader">Screen Reader Only</option>
                <option value="none">No Accessibility</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Current Settings
              </label>
              <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <div>Keyboard Navigation: {getAccessibilityProps().enableKeyboardNavigation ? '✅' : '❌'}</div>
                <div>Screen Reader: {getAccessibilityProps().enableScreenReader ? '✅' : '❌'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-8 border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            How to Test Accessibility
          </h3>
          <div className="text-blue-800 dark:text-blue-200 space-y-2">
            <p><strong>Keyboard Navigation:</strong> Use Tab to focus on charts, then use arrow keys to navigate between data points. Press Enter or Space to select.</p>
            <p><strong>Screen Reader:</strong> Use a screen reader (NVDA, JAWS, VoiceOver) to hear chart descriptions and data point information.</p>
            <p><strong>Focus Indicators:</strong> Look for blue outlines around focused elements when using keyboard navigation.</p>
            <p><strong>ARIA Labels:</strong> Inspect elements to see proper ARIA labels and descriptions.</p>
          </div>
        </div>

        {/* Chart Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pie Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Pie Chart with Accessibility
            </h3>
            <PieChart
              data={pieData}
              title="Revenue Distribution"
              subtitle="Monthly revenue breakdown with accessibility features"
              height={300}
              showLegend={true}
              showPercentage={true}
              enableDrillDown={true}
              enableZoom={true}
              {...getAccessibilityProps()}
            />
          </div>

          {/* Bar Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Bar Chart with Accessibility
            </h3>
            <BarChart
              data={barData}
              title="Monthly Revenue"
              subtitle="Revenue trends over 6 months with accessibility features"
              height={300}
              showLegend={false}
              showValues={true}
              {...getAccessibilityProps()}
            />
          </div>

          {/* Line Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700 lg:col-span-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Line Chart with Accessibility
            </h3>
            <LineChart
              data={lineData}
              title="Revenue vs Commission Trends"
              subtitle="Comparison of revenue and commission over time with accessibility features"
              height={300}
              showLegend={true}
              showGrid={true}
              {...getAccessibilityProps()}
            />
          </div>
        </div>

        {/* Accessibility Features List */}
        <div className="mt-8 bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Accessibility Features Implemented
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Keyboard Navigation</h4>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <li>• Tab to focus on chart containers</li>
                <li>• Arrow keys to navigate between data points</li>
                <li>• Enter/Space to select data points</li>
                <li>• Home/End to jump to first/last data point</li>
                <li>• Escape to clear selection</li>
                <li>• Focus indicators with proper styling</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Screen Reader Support</h4>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <li>• Proper ARIA labels and descriptions</li>
                <li>• Live announcements for data changes</li>
                <li>• Detailed data point descriptions</li>
                <li>• Chart summaries with totals and ranges</li>
                <li>• Keyboard instruction announcements</li>
                <li>• Hidden descriptions for complex interactions</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Visual Accessibility</h4>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <li>• High contrast focus indicators</li>
                <li>• Proper color contrast ratios</li>
                <li>• Clear visual feedback for interactions</li>
                <li>• Consistent focus management</li>
                <li>• Accessible button labels and titles</li>
                <li>• Semantic HTML structure</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Interactive Features</h4>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <li>• Drill-down functionality with breadcrumbs</li>
                <li>• Zoom controls with proper labels</li>
                <li>• Tooltip information accessible via keyboard</li>
                <li>• Legend interactions with proper ARIA</li>
                <li>• Data point selection and highlighting</li>
                <li>• Responsive design for all screen sizes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessibilityDemo;
