import React, { useState, useMemo, useCallback } from 'react';
import { useZohoData } from '../../hooks/useZohoData';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import LoadingSpinner from '../ui/LoadingSpinner';
import Accordion from '../ui/Accordion';
import { ChevronDown, ChevronRight, Filter, Users, FileText, Download, RefreshCw, TrendingUp, DollarSign } from 'lucide-react';

// Commission summary types
interface EmployeeCommissionSummary {
  employee_name: string;
  total_commission: number;
  transaction_count: number;
  average_commission: number;
  records: any[];
}

// Employee earning summary types
interface EmployeeEarningSummary {
  employee_name: string;
  total_transactions: number;
  total_commission_earned: number;
  average_commission_per_transaction: number;
  lowest_commission: number;
  highest_commission: number;
  total_revenue_base: number;
  average_commission_rate: number;
  first_commission_date: string;
  last_commission_date: string;
}

const CommissionReportingTab: React.FC = () => {
  // Helper function to parse currency values
  const parseCurrency = (value: any): number => {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove dollar signs, commas, and spaces, then parse
      const cleaned = value.replace(/[$,\s]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // Helper function to parse dates
  const parseDate = (value: any): string => {
    if (!value) return '';
    if (typeof value === 'string') {
      // Handle DD/MM/YYYY HH:MM:SS format
      const dateStr = value.trim();
      if (dateStr.includes('/')) {
        // Convert DD/MM/YYYY to MM/DD/YYYY for JavaScript Date parsing
        const parts = dateStr.split(' ');
        if (parts.length >= 1) {
          const datePart = parts[0];
          const timePart = parts[1] || '';
          const [day, month, year] = datePart.split('/');
          const convertedDate = `${month}/${day}/${year} ${timePart}`;
          const date = new Date(convertedDate);
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
        }
      }
      
      // Fallback to standard parsing
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    return '';
  };

  // State for filters
  const [dateRange, setDateRange] = useState<{ startDate: string | null; endDate: string | null }>({ startDate: null, endDate: null });
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  
  // State for accordion sections
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [earningSummaryOpen, setEarningSummaryOpen] = useState(false);
  
  // State for expandable employee details
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [expandedEarningEmployees, setExpandedEarningEmployees] = useState<Set<string>>(new Set());

  // Fetch commission data from employee_commissions_DC table
  const { data: commissionData, isLoading, error, refetch } = useZohoData('employee_commissions_DC', {
    page: 1,
    limit: 1000,
    sortBy: 'effective_start_date',
    sortOrder: 'desc'
  });

  // Fetch revenue data from revenue_master_view_cache table
  const { data: revenueData, isLoading: revenueLoading, error: revenueError } = useZohoData('revenue_master_view_cache', {
    page: 1,
    limit: 10000,
    sortBy: 'disbursement_updated_at',
    sortOrder: 'desc'
  });

  // Fetch employee data from employee_commissions_DC table
  const { data: employeeData, isLoading: employeeLoading, error: employeeError } = useZohoData('employee_commissions_DC', {
    page: 1,
    limit: 1000,
    sortBy: 'employee_name',
    sortOrder: 'asc'
  });

  // Create employee list from employee_commissions_DC data
  const availableEmployees = useMemo(() => {
    if (!employeeData?.data || employeeData.data.length === 0) {
      console.log('🔍 No employee data for employee list:', { 
        hasData: !!employeeData?.data, 
        dataLength: employeeData?.data?.length 
      });
      return [];
    }
    
    console.log('🔍 Creating employee list from employee_commissions_DC data:', {
      totalRecords: employeeData.data.length,
      sampleRecord: employeeData.data[0],
      allFields: Object.keys(employeeData.data[0] || {})
    });
    
    // Create a map to count revenue transactions per employee
    const employeeTransactionCounts = new Map<string, number>();
    
    if (revenueData?.data) {
      revenueData.data.forEach(record => {
        if (record.employee_name && record.employee_name !== 'Unknown Employee') {
          const count = employeeTransactionCounts.get(record.employee_name) || 0;
          employeeTransactionCounts.set(record.employee_name, count + 1);
        }
      });
    }
    
    // Create employee list from employee_commissions_DC data
    const employeeMap = new Map<string, { id: string; name: string; count: number }>();
    
    employeeData.data.forEach(record => {
      if (record.employee_name && record.employee_id && record.employee_name !== 'Unknown Employee') {
        // Match employee_name from employee_commissions_DC with employee_name from revenue data
        const transactionCount = employeeTransactionCounts.get(record.employee_name) || 0;
        employeeMap.set(record.employee_name, {
          id: record.employee_id.toString(),
          name: record.employee_name,
          count: transactionCount
        });
      }
    });
    
    const employees = Array.from(employeeMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    console.log('🔍 Available employees:', employees);
    
    return employees;
  }, [employeeData?.data, revenueData?.data]);

  // Filter commission data based on date range and selected employees
  const filteredCommissionData = useMemo(() => {
    if (!commissionData?.data) return [];
    
    return commissionData.data.filter(record => {
      // Date filtering
      if (dateRange.startDate || dateRange.endDate) {
        const recordDate = new Date(record.effective_start_date || record.created_at);
        const startDate = dateRange.startDate ? new Date(dateRange.startDate) : null;
        const endDate = dateRange.endDate ? new Date(dateRange.endDate) : null;
        
        if (startDate && recordDate < startDate) return false;
        if (endDate && recordDate > endDate) return false;
      }
      
      // Employee filtering - check by employee_id
      if (selectedEmployees.length > 0 && record.emp_id && !selectedEmployees.includes(record.emp_id.toString())) {
        return false;
      }
      
      return true;
    });
  }, [commissionData?.data, dateRange, selectedEmployees]);

  // Calculate employee commission summaries using revenue data (actual transactions)
  const employeeCommissions = useMemo((): EmployeeCommissionSummary[] => {
    // If no revenue data, try to use commission configuration data as fallback
    if (!revenueData?.data || revenueData.data.length === 0) {
      console.log('🔍 No revenue data available, using commission configuration data as fallback:', { 
        revenueData, 
        revenueLoading, 
        revenueError,
        commissionData: commissionData?.data?.length || 0
      });
      
      // Fallback to commission configuration data
      if (!commissionData?.data || commissionData.data.length === 0) {
        console.log('🔍 No commission configuration data available either');
        return [];
      }
      
      // Create summaries from commission configuration data
      const commissionMap = new Map<string, EmployeeCommissionSummary>();
      
      console.log('🔍 Filtering commission data with selected employees:', selectedEmployees);
      
      commissionData.data.forEach(record => {
        if (record.employee_name && record.commission_percentage) {
          // Apply employee filtering
          if (selectedEmployees.length > 0 && !selectedEmployees.includes(record.employee_name)) {
            console.log('🔍 Skipping employee:', record.employee_name, 'not in selected:', selectedEmployees);
            return; // Skip this record if employee is not selected
          }
          const key = record.employee_name;
          const existing = commissionMap.get(key) || {
            employee_name: record.employee_name,
            total_commission: 0,
            transaction_count: 0,
            average_commission: 0,
            records: []
          };
          
          // For demo purposes, calculate commission based on a sample transaction amount
          const sampleTransactionAmount = 1000; // $1000 sample transaction
          const commissionRate = parseFloat(record.commission_percentage) / 100;
          const calculatedCommission = sampleTransactionAmount * commissionRate;
          
          existing.total_commission += calculatedCommission;
          existing.transaction_count += 1;
          existing.records.push({
            ...record,
            calculated_commission: calculatedCommission,
            sample_transaction_amount: sampleTransactionAmount
          });
          
          commissionMap.set(key, existing);
        }
      });
      
      const summaries = Array.from(commissionMap.values()).map(summary => ({
        ...summary,
        average_commission: summary.transaction_count > 0 ? summary.total_commission / summary.transaction_count : 0
      }));
      
      console.log('🔍 Created commission summaries from configuration data:', summaries);
      return summaries;
    }
    
    console.log('🔍 Revenue data available:', { 
      totalRecords: revenueData.data.length,
      sampleRecord: revenueData.data[0],
      sampleRecordKeys: revenueData.data[0] ? Object.keys(revenueData.data[0]) : [],
      dateRange,
      selectedEmployees 
    });
    
    // Debug: Check employee names in revenue data
    const employeeNames = [...new Set(revenueData.data.map(record => record.employee_name).filter(name => name))];
    console.log('🔍 Unique employee names in revenue data:', employeeNames);
    
    // Debug: Check revenue transaction records (include records with actual commission amounts)
    const revenueTransactions = revenueData.data.filter(record => 
      record.employee_name && 
      record.employee_name.trim() !== '' && 
      record.employee_name !== 'Unknown Employee' &&
      parseCurrency(record.applied_employee_commission_amount) > 0
    );
    console.log('🔍 Revenue transactions with employee commission:', {
      count: revenueTransactions.length,
      sample: revenueTransactions[0],
      employeeNames: [...new Set(revenueTransactions.map(r => r.employee_name).filter(name => name))]
    });

    // Filter revenue data based on date range and selected employees
    const filteredRevenueData = revenueData.data.filter(record => {
      // Date filtering
      if (dateRange.startDate || dateRange.endDate) {
        const recordDate = new Date(record.disbursement_updated_at);
        const startDate = dateRange.startDate ? new Date(dateRange.startDate) : null;
        const endDate = dateRange.endDate ? new Date(dateRange.endDate) : null;
        
        if (startDate && recordDate < startDate) {
          return false;
        }
        if (endDate && recordDate > endDate) {
          return false;
        }
      }
      
      // Employee filtering - check by employee_name
      if (selectedEmployees.length > 0 && record.employee_name && !selectedEmployees.includes(record.employee_name)) {
        return false;
      }
      
      // Only include records with valid employee names (exclude "Unknown Employee")
      if (!record.employee_name || record.employee_name.trim() === '' || record.employee_name === 'Unknown Employee') {
        return false;
      }
      
      // Only include records with actual commission amounts
      if (parseCurrency(record.applied_employee_commission_amount) <= 0) {
        return false;
      }
      
      return true;
    });

    console.log('🔍 Filtered revenue data:', { 
      filteredCount: filteredRevenueData.length,
      sampleFiltered: filteredRevenueData[0] 
    });

    const employeeMap = new Map<string, EmployeeCommissionSummary>();

    filteredRevenueData.forEach(record => {
      if (record.employee_name) {
        const employeeName = record.employee_name;
        const existing = employeeMap.get(employeeName) || {
          employee_name: employeeName,
          total_commission: 0,
          transaction_count: 0,
          average_commission: 0,
          records: []
        };

        const commission = parseCurrency(record.applied_employee_commission_amount);
        console.log('🔍 Processing record for', employeeName, ':', {
          rawCommission: record.Employee_Commission,
          appliedCommission: record.applied_employee_commission_amount,
          parsedCommission: commission,
          allFields: Object.keys(record),
          sampleRecord: record
        });
        existing.total_commission += commission;
        existing.transaction_count += 1;
        existing.records.push(record); // Store the actual revenue transaction
        employeeMap.set(employeeName, existing);
      }
    });

    // Calculate averages
    employeeMap.forEach(employee => {
      employee.average_commission = employee.transaction_count > 0 
        ? employee.total_commission / employee.transaction_count 
        : 0;
    });

    return Array.from(employeeMap.values()).sort((a, b) => b.total_commission - a.total_commission);
  }, [revenueData?.data, dateRange, selectedEmployees]);

  // Calculate employee earning summaries from revenue data
  const employeeEarningSummaries = useMemo((): EmployeeEarningSummary[] => {
    // If no revenue data, try to use commission configuration data as fallback
    if (!revenueData?.data || revenueData.data.length === 0) {
      console.log('🔍 No revenue data for earning summaries, using commission configuration data as fallback');
      
      // Fallback to commission configuration data
      if (!commissionData?.data || commissionData.data.length === 0) {
        return [];
      }
      
      // Create earning summaries from commission configuration data
      const earningMap = new Map<string, EmployeeEarningSummary>();
      
      commissionData.data.forEach(record => {
        if (record.employee_name && record.commission_percentage) {
          // Apply employee filtering
          if (selectedEmployees.length > 0 && !selectedEmployees.includes(record.employee_name)) {
            return; // Skip this record if employee is not selected
          }
          const key = record.employee_name;
          const existing = earningMap.get(key) || {
            employee_name: record.employee_name,
            total_transactions: 0,
            total_commission_earned: 0,
            average_commission_per_transaction: 0,
            lowest_commission: Number.MAX_VALUE,
            highest_commission: 0,
            total_revenue_base: 0,
            average_commission_rate: 0,
            first_commission_date: record.effective_start_date || new Date().toISOString(),
            last_commission_date: record.effective_start_date || new Date().toISOString()
          };
          
          // For demo purposes, calculate commission based on sample transactions
          const sampleTransactionAmount = 1000; // $1000 sample transaction
          const commissionRate = parseFloat(record.commission_percentage) / 100;
          const calculatedCommission = sampleTransactionAmount * commissionRate;
          
          existing.total_transactions += 1;
          existing.total_commission_earned += calculatedCommission;
          existing.total_revenue_base += sampleTransactionAmount;
          existing.lowest_commission = Math.min(existing.lowest_commission, calculatedCommission);
          existing.highest_commission = Math.max(existing.highest_commission, calculatedCommission);
          existing.average_commission_rate = commissionRate * 100; // Convert to percentage
          
          earningMap.set(key, existing);
        }
      });
      
      // Calculate averages
      earningMap.forEach(earning => {
        earning.average_commission_per_transaction = earning.total_transactions > 0 
          ? earning.total_commission_earned / earning.total_transactions 
          : 0;
        if (earning.lowest_commission === Number.MAX_VALUE) {
          earning.lowest_commission = 0;
        }
      });
      
      const summaries = Array.from(earningMap.values()).sort((a, b) => b.total_commission_earned - a.total_commission_earned);
      console.log('🔍 Created earning summaries from configuration data:', summaries);
      return summaries;
    }

    // Filter revenue data based on date range and selected employees
    const filteredRevenueData = revenueData.data.filter(record => {
      // Date filtering
      if (dateRange.startDate || dateRange.endDate) {
        const recordDate = new Date(record.disbursement_updated_at);
        const startDate = dateRange.startDate ? new Date(dateRange.startDate) : null;
        const endDate = dateRange.endDate ? new Date(dateRange.endDate) : null;
        
        if (startDate && recordDate < startDate) {
          return false;
        }
        if (endDate && recordDate > endDate) {
          return false;
        }
      }
      
      // Employee filtering - check by employee_name
      if (selectedEmployees.length > 0 && record.employee_name && !selectedEmployees.includes(record.employee_name)) {
        return false;
      }
      
      // Only include records with valid employee names (exclude "Unknown Employee")
      if (!record.employee_name || record.employee_name.trim() === '' || record.employee_name === 'Unknown Employee') {
        return false;
      }
      
      // Only include records with actual commission amounts
      if (parseCurrency(record.applied_employee_commission_amount) <= 0) {
        return false;
      }
      
      return true;
    });

    const employeeMap = new Map<string, EmployeeEarningSummary>();

    filteredRevenueData.forEach(record => {
      if (record.employee_name) {
        const employeeName = record.employee_name;
        const existing = employeeMap.get(employeeName) || {
          employee_name: employeeName,
          total_transactions: 0,
          total_commission_earned: 0,
          average_commission_per_transaction: 0,
          lowest_commission: Number.MAX_VALUE,
          highest_commission: 0,
          total_revenue_base: 0,
          average_commission_rate: 0,
          first_commission_date: '',
          last_commission_date: ''
        };

        const commission = parseCurrency(record.applied_employee_commission_amount);
        const revenueBase = parseCurrency(record.revenue_after_operational_costs);
        const commissionRate = parseFloat(record.applied_employee_commission_percentage) || 0;
        const commissionDate = parseDate(record.disbursement_updated_at);

        existing.total_transactions += 1;
        existing.total_commission_earned += commission;
        existing.total_revenue_base += revenueBase;
        existing.lowest_commission = Math.min(existing.lowest_commission, commission);
        existing.highest_commission = Math.max(existing.highest_commission, commission);

        // Update date range
        if (commissionDate && (!existing.first_commission_date || commissionDate < existing.first_commission_date)) {
          existing.first_commission_date = commissionDate;
        }
        if (commissionDate && (!existing.last_commission_date || commissionDate > existing.last_commission_date)) {
          existing.last_commission_date = commissionDate;
        }

        employeeMap.set(employeeName, existing);
      }
    });

    // Calculate averages
    employeeMap.forEach(employee => {
      if (employee.total_transactions > 0) {
        employee.average_commission_per_transaction = employee.total_commission_earned / employee.total_transactions;
        employee.average_commission_rate = employee.total_commission_earned / employee.total_revenue_base * 100;
      }
      if (employee.lowest_commission === Number.MAX_VALUE) {
        employee.lowest_commission = 0;
      }
    });

    return Array.from(employeeMap.values()).sort((a, b) => b.total_commission_earned - a.total_commission_earned);
  }, [revenueData?.data, dateRange, selectedEmployees]);

  // Toggle employee expansion
  const toggleEmployeeExpansion = useCallback((employeeName: string) => {
    setExpandedEmployees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(employeeName)) {
        newSet.delete(employeeName);
      } else {
        newSet.add(employeeName);
      }
      return newSet;
    });
  }, []);

  // Toggle earning summary employee expansion
  const toggleEarningEmployeeExpansion = useCallback((employeeName: string) => {
    setExpandedEarningEmployees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(employeeName)) {
        newSet.delete(employeeName);
      } else {
        newSet.add(employeeName);
      }
      return newSet;
    });
  }, []);

  // Export earning summary to CSV function
  const exportEarningSummaryToCSV = useCallback(() => {
    if (!employeeEarningSummaries.length) return;

    const headers = [
      'Employee Name',
      'Total Transactions',
      'Total Commission Earned',
      'Average Commission Per Transaction',
      'Lowest Commission',
      'Highest Commission',
      'Total Revenue Base',
      'Average Commission Rate (%)',
      'First Commission Date',
      'Last Commission Date'
    ];

    const csvContent = [
      headers.join(','),
      ...employeeEarningSummaries.map(employee => [
        `"${employee.employee_name}"`,
        employee.total_transactions,
        employee.total_commission_earned.toFixed(2),
        employee.average_commission_per_transaction.toFixed(2),
        employee.lowest_commission.toFixed(2),
        employee.highest_commission.toFixed(2),
        employee.total_revenue_base.toFixed(2),
        employee.average_commission_rate.toFixed(2),
        employee.first_commission_date,
        employee.last_commission_date
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `employee_earning_summary_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [employeeEarningSummaries]);

  // Export to CSV function
  const exportToCSV = useCallback(() => {
    if (!employeeCommissions.length) return;

    const headers = [
      'Employee Name',
      'Transaction Date',
      'Company',
      'Payment Method',
      'Transaction Amount',
      'Commission Earned',
      'Commission Rate (%)',
      'Status'
    ];

    const rows: string[][] = [];
    employeeCommissions.forEach(employee => {
      employee.records.forEach(record => {
        rows.push([
          employee.employee_name,
          format(new Date(record.disbursement_updated_at), 'yyyy-MM-dd'),
      record.company || '',
      record.payment_method_description || '',
          parseFloat(record.amount?.replace(/[$,]/g, '') || '0').toFixed(2),
          parseFloat(record.Employee_Commission || '0').toFixed(2),
          record.applied_employee_commission_percentage ? parseFloat(record.applied_employee_commission_percentage).toFixed(2) : '',
          record.api_transaction_status || ''
        ]);
      });
    });

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commission-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [employeeCommissions]);

  if (isLoading || revenueLoading || employeeLoading) {
    return <LoadingSpinner />;
  }

  if (error || revenueError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading commission data</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{(error?.message || revenueError?.message) || 'An error occurred while loading the data.'}</p>
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
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900">Commission Reporting</h2>
            <p className="text-gray-600 mt-1">
          Track commissions due to employees with expandable detail views
        </p>
        <div className="mt-4 text-sm text-gray-500">
          Showing {employeeCommissions.reduce((sum, emp) => sum + emp.transaction_count, 0)} transactions from {employeeCommissions.length} employees
        </div>
      </div>

      {/* Data Source Notice */}
      {(!revenueData?.data || revenueData.data.length === 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">
                Demo Data Mode
              </h3>
              <div className="mt-2 text-sm text-amber-700">
                <p>
                  No transaction data found in <code>revenue_master_view_cache</code>. 
                  Currently showing demo calculations based on commission configuration data from <code>employee_commissions_DC</code>.
                </p>
                <p className="mt-1">
                  <strong>To see real transaction data:</strong> Upload your CSV file with the <code>emp_id</code> column using the "Upload CSV" button in the Data Sync section.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Accordion */}
      <Accordion 
        title="Filters & Date Range" 
        defaultOpen={filtersOpen}
        icon={<Filter className="h-5 w-5 text-gray-500" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Date Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Date Range</label>
            <div className="space-y-2">
              <input
                type="date"
                value={dateRange.startDate || ''}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Start Date"
              />
              <input
                type="date"
                value={dateRange.endDate || ''}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="End Date"
              />
          </div>
        </div>

          {/* Employee Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Employees</label>
            <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md bg-white">
              {availableEmployees.length === 0 ? (
                <div className="p-3 text-sm text-gray-500 text-center">
                  {revenueLoading ? 'Loading employees...' : 'No employees found'}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {availableEmployees.map(employee => (
                    <label key={employee.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(employee.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEmployees(prev => [...prev, employee.name]);
                          } else {
                            setSelectedEmployees(prev => prev.filter(name => name !== employee.name));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-900">
                        {employee.name} ({employee.count} transactions)
                </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
              {selectedEmployees.length > 0 && (
              <div className="mt-2">
                  <button
                    onClick={() => setSelectedEmployees([])}
                  className="text-xs text-blue-600 hover:text-blue-800"
                  >
                  Clear all selections
                  </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Actions</label>
            <div className="space-y-2">
                  <button
                onClick={exportToCSV}
                disabled={!filteredCommissionData || filteredCommissionData.length === 0}
                className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="-ml-1 mr-2 h-4 w-4" />
                Export CSV
                  </button>
              <button
                onClick={() => {
                  setDateRange({ startDate: null, endDate: null });
                  setSelectedEmployees([]);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Clear Filters
              </button>
            </div>
          </div>
      </div>
      </Accordion>

      {/* Employee Commission Summary Accordion */}
      <Accordion 
        title={`Employee Commission Summary (${employeeCommissions.length} employees)`}
        defaultOpen={summaryOpen}
        icon={<Users className="h-5 w-5 text-gray-500" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employeeCommissions.map((employee) => (
            <div key={employee.employee_name} className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gray-900">{employee.employee_name}</h4>
              <div className="mt-2 space-y-1">
                <div className="text-sm text-gray-600">
                  Total Commission: <span className="font-medium text-green-600">${employee.total_commission.toFixed(2)}</span>
                </div>
                <div className="text-sm text-gray-600">
                  Transactions: <span className="font-medium">{employee.transaction_count}</span>
                </div>
                <div className="text-sm text-gray-600">
                  Average: <span className="font-medium">${employee.average_commission.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Accordion>

      {/* Detailed Commission Records Accordion */}
      <Accordion 
        title={`Detailed Commission Records (${employeeCommissions.reduce((sum, emp) => sum + emp.transaction_count, 0)} transactions)`}
        defaultOpen={detailsOpen}
        icon={<FileText className="h-5 w-5 text-gray-500" />}
      >
        <div className="space-y-4">
          {employeeCommissions.map((employee) => (
            <div key={employee.employee_name} className="border border-gray-200 rounded-lg">
              {/* Employee Header */}
              <button
                onClick={() => toggleEmployeeExpansion(employee.employee_name)}
                className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-t-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {expandedEmployees.has(employee.employee_name) ? (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{employee.employee_name}</h4>
                    <p className="text-sm text-gray-600">
                      {employee.transaction_count} transactions • Total: ${employee.total_commission.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-green-600">
                    ${employee.total_commission.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Avg: ${employee.average_commission.toFixed(2)}
                  </div>
                </div>
              </button>

              {/* Employee Details */}
              {expandedEmployees.has(employee.employee_name) && (
                <div className="border-t border-gray-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Transaction Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Company
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Payment Method
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Transaction Amount
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Commission Earned
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Commission Rate
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {employee.records.map((record, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {format(new Date(record.disbursement_updated_at), 'MM/dd/yyyy')}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {record.company || '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {record.payment_method_description || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              ${parseFloat(record.amount?.replace(/[$,]/g, '') || '0').toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                              ${parseFloat(record.Employee_Commission || '0').toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {record.applied_employee_commission_percentage ? `${parseFloat(record.applied_employee_commission_percentage).toFixed(2)}%` : '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {record.api_transaction_status || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                    </div>
                  )}
            </div>
          ))}
        </div>
      </Accordion>

      {/* Individual Employee Earning Summary */}
      <Accordion 
        title="Individual Employee Earning Summary" 
        defaultOpen={earningSummaryOpen}
        icon={<TrendingUp className="h-5 w-5 text-gray-500" />}
      >
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-600">Total Employees</p>
                  <p className="text-2xl font-bold text-blue-900">{employeeEarningSummaries.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-600">Total Commissions</p>
                  <p className="text-2xl font-bold text-green-900">
                    ${employeeEarningSummaries.reduce((sum, emp) => sum + emp.total_commission_earned, 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-600">Total Transactions</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {employeeEarningSummaries.reduce((sum, emp) => sum + emp.total_transactions, 0)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-orange-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-orange-600">Avg Commission Rate</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {employeeEarningSummaries.length > 0 
                      ? (employeeEarningSummaries.reduce((sum, emp) => sum + emp.average_commission_rate, 0) / employeeEarningSummaries.length).toFixed(1)
                      : '0.0'
                    }%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <div className="flex justify-end">
            <button
              onClick={exportEarningSummaryToCSV}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Export to CSV
            </button>
          </div>

          {/* Employee Earning Summary Table */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Employee Earning Details
              </h3>
              
              {employeeEarningSummaries.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No earning data found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {revenueLoading ? 'Loading revenue data...' : 'No revenue transactions with employee commissions found for the selected filters.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {employeeEarningSummaries.map((employee) => (
                    <div key={employee.employee_name} className="border border-gray-200 rounded-lg">
                      <div 
                        className="px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => toggleEarningEmployeeExpansion(employee.employee_name)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            {expandedEarningEmployees.has(employee.employee_name) ? (
                              <ChevronDown className="h-5 w-5 text-gray-400 mr-2" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-gray-400 mr-2" />
                            )}
                            <h4 className="text-lg font-medium text-gray-900">{employee.employee_name}</h4>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">
                              ${employee.total_commission_earned.toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {employee.total_transactions} transactions
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {expandedEarningEmployees.has(employee.employee_name) && (
                        <div className="px-4 py-4 bg-white">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                              <p className="text-lg font-bold text-gray-900">{employee.total_transactions}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-sm font-medium text-gray-600">Total Commission Earned</p>
                              <p className="text-lg font-bold text-green-600">${employee.total_commission_earned.toFixed(2)}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-sm font-medium text-gray-600">Average Commission Per Transaction</p>
                              <p className="text-lg font-bold text-gray-900">${employee.average_commission_per_transaction.toFixed(2)}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-sm font-medium text-gray-600">Lowest Commission</p>
                              <p className="text-lg font-bold text-gray-900">${employee.lowest_commission.toFixed(2)}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-sm font-medium text-gray-600">Highest Commission</p>
                              <p className="text-lg font-bold text-gray-900">${employee.highest_commission.toFixed(2)}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-sm font-medium text-gray-600">Total Revenue Base</p>
                              <p className="text-lg font-bold text-gray-900">${employee.total_revenue_base.toFixed(2)}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-sm font-medium text-gray-600">Average Commission Rate</p>
                              <p className="text-lg font-bold text-blue-600">{employee.average_commission_rate.toFixed(2)}%</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-sm font-medium text-gray-600">First Commission Date</p>
                              <p className="text-lg font-bold text-gray-900">
                                {employee.first_commission_date ? format(new Date(employee.first_commission_date), 'MMM dd, yyyy') : '-'}
                              </p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-sm font-medium text-gray-600">Last Commission Date</p>
                              <p className="text-lg font-bold text-gray-900">
                                {employee.last_commission_date ? format(new Date(employee.last_commission_date), 'MMM dd, yyyy') : '-'}
                              </p>
                            </div>
              </div>
            </div>
          )}
                    </div>
                  ))}
                </div>
      )}
            </div>
          </div>
        </div>
      </Accordion>
    </div>
  );
};

export default CommissionReportingTab;
