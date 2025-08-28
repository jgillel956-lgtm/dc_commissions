import React, { useMemo, useCallback, useRef } from 'react';
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
  Label,
  Cell,
} from 'recharts';
import { WaterfallChartProps, WaterfallDataPoint } from '../../types/charts';
import { CHART_COLORS, CHART_STYLES, CHART_ANIMATIONS } from '../../config/chartConfig';
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

interface WaterfallChartState {
  activeIndex: number | null;
  hoveredBar: string | null;
}

interface ProcessedWaterfallData {
  name: string;
  value: number;
  start: number;
  end: number;
  isTotal: boolean;
  isSubtotal: boolean;
  color: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

const WaterfallChart: React.FC<WaterfallChartProps> = ({
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
  showGrid = true,
  showAxis = true,
  showLabels = true,
  showValues = true,
  showConnectors = true,
  barSize = 40,
  barGap = 8,
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
  positiveColor = CHART_COLORS.success,
  negativeColor = CHART_COLORS.danger,
  totalColor = CHART_COLORS.primary,
  subtotalColor = CHART_COLORS.secondary,
  connectorColor = CHART_COLORS.light,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [state, setState] = React.useState<WaterfallChartState>({
    activeIndex: null,
    hoveredBar: null,
  });

  // Validate and sanitize data
  const validData = useMemo(() => {
    if (!validateChartData(data)) {
      return [];
    }
    return sanitizeChartData(data);
  }, [data]);

  // Process data for waterfall chart
  const processedData = useMemo(() => {
    if (validData.length === 0) return [];

    const processed: ProcessedWaterfallData[] = [];
    let runningTotal = 0;

    validData.forEach((item, index) => {
      const value = item.value || 0;
      const isTotal = item.isTotal || false;
      const isSubtotal = item.isSubtotal || false;
      
      let start = 0;
      let end = 0;
      let color = '';
      let opacity = 1;

      if (isTotal) {
        // Total bar starts from 0 and goes to the final value
        start = 0;
        end = value;
        color = totalColor;
        opacity = 0.8;
      } else if (isSubtotal) {
        // Subtotal bar starts from 0 and goes to the subtotal value
        start = 0;
        end = value;
        color = subtotalColor;
        opacity = 0.7;
      } else {
        // Regular bar starts from running total and goes to running total + value
        start = runningTotal;
        end = runningTotal + value;
        color = value >= 0 ? positiveColor : negativeColor;
        opacity = 1;
        runningTotal = end;
      }

      processed.push({
        name: item.name,
        value: value,
        start: start,
        end: end,
        isTotal: isTotal,
        isSubtotal: isSubtotal,
        color: color,
        fill: color,
        stroke: theme === 'dark' ? '#1F2937' : '#FFFFFF',
        strokeWidth: 1,
        opacity: opacity,
      });
    });

    return processed;
  }, [validData, theme, positiveColor, negativeColor, totalColor, subtotalColor]);

  // Calculate domain for better axis scaling
  const valueDomain = useMemo(() => {
    if (processedData.length === 0) return [0, 100];
    
    const values = processedData.map(item => [item.start, item.end]).flat();
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    
    // Add some padding to the domain
    const padding = (maxValue - minValue) * 0.1;
    return [minValue - padding, maxValue + padding];
  }, [processedData]);

  // Handle mouse enter for active state
  const handleMouseEnter = useCallback((data: any, index: number) => {
    setState(prev => ({ 
      ...prev, 
      activeIndex: index,
      hoveredBar: data[xAxisDataKey] || data.name 
    }));
  }, [xAxisDataKey]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      activeIndex: null,
      hoveredBar: null 
    }));
  }, []);

  // Handle click on bar
  const handleClick = useCallback((data: any, index: number) => {
    if (onDataPointClick) {
      onDataPointClick(processedData[index]);
    }
  }, [onDataPointClick, processedData]);

  // Custom tooltip component
  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const value = data.value;
      const name = data.name;
      const dataPoint = processedData.find(item => item.name === name);
      
      if (!dataPoint) {
        return (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
            <p className="font-medium text-gray-900 dark:text-white">
              {`${name}: ${formatCurrency(value)}`}
            </p>
          </div>
        );
      }

      const change = dataPoint.value;
      const percentage = dataPoint.start > 0 ? (change / dataPoint.start) * 100 : 0;
      
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="font-medium text-gray-900 dark:text-white">
            {`${name}: ${formatCurrency(value)}`}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {`Change: ${formatCurrency(change)}`}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {`Percentage: ${formatPercentage(percentage, 1)}`}
          </p>
        </div>
      );
    }
    return null;
  }, [processedData]);

  // Custom bar component for waterfall chart
  const CustomBar = useCallback((props: any) => {
    const { x, y, width, height, fill, index } = props;
    const isActive = state.activeIndex === index;
    const dataPoint = processedData[index];
    
    if (!dataPoint) return null;

    const barHeight = Math.abs(height);
    const barY = height >= 0 ? y : y + height;
    
    return (
      <g>
        {/* Main bar */}
        <rect
          x={x}
          y={barY}
          width={width}
          height={barHeight}
          fill={dataPoint.fill}
          stroke={dataPoint.stroke}
          strokeWidth={isActive ? 2 : dataPoint.strokeWidth}
          opacity={isActive ? 0.8 : dataPoint.opacity}
          rx={2}
          ry={2}
          style={{
            transition: 'all 0.2s ease-in-out',
            cursor: 'pointer',
          }}
        />
        
        {/* Value label */}
        {showValues && (
          <text
            x={x + width / 2}
            y={height >= 0 ? barY - 5 : barY + barHeight + 15}
            textAnchor="middle"
            fontSize="12"
            fill={CHART_STYLES.axis.fill}
            fontWeight="500"
          >
            {formatCurrency(dataPoint.value)}
          </text>
        )}
      </g>
    );
  }, [state.activeIndex, processedData, showValues]);

  // Custom connector component
  const CustomConnector = useCallback(() => {
    if (!showConnectors || processedData.length < 2) return null;

    const connectors = [];
    
    for (let i = 0; i < processedData.length - 1; i++) {
      const current = processedData[i];
      const next = processedData[i + 1];
      
      if (current.isTotal || current.isSubtotal || next.isTotal || next.isSubtotal) {
        continue; // Skip connectors for totals and subtotals
      }

      const x1 = (i + 0.5) * (barSize + barGap) + barSize / 2;
      const x2 = (i + 1.5) * (barSize + barGap) + barSize / 2;
      const y = current.end;

      connectors.push(
        <line
          key={`connector-${i}`}
          x1={x1}
          y1={y}
          x2={x2}
          y2={y}
          stroke={connectorColor}
          strokeWidth={1}
          strokeDasharray="2,2"
        />
      );
    }

    return <g>{connectors}</g>;
  }, [processedData, showConnectors, barSize, barGap, connectorColor]);

  // Generate ARIA attributes
  const ariaLabelText = useMemo(() => {
    return ariaLabel || generateAriaLabel('waterfall chart', title || 'financial breakdown');
  }, [ariaLabel, title]);

  const ariaDescriptionText = useMemo(() => {
    return ariaDescription || generateAriaDescription('waterfall chart', processedData.length);
  }, [ariaDescription, processedData.length]);

  // Loading state
  if (loading) {
    return (
      <div
        ref={chartRef}
        className={`bg-white rounded-lg shadow p-4 ${className}`}
        style={{ width, height }}
        role="status"
        aria-label="Loading waterfall chart"
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
        aria-label="Waterfall chart error"
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
      aria-describedby={`waterfall-chart-description-${title?.toLowerCase().replace(/\s+/g, '-')}`}
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
          id={`waterfall-chart-description-${title?.toLowerCase().replace(/\s+/g, '-')}`}
          className="sr-only"
        >
          {ariaDescriptionText}
        </div>

        {/* Chart Container */}
        <div className="relative" style={{ height: height - 80 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart
              data={processedData}
              margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
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
                  type="category"
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
                cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
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

              {/* Zero reference line */}
              <ReferenceLine
                y={0}
                stroke="#666"
                strokeDasharray="3 3"
                strokeWidth={1}
              />

              {/* Custom connectors */}
              <CustomConnector />

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
                shape={<CustomBar />}
              >
                {processedData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill}
                    stroke={entry.stroke}
                    strokeWidth={entry.strokeWidth}
                  />
                ))}
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary information */}
        {processedData.length > 0 && (
          <div className="mt-4 grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency(processedData.reduce((sum, item) => sum + item.value, 0))}
              </div>
              <div className="text-xs text-gray-600">Net Change</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(processedData.filter(item => item.value > 0).reduce((sum, item) => sum + item.value, 0))}
              </div>
              <div className="text-xs text-gray-600">Positive</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-600">
                {formatCurrency(processedData.filter(item => item.value < 0).reduce((sum, item) => sum + item.value, 0))}
              </div>
              <div className="text-xs text-gray-600">Negative</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {processedData.length}
              </div>
              <div className="text-xs text-gray-600">Items</div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: positiveColor }}></div>
            <span>Positive</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: negativeColor }}></div>
            <span>Negative</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: totalColor }}></div>
            <span>Total</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: subtotalColor }}></div>
            <span>Subtotal</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaterfallChart;
