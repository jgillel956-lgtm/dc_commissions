import axios from "axios";
import { getAccessTokenShared, withTokenRetry } from './db/getAccessTokenShared.mjs';
import { getSharedToken, getSharedBackoffUntil, clearSharedToken } from './db/zohoTokenStore.mjs';

/** DC-aware hosts */
const DC = process.env.ZOHO_DC || "com";
const ANALYTICS_HOST = `https://analyticsapi.zoho.${DC}`;
const BASE_URL = `${ANALYTICS_HOST}/restapi/v2`;

/** Stale cache for dashboard data */
const dashboardCache = new Map();
const DASHBOARD_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/** Query optimization settings for large datasets */
const QUERY_OPTIMIZATION = {
  // Connection pooling settings
  MAX_CONCURRENT_QUERIES: 3,
  QUERY_TIMEOUT_MS: 60000, // 60 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 2000,
  
  // Pagination optimization
  DEFAULT_PAGE_SIZE: 100,
  MAX_PAGE_SIZE: 500,
  MIN_PAGE_SIZE: 10,
  
  // Query chunking for large datasets
  CHUNK_SIZE: 1000, // Process 1000 records at a time
  MAX_TOTAL_RECORDS: 50000, // Safety limit
  
  // Performance monitoring
  SLOW_QUERY_THRESHOLD_MS: 10000, // Alert if query takes > 10 seconds
  CACHE_WARMUP_SIZE: 100 // Pre-cache first 100 records
};

/** Connection pool for managing concurrent queries */
class QueryConnectionPool {
  constructor() {
    this.activeQueries = new Map();
    this.queryQueue = [];
    this.maxConcurrent = QUERY_OPTIMIZATION.MAX_CONCURRENT_QUERIES;
  }
  
  async executeQuery(queryId, queryFunction) {
    // Check if we're at capacity
    if (this.activeQueries.size >= this.maxConcurrent) {
      // Queue the query
      return new Promise((resolve, reject) => {
        this.queryQueue.push({ queryId, queryFunction, resolve, reject });
      });
    }
    
    // Execute immediately
    return this._executeQueryInternal(queryId, queryFunction);
  }
  
  async _executeQueryInternal(queryId, queryFunction) {
    const startTime = Date.now();
    this.activeQueries.set(queryId, { startTime, status: 'running' });
    
    try {
      const result = await Promise.race([
        queryFunction(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), QUERY_OPTIMIZATION.QUERY_TIMEOUT_MS)
        )
      ]);
      
      const duration = Date.now() - startTime;
      this.activeQueries.set(queryId, { startTime, status: 'completed', duration });
      
      // Log slow queries
      if (duration > QUERY_OPTIMIZATION.SLOW_QUERY_THRESHOLD_MS) {
        console.warn(`⚠️ Slow query detected: ${queryId} took ${duration}ms`);
      }
      
      // Process next queued query
      this._processNextQuery();
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.activeQueries.set(queryId, { startTime, status: 'failed', duration, error: error.message });
      
      // Process next queued query
      this._processNextQuery();
      
      throw error;
    }
  }
  
  _processNextQuery() {
    if (this.queryQueue.length > 0 && this.activeQueries.size < this.maxConcurrent) {
      const { queryId, queryFunction, resolve, reject } = this.queryQueue.shift();
      this._executeQueryInternal(queryId, queryFunction).then(resolve).catch(reject);
    }
  }
  
  getStatus() {
    return {
      activeQueries: this.activeQueries.size,
      queuedQueries: this.queryQueue.length,
      maxConcurrent: this.maxConcurrent
    };
  }
}

const queryPool = new QueryConnectionPool();

// Circuit breaker pattern for database connectivity
class CircuitBreaker {
  constructor(failureThreshold = 5, recoveryTimeout = 60000) {
    this.failureThreshold = failureThreshold;
    this.recoveryTimeout = recoveryTimeout;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }
  
  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        console.log('🔄 Circuit breaker transitioning to HALF_OPEN');
      } else {
        throw new DatabaseError('Circuit breaker is OPEN - service temporarily unavailable', 'CIRCUIT_OPEN', true);
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      console.error(`🚨 Circuit breaker opened after ${this.failureCount} failures`);
    }
  }
  
  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      failureThreshold: this.failureThreshold,
      recoveryTimeout: this.recoveryTimeout
    };
  }
}

// Health monitoring for database connectivity
class DatabaseHealthMonitor {
  constructor() {
    this.healthChecks = new Map();
    this.lastHealthCheck = null;
    this.healthCheckInterval = 300000; // 5 minutes
  }
  
  async performHealthCheck(token, orgId, workspaceId) {
    const healthQuery = 'SELECT 1 as health_check LIMIT 1';
    const queryId = 'health_check';
    
    try {
      const startTime = Date.now();
      const result = await executeOptimizedQuery(token, orgId, workspaceId, healthQuery, queryId);
      const duration = Date.now() - startTime;
      
      this.healthChecks.set(queryId, {
        timestamp: Date.now(),
        duration: duration,
        status: 'healthy',
        error: null
      });
      
      this.lastHealthCheck = Date.now();
      console.log(`✅ Health check passed in ${duration}ms`);
      
      return { status: 'healthy', duration, timestamp: Date.now() };
      
    } catch (error) {
      this.healthChecks.set(queryId, {
        timestamp: Date.now(),
        duration: null,
        status: 'unhealthy',
        error: error.message
      });
      
      console.error(`❌ Health check failed:`, error.message);
      return { status: 'unhealthy', error: error.message, timestamp: Date.now() };
    }
  }
  
  isHealthy() {
    if (!this.lastHealthCheck) return true; // Assume healthy if no checks performed
    
    const timeSinceLastCheck = Date.now() - this.lastHealthCheck;
    if (timeSinceLastCheck > this.healthCheckInterval) {
      return false; // Health check is stale
    }
    
    // Check if any recent health checks failed
    for (const [_, check] of this.healthChecks) {
      if (check.status === 'unhealthy' && 
          Date.now() - check.timestamp < this.healthCheckInterval) {
        return false;
      }
    }
    
    return true;
  }
  
  getHealthStatus() {
    return {
      isHealthy: this.isHealthy(),
      lastHealthCheck: this.lastHealthCheck,
      healthChecks: Array.from(this.healthChecks.entries()),
      circuitBreaker: circuitBreaker.getStatus()
    };
  }
}

const circuitBreaker = new CircuitBreaker();
const healthMonitor = new DatabaseHealthMonitor();

function headersFor(token, orgId) {
  const h = { 
    Authorization: `Zoho-oauthtoken ${token}`, 
    'Content-Type': 'application/json' 
  };
  if (orgId) h['ZANALYTICS-ORGID'] = orgId;
  return h;
}

