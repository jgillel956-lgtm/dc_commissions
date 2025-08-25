import { useState, useCallback } from 'react';
import { api } from '../lib/api';

interface AddRowState {
  loading: boolean;
  error: string | null;
  success: boolean;
}

export function useAddRow() {
  const [state, setState] = useState<AddRowState>({
    loading: false,
    error: null,
    success: false
  });

  const addRow = useCallback(async (rowData: any) => {
    setState({ loading: true, error: null, success: false });
    
    try {
      const response = await api.post('/zoho-analytics.mjs', {
        tableName: 'employee_commissions_DC',
        data: rowData
      });
      
      setState({
        loading: false,
        error: null,
        success: true
      });
      
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to add row';
      setState({
        loading: false,
        error: errorMessage,
        success: false
      });
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      success: false
    });
  }, []);

  return {
    ...state,
    addRow,
    reset
  };
}

