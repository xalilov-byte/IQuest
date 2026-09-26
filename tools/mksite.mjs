/* ─────────────────────────────────────────────────────────────────────────
   SAYTNI YIG'ISH  →  dist/site/

   Ishga tushirish:  node tools/mksite.mjs
   (avval `node build.mjs --target=tg` ishga tushadi — undan faqat shriftlar
   olinadi; ilovaning oʻzi saytga KIRMAYDI, u Telegram botida — /app/,
   tools/mkahost.mjs, DEPLOY-AHOST.md)

   Chiqadigan tuzilma:

     dist/site/
       index.html              landing (JS'siz): bitta tugma → Telegram bot
       maxfiylik/index.html    maxfiylik siyosati   ← Play MAJBURIY
       shartlar/index.html     foydalanish shartlari (TOʻLIQ rad qilish matni)
       aloqa/index.html        aloqa                ← Play MAJBURIY
       malumot-ochirish/…      maʼlumotni oʻchirish ← Play MAJBURIY
       ru/<slug>/index.html    xuddi shu 4 sahifa ruscha   (v1.1)
       en/<slug>/index.html    xuddi shu 4 sahifa inglizcha (EN darvozasi, §8.4)
       manifest.webmanifest    telefonga oʻrnatish (PWA)
       sitemap.xml, robots.txt
       fonts/, *.jpg, ikonkalar

   Ilova huquqiy havolani tilga qarab ochadi (ARXITEKTURA §7.1):
   uz/uz-cyrl → /<slug>/, ru → /ru/<slug>/, en → /en/<slug>/.
   Matnlar va manzil sxemasi — src/site/pages.mjs.

   NIMA UCHUN MATN SAHIFALARI ALOHIDA: ilova bundle'i ~0.5 MB. Maxfiylik
   siyosatini o'qish uchun odam (yoki Play Console tekshiruvchisi) butun
   ilovani yuklab olmasligi kerak — ular 7 KB va JS'siz.

   DOMEN: sozlama site.config.json da. Domen tasdiqlanmagan bo'lsa
   (domainConfirmed: false) sitemap va canonical YOZILMAYDI — noto'g'ri
   domen bilan sitemap berish uni to'g'rilashdan ko'ra ko'proq zarar
   qiladi (qidiruv tizimi mavjud bo'lmagan manzillarni indekslaydi).
   ───────────────────────────────────────────────────────────────────── */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';
import { SITE_LANGS, CHROME, allPages, sitePath, lintPage, lintChrome }
  from '../src/site/pages.mjs';

const OUT = 'dist/site';
const cfg = JSON.parse(readFileSync('site.config.json', 'utf8'));

/* ── 1. Sozlamani tekshirish ────────────────────────────────────────────
   Build YIQILMAYDI: sayt to'ldirilmagan sozlama bilan ham yig'ilishi
   kerak (aks holda ishlashni boshlash uchun domen sotib olish shart
   bo'lardi). Lekin nimaga e'tibor berish kerakligi BALAND aytiladi va
   oxirida ro'yxat qaytariladi. */
const warn = [];
if (!cfg.domainConfirmed) {
  warn.push(`domen tasdiqlanmagan ("${cfg.domain}") — sitemap.xml va canonical yozilmaydi`);
}
if (/PLACEHOLDER/.test(cfg.contactEmail)) {
  warn.push('contactEmail hali PLACEHOLDER — Play Console maxfiylik siyosatida ' +
            'HAQIQIY aloqa manzilini talab qiladi');
}
/* Landing'ning yagona asosiy tugmasi — Mini App boti (paywall.bot; boʻsh
   boʻlsa telegramBot). Bot yoʻq — tugma yoʻq (oʻlik havola boʻlmaydi). */
const BOT = String((cfg.paywall && cfg.paywall.bot) || cfg.telegramBot || '').replace(/^@/, '');
const BOT_URL = BOT ? 'https://t.me/' + BOT : '';
if (!BOT) {
  warn.push('paywall.bot (va telegramBot) bo\'sh — landing\'dagi "Telegram botda ochish" tugmasi olib tashlanadi');
}
if (!cfg.publisherLegal) {
  warn.push('publisherLegal bo\'sh — maxfiylik siyosatida ilova egasi sifatida "' +
            (cfg.publisher || cfg.appName || 'IQuest') + '" ko\'rsatiladi (Play dasturchi ' +
            'ma\'lumotini talab qiladi)');
}

