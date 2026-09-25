/* ─────────────────────────────────────────────────────────────────────────
   src/wallet.js — hamyon, kunlik vazifalar, soat himoyasi (§6.3–§6.9, §14)

   Vaqt har doim kiritiladi (`now`), soat mintaqasi qatʼiy (Toshkent,
   yozgi vaqt yoʻq) — natija mashinaga bogʻliq emas.
   Ishga tushirish:  npm test
   ───────────────────────────────────────────────────────────────────── */

process.env.TZ = 'Asia/Tashkent';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const SRC = f => fs.readFileSync(new URL('../src/' + f, import.meta.url), 'utf8');
const plain = x => JSON.parse(JSON.stringify(x));
const KEY = 'nz-wallet';
const at = (y, m, d, h = 12, mi = 0) => new Date(y, m - 1, d, h, mi).getTime();
const H = 3600000;

/* store — Map, yangi `env(store)` ilovani qayta ochishga teng. */
function env(store = new Map(), opts = {}) {
  const ls = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { if (opts.full) throw new Error('QuotaExceededError'); store.set(k, String(v)); },
    removeItem: k => { store.delete(k); },
  };
  const ctx = { console };
  ctx.window = ctx;
  if (!opts.noStorage) ctx.localStorage = ls;
  vm.createContext(ctx);
  if (!opts.noCatalog) vm.runInContext(SRC('catalog.js'), ctx);
  vm.runInContext(SRC('wallet.js'), ctx);
  return { W: ctx.nzWallet, store, disk: () => JSON.parse(store.get(KEY) || 'null') };
}

const CTX = { wrongCount: 0, weakestType: 'series', gameOfDay: 'schulte' };
const ans = (mode, correct = true, itemType = 'matrix') => ({ type: 'answer', mode, correct, itemType });
const T0 = at(2026, 9, 25, 12);

test('boʻsh hamyon: balans 0, hech narsa oʻylab topilmaydi', () => {
  const { W } = env();
  assert.equal(W.balance(), 0);
  assert.equal(W.ledger().length, 0);
  assert.equal(W.readOnly(), false);
  assert.equal(W.owns('color:purple'), true, 'bepul rang doim bor');
  assert.equal(W.owns('color:red'), false);
});

test('credit: kalit boʻyicha takrorlanmaydi, qayta ochishda ham', () => {
  const { W, store } = env();
  assert.equal(W.credit(50, 'welcome', 'welcome', T0), true);
  assert.equal(W.credit(50, 'welcome', 'welcome', T0), false);
  assert.equal(W.credit(20, 'badge', 'b:first-test', T0), true);
  assert.equal(W.credit(20, 'badge', 'b:first-test', T0), false);
  assert.equal(W.balance(), 70);
  const again = env(store).W;
  assert.equal(again.balance(), 70);
  assert.equal(again.credit(20, 'badge', 'b:first-test', T0), false, 'yiqilib qayta ochilsa ham ikki marta berilmaydi');
});

test('credit: notoʻgʻri manba, kalit va miqdor rad etiladi', () => {
  const { W } = env();
  const bad = [
    [10, 'answer', 'a:1'], [10, 'quest', 'q:2026-09-25:q4'], [10, 'quest', 'q:2026-02-30:q1'],
    [15, 'quest', 'q:2026-09-25:q1'], [30, 'week', 'w:2026-09-21'], [25, 'week', 'w:2026-09-22'],
    [49, 'welcome', 'welcome'], [0, 'badge', 'b:x'], [-5, 'badge', 'b:x'], [1.5, 'badge', 'b:x'],
    [NaN, 'badge', 'b:x'], [1e9, 'badge', 'b:x'], [10, 'badge', 'b:__proto__'], [10, 'badge', 'w:2026-09-21'],
    ['10', 'badge', 'b:x'], [10, 'test', 'iq:1'],
  ];
  bad.forEach(a => assert.equal(W.credit(a[0], a[1], a[2], T0), false, JSON.stringify(a)));
  assert.equal(W.balance(), 0);
  assert.equal(W.credit(25, 'week', 'w:2026-09-21', T0), true, 'dushanba + jadvaldagi miqdor');
});

