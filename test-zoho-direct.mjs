// Simple test to verify Zoho credentials work
import axios from 'axios';

const refreshToken = "1000.5c4f9e07b9ea7cb21beab70ffe9fcb84.3f2ecb9901d8e5192e444e79e44efc5e";
const clientId = "1000.AAQC78DH072VU1E8SZLX6CQH9S2WMG";
const clientSecret = "78335af07638deef3cc45896f2d05d18ca73f6d6b1";

async function testZohoCredentials() {
  try {
    console.log('Testing Zoho OAuth with full Analytics scope...');
    
    // Step 1: Get access token using refresh token
    const tokenResponse = await axios.post('https://accounts.zoho.com/oauth/v2/token', 
      new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    
    console.log('✅ Access token obtained:', tokenResponse.data.access_token ? 'SUCCESS' : 'FAILED');
    console.log('✅ Scope:', tokenResponse.data.scope);
    
    // Step 2: Test Analytics API
    const accessToken = tokenResponse.data.access_token;
    const orgId = "5026095"; // Your actual org ID
    
    const analyticsResponse = await axios.get('https://analyticsapi.zoho.com/restapi/v2/workspaces', {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'ZANALYTICS-ORGID': orgId
      }
    });
    
    console.log('✅ Analytics API test:', analyticsResponse.data ? 'SUCCESS' : 'FAILED');
    console.log('Workspaces found:', analyticsResponse.data?.workspaces?.length || 0);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testZohoCredentials();
