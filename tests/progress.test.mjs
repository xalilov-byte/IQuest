/* ─────────────────────────────────────────────────────────────────────────
   src/progress.js — qurilma xotirasining tekshiruvi

   Bu qatlam `localStorage` dan o'qiydi, ya'ni ISHONCHSIZ manbadan:
   foydalanuvchi uni brauzer konsolidan qo'lda o'zgartirishi mumkin, eski
   versiya esa boshqa shakldagi ma'lumot qoldirishi mumkin. Buzilgan bitta
   maydon tufayli ilova ochilmay qolmasligi kerak.

   Ishga tushirish:  npm test
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('../src/progress.js', import.meta.url), 'utf8');
const KEY = 'nz-progress';

/* node:vm boshqa realm — u yerda yaratilgan massiv host'dagi Array'dan
   meros olmaydi va deepEqual prototip bo'yicha farq ko'radi. JSON orqali
   o'tkazish qiymatni o'zgartirmaydi, faqat shu farqni olib tashlaydi. */
const plain = x => JSON.parse(JSON.stringify(x));

/* opts.iq — IQ yadrosini (rng, index, score) ham yuklaydi: levelFor()
   IQ.score.estimate dan foydalanadi. Build'dagidek, progress.js dan KEYIN. */
const IQ_SRC = ['rng.js', 'index.js', 'score.js', 'session.js']
  .map(f => fs.readFileSync(new URL('../src/iq/' + f, import.meta.url), 'utf8'));

function env(saved, opts) {
  opts = opts || {};
  const store = new Map();
  if (saved !== undefined) store.set(KEY, typeof saved === 'string' ? saved : JSON.stringify(saved));

  const io = { writes: 0, reads: 0 };
  const ctx = {
    window: {},
    localStorage: {
      getItem: k => { io.reads++; return store.has(k) ? store.get(k) : null; },
      setItem: (k, v) => { io.writes++; store.set(k, String(v)); },
      removeItem: k => { store.delete(k); },
    },
    setTimeout, clearTimeout,
    console: { info() {}, warn() {}, error() {} },
    crypto: globalThis.crypto,
    addEventListener() {},
    document: { addEventListener() {}, visibilityState: 'visible' },
  };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  if (opts.iq) IQ_SRC.forEach(src => vm.runInContext(src, ctx));
  return {
    p: ctx.window.nzProgress, io, win: ctx.window,
    disk: () => JSON.parse(store.get(KEY) || 'null'),
    raw: () => store.get(KEY),
    queue: () => JSON.parse(store.get('nz-attempts') || 'null'),
  };
}

/* Bugungi kunda javob berilgan deb ko'rsatish uchun — sane() `day` ni
   satr sifatida oladi, kunlik hisoblagichlar esa boshqa kunda nolga
   tushadi. Umrbod hisoblagichlar bunga bog'liq emas. */
function saqlangan(x) {
  return Object.assign({
    v: 1, points: 0, marathonBest: 0,
    totalAnswered: 0, totalCorrect: 0, totalExams: 0,
    streak: 0, longest: 0, lastActiveDay: null,
    topics: {}, wrong: [], saved: [], day: null,
    answered: 0, exams: 0, signs: [], tasks: [],
    soundOn: null, notifOn: null,
  }, x);
}


test('bo\'sh xotira: hech qanday raqam o\'ylab topilmaydi', () => {
  const { p } = env();
  const st = p.stats();
  assert.equal(st.answered, 0);
  assert.equal(st.exams, 0);
  assert.equal(st.accuracy, null, '0 javobdan foiz chiqarib bo\'lmaydi — "0%" yolgʻon boʻlardi');
  assert.deepEqual(plain(p.topicStats()), []);
});


