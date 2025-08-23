// Test script for Zoho Analytics connection
// Run this with: node test-zoho-connection.js

const axios = require('axios');

// Configuration - replace with your actual values
const config = {
  workspaceId: '2103833000004345334',
  clientId: '1000.5WZNDB7SE7ZVSFLC6OTRH792H5LV0R',
  clientSecret: '756614cae6d89b32e959286ebed5f96db5154f7205',
  refreshToken: '1000.9e134cb7fdb1dc8c01fb6c1cf1205d57.6b2f8b0791d30d1efb8c9ae8dfb56722'
};

// Tables to test
const tables = [
  'insurance_companies_DC',
  'payment_modalities',
  'company_upcharge_fees_DC',
  'employee_commissions_DC',
  'monthly_interchange_income_DC',
  'monthly_interest_revenue_DC',
  'referral_partners_DC'
];

class ZohoTestAPI {
  constructor() {
    this.accessToken = null;
    this.baseURL = 'https://analyticsapi.zoho.com/restapi/v2';
  }

  async getAccessToken() {
    if (this.accessToken) {
      return this.accessToken;
    }

    try {
      console.log('🔐 Getting access token...');
      
      // Use URLSearchParams for proper form encoding
      const params = new URLSearchParams();
      params.append('refresh_token', config.refreshToken);
      params.append('client_id', config.clientId);
      params.append('client_secret', config.clientSecret);
      params.append('grant_type', 'refresh_token');
      
      const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.accessToken = response.data.access_token;
      console.log('✅ Access token obtained successfully');
      return this.accessToken;
    } catch (error) {
      console.error('❌ Failed to get access token:', error.response?.status || error.response?.statusText || error.message);
      if (error.response?.data) {
        console.error('Response data:', typeof error.response.data === 'string' ? 'HTML Error Page' : error.response.data);
      }
      throw error;
    }
  }

  async makeRequest(endpoint, params = {}) {
    const token = await this.getAccessToken();
    
    try {
      const response = await axios.get(`${this.baseURL}${endpoint}`, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          ZOHO_WORKSPACE_ID: config.workspaceId,
          ...params
        }
      });

