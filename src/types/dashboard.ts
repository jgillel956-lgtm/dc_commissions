// Revenue Analytics Dashboard TypeScript Interfaces
// Based on the complex revenue master view that includes multiple revenue streams,
// cost structures, and commission calculations

// ============================================================================
// CORE DATA STRUCTURES
// ============================================================================

/**
 * Main revenue master record structure
 * Based on the actual SQL query that combines disbursement transactions and interest revenue
 */
export interface RevenueMasterRecord {
  // Core Transaction Fields
  id: number;
  disbursement_id: number;
  payment_method_id: number;
  payment_method_payee_fee: number;
  payment_method_payor_fee: number;
  api_transaction_status: string;
  created_at: string;
  updated_at: string;
  
  // Additional Fee Fields
  check_delivery_payee_fee: number;
  check_delivery_payor_fee: number;
  bundle_charges: number;
  postage_fee: number;
  
  // Company and Disbursement Info
  company_id: number;
  disbursement_updated_at: string;
  amount: number;
  disbursement_status_id: number;
  company: string;
  payment_method_description: string;
  
  // Vendor Cost Information
  cost_amount: number | null;
  cost_percentage: number | null;
  vendor_name: string | null;
  
  // Employee Commission Fields
  employee_name: string | null;
  employee_commission_amount: string | null;
  employee_commission_percentage: number | null;
  
  // Referral Partner Fields
  referral_partner_name: string | null;
  referral_partner_type: string | null;
  partner_default_rate: number | null;
  company_override_rate: number | null;
  
  // Company Upcharge Fields
  base_fee_upcharge: number | null;
  multiplier_upcharge: number | null;
  max_fee_upcharge: number | null;
  
  // Applied Rates and Amounts
  applied_employee_commission_percentage: number;
  applied_employee_commission_amount: number;
  applied_referral_rate: number;
  
  // Calculated Revenue Fields
  Company_Upcharge_Fees: number;
  Is_Revenue_Transaction: number;
  Gross_Revenue: number;
  Is_Total_Transaction: number;
  Payor_Fee_Revenue: number;
  Payee_Fee_Revenue: number;
  Total_Combined_Revenue: number;
  Revenue_Per_Transaction: number;
  
  // Cost and Profit Calculations
  Total_Vendor_Cost: number;
  Revenue_After_Upcharges: number;
  Revenue_After_Operational_Costs: number;
  
  // Commission Calculations
  Employee_Commission: number;
  Revenue_After_Employee_Commission: number;
  Referral_Partner_Commission: number;
  
  // Final Profit
  Final_Net_Profit: number;
}

// ============================================================================
// FILTER INTERFACES
// ============================================================================

/**
 * Date range filter options
 */
export interface DateRangeFilter {
  type: 'last_30_days' | 'last_90_days' | 'last_12_months' | 'ytd' | 'custom';
  start_date?: string; // ISO date string
  end_date?: string; // ISO date string
}

/**
 * Multi-select filter for companies
 */
export interface CompanyFilter {
  selected_companies: number[];
  search_query?: string;
}

/**
 * Multi-select filter for payment methods
 */
export interface PaymentMethodFilter {
  selected_methods: number[];
  search_query?: string;
}

/**
 * Revenue source filter
 */
export interface RevenueSourceFilter {
  transaction_fees: boolean;
  payor_fees: boolean;
  interest_revenue: boolean;
  selected_sources?: number[];
  search_query?: string;
}

/**
 * Commission type filter
 */
export interface CommissionTypeFilter {
  employee_commissions: boolean;
  referral_partner_commissions: boolean;
  interest_commissions: boolean;
  selected_types?: string[];
  search_query?: string;
}

/**
 * Transaction amount range filter
 */
export interface AmountRangeFilter {
  min_amount?: number;
  max_amount?: number;
}

/**
 * Employee filter for commission analysis
 */
export interface EmployeeFilter {
  selected_employees: number[];
  search_query?: string;
}

/**
 * Referral partner filter
 */
export interface ReferralPartnerFilter {
  selected_partners: number[];
  search_query?: string;
}

/**
 * Comprehensive dashboard filters
 */
export interface DashboardFilters {
  date_range: DateRangeFilter;
  companies: CompanyFilter;
  payment_methods: PaymentMethodFilter;
  revenue_sources: RevenueSourceFilter;
  commission_types: CommissionTypeFilter;
  amount_range: AmountRangeFilter;
  disbursement_status?: string[];
  employees: EmployeeFilter;
  referral_partners: ReferralPartnerFilter;
}

// ============================================================================
// KPI AND METRICS INTERFACES
// ============================================================================

/**
 * KPI widget data structure
 */
export interface KPIWidget {
  title: string;
  value: number;
  previous_value?: number;
  change_percentage?: number;
  trend: 'up' | 'down' | 'neutral';
  format: 'currency' | 'percentage' | 'number' | 'integer';
  description?: string;
  icon?: string;
}

