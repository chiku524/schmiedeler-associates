/**
 * GET /api/submissions — list contact form submissions for admin dashboard.
 * Auth required: Authorization: Bearer <ADMIN_SECRET> (header only; no query param).
 * Requires env: ADMIN_SECRET, CONTACT_SUBMISSIONS (KV namespace binding).
 */

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const adminSecret = env.ADMIN_SECRET;
  const kv = env.CONTACT_SUBMISSIONS;

  if (!adminSecret) {
    return jsonResponse({ error: 'Admin not configured' }, 503);
  }

  const authHeader = request.headers.get('Authorization');
  const providedKey = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : '';

  if (!providedKey || providedKey !== adminSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  if (!kv || typeof kv.list !== 'function') {
    return jsonResponse({ error: 'Storage not configured', submissions: [] }, 200);
  }

  try {
    const { keys } = await kv.list({ prefix: 'submission:' });
    const sorted = keys.sort((a, b) => (a.name > b.name ? -1 : 1));
    const submissions = [];
    for (const { name: key } of sorted) {
      const raw = await kv.get(key);
      if (raw) {
        try {
          submissions.push(JSON.parse(raw));
        } catch (_) {
          submissions.push({ id: key, raw });
        }
      }
    }
    return jsonResponse({ submissions }, 200);
  } catch (e) {
    return jsonResponse({ error: 'Failed to list submissions', submissions: [] }, 500);
  }
}
