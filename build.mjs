/* ─────────────────────────────────────────────────────────────────────────
   src/Main.dc.html (dizayn manbasi)  →  uchta mustaqil ilova

   Ishga tushirish:
     node build.mjs                    → www/        (Android APK ichiga)
     node build.mjs --target=web       → dist/web/   (sayt)
     node build.mjs --target=admin     → dist/admin/ (admin panel)

   Bayroqlar:
     --strict   (yoki IQ_STRICT=1) — reliz nomzodi (WP11): v1.1 ning hamma
                modul fayli va NEED markerlari BOʻLISHI shart.
     --lang-en  — EN darvozasini majburan ochadi (faqat ishlab chiqish;
                CONTRACT §15).

   Dizayn fayli TAHRIR QILINMAYDI. Bu skript uning nusxasini olib,
   maqsadga kerak bo'lmagan qatlamlarni KESIB TASHLAYDI va qolganini
   qurilma ekraniga moslaydi.

   NIMA UCHUN KESISH KERAK — xavfsizlik:
   Manba faylda uchta mustaqil ilova bir joyda yashaydi (foydalanuvchi
   ilovasi, admin panel, landing). Maketda bu qulay. Lekin admin panel
   APK ichida qolsa, telefonidagi ilovani ochgan HAR QANDAY odam admin
   ekranlarini ko'radi va API'ga qo'lda so'rov yuborishga urinadi. Admin
   qatlami mobil va sayt build'lariga UMUMAN kirmasligi kerak — shunchaki
   yashirilmasligi, balki yig'ilgan fayldan yo'q bo'lishi.

   Har bir kesish va almashtirish assert bilan tekshiriladi — manba
   o'zgarsa, skript jim qolmay yiqiladi. Kesishdan keyin yana bir
   tekshiruv bor: o'chirilgan nom qolgan kodda hali ishlatilsa, build
   yiqiladi (ishlash vaqtidagi jimgina buzilish o'rniga baland xato).
   ───────────────────────────────────────────────────────────────────── */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync,
         existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import vm from 'vm';

const SRC = 'src';

const ARGS = process.argv.slice(2);
/* STRICT — integratsiya rejimi. Parallel ish paytida (WP1–WP10) yangi
   modullar hali yoʻq boʻlishi mumkin: oddiy build ularni oʻtkazib
   yuboradi. Reliz nomzodida esa yoʻq modul — xato. */
const STRICT = ARGS.indexOf('--strict') !== -1 || process.env.IQ_STRICT === '1';
const FORCE_EN = ARGS.indexOf('--lang-en') !== -1;
/* SOCIAL_ON — ijtimoiy qatlam (doʻstlar, chat, guruhlar, inbox) faqat
   backend bilan (v2, ARXITEKTURA §11). false turganda build uning nomlari
   va yozuvlari bundleʼda YOʻQLIGINI tekshiradi (CONTRACT §16): serverni
   talab qiladigan narsa ishlamaguncha ilovada umuman koʻrinmaydi —
   «tez kunda» ham, oʻchiq tugma ham yoʻq. */
const SOCIAL_ON = false;

/* ── 0. Maqsad (target) ──────────────────────────────────────────────── */
/* mobile — foydalanuvchi ilovasi (APK). Admin va landing kesiladi.
   web    — sayt: foydalanuvchi ilovasi + landing. Admin kesiladi.
   admin  — faqat admin panel. Foydalanuvchi ilovasi va landing kesiladi. */
/* PUL QATLAMI YO'Q. Nazariy'da Pro obunasi va to'lov oqimi bor edi
   (taqlid: "Tasdiqlash" bosilganda hech qanday to'lov bo'lmasdi). IQuest
   manbasidan u BUTUNLAY olib tashlandi: natija hech qachon pul ortida
   emas (src/iq/CONTRACT.md §6.6), Play'da raqamli mahsulot esa faqat
   Play Billing orqali sotiladi. Pastdagi tekshiruv (MONEY_NAMES) uning
   nomlaridan birortasi HECH QAYSI build'ga qaytib kirmasligini
   kafolatlaydi. */
const TARGETS = {
  mobile: { out: 'www',        app: true,  admin: false, landing: false, shell: 'shell.css' },
  web:    { out: 'dist/web',   app: true,  admin: false, landing: true,  shell: 'shell.css' },
  admin:  { out: 'dist/admin', app: false, admin: true,  landing: false, shell: 'shell-admin.css' },
};

const targetArg = ARGS.find(a => a.startsWith('--target='));
const TARGET = targetArg ? targetArg.slice('--target='.length) : 'mobile';
const CFG = TARGETS[TARGET];
if (!CFG) {
  throw new Error(`[build] noma'lum maqsad: "${TARGET}". Mumkin: ${Object.keys(TARGETS).join(', ')}`);
}
const OUT = CFG.out;

const src = readFileSync(join(SRC, 'Main.dc.html'), 'utf8');

function must(hay, needle, what) {
  const n = hay.split(needle).length - 1;
  if (n !== 1) throw new Error(`[build] "${what}" ${n} marta topildi (1 kutilgan). Manba o'zgargan — build.mjs yangilansin.`);
}

/* ── 1. Bo'laklarni ajratish ─────────────────────────────────────────── */
/* Diqqat: CSS izohlarining ichida ham "<style>" so'zi uchraydi, shuning
   uchun split() emas, birinchi ochilish + birinchi yopilish kesimi. */
const cssStart = src.indexOf('<style>') + '<style>'.length;
const cssEnd = src.indexOf('</style>', cssStart);
if (cssStart < 8 || cssEnd < 0) throw new Error('[build] <style> bloki topilmadi');
const styleCss = src.slice(cssStart, cssEnd);

let markup = src.split('</helmet>')[1].split('<script type="text/x-dc"')[0];
markup = markup.replace(/<\/x-dc>\s*$/, '').trim();

let logic = src.split('data-dc-script')[1].split('>').slice(1).join('>').split('</script>')[0];

/* ── 2. Kesish asboblari ─────────────────────────────────────────────── */

/* Markup'dagi yuqori darajali <sc-if value="{{ NAME }}"> blokini butunlay
   olib tashlaydi. Ichma-ich sc-if'lar hisobga olinadi (chuqurlik). */
function cutSection(html, name) {
  const open = `<sc-if value="{{ ${name} }}"`;
  const i = html.indexOf(open);
  if (i === -1) throw new Error(`[build] "${name}" bo'limi topilmadi`);
  if (html.indexOf(open, i + 1) !== -1) throw new Error(`[build] "${name}" bo'limi bir necha marta uchraydi`);

  const re = /<sc-if\b|<\/sc-if>/g;
  re.lastIndex = i;
  let depth = 0, end = -1, m;
  while ((m = re.exec(html)) !== null) {
    if (m[0] === '</sc-if>') {
      depth--;
      if (depth === 0) { end = m.index + m[0].length; break; }
    } else depth++;
  }
  if (end === -1) throw new Error(`[build] "${name}" bo'limi yopilmagan`);
  return html.slice(0, i) + html.slice(end);
}

