/**
 * POST /api/reply — send a reply to a contact submission (admin only).
 * Auth: Authorization: Bearer <ADMIN_SECRET>.
 * Body (contact form submission): { id, message, subject?, cc?, attachments?, html? }.
 * Body (Gmail/direct reply): { toEmail, department, message, subject?, cc?, attachments?, html? } — no KV lookup.
 * message: plain text (required). html: optional rich HTML.
 * Sends from the department address (submission.toEmail or DEPARTMENT_EMAILS[department]).
 * Requires env: ADMIN_SECRET, RESEND_API_KEY; CONTACT_SUBMISSIONS (KV) only for id-based reply.
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
  let cc = body.cc;
  if (typeof cc === 'string') cc = cc.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);
  if (!Array.isArray(cc)) cc = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const ccValid = cc.filter((e) => typeof e === 'string' && emailRegex.test(e));
  let attachments = Array.isArray(body.attachments) ? body.attachments : [];
  const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024; // 4MB each (decoded)
  const MAX_TOTAL_ATTACHMENTS_BYTES = 10 * 1024 * 1024; // 10MB total
  let totalAttachmentBytes = 0;
  const attachmentsSanitized = [];
  for (const a of attachments) {
    if (!a || typeof a.filename !== 'string' || typeof a.content !== 'string') continue;
    const raw = a.content.replace(/^data:[^;]+;base64,/, '').trim();
    const approxBytes = Math.floor((raw.length * 3) / 4);
    if (approxBytes > MAX_ATTACHMENT_BYTES || totalAttachmentBytes + approxBytes > MAX_TOTAL_ATTACHMENTS_BYTES) continue;
    totalAttachmentBytes += approxBytes;
    attachmentsSanitized.push({ filename: a.filename.slice(0, 255), content: raw });
  }

  const toEmailDirect = typeof body.toEmail === 'string' ? body.toEmail.trim() : '';
  const departmentDirect = typeof body.department === 'string' ? body.department.trim() : '';
  const isDirectReply = toEmailDirect && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmailDirect) && ['general', 'sales', 'accounting'].includes(departmentDirect);

  if (!message) {
    return jsonResponse({ error: 'Missing required field: message' }, 400, corsHeaders(origin));
  }
  if (message.length > 10000) {
    return jsonResponse({ error: 'Message too long' }, 400, corsHeaders(origin));
  }

  let html = typeof body.html === 'string' ? body.html.trim() : '';
  const ALLOWED = ['b', 'i', 'u', 'strong', 'em', 'br', 'p', 'div', 'span'];
  if (html && html.length <= 50000) {
    html = html
      .replace(/<\/?(?!b|i|u|strong|em|br|p|div|span)(\w+)[^>]*\/?>/gi, '')
      .replace(/<(b|i|u|strong|em|br|p|div|span)(\s[^>]*)?>/gi, (_, tag) => '<' + tag.toLowerCase() + '>');
  } else if (html) {
    html = '';
  }

  let toEmail, fromEmail, subject;

  if (isDirectReply) {
    toEmail = toEmailDirect;
    const DEPARTMENT_EMAILS = {
      general: 'info@schmiedeler.com',
      sales: 'sales@schmiedeler.com',
      accounting: 'accounting@schmiedeler.com',
    };
    fromEmail = DEPARTMENT_EMAILS[departmentDirect] || 'info@schmiedeler.com';
    subject = subjectOverride
      ? (subjectOverride.startsWith('Re:') ? subjectOverride : `Re: ${subjectOverride}`)
      : 'Re: Your message';
  } else {
    if (!id || !id.startsWith('submission:')) {
      return jsonResponse({ error: 'Missing id (submission) or valid toEmail+department' }, 400, corsHeaders(origin));
    }
    if (!kv || typeof kv.get !== 'function') {
      return jsonResponse({ error: 'Storage not configured' }, 503, corsHeaders(origin));
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
    toEmail = submission.email;
    if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      return jsonResponse({ error: 'Invalid recipient' }, 400, corsHeaders(origin));
    }
    fromEmail = submission.toEmail || 'info@schmiedeler.com';
    subject = subjectOverride
      ? (subjectOverride.startsWith('Re:') ? subjectOverride : `Re: ${subjectOverride}`)
      : (submission.subject ? `Re: ${submission.subject}` : 'Re: Your message');
  }

  const fromAddress = `Schmiedeler & Associates <${fromEmail}>`;

  const payload = {
    from: fromAddress,
    to: [toEmail],
    subject,
    text: message,
  };
  if (html) payload.html = html;
  if (ccValid.length > 0) payload.cc = ccValid;
  if (attachmentsSanitized.length > 0) payload.attachments = attachmentsSanitized;

  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
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
