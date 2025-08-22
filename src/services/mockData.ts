import { 
  ApiResponse, 
  CompanyUpchargeFee, 
  EmployeeCommission, 
  MonthlyInterchangeIncome, 
  MonthlyInterestRevenue, 
  ReferralPartner,
  InsuranceCompany,
  PaymentModality,
  SearchParams 
} from './apiTypes';

// Mock lookup data from CSV files
const insuranceCompanies: InsuranceCompany[] = [
  { id: 48, company: "Superior Underwriting", active: true, created_at: "10/07/2025 13:21:59", updated_at: "" },
  { id: 47, company: "Snap Insurance Service, LLC", active: true, created_at: "30/06/2025 12:27:12", updated_at: "" },
  { id: 46, company: "Trisura Insurance Company Verve Services of GA", active: true, created_at: "24/06/2025 08:10:46", updated_at: "" },
  { id: 45, company: "Excellent Insurance Services", active: true, created_at: "23/06/2025 08:21:17", updated_at: "" },
  { id: 44, company: "Trisura Insurance Company Verve Services PA", active: true, created_at: "23/06/2025 07:04:27", updated_at: "" },
  { id: 43, company: "Trisura Insurance Company Verve Services AL", active: true, created_at: "23/06/2025 07:01:44", updated_at: "" },
  { id: 42, company: "Apollo Insurance", active: true, created_at: "23/06/2025 01:59:50", updated_at: "" },
  { id: 41, company: "Homestate County Mutual Insurance - Claims - 12", active: true, created_at: "21/05/2025 09:01:11", updated_at: "" },
  { id: 40, company: "Trexis One Insurance - Claims - 14", active: true, created_at: "21/05/2025 08:39:33", updated_at: "" },
  { id: 39, company: "Trexis Insurance - Claims - 11", active: true, created_at: "21/05/2025 06:54:33", updated_at: "" },
  { id: 38, company: "Basica Insurance Services", active: true, created_at: "20/05/2025 12:46:53", updated_at: "" },
  { id: 37, company: "Ocean Harbor Insurance Casualty Ins.", active: true, created_at: "26/02/2025 11:06:48", updated_at: "" },
  { id: 36, company: "Homestate County Mutual - PR", active: true, created_at: "13/02/2025 14:34:13", updated_at: "" },
  { id: 35, company: "Trexis One Ins. - Prem. Refund", active: true, created_at: "13/02/2025 13:49:39", updated_at: "" },
  { id: 34, company: "Trexis Ins. - Premium Refunds", active: true, created_at: "04/02/2025 14:09:23", updated_at: "" },
  { id: 33, company: "Arizona Auto Ins. - Premium Refunds", active: true, created_at: "04/02/2025 12:54:34", updated_at: "" },
  { id: 32, company: "Save Money Car Insurance", active: true, created_at: "01/10/2024 09:49:53", updated_at: "" },
  { id: 31, company: "Mendakota Casualty Company - Claims", active: true, created_at: "20/08/2024 12:00:15", updated_at: "" },
  { id: 30, company: "Home State County Mutual - Claims", active: true, created_at: "20/08/2024 11:53:23", updated_at: "" },
  { id: 29, company: "Mendakota Insurance Company - Claims", active: true, created_at: "20/08/2024 09:56:41", updated_at: "" },
  { id: 28, company: "Mendota - Agent Incentive", active: true, created_at: "19/08/2024 10:24:02", updated_at: "" },
  { id: 27, company: "Mendota Insurance Company - Claims", active: true, created_at: "19/08/2024 07:18:13", updated_at: "" },
  { id: 26, company: "Core Specialty Equine", active: true, created_at: "15/08/2024 09:58:15", updated_at: "" },
  { id: 25, company: "National Automotive Programs", active: true, created_at: "13/06/2024 07:51:49", updated_at: "" },
  { id: 24, company: "New Live Company", active: true, created_at: "26/03/2024 00:23:00", updated_at: "" },
  { id: 23, company: "Advantage Auto MGA, LLC", active: true, created_at: "28/11/2023 13:34:19", updated_at: "" },
  { id: 22, company: "JJ Realign Claims Account", active: true, created_at: "28/08/2023 10:25:59", updated_at: "" },
  { id: 21, company: "J&J Lloyds PT", active: true, created_at: "28/08/2023 10:22:05", updated_at: "" },
  { id: 20, company: "J&J Premium Trust", active: true, created_at: "28/08/2023 10:16:45", updated_at: "" },
  { id: 19, company: "MAHESH_TEST_COMPANY", active: true, created_at: "11/01/2023 14:25:19", updated_at: "" },
  { id: 18, company: "LIVE_COMPANY", active: true, created_at: "12/12/2022 14:53:41", updated_at: "" },
  { id: 17, company: "GLACIER INSURANCE COMPANY", active: true, created_at: "06/12/2022 01:10:39", updated_at: "" },
  { id: 16, company: "INSURAXIS", active: true, created_at: "05/05/2022 15:44:05", updated_at: "" }
];

