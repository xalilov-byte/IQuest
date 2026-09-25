/* ─────────────────────────────────────────────────────────────────────────
   src/data.js — baza qatlamining tekshiruvi

   NIMA UCHUN BU FAYL MUHIM: data.js ilovadagi yagona joy bo'lib, u
   ISHONCHSIZ ma'lumotni (tarmoq javobi va foydalanuvchi tahrirlashi mumkin
   bo'lgan localStorage) ilovaning yuragiga — savollar to'plamiga (window.
   IQ_VERBAL) — quyadi, va foydalanuvchining shaxsiy natijasini tashqariga
   yuboradi. Bu yerdagi xato jimgina o'tadi: ilova yiqilmaydi, shunchaki
   savollar yangilanmay qoladi yoki natija boshqa hisobga tushadi.

   Nazariy'dan meros stsenariy (haqiqatan sodir bo'lgan): baza bir marta
   buzuq javob qaytardi → kesh YOZILDI → keyingi ochilishda kesh "yangi"
   hisoblandi → ilova tarmoqqa UMUMAN chiqmadi → abadiy eski to'plamda qoldi.

   Ishga tushirish:  node --test tests/data.test.mjs

   data.js `window` va brauzer globallariga tayanadi, shuning uchun u
   `node:vm` ichida o'z muhiti bilan ishga tushiriladi — faylning o'ziga
   test uchun birorta o'zgartirish kiritilmagan.
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('../src/data.js', import.meta.url), 'utf8');

const CACHE_KEY = 'nz-verbal';
const OUTBOX_KEY = 'nz-outbox';
const UID = '11111111-1111-4111-8111-111111111111';
const UID2 = '22222222-2222-4222-8222-222222222222';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* Kesh versiyasi manbadan OʻQILADI: data.js da versiya oshirilganda bu
   yerdagi qattiq raqam eskirib, keshga tegishli testlar bir yo'la
   yiqilmasin. */
const CACHE_VERSION = Number(/CACHE_VERSION = (\d+)/.exec(SRC)[1]);

// vm ichida yaratilgan obyektlar boshqa "realm"niki — solishtirish uchun
// oddiy JSON'ga aylantiriladi.
const plain = x => JSON.parse(JSON.stringify(x));

/* APK ichidagi og'zaki to'plam taqlidi (content/verbal.json shakli). */
function side(word, ru) {
  return ru
    ? { prompt: 'Продолжите', stimulus: 'Птица : гнездо = ' + word + ' : ?', options: ['Цветок', 'Улей', 'Мёд', 'Рука'] }
    : { prompt: 'Davom ettiring', stimulus: 'Qush : uya = ' + word + ' : ?', options: ['Gul', 'Uya', 'Asal', "Qo'l"] };
}
function item(key, patch) {
  return Object.assign({
    key, kind: 'analogy', level: 3, uz: side(key), ru: side(key, true), correct: 1,
    explain: { uz: 'Izoh', ru: 'Пояснение' }, reviewed: false,
  }, patch || {});
}
function bundle() {
  return { version: 1, items: [item('v001'), item('v002'), item('v003')] };
}
/* published_verbal ko'rinishining qatori. */
function dbRow(key, patch) {
  const r = item(key, patch);
  delete r.reviewed;
  r.retired = false;
  return r;
}

function result(patch) {
  return Object.assign({
    mode: 'test', n: 30, correct: 18, durationMs: 600000,
    theta: 0.53, se: 0.3, iq: 108, lo: 100, hi: 116, reliable: true,
    byType: { matrix: { n: 10, correct: 6 }, series: { n: 10, correct: 6 }, verbal: { n: 10, correct: 6 } },
    items: Array.from({ length: 30 }, (_, i) => ({
      id: 'matrix:' + (1 + i % 10) + ':' + (1000 + i), type: 'matrix', level: 1 + i % 10,
      b: ((1 + i % 10) - 5.5) * 0.5, correct: i % 2 === 0, ms: 4000 + i,
    })),
  }, patch || {});
}

