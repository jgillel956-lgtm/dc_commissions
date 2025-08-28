// Basic chart data structures
export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
  [key: string]: any;
}

export interface TimeSeriesDataPoint {
  date: string | Date;
  value: number;
  [key: string]: any;
}

export interface MultiSeriesDataPoint {
  name: string;
  [key: string]: number | string;
}

export interface PieChartData extends ChartDataPoint {
  percentage?: number;
  fill?: string;
}

export interface BarChartData extends ChartDataPoint {
  category?: string;
  group?: string;
}

export interface LineChartData extends TimeSeriesDataPoint {
  series?: string;
}

export interface WaterfallDataPoint {
  name: string;
  value: number;
  type: 'start' | 'positive' | 'negative' | 'end';
  color?: string;
  isTotal?: boolean;
  isSubtotal?: boolean;
}

// Chart component props
export interface BaseChartProps {
  data: ChartDataPoint[];
  title?: string;
  subtitle?: string;
  width?: number | string;
  height?: number;
  className?: string;
  theme?: 'light' | 'dark';
  responsive?: boolean;
  loading?: boolean;
  error?: string | null;
  onDataPointClick?: (dataPoint: ChartDataPoint) => void;
  onChartClick?: () => void;
  ariaLabel?: string;
  ariaDescription?: string;
}

export interface PieChartProps extends BaseChartProps {
  data: PieChartData[];
  innerRadius?: number;
  outerRadius?: number;
  paddingAngle?: number;
  cornerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  minAngle?: number;
  maxAngle?: number;
  cx?: number | string;
  cy?: number | string;
  showLabels?: boolean;
  showPercentage?: boolean;
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  animate?: boolean;
  animationDuration?: number;
  // Interactive features
  drillDownData?: Array<{
    id: string;
    name: string;
    value: number;
    children?: Array<{
      id: string;
      name: string;
      value: number;
      children?: Array<{ id: string; name: string; value: number }>;
    }>;
    metadata?: Record<string, any>;
  }>;
  enableDrillDown?: boolean;
  enableZoom?: boolean;
  maxZoomLevel?: number;
  zoomStep?: number;
  showTooltip?: boolean;
  customTooltipFormatter?: (value: number, name: string) => [string, string];
  onDrillDown?: (segmentName: string, path: string[], children: any[]) => void;
  onDrillUp?: (path: string[], parentSegment: string | null) => void;
  onZoomChange?: (zoomLevel: number) => void;
  // Enhanced drill-down features
  showDrillDownBreadcrumbs?: boolean;
  showDrillDownDetails?: boolean;
  onNodeSelect?: (nodeId: string, node: any) => void;
  onDrillDownReset?: () => void;
  // Accessibility features
  enableKeyboardNavigation?: boolean;
  enableScreenReader?: boolean;
}

export interface BarChartProps extends BaseChartProps {
  data: BarChartData[];
  orientation?: 'horizontal' | 'vertical';
  stacked?: boolean;
  grouped?: boolean;
  showGrid?: boolean;
  showAxis?: boolean;
  showLabels?: boolean;
  showValues?: boolean;
  showLegend?: boolean;
  barSize?: number;
  barGap?: number;
  barCategoryGap?: number;
  xAxisDataKey?: string;
  yAxisDataKey?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  xAxisTickFormatter?: (value: any) => string;
  yAxisTickFormatter?: (value: any) => string;
  animate?: boolean;
  animationDuration?: number;
  // Interactive features
  drillDownData?: Array<{
    name: string;
    value: number;
    children?: Array<{
      name: string;
      value: number;
      children?: Array<{ name: string; value: number }>;
    }>;
  }>;
  enableDrillDown?: boolean;
  enableZoom?: boolean;
  maxZoomLevel?: number;
  zoomStep?: number;
  showTooltip?: boolean;
  customTooltipFormatter?: (value: number, name: string) => [string, string];
  onDrillDown?: (barName: string, path: string[], children: any[]) => void;
  onDrillUp?: (path: string[], parentBar: string | null) => void;
  onZoomChange?: (zoomLevel: number) => void;
  enablePan?: boolean;
  enableSelection?: boolean;
  selectedBars?: string[];
  onBarSelect?: (barName: string, selected: boolean) => void;
  // Accessibility features
  enableKeyboardNavigation?: boolean;
  enableScreenReader?: boolean;
}

