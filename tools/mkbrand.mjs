/* ─────────────────────────────────────────────────────────────────────────
   BREND AKTIVLARI  →  resources/brand/**   (ARXITEKTURA.md §12.5)

   npm run brand                        = node tools/mkbrand.mjs
   node tools/mkbrand.mjs --lang=uz,ru,en   (en — v1.2 uchun tayyor)
   node tools/mkbrand.mjs --only=x/header,web/og
   node tools/mkbrand.mjs --no-shots        (ilova suratlarini qayta olmaslik)
   node tools/mkbrand.mjs --app=/yo'l/www/index.html
   npm run brand:daily                  = --daily --date=YYYY-MM-DD --lang=uz
   node tools/mkbrand.mjs --serve       → brand.html ni brauzerda ko'rish

   Yagona manba — tools/brand.html. Bu skript:
   1. www/ dan ilovaning haqiqiy savol ekranini oladi (tungi/kunduzgi,
      har til) → resources/brand/_shots/ (banner telefon kartasi uchun).
      Olib bo'lmasa eski surat qoladi; umuman bo'lmasa telefon kartasi
      bannerdan olib tashlanadi — soxta ekran chizilmaydi.
   2. Har aktiv va har til uchun viewport = w×h, DSF 1, surat. Alfa
      taqiqlangan joyda JPG yoki tekislangan PNG; logo — SVG (harflar
      konturda) + PDF + PNG.
   3. PNG/JPG sarlavhasidan aniq o'lcham va alfa yo'qligini tekshiradi.
   4. Har aktiv matnini HALOLLIK lintidan o'tkazadi (tools/honesty.mjs
      bo'lsa o'sha, bo'lmasa quyidagi ro'yxat); topilsa — yiqiladi.
   5. resources/brand/MANIFEST.json: fayl, platforma, o'lcham, til, sha256.
   6. resources/brand/PREVIEW.jpg — hamma aktivlar bitta varaqda (ko'rik).
   Qo'shimcha: web/og (uz) → resources/og.jpg (sayt shuni ishlatadi).

   Deterministik: Date.now yo'q; «Kun savoli» sanasi --date dan.
   Aktivlar repoga commit qilinadi — CI ularni yasamaydi (brauzer kerak).
   ───────────────────────────────────────────────────────────────────── */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, copyFileSync, rmSync } from 'fs';
import { createServer } from 'http';
import { createHash } from 'crypto';
import { join, dirname, resolve, extname, relative, sep } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { loadChromium, CHROME, captureScreen } from './mkplay.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = k => { const a = process.argv.find(x => x === `--${k}` || x.startsWith(`--${k}=`)); return a ? (a.split('=')[1] ?? true) : undefined; };
const LANGS = String(arg('lang') || 'uz,ru').split(',');
const ONLY = arg('only') ? String(arg('only')).split(',') : null;
const DAILY = !!arg('daily');
const DATE = arg('date');
const OUT = resolve(ROOT, arg('out') || 'resources/brand');
const APP = resolve(ROOT, arg('app') || 'www/index.html');

let sharp;
try { sharp = (await import('sharp')).default; }
catch (e) { console.error('[mkbrand] sharp ishlamayapti — `npm rebuild sharp`'); process.exit(1); }

/* ── Kichik statik server: / → repo, /_app/ → ilova papkasi ──────────── */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff': 'font/woff', '.woff2': 'font/woff2' };
function serve(port = 0) {
  const appDir = dirname(APP);
  const srv = createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const base = u.startsWith('/_app/') ? appDir : ROOT;
    const f = resolve(base, '.' + (u.startsWith('/_app/') ? u.slice(5) : u));
    if (!(f + sep).startsWith(base + sep) && f !== base) { res.writeHead(403).end(); return; }
    if (!existsSync(f) || !statSync(f).isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(readFileSync(f));
  });
  return new Promise(r => srv.listen(port, '127.0.0.1', () => r(srv)));
}

const srv = await serve(arg('serve') ? Number(arg('port') || 8765) : 0);
const BASE = `http://127.0.0.1:${srv.address().port}`;
if (arg('serve')) {
  console.log(`[mkbrand] ${BASE}/tools/brand.html            — hamma aktivlar`);
  console.log(`          ${BASE}/tools/brand.html?id=og&group=web&lang=ru`);
  console.log('          (to\'xtatish: Ctrl+C)');
  await new Promise(() => {});
}

