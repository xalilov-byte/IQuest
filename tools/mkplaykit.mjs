/* ─────────────────────────────────────────────────────────────────────────
   GOOGLE PLAY MARKETING KIT  →  resources/play-kit/   (brend: «01 Matrix»)

   node tools/mkplaykit.mjs --app=/yoʻl/www/index.html          hammasi
   node tools/mkplaykit.mjs --only=shots,feature                 faqat rasmlar
   node tools/mkplaykit.mjs --only=video --lang=uz               faqat video (uz)
   node tools/mkplaykit.mjs --only=docs,sheet                    README, VOICEOVER, kontakt varagʻi
   Boshqa: --out=…  --tmp=…  --keep-tmp  --cut=full|short  --orient=h|v
           --reuse-clips (_tmp dagi yozuvlar)  --probe=games,explain [--h=640] (ekran retseptini tekshirish)

   Oldin: ilova yigʻilgan boʻlsin (node build.mjs → www/index.html). Repo
   ichida yigʻmaslik uchun nusxada yigʻib, --app bilan koʻrsating.
   Kerak: global Playwright (Chromium), sharp, ffmpeg (PATH, FFMPEG=… yoki
   `pip install imageio-ffmpeg` beradigan statik binar — avtomatik topiladi).

   Chiqadi (resources/play-kit/):
     screenshots/<til>/01..08.png   1080×1920 — brend foni + 2 qatorli sarlavha + telefon (Play: Phone screenshots)
     raw/<til>/01..08.png           1080×1920 — ramkasiz ilova surati (360×640 @3; Play uchun emas)
     feature-graphic-<til>.png      1024×500  — Play «Feature graphic» (markaz — play tugmasi uchun boʻsh)
     video/promo-horizontal-1920x1080[-ru].mp4   30 s — Play videosi (YouTube), doʻkon/narx soʻzisiz
     video/promo-vertical-1080x1920[-ru].mp4     30 s — Shorts/Reels/TikTok (bosishlar y ≤ 1450)
     video/promo15-*.mp4            15 s qisqa versiya
     VOICEOVER.md, voiceover/<til>-{30,15}s.{txt,ssml}, README.md, contact-sheet.png

   Brend manbasi: resources/play-kit/brand-src/*.svg (egasi tasdiqlagan
   «01 Matrix»: navy #10183A, marjon #FF5B3A / qorongʻida #FF6A4B).
   resources/brand/ ga yangi logo tushsa, shu uch faylni almashtiring.

   ── HALOLLIK (CONTRACT §6, §17; PLAY.md) ───────────────────────────────
   Suratlar va video HAQIQIY ilovadan. Holat ilovaning oʻz API si bilan
   «yashab» tayyorlanadi (prime): 12 kun mashq, «Xatolarim» takrorlash,
   bitta toʻliq IQ test, nishon va tangalar ilovaning oʻzi bergani. Savol
   urugʻi IQ.session.create ga aniq beriladi (pickSeeds) — skrinshot va
   video bir xil savol va bir xil IQ natijasini koʻrsatadi. Videodagi
   bosishlar — haqiqiy page.mouse.click. Ilovada yoʻq animatsiya (masalan,
   IQ sanagichi) chizilmaydi — natija sahnasi faqat kamera yaqinlashuvi.
   IQ raqami doim oraliq bilan; Bosh sahifa (liga kartasi, oraliqsiz
   «Oxirgi natija») ishlatilmaydi — screenGuard buni har suratda tekshiradi.
   Matnlarda liga / reyting / sertifikat, «rasmiy», Mensa, persentil, «IQ
   oshiradi», DTM, sogʻliq daʼvosi, narx («bepul») YOʻQ — tools/honesty.mjs
   (scope: store) va qoʻshimcha regexlar; topilsa skript yiqiladi.
   Tanga — «tanga»/«монеты»; «ball» faqat liga uchun (§17) — matnlarda yoʻq.
   ───────────────────────────────────────────────────────────────────── */

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn, execSync, execFileSync } from 'node:child_process';
import { goto, seed, DATE, loadChromium } from './uishots.mjs';
import { check } from './honesty.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = k => { const a = process.argv.find(x => x === `--${k}` || x.startsWith(`--${k}=`)); return a ? (a.split('=').slice(1).join('=') || true) : undefined; };
const LANGS = String(arg('lang') || 'uz,ru').split(',');
const ONLY = arg('only') ? String(arg('only')).split(',') : ['shots', 'feature', 'video', 'docs', 'sheet'];
const APP = resolve(ROOT, arg('app') || 'www/index.html');
const OUT = resolve(ROOT, arg('out') || 'resources/play-kit');
const TMP = resolve(arg('tmp') || join(OUT, '_tmp'));
const BRAND_SRC = join(OUT, 'brand-src');

let sharp;
try { sharp = (await import('sharp')).default; } catch (e) { console.error('[playkit] sharp ishlamayapti — npm rebuild sharp'); process.exit(1); }

/* ═════════════════════════════════════════════════════════════════════
   MATNLAR — hammasi lintdan oʻtadi. *soʻz* — marjon rang, | — qator
   boʻlinishi (hamma sarlavha aynan 2 qator: 8 surat bir xil setkada).
   ═════════════════════════════════════════════════════════════════════ */
/* 01 — eng koʻp koʻrinadigan surat: savol (asosiy qiymat), 02 — natija
   oraliq bilan. Bosh sahifa yoʻq: unda liga kartasi va oraliqsiz
   «Oxirgi natija: IQ …» bor (PLAY.md §8). */
export const SHOTS = [
  { n: '01', screen: 'test-picked', uz: 'Mantiqni|*sinab koʻring*',  ru: 'Проверьте|*свою логику*' },
  { n: '02', screen: 'result-test', uz: '*IQ natijasi*|va oraliq',   ru: '*Результат IQ*|и диапазон' },
  { n: '03', screen: 'explain',     uz: 'Har javobga|*izoh*',        ru: '*Разбор*|каждого ответа', zoom: 1.3 },
  { n: '04', screen: 'practice',    uz: '*4 xil*|topshiriq',         ru: '*4 типа*|заданий' },
  { n: '05', screen: 'games',       uz: '*6 ta*|IQ oʻyini',          ru: '*6 IQ-игр*|для ума' },
  { n: '06', screen: 'badges',      uz: '*Nishonlar*|yigʻing',       ru: 'Собирайте|*значки*' },
  { n: '07', screen: 'shop-badges', uz: 'Profilingizni|*bezang*',    ru: 'Украшайте|*профиль*' },
  { n: '08', screen: 'onboard-lang', uz: '*4 tilda*,|internetsiz',   ru: '*4 языка*,|без интернета' },
];

export const FEATURE = {
  uz: 'IQ test va|aql oʻyinlari',
  ru: 'IQ-тест|и игры для ума',
};

/* Video sarlavhalari (sahna id → matn).
   outro — Play uchun (promo-horizontal 30 s: doʻkon/narx soʻzi YOʻQ —
   Play preview talablari); outroCta — boshqa kesimlar (Shorts, Reels,
   reklama) uchun «Google Playʼda» (U+02BC). */
export const VCAP = {
  uz: { intro: 'IQ test va aql oʻyinlari', test: 'Mantiqni|*sinab koʻring*', result: '*IQ natijasi*|va oraliq',
        explain: 'Har javobga|*izoh*', game: '*6 ta*|IQ oʻyini', shop: 'Profilingizni|*bezang*',
        outro: 'IQ test va aql oʻyinlari', outroCta: 'Google Playʼda', outroSub: '4 tilda · Internetsiz' },
  ru: { intro: 'IQ-тест и игры для ума', test: 'Проверьте|*свою логику*', result: '*Результат IQ*|и диапазон',
        explain: '*Разбор*|каждого ответа', game: '*6 IQ-игр*|для ума', shop: 'Украшайте|*профиль*',
        outro: 'IQ-тест и игры для ума', outroCta: 'в Google Play', outroSub: '4 языка · Без интернета' },
};
/* Qaysi kesim Play uchun (doʻkon/narx eslatmasiz yakun). */
export const playSafe = (cut, W, H) => cut === 'full' && W > H;

/* Sahnalar jadvali — video VA ovoz matni shu vaqtlardan chiqadi.
   clip — yozuv nomi; lead — birinchi bosishdan oldin necha soniya koʻrinsin;
   vo — ovoz oynasi [boshi, oxiri] (sahna chegarasidan biroz ichkarida;
   intro qisqa, shuning uchun uning ovozi faqat «IQuest.»). */
export const TIMELINES = {
  full: [
    { id: 'intro',   t0: 0.0,  t1: 1.5,  vo: [0.1, 0.9] },
    { id: 'test',    t0: 1.5,  t1: 7.5,  clip: 'test',    lead: 0.7,  vo: [1.8, 7.2] },
    { id: 'result',  t0: 7.5,  t1: 11.5, clip: 'result',  lead: 0.25, vo: [7.8, 11.2] },
    { id: 'explain', t0: 11.5, t1: 15.5, clip: 'explain', lead: 0.6,  vo: [11.8, 15.2] },
    { id: 'game',    t0: 15.5, t1: 21.0, clip: 'game',    lead: 0.7,  vo: [15.8, 20.7] },
    { id: 'shop',    t0: 21.0, t1: 25.5, clip: 'shop',    lead: 0.6,  vo: [21.3, 25.2] },
    { id: 'outro',   t0: 25.5, t1: 30.0, vo: [25.8, 29.6] },
  ],
  short: [
    { id: 'intro',   t0: 0.0,  t1: 1.0,  vo: [0.1, 0.9] },
    { id: 'test',    t0: 1.0,  t1: 5.0,  clip: 'test',    lead: 0.5,  vo: [1.2, 4.7] },
    { id: 'result',  t0: 5.0,  t1: 8.5,  clip: 'result',  lead: 0.25, vo: [5.3, 8.2] },
    { id: 'game',    t0: 8.5,  t1: 12.0, clip: 'game',    lead: 0.5,  vo: [8.8, 11.7] },
    { id: 'outro',   t0: 12.0, t1: 15.0, vo: [12.2, 14.8] },
  ],
};

/* Ovoz matni: har sahna uchun bitta jumla; [p300] — 300 ms pauza (TTS uchun).
   Har qator oʻz oynasiga ≤ 5 boʻgʻin/s (sokin, «premium» oʻqish) VA 140
   soʻz/daqiqada sigʻishi shart — main() tekshiradi, sigʻmasa yiqiladi.
   Tartib ekrandagi bilan bir xil: test klipi matritsa → shakl → soʻz →
   son qatori; yakunda avval «IQuest» (logo), keyin «4 tilda…» (tugma). */
export const VO = {
  uz: {
    full: {
      intro:   'IQuest.',
      test:    'Matritsa, shakl, soʻz va sonlar: [p200] mantiqingizni sinab koʻring.',
      result:  'Test soʻngida — IQ natijasi va oraligʻi.',
      explain: 'Xato qildingizmi? [p250] Har bir javobga izoh bor.',
      game:    'Olti xil IQ oʻyini: [p150] xotira, diqqat va tezlik.',
      shop:    'Tanga yigʻing [p150] va profilingizni nishonlar bilan bezang.',
      outro:   'IQuest. [p300] Toʻrt tilda, internetsiz.',
    },
    short: {
      intro:   'IQuest.',
      test:    'Mantiqni sinab koʻring: [p150] matritsa, shakl va soʻzlar.',
      result:  'IQ natijasi — oraliq bilan.',
      game:    'Olti xil IQ oʻyini.',
      outro:   'IQuest. [p200] Toʻrt tilda, internetsiz.',
    },
  },
  ru: {
    full: {
      intro:   'IQuest.',
      test:    'Матрицы, фигуры, слова и числа: [p200] проверьте свою логику.',
      result:  'Сразу после теста — IQ и диапазон.',
      explain: 'Ошиблись? [p250] К каждому ответу — понятный разбор.',
      game:    'Шесть IQ-игр: [p150] память, внимание и скорость.',
      shop:    'Собирайте монеты [p150] и украшайте свой профиль.',
      outro:   'IQuest. [p300] Четыре языка, без интернета.',
    },
    short: {
      intro:   'IQuest.',
      test:    'Проверьте свою логику: [p150] матрицы, фигуры, слова.',
      result:  'Результат IQ — с диапазоном.',
      game:    'Шесть IQ-игр для ума.',
      outro:   'IQuest. [p200] Работает без интернета.',
    },
  },
};

