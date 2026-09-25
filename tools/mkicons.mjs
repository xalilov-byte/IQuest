/* ─────────────────────────────────────────────────────────────────────────
   ILOVA IKONKASI, MAVZULI IKONKA, BILDIRISHNOMA IKONKASI, SPLASH
   (ARXITEKTURA.md §12.2)

   Ishga tushirish:  node tools/mkicons.mjs        (npm run icons)
                     node tools/mkicons.mjs --splash   (splash drawable'larini ham)

   Manba — tools/brand.html (_icons bo'limi; belgi geometriyasi o'sha yerda).
   Yoziladi:
     resources/icon-only.png         1024  eski ikonka, Play/PWA manbasi (mksite)
     resources/icon-foreground.png   1024  adaptiv old qatlam (shaffof)
     resources/icon-background.png   1024  adaptiv orqa qatlam
     resources/icon-monochrome.png   1024  Android 13 mavzuli ikonka qatlami
     resources/splash.png, splash-dark.png  2732
     android/app/src/main/res/
       mipmap-{ldpi..xxxhdpi}/ic_launcher.png, ic_launcher_round.png   48dp (API 24–25)
       mipmap-{ldpi..xxxhdpi}/ic_launcher_{foreground,background,monochrome}.png  108dp
       mipmap-anydpi-v26/ic_launcher.xml, ic_launcher_round.xml  (+ <monochrome>)
       drawable-{mdpi..xxxhdpi}/ic_stat_iquest.png   24/36/48/72/96 px, oq siluet
       (--splash bilan) drawable-…/splash.png

   NIMA UCHUN capacitor-assets ISHLATILMAYDI: u adaptiv qatlamni 48dp PNG
   qilib `inset 16.7%` bilan 72dp ga CHO'ZADI (ikonka xira chiqadi), orqa
   qatlamni ham kesadi va <monochrome> ni bilmaydi — har ishga tushishda
   mavzuli ikonkani o'chirib yuboradi. Bu skript qatlamlarni to'liq 108dp
   (xxxhdpi 432 px) va insetsiz yozadi.
   ───────────────────────────────────────────────────────────────────── */

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'fs';
import { createServer } from 'http';
import { join, dirname, resolve, extname, sep } from 'path';
import { fileURLToPath } from 'url';
import { loadChromium, CHROME } from './mkplay.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RES = join(ROOT, 'android', 'app', 'src', 'main', 'res');
const SPLASH = process.argv.includes('--splash');

/* `npm run icons` hali eski ko'rinishda bo'lsa (… && npx capacitor-assets
   generate), capacitor-assets shu skriptdan KEYIN ishlab, mavzuli ikonkani
   o'chirib yuboradi. Shuning uchun ish bajariladi, lekin zanjir to'xtatiladi. */
const chained = /capacitor-assets/.test(process.env.npm_lifecycle_script || '');

let sharp;
try { sharp = (await import('sharp')).default; }
catch (e) { console.error('[mkicons] sharp ishlamayapti — `npm rebuild sharp`'); process.exit(1); }

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.woff': 'font/woff', '.woff2': 'font/woff2', '.png': 'image/png' };
const srv = await new Promise(r => {
  const s = createServer((req, res) => {
    const f = resolve(ROOT, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!(f + sep).startsWith(ROOT + sep) || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }); res.end(readFileSync(f));
  });
  s.listen(0, '127.0.0.1', () => r(s));
});
const chromium = await loadChromium('mkicons');
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

async function shot(id, alpha) {
  const p = await b.newPage({ viewport: { width: 1200, height: 1200 } });
  await p.goto(`http://127.0.0.1:${srv.address().port}/tools/brand.html?group=_icons&id=${id}`);
  await p.waitForFunction(() => window.__ready, null, { timeout: 30000 });
  const err = await p.evaluate(() => window.__error);
  if (err) throw new Error(`[mkicons] ${id}: ${err}`);
  await p.evaluate(() => { document.documentElement.style.background = 'transparent'; });
  const [w, h] = await p.evaluate(() => { const s = document.querySelector('section.on'); return [+s.dataset.w, +s.dataset.h]; });
  await p.setViewportSize({ width: w, height: h });
  const buf = await p.locator('section.on').screenshot({ omitBackground: alpha });
  await p.close();
  return buf;
}

const SRC = {
  only: await shot('icon-only', false), legacy: await shot('icon-legacy', true), round: await shot('icon-round', true),
  fg: await shot('icon-fg', true), bg: await shot('icon-bg', false), mono: await shot('icon-mono', true),
  stat: await shot('stat', true), splash: await shot('splash', false),
};
await b.close();
srv.close();

