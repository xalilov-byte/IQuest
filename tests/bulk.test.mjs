/* ─────────────────────────────────────────────────────────────────────────
   Ommaviy import va eksport (parseBulk / toCsv) tekshiruvi — og'zaki
   savollar bazasi (admin panel)

   NIMA UCHUN: bu ikkalasi savol bankiga ma'lumot KIRITADIGAN va undan
   ma'lumot CHIQARADIGAN yo'l. Bu yerdagi xato jimgina o'tadi — fayl
   import bo'ladi, ilova ishlaydi, lekin savolning bir qismi yo'qoladi
   (Nazariy'da aynan shunday bo'lgan: CSV'da izoh ustuni yo'q edi).

   IQuest'da og'zaki savollar generator savollari bilan bir xil
   chegarada: 4..6 variant (src/iq/CONTRACT.md §2). 3 variantli savolda
   tasodifan topish ehtimoli 33% — test natijasini sezilarli buzadi,
   shuning uchun import uni rad etadi.

   Manba fayl O'ZGARTIRILMAYDI: Main.dc.html dagi mantiq skripti
   o'qiladi va uning ma'lumot qatlami (ko'rinish modullaridan oldingi
   qismi) node:vm ichida ishga tushiriladi.
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const HTML = fs.readFileSync(new URL('../src/Main.dc.html', import.meta.url), 'utf8');

/* Mantiq skripti — Design Canvas uni shu teg bilan ajratadi. */
const script = /<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/.exec(HTML)[1];

/* Ko'rinish qatlamigacha bo'lgan qism: konstantalar va yordamchilar.
   Undan keyingisi `class Component extends DCLogic` — u brauzer
   muhitini talab qiladi va bu testga kerak emas. */
const CUT = '/* ═══ 2–4: HOLAT';
const idx = script.indexOf(CUT);
assert.ok(idx > 0, 'mantiq skriptining ma\'lumot qatlami topilmadi — ' +
  'Main.dc.html dagi bo\'lim sarlavhasi o\'zgargan bo\'lsa shu testni yangilang');

/* window bo'sh: IQ yadrosi, progress va i18n yo'q — ma'lumot qatlami
   ularsiz ham yuklanishi kerak (Design Canvas'dagi holat). */
const ctx = vm.createContext({ window: {}, document: {}, console });
vm.runInContext(script.slice(0, idx) + `
  globalThis.__api = { parseBulk, toCsv, CSV_COLUMNS, LETTERS, letterOf, MIN_OPTIONS, parseId, QUESTIONS, regId };
`, ctx);
const { parseBulk, toCsv, CSV_COLUMNS, letterOf, MIN_OPTIONS, parseId, QUESTIONS, regId } = ctx.__api;

/* vm boshqa "realm" — undagi massivning prototipi boshqa obyekt va
   deepEqual shu sababli yiqiladi. JSON orqali oddiy qiymatga
   keltiramiz (tests/data.test.mjs da ham shunday qilingan). */
const plain = x => JSON.parse(JSON.stringify(x));

const head = CSV_COLUMNS.join(';');
const line = o => [o.id || '', o.topic, o.text, ...(o.opts || []), ...Array(6 - (o.opts || []).length).fill(''),
  o.key, o.explain || '', o.state || ''].join(';');


test('harflar A dan F gacha, chegaradan tashqarida ham oʻqiladi', () => {
  assert.equal(letterOf(0), 'A');
  assert.equal(letterOf(5), 'F');
  assert.equal(letterOf(6), '7', 'undefined emas, oʻqiladigan narsa qaytishi kerak');
});


test('toʻrt variantli qator qabul qilinadi', () => {
  const r = parseBulk([head, line({
    topic: 'Analogiya', text: 'Qush : uya = asalari : ?',
    opts: ['Gul', 'Asal', 'Uya', 'Ari'], key: 'C', explain: 'Izoh',
  })].join('\n'), []);
  assert.equal(r.length, 1);
  assert.deepEqual(plain(r[0].errors), []);
  assert.deepEqual(plain(r[0].options), ['Gul', 'Asal', 'Uya', 'Ari']);
  assert.equal(r[0].correct, 2);
  assert.equal(r[0].topic, 'Analogiya');
});


test('olti variantli qator va F kaliti qabul qilinadi', () => {
  const r = parseBulk([head, line({
    topic: 'Ortiqchasi', text: 'Qaysi soʻz ortiqcha?',
    opts: ['a', 'b', 'c', 'd', 'e', 'f'], key: 'F', explain: 'Izoh',
  })].join('\n'), []);
  assert.deepEqual(plain(r[0].errors), []);
  assert.equal(r[0].options.length, 6);
  assert.equal(r[0].correct, 5);
});


test('mavjud boʻlmagan variantni koʻrsatuvchi kalit — XATO', () => {
  /* To'rt variantli savolda "E" — bo'sh javobni to'g'ri deb ko'rsatardi. */
  const r = parseBulk([head, line({
    topic: 'Munosabat', text: 'Kitob : sahifa = daraxt : ?',
    opts: ['Oʻrmon', 'Barg', 'Soya', 'Yogʻoch'], key: 'E',
  })].join('\n'), []);
  assert.equal(r[0].ok, false);
  assert.match(r[0].errors.join(' '), /A–D emas/);
});