/* ── Halollik linti (CONTRACT §6, ARXITEKTURA §12.4, §16-2) ──────────── */
const BUILTIN = [
  [/\brasmiy|official|официальн/i, '«rasmiy»'],
  [/sertifikat|сертификат|certificat/i, 'sertifikat (server boʻlmaguncha yoʻq)'],
  [/\bliga|лиг[аиу]|league/i, 'liga (§16-2)'],
  [/reyting|рейтинг|ranking|leaderboard/i, 'reyting (§16-2)'],
  [/mensa|klinik|клиническ|clinical|akkredit|аккредит|accredit/i, 'klinik/rasmiy ishora'],
  [/persentil|перцентил|percentil|aholining|населени|of people/i, 'persentil'],
  [/oshir(adi|ing)|повыс|увелич|boost|increase your iq|raise your iq/i, '«IQ oshiradi» vaʼdasi'],
  [/\bDTM\b|ДТМ|tayyorlaydi|подготов/i, 'DTM / «tayyorlaydi»'],
  [/\d+\s*(ball|балл|points?)\b|\d+\s*%/i, 'raqamli vaʼda'],
  [/\d[\d\s]*\s*(foydalanuvchi|пользовател|users|downloads|yuklab)/i, 'foydalanuvchi soni'],
  [/[oOgG]'/, 'ASCII apostrof (ʻ U+02BB kerak)'],
];
let honesty = null;
const HF = join(ROOT, 'tools', 'honesty.mjs');
if (existsSync(HF)) {
  try {
    const m = await import(pathToFileURL(HF).href);
    const fn = m.lint || m.check || m.scan || m.honesty || m.default;
    if (typeof fn === 'function') honesty = fn;
  } catch (e) { console.warn('[mkbrand] tools/honesty.mjs yuklanmadi: ' + e.message); }
}
function lintText(text, where) {
  const out = [];
  for (const [re, why] of BUILTIN) { const m = text.match(re); if (m) out.push(`${why}: «${m[0]}»`); }
  if (honesty) {
    try {
      const r = honesty(text, { where });
      const arr = Array.isArray(r) ? r : r && Array.isArray(r.errors) ? r.errors : [];
      for (const e of arr) out.push(typeof e === 'string' ? e : (e.message || e.rule || JSON.stringify(e)));
    } catch (e) { out.push('honesty.mjs: ' + e.message); }
  }
  return out;
}

/* ── Brauzer ────────────────────────────────────────────────────────── */
const chromium = await loadChromium('mkbrand');
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

/* 1. Ilova suratlari (banner telefon kartasi) */
const SHOTS = join(OUT, '_shots');
mkdirSync(SHOTS, { recursive: true });
const warns = [];
if (!arg('no-shots') && !DAILY) {
  if (!existsSync(APP)) warns.push(`${relative(ROOT, APP)} yoʻq — ilova suratlari yangilanmadi (npm run build)`);
  else for (const lang of LANGS) for (const theme of ['dark', 'light']) {
    const path = join(SHOTS, `question-${theme}-${lang}.png`);
    try {
      await captureScreen(browser, { appUrl: pathToFileURL(APP).href, screen: 'test-question', lang, theme, dsf: 2, path });
      await sharp(readFileSync(path)).png({ compressionLevel: 9, palette: false }).toFile(path);
    } catch (e) { warns.push(`_shots/question-${theme}-${lang}: ${e.message}${existsSync(path) ? ' (eskisi qoldi)' : ''}`); }
  }
}

/* 2. Aktivlar ro'yxati brand.html dan */
let url = new URL(`${BASE}/tools/brand.html`);
const cfg = JSON.parse(readFileSync(join(ROOT, 'site.config.json'), 'utf8'));
const siteUrl = cfg.domainConfirmed && cfg.domain ? cfg.domain : '';   // domen tasdiqlanmaguncha bannerda yo'q
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
await page.goto(url.href + '?id=__none');
await page.waitForFunction(() => window.brandInfo, null, { timeout: 20000 });
const ALL = await page.evaluate(() => window.brandInfo());
await page.close();

const list = ALL.filter(a => a.group !== '_icons')
  .filter(a => DAILY ? a.daily : !a.daily)
  .filter(a => !ONLY || ONLY.some(o => o === a.id || o === `${a.group}/${a.id}` || o === a.group));
if (DAILY && !/^\d{4}-\d{2}-\d{2}$/.test(String(DATE || ''))) { console.error('[mkbrand] --daily uchun --date=YYYY-MM-DD kerak'); process.exit(1); }

const manifest = [];
const errors = [];
const sha = b => createHash('sha256').update(b).digest('hex');
const keep = (file, buf, a, lang, w, h, fmt) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, buf);
  manifest.push({ file: relative(OUT, file).split(sep).join('/'), platform: a.group, id: a.id, w, h,
                  lang: lang || null, format: fmt, bytes: buf.length, sha256: sha(buf) });
};

