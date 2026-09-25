/* ─────────────────────────────────────────────────────────────────────────
   src/games/sequence.js — "Ketma-ketlik" (Simon / Corsi) o'yini

   NIMA TEKSHIRILADI VA NIMA UCHUN:
     · o'yin hech qachon buzuq ko'rinish bermaydi (fuzz) — ilova bitta
       umumiy ekranda chizadi, buzuq GameView = qotgan ekran;
     · REPLAY (§10): server ballni faqat jurnal bo'yicha qayta o'ynab
       tekshiradi — natija ham, jurnal ham aynan bir xil chiqishi shart;
     · determinizm (IQ.rng, vaqt faqat `now` dan);
     · ketma-ketlik haqiqatan Simon kabi uzayadi, 'show' da bosish
       hisoblanmaydi, jimlik — xato, 2 imkoniyat;
     · ball mahoratni ajratadi: mukammal bot yuqori, tasodifiy — 0,
       avtokliker (< 120 ms) — 0.

   Botlar faqat view() ni o'qiydi — xuddi odam ekranni ko'rgani kabi.

   Ishga tushirish:  node --test tests/game-sequence.test.mjs
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const ID = 'sequence';
const FILE = 'src/games/sequence.js';
const FILES = ['src/iq/rng.js', 'src/iq/index.js', 'src/games/index.js', FILE];
const read = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');

/* Brauzer taqlidi: Math.random yoki soat (Date) chaqirilsa darhol
   yiqiladi; setTimeout umuman yo'q. */
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
const ROUNDS = 8;

const tapAt = (g, i, t) => { g.tick(t); g.tap(i, t); };
const pressAt = (g, id, t) => { g.tick(t); g.press(id, t); };

/* Ilova taqlidi: har `step` ms da tick; bot aniq vaqtni so'rasa
   (st.wake) — o'sha vaqtga sakraladi. clock — qurilma soatini buzish. */
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

const litCell = v => (v.grid ? v.grid.cells.findIndex(c => c.state === 'lit') : -1);

/* Xotirasi mukammal o'yinchi: 'show' da yonish tartibini yozib oladi,
   'input' da `delay` kutib, har `gap` ms da bittadan bosadi. `seen` —
   har 'show' da ko'rilgan ketma-ketliklar (test uchun). */
function perfectBot(gap = 300, delay = 400, seen) {
  return (g, v, t, st) => {
    if (v.phase === 'intro') { pressAt(g, 'start', t); return; }
    if (v.phase === 'show') {
      if (st.prev !== 'show') { st.mem = []; st.lit = -1; }
      const l = litCell(v);
      if (l >= 0 && st.lit < 0) st.mem.push(l);
      st.lit = l;
    } else if (v.phase === 'input') {
      if (st.prev !== 'input') {
        st.queue = st.mem.slice(); st.next = t + delay;
        if (seen) seen.push(st.mem.slice());
      }
      if (st.queue.length && t >= st.next) { tapAt(g, st.queue.shift(), t); st.next = t + gap; }
      st.wake = st.next;
    }
    st.prev = v.phase;
  };
}

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

/* "Oddiy o'yinchi" modeli: `cap` tagacha elementni aniq eslaydi, uzunroq
   ketma-ketlikda bittasini adashtiradi. Faqat ball shkalasi uchun. */
function normalBot(seed, cap = 6) {
  const r = IQ.rng(seed ^ 0x27d4eb2f);
  const perfect = perfectBot(400, 600);
  return (g, v, t, st) => {
    const entering = v.phase === 'input' && st.prev !== 'input';
    perfect(g, v, t, st);
    if (entering && st.queue.length > cap) {
      const n = v.grid.cells.length, k = r.int(st.queue.length);
      st.queue[k] = (st.queue[k] + 1 + r.int(n - 1)) % n;
    }
  };
}

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
  assert.ok(Number.isInteger(r.points) && r.points >= 0 && r.points <= 200, 'points: ' + r.points);
  assert.ok(Number.isInteger(r.nextLevel) && r.nextLevel >= 1 && r.nextLevel <= 10, 'nextLevel: ' + r.nextLevel);
  assert.ok(Math.abs(r.nextLevel - level) <= 3, 'nextLevel sakrashi: ' + level + ' → ' + r.nextLevel);
  assert.ok(r.correct >= 0 && r.correct <= r.total && r.total <= ROUNDS, 'correct/total: ' + r.correct + '/' + r.total);
  assert.ok(r.total - r.correct <= 2, '2 tadan ortiq xato bo\'lmaydi');
  assert.ok(r.durationMs >= 0, 'durationMs: ' + r.durationMs);
  return r;
}

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

