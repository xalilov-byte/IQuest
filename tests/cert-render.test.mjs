/* ─────────────────────────────────────────────────────────────────────────
   src/cert/render.js — sertifikat tasvirining tekshiruvi

   NIMA UCHUN MUHIM:
   1. Ism foydalanuvchidan keladi va SVG'ga tushadi. Escape'siz bitta
      `"><image href=…>` yoki `<script>` — begona teg; bitta \u0001 esa
      butun SVG'ni "buzuq rasm"ga aylantiradi (XML 1.0 uni taqiqlaydi).
      Tekshiruv: ism faqat MATN tuguniga tushadi, teg/atribut tuzilmasi
      har qanday ismda aynan bir xil qoladi.
   2. Halollik (CONTRACT §6.7): "IQuest testi natijasi", ball doim oraliq va
      "taxminiy" bilan; "rasmiy", "klinik", Mensa, davlat — yo'q.
   3. Sertifikatdagi QR aynan tekshirish havolasining QR'i — path'dan
      modullar tiklanib, IQ.cert.qr bilan solishtiriladi (QR'ning o'zi
      tests/cert-qr.test.mjs da isbotlangan).

   Brauzersiz qism: IQ.cert.png (canvas) bu yerda faqat "Node'da rad
   etadi" deb tekshiriladi; brauzerda Chromium bilan alohida sinalgan.

   Ishga tushirish:  node --test tests/cert-render.test.mjs
   ───────────────────────────────────────────────────────────────────── */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(read('src/iq/index.js'), ctx);
/* render.js ATAYLAB qr.js dan oldin yuklanadi: u IQ.cert.qr ni chaqiruv
   paytida oladi, ya'ni fayllar tartibiga bog'liq emas. */
vm.runInContext(read('src/cert/render.js'), ctx);
vm.runInContext(read('src/cert/qr.js'), ctx);
const IQ = ctx.window.IQ;
const C = IQ.cert;
const R = C._render;
const plain = x => JSON.parse(JSON.stringify(x));
const ch = (...codes) => String.fromCharCode(...codes);

const BASE = {
  name: 'Ali Valiyev', score: 118, lo: 110, hi: 126, date: '2026-09-25',
  code: 'IQ-7K3P-92XQ', url: 'https://iquest.uz/sertifikat/?kod=IQ-7K3P-92XQ', testN: 30,
};
const render = (patch, lang) => C.render(Object.assign({}, BASE, patch || {}), lang);

/* ── Kichik, qat'iy XML tahlilchisi ──────────────────────────────────
   Maqsad — "SVG buzilmadi"ni isbotlash: teglar juftlashgan, atributlar
   qo'shtirnoqda, matn va atributda xom "<" / "&" yo'q, faqat ma'lum
   entity'lar. Natija: elementlar ro'yxati (teg + atribut NOMLARI) va
   har <text>/<title> ning ko'rinadigan matni. */
