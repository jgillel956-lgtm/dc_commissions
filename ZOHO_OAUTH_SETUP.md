# Zoho Analytics OAuth Setup Guide

## Issue Diagnosis

Based on the error logs, your OAuth refresh token appears to be invalid or expired. The HTML response from Zoho indicates an authentication error.

## Steps to Generate New OAuth Tokens

### 1. Create/Update OAuth App in Zoho Developer Console

1. Go to [Zoho Developer Console](https://api-console.zoho.com/)
2. Sign in with your Zoho account
3. Click "Add Client"
4. Choose "Self-Client" for server-side applications
5. Fill in the details:
   - **Client Name**: DC Commissions Analytics
   - **Homepage URL**: `https://dc-commissions.vercel.app`
   - **Authorized Redirect URIs**: `https://dc-commissions.vercel.app/oauth-callback.html`
   - **Scopes**: Add `ZohoAnalytics.data.READ`, `ZohoAnalytics.data.WRITE`

### 2. Get Authorization Code

1. After creating the app, note down your **Client ID** and **Client Secret**
2. Construct the authorization URL:
   ```
   https://accounts.zoho.com/oauth/v2/auth?response_type=code&client_id=YOUR_CLIENT_ID&scope=ZohoAnalytics.data.READ,ZohoAnalytics.data.WRITE&redirect_uri=https://dc-commissions.vercel.app/oauth-callback.html&access_type=offline
   ```
3. Replace `YOUR_CLIENT_ID` with your actual client ID
4. Open this URL in a browser
5. Sign in with your Zoho account
6. Authorize the application
7. You'll be redirected to your callback URL with an authorization code in the URL

### 3. Exchange Authorization Code for Refresh Token

1. Extract the authorization code from the redirect URL
2. Make a POST request to exchange the code for tokens:

```bash
curl -X POST "https://accounts.zoho.com/oauth/v2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "code=AUTHORIZATION_CODE&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&redirect_uri=https://dc-commissions.vercel.app/oauth-callback.html&grant_type=authorization_code"
```

3. The response will contain:
   - `access_token`: Short-lived token (1 hour)
   - `refresh_token`: Long-lived token (valid until revoked)
   - `expires_in`: Token expiration time

### 4. Update Environment Variables

Update your Vercel environment variables with the new values:

```
REACT_APP_ZOHO_CLIENT_ID=your_new_client_id
REACT_APP_ZOHO_CLIENT_SECRET=your_new_client_secret
REACT_APP_ZOHO_REFRESH_TOKEN=your_new_refresh_token
REACT_APP_ZOHO_WORKSPACE_ID=your_workspace_id
REACT_APP_ZOHO_ORG_ID=your_org_id
```

### 5. Test the Connection

1. Deploy the updated environment variables to Vercel
2. Visit: `https://dc-commissions.vercel.app/api/zoho-test.mjs`
3. Check if the OAuth token generation is successful

## Alternative: Use the Built-in OAuth Flow

If you have the OAuth callback page set up, you can use the built-in flow:

1. Visit: `https://dc-commissions.vercel.app/oauth-callback.html`
2. Follow the OAuth flow to generate new tokens
3. The page should display the new tokens for you to copy

## Troubleshooting

### Common Issues:

1. **Invalid Client ID/Secret**: Double-check your OAuth app credentials
2. **Wrong Redirect URI**: Ensure the redirect URI matches exactly
3. **Missing Scopes**: Make sure you have the required Zoho Analytics scopes
4. **Expired Authorization Code**: Authorization codes expire quickly, use them immediately
5. **Wrong Workspace/Org ID**: Verify your Zoho Analytics workspace and organization IDs

### Getting Workspace and Org IDs:

1. **Workspace ID**: Found in your Zoho Analytics URL: `https://analytics.zoho.com/workspace/YOUR_WORKSPACE_ID`
2. **Org ID**: Found in your Zoho account settings or API documentation

## Security Notes

- Keep your client secret and refresh token secure
- Never commit these values to version control
- Use environment variables in production
- Rotate tokens periodically for security

## Next Steps

After updating the tokens:

1. Test the connection using the diagnostic endpoint
2. Check the application logs for any remaining errors
3. Verify that data is being fetched correctly from Zoho Analytics