/* Matn sahifalari ilovani yig'ishdan OLDIN tekshiriladi (tez yiqilsin):
   imlo (oʻ/gʻ — ʻ, tutuq — ʼ), til aralashmasi, Shartlardagi to'liq rad
   qilish matni (CONTRACT §6.2), ichki havolalar. Bu bizning o'z
   matnimiz — xato bo'lsa build YIQILADI. */
const built = allPages(cfg);
const textErrors = built.flatMap(lintPage).concat(SITE_LANGS.flatMap(lintChrome));
if (textErrors.length) {
  throw new Error('[mksite] matn sahifalarida xato:\n  ' + textErrors.join('\n  '));
}

const SITE = cfg.domainConfirmed ? 'https://' + cfg.domain : null;

/* ── 2. Shriftlar ───────────────────────────────────────────────────
   Landing ILOVANI OʻZ ICHIGA OLMAYDI (Telegram-first: ilova faqat botda,
   Mini App sifatida — DEPLOY-AHOST.md). Mini App build'i (dist/tg) baribir
   kerak, shuning uchun shu yerda yigʻiladi va undan faqat shriftlar va
   ularning @font-face qatorlari olinadi (bitta manba — build.mjs). */
execFileSync(process.execPath, ['build.mjs', '--target=tg'], { stdio: 'inherit' });

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'fonts'), { recursive: true });
for (const f of readdirSync('dist/tg/fonts')) copyFileSync(join('dist/tg/fonts', f), join(OUT, 'fonts', f));

const appHtml = readFileSync('dist/tg/index.html', 'utf8');
const allFontCss = (() => {
  const all = appHtml.slice(appHtml.indexOf('<style>') + 7, appHtml.indexOf('</style>'));
  if (all.indexOf('@font-face') === -1) throw new Error('[mksite] dist/tg/index.html da @font-face topilmadi');
  return all.trim();
})();

/* ── 3. Landing (index.html) ─────────────────────────────────────────
   Qisqa, premium va halol (src/iq/CONTRACT.md §6): "rasmiy",
   "sertifikatlangan", persentil, "IQ oshiradi" va'dasi yo'q. Bitta asosiy
   tugma — botga. Narx yashirilmaydi: natija va sertifikat pullik ekani
   landing'da ochiq yoziladi. Brend — «Matritsa» (tools/brand.html).
   JS yoʻq, CSP qatʼiy. */
const APP = cfg.appName || 'IQuest';

/* Test uzunligi ilovadagi bilan bir xil bo'lsin (Main.dc.html →
   TEST_LENGTH). Topilmasa raqamsiz yoziladi — noto'g'ri raqamdan yaxshi. */
const TEST_LEN = (() => {
  try {
    const m = readFileSync('src/Main.dc.html', 'utf8').match(/const TEST_LENGTH\s*=\s*(\d+)\s*;/);
    return m ? m[1] : '';
  } catch (e) { return ''; }
})();
/* O'yinlar soni — src/games/ dagi haqiqiy fayllardan (demo va reyestr emas). */
const GAME_COUNT = (() => {
  try { return readdirSync('src/games').filter(f => f.endsWith('.js') && f !== 'index.js' && f !== 'demo.js').length; }
  catch (e) { return 0; }
})();

const TITLE = `${APP} — IQ test, mashq va IQ oʻyinlari`;
const DESC = (TEST_LEN ? `${TEST_LEN} savollik moslashuvchan IQ test` : 'Moslashuvchan IQ test') +
             ', savol turlari boʻyicha mashq va IQ oʻyinlari — Telegram ichida. ' +
             'Roʻyxatdan oʻtish shart emas.';