/* Qavslarni hisoblab, JS blokining oxirini topadi. Satr va izoh ichidagi
   qavslar hisoblanmaydi (bir qatorli va ko'p qatorli izohlar ham).
   Manba faylda template literal yo'q va regex literallari qavs saqlamaydi
   (/ /g) — tekshirilgan, shuning uchun ular alohida ishlanmaydi. */
function blockEnd(code, openIdx) {
  const PAIRS = { '{': '}', '[': ']', '(': ')' };
  const openCh = code[openIdx];
  const closeCh = PAIRS[openCh];
  if (!closeCh) throw new Error(`[build] ${openIdx} pozitsiyada qavs kutilgan, "${openCh}" keldi`);

  let depth = 0, st = 'code';
  for (let i = openIdx; i < code.length; i++) {
    const c = code[i], n = code[i + 1];
    if (st === 'code') {
      if (c === '"') st = 'dq';
      else if (c === "'") st = 'sq';
      else if (c === '/' && n === '/') st = 'lc';
      else if (c === '/' && n === '*') st = 'bc';
      else if (c === openCh) depth++;
      else if (c === closeCh && --depth === 0) return i;
    }
    else if (st === 'dq') { if (c === '\\') i++; else if (c === '"') st = 'code'; }
    else if (st === 'sq') { if (c === '\\') i++; else if (c === "'") st = 'code'; }
    else if (st === 'lc') { if (c === '\n') st = 'code'; }
    else if (st === 'bc') { if (c === '*' && n === '/') { i++; st = 'code'; } }
  }
  throw new Error('[build] qavs yopilmadi');
}

/* Faqat TEKSHIRUV uchun: izoh va satr ichini bo'sh joyga aylantiradi,
   qolgan "yalang'och" kodni qaytaradi. Chiqishga ta'sir qilmaydi.

   Nima uchun kerak: nom qidirilganda izoh va satr yolg'on moslik beradi.
   Ikki haqiqiy misol — manba faylning "fayl xaritasi" izohida valsManage
   sanab o'tilgan, MONTHS_UZ satrida esa "may" oyi bor; ikkalasi ham kod
   emas, lekin oddiy qidiruv ularni topib, tekshiruvni bekorga yiqitadi.

   keepStrings — satrlar saqlanadi, faqat izohlar tozalanadi: foydalanuvchi
   koʻradigan matn (masalan SOCIAL tekshiruvi) satrda yashaydi, izohda
   esa «v2 da Doʻstlar tabi» kabi rejalar yozilishi mumkin va zararsiz. */
function codeOnly(code, keepStrings) {
  let out = '', st = 'code';
  const blank = c => (c === '\n' ? '\n' : ' ');
  for (let i = 0; i < code.length; i++) {
    const c = code[i], n = code[i + 1];
    if (st === 'code') {
      if (c === '/' && n === '/') { st = 'lc'; out += '  '; i++; continue; }
      if (c === '/' && n === '*') { st = 'bc'; out += '  '; i++; continue; }
      out += c;
      if (c === '"') st = 'dq';
      else if (c === "'") st = 'sq';
    }
    else if (st === 'dq' || st === 'sq') {
      const quote = st === 'dq' ? '"' : "'";
      if (c === '\\') { out += keepStrings ? c + (n || '') : '  '; i++; }
      else if (c === quote) { out += c; st = 'code'; }
      else out += keepStrings ? c : blank(c);
    }
    else if (st === 'lc') { out += blank(c); if (c === '\n') st = 'code'; }
    else if (st === 'bc') { out += blank(c); if (c === '*' && n === '/') { out += ' '; i++; st = 'code'; } }
  }
  return out;
}

/* Ta'rifdan YUQORIDAGI izoh blokini ham qamrab oladi.

   Kod kesilganda uni tushuntirgan izoh yetim qolib, yig'ilgan faylda
   mavjud bo'lmagan narsani tasvirlab turadi. Bundan tashqari bu admin
   qatlami borligini va uning ichki nomlarini oshkor qiladi — mobil
   build'da bunga hojat yo'q.

   Ko'p qatorli izoh (/* ... *(/) to'liq qamraladi: faqat oxirgi qatorini
   kesib, ochilishini qoldirish butun qolgan kodni izohga aylantirib
   yuboradi. */
function withCommentAbove(code, start) {
  for (;;) {
    const prevEnd = code.lastIndexOf('\n', start - 1);
    if (prevEnd === -1) return start;
    const prevStart = code.lastIndexOf('\n', prevEnd - 1) + 1;
    const line = code.slice(prevStart, prevEnd).trim();

    if (line.startsWith('//')) { start = prevStart; continue; }
    if (line.endsWith('*/')) {
      // JS'da izohlar ichma-ich bo'lmaydi — eng yaqin "/*" aynan shu blokning
      // ochilishi. Uning satr boshidan kesamiz.
      const open = code.lastIndexOf('/*', prevEnd);
      if (open === -1) return start;
      start = code.lastIndexOf('\n', open) + 1;
      continue;
    }
    return start;
  }
}

/* Blokni kesib, satr oxirigacha (";" va nuqta-vergul ortidagi izoh) yutadi. */
function cutFrom(code, start, openIdx) {
  const end = blockEnd(code, openIdx);
  let k = end + 1;
  while (k < code.length && code[k] !== '\n') k++;
  return code.slice(0, start) + code.slice(k + 1);
}

/* const NAME = [...] / {...} / (function(){...})() */
function cutConst(code, name) {
  const marker = `const ${name} = `;
  const i = code.indexOf(marker);
  if (i === -1) throw new Error(`[build] "const ${name}" topilmadi`);
  return cutFrom(code, withCommentAbove(code, i), i + marker.length);
}

/* function NAME(...) {...}  yoki klass metodi  NAME(...) {...} */
function cutFn(code, name, kind) {
  const marker = kind === 'function' ? `function ${name}(` : `\n  ${name}(`;
  const i = code.indexOf(marker);
  if (i === -1) throw new Error(`[build] "${kind} ${name}" topilmadi`);
  const brace = code.indexOf('{', i + marker.length);
  if (brace === -1) throw new Error(`[build] "${name}" tanasi topilmadi`);
  // Klass metodida marker "\n" dan boshlanadi — uni saqlaymiz.
  const start = kind === 'function' ? i : i + 1;
  return cutFrom(code, withCommentAbove(code, start), brace);
}

/* Aniq bitta satrni olib tashlaydi (assert bilan). */
function cutLine(code, needle, what) {
  must(code, needle, what);
  const i = code.indexOf(needle);
  let a = code.lastIndexOf('\n', i);
  let b = code.indexOf('\n', i);
  if (a === -1) a = 0;
  if (b === -1) b = code.length;
  return code.slice(0, a) + code.slice(b);
}

/* Bir qatorlik skalyar e'lon: const NAME = "…"; yoki const f = x => …;
   (cutConst qavsli qiymat kutadi, bu yerda qavs yo'q). Ustidagi izoh
   ham qamraladi — withCommentAbove. */
