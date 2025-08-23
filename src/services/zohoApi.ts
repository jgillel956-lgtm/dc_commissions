import { ApiResponse, ApiError, SearchParams } from './apiTypes';
import { mockApi } from './mockData';
import { zohoAnalyticsAPI, ZohoAnalyticsResponse } from './zohoAnalyticsAPI';

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
    status: zohoResponse.status.code === 0 ? 'success' : 'error',
    message: zohoResponse.status.message
  };
}

// Zoho Analytics API abstraction
export const zohoApi = {
  // Get records with search, filter, and pagination
  getRecords: async <T>(tableName: string, params?: SearchParams): Promise<ApiResponse<T>> => {
    if (USE_MOCK_DATA) {
      return mockApi.getRecords(tableName, params);
    }

    try {
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
    } catch (error) {
      console.error('Error fetching records:', error);
      throw {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error'
      } as ApiError;
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
      const response = await zohoAnalyticsAPI.getRecord<T>(tableName, id);
      
      if (response.status.code !== 0) {
        throw new Error(response.status.message);
      }
      
      return response.data as T;
    } catch (error) {
      console.error('Error fetching record:', error);
      throw {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error'
      } as ApiError;
    }
  },

  // Create a new record
  createRecord: async <T>(tableName: string, data: any): Promise<T> => {
    if (USE_MOCK_DATA) {
      return mockApi.createRecord(tableName, data);
    }

    try {
      const response = await zohoAnalyticsAPI.createRecord<T>(tableName, data);
      
      if (response.status.code !== 0) {
        throw new Error(response.status.message);
      }
      
      return response.data as T;
    } catch (error) {
      console.error('Error creating record:', error);
      throw {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error'
      } as ApiError;
    }
  },

  // Update an existing record
  updateRecord: async <T>(tableName: string, id: string, data: any): Promise<T> => {
    if (USE_MOCK_DATA) {
      return mockApi.updateRecord(tableName, id, data);
    }

    try {
      const response = await zohoAnalyticsAPI.updateRecord<T>(tableName, id, data);
      
      if (response.status.code !== 0) {
        throw new Error(response.status.message);
      }
      
      return response.data as T;
    } catch (error) {
      console.error('Error updating record:', error);
      throw {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error'
      } as ApiError;
    }
  },

  // Delete a record
  deleteRecord: async (tableName: string, id: string): Promise<void> => {
    if (USE_MOCK_DATA) {
      return mockApi.deleteRecord(tableName, id);
    }

    try {
      const response = await zohoAnalyticsAPI.deleteRecord(tableName, id);
      
      if (response.status.code !== 0) {
        throw new Error(response.status.message);
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      throw {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error'
      } as ApiError;
    }
  },

  // Search records
  searchRecords: async <T>(tableName: string, query: string, params?: SearchParams): Promise<ApiResponse<T>> => {
    if (USE_MOCK_DATA) {
      return mockApi.searchRecords(tableName, query, params);
    }

    try {
      const response = await zohoAnalyticsAPI.searchRecords<T>(tableName, query);
      return convertZohoResponse(response);
    } catch (error) {
      console.error('Error searching records:', error);
      throw {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error'
      } as ApiError;
    }
  },

  // Export records
  exportRecords: async (tableName: string, format: 'csv' | 'excel' = 'csv', params?: SearchParams): Promise<Blob> => {
    if (USE_MOCK_DATA) {
      return mockApi.exportRecords(tableName, format, params);
    }

    try {
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
    } catch (error) {
      console.error('Error exporting records:', error);
      throw {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error'
      } as ApiError;
    }
  },

  // Test connection to Zoho Analytics
  testConnection: async (): Promise<boolean> => {
    if (USE_MOCK_DATA) {
      return true; // Mock data always works
    }

    try {
      return await zohoAnalyticsAPI.testConnection();
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  },

  // Get table metadata (schema)
  getTableMetadata: async (tableName: string): Promise<any> => {
    if (USE_MOCK_DATA) {
      return { fields: [] }; // Mock metadata
    }

    try {
      const response = await zohoAnalyticsAPI.getTableMetadata(tableName);
      return response.data;
    } catch (error) {
      console.error('Error getting table metadata:', error);
      throw {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error'
      } as ApiError;
    }
  },

  // Bulk operations
  bulkCreate: async <T>(tableName: string, data: any[]): Promise<T[]> => {
    if (USE_MOCK_DATA) {
      const results = [];
      for (const record of data) {
        results.push(await mockApi.createRecord(tableName, record));
      }
      return results;
    }

    try {
      const response = await zohoAnalyticsAPI.batchCreateRecords<T>(tableName, data);
      
      if (response.status.code !== 0) {
        throw new Error(response.status.message);
      }
      
      return response.data || [];
    } catch (error) {
      console.error('Error bulk creating records:', error);
      throw {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error'
      } as ApiError;
    }
  },

  bulkUpdate: async <T>(tableName: string, data: Array<{ id: string; [key: string]: any }>): Promise<T[]> => {
    if (USE_MOCK_DATA) {
      const results = [];
      for (const record of data) {
        const { id, ...updateData } = record;
        results.push(await mockApi.updateRecord(tableName, id, updateData));
      }
      return results;
    }

    try {
      const recordsWithRowId = data.map(record => ({
        ZOHO_ROW_ID: record.id,
        ...record
      }));
      
      const response = await zohoAnalyticsAPI.batchUpdateRecords<T>(tableName, recordsWithRowId);
      
      if (response.status.code !== 0) {
        throw new Error(response.status.message);
      }
      
      return response.data || [];
    } catch (error) {
      console.error('Error bulk updating records:', error);
      throw {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error'
      } as ApiError;
    }
  },

  // Health check
  healthCheck: async (): Promise<boolean> => {
    if (USE_MOCK_DATA) {
      return true;
    }

    try {
      return await zohoAnalyticsAPI.testConnection();
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
};

export default zohoApi;
