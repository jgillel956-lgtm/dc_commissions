import axios, { AxiosResponse, AxiosError } from 'axios';

export interface ZohoAnalyticsResponse<T = any> {
  status: {
    code: number;
    message: string;
  };
  data?: T;
  info?: {
    totalRows?: number;
    pageNo?: number;
    perPage?: number;
  };
}

export interface ZohoAnalyticsError {
  status: {
    code: number;
    message: string;
  };
}

class ZohoAnalyticsAPI {
  private accessToken: string | null = null;
  private refreshToken: string;
  private clientId: string;
  private clientSecret: string;
  private workspaceId: string;
  private orgId: string;
  private useMockData: boolean = false;
  private rateLimiter = {
    lastCall: 0,
    minInterval: 100 // 100ms between calls
  };

  // Helper method to construct API URL (bypass token now sent as header)
  private getApiUrl(endpoint: string = '/api/zoho-analytics'): string {
    const url = new URL(endpoint, window.location.origin);
    return url.toString();
  }

  // Helper method to get headers with Vercel bypass token
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-vercel-protection-bypass': 'uecJcaAEY8pr8Gx3d50jRkzybc0ofwkt'
    };
  }

  constructor() {
    // Debug environment variables
    console.log('Environment variables check:', {
      refreshToken: process.env.REACT_APP_ZOHO_REFRESH_TOKEN ? 'SET' : 'MISSING',
      clientId: process.env.REACT_APP_ZOHO_CLIENT_ID ? 'SET' : 'MISSING',
      clientSecret: process.env.REACT_APP_ZOHO_CLIENT_SECRET ? 'SET' : 'MISSING',
      workspaceId: process.env.REACT_APP_ZOHO_WORKSPACE_ID ? 'SET' : 'MISSING',
      orgId: process.env.REACT_APP_ZOHO_ORG_ID ? 'SET' : 'MISSING',
      enableMockData: process.env.REACT_APP_ENABLE_MOCK_DATA
    });

    this.refreshToken = process.env.REACT_APP_ZOHO_REFRESH_TOKEN || '';
    this.clientId = process.env.REACT_APP_ZOHO_CLIENT_ID || '';
    this.clientSecret = process.env.REACT_APP_ZOHO_CLIENT_SECRET || '';
    this.workspaceId = process.env.REACT_APP_ZOHO_WORKSPACE_ID || '';
    this.orgId = process.env.REACT_APP_ZOHO_ORG_ID || '';

    // Check if we're in mock data mode or if environment variables are missing
    const useMockData = process.env.REACT_APP_ENABLE_MOCK_DATA === 'true' || 
                       !this.refreshToken || 
                       !this.clientId || 
                       !this.clientSecret || 
                       !this.workspaceId || 
                       !this.orgId;

    if (useMockData) {
      console.warn('Zoho Analytics API: Using mock data mode due to missing environment variables or explicit setting');
      // Don't throw error, just log warning and continue with mock data
      return;
    }


    console.log('Zoho Analytics API: All environment variables loaded successfully');
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.rateLimiter.lastCall;
    
    if (timeSinceLastCall < this.rateLimiter.minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.rateLimiter.minInterval - timeSinceLastCall)
      );
    }
    
    this.rateLimiter.lastCall = Date.now();
  }

  private async getAccessToken(): Promise<string> {
    // If environment variables are missing, fall back to mock data
    if (!this.refreshToken || !this.clientId || !this.clientSecret) {
      console.warn('Missing Zoho credentials, falling back to mock data');
      throw new Error('CORS_BLOCKED_FALLBACK_TO_MOCK');
    }

    if (this.accessToken) {
      return this.accessToken;
    }

    try {
      await this.rateLimit();

      // OAuth refresh now handled by backend API to avoid CORS issues

      const response = await axios.get(this.getApiUrl('/api/zoho-analytics?testOAuth=1'));

      this.accessToken = response.data.access_token;
      return this.accessToken!;
    } catch (error: any) {
      console.error('Failed to refresh access token:', error);
      
      // Check if this is a CORS error or network error
      if (error.message === 'Network Error' || 
          error.code === 'ERR_NETWORK' ||
          (error.response && error.response.status === 0) ||
          error.message.includes('CORS')) {
        
        console.warn('CORS blocked OAuth request, falling back to mock data');
        throw new Error('CORS_BLOCKED_FALLBACK_TO_MOCK');
      }
      
      throw new Error('Authentication failed. Please check your credentials.');
    }
  }

  private async handleAPIError(error: AxiosError): Promise<never> {
    if (error.response?.status === 401) {
      // Token expired, clear and try to refresh
      this.accessToken = null;
      try {
        await this.getAccessToken();
        throw new Error('Token refreshed, please retry the operation');
      } catch (refreshError) {
        throw new Error('Authentication failed. Please check your credentials.');
      }
    }
    
    if (error.response?.status === 403) {
      throw new Error('Insufficient permissions for this operation');
    }
    
    if (error.response?.status === 404) {
      throw new Error('Table or resource not found');
    }

    if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    const errorMessage = (error.response?.data as any)?.status?.message || error.message;
    throw new Error(`Zoho Analytics API Error: ${errorMessage}`);
  }

  private async makeRequest<T>(
    endpoint: string, 
    method: string = 'GET', 
    data?: any,
    params?: Record<string, any>
  ): Promise<ZohoAnalyticsResponse<T>> {
    try {
      await this.rateLimit();
      
      const token = await this.getAccessToken();
      
      const config = {
        method,
        url: `${process.env.REACT_APP_ZOHO_API_BASE_URL || 'https://analyticsapi.zoho.com/restapi/v2'}${endpoint}`,
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json',
          'ZANALYTICS-ORGID': this.orgId
        },
        data,
        params
      };

      const response: AxiosResponse<ZohoAnalyticsResponse<T>> = await axios(config);
      
      // Log request for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Zoho API Request:', { method, url: config.url, params, data });
        console.log('Zoho API Response:', response.data);
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        await this.handleAPIError(error);
      }
      throw error;
    }
  }

  // Get records from a table using table ID
  async getRecords<T = any>(
    tableId: string, 
    params?: {
      ZOHO_MAX_ROWS?: number;
      ZOHO_SKIP_ROWS?: number;
    }
  ): Promise<ZohoAnalyticsResponse<T[]>> {
    const queryParams = {
      ZOHO_MAX_ROWS: 50,
      ...params
    };

    return this.makeRequest<T[]>(`/workspaces/${this.workspaceId}/views/${tableId}/data`, 'GET', undefined, queryParams);
  }

  // Get a single record by ID
  async getRecord<T = any>(tableName: string, recordId: string): Promise<ZohoAnalyticsResponse<T>> {
    const queryParams = {
      ZOHO_WORKSPACE_ID: this.workspaceId,
      ZOHO_TABLE_NAME: tableName,
      ZOHO_ROW_ID: recordId
    };

    return this.makeRequest<T>(`/tables`, 'GET', undefined, queryParams);
  }

  // Create a new record
  async createRecord<T = any>(tableName: string, data: Record<string, any>): Promise<ZohoAnalyticsResponse<T>> {
    const payload = {
      ZOHO_WORKSPACE_ID: this.workspaceId,
      ZOHO_TABLE_NAME: tableName,
      data: [data]
    };

    return this.makeRequest<T>(`/tables`, 'POST', payload);
  }

  // Update an existing record
  async updateRecord<T = any>(
    tableName: string, 
    recordId: string, 
    data: Record<string, any>
  ): Promise<ZohoAnalyticsResponse<T>> {
    const payload = {
      ZOHO_WORKSPACE_ID: this.workspaceId,
      ZOHO_TABLE_NAME: tableName,
      ZOHO_ROW_ID: recordId,
      data: [data]
    };

    return this.makeRequest<T>(`/tables`, 'PUT', payload);
  }

  // Delete a record
  async deleteRecord(tableName: string, recordId: string): Promise<ZohoAnalyticsResponse<void>> {
    const queryParams = {
      ZOHO_WORKSPACE_ID: this.workspaceId,
      ZOHO_TABLE_NAME: tableName,
      ZOHO_ROW_ID: recordId
    };

    return this.makeRequest<void>(`/tables`, 'DELETE', undefined, queryParams);
  }

  // Export records
  async exportRecords(
    tableName: string, 
    format: 'csv' | 'excel' = 'csv', 
    params?: {
      ZOHO_CRITERIA?: string;
      ZOHO_SORT_COLUMN?: string;
      ZOHO_SORT_ORDER?: 'asc' | 'desc';
    }
  ): Promise<Blob> {
    try {
      await this.rateLimit();
      
      const token = await this.getAccessToken();
      
      const queryParams = {
        ZOHO_WORKSPACE_ID: this.workspaceId,
        ZOHO_TABLE_NAME: tableName,
        ZOHO_OUTPUT_FORMAT: format,
        ...params
      };

      const response = await axios({
        method: 'GET',
        url: `${process.env.REACT_APP_ZOHO_API_BASE_URL || 'https://analyticsapi.zoho.com/restapi/v2'}/tables/export`,
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`,
        },
        params: queryParams,
        responseType: 'blob'
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        await this.handleAPIError(error);
      }
      throw error;
    }
  }

  // Get table metadata (schema)
  async getTableMetadata(tableName: string): Promise<ZohoAnalyticsResponse<any>> {
    const queryParams = {
      ZOHO_WORKSPACE_ID: this.workspaceId,
      ZOHO_TABLE_NAME: tableName
    };

    return this.makeRequest(`/tables/metadata`, 'GET', undefined, queryParams);
  }

  // Get workspace information
  async getWorkspaceInfo(): Promise<ZohoAnalyticsResponse<any>> {
    const queryParams = {
      ZOHO_WORKSPACE_ID: this.workspaceId
    };

    return this.makeRequest(`/workspaces`, 'GET', undefined, queryParams);
  }

  // Search records
  async searchRecords<T = any>(
    tableName: string, 
    searchTerm: string,
    searchColumns?: string[]
  ): Promise<ZohoAnalyticsResponse<T[]>> {
    const criteria = searchColumns 
      ? searchColumns.map(col => `${col} like '%${searchTerm}%'`).join(' or ')
      : `* like '%${searchTerm}%'`;

    // TODO: Implement search functionality when criteria parameter is supported
    return this.getRecords<T>(tableName);
  }

  // Batch operations
  async batchCreateRecords<T = any>(
    tableName: string, 
    records: Record<string, any>[]
  ): Promise<ZohoAnalyticsResponse<T[]>> {
    const payload = {
      ZOHO_WORKSPACE_ID: this.workspaceId,
      ZOHO_TABLE_NAME: tableName,
      data: records
    };

    return this.makeRequest<T[]>(`/tables`, 'POST', payload);
  }

  async batchUpdateRecords<T = any>(
    tableName: string, 
    records: Array<{ ZOHO_ROW_ID: string; [key: string]: any }>
  ): Promise<ZohoAnalyticsResponse<T[]>> {
    const payload = {
      ZOHO_WORKSPACE_ID: this.workspaceId,
      ZOHO_TABLE_NAME: tableName,
      data: records
    };

    return this.makeRequest<T[]>(`/tables`, 'PUT', payload);
  }

  // Clear cached token (useful for testing or when credentials change)
  clearCache(): void {
    this.accessToken = null;
  }

  // Execute custom SQL query via backend proxy
  async executeQuery(query: string): Promise<ZohoAnalyticsResponse<any>> {
    try {
      // Use backend API proxy to get data from revenue_master_view with async export
      const response = await axios.post(this.getApiUrl(), {
        tableName: 'revenue_master_view',
        action: 'records'
      }, {
        headers: this.getHeaders()
      });
      
      // Transform backend response to expected format
      if (response.data && Array.isArray(response.data.rows)) {
        return {
          status: { code: 200, message: 'Success' },
          data: response.data.rows
        };
      }
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        await this.handleAPIError(error);
      }
      throw error;
    }
  }

  // Get distinct companies from revenue_master_view via backend proxy
  async getDistinctCompanies(): Promise<ZohoAnalyticsResponse<Array<{company_id: number, company: string}>>> {
    try {
      // Use backend API proxy to get companies from database
      const response = await axios.post(this.getApiUrl(), {
        tableName: 'revenue_master_view',
        action: 'companies'
      }, {
        headers: this.getHeaders()
      });
      
      console.log('📊 Company data response:', response.data);

      // Check if we have database data
      if (response.data && response.data.source === 'database' && Array.isArray(response.data.rows)) {
        // Database already returns distinct companies in the correct format
        const companies = response.data.rows.map((row: any) => ({
          company_id: parseInt(row.company_id) || 0,
          company: row.company
        }));

        console.log(`✅ Found ${companies.length} unique companies from database`);
        
        return {
          status: { code: 200, message: 'Success' },
          data: companies
        };
      }

      // If no database data, check if we need to sync
      if (response.data && response.data.needsRefresh) {
        console.log('⚠️ No database data available, prompting for sync');
        return {
          status: { code: 200, message: 'No data - sync required' },
          data: []
        };
      }
      
      // Fallback to any available data
      if (response.data && Array.isArray(response.data.rows)) {
        const companies = response.data.rows
          .filter((row: any) => row.company && row.company_id)
          .reduce((unique: Array<{company_id: number, company: string}>, row: any) => {
            const company_id = parseInt(row.company_id) || 0;
            const company = row.company;

            if (!unique.find(u => u.company_id === company_id)) {
              unique.push({ company_id, company });
            }
            return unique;
          }, []);

        return {
          status: { code: 200, message: 'Success' },
          data: companies
        };
      }
      
      throw new Error('No data available - please sync first');
    } catch (error) {
      console.error('❌ Error fetching distinct companies:', error);
      // Don't return mock data - encourage real data sync
      return {
        status: {
          code: 200,
          message: 'No data - please sync first'
        },
        data: []
      };
    }
  }

  // Get distinct employee names (commission persons) from revenue_master_view via backend proxy  
  async getDistinctEmployees(): Promise<ZohoAnalyticsResponse<Array<{employee_name: string}>>> {
    try {
      // Use backend API proxy to get employees from database
      const response = await axios.post(this.getApiUrl(), {
        tableName: 'revenue_master_view',
        action: 'employees'
      }, {
        headers: this.getHeaders()
      });
      
      console.log('👥 Employee data response:', response.data);

      // Check if we have database data
      if (response.data && response.data.source === 'database' && Array.isArray(response.data.rows)) {
        // Database already returns distinct employees in the correct format
        const employees = response.data.rows.map((row: any) => ({
          employee_name: row.employee_name
        }));

        console.log(`✅ Found ${employees.length} unique employees from database`);
        
        return {
          status: { code: 200, message: 'Success' },
          data: employees
        };
      }

      // If no database data, check if we need to sync
      if (response.data && response.data.needsRefresh) {
        console.log('⚠️ No database data available, prompting for sync');
        return {
          status: { code: 200, message: 'No data - sync required' },
          data: []
        };
      }
      
      // Fallback to any available data
      if (response.data && Array.isArray(response.data.rows)) {
        const employees = [...new Set(response.data.rows.map((row: any) => row.employee_name).filter(Boolean))].map((name: string) => ({
          employee_name: name
        }));

        return {
          status: { code: 200, message: 'Success' },
          data: employees
        };
      }
      
      throw new Error('No data available - please sync first');
    } catch (error) {
      console.error('❌ Error fetching distinct employees:', error);
      // Don't return mock data - encourage real data sync
      return {
        status: { code: 200, message: 'No data - sync required' },
        data: []
      };
    }
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.getWorkspaceInfo();
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const zohoAnalyticsAPI = new ZohoAnalyticsAPI();
