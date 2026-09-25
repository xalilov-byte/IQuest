/* ─────────────────────────────────────────────────────────────────────────
   tests/game-mental-math.test.mjs — Ogʻzaki hisob o'yini (src/games/mental-math.js)

   NIMA TEKSHIRILADI:
     · har misolda ANIQ BITTA to'g'ri variant: misol ekrandagi matndan
       MUSTAQIL hisoblanadi (o'z tahlilchimiz, amallar tartibi bilan),
       variantlar har xil butun son, bo'lish qoldiqsiz, 1–7 darajada
       manfiy son yo'q; to'g'ri javob o'rni tekis taqsimlangan;
     · minglab tasodifiy ketma-ketlikda validateView doim bo'sh;
     · deterministik; replay aynan; natija tick chastotasiga bog'liq emas;
     · ideal bot — yuqori ball, tasodifiy bosuvchi — 0, tezlik-bot — 0;
     · daraja oshgani sari misollar qiyinlashadi; raund 60 s / 40 javob;
     · uz/ru/en matnlar (ʻ, ʼ, «»), ko'rsatma 2 qatorga sig'adi; 2×2
       panjara va display hamma fazada;
     · pauza: 60 s to'xtaydi, ko'rinib turgan misol almashadi (pauzada
       o'ylab olish foyda bermaydi), pauzali jurnal replay'da aynan.

   Fayllar node:vm ichida yuklanadi; muhitda Math.random va Date.now
   chaqirilsa — xato otadi.
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const FILES = ['src/iq/rng.js', 'src/games/index.js', 'src/games/mental-math.js'];
const SRC = FILES.map(f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8'));

function realm() {
  const ctx = {};
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext("Math.random = () => { throw new Error('Math.random taqiqlangan'); };" +
                  "Date.now = () => { throw new Error('Date.now taqiqlangan'); };", ctx);
  FILES.forEach((f, i) => vm.runInContext(SRC[i], ctx, { filename: f }));
  return ctx.IQ;
}

const plain = x => JSON.parse(JSON.stringify(x));
const IQ = realm();
const ID = 'mental-math';
const G = IQ.games.get(ID);
const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const seedOf = s => (Math.imul(s + 1, 2654435761) >>> 0);
const pmax = L => 60 + 9 * L;
const LIMIT = 60000, MAXQ = 40;

function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── Mustaqil misol tahlilchisi ──────────────────────────────────────────
   Grammatika: expr = term (('+'|'−') term)*; term = atom (('×'|'÷') atom)*;
   atom = son | '(' expr ')'. Bo'lish qoldiqli bo'lsa — xato otadi.
   Bir vaqtda "elementar qadamlar" narxini hisoblaydi (qiyinlik o'lchovi):
     · qo'shish/ayirish: xonalar soni + o'tishlar (carry/borrow);
       manfiy natijaga o'tish +1;
     · ko'paytirish: har nolmas raqamlar juftligi 2 (jadvaldan eslash),
       bir nechta qism ko'paytma bo'lsa — ularni qo'shish (natija xonalari);
     · bo'lish: teskari ko'paytirish narxi + 1. */
const dg = x => String(Math.abs(x)).length;
const digitsOf = x => String(Math.abs(x)).split('').reverse().map(Number);
function addCost(a, b, op) {
  let x = Math.abs(a), y = Math.abs(b), carry = 0, carries = 0;
  const cols = Math.max(dg(x), dg(y));
  const same = (op === '+') === ((a < 0) === (b < 0));
  if (!same && y > x) [x, y] = [y, x];
  const X = digitsOf(x), Y = digitsOf(y);
  for (let i = 0; i < cols; i++) {
    const s = same ? (X[i] || 0) + (Y[i] || 0) + carry : (X[i] || 0) - (Y[i] || 0) - carry;
    carry = same ? (s >= 10 ? 1 : 0) : (s < 0 ? 1 : 0);
    carries += carry;
  }
  return cols + carries;
}
function mulCost(a, b) {
  const pp = digitsOf(a).filter(Boolean).length * digitsOf(b).filter(Boolean).length;
  return 2 * pp + (pp > 1 ? dg(a * b) : 0);
}
function evaluate(src) {
  const s = src.replace(/−/g, '-');
  let i = 0, cost = 0;
  const ws = () => { while (s[i] === ' ') i++; };
  const num = () => {
    ws(); const j = i;
    while (s[i] >= '0' && s[i] <= '9') i++;
    if (j === i) throw new Error('son kutilgan: ' + src);
    assert.ok(s[j] !== '0' || i - j === 1, 'boshida nol: ' + src);
    return Number(s.slice(j, i));
  };
  const atom = () => {
    ws();
    if (s[i] === '(') { i++; const v = expr(); ws(); if (s[i] !== ')') throw new Error(') yo\'q: ' + src); i++; return v; }
    return num();
  };
  const term = () => {
    let v = atom();
    for (;;) {
      ws();
      if (s[i] === '×') { i++; const b = atom(); cost += mulCost(v, b); v *= b; }
      else if (s[i] === '÷') { i++; const d = atom(); if (d === 0 || v % d !== 0) throw new Error('qoldiqli bo\'lish: ' + src); cost += mulCost(v / d, d) + 1; v /= d; }
      else return v;
    }
  };
  const expr = () => {
    let v = term();
    for (;;) {
      ws();
      if (s[i] === '+' || s[i] === '-') {
        const op = s[i]; i++;
        const b = term(), r = op === '+' ? v + b : v - b;
        cost += addCost(v, b, op) + (r < 0 && v >= 0 ? 1 : 0);
        v = r;
      } else return v;
    }
  };
  const v = expr(); ws();
  if (i !== s.length) throw new Error('ortiqcha belgi: ' + src);
  return { value: v, cost, operands: (src.match(/\d+/g) || []).map(Number) };
}

