/* ─────────────────────────────────────────────────────────────────────────
   src/data.js — savollar manbasining tekshiruvi

   NIMA UCHUN AYNAN SHU FAYL BIRINCHI TEST BO'LDI: bu qatlam ilovadagi
   yagona joy bo'lib, u ISHONCHSIZ ma'lumotni (tarmoq javobi va
   foydalanuvchi tahrirlashi mumkin bo'lgan localStorage) ilovaning
   yuragiga — savol bankiga — quyadi. Bu yerdagi xato jimgina o'tadi:
   ilova yiqilmaydi, shunchaki savollar yangilanmay qoladi va buni
   foydalanuvchi ham, biz ham sezmaymiz.

   Tekshirilayotgan asosiy stsenariy (haqiqatan sodir bo'lgan edi):
   baza bir marta buzuq javob qaytardi → kesh YOZILDI → keyingi
   ochilishda kesh "yangi" hisoblandi → ilova tarmoqqa UMUMAN chiqmadi →
   ilova abadiy APK ichidagi 10 savolda qoldi.

   Ishga tushirish:  node --test tests/

   data.js `window` va bir nechta global massivga tayanadi, shuning uchun
   u `node:vm` ichida o'z muhiti bilan ishga tushiriladi — faylning
   o'ziga test uchun birorta o'zgartirish kiritilmagan.
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('../src/data.js', import.meta.url), 'utf8');

const CACHE_KEY = 'nz-questions';

/* Kesh versiyasi manbadan OʻQILADI, bu yerga yozib qoʻyilmaydi.
   Sababi: data.js da versiya oshirilganda (masalan savolga `image`
   maydoni qoʻshilganda) bu yerdagi qattiq raqam eskirib qolardi va
   keshga tegishli beshta test bir yoʻla yiqilardi — oʻzgarish
   toʻgʻri boʻlsa ham. */
const CACHE_VERSION = Number(/CACHE_VERSION = (\d+)/.exec(SRC)[1]);

/* APK ichidagi to'plam taqlidi — uchta savol yetarli. */
function bundled() {
  return [
    { ref: '#001', topic: 'Svetofor', text: 'Birinchi savol matni',
      options: ['a', 'b', 'c', 'd'], correct: 0 },
    { ref: '#002', topic: 'Belgilar', text: 'Ikkinchi savol matni',
      options: ['a', 'b', 'c', 'd'], correct: 1, sign: 'stop' },
    { ref: '#003', topic: 'Tezlik', text: 'Uchinchi savol matni',
      options: ['a', 'b', 'c', 'd'], correct: 2 },
  ];
}

function goodRow(n) {
  return {
    id: 'uuid-' + n, ref: '#9' + n, topic_name: 'Svetofor',
    text: 'Bazadan kelgan savol ' + n,
    options: ['A', 'B', 'C', 'D'], correct: 1, sort_order: n,
  };
}

/* Sinov muhiti: localStorage, fetch va global massivlar taqlid qilinadi. */
function env(opts) {
  opts = opts || {};
  const store = new Map();
  if (opts.cache !== undefined) store.set(CACHE_KEY, JSON.stringify(opts.cache));

  const calls = [];
  const localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: k => { store.delete(k); },
  };

  /* Har bir so'rov yo'li uchun javob: opts.reply(path) → massiv,
     yoki xato tashlash uchun Error qaytaradi. */
  const fetchStub = async (url) => {
    const path = String(url).split('/rest/v1/')[1];
    calls.push(path);
    const r = opts.reply ? opts.reply(path) : [];
    if (r instanceof Error) throw r;
    if (r && r.httpStatus) return { ok: false, status: r.httpStatus, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => r };
  };

  const QUESTIONS = bundled();
  const ctx = {
    window: { nzSupabase: opts.cfg === undefined
      ? { url: 'https://baza.test', publishableKey: 'kalit' } : opts.cfg },
    localStorage,
    QUESTIONS,
    ALL_INDICES: QUESTIONS.map((_, i) => i),
    SIGN_INDICES: [1],
    fetch: fetchStub,
    setTimeout, clearTimeout, AbortController,
    console: { info() {}, warn() {}, error() {} },
  };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);

  return {
    ctx,
    data: ctx.window.nzData,
    calls,
    cache: () => (store.has(CACHE_KEY) ? JSON.parse(store.get(CACHE_KEY)) : null),
  };
}

const always = () => true;
const noop = () => {};


test('yaroqli javob: bank almashadi va kesh yoziladi', async () => {
  const e = env({ reply: p => (p.startsWith('published_questions') ? [goodRow(1), goodRow(2)] : []) });

  const status = await e.data.sync('uz', always, noop);

  assert.equal(status, 'live');
  assert.equal(e.ctx.QUESTIONS.length, 2);
  assert.equal(e.ctx.QUESTIONS[0].text, 'Bazadan kelgan savol 1');
  assert.deepEqual(e.ctx.ALL_INDICES, [0, 1]);
  assert.equal(e.cache().rows.length, 2, 'kesh yozilishi kerak');
});


