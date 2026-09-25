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

function env(saved) {
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
  return {
    p: ctx.window.nzProgress, io,
    disk: () => JSON.parse(store.get(KEY) || 'null'),
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
