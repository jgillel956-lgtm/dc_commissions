import React, { useState } from 'react';
import EnhancedPieChart from '../charts/EnhancedPieChart';
import { PieChartData } from '../../types/charts';
import { DrillDownNode } from '../../hooks/useDrillDown';
import ThemeToggle from '../ui/ThemeToggle';

// Sample drill-down data with multiple levels
const sampleDrillDownData: DrillDownNode[] = [
  {
    id: 'revenue',
    name: 'Total Revenue',
    value: 2500000,
    level: 0,
    metadata: {
      previousValue: 2300000,
      growth: 8.7,
      transactions: 15420,
      averageTicket: 162.12
    },
    children: [
      {
        id: 'transaction-fees',
        name: 'Transaction Fees',
        value: 1500000,
        level: 1,
        metadata: {
          previousValue: 1380000,
          growth: 8.7,
          transactions: 12500,
          averageTicket: 120.00
        },
        children: [
          {
            id: 'credit-card',
            name: 'Credit Card',
            value: 900000,
            level: 2,
            metadata: {
              previousValue: 820000,
              growth: 9.8,
              transactions: 7500,
              averageTicket: 120.00,
              interchangeRate: 2.9
            },
            children: [
              {
                id: 'visa',
                name: 'Visa',
                value: 540000,
                level: 3,
                metadata: {
                  previousValue: 492000,
                  growth: 9.8,
                  transactions: 4500,
                  averageTicket: 120.00
                }
              },
              {
                id: 'mastercard',
                name: 'Mastercard',
                value: 360000,
                level: 3,
                metadata: {
                  previousValue: 328000,
                  growth: 9.8,
                  transactions: 3000,
                  averageTicket: 120.00
                }
              }
            ]
          },
          {
            id: 'ach',
            name: 'ACH',
            value: 600000,
            level: 2,
            metadata: {
              previousValue: 560000,
              growth: 7.1,
              transactions: 5000,
              averageTicket: 120.00,
              processingFee: 0.25
            }
          }
        ]
      },
      {
        id: 'payor-fees',
        name: 'Payor Fees',
        value: 800000,
        level: 1,
        metadata: {
          previousValue: 750000,
          growth: 6.7,
          transactions: 2500,
          averageTicket: 320.00
        },
        children: [
          {
            id: 'setup-fees',
            name: 'Setup Fees',
            value: 300000,
            level: 2,
            metadata: {
              previousValue: 280000,
              growth: 7.1,
              transactions: 1000,
              averageTicket: 300.00
            }
          },
          {
            id: 'monthly-fees',
            name: 'Monthly Fees',
            value: 500000,
            level: 2,
            metadata: {
              previousValue: 470000,
              growth: 6.4,
              transactions: 1500,
              averageTicket: 333.33
            }
          }
        ]
      },
      {
        id: 'interest',
        name: 'Interest Revenue',
        value: 200000,
        level: 1,
        metadata: {
          previousValue: 170000,
          growth: 17.6,
          transactions: 420,
          averageTicket: 476.19
        },
        children: [
          {
            id: 'late-fees',
            name: 'Late Fees',
            value: 120000,
            level: 2,
            metadata: {
              previousValue: 100000,
              growth: 20.0,
              transactions: 300,
              averageTicket: 400.00
            }
          },
          {
            id: 'financing',
            name: 'Financing',
            value: 80000,
            level: 2,
            metadata: {
              previousValue: 70000,
              growth: 14.3,
              transactions: 120,
              averageTicket: 666.67
            }
          }
        ]
      }
    ]
  }
];

// Sample regular pie chart data
const samplePieData: PieChartData[] = [
  { name: 'Transaction Fees', value: 1500000, fill: '#3B82F6' },
  { name: 'Payor Fees', value: 800000, fill: '#10B981' },
  { name: 'Interest Revenue', value: 200000, fill: '#F59E0B' },
];