test('buzuq javob: kesh YOZILMAYDI va APK toʻplami saqlanadi', async () => {
  /* Aynan sodir bo'lgan holat: ustunlar bor, lekin ichi null. */
  const singan = { id: 'u1', ref: null, text: null, options: null, correct: null };
  const e = env({ reply: p => (p.startsWith('published_questions') ? [singan, singan] : []) });

  const status = await e.data.sync('uz', always, noop);

  assert.equal(status, 'error');
  assert.equal(e.ctx.QUESTIONS.length, 3, 'APK ichidagi toʻplam oʻz oʻrnida qolishi kerak');
  assert.equal(e.ctx.QUESTIONS[0].ref, '#001');
  assert.equal(e.cache(), null, 'buzuq javob diskka yozilmasligi kerak');
});


test('buzuq kesh oʻchiriladi va ilova oʻsha ochilishdayoq tuzaladi', async () => {
  /* Eng muhim tekshiruv. Ilgari: buzuq kesh "yangi" boʻlgani uchun
     tarmoqqa umuman chiqilmasdi va ilova oʻzi tuzala olmasdi. */
  const e = env({
    cache: { v: CACHE_VERSION, at: Date.now(), rows: [{ id: 'u1', text: null, options: null }], ru: {} },
    reply: p => (p.startsWith('published_questions') ? [goodRow(1)] : []),
  });

  const status = await e.data.sync('uz', always, noop);

  assert.ok(e.calls.some(p => p.startsWith('published_questions')),
    'buzuq kesh tarmoqqa chiqishni toʻsmasligi kerak');
  assert.equal(status, 'live');
  assert.equal(e.ctx.QUESTIONS.length, 1);
  assert.equal(e.ctx.QUESTIONS[0].text, 'Bazadan kelgan savol 1');
  assert.equal(e.cache().rows.length, 1, 'yaroqli javob eski keshning oʻrnini egallashi kerak');
});


test('buzuq kesh + tarmoq ham yoʻq: APK toʻplami bilan ishlayveradi', async () => {
  const e = env({
    cache: { v: CACHE_VERSION, at: Date.now(), rows: [{ id: 'u1', text: null, options: null }], ru: {} },
    reply: () => new Error('tarmoq yoʻq'),
  });

  const status = await e.data.sync('uz', always, noop);

  assert.equal(status, 'error');
  assert.equal(e.ctx.QUESTIONS.length, 3, 'APK ichidagi toʻplam qolishi kerak');
  assert.equal(e.cache(), null, 'buzuq kesh oʻchirilgan boʻlishi kerak');
});


test('qisman buzuq javob: faqat buzuq qatorlar tashlanadi', async () => {
  const e = env({
    reply: p => (p.startsWith('published_questions')
      ? [goodRow(1),
         { id: 'u2', ref: '#902', text: 'Bitta variantli savol', options: ['a'], correct: 0 },
         goodRow(3),
         { id: 'u4', ref: '#904', text: 'Kaliti tashqarida', options: ['a', 'b', 'c', 'd'], correct: 9 },
         { id: 'u5', ref: '#905', text: 'Olti variantli savol',
           options: ['a', 'b', 'c', 'd', 'e', 'f'], correct: 0 },
         { id: 'u6', ref: '#906', text: 'Boʻsh variantli savol', options: ['a', '  ', 'c'], correct: 0 }]
      : []),
  });

  const status = await e.data.sync('uz', always, noop);

  assert.equal(status, 'live');
  assert.equal(e.ctx.QUESTIONS.length, 2, 'ikkita yaroqli savol qolishi kerak');
  assert.deepEqual(e.ctx.QUESTIONS.map(q => q.ref), ['#91', '#93']);
});


/* ── Variant soni 2..5 ─────────────────────────────────────────────────
   Bu yerdagi xato eng qimmatga tushadigan turdan: `sane()` da "aynan 4
   variant" yozilgan edi va rasmiy avtotest to'plami kelganda 301 ta
   savolning 251 tasi (2, 3 va 5 variantlilar) JIMGINA tashlab
   yuborilardi — na xato, na ogohlantirish. */
