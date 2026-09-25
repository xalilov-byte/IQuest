/* ─────────────────────────────────────────────────────────────────────────
   GOOGLE PLAY EKRAN SURATLARI  →  resources/brand/play/

   Ishga tushirish:  node tools/mkplay.mjs            (npm run play:assets)
                     node tools/mkplay.mjs --lang=ru --only=home,result
                     node tools/mkplay.mjs --app=/boshqa/www/index.html
   Oldin:            npm run build                    (www/index.html kerak)

   Chiqadi (ARXITEKTURA §12.3): har til uchun 6 ta telefon surati,
     screenshot-<n>-<ekran>-1080x1920-<til>.png   — viewport 360×640 @3.
   1080×1920 = 16:9; eski 1170×2532 (2,16:1) Play'ning 2:1 chegarasidan
   oshardi. Ikonka 512 va sarlavha rasmi endi `npm run brand` da
   (tools/brand.html → resources/brand/play/).

   ── HALOLLIK (CONTRACT §6, ARXITEKTURA §12.4, §16-2) ─────────────────
   Suratlar HAQIQIY ilovadan (www/index.html), maket emas. IQ natijasi
   o'ylab topilmaydi: natija surati ilovada haqiqatan o'tilgan testdan
   (qat'iy javob naqshi bilan). Reyting tabi surat sifatida ISHLATILMAYDI.
   Suratdagi matn taqiqlangan da'volar uchun tekshiriladi.

   ── UI HALI QAYTA QURILMOQDA (WP7) ────────────────────────────────────
   Har ekran — kichik "retsept". Avval tools/uishots.mjs (WP7) dan
   `export async function goto(page, screen, opts)` qidiriladi; bo'lsa u
   ishlatiladi (ekran nomlari pastdagi SCREENS kalitlari). Bo'lmasa
   window.nzApp ilgaklari (startTest, startPractice, openGame, nav,
   setState) bilan o'tiladi. Ekranga o'tib bo'lmasa surat TASHLANADI va
   ogohlantirish chiqadi — skript yiqilmaydi, keyin qayta ishga
   tushiriladi. Til uchun 2 tadan kam surat chiqsa — xato (Play talabi).
   ───────────────────────────────────────────────────────────────────── */

import { readFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import { join, dirname, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Playwright loyihaning bog'liqligi emas (har o'rnatishga 100+ MB).
   Avval loyihadan, keyin global o'rnatilganidan. */
export async function loadChromium(tag = 'mkplay') {
  try { return (await import('playwright')).chromium; } catch (e) {}
  try {
    const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
    return createRequire(join(root, 'noop.js'))('playwright').chromium;
  } catch (e) {}
  console.error(`[${tag}] playwright topilmadi:\n  npm i -g playwright  (brauzer: CHROME=/yo'l/chrome)`);
  process.exit(1);
}
export const CHROME = process.env.CHROME ||
  ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p => existsSync(p));

/* Ilova tili: i18n.js 'nz-lang' kalitini o'qiydi. */
const APP_LANG = { uz: 'uz', ru: 'ru', 'uz-cyrl': 'uz-cyrl', en: 'en' };