const paymentModalities: PaymentModality[] = [
  { id: 1, payment_method: "ACH" },
  { id: 2, payment_method: "Postal Check" },
  { id: 3, payment_method: "Virtual Card" },
  { id: 4, payment_method: "Instant Deposit" },
  { id: 5, payment_method: "Digital Check" },
  { id: 6, payment_method: "Venmo" },
  { id: 7, payment_method: "Paypal" },
  { id: 998, payment_method: "VC Interchange" },
  { id: 999, payment_method: "Interest Income" }
];

// Mock main table data
const companyUpchargeFees: CompanyUpchargeFee[] = [
  {
    id: 1,
    company_id: 40,
    payment_method_id: 1,
    base_fee_upcharge: 2,
    multiplier_upcharge: 0.005,
    max_fee_upcharge: 5,
    effective_start_date: "01/01/2024",
    effective_end_date: "",
    active: true,
    created_at: "28/06/2025",
    updated_at: "28/06/2025",
    company_name: "Trexis One Insurance - Claims - 14",
    payment_method_name: "ACH"
  }
];

const employeeCommissions: EmployeeCommission[] = [
  {
    employee_name: "Skip",
    employee_id: 123,
    payment_method_id: undefined,
    id: 1,
    company_id: undefined,
    commission_amount: 0,
    commission_percentage: 20,
    effective_start_date: "03 Dec 2024 00:00:00",
    effective_end_date: "",
    active: true,
    description: "Global commission - all payment methods and companies",
    created_at: "29/06/2025",
    updated_at: "29/06/2025"
  },
  {
    employee_name: "Cameron",
    employee_id: 222,
    payment_method_id: undefined,
    id: 2,
    company_id: undefined,
    commission_amount: 0,
    commission_percentage: 5,
    effective_start_date: "03 Dec 2024 00:00:00",
    effective_end_date: "",
    active: true,
    description: "Global commission - all payment methods and companies",
    created_at: "29/06/2025",
    updated_at: "29/06/2025"
  },
  {
    employee_name: "Skip",
    employee_id: 123,
    payment_method_id: 998,
    id: 3,
    company_id: undefined,
    commission_amount: 0,
    commission_percentage: 20,
    effective_start_date: "03 Dec 2024 00:00:00",
    effective_end_date: "",
    active: true,
    description: "Global commission - all payment methods and companies",
    created_at: "",
    updated_at: "",
    payment_method_name: "VC Interchange"
  }
];

