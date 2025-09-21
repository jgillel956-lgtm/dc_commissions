import { query } from './connection.mjs';
import { getAccessTokenShared, withTokenRetry } from './getAccessTokenShared.mjs';
import axios from 'axios';

// Table ID mapping from zoho-analytics.mjs
const TABLE_IDS = {
  'company_upcharge_fees_DC': '2103833000016814240',
  'employee_commissions_DC': '2103833000016814379',
  'monthly_interchange_income_DC': '2103833000018129022',
  'monthly_interest_revenue_DC': '2103833000016914505',
  'referral_partners_DC': '2103833000016814002',
  'insurance_companies_DC': '2103833000004379120',
  'vendor_costs_DC': '2103833000016817002',
  'payment_modalities': '2103833000011978002',
  'revenue_master_view': '2103833000016814601'
};

// DC-aware hosts
const DC = process.env.ZOHO_DC || "com";
const ANALYTICS_HOST = `https://analyticsapi.zoho.${DC}`;
const BASE_URL = `${ANALYTICS_HOST}/restapi/v2`;

function headersFor(token, orgId) {
  const h = { 
    Authorization: `Zoho-oauthtoken ${token}`, 
    'Content-Type': 'application/json' 
  };
  if (orgId) h['ZANALYTICS-ORGID'] = orgId;
  return h;
}

// Helper function to safely parse dates
function safeParseDate(dateString) {
  if (!dateString || dateString === '' || dateString === 'null' || dateString === 'undefined') {
    return null;
  }
  
  try {
    const date = new Date(dateString);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn(`⚠️ Invalid date string: ${dateString}`);
      return null;
    }
    return date;
  } catch (error) {
    console.warn(`⚠️ Error parsing date: ${dateString}`, error.message);
    return null;
  }
}