/* Sinov muhiti: localStorage, fetch va window taqlid qilinadi. */
function env(opts) {
  opts = opts || {};
  const store = new Map();
  if (opts.cache !== undefined) store.set(CACHE_KEY, typeof opts.cache === 'string' ? opts.cache : JSON.stringify(opts.cache));
  if (opts.outbox !== undefined) store.set(OUTBOX_KEY, typeof opts.outbox === 'string' ? opts.outbox : JSON.stringify(opts.outbox));

  const calls = [];
  const localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: k => { store.delete(k); },
  };

  /* opts.reply(path, call) → massiv/obyekt (200), Error (tarmoq xatosi)
     yoki { httpStatus } (HTTP xato). */
  const fetchStub = async (url, init) => {
    const path = String(url).split('/rest/v1/')[1];
    const call = {
      path, method: (init && init.method) || 'GET',
      headers: (init && init.headers) || {},
      body: init && init.body ? JSON.parse(init.body) : undefined,
    };
    calls.push(call);
    const r = opts.reply ? opts.reply(path, call) : [];
    if (r instanceof Error) throw r;
    if (r && r.httpStatus) return { ok: r.httpStatus < 300, status: r.httpStatus, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => r };
  };

  const win = {
    nzSupabase: opts.cfg === undefined ? { url: 'https://baza.test', publishableKey: 'ommaviy-kalit' } : opts.cfg,
  };
  if (opts.bundle !== null) win.IQ_VERBAL = opts.bundle || bundle();

  const ctx = {
    window: win, localStorage, fetch: fetchStub, crypto: globalThis.crypto,
    setTimeout, clearTimeout, AbortController,
    console: { info() {}, warn() {}, error() {} },
  };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);

  return {
    ctx, data: win.nzData, calls,
    verbal: () => plain(win.IQ_VERBAL),
    keys: () => plain(win.IQ_VERBAL.items.map(i => i.key)),
    cache: () => (store.has(CACHE_KEY) ? JSON.parse(store.get(CACHE_KEY)) : null),
    outbox: () => (store.has(OUTBOX_KEY) ? JSON.parse(store.get(OUTBOX_KEY)) : []),
  };
}

const always = () => true;
const noop = () => {};
const onlyVerbal = rows => p => (p.startsWith('published_verbal') ? rows : []);
const signIn = (e, uid) => e.data.setSession({ access_token: 'tok-' + (uid || UID), user_id: uid || UID, expires_at: Date.now() + 3600e3 });


/* ═══ OG'ZAKI SAVOLLAR ═════════════════════════════════════════════════ */

test('yaroqli javob: nashr etilgan savollar APK toʻplami ustiga qoʻshiladi, kesh yoziladi', async () => {
  const fixed = dbRow('v002', { correct: 2, explain: { uz: 'Tuzatilgan', ru: 'Исправлено' } });
  const e = env({ reply: onlyVerbal([fixed, dbRow('v010')]) });
  let redraw = 0;

  const status = await e.data.sync('uz', always, () => redraw++);

  assert.equal(status, 'live');
  assert.deepEqual(e.keys(), ['v001', 'v002', 'v003', 'v010'], 'APK tartibi saqlanadi, yangisi oxirida');
  const v002 = e.verbal().items[1];
  assert.equal(v002.correct, 2, 'bir xil kalit — bazadagisi (tuzatilgan) ustun');
  assert.equal(v002.reviewed, true, 'bazada nashr etilgan = odam koʻrib chiqqan');
  assert.equal(e.verbal().items[0].reviewed, false, 'APK dagisi oʻzgarishsiz');
  assert.equal(redraw, 1);
  assert.equal(e.cache().rows.length, 2, 'kesh yozilishi kerak');
});


