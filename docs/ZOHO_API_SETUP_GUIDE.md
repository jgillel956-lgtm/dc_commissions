# Zoho API Setup Guide

## Overview
This guide provides step-by-step instructions for setting up Zoho Analytics API credentials for the DC Commissions application.

## Prerequisites
- Zoho account with Analytics access
- Admin access to your Zoho organization

## Step 1: Create Zoho OAuth Application

### 1.1 Access Zoho Developer Console
**URL:** https://api-console.zoho.com/

### 1.2 Create New Application
1. Click **"Add Client"**
2. Select **"Self Client"** (for server-to-server communication)
3. Fill in the application details:
   - **Client Name:** `DC Commissions API`
   - **Homepage URL:** `https://dc-commissions.vercel.app`
   - **Authorized Redirect URIs:** `https://dc-commissions.vercel.app/oauth-callback.html`
   - **Scope:** `ZohoAnalytics.data.READ,ZohoAnalytics.data.WRITE`

### 1.3 Get Application Credentials
After creating the application, you'll receive:
- **Client ID:** (e.g., `1000.BL10HWLVFLURBIR2O7D33UBF4B0U8V`)
- **Client Secret:** (e.g., `12fa49d34ee7be224a400680ade9ac1f90acd11e6b`)

**⚠️ Important:** Save these credentials securely - you'll need them for the next steps.

## Step 2: Generate Authorization Code

### 2.1 Access Self-Client Tab
**URL:** https://api-console.zoho.com/
1. Select your application
2. Go to **"Self-Client"** tab
3. Click **"Generate Code"**

### 2.2 Authorization URL Format
If you need to generate the URL manually:
```
https://accounts.zoho.com/oauth/v2/auth?response_type=code&client_id={YOUR_CLIENT_ID}&scope=ZohoAnalytics.data.READ,ZohoAnalytics.data.WRITE&redirect_uri=https://dc-commissions.vercel.app/oauth-callback.html&access_type=offline
```

**⚠️ Important:** 
- Authorization codes expire in **10 minutes**
- Each code can only be used **once**
- Generate a fresh code for each token exchange

## Step 3: Exchange Authorization Code for Tokens

### 3.1 Token Exchange Endpoint
**URL:** `https://accounts.zoho.com/oauth/v2/token`

### 3.2 Exchange Request
**Method:** POST  
**Content-Type:** `application/x-www-form-urlencoded`

**Request Body:**
```
code={AUTHORIZATION_CODE}&client_id={CLIENT_ID}&client_secret={CLIENT_SECRET}&redirect_uri=https://dc-commissions.vercel.app/oauth-callback.html&grant_type=authorization_code
```

### 3.3 Example cURL Command
```bash
curl -X POST "https://accounts.zoho.com/oauth/v2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "code=1000.9dd3637cf648217780b173ff2d62784d.f8603752fba85b307539a794df26288b&client_id=1000.BL10HWLVFLURBIR2O7D33UBF4B0U8V&client_secret=12fa49d34ee7be224a400680ade9ac1f90acd11e6b&redirect_uri=https://dc-commissions.vercel.app/oauth-callback.html&grant_type=authorization_code"
```

### 3.4 Expected Response
```json
{
  "access_token": "1000.640b966d1911ac14aef97cbe6ff4d617.21deb58d6ea6e433859870aa5a370795",
  "refresh_token": "1000.5a5ef5499a06ac6831efd8a593bfc43c.ca8c1319e26a81e05a5085c869b1a36e",
  "scope": "ZohoAnalytics.data.READ ZohoAnalytics.data.WRITE",
  "api_domain": "https://www.zohoapis.com",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**⚠️ Important:** 
- **Access Token:** Valid for 1 hour, used for API calls
- **Refresh Token:** Long-lived, used to get new access tokens
- Save the **refresh token** - this is what you'll use in your application

## Step 4: Get Workspace and Organization IDs

### 4.1 Workspace ID
**URL:** https://analytics.zoho.com/
1. Log into Zoho Analytics
2. Your workspace ID is in the URL: `https://analytics.zoho.com/workspace/{WORKSPACE_ID}`
3. Or go to **Settings** → **Workspace Settings** → **General**

### 4.2 Organization ID
**URL:** https://accounts.zoho.com/
1. Log into Zoho Accounts
2. Go to **Settings** → **Organization Settings**
3. Find your **Organization ID**

## Step 5: Configure Environment Variables

### 5.1 Vercel Environment Variables
**URL:** https://vercel.com/dashboard → Your Project → Settings → Environment Variables

Add these variables (all with `REACT_APP_` prefix):

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `REACT_APP_ZOHO_CLIENT_ID` | `1000.BL10HWLVFLURBIR2O7D33UBF4B0U8V` | Your Zoho client ID |
| `REACT_APP_ZOHO_CLIENT_SECRET` | `12fa49d34ee7be224a400680ade9ac1f90acd11e6b` | Your Zoho client secret |
| `REACT_APP_ZOHO_REFRESH_TOKEN` | `1000.5a5ef5499a06ac6831efd8a593bfc43c.ca8c1319e26a81e05a5085c869b1a36e` | Your refresh token |
| `REACT_APP_ZOHO_WORKSPACE_ID` | `your_workspace_id` | Your Zoho Analytics workspace ID |
| `REACT_APP_ZOHO_ORG_ID` | `your_org_id` | Your Zoho organization ID |
| `ZOHO_DC` | `com` | Data center (usually 'com') |

**Note:** The application uses `REACT_APP_` prefixed variables for both frontend and backend to maintain consistency.

## Step 6: Test the Setup

### 6.1 Health Check
**URL:** `https://dc-commissions.vercel.app/api/zoho-analytics.mjs?health=1`

