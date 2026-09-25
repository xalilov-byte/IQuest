/* ─────────────────────────────────────────────────────────────────────────
   tests/game-schulte.test.mjs — Shulte jadvali o'yini (src/games/schulte.js)

   NIMA TEKSHIRILADI:
     · minglab tasodifiy bosishlar ketma-ketligida (g'alati qiymatlar,
       orqaga ketgan vaqt, NaN bilan ham) har holatda validateView bo'sh;
     · deterministik: ikki alohida muhitda bir xil urug' → bir xil o'yin;
     · replay: jurnal bo'yicha qayta o'ynash AYNAN shu natija va jurnalni
       beradi; natija tick chastotasiga bog'liq emas;
     · ideal bot — yuqori ball, tasodifiy bosuvchi — deyarli 0,
       tezlik-bot (< 120 ms) — 0 ball;
     · daraja oshgani sari topshiriq qiyinlashadi; o'yin uzunligi chegaralangan;
     · uz/ru/en matnlar (ʻ, ʼ, «»), ko'rsatma 2 qatorga sig'adi; panjara
       hamma fazada bir xil o'lchamda (intro, jadvallar orasi, pauza);
     · pauza: faol vaqt to'xtaydi, pauzali jurnal replay'da aynan.

   Bosish tartibi (asc / desc / zig) shu yerda MUSTAQIL hisoblanadi —
   o'yinning o'z order() funksiyasiga ishonilmaydi.

   Fayllar node:vm ichida `window` taqlidi bilan yuklanadi; muhitda
   Math.random va Date.now chaqirilsa — xato otadi.
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const FILES = ['src/iq/rng.js', 'src/games/index.js', 'src/games/schulte.js'];
const SRC = FILES.map(f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8'));

function realm() {
  const ctx = {};
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext("Math.random = () => { throw new Error('Math.random taqiqlangan'); };" +
                  "Date.now = () => { throw new Error('Date.now taqiqlangan'); };", ctx);
  FILES.forEach((f, i) => vm.runInContext(SRC[i], ctx, { filename: f }));
  return ctx.IQ;
}

const plain = x => JSON.parse(JSON.stringify(x));
const IQ = realm();
const ID = 'schulte';
const G = IQ.games.get(ID);
const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const seedOf = s => (Math.imul(s + 1, 2654435761) >>> 0);
const pmax = L => 60 + 9 * L;

/* Testning o'z PRNG'i (mulberry32) — o'yinnikidan mustaqil. */
function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Mustaqil bosish tartibi. */
function expectedOrder(n, mode) {
  const nums = Array.from({ length: n }, (_, i) => i + 1);
  if (mode === 'asc') return nums;
  if (mode === 'desc') return nums.reverse();
  const out = [];
  while (nums.length) { out.push(nums.shift()); if (nums.length) out.push(nums.pop()); }
  return out;
}

function checkView(g, where) {
  const v = g.view();
  const e = IQ.games.validateView(v, ID);
  if (e.length) assert.fail(where + ': ' + e.join('; ') + ' — ' + JSON.stringify(v).slice(0, 300));
  checkLangs(v, where);
  return v;
}
const check = checkView;