/**
 * Revenue Analysis KPI metrics
 */
export interface RevenueAnalysisKPIs {
  total_revenue: KPIWidget;
  total_transactions: KPIWidget;
  average_transaction_amount: KPIWidget;
  payee_fee_revenue: KPIWidget;
  payor_fee_revenue: KPIWidget;
  interest_revenue: KPIWidget;
  total_companies: KPIWidget;
  total_payment_methods: KPIWidget;
}

/**
 * Commission Analysis KPI metrics
 */
export interface CommissionAnalysisKPIs {
  gross_revenue: KPIWidget;
  total_costs: KPIWidget;
  gross_profit: KPIWidget;
  total_commissions: KPIWidget;
  net_profit: KPIWidget;
  profit_margin: KPIWidget;
}

/**
 * Interest Analysis KPI metrics
 */
export interface InterestAnalysisKPIs {
  total_interest_revenue: KPIWidget;
  interest_growth_rate: KPIWidget;
  interest_commission_costs: KPIWidget;
  interest_net_profit: KPIWidget;
  average_interest_rate: KPIWidget;
  total_interest_accounts: KPIWidget;
}

// ============================================================================
// CHART DATA INTERFACES
// ============================================================================

/**
 * Pie chart data point
 */
export interface PieChartDataPoint {
  label: string;
  value: number;
  percentage: number;
  color?: string;
}

/**
 * Bar chart data point
 */
export interface BarChartDataPoint {
  label: string;
  value: number;
  category?: string;
  color?: string;
}

/**
 * Line chart data point
 */
export interface LineChartDataPoint {
  date: string;
  value: number;
  category?: string;
}

/**
 * Waterfall chart data point
 */
export interface WaterfallChartDataPoint {
  label: string;
  value: number;
  type: 'start' | 'positive' | 'negative' | 'end';
  running_total: number;
  color?: string;
}

/**
 * Chart data structures
 */
export interface ChartData {
  pie_chart?: PieChartDataPoint[];
  bar_chart?: BarChartDataPoint[];
  line_chart?: LineChartDataPoint[];
  waterfall_chart?: WaterfallChartDataPoint[];
}

// ============================================================================
// COMPANY PERFORMANCE INTERFACES
// ============================================================================

/**
 * Company performance summary
 */
export interface CompanyPerformance {
  company_id: number;
  company_name: string;
  total_revenue: number;
  total_transactions: number;
  average_transaction_amount: number;
  total_costs: number;
  gross_profit: number;
  total_commissions: number;
  net_profit: number;
  profit_margin: number;
  transaction_count: number;
}

/**
 * Payment method performance summary
 */
export interface PaymentMethodPerformance {
  payment_method_id: number;
  payment_method_name: string;
  total_revenue: number;
  total_transactions: number;
  average_transaction_amount: number;
  total_costs: number;
  gross_profit: number;
  total_commissions: number;
  net_profit: number;
  profit_margin: number;
  transaction_count: number;
}

// ============================================================================
// COMMISSION ANALYSIS INTERFACES
// ============================================================================

/**
 * Employee commission summary
 */
export interface EmployeeCommissionSummary {
  employee_id: number;
  employee_name: string;
  total_commission_earned: number;
  commission_percentage: number;
  total_transactions: number;
  average_commission_per_transaction: number;
  commission_by_company: Record<string, number>;
  commission_by_payment_method: Record<string, number>;
}

/**
 * Referral partner commission summary
 */
export interface ReferralPartnerCommissionSummary {
  partner_id: number;
  partner_name: string;
  partner_type: string;
  total_commission_earned: number;
  commission_percentage: number;
  total_transactions: number;
  average_commission_per_transaction: number;
  commission_by_company: Record<string, number>;
  commission_by_payment_method: Record<string, number>;
}

// ============================================================================
// DASHBOARD STATE INTERFACES
// ============================================================================

/**
 * Dashboard loading states
 */
export interface DashboardLoadingState {
  data_loading: boolean;
  filters_loading: boolean;
  export_loading: boolean;
  chart_loading: boolean;
}

/**
 * Dashboard error states
 */
export interface DashboardErrorState {
  data_error?: string;
  filters_error?: string;
  export_error?: string;
  chart_error?: string;
}

/**
 * Dashboard tab state
 */
export interface DashboardTabState {
  active_tab: 'revenue' | 'commission' | 'interest';
  tab_data: {
    revenue: RevenueAnalysisKPIs;
    commission: CommissionAnalysisKPIs;
    interest: InterestAnalysisKPIs;
  };
}

/**
 * Complete dashboard state
 */