/* Suratdagi matnda bo'lmasligi kerak bo'lgan da'volar (§6). */
export const FORBIDDEN_SHOT = [
  /rasmiy\s+IQ/i, /sertifikatlangan/i, /akkreditatsiya/i, /Mensa/i, /persentil/i,
  /aholining\s+\d+/i, /официальн\w*\s+IQ/i, /сертифицирован/i, /перцентил/i,
  /IQ['ʼʻ’]?(ingiz)?ni\s+\d+\s+ball/i,
];

/* ── Ekran retseptlari ──────────────────────────────────────────────── */
const wait = ms => new Promise(r => setTimeout(r, ms));
/* fn sahifa ichida bajariladi (Playwright uni o'zi uzatadi — CSP eval'ni
   to'sgani uchun eval ishlatilmaydi). true qaytmasa — ekranga o'tilmadi. */
async function hook(p, fn) {
  const r = await p.evaluate(fn).catch(e => 'xato: ' + e.message.split('\n')[0]);
  if (r !== true) throw new Error(typeof r === 'string' ? r : 'ekranga oʻtilmadi');
}
async function clickText(p, re) {
  const loc = p.getByText(re).first();
  if (!(await loc.count())) throw new Error('tugma topilmadi: ' + re);
  await loc.click();
}
export const SCREENS = {
  home: async () => {},
  'test-question': async p => hook(p, () => { const app = window.nzApp; if (!app) return 'window.nzApp yoʻq';
    if (typeof app.startTest !== 'function') return 'startTest yoʻq';
    app.startTest(); return true;
  }),
  /* Haqiqiy test: 30 savolga qat'iy naqsh bilan javob (≈65% to'g'ri). */
  result: async p => {
    await hook(p, () => { const app = window.nzApp; if (!app) return 'window.nzApp yoʻq'; if (typeof app.startTest !== 'function') return 'startTest yoʻq'; app.startTest(); return true; });
    for (let i = 0; i < 80; i++) {
      const more = await p.evaluate(i => {
        const app = window.nzApp, s = app.sess;
        const it = s && typeof s.current === 'function' && s.current();
        if (!it || !app.state.run) return false;
        const right = (i * 7) % 20 < 13;
        app.commit(right ? it.correct : (it.correct + 1) % it.options.length);
        return true;
      }, i);
      if (!more) break;
      await wait(30);
    }
    const ok = await p.evaluate(() => !!(window.nzApp.state && window.nzApp.state.result));
    if (!ok) throw new Error('natija ekrani ochilmadi');
  },
  practice: async p => hook(p, () => { const app = window.nzApp; if (!app) return 'window.nzApp yoʻq';
    if (typeof app.nav === 'function') { app.nav('practice')(); return true; }
    app.setState({ tab: 'practice' }); return app.state.tab === 'practice' || 'practice tab yoʻq';
  }),
  'practice-explain': async p => {
    await hook(p, () => { const app = window.nzApp; if (!app) return 'window.nzApp yoʻq'; if (typeof app.startPractice !== 'function') return 'startPractice yoʻq'; app.startPractice('series'); return true; });
    await wait(300);
    await hook(p, () => { const app = window.nzApp; if (!app) return 'window.nzApp yoʻq';
      const it = app.sess && app.sess.current && app.sess.current();
      if (!it || typeof app.choose !== 'function') return 'savol yoʻq';
      const f = app.choose(it.correct); if (typeof f === 'function') f();
      return true;
    });
    await wait(300);
    await clickText(p, /^(Izoh|Объяснение|Пояснение|Изоҳ|Explanation)$/);
  },
  game: async p => {
    await hook(p, () => { const app = window.nzApp; if (!app) return 'window.nzApp yoʻq'; if (typeof app.openGame !== 'function') return 'openGame yoʻq'; app.openGame('schulte'); return true; });
    await wait(300);
    await clickText(p, /^(Boshlash|Начать|Бошлаш|Start)$/);
    await wait(900);
  },
  profile: async p => hook(p, () => { const app = window.nzApp; if (!app) return 'window.nzApp yoʻq';
    if (typeof app.nav === 'function') { app.nav('profile')(); return true; }
    app.setState({ tab: 'profile' }); return true;
  }),
};

/* Play uchun 6 ta surat (tartib = do'kondagi tartib). Reyting yo'q (§12.4). */
export const PLAY_SHOTS = [
  { name: 'bosh',   screen: 'home',             theme: 'dark'  },
  { name: 'test',   screen: 'test-question',    theme: 'light' },
  { name: 'natija', screen: 'result',           theme: 'light' },
  { name: 'mashq',  screen: 'practice',         theme: 'light' },
  { name: 'izoh',   screen: 'practice-explain', theme: 'dark'  },
  { name: 'oyin',   screen: 'game',             theme: 'light' },
];

let UISHOTS;
async function uishotsGoto() {
  if (UISHOTS !== undefined) return UISHOTS;
  const f = join(ROOT, 'tools', 'uishots.mjs');
  UISHOTS = null;
  // Faqat `export ... function goto` bo'lsa import qilinadi (CLI skript ishga tushib ketmasin).
  if (existsSync(f) && /export\s+(async\s+)?function\s+goto\b/.test(readFileSync(f, 'utf8'))) {
    try { UISHOTS = (await import(pathToFileURL(f).href)).goto; } catch (e) { UISHOTS = null; }
  }
  return UISHOTS;
}

/* Bitta ekranning surati. Muvaffaqiyatsiz bo'lsa Error otadi. */
export async function captureScreen(browser, { appUrl, screen, lang, theme, width = 360, height = 640, dsf = 3, path }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dsf, colorScheme: theme });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(String(e.message || e)));
  try {
    await p.addInitScript(l => { try { localStorage.setItem('nz-lang', l); } catch (e) {} }, APP_LANG[lang] || lang);
    await p.goto(appUrl);
    await p.waitForTimeout(900);
    const ext = await uishotsGoto();
    let done = false;
    if (ext) { try { done = (await ext(p, screen, { lang, theme })) === true; } catch (e) { done = false; } }
    if (!done) {
      if (!SCREENS[screen]) throw new Error('nomaʼlum ekran: ' + screen);
      await SCREENS[screen](p);
    }
    await p.waitForTimeout(600);
    await p.evaluate(() => document.fonts && document.fonts.ready);
    const text = await p.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));
    if (errors.length) throw new Error('sahifa xatosi: ' + errors[0]);
    if (text.length < 40) throw new Error('ekran deyarli boʻsh');
    const bad = FORBIDDEN_SHOT.find(re => re.test(text));
    if (bad) throw new Error('taqiqlangan daʼvo ekranda: ' + bad);
    await p.screenshot({ path });
    return true;
  } finally {
    await ctx.close();
  }
}