test('arxivlangan kalit APK toʻplamidan ham olib tashlanadi', async () => {
  /* Aks holda bazada arxivlangan (masalan kaliti xato) savol APK
     ichidagi nusxasi orqali chiqib turaverardi. */
  const e = env({ reply: onlyVerbal([{ key: 'v002', retired: true }, dbRow('v003')]) });

  await e.data.sync('uz', always, noop);

  assert.deepEqual(e.keys(), ['v001', 'v003']);
  assert.deepEqual(e.cache().rows.map(r => r.key).sort(), ['v002', 'v003'], 'arxiv ham keshga tushadi');
});


test('buzuq javob: kesh YOZILMAYDI va APK toʻplami saqlanadi', async () => {
  /* Aynan sodir bo'lgan holat: ustunlar bor, lekin ichi null. */
  const singan = { key: 'v050', kind: null, level: null, uz: null, ru: null, correct: null, explain: null };
  const e = env({ reply: onlyVerbal([singan, singan]) });
  const before = e.verbal();

  const status = await e.data.sync('uz', always, noop);

  assert.equal(status, 'error');
  assert.deepEqual(e.verbal(), before, 'APK ichidagi toʻplam oʻz oʻrnida qolishi kerak');
  assert.equal(e.cache(), null, 'buzuq javob diskka yozilmasligi kerak');
});


test('buzuq kesh oʻchiriladi va ilova oʻsha ochilishdayoq tuzaladi', async () => {
  /* Eng muhim tekshiruv. Nazariy'da: buzuq kesh "yangi" bo'lgani uchun
     tarmoqqa umuman chiqilmasdi va ilova o'zi tuzala olmasdi. */
  const e = env({
    cache: { v: CACHE_VERSION, at: Date.now(), rows: [{ key: 'v050', uz: null }] },
    reply: onlyVerbal([dbRow('v010')]),
  });

  const status = await e.data.sync('uz', always, noop);

  assert.ok(e.calls.some(c => c.path.startsWith('published_verbal')),
    'buzuq kesh tarmoqqa chiqishni toʻsmasligi kerak');
  assert.equal(status, 'live');
  assert.ok(e.keys().includes('v010'));
  assert.deepEqual(e.cache().rows.map(r => r.key), ['v010'], 'yaroqli javob eski keshning oʻrnini egallashi kerak');
});


test('buzuq kesh + tarmoq ham yoʻq: APK toʻplami bilan ishlayveradi', async () => {
  const e = env({
    cache: { v: CACHE_VERSION, at: Date.now(), rows: [{ key: 'v050', uz: null }] },
    reply: () => new Error('tarmoq yoʻq'),
  });

  const status = await e.data.sync('uz', always, noop);

  assert.equal(status, 'error');
  assert.deepEqual(e.keys(), ['v001', 'v002', 'v003'], 'APK ichidagi toʻplam qolishi kerak');
  assert.equal(e.cache(), null, 'buzuq kesh oʻchirilgan boʻlishi kerak');
});


test('kesh JSON emas (qoʻlda tahrirlangan) — eʼtiborsiz, bazadan olinadi', async () => {
  const e = env({ cache: '{ bu json emas', reply: onlyVerbal([dbRow('v010')]) });

  const status = await e.data.sync('uz', always, noop);

  assert.equal(status, 'live');
  assert.ok(e.keys().includes('v010'));
});


