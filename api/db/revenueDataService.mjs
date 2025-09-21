import { query } from './connection.mjs';

/**
 * Ensure the revenue_master_view_cache table exists with correct structure
 */
async function ensureTableStructure() {
  try {
    console.log('🔄 Checking/creating revenue_master_view_cache table...');
    
    // Check if table exists and has correct structure
    const tableCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'revenue_master_view_cache' 
      AND column_name = 'dt_id'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('📋 Creating revenue_master_view_cache table with proper structure...');
      
      // Drop old table if it exists with wrong structure
      await query(`DROP TABLE IF EXISTS revenue_master_view_cache CASCADE`);
      
      // Create the new table with correct structure
      const createTableSQL = `
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
          amount VARCHAR(50),
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
        CREATE INDEX IF NOT EXISTS idx_revenue_cache_employee_name ON revenue_master_view_cache(employee_name);
        CREATE INDEX IF NOT EXISTS idx_revenue_cache_company_id ON revenue_master_view_cache(company_id);
        CREATE INDEX IF NOT EXISTS idx_revenue_cache_company ON revenue_master_view_cache(company);
        CREATE INDEX IF NOT EXISTS idx_revenue_cache_synced_at ON revenue_master_view_cache(synced_at);
        CREATE INDEX IF NOT EXISTS idx_revenue_cache_dt_id ON revenue_master_view_cache(dt_id);
        CREATE INDEX IF NOT EXISTS idx_revenue_cache_disbursement_id ON revenue_master_view_cache(disbursement_id);
      `;
      
      await query(createTableSQL);
      console.log('✅ Revenue master view cache table created successfully!');
    } else {
      console.log('✅ Revenue master view cache table already exists with correct structure');
    }
  } catch (error) {
    console.error('❌ Error ensuring table structure:', error);
    throw error;
  }
}

/**
 * Revenue Data Service - Handles database operations for revenue_master_view data
 */

/**
 * Insert or update revenue records in the database
 * @param {Array} records - Array of revenue records from Zoho
 * @param {string} fetchMethod - Method used to fetch the data
 * @param {string} syncType - Type of sync ('full', 'incremental', 'date_range')
 * @param {Date} startDate - Start date for the sync
 * @param {Date} endDate - End date for the sync
 * @returns {Object} - Sync results
 */
