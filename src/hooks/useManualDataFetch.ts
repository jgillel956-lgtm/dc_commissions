import { useState, useCallback } from 'react';
import { api } from '../lib/api';

interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isStale: boolean;
}

export function useManualDataFetch<T>() {
  const [state, setState] = useState<DataState<T>>({
    data: null,
    loading: false,
    error: null,
    isStale: false
  });

  const fetchData = useCallback(async (params: any) => {
    setState(prev => ({ ...prev, loading: true, error: null, isStale: false }));
    
    try {
      const response = await api.post('/zoho-analytics.mjs', {
        tableName: 'employee_commissions_DC',
        action: 'records',
        params
      });
      
      setState({
        data: response.data,
        loading: false,
        error: null,
        isStale: response.headers['x-stale'] === 'true'
      });
      
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Unknown error';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        isStale: false
      }));
      throw err;
    }
  }, []);

  const clearData = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      isStale: false
    });
  }, []);

  return {
    ...state,
    fetchData,
    clearData
  };
}

