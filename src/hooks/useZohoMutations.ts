import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zohoApi } from '../services/zohoApi';
import { Customer, Product, Order, Invoice, ApiError } from '../services/apiTypes';

// Generic mutation hook for creating records
export const useCreateRecord = <T>(tableName: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      const result = await zohoApi.createRecord<T>(tableName, data);
      
      // Log the create operation for audit
      try {
        const { auditLogger } = await import('../services/auditLogger');
        const { useUser } = await import('../contexts/UserContext');
        // Note: In a real implementation, you'd get the user from context
        // For now, we'll use a placeholder
        await auditLogger.logCreate(
          'current_user_id', // Replace with actual user ID from context
          'Current User', // Replace with actual user name from context
          tableName,
          (result as any).id || 'unknown',
          data
        );
      } catch (error) {
        console.error('Audit logging failed:', error);
      }
      
      return result;
    },
    onSuccess: () => {
      // Invalidate and refetch the records list
      queryClient.invalidateQueries({ queryKey: [tableName, 'records'] });
      queryClient.invalidateQueries({ queryKey: [tableName, 'infinite-records'] });
    },
    onError: (error: ApiError) => {
      console.error(`Error creating ${tableName} record:`, error);
    },
  });
};

// Generic mutation hook for updating records
export const useUpdateRecord = <T>(tableName: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data, oldData }: { id: string; data: any; oldData?: any }) => {
      const result = await zohoApi.updateRecord<T>(tableName, id, data);
      
      // Log the update operation for audit
      if (oldData) {
        try {
          const { auditLogger } = await import('../services/auditLogger');
          await auditLogger.logUpdate(
            'current_user_id', // Replace with actual user ID from context
            'Current User', // Replace with actual user name from context
            tableName,
            id,
            oldData,
            data
          );
        } catch (error) {
          console.error('Audit logging failed:', error);
        }
      }
      
      return result;
    },
    onSuccess: (updatedRecord, { id }) => {
      // Update the specific record in cache
      queryClient.setQueryData([tableName, 'record', id], updatedRecord);
      
      // Invalidate and refetch the records list
      queryClient.invalidateQueries({ queryKey: [tableName, 'records'] });
      queryClient.invalidateQueries({ queryKey: [tableName, 'infinite-records'] });
    },
    onError: (error: ApiError) => {
      console.error(`Error updating ${tableName} record:`, error);
    },
  });
};

// Generic mutation hook for deleting records
export const useDeleteRecord = (tableName: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, deletedData }: { id: string; deletedData?: any }) => {
      const result = await zohoApi.deleteRecord(tableName, id);
      
      // Log the delete operation for audit
      if (deletedData) {
        try {
          const { auditLogger } = await import('../services/auditLogger');
          await auditLogger.logDelete(
            'current_user_id', // Replace with actual user ID from context
            'Current User', // Replace with actual user name from context
            tableName,
            id,
            deletedData
          );
        } catch (error) {
          console.error('Audit logging failed:', error);
        }
      }
      
      return result;
    },
    onSuccess: (_, { id }) => {
      // Remove the specific record from cache
      queryClient.removeQueries({ queryKey: [tableName, 'record', id] });
      
      // Invalidate and refetch the records list
      queryClient.invalidateQueries({ queryKey: [tableName, 'records'] });
      queryClient.invalidateQueries({ queryKey: [tableName, 'infinite-records'] });
    },
    onError: (error: ApiError) => {
      console.error(`Error deleting ${tableName} record:`, error);
    },
  });
};

// Generic mutation hook for bulk operations
export const useBulkCreate = <T>(tableName: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any[]) => zohoApi.bulkCreate<T>(tableName, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName, 'records'] });
      queryClient.invalidateQueries({ queryKey: [tableName, 'infinite-records'] });
    },
    onError: (error: ApiError) => {
      console.error(`Error bulk creating ${tableName} records:`, error);
    },
  });
};

export const useBulkUpdate = <T>(tableName: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any[]) => zohoApi.bulkUpdate<T>(tableName, data),
    onSuccess: (updatedRecords) => {
      // Update each record in cache
      updatedRecords.forEach(record => {
        queryClient.setQueryData([tableName, 'record', (record as any).id], record);
      });
      
      queryClient.invalidateQueries({ queryKey: [tableName, 'records'] });
      queryClient.invalidateQueries({ queryKey: [tableName, 'infinite-records'] });
    },
    onError: (error: ApiError) => {
      console.error(`Error bulk updating ${tableName} records:`, error);
    },
  });
};

// Bulk delete hook - disabled until API method is available
// export const useBulkDelete = (tableName: string) => {
//   const queryClient = useQueryClient();
  
//   return useMutation({
//     mutationFn: (ids: string[]) => zohoApi.bulkDelete(tableName, ids),
//     onSuccess: (_, deletedIds) => {
//       // Remove each record from cache
//       deletedIds.forEach(id => {
//         queryClient.removeQueries({ queryKey: [tableName, 'record', id] });
//       });
      
