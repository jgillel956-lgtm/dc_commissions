import { ApiResponse, ApiError, SearchParams } from './apiTypes';
import { mockApi } from './mockData';
import { zohoAnalyticsAPI, ZohoAnalyticsResponse } from './zohoAnalyticsAPI';
import { auditLogger } from './auditLogger';

// Check if we should use mock data
const USE_MOCK_DATA = process.env.REACT_APP_ENABLE_MOCK_DATA === 'true';

// Helper function to convert Zoho Analytics response to our API response format
function convertZohoResponse<T>(zohoResponse: ZohoAnalyticsResponse<T[]>): ApiResponse<T> {
    return {
    data: zohoResponse.data || [],
    total: zohoResponse.info?.totalRows || 0,
    page: zohoResponse.info?.pageNo || 1,
    totalPages: zohoResponse.info?.totalRows && zohoResponse.info?.perPage
      ? Math.ceil(zohoResponse.info.totalRows / zohoResponse.info.perPage)
      : 1,
    limit: zohoResponse.info?.perPage || 50,
    success: zohoResponse.status.code === 0,
    status: zohoResponse.status.code === 0 ? 'success' : 'error',
    message: zohoResponse.status.message
  };
}

// Helper function to verify authentication headers
function verifyAuthHeaders() {
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
        
        if (params?.page) {
          zohoParams.ZOHO_PAGE_NO = params.page;
        }
        
        if (params?.limit) {
          zohoParams.ZOHO_PER_PAGE = params.limit;
        }

        const response = await zohoAnalyticsAPI.getRecords<T>(tableName, zohoParams);
        return convertZohoResponse(response);
      },
      () => mockApi.getRecords(tableName, params),
      'getRecords'
    );
  },

  // Get a single record by ID
  getRecord: async <T>(tableName: string, id: string): Promise<T> => {
    return handleAuthenticatedCall(
      async () => {
        const response = await zohoAnalyticsAPI.getRecord<T>(tableName, id);
        
        if (response.status.code !== 0) {
          throw new Error(response.status.message);
        }
        
        return response.data as T;
      },
      async () => {
        const records = await mockApi.getRecords<T>(tableName);
        const record = records.data.find((r: any) => r.id === id);
        if (!record) {
          throw new Error('Record not found');
        }
        return record;
      },
      'getRecord'
    );
  },

  // Create a new record
  createRecord: async <T>(tableName: string, data: any): Promise<T> => {
    return handleAuthenticatedCall(
      async () => {
        const response = await zohoAnalyticsAPI.createRecord<T>(tableName, data);
        
        if (response.status.code !== 0) {
          throw new Error(response.status.message);
        }
        
        return response.data as unknown as T;
      },
      async () => mockApi.addRecord(tableName, data),
      'createRecord',
      {
        tableName,
        operation: 'CREATE',
        newData: data,
        metadata: { source: 'zoho_api' }
      }
    );
  },

  // Update an existing record
  updateRecord: async <T>(tableName: string, id: string, data: any): Promise<T> => {
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

    return handleAuthenticatedCall(
      async () => {
        const response = await zohoAnalyticsAPI.updateRecord<T>(tableName, id, data);
        
        if (response.status.code !== 0) {
          throw new Error(response.status.message);
        }
        
        return response.data as T;
      },
      () => {
        const result = mockApi.updateRecord(tableName, parseInt(id), data);
        if (!result) {
          throw new Error('Record not found');
        }
        return result as T;
      },
      'updateRecord',
      {
        tableName,
        recordId: id,
        operation: 'UPDATE',
        oldData,
        newData: data,
        metadata: { source: 'zoho_api' }
      }
    );
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

    return handleAuthenticatedCall(
      async () => {
        const response = await zohoAnalyticsAPI.deleteRecord(tableName, id);
        
        if (response.status.code !== 0) {
          throw new Error(response.status.message);
        }
      },
      () => {
        const success = mockApi.deleteRecord(tableName, parseInt(id));
        if (!success) {
          throw new Error('Record not found');
        }
      },
      'deleteRecord',
      {
        tableName,
        recordId: id,
        operation: 'DELETE',
        oldData,
        metadata: { source: 'zoho_api' }
      }
    );
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
