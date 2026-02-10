/**
 * Export assets/logo.svg to PNG, JPEG, and favicon (light-background for dark browser tabs).
 * Run: npm run export-logo
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const LOGO_SVG = path.join(ASSETS, 'logo.svg');
const LOGO_PNG = path.join(ASSETS, 'logo.png');
const LOGO_JPEG = path.join(ASSETS, 'logo.jpg');
const FAVICON_PNG = path.join(ASSETS, 'favicon.png');

// Brand colors for raster export
const BRAND_NAVY = '#1e293b';
const BRAND_ACCENT = '#b45309';

async function main() {
  let svg = fs.readFileSync(LOGO_SVG, 'utf8');
  svg = svg.replace(/currentColor/g, BRAND_NAVY);
  svg = svg.replace(/var\(--logo-accent,\s*#b45309\)/g, BRAND_ACCENT);

  const opts = {
    fitTo: { mode: 'width', value: 512 },
    background: 'transparent',
  };

  const resvg = new Resvg(Buffer.from(svg), opts);
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  fs.writeFileSync(LOGO_PNG, pngBuffer);
  console.log('Written:', LOGO_PNG);

  await sharp(pngBuffer)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: 92 })
    .toFile(LOGO_JPEG);
  console.log('Written:', LOGO_JPEG);

  // Favicon: logo on light background so it's visible on dark browser tabs
  const faviconResvg = new Resvg(Buffer.from(svg), { fitTo: { mode: 'width', value: 64 } });
  const faviconPngBuffer = faviconResvg.render().asPng();
  const [r, g, b] = [0xf2, 0xf4, 0xf7];
  await sharp(faviconPngBuffer)
    .flatten({ background: { r, g, b } })
    .resize(32, 32)
    .toFile(FAVICON_PNG);
  console.log('Written:', FAVICON_PNG);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
