/* ─────────────────────────────────────────────────────────────────────────
   tests/game-sequence.test.mjs — "Kataklar tartibi" (Korsi) o'yini

   Isbotlanadi (CONTRACT.md §9):
     · validateView har holatda bo'sh — minglab tasodifiy bosish/tick;
     · deterministik — ikki alohida muhitda bir xil harakatlar → bir xil
       ko'rinishlar, jurnal va natija;
     · replay — IQ.games.replay aynan shu result() va log() ni beradi;
     · ko'rsatish tick(now) bilan to'g'ri tartibda, siyrak tick'da ham;
     · mukammal o'yinchi ko'p, tasodifiy bosuvchi kam, tez bot 0 ball;
     · daraja qiyinlikni oshiradi; o'yin cheklangan vaqtda tugaydi;
     · uz/ru/en matnlar (ʻ, ʼ, «»), ko'rsatma 2 qatorga sig'adi;
     · pauza: vaqt kirmaydi, pauzali jurnal replay'da aynan o'sha natija.

   Fayllar node:vm ichida yuklanadi; muhitda Math.random va Date.now
   chaqirilsa darhol yiqiladi.
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const ID = 'sequence';
const FILES = ['src/iq/rng.js', 'src/games/index.js', 'src/games/' + ID + '.js'];
const SRC = FILES.map(f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8'));

function realm() {
  const ctx = {};
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext('Math.random = function () { throw new Error("Math.random taqiqlangan"); };' +
                  'Date.now = function () { throw new Error("Date.now taqiqlangan"); };', ctx);
  FILES.forEach((f, i) => vm.runInContext(SRC[i], ctx, { filename: f }));
  return ctx.IQ;
}

const plain = x => JSON.parse(JSON.stringify(x));
const IQ = realm();

function prng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function check(g, where) {
  const v = g.view();
  const e = IQ.games.validateView(v, ID);
  assert.deepEqual(plain(e), [], where + ': ' + e.join('; '));
  checkLangs(v, where);
  return v;
}

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

function monkey(IQx, seed, level, rs, steps, onStep) {
  const R = prng(rs);
  const g = IQx.games.create(ID, seed, level);
  let t = 1000 + Math.floor(R() * 1e6);
  for (let s = 0; s < steps; s++) {
    const x = R();
    let now = t;
    if (x < 0.02) now = t - 500;
    else if (x < 0.03) now = NaN;
    if (x < 0.5) {
      t += Math.floor(R() * 500);
      const before = JSON.stringify(g.view());
      const ch = g.tick(now);
      if (!ch) assert.equal(JSON.stringify(g.view()), before, 'tick false — ko\'rinish o\'zgarmasligi kerak');
    } else if (x < 0.92) {
      t += Math.floor(R() * 400);
      const i = R() < 0.05 ? [-1, 99, 2.5, '3', null][Math.floor(R() * 5)] : Math.floor(R() * 25);
      g.tap(i, now);
    } else {
      g.press(['start', 'start', 'no', 'x', undefined, 'pause', 'resume', 'resume'][Math.floor(R() * 8)], now);
    }
    if (onStep) onStep(g);
  }
  g.resume(t);                              // pauzada qolgan bo'lsa
  g.press('start', t);
  g.tick(t + 1e7);
  if (onStep) onStep(g);
  return g;
}

function drive(g, policy, dt = 100) {
  let t = 50000;
  g.press('start', t);
  for (let guard = 0; !g.done && guard < 20000; guard++) {
    t += dt;
    g.tick(t);
    policy(g, t);
  }
  assert.ok(g.done, 'o\'yin tugashi kerak');
  return g;
}

/* 'show' da yonish tartibini yozib boradi; 'input' da birinchi
   `remember` tasini to'g'ri, qolganini tasodifiy bosadi. */
function player({ gap = 350, remember = Infinity, rs = 1, randomOnly = false }) {
  const R = prng(rs);
  let seq = [], last = -1e9, prevPhase = '';
  return (g, t) => {
    const v = g.view();
    if (v.phase === 'show') {
      if (prevPhase !== 'show') seq = [];
      const lit = v.grid.cells.findIndex(c => c.state === 'lit');
      if (lit >= 0 && seq[seq.length - 1] !== lit) seq.push(lit);
    }
    prevPhase = v.phase;
    if (v.phase !== 'input') return;
    let tt = t;
    while (g.view().phase === 'input' && tt - last >= gap) {
      const cells = g.view().grid.cells;
      const pos = cells.filter(c => c.state === 'ok').length;
      let i;
      if (!randomOnly && pos < remember && pos < seq.length) i = seq[pos];
      else {
        const free = cells.map((c, k) => (c.state === 'idle' ? k : -1)).filter(k => k >= 0);
        i = free[Math.floor(R() * free.length)];
      }
      g.tap(i, tt);
      last = tt;
      tt += gap;
      if (tt > t + 99) break;
    }
  };
}