export interface DashboardState {
  filters: DashboardFilters;
  data: RevenueMasterRecord[];
  kpis: RevenueAnalysisKPIs | CommissionAnalysisKPIs | InterestAnalysisKPIs;
  charts: ChartData;
  company_performance: CompanyPerformance[];
  payment_method_performance: PaymentMethodPerformance[];
  employee_commissions: EmployeeCommissionSummary[];
  referral_partner_commissions: ReferralPartnerCommissionSummary[];
  loading: DashboardLoadingState;
  errors: DashboardErrorState;
  tab_state: DashboardTabState;
}

// ============================================================================
// API INTERFACES
// ============================================================================

/**
 * API request parameters for dashboard data
 */
export interface DashboardDataRequest {
  filters: DashboardFilters;
  page?: number;
  page_size?: number;
  sort_field?: string;
  sort_order?: 'asc' | 'desc';
  chunked?: boolean;
}

/**
 * API response for dashboard data
 */
export interface DashboardDataResponse {
  data: RevenueMasterRecord[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
  kpis: RevenueAnalysisKPIs | CommissionAnalysisKPIs | InterestAnalysisKPIs;
  charts: ChartData;
  company_performance: CompanyPerformance[];
  payment_method_performance: PaymentMethodPerformance[];
  employee_commissions: EmployeeCommissionSummary[];
  referral_partner_commissions: ReferralPartnerCommissionSummary[];
}

/**
 * Export request parameters
 */
export interface ExportRequest {
  filters: DashboardFilters;
  format: 'pdf' | 'excel';
  include_charts: boolean;
  include_kpis: boolean;
  include_details: boolean;
}

/**
 * Export response
 */
export interface ExportResponse {
  download_url: string;
  file_name: string;
  file_size: number;
  expires_at: string;
}

// ============================================================================
// CACHE INTERFACES
// ============================================================================

/**
 * Cache entry for dashboard data
 */
export interface DashboardCacheEntry {
  key: string;
  data: DashboardDataResponse;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

/**
 * Cache management interface
 */
export interface DashboardCache {
  get(key: string): DashboardCacheEntry | null;
  set(key: string, data: DashboardDataResponse, ttl?: number): void;
  clear(): void;
  clearExpired(): void;
  getStats(): {
    total_entries: number;
    total_size: number;
    hit_rate: number;
  };
}

// ============================================================================
// USER PERMISSIONS INTERFACES
// ============================================================================

/**
 * User role types
 */
export type UserRole = 'admin' | 'manager' | 'employee';

/**
 * Permission levels for dashboard access
 */
export interface DashboardPermissions {
  can_view_revenue_data: boolean;
  can_view_commission_data: boolean;
  can_view_interest_data: boolean;
  can_export_data: boolean;
  can_view_all_companies: boolean;
  can_view_all_employees: boolean;
  can_view_sensitive_financial_data: boolean;
  allowed_companies: number[];
  allowed_employees: number[];
}

/**
 * User context for dashboard
 */
export interface DashboardUserContext {
  user_id: string;
  user_name: string;
  role: UserRole;
  permissions: DashboardPermissions;
  company_access: number[];
  employee_access: number[];
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Chart type options
 */
export type ChartType = 'pie' | 'bar' | 'line' | 'waterfall' | 'table';

/**
 * Data format options
 */
export type DataFormat = 'currency' | 'percentage' | 'number' | 'integer' | 'date';

/**
 * Sort order options
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Export format options
 */
export type ExportFormat = 'pdf' | 'excel' | 'csv';

/**
 * Filter type options
 */
export type FilterType = 
  | 'date_range'
  | 'company'
  | 'payment_method'
  | 'revenue_source'
  | 'commission_type'
  | 'amount_range'
  | 'disbursement_status'
  | 'employee'
  | 'referral_partner';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default filter values
 */
export const DEFAULT_FILTERS: DashboardFilters = {
  date_range: {
    type: 'last_30_days'
  },
  companies: {
    selected_companies: []
  },
  payment_methods: {
    selected_methods: []
  },
  revenue_sources: {
    transaction_fees: false,
    payor_fees: false,
    interest_revenue: false,
    selected_sources: [],
    search_query: ''
  },
  commission_types: {
    employee_commissions: false,
    referral_partner_commissions: false,
    interest_commissions: false,
    selected_types: [],
    search_query: ''
  },
  amount_range: {},
  disbursement_status: [],
  employees: {
    selected_employees: []
  },
  referral_partners: {
    selected_partners: []
  }
};

/**
 * Chart color schemes
 */
export const CHART_COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  accent: '#F59E0B',
  danger: '#EF4444',
  warning: '#F97316',
  info: '#06B6D4',
  success: '#22C55E',
  neutral: '#6B7280'
};

/**
 * Default page sizes
 */
export const PAGE_SIZES = [10, 25, 50, 100, 250, 500] as const;

/**
 * Cache TTL values (in milliseconds)
 */
export const CACHE_TTL = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 2 * 60 * 60 * 1000, // 2 hours
  VERY_LONG: 24 * 60 * 60 * 1000 // 24 hours
} as const;
