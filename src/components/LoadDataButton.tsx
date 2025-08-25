import React from 'react';
import { useManualDataFetch } from '../hooks/useManualDataFetch';

interface LoadDataButtonProps {
  onDataLoaded?: (data: any) => void;
  className?: string;
}

export function LoadDataButton({ onDataLoaded, className = '' }: LoadDataButtonProps) {
  const { loading, error, isStale, fetchData } = useManualDataFetch();

  const handleLoadData = async () => {
    try {
      const data = await fetchData({
        page: 1,
        limit: 50,
        sortBy: 'Created_Time',
        sortOrder: 'desc'
      });
      
      if (onDataLoaded) {
        onDataLoaded(data);
      }
    } catch (err: any) {
      // Error is already handled by the hook
      console.error('Failed to load data:', err);
    }
  };

  return (
    <div className={`load-data-container ${className}`}>
      <button
        onClick={handleLoadData}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Load Data'}
      </button>
      
      {error && (
        <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {isStale && (
        <div className="mt-2 p-2 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          ⚠️ Showing cached data (Zoho is rate limited)
        </div>
      )}
    </div>
  );
}

