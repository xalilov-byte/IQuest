/* ─────────────────────────────────────────────────────────────────────────
   src/games/nback.js — "N-back" (fazoviy, ishchi xotira) o'yini

   NIMA TEKSHIRILADI VA NIMA UCHUN:
     · o'yin hech qachon buzuq ko'rinish bermaydi (fuzz);
     · REPLAY (§10): server ballni jurnal bo'yicha qayta o'ynab
       tekshiradi — natija ham, jurnal ham aynan bir xil;
     · ketma-ketlik tuzilishi: baholanadigan 20 ta ko'rinishdan aniq 6 tasi
       mos (tasodifan 2 yoki 11 bo'lsa, baho beqaror), yuqori darajada
       "tuzoq"lar bor;
     · baholash formulasi (Pr = topilgan/6 − noto'g'ri/14) va keyingi
       daraja qoidasi aniq sonlar bilan;
     · vaqt: ko'rinishlar qat'iy jadvalda, birinchi N tasida bosish
       hisoblanmaydi, < 120 ms reaksiya — oldindan bosish;
     · ball mahoratni ajratadi, avtokliker va "hammasiga bosish" 0 oladi.

   Botlar QAYERDA kvadrat chiqqanini faqat view() dan (SVG) ko'radi;
   QACHON bosishni esa test biladigan jadvaldan oladi (reaksiya vaqtini
   aniq sinash uchun). Jadvalning o'zi alohida testda tekshiriladi.

   Ishga tushirish:  node --test tests/game-nback.test.mjs
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const ID = 'nback';
const FILE = 'src/games/nback.js';
const FILES = ['src/iq/rng.js', 'src/iq/index.js', 'src/games/index.js', FILE];
const read = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');

function load() {
  const ctx = { console };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(
    'Math.random = function () { throw new Error("Math.random taqiqlangan"); };'
    + 'Date = function () { throw new Error("Date taqiqlangan"); }; Date.now = Date;', ctx);
  for (const f of FILES) vm.runInContext(read(f), ctx, { filename: f });
  return ctx.IQ;
}
const IQ = load();
const plain = x => JSON.parse(JSON.stringify(x));

const T0 = 1000000;
const SEEDS = n => Array.from({ length: n }, (_, i) => Math.imul(i + 1, 2654435761) >>> 0);

/* Izohdagi jadval: daraja → [N, SOA ms, tuzoq ulushi]. */
const TABLE = { 1: [1, 3000, 0], 2: [1, 2500, 0], 3: [2, 3000, 0], 4: [2, 2500, 0], 5: [2, 2000, 0],
  6: [3, 3000, 0], 7: [3, 2500, 0], 8: [3, 2000, 0], 9: [3, 2000, 0.3], 10: [3, 1800, 0.5] };
const LEAD = 1500, ON = 500, SCORED = 20, TARGETS = 6, NONTARGETS = 14;
const PMAX = L => 40 + 12 * L;

const pressAt = (g, id, t) => { g.tick(t); g.press(id, t); };

function drive(seed, level, bot, step = 50, clock) {
  const g = IQ.games.create(ID, seed, level);
  const G = clock ? {
    get done() { return g.done; }, view: () => g.view(),
    tick: t => g.tick(clock(t)), tap: (i, t) => g.tap(i, clock(t)), press: (id, t) => g.press(id, clock(t)),
  } : g;
  let t = T0;
  const st = {};
  for (let n = 0; ; n++) {
    assert.ok(n < 200000, 'o\'yin tugamadi');
    G.tick(t);
    if (g.done) break;
    bot(G, g.view(), t, st);
    if (g.done) break;
    const w = st.wake;
    t = w !== undefined && w > t && w < t + step ? w : t + step;
  }
  return g;
}

/* Kvadrat chiqqan taxta — SVG'da to'ldirilgan (#1c1b29) kvadrat bor. */
const litSvg = v => (v.display && v.display.kind === 'svg' && v.display.svg.indexOf('fill="#1c1b29"') >= 0 ? v.display.svg : null);
const litPos = svg => { const m = /<rect x="(\d+)" y="(\d+)" width="24"/.exec(svg); return m ? m[1] + ',' + m[2] : null; };

