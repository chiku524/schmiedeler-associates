/**
 * GET /api/gmail-inbox — fetch messages from Gmail (schmiedeler.associates@gmail.com), grouped by department (To: info@, sales@, accounting@).
 * Auth: Bearer <ADMIN_SECRET>.
 * Env: ADMIN_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, CONTACT_SUBMISSIONS (KV for refresh_token).
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_LIST = 'https://gmail.googleapis.com/gmail/v1/users/me/messages';
const KV_KEY = 'gmail_refresh_token';
const DEPT_EMAILS = ['info@schmiedeler.com', 'sales@schmiedeler.com', 'accounting@schmiedeler.com'];
const DEPT_MAP = {
  'info@schmiedeler.com': 'general',
  'sales@schmiedeler.com': 'sales',
  'accounting@schmiedeler.com': 'accounting',
};
const MAX_MESSAGES = 150;

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function getHeader(headers, name) {
  if (!headers || !Array.isArray(headers)) return '';
  const h = headers.find((x) => (x.name || '').toLowerCase() === name.toLowerCase());
  return h ? (h.value || '').trim() : '';
}

const GMAIL_ADDRESS = 'schmiedeler.associates@gmail.com';

function inferDepartment(toHeader) {
  const lower = (toHeader || '').toLowerCase();
  if (lower.includes('sales@schmiedeler.com')) return 'sales';
  if (lower.includes('accounting@schmiedeler.com')) return 'accounting';
  if (lower.includes('info@schmiedeler.com')) return 'general';
  if (lower.includes(GMAIL_ADDRESS)) return 'gmail';
  return 'gmail';
}

export async function onRequest(context) {
  const { request, env } = context;
  const adminSecret = env.ADMIN_SECRET;
  const kv = env.CONTACT_SUBMISSIONS;
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;

  if (!adminSecret) {
    return jsonResponse({ error: 'Admin not configured', gmail: [], gmailConnected: false }, 503);
  }

  const authHeader = request.headers.get('Authorization');
  const key = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!key || key !== adminSecret) {
    return jsonResponse({ error: 'Unauthorized', gmail: [], gmailConnected: false }, 401);
  }

  if (!kv || typeof kv.get !== 'function') {
    return jsonResponse({ gmail: [], gmailConnected: false }, 200);
  }

  const refreshToken = await kv.get(KV_KEY);
  if (!refreshToken) {
    return jsonResponse({ gmail: [], gmailConnected: false }, 200);
  }

  if (!clientId || !clientSecret) {
    return jsonResponse({ gmail: [], gmailConnected: true, error: 'Gmail API not configured' }, 200);
  }

  const tokenBody = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenBody.toString(),
  });

  const tokenData = await tokenRes.json().catch(() => ({}));
  const accessToken = tokenData.access_token;

  if (!tokenRes.ok || !accessToken) {
    return jsonResponse({ gmail: [], gmailConnected: true, error: 'Could not refresh Gmail access' }, 200);
  }

  const listRes = await fetch(GMAIL_LIST + '?maxResults=' + Math.min(MAX_MESSAGES, 100), {
    headers: { Authorization: 'Bearer ' + accessToken },
  });

  const listData = await listRes.json().catch(() => ({}));
  const messages = listData.messages || [];

  const results = [];
  for (let i = 0; i < Math.min(messages.length, MAX_MESSAGES); i++) {
    const msg = messages[i];
    const getRes = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/' + msg.id + '?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date',
      { headers: { Authorization: 'Bearer ' + accessToken } }
    );
    const getData = await getRes.json().catch(() => ({}));
    const payload = getData.payload || {};
    const headers = payload.headers || [];
    const from = getHeader(headers, 'From');
    const to = getHeader(headers, 'To');
    const subject = getHeader(headers, 'Subject');
    const date = getHeader(headers, 'Date');
    const snippet = (getData.snippet || '').trim();
    const department = inferDepartment(to);
    results.push({
      id: 'gmail:' + msg.id,
      name: from.replace(/<[^>]+>/, '').trim() || from,
      email: from.match(/<([^>]+)>/) ? from.match(/<([^>]+)>/)[1] : from,
      toEmail: to || 'info@schmiedeler.com',
      subject: subject || '(No subject)',
      message: snippet,
      createdAt: date,
      department,
      source: 'gmail',
    });
  }

  results.sort((a, b) => {
    const dA = new Date(a.createdAt).getTime();
    const dB = new Date(b.createdAt).getTime();
    return dB - dA;
  });

  return jsonResponse({ gmail: results, gmailConnected: true }, 200);
}
