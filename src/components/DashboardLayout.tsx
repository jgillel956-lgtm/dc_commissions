import React from 'react';

interface DashboardLayoutProps {
  children?: React.ReactNode;
  className?: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, className }) => {
  return (
    <div className={className} data-testid="dashboard-layout">
      <header data-testid="dashboard-header">
        <h1>Dashboard Header</h1>
      </header>
      <main data-testid="dashboard-main">
        {children}
      </main>
      <footer data-testid="dashboard-footer">
        <p>Dashboard Footer</p>
      </footer>
    </div>
  );
};

export default DashboardLayout;
