/* ─────────────────────────────────────────────────────────────────────────
   src/games/matrix-memory.js — "Xotira matritsasi" o'yini

   NIMA TEKSHIRILADI VA NIMA UCHUN:
     · o'yin hech qachon buzuq ko'rinish bermaydi (minglab tasodifiy
       bosish/tick — fuzz): ilova bitta umumiy ekranda har qanday o'yinni
       chizadi, buzuq GameView — bo'sh yoki qotgan ekran;
     · REPLAY: server (§10) ballni faqat jurnal bo'yicha qayta o'ynab
       tekshiradi. Replay boshqa natija bersa — halol o'yinchining balli
       rad etiladi yoki (yomoni) soxta ball o'tib ketadi;
     · determinizm: tasodif faqat IQ.rng, vaqt faqat `now` dan;
     · ball haqiqiy mahoratni ajratadi: xotirasi mukammal bot yuqori,
       tasodifiy bosuvchi past; avtokliker (< 120 ms) ball olmaydi;
     · vaqt: 'show' belgilangan vaqtdan keyin 'input' ga o'tadi, 'show'
       paytida bosish hisoblanmaydi.

   Botlar faqat view() ni o'qiydi — xuddi odam ekranni ko'rgani kabi.
   O'yinning ichki holatiga murojaat yo'q.

   Ishga tushirish:  node --test tests/game-matrix-memory.test.mjs
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const ID = 'matrix-memory';
const FILE = 'src/games/matrix-memory.js';
const FILES = ['src/iq/rng.js', 'src/iq/index.js', 'src/games/index.js', FILE];
const read = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');

/* Brauzer taqlidi: window === global. Math.random yoki soat (Date)
   chaqirilsa darhol yiqiladi; setTimeout umuman yo'q (ReferenceError). */
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
/* vm realm'idagi obyektlar boshqa prototipga ega — deepEqual uchun. */
const plain = x => JSON.parse(JSON.stringify(x));

const T0 = 1000000;
const SEEDS = n => Array.from({ length: n }, (_, i) => Math.imul(i + 1, 2654435761) >>> 0);

/* Ilova kabi: avval tick, keyin bosish (Main.dc.html gameAct). */
const tapAt = (g, i, t) => { g.tick(t); g.tap(i, t); };
const pressAt = (g, id, t) => { g.tick(t); g.press(id, t); };

/* Ilova taqlidi: har `step` ms da tick. Bot aniq vaqtda harakat qilmoqchi
   bo'lsa (st.wake) — o'sha vaqtga sakraladi: 119 va 120 ms oralig'ini
   aniq sinash uchun. */
