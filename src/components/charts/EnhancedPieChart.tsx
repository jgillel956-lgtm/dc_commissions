import React, { useMemo, useCallback, useRef, useState } from 'react';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PieChartProps, PieChartData } from '../../types/charts';
import { useChartTheme } from '../../hooks/useChartTheme';
import { useChartAccessibility } from '../../hooks/useChartAccessibility';
import { useChartResponsive } from '../../hooks/useChartResponsive';
import { useDrillDown, DrillDownNode } from '../../hooks/useDrillDown';
import DrillDownBreadcrumbs from '../ui/DrillDownBreadcrumbs';
import DrillDownDetails from '../ui/DrillDownDetails';
import AccessibilityAnnouncer from '../ui/AccessibilityAnnouncer';
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
  createCustomTooltip,
  generateAriaLabel,
  generateAriaDescription,
  generateDetailedAriaLabel,
  generateDataPointAriaLabel,
  generateScreenReaderSummary,
  createAccessibleTooltip,
  generateFocusIndicatorStyles,
  validateChartData,
  sanitizeChartData,
} from '../../utils/chartUtils';

interface EnhancedPieChartState {
  activeIndex: number | null;
  hoveredIndex: number | null;
  selectedNode: DrillDownNode | null;
  showDetails: boolean;
}

interface EnhancedPieChartProps extends PieChartProps {
  // Enhanced drill-down features
  showDrillDownBreadcrumbs?: boolean;
  showDrillDownDetails?: boolean;
  onNodeSelect?: (nodeId: string, node: DrillDownNode) => void;
  onDrillDownReset?: () => void;
  drillDownMaxDepth?: number;
  enableDrillDownPersistence?: boolean;
  drillDownStorageKey?: string;
}

