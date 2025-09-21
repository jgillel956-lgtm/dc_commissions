import React, { useRef, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import EnhancedPieChart from '../charts/EnhancedPieChart';
import BarChart from '../charts/BarChart';
import LineChart from '../charts/LineChart';
import WaterfallChart from '../charts/WaterfallChart';
import ChartExportButton from '../ui/ChartExportButton';
import { PieChartData, BarChartData, LineChartData, WaterfallDataPoint } from '../../types/charts';
import { DrillDownNode } from '../../hooks/useDrillDown';

const ChartExportDemo: React.FC = () => {
  const { theme } = useTheme();
  const [activeChart, setActiveChart] = useState('pie');
  const [exportStatus, setExportStatus] = useState<string>('');

  // Chart refs
  const pieChartRef = useRef<HTMLDivElement>(null);
  const barChartRef = useRef<HTMLDivElement>(null);
  const lineChartRef = useRef<HTMLDivElement>(null);
  const waterfallChartRef = useRef<HTMLDivElement>(null);

  // Sample data
  const pieData: PieChartData[] = [
    { name: 'Revenue', value: 45000, color: '#3B82F6' },
    { name: 'Commissions', value: 12000, color: '#10B981' },
    { name: 'Expenses', value: 8000, color: '#F59E0B' },
    { name: 'Profit', value: 25000, color: '#EF4444' }
  ];

  const barData: BarChartData[] = [
    { name: 'Q1', value: 12000, revenue: 12000, commission: 3000 },
    { name: 'Q2', value: 15000, revenue: 15000, commission: 3750 },
    { name: 'Q3', value: 18000, revenue: 18000, commission: 4500 },
    { name: 'Q4', value: 22000, revenue: 22000, commission: 5500 }
  ];

  const lineData: LineChartData[] = [
    { date: '2024-01-01', value: 12000 },
    { date: '2024-02-01', value: 15000 },
    { date: '2024-03-01', value: 18000 },
    { date: '2024-04-01', value: 22000 },
    { date: '2024-05-01', value: 25000 },
    { date: '2024-06-01', value: 28000 }
  ];

  const waterfallData: WaterfallDataPoint[] = [
    { name: 'Starting Balance', value: 0, type: 'start', isTotal: false },
    { name: 'Revenue', value: 45000, type: 'positive', isTotal: false },
    { name: 'Commissions', value: -12000, type: 'negative', isTotal: false },
    { name: 'Expenses', value: -8000, type: 'negative', isTotal: false },
    { name: 'Net Profit', value: 25000, type: 'end', isTotal: true }
  ];

  const drillDownData: DrillDownNode[] = [
    {
      id: 'revenue',
      name: 'Revenue',
      value: 45000,
      level: 0,
      children: [
        {
          id: 'revenue-q1',
          name: 'Q1 Revenue',
          value: 12000,
          level: 1,
          children: [
            { id: 'revenue-q1-jan', name: 'January', value: 4000, level: 2 },
            { id: 'revenue-q1-feb', name: 'February', value: 4000, level: 2 },
            { id: 'revenue-q1-mar', name: 'March', value: 4000, level: 2 }
          ]
        }
      ]
    }
  ];

  const charts = [
    {
      id: 'pie',
      name: 'Pie Chart',
      ref: pieChartRef,
      data: pieData,
      component: (
        <EnhancedPieChart
          data={pieData}
          title="Revenue Breakdown"
          showDrillDownBreadcrumbs={true}
          showDrillDownDetails={true}
          drillDownData={drillDownData}
        />
      )
    },
    {
      id: 'bar',
      name: 'Bar Chart',
      ref: barChartRef,
      data: barData,
      component: (
        <BarChart
          data={barData}
          title="Quarterly Performance"
          xAxisDataKey="name"
          yAxisDataKey="revenue"
        />
      )
    },
    {
      id: 'line',
      name: 'Line Chart',
      ref: lineChartRef,
      data: lineData,
      component: (
        <LineChart
          data={lineData}
          title="Revenue Trend"
          xAxisDataKey="date"
          yAxisDataKey="value"
        />
      )
    },
    {
      id: 'waterfall',
      name: 'Waterfall Chart',
      ref: waterfallChartRef,
      data: waterfallData,
      component: (
        <WaterfallChart
          data={waterfallData}
          title="Profit Analysis"
          xAxisDataKey="name"
          yAxisDataKey="value"
        />
      )
    }
  ];

  const currentChart = charts.find(chart => chart.id === activeChart);

  const handleExportStart = () => {
    setExportStatus('Exporting...');
  };

  const handleExportComplete = (format: string) => {
    setExportStatus(`Successfully exported as ${format.toUpperCase()}`);
    setTimeout(() => setExportStatus(''), 3000);
  };

  const handleExportError = (error: string) => {
    setExportStatus(`Export failed: ${error}`);
    setTimeout(() => setExportStatus(''), 5000);
  };

  return (
    <div className={`min-h-screen ${theme.mode === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`border-b ${theme.mode === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold">Chart Export Demo</h1>
              <span className={`px-3 py-1 rounded-full text-sm ${
                theme.mode === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
              }`}>
                Export Functionality
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Chart Selection */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Select Chart Type</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {charts.map((chart) => (
              <button
                key={chart.id}
                onClick={() => setActiveChart(chart.id)}
                className={`
                  p-4 rounded-lg border-2 transition-colors
                  ${activeChart === chart.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <div className="font-medium">{chart.name}</div>
                <div className="text-sm text-gray-500 mt-1">
                  Click to select
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Export Status */}
        {exportStatus && (
          <div className={`mb-6 p-4 rounded-md ${
            exportStatus.includes('Successfully')
              ? 'bg-green-100 text-green-800 border border-green-200'
              : exportStatus.includes('failed')
              ? 'bg-red-100 text-red-800 border border-red-200'
              : 'bg-blue-100 text-blue-800 border border-blue-200'
          }`}>
            {exportStatus}
          </div>
        )}

        {/* Chart Display */}
        <div className={`p-6 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold">{currentChart?.name}</h3>
            {currentChart && (
              <ChartExportButton
                chartRef={currentChart.ref}
                data={currentChart.data}
                chartType={currentChart.id}
                title={currentChart.name}
                subtitle="Generated from Revenue Analytics Dashboard"
                onExportStart={handleExportStart}
                onExportComplete={handleExportComplete}
                onExportError={handleExportError}
              />
            )}
          </div>

          {/* Chart Container */}
          <div className="h-96">
            {currentChart && (
              <div ref={currentChart.ref} className="w-full h-full">
                {currentChart.component}
              </div>
            )}
          </div>
        </div>

        {/* Export Features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`p-6 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <h3 className="text-lg font-semibold mb-3">PDF Export</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• High-quality vector graphics</li>
              <li>• Customizable paper size (A4, Letter)</li>
              <li>• Portrait or landscape orientation</li>
              <li>• Optional data table inclusion</li>
              <li>• Professional formatting</li>
            </ul>
          </div>

          <div className={`p-6 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <h3 className="text-lg font-semibold mb-3">PNG Export</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• High-resolution raster images</li>
              <li>• Adjustable quality settings</li>
              <li>• Perfect for presentations</li>
              <li>• Easy sharing and embedding</li>
              <li>• Transparent background option</li>
            </ul>
          </div>

          <div className={`p-6 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <h3 className="text-lg font-semibold mb-3">CSV Export</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Raw data export</li>
              <li>• Compatible with Excel/Sheets</li>
              <li>• Further analysis ready</li>
              <li>• Proper CSV formatting</li>
              <li>• Handles special characters</li>
            </ul>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className={`mt-8 p-6 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
          <h3 className="text-lg font-semibold mb-4">How to Use Export Functionality</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Step 1: Select Chart</h4>
              <p className="text-sm text-gray-600">
                Choose the chart type you want to export from the options above.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Step 2: Click Export</h4>
              <p className="text-sm text-gray-600">
                Click the "Export" button next to the chart to open export options.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Step 3: Choose Format</h4>
              <p className="text-sm text-gray-600">
                Select PDF, PNG, or CSV format based on your needs.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Step 4: Configure Options</h4>
              <p className="text-sm text-gray-600">
                Adjust quality, paper size, orientation, and other settings as needed.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChartExportDemo;







