import axios, { AxiosResponse, AxiosError } from 'axios';
import { 
  DashboardDataRequest, 
  DashboardDataResponse, 
  DashboardFilters,
  RevenueMasterRecord,
  KPIWidget,
  ChartType,
  SortOrder,
  DashboardErrorState
} from '../types/dashboard';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://dc-commissions.vercel.app';
const REVENUE_DASHBOARD_ENDPOINT = `${API_BASE_URL}/api/revenue-dashboard`;

// Request timeout and retry configuration
const REQUEST_TIMEOUT = 60000; // 60 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

// Client-side cache for dashboard data
const clientCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Error types for frontend handling
export class RevenueApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public retryable: boolean = false,
    public healthStatus?: any
  ) {
    super(message);
    this.name = 'RevenueApiError';
  }
}

// Cache management utilities
function generateCacheKey(request: DashboardDataRequest): string {
  return `revenue_${JSON.stringify(request)}`;
}

function isCacheValid(cacheKey: string): boolean {
  const cached = clientCache.get(cacheKey);
  if (!cached) return false;
  
  return Date.now() - cached.timestamp < cached.ttl;
}

function getCachedData(cacheKey: string): any {
  const cached = clientCache.get(cacheKey);
  return cached?.data;
}

function setCachedData(cacheKey: string, data: any, ttl: number = CACHE_TTL): void {
  clientCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

// Error classification for frontend
function classifyApiError(error: AxiosError): RevenueApiError {
  const status = error.response?.status || 0;
  const data = error.response?.data as any;
  
  // Network errors (retryable)
  if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
    return new RevenueApiError(
      `Network connectivity issue: ${error.message}`,
      'NETWORK_ERROR',
      0,
      true
    );
  }
  
  // API-specific errors
  if (status === 401) {
    return new RevenueApiError(
      'Authentication failed - please refresh your session',
      'AUTH_ERROR',
      401,
      true
    );
  }
  
  if (status === 403) {
    return new RevenueApiError(
      'Access denied - insufficient permissions',
      'PERMISSION_ERROR',
      403,
      false
    );
  }
  
  if (status === 404) {
    return new RevenueApiError(
      'Resource not found - please check your configuration',
      'NOT_FOUND_ERROR',
      404,
      false
    );
  }
  
  if (status === 429) {
    return new RevenueApiError(
      'Rate limit exceeded - please wait before retrying',
      'RATE_LIMIT_ERROR',
      429,
      true
    );
  }
  
  if (status === 503) {
    return new RevenueApiError(
      'Service temporarily unavailable - please try again later',
      'SERVICE_UNAVAILABLE',
      503,
      true,
      data?.health_status
    );
  }
  
  // Use server-provided error information if available
  if (data?.code && data?.message) {
    return new RevenueApiError(
      data.message,
      data.code,
      status,
      data.retryable || false,
      data.health_status
    );
  }
  
  // Generic error
  return new RevenueApiError(
    `Request failed: ${error.message}`,
    'GENERIC_ERROR',
    status,
    true
  );
}

