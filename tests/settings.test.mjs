/* ─────────────────────────────────────────────────────────────────────────
   src/settings.js — `nz-settings` tekshiruvi (ARXITEKTURA §10.3, §14)

   - 1.0 dan koʻchirish jadvali: soundOn/notifOn = null / true / false;
   - buzilgan va yangiroq versiya → readOnly, diskdagi yozuv tegilmaydi;
   - maydonlar alohida tekshiriladi, tashqariga nusxa beriladi.

   Ishga tushirish:  npm test
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('../src/settings.js', import.meta.url), 'utf8');
const KEY = 'nz-settings';
const plain = x => JSON.parse(JSON.stringify(x));

/* disk — { kalit: qiymat } (satr yoki obyekt). opts.now — Date.now().
   opts.broken — localStorage har chaqiruvda xato otadi. */
function env(disk, opts) {
  const o = opts || {};
  const store = new Map();
  Object.keys(disk || {}).forEach(k => {
    const v = disk[k];
    store.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  });
  const io = { writes: 0 };
  const now = o.now == null ? 1759000000000 : o.now;
  class FakeDate extends Date {
    constructor(...a) { super(...(a.length ? a : [now])); }
    static now() { return now; }
  }
  const ctx = {
    window: {},
    Date: FakeDate,
    localStorage: o.broken ? {
      getItem() { throw new Error('SecurityError'); },
      setItem() { throw new Error('SecurityError'); },
    } : {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { io.writes++; store.set(k, String(v)); },
      removeItem: k => { store.delete(k); },
    },
  };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  return {
    s: ctx.window.nzSettings, io,
    disk: () => (store.has(KEY) ? JSON.parse(store.get(KEY)) : null),
    raw: k => store.get(k),
  };
}

const DEFAULTS = {
  v: 1, sound: true, haptics: true,
  remind: { on: false, h: 19, m: 0 }, streakRemind: false,
  onboard: { done: false, at: 0, from: '' },
  tips: { testIntro: false },
};

test('yangi oʻrnatish: standartlar, eslatma OʻCHIQ va darhol yoziladi', () => {
  const { s, disk } = env();
  assert.deepEqual(plain(s.get()), DEFAULTS);
  assert.equal(s.origin(), 'new');
  assert.equal(s.readOnly(), false);
  assert.equal(s.isOnboarded(), false);
  assert.deepEqual(disk(), DEFAULTS, 'bir martalik yozuv');
});

test('1.0 dan koʻchirish jadvali (soundOn/notifOn = null/true/false)', () => {
  const vals = [null, true, false];
  for (const soundOn of vals) {
    for (const notifOn of vals) {
      const old = { v: 1, points: 50, soundOn, notifOn };
      const { s, disk, raw } = env({ 'nz-progress': old });
      const g = s.get();
      assert.equal(g.sound, soundOn === null ? true : soundOn, `sound ← ${soundOn}`);
      assert.equal(g.remind.on, notifOn === null ? false : notifOn, `remind.on ← ${notifOn}`);
      assert.equal(g.streakRemind, false, 'streak eslatmasi 1.0 da yoʻq edi — oʻchiq');
      assert.equal(g.haptics, true);
      assert.deepEqual([g.remind.h, g.remind.m], [19, 0]);
      assert.equal(s.origin(), 'migrated');
      assert.equal(disk().sound, g.sound, 'koʻchirilgan qiymat diskka tushdi');
      assert.deepEqual(JSON.parse(raw('nz-progress')), old, 'nz-progress faqat oʻqiladi');
    }
  }
});

test('koʻchirish bir marta: keyingi ishga tushishda nz-progress eʼtiborsiz', () => {
  const first = env({ 'nz-progress': { v: 1, soundOn: false, notifOn: true } });
  first.s.set({ sound: true });
  const saved = first.disk();
  const again = env({ 'nz-progress': { v: 1, soundOn: false, notifOn: false }, [KEY]: saved });
  assert.equal(again.s.get().sound, true);
  assert.equal(again.s.get().remind.on, true);
  assert.equal(again.s.origin(), 'stored');
});

test('buzilgan nz-progress koʻchirishni yiqitmaydi', () => {
  const { s } = env({ 'nz-progress': '{bad json' });
  assert.deepEqual(plain(s.get()), DEFAULTS);
});

for (const [name, text] of [
  ['JSON emas', '{"v":1,'],
  ['massiv', '[1,2]'],
  ['v yoʻq', '{"sound":false}'],
  ['v satr', '{"v":"1","sound":false}'],
  ['v 0', '{"v":0,"sound":false}'],
  ['null', 'null'],
]) {
  test(`buzilgan yozuv (${name}) → readOnly, ustiga yozilmaydi`, () => {
    const { s, raw, io } = env({ [KEY]: text });
    assert.equal(s.readOnly(), true);
    assert.equal(s.origin(), 'corrupt');
    assert.equal(s.isOnboarded(), true, 'avval ishlatilgan — birinchi kirish qayta chiqmaydi');
    const g = s.set({ sound: false, remind: { on: true } });
    assert.equal(g.sound, false, 'xotirada ishlaydi');
    s.markTip('testIntro');
    s.markOnboarded('1.1.0');
    assert.equal(raw(KEY), text, 'disk tegilmagan');
    assert.equal(io.writes, 0);
  });
}