test('mavzu kesimi javoblardan yigʻiladi', () => {
  const { p } = env();
  for (let i = 0; i < 4; i++) p.answered({ ref: '#00' + i, topic: 'Svetofor', correct: i < 3 });
  for (let i = 0; i < 4; i++) p.answered({ ref: '#01' + i, topic: 'Belgilar', correct: false });

  const t = p.topicStats();
  assert.equal(t.length, 2);
  assert.deepEqual(plain(t.map(x => [x.name, x.pct])), [['Belgilar', 0], ['Svetofor', 75]],
    'eng zaif mavzu birinchi turishi kerak');
  assert.equal(p.stats().topicsTouched, 2);
});


test('kam javob berilgan mavzu ko\'rsatilmaydi — 1 ta savol tasodif', () => {
  const { p } = env();
  p.answered({ ref: '#001', topic: 'Svetofor', correct: false });
  p.answered({ ref: '#002', topic: 'Svetofor', correct: false });
  assert.deepEqual(plain(p.topicStats()), [], '2 ta javobdan "0%" chiqarish ma\'lumot emas');

  p.answered({ ref: '#003', topic: 'Svetofor', correct: true });
  assert.equal(p.topicStats().length, 1);
  assert.equal(p.topicStats()[0].pct, 33);
});


test('mavzusiz javob hisobni buzmaydi', () => {
  const { p } = env();
  p.answered({ ref: '#001', correct: true });
  p.answered({ ref: '#002', topic: '', correct: true });
  p.answered({ ref: '#003', topic: null, correct: true });
  assert.deepEqual(plain(p.topicStats()), []);
  assert.equal(p.stats().answered, 3, 'umumiy hisob baribir yurishi kerak');
});


test('buzilgan mavzu yozuvlari tashlanadi', () => {
  /* Foydalanuvchi localStorage'ni qo'lda tahrirlashi mumkin. */
  const { p } = env(saqlangan({
    topics: {
      'Yaxshi': [10, 7],
      'Toʻgʻri javob koʻp': [5, 50],     // 1000% chiqardi
      'Massiv emas': 42,
      'Uzunligi notoʻgʻri': [3],
      'Manfiy': [-5, -2],
      ['x'.repeat(61)]: [10, 5],          // juda uzun nom
    },
  }));

  const t = p.topicStats();
  assert.deepEqual(plain(t.map(x => x.name)), ['Yaxshi', 'Toʻgʻri javob koʻp']);
  assert.equal(t.find(x => x.name === 'Toʻgʻri javob koʻp').pct, 100,
    'toʻgʻri javob soni umumiy sondan katta boʻlolmaydi');
});


test('topics butunlay yoʻq boʻlsa ham ochiladi (eski saqlangan holat)', () => {
  const eski = saqlangan({ totalAnswered: 12, totalCorrect: 9 });
  delete eski.topics;
  const { p } = env(eski);
  assert.deepEqual(plain(p.topicStats()), []);
  assert.equal(p.stats().answered, 12, 'eski progress yoʻqolmasligi kerak');
});


test('buzilgan JSON: ilova ochiladi, progress noldan boshlanadi', () => {
  const { p } = env('{bu json emas');
  assert.equal(p.stats().answered, 0);
  assert.deepEqual(plain(p.topicStats()), []);
});


test('umrbod hisoblagichlar va aniqlik', () => {
  const { p } = env();
  for (let i = 0; i < 10; i++) p.answered({ ref: '#' + i, topic: 'Svetofor', correct: i < 7 });
  p.examFinished();

  const st = p.stats();
  assert.equal(st.answered, 10);
  assert.equal(st.correct, 7);
  assert.equal(st.accuracy, 70);
  assert.equal(st.exams, 1);
});


test('streak birinchi javobda 1 dan boshlanadi', () => {
  const { p } = env();
  p.answered({ ref: '#001', topic: 'Svetofor', correct: true });
  assert.equal(p.streak(), 1);
  assert.equal(p.stats().longest, 1);
  // Bir kunda ikkinchi javob streak'ni oshirmaydi.
  p.answered({ ref: '#002', topic: 'Svetofor', correct: true });
  assert.equal(p.streak(), 1);
});


