/* ─────────────────────────────────────────────────────────────────────────
   OG RASMI  →  resources/og.jpg  (1200×630)

   Ishga tushirish:  node tools/mkog.mjs   (npm run og)

   Bu rasm havola Telegram'da, WhatsApp'da yoki ijtimoiy tarmoqda
   tashlanganda ko'rinadi. Nima uchun kerak: rasmsiz havola shunchaki
   ko'k matn bo'lib qoladi va bosilish ehtimoli sezilarli kamayadi —
   O'zbekistonda tarqatishning asosiy kanali Telegram bo'lgani uchun
   bu bevosita muhim.

   NIMA UCHUN BIR MARTA YASALADI VA REPOGA QO'YILADI: rasmni yasash
   brauzer talab qiladi (shrift va maket kerak). Har build'da Chromium
   ishga tushirish CI'ni sekinlashtiradi va mo'rtlashtiradi, shuning
   uchun natija fayl sifatida saqlanadi — xuddi ilova ikonkalari kabi
   (tools/mkicons.mjs). Dizayn yoki matn o'zgarsa qayta ishga tushiriladi.

   FON: resources/art/og-bg.png bo'lsa (RASMLAR.md, matnsiz illyustratsiya)
   shu ishlatiladi va o'ng tomondagi matritsa kartasi chizilmaydi —
   illyustratsiya o'sha joyni egallaydi. Bo'lmasa fon CSS bilan chiziladi.

   MATN SHU YERDA, rasmda emas: rasm generatorlari harflarni buzadi,
   bu yerda esa matn aniq va ikki tilda bir xil shriftda chiqadi.
   Matn src/iq/CONTRACT.md §6 ga bo'ysunadi: "taxminiy", oraliq, klinik
   test emas; "IQ oshiradi" kabi raqamli va'da, "rasmiy", persentil,
   sog'liq da'volari — YO'Q. Raqam ham yo'q ("6 ta o'yin"): ilova bilan
   o'zgaradi, rasm esa eskirib qoladi.

   ILOVA NOMI capacitor.config.json → appName dan o'qiladi: u yagona
   manba va bu yerda qayta yozilmaydi (ish davomida nom bir marta
   almashgan — rasm qayta yasalishi kifoya edi).
   ───────────────────────────────────────────────────────────────────── */

/* Playwright loyihaning bog'liqligi EMAS (u faqat shu generatorlar uchun
   kerak va har bir o'rnatishga 100+ MB qo'shardi). U loyihada ham, global
   (npm i -g playwright) ham qidiriladi.
   Brauzer boshqa joyda bo'lsa: CHROME=/yo'l/chrome node tools/mkog.mjs */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { execFileSync } from 'child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const P = (...a) => join(ROOT, ...a);
const APP = JSON.parse(readFileSync(P('capacitor.config.json'), 'utf8')).appName;

async function loadChromium() {
  try { return (await import('playwright')).chromium; } catch (e) { /* keyingisi */ }
  try {
    const g = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
    return createRequire(join(g, 'noop.js'))('playwright').chromium;
  } catch (e) { return null; }
}
const chromium = await loadChromium();
if (!chromium) {
  console.error('[mkog] playwright topilmadi:\n  npm i -g playwright && npx playwright install chromium');
  process.exit(1);
}
const DEF = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const EXE = process.env.CHROME || (existsSync(DEF) ? DEF : undefined);

/* Shriftlar va rasmlar sahifaga base64 bilan joylashtiriladi:
   setContent() sahifasi file:// dan tashqi faylni o'qiy olmaydi. */
const b64 = f => readFileSync(f).toString('base64');
const fontDir = P('node_modules/@fontsource/manrope/files');
const face = (sub, w, range) => {
  const f = join(fontDir, `manrope-${sub}-${w}-normal.woff2`);
  if (!existsSync(f)) throw new Error(`[mkog] ${f} topilmadi (npm ci qilingan?)`);
  return `@font-face{font-family:M;font-weight:${w};src:url(data:font/woff2;base64,${b64(f)}) format('woff2');unicode-range:${range}}`;
};
/* lotin (oʻ/gʻ uchun U+02BB shu yerda) + kirill (ruscha chip) */
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2212';
const CYR = 'U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116';
const fonts = [800, 500].map(w => face('latin', w, LATIN) + face('cyrillic', w, CYR)).join('');

if (!existsSync(P('resources/icon-only.png'))) throw new Error('[mkog] resources/icon-only.png yo\'q — avval `npm run icons`');
const icon = b64(P('resources/icon-only.png'));
const ART = P('resources/art/og-bg.png');
const art = existsSync(ART) ? b64(ART) : null;

/* Matritsa kartasi — ilova nima qilishini bir qarashda ko'rsatadi.
   Qoida: har qatorda shakllar soni 1→2→3, ustunda shakl turi bir xil.
   Oxirgi katak — "?". Rangsiz ham yechiladi (§2.5 dagi qoida
   marketing rasmiga ham taalluqli). */
