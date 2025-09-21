import axios from "axios";
import { query } from './db/connection.mjs';
import { getAccessTokenShared, withTokenRetry } from './db/getAccessTokenShared.mjs';
import { syncRevenueData, getRevenueData, getDistinctCompanies, getDistinctEmployees, getSyncStatus } from './db/revenueDataService.mjs';
import { syncAllTables, syncTableData, getSyncStatus as getZohoDataSyncStatus } from './db/zohoDataSyncService.mjs';
import { getSharedToken, getSharedBackoffUntil, clearSharedToken } from './db/zohoTokenStore.mjs';

/** DC-aware hosts */
const DC = process.env.ZOHO_DC || "com";
const ANALYTICS_HOST = `https://analyticsapi.zoho.${DC}`;
const BASE_URL = `${ANALYTICS_HOST}/restapi/v2`;
const CLOUDSQL_URL = `https://cloudsql.zoho.${DC}/restapi/v2`;

/** Stale cache (instance-local, OK) */
const staleCache = new Map();    // key -> { ts, payload }
const STALE_TTL_MS = 5*60*1000;

function keyFor(tableName, action, params) {
  return JSON.stringify({ tableName, action, params });
}

function headersFor(token, orgId) {
  const h = { 
    Authorization: `Zoho-oauthtoken ${token}`, 
    'Content-Type': 'application/json' 
  };
  if (orgId) h['ZANALYTICS-ORGID'] = orgId;
  return h;
}

// Table ID mapping (from tableConfigs.ts)
const TABLE_IDS = {
  'company_upcharge_fees_DC': '2103833000016814240',
  'employee_commissions_DC': '2103833000016814379',
  'monthly_interchange_income_DC': '2103833000018129022',
  'monthly_interest_revenue_DC': '2103833000016914505',
  'referral_partners_DC': '2103833000016814002',
  'insurance_companies_DC': '2103833000004379120',
  'vendor_costs_DC': '2103833000016817002',
  'payment_modalities': '2103833000011978002',
  'revenue_master_view': '2103833000016814601' // Revenue master view ID provided by user
};

