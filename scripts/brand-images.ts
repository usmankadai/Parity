/**
 * Renders Parity's icons and link-preview image into public/, using
 * Playwright's Chromium, so they can be regenerated whenever the design
 * changes: `npm run brand:images`.
 */
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const require = createRequire(import.meta.url);
const PUBLIC = join(import.meta.dirname, '..', 'public');

const BRAND = '#2340cc';
const SIGNAL = '#ffd37a';
const INK = '#0e1726';
const INK_SOFT = '#4a5466';
const PAPER = '#f4f5f7';

/** The mark: an equals sign in a rounded square (the same shape as src/components/Logo.tsx). */
const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="${BRAND}"/>
  <rect x="8" y="10.5" width="16" height="3.5" rx="1.75" fill="#ffffff"/>
  <rect x="8" y="18" width="16" height="3.5" rx="1.75" fill="${SIGNAL}"/>
</svg>
`;

const fontDir = dirname(require.resolve('@fontsource-variable/ibm-plex-sans/package.json'));
const fontUrl = pathToFileURL(join(fontDir, 'files', 'ibm-plex-sans-latin-wght-normal.woff2')).href;

const PREVIEW_HTML = `<!doctype html>
<html><head><style>
  @font-face { font-family: Plex; src: url('${fontUrl}') format('woff2'); font-weight: 100 700; }
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; font-family: Plex, sans-serif; color: ${INK};
         background: ${PAPER}; padding: 64px 72px; display: flex; flex-direction: column; }
  .brand { display: flex; align-items: center; gap: 16px; font-size: 40px; font-weight: 700; letter-spacing: -0.02em; }
  .brand svg { width: 56px; height: 56px; }
  h1 { font-size: 60px; line-height: 1.08; letter-spacing: -0.02em; font-weight: 700; margin-top: 40px; max-width: 900px; }
  .table { margin-top: 44px; display: grid; grid-template-columns: 220px repeat(3, 1fr); background: #fff;
           border: 1px solid #dde1e8; border-radius: 16px; overflow: hidden; }
  .table div { padding: 18px 24px; border-top: 1px solid #dde1e8; font-size: 22px; }
  .table .h { border-top: 0; font-size: 16px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
              color: ${INK_SOFT}; background: ${PAPER}; }
  .table .row { font-weight: 600; }
  .v { display: block; font-weight: 650; font-size: 28px; }
  .tag { display: inline-block; margin-top: 8px; font-size: 15px; font-weight: 600; padding: 4px 10px; border-radius: 999px; vertical-align: middle; }
  .best { color: #0e6b3e; background: #e8f5ee; }
  .worst { color: #a3341a; background: #fbede8; }
  .foot { margin-top: auto; display: flex; justify-content: space-between; font-size: 20px; color: ${INK_SOFT}; }
</style></head><body>
  <div class="brand">${MARK_SVG}<span>Parity</span></div>
  <h1>Statutory benefits, compared across countries</h1>
  <div class="table">
    <div class="h">Benefit</div><div class="h">United Kingdom</div><div class="h">Germany</div><div class="h">Netherlands</div>
    <div class="row">Annual leave</div>
    <div><span class="v">28 days</span><span class="tag best">▲ Most generous</span></div>
    <div><span class="v">20 days</span><span class="tag worst">▼ Least generous</span></div>
    <div><span class="v">20 days</span><span class="tag worst">▼ Least generous</span></div>
  </div>
  <div class="foot"><span>Official sources · Ask questions about the data</span><span>Independent portfolio project</span></div>
</body></html>`;

/** Wraps PNG bytes in a single-image .ico file (modern ICO files may hold PNG data). */
function pngToIco(png: Buffer, size: number): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size, 0);
  entry.writeUInt8(size, 1);
  entry.writeUInt8(0, 2); // no palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12);
  return Buffer.concat([header, entry, png]);
}

async function main() {
  writeFileSync(join(PUBLIC, 'favicon.svg'), MARK_SVG);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  async function renderMark(size: number, padding = 0): Promise<Buffer> {
    await page.setViewportSize({ width: size, height: size });
    const inner = size - padding * 2;
    await page.setContent(
      `<body style="margin:0;background:${padding ? BRAND : 'transparent'}">
        <div style="padding:${padding}px">${MARK_SVG.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div>
      </body>`,
    );
    return page.screenshot({ omitBackground: padding === 0 });
  }

  const png32 = await renderMark(32);
  writeFileSync(join(PUBLIC, 'favicon.ico'), pngToIco(png32, 32));
  // Apple adds its own rounded corners, so the touch icon fills its square with brand colour.
  writeFileSync(join(PUBLIC, 'apple-touch-icon.png'), await renderMark(180, 18));

  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(PREVIEW_HTML);
  await page.evaluate(() => document.fonts.ready);
  writeFileSync(join(PUBLIC, 'og-image.png'), await page.screenshot());

  await browser.close();
  console.log('Wrote favicon.svg, favicon.ico, apple-touch-icon.png, og-image.png');
}

await main();