test('reset(): hammasi tozalanadi, mavzular ham', () => {
  const { p, disk } = env();
  for (let i = 0; i < 5; i++) p.answered({ ref: '#' + i, topic: 'Svetofor', correct: true });
  p.flush();
  assert.ok(disk(), 'diskka yozilgan boʻlishi kerak');

  p.reset();
  assert.equal(p.stats().answered, 0);
  assert.deepEqual(plain(p.topicStats()), []);
  assert.equal(disk(), null);
});


/* ── Javoblar navbati: diskka yozish birlashtiriladi ─────────────────
   Ilgari har javobda butun navbat diskdan o'qilib, qaytadan yozilardi.
   Navbat to'lganda bu bitta javobga ~1.6 ms sinxron ish — aynan odam
   javobni bosgan lahzada. */

test('50 ta javob — diskka bir marta yoziladi, oʻqish ham bir marta', () => {
  const { p, io, queue } = env();
  io.writes = 0; io.reads = 0;

  for (let i = 0; i < 50; i++) p.answered({ ref: '#' + i, topic: 'Svetofor', correct: true });
  assert.equal(io.writes, 0, 'kutish davomida diskka tegilmasligi kerak');

  p.flush();
  assert.equal(io.writes, 2, 'bitta holat + bitta navbat yozuvi');
  assert.ok(io.reads <= 1, 'navbat diskdan faqat birinchi javobda oʻqiladi, oʻqildi: ' + io.reads);
  assert.equal(queue().length, 50);
});


test('navbat chegarasi: eng qadimgilari tashlanadi', () => {
  const { p, queue } = env();
  for (let i = 0; i < 2050; i++) p.answered({ ref: '#' + i, correct: true });
  p.flush();

  const q = queue();
  assert.equal(q.length, 2000, 'QUEUE_MAX dan oshmasligi kerak');
  assert.equal(q[0].r, '#50', 'eng qadimgi 50 tasi tashlangan boʻlishi kerak');
  assert.equal(q[q.length - 1].r, '#2049');
  assert.equal(p.queued(), 2000);
});


test('queued() hali yozilmagan javoblarni ham sanaydi', () => {
  const { p } = env();
  for (let i = 0; i < 7; i++) p.answered({ ref: '#' + i, correct: true });
  assert.equal(p.queued(), 7, 'flush qilinmagan boʻlsa ham haqiqiy son koʻrinishi kerak');
});


/* ── Prototip kalitlari ─────────────────────────────────────────────
   `ref` erkin matn (parseBulk uni cheklamaydi), ya'ni u "constructor"
   yoki "__proto__" boʻlishi mumkin. Oddiy {} da m["constructor"] hech
   qachon undefined boʻlmaydi — u Object.prototype dan keladi. */

const Q_PROTO = [
  { ref: 'constructor', topic: 'Svetofor', text: 'Prototip nomli savol' },
  { ref: '__proto__', topic: 'Svetofor', text: 'Ikkinchisi' },
  { ref: '#001', topic: 'Svetofor', text: 'Oddiy savol' },
];

test('"constructor" ref\'li savol saqlangan roʻyxatdan yoʻqolmaydi', () => {
  const { p } = env();
  p.initial(Q_PROTO);
  p.save({ savedIds: [0, 1, 2], wrongIds: [], signsAnswered: [], tasksAwarded: [] }, Q_PROTO);
  p.flush();

  const back = p.initial(Q_PROTO);
  assert.deepEqual(plain(back.savedIds).sort((a, b) => a - b), [0, 1, 2],
    'uchalasi ham qaytishi kerak — indeks oʻrniga funksiya emas');
  assert.ok(back.savedIds.every(i => typeof i === 'number'));
});