// Data transformation functions for each table
const dataTransformers = {
  company_upcharge_fees_DC: (row) => ({
    id: parseInt(row.id) || null,
    company_id: parseInt(row.company_id) || null,
    payment_method_id: parseInt(row.payment_method_id) || null,
    base_fee_upcharge: parseFloat(row.base_fee_upcharge) || null,
    multiplier_upcharge: parseFloat(row.multiplier_upcharge) || null,
    max_fee_upcharge: parseFloat(row.max_fee_upcharge) || null,
    effective_start_date: safeParseDate(row.effective_start_date),
    effective_end_date: safeParseDate(row.effective_end_date),
    active: row.active === 'TRUE' || row.active === true,
    created_at: safeParseDate(row.created_at),
    updated_at: safeParseDate(row.updated_at)
  }),

  employee_commissions_DC: (row) => {
    const transformed = {
      employee_name: row.employee_name || null,
      employee_id: parseInt(row.employee_id) || parseInt(row.employee_ID) || null,
      payment_method_id: parseInt(row.payment_method_id) || parseInt(row.payment_method_ID) || null,
      company_id: parseInt(row.company_id) || parseInt(row.company_ID) || null,
      commission_amount: parseFloat(row.commission_amount?.replace(/[$,]/g, '')) || null,
      commission_percentage: parseFloat(row.commission_percentage) || null,
      effective_start_date: safeParseDate(row.effective_start_date),
      effective_end_date: safeParseDate(row.effective_end_date),
      active: row.active || null,
      description: row.description || null,
      created_at: safeParseDate(row.created_at),
      updated_at: safeParseDate(row.updated_at)
    };
    
    // Only include ID if it exists in the source data (for updates)
    const sourceId = parseInt(row.id) || parseInt(row.ID) || parseInt(row.Id);
    if (sourceId) {
      transformed.id = sourceId;
    }
    
    return transformed;
  },

  insurance_companies_DC: (row) => ({
    id: parseInt(row.id) || null,
    company: row.company || null,
    active: row.active === 'true' || row.active === true,
    created_at: safeParseDate(row.created_at),
    updated_at: safeParseDate(row.updated_at),
    address: row.address || null,
    tin: row.tin || null,
    merchant_id: row.merchant_id || null,
    transaction_key: row.transaction_key || null,
    id_country: parseInt(row.id_country) || null,
    id_state: parseInt(row.id_state) || null,
    city: row.city || null,
    zip_code: row.zip_code || null,
    phone_number: row.phone_number || null,
    fax_number: row.fax_number || null,
    pay_confirmation: row.pay_confirmation === 'true' || row.pay_confirmation === true,
    ftp_address: row.ftp_address || null,
    ftp_user: row.ftp_user || null,
    ftp_password: row.ftp_password || null,
    account_holder_id: parseInt(row.account_holder_id) || null,
    signature_ach: row.signature_ach || null,
    signature_pd: row.signature_pd || null,
    signature_dpay: row.signature_dpay || null,
    signature_af_claim: row.signature_af_claim || null,
    signature_af_claimant: row.signature_af_claimant || null,
    signature_af_startpay: row.signature_af_startpay || null,
    signature_af_selectpay: row.signature_af_selectpay || null,
    signature_af_authpay: row.signature_af_authpay || null,
    img: row.img || null,
    email: row.email || null,
    modipay_inhouse_checks_confirmation: row.modipay_inhouse_checks_confirmation === 'true' || row.modipay_inhouse_checks_confirmation === true,
    username: row.username || null,
    password: row.password || null,
    producer_id: parseInt(row.producer_id) || null,
    payment_email_expires_in: parseInt(row.payment_email_expires_in) || null,
    enable_payment_email_expiration: row.enable_payment_email_expiration === 'true' || row.enable_payment_email_expiration === true,
    pay_disburse: row.pay_disburse === 'true' || row.pay_disburse === true,
    file_1099_by_disburse_cloud: row.file_1099_by_disburse_cloud === 'true' || row.file_1099_by_disburse_cloud === true,
    tin_type: row.tin_type || null,
    webhook_url: row.webhook_url || null,
    webhook_secret: row.webhook_secret || null,
    transcard_product_id: parseInt(row.transcard_product_id) || null,
    zoho_webhook_url: row.zoho_webhook_url || null,
    checkissuing_logo_id: parseInt(row.checkissuing_logo_id) || null,
    checkissuing_funding_source_id: parseInt(row.checkissuing_funding_source_id) || null,
    isSupportEnabled: row.isSupportEnabled === 'true' || row.isSupportEnabled === true,
    logo_url: row.logo_url || null,
    useCompanyAccount: row.useCompanyAccount === 'true' || row.useCompanyAccount === true,
    company_check_logo_id: parseInt(row.company_check_logo_id) || null,
    company_check_funding_source_id: parseInt(row.company_check_funding_source_id) || null,
    enable_giact_verification: row.enable_giact_verification === 'true' || row.enable_giact_verification === true,
    instant_deposit_disclaimer: row.instant_deposit_disclaimer || null,
    instant_deposit_disclaimer_header: row.instant_deposit_disclaimer_header || null,
    is_claim_check_fields_present: row.is_claim_check_fields_present === 'true' || row.is_claim_check_fields_present === true,
    auto_approve_dc_disbursement: row.auto_approve_dc_disbursement === 'true' || row.auto_approve_dc_disbursement === true,
    email_template_folder: row.email_template_folder || null,
    email_display_name: row.email_display_name || null,
    email_custom_field: row.email_custom_field || null
  }),

  monthly_interchange_income_DC: (row) => ({
    id: parseInt(row.id) || null,
    company_id: parseInt(row.company_id) || null,
    interchange_company: row.interchange_company || null,
    interchange_amount: row.interchange_amount || null, // Keep as string for formatted currency
    invoice_number: row.invoice_number || null,
    payment_date: safeParseDate(row.payment_date),
    transaction_period_start: safeParseDate(row.transaction_period_start),
    transaction_period_end: safeParseDate(row.transaction_period_end),
    transaction_count: parseInt(row.transaction_count) || null,
    interchange_rate: parseFloat(row.interchange_rate) || null,
    notes: row.notes || null,
    posted_date: safeParseDate(row.posted_date),
    active: row.active === 'TRUE' || row.active === true,
    created_at: safeParseDate(row.created_at),
    updated_at: safeParseDate(row.updated_at)
  }),

  monthly_interest_revenue_DC: (row) => ({
    id: parseInt(row.id) || null,
    company_id: parseInt(row.company_id) || null,
    interest_period_start: safeParseDate(row.interest_period_start),
    interest_period_end: safeParseDate(row.interest_period_end),
    interest_amount: row.interest_amount || null, // Keep as string for formatted currency
    account_balance: row.account_balance || null, // Keep as string for formatted currency
    interest_rate: row.interest_rate || null, // Keep as string for formatted percentage
    bank_account_name: row.bank_account_name || null,
    notes: row.notes || null,
    posted_date: safeParseDate(row.posted_date),
    active: row.active === 'TRUE' || row.active === true,
    created_at: safeParseDate(row.created_at),
    updated_at: safeParseDate(row.updated_at)
  }),

  payment_modalities: (row) => {
    // Debug: Log payment modalities data to understand field structure
    console.log('🔍 DEBUG: Payment modalities row data:', {
      keys: Object.keys(row),
      id: row.id,
      payment_method: row.payment_method,
      description: row.description,
      active: row.active
    });
    
    return {
      id: parseInt(row.id) || null,
      payment_method: row.payment_method || null,
      description: row.description || null,
      active: row.active === 'TRUE' || row.active === true || row.active === 'true',
      created_at: safeParseDate(row.created_at),
      updated_at: safeParseDate(row.updated_at)
    };
  },

  referral_partners_DC: (row) => ({
    id: parseInt(row.id) || null,
    partner_name: row.partner_name || null,
    partner_type: row.partner_type || null,
    contact_email: row.contact_email || null,
    contact_phone: row.contact_phone || null,
    commission_percentage: parseFloat(row.commission_percentage) || null,
    active: row.active || null,
    created_at: safeParseDate(row.created_at),
    updated_at: safeParseDate(row.updated_at)
  }),

  vendor_costs_DC: (row) => {
    // Debug: Log vendor cost data to understand field structure
    console.log('🔍 DEBUG: Vendor cost row data:', {
      keys: Object.keys(row),
      amount: row.amount,
      cost_amount: row.cost_amount,
      vendor_name: row.vendor_name,
      cost_type: row.cost_type,
      payment_method_id: row.payment_method_id,
      active: row.active,
      effective_start_date: row.effective_start_date,
      effective_end_date: row.effective_end_date,
      description: row.description
    });
    
    return {
      id: parseInt(row.id) || null,
      vendor_name: row.vendor_name || null,
      cost_type: row.cost_type || null,
      payment_method_id: parseInt(row.payment_method_id) || null,
      // Map to 'amount' field as expected by frontend table configuration
      amount: parseFloat(row.amount?.replace(/[$,]/g, '')) || parseFloat(row.cost_amount?.replace(/[$,]/g, '')) || null,
      // Also keep cost_amount for revenue calculations
      cost_amount: parseFloat(row.amount?.replace(/[$,]/g, '')) || parseFloat(row.cost_amount?.replace(/[$,]/g, '')) || null,
      cost_percentage: parseFloat(row.cost_percentage) || parseFloat(row.percentage) || null,
      effective_start_date: safeParseDate(row.effective_start_date),
      effective_end_date: safeParseDate(row.effective_end_date),
      date: safeParseDate(row.date),
      description: row.description || null,
      active: row.active === 'TRUE' || row.active === true,
      created_at: safeParseDate(row.created_at),
      updated_at: safeParseDate(row.updated_at)
    };
  },

  revenue_master_view: (row) => ({
    id: parseInt(row['dt.id']) || null,
    disbursement_id: parseInt(row['dt.disbursement_id']) || null,
    payment_method_id: parseInt(row['dt.payment_method_id']) || null,
    payment_method_payee_fee: parseFloat(row['dt.payment_method_payee_fee']) || null,
    payment_method_payor_fee: parseFloat(row['dt.payment_method_payor_fee']) || null,
    api_transaction_status: row['dt.api_transaction_status'] || null,
    created_at: safeParseDate(row['dt.created_at']),
    updated_at: safeParseDate(row['dt.updated_at']),
    check_delivery_payee_fee: parseFloat(row['dt.check_delivery_payee_fee']) || null,
    check_delivery_payor_fee: parseFloat(row['dt.check_delivery_payor_fee']) || null,
    bundle_charges: parseFloat(row['dt.bundle_charges']) || null,
    postage_fee: parseFloat(row['dt.postage_fee']) || null,
    company_id: parseInt(row['d.company_id']) || null,
    disbursement_updated_at: safeParseDate(row.disbursement_updated_at),
    amount: parseFloat(row['otp.amount']?.replace(/[$,]/g, '')) || null,
    disbursement_status_id: parseInt(row['otp.disbursement_status_id']) || null,
    company: row['ic.company'] || null,
    payment_method_description: row.payment_method_description || null,
    // Enhanced vendor cost field mapping to handle various Zoho Analytics field names
    cost_amount: parseFloat(row['vc.cost_amount']?.replace(/[$,]/g, '')) || 
                 parseFloat(row.cost_amount?.replace(/[$,]/g, '')) || 
                 parseFloat(row.vendor_cost?.replace(/[$,]/g, '')) || 
                 parseFloat(row.Cost_Amount?.replace(/[$,]/g, '')) || 
                 parseFloat(row.Vendor_Cost?.replace(/[$,]/g, '')) || 
                 parseFloat(row['vendor_costs_DC.cost_amount']?.replace(/[$,]/g, '')) || null,
    cost_percentage: parseFloat(row['vc.cost_percentage']) || 
                     parseFloat(row.cost_percentage) || 
                     parseFloat(row.Cost_Percentage) || 
                     parseFloat(row.vendor_cost_percentage) || 
                     parseFloat(row['vendor_costs_DC.cost_percentage']) || null,
    vendor_name: row['vc.vendor_name'] || 
                 row.vendor_name || 
                 row.Vendor_Name || 
                 row.vendor || 
                 row['vendor_costs_DC.vendor_name'] || null,
    employee_name: row['ec.employee_name'] || null,
    employee_commission_amount: parseFloat(row.employee_commission_amount?.replace(/[$,]/g, '')) || null,
    employee_commission_percentage: parseFloat(row.employee_commission_percentage) || null,
    referral_partner_name: row.referral_partner_name || null,
    referral_partner_type: row.referral_partner_type || null,
    partner_default_rate: parseFloat(row.partner_default_rate) || null,
    company_override_rate: parseFloat(row.company_override_rate) || null,
    base_fee_upcharge: parseFloat(row['cuf.base_fee_upcharge']) || null,
    multiplier_upcharge: parseFloat(row['cuf.multiplier_upcharge']) || null,
    max_fee_upcharge: parseFloat(row['cuf.max_fee_upcharge']) || null,
    applied_employee_commission_percentage: parseFloat(row.applied_employee_commission_percentage) || null,
    applied_employee_commission_amount: parseFloat(row.applied_employee_commission_amount?.replace(/[$,]/g, '')) || null,
    applied_referral_rate: parseFloat(row.applied_referral_rate) || null,
    company_upcharge_fees: parseFloat(row.Company_Upcharge_Fees?.replace(/[$,]/g, '')) || null,
    is_revenue_transaction: row.Is_Revenue_Transaction === '1' || row.Is_Revenue_Transaction === 1,
    gross_revenue: parseFloat(row.Gross_Revenue?.replace(/[$,]/g, '')) || null,
    is_total_transaction: row.Is_Total_Transaction === '1' || row.Is_Total_Transaction === 1,
    payor_fee_revenue: parseFloat(row.Payor_Fee_Revenue?.replace(/[$,]/g, '')) || null,
    payee_fee_revenue: parseFloat(row.Payee_Fee_Revenue?.replace(/[$,]/g, '')) || null,
    total_combined_revenue: parseFloat(row.Total_Combined_Revenue?.replace(/[$,]/g, '')) || null,
    revenue_per_transaction: parseFloat(row.Revenue_Per_Transaction) || null,
    total_vendor_cost: parseFloat(row.Total_Vendor_Cost?.replace(/[$,]/g, '')) || null,
    revenue_after_upcharges: parseFloat(row.Revenue_After_Upcharges?.replace(/[$,]/g, '')) || null,
    revenue_after_operational_costs: parseFloat(row.Revenue_After_Operational_Costs?.replace(/[$,]/g, '')) || null,
    employee_commission: parseFloat(row.Employee_Commission?.replace(/[$,]/g, '')) || null,
    revenue_after_employee_commission: parseFloat(row.Revenue_After_Employee_Commission?.replace(/[$,]/g, '')) || null,
    referral_partner_commission: parseFloat(row.Referral_Partner_Commission?.replace(/[$,]/g, '')) || null,
    final_net_profit: parseFloat(row.Final_Net_Profit?.replace(/[$,]/g, '')) || null
  })
};

