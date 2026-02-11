/**
 * Cloudflare Pages Function: contact form → Resend.
 * POST /api/contact with JSON { name, email, subject, message }.
 * Requires env: RESEND_API_KEY. Optional: RESEND_FROM (default uses Resend sandbox).
 */

const RESEND_URL = 'https://api.resend.com/emails';
const TO_EMAIL = 'info@schmiedeler.com';

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

  const fromAddress = env.RESEND_FROM || 'Schmiedeler & Associates Inc <info@schmiedeler.com>';
  const subjectLine = `Schmiedeler.com: ${subject}`;
  const textBody = `Name: ${name}\nEmail: ${email}\n\n${message}`;

  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [TO_EMAIL],
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
