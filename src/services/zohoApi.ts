import axios from 'axios';
import { ApiResponse, ApiError, SearchParams } from './apiTypes';
import { mockApi } from './mockData';
import { zohoAnalyticsAPI, ZohoAnalyticsResponse } from './zohoAnalyticsAPI';
import { auditLogger } from './auditLogger';
import { setBackoffUntil, waitForWindow } from '../lib/zohoBackoffGate';

// Retry utility with exponential backoff
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const jitter = (ms: number) => Math.floor(ms * (0.5 + Math.random())); // 50–150%

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 500
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on 503 rate limits - let the caller handle it
      if (error.response?.status === 503) {
        throw error;
      }
      
      // Don't retry on 401/403 auth errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw error;
      }
      
      // Don't retry on 400 bad requests
      if (error.response?.status === 400) {
        throw error;
      }
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff and jitter
      const delay = jitter(baseDelay * Math.pow(2, attempt));
      console.log(`Retry attempt ${attempt + 1}/${maxRetries + 1} after ${delay}ms`);
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

// Create a separate axios instance for Zoho Analytics API calls (no auth headers)
const zohoAxios = axios.create({
  baseURL: '',
  timeout: 30000,
  headers: {
    // Explicitly remove any authorization headers
    'Authorization': undefined
  }
});

// Ensure no global defaults are inherited
zohoAxios.defaults.headers.common = {};
zohoAxios.defaults.headers.common['Authorization'] = undefined;

// BEFORE each request: if we're in cooldown, wait
zohoAxios.interceptors.request.use(async (config) => {
  await waitForWindow();
  return config;
});

// AFTER response: if 503 + retry info, set backoff and throw (so caller can show toast once)
zohoAxios.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 503) {
      const raMs = Number(err.response?.data?.retryAfterMs) || 0;
      const raAt = Number(err.response?.data?.rateLimitEndsAt) || (Date.now() + raMs);
      if (raAt) setBackoffUntil(raAt);
    }
    return Promise.reject(err);
  }
);

// Check if we should use mock data (explicit flag only)
const USE_MOCK_DATA = process.env.REACT_APP_ENABLE_MOCK_DATA === 'true';

// Helper function to convert Zoho Analytics response to our API response format
function convertZohoResponse<T>(zohoResponse: any): ApiResponse<T> {
  // Handle new response format with 'rows' property
  const data = zohoResponse.rows || zohoResponse.data || [];
  const total = zohoResponse.total || zohoResponse.info?.totalRows || 0;
  const page = zohoResponse.page || zohoResponse.info?.pageNo || 1;
  const limit = zohoResponse.limit || zohoResponse.info?.perPage || 50;
  
  return {
    data: data,
    total: total,
    page: page,
    totalPages: Math.ceil(total / limit),
    limit: limit,
    success: zohoResponse.success !== false,
    status: zohoResponse.status || 'success',
    message: zohoResponse.message || 'Success'
  };
}

// Helper function to verify authentication headers
function verifyAuthHeaders() {
  try {
    const axios = require('axios');
    const authHeader = axios.defaults.headers.common['Authorization'];
    
    if (!authHeader) {
      console.warn('No authentication header found in axios defaults');
      return false;
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      console.warn('Authentication header does not start with "Bearer "');
      return false;
    }
    
    console.log('Authentication header verified:', authHeader.substring(0, 20) + '...');
    return true;
  } catch (error) {
    console.warn('Error verifying auth headers:', error);
    return false;
  }
}

// Helper function to get current user info for audit logging
function getCurrentUserInfo(): { userId: string; userName: string } {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return {
        userId: user.id?.toString() || 'unknown',
        userName: user.username || 'Unknown User'
      };
    }
  } catch (error) {
    console.warn('Failed to parse user info from localStorage:', error);
  }
  
  return {
    userId: 'unknown',
    userName: 'Unknown User'
  };
}

