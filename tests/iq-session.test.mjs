/* ─────────────────────────────────────────────────────────────────────────
   src/iq/session.js — adaptiv test/mashq oqimi, snapshot, qayta o'ynash

   NIMA UCHUN BU TEST MUHIM: server (CONTRACT §10) natijani faqat
   jurnaldan QAYTA HISOBLAYDI. Buning uchun sessiya to'liq deterministik
   bo'lishi kerak: (seed, mode, types, length) + javoblar → aynan shu
   savollar. Bitta yashirin Date.now() yoki Math.random() — va halol
   odamning natijasi serverda "mos kelmadi" deb rad etiladi. Aksincha,
   qayta o'ynash tekshiruvi bo'lmasa, mijoz oson savollarni tanlab olib
   yuqori ball yuborishi mumkin.

   Haqiqiy generatorlar ishlatiladi: series + spatial (+ demo). matrix va
   verbal ataylab yuklanmaydi — ular parallel yozilmoqda va bu test
   ularning holatiga bog'liq bo'lmasligi kerak.

   Ishga tushirish:  node --test tests/iq-session.test.mjs
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const FILES = ['src/iq/rng.js', 'src/iq/index.js', 'src/iq/score.js', 'src/iq/session.js',
               'src/iq/gen/demo.js', 'src/iq/gen/series.js', 'src/iq/gen/spatial.js'];
const SRC = FILES.map(f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8'));

/* extra — realm'ga qo'shimcha globallar (masalan nzProgress). */
function realm(extra) {
  const ctx = Object.assign({}, extra || {});
  ctx.window = ctx;
  vm.createContext(ctx);
  FILES.forEach((f, i) => vm.runInContext(SRC[i], ctx, { filename: f }));
  const IQ = ctx.IQ;
  /* Sinov generatorlari: urug'larning ~2/3 qismida yiqiladigan va hech
     qachon ishlamaydigan. demo generatoridan foydalanadi. */
  IQ.register({
    type: 'flaky', label: { uz: 'x', ru: 'x' },
    generate(seed, level) {
      if (seed % 3 !== 0) throw new Error('omadsiz urug\'');
      const it = IQ.generator('demo').generate(seed, level);
      return Object.assign({}, it, { type: 'flaky', id: 'flaky:' + level + ':' + seed });
    },
  });
  IQ.register({
    type: 'never', label: { uz: 'x', ru: 'x' },
    generate() { return { id: 'never:1:1', type: 'never' }; },   // doim buzuq
  });
  return { IQ, ctx };
}

const plain = x => JSON.parse(JSON.stringify(x));
const { IQ } = realm();
const TYPES = ['series', 'spatial'];

/* Javob siyosatlari. */
const right = it => it.correct;
const wrong = it => (it.correct + 1) % it.options.length;
const mixed = (it, i) => (i % 3 === 2 ? wrong(it) : right(it));

function run(s, policy, msOf) {
  while (!s.done) {
    const it = s.current();
    s.answer(policy(it, s.index), msOf ? msOf(s.index) : 1000 + s.index);
  }
  return s;
}


/* ── Asosiy oqim ───────────────────────────────────────────────────── */

test('standart qiymatlar: test 30, mashq 10; seed yo\'q — uint32', () => {
  const t = IQ.session.create({ mode: 'test', types: TYPES, seed: 1 });
  assert.equal(t.mode, 'test');
  assert.equal(t.length, 30);
  assert.equal(t.seed, 1);
  const p = IQ.session.create({ mode: 'practice', types: TYPES, seed: 1 });
  assert.equal(p.length, 10);
  const d = IQ.session.create({ types: TYPES });
  assert.equal(d.mode, 'practice');
  assert.ok(Number.isInteger(d.seed) && d.seed >= 0 && d.seed <= 0xffffffff);
  assert.equal(IQ.session.create({ mode: 'test', types: TYPES, seed: 0 }).seed, 0, 'seed 0 ham urug\'');
  assert.deepEqual(plain(IQ.session.create({ mode: 'test', seed: 3 }).types), plain(IQ.types()),
    'types berilmasa — hamma tur');
});