export interface LineChartProps {
  data: LineChartData[];
  title?: string;
  subtitle?: string;
  width?: number | string;
  height?: number;
  className?: string;
  theme?: 'light' | 'dark';
  responsive?: boolean;
  loading?: boolean;
  error?: string | null;
  onDataPointClick?: (dataPoint: LineChartData) => void;
  onChartClick?: () => void;
  ariaLabel?: string;
  ariaDescription?: string;
  xAxisDataKey?: string;
  yAxisDataKey?: string;
  seriesDataKey?: string;
  showGrid?: boolean;
  showAxis?: boolean;
  showPoints?: boolean;
  showArea?: boolean;
  showLegend?: boolean;
  smooth?: boolean;
  strokeWidth?: number;
  pointSize?: number;
  xAxisLabel?: string;
  yAxisLabel?: string;
  xAxisTickFormatter?: (value: any) => string;
  yAxisTickFormatter?: (value: any) => string;
  animate?: boolean;
  animationDuration?: number;
  connectNulls?: boolean;
  valueDomain?: [number, number] | ['auto', 'auto'] | ['dataMin', 'dataMax'];
  referenceLines?: Array<{
    value: number;
    color?: string;
    dashed?: boolean;
    label?: string;
  }>;
  referenceAreas?: Array<{
    y1: number;
    y2: number;
    fill?: string;
    label?: string;
  }>;
  // Interactive features
  showTooltip?: boolean;
  enableZoom?: boolean;
  // Accessibility features
  enableKeyboardNavigation?: boolean;
  enableScreenReader?: boolean;
}

export interface AreaChartProps extends LineChartProps {
  fillOpacity?: number;
  gradient?: boolean;
  stackOffset?: 'none' | 'expand' | 'wiggle' | 'silhouette';
}

export interface WaterfallChartProps extends BaseChartProps {
  data: WaterfallDataPoint[];
  showGrid?: boolean;
  showAxis?: boolean;
  showLabels?: boolean;
  showValues?: boolean;
  showConnectors?: boolean;
  barSize?: number;
  barGap?: number;
  xAxisDataKey?: string;
  yAxisDataKey?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  xAxisTickFormatter?: (value: any) => string;
  yAxisTickFormatter?: (value: any) => string;
  connectorColor?: string;
  connectorWidth?: number;
  valueFormatter?: (value: number) => string;
  positiveColor?: string;
  negativeColor?: string;
  totalColor?: string;
  subtotalColor?: string;
  animate?: boolean;
  animationDuration?: number;
}

export interface ScatterChartProps {
  data: Array<{
    x: number;
    y: number;
    size?: number;
    color?: string;
    name?: string;
    value?: number;
  }>;
  title?: string;
  subtitle?: string;
  width?: number | string;
  height?: number;
  className?: string;
  theme?: 'light' | 'dark';
  responsive?: boolean;
  loading?: boolean;
  error?: string | null;
  onDataPointClick?: (dataPoint: any) => void;
  onChartClick?: () => void;
  ariaLabel?: string;
  ariaDescription?: string;
  xAxisDataKey?: string;
  yAxisDataKey?: string;
  sizeDataKey?: string;
  colorDataKey?: string;
  showGrid?: boolean;
  showAxis?: boolean;
  pointSize?: number;
  xAxisLabel?: string;
  yAxisLabel?: string;
  animate?: boolean;
  animationDuration?: number;
}

// Chart tooltip interfaces
export interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    color: string;
    dataKey: string;
    payload: any;
  }>;
  label?: string;
  formatter?: (value: any, name: string) => [string, string];
  labelFormatter?: (label: any) => string;
  separator?: string;
  wrapperStyle?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
  itemStyle?: React.CSSProperties;
  labelStyle?: React.CSSProperties;
}

// Chart legend interfaces
export interface ChartLegendProps {
  data: Array<{
    name: string;
    color: string;
    value?: number;
  }>;
  layout?: 'horizontal' | 'vertical';
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  iconType?: 'line' | 'plainline' | 'square' | 'rect' | 'circle' | 'cross' | 'diamond' | 'star' | 'triangle' | 'wye';
  iconSize?: number;
  wrapperStyle?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
  itemStyle?: React.CSSProperties;
  onClick?: (entry: any) => void;
  onMouseEnter?: (entry: any) => void;
  onMouseLeave?: (entry: any) => void;
}

// Chart axis interfaces
export interface ChartAxisProps {
  dataKey?: string;
  type?: 'number' | 'category';
  scale?: 'auto' | 'linear' | 'pow' | 'sqrt' | 'log' | 'identity' | 'time' | 'band' | 'point' | 'ordinal' | 'quantile' | 'quantize' | 'utc' | 'sequential' | 'threshold';
  domain?: [number, number] | ['auto', 'auto'] | ['dataMin', 'dataMax'];
  range?: [number, number];
  allowDataOverflow?: boolean;
  allowDecimals?: boolean;
  tickCount?: number;
  tickFormatter?: (value: any) => string;
  tickLine?: boolean;
  tickMargin?: number;
  axisLine?: boolean;
  axisLineColor?: string;
  axisLineWidth?: number;
  tick?: boolean | object;
  label?: string | object;
  minTickGap?: number;
  angle?: number;
  textAnchor?: 'start' | 'middle' | 'end';
  height?: number;
  width?: number;
  mirror?: boolean;
  reversed?: boolean;
  hide?: boolean;
}

// Chart grid interfaces
export interface ChartGridProps {
  horizontal?: boolean;
  vertical?: boolean;
  horizontalPoints?: number[];
  verticalPoints?: number[];
  strokeDasharray?: string;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  fillOpacity?: number;
}