for (const t of [TITLE, DESC]) {
  if (/[‘’'`]/.test(t) || /[Ѐ-ӿ]/.test(t)) throw new Error('[mksite] landing matnida imlo xatosi: ' + t);
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const PW = cfg.paywall && cfg.paywall.enabled ? cfg.paywall : null;
const PRICE = PW && PW.price ? String(PW.price) : '';
const CHANNEL = String(cfg.telegramChannel || '').replace(/^@/, '').replace(/^https?:\/\/t\.me\//, '');
const CHANNEL_URL = CHANNEL ? 'https://t.me/' + CHANNEL : '';

/* «Matritsa» belgisi — 512 setka (tools/brand.html). fg — kataklar,
   acc — javob (oxirgi doira). */
const glyph = (fg, acc, size, cls) =>
  `<svg class="${cls || ''}" width="${size}" height="${size}" viewBox="112 112 290 290" aria-hidden="true">` +
  [[120, 120, 72, 4], [219.13, 119.13, 73.75, 12.88], [318.25, 118.25, 75.5, 21.75],
   [119.13, 219.13, 73.75, 12.88], [218.25, 218.25, 75.5, 21.75], [317.38, 217.38, 77.25, 30.63],
   [118.25, 318.25, 75.5, 21.75], [217.38, 317.38, 77.25, 30.63], [316.5, 316.5, 79, 39.5]]
    .map(([x, y, w, r], i) => `<rect x="${x}" y="${y}" width="${w}" height="${w}" rx="${r}" fill="${i === 8 ? acc : fg}"/>`)
    .join('') + '</svg>';
const tgIcon = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" ' +
  'd="M21.4 3.6 2.9 10.8c-1.3.5-1.2 1.3-.2 1.6l4.7 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3.1-14.7c.3-1.3-.5-1.9-1.5-1.5Zm-3.3 3.6-8.6 7.8-.3 3.4-1.6-4.9 10.1-6.4c.5-.3.8 0 .4.1Z"/></svg>';

const ctas = () => BOT_URL ? `<div class="ctas">
<a class="btn btn-main" href="${BOT_URL}">${tgIcon}<span>Telegram botda ochish</span></a>${CHANNEL_URL ? `
<a class="btn btn-ghost" href="${CHANNEL_URL}">Kanal</a>` : ''}
</div>` : '';

const FEATURES = [
  ['IQ test', (TEST_LEN ? `${TEST_LEN} ta savol. ` : '') +
    'Savollar javoblaringizga qarab qiyinlashadi yoki osonlashadi. Natija — IQ shkalasidagi baho va uning oraligʻi.'],
  ['Mashq', 'Savol turlari boʻyicha alohida mashq: sonli qatorlar, matritsalar, fazoviy va ogʻzaki mantiq. Har javobdan keyin izoh.'],
  ['IQ oʻyinlari', (GAME_COUNT ? `${GAME_COUNT} ta qisqa oʻyin` : 'Qisqa oʻyinlar') +
    ': diqqat, xotira va hisob tezligi uchun. Har kuni bir necha daqiqa.'],
];
const STEPS = [
  ['Botni oching', '«Telegram botda ochish» tugmasini bosing, botda «IQuestni ochish»ni tanlang. Ilova Telegram ichida ochiladi.'],
  ['Testni ishlang', 'Oʻzingizga qulay vaqtda, shoshilmasdan. Mashq va IQ oʻyinlari — bepul.'],
  PW ? ['Natijani oling', `Toʻliq natija va sertifikat — ${PRICE || 'bir martalik toʻlov'}. Kartaga oʻtkazib, chekni botga yuborasiz; tasdiqlangach natija shu yerda ochiladi.`]
     : ['Natijani oling', 'Natija test tugashi bilan ekranda koʻrinadi.'],
];

const landingCss = `
:root{color-scheme:light dark;
--bg:#F5F3FF;--surface:#FFFFFF;--fg:#10183A;--muted:#596186;--line:rgba(16,24,58,.10);
--navy:#10183A;--night:#0C1230;--coral:#FF5B3A;--blue:#3D5EFF;--num:#3D5EFF}
@media (prefers-color-scheme:dark){:root{
--bg:#0C1230;--surface:#141C44;--fg:#FFFFFF;--muted:#A3ACD2;--line:rgba(255,255,255,.10);--num:#8FA2FF}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:500 17px/1.6 Manrope,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}
h1,h2,h3,.brand{font-family:'Space Grotesk',Manrope,system-ui,sans-serif;letter-spacing:-.02em}
.hero{position:relative;overflow:hidden;background:var(--night);color:#fff;isolation:isolate}
.hero:before{content:"";position:absolute;inset:0;z-index:-1;
background:radial-gradient(60% 50% at 85% 20%,rgba(61,94,255,.35),rgba(61,94,255,0) 70%),
radial-gradient(40% 35% at 10% 95%,rgba(255,91,58,.16),rgba(255,91,58,0) 70%)}
.hero:after{content:"";position:absolute;inset:0;z-index:-1;
background-image:radial-gradient(rgba(255,255,255,.13) 1.3px,transparent 1.7px);background-size:14px 14px;
-webkit-mask-image:radial-gradient(90% 80% at 70% 30%,#000 30%,transparent 80%);mask-image:radial-gradient(90% 80% at 70% 30%,#000 30%,transparent 80%)}
.top{display:flex;align-items:center;justify-content:space-between;padding-block:18px}
.brand{display:inline-flex;align-items:center;gap:10px;font-weight:700;font-size:22px;text-decoration:none;color:#fff}
.hero-grid{display:grid;gap:36px;padding-block:28px 64px;align-items:center}
.eyebrow{display:inline-block;margin:0;padding:7px 13px;border-radius:999px;font-size:13px;font-weight:700;
letter-spacing:.02em;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);color:#C9D0F0}
h1{font-size:clamp(34px,8.6vw,60px);line-height:1.04;font-weight:700;margin:18px 0 0;text-wrap:balance}
.lead{margin:18px 0 0;font-size:18px;line-height:1.55;color:#C9D0F0;max-width:34em;text-wrap:pretty}
.ctas{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:56px;padding:0 26px;
border-radius:16px;font-weight:800;font-size:17px;text-decoration:none;transition:transform .15s ease,box-shadow .15s ease}
.btn:active{transform:scale(.98)}
.btn-main{background:#fff;color:var(--navy);box-shadow:0 10px 30px rgba(0,0,0,.28)}
.btn-main svg{color:#2AABEE}
.btn-main:hover{box-shadow:0 14px 36px rgba(0,0,0,.36)}
.btn-ghost{color:#fff;border:1.5px solid rgba(255,255,255,.28)}
.btn-ghost:hover{border-color:rgba(255,255,255,.5)}
.note{margin:14px 0 0;font-size:14px;color:#A3ACD2}
.art{display:grid;place-items:center}
.art-tile{width:min(300px,72vw);aspect-ratio:1;border-radius:22%;background:linear-gradient(160deg,#18214A,#10183A);
display:grid;place-items:center;border:1px solid rgba(255,255,255,.08);box-shadow:0 30px 80px rgba(4,8,30,.55),inset 0 1px 0 rgba(255,255,255,.08)}
.art-tile svg{width:64%;height:64%}
section.block{padding-block:64px 8px}
h2{font-size:clamp(26px,5.4vw,36px);line-height:1.15;font-weight:700;margin:0 0 24px;text-wrap:balance}
.cards{display:grid;gap:14px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:22px 22px 20px}
.card h3{margin:14px 0 6px;font-size:20px;font-weight:700}
.card p{margin:0;color:var(--muted);font-size:16px;line-height:1.55;text-wrap:pretty}
.steps{list-style:none;margin:0;padding:0;display:grid;gap:14px;counter-reset:s}
.steps li{counter-increment:s;display:grid;grid-template-columns:44px 1fr;gap:4px 14px;background:var(--surface);
border:1px solid var(--line);border-radius:22px;padding:20px}
.steps li:before{content:counter(s);grid-row:span 2;width:44px;height:44px;border-radius:14px;display:grid;place-items:center;
font:700 20px/1 'Space Grotesk',Manrope,sans-serif;background:var(--navy);color:#fff}
.steps li:last-child:before{background:var(--coral)}
.steps b{font-family:'Space Grotesk',Manrope,sans-serif;font-size:19px;font-weight:700;letter-spacing:-.01em}
.steps span{color:var(--muted);font-size:16px;line-height:1.55;text-wrap:pretty}
.final{margin:56px 0 0;background:var(--night);color:#fff;border-radius:28px;padding:36px 24px;text-align:center;position:relative;overflow:hidden}
.final h2{margin:18px 0 0}
.final .ctas{justify-content:center}
footer{padding-block:40px 48px;color:var(--muted);font-size:14px}
footer nav{display:flex;flex-wrap:wrap;gap:8px 18px;font-weight:600;margin-bottom:14px}
footer a{color:var(--muted);text-decoration:none}
footer a:hover{color:var(--fg)}
@media (min-width:760px){
.hero-grid{grid-template-columns:1.25fr 1fr;padding-block:48px 96px}
.cards{grid-template-columns:repeat(3,1fr)}
.steps{grid-template-columns:repeat(3,1fr)}
.steps li{grid-template-columns:1fr;gap:10px}
.steps li:before{grid-row:auto}
.final{padding:56px 40px}}
@media (prefers-reduced-motion:reduce){.btn{transition:none}}
`;

const LEGAL_NAV = ['maxfiylik', 'shartlar', 'aloqa', 'malumot-ochirish']
  .map(slug => `<a href="${sitePath('uz', slug)}">${pageTitle('uz', slug)}</a>`).join('\n');
function pageTitle(lang, slug) {
  return built.find(p => p.lang === lang && p.slug === slug).title;
}

const hasOg = existsSync('resources/og.jpg');
if (hasOg) copyFileSync('resources/og.jpg', join(OUT, 'og.jpg'));
else warn.push('resources/og.jpg yo\'q — `node tools/mkog.mjs` ishga tushiring');

const head = [
  `<title>${TITLE}</title>`,
  `<meta name="description" content="${DESC}">`,
  `<meta name="apple-mobile-web-app-title" content="${APP}">`,
  `<link rel="manifest" href="manifest.webmanifest">`,
  `<link rel="icon" href="favicon.png" sizes="32x32">`,
  `<link rel="apple-touch-icon" href="apple-touch-icon.png">`,
  `<meta property="og:type" content="website">`,
  `<meta property="og:site_name" content="${APP}">`,
  `<meta property="og:title" content="${TITLE}">`,
  `<meta property="og:description" content="${DESC}">`,
  `<meta property="og:locale" content="uz_UZ">`,
  `<meta name="twitter:card" content="summary_large_image">`,
  SITE ? `<link rel="canonical" href="${SITE}/">` : null,
  SITE ? `<meta property="og:url" content="${SITE}/">` : null,
  SITE && hasOg ? `<meta property="og:image" content="${SITE}/og.jpg">` : null,
  SITE && hasOg ? `<meta property="og:image:width" content="1200">` : null,
  SITE && hasOg ? `<meta property="og:image:height" content="630">` : null,
  hasOg ? `<meta property="og:image:alt" content="${APP} — IQ test va IQ oʻyinlari">` : null,
].filter(Boolean).join('\n');

const index = `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; font-src 'self'; base-uri 'none'; form-action 'none'">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0C1230">
${head}
<style>${allFontCss}</style>
<style>${landingCss}</style>
</head>
<body>
<header class="hero">
<div class="wrap">
<div class="top">
<a class="brand" href="./">${glyph('#FFFFFF', '#FF6A4B', 30)}${APP}</a>
</div>
<div class="hero-grid">
<div>
<p class="eyebrow">Telegram Mini App</p>
<h1>Mantiqiy fikrlashingizni sinang va mashq qiling</h1>
<p class="lead">${esc(DESC)}</p>
${ctas()}
${BOT_URL ? `<p class="note">Ilova oʻrnatish shart emas — hammasi Telegram ichida ishlaydi.</p>` : ''}
</div>
<div class="art"><div class="art-tile">${glyph('#FFFFFF', '#FF6A4B', 200)}</div></div>
</div>
</div>
</header>
<main>
<section class="block"><div class="wrap">
<h2>Ichida nima bor</h2>
<div class="cards">
${FEATURES.map(([t, d], i) => `<div class="card">${glyph(i === 0 ? 'var(--fg)' : 'var(--muted)', '#FF5B3A', 36)}<h3>${t}</h3><p>${d}</p></div>`).join('\n')}
</div>
</div></section>
<section class="block"><div class="wrap">
<h2>Qanday ishlaydi</h2>
<ol class="steps">
${STEPS.map(([t, d]) => `<li><b>${t}</b><span>${esc(d)}</span></li>`).join('\n')}
</ol>
${BOT_URL ? `<div class="final">
${glyph('#FFFFFF', '#FF6A4B', 56)}
<h2>Boshlash uchun bitta tugma</h2>
${ctas()}
</div>` : ''}
</div></section>
</main>
<footer><div class="wrap">
<nav aria-label="Huquqiy sahifalar">
${LEGAL_NAV}
</nav>
<nav aria-label="Til"><a href="${sitePath('ru', 'shartlar')}" lang="ru">Русский</a><a href="${sitePath('en', 'shartlar')}" lang="en">English</a></nav>
<span>© ${new Date().getFullYear()} ${esc(cfg.publisher || APP)}${cfg.domainConfirmed ? ' · ' + cfg.domain : ''}</span>
</div></footer>
</body>
</html>
`;
if (/<script\b/i.test(index)) throw new Error('[mksite] landing JS saqlamasligi kerak');
writeFileSync(join(OUT, 'index.html'), index);

/* ── 4. Matn sahifalari (uz · ru · en) ──────────────────────────────── */
const CSS = `
:root{color-scheme:light dark;
--bg:#F5F3FF;--surface:#fff;--fg:#1C1B29;--muted:#6E6985;
--primary:#3D5EFF;--line:rgba(28,27,41,.10);--warn:#FFF6E5;--warn-line:#FFA726}
@media (prefers-color-scheme:dark){:root{
--bg:#14121F;--surface:#1E1B2E;--fg:#F4F2FF;--muted:#9C97B8;
--primary:#7D92FF;--line:rgba(255,255,255,.12);--warn:#2A2338;--warn-line:#FFB84D}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);
font:400 17px/1.65 Manrope,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
-webkit-text-size-adjust:100%}
.wrap{max-width:720px;margin:0 auto;padding:0 20px}
header{border-bottom:1px solid var(--line)}
header .wrap{display:flex;align-items:center;justify-content:space-between;
gap:12px 20px;padding-block:16px;flex-wrap:wrap}
.brand{font-weight:800;font-size:20px;letter-spacing:-.02em;color:var(--fg);text-decoration:none}
nav{display:flex;gap:6px 18px;flex-wrap:wrap;font-size:15px;font-weight:600}
nav a{color:var(--muted);text-decoration:none}
nav a:hover,nav a[aria-current]{color:var(--fg)}
.langs{display:flex;gap:2px;padding:3px;border-radius:10px;background:var(--surface);
border:1px solid var(--line);font-size:13px;font-weight:700;letter-spacing:.02em}
.langs a{padding:4px 9px;border-radius:7px;color:var(--muted);text-decoration:none}
.langs a[aria-current]{background:var(--fg);color:var(--bg)}
.top{display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%}
main{padding-block:40px 64px}
h1{font-size:clamp(28px,6vw,40px);font-weight:800;letter-spacing:-.025em;
line-height:1.15;margin:0 0 24px;text-wrap:pretty}
h2{font-size:21px;font-weight:800;letter-spacing:-.01em;margin:40px 0 10px;text-wrap:pretty}
p,li{text-wrap:pretty;overflow-wrap:break-word}
p{margin:0 0 14px}
ul,ol{margin:0 0 14px;padding-left:22px}
li{margin-bottom:7px}
a{color:var(--primary)}
strong{font-weight:700}
.lead{font-size:19px;background:var(--surface);border-radius:16px;
padding:20px;border:1px solid var(--line)}
.meta{color:var(--muted);font-size:14px;font-weight:600}
.big{font-size:20px;font-weight:700}
.warn{background:var(--warn);border-left:4px solid var(--warn-line);
border-radius:10px;padding:16px 18px}
.warn p:last-child{margin-bottom:0}
table{width:100%;border-collapse:collapse;margin:0 0 18px;font-size:15px;
display:block;overflow-x:auto}
th,td{text-align:left;padding:11px 12px;border-bottom:1px solid var(--line);
vertical-align:top}
th{font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:.04em;
color:var(--muted)}
footer{border-top:1px solid var(--line);color:var(--muted);font-size:14px}
footer .wrap{padding-block:24px 48px;display:flex;justify-content:space-between;
gap:16px;flex-wrap:wrap}
`;

/* Havolalar NISBIY ("../maxfiylik/"), ildizga nisbatan emas ("/…").

   Ikki sabab:

   1. TUZATILGAN XATO: matn sahifalari ichki papkada turadi
      (maxfiylik/index.html) va ularning @font-face havolasi
      "./fonts/…" edi — ya'ni brauzer /maxfiylik/fonts/… ni so'rardi,
      bunday fayl esa yo'q. Natijada maxfiylik siyosati va qolgan
      uchta sahifa SHRIFTSIZ ko'rinardi (tizim shriftiga tushardi) va
      buni sezish qiyin, chunki sahifa baribir o'qiladi.
      /ru/ va /en/ sahifalari bir pog'ona chuqurroq — shuning uchun
      ildizga yo'l har sahifa uchun chuqurligidan hisoblanadi (ROOT).

   2. Sayt endi ildizga bog'liq emas: uni pastki papkada ham
      (example.com/iquest/) yoki oflayn papka sifatida ham ochish
      mumkin. */

/* Shriftni ilova build'idan qayta ishlatamiz: u allaqachon dist/site/fonts
   ichida va o'sha yerdan yuklanadi (Google Fonts'ga chiqmaydi). Kirill
   yuzlari ham shu ro'yxatda — /ru/ sahifalari Manrope bilan chiziladi. */
const fontCss = (() => {
  // Faqat Manrope kerak — matn sahifalarida sarlavha shrifti ishlatilmaydi.
  return allFontCss.split('@font-face').filter(x => /Manrope/.test(x))
    .map(x => '@font-face' + x.slice(0, x.lastIndexOf('}') + 1)).join('\n');
})();
const fontFacesAt = root => fontCss.replace(/url\(\.\/fonts\//g, `url(${root}fonts/`);

const SHORT = { uz: 'UZ', ru: 'RU', en: 'EN' };

function page(p) {
  const C = CHROME[p.lang];
  const root = '../'.repeat(p.path.split('/').filter(Boolean).length);
  const nav = [`<a href="${root}">${C.home}</a>`].concat(
    ['maxfiylik', 'shartlar', 'aloqa'].map(slug =>
      `<a href="../${slug}/"${slug === p.slug ? ' aria-current="page"' : ''}>${C.nav[slug]}</a>`)
  ).join('\n');
  const langs = SITE_LANGS.map(l =>
    `<a href="${root}${sitePath(l, p.slug)}" hreflang="${l}" lang="${CHROME[l].htmlLang}" ` +
    `title="${CHROME[l].langName}"${l === p.lang ? ' aria-current="true"' : ''}>${SHORT[l]}</a>`
  ).join('');
  /* hreflang faqat tasdiqlangan domen bilan: Google to'liq URL talab qiladi
     (canonical va sitemap bilan bir xil qoida). Ko'rinadigan til
     tanlovi esa doim bor. */
  const alternates = SITE ? SITE_LANGS.map(l =>
      `<link rel="alternate" hreflang="${l}" href="${SITE}/${sitePath(l, p.slug)}">`)
    .concat(`<link rel="alternate" hreflang="x-default" href="${SITE}/${sitePath(SITE_LANGS[0], p.slug)}">`)
    .join('\n') + '\n' : '';
  const canonical = SITE ? `<link rel="canonical" href="${SITE}/${p.path}">\n` : '';
  const ogAlt = SITE_LANGS.filter(l => l !== p.lang)
    .map(l => `<meta property="og:locale:alternate" content="${CHROME[l].ogLocale}">\n`).join('');
  return `<!DOCTYPE html>
<html lang="${C.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#F5F3FF" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#14121F" media="(prefers-color-scheme: dark)">
<link rel="icon" href="${root}favicon.png" sizes="32x32">
<title>${p.title} — ${APP}</title>
<meta name="description" content="${p.description}">
${canonical}${alternates}<meta property="og:type" content="article">
<meta property="og:site_name" content="${APP}">
<meta property="og:title" content="${p.title} — ${APP}">
<meta property="og:description" content="${p.description}">
<meta property="og:locale" content="${C.ogLocale}">
${ogAlt}${SITE && hasOg ? `<meta property="og:image" content="${SITE}/og.jpg">\n` : ''}<style>${fontFacesAt(root)}</style>
<style>${CSS}</style>
</head>
<body>
<header><div class="wrap">
<div class="top">
<a class="brand" href="${root}">${APP}</a>
<div class="langs" role="navigation" aria-label="${C.langLabel}">${langs}</div>
</div>
<nav aria-label="${C.navLabel}">${nav}</nav>
</div></header>
<main><div class="wrap">${p.body}
</div></main>
<footer><div class="wrap">
<span>© ${new Date().getFullYear()} ${cfg.publisher || APP}${cfg.domainConfirmed ? ' · ' + cfg.domain : ''}</span>
<span><a href="../malumot-ochirish/"${p.slug === 'malumot-ochirish' ? ' aria-current="page"' : ''}>${C.deletion}</a></span>
</div></footer>
</body>
</html>
`;
}

for (const p of built) {
  mkdirSync(join(OUT, p.path), { recursive: true });
  writeFileSync(join(OUT, p.path, 'index.html'), page(p));
}

/* ── 5. PWA ikonkalari va manifest ──────────────────────────────────
   Ikonkalar resources/icon-only.png (1024×1024) dan yasaladi — Android
   ilovasi bilan BIR XIL manba, shuning uchun saytga o'rnatilgan versiya
   va do'kondan o'rnatilgani bir xil ko'rinadi.

   maskable alohida yozilmaydi: hozirgi ikonkada chetlarda zaxira joy
   (safe zone) yo'q, shuning uchun uni maskable deb belgilash Android'da
   chetlarini qirqib ko'rsatishga olib keladi. Yolg'on belgi qo'ygandan
   ko'ra qo'ymagan yaxshi — brauzer o'zi to'g'ri ramkaga soladi. */
const icons = [];
const ICON_SRC = join('resources', 'icon-only.png');
if (existsSync(ICON_SRC)) {
  const sharp = (await import('sharp')).default;
  for (const size of [192, 512]) {
    const name = `icon-${size}.png`;
    await sharp(ICON_SRC).resize(size, size).png({ compressionLevel: 9 })
      .toFile(join(OUT, name));
    icons.push({ src: name, sizes: `${size}x${size}`, type: 'image/png' });
  }
  // Apple Safari manifest ikonkalarini o'qimaydi — unga alohida teg kerak.
  await sharp(ICON_SRC).resize(180, 180).png({ compressionLevel: 9 })
    .toFile(join(OUT, 'apple-touch-icon.png'));
  // Brauzer yorlig'i uchun kichik ikonka.
  await sharp(ICON_SRC).resize(32, 32).png({ compressionLevel: 9 })
    .toFile(join(OUT, 'favicon.png'));
} else {
  warn.push('resources/icon-only.png yo\'q — PWA ikonkalari yasalmadi');
}
writeFileSync(join(OUT, 'manifest.webmanifest'), JSON.stringify({
  name: `${APP} — IQ test va IQ oʻyinlari`,
  short_name: APP,
  description: DESC,
  start_url: './',
  scope: './',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#F5F3FF',
  theme_color: '#F5F3FF',
  lang: 'uz',
  dir: 'ltr',
  icons: icons,
}, null, 2));

/* ── 6. robots.txt va sitemap.xml ───────────────────────────────────── */
if (SITE) {
  /* Har huquqiy sahifa uch tilda: har biri o'z <url> yozuvi va
     xhtml:link bilan qolgan tildagi nusxalariga ishora qiladi. */
  const alt = slug => SITE_LANGS.map(l =>
    `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE}/${sitePath(l, slug)}"/>`)
    .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/${sitePath(SITE_LANGS[0], slug)}"/>`)
    .join('\n');
  const entries = [`  <url><loc>${SITE}/</loc></url>`].concat(built.map(p =>
    `  <url>\n    <loc>${SITE}/${p.path}</loc>\n${alt(p.slug)}\n  </url>`));
  writeFileSync(join(OUT, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n' +
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    entries.join('\n') + '\n</urlset>\n');
  writeFileSync(join(OUT, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
} else {
  /* Domen tasdiqlanmagan: sitemap yozilmaydi, lekin robots.txt baribir
     kerak — bo'lmasa 404 qaytadi va ba'zi indekslovchilar uni xato deb
     hisoblaydi. Indekslash TAQIQLANADI: tasodifiy manzilda turgan
     tugallanmagan sayt qidiruvga tushmasligi kerak. */
  writeFileSync(join(OUT, 'robots.txt'),
    'User-agent: *\nDisallow: /\n\n' +
    '# Domen hali tasdiqlanmagan (site.config.json → domainConfirmed).\n' +
    '# Tasdiqlangach bu fayl "Allow: /" va sitemap bilan qayta yasaladi.\n');
}

/* ── 7. Hosting sozlamalari ─────────────────────────────────────────
   Ikki keng tarqalgan bepul hosting uchun. Ikkalasi ham statik fayllarni
   beradi, lekin 404 va sarlavhalar boshqa-boshqa sozlanadi. */
writeFileSync(join(OUT, '_headers'),
  `/*\n` +
  `  X-Content-Type-Options: nosniff\n` +
  `  Referrer-Policy: strict-origin-when-cross-origin\n` +
  `  X-Frame-Options: SAMEORIGIN\n` +
  `\n/fonts/*\n  Cache-Control: public, max-age=31536000, immutable\n`);

/* ── 8. Hisobot ─────────────────────────────────────────────────────── */
const kb = p => (readFileSync(join(OUT, p)).length / 1024).toFixed(0) + ' KB';
console.log('');
console.log(`sayt → ${OUT}/`);
console.log(`  ${'index.html'.padEnd(32)}${kb('index.html').padStart(6)}  (landing → ${BOT_URL || 'bot yoʻq'})`);
for (const p of built) {
  console.log(`  ${(p.path + 'index.html').padEnd(32)}${kb(join(p.path, 'index.html')).padStart(6)}  ${p.title}`);
}
console.log(`  manifest.webmanifest    ${icons.length} ta ikonka`);
console.log(`  og.jpg                  ${hasOg ? (SITE ? 'havola ko\'rinishi uchun' : 'yasalgan, lekin og:image domen tasdiqlanmaguncha yozilmaydi') : 'YO\'Q'}`);
console.log(`  robots.txt              ${SITE ? 'indekslashga ruxsat' : 'INDEKSLASH TAQIQLANGAN'}`);
if (SITE) console.log(`  sitemap.xml             ${built.length + 1} ta manzil`);

if (warn.length) {
  console.log('\n⚠ E\'TIBOR BERING:');
  for (const w of warn) console.log('  · ' + w);
  console.log('\n  Bularni site.config.json da to\'ldiring. Play Console\'ga havola');
  console.log('  berishdan OLDIN maxfiylik siyosati va aloqa manzili shart.');
}