async function open(a, lang, viewport) {
  const p = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  const q = new URLSearchParams({ id: a.id, group: a.group, lang: lang || 'uz' });
  if (DATE) q.set('date', DATE);
  if (siteUrl) q.set('url', siteUrl);
  await p.goto(`${BASE}/tools/brand.html?${q}`);
  await p.waitForFunction(() => window.__ready, null, { timeout: 30000 });
  const err = await p.evaluate(() => window.__error);
  if (err || errs.length) { await p.close(); throw new Error(err || errs[0]); }
  await p.evaluate(() => { document.documentElement.style.background = 'transparent'; });
  return p;
}

const dailyDir = DAILY ? join(OUT, 'daily', DATE) : null;
for (const a of list) {
  const langs = a.langs.length ? a.langs.filter(l => LANGS.includes(l)) : [null];
  for (const lang of langs) {
    const tag = `${a.group}/${a.id}${lang ? '-' + lang : ''}`;
    try {
      if (a.logo) {
        /* Logo: SVG master (konturlangan), PNG ko'rinish, PDF */
        const p = await open(a, 'uz', { width: 1800, height: 1400 });
        const [kind, mode] = a.v.split(':');
        const L = await p.evaluate(([k, m]) => window.brandLogo(k, m), [kind, mode]);
        const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<!-- IQuest — ${a.id}. tools/brand.html dan (node tools/mkbrand.mjs). Boʻsh joy har tomondan 8 birlik ichida. -->\n` +
          L.svg.replace(/ width="[^"]+" height="[^"]+"/, '') + '\n';
        const base = join(OUT, 'logo', a.id);
        keep(base + '.svg', Buffer.from(svg), a, null, L.w, L.h, 'svg');
        const dims = await p.evaluate(() => { const s = document.querySelector('section.on'); return [+s.dataset.w, +s.dataset.h]; });
        await p.setViewportSize({ width: dims[0], height: dims[1] });
        const png = await p.locator('section.on').screenshot({ omitBackground: true });
        const m = await sharp(png).metadata();
        keep(`${base}-${m.width}x${m.height}.png`, await sharp(png).png({ compressionLevel: 9 }).toBuffer(), a, null, m.width, m.height, 'png');
        const pdf = await p.pdf({ width: `${L.w * 4}px`, height: `${L.h * 4}px`, printBackground: false, pageRanges: '1',
                                 margin: { top: 0, left: 0, right: 0, bottom: 0 } });
        keep(base + '.pdf', pdf, a, null, L.w, L.h, 'pdf');
        await p.close();
        continue;
      }
      const p = await open(a, lang, { width: a.w, height: a.h });
      const w = await p.evaluate(() => window.__warn || []);
      for (const x of w) warns.push(`${tag}: ${x}`);
      const text = await p.evaluate(() => document.querySelector('section.on').innerText.replace(/\s+/g, ' ').trim());
      const bad = lintText(text, tag);
      if (bad.length) throw new Error('HALOLLIK: ' + bad.join('; '));
      const alpha = a.fmt === 'png-alpha';
      let buf = await p.locator('section.on').screenshot({ omitBackground: alpha });
      await p.close();
      const m0 = await sharp(buf).metadata();
      if (m0.width !== a.w || m0.height !== a.h) throw new Error(`oʻlcham ${m0.width}×${m0.height}, kutilgan ${a.w}×${a.h}`);
      let ext = 'png';
      if (a.fmt === 'jpg') { buf = await sharp(buf).flatten({ background: '#14121F' }).jpeg({ quality: 90, mozjpeg: true }).toBuffer(); ext = 'jpg'; }
      else if (alpha) buf = await sharp(buf).png({ compressionLevel: 9 }).toBuffer();
      else if (a.group === 'play' && a.id === 'icon') buf = await sharp(buf).flatten({ background: '#14121F' }).ensureAlpha().png({ compressionLevel: 9 }).toBuffer(); // Play: 32-bit PNG
      else buf = await sharp(buf).flatten({ background: '#14121F' }).png({ compressionLevel: 9 }).toBuffer();
      /* 3. Tekshiruv: sarlavhadan aniq o'lcham; alfa taqiqlangan joyda alfa yo'q */
      const m = await sharp(buf).metadata();
      if (m.width !== a.w || m.height !== a.h) throw new Error('yozilgan fayl oʻlchami notoʻgʻri');
      if (a.fmt === 'jpg' && m.hasAlpha) throw new Error('JPG da alfa');
      if (a.fmt === 'png' && m.hasAlpha && !(a.group === 'play' && a.id === 'icon')) throw new Error('alfa taqiqlangan');
      if (a.group === 'play' && a.id === 'icon' && m.channels !== 4) throw new Error('Play ikonkasi 32-bit PNG emas');
      const name = `${a.id}-${a.w}x${a.h}${lang ? '-' + lang : ''}.${ext}`;
      keep(join(dailyDir || join(OUT, a.group), name), buf, a, lang, a.w, a.h, ext);
    } catch (e) { errors.push(`${tag}: ${e.message}`); }
  }
}

/* Veb-sayt OG rasmi — mksite shu faylni ishlatadi */
if (!DAILY) {
  const og = join(OUT, 'web', 'og-1200x630-uz.jpg');
  if (existsSync(og) && (!ONLY || ONLY.some(o => /og|web/.test(o)))) copyFileSync(og, join(ROOT, 'resources', 'og.jpg'));
}

/* 5. MANIFEST.json (daily bundan tashqari — u kunlik kontent) */
if (!DAILY) {
  const MF = join(OUT, 'MANIFEST.json');
  let prev = [];
  if (ONLY && existsSync(MF)) { try { prev = JSON.parse(readFileSync(MF, 'utf8')).files || []; } catch (e) {} }
  const byFile = new Map(prev.map(x => [x.file, x]));
  for (const x of manifest) byFile.set(x.file, x);
  const files = [...byFile.values()].filter(x => existsSync(join(OUT, x.file))).sort((a, b) => a.file.localeCompare(b.file));
  writeFileSync(MF, JSON.stringify({
    _izoh: 'node tools/mkbrand.mjs yozadi. Qoʻlda tahrirlamang. Manba: tools/brand.html (ARXITEKTURA §12).',
    files }, null, 1) + '\n');

  /* 6. Ko'rik varag'i */
  await contactSheet(files.filter(f => /\.(png|jpg)$/.test(f.file) && !f.file.startsWith('_')), join(OUT, 'PREVIEW.jpg'));
}

await browser.close();
srv.close();

console.log(`\n[mkbrand] ${manifest.length} ta fayl → ${relative(ROOT, dailyDir || OUT)}/`);
const byGroup = {};
for (const x of manifest) (byGroup[x.platform] = byGroup[x.platform] || []).push(x);
for (const [g, xs] of Object.entries(byGroup)) console.log(`  ${g.padEnd(10)} ${xs.length} ta`);
for (const w of warns) console.log('  ⚠ ' + w);
if (errors.length) {
  console.error('\n[mkbrand] XATOLAR:');
  for (const e of errors) console.error('  ✗ ' + e);
  process.exit(1);
}

async function contactSheet(files, out) {
  const COLW = 400, GAP = 24, cols = 5, tiles = [];
  for (const f of files) {
    const src = join(OUT, f.file);
    const k = Math.min(COLW / f.w, 360 / f.h);
    const w = Math.max(1, Math.round(f.w * k)), h = Math.max(1, Math.round(f.h * k));
    const bg = /light|black/.test(f.file) ? '#F5F3FF' : '#2a2638';
    const img = await sharp(src).resize(w, h).flatten({ background: bg }).png().toBuffer();
    tiles.push({ img, w, h, label: f.file });
  }
  const rows = [];
  for (let i = 0; i < tiles.length; i += cols) rows.push(tiles.slice(i, i + cols));
  const rowH = rows.map(r => Math.max(...r.map(t => t.h)) + 30);
  const W = cols * (COLW + GAP) + GAP, H = rowH.reduce((s, h) => s + h + GAP, GAP);
  const comps = [];
  let y = GAP;
  rows.forEach((r, ri) => {
    r.forEach((t, ci) => {
      const x = GAP + ci * (COLW + GAP);
      comps.push({ input: t.img, left: x, top: y });
      const lab = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${COLW}" height="26"><text x="0" y="18" font-family="sans-serif" font-size="13" fill="#b9b4d4">${t.label.replace(/&/g, '&amp;')}</text></svg>`);
      comps.push({ input: lab, left: x, top: y + t.h + 2 });
    });
    y += rowH[ri] + GAP;
  });
  await sharp({ create: { width: W, height: H, channels: 3, background: '#14121F' } })
    .composite(comps).jpeg({ quality: 82, mozjpeg: true }).toFile(out);
}
