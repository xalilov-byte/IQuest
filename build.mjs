/* ─────────────────────────────────────────────────────────────────────────
   src/Main.dc.html (dizayn manbasi)  →  uchta mustaqil ilova

   Ishga tushirish:
     node build.mjs                    → www/        (Android APK ichiga)
     node build.mjs --target=web       → dist/web/   (sayt)
     node build.mjs --target=admin     → dist/admin/ (admin panel)

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
import { join } from 'path';

const SRC = 'src';

/* ── 0. Maqsad (target) ──────────────────────────────────────────────── */
/* mobile — foydalanuvchi ilovasi (APK). Admin va landing kesiladi.
   web    — sayt: foydalanuvchi ilovasi + landing. Admin kesiladi.
   admin  — faqat admin panel. Foydalanuvchi ilovasi va landing kesiladi. */
/* money — Pro obunasi va to'lov oqimi.

   NIMA UCHUN MOBIL BUILD'DA O'CHIRILGAN: dizayndagi to'lov oqimi
   TAQLID. "Tasdiqlash" bosilganda hech qanday to'lov bo'lmaydi, ilova
   shunchaki pro.active = true qilib qo'yadi. Bu Google Play uchun ikki
   sababdan yaramaydi:

     1. Play'da raqamli mahsulot sotiladigan bo'lsa, to'lov Play
        Billing orqali o'tishi SHART (Payments policy).
     2. Tugma bosiladi, lekin hech narsa qilmaydi — bu "broken
        functionality" va tekshiruvdan o'tmaydi. Tekshiruvchi "Payme"
        ni tanlab, tasdiqlab, Pro'ni bepul olgan bo'lardi.

   Shuning uchun v1 da pul qatlami MOBIL BUILD'GA KIRMAYDI. Dizayn
   manbasida va sayt build'ida u o'z o'rnida qoladi — ish davom etadi
   (REJA.md Faza 7), lekin do'konga tugallanmagan to'lov chiqmaydi. */
const TARGETS = {
  mobile: { out: 'www',        app: true,  admin: false, landing: false, money: false, shell: 'shell.css' },
  web:    { out: 'dist/web',   app: true,  admin: false, landing: true,  money: true,  shell: 'shell.css' },
  admin:  { out: 'dist/admin', app: false, admin: true,  landing: false, money: true,  shell: 'shell-admin.css' },
};

const targetArg = process.argv.slice(2).find(a => a.startsWith('--target='));
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
   emas, lekin oddiy qidiruv ularni topib, tekshiruvni bekorga yiqitadi. */
function codeOnly(code) {
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
      if (c === '\\') { out += '  '; i++; }
      else if (c === quote) { out += c; st = 'code'; }
      else out += blank(c);
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

/* ── 3. Maqsadga kerak bo'lmagan qatlamlarni kesish ──────────────────── */

/* Markup: uchta mustaqil ko'rinish bo'limi bor. */
if (!CFG.admin)   markup = cutSection(markup, 'isAdmin');
if (!CFG.landing) markup = cutSection(markup, 'isLanding');

/* Pul qatlami: Pro ekrani, to'lov oynasi va profildagi kirish qatori.
   Markup kesiladi — mantiq (valsMoney) qoladi, chunki uning ichida
   liga va reyting qiymatlari ham bor. Kesilgandan keyin pastdagi
   tekshiruv kirish nuqtasi qolmaganini tasdiqlaydi, ya'ni mantiq
   ishlatilmaydigan holga tushadi. */
if (!CFG.money) {
  markup = cutSection(markup, 'proOn');
  markup = cutSection(markup, 'payOn');

  // Profildagi "Pro" qatori — Pro ekraniga yagona kirish nuqtasi.
  const proRow = markup.match(
    /\n\s*<button onClick="\{\{ openPro \}\}"[^]*?<\/button>/);
  if (!proRow) {
    throw new Error('[build] profildagi Pro qatori topilmadi — manba o\'zgargan');
  }
  markup = markup.replace(proRow[0], '');
}
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
   valsManage / logAction ichida ishlatiladi — tekshirilgan. */
const ADMIN_CONSTS = ['ROLES', 'REASONS', 'ADMIN_USERS', 'ADMIN_QUESTIONS', 'AUDIT_SEED',
                      'CSV_COLUMNS', 'BULK_SAMPLES', 'DAU_90', 'FUNNEL', 'COHORTS',
                      'ITEMS', 'REV', 'METHOD_SHARE'];
const ADMIN_FNS = ['nowIso', 'shortTime', 'maskPhone', 'parseBulk', 'toCsv'];
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

  for (const name of ADMIN_METHODS) { logic = cutFn(logic, name, 'method'); removed.push(name); }
  for (const name of ADMIN_FNS)     { logic = cutFn(logic, name, 'function'); removed.push(name); }
  for (const name of ADMIN_CONSTS)  { logic = cutConst(logic, name); removed.push(name); }
}

