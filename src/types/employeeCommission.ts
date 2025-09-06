// Employee Commission Types based on employee_commission_guide.md

export interface EmployeeEarningsSummary {
  employee_name: string;
  total_transactions: number;
  total_commission_earned: number;
  average_commission_per_transaction: number;
  lowest_commission: number;
  highest_commission: number;
  total_revenue_base: number;
  average_commission_rate: number;
  first_commission_date: string;
  last_commission_date: string;
}

export interface CommissionByPaymentMethod {
  employee_name: string;
  payment_method: string;
  transaction_count: number;
  commission_earned: number;
  avg_commission_per_transaction: number;
  revenue_base: number;
  commission_rate_applied: number;
}

export interface MonthlyCommissionStatement {
  employee_name: string;
  commission_month: string;
  monthly_transactions: number;
  monthly_commission_total: number;
  avg_commission_per_transaction: number;
  monthly_revenue_base: number;
}

export interface TransactionCommissionDetail {
  disbursement_id: number;
  payment_method_description: string;
  company: string;
  transaction_amount: number;
  employee_name: string;
  revenue_after_operational_costs: number;
  commission_rate: number;
  fixed_amount: number;
  commission_earned: number;
  transaction_date: string;
}

export interface EmployeeCommissionKPI {
  total_employee_commission: number;
}

export interface EmployeeCommissionByEmployee {
  employee_name: string;
  total_commission: number;
}

export interface EmployeeAverageCommissionRate {
  employee_name: string;
  avg_commission_rate: number;
}

export interface MultipleEmployeeTransaction {
  disbursement_id: number;
  employee_count: number;
  total_employee_commission: number;
  transaction_revenue: number;
  employees_involved: string;
}

export interface EmployeeCommissionConfig {
  employee_name: string;
  payment_method_id: number | null;
  company_id: number | null;
  commission_amount: number;
  commission_percentage: number;
  effective_start_date: string;
  active: 'Yes' | 'No';
}

export interface EmployeeCommissionValidation {
  test_name: string;
  transactions_with_multiple_employees: number;
}

export interface EmployeeCommissionTotals {
  test_name: string;
  total_commission_paid: number;
  active_employees: number;
  commission_rows: number;
}

// Dashboard filters
export interface EmployeeCommissionFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  employeeNames?: string[];
  paymentMethods?: string[];
  companies?: string[];
  minCommission?: number;
  maxCommission?: number;
}

// API response wrapper
export interface EmployeeCommissionResponse<T> {
  data: T[];
  summary?: any;
  total: number;
  success: boolean;
  message?: string;
}

// Report types enum
export enum EmployeeReportType {
  EARNINGS_SUMMARY = 'earnings_summary',
  COMMISSION_BY_PAYMENT_METHOD = 'commission_by_payment_method',
  MONTHLY_STATEMENTS = 'monthly_statements',
  TRANSACTION_DETAILS = 'transaction_details'
}

// Commission structure examples types
export interface CommissionStructureExample {
  type: 'global' | 'payment_specialist' | 'account_manager' | 'exact_match';
  employee_name: string;
  payment_method_id: number | null;
  company_id: number | null;
  commission_amount: number;
  commission_percentage: number;
  description: string;
}