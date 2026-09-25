/* ─────────────────────────────────────────────────────────────────────────
   GOOGLE PLAY UCHUN GRAFIK MATERIALLAR  →  resources/play/

   Ishga tushirish:  node tools/mkplay.mjs   (npm run play:assets)
   Oldin:            npm run build           (www/index.html kerak)

   Chiqadi (Play Console → Store listing → Graphics ga shular yuklanadi):
     icon-512.png                  ilova ikonkasi    — 512×512, 32-bit PNG
     uz/feature-1024x500.png       sarlavha rasmi    — 1024×500, alfasiz
     ru/feature-1024x500.png
     uz/screenshot-N-*.png         telefon suratlari — 1080×1920 (9:16), alfasiz
     ru/screenshot-N-*.png
     raw/*.png                     ramkasiz asl suratlar (yuklanmaydi —
                                   tekshirish va qayta ishlash uchun)

   ── NEGA SURATLAR RAMKADA ─────────────────────────────────────────────
   Play qoidasi: suratning uzun tomoni qisqasidan 2 barobardan oshmasligi
   kerak. Hozirgi telefon ekrani (390×844, nisbat 2.16) bu chegaradan
   CHIQADI — xom surat yuklanmaydi. Shuning uchun surat 9:16 kanvasga
   joylanadi, tepasiga qisqa izoh yoziladi. 9:16 va ≥1080px — Play'ning
   tavsiyalarda ko'rsatish talabi ham.

   FON: resources/art/feature-bg.png va resources/art/screenshot-bg.png
   bo'lsa (RASMLAR.md — matnsiz illyustratsiya), shular ishlatiladi;
   bo'lmasa CSS fon. Matn HAR DOIM shu skriptda qo'shiladi: generatorlar
   harfni buzadi, bu yerda esa matn aniq va ikki tilda.

   MATN QOIDASI — src/iq/CONTRACT.md §6: "taxminiy", oraliq; "IQ'ingizni
   X ballga oshiradi" kabi raqamli va'da va sog'liq da'volari yo'q (Play
   bunday ilovani olib tashlaydi).
   Izohlarda raqam yo'q ("30 savol" kabi): raqam ilova bilan o'zgaradi,
   rasm esa eskirib qoladi.

   ── SURATLARDAGI MA'LUMOT ─────────────────────────────────────────────
   Suratlar HAQIQIY ilovadan olinadi (maket emas). Ilova noldan
   boshlanadi va bo'sh tarix ilova nima qilishini ko'rsatmaydi, shuning
   uchun tarixga shartnomadagi ochiq API (nzProgress.recordTest) orqali
   uchta namunaviy natija yoziladi. Raqamlar o'rtacha va har biri ORALIQ
   bilan (§6.1) — "145" yoki "aholining 98% idan aqlliroq" kabi reklama
   raqami emas. API bo'lmasa (eski build) suratlar bo'sh tarix bilan
   olinadi va bu hisobotda aytiladi.

   ── EKRANLAR RO'YXATI ────────────────────────────────────────────────
   UI hali IQ ekranlariga ko'chirilmoqda, shuning uchun har kadr
   "eng yaxshi urinish": ekranga yetib bo'lmasa kadr TASHLAB KETILADI
   va oxirida ro'yxati chiqadi (jimgina bo'sh surat emas). UI tayyor
   bo'lgach SHOTS dagi `go` qadamlarini tekshiring.

   ILOVA NOMI capacitor.config.json → appName dan o'qiladi.
   ───────────────────────────────────────────────────────────────────── */