test('04:00 da kun almashadi (progress.js dayKey bilan bir xil)', () => {
  const { W } = env();
  assert.equal(W.dayKey(at(2026, 9, 25, 3, 59)), '2026-09-24');
  assert.equal(W.dayKey(at(2026, 9, 25, 4, 0)), '2026-09-25');
  assert.equal(W.dayKey(at(2026, 1, 1, 2)), '2025-12-31');
  const ctx = { window: {}, localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
                setTimeout, clearTimeout, console, crypto: globalThis.crypto,
                addEventListener() {}, document: { addEventListener() {} } };
  vm.createContext(ctx);
  vm.runInContext(SRC('progress.js'), ctx);
  for (let t = at(2026, 12, 30, 0); t < at(2027, 1, 3, 0); t += 37 * 60000) {
    assert.equal(W.dayKey(t), ctx.window.nzProgress.dayKey(t));
  }
});

test('vazifalar: shakl, kun davomida qatʼiy (ctx oʻzgarsa ham)', () => {
  const { W } = env();
  const q = plain(W.quests('2026-09-25', CTX, T0));
  assert.deepEqual(q, [
    { id: 'q1', kind: 'practice', n: 0, target: 10, done: false, reward: 10 },
    { id: 'q2', kind: 'game', n: 0, target: 1, done: false, reward: 10, game: 'schulte' },
    { id: 'q3', kind: 'type', n: 0, target: 5, done: false, reward: 10, type: 'series' },
  ]);
  const later = plain(W.quests('2026-09-25', { wrongCount: 9, weakestType: 'verbal', gameOfDay: 'nback' }, T0 + 3 * H));
  assert.deepEqual(later, q, 'oʻsha kun qayta hisoblanmaydi');
});

test('q3 almashishi: Xatolarim ≥ 3 → «Xatolarni tuzating», < 3 → tur mashqi', () => {
  let { W } = env();
  assert.equal(W.quests(null, { wrongCount: 3, weakestType: 'series' }, T0)[2].kind, 'fix');
  ({ W } = env());
  const q3 = W.quests(null, { wrongCount: 2, weakestType: 'spatial' }, T0)[2];
  assert.equal(q3.kind, 'type'); assert.equal(q3.type, 'spatial'); assert.equal(q3.target, 5);
});

test('weakest(): eng past daraja, teng boʻlsa types tartibi', () => {
  const { W } = env();
  const types = ['matrix', 'series', 'spatial', 'verbal'];
  assert.equal(W.weakest({ matrix: 4, series: 3, spatial: 3, verbal: 5 }, types), 'series');
  assert.equal(W.weakest({ matrix: 3, series: 3, spatial: 3, verbal: 3 }, types), 'matrix');
  assert.equal(W.weakest({}, types), 'matrix');
  assert.equal(W.weakest({ verbal: 1 }, types), 'verbal');
});

test('track: q1 mashq + takrorlash, test hisoblanmaydi; bajarilganda tangani oʻzi beradi', () => {
  const { W } = env();
  W.quests('2026-09-25', CTX, T0);
  for (let i = 0; i < 30; i++) assert.deepEqual(plain(W.track(ans('test'), T0)), []);
  assert.equal(W.quests(null, CTX, T0)[0].n, 0, 'test javoblari hech bir vazifaga kirmaydi');
  for (let i = 0; i < 5; i++) W.track(ans('practice'), T0);
  for (let i = 0; i < 4; i++) assert.deepEqual(plain(W.track(ans('review', false), T0)), []);
  assert.deepEqual(plain(W.track(ans('review', false), T0)), [{ id: 'q1', reward: 10 }]);
  assert.equal(W.balance(), 10);
  assert.deepEqual(plain(W.track(ans('practice'), T0)), [], 'bajarilgan vazifa ikkinchi marta bermaydi');
  const q1 = W.quests(null, CTX, T0)[0];
  assert.equal(q1.n, 10); assert.equal(q1.done, true);
  assert.equal(W.ledger(1)[0].key, 'q:2026-09-25:q1');
});

test('track: q2 istalgan oʻyin (demo va bot-flagged emas), qayta oʻynash tanga bermaydi', () => {
  const { W } = env();
  W.quests(null, CTX, T0);
  assert.deepEqual(plain(W.track({ type: 'game', id: 'demo' }, T0)), []);
  assert.deepEqual(plain(W.track({ type: 'game', id: 'flanker', flagged: true }, T0)), []);
  assert.deepEqual(plain(W.track({ type: 'game', id: 'nback' }, T0)), [{ id: 'q2', reward: 10 }], 'kun oʻyini boʻlishi shart emas');
  for (let i = 0; i < 50; i++) assert.deepEqual(plain(W.track({ type: 'game', id: 'nback' }, T0)), []);
  assert.equal(W.balance(), 10);
});