test('"constructor" ref\'i bank oʻzgarganda ham yoʻqolmaydi (yetimlar)', () => {
  /* Eng ogʻir holat: odam bazadagi savolni saqladi, keyin internetsiz
     ochdi va bank APK ichidagi toʻplamga tushdi. Yetimlar mexanizmi uni
     saqlab qolishi kerak — ilgari prototip kaliti bu mexanizmdan ham
     oʻtib ketardi va savol BUTUNLAY oʻchardi. */
  const { p } = env();
  p.initial(Q_PROTO);
  p.save({ savedIds: [0, 2], wrongIds: [], signsAnswered: [], tasksAwarded: [] }, Q_PROTO);
  p.flush();

  const KICHIK = [{ ref: '#001', topic: 'Svetofor', text: 'Oddiy savol' }];
  p.initial(KICHIK);
  p.save({ savedIds: [0], wrongIds: [], signsAnswered: [], tasksAwarded: [] }, KICHIK);
  p.flush();

  const back = p.initial(Q_PROTO);
  assert.deepEqual(plain(back.savedIds).sort((a, b) => a - b), [0, 2],
    '"constructor" savoli bank qaytganda oʻz joyiga tushishi kerak');
});


test('"constructor" nomli mavzu hisobdan tushib qolmaydi', () => {
  const { p } = env();
  for (let i = 0; i < 4; i++) p.answered({ ref: '#' + i, topic: 'constructor', correct: i < 2 });
  const t = p.topicStats();
  assert.equal(t.length, 1);
  assert.equal(t[0].name, 'constructor');
  assert.equal(t[0].pct, 50, 'hisob NaN boʻlmasligi kerak');
});


/* ── Ball: bir savol uchun bir marta ─────────────────────────────────
   Ilgari har to'g'ri javobga rejimdan qat'i nazar +10 berilardi.
   Marafon poolni aylantiradi, ya'ni o'sha savollarni qayta-qayta
   yechib ballni cheksiz oshirish mumkin edi. Ball esa ligani
   belgilaydi. */

test('takror toʻgʻri javob ball toʻlamaydi', () => {
  const { p } = env();
  assert.equal(p.answered({ ref: '#001', correct: true }).award, 10);
  assert.equal(p.answered({ ref: '#001', correct: true }).award, 0, 'ikkinchi marta — 0');
  assert.equal(p.answered({ ref: '#001', correct: true }).award, 0);
  assert.equal(p.answered({ ref: '#002', correct: true }).award, 10, 'yangi savol — 10');
});


test('notoʻgʻri javob ball bermaydi va savolni "toʻlangan" qilmaydi', () => {
  const { p } = env();
  assert.equal(p.answered({ ref: '#001', correct: false }).award, 0);
  assert.equal(p.answered({ ref: '#001', correct: true }).award, 10,
    'xato qilib keyin toʻgʻri yechgan odam ballni olishi kerak');
});


test('marafon aylanishi ballni oshirmaydi', () => {
  const { p } = env();
  let jami = 0;
  // Marafon poolni aylantiradi: o'sha 5 savol qayta-qayta keladi.
  for (let k = 0; k < 20; k++) {
    for (let i = 0; i < 5; i++) {
      jami += p.answered({ ref: '#' + i, mode: 'marathon', correct: true }).award;
    }
  }
  assert.equal(jami, 50, '100 ta javob, lekin faqat 5 ta noyob savol');
});


test('toʻlangan savollar roʻyxati diskda saqlanadi', () => {
  const { p, disk } = env();
  p.answered({ ref: '#001', correct: true });
  p.flush();
  assert.deepEqual(plain(disk().scored), ['#001']);
});


test('qayta ochilganda ham takror toʻlanmaydi', () => {
  const saved = saqlangan({ scored: ['#001', '#002'] });
  const { p } = env(saved);
  assert.equal(p.answered({ ref: '#001', correct: true }).award, 0);
  assert.equal(p.answered({ ref: '#003', correct: true }).award, 10);
});


/* ── Imtihon tayyorligi: faqat imtihon rejimidagi javoblar ───────── */

