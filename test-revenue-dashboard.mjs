import axios from 'axios';

// Test configuration
const API_BASE_URL = 'https://dc-commissions.vercel.app'; // Vercel deployment URL
const TEST_ENDPOINT = `${API_BASE_URL}/api/revenue-dashboard`;

// Test data
const testCases = [
  {
    name: 'Basic Query - Last 30 Days',
    payload: {
      filters: {
        date_range: { type: 'last_30_days' }
      },
      page: 1,
      page_size: 10
    }
  },
  {
    name: 'Company Filter Test',
    payload: {
      filters: {
        date_range: { type: 'last_90_days' },
        companies: { selected_companies: [1, 2] }
      },
      page: 1,
      page_size: 5
    }
  },
  {
    name: 'Payment Method Filter Test',
    payload: {
      filters: {
        date_range: { type: 'last_30_days' },
        payment_methods: { selected_methods: [1, 2, 3] }
      },
      page: 1,
      page_size: 10
    }
  },
  {
    name: 'Amount Range Filter Test',
    payload: {
      filters: {
        date_range: { type: 'last_30_days' },
        amount_range: { min_amount: 1000, max_amount: 10000 }
      },
      page: 1,
      page_size: 10
    }
  },
  {
    name: 'Complex Filter Test',
    payload: {
      filters: {
        date_range: { type: 'last_30_days' },
        companies: { selected_companies: [1] },
        payment_methods: { selected_methods: [1, 2] },
        amount_range: { min_amount: 500 }
      },
      page: 1,
      page_size: 5,
      sort_field: 'Gross_Revenue',
      sort_order: 'desc'
    }
  }
];

async function testEndpoint(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log('📤 Request payload:', JSON.stringify(testCase.payload, null, 2));
  
  try {
    const startTime = Date.now();
    const response = await axios.post(TEST_ENDPOINT, testCase.payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Success! Response time: ${duration}ms`);
    console.log(`📊 Status: ${response.status}`);
    
    // Validate response structure
    const data = response.data;
    console.log(`📈 Data records: ${data.data?.length || 0}`);
    console.log(`📊 Total count: ${data.total_count || 0}`);
    console.log(`📄 Page: ${data.page || 'N/A'}`);
    console.log(`📄 Page size: ${data.page_size || 'N/A'}`);
    console.log(`📄 Total pages: ${data.total_pages || 'N/A'}`);
    
    // Check KPIs
    if (data.kpis) {
      console.log('🎯 KPIs found:');
      Object.keys(data.kpis).forEach(kpiKey => {
        const kpi = data.kpis[kpiKey];
        console.log(`  - ${kpi.title}: ${kpi.value} (${kpi.format})`);
      });
    }
    
    // Check charts
    if (data.charts) {
      console.log('📊 Charts found:');
      Object.keys(data.charts).forEach(chartKey => {
        const chartData = data.charts[chartKey];
        console.log(`  - ${chartKey}: ${chartData?.length || 0} data points`);
      });
    }
    
    // Show sample data if available
    if (data.data && data.data.length > 0) {
      console.log('📋 Sample record structure:');
      const sample = data.data[0];
      console.log(`  - ID: ${sample.id}`);
      console.log(`  - Company: ${sample.company || 'N/A'}`);
      console.log(`  - Payment Method: ${sample.payment_method_description || 'N/A'}`);
      console.log(`  - Gross Revenue: ${sample.Gross_Revenue || 0}`);
      console.log(`  - Employee Commission: ${sample.Employee_Commission || 0}`);
      console.log(`  - Final Net Profit: ${sample.Final_Net_Profit || 0}`);
    }
    
    return { success: true, duration, data };
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    
    if (error.response) {
      console.log(`📊 Status: ${error.response.status}`);
      console.log(`📄 Response:`, error.response.data);
    }
    
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('🚀 Starting Revenue Dashboard API Tests');
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await testEndpoint(testCase);
    results.push({
      name: testCase.name,
      ...result
    });
    
    // Add delay between tests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('=' .repeat(60));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const avgDuration = results
    .filter(r => r.success && r.duration)
    .reduce((sum, r) => sum + r.duration, 0) / successful || 0;
  
  console.log(`✅ Successful tests: ${successful}/${results.length}`);
  console.log(`❌ Failed tests: ${failed}/${results.length}`);
  console.log(`⏱️ Average response time: ${Math.round(avgDuration)}ms`);
  
  if (failed > 0) {
    console.log('\n❌ Failed test details:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`  - ${result.name}: ${result.error}`);
    });
  }
  
  console.log('\n🎉 Test run completed!');
}

// Health check function
async function healthCheck() {
  console.log('🏥 Performing health check...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/api/zoho-analytics?health=1`);
    console.log('✅ Health check passed:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 Revenue Dashboard API Test Suite');
  console.log('=====================================');
  console.log('🚀 Testing against Vercel deployment...\n');
  
  // Skip health check for Vercel deployment and go straight to tests
  await runAllTests();
}

// Run the tests
main().catch(console.error);
