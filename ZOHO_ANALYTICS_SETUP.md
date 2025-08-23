# Zoho Analytics API Integration Setup Guide

## Overview

This guide provides exact instructions for connecting your commission management application to Zoho Analytics API to perform CRUD operations on your tables.

## Prerequisites

1. **Zoho Analytics Account**: Active Zoho Analytics subscription
2. **Workspace Access**: Admin or user access to the workspace containing your tables
3. **API Access**: Enabled API access for your Zoho Analytics account
4. **Client Credentials**: OAuth 2.0 client credentials

## Step 1: Enable API Access in Zoho Analytics

### 1.1 Access Zoho Analytics Admin Panel
1. Log in to [Zoho Analytics](https://analytics.zoho.com)
2. Click on your **profile icon** (top right)
3. Select **"Admin"** from the dropdown menu

### 1.2 Enable API Access
1. In the Admin panel, navigate to **"Security"** → **"API Access"**
2. Toggle **"Enable API Access"** to **ON**
3. Note down your **Workspace ID** (found in the URL: `https://analytics.zoho.com/workspace/{WORKSPACE_ID}`)

## Step 2: Create OAuth 2.0 Client Credentials

### 2.1 Access Zoho Developer Console
1. Go to [Zoho Developer Console](https://api-console.zoho.com/)
2. Sign in with your Zoho account
3. Click **"Add Client"**

### 2.2 Configure OAuth Client
1. **Client Name**: `DC Commissions Management`
2. **Client Type**: Select **"Web based"**
3. **Homepage URL**: `http://localhost:3000` (for development)
4. **Authorized Redirect URIs**: 
   - Development: `http://localhost:3000/auth-callback.html`
   - Production: `https://your-domain.vercel.app/auth-callback.html`

### 2.3 Get Client Credentials
After creating the client, note down:
- **Client ID**
- **Client Secret**
- **Refresh Token** (you'll generate this in the next step)

## Step 3: Generate Access Token

### 3.1 Create Authorization URL
Replace the placeholders in this URL:
```
https://accounts.zoho.com/oauth/v2/auth?scope=ZohoAnalytics.data.all&client_id={CLIENT_ID}&response_type=code&access_type=offline&redirect_uri={REDIRECT_URI}
```

Example:
```
https://accounts.zoho.com/oauth/v2/auth?scope=ZohoAnalytics.data.all&client_id=1000.ABC123DEF456&response_type=code&access_type=offline&redirect_uri=http://localhost:3000/auth-callback.html
```

### 3.2 Get Authorization Code
1. Open the authorization URL in your browser
2. Log in with your Zoho account
3. Grant permissions to your application
4. Copy the **authorization code** from the redirect URL

### 3.3 Exchange Code for Tokens
Make a POST request to get your access and refresh tokens:

```bash
curl -X POST "https://accounts.zoho.com/oauth/v2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "code={AUTHORIZATION_CODE}&client_id={CLIENT_ID}&client_secret={CLIENT_SECRET}&redirect_uri={REDIRECT_URI}&grant_type=authorization_code"
```

Response will contain:
```json
{
  "access_token": "1000.abc123def456...",
  "refresh_token": "1000.xyz789uvw012...",
  "expires_in": 3600,
  "api_domain": "https://www.zohoapis.com",
  "token_type": "Bearer"
}
```

## Step 4: Configure Environment Variables

### 4.1 Create Environment File
Create `.env.local` in your project root:

```env
# Zoho Analytics Configuration
REACT_APP_ZOHO_WORKSPACE_ID=your_workspace_id
REACT_APP_ZOHO_CLIENT_ID=your_client_id
REACT_APP_ZOHO_CLIENT_SECRET=your_client_secret
REACT_APP_ZOHO_REFRESH_TOKEN=your_refresh_token

# API Configuration
REACT_APP_ZOHO_API_BASE_URL=https://analyticsapi.zoho.com/api/v2
REACT_APP_ZOHO_AUTH_BASE_URL=https://accounts.zoho.com/oauth/v2

# Application Configuration
REACT_APP_ENABLE_MOCK_DATA=false
REACT_APP_AUDIT_API_ENDPOINT=/api/audit
```

### 4.2 Vercel Environment Variables
For production deployment, add these to your Vercel project:

1. Go to your Vercel dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable from the `.env.local` file

## Step 5: Update API Configuration

### 5.1 Update Zoho API Service
Replace the mock API with real Zoho Analytics API calls:

```typescript
// src/services/zohoApi.ts
import axios from 'axios';

class ZohoAnalyticsAPI {
  private accessToken: string | null = null;
  private refreshToken: string;
  private clientId: string;
  private clientSecret: string;
  private workspaceId: string;

  constructor() {
    this.refreshToken = process.env.REACT_APP_ZOHO_REFRESH_TOKEN!;
    this.clientId = process.env.REACT_APP_ZOHO_CLIENT_ID!;
    this.clientSecret = process.env.REACT_APP_ZOHO_CLIENT_SECRET!;
    this.workspaceId = process.env.REACT_APP_ZOHO_WORKSPACE_ID!;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) {
      return this.accessToken;
    }

    const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', {
      refresh_token: this.refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token'
    });

    this.accessToken = response.data.access_token;
    return this.accessToken;
  }

  private async makeRequest(endpoint: string, method: string = 'GET', data?: any) {
    const token = await this.getAccessToken();
    
    const response = await axios({
      method,
      url: `${process.env.REACT_APP_ZOHO_API_BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      },
      data
    });

    return response.data;
  }

  // CRUD Operations
  async getRecords(tableName: string, params?: any) {
    const queryParams = new URLSearchParams({
      ZOHO_WORKSPACE_ID: this.workspaceId,
      ZOHO_TABLE_NAME: tableName,
      ...params
    });

    return this.makeRequest(`/tables?${queryParams}`);
  }

  async createRecord(tableName: string, data: any) {
    const payload = {
      ZOHO_WORKSPACE_ID: this.workspaceId,
      ZOHO_TABLE_NAME: tableName,
      data: [data]
    };

    return this.makeRequest('/tables', 'POST', payload);
  }

  async updateRecord(tableName: string, recordId: string, data: any) {
    const payload = {
      ZOHO_WORKSPACE_ID: this.workspaceId,
      ZOHO_TABLE_NAME: tableName,
      ZOHO_ROW_ID: recordId,
      data: [data]
    };

    return this.makeRequest('/tables', 'PUT', payload);
  }

  async deleteRecord(tableName: string, recordId: string) {
    const queryParams = new URLSearchParams({
      ZOHO_WORKSPACE_ID: this.workspaceId,
      ZOHO_TABLE_NAME: tableName,
      ZOHO_ROW_ID: recordId
    });

    return this.makeRequest(`/tables?${queryParams}`, 'DELETE');
  }

  async exportRecords(tableName: string, format: 'csv' | 'excel' = 'csv', params?: any) {
    const queryParams = new URLSearchParams({
      ZOHO_WORKSPACE_ID: this.workspaceId,
      ZOHO_TABLE_NAME: tableName,
      ZOHO_OUTPUT_FORMAT: format,
      ...params
    });

    const response = await axios({
      method: 'GET',
      url: `${process.env.REACT_APP_ZOHO_API_BASE_URL}/tables/export?${queryParams}`,
      headers: {
        'Authorization': `Zoho-oauthtoken ${await this.getAccessToken()}`,
      },
      responseType: 'blob'
    });

    return response.data;
  }
}