/* ── Tillar, tipografika va pauza (CONTRACT §2, §9; ARXITEKTURA §8) ──── */
const RESUME = 600;                                  // o'yindagi RESUME_MS
const CYR = /[Ѐ-ӿ]/;
function checkText(o, where) {
  for (const k of ['uz', 'ru', 'en']) assert.ok(o && typeof o[k] === 'string' && o[k].trim() !== '', where + ': ' + k);
  assert.ok(!CYR.test(o.en) && !/[ʻʼ«»]/.test(o.en), where + ': en da kirill / ʻ / «»: ' + o.en);
  assert.ok(!/['"‘’]/.test(o.uz), where + ': uz da ʻ/ʼ/«» o\'rniga boshqa belgi: ' + o.uz);
  assert.ok(!/[A-Za-z]{2}/.test(o.ru), where + ': ru da lotin so\'z: ' + o.ru);
}
/* Har ko'rinish: hamma matnda uz/ru/en; ko'rsatma 2 qatorga sig'adi
   (Playwright o'lchovi bilan tanlangan chegara), HUD yorlig'i qisqa. */
function checkLangs(v, where) {
  assert.equal(typeof v.paused, 'boolean', where + ': paused');
  checkText(v.prompt, where + ' prompt');
  for (const k of ['uz', 'ru', 'en']) assert.ok(v.prompt[k].length <= 76, where + ': ko\'rsatma uzun: ' + v.prompt[k]);
  v.hud.forEach((h, i) => {
    checkText(h.label, where + ' hud' + i);
    for (const k of ['uz', 'ru', 'en']) assert.ok(h.label[k].length <= 14, where + ': HUD yorlig\'i uzun: ' + h.label[k]);
  });
  if (v.display && v.display.kind === 'text') checkText(v.display, where + ' display');
  v.buttons.forEach((b, i) => checkText(b.label, where + ' tugma' + i));
}
/* Jurnalga pauza qo'shadi: i-hodisadan keyin (o'sha devor vaqtida)
   'pause', gap ms dan keyin 'resume'; keyingi hodisalar gap + RESUME ga
   suriladi. O'yin vaqti o'zgarmaydi — natija aynan o'sha bo'lishi kerak. */
function withPause(log, i, gap) {
  const P = log[i].t, out = log.slice(0, i + 1);
  out.push({ t: P, k: 'press', v: 'pause' }, { t: P + gap, k: 'press', v: 'resume' });
  for (const e of log.slice(i + 1)) out.push({ t: e.t + gap + RESUME, k: e.k, v: e.v });
  return out;
}
/* Tugagan o'yin jurnaliga 1–3 ta pauza qo'shib replay qiladi: natija va
   jurnal aynan (pauza vaqti o'yinga kirmaydi). `ok(e)` — pauza qo'yiladigan
   hodisa. */
function checkPausedReplay(seed, level, log, res, rs, ok = () => true) {
  const R = prng(rs);
  const idx = log.map((e, i) => i).filter(i => i < log.length - 1 && ok(log[i]));
  if (!idx.length) return;
  const picks = [...new Set([0, 1, 2].slice(0, 1 + Math.floor(R() * 3)).map(() => idx[Math.floor(R() * idx.length)]))].sort((a, b) => b - a);
  let pl = log;
  for (const i of picks) pl = withPause(pl, i, 1000 + Math.floor(R() * 600000));
  const rp = IQ.games.replay(ID, seed, level, JSON.parse(JSON.stringify(pl)));
  assert.deepEqual(plain(rp.result()), plain(res), 'pauzali replay natijasi');
  assert.deepEqual(plain(rp.log()), pl, 'pauzali replay jurnali');
}
function checkRegistered() {
  const G = IQ.games.get(ID);
  checkText(G.title, 'title');
  checkText(G.desc, 'desc');
  assert.deepEqual(plain(G.langs), ['uz', 'ru', 'en']);
  if (IQ.games.langsOf) assert.deepEqual(plain(IQ.games.langsOf(ID)), ['uz', 'ru', 'en']);
}
const BOT_EN = 'Taps too fast — no points awarded';
/* Jonli pauza: intro'da pauza yo'q; o'yin paytida pause → ko'rinish
   ma'lumot bermaydi, faqat "Davom etish"; kutish (10 daqiqa) o'yinni
   tugatmaydi, tick false, bosishlar e'tiborsiz va jurnalga yozilmaydi;
   resume → RESUME ms "Tayyorlaning…" (bosish yana e'tiborsiz), keyin
   o'yin to'xtagan joyidan. `inputs(g, t)` — o'yinning hamma bosishlari. */
function livePause(inputs, { level = 3, warm = 1300 } = {}) {
  const g = IQ.games.create(ID, 7, level);
  assert.equal(g.pause(500), false, 'intro — pauza yo\'q');
  assert.equal(g.resume(600), false);
  assert.equal(g.log().length, 0);
  g.press('start', 1000);
  g.tick(warm);
  const before = JSON.stringify(g.view()), n0 = g.log().length, res0 = JSON.stringify(g.result());
  assert.equal(g.pause(warm), true);
  assert.equal(g.paused, true);
  assert.equal(g.pause(warm + 10), false, 'ikkinchi pauza — yo\'q');
  const v = check(g, 'pauza');
  assert.equal(v.paused, true);
  assert.deepEqual(plain(v.buttons.map(b => b.id)), ['resume']);
  assert.equal(v.prompt.en, 'The clock is stopped');
  if (v.grid) assert.ok(v.grid.cells.every(c => c.state === 'hidden' && c.label === ''), 'pauzada panjara yashirin');
  const pv = JSON.stringify(v);
  g.tick(warm);                                   // ilova pauzadan keyin bir marta chizadi
  let t = warm;
  for (let s = 0; s < 40; s++) { t += 15000; assert.equal(g.tick(t), false); inputs(g, t); }
  assert.equal(JSON.stringify(g.view()), pv);
  assert.equal(g.log().length, n0 + 1, 'pauzada hech narsa yozilmaydi');
  assert.ok(!g.done, '10 daqiqa pauza o\'yinni tugatmaydi');
  assert.equal(JSON.stringify(g.result()), res0, 'pauza natijani o\'zgartirmaydi');
  assert.equal(g.resume(t), true);
  assert.equal(g.paused, false);
  const rv = check(g, 'tayyorlanish');
  assert.equal(rv.paused, false);
  assert.equal(rv.prompt.en, 'Get ready…');
  assert.deepEqual(plain(rv.buttons), []);
  if (rv.grid) assert.ok(rv.grid.cells.every(c => c.state === 'hidden'));
  inputs(g, t + 100);
  g.tick(t + 200);
  assert.equal(g.log().length, n0 + 2, 'tayyorlanishda bosish e\'tiborsiz');
  assert.equal(g.tick(t + RESUME - 1), false);
  assert.equal(g.tick(t + RESUME), true, 'tayyorlanish tugadi');
  assert.deepEqual(plain(g.log().slice(n0)), [{ t: warm, k: 'press', v: 'pause' }, { t, k: 'press', v: 'resume' }]);
  check(g, 'davom');
  return { g, before, after: JSON.stringify(g.view()), res0, t: t + RESUME };
}

/* O'yinni "ilova" kabi o'ynatadi: har `step` ms da tick, policy katak
   raqamini qaytarsa — bosadi. Har ko'rinish tekshiriladi. */
function play(seed, level, policy, { step = 20, start = 5000, maxMs = 1200000, iq = IQ } = {}) {
  const g = iq.games.create(ID, seed, level);
  let t = start;
  g.tick(t); checkView(g, 'intro');
  g.press('start', t);
  while (!g.done && t - start < maxMs) {
    t += step;
    g.tick(t);
    const v = checkView(g, 'play');
    const a = policy(v, t);
    if (a !== null && a !== undefined) { g.tap(a, t); checkView(g, 'tap'); }
  }
  assert.ok(g.done, 'o\'yin tugashi kerak');
  checkView(g, 'done');
  return g;
}

/* Ideal o'yinchi: har `every` ms da navbatdagi sonni bosadi. `bounce` —
   har n-bosishdan keyin 40 ms o'tib o'sha katakni yana bosadi (ekran
   "sakrashi"). */
function perfect(level, every, { bounce = 0 } = {}) {
  const cfg = G.rules(level), ord = expectedOrder(cfg.n, cfg.mode);
  let prevPhase = null, k = 0, lastAt = 0, again = null, taps = 0;
  return (v, t) => {
    if (v.phase !== 'input') { prevPhase = v.phase; return null; }
    if (prevPhase !== 'input') { k = 0; lastAt = t; again = null; }
    prevPhase = 'input';
    if (again && t >= again.at) { const i = again.i; again = null; return i; }
    if (t - lastAt < every || k >= ord.length) return null;
    lastAt = t;
    const i = v.grid.cells.findIndex(c => c.label === String(ord[k]));
    assert.ok(i >= 0, 'navbatdagi son jadvalda bor: ' + ord[k]);
    k++; taps++;
    if (bounce && taps % bounce === 0) again = { i, at: t + 40 };
    return i;
  };
}

function randomTapper(seed, lo, hi) {
  const r = prng(seed);
  let next = 0;
  return (v, t) => {
    if (t < next || v.phase !== 'input') return null;
    next = t + lo + Math.floor(r() * (hi - lo));
    return Math.floor(r() * v.grid.cells.length);
  };
}

function checkResult(r, L) {
  assert.ok(Number.isInteger(r.points) && r.points >= 0 && r.points <= pmax(L), 'points 0..' + pmax(L) + ': ' + r.points);
  assert.ok(Number.isInteger(r.score) && r.score >= 0 && r.score <= 100, 'score 0..100');
  assert.ok(Number.isInteger(r.correct) && r.correct >= 0 && r.correct <= r.total, 'correct ≤ total');
  assert.equal(r.total, G.rules(L).n * G.rules(L).tables);
  assert.ok(Number.isFinite(r.durationMs) && r.durationMs >= 0, 'durationMs');
  assert.ok(Number.isInteger(r.nextLevel) && Math.abs(r.nextLevel - L) <= 1 && r.nextLevel >= 1 && r.nextLevel <= 10, 'nextLevel');
}

function maxDuration(L) {
  const c = G.rules(L);
  return c.tables * c.limitMs + (c.tables - 1) * c.breakMs;
}

/* ══ TESTLAR ═══════════════════════════════════════════════════════════ */

test('ro\'yxatda: id, skill, nom va tavsif uz/ru', () => {
  assert.ok(G, 'IQ.games.get("schulte")');
  assert.equal(G.skill, 'attention');
  assert.ok(G.title.uz && G.title.ru && G.desc.uz && G.desc.ru);
  assert.ok(IQ.games.list().some(g => g.id === ID));
});

test('manbada Math.random / Date.now / setTimeout yo\'q', () => {
  assert.doesNotMatch(SRC[2], /Math\.random|Date\.now|setTimeout|setInterval|performance\.now/);
});

test('jadval: 1..N har biri bir marta, cols = tomon, har jadval har xil', () => {
  for (const L of LEVELS) {
    const cfg = G.rules(L);
    for (let s = 0; s < 30; s++) {
      const g = IQ.games.create(ID, seedOf(s), L);
      g.press('start', 0);
      const v = g.view();
      assert.equal(v.grid.cols, cfg.side);
      assert.equal(v.grid.cells.length, cfg.n);
      const nums = Array.from(v.grid.cells, c => Number(c.label)).sort((a, b) => a - b);
      assert.deepEqual(nums, Array.from({ length: cfg.n }, (_, i) => i + 1));
    }
  }
  // Har xil urug' — har xil joylashuv
  const sigs = new Set();
  for (let s = 0; s < 50; s++) { const g = IQ.games.create(ID, seedOf(s), 4); g.press('start', 0); sigs.add(g.view().grid.cells.map(c => c.label).join()); }
  assert.ok(sigs.size >= 49);
});

test('minglab tasodifiy ketma-ketlik: validateView doim bo\'sh, progress kamaymaydi, replay aynan', () => {
  const r = prng(20260925);
  const WEIRD_TAPS = [-1, 1.5, '3', null, undefined, 99, NaN, {}];
  const WEIRD_T = [NaN, undefined, -Infinity, Infinity, '100'];
  let finished = 0, pausedSeen = 0;
  for (let seq = 0; seq < 2000; seq++) {
    const L = 1 + (seq % 10), seed = seedOf(seq * 7 + 3);
    const cfg = G.rules(L), ord = expectedOrder(cfg.n, cfg.mode);
    const g = IQ.games.create(ID, seed, L);
    let t = Math.floor(r() * 1e9), prog = 0, k = 0, sig = null;
    const n = 40 + Math.floor(r() * 160);
    for (let e = 0; e < n; e++) {
      const y = r();
      if (y < 0.25) { /* o'sha vaqt */ } else if (y < 0.55) t += Math.floor(r() * 150);
      else if (y < 0.85) t += Math.floor(r() * 1500);
      else if (y < 0.95) t += Math.floor(r() * 40000);
      else t -= Math.floor(r() * 800);             // soat orqaga ketdi
      const x = r();
      const tt = r() < 0.03 ? WEIRD_T[Math.floor(r() * WEIRD_T.length)] : t;
      if (x < 0.3) {
        const before = JSON.stringify(g.view());
        if (!g.tick(tt)) assert.equal(JSON.stringify(g.view()), before, 'tick false — ko\'rinish o\'zgarmasligi kerak');
      } else if (x < 0.4) g.press(r() < 0.6 ? 'start' : ['left', 'x', null, 7, 'pause', 'resume', 'resume'][Math.floor(r() * 7)], tt);
      else {
        const v = g.view();
        if (v.grid && r() < 0.6) {
          // yarim "aqlli": navbatdagi to'g'ri sonni bosadi (jadvallar oxirigacha yetsin)
          const s = v.grid.cells.map(c => c.label).join();
          if (s !== sig) { sig = s; k = 0; }
          const before = v.progress;
          g.tap(v.grid.cells.findIndex(c => c.label === String(ord[Math.min(k, ord.length - 1)])), tt);
          if (g.view().progress > before) k++;
        } else g.tap(r() < 0.1 ? WEIRD_TAPS[Math.floor(r() * WEIRD_TAPS.length)] : Math.floor(r() * 36), tt);
      }
      const v = g.view();
      const errs = IQ.games.validateView(v, ID);
      if (errs.length) assert.fail('seq ' + seq + ' e ' + e + ': ' + errs.join('; ') + ' — ' + JSON.stringify(v).slice(0, 300));
      if (e % 4 === 0) checkLangs(v, 'seq ' + seq);
      if (v.paused) pausedSeen++;
      assert.equal(v.grid.cols, cfg.side, 'panjara hamma fazada bor');
      assert.ok(v.progress >= prog - 1e-12, 'progress kamaymaydi');
      prog = v.progress;
      if (e % 16 === 0) assert.equal(JSON.stringify(g.view()), JSON.stringify(v), 'view() holatni o\'zgartirmaydi');
    }
    if (g.done) finished++;
    const res = plain(g.result());
    checkResult(res, L);
    assert.ok(res.durationMs <= maxDuration(L), 'uzunlik chegarada');
    const log = JSON.parse(JSON.stringify(g.log()));
    const rp = IQ.games.replay(ID, seed, L, log);
    assert.deepEqual(plain(rp.result()), res, 'replay natijasi — seq ' + seq);
    assert.deepEqual(plain(rp.log()), log, 'replay jurnali — seq ' + seq);
    assert.equal(rp.done, g.done);
  }
  assert.ok(finished > 200, 'ko\'p ketma-ketlik oxirigacha yetdi: ' + finished);
  assert.ok(pausedSeen > 100, 'pauza uchradi: ' + pausedSeen);
});

test('deterministik: ikki alohida muhitda bir xil urug\' → bir xil ko\'rinishlar va natija', () => {
  const IQ2 = realm();
  for (const L of [1, 5, 10]) {
    const views = [[], []];
    [IQ, IQ2].forEach((iq, w) => {
      const g = play(12345, L, (() => { const p = perfect(L, 400); return (v, t) => { views[w].push(JSON.stringify(v)); return p(v, t); }; })(), { iq, step: 50 });
      views[w].push(JSON.stringify(g.result()), JSON.stringify(g.log()));
    });
    assert.equal(views[0].length, views[1].length);
    assert.ok(views[0].every((v, i) => v === views[1][i]), 'daraja ' + L);
  }
});

test('replay: bot o\'yinlari aynan qayta chiqadi; natija tick chastotasiga bog\'liq emas', () => {
  for (const L of LEVELS) {
    const runs = [
      { seed: seedOf(L), g: play(seedOf(L), L, perfect(L, 300)) },
      { seed: seedOf(L + 20), g: play(seedOf(L + 20), L, randomTapper(L, 150, 700), { step: 50 }) },
      { seed: seedOf(L + 40), g: play(seedOf(L + 40), L, (() => {
        const p = perfect(L, 900), rr = randomTapper(L + 1, 700, 1500);
        let n = 0;
        return (v, t) => (++n % 7 === 0 ? rr(v, t) : p(v, t));
      })()) },
    ];
    runs.forEach(({ seed, g }, j) => {
      const log = JSON.parse(JSON.stringify(g.log()));
      const rp = IQ.games.replay(ID, seed, L, log);
      assert.deepEqual(plain(rp.result()), plain(g.result()));
      assert.deepEqual(plain(rp.log()), log);
      assert.ok(rp.done);
      checkPausedReplay(seed, L, log, g.result(), L * 3 + j);
    });
    // Faqat bosishlar (tick'siz) + oxirida uzoq kelajakdagi bitta tick — natija o'sha
    const g = runs[2].g;
    const inputs = g.log().filter(e => e.k !== 'tick');
    const h = IQ.games.create(ID, seedOf(L + 40), L);
    for (const e of inputs) (e.k === 'tap' ? h.tap(e.v, e.t) : h.press(e.v, e.t));
    h.tick(inputs[inputs.length - 1].t + 10 * maxDuration(L));
    assert.deepEqual(plain(h.result()), plain(g.result()), 'tick\'siz — daraja ' + L);
  }
});

test('ideal bot (300 ms): har darajada yuqori ball, daraja oshadi', () => {
  for (const L of LEVELS) {
    for (let s = 0; s < 3; s++) {
      const g = play(seedOf(100 + s), L, perfect(L, 300));
      const r = g.result();
      checkResult(r, L);
      assert.equal(r.correct, r.total);
      assert.equal(r.score, 100);
      assert.ok(r.points >= 0.95 * pmax(L), 'L' + L + ' points ' + r.points);
      assert.equal(r.nextLevel, Math.min(10, L + 1));
    }
  }
});

test('odamga o\'xshash o\'yin — ball 30..150 oralig\'ida, sust o\'yinchi pastroq', () => {
  for (const L of LEVELS) {
    const P = G.rules(L).paceMs;
    const good = play(seedOf(200 + L), L, perfect(L, P)).result();
    const slow = play(seedOf(200 + L), L, perfect(L, Math.round(P * 1.7))).result();
    assert.ok(good.points >= 30 && good.points <= 150, 'yaxshi L' + L + ': ' + good.points);
    assert.ok(slow.points < good.points && slow.points >= 20, 'sust L' + L + ': ' + slow.points);
    assert.ok(slow.nextLevel <= L);
  }
});

test('tasodifiy bosuvchi: deyarli 0 ball, daraja oshmaydi', () => {
  let sum = 0, n = 0;
  for (const L of [1, 2, 4, 7, 10]) {
    for (let s = 0; s < 8; s++) {
      const r = play(seedOf(300 + s), L, randomTapper(s * 31 + L, 150, 650), { step: 100 }).result();
      checkResult(r, L);
      assert.ok(r.points <= 10, 'L' + L + ' points ' + r.points);
      assert.ok(r.nextLevel <= L);
      sum += r.points; n++;
    }
  }
  assert.ok(sum / n <= 3, 'o\'rtacha ' + sum / n);
});

test('tezlik-bot (< 120 ms oraliq) — 0 ball; bitta-yarimta qo\'sh bosish jazolanmaydi', () => {
  for (const L of LEVELS) {
    for (const every of [20, 60, 100]) {
      const r = play(seedOf(400 + L), L, perfect(L, every), { step: every === 20 ? 10 : 20 }).result();
      assert.equal(r.points, 0, 'L' + L + ' every ' + every);
      assert.equal(r.flagged, true);
      assert.equal(r.nextLevel, L, 'bot darajani o\'zgartirmaydi');
    }
    // 140 ms — tez, lekin imkonsiz emas: ball beriladi
    const og = play(seedOf(400 + L), L, perfect(L, 140), { step: 10 }), ok = og.result();
    assert.ok(ok.points > 0.9 * pmax(L), 'L' + L + ' 140 ms: ' + ok.points);
    assert.equal(ok.flagged, false);
    assert.equal(og.view().display.en, 'Wrong taps: 0');
    // har 9-bosishda 40 ms dan keyin yana bosish (ekran sakrashi) — jazo yo'q
    const b = play(seedOf(400 + L), L, perfect(L, 400, { bounce: 9 }), { step: 10 }).result();
    assert.ok(b.points > 0.9 * pmax(L), 'L' + L + ' bounce: ' + b.points);
  }
});

test('xato bosish: \'bad\' 0,4 s ko\'rinadi, xato sanaladi; topilgan katakni qayta bosish xato emas', () => {
  const L = 1, cfg = G.rules(L), ord = expectedOrder(cfg.n, cfg.mode);
  const g = IQ.games.create(ID, 777, L);
  g.press('start', 1000);
  const v = g.view(), idx = lbl => v.grid.cells.findIndex(c => c.label === String(lbl));
  const wrong = idx(ord[3]);
  g.tap(wrong, 1500);
  assert.equal(g.view().grid.cells[wrong].state, 'bad');
  assert.equal(g.view().hud.find(h => h.label.uz === 'Xato').value, '1');
  g.tick(1600);
  assert.equal(g.tick(1700), false, 'hech narsa o\'zgarmasa false');
  assert.equal(g.tick(1950), true, '\'bad\' o\'chdi — true');
  assert.equal(g.view().grid.cells[wrong].state, 'idle');
  g.tap(idx(ord[0]), 2000);
  assert.equal(g.view().grid.cells[idx(ord[0])].state, 'ok');
  g.tap(idx(ord[0]), 2300);                                         // qayta — e'tiborsiz
  assert.equal(g.view().hud.find(h => h.label.uz === 'Xato').value, '1');
  g.tap(idx(ord[1]), 2600);
  assert.equal(g.view().grid.cells[idx(ord[1])].state, 'ok');
});

test('jadval orasida tanaffus; oxirgi jadvaldan keyin darhol "done"', () => {
  const L = 2, cfg = G.rules(L);
  const g = IQ.games.create(ID, 99, L);
  const phases = [];
  let t = 0;
  g.press('start', t);
  const bot = perfect(L, 300);
  while (!g.done) {
    t += 10; g.tick(t);
    const v = g.view();
    if (phases[phases.length - 1] !== v.phase) phases.push(v.phase);
    const a = bot(v, t);
    if (a !== null) g.tap(a, t);
  }
  phases.push(g.view().phase);
  const expect = [];
  for (let i = 0; i < cfg.tables; i++) expect.push('input', i < cfg.tables - 1 ? 'feedback' : 'done');
  assert.deepEqual(phases, expect);
});

test('o\'yin uzunligi chegaralangan: hech bosmasa jadvallar vaqt bilan yopiladi', () => {
  for (const L of LEVELS) {
    const g = play(seedOf(500 + L), L, () => null, { step: 100 });
    const r = g.result();
    assert.equal(r.correct, 0);
    assert.equal(r.points, 0);
    assert.equal(r.durationMs, maxDuration(L));
    assert.ok(r.durationMs <= 240000, 'L' + L + ' ≤ 4 daqiqa');
  }
});

test('daraja oshgani sari qiyinlashadi', () => {
  const R = LEVELS.map(L => G.rules(L));
  // "yaxshi" sur'at (ms / son) har darajada qat'iy o'sadi
  for (let i = 1; i < R.length; i++) assert.ok(R[i].paceMs > R[i - 1].paceMs, 'paceMs L' + (i + 1));
  // bir xil tartibda jadval hajmi kamaymaydi; tartiblar asc → desc → zig ko'tariladi
  const rank = { asc: 0, desc: 1, zig: 2 };
  for (const mode of ['asc', 'desc', 'zig']) {
    const sizes = R.filter(c => c.mode === mode).map(c => c.n);
    for (let i = 1; i < sizes.length; i++) assert.ok(sizes[i] >= sizes[i - 1], mode);
  }
  assert.equal(R[0].n, 9); assert.equal(R[0].mode, 'asc');
  assert.equal(R[9].n, 36); assert.equal(R[9].mode, 'zig');
  assert.ok(Math.max(...R.slice(0, 5).map(c => rank[c.mode])) <= Math.min(...R.slice(6).map(c => rank[c.mode])) + 1);
  // topilganni ko'rsatish (yengillik) faqat past darajalarda, bir marta o'chgach qaytmaydi
  const keep = R.map(c => c.keepFound);
  assert.equal(keep[0], true);
  assert.equal(keep[9], false);
  for (let i = 1; i < keep.length; i++) assert.ok(!(keep[i] && !keep[i - 1]));
  // o'yindagi haqiqiy jadval va ko'rsatma qoidaga mos
  for (const L of LEVELS) {
    const g = IQ.games.create(ID, 5, L);
    g.press('start', 0);
    const v = g.view(), c = R[L - 1], N = c.n;
    assert.equal(v.grid.cells.length, N);
    const want = { asc: ['1 dan ' + N + ' gacha', 'от 1 до ' + N], desc: [N + ' dan 1 gacha', 'от ' + N + ' до 1'],
                   zig: ['1 → ' + N + ' → 2 → ' + (N - 1), '1 → ' + N + ' → 2 → ' + (N - 1)] }[c.mode];
    assert.ok(v.prompt.uz.includes(want[0]) && v.prompt.ru.includes(want[1]), 'L' + L + ': ' + v.prompt.uz + ' / ' + v.prompt.ru);
  }
  // ideal bot mustaqil tartib bilan xatosiz o'tadi — tartib ko'rsatmaga mos
  for (const L of LEVELS) {
    const r = play(seedOf(600 + L), L, perfect(L, 250)).result();
    assert.equal(r.correct, r.total);
    assert.equal(r.score, 100);
  }
});

test('intro va done ko\'rinishlari: start tugmasi, done da tugma yo\'q, progress 0 → 1', () => {
  const g = IQ.games.create(ID, 1, 3);
  const v0 = g.view();
  assert.equal(v0.phase, 'intro');
  assert.equal(v0.progress, 0);
  assert.deepEqual(plain(v0.buttons.map(b => b.id)), ['start']);
  g.tap(0, 10);                                   // startdan oldin — e'tiborsiz
  assert.equal(g.view().phase, 'intro');
  assert.deepEqual(plain(g.log()), []);
  assert.deepEqual(plain(g.result()), { score: 0, points: 0, correct: 0, total: G.rules(3).n * G.rules(3).tables, durationMs: 0, nextLevel: 3, flagged: false });
  const done = play(1, 3, perfect(3, 300));
  const v = done.view();
  assert.equal(v.phase, 'done');
  assert.equal(v.progress, 1);
  assert.deepEqual(plain(v.buttons), []);
  assert.equal(v.grid.cols, G.rules(3).side);
  assert.ok(v.grid.cells.every(c => c.state === 'disabled'));
});

test('matnlar: uz/ru/en, langs; bot sababi yakun matnida', () => {
  checkRegistered();
  const g = play(seedOf(401), 1, perfect(1, 20), { step: 10 });
  assert.equal(g.view().display.en, BOT_EN);
  assert.equal(g.view().display.uz, 'Juda tez bosishlar — ball berilmadi');
});

test('ko\'rinish barqaror: intro = o\'yin shakli (HUD, panjara, ko\'rsatma), jadvallar orasida panjara qoladi', () => {
  for (const L of LEVELS) {
    const cfg = G.rules(L), g = IQ.games.create(ID, seedOf(L), L);
    const a = checkView(g, 'intro');
    assert.equal(a.display, null);
    assert.equal(a.grid.cols, cfg.side);
    assert.ok(a.grid.cells.length === cfg.n && a.grid.cells.every(c => c.state === 'disabled' && c.label === ''), 'sonlar oldindan ko\'rinmaydi');
    assert.ok(!a.hud.some(h => h.label.uz === 'Daraja' || h.label.uz === 'Jadvallar'));
    g.press('start', 0);
    const b = checkView(g, 'input');
    assert.deepEqual(plain(a.hud.map(h => h.label)), plain(b.hud.map(h => h.label)));
    assert.deepEqual(plain(a.prompt), plain(b.prompt), 'ko\'rsatma o\'zgarmaydi');
    assert.equal(b.hud[0].value, '1/' + cfg.tables, 'bitta jadvalda ham "1/1"');
    assert.equal(b.hud.length, 3);
    // jadval tugagach (tanaffus) — panjara o'sha o'lchamda, HUD yorliqlari o'sha
    const bot = perfect(L, 300);
    let t = 0;
    while (!g.done && g.view().phase !== 'feedback') { t += 20; g.tick(t); const a2 = bot(g.view(), t); if (a2 !== null) g.tap(a2, t); }
    if (cfg.tables > 1) {
      const f = checkView(g, 'feedback');
      assert.equal(f.display, null);
      assert.equal(f.grid.cols, cfg.side);
      assert.ok(f.grid.cells.every(c => c.state === 'disabled'));
      assert.deepEqual(plain(f.hud.map(h => h.label)), plain(b.hud.map(h => h.label)));
    }
  }
});

test('pauza (jonli): faol vaqt to\'xtaydi, sonlar yashirinadi, keyin aynan davom etadi', () => {
  const inputs = (g, t) => { for (let i = 0; i < 36; i++) g.tap(i, t); g.press('start', t); };
  const { before, after, res0, g, t } = livePause(inputs, { warm: 2300 });
  assert.equal(after, before);
  assert.equal(JSON.stringify(g.result()), res0);
  assert.equal(JSON.parse(after).hud[1].value, '0:01', 'vaqt pauza oldidagi joyida');
  // o'yinni oxirigacha: davomiylik pauzasiz o'yin bilan bir xil
  const bot = perfect(3, 300);
  let tt = t;
  while (!g.done) { tt += 20; g.tick(tt); const a = bot(g.view(), tt); if (a !== null) g.tap(a, tt); }
  const rp = IQ.games.replay(ID, 7, 3, plain(g.log()));
  assert.deepEqual(plain(rp.result()), plain(g.result()));
  assert.deepEqual(plain(rp.log()), plain(g.log()));
  assert.ok(g.result().durationMs < 200000, 'pauza (10 daqiqa) davomiylikka kirmaydi: ' + g.result().durationMs);
});

test('L2: Shulte jadvali hamma fazada kvadrat (\'square\') — Boshlash/Pauza da sakramaydi', () => {
  assert.equal(G.gridKind, 'square');
  assert.equal(IQ.games.gridKindOf(ID), 'square');
  for (const L of LEVELS) {
    const g = IQ.games.create(ID, seedOf(L), L);
    const kinds = new Set(), phases = new Set();
    const see = () => { const v = g.view(); phases.add(v.phase + (v.paused ? '/p' : '')); if (v.grid) kinds.add(v.grid.kind); };
    see();
    g.press('start', 0);
    const bot = perfect(L, 300);
    let t = 0, k = 0;
    while (!g.done && t < 600000) {
      t += 20; g.tick(t); see();
      const v = g.view();
      if (v.phase === 'input' && v.grid.cells.some(c => c.label)) { const a = bot(v, t); if (a !== null) g.tap(a, t); }
      if (++k === 200) { g.pause(t); see(); g.resume(t + 5000); t += 5000; see(); }
    }
    see();
    assert.deepEqual([...kinds], ['square'], 'L' + L + ': ' + [...phases].join(','));
    assert.ok(phases.has('intro') && phases.has('input') && [...phases].some(p => p.endsWith('/p')), [...phases].join(','));
  }
});