test('track: q3a faqat takrorlashdagi toʻgʻri javob; q3b faqat shu tur', () => {
  let { W } = env();
  W.quests(null, { wrongCount: 5, weakestType: 'series' }, T0);
  W.track(ans('practice', true), T0);
  W.track(ans('review', false), T0);
  W.track(ans('review', true), T0);
  W.track({ type: 'answer', mode: 'review', correct: true, fixed: false }, T0);
  W.track(ans('test', true), T0);
  assert.equal(W.quests(null, CTX, T0)[2].n, 1);
  W.track(ans('review', true), T0);
  assert.deepEqual(plain(W.track(ans('review', true), T0)), [{ id: 'q3', reward: 10 }]);

  ({ W } = env());
  W.quests(null, CTX, T0);                 // q3b: series
  W.track(ans('practice', true, 'matrix'), T0);
  W.track(ans('test', true, 'series'), T0);
  for (let i = 0; i < 4; i++) W.track(ans(i % 2 ? 'review' : 'practice', false, 'series'), T0);
  assert.equal(W.quests(null, CTX, T0)[2].n, 4);
  assert.deepEqual(plain(W.track(ans('practice', false, 'series'), T0)).map(x => x.id), ['q3']);
});

test('kuniga ≤ 30 tanga, cheksiz faoliyatda ham', () => {
  const { W } = env();
  W.quests(null, CTX, T0);
  for (let i = 0; i < 500; i++) {
    W.track(ans(i % 3 ? 'practice' : 'review', true, 'series'), T0 + i * 1000);
    W.track({ type: 'game', id: 'schulte' }, T0 + i * 1000);
  }
  assert.equal(W.balance(), 30);
});

test('F65: kechagi son ertasi kunga oʻtmaydi (qayta ochishda ham)', () => {
  const store = new Map();
  let { W } = env(store);
  W.quests('2026-09-24', CTX, at(2026, 9, 24, 20));
  for (let i = 0; i < 7; i++) W.track(ans('practice'), at(2026, 9, 24, 20, i));
  W.track(ans('practice'), at(2026, 9, 25, 3, 30));           // 04:00 gacha — hali kechagi kun
  assert.equal(W.quests(null, CTX, at(2026, 9, 25, 3, 50))[0].n, 8);
  W.touch(at(2026, 9, 25, 9));
  ({ W } = env(store));                                          // ilova qayta ochildi
  assert.equal(W.quests('2026-09-25', CTX, at(2026, 9, 25, 9))[0].n, 0);
  W.track(ans('practice'), at(2026, 9, 25, 9, 5));
  assert.equal(W.quests(null, CTX, at(2026, 9, 25, 9, 6))[0].n, 1, 'birinchi javob 1/10, 8/10 emas');
});

test('ilova 04:00 dan oʻtib ochiq qolsa: track yangi kun roʻyxatini oxirgi ctx bilan tuzadi', () => {
  const { W } = env();
  W.quests(null, { wrongCount: 1, weakestType: 'verbal', gameOfDay: 'nback' }, at(2026, 9, 25, 23));
  W.track(ans('practice', true, 'verbal'), at(2026, 9, 26, 4, 10));
  const q = W.quests(null, CTX, at(2026, 9, 26, 4, 11));
  assert.equal(W.state().quests.day, '2026-09-26');
  assert.equal(q[0].n, 1);
  assert.equal(q[2].type, 'verbal', 'kun boshida tuzilgan roʻyxat qoladi');
});

test('soat himoyasi: 6 soatdan ortiq orqaga → vazifa va hafta toʻxtaydi, nishon va xarid ishlaydi', () => {
  const { W } = env();
  W.credit(300, 'badge', 'b:x', T0);
  W.quests(null, CTX, T0);
  W.track(ans('practice'), T0);
  assert.equal(W.frozen(T0 - 5 * H), false, '6 soat ichidagi tuzatish — normal');
  const back = T0 - 2 * 24 * H;
  assert.equal(W.frozen(back), true);
  assert.equal(W.touch(back).frozen, true);
  for (let i = 0; i < 20; i++) W.track(ans('practice'), back);
  assert.deepEqual(plain(W.track({ type: 'game', id: 'nback' }, back)), []);
  assert.equal(W.credit(10, 'quest', 'q:2026-09-23:q2', back), false);
  assert.equal(W.credit(40, 'week', 'w:2026-09-14', back), false);
  assert.equal(W.quests('2026-09-23', CTX, back)[0].n, 1, 'roʻyxat muzlagan, kecha uchun yangisi tuzilmaydi');
  assert.equal(W.state().quests.day, '2026-09-25');
  assert.equal(W.credit(20, 'badge', 'b:first-test', back), true, 'nishon — bir martalik, toʻxtamaydi');
  assert.equal(W.spend('color:red', back).ok, true);
  assert.equal(W.state().maxSeen, T0, 'orqaga surilgan soat maxSeen ni tushirmaydi');
  // soat maxSeen ga yetdi — hammasi davom etadi
  assert.equal(W.frozen(T0), false);
  W.track(ans('practice'), T0 + 1000);
  assert.equal(W.quests(null, CTX, T0 + 2000)[0].n, 2);
});