function cutConstLine(code, name) {
  const re = new RegExp(`(^|\\n)const ${name} = [^\\n]*;[ \\t]*(?=\\n)`);
  const m = re.exec(code);
  if (!m) throw new Error(`[build] bir qatorlik "const ${name}" topilmadi`);
  if (re.exec(code.slice(m.index + m[0].length))) throw new Error(`[build] "const ${name}" bir necha marta uchraydi`);
  const i = m.index + m[1].length;
  const start = withCommentAbove(code, i);
  let k = code.indexOf('\n', i);
  return code.slice(0, start) + code.slice(k + 1);
}

/* ── 3. Maqsadga kerak bo'lmagan qatlamlarni kesish ──────────────────── */

/* Markup: uchta mustaqil ko'rinish bo'limi bor. */
if (!CFG.admin)   markup = cutSection(markup, 'isAdmin');
if (!CFG.landing) markup = cutSection(markup, 'isLanding');

if (!CFG.app)     markup = cutSection(markup, 'isApp');

/* Maket chromi'dagi ko'rinish almashtirgichi: mavjud bo'lmagan bo'limga
   o'tkazadigan tugma qolmasligi kerak. */
const CHROME_BUTTONS = [
  ['Admin tugmasi',    '<button onClick="{{ showAdmin }}" style="{{ tabAdminStyle }}">Admin</button>', CFG.admin],
  ['Web sayt tugmasi', '<button onClick="{{ showLanding }}" style="{{ tabWebStyle }}">Web sayt</button>', CFG.landing],
  ['Mini App tugmasi', '<button onClick="{{ showApp }}" style="{{ tabAppStyle }}">Mini App</button>', CFG.app],
];
for (const [what, html, keep] of CHROME_BUTTONS) {
  if (keep) continue;
  must(markup, html, what);
  markup = markup.replace(html, '');
}

/* Logika: admin qatlami. Bu ro'yxatdagi hamma narsa FAQAT valsAnalytics /
   valsManage / logAction / parseBulk / toCsv ichida ishlatiladi —
   tekshirilgan (pastdagi "o'chirilgan nom qolmadi" tekshiruvi buni har
   build'da qayta isbotlaydi). Eski savol banki formati (LETTERS, IMG_DIR,
   SIGN_KEYS …) va Narx bo'limi (DEFAULT_PRICING) ham shu yerda: IQuest
   ilovasida ular kerak emas, faqat admin paneli ishlatadi. */
const ADMIN_CONSTS = ['ROLES', 'REASONS', 'ADMIN_USERS', 'ADMIN_QUESTIONS', 'AUDIT_SEED',
                      'CSV_COLUMNS', 'BULK_SAMPLES', 'DAU_90', 'FUNNEL', 'COHORTS',
                      'ITEMS', 'REV', 'METHOD_SHARE', 'SIGN_KEYS', 'DEFAULT_PRICING',
                      'MONTHS_UZ', 'ICON_OK', 'ICON_WARN', 'ICON_BAD'];
const ADMIN_SCALARS = ['LETTERS', 'IMG_DIR', 'MIN_OPTIONS', 'MAX_OPTIONS', 'letterOf'];
const ADMIN_FNS = ['nowIso', 'shortTime', 'maskPhone', 'parseBulk', 'toCsv',
                   'parseCsvLine', 'csvCell', 'dateAfter'];
const ADMIN_METHODS = ['valsAnalytics', 'valsManage', 'logAction', 'may'];

const removed = [];

if (!CFG.admin) {
  // renderVals() endi uch modulni yig'adi — kesilgan ikkitasiga chaqiruv qolmaydi.
  logic = cutLine(logic, 'this.valsAnalytics(s),', 'renderVals → valsAnalytics chaqiruvi');
  logic = cutLine(logic, 'this.valsManage(s),', 'renderVals → valsManage chaqiruvi');

  // state ichidagi admin ma'lumotlari
  logic = cutLine(logic, 'users: ADMIN_USERS.map(', 'state.users');
  logic = cutLine(logic, 'questions: ADMIN_QUESTIONS.map(', 'state.questions');
  logic = cutLine(logic, 'audit: AUDIT_SEED.slice(),', 'state.audit');
  logic = cutLine(logic, 'pricing: Object.assign({}, DEFAULT_PRICING),', 'state.pricing');
  logic = cutLine(logic, 'priceDraft: Object.assign({}, DEFAULT_PRICING),', 'state.priceDraft');

  for (const name of ADMIN_METHODS) { logic = cutFn(logic, name, 'method'); removed.push(name); }
  for (const name of ADMIN_FNS)     { logic = cutFn(logic, name, 'function'); removed.push(name); }
  for (const name of ADMIN_CONSTS)  { logic = cutConst(logic, name); removed.push(name); }
  for (const name of ADMIN_SCALARS) { logic = cutConstLine(logic, name); removed.push(name); }
}

/* Kesishdan keyingi tekshiruv: o'chirilgan nom qolgan kodda ishlatilsa,
   ilova ishlash vaqtida jimgina buziladi. Shuning uchun build yiqiladi. */
const logicCode = codeOnly(logic);
for (const name of removed) {
  const re = new RegExp(`\\b${name}\\b`);
  if (re.test(logicCode)) {
    throw new Error(`[build] "${name}" o'chirildi, lekin qolgan kodda hali ishlatilmoqda — ` +
                    `build.mjs dagi kesish ro'yxati yangilansin`);
  }
}

/* ── 4. Maketni qurilma ekraniga moslash (klass qo'shish) ────────────── */
/* Bu almashtirishlar faqat foydalanuvchi ilovasi markup'iga tegishli —
   admin build'da u kesilgan, shuning uchun o'tkazib yuboriladi. */
const T = [
  ['maket chromi (Mini App / Web sayt / Admin)',
   '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 20px;position:sticky;top:0;z-index:50;background:var(--background);border-bottom:1px solid var(--hairline)">',
   '<div class="nz-chrome" style="display:none">'],

  ['markazlashtiruvchi o\'ram',
   '<div style="display:flex;justify-content:center;padding:24px 16px 48px">',
   '<div class="nz-appwrap" style="display:flex;justify-content:center;padding:24px 16px 48px">'],

  ['telefon ramkasi',
   '<div style="width:390px;max-width:100%;min-height:800px;background:var(--background);border:1px solid var(--hairline);border-radius:28px;box-shadow:var(--shadow);overflow:hidden;position:relative;display:flex;flex-direction:column">',
   '<div class="nz-frame" style="width:390px;max-width:100%;min-height:800px;background:var(--background);border:1px solid var(--hairline);border-radius:28px;box-shadow:var(--shadow);overflow:hidden;position:relative;display:flex;flex-direction:column">'],

  ['ekranlar maydoni',
   '<div style="flex:1;overflow:hidden;display:flex;flex-direction:column">',
   '<div class="nz-screens" style="flex:1;overflow:hidden;display:flex;flex-direction:column">'],

  ['to\'liq ekranlar maydoni (savol, natija, o\'yin)',
   '<sc-if value="{{ fullOn }}" hint-placeholder-val="{{ false }}">\n      <div style="flex:1;display:flex;flex-direction:column;background:var(--background)">',
   '<sc-if value="{{ fullOn }}" hint-placeholder-val="{{ false }}">\n      <div class="nz-screens-quiz" style="flex:1;display:flex;flex-direction:column;background:var(--background)">'],


  ['pastki tab paneli',
   '<div style="position:absolute;left:0;right:0;bottom:0;height:68px;background:var(--surface);border-top:1px solid var(--hairline);display:grid;grid-template-columns:repeat(4,1fr);align-items:center">',
   '<div class="nz-nav" style="position:absolute;left:0;right:0;bottom:0;height:68px;background:var(--surface);border-top:1px solid var(--hairline);display:grid;grid-template-columns:repeat(4,1fr);align-items:center">'],
];