// Helper function to handle authentication for API calls with audit logging
async function handleAuthenticatedCall<T>(
  operation: () => Promise<T>,
  fallbackOperation: () => T | Promise<T>,
  operationName: string,
  auditContext?: {
    tableName?: string;
    recordId?: string;
    operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'SEARCH' | 'EXPORT';
    oldData?: any;
    newData?: any;
    metadata?: Record<string, any>;
  }
): Promise<T> {
  const { userId, userName } = getCurrentUserInfo();
  
  if (USE_MOCK_DATA) {
    const result = fallbackOperation();
    const finalResult = result instanceof Promise ? await result : result;
    
            // Log audit entry for mock operations
        if (auditContext) {
          try {
            const startTime = Date.now();
            await logAuditEntry(userId, userName, auditContext, finalResult, startTime);
          } catch (auditError) {
            console.warn('Failed to log audit entry for mock operation:', auditError);
          }
        }
    
    return finalResult;
  }

  try {
    // Verify authentication headers before making the request
    if (!verifyAuthHeaders()) {
      console.warn(`Authentication headers not properly set for ${operationName}, falling back to mock data`);
      const result = fallbackOperation();
      const finalResult = result instanceof Promise ? await result : result;
      
              // Log audit entry for fallback operations
        if (auditContext) {
          try {
            const startTime = Date.now();
            await logAuditEntry(userId, userName, auditContext, finalResult, startTime);
          } catch (auditError) {
            console.warn('Failed to log audit entry for fallback operation:', auditError);
          }
        }
      
      return finalResult;
    }

    const result = await operation();
    
            // Log audit entry for successful operations
        if (auditContext) {
          try {
            const startTime = Date.now();
            await logAuditEntry(userId, userName, auditContext, result, startTime);
          } catch (auditError) {
            console.warn('Failed to log audit entry for successful operation:', auditError);
          }
        }
    
    return result;
  } catch (error: any) {
    console.error(`Error in ${operationName}:`, error);
    
    // If CORS is blocking the request, fall back to mock data
    if (error.message === 'CORS_BLOCKED_FALLBACK_TO_MOCK') {
      console.warn(`Falling back to mock data due to CORS restrictions for ${operationName}`);
      const result = fallbackOperation();
      const finalResult = result instanceof Promise ? await result : result;
      
              // Log audit entry for CORS fallback operations
        if (auditContext) {
          try {
            const startTime = Date.now();
            await logAuditEntry(userId, userName, auditContext, finalResult, startTime);
          } catch (auditError) {
            console.warn('Failed to log audit entry for CORS fallback operation:', auditError);
          }
        }
      
      return finalResult;
    }
    
    const apiError: ApiError = {
      code: 'API_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    throw apiError;
  }
}

// Helper function to log audit entries
async function logAuditEntry(
  userId: string,
  userName: string,
  context: {
    tableName?: string;
    recordId?: string;
    operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'SEARCH' | 'EXPORT';
    oldData?: any;
    newData?: any;
    metadata?: Record<string, any>;
  },
  result?: any,
  startTime?: number
): Promise<void> {
  if (!context.tableName) return;
  
  const recordId = context.recordId || (result?.id ? result.id.toString() : `op_${Date.now()}`);
  
  switch (context.operation) {
    case 'CREATE':
      await auditLogger.logCreate(
        userId,
        userName,
        context.tableName,
        recordId,
        context.newData || result || {},
        context.metadata
      );
      break;
      
    case 'UPDATE':
      await auditLogger.logUpdate(
        userId,
        userName,
        context.tableName,
        recordId,
        context.oldData || {},
        context.newData || result || {},
        undefined,
        context.metadata
      );
      break;
      
    case 'DELETE':
      await auditLogger.logDelete(
        userId,
        userName,
        context.tableName,
        recordId,
        context.oldData || {},
        context.metadata
      );
      break;
      
    case 'SEARCH':
      await auditLogger.logSearch(
        userId,
        userName,
        context.tableName,
        context.metadata?.query || 'unknown',
        Array.isArray(result) ? result.length : 0,
        true,
        undefined,
        context.metadata
      );
      break;
      
    case 'EXPORT':
      await auditLogger.logExport(
        userId,
        userName,
        context.tableName,
        context.metadata?.format || 'unknown',
        Array.isArray(result) ? result.length : 0,
        true,
        undefined,
        context.metadata
      );
      break;
  }
}

// Zoho Analytics API abstraction
export const zohoApi = {
  // Get records with search, filter, and pagination
  getRecords: async <T>(tableName: string, params?: SearchParams): Promise<ApiResponse<T>> => {
    if (USE_MOCK_DATA) {
      return mockApi.getRecords(tableName, params);
    }

    try {
      // Use backend proxy to avoid CORS issues (no auth headers needed)
      // Use POST since browsers strip GET bodies
      const response = await zohoAxios.post('/api/zoho-analytics.mjs', {
        tableName,
        action: 'records',
        params
      });

      return convertZohoResponse(response.data);
    } catch (error: any) {
      console.error(`Error fetching ${tableName} records:`, error);
      
      // Handle rate limiting specifically - show user message but don't retry locally
      if (error.response?.status === 503) {
        const retryAfterMs = error.response?.data?.retryAfterMs || 60000;
        console.warn(`Zoho Analytics rate limited. Retry after ${retryAfterMs}ms.`);
        
        // Show a single user message - the gate will handle timing
        if (retryAfterMs > 0) {
          throw new Error(`Zoho Analytics rate limit exceeded. Auto-retrying after ${Math.ceil(retryAfterMs / 1000)} seconds.`);
        } else {
          throw new Error('Zoho Analytics temporarily unavailable due to rate limiting.');
        }
      }
      
      // Only fall back to mock data if explicitly enabled
      if (USE_MOCK_DATA) {
        console.warn('Backend proxy failed, falling back to mock data (explicitly enabled)');
        return mockApi.getRecords(tableName, params);
      } else {
        // Show error details and don't fall back to mock data
        const errorMessage = error.response?.data?.details || error.message;
        console.error('Backend proxy failed, not falling back to mock data:', errorMessage);
        throw new Error(`Failed to fetch ${tableName} records: ${errorMessage}`);
      }
    }
  },

  // Get a single record by ID
  getRecord: async <T>(tableName: string, id: string): Promise<T> => {
    if (USE_MOCK_DATA) {
      const records = await mockApi.getRecords<T>(tableName);
      const record = records.data.find((r: any) => r.id === id);
      if (!record) {
        throw new Error('Record not found');
      }
      return record;
    }

    try {
      const response = await zohoAxios.post('/api/zoho-analytics.mjs', {
        tableName,
        action: 'record',
        params: { id }
      });

      return response.data as T;
    } catch (error: any) {
      console.error(`Error fetching ${tableName} record:`, error);
      throw error;
    }
  },

  // Create a new record
  createRecord: async <T>(tableName: string, data: any): Promise<T> => {
    if (USE_MOCK_DATA) {
      return mockApi.addRecord(tableName, data);
    }

    // Format dates for Zoho Analytics API
    const formattedData = { ...data };
    Object.keys(formattedData).forEach(key => {
      const value = formattedData[key];
      if (value && typeof value === 'string' && value.includes('T')) {
        // If it's already in ISO format, convert to yyyy-MM-dd
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            formattedData[key] = date.toISOString().split('T')[0];
          }
        } catch (e) {
          console.warn('Failed to format date:', value);
        }
      } else if (value && typeof value === 'string' && (
        value.includes('Aug') || value.includes('Jan') || value.includes('Feb') || 
        value.includes('Mar') || value.includes('Apr') || value.includes('May') || 
        value.includes('Jun') || value.includes('Jul') || value.includes('Sep') || 
        value.includes('Oct') || value.includes('Nov') || value.includes('Dec')
      )) {
        // Handle "26 Aug 2025 00:00:00" format
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            formattedData[key] = date.toISOString().split('T')[0];
          }
        } catch (e) {
          console.warn('Failed to parse date:', value);
        }
      }
    });

    try {
      const response = await zohoAxios.post('/api/zoho-analytics.mjs', {
        tableName,
        data: formattedData
      });

      // Log the create operation for audit
      try {
        await auditLogger.logCreate(
          'unknown',
          'Unknown User',
          tableName,
          response.data?.id || 'unknown',
          formattedData
        );
      } catch (error) {
        console.error('Audit logging failed:', error);
      }

      return response.data as T;
    } catch (error: any) {
      console.error(`Error creating ${tableName} record:`, error);
      throw error;
    }
  },

  // Update an existing record
  updateRecord: async <T>(tableName: string, id: string, data: any): Promise<T> => {
    console.log('updateRecord called with:', { tableName, id, data });
    
    // Get the old data for audit logging
    let oldData: any = {};
    try {
      const existingRecord = await mockApi.getRecords(tableName);
      const record = existingRecord.data.find((r: any) => r.id === parseInt(id));
      if (record) {
        oldData = record;
      }
    } catch (error) {
      console.warn('Failed to get old data for audit logging:', error);
    }

    if (USE_MOCK_DATA) {
      const result = mockApi.updateRecord(tableName, parseInt(id), data);
      if (!result) {
        throw new Error('Record not found');
      }
      return result as T;
    }

    // Format dates for Zoho Analytics API
    console.log('Original data received in updateRecord:', data);
    const formattedData = { ...data };
    console.log('Formatted data before processing:', formattedData);
    Object.keys(formattedData).forEach(key => {
      const value = formattedData[key];
      if (value && typeof value === 'string' && value.includes('T')) {
        // If it's already in ISO format, convert to yyyy-MM-dd
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            formattedData[key] = date.toISOString().split('T')[0];
          }
        } catch (e) {
          console.warn('Failed to format date:', value);
        }
      } else if (value && typeof value === 'string' && (
        value.includes('Aug') || value.includes('Jan') || value.includes('Feb') || 
        value.includes('Mar') || value.includes('Apr') || value.includes('May') || 
        value.includes('Jun') || value.includes('Jul') || value.includes('Sep') || 
        value.includes('Oct') || value.includes('Nov') || value.includes('Dec')
      )) {
        // Handle "26 Aug 2025 00:00:00" format
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            formattedData[key] = date.toISOString().split('T')[0];
          }
        } catch (e) {
          console.warn('Failed to parse date:', value);
        }
      }
    });

    console.log('Formatted data after date processing:', formattedData);

    try {
      console.log('Sending update request:', { tableName, id, formattedData });
      
      // For PUT requests, we need to send data as query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('tableName', tableName);
      queryParams.append('id', id);
      queryParams.append('data', JSON.stringify(formattedData));
      
      const response = await zohoAxios.put(`/api/zoho-analytics.mjs?${queryParams.toString()}`);

      console.log('Update response received:', response.data);

      // Log the update operation for audit
      try {
        await auditLogger.logUpdate(
          'unknown',
          'Unknown User',
          tableName,
          id,
          oldData,
          formattedData
        );
      } catch (error) {
        console.error('Audit logging failed:', error);
      }

      return response.data as T;
    } catch (error: any) {
      console.error(`Error updating ${tableName} record:`, error);
      console.error('Error details:', error.response?.data || error.message);
      throw error;
    }
  },

  // Delete a record
  deleteRecord: async (tableName: string, id: string): Promise<void> => {
    // Get the old data for audit logging
    let oldData: any = {};
    try {
      const existingRecord = await mockApi.getRecords(tableName);
      const record = existingRecord.data.find((r: any) => r.id === parseInt(id));
      if (record) {
        oldData = record;
      }
    } catch (error) {
      console.warn('Failed to get old data for audit logging:', error);
    }

    if (USE_MOCK_DATA) {
      const success = mockApi.deleteRecord(tableName, parseInt(id));
      if (!success) {
        throw new Error('Record not found');
      }
      return;
    }

    try {
      const response = await zohoAxios.delete('/api/zoho-analytics.mjs', {
        data: {
          tableName,
          params: { id }
        }
      });

      // Log the delete operation for audit
      try {
        await auditLogger.logDelete(
          'unknown',
          'Unknown User',
          tableName,
          id,
          oldData
        );
      } catch (error) {
        console.error('Audit logging failed:', error);
      }
    } catch (error: any) {
      console.error(`Error deleting ${tableName} record:`, error);
      throw error;
    }
  },

  // Search records
  searchRecords: async <T>(tableName: string, query: string, params?: SearchParams): Promise<ApiResponse<T>> => {
    return handleAuthenticatedCall(
      async () => {
        const response = await zohoAnalyticsAPI.searchRecords<T>(tableName, query);
        return convertZohoResponse(response);
      },
      () => mockApi.searchRecords(tableName, query, params),
      'searchRecords',
      {
        tableName,
        operation: 'SEARCH',
        metadata: { 
          source: 'zoho_api',
          query,
          params
        }
      }
    );
  },

  // Export records
  exportRecords: async (tableName: string, format: 'csv' | 'excel' = 'csv', params?: SearchParams): Promise<Blob> => {
    return handleAuthenticatedCall(
      async () => {
        // Convert our search params to Zoho Analytics format
        const zohoParams: any = {};
        
        if (params?.search) {
          zohoParams.ZOHO_CRITERIA = `* like '%${params.search}%'`;
        }
        
        if (params?.sortBy) {
          zohoParams.ZOHO_SORT_COLUMN = params.sortBy;
          zohoParams.ZOHO_SORT_ORDER = params.sortOrder || 'asc';
        }

        return await zohoAnalyticsAPI.exportRecords(tableName, format, zohoParams);
      },
      () => mockApi.exportRecords(tableName, format),
      'exportRecords',
      {
        tableName,
        operation: 'EXPORT',
        metadata: { 
          source: 'zoho_api',
          format,
          params
        }
      }
    );
  },

  // Test connection to Zoho Analytics
  testConnection: async (): Promise<boolean> => {
    return handleAuthenticatedCall(
      async () => {
        return await zohoAnalyticsAPI.testConnection();
      },
      () => Promise.resolve(true), // Mock data always works
      'testConnection'
    );
  },

  // Get table metadata (schema)
  getTableMetadata: async (tableName: string): Promise<any> => {
    return handleAuthenticatedCall(
      async () => {
        const response = await zohoAnalyticsAPI.getTableMetadata(tableName);
        return response.data;
      },
      () => Promise.resolve({ fields: [] }), // Mock metadata
      'getTableMetadata'
    );
  },

  // Bulk operations
  bulkCreate: async <T>(tableName: string, data: any[]): Promise<T[]> => {
    return handleAuthenticatedCall(
      async () => {
        const response = await zohoAnalyticsAPI.batchCreateRecords<T>(tableName, data);
        
        if (response.status.code !== 0) {
          throw new Error(response.status.message);
        }
        
        return response.data || [];
      },
      async () => {
        const results = [];
        for (const record of data) {
          results.push(await mockApi.addRecord(tableName, record));
        }
        return results as T[];
      },
      'bulkCreate',
      {
        tableName,
        operation: 'CREATE',
        newData: data,
        metadata: { 
          source: 'zoho_api',
          bulkOperation: true,
          recordCount: data.length
        }
      }
    );
  },

  bulkUpdate: async <T>(tableName: string, data: Array<{ id: string; [key: string]: any }>): Promise<T[]> => {
    return handleAuthenticatedCall(
      async () => {
        const recordsWithRowId = data.map(record => ({
          ZOHO_ROW_ID: record.id,
          ...record
        }));
        
        const response = await zohoAnalyticsAPI.batchUpdateRecords<T>(tableName, recordsWithRowId);
        
        if (response.status.code !== 0) {
          throw new Error(response.status.message);
        }
        
        return response.data || [];
      },
      async () => {
        const results = [];
        for (const record of data) {
          const { id, ...updateData } = record;
          const result = mockApi.updateRecord(tableName, parseInt(id), updateData);
          if (result) {
            results.push(result);
          }
        }
        return results as T[];
      },
      'bulkUpdate',
      {
        tableName,
        operation: 'UPDATE',
        newData: data,
        metadata: { 
          source: 'zoho_api',
          bulkOperation: true,
          recordCount: data.length
        }
      }
    );
  },

  // Health check
  healthCheck: async (): Promise<boolean> => {
    return handleAuthenticatedCall(
      async () => {
        return await zohoAnalyticsAPI.testConnection();
      },
      () => Promise.resolve(true),
      'healthCheck'
    );
  }
};

export default zohoApi;
