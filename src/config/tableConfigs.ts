import { Users, Package, FileText, CreditCard, Building, DollarSign, TrendingUp, Users2 } from 'lucide-react';
import * as yup from 'yup';

// Field configuration interface
export interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'date' | 'select' | 'currency' | 'percentage' | 'toggle';
  required: boolean;
  options?: { value: string | number; label: string }[];
  lookupTable?: string;
  lookupValueField?: string;
  lookupDisplayField?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

// Table configuration interface
export interface TableConfig {
  name: string;
  icon: any;
  fields: FieldConfig[];
  displayColumns: string[];
  tableName: string; // Zoho Analytics table name
  tableId: string; // Zoho Analytics table ID
}

// Validation schemas
export const companyUpchargeFeeSchema = yup.object({
  company_id: yup.number().required('Company is required'),
  payment_method_id: yup.number().required('Payment method is required'),
  base_fee_upcharge: yup.number().min(0, 'Base fee must be positive').required('Base fee is required'),
  multiplier_upcharge: yup.number().min(0, 'Multiplier must be positive').max(1, 'Multiplier must be between 0 and 1').required('Multiplier is required'),
  max_fee_upcharge: yup.number().min(0, 'Max fee must be positive').required('Max fee is required'),
  effective_start_date: yup.date().required('Start date is required'),
  effective_end_date: yup.date().nullable(),
  active: yup.boolean().required('Active status is required')
});

export const employeeCommissionSchema = yup.object({
  employee_name: yup.string().required('Employee name is required'),
  employee_id: yup.number().required('Employee ID is required'),
  payment_method_id: yup.number().nullable(),
  company_id: yup.number().nullable(),
  commission_amount: yup.number().min(0, 'Commission amount must be positive'),
  commission_percentage: yup.number().min(0, 'Commission percentage must be positive').max(100, 'Commission percentage cannot exceed 100%').required('Commission percentage is required'),
  effective_start_date: yup.date().required('Start date is required'),
  effective_end_date: yup.date().nullable(),
  active: yup.boolean().required('Active status is required'),
  description: yup.string().required('Description is required')
});



export const monthlyInterestRevenueSchema = yup.object({
  company_id: yup.number().required('Company is required'),
  interest_period_start: yup.date().required('Interest period start is required'),
  interest_period_end: yup.date().required('Interest period end is required'),
  interest_amount: yup.number().min(0, 'Interest amount must be positive').required('Interest amount is required'),
  account_balance: yup.number().min(0, 'Account balance must be positive').required('Account balance is required'),
  interest_rate: yup.number().min(0, 'Interest rate must be positive').required('Interest rate is required'),
  bank_account_name: yup.string().required('Bank account name is required'),
  notes: yup.string().nullable(),
  posted_date: yup.date().required('Posted date is required'),
  active: yup.boolean().required('Active status is required')
});

export const referralPartnerSchema = yup.object({
  partner_name: yup.string().required('Partner name is required'),
  partner_type: yup.string().required('Partner type is required'),
  contact_email: yup.string().email('Invalid email format').nullable(),
  contact_phone: yup.string().nullable(),
  commission_percentage: yup.number().min(0, 'Commission percentage must be positive').max(100, 'Commission percentage cannot exceed 100%').required('Commission percentage is required'),
  active: yup.boolean().required('Active status is required')
});

export const vendorCostsSchema = yup.object({
  vendor_name: yup.string().required('Vendor name is required'),
  cost_type: yup.string().required('Cost type is required'),
  amount: yup.number().min(0, 'Amount must be positive').required('Amount is required'),
  date: yup.date().required('Date is required'),
  active: yup.boolean().required('Active status is required')
});

export const paymentModalitiesSchema = yup.object({
  payment_method: yup.string().required('Payment method is required'),
  description: yup.string().nullable(),
  active: yup.boolean().required('Active status is required')
});

export const monthlyInterchangeIncomeSchema = yup.object({
  company_id: yup.number().required('Company is required'),
  interchange_company: yup.string().required('Interchange company is required'),
  interchange_amount: yup.number().min(0, 'Interchange amount must be positive').required('Interchange amount is required'),
  invoice_number: yup.string().required('Invoice number is required'),
  payment_date: yup.date().required('Payment date is required'),
  transaction_period_start: yup.date().required('Transaction period start is required'),
  transaction_period_end: yup.date().required('Transaction period end is required'),
  transaction_count: yup.number().min(0, 'Transaction count must be positive').nullable(),
  interchange_rate: yup.number().min(0, 'Interchange rate must be positive').nullable(),
  notes: yup.string().required('Notes are required'),
  posted_date: yup.date().required('Posted date is required'),
  active: yup.boolean().required('Active status is required')
});