// Revenue Master View SQL Query
const REVENUE_MASTER_QUERY = `
SELECT DISTINCT
  dt.id,
  dt.disbursement_id,
  dt.payment_method_id,
  dt.payment_method_payee_fee,
  dt.payment_method_payor_fee,
  dt.api_transaction_status,
  dt.created_at,
  dt.updated_at,
  dt.check_delivery_payee_fee,
  dt.check_delivery_payor_fee,
  dt.bundle_charges,
  dt.postage_fee,
  d.company_id,
  d.updated_at AS disbursement_updated_at,
  otp.amount,
  otp.disbursement_status_id,
  ic.company,
  pt.description AS payment_method_description,
  vc.cost_amount,
  vc.cost_percentage,
  vc.vendor_name,
  ec.employee_name,
  ec.commission_amount AS employee_commission_amount,
  ec.commission_percentage AS employee_commission_percentage,
  rp.partner_name AS referral_partner_name,
  rp.partner_type AS referral_partner_type,
  rp.commission_percentage AS partner_default_rate,
  crm.commission_percentage AS company_override_rate,
  cuf.base_fee_upcharge,
  cuf.multiplier_upcharge,
  cuf.max_fee_upcharge,
  CASE WHEN ec.commission_percentage IS NOT NULL THEN ec.commission_percentage ELSE 0.0 END AS applied_employee_commission_percentage,
  CASE WHEN ec.commission_amount IS NOT NULL THEN 
    CASE WHEN ec.commission_amount LIKE '%$%' THEN CAST(REPLACE(REPLACE(ec.commission_amount, '$', ''), ',', '') AS DECIMAL(10,2)) ELSE COALESCE(CAST(ec.commission_amount AS DECIMAL(10,2)), 0) END
  ELSE 0.0 END AS applied_employee_commission_amount,
  CASE WHEN crm.commission_percentage IS NOT NULL THEN crm.commission_percentage WHEN rp.commission_percentage IS NOT NULL THEN rp.commission_percentage ELSE 0.0 END AS applied_referral_rate,
  CASE WHEN (CASE WHEN dt.payment_method_payee_fee = 0 OR dt.payment_method_payee_fee IS NULL THEN 0 WHEN dt.payment_method_id = 5 AND dt.payment_method_payee_fee > 0 THEN 1 WHEN dt.payment_method_id = 2 AND otp.disbursement_status_id = 3 AND dt.payment_method_payor_fee > 0 THEN 1 WHEN dt.payment_method_id IN (1,3,4,6,7) AND otp.disbursement_status_id = 3 AND dt.payment_method_payee_fee > 0 THEN 1 ELSE 0 END) = 1 AND cuf.base_fee_upcharge IS NOT NULL THEN COALESCE(cuf.base_fee_upcharge, 0) + (otp.amount * COALESCE(cuf.multiplier_upcharge, 0) * 0.01) + CASE WHEN dt.payment_method_payee_fee >= COALESCE(cuf.max_fee_upcharge, 999999) THEN COALESCE(cuf.max_fee_upcharge, 0) ELSE 0 END ELSE 0 END AS Company_Upcharge_Fees,
  CASE WHEN dt.payment_method_payee_fee = 0 OR dt.payment_method_payee_fee IS NULL THEN 0 WHEN dt.payment_method_id = 5 AND dt.payment_method_payee_fee > 0 THEN 1 WHEN dt.payment_method_id = 2 AND otp.disbursement_status_id = 3 AND dt.payment_method_payor_fee > 0 THEN 1 WHEN dt.payment_method_id IN (1,3,4,6,7) AND otp.disbursement_status_id = 3 AND dt.payment_method_payee_fee > 0 THEN 1 ELSE 0 END AS Is_Revenue_Transaction,
  CASE WHEN (CASE WHEN dt.payment_method_payee_fee = 0 OR dt.payment_method_payee_fee IS NULL THEN 0 WHEN dt.payment_method_id = 5 AND dt.payment_method_payee_fee > 0 THEN 1 WHEN dt.payment_method_id = 2 AND otp.disbursement_status_id = 3 AND dt.payment_method_payor_fee > 0 THEN 1 WHEN dt.payment_method_id IN (1,3,4,6,7) AND otp.disbursement_status_id = 3 AND dt.payment_method_payee_fee > 0 THEN 1 ELSE 0 END) = 1 THEN COALESCE(dt.payment_method_payee_fee, 0) + COALESCE(dt.payment_method_payor_fee, 0) ELSE 0 END AS Gross_Revenue,
  CASE WHEN dt.payment_method_id = 5 AND dt.payment_method_payee_fee > 0 THEN 1 WHEN dt.payment_method_id = 2 AND otp.disbursement_status_id = 3 THEN 1 WHEN dt.payment_method_id IN (1,3,4,6,7) AND otp.disbursement_status_id = 3 AND dt.payment_method_payee_fee > 0 THEN 1 ELSE 0 END AS Is_Total_Transaction,
  CASE WHEN dt.payment_method_id = 5 AND dt.payment_method_payee_fee > 0 THEN COALESCE(dt.payment_method_payor_fee, 0) WHEN dt.payment_method_id = 2 AND otp.disbursement_status_id = 3 THEN COALESCE(dt.payment_method_payor_fee, 0) WHEN dt.payment_method_id IN (1,3,4,6,7) AND otp.disbursement_status_id = 3 AND dt.payment_method_payee_fee > 0 THEN COALESCE(dt.payment_method_payor_fee, 0) ELSE 0 END AS Payor_Fee_Revenue,
  CASE WHEN dt.payment_method_id = 5 AND dt.payment_method_payee_fee > 0 THEN dt.payment_method_payee_fee WHEN dt.payment_method_id = 2 AND otp.disbursement_status_id = 3 THEN COALESCE(dt.payment_method_payee_fee, 0) WHEN dt.payment_method_id IN (1,3,4,6,7) AND otp.disbursement_status_id = 3 AND dt.payment_method_payee_fee > 0 THEN dt.payment_method_payee_fee ELSE 0 END AS Payee_Fee_Revenue,
  CASE WHEN dt.payment_method_id = 5 AND dt.payment_method_payee_fee > 0 THEN COALESCE(dt.payment_method_payee_fee, 0) + COALESCE(dt.payment_method_payor_fee, 0) WHEN dt.payment_method_id = 2 AND otp.disbursement_status_id = 3 THEN COALESCE(dt.payment_method_payee_fee, 0) + COALESCE(dt.payment_method_payor_fee, 0) WHEN dt.payment_method_id IN (1,3,4,6,7) AND otp.disbursement_status_id = 3 AND dt.payment_method_payee_fee > 0 THEN COALESCE(dt.payment_method_payee_fee, 0) + COALESCE(dt.payment_method_payor_fee, 0) ELSE 0 END AS Total_Combined_Revenue,
  CASE WHEN dt.payment_method_id = 5 AND dt.payment_method_payee_fee > 0 THEN COALESCE(dt.payment_method_payee_fee, 0) + COALESCE(dt.payment_method_payor_fee, 0) WHEN dt.payment_method_id = 2 AND otp.disbursement_status_id = 3 THEN COALESCE(dt.payment_method_payee_fee, 0) + COALESCE(dt.payment_method_payor_fee, 0) WHEN dt.payment_method_id IN (1,3,4,6,7) AND otp.disbursement_status_id = 3 AND dt.payment_method_payee_fee > 0 THEN COALESCE(dt.payment_method_payee_fee, 0) + COALESCE(dt.payment_method_payor_fee, 0) ELSE 0 END AS Revenue_Per_Transaction,
  CASE WHEN (CASE WHEN dt.payment_method_payee_fee = 0 OR dt.payment_method_payee_fee IS NULL THEN 0 WHEN dt.payment_method_id = 5 AND dt.payment_method_payee_fee > 0 THEN 1 WHEN dt.payment_method_id = 2 AND otp.disbursement_status_id = 3 AND dt.payment_method_payor_fee > 0 THEN 1 WHEN dt.payment_method_id IN (1,3,4,6,7) AND otp.disbursement_status_id = 3 AND dt.payment_method_payee_fee > 0 THEN 1 ELSE 0 END) = 1 AND vc.cost_amount IS NOT NULL THEN vc.cost_amount + (otp.amount * COALESCE(vc.cost_percentage, 0) * 0.01) ELSE 0 END AS Total_Vendor_Cost,
  (CASE WHEN (CASE WHEN dt.payment_method_payee_fee = 0 OR dt.payment_method_payee_fee IS NULL THEN 0 WHEN dt.payment_method_id = 5 AND dt.payment_method_payee_fee > 0 THEN 1 WHEN dt.payment_method_id = 2 AND otp.disbursement_status_id = 3 AND dt.payment_method_payor_fee > 0 THEN 1 WHEN dt.payment_method_id IN (1,3,4,6,7) AND otp.disbursement_status_id = 3 AND dt.payment_method_payee_fee > 0 THEN 1 ELSE 0 END) = 1 THEN COALESCE(dt.payment_method_payee_fee, 0) + COALESCE(dt.payment_method_payor_fee, 0) ELSE 0 END) - (CASE WHEN (CASE WHEN dt.payment_method_payee_fee = 0 OR dt.payment_method_payee_fee IS NULL THEN 0 WHEN dt.payment_method_id = 5 AND dt.payment_method_payee_fee > 0 THEN 1 WHEN dt.payment_method_id = 2 AND otp.disbursement_status_id = 3 AND dt.payment_method_payor_fee > 0 THEN 1 WHEN dt.payment_method_id IN (1,3,4,6,7) AND otp.disbursement_status_id = 3 AND dt.payment_method_payee_fee > 0 THEN 1 ELSE 0 END) = 1 AND cuf.base_fee_upcharge IS NOT NULL THEN COALESCE(cuf.base_fee_upcharge, 0) + (otp.amount * COALESCE(cuf.multiplier_upcharge, 0) * 0.01) + CASE WHEN dt.payment_method_payee_fee >= COALESCE(cuf.max_fee_upcharge, 999999) THEN COALESCE(cuf.max_fee_upcharge, 0) ELSE 0 END ELSE 0 END) AS Revenue_After_Upcharges,
  ((CASE WHEN (CASE WHEN dt.payment_method_payee_fee = 0 OR dt.payment_method_payee_fee IS NULL THEN 0 WHEN dt.payment_method_id = 5 AND dt.payment_method_payee_fee > 0 THEN 1 WHEN dt.payment_method_id = 2 AND otp.disbursement_status_id = 3 AND dt.payment_method_payor_fee > 0 THEN 1 WHEN dt.payment_method_id IN (1,3,4,6,7) AND otp.disbursement_status_id = 3 AND dt.payment_method_payee_fee > 0 THEN 1 ELSE 0 END) = 1 THEN COALESCE(dt.payment_method_payee_fee, 0) + COALESCE(dt.payment_method_payor_fee, 0) ELSE 0 END) - (CASE WHEN (CASE WHEN dt.payment_method_payee_fee = 0 OR dt.payment_method_payee_fee IS NULL THEN 0 WHEN dt.payment_method_id = 5 AND dt.payment_method_payee_fee > 0 THEN 1 WHEN dt.payment_method_id = 2 AND otp.disbursement_status_id = 3 AND dt.payment_method_payor_fee > 0 THEN 1 WHEN dt.payment_method_id IN (1,3,4,6,7) AND otp.disbursement_status_id = 3 AND dt.payment_method_payee_fee > 0 THEN 1 ELSE 0 END) = 1 AND cuf.base_fee_upcharge IS NOT NULL THEN COALESCE(cuf.base_fee_upcharge, 0) + (otp.amount * COALESCE(cuf.multiplier_upcharge, 0) * 0.01) + CASE WHEN dt.payment_method_payee_fee >= COALESCE(cuf.max_fee_upcharge, 999999) THEN COALESCE(cuf.max_fee_upcharge, 0) ELSE 0 END ELSE 0 END)) - (CASE WHEN (CASE WHEN dt.payment_method_payee_fee = 0 OR dt.payment_method_payee_fee IS NULL THEN 0 WHEN dt.payment_method_id = 5 AND dt.payment_method_payee_fee > 0 THEN 1 WHEN dt.payment_method_id = 2 AND otp.disbursement_status_id = 3 AND dt.payment_method_payor_fee > 0 THEN 1 WHEN dt.payment_method_id IN (1,3,4,6,7) AND otp.disbursement_status_id = 3 AND dt.payment_method_payee_fee > 0 THEN 1 ELSE 0 END) = 1 AND vc.cost_amount IS NOT NULL THEN vc.cost_amount + (otp.amount * COALESCE(vc.cost_percentage, 0) * 0.01) ELSE 0 END) AS Revenue_After_Operational_Costs,
  CASE WHEN ec.id IS NOT NULL AND ((dt.payment_method_id = 5 AND dt.payment_method_payee_fee > 0) OR (dt.payment_method_id = 2 AND otp.disbursement_status_id = 3) OR (dt.payment_method_id IN (1,3,4,6,7) AND otp.disbursement_status_id = 3 AND dt.payment_method_payee_fee > 0)) THEN ((COALESCE(dt.payment_method_payee_fee, 0) + COALESCE(dt.payment_method_payor_fee, 0)) - COALESCE(vc.cost_amount + (otp.amount * COALESCE(vc.cost_percentage, 0) * 0.01), 0)) * COALESCE(ec.commission_percentage, 0) * 0.01 + CASE WHEN ec.commission_amount LIKE '%$%' THEN CAST(REPLACE(REPLACE(ec.commission_amount, '$', ''), ',', '') AS DECIMAL(10,2)) ELSE COALESCE(CAST(ec.commission_amount AS DECIMAL(10,2)), 0) END ELSE 0 END AS Employee_Commission,
  CASE WHEN ((dt.payment_method_id = 5 AND dt.payment_method_payee_fee > 0) OR (dt.payment_method_id = 2 AND otp.disbursement_status_id = 3) OR (dt.payment_method_id IN (1,3,4,6,7) AND otp.disbursement_status_id = 3 AND dt.payment_method_payee_fee > 0)) THEN (COALESCE(dt.payment_method_payee_fee, 0) + COALESCE(dt.payment_method_payor_fee, 0)) - COALESCE(vc.cost_amount + (otp.amount * COALESCE(vc.cost_percentage, 0) * 0.01), 0) - CASE WHEN ec.id IS NOT NULL THEN ((COALESCE(dt.payment_method_payee_fee, 0) + COALESCE(dt.payment_method_payor_fee, 0)) - COALESCE(vc.cost_amount + (otp.amount * COALESCE(vc.cost_percentage, 0) * 0.01), 0)) * COALESCE(ec.commission_percentage, 0) * 0.01 + CASE WHEN ec.commission_amount LIKE '%$%' THEN CAST(REPLACE(REPLACE(ec.commission_amount, '$', ''), ',', '') AS DECIMAL(10,2)) ELSE COALESCE(CAST(ec.commission_amount AS DECIMAL(10,2)), 0) END ELSE 0 END ELSE 0 END AS Revenue_After_Employee_Commission,
  CASE WHEN (crm.commission_percentage IS NOT NULL OR rp.commission_percentage IS NOT NULL) AND ((dt.payment_method_id = 5 AND dt.payment_method_payee_fee > 0) OR (dt.payment_method_id = 2 AND otp.disbursement_status_id = 3) OR (dt.payment_method_id IN (1,3,4,6,7) AND otp.disbursement_status_id = 3 AND dt.payment_method_payee_fee > 0)) THEN ((COALESCE(dt.payment_method_payee_fee, 0) + COALESCE(dt.payment_method_payor_fee, 0)) - COALESCE(vc.cost_amount + (otp.amount * COALESCE(vc.cost_percentage, 0) * 0.01), 0) - CASE WHEN ec.id IS NOT NULL THEN ((COALESCE(dt.payment_method_payee_fee, 0) + COALESCE(dt.payment_method_payor_fee, 0)) - COALESCE(vc.cost_amount + (otp.amount * COALESCE(vc.cost_percentage, 0) * 0.01), 0)) * COALESCE(ec.commission_percentage, 0) * 0.01 + CASE WHEN ec.commission_amount LIKE '%$%' THEN CAST(REPLACE(REPLACE(ec.commission_amount, '$', ''), ',', '') AS DECIMAL(10,2)) ELSE COALESCE(CAST(ec.commission_amount AS DECIMAL(10,2)), 0) END ELSE 0 END) * COALESCE(COALESCE(crm.commission_percentage, rp.commission_percentage), 0) * 0.01 ELSE 0 END AS Referral_Partner_Commission,
  CASE WHEN ((dt.payment_method_id = 5 AND dt.payment_method_payee_fee > 0) OR (dt.payment_method_id = 2 AND otp.disbursement_status_id = 3) OR (dt.payment_method_id IN (1,3,4,6,7) AND otp.disbursement_status_id = 3 AND dt.payment_method_payee_fee > 0)) THEN (COALESCE(dt.payment_method_payee_fee, 0) + COALESCE(dt.payment_method_payor_fee, 0)) - COALESCE(vc.cost_amount + (otp.amount * COALESCE(vc.cost_percentage, 0) * 0.01), 0) - CASE WHEN ec.id IS NOT NULL THEN ((COALESCE(dt.payment_method_payee_fee, 0) + COALESCE(dt.payment_method_payor_fee, 0)) - COALESCE(vc.cost_amount + (otp.amount * COALESCE(vc.cost_percentage, 0) * 0.01), 0)) * COALESCE(ec.commission_percentage, 0) * 0.01 + CASE WHEN ec.commission_amount LIKE '%$%' THEN CAST(REPLACE(REPLACE(ec.commission_amount, '$', ''), ',', '') AS DECIMAL(10,2)) ELSE COALESCE(CAST(ec.commission_amount AS DECIMAL(10,2)), 0) END ELSE 0 END - CASE WHEN (crm.commission_percentage IS NOT NULL OR rp.commission_percentage IS NOT NULL) THEN ((COALESCE(dt.payment_method_payee_fee, 0) + COALESCE(dt.payment_method_payor_fee, 0)) - COALESCE(vc.cost_amount + (otp.amount * COALESCE(vc.cost_percentage, 0) * 0.01), 0) - CASE WHEN ec.id IS NOT NULL THEN ((COALESCE(dt.payment_method_payee_fee, 0) + COALESCE(dt.payment_method_payor_fee, 0)) - COALESCE(vc.cost_amount + (otp.amount * COALESCE(vc.cost_percentage, 0) * 0.01), 0)) * COALESCE(ec.commission_percentage, 0) * 0.01 + CASE WHEN ec.commission_amount LIKE '%$%' THEN CAST(REPLACE(REPLACE(ec.commission_amount, '$', ''), ',', '') AS DECIMAL(10,2)) ELSE COALESCE(CAST(ec.commission_amount AS DECIMAL(10,2)), 0) END ELSE 0 END) * COALESCE(COALESCE(crm.commission_percentage, rp.commission_percentage), 0) * 0.01 ELSE 0 END ELSE 0 END AS Final_Net_Profit
FROM disbursement_transactions_DC dt
LEFT JOIN disbursements_DC d ON dt.disbursement_id = d.id 
LEFT JOIN (SELECT otp_inner.*, ROW_NUMBER() OVER(PARTITION BY otp_inner.disbursement_id ORDER BY CASE WHEN otp_inner.disbursement_status_id = 3 THEN 1 ELSE 2 END ASC, otp_inner.id DESC) as payee_rank FROM one_timer_disbursement_payees_DC otp_inner) otp ON otp.payee_rank = 1 AND d.id = otp.disbursement_id 
LEFT JOIN insurance_companies_DC ic ON d.company_id = ic.id 
LEFT JOIN payment_type_DC pt ON dt.payment_method_id = pt.id 
LEFT JOIN vendor_costs_DC vc ON dt.payment_method_id = vc.payment_method_id 
LEFT JOIN (SELECT ec_inner.*, ROW_NUMBER() OVER(PARTITION BY COALESCE(ec_inner.payment_method_id, -1), COALESCE(ec_inner.company_id, -1) ORDER BY CASE WHEN ec_inner.payment_method_id IS NOT NULL AND ec_inner.company_id IS NOT NULL THEN 4 WHEN ec_inner.payment_method_id IS NOT NULL AND ec_inner.company_id IS NULL THEN 3 WHEN ec_inner.payment_method_id IS NULL AND ec_inner.company_id IS NOT NULL THEN 2 WHEN ec_inner.payment_method_id IS NULL AND ec_inner.company_id IS NULL THEN 1 ELSE 0 END DESC, ec_inner.id ASC) as priority_rank FROM employee_commissions_DC ec_inner WHERE ec_inner.active = 'Yes') ec ON ec.priority_rank = 1 AND (ec.payment_method_id IS NULL OR dt.payment_method_id = ec.payment_method_id) AND (ec.company_id IS NULL OR d.company_id = ec.company_id) 
LEFT JOIN (SELECT crm_inner.*, ROW_NUMBER() OVER(PARTITION BY crm_inner.company_id ORDER BY crm_inner.id ASC) as mapping_rank FROM company_referral_mapping_DC crm_inner WHERE crm_inner.active = 'TRUE') crm ON crm.mapping_rank = 1 AND d.company_id = crm.company_id 
LEFT JOIN referral_partners_DC rp ON (crm.referral_partner_id = rp.id AND rp.active = 'Yes') 
LEFT JOIN (SELECT cuf_inner.*, ROW_NUMBER() OVER(PARTITION BY cuf_inner.company_id, cuf_inner.payment_method_id ORDER BY cuf_inner.id ASC) as upcharge_rank FROM company_upcharge_fees_DC cuf_inner WHERE cuf_inner.active = 'TRUE') cuf ON cuf.upcharge_rank = 1 AND d.company_id = cuf.company_id AND dt.payment_method_id = cuf.payment_method_id
`;

