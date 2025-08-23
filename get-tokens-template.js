const axios = require('axios');

// Zoho OAuth 2.0 Configuration
const clientId = 'YOUR_CLIENT_ID'; // Replace with your actual client ID
const clientSecret = 'YOUR_CLIENT_SECRET'; // Replace with your actual client secret
const redirectUri = 'http://localhost:3000/auth-callback.html';

// Step 1: Get authorization code
// Visit this URL in your browser and copy the 'code' parameter from the redirect URL
const authUrl = `https://accounts.zoho.com/oauth/v2/auth?scope=ZohoAnalytics.data.all&client_id=${clientId}&response_type=code&access_type=offline&redirect_uri=${redirectUri}`;
console.log('Authorization URL:', authUrl);

// Step 2: Exchange authorization code for tokens
async function getTokens(authorizationCode) {
  try {
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

    console.log('Token Response:', response.data);
    console.log(`Access Token: ${response.data.access_token || 'Not found'}`);
    console.log(`Refresh Token: ${response.data.refresh_token || 'Not found'}`);

    // Save these to your .env file
    if (response.data.refresh_token) {
      console.log('\nAdd these to your .env file:');
      console.log('   REACT_APP_ZOHO_CLIENT_ID=' + clientId);
      console.log('   REACT_APP_ZOHO_CLIENT_SECRET=' + clientSecret);
      console.log('   REACT_APP_ZOHO_REFRESH_TOKEN=' + response.data.refresh_token);
    }

  } catch (error) {
    console.error('Error getting tokens:', error.response?.data || error.message);
  }
}

// Usage: Replace 'YOUR_AUTHORIZATION_CODE' with the code from step 1
// getTokens('YOUR_AUTHORIZATION_CODE');

module.exports = { getTokens, authUrl };