test('to\'liq test: jurnal shakli, durationMs = ms yig\'indisi, reliable', () => {
  const s = run(IQ.session.create({ mode: 'test', types: TYPES, seed: 42 }), mixed, i => 500 + 10 * i);
  assert.equal(s.done, true);
  assert.equal(s.index, 30);
  assert.equal(s.current(), null);
  assert.throws(() => s.answer(0, 1), /tugagan/);

  const r = s.result();
  assert.equal(r.mode, 'test');
  assert.equal(r.n, 30);
  assert.equal(r.items.length, 30);
  assert.equal(r.correct, r.items.filter(x => x.correct).length);
  assert.equal(r.correct, 20);
  let ms = 0;
  for (let i = 0; i < 30; i++) ms += 500 + 10 * i;
  assert.equal(r.durationMs, ms);
  assert.equal(r.reliable, true);
  assert.equal(r.complete, true);
  assert.ok(isFinite(r.theta) && r.se > 0 && r.se < 1);
  assert.ok(r.lo <= r.iq && r.iq <= r.hi && r.lo >= 55 && r.hi <= 145);
  assert.equal(r.iq, IQ.score.toIQ(r.theta));
  assert.deepEqual(plain(Object.keys(r.byType).sort()), TYPES.slice().sort());
  assert.equal(r.byType.series.n + r.byType.spatial.n, 30);
  assert.equal(r.byType.series.correct + r.byType.spatial.correct, r.correct);

  r.items.forEach((x, i) => {
    assert.deepEqual(Object.keys(x).sort(),
      ['answer', 'b', 'correct', 'id', 'k', 'level', 'ms', 'type'], 'yozuv ' + i);
    assert.equal(x.id, x.type + ':' + x.level + ':' + x.id.split(':')[2]);
    assert.ok(x.k >= 4 && x.k <= 6);
    assert.ok(Number.isInteger(x.answer) && x.answer >= 0 && x.answer < x.k);
    assert.ok(Math.abs(x.b - IQ.levelToB(x.level)) <= 0.75 + 1e-9);
  });
  assert.doesNotThrow(() => JSON.stringify(r));
});


test('answer: -1 / null — javob berilmadi (xato), noto\'g\'ri indeks — xato otiladi', () => {
  const s = IQ.session.create({ mode: 'test', types: TYPES, seed: 5 });
  const it = s.current();
  assert.throws(() => s.answer(it.options.length, 1), /indeks/);
  assert.throws(() => s.answer('0', 1), /indeks/);
  assert.throws(() => s.answer(1.5, 1), /indeks/);
  assert.equal(s.index, 0, 'xato javob jurnalga tushmaydi');
  const a = s.answer(null, 30000);
  assert.equal(a.correct, false);
  assert.equal(a.correctIndex, it.correct);
  assert.equal(a.item, it);
  s.answer(-1, NaN);
  const r = s.result();
  assert.equal(r.items[0].answer, -1);
  assert.equal(r.items[1].answer, -1);
  assert.equal(r.items[1].ms, 0, 'yaroqsiz ms — 0');
  assert.equal(r.reliable, false, '2 ta savol — ishonchsiz');
});


test('reliable: faqat test rejimi va n ≥ 20', () => {
  const r19 = run(IQ.session.create({ mode: 'test', types: TYPES, seed: 8, length: 19 }), right).result();
  assert.equal(r19.reliable, false);
  const r20 = run(IQ.session.create({ mode: 'test', types: TYPES, seed: 8, length: 20 }), right).result();
  assert.equal(r20.reliable, true);
  const p = run(IQ.session.create({ mode: 'practice', types: TYPES, seed: 8, length: 25 }), right).result();
  assert.equal(p.reliable, false, 'mashq hech qachon IQ raqami bermaydi');
});


test('determinizm: ikki alohida realm, bir xil seed → aynan bir xil savollar va natija', () => {
  const a = run(realm().IQ.session.create({ mode: 'test', types: TYPES, seed: 777 }), mixed).result();
  const b = run(realm().IQ.session.create({ mode: 'test', types: TYPES, seed: 777 }), mixed).result();
  assert.deepEqual(plain(a), plain(b));
  const c = run(IQ.session.create({ mode: 'test', types: TYPES, seed: 778 }), mixed).result();
  assert.notDeepEqual(plain(a.items.map(x => x.id)), plain(c.items.map(x => x.id)));
});


test('Math.random va Date.now ishlatilmaydi (seed berilganda)', () => {
  const { IQ: Q, ctx } = realm();
  vm.runInContext("Math.random = () => { throw new Error('Math.random chaqirildi'); };" +
                  "Date.now = () => { throw new Error('Date.now chaqirildi'); };", ctx);
  assert.throws(() => Q.session.create({ mode: 'test', types: TYPES }), /Date\.now/, 'tuzoq ishlayapti');
  const s = run(Q.session.create({ mode: 'test', types: TYPES, seed: 9 }), mixed);
  const r = s.result();
  const back = Q.session.restore(plain(s.snapshot()));
  assert.equal(back.result().iq, r.iq);
  assert.equal(Q.session.verify(plain(s.payload())).theta, r.theta);
  run(Q.session.create({ mode: 'practice', types: TYPES, seed: 9, startLevel: 4 }), mixed).result();
});


/* ── Turlar aylanishi ──────────────────────────────────────────────── */

test('turlar muvozanatli bloklarda, ketma-ket takrorlanmaydi', () => {
  const T3 = ['series', 'spatial', 'demo'];
  const orders = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    const r = run(IQ.session.create({ mode: 'test', types: T3, seed }), mixed).result();
    const seq = r.items.map(x => x.type);
    for (let blk = 0; blk < 10; blk++) {
      assert.deepEqual(plain(seq.slice(blk * 3, blk * 3 + 3).sort()), T3.slice().sort(), 'seed ' + seed + ' blok ' + blk);
    }
    for (let i = 1; i < seq.length; i++) assert.notEqual(seq[i], seq[i - 1], 'seed ' + seed + ' o\'rin ' + i);
    orders.add(seq.join(','));
  }
  assert.ok(orders.size > 30, 'tartib seed\'ga bog\'liq: ' + orders.size + ' xil');

  // 10 savol / 3 tur — farq ko'pi bilan 1.
  const r = run(IQ.session.create({ mode: 'test', types: T3, seed: 3, length: 10 }), mixed).result();
  const ns = T3.map(t => (r.byType[t] ? r.byType[t].n : 0));
  assert.ok(Math.max(...ns) - Math.min(...ns) <= 1, JSON.stringify(ns));

  // Bitta tur ham ishlaydi; takroriy tur nomi bir marta sanaladi.
  const one = run(IQ.session.create({ mode: 'test', types: ['series', 'series'], seed: 3, length: 5 }), mixed);
  assert.deepEqual(plain(one.types), ['series']);
});


/* ── Adaptivlik ────────────────────────────────────────────────────── */

test('adaptiv: hammasi to\'g\'ri — daraja ko\'tariladi, hammasi xato — tushadi', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const up = run(IQ.session.create({ mode: 'test', types: TYPES, seed }), right).result();
    const dn = run(IQ.session.create({ mode: 'test', types: TYPES, seed }), wrong).result();
    const mid = run(IQ.session.create({ mode: 'test', types: TYPES, seed }), mixed).result();
    const first = up.items[0].level;
    assert.ok(first === 4 || first === 5, 'birinchi savol θ = 0 atrofida: ' + first);
    assert.equal(dn.items[0].id, up.items[0].id, 'birinchi savol javobga bog\'liq emas');
    assert.ok(up.items.slice(-5).every(x => x.level >= 9), 'yuqori: ' + up.items.map(x => x.level));
    assert.ok(dn.items.slice(-5).every(x => x.level <= 2), 'past: ' + dn.items.map(x => x.level));
    assert.ok(up.iq > mid.iq && mid.iq > dn.iq, [up.iq, mid.iq, dn.iq].join(' > '));
    assert.ok(up.iq >= 130 && dn.iq <= 70, up.iq + ' / ' + dn.iq);
  }
});


/* ── Snapshot va tiklash ───────────────────────────────────────────── */

test('snapshot → JSON → restore: aynan shu joydan, aynan shu savollar', () => {
  for (const mode of ['test', 'practice']) {
    const opts = { mode, types: TYPES, seed: 2024, length: 24, startLevel: 6 };
    const whole = run(IQ.session.create(opts), mixed).result();

    const s = IQ.session.create(opts);
    for (let i = 0; i < 13; i++) s.answer(mixed(s.current(), i), 1000 + i);
    const snap = JSON.parse(JSON.stringify(s.snapshot()));
    const back = realm().IQ.session.restore(snap);          // boshqa realm — "ilova qayta ochildi"
    assert.equal(back.index, 13);
    assert.equal(back.done, false);
    assert.equal(back.current().id, s.current().id);
    assert.equal(back.mode, mode);
    assert.equal(back.seed, 2024);
    assert.equal(back.length, 24);
    assert.deepEqual(plain(back.result()), plain(s.result()));

    run(back, mixed);
    assert.deepEqual(plain(back.result()), plain(whole), mode + ': uzilishsiz sessiya bilan bir xil');

    const fin = IQ.session.restore(plain(back.snapshot()));
    assert.equal(fin.done, true);
    assert.deepEqual(plain(fin.result()), plain(whole));
  }
});


test('restore: jurnal buzilgan — IQ_REPLAY_MISMATCH', () => {
  const s = run(IQ.session.create({ mode: 'test', types: TYPES, seed: 31337 }), mixed);
  const snap = plain(s.snapshot());

  // (a) id almashtirilgan
  const a = plain(snap); a.log[5].id = a.log[5].id.replace(/:(\d+)$/, ':12345');
  assert.throws(() => IQ.session.restore(a), e => e.code === 'IQ_REPLAY_MISMATCH' && e.index === 5);

  // (b) "oson savol tanlash": shu tur va urug', lekin 1-daraja
  const i = snap.log.findIndex(x => x.id.split(':')[1] !== '1');
  const b = plain(snap); b.log[i].id = b.log[i].id.replace(/:(\d+):/, ':1:');
  assert.throws(() => IQ.session.restore(b), e => e.code === 'IQ_REPLAY_MISMATCH' && e.index === i);

  // (c) boshqa seed bilan yaratilgan jurnal
  const c = plain(snap); c.seed = snap.seed + 1;
  assert.throws(() => IQ.session.restore(c), e => e.code === 'IQ_REPLAY_MISMATCH' && e.index === 0);

  // (d) turlar tartibi o'zgartirilgan
  const d = plain(snap); d.types = snap.types.slice().reverse();
  assert.throws(() => IQ.session.restore(d), e => e.code === 'IQ_REPLAY_MISMATCH');

  // (e) jurnal sessiyadan uzun, bema'ni javob, boshqa engine
  const e1 = plain(snap); e1.length = 10;
  assert.throws(() => IQ.session.restore(e1), /uzun/);
  const e2 = plain(snap); e2.log[3].answer = 99;
  assert.throws(() => IQ.session.restore(e2), /indeks/);
  const e3 = plain(snap); e3.log[3].answer = '1';
  assert.throws(() => IQ.session.restore(e3), /indeks/);
  const e4 = plain(snap); e4.engine = 999;
  assert.throws(() => IQ.session.restore(e4), e => e.code === 'IQ_ENGINE_MISMATCH');
  assert.throws(() => IQ.session.restore(null));
});


/* ── verify (§10) ──────────────────────────────────────────────────── */

test('verify: payload → aynan shu Result (mijoz yuborgan iq ga qaralmaydi)', () => {
  const s = run(IQ.session.create({ mode: 'test', types: TYPES, seed: 555 }), mixed);
  const payload = plain(s.payload());
  assert.deepEqual(Object.keys(payload).sort(), ['engine', 'items', 'length', 'mode', 'seed', 'types']);
  payload.items.forEach(x => assert.deepEqual(Object.keys(x).sort(), ['answer', 'id', 'ms']));

  const claimed = Object.assign(plain(payload), { iq: 145, correct: 30, theta: 3 });
  const r = realm().IQ.session.verify(claimed);            // "server" — alohida realm
  assert.deepEqual(plain(r), plain(s.result()));
});


test('verify: to\'g\'rilik javobdan qayta chiqariladi', () => {
  const s = run(IQ.session.create({ mode: 'test', types: TYPES, seed: 556 }), wrong);
  const p = plain(s.payload());
  // Oxirgi savolga javob o'zgartirilsa (keyin savol yo'q — id'lar mos
  // keladi), natija YANGI javobdan hisoblanadi, "correct" da'vosidan emas.
  const last = s.result().items[29];
  const truth = IQ.makeItem(last.type, +last.id.split(':')[2], last.level).correct;
  assert.equal(last.correct, false);
  p.items[29].answer = truth;
  const r = IQ.session.verify(p);
  assert.equal(r.items[29].correct, true);
  assert.equal(r.correct, 1);
  // Teskarisi: javob o'zgarmasa, mijoz "correct: true" desa ham — xato.
  const p2 = plain(s.payload());
  p2.items.forEach(x => { x.correct = true; });
  assert.equal(IQ.session.verify(p2).correct, 0);

  // O'rtadagi javob o'zgartirilsa — keyingi daraja(lar) o'zgaradi va
  // id'lar mos kelmaydi, yoki (daraja o'zgarmasa) ball yangi javobdan.
  const q = plain(s.payload());
  const mid = s.result().items[10];
  q.items[10].answer = IQ.makeItem(mid.type, +mid.id.split(':')[2], mid.level).correct;
  try {
    const r2 = IQ.session.verify(q);
    assert.equal(r2.correct, 1);
  } catch (e) {
    assert.equal(e.code, 'IQ_REPLAY_MISMATCH');
    assert.ok(e.index > 10);
  }
});


test('verify: tugallanmagan sessiya rad etiladi (erta to\'xtatish), buzuq payload — xato', () => {
  const s = IQ.session.create({ mode: 'test', types: TYPES, seed: 99 });
  for (let i = 0; i < 25; i++) s.answer(right(s.current()), 1000);
  const p = plain(s.payload());
  assert.throws(() => IQ.session.verify(p), e => e.code === 'IQ_INCOMPLETE');
  const partial = IQ.session.verify(p, { allowPartial: true });
  assert.equal(partial.n, 25);
  assert.equal(partial.complete, false);

  const full = run(s, right).payload();
  const bad = [
    null, {}, Object.assign(plain(full), { items: null }),
    Object.assign(plain(full), { seed: undefined }),
    Object.assign(plain(full), { seed: 1.5 }),
    Object.assign(plain(full), { seed: -1 }),
    Object.assign(plain(full), { seed: 2 ** 32 }),
    Object.assign(plain(full), { mode: 'exam' }),
    Object.assign(plain(full), { types: ['series', 'yoq-tur'] }),
    Object.assign(plain(full), { length: 0 }),
    Object.assign(plain(full), { length: 1e6 }),
  ];
  bad.forEach((b, i) => assert.throws(() => IQ.session.verify(b), 'holat ' + i));
  assert.equal(IQ.session.verify(plain(full)).n, 30);
});


/* ── Buzuq savol: deterministik qayta urinish ─────────────────────── */

test('makeItem otsa — keyingi urinish urug\'i bilan; restore ham aynan shunday', () => {
  const s = run(IQ.session.create({ mode: 'test', types: ['flaky', 'series'], seed: 12 }), mixed);
  const r = s.result();
  assert.equal(r.n, 30);
  r.items.filter(x => x.type === 'flaky').forEach(x => assert.equal(+x.id.split(':')[2] % 3, 0));
  assert.deepEqual(plain(IQ.session.verify(plain(s.payload()))), plain(r));
  assert.deepEqual(plain(realm().IQ.session.restore(plain(s.snapshot())).result()), plain(r));

  assert.throws(() => IQ.session.create({ mode: 'test', types: ['never'], seed: 1 }),
    e => e.code === 'IQ_GEN_FAILED' && /never/.test(e.message));
  assert.throws(() => IQ.session.create({ mode: 'test', types: ['yoq'], seed: 1 }), /generator/);
});


