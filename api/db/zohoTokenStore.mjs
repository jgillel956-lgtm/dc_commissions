import { query } from './connection.mjs';

// Use a fixed advisory lock key for "zoho oauth refresh"
const LOCK_KEY_1 = 0x5A0;   // any int32
const LOCK_KEY_2 = 0x0A0;   // any int32

export async function getSharedBackoffUntil() {
  const { rows } = await query(
    'select backoff_until from oauth_state where provider=$1',
    ['zoho']
  );
  const ts = rows[0]?.backoff_until ? new Date(rows[0].backoff_until).getTime() : 0;
  return ts || 0;
}

export async function setSharedBackoffUntil(untilMs) {
  await query(
    `insert into oauth_state (provider, backoff_until, updated_at)
     values ($1, to_timestamp($2/1000.0), now())
     on conflict (provider) do update
       set backoff_until=excluded.backoff_until, updated_at=now()`,
    ['zoho', untilMs]
  );
}

export async function getSharedToken() {
  const { rows } = await query(
    'select access_token, expires_at from oauth_tokens where provider=$1',
    ['zoho']
  );
  if (!rows[0]) return null;
  return {
    accessToken: rows[0].access_token,
    expiresAt: new Date(rows[0].expires_at).getTime(),
  };
}

export async function setSharedToken(accessToken, expiresAtMs) {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new Error('Invalid access token provided to setSharedToken');
  }
  if (!expiresAtMs || typeof expiresAtMs !== 'number') {
    throw new Error('Invalid expiresAtMs provided to setSharedToken');
  }
  
  await query(
    `insert into oauth_tokens (provider, access_token, expires_at, updated_at)
     values ($1, $2, to_timestamp($3/1000.0), now())
     on conflict (provider) do update
       set access_token=excluded.access_token, expires_at=excluded.expires_at, updated_at=now()`,
    ['zoho', accessToken, expiresAtMs]
  );
}

export async function clearSharedToken() {
  await query(
    `update oauth_tokens set expires_at=now() - interval '1 day', updated_at=now()
     where provider=$1`,
    ['zoho']
  );
}

/** Try to take an advisory lock; returns true if this process owns the refresh. */
export async function tryRefreshLock() {
  const { rows } = await query('select pg_try_advisory_lock($1, $2) as ok', [LOCK_KEY_1, LOCK_KEY_2]);
  return !!rows[0]?.ok;
}

export async function unlockRefresh() {
  await query('select pg_advisory_unlock($1, $2)', [LOCK_KEY_1, LOCK_KEY_2]);
}
