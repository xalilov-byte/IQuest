/* ─────────────────────────────────────────────────────────────────────────
   src/art.js — qalqon, medalyon va emblemalar tekshiruvi (ARXITEKTURA §9.1,
   §6.6, §6.7, §14)

   · SVG xavfsizligi (skript, on*=, foreignObject, havola, style, url(), id yoʻq);
   · qalqondagi chevron kontrasti har qirrada ≥3:1 (WCAG);
   · daraja shakl bilan ham: chevronlar soni = liga raqami, medalyonda
     1/2/3 nuqta;
   · 21 + 8 nishon — spetsifikatsiya bilan aynan bir xil, ID lar noyob;
   · hajm chegarasi, deterministik.

   Ishga tushirish:  npm test
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const ICONS = fs.readFileSync(new URL('../src/icons.js', import.meta.url), 'utf8');
const ART = fs.readFileSync(new URL('../src/art.js', import.meta.url), 'utf8');

function load(withIcons = true) {
  const ctx = { window: {}, encodeURIComponent };
  vm.createContext(ctx);
  if (withIcons) vm.runInContext(ICONS, ctx);
  vm.runInContext(ART, ctx);
  return ctx.window.nzArt;
}

/* §6.6 — id va daraja (liga nishonlari «liga rangi»). */
const SPEC_ACH = {
  'first-test': 'gold', 'answers-100': 'bronze', 'answers-500': 'silver', 'answers-2000': 'gold',
  'perfect-10': 'gold', 'fixer-20': 'silver', 'matrix-7': 'silver', 'series-7': 'silver',
  'spatial-7': 'silver', 'verbal-7': 'silver', 'games-all': 'bronze', 'game-lv5': 'silver',
  'game-lv10': 'gold', 'streak-3': 'bronze', 'streak-7': 'silver', 'streak-30': 'gold',
  'league-silver': 'league', 'league-gold': 'league', 'league-platinum': 'league',
  'league-diamond': 'league', profile: 'bronze',
};
const SPEC_COL = ['compass', 'rocket', 'knight', 'maze', 'crystal', 'planet', 'tangram', 'infinity'];

/* §9.1 liga jadvali. */
const SPEC_LEAGUE = [
  ['Boshlovchi', '#8A8799', '#FFFFFF'], ['Bronza', '#C77B3F', '#FFFFFF'], ['Kumush', '#A7B1C2', '#1C1B29'],
  ['Oltin', '#E0A100', '#1C1B29'], ['Platina', '#3FC1BE', '#1C1B29'], ['Olmos', '#7C8CFF', '#1C1B29'],
];

