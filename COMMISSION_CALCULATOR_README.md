# Commission Calculator System

A comprehensive commission calculation and analytics system for Disbursecloud revenue data.

## Overview

This system provides powerful commission calculation functions that work with pre-calculated commission data from the `revenue_master_view` table. It includes React hooks, service functions, and UI components for comprehensive commission analytics.

## Features

### 🧮 **Core Calculation Functions**
- **Employee Commission Summary**: Calculate total commissions, revenue, and efficiency metrics
- **Payment Method Breakdown**: Analyze commissions by payment method (ACH, Check, Virtual Card, etc.)
- **Monthly Statements**: Generate detailed monthly commission statements
- **Efficiency Metrics**: Calculate commission efficiency and cost efficiency ratios
- **Employee Comparison**: Compare performance across all employees
- **Trend Analysis**: Track commission trends over time

### 📊 **Analytics Components**
- **CommissionAnalyticsTab**: Full-featured analytics dashboard
- **CommissionCalculatorExample**: Interactive examples and code samples
- **Debug Tools**: Commission mapping debugging utilities

### 🔧 **Developer Tools**
- **TypeScript Support**: Full type safety and IntelliSense
- **Error Handling**: Comprehensive error handling and validation
- **Performance Optimized**: Memoized calculations and efficient data processing
- **Extensible**: Easy to add new calculation functions

## Quick Start

### 1. Basic Usage

```typescript
import { useCommissionCalculator } from '../hooks/useCommissionCalculator';
import { useZohoData } from '../hooks/useZohoData';

function MyComponent() {
  const { data: revenueData } = useZohoData('revenue_master_view_cache');
  const { calculateEmployeeCommissionSummary } = useCommissionCalculator();
  
  // Transform data to CommissionData format
  const commissionData = revenueData?.data?.map(record => ({
    emp_id: record.emp_id,
    employee_name: record.employee_name,
    Is_Revenue_Transaction: record.Is_Revenue_Transaction,
    Gross_Revenue: parseFloat(String(record.Gross_Revenue || 0)),
    Revenue_After_Operational_Costs: parseFloat(String(record.Revenue_After_Operational_Costs || 0)),
    applied_employee_commission_percentage: parseFloat(String(record.applied_employee_commission_percentage || 0)),
    applied_employee_commission_amount: parseFloat(String(record.applied_employee_commission_amount || 0)),
    Employee_Commission: parseFloat(String(record.Employee_Commission || 0)),
    payment_method_id: record.payment_method_id,
    company_id: record.company_id,
    created_at: record.created_at,
    disbursement_updated_at: record.disbursement_updated_at
  })) || [];
  
  // Calculate Skip's commission for last 30 days
  const skipCommission = calculateEmployeeCommissionSummary(
    commissionData, 
    123, // Skip's employee ID
    '2025-01-01', // start date
    '2025-01-31'  // end date
  );
  
  return (
    <div>
      <h3>Skip's Commission Summary</h3>
      <p>Total Commission: ${skipCommission.totalCommission.toFixed(2)}</p>
      <p>Total Revenue: ${skipCommission.totalRevenue.toFixed(2)}</p>
      <p>Efficiency: {skipCommission.efficiency.toFixed(1)}%</p>
    </div>
  );
}
```

### 2. Using the Analytics Dashboard

```typescript
import CommissionAnalyticsTab from '../components/dashboard/CommissionAnalyticsTab';

function Dashboard() {
  return (
    <div>
      <CommissionAnalyticsTab />
    </div>
  );
}
```

## API Reference

### Core Functions

#### `calculateEmployeeCommission(data, empId, startDate?, endDate?)`
Calculate total commission summary for an employee.

**Parameters:**
- `data`: CommissionData[] - Array of commission records
- `empId`: number - Employee ID
- `startDate?`: string - Start date (YYYY-MM-DD)
- `endDate?`: string - End date (YYYY-MM-DD)

**Returns:** `CommissionSummary`
```typescript
{
  totalCommission: number;
  totalRevenue: number;
  totalTransactions: number;
  averageCommission: number;
  commissionRate: number;
  revenueAfterCosts: number;
  efficiency: number; // Commission as % of revenue
}
```

#### `getCommissionByPaymentMethod(data, empId, startDate?, endDate?)`
Get commission breakdown by payment method.

**Returns:** `PaymentMethodBreakdown[]`
```typescript
{
  payment_method_id: number;
  paymentMethodName: string;
  totalCommission: number;
  totalRevenue: number;
  transactionCount: number;
  averageCommission: number;
  commissionRate: number;
}[]
```

#### `generateCommissionStatement(data, empId, year, month)`
Generate monthly commission statement.

**Returns:** `MonthlyStatement`
```typescript
{
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
```

#### `calculateCommissionEfficiency(data, empId, startDate?, endDate?)`
Calculate efficiency metrics for an employee.

**Returns:** `CommissionEfficiency`
```typescript
{
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
```

#### `compareEmployeePerformance(data, startDate?, endDate?)`
Compare performance between all employees.