// Helper function to build WHERE clause from filters
function buildWhereClause(filters) {
  const conditions = [];
  
  // Date range filtering
  if (filters.date_range) {
    const { type, start_date, end_date } = filters.date_range;
    if (type === 'custom' && start_date && end_date) {
      conditions.push(`dt.created_at >= '${start_date}' AND dt.created_at <= '${end_date}'`);
    } else if (type === 'last_30_days') {
      conditions.push(`dt.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`);
    } else if (type === 'last_90_days') {
      conditions.push(`dt.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)`);
    } else if (type === 'last_12_months') {
      conditions.push(`dt.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)`);
    } else if (type === 'ytd') {
      conditions.push(`dt.created_at >= DATE_FORMAT(NOW(), '%Y-01-01')`);
    }
  }
  
  // Company filtering
  if (filters.companies?.selected_companies?.length > 0) {
    const companyIds = filters.companies.selected_companies.join(',');
    conditions.push(`d.company_id IN (${companyIds})`);
  }
  
  // Payment method filtering
  if (filters.payment_methods?.selected_methods?.length > 0) {
    const methodIds = filters.payment_methods.selected_methods.join(',');
    conditions.push(`dt.payment_method_id IN (${methodIds})`);
  }
  
  // Amount range filtering
  if (filters.amount_range) {
    const { min_amount, max_amount } = filters.amount_range;
    if (min_amount !== undefined) {
      conditions.push(`otp.amount >= ${min_amount}`);
    }
    if (max_amount !== undefined) {
      conditions.push(`otp.amount <= ${max_amount}`);
    }
  }
  
  // Employee filtering
  if (filters.employees?.selected_employees?.length > 0) {
    const employeeNames = filters.employees.selected_employees.map(name => `'${name.replace(/'/g, "''")}'`).join(',');
    conditions.push(`ec.employee_name IN (${employeeNames})`);
  }
  
  // Disbursement status filtering
  if (filters.disbursement_status?.selected_statuses?.length > 0) {
    const statusIds = filters.disbursement_status.selected_statuses.join(',');
    conditions.push(`otp.disbursement_status_id IN (${statusIds})`);
  }
  
  return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
}

// Enhanced error handling and retry logic for database connectivity
class DatabaseError extends Error {
  constructor(message, code, retryable = false) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.retryable = retryable;
  }
}

// Error classification and handling
function classifyError(error) {
  const message = error.message?.toLowerCase() || '';
  const status = error.response?.status;
  
  // Network connectivity issues (retryable)
  if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
    return new DatabaseError(`Network connectivity issue: ${error.message}`, 'NETWORK_ERROR', true);
  }
  
  // Zoho API specific errors
  if (status === 401) {
    return new DatabaseError('Authentication failed - token may be expired', 'AUTH_ERROR', true);
  }
  if (status === 403) {
    return new DatabaseError('Access denied - insufficient permissions', 'PERMISSION_ERROR', false);
  }
  if (status === 404) {
    return new DatabaseError('Resource not found - workspace or table may not exist', 'NOT_FOUND_ERROR', false);
  }
  if (status === 429) {
    return new DatabaseError('Rate limit exceeded - too many requests', 'RATE_LIMIT_ERROR', true);
  }
  if (status >= 500) {
    return new DatabaseError(`Server error (${status}): ${error.message}`, 'SERVER_ERROR', true);
  }
  
  // Query-specific errors
  if (message.includes('invalid column') || message.includes('unknown column')) {
    return new DatabaseError('Query syntax error - invalid column reference', 'QUERY_SYNTAX_ERROR', false);
  }
  if (message.includes('timeout') || message.includes('deadlock')) {
    return new DatabaseError('Query timeout or deadlock detected', 'TIMEOUT_ERROR', true);
  }
  
  // Default to generic error
  return new DatabaseError(`Database operation failed: ${error.message}`, 'GENERIC_ERROR', true);
}