      return response.data;
    } catch (error) {
      console.error(`❌ API request failed for ${endpoint}:`, error.response?.data || error.message);
      throw error;
    }
  }

  async testWorkspaceConnection() {
    console.log('\n🏢 Testing workspace connection...');
    
    try {
      // Test by getting workspace views (tables)
      const response = await this.makeRequest(`/workspaces/${config.workspaceId}/views`);
      console.log('✅ Workspace connection successful');
      console.log(`📊 Found ${response.data?.length || 0} views/tables in workspace`);
      return true;
    } catch (error) {
      console.error('❌ Workspace connection failed');
      return false;
    }
  }

  async testTable(tableName) {
    console.log(`\n📋 Testing table: ${tableName}`);
    
    try {
      // Test getting table metadata
      console.log('  📝 Getting table metadata...');
      const metadataResponse = await this.makeRequest('/tables/metadata', {
        action: 'get',
        ZOHO_TABLE_NAME: tableName
      });
      
      if (metadataResponse.status.code === 0) {
        console.log(`  ✅ Table metadata retrieved successfully`);
        console.log(`  📊 Columns: ${metadataResponse.data?.columns?.length || 0} columns found`);
      } else {
        console.log(`  ⚠️  Table metadata warning: ${metadataResponse.status.message}`);
      }

      // Test getting records
      console.log('  📊 Getting table records...');
      const recordsResponse = await this.makeRequest('/data', {
        action: 'export',
        ZOHO_TABLE_NAME: tableName,
        ZOHO_MAX_ROWS: 5,
        ZOHO_OUTPUT_FORMAT: 'JSON'
      });
      
      if (recordsResponse.status.code === 0) {
        const recordCount = recordsResponse.data?.length || 0;
        console.log(`  ✅ Table records retrieved successfully`);
        console.log(`  📈 Found ${recordCount} records (showing first 5)`);
        
        if (recordCount > 0) {
          console.log('  📋 Sample record:', JSON.stringify(recordsResponse.data[0], null, 2));
        }
        
        return {
          success: true,
          recordCount,
          columns: metadataResponse.data?.columns?.length || 0
        };
      } else {
        console.log(`  ❌ Failed to get records: ${recordsResponse.status.message}`);
        return {
          success: false,
          error: recordsResponse.status.message
        };
      }
    } catch (error) {
      console.log(`  ❌ Table test failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testCRUDOperations(tableName) {
    console.log(`\n🔄 Testing CRUD operations for: ${tableName}`);
    
    try {
      // Test CREATE
      console.log('  ➕ Testing CREATE operation...');
      const testData = {
        test_field: `Test record ${Date.now()}`,
        created_at: new Date().toISOString()
      };
      
      const createResponse = await axios.post(`${this.baseURL}/tables`, {
        ZOHO_WORKSPACE_ID: config.workspaceId,
        ZOHO_TABLE_NAME: tableName,
        data: [testData]
      }, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${await this.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (createResponse.data.status.code === 0) {
        console.log('  ✅ CREATE operation successful');
        const recordId = createResponse.data.data?.[0]?.ZOHO_ROW_ID;
        
        if (recordId) {
          // Test UPDATE
          console.log('  ✏️  Testing UPDATE operation...');
          const updateData = {
            ...testData,
            test_field: `Updated test record ${Date.now()}`
          };
          
          const updateResponse = await axios.put(`${this.baseURL}/tables`, {
            ZOHO_WORKSPACE_ID: config.workspaceId,
            ZOHO_TABLE_NAME: tableName,
            ZOHO_ROW_ID: recordId,
            data: [updateData]
          }, {
            headers: {
              'Authorization': `Zoho-oauthtoken ${await this.getAccessToken()}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (updateResponse.data.status.code === 0) {
            console.log('  ✅ UPDATE operation successful');
            
            // Test DELETE
            console.log('  🗑️  Testing DELETE operation...');
            const deleteResponse = await axios.delete(`${this.baseURL}/tables`, {
              headers: {
                'Authorization': `Zoho-oauthtoken ${await this.getAccessToken()}`,
                'Content-Type': 'application/json'
              },
              params: {
                ZOHO_WORKSPACE_ID: config.workspaceId,
                ZOHO_TABLE_NAME: tableName,
                ZOHO_ROW_ID: recordId
              }
            });
            
            if (deleteResponse.data.status.code === 0) {
              console.log('  ✅ DELETE operation successful');
              return { success: true, message: 'All CRUD operations successful' };
            } else {
              console.log(`  ❌ DELETE operation failed: ${deleteResponse.data.status.message}`);
              return { success: false, error: deleteResponse.data.status.message };
            }
          } else {
            console.log(`  ❌ UPDATE operation failed: ${updateResponse.data.status.message}`);
            return { success: false, error: updateResponse.data.status.message };
          }
        } else {
          console.log('  ⚠️  No record ID returned from CREATE operation');
          return { success: false, error: 'No record ID returned' };
        }
      } else {
        console.log(`  ❌ CREATE operation failed: ${createResponse.data.status.message}`);
        return { success: false, error: createResponse.data.status.message };
      }
    } catch (error) {
      console.log(`  ❌ CRUD test failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

async function runTests() {
  console.log('🚀 Starting Zoho Analytics API Tests');
  console.log('=====================================');
  
  const api = new ZohoTestAPI();
  
  // Test workspace connection
  const workspaceConnected = await api.testWorkspaceConnection();
  if (!workspaceConnected) {
    console.log('\n❌ Cannot proceed without workspace connection');
    return;
  }
  
  // Test each table
  const results = [];
  for (const table of tables) {
    const result = await api.testTable(table);
    results.push({ table, ...result });
    
    // Test CRUD operations for the first table only (to avoid creating too many test records)
    if (table === tables[0]) {
      const crudResult = await api.testCRUDOperations(table);
      console.log(`  🔄 CRUD Test Result: ${crudResult.success ? '✅ PASSED' : '❌ FAILED'}`);
    }
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('===============');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log('\n✅ Successful Tables:');
    successful.forEach(r => {
      console.log(`  - ${r.table}: ${r.recordCount} records, ${r.columns} columns`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed Tables:');
    failed.forEach(r => {
      console.log(`  - ${r.table}: ${r.error}`);
    });
  }
  
  console.log('\n🎉 Test completed!');
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