// Retry logic for failed requests
async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry non-retryable errors
      if (error instanceof RevenueApiError && !error.retryable) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const backoffDelay = delay * Math.pow(2, attempt - 1);
        console.warn(`Request attempt ${attempt} failed, retrying in ${backoffDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }
  
  throw lastError!;
}

// Main API service class
export class RevenueApiService {
  private static instance: RevenueApiService;
  
  private constructor() {}
  
  static getInstance(): RevenueApiService {
    if (!RevenueApiService.instance) {
      RevenueApiService.instance = new RevenueApiService();
    }
    return RevenueApiService.instance;
  }
  
  // Fetch revenue dashboard data with caching and retry logic
  async fetchDashboardData(request: DashboardDataRequest): Promise<DashboardDataResponse> {
    const cacheKey = generateCacheKey(request);
    
    // Check cache first
    if (isCacheValid(cacheKey)) {
      console.log('📦 Using cached dashboard data');
      return getCachedData(cacheKey);
    }
    
    // Fetch fresh data with retry logic
    const data = await retryRequest(async () => {
      console.log('🚀 Fetching fresh dashboard data...');
      
      const response: AxiosResponse<DashboardDataResponse> = await axios.post(
        REVENUE_DASHBOARD_ENDPOINT,
        request,
        {
          timeout: REQUEST_TIMEOUT,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
    });
    
    // Cache the successful response
    setCachedData(cacheKey, data);
    
    return data;
  }
  
  // Fetch data with specific filters
  async fetchRevenueData(filters: DashboardFilters, options: {
    page?: number;
    pageSize?: number;
    sortField?: string;
    sortOrder?: SortOrder;
    chunked?: boolean;
  } = {}): Promise<DashboardDataResponse> {
    const request: DashboardDataRequest = {
      filters,
      page: options.page || 1,
      page_size: options.pageSize || 100,
      sort_field: options.sortField,
      sort_order: options.sortOrder || 'desc',
      chunked: options.chunked || false
    };
    
    return this.fetchDashboardData(request);
  }
  
  // Fetch data for specific date range
  async fetchRevenueDataByDateRange(
    startDate: string,
    endDate: string,
    additionalFilters: Partial<DashboardFilters> = {}
  ): Promise<DashboardDataResponse> {
    const filters: DashboardFilters = {
      date_range: {
        type: 'custom',
        start_date: startDate,
        end_date: endDate
      },
      companies: additionalFilters.companies || { selected_companies: [] },
      payment_methods: additionalFilters.payment_methods || { selected_methods: [] },
      revenue_sources: additionalFilters.revenue_sources || {
        transaction_fees: false,
        payor_fees: false,
        interest_revenue: false
      },
      commission_types: additionalFilters.commission_types || {
        employee_commissions: false,
        referral_partner_commissions: false,
        interest_commissions: false
      },
      amount_range: additionalFilters.amount_range || {
        min_amount: undefined,
        max_amount: undefined
      },
      employees: additionalFilters.employees || { selected_employees: [] },
      referral_partners: additionalFilters.referral_partners || { selected_partners: [] },
      disbursement_status: additionalFilters.disbursement_status
    };
    
    return this.fetchRevenueData(filters);
  }
  
  // Fetch data for predefined time periods
  async fetchRevenueDataByPeriod(
    period: 'last_30_days' | 'last_90_days' | 'last_12_months' | 'ytd',
    additionalFilters: Partial<DashboardFilters> = {}
  ): Promise<DashboardDataResponse> {
    const filters: DashboardFilters = {
      date_range: { type: period },
      companies: additionalFilters.companies || { selected_companies: [] },
      payment_methods: additionalFilters.payment_methods || { selected_methods: [] },
      revenue_sources: additionalFilters.revenue_sources || {
        transaction_fees: false,
        payor_fees: false,
        interest_revenue: false
      },
      commission_types: additionalFilters.commission_types || {
        employee_commissions: false,
        referral_partner_commissions: false,
        interest_commissions: false
      },
      amount_range: additionalFilters.amount_range || {
        min_amount: undefined,
        max_amount: undefined
      },
      employees: additionalFilters.employees || { selected_employees: [] },
      referral_partners: additionalFilters.referral_partners || { selected_partners: [] },
      disbursement_status: additionalFilters.disbursement_status
    };
    
    return this.fetchRevenueData(filters);
  }
  
  // Fetch chunked data for large datasets
  async fetchChunkedRevenueData(
    filters: DashboardFilters,
    sortField?: string,
    sortOrder?: SortOrder
  ): Promise<RevenueMasterRecord[]> {
    const request: DashboardDataRequest = {
      filters,
      chunked: true,
      sort_field: sortField,
      sort_order: sortOrder || 'desc'
    };
    
    const response = await this.fetchDashboardData(request);
    return response.data || [];
  }
  
  // Clear cache for specific request or all cache
  clearCache(request?: DashboardDataRequest): void {
    if (request) {
      const cacheKey = generateCacheKey(request);
      clientCache.delete(cacheKey);
      console.log('🗑️ Cleared specific cache entry');
    } else {
      clientCache.clear();
      console.log('🗑️ Cleared all cache entries');
    }
  }
  
  // Get cache statistics
  getCacheStats(): {
    size: number;
    entries: Array<{ key: string; age: number; ttl: number }>;
  } {
    const entries = Array.from(clientCache.entries()).map(([key, value]) => ({
      key,
      age: Date.now() - value.timestamp,
      ttl: value.ttl
    }));
    
    return {
      size: clientCache.size,
      entries
    };
  }
  
  // Health check for the API
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      
      const response = await axios.get(`${API_BASE_URL}/api/zoho-analytics?health=1`, {
        timeout: 10000
      });
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const revenueApi = RevenueApiService.getInstance();

// Export wrapper functions for direct use
export const fetchRevenueData = (filters: DashboardFilters, options?: any) => 
  revenueApi.fetchRevenueData(filters, options);

export const fetchCommissionData = (filters: DashboardFilters, options?: any) =>
  revenueApi.fetchRevenueData(filters, options);

export const fetchCompanyData = (filters: DashboardFilters, options?: any) =>
  revenueApi.fetchRevenueData(filters, options);

export const fetchPaymentData = (filters: DashboardFilters, options?: any) =>
  revenueApi.fetchRevenueData(filters, options);

// Export utility functions for direct use
export {
  generateCacheKey,
  isCacheValid,
  getCachedData,
  setCachedData,
  classifyApiError,
  retryRequest
};
