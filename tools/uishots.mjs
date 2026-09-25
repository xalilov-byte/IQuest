/* ─────────────────────────────────────────────────────────────────────────
   UI SURATLARI VA JOYLASHUV TEKSHIRUVI (ARXITEKTURA §14.5)

   Nima qiladi: yigʻilgan ilovani (www/) Chromium'da ochadi, har ekran va
   varaqni tanlangan oʻlcham × til × temada suratga oladi va uchta
   narsani TEKSHIRADI:
     1. konsol xatosi yoʻq (pageerror / console.error);
     2. savol ekranida BARCHA variantlar pastki panel ustida (F01) — ≥ 360×780
        da bitta ham variant panel ostida qolsa yiqiladi;
     3. layout shift: qatʼiy elementlar (IQ kartasi, vazifa qatorlari,
        yordam qatorlari, xarid varagʻi, sozlamalar qatori, profil bio/
        vitrina) holat oʻzgarganda aynan oʻsha joyda va oʻlchamda qoladi;
        rus va kirillda sarlavhalar «…» ga kesilmaydi.

   Deterministik: soat qatʼiy (--date), boshlangʻich maʼlumot bir xil
   (seed). Play skrinshotlari uchun: --sizes=360x640 --scale=3 → 1080×1920.
   tools/mkplay.mjs shu fayldan goto() va seed() ni oladi.

   Ishga tushirish (CI da emas, global Playwright kerak):
     node build.mjs && node tools/uishots.mjs
     node tools/uishots.mjs --out=shots --sizes=360x780,390x844 --langs=uz,ru --themes=light
     node tools/uishots.mjs --screens=home,settings --check=0
   ───────────────────────────────────────────────────────────────────── */

import { mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/* Playwright: loyiha bogʻliqligi emas — global oʻrnatilgan nusxa
   (mkog/mkplay dagi naqsh). Brauzer yuklab olinmaydi. */
export function loadChromium() {
  let pw;
  try { pw = require('playwright'); }
  catch (e) {
    const root = execSync('npm root -g').toString().trim();
    pw = require(join(root, 'playwright'));
  }
  return pw.chromium;
}

export const DATE = '2026-09-25T10:00:00';

/* Boshlangʻich holat: birinchi kirish oʻtilgan, bir necha kunlik ball,
   profil va Xatolarim toʻla. mode: 'full' | 'empty' | 'new' (birinchi kirish).
   Qaytaradi: page.addInitScript() uchun tayyor skript MATNI. */
export function seed(opts) {
  const o = Object.assign({ lang: 'uz', theme: 'light', mode: 'full', today: DATE.slice(0, 10) }, opts || {});
  return '(' + seedFn.toString() + ')(' + JSON.stringify(o) + ');';
}
function seedFn(o) {
  {
    try {
      localStorage.clear();
      localStorage.setItem('nz-lang', o.lang);
      localStorage.setItem('nz-theme', o.theme);
      if (o.mode === 'new') return;
      localStorage.setItem('nz-settings', JSON.stringify({ v: 1, sound: false, haptics: false,
        remind: { on: false, h: 19, m: 0 }, streakRemind: false, onboard: { done: true, at: 1, from: '1.1.0' },
        tips: { testIntro: true } }));
      if (o.mode === 'empty') return;
      const t = Date.UTC(+o.today.slice(0, 4), +o.today.slice(5, 7) - 1, +o.today.slice(8, 10));
      const days = {};
      for (let i = 0; i < 16; i++) {
        const d = new Date(t - i * 86400000);
        days[d.toISOString().slice(0, 10)] = 30 + ((i * 37) % 60);
      }
      localStorage.setItem('nz-iq-ui', JSON.stringify({ v: 1, wrong: ['matrix:3:11', 'series:2:5', 'verbal:3:7', 'spatial:4:9'],
        saved: ['matrix:4:21'], games: { schulte: { level: 3, best: 72, plays: 3 }, flanker: { level: 2, best: 64, plays: 1 } }, days }));
      localStorage.setItem('nz-profile', JSON.stringify({ v: 1, username: 'alisher_k', bio: 'Mantiq va shaxmat ishqibozi.',
        color: 'teal', avatar: { kind: 'preset', id: 'owl' }, showcase: null, updatedAt: 1 }));
    } catch (e) { /* xotira ishlamasa — boʻsh holat */ }
  }
}

/* Ekranlar — har biri ilovani SHU holatga olib boradi (window.nzApp).
   Nomi fayl nomi ham. */
export const SCREENS = [
  'home', 'home-resume', 'home-done', 'practice', 'league', 'profile', 'profile-empty',
  'settings', 'edit', 'edit-error', 'badges', 'shop', 'shop-badges',
  'sheet-lang', 'sheet-theme', 'sheet-time', 'sheet-avatar', 'sheet-buy', 'sheet-buy-short', 'sheet-buy-done',
  'sheet-badge', 'sheet-coinHelp', 'sheet-testIntro',
  'onboard-0', 'onboard-1', 'onboard-2', 'onboard-3', 'onboard-4', 'onboard-5',
  'test', 'test-picked', 'practice-matrix', 'practice-spatial', 'practice-verbal', 'practice-answered', 'explain',
  'result-test', 'result-practice', 'game-intro', 'game-play', 'game-paused', 'game-over',
  'celebrate', 'celebrate-summary', 'dialog', 'toast',
];

const reset = () => {
  const a = window.nzApp;
  a.stopGameTimer(); a.gm = null; a.sess = null;
  a.setState({ celebrate: [], sheet: null, dialog: null, stack: [], run: null, result: null, game: null,
               onboard: null, edit: null, toast: null, tab: 'home' });
};

/* Sahifani (seed bilan yuklangan) berilgan ekranga olib boradi. */
export async function goto(page, screen, opts) {
  const o = opts || {};
  const run = (fn, arg) => page.evaluate(fn, arg);
  await run(reset);
  await page.waitForTimeout(60);
  const s = screen;
  if (s === 'home-resume') await run(() => { nzApp.startTest(); for (let i = 0; i < 12; i++) { nzApp.choose(i % 3)(); nzApp.nextStep(); } nzApp.leaveRun(); });
  if (s === 'home-done') await run(() => { nzApp.startTest(); for (let i = 0; i < 30; i++) { nzApp.choose(1)(); nzApp.nextStep(); } nzApp.setState({ result: null, celebrate: [] }); });
  if (s === 'practice') await run(() => nzApp.nav('practice')());
  if (s === 'league') await run(() => nzApp.nav('league')());
  if (s === 'profile' || s === 'profile-empty') await run(() => nzApp.nav('profile')());
  if (s === 'settings') await run(() => { nzApp.setState({ notifAvailable: true }); nzApp.push('settings'); });
  if (s === 'edit') await run(() => nzApp.openEdit());
  if (s === 'edit-error') {
    await run(() => nzApp.openEdit());
    await page.waitForTimeout(80);
    const el = await page.$('#nz-username');
    if (el) { await el.fill(''); await el.type('1ab..'); }
  }
  if (s === 'badges') await run(() => nzApp.push('badges'));
  if (s === 'shop' || s === 'shop-badges') await run(x => { nzApp.push('shop'); if (x) nzApp.setState({ shopSeg: 'badges' }); }, s === 'shop-badges');
  if (s.startsWith('sheet-')) {
    const k = s.slice(6);
    await run(k => {
      const a = nzApp;
      if (k === 'buy') { a.push('shop'); a.openBuy('color:red'); }
      else if (k === 'buy-short') { a.push('shop'); a.openBuy('badge:infinity'); }
      else if (k === 'buy-done') { a.push('shop'); a.setState({ sheet: { kind: 'buy', item: 'color:sky', bought: true } }); }
      else if (k === 'badge') { a.nav('profile')(); a.openBadge('answers-100', false); }
      else if (k === 'avatar') { a.openEdit(); a.openSheet('avatar', { from: 'edit' }); }
      else { if (k === 'time' || k === 'lang' || k === 'theme') a.push('settings'); a.openSheet(k); }
    }, k);
  }
  if (s.startsWith('onboard-')) {
    const k = +s.slice(8);
    await run(k => { nzApp.setState({ notifAvailable: true }); nzApp.startOnboarding('new');
      const o = nzApp.state.onboard; const i = o.steps.indexOf(k); nzApp.obGo(i < 0 ? 0 : i); }, k);
  }
  if (s === 'test' || s === 'test-picked') await run(p => { nzApp.startTest(); if (p) nzApp.choose(1)(); }, s === 'test-picked');
  if (s === 'practice-matrix' || s === 'practice-spatial' || s === 'practice-verbal') await run(t => nzApp.startPractice(t), s.slice(9));
  if (s === 'practice-answered' || s === 'explain') await run(x => { nzApp.startPractice('matrix'); nzApp.choose(0)(); if (x) nzApp.state.run && nzApp.setState({ run: Object.assign({}, nzApp.state.run, { explain: true }) }); }, s === 'explain');
  /* Haqiqiy koʻrinadigan natija: har 4-savoldan tashqari toʻgʻri javob. */
  if (s === 'result-test') await run(() => { nzApp.startTest(); for (let i = 0; i < 30; i++) { const it = nzApp.sess.current(); nzApp.choose(i % 4 === 3 ? (it.correct + 1) % it.options.length : it.correct)(); nzApp.nextStep(); } });
  if (s === 'result-practice') await run(() => { nzApp.startPractice(null); for (let i = 0; i < 10; i++) { nzApp.choose(i % 2)(); nzApp.nextStep(); } nzApp.setState({ celebrate: [] }); });
  if (s.startsWith('game-')) {
    /* Ogʻzaki hisob: 60 s lik oʻyin — yakun uchun vaqt oldinga suriladi. */
    await run(() => nzApp.openGame('mental-math'));
    if (s !== 'game-intro') await run(() => nzApp.gameAct('press', 'start'));
    if (s === 'game-play') await run(() => { const gm = nzApp.gm, v = gm.view(); const t = Date.now() + 1500;
      gm.tick(t); if (v.grid) gm.tap(0, t + 900); nzApp.setState({}); });
    if (s === 'game-paused') await run(() => nzApp.setPaused(true));
    if (s === 'game-over') await run(() => {
      const gm = nzApp.gm; let t = Date.now();
      for (let k = 0; k < 40 && !gm.done; k++) { t += 1600; try { gm.tick(t); const v = gm.view(); if (v.grid) gm.tap(k % v.grid.cells.length, t + 800); } catch (e) {} }
      try { gm.tick(t + 70000); } catch (e) {}
      if (gm.done) nzApp.finishGame();
    });
  }
  if (!/^celebrate/.test(s)) await run(() => nzApp.setState({ celebrate: [] }));
  if (s === 'celebrate') await run(() => nzApp.enqueue([{ kind: 'badge', id: 'answers-100', coins: 10 }]));
  if (s === 'celebrate-summary') await run(() => nzApp.enqueue([{ kind: 'summary', n: 6, coins: 140 }]));
  if (s === 'dialog') await run(() => nzApp.setState({ dialog: { kind: 'clearData' } }));
  if (s === 'toast') await run(() => nzApp.showToast(nzT ? nzTN('+{0} tanga', 50) : '+50 tanga', true));
  await page.waitForTimeout(o.settle != null ? o.settle : 420);
}

/* ── Tekshiruvlar ─────────────────────────────────────────────────────── */

/* Variantlar pastki panel ustidami (px, musbat — panel ostida qolgan qism). */
export async function optionOverflow(page) {
  return page.evaluate(() => {
    const o = document.getElementById('nz-opts'), f = document.getElementById('nz-qfoot');
    if (!o || !f || !o.lastElementChild) return null;
    return Math.round(o.lastElementChild.getBoundingClientRect().bottom - f.getBoundingClientRect().top);
  });
}

/* Kesilgan sarlavhalar (scrollWidth > clientWidth). */
export async function clippedTitles(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('.nz-h1, .nz-h2, .nz-pushtitle, .nz-sheettitle'))
    .filter(e => e.offsetParent && e.scrollWidth > e.clientWidth + 1).map(e => e.textContent.trim()));
}