test('soatni oldinga surib yigʻish: qaytganda muzlaydi', () => {
  const { W } = env();
  const fwd = T0 + 10 * 24 * H;
  W.quests(null, CTX, fwd);
  W.track({ type: 'game', id: 'nback' }, fwd);
  assert.equal(W.balance(), 10);
  assert.equal(W.frozen(T0 + 24 * H), true, 'haqiqiy vaqtga qaytgach 10 kun muzlaydi');
  assert.deepEqual(plain(W.track({ type: 'game', id: 'nback' }, T0 + 24 * H)), []);
});

test('soat mintaqasi / kichik orqaga surish: kun orqaga qaytmaydi, progress oʻchmaydi', () => {
  const { W } = env();
  W.quests(null, CTX, at(2026, 9, 25, 5));
  for (let i = 0; i < 4; i++) W.track(ans('practice'), at(2026, 9, 25, 5));
  const q = W.quests(null, CTX, at(2026, 9, 25, 1));    // 4 soat orqaga, dayKey = 24
  assert.equal(q[0].n, 4);
  assert.equal(W.state().quests.day, '2026-09-25');
});

test('spend: xatolar, balans hech qachon manfiy emas, xarid doimiy', () => {
  const { W, store } = env();
  assert.deepEqual(plain(W.spend('color:nope', T0)), { ok: false, err: 'unknown' });
  assert.deepEqual(plain(W.spend('color:purple', T0)), { ok: false, err: 'free' });
  assert.deepEqual(plain(W.spend('color:red', T0)), { ok: false, err: 'funds', need: 150 });
  W.credit(50, 'welcome', 'welcome', T0);
  W.credit(120, 'badge', 'b:a', T0);
  assert.deepEqual(plain(W.spend('badge:compass', T0)), { ok: false, err: 'funds', need: 130 });
  assert.deepEqual(plain(W.spend('color:red', T0)), { ok: true, balance: 20 });
  assert.deepEqual(plain(W.spend('color:red', T0)), { ok: false, err: 'owned' });
  assert.equal(W.owns('color:red'), true);
  assert.deepEqual(plain(W.owned('colors')), ['red']);
  const s = W.state();
  assert.equal(s.balance, 20); assert.equal(s.earned, 170); assert.equal(s.spent, 150);
  assert.deepEqual(plain(W.ledger(1)[0]), { at: T0, amt: -150, src: 'buy', key: 'color:red' });
  assert.equal(env(store).W.owns('color:red'), true, 'qayta ochilganda ham');
  for (let i = 0; i < 10; i++) W.spend('color:sky', T0);
  assert.ok(W.balance() >= 0);
});

test('jurnal ≤ 100, eng yangisi birinchi', () => {
  const { W, disk } = env();
  for (let i = 0; i < 130; i++) W.credit(10, 'badge', 'b:t' + i, T0 + i);
  assert.equal(disk().ledger.length, 100);
  assert.equal(W.ledger(500).length, 100);
  assert.equal(W.ledger(1)[0].key, 'b:t129');
  assert.equal(W.ledger(3).length, 3);
  assert.equal(W.balance(), 1300, 'jurnal kesilsa ham balans oʻzgarmaydi');
});

test('credited tozalash: q: 21 kundan, w: 16 haftadan eski; b: va welcome abadiy', () => {
  const { W, disk } = env();
  const t = at(2026, 9, 25);
  W.credit(50, 'welcome', 'welcome', at(2025, 1, 1));
  W.credit(20, 'badge', 'b:first-test', at(2025, 1, 1));
  W.credit(10, 'quest', 'q:2026-09-03:q1', t);     // 22 kun
  W.credit(10, 'quest', 'q:2026-09-04:q1', t);     // 21 kun
  W.credit(10, 'week', 'w:2026-06-01', t);         // 16 haftadan eski
  W.credit(10, 'week', 'w:2026-06-08', t);         // aynan 16 hafta
  W.touch(t);
  assert.deepEqual(Object.keys(disk().credited).sort(),
    ['b:first-test', 'q:2026-09-04:q1', 'w:2026-06-08', 'welcome']);
});