test('tayyorlik "Xatolarim" takrorlaridan oshmaydi', () => {
  const { p } = env();
  // Imtihonda 10 ta javob, 5 tasi toʻgʻri → 50%
  for (let i = 0; i < 10; i++) p.answered({ ref: '#' + i, mode: 'exam', correct: i < 5 });
  assert.equal(p.stats().examAnswered, 10);
  assert.equal(p.stats().examAccuracy, 50);

  // Endi bitta savolni "Xatolarim" da 20 marta toʻgʻri yechamiz.
  for (let i = 0; i < 20; i++) p.answered({ ref: '#001', mode: 'mistakes', correct: true });

  assert.equal(p.stats().examAnswered, 10, 'imtihon kesimi oʻzgarmasligi kerak');
  assert.equal(p.stats().examAccuracy, 50, 'tayyorlik takrorlardan oshmasligi kerak');
  assert.ok(p.stats().accuracy > 50, 'umrbod aniqlik esa oshadi — u boshqa raqam');
});


test('rejim koʻrsatilmagan javob imtihon deb hisoblanadi', () => {
  const { p } = env();
  p.answered({ ref: '#001', correct: true });
  assert.equal(p.stats().examAnswered, 1);
});


/* ── IQ testlari tarixi va mashq darajasi (src/iq/CONTRACT.md §5) ────
   recordTest / testHistory / levelFor. Natija — 30 savollik mehnat:
   diskka darhol yoziladi, ilova yopilsa ham yo'qolmaydi. Diskdagi
   buzuq yozuv ilovani yiqitmaydi — faqat o'sha yozuv tashlanadi. */

/* Result shaklidagi natija (IQ.session.result() dagidek). */
function natija(x) {
  return Object.assign({
    mode: 'test', n: 30, correct: 20, durationMs: 600000,
    theta: 0.4, se: 0.44, iq: 106, lo: 95, hi: 117, reliable: true,
    byType: { matrix: { n: 11, correct: 8 }, series: { n: 7, correct: 5 },
              spatial: { n: 6, correct: 4 }, verbal: { n: 6, correct: 3 } },
    items: [],
  }, x);
}

/* Bir turdagi javoblar: n ta savol, b qiyinlikda, hammasi ok. */
const javoblar = (type, n, b, ok) =>
  Array.from({ length: n }, (_, i) => ({ id: type + ':' + i, type, level: 5, b, k: 4, correct: ok, ms: 1000 }));


test('recordTest: diskka DARHOL yoziladi, qayta ochilganda qaytadi (eskidan yangiga)', () => {
  const a = env();
  a.io.writes = 0;
  assert.equal(a.p.recordTest(natija({ iq: 110, lo: 99, hi: 121 })), true);
  assert.equal(a.io.writes, 1, 'flush kutilmaydi — bitta yozuv darhol');
  assert.equal(a.disk().tests.length, 1);
  a.p.recordTest(natija({ iq: 120, lo: 109, hi: 131, reliable: false }));

  const b = env(a.raw());
  const h = b.p.testHistory();
  assert.deepEqual(plain(h.map(x => x.iq)), [110, 120], 'eskidan yangiga');
  const e = h[0];
  for (const k of ['at', 'iq', 'lo', 'hi', 'n', 'correct', 'reliable', 'byType']) assert.ok(k in e, k + ' yo\'q');
  assert.ok(e.at > 0 && e.at <= Date.now());
  assert.deepEqual(plain(e.byType), { matrix: { n: 11, correct: 8 }, series: { n: 7, correct: 5 },
                                      spatial: { n: 6, correct: 4 }, verbal: { n: 6, correct: 3 } });
  assert.equal(h[1].reliable, false);
  assert.equal(e.theta, 0.4);
  assert.equal(e.se, 0.44);
});


