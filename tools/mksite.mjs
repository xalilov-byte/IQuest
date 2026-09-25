/* ─────────────────────────────────────────────────────────────────────────
   SAYTNI YIG'ISH  →  dist/site/

   Ishga tushirish:  node tools/mksite.mjs
   (avval `node build.mjs --target=web` ishga tushadi — u avtomatik)

   Chiqadigan tuzilma:

     dist/site/
       index.html              landing + brauzerdagi ilova (bitta fayl)
       maxfiylik/index.html    maxfiylik siyosati   ← Play MAJBURIY
       shartlar/index.html     foydalanish shartlari
       aloqa/index.html        aloqa                ← Play MAJBURIY
       malumot-ochirish/…      ma'lumotni o'chirish ← Play MAJBURIY
       manifest.webmanifest    telefonga o'rnatish (PWA)
       sitemap.xml, robots.txt
       fonts/, *.jpg, ikonkalar

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
import { pages } from '../src/site/pages.mjs';

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
if (!cfg.telegramBot) {
  warn.push('telegramBot bo\'sh — landing\'dagi "Telegramda ochish" tugmasi olib tashlanadi');
}

const SITE = cfg.domainConfirmed ? 'https://' + cfg.domain : null;

/* ── 2. Ilovani yig'ish ─────────────────────────────────────────────── */
execFileSync(process.execPath, ['build.mjs', '--target=web'], { stdio: 'inherit' });

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

/* dist/web ni ko'chiramiz (fontlar, rasmlar, index.html) */
function copyDir(from, to) {
  mkdirSync(to, { recursive: true });
  for (const name of readdirSync(from, { withFileTypes: true })) {
    if (name.isDirectory()) copyDir(join(from, name.name), join(to, name.name));
    else copyFileSync(join(from, name.name), join(to, name.name));
  }
}
copyDir('dist/web', OUT);

/* ── 3. Landing sahifasining <head> qismi ────────────────────────────
   Ilova build'i faqat "IQuest" nomini qo'yadi — ilovaga shundan ortiq
   kerak emas. Saytga esa kerak: qidiruv natijasidagi matn, Telegram va
   ijtimoiy tarmoqdagi havola ko'rinishi (Open Graph) va qaysi manzil
   asosiy ekani (canonical). */
/* Matn qisqa va halol (src/iq/CONTRACT.md §6): "rasmiy",
   "sertifikatlangan", persentil, "IQ oshiradi" va'dasi yo'q. */
const APP = cfg.appName || 'IQuest';
const TITLE = `${APP} — IQ test, mashq va aql o‘yinlari`;
const DESC = '30 savollik moslashuvchan IQ test, savol turlari bo‘yicha mashq ' +
             'va aql o‘yinlari. Internetsiz ishlaydi, ro‘yxatdan o‘tish shart emas.';

/* Havola ko'rinishidagi rasm (Telegram, WhatsApp, ijtimoiy tarmoq).
   tools/mkog.mjs bilan yasaladi. Fayl yo'q bo'lsa og:image YOZILMAYDI —
   mavjud bo'lmagan rasmga ko'rsatish havola ko'rinishini butunlay
   buzadi (ba'zi mijozlar rasm o'rniga bo'sh joy qoldiradi). */
const hasOg = existsSync('resources/og.jpg');
if (hasOg) copyFileSync('resources/og.jpg', join(OUT, 'og.jpg'));
else warn.push('resources/og.jpg yo\'q — `node tools/mkog.mjs` ishga tushiring');

let index = readFileSync(join(OUT, 'index.html'), 'utf8');

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
  hasOg ? `<meta property="og:image:alt" content="${APP} — IQ test va aql o‘yinlari">` : null,
].filter(Boolean).join('\n');

/* Faqat <title> almashtiriladi — qolgan head o'z joyida qoladi.
   build.mjs sarlavhani "IQuest" qilib yozadi (u yerda ham shu nom). */
if (index.indexOf('<title>IQuest</title>') === -1) {
  throw new Error('[mksite] dist/web/index.html da "<title>IQuest</title>" topilmadi — ' +
                  'build.mjs o\'zgargan, mksite.mjs yangilansin');
}
index = index.replace('<title>IQuest</title>', head);

/* JS o'chirilgan brauzer (va JS ishlatmaydigan indekslovchi) bo'sh
   ekran ko'rmasligi kerak. Bu marketing matni emas — sahifaning
   mazmuni matn ko'rinishida. */