test('qisman buzuq javob: faqat buzuq qatorlar tashlanadi', async () => {
  const bad = [
    dbRow('v020', { correct: 4 }),                                           // kalit chegaradan tashqari
    dbRow('v021', { uz: Object.assign(side('x'), { options: ['a', 'b', 'c'] }) }),   // 3 variant
    dbRow('v022', { ru: Object.assign(side('x', true), { options: ['а', 'б', 'в', 'г', 'д'] }) }), // uz 4, ru 5
    dbRow('v023', { uz: Object.assign(side('x'), { options: ['Gul', ' gul ', 'Asal', 'Uya'] }) }), // takroriy
    dbRow('v024', { uz: Object.assign(side('x'), { options: ['Gul', '  ', 'Asal', 'Uya'] }) }),    // bo'sh
    dbRow('v025', { kind: 'math' }),
    dbRow('v026', { level: 11 }),
    dbRow('x027'),                                                           // kalit formati
    dbRow('v028', { ru: { prompt: '', options: ['а', 'б', 'в', 'г'] } }),       // bo'sh savol
    dbRow('v029', { ru: { prompt: 'Вопрос', options: ['а', 'б', 'в', 'г'] } }), // stimul faqat uz'da
    dbRow('v030', { explain: { uz: 'Izoh' } }),                              // ruscha izoh yo'q
    dbRow('v031', { correct: '1' }),                                         // matn, son emas
    { key: 'v032', retired: 'ha' },                                          // arxiv belgisi noto'g'ri
  ];
  const e = env({ reply: onlyVerbal([dbRow('v010')].concat(bad, [dbRow('v011')])) });

  const status = await e.data.sync('uz', always, noop);

  assert.equal(status, 'live');
  assert.deepEqual(e.keys(), ['v001', 'v002', 'v003', 'v010', 'v011'], 'ikkita yaroqli savol qoʻshilishi kerak');
});


test('stimulsiz savol (ortiqchasini top): stimulus maydoni paydo boʻlmaydi', async () => {
  const odd = dbRow('v040', {
    kind: 'odd',
    uz: { prompt: 'Ortiqchasini toping', options: ['Olma', 'Nok', 'Sabzi', "O'rik"] },
    ru: { prompt: 'Найдите лишнее', options: ['Яблоко', 'Груша', 'Морковь', 'Абрикос'] },
  });
  const e = env({ reply: onlyVerbal([odd]) });

  await e.data.sync('uz', always, noop);

  const got = e.verbal().items.find(i => i.key === 'v040');
  assert.ok(got, 'stimulsiz savol qabul qilinishi kerak');
  assert.equal('stimulus' in got.uz, false);
  assert.equal('stimulus' in got.ru, false);
});


test('eski versiyadagi kesh tashlab yuboriladi', async () => {
  const e = env({
    cache: { v: CACHE_VERSION - 1, at: Date.now(), rows: [dbRow('v010')] },
    reply: onlyVerbal([dbRow('v011')]),
  });

  const status = await e.data.sync('uz', always, noop);

  assert.equal(status, 'live', 'eski kesh tarmoqqa chiqishni toʻsmasligi kerak');
  assert.ok(!e.keys().includes('v010'), 'eski keshdagi savol qoʻllanmasligi kerak');
  assert.equal(e.cache().v, CACHE_VERSION, 'kesh yangi versiya bilan qayta yozilishi kerak');
});


test('yangi kesh: tarmoqqa chiqilmaydi', async () => {
  const e = env({
    cache: { v: CACHE_VERSION, at: Date.now(), rows: [dbRow('v010')] },
    reply: onlyVerbal([dbRow('v011')]),
  });

  const status = await e.data.sync('uz', always, noop);

  assert.equal(status, 'cache');
  assert.deepEqual(e.calls, [], '6 soatdan yosh kesh bilan soʻrov yuborilmasligi kerak');
  assert.ok(e.keys().includes('v010'));
});


test('eski kesh: avval kesh koʻrsatiladi, keyin bazadan yangilanadi', async () => {
  const ETTI_SOAT = 7 * 60 * 60 * 1000;
  const kordi = [];
  const e = env({
    cache: { v: CACHE_VERSION, at: Date.now() - ETTI_SOAT, rows: [dbRow('v010')] },
    reply: onlyVerbal([dbRow('v010'), dbRow('v011')]),
  });

  const status = await e.data.sync('uz', always, () => kordi.push(e.ctx.window.IQ_VERBAL.items.length));

  assert.deepEqual(kordi, [4, 5], 'avval 3+1 (kesh), keyin 3+2 (baza)');
  assert.equal(status, 'live');
});