test('ro\'yxatda: id, skill memory', () => {
  const G = IQ.games.get(ID);
  assert.ok(G);
  assert.equal(G.skill, 'memory');
});

test('manbada Math.random / Date.now / setTimeout yo\'q', () => {
  assert.ok(!/Math\.random|Date\.now|setTimeout|setInterval|performance\.now/.test(SRC[2]));
});

test('validateView har holatda bo\'sh (minglab tasodifiy harakat)', () => {
  let views = 0;
  const phases = new Set(), states = new Set();
  for (let run = 0; run < 60; run++) {
    monkey(IQ, 7919 * run + 3, 1 + (run % 10), run + 11, 800, g => {
      const v = check(g, 'run ' + run); views++;
      phases.add(v.phase);
      if (v.paused) phases.add('paused');
      if (v.grid) v.grid.cells.forEach(c => states.add(c.state));
    });
  }
  assert.ok(views > 40000);
  for (const p of ['intro', 'show', 'input', 'feedback', 'done', 'paused']) assert.ok(phases.has(p), 'faza uchramadi: ' + p);
  for (const s of ['idle', 'lit', 'ok', 'bad']) assert.ok(states.has(s), 'holat uchramadi: ' + s);
});

test('deterministik: ikki muhitda bir xil harakatlar → bir xil hamma narsa', () => {
  const IQ2 = realm();
  for (let run = 0; run < 20; run++) {
    const a = [], b = [];
    const ga = monkey(IQ, 1234 + run, 1 + (run % 10), 99 + run, 400, g => a.push(JSON.stringify(g.view())));
    const gb = monkey(IQ2, 1234 + run, 1 + (run % 10), 99 + run, 400, g => b.push(JSON.stringify(g.view())));
    assert.deepEqual(a, b);
    assert.deepEqual(plain(ga.log()), plain(gb.log()));
    assert.deepEqual(plain(ga.result()), plain(gb.result()));
  }
});

test('ko\'rsatish: bir vaqtda ko\'pi bilan bitta katak yonadi, tartib takrorlanmaydi, tick siyrak bo\'lsa ham to\'g\'ri', () => {
  for (let s = 0; s < 50; s++) {
    const L = 1 + (s % 10);
    const dense = IQ.games.create(ID, s, L);
    dense.press('start', 0);
    const order = [];
    let t = 0;
    while (dense.view().phase === 'show') {
      t += 10;
      dense.tick(t);
      const v = dense.view();
      if (v.phase !== 'show') break;
      const lit = v.grid.cells.map((c, i) => (c.state === 'lit' ? i : -1)).filter(i => i >= 0);
      assert.ok(lit.length <= 1);
      if (lit.length && order[order.length - 1] !== lit[0]) order.push(lit[0]);
    }
    assert.equal(new Set(order).size, order.length, 'katak takrorlanmaydi');
    assert.ok(order.length >= 3, 'birinchi raund uzunligi ≥ 3');
    // Ushbu tartibni bosish → raund muvaffaqiyatli (tick 10 ms va 100 ms farqsiz)
    for (const dt of [10, 100]) {
      const g = IQ.games.create(ID, s, L);
      g.press('start', 0);
      let tt = 0;
      while (g.view().phase === 'show') { tt += dt; g.tick(tt); }
      order.forEach((i, k) => g.tap(i, tt + 300 * (k + 1)));
      assert.equal(g.view().phase, 'feedback');
      assert.equal(g.result().correct, 1);
    }
  }
});

test('replay: aynan shu result() va log() (tasodifiy va haqiqiy o\'yinlar)', () => {
  for (let run = 0; run < 300; run++) {
    const seed = (run * 2654435761) >>> 0, level = 1 + (run % 10);
    const g = run % 2
      ? monkey(IQ, seed, level, run, 300 + (run % 7) * 100)
      : drive(IQ.games.create(ID, seed, level), player({ gap: 150 + (run % 5) * 90, remember: 2 + (run % 7), rs: run }), 50 + (run % 4) * 25);
    assert.ok(g.done);
    const log = plain(g.log());
    const rp = IQ.games.replay(ID, seed, level, log);
    assert.ok(rp.done);
    assert.deepEqual(plain(rp.result()), plain(g.result()), 'run ' + run);
    assert.deepEqual(plain(rp.log()), log, 'run ' + run);
    if (!(run % 2)) checkPausedReplay(seed, level, log, g.result(), run);
  }
});