const png = (buf, size, opaque) => {
  let s = sharp(buf).resize(size, size, { kernel: 'lanczos3' });
  s = opaque ? s.flatten({ background: '#14121F' }).removeAlpha() : s.ensureAlpha();
  return s.png({ compressionLevel: 9 }).toBuffer();
};
const put = async (file, buf) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, buf); };

/* 1. resources/ manbalari */
const R = f => join(ROOT, 'resources', f);
await put(R('icon-only.png'), await png(SRC.only, 1024, true));
await put(R('icon-foreground.png'), await png(SRC.fg, 1024, false));
await put(R('icon-background.png'), await png(SRC.bg, 1024, true));
await put(R('icon-monochrome.png'), await png(SRC.mono, 1024, false));
await put(R('splash.png'), await png(SRC.splash, 2732, true));
await put(R('splash-dark.png'), await png(SRC.splash, 2732, true));

/* 2. Launcher ikonkalari */
const DENS = { ldpi: .75, mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(DENS)) {
  const dir = join(RES, `mipmap-${d}`);
  await put(join(dir, 'ic_launcher.png'), await png(SRC.legacy, Math.round(48 * k), false));
  await put(join(dir, 'ic_launcher_round.png'), await png(SRC.round, Math.round(48 * k), false));
  await put(join(dir, 'ic_launcher_foreground.png'), await png(SRC.fg, Math.round(108 * k), false));
  await put(join(dir, 'ic_launcher_background.png'), await png(SRC.bg, Math.round(108 * k), true));
  await put(join(dir, 'ic_launcher_monochrome.png'), await png(SRC.mono, Math.round(108 * k), false));
}
const ADAPTIVE = `<?xml version="1.0" encoding="utf-8"?>
<!-- tools/mkicons.mjs yozadi (manba: tools/brand.html). Qatlamlar to'liq 108dp,
     inset yo'q. <monochrome> — Android 13+ mavzuli ikonka (ARXITEKTURA §12.2). -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome" />
</adaptive-icon>
`;
await put(join(RES, 'mipmap-anydpi-v26', 'ic_launcher.xml'), Buffer.from(ADAPTIVE));
await put(join(RES, 'mipmap-anydpi-v26', 'ic_launcher_round.xml'), Buffer.from(ADAPTIVE));
await put(join(RES, 'values', 'ic_launcher_background.xml'), Buffer.from(
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#2B2270</color>\n</resources>\n`));

/* 3. Bildirishnoma kichik ikonkasi: 24dp, faqat oq + alfa (tizim o'zi bo'yaydi) */
const STAT = { mdpi: 24, hdpi: 36, xhdpi: 48, xxhdpi: 72, xxxhdpi: 96 };
for (const [d, px] of Object.entries(STAT)) {
  const alpha = await sharp(SRC.stat).resize(px, px, { kernel: 'lanczos3' }).ensureAlpha().extractChannel(3).toBuffer();
  const buf = await sharp({ create: { width: px, height: px, channels: 3, background: '#FFFFFF' } })
    .joinChannel(alpha).png({ compressionLevel: 9 }).toBuffer();
  await put(join(RES, `drawable-${d}`, 'ic_stat_iquest.png'), buf);
}

/* 4. Splash drawable'lari (faqat --splash; odatda o'zgarmaydi, §12.2) */
if (SPLASH) {
  const sizes = { ldpi: [240, 320], mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] };
  for (const night of ['', '-night']) for (const [d, [w, h]] of Object.entries(sizes)) {
    await put(join(RES, `drawable-port${night}-${d}`, 'splash.png'), await sharp(SRC.splash).resize(w, h, { fit: 'cover' }).png().toBuffer());
    await put(join(RES, `drawable-land${night}-${d}`, 'splash.png'), await sharp(SRC.splash).resize(h, w, { fit: 'cover' }).png().toBuffer());
  }
  await put(join(RES, 'drawable', 'splash.png'), await sharp(SRC.splash).resize(320, 480, { fit: 'cover' }).png().toBuffer());
  await put(join(RES, 'drawable-night', 'splash.png'), await sharp(SRC.splash).resize(320, 480, { fit: 'cover' }).png().toBuffer());
}

console.log('[mkicons] resources/icon-*.png, mipmap-* (legacy + adaptiv 108dp + monochrome), ' +
            'mipmap-anydpi-v26/*.xml, drawable-*/ic_stat_iquest.png' + (SPLASH ? ', splash' : '') + ' — yozildi');
if (chained) {
  console.error('\n[mkicons] package.json dagi "icons" skripti hali `… && npx capacitor-assets generate`.\n' +
                '  capacitor-assets mavzuli ikonkani o\'chirib yuborardi, shuning uchun zanjir TO\'XTATILDI\n' +
                '  (ikonkalar yozib bo\'lingan). Skriptni `node tools/mkicons.mjs` ga o\'zgartiring.');
  process.exit(3);
}