if (CFG.app) {
  for (const [what, from, to] of T) {
    must(markup, from, what);
    markup = markup.replace(from, to);
  }
} else {
  // Admin build'da chrome maket qoldig'i sifatida qoladi — yashiriladi.
  const chrome = T[0];
  must(markup, chrome[1], chrome[0]);
  markup = markup.replace(chrome[1], chrome[2]);
}

/* ── 5. Offline shriftlar ────────────────────────────────────────────── */
/* Subsetlar har bir shrift uchun ALOHIDA.

   Space Grotesk'da kirill YOʻQ (fontsource'da latin, latin-ext va
   vietnamese bor) — tekshirilgan. Manrope'da bor. Sarlavhalar uslubi
   'Space Grotesk', Manrope, … tartibida yozilgani uchun kirill harflar
   avtomatik Manrope'ga tushadi (brauzer har bir belgi uchun alohida
   zaxira shrift tanlaydi) — qoʻshimcha CSS shart emas.

   MUHIM: oʻzbek kirillidagi "қ", "ғ", "ҳ" harflari `cyrillic` subsetda
   YOʻQ, ular `cyrillic-ext` da (tekshirilgan: U+049B, U+0493, U+04B3).
   Faqat `cyrillic` qoʻshilsa, oʻzbek tilida eng koʻp uchraydigan uchta
   harf tushib qolardi. Shuning uchun ikkalasi ham kerak. */
const FONTS = [
  ['Manrope', 'manrope', [500, 600, 700, 800], ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext']],
  ['Space Grotesk', 'space-grotesk', [600, 700], ['latin', 'latin-ext']],
];

/* unicode-range fontsource'ning OʻZ CSS'idan oʻqiladi.

   Nima uchun shart: bir xil font-family va font-weight uchun bir necha
   @font-face e'lon qilinsa va ularda unicode-range boʻlmasa, ular
   bir-birini bekor qiladi — oxirgisi yutadi va qolgan subsetlar
   yoʻqoladi. Diapazonni qoʻlda yozish esa eskiradi. */
function unicodeRanges(slug, weight) {
  const css = readFileSync(join('node_modules', '@fontsource', slug, `${weight}.css`), 'utf8');
  const re = new RegExp(
    `url\\(\\./files/${slug}-([a-z-]+)-${weight}-normal\\.woff2\\)[\\s\\S]*?unicode-range:\\s*([^;]+);`,
    'g');
  const out = {};
  let m;
  while ((m = re.exec(css)) !== null) out[m[1]] = m[2].trim();
  return out;
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'fonts'), { recursive: true });

let fontCss = '';
let fontCount = 0;
for (const [family, slug, weights, subsets] of FONTS) {
  for (const w of weights) {
    const ranges = unicodeRanges(slug, w);
    for (const sub of subsets) {
      const file = `${slug}-${sub}-${w}-normal.woff2`;
      const range = ranges[sub];
      if (!range) {
        throw new Error(`[build] ${slug} ${w} uchun "${sub}" subsetining unicode-range'i topilmadi — ` +
                        `fontsource paketi oʻzgargan boʻlishi mumkin`);
      }
      copyFileSync(join('node_modules', '@fontsource', slug, 'files', file), join(OUT, 'fonts', file));
      fontCss += `@font-face{font-family:'${family}';font-style:normal;font-weight:${w};font-display:swap;` +
                 `src:url(./fonts/${file}) format('woff2');unicode-range:${range}}\n`;
      fontCount++;
    }
  }
}

/* ── 6. index.html ───────────────────────────────────────────────────── */
const read = p => readFileSync(p, 'utf8');
const runtime = read(join(SRC, 'runtime.js'));
const feedback = read(join(SRC, 'feedback.js'));
const notify = read(join(SRC, 'notify.js'));
/* progress.js dizayn mantiqidan OLDIN qo'yilishi shart: sinf o'z
   boshlang'ich holatini window.nzProgress'dan o'qiydi, ya'ni u shu
   paytda allaqachon mavjud bo'lishi kerak. */
const progress = read(join(SRC, 'progress.js'));
const i18n = read(join(SRC, 'i18n.js'));
const data = read(join(SRC, 'data.js'));

/* ── v1.1 modullari (ARXITEKTURA §10.5, CONTRACT §1) ─────────────────
   Paketlar parallel yoziladi, shuning uchun fayl hali yoʻq boʻlishi
   mumkin: build uni OʻTKAZIB YUBORADI, Main esa modulni `window.nzX`
   borligini tekshirib ishlatadi (yoʻq modulning funksiyasi yashirin).
   --strict da yoʻq fayl — xato (reliz nomzodida hammasi boʻlishi shart). */
const V11_MODULES = ['i18n-en.js', 'settings.js', 'catalog.js', 'icons.js', 'art.js',
                     'avatars.js', 'profile.js', 'wallet.js', 'badges.js', 'league.js'];
const absent = V11_MODULES.filter(f => !existsSync(join(SRC, f)));
if (STRICT && absent.length) {
  throw new Error(`[build] --strict: v1.1 modullari yoʻq: ${absent.map(f => 'src/' + f).join(', ')}`);
}
const optional = f => existsSync(join(SRC, f)) ? read(join(SRC, f)) : null;

/* ── IQ yadrosi va savol generatorlari ────────────────────────────────
   Tartib muhim: rng → index (reyestr) → score → session → gen/*.
   Generatorlar IQ.register() ni chaqiradi, ya'ni reyestr ulardan OLDIN
   bo'lishi kerak. Generatorlar alifbo tartibida — build natijasi har
   safar bir xil bo'lsin (diff ko'rinadigan va takrorlanadigan).

   gen/demo.js faqat ishlab chiqish paytidagi qolip — u hech qachon
   build'ga tushmaydi. */
const IQ_CORE = ['rng.js', 'index.js', 'score.js', 'session.js'];
const IQ_GENS = readdirSync(join(SRC, 'iq', 'gen'))
  /* IQ_DEMO=1 — faqat ishlab chiqishda: haqiqiy generatorlar hali yo'q
     bo'lsa ham ekranni ko'rish uchun. Oddiy build'da demo HECH QACHON
     bo'lmaydi. */
  .filter(f => f.endsWith('.js') && (f !== 'demo.js' || process.env.IQ_DEMO === '1'))
  .sort();
/* Og'zaki savollar — qo'lda yozilgan kontent (uz + ru + en). Generator
   emas, ma'lumot: content/verbal.json. U bundle'ga window.IQ_VERBAL
   sifatida joylanadi va gen/verbal.js shundan o'qiydi. Fayl bo'lmasa —
   og'zaki tur shunchaki ro'yxatdan o'tmaydi, ilova qolgan turlar bilan
   ishlaydi. */
