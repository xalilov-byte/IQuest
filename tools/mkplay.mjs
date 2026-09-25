/* ─────────────────────────────────────────────────────────────────────────
   GOOGLE PLAY UCHUN GRAFIK MATERIALLAR  →  resources/play/

   Ishga tushirish:  node tools/mkplay.mjs   (npm run play:assets)
   Oldin:            npm run build           (www/index.html kerak)

   Chiqadi:
     icon-512.png            ilova ikonkasi     — Play TALABI (512×512)
     feature-1024x500.png    sarlavha rasmi     — Play TALABI (1024×500)
     screenshot-N-*.png      telefon suratlari  — Play TALABI (kamida 2 ta)

   O'LCHAMLAR PLAY TALABIGA MOS: ikonka aynan 512×512 (32-bit PNG),
   sarlavha rasmi aynan 1024×500 (shaffoflik BO'LMASLIGI kerak),
   ekran suratlari 1170×2532 (9:19.5 — hozirgi telefonlar nisbati,
   Play'ning 320–3840 px chegarasi ichida).

   ── MATN QOIDALARI (src/iq/CONTRACT.md §6) ─────────────────────────
   Grafikadagi har bir so'z do'kon va'dasi. Shuning uchun: ball faqat
   "taxminiy" va oraliq bilan; "IQ oshiradi / X ballga oshiring",
   "rasmiy", "sertifikatlangan", "Mensa", "klinik", persentil,
   sog'liq da'vosi, "DTM'ga tayyorlaydi" — YO'Q. Raqamli da'vo ham
   yo'q (savollar soni, vaqt) — u ilova bilan birga eskiradi.

   ── EKRAN SURATLARI ────────────────────────────────────────────────
   Suratlar HAQIQIY ilovadan (www/index.html) olinadi, maket emas.
   Ilova ekranlari hozir IQuest uchun qayta qurilmoqda, shuning uchun
   har surat "eng yaxshi urinish": ekranga o'tib bo'lmasa (tugma yoki
   tab topilmadi, sahifa xato berdi, ekran bo'sh) surat TASHLANADI va
   ogohlantirish chiqadi — butun skript yiqilmaydi. 2 tadan kam surat
   chiqsa skript xato bilan tugaydi (Play kamida 2 ta talab qiladi).
   Yangi ekran nomlari aniq bo'lgach SHOTS ro'yxati yangilanadi.

   Liga, reyting va sertifikat ekranlari ATAYLAB YO'Q: ular server
   tekshiruvini talab qiladi (CONTRACT.md §10) va v1 da ishlamaydi.
   Do'kon surati — reklama; hali ishlamaydigan funksiyani ko'rsatish
   odamni yolg'on va'da bilan yuklab olishga undaydi va Play'ning
   Deceptive Behavior qoidasiga zid. Ular ishga tushgach qo'shiladi.

   Namunaviy progress (ball, streak) qurilma xotirasiga yoziladi:
   yangi o'rnatilgan ilovada hammasi nol va nol holat ilova nima
   qilishini ko'rsatmaydi. Raqamlar ishonarli chegarada (bir necha kun
   ishlatgan odam). IQ natijasi esa o'ylab topilMAYDI — natija ekrani
   surati kerak bo'lsa, u haqiqiy o'tilgan testdan olinadi va unda
   oraliq hamda "klinik test emas" matni ko'rinib turadi.
   ───────────────────────────────────────────────────────────────────── */