const CODE = read(FILE).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
test('kodda soat, Math.random, taymer va transsendent Math yo\'q', () => {
  assert.doesNotMatch(CODE, /Date\s*\.\s*now|new\s+Date|\bDate\s*\(|Math\s*\.\s*random|setTimeout|setInterval|performance\s*\.\s*now/);
  /* log/exp/pow/trig natijasi dvigatellar orasida oxirgi bitda farq
     qilishi mumkin — mijoz va server replay'i bir xil bo'lishi uchun. */
  assert.doesNotMatch(CODE, /Math\s*\.\s*(log|exp|pow|sin|cos|tan|atan|asin|acos|sinh|cosh|tanh|cbrt|hypot|expm1|log1p|log2|log10)\b/);
  assert.doesNotMatch(CODE, /\*\*/);
});

// ── intro va done ──────────────────────────────────────────────────────

test('intro: qoida, "Boshlash" tugmasi; vaqt o\'tsa ham, bosilsa ham boshlanmaydi', () => {
  const g = IQ.games.create(ID, 7, 3);
  g.tick(T0);
  let v = g.view();
  assert.equal(v.phase, 'intro');
  assert.deepEqual(plain(IQ.games.validateView(v)), []);
  assert.equal(v.grid, null);
  assert.deepEqual(plain(v.buttons.map(b => [b.id, b.kind])), [['start', 'primary']]);
  assert.ok(v.prompt.uz.length > 20 && v.prompt.ru.length > 20);
  assert.equal(g.tick(T0 + 3600000), false);
  g.tap(0, T0 + 3600000); g.press('match', T0 + 3600000);
  assert.equal(g.view().phase, 'intro');
  assert.equal(g.log().length, 0);
  g.press('start', T0 + 3600001);
  assert.equal(g.view().phase, 'show');
});

test('done: phase "done", progress 1, tugmalar yo\'q, keyingi bosishlar e\'tiborsiz', () => {
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

// daraja: [boshlang'ich uzunlik, yonish ms, pauza ms, ustunlar] — izohdagi jadval
const LEVEL_TABLE = { 1: [3, 700, 300, 3], 2: [3, 675, 290, 3], 3: [4, 650, 280, 3], 4: [4, 625, 270, 3],
  5: [5, 600, 260, 3], 6: [5, 575, 250, 3], 7: [6, 550, 240, 4], 8: [6, 525, 230, 4], 9: [7, 500, 220, 4], 10: [7, 475, 210, 4] };
test('daraja → boshlang\'ich uzunlik, tezlik va panjara (izohdagi jadval bilan bir xil)', () => {
  for (let L = 1; L <= 10; L++) {
    const [len, on, gap, cols] = LEVEL_TABLE[L];
    const g = IQ.games.create(ID, 50 + L, L);
    g.press('start', 0);
    assert.equal(g.view().hud[0].value, String(len), 'daraja ' + L);
    assert.equal(g.view().grid.cols, cols, 'daraja ' + L);
    g.tick(699); assert.equal(litCell(g.view()), -1, 'daraja ' + L + ': 700 ms pauza');
    g.tick(700); assert.ok(litCell(g.view()) >= 0);
    g.tick(700 + on - 1); assert.ok(litCell(g.view()) >= 0, 'daraja ' + L + ': yonish ' + on);
    g.tick(700 + on); assert.equal(litCell(g.view()), -1);
    g.tick(700 + on + gap - 1); assert.equal(litCell(g.view()), -1, 'daraja ' + L + ': pauza ' + gap);
    g.tick(700 + on + gap); assert.ok(litCell(g.view()) >= 0);
    const end = 700 + len * (on + gap);
    g.tick(end - 1); assert.equal(g.view().phase, 'show');
    g.tick(end); assert.equal(g.view().phase, 'input', 'daraja ' + L);
  }
});

// ── (f) Vaqt ───────────────────────────────────────────────────────────

test('(f) vaqt: kataklar jadval bo\'yicha birma-bir yonadi, keyin input; 5 s jimlik — xato', () => {
  const g = IQ.games.create(ID, 5, 1);
  g.tick(1000);
  g.press('start', 1000);
  const order = [];
  let prev = -1;
  for (let t = 1000; t < 4700; t += 10) {
    g.tick(t);
    const v = g.view();
    assert.equal(v.phase, 'show', 't=' + t);
    const l = litCell(v);
    assert.ok(v.grid.cells.filter(c => c.state === 'lit').length <= 1, 'bir vaqtda bittadan ortiq yonmaydi');
    if (l >= 0 && prev < 0) order.push([t, l]);
    prev = l;
  }
  assert.deepEqual(order.map(x => x[0]), [1700, 2700, 3700], 'yonish vaqtlari');
  g.tick(4700);
  let v = g.view();
  assert.equal(v.phase, 'input');
  assert.equal(litCell(v), -1);
  assert.ok(v.grid.cells.every(c => c.state === 'idle'));
  assert.equal(g.tick(9699), false);
  assert.equal(g.tick(9700), true);
  v = g.view();
  assert.equal(v.phase, 'feedback');
  assert.equal(litCell(v), order[0][1], 'jimlikdan keyin kutilgan katak ko\'rsatiladi');
  assert.equal(v.hud[2].value, '1', 'bitta imkoniyat ketdi');
});

test('(f) tick kech kelsa ham ko\'rsatish ritmi buzilmaydi; soat orqaga surilsa o\'yin qotmaydi', () => {
  const g = IQ.games.create(ID, 5, 1);
  g.press('start', 1000);
  assert.equal(g.tick(1000 + 700 + 1000 + 100), true);    // 2-element yonib turgan payt
  assert.ok(litCell(g.view()) >= 0);
  const back = 2800 - 3600000;                             // soat 1 soat orqaga
  g.tick(back);
  g.tick(back + 1899); assert.equal(g.view().phase, 'show');
  g.tick(back + 1900); assert.equal(g.view().phase, 'input', 'soat orqaga ketganda o\'yin qotmasligi kerak');
  // butun o'yin: 8-soniyada soat orqaga — natija toza o'yindagidek, replay mos
  const seed = 99, L = 3;
  const clean = plain(drive(seed, L, perfectBot()).result());
  const g2 = drive(seed, L, perfectBot(), 50, t => (t < T0 + 8000 ? t : t - 3600000));
  const r2 = checkResult(g2.result(), L);
  assert.equal(r2.points, clean.points);
  assert.ok(Math.abs(r2.durationMs - clean.durationMs) <= 100);
  const log = plain(g2.log());
  for (let i = 1; i < log.length; i++) assert.ok(log[i].t >= log[i - 1].t, 'jurnal vaqti o\'sib borishi kerak');
  assertReplay(g2, seed, L);
});

test('show paytida bosish hisoblanmaydi', () => {
  const g = IQ.games.create(ID, 21, 1);
  g.press('start', 0);
  const order = [];
  let prev = -1;
  for (let t = 0; t < 3700; t += 50) {
    g.tick(t);
    const l = litCell(g.view());
    if (l >= 0 && prev < 0) { order.push(l); tapAt(g, l, t + 20); }   // ko'rib turib bosadi
    prev = l;
  }
  const v0 = g.view();
  assert.equal(v0.phase, 'show');
  assert.ok(v0.grid.cells.every(c => c.state !== 'ok' && c.state !== 'bad'));
  g.tick(3700);
  const v = g.view();
  assert.equal(v.phase, 'input');
  assert.match(v.prompt.uz, /0\/3/, 'show dagi bosishlar hisobga o\'tmaydi');
  // jim tursa — xato
  g.tick(3700 + 5000);
  assert.equal(g.view().phase, 'feedback');
  assert.equal(plain(g.result()).correct, 0);
  assert.equal(plain(g.result()).points, 0);
});

// ── Qoidalar ───────────────────────────────────────────────────────────

test('Simon: yutilgan raunddan keyin eski ketma-ketlik + bitta yangi; xatodan keyin — yangi, shu uzunlikda', () => {
  const seen = [];
  const g = drive(314, 1, perfectBot(300, 400, seen));
  assert.equal(seen.length, ROUNDS);
  for (let i = 1; i < seen.length; i++) {
    assert.equal(seen[i].length, seen[i - 1].length + 1);
    assert.deepEqual(seen[i].slice(0, -1), seen[i - 1], 'prefiks saqlanadi');
  }
  assert.equal(plain(g.result()).score, 10);
  // xatodan keyin: uzunlik o'zgarmaydi, ketma-ketlik yangi
  const h = IQ.games.create(ID, 314, 1);
  h.press('start', 0);
  h.tick(4700);
  const first = seen[0];
  tapAt(h, (first[0] + 1) % 9, 5000);                    // ataylab xato
  const fb = h.view();
  assert.equal(fb.phase, 'feedback');
  assert.equal(fb.grid.cells[(first[0] + 1) % 9].state, 'bad');
  assert.equal(fb.grid.cells[first[0]].state, 'lit', 'to\'g\'ri katak ko\'rsatiladi');
  assert.equal(h.view().hud[2].value, '1');
  h.tick(5000 + 1400);
  assert.equal(h.view().phase, 'show');
  assert.equal(h.view().hud[0].value, '3', 'xatodan keyin uzunlik o\'zgarmaydi');
  const again = [];
  let prev = -1;
  for (let t = 6400; t < 6400 + 3700; t += 50) {
    h.tick(t);
    const l = litCell(h.view());
    if (l >= 0 && prev < 0) again.push(l);
    prev = l;
  }
  assert.equal(again.length, 3);
  assert.notDeepEqual(again, first, 'xatodan keyin boshqa ketma-ketlik');
});

test('ketma-ketlikda bir katak hech qachon ketma-ket ikki marta kelmaydi (sakrash himoyasi shunga tayanadi)', () => {
  for (const seed of SEEDS(150)) {
    const seen = [];
    drive(seed, 1 + seed % 10, perfectBot(300, 400, seen));
    for (const s of seen) for (let i = 1; i < s.length; i++) assert.notEqual(s[i], s[i - 1], 'seed ' + seed + ': ' + s);
  }
});

test('barmoq sakrashi: bir katakni < 120 ms ichida qayta bosish e\'tiborsiz, ball ham saqlanadi', () => {
  const seed = 2024, L = 1;
  const clean = plain(drive(seed, L, perfectBot()).result());
  const bot = perfectBot();
  const g = drive(seed, L, (g, v, t, st) => {
    const before = st.queue ? st.queue.length : -1;
    bot(g, v, t, st);
    // har to'g'ri bosishdan 40 ms keyin xuddi shu katak yana bosiladi
    if (v.phase === 'input' && st.queue && st.queue.length === before - 1) {
      const last = st.mem[st.mem.length - st.queue.length - 1];
      tapAt(g, last, t + 40);
    }
  });
  const r = plain(g.result());
  assert.equal(r.correct, clean.correct);
  assert.equal(r.points, clean.points);
});

test('yaroqsiz katak va noma\'lum tugma e\'tiborsiz: jurnalga ham tushmaydi', () => {
  const g = IQ.games.create(ID, 8, 1);
  g.press('start', 0); g.tick(4700);
  assert.equal(g.view().phase, 'input');
  const before = JSON.stringify(g.view()), len = g.log().length;
  let t = 4800;
  for (const i of [-1, 9, 16, 1.5, '2', NaN, null, undefined, Infinity]) { tapAt(g, i, t); t += 300; }
  for (const id of ['match', 'x', '', null, 'start']) { pressAt(g, id, t); t += 300; }
  assert.equal(JSON.stringify(g.view()), before);
  assert.equal(g.log().length, len);
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
  assert.deepEqual([...phases].sort(), ['done', 'feedback', 'input', 'intro', 'show']);
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
    assert.equal(r.total, 2, '2 imkoniyat');
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

test('(b) replay: jurnal ixcham (har tick emas), soxta jurnal boshqa natija beradi', () => {
  const seed = 424242, level = 4;
  const g = drive(seed, level, perfectBot(), 17);
  const log = plain(g.log());
  assert.ok(log.length < 600, 'jurnal har tick\'ni yozmasligi kerak: ' + log.length);
  assert.ok(plain(g.result()).points > 0);
  const forged = log.map(e => (e.k === 'tap' ? { t: e.t, k: e.k, v: (e.v + 1) % 9 } : e));
  assert.notDeepEqual(plain(IQ.games.replay(ID, seed, level, forged).result()), plain(g.result()));
  assert.notDeepEqual(plain(IQ.games.replay(ID, seed + 1, level, log).result()), plain(g.result()));
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
  const firsts = new Set(SEEDS(40).map(seed => {
    const seen = [];
    drive(seed, 5, perfectBot(300, 400, seen));
    return seen[0].join(',');
  }));
  assert.ok(firsts.size >= 35, 'ketma-ketliklar kam xilma-xil: ' + firsts.size);
});

// ── (d) Mahoratni ajratish ─────────────────────────────────────────────

test('(d) mukammal o\'yinchi yuqori ball oladi va darajasi oshadi; tasodifiy bosuvchi — 0', () => {
  const seeds = SEEDS(20);
  for (const L of [1, 3, 5, 7, 9, 10]) {
    for (const seed of seeds) {
      const p = checkResult(drive(seed, L, perfectBot()).result(), L);
      assert.equal(p.correct, ROUNDS, 'mukammal o\'yinchi hamma raundni yutadi');
      assert.equal(p.score, LEVEL_TABLE[L][0] + ROUNDS - 1, 'eng uzun ketma-ketlik');
      assert.ok(p.points >= 130, 'mukammal: ' + p.points + ' (daraja ' + L + ')');
      if (L < 10) assert.ok(p.nextLevel > L, 'mukammal o\'yinchi darajasi oshmadi: ' + L + ' → ' + p.nextLevel);
      const r = checkResult(drive(seed, L, randomBot(seed)).result(), L);
      assert.equal(r.points, 0, 'tasodifiy: ' + r.points);
      assert.ok(r.nextLevel <= L, 'tasodifiy bosuvchi darajasi oshdi: ' + L + ' → ' + r.nextLevel);
    }
  }
});

test('(d) "oddiy o\'yinchi" (6 tagacha eslaydi) o\'z darajasida 30–150 ball oladi', () => {
  for (const L of [1, 2, 3, 4, 5, 6]) {
    let sum = 0;
    const seeds = SEEDS(30);
    for (const seed of seeds) sum += checkResult(drive(seed, L, normalBot(seed)).result(), L).points;
    const avg = sum / seeds.length;
    assert.ok(avg >= 30 && avg <= 150, 'daraja ' + L + ': o\'rtacha ' + avg);
  }
});

test('(d) nextLevel: mukammal o\'yinchi bir necha o\'yinda yuqoriga chiqadi; oddiy o\'yinchi o\'z darajasida to\'xtaydi', () => {
  let L = 1;
  const path = [L];
  for (let i = 0; i < 5; i++) { L = drive(7 + i, L, perfectBot()).result().nextLevel; path.push(L); }
  assert.deepEqual(path, [1, 4, 7, 10, 10, 10]);
  // 6 tagacha eslaydigan o'yinchi: boshlang'ich uzunlik 5 (eng uzun − 1) bo'lgan darajada qoladi
  L = 1;
  for (let i = 0; i < 6; i++) L = drive(40 + i, L, normalBot(i)).result().nextLevel;
  assert.equal(L, 6);
  L = 10;
  for (let i = 0; i < 6; i++) L = drive(7 + i, L, randomBot(i)).result().nextLevel;
  assert.equal(L, 4);
});

// ── (e) Avtokliker ─────────────────────────────────────────────────────

test('(e) javobni biladigan, lekin < 120 ms da bosadigan bot ball OLMAYDI', () => {
  for (const seed of SEEDS(30)) {
    const L = 1 + seed % 10;
    for (const gap of [0, 30, 60, 119]) {
      const r = checkResult(drive(seed, L, perfectBot(gap)).result(), L);
      assert.equal(r.points, 0, 'gap ' + gap + ' ms: ' + r.points);
      assert.ok(r.correct > 0, 'o\'yin jarayoni o\'zgarmaydi — faqat ball olinmaydi');
    }
    assert.equal(checkResult(drive(seed, L, spamBot(30)).result(), L).points, 0, 'spam avtokliker');
  }
});

test('(e) chegara aniq 120 ms: 120 ms oraliq — to\'liq ball, 119 ms — nol', () => {
  const ok = drive(77, 3, perfectBot(120)).result();
  const bad = drive(77, 3, perfectBot(119)).result();
  assert.equal(ok.points, 140);
  assert.equal(bad.points, 0);
  assert.equal(ok.correct, bad.correct);
});

test('(e) bitta shubhali raund faqat O\'ZINING ballini oladi', () => {
  const seed = 1234, L = 1;
  const clean = plain(drive(seed, L, perfectBot()).result());
  const bot = perfectBot();
  let round = 0;
  const g = drive(seed, L, (g, v, t, st) => {
    if (v.phase === 'input' && st.prev !== 'input') round++;
    if (round === 3 && v.phase === 'input' && st.prev === 'input' && st.queue.length === 2 && t >= st.next) {
      tapAt(g, st.queue.shift(), t); st.next = t + 50; st.wake = st.next; return;
    }
    bot(g, v, t, st);
  });
  const r = plain(g.result());
  assert.equal(r.correct, clean.correct);
  assert.equal(r.points, clean.points - (5 + 10), 'faqat 3-raund (uzunlik 5) balli olinadi');
});
