/* ─────────────────────────────────────────────────────────────────────────
   OG RASMI  →  resources/og.jpg  (1200×630)

   Ishga tushirish:  node tools/mkog.mjs

   Bu rasm havola Telegram'da, WhatsApp'da yoki ijtimoiy tarmoqda
   tashlanganda ko'rinadi. Nima uchun kerak: rasmsiz havola shunchaki
   ko'k matn bo'lib qoladi va bosilish ehtimoli sezilarli kamayadi —
   O'zbekistonda tarqatishning asosiy kanali Telegram bo'lgani uchun
   bu bevosita muhim.

   NIMA UCHUN BIR MARTA YASALADI VA REPOGA QO'YILADI: rasmni yasash
   brauzer talab qiladi (shrift va maket kerak). Har build'da Chromium
   ishga tushirish CI'ni sekinlashtiradi va mo'rtlashtiradi, shuning
   uchun natija fayl sifatida saqlanadi — xuddi ilova ikonkalari kabi
   (tools/mkicons.mjs). Dizayn o'zgarsa shu skript qayta ishga
   tushiriladi.
   ───────────────────────────────────────────────────────────────────── */

/* Playwright loyihaning bog'liqligi EMAS (u faqat shu generator uchun
   kerak va har bir o'rnatishga 100+ MB qo'shardi). Kerak bo'lsa:
       npm i -D playwright && npx playwright install chromium
   Brauzer boshqa joyda bo'lsa: CHROME=/yo'l/chrome node tools/mkog.mjs */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { examFormat } from './source.mjs';

/* Imtihon formati dizayn manbasidan o'qiladi — bu yerda qayta
   yozilmaydi, aks holda ilova o'zgarganda rasm eskirib qolardi. */
const FMT = examFormat();
let chromium;
try { ({ chromium } = await import('playwright')); }
catch (e) {
  console.error('[mkog] playwright topilmadi. Yuqoridagi izohga qarang.');
  process.exit(1);
}

const EXE = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SHOT = 'skrinshotlar/tungi-test.png';

/* Ekran surati va shriftlar sahifaga base64 bilan joylashtiriladi:
   Chromium file:// dan tashqi faylni o'qishga har doim ruxsat bermaydi. */
const b64 = p => readFileSync(p).toString('base64');
if (!existsSync(SHOT)) throw new Error(`[mkog] ${SHOT} topilmadi`);

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
  background:radial-gradient(circle,rgba(61,94,255,.45),transparent 62%);
  left:-260px;top:-300px}
.glow2{position:absolute;width:700px;height:700px;border-radius:50%;
  background:radial-gradient(circle,rgba(133,82,240,.35),transparent 62%);
  right:-180px;bottom:-320px}
.left{position:relative;padding:0 0 0 72px;width:660px;z-index:2}
.badge{display:inline-block;padding:9px 16px;border-radius:999px;
  background:rgba(244,242,255,.10);font-size:19px;font-weight:800;
  color:#A9B8FF;letter-spacing:.01em}
h1{margin:26px 0 0;font-size:70px;font-weight:800;line-height:1.03;
  letter-spacing:-.032em}
p{margin:22px 0 0;font-size:25px;font-weight:500;line-height:1.45;color:#9C97B8}
.row{display:flex;gap:12px;margin-top:34px}
.chip{padding:11px 18px;border-radius:12px;background:rgba(244,242,255,.08);
  font-size:20px;font-weight:800;color:#F4F2FF}
.right{position:relative;z-index:2;margin-left:auto;margin-right:66px;
  width:300px;height:600px;border-radius:34px;overflow:hidden;
  box-shadow:0 40px 90px rgba(0,0,0,.55);border:1px solid rgba(244,242,255,.12)}
.right img{width:100%;height:100%;object-fit:cover;object-position:top}
</style>
<div class="glow"></div><div class="glow2"></div>
<div class="left">
  <span class="badge">Avtotest · YHQ · Oʻzbekiston</span>
  <h1>Avtotestdan birinchi urinishda oʻting</h1>
  <p>Haqiqiy imtihon simulyatsiyasi, mavzular boʻyicha mashq va yoʻl belgilari.</p>
  <div class="row">
    <span class="chip">${FMT.chip}</span>
    <span class="chip">Internetsiz</span>
  </div>
</div>
<div class="right"><img src="data:image/png;base64,${b64(SHOT)}"></div>`;

const b = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await p.setContent(html);
await p.waitForTimeout(900);
const buf = await p.screenshot({ type: 'jpeg', quality: 88 });
await b.close();

writeFileSync('resources/og.jpg', buf);
console.log(`resources/og.jpg — 1200×630, ${(buf.length / 1024).toFixed(0)} KB`);
