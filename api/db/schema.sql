-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action_type VARCHAR(50) NOT NULL,
  table_name VARCHAR(100),
  record_id VARCHAR(100),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password_hash, role) 
VALUES ('admin', '$2b$10$rQZ8K9mN2pL1vX3yW6tA7uB4cD5eF8gH9iJ0kL1mN2oP3qR4sT5uV6wX7yZ8', 'admin')
ON CONFLICT (username) DO NOTHING;

-- OAuth token storage for Zoho Analytics
CREATE TABLE IF NOT EXISTS oauth_tokens (
  provider        TEXT PRIMARY KEY,
  access_token    TEXT NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OAuth rate-limit state
CREATE TABLE IF NOT EXISTS oauth_state (
  provider        TEXT PRIMARY KEY,
  backoff_until   TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial OAuth state
INSERT INTO oauth_state (provider, backoff_until)
VALUES ('zoho', NULL)
ON CONFLICT (provider) DO NOTHING;

-- Revenue master view data cache table - matches Zoho Analytics CSV structure
CREATE TABLE IF NOT EXISTS revenue_master_view_cache (
  id SERIAL PRIMARY KEY,
  
  -- Core transaction identifiers
  dt_id INTEGER,
  disbursement_id INTEGER,
  payment_method_id INTEGER,
  
  -- Fee structure
  payment_method_payee_fee DECIMAL(12,2),
  payment_method_payor_fee DECIMAL(12,2),
  check_delivery_payee_fee DECIMAL(12,2),
  check_delivery_payor_fee DECIMAL(12,2),
  bundle_charges DECIMAL(12,2),
  postage_fee DECIMAL(12,2),
  
  -- Status and dates
  api_transaction_status VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  disbursement_updated_at TIMESTAMP,
  
  -- Company and disbursement info
  company_id INTEGER,
  company VARCHAR(255),
  amount VARCHAR(50), -- Keep as string since CSV has formatted amounts like "$21,000.00"
  disbursement_status_id INTEGER,
  
  -- Payment method details
  payment_method_description VARCHAR(255),
  
  -- Vendor costs
  cost_amount DECIMAL(12,2),
  cost_percentage DECIMAL(5,2),
  vendor_name VARCHAR(255),
  
  -- Employee commission data
  emp_id INTEGER,
  employee_name VARCHAR(255),
  employee_commission_amount DECIMAL(12,2),
  employee_commission_percentage DECIMAL(5,2),
  
  -- Referral partner data
  referral_partner_name VARCHAR(255),
  referral_partner_type VARCHAR(100),
  partner_default_rate DECIMAL(5,2),
  company_override_rate DECIMAL(5,2),
  
  -- Company upcharge fees
  base_fee_upcharge DECIMAL(12,2),
  multiplier_upcharge DECIMAL(5,2),
  max_fee_upcharge DECIMAL(12,2),
  
  -- Applied rates and amounts
  applied_employee_commission_percentage DECIMAL(5,2),
  applied_employee_commission_amount DECIMAL(12,2),
  applied_referral_rate DECIMAL(5,2),
  
  -- Revenue calculation fields
  company_upcharge_fees DECIMAL(12,2),
  is_revenue_transaction INTEGER,
  gross_revenue DECIMAL(12,2),
  is_total_transaction INTEGER,
  payor_fee_revenue DECIMAL(12,2),
  payee_fee_revenue DECIMAL(12,2),
  total_combined_revenue DECIMAL(12,2),
  revenue_per_transaction DECIMAL(12,2),
  total_vendor_cost DECIMAL(12,2),
  revenue_after_upcharges DECIMAL(12,2),
  revenue_after_operational_costs DECIMAL(12,2),
  employee_commission DECIMAL(12,2),
  revenue_after_employee_commission DECIMAL(12,2),
  referral_partner_commission DECIMAL(12,2),
  final_net_profit DECIMAL(12,2),
  
  -- Source tracking
  source_table VARCHAR(100),
  zoho_row_id VARCHAR(100),
  
  -- Sync metadata
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sync_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique constraint to prevent duplicates
  UNIQUE(dt_id, disbursement_id, company_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_revenue_cache_created_at ON revenue_master_view_cache(created_at);
CREATE INDEX IF NOT EXISTS idx_revenue_cache_emp_id ON revenue_master_view_cache(emp_id);
CREATE INDEX IF NOT EXISTS idx_revenue_cache_employee_name ON revenue_master_view_cache(employee_name);
CREATE INDEX IF NOT EXISTS idx_revenue_cache_company_id ON revenue_master_view_cache(company_id);
CREATE INDEX IF NOT EXISTS idx_revenue_cache_company ON revenue_master_view_cache(company);
CREATE INDEX IF NOT EXISTS idx_revenue_cache_synced_at ON revenue_master_view_cache(synced_at);
CREATE INDEX IF NOT EXISTS idx_revenue_cache_dt_id ON revenue_master_view_cache(dt_id);
CREATE INDEX IF NOT EXISTS idx_revenue_cache_disbursement_id ON revenue_master_view_cache(disbursement_id);

-- Sync status tracking table
CREATE TABLE IF NOT EXISTS revenue_sync_status (
  id SERIAL PRIMARY KEY,
  sync_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'date_range'
  start_date DATE,
  end_date DATE,
  records_fetched INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  fetch_method VARCHAR(50), -- 'pagination', 'csv-aggregation', etc.
  status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  error_message TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  duration_seconds INTEGER
);

-- Index for sync status
CREATE INDEX IF NOT EXISTS idx_revenue_sync_status_started_at ON revenue_sync_status(started_at);
CREATE INDEX IF NOT EXISTS idx_revenue_sync_status_type ON revenue_sync_status(sync_type);

-- Company upcharge fees table
CREATE TABLE IF NOT EXISTS company_upcharge_fees_DC (
  id INTEGER PRIMARY KEY,
  company_id INTEGER,
  payment_method_id INTEGER,
  base_fee_upcharge DECIMAL(12,2),
  multiplier_upcharge DECIMAL(5,4),
  max_fee_upcharge DECIMAL(12,2),
  effective_start_date DATE,
  effective_end_date DATE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Employee commissions table
CREATE TABLE IF NOT EXISTS employee_commissions_DC (
  id INTEGER PRIMARY KEY,
  employee_name VARCHAR(255),
  employee_id INTEGER,
  payment_method_id INTEGER,
  company_id INTEGER,
  commission_amount DECIMAL(12,2),
  commission_percentage DECIMAL(5,2),
  effective_start_date TIMESTAMP,
  effective_end_date TIMESTAMP,
  active VARCHAR(10),
  description TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Insurance companies table
CREATE TABLE IF NOT EXISTS insurance_companies_DC (
  id INTEGER PRIMARY KEY,
  company VARCHAR(255),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  address TEXT,
  tin VARCHAR(50),
  merchant_id VARCHAR(100),
  transaction_key VARCHAR(100),
  id_country INTEGER,
  id_state INTEGER,
  city VARCHAR(100),
  zip_code VARCHAR(20),
  phone_number VARCHAR(20),
  fax_number VARCHAR(20),
  pay_confirmation BOOLEAN,
  ftp_address VARCHAR(255),
  ftp_user VARCHAR(100),
  ftp_password VARCHAR(255),
  account_holder_id INTEGER,
  signature_ach TEXT,
  signature_pd TEXT,
  signature_dpay TEXT,
  signature_af_claim TEXT,
  signature_af_claimant TEXT,
  signature_af_startpay TEXT,
  signature_af_selectpay TEXT,
  signature_af_authpay TEXT,
  img TEXT,
  email VARCHAR(255),
  modipay_inhouse_checks_confirmation BOOLEAN,
  username VARCHAR(100),
  password VARCHAR(255),
  producer_id INTEGER,
  payment_email_expires_in INTEGER,
  enable_payment_email_expiration BOOLEAN,
  pay_disburse BOOLEAN,
  file_1099_by_disburse_cloud BOOLEAN,
  tin_type VARCHAR(50),
  webhook_url TEXT,
  webhook_secret TEXT,
  transcard_product_id INTEGER,
  zoho_webhook_url TEXT,
  checkissuing_logo_id INTEGER,
  checkissuing_funding_source_id INTEGER,
  isSupportEnabled BOOLEAN,
  logo_url TEXT,
  useCompanyAccount BOOLEAN,
  company_check_logo_id INTEGER,
  company_check_funding_source_id INTEGER,
  enable_giact_verification BOOLEAN,
  instant_deposit_disclaimer TEXT,
  instant_deposit_disclaimer_header VARCHAR(255),
  is_claim_check_fields_present BOOLEAN,
  auto_approve_dc_disbursement BOOLEAN,
  email_template_folder VARCHAR(255),
  email_display_name VARCHAR(255),
  email_custom_field VARCHAR(255)
);

-- Monthly interchange income table
CREATE TABLE IF NOT EXISTS monthly_interchange_income_DC (
  id INTEGER PRIMARY KEY,
  company_id INTEGER,
  interchange_company VARCHAR(255),
  interchange_amount VARCHAR(50), -- Keep as string for formatted currency
  invoice_number VARCHAR(100),
  payment_date TIMESTAMP,
  transaction_period_start TIMESTAMP,
  transaction_period_end TIMESTAMP,
  transaction_count INTEGER,
  interchange_rate DECIMAL(5,4),
  notes TEXT,
  posted_date TIMESTAMP,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Monthly interest revenue table
CREATE TABLE IF NOT EXISTS monthly_interest_revenue_DC (
  id INTEGER PRIMARY KEY,
  company_id INTEGER,
  interest_period_start TIMESTAMP,
  interest_period_end TIMESTAMP,
  interest_amount VARCHAR(50), -- Keep as string for formatted currency
  account_balance VARCHAR(50), -- Keep as string for formatted currency
  interest_rate VARCHAR(20), -- Keep as string for formatted percentage
  bank_account_name VARCHAR(255),
  notes TEXT,
  posted_date TIMESTAMP,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Payment modalities table (payment types)
CREATE TABLE IF NOT EXISTS payment_modalities (
  id INTEGER PRIMARY KEY,
  payment_method VARCHAR(100) NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vendor costs table
CREATE TABLE IF NOT EXISTS vendor_costs_DC (
  id SERIAL PRIMARY KEY,
  vendor_name VARCHAR(255) NOT NULL,
  cost_type VARCHAR(100),
  amount DECIMAL(12,2),
  cost_amount DECIMAL(12,2),
  cost_percentage DECIMAL(5,2),
  payment_method_id INTEGER,
  effective_start_date DATE,
  effective_end_date DATE,
  date DATE,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Referral partners table
CREATE TABLE IF NOT EXISTS referral_partners_DC (
  id INTEGER PRIMARY KEY,
  partner_name VARCHAR(255),
  partner_type VARCHAR(100),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  commission_percentage DECIMAL(5,2),
  active VARCHAR(10),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Indexes for performance on new tables
CREATE INDEX IF NOT EXISTS idx_company_upcharge_fees_company_id ON company_upcharge_fees_DC(company_id);
CREATE INDEX IF NOT EXISTS idx_company_upcharge_fees_payment_method_id ON company_upcharge_fees_DC(payment_method_id);

CREATE INDEX IF NOT EXISTS idx_employee_commissions_employee_name ON employee_commissions_DC(employee_name);
CREATE INDEX IF NOT EXISTS idx_employee_commissions_employee_id ON employee_commissions_DC(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_commissions_company_id ON employee_commissions_DC(company_id);

CREATE INDEX IF NOT EXISTS idx_insurance_companies_company ON insurance_companies_DC(company);
CREATE INDEX IF NOT EXISTS idx_insurance_companies_active ON insurance_companies_DC(active);

CREATE INDEX IF NOT EXISTS idx_interchange_income_company_id ON monthly_interchange_income_DC(company_id);
CREATE INDEX IF NOT EXISTS idx_interchange_income_payment_date ON monthly_interchange_income_DC(payment_date);

CREATE INDEX IF NOT EXISTS idx_interest_revenue_company_id ON monthly_interest_revenue_DC(company_id);
CREATE INDEX IF NOT EXISTS idx_interest_revenue_period_start ON monthly_interest_revenue_DC(interest_period_start);

CREATE INDEX IF NOT EXISTS idx_payment_modalities_payment_method ON payment_modalities(payment_method);

-- Vendor costs indexes
CREATE INDEX IF NOT EXISTS idx_vendor_costs_vendor_name ON vendor_costs_DC(vendor_name);
CREATE INDEX IF NOT EXISTS idx_vendor_costs_payment_method_id ON vendor_costs_DC(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_vendor_costs_active ON vendor_costs_DC(active);
CREATE INDEX IF NOT EXISTS idx_vendor_costs_date ON vendor_costs_DC(date);

CREATE INDEX IF NOT EXISTS idx_referral_partners_partner_name ON referral_partners_DC(partner_name);
CREATE INDEX IF NOT EXISTS idx_referral_partners_partner_type ON referral_partners_DC(partner_type);