/* ── Mashq: zinapoya ───────────────────────────────────────────────── */

test('mashq: startLevel dan boshlanadi, 2 to\'g\'ri → +1, xato → −1', () => {
  const s = IQ.session.create({ mode: 'practice', types: ['series'], seed: 3, length: 12, startLevel: 5 });
  // T T | T T | F | F | T T | T | F …
  const plan = [1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1];
  const levels = [];
  plan.forEach(ok => { const it = s.current(); levels.push(it.level); s.answer(ok ? right(it) : wrong(it), 900); });
  assert.deepEqual(levels, [5, 5, 6, 6, 7, 6, 5, 5, 6, 6, 5, 5]);
  const r = s.result();
  assert.equal(r.reliable, false);
  assert.ok(isFinite(r.theta) && r.lo <= r.iq && r.iq <= r.hi, 'mashqda ham Result to\'liq');

  // Chegaralar: 10 dan oshmaydi, 1 dan tushmaydi.
  const hi = run(IQ.session.create({ mode: 'practice', types: ['series'], seed: 3, length: 12, startLevel: 9 }), right);
  assert.ok(hi.result().items.every(x => x.level <= 10));
  assert.equal(hi.result().items[11].level, 10);
  const lo = run(IQ.session.create({ mode: 'practice', types: ['series'], seed: 3, length: 6, startLevel: 2 }), wrong);
  assert.deepEqual(plain(lo.result().items.map(x => x.level)), [2, 1, 1, 1, 1, 1]);
});


test('mashq: har tur o\'z zinapoyasida; startLevel xaritasi; standart 3', () => {
  const s = run(IQ.session.create({ mode: 'practice', types: TYPES, seed: 4, length: 8,
    startLevel: { series: 2, spatial: 8 } }), wrong);
  const r = s.result();
  const firstOf = t => r.items.find(x => x.type === t).level;
  assert.equal(firstOf('series'), 2);
  assert.equal(firstOf('spatial'), 8);
  assert.deepEqual(plain(s.snapshot().startLevels), { series: 2, spatial: 8 });

  const d = IQ.session.create({ mode: 'practice', types: ['series'], seed: 4 });
  assert.equal(d.current().level, 3, 'nzProgress ham startLevel ham yo\'q — 3');
  const clamp = IQ.session.create({ mode: 'practice', types: ['series'], seed: 4, startLevel: 99 });
  assert.equal(clamp.current().level, 10);
});


test('mashq: nzProgress.levelFor dan boshlanadi, snapshot uni saqlaydi', () => {
  const asked = [];
  const nzProgress = { levelFor: t => { asked.push(t); return t === 'series' ? 9 : 4; } };
  const { IQ: Q } = realm({ nzProgress });
  const s = run(Q.session.create({ mode: 'practice', types: TYPES, seed: 10, length: 6 }), mixed);
  assert.deepEqual(asked.sort(), TYPES.slice().sort());
  const r = s.result();
  assert.equal(r.items.find(x => x.type === 'series').level, 9);
  assert.equal(r.items.find(x => x.type === 'spatial').level, 4);
  // nzProgress'siz realm (server) ham aynan shuni qayta chiqaradi.
  assert.deepEqual(plain(IQ.session.restore(plain(s.snapshot())).result()), plain(r));
  assert.deepEqual(plain(IQ.session.verify(plain(s.payload()))), plain(r));

  // Test rejimida startLevel/levelFor e'tiborsiz: boshlanish θ = 0 dan.
  const t = Q.session.create({ mode: 'test', types: TYPES, seed: 10, startLevel: 10 });
  assert.ok(t.current().level <= 5);
});