test('tarix ≤ 100 — eng eskisi tushadi (xotirada ham, diskda ham)', () => {
  const a = env();
  for (let i = 0; i < 130; i++) a.p.recordTest(natija({ n: i + 1, correct: 0 }));
  const h = a.p.testHistory();
  assert.equal(h.length, 100);
  assert.equal(h[0].n, 31, 'eng qadimgi 30 tasi tashlangan');
  assert.equal(h[99].n, 130);
  assert.equal(a.disk().tests.length, 100);
  assert.equal(env(a.raw()).p.testHistory().length, 100);
});


test('recordTest: buzuq yoki bo\'sh natija yozilmaydi, yiqitmaydi', () => {
  const { p } = env();
  const yomon = [null, undefined, 'x', 42, {}, natija({ n: 0, correct: 0 }), natija({ iq: 'x' }),
    natija({ iq: 200 }), natija({ lo: 120 }), natija({ hi: 90 }), natija({ correct: 31 }),
    natija({ n: 2.5 }), natija({ iq: NaN })];
  for (const r of yomon) assert.equal(p.recordTest(r), false, JSON.stringify(r));
  assert.deepEqual(plain(p.testHistory()), []);
  /* byType dagi buzuq tur tashlanadi, natija esa yoziladi. */
  assert.equal(p.recordTest(natija({ byType: { matrix: { n: 3, correct: 9 }, series: { n: 2, correct: 1 }, __proto__: null } })), true);
  assert.deepEqual(plain(p.testHistory()[0].byType), { series: { n: 2, correct: 1 } });
});


test('buzuq disk: faqat buzuq yozuv tashlanadi, qolgan progress va tarix saqlanadi', () => {
  const good = { at: 1700000000000, iq: 104, lo: 93, hi: 115, n: 30, correct: 19, reliable: true,
                 theta: 0.27, se: 0.45, byType: { matrix: [11, 7] } };
  const raw = JSON.stringify(saqlangan({
    totalAnswered: 12,
    tests: [
      good, null, 'satr', 7, [],
      Object.assign({}, good, { iq: 999 }),
      Object.assign({}, good, { at: -5 }),
      Object.assign({}, good, { lo: 120 }),
      Object.assign({}, good, { correct: 40 }),
      Object.assign({}, good, { theta: 'x', se: -1, reliable: 'ha' }),
      Object.assign({}, good, { byType: 'emas' }),
      Object.assign({}, good, { iq: 130, lo: 120, hi: 140 }),
    ],
    iqRecent: { matrix: [[0.5, 4, 1], ['x', 4, 1], [0.1, 99, 1], [0.2, 4, 2], [99, 4, 1], 'x'], series: 'emas' },
  })).replace('"byType":{"matrix":[11,7]}}', '"byType":{"matrix":[11,7],"__proto__":[1,1],"constructor":[3,1],"yomon":[2,5]}}');
  const { p } = env(raw);
  const h = p.testHistory();
  assert.equal(p.stats().answered, 12, 'eski progress yo\'qolmaydi');
  assert.deepEqual(plain(h.map(x => x.iq)), [104, 104, 104, 130], 'faqat yaroqlilari');
  assert.deepEqual(plain(h[0].byType), { matrix: { n: 11, correct: 7 }, constructor: { n: 3, correct: 1 } });
  assert.equal(Object.getPrototypeOf(h[0].byType), Object.getPrototypeOf(h[1].byType), '__proto__ prototipga aylanmaydi');
  assert.deepEqual([h[1].theta, h[1].se, h[1].reliable], [null, null, false]);
  assert.deepEqual(plain(h[2].byType), {});
  assert.equal(typeof p.levelFor('matrix'), 'number');

  /* Butunlay boshqa shakldagi maydonlar. */
  for (const tests of ['emas', 42, { a: 1 }, null]) {
    const e = env(saqlangan({ tests, iqRecent: [1, 2, 3], totalAnswered: 5 }));
    assert.deepEqual(plain(e.p.testHistory()), []);
    assert.equal(e.p.levelFor('matrix'), 5);
    assert.equal(e.p.stats().answered, 5);
  }
  /* Qo'lda to'ldirilgan ulkan tarix ham 100 ga kesiladi. */
  const big = env(saqlangan({ tests: Array.from({ length: 500 }, (_, i) => Object.assign({}, good, { n: i + 1, correct: 0 })) }));
  assert.equal(big.p.testHistory().length, 100);
  assert.equal(big.p.testHistory()[0].n, 401);
});


