import React from 'react';
import EmployeeCommissionDashboard from '../components/dashboard/EmployeeCommissionDashboard';
import DashboardLayout from '../components/dashboard/DashboardLayout';

const EmployeeCommissionPage: React.FC = () => {
  return (
    <DashboardLayout>
      <EmployeeCommissionDashboard />
    </DashboardLayout>
  );
};

export default EmployeeCommissionPage;