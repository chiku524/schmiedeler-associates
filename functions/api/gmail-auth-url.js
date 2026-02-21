/**
 * GET /api/gmail-auth-url — return Google OAuth 2.0 authorization URL for Gmail access.
 * Auth: Bearer <ADMIN_SECRET>.
 * Env: GOOGLE_CLIENT_ID, GMAIL_OAUTH_REDIRECT_URI (e.g. https://yoursite.com/api/gmail-oauth-callback).
 */

const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const adminSecret = env.ADMIN_SECRET;
  const clientId = env.GOOGLE_CLIENT_ID;
  const redirectUri = env.GMAIL_OAUTH_REDIRECT_URI;

  if (!adminSecret) {
    return jsonResponse({ error: 'Admin not configured' }, 503);
  }

  const authHeader = request.headers.get('Authorization');
  const key = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!key || key !== adminSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  if (!clientId || !redirectUri) {
    return jsonResponse({ error: 'Gmail not configured. Set GOOGLE_CLIENT_ID and GMAIL_OAUTH_REDIRECT_URI.' }, 503);
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
  });
  const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();
  return jsonResponse({ url }, 200);
}