export const zohoAnalyticsAPI = new ZohoAnalyticsAPI();
```

## Step 6: Table Configuration

### 6.1 Verify Table Names
Ensure your table names match exactly in Zoho Analytics:

1. **Insurance Companies**: `insurance_companies_DC`
2. **Payment Modalities**: `payment_modalities`
3. **Company Upcharge Fees**: `company_upcharge_fees_DC`
4. **Employee Commissions**: `employee_commissions_DC`
5. **Monthly Interchange Income**: `monthly_interchange_income_DC`
6. **Monthly Interest Revenue**: `monthly_interest_revenue_DC`
7. **Referral Partners**: `referral_partners_DC`

### 6.2 Get Table Schema
For each table, get the exact column names and types:

```bash
curl -X GET "https://analyticsapi.zoho.com/api/v2/tables/metadata?ZOHO_WORKSPACE_ID={WORKSPACE_ID}&ZOHO_TABLE_NAME={TABLE_NAME}" \
  -H "Authorization: Zoho-oauthtoken {ACCESS_TOKEN}"
```

## Step 7: Update Application Configuration

### 7.1 Update API Service
Replace the mock API with real Zoho API:

```typescript
// src/services/zohoApi.ts
import { zohoAnalyticsAPI } from './zohoAnalyticsAPI';

const USE_MOCK_DATA = process.env.REACT_APP_ENABLE_MOCK_DATA === 'true';

export const zohoApi = {
  getRecords: async <T>(tableName: string, params?: any): Promise<ApiResponse<T>> => {
    if (USE_MOCK_DATA) {
      return mockApi.getRecords(tableName, params);
    }
    return zohoAnalyticsAPI.getRecords(tableName, params);
  },

  createRecord: async <T>(tableName: string, data: any): Promise<T> => {
    if (USE_MOCK_DATA) {
      return mockApi.createRecord(tableName, data);
    }
    return zohoAnalyticsAPI.createRecord(tableName, data);
  },

  updateRecord: async <T>(tableName: string, id: string, data: any): Promise<T> => {
    if (USE_MOCK_DATA) {
      return mockApi.updateRecord(tableName, id, data);
    }
    return zohoAnalyticsAPI.updateRecord(tableName, id, data);
  },

  deleteRecord: async (tableName: string, id: string): Promise<void> => {
    if (USE_MOCK_DATA) {
      return mockApi.deleteRecord(tableName, id);
    }
    return zohoAnalyticsAPI.deleteRecord(tableName, id);
  },

  exportRecords: async (tableName: string, format: 'csv' | 'excel' = 'csv', params?: any): Promise<Blob> => {
    if (USE_MOCK_DATA) {
      return mockApi.exportRecords(tableName, format, params);
    }
    return zohoAnalyticsAPI.exportRecords(tableName, format, params);
  }
};
```

## Step 8: Testing the Connection

### 8.1 Test API Connection
Create a test script to verify the connection:

```typescript
// test-zoho-connection.ts
import { zohoAnalyticsAPI } from './src/services/zohoApi';

