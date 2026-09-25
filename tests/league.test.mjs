/* ─────────────────────────────────────────────────────────────────────────
   src/league.js — yopilgan haftalar, eng yaxshi hafta, eʼlonlar (§6.5, §14)
   Ishga tushirish:  npm test
   ───────────────────────────────────────────────────────────────────── */

process.env.TZ = 'Asia/Tashkent';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('../src/league.js', import.meta.url), 'utf8');
const KEY = 'nz-league';
const plain = x => JSON.parse(JSON.stringify(x));
const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h).getTime();
const NOW = at(2026, 9, 25);            // juma; joriy hafta 2026-09-21

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
  return { L: ctx.nzLeague, store, disk: () => JSON.parse(store.get(KEY) || 'null') };
}

/* n-hafta dushanbasi (2026-01-05 dan boshlab) */
const monday = i => { const d = new Date(Date.UTC(2026, 0, 5 + 7 * i)); return d.toISOString().slice(0, 10); };

test('weekStart: dushanba, yil va oy chegaralari', () => {
  const { L } = env();
  assert.equal(L.weekStart('2026-09-25'), '2026-09-21');
  assert.equal(L.weekStart('2026-09-21'), '2026-09-21');
  assert.equal(L.weekStart('2026-09-27'), '2026-09-21', 'yakshanba — oʻsha hafta');
  assert.equal(L.weekStart('2026-01-01'), '2025-12-29', 'yil chegarasi');
  assert.equal(L.weekStart('2026-03-01'), '2026-02-23', 'oy chegarasi');
  assert.equal(L.weekStart('2028-03-01'), '2028-02-28', 'kabisa yili');
  assert.equal(L.weekStart('2026-02-30'), null);
  assert.equal(L.dayKey(at(2026, 9, 28, 3)), '2026-09-27', '04:00 gacha hali yakshanba');
});

test('close: bir marta true, takror false, tugamagan hafta yopilmaydi', () => {
  const { L, store } = env();
  assert.equal(L.close('2026-09-14', 620, NOW), true);
  assert.equal(L.close('2026-09-14', 999, NOW), false);
  assert.equal(L.week('2026-09-14'), 620);
  assert.equal(L.close('2026-09-21', 100, NOW), false, 'joriy hafta');
  assert.equal(L.close('2026-09-21', 100, at(2026, 9, 28, 3, 59)), false, 'yakshanba 03:59 gacha');
  assert.equal(L.close('2026-09-21', 100, at(2026, 9, 28, 4)), true, 'dushanba 04:00');
  assert.equal(L.close('2026-09-15', 1, NOW), false, 'dushanba emas');
  assert.equal(L.close('xyz', 1, NOW), false);
  assert.equal(env(store).L.close('2026-09-14', 1, NOW), false, 'qayta ochilganda ham');
  assert.equal(L.close('2025-12-29', 300, NOW), true, 'yil chegarasidagi hafta');
});

test('12 hafta chegarasi; tashlangan hafta qayta yopilmaydi; best saqlanadi', () => {
  const { L, disk } = env();
  const far = at(2026, 12, 31);
  assert.equal(L.close(monday(0), 9000, far), true);
  for (let i = 1; i <= 13; i++) L.close(monday(i), i * 10, far);
  assert.equal(L.weeks().length, 12);
  assert.equal(Object.keys(disk().weeks).length, 12);
  assert.equal(L.weeks()[0].w, monday(13), 'eng yangisi birinchi');
  assert.equal(L.week(monday(0)), null);
  assert.equal(L.close(monday(0), 5, far), false, 'floor: tashlangan hafta yangi boʻlib qaytmaydi');
  assert.equal(L.close(monday(1), 5, far), false);
  assert.deepEqual(plain(L.best()), { w: monday(0), ball: 9000 }, '12 haftadan eski boʻlsa ham');
  assert.equal(L.weeks(3).length, 3);
});

test('best: eng katta yopilgan hafta; 0 — best emas', () => {
  const { L } = env();
  assert.equal(L.best(), null);
  L.close('2026-08-31', 0, NOW);
  assert.equal(L.best(), null);
  L.close('2026-09-07', 410, NOW);
  L.close('2026-09-14', 620, NOW);
  L.close('2026-08-24', 500, NOW);
  assert.deepEqual(plain(L.best()), { w: '2026-09-14', ball: 620 });
});

test('last / series — «Oʻtgan hafta» va «Oxirgi haftalar»', () => {
  const { L } = env();
  assert.equal(L.last('2026-09-21'), null, 'maʼlumot yoʻq → «—»');
  L.close('2026-09-14', 620, NOW);
  L.close('2026-08-31', 200, NOW);
  assert.equal(L.last('2026-09-25'), 620, 'kun ham berilishi mumkin');
  assert.deepEqual(plain(L.series('2026-09-21', 3)), [
    { w: '2026-08-31', ball: 200, known: true },
    { w: '2026-09-07', ball: 0, known: false },
    { w: '2026-09-14', ball: 620, known: true },
  ]);
});

