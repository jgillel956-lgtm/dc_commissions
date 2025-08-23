// Test script for Zoho Analytics connection
// Run this with: node test-zoho-connection.js

const axios = require('axios');

// Configuration - replace with your actual values
const config = {
  workspaceId: process.env.REACT_APP_ZOHO_WORKSPACE_ID || 'your_workspace_id',
  clientId: process.env.REACT_APP_ZOHO_CLIENT_ID || 'your_client_id',
  clientSecret: process.env.REACT_APP_ZOHO_CLIENT_SECRET || 'your_client_secret',
  refreshToken: process.env.REACT_APP_ZOHO_REFRESH_TOKEN || 'your_refresh_token'
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
    this.baseURL = 'https://analyticsapi.zoho.com/api/v2';
  }

  async getAccessToken() {
    if (this.accessToken) {
      return this.accessToken;
    }

    try {
      console.log('🔐 Getting access token...');
      
      const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', {
        refresh_token: config.refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'refresh_token'
      });

      this.accessToken = response.data.access_token;
      console.log('✅ Access token obtained successfully');
      return this.accessToken;
    } catch (error) {
      console.error('❌ Failed to get access token:', error.response?.data || error.message);
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
      const response = await this.makeRequest('/workspaces');
      console.log('✅ Workspace connection successful');
      console.log('📊 Workspace info:', response.data);
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
      const recordsResponse = await this.makeRequest('/tables', {
        ZOHO_TABLE_NAME: tableName,
        ZOHO_PER_PAGE: 5
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

// Check if required environment variables are set
const requiredVars = ['REACT_APP_ZOHO_WORKSPACE_ID', 'REACT_APP_ZOHO_CLIENT_ID', 'REACT_APP_ZOHO_CLIENT_SECRET', 'REACT_APP_ZOHO_REFRESH_TOKEN'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.log('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.log(`  - ${varName}`));
  console.log('\nPlease set these variables before running the test.');
  process.exit(1);
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
