/**
 * Cloudflare Pages Function: contact form → Resend.
 * POST /api/contact with JSON { name, email, subject, message }.
 * Requires env: RESEND_API_KEY. Optional: RESEND_FROM (default uses Resend sandbox).
 */

const RESEND_URL = 'https://api.resend.com/emails';

/** Department → recipient email. Unknown/missing department defaults to general. */
const DEPARTMENT_EMAILS = {
  general: 'info@schmiedeler.com',
  sales: 'sales@schmiedeler.com',
  accounting: 'accounting@schmiedeler.com',
};
const DEFAULT_TO_EMAIL = 'info@schmiedeler.com';

function corsHeaders(origin) {
  const o = origin || '*';
  return {
    'Access-Control-Allow-Origin': o,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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

  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    return jsonResponse(
      { error: 'Contact form is not configured. Missing RESEND_API_KEY.' },
      503,
      corsHeaders(origin)
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400, corsHeaders(origin));
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const department = typeof body.department === 'string' ? body.department.trim() : '';

  if (!name || !email || !subject || !message) {
    return jsonResponse(
      { error: 'Missing required fields: name, email, subject, message' },
      400,
      corsHeaders(origin)
    );
  }

  // Basic length limits to avoid abuse
  if (name.length > 200 || email.length > 254 || subject.length > 300 || message.length > 10000) {
    return jsonResponse({ error: 'A field exceeds maximum length' }, 400, corsHeaders(origin));
  }
  if (department.length > 80) {
    return jsonResponse({ error: 'Department value too long' }, 400, corsHeaders(origin));
  }

  const toEmail = (department && DEPARTMENT_EMAILS[department]) ? DEPARTMENT_EMAILS[department] : DEFAULT_TO_EMAIL;
  const fromAddress = env.RESEND_FROM || 'Schmiedeler & Associates Inc <info@schmiedeler.com>';
  const subjectPrefix = department ? `[${department}] ` : '';
  const subjectLine = `Schmiedeler.com: ${subjectPrefix}${subject}`;
  const deptBlock = department ? `Department: ${department}\n\n` : '';
  const textBody = `Name: ${name}\nEmail: ${email}\n${deptBlock}${message}`;

  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [toEmail],
      reply_to: email,
      subject: subjectLine,
      text: textBody,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return jsonResponse(
      { error: data.message || 'Failed to send email' },
      res.status >= 500 ? 502 : 400,
      corsHeaders(origin)
    );
  }

  return jsonResponse({ success: true }, 200, corsHeaders(origin));
}
