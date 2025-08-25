import axios from 'axios';
import {
  getSharedBackoffUntil, setSharedBackoffUntil,
  getSharedToken, setSharedToken, clearSharedToken,
  tryRefreshLock, unlockRefresh
} from './zohoTokenStore.mjs';

const DC = process.env.ZOHO_DC || 'com';
const ACCOUNTS_HOST = `https://accounts.zoho.${DC}`;
const SKEW_MS = 120_000;
const FALLBACK_TTL_MS = 50 * 60 * 1000;
const RL_DEFAULT_MS = 60_000;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export async function fetchZohoAccessToken(refreshToken, clientId, clientSecret) {
  console.log('Fetching Zoho access token...');
  console.log('DC:', DC, 'ACCOUNTS_HOST:', ACCOUNTS_HOST);
  
  try {
    const resp = await axios.post(
      `${ACCOUNTS_HOST}/oauth/v2/token`,
      new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
    );
    
    console.log('Zoho OAuth response status:', resp.status);
    console.log('Zoho OAuth response data keys:', Object.keys(resp.data || {}));
    
    const accessToken = resp.data.access_token;
    if (!accessToken) {
      console.error('No access_token in response:', resp.data);
      throw new Error('No access_token received from Zoho OAuth');
    }
    
    const expiresIn = Number(resp.data.expires_in) || 0;
    const ttl = expiresIn ? expiresIn * 1000 : FALLBACK_TTL_MS;
    console.log('Token expires in:', expiresIn, 'seconds, TTL:', ttl, 'ms');
    return { accessToken, expiresAt: Date.now() + ttl - SKEW_MS };
  } catch (error) {
    console.error('Zoho OAuth request failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/** Main entry: get a valid shared token, respecting global cooldown & single-flight refresh */
export async function getAccessTokenShared(cfg) {
  // Respect a shared cooldown (from previous rate-limit)
  const backoff = await getSharedBackoffUntil();
  if (Date.now() < backoff) {
    const e = new Error('ZOHO_RATE_LIMIT');
    e.retryAfterMs = backoff - Date.now();
    throw e;
  }

  // Reuse valid shared token
  const cached = await getSharedToken();
  if (cached && Date.now() < cached.expiresAt) {
    return cached.accessToken;
  }

  // Acquire distributed lock to refresh; if not, poll briefly for the other instance to finish
  if (!(await tryRefreshLock())) {
    for (let i = 0; i < 30; i++) { // up to ~15s
      await sleep(500);
      const backoff2 = await getSharedBackoffUntil();
      if (Date.now() < backoff2) {
        const e = new Error('ZOHO_RATE_LIMIT');
        e.retryAfterMs = backoff2 - Date.now();
        throw e;
      }
      const got = await getSharedToken();
      if (got && Date.now() < got.expiresAt) return got.accessToken;
    }
    // Still no token → report cooldown to avoid hammering
    const e = new Error('ZOHO_RATE_LIMIT');
    e.retryAfterMs = RL_DEFAULT_MS;
    throw e;
  }

  try {
    // We hold the lock: perform the refresh
    try {
      const tok = await fetchZohoAccessToken(cfg.refreshToken, cfg.clientId, cfg.clientSecret);
      await setSharedToken(tok.accessToken, tok.expiresAt);
      return tok.accessToken;
    } catch (err) {
      const msg = (typeof err?.response?.data === 'string')
        ? err.response.data
        : JSON.stringify(err?.response?.data || '');
      const rateLimited = /too many requests/i.test(msg) || err?.response?.status === 429;
      if (rateLimited) {
        const until = Date.now() + RL_DEFAULT_MS;
        await setSharedBackoffUntil(until);
        const e = new Error('ZOHO_RATE_LIMIT');
        e.retryAfterMs = RL_DEFAULT_MS;
        throw e;
      }
      throw err;
    }
  } finally {
    await unlockRefresh();
  }
}

/** Retry analytics call once if Zoho says INVALID_OAUTHTOKEN */
export async function withTokenRetry(doCall, cfg) {
  const token = await getAccessTokenShared(cfg);
  try {
    return await doCall(token);
  } catch (err) {
    const is401 = err?.response?.status === 401;
    const summary = String(err?.response?.data?.summary || err?.response?.data?.error || '');
    if (is401 && /INVALID_OAUTHTOKEN/i.test(summary)) {
      await clearSharedToken();
      const fresh = await getAccessTokenShared(cfg);
      return await doCall(fresh);
    }
    throw err;
  }
}