const VERBAL_PATH = join('content', 'verbal.json');
const verbalJson = existsSync(VERBAL_PATH) ? JSON.parse(read(VERBAL_PATH)) : null;
const verbalSnippet = verbalJson ? `window.IQ_VERBAL = ${JSON.stringify(verbalJson)};\n` : '';
/* O'yinlar (src/games/) va sertifikat (src/cert/) — xuddi shu qoida:
   avval reyestr (games/index.js), keyin o'yinlar alifbo tartibida;
   demo faqat IQ_DEMO=1 bilan. Papka bo'lmasa — bo'sh. */
const listJs = (dir, first) => existsSync(dir)
  ? readdirSync(dir)
      .filter(f => f.endsWith('.js') && f !== first && (f !== 'demo.js' || process.env.IQ_DEMO === '1'))
      .sort().map(f => join(dir, f))
  : [];
const GAMES_DIR = join(SRC, 'games'), CERT_DIR = join(SRC, 'cert');
const GAME_FILES = existsSync(join(GAMES_DIR, 'index.js'))
  ? [join(GAMES_DIR, 'index.js')].concat(listJs(GAMES_DIR, 'index.js')) : [];
const CERT_FILES = listJs(CERT_DIR, null);

const IQ_PARTS = IQ_CORE.map(f => join(SRC, 'iq', f))
  .concat(IQ_GENS.map(f => join(SRC, 'iq', 'gen', f)))
  .concat(GAME_FILES, CERT_FILES)
  .map(p => [p, read(p)]);
const iqBundle = verbalSnippet + IQ_PARTS
  .map(([p, code]) => `/* ── ${p} ── */\n` + code)
  .join('\n');

/* ── EN darvozasi — «hammasi yoki hech narsa» (ARXITEKTURA §8.4,
   CONTRACT §15) ───────────────────────────────────────────────────────
   Ingliz tili til tanlovida faqat 4 shartning HAMMASI bajarilganda
   chiqadi. Bittasi bajarilmasa — build yiqilmaydi, English shunchaki
   taklif qilinmaydi va sabablar ogohlantirish sifatida yoziladi. Yarim
   inglizcha ilova (tarjimasiz tugmalar, oʻzbekcha savollar) foydalanuvchiga
   yetib bormasligi kerak. */
const nonEmpty = s => typeof s === 'string' && s.trim() !== '';

/* Brauzer taqlidi — faqat maʼlumot va reyestr fayllari uchun (DOM yoʻq). */
function sandbox() {
  const store = new Map();
  const ctx = {
    console,
    setTimeout, clearTimeout,
    navigator: { language: 'uz' },
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: k => { store.delete(k); },
    },
  };
  ctx.window = ctx;
  return vm.createContext(ctx);
}

const siteCfg = JSON.parse(read('site.config.json'));

async function enGate() {
  const why = [];

  /* 1. UI lugʻati: tools/i18n-extract.mjs boʻyicha nzEn da yetishmayotgan
        kalit 0 ta. */
  const enFile = join(SRC, 'i18n-en.js');
  let nzEn = null;
  if (!existsSync(enFile)) why.push('src/i18n-en.js yoʻq');
  else {
    try {
      const ctx = sandbox();
      vm.runInContext(read(enFile), ctx, { filename: enFile, timeout: 10000 });
      nzEn = ctx.nzEn;
    } catch (e) { why.push(`src/i18n-en.js yuklanmadi: ${e.message}`); }
    if (!why.length && (!nzEn || typeof nzEn !== 'object')) why.push('src/i18n-en.js window.nzEn ni bermadi');
  }
  if (nzEn && typeof nzEn === 'object') {
    const ex = join('tools', 'i18n-extract.mjs');
    if (!existsSync(ex)) why.push('tools/i18n-extract.mjs yoʻq');
    else {
      try {
        const mod = await import(pathToFileURL(resolve(ex)).href);
        const api = Object.assign({}, mod.default || {}, mod);
        const has = k => {
          if (!Object.prototype.hasOwnProperty.call(nzEn, k)) return false;
          const v = nzEn[k];
          return nonEmpty(v) || (!!v && typeof v === 'object' && nonEmpty(v.one) && nonEmpty(v.other));
        };
        /* Afzal API — coverage({ root, langs }) (WP5): missing.en — lugʻatda
           yoʻq satrlar, triplets.missingEn — {uz, ru, en} obyektlarida
           (katalog, nishonlar, avatarlar) en yoʻq joylar. Zaxira:
           missing(dict, 'en') yoki extract() (satrlar roʻyxati/xaritasi). */
        let miss = null;
        if (typeof api.coverage === 'function') {
          const cov = await api.coverage({ root: resolve('.'), langs: ['en'] });
          const tri = (cov.triplets && cov.triplets.missingEn) || [];
          miss = ((cov.missing && cov.missing.en) || [])
            .concat(tri.map(t => `${t.file || '?'}:${t.line || '?'} ${t.uz || ''} (en yoʻq)`));
        } else if (typeof api.missing === 'function') miss = await api.missing(nzEn, 'en');
        else if (typeof api.extract === 'function') {
          const ex = await api.extract({ root: resolve('.') });
          const keys = ex instanceof Map ? [...ex.keys()]
            : ex && ex.strings instanceof Map ? [...ex.strings.keys()]
            : Array.isArray(ex) ? ex.map(k => (typeof k === 'string' ? k : k && k.key)) : [];
          miss = keys.filter(k => k && !has(k));
        } else why.push('tools/i18n-extract.mjs da coverage(), missing() yoki extract() yoʻq');
        if (miss && !Array.isArray(miss)) why.push('i18n-extract missing() massiv qaytarmadi');
        else if (miss && miss.length) {
          why.push(`nzEn da ${miss.length} ta kalit yetishmaydi (masalan: ${JSON.stringify(miss[0])})`);
        }
      } catch (e) { why.push(`tools/i18n-extract.mjs ishlamadi: ${e.message}`); }
    }
  }

  /* 2. Bundleʼdagi HAR generator va HAR oʻyin langs da 'en' ni eʼlon
        qilgan. Bundle node:vm da fayl-fayl yuklanadi (qaysi biri
        yiqilganini bilish uchun). Eʼlon bilan cheklanmay, har tur/daraja
        uchun bittadan savol va har oʻyinning boshlangʻich koʻrinishi
        tekshiriladi — validateItem/validateView en ni talab qiladi. */
  const ctx = sandbox();
  if (verbalSnippet) vm.runInContext(verbalSnippet, ctx, { filename: VERBAL_PATH });
  for (const [p, code] of IQ_PARTS) {
    try { vm.runInContext(code, ctx, { filename: p, timeout: 10000 }); }
    catch (e) { why.push(`${p} yuklanmadi: ${e.message}`); }
  }
  const IQ = ctx.IQ;
  if (!IQ || typeof IQ.types !== 'function') why.push('IQ reyestri yuklanmadi');
  else {
    const langsOf = t => (IQ.langsOf ? IQ.langsOf(t) : ((IQ.generator(t) || {}).langs || ['uz', 'ru']));
    const types = IQ.types();
    if (!types.length) why.push('bundleʼda savol generatori yoʻq');
    for (const t of types) {
      if (langsOf(t).indexOf('en') === -1) { why.push(`generator "${t}": langs da 'en' yoʻq`); continue; }
      for (let lv = 1; lv <= 10; lv++) {
        let err = null;
        for (let k = 0; k < 20; k++) {
          try { IQ.makeItem(t, (0x9E3779B9 ^ (lv * 7919 + k * 104729)) >>> 0, lv); err = null; break; }
          catch (e) { err = e; }
        }
        if (err) { why.push(`generator "${t}" ${lv}-daraja: ${err.message}`); break; }
      }
    }
    const G = IQ.games;
    const games = G && typeof G.list === 'function' ? G.list() : [];
    if (!games.length) why.push('bundleʼda oʻyin yoʻq');
    for (const g of games) {
      const langs = G.langsOf ? G.langsOf(g.id) : (g.langs || ['uz', 'ru']);
      if (langs.indexOf('en') === -1) { why.push(`oʻyin "${g.id}": langs da 'en' yoʻq`); continue; }
      for (const lv of [1, 5, 10]) {
        try {
          const e = G.validateView(G.create(g.id, 20260925 + lv, lv).view(), g.id);
          if (e.length) { why.push(`oʻyin "${g.id}" ${lv}-daraja: ${e.join('; ')}`); break; }
        } catch (e) { why.push(`oʻyin "${g.id}" ${lv}-daraja: ${e.message}`); break; }
      }
    }
  }

  /* 3. content/verbal.json dagi HAR yozuvda en va explain.en. Qisman
        en taqiqlangan: ID qaysi yozuvga tushishi roʻyxatga bogʻliq. */
  if (verbalJson) {
    const items = Array.isArray(verbalJson.items) ? verbalJson.items : [];
    const ok = it => {
      const en = it && it.en, uz = (it && it.uz) || {};
      return !!en && nonEmpty(en.prompt)
        && (!nonEmpty(uz.stimulus) || nonEmpty(en.stimulus))
        && Array.isArray(en.options) && Array.isArray(uz.options)
        && en.options.length === uz.options.length && en.options.every(nonEmpty)
        && !!it.explain && nonEmpty(it.explain.en);
    };
    const bad = items.filter(it => !ok(it));
    if (!items.length) why.push('content/verbal.json da yozuv yoʻq');
    else if (bad.length) {
      why.push(`content/verbal.json: ${bad.length}/${items.length} yozuvda en yoki explain.en yoʻq ` +
               `(masalan ${bad[0] && bad[0].key})`);
    }
  }

  /* 4. Sayt: /en/shartlar/ va /en/maxfiylik/. Rad qilish matni faqat
        Shartlarda yashaydi — ingliz tili yoqilishidan OLDIN majburiy. */
  const pagesFile = join(SRC, 'site', 'pages.mjs');
  if (!existsSync(pagesFile)) why.push('src/site/pages.mjs yoʻq');
  else {
    try {
      const mod = await import(pathToFileURL(resolve(pagesFile)).href);
      if (typeof mod.legalReady === 'function') {
        if (!(await mod.legalReady(siteCfg, 'en'))) why.push('sayt: legalReady(cfg, \'en\') — /en/ huquqiy sahifalar tayyor emas');
      } else {
        const fn = mod.allPages || mod.pages;
        const list = typeof fn === 'function' ? await fn(siteCfg) : [];
        const clean = x => String(x).replace(/^\/+|\/+$/g, '').replace(/\/index\.html$/, '');
        const paths = new Set();
        for (const pg of list || []) {
          if (!pg) continue;
          if (pg.path) paths.add(clean(pg.path));
          if (pg.slug) {
            const sl = clean(pg.slug);
            paths.add(sl);
            if (pg.lang && pg.lang !== 'uz' && sl.indexOf(pg.lang + '/') !== 0) paths.add(pg.lang + '/' + sl);
          }
        }
        for (const need of ['en/shartlar', 'en/maxfiylik']) {
          if (!paths.has(need)) why.push(`sayt: /${need}/ sahifasi yoʻq`);
        }
      }
    } catch (e) { why.push(`src/site/pages.mjs oʻqilmadi: ${e.message}`); }
  }

  return why;
}

