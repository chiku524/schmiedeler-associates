/**
 * GET /api/gmail-oauth-callback — OAuth callback. Exchange ?code= for tokens, store refresh_token in KV, redirect to admin.
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GMAIL_OAUTH_REDIRECT_URI, CONTACT_SUBMISSIONS (KV).
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const KV_KEY = 'gmail_refresh_token';

function redirect(url, status = 302) {
  return new Response(null, { status, headers: { Location: url } });
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const errorParam = url.searchParams.get('error');
  const baseUrl = url.origin;
  const adminUrl = baseUrl + '/admin.html';

  if (errorParam) {
    return redirect(adminUrl + '?gmail=denied');
  }

  if (!code) {
    return redirect(adminUrl + '?gmail=error');
  }

  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  const redirectUri = env.GMAIL_OAUTH_REDIRECT_URI;
  const kv = env.CONTACT_SUBMISSIONS;

  if (!clientId || !clientSecret || !redirectUri) {
    return redirect(adminUrl + '?gmail=config');
  }

  if (!kv || typeof kv.put !== 'function') {
    return redirect(adminUrl + '?gmail=storage');
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return redirect(adminUrl + '?gmail=exchange');
  }

  const refreshToken = data.refresh_token;
  if (!refreshToken) {
    return redirect(adminUrl + '?gmail=no_refresh');
  }

  try {
    await kv.put(KV_KEY, refreshToken);
  } catch (_) {
    return redirect(adminUrl + '?gmail=storage');
  }

  return redirect(adminUrl + '?gmail=connected');
}