import { readFileSync, mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import { join } from 'path';

/* Playwright loyihaning bog'liqligi emas — mkog.mjs dagi izohga qarang. */
async function loadChromium() {
  try { return (await import('playwright')).chromium; } catch (e) {}
  try {
    const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
    return createRequire(join(root, 'noop.js'))('playwright').chromium;
  } catch (e) {}
  console.error('[mkplay] playwright topilmadi:\n' +
                '  npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const chromium = await loadChromium();
let sharp;
try { sharp = (await import('sharp')).default; }
catch (e) {
  console.error('[mkplay] sharp ishlamayapti (' + String(e.message).split('\n')[0] + ').\n' +
                '  npm rebuild sharp   — yoki npm ci ni skriptlar bilan qayta bajaring');
  process.exit(1);
}

const EXE = process.env.CHROME ||
  ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p => existsSync(p));
const APP = 'file://' + process.cwd() + '/www/index.html';
const OUT = 'resources/play';

if (!existsSync('www/index.html')) {
  console.error('[mkplay] www/index.html yo\'q — avval `npm run build`');
  process.exit(1);
}
if (!existsSync('resources/icon-only.png')) {
  console.error('[mkplay] resources/icon-only.png yo\'q — avval `node tools/mkicons.mjs`');
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

/* ── 1. Ikonka 512×512 ──────────────────────────────────────────────
   Play 32-bit PNG kutadi. resources/icon-only.png — Android ilovasi
   bilan bir xil manba, shuning uchun do'kondagi ikonka va telefondagi
   ikonka bir xil bo'ladi. */
await sharp('resources/icon-only.png')
  .resize(512, 512)
  .ensureAlpha()
  .png({ compressionLevel: 9 })
  .toFile(join(OUT, 'icon-512.png'));

/* ── 2. Sarlavha rasmi (feature graphic) 1024×500 ───────────────────
   Do'kon sahifasining tepasida va ba'zi ro'yxatlarda ko'rinadi.
   Muhim tafsilot: Play uni turli joylarda KESIB ko'rsatadi va ustiga
   "Install" tugmasini qo'yadi, shuning uchun matn markazga yaqin va
   chetlarda zaxira joy bilan joylashtirilgan. */
const fontDir = 'node_modules/@fontsource/manrope/files';
const f800 = readFileSync(`${fontDir}/manrope-latin-800-normal.woff2`).toString('base64');
const f500 = readFileSync(`${fontDir}/manrope-latin-500-normal.woff2`).toString('base64');
const icon = readFileSync('resources/icon-only.png').toString('base64');

const featureHtml = `<!DOCTYPE html><meta charset="utf-8"><style>
@font-face{font-family:M;font-weight:800;src:url(data:font/woff2;base64,${f800}) format('woff2')}
@font-face{font-family:M;font-weight:500;src:url(data:font/woff2;base64,${f500}) format('woff2')}
*{margin:0;box-sizing:border-box}
body{width:1024px;height:500px;overflow:hidden;background:#14121F;
  font-family:M,system-ui,sans-serif;color:#F4F2FF;
  display:grid;place-items:center;text-align:center}
.g1{position:absolute;width:820px;height:820px;border-radius:50%;
  background:radial-gradient(circle,rgba(61,94,255,.40),transparent 62%);
  left:-230px;top:-310px}
.g2{position:absolute;width:640px;height:640px;border-radius:50%;
  background:radial-gradient(circle,rgba(133,82,240,.34),transparent 62%);
  right:-170px;bottom:-300px}
.box{position:relative;z-index:2;padding:0 96px;display:flex;flex-direction:column;align-items:center}
.brand{display:flex;align-items:center;gap:18px}
.brand img{width:84px;height:84px;border-radius:20px;display:block;
  box-shadow:0 14px 34px rgba(0,0,0,.45)}
.brand b{font-size:56px;font-weight:800;letter-spacing:-.03em}
h1{margin-top:22px;font-size:44px;font-weight:800;line-height:1.1;letter-spacing:-.025em}
p{margin-top:14px;font-size:24px;font-weight:500;color:#B9B4D4}
.row{display:flex;gap:12px;justify-content:center;margin-top:26px}
.chip{padding:10px 20px;border-radius:12px;background:rgba(244,242,255,.09);
  font-size:20px;font-weight:800}
</style>
<div class="g1"></div><div class="g2"></div>
<div class="box">
  <div class="brand"><img src="data:image/png;base64,${icon}"><b>IQuest</b></div>
  <h1>IQ test va aql oʻyinlari</h1>
  <p>Mantiqiy fikrlashni mashq qiling · internetsiz ishlaydi</p>
  <div class="row">
    <span class="chip">Taxminiy ball + oraliq</span>
    <span class="chip">Bepul</span>
  </div>
</div>`;

const b = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });

{
  const p = await b.newPage({ viewport: { width: 1024, height: 500 } });
  await p.setContent(featureHtml);
  await p.waitForTimeout(800);
  const png = await p.screenshot();
  // Play sarlavha rasmida shaffoflik bo'lishi mumkin emas — fon bilan
  // tekislab (flatten) alfa kanal olib tashlanadi.
  await sharp(png).flatten({ background: '#14121F' }).png({ compressionLevel: 9 })
    .toFile(join(OUT, 'feature-1024x500.png'));
  await p.close();
}

/* ── 3. Ekran suratlari ─────────────────────────────────────────────
   Har biri: kerakli ekranga o'tiladi, tema o'rnatiladi, keyin surat.
   Kunduzgi va tungi tema aralash — do'konda ikkalasi ko'rinishi
   foydalanuvchiga tanlov borligini aytadi.

   `go` — ekranga qanday o'tiladi:
     null                 — ilova ochilgandagi ekran
     { tab: 'profile' }   — window.nzApp.setState({ tab }) (nzApp — ilova ilgagi)
     { button: /regex/ }  — ko'rinib turgan tugma matni bo'yicha bosish
   Ekran nomlari UI tugagach tekshiriladi; topilmasa surat tashlanadi. */

/* Faqat progress.js tushunadigan umumiy maydonlar. Versiya (v) mos
   kelmasa progress.js yozuvni e'tiborsiz qoldiradi — surat nol holatda
   chiqadi, xato bermaydi. */
const DEMO = JSON.stringify({
  v: 1, points: 2480,
  totalAnswered: 312, totalCorrect: 241,
  streak: 6, longest: 6, lastActiveDay: null,
  day: null, answered: 12, tasks: [],
});

const SHOTS = [
  { name: 'bosh-tungi',    theme: 'dark',  go: null,                              label: 'Bosh ekran (tungi)' },
  { name: 'test-tungi',    theme: 'dark',  go: { button: /^(IQ test|Testni boshlash|Test)\b/i }, label: 'IQ test: savol' },
  { name: 'mashq',         theme: 'light', go: { button: /^Mashq/i },            label: 'Mashq' },
  { name: 'oyinlar',       theme: 'light', go: { tab: 'games' },                 label: 'Aql oʻyinlari' },
  { name: 'profil',        theme: 'light', go: { tab: 'profile' },               label: 'Profil va natijalar tarixi' },
  { name: 'bosh-kunduzgi', theme: 'light', go: null,                              label: 'Bosh ekran (kunduzgi)' },
];

/* Suratga tushgan matnda bo'lmasligi kerak bo'lgan da'volar (§6).
   "klinik IQ testi emas" — rad qilish matni, u RUXSAT etilgan. */
const FORBIDDEN = [
  /rasmiy\s+IQ/i, /sertifikatlangan/i, /akkreditatsiya/i, /Mensa/i,
  /persentil/i, /aholining\s+\d+/i, /IQ['ʼʻ’]?(ingiz)?ni\s+\d+\s+ball/i,
];

const made = [];
const skipped = [];
for (const s of SHOTS) {
  const ctx = await b.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,          // 390×844 @3 = 1170×2532
    colorScheme: s.theme,
  });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(String(e.message || e)));
  try {
    await p.addInitScript(`try{localStorage.setItem('nz-progress',${JSON.stringify(DEMO)})}catch(e){}`);
    await p.goto(APP);
    await p.waitForTimeout(700);

    if (s.go && s.go.tab) {
      const ok = await p.evaluate(t => {
        const app = window.nzApp;
        if (!app || typeof app.setState !== 'function') return 'window.nzApp yo\'q';
        app.setState({ tab: t });
        return app.state && app.state.tab === t ? true : 'tab o\'rnatilmadi';
      }, s.go.tab);
      if (ok !== true) throw new Error(ok);
    } else if (s.go && s.go.button) {
      const ok = await p.evaluate(src => {
        const re = new RegExp(src.source, src.flags);
        const vis = el => el.getClientRects().length > 0;
        const norm = el => (el.textContent || '').trim().replace(/\s+/g, ' ');
        const btn = [...document.querySelectorAll('button')].filter(vis).find(e => re.test(norm(e)));
        if (!btn) return 'tugma topilmadi: ' + re;
        btn.click();
        return true;
      }, { source: s.go.button.source, flags: s.go.button.flags });
      if (ok !== true) throw new Error(ok);
    }
    await p.waitForTimeout(500);

    const text = await p.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));
    if (errors.length) throw new Error('sahifa xatosi: ' + errors[0]);
    if (text.length < 40) throw new Error('ekran deyarli bo\'sh');
    const bad = FORBIDDEN.find(re => re.test(text));
    if (bad) throw new Error('taqiqlangan da\'vo ekranda: ' + bad + ' (CONTRACT.md §6)');

    const file = join(OUT, `screenshot-${made.length + 1}-${s.name}.png`);
    await p.screenshot({ path: file });
    made.push({ file, label: s.label });
  } catch (e) {
    skipped.push(`${s.name}: ${e.message}`);
  }
  await p.close();
  await ctx.close();
}