const enWhy = await enGate();
const EN_ON = FORCE_EN || enWhy.length === 0;
const LANGS = ['uz', 'uz-cyrl', 'ru'].concat(EN_ON ? ['en'] : []);

/* Supabase sozlamalari (URL va publishable kalit) bundle'ga joylanadi.
   Ular ommaviy: publishable kalit ataylab klient uchun va uni mobil
   ilovadan yashirib boʻlmaydi. Maʼlumotni RLS himoya qiladi —
   supabase/README.md §2. */
const supaCfg = JSON.parse(read(join('supabase', 'config.json')));
/* Mobil ilova (APK) OFFLINE: unga Supabase sozlamasi umuman joylanmaydi —
   config.json toʻldirilsa ham APK jimgina tarmoqqa chiqa olmaydi (S3).
   Sinxronizatsiya qoʻshilganda bu qaror ongli ravishda oʻzgartiriladi. */
const supaSnippet = CFG.app && !CFG.landing
  ? 'window.nzSupabase = null;'
  : `window.nzSupabase = ${JSON.stringify({ url: supaCfg.url, publishableKey: supaCfg.publishableKey })};`;
if (CFG.app && !CFG.landing && supaCfg.url) {
  console.warn('[build] supabase/config.json da url bor, lekin mobil build OFFLINE — nzSupabase = null');
}

/* Saytga tegishli sozlama. Faqat OMMAVIY qiymatlar (bot nomi, domen) —
   ular baribir sahifa manbasida ko'rinadi. Aloqa manzili bu yerga
   qo'yilmaydi: u faqat matn sahifalarida kerak va spam yig'uvchilarga
   ilova bundle'ida taqdim etishning hojati yo'q. Ilovaga faqat u
   TAYYORMI-yoʻqmi kerak (contactReady — Sozlamalardagi «Aloqa» qatori). */
const VERSION = JSON.parse(read('version.json'));
/* startView — ilova qaysi ekrandan boshlanadi.

   Bu sayt uchun MUHIM: saytning bosh sahifasi (/) landing bo'lishi
   kerak, ilova emas. Ilgari sayt build'i ham ilovadan boshlanardi va
   landing'ga faqat ilova ichidagi "Web sayt" tugmasi orqali kirilardi —
   ya'ni saytga kirgan odam marketing sahifasini umuman ko'rmasdi va
   qidiruv tizimi ham uni ko'rmasdi.

   Admin build'da esa "admin" — foydalanuvchi ilovasi kesilgani uchun
   "app" ko'rinishi bo'sh ekran berardi.

   Ilgari buni logic'dagi `view: "app",` satrini qidirib almashtirish
   qilardi. Bu mo'rt edi: dizayndagi bitta satr o'zgarishi build'ni
   yiqitardi (aynan shunday bo'ldi ham). Endi boshlang'ich ko'rinish
   sozlama orqali uzatiladi va matn almashtirish kerak emas. */