test('uch variantli qator — XATO (kamida 4 ta)', () => {
  assert.equal(MIN_OPTIONS, 4);
  const r = parseBulk([head, line({
    topic: 'Kategoriya', text: 'Uch variantli savol matni',
    opts: ['a', 'b', 'c'], key: 'A',
  })].join('\n'), []);
  assert.equal(r[0].ok, false);
  assert.match(r[0].errors.join(' '), /kamida 4 ta/);
});


test('oʻrtada boʻsh variant — XATO (ustunlar siljigan boʻlishi mumkin)', () => {
  const r = parseBulk([head,
    ['', 'Analogiya', 'Oʻrtasida boʻsh variant bor savol', 'A', '', 'C', 'D', 'E', '', 'A', '', '']
      .join(';')].join('\n'), []);
  assert.equal(r[0].ok, false);
  assert.match(r[0].errors.join(' '), /boʻsh variant|bo'sh variant/);
});


test('sarlavhada "tur" ustuni boʻlmasa — bitta tushunarli xato', () => {
  const r = parseBulk(['savol;A;B;C;D;togri', 'x;a;b;c;d;A'].join('\n'), []);
  assert.equal(r.length, 1);
  assert.match(r[0].errors.join(' '), /tur/);
});


test('eksport → import: izoh va oltinchi variant yoʻqolmaydi', () => {
  /* Aylanish sinovi. Nazariy'da aynan shu yerda ma'lumot yo'qolgan edi. */
  const asl = [
    { id: 'v101', topic: 'Analogiya', text: 'Qush : uya = asalari : ?',
      options: ['Gul', 'Asal', 'Uya', 'Ari'], correct: 2, explain: 'Asalari uyasi', state: 'draft' },
    { id: 'v102', topic: 'Ortiqchasi', text: 'Qaysi biri ortiqcha; nima uchun?',
      options: ['a', 'b', 'c', 'd', 'e', 'f'], correct: 5, explain: '"Qoʻshtirnoq; va vergul"', state: 'draft' },
  ];
  const back = parseBulk(toCsv(asl), []);

  assert.equal(back.length, 2);
  back.forEach((r, i) => {
    assert.deepEqual(plain(r.errors), [], asl[i].id + ' xatosiz qaytishi kerak');
    assert.deepEqual(plain(r.options), asl[i].options, asl[i].id + ' variantlari');
    assert.equal(r.correct, asl[i].correct, asl[i].id + ' kaliti');
    assert.equal(r.explain, asl[i].explain, asl[i].id + ' izohi');
    assert.equal(r.topic, asl[i].topic, asl[i].id + ' turi');
  });
});


test('kaliti yoʻq savol eksportda boʻsh katak bilan chiqadi', () => {
  /* "A" deb yozib qo'yish — eng xavfli xato: moderator uni tekshirilgan
     kalit deb o'ylaydi. */
  const csv = toCsv([{ id: 'v103', topic: 'Munosabat', text: 'Kaliti yoʻq savol matni',
    options: ['a', 'b', 'c', 'd'], correct: null, explain: '', state: 'draft' }]);
  const cells = csv.split('\n')[1].split(';');
  assert.equal(cells[CSV_COLUMNS.indexOf('togri')], '', 'kalit katagi boʻsh boʻlishi kerak');
});


test('E/F ustunisiz qisqa fayl ham import boʻladi', () => {
  const shortHead = ['tur', 'savol', 'A', 'B', 'C', 'D', 'togri', 'izoh'].join(';');
  const shortLine = ['Kategoriya', 'Qaysi soʻz transportga kirmaydi?', 'Poyezd', 'Samolyot', 'Velosiped', 'Stol', 'D', 'izoh'].join(';');
  const r = parseBulk([shortHead, shortLine].join('\n'), []);
  assert.deepEqual(plain(r[0].errors), []);
  assert.equal(r[0].options.length, 4);
  assert.equal(r[0].correct, 3);
});


/* ── Savol ID'lari ("Xatolarim", "Saqlangan") ─────────────────────────
   Ro'yxatlarda savolning o'zi emas, ID'si saqlanadi: "tur:daraja:urug'".
   Buzuq ID savolga aylanmasligi kerak — aks holda "Xatolarim" dan
   noma'lum savol chiqadi. */
test('savol ID si toʻgʻri ajratiladi, buzuq ID — null', () => {
  assert.deepEqual(plain(parseId('matrix:7:123456')), { type: 'matrix', level: 7, seed: 123456 });
  assert.equal(parseId('matrix:7'), null);
  assert.equal(parseId('#001'), null);
  assert.equal(parseId('Matrix:7:1'), null, 'tur nomi kichik harf');
  assert.equal(parseId(''), null);
});


test('ID registri: progress.js uchun ikki yoʻl (indeks va ID)', () => {
  /* progress.js ref ↔ indeks o'girishni questions[i].ref orqali qiladi:
     initial() raqamli elementlarni, save() esa state'dagi ID bo'yicha
     taxallusni ishlatadi. Ikkalasi bir xil yozuvga ko'rsatishi shart. */
  regId('series:3:42');
  regId('series:3:42');               // takror — yangi yozuv qo'shilmaydi
  assert.equal(QUESTIONS.length, 1);
  assert.equal(QUESTIONS[0].ref, 'series:3:42');
  assert.equal(QUESTIONS['series:3:42'], QUESTIONS[0]);
});