const shape = (kind, cx, cy, r) => kind === 'c'
  ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#1c1b29"/>`
  : kind === 's'
    ? `<rect x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" rx="${r * 0.2}" fill="none" stroke="#1c1b29" stroke-width="${r * 0.38}"/>`
    : `<path d="M${cx},${cy - r * 1.05} L${cx + r * 1.05},${cy + r * 0.85} L${cx - r * 1.05},${cy + r * 0.85}Z" fill="#8a8799"/>`;
const cellSvg = (row, col) => {
  const kinds = ['c', 's', 't'];
  const n = row + 1, k = kinds[col], r = n === 1 ? 15 : n === 2 ? 12 : 10;
  const xs = n === 1 ? [50] : n === 2 ? [32, 68] : [22, 50, 78];
  return xs.map(x => shape(k, x, 50, r)).join('');
};
let grid = '';
for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
  const x = c * 112, y = r * 112, last = r === 2 && c === 2;
  grid += `<g transform="translate(${x},${y})">` +
    `<rect width="100" height="100" rx="18" fill="${last ? '#EEF1FF' : '#fff'}" stroke="${last ? '#4C6FFF' : '#E4E2EE'}" stroke-width="${last ? 4 : 2}" ${last ? 'stroke-dasharray="10 8"' : ''}/>` +
    (last ? `<text x="50" y="68" text-anchor="middle" font-family="M" font-weight="800" font-size="52" fill="#4C6FFF">?</text>` : cellSvg(r, c)) +
    `</g>`;
}
const matrix = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-14 -14 352 352" width="352" height="352">${grid}</svg>`;

const html = `<!DOCTYPE html><meta charset="utf-8"><style>${fonts}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;background:#14121F;position:relative;
  font-family:M,system-ui,sans-serif;color:#F4F2FF;display:flex;align-items:center}
.art{position:absolute;inset:0;background:url(data:image/png;base64,${art || ''}) center/cover no-repeat}
/* Rasm ustida matn o'qilishi uchun chapdan qorong'ilik — rasm qanday
   bo'lmasin, kontrast yetarli qoladi. */
.shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(20,18,31,.92) 0%,rgba(20,18,31,.78) 45%,rgba(20,18,31,0) 72%)}
.glow{position:absolute;width:900px;height:900px;border-radius:50%;
  background:radial-gradient(circle,rgba(76,111,255,.45),transparent 62%);left:-260px;top:-300px}
.glow2{position:absolute;width:700px;height:700px;border-radius:50%;
  background:radial-gradient(circle,rgba(133,82,240,.32),transparent 62%);right:-180px;bottom:-320px}
.left{position:relative;padding:0 0 0 72px;width:700px;z-index:2}
.brand{display:flex;align-items:center;gap:16px}
.brand img{width:64px;height:64px;border-radius:16px}
.brand b{font-size:34px;font-weight:800;letter-spacing:-.02em}
h1{margin:30px 0 0;font-size:60px;font-weight:800;line-height:1.05;letter-spacing:-.03em}
p{margin:20px 0 0;font-size:24px;font-weight:500;line-height:1.45;color:#B9B4D4;max-width:600px}
.row{display:flex;gap:12px;margin-top:30px}
.chip{padding:10px 18px;border-radius:12px;background:rgba(244,242,255,.09);font-size:19px;font-weight:800}
.note{margin-top:22px;font-size:16px;font-weight:500;color:#8C87A8}
.right{position:relative;z-index:2;margin-left:auto;margin-right:92px;
  padding:26px;border-radius:32px;background:#fff;box-shadow:0 40px 90px rgba(0,0,0,.5);transform:rotate(-3deg)}
</style>
${art ? '<div class="art"></div><div class="shade"></div>' : '<div class="glow"></div><div class="glow2"></div>'}
<div class="left">
  <div class="brand"><img src="data:image/png;base64,${icon}"><b>${APP}</b></div>
  <h1>IQ testi va<br>aql oʻyinlari</h1>
  <p>Mantiqiy topshiriqlar, aql oʻyinlari va haftalik liga. Natija taxminiy — har doim oraliq bilan.</p>
  <div class="row">
    <span class="chip">Oʻzbekcha · Русский</span>
    <span class="chip">Test internetsiz ishlaydi</span>
  </div>
  <div class="note">Klinik IQ testi emas · natija taxminiy</div>
</div>
${art ? '' : `<div class="right">${matrix}</div>`}`;

const b = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--disable-background-networking'] });
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await p.setContent(html);
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(300);
const buf = await p.screenshot({ type: 'jpeg', quality: 88 });
await b.close();

writeFileSync(P('resources/og.jpg'), buf);
console.log(`resources/og.jpg — 1200×630, ${(buf.length / 1024).toFixed(0)} KB` +
            (art ? '  (fon: resources/art/og-bg.png)' : '  (fon: CSS, art/og-bg.png yo\'q)'));