/* Pul qatlamining MANTIG'I ham kesiladi, faqat markup emas.

   Ilgari faqat markup kesilardi va valsMoney qolardi — sabab: liga,
   reyting va profil qiymatlari o'sha funksiyaning ichida edi. Natijada
   build "kesildi — pul qatlami" deb chop etardi, lekin www/index.html
   da openPro, openPay, openRedeem va payStepMethod ijro etiladigan
   kodda turardi. Markup'da kirish nuqtasi yo'q edi, ya'ni foydalanuvchi
   uchun zarar yo'q — LEKIN TASDIQ YOLG'ON edi, va do'kon tekshiruvi
   APK ichidan to'lov nomlarini topishi mumkin.

   Manbadagi valsMoney endi FAQAT pul qiymatlarini saqlaydi (qolgani
   valsProfile'ga ajratilgan), shuning uchun uni butunlay kesish
   mumkin. */
if (!CFG.money) {
  logic = cutLine(logic, 'this.valsMoney(s),', 'renderVals → valsMoney chaqiruvi');
  logic = cutFn(logic, 'valsMoney', 'method');   removed.push('valsMoney');
  logic = cutFn(logic, 'plansFrom', 'function'); removed.push('plansFrom');
  logic = cutConst(logic, 'PRO_BENEFITS');       removed.push('PRO_BENEFITS');
  logic = cutConst(logic, 'PAY_METHODS');        removed.push('PAY_METHODS');
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

  ['test ekrani maydoni',
   '<sc-if value="{{ quizOn }}" hint-placeholder-val="{{ false }}">\n      <div style="flex:1;display:flex;flex-direction:column;background:var(--background)">',
   '<sc-if value="{{ quizOn }}" hint-placeholder-val="{{ false }}">\n      <div class="nz-screens-quiz" style="flex:1;display:flex;flex-direction:column;background:var(--background)">'],


  ['pastki tab paneli',
   '<div style="position:absolute;left:0;right:0;bottom:0;height:68px;background:var(--surface);border-top:1px solid var(--hairline);display:grid;grid-template-columns:repeat(4,1fr);align-items:center">',
   '<div class="nz-nav" style="position:absolute;left:0;right:0;bottom:0;height:68px;background:var(--surface);border-top:1px solid var(--hairline);display:grid;grid-template-columns:repeat(4,1fr);align-items:center">'],
];

/* Pro ekranidagi almashtirish faqat pul qatlami BOR build'da kerak —
   aks holda u kesilgan bo'limni qidirib, build'ni yiqitadi. */
