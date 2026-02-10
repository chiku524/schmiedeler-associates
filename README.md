# Schmiedeler & Associates Inc. — Institutional website

Institutional website for **Schmiedeler & Associates Inc.** (schmiedeler.com). Static site suitable for deployment on Cloudflare Pages.

## Contents

- **About** — Company history (since 1992), focus, and markets  
- **Services** — USA representation, purchase agent, cargo consolidation, import/export  
- **Products** — Electronic components (ICs, transistors, diodes, memories, LEDs, displays, resistors, potentiometers, connectors & cables, inductors)  
- **Manufacturers** — FLUKE, PHILIPS, B&K, TEXAS  
- **Contact** — Email and call-to-action  

## Run locally

No build step. Open `index.html` in a browser, or use a local server:

```bash
# Python
python -m http.server 8000

# Node (npx)
npx serve .
```

Then visit `http://localhost:8000`.

## Deploy to Cloudflare Pages

Your domain **schmiedeler.com** is already on Cloudflare. To put this site live:

### Option A: Connect Git (recommended)

1. In [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Connect your Git provider and select this repository.
3. **Build settings:**
   - **Framework preset:** None
   - **Build command:** (leave empty)
   - **Build output directory:** `/` (root)
4. Deploy. Set **schmiedeler.com** as the custom domain in the Pages project settings.

### Option B: Direct upload (Wrangler)

1. Install Wrangler: `npm i -g wrangler`
2. Log in: `wrangler login`
3. From this project root, deploy:
   ```bash
   wrangler pages deploy . --project-name=schmiedeler
   ```
4. In the Cloudflare Pages project, add **schmiedeler.com** as a custom domain (see below).

### DNS records for schmiedeler.com

Add these records in the **DNS** tab for **schmiedeler.com** (Dashboard → **Websites** → **schmiedeler.com** → **DNS** → **Records** → **Add record**).

| Type  | Name | Content / Target           | Proxy status |
|-------|------|----------------------------|--------------|
| CNAME | `@`  | `schmiedeler.pages.dev`    | Proxied (orange cloud) |
| CNAME | `www`| `schmiedeler.pages.dev`    | Proxied (orange cloud) |

- **Name `@`** = apex/root (schmiedeler.com). Cloudflare supports CNAME at apex (CNAME flattening).
- **Proxy status:** leave **Proxied** (orange cloud) so Cloudflare provides SSL and CDN.

After saving both records, add the custom domain in the Pages project (see below).

### Add custom domain in Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages**.
2. Click the **schmiedeler** project.
3. Open **Custom domains** (or **Settings** → **Domains and routes**).
4. Click **Set up a custom domain** (or **Add custom domain**).
5. Enter **schmiedeler.com** → **Continue**. Add **www.schmiedeler.com** as well if you want.
6. Cloudflare will link the domain to your project; with the DNS records above in place, the site will resolve.

### Option C: Drag & drop

1. **Workers & Pages** → **Create** → **Pages** → **Upload assets**.
2. Zip the contents of this folder (must include `index.html`, `css/`, `js/` at the root of the zip).
3. Upload the zip and add **schmiedeler.com** as the custom domain.

## Project structure

```
schmiedeler-associates/
├── index.html      # Single-page site
├── sitemap.xml     # SEO sitemap
├── robots.txt      # Crawler rules + sitemap URL
├── assets/
│   ├── logo.svg    # Source logo (electronics microchip icon)
│   ├── logo.png    # Exported PNG (run npm run export-logo)
│   └── logo.jpg    # Exported JPEG
├── css/
│   └── style.css   # Styles
├── js/
│   └── main.js     # Nav toggle, footer year
├── scripts/
│   └── export-logo.js  # SVG → PNG/JPEG export
└── README.md
```

## SEO

The site includes: canonical URL, meta description and keywords, Open Graph and Twitter Card tags, theme-color, JSON-LD Organization schema, `sitemap.xml`, and `robots.txt`. Update `sitemap.xml` `lastmod` when you make significant content changes. For richer link previews, add a dedicated social image (e.g. 1200×630) and set `og:image` and `twitter:image` to its URL.

## Logo

The header uses an electronics-themed mark (microchip with pins and circuit traces). Source: `assets/logo.svg`. To regenerate PNG and JPEG:

```bash
npm run export-logo
```

Output: `assets/logo.png` (512px width, transparent), `assets/logo.jpg` (512px, white background).

## Customization

- **Contact form (Formspree):** The contact form at the bottom of the site posts to [Formspree](https://formspree.io). To receive submissions at **info@schmiedeler.com**:
  1. Sign up at [formspree.io](https://formspree.io) and create a new form.
  2. Set the form’s email address to **info@schmiedeler.com**.
  3. Copy your form ID (e.g. `xyzabc` from `https://formspree.io/f/xyzabc`).
  4. In `index.html`, find the contact form and replace `YOUR_FORM_ID` in the form `action` with your form ID: `action="https://formspree.io/f/YOUR_FORM_ID"`.
  After a successful submit, Formspree redirects back to the site and a “Thank you” message is shown.
- **Contact email:** Update `info@schmiedeler.com` in the form’s `_next` URL, mailto link, and Formspree recipient if you change the address.
- **Employee count:** The site does not display employee count; add a line in the About section or in a meta block if needed.
- **Favicon:** The site uses `assets/logo.png` as favicon and Apple touch icon. To use a different image, replace the file or add `<link rel="icon" href="…" />` and `<link rel="apple-touch-icon" href="…" />` in the `<head>`.
- **Sitemap:** When you make significant content changes, update the `<lastmod>` date in `sitemap.xml`.
