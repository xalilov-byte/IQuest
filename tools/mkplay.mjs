/* ─────────────────────────────────────────────────────────────────────────
   GOOGLE PLAY UCHUN GRAFIK MATERIALLAR  →  resources/play/

   Ishga tushirish:  node tools/mkplay.mjs   (npm run play:assets)

   Chiqadi:
     icon-512.png            ilova ikonkasi     — Play TALABI (512×512)
     feature-1024x500.png    sarlavha rasmi     — Play TALABI (1024×500)
     screenshot-1..6.png      telefon suratlari — Play TALABI (kamida 2 ta)

   O'LCHAMLAR PLAY TALABIGA MOS: ikonka aynan 512×512 (32-bit PNG),
   sarlavha rasmi aynan 1024×500 (shaffoflik BO'LMASLIGI kerak),
   ekran suratlari 1170×2532 (9:19.5 — hozirgi telefonlar nisbati,
   Play'ning 320–3840 px chegarasi ichida).

   ── EKRAN SURATLARIDAGI MA'LUMOT HAQIDA ────────────────────────────
   Suratlar HAQIQIY ilovadan olinadi (maket emas), lekin oldin
   qurilma xotirasiga o'ylab topilgan progress yoziladi: ball, streak,
   yechilgan savollar. Sababi: ilova birinchi ochilganda hammasi nol
   (progress.js dagi qaror) va nol holatdagi surat ilovaning nima
   qilishini ko'rsatmaydi.

   Bu yolg'on da'vo emas — do'kondagi surat ilovaning ISHLATILGANDAGI
   ko'rinishi bo'lishi normal va Play qoidalari bunga ruxsat beradi.
   Lekin raqamlar ishonarli chegarada tanlangan: 2 480 ball va 6 kunlik
   streak — bir necha kun ishlatgan odamning natijasi. "12 480 ball,
   47 rekord" kabi raqamlar (dizayn maketidagilar) yangi ilova uchun
   ishonchsiz ko'rinardi.

   Savollar soni esa HAQIQIY (bankda nechta bo'lsa) — u suratda
   "1/10" kabi ko'rinadi va bo'yab ko'rsatilmaydi.
   ───────────────────────────────────────────────────────────────────── */

/* Playwright loyihaning bog'liqligi emas — mkog.mjs dagi izohga qarang. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { examFormat } from './source.mjs';

/* Imtihon formati dizayn manbasidan o'qiladi, bu yerda qayta
   yozilmaydi. Ilgari "20 savol · 25 daqiqa" qo'lda yozilgan edi,
   ilova esa 10 savol / 12:30 berardi — do'kondagi rasm ilova
   bermaydigan narsani va'da qilardi. */