await b.close();

/* ── 4. Hisobot ─────────────────────────────────────────────────────── */
const dim = async f => {
  const m = await sharp(f).metadata();
  return `${m.width}×${m.height}`;
};
const kb = f => (readFileSync(f).length / 1024).toFixed(0) + ' KB';

console.log(`\nPlay materiallari → ${OUT}/`);
console.log(`  ${'icon-512.png'.padEnd(34)}${await dim(join(OUT, 'icon-512.png'))}  ${kb(join(OUT, 'icon-512.png'))}`);
console.log(`  ${'feature-1024x500.png'.padEnd(34)}${await dim(join(OUT, 'feature-1024x500.png'))}  ${kb(join(OUT, 'feature-1024x500.png'))}`);
for (const m of made) {
  console.log(`  ${m.file.replace(OUT + '/', '').padEnd(34)}${await dim(m.file)}  ${kb(m.file).padStart(6)}  ${m.label}`);
}
if (skipped.length) {
  console.log('\n⚠ Tashlangan suratlar (ekranga o\'tib bo\'lmadi):');
  for (const s of skipped) console.log('  · ' + s);
  console.log('  SHOTS ro\'yxatini ilovaning hozirgi ekranlariga moslang.');
}
console.log('\nPlay Console → Store listing → Graphics bo\'limiga shu fayllar qo\'yiladi.');
console.log('Har bir suratni KO\'Z BILAN tekshiring: unda v1 da ishlamaydigan funksiya\n' +
            '(liga, reyting, sertifikat) yoki oraliqsiz IQ raqami bo\'lmasligi kerak.');

if (made.length < 2) {
  console.error(`\n[mkplay] Faqat ${made.length} ta surat chiqdi — Play kamida 2 ta talab qiladi.`);
  process.exit(1);
}