export async function syncRevenueData(records, fetchMethod, syncType = 'incremental', startDate = null, endDate = null) {
  const syncStartTime = Date.now();
  let syncId;
  
  try {
    // Ensure table exists with correct structure
    await ensureTableStructure();
    
    // Start sync tracking
    const syncResult = await query(`
      INSERT INTO revenue_sync_status (sync_type, start_date, end_date, fetch_method, records_fetched)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [syncType, startDate, endDate, fetchMethod, records.length]);
    
    syncId = syncResult.rows[0].id;
    
    let insertedCount = 0;
    let updatedCount = 0;
    
    // Process records in batches for better performance
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      for (const record of batch) {
        try {
          // Extract and normalize data from Zoho record
          const normalizedRecord = normalizeZohoRecord(record);
          
          // Skip records with missing ALL critical fields (at least one must be present)
          if (!normalizedRecord.company && !normalizedRecord.employee_name) {
            console.log('⚠️ Skipping record with missing both company and employee name:', {
              company: normalizedRecord.company,
              employee_name: normalizedRecord.employee_name,
              source_table: normalizedRecord.source_table
            });
            continue;
          }
          
          // Debug: Log first few records being processed
          if (insertedCount + updatedCount < 5) {
            console.log('🔍 Processing record:', {
              dt_id: normalizedRecord.dt_id,
              company: normalizedRecord.company,
              employee_name: normalizedRecord.employee_name,
              source_table: normalizedRecord.source_table
            });
          }
          
          // Provide fallback values for missing fields
          if (!normalizedRecord.company) {
            normalizedRecord.company = `Unknown Company (${normalizedRecord.source_table})`;
          }
          if (!normalizedRecord.employee_name) {
            normalizedRecord.employee_name = `Unknown Employee (${normalizedRecord.source_table})`;
          }
          
          // Upsert record (insert or update if exists)
          try {
            const upsertResult = await query(`
            INSERT INTO revenue_master_view_cache (
              dt_id, disbursement_id, payment_method_id,
              payment_method_payee_fee, payment_method_payor_fee, check_delivery_payee_fee, check_delivery_payor_fee,
              bundle_charges, postage_fee, api_transaction_status, created_at, updated_at, disbursement_updated_at,
              company_id, company, amount, disbursement_status_id, payment_method_description,
              cost_amount, cost_percentage, vendor_name, emp_id, employee_name, employee_commission_amount, employee_commission_percentage,
              referral_partner_name, referral_partner_type, partner_default_rate, company_override_rate,
              base_fee_upcharge, multiplier_upcharge, max_fee_upcharge,
              applied_employee_commission_percentage, applied_employee_commission_amount, applied_referral_rate,
              company_upcharge_fees, is_revenue_transaction, gross_revenue, is_total_transaction,
              payor_fee_revenue, payee_fee_revenue, total_combined_revenue, revenue_per_transaction,
              total_vendor_cost, revenue_after_upcharges, revenue_after_operational_costs,
              employee_commission, revenue_after_employee_commission, referral_partner_commission, final_net_profit,
              source_table, zoho_row_id
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
              $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34,
              $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51
            )
            ON CONFLICT (dt_id, disbursement_id, company_id)
            DO UPDATE SET
              emp_id = EXCLUDED.emp_id,
              employee_name = EXCLUDED.employee_name,
              company = EXCLUDED.company,
              amount = EXCLUDED.amount,
              employee_commission_amount = EXCLUDED.employee_commission_amount,
              employee_commission_percentage = EXCLUDED.employee_commission_percentage,
              final_net_profit = EXCLUDED.final_net_profit,
              source_table = EXCLUDED.source_table,
              sync_updated_at = CURRENT_TIMESTAMP
            RETURNING (xmax = 0) AS inserted
          `, [
            normalizedRecord.dt_id, normalizedRecord.disbursement_id, normalizedRecord.payment_method_id,
            normalizedRecord.payment_method_payee_fee, normalizedRecord.payment_method_payor_fee, 
            normalizedRecord.check_delivery_payee_fee, normalizedRecord.check_delivery_payor_fee,
            normalizedRecord.bundle_charges, normalizedRecord.postage_fee, normalizedRecord.api_transaction_status,
            normalizedRecord.created_at, normalizedRecord.updated_at, normalizedRecord.disbursement_updated_at,
            normalizedRecord.company_id, normalizedRecord.company, normalizedRecord.amount, normalizedRecord.disbursement_status_id,
            normalizedRecord.payment_method_description, normalizedRecord.cost_amount, normalizedRecord.cost_percentage,
            normalizedRecord.vendor_name, normalizedRecord.emp_id, normalizedRecord.employee_name, normalizedRecord.employee_commission_amount,
            normalizedRecord.employee_commission_percentage, normalizedRecord.referral_partner_name, normalizedRecord.referral_partner_type,
            normalizedRecord.partner_default_rate, normalizedRecord.company_override_rate, normalizedRecord.base_fee_upcharge,
            normalizedRecord.multiplier_upcharge, normalizedRecord.max_fee_upcharge, normalizedRecord.applied_employee_commission_percentage,
            normalizedRecord.applied_employee_commission_amount, normalizedRecord.applied_referral_rate, normalizedRecord.company_upcharge_fees,
            normalizedRecord.is_revenue_transaction, normalizedRecord.gross_revenue, normalizedRecord.is_total_transaction,
            normalizedRecord.payor_fee_revenue, normalizedRecord.payee_fee_revenue, normalizedRecord.total_combined_revenue,
            normalizedRecord.revenue_per_transaction, normalizedRecord.total_vendor_cost, normalizedRecord.revenue_after_upcharges,
            normalizedRecord.revenue_after_operational_costs, normalizedRecord.employee_commission, normalizedRecord.revenue_after_employee_commission,
            normalizedRecord.referral_partner_commission, normalizedRecord.final_net_profit, normalizedRecord.source_table, normalizedRecord.zoho_row_id
          ]);
          
          if (upsertResult.rows[0].inserted) {
            insertedCount++;
          } else {
            updatedCount++;
          }
          
          } catch (dbError) {
            console.error('❌ Database query attempt 1 failed:', dbError.message, {
              dt_id: normalizedRecord.dt_id,
              company: normalizedRecord.company,
              employee_name: normalizedRecord.employee_name,
              source_table: normalizedRecord.source_table
            });
            
            // Try a simpler insert without conflict resolution
            try {
              await query(`
                INSERT INTO revenue_master_view_cache (
                  dt_id, disbursement_id, company_id, company, emp_id, employee_name, amount, source_table
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (dt_id, disbursement_id, company_id)
                DO UPDATE SET
                  emp_id = EXCLUDED.emp_id,
                  employee_name = EXCLUDED.employee_name,
                  company = EXCLUDED.company,
                  amount = EXCLUDED.amount,
                  source_table = EXCLUDED.source_table,
                  sync_updated_at = CURRENT_TIMESTAMP
                RETURNING (xmax = 0) AS inserted
              `, [
                normalizedRecord.dt_id || Math.floor(Math.random() * 1000000),
                normalizedRecord.disbursement_id || Math.floor(Math.random() * 1000000),
                normalizedRecord.company_id || 1,
                normalizedRecord.company,
                normalizedRecord.emp_id,
                normalizedRecord.employee_name,
                normalizedRecord.amount || 0,
                normalizedRecord.source_table
              ]);
              insertedCount++;
              console.log('✅ Fallback insert successful');
            } catch (fallbackError) {
              console.error('❌ Fallback insert also failed:', fallbackError.message);
            }
          }
          
        } catch (recordError) {
          console.error('Error processing record:', recordError.message, record);
          // Continue with other records
        }
      }
      
      // Log progress for large datasets
      if (records.length > 1000 && (i + batchSize) % 1000 === 0) {
        console.log(`📊 Processed ${i + batchSize}/${records.length} records (${insertedCount} inserted, ${updatedCount} updated)`);
      }
    }
    
    // Complete sync tracking
    const duration = Math.round((Date.now() - syncStartTime) / 1000);
    await query(`
      UPDATE revenue_sync_status 
      SET status = 'completed', records_inserted = $1, records_updated = $2, 
          completed_at = CURRENT_TIMESTAMP, duration_seconds = $3
      WHERE id = $4
    `, [insertedCount, updatedCount, duration, syncId]);
    
    console.log(`✅ Sync completed: ${insertedCount} inserted, ${updatedCount} updated in ${duration}s`);
    
    // Log duplicate prevention summary
    if (updatedCount > 0) {
      console.log(`🔄 Duplicate Prevention: ${updatedCount} existing records were updated instead of creating duplicates`);
    }
    if (insertedCount > 0) {
      console.log(`➕ New Records: ${insertedCount} new records were inserted`);
    }
    
    return {
      success: true,
      syncId,
      recordsFetched: records.length,
      recordsInserted: insertedCount,
      recordsUpdated: updatedCount,
      durationSeconds: duration
    };
    
  } catch (error) {
    // Mark sync as failed
    if (syncId) {
      const duration = Math.round((Date.now() - syncStartTime) / 1000);
      await query(`
        UPDATE revenue_sync_status 
        SET status = 'failed', error_message = $1, completed_at = CURRENT_TIMESTAMP, duration_seconds = $2
        WHERE id = $3
      `, [error.message, duration, syncId]);
    }
    
    console.error('❌ Sync failed:', error.message);
    throw error;
  }
}

/**
 * Get revenue data from database with optional date filtering
 * @param {Object} options - Query options
 * @returns {Array} - Revenue records
 */
export async function getRevenueData(options = {}) {
  const {
    startDate = null,
    endDate = null,
    employeeId = null,
    companyId = null,
    limit = null,
    offset = 0
  } = options;
  
  let whereConditions = [];
  let params = [];
  let paramIndex = 1;
  
  // Add date filtering - use created_at since that's the main date field
  if (startDate) {
    whereConditions.push(`created_at >= $${paramIndex}`);
    params.push(startDate);
    paramIndex++;
  }
  
  if (endDate) {
    whereConditions.push(`created_at <= $${paramIndex}`);
    params.push(endDate);
    paramIndex++;
  }
  
  // Add employee filtering
  if (employeeId) {
    whereConditions.push(`employee_name = $${paramIndex}`);
    params.push(employeeId);
    paramIndex++;
  }
  
  // Add company filtering
  if (companyId) {
    whereConditions.push(`company_id = $${paramIndex}`);
    params.push(companyId);
    paramIndex++;
  }
  
  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  const limitClause = limit ? `LIMIT $${paramIndex++}` : '';
  const offsetClause = offset > 0 ? `OFFSET $${paramIndex++}` : '';
  
  if (limit) params.push(limit);
  if (offset > 0) params.push(offset);
  
  const queryText = `
    SELECT * FROM revenue_master_view_cache 
    ${whereClause}
    ORDER BY created_at DESC, synced_at DESC
    ${limitClause} ${offsetClause}
  `;
  
  try {
    console.log('🔍 Executing revenue data query:', { queryText, params });
    const result = await query(queryText, params);
    console.log(`✅ Query successful: ${result.rows.length} rows returned`);
    return result.rows;
  } catch (error) {
    console.error('❌ Error fetching revenue data:', error.message);
    console.error('Query:', queryText);
    console.error('Params:', params);
    // Return empty array if table doesn't exist or has issues
    return [];
  }
}

/**
 * Get distinct companies from cached data
 */
export async function getDistinctCompanies() {
  try {
    const result = await query(`
      SELECT DISTINCT company_id, company 
      FROM revenue_master_view_cache 
      WHERE company IS NOT NULL AND company != ''
      ORDER BY company
    `);
    return result.rows;
  } catch (error) {
    console.error('❌ Error fetching distinct companies:', error);
    // Return empty array if table doesn't exist or has issues
    return [];
  }
}

/**
 * Get distinct employees from cached data
 */
export async function getDistinctEmployees() {
  try {
    const result = await query(`
      SELECT DISTINCT employee_name 
      FROM revenue_master_view_cache 
      WHERE employee_name IS NOT NULL AND employee_name != ''
      ORDER BY employee_name
    `);
    return result.rows;
  } catch (error) {
    console.error('❌ Error fetching distinct employees:', error);
    // Return empty array if table doesn't exist or has issues
    return [];
  }
}

/**
 * Get sync status and statistics
 */
export async function getSyncStatus() {
  const [latestSync, totalRecords, dateRange] = await Promise.all([
    // Latest sync info
    query(`
      SELECT * FROM revenue_sync_status 
      ORDER BY started_at DESC 
      LIMIT 1
    `),
    // Total records count
    query(`
      SELECT COUNT(*) as total_records,
             MIN(transaction_date) as earliest_date,
             MAX(transaction_date) as latest_date,
             MAX(synced_at) as last_updated
      FROM revenue_master_view_cache
    `),
    // Date range summary
    query(`
      SELECT 
        DATE_TRUNC('month', transaction_date) as month,
        COUNT(*) as record_count
      FROM revenue_master_view_cache 
      WHERE transaction_date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', transaction_date)
      ORDER BY month DESC
    `)
  ]);
  
  return {
    latestSync: latestSync.rows[0] || null,
    totalRecords: totalRecords.rows[0] || { total_records: 0 },
    monthlyBreakdown: dateRange.rows
  };
}

/**
 * Clean old data (keep only last N months)
 * @param {number} monthsToKeep - Number of months to retain
 */
export async function cleanOldData(monthsToKeep = 6) {
  const result = await query(`
    DELETE FROM revenue_master_view_cache 
    WHERE transaction_date < CURRENT_DATE - INTERVAL '${monthsToKeep} months'
    RETURNING COUNT(*)
  `);
  
  const deletedCount = result.rowCount;
  console.log(`🧹 Cleaned ${deletedCount} old records (keeping last ${monthsToKeep} months)`);
  return deletedCount;
}

/**
 * Normalize Zoho record to database format
 * @param {Object} record - Raw Zoho record
 * @returns {Object} - Normalized record
 */
function normalizeZohoRecord(record) {
  // Debug: Log the actual record structure to understand CSV aggregation data
  console.log('🔍 DEBUG: Raw record structure:', {
    keys: Object.keys(record),
    sampleFields: {
      id: record.id,
      company: record.company,
      employee_name: record.employee_name,
      _source_table: record._source_table,
      // Show commission-related fields
      Employee_Commission: record.Employee_Commission,
      applied_employee_commission_amount: record.applied_employee_commission_amount,
      emp_id: record.emp_id,
      // Show vendor cost related fields
      'vc.cost_amount': record['vc.cost_amount'],
      cost_amount: record.cost_amount,
      vendor_cost: record.vendor_cost,
      Cost_Amount: record.Cost_Amount,
      Total_Vendor_Cost: record.Total_Vendor_Cost,
      'vc.vendor_name': record['vc.vendor_name'],
      vendor_name: record.vendor_name,
      // Show first few fields to understand structure
      ...Object.fromEntries(Object.entries(record).slice(0, 10))
    }
  });
  
  // Simple test to see if server-side logging is working
  console.log('🔍 SERVER-SIDE DEBUGGING IS WORKING - Processing record for:', record.employee_name || 'Unknown');

  // Parse dates safely - handle various formats from CSV
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      // Handle formats like "28/08/2025 23:07:03" or "9/7/2025 22:48"
      let date;
      if (typeof dateStr === 'string' && dateStr.includes('/')) {
        const parts = dateStr.split(' ')[0].split('/');
        if (parts.length === 3) {
          // Assume DD/MM/YYYY or D/M/YYYY format
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // JS months are 0-based
          const year = parseInt(parts[2]);
          date = new Date(year, month, day);
        }
      } else {
        date = new Date(dateStr);
      }
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  };
  
  // Parse numbers safely - handle formatted strings like "$21,000.00"
  const parseNumber = (numStr) => {
    if (!numStr || numStr === '') return null;
    if (typeof numStr === 'number') return numStr;
    
    // Debug: Log what we're trying to parse
    console.log('🔍 DEBUG: Parsing number:', {
      original: numStr,
      type: typeof numStr,
      length: String(numStr).length
    });
    
    // Remove currency symbols, commas, and spaces
    const cleanStr = String(numStr).replace(/[\$,\s]/g, '');
    const num = parseFloat(cleanStr);
    const result = isNaN(num) ? null : num;
    
    console.log('🔍 DEBUG: Parse result:', {
      original: numStr,
      cleaned: cleanStr,
      parsed: num,
      result: result
    });
    
    return result;
  };
  
  // Parse integer safely
  const parseInteger = (numStr) => {
    if (!numStr || numStr === '') return null;
    const num = Number.parseInt(numStr);
    return isNaN(num) ? null : num;
  };

  // Enhanced field mapping to handle more CSV variations
  const getField = (...fieldNames) => {
    for (const fieldName of fieldNames) {
      if (fieldName && record[fieldName] !== undefined && record[fieldName] !== null && record[fieldName] !== '') {
        return record[fieldName];
      }
    }
    return null;
  };

  // For CSV aggregation, we need to generate synthetic IDs since the individual tables don't have dt_id
  const sourceTable = record._source_table || 'unknown';
  const syntheticId = record.id || record.employee_id || record.company_id || Math.floor(Math.random() * 1000000);

  // Enhanced company extraction - try multiple possible field names
  const companyName = getField(
    'ic.company', 'company', 'company_name', 'Company', 'COMPANY', 
    'company_name_field', 'companyName', 'business_name', 'client_name',
    'Company_Name', 'COMPANY_NAME', 'businessName', 'clientName'
  );
  
  // Enhanced employee extraction - try multiple possible field names  
  const employeeName = getField(
    'ec.employee_name', 'employee_name', 'name', 'Employee', 'EMPLOYEE',
    'employee', 'staff_name', 'worker_name', 'person_name',
    'Employee_Name', 'EMPLOYEE_NAME', 'staffName', 'workerName', 'personName'
  );

  console.log('🔍 Field extraction results:', {
    sourceTable,
    companyName,
    employeeName,
    syntheticId,
    availableFields: Object.keys(record).filter(key => key.toLowerCase().includes('company') || key.toLowerCase().includes('employee'))
  });

  const normalizedRecord = {
    // Core transaction identifiers - use synthetic values for CSV aggregation
    dt_id: parseInteger(getField('dt.id', 'id', syntheticId)),
    disbursement_id: parseInteger(getField('disbursement_id', 'disbursement_id', syntheticId)),
    payment_method_id: parseInteger(getField('payment_method_id', 'payment_method_id', '1')),
    
    // Fee structure
    payment_method_payee_fee: parseNumber(getField('dt.payment_method_payee_fee', 'payment_method_payee_fee')),
    payment_method_payor_fee: parseNumber(getField('dt.payment_method_payor_fee', 'payment_method_payor_fee')),
    check_delivery_payee_fee: parseNumber(getField('dt.check_delivery_payee_fee', 'check_delivery_payee_fee')),
    check_delivery_payor_fee: parseNumber(getField('dt.check_delivery_payor_fee', 'check_delivery_payor_fee')),
    bundle_charges: parseNumber(getField('dt.bundle_charges', 'bundle_charges')),
    postage_fee: parseNumber(getField('dt.postage_fee', 'postage_fee')),
    
    // Status and dates
    api_transaction_status: getField('dt.api_transaction_status', 'api_transaction_status'),
    created_at: parseDate(getField('dt.created_at', 'created_at')),
    updated_at: parseDate(getField('dt.updated_at', 'updated_at')),
    disbursement_updated_at: parseDate(getField('disbursement_updated_at', 'disbursement_updated_at')),
    
    // Company and disbursement info - handle multiple possible field names
    company_id: parseInteger(getField('d.company_id', 'company_id', 'Company_ID', 'companyId', syntheticId)),
    company: companyName || 'Unknown Company',
    amount: getField('otp.amount', 'amount', 'transaction_amount', 'Amount', 'AMOUNT') || '0',
    disbursement_status_id: parseInteger(getField('otp.disbursement_status_id', 'disbursement_status_id', 'status_id', '1')),
    
    // Payment method details
    payment_method_description: getField('payment_method_description', 'payment_method_description', 'payment_method', 'Payment_Method'),
    
    // Vendor costs - enhanced field mapping for better Zoho Analytics compatibility
    cost_amount: parseNumber(getField(
      'vc.cost_amount', 'cost_amount', 'vendor_cost', 'Cost_Amount', 'Vendor_Cost',
      'vendor_costs_DC.cost_amount', 'Total_Vendor_Cost', 'total_vendor_cost'
    )),
    cost_percentage: parseNumber(getField(
      'vc.cost_percentage', 'cost_percentage', 'cost_percent', 'Cost_Percentage',
      'vendor_cost_percentage', 'vendor_costs_DC.cost_percentage'
    )),
    vendor_name: getField(
      'vc.vendor_name', 'vendor_name', 'Vendor_Name', 'vendor',
      'vendor_costs_DC.vendor_name'
    ),
    
    // Employee commission data - handle multiple possible field names
    emp_id: parseInteger(getField('emp_id', 'employee_id', 'empId', 'employeeId')),
    employee_name: employeeName || 'Unknown Employee',
    employee_commission_amount: parseNumber(getField('employee_commission_amount', 'commission_amount', 'amount')),
    employee_commission_percentage: parseNumber(getField('employee_commission_percentage', 'commission_percentage', 'percentage')),
    
    // Referral partner data
    referral_partner_name: record.referral_partner_name,
    referral_partner_type: record.referral_partner_type,
    partner_default_rate: parseNumber(record.partner_default_rate),
    company_override_rate: parseNumber(record.company_override_rate),
    
    // Company upcharge fees
    base_fee_upcharge: parseNumber(record['cuf.base_fee_upcharge']),
    multiplier_upcharge: parseNumber(record['cuf.multiplier_upcharge']),
    max_fee_upcharge: parseNumber(record['cuf.max_fee_upcharge']),
    
    // Applied rates and amounts
    applied_employee_commission_percentage: parseNumber(record.applied_employee_commission_percentage),
    applied_employee_commission_amount: parseNumber(record.applied_employee_commission_amount),
    applied_referral_rate: parseNumber(record.applied_referral_rate),
    
    // Revenue calculation fields
    company_upcharge_fees: parseNumber(record.Company_Upcharge_Fees),
    is_revenue_transaction: parseInteger(record.Is_Revenue_Transaction),
    gross_revenue: parseNumber(record.Gross_Revenue),
    is_total_transaction: parseInteger(record.Is_Total_Transaction),
    payor_fee_revenue: parseNumber(record.Payor_Fee_Revenue),
    payee_fee_revenue: parseNumber(record.Payee_Fee_Revenue),
    total_combined_revenue: parseNumber(record.Total_Combined_Revenue),
    revenue_per_transaction: parseNumber(record.Revenue_Per_Transaction),
    total_vendor_cost: parseNumber(record.Total_Vendor_Cost),
    revenue_after_upcharges: parseNumber(record.Revenue_After_Upcharges),
    revenue_after_operational_costs: parseNumber(record.Revenue_After_Operational_Costs),
    employee_commission: parseNumber(record.Employee_Commission),
    revenue_after_employee_commission: parseNumber(record.Revenue_After_Employee_Commission),
    referral_partner_commission: parseNumber(record.Referral_Partner_Commission),
    final_net_profit: parseNumber(record.Final_Net_Profit),
    
    // Source tracking
    source_table: sourceTable,
    zoho_row_id: record.zoho_row_id || record['dt.id'] || record.id || `${sourceTable}_${syntheticId}`
  };

  // Debug: Log parsed commission values
  console.log('🔍 DEBUG: Parsed commission values:', {
    raw_Employee_Commission: record.Employee_Commission,
    parsed_employee_commission: normalizedRecord.employee_commission,
    raw_applied_employee_commission_amount: record.applied_employee_commission_amount,
    parsed_applied_employee_commission_amount: normalizedRecord.applied_employee_commission_amount,
    raw_emp_id: record.emp_id,
    parsed_emp_id: normalizedRecord.emp_id,
    // Show all commission-related fields
    all_commission_fields: {
      Employee_Commission: record.Employee_Commission,
      applied_employee_commission_amount: record.applied_employee_commission_amount,
      employee_commission_amount: record.employee_commission_amount,
      employee_commission_percentage: record.employee_commission_percentage
    }
  });

  return normalizedRecord;
}
