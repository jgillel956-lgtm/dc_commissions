import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  activeTable: string;
  onTableChange: (tableName: string) => void;
  onExport?: (tableName: string, format: 'csv' | 'excel') => void;
  exportLoading?: boolean;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  activeTable,
  onTableChange,
  onExport,
  exportLoading,
}) => {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <Header
        onExport={onExport}
        exportLoading={exportLoading}
        currentTable={activeTable}
      />
      
      <div className="flex h-[calc(100vh-88px)]">
        {/* Sidebar */}
        <Sidebar
          activeTable={activeTable}
          onTableChange={onTableChange}
        />
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
