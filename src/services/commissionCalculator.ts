/**
 * Commission Calculator Service
 * 
 * This service provides comprehensive commission calculation functions for the
 * Disbursecloud revenue analytics system. It works with pre-calculated commission
 * data from the revenue_master_view table.
 */

export interface CommissionData {
  emp_id: number;
  employee_name: string;
  Is_Revenue_Transaction: number;
  Gross_Revenue: number;
  Revenue_After_Operational_Costs: number;
  applied_employee_commission_percentage: number;
  applied_employee_commission_amount: number;
  Employee_Commission: number;
  payment_method_id: number;
  company_id: number;
  created_at: string;
  disbursement_updated_at: string;
}

export interface CommissionSummary {
  totalCommission: number;
  totalRevenue: number;
  totalTransactions: number;
  averageCommission: number;
  commissionRate: number;
  revenueAfterCosts: number;
  efficiency: number; // Commission as % of revenue
}

export interface PaymentMethodBreakdown {
  payment_method_id: number;
  paymentMethodName: string;
  totalCommission: number;
  totalRevenue: number;
  transactionCount: number;
  averageCommission: number;
  commissionRate: number;
}

export interface MonthlyStatement {
  year: number;
  month: number;
  employeeName: string;
  empId: number;
  totalCommission: number;
  totalRevenue: number;
  totalTransactions: number;
  breakdown: PaymentMethodBreakdown[];
  topCompanies: Array<{
    company_id: number;
    company_name: string;
    commission: number;
    revenue: number;
    transactions: number;
  }>;
}

export interface CommissionEfficiency {
  empId: number;
  employeeName: string;
  totalCommission: number;
  totalRevenue: number;
  revenueAfterCosts: number;
  commissionEfficiency: number; // Commission as % of revenue after costs
  costEfficiency: number; // Revenue after costs as % of gross revenue
  averageCommissionPerTransaction: number;
  averageRevenuePerTransaction: number;
}

export interface EmployeeComparison {
  employees: Array<{
    empId: number;
    employeeName: string;
    totalCommission: number;
    totalRevenue: number;
    totalTransactions: number;
    averageCommission: number;
    commissionEfficiency: number;
    rank: number;
  }>;
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalCommission: number;
    totalRevenue: number;
    totalTransactions: number;
    averageEfficiency: number;
  };
}

/**
 * Utility function to parse currency values from strings
 */
