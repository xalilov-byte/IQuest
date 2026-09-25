/* ─────────────────────────────────────────────────────────────────────────
   tests/game-nback.test.mjs — "N-orqaga" o'yini

   Isbotlanadi (CONTRACT.md §9):
     · validateView har holatda bo'sh — minglab tasodifiy bosish/tick;
     · deterministik — ikki alohida muhitda bir xil harakatlar → bir xil
       ko'rinishlar, jurnal va natija;
     · replay — IQ.games.replay aynan shu result() va log() ni beradi;
     · ketma-ketlikda aniq 8/24 mos, qolganlari aniq mos emas;
     · mukammal o'yinchi ko'p; tasodifiy, "hammasiga Mos", "hech narsa
       bosmaslik" kam; tez bot 0 ball;
     · daraja qiyinlikni oshiradi (n va sur'at); o'yin cheklangan vaqtda.

   Fayllar node:vm ichida yuklanadi; muhitda Math.random va Date.now
   chaqirilsa darhol yiqiladi.
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const ID = 'nback';
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
const nOf = L => (L <= 3 ? 1 : L <= 7 ? 2 : 3);

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
      t += Math.floor(R() * 700);
      const before = JSON.stringify(g.view());
      const ch = g.tick(now);
      if (!ch) assert.equal(JSON.stringify(g.view()), before, 'tick false — ko\'rinish o\'zgarmasligi kerak');
    } else if (x < 0.9) {
      t += Math.floor(R() * 500);
      g.press(['yes', 'no', 'yes', 'no', 'start', 'x', undefined, 3][Math.floor(R() * 8)], now);
    } else {
      g.tap(Math.floor(R() * 10) - 2, now);
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

/* Harflarni "+" dan keyin chiqqanda yozib boradi. `answer(hist, n, R)`
   → 'yes' | 'no' | null; javob harf chiqqanidan `rt` ms keyin. */
function player({ rt = 600, rs = 1, answer }) {
  const R = prng(rs);
  const hist = [];
  let prevCh = '+', seenAt = 0;
  return (g, t) => {
    const v = g.view();
    const ch = v.display && v.display.kind === 'text' ? v.display.uz : '+';
    if (v.phase !== 'intro' && v.phase !== 'done' && ch !== '+' && prevCh === '+') { hist.push(ch); seenAt = t; }
    prevCh = ch;
    if (v.phase !== 'input' || t - seenAt < rt) return;
    const n = Number(v.hud[2].value);
    const a = answer(hist, n, R);
    if (a) g.press(a, t);
  };
}
const perfect = (h, n) => (h[h.length - 1] === h[h.length - 1 - n] ? 'yes' : 'no');
const coin = (h, n, R) => (R() < 0.5 ? 'yes' : 'no');

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
  const phases = new Set();
  for (let run = 0; run < 60; run++) {
    monkey(IQ, 7919 * run + 3, 1 + (run % 10), run + 11, 800, g => {
      check(g, 'run ' + run); views++;
      const v = g.view(); phases.add(v.phase);
      assert.ok(v.buttons.length === 0 || v.phase === 'input' || v.phase === 'intro');
      if (v.phase === 'input') assert.deepEqual(plain(v.buttons.map(b => b.id)), ['yes', 'no']);
    });
  }
  assert.ok(views > 40000);
  for (const p of ['intro', 'show', 'input', 'feedback', 'done']) assert.ok(phases.has(p), 'faza uchramadi: ' + p);
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

test('ketma-ketlik: 24 baholanadigan harfdan aniq 8 tasi mos', () => {
  for (let s = 0; s < 300; s++) {
    const L = 1 + (s % 10), n = nOf(L);
    const hist = [];
    let matches = 0, judged = 0;
    drive(IQ.games.create(ID, s * 7 + 1, L), player({
      rs: s,
      answer: (h, nn) => {
        judged++;
        if (h[h.length - 1] === h[h.length - 1 - nn]) matches++;
        hist.push(h.length);
        return perfect(h, nn);
      },
    }));
    assert.equal(judged, 24);
    assert.equal(matches, 8);
    assert.equal(hist[0], n + 1, 'birinchi javob n+1-harfda');
  }
});

test('replay: aynan shu result() va log() (tasodifiy va haqiqiy o\'yinlar)', () => {
  for (let run = 0; run < 300; run++) {
    const seed = (run * 2654435761) >>> 0, level = 1 + (run % 10);
    const acc = 0.5 + (run % 5) * 0.1;
    const g = run % 2
      ? monkey(IQ, seed, level, run, 300 + (run % 7) * 100)
      : drive(IQ.games.create(ID, seed, level), player({
        rt: 200 + (run % 6) * 150, rs: run,
        answer: (h, n, R) => (R() < 0.1 ? null : R() < acc ? perfect(h, n) : coin(h, n, R)),
      }), 50 + (run % 4) * 50);
    assert.ok(g.done);
    const log = plain(g.log());
    const rp = IQ.games.replay(ID, seed, level, log);
    assert.ok(rp.done);
    assert.deepEqual(plain(rp.result()), plain(g.result()), 'run ' + run);
    assert.deepEqual(plain(rp.log()), log, 'run ' + run);
  }
});