function drive(seed, level, bot, step = 50, clock) {
  const g = IQ.games.create(ID, seed, level);
  /* clock — qurilma soatini buzish (masalan orqaga surish) uchun: o'yin
     ko'radigan `now` shu funksiyadan o'tadi, bot esa o'z vaqtida. */
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

const litCells = v => v.grid ? v.grid.cells.map((c, i) => (c.state === 'lit' ? i : -1)).filter(i => i >= 0) : [];

/* Xotirasi mukammal o'yinchi: 'show' da yongan kataklarni ko'radi,
   'input' da `delay` kutib, har `gap` ms da bittadan bosadi. */
function perfectBot(gap = 300, delay = 400) {
  return (g, v, t, st) => {
    if (v.phase === 'intro') { pressAt(g, 'start', t); return; }
    if (v.phase !== 'input') {
      st.inInput = false;
      if (v.phase === 'show') { const l = litCells(v); if (l.length) st.mem = l; }
      return;
    }
    if (!st.inInput) { st.inInput = true; st.queue = (st.mem || []).slice(); st.next = t + delay; }
    if (st.queue.length && t >= st.next) { tapAt(g, st.queue.shift(), t); st.next = t + gap; }
    st.wake = st.next;
  };
}

/* Tasodifiy bosuvchi: panjara bo'lsa, odam tezligida (300–700 ms)
   istalgan katakni bosadi. */
function randomBot(seed) {
  const r = IQ.rng(seed ^ 0x5bd1e995);
  return (g, v, t, st) => {
    if (v.phase === 'intro') { pressAt(g, 'start', t); return; }
    if (v.grid && t >= (st.next || 0)) {
      tapAt(g, r.int(v.grid.cells.length), t);
      st.next = t + 300 + r.int(400);
    }
  };
}

/* "Oddiy o'yinchi" modeli (faqat ball shkalasini tekshirish uchun):
   `cap` tagacha katakni eslaydi; ko'prog'ida bitta noto'g'risini bosadi;
   har raundda `err` ehtimol bilan adashadi. */
function normalBot(seed, cap = 6, err = 0.15) {
  const r = IQ.rng(seed ^ 0x27d4eb2f);
  const perfect = perfectBot(450, 600);
  return (g, v, t, st) => {
    if (v.phase === 'input' && !st.inInput && st.mem) {
      const n = v.grid.cells.length;
      const wrong = [];
      for (let i = 0; i < n; i++) if (st.mem.indexOf(i) < 0) wrong.push(i);
      let plan = st.mem.slice(0, cap);
      if (st.mem.length > cap || r.chance(err)) plan.splice(r.int(plan.length + 1), 0, r.pick(wrong));
      perfect(g, v, t, st);
      st.queue = plan;
      return;
    }
    perfect(g, v, t, st);
  };
}

/* Avtokliker: hamma kataklarni to'xtovsiz `gap` ms da aylanib bosadi. */
function spamBot(gap = 30) {
  return (g, v, t, st) => {
    if (v.phase === 'intro') { pressAt(g, 'start', t); return; }
    if (v.grid) { st.i = ((st.i || 0) + 1) % v.grid.cells.length; tapAt(g, st.i, t); }
    st.wake = t + gap;
  };
}

function checkResult(res, level) {
  const r = plain(res);
  assert.deepEqual(Object.keys(r).sort(), ['correct', 'durationMs', 'nextLevel', 'points', 'score', 'total']);
  for (const k of Object.keys(r)) assert.ok(Number.isFinite(r[k]), k + ' son emas: ' + r[k]);
  assert.ok(Number.isInteger(r.points) && r.points >= 0 && r.points <= 190, 'points: ' + r.points);
  assert.ok(Number.isInteger(r.nextLevel) && r.nextLevel >= 1 && r.nextLevel <= 10, 'nextLevel: ' + r.nextLevel);
  assert.ok(Math.abs(r.nextLevel - level) <= 3, 'nextLevel sakrashi: ' + level + ' → ' + r.nextLevel);
  assert.ok(r.correct >= 0 && r.correct <= r.total && r.total <= 10, 'correct/total: ' + r.correct + '/' + r.total);
  assert.ok(r.durationMs >= 0, 'durationMs: ' + r.durationMs);
  return r;
}

/* Replay: server shu funksiya bilan ballni qayta chiqaradi. Natija HAM,
   jurnal HAM aynan bir xil bo'lishi kerak (jurnal bir xil — demak holat
   ham qadam-baqadam bir xil o'tgan). */
function assertReplay(g, seed, level) {
  const log = plain(g.log());
  const rep = IQ.games.replay(ID, seed, level, log);
  assert.deepEqual(plain(rep.result()), plain(g.result()), 'replay natijasi farq qildi (seed ' + seed + ', level ' + level + ')');
  assert.deepEqual(plain(rep.log()), log, 'replay jurnali farq qildi (seed ' + seed + ')');
  assert.equal(rep.done, g.done);
}

// ── Ro'yxat va matnlar ─────────────────────────────────────────────────

test('ro\'yxatda: id, skill "memory", uz/ru sarlavha va tavsif', () => {
  const def = IQ.games.get(ID);
  assert.ok(def, 'ro\'yxatdan o\'tmagan');
  assert.equal(def.skill, 'memory');
  for (const k of ['title', 'desc']) for (const l of ['uz', 'ru']) assert.ok(def[k][l].trim().length > 3, k + '.' + l);
  assert.ok(IQ.games.list().some(g => g.id === ID));
});

/* §6: kafolat, raqamli va'da, sog'liq da'vosi, "rasmiy/klinik" yo'q.
   Hamma matn — sarlavha, tavsif va o'yin davomida chiqqan HAR BIR
   prompt/hud/display/tugma — tekshiriladi. */
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
  for (const seed of SEEDS(20)) {
    for (const bot of [perfectBot(), randomBot(seed)]) {
      const g = IQ.games.create(ID, seed, 1 + seed % 10);
      let t = T0; const st = {};
      while (!g.done) { g.tick(t); texts(g.view()).forEach(s => seen.add(s)); bot(g, g.view(), t, st); t += 50; }
      texts(g.view()).forEach(s => seen.add(s));
    }
  }
  for (const s of seen) assert.ok(!FORBIDDEN.test(s), 'taqiqlangan so\'z: ' + s);
});