function parseCurrency(value: any): number {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[$,\s]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Utility function to parse dates
 */
function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  // Handle DD/MM/YYYY HH:MM:SS format
  if (dateStr.includes('/')) {
    const parts = dateStr.split(' ');
    if (parts.length >= 1) {
      const datePart = parts[0];
      const timePart = parts[1] || '';
      const [day, month, year] = datePart.split('/');
      const convertedDate = `${month}/${day}/${year} ${timePart}`;
      const date = new Date(convertedDate);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  return new Date(dateStr);
}

/**
 * Filter data by date range
 */
function filterByDateRange(data: CommissionData[], startDate?: string, endDate?: string): CommissionData[] {
  if (!startDate && !endDate) return data;
  
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  
  return data.filter(record => {
    const recordDate = parseDate(record.created_at || record.disbursement_updated_at);
    
    if (start && recordDate < start) return false;
    if (end && recordDate > end) return false;
    
    return true;
  });
}

/**
 * Get payment method name from ID
 */
function getPaymentMethodName(paymentMethodId: number): string {
  const methods: Record<number, string> = {
    1: 'ACH',
    2: 'Check Payment',
    3: 'Virtual Card',
    4: 'Instant Deposit',
    999: 'Interest',
  };
  return methods[paymentMethodId] || `Method ${paymentMethodId}`;
}

/**
 * 1. Calculate total commissions for an employee in a date range
 */
export function calculateEmployeeCommission(
  data: CommissionData[],
  empId: number,
  startDate?: string,
  endDate?: string
): CommissionSummary {
  // Input validation
  if (!data || !Array.isArray(data)) {
    throw new Error('Invalid data: Expected array of commission data');
  }
  
  if (!empId || typeof empId !== 'number') {
    throw new Error('Invalid empId: Expected number');
  }
  
  // Filter data for the specific employee and date range
  let filteredData = data.filter(record => record.emp_id === empId);
  filteredData = filterByDateRange(filteredData, startDate, endDate);
  
  // Filter for revenue transactions only
  const revenueTransactions = filteredData.filter(record => record.Is_Revenue_Transaction === 1);
  
  if (revenueTransactions.length === 0) {
    return {
      totalCommission: 0,
      totalRevenue: 0,
      totalTransactions: 0,
      averageCommission: 0,
      commissionRate: 0,
      revenueAfterCosts: 0,
      efficiency: 0
    };
  }
  
  // Calculate totals
  const totalCommission = revenueTransactions.reduce((sum, record) => 
    sum + parseCurrency(record.Employee_Commission), 0);
  
  const totalRevenue = revenueTransactions.reduce((sum, record) => 
    sum + parseCurrency(record.Gross_Revenue), 0);
  
  const revenueAfterCosts = revenueTransactions.reduce((sum, record) => 
    sum + parseCurrency(record.Revenue_After_Operational_Costs), 0);
  
  const totalTransactions = revenueTransactions.length;
  const averageCommission = totalTransactions > 0 ? totalCommission / totalTransactions : 0;
  const commissionRate = revenueAfterCosts > 0 ? (totalCommission / revenueAfterCosts) * 100 : 0;
  const efficiency = totalRevenue > 0 ? (totalCommission / totalRevenue) * 100 : 0;
  
  return {
    totalCommission,
    totalRevenue,
    totalTransactions,
    averageCommission,
    commissionRate,
    revenueAfterCosts,
    efficiency
  };
}

/**
 * 2. Get commission breakdown by payment method for an employee
 */
export function getCommissionByPaymentMethod(
  data: CommissionData[],
  empId: number,
  startDate?: string,
  endDate?: string
): PaymentMethodBreakdown[] {
  // Input validation
  if (!data || !Array.isArray(data)) {
    throw new Error('Invalid data: Expected array of commission data');
  }
  
  if (!empId || typeof empId !== 'number') {
    throw new Error('Invalid empId: Expected number');
  }
  
  // Filter data for the specific employee and date range
  let filteredData = data.filter(record => record.emp_id === empId);
  filteredData = filterByDateRange(filteredData, startDate, endDate);
  
  // Filter for revenue transactions only
  const revenueTransactions = filteredData.filter(record => record.Is_Revenue_Transaction === 1);
  
  // Group by payment method
  const methodGroups = new Map<number, CommissionData[]>();
  
  revenueTransactions.forEach(record => {
    const methodId = record.payment_method_id;
    if (!methodGroups.has(methodId)) {
      methodGroups.set(methodId, []);
    }
    methodGroups.get(methodId)!.push(record);
  });
  
  // Calculate breakdown for each payment method
  const breakdown: PaymentMethodBreakdown[] = [];
  
  methodGroups.forEach((transactions, methodId) => {
    const totalCommission = transactions.reduce((sum, record) => 
      sum + parseCurrency(record.Employee_Commission), 0);
    
    const totalRevenue = transactions.reduce((sum, record) => 
      sum + parseCurrency(record.Gross_Revenue), 0);
    
    const transactionCount = transactions.length;
    const averageCommission = transactionCount > 0 ? totalCommission / transactionCount : 0;
    const commissionRate = totalRevenue > 0 ? (totalCommission / totalRevenue) * 100 : 0;
    
    breakdown.push({
      payment_method_id: methodId,
      paymentMethodName: getPaymentMethodName(methodId),
      totalCommission,
      totalRevenue,
      transactionCount,
      averageCommission,
      commissionRate
    });
  });
  
  // Sort by total commission (descending)
  return breakdown.sort((a, b) => b.totalCommission - a.totalCommission);
}

/**
 * 3. Generate monthly commission statement for an employee
 */
export function generateCommissionStatement(
  data: CommissionData[],
  empId: number,
  year: number,
  month: number
): MonthlyStatement {
  // Input validation
  if (!data || !Array.isArray(data)) {
    throw new Error('Invalid data: Expected array of commission data');
  }
  
  if (!empId || typeof empId !== 'number') {
    throw new Error('Invalid empId: Expected number');
  }
  
  if (!year || !month || month < 1 || month > 12) {
    throw new Error('Invalid year/month: Expected valid year and month (1-12)');
  }
  
  // Create date range for the month
  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];
  
  // Filter data for the specific employee and month
  let filteredData = data.filter(record => record.emp_id === empId);
  filteredData = filterByDateRange(filteredData, startDate, endDate);
  
  // Filter for revenue transactions only
  const revenueTransactions = filteredData.filter(record => record.Is_Revenue_Transaction === 1);
  
  if (revenueTransactions.length === 0) {
    const employee = data.find(record => record.emp_id === empId);
    return {
      year,
      month,
      employeeName: employee?.employee_name || 'Unknown Employee',
      empId,
      totalCommission: 0,
      totalRevenue: 0,
      totalTransactions: 0,
      breakdown: [],
      topCompanies: []
    };
  }
  
  // Calculate totals
  const totalCommission = revenueTransactions.reduce((sum, record) => 
    sum + parseCurrency(record.Employee_Commission), 0);
  
  const totalRevenue = revenueTransactions.reduce((sum, record) => 
    sum + parseCurrency(record.Gross_Revenue), 0);
  
  const totalTransactions = revenueTransactions.length;
  
  // Get payment method breakdown
  const breakdown = getCommissionByPaymentMethod(data, empId, startDate, endDate);
  
  // Calculate top companies
  const companyGroups = new Map<number, CommissionData[]>();
  
  revenueTransactions.forEach(record => {
    const companyId = record.company_id;
    if (!companyGroups.has(companyId)) {
      companyGroups.set(companyId, []);
    }
    companyGroups.get(companyId)!.push(record);
  });
  
  const topCompanies = Array.from(companyGroups.entries()).map(([companyId, transactions]) => {
    const commission = transactions.reduce((sum, record) => 
      sum + parseCurrency(record.Employee_Commission), 0);
    
    const revenue = transactions.reduce((sum, record) => 
      sum + parseCurrency(record.Gross_Revenue), 0);
    
    return {
      company_id: companyId,
      company_name: `Company ${companyId}`, // You might want to map this to actual company names
      commission,
      revenue,
      transactions: transactions.length
    };
  }).sort((a, b) => b.commission - a.commission).slice(0, 5); // Top 5 companies
  
  const employee = revenueTransactions[0];
  
  return {
    year,
    month,
    employeeName: employee.employee_name,
    empId,
    totalCommission,
    totalRevenue,
    totalTransactions,
    breakdown,
    topCompanies
  };
}

/**
 * 4. Calculate commission efficiency metrics for an employee
 */
export function calculateCommissionEfficiency(
  data: CommissionData[],
  empId: number,
  startDate?: string,
  endDate?: string
): CommissionEfficiency {
  // Input validation
  if (!data || !Array.isArray(data)) {
    throw new Error('Invalid data: Expected array of commission data');
  }
  
  if (!empId || typeof empId !== 'number') {
    throw new Error('Invalid empId: Expected number');
  }
  
  // Filter data for the specific employee and date range
  let filteredData = data.filter(record => record.emp_id === empId);
  filteredData = filterByDateRange(filteredData, startDate, endDate);
  
  // Filter for revenue transactions only
  const revenueTransactions = filteredData.filter(record => record.Is_Revenue_Transaction === 1);
  
  if (revenueTransactions.length === 0) {
    const employee = data.find(record => record.emp_id === empId);
    return {
      empId,
      employeeName: employee?.employee_name || 'Unknown Employee',
      totalCommission: 0,
      totalRevenue: 0,
      revenueAfterCosts: 0,
      commissionEfficiency: 0,
      costEfficiency: 0,
      averageCommissionPerTransaction: 0,
      averageRevenuePerTransaction: 0
    };
  }
  
  // Calculate totals
  const totalCommission = revenueTransactions.reduce((sum, record) => 
    sum + parseCurrency(record.Employee_Commission), 0);
  
  const totalRevenue = revenueTransactions.reduce((sum, record) => 
    sum + parseCurrency(record.Gross_Revenue), 0);
  
  const revenueAfterCosts = revenueTransactions.reduce((sum, record) => 
    sum + parseCurrency(record.Revenue_After_Operational_Costs), 0);
  
  const totalTransactions = revenueTransactions.length;
  
  // Calculate efficiency metrics
  const commissionEfficiency = revenueAfterCosts > 0 ? (totalCommission / revenueAfterCosts) * 100 : 0;
  const costEfficiency = totalRevenue > 0 ? (revenueAfterCosts / totalRevenue) * 100 : 0;
  const averageCommissionPerTransaction = totalTransactions > 0 ? totalCommission / totalTransactions : 0;
  const averageRevenuePerTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  
  const employee = revenueTransactions[0];
  
  return {
    empId,
    employeeName: employee.employee_name,
    totalCommission,
    totalRevenue,
    revenueAfterCosts,
    commissionEfficiency,
    costEfficiency,
    averageCommissionPerTransaction,
    averageRevenuePerTransaction
  };
}

/**
 * 5. Compare commission performance between employees
 */
export function compareEmployeePerformance(
  data: CommissionData[],
  startDate?: string,
  endDate?: string
): EmployeeComparison {
  // Input validation
  if (!data || !Array.isArray(data)) {
    throw new Error('Invalid data: Expected array of commission data');
  }
  
  // Filter data by date range
  let filteredData = filterByDateRange(data, startDate, endDate);
  
  // Filter for revenue transactions only
  const revenueTransactions = filteredData.filter(record => record.Is_Revenue_Transaction === 1);
  
  // Group by employee
  const employeeGroups = new Map<number, CommissionData[]>();
  
  revenueTransactions.forEach(record => {
    const empId = record.emp_id;
    if (!employeeGroups.has(empId)) {
      employeeGroups.set(empId, []);
    }
    employeeGroups.get(empId)!.push(record);
  });
  
  // Calculate performance for each employee
  const employees = Array.from(employeeGroups.entries()).map(([empId, transactions]) => {
    const totalCommission = transactions.reduce((sum, record) => 
      sum + parseCurrency(record.Employee_Commission), 0);
    
    const totalRevenue = transactions.reduce((sum, record) => 
      sum + parseCurrency(record.Gross_Revenue), 0);
    
    const totalTransactions = transactions.length;
    const averageCommission = totalTransactions > 0 ? totalCommission / totalTransactions : 0;
    const commissionEfficiency = totalRevenue > 0 ? (totalCommission / totalRevenue) * 100 : 0;
    
    const employee = transactions[0];
    
    return {
      empId,
      employeeName: employee.employee_name,
      totalCommission,
      totalRevenue,
      totalTransactions,
      averageCommission,
      commissionEfficiency,
      rank: 0 // Will be set after sorting
    };
  });
  
  // Sort by total commission (descending) and assign ranks
  employees.sort((a, b) => b.totalCommission - a.totalCommission);
  employees.forEach((employee, index) => {
    employee.rank = index + 1;
  });
  
  // Calculate summary statistics
  const totalCommission = employees.reduce((sum, emp) => sum + emp.totalCommission, 0);
  const totalRevenue = employees.reduce((sum, emp) => sum + emp.totalRevenue, 0);
  const totalTransactions = employees.reduce((sum, emp) => sum + emp.totalTransactions, 0);
  const averageEfficiency = employees.length > 0 ? 
    employees.reduce((sum, emp) => sum + emp.commissionEfficiency, 0) / employees.length : 0;
  
  return {
    employees,
    period: {
      startDate: startDate || 'All Time',
      endDate: endDate || 'All Time'
    },
    summary: {
      totalCommission,
      totalRevenue,
      totalTransactions,
      averageEfficiency
    }
  };
}

/**
 * 6. Handle edge cases - Get employees with no transactions in date range
 */
export function getEmployeesWithNoTransactions(
  data: CommissionData[],
  startDate?: string,
  endDate?: string
): Array<{ empId: number; employeeName: string; lastTransactionDate?: string }> {
  // Input validation
  if (!data || !Array.isArray(data)) {
    throw new Error('Invalid data: Expected array of commission data');
  }
  
  // Get all unique employees
  const allEmployees = new Map<number, string>();
  data.forEach(record => {
    if (record.emp_id && record.employee_name) {
      allEmployees.set(record.emp_id, record.employee_name);
    }
  });
  
  // Filter data by date range
  let filteredData = filterByDateRange(data, startDate, endDate);
  
  // Get employees with transactions in the date range
  const employeesWithTransactions = new Set<number>();
  filteredData.forEach(record => {
    if (record.Is_Revenue_Transaction === 1) {
      employeesWithTransactions.add(record.emp_id);
    }
  });
  
  // Find employees with no transactions
  const employeesWithNoTransactions = Array.from(allEmployees.entries())
    .filter(([empId]) => !employeesWithTransactions.has(empId))
    .map(([empId, employeeName]) => {
      // Find their last transaction date
      const employeeTransactions = data.filter(record => record.emp_id === empId);
      const lastTransaction = employeeTransactions
        .sort((a, b) => {
          const dateA = parseDate(a.created_at || a.disbursement_updated_at);
          const dateB = parseDate(b.created_at || b.disbursement_updated_at);
          return dateB.getTime() - dateA.getTime();
        })[0];
      
      return {
        empId,
        employeeName,
        lastTransactionDate: lastTransaction ? 
          (lastTransaction.created_at || lastTransaction.disbursement_updated_at) : undefined
      };
    });
  
  return employeesWithNoTransactions;
}

// Example usage functions
export const CommissionCalculatorExamples = {
  /**
   * Example: Calculate Skip's commission for the last 30 days
   */
  async calculateSkipLast30Days(data: CommissionData[]) {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    return calculateEmployeeCommission(data, 123, startDate, endDate);
  },
  
  /**
   * Example: Generate Billy Bob's commission statement for January 2025
   */
  async generateBillyBobJanuaryStatement(data: CommissionData[]) {
    return generateCommissionStatement(data, 827, 2025, 1);
  },
  
  /**
   * Example: Compare all employees for Q1 2025
   */
  async compareQ1Performance(data: CommissionData[]) {
    return compareEmployeePerformance(data, '2025-01-01', '2025-03-31');
  },
  
  /**
   * Example: Get Roger's payment method breakdown for the year
   */
  async getRogerPaymentBreakdown(data: CommissionData[]) {
    return getCommissionByPaymentMethod(data, 233, '2025-01-01', '2025-12-31');
  }
};


