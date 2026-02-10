/**
 * Export assets/logo.svg to PNG and JPEG.
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

// Brand color for raster export (currentColor in SVG becomes this)
const BRAND_NAVY = '#1e293b';

function main() {
  let svg = fs.readFileSync(LOGO_SVG, 'utf8');
  svg = svg.replace(/currentColor/g, BRAND_NAVY);

  const opts = {
    fitTo: { mode: 'width', value: 512 },
    background: 'transparent',
  };

  const resvg = new Resvg(Buffer.from(svg), opts);
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  fs.writeFileSync(LOGO_PNG, pngBuffer);
  console.log('Written:', LOGO_PNG);

  sharp(pngBuffer)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: 92 })
    .toFile(LOGO_JPEG)
    .then(() => console.log('Written:', LOGO_JPEG))
    .catch((err) => {
      console.error('JPEG export failed:', err);
      process.exit(1);
    });
}

main();
