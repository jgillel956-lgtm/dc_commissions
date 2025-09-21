// Revenue Analytics Types for Complex Query Results

export interface RevenueAnalyticsRecord {
  // Core Transaction Fields
  id: number;
  disbursement_id: number;
  payment_method_id: number;
  payment_method_payee_fee: number;
  payment_method_payor_fee: number;
  api_transaction_status: string;
  created_at: string;
  updated_at: string;
  company_id: number;
  company: string;
  payment_method_description: string;
  
  // Employee Commission Fields
  employee_name: string | null;
  employee_commission_percentage: number | null;
  employee_commission_amount: number | null;
  applied_employee_commission_percentage: number | null;
  applied_employee_commission_amount: number | null;
  employee_commission: number | null;
  
  // Referral Partner Fields
  referral_partner_name: string | null;
  referral_partner_type: string | null;
  partner_default_rate: number | null;
  company_override_rate: number | null;
  applied_referral_rate: number | null;
  referral_partner_commission: number | null;
  
  // Company Upcharge Fields
  base_fee_upcharge: number | null;
  multiplier_upcharge: number | null;
  max_fee_upcharge: number | null;
  company_upcharge_fees: number | null;
  
  // Revenue calculation fields
  gross_revenue: number | null;
  is_revenue_transaction: number | null;
  is_total_transaction: number | null;
  payor_fee_revenue: number | null;
  payee_fee_revenue: number | null;
  total_combined_revenue: number | null;
  revenue_per_transaction: number | null;
  total_vendor_cost: number | null;
  revenue_after_upcharges: number | null;
  revenue_after_operational_costs: number | null;
  revenue_after_employee_commission: number | null;
  final_net_profit: number | null;
  
  // Legacy fields for backward compatibility
  Gross_Revenue?: number;
  Total_Vendor_Cost?: number;
  Total_Employee_Commission?: number;
  Total_Referral_Partner_Commission?: number;
  Total_Company_Upcharge_Fees?: number;
  Net_Profit?: number;
  Is_Revenue_Transaction?: number;
  Transaction_Month?: string;
  Transaction_Year?: string;
}

export interface RevenueAnalyticsSummary {
  totalTransactions: number;
  totalRevenue: number;
  totalEmployeeCommissions: number;
  totalReferralCommissions: number;
  totalVendorCosts: number;
  totalUpcharges: number;
  netProfit: number;
  averageRevenuePerTransaction: number;
}

export interface RevenueAnalyticsFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  companyId?: number;
  paymentMethodId?: number;
  employeeId?: number;
  referralPartnerId?: number;
  minAmount?: number;
  maxAmount?: number;
  status?: string;
}

export interface RevenueAnalyticsQueryParams {
  filters?: RevenueAnalyticsFilters;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface RevenueAnalyticsResponse {
  data: RevenueAnalyticsRecord[];
  summary: RevenueAnalyticsSummary;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Chart Data Types
export interface RevenueChartData {
  date: string;
  revenue: number;
  commissions: number;
  costs: number;
  profit: number;
}

export interface EmployeeCommissionData {
  employee_name: string;
  total_commission: number;
  transaction_count: number;
  average_commission: number;
}

export interface CompanyRevenueData {
  company: string;
  total_revenue: number;
  total_profit: number;
  transaction_count: number;
}

export interface PaymentMethodRevenueData {
  payment_method: string;
  total_revenue: number;
  transaction_count: number;
  average_revenue: number;
}
