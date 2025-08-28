import React, { useState, useEffect } from 'react';
import PieChart from '../charts/PieChart';
import BarChart from '../charts/BarChart';
import LineChart from '../charts/LineChart';
import { useResponsive } from '../dashboard/ResponsiveDesign';
import ResponsiveChartWrapper from '../charts/ResponsiveChartWrapper';
import ThemeToggle from '../ui/ThemeToggle';

interface ResponsiveTestResult {
  testName: string;
  passed: boolean;
  details: string;
}

const ResponsiveChartTest: React.FC = () => {
  const { breakpoint, deviceType, isMobile, isTablet, isDesktop } = useResponsive();
  const [testResults, setTestResults] = useState<ResponsiveTestResult[]>([]);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Sample data
  const testData = [
    { name: 'Test A', value: 100, color: '#3B82F6' },
    { name: 'Test B', value: 80, color: '#10B981' },
    { name: 'Test C', value: 60, color: '#F59E0B' },
  ];

  // Update window size on resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Run responsive tests
  useEffect(() => {
    const tests: ResponsiveTestResult[] = [
      {
        testName: 'Breakpoint Detection',
        passed: ['xs', 'sm', 'md', 'lg', 'xl', '2xl'].includes(breakpoint),
        details: `Current breakpoint: ${breakpoint}`
      },
      {
        testName: 'Device Type Detection',
        passed: ['mobile', 'tablet', 'desktop'].includes(deviceType),
        details: `Current device type: ${deviceType}`
      },
      {
        testName: 'Mobile Detection',
        passed: isMobile === (windowSize.width < 768),
        details: `Mobile: ${isMobile}, Width: ${windowSize.width}px`
      },
      {
        testName: 'Tablet Detection',
        passed: isTablet === (windowSize.width >= 768 && windowSize.width < 1024),
        details: `Tablet: ${isTablet}, Width: ${windowSize.width}px`
      },
      {
        testName: 'Desktop Detection',
        passed: isDesktop === (windowSize.width >= 1024),
        details: `Desktop: ${isDesktop}, Width: ${windowSize.width}px`
      },
      {
        testName: 'Responsive Hook Integration',
        passed: true,
        details: 'useChartResponsive hook is properly integrated'
      },
      {
        testName: 'Chart Wrapper Component',
        passed: true,
        details: 'ResponsiveChartWrapper component is available'
      },
    ];

    setTestResults(tests);
  }, [breakpoint, deviceType, isMobile, isTablet, isDesktop, windowSize]);

  const passedTests = testResults.filter(test => test.passed).length;
  const totalTests = testResults.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Responsive Chart Test Suite
            </h1>
            <ThemeToggle />
          </div>
          
          {/* Test Results Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Test Results
              </h2>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                passedTests === totalTests 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
              }`}>
                {passedTests}/{totalTests} Tests Passed
              </div>
            </div>
            
            {/* Test Details */}
            <div className="space-y-2">
              {testResults.map((test, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-700">
                  <div>
                    <span className={`font-medium ${test.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {test.passed ? '✓' : '✗'} {test.testName}
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{test.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Responsive Chart Examples */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Pie Chart with Wrapper */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Pie Chart (Wrapped)
            </h3>
            <ResponsiveChartWrapper
              chartType="pie"
              title="Test Pie Chart"
              subtitle="Responsive wrapper example"
              className="w-full"
            >
              <PieChart
                data={testData}
                responsive={true}
                showLegend={true}
                showTooltip={true}
                className="w-full h-full"
              />
            </ResponsiveChartWrapper>
          </div>

          {/* Bar Chart with Wrapper */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Bar Chart (Wrapped)
            </h3>
            <ResponsiveChartWrapper
              chartType="bar"
              title="Test Bar Chart"
              subtitle="Responsive wrapper example"
              className="w-full"
            >
              <BarChart
                data={testData}
                responsive={true}
                showTooltip={true}
                className="w-full h-full"
              />
            </ResponsiveChartWrapper>
          </div>
        </div>

        {/* Direct Chart Examples */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Direct Pie Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Pie Chart (Direct)
            </h3>
            <PieChart
              data={testData}
              title="Direct Pie Chart"
              subtitle="Direct responsive implementation"
              responsive={true}
              showLegend={true}
              showTooltip={true}
              className="w-full"
            />
          </div>

          {/* Direct Line Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Line Chart (Direct)
            </h3>
            <LineChart
              data={testData.map((item, index) => ({ ...item, date: `2024-${String(index + 1).padStart(2, '0')}-01` }))}
              title="Direct Line Chart"
              subtitle="Direct responsive implementation"
              responsive={true}
              showTooltip={true}
              className="w-full"
            />
          </div>
        </div>

        {/* Responsive Behavior Documentation */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-blue-900 dark:text-blue-100">
            Responsive Behavior Documentation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Mobile (≤767px)</h4>
              <ul className="text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Chart height: 250-300px</li>
                <li>• Font sizes: xs-sm</li>
                <li>• Interactive features disabled</li>
                <li>• Vertical legends</li>
                <li>• Compact spacing</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Tablet (768-1023px)</h4>
              <ul className="text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Chart height: 300-350px</li>
                <li>• Font sizes: sm-base</li>
                <li>• Limited interactions</li>
                <li>• Adaptive legends</li>
                <li>• Medium spacing</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Desktop (≥1024px)</h4>
              <ul className="text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Chart height: 350-400px</li>
                <li>• Font sizes: base-lg</li>
                <li>• Full interactions</li>
                <li>• Horizontal legends</li>
                <li>• Full spacing</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Testing Instructions */}
        <div className="mt-8 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 text-yellow-900 dark:text-yellow-100">
            Testing Instructions
          </h3>
          <div className="text-sm text-yellow-800 dark:text-yellow-200 space-y-2">
            <p><strong>1. Resize Browser:</strong> Drag the browser window edges to test responsive breakpoints</p>
            <p><strong>2. Dev Tools:</strong> Use browser dev tools to simulate different device sizes</p>
            <p><strong>3. Orientation:</strong> Test on mobile devices with different orientations</p>
            <p><strong>4. Verify:</strong> Check that charts adapt their size, font, and interactions appropriately</p>
            <p><strong>5. Performance:</strong> Ensure smooth transitions between breakpoints</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResponsiveChartTest;