const FMT = examFormat();
let chromium;
try { ({ chromium } = await import('playwright')); }
catch (e) {
  console.error('[mkplay] playwright topilmadi:\n' +
                '  npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}
const sharp = (await import('sharp')).default;

const EXE = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = 'file://' + process.cwd() + '/www/index.html';
const OUT = 'resources/play';
mkdirSync(OUT, { recursive: true });

if (!existsSync('www/index.html')) {
  console.error('[mkplay] www/index.html yo\'q — avval `npm run build`');
  process.exit(1);
}

/* ── 1. Ikonka 512×512 ──────────────────────────────────────────────
   Play 32-bit PNG kutadi. resources/icon-only.png — Android ilovasi
   bilan bir xil manba, shuning uchun do'kondagi ikonka va telefondagi
   ikonka bir xil bo'ladi. */
await sharp('resources/icon-only.png')
  .resize(512, 512)
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

const featureHtml = `<!DOCTYPE html><meta charset="utf-8"><style>
@font-face{font-family:M;font-weight:800;src:url(data:font/woff2;base64,${f800}) format('woff2')}
@font-face{font-family:M;font-weight:500;src:url(data:font/woff2;base64,${f500}) format('woff2')}
*{margin:0;box-sizing:border-box}
body{width:1024px;height:500px;overflow:hidden;background:#14121F;
  font-family:M,system-ui,sans-serif;color:#F4F2FF;
  display:grid;place-items:center;text-align:center}
.g1{position:absolute;width:820px;height:820px;border-radius:50%;
  background:radial-gradient(circle,rgba(61,94,255,.42),transparent 62%);
  left:-230px;top:-310px}
.g2{position:absolute;width:640px;height:640px;border-radius:50%;
  background:radial-gradient(circle,rgba(133,82,240,.34),transparent 62%);
  right:-170px;bottom:-300px}
.box{position:relative;z-index:2;padding:0 96px}
h1{font-size:68px;font-weight:800;line-height:1.05;letter-spacing:-.032em}
p{margin-top:20px;font-size:26px;font-weight:500;color:#B9B4D4}
.row{display:flex;gap:12px;justify-content:center;margin-top:30px}
.chip{padding:10px 20px;border-radius:12px;background:rgba(244,242,255,.09);
  font-size:20px;font-weight:800}
</style>
<div class="g1"></div><div class="g2"></div>
<div class="box">
  <h1>Avtotestdan birinchi<br>urinishda oʻting</h1>
  <p>YHQ nazariy imtihoniga tayyorgarlik · internetsiz ishlaydi</p>
  <div class="row">
    <span class="chip">${FMT.chip}</span>
    <span class="chip">Bepul</span>
  </div>
</div>`;

const b = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });

{
  const p = await b.newPage({ viewport: { width: 1024, height: 500 } });
  await p.setContent(featureHtml);
  await p.waitForTimeout(800);
  const png = await p.screenshot();
  // Play sarlavha rasmida shaffoflik bo'lishi mumkin emas — JPEG'ga
  // o'girib qaytaramiz, shunda alfa kanal yo'qoladi.
  await sharp(png).flatten({ background: '#14121F' }).png({ compressionLevel: 9 })
    .toFile(join(OUT, 'feature-1024x500.png'));
  await p.close();
}

/* ── 3. Ekran suratlari ─────────────────────────────────────────────
   Har biri: kerakli ekranga o'tiladi, tema o'rnatiladi, keyin surat.
   Kunduzgi va tungi tema aralash — do'konda ikkalasi ko'rinishi
   foydalanuvchiga tanlov borligini aytadi. */
const DEMO = JSON.stringify({
  v: 1, points: 2480, marathonBest: 14,
  totalAnswered: 312, totalCorrect: 271, totalExams: 9,
  streak: 6, longest: 6, lastActiveDay: null,
  wrong: ['#003', '#008'], saved: ['#002', '#007'], day: null,
  answered: 12, exams: 1, signs: ['#002'], tasks: ['daily'],
});

/* REYTING EKRANI ATAYLAB YO'Q. Undagi ismlar va ballar namunaviy —
   haqiqiy reyting serverni talab qiladi (REJA.md Faza 4). Do'kon
   surati mahsulotning reklamasi: hali ishlamaydigan funksiyani
   ko'rsatish odamni yolg'on va'da bilan yuklab olishga majburlaydi va
   Play qoidalariga ham to'g'ri kelmaydi. Reyting ishga tushgach shu
   ro'yxatga qo'shiladi. */
const SHOTS = [
  { name: 'bosh-tungi',      theme: 'dark',  tab: null,       label: 'Bosh ekran (tungi)' },
  { name: 'test-tungi',      theme: 'dark',  quiz: true,      label: 'Imtihon: javob va izoh' },
  { name: 'vazifalar',       theme: 'light', tab: 'tasks',    label: 'Kunlik vazifalar' },
  { name: 'profil',          theme: 'light', tab: 'profile',  label: 'Profil va statistika' },
  { name: 'bosh-kunduzgi',   theme: 'light', tab: null,       label: 'Bosh ekran (kunduzgi)' },
];

