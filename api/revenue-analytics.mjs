// Test basic functionality first
console.log('🚀 API function loaded');

// Check if axios is available
let axios;
try {
  axios = await import('axios');
  console.log('✅ Axios imported successfully');
} catch (error) {
  console.error('❌ Failed to import axios:', error.message);
  axios = null;
}

// Zoho Analytics API configuration - use the same variable names as the frontend
const ZOHO_CLIENT_ID = process.env.REACT_APP_ZOHO_CLIENT_ID || process.env.ZOHO_CLIENT_ID;
const ZOHO_CLIENT_SECRET = process.env.REACT_APP_ZOHO_CLIENT_SECRET || process.env.ZOHO_CLIENT_SECRET;
const ZOHO_REFRESH_TOKEN = process.env.REACT_APP_ZOHO_REFRESH_TOKEN || process.env.ZOHO_REFRESH_TOKEN;
const ZOHO_ORG_ID = process.env.REACT_APP_ZOHO_ORG_ID || process.env.ZOHO_ORG_ID;
const ZOHO_API_BASE_URL = process.env.REACT_APP_ZOHO_API_BASE_URL || process.env.ZOHO_API_BASE_URL || 'https://analyticsapi.zoho.com/api/v2';

// Debug logging
console.log('🔍 Environment variables loaded:');
console.log('ZOHO_CLIENT_ID:', ZOHO_CLIENT_ID ? 'SET' : 'NOT_SET');
console.log('ZOHO_CLIENT_SECRET:', ZOHO_CLIENT_SECRET ? 'SET' : 'NOT_SET');
console.log('ZOHO_REFRESH_TOKEN:', ZOHO_REFRESH_TOKEN ? 'SET' : 'NOT_SET');
console.log('ZOHO_ORG_ID:', ZOHO_ORG_ID ? 'SET' : 'NOT_SET');
console.log('ZOHO_API_BASE_URL:', ZOHO_API_BASE_URL);

// Cache for access token
let accessToken = null;
let tokenExpiry = 0;

/**
 * Get or refresh Zoho access token
 */
async function getAccessToken() {
  const now = Date.now();
  
  // Return cached token if still valid (with 5 minute buffer)
  if (accessToken && tokenExpiry > now + 300000) {
    return accessToken;
  }

  try {
    console.log('🔄 Refreshing Zoho access token...');
    
    const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
      params: {
        refresh_token: ZOHO_REFRESH_TOKEN,
        client_id: ZOHO_CLIENT_ID,
        client_secret: ZOHO_CLIENT_SECRET,
        grant_type: 'refresh_token'
      }
    });

    accessToken = response.data.access_token;
    tokenExpiry = now + (response.data.expires_in * 1000);
    
    console.log('✅ Access token refreshed successfully');
    return accessToken;
  } catch (error) {
    console.error('❌ Failed to refresh access token:', error.message);
    throw new Error(`Failed to refresh access token: ${error.message}`);
  }
}

/**
 * Execute a query against Zoho Analytics API
 */
async function executeQuery(query) {
  try {
    const token = await getAccessToken();
    
    const payload = {
      ZOHO_ORG_ID: ZOHO_ORG_ID,
      query: query
    };

    console.log('🚀 Executing query against Zoho Analytics API...');
    
    const response = await axios({
      method: 'POST',
      url: `${ZOHO_API_BASE_URL}/query`,
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
      },
      data: payload
    });

    console.log('✅ Query executed successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Query execution failed:', error.message);
    throw new Error(`Query execution failed: ${error.message}`);
  }
}

/**
 * Build a simple query using the revenue_master_view table
 */