const ENT = /&(?:amp|lt|gt|quot|#39|#61|#\d+);/;
const decode = s => s.replace(/&(amp|lt|gt|quot|#39|#61|#\d+);/g, (m, e) =>
  ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", '#61': '=' })[e] || String.fromCodePoint(+e.slice(1)));
function parseXml(s) {
  const els = [], texts = [], stack = [];
  let i = 0;
  const safeRun = new RegExp('^(?:[^<>&"]|' + ENT.source + ')*$');
  while (i < s.length) {
    if (s[i] === '<') {
      const close = /<\/([A-Za-z][\w:-]*)>/y; close.lastIndex = i;
      let m = close.exec(s);
      if (m) {
        const top = stack.pop();
        if (!top || top.tag !== m[1]) throw new Error('juftlanmagan </' + m[1] + '> @' + i);
        i = close.lastIndex; continue;
      }
      const open = /<([A-Za-z][\w:-]*)/y; open.lastIndex = i;
      m = open.exec(s);
      if (!m) throw new Error('noto\'g\'ri teg @' + i + ': ' + s.slice(i, i + 30));
      const el = { tag: m[1], attrs: [], text: '' };
      i = open.lastIndex;
      const attr = /\s+([A-Za-z_:][\w:.-]*)="([^"]*)"/y;
      for (;;) {
        attr.lastIndex = i;
        const a = attr.exec(s);
        if (!a) break;
        if (!safeRun.test(a[2])) throw new Error('atribut qiymatida xom belgi: ' + a[1] + '=' + a[2].slice(0, 40));
        el.attrs.push(a[1]);
        i = attr.lastIndex;
      }
      const end = /\s*(\/?)>/y; end.lastIndex = i;
      const e = end.exec(s);
      if (!e) throw new Error('teg yopilmagan @' + i + ': ' + s.slice(i, i + 30));
      i = end.lastIndex;
      if (stack.length === 0 && els.length > 0) throw new Error('ikkinchi ildiz element');
      els.push(el);
      if (!e[1]) stack.push(el);
      continue;
    }
    const j = s.indexOf('<', i) < 0 ? s.length : s.indexOf('<', i);
    const raw = s.slice(i, j);
    if (!safeRun.test(raw.replace(/"/g, ''))) throw new Error('matnda xom belgi: ' + raw.slice(0, 40));
    if (!stack.length) throw new Error('ildizdan tashqarida matn');
    stack[stack.length - 1].text += decode(raw);
    /* <tspan> matni ota <text> ga ham qo'shiladi (ko'rinadigan satr). */
    if (stack.length > 1 && stack[stack.length - 1].tag === 'tspan') stack[stack.length - 2].text += decode(raw);
    i = j;
  }
  if (stack.length) throw new Error('yopilmagan: ' + stack.map(x => x.tag));
  for (const el of els) if (el.tag === 'text' || el.tag === 'title') texts.push(el.text);
  return { els, texts, shape: els.map(e => e.tag + '[' + e.attrs.join(',') + ']').join(' ') };
}

/* IQ.validateItem ichidagi SVG tekshirgichi orqali (CONTRACT §2): skript,
   on*=, foreignObject, tashqi href. Sertifikat savol emas, lekin xuddi shu
   qoidalar unga ham tegishli — shuning uchun o'sha tekshirgichning o'zi. */
function validateSvg(svg) {
  return plain(IQ.validateItem({
    id: 'demo:1:1', type: 'demo', level: 1, b: IQ.levelToB(1),
    prompt: { uz: 'a', ru: 'a' }, explain: { uz: 'a', ru: 'a' },
    stimulus: { kind: 'svg', svg },
    options: ['1', '2', '3', '4'].map(s => ({ kind: 'text', uz: s, ru: s })), correct: 0,
  }));
}

/* ── Asosiy ko'rinish ─────────────────────────────────────────────── */

test('A4 gorizontal SVG: viewBox 1123×794, o\'lcham, o\'z oq foni, to\'g\'ri XML', () => {
  const svg = render();
  assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1123 794" width="1123" height="794"'));
  assert.match(svg, /<rect width="1123" height="794" fill="#ffffff"\/>/);
  assert.equal(C.W, 1123);
  assert.equal(C.H, 794);
  const x = parseXml(svg);
  assert.equal(x.els[0].tag, 'svg');
  assert.deepEqual(validateSvg(svg), []);
  /* Shrift: <img> ichida sahifa shrifti yo'q — zaxira ro'yxat, kirillli. */
  assert.match(svg, /font-family="&#39;Manrope&#39;, &#39;Segoe UI&#39;, Arial, sans-serif"/);
});

test('o\'zbekcha mazmun: brend, sarlavha, ism, ball + oraliq, sana, kod, tekshirish, pastki satr', () => {
  const t = parseXml(render({}, 'uz')).texts;
  const has = s => assert.ok(t.includes(s), 'yo\'q: "' + s + '"\n' + t.join('\n'));
  has('IQuest');
  has('SERTIFIKAT');
  has('Ushbu sertifikat egasi');
  has('Ali Valiyev');
  has('IQuest testi natijasi: 118');
  has('taxminiy oraliq 110–126 · 30 ta savol');
  has('SANA');
  has('2026-yil 25-sentabr');
  has('SERTIFIKAT KODI');
  has('IQ-7K3P-92XQ');
  has('Tekshirish: iquest.uz/sertifikat/?kod=IQ-7K3P-92XQ');
  has('IQuest.uz tomonidan berilgan onlayn test natijasi');
});

test('ruscha mazmun (lang argumenti yoki data.lang)', () => {
  const svg = render({ name: 'Шерзод Каримов', testN: 31 }, 'ru');
  assert.equal(render({ name: 'Шерзод Каримов', testN: 31, lang: 'ru' }), svg);
  const t = parseXml(svg).texts;
  for (const s of ['СЕРТИФИКАТ', 'Владелец сертификата', 'Шерзод Каримов', 'Результат теста IQuest: 118',
    'примерный диапазон 110–126 · 31 вопрос', 'ДАТА', '25 сентября 2026 г.', 'КОД СЕРТИФИКАТА',
    'Проверка: iquest.uz/sertifikat/?kod=IQ-7K3P-92XQ', 'Результат онлайн-теста, выданный IQuest.uz']) {
    assert.ok(t.includes(s), 'yo\'q: "' + s + '"\n' + t.join('\n'));
  }
  /* Noma'lum til — o'zbekcha. */
  assert.ok(parseXml(render({}, 'en')).texts.includes('SERTIFIKAT'));
});

test('ruscha ko\'plik: вопрос / вопроса / вопросов', () => {
  const cases = { 1: 'вопрос', 2: 'вопроса', 4: 'вопроса', 5: 'вопросов', 11: 'вопросов', 12: 'вопросов',
    14: 'вопросов', 21: 'вопрос', 22: 'вопроса', 25: 'вопросов', 101: 'вопрос', 111: 'вопросов', 112: 'вопросов' };
  for (const n in cases) {
    const t = parseXml(render({ testN: +n }, 'ru')).texts;
    assert.ok(t.some(s => s.endsWith(' · ' + n + ' ' + cases[n])), n + ' ' + cases[n]);
  }
  /* testN bo'lmasa — faqat oraliq. */
  assert.ok(parseXml(render({ testN: undefined }, 'uz')).texts.includes('taxminiy oraliq 110–126'));
});

test('sana: YYYY-MM-DD qismi, vaqt zonasi siljimaydi; 12 oy; yaroqsiz — qator yo\'q', () => {
  const uz = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
  const ru = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  for (let m = 1; m <= 12; m++) {
    const iso = '2026-' + String(m).padStart(2, '0') + '-03';
    assert.equal(R.fmtDate(iso, 'uz'), '2026-yil 3-' + uz[m - 1]);
    assert.equal(R.fmtDate(iso, 'ru'), '3 ' + ru[m - 1] + ' 2026 г.');
  }
  /* UTC kechasi — Toshkentda ertasi kun bo'lsa ham, server yozgan kun qoladi. */
  assert.equal(R.fmtDate('2026-12-31T23:30:00Z', 'uz'), '2026-yil 31-dekabr');
  for (const bad of ['', null, undefined, 'kecha', '2026-13-01', '2026-00-10', '25.09.2026']) {
    assert.equal(R.fmtDate(bad, 'uz'), '', String(bad));
  }
  const t = parseXml(render({ date: 'yo\'q' })).texts;
  assert.ok(!t.includes('SANA'), 'yaroqsiz sanada "SANA" sarlavhasi ham chiqmasin');
  assert.ok(t.includes('IQ-7K3P-92XQ'));
});

/* ── Halollik (CONTRACT §6.7) ─────────────────────────────────────── */

test('halollik: "rasmiy", "klinik", Mensa, davlat, persentil — ikkala tilda yo\'q; oraliq doim bor', () => {
  const BANNED = /rasmiy|klinik|mensa|davlat|sertifikatlangan|persentil|aholining|официальн|клиническ|менса|государств|сертифицирован|перцентил|процентил|%/i;
  for (const lang of ['uz', 'ru']) for (const score of [55, 100, 145]) {
    const texts = parseXml(render({ score, lo: score - 8, hi: score + 8 }, lang)).texts;
    /* Ism va kod foydalanuvchi/serverniki — ular tekshiruvdan tashqari. */
    const ours = texts.filter(s => s !== 'Ali Valiyev' && s !== 'IQ-7K3P-92XQ').join('\n');
    assert.doesNotMatch(ours, BANNED, lang + ': ' + ours);
    /* Ball satri bor va pastida oraliq + "taxminiy"/"примерный". */
    const range = lang === 'uz' ? 'taxminiy oraliq ' : 'примерный диапазон ';
    assert.ok(texts.some(s => s.startsWith(range + (score - 8) + '–' + (score + 8))), lang + ' oraliq yo\'q');
  }
});

test('xato ma\'lumot — baland xato (sertifikatda "NaN" yoki bo\'sh ball chiqmaydi)', () => {
  assert.throws(() => render({ score: undefined }), /score/);
  assert.throws(() => render({ score: NaN }), /score/);
  assert.throws(() => render({ lo: 'abc' }), /lo/);
  assert.throws(() => render({ hi: null }), /hi/);
  assert.throws(() => render({ lo: 120 }), /oraliq/);         // lo > score
  assert.throws(() => render({ hi: 100 }), /oraliq/);         // score > hi
  assert.throws(() => render({ code: '' }), /kod/);
  assert.throws(() => render({ code: '<>"' }), /kod/);        // tozalangach bo'sh
  assert.throws(() => render({ testN: 0 }), /testN/);
  assert.throws(() => C.render(null), /score/);
  /* Satr ko'rinishidagi son qabul qilinadi (JSON'dan kelishi mumkin). */
  assert.ok(parseXml(render({ score: '118', lo: '110', hi: '126' })).texts.includes('IQuest testi natijasi: 118'));
});

/* ── Xavfsizlik: ism ──────────────────────────────────────────────── */

const NASTY = [
  '<script>alert(1)</script>',
  '"><image href="https://evil.example/x.png"/>',
  "'><foreignObject><iframe src=//evil.example></iframe></foreignObject>",
  'Tom & Jerry',
  "O'Brien \"Bob\"",
  'x onload=alert(1) onclick = "y"',
  '</text></svg><svg onload=alert(1)>',
  '&amp; &lt; &#60; &#x3c;',
  ']]><![CDATA[',
  '<!-- izoh -->',
  'Ali' + ch(0, 1, 7, 8, 9, 10, 13, 27, 127, 0x85) + 'Vali',
  ch(0x202E) + 'ilaV ilA',                          // o'ngdan-chapga majburlash (spoofing)
  'Ali' + ch(0x2028) + 'Vali' + ch(0x2029, 0xFEFF, 0xFFFE, 0xFFFF),
  'Ali' + ch(0xD800) + 'Vali' + ch(0xDC00, 0xDC00),   // yolg'iz surrogatlar
  'x'.repeat(5000),
  String.fromCodePoint(0x1F600).repeat(100),
];

test('xavfli ismlar: XML buzilmaydi, teg/atribut tuzilmasi o\'zgarmaydi, validateItem toza', () => {
  const benign = parseXml(render({ name: 'Ali Valiyev' })).shape;
  for (const name of NASTY) {
    const svg = render({ name });
    const x = parseXml(svg);                         // xato bo'lsa — otadi
    assert.equal(x.shape, benign, 'tuzilma o\'zgardi: ' + JSON.stringify(name.slice(0, 40)));
    assert.deepEqual(validateSvg(svg), [], JSON.stringify(name.slice(0, 40)));
    assert.doesNotMatch(svg, /<script|<foreignObject|<iframe|<image|\son\w+\s*=|CDATA\[<|<!--/i);
    /* XML'da yaroqsiz / ko'rinmas boshqaruv belgilari chiqishda umuman yo'q. */
    for (const c of svg) {
      const n = c.codePointAt(0);
      assert.ok(n >= 0x20 && !(n >= 0x7F && n <= 0x9F) && ![0x202E, 0x2028, 0x2029, 0xFEFF, 0xFFFE, 0xFFFF].includes(n),
        'taqiqlangan belgi U+' + n.toString(16));
      if (n >= 0xD800 && n <= 0xDFFF) assert.fail('yolg\'iz surrogat');
    }
    /* Ko'rinadigan ism — tozalangan ism (kesilgan bo'lishi mumkin), escape
       ortidagi asl belgilar bilan: "<script>" — matn sifatida. */
    const shown = x.texts[2 + 1 + 1];                // title, IQuest, SERTIFIKAT, egasi, ISM
    const clean = R.cleanName(name);
    assert.ok(shown === clean || (shown.endsWith('…') && clean.startsWith(shown.slice(0, -1).trim())),
      JSON.stringify([shown, clean]));
  }
});

test('ism tozalash: bo\'shliqlar, boshqaruv belgilari, 60 belgi chegarasi, surrogat juftlari butun', () => {
  assert.equal(R.cleanName('  Ali \t\n  Vali  '), 'Ali Vali');
  assert.equal(R.cleanName(ch(0x202E) + 'abc'), 'abc');
  assert.equal(R.cleanName('a' + ch(0) + 'b'), 'a b');
  assert.equal(R.cleanName(null), '');
  assert.equal(R.cleanName(12345), '12345');
  /* NFC: "o" + birikuvchi belgi → bitta belgi (bir xil ism — bir xil satr). */
  assert.equal(R.cleanName('Jo' + ch(0x0308) + 'rg'), 'Jörg');
  const long = R.cleanName('A'.repeat(200));
  assert.equal(Array.from(long).length, R.NAME_MAX);
  assert.ok(long.endsWith('…'));
  assert.equal(R.cleanName('B'.repeat(60)), 'B'.repeat(60));  // aynan 60 — kesilmaydi
  const emoji = R.cleanName(String.fromCodePoint(0x1F600).repeat(100));
  assert.equal(Array.from(emoji).length, 60);
  assert.ok(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(emoji), 'surrogat juftligi bo\'linmasin');
  /* Bo'sh ism — sertifikat chiziladi, joyida tire. */
  assert.ok(parseXml(render({ name: '   ' })).texts.includes('—'));
});

test('uzun ism: shrift kichrayadi (54 → 24), taxminiy en ramkadan chiqmaydi', () => {
  const sizeOf = name => {
    const m = /<text x="561.5" y="350" font-size="([\d.]+)"/.exec(render({ name }));
    return +m[1];
  };
  assert.equal(sizeOf('Ali'), 54);
  let prev = 99;
  for (let n = 5; n <= 60; n += 5) {
    const s = sizeOf('Abdurahmonova '.repeat(5).slice(0, n));
    assert.ok(s <= prev && s >= 24, n + ': ' + s);
    prev = s;
  }
  for (const name of ['Ali', 'Шерзод Каримов', 'Александра Константиновна Преображенская-Щербакова',
    'W'.repeat(60), 'Ш'.repeat(60), 'i'.repeat(60), String.fromCodePoint(0x1F600).repeat(60)]) {
    const f = R.fitText(R.cleanName(name), 880, 54, 24);
    assert.ok(R.textEm(f.text) * 1.08 * f.size <= 880 + 1e-9, name.slice(0, 10) + ' ' + f.size);
  }
});

/* ── Havola, kod, QR ──────────────────────────────────────────────── */

/* Sertifikatdagi QR path'idan modullarni tiklash. */
function qrFromSvg(svg) {
  const d = /<path fill="#1c1b29" shape-rendering="crispEdges" d="([^"]*)"/.exec(svg)[1];
  const segs = [...d.matchAll(/M([\d.]+) ([\d.]+)h([\d.]+)v([\d.]+)h-[\d.]+z/g)].map(m => m.slice(1).map(Number));
  const cell = segs[0][3];
  const x0 = Math.min(...segs.map(s => s[0])), y0 = Math.min(...segs.map(s => s[1]));
  const size = Math.round((Math.max(...segs.map(s => s[1])) - y0) / cell) + 1;
  const g = Array.from({ length: size }, () => new Array(size).fill(false));
  for (const [x, y, w] of segs) {
    const cx = Math.round((x - x0) / cell), cy = Math.round((y - y0) / cell);
    for (let k = 0; k < Math.round(w / cell); k++) g[cy][cx + k] = true;
  }
  return g;
}

test('sertifikatdagi QR — aynan data.url ning QR\'i (M daraja)', () => {
  for (const url of ['https://iquest.uz/sertifikat/?kod=IQ-7K3P-92XQ', 'https://iquest.uz/ru/sertifikat/?kod=IQ-M2N8-ZX7C&lang=ru']) {
    assert.deepEqual(qrFromSvg(render({ url })), plain(C.qr(url, { ecc: 'M' }).modules), url);
  }
});

test('havola: faqat http(s); aks holda koddan standart havola quriladi', () => {
  const std = render({ url: undefined });
  assert.deepEqual(qrFromSvg(std), plain(C.qr('https://iquest.uz/sertifikat/?kod=IQ-7K3P-92XQ').modules));
  for (const url of ['javascript:alert(1)', 'data:text/html,<script>', 'https://evil.example/ bo\'shliq',
    'https://x"><script>', '//iquest.uz/x', 'ftp://iquest.uz', 12345, 'https://' + 'a'.repeat(400)]) {
    assert.equal(render({ url }), std, String(url).slice(0, 30));
  }
  /* Ko'rinadigan havola protokol va www'siz. */
  const t = parseXml(render({ url: 'https://www.iquest.uz/sertifikat/?kod=IQ-7K3P-92XQ' })).texts;
  assert.ok(t.includes('Tekshirish: iquest.uz/sertifikat/?kod=IQ-7K3P-92XQ'));
  /* Kod URL ichida kodlanadi. */
  assert.equal(R.cleanUrl(undefined, 'IQ-AB12'), 'https://iquest.uz/sertifikat/?kod=IQ-AB12');
});

test('kod: faqat [A-Za-z0-9-], katta-kichik harf saqlanadi (tekshirish sahifasi aynan shuni qidiradi)', () => {
  assert.equal(R.cleanCode('IQ-7K3P-92XQ'), 'IQ-7K3P-92XQ');
  assert.equal(R.cleanCode('iq-7k3p'), 'iq-7k3p');
  assert.equal(R.cleanCode('IQ-7K3P"/><script>'), 'IQ-7K3Pscript');
  assert.equal(R.cleanCode('A'.repeat(100)).length, 32);
});

/* ── Fon rasmi ────────────────────────────────────────────────────── */

const PNG1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test('fon: faqat data:image (raster) — boshqasi e\'tiborsiz, vektor ramka chiziladi', () => {
  const svg = render({ bg: PNG1 });
  assert.equal((svg.match(/<image /g) || []).length, 1);
  assert.ok(svg.includes('<image href="' + PNG1 + '"'));
  /* Yagona href — shu data:image; uni olib tashlagach qolgan hamma narsa
     validateItem qoidalaridan o'tadi. */
  const rest = svg.replace('href="' + PNG1 + '"', '');
  assert.doesNotMatch(rest, /<script|\son\w+\s*=|<foreignObject|href\s*=\s*["'](?!#)/i);
  parseXml(svg);
  /* Bo'shliq/yangi qatorli base64 ham qabul qilinadi (tozalanadi). */
  assert.ok(render({ bg: PNG1.slice(0, 40) + '\n  ' + PNG1.slice(40) }).includes('<image href="' + PNG1 + '"'));

  const noBg = render();
  for (const bg of ['https://evil.example/frame.png', 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
    'data:image/png;base64,AAAA"/><script>alert(1)</script>', 'javascript:alert(1)', 'data:text/html;base64,AAAA',
    'data:image/png,rawdata', 42, { toString: () => PNG1 }]) {
    assert.equal(render({ bg }), noBg, String(bg).slice(0, 30));
  }
  assert.doesNotMatch(noBg, /<image/);
});

/* ── Determinizm va brauzer qismi ─────────────────────────────────── */

test('determinizm: bir xil ma\'lumot → baytma-bayt bir xil SVG', () => {
  assert.equal(render(), render());
  assert.equal(render({ name: 'Шерзод' }, 'ru'), render({ name: 'Шерзод' }, 'ru'));
  assert.notEqual(render({ score: 119, hi: 127 }), render());
});

test('png: Node\'da (document yo\'q) sinxron otmaydi, Promise rad etiladi', async () => {
  const p = C.png(render(), 2);
  assert.equal(typeof p.then, 'function');
  await assert.rejects(p, /brauzer/);
});