test('2 va 5 variantli savollar qabul qilinadi', async () => {
  const e = env({
    reply: p => (p.startsWith('published_questions')
      ? [{ id: 'u1', ref: '#A1', topic_name: 'Toʻxtab turish', sort_order: 1,
           text: 'Haydovchi qoidani buzdimi?', options: ['Buzdi', 'Buzmadi'], correct: 1 },
         { id: 'u2', ref: '#A2', topic_name: 'Tezlik rejimi', sort_order: 2,
           text: 'Ruxsat etilgan eng katta tezlik qancha?',
           options: ['20', '40', '60', '70', '90'], correct: 4 }]
      : []),
  });

  const status = await e.data.sync('uz', always, noop);

  assert.equal(status, 'live');
  assert.equal(e.ctx.QUESTIONS.length, 2);
  assert.equal(e.ctx.QUESTIONS[0].options.length, 2);
  assert.equal(e.ctx.QUESTIONS[1].options.length, 5);
  assert.equal(e.ctx.QUESTIONS[1].correct, 4, '5-variant kaliti saqlanishi kerak');
});


test('kalit massiv uzunligiga bogʻliq: 2 variantda correct=2 tashlanadi', async () => {
  /* Chegara "0..3" qattiq yozilgan boʻlsa bu qator oʻtib ketardi va
     ilova mavjud boʻlmagan variantni "toʻgʻri javob" deb koʻrsatardi. */
  const e = env({
    reply: p => (p.startsWith('published_questions')
      ? [{ id: 'u1', ref: '#A1', topic_name: 'Toʻxtab turish', sort_order: 1,
           text: 'Ikki variantli savol matni', options: ['Buzdi', 'Buzmadi'], correct: 2 }]
      : []),
  });

  const status = await e.data.sync('uz', always, noop);

  assert.equal(status, 'error', 'birorta yaroqli qator qolmadi');
  assert.equal(e.ctx.QUESTIONS[0].ref, '#001', 'APK toʻplami oʻz oʻrnida');
});


test('eski versiyadagi kesh tashlab yuboriladi', async () => {
  /* Savolga `image` maydoni qoʻshilganda kesh versiyasi oshirildi. Agar
     eski kesh "yangi" hisoblansa, yangilangan ilova tarmoqqa chiqmaydi
     va rasmga bogʻliq 140 ta savolni RASMSIZ koʻrsatib turardi. */
  const e = env({
    cache: { v: CACHE_VERSION - 1, at: Date.now(), rows: [goodRow(1)], ru: {} },
    reply: p => (p.startsWith('published_questions') ? [goodRow(1), goodRow(2)] : []),
  });

  const status = await e.data.sync('uz', always, noop);

  assert.equal(status, 'live', 'eski kesh tarmoqqa chiqishni toʻsmasligi kerak');
  assert.equal(e.ctx.QUESTIONS.length, 2);
  assert.equal(e.cache().v, CACHE_VERSION, 'kesh yangi versiya bilan qayta yozilishi kerak');
});


/* ── Savol rasmi ───────────────────────────────────────────────────────
   Rasmga bogʻliq 140 ta savol bor ("Qaysi avtomobil birinchi oʻtadi?").
   Rasm nomi bank qatoridan ilovaga yetib bormasa, savol javobsiz
   qoladi — ekranda faqat "qaysi avtomobil?" degan matn turadi. */
test('rasm nomi savolga oʻtadi, rasmsiz savolda undefined boʻladi', async () => {
  const e = env({
    reply: p => (p.startsWith('published_questions')
      ? [{ ...goodRow(1), image: 'q002.webp' }, goodRow(2)]
      : []),
  });

  await e.data.sync('uz', always, noop);

  assert.equal(e.ctx.QUESTIONS[0].image, 'q002.webp');
  assert.equal(e.ctx.QUESTIONS[1].image, undefined);
});


test('tarjima variantlari soni mos kelmasa — oʻzbekchasi qoladi', async () => {
  /* Kalit — oʻrin raqami. Tarjimada variant soni boshqa boʻlsa, rus
     tilidagi foydalanuvchi BOSHQA javobni toʻgʻri deb koʻradi. */
  const e = env({
    reply: p => (p.startsWith('published_questions')
      ? [goodRow(1)]
      : [{ question_id: 'uuid-1', text: 'Русский вопрос',
           options: ['А', 'Б'], explain: 'Пояснение' }]),
  });

  await e.data.sync('ru', always, noop);

  assert.equal(e.ctx.QUESTIONS[0].text, 'Русский вопрос', 'matn tarjima qilinadi');
  assert.deepEqual(e.ctx.QUESTIONS[0].options, ['A', 'B', 'C', 'D'],
    'variantlar soni mos kelmagani uchun oʻzbekchasi qolishi kerak');
});


test('yangi kesh: tarmoqqa chiqilmaydi', async () => {
  const e = env({
    cache: { v: CACHE_VERSION, at: Date.now(), rows: [goodRow(1)], ru: {} },
    reply: p => (p.startsWith('published_questions') ? [goodRow(1), goodRow(2)] : []),
  });

  const status = await e.data.sync('uz', always, noop);

  assert.equal(status, 'cache');
  assert.deepEqual(e.calls, [], '6 soatdan yosh kesh bilan soʻrov yuborilmasligi kerak');
  assert.equal(e.ctx.QUESTIONS.length, 1);
});