if (CFG.money) {
  T.push(
  ['Pro ekrani maydoni',
   '<sc-if value="{{ proOn }}" hint-placeholder-val="{{ false }}">\n      <div style="flex:1;display:flex;flex-direction:column;background:var(--background)">',
   '<sc-if value="{{ proOn }}" hint-placeholder-val="{{ false }}">\n      <div class="nz-screens-quiz" style="flex:1;display:flex;flex-direction:column;background:var(--background)">']
  );
}

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
const runtime = readFileSync(join(SRC, 'runtime.js'), 'utf8');
const feedback = readFileSync(join(SRC, 'feedback.js'), 'utf8');
const notify = readFileSync(join(SRC, 'notify.js'), 'utf8');
/* progress.js dizayn mantiqidan OLDIN qo'yilishi shart: sinf o'z
   boshlang'ich holatini window.nzProgress'dan o'qiydi, ya'ni u shu
   paytda allaqachon mavjud bo'lishi kerak. */
const progress = readFileSync(join(SRC, 'progress.js'), 'utf8');
const i18n = readFileSync(join(SRC, 'i18n.js'), 'utf8');
const data = readFileSync(join(SRC, 'data.js'), 'utf8');

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
/* Og'zaki savollar — qo'lda yozilgan kontent (uz + ru). Generator emas,
   ma'lumot: content/verbal.json. U bundle'ga window.IQ_VERBAL sifatida
   joylanadi va gen/verbal.js shundan o'qiydi. Fayl bo'lmasa — og'zaki
   tur shunchaki ro'yxatdan o'tmaydi, ilova qolgan turlar bilan ishlaydi. */
const VERBAL_PATH = join('content', 'verbal.json');
const verbalSnippet = existsSync(VERBAL_PATH)
  ? `window.IQ_VERBAL = ${JSON.stringify(JSON.parse(readFileSync(VERBAL_PATH, 'utf8')))};\n`
  : '';
const iqBundle = verbalSnippet + IQ_CORE.map(f => join(SRC, 'iq', f))
  .concat(IQ_GENS.map(f => join(SRC, 'iq', 'gen', f)))
  .map(p => `/* ── ${p} ── */\n` + readFileSync(p, 'utf8'))
  .join('\n');

/* Supabase sozlamalari (URL va publishable kalit) bundle'ga joylanadi.
   Ular ommaviy: publishable kalit ataylab klient uchun va uni mobil
   ilovadan yashirib boʻlmaydi. Maʼlumotni RLS himoya qiladi —
   supabase/README.md §2. */
const supaCfg = JSON.parse(readFileSync(join('supabase', 'config.json'), 'utf8'));
const supaSnippet = `window.nzSupabase = ${JSON.stringify({
  url: supaCfg.url, publishableKey: supaCfg.publishableKey })};`;

/* Saytga tegishli sozlama. Faqat OMMAVIY qiymatlar (bot nomi, domen) —
   ular baribir sahifa manbasida ko'rinadi. Aloqa manzili bu yerga
   qo'yilmaydi: u faqat matn sahifalarida kerak va spam yig'uvchilarga
   ilova bundle'ida taqdim etishning hojati yo'q. */
const siteCfg = JSON.parse(readFileSync('site.config.json', 'utf8'));
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
const siteSnippet = `window.nzSite = ${JSON.stringify({
  telegramBot: siteCfg.telegramBot || '',
  startView: CFG.admin ? 'admin' : CFG.landing ? 'landing' : 'app' })};`;
const ruDict = readFileSync(join(SRC, 'i18n-ru.js'), 'utf8');
const shellCss = readFileSync(join(SRC, CFG.shell), 'utf8');
const bootstrap = readFileSync(join(SRC, 'bootstrap.js'), 'utf8');

/* Admin qatlami FAQAT admin build'iga kiradi. Foydalanuvchi ilovasi va
   sayt uni umuman ko'rmaydi — Faza 0 dagi ajratishning davomi. */
const adminScripts = CFG.admin
  ? `<script>\n${readFileSync(join(SRC, 'admin-api.js'), 'utf8')}\n</script>\n` +
    `<script>\n${readFileSync(join(SRC, 'admin-boot.js'), 'utf8')}\n</script>`
  : '';

