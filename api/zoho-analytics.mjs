import axios from "axios";
import { getAccessTokenShared, withTokenRetry } from './db/getAccessTokenShared.mjs';
import { getSharedToken, getSharedBackoffUntil, clearSharedToken } from './db/zohoTokenStore.mjs';

/** DC-aware hosts */
const DC = process.env.ZOHO_DC || "com";
const ANALYTICS_HOST = `https://analyticsapi.zoho.${DC}`;
const BASE_URL = `${ANALYTICS_HOST}/restapi/v2`;

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
  'payment_modalities': '2103833000011978002'
};

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Parse body early for all endpoints
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
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

  const { tableName, action, data, params } = req.body || {};
  if (!tableName) return res.status(400).json({ error: "Missing tableName" });

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
      // Only add search if you point at a known TEXT/VARCHAR column.
      // Example: change "EmployeeName" to your real searchable column.
      if (params?.search) {
        const searchCol = process.env.ZOHO_SEARCH_COL || "EmployeeName"; // <- set this in env to something valid
        config.criteria = `"${searchCol}" LIKE '%${sqlLike(String(params.search))}%'`;
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
      const rowId = params?.id;
      if (!rowId || !data || typeof data !== "object") return res.status(400).json({ error: "PUT requires params.id and data" });
      const rowsUrl = `${BASE_URL}/workspaces/${workspaceId}/views/${encodeURIComponent(tableId)}/rows`;
      const config = { columns: data, criteria: `"ROWID"=${Number(rowId)}` };
      const doCall = async (forcedTok)=>{
        const h = headersFor(forcedTok, orgId);
        return axios.put(rowsUrl, null, { headers: h, params: { CONFIG: JSON.stringify(config) } });
      };
      const resp = await withTokenRetry(doCall, cfg);
      return res.status(200).json({ success: true, data: resp.data });
    }

    // DELETE
    if (req.method === "DELETE") {
      const rowId = params?.id;
      if (!rowId) return res.status(400).json({ error: "DELETE requires params.id" });
      const rowsUrl = `${BASE_URL}/workspaces/${workspaceId}/views/${encodeURIComponent(tableId)}/rows`;
      const config = { criteria: `"ROWID"=${Number(rowId)}` };
      const doCall = async (forcedTok)=>{
        const h = headersFor(forcedTok, orgId);
        return axios.delete(rowsUrl, { headers: h, params: { CONFIG: JSON.stringify(config) } });
      };
      const resp = await withTokenRetry(doCall, cfg);
      return res.status(200).json({ success: true, data: resp.data });
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
