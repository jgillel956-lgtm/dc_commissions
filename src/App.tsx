import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './App.css';

// Import actual components
import RevenueDashboard from './pages/RevenueDashboard';
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/oauth-setup" element={<OAuthSetup />} />
            <Route path="/table-view" element={<TableView activeTable="employee_commissions_DC" />} />
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
    </QueryClientProvider>
  );
}

export default App;