/* Doʻkon aktivlarida liga/reyting/sertifikat tilga olinmaydi (PLAY.md, egasi). */
const LEAGUE = /\bliga|\bлиг[аиуеою]|reyting|рейтинг|sertifikat|сертификат|\bleague|\bcertificate|leaderboard|\branking|\bball\b|\bбалл/iu;
const PRICE = /\bbepul|бесплатн|\bfree\b/iu;
const plain = s => String(s).replace(/\*/g, '').replace(/\|/g, ' ').replace(/\[p\d+\]/g, '');
export function lintText(where, text, { play = true } = {}) {
  const t = plain(text);
  const bad = check(t, { scope: 'store' }).map(p => `${p.rule}: «${p.match}»`);
  if (LEAGUE.test(t)) bad.push('liga/reyting/sertifikat/ball: «' + t.match(LEAGUE)[0] + '»');
  if (play && PRICE.test(t)) bad.push('narx (Play preview): «' + t.match(PRICE)[0] + '»');
  if (play && /google\s*play/i.test(t)) bad.push('doʻkon nomi (Play preview): «Google Play»');
  if (bad.length) throw new Error(`[playkit] halollik (${where}): ${bad.join('; ')} — «${t}»`);
}
function lintAll() {
  for (const s of SHOTS) for (const l of ['uz', 'ru']) lintText(`shot ${s.n} ${l}`, s[l]);
  /* uz: ʻ (U+02BB) va ʼ (U+02BC) — ’ ‘ ' emas. */
  const uzAll = [...SHOTS.map(s => s.uz), FEATURE.uz, ...Object.values(VCAP.uz), ...Object.values(VO.uz.full), ...Object.values(VO.uz.short)];
  for (const t of uzAll) if (/[\u2018\u2019']/.test(t)) throw new Error(`[playkit] uz apostrof (U+2019/U+0027 emas, U+02BB/U+02BC): «${t}»`);
  for (const l of ['uz', 'ru']) {
    lintText('feature ' + l, FEATURE[l]);
    for (const [k, v] of Object.entries(VCAP[l])) lintText(`video ${k} ${l}`, v, { play: k !== 'outroCta' });
    for (const cut of ['full', 'short']) for (const [k, v] of Object.entries(VO[l][cut])) lintText(`vo ${cut} ${k} ${l}`, v);
  }
}
const voPlain = s => s.replace(/\s*\[p\d+\]\s*/g, ' ').replace(/\s+/g, ' ').trim();
const words = s => voPlain(s).split(/\s+/).filter(w => /[\p{L}\d]/u.test(w)).length;
/* Boʻgʻinlar: unli harflar soni (uz lotin: a e i o u, «oʻ» — bitta; ru:
   а е ё и о у ы э ю я). IQuest = «ay-kvest» (2), IQ = «ay-kyu» (2). */
export function syllables(s, lang) {
  let t = voPlain(s).toLowerCase().replace(/iquest/g, lang === 'ru' ? 'айквест' : 'aykvest')
    .replace(/\biq\b/g, lang === 'ru' ? 'айкью' : 'aykyu').replace(/google play/g, lang === 'ru' ? 'гугл плэй' : 'gugl pley');
  return (t.match(lang === 'ru' ? /[аеёиоуыэюя]/g : /[aeiou]/g) || []).length;
}
const pauses = s => [...s.matchAll(/\[p(\d+)\]/g)].reduce((a, m) => a + +m[1] / 1000, 0);
const dashes = s => (voPlain(s).match(/ — /g) || []).length;
/* Qator oʻqilish vaqti (s): ikki model, kattasi olinadi. */
export function voNeed(s, lang) {
  const extra = pauses(s) + 0.15 * dashes(s);
  const bySyl = syllables(s, lang) / 5 + extra, byWpm = words(s) / 140 * 60 + extra;
  return { bySyl, byWpm, need: Math.max(bySyl, byWpm), syl: syllables(s, lang), words: words(s) };
}
export function voCheck() {
  const bad = [];
  for (const lang of ['uz', 'ru']) for (const cut of ['full', 'short']) {
    const tl = TIMELINES[cut];
    for (const s of tl) {
      const line = VO[lang][cut][s.id]; if (!line) continue;
      const win = s.vo[1] - s.vo[0], n = voNeed(line, lang);
      if (n.need > win + 1e-6) bad.push(`${lang} ${cut} ${s.id}: ${n.need.toFixed(2)} s kerak, oyna ${win.toFixed(2)} s`);
    }
    const tot = Object.values(VO[lang][cut]).reduce((a, x) => a + words(x), 0);
    const [lo, hi] = cut === 'full' ? [35, 65] : [15, 30];
    if (tot < lo || tot > hi) bad.push(`${lang} ${cut}: jami ${tot} soʻz (kutilgan ${lo}–${hi})`);
  }
  for (const cut of ['full', 'short']) for (let i = 1; i < TIMELINES[cut].length; i++)
    if (TIMELINES[cut][i].vo[0] < TIMELINES[cut][i - 1].vo[1]) bad.push(`${cut}: ovoz oynalari ustma-ust`);
  if (bad.length) throw new Error('[playkit] ovoz matni oynaga sigʻmaydi:\n  ' + bad.join('\n  '));
}

/* ═════════════════════════════════════════════════════════════════════
   BREND — logo manbasidan (SVG) geometriya, shriftlar, CSS
   ═════════════════════════════════════════════════════════════════════ */
export const C = { navy: '#10183A', navyDeep: '#0C1230', navyHi: '#1B2659', coral: '#FF5B3A', coralDark: '#FF6A4B',
  white: '#FFFFFF', mist: '#AAB3D9' };

function brandGeometry() {
  const tile = readFileSync(join(BRAND_SRC, 'iquest-mark-tile.svg'), 'utf8');
  const lock = readFileSync(join(BRAND_SRC, 'iquest-lockup-dark.svg'), 'utf8');
  const rects = [...tile.matchAll(/<rect\s+([^>]*?)\/>/g)].map(m => {
    const a = {}; for (const x of m[1].matchAll(/([a-z]+)="([^"]+)"/g)) a[x[1]] = x[2]; return a;
  }).filter(a => a.x !== undefined);
  if (rects.length !== 9) throw new Error('[playkit] brand-src/iquest-mark-tile.svg: 9 ta katak kutilgan');
  const cells = rects.map((a, idx) => ({ x: +a.x, y: +a.y, w: +a.width, h: +a.height, rx: +(a.rx || 0), fill: a.fill,
    i: Math.floor(idx / 3), j: idx % 3, k: Math.floor(idx / 3) + (idx % 3), coral: !/^#fff/i.test(a.fill) }));
  const paths = [...lock.matchAll(/<path d="([^"]+)"/g)].map(m => m[1]);
  const tm = lock.match(/<g transform="translate\(([-\d.]+) ([-\d.]+)\)"><g transform="translate\(([-\d.]+) 0\)"/);
  if (!paths.length || !tm) throw new Error('[playkit] brand-src/iquest-lockup-dark.svg: wordmark topilmadi');
  const mt = lock.match(/<g transform="translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+)\) translate\(([-\d.]+) ([-\d.]+)\)">/);
  return { cells, paths, wx: +tm[1] + +tm[3], wy: +tm[2], mark: { tx: +mt[1], ty: +mt[2], s: +mt[3], ox: +mt[4], oy: +mt[5] } };
}
let GEO;
const geo = () => (GEO ||= brandGeometry());

/* Belgi (3×3) — 512 koordinatada, 118..396 oraligʻi. */
export function markSvg({ size, on = 'dark', cellFill, coralFill, opacity = 1, extra = '' }) {
  const g = geo();
  const wf = cellFill || (on === 'dark' ? C.white : C.navy), cf = coralFill || (on === 'dark' ? C.coralDark : C.coral);
  const cells = g.cells.map(c => `<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="${c.rx}" fill="${c.coral ? cf : wf}"/>`).join('');
  return `<svg viewBox="116 116 282 282" width="${size}" height="${size}" style="display:block;opacity:${opacity}" ${extra}>${cells}</svg>`;
}
/* Lockup (belgi + IQuest) — qatʼiy chegaralar bilan. */
export function lockupSvg({ h, on = 'dark' }) {
  const g = geo(), m = g.mark;
  const wf = on === 'dark' ? C.white : C.navy, cf = on === 'dark' ? C.coralDark : C.coral;
  const cells = g.cells.map(c => `<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="${c.rx}" fill="${c.coral ? cf : wf}"/>`).join('');
  const vb = [m.tx - 1, m.ty - 1, 611.5 - m.tx + 2, 206.5 - m.ty + 2];
  const w = h * vb[2] / vb[3];
  return `<svg viewBox="${vb.join(' ')}" width="${w.toFixed(1)}" height="${h}" style="display:block">
    <g transform="translate(${m.tx} ${m.ty}) scale(${m.s}) translate(${m.ox} ${m.oy})">${cells}</g>
    <g transform="translate(${g.wx} ${g.wy})" fill="${wf}">${g.paths.map(d => `<path d="${d}"/>`).join('')}</g></svg>`;
}

const FONT_DIR = join(ROOT, 'node_modules', '@fontsource');
function fontCss() {
  const f = (fam, pkg, file, w) => {
    const p = join(FONT_DIR, pkg, 'files', file);
    if (!existsSync(p)) return '';
    return `@font-face{font-family:'${fam}';font-weight:${w};src:url(data:font/woff2;base64,${readFileSync(p).toString('base64')}) format('woff2')}`;
  };
  const out = [];
  for (const w of [600, 700, 800]) for (const sub of ['latin', 'latin-ext', 'cyrillic']) out.push(f('Manrope', 'manrope', `manrope-${sub}-${w}-normal.woff2`, w));
  for (const sub of ['latin', 'latin-ext']) out.push(f('Space Grotesk', 'space-grotesk', `space-grotesk-${sub}-700-normal.woff2`, 700));
  return out.join('\n');
}
let FONTS;
const BRAND_CSS = () => `${FONTS ||= fontCss()}
:root{--navy:${C.navy};--deep:${C.navyDeep};--coral:${C.coralDark};--mist:${C.mist}}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:var(--navy);overflow:hidden}
body{font-family:Manrope,system-ui,sans-serif;color:#fff;-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
.bg{position:absolute;inset:0;overflow:hidden;background:radial-gradient(120% 75% at 50% 8%,#1A2458 0%,#121B42 42%,${C.navy} 62%,${C.navyDeep} 100%)}
.dots{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.11) 1.6px,transparent 2.2px);background-size:36px 36px;
  -webkit-mask-image:linear-gradient(180deg,rgba(0,0,0,.9),rgba(0,0,0,.15) 40%,rgba(0,0,0,0) 70%)}
.glow{position:absolute;border-radius:50%;pointer-events:none}
.cap{font-weight:800;letter-spacing:-.032em;line-height:1.06;color:#fff;text-wrap:balance}
.cap em{font-style:normal;color:var(--coral)}
.cap .ln{display:block;white-space:nowrap}
.phone{position:absolute;background:linear-gradient(155deg,#4A5274 0%,#20263F 18%,#0B0E1B 55%,#05070F 100%);
  box-shadow:0 70px 140px rgba(2,5,20,.62),0 24px 48px rgba(2,5,20,.45),inset 0 0 0 2px rgba(255,255,255,.10),inset 0 0 0 5px rgba(0,0,0,.55)}
.phone .scr{position:absolute;overflow:hidden}
.phone .scr img{position:absolute;left:0;display:block}
.phone .bar{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;justify-content:space-between;font-weight:700;z-index:2;font-feature-settings:'tnum'}
.phone .cam{position:absolute;left:50%;border-radius:50%;background:#03040A;box-shadow:0 0 0 2px rgba(255,255,255,.06);z-index:3}
`;
const capHtml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*([^*]+)\*/g, '<em>$1</em>')
  .split('|').map(l => `<span class="ln">${l}</span>`).join('');

/* Fon naqshi: katta 3×3 matritsa (logodagi burchak yumshashi bilan).
   Oq kataklar — xira toʻldirish + 1 px kontur (matritsa oʻqiladi), javob
   katagi — toʻliq marjon (#FF6A4B) ingichka halqa: logodagi «javob». */
function motif({ x, y, size, op = 0.07, fillOp = 0.022, sw = 1.2, coral = 1, coralSw = 2.2, coralFill = 0, rot = 0 }) {
  const g = geo(), k = 282 / size;                       // 1 px → viewBox birligi
  const o = sw * k, cw = coralSw * k;
  const cells = g.cells.map(c => c.coral
    ? `<rect x="${c.x + cw / 2}" y="${c.y + cw / 2}" width="${c.w - cw}" height="${c.h - cw}" rx="${(c.w - cw) / 2}" fill="${C.coralDark}" fill-opacity="${coralFill}" stroke="${C.coralDark}" stroke-opacity="${coral}" stroke-width="${cw}"/>`
    : `<rect x="${c.x + o / 2}" y="${c.y + o / 2}" width="${c.w - o}" height="${c.h - o}" rx="${Math.max(0, c.rx - o / 2)}" fill="#fff" fill-opacity="${fillOp}" stroke="#fff" stroke-opacity="${op}" stroke-width="${o}"/>`).join('');
  return `<svg viewBox="116 116 282 282" width="${size}" height="${size}" style="position:absolute;left:${x}px;top:${y}px;transform:rotate(${rot}deg)">${cells}</svg>`;
}

/* Android status qatori: soat + tarmoq + batareya. */
const statusBar = (h, col, u) => `<div class="bar" style="height:${h}px;padding:0 ${18 * u}px 0 ${22 * u}px;color:${col};font-size:${12.5 * u}px">
  <span>10:00</span><span style="display:flex;gap:${5 * u}px;align-items:center">
  <svg width="${13 * u}" height="${12 * u}" viewBox="0 0 22 20"><path d="M1 19h20V1z" fill="${col}"/></svg>
  <svg width="${15 * u}" height="${12 * u}" viewBox="0 0 26 20"><path d="M13 19 1 6a17 17 0 0 1 24 0z" fill="${col}"/></svg>
  <svg width="${22 * u}" height="${12 * u}" viewBox="0 0 38 20"><rect x="1" y="2" width="32" height="16" rx="4.5" fill="none" stroke="${col}" stroke-width="2" opacity=".85"/><rect x="4" y="5" width="23" height="10" rx="2.2" fill="${col}"/><rect x="34.5" y="7" width="2.5" height="6" rx="1" fill="${col}"/></svg></span></div>`;

/* Telefon: w — tashqi kenglik; css — ilova CSS oʻlchami (360×H). */
const APP_W = 360, APP_H = 720, BAR = 26;
function phoneGeo(w) {
  const bez = Math.round(w * 0.024), sw = w - 2 * bez, u = sw / APP_W;
  const barH = Math.round(BAR * u), ah = Math.round(APP_H * u), sh = barH + ah;
  return { w, bez, sw, u, barH, ah, sh, h: sh + 2 * bez, r: Math.round(w * 0.118) };
}
function phoneHtml({ x, y, w, inner, bg, fg, id = 'phone', style = '' }) {
  const p = phoneGeo(w);
  return `<div class="phone" id="${id}" style="left:${x}px;top:${y}px;width:${p.w}px;height:${p.h}px;border-radius:${p.r}px;${style}">
    <div class="scr" style="left:${p.bez}px;top:${p.bez}px;width:${p.sw}px;height:${p.sh}px;border-radius:${p.r - p.bez}px;background:${bg}">
      ${statusBar(p.barH, fg, p.u)}
      <div id="${id}-app" style="position:absolute;left:0;top:${p.barH}px;width:${p.sw}px;height:${p.ah}px;overflow:hidden">${inner}</div>
    </div>
    <div class="cam" style="top:${p.bez + p.barH * 0.5 - 5 * p.u}px;width:${10 * p.u}px;height:${10 * p.u}px;margin-left:${-5 * p.u}px"></div>
  </div>`;
}

/* ═════════════════════════════════════════════════════════════════════
   ILOVA HOLATI — ilova API si bilan «yashab» tayyorlanadi, soʻng
   localStorage nusxasi har surat/yozuvga qayta yuklanadi.
   ═════════════════════════════════════════════════════════════════════ */
const DAY0 = new Date(DATE).getTime();
const primed = {};
export async function prime(browser, lang) {
  if (primed[lang]) return primed[lang];
  const ctx = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.clock.setFixedTime(new Date(DAY0 - 12 * 86400000));
  await p.addInitScript(seed({ lang, theme: 'light', mode: 'full' }));
  /* Oʻyinlar tarixi (6 ta oʻyinning hammasi bir necha marta oʻynalgan) va
     kunlik faollik — uishots seed ustiga, oddiy foydalanuvchi darajasida. */
  await p.addInitScript(() => { try { const u = JSON.parse(localStorage.getItem('nz-iq-ui'));
    for (const k in u.days) u.days[k] = 20 + (k.charCodeAt(9) % 5) * 6;
    u.games = { schulte: { level: 3, best: 72, plays: 4 }, flanker: { level: 3, best: 64, plays: 3 }, 'mental-math': { level: 4, best: 68, plays: 5 },
      'matrix-memory': { level: 3, best: 7, plays: 2 }, nback: { level: 2, best: 80, plays: 2 }, sequence: { level: 4, best: 6, plays: 3 } };
    localStorage.setItem('nz-iq-ui', JSON.stringify(u)); } catch (e) {} });
  await p.goto(pathToFileURL(APP).href); await p.waitForTimeout(400);
  /* 12 kun: har kuni bitta 10 savollik mashq (≈ har 4-javob xato);
     uch marta «Xatolarim» takrorlanadi (toʻgʻri javob xatoni roʻyxatdan
     chiqaradi — ilovaning oʻz mantigʻi). */
  for (let d = 11; d >= 0; d--) {
    await p.clock.setFixedTime(new Date(DAY0 - d * 86400000 - 3 * 3600000));
    await p.evaluate(d => {
      const a = nzApp, types = ['matrix', 'series', 'spatial', 'verbal'];
      a.startPractice(d === 0 ? null : types[d % 4]);
      for (let i = 0; i < 10; i++) { const it = a.sess.current(); a.choose((i * 7 + d) % 4 === 0 ? (it.correct + 1) % it.options.length : it.correct)(); a.nextStep(); }
      a.setState({ result: null, celebrate: [] });
      if (d === 7 || d === 4 || d === 1) {
        a.startReview(a.state.ui.wrong.slice().reverse(), 'Xatolarim', 'wrong');
        for (let i = 0; i < 10 && a.sess && !a.sess.done; i++) { const it = a.sess.current(); a.choose(it.correct)(); a.nextStep(); }
        a.leaveRun(); a.setState({ result: null, celebrate: [], dialog: null });
      }
    }, d);
  }
  /* Bitta toʻliq IQ test (ikki kun oldin). */
  await p.clock.setFixedTime(new Date(DAY0 - 2 * 86400000 + 2 * 3600000));
  await p.evaluate(() => { const a = nzApp; a.startTest(); for (let i = 0; i < 30; i++) { const it = a.sess.current();
    a.choose(i % 4 === 3 ? (it.correct + 1) % it.options.length : it.correct)(); a.nextStep(); } a.setState({ result: null, celebrate: [] }); });
  await p.clock.setFixedTime(new Date(DAY0));
  await p.evaluate(() => { nzApp.checkBadges(null, true); nzApp.setState({ celebrate: [] }); try { nzProgress.flush(); } catch (e) {} });
  await p.waitForTimeout(700);
  const dump = await p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
  const info = await p.evaluate(() => ({ stats: nzProgress.stats(), badges: nzBadges.summary(), coins: nzWallet.balance(), wrong: nzApp.state.ui.wrong.length }));
  if (errs.length) throw new Error('[playkit] prime ' + lang + ': ' + errs[0]);
  await ctx.close();
  console.log(`  holat ${lang}: ${info.stats.answered} javob, seriya ${info.stats.longest} kun, nishon ${info.badges.earned}/${info.badges.total}, ${info.coins} tanga, xatolar ${info.wrong}`);
  return (primed[lang] = dump);
}

/* Savol urugʻi. Ilova sessiya urugʻini Date.now() dan oladi; bu yerda
   IQ.session.create ga aniq seed uzatiladi (ilovaning oʻz parametri) —
   skrinshot va video AYNAN bir xil savollar va IQ natijasini koʻrsatadi. */
const SEED_HOOK = () => { const S = window.IQ && IQ.session; if (!S || S.__kit) return;
  const orig = S.create; S.create = o => orig.call(S, Object.assign({}, o, window.__seed != null ? { seed: window.__seed } : {})); S.__kit = 1; };
const setSeed = (page, s) => page.evaluate(s => { window.__seed = s; }, s);

export async function openApp(browser, { lang, w = APP_W, h = APP_H, dsf = 2, flow = false }) {
  const dump = await prime(browser, lang);
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, colorScheme: 'light' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  if (flow) await page.clock.setSystemTime(new Date(DATE));      // vaqt oqadi (oʻyin taymeri)
  else await page.clock.setFixedTime(new Date(DATE));
  await page.addInitScript(([d, lang]) => { try { localStorage.clear(); for (const k in d) localStorage.setItem(k, d[k]);
    localStorage.setItem('nz-lang', lang); localStorage.setItem('nz-theme', 'light'); } catch (e) {} }, [dump, lang]);
  await page.goto(pathToFileURL(APP).href);
  await page.waitForTimeout(450);
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.evaluate(SEED_HOOK);
  return { ctx, page, errs };
}

/* Urugʻlarni tanlash (bir marta, tilga bogʻliq emas):
   test — birinchi 4 savol turi videodagi ovoz tartibida (matritsa, shakl,
          soʻz, son qatori); natija ham shu urugʻdan (skrinshot = video);
   explain — fazoviy savol: notoʻgʻri javobdan keyingi «Izoh» matni varaqqa
          TOʻLIQ sigʻadi (360×640 da ham; uz va ru) va kamida 3 band.
          (Matritsa izohlari 8-darajada 9–10 band — hech biri sigʻmaydi.) */
const EXPLAIN_TYPE = 'spatial';
const SEEDS = {};
const SEED0 = 20260925;
export async function pickSeeds(browser) {
  if (SEEDS.test) return SEEDS;
  const A = await openApp(browser, { lang: 'ru', h: 640, dsf: 1 });
  SEEDS.test = await A.page.evaluate(s0 => {
    const want = ['matrix', 'spatial', 'verbal', 'series'], types = nzApp.iqTypes();
    for (let s = s0; s < s0 + 4000; s++) {
      const ss = IQ.session.create({ mode: 'test', types, length: 30, seed: s }), got = [];
      for (let i = 0; i < 4; i++) { const it = ss.current(); got.push(it.type); ss.answer(it.correct, 0); }
      if (got.join() === want.join()) return s;
    }
    return null;
  }, SEED0);
  await A.ctx.close();
  if (SEEDS.test == null) throw new Error('[playkit] test urugʻi topilmadi');
  SEEDS.result = SEEDS.test;
  const ctxs = {};
  for (const lang of ['ru', 'uz']) ctxs[lang] = await openApp(browser, { lang, h: 640, dsf: 1 });
  for (let s = SEED0; s < SEED0 + 60; s++) {
    let ok = true;
    for (const lang of ['ru', 'uz']) {
      const P = ctxs[lang].page;
      await P.reload(); await P.waitForTimeout(250); await P.evaluate(SEED_HOOK);
      await setSeed(P, s);
      await toScreen(P, 'explain-raw');
      if (!(await sheetFits(P)) || (await sheetBullets(P)) < 3) { ok = false; break; }
    }
    if (ok) { SEEDS.explain = s; break; }
  }
  for (const A of Object.values(ctxs)) await A.ctx.close();
  if (SEEDS.explain == null) throw new Error('[playkit] izohi sigʻadigan matritsa savoli topilmadi');
  console.log(`  urugʻlar: test/natija ${SEEDS.test}, izoh ${SEEDS.explain}`);
  return SEEDS;
}

/* Varaq ichidagi aylantiriladigan qism toʻliq sigʻadimi (kesilgan qator yoʻq). */
const sheetFits = page => page.evaluate(() => {
  for (const sh of document.querySelectorAll('.nz-sheet')) for (const e of sh.querySelectorAll('*')) {
    const cs = getComputedStyle(e);
    if (/(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 1) return false;
  }
  return true;
});
const sheetBullets = page => page.evaluate(() => {
  for (const e of document.querySelectorAll('.nz-sheet *')) if (/(auto|scroll)/.test(getComputedStyle(e).overflowY)) return e.children.length;
  return 0;
});
/* Ekran tepasida yarmi kesilgan karta yoʻqmi (aylantirilgan roʻyxatlar). */
const topCut = page => page.evaluate(() => {
  const sc = document.querySelector('.nz-screens'); if (!sc || sc.scrollTop < 1) return null;
  const top = sc.getBoundingClientRect().top;
  for (const e of sc.querySelectorAll('button, [role=button]')) {
    const r = e.getBoundingClientRect(); if (!e.offsetParent || r.height < 24) continue;
    if (r.top < top - 0.5 && r.bottom > top + 2) return { text: (e.textContent || '').trim().slice(0, 24), cut: top - r.top };
  }
  return null;
});
/* Roʻyxatni sarlavhasigacha aylantiradi, tepada kesilgan karta qolsa —
   u toʻliq koʻrinadigan qilib 12 px pastga qaytaradi. */
async function scrollToHeading(page, re) {
  await page.evaluate(re => {
    const sc = document.querySelector('.nz-screens'), h = [...document.querySelectorAll('.nz-h2')].find(x => new RegExp(re).test(x.textContent));
    if (sc && h) sc.scrollTop += h.getBoundingClientRect().top - sc.getBoundingClientRect().top - 12;
  }, re);
  for (let k = 0; k < 4; k++) {
    const c = await topCut(page); if (!c) break;
    await page.evaluate(d => { document.querySelector('.nz-screens').scrollTop -= d; }, c.cut + 12);
  }
}

/* Ekran retseptlari (uishots SCREENS ustiga). */
export async function toScreen(page, screen) {
  const seeds = SEEDS;
  if (screen === 'games') {
    await goto(page, 'practice');
    await scrollToHeading(page, 'oʻyinlari|игры|games');
  } else if (screen === 'explain' || screen === 'explain-raw') {
    /* Mashq (fazoviy): notoʻgʻri javob → «Izoh» varagʻi (urugʻ — sigʻadigan savol). */
    if (screen === 'explain' && seeds.explain != null) await setSeed(page, seeds.explain);
    await goto(page, 'practice-' + EXPLAIN_TYPE, { settle: screen === 'explain-raw' ? 60 : 300 });
    await page.evaluate(() => { const a = nzApp, it = a.sess.current(); a.choose((it.correct + 1) % it.options.length)();
      a.setState({ run: Object.assign({}, a.state.run, { explain: true }) }); });
    if (screen === 'explain-raw') { await page.waitForTimeout(80); return; }
  } else if (screen === 'test-picked') {
    if (seeds.test != null) await setSeed(page, seeds.test);
    await goto(page, 'test');
    await page.evaluate(() => { const it = nzApp.sess.current(); nzApp.choose(it.correct)(); });
  } else if (screen === 'result-test') {
    if (seeds.result != null) await setSeed(page, seeds.result);
    await goto(page, 'result-test');
  } else if (screen === 'onboard-lang') {
    await goto(page, 'onboard-0');
  } else {
    await goto(page, screen);
  }
  await page.waitForTimeout(600);
}

async function screenGuard(A, where) {
  if (A.errs.length) throw new Error(`[playkit] ${where}: sahifa xatosi ${A.errs[0]}`);
  const text = await A.page.evaluate(() => document.body.innerText);
  const bad = check(text, { scope: 'store' });
  if (bad.length) throw new Error(`[playkit] ${where}: ekranda taqiqlangan daʼvo «${bad[0].match}»`);
  if (!(await sheetFits(A.page))) throw new Error(`[playkit] ${where}: varaq matni sigʻmadi (oxirgi qator kesilgan)`);
  const c = await topCut(A.page);
  if (c) throw new Error(`[playkit] ${where}: tepada kesilgan karta «${c.text}» (${c.cut.toFixed(0)} px)`);
  /* Oraliqsiz IQ raqami (PLAY.md §8): «IQ 120» bor-u oraliq yoʻq boʻlsa — yiqiladi. */
  if (/\bIQ\s*\d{2,3}\b/.test(text) && !/(Oraliq|Диапазон|Range|Оралиқ)\s*\d/i.test(text)) throw new Error(`[playkit] ${where}: oraliqsiz IQ raqami`);
  const lg = text.match(/(?:^|[^\p{L}])(liga|лига|лиги|league)(?![\p{L}])/iu);
  if (lg) throw new Error(`[playkit] ${where}: ekranda liga («${lg[1]}») — doʻkon suratiga olinmaydi`);
}

async function topColor(file) {
  const { data } = await sharp(file).extract({ left: 8, top: 4, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
  const [r, g, b] = data, lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return { bg: `rgb(${r},${g},${b})`, fg: lum > 140 ? '#151A2E' : '#F4F5FB' };
}

/* ═════════════════════════════════════════════════════════════════════
   SKRINSHOTLAR
   ═════════════════════════════════════════════════════════════════════ */
const SW = 1080, SH = 1920, S_PW = 672, S_PY = 468;
/* Setka (8 suratda bir xil): belgi 84..132, sarlavha 2 qator 176..380
   (96 px), telefon 468..1826. Sarlavha satri 940 px dan keng boʻlsa —
   shrift kichrayadi (qatorlar soni oʻzgarmaydi). */
const S_MARK = 84, S_CAP = 176, S_CAPH = 204, S_FS = 96;
async function fitCaps(p, maxW) {
  return p.evaluate(maxW => [...document.querySelectorAll('.cap[data-fit]')].map(c => {
    const fs0 = parseFloat(getComputedStyle(c).fontSize); let fs = fs0;
    const tw = l => { const r = document.createRange(); r.selectNodeContents(l); return r.getBoundingClientRect().width; };
    const widest = () => Math.max(...[...c.querySelectorAll('.ln')].map(tw));
    while (widest() > maxW && fs > fs0 * 0.7) { fs -= 2; c.style.fontSize = fs + 'px'; }
    return { fs, lines: c.querySelectorAll('.ln').length };
  }), maxW);
}
async function framedShot(browser, { file, out, cap, idx, zoom = 1 }) {
  const img = 'data:image/png;base64,' + readFileSync(file).toString('base64');
  const { bg, fg } = await topColor(file);
  const pg = phoneGeo(S_PW);
  const cx = SW / 2, cy = S_PY + pg.h / 2;                  // naqsh markazi = telefon markazi
  /* zoom > 1: telefon pastki cheti joyida qolib kattalashadi, tepasi
     sarlavha ostida fonga singib ketadi (varaq/pastki qism asosiy boʻladi). */
  const bottom = S_PY + pg.h;
  const loc = y => ((y - (bottom - pg.h * zoom)) / zoom).toFixed(0) + 'px';     // kanvas y → telefon ichki y
  const fade = [[0, 0], [70, .04], [150, .16], [230, .42], [300, .8], [350, 1]].map(([dy, a]) => `rgba(0,0,0,${a}) ${loc(S_CAP + S_CAPH + dy)}`).join(',');
  const zs = zoom > 1 ? `transform-origin:50% 100%;transform:scale(${zoom});-webkit-mask-image:linear-gradient(180deg,transparent 0,${fade})` : '';
  const html = `<!doctype html><meta charset="utf-8"><style>${BRAND_CSS()}
    .mark{position:absolute;left:0;right:0;top:${S_MARK}px;height:48px;display:flex;align-items:center;justify-content:center}
    .head{position:absolute;left:60px;right:60px;top:${S_CAP}px;height:${S_CAPH}px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;text-align:center}
  </style>
  <div class="bg">
    <div class="glow" style="width:1500px;height:1500px;left:-210px;top:520px;background:radial-gradient(circle,rgba(70,92,190,.30),rgba(70,92,190,0) 60%)"></div>
    <div class="dots"></div>
    ${motif({ x: cx - 560, y: cy - 560, size: 1120, op: 0.11, fillOp: 0.03, sw: 1.5, coralSw: 3 })}
  </div>
  <div class="mark">${idx === 0 ? lockupSvg({ h: 54, on: 'dark' }) : markSvg({ size: 46, on: 'dark' })}</div>
  <div class="head"><div class="cap" id="cap" data-fit style="font-size:${S_FS}px">${capHtml(cap)}</div></div>
  ${phoneHtml({ x: (SW - S_PW) / 2, y: S_PY, w: S_PW, bg, fg, id: 'ph', style: zs,
    inner: `<img src="${img}" style="position:absolute;left:0;top:0;width:${pg.sw}px;height:${pg.ah}px">` })}`;
  const ctx = await browser.newContext({ viewport: { width: SW, height: SH }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.setContent(html);
  await p.evaluate(() => document.fonts.ready);
  const [fit] = await fitCaps(p, SW - 140);
  await p.waitForTimeout(120);
  if (fit.lines !== 2) throw new Error(`[playkit] ${relative(ROOT, out)}: sarlavha ${fit.lines} qator (2 kerak)`);
  if (fit.fs < S_FS) console.log(`  · ${relative(ROOT, out)}: sarlavha ${fit.fs}px`);
  const buf = await p.screenshot({ type: 'png' });
  await ctx.close();
  await sharp(buf).removeAlpha().png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(out);
  if (statSync(out).size > 8 * 1024 * 1024) throw new Error(`[playkit] ${relative(ROOT, out)} > 8 MB`);
}

async function makeShots(browser) {
  await pickSeeds(browser);
  for (const lang of LANGS) {
    const dirF = join(OUT, 'screenshots', lang), dirR = join(OUT, 'raw', lang), dirT = join(TMP, 'tall', lang);
    for (const d of [dirF, dirR]) { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); }
    mkdirSync(dirT, { recursive: true });
    for (const [idx, s] of SHOTS.entries()) {
      /* raw: 360×640 @3 = 1080×1920; ramka uchun: 360×720 @2 (zamonaviy 20:9 ekran). */
      for (const [h, dsf, file] of [[640, 3, join(dirR, s.n + '.png')], [APP_H, 2, join(dirT, s.n + '.png')]]) {
        const A = await openApp(browser, { lang, h, dsf });
        await toScreen(A.page, s.screen);
        await screenGuard(A, `${s.n} ${lang} ${h}`);
        const buf = await A.page.screenshot({ type: 'png' });
        await sharp(buf).removeAlpha().png({ compressionLevel: 9 }).toFile(file);
        await A.ctx.close();
      }
      await framedShot(browser, { file: join(dirT, s.n + '.png'), out: join(dirF, s.n + '.png'), cap: s[lang], idx, zoom: s.zoom || 1 });
      console.log(`  ${lang} ${s.n} ${s.screen}`);
    }
  }
}

/* ═════════════════════════════════════════════════════════════════════
   FEATURE GRAPHIC 1024×500
   ═════════════════════════════════════════════════════════════════════ */
async function makeFeature(browser) {
  /* Play videoni qoʻshsa, grafika markaziga (512,250) «play» tugmasini
     chizadi: markaz atrofidagi ~240×240 (x 392..632) BOʻSH qoladi —
     lockup x 64..≤380, matritsa x ≥ 660. */
  for (const lang of LANGS) {
    const html = `<!doctype html><meta charset="utf-8"><style>${BRAND_CSS()}</style>
    <div class="bg" style="background:radial-gradient(90% 120% at 30% 20%,#1C275C 0%,#131C46 45%,${C.navy} 70%,${C.navyDeep} 100%)">
      <div class="dots" style="-webkit-mask-image:radial-gradient(ellipse 70% 90% at 20% 30%,#000 0%,transparent 75%)"></div>
      <div class="glow" style="width:560px;height:560px;left:600px;top:60px;background:radial-gradient(circle,rgba(255,106,75,.17),rgba(255,106,75,0) 60%)"></div>
      ${motif({ x: 664, y: 92, size: 316, op: 0.2, fillOp: 0.07, sw: 1.3, coralSw: 0, coralFill: 1 })}
    </div>
    <div id="blk" style="position:absolute;left:64px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center">
      ${lockupSvg({ h: 80, on: 'dark' })}
      <div class="cap" style="font-size:38px;font-weight:700;letter-spacing:-.012em;line-height:1.18;color:rgba(255,255,255,.88);margin-top:26px">${capHtml(FEATURE[lang])}</div>
    </div>`;
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    await p.setContent(html); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(100);
    const right = await p.evaluate(() => Math.max(...[...document.querySelectorAll('#blk svg, #blk .ln')].map(e => {
      if (e.tagName !== 'SPAN') return e.getBoundingClientRect().right; const r = document.createRange(); r.selectNodeContents(e); return r.getBoundingClientRect().right; })));
    if (right > 392) throw new Error(`[playkit] feature ${lang}: matn x=${right.toFixed(0)} — «play» tugmasi hududiga kiradi`);
    const buf = await p.screenshot({ type: 'png' });
    await ctx.close();
    const out = join(OUT, `feature-graphic-${lang}.png`);
    await sharp(buf).removeAlpha().png({ compressionLevel: 9 }).toFile(out);
    console.log('  ' + relative(ROOT, out));
  }
}

/* ═════════════════════════════════════════════════════════════════════
   PROMO VIDEO
   1) Har sahna ilovada HAQIQIY bajariladi va CDP screencast bilan
      yoziladi (360×720 @2, JPEG kadrlar + vaqt). Bosishlar —
      page.mouse.click; joyi va vaqti yoziladi (teginish halqasi).
   2) Kompozitor sahifa (brend foni, logo animatsiyasi, sarlavha,
      telefon) har kadr uchun deterministik chiziladi → JPEG → ffmpeg
      (libx264, yuv420p, 30 fps, ovozsiz).
   ═════════════════════════════════════════════════════════════════════ */
const FPS = 30;
const REC_DSF = 2;

export function findFfmpeg() {
  const c = [process.env.FFMPEG];
  try { c.push(execSync('command -v ffmpeg', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()); } catch (e) {}
  try { c.push(execSync('python3 -c "import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())"', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()); } catch (e) {}
  return c.find(p => p && existsSync(p)) || null;
}

async function centerOf(page, how) {
  return page.evaluate(h => {
    let el = null;
    if (h.sel) el = document.querySelectorAll(h.sel)[h.i || 0];
    if (h.text) {
      const re = new RegExp(h.text);
      el = Array.from(document.querySelectorAll('button, [role=button], a, div, span'))
        .filter(e => e.offsetParent && re.test((e.textContent || '').trim()))
        .sort((a, b) => a.textContent.length - b.textContent.length)[0] || null;
      while (el && el.parentElement && !/^(BUTTON|A)$/.test(el.tagName) && el.getAttribute('role') !== 'button' && getComputedStyle(el).cursor !== 'pointer') el = el.parentElement;
    }
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, how);
}
const correctIdx = page => page.evaluate(() => { const it = nzApp.sess && nzApp.sess.current(); return it ? it.correct : 0; });
const optCount = page => page.evaluate(() => { const it = nzApp.sess && nzApp.sess.current(); return it ? it.options.length : 4; });
const mathAnswer = page => page.evaluate(() => {
  const gm = nzApp.gm; if (!gm) return null; const v = gm.view(); if (!v.grid || v.phase !== 'input') return null;
  const e = String(v.display.text || v.display.uz || '').split('=')[0].replace(/×/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-');
  let val; try { val = Function('return (' + e + ')')(); } catch (x) { return null; }
  const c = v.grid.cells.find(c => +String(c.label).replace('−', '-') === val); return c ? { q: e, label: String(c.label) } : null;
});
const NEXT = '^(Keyingi|Далее|Davom etish|Продолжить)$';
const FINISH = '^(Keyingi|Далее|Natija|Результат|Yakunlash|Завершить)$';

/* Klip retseptlari: setup — yozuvdan oldin (koʻrinmaydi), run — yoziladi.
   Hamma bosish — haqiqiy page.mouse.click. */
const CLIPS = {
  test: {
    setup: async p => { await setSeed(p, SEEDS.test); await goto(p, 'test', { settle: 300 }); },
    run: async (p, tap, wait) => {
      await wait(900);
      for (let k = 0; k < 3; k++) {
        await tap({ sel: '#nz-opts > *', i: await correctIdx(p) }); await wait(650);
        await tap({ text: NEXT }); await wait(k === 2 ? 900 : 1000);
      }
    },
  },
  result: {
    /* 29 javob va 30-savolda tanlov oldindan — sahna «Yakunlash» bosishidan
       0.25 s oldin boshlanadi, natija sarlavha bilan deyarli birga chiqadi. */
    setup: async p => {
      await setSeed(p, SEEDS.result);
      await goto(p, 'test', { settle: 200 });
      await p.evaluate(() => { for (let i = 0; i < 29; i++) { const it = nzApp.sess.current();
        nzApp.choose(i % 4 === 3 ? (it.correct + 1) % it.options.length : it.correct)(); nzApp.nextStep(); }
        const it = nzApp.sess.current(); nzApp.choose(it.correct)(); });
      await p.waitForTimeout(400);
    },
    run: async (p, tap, wait) => {
      await wait(600);
      await tap({ text: FINISH });
      for (let k = 0; k < 8; k++) { await wait(50); await p.evaluate(() => nzApp.setState({ celebrate: [] })); }
      await wait(3800);
    },
  },
  explain: {
    setup: async p => { await setSeed(p, SEEDS.explain); await goto(p, 'practice-' + EXPLAIN_TYPE, { settle: 300 }); },
    run: async (p, tap, wait) => {
      await wait(900);
      const i = await correctIdx(p), n = await optCount(p);
      await tap({ sel: '#nz-opts > *', i: (i + 1) % n }); await wait(1000);
      await tap({ text: '^(Izoh|Разбор)$' }); await wait(3300);
    },
  },
  game: {
    /* Oʻyinlar roʻyxati → «Ogʻzaki hisob» → «Boshlash» → oʻyin. */
    hold: { from: 2, dur: 0.16 },
    setup: async p => { await goto(p, 'practice', { settle: 200 }); await scrollToHeading(p, 'oʻyinlari|игры|games'); await p.waitForTimeout(300); },
    run: async (p, tap, wait) => {
      await wait(900);
      await tap({ text: '^(Ogʻzaki hisob|Устный счёт)$' }); await wait(750);
      await tap({ text: '^(Boshlash|Начать)$' }); await wait(500);
      const end = Date.now() + 5200;
      let last = null;
      while (Date.now() < end) {
        const a = await mathAnswer(p);
        if (a == null || a.q === last) { await wait(40); continue; }
        await wait(last == null ? 350 : 520);             // yangi savol: yashil ramka oʻtib ketsin, keyin bosiladi
        last = a.q;
        const c = await p.evaluate(a => { const el = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === a && b.offsetParent);
          if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, a.label);
        if (c) await tap(c);
        await wait(120);
      }
    },
  },
  shop: {
    setup: async p => { await goto(p, 'shop-badges', { settle: 300 }); },
    run: async (p, tap, wait) => {
      await wait(900);
      await tap({ text: '^(Raketa|Ракета)$' }); await wait(1000);
      await tap({ sel: '.nz-sheet .nz-btn' }); await wait(650);        // 1-bosish: narx va balans
      await tap({ sel: '.nz-sheet .nz-btn' }); await wait(2200);       // 2-bosish: tasdiq → «✓ Tanlangan»
    },
  },
};

/* Ekran «imzosi»: savol/marshrut/varaq/natija/oʻyin savoli. Bosishdan
   keyin imzo oʻzgarsa — ekran almashdi, teginish halqasi oʻchadi
   (yangi ekrandagi boshqa tugma ustida qolmaydi). */
const SIG = () => {
  const a = window.nzApp; if (!a) return '';
  const s = a.state || {};
  let g = '';
  try { if (a.gm) { const v = a.gm.view(); g = (a.gm.done ? 'done:' : '') + String((v.display && (v.display.text || v.display.uz)) || '').split('=')[0].trim(); } } catch (e) {}
  let it = null;
  try { it = s.run ? (s.run.shown ? s.run.shown.item : (a.sess && a.sess.current && a.sess.current())) : null; } catch (e) {}
  const st = (s.stack || []).map(x => typeof x === 'string' ? x : (x && (x.name || x.kind || x.id)) || '?').join('/');
  return [s.tab, st, s.sheet ? 'S' : '', s.run ? s.run.kind + ':' + (it ? it.id : '') + ':' + (s.run.explain ? 'x' : '') : '',
    s.result ? 'R' : '', s.game ? 'G' : '', s.dialog ? 'D' : '', s.onboard ? 'O' : '', g].join('#');
};

async function recordClip(browser, lang, name, dir) {
  const Cl = CLIPS[name];
  const A = await openApp(browser, { lang, h: APP_H, dsf: REC_DSF, flow: true });
  const p = A.page;
  await Cl.setup(p);
  mkdirSync(dir, { recursive: true });
  const cdp = await A.ctx.newCDPSession(p);
  const frames = [], taps = [], marks = [];
  cdp.on('Page.screencastFrame', f => {
    const file = join(dir, String(frames.length).padStart(5, '0') + '.jpg');
    frames.push({ t: f.metadata.timestamp, file });
    writeFileSync(file, Buffer.from(f.data, 'base64'));
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  const t0 = Date.now() / 1000;
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: APP_W * REC_DSF, maxHeight: APP_H * REC_DSF, everyNthFrame: 1 });
  const wait = ms => p.waitForTimeout(ms);
  const tap = async how => {
    const c = how.x != null ? how : await centerOf(p, how);
    if (!c) throw new Error(`[playkit] ${name}: bosiladigan element topilmadi ${JSON.stringify(how)}`);
    taps.push({ t: Date.now() / 1000 - t0, x: c.x, y: c.y });
    await p.mouse.click(c.x, c.y);
  };
  /* Imzo kuzatuvchisi (Node tomonda, ~25 ms). */
  let polling = true, lastSig = null;
  const poller = (async () => {
    while (polling) {
      try { const sg = await p.evaluate(SIG); const t = Date.now() / 1000 - t0;
        if (sg !== lastSig) { if (lastSig !== null) marks.push(+t.toFixed(3)); lastSig = sg; } } catch (e) {}
      await new Promise(r => setTimeout(r, 25));
    }
  })();
  /* Birinchi kadr darhol boʻlsin (sahifa jim tursa screencast kadr bermaydi). */
  await p.evaluate(() => { document.body.style.outline = '0 solid transparent'; });
  await Cl.run(p, tap, wait, lang);
  await wait(250);
  polling = false; await poller;
  await cdp.send('Page.stopScreencast');
  await screenGuard(A, `klip ${name} ${lang}`);
  await A.ctx.close();
  if (!frames.length) throw new Error(`[playkit] ${name} ${lang}: kadr yoʻq`);
  for (const tp of taps) { const m = marks.find(m => m > tp.t); tp.until = m != null ? m : null; }
  const clip = { frames: frames.map(f => ({ t: f.t - t0, file: f.file })), taps, marks, dur: Date.now() / 1000 - t0 };
  writeFileSync(join(dir, 'clip.json'), JSON.stringify(clip));
  return clip;
}

const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3);
const easeIO = x => x <= 0 ? 0 : x >= 1 ? 1 : x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const easeBack = x => { if (x <= 0) return 0; if (x >= 1) return 1; const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const clamp01 = x => Math.max(0, Math.min(1, x));

function frameAt(clip, tau) {
  const f = clip.frames; let lo = 0, hi = f.length - 1;
  if (tau <= f[0].t) return f[0].file;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (f[m].t <= tau) lo = m; else hi = m - 1; }
  return f[lo].file;
}
const clipStart = (sc, clip) => Math.max(0, (clip.taps[0] ? clip.taps[0].t : 0.6) - (sc.lead != null ? sc.lead : 0.8));

/* Logo holati. Kadr 0 dan toʻliq lockup koʻrinadi (poster kadri): 8 ta oq
   katak + wordmark, javob katagi — marjon punktir halqa (ilovadagi «?»
   katagi); τ≈0.12 da marjon doira «javob» boʻlib toʻladi, halqa tarqaladi. */
function logoState(tau) {
  const g = geo();
  const cells = g.cells.map(c => {
    if (c.coral) { const q = clamp01((tau - 0.12) / 0.42); return { s: +easeBack(q).toFixed(4), o: +clamp01(q * 3).toFixed(3) }; }
    const q = clamp01((tau - 0.03 * c.k) / 0.4);
    return { s: +(0.95 + 0.05 * ease(q)).toFixed(4), o: 1 };
  });
  const pop = clamp01((tau - 0.12) / 0.42);
  return { cells, slot: +(1 - clamp01(pop * 2.5)).toFixed(3), ring: +clamp01((tau - 0.3) / 0.75).toFixed(3) };
}

/* Kamera: telefon oʻlchami (s) va tepasi (y, kanvasda). Sahnalar orasida
   kesim (0.15 s ilova fonida «dip») bor — kamera u yerda sakraydi. */
function camPose(lay, a) {
  const s = a.s, h = lay.ph.h * s;
  let y;
  if (a.anchor === 'bottom') y = lay.H - lay.camBottom - h;
  else if (a.anchor === 'top') y = a.m != null ? a.m : lay.py;
  else y = a.cy - s * (lay.ph.bez + lay.ph.barH + a.app * lay.ph.u);
  return { s, y };
}
function camAt(lay, sc, clip, tau) {
  const keys = (lay.cams[sc.id] || [{ s: 1, anchor: lay.defAnchor }]);
  const at = k => k.at == null ? -1e9 : k.tap != null ? (clip.taps[k.tap] ? clip.taps[k.tap].t : 1e9) + k.at : k.at;
  let cur = camPose(lay, keys[0]);
  for (let i = 1; i < keys.length; i++) {
    const nx = camPose(lay, keys[i]), p = easeIO((tau - at(keys[i])) / (keys[i].dur || 0.8));
    cur = { s: cur.s + (nx.s - cur.s) * p, y: cur.y + (nx.y - cur.y) * p };
  }
  return cur;
}

function stateAt(t, tl, clips, lay) {
  const first = tl[0], last = tl[tl.length - 1], D = first.t1;
  const st = { t, introO: 0, outroO: 0, taps: [], cap: [], layer: null, dip: 0, ph: { x: 0, y: 0, s: 1, o: 0 } };
  /* intro: 0..D — lockup kadr 0 dan; D−0.6 dan yuqoriga chiqib yoʻqoladi */
  const long = D >= 1.5, fadeAt = D - (long ? 0.65 : 0.5), riseAt = D - (long ? 0.7 : 0.55);
  if (t < D + 0.05) {
    st.intro = logoState(t);
    const out = easeIO(clamp01((t - fadeAt) / 0.38));
    st.introO = +(1 - out).toFixed(3); st.introY = +(-50 * out).toFixed(1); st.introS = +(1 - 0.04 * out).toFixed(4);
  }
  /* outro: telefon 0.5 s da ketadi; lockup 0.1 dan, matn 0.4, tugma 0.6 → 1.0 s da toʻliq */
  const oT = t - last.t0;
  if (oT > 0) {
    st.outro = logoState(oT - 0.1);
    st.outroO = +ease(clamp01((oT - 0.1) / 0.35)).toFixed(3);
    st.outTxt = +ease(clamp01((oT - 0.4) / 0.4)).toFixed(3);
    st.outPill = +ease(clamp01((oT - 0.6) / 0.4)).toFixed(3);
    st.outroS = +(0.95 + 0.05 * ease(clamp01((oT - 0.1) / 0.5)) + 0.02 * clamp01(oT / (last.t1 - last.t0))).toFixed(4);
  }
  /* telefon: intro oxirida pastdan chiqadi, outro boshida pastga ketadi */
  const inP = easeIO(clamp01((t - riseAt) / (D - riseAt))), outP = easeIO(clamp01(oT / 0.5));
  const rise = (1 - inP) + outP;
  st.ph.o = +Math.min(clamp01((t - riseAt) / 0.2), 1 - clamp01((oT - 0.05) / 0.4)).toFixed(3);
  const scenes = tl.filter(s => s.clip);
  let cam = null;
  scenes.forEach((sc, k) => {
    const clip = clips[sc.clip], s0 = clipStart(sc, clip);
    const a = k === 0 ? D - 0.8 : sc.t0, b = k === scenes.length - 1 ? sc.t1 + 0.6 : sc.t1;
    if (t >= a && t < b) {
      const tau = s0 + (t - sc.t0);
      /* Oʻyinda yangi savol chiqqach ilova eski yashil ramkani ~0.13 s
         soʻndiradi (yangi savolning notoʻgʻri katagida). Oʻsha 0.16 s
         kesiladi: eski kadr biroz uzoqroq turadi, keyin toza yangi savol. */
      let tauF = tau;
      if (CLIPS[sc.clip].hold) for (const tp of clip.taps.slice(CLIPS[sc.clip].hold.from))
        if (tp.until != null && tau >= tp.until && tau < tp.until + CLIPS[sc.clip].hold.dur) tauF = tp.until - 0.02;
      st.layer = frameAt(clip, tauF);
      cam = camAt(lay, sc, clip, tau);
      for (const tp of clip.taps) {
        const d = tau - tp.t, life = tp.until != null ? Math.max(0.04, Math.min(0.45, tp.until - tp.t)) : 0.45;
        if (d > -0.18 && d < life && tp.t >= s0 - 0.05 && tp.t <= s0 + (sc.t1 - sc.t0)) st.taps.push({ x: tp.x / APP_W, y: tp.y / APP_H, d: +d.toFixed(3), life: +life.toFixed(3) });
      }
    }
    if (k > 0) st.dip = Math.max(st.dip, +clamp01(1 - Math.abs(t - sc.t0) / 0.075).toFixed(3));
    /* sarlavha: kiradi (0.45 s, pastdan), chiqadi (0.28 s) */
    const cin = ease((t - sc.t0 - 0.05) / 0.45), cout = clamp01((t - (sc.t1 - 0.3)) / 0.28);
    const o = Math.min(cin, 1 - cout);
    if (o > 0.001) st.cap.push({ k, o: +o.toFixed(3), dy: +((1 - cin) * 40 - cout * 20).toFixed(1) });
  });
  cam = cam || { s: lay.cams.test ? camPose(lay, lay.cams.test[0]).s : 1, y: lay.py };
  const drift = 1 + 0.008 * Math.sin(t * 0.55);
  st.ph.s = +(cam.s * drift).toFixed(5);
  st.ph.y = +(cam.y + rise * (lay.H - cam.y + 60)).toFixed(1);
  st.ph.x = +(lay.cx - lay.ph.w * st.ph.s / 2).toFixed(1);
  return st;
}

/* Joylashuv. Vertikal — ijtimoiy tarmoqlar uchun xavfsiz: muhim bosishlar
   y ≤ 1450 (Reels/TikTok/Shorts pastki qatlami ostida qolmaydi).
   Gorizontal (Play) — telefon oʻngda (62 %), sarlavha chapda; kamera
   har sahnada faol joyga yaqinlashadi (javoblar, IQ doirasi, varaq). */
function layoutFor(W, H) {
  const horiz = W > H;
  if (!horiz) {
    const pw = 540, ph = phoneGeo(pw), py = 400;
    return { W, H, horiz, pw, ph, py, cx: W / 2, camBottom: 0, defAnchor: 'top',
      cams: { result: [{ s: 1, anchor: 'top' }, { tap: 0, at: 0.35, dur: 1.0, s: 1.18, anchor: 'top' }] },
      capBox: { left: 60, width: W - 120, top: 160, height: 220, align: 'center', fs: 92 },
      lockH: 150, tagFs: 54 };
  }
  const pw = 500, ph = phoneGeo(pw), TOP = { s: 1.22, anchor: 'top', m: 22 };
  return { W, H, horiz, pw, ph, py: (H - ph.h) / 2, cx: 1190, camBottom: 26, defAnchor: 'bottom',
    /* Telefon tepasi koʻrinadi, pasti kadrdan chiqib ketadi (savol matni,
       rasm va variantlar — 1.22×); varaq ochilganda kamera pastga suriladi. */
    cams: {
      test:    [TOP],
      result:  [TOP, { tap: 0, at: 0.3, dur: 0.9, s: 1.62, app: 150, cy: 430 }],
      explain: [TOP, { tap: 0, at: 0.25, dur: 0.6, s: 1.45, anchor: 'bottom' }],
      game:    [TOP, { tap: 1, at: 0.1, dur: 0.7, s: 1.55, app: 330, cy: 540 }],
      shop:    [TOP, { tap: 0, at: 0.1, dur: 0.7, s: 1.45, anchor: 'bottom' }],
    },
    capBox: { left: 120, width: 640, top: 0, height: H, align: 'left', fs: 92 },
    lockH: 170, tagFs: 50 };
}

function videoHtml({ W, H, L, cta, tl }) {
  const lay = layoutFor(W, H), horiz = lay.horiz, pg = lay.ph;
  const g = geo();
  const cellsSvg = id => g.cells.map((c, n) => `<rect id="${id}c${n}" x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="${c.rx}" fill="${c.coral ? C.coralDark : '#fff'}" style="transform-box:fill-box;transform-origin:50% 50%"/>`).join('');
  const m = g.mark, c8 = g.cells[8];
  const vbX = m.tx - 1, vbY = m.ty - 1, vbW = 611.5 - m.tx + 2, vbH = 206.5 - m.ty + 2;
  const lockSvg = (id, h) => `<svg viewBox="${vbX} ${vbY} ${vbW} ${vbH}" width="${(h * vbW / vbH).toFixed(1)}" height="${h}" style="display:block;overflow:visible">
    <g transform="translate(${m.tx} ${m.ty}) scale(${m.s}) translate(${m.ox} ${m.oy})">
      <circle id="${id}ring" cx="${c8.x + c8.w / 2}" cy="${c8.y + c8.h / 2}" r="40" fill="none" stroke="${C.coralDark}" stroke-width="6" opacity="0"/>
      <circle id="${id}slot" cx="${c8.x + c8.w / 2}" cy="${c8.y + c8.h / 2}" r="${c8.w / 2 - 3}" fill="none" stroke="${C.coralDark}" stroke-width="5" stroke-dasharray="11 8" opacity="1"/>
      ${cellsSvg(id)}</g>
    <g transform="translate(${g.wx} ${g.wy})" fill="#fff">${g.paths.map(d => `<path d="${d}"/>`).join('')}</g></svg>`;
  const cb = lay.capBox;
  const scenes = tl.filter(s => s.clip);
  const caps = scenes.map((sc, k) => `<div class="cap" id="cap${k}" data-fit style="opacity:0;font-size:${cb.fs}px">${capHtml(L[sc.id])}</div>`).join('');
  const mcx = lay.cx, mcy = horiz ? 560 : lay.py + pg.h / 2, msz = horiz ? 1100 : 1000;
  const LAY = { W, H, horiz, pw: lay.pw, g8: { w: c8.w } };
  return `<!doctype html><meta charset="utf-8"><style>${BRAND_CSS()}
  .capbox{position:absolute;display:flex;flex-direction:column;justify-content:center}
  .capbox .cap{position:absolute;left:0;right:0;text-align:${cb.align}}
  #phone{transform-origin:0 0;will-change:transform}
  #phone-app img{position:absolute;left:0;top:0;width:${pg.sw}px;height:${pg.ah}px;display:block}
  #dip{position:absolute;inset:0;background:#F6F5FB;opacity:0}
  .tp{position:absolute;border-radius:50%;pointer-events:none}
  .ctr{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
  .tag{font-weight:700;letter-spacing:-.015em;color:#DCE1F4}
  .pill{display:inline-flex;align-items:center;gap:.5em;border-radius:999px;background:rgba(255,255,255,.07);border:2px solid rgba(255,255,255,.14);font-weight:700;color:#E8EBF7}
  </style>
  <div class="bg" id="bg">
    <div class="glow" style="width:${W * 1.4}px;height:${W * 1.4}px;left:${-W * .2}px;top:${horiz ? -W * .45 : H * .22}px;background:radial-gradient(circle,rgba(70,92,190,.28),rgba(70,92,190,0) 60%)"></div>
    <div class="glow" style="width:${W * .9}px;height:${W * .9}px;left:${horiz ? W * .62 : W * .35}px;top:${horiz ? H * .35 : H * .6}px;background:radial-gradient(circle,rgba(255,106,75,.12),rgba(255,106,75,0) 62%)"></div>
    <div class="dots"></div>
    <div id="motif" style="position:absolute;inset:0">${motif({ x: mcx - msz / 2, y: mcy - msz / 2, size: msz, op: 0.1, fillOp: 0.028, sw: 1.5, coralSw: 3 })}</div>
    ${horiz ? '' : `<div id="botlock" style="position:absolute;left:0;right:0;top:${lay.py + pg.h + 120}px;display:flex;justify-content:center;opacity:0">${lockupSvg({ h: 56, on: 'dark' })}</div>`}
  </div>
  ${phoneHtml({ x: 0, y: 0, w: lay.pw, bg: '#F6F5FB', fg: '#151A2E', id: 'phone', inner: '<img id="i0"><div id="dip"></div><div id="taps"></div>' })}
  <div class="capbox" id="capbox" style="left:${cb.left}px;width:${cb.width}px;top:${cb.top}px;height:${cb.height}px">${caps}</div>
  <div class="ctr" id="intro"><div id="introIn" style="display:flex;flex-direction:column;align-items:center">
    ${lockSvg('a', lay.lockH)}
    <div class="tag" style="font-size:${lay.tagFs}px;margin-top:${horiz ? 44 : 56}px">${capHtml(L.intro)}</div></div></div>
  <div class="ctr" id="outro"><div id="outroIn" style="display:flex;flex-direction:column;align-items:center">
    ${lockSvg('b', lay.lockH)}
    <div class="cap" id="outTxt" style="font-size:${horiz ? 72 : 76}px;margin-top:${horiz ? 50 : 64}px">${capHtml(cta ? L.outroCta : L.outro)}</div>
    <div class="pill" id="outPill" style="font-size:${horiz ? 36 : 40}px;padding:.6em 1.2em;margin-top:${horiz ? 38 : 48}px">${capHtml(L.outroSub)}</div></div></div>
  <script>
  const LAY = ${JSON.stringify(LAY)};
  const $ = id => document.getElementById(id);
  function logo(id, s) {
    if (!s) return;
    s.cells.forEach((c, n) => { const r = $(id + 'c' + n); r.style.transform = 'scale(' + c.s + ')'; r.style.opacity = c.o; });
    const ring = $(id + 'ring'), q = s.ring, r0 = LAY.g8.w / 2;
    ring.setAttribute('r', (r0 * (1 + 0.9 * q)).toFixed(2)); ring.setAttribute('opacity', (q > 0 && q < 1 ? 0.8 * (1 - q) : 0).toFixed(3));
    $(id + 'slot').setAttribute('opacity', s.slot);
  }
  window.apply = async st => {
    $('intro').style.opacity = st.introO; $('introIn').style.transform = 'translateY(' + (st.introY || 0) + 'px) scale(' + (st.introS || 1) + ')';
    logo('a', st.intro);
    $('outro').style.opacity = st.outroO; logo('b', st.outro);
    $('outTxt').style.opacity = st.outTxt || 0; $('outTxt').style.transform = 'translateY(' + (1 - (st.outTxt || 0)) * 26 + 'px)';
    $('outPill').style.opacity = st.outPill || 0; $('outPill').style.transform = 'translateY(' + (1 - (st.outPill || 0)) * 20 + 'px)';
    $('outroIn').style.transform = 'scale(' + (st.outroS || 1) + ')';
    $('motif').style.transform = 'translateY(' + (-st.t * 2).toFixed(1) + 'px)';
    $('motif').style.opacity = 0.35 + 0.65 * st.ph.o;
    if ($('botlock')) $('botlock').style.opacity = 0.9 * st.ph.o;
    const ph = $('phone');
    ph.style.opacity = st.ph.o;
    ph.style.transform = 'translate(' + st.ph.x + 'px,' + st.ph.y + 'px) scale(' + st.ph.s + ')';
    const im = $('i0'), waits = [];
    if (st.layer) { const src = 'file://' + st.layer; if (im.dataset.src !== src) { im.dataset.src = src; im.src = src; waits.push(im.decode().catch(() => {})); } }
    $('dip').style.opacity = st.dip;
    const tw = $('phone-app').clientWidth, th = $('phone-app').clientHeight, u = tw / ${APP_W};
    $('taps').innerHTML = st.taps.map(tp => {
      const x = tp.x * tw, y = tp.y * th;
      if (tp.d < 0) { const q = 1 + tp.d / 0.18, r = 22 * u; return '<div class="tp" style="left:' + (x - r) + 'px;top:' + (y - r) + 'px;width:' + 2 * r + 'px;height:' + 2 * r + 'px;opacity:' + q + ';background:rgba(16,24,58,.16);border:' + (2.5 * u) + 'px solid rgba(255,106,75,.95)"></div>'; }
      const p = Math.min(1, tp.d / tp.life), r = (22 + 26 * p) * u, o = 1 - p;
      return '<div class="tp" style="left:' + (x - r) + 'px;top:' + (y - r) + 'px;width:' + 2 * r + 'px;height:' + 2 * r + 'px;background:rgba(255,106,75,' + (.22 * o) + ');border:' + (3 * u) + 'px solid rgba(255,106,75,' + (.95 * o) + ')"></div>';
    }).join('');
    document.querySelectorAll('#capbox .cap').forEach(c => { c.style.opacity = 0; });
    for (const c of st.cap) { const el = $('cap' + c.k); el.style.opacity = c.o; el.style.transform = 'translateY(' + c.dy + 'px)'; }
    await Promise.all(waits);
  };
  </script>`;
}

async function renderVideo(browser, { lang, W, H, cut, clips, out, ffmpeg }) {
  const L = VCAP[lang], tl = TIMELINES[cut], lay = layoutFor(W, H);
  const hf = join(TMP, `compose-${lang}-${cut}-${W}x${H}.html`);
  writeFileSync(hf, videoHtml({ W, H, L, tl, cta: !playSafe(cut, W, H) }));
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(hf).href);
  await page.evaluate(() => document.fonts.ready);
  /* Sarlavhalar: 2 qator, har satr ustunga sigʻadi (kerak boʻlsa shrift kichrayadi). */
  const fits = await fitCaps(page, lay.capBox.width);
  fits.forEach((f, k) => { if (f.lines !== 2) throw new Error(`[playkit] video ${lang} sarlavha ${k}: ${f.lines} qator`); });
  const dur = tl[tl.length - 1].t1, N = Math.round(dur * FPS);
  const ff = spawn(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2',
    '-r', String(FPS), '-g', String(FPS), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exit ' + c))));
  for (let i = 0; i < N; i++) {
    await page.evaluate(st => window.apply(st), stateAt(i / FPS, tl, clips, lay));
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await done;
  await ctx.close();
}

export const videoName = (cut, W, H, lang) => `${cut === 'full' ? 'promo' : 'promo15'}-${W > H ? 'horizontal' : 'vertical'}-${W}x${H}${lang === 'uz' ? '' : '-' + lang}.mp4`;

async function makeVideos(browser) {
  const ffmpeg = findFfmpeg();
  if (!ffmpeg) throw new Error('[playkit] ffmpeg topilmadi — `pip install imageio-ffmpeg` yoki FFMPEG=/yoʻl/ffmpeg');
  console.log('  ffmpeg: ' + ffmpeg);
  await pickSeeds(browser);
  const vdir = join(OUT, 'video'); mkdirSync(vdir, { recursive: true });
  for (const lang of LANGS) {
    const clips = {};
    for (const name of Object.keys(CLIPS)) {
      const dir = join(TMP, 'clips', lang, name);
      if (arg('reuse-clips') && existsSync(join(dir, 'clip.json'))) { clips[name] = JSON.parse(readFileSync(join(dir, 'clip.json'), 'utf8')); continue; }
      rmSync(dir, { recursive: true, force: true });
      clips[name] = await recordClip(browser, lang, name, dir);
      const c = clips[name];
      console.log(`  ${lang} klip ${name}: ${c.frames.length} kadr, ${c.dur.toFixed(1)} s, ${c.taps.length} bosish (halqa: ${c.taps.map(t => t.until != null ? (t.until - t.t).toFixed(2) : '–').join(' ')})`);
    }
    const only = arg('cut') ? String(arg('cut')).split(',') : Object.keys(TIMELINES);
    const sizes = arg('orient') === 'h' ? [[1920, 1080]] : arg('orient') === 'v' ? [[1080, 1920]] : [[1080, 1920], [1920, 1080]];
    for (const cut of only) for (const [W, H] of sizes) {
      const out = join(vdir, videoName(cut, W, H, lang));
      const t = Date.now();
      await renderVideo(browser, { lang, W, H, cut, clips, out, ffmpeg });
      console.log(`  ${relative(ROOT, out)}  (${((Date.now() - t) / 1000).toFixed(0)} s)`);
    }
  }
}

/* ═════════════════════════════════════════════════════════════════════
   HUJJATLAR: VOICEOVER.md, voiceover/*.txt, README.md
   ═════════════════════════════════════════════════════════════════════ */
const fmtT = s => { const m = Math.floor(s / 60), r = s - m * 60; return `${String(m).padStart(2, '0')}:${r.toFixed(1).padStart(4, '0')}`; };
const LANG_NAME = { uz: 'Oʻzbekcha (lotin)', ru: 'Русский' };
const MUX = cut => `ffmpeg -i video.mp4 -i vo.wav -map 0:v -map 1:a -c:v copy -af apad -c:a aac -t ${cut === 'full' ? 30 : 15} out.mp4`;
const TTS_HINTS = {
  uz: [
    'Ohang — sokin, ishonchli, «premium»; baqirmaslik, sotuvchi ohangi emas. Tezlik ≈ 140 soʻz/daqiqa, lekin asosiy mezon — **≤ 5 boʻgʻin/s** (jadvaldagi «boʻgʻin/s» ustuni — oynaga nisbatan, pauzalarsiz; skript hammasini ≤ 5 da ushlaydi).',
    '[p200] — 200 ms pauza (SSML: `<break time="200ms"/>`). «—» (tire) — qisqa pauza ~150 ms.',
    'Talaffuz: **IQuest** = «ay-kvest» (urgʻu 2-boʻgʻinda: ay-KVEST); **IQ** = «ay-kyu». SSML fayllarda bu `<sub alias>` bilan yozilgan.',
    'Urgʻu (ovoz bilan ajratish): *sinab koʻring*, *oraligʻi*, *izoh*, *olti*, *bezang*, *internetsiz*. Oʻzbekcha soʻz urgʻusi odatda oxirgi boʻgʻinda.',
    'ʻ (U+02BB) va ʼ (U+02BC) belgilari — TTS tanimasa «o‘», «g‘» yoki oddiy apostrof bilan almashtiring.',
    'Raqamlar soʻz bilan yozilgan (olti, toʻrt) — shunday oʻqilsin.',
  ],
  ru: [
    'Интонация спокойная, уверенная, «премиальная»; без рекламного крика. Темп ≈ 140 слов/мин, но главный критерий — **≤ 5 слогов/с** (столбец «слог/с» — относительно окна без пауз; скрипт держит все строки ≤ 5).',
    '[p200] — пауза 200 мс (SSML: `<break time="200ms"/>`). «—» (тире) — короткая пауза ~150 мс.',
    'Произношение: **IQuest** = «ай-квЕст» (ударение на 2-й слог); **IQ** = «ай-кьЮ» (IQ-игр = «ай-кью игр»). В SSML это задано через `<sub alias>`.',
    'Ударения: мАтрицы, фигУры, диапазОн, разбОр, внимАние, скОрость, украшАйте, интернЕта.',
    'Логические акценты: *проверьте*, *диапазон*, *разбор*, *шесть*, *профиль*, *без интернета*.',
    'Числа написаны словами (шесть, четыре) — так и читать.',
  ],
};
const xml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
function ssmlLine(line, lang) {
  const IQQ = lang === 'ru' ? 'ай квест' : 'ay kvest', IQ = lang === 'ru' ? 'ай кью' : 'ay kyu';
  return xml(line).replace(/IQuest/g, '\u0001').replace(/\bIQ\b/g, '\u0002')
    .replace(/\s*\[p(\d+)\]\s*/g, ' <break time="$1ms"/> ').replace(/ — /g, ' <break time="150ms"/> ')
    .replace(/\u0001/g, `<sub alias="${IQQ}">IQuest</sub>`).replace(/\u0002/g, `<sub alias="${IQ}">IQ</sub>`).replace(/\s+/g, ' ').trim();
}
function makeDocs() {
  const vd = join(OUT, 'voiceover'); rmSync(vd, { recursive: true, force: true }); mkdirSync(vd, { recursive: true });
  const md = [];
  md.push('# IQuest — promo video: ovoz matni / текст озвучки', '');
  md.push('> `node tools/mkplaykit.mjs --only=docs` yozadi. Vaqtlar videodagi sahnalar bilan **aynan bir xil** (`TIMELINES` — `tools/mkplaykit.mjs`); har qatorning oynaga sigʻishi skriptda tekshiriladi (≤ 5 boʻgʻin/s va 140 soʻz/daqiqa, pauza va tire bilan) — sigʻmasa skript yiqiladi.', '');
  md.push('> Videoda ovoz yoʻq. TTS/diktor ovozini qoʻshish (video uzunligi saqlanadi, ovoz qisqa boʻlsa oxiri jimlik bilan toʻldiriladi):', '>', '> ```sh', `> ${MUX('full')}   # 30 s`, `> ${MUX('short')}   # 15 s (promo15-*)`, '> ```', '');
  md.push('Halollik: matnlar `tools/honesty.mjs` (scope: store) dan oʻtgan — «IQ oshiradi», «rasmiy», persentil, liga/reyting, narx («bepul») va doʻkon nomi yoʻq (CONTRACT §6, PLAY.md; Play preview talablari).', '');
  md.push('Ekrandagi yakun: **Play videosi** (`promo-horizontal-1920x1080*.mp4`, 30 s) — «IQ test va aql oʻyinlari» / «IQ-тест и игры для ума»; qolgan kesimlar (vertikal, 15 s) — «Google Playʼda» / «в Google Play». Ovoz matni hammasida bir xil.', '');
  for (const lang of ['uz', 'ru']) {
    md.push(`## ${LANG_NAME[lang]}`, '');
    for (const cut of ['full', 'short']) {
      const tl = TIMELINES[cut], vo = VO[lang][cut];
      const total = tl.reduce((n, s) => n + (vo[s.id] ? words(vo[s.id]) : 0), 0);
      const dur = tl[tl.length - 1].t1;
      const T = lang === 'uz'
        ? { h: 'soʻz', w: 'nutq oynalarida', cols: '| Sahna (video) | Ovoz oynasi | Sahna | Ekranda (sarlavha) | Ovoz | Soʻz | Boʻgʻin | Boʻgʻin/s | Kerak / oyna |' }
        : { h: 'слов', w: 'в окнах речи', cols: '| Сцена (видео) | Окно речи | Сцена | На экране (титр) | Голос | Слов | Слогов | Слог/с | Нужно / окно |' };
      const speech = tl.reduce((n, s) => n + (vo[s.id] ? s.vo[1] - s.vo[0] : 0), 0);
      md.push(`### ${cut === 'full' ? '30 s' : '15 s'} — ${T.h}: ${total} (${dur} s; ${T.w} ≈ ${Math.round(total / speech * 60)} wpm)`, '');
      md.push(`Video: \`video/${videoName(cut, 1080, 1920, lang)}\`, \`video/${videoName(cut, 1920, 1080, lang)}\` · TTS: \`voiceover/${lang}-${cut === 'full' ? '30' : '15'}s.txt\` / \`.ssml\``, '');
      md.push(T.cols, '|---|---|---|---|---|---|---|---|---|');
      for (const s of tl) {
        const cap = s.id === 'outro' ? `${VCAP[lang].outro} (Play) / ${VCAP[lang].outroCta} · ${VCAP[lang].outroSub}` : VCAP[lang][s.id];
        const line = vo[s.id], n = line ? voNeed(line, lang) : null, win = s.vo[1] - s.vo[0];
        const rate = n ? (n.syl / Math.max(0.1, win - pauses(line) - 0.15 * dashes(line))).toFixed(1) : '—';
        md.push(`| ${fmtT(s.t0)}–${fmtT(s.t1)} | ${fmtT(s.vo[0])}–${fmtT(s.vo[1])} | ${s.id} | ${plain(cap).replace(/\s+/g, ' ')} | ${line || '—'} | ${n ? n.words : 0} | ${n ? n.syl : 0} | ${rate} | ${n ? n.need.toFixed(1) + ' / ' + win.toFixed(1) + ' s' : '—'} |`);
      }
      md.push('', lang === 'uz'
        ? 'Eng aniq sinxron: har qatorni **alohida** TTS qiling va «Ovoz oynasi» boshiga qoʻying. «Kerak» — 5 boʻgʻin/s (yoki 140 soʻz/daqiqa, qaysi uzun boʻlsa) + pauzalar; hammasi oynadan qisqa, tezlashtirish kerak emas. Butun matnni bitta faylda oʻqitsangiz, SSML dagi pauzalar qatorlarni taxminan shu vaqtlarga qoʻyadi.'
        : 'Точнее всего: озвучить **каждую строку отдельно** и поставить на начало «Окна речи». «Нужно» — 5 слогов/с (или 140 слов/мин, что дольше) + паузы; все строки короче окна, ускорять не нужно. При озвучке одним файлом паузы из SSML ставят строки примерно на эти же тайминги.', '');
      const tag = `${lang}-${cut === 'full' ? '30' : '15'}s`;
      writeFileSync(join(vd, `${tag}.txt`), tl.map(s => vo[s.id]).filter(Boolean).map(voPlain).join('\n') + '\n');
      /* SSML: qatorlar orasidagi pauza = keyingi oyna boshi − (oldingi oyna boshi + kerakli vaqt). */
      const locale = lang === 'uz' ? 'uz-UZ' : 'ru-RU';
      const body = []; let end = 0;
      for (const s of tl) {
        const line = vo[s.id]; if (!line) continue;
        const gap = Math.round(Math.max(0.2, Math.min(3, s.vo[0] - end)) * 1000);
        body.push(`  <break time="${gap}ms"/>${ssmlLine(line, lang)}`);
        end = s.vo[0] + voNeed(line, lang).need;
      }
      writeFileSync(join(vd, `${tag}.ssml`), `<?xml version="1.0" encoding="UTF-8"?>
<!-- IQuest ${cut === 'full' ? '30 s' : '15 s'} (${lang}). Azure TTS: kontentni <voice name="${lang === 'uz' ? 'uz-UZ-MadinaNeural' : 'ru-RU-SvetlanaNeural'}"> … </voice> ichiga oling
     (yoki ${lang === 'uz' ? 'uz-UZ-SardorNeural' : 'ru-RU-DmitryNeural'}); Google TTS <speak> ni shundayligicha qabul qiladi. -->
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${locale}">
${body.join('\n')}
</speak>
`);
    }
    md.push(lang === 'uz' ? '### TTS koʻrsatmalari' : '### Подсказки для TTS', '');
    for (const h of TTS_HINTS[lang]) md.push('- ' + h);
    md.push('');
  }
  writeFileSync(join(OUT, 'VOICEOVER.md'), md.join('\n'));
  writeFileSync(join(OUT, 'README.md'), readmeText());
  console.log('  VOICEOVER.md, voiceover/*.txt|ssml, README.md');
}

function readmeText() {
  const shots = SHOTS.map(s => `| ${s.n} | \`${s.screen}\` | ${plain(s.uz)} | ${plain(s.ru)} |`).join('\n');
  return `# IQuest — Google Play marketing kit

Hammasi **\`node tools/mkplaykit.mjs\`** bilan yaratiladi. Savol urugʻlari qatʼiy (\`pickSeeds\`), shuning uchun qayta
ishga tushirsangiz — xuddi shu savollar, xuddi shu IQ natijasi, xuddi shu kompozitsiya va matnlar; skrinshot va videodagi
test/natija/izoh ham **bir xil** (bitta urugʻ).
Brend: egasi tasdiqlagan **«01 Matrix»** logo (navy \`#10183A\`, marjon \`#FF5B3A\` / qorongʻi fonda \`#FF6A4B\`),
manba — \`brand-src/\` (uchta SVG). Shriftlar: Manrope 700/800 (sarlavhalar, kirill ham), wordmark — Space Grotesk 700 (konturlangan).
Ilova suratlari — **haqiqiy ilova** (Playwright, yigʻilgan \`www/index.html\`), soxta UI yoʻq.

## Fayllar va Play Console'da qayerga

| Fayl | Nima | Qayerga |
|---|---|---|
| \`screenshots/uz/01..08.png\` | 1080×1920 PNG (alfasiz, < 8 MB), brend foni + 2 qatorli sarlavha + telefon | **Grow users → Store presence → Main store listing → Graphics → Phone screenshots** (asosiy til *uz*). Tartib: 01 → 08 (birinchi 2–3 tasi qidiruvda koʻrinadi) |
| \`screenshots/ru/01..08.png\` | xuddi shu, ruscha sarlavhalar | Oʻsha sahifa → **Manage translations → Russian (ru-RU)** → Graphics → Phone screenshots |
| \`feature-graphic-uz.png\`, \`feature-graphic-ru.png\` | 1024×500 PNG: lockup + qisqa shior (IQ test va aql oʻyinlari); markaz (play tugmasi joyi) boʻsh | **Main store listing → Graphics → Feature graphic** (uz — asosiy, ru — tarjimada). **Asosiy variant — shu.** \`resources/brand/play/feature-graphic-1024x500-*.jpg\` da «Bepul»/«Reklamasiz» tugmalari bor — Play preview talablari narx/aksiya matnini taqiqlaydi; brend jamoasi ularni olib tashlasa, istalganini yuklash mumkin |
| \`video/promo-horizontal-1920x1080.mp4\` (uz), \`…-ru.mp4\` | **Play videosi**: 30 s, 1920×1080, 30 fps, H.264, ovozsiz; yakunda doʻkon/narx soʻzi yoʻq | Play fayl qabul qilmaydi: ovozni qoʻshib (VOICEOVER.md) **YouTube'ga oddiy video** qilib yuklang (Public yoki Unlisted), soʻng **Main store listing → Graphics → Video** maydoniga havola (ru tarjimasiga — \`…-ru.mp4\` ning havolasi). Havola faqat \`https://www.youtube.com/watch?v=…\` koʻrinishida: **Shorts, playlist yoki kanal havolasi va qoʻshimcha parametrlar (\`&t=\`, \`&list=\`…) qabul qilinmaydi**; yosh cheklovi yoʻq, reklama (monetizatsiya) oʻchiq, «embedding» yoqiq |
| \`video/promo-vertical-1080x1920.mp4\` (uz), \`…-ru.mp4\` | 30 s vertikal; yakunda «Google Playʼda». Muhim bosishlar y ≤ 1450 (pastki qatlam ostida qolmaydi) | YouTube Shorts, Instagram Reels, TikTok, Telegram. **Play'ga emas** (≤ 60 s vertikal YouTube'da Shorts boʻlib qoladi, Play Shorts havolasini qabul qilmaydi) |
| \`video/promo15-*.mp4\` | 15 s qisqa versiya (vertikal + gorizontal), yakunda «Google Playʼda» | Reklama (Google Ads App campaigns), Stories |
| \`VOICEOVER.md\` | uz + ru diktor matni, sahna vaqtlari, boʻgʻin/s, TTS koʻrsatmalari, ovozni qoʻshish buyrugʻi | — |
| \`voiceover/{uz,ru}-{30,15}s.txt\` | TTS ga toʻgʻridan-toʻgʻri qoʻyiladigan matn (har sahna — bitta qator) | — |
| \`voiceover/{uz,ru}-{30,15}s.ssml\` | SSML 1.0 (\`xml:lang\`, pauzalar, IQuest/IQ talaffuzi \`<sub alias>\`) | — |
| \`raw/{uz,ru}/01..08.png\` | 1080×1920 ramkasiz ilova suratlari (360×640 @3) — oʻsha retseptlar | Sayt, ijtimoiy tarmoq, koʻrik. **Play'ga yuklash uchun emas**: 640 px balandlikda uzun roʻyxatlar (natija, nishonlar) pastki chetdan davom etadi — telefondagidek, lekin doʻkon suratida chala koʻrinadi. Play uchun — \`screenshots/\` |
| \`contact-sheet.png\` | hamma suratlar + video kadrlari (koʻrik uchun) | yuklanmaydi |
| \`brand-src/*.svg\` | logo manbasi | yuklanmaydi |

Ikonka 512×512 — \`resources/brand/play/\` (\`npm run brand\`); bu paketda ikonka yoʻq.
\`brand-src/\` — egasi tasdiqlagan «01 Matrix» manbasi (\`resources/brand/logo/\` dagi eksportlar bilan bir xil shakl).

### Skrinshotlar

| № | Ekran (retsept) | uz | ru |
|---|---|---|---|
${shots}

- Holat ilovaning oʻzi bilan «yashab» tayyorlanadi: \`alisher_k\` profili (boyoʻgʻli avatar, bio), 12 kun ketma-ket mashq,
  uch marta «Xatolarim» takrorlash, bitta toʻliq IQ test, ilova bergan nishonlar va tangalar.
- **Bosh sahifa ishlatilmaydi**: unda liga kartasi va oraliqsiz «Oxirgi natija: IQ …» bor (PLAY.md §8: oraliqsiz IQ raqami
  va liga doʻkon suratiga tushmaydi). Skript har suratda tekshiradi: oraliqsiz IQ raqami, «liga», taqiqlangan daʼvo,
  varaqda kesilgan qator, tepada yarmi kesilgan karta — topilsa yiqiladi.
- 02 va video natija sahnasidagi «+230 ball» — natija ekranining oʻzida (liga ballari, CONTRACT §17 dagi soʻz); kamera IQ raqami va oraliqqa qaratilgan.
- 03 — izoh varagʻi: telefon 1.3× (pastki qismi — varaq — asosiy), savol toʻliq sigʻadigan qilib tanlangan.
- 08 — birinchi ishga tushirishdagi til tanlash ekrani (haqiqiy UI, 4 til).

### Video sahnalari (30 s)

${TIMELINES.full.map(s => `- ${fmtT(s.t0)}–${fmtT(s.t1)} **${s.id}** — ${plain(s.id === 'outro' ? VCAP.uz.outro + ' (Play) / ' + VCAP.uz.outroCta + ' · ' + VCAP.uz.outroSub : VCAP.uz[s.id])}`).join('\n')}

- Kadr 0 dan toʻliq lockup (poster kadri); marjon «javob» katagi 0.1 s da toʻladi, telefon 0.75 s da chiqa boshlaydi.
- Ilova qismlari — haqiqiy bosishlar (Playwright \`mouse.click\`, CDP screencast). Marjon halqa — teginish koʻrsatkichi; ekran almashishi bilan oʻchadi.
- Sahnalar orasida 0.15 s ilova fonida kesim (ikki ekran ustma-ust tushmaydi). Gorizontal versiyada kamera faol joyga yaqinlashadi.
- Natija sahnasida faqat kamera yaqinlashadi: ilovada IQ sanagichi yoʻq, shuning uchun chizilmagan; raqam doim oraliq bilan.

## Qayta yaratish

\`\`\`sh
# 1) Ilovani yigʻish (repo'ni ifloslamaslik uchun nusxada):
mkdir -p /tmp/iq && cd /home/user/IQuest && tar cf - --exclude=./node_modules --exclude=./android --exclude=./.git \\
  --exclude=./www --exclude=./dist . | (cd /tmp/iq && tar xf -) && ln -sfn $PWD/node_modules /tmp/iq/node_modules
(cd /tmp/iq && node build.mjs)
# 2) ffmpeg: PATH da boʻlmasa —  pip install imageio-ffmpeg   (yoki FFMPEG=/yoʻl/ffmpeg)
# 3) Paket:
node tools/mkplaykit.mjs --app=/tmp/iq/www/index.html                 # hammasi (~20 daqiqa)
node tools/mkplaykit.mjs --app=… --only=shots,feature,sheet           # faqat rasmlar
node tools/mkplaykit.mjs --app=… --only=video --lang=uz --cut=full    # faqat 30 s uz video (--orient=h|v)
node tools/mkplaykit.mjs --only=docs                                  # README, VOICEOVER (ilova kerak emas)
\`\`\`

Talablar: global Playwright + Chromium (\`npm root -g\`), \`sharp\` (loyihada bor), ffmpeg (libx264).
Matnlar skript boshida (\`SHOTS\`, \`VCAP\`, \`VO\`, \`TIMELINES\`); hammasi \`tools/honesty.mjs\`, liga/reyting, narx va doʻkon nomi
regexlaridan oʻtadi, ovoz qatorlari oʻz oynasiga sigʻishi tekshiriladi — xato boʻlsa skript toʻxtaydi.

Ovozni qoʻshish (video uzunligi saqlanadi):

\`\`\`sh
${MUX('full')}     # 30 s
${MUX('short')}     # promo15-*
\`\`\`

## Play talablari (tekshirilgan)

- Skrinshot: PNG, 1080×1920 (9:16), alfa-kanalsiz, har biri ≤ 8 MB; 2–8 ta.
- Feature graphic: 1024×500 PNG, alfa-kanalsiz; markazda play tugmasi uchun joy boʻsh.
- Preview asset'larda narx/aksiya («bepul»), doʻkon nomi/nishoni, reyting va «№1» daʼvolari yoʻq.
- Promo video: faqat oddiy YouTube havolasi \`https://www.youtube.com/watch?v=…\`; Shorts, playlist yoki kanal havolasi va
  qoʻshimcha parametrlar qabul qilinmaydi; yosh cheklovi yoʻq; reklamasiz (monetizatsiya oʻchiq); «embeddable»; gorizontal tavsiya etiladi.
`;
}

/* ═════════════════════════════════════════════════════════════════════
   KONTAKT VARAGʻI
   ═════════════════════════════════════════════════════════════════════ */
async function makeSheet() {
  const ffmpeg = findFfmpeg();
  const kf = join(TMP, 'keyframes'); mkdirSync(kf, { recursive: true });
  const TW = 216, TH = 384, GAP = 18, PAD = 48;
  const rows = [];
  for (const lang of ['uz', 'ru']) {
    const row = SHOTS.map(s => join(OUT, 'screenshots', lang, s.n + '.png')).filter(existsSync);
    if (row.length) rows.push({ label: `Phone screenshots — ${lang}`, files: row, w: TW, h: TH });
  }
  const fg = ['uz', 'ru'].map(l => join(OUT, `feature-graphic-${l}.png`)).filter(existsSync);
  if (fg.length) rows.push({ label: 'Feature graphic — uz, ru', files: fg, w: 740, h: 361 });
  if (ffmpeg) for (const [cut, W, H] of [['full', 1080, 1920], ['full', 1920, 1080]]) {
    const v = join(OUT, 'video', videoName(cut, W, H, 'uz'));
    if (!existsSync(v)) continue;
    const ts = W < H ? [0, 2.2, 4.5, 10.0, 14.2, 18.5, 23.5, 28.5] : [0, 4.5, 10.0, 14.2, 18.5, 28.5];
    const files = [];
    for (const t of ts) {
      const f = join(kf, `${W}x${H}-${t}.png`);
      execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-ss', String(t), '-i', v, '-frames:v', '1', f]);
      files.push(f);
    }
    rows.push(W < H ? { label: `Video vertical (uz) — ${ts.map(t => t + 's').join(', ')}`, files, w: TW, h: TH }
                    : { label: `Video horizontal (uz) — ${ts.map(t => t + 's').join(', ')}`, files: files, w: 482, h: 271, wrap: 3 });
  }
  const width = PAD * 2 + 8 * TW + 7 * GAP;
  let y = PAD;
  const comps = [], labels = [];
  for (const r of rows) {
    labels.push({ y, text: r.label });
    y += 44;
    const per = r.wrap || Math.floor((width - 2 * PAD + GAP) / (r.w + GAP));
    for (let i = 0; i < r.files.length; i++) {
      const cx = PAD + (i % per) * (r.w + GAP), cy = y + Math.floor(i / per) * (r.h + GAP);
      comps.push({ input: await sharp(r.files[i]).resize(r.w, r.h).png().toBuffer(), left: cx, top: cy });
    }
    y += Math.ceil(r.files.length / per) * (r.h + GAP) + 26;
  }
  const height = y + PAD - 26;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${labels.map(l =>
    `<text x="${PAD}" y="${l.y + 28}" font-family="Manrope, DejaVu Sans, sans-serif" font-size="24" font-weight="700" fill="#C9CFEA">${l.text.replace(/&/g, '&amp;')}</text>`).join('')}</svg>`;
  comps.unshift({ input: Buffer.from(svg), left: 0, top: 0 });
  const out = join(OUT, 'contact-sheet.png');
  await sharp({ create: { width, height, channels: 3, background: '#0A0F26' } }).composite(comps).png({ compressionLevel: 9 }).toFile(out);
  console.log('  ' + relative(ROOT, out) + ` (${width}×${height})`);
}

/* ═════════════════════════════════════════════════════════════════════
   CLI
   ═════════════════════════════════════════════════════════════════════ */
async function main() {
  lintAll();
  voCheck();
  mkdirSync(TMP, { recursive: true });
  const needApp = ONLY.some(x => ['shots', 'video'].includes(x)) || arg('probe');
  if (needApp && !existsSync(APP)) { console.error(`[playkit] ${APP} yoʻq — avval node build.mjs (yoki --app=…)`); process.exit(1); }
  const needBrowser = needApp || ONLY.includes('feature');
  const browser = needBrowser ? await loadChromium().launch() : null;
  try {
    if (arg('probe')) {
      const dir = join(TMP, 'probe'); mkdirSync(dir, { recursive: true });
      await pickSeeds(browser);
      for (const lang of LANGS) for (const sc of String(arg('probe')).split(',')) {
        const A = await openApp(browser, { lang, h: +(arg('h') || APP_H) }); await toScreen(A.page, sc);
        try { await screenGuard(A, `probe ${sc} ${lang}`); } catch (e) { console.log('  ⚠ ' + e.message); }
        await A.page.screenshot({ path: join(dir, `${sc}-${lang}.png`) }); await A.ctx.close();
      }
      console.log('  probe → ' + dir);
      return;
    }
    if (ONLY.includes('shots')) await makeShots(browser);
    if (ONLY.includes('feature')) await makeFeature(browser);
    if (ONLY.includes('video')) await makeVideos(browser);
  } finally { if (browser) await browser.close(); }
  if (ONLY.includes('docs')) makeDocs();
  if (ONLY.includes('sheet')) await makeSheet();
  if (!arg('keep-tmp')) rmSync(TMP, { recursive: true, force: true });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
