import React, { useMemo, useCallback, useRef, useState } from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { BarChartProps, BarChartData } from '../../types/charts';
import { CHART_COLORS, CHART_STYLES, CHART_ANIMATIONS } from '../../config/chartConfig';
import { useChartResponsive } from '../../hooks/useChartResponsive';
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
  getColorByIndex,
  createCustomTooltip,
  generateAriaLabel,
  generateAriaDescription,
  validateChartData,
  sanitizeChartData,
} from '../../utils/chartUtils';

interface BarChartState {
  activeIndex: number | null;
  hoveredIndex: number | null;
  zoomLevel: number;
  drillDownPath: string[];
  selectedBar: string | null;
  zoomDomain: { x: [number, number]; y: [number, number] } | null;
}

interface DrillDownData {
  name: string;
  value: number;
  children?: DrillDownData[];
  parent?: string;
}

const BarChart: React.FC<BarChartProps> = ({
  data,
  title,
  subtitle,
  width = '100%',
  height = 400,
  className = '',
  theme = 'light',
  responsive = true,
  loading = false,
  error = null,
  orientation = 'vertical',
  stacked = false,
  grouped = false,
  showGrid = true,
  showAxis = true,
  showLabels = true,
  showValues = true,
  barSize = 40,
  barGap = 8,
  barCategoryGap = 16,
  xAxisDataKey = 'name',
  yAxisDataKey = 'value',
  xAxisLabel,
  yAxisLabel,
  xAxisTickFormatter,
  yAxisTickFormatter,
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
  enablePan = false,
  enableSelection = false,
  selectedBars = [],
  onBarSelect,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Responsive configuration
  const responsiveConfig = useChartResponsive({
    chartType: 'bar',
    orientation,
    showTooltip,
    showGrid,
    enableInteractions: enableDrillDown || enableZoom || enablePan || enableSelection,
    customHeight: typeof height === 'number' ? height : undefined,
    customWidth: width
  });
  
  const [state, setState] = useState<BarChartState>({
    activeIndex: null,
    hoveredIndex: null,
    zoomLevel: 1,
    drillDownPath: [],
    selectedBar: null,
    zoomDomain: null,
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

  // Calculate colors for bars
  const colors = useMemo(() => {
    return processedData.map((_, index) => getColorByIndex(index));
  }, [processedData]);

  // Apply zoom transformation
  const zoomTransform = useMemo(() => {
    if (!enableZoom || state.zoomLevel <= 1) {
      return { scale: 1, translateX: 0, translateY: 0 };
    }

    const scale = Math.min(state.zoomLevel, maxZoomLevel);
    return { scale, translateX: 0, translateY: 0 };
  }, [enableZoom, state.zoomLevel, maxZoomLevel]);

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

  // Handle click on bar
  const handleClick = useCallback((data: any, index: number) => {
    if (onDataPointClick) {
      onDataPointClick(processedData[index]);
    }

    // Handle drill-down
    if (enableDrillDown && drillDownData) {
      const barName = (processedData[index] as any)[xAxisDataKey] || processedData[index].name;
      const drillDownItem = findDrillDownData(drillDownData, [...state.drillDownPath, barName]);
      
      if (drillDownItem && drillDownItem.children && drillDownItem.children.length > 0) {
        const newDrillDownPath = [...state.drillDownPath, barName];
        setState(prev => ({
          ...prev,
          drillDownPath: newDrillDownPath,
          selectedBar: barName,
        }));
        
        if (onDrillDown) {
          onDrillDown(barName, newDrillDownPath, drillDownItem.children);
        }
      }
    }

    // Handle bar selection
    if (enableSelection && onBarSelect) {
      const barName = (processedData[index] as any)[xAxisDataKey] || processedData[index].name;
      onBarSelect(barName, !selectedBars.includes(barName));
    }
  }, [onDataPointClick, processedData, enableDrillDown, drillDownData, state.drillDownPath, onDrillDown, xAxisDataKey, enableSelection, onBarSelect, selectedBars]);

  // Handle drill-up
  const handleDrillUp = useCallback(() => {
    if (state.drillDownPath.length > 0) {
      const newDrillDownPath = state.drillDownPath.slice(0, -1);
      const parentBar = newDrillDownPath.length > 0 ? newDrillDownPath[newDrillDownPath.length - 1] : null;
      
      setState(prev => ({
        ...prev,
        drillDownPath: newDrillDownPath,
        selectedBar: parentBar,
      }));

      if (onDrillUp) {
        onDrillUp(newDrillDownPath, parentBar);
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
        selectedBar: null,
        zoomDomain: null 
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

    return [
      `${name}: ${formatCurrency(value)}`,
      `Value: ${formatNumber(value)}`,
    ];
  }, [customTooltipFormatter]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {tooltipFormatter(entry.value, entry.name)[1]}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Generate ARIA attributes
  const ariaLabelText = useMemo(() => {
    return ariaLabel || generateAriaLabel('bar chart', title || 'data comparison');
  }, [ariaLabel, title]);

  const ariaDescriptionText = useMemo(() => {
    return ariaDescription || generateAriaDescription('bar chart', processedData.length);
  }, [ariaDescription, processedData.length]);

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
        aria-label="Loading bar chart"
      >
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
              </div>
            ))}
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
        aria-label="Bar chart error"
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
    <div
      ref={chartRef}
      className={`bg-white rounded-lg shadow ${className}`}
      style={{ width, height }}
      role="img"
      aria-label={ariaLabelText}
      aria-describedby={`bar-chart-description-${title?.toLowerCase().replace(/\s+/g, '-')}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (onChartClick) {
            onChartClick();
          }
        }
      }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-600">{subtitle}</p>
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
        {enableDrillDown && state.drillDownPath.length > 0 && (
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
                >
                  {segment}
                </button>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Hidden description for screen readers */}
        <div
          id={`bar-chart-description-${title?.toLowerCase().replace(/\s+/g, '-')}`}
          className="sr-only"
        >
          {ariaDescriptionText}
        </div>

        {/* Chart Container */}
        <div 
          className="relative"
          style={{ 
            height: height - 120,
            transform: `scale(${zoomTransform.scale})`,
            transformOrigin: 'center center',
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart
              data={processedData}
              margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
              layout={orientation}
            >
              {/* Grid */}
              {showGrid && (
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={CHART_STYLES.grid.stroke}
                  strokeWidth={CHART_STYLES.grid.strokeWidth}
                  opacity={0.3}
                />
              )}

              {/* X Axis */}
              {showAxis && (
                <XAxis
                  dataKey={xAxisDataKey}
                  type={orientation === 'horizontal' ? 'number' : 'category'}
                  axisLine={true}
                  tickLine={true}
                  tick={{ fontSize: CHART_STYLES.axis.fontSize, fill: CHART_STYLES.axis.fill }}
                  tickFormatter={xAxisTickFormatter}
                  label={xAxisLabel ? { value: xAxisLabel, position: 'bottom', offset: 0 } : undefined}
                  angle={processedData.length > 8 ? -45 : 0}
                  textAnchor={processedData.length > 8 ? 'end' : 'middle'}
                  height={processedData.length > 8 ? 80 : 60}
                />
              )}

              {/* Y Axis */}
              {showAxis && (
                <YAxis
                  type={orientation === 'horizontal' ? 'category' : 'number'}
                  axisLine={true}
                  tickLine={true}
                  tick={{ fontSize: CHART_STYLES.axis.fontSize, fill: CHART_STYLES.axis.fill }}
                  tickFormatter={yAxisTickFormatter}
                  label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
                />
              )}

              {/* Tooltip */}
              {showTooltip && (
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
                  wrapperStyle={CHART_STYLES.tooltip}
                />
              )}

              {/* Legend */}
              <Legend
                wrapperStyle={{
                  fontSize: CHART_STYLES.legend.fontSize,
                  fontWeight: CHART_STYLES.legend.fontWeight,
                  color: CHART_STYLES.legend.fill,
                }}
                formatter={(value, entry) => [
                  value,
                  <span style={{ color: entry.color }}>{value}</span>
                ]}
              />

              {/* Bars */}
              <Bar
                dataKey={yAxisDataKey}
                fill={CHART_COLORS.primary}
                barSize={barSize}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
                animationDuration={animate ? animationDuration : 0}
                animationBegin={0}
              >
                {processedData.map((entry, index) => {
                  const barName = (entry as any)[xAxisDataKey] || entry.name;
                  const isSelected = selectedBars.includes(barName);
                  const isHovered = state.hoveredIndex === index;
                  
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={(entry as any).fill || colors[index]}
                      stroke={theme === 'dark' ? '#1F2937' : '#FFFFFF'}
                      strokeWidth={isHovered ? 2 : 1}
                      opacity={isSelected ? 0.7 : isHovered ? 0.8 : 1}
                      style={{
                        cursor: enableDrillDown || enableSelection ? 'pointer' : 'default',
                        transition: 'all 0.2s ease-in-out',
                      }}
                    />
                  );
                })}
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary information */}
        {processedData.length > 0 && (
          <div className="mt-4 grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency((processedData as any[]).reduce((sum: number, item) => sum + (item.value || 0), 0))}
              </div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {processedData.length}
              </div>
              <div className="text-xs text-gray-600">Bars</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency(Math.max(...(processedData as any[]).map(item => item.value || 0)))}
              </div>
              <div className="text-xs text-gray-600">Highest</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency(Math.min(...(processedData as any[]).map(item => item.value || 0)))}
              </div>
              <div className="text-xs text-gray-600">Lowest</div>
            </div>
          </div>
        )}

        {/* Interactive instructions */}
        {(enableDrillDown || enableZoom || enableSelection) && (
          <div className="mt-4 text-xs text-gray-500 text-center">
            {enableDrillDown && (
              <span className="mr-4">💡 Click bars to drill down</span>
            )}
            {enableSelection && (
              <span className="mr-4">✅ Click bars to select</span>
            )}
            {enableZoom && (
              <span>🔍 Use zoom controls to explore details</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BarChart;