const noscript = `
<noscript>
<div style="max-width:680px;margin:0 auto;padding:48px 24px;font:500 16px/1.6 Manrope,system-ui,sans-serif">
<h1 style="font-size:32px;font-weight:800;letter-spacing:-.02em">${APP}</h1>
<p>30 savollik moslashuvchan IQ test, savol turlari bo‘yicha mashq va aql
o‘yinlari. Ilova internetsiz ham to‘liq ishlaydi.</p>
<p><strong>Ilovadan foydalanish uchun JavaScript yoqilishi kerak.</strong></p>
<p><a href="maxfiylik/">Maxfiylik siyosati</a> ·
<a href="shartlar/">Foydalanish shartlari</a> ·
<a href="aloqa/">Aloqa</a></p>
</div>
</noscript>
`;
index = index.replace('<div id="nz-root"></div>', '<div id="nz-root"></div>' + noscript);

writeFileSync(join(OUT, 'index.html'), index);

/* ── 4. Matn sahifalari ─────────────────────────────────────────────── */
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
gap:16px;padding-block:18px;flex-wrap:wrap}
.brand{font-weight:800;font-size:20px;letter-spacing:-.02em;color:var(--fg);text-decoration:none}
nav{display:flex;gap:18px;flex-wrap:wrap;font-size:15px;font-weight:600}
nav a{color:var(--muted);text-decoration:none}
nav a:hover,nav a[aria-current]{color:var(--fg)}
main{padding-block:40px 64px}
h1{font-size:clamp(28px,6vw,40px);font-weight:800;letter-spacing:-.025em;
line-height:1.15;margin:0 0 24px;text-wrap:pretty}
h2{font-size:21px;font-weight:800;letter-spacing:-.01em;margin:40px 0 10px;text-wrap:pretty}
p,li{text-wrap:pretty}
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

   2. Sayt endi ildizga bog'liq emas: uni pastki papkada ham
      (example.com/iquest/) yoki oflayn papka sifatida ham ochish
      mumkin. */
const NAV = [
  ['../', 'Bosh sahifa'],
  ['../maxfiylik/', 'Maxfiylik'],
  ['../shartlar/', 'Shartlar'],
  ['../aloqa/', 'Aloqa'],
];

/* Shriftni ilova build'idan qayta ishlatamiz: u allaqachon dist/site/fonts
   ichida va o'sha yerdan yuklanadi (Google Fonts'ga chiqmaydi). */
const fontFaces = (() => {
  const m = index.match(/@font-face\{[^]*?\}(?=\s*(?:@font-face|<\/style>))/g);
  // Faqat Manrope kerak — matn sahifalarida sarlavha shrifti ishlatilmaydi.
  const all = index.slice(index.indexOf('<style>') + 7, index.indexOf('</style>'));
  return all.split('@font-face').filter(x => /Manrope/.test(x))
    .map(x => '@font-face' + x.slice(0, x.lastIndexOf('}') + 1)).join('\n')
    // Matn sahifasi ichki papkada — "./fonts/" u yerdan topilmaydi.
    .replace(/url\(\.\/fonts\//g, 'url(../fonts/');
})();

function page(p) {
  const nav = NAV.map(([href, label]) =>
    `<a href="${href}"${href === '../' + p.slug + '/' ? ' aria-current="page"' : ''}>${label}</a>`
  ).join('\n');
  const canonical = SITE ? `<link rel="canonical" href="${SITE}/${p.slug}/">\n` : '';
  return `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#F5F3FF">
<link rel="icon" href="../favicon.png" sizes="32x32">
<title>${p.title} — ${APP}</title>
<meta name="description" content="${p.description}">
${canonical}<meta property="og:type" content="article">
<meta property="og:title" content="${p.title} — ${APP}">
<meta property="og:description" content="${p.description}">
${SITE && hasOg ? `<meta property="og:image" content="${SITE}/og.jpg">\n` : ''}<style>${fontFaces}</style>
<style>${CSS}</style>
</head>
<body>
<header><div class="wrap">
<a class="brand" href="../">${APP}</a>
<nav>${nav}</nav>
</div></header>
<main><div class="wrap">${p.body}
</div></main>
<footer><div class="wrap">
<span>© ${new Date().getFullYear()} ${cfg.publisher}${cfg.domainConfirmed ? ' · ' + cfg.domain : ''}</span>
<span><a href="../malumot-ochirish/">Ma’lumotni o‘chirish</a></span>
</div></footer>
</body>
</html>
`;
}

const built = pages(cfg);
for (const p of built) {
  mkdirSync(join(OUT, p.slug), { recursive: true });
  writeFileSync(join(OUT, p.slug, 'index.html'), page(p));
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
  name: `${APP} — IQ test va aql o‘yinlari`,
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
  const urls = ['/'].concat(built.map(p => '/' + p.slug + '/'));
  writeFileSync(join(OUT, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(u => `  <url><loc>${SITE}${u}</loc></url>`).join('\n') +
    '\n</urlset>\n');
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
console.log(`  ${'index.html'.padEnd(26)}${kb('index.html').padStart(6)}  (landing + ilova)`);
for (const p of built) {
  console.log(`  ${(p.slug + '/index.html').padEnd(26)}${kb(join(p.slug, 'index.html')).padStart(6)}  ${p.title}`);
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