test('eski kesh: avval kesh koʻrsatiladi, keyin bazadan yangilanadi', async () => {
  const ETTI_SOAT = 7 * 60 * 60 * 1000;
  const kordi = [];
  const e = env({
    cache: { v: CACHE_VERSION, at: Date.now() - ETTI_SOAT, rows: [goodRow(1)], ru: {} },
    reply: p => (p.startsWith('published_questions') ? [goodRow(1), goodRow(2)] : []),
  });

  const status = await e.data.sync('uz', always, () => kordi.push(e.ctx.QUESTIONS.length));

  assert.deepEqual(kordi, [1, 2], 'avval saqlangan 1 ta, keyin bazadagi 2 ta');
  assert.equal(status, 'live');
});


test('ruscha tarjimaning matni boʻsh boʻlsa — oʻzbekchasi qoladi', async () => {
  /* Tarjima qatori qisman boʻlishi mumkin. Boʻsh matn qoʻllansa savol
     matni null boʻlib qolardi va ekran chizilmasdi. */
  const e = env({
    reply: p => (p.startsWith('published_questions')
      ? [goodRow(1)]
      : [{ question_id: 'uuid-1', text: null, options: ['А', 'Б', 'В', 'Г'], explain: null }]),
  });

  await e.data.sync('ru', always, noop);

  assert.equal(e.ctx.QUESTIONS[0].text, 'Bazadan kelgan savol 1');
  assert.deepEqual(e.ctx.QUESTIONS[0].options, ['A', 'B', 'C', 'D'],
    'matn oʻzbekcha qolgani uchun variantlar ham oʻzbekcha qolishi kerak');
});


test('tarjima toʻliq boʻlsa — rus tilida koʻrsatiladi', async () => {
  const e = env({
    reply: p => (p.startsWith('published_questions')
      ? [goodRow(1)]
      : [{ question_id: 'uuid-1', text: 'Русский вопрос',
           options: ['А', 'Б', 'В', 'Г'], explain: 'Пояснение' }]),
  });

  await e.data.sync('ru', always, noop);

  assert.equal(e.ctx.QUESTIONS[0].text, 'Русский вопрос');
  assert.deepEqual(e.ctx.QUESTIONS[0].options, ['А', 'Б', 'В', 'Г']);
  assert.equal(e.ctx.QUESTIONS[0].explain, 'Пояснение');
});


test('baza sozlanmagan boʻlsa — soʻrov yuborilmaydi', async () => {
  const e = env({ cfg: null });

  const status = await e.data.sync('uz', always, noop);

  assert.equal(status, 'bundled');
  assert.deepEqual(e.calls, []);
  assert.equal(e.ctx.QUESTIONS.length, 3);
});


test('test davom etayotganda bank almashtirilmaydi, lekin kesh yoziladi', async () => {
  /* Imtihon oʻrtasida bank almashsa indekslar siljiydi va odam
     javob bergan savol boshqasiga aylanadi. */
  const e = env({ reply: p => (p.startsWith('published_questions') ? [goodRow(1)] : []) });

  const status = await e.data.sync('uz', () => false, () => {
    throw new Error('test davom etayotganda ekran qayta chizilmasligi kerak');
  });

  assert.equal(status, 'cache');
  assert.equal(e.ctx.QUESTIONS.length, 3, 'bank oʻzgarmasligi kerak');
  assert.equal(e.cache().rows.length, 1, 'lekin keyingi ochilish uchun saqlanishi kerak');
});


test('HTTP xatosi: toʻplam va kesh tegilmaydi', async () => {
  const e = env({
    cache: { v: CACHE_VERSION, at: Date.now() - 7 * 60 * 60 * 1000, rows: [goodRow(1)], ru: {} },
    reply: () => ({ httpStatus: 500 }),
  });

  const status = await e.data.sync('uz', always, noop);

  assert.equal(status, 'cache');
  assert.equal(e.ctx.QUESTIONS.length, 1, 'saqlangan nusxa oʻz oʻrnida qolishi kerak');
  assert.equal(e.cache().rows.length, 1, 'yaroqli kesh oʻchirilmasligi kerak');
});


test('bazada nashr etilgan savol qolmasa — bank boʻshatilmaydi', async () => {
  /* Bo'sh javob "hamma savol o'chirildi" degani emas, ko'pincha
     noto'g'ri deploy degani. Bo'sh bank — bo'sh ekran. */
  const e = env({ reply: () => [] });

  const status = await e.data.sync('uz', always, noop);

  assert.equal(status, 'error');
  assert.equal(e.ctx.QUESTIONS.length, 3);
  assert.equal(e.cache(), null);
});