test('buzilgan yozuv → standart qiymat, ilova yiqilmaydi', () => {
  for (const raw of ['{buzuq', '"satr"', '[]', 'null', JSON.stringify({ v: 1, balance: -50, earned: 'x',
      owned: { colors: ['red', 'red', 7, '__proto__'], '__proto__': ['x'] }, credited: { 'nope': 1, 'welcome': 1, '__proto__': 1 },
      quests: { day: '2026-09-25', list: [{ id: 'q9' }] }, maxSeen: 'x', ledger: [null, { at: 1, amt: 5, src: 'badge', key: 'b:a' }] })]) {
    const store = new Map([[KEY, raw]]);
    const { W } = env(store);
    assert.ok(W.balance() >= 0);
    assert.equal(W.readOnly(), false);
    assert.ok(Array.isArray(W.quests(null, CTX, T0)));
  }
  const store = new Map([[KEY, JSON.stringify({ v: 1, balance: 30, earned: 10, spent: 5,
    owned: { colors: ['red', 'red', 7] }, credited: { welcome: 1, nope: 1 } })]]);
  const s = plain(env(store).W.state());
  assert.equal(s.balance, 30); assert.equal(s.earned, 35, 'earned ≥ balance + spent');
  assert.deepEqual(s.owned.colors, ['red']);
  assert.deepEqual(Object.keys(s.credited), ['welcome']);
});

test('yangiroq versiya → readOnly, ustiga hech qachon yozilmaydi', () => {
  const raw = JSON.stringify({ v: 2, balance: 999, whatever: true });
  const store = new Map([[KEY, raw]]);
  const { W } = env(store);
  assert.equal(W.readOnly(), true);
  assert.equal(W.balance(), 0);
  assert.equal(W.credit(50, 'welcome', 'welcome', T0), false);
  assert.deepEqual(plain(W.spend('color:red', T0)), { ok: false, err: 'readonly' });
  W.quests(null, CTX, T0);
  assert.deepEqual(plain(W.track(ans('practice'), T0)), []);
  W.touch(T0);
  assert.equal(store.get(KEY), raw);
});

test('reset: hamyon nolga, kalit oʻchadi (readOnly yozuv ham — foydalanuvchi soʻragan)', () => {
  const store = new Map();
  let { W } = env(store);
  W.credit(50, 'welcome', 'welcome', T0);
  W.reset();
  assert.equal(W.balance(), 0);
  assert.equal(store.has(KEY), false);
  store.set(KEY, JSON.stringify({ v: 5 }));
  ({ W } = env(store));
  W.reset();
  assert.equal(W.readOnly(), false);
  assert.equal(store.has(KEY), false);
});

test('localStorage yoʻq yoki toʻla — xotirada ishlayveradi', () => {
  for (const opts of [{ noStorage: true }, { full: true }]) {
    const { W } = env(new Map(), opts);
    assert.equal(W.credit(50, 'welcome', 'welcome', T0), true);
    assert.equal(W.balance(), 50);
    assert.equal(W.credit(50, 'welcome', 'welcome', T0), false);
  }
});

test('progress.test uslubidagi muhit (window = {}, global localStorage) ham ishlaydi', () => {
  const store = new Map();
  const ctx = { window: {}, localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem() {} } };
  vm.createContext(ctx);
  vm.runInContext(SRC('catalog.js'), ctx);
  vm.runInContext(SRC('wallet.js'), ctx);
  assert.equal(ctx.window.nzWallet.credit(50, 'welcome', 'welcome', T0), true);
  assert.equal(JSON.parse(store.get(KEY)).balance, 50);
});

test('katalog yuklanmagan boʻlsa: yiqilmaydi, vazifa va xarid yoʻq', () => {
  const { W } = env(new Map(), { noCatalog: true });
  assert.deepEqual(plain(W.quests(null, CTX, T0)), []);
  assert.deepEqual(plain(W.track(ans('practice'), T0)), []);
  assert.equal(W.spend('color:red', T0).err, 'unknown');
  assert.equal(W.credit(20, 'badge', 'b:x', T0), true);
});
