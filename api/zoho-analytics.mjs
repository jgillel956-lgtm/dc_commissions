import axios from "axios";
import { getAccessTokenShared, withTokenRetry } from './db/getAccessTokenShared.mjs';
import { getSharedToken, getSharedBackoffUntil } from './db/zohoTokenStore.mjs';

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
  return {
    Authorization: `Zoho-oauthtoken ${token}`,
    "ZANALYTICS-ORGID": orgId,
    "Content-Type": "application/json",
  };
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

  // Health
  if (req.method === "GET" && req.query.health === "1") {
    const t = await getSharedToken();
    const backoff = await getSharedBackoffUntil();
    return res.status(200).json({
      ok: true,
      tokenCached: !!(t && Date.now() < t.expiresAt),
      backoffRemainingMs: Math.max(0, backoff - Date.now())
    });
  }

  // Debug environment variables
  if (req.method === "GET" && req.query.debug === "1") {
    return res.status(200).json({
      dc: process.env.ZOHO_DC || 'com',
      // prefer server envs; show both for clarity
      refreshTokenSet: !!(process.env.ZOHO_REFRESH_TOKEN || process.env.REACT_APP_ZOHO_REFRESH_TOKEN),
      clientIdSet:     !!(process.env.ZOHO_CLIENT_ID     || process.env.REACT_APP_ZOHO_CLIENT_ID),
      clientSecretSet: !!(process.env.ZOHO_CLIENT_SECRET || process.env.REACT_APP_ZOHO_CLIENT_SECRET),
      workspaceIdSet:  !!(process.env.ZOHO_WORKSPACE_ID  || process.env.REACT_APP_ZOHO_WORKSPACE_ID),
      orgIdSet:        !!(process.env.ZOHO_ORG_ID        || process.env.REACT_APP_ZOHO_ORG_ID),
      accountsHost: `https://accounts.zoho.${process.env.ZOHO_DC || 'com'}`,
      analyticsHost: `https://analyticsapi.zoho.${process.env.ZOHO_DC || 'com'}`
    });
  }

  // Test OAuth endpoint
  if (req.method === "GET" && req.query.testOAuth === "1") {
    try {
      const refreshToken = process.env.ZOHO_REFRESH_TOKEN || process.env.REACT_APP_ZOHO_REFRESH_TOKEN;
      const clientId = process.env.ZOHO_CLIENT_ID || process.env.REACT_APP_ZOHO_CLIENT_ID;
      const clientSecret = process.env.ZOHO_CLIENT_SECRET || process.env.REACT_APP_ZOHO_CLIENT_SECRET;
      
      console.log('Testing OAuth with refresh token length:', refreshToken?.length);
      
      const resp = await axios.post(
        `https://accounts.zoho.${process.env.ZOHO_DC || 'com'}/oauth/v2/token`,
        new URLSearchParams({
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
      );
      
      return res.status(200).json({
        success: true,
        status: resp.status,
        data: resp.data,
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

  // Exchange authorization code for refresh token
  if (req.method === "POST" && req.query.exchangeCode === "1") {
    try {
      const { code, redirect_uri } = req.body;
      const clientId = process.env.ZOHO_CLIENT_ID || process.env.REACT_APP_ZOHO_CLIENT_ID;
      const clientSecret = process.env.ZOHO_CLIENT_SECRET || process.env.REACT_APP_ZOHO_CLIENT_SECRET;
      
      if (!code || !redirect_uri) {
        return res.status(400).json({
          error: "Missing code or redirect_uri in request body"
        });
      }
      
      const resp = await axios.post(
        `https://accounts.zoho.${process.env.ZOHO_DC || 'com'}/oauth/v2/token`,
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
        accessToken: resp.data.access_token
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

  // Parse body / query
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

  const { tableName, action, data, params } = body || {};
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
