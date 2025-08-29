// Commission calculation utilities

export interface CommissionData {
  amount: number;
  commissionRate: number;
  employeeId: string;
  companyId: string;
}

export interface CommissionBreakdown {
  commission: number;
  percentage: number;
  baseAmount: number;
}

export interface CommissionRule {
  minAmount: number;
  maxAmount: number;
  rate: number;
}

export interface EmployeeBreakdown {
  commission: number;
  amount: number;
  transactions: number;
}

export interface CompanyBreakdown {
  commission: number;
  amount: number;
  transactions: number;
}

export interface CommissionBreakdownResult {
  totalCommission: number;
  totalAmount: number;
  employeeBreakdown: Record<string, EmployeeBreakdown>;
  companyBreakdown: Record<string, CompanyBreakdown>;
}

export interface TotalCommissionResult {
  totalCommission: number;
  totalAmount: number;
  averageRate: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Calculate commission for a single transaction
 */
export function calculateCommission(transaction: CommissionData): CommissionBreakdown {
  const commission = Math.round((transaction.amount * transaction.commissionRate) * 100) / 100;
  const percentage = transaction.commissionRate * 100;
  
  return {
    commission,
    percentage,
    baseAmount: transaction.amount
  };
}

/**
 * Calculate commission breakdown for multiple transactions
 */
export function calculateCommissionBreakdown(transactions: CommissionData[]): CommissionBreakdownResult {
  const result: CommissionBreakdownResult = {
    totalCommission: 0,
    totalAmount: 0,
    employeeBreakdown: {},
    companyBreakdown: {}
  };

  for (const transaction of transactions) {
    const breakdown = calculateCommission(transaction);
    
    result.totalCommission += breakdown.commission;
    result.totalAmount += transaction.amount;
    
    // Employee breakdown
    if (!result.employeeBreakdown[transaction.employeeId]) {
      result.employeeBreakdown[transaction.employeeId] = {
        commission: 0,
        amount: 0,
        transactions: 0
      };
    }
    result.employeeBreakdown[transaction.employeeId].commission += breakdown.commission;
    result.employeeBreakdown[transaction.employeeId].amount += transaction.amount;
    result.employeeBreakdown[transaction.employeeId].transactions += 1;
    
    // Company breakdown
    if (!result.companyBreakdown[transaction.companyId]) {
      result.companyBreakdown[transaction.companyId] = {
        commission: 0,
        amount: 0,
        transactions: 0
      };
    }
    result.companyBreakdown[transaction.companyId].commission += breakdown.commission;
    result.companyBreakdown[transaction.companyId].amount += transaction.amount;
    result.companyBreakdown[transaction.companyId].transactions += 1;
  }

  return result;
}

/**
 * Validate commission data
 */
export function validateCommissionData(commissionData: Partial<CommissionData>): ValidationResult {
  const errors: string[] = [];

  if (typeof commissionData.amount !== 'number' || commissionData.amount < 0) {
    errors.push('amount must be a positive number');
  }

  if (typeof commissionData.commissionRate !== 'number' || commissionData.commissionRate < 0 || commissionData.commissionRate > 1) {
    errors.push('commissionRate must be between 0 and 1');
  }

  if (typeof commissionData.employeeId !== 'string' || commissionData.employeeId === undefined || commissionData.employeeId === null) {
    errors.push('employeeId is required');
  } else if (commissionData.employeeId.trim() === '') {
    errors.push('employeeId cannot be empty');
  }

  if (typeof commissionData.companyId !== 'string' || commissionData.companyId === undefined || commissionData.companyId === null) {
    errors.push('companyId is required');
  } else if (commissionData.companyId.trim() === '') {
    errors.push('companyId cannot be empty');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Format commission amount as currency
 */
export function formatCommissionAmount(amount: number): string {
  // Handle negative zero case
  if (amount === 0) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.round(amount * 100) / 100);
}

/**
 * Calculate commission rate from amount and commission
 */
export function calculateCommissionRate(amount: number, commission: number): number {
  if (amount === 0) return 0;
  return commission / amount;
}

/**
 * Apply commission rules to determine rate
 */
export function applyCommissionRules(amount: number, rules: CommissionRule[]): number {
  if (rules.length === 0) return 0;
  
  // Sort rules by minAmount to ensure proper order
  const sortedRules = [...rules].sort((a, b) => a.minAmount - b.minAmount);
  
  for (const rule of sortedRules) {
    // For all rules except the last one, use [minAmount, maxAmount)
    // For the last rule, use [minAmount, maxAmount]
    const isLastRule = rule === sortedRules[sortedRules.length - 1];
    const maxCondition = isLastRule ? amount <= rule.maxAmount : amount < rule.maxAmount;
    
    if (amount >= rule.minAmount && maxCondition) {
      return rule.rate;
    }
  }
  
  return 0;
}

/**
 * Calculate total commission from array of transactions
 */
export function calculateTotalCommission(transactions: Array<{ amount: number; commissionRate: number }>): TotalCommissionResult {
  if (transactions.length === 0) {
    return {
      totalCommission: 0,
      totalAmount: 0,
      averageRate: 0
    };
  }

  let totalCommission = 0;
  let totalAmount = 0;

  for (const transaction of transactions) {
    const commission = transaction.amount * transaction.commissionRate;
    totalCommission += commission;
    totalAmount += transaction.amount;
  }

  const averageRate = totalAmount > 0 ? totalCommission / totalAmount : 0;

  return {
    totalCommission: Math.round(totalCommission * 100) / 100,
    totalAmount,
    averageRate: Math.round(averageRate * 10000) / 10000
  };
}

/**
 * Validate commission rules
 */
export function validateCommissionRules(rules: CommissionRule[]): ValidationResult {
  const errors: string[] = [];

  if (rules.length === 0) {
    errors.push('At least one rule is required');
    return { isValid: false, errors };
  }

  // Check each rule structure
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    
    if (typeof rule.minAmount !== 'number' || typeof rule.maxAmount !== 'number' || typeof rule.rate !== 'number') {
      errors.push('Each rule must have minAmount, maxAmount, and rate');
      break;
    }
    
    if (rule.rate < 0 || rule.rate > 1) {
      errors.push('Rate must be between 0 and 1');
    }
    
    if (rule.minAmount < 0 || rule.maxAmount < 0) {
      errors.push('Amounts must be non-negative');
    }
    
    if (rule.minAmount >= rule.maxAmount) {
      errors.push('maxAmount must be greater than minAmount');
    }
  }

  // Check for gaps and overlaps
  const sortedRules = [...rules].sort((a, b) => a.minAmount - b.minAmount);
  
  for (let i = 0; i < sortedRules.length - 1; i++) {
    const currentRule = sortedRules[i];
    const nextRule = sortedRules[i + 1];
    
    if (currentRule.maxAmount !== nextRule.minAmount) {
      errors.push('Rules must cover all amounts without gaps');
    }
    
    if (currentRule.maxAmount > nextRule.minAmount) {
      errors.push('Rules cannot overlap');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