/* Variant yorlig'i: butun son, manfiy — U+2212 bilan (defis emas). */
function parseLabel(l) {
  assert.match(l, /^−?(0|[1-9]\d*)$/, 'yorliq butun son: ' + l);
  return Number(l.replace('−', '-'));
}

function checkView(g, where) {
  const v = g.view();
  const e = IQ.games.validateView(v, ID);
  if (e.length) assert.fail(where + ': ' + e.join('; ') + ' — ' + JSON.stringify(v).slice(0, 300));
  checkLangs(v, where);
  return v;
}
const check = checkView;

/* ── Tillar, tipografika va pauza (CONTRACT §2, §9; ARXITEKTURA §8) ──── */
const RESUME = 600;                                  // o'yindagi RESUME_MS
const CYR = /[Ѐ-ӿ]/;
function checkText(o, where) {
  for (const k of ['uz', 'ru', 'en']) assert.ok(o && typeof o[k] === 'string' && o[k].trim() !== '', where + ': ' + k);
  assert.ok(!CYR.test(o.en) && !/[ʻʼ«»]/.test(o.en), where + ': en da kirill / ʻ / «»: ' + o.en);
  assert.ok(!/['"‘’]/.test(o.uz), where + ': uz da ʻ/ʼ/«» o\'rniga boshqa belgi: ' + o.uz);
  assert.ok(!/[A-Za-z]{2}/.test(o.ru), where + ': ru da lotin so\'z: ' + o.ru);
}
/* Har ko'rinish: hamma matnda uz/ru/en; ko'rsatma 2 qatorga sig'adi
   (Playwright o'lchovi bilan tanlangan chegara), HUD yorlig'i qisqa. */
function checkLangs(v, where) {
  assert.equal(typeof v.paused, 'boolean', where + ': paused');
  checkText(v.prompt, where + ' prompt');
  for (const k of ['uz', 'ru', 'en']) assert.ok(v.prompt[k].length <= 76, where + ': ko\'rsatma uzun: ' + v.prompt[k]);
  v.hud.forEach((h, i) => {
    checkText(h.label, where + ' hud' + i);
    for (const k of ['uz', 'ru', 'en']) assert.ok(h.label[k].length <= 14, where + ': HUD yorlig\'i uzun: ' + h.label[k]);
  });
  if (v.display && v.display.kind === 'text') checkText(v.display, where + ' display');
  v.buttons.forEach((b, i) => checkText(b.label, where + ' tugma' + i));
}
/* Jurnalga pauza qo'shadi: i-hodisadan keyin (o'sha devor vaqtida)
   'pause', gap ms dan keyin 'resume'; keyingi hodisalar gap + RESUME ga
   suriladi. O'yin vaqti o'zgarmaydi — natija aynan o'sha bo'lishi kerak. */
function withPause(log, i, gap) {
  const P = log[i].t, out = log.slice(0, i + 1);
  out.push({ t: P, k: 'press', v: 'pause' }, { t: P + gap, k: 'press', v: 'resume' });
  for (const e of log.slice(i + 1)) out.push({ t: e.t + gap + RESUME, k: e.k, v: e.v });
  return out;
}
/* Tugagan o'yin jurnaliga 1–3 ta pauza qo'shib replay qiladi: natija va
   jurnal aynan (pauza vaqti o'yinga kirmaydi). `ok(e)` — pauza qo'yiladigan
   hodisa. */
function checkPausedReplay(seed, level, log, res, rs, ok = () => true) {
  const R = prng(rs);
  const idx = log.map((e, i) => i).filter(i => i < log.length - 1 && ok(log[i]));
  if (!idx.length) return;
  const picks = [...new Set([0, 1, 2].slice(0, 1 + Math.floor(R() * 3)).map(() => idx[Math.floor(R() * idx.length)]))].sort((a, b) => b - a);
  let pl = log;
  for (const i of picks) pl = withPause(pl, i, 1000 + Math.floor(R() * 600000));
  const rp = IQ.games.replay(ID, seed, level, JSON.parse(JSON.stringify(pl)));
  assert.deepEqual(plain(rp.result()), plain(res), 'pauzali replay natijasi');
  assert.deepEqual(plain(rp.log()), pl, 'pauzali replay jurnali');
}
function checkRegistered() {
  const G = IQ.games.get(ID);
  checkText(G.title, 'title');
  checkText(G.desc, 'desc');
  assert.deepEqual(plain(G.langs), ['uz', 'ru', 'en']);
  if (IQ.games.langsOf) assert.deepEqual(plain(IQ.games.langsOf(ID)), ['uz', 'ru', 'en']);
}
const BOT_EN = 'Taps too fast — no points awarded';
/* Jonli pauza: intro'da pauza yo'q; o'yin paytida pause → ko'rinish
   ma'lumot bermaydi, faqat "Davom etish"; kutish (10 daqiqa) o'yinni
   tugatmaydi, tick false, bosishlar e'tiborsiz va jurnalga yozilmaydi;
   resume → RESUME ms "Tayyorlaning…" (bosish yana e'tiborsiz), keyin
   o'yin to'xtagan joyidan. `inputs(g, t)` — o'yinning hamma bosishlari. */
function livePause(inputs, { level = 3, warm = 1300 } = {}) {
  const g = IQ.games.create(ID, 7, level);
  assert.equal(g.pause(500), false, 'intro — pauza yo\'q');
  assert.equal(g.resume(600), false);
  assert.equal(g.log().length, 0);
  g.press('start', 1000);
  g.tick(warm);
  const before = JSON.stringify(g.view()), n0 = g.log().length, res0 = JSON.stringify(g.result());
  assert.equal(g.pause(warm), true);
  assert.equal(g.paused, true);
  assert.equal(g.pause(warm + 10), false, 'ikkinchi pauza — yo\'q');
  const v = check(g, 'pauza');
  assert.equal(v.paused, true);
  assert.deepEqual(plain(v.buttons.map(b => b.id)), ['resume']);
  assert.equal(v.prompt.en, 'Paused — the clock is stopped');
  if (v.grid) assert.ok(v.grid.cells.every(c => c.state === 'hidden' && c.label === ''), 'pauzada panjara yashirin');
  const pv = JSON.stringify(v);
  g.tick(warm);                                   // ilova pauzadan keyin bir marta chizadi
  let t = warm;
  for (let s = 0; s < 40; s++) { t += 15000; assert.equal(g.tick(t), false); inputs(g, t); }
  assert.equal(JSON.stringify(g.view()), pv);
  assert.equal(g.log().length, n0 + 1, 'pauzada hech narsa yozilmaydi');
  assert.ok(!g.done, '10 daqiqa pauza o\'yinni tugatmaydi');
  assert.equal(JSON.stringify(g.result()), res0, 'pauza natijani o\'zgartirmaydi');
  assert.equal(g.resume(t), true);
  assert.equal(g.paused, false);
  const rv = check(g, 'tayyorlanish');
  assert.equal(rv.paused, false);
  assert.equal(rv.prompt.en, 'Get ready…');
  assert.deepEqual(plain(rv.buttons), []);
  if (rv.grid) assert.ok(rv.grid.cells.every(c => c.state === 'hidden'));
  inputs(g, t + 100);
  g.tick(t + 200);
  assert.equal(g.log().length, n0 + 2, 'tayyorlanishda bosish e\'tiborsiz');
  assert.equal(g.tick(t + RESUME - 1), false);
  assert.equal(g.tick(t + RESUME), true, 'tayyorlanish tugadi');
  assert.deepEqual(plain(g.log().slice(n0)), [{ t: warm, k: 'press', v: 'pause' }, { t, k: 'press', v: 'resume' }]);
  check(g, 'davom');
  return { g, before, after: JSON.stringify(g.view()), res0, t: t + RESUME };
}

/* Misollarni to'playdi: har birini 300 ms da to'g'ri yechadi (tick'siz,
   faqat kerakli vaqtlarda). */
function collect(seed, L, iq = IQ) {
  const g = iq.games.create(ID, seed, L);
  let t = 1000;
  g.press('start', t);
  const out = [];
  while (!g.done) {
    const v = checkView(g, 'collect');
    assert.equal(v.phase, 'input');
    const text = v.display.uz;
    assert.equal(v.display.ru, text, 'misol ikki tilda bir xil');
    assert.match(text, / = \?$/);
    const expr = text.replace(/ = \?$/, '');
    const e = evaluate(expr);
    const vals = Array.from(v.grid.cells, c => parseLabel(c.label));
    out.push({ expr, vals, ...e });
    t += 300; g.tap(vals.indexOf(e.value), t);
    t += 260; g.tick(t);
  }
  return { g, out };
}

/* "Ilova" kabi o'ynatadi: har step ms da tick; policy(view, t, since) —
   katak raqami yoki null. since — joriy misol ko'ringan (birinchi
   ko'rilgan) vaqt. */
function play(seed, level, policy, { step = 20, start = 5000, iq = IQ } = {}) {
  const g = iq.games.create(ID, seed, level);
  let t = start, key = null, since = 0;
  g.tick(t); checkView(g, 'intro');
  g.press('start', t);
  while (!g.done && t - start < 10 * LIMIT) {
    t += step;
    g.tick(t);
    const v = checkView(g, 'play');
    const k = v.phase + v.display.uz;
    if (k !== key) { key = k; since = t; }
    const a = v.phase === 'input' ? policy(v, t, since) : null;
    if (a !== null && a !== undefined) { g.tap(a, t); checkView(g, 'tap'); key = null; }
  }
  assert.ok(g.done);
  checkView(g, 'done');
  return g;
}

const answerOf = v => Array.from(v.grid.cells, c => parseLabel(c.label)).indexOf(evaluate(v.display.uz.replace(/ = \?$/, '')).value);
const solver = rt => (v, t, since) => (t - since >= rt ? answerOf(v) : null);
function randomTapper(seed, lo, hi) {
  const r = prng(seed);
  let next = 0;
  return (v, t) => { if (t < next) return null; next = t + lo + Math.floor(r() * (hi - lo)); return Math.floor(r() * 4); };
}

function checkResult(r, L) {
  assert.ok(Number.isInteger(r.points) && r.points >= 0 && r.points <= pmax(L), 'points: ' + r.points);
  assert.ok(Number.isInteger(r.score) && r.score >= 0 && r.score <= 100, 'score');
  assert.ok(Number.isInteger(r.correct) && Number.isInteger(r.total) && r.correct <= r.total && r.total <= MAXQ, 'correct ≤ total ≤ 40');
  assert.ok(Number.isFinite(r.durationMs) && r.durationMs >= 0 && r.durationMs <= LIMIT, 'durationMs ≤ 60 s: ' + r.durationMs);
  assert.ok(Number.isInteger(r.nextLevel) && Math.abs(r.nextLevel - L) <= 1 && r.nextLevel >= 1 && r.nextLevel <= 10, 'nextLevel');
}

/* Korpus: har daraja × 120 urug' × 40 misol. */
let corpus = null;
function getCorpus() {
  if (corpus) return corpus;
  corpus = {};
  for (const L of LEVELS) {
    corpus[L] = [];
    for (let s = 0; s < 120; s++) corpus[L].push(...collect(seedOf(s), L).out);
  }
  return corpus;
}

/* ══ TESTLAR ═══════════════════════════════════════════════════════════ */

test('ro\'yxatda: id, skill "speed", nom va tavsif uz/ru', () => {
  assert.ok(G);
  assert.equal(G.skill, 'speed');
  assert.ok(G.title.uz && G.title.ru && G.desc.uz && G.desc.ru);
  assert.ok(IQ.games.list().some(g => g.id === ID));
});

test('manbada Math.random / Date.now / setTimeout yo\'q', () => {
  assert.doesNotMatch(SRC[2], /Math\.random|Date\.now|setTimeout|setInterval|performance\.now/);
});

test('har misolda aniq bitta to\'g\'ri variant, variantlar har xil butun son', () => {
  const C = getCorpus();
  for (const L of LEVELS) {
    assert.equal(C[L].length, 120 * MAXQ);
    for (const p of C[L]) {
      assert.ok(Number.isInteger(p.value), 'javob butun: ' + p.expr);
      assert.equal(p.vals.length, 4);
      assert.equal(p.vals.filter(x => x === p.value).length, 1, 'aniq bitta to\'g\'ri: ' + p.expr + ' → ' + p.vals);
      assert.equal(new Set(p.vals).size, 4, 'variantlar har xil: ' + p.vals);
      assert.deepEqual(p.vals, p.vals.slice().sort((a, b) => a - b), 'o\'sish tartibida');
      assert.ok(Math.abs(p.value) < 1000, 'javob |x| < 1000');
      // distraktor ishonarli: ±12 ichida, ishora xatosi yoki bir xil ishorali va ≤ 4 barobar farq
      for (const x of p.vals) {
        const near = Math.abs(x - p.value) <= 12 || x === -p.value ||
          (x !== 0 && p.value !== 0 && Math.sign(x) === Math.sign(p.value) && Math.max(Math.abs(x), Math.abs(p.value)) <= 4 * Math.min(Math.abs(x), Math.abs(p.value)));
        assert.ok(near, 'bir qarashda chiqib ketadigan distraktor: ' + p.expr + ' → ' + x);
      }
      // kamida bittasi yaqin (±10) — javob "yolg'iz" turmasin
      assert.ok(p.vals.some(x => x !== p.value && Math.abs(x - p.value) <= 10), 'yaqin distraktor yo\'q: ' + p.expr + ' → ' + p.vals);
      if (L <= 7) {
        assert.ok(p.value >= 0 && p.vals.every(x => x >= 0), 'L' + L + ' da manfiy son yo\'q: ' + p.expr + ' ' + p.vals);
      }
    }
  }
});

test('to\'g\'ri javob o\'rni tekis: 4 o\'rinning har biri ≈ 25%', () => {
  const C = getCorpus();
  for (const L of LEVELS) {
    const c = [0, 0, 0, 0];
    for (const p of C[L]) c[p.vals.indexOf(p.value)]++;
    const tol = L === 1 ? 0.08 : 0.04;          // 1-darajada kichik javoblar (1, 2) ostida variant kam
    c.forEach((x, i) => assert.ok(Math.abs(x / C[L].length - 0.25) <= tol, 'L' + L + ' o\'rin ' + i + ': ' + (x / C[L].length).toFixed(3)));
  }
});

test('"o\'rtadagisi to\'g\'ri" naqshi yo\'q: javob hech qachon ikki distraktorning o\'rtasi emas', () => {
  const C = getCorpus();
  for (const L of LEVELS) {
    let ap = 0;
    for (const p of C[L]) {
      const d = p.vals.filter(x => x !== p.value);
      for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
        assert.notEqual(d[i] + d[j], 2 * p.value, 'javob — o\'rta: ' + p.expr + ' → ' + p.vals);
      }
      const a = p.vals;
      if ([[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]].some(([i, j, k]) => a[i] + a[k] === 2 * a[j])) ap++;
    }
    // qolgan progressiyalar (javob chetda) kam — "o'rtadagisi xato" naqshi ham deyarli ishlamaydi
    assert.ok(ap / C[L].length <= (L === 1 ? 0.1 : 0.04), 'L' + L + ' progressiya ulushi ' + (ap / C[L].length).toFixed(3));
  }
});

