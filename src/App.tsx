import React, { useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/layout/Layout';
import TableView from './pages/TableView';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import OAuthSetup from './pages/OAuthSetup';
import ResponsiveChartDemo from './components/demo/ResponsiveChartDemo';
import ResponsiveChartTest from './components/demo/ResponsiveChartTest';
import DrillDownDemo from './components/demo/DrillDownDemo';
import DashboardDemo from './components/demo/DashboardDemo';
import ChartExportDemo from './components/demo/ChartExportDemo';
import FilterPanelDemo from './components/demo/FilterPanelDemo';
import FilterStateDemo from './components/demo/FilterStateDemo';
import { UserProvider } from './contexts/UserContext';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
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
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <UserProvider>
              <QueryClientProvider client={queryClient}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/oauth-setup" element={<OAuthSetup />} />
                
                {/* Public demo routes - no authentication required */}
                <Route path="/demo" element={<DashboardDemo />} />
                <Route path="/demo/dashboard" element={<DashboardDemo />} />
                <Route path="/demo/drill-down" element={<DrillDownDemo />} />
                <Route path="/demo/responsive" element={<ResponsiveChartDemo />} />
                <Route path="/demo/responsive-test" element={<ResponsiveChartTest />} />
                <Route path="/demo/export" element={<ChartExportDemo />} />
                <Route path="/demo/filters" element={<FilterPanelDemo />} />
                <Route path="/demo/filter-state" element={<FilterStateDemo />} />
                
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
                <Route
                  path="/responsive-demo"
                  element={
                    <ProtectedRoute>
                      <ResponsiveChartDemo />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/responsive-test"
                  element={
                    <ProtectedRoute>
                      <ResponsiveChartTest />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/drill-down-demo"
                  element={
                    <ProtectedRoute>
                      <DrillDownDemo />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/demo" replace />} />
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
      </ThemeProvider>
    </Router>
  );
}

export default App;
