import React from 'react';
import { BrowserRouter as Router, Routes, Route, useSearchParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './App.css';

// Import context providers
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Import actual components
import RevenueDashboard from './pages/RevenueDashboard';
import EmployeeCommissionPage from './pages/EmployeeCommissionPage';
import Login from './pages/Login';
import TableView from './pages/TableView';
import AdminPanel from './pages/AdminPanel';
import OAuthSetup from './pages/OAuthSetup';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // For now, just render the children without authentication
  return <>{children}</>;
};

// TableView wrapper component to handle URL parameters
const TableViewWrapper = () => {
  const [searchParams] = useSearchParams();
  const tableParam = searchParams.get('table');
  const activeTable = tableParam || 'employee_commissions_DC';
  
  return <TableView activeTable={activeTable} />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <Router>
            <div className="App">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/oauth-setup" element={<OAuthSetup />} />
                <Route path="/table-view" element={<TableViewWrapper />} />
                <Route
                  path="/employee-commissions"
                  element={
                    <ProtectedRoute>
                      <EmployeeCommissionPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <RevenueDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <RevenueDashboard />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </div>
          </Router>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