test('daraja oshgani sari misollar qiyinlashadi', () => {
  const C = getCorpus();
  const mean = L => C[L].reduce((a, p) => a + p.cost, 0) / C[L].length;
  const m = LEVELS.map(mean);
  for (let i = 1; i < m.length; i++) assert.ok(m[i] > m[i - 1], 'o\'rtacha qadamlar L' + (i + 1) + ' ' + m[i].toFixed(2) + ' > L' + i + ' ' + m[i - 1].toFixed(2));
  assert.ok(m[9] > 4 * m[0], 'L10 L1 dan ancha qiyin');
  // manfiy javob faqat 8-darajadan, u yerda esa albatta uchraydi
  for (const L of LEVELS) {
    const neg = C[L].filter(p => p.value < 0).length;
    if (L <= 7) assert.equal(neg, 0); else assert.ok(neg > 0.05 * C[L].length, 'L' + L + ' manfiy javoblar');
  }
  // eng katta javob va operandlar ham o'sadi (1 → 5 → 10)
  const maxAbs = L => Math.max(...C[L].map(p => Math.abs(p.value)));
  assert.ok(maxAbs(1) < maxAbs(5) && maxAbs(5) < maxAbs(10));
  // amallar soni: 1–5 da bitta amal, 6+ da ko'p amalli misollar bor
  const ops = p => (p.expr.match(/[+−×÷]/g) || []).length;
  for (const L of [1, 2, 3, 4, 5]) assert.ok(C[L].every(p => ops(p) === 1));
  for (const L of [6, 8, 10]) assert.ok(C[L].some(p => ops(p) >= 2));
});