// Fetch data from Zoho Analytics for a specific table
async function fetchTableData(tableName, cfg, workspaceId, orgId) {
  const tableId = TABLE_IDS[tableName];
  if (!tableId) {
    throw new Error(`Table ID not found for ${tableName}`);
  }

  console.log(`🔍 Fetching data for ${tableName} with tableId: ${tableId}`);
  
  const dataUrl = `${BASE_URL}/workspaces/${workspaceId}/views/${encodeURIComponent(tableId)}/data`;
  const config = { responseFormat: "json", keyValueFormat: true };

  console.log(`🔍 API URL: ${dataUrl}`);

  const doCall = async (forcedTok) => {
    const h = headersFor(forcedTok, orgId);
    console.log(`🔍 Making API call with headers:`, Object.keys(h));
    return axios.get(dataUrl, { headers: h, params: { CONFIG: JSON.stringify(config) } });
  };

  const resp = await withTokenRetry(doCall, cfg);
  console.log(`🔍 API Response for ${tableName}:`, {
    status: resp.status,
    dataKeys: resp.data ? Object.keys(resp.data) : 'no data',
    dataLength: resp.data?.data?.length || 0,
    fullResponse: resp.data
  });
  
  return resp.data?.data || [];
}

// Sync data for a specific table
export async function syncTableData(tableName, syncType = 'full') {
  const startTime = Date.now();
  
  try {
    console.log(`🔄 Starting sync for ${tableName}...`);
    
    // Get Zoho credentials
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN || process.env.REACT_APP_ZOHO_REFRESH_TOKEN;
    const clientId = process.env.ZOHO_CLIENT_ID || process.env.REACT_APP_ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET || process.env.REACT_APP_ZOHO_CLIENT_SECRET;
    const workspaceId = process.env.ZOHO_WORKSPACE_ID || process.env.REACT_APP_ZOHO_WORKSPACE_ID;
    const orgId = process.env.ZOHO_ORG_ID || process.env.REACT_APP_ZOHO_ORG_ID;
    
    if (!refreshToken || !clientId || !clientSecret || !workspaceId || !orgId) {
      throw new Error("Zoho Analytics credentials not configured");
    }
    
    const cfg = { refreshToken, clientId, clientSecret };
    
    // Fetch data from Zoho Analytics
    const rawData = await fetchTableData(tableName, cfg, workspaceId, orgId);
    console.log(`📊 Fetched ${rawData.length} rows from Zoho Analytics for ${tableName}`);
    
    // Debug: Log first few records to see what we're getting
    if (rawData.length > 0) {
      console.log(`🔍 Sample data for ${tableName}:`, {
        firstRecord: rawData[0],
        totalRecords: rawData.length,
        sampleIds: rawData.slice(0, 5).map(r => r.id || r.ID || 'no-id'),
        allKeys: rawData.length > 0 ? Object.keys(rawData[0]) : []
      });
    } else {
      console.log(`⚠️ No data returned from Zoho Analytics for ${tableName}`);
    }
    
    if (rawData.length === 0) {
      console.log(`⚠️ No data found for ${tableName}`);
      return {
        tableName,
        recordsFetched: 0,
        recordsInserted: 0,
        recordsUpdated: 0,
        durationSeconds: Math.round((Date.now() - startTime) / 1000)
      };
    }
    
    // Transform data
    const transformer = dataTransformers[tableName];
    if (!transformer) {
      throw new Error(`No transformer found for table ${tableName}`);
    }
    
    const transformedData = rawData.map((row, index) => {
      const transformed = transformer(row);
      // If no ID is available, generate a synthetic one based on index and table name
      if (transformed.id === null || transformed.id === undefined) {
        // Generate a simple ID that fits within INTEGER range (max 2,147,483,647)
        transformed.id = 1000000 + index; // Start from 1,000,000 and increment
        console.log(`🔧 Generated synthetic ID ${transformed.id} for ${tableName} record ${index}`);
      }
      return transformed;
    });
    console.log(`🔄 Transformed ${transformedData.length} valid rows for ${tableName}`);
    
    // Debug: Log transformation results
    if (transformedData.length > 0) {
      console.log(`🔍 Transformed data sample for ${tableName}:`, {
        firstTransformed: transformedData[0],
        totalTransformed: transformedData.length,
        sampleIds: transformedData.slice(0, 5).map(r => r.id)
      });
    }
    
    // Debug: Check for transformation failures
    const failedTransformations = rawData.length - transformedData.length;
    if (failedTransformations > 0) {
      console.log(`⚠️ ${failedTransformations} rows failed transformation for ${tableName}`);
    }
    
    // Clear existing data if full sync
    if (syncType === 'full') {
      await query(`DELETE FROM ${tableName}`);
      console.log(`🗑️ Cleared existing data for ${tableName}`);
    }
    
    // Insert/update data
    let insertedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    let errorDetails = [];
    
    console.log(`🔄 Starting database operations for ${tableName} with ${transformedData.length} records`);
    
    for (const row of transformedData) {
      try {
        // Special handling for employee_commissions_DC with SERIAL ID
        if (tableName === 'employee_commissions_DC' && !row.id) {
          // Insert new record without ID (let SERIAL auto-generate)
          const insertFields = Object.keys(row);
          const insertValues = insertFields.map((_, index) => `$${index + 1}`);
          const insertQuery = `INSERT INTO ${tableName} (${insertFields.join(', ')}) VALUES (${insertValues.join(', ')})`;
          const insertParams = insertFields.map(field => row[field]);
          
          await query(insertQuery, insertParams);
          insertedCount++;
        } else {
          // Standard logic for other tables or records with IDs
          const existing = await query(`SELECT id FROM ${tableName} WHERE id = $1`, [row.id]);
          
          if (existing.rows.length > 0) {
            // Update existing record
            const updateFields = Object.keys(row).filter(key => key !== 'id');
            const updateValues = updateFields.map((field, index) => `${field} = $${index + 2}`);
            const updateQuery = `UPDATE ${tableName} SET ${updateValues.join(', ')} WHERE id = $1`;
            const updateParams = [row.id, ...updateFields.map(field => row[field])];
            
            await query(updateQuery, updateParams);
            updatedCount++;
          } else {
            // Insert new record
            const insertFields = Object.keys(row);
            const insertValues = insertFields.map((_, index) => `$${index + 1}`);
            const insertQuery = `INSERT INTO ${tableName} (${insertFields.join(', ')}) VALUES (${insertValues.join(', ')})`;
            const insertParams = insertFields.map(field => row[field]);
            
            await query(insertQuery, insertParams);
            insertedCount++;
          }
        }
      } catch (rowError) {
        console.error(`❌ Error processing row ${row.id || 'new'} for ${tableName}:`, rowError.message);
        console.error(`❌ Row data that failed:`, JSON.stringify(row, null, 2));
        errorDetails.push({
          rowId: row.id || 'new',
          error: rowError.message,
          rowData: row
        });
        errorCount++;
        // Continue with other rows
      }
    }
    
    const durationSeconds = Math.round((Date.now() - startTime) / 1000);
    console.log(`📊 Database operations completed for ${tableName}: ${insertedCount} inserted, ${updatedCount} updated, ${errorCount} errors in ${durationSeconds}s`);
    
    return {
      tableName,
      recordsFetched: rawData.length,
      recordsInserted: insertedCount,
      recordsUpdated: updatedCount,
      recordsWithErrors: errorCount,
      durationSeconds,
      errors: errorCount > 0 ? errorDetails.slice(0, 3) : null // Return first 3 errors for debugging
    };
    
  } catch (error) {
    console.error(`❌ Sync failed for ${tableName}:`, error.message);
    throw error;
  }
}