test('baza sozlanmagan boʻlsa — HECH QANDAY soʻrov yoʻq (savol ham, natija ham)', async () => {
  for (const cfg of [null, { url: '', publishableKey: '' }, { url: 'https://baza.test', publishableKey: '' }]) {
    const e = env({ cfg });

    const status = await e.data.sync('uz', always, noop);
    await signIn(e);
    assert.equal(e.data.submitResult(result()), 'off');
    await e.data.flush();

    assert.equal(status, 'bundled');
    assert.deepEqual(e.calls, [], 'config boʻsh — tarmoqqa chiqilmaydi: ' + JSON.stringify(cfg));
    assert.deepEqual(e.keys(), ['v001', 'v002', 'v003']);
    assert.deepEqual(e.outbox(), [], 'navbatga ham qoʻyilmaydi');
  }
});


test('test davom etayotganda toʻplam almashtirilmaydi, lekin kesh yoziladi va keyin qoʻllanadi', async () => {
  /* Savollar urug' bo'yicha to'plamdan tanlanadi: test o'rtasida to'plam
     almashsa, davom ettirilgan sessiya boshqa savolni ko'rsatardi. */
  const e = env({ reply: onlyVerbal([dbRow('v010')]) });

  const status = await e.data.sync('uz', () => false, () => {
    throw new Error('test davom etayotganda ekran qayta chizilmasligi kerak');
  });

  assert.equal(status, 'cache');
  assert.deepEqual(e.keys(), ['v001', 'v002', 'v003'], 'toʻplam oʻzgarmasligi kerak');
  assert.equal(e.cache().rows.length, 1, 'keyingi ochilish uchun saqlanishi kerak');

  assert.equal(e.data.applyLang('uz'), true, 'xavfsiz paytda kutib turgan yangilanish qoʻllanadi');
  assert.ok(e.keys().includes('v010'));
  assert.equal(e.data.applyLang('uz'), false, 'ikkinchi marta — oʻzgarish yoʻq');
});


test('HTTP xatosi: toʻplam va kesh tegilmaydi', async () => {
  const e = env({
    cache: { v: CACHE_VERSION, at: Date.now() - 7 * 60 * 60 * 1000, rows: [dbRow('v010')] },
    reply: () => ({ httpStatus: 500 }),
  });

  const status = await e.data.sync('uz', always, noop);

  assert.equal(status, 'cache');
  assert.ok(e.keys().includes('v010'), 'saqlangan nusxa oʻz oʻrnida qolishi kerak');
  assert.equal(e.cache().rows.length, 1, 'yaroqli kesh oʻchirilmasligi kerak');
});


test('bazada hali nashr etilgan savol yoʻq — APK toʻplami oʻzgarishsiz', async () => {
  /* Yangi baza: hammasi qoralama. Bo'sh javob to'plamni bo'shatmasligi
     kerak — birlashtirish, almashtirish emas. */
  const e = env({ reply: onlyVerbal([]) });
  let redraw = 0;

  const status = await e.data.sync('uz', always, () => redraw++);

  assert.equal(status, 'live');
  assert.deepEqual(e.keys(), ['v001', 'v002', 'v003']);
  assert.equal(redraw, 0, 'oʻzgarish yoʻq — ekran qayta chizilmaydi');
});


test('javob massiv emas (masalan PostgREST xato obyekti) — ishlatilmaydi', async () => {
  const e = env({ reply: () => ({ code: 'PGRST205', message: 'not found' }) });

  const status = await e.data.sync('uz', always, noop);

  assert.equal(status, 'error');
  assert.equal(e.cache(), null);
  assert.deepEqual(e.keys(), ['v001', 'v002', 'v003']);
});