test('mukammal o\'yinchi ko\'p ball oladi', () => {
  for (const level of [1, 5, 10]) {
    for (let s = 0; s < 10; s++) {
      const g = drive(IQ.games.create(ID, 100 + s, level), player({ gap: 350, rs: s }));
      const r = g.result();
      assert.equal(r.correct, 10);
      assert.equal(r.total, 10);
      assert.ok(r.points >= 90 && r.points <= 200, 'mukammal ball: ' + r.points);
      assert.ok(r.score >= 11, 'score (span): ' + r.score);
      assert.equal(r.nextLevel, Math.min(10, level + 1));
      assert.ok(r.durationMs > 30000 && r.durationMs < 180000, 'davomiylik ' + r.durationMs);
    }
  }
});

test('odamga o\'xshash o\'yinchi (5 tagacha eslaydi) — normal oraliq 30..150', () => {
  const pts = [];
  for (let s = 0; s < 30; s++) {
    const g = drive(IQ.games.create(ID, 500 + s, 5), player({ gap: 450, remember: 5, rs: s }));
    pts.push(g.result().points);
    const d = g.result().durationMs;
    assert.ok(d > 30000 && d < 150000, 'davomiylik ' + d);
  }
  const avg = pts.reduce((a, b) => a + b, 0) / pts.length;
  assert.ok(avg >= 30 && avg <= 150, 'o\'rtacha ' + avg);
});

test('tasodifiy bosuvchi kam ball oladi', () => {
  let sum = 0;
  for (let s = 0; s < 40; s++) {
    const g = drive(IQ.games.create(ID, 900 + s, 1 + (s % 10)), player({ gap: 400, randomOnly: true, rs: s }));
    sum += g.result().points;
    assert.ok(g.result().points < 25, 'tasodifiy: ' + g.result().points);
  }
  assert.ok(sum / 40 < 10, 'o\'rtacha ' + sum / 40);
});

test('tez bot (bosishlar orasi < 120 ms) 0 ball oladi', () => {
  for (let s = 0; s < 20; s++) {
    const g = drive(IQ.games.create(ID, 300 + s, 1 + (s % 10)), player({ gap: 30, rs: s }));
    assert.equal(g.result().correct, 10);
    assert.equal(g.result().points, 0);
    assert.equal(g.result().flagged, true);
    assert.equal(g.result().nextLevel, 1 + (s % 10), 'bot darajani o\'zgartirmaydi');
    assert.equal(g.view().display.en, BOT_EN, 'sabab — yakun matnida');
    assert.equal(IQ.games.replay(ID, 300 + s, 1 + (s % 10), plain(g.log())).result().points, 0);
  }
});

test('daraja qiyinlikni oshiradi: uzunlik, panjara, tezlik', () => {
  const first = level => {
    const g = IQ.games.create(ID, 42, level);
    g.press('start', 0);
    let t = 0, litMs = 0, n = 0, prev = -1;
    while (g.view().phase === 'show') {
      t += 5; g.tick(t);
      const v = g.view();
      if (v.phase !== 'show') break;
      const lit = v.grid.cells.findIndex(c => c.state === 'lit');
      if (lit >= 0) { litMs += 5; if (lit !== prev) n++; }
      prev = lit;
    }
    return { cols: g.view().grid.cols, span: n, onMs: litMs / n };
  };
  let prev = first(1);
  for (let L = 2; L <= 10; L++) {
    const cur = first(L);
    assert.ok(cur.span >= prev.span && cur.cols >= prev.cols && cur.onMs <= prev.onMs + 5, 'daraja ' + L);
    prev = cur;
  }
  assert.ok(first(10).span > first(1).span);
  assert.ok(first(10).cols > first(1).cols);
  assert.ok(first(10).onMs < first(1).onMs);
});

test('moslashuv: muvaffaqiyat → uzunroq, xato → qisqaroq', () => {
  const lens = policy => {
    const out = [];
    let prevPhase = '';
    drive(IQ.games.create(ID, 77, 5), (g, t) => {
      const v = g.view();
      if (v.phase === 'show' && prevPhase !== 'show') out.push(Number(v.hud[2].value));
      prevPhase = v.phase;
      policy(g, t);
    });
    return out;
  };
  const up = lens(player({ gap: 300 }));
  for (let i = 1; i < up.length; i++) assert.equal(up[i], Math.min(12, up[i - 1] + 1));
  const down = lens(player({ gap: 300, randomOnly: true, rs: 3 }));
  assert.ok(down[down.length - 1] < down[0], 'xatolarda qisqarishi kerak: ' + down);
});