Expected response:
```json
{
  "ok": true,
  "tokenCached": false,
  "backoffRemainingMs": 0
}
```

### 6.2 Debug Information
**URL:** `https://dc-commissions.vercel.app/api/zoho-analytics.mjs?debug=1`

Expected response:
```json
{
  "dc": "com",
  "refreshTokenSet": true,
  "clientIdSet": true,
  "clientSecretSet": true,
  "workspaceIdSet": true,
  "orgIdSet": true,
  "accountsHost": "https://accounts.zoho.com",
  "analyticsHost": "https://analyticsapi.zoho.com"
}
```

### 6.3 Test OAuth Flow
**URL:** `https://dc-commissions.vercel.app/api/zoho-analytics.mjs?testOAuth=1`

Expected response:
```json
{
  "success": true,
  "status": 200,
  "data": {
    "access_token": "...",
    "scope": "ZohoAnalytics.data.READ ZohoAnalytics.data.WRITE",
    "api_domain": "https://www.zohoapis.com",
    "token_type": "Bearer",
    "expires_in": 3600
  },
  "hasAccessToken": true
}
```

### 6.4 Test Data Access
**URL:** `https://dc-commissions.vercel.app/api/zoho-analytics.mjs?tableName=employee_commissions_DC&action=records`

Expected response:
```json
{
  "rows": [
    // Your data here
  ]
}
```

## Troubleshooting

### Common Issues

#### 1. "invalid_code" Error
**Cause:** Authorization code expired or already used
**Solution:** Generate a fresh authorization code

#### 2. "invalid_client" Error
**Cause:** Client ID or secret is incorrect
**Solution:** Verify credentials in Zoho Developer Console

#### 3. "redirect_uri_mismatch" Error
**Cause:** Redirect URI doesn't match exactly
**Solution:** Ensure redirect URI is exactly: `https://dc-commissions.vercel.app/oauth-callback.html`

#### 4. "No access_token received from Zoho OAuth"
**Cause:** Refresh token exchange failed
**Solution:** 
- Verify client credentials match those used to generate the refresh token
- Check if refresh token is still valid
- Regenerate tokens if needed

#### 5. Rate Limiting
**Cause:** Too many requests to Zoho API
**Solution:** Wait for rate limit to clear (usually 1 minute)

### Error Response Examples

#### Invalid Code
```json
{
  "error": "invalid_code"
}
```

#### Rate Limited
```json
{
  "error": "Upstream rate limited by Zoho OAuth",
  "retryAfterMs": 60000,
  "rateLimitEndsAt": 1756091142936
}
```

#### Missing Credentials
```json
{
  "error": "Zoho Analytics credentials not configured"
}
```

## Security Best Practices

### 1. Environment Variables
- Never commit credentials to version control
- Use environment variables for all sensitive data
- Rotate tokens periodically

### 2. Token Management
- Store refresh tokens securely
- Monitor token usage and expiration
- Implement proper error handling for token refresh

### 3. Access Control
- Use minimal required scopes
- Regularly audit API access
- Monitor for unusual activity

## API Endpoints Reference

### Zoho OAuth Endpoints
- **Authorization:** `https://accounts.zoho.com/oauth/v2/auth`
- **Token Exchange:** `https://accounts.zoho.com/oauth/v2/token`

### Zoho Analytics Endpoints
- **Base URL:** `https://analyticsapi.zoho.com/restapi/v2`
- **Data Access:** `{BASE_URL}/workspaces/{WORKSPACE_ID}/views/{TABLE_ID}/data`

### Application Endpoints
- **Health Check:** `/api/zoho-analytics.mjs?health=1`
- **Debug Info:** `/api/zoho-analytics.mjs?debug=1`
- **OAuth Test:** `/api/zoho-analytics.mjs?testOAuth=1`
- **Data Access:** `/api/zoho-analytics.mjs?tableName={TABLE_NAME}&action=records`

## Table Configuration

### Supported Tables
The application is configured for these Zoho Analytics tables:

| Table Name | Table ID | Description |
|------------|----------|-------------|
| `company_upcharge_fees_DC` | `2103833000016814240` | Company upcharge fees |
| `employee_commissions_DC` | `2103833000016814379` | Employee commissions |
| `monthly_interchange_income_DC` | `2103833000018129022` | Monthly interchange income |
| `monthly_interest_revenue_DC` | `2103833000016914505` | Monthly interest revenue |
| `referral_partners_DC` | `2103833000016814002` | Referral partners |
| `insurance_companies_DC` | `2103833000004379120` | Insurance companies |
| `vendor_costs_DC` | `2103833000016817002` | Vendor costs |
| `payment_modalities` | `2103833000011978002` | Payment modalities |

## Maintenance

### Regular Tasks
1. **Monitor token expiration** - Refresh tokens can expire
2. **Check API usage** - Monitor rate limits and quotas
3. **Update credentials** - Rotate tokens periodically
4. **Test connectivity** - Regular health checks

### Token Refresh Process
1. Generate new authorization code
2. Exchange for new refresh token
3. Update environment variables
4. Redeploy application
5. Test connectivity

## Support Resources

### Zoho Documentation
- **API Console:** https://api-console.zoho.com/
- **Analytics API Docs:** https://www.zoho.com/analytics/api/
- **OAuth Documentation:** https://www.zoho.com/analytics/api/oauth.html

### Application Resources
- **Health Check:** `https://dc-commissions.vercel.app/api/zoho-analytics.mjs?health=1`
- **OAuth Setup Page:** `https://dc-commissions.vercel.app/oauth-setup.html`
- **OAuth Callback:** `https://dc-commissions.vercel.app/oauth-callback.html`

---

**Last Updated:** December 2024  
**Version:** 1.0  
**Maintainer:** DC Commissions Team

