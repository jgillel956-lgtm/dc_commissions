import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { zohoApi } from '../services/zohoApi';
import { SearchParams, Customer, Product, Order, Invoice } from '../services/apiTypes';

// Generic hook for fetching records with search and pagination
export const useRecords = <T>(
  tableName: string,
  params?: SearchParams,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: [tableName, 'records', params],
    queryFn: () => zohoApi.getRecords<T>(tableName, params),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (TanStack Query v4 uses gcTime)
  });
};

// Generic hook for infinite scrolling
export const useInfiniteRecords = <T>(
  tableName: string,
  params?: SearchParams,
  enabled: boolean = true
) => {
  return useInfiniteQuery({
    queryKey: [tableName, 'infinite-records', params],
    queryFn: ({ pageParam }) => 
      zohoApi.getRecords<T>(tableName, { ...params, page: pageParam as number }),
    getNextPageParam: (lastPage: any) => {
      if (!lastPage.total || !lastPage.limit) return undefined;
      const totalPages = Math.ceil(lastPage.total / lastPage.limit);
      return lastPage.page && lastPage.page < totalPages ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Generic hook for searching records
export const useSearchRecords = <T>(
  tableName: string,
  query: string,
  params?: SearchParams,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: [tableName, 'search', query, params],
    queryFn: () => zohoApi.searchRecords<T>(tableName, query, params),
    enabled: enabled && query.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes for search results
    gcTime: 5 * 60 * 1000,
  });
};

// Specific hooks for each table type
export const useCustomers = (params?: SearchParams) => {
  return useRecords<Customer>('customers', params);
};

export const useProducts = (params?: SearchParams) => {
  return useRecords<Product>('products', params);
};

export const useOrders = (params?: SearchParams) => {
  return useRecords<Order>('orders', params);
};

export const useInvoices = (params?: SearchParams) => {
  return useRecords<Invoice>('invoices', params);
};

// Infinite scroll hooks
export const useInfiniteCustomers = (params?: SearchParams) => {
  return useInfiniteRecords<Customer>('customers', params);
};

export const useInfiniteProducts = (params?: SearchParams) => {
  return useInfiniteRecords<Product>('products', params);
};

export const useInfiniteOrders = (params?: SearchParams) => {
  return useInfiniteRecords<Order>('orders', params);
};

export const useInfiniteInvoices = (params?: SearchParams) => {
  return useInfiniteRecords<Invoice>('invoices', params);
};

// Search hooks
export const useSearchCustomers = (query: string, params?: SearchParams) => {
  return useSearchRecords<Customer>('customers', query, params);
};

export const useSearchProducts = (query: string, params?: SearchParams) => {
  return useSearchRecords<Product>('products', query, params);
};

export const useSearchOrders = (query: string, params?: SearchParams) => {
  return useSearchRecords<Order>('orders', query, params);
};

export const useSearchInvoices = (query: string, params?: SearchParams) => {
  return useSearchRecords<Invoice>('invoices', query, params);
};

// Single record hooks
// Legacy hooks removed - use useRecord instead

// Table schema hook - disabled until API method is available
// export const useTableSchema = (tableName: string, enabled: boolean = true) => {
//   return useQuery({
//     queryKey: ['table-schema', tableName],
//     queryFn: () => zohoApi.getTableSchema(tableName),
//     enabled: enabled && !!tableName,
//     staleTime: 60 * 60 * 1000, // 1 hour
//     gcTime: 24 * 60 * 60 * 1000, // 24 hours
//   });
// };

// Health check hook
export const useHealthCheck = () => {
  return useQuery({
    queryKey: ['health-check'],
    queryFn: zohoApi.healthCheck,
    refetchInterval: 5 * 60 * 1000, // Check every 5 minutes
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
  });
};

// Custom hook for combined data (e.g., orders with customer names)
export const useOrdersWithCustomers = (params?: SearchParams) => {
  const ordersQuery = useOrders(params);
  const customersQuery = useCustomers();
  
  const ordersWithCustomers = ordersQuery.data?.data.map(order => {
    const customer = customersQuery.data?.data.find(c => c.id === order.customer_id);
    return {
      ...order,
      customer_name: customer?.name || 'Unknown Customer',
    };
  });
  
  return {
    ...ordersQuery,
    data: ordersWithCustomers ? { ...ordersQuery.data, data: ordersWithCustomers } : undefined,
  };
};

export const useInvoicesWithCustomers = (params?: SearchParams) => {
  const invoicesQuery = useInvoices(params);
  const customersQuery = useCustomers();
  
  const invoicesWithCustomers = invoicesQuery.data?.data.map(invoice => {
    const customer = customersQuery.data?.data.find(c => c.id === invoice.customer_id);
    return {
      ...invoice,
      customer_name: customer?.name || 'Unknown Customer',
    };
  });
  
  return {
    ...invoicesQuery,
    data: invoicesWithCustomers ? { ...invoicesQuery.data, data: invoicesWithCustomers } : undefined,
  };
};

// Generic hook for any table
export const useZohoData = (tableName: string, params?: SearchParams) => {
  return useRecords<any>(tableName, params);
};