const EnhancedPieChart: React.FC<EnhancedPieChartProps> = ({
  data,
  title,
  subtitle,
  width = '100%',
  height = 400,
  className = '',
  theme: themeProp = 'light',
  responsive = true,
  loading = false,
  error = null,
  innerRadius = 0,
  outerRadius = 80,
  paddingAngle = 0,
  cornerRadius = 0,
  startAngle = 0,
  endAngle = 360,
  minAngle = 0,
  maxAngle = 360,
  cx = '50%',
  cy = '50%',
  showLabels = true,
  showPercentage = true,
  showLegend = true,
  legendPosition = 'bottom',
  animate = true,
  animationDuration = 300,
  onDataPointClick,
  onChartClick,
  ariaLabel,
  ariaDescription,
  drillDownData,
  enableDrillDown = false,
  enableZoom = false,
  maxZoomLevel = 3,
  zoomStep = 0.5,
  showTooltip = true,
  customTooltipFormatter,
  onDrillDown,
  onDrillUp,
  onZoomChange,
  // Enhanced drill-down features
  showDrillDownBreadcrumbs = true,
  showDrillDownDetails = true,
  onNodeSelect,
  onDrillDownReset,
  drillDownMaxDepth = 5,
  enableDrillDownPersistence = false,
  drillDownStorageKey = 'enhanced-pie-chart-drill-down',
  // Accessibility features
  enableKeyboardNavigation = true,
  enableScreenReader = true,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const { theme: chartTheme, getColorByIndex, chartStyles, isDark } = useChartTheme();
  
  // Responsive configuration
  const responsiveConfig = useChartResponsive({
    chartType: 'pie',
    showLegend,
    showTooltip,
    enableInteractions: enableDrillDown || enableZoom,
    customHeight: typeof height === 'number' ? height : undefined,
    customWidth: width
  });
  
  const [state, setState] = useState<EnhancedPieChartState>({
    activeIndex: null,
    hoveredIndex: null,
    selectedNode: null,
    showDetails: false,
  });

  // Convert drill-down data to DrillDownNode format
  const drillDownNodes = useMemo(() => {
    if (!drillDownData) return [];
    
    const convertToDrillDownNodes = (data: any[], level: number = 0): DrillDownNode[] => {
      return data.map((item, index) => ({
        id: item.id || `${item.name}-${index}`,
        name: item.name,
        value: item.value,
        level,
        metadata: item.metadata || {},
        children: item.children ? convertToDrillDownNodes(item.children, level + 1) : undefined,
      }));
    };
    
    return convertToDrillDownNodes(drillDownData);
  }, [drillDownData]);

  // Initialize drill-down hook
  const [drillDownState, drillDownActions] = useDrillDown({
    initialData: drillDownNodes,
    maxDepth: drillDownMaxDepth,
    enableBreadcrumbs: showDrillDownBreadcrumbs,
    persistState: enableDrillDownPersistence,
    storageKey: drillDownStorageKey,
  });

  // Use drill-down data if available, otherwise use regular data
  const chartData = useMemo(() => {
    if (enableDrillDown && drillDownState.currentData.length > 0) {
      return drillDownState.currentData.map(node => ({
        name: node.name,
        value: node.value,
        id: node.id,
        metadata: node.metadata,
      }));
    }
    
    // Validate and sanitize regular data
    if (!validateChartData(data)) {
      return [];
    }
    return sanitizeChartData(data);
  }, [enableDrillDown, drillDownState.currentData, data]);

  // Calculate colors for segments
  const colors = useMemo(() => {
    return chartData.map((_, index) => getColorByIndex(index));
  }, [chartData, getColorByIndex]);

  // Calculate total for percentages
  const total = useMemo(() => {
    return (chartData as any[]).reduce((sum, item) => sum + (item.value || 0), 0);
  }, [chartData]);

  // Handle drill-down
  const handleDrillDown = useCallback((nodeId: string) => {
    if (!enableDrillDown) return;

    const success = drillDownActions.drillDown(nodeId);
    if (success) {
      const node = drillDownActions.getNodeById(nodeId);
      if (node) {
        setState(prev => ({
          ...prev,
          selectedNode: node,
          showDetails: false,
        }));
        
        if (onNodeSelect) {
          onNodeSelect(nodeId, node);
        }
        
        if (onDrillDown) {
          onDrillDown(node.name, drillDownState.breadcrumbs.map(bc => bc.name), node.children || []);
        }
      }
    }
  }, [enableDrillDown, drillDownActions, drillDownState.breadcrumbs, onNodeSelect, onDrillDown]);

  // Handle drill-up
  const handleDrillUp = useCallback(() => {
    if (!enableDrillDown) return;

    const success = drillDownActions.drillUp();
    if (success) {
      setState(prev => ({
        ...prev,
        selectedNode: null,
        showDetails: false,
      }));
      
      if (onDrillUp) {
        const newPath = drillDownState.breadcrumbs.slice(0, -1).map(bc => bc.name);
        const parentSegment = newPath.length > 0 ? newPath[newPath.length - 1] : null;
        onDrillUp(newPath, parentSegment);
      }
    }
  }, [enableDrillDown, drillDownActions, drillDownState.breadcrumbs, onDrillUp]);

  // Handle breadcrumb click
  const handleBreadcrumbClick = useCallback((level: number) => {
    if (!enableDrillDown) return;

    const success = drillDownActions.drillToLevel(level);
    if (success) {
      setState(prev => ({
        ...prev,
        selectedNode: null,
        showDetails: false,
      }));
    }
  }, [enableDrillDown, drillDownActions]);

  // Handle reset
  const handleReset = useCallback(() => {
    if (!enableDrillDown) return;

    drillDownActions.reset();
    setState(prev => ({
      ...prev,
      selectedNode: null,
      showDetails: false,
    }));
    
    if (onDrillDownReset) {
      onDrillDownReset();
    }
  }, [enableDrillDown, drillDownActions, onDrillDownReset]);

  // Handle node selection
  const handleNodeSelect = useCallback((nodeId: string) => {
    const node = drillDownActions.getNodeById(nodeId);
    if (node) {
      setState(prev => ({
        ...prev,
        selectedNode: node,
        showDetails: true,
      }));
      
      if (onNodeSelect) {
        onNodeSelect(nodeId, node);
      }
    }
  }, [drillDownActions, onNodeSelect]);

  // Accessibility hook
  const accessibility = useChartAccessibility({
    chartType: 'pieChart',
    data: chartData,
    title,
    subtitle,
    enableKeyboardNavigation,
    enableScreenReader,
    customAriaLabel: ariaLabel,
    customAriaDescription: ariaDescription,
    onDataPointSelect: (index, dataPoint) => {
      if (onDataPointClick) {
        onDataPointClick(dataPoint);
      }
      
      if (enableDrillDown) {
        const nodeId = dataPoint.id || dataPoint.name;
        handleDrillDown(nodeId);
      }
    },
    onDataPointFocus: (index, dataPoint) => {
      setState(prev => ({ 
        ...prev, 
        hoveredIndex: index,
        activeIndex: index 
      }));
      
      const description = generateDataPointAriaLabel('pie chart segment', dataPoint, index, total);
      accessibility.announceData(description);
    },
  });

  // Handle mouse enter for hover effects
  const handleMouseEnter = useCallback((data: any, index: number) => {
    setState(prev => ({ 
      ...prev, 
      hoveredIndex: index,
      activeIndex: index 
    }));
  }, []);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      hoveredIndex: null,
      activeIndex: null 
    }));
  }, []);

  // Handle click on segment
  const handleClick = useCallback((data: any, index: number) => {
    if (onDataPointClick) {
      onDataPointClick(chartData[index]);
    }

    if (enableDrillDown) {
      const nodeId = chartData[index].id || chartData[index].name;
      handleDrillDown(nodeId);
    }
  }, [onDataPointClick, chartData, enableDrillDown, handleDrillDown]);

  // Custom tooltip formatter
  const CustomTooltip = useCallback(({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0.0';

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <div className="font-medium text-gray-900">{data.name}</div>
        <div className="text-sm text-gray-600">
          {formatCurrency(data.value)} ({percentage}%)
        </div>
        {data.metadata && Object.keys(data.metadata).length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            {Object.entries(data.metadata).slice(0, 3).map(([key, value]) => (
              <div key={key} className="text-xs text-gray-500">
                {key}: {typeof value === 'number' ? formatCurrency(value) : String(value)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }, [total]);

  if (loading) {
    return (
      <div className={`chart-loading ${className}`} style={{ width, height }}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`chart-error ${className}`} style={{ width, height }}>
        <div className="flex items-center justify-center h-full text-red-500">
          <div className="text-center">
            <div className="text-lg font-medium">Error</div>
            <div className="text-sm">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className={`chart-empty ${className}`} style={{ width, height }}>
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <div className="text-lg font-medium">No Data</div>
            <div className="text-sm">No data available to display</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <AccessibilityAnnouncer 
        message={generateScreenReaderSummary('pie chart', chartData as any[], total)}
        priority="polite"
      />
      
      <div className={`enhanced-pie-chart ${className}`} ref={chartRef}>
        {/* Header */}
        <div className="mb-4">
          {title && (
            <h3 className={`font-bold text-gray-900 mb-1 ${responsiveConfig.fontSize.title}`}>
              {title}
            </h3>
          )}
          {subtitle && (
            <p className={`text-gray-600 ${responsiveConfig.fontSize.subtitle}`}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Drill-down breadcrumbs */}
        {enableDrillDown && showDrillDownBreadcrumbs && drillDownState.breadcrumbs.length > 0 && (
          <div className="mb-4">
            <DrillDownBreadcrumbs
              breadcrumbs={drillDownState.breadcrumbs}
              onBreadcrumbClick={handleBreadcrumbClick}
              onReset={handleReset}
              className="mb-2"
            />
          </div>
        )}

        <div className="flex gap-4">
          {/* Chart Container */}
          <div className="flex-1">
            <div 
              className="chart-container"
              style={{ 
                width: responsiveConfig.width, 
                height: responsiveConfig.height,
                minHeight: 200,
                minWidth: 200
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  onClick={onChartClick}
                >
                  <Pie
                    data={chartData}
                    cx={cx}
                    cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    paddingAngle={paddingAngle}
                    cornerRadius={cornerRadius}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    minAngle={minAngle}
                    dataKey="value"
                    nameKey="name"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={handleClick}
                    animationDuration={animate ? animationDuration : 0}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={(entry as any).fill || colors[index]}
                        stroke={isDark ? '#1F2937' : '#FFFFFF'}
                        strokeWidth={state.hoveredIndex === index ? 3 : 1}
                        opacity={state.hoveredIndex === index ? 0.8 : 1}
                        style={{
                          cursor: enableDrillDown ? 'pointer' : 'default',
                          ...generateFocusIndicatorStyles(
                            accessibility.getDataPointProps(index, entry).tabIndex === 0,
                            false
                          ),
                        }}
                        {...accessibility.getDataPointProps(index, entry)}
                      />
                    ))}
                  </Pie>

                  {/* Tooltip */}
                  {showTooltip && (
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
                      wrapperStyle={{
                        ...chartStyles.tooltip,
                        ...responsiveConfig.tooltip.wrapperStyle
                      }}
                    />
                  )}

                  {/* Legend */}
                  {showLegend && (
                    <Legend
                      layout={responsiveConfig.legend.layout}
                      verticalAlign={responsiveConfig.legend.verticalAlign}
                      align={responsiveConfig.legend.align}
                      wrapperStyle={{
                        ...responsiveConfig.legend.wrapperStyle,
                        fontSize: chartStyles.tooltip.fontSize,
                        fontWeight: 400,
                        color: chartTheme.styles.legend.fill,
                      }}
                      formatter={(value, entry) => [
                        value,
                        <span style={{ color: entry.color }}>{value}</span>
                      ]}
                    />
                  )}
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>

            {/* Summary information */}
            {chartData.length > 0 && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-center">
                <div>
                  <div className={`font-bold text-gray-900 ${responsiveConfig.fontSize.title}`}>
                    {formatCurrency(total)}
                  </div>
                  <div className={`text-gray-600 ${responsiveConfig.fontSize.labels}`}>Total</div>
                </div>
                <div>
                  <div className={`font-bold text-gray-900 ${responsiveConfig.fontSize.title}`}>
                    {chartData.length}
                  </div>
                  <div className={`text-gray-600 ${responsiveConfig.fontSize.labels}`}>Segments</div>
                </div>
                <div>
                                  <div className={`font-bold text-gray-900 ${responsiveConfig.fontSize.title}`}>
                  {formatCurrency(Math.max(...(chartData as any[]).map(item => item.value || 0)))}
                </div>
                  <div className={`text-gray-600 ${responsiveConfig.fontSize.labels}`}>Largest</div>
                </div>
              </div>
            )}

            {/* Interactive instructions */}
            {(enableDrillDown || enableZoom) && (
              <div className={`mt-4 text-gray-500 text-center ${responsiveConfig.fontSize.labels}`}>
                {enableDrillDown && (
                  <span className="mr-2 sm:mr-4">💡 Click segments to drill down</span>
                )}
                {enableZoom && (
                  <span className="mr-2 sm:mr-4">🔍 Use zoom controls to explore details</span>
                )}
                {enableKeyboardNavigation && (
                  <span className="ml-2 sm:ml-4">⌨️ Use arrow keys to navigate</span>
                )}
              </div>
            )}
          </div>

          {/* Drill-down details panel */}
          {enableDrillDown && showDrillDownDetails && state.showDetails && state.selectedNode && (
            <div className="w-80">
              <DrillDownDetails
                node={state.selectedNode}
                onClose={() => setState(prev => ({ ...prev, showDetails: false }))}
                className="h-full"
                formatValue={formatCurrency}
                formatPercentage={formatPercentage}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default EnhancedPieChart;