test('faqat ommaviy koʻrinish soʻraladi — jadvalning oʻzi va token yoʻq', async () => {
  const e = env({ reply: onlyVerbal([]) });

  await e.data.sync('uz', always, noop);

  assert.equal(e.calls.length, 1);
  const c = e.calls[0];
  assert.match(c.path, /^published_verbal\?select=key,kind,level,uz,ru,correct,explain,retired&order=key\.asc$/);
  assert.equal(c.method, 'GET');
  assert.equal(c.headers.apikey, 'ommaviy-kalit');
  assert.equal(c.headers.Authorization, undefined, 'ommaviy maʼlumot — foydalanuvchi tokeni kerak emas');
});


test('APK da ogʻzaki toʻplam yoʻq (verbal.json build\'da yoʻq edi) — bazadagilar toʻplam boʻladi', async () => {
  const e = env({ bundle: null, reply: onlyVerbal([dbRow('v010'), { key: 'v002', retired: true }]) });

  await e.data.sync('uz', always, noop);

  assert.deepEqual(e.keys(), ['v010']);
  assert.equal(e.data.count(), 1);
});


/* ═══ NATIJALAR NAVBATI ════════════════════════════════════════════════ */

test('tizimga kirmagan — natija yuborilmaydi va navbatga ham qoʻyilmaydi', async () => {
  /* Keyin kim kirsa, o'shaning hisobiga boshqa odamning natijasi
     tushmasin (umumiy qurilma). */
  const e = env();

  assert.equal(e.data.submitResult(result()), 'skipped');
  await e.data.flush();

  assert.deepEqual(e.calls, []);
  assert.deepEqual(e.outbox(), []);
});


test('kirgan — natija test_results ga oʻz tokeni bilan, faqat kerakli maydonlar', async () => {
  const e = env({ reply: () => ({ httpStatus: 201 }) });
  await signIn(e);

  assert.equal(e.data.submitResult(result()), 'queued');
  await e.data.flush();

  assert.equal(e.calls.length, 1);
  const c = e.calls[0];
  assert.equal(c.method, 'POST');
  assert.equal(c.path, 'test_results?on_conflict=user_id,client_id');
  assert.equal(c.headers.Authorization, 'Bearer tok-' + UID);
  assert.equal(c.headers.apikey, 'ommaviy-kalit');
  assert.match(c.headers.Prefer, /resolution=ignore-duplicates/);
  assert.deepEqual(Object.keys(c.body).sort(),
    ['by_type', 'client_id', 'correct', 'duration_ms', 'hi', 'iq', 'lo', 'mode', 'n', 'reliable', 'se', 'theta']);
  assert.match(c.body.client_id, UUID_RE);
  assert.deepEqual(c.body.by_type, { matrix: { n: 10, correct: 6 }, series: { n: 10, correct: 6 }, verbal: { n: 10, correct: 6 } });
  assert.deepEqual(e.outbox(), [], 'yuborilgandan keyin navbat boʻsh');
  assert.equal(e.data.pending(), 0);
});


test('tarmoq xatosi — navbatda qoladi va keyin AYNAN SHU client_id bilan yuboriladi', async () => {
  let online = false;
  const e = env({ reply: () => (online ? { httpStatus: 201 } : new Error('tarmoq yoʻq')) });
  await signIn(e);

  e.data.submitResult(result());
  await e.data.flush();
  assert.equal(e.data.pending(), 1, 'yuborilmagan natija saqlanadi');

  online = true;
  await e.data.flush();

  assert.equal(e.calls.length, 2);
  assert.equal(e.calls[0].body.client_id, e.calls[1].body.client_id,
    'qayta yuborishda client_id oʻzgarmaydi — bazada ikki nusxa boʻlmaydi');
  assert.equal(e.data.pending(), 0);
});


