import { useMemo } from 'react';
import {
  calculateEmployeeCommission,
  getCommissionByPaymentMethod,
  generateCommissionStatement,
  calculateCommissionEfficiency,
  compareEmployeePerformance,
  getEmployeesWithNoTransactions,
  CommissionData,
  CommissionSummary,
  PaymentMethodBreakdown,
  MonthlyStatement,
  CommissionEfficiency,
  EmployeeComparison
} from '../services/commissionCalculator';

/**
 * Custom hook for commission calculations
 * Integrates with the existing useZohoData hook to provide commission analytics
 */
export function useCommissionCalculator() {
  
  /**
   * Calculate commission summary for an employee
   */
  const calculateEmployeeCommissionSummary = useMemo(() => {
    return (
      data: CommissionData[],
      empId: number,
      startDate?: string,
      endDate?: string
    ): CommissionSummary => {
      try {
        return calculateEmployeeCommission(data, empId, startDate, endDate);
      } catch (error) {
        console.error('Error calculating employee commission:', error);
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
    };
  }, []);

  /**
   * Get payment method breakdown for an employee
   */
  const getEmployeePaymentBreakdown = useMemo(() => {
    return (
      data: CommissionData[],
      empId: number,
      startDate?: string,
      endDate?: string
    ): PaymentMethodBreakdown[] => {
      try {
        return getCommissionByPaymentMethod(data, empId, startDate, endDate);
      } catch (error) {
        console.error('Error getting payment breakdown:', error);
        return [];
      }
    };
  }, []);

  /**
   * Generate monthly statement for an employee
   */
  const generateEmployeeStatement = useMemo(() => {
    return (
      data: CommissionData[],
      empId: number,
      year: number,
      month: number
    ): MonthlyStatement => {
      try {
        return generateCommissionStatement(data, empId, year, month);
      } catch (error) {
        console.error('Error generating statement:', error);
        return {
          year,
          month,
          employeeName: 'Unknown Employee',
          empId,
          totalCommission: 0,
          totalRevenue: 0,
          totalTransactions: 0,
          breakdown: [],
          topCompanies: []
        };
      }
    };
  }, []);

  /**
   * Calculate efficiency metrics for an employee
   */
  const calculateEmployeeEfficiency = useMemo(() => {
    return (
      data: CommissionData[],
      empId: number,
      startDate?: string,
      endDate?: string
    ): CommissionEfficiency => {
      try {
        return calculateCommissionEfficiency(data, empId, startDate, endDate);
      } catch (error) {
        console.error('Error calculating efficiency:', error);
        return {
          empId,
          employeeName: 'Unknown Employee',
          totalCommission: 0,
          totalRevenue: 0,
          revenueAfterCosts: 0,
          commissionEfficiency: 0,
          costEfficiency: 0,
          averageCommissionPerTransaction: 0,
          averageRevenuePerTransaction: 0
        };
      }
    };
  }, []);

  /**
   * Compare performance between employees
   */
  const compareEmployees = useMemo(() => {
    return (
      data: CommissionData[],
      startDate?: string,
      endDate?: string
    ): EmployeeComparison => {
      try {
        return compareEmployeePerformance(data, startDate, endDate);
      } catch (error) {
        console.error('Error comparing employees:', error);
        return {
          employees: [],
          period: { startDate: startDate || 'All Time', endDate: endDate || 'All Time' },
          summary: {
            totalCommission: 0,
            totalRevenue: 0,
            totalTransactions: 0,
            averageEfficiency: 0
          }
        };
      }
    };
  }, []);

  /**
   * Get employees with no transactions in date range
   */
  const getInactiveEmployees = useMemo(() => {
    return (
      data: CommissionData[],
      startDate?: string,
      endDate?: string
    ) => {
      try {
        return getEmployeesWithNoTransactions(data, startDate, endDate);
      } catch (error) {
        console.error('Error getting inactive employees:', error);
        return [];
      }
    };
  }, []);

  /**
   * Get all unique employees from the data
   */
  const getAllEmployees = useMemo(() => {
    return (data: CommissionData[]) => {
      try {
        const employeeMap = new Map<number, { empId: number; employeeName: string; transactionCount: number }>();
        
        data.forEach(record => {
          if (record.emp_id && record.employee_name && record.Is_Revenue_Transaction === 1) {
            const existing = employeeMap.get(record.emp_id);
            if (existing) {
              existing.transactionCount++;
            } else {
              employeeMap.set(record.emp_id, {
                empId: record.emp_id,
                employeeName: record.employee_name,
                transactionCount: 1
              });
            }
          }
        });
        
        return Array.from(employeeMap.values()).sort((a, b) => b.transactionCount - a.transactionCount);
      } catch (error) {
        console.error('Error getting all employees:', error);
        return [];
      }
    };
  }, []);

  /**
   * Get commission data for multiple employees
   */
  const getMultipleEmployeeCommissions = useMemo(() => {
    return (
      data: CommissionData[],
      empIds: number[],
      startDate?: string,
      endDate?: string
    ): Array<{ empId: number; employeeName: string; summary: CommissionSummary }> => {
      try {
        return empIds.map(empId => {
          const summary = calculateEmployeeCommission(data, empId, startDate, endDate);
          const employee = data.find(record => record.emp_id === empId);
          return {
            empId,
            employeeName: employee?.employee_name || 'Unknown Employee',
            summary
          };
        });
      } catch (error) {
        console.error('Error getting multiple employee commissions:', error);
        return [];
      }
    };
  }, []);

  /**
   * Get top performing employees by commission
   */
  const getTopPerformers = useMemo(() => {
    return (
      data: CommissionData[],
      limit: number = 10,
      startDate?: string,
      endDate?: string
    ) => {
      try {
        const comparison = compareEmployeePerformance(data, startDate, endDate);
        return comparison.employees.slice(0, limit);
      } catch (error) {
        console.error('Error getting top performers:', error);
        return [];
      }
    };
  }, []);

  /**
   * Get commission trends for an employee over time
   */
  const getCommissionTrends = useMemo(() => {
    return (
      data: CommissionData[],
      empId: number,
      months: number = 12
    ): Array<{ month: string; commission: number; revenue: number; transactions: number }> => {
      try {
        const trends = [];
        const now = new Date();
        
        for (let i = months - 1; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const year = date.getFullYear();
          const month = date.getMonth() + 1;
          
          const statement = generateCommissionStatement(data, empId, year, month);
          
          trends.push({
            month: `${year}-${month.toString().padStart(2, '0')}`,
            commission: statement.totalCommission,
            revenue: statement.totalRevenue,
            transactions: statement.totalTransactions
          });
        }
        
        return trends;
      } catch (error) {
        console.error('Error getting commission trends:', error);
        return [];
      }
    };
  }, []);

  return {
    calculateEmployeeCommissionSummary,
    getEmployeePaymentBreakdown,
    generateEmployeeStatement,
    calculateEmployeeEfficiency,
    compareEmployees,
    getInactiveEmployees,
    getAllEmployees,
    getMultipleEmployeeCommissions,
    getTopPerformers,
    getCommissionTrends
  };
}


