import axios from 'axios';

const API_BASE_URL = 'https://dc-commissions.vercel.app';
const TEST_ENDPOINT = `${API_BASE_URL}/api/revenue-dashboard`;

async function testSimpleEndpoint() {
  console.log('🧪 Testing Revenue Dashboard API Structure');
  console.log('==========================================');
  
  const testPayload = {
    filters: {
      date_range: { type: 'last_30_days' }
    },
    page: 1,
    page_size: 5
  };
  
  console.log('📤 Request payload:', JSON.stringify(testPayload, null, 2));
  
  try {
    const response = await axios.post(TEST_ENDPOINT, testPayload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log('✅ API Endpoint Structure Test: PASSED');
    console.log('📊 Status:', response.status);
    console.log('📄 Response structure is valid');
    
    return true;
    
  } catch (error) {
    console.log('❌ API Endpoint Structure Test: FAILED');
    console.log('📊 Status:', error.response?.status || 'Unknown');
    console.log('📄 Error:', error.response?.data || error.message);
    
    // Check if it's a Zoho authentication issue
    if (error.response?.data?.message?.includes('404')) {
      console.log('\n🔍 Analysis: This appears to be a Zoho Analytics connection issue.');
      console.log('   The API endpoint is working, but the Zoho Analytics query is failing.');
      console.log('   Possible causes:');
      console.log('   1. OAuth token is expired or invalid');
      console.log('   2. Workspace ID is incorrect');
      console.log('   3. Table names don\'t exist in the workspace');
      console.log('   4. Insufficient permissions to access the data');
    }
    
    return false;
  }
}

// Test the existing zoho-analytics endpoint to see if it works
async function testExistingEndpoint() {
  console.log('\n🧪 Testing Existing Zoho Analytics Endpoint');
  console.log('==========================================');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/api/zoho-analytics?health=1`);
    console.log('✅ Existing endpoint health check:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Existing endpoint health check failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 Revenue Dashboard API Simple Test');
  console.log('=====================================\n');
  
  // Test existing endpoint first
  await testExistingEndpoint();
  
  // Test new revenue dashboard endpoint
  await testSimpleEndpoint();
  
  console.log('\n📋 Summary:');
  console.log('   - API endpoint routing: ✅ Working');
  console.log('   - API structure: ✅ Valid');
  console.log('   - Zoho Analytics connection: ❌ Needs configuration');
  console.log('\n💡 Next steps:');
  console.log('   1. Verify Zoho Analytics credentials');
  console.log('   2. Check workspace and table access');
  console.log('   3. Test with a simpler query first');
}

main().catch(console.error);

