/* ─────────────────────────────────────────────────────────────────────────
   src/badges.js — 21 ta yutuq nishoni (§6.6, §14)
   Har qoida alohida tekshiriladi; hech bir qoida IQ natijasini oʻqimaydi.
   Ishga tushirish:  npm test
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('../src/badges.js', import.meta.url), 'utf8');
const KEY = 'nz-badges';
const plain = x => JSON.parse(JSON.stringify(x));
const T0 = Date.UTC(2026, 8, 25, 9);

function env(store = new Map()) {
  const ctx = { console };
  ctx.window = ctx;
  ctx.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
  };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  return { B: ctx.nzBadges, store, disk: () => JSON.parse(store.get(KEY) || 'null') };
}

const ZERO = {
  answered: 0, testsDone: 0, longestStreak: 0, bestWeekBall: 0,
  levels: { matrix: 3, series: 3, spatial: 3, verbal: 3 }, games: {}, fixes: 0,
  lastRun: null, profileComplete: false,
};
const S = patch => Object.assign({}, ZERO, patch);

test('21 nishon, jami 870 tanga, jadval §6.6 bilan bir xil', () => {
  const { B } = env();
  const c = B.catalogue();
  assert.equal(c.length, 21);
  assert.equal(c.reduce((s, b) => s + b.coins, 0), 870);
  assert.deepEqual(plain(c.map(b => b.id)), ['first-test', 'answers-100', 'answers-500', 'answers-2000',
    'perfect-10', 'fixer-20', 'matrix-7', 'series-7', 'spatial-7', 'verbal-7', 'games-all', 'game-lv5',
    'game-lv10', 'streak-3', 'streak-7', 'streak-30', 'league-silver', 'league-gold', 'league-platinum',
    'league-diamond', 'profile']);
  c.forEach(b => {
    assert.ok(b.coins >= 10 && b.coins <= 150, b.id);
    ['uz', 'ru', 'en'].forEach(l => { assert.ok(b.name[l].trim()); assert.ok(b.cond[l].trim()); });
    assert.doesNotMatch(b.name.uz + b.cond.uz, /['‘’`]/, 'oʻzbekchada ʻ va ʼ: ' + b.id);
    assert.doesNotMatch(b.name.en + b.cond.en, /[Ѐ-ӿʻʼ]/);
    const all = [b.name.uz, b.name.ru, b.name.en, b.cond.uz, b.cond.ru, b.cond.en].join(' ').toLowerCase();
    assert.doesNotMatch(all, /daho|genius|гений|top ?\d|топ|%|rasmiy|official|официальн|mensa|klinik|clinical|smarter|aqlli|умнее/);
    assert.doesNotMatch(all, /streak|стреак/, 'F27: «streak» soʻzi foydalanuvchiga chiqmaydi');
  });
});

test('boʻsh statistikada hech narsa berilmaydi', () => {
  const { B } = env();
  assert.deepEqual(plain(B.check(ZERO, T0)), []);
  assert.deepEqual(plain(B.check({}, T0)), []);
  assert.deepEqual(plain(B.check(null, T0)), []);
  assert.deepEqual(plain(B.check({ answered: 'x', levels: 5, games: [1], lastRun: 'x' }, T0)), []);
});

/* Har qoida: chegaradan bitta past — yoʻq, chegarada — bor. */
const RULES = [
  ['first-test', S({ testsDone: 0 }), S({ testsDone: 1 })],
  ['answers-100', S({ answered: 99 }), S({ answered: 100 })],
  ['answers-500', S({ answered: 499 }), S({ answered: 500 })],
  ['answers-2000', S({ answered: 1999 }), S({ answered: 2000 })],
  ['perfect-10', S({ lastRun: { kind: 'practice', n: 10, correct: 9 } }), S({ lastRun: { kind: 'practice', n: 10, correct: 10 } })],
  ['fixer-20', S({ fixes: 19 }), S({ fixes: 20 })],
  ['matrix-7', S({ levels: { matrix: 6 } }), S({ levels: { matrix: 7 } })],
  ['series-7', S({ levels: { series: 6 } }), S({ levels: { series: 7 } })],
  ['spatial-7', S({ levels: { spatial: 6 } }), S({ levels: { spatial: 7 } })],
  ['verbal-7', S({ levels: { verbal: 6 } }), S({ levels: { verbal: 7 } })],
  ['games-all', S({ games: { flanker: { plays: 1 }, 'matrix-memory': { plays: 2 }, 'mental-math': { plays: 1 }, nback: { plays: 1 }, schulte: { plays: 1 }, demo: { plays: 9 } } }),
                S({ games: { flanker: { plays: 1 }, 'matrix-memory': { plays: 2 }, 'mental-math': { plays: 1 }, nback: { plays: 1 }, schulte: { plays: 1 }, sequence: { plays: 1 } } })],
  ['game-lv5', S({ games: { nback: { level: 4 }, demo: { level: 10 } } }), S({ games: { nback: { level: 5 } } })],
  ['game-lv10', S({ games: { nback: { level: 9 } } }), S({ games: { schulte: { level: 10 } } })],
  ['streak-3', S({ longestStreak: 2 }), S({ longestStreak: 3 })],
  ['streak-7', S({ longestStreak: 6 }), S({ longestStreak: 7 })],
  ['streak-30', S({ longestStreak: 29 }), S({ longestStreak: 30 })],
  ['league-silver', S({ bestWeekBall: 499 }), S({ bestWeekBall: 500 })],
  ['league-gold', S({ bestWeekBall: 1199 }), S({ bestWeekBall: 1200 })],
  ['league-platinum', S({ bestWeekBall: 2499 }), S({ bestWeekBall: 2500 })],
  ['league-diamond', S({ bestWeekBall: 4999 }), S({ bestWeekBall: 5000 })],
  ['profile', S({ profileComplete: 'yes' }), S({ profileComplete: true })],
];
RULES.forEach(([id, below, at]) => {
  test('qoida: ' + id, () => {
    const { B } = env();
    assert.ok(!B.check(below, T0).includes(id), 'chegaradan past');
    assert.ok(B.check(at, T0).includes(id), 'chegarada');
    assert.deepEqual(plain(B.progress(id, below)), { n: B.info(id).target, target: B.info(id).target }, 'olingandan keyin toʻliq');
  });
});