async function testConnection() {
  try {
    // Test getting records from a table
    const records = await zohoAnalyticsAPI.getRecords('insurance_companies_DC');
    console.log('Connection successful!', records);
  } catch (error) {
    console.error('Connection failed:', error);
  }
}

testConnection();
```

### 8.2 Test Each Table
Test CRUD operations for each table:

```typescript
async function testAllTables() {
  const tables = [
    'insurance_companies_DC',
    'payment_modalities',
    'company_upcharge_fees_DC',
    'employee_commissions_DC',
    'monthly_interchange_income_DC',
    'monthly_interest_revenue_DC',
    'referral_partners_DC'
  ];

  for (const table of tables) {
    try {
      console.log(`Testing table: ${table}`);
      const records = await zohoAnalyticsAPI.getRecords(table);
      console.log(`✓ ${table}: ${records.data?.length || 0} records`);
    } catch (error) {
      console.error(`✗ ${table}: ${error.message}`);
    }
  }
}
```

## Step 9: Error Handling

### 9.1 Common API Errors
Handle common Zoho Analytics API errors:

```typescript
// src/services/zohoApi.ts
private async handleAPIError(error: any) {
  if (error.response?.status === 401) {
    // Token expired, refresh
    this.accessToken = null;
    await this.getAccessToken();
    throw new Error('Token refreshed, please retry');
  }
  
  if (error.response?.status === 403) {
    throw new Error('Insufficient permissions for this operation');
  }
  
  if (error.response?.status === 404) {
    throw new Error('Table not found');
  }
  
  throw new Error(`API Error: ${error.response?.data?.message || error.message}`);
}
```

### 9.2 Rate Limiting
Implement rate limiting for API calls:

```typescript
private rateLimiter = {
  lastCall: 0,
  minInterval: 100 // 100ms between calls
};

private async rateLimit() {
  const now = Date.now();
  const timeSinceLastCall = now - this.rateLimiter.lastCall;
  
  if (timeSinceLastCall < this.rateLimiter.minInterval) {
    await new Promise(resolve => 
      setTimeout(resolve, this.rateLimiter.minInterval - timeSinceLastCall)
    );
  }
  
  this.rateLimiter.lastCall = Date.now();
}
```

## Step 10: Production Deployment

### 10.1 Vercel Configuration
Update your `vercel.json`:

```json
{
  "functions": {
    "api/audit/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "REACT_APP_ZOHO_WORKSPACE_ID": "@zoho-workspace-id",
    "REACT_APP_ZOHO_CLIENT_ID": "@zoho-client-id",
    "REACT_APP_ZOHO_CLIENT_SECRET": "@zoho-client-secret",
    "REACT_APP_ZOHO_REFRESH_TOKEN": "@zoho-refresh-token"
  }
}
```

### 10.2 Security Considerations
1. **Never commit tokens** to version control
2. **Use environment variables** for all sensitive data
3. **Implement proper error handling** for API failures
4. **Add request logging** for debugging
5. **Implement retry logic** for transient failures

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check if access token is expired
   - Verify refresh token is valid
   - Ensure client credentials are correct

2. **403 Forbidden**
   - Verify workspace permissions
   - Check table access rights
   - Ensure API access is enabled

3. **404 Not Found**
   - Verify table names are correct
   - Check workspace ID
   - Ensure tables exist in the workspace

4. **Rate Limiting**
   - Implement delays between requests
   - Use batch operations when possible
   - Monitor API usage limits

### Debug Mode
Enable debug logging:

```typescript
const DEBUG_ZOHO = process.env.NODE_ENV === 'development';

if (DEBUG_ZOHO) {
  console.log('Zoho API Request:', { endpoint, method, data });
  console.log('Zoho API Response:', response);
}
```

## Next Steps

1. **Test the connection** with a simple table query
2. **Verify all table schemas** match your application
3. **Test CRUD operations** for each table
4. **Implement error handling** and retry logic
5. **Deploy to production** with proper environment variables
6. **Monitor API usage** and performance

---

**Important Notes:**
- Keep your refresh token secure and never expose it in client-side code
- Implement proper token refresh logic
- Monitor API rate limits and usage
- Test thoroughly in development before deploying to production
- Consider implementing a caching layer for frequently accessed data