//       queryClient.invalidateQueries({ queryKey: [tableName, 'records'] });
//       queryClient.invalidateQueries({ queryKey: [tableName, 'infinite-records'] });
//     },
//     onError: (error: ApiError) => {
//       console.error(`Error bulk deleting ${tableName} records:`, error);
//     },
//   });
// };

// Export mutation hook
export const useExportRecords = (tableName: string) => {
  return useMutation({
    mutationFn: ({ format, params }: { format: 'csv' | 'excel'; params?: any }) => 
      zohoApi.exportRecords(tableName, format, params),
    onError: (error: ApiError) => {
      console.error(`Error exporting ${tableName} records:`, error);
    },
  });
};

// Specific mutation hooks for each table type
export const useCreateCustomer = () => {
  return useCreateRecord<Customer>('customers');
};

export const useUpdateCustomer = () => {
  return useUpdateRecord<Customer>('customers');
};

export const useDeleteCustomer = () => {
  return useDeleteRecord('customers');
};

export const useBulkCreateCustomers = () => {
  return useBulkCreate<Customer>('customers');
};

export const useBulkUpdateCustomers = () => {
  return useBulkUpdate<Customer>('customers');
};

// export const useBulkDeleteCustomers = () => {
//   return useBulkDelete('customers');
// };

export const useExportCustomers = () => {
  return useExportRecords('customers');
};

// Product mutations
export const useCreateProduct = () => {
  return useCreateRecord<Product>('products');
};

export const useUpdateProduct = () => {
  return useUpdateRecord<Product>('products');
};

export const useDeleteProduct = () => {
  return useDeleteRecord('products');
};

export const useBulkCreateProducts = () => {
  return useBulkCreate<Product>('products');
};

export const useBulkUpdateProducts = () => {
  return useBulkUpdate<Product>('products');
};

// export const useBulkDeleteProducts = () => {
//   return useBulkDelete('products');
// };

export const useExportProducts = () => {
  return useExportRecords('products');
};

// Order mutations
export const useCreateOrder = () => {
  return useCreateRecord<Order>('orders');
};

export const useUpdateOrder = () => {
  return useUpdateRecord<Order>('orders');
};

export const useDeleteOrder = () => {
  return useDeleteRecord('orders');
};

export const useBulkCreateOrders = () => {
  return useBulkCreate<Order>('orders');
};

export const useBulkUpdateOrders = () => {
  return useBulkUpdate<Order>('orders');
};

// export const useBulkDeleteOrders = () => {
//   return useBulkDelete('orders');
// };

export const useExportOrders = () => {
  return useExportRecords('orders');
};

// Invoice mutations
export const useCreateInvoice = () => {
  return useCreateRecord<Invoice>('invoices');
};

export const useUpdateInvoice = () => {
  return useUpdateRecord<Invoice>('invoices');
};

export const useDeleteInvoice = () => {
  return useDeleteRecord('invoices');
};

export const useBulkCreateInvoices = () => {
  return useBulkCreate<Invoice>('invoices');
};

export const useBulkUpdateInvoices = () => {
  return useBulkUpdate<Invoice>('invoices');
};

// export const useBulkDeleteInvoices = () => {
//   return useBulkDelete('invoices');
// };

export const useExportInvoices = () => {
  return useExportRecords('invoices');
};

// Optimistic update helpers
export const useOptimisticUpdate = <T>(tableName: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      zohoApi.updateRecord<T>(tableName, id, data),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [tableName, 'record', id] });
      
      // Snapshot the previous value
      const previousRecord = queryClient.getQueryData([tableName, 'record', id]);
      
      // Optimistically update to the new value
      queryClient.setQueryData([tableName, 'record', id], (old: any) => ({
        ...old,
        ...data,
        updated_at: new Date().toISOString(),
      }));
      
      // Return a context object with the snapshotted value
      return { previousRecord };
    },
    onError: (err, { id }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousRecord) {
        queryClient.setQueryData([tableName, 'record', id], context.previousRecord);
      }
    },
    onSettled: (_, __, { id }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: [tableName, 'record', id] });
      queryClient.invalidateQueries({ queryKey: [tableName, 'records'] });
    },
  });
};

// Optimistic delete helper
export const useOptimisticDelete = (tableName: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => zohoApi.deleteRecord(tableName, id),
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [tableName, 'records'] });
      
      // Snapshot the previous value
      const previousRecords = queryClient.getQueryData([tableName, 'records']);
      
      // Optimistically remove the record
      queryClient.setQueryData([tableName, 'records'], (old: any) => ({
        ...old,
        data: old.data.filter((record: any) => record.id !== id),
        total: old.total - 1,
      }));
      
      return { previousRecords };
    },
    onError: (err, id, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousRecords) {
        queryClient.setQueryData([tableName, 'records'], context.previousRecords);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: [tableName, 'records'] });
    },
  });
};

// Generic hook for any table mutations
export const useZohoMutations = (tableName: string) => {
  return {
    create: useCreateRecord<any>(tableName),
    update: useUpdateRecord<any>(tableName),
    delete: useDeleteRecord(tableName),
    export: useExportRecords(tableName),
  };
};