/* siteUrl — huquqiy sahifalar (maxfiylik, shartlar, aloqa) manzili.
   Saytda ular shu domenning o'zida, ya'ni nisbiy havola yetadi
   ("maxfiylik/"); APK ichida esa sahifalar yo'q — to'liq domen.
   version — Sozlamalar ostidagi «IQuest 1.1.0» (version.json).
   contactReady / playUrl — «Aloqa» va «Ilovani baholash» qatorlari
   qiymat tayyor boʻlmaguncha yashiriladi (oʻlik havola yoʻq).
   langs — taklif qilinadigan tillar: 'en' faqat EN darvozasi ochiq
   boʻlsa (src/i18n.js buni dangasa oʻqiydi). */
const NZ_SITE = {
  telegramBot: siteCfg.telegramBot || '',
  siteUrl: CFG.landing ? '' : 'https://' + (siteCfg.domain || 'iquest.uz') + '/',
  startView: CFG.admin ? 'admin' : CFG.landing ? 'landing' : 'app',
  version: String(VERSION.versionName || ''),
  contactReady: !!siteCfg.contactEmail && !/PLACEHOLDER/.test(siteCfg.contactEmail),
  playUrl: siteCfg.playUrl || '',
  langs: LANGS,
};
const siteSnippet = `window.nzSite = ${JSON.stringify(NZ_SITE)};`;
const shellCss = read(join(SRC, CFG.shell));
const bootstrap = read(join(SRC, 'bootstrap.js'));

/* Admin qatlami FAQAT admin build'iga kiradi. Foydalanuvchi ilovasi va
   sayt uni umuman ko'rmaydi — Faza 0 dagi ajratishning davomi. */
const adminScripts = CFG.admin
  ? `<script>\n${read(join(SRC, 'admin-api.js'))}\n</script>\n` +
    `<script>\n${read(join(SRC, 'admin-boot.js'))}\n</script>`
  : '';

/* Admin panel — klaviatura bilan ishlanadigan, matn nusxalanadigan ish
   quroli: telefon ilovasining "zoom yo'q" cheklovi unga to'g'ri kelmaydi. */
const viewport = CFG.admin
  ? 'width=device-width,initial-scale=1'
  : 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover';

const title = CFG.admin ? 'IQuest — admin' : 'IQuest';

/* Content-Security-Policy (S2). Hamma skript va uslub ichki (inline),
   rasmlar data: URI, shriftlar yonidagi ./fonts/ dan. Tarmoq: mobilda
   HECH QAYERGA; saytda faqat Supabase (url berilgan boʻlsa). Admin
   panel CSP siz (ish quroli, alohida domen). */