function buildComplexQuery(filters = {}) {
  // Build WHERE clause based on filters
  const conditions = [];
  
  // Default to last 12 months if no date range specified
  if (filters.dateRange?.start) {
    conditions.push(`created_at >= '${filters.dateRange.start}'`);
  } else {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    conditions.push(`created_at >= '${twelveMonthsAgo.toISOString().split('T')[0]}'`);
  }
  
  if (filters.dateRange?.end) {
    conditions.push(`created_at <= '${filters.dateRange.end}'`);
  }
  
  // Employee filter
  if (filters.employeeId) {
    conditions.push(`employee_name IS NOT NULL`);
  }
  
  // Company filter
  if (filters.companyId) {
    conditions.push(`company_id = ${filters.companyId}`);
  }
  
  // Company name filter
  if (filters.companyName) {
    conditions.push(`company = '${filters.companyName}'`);
  }
  
  // Referral partner filter
  if (filters.referralPartnerName) {
    conditions.push(`referral_partner_name = '${filters.referralPartnerName}'`);
  }
  
  // Payment method filter
  if (filters.paymentMethodId) {
    conditions.push(`payment_method_id = ${filters.paymentMethodId}`);
  }
  
  // Status filter
  if (filters.status) {
    conditions.push(`api_transaction_status = '${filters.status}'`);
  }
  
  // Only revenue transactions
  conditions.push(`Is_Revenue_Transaction = 1`);
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  return `
    SELECT 
      id,
      disbursement_id,
      payment_method_id,
      payment_method_payee_fee,
      payment_method_payor_fee,
      api_transaction_status,
      created_at,
      updated_at,
      company_id,
      company,
      payment_method_description,
      employee_name,
      employee_commission_percentage,
      employee_commission_amount,
      referral_partner_name,
      referral_partner_commission_percentage,
      referral_partner_commission_amount,
      company_upcharge_fee_amount,
      company_upcharge_fee_percentage,
      monthly_interchange_income_amount,
      Gross_Revenue,
      Total_Vendor_Cost,
      Total_Employee_Commission,
      Total_Referral_Partner_Commission,
      Total_Company_Upcharge_Fees,
      Net_Profit,
      Is_Revenue_Transaction,
      Transaction_Month,
      Transaction_Year
    FROM revenue_master_view
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT 1000
  `;
}

/**
 * Process and transform query results
 */
function processQueryResults(response) {
  if (!response?.data) {
    return [];
  }
  
  return response.data.map((record) => ({
    id: record.id || 0,
    disbursement_id: record.disbursement_id || 0,
    payment_method_id: record.payment_method_id || 0,
    payment_method_payee_fee: parseFloat(record.payment_method_payee_fee) || 0,
    payment_method_payor_fee: parseFloat(record.payment_method_payor_fee) || 0,
    api_transaction_status: record.api_transaction_status || '',
    created_at: record.created_at || '',
    updated_at: record.updated_at || '',
    company_id: record.company_id || 0,
    company: record.company || '',
    payment_method_description: record.payment_method_description || '',
    employee_name: record.employee_name || null,
    employee_commission_percentage: record.employee_commission_percentage ? parseFloat(record.employee_commission_percentage) : null,
    employee_commission_amount: record.employee_commission_amount ? parseFloat(record.employee_commission_amount) : null,
    referral_partner_name: record.referral_partner_name || null,
    referral_partner_commission_percentage: record.referral_partner_commission_percentage ? parseFloat(record.referral_partner_commission_percentage) : null,
    referral_partner_commission_amount: record.referral_partner_commission_amount ? parseFloat(record.referral_partner_commission_amount) : null,
    company_upcharge_fee_amount: record.company_upcharge_fee_amount ? parseFloat(record.company_upcharge_fee_amount) : null,
    company_upcharge_fee_percentage: record.company_upcharge_fee_percentage ? parseFloat(record.company_upcharge_fee_percentage) : null,
    monthly_interchange_income_amount: record.monthly_interchange_income_amount ? parseFloat(record.monthly_interchange_income_amount) : null,
    Gross_Revenue: parseFloat(record.Gross_Revenue) || 0,
    Total_Vendor_Cost: parseFloat(record.Total_Vendor_Cost) || 0,
    Total_Employee_Commission: parseFloat(record.Total_Employee_Commission) || 0,
    Total_Referral_Partner_Commission: parseFloat(record.Total_Referral_Partner_Commission) || 0,
    Total_Company_Upcharge_Fees: parseFloat(record.Total_Company_Upcharge_Fees) || 0,
    Net_Profit: parseFloat(record.Net_Profit) || 0,
    Is_Revenue_Transaction: parseInt(record.Is_Revenue_Transaction) || 0,
    Transaction_Month: record.Transaction_Month || '',
    Transaction_Year: record.Transaction_Year || ''
  }));
}