test('minglab tasodifiy ketma-ketlik: validateView doim bo\'sh, progress kamaymaydi, replay aynan', () => {
  const r = prng(4242);
  const WEIRD_TAPS = [-1, 4, 1.5, '2', null, undefined, NaN];
  const WEIRD_T = [NaN, undefined, -Infinity, Infinity];
  let finished = 0, pausedSeen = 0;
  for (let seq = 0; seq < 2000; seq++) {
    const L = 1 + (seq % 10), seed = seedOf(seq * 13 + 5);
    const g = IQ.games.create(ID, seed, L);
    let t = Math.floor(r() * 1e9), prog = 0;
    const n = 30 + Math.floor(r() * 150);
    for (let e = 0; e < n; e++) {
      const y = r();
      if (y < 0.2) { /* o'sha vaqt */ } else if (y < 0.5) t += Math.floor(r() * 300);
      else if (y < 0.85) t += Math.floor(r() * 3000);
      else if (y < 0.95) t += Math.floor(r() * 30000);
      else t -= Math.floor(r() * 800);
      const tt = r() < 0.03 ? WEIRD_T[Math.floor(r() * WEIRD_T.length)] : t;
      const x = r();
      if (x < 0.3) {
        const before = JSON.stringify(g.view());
        if (!g.tick(tt)) assert.equal(JSON.stringify(g.view()), before, 'tick false — ko\'rinish o\'zgarmasligi kerak');
      } else if (x < 0.4) g.press(r() < 0.6 ? 'start' : ['x', 'left', null, 'pause', 'resume', 'resume'][Math.floor(r() * 6)], tt);
      else {
        const v = g.view();
        if (v.phase === 'input' && / = \?$/.test(v.display.uz) && r() < 0.5) g.tap(answerOf(v), tt);
        else g.tap(r() < 0.1 ? WEIRD_TAPS[Math.floor(r() * WEIRD_TAPS.length)] : Math.floor(r() * 4), tt);
      }
      const v = g.view();
      const errs = IQ.games.validateView(v, ID);
      if (errs.length) assert.fail('seq ' + seq + ' e ' + e + ': ' + errs.join('; '));
      if (e % 4 === 0) checkLangs(v, 'seq ' + seq);
      if (v.paused) pausedSeen++;
      assert.ok(v.grid && v.grid.cols === 2 && v.grid.cells.length === 4, '2×2 panjara hamma fazada');
      assert.equal(v.display.kind, 'text');
      assert.ok(v.progress >= prog - 1e-12, 'progress kamaymaydi');
      prog = v.progress;
      if (e % 16 === 0) assert.equal(JSON.stringify(g.view()), JSON.stringify(v), 'view() holatni o\'zgartirmaydi');
    }
    if (g.done) finished++;
    const res = plain(g.result());
    checkResult(res, L);
    const log = JSON.parse(JSON.stringify(g.log()));
    const rp = IQ.games.replay(ID, seed, L, log);
    assert.deepEqual(plain(rp.result()), res, 'replay natijasi — seq ' + seq);
    assert.deepEqual(plain(rp.log()), log, 'replay jurnali — seq ' + seq);
    assert.equal(rp.done, g.done);
  }
  assert.ok(finished > 500, 'ko\'p ketma-ketlik oxirigacha yetdi: ' + finished);
  assert.ok(pausedSeen > 100, 'pauza uchradi: ' + pausedSeen);
});

