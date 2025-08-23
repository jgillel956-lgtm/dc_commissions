import React, { useState } from 'react';
import { Users, Activity, Settings, Shield, BarChart3, TestTube, Home } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import Dashboard from '../components/admin/Dashboard';
import UserManagement from '../components/admin/UserManagement';
import AuditLogViewer from '../components/admin/AuditLogViewer';
import AuditLoggingTest from '../components/AuditLoggingTest';

type AdminTab = 'dashboard' | 'users' | 'audit-logs' | 'settings' | 'audit-test';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const { user, isAdmin } = useAuth();
  const { showError } = useToast();

  // Redirect non-admin users
  if (!isAdmin) {
    showError('Access Denied', 'You do not have permission to access the admin panel.');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You do not have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'dashboard' as AdminTab,
      label: 'Dashboard',
      icon: <Home className="w-5 h-5" />,
      description: 'System overview and statistics'
    },
    {
      id: 'users' as AdminTab,
      label: 'User Management',
      icon: <Users className="w-5 h-5" />,
      description: 'Manage users, roles, and permissions'
    },
    {
      id: 'audit-logs' as AdminTab,
      label: 'Audit Logs',
      icon: <Activity className="w-5 h-5" />,
      description: 'View and export system activity logs'
    },
    {
      id: 'audit-test' as AdminTab,
      label: 'Audit Test',
      icon: <TestTube className="w-5 h-5" />,
      description: 'Test audit logging functionality'
    },
    {
      id: 'settings' as AdminTab,
      label: 'System Settings',
      icon: <Settings className="w-5 h-5" />,
      description: 'Configure system preferences and security'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'users':
        return <UserManagement />;
      case 'audit-logs':
        return <AuditLogViewer />;
      case 'audit-test':
        return <AuditLoggingTest />;
      case 'settings':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">System Settings</h2>
            <p className="text-gray-600">System settings configuration will be implemented in future updates.</p>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-10 h-10 bg-slate-800 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Admin Panel</h1>
                <p className="text-sm text-gray-600">Welcome back, {user?.username}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <BarChart3 className="w-4 h-4" />
                <span>Admin Dashboard</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-slate-800 text-slate-800'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Description */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <p className="text-sm text-gray-600">
            {tabs.find(tab => tab.id === activeTab)?.description}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