const supaOrigin = (() => { try { return supaCfg.url ? new URL(supaCfg.url).origin : ''; } catch (e) { return ''; } })();
const CSP = CFG.admin ? '' : [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  'img-src data:',
  "font-src 'self'",
  'connect-src ' + (CFG.landing && supaOrigin ? supaOrigin : "'none'"),
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');
const cspMeta = CSP ? `<meta http-equiv="Content-Security-Policy" content="${CSP}">\n` : '';

/* Skriptlar tartibi — ARXITEKTURA §10.5. Har biri alohida <script>:
   bitta moduldagi yuklanish xatosi qolganlarini toʻxtatmaydi. Boshidagi
   belgi (/* ── src/… ── *\/) tartibni build testida va devtoolsʼda
   koʻrish uchun. null — fayl hali yoʻq (oʻtkazib yuboriladi). */
const SCRIPTS = [
  ['src/i18n-ru.js',  read(join(SRC, 'i18n-ru.js'))],
  ['src/i18n-en.js',  optional('i18n-en.js')],
  /* Darvoza i18n.js DAN OLDIN: init() dagi detect() qurilma tili 'en'
     ni koʻrsin (nzSite keyinroq keladi, G3). */
  ['nzLangs',         `window.nzLangs = ${JSON.stringify(LANGS)};`],
  ['src/i18n.js',     i18n],
  ['src/runtime.js',  runtime],
  ['src/feedback.js', feedback],
  ['src/notify.js',   notify],
  ['nzSite',          siteSnippet],
  ['src/settings.js', optional('settings.js')],
  ['src/progress.js', progress],
  ['src/catalog.js',  optional('catalog.js')],
  ['src/icons.js',    optional('icons.js')],
  ['src/art.js',      optional('art.js')],
  ['src/avatars.js',  optional('avatars.js')],
  ['src/profile.js',  optional('profile.js')],
  ['src/wallet.js',   optional('wallet.js')],
  ['src/badges.js',   optional('badges.js')],
  ['src/league.js',   optional('league.js')],
  ['IQ bundle',       iqBundle],
  ['Main (logic)',    logic],
  ['src/data.js',     supaSnippet + '\n' + data],
  ['src/bootstrap.js', bootstrap],
].filter(([, code]) => code !== null);

const scriptsHtml = SCRIPTS
  .map(([name, code]) => `<script>\n/* ── ${name} ── */\n${code}\n</script>`)
  .join('\n');

const html = `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="utf-8">
${cspMeta}<meta name="viewport" content="${viewport}">
<meta name="theme-color" content="#F5F3FF">
<meta name="color-scheme" content="light dark">
<title>${title}</title>
<style>
${fontCss}</style>
<style>
${styleCss}</style>
<style>
${shellCss}</style>
</head>
<body>
<div id="nz-root"></div>
<template id="nz-tpl">
${markup}
</template>
${scriptsHtml}
${adminScripts}
</body>
</html>
`;

/* ── 7. Nazorat: kesish paytida hech narsa tushib qolmadimi ──────────── */
const NEED = ['.nz-card-reyting{', '.nz-card-hafta{',
              'class Component extends DCLogic', 'renderVals()'];
if (CFG.app) NEED.push('nz-nav', 'nz-frame', 'nz-screens-quiz');
NEED.push('IQ.register = register', 'IQ.session =', 'IQ.games =');
if (CFG.admin) NEED.push('valsManage', 'Admin panel');
/* Landing'ning MATNI emas, tuzilmasi tekshiriladi: matn mahsulot bilan
   o'zgaradi (bu loyiha Nazariy'dan olingan va u yerda sarlavha matni
   tekshirilardi), bosh blok esa har doim bo'lishi kerak. */
if (CFG.landing) NEED.push('nz-landing-hero', 'nz-landing-h1');
NEED.push('window.nzSite = ', 'IQ.langsOf = langsOf');

/* v1.1 ekran modullari (ARXITEKTURA §10.7, CONTRACT §16). Main ularni
   bosqichma-bosqich oladi (WP7 U1–U5), shuning uchun oddiy build'da
   marker faqat MANBADA bor bo'lsa talab qilinadi — kesish uni tushirib
   qo'ymasligi uchun. --strict da manbada ham bo'lishi shart. Admin
   build'da foydalanuvchi ekranlari yo'q. */
const V11_NEED = ['valsSettings', 'valsShop', 'valsBadges', 'valsProfileEdit', 'valsOnboard'];
if (CFG.app) {
  const lacking = V11_NEED.filter(name => src.indexOf(name) === -1);
  if (STRICT && lacking.length) {
    throw new Error(`[build] --strict: src/Main.dc.html da yo'q: ${lacking.join(', ')} (CONTRACT §16)`);
  }
  for (const name of V11_NEED) if (lacking.indexOf(name) === -1) NEED.push(name);
}

/* Pul qatlami (Nazariy'ning taqlid to'lov oqimi) HECH QAYSI build'da
   bo'lmasligi kerak — na kodda, na markup'da. Manbadan olib tashlangan;
   bu tekshiruv uning jimgina qaytib kelishiga yo'l qo'ymaydi. */
{
  const MONEY_NAMES = ['openPro', 'openPay', 'openRedeem', 'payStepMethod',
                       'proFinePrint', 'valsMoney', 'plansFrom', 'confirmPay',
                       'PRO_BENEFITS', 'PAY_METHODS'];
  for (const bad of MONEY_NAMES) {
    if (new RegExp(`\\b${bad}\\b`).test(logicCode) || markup.indexOf(bad) !== -1) {
      throw new Error(`[build] "${bad}" ${TARGET} build'ida topildi — to'lov qatlami ` +
                      `IQuest'da yo'q (CONTRACT §6.6)`);
    }
  }
}

/* Ijtimoiy qatlam (SOCIAL) — backend (v2) bo'lmaguncha HECH QAYSI
   build'da yo'q (CONTRACT §16, ARXITEKTURA §0.1-6, §11.3): chat, guruh,
   do'stlar, inbox, «tez kunda», o'chiq tugma. MONEY_NAMES bilan bir xil
   tartib: nomlar — yalang'och kodda, yozuvlar — markup'da va kod
   SATRLARIDA (izohlarda «v2 da Do'stlar tabi» kabi reja zararsiz). */
if (!SOCIAL_ON) {
  const SOCIAL_NAMES = ['valsFriends', 'valsChat', 'valsGroups', 'valsInbox',
                        'REPORT_KINDS', 'MEMBER_KINDS'];
  for (const bad of SOCIAL_NAMES) {
    if (new RegExp(`\\b${bad}\\b`).test(logicCode) || markup.indexOf(bad) !== -1) {
      throw new Error(`[build] "${bad}" ${TARGET} build'ida topildi — ijtimoiy qatlam ` +
                      `faqat backend bilan (SOCIAL_ON=false, CONTRACT §16)`);
    }
  }
  /* Yozuvlar faqat foydalanuvchi ilovasi build'larida tekshiriladi: admin
     panelda eski savol banki matnlari («… qaysi guruhga kiradi?») bor va
     u foydalanuvchiga ko'rinmaydi. */
  const SOCIAL_TEXT = [/do[ʻ'‘’`]st/i, /\bsuhbat/i, /\bchat\b/i, /\bguruh(lar)?\b/i,
                       /tez kunda/i, /coming soon/i];
  const logicText = codeOnly(logic, true);
  for (const re of CFG.app ? SOCIAL_TEXT : []) {
    const m = re.exec(markup) || re.exec(logicText);
    if (m) {
      throw new Error(`[build] ijtimoiy/«tez kunda» yozuvi "${m[0]}" ${TARGET} build'ida topildi — ` +
                      `serverni talab qiladigan narsa ishlamaguncha ko'rinmaydi (CONTRACT §16)`);
    }
  }
}

/* Haydovchilik ilovasidan qolgan suratlar (reyting-bg.jpg, hafta-bg.jpg)
   endi ishlatilmaydi — fon sof CSS. Ular bundle'ga qaytmasin. */
if (/url\(\.\/(reyting|hafta)-bg\.jpg\)/.test(html)) {
  throw new Error('[build] eski surat (reyting-bg.jpg / hafta-bg.jpg) hali ishlatilmoqda');
}

for (const need of NEED) {
  if (html.indexOf(need) === -1) throw new Error(`[build] yig'ilgan faylda "${need}" yo'q — kesish noto'g'ri`);
}

/* Admin qatlami mobil va sayt build'iga TUSHMASLIGI kerak. Bu tekshiruv
   xavfsizlik chegarasi: yiqilsa, kesish ishlamagan. */
if (!CFG.admin) {
  // Kod nomlari — izoh va satrlardan tozalangan kodda qaraladi. Manba
  // faylning izohlarida bu nomlar sanab o'tilgan; izoh kod emas, lekin
  // ijro etiladigan bitta qator ham qolmasligi kerak.
  const FORBIDDEN_CODE = ['valsManage', 'valsAnalytics', 'logAction', 'parseBulk', 'toCsv',
                          'ADMIN_USERS', 'ADMIN_QUESTIONS', 'AUDIT_SEED', 'ROLES', 'REASONS',
                          // Admin API qatlami ham faqat admin build'ida
                          'nzAdmin', 'audit_log'];
  for (const bad of FORBIDDEN_CODE) {
    if (new RegExp(`\\b${bad}\\b`).test(logicCode)) {
      throw new Error(`[build] XAVFSIZLIK: "${bad}" ${TARGET} build'ining KODIDA qoldi — ` +
                      `admin qatlami kesilmagan`);
    }
  }
  /* Admin ekranlarining matni MARKUP'da bo'lmasligi kerak.
     Nima uchun butun faylda emas, aynan markup'da: JS izohlarida bu
     iboralar uchrashi mumkin va bu zararsiz ("admin panel o'zbekcha
     qoladi" degan izoh kabi). Xavf esa markup'da — chizilib qoladigan
     joyda. Ijro etiladigan kod yuqorida alohida tekshirilgan. */
  const FORBIDDEN_TEXT = ['Admin panel', 'adminSubtitle', 'Ommaviy import', 'Javob kaliti'];
  for (const bad of FORBIDDEN_TEXT) {
    if (markup.indexOf(bad) !== -1) {
      throw new Error(`[build] XAVFSIZLIK: "${bad}" matni ${TARGET} build'ining ` +
                      `MARKUP'ida qoldi — admin markup'i kesilmagan`);
    }
  }
}

writeFileSync(join(OUT, 'index.html'), html);


const kb = n => (n / 1024).toFixed(0) + ' KB';
console.log(`maqsad: ${TARGET} → ${OUT}/`);
console.log(`${OUT}/index.html — ${kb(html.length)}`);
console.log(`${OUT}/fonts     — ${fontCount} ta woff2`);
if (removed.length) console.log(`kesildi        — admin qatlami (${removed.length} ta nom)`);
if (absent.length) console.log(`oʻtkazildi     — hali yoʻq v1.1 modullari: ${absent.join(', ')}`);
console.log(`versiya        — ${NZ_SITE.version} (versionCode ${VERSION.versionCode})`);
console.log(`tillar         — ${LANGS.join(', ')}`);
if (FORCE_EN) console.log('⚠ EN darvozasi --lang-en bilan MAJBURAN ochildi — faqat ishlab chiqish uchun');
else if (enWhy.length) {
  console.log(`⚠ EN darvozasi yopiq (${enWhy.length} ta sabab) — English taklif qilinmaydi:`);
  for (const w of enWhy.slice(0, 12)) console.log('  · ' + w);
  if (enWhy.length > 12) console.log(`  · … yana ${enWhy.length - 12} ta`);
}
