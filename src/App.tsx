import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './App.css';

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

// Simple placeholder components
const Dashboard = () => (
  <div className="min-h-screen bg-gray-100 p-8">
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Revenue Analytics Dashboard</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Dashboard is being loaded...</p>
        <p className="text-sm text-gray-500 mt-2">This is a placeholder while the full dashboard components are being developed.</p>
      </div>
    </div>
  </div>
);

const Login = () => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center">
    <div className="bg-white rounded-lg shadow p-8 max-w-md w-full">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Login</h1>
      <p className="text-gray-600">Login functionality is being developed...</p>
    </div>
  </div>
);

const Register = () => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center">
    <div className="bg-white rounded-lg shadow p-8 max-w-md w-full">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Register</h1>
      <p className="text-gray-600">Registration functionality is being developed...</p>
    </div>
  </div>
);

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
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
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
