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

/* extra — boshqa kalitlar: { 'nz-iq-tests': qiymat } (satr yoki obyekt). */
function env(saved, extra) {
  const store = new Map();
  if (saved !== undefined) store.set(KEY, typeof saved === 'string' ? saved : JSON.stringify(saved));
  Object.keys(extra || {}).forEach(k => {
    const v = extra[k];
    store.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  });

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
  return {
    p: ctx.window.nzProgress, io, ctx,
    disk: () => JSON.parse(store.get(KEY) || 'null'),
    queue: () => JSON.parse(store.get('nz-attempts') || 'null'),
    raw: k => store.get(k),
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


/* ── IQ testi natijalari (CONTRACT §5) ─────────────────────────────── */

const TESTS_KEY = 'nz-iq-tests';

/* IQ.session Result'iga o'xshash obyekt. items — [tur, daraja, to'g'rimi]. */
function natija(x, items) {
  const its = (items || []).map(([type, level, correct], i) => ({
    id: type + ':' + level + ':' + i, type, level, b: (level - 5.5) * 0.5, k: 4,
    answer: correct ? 0 : 1, correct, ms: 1000,
  }));
  const byType = {};
  its.forEach(it => {
    const b = byType[it.type] || (byType[it.type] = { n: 0, correct: 0 });
    b.n++; if (it.correct) b.correct++;
  });
  return Object.assign({
    mode: 'test', n: its.length, correct: its.filter(i => i.correct).length, durationMs: 1000 * its.length,
    theta: 0.4, se: 0.43, iq: 106, lo: 95, hi: 117, reliable: its.length >= 20,
    byType, items: its,
  }, x);
}

const qator = (type, level, n, ok) => Array.from({ length: n }, (_, i) => [type, level, i < ok]);


test('IQ tarixi: bo\'sh boshlanadi, levelFor — 3', () => {
  const { p } = env();
  assert.deepEqual(plain(p.testHistory()), []);
  assert.equal(p.levelFor('series'), 3);
  assert.equal(p.levelFor('matrix'), 3);
  assert.equal(p.levelFor(undefined), 3);
});


test('recordTest diskka yozadi, qayta ochilganda tarix joyida', () => {
  const { p, raw } = env();
  const before = Date.now();
  const saved = p.recordTest(natija({}, qator('series', 6, 12, 8).concat(qator('spatial', 4, 12, 5))));
  assert.ok(raw(TESTS_KEY), 'darhol yoziladi — flush kutilmaydi');
  assert.equal(saved.iq, 106);

  const h = p.testHistory();
  assert.equal(h.length, 1);
  const e = h[0];
  assert.deepEqual(Object.keys(e).sort(),
    ['at', 'byType', 'correct', 'flag', 'hi', 'hiOpen', 'iq', 'lo', 'loOpen', 'mode', 'n', 'reliable', 'se', 'theta']);
  assert.ok(e.at >= before && e.at <= Date.now());
  assert.deepEqual(plain(e), plain({ at: e.at, mode: 'test', iq: 106, lo: 95, hi: 117, loOpen: false, hiOpen: false,
    n: 24, correct: 13, reliable: true, flag: null,
    byType: { series: { n: 12, correct: 8 }, spatial: { n: 12, correct: 5 } }, theta: 0.4, se: 0.43 }));

  // Qayta ochish
  const again = env(undefined, { [TESTS_KEY]: raw(TESTS_KEY) });
  assert.deepEqual(plain(again.p.testHistory()), plain(h));
  assert.equal(again.p.levelFor('series'), p.levelFor('series'));
});


test('testHistory eskidan yangiga, eng koʻpi 100 ta', () => {
  const { p, raw } = env();
  for (let i = 0; i < 105; i++) p.recordTest(natija({ iq: 60 + i, lo: 50 + i, hi: 70 + i }));
  const h = p.testHistory();
  assert.equal(h.length, 100);
  assert.equal(h[0].iq, 65, 'eng eski 5 tasi tashlangan');
  assert.equal(h[99].iq, 164);
  for (let i = 1; i < h.length; i++) assert.ok(h[i].at >= h[i - 1].at);
  assert.equal(JSON.parse(raw(TESTS_KEY)).tests.length, 100);
});


test('testHistory nusxa qaytaradi — chaqiruvchi xotirani buzolmaydi', () => {
  const { p } = env();
  p.recordTest(natija({}, qator('series', 5, 3, 3)));
  const h = p.testHistory();
  h[0].iq = 999; h[0].byType.series.n = 999; h.push({});
  assert.equal(p.testHistory().length, 1);
  assert.equal(p.testHistory()[0].iq, 106);
  assert.equal(p.testHistory()[0].byType.series.n, 3);
});


test('recordTest: yaroqsiz natija yozilmaydi, yiqilmaydi', () => {
  const { p } = env();
  for (const bad of [null, undefined, 5, 'x', {}, { iq: 'yuz', lo: 1, hi: 2, n: 1 },
                     natija({ iq: NaN }), natija({ n: -1 })]) {
    assert.equal(p.recordTest(bad), null);
  }
  assert.equal(p.testHistory().length, 0);
  // Qisman buzuq: correct > n, byType axlat, items axlat — tozalanadi.
  p.recordTest(natija({ n: 3, correct: 10, reliable: 'ha', theta: 'x',
    byType: { series: { n: 3, correct: 7 }, __proto__x: 1, '': { n: 1 } },
    items: [null, { type: 'series', level: 99, correct: true }, { type: 'series', level: 4, correct: true }] }));
  const e = plain(p.testHistory()[0]);
  assert.equal(e.correct, 3);
  assert.equal(e.reliable, false, 'faqat aynan true');
  assert.equal(e.theta, null);
  assert.deepEqual(e.byType, { series: { n: 3, correct: 3 } });
  assert.equal(p.levelFor('series'), 5, 'faqat yaroqli yozuv (4-daraja, to\'g\'ri) hisobga olindi');
});


test('buzilgan disk: tarix bo\'sh, ilova yiqilmaydi', () => {
  const cases = [
    ['{buzuq json', 3], ['"satr"', 3], ['[1,2]', 3], [{ v: 2, tests: [] }, 3],
    [{ v: 1, tests: 'x', recent: 5 }, 3],
    // "constructor" — diskda oddiy kalit; prototipsiz obyektda xavfsiz tur nomi.
    [{ v: 1, tests: [null, { iq: 1 }], recent: { series: 'x', constructor: [[5, 1]] } }, 6],
  ];
  for (const [junk, ctor] of cases) {
    const { p } = env(undefined, { [TESTS_KEY]: junk });
    assert.deepEqual(plain(p.testHistory()), []);
    assert.equal(p.levelFor('series'), 3);
    assert.equal(p.levelFor('constructor'), ctor);
  }
  const { p } = env(undefined, { [TESTS_KEY]: { v: 1, tests: [{ at: 5, iq: 100, lo: 90, hi: 110, n: 20, correct: 10 }],
    recent: { series: [[5, 1], [11, 1], [0, 0], [5, 2], 'x', [7, 0]] } } });
  assert.equal(p.testHistory().length, 1);
  assert.equal(p.testHistory()[0].mode, 'test');
  // Yaroqli juftliklar: [5,1], [7,0] → o'rtacha 6, ulush 50% → 6
  assert.equal(p.levelFor('series'), 6);
});


/* ── v1.1: kunlik hisoblagich, yozuvni tejash, sozlamalar ─────────── */

const today = () => {
  const d = new Date(Date.now() - 4 * 3600000);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

test('save: kechagi answeredCount bugunga yozilmaydi (countDay)', () => {
  const { p, disk } = env();
  p.save({ answeredCount: 7, countDay: '2000-01-01' }, []);
  p.flush();
  assert.equal(disk().answered, 0, 'eski kunning soni — 0');
  assert.equal(disk().day, today());
  p.save({ answeredCount: 3, countDay: today() }, []);
  p.flush();
  assert.equal(disk().answered, 3);
  p.save({ answeredCount: 4 }, []);                 // countDay yo'q — eski xulq
  p.flush();
  assert.equal(disk().answered, 4);
  // Diskda kechagi kun: yuklanganda 0 dan.
  const old = env(saqlangan({ day: '2000-01-01', answered: 9 }));
  assert.equal(old.p.initial([]).answeredCount, 0);
});


test('save: hech narsa o\'zgarmasa diskka yozilmaydi (o\'yin tick\'lari)', () => {
  const { p, io } = env();
  const st = { points: 40, answeredCount: 2, countDay: today(), wrongIds: [], savedIds: [], soundOn: true, notifOn: false };
  p.save(st, []); p.flush();
  const w = io.writes;
  for (let i = 0; i < 100; i++) { p.save(Object.assign({}, st, { game: { tick: i } }), []); p.flush(); }
  assert.equal(io.writes, w, '100 ta o\'zgarishsiz save — 0 ta yozuv');
  p.save(Object.assign({}, st, { points: 50 }), []); p.flush();
  assert.equal(io.writes, w + 1);
});


test('save: nzSettings bor bo\'lsa soundOn/notifOn qayta yozilmaydi', () => {
  const { p, disk, ctx } = env(saqlangan({ day: today(), soundOn: false, notifOn: true }));
  ctx.window.nzSettings = { get() { return {}; } };
  p.save({ points: 5, soundOn: true, notifOn: false, countDay: today() }, []);
  p.flush();
  assert.equal(disk().soundOn, false, 'saqlangan qiymat o\'zgarmaydi');
  assert.equal(disk().notifOn, true);
  assert.equal(disk().points, 5);
  // nzSettings yo'q (eski build) — eski xulq.
  const b = env();
  b.p.save({ soundOn: true, notifOn: false }, []); b.p.flush();
  assert.equal(b.disk().soundOn, true);
  assert.equal(b.disk().notifOn, false);
  // initial() ko'chirish uchun qiymatni baribir beradi.
  assert.equal(env(saqlangan({ soundOn: false })).p.initial([]).soundOn, false);
});


test('activeToday / markActive: o\'yin streak\'ni yuritadi, javob hisoblagichlariga tegmaydi', () => {
  const { p, disk } = env(saqlangan({ streak: 4, longest: 4, lastActiveDay: '2000-01-01' }));
  assert.equal(p.activeToday(), false);
  assert.equal(p.markActive().streak, 1, 'uzilgan streak 1 dan');
  assert.equal(p.activeToday(), true);
  assert.equal(p.markActive().streak, null, 'kuniga bir marta');
  assert.equal(p.streak(), 1);
  assert.equal(p.stats().answered, 0, 'totalAnswered o\'zgarmaydi');
  assert.equal(p.queued(), 0, 'navbatga tushmaydi');
  p.flush();
  assert.equal(disk().lastActiveDay, today());
  // Kecha faol bo'lgan — davom etadi.
  const y = new Date(Date.now() - 4 * 3600000 - 86400000);
  const yk = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
  const q = env(saqlangan({ streak: 4, longest: 4, lastActiveDay: yk })).p;
  assert.equal(q.markActive().streak, 5);
  assert.equal(q.stats().longest, 5);
  // answered() ham activeToday ni yoqadi.
  const r = env().p;
  r.answered({ ref: 'x', correct: true, mode: 'practice' });
  assert.equal(r.activeToday(), true);
});


/* ── v1.1: IQ tarixi ───────────────────────────────────────────────── */

test('mashq natijalari IQ testlarini tarixdan siqib chiqarmaydi (alohida chegara)', () => {
  const { p, raw } = env();
  p.recordTest(natija({ iq: 131, lo: 120, hi: 142 }, qator('series', 6, 24, 18)));
  for (let i = 0; i < 150; i++) p.recordTest(natija({ mode: 'practice', reliable: false }, qator('series', 5, 1, 1)));
  const h = p.testHistory();
  assert.equal(h.filter(x => x.mode === 'test').length, 1, 'test joyida');
  assert.equal(h.filter(x => x.mode === 'practice').length, 30, 'mashq ≤ 30');
  assert.deepEqual(plain(p.testStats()), { count: 1, best: { at: h[0].at, iq: 131, lo: 120, hi: 142, loOpen: false, hiOpen: false } });
  // Qayta ochilganda ham.
  const again = env(undefined, { [TESTS_KEY]: raw(TESTS_KEY) }).p;
  assert.equal(again.testHistory().filter(x => x.mode === 'test').length, 1);
  assert.equal(again.testStats().count, 1);
  // Eski disk: 100 ta aralash yozuv — yuklanganda ham har rejimga o'z chegarasi.
  const rows = [{ at: 1, mode: 'test', iq: 120, lo: 110, hi: 130, n: 30, correct: 20, reliable: true }];
  for (let i = 0; i < 99; i++) rows.push({ at: 2 + i, mode: 'practice', iq: 100, lo: 90, hi: 110, n: 10, correct: 5 });
  const old = env(undefined, { [TESTS_KEY]: { v: 1, tests: rows, recent: {} } }).p;
  assert.equal(old.testHistory().length, 31);
  assert.equal(old.testHistory()[0].iq, 120);
  assert.equal(old.testStats().best.iq, 120);
});


test('testStats: count va best 100 tadan keyin ham yo\'qolmaydi; best — faqat ishonchli', () => {
  const { p } = env();
  p.recordTest(natija({ iq: 140, lo: 130, hi: 145, hiOpen: true, loOpen: false }, qator('series', 9, 24, 20)));
  p.recordTest(natija({ iq: 145, lo: 140, hi: 145, reliable: false, flag: 'fast' }, qator('series', 9, 24, 24)));
  for (let i = 0; i < 110; i++) p.recordTest(natija({ iq: 100 + (i % 5) }, qator('series', 5, 24, 15)));
  const st = p.testStats();
  assert.equal(st.count, 112);
  assert.equal(st.best.iq, 140, 'ishonchsiz 145 hisoblanmaydi, tarixdan chiqqan 140 esa saqlanadi');
  assert.equal(st.best.hiOpen, true);
  assert.equal(p.testHistory().length, 100);
  st.best.iq = 1;
  assert.equal(p.testStats().best.iq, 140, 'nusxa');
  p.reset();
  assert.deepEqual(plain(p.testStats()), { count: 0, best: null });
});


test('eski (flag\'siz) yozuv: tasodif darajasidagi "IQ 55" ishonchsiz deb qayta baholanadi', () => {
  const rows = [
    { at: 1, mode: 'test', iq: 55, lo: 55, hi: 55, n: 30, correct: 6, reliable: true, theta: -3.69, se: 0.26 },
    { at: 2, mode: 'test', iq: 92, lo: 81, hi: 103, n: 30, correct: 16, reliable: true, theta: -0.5, se: 0.4 },
    { at: 3, mode: 'test', iq: 145, lo: 142, hi: 145, n: 30, correct: 30, reliable: true, theta: 3.43, se: 0.38 },
    { at: 4, mode: 'test', iq: 60, lo: 55, hi: 66, n: 30, correct: 11, reliable: true },
    { at: 5, mode: 'test', iq: 98, lo: 80, hi: 115, n: 12, correct: 6, reliable: false },
  ];
  const h = env(undefined, { [TESTS_KEY]: { v: 1, tests: rows, recent: {} } }).p.testHistory();
  assert.deepEqual(plain(h.map(x => [x.reliable, x.flag])),
    [[false, 'chance'], [true, null], [true, null], [false, 'chance'], [false, 'short']]);
  assert.equal(h[0].loOpen, true, 'θ, se dan: qisilmagan 38–51');
  assert.equal(h[2].hiOpen, true, 'θ, se dan: qisilmagan 142–161');
  assert.equal(h[2].loOpen, false);
  assert.equal(h[3].loOpen, true, 'θ yo\'q — chegaradan');
  // Yangi yozuv flag bilan: berilgani olinadi, reliable ⇔ flag === null.
  const { p } = env();
  const e = p.recordTest(natija({ reliable: true, flag: 'chance' }, qator('series', 2, 24, 8)));
  assert.deepEqual([e.reliable, e.flag], [false, 'chance']);
  const f = p.recordTest(natija({ mode: 'practice', reliable: false, flag: null }));
  assert.deepEqual([f.reliable, f.flag], [false, 'practice']);
});


test('test javobi mavzu kesimiga javob paytida emas, recordTest da tushadi', () => {
  const { p } = env();
  p.answered({ ref: 'matrix:3:1', correct: false, mode: 'test', topic: 'matrix' });
  p.answered({ ref: 'series:3:1', correct: true, mode: 'test', topic: 'series' });
  assert.deepEqual(plain(p.topicStats(1)), [], 'to\'xtatilgan test to\'g\'ri/xatoni sezdirmaydi');
  assert.equal(p.stats().answered, 2, 'umumiy hisob va streak yuradi');
  assert.equal(p.streak(), 1);
  p.recordTest(natija({}, [['matrix', 3, false], ['series', 3, true], ['series', 4, true]]));
  assert.deepEqual(plain(p.topicStats(1).map(t => [t.name, t.n, t.pct])), [['matrix', 1, 0], ['series', 2, 100]]);
  // Mashq javobi — darhol, recordTest ikkinchi marta qo'shmaydi.
  p.answered({ ref: 'verbal:3:1', correct: true, mode: 'practice', topic: 'verbal' });
  p.recordTest(natija({ mode: 'practice' }, [['verbal', 3, true]]));
  assert.equal(p.topicStats(1).find(t => t.name === 'verbal').n, 1);
});


test('levelFor sovuq start: IQ bundle bilan hamma turlarning javoblari birga baholanadi', () => {
  const IQSRC = ['src/iq/rng.js', 'src/iq/index.js', 'src/iq/score.js']
    .map(f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8'));
  const withIQ = () => {
    const e = env();
    IQSRC.forEach(src => vm.runInContext(src, e.ctx));   // window.IQ
    return e.p;
  };
  // Kuchli odam: 4 turda 3–4-darajada 12/12 to'g'ri (har turga 3 ta).
  const strong = [];
  ['matrix', 'series', 'spatial', 'verbal'].forEach(t => { strong.push([t, 3, true], [t, 4, true], [t, 4, true]); });
  const p = withIQ();
  p.recordTest(natija({ mode: 'practice' }, strong));
  const lv = p.levelFor('series');
  assert.ok(lv >= 7, 'kuchli odam tez ko\'tariladi: ' + lv);
  const plainRule = env().p;
  plainRule.recordTest(natija({ mode: 'practice' }, strong));
  assert.equal(plainRule.levelFor('series'), 5, 'IQ yo\'q — eski qoida (o\'rtacha 4 + 1)');
  // Zaif odam 3-darajada ko'p xato — pastga.
  const weak = [];
  ['matrix', 'series', 'spatial', 'verbal'].forEach(t => { weak.push([t, 3, false], [t, 3, true], [t, 3, false]); });
  const w = withIQ();
  w.recordTest(natija({ mode: 'practice' }, weak));
  assert.ok(w.levelFor('series') <= 3, 'zaif: ' + w.levelFor('series'));
  // Kam javob (< 8) — eski qoida; javobsiz tur — sovuq start umumiy javobdan.
  const few = withIQ();
  few.recordTest(natija({ mode: 'practice' }, [['series', 4, true], ['series', 4, true]]));
  assert.equal(few.levelFor('series'), 5);
  assert.equal(few.levelFor('matrix'), 3);
  assert.ok(p.levelFor('matrix') >= 7, 'shu turda javob yo\'q, lekin umumiy baho bor');
  // O'z javobi ≥ 8 — faqat o'zinikidan.
  const own = withIQ();
  own.recordTest(natija({ mode: 'practice' }, qator('series', 6, 10, 6).concat(qator('matrix', 2, 10, 10))));
  assert.equal(own.levelFor('series'), 6);
});


test('levelFor: oxirgi javoblar darajasi, ulush ≥ 80% → +1, < 50% → −1', () => {
  const { p } = env();
  p.recordTest(natija({ mode: 'practice' }, qator('series', 5, 10, 9)));       // 90%
  assert.equal(p.levelFor('series'), 6);
  p.recordTest(natija({ mode: 'practice' }, qator('series', 6, 10, 6)));       // 60%
  assert.equal(p.levelFor('series'), 6, 'faqat oxirgi 10 ta — oldingi 90% hisobga olinmaydi');
  p.recordTest(natija({ mode: 'practice' }, qator('series', 6, 10, 3)));       // 30%
  assert.equal(p.levelFor('series'), 5);

  // Har tur alohida.
  p.recordTest(natija({}, qator('spatial', 8, 5, 5)));
  assert.equal(p.levelFor('spatial'), 9);
  assert.equal(p.levelFor('series'), 5);
  assert.equal(p.levelFor('matrix'), 3);

  // Chegaralar.
  p.recordTest(natija({}, qator('verbal', 10, 10, 10)));
  assert.equal(p.levelFor('verbal'), 10);
  p.recordTest(natija({}, qator('matrix', 1, 10, 0)));
  assert.equal(p.levelFor('matrix'), 1);

  // Aralash darajalar: o'rtachasi yaxlitlanadi.
  const q = env().p;
  q.recordTest(natija({}, [['series', 4, true], ['series', 5, false], ['series', 5, true], ['series', 6, false]]));
  assert.equal(q.levelFor('series'), 5);                                       // 5.0, 50%
  assert.equal(q.levelFor('constructor'), 3, 'prototip nomi — tur emas');
});


test('reset IQ tarixini ham tozalaydi', () => {
  const { p, raw } = env();
  p.recordTest(natija({}, qator('series', 7, 5, 5)));
  p.reset();
  assert.deepEqual(plain(p.testHistory()), []);
  assert.equal(p.levelFor('series'), 3);
  assert.equal(raw(TESTS_KEY), undefined);
});


test('mavjud holat yozuvi IQ tarixini buzmaydi (alohida kalit)', () => {
  const { p, disk, raw } = env();
  p.recordTest(natija({}));
  p.answered({ ref: '#001', correct: true });
  p.flush();
  assert.equal(disk().tests, undefined, 'asosiy holatga aralashmaydi');
  assert.equal(JSON.parse(raw(TESTS_KEY)).tests.length, 1);
});
