// API Response Types
export interface ApiResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  success: boolean;
  status: string;
  message: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// Search and Filter Parameters
export interface SearchParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

// Lookup Tables
export interface InsuranceCompany {
  id: number;
  company: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  address?: string;
  tin?: string;
  merchant_id?: string;
  transaction_key?: string;
  id_country?: number;
  id_state?: number;
  city?: string;
  zip_code?: string;
  phone_number?: string;
  fax_number?: string;
  pay_confirmation?: boolean;
  ftp_address?: string;
  ftp_user?: string;
  ftp_password?: string;
  account_holder_id?: string;
  signature_ach?: string;
  signature_pd?: string;
  signature_dpay?: string;
  signature_af_claim?: string;
  signature_af_claimant?: string;
  signature_af_startpay?: string;
  signature_af_selectpay?: string;
  signature_af_authpay?: string;
  img?: string;
  email?: string;
  modipay_inhouse_checks_confirmation?: boolean;
  username?: string;
  password?: string;
  producer_id?: number;
  payment_email_expires_in?: number;
  enable_payment_email_expiration?: boolean;
  pay_disburse?: boolean;
  file_1099_by_disburse_cloud?: boolean;
  tin_type?: string;
  webhook_url?: string;
  webhook_secret?: string;
  transcard_product_id?: number;
  zoho_webhook_url?: string;
  checkissuing_logo_id?: number;
  checkissuing_funding_source_id?: number;
  isSupportEnabled?: boolean;
  logo_url?: string;
  useCompanyAccount?: boolean;
  company_check_logo_id?: number;
  company_check_funding_source_id?: number;
  enable_giact_verification?: boolean;
  instant_deposit_disclaimer?: string;
  instant_deposit_disclaimer_header?: string;
  is_claim_check_fields_present?: boolean;
  auto_approve_dc_disbursement?: boolean;
  email_template_folder?: string;
  email_display_name?: string;
  email_custom_field?: string;
}

export interface PaymentModality {
  id: number;
  payment_method: string;
}

// Main Data Tables
export interface CompanyUpchargeFee {
  id: number;
  company_id: number;
  payment_method_id: number;
  base_fee_upcharge: number;
  multiplier_upcharge: number;
  max_fee_upcharge: number;
  effective_start_date: string;
  effective_end_date?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  // Lookup fields (will be populated from related tables)
  company_name?: string;
  payment_method_name?: string;
}

export interface EmployeeCommission {
  employee_name: string;
  employee_id: number;
  payment_method_id?: number;
  id: number;
  company_id?: number;
  commission_amount: number;
  commission_percentage: number;
  effective_start_date: string;
  effective_end_date?: string;
  active: boolean;
  description: string;
  created_at: string;
  updated_at: string;
  // Lookup fields
  payment_method_name?: string;
  company_name?: string;
}

export interface MonthlyInterchangeIncome {
  id: number;
  company_id: number;
  interchange_company: string;
  interchange_amount: number;
  invoice_number: string;
  payment_date: string;
  transaction_period_start: string;
  transaction_period_end: string;
  transaction_count: number;
  interchange_rate: number;
  notes: string;
  posted_date: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  // Lookup fields
  company_name?: string;
}

export interface MonthlyInterestRevenue {
  id: number;
  company_id: number;
  interest_period_start: string;
  interest_period_end: string;
  interest_amount: number;
  account_balance: number;
  interest_rate: number;
  bank_account_name: string;
  notes?: string;
  posted_date: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
  // Lookup fields
  company_name?: string;
}

export interface ReferralPartner {
  id: number;
  partner_name: string;
  partner_type: string;
  contact_email?: string;
  contact_phone?: string;
  commission_percentage: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Legacy types (keeping for backward compatibility)
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'Active' | 'Inactive';
  revenue: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  inventory: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name?: string;
  total_amount: number;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered';
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name?: string;
  amount: number;
  due_date: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
  created_at: string;
  updated_at: string;
}