test('deterministik: ikki alohida muhitda bir xil urug\' → bir xil misollar va natija', () => {
  const IQ2 = realm();
  for (const L of [1, 6, 10]) {
    const a = collect(777, L), b = collect(777, L, IQ2);
    assert.deepEqual(plain(a.out), plain(b.out));
    assert.deepEqual(plain(a.g.result()), plain(b.g.result()));
    assert.deepEqual(plain(a.g.log()), plain(b.g.log()));
    assert.notDeepEqual(plain(collect(778, L).out), plain(a.out), 'boshqa urug\' — boshqa misollar');
  }
});

test('replay: bot o\'yinlari aynan qayta chiqadi; natija tick chastotasiga bog\'liq emas', () => {
  for (const L of LEVELS) {
    const runs = [
      { seed: seedOf(L), g: play(seedOf(L), L, solver(600)) },
      { seed: seedOf(L + 20), g: play(seedOf(L + 20), L, randomTapper(L, 300, 2000), { step: 50 }) },
      { seed: seedOf(L + 40), g: play(seedOf(L + 40), L, (() => {
        const s = solver(1500), rr = randomTapper(L + 3, 0, 1);
        let n = 0;
        return (v, t, since) => { const a = s(v, t, since); return a === null ? null : (++n % 5 === 0 ? rr(v, t) : a); };
      })()) },
    ];
    runs.forEach(({ seed, g }, j) => {
      const log = JSON.parse(JSON.stringify(g.log()));
      const rp = IQ.games.replay(ID, seed, L, log);
      assert.deepEqual(plain(rp.result()), plain(g.result()));
      assert.deepEqual(plain(rp.log()), log);
      assert.ok(rp.done);
      // javobdan keyin (feedback) pauza — misol almashmaydi, natija aynan
      checkPausedReplay(seed, L, log, g.result(), L * 3 + j, e => e.k === 'tap');
    });
    const g = runs[2].g, inputs = g.log().filter(e => e.k !== 'tick');
    const h = IQ.games.create(ID, seedOf(L + 40), L);
    for (const e of inputs) (e.k === 'tap' ? h.tap(e.v, e.t) : h.press(e.v, e.t));
    h.tick(inputs[inputs.length - 1].t + 10 * LIMIT);
    assert.deepEqual(plain(h.result()), plain(g.result()), 'tick\'siz — L' + L);
  }
});

