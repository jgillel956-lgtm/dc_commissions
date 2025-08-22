import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  ApiResponse, 
  ApiError, 
  SearchParams, 
  Customer, 
  Product, 
  Order, 
  Invoice 
} from './apiTypes';
import { mockApi } from './mockData';

// API configuration
const API_BASE = process.env.REACT_APP_ZOHO_API_BASE || 'https://analyticsapi.zoho.com/api/v1';
const API_TOKEN = process.env.REACT_APP_ZOHO_API_TOKEN || '';
const WORKSPACE_ID = process.env.REACT_APP_WORKSPACE_ID || '';

// Check if we should use mock data
const USE_MOCK_DATA = process.env.REACT_APP_ENABLE_MOCK_DATA === 'true' || !API_TOKEN || !WORKSPACE_ID;

// Create axios instance with default configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_TOKEN}`,
  },
});

// Request interceptor for logging and error handling
apiClient.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    
    const apiError: ApiError = {
      message: error.response?.data?.message || error.message || 'An unexpected error occurred',
      code: error.response?.status?.toString(),
      details: error.response?.data,
    };
    
    return Promise.reject(apiError);
  }
);

// Generic API functions
export const zohoApi = {
  // GET all records
  getRecords: async <T>(tableName: string, params?: SearchParams): Promise<ApiResponse<T>> => {
    if (USE_MOCK_DATA) {
      return mockApi.getRecords<T>(tableName, params);
    }
    
    try {
      const response = await apiClient.get(`/workspaces/${WORKSPACE_ID}/tables/${tableName}/records`, {
        params: {
          page: params?.page || 1,
          limit: params?.limit || 50,
          sort_by: params?.sortBy,
          sort_order: params?.sortOrder,
          ...params?.filters,
        },
      });
      
      return {
        data: response.data.data || [],
        success: true,
        total: response.data.total,
        page: response.data.page,
        limit: response.data.limit,
      };
    } catch (error) {
      throw error as ApiError;
    }
  },

  // GET single record
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
      const response = await apiClient.get(`/workspaces/${WORKSPACE_ID}/tables/${tableName}/records/${id}`);
      return response.data.data;
    } catch (error) {
      throw error as ApiError;
    }
  },

  // POST new record
  createRecord: async <T>(tableName: string, data: any): Promise<T> => {
    if (USE_MOCK_DATA) {
      return mockApi.createRecord<T>(tableName, data);
    }
    
    try {
      const response = await apiClient.post(`/workspaces/${WORKSPACE_ID}/tables/${tableName}/records`, {
        data: [data],
      });
      return response.data.data[0];
    } catch (error) {
      throw error as ApiError;
    }
  },

  // PUT update record
  updateRecord: async <T>(tableName: string, id: string, data: any): Promise<T> => {
    if (USE_MOCK_DATA) {
      return mockApi.updateRecord<T>(tableName, id, data);
    }
    
    try {
      const response = await apiClient.put(`/workspaces/${WORKSPACE_ID}/tables/${tableName}/records/${id}`, {
        data: [data],
      });
      return response.data.data[0];
    } catch (error) {
      throw error as ApiError;
    }
  },

  // DELETE record
  deleteRecord: async (tableName: string, id: string): Promise<void> => {
    if (USE_MOCK_DATA) {
      return mockApi.deleteRecord(tableName, id);
    }
    
    try {
      await apiClient.delete(`/workspaces/${WORKSPACE_ID}/tables/${tableName}/records/${id}`);
    } catch (error) {
      throw error as ApiError;
    }
  },

  // GET with search/filter
  searchRecords: async <T>(tableName: string, query: string, params?: SearchParams): Promise<ApiResponse<T>> => {
    if (USE_MOCK_DATA) {
      return mockApi.searchRecords<T>(tableName, query, params);
    }
    
    try {
      const response = await apiClient.get(`/workspaces/${WORKSPACE_ID}/tables/${tableName}/records`, {
        params: {
          search: query,
          page: params?.page || 1,
          limit: params?.limit || 50,
          sort_by: params?.sortBy,
          sort_order: params?.sortOrder,
          ...params?.filters,
        },
      });
      
      return {
        data: response.data.data || [],
        success: true,
        total: response.data.total,
        page: response.data.page,
        limit: response.data.limit,
      };
    } catch (error) {
      throw error as ApiError;
    }
  },

  // Bulk operations
  bulkCreate: async <T>(tableName: string, data: any[]): Promise<T[]> => {
    try {
      const response = await apiClient.post(`/workspaces/${WORKSPACE_ID}/tables/${tableName}/records`, {
        data,
      });
      return response.data.data;
    } catch (error) {
      throw error as ApiError;
    }
  },

  bulkUpdate: async <T>(tableName: string, data: any[]): Promise<T[]> => {
    try {
      const response = await apiClient.put(`/workspaces/${WORKSPACE_ID}/tables/${tableName}/records`, {
        data,
      });
      return response.data.data;
    } catch (error) {
      throw error as ApiError;
    }
  },

  bulkDelete: async (tableName: string, ids: string[]): Promise<void> => {
    try {
      await apiClient.delete(`/workspaces/${WORKSPACE_ID}/tables/${tableName}/records`, {
        data: { ids },
      });
    } catch (error) {
      throw error as ApiError;
    }
  },

  // Export functionality
  exportRecords: async (tableName: string, format: 'csv' | 'excel' = 'csv', params?: SearchParams): Promise<Blob> => {
    if (USE_MOCK_DATA) {
      return mockApi.exportRecords(tableName, format, params);
    }
    
    try {
      const response = await apiClient.get(`/workspaces/${WORKSPACE_ID}/tables/${tableName}/export`, {
        params: {
          format,
          ...params,
        },
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      throw error as ApiError;
    }
  },

  // Get table schema
  getTableSchema: async (tableName: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/workspaces/${WORKSPACE_ID}/tables/${tableName}/schema`);
      return response.data;
    } catch (error) {
      throw error as ApiError;
    }
  },

  // Health check
  healthCheck: async (): Promise<boolean> => {
    try {
      await apiClient.get('/health');
      return true;
    } catch (error) {
      return false;
    }
  },
};

// Type-specific API functions for better type safety
export const customersApi = {
  getAll: (params?: SearchParams) => zohoApi.getRecords<Customer>('customers', params),
  getById: (id: string) => zohoApi.getRecord<Customer>('customers', id),
  create: (data: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => zohoApi.createRecord<Customer>('customers', data),
  update: (id: string, data: Partial<Customer>) => zohoApi.updateRecord<Customer>('customers', id, data),
  delete: (id: string) => zohoApi.deleteRecord('customers', id),
  search: (query: string, params?: SearchParams) => zohoApi.searchRecords<Customer>('customers', query, params),
};

export const productsApi = {
  getAll: (params?: SearchParams) => zohoApi.getRecords<Product>('products', params),
  getById: (id: string) => zohoApi.getRecord<Product>('products', id),
  create: (data: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => zohoApi.createRecord<Product>('products', data),
  update: (id: string, data: Partial<Product>) => zohoApi.updateRecord<Product>('products', id, data),
  delete: (id: string) => zohoApi.deleteRecord('products', id),
  search: (query: string, params?: SearchParams) => zohoApi.searchRecords<Product>('products', query, params),
};

export const ordersApi = {
  getAll: (params?: SearchParams) => zohoApi.getRecords<Order>('orders', params),
  getById: (id: string) => zohoApi.getRecord<Order>('orders', id),
  create: (data: Omit<Order, 'id' | 'created_at' | 'updated_at'>) => zohoApi.createRecord<Order>('orders', data),
  update: (id: string, data: Partial<Order>) => zohoApi.updateRecord<Order>('orders', id, data),
  delete: (id: string) => zohoApi.deleteRecord('orders', id),
  search: (query: string, params?: SearchParams) => zohoApi.searchRecords<Order>('orders', query, params),
};

export const invoicesApi = {
  getAll: (params?: SearchParams) => zohoApi.getRecords<Invoice>('invoices', params),
  getById: (id: string) => zohoApi.getRecord<Invoice>('invoices', id),
  create: (data: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>) => zohoApi.createRecord<Invoice>('invoices', data),
  update: (id: string, data: Partial<Invoice>) => zohoApi.updateRecord<Invoice>('invoices', id, data),
  delete: (id: string) => zohoApi.deleteRecord('invoices', id),
  search: (query: string, params?: SearchParams) => zohoApi.searchRecords<Invoice>('invoices', query, params),
};

export default zohoApi;