/* Chegara — aylantiriladigan maydon boshidan (scroll farqi siljish emas). */
async function boxes(page, sel) {
  return page.evaluate(sel => {
    const sc = document.querySelector('.nz-screens-quiz') || document.querySelector('.nz-screens');
    const off = sc ? sc.scrollTop : 0;
    return Array.from(document.querySelectorAll(sel)).map(e => {
      const r = e.getBoundingClientRect(); return [Math.round(r.top + off), Math.round(r.height), Math.round(r.width)];
    });
  }, sel);
}

/* Layout shift: holat A va B da bir xil selektorlar bir xil joyda. */
const SHIFT_CASES = [
  { name: 'IQ kartasi YANGI→DAVOM→BAJARILGAN', sel: '.nz-page > div:nth-of-type(2), .nz-page > .nz-card:last-child',
    states: ['home', 'home-resume', 'home-done'] },
  { name: 'Xarid varagʻi: yetadi / yetmaydi / sotib olindi', sel: '.nz-sheet, .nz-sheet .nz-btn',
    states: ['sheet-buy', 'sheet-buy-short', 'sheet-buy-done'] },
  { name: 'Profilni tahrirlash: toʻgʻri / notoʻgʻri nom', sel: '.nz-input, .nz-help', states: ['edit', 'edit-error'] },
  { name: 'Profil: toʻla / boʻsh', sel: '.nz-page > .nz-card:nth-of-type(2), .nz-group', states: ['profile', 'profile-empty'] },
];