// Table configurations
export const tableConfigs: Record<string, TableConfig> = {
  company_upcharge_fees_DC: {
    name: 'Company Upcharge Fees',
    icon: DollarSign,
    tableName: 'company_upcharge_fees_DC',
    tableId: '2103833000016814240',
    fields: [
      {
        key: 'company_id',
        label: 'Company',
        type: 'select',
        required: true,
        lookupTable: 'insurance_companies_DC',
        lookupValueField: 'id',
        lookupDisplayField: 'company'
      },
      {
        key: 'payment_method_id',
        label: 'Payment Method',
        type: 'select',
        required: true,
        lookupTable: 'payment_type_DC',
        lookupValueField: 'id',
        lookupDisplayField: 'payment_method'
      },
      {
        key: 'base_fee_upcharge',
        label: 'Base Fee Upcharge',
        type: 'currency',
        required: true,
        min: 0,
        step: 0.01,
        placeholder: '0.00'
      },
      {
        key: 'multiplier_upcharge',
        label: 'Multiplier Upcharge',
        type: 'percentage',
        required: true,
        min: 0,
        max: 1,
        step: 0.001,
        placeholder: '0.000'
      },
      {
        key: 'max_fee_upcharge',
        label: 'Max Fee Upcharge',
        type: 'currency',
        required: true,
        min: 0,
        step: 0.01,
        placeholder: '0.00'
      },
      {
        key: 'effective_start_date',
        label: 'Effective Start Date',
        type: 'date',
        required: true
      },
      {
        key: 'effective_end_date',
        label: 'Effective End Date',
        type: 'date',
        required: false
      },
      {
        key: 'active',
        label: 'Active',
        type: 'toggle',
        required: true
      }
    ],
    displayColumns: ['company_name', 'payment_method_name', 'base_fee_upcharge', 'multiplier_upcharge', 'max_fee_upcharge', 'effective_start_date', 'effective_end_date', 'active']
  },

  employee_commissions_DC: {
    name: 'Employee Commissions',
    icon: Users,
    tableName: 'employee_commissions_DC',
    tableId: '2103833000016814379',
    fields: [
      {
        key: 'employee_name',
        label: 'Employee Name',
        type: 'text',
        required: true,
        placeholder: 'Enter employee name'
      },
      {
        key: 'employee_id',
        label: 'Employee ID',
        type: 'number',
        required: true,
        placeholder: 'Enter employee ID'
      },
      {
        key: 'payment_method_id',
        label: 'Payment Method',
        type: 'select',
        required: false,
        lookupTable: 'payment_modalities',
        lookupValueField: 'id',
        lookupDisplayField: 'payment_method'
      },
      {
        key: 'company_id',
        label: 'Company',
        type: 'select',
        required: false,
        lookupTable: 'insurance_companies_DC',
        lookupValueField: 'id',
        lookupDisplayField: 'company'
      },
      {
        key: 'commission_amount',
        label: 'Commission Amount',
        type: 'currency',
        required: false,
        min: 0,
        step: 0.01,
        placeholder: '0.00'
      },
      {
        key: 'commission_percentage',
        label: 'Commission Percentage',
        type: 'percentage',
        required: true,
        min: 0,
        max: 100,
        step: 0.1,
        placeholder: '0.0'
      },
      {
        key: 'effective_start_date',
        label: 'Effective Start Date',
        type: 'date',
        required: true
      },
      {
        key: 'effective_end_date',
        label: 'Effective End Date',
        type: 'date',
        required: false
      },
      {
        key: 'active',
        label: 'Active',
        type: 'toggle',
        required: true
      },
      {
        key: 'description',
        label: 'Description',
        type: 'text',
        required: true,
        placeholder: 'Enter description'
      }
    ],
    displayColumns: ['employee_name', 'employee_id', 'payment_method_id', 'company_id', 'commission_percentage', 'effective_start_date', 'active']
  },



  monthly_interest_revenue_DC: {
    name: 'Monthly Interest Revenue',
    icon: Building,
    tableName: 'monthly_interest_revenue_DC',
    tableId: '2103833000016914505',
    fields: [
      {
        key: 'company_id',
        label: 'Company',
        type: 'select',
        required: true,
        lookupTable: 'insurance_companies_DC',
        lookupValueField: 'id',
        lookupDisplayField: 'company'
      },
      {
        key: 'interest_period_start',
        label: 'Interest Period Start',
        type: 'date',
        required: true
      },
      {
        key: 'interest_period_end',
        label: 'Interest Period End',
        type: 'date',
        required: true
      },
      {
        key: 'interest_amount',
        label: 'Interest Amount',
        type: 'currency',
        required: true,
        min: 0,
        step: 0.01,
        placeholder: '0.00'
      },
      {
        key: 'account_balance',
        label: 'Account Balance',
        type: 'currency',
        required: true,
        min: 0,
        step: 0.01,
        placeholder: '0.00'
      },
      {
        key: 'interest_rate',
        label: 'Interest Rate',
        type: 'percentage',
        required: true,
        min: 0,
        step: 0.0001,
        placeholder: '0.0000'
      },
      {
        key: 'bank_account_name',
        label: 'Bank Account Name',
        type: 'text',
        required: true,
        placeholder: 'Enter bank account name'
      },
      {
        key: 'notes',
        label: 'Notes',
        type: 'text',
        required: false,
        placeholder: 'Enter notes (optional)'
      },
      {
        key: 'posted_date',
        label: 'Posted Date',
        type: 'date',
        required: true
      },
      {
        key: 'active',
        label: 'Active',
        type: 'toggle',
        required: true
      }
    ],
    displayColumns: ['company_name', 'interest_period_start', 'interest_period_end', 'interest_amount', 'account_balance', 'interest_rate', 'bank_account_name', 'active']
  },

  referral_partners_DC: {
    name: 'Referral Partners',
    icon: Users2,
    tableName: 'referral_partners_DC',
    tableId: '2103833000016814002',
    fields: [
      {
        key: 'partner_name',
        label: 'Partner Name',
        type: 'text',
        required: true,
        placeholder: 'Enter partner name'
      },
      {
        key: 'partner_type',
        label: 'Partner Type',
        type: 'text',
        required: true,
        placeholder: 'Enter partner type'
      },
      {
        key: 'contact_email',
        label: 'Contact Email',
        type: 'email',
        required: false,
        placeholder: 'Enter contact email'
      },
      {
        key: 'contact_phone',
        label: 'Contact Phone',
        type: 'tel',
        required: false,
        placeholder: 'Enter contact phone'
      },
      {
        key: 'commission_percentage',
        label: 'Commission Percentage',
        type: 'percentage',
        required: true,
        min: 0,
        max: 100,
        step: 0.1,
        placeholder: '0.0'
      },
      {
        key: 'active',
        label: 'Active',
        type: 'toggle',
        required: true
      }
    ],
    displayColumns: ['partner_name', 'partner_type', 'contact_email', 'contact_phone', 'commission_percentage', 'active']
  },



  vendor_costs_DC: {
    name: 'Vendor Costs',
    icon: DollarSign,
    tableName: 'vendor_costs_DC',
    tableId: '2103833000016817002',
    fields: [
      {
        key: 'vendor_name',
        label: 'Vendor Name',
        type: 'text',
        required: true,
        placeholder: 'Enter vendor name'
      },
      {
        key: 'cost_type',
        label: 'Cost Type',
        type: 'text',
        required: true,
        placeholder: 'Enter cost type'
      },
      {
        key: 'amount',
        label: 'Amount',
        type: 'currency',
        required: true,
        placeholder: '0.00'
      },
      {
        key: 'date',
        label: 'Date',
        type: 'date',
        required: true
      },
      {
        key: 'active',
        label: 'Active',
        type: 'toggle',
        required: true
      }
    ],
    displayColumns: ['vendor_name', 'cost_type', 'amount', 'date', 'active']
  },

  payment_type_DC: {
    name: 'Payment Types',
    icon: CreditCard,
    tableName: 'payment_type_DC',
    tableId: '2103833000011978002',
    fields: [
      {
        key: 'payment_method',
        label: 'Payment Method',
        type: 'text',
        required: true,
        placeholder: 'Enter payment method name'
      },
      {
        key: 'description',
        label: 'Description',
        type: 'text',
        required: false,
        placeholder: 'Enter description'
      },
      {
        key: 'active',
        label: 'Active',
        type: 'toggle',
        required: true
      }
    ],
    displayColumns: ['payment_method', 'description', 'active']
  },

  monthly_interchange_income_DC: {
    name: 'Monthly Interchange Income',
    icon: TrendingUp,
    tableName: 'monthly_interchange_income_DC',
    tableId: '2103833000018129022',
    fields: [
      {
        key: 'company_id',
        label: 'Company',
        type: 'select',
        required: true,
        lookupTable: 'insurance_companies_DC',
        lookupValueField: 'id',
        lookupDisplayField: 'company'
      },
      {
        key: 'interchange_company',
        label: 'Interchange Company',
        type: 'text',
        required: true,
        placeholder: 'Enter interchange company name'
      },
      {
        key: 'interchange_amount',
        label: 'Interchange Amount',
        type: 'currency',
        required: true,
        min: 0,
        step: 0.01,
        placeholder: '0.00'
      },
      {
        key: 'invoice_number',
        label: 'Invoice Number',
        type: 'text',
        required: true,
        placeholder: 'Enter invoice number'
      },
      {
        key: 'payment_date',
        label: 'Payment Date',
        type: 'date',
        required: true
      },
      {
        key: 'transaction_period_start',
        label: 'Transaction Period Start',
        type: 'date',
        required: true
      },
      {
        key: 'transaction_period_end',
        label: 'Transaction Period End',
        type: 'date',
        required: true
      },
      {
        key: 'transaction_count',
        label: 'Transaction Count',
        type: 'number',
        required: false,
        min: 0,
        placeholder: 'Enter transaction count'
      },
      {
        key: 'interchange_rate',
        label: 'Interchange Rate',
        type: 'percentage',
        required: false,
        min: 0,
        step: 0.0001,
        placeholder: '0.0000'
      },
      {
        key: 'notes',
        label: 'Notes',
        type: 'text',
        required: true,
        placeholder: 'Enter notes'
      },
      {
        key: 'posted_date',
        label: 'Posted Date',
        type: 'date',
        required: true
      },
      {
        key: 'active',
        label: 'Active',
        type: 'toggle',
        required: true
      }
    ],
    displayColumns: ['company_name', 'interchange_company', 'interchange_amount', 'invoice_number', 'payment_date', 'transaction_count', 'interchange_rate', 'active']
  }
};

