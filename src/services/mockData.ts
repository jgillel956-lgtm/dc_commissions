import { 
  ApiResponse, 
  SearchParams 
} from './apiTypes';
import { csvDataService } from './csvDataService';

// Helper function to get company name by ID
const getCompanyName = (companyId: number): string => {
  const companies = csvDataService.getRecords('insurance_companies_DC');
  const company = companies.find((c: any) => c.id === companyId);
  return company && typeof company === 'object' && 'company' in company 
    ? company.company as string 
    : 'Unknown Company';
};

// Helper function to get payment method name by ID
const getPaymentMethodName = (paymentMethodId: number): string => {
  const methods = csvDataService.getRecords('payment_modalities');
  const method = methods.find((p: any) => p.id === paymentMethodId);
  return method && typeof method === 'object' && 'payment_method' in method 
    ? method.payment_method as string 
    : 'Unknown Method';
};

// Get all records for a table
const getRecords = <T>(tableName: string): T[] => {
  return csvDataService.getRecords<T>(tableName);
};

// Add a new record
const addRecord = <T>(tableName: string, record: T): T => {
  return csvDataService.addRecord<T>(tableName, record);
};

// Update a record
const updateRecord = <T>(tableName: string, id: number, updates: Partial<T>): T | null => {
  return csvDataService.updateRecord<T>(tableName, id, updates);
};

// Delete a record
const deleteRecord = (tableName: string, id: number): boolean => {
  return csvDataService.deleteRecord(tableName, id);
};

// Search records
const searchRecords = <T>(tableName: string, query: string, params?: SearchParams): ApiResponse<T> => {
  let data = getRecords<T>(tableName);
  
  // Apply search filter
  if (query) {
    const searchTerm = query.toLowerCase();
    data = data.filter((record: any) => {
      return Object.values(record).some(value => 
        value && value.toString().toLowerCase().includes(searchTerm)
      );
    });
  }
  
  // Apply additional params
  if (params?.search) {
    const searchTerm = params.search.toLowerCase();
    data = data.filter((record: any) => {
      return Object.values(record).some(value => 
        value && value.toString().toLowerCase().includes(searchTerm)
      );
    });
  }
  
  // Apply sorting
  if (params?.sortBy && params?.sortOrder) {
    data = data.sort((a: any, b: any) => {
      const aVal = a[params.sortBy!];
      const bVal = b[params.sortBy!];
      
      if (params.sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }
  
  // Apply pagination
  const page = params?.page || 1;
  const limit = params?.limit || 50;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedData = data.slice(startIndex, endIndex);
  
  return {
    data: paginatedData,
    total: data.length,
    page,
    totalPages: Math.ceil(data.length / limit),
    limit,
    success: true,
    status: 'success',
    message: 'Data retrieved successfully'
  };
};

// Export records
const exportRecords = async (tableName: string, format: 'csv' | 'excel' = 'csv'): Promise<Blob> => {
  const data = getRecords(tableName);
  
  // Convert data to CSV format (simplified)
  const headers = Object.keys(data[0] || {}).join(',');
  const rows = data.map((record: any) => 
    Object.values(record).map(value => `"${value}"`).join(',')
  ).join('\n');
  const csvContent = `${headers}\n${rows}`;
  
  return new Blob([csvContent], { type: 'text/csv' });
};

// Mock API service that uses CSV data
export const mockApi = {
  // Get records with pagination, search, and filtering
  getRecords: <T>(
    tableName: string, 
    params?: SearchParams
  ): ApiResponse<T> => {
    let data = getRecords<T>(tableName);
    
    // Apply search filter
    if (params?.search) {
      const searchTerm = params.search.toLowerCase();
      data = data.filter((record: any) => {
        return Object.values(record).some(value => 
          value && value.toString().toLowerCase().includes(searchTerm)
        );
      });
    }
    
    // Apply sorting
    if (params?.sortBy && params?.sortOrder) {
      data = data.sort((a: any, b: any) => {
        const aVal = a[params.sortBy!];
        const bVal = b[params.sortBy!];
        
        if (params.sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    }
    
    // Apply pagination
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = data.slice(startIndex, endIndex);
    
    return {
      data: paginatedData,
      total: data.length,
      page,
      totalPages: Math.ceil(data.length / limit),
      limit,
      success: true,
      status: 'success',
      message: 'Data retrieved successfully'
    };
  },

  // Get a single record by ID
  getRecord: <T>(tableName: string, id: number): T | null => {
    const records = getRecords<T>(tableName);
    return records.find((record: any) => record.id === id) || null;
  },

  // Add a new record
  addRecord: <T>(tableName: string, record: T): T => {
    return addRecord<T>(tableName, record);
  },

  // Update a record
  updateRecord: <T>(tableName: string, id: number, updates: Partial<T>): T | null => {
    return updateRecord<T>(tableName, id, updates);
  },

  // Delete a record
  deleteRecord: (tableName: string, id: number): boolean => {
    return deleteRecord(tableName, id);
  },

  // Search records
  searchRecords: <T>(tableName: string, query: string, params?: SearchParams): ApiResponse<T> => {
    return searchRecords<T>(tableName, query, params);
  },

  // Export records
  exportRecords: async (tableName: string, format: 'csv' | 'excel' = 'csv'): Promise<Blob> => {
    return exportRecords(tableName, format);
  },

  // Bulk operations
  bulkCreate: <T>(tableName: string, records: T[]): T[] => {
    return records.map(record => addRecord<T>(tableName, record));
  },

  bulkUpdate: <T>(tableName: string, records: Array<{ id: number } & Partial<T>>): T[] => {
    return records.map(record => {
      const { id, ...updates } = record;
      return updateRecord<T>(tableName, id, updates as Partial<T>);
    }).filter(Boolean) as T[];
  },

  bulkDelete: (tableName: string, ids: number[]): boolean[] => {
    return ids.map(id => deleteRecord(tableName, id));
  },

  // Get lookup data for forms
  getLookupData: (tableName: string) => {
    switch (tableName) {
      case 'company_upcharge_fees_DC':
        return {
          companies: getRecords('insurance_companies_DC'),
          paymentMethods: getRecords('payment_modalities')
        };
      case 'employee_commissions_DC':
        return {
          companies: getRecords('insurance_companies_DC'),
          paymentMethods: getRecords('payment_modalities')
        };
      case 'monthly_interchange_income_DC':
        return {
          companies: getRecords('insurance_companies_DC')
        };
      case 'monthly_interest_revenue_DC':
        return {
          companies: getRecords('insurance_companies_DC')
        };
      default:
        return {};
    }
  },

  // Reset data (for testing)
  resetData: (): void => {
    // This would reset the data to initial state if needed
    console.log('Mock data reset requested');
  }
};
