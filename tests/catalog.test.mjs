/* ─────────────────────────────────────────────────────────────────────────
   src/catalog.js — Doʻkon jadvali (ARXITEKTURA §6.7, §14)

   Kontrast qoʻlda yozilgan songa ishonmasdan shu yerda QAYTA hisoblanadi
   (modulning oʻz contrast() funksiyasiga ham ishonilmaydi).
   Ishga tushirish:  npm test
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const read = f => fs.readFileSync(new URL('../src/' + f, import.meta.url), 'utf8');
const plain = x => JSON.parse(JSON.stringify(x));

function load(files) {
  const ctx = { console };
  ctx.window = ctx;
  vm.createContext(ctx);
  files.forEach(f => vm.runInContext(read(f), ctx, { filename: f }));
  return ctx;
}
const C = load(['catalog.js']).nzCatalog;

/* Mustaqil WCAG hisobi. */
function lum(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

test('12 rang, aynan 6 tasi bepul, pullilar > 0, standart rang bepul', () => {
  assert.equal(C.colors.length, 12);
  const free = C.colors.filter(c => c.price === 0);
  assert.equal(free.length, 6);
  assert.deepEqual(plain(C.freeColors()), ['purple', 'blue', 'teal', 'green', 'pink', 'gold']);
  C.colors.filter(c => c.price !== 0).forEach(c => assert.ok(c.price > 0, c.id));
  assert.equal(C.defaultColor, 'purple');
  assert.equal(C.color('purple').price, 0);
});

test('ID lar noyob (ranglar, kolleksiya, yutuq nishonlari bilan ham)', () => {
  const ids = C.colors.map(c => c.id);
  assert.equal(new Set(ids).size, ids.length);
  const col = C.badges.map(b => b.id);
  assert.equal(new Set(col).size, 8);
  const B = load(['catalog.js', 'badges.js']).nzBadges;
  const ach = B.catalogue().map(b => b.id);
  col.forEach(id => assert.ok(!ach.includes(id), 'vitrina bitta roʻyxat: ' + id + ' toʻqnashadi'));
  ids.concat(col).forEach(id => assert.match(id, /^[a-z][a-z0-9-]*$/));
});

test('WCAG: on rang rangga va har gradient toʻxtashiga ≥ 3:1', () => {
  C.colors.forEach(c => {
    assert.ok(c.stops.length === 1 || c.stops.length === 2, c.id);
    c.stops.forEach(s => {
      assert.match(s, /^#[0-9A-F]{6}$/);
      const r = ratio(s, c.on);
      assert.ok(r >= 3, `${c.id} ${s}/${c.on} = ${r.toFixed(2)}`);
      assert.ok(Math.abs(C.contrast(s, c.on) - r) < 1e-9, 'modul hisobi mustaqil hisobga mos');
    });
  });
  // jadvaldagi qiymatlar (§6.7) — tekshiruv haqiqatan hisoblayotganini koʻrsatadi
  assert.equal(ratio('#E5484D', '#FFFFFF').toFixed(2), '3.91');
  assert.equal(ratio('#3A3850', '#FFFFFF').toFixed(2), '11.28');
});

test('narxlar va yigʻindilar: ranglar 1 200, kolleksiya 3 900, jami 5 100', () => {
  assert.equal(C.total('colors'), 1200);
  assert.equal(C.total('badges'), 3900);
  assert.equal(C.total(), 5100);
  assert.deepEqual(plain(C.badges.map(b => b.price)), [300, 300, 400, 400, 500, 500, 700, 800]);
});

test('mukofot va vazifa jadvali §6.3–§6.5 bilan bir xil', () => {
  assert.deepEqual(plain(C.rewards), { welcome: 50, quest: 10, weekly: [0, 10, 25, 40, 60, 100] });
  assert.deepEqual(plain(C.quests), { practice: 10, game: 1, fix: 3, type: 5 });
  assert.equal(C.coinHelp[0].value, 30, 'kuniga ≤ 30');
  assert.equal(C.coinHelp[2].value, 100, 'hafta ≤ 100');
});

test('item(): prefiksli id, notanish va zararli kirish → null', () => {
  const r = C.item('color:red');
  assert.equal(r.price, 150); assert.equal(r.shelf, 'colors'); assert.equal(r.free, false);
  assert.equal(C.item('color:purple').free, true);
  assert.equal(C.item('badge:infinity').price, 800);
  for (const bad of ['red', 'color:', 'color:nope', 'badge:red', 'frame:x', ':red', null, 42, 'color:__proto__', 'color:constructor', 'x'.repeat(100)]) {
    assert.equal(C.item(bad), null, String(bad));
  }
});

test('css(): gradient va bitta rang, notanish → standart', () => {
  assert.equal(C.css('red'), '#E5484D');
  assert.equal(C.css('dawn'), 'linear-gradient(135deg, #FF6FA5, #FFA726)');
  assert.equal(C.css('nope'), '#8552F0');
});

test('jadval muzlatilgan: modul narxni oʻzgartira olmaydi', () => {
  assert.ok(Object.isFrozen(C.colors[6]));
  assert.throws(() => { 'use strict'; C.colors[6].price = 1; });
  assert.equal(C.item('color:red').price, 150);
});

test('matnlar {uz, ru, en}: boʻsh emas, oʻzbekchada toʻgʻri tutuq, halollik', () => {
  const labels = [];
  C.colors.forEach(c => labels.push(c.name));
  C.badges.forEach(b => labels.push(b.name));
  C.shelves.forEach(s => labels.push(s.label));
  Object.values(C.questText).forEach(q => { labels.push(q.name, q.unit); });
  C.coinHelp.forEach(h => labels.push(h.text));
  labels.forEach(l => {
    ['uz', 'ru', 'en'].forEach(k => assert.ok(typeof l[k] === 'string' && l[k].trim(), JSON.stringify(l)));
    assert.doesNotMatch(l.uz, /['‘’`]/, 'oʻzbekchada ʻ (U+02BB) / ʼ (U+02BC): ' + l.uz);
    assert.doesNotMatch(l.en, /[Ѐ-ӿʻʼ]/, l.en);
    assert.match(l.ru, /[Ѐ-ӿ]/, l.ru);
    const all = [l.uz, l.ru, l.en].join(' ').toLowerCase();
    assert.doesNotMatch(all, /daho|genius|гений|rasmiy|official|официальн|mensa|premium|iap|chegirma|скидк/);
  });
});

/* Main dagi LEAGUES — liga chegaralarining yagona uyi (§6.2). Hafta
   mukofoti jadvali va liga nishonlarining chegaralari u bilan mos
   boʻlishi kerak. Main LEAGUES ni boshqa shaklda yozsa, tekshiruv
   oʻtkazib yuboriladi (u WP7 fayli). */
test('LEAGUES (Main) ↔ rewards.weekly ↔ liga nishonlari', (t) => {
  let src = '';
  try { src = read('Main.dc.html'); } catch (e) {}
  const m = /const LEAGUES = \[([\s\S]*?)\];/.exec(src);
  const mins = m ? [...m[1].matchAll(/min:\s*(\d+)/g)].map(x => Number(x[1])) : [];
  if (mins.length < 2) { t.skip('Main da LEAGUES literal topilmadi'); return; }
  assert.equal(C.rewards.weekly.length, mins.length, 'har liga uchun bitta mukofot');
  const B = load(['catalog.js', 'badges.js']).nzBadges;
  B.catalogue().filter(b => b.tier === 'league').forEach(b => {
    assert.equal(b.target, mins[b.league], b.id);
  });
});