test('pending: 21 kunlik oynada tugagan va yopilmagan haftalar (≤ 2)', () => {
  const { L } = env();
  const days = { '2026-09-01': 100, '2026-09-06': 50, '2026-09-08': 300, '2026-09-13': 20,
                 '2026-09-15': 700, '2026-09-22': 80, '2026-09-25': 40 };
  // bugun 2026-09-25 (juma): oyna 09-05..09-25; toʻliq sigʻadiganlar 09-07 va 09-14
  assert.deepEqual(plain(L.pending(days, '2026-09-25')), [
    { w: '2026-09-07', ball: 320 }, { w: '2026-09-14', ball: 700 }]);
  L.close('2026-09-07', 320, NOW);
  assert.deepEqual(plain(L.pending(days, '2026-09-25')), [{ w: '2026-09-14', ball: 700 }]);
  // yakshanba: oyna 08-31..09-20 — ikki hafta toʻliq sigʻadi
  assert.deepEqual(plain(env().L.pending({ '2026-09-01': 5 }, '2026-09-20')), [
    { w: '2026-08-31', ball: 5 }, { w: '2026-09-07', ball: 0 }]);
});

test('pending: faoliyatsiz hafta 0 bilan, lekin yangi foydalanuvchiga emas', () => {
  const { L } = env();
  assert.deepEqual(plain(L.pending({ '2026-09-24': 90 }, '2026-09-25')), [], 'oʻrnatishdan oldingi haftalar yozilmaydi');
  assert.deepEqual(plain(L.pending({}, '2026-09-25')), []);
  assert.deepEqual(plain(L.pending({ '2026-09-05': 90 }, '2026-09-25')), [
    { w: '2026-09-07', ball: 0 }, { w: '2026-09-14', ball: 0 }], 'oldin faol boʻlgan — 0 yoziladi');
  L.close('2026-08-31', 400, NOW);
  assert.deepEqual(plain(L.pending({}, '2026-09-25')).map(x => x.ball), [0, 0]);
});

test('announce / promote: har hafta har liga bir marta, faqat oshadi', () => {
  const { L, store } = env();
  const w = '2026-09-21';
  assert.equal(L.announced(w), -1);
  assert.equal(L.promote(w, 0), false, 'Boshlovchi uchun karta yoʻq');
  assert.equal(L.promote(w, 1), true);
  assert.equal(L.promote(w, 1), false);
  assert.equal(L.promote(w, 3), true, 'bir necha liga sakrasa — bitta karta');
  assert.equal(L.promote(w, 2), false);
  assert.equal(L.announced(w), 3);
  assert.equal(env(store).L.announced(w), 3);
  assert.equal(L.promote('2026-09-28', 1), true, 'yangi hafta — yangidan');
  assert.equal(L.promote(w, 5), false, 'eski haftaga qaytilmaydi');
  L.announce(w, 5);
  assert.equal(L.announced('2026-09-28'), 1);
});

test('buzilgan yozuv → standart; best yopilgan haftalardan kichik emas', () => {
  for (const raw of ['{', '[]', JSON.stringify({ v: 1, weeks: { 'x': 5, '2026-09-15': 5, '2026-09-14': -1 }, best: 'x', announced: { w: 1 } })]) {
    const { L } = env(new Map([[KEY, raw]]));
    assert.deepEqual(plain(L.weeks()), []);
    assert.equal(L.best(), null);
    assert.equal(L.announced('2026-09-21'), -1);
  }
  const { L } = env(new Map([[KEY, JSON.stringify({ v: 1, weeks: { '2026-09-14': 800 }, best: { w: '2026-09-07', ball: 100 } })]]));
  assert.deepEqual(plain(L.best()), { w: '2026-09-14', ball: 800 });
});

test('yangiroq versiya → readOnly, ustiga yozilmaydi; reset oʻchiradi', () => {
  const raw = JSON.stringify({ v: 2, weeks: { '2026-09-14': 9 } });
  const store = new Map([[KEY, raw]]);
  const { L } = env(store);
  assert.equal(L.readOnly(), true);
  assert.equal(L.close('2026-09-14', 5, NOW), false);
  assert.equal(L.promote('2026-09-21', 2), false);
  assert.equal(store.get(KEY), raw);
  L.reset();
  assert.equal(store.has(KEY), false);
  assert.equal(L.close('2026-09-14', 5, NOW), true);
});