test('doimiy rad (400) — tashlanadi; 401 — qoladi va navbat toʻxtaydi', async () => {
  const replies = [{ httpStatus: 400 }, { httpStatus: 401 }];
  const e = env({ reply: () => replies.shift() || { httpStatus: 201 } });
  await signIn(e);

  e.data.submitResult(result());           // 400 → tashlanadi
  await e.data.flush();
  assert.equal(e.data.pending(), 0, '400 (CHECK / kunlik chegara) navbatni abadiy toʻsmasligi kerak');

  e.data.submitResult(result());           // 401 → qoladi
  e.data.submitResult(result());
  await e.data.flush();
  assert.equal(e.data.pending(), 2, '401 — token eskirgan, keyin qayta urinish');
  assert.equal(e.calls.length, 2, '401 dan keyin navbatning qolgani yuborilmaydi');
});


test('boshqa foydalanuvchining navbatdagi natijasi boshqa hisob bilan yuborilmaydi', async () => {
  /* Umumiy qurilma: UID natija yozdi, internet yo'q edi, chiqib ketdi;
     keyin UID2 kirdi. UID ning natijasi UID2 hisobiga tushmasligi kerak. */
  const row = { client_id: '33333333-3333-4333-8333-333333333333', mode: 'test' };
  const e = env({
    outbox: [{ id: row.client_id, uid: UID, at: Date.now(), row, resp: null }],
    reply: () => ({ httpStatus: 201 }),
  });

  await signIn(e, UID2);
  assert.deepEqual(e.calls, [], 'UID ning natijasi UID2 tokeni bilan ketmasligi kerak');
  assert.equal(e.outbox().length, 1, 'u navbatda egasini kutadi');
  assert.equal(e.data.pending(), 0, 'UID2 uchun kutayotgan natija yoʻq');

  await signIn(e, UID);
  assert.equal(e.calls.length, 1);
  assert.equal(e.calls[0].headers.Authorization, 'Bearer tok-' + UID);
  assert.deepEqual(e.outbox(), []);
});


test('yaroqsiz natija navbatga kirmaydi', async () => {
  const e = env({ reply: () => ({ httpStatus: 201 }) });
  await signIn(e);
  const bad = [
    result({ iq: 300 }), result({ n: 0 }), result({ theta: NaN }), result({ se: 0 }),
    result({ lo: 120 }), result({ mode: 'exam' }), result({ correct: 31 }),
    result({ byType: { 'Matrix!': { n: 1, correct: 0 } } }),
    result({ byType: { matrix: { n: 1, correct: 2 } } }),
    result({ byType: [1, 2] }), result({ reliable: 'ha' }), null, 'natija',
  ];
  for (const r of bad) assert.equal(e.data.submitResult(r), 'invalid', JSON.stringify(r && Object.keys(r)));
  await e.data.flush();
  assert.deepEqual(e.calls, []);
  assert.deepEqual(e.outbox(), []);
});


test('davomiylik 24 soatdan oshsa chegaraga keltiriladi (natija yoʻqolmaydi)', async () => {
  const e = env({ reply: () => ({ httpStatus: 201 }) });
  await signIn(e);

  e.data.submitResult(result({ durationMs: 3 * 24 * 3600e3 }));
  await e.data.flush();

  assert.equal(e.calls[0].body.duration_ms, 24 * 3600e3);
});


test('navbat 50 ta bilan cheklangan (localStorage toʻlib qolmasin)', async () => {
  const e = env({ reply: () => new Error('tarmoq yoʻq') });
  await signIn(e);

  for (let i = 0; i < 60; i++) e.data.submitResult(result());
  await e.data.flush();

  assert.equal(e.outbox().length, 50);
});


test('buzuq navbat (localStorage) — eʼtiborsiz, ilova yiqilmaydi', async () => {
  for (const outbox of ['{ json emas', { a: 1 }, [null, 1, { id: 'x', uid: UID, at: Date.now(), row: {} }]]) {
    const e = env({ outbox, reply: () => ({ httpStatus: 201 }) });
    await signIn(e);
    await e.data.flush();
    assert.deepEqual(e.calls, []);
    assert.equal(e.data.submitResult(result()), 'queued');
    await e.data.flush();
    assert.equal(e.calls.length, 1);
  }
});