// Status colors for badges
export const statusColors: Record<string, string> = {
  Active: 'bg-green-100 text-green-800',
  Inactive: 'bg-red-100 text-red-800',
  Pending: 'bg-yellow-100 text-yellow-800',
  Processing: 'bg-blue-100 text-blue-800',
  Shipped: 'bg-purple-100 text-purple-800',
  Delivered: 'bg-green-100 text-green-800',
  Draft: 'bg-gray-100 text-gray-800',
  Sent: 'bg-blue-100 text-blue-800',
  Paid: 'bg-green-100 text-green-800',
  Overdue: 'bg-red-100 text-red-800',
  true: 'bg-green-100 text-green-800',
  false: 'bg-red-100 text-red-800'
};

// Column formatters
export const columnFormatters: Record<string, (value: any) => string> = {
  revenue: (value: any) => {
    if (value === null || value === undefined || isNaN(value)) return '$0.00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `$${numValue.toLocaleString()}`;
  },
  price: (value: any) => {
    if (value === null || value === undefined || isNaN(value)) return '$0.00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `$${numValue.toLocaleString()}`;
  },
  total_amount: (value: any) => {
    if (value === null || value === undefined || isNaN(value)) return '$0.00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `$${numValue.toLocaleString()}`;
  },
  amount: (value: any) => {
    if (value === null || value === undefined || isNaN(value)) return '$0.00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `$${numValue.toLocaleString()}`;
  },
  base_fee_upcharge: (value: any) => {
    if (value === null || value === undefined || isNaN(value)) return '$0.00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `$${numValue.toLocaleString()}`;
  },
  max_fee_upcharge: (value: any) => {
    if (value === null || value === undefined || isNaN(value)) return '$0.00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `$${numValue.toLocaleString()}`;
  },
  multiplier_upcharge: (value: any) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(numValue) ? '0.000%' : `${(numValue * 100).toFixed(3)}%`;
  },
  commission_amount: (value: any) => {
    if (value === null || value === undefined || isNaN(value)) return '$0.00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `$${numValue.toLocaleString()}`;
  },
  commission_percentage: (value: any) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(numValue) ? '0.0%' : `${numValue.toFixed(1)}%`;
  },
  interchange_amount: (value: any) => {
    if (value === null || value === undefined || isNaN(value)) return '$0.00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `$${numValue.toLocaleString()}`;
  },
  interchange_rate: (value: any) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(numValue) ? '0.0000%' : `${(numValue * 100).toFixed(4)}%`;
  },
  interest_amount: (value: any) => {
    if (value === null || value === undefined || isNaN(value)) return '$0.00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `$${numValue.toLocaleString()}`;
  },
  account_balance: (value: any) => {
    if (value === null || value === undefined || isNaN(value)) return '$0.00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `$${numValue.toLocaleString()}`;
  },
  interest_rate: (value: any) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(numValue) ? '0.00%' : `${numValue.toFixed(2)}%`;
  },
  payment_method_id: (value: any) => {
    // This will be handled by the lookup data in the component
    return value || '-';
  },
  company_id: (value: any) => {
    // This will be handled by the lookup data in the component
    return value || '-';
  },
  due_date: (value: string) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  },
  created_at: (value: string) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  },
  updated_at: (value: string) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  },
  effective_start_date: (value: string) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  },
  effective_end_date: (value: string) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  },
  payment_date: (value: string) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  },
  transaction_period_start: (value: string) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  },
  transaction_period_end: (value: string) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  },
  posted_date: (value: string) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  },
  interest_period_start: (value: string) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  },
  interest_period_end: (value: string) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  }
};

