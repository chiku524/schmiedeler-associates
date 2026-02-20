/**
 * POST /api/reply — send a reply to a contact submission (admin only).
 * Auth: Authorization: Bearer <ADMIN_SECRET>.
 * Body: { id: submissionKey, message: string, subject?: string }.
 * Sends from the department address that received the original (submission.toEmail) to submission.email.
 * Requires env: ADMIN_SECRET, RESEND_API_KEY, CONTACT_SUBMISSIONS (KV).
 */

const RESEND_URL = 'https://api.resend.com/emails';

function corsHeaders(origin) {
  const o = origin || '*';
  return {
    'Access-Control-Allow-Origin': o,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin');

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders(origin));
  }

  const adminSecret = env.ADMIN_SECRET;
  if (!adminSecret) {
    return jsonResponse({ error: 'Admin not configured' }, 503, corsHeaders(origin));
  }

  const authHeader = request.headers.get('Authorization');
  const providedKey = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : '';
  if (!providedKey || providedKey !== adminSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders(origin));
  }

  const kv = env.CONTACT_SUBMISSIONS;
  if (!kv || typeof kv.get !== 'function') {
    return jsonResponse({ error: 'Storage not configured' }, 503, corsHeaders(origin));
  }

  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: 'Reply is not configured. Missing RESEND_API_KEY.' }, 503, corsHeaders(origin));
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400, corsHeaders(origin));
  }

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const subjectOverride = typeof body.subject === 'string' ? body.subject.trim() : '';

  if (!id || !message) {
    return jsonResponse({ error: 'Missing required fields: id, message' }, 400, corsHeaders(origin));
  }
  if (!id.startsWith('submission:')) {
    return jsonResponse({ error: 'Invalid submission id' }, 400, corsHeaders(origin));
  }
  if (message.length > 10000) {
    return jsonResponse({ error: 'Message too long' }, 400, corsHeaders(origin));
  }

  const raw = await kv.get(id);
  if (!raw) {
    return jsonResponse({ error: 'Submission not found' }, 404, corsHeaders(origin));
  }

  let submission;
  try {
    submission = JSON.parse(raw);
  } catch {
    return jsonResponse({ error: 'Invalid submission data' }, 500, corsHeaders(origin));
  }

  const toEmail = submission.email;
  if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    return jsonResponse({ error: 'Invalid recipient' }, 400, corsHeaders(origin));
  }

  const fromEmail = submission.toEmail || 'info@schmiedeler.com';
  const fromAddress = `Schmiedeler & Associates <${fromEmail}>`;
  const subject = subjectOverride
    ? (subjectOverride.startsWith('Re:') ? subjectOverride : `Re: ${subjectOverride}`)
    : (submission.subject ? `Re: ${submission.subject}` : 'Re: Your message');

  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [toEmail],
      subject,
      text: message,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return jsonResponse(
      { error: data.message || 'Failed to send reply' },
      res.status >= 500 ? 502 : 400,
      corsHeaders(origin)
    );
  }

  return jsonResponse({ success: true }, 200, corsHeaders(origin));
}