const DrillDownDemo: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<DrillDownNode | null>(null);
  const [drillDownPath, setDrillDownPath] = useState<string[]>([]);
  const [showEnhanced, setShowEnhanced] = useState(true);

  const handleNodeSelect = (nodeId: string, node: DrillDownNode) => {
    setSelectedNode(node);
    console.log('Selected node:', node);
  };

  const handleDrillDown = (segmentName: string, path: string[], children: any[]) => {
    setDrillDownPath(path);
    console.log('Drilled down to:', segmentName, 'Path:', path);
  };

  const handleDrillUp = (path: string[], parentSegment: string | null) => {
    setDrillDownPath(path);
    console.log('Drilled up to:', parentSegment, 'Path:', path);
  };

  const handleDrillDownReset = () => {
    setDrillDownPath([]);
    setSelectedNode(null);
    console.log('Drill-down reset');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Drill-Down Chart Demo</h1>
          <ThemeToggle />
        </div>
        <p className="text-gray-600 mb-4">
          This demo showcases the comprehensive drill-down functionality for pie charts. 
          Click on chart segments to drill down into detailed data, use breadcrumbs to navigate, 
          and view detailed information in the side panel.
        </p>
        
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setShowEnhanced(true)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              showEnhanced
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Enhanced Pie Chart
          </button>
          <button
            onClick={() => setShowEnhanced(false)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              !showEnhanced
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Regular Pie Chart
          </button>
        </div>

        {/* Current drill-down path display */}
        {drillDownPath.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm font-medium text-blue-900 mb-1">Current Path:</div>
            <div className="text-sm text-blue-700">
              {drillDownPath.join(' → ')}
            </div>
          </div>
        )}

        {/* Selected node info */}
        {selectedNode && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-sm font-medium text-green-900 mb-1">Selected Node:</div>
            <div className="text-sm text-green-700">
              {selectedNode.name} - ${selectedNode.value.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Pie Chart with Drill-Down */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {showEnhanced ? 'Enhanced Pie Chart with Drill-Down' : 'Regular Pie Chart'}
          </h2>
          
          {showEnhanced ? (
            <EnhancedPieChart
              data={samplePieData}
              title="Revenue Breakdown"
              subtitle="Click segments to drill down into detailed data"
              width="100%"
              height={400}
              drillDownData={sampleDrillDownData}
              enableDrillDown={true}
              showDrillDownBreadcrumbs={true}
              showDrillDownDetails={true}
              onNodeSelect={handleNodeSelect}
              onDrillDown={handleDrillDown}
              onDrillUp={handleDrillUp}
              onDrillDownReset={handleDrillDownReset}
              drillDownMaxDepth={4}
              enableDrillDownPersistence={true}
              drillDownStorageKey="demo-drill-down"
              showTooltip={true}
              showLegend={true}
              enableKeyboardNavigation={true}
              enableScreenReader={true}
            />
          ) : (
            <EnhancedPieChart
              data={samplePieData}
              title="Revenue Breakdown"
              subtitle="Regular pie chart without drill-down"
              width="100%"
              height={400}
              enableDrillDown={false}
              showTooltip={true}
              showLegend={true}
              enableKeyboardNavigation={true}
              enableScreenReader={true}
            />
          )}
        </div>

        {/* Features and Instructions */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Features & Instructions</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Drill-Down Features:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Click on chart segments to drill down</li>
                <li>• Use breadcrumbs to navigate between levels</li>
                <li>• View detailed information in the side panel</li>
                <li>• State persistence across page reloads</li>
                <li>• Keyboard navigation support</li>
                <li>• Screen reader accessibility</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Sample Data Structure:</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div>• Level 0: Total Revenue ($2.5M)</div>
                <div>• Level 1: Transaction Fees, Payor Fees, Interest</div>
                <div>• Level 2: Credit Card, ACH, Setup Fees, etc.</div>
                <div>• Level 3: Visa, Mastercard</div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Interactive Elements:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Hover over segments for tooltips</li>
                <li>• Click segments to drill down</li>
                <li>• Use breadcrumb navigation</li>
                <li>• View metadata in details panel</li>
                <li>• Reset to top level</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Accessibility:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Keyboard navigation with arrow keys</li>
                <li>• Screen reader announcements</li>
                <li>• ARIA labels and descriptions</li>
                <li>• Focus indicators</li>
                <li>• High contrast support</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Console Output */}
      <div className="mt-6 bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
        <div className="mb-2 font-medium">Console Output:</div>
        <div className="space-y-1">
          {drillDownPath.length > 0 && (
            <div>→ Drilled to: {drillDownPath.join(' → ')}</div>
          )}
          {selectedNode && (
            <div>→ Selected: {selectedNode.name} (${selectedNode.value.toLocaleString()})</div>
          )}
          {drillDownPath.length === 0 && !selectedNode && (
            <div>→ No drill-down activity yet. Click on chart segments to start exploring.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DrillDownDemo;