test('\'show\' da, bosilgan yoki mavjud bo\'lmagan katakka bosish e\'tiborsiz', () => {
  const g = IQ.games.create(ID, 5, 4);
  g.tap(0, 0);
  assert.equal(g.log().length, 0);
  g.press('start', 10);
  for (let i = 0; i < 16; i++) g.tap(i, 20 + i);
  assert.equal(g.log().length, 1);
  const order = [];
  let t = 10;
  while (g.view().phase === 'show') {
    t += 20; g.tick(t);
    const lit = g.view().grid ? g.view().grid.cells.findIndex(c => c.state === 'lit') : -1;
    if (lit >= 0 && order[order.length - 1] !== lit) order.push(lit);
  }
  g.tap(order[0], t + 300);
  const n = g.log().length;
  const v1 = JSON.stringify(g.view());
  assert.equal(g.view().grid.cells[order[0]].label, '1');
  g.tap(order[0], t + 600);                  // qayta bosish
  g.tap(-1, t + 700); g.tap(1e9, t + 800); g.tap('x', t + 900); g.press('start', t + 1000);
  assert.equal(g.log().length, n);
  assert.equal(JSON.stringify(g.view()), v1);
});

test('cheklangan: faqat tick — o\'yin o\'zi tugaydi; bosishlar soni chegaralangan', () => {
  for (let L = 1; L <= 10; L++) {
    const g = IQ.games.create(ID, L * 13, L);
    g.press('start', 0);
    let t = 0;
    while (!g.done && t < 10 * 60 * 1000) { t += 100; g.tick(t); }
    assert.ok(g.done, 'daraja ' + L);
    const r = g.result();
    assert.equal(r.points, 0);
    assert.equal(r.total, 10);
    assert.ok(r.durationMs <= 5 * 60 * 1000);
  }
  for (let run = 0; run < 30; run++) {
    const g = monkey(IQ, run, 1 + (run % 10), run, 3000);
    assert.ok(g.log().filter(e => e.k === 'tap').length <= 10 * 12);
  }
});

test('matnlar: uz/ru/en, langs; odam o\'yinida flagged yo\'q, yakun matni izohlaydi', () => {
  checkRegistered();
  const g = drive(IQ.games.create(ID, 100, 5), player({ gap: 350 }));
  const r = g.result(), v = check(g, 'done');
  assert.equal(r.flagged, false);
  assert.equal(v.display.en, 'Longest sequence repeated: ' + r.score);
});

test('intro: HUD, panjara va ko\'rsatma o\'yin paytidagi bilan bir xil shaklda (sakrash yo\'q)', () => {
  for (let L = 1; L <= 10; L++) {
    const g = IQ.games.create(ID, L, L);
    const a = check(g, 'intro');
    g.press('start', 0);
    const b = check(g, 'show');
    assert.deepEqual(plain(a.hud.map(h => h.label)), plain(b.hud.map(h => h.label)));
    assert.equal(a.grid.cols, b.grid.cols);
    assert.equal(a.grid.cells.length, b.grid.cells.length);
    assert.ok(a.grid.cells.every(c => c.state === 'disabled' && c.label === ''));
    assert.equal(a.display, null);
  }
});

test('pauza (jonli): ko\'rsatish to\'xtaydi va yashirinadi, keyin to\'xtagan joyidan davom etadi', () => {
  const inputs = (g, t) => { for (let i = 0; i < 25; i++) g.tap(i, t); g.press('start', t); };
  // 1300 ms — birinchi katak yonib turibdi (500 ms tayyorlanishdan keyin)
  const { before, after, res0, g } = livePause(inputs, { warm: 1600 });
  assert.ok(JSON.parse(before).grid.cells.some(c => c.state === 'lit'), 'pauza katak yonib turganda');
  assert.equal(after, before, 'davom etgach aynan o\'sha katak yonadi');
  assert.equal(JSON.stringify(g.result()), res0);
  const rp = IQ.games.replay(ID, 7, 3, plain(g.log()));
  assert.deepEqual(plain(rp.log()), plain(g.log()));
  // ko'rsatish qolgan qismi: tartibni oxirigacha yozib, bosamiz — raund to'g'ri
  const order = [];
  let t = 1600 + 40 * 15000 + RESUME;
  for (const c of JSON.parse(before).grid.cells) if (c.state === 'lit') order.push(JSON.parse(before).grid.cells.indexOf(c));
  // pauzadan oldingi katak(lar)ni ham hisobga olib, butun tartibni yangi o'yinda o'qiymiz
  const ref = IQ.games.create(ID, 7, 3);
  ref.press('start', 1000);
  const full = [];
  for (let tt = 1000; ref.view().phase === 'show'; tt += 10) {
    ref.tick(tt);
    const i = ref.view().grid.cells.findIndex(c => c.state === 'lit');
    if (i >= 0 && full[full.length - 1] !== i) full.push(i);
  }
  while (g.view().phase === 'show') { t += 10; g.tick(t); }
  full.forEach((i, k) => g.tap(i, t + 300 * (k + 1)));
  assert.equal(g.result().correct, 1, 'pauza tartibni buzmaydi');
  assert.ok(order.length <= 1);
});