/* ── CLI ─────────────────────────────────────────────────────────────── */
async function main() {
  const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1];
  const langs = (arg('lang') || 'uz,ru').split(',');
  const only = arg('only') ? arg('only').split(',') : null;
  const app = resolve(ROOT, arg('app') || 'www/index.html');
  const OUT = join(ROOT, 'resources', 'brand', 'play');
  if (!existsSync(app)) { console.error(`[mkplay] ${app} yoʻq — avval \`npm run build\``); process.exit(1); }
  let sharp;
  try { sharp = (await import('sharp')).default; } catch (e) { console.error('[mkplay] sharp ishlamayapti — npm rebuild sharp'); process.exit(1); }
  mkdirSync(OUT, { recursive: true });

  const chromium = await loadChromium('mkplay');
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  let fail = false;
  for (const lang of langs) {
    const made = [], skipped = [];
    if (!only) for (const f of readdirSync(OUT)) if (f.startsWith('screenshot-') && f.endsWith(`-${lang}.png`)) rmSync(join(OUT, f));
    for (const [i, s] of PLAY_SHOTS.entries()) {
      if (only && !only.includes(s.name)) continue;
      const path = join(OUT, `screenshot-${i + 1}-${s.name}-1080x1920-${lang}.png`);
      try {
        await captureScreen(b, { appUrl: pathToFileURL(app).href, screen: s.screen, lang, theme: s.theme, path });
        const m = await sharp(path).metadata();
        if (m.width !== 1080 || m.height !== 1920) throw new Error(`oʻlcham ${m.width}×${m.height}`);
        made.push(path);
      } catch (e) { skipped.push(`${s.name}: ${e.message}`); }
    }
    console.log(`\n[mkplay] ${lang}: ${made.length} ta surat → resources/brand/play/`);
    for (const f of made) console.log('  ' + f.replace(ROOT + '/', ''));
    for (const s of skipped) console.log('  ⚠ tashlandi · ' + s);
    if (!only && made.length < 2) fail = true;
  }
  await b.close();
  console.log('\nHar suratni KOʻZ BILAN tekshiring: Reyting tabi, oraliqsiz IQ raqami, ' +
              'ishlamaydigan funksiya boʻlmasin (ARXITEKTURA §12.4).');
  if (fail) { console.error('[mkplay] biror tilda 2 tadan kam surat — Play kamida 2 ta talab qiladi.'); process.exit(1); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
