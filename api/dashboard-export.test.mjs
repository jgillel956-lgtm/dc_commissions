import { exportHandler, downloadHandler, healthHandler } from './dashboard-export.mjs';

// Mock request and response objects for testing
const createMockRequest = (method, body = {}, headers = {}, params = {}, query = {}) => ({
  method,
  body,
  headers,
  params,
  query
});

const createMockResponse = () => {
  const res = {
    status: (code) => {
      res.statusCode = code;
      return res;
    },
    json: (data) => {
      res.data = data;
      return res;
    },
    setHeader: (name, value) => {
      if (!res.headers) res.headers = {};
      res.headers[name] = value;
      return res;
    },
    pipe: (stream) => {
      res.piped = true;
      return res;
    }
  };
  return res;
};

// Test cases
async function runTests() {
  console.log('🧪 Testing Dashboard Export API...\n');
  
  let testCount = 0;
  let passedTests = 0;
  
  const assert = (condition, testName) => {
    testCount++;
    if (condition) {
      console.log(`✅ ${testName}`);
      passedTests++;
    } else {
      console.log(`❌ ${testName}`);
    }
  };
  
  // Test 1: Health check
  try {
    const req = createMockRequest('GET');
    const res = createMockResponse();
    await healthHandler(req, res);
    
    assert(res.statusCode === 200, 'Health check returns 200');
    assert(res.data.service === 'dashboard-export-api', 'Health check returns correct service name');
    assert(res.data.status === 'healthy', 'Health check returns healthy status');
  } catch (error) {
    console.log(`❌ Health check test failed: ${error.message}`);
  }
  
  // Test 2: Export API without authentication
  try {
    const req = createMockRequest('POST', { format: 'csv' });
    const res = createMockResponse();
    await exportHandler(req, res);
    
    assert(res.statusCode === 401, 'Export without auth returns 401');
  } catch (error) {
    console.log(`❌ Export auth test failed: ${error.message}`);
  }
  
  // Test 3: Export API with invalid format
  try {
    const req = createMockRequest('POST', { format: 'invalid' });
    const res = createMockResponse();
    await exportHandler(req, res);
    
    assert(res.statusCode === 401, 'Export with invalid format returns 401 (auth required first)');
  } catch (error) {
    console.log(`❌ Export format validation test failed: ${error.message}`);
  }
  
  // Test 4: Download handler without export ID
  try {
    const req = createMockRequest('GET', {}, {}, {});
    const res = createMockResponse();
    await downloadHandler(req, res);
    
    assert(res.statusCode === 401, 'Download without auth returns 401');
  } catch (error) {
    console.log(`❌ Download auth test failed: ${error.message}`);
  }
  
  console.log(`\n📊 Test Results: ${passedTests}/${testCount} tests passed`);
  
  if (passedTests === testCount) {
    console.log('🎉 All tests passed! Dashboard Export API is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Please check the implementation.');
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };
