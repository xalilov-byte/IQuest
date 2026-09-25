/* ─────────────────────────────────────────────────────────────────────────
   src/iq/session.js — test va mashq oqimi (CONTRACT.md §3)

   Haqiqiy generatorlar (matrix, series…) boshqa agentlarda yoziladi va
   hali tayyor bo'lmasligi mumkin. Shuning uchun bu yerda O'Z sinov
   generatorlarimiz IQ.register bilan ro'yxatdan o'tadi — har biri
   alohida node:vm muhitida, ilova fayllariga tegmasdan. Ular to'g'ri
   shakldagi Item beradi (validateItem o'tkazadi); kerak bo'lsa
   ataylab buzuq savol beradi yoki cheklangan to'plamdan takrorlaydi.

   Ishga tushirish:  node --test tests/iq-session.test.mjs
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const load = f => fs.readFileSync(new URL('../src/iq/' + f, import.meta.url), 'utf8');
const CORE = ['rng.js', 'index.js', 'score.js', 'session.js'].map(f => [f, load(f)]);

/* node:vm boshqa realm — deepEqual prototip farqini ko'rmasin. */
const plain = x => JSON.parse(JSON.stringify(x));

function env() {
  const ctx = { window: {}, console };
  vm.createContext(ctx);
  for (const [, src] of CORE) vm.runInContext(src, ctx);
  return { IQ: ctx.window.IQ, win: ctx.window };
}

/* Sinov generatori. o.broken(seed, r) → true bo'lsa buzuq savol (makeItem
   otadi); o.pool — savol mazmuni shuncha xil (og'zaki to'plam taqlidi);
   o.k — variantlar soni (bo'lmasa 4..6). */
function fake(IQ, type, o = {}) {
  const calls = { n: 0 };
  IQ.register({
    type, label: { uz: type, ru: type },
    generate(seed, level) {
      calls.n++;
      const r = IQ.rng(seed);
      if (o.broken && o.broken(seed, r)) return { id: 'buzuq:' + seed, type };
      const k = o.k || 4 + r.int(3);
      const q = o.pool ? r.int(o.pool) : seed;
      const vals = r.shuffle(Array.from({ length: k }, (_, j) => j));
      return {
        id: `${type}:${level}:${seed}`, type, level,
        b: IQ.levelToB(level) + (r.next() - 0.5),
        prompt: { uz: 'Qaysi biri?', ru: 'Какой?' },
        stimulus: { kind: 'text', uz: `${type} savol ${q}`, ru: `${type} вопрос ${q}` },
        options: vals.map(v => ({ kind: 'text', uz: `${type} ${q}/${v}`, ru: `${type} ${q}/${v}` })),
        correct: vals.indexOf(0),
        explain: { uz: 'Qoida.', ru: 'Правило.' },
      };
    },
  });
  return calls;
}

const FOUR = ['matrix', 'series', 'spatial', 'verbal'];
function withFour() {
  const e = env();
  FOUR.forEach(t => fake(e.IQ, t));
  return e;
}

/* Virtual odam: 3PL bo'yicha javob beradi (savolning b va k si bilan). */
function person(IQ, theta, g) {
  return it => {
    const k = it.options.length;
    if (g.next() < IQ.score.prob(theta, it.b, 1 / k)) return it.correct;
    let i = g.int(k - 1);
    if (i >= it.correct) i++;
    return i;
  };
}
const always = ok => it => (ok ? it.correct : (it.correct + 1) % it.options.length);

/* Sessiyani oxirigacha o'ynaydi; ko'rilgan savollarni qaytaradi. */
function play(s, pick, ms = i => 1000 + i) {
  const seen = [];
  while (!s.done) {
    const it = s.current();
    seen.push(it);
    s.answer(pick(it), ms(seen.length - 1));
  }
  return seen;
}

const maxRun = a => {
  let m = 0, r = 0;
  a.forEach((x, i) => { r = i && a[i - 1] === x ? r + 1 : 1; m = Math.max(m, r); });
  return m;
};
const count = (a, x) => a.filter(y => y === x).length;


/* ── API ──────────────────────────────────────────────────────────── */

test('API: shartnoma §3 — maydonlar, current/answer/result/snapshot, tugash', () => {
  const { IQ } = withFour();
  const s = IQ.session.create({ mode: 'test', seed: 11 });
  assert.equal(s.mode, 'test');
  assert.equal(s.length, 30);
  assert.equal(s.seed, 11);
  assert.equal(s.index, 0);
  assert.equal(s.done, false);
  const it = s.current();
  assert.deepEqual(plain(IQ.validateItem(it)), []);
  const r = s.answer(it.correct, 1500);
  assert.equal(r.correct, true);
  assert.equal(r.correctIndex, it.correct);
  assert.equal(r.item, it);
  assert.equal(s.index, 1);
  assert.notEqual(s.current(), it);

  play(s, always(false));
  assert.equal(s.done, true);
  assert.equal(s.current(), null);
  assert.equal(s.index, 30);
  assert.throws(() => s.answer(0, 1), /tugagan/);

  const p = IQ.session.create({ mode: 'practice', types: ['series'], seed: 1 });
  assert.equal(p.length, 10, 'mashq — 10 savol');
  assert.equal(IQ.session.create({ mode: 'test', length: 12, seed: 1 }).length, 12);
  assert.equal(IQ.session.create({ seed: 1 }).mode, 'practice', 'rejim ko\'rsatilmasa — mashq');
  assert.equal(typeof IQ.session.create({}).seed, 'number', 'urug\' berilmasa — vaqtdan');
  assert.notEqual(IQ.session.create({}).seed, IQ.session.create({}).seed,
    'bir millisekundda ochilgan ikki sessiyaning urug\'i har xil');
});