/* Admin panel — klaviatura bilan ishlanadigan, matn nusxalanadigan ish
   quroli: telefon ilovasining "zoom yo'q" cheklovi unga to'g'ri kelmaydi. */
const viewport = CFG.admin
  ? 'width=device-width,initial-scale=1'
  : 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover';

const title = CFG.admin ? 'Nazariy — admin' : 'Nazariy';

const html = `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="utf-8">
<meta name="viewport" content="${viewport}">
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
<script>
${ruDict}
</script>
<script>
${i18n}
</script>
<script>
${runtime}
</script>
<script>
${feedback}
</script>
<script>
${notify}
</script>
<script>
${siteSnippet}
</script>
<script>
${progress}
</script>
<script>
${iqBundle}
</script>
<script>
${logic}
</script>
<script>
${supaSnippet}
${data}
</script>
<script>
${bootstrap}
</script>
${adminScripts}
</body>
</html>
`;

/* ── 7. Nazorat: kesish paytida hech narsa tushib qolmadimi ──────────── */
const NEED = ['.nz-card-reyting{', '.nz-card-hafta{', 'url(./reyting-bg.jpg)', 'url(./hafta-bg.jpg)',
              'class Component extends DCLogic', 'renderVals()'];
if (CFG.app) NEED.push('nz-nav', 'nz-frame');
NEED.push('IQ.register = register', 'IQ.session =');
if (CFG.admin) NEED.push('valsManage', 'Admin panel');
/* Landing'ning MATNI emas, tuzilmasi tekshiriladi: matn mahsulot bilan
   o'zgaradi (bu loyiha Nazariy'dan olingan va u yerda sarlavha matni
   tekshirilardi), bosh blok esa har doim bo'lishi kerak. */
if (CFG.landing) NEED.push('nz-landing-hero', 'nz-landing-h1');

/* Pul qatlami kesilgan build'da na kirish yo'li, na MANTIG'I qolmasligi
   kerak. Ilgari bu tekshiruv faqat `markup` ustida ishlardi — ya'ni u
   "tugma chizilmaydi" ni tasdiqlardi, "kod yo'q" ni emas. Admin
   tekshiruvi (pastda) boshidan `logicCode` ustida ishlagan va aynan
   shuning uchun kuchli edi; endi ikkalasi bir xil qat'iylikda. */
if (!CFG.money) {
  const MONEY_NAMES = ['openPro', 'openPay', 'openRedeem', 'payStepMethod',
                       'proFinePrint', 'valsMoney', 'plansFrom', 'confirmPay',
                       'PRO_BENEFITS', 'PAY_METHODS'];
  for (const bad of MONEY_NAMES) {
    if (new RegExp(`\\b${bad}\\b`).test(logicCode)) {
      throw new Error(`[build] XAVFSIZLIK: "${bad}" ${TARGET} build'ining KODIDA qoldi — ` +
                      `pul qatlami kesilmagan`);
    }
    if (markup.indexOf(bad) !== -1) {
      throw new Error(`[build] "${bad}" ${TARGET} build'ining markup'ida qoldi — ` +
                      `pul qatlami to'liq kesilmagan`);
    }
  }
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
for (const img of ['reyting-bg.jpg', 'hafta-bg.jpg']) copyFileSync(join(SRC, img), join(OUT, img));


const kb = n => (n / 1024).toFixed(0) + ' KB';
console.log(`maqsad: ${TARGET} → ${OUT}/`);
console.log(`${OUT}/index.html — ${kb(html.length)}`);
console.log(`${OUT}/fonts     — ${fontCount} ta woff2`);
console.log(`${OUT}/*.jpg     — 2 ta fon surati`);
if (removed.length) console.log(`kesildi        — admin qatlami (${removed.length} ta nom)`);
if (!CFG.money) console.log(`kesildi        — pul qatlami (Pro va to'lov oqimi)`);
