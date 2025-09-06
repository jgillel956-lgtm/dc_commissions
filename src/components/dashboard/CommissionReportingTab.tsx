import React, { useState, useMemo, useCallback } from 'react';
import { useRevenueAnalytics } from '../../hooks/useRevenueAnalytics';
import { RevenueAnalyticsFilters } from '../../types/revenueAnalytics';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import LoadingSpinner from '../ui/LoadingSpinner';
import CompanyMultiSelect from '../ui/CompanyMultiSelect';
import EmployeeMultiSelect from '../ui/EmployeeMultiSelect';
import { useCompanyData } from '../../hooks/useCompanyData';
import { useEmployeeData } from '../../hooks/useEmployeeData';

// Commission summary types
interface EmployeeCommissionSummary {
  employee_name: string;
  total_commission: number;
  transaction_count: number;
  average_commission: number;
}

interface ReferralPartnerCommissionSummary {
  referral_partner_name: string;
  total_commission: number;
  transaction_count: number;
  average_commission: number;
}

interface CompanyUpchargeSummary {
  company: string;
  total_upcharge: number;
  transaction_count: number;
  average_upcharge: number;
}

const CommissionReportingTab: React.FC = () => {
  // State for filters
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [dateRange, setDateRange] = useState<{ startDate: string | null; endDate: string | null }>({ startDate: null, endDate: null });
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'summary' | 'details' | 'both'>('both');

  // Fetch company and employee data for filters
  const { companies, loading: companiesLoading } = useCompanyData();
  const { employees, loading: employeesLoading } = useEmployeeData();

  // Build filters for the API call
  const filters: RevenueAnalyticsFilters = useMemo(() => {
    const baseFilters: RevenueAnalyticsFilters = {};

    // Handle month selection vs date range
    if (dateRange.startDate && dateRange.endDate) {
      baseFilters.dateRange = {
        start: dateRange.startDate,
        end: dateRange.endDate
      };
    } else if (selectedMonth) {
      const monthStart = startOfMonth(new Date(selectedMonth + '-01'));
      const monthEnd = endOfMonth(new Date(selectedMonth + '-01'));
      baseFilters.dateRange = {
        start: format(monthStart, 'yyyy-MM-dd'),
        end: format(monthEnd, 'yyyy-MM-dd')
      };
    }

    // Add company filter
    if (selectedCompanies.length > 0) {
      baseFilters.companyId = selectedCompanies[0]; // For now, using first company
    }

    // Add employee filter
    if (selectedEmployees.length > 0) {
      baseFilters.employeeId = selectedEmployees[0]; // For now, using first employee
    }

    return baseFilters;
  }, [selectedMonth, dateRange, selectedCompanies, selectedEmployees]);

  // Fetch revenue analytics data
  const { data, isLoading, error, refetch } = useRevenueAnalytics({ 
    filters,
    limit: 1000 // Get more records for commission reporting
  });

  // Calculate employee commission summaries
  const employeeCommissions = useMemo((): EmployeeCommissionSummary[] => {
    if (!data?.data) return [];

    const employeeMap = new Map<string, EmployeeCommissionSummary>();

    data.data.forEach(record => {
      if (record.employee_name && record.Total_Employee_Commission > 0) {
        const existing = employeeMap.get(record.employee_name) || {
          employee_name: record.employee_name,
          total_commission: 0,
          transaction_count: 0,
          average_commission: 0
        };

        existing.total_commission += record.Total_Employee_Commission;
        existing.transaction_count += 1;
        employeeMap.set(record.employee_name, existing);
      }
    });

    // Calculate averages
    employeeMap.forEach(employee => {
      employee.average_commission = employee.transaction_count > 0 
        ? employee.total_commission / employee.transaction_count 
        : 0;
    });

    return Array.from(employeeMap.values()).sort((a, b) => b.total_commission - a.total_commission);
  }, [data?.data]);

  // Calculate referral partner commission summaries
  const referralPartnerCommissions = useMemo((): ReferralPartnerCommissionSummary[] => {
    if (!data?.data) return [];

    const partnerMap = new Map<string, ReferralPartnerCommissionSummary>();

    data.data.forEach(record => {
      if (record.referral_partner_name && record.Total_Referral_Partner_Commission > 0) {
        const existing = partnerMap.get(record.referral_partner_name) || {
          referral_partner_name: record.referral_partner_name,
          total_commission: 0,
          transaction_count: 0,
          average_commission: 0
        };

        existing.total_commission += record.Total_Referral_Partner_Commission;
        existing.transaction_count += 1;
        partnerMap.set(record.referral_partner_name, existing);
      }
    });

    // Calculate averages
    partnerMap.forEach(partner => {
      partner.average_commission = partner.transaction_count > 0 
        ? partner.total_commission / partner.transaction_count 
        : 0;
    });

    return Array.from(partnerMap.values()).sort((a, b) => b.total_commission - a.total_commission);
  }, [data?.data]);

  // Calculate company upcharge summaries
  const companyUpcharges = useMemo((): CompanyUpchargeSummary[] => {
    if (!data?.data) return [];

    const companyMap = new Map<string, CompanyUpchargeSummary>();

    data.data.forEach(record => {
      if (record.company && record.Total_Company_Upcharge_Fees > 0) {
        const existing = companyMap.get(record.company) || {
          company: record.company,
          total_upcharge: 0,
          transaction_count: 0,
          average_upcharge: 0
        };

        existing.total_upcharge += record.Total_Company_Upcharge_Fees;
        existing.transaction_count += 1;
        companyMap.set(record.company, existing);
      }
    });

    // Calculate averages
    companyMap.forEach(company => {
      company.average_upcharge = company.transaction_count > 0 
        ? company.total_upcharge / company.transaction_count 
        : 0;
    });

    return Array.from(companyMap.values()).sort((a, b) => b.total_upcharge - a.total_upcharge);
  }, [data?.data]);

  // Generate month options for dropdown (last 12 months)
  const monthOptions = useMemo(() => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      months.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy')
      });
    }
    return months;
  }, []);

  // Export to CSV function
  const exportToCSV = useCallback(() => {
    if (!data?.data) return;

    const headers = [
      'Date',
      'Company',
      'Payment Method',
      'Employee Name',
      'Employee Commission',
      'Referral Partner',
      'Referral Commission',
      'Company Upcharge'
    ];

    const rows = data.data.map(record => [
      format(new Date(record.created_at), 'yyyy-MM-dd'),
      record.company || '',
      record.payment_method_description || '',
      record.employee_name || '',
      record.Total_Employee_Commission?.toFixed(2) || '0.00',
      record.referral_partner_name || '',
      record.Total_Referral_Partner_Commission?.toFixed(2) || '0.00',
      record.Total_Company_Upcharge_Fees?.toFixed(2) || '0.00'
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commission-report-${selectedMonth || 'custom'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data?.data, selectedMonth]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Commission Data</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error?.toString() || 'Unknown error occurred'}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => refetch()}
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Commission Reporting</h2>
            <p className="text-gray-600 mt-1">
              Track commissions due to employees, referral partners, and company upcharges
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {/* Month Selection */}
            <div className="flex items-center space-x-2">
              <label htmlFor="month-select" className="text-sm font-medium text-gray-700">
                Month:
              </label>
              <select
                id="month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {monthOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">View:</label>
              <div className="flex bg-gray-100 rounded-lg p-1">
                {['summary', 'details', 'both'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode as any)}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      viewMode === mode
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Export Button */}
            <button
              onClick={exportToCSV}
              disabled={!data?.data || data.data.length === 0}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => refetch()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Company Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Companies
            </label>
            <CompanyMultiSelect
              companies={companies}
              selectedIds={selectedCompanies}
              onSelectionChange={setSelectedCompanies}
              loading={companiesLoading}
              placeholder="All companies"
              className="w-full"
            />
          </div>

          {/* Employee Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Employees
            </label>
            <EmployeeMultiSelect
              employees={employees}
              selectedIds={selectedEmployees}
              onSelectionChange={setSelectedEmployees}
              loading={employeesLoading}
              placeholder="All employees"
              className="w-full"
            />
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Date Range
            </label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={dateRange.startDate || ''}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Start date"
              />
              <input
                type="date"
                value={dateRange.endDate || ''}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="End date"
              />
            </div>
            <div className="flex justify-between mt-2">
              <button
                onClick={() => setDateRange({ startDate: null, endDate: null })}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear dates
              </button>
              <span className="text-xs text-gray-500">
                Leave empty to use month selection
              </span>
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {(selectedCompanies.length > 0 || selectedEmployees.length > 0 || dateRange.startDate || dateRange.endDate) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700">Active filters:</span>
              
              {selectedCompanies.length > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {selectedCompanies.length} Company{selectedCompanies.length > 1 ? 'ies' : 'y'}
                  <button
                    type="button"
                    className="flex-shrink-0 ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:outline-none"
                    onClick={() => setSelectedCompanies([])}
                  >
                    <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                      <path strokeLinecap="round" strokeWidth="1.5" d="m1 1 6 6m0-6-6 6" />
                    </svg>
                  </button>
                </span>
              )}

              {selectedEmployees.length > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {selectedEmployees.length} Employee{selectedEmployees.length > 1 ? 's' : ''}
                  <button
                    type="button"
                    className="flex-shrink-0 ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-green-400 hover:bg-green-200 hover:text-green-500 focus:outline-none"
                    onClick={() => setSelectedEmployees([])}
                  >
                    <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                      <path strokeLinecap="round" strokeWidth="1.5" d="m1 1 6 6m0-6-6 6" />
                    </svg>
                  </button>
                </span>
              )}

              {(dateRange.startDate || dateRange.endDate) && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Custom Date Range
                  <button
                    type="button"
                    className="flex-shrink-0 ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-purple-400 hover:bg-purple-200 hover:text-purple-500 focus:outline-none"
                    onClick={() => setDateRange({ startDate: null, endDate: null })}
                  >
                    <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                      <path strokeLinecap="round" strokeWidth="1.5" d="m1 1 6 6m0-6-6 6" />
                    </svg>
                  </button>
                </span>
              )}

              <button
                onClick={() => {
                  setSelectedCompanies([]);
                  setSelectedEmployees([]);
                  setDateRange({ startDate: null, endDate: null });
                }}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Clear all filters
              </button>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {/* Summary Tables */}
          {(viewMode === 'summary' || viewMode === 'both') && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Employee Commissions */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Employee Commissions</h3>
                  <p className="text-sm text-gray-600">Total: ${employeeCommissions.reduce((sum, emp) => sum + emp.total_commission, 0).toFixed(2)}</p>
                </div>
                <div className="overflow-hidden">
                  {employeeCommissions.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Employee
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {employeeCommissions.slice(0, 10).map((employee, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {employee.employee_name}
                              <div className="text-xs text-gray-500">
                                {employee.transaction_count} transactions
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-right text-gray-900">
                              ${employee.total_commission.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="px-6 py-4 text-sm text-gray-500">
                      No employee commissions found for the selected period.
                    </div>
                  )}
                </div>
              </div>

              {/* Referral Partner Commissions */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Referral Partner Commissions</h3>
                  <p className="text-sm text-gray-600">Total: ${referralPartnerCommissions.reduce((sum, partner) => sum + partner.total_commission, 0).toFixed(2)}</p>
                </div>
                <div className="overflow-hidden">
                  {referralPartnerCommissions.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Partner
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {referralPartnerCommissions.slice(0, 10).map((partner, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {partner.referral_partner_name}
                              <div className="text-xs text-gray-500">
                                {partner.transaction_count} transactions
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-right text-gray-900">
                              ${partner.total_commission.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="px-6 py-4 text-sm text-gray-500">
                      No referral partner commissions found for the selected period.
                    </div>
                  )}
                </div>
              </div>

              {/* Company Upcharges */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Company Upcharges</h3>
                  <p className="text-sm text-gray-600">Total: ${companyUpcharges.reduce((sum, company) => sum + company.total_upcharge, 0).toFixed(2)}</p>
                </div>
                <div className="overflow-hidden">
                  {companyUpcharges.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Company
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {companyUpcharges.slice(0, 10).map((company, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {company.company}
                              <div className="text-xs text-gray-500">
                                {company.transaction_count} transactions
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-right text-gray-900">
                              ${company.total_upcharge.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="px-6 py-4 text-sm text-gray-500">
                      No company upcharges found for the selected period.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Detailed Transaction Table */}
          {(viewMode === 'details' || viewMode === 'both') && data?.data && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Detailed Commission Records</h3>
                <p className="text-sm text-gray-600">
                  Showing {data.data.length} transactions with commission data
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee Commission
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Referral Partner
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Referral Commission
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company Upcharge
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.data
                      .filter(record => 
                        record.Total_Employee_Commission > 0 || 
                        record.Total_Referral_Partner_Commission > 0 || 
                        record.Total_Company_Upcharge_Fees > 0
                      )
                      .slice(0, 100) // Limit to first 100 for performance
                      .map((record, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {format(new Date(record.created_at), 'MM/dd/yyyy')}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {record.company}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {record.payment_method_description}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {record.employee_name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                            ${record.Total_Employee_Commission?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {record.referral_partner_name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                            ${record.Total_Referral_Partner_Commission?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                            ${record.Total_Company_Upcharge_Fees?.toFixed(2) || '0.00'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CommissionReportingTab;