import React, { useState } from 'react';
import { BarChart3, Download, User, Bell, History } from 'lucide-react';
import Button from '../ui/Button';
import AuditLogViewer from '../audit/AuditLogViewer';
import ConnectionStatus from './ConnectionStatus';

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

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-6 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center justify-center w-12 h-12 bg-slate-800 rounded-xl">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Analytics Manager</h1>
            {currentTable && (
              <p className="text-sm text-slate-600">Managing {currentTable}</p>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center space-x-4">
          {/* Audit Logs Button */}
          <Button
            variant="secondary"
            size="sm"
            icon={<History className="w-4 h-4" />}
            onClick={() => setShowAuditLogs(true)}
          >
            Audit Logs
          </Button>
          
          {/* Export Button */}
          {onExport && currentTable && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={() => onExport(currentTable, 'csv')}
              loading={exportLoading}
            >
              Export
            </Button>
          )}
          
          {/* Connection Status */}
          <ConnectionStatus />
          
          {/* Notifications */}
          <button className="relative p-3 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all duration-200">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          
          {/* User Avatar */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-slate-800 rounded-xl">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-slate-900">Admin User</p>
              <p className="text-xs text-slate-600">admin@company.com</p>
            </div>
          </div>
        </div>
      </div>
      
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
