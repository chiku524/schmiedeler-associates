#!/usr/bin/env node
/**
 * Creates the Cloudflare KV namespace used by the admin dashboard (CONTACT_SUBMISSIONS).
 * Run once with: CLOUDFLARE_ACCOUNT_ID=xxx CLOUDFLARE_API_TOKEN=xxx node scripts/create-admin-kv.js
 * Then add the KV binding in the Cloudflare Dashboard (see printed instructions).
 */

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const NAMESPACE_TITLE = 'contact-submissions';
const BINDING_NAME = 'CONTACT_SUBMISSIONS';

async function main() {
  if (!ACCOUNT_ID || !API_TOKEN) {
    console.error('Missing required env vars. Set:');
    console.error('  CLOUDFLARE_ACCOUNT_ID  (from Cloudflare Dashboard → Workers & Pages → right sidebar or URL)');
    console.error('  CLOUDFLARE_API_TOKEN   (Dashboard → My Profile → API Tokens → Create Token, e.g. "Edit Cloudflare Workers")');
    console.error('');
    console.error('Example (Bash):');
    console.error('  export CLOUDFLARE_ACCOUNT_ID=your_account_id');
    console.error('  export CLOUDFLARE_API_TOKEN=your_token');
    console.error('  node scripts/create-admin-kv.js');
    process.exit(1);
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title: NAMESPACE_TITLE }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (data.errors && data.errors.length > 0) {
      const msg = data.errors.map((e) => e.message).join('; ');
      console.error('Cloudflare API error:', msg);
    } else {
      console.error('Cloudflare API error:', res.status, await res.text());
    }
    process.exit(1);
  }

  const id = data.result && data.result.id;
  if (!id) {
    console.error('Unexpected API response: no namespace id');
    process.exit(1);
  }

  console.log('KV namespace created successfully.\n');
  console.log('  Title:', NAMESPACE_TITLE);
  console.log('  ID:  ', id);
  console.log('');
  console.log('Next: bind it to your Pages project so the admin dashboard can store submissions.');
  console.log('');
  console.log('1. Open Cloudflare Dashboard → Workers & Pages → your Pages project (e.g. schmiedeler).');
  console.log('2. Go to Settings → Functions → KV namespace bindings.');
  console.log('3. Click "Add binding".');
  console.log('4. Variable name:  ' + BINDING_NAME);
  console.log('5. KV namespace:   select "' + NAMESPACE_TITLE + '" (ID: ' + id + ').');
  console.log('6. Save and redeploy the project.');
  console.log('');
  console.log('You already set ADMIN_SECRET. Ensure RESEND_API_KEY is set for the contact form and replies.');
}

main();