const monthlyInterchangeIncome: MonthlyInterchangeIncome[] = [
  {
    id: 1,
    company_id: 23,
    interchange_company: "Transcard",
    interchange_amount: 2500,
    invoice_number: "TC-2024-12-001",
    payment_date: "31 Dec 2024 00:00:00",
    transaction_period_start: "01 Dec 2024 00:00:00",
    transaction_period_end: "31 Dec 2024 00:00:00",
    transaction_count: 850,
    interchange_rate: 0.0175,
    notes: "December 2024 interchange for Company 23",
    posted_date: "31 Dec 2024 00:00:00",
    active: true,
    created_at: "31 Dec 2024 00:00:00",
    updated_at: "31 Dec 2024 00:00:00",
    company_name: "Advantage Auto MGA, LLC"
  },
  {
    id: 2,
    company_id: 15,
    interchange_company: "Transcard",
    interchange_amount: 1200,
    invoice_number: "TC-2024-12-001",
    payment_date: "31 Dec 2024 00:00:00",
    transaction_period_start: "01 Dec 2024 00:00:00",
    transaction_period_end: "31 Dec 2024 00:00:00",
    transaction_count: 400,
    interchange_rate: 0.0175,
    notes: "December 2024 interchange for Company 15",
    posted_date: "31 Dec 2024 00:00:00",
    active: true,
    created_at: "31 Dec 2024 00:00:00",
    updated_at: "31 Dec 2024 00:00:00",
    company_name: "National Automotive Programs"
  },
  {
    id: 3,
    company_id: 8,
    interchange_company: "Transcard",
    interchange_amount: 800,
    invoice_number: "TC-2024-12-001",
    payment_date: "31 Dec 2024 00:00:00",
    transaction_period_start: "01 Dec 2024 00:00:00",
    transaction_period_end: "31 Dec 2024 00:00:00",
    transaction_count: 300,
    interchange_rate: 0.0175,
    notes: "December 2024 interchange for Company 8",
    posted_date: "31 Dec 2024 00:00:00",
    active: true,
    created_at: "31 Dec 2024 00:00:00",
    updated_at: "31 Dec 2024 00:00:00",
    company_name: "New Live Company"
  }
];

const monthlyInterestRevenue: MonthlyInterestRevenue[] = [
  {
    id: 1,
    company_id: 23,
    interest_period_start: "01 Dec, 2024 00:00:00",
    interest_period_end: "12-31-2024",
    interest_amount: 1250,
    account_balance: 850000,
    interest_rate: 0.0175,
    bank_account_name: "Primary",
    notes: "1",
    posted_date: "01-01-2025",
    active: true,
    company_name: "Advantage Auto MGA, LLC"
  },
  {
    id: 2,
    company_id: 26,
    interest_period_start: "01 Dec, 2024 00:00:00",
    interest_period_end: "12-31-2024",
    interest_amount: 890.50,
    account_balance: 612000,
    interest_rate: 0.0175,
    bank_account_name: "Primary",
    posted_date: "01-01-2025",
    active: true,
    company_name: "Core Specialty Equine"
  }
];

const referralPartners: ReferralPartner[] = [
  {
    id: 4,
    partner_name: "Bubba",
    partner_type: "Insurance Company",
    contact_email: "partnerships@nationalclaims.com",
    contact_phone: "555-0104",
    commission_percentage: 20,
    active: true,
    created_at: "06/28/2025",
    updated_at: "06/28/2025"
  }
];

// Helper function to get company name by ID
const getCompanyName = (companyId: number): string => {
  const company = insuranceCompanies.find(c => c.id === companyId);
  return company ? company.company : `Company ${companyId}`;
};

// Helper function to get payment method name by ID
const getPaymentMethodName = (paymentMethodId: number): string => {
  const paymentMethod = paymentModalities.find(p => p.id === paymentMethodId);
  return paymentMethod ? paymentMethod.payment_method : `Payment Method ${paymentMethodId}`;
};

// Generic function to filter and paginate data
const filterAndPaginate = <T>(
  data: T[],
  params?: SearchParams
): ApiResponse<T> => {
  let filteredData = [...data];
  
  // Apply search filter
  if (params?.search) {
    const searchLower = params.search.toLowerCase();
    filteredData = filteredData.filter(item => 
      Object.values(item as any).some(value => 
        String(value).toLowerCase().includes(searchLower)
      )
    );
  }
  
  // Apply sorting
  if (params?.sortBy) {
    filteredData.sort((a, b) => {
      const aVal = (a as any)[params.sortBy!];
      const bVal = (b as any)[params.sortBy!];
      
      if (aVal < bVal) return params.sortOrder === 'desc' ? 1 : -1;
      if (aVal > bVal) return params.sortOrder === 'desc' ? -1 : 1;
      return 0;
    });
  }
  
  // Apply pagination
  const page = params?.page || 1;
  const limit = params?.limit || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedData = filteredData.slice(startIndex, endIndex);
  
  return {
    data: paginatedData,
    total: filteredData.length,
    page,
    limit,
    success: true
  };
};