// Enhanced retry logic with exponential backoff and jitter
async function executeOptimizedQuery(token, orgId, workspaceId, query, queryId) {
  const maxRetries = QUERY_OPTIMIZATION.RETRY_ATTEMPTS;
  let lastError;
  let totalDelay = 0;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await queryPool.executeQuery(queryId, async () => {
        const response = await axios.post(
          `${BASE_URL}/workspaces/${workspaceId}/views/revenue_master_view/data`,
          {
            query: query,
            format: 'json'
          },
          {
            headers: headersFor(token, orgId),
            timeout: QUERY_OPTIMIZATION.QUERY_TIMEOUT_MS
          }
        );
        
        return response.data;
      });
      
    } catch (error) {
      const dbError = classifyError(error);
      lastError = dbError;
      
      console.warn(`Query attempt ${attempt} failed for ${queryId}:`, {
        error: dbError.message,
        code: dbError.code,
        retryable: dbError.retryable,
        attempt: attempt,
        totalDelay: totalDelay
      });
      
      // Don't retry non-retryable errors
      if (!dbError.retryable) {
        throw dbError;
      }
      
      if (attempt < maxRetries) {
        // Exponential backoff with jitter
        const baseDelay = QUERY_OPTIMIZATION.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 0.3 * baseDelay; // 30% jitter
        const delay = baseDelay + jitter;
        totalDelay += delay;
        
        console.log(`🔄 Retrying query ${queryId} in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // Log final failure with detailed information
  console.error(`❌ Query ${queryId} failed after ${maxRetries} attempts:`, {
    error: lastError.message,
    code: lastError.code,
    totalDelay: totalDelay,
    queryId: queryId
  });
  
  throw new DatabaseError(
    `Query failed after ${maxRetries} attempts (total delay: ${totalDelay}ms): ${lastError.message}`,
    lastError.code,
    false
  );
}

// Chunked data retrieval for large datasets
async function getChunkedData(token, orgId, workspaceId, filters, sortField, sortOrder, chunkSize = QUERY_OPTIMIZATION.CHUNK_SIZE) {
  const allData = [];
  let offset = 0;
  let hasMoreData = true;
  let totalRetrieved = 0;
  
  while (hasMoreData && totalRetrieved < QUERY_OPTIMIZATION.MAX_TOTAL_RECORDS) {
    const chunkQuery = `
      ${REVENUE_MASTER_QUERY}
      ${buildWhereClause(filters)}
      ORDER BY ${sortField || 'dt.created_at'} ${sortOrder || 'DESC'}
      LIMIT ${chunkSize} OFFSET ${offset}
    `;
    
    const queryId = `chunk_${offset}_${chunkSize}`;
    const chunkData = await executeOptimizedQuery(token, orgId, workspaceId, chunkQuery, queryId);
    
    if (!chunkData.data || chunkData.data.length === 0) {
      hasMoreData = false;
    } else {
      allData.push(...chunkData.data);
      totalRetrieved += chunkData.data.length;
      offset += chunkSize;
      
      // If we got less than the chunk size, we've reached the end
      if (chunkData.data.length < chunkSize) {
        hasMoreData = false;
      }
    }
  }
  
  return allData;
}

// Enhanced pagination support for large result sets
const PAGINATION_CONFIG = {
  // Default pagination settings
  DEFAULT_PAGE_SIZE: 50,
  MIN_PAGE_SIZE: 1,
  MAX_PAGE_SIZE: 1000,
  
  // Large dataset handling
  LARGE_DATASET_THRESHOLD: 10000, // Records
  CHUNK_SIZE_FOR_LARGE_DATASETS: 500,
  
  // Performance optimization
  MAX_TOTAL_PAGES: 10000,
  CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes
  
  // Memory management
  MAX_MEMORY_USAGE_MB: 512,
  MEMORY_CHECK_INTERVAL: 1000 // Records
};

// Enhanced pagination class for managing large datasets
class PaginationManager {
  constructor() {
    this.cache = new Map();
    this.memoryUsage = 0;
    this.lastMemoryCheck = 0;
  }
  
  // Calculate optimal page size based on dataset characteristics
  calculateOptimalPageSize(totalRecords, filters) {
    if (totalRecords <= PAGINATION_CONFIG.LARGE_DATASET_THRESHOLD) {
      return Math.min(PAGINATION_CONFIG.MAX_PAGE_SIZE, Math.max(PAGINATION_CONFIG.DEFAULT_PAGE_SIZE, Math.ceil(totalRecords / 20)));
    }
    
    // For large datasets, use smaller page sizes to improve performance
    return PAGINATION_CONFIG.CHUNK_SIZE_FOR_LARGE_DATASETS;
  }
  
  // Validate pagination parameters
  validatePagination(page, pageSize, totalRecords = null) {
    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedPageSize = Math.min(
      PAGINATION_CONFIG.MAX_PAGE_SIZE,
      Math.max(PAGINATION_CONFIG.MIN_PAGE_SIZE, parseInt(pageSize) || PAGINATION_CONFIG.DEFAULT_PAGE_SIZE)
    );
    
    // Check if page exceeds maximum allowed
    if (totalRecords && validatedPage > PAGINATION_CONFIG.MAX_TOTAL_PAGES) {
      throw new Error(`Page number exceeds maximum allowed (${PAGINATION_CONFIG.MAX_TOTAL_PAGES})`);
    }
    
    return { page: validatedPage, pageSize: validatedPageSize };
  }
  
  // Generate pagination metadata
  generatePaginationMetadata(page, pageSize, totalRecords, totalPages) {
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;
    
    return {
      currentPage: page,
      pageSize: pageSize,
      totalRecords: totalRecords,
      totalPages: totalPages,
      hasNextPage,
      hasPreviousPage,
      nextPage: hasNextPage ? page + 1 : null,
      previousPage: hasPreviousPage ? page - 1 : null,
      startRecord: (page - 1) * pageSize + 1,
      endRecord: Math.min(page * pageSize, totalRecords),
      recordRange: `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, totalRecords)} of ${totalRecords}`
    };
  }
  
  // Memory management for large datasets
  checkMemoryUsage(recordCount) {
    if (recordCount - this.lastMemoryCheck >= PAGINATION_CONFIG.MEMORY_CHECK_INTERVAL) {
      const currentMemory = process.memoryUsage();
      this.memoryUsage = currentMemory.heapUsed / 1024 / 1024; // MB
      this.lastMemoryCheck = recordCount;
      
      if (this.memoryUsage > PAGINATION_CONFIG.MAX_MEMORY_USAGE_MB) {
        console.warn(`⚠️ High memory usage detected: ${this.memoryUsage.toFixed(2)}MB`);
        return false; // Indicate memory pressure
      }
    }
    return true;
  }
  
  // Cache management
  getCachedPage(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < PAGINATION_CONFIG.CACHE_TTL_MS) {
      return cached.data;
    }
    return null;
  }
  
  setCachedPage(cacheKey, data) {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    // Clean up old cache entries if cache gets too large
    if (this.cache.size > 100) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      this.cache.delete(entries[0][0]); // Remove oldest entry
    }
  }
  
  // Clear cache
  clearCache() {
    this.cache.clear();
  }
}

const paginationManager = new PaginationManager();

// Enhanced getPaginatedData with better large dataset support
async function getPaginatedData(token, orgId, workspaceId, filters, page, pageSize, sortField, sortOrder) {
  const startTime = Date.now();
  
  try {
    // Validate pagination parameters
    const { page: validatedPage, pageSize: validatedPageSize } = paginationManager.validatePagination(page, pageSize);
    
    // Generate cache key
    const cacheKey = `revenue_paginated_${JSON.stringify(filters)}_${validatedPage}_${validatedPageSize}_${sortField}_${sortOrder}`;
    
    // Check cache first
    const cached = paginationManager.getCachedPage(cacheKey);
    if (cached) {
      console.log(`📦 Cache hit for paginated data: page ${validatedPage}`);
      return {
        ...cached,
        queryTime: Date.now() - startTime,
        fromCache: true
      };
    }
    
    // Calculate offset
    const offset = (validatedPage - 1) * validatedPageSize;
    
    // Build the main query with pagination
    const mainQuery = `
      ${REVENUE_MASTER_QUERY}
      ${buildWhereClause(filters)}
      ORDER BY ${sortField || 'dt.created_at'} ${sortOrder || 'DESC'}
      LIMIT ${validatedPageSize} OFFSET ${offset}
    `;
    
    // Execute the main query
    const queryId = `paginated_${validatedPage}_${validatedPageSize}`;
    const result = await executeOptimizedQuery(token, orgId, workspaceId, mainQuery, queryId);
    
    // Get total count for pagination metadata
    const countQuery = `
      SELECT COUNT(DISTINCT dt.id) as total_count
      FROM disbursement_transactions_DC dt
      LEFT JOIN disbursements_DC d ON dt.disbursement_id = d.id 
      LEFT JOIN (SELECT otp_inner.*, ROW_NUMBER() OVER(PARTITION BY otp_inner.disbursement_id ORDER BY CASE WHEN otp_inner.disbursement_status_id = 3 THEN 1 ELSE 2 END ASC, otp_inner.id DESC) as payee_rank FROM one_timer_disbursement_payees_DC otp_inner) otp ON otp.payee_rank = 1 AND d.id = otp.disbursement_id 
      LEFT JOIN insurance_companies_DC ic ON d.company_id = ic.id 
      LEFT JOIN payment_type_DC pt ON dt.payment_method_id = pt.id 
      LEFT JOIN vendor_costs_DC vc ON dt.payment_method_id = vc.payment_method_id 
      LEFT JOIN (SELECT ec_inner.*, ROW_NUMBER() OVER(PARTITION BY COALESCE(ec_inner.payment_method_id, -1), COALESCE(ec_inner.company_id, -1) ORDER BY CASE WHEN ec_inner.payment_method_id IS NOT NULL AND ec_inner.company_id IS NOT NULL THEN 4 WHEN ec_inner.payment_method_id IS NOT NULL AND ec_inner.company_id IS NULL THEN 3 WHEN ec_inner.payment_method_id IS NULL AND ec_inner.company_id IS NOT NULL THEN 2 WHEN ec_inner.payment_method_id IS NULL AND ec_inner.company_id IS NULL THEN 1 ELSE 0 END DESC, ec_inner.id ASC) as priority_rank FROM employee_commissions_DC ec_inner WHERE ec_inner.active = 'Yes') ec ON ec.priority_rank = 1 AND (ec.payment_method_id IS NULL OR dt.payment_method_id = ec.payment_method_id) AND (ec.company_id IS NULL OR d.company_id = ec.company_id) 
      LEFT JOIN (SELECT crm_inner.*, ROW_NUMBER() OVER(PARTITION BY crm_inner.company_id ORDER BY crm_inner.id ASC) as mapping_rank FROM company_referral_mapping_DC crm_inner WHERE crm_inner.active = 'TRUE') crm ON crm.mapping_rank = 1 AND d.company_id = crm.company_id 
      LEFT JOIN referral_partners_DC rp ON (crm.referral_partner_id = rp.id AND rp.active = 'Yes') 
      LEFT JOIN (SELECT cuf_inner.*, ROW_NUMBER() OVER(PARTITION BY cuf_inner.company_id, cuf_inner.payment_method_id ORDER BY cuf_inner.id ASC) as upcharge_rank FROM company_upcharge_fees_DC cuf_inner WHERE cuf_inner.active = 'TRUE') cuf ON cuf.upcharge_rank = 1 AND d.company_id = cuf.company_id AND dt.payment_method_id = cuf.payment_method_id
      ${buildWhereClause(filters)}
    `;
    
    const countResult = await executeOptimizedQuery(token, orgId, workspaceId, countQuery, `count_${queryId}`);
    const totalRecords = countResult.data?.[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / validatedPageSize);
    
    // Generate pagination metadata
    const pagination = paginationManager.generatePaginationMetadata(
      validatedPage, 
      validatedPageSize, 
      totalRecords, 
      totalPages
    );
    
    // Prepare response data
    const responseData = {
      records: result.data || [],
      pagination,
      queryTime: Date.now() - startTime,
      fromCache: false,
      performance: {
        totalRecords,
        pageSize: validatedPageSize,
        memoryUsage: paginationManager.memoryUsage,
        cacheHit: false
      }
    };
    
    // Cache the result
    paginationManager.setCachedPage(cacheKey, responseData);
    
    console.log(`✅ Paginated data retrieved: ${responseData.records.length} records, page ${validatedPage}/${totalPages}`);
    
    return responseData;
    
  } catch (error) {
    console.error('❌ Error in getPaginatedData:', error);
    throw error;
  }
}

// Helper function to calculate KPIs from data
function calculateKPIs(data) {
  const kpis = {
    total_revenue: 0,
    total_transactions: 0,
    average_transaction_amount: 0,
    payee_fee_revenue: 0,
    payor_fee_revenue: 0,
    total_costs: 0,
    gross_profit: 0,
    total_commissions: 0,
    net_profit: 0,
    profit_margin: 0
  };
  
  if (data.length === 0) return kpis;
  
  data.forEach(record => {
    kpis.total_revenue += record.Gross_Revenue || 0;
    kpis.total_transactions += record.Is_Total_Transaction || 0;
    kpis.payee_fee_revenue += record.Payee_Fee_Revenue || 0;
    kpis.payor_fee_revenue += record.Payor_Fee_Revenue || 0;
    kpis.total_costs += (record.Total_Vendor_Cost || 0) + (record.Company_Upcharge_Fees || 0);
    kpis.total_commissions += (record.Employee_Commission || 0) + (record.Referral_Partner_Commission || 0);
  });
  
  kpis.gross_profit = kpis.total_revenue - kpis.total_costs;
  kpis.net_profit = kpis.gross_profit - kpis.total_commissions;
  kpis.average_transaction_amount = kpis.total_transactions > 0 ? kpis.total_revenue / kpis.total_transactions : 0;
  kpis.profit_margin = kpis.total_revenue > 0 ? (kpis.net_profit / kpis.total_revenue) * 100 : 0;
  
  return kpis;
}

// Helper function to generate chart data
function generateChartData(data) {
  const charts = {
    pie_chart: [],
    bar_chart: [],
    line_chart: [],
    waterfall_chart: []
  };
  
  // Company performance bar chart
  const companyPerformance = {};
  data.forEach(record => {
    const company = record.company || 'Unknown';
    if (!companyPerformance[company]) {
      companyPerformance[company] = {
        revenue: 0,
        transactions: 0,
        costs: 0,
        commissions: 0,
        profit: 0
      };
    }
    companyPerformance[company].revenue += record.Gross_Revenue || 0;
    companyPerformance[company].transactions += record.Is_Total_Transaction || 0;
    companyPerformance[company].costs += (record.Total_Vendor_Cost || 0) + (record.Company_Upcharge_Fees || 0);
    companyPerformance[company].commissions += (record.Employee_Commission || 0) + (record.Referral_Partner_Commission || 0);
    companyPerformance[company].profit += record.Final_Net_Profit || 0;
  });
  
  charts.bar_chart = Object.entries(companyPerformance).map(([company, data]) => ({
    label: company,
    value: data.revenue,
    category: 'Revenue'
  }));
  
  // Revenue breakdown pie chart
  const totalPayee = data.reduce((sum, record) => sum + (record.Payee_Fee_Revenue || 0), 0);
  const totalPayor = data.reduce((sum, record) => sum + (record.Payor_Fee_Revenue || 0), 0);
  
  charts.pie_chart = [
    { label: 'Payee Fees', value: totalPayee, percentage: totalPayee / (totalPayee + totalPayor) * 100 },
    { label: 'Payor Fees', value: totalPayor, percentage: totalPayor / (totalPayee + totalPayor) * 100 }
  ];
  
  return charts;
}

// Data validation and sanitization utilities
const VALIDATION_RULES = {
  // Date validation
  dateRange: {
    minDays: 1,
    maxDays: 365 * 2, // 2 years max
    format: /^\d{4}-\d{2}-\d{2}$/
  },
  
  // Numeric validation
  amountRange: {
    min: 0,
    max: 999999999.99
  },
  
  // ID validation
  id: {
    pattern: /^\d+$/,
    maxLength: 20
  },
  
  // String validation
  string: {
    maxLength: 255,
    pattern: /^[a-zA-Z0-9\s\-_.,()]+$/
  },
  
  // Array validation
  array: {
    maxItems: 100,
    maxItemLength: 50
  },
  
  // Pagination validation
  pagination: {
    minPage: 1,
    maxPage: 10000,
    minPageSize: 1,
    maxPageSize: 1000
  }
};

class ValidationError extends Error {
  constructor(message, field, value) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

// Sanitization functions
const sanitizers = {
  // Remove SQL injection patterns
  sqlInjection: (value) => {
    if (typeof value !== 'string') return value;
    return value
      .replace(/['";\\]/g, '') // Remove dangerous characters
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*.*?\*\//g, '') // Remove block comments
      .replace(/union\s+select/gi, '') // Remove UNION SELECT
      .replace(/drop\s+table/gi, '') // Remove DROP TABLE
      .replace(/delete\s+from/gi, ''); // Remove DELETE FROM
  },
  
  // Sanitize numeric values
  numeric: (value) => {
    if (value === null || value === undefined) return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  },
  
  // Sanitize date values
  date: (value) => {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : value;
  },
  
  // Sanitize string values
  string: (value) => {
    if (typeof value !== 'string') return null;
    return value.trim().substring(0, VALIDATION_RULES.string.maxLength);
  },
  
  // Sanitize array values
  array: (value) => {
    if (!Array.isArray(value)) return [];
    return value
      .slice(0, VALIDATION_RULES.array.maxItems)
      .map(item => sanitizers.string(item))
      .filter(Boolean);
  }
};

// Validation functions
const validators = {
  // Validate date range
  dateRange: (startDate, endDate) => {
    if (!startDate || !endDate) {
      throw new ValidationError('Both start and end dates are required', 'dateRange', { startDate, endDate });
    }
    
    if (!VALIDATION_RULES.dateRange.format.test(startDate) || !VALIDATION_RULES.dateRange.format.test(endDate)) {
      throw new ValidationError('Invalid date format. Use YYYY-MM-DD', 'dateRange', { startDate, endDate });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ValidationError('Invalid date values', 'dateRange', { startDate, endDate });
    }
    
    if (start > end) {
      throw new ValidationError('Start date must be before end date', 'dateRange', { startDate, endDate });
    }
    
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (daysDiff < VALIDATION_RULES.dateRange.minDays || daysDiff > VALIDATION_RULES.dateRange.maxDays) {
      throw new ValidationError(`Date range must be between ${VALIDATION_RULES.dateRange.minDays} and ${VALIDATION_RULES.dateRange.maxDays} days`, 'dateRange', { startDate, endDate });
    }
    
    return { startDate, endDate };
  },
  
  // Validate amount range
  amountRange: (minAmount, maxAmount) => {
    const min = sanitizers.numeric(minAmount);
    const max = sanitizers.numeric(maxAmount);
    
    if (min !== null && (min < VALIDATION_RULES.amountRange.min || min > VALIDATION_RULES.amountRange.max)) {
      throw new ValidationError(`Minimum amount must be between ${VALIDATION_RULES.amountRange.min} and ${VALIDATION_RULES.amountRange.max}`, 'minAmount', minAmount);
    }
    
    if (max !== null && (max < VALIDATION_RULES.amountRange.min || max > VALIDATION_RULES.amountRange.max)) {
      throw new ValidationError(`Maximum amount must be between ${VALIDATION_RULES.amountRange.min} and ${VALIDATION_RULES.amountRange.max}`, 'maxAmount', maxAmount);
    }
    
    if (min !== null && max !== null && min > max) {
      throw new ValidationError('Minimum amount must be less than maximum amount', 'amountRange', { minAmount, maxAmount });
    }
    
    return { minAmount: min, maxAmount: max };
  },
  
  // Validate IDs
  id: (value, fieldName) => {
    if (!value) return null;
    
    const sanitized = sanitizers.string(value);
    if (!sanitized || !VALIDATION_RULES.id.pattern.test(sanitized)) {
      throw new ValidationError(`Invalid ${fieldName} ID format`, fieldName, value);
    }
    
    if (sanitized.length > VALIDATION_RULES.id.maxLength) {
      throw new ValidationError(`${fieldName} ID too long`, fieldName, value);
    }
    
    return sanitized;
  },
  
  // Validate string arrays (for multi-select filters)
  stringArray: (value, fieldName) => {
    if (!value) return [];
    
    const sanitized = sanitizers.array(value);
    if (sanitized.length > VALIDATION_RULES.array.maxItems) {
      throw new ValidationError(`Too many ${fieldName} items selected`, fieldName, value);
    }
    
    return sanitized;
  },
  
  // Validate pagination parameters
  pagination: (page, pageSize) => {
    const pageNum = parseInt(page) || 1;
    const size = parseInt(pageSize) || 50;
    
    if (pageNum < VALIDATION_RULES.pagination.minPage || pageNum > VALIDATION_RULES.pagination.maxPage) {
      throw new ValidationError(`Page must be between ${VALIDATION_RULES.pagination.minPage} and ${VALIDATION_RULES.pagination.maxPage}`, 'page', page);
    }
    
    if (size < VALIDATION_RULES.pagination.minPageSize || size > VALIDATION_RULES.pagination.maxPageSize) {
      throw new ValidationError(`Page size must be between ${VALIDATION_RULES.pagination.minPageSize} and ${VALIDATION_RULES.pagination.maxPageSize}`, 'pageSize', pageSize);
    }
    
    return { page: pageNum, pageSize: size };
  },
  
  // Validate sort parameters
  sort: (sortBy, sortOrder) => {
    const validSortFields = [
      'id', 'disbursement_id', 'payment_method_id', 'created_at', 'updated_at',
      'amount', 'company_id', 'employee_name', 'commission_amount',
      'referral_partner_name', 'vendor_name', 'payment_method_description'
    ];
    
    const validSortOrders = ['asc', 'desc'];
    
    if (sortBy && !validSortFields.includes(sortBy)) {
      throw new ValidationError(`Invalid sort field: ${sortBy}`, 'sortBy', sortBy);
    }
    
    if (sortOrder && !validSortOrders.includes(sortOrder.toLowerCase())) {
      throw new ValidationError(`Invalid sort order: ${sortOrder}`, 'sortOrder', sortOrder);
    }
    
    return {
      sortBy: sortBy || 'created_at',
      sortOrder: (sortOrder || 'desc').toLowerCase()
    };
  }
};

// Main validation function
function validateAndSanitizeFilters(filters) {
  const validated = {};
  const errors = [];
  
  try {
    // Validate and sanitize date range
    if (filters.startDate || filters.endDate) {
      const dateRange = validators.dateRange(filters.startDate, filters.endDate);
      validated.startDate = dateRange.startDate;
      validated.endDate = dateRange.endDate;
    }
    
    // Validate and sanitize amount range
    if (filters.minAmount || filters.maxAmount) {
      const amountRange = validators.amountRange(filters.minAmount, filters.maxAmount);
      validated.minAmount = amountRange.minAmount;
      validated.maxAmount = amountRange.maxAmount;
    }
    
    // Validate and sanitize company IDs
    if (filters.companyIds) {
      validated.companyIds = validators.stringArray(filters.companyIds, 'company');
    }
    
    // Validate and sanitize payment method IDs
    if (filters.paymentMethodIds) {
      validated.paymentMethodIds = validators.stringArray(filters.paymentMethodIds, 'paymentMethod');
    }
    
    // Validate and sanitize employee names
    if (filters.employeeNames) {
      validated.employeeNames = validators.stringArray(filters.employeeNames, 'employee');
    }
    
    // Validate and sanitize disbursement status IDs
    if (filters.disbursementStatusIds) {
      validated.disbursementStatusIds = validators.stringArray(filters.disbursementStatusIds, 'disbursementStatus');
    }
    
    // Validate and sanitize referral partner names
    if (filters.referralPartnerNames) {
      validated.referralPartnerNames = validators.stringArray(filters.referralPartnerNames, 'referralPartner');
    }
    
    // Validate and sanitize pagination
    const pagination = validators.pagination(filters.page, filters.pageSize);
    validated.page = pagination.page;
    validated.pageSize = pagination.pageSize;
    
    // Validate and sanitize sorting
    const sort = validators.sort(filters.sortBy, filters.sortOrder);
    validated.sortBy = sort.sortBy;
    validated.sortOrder = sort.sortOrder;
    
    // Validate chunked parameter
    validated.chunked = Boolean(filters.chunked);
    
  } catch (error) {
    if (error instanceof ValidationError) {
      errors.push({
        field: error.field,
        message: error.message,
        value: error.value
      });
    } else {
      errors.push({
        field: 'unknown',
        message: 'Unknown validation error',
        value: null
      });
    }
  }
  
  return { validated, errors };
}

// Enhanced buildWhereClause with validation
function buildWhereClause(filters) {
  const conditions = [];
  const params = [];
  let paramIndex = 1;
  
  // Date range filtering
  if (filters.startDate && filters.endDate) {
    conditions.push(`dt.created_at >= ? AND dt.created_at <= ?`);
    params.push(filters.startDate, filters.endDate);
    paramIndex += 2;
  }
  
  // Company filtering
  if (filters.companyIds && filters.companyIds.length > 0) {
    const placeholders = filters.companyIds.map(() => '?').join(',');
    conditions.push(`d.company_id IN (${placeholders})`);
    params.push(...filters.companyIds);
    paramIndex += filters.companyIds.length;
  }
  
  // Payment method filtering
  if (filters.paymentMethodIds && filters.paymentMethodIds.length > 0) {
    const placeholders = filters.paymentMethodIds.map(() => '?').join(',');
    conditions.push(`dt.payment_method_id IN (${placeholders})`);
    params.push(...filters.paymentMethodIds);
    paramIndex += filters.paymentMethodIds.length;
  }
  
  // Amount range filtering
  if (filters.minAmount !== null && filters.minAmount !== undefined) {
    conditions.push(`otp.amount >= ?`);
    params.push(filters.minAmount);
    paramIndex++;
  }
  
  if (filters.maxAmount !== null && filters.maxAmount !== undefined) {
    conditions.push(`otp.amount <= ?`);
    params.push(filters.maxAmount);
    paramIndex++;
  }
  
  // Employee filtering
  if (filters.employeeNames && filters.employeeNames.length > 0) {
    const placeholders = filters.employeeNames.map(() => '?').join(',');
    conditions.push(`ec.employee_name IN (${placeholders})`);
    params.push(...filters.employeeNames);
    paramIndex += filters.employeeNames.length;
  }
  
  // Disbursement status filtering
  if (filters.disbursementStatusIds && filters.disbursementStatusIds.length > 0) {
    const placeholders = filters.disbursementStatusIds.map(() => '?').join(',');
    conditions.push(`otp.disbursement_status_id IN (${placeholders})`);
    params.push(...filters.disbursementStatusIds);
    paramIndex += filters.disbursementStatusIds.length;
  }
  
  // Referral partner filtering
  if (filters.referralPartnerNames && filters.referralPartnerNames.length > 0) {
    const placeholders = filters.referralPartnerNames.map(() => '?').join(',');
    conditions.push(`rp.partner_name IN (${placeholders})`);
    params.push(...filters.referralPartnerNames);
    paramIndex += filters.referralPartnerNames.length;
  }
  
  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
}

// Comprehensive logging and performance monitoring
const LOGGING_CONFIG = {
  // Log levels
  LEVELS: {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4
  },
  
  // Performance thresholds
  PERFORMANCE_THRESHOLDS: {
    SLOW_QUERY_MS: 5000,
    SLOW_API_MS: 3000,
    MEMORY_WARNING_MB: 256,
    ERROR_RATE_THRESHOLD: 0.05 // 5%
  },
  
  // Logging configuration
  LOG_LEVEL: process.env.LOG_LEVEL || 'INFO',
  ENABLE_STRUCTURED_LOGGING: true,
  ENABLE_PERFORMANCE_MONITORING: true,
  ENABLE_ERROR_TRACKING: true,
  
  // Retention and rotation
  MAX_LOG_ENTRIES: 10000,
  LOG_RETENTION_DAYS: 30,
  
  // Monitoring intervals
  HEALTH_CHECK_INTERVAL_MS: 300000, // 5 minutes
  PERFORMANCE_SNAPSHOT_INTERVAL_MS: 60000, // 1 minute
  ERROR_RATE_CALCULATION_INTERVAL_MS: 300000 // 5 minutes
};

// Structured logging class
class StructuredLogger {
  constructor() {
    this.logLevel = LOGGING_CONFIG.LEVELS[LOGGING_CONFIG.LOG_LEVEL] || LOGGING_CONFIG.LEVELS.INFO;
    this.logs = [];
    this.performanceMetrics = new Map();
    this.errorCounts = new Map();
    this.lastCleanup = Date.now();
  }
  
  // Log with structured format
  log(level, message, context = {}) {
    if (level > this.logLevel) return;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: Object.keys(LOGGING_CONFIG.LEVELS)[level],
      message,
      context: {
        ...context,
        service: 'revenue-dashboard-api',
        version: '1.0.0'
      }
    };
    
    // Add to in-memory logs
    this.logs.push(logEntry);
    
    // Cleanup old logs
    this._cleanupOldLogs();
    
    // Console output with structured format
    if (LOGGING_CONFIG.ENABLE_STRUCTURED_LOGGING) {
      console.log(JSON.stringify(logEntry));
    } else {
      console.log(`[${logEntry.level}] ${logEntry.message}`, context);
    }
  }
  
  // Performance monitoring
  startTimer(operation, context = {}) {
    const timerId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = process.hrtime.bigint();
    
    return {
      timerId,
      stop: () => this._stopTimer(timerId, operation, startTime, context)
    };
  }
  
  _stopTimer(timerId, operation, startTime, context) {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    // Record performance metric
    if (!this.performanceMetrics.has(operation)) {
      this.performanceMetrics.set(operation, []);
    }
    this.performanceMetrics.get(operation).push({
      duration: durationMs,
      timestamp: Date.now(),
      context
    });
    
    // Log slow operations
    if (durationMs > LOGGING_CONFIG.PERFORMANCE_THRESHOLDS.SLOW_QUERY_MS) {
      this.log(LOGGING_CONFIG.LEVELS.WARN, `Slow operation detected: ${operation}`, {
        duration: durationMs,
        threshold: LOGGING_CONFIG.PERFORMANCE_THRESHOLDS.SLOW_QUERY_MS,
        ...context
      });
    }
    
    return durationMs;
  }
  
  // Error tracking
  trackError(error, context = {}) {
    const errorKey = error.name || 'UnknownError';
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);
    
    this.log(LOGGING_CONFIG.LEVELS.ERROR, `Error occurred: ${error.message}`, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      ...context
    });
  }
  
  // Memory monitoring
  logMemoryUsage(context = {}) {
    const memUsage = process.memoryUsage();
    const memoryMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };
    
    if (memoryMB.heapUsed > LOGGING_CONFIG.PERFORMANCE_THRESHOLDS.MEMORY_WARNING_MB) {
      this.log(LOGGING_CONFIG.LEVELS.WARN, 'High memory usage detected', {
        memory: memoryMB,
        ...context
      });
    }
    
    return memoryMB;
  }
  
  // Performance metrics
  getPerformanceMetrics() {
    const metrics = {};
    
    for (const [operation, measurements] of this.performanceMetrics) {
      if (measurements.length === 0) continue;
      
      const durations = measurements.map(m => m.duration);
      metrics[operation] = {
        count: measurements.length,
        average: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
        p95: this._percentile(durations, 95),
        p99: this._percentile(durations, 99),
        last24h: measurements.filter(m => Date.now() - m.timestamp < 24 * 60 * 60 * 1000).length
      };
    }
    
    return metrics;
  }
  
  // Error rate calculation
  getErrorRate() {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0);
    const totalRequests = this.logs.filter(log => 
      log.message.includes('API request') || log.message.includes('Query executed')
    ).length;
    
    return totalRequests > 0 ? totalErrors / totalRequests : 0;
  }
  
  // Health check logging
  logHealthCheck(status, duration, context = {}) {
    this.log(LOGGING_CONFIG.LEVELS.INFO, `Health check ${status}`, {
      duration,
      timestamp: new Date().toISOString(),
      ...context
    });
  }
  
  // API request logging
  logApiRequest(method, path, statusCode, duration, context = {}) {
    const level = statusCode >= 400 ? LOGGING_CONFIG.LEVELS.WARN : LOGGING_CONFIG.LEVELS.INFO;
    
    this.log(level, 'API request completed', {
      method,
      path,
      statusCode,
      duration,
      timestamp: new Date().toISOString(),
      ...context
    });
  }
  
  // Database query logging
  logDatabaseQuery(query, duration, rowCount, context = {}) {
    this.log(LOGGING_CONFIG.LEVELS.INFO, 'Database query executed', {
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
      duration,
      rowCount,
      timestamp: new Date().toISOString(),
      ...context
    });
  }
  
  // Cache operation logging
  logCacheOperation(operation, key, hit, duration, context = {}) {
    this.log(LOGGING_CONFIG.LEVELS.DEBUG, `Cache ${operation}`, {
      key: key.substring(0, 100),
      hit,
      duration,
      timestamp: new Date().toISOString(),
      ...context
    });
  }
  
  // Utility methods
  _percentile(arr, p) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }
  
  _cleanupOldLogs() {
    const now = Date.now();
    const cutoff = now - (LOGGING_CONFIG.LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    
    // Clean up old logs
    this.logs = this.logs.filter(log => new Date(log.timestamp).getTime() > cutoff);
    
    // Clean up old performance metrics
    for (const [operation, measurements] of this.performanceMetrics) {
      this.performanceMetrics.set(operation, 
        measurements.filter(m => m.timestamp > cutoff)
      );
    }
    
    // Limit log entries
    if (this.logs.length > LOGGING_CONFIG.MAX_LOG_ENTRIES) {
      this.logs = this.logs.slice(-LOGGING_CONFIG.MAX_LOG_ENTRIES);
    }
  }
  
  // Get logs for analysis
  getLogs(level = null, limit = 100) {
    let filteredLogs = this.logs;
    
    if (level !== null) {
      filteredLogs = filteredLogs.filter(log => 
        LOGGING_CONFIG.LEVELS[log.level] <= level
      );
    }
    
    return filteredLogs.slice(-limit);
  }
  
  // Export logs for external monitoring
  exportLogs() {
    return {
      logs: this.logs,
      performanceMetrics: this.getPerformanceMetrics(),
      errorCounts: Object.fromEntries(this.errorCounts),
      errorRate: this.getErrorRate(),
      memoryUsage: this.logMemoryUsage(),
      timestamp: new Date().toISOString()
    };
  }
}

// Global logger instance
const logger = new StructuredLogger();

// Performance monitoring middleware
function withPerformanceMonitoring(operation, fn) {
  return async (...args) => {
    const timer = logger.startTimer(operation);
    const startMemory = process.memoryUsage();
    
    try {
      const result = await fn(...args);
      const duration = timer.stop();
      
      logger.log(LOGGING_CONFIG.LEVELS.INFO, `${operation} completed successfully`, {
        duration,
        memoryDelta: {
          heapUsed: process.memoryUsage().heapUsed - startMemory.heapUsed,
          heapTotal: process.memoryUsage().heapTotal - startMemory.heapTotal
        }
      });
      
      return result;
    } catch (error) {
      timer.stop();
      logger.trackError(error, { operation });
      throw error;
    }
  };
}

// Enhanced error classification with logging
function classifyErrorWithLogging(error) {
  const classifiedError = classifyError(error);
  
  logger.trackError(classifiedError, {
    originalError: error.message,
    classification: {
      code: classifiedError.code,
      retryable: classifiedError.retryable
    }
  });
  
  return classifiedError;
}

export default async function handler(req, res) {
  const apiTimer = logger.startTimer('api_request');
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Log incoming request
  logger.log(LOGGING_CONFIG.LEVELS.INFO, 'API request received', {
    requestId,
    method: req.method,
    path: req.url,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });

  if (req.method !== 'POST') {
    const duration = apiTimer.stop();
    logger.logApiRequest(req.method, req.url, 405, duration, { requestId });
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate and sanitize input filters
    const validationTimer = logger.startTimer('validation');
    const { validated: filters, errors: validationErrors } = validateAndSanitizeFilters(req.body);
    validationTimer.stop();
    
    if (validationErrors.length > 0) {
      const duration = apiTimer.stop();
      logger.logApiRequest(req.method, req.url, 400, duration, { 
        requestId, 
        validationErrors: validationErrors.length 
      });
      
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors,
        message: 'Invalid filter parameters provided'
      });
    }

    // Check circuit breaker
    if (circuitBreaker.isOpen()) {
      const duration = apiTimer.stop();
      logger.logApiRequest(req.method, req.url, 503, duration, { 
        requestId, 
        circuitBreakerStatus: 'open' 
      });
      
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        message: 'Database service is currently unavailable. Please try again later.',
        circuitBreakerStatus: 'open',
        retryAfter: circuitBreaker.getRetryAfter()
      });
    }

    // Check database health
    const healthStatus = healthMonitor.getStatus();
    if (healthStatus.status !== 'healthy') {
      const duration = apiTimer.stop();
      logger.logApiRequest(req.method, req.url, 503, duration, { 
        requestId, 
        healthStatus: 'unhealthy' 
      });
      
      return res.status(503).json({
        error: 'Database health check failed',
        message: 'Database is currently experiencing issues',
        healthStatus
      });
    }

    // Build validated WHERE clause
    const queryBuildTimer = logger.startTimer('query_build');
    const { whereClause, params } = buildWhereClause(filters);
    const fullQuery = `${REVENUE_MASTER_QUERY} ${whereClause} ORDER BY ${filters.sortBy} ${filters.sortOrder}`;
    queryBuildTimer.stop();
    
    // Get access token
    const tokenTimer = logger.startTimer('token_retrieval');
    const token = await getAccessTokenShared();
    tokenTimer.stop();
    
    if (!token) {
      const duration = apiTimer.stop();
      logger.logApiRequest(req.method, req.url, 401, duration, { 
        requestId, 
        error: 'token_retrieval_failed' 
      });
      
      return res.status(401).json({ error: "Failed to get access token" });
    }
    
    const orgId = process.env.ZOHO_ORG_ID;
    const workspaceId = process.env.ZOHO_WORKSPACE_ID;
    
    // Execute query with validated parameters
    const queryTimer = logger.startTimer('database_query');
    let result;
    if (filters.chunked) {
      result = await getChunkedData(token, orgId, workspaceId, filters, filters.sortBy, filters.sortOrder, filters.pageSize);
    } else {
      result = await getPaginatedData(token, orgId, workspaceId, filters, filters.page, filters.pageSize, filters.sortBy, filters.sortOrder);
    }
    const queryDuration = queryTimer.stop();
    
    // Log database query performance
    logger.logDatabaseQuery(
      fullQuery.substring(0, 200) + '...',
      queryDuration,
      result.records?.length || 0,
      { requestId, filters: Object.keys(filters) }
    );

    // Log successful query
    logger.log(LOGGING_CONFIG.LEVELS.INFO, 'Revenue dashboard query executed successfully', {
      requestId,
      recordCount: result.records?.length || 0,
      queryDuration,
      filters: Object.keys(filters),
      pagination: result.pagination
    });

    const totalDuration = apiTimer.stop();
    logger.logApiRequest(req.method, req.url, 200, totalDuration, { 
      requestId, 
      recordCount: result.records?.length || 0 
    });

    return res.status(200).json({
      success: true,
      data: result.records,
      pagination: result.pagination,
      metadata: {
        totalRecords: result.pagination.totalRecords,
        totalPages: result.pagination.totalPages,
        currentPage: result.pagination.currentPage,
        pageSize: result.pagination.pageSize,
        queryTime: result.queryTime,
        filters: filters,
        requestId
      },
      health: {
        database: healthStatus,
        circuitBreaker: circuitBreaker.getStatus(),
        queryPool: queryPool.getStatus()
      }
    });

  } catch (error) {
    // Classify and handle errors
    const classifiedError = classifyErrorWithLogging(error);
    
    // Log error with context
    logger.trackError(error, {
      requestId,
      method: req.method,
      path: req.url,
      filters: req.body,
      classification: {
        code: classifiedError.code,
        retryable: classifiedError.retryable
      }
    });

    // Update circuit breaker
    circuitBreaker.recordFailure();

    const totalDuration = apiTimer.stop();
    logger.logApiRequest(req.method, req.url, classifiedError.statusCode || 500, totalDuration, { 
      requestId, 
      error: classifiedError.code 
    });

    return res.status(classifiedError.statusCode || 500).json({
      error: classifiedError.message,
      type: classifiedError.code,
      retryable: classifiedError.retryable,
      requestId,
      health: {
        database: healthMonitor.getStatus(),
        circuitBreaker: circuitBreaker.getStatus(),
        queryPool: queryPool.getStatus()
      }
    });
  }
}

// Monitoring endpoint for external systems
export async function monitoringHandler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const monitoringData = {
      service: 'revenue-dashboard-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: logger.logMemoryUsage(),
      performance: logger.getPerformanceMetrics(),
      errors: {
        counts: Object.fromEntries(logger.errorCounts),
        rate: logger.getErrorRate()
      },
      health: {
        database: healthMonitor.getStatus(),
        circuitBreaker: circuitBreaker.getStatus(),
        queryPool: queryPool.getStatus()
      },
      logs: {
        total: logger.logs.length,
        recent: logger.getLogs(LOGGING_CONFIG.LEVELS.INFO, 10)
      }
    };

    return res.status(200).json(monitoringData);
  } catch (error) {
    logger.trackError(error, { endpoint: 'monitoring' });
    return res.status(500).json({ error: 'Failed to retrieve monitoring data' });
  }
}
