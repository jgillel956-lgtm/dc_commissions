const axios = require('axios');

// Your OAuth credentials
const clientId = '1000.5WZNDB7SE7ZVSFLC6OTRH792H5LV0R';
const clientSecret = '756614cae6d89b32e959286ebed5f96db5154f7205';
const authorizationCode = '1000.76494b46ba03b967a862f6c098feb624.0ffdb6acb7912c02d8178cf3d3ab4e31';
const redirectUri = 'http://localhost:3000/auth-callback.html';

async function getTokens() {
  try {
    console.log('🔄 Exchanging authorization code for tokens...');
    
    // Use URLSearchParams for proper form encoding
    const params = new URLSearchParams();
    params.append('code', authorizationCode);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('redirect_uri', redirectUri);
    params.append('grant_type', 'authorization_code');
    
    const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('✅ Tokens obtained successfully!');
    console.log('\n📋 Full response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    console.log('\n📋 Your tokens:');
    console.log('='.repeat(50));
    console.log(`Access Token: ${response.data.access_token || 'Not found'}`);
    console.log(`Refresh Token: ${response.data.refresh_token || 'Not found'}`);
    console.log(`Expires In: ${response.data.expires_in || 'Not found'} seconds`);
    console.log(`Token Type: ${response.data.token_type || 'Not found'}`);
    console.log('='.repeat(50));
    
    if (response.data.refresh_token) {
      console.log('\n📝 Next steps:');
      console.log('1. Create a .env.local file in your project root');
      console.log('2. Add these environment variables:');
      console.log('   REACT_APP_ZOHO_CLIENT_ID=' + clientId);
      console.log('   REACT_APP_ZOHO_CLIENT_SECRET=' + clientSecret);
      console.log('   REACT_APP_ZOHO_REFRESH_TOKEN=' + response.data.refresh_token);
      console.log('   REACT_APP_ZOHO_WORKSPACE_ID=your_workspace_id');
      console.log('   REACT_APP_ENABLE_MOCK_DATA=false');
    } else {
      console.log('\n❌ No refresh token found in response. Please check the response above.');
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Error getting tokens:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Message:', error.message);
    }
    throw error;
  }
}

// Run the function
getTokens().catch(console.error);