const lum = h => {
  const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

/* Hamma chiqishlar: har qalqon (katta/mini), har nishon har holatda, tanga, ball, belgi. */
function everything(A) {
  const out = [];
  for (let t = 0; t < 6; t++) { out.push(['shield' + t, A.shield(t)]); out.push(['mini' + t, A.shield(t, { mini: true })]); }
  const ids = [...A.ACHIEVEMENTS, ...A.COLLECTION].map(x => x.id);
  for (const id of ids) {
    for (const o of [{}, { locked: true }, { locked: true, theme: 'dark' }, { locked: true, lock: true }, { locked: true, lock: false, theme: 'dark' }]) {
      out.push([id + JSON.stringify(o), A.medal(id, o)]);
    }
  }
  out.push(['coin', A.coin()], ['ball', A.ball()], ['ballDark', A.ball({ theme: 'dark' })], ['mark', A.mark()]);
  return out;
}

test('ligalar §9.1 jadvaliga mos va chevronlar 0..5', () => {
  const A = load();
  assert.equal(A.LEAGUES.length, 6);
  A.LEAGUES.forEach((L, i) => {
    assert.equal(L.name, SPEC_LEAGUE[i][0]);
    assert.equal(L.fill, SPEC_LEAGUE[i][1]);
    assert.equal(L.ink, SPEC_LEAGUE[i][2]);
    assert.equal(L.chevrons, i);
  });
});

test('qalqondagi chevron kontrasti har qirrada ≥3:1', () => {
  const A = load();
  A.LEAGUES.forEach(L => {
    for (const face of [L.fill, L.tones.a, L.tones.b]) {
      const c = contrast(L.ink, face);
      assert.ok(c >= 3, L.name + ': ' + L.ink + ' / ' + face + ' = ' + c.toFixed(2));
    }
    /* Qirra ranglari haqiqatan rasmda turibdi (jadvaldan «qochib» ketmagan). */
    const s = A.shield(A.LEAGUES.indexOf(L));
    assert.ok(s.includes('fill="' + L.tones.a + '"') && s.includes('fill="' + L.tones.b + '"'), L.name);
  });
});

test('daraja shakl bilan ham: chevronlar soni, bezak koʻpayadi, hammasi turlicha', () => {
  const A = load();
  const seen = new Set();
  for (let t = 0; t < 6; t++) {
    const s = A.shield(t);
    assert.equal((s.match(/l14 8 14 -8/g) || []).length, t, 'katta qalqon ' + t);
    assert.equal((A.shield(t, { mini: true }).match(/l16 9 16 -9/g) || []).length, Math.min(t, 3), 'mini ' + t);
    assert.ok(!seen.has(s)); seen.add(s);
  }
  /* Bezak monoton: har keyingi liga oldingisidan koʻproq element. */
  const count = s => (s.match(/<(path|circle|polygon|g)\b/g) || []).length;
  for (let t = 1; t < 6; t++) assert.ok(count(A.shield(t)) >= count(A.shield(t - 1)), 'bezak ' + t);
  /* Toʻgʻri boʻlmagan tier chegaraga tortiladi. */
  assert.equal(A.shield(-3), A.shield(0));
  assert.equal(A.shield(99), A.shield(5));
  assert.equal(A.shield('x'), A.shield(0));
});

test('21 yutuq va 8 kolleksiya — spetsifikatsiya bilan aynan, ID lar noyob', () => {
  const A = load();
  assert.deepEqual([...A.ACHIEVEMENTS.map(a => a.id)].sort(), Object.keys(SPEC_ACH).sort());
  A.ACHIEVEMENTS.forEach(a => assert.equal(a.metal, SPEC_ACH[a.id], a.id));
  assert.deepEqual([...A.COLLECTION.map(e => e.id)], SPEC_COL);
  const all = [...A.ACHIEVEMENTS, ...A.COLLECTION].map(x => x.id);
  assert.equal(new Set(all).size, 29);
  all.forEach(id => assert.ok(A.has(id)));
  assert.ok(!A.has('toString') && !A.has('__proto__'));
  assert.equal(A.medal('yoq'), '');
  assert.equal(A.medal('constructor'), '');
});

test('medalyon gliflari nzIcons da bor va oq rangda chiziladi', () => {
  const A = load();
  const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(ICONS, ctx);
  const I = ctx.window.nzIcons;
  A.ACHIEVEMENTS.forEach(a => {
    if (a.metal === 'league') {
      assert.equal(a.glyph, null);
      const tier = { 'league-silver': 2, 'league-gold': 3, 'league-platinum': 4, 'league-diamond': 5 }[a.id];
      assert.equal(a.tier, tier);
      return;
    }
    assert.ok(Object.prototype.hasOwnProperty.call(I, a.glyph), a.id + ' → ' + a.glyph);
    assert.ok(A.medal(a.id).includes(I[a.glyph][0]), a.id);
    assert.ok(A.medal(a.id).includes('stroke="#FFFFFF"'), a.id);
    assert.ok(contrast('#FFFFFF', a.field) >= 4.5, a.id + ' maydoni oq glif uchun');
  });
});

test('yutuq darajasi nuqtalar bilan ham: bronza 1, kumush 2, oltin 3', () => {
  const A = load();
  A.ACHIEVEMENTS.forEach(a => {
    const k = { bronze: 1, silver: 2, gold: 3, league: 0 }[a.metal];
    assert.equal((A.medal(a.id).match(/cy="85" r="3"/g) || []).length, k, a.id);
  });
});

test('qulflangan holat: kulrang, qulf yutuqda bor, kolleksiyada yoʻq (narx chipi)', () => {
  const A = load();
  const chip = s => (s.match(/r="17"/g) || []).length;
  A.ACHIEVEMENTS.forEach(a => {
    assert.notEqual(A.medal(a.id, { locked: true }), A.medal(a.id));
    assert.equal(chip(A.medal(a.id, { locked: true })), 1, a.id);
    assert.equal(chip(A.medal(a.id, { locked: true, lock: false })), 0, a.id);
    assert.equal(chip(A.medal(a.id)), 0, a.id);
    assert.ok(!/#E0A100|#C77B3F/.test(A.medal(a.id, { locked: true })), a.id + ' kulrangda metall qolmasin');
  });
  A.COLLECTION.forEach(e => {
    assert.equal(chip(A.medal(e.id, { locked: true })), 0, e.id);
    assert.equal(chip(A.medal(e.id, { locked: true, lock: true })), 1, e.id);
    assert.ok(A.medal(e.id).includes('#FFA726'), e.id + ' halqasi tanga rangida');
    assert.ok(!A.medal(e.id, { locked: true }).includes('#FFA726'), e.id);
  });
  /* Tema faqat kulrang holatga taʼsir qiladi. */
  assert.equal(A.medal('compass', { theme: 'dark' }), A.medal('compass'));
  assert.notEqual(A.medal('compass', { locked: true, theme: 'dark' }), A.medal('compass', { locked: true }));
});

test('SVG xavfsizligi va tuzilishi (har holat)', () => {
  const A = load();
  for (const [k, s] of everything(A)) {
    assert.match(s, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="(\d+)" height="\1" viewBox="0 0 \1 \1" role="img"[^>]*>/, k);
    assert.ok(s.endsWith('</svg>'), k);
    assert.doesNotMatch(s, /<script|\son\w+\s*=|<foreignObject|href|<style|url\(|<image|<use|javascript:|<!|<iframe|<a\b/i, k);
    assert.doesNotMatch(s, /\sid=/, k + ': id yoʻq (ichiga joylansa ham toʻqnashmaydi)');
    assert.doesNotMatch(s, /NaN|undefined|Infinity/, k);
    /* Teglar muvozanati. */
    const stack = [];
    for (const m of s.matchAll(/<(\/?)([a-zA-Z]+)[^>]*?(\/?)>/g)) {
      if (m[3]) continue;
      if (m[1]) assert.equal(stack.pop(), m[2], k); else stack.push(m[2]);
    }
    assert.equal(stack.length, 0, k);
    for (const t of s.matchAll(/<([a-zA-Z]+)/g)) assert.ok(['svg', 'g', 'path', 'circle', 'rect', 'polygon'].includes(t[1]), k + ': ' + t[1]);
  }
});

test('hajm chegarasi', () => {
  const A = load();
  for (const [k, s] of everything(A)) assert.ok(s.length <= 2500, k + ': ' + s.length + ' bayt');
  assert.ok(ART.length < 28000, 'art.js hajmi');
});

test('src(): data URI, keshlanadi, qaytarib ochiladi', () => {
  const A = load();
  const s = A.medal('rocket');
  const u = A.src(s);
  assert.ok(u.startsWith('data:image/svg+xml;charset=utf-8,'));
  assert.equal(decodeURIComponent(u.slice(u.indexOf(',') + 1)), s);
  assert.equal(A.src(s), u);
  assert.equal(A.src(''), '');
  assert.equal(A.src(null), '');
});

test('nzIcons boʻlmasa ham yiqilmaydi (glif tushib qoladi)', () => {
  const A = load(false);
  assert.ok(A.medal('first-test').startsWith('<svg'));
  assert.ok(A.shield(5).startsWith('<svg'));
});

test('deterministik: ikki alohida yuklash bir xil, tasodif va sana yoʻq', () => {
  const a = everything(load()), b = everything(load());
  assert.deepEqual(a, b);
  assert.doesNotMatch(ART, /Math\.random|Date\.now|new Date/);
  assert.ok(Object.isFrozen(load()));
});
