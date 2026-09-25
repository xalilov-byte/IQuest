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
   (tools/mkicons.mjs). Matn yoki ikonka o'zgarsa qayta ishga tushiriladi.

   ILOVA KODIGA BOG'LIQ EMAS: rasm faqat matn + ikonkadan
   (resources/icon-only.png) yasaladi. Ilgari u dizayn manbasidan
   imtihon formatini o'qirdi va ekran suratini talab qilardi — ekranlar
   o'zgarganda generator yiqilardi. Endi raqamli da'vo ham yo'q, ya'ni
   eskiradigan narsa yo'q.

   MATN QOIDALARI (src/iq/CONTRACT.md §6): ball faqat "taxminiy" va
   oraliq bilan; "IQ oshiradi", "rasmiy", "sertifikatlangan", "Mensa",
   "klinik", persentil — YO'Q. Bu yerga faqat v1 da HAQIQATAN bor
   narsa yoziladi (liga, reyting, sertifikat — keyingi versiya).
   ───────────────────────────────────────────────────────────────────── */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import { join } from 'path';

/* Playwright loyihaning bog'liqligi EMAS (u faqat generatorlar uchun
   kerak va har o'rnatishga 100+ MB qo'shardi). Avval loyihadan, keyin
   global o'rnatilganidan qidiriladi. Kerak bo'lsa:
       npm i -D playwright && npx playwright install chromium
   Brauzer boshqa joyda bo'lsa: CHROME=/yo'l/chrome node tools/mkog.mjs */
async function loadChromium() {
  try { return (await import('playwright')).chromium; } catch (e) {}
  try {
    const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
    return createRequire(join(root, 'noop.js'))('playwright').chromium;
  } catch (e) {}
  console.error('[mkog] playwright topilmadi. Yuqoridagi izohga qarang.');
  process.exit(1);
}

const chromium = await loadChromium();
const EXE = process.env.CHROME ||
  ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p => existsSync(p));

/* Ikonka va shriftlar sahifaga base64 bilan joylashtiriladi:
   Chromium file:// dan tashqi faylni o'qishga har doim ruxsat bermaydi. */
const b64 = p => readFileSync(p).toString('base64');
const ICON = 'resources/icon-only.png';
if (!existsSync(ICON)) throw new Error(`[mkog] ${ICON} topilmadi — avval node tools/mkicons.mjs`);

const fontDir = 'node_modules/@fontsource/manrope/files';
const font800 = existsSync(`${fontDir}/manrope-latin-800-normal.woff2`)
  ? b64(`${fontDir}/manrope-latin-800-normal.woff2`) : null;
const font500 = existsSync(`${fontDir}/manrope-latin-500-normal.woff2`)
  ? b64(`${fontDir}/manrope-latin-500-normal.woff2`) : null;
if (!font800 || !font500) throw new Error('[mkog] Manrope shrifti topilmadi (npm ci qilingan?)');

const html = `<!DOCTYPE html><meta charset="utf-8"><style>
@font-face{font-family:M;font-weight:800;src:url(data:font/woff2;base64,${font800}) format('woff2')}
@font-face{font-family:M;font-weight:500;src:url(data:font/woff2;base64,${font500}) format('woff2')}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;background:#14121F;
  font-family:M,system-ui,sans-serif;color:#F4F2FF;display:flex;align-items:center}
.glow{position:absolute;width:900px;height:900px;border-radius:50%;
  background:radial-gradient(circle,rgba(61,94,255,.40),transparent 62%);
  left:-260px;top:-300px}
.glow2{position:absolute;width:760px;height:760px;border-radius:50%;
  background:radial-gradient(circle,rgba(133,82,240,.34),transparent 62%);
  right:-160px;bottom:-330px}
.left{position:relative;padding:0 0 0 72px;width:720px;z-index:2}
.badge{display:inline-block;padding:9px 16px;border-radius:999px;
  background:rgba(244,242,255,.10);font-size:19px;font-weight:800;
  color:#FFB84D;letter-spacing:.01em}
h1{margin:26px 0 0;font-size:64px;font-weight:800;line-height:1.04;text-wrap:balance;
  letter-spacing:-.032em}
p{margin:22px 0 0;font-size:24px;font-weight:500;line-height:1.45;color:#A7A2C4}
.row{display:flex;gap:12px;margin-top:34px}
.chip{padding:11px 18px;border-radius:12px;background:rgba(244,242,255,.08);
  font-size:20px;font-weight:800;color:#F4F2FF}
.right{position:relative;z-index:2;margin-left:auto;margin-right:92px;
  display:flex;flex-direction:column;align-items:center;gap:22px}
.right img{width:300px;height:300px;border-radius:68px;display:block;
  box-shadow:0 40px 90px rgba(0,0,0,.55);border:1px solid rgba(244,242,255,.12)}
.right b{font-size:44px;font-weight:800;letter-spacing:-.02em}
</style>
<div class="glow"></div><div class="glow2"></div>
<div class="left">
  <span class="badge">IQ test · Aql oʻyinlari</span>
  <h1>Mantiqiy fikrlashingizni sinab koʻring</h1>
  <p>Matritsalar, son qatorlari, fazoviy va ogʻzaki topshiriqlar.
     Natija — taxminiy ball, oraliq bilan.</p>
  <div class="row">
    <span class="chip">Bepul</span>
    <span class="chip">Internetsiz ishlaydi</span>
  </div>
</div>
<div class="right"><img src="data:image/png;base64,${b64(ICON)}"><b>IQuest</b></div>`;

const b = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await p.setContent(html);
await p.waitForTimeout(900);
const buf = await p.screenshot({ type: 'jpeg', quality: 88 });
await b.close();

writeFileSync('resources/og.jpg', buf);
console.log(`resources/og.jpg — 1200×630, ${(buf.length / 1024).toFixed(0)} KB`);
