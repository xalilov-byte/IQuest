/* ─────────────────────────────────────────────────────────────────────────
   tests/game-sequence.test.mjs — "Ketma-ketlik" (Korsi) o'yini

   Isbotlanadi (CONTRACT.md §9):
     · validateView har holatda bo'sh — minglab tasodifiy bosish/tick;
     · deterministik — ikki alohida muhitda bir xil harakatlar → bir xil
       ko'rinishlar, jurnal va natija;
     · replay — IQ.games.replay aynan shu result() va log() ni beradi;
     · ko'rsatish tick(now) bilan to'g'ri tartibda, siyrak tick'da ham;
     · mukammal o'yinchi ko'p, tasodifiy bosuvchi kam, tez bot 0 ball;
     · daraja qiyinlikni oshiradi; o'yin cheklangan vaqtda tugaydi.

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
  const e = IQ.games.validateView(g.view());
  assert.deepEqual(plain(e), [], where + ': ' + e.join('; '));
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
      g.press(['start', 'start', 'no', 'x', undefined][Math.floor(R() * 5)], now);
    }
    if (onStep) onStep(g);
  }
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
      check(g, 'run ' + run); views++;
      const v = g.view(); phases.add(v.phase);
      if (v.grid) v.grid.cells.forEach(c => states.add(c.state));
    });
  }
  assert.ok(views > 40000);
  for (const p of ['intro', 'show', 'input', 'feedback', 'done']) assert.ok(phases.has(p), 'faza uchramadi: ' + p);
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