// Validation schemas mapping
export const validationSchemas: Record<string, any> = {
  company_upcharge_fees_DC: companyUpchargeFeeSchema,
  employee_commissions_DC: employeeCommissionSchema,
  monthly_interest_revenue_DC: monthlyInterestRevenueSchema,
  monthly_interchange_income_DC: monthlyInterchangeIncomeSchema,
  referral_partners_DC: referralPartnerSchema,
  vendor_costs_DC: vendorCostsSchema,
  payment_type_DC: paymentModalitiesSchema
};

// Default sort configurations
export const defaultSorts = {
  company_upcharge_fees_DC: { field: 'effective_start_date', order: 'desc' as const },
  employee_commissions_DC: { field: 'employee_name', order: 'asc' as const },
  monthly_interest_revenue_DC: { field: 'posted_date', order: 'desc' as const },
  monthly_interchange_income_DC: { field: 'payment_date', order: 'desc' as const },
  referral_partners_DC: { field: 'partner_name', order: 'asc' as const },
  vendor_costs_DC: { field: 'date', order: 'desc' as const },
  payment_type_DC: { field: 'payment_method', order: 'asc' as const },
};

// Export configurations
export const exportConfigs = {
  company_upcharge_fees_DC: {
    filename: 'company-upcharge-fees-export',
    columns: ['company_name', 'payment_method_name', 'base_fee_upcharge', 'multiplier_upcharge', 'max_fee_upcharge', 'effective_start_date', 'effective_end_date', 'active'],
    headers: ['Company', 'Payment Method', 'Base Fee Upcharge', 'Multiplier Upcharge', 'Max Fee Upcharge', 'Effective Start Date', 'Effective End Date', 'Active'],
  },
  employee_commissions_DC: {
    filename: 'employee-commissions-export',
    columns: ['employee_name', 'employee_id', 'payment_method_name', 'company_name', 'commission_percentage', 'effective_start_date', 'active'],
    headers: ['Employee Name', 'Employee ID', 'Payment Method', 'Company', 'Commission Percentage', 'Effective Start Date', 'Active'],
  },
  monthly_interest_revenue_DC: {
    filename: 'monthly-interest-revenue-export',
    columns: ['company_name', 'interest_period_start', 'interest_period_end', 'interest_amount', 'account_balance', 'interest_rate', 'bank_account_name', 'active'],
    headers: ['Company', 'Interest Period Start', 'Interest Period End', 'Interest Amount', 'Account Balance', 'Interest Rate', 'Bank Account Name', 'Active'],
  },
  referral_partners_DC: {
    filename: 'referral-partners-export',
    columns: ['partner_name', 'partner_type', 'contact_email', 'contact_phone', 'commission_percentage', 'active'],
    headers: ['Partner Name', 'Partner Type', 'Contact Email', 'Contact Phone', 'Commission Percentage', 'Active'],
  },
  vendor_costs_DC: {
    filename: 'vendor-costs-export',
    columns: ['vendor_name', 'cost_type', 'amount', 'date', 'active'],
    headers: ['Vendor Name', 'Cost Type', 'Amount', 'Date', 'Active'],
  },
  payment_type_DC: {
    filename: 'payment-types-export',
    columns: ['payment_method', 'description', 'active'],
    headers: ['Payment Method', 'Description', 'Active'],
  },
  monthly_interchange_income_DC: {
    filename: 'monthly-interchange-income-export',
    columns: ['company_name', 'interchange_company', 'interchange_amount', 'invoice_number', 'payment_date', 'transaction_count', 'interchange_rate', 'active'],
    headers: ['Company', 'Interchange Company', 'Interchange Amount', 'Invoice Number', 'Payment Date', 'Transaction Count', 'Interchange Rate', 'Active'],
  },
};