// ── Determinizm manbalari ──────────────────────────────────────────────

/* Izohlar olib tashlangan kod: izohda "Date.now" deb yozish mumkin. */
const CODE = read(FILE).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
test('kodda soat, Math.random, taymer va transsendent Math yo\'q', () => {
  assert.doesNotMatch(CODE, /Date\s*\.\s*now|new\s+Date|\bDate\s*\(|Math\s*\.\s*random|setTimeout|setInterval|performance\s*\.\s*now/);
  /* Math.log/exp/pow/sin... natijasi JS dvigatellari orasida oxirgi bitda
     farq qilishi mumkin (spec: "implementation-approximated") — mijoz
     (WebView) va server (Deno) replay'i baytma-bayt bir xil bo'lishi
     uchun ball faqat +, −, ×, ÷, round bilan hisoblanadi. */
  assert.doesNotMatch(CODE, /Math\s*\.\s*(log|exp|pow|sin|cos|tan|atan|asin|acos|sinh|cosh|tanh|cbrt|hypot|expm1|log1p|log2|log10)\b/);
  assert.doesNotMatch(CODE, /\*\*/, '** (daraja) ham taqiqlangan');
});

// ── intro va done fazalari ─────────────────────────────────────────────

test('intro: qoida, "Boshlash" tugmasi; vaqt o\'tsa ham, katak bosilsa ham boshlanmaydi', () => {
  const g = IQ.games.create(ID, 7, 3);
  g.tick(T0);
  let v = g.view();
  assert.equal(v.phase, 'intro');
  assert.deepEqual(plain(IQ.games.validateView(v)), []);
  assert.equal(v.grid, null);
  assert.deepEqual(plain(v.buttons.map(b => [b.id, b.kind])), [['start', 'primary']]);
  assert.ok(v.prompt.uz.length > 20 && v.prompt.ru.length > 20, 'qoida matni qisqa');
  assert.equal(g.tick(T0 + 3600000), false);
  g.tap(0, T0 + 3600000); g.press('match', T0 + 3600000);
  v = g.view();
  assert.equal(v.phase, 'intro');
  assert.equal(g.log().length, 0, 'intro dagi foydasiz bosishlar jurnalga tushmaydi');
  g.press('start', T0 + 3600001);
  assert.equal(g.view().phase, 'show');
  assert.equal(g.done, false);
});

test('done: o\'yin oxirida phase "done", progress 1, tugmalar yo\'q, keyingi bosishlar e\'tiborsiz', () => {
  const g = drive(11, 2, perfectBot());
  const v = g.view();
  assert.equal(v.phase, 'done');
  assert.equal(v.progress, 1);
  assert.deepEqual(plain(v.buttons), []);
  assert.deepEqual(plain(IQ.games.validateView(v)), []);
  const before = plain(g.result()), logLen = g.log().length;
  g.tap(0, T0 * 5); g.press('start', T0 * 5);
  assert.equal(g.tick(T0 * 5), false);
  assert.deepEqual(plain(g.result()), before);
  assert.equal(g.log().length, logLen);
});

// ── Daraja jadvali ─────────────────────────────────────────────────────

const LEVEL_TABLE = { 1: [3, 3, 1300], 2: [3, 4, 1350], 3: [4, 4, 1300], 4: [4, 5, 1350], 5: [4, 6, 1400],
  6: [5, 6, 1350], 7: [5, 7, 1400], 8: [5, 8, 1450], 9: [6, 8, 1400], 10: [6, 9, 1450] };
test('daraja → panjara, K va ko\'rsatish vaqti (izohdagi jadval bilan bir xil)', () => {
  for (let L = 1; L <= 10; L++) {
    const [cols, k, show] = LEVEL_TABLE[L];
    const g = IQ.games.create(ID, 99 + L, L);
    g.press('start', 0);
    g.tick(600);
    const v = g.view();
    assert.equal(v.grid.cols, cols, 'daraja ' + L);
    assert.equal(litCells(v).length, k, 'daraja ' + L);
    g.tick(600 + show - 1);
    assert.equal(g.view().phase, 'show', 'daraja ' + L + ': ko\'rsatish erta tugadi');
    g.tick(600 + show);
    assert.equal(g.view().phase, 'input', 'daraja ' + L + ': ko\'rsatish ' + show + ' ms da tugashi kerak');
  }
});

// ── (f) Vaqt ───────────────────────────────────────────────────────────

test('(f) vaqt: 600 ms bo\'sh → yonadi → 1300 ms dan keyin input; jimlikda raund yutqaziladi', () => {
  const g = IQ.games.create(ID, 5, 1);
  g.tick(1000);
  g.press('start', 1000);
  let v = g.view();
  assert.equal(v.phase, 'show');
  assert.equal(litCells(v).length, 0, 'avval bo\'sh panjara');
  assert.equal(g.tick(1599), false);
  assert.equal(g.tick(1600), true);
  v = g.view();
  assert.equal(v.phase, 'show');
  assert.equal(litCells(v).length, 3);
  assert.equal(g.tick(2899), false);
  assert.equal(litCells(g.view()).length, 3, 'belgilangan vaqtdan oldin o\'chmaydi');
  assert.equal(g.tick(2900), true);
  v = g.view();
  assert.equal(v.phase, 'input');
  assert.equal(litCells(v).length, 0, 'input da yongan katak ko\'rinmaydi');
  assert.ok(v.grid.cells.every(c => c.state === 'idle'));
  // kiritish chegarasi 4000 + 1000·K = 7000 ms
  assert.equal(g.tick(9899), false);
  assert.equal(g.view().phase, 'input');
  assert.equal(g.tick(9900), true);
  v = g.view();
  assert.equal(v.phase, 'feedback');
  assert.equal(litCells(v).length, 3, 'vaqt tugagach yongan kataklar ko\'rsatiladi');
  assert.equal(v.hud[2].value, '1/3');
});

test('(f) tick kech kelsa (ilova fonda edi) — kataklar baribir to\'liq vaqt ko\'rinadi', () => {
  const g = IQ.games.create(ID, 5, 1);
  g.press('start', 1000);
  assert.equal(g.tick(60000), true);            // 59 soniya kechikish
  assert.equal(litCells(g.view()).length, 3, 'kechikkan tickda endi yonadi');
  g.tick(60000 + 1299);
  assert.equal(g.view().phase, 'show');
  g.tick(60000 + 1300);
  assert.equal(g.view().phase, 'input');
});

test('(f) qurilma soati orqaga surilsa (NTP) o\'yin qotmaydi: vaqt shu joydan davom etadi', () => {
  const g = IQ.games.create(ID, 5, 1);
  g.press('start', 1000);
  g.tick(1600);
  assert.equal(litCells(g.view()).length, 3);
  const back = 1600 - 3600000;                  // soat 1 soat orqaga
  assert.equal(g.tick(back), false);
  g.tick(back + 1299);
  assert.equal(g.view().phase, 'show');
  g.tick(back + 1300);
  assert.equal(g.view().phase, 'input', 'soat orqaga ketganda o\'yin 1 soat qotib qolmasligi kerak');
  // butun o'yin: 10-soniyada soat orqaga — natija toza o'yindagidek, replay mos
  const seed = 99, L = 3;
  const clean = plain(drive(seed, L, perfectBot()).result());
  const g2 = drive(seed, L, perfectBot(), 50, t => (t < T0 + 10000 ? t : t - 3600000));
  const r2 = checkResult(g2.result(), L);
  assert.equal(r2.points, clean.points);
  assert.equal(r2.correct, clean.correct);
  assert.ok(Math.abs(r2.durationMs - clean.durationMs) <= 100, r2.durationMs + ' vs ' + clean.durationMs);
  const log = plain(g2.log());
  for (let i = 1; i < log.length; i++) assert.ok(log[i].t >= log[i - 1].t, 'jurnal vaqti o\'sib borishi kerak');
  assertReplay(g2, seed, L);
});

test('show paytida bosish hisoblanmaydi (yongan katakni ko\'rib bosish xotira emas)', () => {
  const g = IQ.games.create(ID, 21, 1);
  g.press('start', 0);
  g.tick(600);
  const lit = litCells(g.view());
  let t = 700;
  for (const i of lit) { tapAt(g, i, t); t += 200; }
  let v = g.view();
  assert.equal(v.phase, 'show');
  assert.ok(v.grid.cells.every(c => c.state === 'lit' || c.state === 'idle'), 'show da ✓ paydo bo\'lmaydi');
  g.tick(1900);
  v = g.view();
  assert.equal(v.phase, 'input');
  assert.ok(v.grid.cells.every(c => c.state === 'idle'), 'show dagi bosishlar input ga o\'tmaydi');
  assert.match(v.prompt.uz, /0\/3/);
  // endi input da bossa — hisoblanadi
  t = 2300;
  for (const i of lit) { tapAt(g, i, t); t += 300; }
  assert.equal(g.view().phase, 'feedback');
  assert.equal(plain(g.result()).correct, 1);
  // jimlikda: faqat show da bosgan o'yinchi raundni yutqazadi
  const h = IQ.games.create(ID, 21, 1);
  h.press('start', 0); h.tick(600);
  t = 700; for (const i of lit) { tapAt(h, i, t); t += 200; }
  h.tick(1900); h.tick(1900 + 7000);
  assert.equal(h.view().phase, 'feedback');
  assert.equal(plain(h.result()).correct, 0);
  assert.equal(plain(h.result()).points, 0);
});

test('yaroqsiz katak (−1, 9, 1.5, "2", NaN, null) va noma\'lum tugma e\'tiborsiz: jurnalga ham tushmaydi', () => {
  const g = IQ.games.create(ID, 8, 1);
  g.press('start', 0); g.tick(600); g.tick(1900);
  assert.equal(g.view().phase, 'input');
  const before = JSON.stringify(g.view()), len = g.log().length;
  let t = 2000;
  for (const i of [-1, 9, 36, 1.5, '2', NaN, null, undefined, Infinity]) { tapAt(g, i, t); t += 300; }
  for (const id of ['match', 'x', '', null, 'start']) { pressAt(g, id, t); t += 300; }
  assert.equal(JSON.stringify(g.view()), before);
  assert.equal(g.log().length, len);
});

test('xato bosish raundni darhol tugatadi, feedback da ✓, ✕ va topilmaganlar ko\'rinadi', () => {
  const g = IQ.games.create(ID, 33, 1);
  g.press('start', 0); g.tick(600);
  const lit = litCells(g.view());
  g.tick(1900);
  const wrong = [0, 1, 2, 3, 4, 5, 6, 7, 8].find(i => lit.indexOf(i) < 0);
  tapAt(g, lit[0], 2300);
  tapAt(g, wrong, 2700);
  const v = g.view();
  assert.equal(v.phase, 'feedback');
  assert.equal(plain(g.result()).points, 0, 'qisman topilgan raund ball bermaydi');
  const st = v.grid.cells.map(c => c.state);
  assert.equal(st[lit[0]], 'ok');
  assert.equal(st[wrong], 'bad');
  assert.equal(st[lit[1]], 'lit');
  assert.equal(st[lit[2]], 'lit');
  // xatodan keyin K kamaymaydi-yu (1-pog'onadan past yo'q), xato soni oshadi
  g.tick(2700 + 1600);
  assert.equal(g.view().phase, 'show');
  assert.equal(g.view().hud[2].value, '1/3');
});

// ── (a) Fuzz ───────────────────────────────────────────────────────────

/* Tasodifiy harakatlar: tick (ba'zan orqaga, ba'zan katta sakrash, ba'zan
   NaN), yaroqli va yaroqsiz katak (−1, 1.5, '2', 99, NaN), mavjud va
   mavjud bo'lmagan tugmalar. Har qadamdan keyin validateView bo'sh. */
function fuzzGame(seed, level, phases) {
  const r = IQ.rng(seed ^ 0x9e3779b9);
  const g = IQ.games.create(ID, seed, level);
  let t = 1000 + r.int(1e9);
  g.tick(t);
  let n = 0;
  while (!g.done) {
    assert.ok(++n < 50000, 'fuzz: o\'yin tugamadi (seed ' + seed + ')');
    const x = r.next();
    if (x < 0.4) {
      const y = r.next();
      t += y < 0.05 ? -r.int(3000) : y < 0.12 ? r.int(15000) : r.int(400);
      const w = r.next();
      g.tick(w < 0.02 ? NaN : w < 0.03 ? undefined : t);
    } else if (x < 0.85) {
      t += r.int(250);
      const v = g.view();
      const cells = v.grid ? v.grid.cells.length : 9;
      const i = r.chance(0.9) ? r.int(cells) : r.pick([-1, cells, 36, 99, 1.5, NaN, '2', null, undefined]);
      g.tap(i, t);
    } else {
      const v = g.view();
      g.press(r.pick(v.buttons.map(b => b.id).concat(['start', 'match', 'x', '', null])), t);
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
  assert.deepEqual([...phases].sort(), ['done', 'feedback', 'input', 'intro', 'show'], 'fuzz hamma fazaga kirmadi');
});

test('(a) jim o\'yinchi: "Boshlash" dan keyin hech narsa bosmasa ham o\'yin tugaydi, ball 0', () => {
  for (const L of [1, 5, 10]) {
    const g = IQ.games.create(ID, 3, L);
    g.press('start', 0);
    let t = 0;
    while (!g.done) { t += 100; g.tick(t); assert.ok(t < 600000, 'o\'yin tugamadi'); }
    const r = checkResult(g.result(), L);
    assert.equal(r.points, 0);
    assert.equal(r.correct, 0);
    assert.equal(r.total, 3, '3 ta xatoda tugaydi');
    assert.equal(r.nextLevel, Math.max(1, L - 1));
  }
});

// ── (b) Replay ─────────────────────────────────────────────────────────

test('(b) replay: mukammal, oddiy, tasodifiy va avtokliker o\'yinlari aynan shu natijani beradi', () => {
  for (const seed of SEEDS(60)) {
    const level = 1 + seed % 10;
    for (const bot of [perfectBot(), normalBot(seed), randomBot(seed), spamBot()]) {
      const g = drive(seed, level, bot);
      checkResult(g.result(), level);
      assertReplay(g, seed, level);
    }
  }
});

test('(b) replay: ilova tick\'larini tashlab yuborish (faqat jurnal) natijani o\'zgartirmaydi; soxta jurnal boshqa natija beradi', () => {
  const seed = 424242, level = 4;
  const g = drive(seed, level, perfectBot(), 17);   // tick oralig'i 17 ms — jurnal esa ixcham
  const log = plain(g.log());
  assert.ok(log.length < 400, 'jurnal har tick\'ni yozmasligi kerak: ' + log.length);
  assert.ok(plain(g.result()).points > 0);
  // Taplarni boshqa katakka surilgan jurnal — server boshqa ball chiqaradi.
  const forged = log.map(e => (e.k === 'tap' ? { t: e.t, k: e.k, v: (e.v + 1) % 16 } : e));
  const rep = IQ.games.replay(ID, seed, level, forged);
  assert.notDeepEqual(plain(rep.result()), plain(g.result()));
  // Boshqa urug' bilan — boshqa kataklar, jurnal endi to'g'ri emas.
  const other = IQ.games.replay(ID, seed + 1, level, log);
  assert.notDeepEqual(plain(other.result()), plain(g.result()));
});

// ── (c) Determinizm ────────────────────────────────────────────────────

function trace(seed, level, bot) {
  const g = IQ.games.create(ID, seed, level);
  const views = [];
  let t = T0; const st = {};
  while (!g.done) { g.tick(t); views.push(JSON.stringify(g.view())); bot(g, g.view(), t, st); t += 50; }
  return { views, result: plain(g.result()), log: plain(g.log()) };
}

test('(c) determinizm: bir xil urug\' + daraja + harakatlar → bir xil ko\'rinishlar, jurnal va natija', () => {
  for (const seed of SEEDS(10)) {
    const a = trace(seed, 1 + seed % 10, randomBot(seed));
    const b = trace(seed, 1 + seed % 10, randomBot(seed));
    assert.deepEqual(a, b);
  }
  // urug' haqiqatan ishlatiladi: turli urug' — turli naqshlar
  const first = new Set(SEEDS(40).map(seed => {
    const g = IQ.games.create(ID, seed, 5);
    g.press('start', 0); g.tick(600);
    return litCells(g.view()).join(',');
  }));
  assert.ok(first.size >= 30, 'naqshlar kam xilma-xil: ' + first.size);
});

// ── (d) Mahoratni ajratish ─────────────────────────────────────────────

test('(d) mukammal o\'yinchi yuqori ball oladi va darajasi oshadi; tasodifiy bosuvchi — past', () => {
  const seeds = SEEDS(25);
  for (const L of [1, 3, 5, 7, 9, 10]) {
    let perfectSum = 0, randomSum = 0;
    for (const seed of seeds) {
      const p = checkResult(drive(seed, L, perfectBot()).result(), L);
      assert.equal(p.correct, 10, 'mukammal o\'yinchi hamma raundni yutadi');
      assert.ok(p.points >= 100, 'mukammal: ' + p.points + ' (daraja ' + L + ')');
      if (L < 10) assert.ok(p.nextLevel > L, 'mukammal o\'yinchi darajasi oshmadi: ' + L + ' → ' + p.nextLevel);
      else assert.equal(p.nextLevel, 10);
      perfectSum += p.points;
      const r = checkResult(drive(seed, L, randomBot(seed)).result(), L);
      assert.ok(r.nextLevel <= L, 'tasodifiy bosuvchi darajasi oshdi: ' + L + ' → ' + r.nextLevel);
      assert.ok(r.points <= 15, 'tasodifiy: ' + r.points);
      randomSum += r.points;
    }
    assert.ok(perfectSum / seeds.length >= 105, 'mukammal o\'rtacha: ' + perfectSum / seeds.length);
    assert.ok(randomSum / seeds.length <= 3, 'tasodifiy o\'rtacha: ' + randomSum / seeds.length);
  }
});

test('(d) "oddiy o\'yinchi" (6 katakgacha eslaydi) o\'z darajasida 30–150 ball oladi', () => {
  for (const L of [2, 3, 4, 5]) {
    let sum = 0;
    const seeds = SEEDS(40);
    for (const seed of seeds) sum += checkResult(drive(seed, L, normalBot(seed)).result(), L).points;
    const avg = sum / seeds.length;
    assert.ok(avg >= 30 && avg <= 150, 'daraja ' + L + ': o\'rtacha ' + avg);
  }
});

test('(d) nextLevel: mukammal o\'yinchi bir necha o\'yinda yuqori darajaga chiqadi, chegaralardan chiqmaydi', () => {
  let L = 1;
  const path = [L];
  for (let i = 0; i < 5; i++) { L = drive(7 + i, L, perfectBot()).result().nextLevel; path.push(L); }
  assert.deepEqual(path, [1, 4, 7, 10, 10, 10]);
  L = 10;
  for (let i = 0; i < 6; i++) L = drive(7 + i, L, randomBot(i)).result().nextLevel;
  assert.equal(L, 4, 'tasodifiy bosuvchi har o\'yinda bir daraja tushadi');
});

// ── (e) Avtokliker ─────────────────────────────────────────────────────

test('(e) javobni biladigan, lekin < 120 ms da bosadigan bot ball OLMAYDI (raundlarni yutsa ham)', () => {
  for (const seed of SEEDS(30)) {
    const L = 1 + seed % 10;
    for (const gap of [0, 30, 60, 119]) {
      const r = checkResult(drive(seed, L, perfectBot(gap)).result(), L);
      assert.equal(r.points, 0, 'gap ' + gap + ' ms: ' + r.points);
      assert.ok(r.correct > 0, 'o\'yin jarayoni o\'zgarmaydi — faqat ball olinmaydi');
    }
    const s = checkResult(drive(seed, L, spamBot(30)).result(), L);
    assert.equal(s.points, 0, 'spam avtokliker: ' + s.points);
  }
});

test('(e) chegara aniq 120 ms: 120 ms oraliq — to\'liq ball, 119 ms — nol', () => {
  const seed = 77, L = 3;
  const ok = drive(seed, L, perfectBot(120)).result();
  const bad = drive(seed, L, perfectBot(119)).result();
  assert.ok(ok.points >= 100, '120 ms: ' + ok.points);
  assert.equal(bad.points, 0);
  assert.equal(ok.correct, bad.correct);
});

test('(e) bitta shubhali raund faqat O\'ZINING ballini oladi', () => {
  const seed = 1234, L = 2;
  const clean = plain(drive(seed, L, perfectBot()).result());
  // 3-raundda (K = 5) uchinchi va to'rtinchi bosish orasi 50 ms
  const bot = perfectBot();
  let round = 0, wasInput = false;
  const g = drive(seed, L, (g, v, t, st) => {
    if (v.phase === 'input' && !wasInput) round++;
    wasInput = v.phase === 'input';
    if (round === 3 && v.phase === 'input' && st.queue && st.queue.length === 3 && t >= st.next) {
      tapAt(g, st.queue.shift(), t); st.next = t + 50; st.wake = st.next; return;
    }
    bot(g, v, t, st);
  });
  const r = plain(g.result());
  assert.equal(r.correct, clean.correct);
  assert.equal(r.points, clean.points - (5 + 5), 'faqat 3-raund (K=5) balli olinadi');
});