test('yangiroq versiya (v:2) → standartlar xotirada, readOnly, ustiga yozilmaydi', () => {
  const newer = JSON.stringify({ v: 2, sound: false, extra: { x: 1 } });
  const { s, raw, io } = env({ [KEY]: newer });
  assert.equal(s.readOnly(), true);
  assert.equal(s.origin(), 'newer');
  assert.equal(s.get().sound, true, 'yangi shaklni taxmin qilmaymiz — standart');
  assert.equal(s.get().remind.on, false);
  assert.equal(s.tip('testIntro'), true);
  s.set({ haptics: false });
  assert.equal(s.get().haptics, false);
  assert.equal(raw(KEY), newer);
  assert.equal(io.writes, 0);
});

test('v:1 maydonlari alohida tekshiriladi', () => {
  const { s } = env({ [KEY]: {
    v: 1, sound: 'yes', haptics: false,
    remind: { on: true, h: 25, m: 7.5 }, streakRemind: 1,
    onboard: { done: true, at: -5, from: '<script>' },
    tips: { testIntro: true, __proto__: true, 'bad id': true, constructor: true, x: 'no' },
  } });
  const g = plain(s.get());
  assert.equal(g.sound, true);
  assert.equal(g.haptics, false);
  assert.deepEqual(g.remind, { on: true, h: 19, m: 0 });
  assert.equal(g.streakRemind, false);
  assert.deepEqual(g.onboard, { done: true, at: 0, from: '' });
  assert.deepEqual(g.tips, { testIntro: true, constructor: true });
  assert.equal(s.readOnly(), false);
});

test('tiplar soni cheklangan', () => {
  const tips = {};
  for (let i = 0; i < 40; i++) tips['tip' + i] = true;
  const { s } = env({ [KEY]: Object.assign({}, DEFAULTS, { tips }) });
  assert.ok(Object.keys(s.get().tips).length <= 16);
});

test('set: qisman birlashtirish, yaroqsiz qiymat joriy qiymatni saqlaydi', () => {
  const { s, disk } = env();
  s.set({ remind: { on: true } });
  assert.deepEqual(plain(s.get().remind), { on: true, h: 19, m: 0 });
  s.set({ remind: { h: 21, m: 30 } });
  assert.deepEqual(plain(s.get().remind), { on: true, h: 21, m: 30 });
  s.set({ remind: { h: 24, m: -1, on: 'x' }, sound: 'ha', haptics: null, streakRemind: 0 });
  assert.deepEqual(plain(s.get().remind), { on: true, h: 21, m: 30 });
  assert.equal(s.get().sound, true);
  assert.equal(s.get().haptics, true);
  assert.equal(s.get().streakRemind, false);
  s.set({ sound: false, streakRemind: true });
  assert.equal(disk().sound, false);
  assert.equal(disk().streakRemind, true);
  s.set({ v: 9, onboard: { done: true } });
  assert.equal(s.isOnboarded(), false, 'onboard faqat markOnboarded orqali');
  assert.equal(disk().v, 1);
  assert.deepEqual(plain(s.set(null)), plain(s.get()));
});

test('set: oʻzgarish boʻlmasa diskka yozilmaydi', () => {
  const { s, io } = env();
  const w = io.writes;
  s.set({ sound: true, remind: { on: false } });
  assert.equal(io.writes, w);
});

test('get() nusxa qaytaradi', () => {
  const { s } = env();
  const g = s.get();
  g.sound = false; g.remind.on = true; g.tips.testIntro = true;
  assert.equal(s.get().sound, true);
  assert.equal(s.get().remind.on, false);
  assert.equal(s.tip('testIntro'), false);
});

test('markOnboarded: vaqt kiritilgan `now` dan, versiya yoziladi', () => {
  const { s, disk } = env({}, { now: 1760000000000 });
  s.markOnboarded('1.1.0');
  assert.equal(s.isOnboarded(), true);
  assert.deepEqual(disk().onboard, { done: true, at: 1760000000000, from: '1.1.0' });
  s.markOnboarded({ bad: 1 });
  assert.equal(disk().onboard.from, '');
});

test('tip / markTip', () => {
  const { s, disk } = env();
  assert.equal(s.tip('testIntro'), false);
  s.markTip('testIntro');
  assert.equal(s.tip('testIntro'), true);
  assert.equal(disk().tips.testIntro, true);
  s.markTip('__proto__');
  s.markTip(42);
  assert.equal(s.tip('__proto__'), false);
  assert.equal(s.tip('toString'), false, 'prototipdan kelgan nom tip emas');
  s.markTip('newTip');
  assert.equal(s.tip('newTip'), true);
});

test('localStorage ishlamasa ham yiqilmaydi, xotirada ishlaydi', () => {
  const { s } = env({}, { broken: true });
  assert.equal(s.works(), false);
  assert.equal(s.readOnly(), false);
  assert.equal(s.set({ sound: false }).sound, false);
  s.markOnboarded('1.1.0');
  assert.equal(s.isOnboarded(), true);
});