test('perfect-10: takrorlash, test va chala mashq hisoblanmaydi', () => {
  const { B } = env();
  for (const r of [{ kind: 'review', n: 10, correct: 10 }, { kind: 'test', n: 30, correct: 30 },
                   { kind: 'practice', n: 5, correct: 5 }]) {
    assert.ok(!B.check(S({ lastRun: r }), T0).includes('perfect-10'), JSON.stringify(r));
  }
});

test('fixer-20: bump() hisoblagichi ham ishlaydi, notanish hisoblagich yoʻq', () => {
  const { B, store } = env();
  for (let i = 0; i < 19; i++) B.bump('fixes');
  assert.equal(B.bump('nope'), null);
  assert.equal(B.counters().fixes, 19);
  assert.deepEqual(plain(B.progress('fixer-20', ZERO)), { n: 19, target: 20 });
  assert.equal(env(store).B.counters().fixes, 19, 'diskda saqlanadi');
  B.bump('fixes', 1);
  assert.ok(B.check(ZERO, T0).includes('fixer-20'));
});

test('hech bir qoida IQ maydonini oʻqimaydi (Proxy + manba)', () => {
  const { B } = env();
  const read = new Set();
  const spy = o => new Proxy(o, { get(t, k) { if (typeof k === 'string') read.add(k); const v = t[k]; return v && typeof v === 'object' ? spy(v) : v; } });
  const stats = spy(S({ iq: 145, bestIQ: 145, lastIQ: 145, lastRun: { kind: 'test', n: 30, correct: 30, iq: 145 } }));
  B.check(stats, T0);
  B.catalogue().forEach(b => B.progress(b.id, stats));
  [...read].forEach(k => assert.doesNotMatch(k, /iq/i, 'oʻqildi: ' + k));
  assert.deepEqual(plain(B.check(S({ iq: 200, bestIQ: 200 }), T0)), []);
  const code = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/(['"])(?:\\.|(?!\1).)*\1/g, '""');
  assert.doesNotMatch(code, /\biq\b|\bIQ\b|\.iq|bestIQ|lastIQ/i);
});

test('nishon qaytarib olinmaydi va takror berilmaydi', () => {
  const { B, store } = env();
  assert.deepEqual(plain(B.check(S({ longestStreak: 7, levels: { matrix: 7 } }), T0)),
    ['matrix-7', 'streak-3', 'streak-7']);
  assert.deepEqual(plain(B.check(ZERO, T0 + 1)), [], 'hammasi nolga tushsa ham');
  assert.deepEqual(plain(B.check(S({ longestStreak: 7 }), T0 + 2)), []);
  assert.equal(B.earned()['streak-7'], T0);
  const again = env(store).B;
  assert.equal(again.has('matrix-7'), true);
  assert.deepEqual(plain(again.check(S({ longestStreak: 7 }), T0 + 3)), []);
  assert.deepEqual(plain(again.progress('matrix-7', ZERO)), { n: 7, target: 7 });
});

test('orqaga qarab hisoblash: 1.0 foydalanuvchisi — bir yoʻla, katalog tartibida', () => {
  const { B } = env();
  const veteran = {
    answered: 2300, testsDone: 4, longestStreak: 12, bestWeekBall: 1300,
    levels: { matrix: 8, series: 5, spatial: 7, verbal: 2 },
    games: { flanker: { plays: 3, level: 6 }, 'matrix-memory': { plays: 1, level: 2 }, 'mental-math': { plays: 1, level: 1 },
             nback: { plays: 1, level: 1 }, schulte: { plays: 4, level: 3 }, sequence: { plays: 1, level: 1 } },
    fixes: 25, lastRun: { kind: 'practice', n: 10, correct: 10 }, profileComplete: false,
  };
  const got = plain(B.check(veteran, T0));
  assert.deepEqual(got, ['first-test', 'answers-100', 'answers-500', 'answers-2000', 'perfect-10', 'fixer-20',
    'matrix-7', 'spatial-7', 'games-all', 'game-lv5', 'streak-3', 'streak-7', 'league-silver', 'league-gold']);
  const coins = got.reduce((s, id) => s + B.info(id).coins, 0);
  assert.equal(coins, 20 + 10 + 30 + 80 + 20 + 20 + 30 + 30 + 20 + 20 + 15 + 40 + 25 + 50);
  assert.deepEqual(plain(B.summary()), { earned: 14, total: 21 });
});

test('progress(): son, maqsad, notanish id → null', () => {
  const { B } = env();
  assert.deepEqual(plain(B.progress('answers-100', S({ answered: 37 }))), { n: 37, target: 100 });
  assert.deepEqual(plain(B.progress('games-all', S({ games: { nback: { plays: 1 }, sequence: { plays: 0 } } }))), { n: 1, target: 6 });
  assert.deepEqual(plain(B.progress('league-gold', S({ bestWeekBall: 99999 }))), { n: 1200, target: 1200 });
  assert.equal(B.progress('nope', ZERO), null);
  assert.equal(B.info('compass'), null, 'kolleksiya nishoni bu yerda emas');
});

test('unseen / markSeen — bayram navbati', () => {
  const { B, store } = env();
  B.check(S({ answered: 100, testsDone: 1 }), T0);
  assert.deepEqual(plain(B.unseen()), ['first-test', 'answers-100']);
  B.markSeen(['first-test', 'streak-30', 'nope']);
  assert.deepEqual(plain(B.unseen()), ['answers-100']);
  assert.deepEqual(plain(env(store).B.unseen()), ['answers-100']);
});

test('buzilgan yozuv → standart; notanish (kelajakdagi) id saqlanib qoladi', () => {
  for (const raw of ['{x', '[]', JSON.stringify({ v: 1, earned: { 'first-test': 'x', 'Bad Id': 5 }, seen: 7, counters: { fixes: -3 } })]) {
    const { B } = env(new Map([[KEY, raw]]));
    assert.deepEqual(plain(B.earned()), {});
    assert.equal(B.counters().fixes, 0);
  }
  const store = new Map([[KEY, JSON.stringify({ v: 1, earned: { 'future-badge': 5, 'first-test': 7 }, seen: ['first-test'], counters: { fixes: 3 } })]]);
  const { B, disk } = env(store);
  assert.deepEqual(plain(B.earned()), { 'first-test': 7 });
  B.bump('fixes');
  assert.equal(disk().earned['future-badge'], 5);
});

test('yangiroq versiya → readOnly: nishon berilmaydi, ustiga yozilmaydi', () => {
  const raw = JSON.stringify({ v: 3, earned: { 'first-test': 1 } });
  const store = new Map([[KEY, raw]]);
  const { B } = env(store);
  assert.equal(B.readOnly(), true);
  assert.deepEqual(plain(B.check(S({ testsDone: 5 }), T0)), []);
  B.bump('fixes'); B.markSeen(['first-test']);
  assert.equal(store.get(KEY), raw);
  B.reset();
  assert.equal(store.has(KEY), false);
  assert.equal(B.readOnly(), false);
});

test('nishon setkasi (80 px, 2 qator): ru/en nomda har soʻz ≤ 12 belgi', () => {
  const { B } = env();
  B.catalogue().forEach(b => ['uz', 'ru', 'en'].forEach(l => {
    const words = b.name[l].split(/\s+/);
    words.forEach(w => assert.ok(w.length <= 12, b.id + ' ' + l + ': ' + w));
    assert.ok(words.length <= 3 && b.name[l].length <= 24, b.id + ' ' + l);
  }));
});
