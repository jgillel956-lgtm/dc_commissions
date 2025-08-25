import React, { useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/layout/Layout';
import TableView from './pages/TableView';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import OAuthSetup from './pages/OAuthSetup';
import { UserProvider } from './contexts/UserContext';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy load React Query Devtools
const ReactQueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then((module) => ({
    default: module.ReactQueryDevtools,
  }))
);

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const [activeTable, setActiveTable] = useState('employee_commissions_DC');

  const handleTableChange = (tableName: string) => {
    setActiveTable(tableName);
  };

  const handleExport = (tableName: string, format: 'csv' | 'excel') => {
    console.log(`Exporting ${tableName} as ${format}`);
    // Export logic will be implemented later
  };

  return (
    <Router>
      <ToastProvider>
        <AuthProvider>
          <UserProvider>
            <QueryClientProvider client={queryClient}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/oauth-setup" element={<OAuthSetup />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout activeTable={activeTable} onTableChange={handleTableChange} onExport={handleExport}>
                        <TableView activeTable={activeTable} />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminPanel />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              {/* Temporarily disabled to fix chunk loading issue */}
              {false && process.env.NODE_ENV === 'development' && (
                <Suspense fallback={null}>
                  <ReactQueryDevtools initialIsOpen={false} />
                </Suspense>
              )}
            </QueryClientProvider>
          </UserProvider>
        </AuthProvider>
      </ToastProvider>
    </Router>
  );
}

export default App;
