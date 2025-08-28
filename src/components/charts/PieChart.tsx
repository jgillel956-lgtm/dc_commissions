import React, { useMemo, useCallback, useRef, useState } from 'react';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PieChartProps, PieChartData } from '../../types/charts';
import { CHART_ANIMATIONS } from '../../config/chartConfig';
import { useChartTheme } from '../../hooks/useChartTheme';
import { useChartAccessibility } from '../../hooks/useChartAccessibility';
import { useChartResponsive } from '../../hooks/useChartResponsive';
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

interface PieChartState {
  activeIndex: number | null;
  hoveredIndex: number | null;
  zoomLevel: number;
  drillDownPath: string[];
  selectedSegment: string | null;
}

interface DrillDownData {
  name: string;
  value: number;
  children?: DrillDownData[];
  parent?: string;
}

const PieChart: React.FC<PieChartProps> = ({
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
  // Accessibility props
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
  
  const [state, setState] = useState<PieChartState>({
    activeIndex: null,
    hoveredIndex: null,
    zoomLevel: 1,
    drillDownPath: [],
    selectedSegment: null,
  });

  // Validate and sanitize data
  const validData = useMemo(() => {
    if (!validateChartData(data)) {
      return [];
    }
    return sanitizeChartData(data);
  }, [data]);

  // Process data for drill-down functionality
  const processedData = useMemo(() => {
    if (!enableDrillDown || !drillDownData) {
      return validData;
    }

    // If we have a drill-down path, show the appropriate level of data
    if (state.drillDownPath.length > 0) {
      const drillDownItem = findDrillDownData(drillDownData, state.drillDownPath);
      return drillDownItem?.children || validData;
    }

    return validData;
  }, [validData, enableDrillDown, drillDownData, state.drillDownPath]);

  // Calculate colors for segments
  const colors = useMemo(() => {
    return processedData.map((_, index) => getColorByIndex(index));
  }, [processedData, getColorByIndex]);

  // Calculate total for percentages
  const total = useMemo(() => {
    return (processedData as any[]).reduce((sum, item) => sum + (item.value || 0), 0);
  }, [processedData]);

  // Apply zoom transformation
  const zoomTransform = useMemo(() => {
    if (!responsiveConfig.interactive.enableZoom || state.zoomLevel <= 1) {
      return { scale: 1, translateX: 0, translateY: 0 };
    }

    const scale = Math.min(state.zoomLevel, maxZoomLevel);
    const translateX = state.selectedSegment ? 0 : 0;
    const translateY = state.selectedSegment ? 0 : 0;

    return { scale, translateX, translateY };
  }, [responsiveConfig.interactive.enableZoom, state.zoomLevel, maxZoomLevel, state.selectedSegment]);

  // Accessibility hook
  const accessibility = useChartAccessibility({
    chartType: 'pieChart',
    data: processedData,
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
      
      // Handle drill-down
      if (responsiveConfig.interactive.enableDrillDown && drillDownData) {
        const segmentName = dataPoint.name;
        const drillDownItem = findDrillDownData(drillDownData, [...state.drillDownPath, segmentName]);
        
        if (drillDownItem && drillDownItem.children && drillDownItem.children.length > 0) {
          const newDrillDownPath = [...state.drillDownPath, segmentName];
          setState(prev => ({
            ...prev,
            drillDownPath: newDrillDownPath,
            selectedSegment: segmentName,
          }));
          
          if (onDrillDown) {
            onDrillDown(segmentName, newDrillDownPath, drillDownItem.children);
          }
        }
      }
    },
    onDataPointFocus: (index, dataPoint) => {
      setState(prev => ({ 
        ...prev, 
        hoveredIndex: index,
        activeIndex: index 
      }));
      
      // Announce data point information
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
      onDataPointClick(processedData[index]);
    }

    // Handle drill-down
    if (enableDrillDown && drillDownData) {
      const segmentName = processedData[index].name;
      const drillDownItem = findDrillDownData(drillDownData, [...state.drillDownPath, segmentName]);
      
      if (drillDownItem && drillDownItem.children && drillDownItem.children.length > 0) {
        const newDrillDownPath = [...state.drillDownPath, segmentName];
        setState(prev => ({
          ...prev,
          drillDownPath: newDrillDownPath,
          selectedSegment: segmentName,
        }));
        
        if (onDrillDown) {
          onDrillDown(segmentName, newDrillDownPath, drillDownItem.children);
        }
      }
    }
  }, [onDataPointClick, processedData, enableDrillDown, drillDownData, state.drillDownPath, onDrillDown]);

  // Handle drill-up
  const handleDrillUp = useCallback(() => {
    if (state.drillDownPath.length > 0) {
      const newDrillDownPath = state.drillDownPath.slice(0, -1);
      const parentSegment = newDrillDownPath.length > 0 ? newDrillDownPath[newDrillDownPath.length - 1] : null;
      
      setState(prev => ({
        ...prev,
        drillDownPath: newDrillDownPath,
        selectedSegment: parentSegment,
      }));

      if (onDrillUp) {
        onDrillUp(newDrillDownPath, parentSegment);
      }
    }
  }, [state.drillDownPath, onDrillUp]);

  // Handle zoom in
  const handleZoomIn = useCallback(() => {
    if (enableZoom && state.zoomLevel < maxZoomLevel) {
      const newZoomLevel = Math.min(state.zoomLevel + zoomStep, maxZoomLevel);
      setState(prev => ({ ...prev, zoomLevel: newZoomLevel }));
      
      if (onZoomChange) {
        onZoomChange(newZoomLevel);
      }
    }
  }, [enableZoom, state.zoomLevel, maxZoomLevel, zoomStep, onZoomChange]);

  // Handle zoom out
  const handleZoomOut = useCallback(() => {
    if (enableZoom && state.zoomLevel > 1) {
      const newZoomLevel = Math.max(state.zoomLevel - zoomStep, 1);
      setState(prev => ({ ...prev, zoomLevel: newZoomLevel }));
      
      if (onZoomChange) {
        onZoomChange(newZoomLevel);
      }
    }
  }, [enableZoom, state.zoomLevel, zoomStep, onZoomChange]);

  // Handle reset zoom
  const handleResetZoom = useCallback(() => {
    if (enableZoom) {
      setState(prev => ({ 
        ...prev, 
        zoomLevel: 1,
        selectedSegment: null 
      }));
      
      if (onZoomChange) {
        onZoomChange(1);
      }
    }
  }, [enableZoom, onZoomChange]);

  // Custom tooltip formatter
  const tooltipFormatter = useCallback((value: number, name: string): [string, string] => {
    if (customTooltipFormatter) {
      return customTooltipFormatter(value, name);
    }

    const percentage = total > 0 ? (value / total) * 100 : 0;
    return [
      `${name}: ${formatCurrency(value)}`,
      `Percentage: ${formatPercentage(percentage, 1)}`,
    ];
  }, [total, customTooltipFormatter]);

  // Custom tooltip component
  const CustomTooltip = useCallback(({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const value = data.value;
      const name = data.name;
      const percentage = total > 0 ? (value / total) * 100 : 0;
      
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="font-medium text-gray-900 dark:text-white">
            {`${name}: ${formatCurrency(value)}`}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {`Percentage: ${formatPercentage(percentage, 1)}`}
          </p>
        </div>
      );
    }
    return null;
  }, [total]);

  // Generate ARIA attributes
  const ariaLabelText = useMemo(() => {
    return ariaLabel || generateDetailedAriaLabel('pie chart', title || 'data breakdown', processedData.length, total);
  }, [ariaLabel, title, processedData.length, total]);

  const ariaDescriptionText = useMemo(() => {
    return ariaDescription || generateScreenReaderSummary('pie chart', processedData, title);
  }, [ariaDescription, processedData, title]);

  // Helper function to find drill-down data
  const findDrillDownData = useCallback((data: DrillDownData[], path: string[]): DrillDownData | undefined => {
    if (path.length === 0) return undefined;
    
    let current = data.find(item => item.name === path[0]);
    if (!current) return undefined;
    
    for (let i = 1; i < path.length; i++) {
      current = current.children?.find(item => item.name === path[i]) || undefined;
      if (!current) return undefined;
    }
    
    return current;
  }, []);

  // Loading state
  if (loading) {
    return (
      <div
        ref={chartRef}
        className={`bg-white rounded-lg shadow p-4 ${className}`}
        style={{ width, height }}
        role="status"
        aria-label="Loading pie chart"
      >
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="flex justify-center">
            <div className="w-32 h-32 bg-gray-200 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        ref={chartRef}
        className={`bg-white rounded-lg shadow p-4 ${className}`}
        style={{ width, height }}
        role="alert"
        aria-label="Pie chart error"
      >
        <div className="text-center text-red-600">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="font-medium">Error loading chart</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (processedData.length === 0) {
    return (
      <div
        ref={chartRef}
        className={`bg-white rounded-lg shadow p-4 ${className}`}
        style={{ width, height }}
        role="status"
        aria-label="No data available"
      >
        <div className="text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="font-medium">No data available</p>
          <p className="text-sm">There is no data to display in this chart.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Accessibility Announcer */}
      <AccessibilityAnnouncer message={null} />
      
      <div
        ref={chartRef}
        className={`bg-white rounded-lg shadow ${className}`}
        style={{ 
          width: responsiveConfig.width, 
          height: responsiveConfig.height 
        }}
        {...accessibility.getAriaProps()}
        {...accessibility.getKeyboardProps()}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              {title && (
                <h3 className={`font-semibold text-gray-900 mb-1 ${responsiveConfig.fontSize.title}`}>{title}</h3>
              )}
              {subtitle && (
                <p className={`text-gray-600 ${responsiveConfig.fontSize.subtitle}`}>{subtitle}</p>
              )}
            </div>

            {/* Interactive Controls */}
            <div className="flex items-center space-x-2">
              {/* Drill-down controls */}
              {enableDrillDown && state.drillDownPath.length > 0 && (
                <button
                  onClick={handleDrillUp}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                  title="Drill up"
                  aria-label="Drill up to previous level"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
              )}

              {/* Zoom controls */}
              {enableZoom && (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={handleZoomOut}
                    disabled={state.zoomLevel <= 1}
                    className="px-2 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Zoom out"
                    aria-label="Zoom out"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                    </svg>
                  </button>
                  <span className="text-sm text-gray-600 px-2">
                    {Math.round(state.zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    disabled={state.zoomLevel >= maxZoomLevel}
                    className="px-2 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Zoom in"
                    aria-label="Zoom in"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </button>
                  {state.zoomLevel > 1 && (
                    <button
                      onClick={handleResetZoom}
                      className="px-2 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                      title="Reset zoom"
                      aria-label="Reset zoom to 100%"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Breadcrumb for drill-down */}
          {responsiveConfig.interactive.enableDrillDown && state.drillDownPath.length > 0 && (
            <div className="mb-4 flex items-center space-x-2 text-sm text-gray-600">
              <span>Path:</span>
              {state.drillDownPath.map((segment, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <span>/</span>}
                  <button
                    onClick={() => {
                      const newPath = state.drillDownPath.slice(0, index + 1);
                      setState(prev => ({ ...prev, drillDownPath: newPath }));
                    }}
                    className="text-blue-600 hover:text-blue-800 underline"
                    aria-label={`Navigate to ${segment}`}
                  >
                    {segment}
                  </button>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Hidden description for screen readers */}
          <div
            id="chart-description"
            className="sr-only"
          >
            {ariaDescriptionText}
          </div>

          {/* Chart Container */}
          <div 
            className="relative"
            style={{ 
              height: responsiveConfig.height - 120,
              transform: `scale(${zoomTransform.scale})`,
              transformOrigin: 'center center',
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={processedData}
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
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  onClick={handleClick}
                  animationDuration={animate ? animationDuration : 0}
                  animationBegin={0}
                >
                  {processedData.map((entry, index) => (
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
          {processedData.length > 0 && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-center">
              <div>
                <div className={`font-bold text-gray-900 ${responsiveConfig.fontSize.title}`}>
                  {formatCurrency(total)}
                </div>
                <div className={`text-gray-600 ${responsiveConfig.fontSize.labels}`}>Total</div>
              </div>
              <div>
                <div className={`font-bold text-gray-900 ${responsiveConfig.fontSize.title}`}>
                  {processedData.length}
                </div>
                <div className={`text-gray-600 ${responsiveConfig.fontSize.labels}`}>Segments</div>
              </div>
              <div>
                <div className={`font-bold text-gray-900 ${responsiveConfig.fontSize.title}`}>
                  {formatCurrency(Math.max(...processedData.map(item => item.value || 0)))}
                </div>
                <div className={`text-gray-600 ${responsiveConfig.fontSize.labels}`}>Largest</div>
              </div>
            </div>
          )}

          {/* Interactive instructions */}
          {(responsiveConfig.interactive.enableDrillDown || responsiveConfig.interactive.enableZoom) && (
            <div className={`mt-4 text-gray-500 text-center ${responsiveConfig.fontSize.labels}`}>
              {responsiveConfig.interactive.enableDrillDown && (
                <span className="mr-2 sm:mr-4">💡 Click segments to drill down</span>
              )}
              {responsiveConfig.interactive.enableZoom && (
                <span className="mr-2 sm:mr-4">🔍 Use zoom controls to explore details</span>
              )}
              {enableKeyboardNavigation && (
                <span className="ml-2 sm:ml-4">⌨️ Use arrow keys to navigate</span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PieChart;