test('ideal bot: har darajada yuqori ball, daraja oshadi, 40 javobda tugaydi', () => {
  for (const L of LEVELS) {
    const r = play(seedOf(100 + L), L, solver(500)).result();
    checkResult(r, L);
    assert.equal(r.correct, MAXQ);
    assert.equal(r.total, MAXQ);
    assert.equal(r.score, 100);
    assert.equal(r.points, pmax(L));
    assert.equal(r.nextLevel, Math.min(10, L + 1));
    assert.ok(r.durationMs < LIMIT);
  }
});

test('odamga o\'xshash o\'yin — ball 30..150; sust o\'yinchi pastroq', () => {
  const RT = [0, 2000, 2200, 2600, 3000, 3200, 4000, 4500, 5000, 6000, 7000];
  for (const L of LEVELS) {
    const r = play(seedOf(200 + L), L, solver(RT[L])).result();
    assert.ok(r.points >= 30 && r.points <= 150, 'L' + L + ': ' + r.points);
    const slow = play(seedOf(200 + L), L, solver(RT[L] * 2.5)).result();
    assert.ok(slow.points < r.points, 'sust L' + L + ': ' + slow.points);
    assert.ok(slow.nextLevel <= L);
  }
});

test('tasodifiy bosuvchi: 0 ga yaqin ball, daraja oshmaydi', () => {
  let sum = 0, n = 0;
  for (const L of LEVELS) {
    for (let s = 0; s < 10; s++) {
      const r = play(seedOf(300 + s), L, randomTapper(s * 17 + L, 300, 1500), { step: 50 }).result();
      checkResult(r, L);
      assert.ok(r.points <= 15, 'L' + L + ' points ' + r.points);
      assert.ok(r.nextLevel <= L);
      sum += r.points; n++;
    }
  }
  assert.ok(sum / n <= 2, 'o\'rtacha ' + sum / n);
});

