const crypto = require('crypto');

const STRAVA_API = 'https://www.strava.com/api/v3';
const STRAVA_OAUTH = 'https://www.strava.com/oauth';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function signState(payload) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 10 * 60 * 1000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', required('APP_SECRET')).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyState(state) {
  const [body, sig] = String(state || '').split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', required('APP_SECRET')).update(body).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  return payload.exp > Date.now() ? payload : null;
}

async function stravaTokenRequest(params) {
  const response = await fetch(`${STRAVA_OAUTH}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: required('STRAVA_CLIENT_ID'),
      client_secret: required('STRAVA_CLIENT_SECRET'),
      ...params
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Strava token request failed');
  return data;
}

async function stravaFetch(path, accessToken, options = {}) {
  const response = await fetch(`${STRAVA_API}${path}`, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${accessToken}` }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `Strava API error ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function db(path, options = {}) {
  const response = await fetch(`${required('SUPABASE_URL')}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: required('SUPABASE_SERVICE_ROLE_KEY'),
      Authorization: `Bearer ${required('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
      Prefer: options.method === 'POST' ? 'return=representation' : 'return=representation',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || data?.hint || `Supabase error ${response.status}`);
  return data;
}

async function getConnection() {
  const rows = await db('strava_connections?select=*&id=eq.1&limit=1');
  return rows?.[0] || null;
}

async function saveConnection(data) {
  return db('strava_connections?id=eq.1', {
    method: 'PATCH',
    body: JSON.stringify({ ...data, id: 1, updated_at: new Date().toISOString() })
  });
}

async function ensureAccessToken(connection) {
  if (connection.expires_at && connection.expires_at * 1000 > Date.now() + 60_000) return connection.access_token;
  const refreshed = await stravaTokenRequest({ grant_type: 'refresh_token', refresh_token: connection.refresh_token });
  await saveConnection({
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token,
    expires_at: refreshed.expires_at,
    scope: refreshed.scope || connection.scope,
    athlete_id: refreshed.athlete?.id || connection.athlete_id
  });
  return refreshed.access_token;
}

module.exports = { required, signState, verifyState, stravaTokenRequest, stravaFetch, db, getConnection, saveConnection, ensureAccessToken };