function parseArgs(argv) {
  const a = {};
  argv.forEach(x => { const m = /^--([^=]+)=?(.*)$/.exec(x); if (m) a[m[1]] = m[2] === '' ? '1' : m[2]; });
  return a;
}

async function main() {
  const A = parseArgs(process.argv.slice(2));
  const www = resolve(A.www || 'www');
  const out = resolve(A.out || join('resources', '_uishots'));
  const sizes = (A.sizes || '360x640,360x780,390x844,412x915').split(',').map(s => s.split('x').map(Number));
  const langs = (A.langs || 'uz,uz-cyrl,ru').split(',');
  const themes = (A.themes || 'light,dark').split(',');
  const screens = A.screens ? A.screens.split(',') : SCREENS;
  const scale = Number(A.scale || 1);
  const check = A.check !== '0';
  if (!existsSync(join(www, 'index.html'))) throw new Error('[uishots] ' + www + '/index.html yoʻq — avval node build.mjs');
  mkdirSync(out, { recursive: true });

  const chromium = loadChromium();
  const browser = await chromium.launch();
  const problems = [];
  let count = 0;
  for (const [w, h] of sizes) for (const lang of langs) for (const theme of themes) {
    const mk = async (mode) => {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: scale });
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', e => errs.push(e.message));
      page.on('console', m => { if (m.type() === 'error' && !/navigator\.vibrate/.test(m.text())) errs.push(m.text()); });
      await page.clock.setFixedTime(new Date(DATE));
      await page.addInitScript(seed({ lang, theme, mode }));
      await page.goto('file://' + join(www, 'index.html'));
      await page.waitForTimeout(350);
      await page.evaluate(() => { try { nzWallet.credit(50, 'welcome', 'welcome'); nzWallet.credit(150, 'badge', 'b:first-test'); nzApp.syncCoins(); } catch (e) {} });
      return { ctx, page, errs };
    };
    const full = await mk('full');
    const empty = await mk('empty');
    const tag = w + 'x' + h + '-' + lang + '-' + theme;
    const layout = {};
    for (const s of screens) {
      const P = s === 'profile-empty' ? empty : full;
      await goto(P.page, s);
      const file = join(out, tag + '-' + s + '.png');
      await P.page.screenshot({ path: file });
      count++;
      if (!check) continue;
      if (/^(test|practice-|explain)/.test(s)) {
        const ov = await optionOverflow(P.page);
        if (ov !== null && ov > 0 && h >= 780) problems.push(tag + ' ' + s + ': variant panel ostida ' + ov + ' px');
      }
      if (lang !== 'uz') {
        const cl = await clippedTitles(P.page);
        if (cl.length) problems.push(tag + ' ' + s + ': kesilgan sarlavha — ' + cl.join(' | '));
      }
      for (const c of SHIFT_CASES) if (c.states.indexOf(s) !== -1) (layout[c.name] = layout[c.name] || {})[s] = await boxes(P.page, c.sel);
    }
    if (check) {
      for (const c of SHIFT_CASES) {
        const got = layout[c.name];
        if (!got) continue;
        const ref = got[c.states.find(x => got[x])];
        c.states.forEach(st => {
          if (!got[st] || JSON.stringify(got[st]) === JSON.stringify(ref)) return;
          problems.push(tag + ' SHIFT ' + c.name + ' (' + st + '): ' + JSON.stringify(ref) + ' → ' + JSON.stringify(got[st]));
        });
      }
      [full, empty].forEach(P => P.errs.forEach(e => problems.push(tag + ' konsol: ' + e)));
    }
    await full.ctx.close(); await empty.ctx.close();
  }
  await browser.close();
  console.log('[uishots] ' + count + ' ta surat → ' + out);
  if (problems.length) {
    console.log('[uishots] ' + problems.length + ' ta muammo:\n  ' + problems.join('\n  '));
    process.exitCode = 1;
  } else if (check) console.log('[uishots] tekshiruvlar — toza');
}

if (import.meta.url === 'file://' + process.argv[1]) main().catch(e => { console.error(e); process.exit(1); });