test('turlar: noma\'lumi tashlanadi; birorta ham tur bo\'lmasa — aniq xato', () => {
  const { IQ } = withFour();
  const s = IQ.session.create({ mode: 'practice', types: ['series', 'yoq', 42, 'series'], seed: 3 });
  assert.deepEqual(plain(s.types), ['series']);
  assert.throws(() => IQ.session.create({ mode: 'practice', types: ['yoq'] }), /turi yo'q/);
  assert.throws(() => env().IQ.session.create({ mode: 'test' }), /turi yo'q/, 'generator umuman yo\'q');
});


/* ── Turlar aralashmasi ───────────────────────────────────────────── */

test('test: turlar ulushi 35/25/20/20, ketma-ket bir xil tur ≤ 2', () => {
  const { IQ } = withFour();
  const tot = { matrix: 0, series: 0, spatial: 0, verbal: 0 }, orders = new Set();
  const N = 200;
  for (let seed = 1; seed <= N; seed++) {
    const types = play(IQ.session.create({ mode: 'test', seed }), always(true)).map(it => it.type);
    assert.ok(maxRun(types) <= 2, `urug' ${seed}: ${types.join(',')}`);
    const c = FOUR.map(t => count(types, t));
    assert.ok(c[0] === 10 || c[0] === 11, 'matrix ' + c[0]);   // 30·0.35 = 10.5
    assert.ok(c[1] === 7 || c[1] === 8, 'series ' + c[1]);     // 30·0.25 = 7.5
    assert.equal(c[0] + c[1], 18);
    assert.equal(c[2], 6);
    assert.equal(c[3], 6);
    FOUR.forEach((t, i) => { tot[t] += c[i]; });
    orders.add(types.join(','));
  }
  const share = t => tot[t] / (30 * N);
  assert.ok(Math.abs(share('matrix') - 0.35) < 0.01, 'matrix ' + share('matrix'));
  assert.ok(Math.abs(share('series') - 0.25) < 0.01, 'series ' + share('series'));
  assert.ok(orders.size > N * 0.95, 'tartib urug\'dan — oldindan bilinmaydi');
});


test('test: bor turlar ichida qayta normallashtiriladi (yangi tur — 0.20)', () => {
  const { IQ } = env();
  ['matrix', 'verbal', 't1'].forEach(t => fake(IQ, t));
  for (let seed = 1; seed <= 30; seed++) {
    const types = play(IQ.session.create({ mode: 'test', seed }), always(true)).map(it => it.type);
    /* 0.35 : 0.20 : 0.20 → 0.467 : 0.267 : 0.267 → 30 da 14 : 8 : 8 */
    assert.deepEqual([count(types, 'matrix'), count(types, 'verbal'), count(types, 't1')], [14, 8, 8]);
    assert.ok(maxRun(types) <= 2);
  }
});


test('mashq: berilgan turlar teng ulushda; bitta tur — qoida bajarib bo\'lmaydi, lekin ishlaydi', () => {
  const { IQ } = withFour();
  const types = play(IQ.session.create({ mode: 'practice', types: ['series', 'verbal'], length: 12, seed: 5 }),
    always(true)).map(it => it.type);
  assert.deepEqual([count(types, 'series'), count(types, 'verbal')], [6, 6]);
  assert.ok(maxRun(types) <= 2);
  const one = play(IQ.session.create({ mode: 'practice', types: ['spatial'], seed: 5 }), always(true));
  assert.equal(one.length, 10);
  assert.ok(one.every(it => it.type === 'spatial'));
});


/* ── Adaptivlik ───────────────────────────────────────────────────── */

test('adaptiv: θ har javobdan keyin yangilanadi — daraja javobga ergashadi', () => {
  const { IQ } = withFour();
  const avg = a => a.reduce((s, x) => s + x, 0) / a.length;
  for (let seed = 1; seed <= 10; seed++) {
    const up = play(IQ.session.create({ mode: 'test', seed }), always(true)).map(it => it.level);
    const down = play(IQ.session.create({ mode: 'test', seed }), always(false)).map(it => it.level);
    assert.ok(up[0] >= 4 && up[0] <= 6, 'test o\'rtadan boshlanadi: ' + up[0]);
    assert.ok(avg(up.slice(-10)) >= 9, 'hammasi to\'g\'ri → eng qiyin: ' + up.join(','));
    assert.ok(avg(down.slice(-10)) <= 2, 'hammasi xato → eng oson: ' + down.join(','));
    /* Bir xil urug' — tasodif ham bir xil; farq faqat javoblardan. */
    assert.ok(up[3] - down[3] >= 2, `3 javobdan keyinoq ajraladi: ${up[3]} vs ${down[3]}`);
    assert.ok(up[1] >= down[1], 'bitta javobdan keyin ham');
  }
});


test('adaptiv sessiya haqiqiy θ ni topadi — 300 virtual odam (integratsiya)', () => {
  const { IQ } = withFour();
  const g = IQ.rng(99), th = [], est = [];
  const normal = () => { let u = 0; while (!u) u = g.next(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * g.next()); };
  let cover = 0;
  for (let i = 0; i < 300; i++) {
    const t = normal();                                   // θ ~ N(0,1), prior bilan bir xil
    const s = IQ.session.create({ mode: 'test', seed: 1000 + i });
    play(s, person(IQ, t, g));
    const r = s.result();
    th.push(t); est.push(r.theta);
    if (Math.abs(r.theta - t) <= 1.645 * r.se) cover++;
  }
  const m = a => a.reduce((s, x) => s + x, 0) / a.length, mx = m(th), my = m(est);
  let sxy = 0, sxx = 0, syy = 0;
  th.forEach((x, i) => { sxy += (x - mx) * (est[i] - my); sxx += (x - mx) ** 2; syy += (est[i] - my) ** 2; });
  const r = sxy / Math.sqrt(sxx * syy);
  console.log(`  sessiya orqali: r = ${r.toFixed(3)}, 90% qamrov = ${(cover / 300).toFixed(3)}`);
  assert.ok(r >= 0.85, 'r = ' + r);
  assert.ok(cover / 300 >= 0.85 && cover / 300 <= 0.95, 'qamrov ' + cover / 300);
});


test('mashq: startLevel dan boshlanadi va adaptiv yuradi; test startLevel ni e\'tiborsiz qoldiradi', () => {
  const { IQ } = withFour();
  for (let seed = 1; seed <= 10; seed++) {
    const up = play(IQ.session.create({ mode: 'practice', types: ['series'], startLevel: 8, seed }), always(true));
    const dn = play(IQ.session.create({ mode: 'practice', types: ['series'], startLevel: 8, seed }), always(false));
    assert.equal(up[0].level, 8);
    assert.equal(dn[0].level, 8);
    assert.ok(up.every(it => it.type === 'series'));
    assert.ok(up[9].level >= 9, 'to\'g\'ri javoblar bilan ko\'tariladi: ' + up.map(x => x.level));
    assert.ok(dn[9].level <= 5, 'xato javoblar bilan tushadi: ' + dn.map(x => x.level));
    const lo = play(IQ.session.create({ mode: 'practice', types: ['series'], startLevel: 2, seed }), always(true));
    assert.equal(lo[0].level, 2);
    assert.ok(lo[1].level <= 5, 'bitta javobdan keyin 10 ga otilmaydi: ' + lo[1].level);
    const t = IQ.session.create({ mode: 'test', startLevel: 10, seed });
    assert.ok(t.current().level <= 6, 'test hamma uchun bir xil nuqtadan');
    assert.equal(t.startLevel, null);
  }
  assert.equal(IQ.session.create({ mode: 'practice', startLevel: 99, seed: 1 }).current().level, 10);
  assert.equal(IQ.session.create({ mode: 'practice', startLevel: -5, seed: 1 }).current().level, 1);
});


test('mashq: startLevel berilmasa — nzProgress.levelFor(type) dan (xato bersa 5)', () => {
  const { IQ, win } = withFour();
  const first = types => IQ.session.create({ mode: 'practice', types, seed: 7 }).current().level;
  assert.equal(first(['series']), 5, 'progress yo\'q — 5');
  win.nzProgress = { levelFor: t => (t === 'series' ? 3 : 8) };
  assert.equal(first(['series']), 3);
  assert.equal(first(['series', 'verbal']), 6, 'bir necha tur — o\'rtachasi (5.5 → 6)');
  win.nzProgress = { levelFor: () => { throw new Error('disk'); } };
  assert.equal(first(['series']), 5);
  win.nzProgress = { levelFor: () => 'baland' };
  assert.equal(first(['series']), 5);
});


/* ── Buzuq generator ──────────────────────────────────────────────── */

test('makeItem otsa — boshqa urug\' bilan qayta urinadi (determinizm saqlanadi)', () => {
  const { IQ } = env();
  const calls = fake(IQ, 'tf', { broken: (seed, r) => r.next() < 0.5 });   // 50% buzuq
  const run = () => play(IQ.session.create({ mode: 'test', seed: 21 }), always(true));
  const a = run(), b = run();
  assert.equal(a.length, 30);
  a.forEach(it => assert.deepEqual(plain(IQ.validateItem(it)), []));
  assert.deepEqual(a.map(x => x.id), b.map(x => x.id), 'qayta urinishlar ham urug\'dan');
  assert.ok(calls.n > 45, 'haqiqatan qayta urinildi: ' + calls.n);
});


test('butunlay buzuq generator: boshqa tur bilan davom etadi; yolg\'iz bo\'lsa chegarali urinib aniq xato', () => {
  const { IQ } = env();
  const bad = fake(IQ, 'tb', { broken: () => true });
  fake(IQ, 't1');
  const items = play(IQ.session.create({ mode: 'test', seed: 4 }), always(true));
  assert.equal(items.length, 30);
  assert.ok(items.every(it => it.type === 't1'));
  assert.ok(bad.n <= 12 * 30, 'urinishlar chegaralangan: ' + bad.n);

  bad.n = 0;
  assert.throws(() => IQ.session.create({ mode: 'practice', types: ['tb'], seed: 4 }), /savol yaratib bo'lmadi/);
  assert.ok(bad.n <= 12, 'cheksiz aylanmaydi: ' + bad.n);
});


test('sessiya o\'rtasida generator buzilsa — answer() yiqilmaydi, sessiya shu yerda tugaydi', () => {
  const { IQ } = env();
  let dead = false;
  fake(IQ, 'tx', { broken: () => dead });
  const s = IQ.session.create({ mode: 'test', seed: 8 });
  for (let i = 0; i < 5; i++) s.answer(s.current().correct, 100);
  dead = true;
  const r = s.answer(s.current().correct, 100);
  assert.equal(r.correct, true, 'javob baribir baholanadi');
  assert.equal(s.done, true);
  assert.match(s.error, /savol yaratib bo'lmadi/);
  assert.equal(s.result().n, 6);
});


test('bir sessiyada bir xil savol takrorlanmaydi (cheklangan to\'plam)', () => {
  const { IQ } = env();
  fake(IQ, 'tp', { pool: 40 });
  for (let seed = 1; seed <= 20; seed++) {
    const items = play(IQ.session.create({ mode: 'practice', types: ['tp'], length: 30, seed }), always(true));
    const keys = items.map(it => it.stimulus.uz);
    assert.equal(new Set(keys).size, 30, `urug' ${seed}: takror bor`);
  }
  /* To'plam tugasa — takror (bo'sh qolgandan yaxshi), lekin avval hammasi. */
  const { IQ: IQ2 } = env();
  fake(IQ2, 'tq', { pool: 3 });
  const small = play(IQ2.session.create({ mode: 'practice', types: ['tq'], length: 8, seed: 2 }), always(true));
  assert.equal(small.length, 8);
  assert.equal(new Set(small.slice(0, 3).map(it => it.stimulus.uz)).size, 3);
});


/* ── Snapshot / restore ───────────────────────────────────────────── */

test('snapshot/restore: aynan shu joydan, aynan shu savollar, aynan shu natija', () => {
  const { IQ } = withFour();
  const g = IQ.rng(5);
  const answers = [];
  const full = IQ.session.create({ mode: 'test', seed: 4242 });
  const fullItems = play(full, it => { const a = person(IQ, 0.7, g)(it); answers.push(a); return a; });
  const fullRes = plain(full.result());

  for (const cut of [0, 1, 7, 29, 30]) {
    const s = IQ.session.create({ mode: 'test', seed: 4242 });
    for (let i = 0; i < cut; i++) s.answer(answers[i], 1000 + i);
    const snap = JSON.parse(JSON.stringify(s.snapshot()));       // diskka yozilib o'qilgandek
    assert.ok(JSON.stringify(snap).length < 3000, 'snapshot ixcham — SVG saqlanmaydi');

    const r = IQ.session.restore(snap);
    assert.equal(r.index, cut);
    assert.equal(r.done, cut === 30);
    assert.deepEqual(plain(r.current()), plain(s.current()), `cut ${cut}: joriy savol aynan o'sha`);
    const rest = [];
    while (!r.done) { const it = r.current(); rest.push(it.id); r.answer(answers[r.index], 1000 + r.index); }
    assert.deepEqual(rest, fullItems.slice(cut).map(x => x.id), `cut ${cut}: keyingi savollar ham o'sha`);
    const res = plain(r.result());
    assert.deepEqual(res, fullRes, `cut ${cut}: natija (θ, se, IQ, vaqt) bir xil`);
  }
});


test('restore: mashq startLevel i saqlanadi (levelFor keyin o\'zgarsa ham)', () => {
  const { IQ, win } = withFour();
  win.nzProgress = { levelFor: () => 7 };
  const s = IQ.session.create({ mode: 'practice', types: ['spatial'], seed: 12 });
  s.answer(0, 10); s.answer(1, 10);
  const snap = plain(s.snapshot());
  win.nzProgress = { levelFor: () => 2 };                          // odam boshqa joyda mashq qildi
  const r = IQ.session.restore(snap);
  assert.equal(r.startLevel, 7);
  assert.equal(r.current().id, s.current().id);
});


test('restore: mos kelmaydigan yoki buzuq snapshot — xato (tryRestore → null)', () => {
  const { IQ } = withFour();
  const s = IQ.session.create({ mode: 'test', seed: 77 });
  for (let i = 0; i < 5; i++) s.answer(0, 10);
  const good = plain(s.snapshot());
  assert.ok(IQ.session.tryRestore(good));

  assert.equal(good.engine, IQ.session.ENGINE, 'jurnalda dvigatel versiyasi bor');
  const tampered = plain(good);
  tampered.items[2].id = 'matrix:5:123';
  const cases = {
    'id almashtirilgan': tampered,
    'eski format (v1)': Object.assign(plain(good), { v: 1 }),
    'boshqa dvigatel': Object.assign(plain(good), { engine: '0' }),
    'jurnal uzun': Object.assign(plain(good), { length: 3 }),
    'urug\' yo\'q': Object.assign(plain(good), { seed: 'x' }),
    'jurnal emas': Object.assign(plain(good), { items: 'x' }),
    null: null, 'bo\'sh': {}, satr: 'snapshot',
  };
  for (const [name, snap] of Object.entries(cases)) {
    assert.throws(() => IQ.session.restore(snap), /jurnal yaroqsiz/, name);
    assert.equal(IQ.session.tryRestore(snap), null, name);
  }

  /* Ilova yangilanib, tur yo'qolgan (generator olib tashlangan). */
  const { IQ: other } = env();
  ['matrix', 'series', 'spatial'].forEach(t => fake(other, t));
  assert.throws(() => other.session.restore(good), /jurnal yaroqsiz/);

  /* Generator yangilanib, o'sha urug' boshqa savol beradi. */
  const { IQ: changed } = env();
  FOUR.forEach(t => fake(changed, t, { k: 5 }));
  assert.equal(changed.session.tryRestore(good), null);
});


/* ── Natija ───────────────────────────────────────────────────────── */

test('result: hisoblar, items[].k, vaqt, θ va IQ oraliq', () => {
  const { IQ } = withFour();
  const g = IQ.rng(8);
  const s = IQ.session.create({ mode: 'test', seed: 99 });
  const items = play(s, person(IQ, 0.3, g), i => 2000 + i);
  const r = s.result();
  assert.equal(r.mode, 'test');
  assert.equal(r.n, 30);
  assert.equal(r.correct, r.items.filter(x => x.correct).length);
  assert.equal(r.durationMs, items.reduce((a, _, i) => a + 2000 + i, 0), 'javob vaqtlari yig\'indisi');
  const bt = Object.values(r.byType);
  assert.equal(bt.reduce((a, x) => a + x.n, 0), 30);
  assert.equal(bt.reduce((a, x) => a + x.correct, 0), r.correct);
  r.items.forEach((x, i) => {
    assert.equal(x.id, items[i].id);
    assert.equal(x.k, items[i].options.length, 'k saqlanadi');
    assert.equal(x.b, items[i].b);
    assert.equal(x.level, items[i].level);
    assert.ok(Number.isInteger(x.answer) && x.answer >= -1 && x.answer < x.k, 'answer — tanlangan variant');
    assert.equal(x.correct, x.answer === items[i].correct);
  });
  const est = IQ.score.estimate(r.items);
  assert.equal(r.theta, est.theta);
  assert.equal(r.se, est.se);
  assert.equal(r.iq, IQ.score.toIQ(r.theta));
  assert.ok(r.lo <= r.iq && r.iq <= r.hi);
  assert.deepEqual([r.lo, r.hi], [IQ.score.interval(r.theta, r.se).lo, IQ.score.interval(r.theta, r.se).hi]);
  assert.equal(typeof r.floor, 'boolean');
  r.items[0].correct = !r.items[0].correct;
  assert.notEqual(s.result().items[0].correct, r.items[0].correct, 'natija nusxa — jurnal buzilmaydi');

  /* Mashq natijasi ham N(0,1) prior bilan — tanlov priori natijaga kirmaydi. */
  const p = IQ.session.create({ mode: 'practice', types: ['verbal'], startLevel: 9, seed: 3 });
  play(p, always(true));
  assert.equal(p.result().theta, IQ.score.estimate(p.result().items).theta);
});


test('result.reliable = n ≥ 20 VA se ≤ 0.5', () => {
  const { IQ } = withFour();
  assert.deepEqual({ ...IQ.session.RELIABLE }, { minN: 20, maxSE: 0.5 });
  const g = IQ.rng(31);

  const short = IQ.session.create({ mode: 'test', length: 19, seed: 1 });
  play(short, person(IQ, 0, g));
  assert.equal(short.result().reliable, false, '19 savol — kam');

  /* 20 savol, lekin o'lchov noaniq (se > 0.5): raqam ko'rsatilmaydi. */
  const s20 = IQ.session.create({ mode: 'test', length: 20, seed: 2 });
  play(s20, person(IQ, 0, IQ.rng(2)));
  const r20 = s20.result();
  assert.ok(r20.se > 0.5, 'shart: se ' + r20.se);
  assert.equal(r20.reliable, false, 'n = 20, se = ' + r20.se.toFixed(3));

  let yes = 0, no = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const s = IQ.session.create({ mode: 'test', length: 20 + (seed % 3) * 5, seed });
    play(s, person(IQ, (seed % 7) - 3, g));
    const r = s.result();
    assert.equal(r.reliable, r.n >= 20 && r.se <= 0.5);
    if (r.reliable) yes++; else no++;
  }
  assert.ok(yes > 0 && no > 0, `ikkala holat ham uchraydi: ${yes}/${no}`);

  const full = IQ.session.create({ mode: 'test', seed: 3 });
  play(full, person(IQ, 0.4, g));
  assert.equal(full.result().reliable, true, '30 savollik oddiy test — ishonchli');
});


test('result: chekkada oraliq kesilganini bildiradi (ceiling / floor)', () => {
  const { IQ } = withFour();
  const top = IQ.session.create({ mode: 'test', seed: 6 });
  play(top, always(true));
  const t = top.result();
  assert.equal(t.hi, 145);
  assert.equal(t.ceiling, true, '"145–145" emas, "145+" — ilova bilsin');
  assert.equal(t.floor, false);
  const bottom = IQ.session.create({ mode: 'test', seed: 6 });
  play(bottom, always(false));
  assert.equal(bottom.result().floor, true);
  assert.equal(bottom.result().ceiling, false);
});


test('answer: noto\'g\'ri indeks (vaqt tugadi) — xato javob, yiqilmaydi; ms berilmasa o\'lchanadi', () => {
  const { IQ } = withFour();
  const s = IQ.session.create({ mode: 'test', seed: 13 });
  for (const bad of [null, undefined, -1, 99, 1.5, '0', NaN]) {
    const r = s.answer(bad);
    assert.equal(r.correct, false, String(bad));
  }
  const items = s.result().items;
  assert.ok(items.every(x => x.answer === -1));
  assert.ok(items.every(x => Number.isInteger(x.ms) && x.ms >= 0), 'ms o\'lchangan');
});


test('determinizm: bir xil urug\' + javoblar → bir xil savollar; boshqa urug\' → boshqa', () => {
  const { IQ } = withFour();
  const ids = seed => play(IQ.session.create({ mode: 'test', seed }), always(true)).map(x => x.id);
  assert.deepEqual(ids(500), ids(500));
  const a = ids(500), b = ids(501);
  assert.ok(a.filter((x, i) => x === b[i]).length === 0, 'ikki odam bir xil savollarni olmaydi');
});


test('tezlik: 30 savollik sessiya va restore', () => {
  const { IQ } = withFour();
  play(IQ.session.create({ mode: 'test', seed: 2 }), always(true));   // qizdirish (JIT)
  const s = IQ.session.create({ mode: 'test', seed: 1 });
  const t = [];
  while (!s.done) {
    const a = performance.now();
    s.answer(s.current().correct, 1);
    t.push(performance.now() - a);
  }
  const snap = plain(s.snapshot());
  const a = performance.now();
  IQ.session.restore(snap);
  const tr = performance.now() - a;
  const mean = t.reduce((x, y) => x + y, 0) / t.length;
  const p90 = t.slice().sort((x, y) => x - y)[Math.floor(t.length * 0.9)];
  console.log(`  answer(): o'rtacha ${mean.toFixed(2)} ms, 90-persentil ${p90.toFixed(2)} ms; restore(30): ${tr.toFixed(1)} ms`);
  /* Bitta eng sekin chaqiriq emas — GC pauzasi tasodifan tushishi mumkin. */
  assert.ok(mean < 5 && p90 < 5, `answer o'rtacha ${mean} ms, p90 ${p90} ms`);
  assert.ok(tr < 100, 'restore ' + tr + ' ms');
});


/* ── Server tekshiruvi: IQ.session.verify (CONTRACT.md §10) ─────────
   Mijozdagi hamma narsani o'zgartirish mumkin. Server jurnalni qayta
   o'ynaydi va ballni o'zi hisoblaydi. Halol jurnal — mijoz bilan AYNAN
   bir xil natija; har soxtalashtirish turi — o'z sababi bilan rad. */

/* Halol test: virtual odam, ms ≥ 300. */
function honest(IQ, o = {}) {
  const g = IQ.rng(o.g || 17);
  const s = IQ.session.create(Object.assign({ mode: 'test', seed: 31337 }, o.opts));
  const ask = person(IQ, 0.5, g);
  let n = 0;
  while (!s.done && n < (o.stop || Infinity)) {
    const it = s.current();
    s.answer(o.skip && n % 7 === 3 ? null : ask(it), 800 + g.int(20000));
    n++;
  }
  return s;
}

const code = (IQ, sub) => { try { IQ.session.verify(sub); return 'o\'tdi'; } catch (e) { return e.code; } };


test('verify: halol jurnal — mijozning result() bilan aynan bir xil natija', () => {
  const { IQ } = withFour();
  for (const o of [{}, { stop: 12 }, { skip: true }, { opts: { length: 20, seed: 5 } },
                   { opts: { mode: 'practice', types: ['series', 'spatial'], startLevel: 7, seed: 9 } }]) {
    const s = honest(IQ, o);
    const sub = JSON.parse(JSON.stringify(s.submission()));        // tarmoq orqali o'tgandek
    assert.equal(sub.engine, IQ.session.ENGINE);
    assert.deepEqual(Object.keys(sub.items[0]).sort(), ['answer', 'id', 'ms']);
    assert.deepEqual(plain(IQ.session.verify(sub)), plain(s.result()), JSON.stringify(o));
  }
  /* Mijoz qo'shgan "natija" maydonlari e'tiborga olinmaydi — ball qayta hisoblanadi. */
  const s = honest(IQ);
  const sub = Object.assign(plain(s.submission()), { iq: 145, correct: 30, theta: 3, reliable: true });
  sub.items.forEach(e => { e.correct = true; });
  assert.deepEqual(plain(IQ.session.verify(sub)), plain(s.result()));
});


test('verify: soxta jurnallar rad etiladi — har biri o\'z sababi bilan', () => {
  const { IQ } = withFour();
  const s = honest(IQ);
  const good = plain(s.submission());
  assert.equal(code(IQ, good), 'o\'tdi');
  const mut = f => { const x = plain(good); f(x); return x; };
  const [t0, l0, seed0] = good.items[4].id.split(':');

  const cases = {
    /* Adaptiv tartib: mijoz oson savolni o'zi tanlab ololmaydi. */
    'boshqa id (osonroq daraja)': ['order', x => { x.items[4].id = `${t0}:1:${seed0}`; }],
    'boshqa id (begona urug\')': ['order', x => { x.items[4].id = `${t0}:${l0}:12345`; }],
    'tartib almashtirilgan': ['order', x => { const a = x.items[3]; x.items[3] = x.items[4]; x.items[4] = a; }],
    'boshqa urug\', o\'sha savollar': ['order', x => { x.seed = x.seed + 1; }],
    'boshqa rejim': ['startLevel', x => { x.mode = 'practice'; }],
    'turlar tartibi o\'zgargan': ['order', x => { x.types = x.types.slice().reverse(); }],
    'savol tashlab ketilgan': ['order', x => { x.items.splice(2, 1); }],
    /* Javob indeksi. */
    'answer = k (chegaradan tashqari)': ['answer', x => { x.items[0].answer = s.result().items[0].k; }],
    'answer = 99': ['answer', x => { x.items[1].answer = 99; }],
    'answer = −2': ['answer', x => { x.items[1].answer = -2; }],
    'answer = 1.5': ['answer', x => { x.items[1].answer = 1.5; }],
    'answer = "1"': ['answer', x => { x.items[1].answer = '1'; }],
    'answer yo\'q': ['answer', x => { delete x.items[1].answer; }],
    /* Vaqt. */
    '50 ms javob': ['ms', x => { x.items[7].ms = 50; }],
    'hammasi 50 ms': ['ms', x => { x.items.forEach(e => { e.ms = 50; }); }],
    'ms = 299': ['ms', x => { x.items[7].ms = 299; }],
    'ms yo\'q': ['ms', x => { delete x.items[7].ms; }],
    'ms manfiy': ['ms', x => { x.items[7].ms = -1000; }],
    'ms NaN/matn': ['ms', x => { x.items[7].ms = '900'; }],
    /* Soni. */
    'ortiqcha savol (length dan ko\'p)': ['count', x => { x.items.push(plain(x.items[0])); }],
    'length kamaytirilgan': ['count', x => { x.length = 10; }],
    /* Sarlavha. */
    'boshqa dvigatel': ['engine', x => { x.engine = '0'; }],
    'dvigatel yo\'q': ['engine', x => { delete x.engine; }],
    'eski format': ['version', x => { x.v = 1; }],
    'rejim noma\'lum': ['mode', x => { x.mode = 'exam'; }],
    'urug\' manfiy': ['seed', x => { x.seed = -1; }],
    'urug\' 2^32': ['seed', x => { x.seed = 4294967296; }],
    'urug\' kasr': ['seed', x => { x.seed = 1.5; }],
    'urug\' matn': ['seed', x => { x.seed = '31337'; }],
    'length 0': ['length', x => { x.length = 0; }],
    'length 1000': ['length', x => { x.length = 1000; }],
    'length kasr': ['length', x => { x.length = 30.5; }],
    'noma\'lum tur': ['types', x => { x.types = x.types.concat('iq-boost'); }],
    'takror tur': ['types', x => { x.types = x.types.concat(x.types[0]); }],
    'turlar bo\'sh': ['types', x => { x.types = []; }],
    'items emas': ['items', x => { x.items = {}; }],
    'yozuvda id yo\'q': ['shape', x => { delete x.items[3].id; }],
    'yozuv null': ['shape', x => { x.items[3] = null; }],
  };
  for (const [name, [want, f]] of Object.entries(cases)) {
    assert.equal(code(IQ, mut(f)), want, name);
  }
  for (const junk of [null, undefined, 'jurnal', 42, [], [good]]) assert.equal(code(IQ, junk), 'shape', String(junk));

  /* Mashq: boshlanish darajasi jurnalda bo'lishi shart. */
  const p = plain(honest(IQ, { opts: { mode: 'practice', types: ['series'], startLevel: 6, seed: 2 } }).submission());
  assert.equal(code(IQ, p), 'o\'tdi');
  for (const sl of [undefined, null, 0, 11, 5.5, '6']) {
    assert.equal(code(IQ, Object.assign(plain(p), { startLevel: sl })), 'startLevel', String(sl));
  }
  assert.equal(code(IQ, Object.assign(plain(p), { startLevel: 3 })), 'order', 'boshqa daraja — boshqa savollar');
});


test('verify: −1 (javobsiz) ruxsat, lekin xato hisoblanadi; MIN_MS = 300', () => {
  const { IQ } = withFour();
  assert.equal(IQ.session.MIN_MS, 300);
  const s = IQ.session.create({ mode: 'test', seed: 4 });
  while (!s.done) s.answer(-1, 300);
  const r = IQ.session.verify(plain(s.submission()));
  assert.equal(r.correct, 0);
  assert.ok(r.items.every(x => x.answer === -1 && !x.correct));
});


test('verify: sof — window, localStorage, nzProgress yo\'q muhitda ham ishlaydi (Deno taqlidi)', () => {
  const { IQ } = withFour();
  const sub = plain(honest(IQ).submission());
  const want = plain(IQ.session.verify(sub));

  const ctx = {};                                 // faqat globalThis — DOM yo'q
  vm.createContext(ctx);
  for (const [, src] of CORE) vm.runInContext(src, ctx);
  const IQ2 = vm.runInContext('globalThis.IQ', ctx);
  assert.equal(vm.runInContext('typeof window', ctx), 'undefined');
  FOUR.forEach(t => fake(IQ2, t));
  assert.deepEqual(plain(IQ2.session.verify(sub)), want);
});