/* Umumiy bot. decide(isMatch, k, r) — k-ko'rinishda bosadimi; offsets —
   ko'rinish boshidan necha ms keyin bosadi (bir nechta bo'lishi mumkin). */
function bot(level, decide, offsets, seed = 1) {
  const [N, SOA] = TABLE[level];
  const r = IQ.rng((seed ^ 0x1234567) >>> 0);
  const offs = typeof offsets === 'function' ? offsets : () => offsets;
  return (g, v, t, st) => {
    if (v.phase === 'intro') {
      pressAt(g, 'start', t);
      st.t0 = t; st.hist = []; st.lit = false; st.queue = []; st.wake = t + LEAD;
      return;
    }
    const s = litSvg(v);
    if (s && !st.lit) {
      st.hist.push(s);
      const k = st.hist.length - 1;
      const onset = st.t0 + LEAD + k * SOA;
      const isMatch = k >= N && st.hist[k] === st.hist[k - N];
      if (k >= N && decide(isMatch, k, r)) st.queue = offs(r).map(o => onset + o);
    }
    st.lit = !!s;
    while (st.queue.length && t >= st.queue[0]) pressAt(g, 'match', st.queue.shift());
    const nextOnset = st.t0 + LEAD + st.hist.length * SOA;
    st.wake = st.queue.length ? Math.min(st.queue[0], nextOnset) : nextOnset;
  };
}
const perfectBot = (L, rt = 450) => bot(L, m => m, [rt]);
const randomBot = (L, seed) => bot(L, (m, k, r) => r.chance(0.3), r => [350 + r.int(600)], seed);
const noisyBot = (L, seed) => bot(L, (m, k, r) => (r.chance(0.15) ? !m : m), r => [350 + r.int(600)], seed);
function spamBot(gap = 30) {
  return (g, v, t, st) => {
    pressAt(g, v.phase === 'intro' ? 'start' : 'match', t);
    st.wake = t + gap;
  };
}

function checkResult(res, level) {
  const r = plain(res);
  assert.deepEqual(Object.keys(r).sort(), ['correct', 'durationMs', 'nextLevel', 'points', 'score', 'total']);
  for (const k of Object.keys(r)) assert.ok(Number.isFinite(r[k]), k + ' son emas: ' + r[k]);
  assert.ok(Number.isInteger(r.points) && r.points >= 0 && r.points <= PMAX(level), 'points: ' + r.points);
  assert.ok(Number.isInteger(r.score) && r.score >= 0 && r.score <= 100, 'score: ' + r.score);
  assert.ok(Number.isInteger(r.nextLevel) && r.nextLevel >= 1 && r.nextLevel <= 10 && Math.abs(r.nextLevel - level) <= 1, 'nextLevel: ' + r.nextLevel);
  assert.ok(r.correct >= 0 && r.correct <= r.total && r.total <= SCORED, 'correct/total: ' + r.correct + '/' + r.total);
  assert.ok(r.durationMs >= 0);
  return r;
}

function assertReplay(g, seed, level) {
  const log = plain(g.log());
  const rep = IQ.games.replay(ID, seed, level, log);
  assert.deepEqual(plain(rep.result()), plain(g.result()), 'replay natijasi farq qildi (seed ' + seed + ', level ' + level + ')');
  assert.deepEqual(plain(rep.log()), log, 'replay jurnali farq qildi (seed ' + seed + ')');
  assert.equal(rep.done, g.done);
}

/* O'yin ko'rsatgan joylar ketma-ketligi (view orqali). */
function positions(seed, level) {
  const [, SOA] = TABLE[level];
  const g = IQ.games.create(ID, seed, level);
  g.press('start', 0);
  const out = [];
  for (let j = 0; !g.done; j++) {
    g.tick(LEAD + j * SOA);
    if (g.done) break;
    out.push(litPos(litSvg(g.view())));
  }
  return out;
}

