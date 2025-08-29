import React, { useMemo, useCallback, useRef } from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Area,
  AreaChart,
} from 'recharts';
import { LineChartProps, LineChartData } from '../../types/charts';
import { CHART_COLORS, CHART_STYLES, CHART_ANIMATIONS } from '../../config/chartConfig';
import { useChartResponsive } from '../../hooks/useChartResponsive';
import {
  formatCurrency,
  formatNumber,
  formatDate,
  getColorByIndex,
  createCustomTooltip,
  generateAriaLabel,
  generateAriaDescription,
  validateChartData,
  sanitizeChartData,
  sortDataByValue,
  aggregateDataByField,
} from '../../utils/chartUtils';

interface LineChartState {
  activeIndex: number | null;
  hoveredPoint: string | null;
  zoomStart: number | null;
  zoomEnd: number | null;
}

const LineChart: React.FC<LineChartProps> = ({
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

  showArea = false,
  showPoints = true,
  showGrid = true,
  showAxis = true,
  smooth = false,
  xAxisDataKey = 'name',
  yAxisDataKey = 'value',
  xAxisLabel,
  yAxisLabel,
  xAxisTickFormatter,
  yAxisTickFormatter,
  animate = true,
  animationDuration = 300,
  connectNulls = true,
  valueDomain: propValueDomain,
  referenceLines = [],
  referenceAreas = [],
  onDataPointClick,
  onChartClick,
  ariaLabel,
  ariaDescription,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Responsive configuration
  const responsiveConfig = useChartResponsive({
    chartType: 'line',
    showTooltip: true,
    showGrid,
    enableInteractions: false,
    customHeight: typeof height === 'number' ? height : undefined,
    customWidth: width
  });
  
  const [state, setState] = React.useState<LineChartState>({
    activeIndex: null,
    hoveredPoint: null,
    zoomStart: null,
    zoomEnd: null,
  });

  // Validate and sanitize data
  const validData = useMemo(() => {
    if (!validateChartData(data)) {
      return [];
    }
    return sanitizeChartData(data);
  }, [data]);

  // Process data with colors and formatting
  const processedData = useMemo(() => {
    return validData.map((item, index) => ({
      ...item,
      fill: item.color || getColorByIndex(index),
      stroke: item.color || getColorByIndex(index),
      strokeWidth: 2,
      fillOpacity: showArea ? 0.3 : 0,
    }));
  }, [validData, showArea]);

  // Sort data by x-axis value for proper line connections
  const sortedData = useMemo(() => {
    if (processedData.length === 0) return [];
    
    // Try to sort by date first, then by numeric value
    return processedData.sort((a, b) => {
      const aValue = (a as any)[xAxisDataKey];
      const bValue = (b as any)[xAxisDataKey];
      
      // If values are dates, sort by date
      if (aValue instanceof Date && bValue instanceof Date) {
        return aValue.getTime() - bValue.getTime();
      }
      
      // If values are date strings, convert and sort
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const aDate = new Date(aValue);
        const bDate = new Date(bValue);
        if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
          return aDate.getTime() - bDate.getTime();
        }
      }
      
      // Otherwise sort numerically
      return (aValue || 0) - (bValue || 0);
    });
  }, [processedData, xAxisDataKey]);

  // Calculate domain for better axis scaling
  const calculatedValueDomain = useMemo(() => {
    if (sortedData.length === 0) return [0, 100];
    
    const values = sortedData.map(item => (item as any)[yAxisDataKey] || 0).filter(v => v !== null && v !== undefined);
    if (values.length === 0) return [0, 100];
    
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    
    // Add some padding to the domain
    const padding = (maxValue - minValue) * 0.1;
    return [Math.max(0, minValue - padding), maxValue + padding];
  }, [sortedData, yAxisDataKey]);

  // Use prop value domain if provided, otherwise use calculated
  const valueDomain = propValueDomain || calculatedValueDomain;

  // Handle mouse enter for active state
  const handleMouseEnter = useCallback((data: any, event: any) => {
    const index = sortedData.findIndex(item => (item as any)[xAxisDataKey] === data[xAxisDataKey]);
    setState(prev => ({ 
      ...prev, 
      activeIndex: index,
      hoveredPoint: data[xAxisDataKey] || data.name 
    }));
  }, [xAxisDataKey, sortedData]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      activeIndex: null,
      hoveredPoint: null 
    }));
  }, []);

  // Handle click on data point
  const handleClick = useCallback((data: any, event: any) => {
    if (onDataPointClick) {
      const index = sortedData.findIndex(item => (item as any)[xAxisDataKey] === data[xAxisDataKey]);
      onDataPointClick(sortedData[index]);
    }
  }, [onDataPointClick, sortedData, xAxisDataKey]);



  // Custom tooltip component
  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const value = data.value;
      const name = data.name;
      
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="font-medium text-gray-900 dark:text-white">
            {`${name}: ${formatCurrency(value)}`}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {`${xAxisLabel || 'Date'}: ${formatDate(label)}`}
          </p>
        </div>
      );
    }
    return null;
  }, [xAxisLabel]);

  // Custom active dot component
  const CustomActiveDot = useCallback((props: any) => {
    const { cx, cy, r, fill, stroke, strokeWidth } = props;
    
    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={r + 2}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth + 1}
          opacity={0.8}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={fill}
          stroke={theme === 'dark' ? '#1F2937' : '#FFFFFF'}
          strokeWidth={2}
        />
      </g>
    );
  }, [theme]);

  // Generate ARIA attributes
  const ariaLabelText = useMemo(() => {
    return ariaLabel || generateAriaLabel('line chart', title || 'trend analysis');
  }, [ariaLabel, title]);

  const ariaDescriptionText = useMemo(() => {
    return ariaDescription || generateAriaDescription('line chart', processedData.length);
  }, [ariaDescription, processedData.length]);

  // Determine if x-axis should be treated as date
  const isDateAxis = useMemo(() => {
    if (sortedData.length === 0) return false;
    const firstValue = (sortedData[0] as any)[xAxisDataKey];
    return firstValue instanceof Date || 
           (typeof firstValue === 'string' && !isNaN(new Date(firstValue).getTime()));
  }, [sortedData, xAxisDataKey]);

  // Date tick formatter
  const dateTickFormatter = useCallback((value: any) => {
    if (isDateAxis) {
      const date = new Date(value);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return value;
  }, [isDateAxis]);

  // Loading state
  if (loading) {
    return (
      <div
        ref={chartRef}
        className={`bg-white rounded-lg shadow p-4 ${className}`}
        style={{ width, height }}
        role="status"
        aria-label="Loading line chart"
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
        aria-label="Line chart error"
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
  if (sortedData.length === 0) {
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
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
      aria-describedby={`line-chart-description-${title?.toLowerCase().replace(/\s+/g, '-')}`}
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
        {/* Title */}
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
        )}
        
        {/* Subtitle */}
        {subtitle && (
          <p className="text-sm text-gray-600 mb-4">{subtitle}</p>
        )}

        {/* Hidden description for screen readers */}
        <div
          id={`line-chart-description-${title?.toLowerCase().replace(/\s+/g, '-')}`}
          className="sr-only"
        >
          {ariaDescriptionText}
        </div>

        {/* Chart Container */}
        <div className="relative" style={{ height: height - 80 }}>
          <ResponsiveContainer width="100%" height="100%">
            {showArea ? (
              <AreaChart
                data={sortedData}
                margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
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
                    type={isDateAxis ? 'number' : 'category'}
                    axisLine={true}
                    tickLine={true}
                    tick={{ fontSize: CHART_STYLES.axis.fontSize, fill: CHART_STYLES.axis.fill }}
                    tickFormatter={xAxisTickFormatter || dateTickFormatter}
                    label={xAxisLabel ? { value: xAxisLabel, position: 'bottom', offset: 0 } : undefined}
                    domain={isDateAxis ? ['dataMin', 'dataMax'] : undefined}
                    scale={isDateAxis ? 'time' : undefined}
                  />
                )}

                {/* Y Axis */}
                {showAxis && (
                  <YAxis
                    type="number"
                    axisLine={true}
                    tickLine={true}
                    tick={{ fontSize: CHART_STYLES.axis.fontSize, fill: CHART_STYLES.axis.fill }}
                    tickFormatter={yAxisTickFormatter}
                    label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
                    domain={valueDomain}
                  />
                )}

                {/* Tooltip */}
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: CHART_COLORS.primary, strokeWidth: 1, strokeDasharray: '3 3' }}
                  wrapperStyle={CHART_STYLES.tooltip}
                />

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

                {/* Reference Lines */}
                {referenceLines.map((line, index) => (
                  <ReferenceLine
                    key={`ref-line-${index}`}
                    y={line.value}
                    stroke={line.color || CHART_COLORS.secondary}
                    strokeDasharray={line.dashed ? "3 3" : "solid"}
                    label={line.label}
                  />
                ))}

                {/* Reference Areas */}
                {referenceAreas.map((area, index) => (
                  <ReferenceArea
                    key={`ref-area-${index}`}
                    y1={area.y1}
                    y2={area.y2}
                    fill={area.fill || CHART_COLORS.secondary}
                    fillOpacity={0.1}
                    label={area.label}
                  />
                ))}

                {/* Area */}
                <Area
                  type={smooth ? "monotone" : "linear"}
                  dataKey={yAxisDataKey}
                  stroke={CHART_COLORS.primary}
                  fill={CHART_COLORS.primary}
                  fillOpacity={0.3}
                  connectNulls={connectNulls}
                  activeDot={showPoints ? <CustomActiveDot /> : false}
                  dot={showPoints ? { r: 3, fill: CHART_COLORS.primary } : false}
                  onClick={undefined}
                  animationDuration={animate ? animationDuration : 0}
                  animationBegin={0}
                />
              </AreaChart>
            ) : (
              <RechartsLineChart
                data={sortedData}
                margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
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
                    type={isDateAxis ? 'number' : 'category'}
                    axisLine={true}
                    tickLine={true}
                    tick={{ fontSize: CHART_STYLES.axis.fontSize, fill: CHART_STYLES.axis.fill }}
                    tickFormatter={xAxisTickFormatter || dateTickFormatter}
                    label={xAxisLabel ? { value: xAxisLabel, position: 'bottom', offset: 0 } : undefined}
                    domain={isDateAxis ? ['dataMin', 'dataMax'] : undefined}
                    scale={isDateAxis ? 'time' : undefined}
                  />
                )}

                {/* Y Axis */}
                {showAxis && (
                  <YAxis
                    type="number"
                    axisLine={true}
                    tickLine={true}
                    tick={{ fontSize: CHART_STYLES.axis.fontSize, fill: CHART_STYLES.axis.fill }}
                    tickFormatter={yAxisTickFormatter}
                    label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
                    domain={valueDomain}
                  />
                )}

                {/* Tooltip */}
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: CHART_COLORS.primary, strokeWidth: 1, strokeDasharray: '3 3' }}
                  wrapperStyle={CHART_STYLES.tooltip}
                />

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

                {/* Reference Lines */}
                {referenceLines.map((line, index) => (
                  <ReferenceLine
                    key={`ref-line-${index}`}
                    y={line.value}
                    stroke={line.color || CHART_COLORS.secondary}
                    strokeDasharray={line.dashed ? "3 3" : "solid"}
                    label={line.label}
                  />
                ))}

                {/* Reference Areas */}
                {referenceAreas.map((area, index) => (
                  <ReferenceArea
                    key={`ref-area-${index}`}
                    y1={area.y1}
                    y2={area.y2}
                    fill={area.fill || CHART_COLORS.secondary}
                    fillOpacity={0.1}
                    label={area.label}
                  />
                ))}

                {/* Line */}
                <Line
                  type={smooth ? "monotone" : "linear"}
                  dataKey={yAxisDataKey}
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2}
                  connectNulls={connectNulls}
                  activeDot={showPoints ? <CustomActiveDot /> : false}
                  dot={showPoints ? { r: 3, fill: CHART_COLORS.primary } : false}
                  onClick={undefined}
                  animationDuration={animate ? animationDuration : 0}
                  animationBegin={0}
                />
              </RechartsLineChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Summary information */}
        {sortedData.length > 0 && (
          <div className="mt-4 grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency(sortedData.reduce((sum, item) => sum + ((item as any)[yAxisDataKey] || 0), 0))}
              </div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency(sortedData.reduce((sum, item) => sum + ((item as any)[yAxisDataKey] || 0), 0) / sortedData.length)}
              </div>
              <div className="text-xs text-gray-600">Average</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency(Math.max(...sortedData.map(item => (item as any)[yAxisDataKey] || 0)))}
              </div>
              <div className="text-xs text-gray-600">Peak</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {sortedData.length}
              </div>
              <div className="text-xs text-gray-600">Points</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LineChart;