test('token eskirgan — soʻrov yoʻq; yangi token kelganda yuboriladi', async () => {
  const e = env({ reply: () => ({ httpStatus: 201 }) });
  await e.data.setSession({ access_token: 'eski', user_id: UID, expires_at: Date.now() - 1000 });

  assert.equal(e.data.submitResult(result()), 'queued', 'kim ekani maʼlum — navbatga qoʻyiladi');
  await e.data.flush();
  assert.deepEqual(e.calls, []);

  await e.data.setSession({ access_token: 'yangi', user_id: UID, expires_at: Date.now() + 3600e3 });
  assert.equal(e.calls.length, 1);
  assert.equal(e.calls[0].headers.Authorization, 'Bearer yangi');
});


test('kalibrlash javoblari STANDART HOLATDA yuborilmaydi; ruxsat bilan — anonim sessiya', async () => {
  const e = env({ reply: () => ({ httpStatus: 201 }) });
  await signIn(e);

  e.data.submitResult(result());
  await e.data.flush();
  assert.deepEqual(e.calls.map(c => c.path), ['test_results?on_conflict=user_id,client_id']);

  e.data.submitResult(result(), { calibrate: true });
  await e.data.flush();
  const rpc = e.calls.find(c => c.path === 'rpc/submit_item_responses');
  assert.ok(rpc, 'calibrate: true — javoblar yuboriladi');
  assert.match(rpc.body.p_session, UUID_RE);
  assert.notEqual(rpc.body.p_session, e.calls[1].body.client_id, 'sessiya id natija id siga bogʻlanmaydi');
  assert.equal(rpc.body.p_rows.length, 30);
  assert.deepEqual(Object.keys(rpc.body.p_rows[0]).sort(), ['b', 'correct', 'item_id', 'level', 'ms', 'type']);
  assert.equal(e.data.pending(), 0);
});


test('kalibrlash: buzuq javoblar tashlanadi, natijaning oʻzi baribir yuboriladi', async () => {
  const e = env({ reply: () => ({ httpStatus: 201 }) });
  await signIn(e);
  const r = result();
  r.items[3].level = 99;

  e.data.submitResult(r, { calibrate: true });
  await e.data.flush();

  assert.deepEqual(e.calls.map(c => c.path), ['test_results?on_conflict=user_id,client_id']);
});


test('"Maʼlumotimni oʻchiring": avval navbat tozalanadi, keyin bazadagi natijalar', async () => {
  let online = false;
  const e = env({
    outbox: [{ id: '44444444-4444-4444-8444-444444444444', uid: UID2, at: Date.now(),
               row: { client_id: '44444444-4444-4444-8444-444444444444' }, resp: null }],
    reply: (p) => (p === 'rpc/delete_my_results' ? 3 : (online ? { httpStatus: 201 } : new Error('tarmoq yoʻq'))),
  });
  await signIn(e);
  e.data.submitResult(result());
  e.data.submitResult(result());
  await e.data.flush();
  assert.equal(e.data.pending(), 2);

  const triedBefore = e.calls.filter(c => c.path.startsWith('test_results')).length;
  const n = await e.data.deleteMyResults();

  assert.equal(n, 3);
  const del = e.calls.find(c => c.path === 'rpc/delete_my_results');
  assert.equal(del.headers.Authorization, 'Bearer tok-' + UID);
  assert.equal(e.data.pending(), 0, 'yuborilmagan natijalar ham oʻchadi — keyin "qaytib" kelmasin');
  assert.deepEqual(e.outbox().map(x => x.uid), [UID2], 'boshqa odamning navbati tegilmaydi');

  online = true;
  await e.data.flush();
  assert.equal(e.calls.filter(c => c.path.startsWith('test_results')).length, triedBefore,
    'oʻchirishdan keyin hech narsa qayta yuborilmadi');
});