// ── Ro'yxat, matnlar, kod ──────────────────────────────────────────────

test('ro\'yxatda: id, skill "memory", uz/ru sarlavha va tavsif', () => {
  const def = IQ.games.get(ID);
  assert.ok(def);
  assert.equal(def.skill, 'memory');
  for (const k of ['title', 'desc']) for (const l of ['uz', 'ru']) assert.ok(def[k][l].trim().length > 3, k + '.' + l);
  assert.ok(IQ.games.list().some(g => g.id === ID));
});

const FORBIDDEN = /\bIQ\b|kafolat|oshir|yaxshila|rasmiy|klinik|mensa|sertifikat|demens|dementsiya|kasallik|alsgeymer|davola|гарант|повыс|улучш|официальн|клиническ|менса|сертифик|деменц|болезн|альцгеймер|леч/i;
function texts(v) {
  const out = [v.prompt.uz, v.prompt.ru];
  for (const h of v.hud) out.push(h.label.uz, h.label.ru, h.value);
  if (v.display && v.display.kind === 'text') out.push(v.display.uz, v.display.ru);
  for (const b of v.buttons) out.push(b.label.uz, b.label.ru);
  return out;
}
test('§6: matnlarda kafolat, sog\'liq da\'vosi va "rasmiy" so\'zlari yo\'q', () => {
  const def = IQ.games.get(ID);
  const seen = new Set([def.title.uz, def.title.ru, def.desc.uz, def.desc.ru]);
  for (let L = 1; L <= 10; L++) {
    for (const b of [perfectBot(L), randomBot(L, L)]) {
      const g = IQ.games.create(ID, L * 7, L);
      let t = T0; const st = {};
      while (!g.done) { g.tick(t); texts(g.view()).forEach(s => seen.add(s)); b(g, g.view(), t, st); t += 50; }
      texts(g.view()).forEach(s => seen.add(s));
    }
  }
  for (const s of seen) assert.ok(!FORBIDDEN.test(s), 'taqiqlangan so\'z: ' + s);
});

test('ruscha "шаг/шага" N ga mos; harf yo\'q — faqat joy (lotin/kirill chalkashmaydi)', () => {
  const p1 = IQ.games.create(ID, 1, 1).view().prompt.ru;
  const p3 = IQ.games.create(ID, 1, 7).view().prompt.ru;
  assert.match(p1, /1 шаг назад/);
  assert.match(p3, /3 шага назад/);
  const g = IQ.games.create(ID, 1, 5);
  g.press('start', 0); g.tick(LEAD);
  const svg = g.view().display.svg;
  assert.doesNotMatch(svg, /<text/, 'stimulda harf/matn yo\'q');
});

