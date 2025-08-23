import React, { useState, lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/layout/Layout';
import TableView from './pages/TableView';
import { UserProvider } from './contexts/UserContext';

// Lazy load the devtools to prevent chunk loading issues
const ReactQueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then((module) => ({
    default: module.ReactQueryDevtools,
  }))
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (Changed from cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.code && error.code.startsWith('4')) {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: 1,
    },
  },
});

function App() {
  // Start with Company Upcharge Fees as the default table
  const [activeTable, setActiveTable] = useState('company_upcharge_fees_DC');

  const handleTableChange = (tableName: string) => {
    setActiveTable(tableName);
  };

  const handleExport = (tableName: string, format: 'csv' | 'excel') => {
    console.log(`Exporting ${tableName} as ${format}`);
    // Export functionality will be implemented in the TableView component
  };

  return (
    <UserProvider>
      <QueryClientProvider client={queryClient}>
        <Layout activeTable={activeTable} onTableChange={handleTableChange} onExport={handleExport}>
          <TableView activeTable={activeTable} />
        </Layout>
        {/* Temporarily disabled to fix chunk loading issue */}
        {false && process.env.NODE_ENV === 'development' && (
          <Suspense fallback={null}>
            <ReactQueryDevtools initialIsOpen={false} />
          </Suspense>
        )}
      </QueryClientProvider>
    </UserProvider>
  );
}

export default App;