// Chart animation interfaces
export interface ChartAnimationProps {
  duration?: number;
  easing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
  delay?: number;
  isAnimationActive?: boolean;
  animationBegin?: number;
  animationEnd?: number;
  animationDuration?: number;
  animationEasing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
  animationId?: number | string;
}

// Chart interaction interfaces
export interface ChartInteractionProps {
  onMouseEnter?: (data: any, index: number) => void;
  onMouseLeave?: (data: any, index: number) => void;
  onClick?: (data: any, index: number) => void;
  onMouseMove?: (data: any, index: number) => void;
  onMouseDown?: (data: any, index: number) => void;
  onMouseUp?: (data: any, index: number) => void;
  onTouchStart?: (data: any, index: number) => void;
  onTouchMove?: (data: any, index: number) => void;
  onTouchEnd?: (data: any, index: number) => void;
}

// Chart export interfaces
export interface ChartExportProps {
  enabled?: boolean;
  formats?: Array<'png' | 'svg' | 'pdf' | 'jpg'>;
  defaultFormat?: 'png' | 'svg' | 'pdf' | 'jpg';
  quality?: number;
  backgroundColor?: string;
  filename?: string;
  onExport?: (format: string, data: any) => void;
}

// Chart responsive interfaces
export interface ChartResponsiveProps {
  enabled?: boolean;
  breakpoints?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
    large?: number;
  };
  onResize?: (dimensions: { width: number; height: number }) => void;
}

// Chart accessibility interfaces
export interface ChartAccessibilityProps {
  ariaLabel?: string;
  ariaDescription?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  role?: string;
  tabIndex?: number;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  onFocus?: (event: React.FocusEvent) => void;
  onBlur?: (event: React.FocusEvent) => void;
}

// Chart performance interfaces
export interface ChartPerformanceProps {
  enableOptimization?: boolean;
  debounceUpdates?: boolean;
  debounceDelay?: number;
  memoizeData?: boolean;
  virtualizeData?: boolean;
  maxDataPoints?: number;
  onPerformanceWarning?: (warning: string) => void;
}

// Combined chart props interface
export interface ChartProps extends 
  BaseChartProps,
  ChartAnimationProps,
  ChartInteractionProps,
  ChartExportProps,
  ChartResponsiveProps,
  ChartAccessibilityProps,
  ChartPerformanceProps {
  // Additional props can be added here
}

// Chart state interfaces
export interface ChartState {
  loading: boolean;
  error: string | null;
  data: any[];
  dimensions: {
    width: number;
    height: number;
  };
  interactions: {
    hoveredIndex: number | null;
    selectedIndex: number | null;
    zoomLevel: number;
    panOffset: { x: number; y: number };
  };
}

// Chart context interfaces
export interface ChartContextValue {
  theme: 'light' | 'dark';
  colors: Record<string, string>;
  dimensions: {
    width: number;
    height: number;
  };
  responsive: {
    breakpoint: 'mobile' | 'tablet' | 'desktop' | 'large';
    fontSize: number;
    padding: number;
  };
  interactions: {
    hoveredIndex: number | null;
    selectedIndex: number | null;
  };
  updateInteractions: (updates: Partial<ChartContextValue['interactions']>) => void;
}

// DataTable Types
export type SortDirection = 'asc' | 'desc';
export type FilterType = 'text' | 'number' | 'date' | 'select' | 'boolean';

export interface DataTableColumn {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'currency' | 'percentage' | 'boolean';
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  align?: 'left' | 'center' | 'right';
  format?: (value: any) => string;
  render?: (value: any, row: DataTableRow, column: DataTableColumn) => React.ReactNode;
  tooltip?: boolean;
  className?: string;
}

export interface DataTableRow {
  id?: string | number;
  [key: string]: any;
}

export interface DataTableProps {
  data: DataTableRow[];
  columns: DataTableColumn[];
  title?: string;
  subtitle?: string;
  width?: string | number;
  height?: string | number;
  className?: string;
  theme?: 'light' | 'dark';
  responsive?: boolean;
  loading?: boolean;
  error?: string | null;
  sortable?: boolean;
  filterable?: boolean;
  selectable?: boolean;
  expandable?: boolean;
  pagination?: boolean;
  searchable?: boolean;
  exportable?: boolean;
  itemsPerPage?: number;
  maxItemsPerPage?: number;
  showRowNumbers?: boolean;
  showColumnHeaders?: boolean;
  showFooter?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  onRowClick?: (row: DataTableRow) => void;
  onRowSelect?: (rowId: string, selected: boolean) => void;
  onSort?: (columnKey: string, direction: SortDirection) => void;
  onFilter?: (columnKey: string, value: any) => void;
  onExport?: (data: DataTableRow[]) => void;
  onRefresh?: () => void;
  ariaLabel?: string;
  ariaDescription?: string;
  emptyMessage?: string;
  loadingMessage?: string;
  errorMessage?: string;
}

// Export individual types as needed
