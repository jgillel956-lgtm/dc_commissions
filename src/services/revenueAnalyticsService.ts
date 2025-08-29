import { 
  RevenueAnalyticsRecord, 
  RevenueAnalyticsResponse, 
  RevenueAnalyticsQueryParams,
  RevenueAnalyticsSummary,
  RevenueChartData,
  EmployeeCommissionData,
  CompanyRevenueData,
  PaymentMethodRevenueData
} from '../types/revenueAnalytics';

export class RevenueAnalyticsService {
  private static instance: RevenueAnalyticsService;
  
  private constructor() {}
  
  public static getInstance(): RevenueAnalyticsService {
    if (!RevenueAnalyticsService.instance) {
      RevenueAnalyticsService.instance = new RevenueAnalyticsService();
    }
    return RevenueAnalyticsService.instance;
  }

  /**
   * Execute the complex revenue analytics query via serverless API
   */
  async executeRevenueAnalyticsQuery(params: RevenueAnalyticsQueryParams = {}): Promise<RevenueAnalyticsResponse> {
    try {
      console.log('🚀 Executing complex revenue analytics query via API...');
      
      // Call our serverless API route
      const response = await fetch('/api/revenue-analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filters: params.filters || {},
          page: params.page || 1,
          limit: params.limit || 50
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log('✅ Revenue analytics query completed successfully');
      return result;
      
    } catch (error) {
      console.error('❌ Error executing revenue analytics query:', error);
      throw new Error(`Failed to execute revenue analytics query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }



  /**
   * Get chart data for revenue trends
   */
  async getRevenueChartData(params: RevenueAnalyticsQueryParams = {}): Promise<RevenueChartData[]> {
    const response = await this.executeRevenueAnalyticsQuery(params);
    
    // Group by date and aggregate
    const groupedData = response.data.reduce((acc: any, record) => {
      const date = new Date(record.created_at).toISOString().split('T')[0];
      
      if (!acc[date]) {
        acc[date] = {
          date,
          revenue: 0,
          commissions: 0,
          costs: 0,
          profit: 0
        };
      }
      
      acc[date].revenue += record.Gross_Revenue;
      acc[date].commissions += record.Total_Employee_Commission + record.Total_Referral_Partner_Commission;
      acc[date].costs += record.Total_Vendor_Cost + record.Total_Company_Upcharge_Fees;
      acc[date].profit += record.Net_Profit;
      
      return acc;
    }, {});
    
    return Object.values(groupedData).sort((a: any, b: any) => a.date.localeCompare(b.date)) as RevenueChartData[];
  }

  /**
   * Get employee commission data
   */
  async getEmployeeCommissionData(params: RevenueAnalyticsQueryParams = {}): Promise<EmployeeCommissionData[]> {
    const response = await this.executeRevenueAnalyticsQuery(params);
    
    // Group by employee and aggregate
    const groupedData = response.data.reduce((acc: any, record) => {
      const employeeName = record.employee_name || 'Unknown Employee';
      
      if (!acc[employeeName]) {
        acc[employeeName] = {
          employee_name: employeeName,
          total_commission: 0,
          transaction_count: 0,
          average_commission: 0
        };
      }
      
      acc[employeeName].total_commission += record.Total_Employee_Commission;
      acc[employeeName].transaction_count++;
      
      return acc;
    }, {});
    
    // Calculate averages
    Object.values(groupedData).forEach((employee: any) => {
      employee.average_commission = employee.transaction_count > 0 
        ? employee.total_commission / employee.transaction_count 
        : 0;
    });
    
    return Object.values(groupedData).sort((a: any, b: any) => b.total_commission - a.total_commission) as EmployeeCommissionData[];
  }

  /**
   * Get company revenue data
   */
  async getCompanyRevenueData(params: RevenueAnalyticsQueryParams = {}): Promise<CompanyRevenueData[]> {
    const response = await this.executeRevenueAnalyticsQuery(params);
    
    // Group by company and aggregate
    const groupedData = response.data.reduce((acc: any, record) => {
      const company = record.company || 'Unknown Company';
      
      if (!acc[company]) {
        acc[company] = {
          company,
          total_revenue: 0,
          total_profit: 0,
          transaction_count: 0
        };
      }
      
      acc[company].total_revenue += record.Gross_Revenue;
      acc[company].total_profit += record.Net_Profit;
      acc[company].transaction_count++;
      
      return acc;
    }, {});
    
    return Object.values(groupedData).sort((a: any, b: any) => b.total_revenue - a.total_revenue) as CompanyRevenueData[];
  }

  /**
   * Get payment method revenue data
   */
  async getPaymentMethodRevenueData(params: RevenueAnalyticsQueryParams = {}): Promise<PaymentMethodRevenueData[]> {
    const response = await this.executeRevenueAnalyticsQuery(params);
    
    // Group by payment method and aggregate
    const groupedData = response.data.reduce((acc: any, record) => {
      const paymentMethod = record.payment_method_description || 'Unknown Method';
      
      if (!acc[paymentMethod]) {
        acc[paymentMethod] = {
          payment_method: paymentMethod,
          total_revenue: 0,
          transaction_count: 0,
          average_revenue: 0
        };
      }
      
      acc[paymentMethod].total_revenue += record.Gross_Revenue;
      acc[paymentMethod].transaction_count++;
      
      return acc;
    }, {});
    
    // Calculate averages
    Object.values(groupedData).forEach((method: any) => {
      method.average_revenue = method.transaction_count > 0 
        ? method.total_revenue / method.transaction_count 
        : 0;
    });
    
    return Object.values(groupedData).sort((a: any, b: any) => b.total_revenue - a.total_revenue) as PaymentMethodRevenueData[];
  }
}

// Export singleton instance
export const revenueAnalyticsService = RevenueAnalyticsService.getInstance();
