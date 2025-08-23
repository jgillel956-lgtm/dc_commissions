const axios = require('axios');

// Your credentials
const config = {
  workspaceId: '2103833000004345334',
  orgId: '701058947',
  clientId: '1000.5WZNDB7SE7ZVSFLC6OTRH792H5LV0R',
  clientSecret: '756614cae6d89b32e959286ebed5f96db5154f7205',
  refreshToken: '1000.9e134cb7fdb1dc8c01fb6c1cf1205d57.6b2f8b0791d30d1efb8c9ae8dfb56722'
};

async function testTableAccess() {
  try {
    console.log('🔐 Getting access token...');
    
    // Get access token
    const params = new URLSearchParams();
    params.append('refresh_token', config.refreshToken);
    params.append('client_id', config.clientId);
    params.append('client_secret', config.clientSecret);
    params.append('grant_type', 'refresh_token');
    
    const tokenResponse = await axios.post('https://accounts.zoho.com/oauth/v2/token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const accessToken = tokenResponse.data.access_token;
    console.log('✅ Access token obtained successfully');

    // First, let's get a list of available tables/views
    console.log('\n📋 Getting available tables/views...');
    
    const viewsUrl = `https://analyticsapi.zoho.com/restapi/v2/workspaces/${config.workspaceId}/views`;
    
    try {
      const viewsResponse = await axios.get(viewsUrl, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json',
          'ZANALYTICS-ORGID': config.orgId
        }
      });
      
      console.log('✅ Views retrieved successfully!');
      console.log(`📊 Found ${viewsResponse.data.data?.length || 0} views/tables`);
      
      if (viewsResponse.data.data && viewsResponse.data.data.length > 0) {
        console.log('\n📋 Available tables/views:');
        viewsResponse.data.data.forEach((view, index) => {
          console.log(`${index + 1}. ${view.name} (ID: ${view.id})`);
        });
      }
      
      return true;
    } catch (viewsError) {
      console.log('⚠️  Could not get views list, trying direct table access...');
      
      // Test table access using table ID (RESTful API)
      console.log('\n📊 Testing table data access with table ID...');
      
      const tableId = '2103833000004379120'; // insurance_companies_DC table ID
      const dataUrl = `https://analyticsapi.zoho.com/restapi/v2/workspaces/${config.workspaceId}/views/${tableId}/data`;
      
      const dataResponse = await axios.get(dataUrl, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json',
          'ZANALYTICS-ORGID': config.orgId
        },
        params: {
          'ZOHO_MAX_ROWS': 5
        }
      });
      
            console.log('✅ Table data access successful!');
      console.log('\n📊 Response structure:');
      console.log(JSON.stringify(dataResponse.data, null, 2));
      
      // Try different data access patterns
      const records = dataResponse.data.data || dataResponse.data.rows || dataResponse.data;
      console.log(`📈 Retrieved ${Array.isArray(records) ? records.length : 'unknown'} records from insurance_companies_DC`);
      
      if (Array.isArray(records) && records.length > 0) {
        console.log('\n📋 Sample record:');
        console.log(JSON.stringify(records[0], null, 2));
      }
      
      return true;
    }
    
    console.log('\n🎉 SUCCESS: Your Zoho Analytics integration is working!');
    console.log('✅ OAuth tokens are valid');
    console.log('✅ API connection established');
    console.log('✅ Table data access confirmed');
    
    return true;
  } catch (error) {
    console.error('❌ Error testing table access:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Message:', error.message);
    }
    return false;
  }
}

testTableAccess();