const made = [];
for (const s of SHOTS) {
  const ctx = await b.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,          // 390×844 @3 = 1170×2532
    colorScheme: s.theme,
  });
  const p = await ctx.newPage();
  await p.addInitScript(`try{localStorage.setItem('nz-progress',${JSON.stringify(DEMO)})}catch(e){}`);
  await p.goto(APP);
  await p.waitForTimeout(700);

  if (s.quiz) {
    // Imtihonni boshlab bitta savolga javob beramiz: javobsiz ekran
    // ilovaning eng muhim qismini — izohni — ko'rsatmaydi.
    await p.evaluate(() => {
      const vis = el => el.getClientRects().length > 0;
      // Diqqat: bosh ekranda "Imtihon tayyorligi" tugmasi ham bor va u
      // DOM'da oldin turadi, shuning uchun aniq nom bilan qidiriladi.
      const btn = [...document.querySelectorAll('button')].filter(vis)
        .find(e => /Imtihon \(demo\)/.test(e.textContent || ''));
      if (!btn) throw new Error('mkplay: "Imtihon (demo)" tugmasi topilmadi');
      btn.click();
    });
    await p.waitForTimeout(450);
    await p.evaluate(() => {
      const vis = el => el.getClientRects().length > 0;
      const norm = el => (el.textContent || '').trim().replace(/\s+/g, ' ');
      const opts = [...document.querySelectorAll('button')].filter(vis)
        .filter(el => /^[ABCD]\s/.test(norm(el)));
      // To'g'ri javobni bosamiz — izoh ko'rinadi va ekran ijobiy chiqadi.
      const quiz = window.nzApp.state.quiz;
      if (!quiz) throw new Error('mkplay: imtihon boshlanmadi');
      const q = QUESTIONS[quiz.pool[quiz.index]];
      if (opts[q.correct]) opts[q.correct].click();
    });
    await p.waitForTimeout(500);
  } else if (s.tab) {
    await p.evaluate(t => window.nzApp.setState({ tab: t }), s.tab);
    await p.waitForTimeout(450);
  }

  const file = join(OUT, `screenshot-${made.length + 1}-${s.name}.png`);
  await p.screenshot({ path: file });
  made.push({ file, label: s.label });
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
console.log(`  icon-512.png            ${await dim(join(OUT, 'icon-512.png'))}  ${kb(join(OUT, 'icon-512.png'))}`);
console.log(`  feature-1024x500.png    ${await dim(join(OUT, 'feature-1024x500.png'))}  ${kb(join(OUT, 'feature-1024x500.png'))}`);
for (const m of made) {
  console.log(`  ${m.file.replace(OUT + '/', '').padEnd(24)}${await dim(m.file)}  ${kb(m.file).padStart(6)}  ${m.label}`);
}
console.log('\nPlay Console → Store listing → Graphics bo\'limiga shu fayllar qo\'yiladi.');

/* Do'konga chiqishdan oldingi oxirgi to'siq. Play qoidalari bo'yicha
   do'kondagi tavsif va grafika ilova HAQIQATAN beradigan narsani
   ko'rsatishi shart. Bank hali imtihon formatini ko'tarmasa, grafika
   qisqa formatni aytadi (u avtomatik) — lekin PLAY.md dagi QO'LDA
   yozilgan tavsif eskirib qolishi mumkin, shuning uchun bu yerda ochiq
   aytiladi. */
if (!FMT.full) {
  console.log(
    `\n⚠ IMTIHON FORMATI HALI TO'LIQ EMAS\n` +
    `  Bankda ${FMT.bank} savol bor, format esa ${FMT.size} savolni talab qiladi.\n` +
    `  Grafikada "${FMT.chip}" yozildi — ilova aynan shuni beradi.\n` +
    `  PLAY.md dagi tavsifda ham "${FMT.size} savol" deb yozilgan bo'lsa,\n` +
    `  do'konga chiqishdan OLDIN bankni to'ldiring yoki tavsifni tuzating.`);
}
