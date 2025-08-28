// Commission calculation utilities

export interface CommissionData {
  amount: number;
  rate: number;
  type: 'percentage' | 'fixed';
  tier?: {
    min: number;
    max: number;
    rate: number;
  };
}

export interface CommissionBreakdown {
  baseAmount: number;
  commissionAmount: number;
  rate: number;
  tier?: {
    min: number;
    max: number;
    rate: number;
  };
}

export interface CommissionRule {
  id: string;
  name: string;
  type: 'percentage' | 'fixed' | 'tiered';
  rate: number;
  minAmount?: number;
  maxAmount?: number;
  tiers?: Array<{
    min: number;
    max: number;
    rate: number;
  }>;
}

/**
 * Calculate commission based on amount and rate
 */
export function calculateCommission(data: CommissionData): number {
  if (data.type === 'percentage') {
    return (data.amount * data.rate) / 100;
  } else {
    return data.rate;
  }
}

/**
 * Calculate commission with detailed breakdown
 */
export function calculateCommissionBreakdown(data: CommissionData): CommissionBreakdown {
  const commissionAmount = calculateCommission(data);
  
  return {
    baseAmount: data.amount,
    commissionAmount,
    rate: data.rate,
    tier: data.tier,
  };
}

/**
 * Validate commission data
 */
export function validateCommissionData(data: CommissionData): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.amount < 0) {
    errors.push('Amount must be non-negative');
  }

  if (data.rate < 0) {
    errors.push('Rate must be non-negative');
  }

  if (data.type === 'percentage' && data.rate > 100) {
    errors.push('Percentage rate cannot exceed 100%');
  }

  if (data.tier) {
    if (data.tier.min < 0 || data.tier.max < 0) {
      errors.push('Tier min and max must be non-negative');
    }
    if (data.tier.min >= data.tier.max) {
      errors.push('Tier min must be less than max');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Format commission amount as currency
 */
export function formatCommissionAmount(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Calculate commission rate from amount and commission
 */
export function calculateCommissionRate(amount: number, commission: number): number {
  if (amount === 0) return 0;
  return (commission / amount) * 100;
}

/**
 * Apply commission rules to calculate total commission
 */
export function applyCommissionRules(amount: number, rules: CommissionRule[]): number {
  let totalCommission = 0;

  for (const rule of rules) {
    if (rule.type === 'percentage') {
      totalCommission += (amount * rule.rate) / 100;
    } else if (rule.type === 'fixed') {
      totalCommission += rule.rate;
    } else if (rule.type === 'tiered' && rule.tiers) {
      totalCommission += calculateTieredCommission(amount, rule.tiers);
    }
  }

  return totalCommission;
}

/**
 * Calculate tiered commission
 */
function calculateTieredCommission(amount: number, tiers: Array<{ min: number; max: number; rate: number }>): number {
  let commission = 0;
  let remainingAmount = amount;

  for (const tier of tiers) {
    if (remainingAmount <= 0) break;

    const tierAmount = Math.min(remainingAmount, tier.max - tier.min);
    commission += (tierAmount * tier.rate) / 100;
    remainingAmount -= tierAmount;
  }

  return commission;
}

/**
 * Calculate total commission for multiple transactions
 */
export function calculateTotalCommission(transactions: CommissionData[]): number {
  return transactions.reduce((total, transaction) => {
    return total + calculateCommission(transaction);
  }, 0);
}

/**
 * Validate commission rules
 */
export function validateCommissionRules(rules: CommissionRule[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const rule of rules) {
    if (!rule.id || !rule.name) {
      errors.push('Rule must have id and name');
    }

    if (rule.rate < 0) {
      errors.push(`Rule ${rule.id}: Rate must be non-negative`);
    }

    if (rule.type === 'percentage' && rule.rate > 100) {
      errors.push(`Rule ${rule.id}: Percentage rate cannot exceed 100%`);
    }

    if (rule.type === 'tiered' && rule.tiers) {
      for (let i = 0; i < rule.tiers.length; i++) {
        const tier = rule.tiers[i];
        if (tier.min < 0 || tier.max < 0) {
          errors.push(`Rule ${rule.id}, Tier ${i}: Min and max must be non-negative`);
        }
        if (tier.min >= tier.max) {
          errors.push(`Rule ${rule.id}, Tier ${i}: Min must be less than max`);
        }
        if (i > 0 && tier.min !== rule.tiers[i - 1].max) {
          errors.push(`Rule ${rule.id}, Tier ${i}: Tiers must be consecutive`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