**Returns:** `EmployeeComparison`
```typescript
{
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
  period: { startDate: string; endDate: string };
  summary: {
    totalCommission: number;
    totalRevenue: number;
    totalTransactions: number;
    averageEfficiency: number;
  };
}
```

### React Hooks

#### `useCommissionCalculator()`
Provides memoized commission calculation functions.

**Returns:**
```typescript
{
  calculateEmployeeCommissionSummary: (data, empId, startDate?, endDate?) => CommissionSummary;
  getEmployeePaymentBreakdown: (data, empId, startDate?, endDate?) => PaymentMethodBreakdown[];
  generateEmployeeStatement: (data, empId, year, month) => MonthlyStatement;
  calculateEmployeeEfficiency: (data, empId, startDate?, endDate?) => CommissionEfficiency;
  compareEmployees: (data, startDate?, endDate?) => EmployeeComparison;
  getInactiveEmployees: (data, startDate?, endDate?) => Array<{empId, employeeName, lastTransactionDate?}>;
  getAllEmployees: (data) => Array<{empId, employeeName, transactionCount}>;
  getMultipleEmployeeCommissions: (data, empIds, startDate?, endDate?) => Array<{empId, employeeName, summary}>;
  getTopPerformers: (data, limit?, startDate?, endDate?) => Array<EmployeePerformance>;
  getCommissionTrends: (data, empId, months?) => Array<{month, commission, revenue, transactions}>;
}
```

## Data Structure

### CommissionData Interface
```typescript
interface CommissionData {
  emp_id: number;
  employee_name: string;
  Is_Revenue_Transaction: number; // 1 for revenue transactions, 0 for non-revenue
  Gross_Revenue: number;
  Revenue_After_Operational_Costs: number;
  applied_employee_commission_percentage: number;
  applied_employee_commission_amount: number;
  Employee_Commission: number; // Pre-calculated total commission
  payment_method_id: number;
  company_id: number;
  created_at: string;
  disbursement_updated_at: string;
}
```

## Business Logic

### Commission Calculation
The system works with pre-calculated commission values from the `Employee_Commission` field, but also provides analysis of the underlying calculation:

```
Employee Commission = (Revenue_After_Operational_Costs × percentage_rate) + fixed_amount
```

### Key Metrics
- **Commission Efficiency**: Commission as percentage of total revenue
- **Cost Efficiency**: Revenue after costs as percentage of gross revenue
- **Average Commission**: Total commission divided by transaction count
- **Commission Rate**: Commission as percentage of revenue after operational costs

## Examples

### 1. Calculate Skip's Commission for Q1 2025
```typescript
const skipQ1Commission = calculateEmployeeCommission(
  commissionData,
  123, // Skip's ID
  '2025-01-01',
  '2025-03-31'
);
```

### 2. Get Billy Bob's Payment Method Breakdown
```typescript
const billyBobBreakdown = getCommissionByPaymentMethod(
  commissionData,
  827 // Billy Bob's ID
);
```

### 3. Generate Roger's January Statement
```typescript
const rogerJanuaryStatement = generateCommissionStatement(
  commissionData,
  233, // Roger's ID
  2025, // year
  1     // month
);
```

### 4. Compare All Employees for 2025
```typescript
const employeeComparison = compareEmployeePerformance(
  commissionData,
  '2025-01-01',
  '2025-12-31'
);
```

### 5. Get Top 10 Performers
```typescript
const topPerformers = getTopPerformers(commissionData, 10);
```

## Error Handling

All functions include comprehensive error handling:

```typescript
try {
  const summary = calculateEmployeeCommission(data, empId, startDate, endDate);
  // Use summary...
} catch (error) {
  console.error('Commission calculation failed:', error.message);
  // Handle error...
}
```

## Performance Considerations

- **Memoization**: All hook functions are memoized for optimal performance
- **Data Filtering**: Functions filter data efficiently before calculations
- **Lazy Loading**: Components only calculate when data is available
- **Error Boundaries**: Graceful error handling prevents crashes

## Debugging

Use the debug commission mapping tool to investigate data issues:

1. Go to Data Sync section
2. Click "🔍 Debug Commission Mapping"
3. Review the detailed analysis of commission field values

## File Structure

```
src/
├── services/
│   └── commissionCalculator.ts          # Core calculation functions
├── hooks/
│   └── useCommissionCalculator.ts       # React hooks
├── components/
│   ├── dashboard/
│   │   └── CommissionAnalyticsTab.tsx   # Main analytics dashboard
│   └── examples/
│       └── CommissionCalculatorExample.tsx # Interactive examples
└── components/ui/
    └── DebugCommissionButton.tsx        # Debug utility
```

## Contributing

When adding new commission calculation functions:

1. Add the function to `commissionCalculator.ts`
2. Include proper TypeScript types
3. Add error handling and input validation
4. Update the React hook in `useCommissionCalculator.ts`
5. Add examples to `CommissionCalculatorExample.tsx`
6. Update this documentation

## Support

For issues or questions about the commission calculator system, check the debug tools first, then review the console logs for detailed error information.


