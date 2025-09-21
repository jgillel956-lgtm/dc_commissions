import React, { useState } from 'react';
import { useZohoData } from '../../hooks/useZohoData';
import { useCommissionCalculator } from '../../hooks/useCommissionCalculator';
import { CommissionCalculatorExamples } from '../../services/commissionCalculator';
import { DollarSign, TrendingUp, Users, Calendar } from 'lucide-react';

/**
 * Example component demonstrating how to use the Commission Calculator
 * This shows practical usage patterns for the commission calculation functions
 */
const CommissionCalculatorExample: React.FC = () => {
  const [selectedExample, setSelectedExample] = useState<string>('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Fetch revenue data
  const { data: revenueData, isLoading: revenueLoading } = useZohoData('revenue_master_view_cache');

  // Commission calculator hook
  const {
    calculateEmployeeCommissionSummary,
    getEmployeePaymentBreakdown,
    generateEmployeeStatement,
    compareEmployees,
    getTopPerformers
  } = useCommissionCalculator();

  // Transform data for commission calculator
  const commissionData = revenueData?.data?.map(record => ({
    emp_id: record.emp_id || 0,
    employee_name: record.employee_name || 'Unknown Employee',
    Is_Revenue_Transaction: record.Is_Revenue_Transaction || 0,
    Gross_Revenue: parseFloat(String(record.Gross_Revenue || 0)),
    Revenue_After_Operational_Costs: parseFloat(String(record.Revenue_After_Operational_Costs || 0)),
    applied_employee_commission_percentage: parseFloat(String(record.applied_employee_commission_percentage || 0)),
    applied_employee_commission_amount: parseFloat(String(record.applied_employee_commission_amount || 0)),
    Employee_Commission: parseFloat(String(record.Employee_Commission || 0)),
    payment_method_id: record.payment_method_id || 0,
    company_id: record.company_id || 0,
    created_at: record.created_at || '',
    disbursement_updated_at: record.disbursement_updated_at || ''
  })) || [];

  const runExample = async (exampleType: string) => {
    setLoading(true);
    setSelectedExample(exampleType);
    
    try {
      let result;
      
      switch (exampleType) {
        case 'skip-last-30-days':
          result = calculateEmployeeCommissionSummary(commissionData, 123); // Skip's ID
          break;
          
        case 'billy-bob-january':
          result = generateEmployeeStatement(commissionData, 827, 2025, 1); // Billy Bob's ID
          break;
          
        case 'q1-comparison':
          result = compareEmployees(commissionData, '2025-01-01', '2025-03-31');
          break;
          
        case 'roger-payment-breakdown':
          result = getEmployeePaymentBreakdown(commissionData, 233); // Roger's ID
          break;
          
        case 'top-performers':
          result = getTopPerformers(commissionData, 5);
          break;
          
        default:
          result = { error: 'Unknown example type' };
      }
      
      setResults(result);
    } catch (error) {
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const examples = [
    {
      id: 'skip-last-30-days',
      title: "Skip's Commission (Last 30 Days)",
      description: "Calculate Skip's total commission for the last 30 days",
      icon: DollarSign
    },
    {
      id: 'billy-bob-january',
      title: "Billy Bob's January Statement",
      description: "Generate Billy Bob's commission statement for January 2025",
      icon: Calendar
    },
    {
      id: 'q1-comparison',
      title: "Q1 2025 Employee Comparison",
      description: "Compare all employees' performance for Q1 2025",
      icon: Users
    },
    {
      id: 'roger-payment-breakdown',
      title: "Roger's Payment Method Breakdown",
      description: "See how Roger's commissions break down by payment method",
      icon: TrendingUp
    },
    {
      id: 'top-performers',
      title: "Top 5 Performers",
      description: "Get the top 5 performing employees by commission",
      icon: TrendingUp
    }
  ];

  if (revenueLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Commission Calculator Examples</h2>
        <p className="text-gray-600">
          Interactive examples demonstrating the commission calculation functions
        </p>
      </div>

      {/* Example Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {examples.map((example) => {
          const Icon = example.icon;
          return (
            <button
              key={example.id}
              onClick={() => runExample(example.id)}
              disabled={loading}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
            >
              <div className="flex items-center mb-2">
                <Icon className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="font-semibold text-gray-900">{example.title}</h3>
              </div>
              <p className="text-sm text-gray-600">{example.description}</p>
            </button>
          );
        })}
      </div>

      {/* Results */}
      {loading && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-gray-600">Running example...</span>
          </div>
        </div>
      )}

      {results && !loading && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Results: {examples.find(e => e.id === selectedExample)?.title}
          </h3>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="text-sm text-gray-800 overflow-auto">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Code Examples */}
      <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Code Examples</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">1. Calculate Employee Commission</h4>
            <pre className="bg-gray-50 rounded p-3 text-sm overflow-x-auto">
{`import { calculateEmployeeCommission } from '../services/commissionCalculator';

const summary = calculateEmployeeCommission(
  data, 
  123, // Skip's employee ID
  '2025-01-01', // start date
  '2025-01-31'  // end date
);

console.log('Total Commission:', summary.totalCommission);
console.log('Total Revenue:', summary.totalRevenue);
console.log('Efficiency:', summary.efficiency + '%');`}
            </pre>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">2. Payment Method Breakdown</h4>
            <pre className="bg-gray-50 rounded p-3 text-sm overflow-x-auto">
{`import { getCommissionByPaymentMethod } from '../services/commissionCalculator';

const breakdown = getCommissionByPaymentMethod(data, 827); // Billy Bob's ID

breakdown.forEach(method => {
  console.log(\`\${method.paymentMethodName}: $\${method.totalCommission}\`);
});`}
            </pre>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">3. Employee Comparison</h4>
            <pre className="bg-gray-50 rounded p-3 text-sm overflow-x-auto">
{`import { compareEmployeePerformance } from '../services/commissionCalculator';

const comparison = compareEmployeePerformance(
  data, 
  '2025-01-01', 
  '2025-03-31'
);

console.log('Top Performer:', comparison.employees[0].employeeName);
console.log('Total Commission:', comparison.summary.totalCommission);`}
            </pre>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">4. Monthly Statement</h4>
            <pre className="bg-gray-50 rounded p-3 text-sm overflow-x-auto">
{`import { generateCommissionStatement } from '../services/commissionCalculator';

const statement = generateCommissionStatement(data, 233, 2025, 1); // Roger, Jan 2025

console.log('Monthly Commission:', statement.totalCommission);
console.log('Payment Methods:', statement.breakdown.length);
console.log('Top Company:', statement.topCompanies[0]?.company_name);`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommissionCalculatorExample;