test('eski yozuv (tests maydonisiz): tarix bo\'sh, progress saqlanadi; yangisi qo\'shiladi', () => {
  const a = env(saqlangan({ totalAnswered: 12, totalCorrect: 9, points: 40 }));
  assert.deepEqual(plain(a.p.testHistory()), []);
  assert.equal(a.p.levelFor('matrix'), 5);
  a.p.recordTest(natija());
  const d = a.disk();
  assert.equal(d.v, 1, 'versiya o\'zgarmaydi — eski progress nolga tushmasin');
  assert.equal(d.totalAnswered, 12);
  assert.equal(d.points, 40);
  assert.equal(d.tests.length, 1);
});


test('testHistory — nusxa: chaqiruvchi o\'zgartirsa ham saqlangan tarix buzilmaydi', () => {
  const { p } = env();
  p.recordTest(natija());
  const h = p.testHistory();
  h[0].iq = 1; h[0].byType.matrix.n = 999; h.push({});
  assert.equal(p.testHistory().length, 1);
  assert.equal(p.testHistory()[0].iq, 106);
  assert.equal(p.testHistory()[0].byType.matrix.n, 11);
});


test('save() IQ tarixini o\'chirmaydi; reset() tozalaydi', () => {
  const { p, disk } = env(undefined, { iq: true });
  p.recordTest(natija({ items: javoblar('matrix', 10, 2, true) }));
  p.initial([]);
  p.save({ points: 5, savedIds: [], wrongIds: [], signsAnswered: [], tasksAwarded: [] }, []);
  p.flush();
  assert.equal(disk().tests.length, 1);
  assert.equal(disk().points, 5);
  assert.notEqual(p.levelFor('matrix'), 5);
  p.reset();
  assert.deepEqual(plain(p.testHistory()), []);
  assert.equal(p.levelFor('matrix'), 5);
});


/* ── levelFor ─────────────────────────────────────────────────────── */

test('levelFor: ma\'lumot yo\'q — 5; tur bo\'yicha alohida', () => {
  const { p, win } = env(undefined, { iq: true });
  assert.equal(p.levelFor('matrix'), 5);
  assert.equal(p.levelFor(undefined), 5);
  assert.equal(p.levelFor(42), 5);
  assert.equal(p.levelFor('constructor'), 5, 'prototip nomi funksiya qaytarmaydi');

  const items = javoblar('matrix', 12, 2, true).concat(javoblar('series', 12, -2, false));
  p.recordTest(natija({ items }));
  const m = p.levelFor('matrix'), s = p.levelFor('series');
  assert.ok(m >= 8, 'qiyin matritsalarni yechgan — yuqori daraja: ' + m);
  assert.ok(s <= 3, 'oson qatorlarda xato — past daraja: ' + s);
  assert.equal(p.levelFor('spatial'), 5, 'boshqa tur ta\'sirlanmaydi');

  /* Hisob — IQ.score bilan aynan bir xil: EAP → nextLevel (tasodifsiz). */
  const S = win.IQ.score;
  const want = S.nextLevel(S.estimate(items.filter(x => x.type === 'matrix')).theta);
  assert.equal(m, want);
});


test('levelFor: kam ma\'lumot o\'rtaga tortiladi — bitta javob 10 ga otib yubormaydi', () => {
  const { p } = env(undefined, { iq: true });
  p.recordPractice({ mode: 'practice', items: javoblar('verbal', 1, 2.25, true) });
  const lv = p.levelFor('verbal');
  assert.ok(lv >= 5 && lv <= 6, 'bitta to\'g\'ri javob: ' + lv);
});