// Sync all tables
export async function syncAllTables(syncType = 'full') {
  const startTime = Date.now();
  const results = [];
  
  const tables = [
    'company_upcharge_fees_DC',
    'employee_commissions_DC',
    'insurance_companies_DC',
    'monthly_interchange_income_DC',
    'monthly_interest_revenue_DC',
    'payment_modalities',
    'referral_partners_DC',
    'vendor_costs_DC'  // Added vendor costs to sync list
    // Note: revenue_master_view is imported via CSV due to API access issues
  ];
  
  console.log(`🚀 Starting sync for ${tables.length} tables (${syncType} sync)...`);
  
  for (const tableName of tables) {
    try {
      const result = await syncTableData(tableName, syncType);
      results.push(result);
    } catch (error) {
      console.error(`❌ Failed to sync ${tableName}:`, error.message);
      results.push({
        tableName,
        error: error.message,
        recordsFetched: 0,
        recordsInserted: 0,
        recordsUpdated: 0,
        durationSeconds: 0
      });
    }
  }
  
  const totalDuration = Math.round((Date.now() - startTime) / 1000);
  const totalFetched = results.reduce((sum, r) => sum + (r.recordsFetched || 0), 0);
  const totalInserted = results.reduce((sum, r) => sum + (r.recordsInserted || 0), 0);
  const totalUpdated = results.reduce((sum, r) => sum + (r.recordsUpdated || 0), 0);
  
  console.log(`🎉 Sync completed for all tables in ${totalDuration}s: ${totalFetched} fetched, ${totalInserted} inserted, ${totalUpdated} updated`);
  
  return {
    success: true,
    syncType,
    totalDuration,
    totalFetched,
    totalInserted,
    totalUpdated,
    tableResults: results,
    timestamp: new Date().toISOString()
  };
}

// Get sync status for all tables
export async function getSyncStatus() {
  try {
    const tables = [
      'company_upcharge_fees_DC',
      'employee_commissions_DC',
      'insurance_companies_DC',
      'monthly_interchange_income_DC',
      'monthly_interest_revenue_DC',
      'payment_modalities',
      'referral_partners_DC'
    ];
    
    const status = {};
    
    for (const tableName of tables) {
      try {
        const result = await query(`SELECT COUNT(*) as count FROM ${tableName}`);
        status[tableName] = {
          recordCount: parseInt(result.rows[0].count),
          lastUpdated: new Date().toISOString()
        };
      } catch (error) {
        status[tableName] = {
          error: error.message,
          recordCount: 0
        };
      }
    }
    
    return status;
  } catch (error) {
    console.error('❌ Error getting sync status:', error.message);
    throw error;
  }
}