/**
 * Calculate summary statistics
 */
function calculateSummary(data) {
  const summary = {
    totalTransactions: data.length,
    totalRevenue: 0,
    totalEmployeeCommissions: 0,
    totalReferralCommissions: 0,
    totalVendorCosts: 0,
    totalUpcharges: 0,
    netProfit: 0,
    averageRevenuePerTransaction: 0
  };
  
  data.forEach(record => {
    summary.totalRevenue += record.Gross_Revenue;
    summary.totalEmployeeCommissions += record.Total_Employee_Commission;
    summary.totalReferralCommissions += record.Total_Referral_Partner_Commission;
    summary.totalVendorCosts += record.Total_Vendor_Cost;
    summary.totalUpcharges += record.Total_Company_Upcharge_Fees;
    summary.netProfit += record.Net_Profit;
  });
  
  summary.averageRevenuePerTransaction = data.length > 0 
    ? summary.totalRevenue / data.length 
    : 0;
  
  return summary;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Revenue Analytics API called - TESTING');
    
    // Return test data to verify API is working
    const testData = [
      {
        id: 1,
        disbursement_id: 1001,
        payment_method_id: 1,
        payment_method_payee_fee: 25.00,
        payment_method_payor_fee: 15.00,
        api_transaction_status: 'completed',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
        company_id: 1,
        company: 'Test Company A',
        payment_method_description: 'ACH',
        employee_name: 'John Doe',
        employee_commission_percentage: 10.0,
        employee_commission_amount: 4.00,
        referral_partner_name: 'Partner A',
        referral_partner_commission_percentage: 5.0,
        referral_partner_commission_amount: 2.00,
        company_upcharge_fee_amount: 5.00,
        company_upcharge_fee_percentage: 2.5,
        monthly_interchange_income_amount: 10.00,
        Gross_Revenue: 40.00,
        Total_Vendor_Cost: 8.00,
        Total_Employee_Commission: 4.00,
        Total_Referral_Partner_Commission: 2.00,
        Total_Company_Upcharge_Fees: 5.00,
        Net_Profit: 21.00,
        Is_Revenue_Transaction: 1,
        Transaction_Month: '2024-01',
        Transaction_Year: '2024'
      },
      {
        id: 2,
        disbursement_id: 1002,
        payment_method_id: 2,
        payment_method_payee_fee: 30.00,
        payment_method_payor_fee: 20.00,
        api_transaction_status: 'completed',
        created_at: '2024-01-16T14:45:00Z',
        updated_at: '2024-01-16T14:45:00Z',
        company_id: 2,
        company: 'Test Company B',
        payment_method_description: 'Check',
        employee_name: 'Jane Smith',
        employee_commission_percentage: 12.0,
        employee_commission_amount: 6.00,
        referral_partner_name: 'Partner B',
        referral_partner_commission_percentage: 3.0,
        referral_partner_commission_amount: 1.50,
        company_upcharge_fee_amount: 7.50,
        company_upcharge_fee_percentage: 3.0,
        monthly_interchange_income_amount: 15.00,
        Gross_Revenue: 50.00,
        Total_Vendor_Cost: 10.00,
        Total_Employee_Commission: 6.00,
        Total_Referral_Partner_Commission: 1.50,
        Total_Company_Upcharge_Fees: 7.50,
        Net_Profit: 25.00,
        Is_Revenue_Transaction: 1,
        Transaction_Month: '2024-01',
        Transaction_Year: '2024'
      }
    ];

    const summary = {
      totalTransactions: testData.length,
      totalRevenue: 90.00,
      totalEmployeeCommissions: 10.00,
      totalReferralCommissions: 3.50,
      totalVendorCosts: 18.00,
      totalUpcharges: 12.50,
      netProfit: 46.00,
      averageRevenuePerTransaction: 45.00
    };

    const result = {
      data: testData,
      summary: summary,
      total: testData.length,
      page: 1,
      limit: 50,
      totalPages: 1,
      message: 'Test data returned successfully'
    };

    console.log('✅ Test data returned successfully');
    
    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Revenue Analytics API error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to execute revenue analytics query',
      details: error.message,
      stack: error.stack
    });
  }
}