test('tezlik-bot: 250 ms dan tez javob yoki < 120 ms oraliq — 0 ball', () => {
  for (const L of LEVELS) {
    for (const rt of [0, 60, 150, 240]) {
      const r = play(seedOf(400 + L), L, solver(rt), { step: 10 }).result();
      assert.equal(r.points, 0, 'L' + L + ' rt ' + rt);
      assert.equal(r.flagged, true);
      assert.equal(r.nextLevel, L);
    }
    // 300 ms — juda tez, lekin imkonsiz deb hisoblanmaydi
    assert.equal(play(seedOf(400 + L), L, solver(300), { step: 10 }).result().points, pmax(L));
  }
});

test('bitta-yarimta shubhali bosish (qo\'sh bosish) odamni jazolamaydi', () => {
  const L = 4, g = IQ.games.create(ID, 31337, L);
  let t = 0;
  g.press('start', t);
  for (let q = 0; q < 30 && !g.done; q++) {
    g.tick(t);
    t += 1200;
    const a = answerOf(g.view());
    g.tap(a, t);
    if (q % 8 === 3) g.tap(a, t + 50);                // feedback paytida qo'sh bosish — e'tiborsiz
    t += 300;
  }
  g.tick(t + LIMIT);
  const r = g.result();
  assert.ok(r.points > 0.9 * pmax(L), 'points ' + r.points);
});

test('feedback: xato — tanlangan \'bad\', to\'g\'risi \'ok\', 0,7 s; to\'g\'ri — 0,25 s; feedback paytida bosish e\'tiborsiz', () => {
  const g = IQ.games.create(ID, 5, 3);
  g.press('start', 0);
  let v = g.view();
  const right = answerOf(v), wrong = (right + 1) % 4;
  g.tap(wrong, 1000);
  v = g.view();
  assert.equal(v.phase, 'feedback');
  assert.equal(v.grid.cells[wrong].state, 'bad');
  assert.equal(v.grid.cells[right].state, 'ok');
  assert.ok(!v.display.uz.includes('?'), 'javob ko\'rsatiladi');
  g.tap(right, 1300);                                   // e'tiborsiz
  assert.equal(g.result().correct, 0);
  assert.equal(g.tick(1650), true);
  assert.equal(g.view().phase, 'feedback', '0,7 s tugamagan');
  g.tick(1700);
  v = g.view();
  assert.equal(v.phase, 'input');
  g.tap(answerOf(v), 3000);
  assert.equal(g.view().grid.cells[answerOf(v)].state, 'ok');
  g.tick(3249); assert.equal(g.view().phase, 'feedback');
  g.tick(3250); assert.equal(g.view().phase, 'input');
  const r = g.result();
  assert.equal(r.correct, 1); assert.equal(r.total, 2);
});

test('juda tez to\'g\'ri javob (< 250 ms) to\'g\'ri deb sanalmaydi', () => {
  const g = IQ.games.create(ID, 8, 2);
  g.press('start', 0);
  g.tap(answerOf(g.view()), 100);
  const r = g.result();
  assert.equal(r.correct, 0);
  assert.equal(r.total, 1);
});