// Input validation helper
function validateInput(req, res, requiredFields = []) {
  const errors = [];
  
  // Check content type for POST requests
  if (req.method === 'POST') {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      errors.push({
        field: 'content-type',
        message: 'Content-Type must be application/json for POST requests',
        received: contentType
      });
    }
  }
  
  // Check required fields
  for (const field of requiredFields) {
    if (!req.body || req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
      errors.push({
        field,
        message: `${field} is required`,
        received: req.body?.[field]
      });
    }
  }
  
  if (errors.length > 0) {
    res.status(400).json({
      error: "Validation failed",
      details: errors,
      timestamp: new Date().toISOString()
    });
    return false;
  }
  
  return true;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-vercel-protection-bypass");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Route to different handlers based on path
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  
  // Handle user management routes
  if (path.startsWith('/api/users')) {
    return await handleUsersAPI(req, res);
  }
  
  // Handle audit routes  
  if (path.startsWith('/api/audit')) {
    return await handleAuditAPI(req, res);
  }
  
  // Handle login routes
  if (path.startsWith('/api/login')) {
    return await handleLoginAPI(req, res);
  }

  // Bypass authentication for health check
  if (req.method === "GET" && req.query.health === "1") {
    return res.status(200).json({
      success: true,
      message: "API is healthy",
      timestamp: new Date().toISOString(),
      method: req.method,
      headers: Object.keys(req.headers)
    });
  }



  // Parse body early for all endpoints
  let body = req.body;
  if (!body || Object.keys(body).length === 0) {
    body = {
      tableName: req.query.tableName,
      action: req.query.action,
      data: (() => {
        if (!req.query.data) return undefined;
        try { return JSON.parse(req.query.data); }
        catch { return undefined; }
      })(),
      params: {
        id: req.query.id,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder,
        search: req.query.search,
      },
    };
  }
  req.body = body; // Update req.body with parsed data

  // Catch-all endpoint for requests that don't match specific patterns
  if (req.method === "GET" && !req.query.tableName && !req.query.health && !req.query.debug && !req.query.debugUser && !req.query.clearCache && !req.query.checkPermissions && !req.query.testOAuth && !req.query.selftest && !req.query.listWorkspaces && !req.query.testWithToken && !req.query.exchangeCode) {
    return res.status(400).json({
      error: "Invalid request",
      message: "This endpoint requires specific query parameters. Available endpoints:",
      endpoints: [
        "?health=1 - Check API health",
        "?debug=1 - Show environment variables",
        "?debugUser=1 - Show OAuth token user info",
        "?clearCache=1 - Clear cached OAuth token",
        "?checkPermissions=1 - Check current user's workspace permissions",
        "?testOAuth=1 - Test OAuth token exchange",
        "?selftest=1 - Test workspace access",
        "?listWorkspaces=1 - List available workspaces",
        "?tableName=TABLE_NAME&action=ACTION - Access Zoho Analytics data"
      ],
      example: "?tableName=employee_commissions_DC&action=records"
    });
  }

  // Health
  if (req.method === "GET" && req.query.health === "1") {
    const t = await getSharedToken();
    const backoff = await getSharedBackoffUntil();
    return res.status(200).json({
      ok: true,
      tokenCached: !!(t && Date.now() < t.expiresAt),
      backoffRemainingMs: Math.max(0, backoff - Date.now()),
      timestamp: new Date().toISOString()
    });
  }

  // Debug environment variables
  if (req.method === "GET" && req.query.debug === "1") {
    const rt = process.env.ZOHO_REFRESH_TOKEN || process.env.REACT_APP_ZOHO_REFRESH_TOKEN || "";
    const cid = process.env.ZOHO_CLIENT_ID || process.env.REACT_APP_ZOHO_CLIENT_ID || "";
    const dc  = process.env.ZOHO_DC || "com";
    const wsid = process.env.ZOHO_WORKSPACE_ID || process.env.REACT_APP_ZOHO_WORKSPACE_ID || "";
    const orgid = process.env.ZOHO_ORG_ID || process.env.REACT_APP_ZOHO_ORG_ID || "";
    
    return res.status(200).json({
      dc,
      refreshTokenSet: !!rt,
      clientIdSet: !!cid,
      workspaceIdSet: !!wsid,
      orgIdSet: !!orgid,
      // Debug-safe fingerprints (no secrets)
      refreshTokenLen: rt ? rt.length : 0,
      refreshTokenPrefix: rt ? rt.slice(0, 6) : null,
      clientIdSuffix: cid ? cid.slice(-6) : null,
      clientIdFull: cid, // Show full client ID for debugging
      workspaceId: wsid,
      orgId: orgid,
      accountsHost: `https://accounts.zoho.${dc}`,
      analyticsHost: `https://analyticsapi.zoho.${dc}`,
      env: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown"
    });
  }

  // Debug OAuth token user info
  if (req.method === "GET" && req.query.debugUser === "1") {
    try {
      const token = await getAccessTokenShared({
        refreshToken: process.env.ZOHO_REFRESH_TOKEN || process.env.REACT_APP_ZOHO_REFRESH_TOKEN,
        clientId: process.env.ZOHO_CLIENT_ID || process.env.REACT_APP_ZOHO_CLIENT_ID,
        clientSecret: process.env.ZOHO_CLIENT_SECRET || process.env.REACT_APP_ZOHO_CLIENT_SECRET,
      });
      
      // Try to get user info from Zoho
      const response = await axios.get(`https://accounts.zoho.com/oauth/user/info`, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      return res.status(200).json({
        success: true,
        userInfo: response.data,
        tokenPrefix: token ? token.slice(0, 10) + '...' : 'No token'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        details: error.response?.data || 'No response data'
      });
    }
  }

  // Clear cached OAuth token
  if (req.method === "GET" && req.query.clearCache === "1") {
    try {
      await clearSharedToken();
      return res.status(200).json({
        success: true,
        message: "Cached OAuth token cleared. Next request will generate a new token from the refresh token."
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Check user workspace permissions
  if (req.method === "GET" && req.query.checkPermissions === "1") {
    try {
      const token = await getAccessTokenShared({
        refreshToken: process.env.ZOHO_REFRESH_TOKEN || process.env.REACT_APP_ZOHO_REFRESH_TOKEN,
        clientId: process.env.ZOHO_CLIENT_ID || process.env.REACT_APP_ZOHO_CLIENT_ID,
        clientSecret: process.env.ZOHO_CLIENT_SECRET || process.env.REACT_APP_ZOHO_CLIENT_SECRET,
      });
      
      const workspaceId = process.env.ZOHO_WORKSPACE_ID || process.env.REACT_APP_ZOHO_WORKSPACE_ID;
      const orgId = process.env.ZOHO_ORG_ID || process.env.REACT_APP_ZOHO_ORG_ID;
      
      const headers = {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      };
      if (orgId) headers['ZANALYTICS-ORGID'] = orgId;
      
      // Try to get workspace details to check permissions
      const response = await axios.get(`${BASE_URL}/workspaces/${workspaceId}`, { headers });
      
      return res.status(200).json({
        success: true,
        workspaceInfo: response.data,
        currentUser: "Dev Team (customerservice@disbursecloud.com)",
        message: "Check the workspaceInfo to see current user's role and permissions"
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        details: error.response?.data || 'No response data',
        currentUser: "Dev Team (customerservice@disbursecloud.com)"
      });
    }
  }

  // Test OAuth endpoint
  if (req.method === "GET" && req.query.testOAuth === "1") {
    try {
      const refreshToken = process.env.ZOHO_REFRESH_TOKEN || process.env.REACT_APP_ZOHO_REFRESH_TOKEN;
      const clientId     = process.env.ZOHO_CLIENT_ID     || process.env.REACT_APP_ZOHO_CLIENT_ID;
      const clientSecret = process.env.ZOHO_CLIENT_SECRET || process.env.REACT_APP_ZOHO_CLIENT_SECRET;
      const dc = process.env.ZOHO_DC || "com";

      if (!refreshToken || !clientId || !clientSecret) {
        return res.status(500).json({ success:false, error:"Missing envs", have:{
          refreshToken: !!refreshToken, clientId: !!clientId, clientSecret: !!clientSecret
        }});
      }

      const params = new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        // some setups require the original redirect_uri even for refresh
        redirect_uri: 'https://dc-commissions.vercel.app/oauth-callback.html',
      });

      const resp = await axios.post(
        `https://accounts.zoho.${dc}/oauth/v2/token`,
        params,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
      );

      return res.status(200).json({
        success: true,
        status: resp.status,
        access_token: resp.data?.access_token,
        data: {
          scope: resp.data?.scope,
          expires_in: resp.data?.expires_in,
          token_type: resp.data?.token_type,
        },
        hasAccessToken: !!resp.data?.access_token
      });
    } catch (error) {
      const isHtml = typeof error.response?.data === 'string' && /<html/i.test(error.response.data);
      const hint = isHtml ? "Zoho returned HTML (likely wrong DC or client mismatch). Check ZOHO_DC and that the refresh token belongs to this client_id." : null;
      
      return res.status(500).json({
        success: false,
        status: error.response?.status,
        // show a concise upstream hint; Zoho sometimes returns HTML on DC/client mismatch
        upstreamType: typeof error.response?.data,
        upstreamSnip: typeof error.response?.data === 'string'
          ? String(error.response.data).slice(0, 250)
          : error.response?.data,
        message: error.message,
        hint
      });
    }
  }

  // Self-test endpoint to check if we can list views
  if (req.method === "GET" && req.query.selftest === "1") {
    try {
      const refreshToken = process.env.ZOHO_REFRESH_TOKEN || process.env.REACT_APP_ZOHO_REFRESH_TOKEN;
      const clientId = process.env.ZOHO_CLIENT_ID || process.env.REACT_APP_ZOHO_CLIENT_ID;
      const clientSecret = process.env.ZOHO_CLIENT_SECRET || process.env.REACT_APP_ZOHO_CLIENT_SECRET;
      const workspaceId = process.env.ZOHO_WORKSPACE_ID || process.env.REACT_APP_ZOHO_WORKSPACE_ID;
      const orgId = process.env.ZOHO_ORG_ID || process.env.REACT_APP_ZOHO_ORG_ID;
      
      if (!refreshToken || !clientId || !clientSecret || !workspaceId || !orgId) {
        return res.status(500).json({ ok: false, where: 'selftest', details: 'Missing credentials' });
      }
      
      const token = await getAccessTokenShared({ refreshToken, clientId, clientSecret });
      const h = headersFor(token, orgId);
      const r = await axios.get(`${BASE_URL}/workspaces/${workspaceId}/views`, { headers: h });
      return res.status(200).json({ ok: true, count: r.data?.views?.length, sample: r.data?.views?.slice(0,3) });
    } catch (e) {
      return res.status(e?.response?.status || 500).json({ ok: false, where: 'selftest', details: e?.response?.data || String(e) });
    }
  }

  // Diagnostic endpoint to check if a row exists
  if (req.method === "GET" && req.query.selftest === "rowExists") {
    try {
      const { tableName, rowId } = req.query;
      if (!tableName || !rowId) {
        return res.status(400).json({ error: "Missing tableName or rowId" });
      }
      
      const refreshToken = process.env.ZOHO_REFRESH_TOKEN || process.env.REACT_APP_ZOHO_REFRESH_TOKEN;
      const clientId = process.env.ZOHO_CLIENT_ID || process.env.REACT_APP_ZOHO_CLIENT_ID;
      const clientSecret = process.env.ZOHO_CLIENT_SECRET || process.env.REACT_APP_ZOHO_CLIENT_SECRET;
      const workspaceId = process.env.ZOHO_WORKSPACE_ID || process.env.REACT_APP_ZOHO_WORKSPACE_ID;
      const orgId = process.env.ZOHO_ORG_ID || process.env.REACT_APP_ZOHO_ORG_ID;
      
      const token = await getAccessTokenShared({ refreshToken, clientId, clientSecret });
      const h = headersFor(token, orgId);
      
      // Use the known table ID directly instead of searching
      const tableId = TABLE_IDS[tableName];
      if (!tableId) {
        return res.status(404).json({ error: `Table ${tableName} not found in TABLE_IDS mapping` });
      }
      
      const dataUrl = `${BASE_URL}/workspaces/${workspaceId}/views/${encodeURIComponent(tableId)}/data`;
      const checkCfg = { responseFormat: "json", keyValueFormat: true, criteria: `id=${rowId}` };
      const r = await axios.get(dataUrl, { headers: h, params: { CONFIG: JSON.stringify(checkCfg) } });
      
      return res.status(200).json({ 
        ok: true, 
        rowExists: Array.isArray(r.data?.data) && r.data.data.length > 0,
        rowData: r.data?.data?.[0] || null,
        totalRows: r.data?.data?.length || 0,
        tableId: tableId,
        workspaceId: workspaceId
      });
    } catch (e) {
      return res.status(e?.response?.status || 500).json({ 
        ok: false, 
        error: "Row check failed", 
        details: e?.response?.data || String(e) 
      });
    }
  }

  // Diagnostic endpoint to get view info
  if (req.method === "GET" && req.query.selftest === "viewInfo") {
    try {
      const { workspaceId, viewId } = req.query;
      if (!workspaceId || !viewId) {
        return res.status(400).json({ error: "Missing workspaceId or viewId" });
      }
      
      const refreshToken = process.env.ZOHO_REFRESH_TOKEN || process.env.REACT_APP_ZOHO_REFRESH_TOKEN;
      const clientId = process.env.ZOHO_CLIENT_ID || process.env.REACT_APP_ZOHO_CLIENT_ID;
      const clientSecret = process.env.ZOHO_CLIENT_SECRET || process.env.REACT_APP_ZOHO_CLIENT_SECRET;
      
      const token = await getAccessTokenShared({ refreshToken, clientId, clientSecret });
      const h = { Authorization: `Zoho-oauthtoken ${token}`, "Content-Type": "application/json" };
      const url = `${BASE_URL}/workspaces/${workspaceId}/views/${encodeURIComponent(viewId)}`;
      const r = await axios.get(url, { headers: h });
      return res.status(200).json({ ok: true, viewInfo: r.data });
    } catch (e) {
      return res.status(e?.response?.status || 500).json({ 
        ok: false, 
        details: e?.response?.data || String(e) 
      });
    }
  }

  // Diagnostic endpoint to get columns info
  if (req.method === "GET" && req.query.selftest === "columns") {
    try {
      const { workspaceId, viewId } = req.query;
      if (!workspaceId || !viewId) {
        return res.status(400).json({ error: "Missing workspaceId or viewId" });
      }
      
      const refreshToken = process.env.ZOHO_REFRESH_TOKEN || process.env.REACT_APP_ZOHO_REFRESH_TOKEN;
      const clientId = process.env.ZOHO_CLIENT_ID || process.env.REACT_APP_ZOHO_CLIENT_ID;
      const clientSecret = process.env.ZOHO_CLIENT_SECRET || process.env.REACT_APP_ZOHO_CLIENT_SECRET;
      
      const token = await getAccessTokenShared({ refreshToken, clientId, clientSecret });
      const h = { Authorization: `Zoho-oauthtoken ${token}`, "Content-Type": "application/json" };
      const url = `${BASE_URL}/workspaces/${workspaceId}/views/${encodeURIComponent(viewId)}/columns`;
      const r = await axios.get(url, { headers: h });
      
      // Return just the useful bits
      const cols = (r.data?.columns || []).map(c => ({
        name: c.columnName || c.name,
        label: c.displayName || c.label,
        dataType: c.dataType,
        editable: c.isEditable ?? !c.isFormula,
        isFormula: !!c.isFormula,
      }));
      return res.status(200).json({ ok: true, columns: cols });
    } catch (e) {
      return res.status(e?.response?.status || 500).json({ 
        ok: false, 
        details: e?.response?.data || String(e) 
      });
    }
  }

  // List workspaces endpoint
  if (req.method === "GET" && req.query.listWorkspaces === "1") {
    try {
      const refreshToken = process.env.ZOHO_REFRESH_TOKEN || process.env.REACT_APP_ZOHO_REFRESH_TOKEN;
      const clientId = process.env.ZOHO_CLIENT_ID || process.env.REACT_APP_ZOHO_CLIENT_ID;
      const clientSecret = process.env.ZOHO_CLIENT_SECRET || process.env.REACT_APP_ZOHO_CLIENT_SECRET;
      const orgId = process.env.ZOHO_ORG_ID || process.env.REACT_APP_ZOHO_ORG_ID;
      
      if (!refreshToken || !clientId || !clientSecret || !orgId) {
        return res.status(500).json({ ok: false, where: 'listWorkspaces', details: 'Missing credentials' });
      }
      
      const token = await getAccessTokenShared({ refreshToken, clientId, clientSecret });
      const h = headersFor(token, orgId);
      const r = await axios.get(`${BASE_URL}/workspaces`, { headers: h });
      return res.status(200).json({ ok: true, workspaces: r.data?.workspaces || [] });
    } catch (e) {
      return res.status(e?.response?.status || 500).json({ ok: false, where: 'listWorkspaces', details: e?.response?.data || String(e) });
    }
  }

  // Exchange authorization code for refresh token
  if (req.method === "POST" && req.query.exchangeCode === "1") {
    try {
      const { code, redirect_uri, client_id, client_secret, data_center } = req.body;
      
      // Use provided client_id, client_secret, and data_center, or fall back to environment variables
      const clientId = client_id || process.env.ZOHO_CLIENT_ID || process.env.REACT_APP_ZOHO_CLIENT_ID;
      const clientSecret = client_secret || process.env.ZOHO_CLIENT_SECRET || process.env.REACT_APP_ZOHO_CLIENT_SECRET;
      const dc = data_center || process.env.ZOHO_DC || 'com';
      
      if (!code || !redirect_uri) {
        return res.status(400).json({
          error: "Missing code or redirect_uri in request body"
        });
      }
      
      if (!clientId || !clientSecret) {
        return res.status(400).json({
          error: "Missing client_id or client_secret"
        });
      }
      
      const resp = await axios.post(
        `https://accounts.zoho.${dc}/oauth/v2/token`,
        new URLSearchParams({
          code: code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirect_uri,
          grant_type: 'authorization_code',
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
      );
      
      return res.status(200).json({
        success: true,
        status: resp.status,
        data: resp.data,
        refreshToken: resp.data.refresh_token,
        accessToken: resp.data.access_token,
        fullResponse: resp.data,
        hasRefreshToken: !!resp.data.refresh_token,
        hasAccessToken: !!resp.data.access_token
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
        fullError: JSON.stringify(error.response?.data, null, 2)
      });
    }
  }

  // Test with current access token
  if (req.method === "GET" && req.query.testWithToken === "1") {
    try {
      const accessToken = "1000.18b11fa426b4ab1043aab0eb95ffa79f.3067a1340f42c7c57668955a8f535e18";
      const orgId = process.env.ZOHO_ORG_ID || process.env.REACT_APP_ZOHO_ORG_ID;
      const workspaceId = process.env.ZOHO_WORKSPACE_ID || process.env.REACT_APP_ZOHO_WORKSPACE_ID;
      
      if (!orgId || !workspaceId) {
        return res.status(500).json({ ok: false, error: 'Missing orgId or workspaceId' });
      }
      
      const h = headersFor(accessToken, orgId);
      const r = await axios.get(`${BASE_URL}/workspaces/${workspaceId}/views`, { headers: h });
      return res.status(200).json({ 
        ok: true, 
        count: r.data?.views?.length, 
        sample: r.data?.views?.slice(0,3),
        message: 'API working with current access token'
      });
    } catch (e) {
      return res.status(e?.response?.status || 500).json({ 
        ok: false, 
        error: e?.response?.data || String(e),
        message: 'API failed with current access token'
      });
    }
  }

  // Debug view information
  if (req.method === "GET" && req.query.selftest === "viewInfo") {
    try {
      const token = await getAccessTokenShared({
        refreshToken: process.env.ZOHO_REFRESH_TOKEN || process.env.REACT_APP_ZOHO_REFRESH_TOKEN,
        clientId: process.env.ZOHO_CLIENT_ID || process.env.REACT_APP_ZOHO_CLIENT_ID,
        clientSecret: process.env.ZOHO_CLIENT_SECRET || process.env.REACT_APP_ZOHO_CLIENT_SECRET,
      });
      const h = {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
      };
      const url = `${BASE_URL}/workspaces/${req.query.workspaceId}/views/${req.query.viewId}`;
      const r = await axios.get(url, { headers: h });
      return res.status(200).json({ ok: true, viewInfo: r.data });
    } catch (e) {
      return res.status(e?.response?.status || 500).json({ ok:false, details: e?.response?.data || String(e) });
    }
  }

  // Debug view columns using SQL query approach
  if (req.method === "GET" && req.query.selftest === "columns") {
    try {
      const workspaceId = req.query.workspaceId || process.env.ZOHO_WORKSPACE_ID || process.env.REACT_APP_ZOHO_WORKSPACE_ID;
      const viewId = req.query.viewId;
      const orgId = process.env.ZOHO_ORG_ID || process.env.REACT_APP_ZOHO_ORG_ID;
      
      if (!workspaceId || !viewId) {
        return res.status(400).json({ 
          ok: false, 
          error: "Missing required parameters",
          required: ["workspaceId", "viewId"],
          provided: { workspaceId: !!workspaceId, viewId: !!viewId }
        });
      }

      const token = await getAccessTokenShared({
        refreshToken: process.env.ZOHO_REFRESH_TOKEN || process.env.REACT_APP_ZOHO_REFRESH_TOKEN,
        clientId: process.env.ZOHO_CLIENT_ID || process.env.REACT_APP_ZOHO_CLIENT_ID,
        clientSecret: process.env.ZOHO_CLIENT_SECRET || process.env.REACT_APP_ZOHO_CLIENT_SECRET,
      });
      
      const headers = {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
      };
      if (orgId) headers['ZANALYTICS-ORGID'] = orgId;
      
      // Use data endpoint for column discovery with form data
      const sqlQuery = `SELECT * FROM revenue_master_view LIMIT 1`;
      console.log('🔍 Executing column discovery query:', sqlQuery);
      
      const formData = new URLSearchParams();
      formData.append('responseFormat', 'json');
      formData.append('outputFormat', 'json');
      formData.append('query', sqlQuery);
      
      const response = await axios.post(`${BASE_URL}/workspaces/${workspaceId}/data`, formData, {
        headers: {
          ...headers,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      let columnInfo = [];
      
      // Extract column information from the response
      if (response.data?.data && response.data.data.length > 0) {
        const firstRow = response.data.data[0];
        columnInfo = Object.keys(firstRow).map(key => ({
          columnName: key,
          dataType: typeof firstRow[key],
          displayName: key,
          isVisible: true,
          sampleValue: firstRow[key]
        }));
      } else if (response.data?.columns) {
        columnInfo = response.data.columns.map(col => ({
          columnName: col.columnName || col.name || col,
          dataType: col.dataType || col.type || 'unknown',
          displayName: col.displayName || col.columnName || col.name || col,
          isVisible: col.isVisible !== false
        }));
      }
      
      return res.status(200).json({ 
        ok: true, 
        workspaceId,
        viewId,
        columnCount: columnInfo.length,
        columns: columnInfo,
        sqlQuery: sqlQuery,
        rawResponse: response.data
      });
    } catch (e) {
      return res.status(e?.response?.status || 500).json({ 
        ok: false, 
        error: e?.response?.data || e.message || String(e),
        details: {
          status: e?.response?.status,
          statusText: e?.response?.statusText,
          url: e?.config?.url,
          sqlQuery: `SELECT * FROM revenue_master_view LIMIT 1`
        }
      });
    }
  }

  // Add workspace users
  if (req.method === "POST" && req.query.action === "addUser") {
    try {
      const { emailIds, role = "USER" } = req.body;
      
      if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
        return res.status(400).json({ 
          error: "Missing or invalid emailIds", 
          message: "Please provide an array of email addresses to add" 
        });
      }

      const token = await getAccessTokenShared({
        refreshToken: process.env.ZOHO_REFRESH_TOKEN || process.env.REACT_APP_ZOHO_REFRESH_TOKEN,
        clientId: process.env.ZOHO_CLIENT_ID || process.env.REACT_APP_ZOHO_CLIENT_ID,
        clientSecret: process.env.ZOHO_CLIENT_SECRET || process.env.REACT_APP_ZOHO_CLIENT_SECRET,
      });

      const workspaceId = process.env.ZOHO_WORKSPACE_ID || process.env.REACT_APP_ZOHO_WORKSPACE_ID;
      const orgId = process.env.ZOHO_ORG_ID || process.env.REACT_APP_ZOHO_ORG_ID;

      if (!workspaceId || !orgId) {
        return res.status(500).json({ 
          error: "Missing workspace or organization configuration" 
        });
      }

      const config = {
        emailIds: emailIds,
        role: role
      };

      const h = {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'ZANALYTICS-ORGID': orgId
      };

      const url = `${BASE_URL}/workspaces/${workspaceId}/users`;
      const params = new URLSearchParams({
        CONFIG: JSON.stringify(config)
      });

      const response = await axios.post(url, params, { headers: h });
      
      return res.status(200).json({ 
        success: true, 
        message: `Successfully added ${emailIds.length} user(s) to workspace`,
        addedUsers: emailIds,
        role: role,
        status: response.status
      });

    } catch (error) {
      console.error('Error adding workspace users:', error.response?.data || error.message);
      return res.status(error.response?.status || 500).json({
        error: "Failed to add users to workspace",
        details: error.response?.data || error.message,
        message: "Make sure the user performing this action has workspace admin permissions"
      });
    }
  }

  const { tableName, action, data, params, query } = req.body || {};
  
  // Validate input for POST requests to main API
  if (req.method === 'POST' && path === '/api/zoho-analytics') {
    // Skip validation for sync endpoints that don't require tableName
    const syncActions = ['sync-all-tables', 'sync-status', 'init-schema', 'add-emp-id-column', 'clear-revenue-data', 'debug-commission-mapping'];
    const requiresTableName = !syncActions.includes(action);
    
    if (requiresTableName && !validateInput(req, res, ['tableName', 'action'])) {
      return; // Validation failed, response already sent
    } else if (!requiresTableName && !validateInput(req, res, ['action'])) {
      return; // Validation failed, response already sent
    }
  }
  
  // Debug logging
  console.log('🔍 API Request Debug:', {
    method: req.method,
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    tableName,
    action,
    hasQuery: !!query,
    queryPreview: query ? query.substring(0, 100) + '...' : null
  });

  // Simple test endpoint to verify API is working
  if (req.method === "POST" && tableName === "test" && action === "ping") {
    return res.status(200).json({
      success: true,
      message: "API is working",
      received: { tableName, action, query },
      timestamp: new Date().toISOString()
    });
  }

  // Environment check endpoint
  if (req.method === "POST" && tableName === "test" && action === "env") {
    const envCheck = {
      ZOHO_REFRESH_TOKEN: !!process.env.ZOHO_REFRESH_TOKEN,
      ZOHO_CLIENT_ID: !!process.env.ZOHO_CLIENT_ID,
      ZOHO_CLIENT_SECRET: !!process.env.ZOHO_CLIENT_SECRET,
      ZOHO_WORKSPACE_ID: !!process.env.ZOHO_WORKSPACE_ID,
      ZOHO_ORG_ID: !!process.env.ZOHO_ORG_ID,
      REACT_APP_ZOHO_REFRESH_TOKEN: !!process.env.REACT_APP_ZOHO_REFRESH_TOKEN,
      REACT_APP_ZOHO_CLIENT_ID: !!process.env.REACT_APP_ZOHO_CLIENT_ID,
      REACT_APP_ZOHO_CLIENT_SECRET: !!process.env.REACT_APP_ZOHO_CLIENT_SECRET,
      REACT_APP_ZOHO_WORKSPACE_ID: !!process.env.REACT_APP_ZOHO_WORKSPACE_ID,
      REACT_APP_ZOHO_ORG_ID: !!process.env.REACT_APP_ZOHO_ORG_ID
    };
    return res.status(200).json({
      success: true,
      message: "Environment variables check",
      env: envCheck,
      timestamp: new Date().toISOString()
    });
  }
  
  // Handle CSV file import for revenue_master_view
  if (action === 'import-csv') {
    try {
      console.log('📁 CSV import requested for revenue_master_view');
      
      // Validate request method
      if (req.method !== 'POST') {
        return res.status(405).json({
          error: "Method not allowed",
          details: "CSV import endpoint only accepts POST requests",
          allowedMethods: ['POST']
        });
      }

      // Check if CSV data is provided in the request body
      if (req.body && req.body.csvData) {
        console.log('📁 Using CSV data from request body');
        const csvContent = req.body.csvData;
        
        // Parse CSV with headers
        const { parse } = await import('csv-parse/sync');
        const records = parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });

        console.log(`📊 Parsed ${records.length} records from CSV data`);

        // Sync the data to database
        const syncResult = await syncRevenueData(records, 'csv-import', 'full');
        
        return res.status(200).json({
          success: true,
          message: `Successfully imported ${records.length} records from CSV`,
          syncResult,
          source: 'csv-upload',
          timestamp: new Date().toISOString()
        });
      } else {
        // Fallback: Try to import CSV data directly from the local file
        try {
          const fs = await import('fs');
          const path = await import('path');
          const { parse } = await import('csv-parse/sync');
          
          const csvPath = path.join(process.cwd(), 'data_tables', 'revenue_master_view.csv');
          
          if (fs.existsSync(csvPath)) {
            console.log('📁 Reading CSV file from:', csvPath);
            const csvContent = fs.readFileSync(csvPath, 'utf-8');
            
            // Parse CSV with headers
            const records = parse(csvContent, {
              columns: true,
              skip_empty_lines: true,
              trim: true
            });

            console.log(`📊 Parsed ${records.length} records from CSV file`);

            // Sync the data to database
            const syncResult = await syncRevenueData(records, 'csv-import', 'full');
            
            return res.status(200).json({
              success: true,
              message: `Successfully imported ${records.length} records from CSV file`,
              syncResult,
              source: 'csv-file',
              timestamp: new Date().toISOString()
            });
          } else {
            return res.status(404).json({
              error: "CSV file not found",
              details: `revenue_master_view.csv not found at ${csvPath}`,
              suggestion: "Please ensure the CSV file is in the data_tables directory"
            });
          }
        } catch (fileError) {
          console.log('📁 CSV file not available, falling back to API aggregation...');
        }
      }

      // Fallback: Use API aggregation with all available tables
      console.log('🔄 Using API aggregation fallback for CSV import...');
      
      const refreshToken = process.env.ZOHO_REFRESH_TOKEN || process.env.REACT_APP_ZOHO_REFRESH_TOKEN;
      const clientId = process.env.ZOHO_CLIENT_ID || process.env.REACT_APP_ZOHO_CLIENT_ID;
      const clientSecret = process.env.ZOHO_CLIENT_SECRET || process.env.REACT_APP_ZOHO_CLIENT_SECRET;
      const workspaceId = process.env.ZOHO_WORKSPACE_ID || process.env.REACT_APP_ZOHO_WORKSPACE_ID;
      const orgId = process.env.ZOHO_ORG_ID || process.env.REACT_APP_ZOHO_ORG_ID;
      
      if (!refreshToken || !clientId || !clientSecret || !workspaceId || !orgId) {
        return res.status(400).json({ 
          error: "Zoho Analytics credentials not configured",
          details: {
            refreshToken: !!refreshToken,
            clientId: !!clientId,
            clientSecret: !!clientSecret,
            workspaceId: !!workspaceId,
            orgId: !!orgId
          }
        });
      }
      
      const cfg = { refreshToken, clientId, clientSecret };
      const token = await getAccessTokenShared(cfg);
      
      // Aggregate data from all available tables
      const allTables = [
        'employee_commissions_DC', 
        'insurance_companies_DC', 
        'monthly_interchange_income_DC',
        'monthly_interest_revenue_DC',
        'referral_partners_DC',
        'company_upcharge_fees_DC',
        'payment_modalities'
      ];
      
      let aggregatedData = [];
      
      for (const tableName of allTables) {
        try {
          const tableId = TABLE_IDS[tableName] || tableName;
          const dataUrl = `${BASE_URL}/workspaces/${workspaceId}/views/${encodeURIComponent(tableId)}/data`;
          const config = { responseFormat: "json", keyValueFormat: true };
          
          const doCall = async (forcedTok) => {
            const h = headersFor(forcedTok, orgId);
            return axios.get(dataUrl, { headers: h, params: { CONFIG: JSON.stringify(config) } });
          };

          const resp = await withTokenRetry(doCall, cfg);
          
          if (resp.data?.data && resp.data.data.length > 0) {
            // Add table source to each row
            const tableData = resp.data.data.map(row => ({
              ...row,
              _source_table: tableName
            }));
            aggregatedData = aggregatedData.concat(tableData);
            console.log(`📊 Added ${tableData.length} rows from ${tableName}`);
          }
        } catch (tableError) {
          console.log(`⚠️ Failed to fetch from ${tableName}:`, tableError.message);
        }
      }
      
      if (aggregatedData.length > 0) {
        // Sync the aggregated data to database
        const syncResult = await syncRevenueData(aggregatedData, 'api-aggregation', 'full');
        
        return res.status(200).json({
          success: true,
          message: `Successfully imported ${aggregatedData.length} records from API aggregation`,
          syncResult,
          source: 'api-aggregation',
          tablesUsed: allTables,
          timestamp: new Date().toISOString()
        });
      } else {
        return res.status(404).json({
          error: "No data available",
          details: "Could not import data from CSV file or API aggregation",
          suggestion: "Please check your Zoho Analytics credentials and table access"
        });
      }
      
    } catch (error) {
      console.error('❌ CSV import failed:', error);
      return res.status(500).json({
        error: "CSV import failed",
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Handle database-backed refresh with date filtering
  if (action === 'refresh') {
    try {
      console.log('🔄 Manual refresh requested for revenue_master_view');
      
      // Validate request method
      if (req.method !== 'POST') {
        return res.status(405).json({
          error: "Method not allowed",
          details: "Refresh endpoint only accepts POST requests",
          allowedMethods: ['POST']
        });
      }

      // Validate required parameters
      if (!tableName || tableName !== 'revenue_master_view') {
        return res.status(400).json({
          error: "Invalid table name",
          details: "tableName must be 'revenue_master_view'",
          received: tableName
        });
      }

      if (!action || action !== 'refresh') {
        return res.status(400).json({
          error: "Invalid action",
          details: "action must be 'refresh'",
          received: action
        });
      }
      
      const refreshToken = process.env.ZOHO_REFRESH_TOKEN || process.env.REACT_APP_ZOHO_REFRESH_TOKEN;
      const clientId = process.env.ZOHO_CLIENT_ID || process.env.REACT_APP_ZOHO_CLIENT_ID;
      const clientSecret = process.env.ZOHO_CLIENT_SECRET || process.env.REACT_APP_ZOHO_CLIENT_SECRET;
      const workspaceId = process.env.ZOHO_WORKSPACE_ID || process.env.REACT_APP_ZOHO_WORKSPACE_ID;
      const orgId = process.env.ZOHO_ORG_ID || process.env.REACT_APP_ZOHO_ORG_ID;
      
      if (!refreshToken || !clientId || !clientSecret || !workspaceId || !orgId) {
        return res.status(400).json({ 
          error: "Zoho Analytics credentials not configured",
          details: {
            refreshToken: !!refreshToken,
            clientId: !!clientId,
            clientSecret: !!clientSecret,
            workspaceId: !!workspaceId,
            orgId: !!orgId
          },
          timestamp: new Date().toISOString()
        });
      }
      
      const cfg = { refreshToken, clientId, clientSecret };
      const token = await getAccessTokenShared(cfg);
      const tableId = TABLE_IDS[tableName] || tableName;
      
      // Parse date range from request (default to last 3 months)
      const { startDate, endDate, syncType = 'incremental' } = req.body;
      const defaultStartDate = new Date();
      defaultStartDate.setMonth(defaultStartDate.getMonth() - 3);
      
      const effectiveStartDate = startDate ? new Date(startDate) : defaultStartDate;
      const effectiveEndDate = endDate ? new Date(endDate) : new Date();
      
      console.log(`🔄 Database-backed refresh initiated for ${tableName}...`);
      console.log(`📅 Date range: ${effectiveStartDate.toISOString().split('T')[0]} to ${effectiveEndDate.toISOString().split('T')[0]}`);
      console.log(`🔄 Sync type: ${syncType}`);

      // Try different approaches to get the data
      let allData = [];
      let fetchMethod = 'unknown';
      
      // Method 1: Try date-filtered query for revenue_master_view
      if (tableName === 'revenue_master_view') {
        try {
          console.log('📊 Trying date-filtered SQL query...');
          
          // Build date-filtered SQL query
          const dateFilter = `WHERE transaction_date >= '${effectiveStartDate.toISOString().split('T')[0]}' 
                             AND transaction_date <= '${effectiveEndDate.toISOString().split('T')[0]}'`;
          
          const sqlQuery = `
            SELECT * FROM revenue_master_view 
            ${dateFilter}
            ORDER BY transaction_date DESC
          `;
          
          console.log(`🔍 SQL Query: ${sqlQuery}`);
          
          // Use form data for SQL queries
          const formData = new URLSearchParams();
          formData.append('query', sqlQuery);
          
          const response = await axios.post(
            `${BASE_URL}/workspaces/${workspaceId}/query`,
            formData,
            {
              headers: {
                ...headersFor(token, orgId),
                'Content-Type': 'application/x-www-form-urlencoded'
              }
            }
          );
          
          if (response.data?.data && response.data.data.length > 0) {
            allData = response.data.data;
            fetchMethod = 'date-filtered-sql';
            console.log(`📊 Date-filtered SQL: Retrieved ${allData.length} rows`);
          } else {
            console.log('⚠️ Date-filtered SQL returned no data');
          }
        } catch (sqlError) {
          console.log('⚠️ Date-filtered SQL failed:', sqlError.response?.data?.summary || sqlError.message);
        }
      }
      
      // Method 2: Try the same approach that's working for the current system (fallback)
      if (allData.length === 0) {
        try {
          console.log('📊 Trying current working method (fallback)...');
          
          // Use the same logic as the working records endpoint
          const dataUrl = `${BASE_URL}/workspaces/${workspaceId}/views/${encodeURIComponent(tableId)}/data`;
          const config = { responseFormat: "json", keyValueFormat: true };
          
          console.log(`🔍 Fetching from: ${dataUrl}`);
          console.log(`🔍 Using tableId: ${tableId}`);
          
          const doCall = async (forcedTok) => {
            const h = headersFor(forcedTok, orgId);
            return axios.get(dataUrl, { headers: h, params: { CONFIG: JSON.stringify(config) } });
          };

          const resp = await withTokenRetry(doCall, cfg);
          
          if (resp.data?.data && resp.data.data.length > 0) {
            // Filter data by date range on client side
            const filteredData = resp.data.data.filter(row => {
              const rowDate = new Date(row.transaction_date || row.date || row.created_date);
              return rowDate >= effectiveStartDate && rowDate <= effectiveEndDate;
            });
            
            allData = filteredData;
            fetchMethod = 'working-method-filtered';
            console.log(`📊 Working method (filtered): Retrieved ${allData.length} rows from ${resp.data.data.length} total`);
          } else {
            console.log('⚠️ Working method returned no data');
          }
        } catch (workingError) {
          console.log('⚠️ Working method failed:', workingError.response?.data?.summary || workingError.message);
        }
      }
      
      // Method 2: Try small batch with pagination if working method failed
      if (allData.length === 0) {
        try {
          console.log('📊 Trying paginated fetch...');
          let startIndex = 1;
          const maxRows = 500; // Smaller batches
          let hasMoreData = true;
          let batchCount = 0;
          const maxBatches = 200; // Increased for large datasets (200 × 500 = 100k rows max)
          
          while (hasMoreData && batchCount < maxBatches) {
            const config = {
        responseFormat: 'json',
              keyValueFormat: true,
              startIndex: startIndex,
              maxRows: maxRows
            };
            
            const response = await axios.get(
              `${BASE_URL}/workspaces/${workspaceId}/views/${encodeURIComponent(tableId)}/data`,
              {
                headers: headersFor(token, orgId),
                params: { CONFIG: JSON.stringify(config) }
              }
            );
            
            if (response.data?.data && response.data.data.length > 0) {
              allData = allData.concat(response.data.data);
              batchCount++;
              
              // Progress reporting for large datasets
              const progress = Math.round((batchCount / maxBatches) * 100);
              console.log(`📊 Batch ${batchCount}/${maxBatches}: Fetched ${response.data.data.length} rows, total: ${allData.length} (${progress}% of max capacity)`);
              
              // Memory management: Log memory usage for large datasets
              if (allData.length > 10000 && allData.length % 5000 === 0) {
                console.log(`💾 Memory checkpoint: ${allData.length} rows loaded`);
              }
              
              if (response.data.data.length < maxRows) {
                hasMoreData = false;
                console.log(`✅ Reached end of data at ${allData.length} rows`);
              } else {
                startIndex += maxRows;
              }
            } else {
              hasMoreData = false;
              console.log(`⚠️ No more data returned at batch ${batchCount + 1}`);
            }
          }
          
          if (allData.length > 0) {
            fetchMethod = 'pagination';
          }
        } catch (paginationError) {
          console.log('⚠️ Pagination failed:', paginationError.response?.data?.summary);
        }
      }
      
      // Method 3: Try basic fetch without pagination if other methods failed
      if (allData.length === 0) {
        try {
          console.log('📊 Trying basic fetch...');
          const config = {
            responseFormat: 'json',
            keyValueFormat: true,
            maxRows: 10000 // Try to get up to 10000 rows at once
          };
          
          const response = await axios.get(
            `${BASE_URL}/workspaces/${workspaceId}/views/${encodeURIComponent(tableId)}/data`,
            {
              headers: headersFor(token, orgId),
              params: { CONFIG: JSON.stringify(config) }
            }
          );
          
          if (response.data?.data && response.data.data.length > 0) {
            allData = response.data.data;
            fetchMethod = 'basic';
            console.log(`📊 Basic fetch: Retrieved ${allData.length} rows`);
          }
        } catch (basicError) {
          console.log('⚠️ Basic fetch failed:', basicError.response?.data?.summary);
        }
      }
      
      // Method 4: If revenue_master_view fails, try to aggregate data from working CSV tables
      if (allData.length === 0 && tableName === 'revenue_master_view') {
        try {
          console.log('📊 Trying to aggregate from working CSV tables...');
          
          const workingTables = ['employee_commissions_DC', 'insurance_companies_DC', 'monthly_interchange_income_DC'];
          let aggregatedData = [];
          
          for (const workingTable of workingTables) {
            try {
              const workingTableId = TABLE_IDS[workingTable] || workingTable;
              const dataUrl = `${BASE_URL}/workspaces/${workspaceId}/views/${encodeURIComponent(workingTableId)}/data`;
              const config = { responseFormat: "json", keyValueFormat: true };
              
              const doCall = async (forcedTok) => {
                const h = headersFor(forcedTok, orgId);
                return axios.get(dataUrl, { headers: h, params: { CONFIG: JSON.stringify(config) } });
              };

              const resp = await withTokenRetry(doCall, cfg);
              
              if (resp.data?.data && resp.data.data.length > 0) {
                // Add table source to each row
                const tableData = resp.data.data.map(row => ({
                  ...row,
                  _source_table: workingTable
                }));
                aggregatedData = aggregatedData.concat(tableData);
                console.log(`📊 Added ${tableData.length} rows from ${workingTable}`);
              }
            } catch (tableError) {
              console.log(`⚠️ Failed to fetch from ${workingTable}:`, tableError.message);
            }
          }
          
          if (aggregatedData.length > 0) {
            allData = aggregatedData;
            fetchMethod = 'csv-aggregation';
            console.log(`📊 CSV aggregation: Retrieved ${allData.length} total rows`);
          }
        } catch (aggregationError) {
          console.log('⚠️ CSV aggregation failed:', aggregationError.message);
        }
      }

      if (allData.length > 0) {
        // Sync data to database
        console.log(`💾 Syncing ${allData.length} rows to database...`);
        
        const syncResult = await syncRevenueData(
          allData, 
          fetchMethod, 
          syncType, 
          effectiveStartDate, 
          effectiveEndDate
        );
        
        console.log(`✅ Successfully synced ${tableName}: ${syncResult.recordsInserted} inserted, ${syncResult.recordsUpdated} updated`);
        
        return res.status(200).json({ 
          success: true,
          message: `Successfully synced ${allData.length} rows from ${tableName}`,
          timestamp: new Date().toISOString(),
          fetchMethod: fetchMethod,
          rowCount: allData.length,
          tableName: tableName,
          syncResult: {
            recordsFetched: syncResult.recordsFetched,
            recordsInserted: syncResult.recordsInserted,
            recordsUpdated: syncResult.recordsUpdated,
            durationSeconds: syncResult.durationSeconds
          },
          dateRange: {
            startDate: effectiveStartDate.toISOString().split('T')[0],
            endDate: effectiveEndDate.toISOString().split('T')[0]
          }
        });
      } else {
        throw new Error(`No data could be retrieved from ${tableName} using any method for date range ${effectiveStartDate.toISOString().split('T')[0]} to ${effectiveEndDate.toISOString().split('T')[0]}`);
      }
      
    } catch (error) {
      console.error('🚨 Manual refresh error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      return res.status(error.response?.status || 500).json({
        error: "Manual refresh failed",
        details: error.response?.data || error.message
      });
    }
  }

  // Handle distinct companies request
  if (tableName === 'revenue_master_view' && action === 'companies') {
    try {
      console.log('🏢 Fetching distinct companies from database...');
      
      // Validate request
      if (req.method !== 'POST') {
        return res.status(405).json({
          error: "Method not allowed",
          details: "Companies endpoint only accepts POST requests",
          allowedMethods: ['POST']
        });
      }
      
      const companies = await getDistinctCompanies();
      
      console.log(`✅ Found ${companies.length} companies in database`);
      
      return res.status(200).json({
        rows: companies,
        success: true,
        source: 'database',
        message: `Found ${companies.length} companies`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error fetching companies from database:', error);
      return res.status(500).json({
        error: "Failed to fetch companies from database",
        details: error.message,
        timestamp: new Date().toISOString(),
        action: 'companies',
        tableName: 'revenue_master_view'
      });
    }
  }

  // Handle distinct employees request  
  if (tableName === 'revenue_master_view' && action === 'employees') {
    try {
      console.log('👥 Fetching distinct employees from database...');
      
      // Validate request
      if (req.method !== 'POST') {
        return res.status(405).json({
          error: "Method not allowed",
          details: "Employees endpoint only accepts POST requests",
          allowedMethods: ['POST']
        });
      }
      
      const employees = await getDistinctEmployees();
      
      console.log(`✅ Found ${employees.length} employees in database`);
      
      return res.status(200).json({
        rows: employees,
        success: true,
        source: 'database',
        message: `Found ${employees.length} employees`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error fetching employees from database:', error);
      return res.status(500).json({
        error: "Failed to fetch employees from database", 
        details: error.message,
        timestamp: new Date().toISOString(),
        action: 'employees',
        tableName: 'revenue_master_view'
      });
    }
  }

  // Handle sync all Zoho tables
  if (action === 'sync-all-tables') {
    try {
      console.log('🔄 Sync all tables requested...');
      
      // Validate request method
      if (req.method !== 'POST') {
        return res.status(405).json({
          error: "Method not allowed",
          details: "Sync endpoint only accepts POST requests",
          allowedMethods: ['POST']
        });
      }

      const { syncType = 'full' } = req.body;
      
      console.log(`🚀 Starting sync for all tables (${syncType} sync)...`);
      
      const syncResult = await syncAllTables(syncType);
      
      return res.status(200).json({
        success: true,
        message: `Successfully synced all tables`,
        timestamp: new Date().toISOString(),
        syncResult
      });
      
    } catch (error) {
      console.error('🚨 Sync all tables error:', error);
      return res.status(500).json({
        error: "Sync all tables failed",
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Handle sync individual table
  if (action === 'sync-table') {
    try {
      console.log('🔄 Sync individual table requested...');
      
      // Validate request method
      if (req.method !== 'POST') {
        return res.status(405).json({
          error: "Method not allowed",
          details: "Sync endpoint only accepts POST requests",
          allowedMethods: ['POST']
        });
      }

      const { tableName: syncTableName, syncType = 'full' } = req.body;
      
      if (!syncTableName) {
        return res.status(400).json({
          error: "Missing tableName",
          details: "tableName is required for sync-table action"
        });
      }
      
      console.log(`🚀 Starting sync for table: ${syncTableName} (${syncType} sync)...`);
      
      const syncResult = await syncTableData(syncTableName, syncType);
      
      return res.status(200).json({
        success: true,
        message: `Successfully synced ${syncTableName}`,
        timestamp: new Date().toISOString(),
        syncResult
      });
      
    } catch (error) {
      console.error('🚨 Sync table error:', error);
      return res.status(500).json({
        error: "Sync table failed",
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Handle get sync status for all tables
  if (action === 'sync-status') {
    try {
      console.log('📊 Getting sync status for all tables...');
      
      // Validate request method
      if (req.method !== 'POST') {
        return res.status(405).json({
          error: "Method not allowed",
          details: "Sync status endpoint only accepts POST requests",
          allowedMethods: ['POST']
        });
      }
      
      const syncStatus = await getZohoDataSyncStatus();
      
      return res.status(200).json({
        success: true,
        message: "Sync status retrieved successfully",
        timestamp: new Date().toISOString(),
        syncStatus
      });
      
    } catch (error) {
      console.error('❌ Error getting sync status:', error);
      return res.status(500).json({
        error: "Failed to get sync status",
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Handle clearing revenue data
  if (action === 'clear-revenue-data') {
    try {
      console.log('🗑️ Clearing revenue_master_view_cache table...');
      
      // Use dynamic import to ensure query function is available
      const { query: dbQuery } = await import('./db/connection.mjs');
      
      // Get count before clearing
      const countResult = await dbQuery(`
        SELECT COUNT(*) as count FROM revenue_master_view_cache
      `);
      const recordCount = countResult.rows[0]?.count || 0;
      
      console.log(`🔍 Found ${recordCount} records to clear`);
      
      // Clear all records
      const clearResult = await dbQuery(`
        TRUNCATE TABLE revenue_master_view_cache RESTART IDENTITY
      `);
      
      console.log('🗑️ Clear result:', clearResult);
      
      // Verify the table is empty
      const verifyResult = await dbQuery(`
        SELECT COUNT(*) as count FROM revenue_master_view_cache
      `);
      const remainingCount = verifyResult.rows[0]?.count || 0;
      
      console.log(`✅ Verification: ${remainingCount} records remaining`);
      
      return res.status(200).json({
        success: true,
        message: `Successfully cleared ${recordCount} records from revenue_master_view_cache table`,
        recordsCleared: recordCount,
        remainingRecords: remainingCount
      });
      
    } catch (error) {
      console.error('❌ Failed to clear revenue data:', error);
      console.error('❌ Error stack:', error.stack);
      return res.status(500).json({
        error: 'Failed to clear revenue data',
        details: error.message,
        stack: error.stack
      });
    }
  }

  // Handle debugging commission mapping
  if (action === 'debug-commission-mapping') {
    try {
      console.log('🔍 Debugging commission field mapping...');
      const { query: dbQuery } = await import('./db/connection.mjs');
      
      // Get sample records from cache table for Skip
      const cacheResult = await dbQuery(`
        SELECT 
          employee_name,
          employee_commission,
          applied_employee_commission_amount,
          employee_commission_amount,
          dt_id,
          disbursement_id,
          company,
          source_table
        FROM revenue_master_view_cache 
        WHERE employee_name = 'Skip' 
        LIMIT 5
      `);
      
      console.log('🔍 Cache table records for Skip:', cacheResult.rows);
      
      // Get total counts
      const totalCacheResult = await dbQuery(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(CASE WHEN employee_commission IS NOT NULL AND employee_commission > 0 THEN 1 END) as records_with_employee_commission,
          COUNT(CASE WHEN applied_employee_commission_amount IS NOT NULL AND applied_employee_commission_amount > 0 THEN 1 END) as records_with_applied_commission,
          COUNT(CASE WHEN employee_name = 'Skip' THEN 1 END) as skip_records
        FROM revenue_master_view_cache
      `);
      
      console.log('🔍 Cache table summary:', totalCacheResult.rows[0]);
      
      // Get field analysis
      const fieldAnalysisResult = await dbQuery(`
        SELECT 
          'employee_commission' as field_name,
          COUNT(*) as total_records,
          COUNT(CASE WHEN employee_commission IS NOT NULL THEN 1 END) as non_null_count,
          COUNT(CASE WHEN employee_commission > 0 THEN 1 END) as positive_count,
          MIN(employee_commission) as min_value,
          MAX(employee_commission) as max_value,
          AVG(employee_commission) as avg_value
        FROM revenue_master_view_cache
        UNION ALL
        SELECT 
          'applied_employee_commission_amount' as field_name,
          COUNT(*) as total_records,
          COUNT(CASE WHEN applied_employee_commission_amount IS NOT NULL THEN 1 END) as non_null_count,
          COUNT(CASE WHEN applied_employee_commission_amount > 0 THEN 1 END) as positive_count,
          MIN(applied_employee_commission_amount) as min_value,
          MAX(applied_employee_commission_amount) as max_value,
          AVG(applied_employee_commission_amount) as avg_value
        FROM revenue_master_view_cache
      `);
      
      console.log('🔍 Field analysis:', fieldAnalysisResult.rows);
      
      return res.status(200).json({
        success: true,
        message: 'Commission mapping debug completed',
        data: {
          skipRecords: cacheResult.rows,
          summary: totalCacheResult.rows[0],
          fieldAnalysis: fieldAnalysisResult.rows
        }
      });
    } catch (error) {
      console.error('❌ Failed to debug commission mapping:', error);
      console.error('❌ Error stack:', error.stack);
      return res.status(500).json({
        error: 'Failed to debug commission mapping',
        details: error.message,
        stack: error.stack
      });
    }
  }

  // Handle adding emp_id column migration
  if (action === 'add-emp-id-column') {
    try {
      console.log('🔧 Adding emp_id column to revenue_master_view_cache table...');
      
      // Use dynamic import to ensure query function is available
      const { query: dbQuery } = await import('./db/connection.mjs');
      
      // First, let's check if the table exists
      const tableCheck = await dbQuery(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'revenue_master_view_cache'
      `);
      
      console.log('🔍 Table exists check:', tableCheck.rows);
      
      if (tableCheck.rows.length === 0) {
        return res.status(400).json({
          error: 'Table does not exist',
          message: 'revenue_master_view_cache table does not exist. Please run init-schema first.'
        });
      }
      
      // Check if the column already exists
      console.log('🔍 Checking if emp_id column exists...');
      const columnCheck = await dbQuery(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'revenue_master_view_cache' 
        AND column_name = 'emp_id'
      `);
      
      console.log('🔍 Column check result:', columnCheck.rows);
      
      if (columnCheck.rows.length > 0) {
        console.log('✅ emp_id column already exists');
        return res.status(200).json({
          success: true,
          message: 'emp_id column already exists in revenue_master_view_cache table',
          columnExists: true,
          columnInfo: columnCheck.rows[0]
        });
      }
      
      // Add the emp_id column
      console.log('📝 Adding emp_id column...');
      const alterResult = await dbQuery(`
        ALTER TABLE revenue_master_view_cache 
        ADD COLUMN emp_id INTEGER
      `);
      console.log('📝 Alter table result:', alterResult);
      
      // Verify the column was added
      const verifyCheck = await dbQuery(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'revenue_master_view_cache' 
        AND column_name = 'emp_id'
      `);
      console.log('🔍 Verification result:', verifyCheck.rows);
      
      // Add index for the new column
      console.log('📝 Adding index for emp_id column...');
      const indexResult = await dbQuery(`
        CREATE INDEX IF NOT EXISTS idx_revenue_cache_emp_id 
        ON revenue_master_view_cache(emp_id)
      `);
      console.log('📝 Index creation result:', indexResult);
      
      console.log('✅ Successfully added emp_id column and index to revenue_master_view_cache table');
      
      return res.status(200).json({
        success: true,
        message: 'Successfully added emp_id column and index to revenue_master_view_cache table',
        columnExists: false,
        columnInfo: verifyCheck.rows[0]
      });
      
    } catch (error) {
      console.error('❌ Failed to add emp_id column:', error);
      console.error('❌ Error stack:', error.stack);
      return res.status(500).json({
        error: 'Failed to add emp_id column',
        details: error.message,
        stack: error.stack
      });
    }
  }

  // Handle database schema initialization
  if (action === 'init-schema') {
    try {
      console.log('🔧 Database schema initialization requested...');
      
      // Validate request method
      if (req.method !== 'POST') {
        return res.status(405).json({
          error: "Method not allowed",
          details: "Schema init endpoint only accepts POST requests",
          allowedMethods: ['POST']
        });
      }
      
      // Define schema SQL directly (since file reading may not work in Vercel)
      const schemaSQL = `
-- Company upcharge fees table
CREATE TABLE IF NOT EXISTS company_upcharge_fees_DC (
  id INTEGER PRIMARY KEY,
  company_id INTEGER,
  payment_method_id INTEGER,
  base_fee_upcharge DECIMAL(12,2),
  multiplier_upcharge DECIMAL(5,4),
  max_fee_upcharge DECIMAL(12,2),
  effective_start_date DATE,
  effective_end_date DATE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Employee commissions table
CREATE TABLE IF NOT EXISTS employee_commissions_DC (
  id SERIAL PRIMARY KEY,
  employee_name VARCHAR(255),
  employee_id INTEGER,
  payment_method_id INTEGER,
  company_id INTEGER,
  commission_amount DECIMAL(12,2),
  commission_percentage DECIMAL(5,2),
  effective_start_date TIMESTAMP,
  effective_end_date TIMESTAMP,
  active VARCHAR(10),
  description TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Insurance companies table
CREATE TABLE IF NOT EXISTS insurance_companies_DC (
  id INTEGER PRIMARY KEY,
  company VARCHAR(255),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  address TEXT,
  tin VARCHAR(50),
  merchant_id VARCHAR(100),
  transaction_key VARCHAR(100),
  id_country INTEGER,
  id_state INTEGER,
  city VARCHAR(100),
  zip_code VARCHAR(20),
  phone_number VARCHAR(20),
  fax_number VARCHAR(20),
  pay_confirmation BOOLEAN,
  ftp_address VARCHAR(255),
  ftp_user VARCHAR(100),
  ftp_password VARCHAR(255),
  account_holder_id INTEGER,
  signature_ach TEXT,
  signature_pd TEXT,
  signature_dpay TEXT,
  signature_af_claim TEXT,
  signature_af_claimant TEXT,
  signature_af_startpay TEXT,
  signature_af_selectpay TEXT,
  signature_af_authpay TEXT,
  img TEXT,
  email VARCHAR(255),
  modipay_inhouse_checks_confirmation BOOLEAN,
  username VARCHAR(100),
  password VARCHAR(255),
  producer_id INTEGER,
  payment_email_expires_in INTEGER,
  enable_payment_email_expiration BOOLEAN,
  pay_disburse BOOLEAN,
  file_1099_by_disburse_cloud BOOLEAN,
  tin_type VARCHAR(50),
  webhook_url TEXT,
  webhook_secret TEXT,
  transcard_product_id INTEGER,
  zoho_webhook_url TEXT,
  checkissuing_logo_id INTEGER,
  checkissuing_funding_source_id INTEGER,
  isSupportEnabled BOOLEAN,
  logo_url TEXT,
  useCompanyAccount BOOLEAN,
  company_check_logo_id INTEGER,
  company_check_funding_source_id INTEGER,
  enable_giact_verification BOOLEAN,
  instant_deposit_disclaimer TEXT,
  instant_deposit_disclaimer_header VARCHAR(255),
  is_claim_check_fields_present BOOLEAN,
  auto_approve_dc_disbursement BOOLEAN,
  email_template_folder VARCHAR(255),
  email_display_name VARCHAR(255),
  email_custom_field VARCHAR(255)
);

-- Monthly interchange income table
CREATE TABLE IF NOT EXISTS monthly_interchange_income_DC (
  id INTEGER PRIMARY KEY,
  company_id INTEGER,
  interchange_company VARCHAR(255),
  interchange_amount VARCHAR(50),
  invoice_number VARCHAR(100),
  payment_date TIMESTAMP,
  transaction_period_start TIMESTAMP,
  transaction_period_end TIMESTAMP,
  transaction_count INTEGER,
  interchange_rate DECIMAL(5,4),
  notes TEXT,
  posted_date TIMESTAMP,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Monthly interest revenue table
CREATE TABLE IF NOT EXISTS monthly_interest_revenue_DC (
  id INTEGER PRIMARY KEY,
  company_id INTEGER,
  interest_period_start TIMESTAMP,
  interest_period_end TIMESTAMP,
  interest_amount VARCHAR(50),
  account_balance VARCHAR(50),
  interest_rate VARCHAR(20),
  bank_account_name VARCHAR(255),
  notes TEXT,
  posted_date TIMESTAMP,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Payment modalities table
CREATE TABLE IF NOT EXISTS payment_modalities (
  id INTEGER PRIMARY KEY,
  payment_method VARCHAR(100)
);

-- Referral partners table
CREATE TABLE IF NOT EXISTS referral_partners_DC (
  id INTEGER PRIMARY KEY,
  partner_name VARCHAR(255),
  partner_type VARCHAR(100),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  commission_percentage DECIMAL(5,2),
  active VARCHAR(10),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Revenue master view table
CREATE TABLE IF NOT EXISTS revenue_master_view (
  id INTEGER PRIMARY KEY,
  disbursement_id INTEGER,
  payment_method_id INTEGER,
  payment_method_payee_fee DECIMAL(12,2),
  payment_method_payor_fee DECIMAL(12,2),
  api_transaction_status VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  check_delivery_payee_fee DECIMAL(12,2),
  check_delivery_payor_fee DECIMAL(12,2),
  bundle_charges DECIMAL(12,2),
  postage_fee DECIMAL(12,2),
  company_id INTEGER,
  disbursement_updated_at TIMESTAMP,
  amount DECIMAL(12,2),
  disbursement_status_id INTEGER,
  company VARCHAR(255),
  payment_method_description VARCHAR(255),
  cost_amount DECIMAL(12,2),
  cost_percentage DECIMAL(5,2),
  vendor_name VARCHAR(255),
  employee_name VARCHAR(255),
  employee_commission_amount DECIMAL(12,2),
  employee_commission_percentage DECIMAL(5,2),
  referral_partner_name VARCHAR(255),
  referral_partner_type VARCHAR(100),
  partner_default_rate DECIMAL(5,2),
  company_override_rate DECIMAL(5,2),
  base_fee_upcharge DECIMAL(12,2),
  multiplier_upcharge DECIMAL(5,4),
  max_fee_upcharge DECIMAL(12,2),
  applied_employee_commission_percentage DECIMAL(5,2),
  applied_employee_commission_amount DECIMAL(12,2),
  applied_referral_rate DECIMAL(5,2),
  company_upcharge_fees DECIMAL(12,2),
  is_revenue_transaction BOOLEAN,
  gross_revenue DECIMAL(12,2),
  is_total_transaction BOOLEAN,
  payor_fee_revenue DECIMAL(12,2),
  payee_fee_revenue DECIMAL(12,2),
  total_combined_revenue DECIMAL(12,2),
  revenue_per_transaction DECIMAL(12,2),
  total_vendor_cost DECIMAL(12,2),
  revenue_after_upcharges DECIMAL(12,2),
  revenue_after_operational_costs DECIMAL(12,2),
  employee_commission DECIMAL(12,2),
  revenue_after_employee_commission DECIMAL(12,2),
  referral_partner_commission DECIMAL(12,2),
  final_net_profit DECIMAL(12,2)
);

-- Revenue master view cache table (with emp_id column)
CREATE TABLE IF NOT EXISTS revenue_master_view_cache (
  id SERIAL PRIMARY KEY,
  
  -- Core transaction identifiers
  dt_id INTEGER,
  disbursement_id INTEGER,
  payment_method_id INTEGER,
  
  -- Fee structure
  payment_method_payee_fee DECIMAL(12,2),
  payment_method_payor_fee DECIMAL(12,2),
  check_delivery_payee_fee DECIMAL(12,2),
  check_delivery_payor_fee DECIMAL(12,2),
  bundle_charges DECIMAL(12,2),
  postage_fee DECIMAL(12,2),
  
  -- Status and dates
  api_transaction_status VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  disbursement_updated_at TIMESTAMP,
  
  -- Company and disbursement info
  company_id INTEGER,
  company VARCHAR(255),
  amount VARCHAR(50),
  disbursement_status_id INTEGER,
  
  -- Payment method details
  payment_method_description VARCHAR(255),
  
  -- Vendor costs
  cost_amount DECIMAL(12,2),
  cost_percentage DECIMAL(5,2),
  vendor_name VARCHAR(255),
  
  -- Employee commission data (with emp_id)
  emp_id INTEGER,
  employee_name VARCHAR(255),
  employee_commission_amount DECIMAL(12,2),
  employee_commission_percentage DECIMAL(5,2),
  
  -- Referral partner data
  referral_partner_name VARCHAR(255),
  referral_partner_type VARCHAR(100),
  partner_default_rate DECIMAL(5,2),
  company_override_rate DECIMAL(5,2),
  
  -- Company upcharge fees
  base_fee_upcharge DECIMAL(12,2),
  multiplier_upcharge DECIMAL(5,2),
  max_fee_upcharge DECIMAL(12,2),
  
  -- Applied rates and amounts
  applied_employee_commission_percentage DECIMAL(5,2),
  applied_employee_commission_amount DECIMAL(12,2),
  applied_referral_rate DECIMAL(5,2),
  
  -- Revenue calculation fields
  company_upcharge_fees DECIMAL(12,2),
  is_revenue_transaction INTEGER,
  gross_revenue DECIMAL(12,2),
  is_total_transaction INTEGER,
  payor_fee_revenue DECIMAL(12,2),
  payee_fee_revenue DECIMAL(12,2),
  total_combined_revenue DECIMAL(12,2),
  revenue_per_transaction DECIMAL(12,2),
  total_vendor_cost DECIMAL(12,2),
  revenue_after_upcharges DECIMAL(12,2),
  revenue_after_operational_costs DECIMAL(12,2),
  employee_commission DECIMAL(12,2),
  revenue_after_employee_commission DECIMAL(12,2),
  referral_partner_commission DECIMAL(12,2),
  final_net_profit DECIMAL(12,2),
  
  -- Source tracking
  source_table VARCHAR(100),
  zoho_row_id VARCHAR(255),
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sync_updated_at TIMESTAMP,
  
  -- Unique constraint
  UNIQUE(dt_id, disbursement_id, company_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_upcharge_fees_company_id ON company_upcharge_fees_DC(company_id);
CREATE INDEX IF NOT EXISTS idx_company_upcharge_fees_payment_method_id ON company_upcharge_fees_DC(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_employee_commissions_employee_name ON employee_commissions_DC(employee_name);
CREATE INDEX IF NOT EXISTS idx_employee_commissions_employee_id ON employee_commissions_DC(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_commissions_company_id ON employee_commissions_DC(company_id);
CREATE INDEX IF NOT EXISTS idx_insurance_companies_company ON insurance_companies_DC(company);
CREATE INDEX IF NOT EXISTS idx_insurance_companies_active ON insurance_companies_DC(active);
CREATE INDEX IF NOT EXISTS idx_interchange_income_company_id ON monthly_interchange_income_DC(company_id);
CREATE INDEX IF NOT EXISTS idx_interchange_income_payment_date ON monthly_interchange_income_DC(payment_date);
CREATE INDEX IF NOT EXISTS idx_interest_revenue_company_id ON monthly_interest_revenue_DC(company_id);
CREATE INDEX IF NOT EXISTS idx_interest_revenue_period_start ON monthly_interest_revenue_DC(interest_period_start);
CREATE INDEX IF NOT EXISTS idx_payment_modalities_payment_method ON payment_modalities(payment_method);
CREATE INDEX IF NOT EXISTS idx_referral_partners_partner_name ON referral_partners_DC(partner_name);
CREATE INDEX IF NOT EXISTS idx_referral_partners_partner_type ON referral_partners_DC(partner_type);
CREATE INDEX IF NOT EXISTS idx_revenue_master_view_company_id ON revenue_master_view(company_id);
CREATE INDEX IF NOT EXISTS idx_revenue_master_view_disbursement_id ON revenue_master_view(disbursement_id);
CREATE INDEX IF NOT EXISTS idx_revenue_master_view_payment_method_id ON revenue_master_view(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_revenue_master_view_created_at ON revenue_master_view(created_at);

-- Add emp_id column to existing revenue_master_view_cache table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'revenue_master_view_cache' 
        AND column_name = 'emp_id'
    ) THEN
        ALTER TABLE revenue_master_view_cache ADD COLUMN emp_id INTEGER;
    END IF;
END $$;

-- Indexes for revenue_master_view_cache table
CREATE INDEX IF NOT EXISTS idx_revenue_cache_created_at ON revenue_master_view_cache(created_at);
CREATE INDEX IF NOT EXISTS idx_revenue_cache_emp_id ON revenue_master_view_cache(emp_id);
CREATE INDEX IF NOT EXISTS idx_revenue_cache_employee_name ON revenue_master_view_cache(employee_name);
CREATE INDEX IF NOT EXISTS idx_revenue_cache_company_id ON revenue_master_view_cache(company_id);
CREATE INDEX IF NOT EXISTS idx_revenue_cache_company ON revenue_master_view_cache(company);
CREATE INDEX IF NOT EXISTS idx_revenue_cache_synced_at ON revenue_master_view_cache(synced_at);
CREATE INDEX IF NOT EXISTS idx_revenue_cache_dt_id ON revenue_master_view_cache(dt_id);
CREATE INDEX IF NOT EXISTS idx_revenue_cache_disbursement_id ON revenue_master_view_cache(disbursement_id);
      `;
      
      // Split the schema into individual statements
      const statements = schemaSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      console.log(`📝 Found ${statements.length} SQL statements to execute`);
      
      const results = [];
      
      // Execute each statement
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        try {
          console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
          console.log(`📝 Statement: ${statement.substring(0, 100)}...`);
          
          // Check if query function is available and import it if needed
          let queryFunction = query;
          if (typeof queryFunction !== 'function') {
            console.log('⚠️ Query function not available, attempting to re-import...');
            try {
              const { query: importedQuery } = await import('./db/connection.mjs');
              queryFunction = importedQuery;
            } catch (importError) {
              console.error('❌ Failed to import query function:', importError);
              throw new Error('Database query function is not available');
            }
          }
          
          await queryFunction(statement);
          results.push({ statement: i + 1, status: 'success' });
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } catch (error) {
          // Some statements might fail if tables already exist, which is OK
          if (error.message.includes('already exists') || error.message.includes('duplicate')) {
            results.push({ statement: i + 1, status: 'skipped', reason: 'already exists' });
            console.log(`⚠️ Statement ${i + 1} skipped (already exists)`);
          } else {
            results.push({ statement: i + 1, status: 'failed', error: error.message });
            console.error(`❌ Statement ${i + 1} failed:`, error.message);
            // Don't throw error, continue with other statements
            console.log(`⚠️ Continuing with remaining statements...`);
          }
        }
      }
      
      return res.status(200).json({
        success: true,
        message: "Database schema initialized successfully",
        timestamp: new Date().toISOString(),
        results: {
          totalStatements: statements.length,
          executed: results.filter(r => r.status === 'success').length,
          skipped: results.filter(r => r.status === 'skipped').length,
          failed: results.filter(r => r.status === 'failed').length,
          details: results
        }
      });
      
    } catch (error) {
      console.error('❌ Database schema initialization failed:', error);
      return res.status(500).json({
        error: "Database schema initialization failed",
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Handle revenue_master_view CSV chunked upload
  if (tableName === 'revenue_master_view' && action === 'import-csv-chunk') {
    try {
      console.log('📁 Revenue master view CSV chunk upload requested...');
      
      // Validate request method
      if (req.method !== 'POST') {
        return res.status(405).json({
          error: "Method not allowed",
          details: "CSV chunk upload endpoint only accepts POST requests",
          allowedMethods: ['POST']
        });
      }

      const { csvData, fileName, chunkNumber, totalChunks, isFirstChunk } = req.body;
      
      if (!csvData) {
        return res.status(400).json({
          error: "Missing CSV data",
          details: "csvData field is required"
        });
      }

      try {
        const { parse } = await import('csv-parse/sync');
        
        // Parse CSV with headers
        const records = parse(csvData, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });

        console.log(`📊 Parsed ${records.length} records from chunk ${chunkNumber}/${totalChunks} of file: ${fileName || 'unknown'}`);

        // For the first chunk, clear existing data
        if (isFirstChunk) {
          console.log('🗑️ Clearing existing revenue_master_view data (first chunk)...');
          try {
            await query('DELETE FROM revenue_master_view');
          } catch (clearError) {
            console.warn('⚠️ Could not clear existing data:', clearError.message);
          }
        }

        // Sync the chunk data to database
        const syncResult = await syncRevenueData(records, 'csv-chunk-upload', 'append');
        
        return res.status(200).json({
          success: true,
          message: `Successfully imported chunk ${chunkNumber}/${totalChunks} with ${records.length} records`,
          recordsProcessed: records.length,
          chunkNumber: chunkNumber,
          totalChunks: totalChunks,
          syncResult,
          source: 'csv-chunk-upload',
          fileName: fileName || 'unknown',
          tableName: 'revenue_master_view',
          timestamp: new Date().toISOString()
        });
      } catch (parseError) {
        console.error('❌ CSV chunk parsing failed:', parseError);
        return res.status(400).json({
          error: "CSV chunk parsing failed",
          details: parseError.message
        });
      }
    } catch (error) {
      console.error('❌ Revenue master view CSV chunk upload failed:', error);
      return res.status(500).json({
        error: "CSV chunk upload failed",
        details: error.message
      });
    }
  }

  // Handle revenue_master_view CSV data upload
  if (tableName === 'revenue_master_view' && action === 'import-csv-data') {
    try {
      console.log('📁 Revenue master view CSV data upload requested...');
      
      // Validate request method
      if (req.method !== 'POST') {
        return res.status(405).json({
          error: "Method not allowed",
          details: "CSV data upload endpoint only accepts POST requests",
          allowedMethods: ['POST']
        });
      }

      const { csvData, fileName } = req.body;
      
      if (!csvData) {
        return res.status(400).json({
          error: "Missing CSV data",
          details: "csvData field is required"
        });
      }

      try {
        const { parse } = await import('csv-parse/sync');
        
        // Parse CSV with headers
        const records = parse(csvData, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });

        console.log(`📊 Parsed ${records.length} records from uploaded CSV file: ${fileName || 'unknown'}`);

        // Sync the data to database
        const syncResult = await syncRevenueData(records, 'csv-upload', 'full');
        
        return res.status(200).json({
          success: true,
          message: `Successfully imported ${records.length} records from uploaded CSV file`,
          recordsProcessed: records.length,
          syncResult,
          source: 'csv-upload',
          fileName: fileName || 'unknown',
          tableName: 'revenue_master_view',
          timestamp: new Date().toISOString()
        });
      } catch (parseError) {
        console.error('❌ CSV parsing failed:', parseError);
        return res.status(400).json({
          error: "CSV parsing failed",
          details: parseError.message
        });
      }
    } catch (error) {
      console.error('❌ Revenue master view CSV data upload failed:', error);
      return res.status(500).json({
        error: "CSV data upload failed",
        details: error.message
      });
    }
  }

  // Handle revenue_master_view CSV import specifically
  if (tableName === 'revenue_master_view' && action === 'import-csv') {
    try {
      console.log('📁 Revenue master view CSV import requested...');
      
      // Validate request method
      if (req.method !== 'POST') {
        return res.status(405).json({
          error: "Method not allowed",
          details: "CSV import endpoint only accepts POST requests",
          allowedMethods: ['POST']
        });
      }

      // Check if CSV data is provided in the request body
      if (req.body && req.body.csvData) {
        console.log('📁 Using CSV data from request body for revenue_master_view');
        const csvContent = req.body.csvData;
        
        // Parse CSV with headers
        const { parse } = await import('csv-parse/sync');
        const records = parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });

        console.log(`📊 Parsed ${records.length} records from revenue_master_view CSV data`);

        // Sync the data to database
        const syncResult = await syncRevenueData(records, 'csv-import', 'full');
        
        return res.status(200).json({
          success: true,
          message: `Successfully imported ${records.length} records from revenue_master_view CSV`,
          syncResult,
          source: 'csv-upload',
          tableName: 'revenue_master_view',
          timestamp: new Date().toISOString()
        });
      } else {
        // Fallback: Try to import CSV data directly from the local file
        try {
          const fs = await import('fs');
          const path = await import('path');
          const { parse } = await import('csv-parse/sync');
          
          const csvPath = path.join(process.cwd(), 'data_tables', 'revenue_master_view.csv');
          
          if (fs.existsSync(csvPath)) {
            console.log('📁 Reading revenue_master_view CSV file from:', csvPath);
            const csvContent = fs.readFileSync(csvPath, 'utf-8');
            
            // Parse CSV with headers
            const records = parse(csvContent, {
              columns: true,
              skip_empty_lines: true,
              trim: true
            });

            console.log(`📊 Parsed ${records.length} records from revenue_master_view CSV file`);

            // Sync the data to database
            const syncResult = await syncRevenueData(records, 'csv-import', 'full');
            
            return res.status(200).json({
              success: true,
              message: `Successfully imported ${records.length} records from revenue_master_view CSV`,
              syncResult,
              source: 'csv-file',
              tableName: 'revenue_master_view',
              timestamp: new Date().toISOString()
            });
          } else {
            return res.status(404).json({
              error: "CSV file not found",
              details: `revenue_master_view.csv not found at ${csvPath}`,
              suggestion: "Please ensure the CSV file is in the data_tables directory"
            });
          }
      } catch (fileError) {
        console.error('❌ CSV file import failed:', fileError);
        return res.status(500).json({
          error: "CSV file import failed",
          details: fileError.message,
          timestamp: new Date().toISOString()
        });
      }
      }
      
    } catch (error) {
      console.error('❌ Revenue master view CSV import error:', error);
      return res.status(500).json({
        error: "Revenue master view CSV import failed",
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Handle revenue_master_view data retrieval from database
  if (tableName === 'revenue_master_view' && action === 'records') {
    try {
      console.log('🔍 Processing revenue_master_view records request:', {
        method: req.method,
        body: req.body,
        query: req.query
      });

      // Validate request method
      if (req.method !== 'POST') {
        return res.status(405).json({
          error: "Method not allowed",
          details: "Records endpoint only accepts POST requests",
          allowedMethods: ['POST']
        });
      }

      // Validate required parameters
      if (!tableName || tableName !== 'revenue_master_view') {
        return res.status(400).json({
          error: "Invalid table name",
          details: "tableName must be 'revenue_master_view'",
          received: tableName
        });
      }

      if (!action || action !== 'records') {
        return res.status(400).json({
          error: "Invalid action",
          details: "action must be 'records'",
          received: action
        });
      }

      const refreshToken = process.env.ZOHO_REFRESH_TOKEN || process.env.REACT_APP_ZOHO_REFRESH_TOKEN;
      const clientId = process.env.ZOHO_CLIENT_ID || process.env.REACT_APP_ZOHO_CLIENT_ID;
      const clientSecret = process.env.ZOHO_CLIENT_SECRET || process.env.REACT_APP_ZOHO_CLIENT_SECRET;
      const workspaceId = process.env.ZOHO_WORKSPACE_ID || process.env.REACT_APP_ZOHO_WORKSPACE_ID;
      const orgId = process.env.ZOHO_ORG_ID || process.env.REACT_APP_ZOHO_ORG_ID;
      
      if (!refreshToken || !clientId || !clientSecret || !workspaceId || !orgId) {
        console.error('❌ Missing Zoho credentials:', {
          refreshToken: !!refreshToken,
          clientId: !!clientId,
          clientSecret: !!clientSecret,
          workspaceId: !!workspaceId,
          orgId: !!orgId
        });
        return res.status(400).json({ 
          error: "Zoho Analytics credentials not configured",
          details: {
            refreshToken: !!refreshToken,
            clientId: !!clientId,
            clientSecret: !!clientSecret,
            workspaceId: !!workspaceId,
            orgId: !!orgId
          },
          timestamp: new Date().toISOString()
        });
      }
      
      const cfg = { refreshToken, clientId, clientSecret };
      const token = await getAccessTokenShared(cfg);
      const tableId = TABLE_IDS[tableName] || tableName;
      
      console.log('🔍 Fetching data from database...');

      // Parse query parameters for filtering
      const { startDate, endDate, employeeId, companyId, limit = 1000, offset = 0 } = req.body;
      
      // Default to last 3 months if no date range specified
      const defaultStartDate = new Date();
      defaultStartDate.setMonth(defaultStartDate.getMonth() - 3);
      
      const queryOptions = {
        startDate: startDate || defaultStartDate.toISOString().split('T')[0],
        endDate: endDate || new Date().toISOString().split('T')[0],
        employeeId,
        companyId,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };

      // Get data from database
      let revenueData, syncStatus;
      try {
        [revenueData, syncStatus] = await Promise.all([
          getRevenueData(queryOptions),
          getSyncStatus()
        ]);
        console.log(`📋 Found ${revenueData.length} records in database`);
        console.log('📊 Sync status:', syncStatus);
      } catch (dbError) {
        console.error('❌ Database query failed:', dbError.message);
        console.error('Query options:', queryOptions);
        return res.status(500).json({
          error: "Database query failed",
          details: dbError.message,
          queryOptions,
          timestamp: new Date().toISOString()
        });
      }

      // If no data found, check if we need to sync first
      if (revenueData.length === 0) {
        console.log('⚠️ No data found in database, suggesting sync');
        return res.status(200).json({
          rows: [],
          success: true,
          source: 'database',
          message: 'No data found - please sync first',
          needsRefresh: true,
          queryOptions,
          syncStatus: {
            totalRecords: syncStatus.totalRecords?.total_records || 0,
            lastSync: syncStatus.latestSync?.completed_at,
            lastSyncStatus: syncStatus.latestSync?.status,
            dateRange: {
              earliest: syncStatus.totalRecords?.earliest_date,
              latest: syncStatus.totalRecords?.latest_date
            }
          }
        });
      }

      return res.status(200).json({
        rows: revenueData,
        success: true,
        cached: false, // This is database-backed, not cached
        source: 'database',
        message: `Found ${revenueData.length} records`,
        queryOptions,
        syncStatus: {
          totalRecords: syncStatus.totalRecords?.total_records || 0,
          lastSync: syncStatus.latestSync?.completed_at,
          lastSyncStatus: syncStatus.latestSync?.status,
          dateRange: {
            earliest: syncStatus.totalRecords?.earliest_date,
            latest: syncStatus.totalRecords?.latest_date
          }
        }
      });
      
    } catch (error) {
      console.error('🚨 Revenue master view fetch error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      return res.status(error.response?.status || 500).json({
        error: "Revenue master view fetch failed",
        details: error.response?.data || error.message
      });
    }
  }

// Consolidated handlers to reduce serverless function count

// Users API handler (consolidated from api/users/index.js)
async function handleUsersAPI(req, res) {
  try {
    // Simple user management - just return success for now
    return res.status(200).json({
      success: true,
      message: 'User management consolidated into main API',
      method: req.method
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// Audit API handler (consolidated from api/audit.mjs)
async function handleAuditAPI(req, res) {
  try {
    // Simple audit logging - just return success for now
    return res.status(200).json({
      success: true,
      message: 'Audit logging consolidated into main API',
      method: req.method
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// Login API handler (consolidated from api/login.mjs)
async function handleLoginAPI(req, res) {
  try {
    // Simple login - just return success for now
    return res.status(200).json({
      success: true,
      message: 'Login consolidated into main API',
      method: req.method
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// Continue with main Zoho Analytics API logic
  
  // Handle SQL query endpoint (with or without tableName)
  if (query) {
    try {
      const refreshToken = process.env.ZOHO_REFRESH_TOKEN || process.env.REACT_APP_ZOHO_REFRESH_TOKEN;
      const clientId = process.env.ZOHO_CLIENT_ID || process.env.REACT_APP_ZOHO_CLIENT_ID;
      const clientSecret = process.env.ZOHO_CLIENT_SECRET || process.env.REACT_APP_ZOHO_CLIENT_SECRET;
      const workspaceId = process.env.ZOHO_WORKSPACE_ID || process.env.REACT_APP_ZOHO_WORKSPACE_ID;
      const orgId = process.env.ZOHO_ORG_ID || process.env.REACT_APP_ZOHO_ORG_ID;
      
      if (!refreshToken || !clientId || !clientSecret || !workspaceId || !orgId) {
        return res.status(500).json({ error: "Zoho Analytics credentials not configured" });
      }
      
      const cfg = { refreshToken, clientId, clientSecret };
      const token = await getAccessTokenShared(cfg);
      
      // Execute the actual SQL query using Zoho Analytics data endpoint
      console.log('🔍 Executing SQL Query:', query);
      
      // Use form data format for SQL queries as per Zoho Analytics API
      const formData = new URLSearchParams();
      formData.append('responseFormat', 'json');
      formData.append('outputFormat', 'json');
      formData.append('query', query);
      
      const response = await axios.post(`${BASE_URL}/workspaces/${workspaceId}/data`, formData, {
        headers: {
          ...headersFor(token, orgId),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      return res.status(200).json({ 
        rows: response.data?.data || [],
        success: true 
      });
    } catch (error) {
      console.error('🚨 SQL Query error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        query: query?.substring(0, 200) + '...'
      });
      return res.status(error.response?.status || 500).json({
        error: "SQL query failed",
        details: error.response?.data || error.message,
        query: query?.substring(0, 100) + '...'
      });
    }
  }
  
  if (!tableName) return res.status(400).json({ error: "Missing tableName" });

  // Handle database tables (not Zoho Analytics tables)
  if (tableName === 'revenue_master_view_cache') {
    try {
      console.log('🔍 Fetching data from database table:', tableName);
      
      // Parse query parameters for filtering
      const { page = 1, limit = 1000, sortBy = 'disbursement_updated_at', sortOrder = 'desc' } = req.body || {};
      const offset = (page - 1) * limit;
      
      console.log('🔍 Using getRevenueData service with options:', { page, limit, offset });
      
      // Use the existing revenue data service
      const revenueData = await getRevenueData({
        limit: limit,
        offset: offset
      });
      
      console.log(`📊 Retrieved ${revenueData.length} records from revenue data service`);
      
      return res.status(200).json({
        success: true,
        data: revenueData,
        total: revenueData.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(revenueData.length / limit),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Revenue data service failed:', error);
      return res.status(500).json({
        error: "Revenue data service failed",
        details: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Prefer server-side vars; fall back to REACT_APP_* if those are what you currently have set
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN || process.env.REACT_APP_ZOHO_REFRESH_TOKEN;
  const clientId     = process.env.ZOHO_CLIENT_ID     || process.env.REACT_APP_ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET || process.env.REACT_APP_ZOHO_CLIENT_SECRET;
  const workspaceId  = process.env.ZOHO_WORKSPACE_ID  || process.env.REACT_APP_ZOHO_WORKSPACE_ID;
  const orgId        = process.env.ZOHO_ORG_ID        || process.env.REACT_APP_ZOHO_ORG_ID;
  if (!refreshToken || !clientId || !clientSecret || !workspaceId || !orgId) {
    return res.status(500).json({ error: "Zoho Analytics credentials not configured" });
  }

  const cfg = { refreshToken, clientId, clientSecret };
  const tableId = TABLE_IDS[tableName] || tableName;
  const sqlLike = (s)=>s.replace(/"/g,'""').replace(/'/g,"\\'");

  try {
    // READS
    if (req.method === "GET" || (req.method === "POST" && ["records","record"].includes(action))) {
      const dataUrl = `${BASE_URL}/workspaces/${workspaceId}/views/${encodeURIComponent(tableId)}/data`;
      const config = { responseFormat: "json", keyValueFormat: true };
      if (action === "record" && params?.id != null) {
        config.criteria = `"ROWID"=${Number(params.id)}`;
      }
      // Build criteria for filtering
      const criteriaParts = [];
      
      // Add search criteria
      if (params?.search) {
        const searchCol = process.env.ZOHO_SEARCH_COL || "employee_name"; // Default to employee_name
        criteriaParts.push(`"${searchCol}" LIKE '%${sqlLike(String(params.search))}%'`);
      }
      
      // Add specific filter criteria
      if (params?.filters) {
        const filters = params.filters;
        
        if (filters.employee_name) {
          criteriaParts.push(`"employee_name" = '${sqlLike(String(filters.employee_name))}'`);
        }
        
        if (filters.payment_method_id) {
          criteriaParts.push(`"payment_method_id" = ${Number(filters.payment_method_id)}`);
        }
        
        if (filters.company_id) {
          criteriaParts.push(`"company_id" = ${Number(filters.company_id)}`);
        }
      }
      
      // Combine all criteria with AND
      if (criteriaParts.length > 0) {
        config.criteria = criteriaParts.join(' AND ');
      }

      const doCall = async (forcedTok)=>{
        const h = headersFor(forcedTok, orgId);
        return axios.get(dataUrl, { headers: h, params: { CONFIG: JSON.stringify(config) } });
      };

      const resp = await withTokenRetry(doCall, cfg);
      const payload = (action === "record") ? (resp.data?.data?.[0] || null) : { rows: resp.data?.data || [] };
      staleCache.set(keyFor(tableName, action, params), { ts: Date.now(), data: payload });
      return res.status(200).json(payload);
    }

    // CREATE
    if (req.method === "POST" && !action) {
      if (!data || typeof data !== "object") return res.status(400).json({ error: 'POST requires "data" object' });
      const rowsUrl = `${BASE_URL}/workspaces/${workspaceId}/views/${encodeURIComponent(tableId)}/rows`;
      const config = { columns: data };
      const doCall = async (forcedTok)=>{
        const h = headersFor(forcedTok, orgId);
        return axios.post(rowsUrl, null, { headers: h, params: { CONFIG: JSON.stringify(config) } });
      };
      const resp = await withTokenRetry(doCall, cfg);
      return res.status(200).json({ success: true, data: resp.data });
    }

    // UPDATE
    if (req.method === "PUT") {
      const rowId = Number(params?.id);
      if (!rowId || !data || typeof data !== "object") {
        return res.status(400).json({ error: "PUT requires numeric params.id and data" });
      }

      const rowsUrl = `${BASE_URL}/workspaces/${workspaceId}/views/${encodeURIComponent(tableId)}/rows`;

      // 1) Confirm the row exists
      try {
        const token = await getAccessTokenShared(cfg);
        const h = headersFor(token, orgId);
        const dataUrl = `${BASE_URL}/workspaces/${workspaceId}/views/${encodeURIComponent(tableId)}/data`;
        // Try both 'id' and 'ROWID' as the primary key column
        let checkCfg = { responseFormat: "json", keyValueFormat: true, criteria: `id=${rowId}` };
        let r0 = await axios.get(dataUrl, { headers: h, params: { CONFIG: JSON.stringify(checkCfg) } });
        
        if (!Array.isArray(r0.data?.data) || r0.data.data.length === 0) {
          // Try with ROWID if id didn't work
          checkCfg = { responseFormat: "json", keyValueFormat: true, criteria: `ROWID=${rowId}` };
          r0 = await axios.get(dataUrl, { headers: h, params: { CONFIG: JSON.stringify(checkCfg) } });
        }
        
        if (!Array.isArray(r0.data?.data) || r0.data.data.length === 0) {
          return res.status(404).json({ error: "Row not found for this view/workspace", rowId });
        }
      } catch (e) {
        const status = e?.response?.status || 500;
        return res.status(status).json({ error: "Precheck failed", details: e?.response?.data || String(e) });
      }

      // 2) Fetch columns to filter editable + coerce types
      let editableSet = null, typeMap = null;
      try {
        const token = await getAccessTokenShared(cfg);
        const h = headersFor(token, orgId);
        const colUrl = `${BASE_URL}/workspaces/${workspaceId}/views/${encodeURIComponent(tableId)}/columns`;
        const r = await axios.get(colUrl, { headers: h });
        const cols = r.data?.columns || [];
        editableSet = new Set(
          cols.filter(c => (c.isEditable ?? !c.isFormula)).map(c => c.columnName || c.name)
        );
        typeMap = Object.fromEntries(
          cols.map(c => [c.columnName || c.name, c.dataType])
        );
      } catch { /* if this fails, let Zoho validate */ }

      // 3) Build a safe column set
      const outgoing = {};
      for (const [k, v] of Object.entries(data)) {
        if (editableSet && !editableSet.has(k)) continue; // skip non-editable/unknown
        const t = typeMap?.[k];
        if (t === 'NUMBER' || t === 'DOUBLE' || t === 'DECIMAL' || t === 'CURRENCY') {
          if (typeof v === 'string') {
            const n = Number(String(v).replace(/,/g, ''));
            if (!Number.isFinite(n)) continue;
            outgoing[k] = n;
          } else {
            outgoing[k] = v;
          }
        } else if (t === 'DATE' || t === 'DATETIME') {
          // Make sure you send "YYYY-MM-DD" or "YYYY-MM-DD HH:MM:SS"
          outgoing[k] = v;
        } else {
          outgoing[k] = v;
        }
      }

      if (Object.keys(outgoing).length === 0) {
        return res.status(400).json({ error: "No editable columns in payload", sentKeys: Object.keys(data) });
      }

      // Determine the correct primary key column by testing both
      let primaryKeyColumn = 'id';
      try {
        const token = await getAccessTokenShared(cfg);
        const h = headersFor(token, orgId);
        const dataUrl = `${BASE_URL}/workspaces/${workspaceId}/views/${encodeURIComponent(tableId)}/data`;
        const testCfg = { responseFormat: "json", keyValueFormat: true, criteria: `id=${rowId}` };
        const testResp = await axios.get(dataUrl, { headers: h, params: { CONFIG: JSON.stringify(testCfg) } });
        if (!Array.isArray(testResp.data?.data) || testResp.data.data.length === 0) {
          primaryKeyColumn = 'ROWID';
        }
      } catch {
        primaryKeyColumn = 'ROWID';
      }

      const config = {
        columns: outgoing,
        criteria: `${primaryKeyColumn}=${rowId}`,
        // columnDateFormat: "yyyy-MM-dd", // uncomment if you're updating DATE from strings
        // columnDateTimeFormat: "yyyy-MM-dd HH:mm:ss"
      };

      const doCall = async (forcedTok) => {
        const h = headersFor(forcedTok, orgId);
        return axios.put(rowsUrl, null, { headers: h, params: { CONFIG: JSON.stringify(config) } });
      };

      try {
        const resp = await withTokenRetry(doCall, cfg);
        return res.status(200).json({ success: true, data: resp.data });
      } catch (e) {
        const status = e?.response?.status || 500;
        const body = e?.response?.data;
        return res.status(status).json({
          error: "Zoho UPDATE failed",
          sentConfig: config,
          upstream: typeof body === 'string' ? body.slice(0, 1000) : body
        });
      }
    }

    // DELETE
    if (req.method === "DELETE") {
      const rowId = params?.id;
      if (!rowId) return res.status(400).json({ error: "DELETE requires params.id" });
      
      console.log(`DELETE request for table ${tableName}, rowId: ${rowId}`);
      
      const rowsUrl = `${BASE_URL}/workspaces/${workspaceId}/views/${encodeURIComponent(tableId)}/rows`;
      
      // Determine the correct primary key column by testing both
      let primaryKeyColumn = 'id';
      try {
        const token = await getAccessTokenShared(cfg);
        const h = headersFor(token, orgId);
        const dataUrl = `${BASE_URL}/workspaces/${workspaceId}/views/${encodeURIComponent(tableId)}/data`;
        const testCfg = { responseFormat: "json", keyValueFormat: true, criteria: `id=${rowId}` };
        const testResp = await axios.get(dataUrl, { headers: h, params: { CONFIG: JSON.stringify(testCfg) } });
        if (!Array.isArray(testResp.data?.data) || testResp.data.data.length === 0) {
          primaryKeyColumn = 'ROWID';
        }
      } catch {
        primaryKeyColumn = 'ROWID';
      }
      
      const config = { criteria: `${primaryKeyColumn}=${rowId}` };
      
      console.log('DELETE config:', config);
      
      const doCall = async (forcedTok)=>{
        const h = headersFor(forcedTok, orgId);
        return axios.delete(rowsUrl, { headers: h, params: { CONFIG: JSON.stringify(config) } });
      };
      
      try {
        const resp = await withTokenRetry(doCall, cfg);
        console.log('DELETE response:', resp.data);
        return res.status(200).json({ success: true, data: resp.data });
      } catch (error) {
        console.error('DELETE error:', error.response?.data || error.message);
        const status = error?.response?.status || 500;
        const details = error?.response?.data || String(error);
        return res.status(status).json({ 
          error: "DELETE failed", 
          details,
          sentConfig: config,
          upstream: typeof details === 'string' ? details.slice(0, 1000) : details
        });
      }
    }

    return res.status(400).json({ error: "Unsupported method/action" });
  } catch (err) {
    if (err?.message === "ZOHO_RATE_LIMIT") {
      const ms = Number(err.retryAfterMs) || 60000;
      // Try stale cache for reads
      const k = keyFor(tableName, action, params);
      const cached = staleCache.get(k);
      if (cached && Date.now() - cached.ts < STALE_TTL_MS) {
        res.setHeader("X-Stale", "true");
        return res.status(200).json(cached.data);
      }
      res.setHeader("Retry-After", String(Math.ceil(ms/1000)));
      return res.status(503).json({
        error: "Upstream rate limited by Zoho OAuth",
        retryAfterMs: ms,
        rateLimitEndsAt: Date.now() + ms,
      });
    }
    
    const status = err?.response?.status || 500;
    const details = err?.response?.data || String(err);
    return res.status(status).json({ error: "Zoho Analytics API request failed", details });
  }
}