/* Playwright loyihaning bog'liqligi emas — mkog.mjs dagi izohga qarang. */
import { readFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const P = (...a) => join(ROOT, ...a);
const APP_NAME = JSON.parse(readFileSync(P('capacitor.config.json'), 'utf8')).appName;
const APP_URL = pathToFileURL(P('www/index.html')).href;
const OUT = P('resources/play');
const DARK = '#14121F';

async function loadChromium() {
  try { return (await import('playwright')).chromium; } catch (e) { /* keyingisi */ }
  try {
    const g = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
    return createRequire(join(g, 'noop.js'))('playwright').chromium;
  } catch (e) { return null; }
}
const chromium = await loadChromium();
if (!chromium) {
  console.error('[mkplay] playwright topilmadi:\n  npm i -g playwright && npx playwright install chromium');
  process.exit(1);
}
const DEF = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const EXE = process.env.CHROME || (existsSync(DEF) ? DEF : undefined);

if (!existsSync(P('www/index.html'))) {
  console.error('[mkplay] www/index.html yo\'q — avval `npm run build`');
  process.exit(1);
}
if (!existsSync(P('resources/icon-only.png'))) {
  console.error('[mkplay] resources/icon-only.png yo\'q — avval `npm run icons`');
  process.exit(1);
}

rmSync(OUT, { recursive: true, force: true });
for (const d of ['', 'uz', 'ru', 'raw']) mkdirSync(join(OUT, d), { recursive: true });

const b64 = f => readFileSync(f).toString('base64');
const artB64 = name => (existsSync(P('resources/art', name)) ? b64(P('resources/art', name)) : null);

/* Shriftlar: lotin (oʻ/gʻ — U+02BB) + kirill (ruscha matn). */
const fontDir = P('node_modules/@fontsource/manrope/files');
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2212';
const CYR = 'U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116';
const face = (sub, w, range) =>
  `@font-face{font-family:M;font-weight:${w};src:url(data:font/woff2;base64,${b64(join(fontDir, `manrope-${sub}-${w}-normal.woff2`))}) format('woff2');unicode-range:${range}}`;
const FONTS = [800, 500].map(w => face('latin', w, LATIN) + face('cyrillic', w, CYR)).join('');
const ICON = b64(P('resources/icon-only.png'));

/* ── Matnlar (uz / ru) ─────────────────────────────────────────────── */
const T = {
  uz: {
    title: 'IQ testi va<br>aql oʻyinlari',
    sub: 'Mantiqiy topshiriqlar · haftalik liga · natija taxminiy, oraliq bilan',
    chips: ['Test internetsiz ishlaydi', 'Oʻzbekcha · Русский'],
  },
  ru: {
    title: 'Тест IQ и<br>игры для ума',
    sub: 'Задачи на логику · недельная лига · примерный результат с интервалом',
    chips: ['Тест работает без интернета', 'Oʻzbekcha · Русский'],
  },
};

/* ── 1. Ikonka 512×512 ──────────────────────────────────────────────
   Play 32-bit PNG (alfa kanal bilan) kutadi. Manba — telefondagi
   ikonka bilan bir xil fayl, shuning uchun do'kondagi va telefondagi
   belgi farq qilmaydi. Burchaklar yumaloqlanmaydi: Play o'zi kesadi. */
await sharp(P('resources/icon-only.png')).resize(512, 512).ensureAlpha()
  .png({ compressionLevel: 9 }).toFile(join(OUT, 'icon-512.png'));

/* --disable-background-networking: Chromium o'zicha Google serverlariga
   chiqmasin — rasm uchun tarmoq kerak emas. */
const b = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--disable-background-networking'] });

async function render(html, w, h) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await p.setContent(html);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(200);
  const png = await p.screenshot();
  await p.close();
  return png;
}
/* Play sarlavha rasmi va suratlarda alfa kanal bo'lmasligi kerak —
   flatten() uni olib tashlaydi (RGB PNG). */
const opaque = (png, file) => sharp(png).flatten({ background: DARK }).png({ compressionLevel: 9 }).toFile(file);

/* ── 2. Sarlavha rasmi (feature graphic) 1024×500 ───────────────────
   Play uni turli joylarda KESIB ko'rsatadi va ba'zan ustiga video
   tugmasini qo'yadi, shuning uchun matn markazda, chetlarda zaxira. */
const featureArt = artB64('feature-bg.png');
for (const lang of ['uz', 'ru']) {
  const t = T[lang];
  const html = `<!DOCTYPE html><meta charset="utf-8"><style>${FONTS}
*{margin:0;box-sizing:border-box}
body{width:1024px;height:500px;overflow:hidden;background:${DARK};position:relative;
  font-family:M,system-ui,sans-serif;color:#F4F2FF;display:grid;place-items:center;text-align:center}
.art{position:absolute;inset:0;background:url(data:image/png;base64,${featureArt || ''}) center/cover no-repeat}
.shade{position:absolute;inset:0;background:radial-gradient(ellipse 62% 70% at 50% 50%,rgba(20,18,31,.82),rgba(20,18,31,.35) 70%,rgba(20,18,31,.1))}
.g1{position:absolute;width:820px;height:820px;border-radius:50%;
  background:radial-gradient(circle,rgba(76,111,255,.42),transparent 62%);left:-230px;top:-310px}
.g2{position:absolute;width:640px;height:640px;border-radius:50%;
  background:radial-gradient(circle,rgba(133,82,240,.32),transparent 62%);right:-170px;bottom:-300px}
.box{position:relative;z-index:2;padding:0 110px}
.brand{display:inline-flex;align-items:center;gap:12px;font-size:26px;font-weight:800}
.brand img{width:48px;height:48px;border-radius:12px}
h1{margin-top:18px;font-size:56px;font-weight:800;line-height:1.06;letter-spacing:-.03em}
p{margin-top:16px;font-size:21px;font-weight:500;color:#C9C4E4}
.row{display:flex;gap:12px;justify-content:center;margin-top:24px}
.chip{padding:9px 18px;border-radius:12px;background:rgba(244,242,255,.1);font-size:18px;font-weight:800}
</style>
${featureArt ? '<div class="art"></div><div class="shade"></div>' : '<div class="g1"></div><div class="g2"></div>'}
<div class="box">
  <div class="brand"><img src="data:image/png;base64,${ICON}">${APP_NAME}</div>
  <h1>${t.title}</h1>
  <p>${t.sub}</p>
  <div class="row">${t.chips.map(c => `<span class="chip">${c}</span>`).join('')}</div>
</div>`;
  await opaque(await render(html, 1024, 500), join(OUT, lang, 'feature-1024x500.png'));
}