test('raund chegaralangan: hech bosmasa aynan 60 s da tugaydi', () => {
  for (const L of LEVELS) {
    const g = play(seedOf(500 + L), L, () => null, { step: 100 });
    const r = g.result();
    assert.equal(r.durationMs, LIMIT);
    assert.equal(r.total, 0);
    assert.equal(r.points, 0);
    assert.equal(r.nextLevel, Math.max(1, L - 1));
  }
});

test('intro va done: start tugmasi, done da tugma va katak yo\'q, progress 0 → 1', () => {
  const g = IQ.games.create(ID, 1, 3);
  const v0 = g.view();
  assert.equal(v0.phase, 'intro');
  assert.equal(v0.progress, 0);
  assert.deepEqual(plain(v0.buttons.map(b => b.id)), ['start']);
  g.tap(0, 10);
  assert.equal(g.view().phase, 'intro');
  assert.deepEqual(plain(g.log()), []);
  assert.deepEqual(plain(g.result()), { score: 0, points: 0, correct: 0, total: 0, durationMs: 0, nextLevel: 3, flagged: false });
  const d = play(1, 3, solver(500)).view();
  assert.equal(d.phase, 'done');
  assert.equal(d.progress, 1);
  assert.deepEqual(plain(d.buttons), []);
  assert.ok(d.grid.cells.every(c => c.state === 'disabled'));
  assert.equal(d.display.en, 'Net score: 40 (right − wrong)');
});

test('matnlar: uz/ru/en, langs; bot sababi yakun matnida', () => {
  checkRegistered();
  assert.equal(G.title.uz, 'Ogʻzaki hisob');
  const v = play(seedOf(401), 1, solver(0), { step: 10 }).view();
  assert.equal(v.display.en, BOT_EN);
});

test('intro: HUD (Vaqt 1:00 · 0 · 0), 2×2 panjara va display o\'yindagi bilan bir xil shaklda', () => {
  for (const L of LEVELS) {
    const g = IQ.games.create(ID, L, L);
    const a = checkView(g, 'intro');
    assert.deepEqual(plain(a.hud.map(h => h.value)), ['1:00', '0', '0']);
    assert.ok(!a.hud.some(h => h.label.uz === 'Daraja'));
    assert.ok(a.grid.cols === 2 && a.grid.cells.length === 4 && a.grid.cells.every(c => c.state === 'disabled' && c.label === ''));
    assert.equal(a.display.kind, 'text');
    assert.match(a.display.uz, /«yeydi»/);
    g.press('start', 0);
    const b = checkView(g, 'input');
    assert.deepEqual(plain(a.hud.map(h => h.label)), plain(b.hud.map(h => h.label)));
  }
});

test('pauza (jonli): 60 s to\'xtaydi, ko\'rinib turgan misol almashadi va hisobga kirmaydi', () => {
  const inputs = (g, t) => { for (let i = 0; i < 4; i++) g.tap(i, t); g.press('start', t); };
  const { before, after, g, t } = livePause(inputs, { warm: 3300 });
  const A = JSON.parse(before), B = JSON.parse(after);
  assert.deepEqual(A.hud, B.hud, 'vaqt va hisob pauza oldidagi joyida');
  assert.notEqual(A.display.uz, B.display.uz, 'yangi misol');
  assert.equal(g.result().total, 0, 'almashgan misol javob hisoblanmaydi');
  // yangi misol "ko'rsatilgan" vaqt — tayyorlanish tugagan payt: 250 ms dan tez javob hisoblanmaydi
  g.tap(answerOf(g.view()), t + 100);
  assert.equal(g.result().correct, 0);
  // ko'p pauza (40 dan ortiq almashtirish) — misollar tugamaydi, ko'rinish yaroqli
  const h = IQ.games.create(ID, 9, 7);
  let tt = 0;
  h.press('start', tt);
  for (let i = 0; i < 60; i++) { tt += 100; h.pause(tt); tt += 5000; h.resume(tt); tt += RESUME; h.tick(tt); checkView(h, 'almashtirish ' + i); }
  assert.ok(!h.done && h.view().hud[0].value === '0:54', '60 × (0,1 s o\'yin + 5 s pauza) — faqat 6 s ketdi: ' + h.view().hud[0].value);
  while (!h.done) { tt += 500; h.tick(tt); const v = h.view(); if (v.phase === 'input') h.tap(answerOf(v), tt); }
  assert.equal(h.result().total, MAXQ, 'almashtirishlardan keyin ham 40 ta javob');
  assert.equal(h.result().correct, MAXQ);
  const rp = IQ.games.replay(ID, 9, 7, plain(h.log()));
  assert.deepEqual(plain(rp.result()), plain(h.result()));
  assert.deepEqual(plain(rp.log()), plain(h.log()));
});