export const mockApi = {
  // Lookup table APIs
  getInsuranceCompanies: async (params?: SearchParams): Promise<ApiResponse<InsuranceCompany>> => {
    return filterAndPaginate(insuranceCompanies, params);
  },

  getPaymentModalities: async (params?: SearchParams): Promise<ApiResponse<PaymentModality>> => {
    return filterAndPaginate(paymentModalities, params);
  },

  // Main table APIs
  getCompanyUpchargeFees: async (params?: SearchParams): Promise<ApiResponse<CompanyUpchargeFee>> => {
    return filterAndPaginate(companyUpchargeFees, params);
  },

  getEmployeeCommissions: async (params?: SearchParams): Promise<ApiResponse<EmployeeCommission>> => {
    return filterAndPaginate(employeeCommissions, params);
  },

  getMonthlyInterchangeIncome: async (params?: SearchParams): Promise<ApiResponse<MonthlyInterchangeIncome>> => {
    return filterAndPaginate(monthlyInterchangeIncome, params);
  },

  getMonthlyInterestRevenue: async (params?: SearchParams): Promise<ApiResponse<MonthlyInterestRevenue>> => {
    return filterAndPaginate(monthlyInterestRevenue, params);
  },

  getReferralPartners: async (params?: SearchParams): Promise<ApiResponse<ReferralPartner>> => {
    return filterAndPaginate(referralPartners, params);
  },

  // Generic CRUD operations
  getRecords: async <T>(tableName: string, params?: SearchParams): Promise<ApiResponse<T>> => {
    switch (tableName) {
      case 'company_upcharge_fees_DC':
        return mockApi.getCompanyUpchargeFees(params) as Promise<ApiResponse<T>>;
      case 'employee_commissions_DC':
        return mockApi.getEmployeeCommissions(params) as Promise<ApiResponse<T>>;
      case 'monthly_interchange_income_DC':
        return mockApi.getMonthlyInterchangeIncome(params) as Promise<ApiResponse<T>>;
      case 'monthly_interest_revenue_DC':
        return mockApi.getMonthlyInterestRevenue(params) as Promise<ApiResponse<T>>;
      case 'referral_partners_DC':
        return mockApi.getReferralPartners(params) as Promise<ApiResponse<T>>;
      case 'insurance_companies_DC':
        return mockApi.getInsuranceCompanies(params) as Promise<ApiResponse<T>>;
      case 'payment_modalities':
        return mockApi.getPaymentModalities(params) as Promise<ApiResponse<T>>;
      default:
        throw new Error(`Unknown table: ${tableName}`);
    }
  },

  // CRUD operations for each table
  createRecord: async <T>(tableName: string, data: any): Promise<T> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newRecord = {
      ...data,
      id: Math.floor(Math.random() * 10000),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return newRecord as T;
  },

  updateRecord: async <T>(tableName: string, id: string | number, data: any): Promise<T> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const updatedRecord = {
      ...data,
      id,
      updated_at: new Date().toISOString()
    };
    
    return updatedRecord as T;
  },

  deleteRecord: async (tableName: string, id: string | number): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    // In a real implementation, this would delete the record
  },

  searchRecords: async <T>(tableName: string, query: string, params?: SearchParams): Promise<ApiResponse<T>> => {
    const searchParams = { ...params, search: query };
    return mockApi.getRecords<T>(tableName, searchParams);
  },

  exportRecords: async (tableName: string, format: 'csv' | 'excel' = 'csv', params?: SearchParams): Promise<Blob> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const csvContent = `export_${tableName}_${new Date().toISOString()}.${format}`;
    return new Blob([csvContent], { type: 'text/csv' });
  },

  getTableSchema: async (tableName: string): Promise<any> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      tableName,
      fields: [
        { name: 'id', type: 'number', required: true },
        { name: 'created_at', type: 'datetime', required: true },
        { name: 'updated_at', type: 'datetime', required: true }
      ]
    };
  },

  healthCheck: async (): Promise<{ status: string; timestamp: string }> => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString()
    };
  }
};
