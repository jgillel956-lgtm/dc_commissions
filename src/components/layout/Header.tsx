import React, { useState } from 'react';
import { BarChart3, Download, User, Bell, History, LogOut, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import AuditLogViewer from '../audit/AuditLogViewer';
import ConnectionStatus from './ConnectionStatus';
import ThemeToggle from '../ui/ThemeToggle';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface HeaderProps {
  onExport?: (tableName: string, format: 'csv' | 'excel') => void;
  exportLoading?: boolean;
  currentTable?: string;
}

const Header: React.FC<HeaderProps> = ({
  onExport,
  exportLoading = false,
  currentTable,
}) => {
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const { user, logout, isAdmin, loading } = useAuth();
  const { showSuccess, showError } = useToast();

  const handleLogout = async () => {
    try {
      await logout('user_initiated');
      showSuccess('Logout successful', 'You have been successfully logged out.');
    } catch (error) {
      console.error('Logout failed:', error);
      showError('Logout failed', 'There was an error during logout. Please try again.');
    }
  };

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center justify-center w-12 h-12 bg-slate-800 rounded-xl">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Analytics Manager</h1>
            {currentTable && (
              <p className="text-sm text-slate-600 dark:text-slate-400">Managing {currentTable}</p>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center space-x-4">
          {/* Admin Panel Button - Admin Only */}
          {isAdmin && (
            <Link to="/admin">
              <Button
                variant="secondary"
                size="sm"
                icon={<Shield className="w-4 h-4" />}
                disabled={loading.loggingOut}
              >
                Admin Panel
              </Button>
            </Link>
          )}
          
          {/* Audit Logs Button - Admin Only */}
          {isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              icon={<History className="w-4 h-4" />}
              onClick={() => setShowAuditLogs(true)}
              disabled={loading.loggingOut}
            >
              Audit Logs
            </Button>
          )}
          
          {/* Export Button */}
          {onExport && currentTable && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={() => onExport(currentTable, 'csv')}
              loading={exportLoading}
              disabled={loading.loggingOut}
            >
              Export
            </Button>
          )}
          
          {/* Connection Status */}
          <ConnectionStatus />
          
          {/* Theme Toggle */}
          <ThemeToggle size="sm" />
          
          {/* Notifications */}
          <button 
            className="relative p-3 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading.loggingOut}
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          
          {/* User Avatar and Info */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-slate-800 rounded-xl">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-slate-900">{user?.username || 'User'}</p>
              <p className="text-xs text-slate-600 capitalize">{user?.role || 'user'}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={loading.loggingOut ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600"></div> : <LogOut className="w-4 h-4" />}
              onClick={handleLogout}
              title={loading.loggingOut ? "Logging out..." : "Logout"}
              disabled={loading.loggingOut}
            >
              {loading.loggingOut ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Session refresh indicator */}
      {loading.refreshing && (
        <div className="mt-2 bg-blue-50 border border-blue-200 rounded-md p-2">
          <div className="flex items-center text-blue-700 text-sm">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-700 mr-2"></div>
            Refreshing session...
          </div>
        </div>
      )}
      
      {/* Audit Log Viewer Modal */}
      <AuditLogViewer
        isOpen={showAuditLogs}
        onClose={() => setShowAuditLogs(false)}
        tableName={currentTable}
      />
    </header>
  );
};

export default Header;
