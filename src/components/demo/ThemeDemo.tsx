import React, { useState } from 'react';
import { useChartTheme } from '../../hooks/useChartTheme';
import { useTheme } from '../../contexts/ThemeContext';
import PieChart from '../charts/PieChart';
import BarChart from '../charts/BarChart';
import LineChart from '../charts/LineChart';
import ThemeToggle from '../ui/ThemeToggle';

const ThemeDemo: React.FC = () => {
  const { theme: chartTheme, isDark, getColorByIndex, colorPalettes } = useChartTheme();
  const { theme } = useTheme();
  const [selectedPreset, setSelectedPreset] = useState<'professional' | 'modern' | 'minimal' | 'highContrast'>('professional');

  // Sample data for charts
  const pieData = [
    { name: 'Revenue', value: 45000, color: getColorByIndex(0) },
    { name: 'Commission', value: 12000, color: getColorByIndex(1) },
    { name: 'Interest', value: 8000, color: getColorByIndex(2) },
    { name: 'Fees', value: 5000, color: getColorByIndex(3) },
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Chart Theme System Demo
            </h1>
            <ThemeToggle size="lg" />
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Current theme: {theme.mode} {isDark ? '(Dark)' : '(Light)'}
          </p>
        </div>

        {/* Theme Controls */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 mb-8 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Theme Controls
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Color Preset
              </label>
              <select
                value={selectedPreset}
                onChange={(e) => setSelectedPreset(e.target.value as any)}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="professional">Professional</option>
                <option value="modern">Modern</option>
                <option value="minimal">Minimal</option>
                <option value="highContrast">High Contrast</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Current Colors
              </label>
              <div className="flex space-x-2">
                {colorPalettes.qualitative.slice(0, 5).map((color, index) => (
                  <div
                    key={index}
                    className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-slate-600"
                    style={{ backgroundColor: color }}
                    title={`Color ${index + 1}: ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Chart Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pie Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Revenue Distribution (Pie Chart)
            </h3>
            <PieChart
              data={pieData}
              title="Revenue Breakdown"
              subtitle="Monthly revenue distribution"
              height={300}
              showLegend={true}
              showPercentage={true}
            />
          </div>

          {/* Bar Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Monthly Revenue (Bar Chart)
            </h3>
            <BarChart
              data={barData}
              title="Monthly Revenue"
              subtitle="Revenue trends over 6 months"
              height={300}
              showLegend={false}
              showValues={true}
            />
          </div>

          {/* Line Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700 lg:col-span-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Revenue vs Commission (Line Chart)
            </h3>
            <LineChart
              data={lineData}
              title="Revenue vs Commission Trends"
              subtitle="Comparison of revenue and commission over time"
              height={300}
              showLegend={true}
              showGrid={true}
            />
          </div>
        </div>

        {/* Theme Information */}
        <div className="mt-8 bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Theme Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Current Theme</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Mode: {theme.mode}<br />
                Colors: {colorPalettes.qualitative.length} available<br />
                Font: {chartTheme.styles.common.fontFamily}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Color Palettes</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Qualitative:</span>
                  <div className="flex space-x-1">
                    {colorPalettes.qualitative.slice(0, 3).map((color, index) => (
                      <div
                        key={index}
                        className="w-4 h-4 rounded border border-slate-200 dark:border-slate-600"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Semantic:</span>
                  <div className="flex space-x-1">
                    {Object.entries(colorPalettes.semantic).slice(0, 3).map(([key, color]) => (
                      <div
                        key={key}
                        className="w-4 h-4 rounded border border-slate-200 dark:border-slate-600"
                        style={{ backgroundColor: color }}
                        title={key}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Features</h4>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <li>• Automatic dark/light mode</li>
                <li>• System preference detection</li>
                <li>• Persistent theme storage</li>
                <li>• CSS custom properties</li>
                <li>• Chart theme integration</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeDemo;