test('levelFor: faqat so\'nggi 30 javob — mashq qilib o\'zgargan odam eski natijaga bog\'lanmaydi', () => {
  const { p, disk } = env(undefined, { iq: true });
  p.recordTest(natija({ items: javoblar('matrix', 30, 2, true) }));
  const before = p.levelFor('matrix');
  p.recordPractice({ mode: 'practice', items: javoblar('matrix', 30, -1, false) });
  const after = p.levelFor('matrix');
  assert.ok(before >= 8 && after <= 3, `${before} → ${after}`);
  p.flush();
  assert.equal(disk().iqRecent.matrix.length, 30, 'diskda ham 30 dan oshmaydi');
});


test('mashq natijasi tarixga tushmaydi, lekin levelFor ga ta\'sir qiladi (recordTest orqali ham)', () => {
  const { p, raw } = env(undefined, { iq: true });
  assert.equal(p.recordTest(natija({ mode: 'practice', n: 10, correct: 10, reliable: false,
                                     items: javoblar('spatial', 10, 1.5, true) })), true);
  assert.deepEqual(plain(p.testHistory()), [], 'mashq — IQ testi emas');
  const lv = p.levelFor('spatial');
  assert.ok(lv > 5, 'mashq levelFor ni yangiladi: ' + lv);
  assert.equal(p.recordPractice({ items: [] }), false);
  assert.equal(p.recordPractice(null), false);
  p.flush();
  assert.equal(env(raw(), { iq: true }).p.levelFor('spatial'), lv, 'qayta ochilganda ham');
});


test('levelFor: IQ yadrosi yo\'q yoki xato bersa — 5, yiqilmaydi', () => {
  const a = env();
  a.p.recordTest(natija({ items: javoblar('matrix', 10, 2, true) }));
  assert.equal(a.p.levelFor('matrix'), 5, 'IQ.score yuklanmagan');
  a.win.IQ = { score: { estimate() { throw new Error('x'); }, nextLevel() { return 7; } } };
  assert.equal(a.p.levelFor('matrix'), 5);
  a.win.IQ = { score: { estimate: () => ({ theta: 0 }), nextLevel: () => 42 } };
  assert.equal(a.p.levelFor('matrix'), 5, 'diapazondan tashqari — 5');
});


test('integratsiya: haqiqiy IQ.session natijasi yoziladi va o\'qiladi', () => {
  const { p, win } = env(undefined, { iq: true });
  const IQ = win.IQ;
  IQ.register({
    type: 't1', label: { uz: 't1', ru: 't1' },
    generate(seed, level) {
      const r = IQ.rng(seed), c = r.int(4);
      return {
        id: 't1:' + level + ':' + seed, type: 't1', level, b: IQ.levelToB(level),
        prompt: { uz: 'Qaysi?', ru: 'Какой?' }, stimulus: { kind: 'text', uz: 's' + seed, ru: 's' + seed },
        options: [0, 1, 2, 3].map(i => ({ kind: 'text', uz: seed + '/' + i, ru: seed + '/' + i })),
        correct: c, explain: { uz: 'q', ru: 'q' },
      };
    },
  });
  const s = IQ.session.create({ mode: 'test', seed: 5 });
  while (!s.done) { const it = s.current(); s.answer(it.level <= 7 ? it.correct : -1, 1000); }
  const r = s.result();
  assert.equal(p.recordTest(r), true);
  const h = p.testHistory()[0];
  assert.deepEqual([h.iq, h.lo, h.hi, h.n, h.correct, h.reliable], [r.iq, r.lo, r.hi, r.n, r.correct, r.reliable]);
  assert.deepEqual(plain(h.byType), plain(r.byType));
  const lv = p.levelFor('t1');
  assert.ok(lv >= 6 && lv <= 9, '7-darajagacha yechadigan odam: ' + lv);
  /* Mashq shu darajadan boshlanadi. */
  win.nzProgress = p;
  assert.equal(IQ.session.create({ mode: 'practice', types: ['t1'], seed: 1 }).current().level, lv);
});