const CODE = read(FILE).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
test('kodda soat, Math.random, taymer va transsendent Math yo\'q (d′ o\'rniga Pr shuning uchun)', () => {
  assert.doesNotMatch(CODE, /Date\s*\.\s*now|new\s+Date|\bDate\s*\(|Math\s*\.\s*random|setTimeout|setInterval|performance\s*\.\s*now/);
  assert.doesNotMatch(CODE, /Math\s*\.\s*(log|exp|pow|sin|cos|tan|atan|asin|acos|sinh|cosh|tanh|cbrt|hypot|expm1|log1p|log2|log10|sqrt)\b/);
  assert.doesNotMatch(CODE, /\*\*/);
});

// ── SVG ────────────────────────────────────────────────────────────────

test('SVG: xavfsiz, o\'z oq foni bor, kvadrat rang bilan emas — to\'liq/bo\'sh bilan ajraladi', () => {
  const svgs = new Set();
  for (const seed of SEEDS(30)) {
    const g = IQ.games.create(ID, seed, 3);
    g.press('start', 0);
    for (let t = 0; !g.done; t += 250) { g.tick(t); const v = g.view(); if (v.display && v.display.kind === 'svg') svgs.add(v.display.svg); }
  }
  assert.equal(svgs.size, 9, '8 joy + bo\'sh taxta');
  let blank = 0;
  for (const s of svgs) {
    assert.ok(s.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'));
    assert.match(s, /<rect width="100" height="100" fill="#fff"\/>/);
    assert.doesNotMatch(s, /<script|\son\w+\s*=|<foreignObject|href/i);
    const filled = (s.match(/fill="#1c1b29"/g) || []).length;
    assert.equal((s.match(/fill="none"/g) || []).length, 8, '8 ta bo\'sh katak chizig\'i');
    if (filled === 0) blank++; else assert.equal(filled, 1);
    const colors = new Set(s.match(/#[0-9a-f]{3,6}\b/gi));
    for (const c of colors) assert.ok(['#fff', '#1c1b29', '#8a8799'].indexOf(c) >= 0, 'ruxsat etilmagan rang: ' + c);
  }
  assert.equal(blank, 1);
});

// ── intro va done ──────────────────────────────────────────────────────

test('intro: qoida, "Boshlash"; vaqt o\'tsa ham, "Mos" bosilsa ham boshlanmaydi; tap — hech narsa', () => {
  const g = IQ.games.create(ID, 7, 3);
  g.tick(T0);
  const v = g.view();
  assert.equal(v.phase, 'intro');
  assert.deepEqual(plain(IQ.games.validateView(v)), []);
  assert.deepEqual(plain(v.buttons.map(b => [b.id, b.kind])), [['start', 'primary']]);
  assert.equal(v.display.kind, 'text');
  assert.match(v.display.uz, /22 ta ko'rinish, har 3 soniyada/);
  assert.match(v.display.ru, /22 показов, по одному каждые 3 с/);
  assert.equal(g.tick(T0 + 3600000), false);
  g.press('match', T0 + 3600000); g.tap(0, T0 + 3600000);
  assert.equal(g.view().phase, 'intro');
  assert.equal(g.log().length, 0);
  g.press('start', T0 + 3600001);
  assert.equal(g.view().phase, 'show');
  assert.deepEqual(plain(g.view().buttons.map(b => b.id)), ['match']);
  g.tap(4, T0 + 3600100);
  assert.equal(g.log().length, 1, 'tap bu o\'yinda jurnalga tushmaydi');
});

test('done: jadval bo\'yicha tugaydi, phase "done", progress 1, tugmalar yo\'q, keyingi bosishlar e\'tiborsiz', () => {
  const g = drive(11, 4, perfectBot(4));
  const v = g.view();
  assert.equal(v.phase, 'done');
  assert.equal(v.progress, 1);
  assert.deepEqual(plain(v.buttons), []);
  assert.deepEqual(plain(IQ.games.validateView(v)), []);
  assert.equal(plain(g.result()).durationMs, LEAD + 22 * 2500);
  const before = plain(g.result()), logLen = g.log().length;
  g.press('match', T0 * 5); g.press('start', T0 * 5);
  assert.equal(g.tick(T0 * 5), false);
  assert.deepEqual(plain(g.result()), before);
  assert.equal(g.log().length, logLen);
});

// ── Daraja jadvali va ketma-ketlik tuzilishi ───────────────────────────

test('daraja → N, SOA, uzunlik 20 + N (izohdagi jadval bilan bir xil); kvadrat 500 ms ko\'rinadi', () => {
  for (let L = 1; L <= 10; L++) {
    const [N, SOA] = TABLE[L];
    const g = IQ.games.create(ID, 5 + L, L);
    assert.equal(g.view().hud[0].value, String(N), 'daraja ' + L);
    assert.equal(g.view().hud[1].value, String(20 + N));
    g.press('start', 0);
    g.tick(LEAD - 1); assert.equal(litSvg(g.view()), null, 'daraja ' + L + ': 1.5 s tayyorlanish');
    g.tick(LEAD); assert.ok(litSvg(g.view()));
    g.tick(LEAD + ON - 1); assert.ok(litSvg(g.view()), 'daraja ' + L + ': 500 ms ko\'rinadi');
    g.tick(LEAD + ON); assert.equal(litSvg(g.view()), null);
    g.tick(LEAD + SOA - 1); assert.equal(litSvg(g.view()), null);
    g.tick(LEAD + SOA); assert.ok(litSvg(g.view()), 'daraja ' + L + ': SOA ' + SOA);
    g.tick(LEAD + N * SOA - 1); assert.equal(g.view().phase, 'show');
    g.tick(LEAD + N * SOA); assert.equal(g.view().phase, 'input', 'daraja ' + L + ': N ta ko\'rinishdan keyin input');
    const end = LEAD + (20 + N) * SOA;
    g.tick(end - 1); assert.equal(g.done, false);
    g.tick(end); assert.equal(g.done, true);
    assert.equal(plain(g.result()).durationMs, end);
  }
});

test('ketma-ketlik: baholanadiganlardan aniq 6 tasi mos, joylar 8 xil, 9–10-darajada tuzoqlar ko\'p', () => {
  const lureRate = {};
  for (const L of [1, 3, 6, 8, 9, 10]) {
    const [N] = TABLE[L];
    let lures = 0, non = 0;
    const firstTarget = new Array(SCORED).fill(0);
    const all = new Set();
    for (const seed of SEEDS(300)) {
      const p = positions(seed, L);
      assert.equal(p.length, 20 + N);
      p.forEach(x => all.add(x));
      let m = 0;
      for (let i = N; i < p.length; i++) {
        if (p[i] === p[i - N]) { m++; continue; }
        non++;
        if (p[i] === p[i - N + 1] || (i - N - 1 >= 0 && p[i] === p[i - N - 1])) lures++;
      }
      assert.equal(m, TARGETS, 'seed ' + seed + ', daraja ' + L + ': mos soni ' + m);
      for (let i = N; i < p.length; i++) if (p[i] === p[i - N]) { firstTarget[i - N]++; break; }
    }
    assert.equal(all.size, 8, 'markaz ishlatilmaydi, 8 joy');
    lureRate[L] = lures / non;
    // mos ko'rinish o'rni ketma-ketlik boshiga yig'ilmagan
    assert.ok(firstTarget[0] < 300 * 0.5, 'birinchi mos doim boshida');
  }
  assert.ok(lureRate[9] > lureRate[8] + 0.15, 'tuzoq 9: ' + lureRate[9] + ' vs 8: ' + lureRate[8]);
  assert.ok(lureRate[10] > lureRate[9] + 0.1, 'tuzoq 10: ' + lureRate[10]);
});

// ── (f) Vaqt va javob qoidalari ────────────────────────────────────────

test('(f) birinchi N ta ko\'rinishda bosish hisoblanmaydi; javob bir ko\'rinishga bitta', () => {
  const L = 3, [N, SOA] = TABLE[L];
  const g = IQ.games.create(ID, 42, L);
  g.press('start', 0);
  for (let j = 0; j < N; j++) pressAt(g, 'match', LEAD + j * SOA + 600);
  const v = g.view();
  assert.equal(v.phase, 'show');
  assert.equal(v.hud[1].value, '0');
  assert.equal(v.hud[2].value, '0', 'show dagi bosish xato ham emas');
  assert.match(v.prompt.uz, /eslab qoling/);
  // birinchi baholanadigan ko'rinishda ikki marta bosish — bitta javob
  pressAt(g, 'match', LEAD + N * SOA + 600);
  const after1 = JSON.stringify(g.view());
  pressAt(g, 'match', LEAD + N * SOA + 900);
  assert.equal(JSON.stringify(g.view()), after1);
  assert.match(g.view().prompt.uz, /To'g'ri — mos|Xato — mos emas edi/, 'javobdan keyin darhol izoh');
});

test('(f) reaksiya < 120 ms — oldindan bosish, hisoblanmaydi; 120 ms — hisoblanadi', () => {
  for (const L of [1, 4, 8]) {
    const fast = checkResult(drive(9, L, perfectBot(L, 119)).result(), L);
    const ok = checkResult(drive(9, L, perfectBot(L, 120)).result(), L);
    assert.equal(fast.score, 0);
    assert.equal(fast.points, 0);
    assert.equal(ok.score, 100);
    assert.equal(ok.points, PMAX(L));
  }
});

test('(f) o\'tkazib yuborilgan mos ko\'rinish tugashi bilan "Xato" ga qo\'shiladi; soat orqaga surilsa o\'yin qotmaydi', () => {
  const L = 1, [N, SOA] = TABLE[L];
  const p = positions(77, L);
  const k = p.findIndex((x, i) => i >= N && x === p[i - N]);
  const g = IQ.games.create(ID, 77, L);
  g.press('start', 0);
  g.tick(LEAD + k * SOA + SOA - 1);
  assert.equal(g.view().hud[2].value, '0');
  g.tick(LEAD + (k + 1) * SOA);
  assert.equal(g.view().hud[2].value, '1');
  // soat 1 soat orqaga: o'yin vaqti shu joydan davom etadi
  const t1 = LEAD + (k + 1) * SOA, back = t1 - 3600000;
  g.tick(back);
  g.tick(back + SOA - 1);
  assert.ok(Number(g.view().progress) < (k + 3) / 21);
  g.tick(back + SOA);
  assert.equal(Math.round(g.view().progress * 21), k + 3, 'keyingi ko\'rinish SOA dan keyin keladi');
  // butun o'yin soat buzilgan holda — natija toza o'yindagidek, replay mos
  const clean = plain(drive(99, 4, perfectBot(4)).result());
  const g2 = drive(99, 4, perfectBot(4), 50, t => (t < T0 + 20000 ? t : t - 3600000));
  const r2 = checkResult(g2.result(), 4);
  assert.equal(r2.points, clean.points);
  assert.ok(Math.abs(r2.durationMs - clean.durationMs) <= 100);
  assertReplay(g2, 99, 4);
});

// ── Baholash formulasi va keyingi daraja ───────────────────────────────

/* k-chi mos va k-chi mos emas ko'rinishlardan qaysilariga bosishni
   aniq belgilaydigan bot. */
function patternBot(L, hitN, faN) {
  let h = 0, f = 0;
  return bot(L, m => (m ? h++ < hitN : f++ < faN), [500]);
}
test('baholash: score = round(100·Pr), points = round(Pr·(40 + 12·daraja)), correct = topilgan + to\'g\'ri o\'tkazilgan', () => {
  const cases = [
    // [topilgan, noto'g'ri bosish, score, keyingi daraja farqi]
    [6, 0, 100, +1], [6, 2, 86, +1], [5, 0, 83, +1], [5, 1, 76, +1], [4, 1, 60, 0],
    [3, 0, 50, 0], [6, 3, 79, 0], [3, 3, 29, -1], [3, 7, 0, -1], [0, 0, 0, -1], [6, 14, 0, -1], [0, 14, 0, -1],
  ];
  for (const L of [2, 6]) {
    for (const [h, f, score, dl] of cases) {
      const r = checkResult(drive(3, L, patternBot(L, h, f)).result(), L);
      const pr = (h * NONTARGETS - f * TARGETS) / (TARGETS * NONTARGETS);
      assert.equal(r.score, Math.max(0, Math.round(100 * pr)), h + '/' + f);
      assert.equal(r.score, score, h + '/' + f);
      assert.equal(r.points, Math.max(0, Math.round(pr * PMAX(L))), h + '/' + f);
      assert.equal(r.correct, h + (NONTARGETS - f));
      assert.equal(r.total, SCORED);
      assert.equal(r.nextLevel, L + dl, 'xato ' + (6 - h + f) + ': ' + L + ' → ' + r.nextLevel);
    }
  }
  // chegaralar: 1-darajadan pastga, 10-darajadan yuqoriga chiqmaydi
  assert.equal(drive(3, 1, patternBot(1, 0, 0)).result().nextLevel, 1);
  assert.equal(drive(3, 10, perfectBot(10)).result().nextLevel, 10);
});

// ── (a) Fuzz ───────────────────────────────────────────────────────────

function fuzzGame(seed, level, phases) {
  const r = IQ.rng(seed ^ 0x9e3779b9);
  const g = IQ.games.create(ID, seed, level);
  let t = 1000 + r.int(1e9);
  g.tick(t);
  let n = 0;
  while (!g.done) {
    assert.ok(++n < 50000, 'fuzz: o\'yin tugamadi (seed ' + seed + ')');
    const x = r.next();
    if (x < 0.45) {
      const y = r.next();
      t += y < 0.05 ? -r.int(3000) : y < 0.12 ? r.int(15000) : r.int(400);
      const w = r.next();
      g.tick(w < 0.02 ? NaN : w < 0.03 ? undefined : t);
    } else if (x < 0.55) {
      g.tap(r.pick([0, 4, -1, 1.5, NaN, null]), t);
    } else {
      t += r.int(250);
      const v = g.view();
      g.press(r.chance(0.8) && v.buttons.length ? r.pick(v.buttons).id : r.pick(['start', 'match', 'x', '', null, undefined]), t);
    }
    const v = g.view();
    const errs = plain(IQ.games.validateView(v));
    assert.deepEqual(errs, [], 'buzuq view (seed ' + seed + ', qadam ' + n + '): ' + errs.join('; '));
    phases.add(v.phase);
  }
  return { g, n };
}

test('(a) fuzz: 1500 o\'yin tasodifiy bosish/tick — view doim to\'g\'ri, xato yo\'q, o\'yin tugaydi, replay mos', () => {
  let steps = 0;
  const phases = new Set();
  for (const seed of SEEDS(1500)) {
    const level = 1 + seed % 10;
    const { g, n } = fuzzGame(seed, level, phases);
    steps += n;
    assert.equal(g.view().phase, 'done');
    checkResult(g.result(), level);
    assertReplay(g, seed, level);
  }
  assert.ok(steps > 100000, 'fuzz juda kam harakat qildi: ' + steps);
  assert.deepEqual([...phases].sort(), ['done', 'input', 'intro', 'show']);
});

test('(a) jim o\'yinchi: "Boshlash" dan keyin hech narsa bosmasa ham o\'yin tugaydi, ball 0', () => {
  for (const L of [1, 5, 10]) {
    const g = IQ.games.create(ID, 3, L);
    g.press('start', 0);
    let t = 0;
    while (!g.done) { t += 100; g.tick(t); assert.ok(t < 600000); }
    const r = checkResult(g.result(), L);
    assert.equal(r.points, 0);
    assert.equal(r.score, 0);
    assert.equal(r.correct, NONTARGETS);
    assert.equal(r.nextLevel, Math.max(1, L - 1), '6 ta o\'tkazib yuborilgan — 5 dan ko\'p xato');
  }
});

// ── (b) Replay ─────────────────────────────────────────────────────────

test('(b) replay: mukammal, oddiy, tasodifiy va avtokliker o\'yinlari aynan shu natijani beradi', () => {
  for (const seed of SEEDS(40)) {
    const L = 1 + seed % 10;
    for (const b of [perfectBot(L), noisyBot(L, seed), randomBot(L, seed), spamBot()]) {
      const g = drive(seed, L, b);
      checkResult(g.result(), L);
      assertReplay(g, seed, L);
    }
  }
});

test('(b) replay: jurnal ixcham, soxta jurnal boshqa natija beradi', () => {
  const seed = 424242, L = 4;
  const g = drive(seed, L, perfectBot(L), 17);
  const log = plain(g.log());
  assert.ok(log.length < 120, 'jurnal har tick\'ni yozmasligi kerak: ' + log.length);
  // "Mos" bosishlarni bitta ko'rinishga surish — boshqa natija
  const forged = log.map(e => (e.k === 'press' && e.v === 'match' ? { t: e.t + 2500, k: e.k, v: e.v } : e));
  assert.notDeepEqual(plain(IQ.games.replay(ID, seed, L, forged).result()), plain(g.result()));
  assert.notDeepEqual(plain(IQ.games.replay(ID, seed + 1, L, log).result()), plain(g.result()));
});

// ── (c) Determinizm ────────────────────────────────────────────────────

function trace(seed, L, b) {
  const g = IQ.games.create(ID, seed, L);
  const views = [];
  let t = T0; const st = {};
  while (!g.done) { g.tick(t); views.push(JSON.stringify(g.view())); b(g, g.view(), t, st); t += 50; }
  return { views, result: plain(g.result()), log: plain(g.log()) };
}

test('(c) determinizm: bir xil urug\' + daraja + harakatlar → bir xil ko\'rinishlar, jurnal va natija', () => {
  for (const seed of SEEDS(8)) {
    const L = 1 + seed % 10;
    assert.deepEqual(trace(seed, L, randomBot(L, seed)), trace(seed, L, randomBot(L, seed)));
  }
  const seqs = new Set(SEEDS(50).map(seed => positions(seed, 4).join(' ')));
  assert.equal(seqs.size, 50, 'turli urug\' — turli ketma-ketlik');
});

// ── (d) Mahoratni ajratish ─────────────────────────────────────────────

test('(d) mukammal o\'yinchi maksimal ball oladi va darajasi oshadi; tasodifiy — past', () => {
  for (let L = 1; L <= 10; L++) {
    let rsum = 0;
    const seeds = SEEDS(20);
    for (const seed of seeds) {
      const p = checkResult(drive(seed, L, perfectBot(L)).result(), L);
      assert.equal(p.score, 100);
      assert.equal(p.points, PMAX(L));
      assert.equal(p.correct, SCORED);
      assert.equal(p.nextLevel, Math.min(10, L + 1));
      const r = checkResult(drive(seed, L, randomBot(L, seed)).result(), L);
      assert.ok(r.nextLevel <= L, 'tasodifiy darajasi oshdi');
      assert.ok(r.points <= PMAX(L) * 0.45, 'tasodifiy: ' + r.points);
      rsum += r.points;
    }
    assert.ok(rsum / seeds.length <= PMAX(L) * 0.12, 'daraja ' + L + ': tasodifiy o\'rtacha ' + rsum / seeds.length);
  }
});

test('(d) "oddiy o\'yinchi" (85% to\'g\'ri qaror) 30–150 ball oladi', () => {
  for (const L of [1, 2, 3, 4, 5, 6, 7, 8]) {
    let sum = 0;
    const seeds = SEEDS(30);
    for (const seed of seeds) sum += checkResult(drive(seed, L, noisyBot(L, seed)).result(), L).points;
    const avg = sum / seeds.length;
    assert.ok(avg >= 30 && avg <= 150, 'daraja ' + L + ': ' + avg);
  }
});

// ── (e) Avtokliker ─────────────────────────────────────────────────────

test('(e) avtokliker (har 30–110 ms bosish) va "hammasiga bosish" ball olmaydi', () => {
  for (const seed of SEEDS(20)) {
    const L = 1 + seed % 10;
    for (const gap of [30, 60, 110]) assert.equal(checkResult(drive(seed, L, spamBot(gap)).result(), L).points, 0, 'gap ' + gap);
    assert.equal(checkResult(drive(seed, L, bot(L, () => true, [400])).result(), L).points, 0, 'hammasiga bosish');
  }
});

test('(e) oldingi bosishdan < 120 ms keyingi javob: topilgan sanaladi (score), lekin ball bermaydi', () => {
  for (const L of [2, 7]) {
    // 100 ms da oldindan bosish (hisoblanmaydi), 130 ms da haqiqiy — oldingisidan 30 ms keyin
    const r = checkResult(drive(5, L, bot(L, m => m, [100, 130])).result(), L);
    assert.equal(r.score, 100);
    assert.equal(r.points, 0);
    const ok = checkResult(drive(5, L, bot(L, m => m, [100, 220])).result(), L);
    assert.equal(ok.points, PMAX(L), '120 ms dan keyin — toza');
  }
});