test('mukammal o\'yinchi ko\'p ball oladi', () => {
  for (let L = 1; L <= 10; L++) {
    for (let s = 0; s < 5; s++) {
      const g = drive(IQ.games.create(ID, 100 + s, L), player({ rs: s, answer: perfect }));
      const r = g.result();
      assert.equal(r.correct, 24);
      assert.equal(r.total, 24);
      assert.equal(r.score, 100);
      assert.equal(r.points, 50 + 10 * nOf(L) + 5 * L);
      assert.equal(r.nextLevel, Math.min(10, L + 1));
      assert.ok(r.durationMs > 40000 && r.durationMs < 90000, 'davomiylik ' + r.durationMs);
    }
  }
});

test('odamga o\'xshash o\'yinchi (80% aniq) — normal oraliq 30..150', () => {
  const pts = [];
  for (let s = 0; s < 40; s++) {
    const g = drive(IQ.games.create(ID, 500 + s, 5), player({
      rs: s, rt: 700, answer: (h, n, R) => (R() < 0.8 ? perfect(h, n) : (perfect(h, n) === 'yes' ? 'no' : 'yes')),
    }));
    pts.push(g.result().points);
  }
  const avg = pts.reduce((a, b) => a + b, 0) / pts.length;
  assert.ok(avg >= 30 && avg <= 150, 'o\'rtacha ' + avg);
});

test('tasodifiy, "hammasiga Mos", "hammasiga Mos emas", "bosmaslik" — kam ball', () => {
  let sum = 0;
  for (let s = 0; s < 40; s++) {
    const g = drive(IQ.games.create(ID, 900 + s, 1 + (s % 10)), player({ rs: s, answer: coin }));
    sum += g.result().points;
  }
  assert.ok(sum / 40 < 20, 'tasodifiy o\'rtacha ' + sum / 40);
  for (const a of ['yes', 'no', null]) {
    for (let s = 0; s < 10; s++) {
      const g = drive(IQ.games.create(ID, 40 + s, 1 + s), player({ rs: s, answer: () => a }));
      assert.equal(g.result().points, 0, 'doim ' + a);
      assert.equal(g.result().score, 0);
    }
  }
});

test('tez bot (harfdan < 120 ms keyin javob) 0 ball oladi', () => {
  for (let s = 0; s < 20; s++) {
    const L = 1 + (s % 10);
    const g = drive(IQ.games.create(ID, 300 + s, L), player({ rs: s, rt: 0, answer: perfect }), 20);
    assert.equal(g.result().correct, 24, 'bot hammasini to\'g\'ri topadi');
    assert.equal(g.result().points, 0);
    assert.equal(IQ.games.replay(ID, 300 + s, L, plain(g.log())).result().points, 0);
  }
});

test('daraja qiyinlikni oshiradi: n va sur\'at', () => {
  const info = L => {
    const g = IQ.games.create(ID, 42, L);
    g.press('start', 0);
    let t = 0;
    while (!g.done) { t += 50; g.tick(t); }
    return { n: nOf(L), hudN: Number(g.view().hud[2].value), dur: g.result().durationMs };
  };
  let prev = info(1);
  assert.equal(prev.hudN, 1);
  for (let L = 2; L <= 10; L++) {
    const cur = info(L);
    assert.equal(cur.hudN, cur.n);
    assert.ok(cur.n >= prev.n);
    prev = cur;
  }
  assert.equal(info(10).n, 3);
  // davr qisqaradi: bir xil n da yuqori daraja tezroq
  assert.ok(info(3).dur < info(1).dur);
  assert.ok(info(10).dur < info(8).dur);
});

test('javobsiz qolgan harf — xato; feedback va \'show\' da bosish e\'tiborsiz', () => {
  const g = IQ.games.create(ID, 9, 1);
  g.press('yes', 0);                         // intro — e'tiborsiz
  g.tap(0, 0);
  assert.equal(g.log().length, 0);
  g.press('start', 0);
  g.press('yes', 100);                       // tayyorlanish ('show')
  g.tick(1000);                               // 1-harf ('show', n=1)
  assert.equal(g.view().phase, 'show');
  g.press('no', 1200);
  assert.equal(g.log().filter(e => e.k === 'press').length, 1);
  g.tick(600 + 2900 + 10);                    // 2-harf — 'input'
  assert.equal(g.view().phase, 'input');
  g.press('no', 4000);
  assert.equal(g.view().phase, 'feedback');
  const n = g.log().length;
  g.press('yes', 4100); g.press('no', 4200);
  assert.equal(g.log().length, n);
  g.tick(600 + 3 * 2900 + 10);                // 3-harf javobsiz o'tib ketdi
  assert.equal(g.result().total, 2);
});

test('cheklangan: faqat tick — o\'yin o\'zi tugaydi', () => {
  for (let L = 1; L <= 10; L++) {
    const g = IQ.games.create(ID, L * 13, L);
    g.press('start', 0);
    let t = 0;
    while (!g.done && t < 5 * 60 * 1000) { t += 100; g.tick(t); }
    assert.ok(g.done, 'daraja ' + L);
    const r = g.result();
    assert.equal(r.points, 0);
    assert.equal(r.correct, 0);
    assert.equal(r.total, 24);
    assert.equal(r.durationMs, 600 + (nOf(L) + 24) * (3000 - 100 * L));
    assert.equal(r.nextLevel, Math.max(1, L - 1));
  }
  for (let run = 0; run < 30; run++) {
    const g = monkey(IQ, run, 1 + (run % 10), run, 3000);
    assert.ok(g.log().filter(e => e.k === 'press').length <= 25);
  }
});