/* ── 3. Ilova suratlari ─────────────────────────────────────────────
   `go` — sahifa ichida bajariladi; ekranga yetib bo'lmasa XATO otadi va
   kadr tashlab ketiladi. Tugmalar matn bo'yicha topiladi (ko'rinadigan
   birinchisi), chunki UI ichki holat nomlari hali o'zgarmoqda.
   Izohlar ekranning o'zi haqida — ilova bermaydigan narsa yozilmaydi. */
const SHOTS = [
  { name: 'bosh', theme: 'dark', go: null,
    cap: { uz: 'Har kuni bir oz —<br>mantiqiy fikrlash mashqi', ru: 'Немного каждый день —<br>тренировка логики' } },
  { name: 'savol', theme: 'light',
    go: { click: [/^\s*IQ[\s-]*test/i, /^\s*(IQ[\s-]*тест|тест\s*IQ)/i, /^\s*test(ni)?\s*boshla/i, /^\s*(начать|пройти)\s*тест/i] },
    cap: { uz: 'Qiyinlik javoblaringizga<br>qarab moslashadi', ru: 'Сложность подстраивается<br>под ваши ответы' } },
  { name: 'mashq', theme: 'dark',
    go: { click: [/^\s*mashq/i, /^\s*(тренировк|практик)/i] },
    cap: { uz: 'Har javobdan keyin —<br>qoida tushuntiriladi', ru: 'После каждого ответа —<br>объяснение правила' } },
  { name: 'oyinlar', theme: 'light',
    go: { click: [/o[ʻ'‘]?yinlar/i, /^\s*игр/i] },
    cap: { uz: 'Aql oʻyinlari<br>va haftalik liga', ru: 'Игры для ума<br>и недельная лига' } },
  { name: 'tarix', theme: 'light', go: { tab: 'profile' },
    cap: { uz: 'Taxminiy natija — har doim<br>oraliq bilan', ru: 'Примерный результат —<br>всегда с интервалом' } },
];

/* Namunaviy tarix (§ yuqorida). Result shakli — CONTRACT.md §3. */
const DEMO = [
  { iq: 97, lo: 89, hi: 105, correct: 16 },
  { iq: 101, lo: 93, hi: 109, correct: 18 },
  { iq: 104, lo: 96, hi: 112, correct: 19 },
].map((r, i) => ({
  mode: 'test', n: 30, correct: r.correct, durationMs: (17 + i) * 60000,
  theta: (r.iq - 100) / 15, se: 0.3, iq: r.iq, lo: r.lo, hi: r.hi, reliable: true,
  byType: { matrix: { n: 8, correct: 5 }, series: { n: 8, correct: 5 },
            spatial: { n: 7, correct: 4 }, verbal: { n: 7, correct: r.correct - 14 } },
  items: [],
}));

const bgArt = artB64('screenshot-bg.png');
const made = [], skipped = [];
let seeded = null;

for (const lang of ['uz', 'ru']) {
  for (const s of SHOTS) {
    const ctx = await b.newContext({
      viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, colorScheme: s.theme,
    });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    try {
      await p.goto(APP_URL);
      await p.waitForTimeout(500);
      // Tarix va til: ochiq API orqali, keyin qayta yuklash — UI holatni
      // xotiradan o'qiydi (localStorage shu kontekst ichida saqlanadi).
      const ok = await p.evaluate(({ demo, lang }) => {
        let rec = false;
        if (window.nzProgress && typeof window.nzProgress.recordTest === 'function') {
          demo.forEach(r => window.nzProgress.recordTest(r)); rec = true;
        }
        if (window.nzI18n && typeof window.nzI18n.set === 'function') window.nzI18n.set(lang);
        return rec;
      }, { demo: DEMO, lang });
      if (seeded === null) seeded = ok;
      await p.reload();
      await p.waitForTimeout(600);
      if (s.go) {
        await p.evaluate(go => {
          const vis = el => el.getClientRects().length > 0;
          if (go.tab) {
            if (!window.nzApp) throw new Error('nzApp yo\'q');
            window.nzApp.setState({ tab: go.tab });
          }
          if (go.click) {
            const btns = [...document.querySelectorAll('button,a,[role=button]')].filter(vis);
            const txt = el => (el.textContent || '').trim().replace(/\s+/g, ' ');
            const re = go.click.map(r => new RegExp(r.source, r.flags));
            const btn = re.map(r => btns.find(e => r.test(txt(e)))).find(Boolean);
            if (!btn) throw new Error('tugma topilmadi: ' + go.click.map(r => '/' + r.source + '/').join(' | '));
            btn.click();
          }
        }, { tab: s.go.tab, click: s.go.click && s.go.click.map(r => ({ source: r.source, flags: r.flags })) });
        await p.waitForTimeout(600);
      }
      if (errs.length) throw new Error('sahifa xatosi: ' + errs[0]);
      const raw = join(OUT, 'raw', `${lang}-${s.name}.png`);
      await p.screenshot({ path: raw });

      /* 9:16 ramka: izoh tepada, surat pastda. */
      const html = `<!DOCTYPE html><meta charset="utf-8"><style>${FONTS}
*{margin:0;box-sizing:border-box}
body{width:1080px;height:1920px;overflow:hidden;position:relative;font-family:M,system-ui,sans-serif;
  background:${bgArt ? `url(data:image/png;base64,${bgArt}) center/cover no-repeat` : `linear-gradient(170deg,#4C6FFF 0%,#3552E0 38%,${DARK} 100%)`}}
h1{position:absolute;left:80px;right:80px;top:150px;text-align:center;color:#fff;
  font-size:64px;font-weight:800;line-height:1.12;letter-spacing:-.02em;text-shadow:0 2px 24px rgba(0,0,0,.25)}
.shot{position:absolute;left:50%;top:430px;width:660px;transform:translateX(-50%);
  border-radius:56px;overflow:hidden;border:10px solid #0d0c15;box-shadow:0 50px 120px rgba(0,0,0,.45)}
.shot img{display:block;width:100%}
</style>
<h1>${s.cap[lang]}</h1>
<div class="shot"><img src="data:image/png;base64,${b64(raw)}"></div>`;
      const file = join(OUT, lang, `screenshot-${made.filter(m => m.lang === lang).length + 1}-${s.name}.png`);
      await opaque(await render(html, 1080, 1920), file);
      made.push({ lang, file, name: s.name });
    } catch (e) {
      skipped.push(`${lang}/${s.name}: ${String(e.message).split('\n')[0]}`);
    }
    await ctx.close();
  }
}
await b.close();

/* ── 4. Hisobot va Play talablarini tekshirish ──────────────────────── */
const rel = f => f.replace(OUT + '/', '');
const problems = [];
async function report(file, want) {
  const m = await sharp(file).metadata();
  const kb = (readFileSync(file).length / 1024).toFixed(0);
  const ratio = Math.max(m.width, m.height) / Math.min(m.width, m.height);
  if (want.size && (m.width !== want.size[0] || m.height !== want.size[1])) problems.push(`${rel(file)}: o'lcham ${m.width}×${m.height}`);
  if (want.alpha === false && m.hasAlpha) problems.push(`${rel(file)}: alfa kanal bor`);
  if (want.alpha === true && !m.hasAlpha) problems.push(`${rel(file)}: 32-bit (alfa) emas`);
  if (want.maxRatio && ratio > want.maxRatio) problems.push(`${rel(file)}: nisbat ${ratio.toFixed(2)} > ${want.maxRatio}`);
  console.log(`  ${rel(file).padEnd(32)} ${m.width}×${m.height}  ${kb.padStart(5)} KB`);
}
console.log(`\nPlay materiallari → resources/play/`);
await report(join(OUT, 'icon-512.png'), { size: [512, 512], alpha: true });
for (const lang of ['uz', 'ru']) await report(join(OUT, lang, 'feature-1024x500.png'), { size: [1024, 500], alpha: false });
for (const m of made) await report(m.file, { size: [1080, 1920], alpha: false, maxRatio: 2 });

if (seeded === false) console.log('\n⚠ nzProgress.recordTest topilmadi — suratlarda natijalar tarixi bo\'sh.');
if (skipped.length) {
  console.log('\n⚠ Olinmagan kadrlar (UI tayyor bo\'lgach SHOTS ni tekshiring):\n  ' + skipped.join('\n  '));
}
if (made.filter(m => m.lang === 'uz').length < 2) {
  problems.push('uz: 2 tadan kam surat — Play kamida 2 ta talab qiladi');
}
if (problems.length) {
  console.log('\n✗ Play talabiga mos emas:\n  ' + problems.join('\n  '));
  process.exitCode = 1;
} else {
  console.log('\nPlay Console → Store listing → Graphics bo\'limiga (har til uchun o\'z papkasi) yuklanadi.');
}
