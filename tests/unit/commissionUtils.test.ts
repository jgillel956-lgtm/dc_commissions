import {
  calculateCommission,
  calculateCommissionBreakdown,
  validateCommissionData,
  formatCommissionAmount,
  calculateCommissionRate,
  applyCommissionRules,
  calculateTotalCommission,
  validateCommissionRules
} from '../../src/utils/commissionUtils';

describe('commissionUtils', () => {
  describe('calculateCommission', () => {
    it('should calculate basic commission correctly', () => {
      const transaction = {
        amount: 1000,
        commissionRate: 0.05,
        employeeId: 'emp1',
        companyId: 'comp1'
      };

      const result = calculateCommission(transaction);

      expect(result.commission).toBe(50);
      expect(result.percentage).toBe(5);
      expect(result.baseAmount).toBe(1000);
    });

    it('should handle zero amount', () => {
      const transaction = {
        amount: 0,
        commissionRate: 0.05,
        employeeId: 'emp1',
        companyId: 'comp1'
      };

      const result = calculateCommission(transaction);

      expect(result.commission).toBe(0);
      expect(result.percentage).toBe(5);
      expect(result.baseAmount).toBe(0);
    });

    it('should handle zero commission rate', () => {
      const transaction = {
        amount: 1000,
        commissionRate: 0,
        employeeId: 'emp1',
        companyId: 'comp1'
      };

      const result = calculateCommission(transaction);

      expect(result.commission).toBe(0);
      expect(result.percentage).toBe(0);
      expect(result.baseAmount).toBe(1000);
    });

    it('should handle negative amounts', () => {
      const transaction = {
        amount: -500,
        commissionRate: 0.05,
        employeeId: 'emp1',
        companyId: 'comp1'
      };

      const result = calculateCommission(transaction);

      expect(result.commission).toBe(-25);
      expect(result.percentage).toBe(5);
      expect(result.baseAmount).toBe(-500);
    });

    it('should handle high commission rates', () => {
      const transaction = {
        amount: 1000,
        commissionRate: 0.25,
        employeeId: 'emp1',
        companyId: 'comp1'
      };

      const result = calculateCommission(transaction);

      expect(result.commission).toBe(250);
      expect(result.percentage).toBe(25);
      expect(result.baseAmount).toBe(1000);
    });

    it('should handle decimal precision correctly', () => {
      const transaction = {
        amount: 1000.50,
        commissionRate: 0.075,
        employeeId: 'emp1',
        companyId: 'comp1'
      };

      const result = calculateCommission(transaction);

      expect(result.commission).toBe(75.04); // Rounded to 2 decimal places
      expect(result.percentage).toBe(7.5);
      expect(result.baseAmount).toBe(1000.50);
    });
  });

  describe('calculateCommissionBreakdown', () => {
    it('should calculate commission breakdown for multiple employees', () => {
      const transactions = [
        { amount: 1000, commissionRate: 0.05, employeeId: 'emp1', companyId: 'comp1' },
        { amount: 2000, commissionRate: 0.06, employeeId: 'emp2', companyId: 'comp1' },
        { amount: 1500, commissionRate: 0.05, employeeId: 'emp1', companyId: 'comp1' }
      ];

      const result = calculateCommissionBreakdown(transactions);

      expect(result.totalCommission).toBe(245); // 50 + 120 + 75
      expect(result.totalAmount).toBe(4500);
      expect(result.employeeBreakdown).toEqual({
        emp1: { commission: 125, amount: 2500, transactions: 2 },
        emp2: { commission: 120, amount: 2000, transactions: 1 }
      });
      expect(result.companyBreakdown).toEqual({
        comp1: { commission: 245, amount: 4500, transactions: 3 }
      });
    });

    it('should handle empty transaction array', () => {
      const transactions: any[] = [];

      const result = calculateCommissionBreakdown(transactions);

      expect(result.totalCommission).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(result.employeeBreakdown).toEqual({});
      expect(result.companyBreakdown).toEqual({});
    });

    it('should handle single transaction', () => {
      const transactions = [
        { amount: 1000, commissionRate: 0.05, employeeId: 'emp1', companyId: 'comp1' }
      ];

      const result = calculateCommissionBreakdown(transactions);

      expect(result.totalCommission).toBe(50);
      expect(result.totalAmount).toBe(1000);
      expect(result.employeeBreakdown).toEqual({
        emp1: { commission: 50, amount: 1000, transactions: 1 }
      });
      expect(result.companyBreakdown).toEqual({
        comp1: { commission: 50, amount: 1000, transactions: 1 }
      });
    });

    it('should handle multiple companies', () => {
      const transactions = [
        { amount: 1000, commissionRate: 0.05, employeeId: 'emp1', companyId: 'comp1' },
        { amount: 2000, commissionRate: 0.06, employeeId: 'emp2', companyId: 'comp2' }
      ];

      const result = calculateCommissionBreakdown(transactions);

      expect(result.totalCommission).toBe(170);
      expect(result.totalAmount).toBe(3000);
      expect(result.companyBreakdown).toEqual({
        comp1: { commission: 50, amount: 1000, transactions: 1 },
        comp2: { commission: 120, amount: 2000, transactions: 1 }
      });
    });
  });

  describe('validateCommissionData', () => {
    it('should validate correct commission data', () => {
      const commissionData = {
        amount: 1000,
        commissionRate: 0.05,
        employeeId: 'emp1',
        companyId: 'comp1'
      };

      const result = validateCommissionData(commissionData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect missing required fields', () => {
      const commissionData = {
        amount: 1000,
        commissionRate: 0.05
        // Missing employeeId and companyId
      };

      const result = validateCommissionData(commissionData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('employeeId is required');
      expect(result.errors).toContain('companyId is required');
    });

    it('should validate amount is a positive number', () => {
      const commissionData = {
        amount: -1000,
        commissionRate: 0.05,
        employeeId: 'emp1',
        companyId: 'comp1'
      };

      const result = validateCommissionData(commissionData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('amount must be a positive number');
    });

    it('should validate commission rate is between 0 and 1', () => {
      const commissionData = {
        amount: 1000,
        commissionRate: 1.5,
        employeeId: 'emp1',
        companyId: 'comp1'
      };

      const result = validateCommissionData(commissionData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('commissionRate must be between 0 and 1');
    });

    it('should validate commission rate is not negative', () => {
      const commissionData = {
        amount: 1000,
        commissionRate: -0.05,
        employeeId: 'emp1',
        companyId: 'comp1'
      };

      const result = validateCommissionData(commissionData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('commissionRate must be between 0 and 1');
    });

    it('should validate employeeId is not empty', () => {
      const commissionData = {
        amount: 1000,
        commissionRate: 0.05,
        employeeId: '',
        companyId: 'comp1'
      };

      const result = validateCommissionData(commissionData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('employeeId cannot be empty');
    });

    it('should validate companyId is not empty', () => {
      const commissionData = {
        amount: 1000,
        commissionRate: 0.05,
        employeeId: 'emp1',
        companyId: ''
      };

      const result = validateCommissionData(commissionData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('companyId cannot be empty');
    });

    it('should handle multiple validation errors', () => {
      const commissionData = {
        amount: -1000,
        commissionRate: 1.5,
        employeeId: '',
        companyId: ''
      };

      const result = validateCommissionData(commissionData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('formatCommissionAmount', () => {
    it('should format commission amount as currency', () => {
      expect(formatCommissionAmount(1234.56)).toBe('$1,234.56');
      expect(formatCommissionAmount(0)).toBe('$0.00');
      expect(formatCommissionAmount(1000000)).toBe('$1,000,000.00');
    });

    it('should handle negative amounts', () => {
      expect(formatCommissionAmount(-1234.56)).toBe('-$1,234.56');
      expect(formatCommissionAmount(-0)).toBe('$0.00');
    });

    it('should handle decimal precision', () => {
      expect(formatCommissionAmount(1234.567)).toBe('$1,234.57'); // Rounded
      expect(formatCommissionAmount(1234.561)).toBe('$1,234.56'); // Rounded
    });

    it('should handle very large numbers', () => {
      expect(formatCommissionAmount(999999999.99)).toBe('$999,999,999.99');
    });

    it('should handle very small numbers', () => {
      expect(formatCommissionAmount(0.01)).toBe('$0.01');
      expect(formatCommissionAmount(0.001)).toBe('$0.00'); // Rounded down
    });
  });

  describe('calculateCommissionRate', () => {
    it('should calculate commission rate from amount and commission', () => {
      expect(calculateCommissionRate(1000, 50)).toBe(0.05);
      expect(calculateCommissionRate(2000, 100)).toBe(0.05);
      expect(calculateCommissionRate(1000, 0)).toBe(0);
    });

    it('should handle zero amount', () => {
      expect(calculateCommissionRate(0, 50)).toBe(0);
    });

    it('should handle decimal precision', () => {
      expect(calculateCommissionRate(1000, 75.5)).toBe(0.0755);
      expect(calculateCommissionRate(1000, 33.33)).toBe(0.03333);
    });

    it('should handle very small amounts', () => {
      expect(calculateCommissionRate(1, 0.05)).toBe(0.05);
    });

    it('should handle commission greater than amount', () => {
      expect(calculateCommissionRate(100, 150)).toBe(1.5);
    });
  });

  describe('applyCommissionRules', () => {
    it('should apply tiered commission rules', () => {
      const rules = [
        { minAmount: 0, maxAmount: 1000, rate: 0.05 },
        { minAmount: 1000, maxAmount: 5000, rate: 0.06 },
        { minAmount: 5000, maxAmount: Infinity, rate: 0.07 }
      ];

      expect(applyCommissionRules(500, rules)).toBe(0.05);
      expect(applyCommissionRules(1500, rules)).toBe(0.06);
      expect(applyCommissionRules(7500, rules)).toBe(0.07);
    });

    it('should handle amount at boundary', () => {
      const rules = [
        { minAmount: 0, maxAmount: 1000, rate: 0.05 },
        { minAmount: 1000, maxAmount: 5000, rate: 0.06 }
      ];

      expect(applyCommissionRules(1000, rules)).toBe(0.06);
    });

    it('should handle amount below minimum', () => {
      const rules = [
        { minAmount: 100, maxAmount: 1000, rate: 0.05 }
      ];

      expect(applyCommissionRules(50, rules)).toBe(0);
    });

    it('should handle empty rules array', () => {
      const rules: any[] = [];

      expect(applyCommissionRules(1000, rules)).toBe(0);
    });

    it('should handle overlapping rules', () => {
      const rules = [
        { minAmount: 0, maxAmount: 2000, rate: 0.05 },
        { minAmount: 1000, maxAmount: 5000, rate: 0.06 }
      ];

      // Should use the first matching rule
      expect(applyCommissionRules(1500, rules)).toBe(0.05);
    });
  });

  describe('calculateTotalCommission', () => {
    it('should calculate total commission from array of transactions', () => {
      const transactions = [
        { amount: 1000, commissionRate: 0.05 },
        { amount: 2000, commissionRate: 0.06 },
        { amount: 1500, commissionRate: 0.05 }
      ];

      const result = calculateTotalCommission(transactions);

      expect(result.totalCommission).toBe(245);
      expect(result.totalAmount).toBe(4500);
      expect(result.averageRate).toBeCloseTo(0.0544, 4);
    });

    it('should handle empty array', () => {
      const transactions: any[] = [];

      const result = calculateTotalCommission(transactions);

      expect(result.totalCommission).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(result.averageRate).toBe(0);
    });

    it('should handle single transaction', () => {
      const transactions = [
        { amount: 1000, commissionRate: 0.05 }
      ];

      const result = calculateTotalCommission(transactions);

      expect(result.totalCommission).toBe(50);
      expect(result.totalAmount).toBe(1000);
      expect(result.averageRate).toBe(0.05);
    });

    it('should handle zero commission rates', () => {
      const transactions = [
        { amount: 1000, commissionRate: 0 },
        { amount: 2000, commissionRate: 0.05 }
      ];

      const result = calculateTotalCommission(transactions);

      expect(result.totalCommission).toBe(100);
      expect(result.totalAmount).toBe(3000);
      expect(result.averageRate).toBeCloseTo(0.0333, 4);
    });
  });

  describe('validateCommissionRules', () => {
    it('should validate correct commission rules', () => {
      const rules = [
        { minAmount: 0, maxAmount: 1000, rate: 0.05 },
        { minAmount: 1000, maxAmount: 5000, rate: 0.06 }
      ];

      const result = validateCommissionRules(rules);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect invalid rate values', () => {
      const rules = [
        { minAmount: 0, maxAmount: 1000, rate: 1.5 }
      ];

      const result = validateCommissionRules(rules);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Rate must be between 0 and 1');
    });

    it('should detect negative amounts', () => {
      const rules = [
        { minAmount: -100, maxAmount: 1000, rate: 0.05 }
      ];

      const result = validateCommissionRules(rules);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Amounts must be non-negative');
    });

    it('should detect invalid amount ranges', () => {
      const rules = [
        { minAmount: 1000, maxAmount: 500, rate: 0.05 }
      ];

      const result = validateCommissionRules(rules);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('maxAmount must be greater than minAmount');
    });

    it('should detect gaps in rules', () => {
      const rules = [
        { minAmount: 0, maxAmount: 1000, rate: 0.05 },
        { minAmount: 2000, maxAmount: 5000, rate: 0.06 }
      ];

      const result = validateCommissionRules(rules);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Rules must cover all amounts without gaps');
    });

    it('should detect overlapping rules', () => {
      const rules = [
        { minAmount: 0, maxAmount: 2000, rate: 0.05 },
        { minAmount: 1000, maxAmount: 5000, rate: 0.06 }
      ];

      const result = validateCommissionRules(rules);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Rules cannot overlap');
    });

    it('should handle empty rules array', () => {
      const rules: any[] = [];

      const result = validateCommissionRules(rules);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one rule is required');
    });

    it('should validate rule structure', () => {
      const rules = [
        { minAmount: 0, rate: 0.05 } // Missing maxAmount
      ];

      const result = validateCommissionRules(rules);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Each rule must have minAmount, maxAmount, and rate');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined values', () => {
      expect(() => calculateCommission(null as any)).toThrow();
      expect(() => calculateCommission(undefined as any)).toThrow();
    });

    it('should handle invalid data types', () => {
      const invalidTransaction = {
        amount: 'invalid',
        commissionRate: 'invalid',
        employeeId: 123,
        companyId: 456
      };

      const result = validateCommissionData(invalidTransaction as any);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle extremely large numbers', () => {
      const transaction = {
        amount: Number.MAX_SAFE_INTEGER,
        commissionRate: 0.01,
        employeeId: 'emp1',
        companyId: 'comp1'
      };

      const result = calculateCommission(transaction);

      expect(result.commission).toBeGreaterThan(0);
      expect(result.commission).toBeLessThan(Infinity);
    });

    it('should handle floating point precision issues', () => {
      const transaction = {
        amount: 0.1 + 0.2, // Results in 0.30000000000000004
        commissionRate: 0.1,
        employeeId: 'emp1',
        companyId: 'comp1'
      };

      const result = calculateCommission(transaction);

      expect(result.commission).toBeCloseTo(0.03, 2);
    });

    it('should handle special characters in IDs', () => {
      const transaction = {
        amount: 1000,
        commissionRate: 0.05,
        employeeId: 'emp-1@company.com',
        companyId: 'comp_123'
      };

      const result = validateCommissionData(transaction);

      expect(result.isValid).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large transaction arrays efficiently', () => {
      const transactions = Array.from({ length: 10000 }, (_, i) => ({
        amount: 1000 + i,
        commissionRate: 0.05,
        employeeId: `emp${i % 100}`,
        companyId: `comp${i % 10}`
      }));

      const startTime = performance.now();
      const result = calculateCommissionBreakdown(transactions);
      const endTime = performance.now();

      expect(result.totalCommission).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle complex commission rules efficiently', () => {
      const rules = Array.from({ length: 100 }, (_, i) => ({
        minAmount: i * 1000,
        maxAmount: (i + 1) * 1000,
        rate: 0.05 + (i * 0.001)
      }));

      const startTime = performance.now();
      const result = applyCommissionRules(50000, rules);
      const endTime = performance.now();

      expect(result).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });
  });
});
