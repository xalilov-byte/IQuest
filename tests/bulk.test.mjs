/* ─────────────────────────────────────────────────────────────────────────
   Ommaviy import va eksport (parseBulk / toCsv) tekshiruvi

   NIMA UCHUN: bu ikkalasi savol bankiga ma'lumot KIRITADIGAN va undan
   ma'lumot CHIQARADIGAN yo'l. Bu yerdagi xato jimgina o'tadi — fayl
   import bo'ladi, ilova ishlaydi, lekin savolning bir qismi yo'qoladi.
   Aynan shunday bo'lgan edi: CSV'da izoh ustuni yo'q edi va ommaviy
   import orqali kirgan har bir savol IZOHSIZ qolardi.

   Endi xuddi shu xavf rasm va beshinchi variant bilan takrorlanishi
   mumkin, shuning uchun eksport → import aylanishi shu yerda
   tekshiriladi.

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

const ctx = vm.createContext({ window: {}, document: {}, console });
vm.runInContext(script.slice(0, idx) + `
  globalThis.__api = { parseBulk, toCsv, CSV_COLUMNS, LETTERS, letterOf };
`, ctx);
const { parseBulk, toCsv, CSV_COLUMNS, letterOf } = ctx.__api;

/* vm boshqa "realm" — undagi massivning prototipi boshqa obyekt va
   deepEqual shu sababli yiqiladi. JSON orqali oddiy qiymatga
   keltiramiz (tests/data.test.mjs da ham shunday qilingan). */
const plain = x => JSON.parse(JSON.stringify(x));

const head = CSV_COLUMNS.join(';');
const line = o => [o.id || '', o.topic, o.text, ...(o.opts || []), ...Array(5 - (o.opts || []).length).fill(''),
  o.key, o.explain || '', o.sign || '', o.image || '', o.state || ''].join(';');


test('harflar A dan E gacha, chegaradan tashqarida ham oʻqiladi', () => {
  assert.equal(letterOf(0), 'A');
  assert.equal(letterOf(4), 'E');
  assert.equal(letterOf(5), '6', 'undefined emas, oʻqiladigan narsa qaytishi kerak');
});


test('ikki variantli qator qabul qilinadi', () => {
  const r = parseBulk([head, line({
    topic: 'Toʻxtab turish', text: 'Haydovchi qoidani buzdimi yoki buzmadimi?',
    opts: ['Buzdi', 'Buzmadi'], key: 'B', explain: 'Izoh',
  })].join('\n'), []);
  assert.equal(r.length, 1);
  assert.deepEqual(plain(r[0].errors), []);
  assert.deepEqual(plain(r[0].options), ['Buzdi', 'Buzmadi']);
  assert.equal(r[0].correct, 1);
});


test('besh variantli qator va E kaliti qabul qilinadi', () => {
  const r = parseBulk([head, line({
    topic: 'Tezlik rejimi', text: 'Ruxsat etilgan eng katta tezlik qancha?',
    opts: ['20', '40', '60', '70', '90'], key: 'E', explain: 'Izoh',
  })].join('\n'), []);
  assert.deepEqual(plain(r[0].errors), []);
  assert.equal(r[0].options.length, 5);
  assert.equal(r[0].correct, 4);
});


test('mavjud boʻlmagan variantni koʻrsatuvchi kalit — XATO', () => {
  /* Ikki variantli savolda "C" — bo'sh javobni to'g'ri deb ko'rsatardi. */
  const r = parseBulk([head, line({
    topic: 'Toʻxtab turish', text: 'Haydovchi qoidani buzdimi yoki buzmadimi?',
    opts: ['Buzdi', 'Buzmadi'], key: 'C',
  })].join('\n'), []);
  assert.equal(r[0].ok, false);
  assert.match(r[0].errors.join(' '), /A–B emas/);
});


test('bitta variantli qator — XATO', () => {
  const r = parseBulk([head, line({
    topic: 'Svetofor', text: 'Yagona variantli savol matni juda uzun',
    opts: ['Yagona'], key: 'A',
  })].join('\n'), []);
  assert.equal(r[0].ok, false);
  assert.match(r[0].errors.join(' '), /kamida 2 ta/);
});


test('oʻrtada boʻsh variant — XATO (ustunlar siljigan boʻlishi mumkin)', () => {
  const r = parseBulk([head,
    ['', 'Svetofor', 'Oʻrtasida boʻsh variant bor savol', 'A', '', 'C', '', '', 'A', '', '', '', '']
      .join(';')].join('\n'), []);
  assert.equal(r[0].ok, false);
  assert.match(r[0].errors.join(' '), /boʻsh variant|bo'sh variant/);
});


test('rasm nomi import qilinadi', () => {
  const r = parseBulk([head, line({
    topic: 'Chorrahalar', text: 'Qaysi avtomobil birinchi boʻlib oʻtadi?',
    opts: ['Koʻk', 'Yashil', 'Qizil'], key: 'C', image: 'q005.webp',
  })].join('\n'), []);
  assert.deepEqual(plain(r[0].errors), []);
  assert.equal(r[0].image, 'q005.webp');
});


test('eksport → import: rasm, izoh va beshinchi variant yoʻqolmaydi', () => {
  /* Aylanish sinovi. Ilgari aynan shu yerda ma'lumot yo'qolgan edi. */
  const asl = [
    { id: '#A1', topic: 'Chorrahalar', text: 'Qaysi avtomobil birinchi boʻlib oʻtadi?',
      options: ['Koʻk', 'Yashil', 'Qizil'], correct: 2, explain: 'Oʻng tomondagi imtiyozli',
      sign: null, image: 'q005.webp', state: 'draft' },
    { id: '#A2', topic: 'Tezlik rejimi', text: 'Ruxsat etilgan eng katta tezlik qancha?',
      options: ['20', '40', '60', '70', '90'], correct: 4, explain: '', sign: null,
      image: null, state: 'draft' },
    { id: '#A3', topic: 'Toʻxtab turish', text: 'Haydovchi qoidani buzdimi yoki buzmadimi?',
      options: ['Buzdi', 'Buzmadi'], correct: 0, explain: '', sign: null,
      image: null, state: 'draft' },
  ];
  const back = parseBulk(toCsv(asl), []);

  assert.equal(back.length, 3);
  back.forEach((r, i) => {
    assert.deepEqual(plain(r.errors), [], asl[i].id + ' xatosiz qaytishi kerak');
    assert.deepEqual(plain(r.options), asl[i].options, asl[i].id + ' variantlari');
    assert.equal(r.correct, asl[i].correct, asl[i].id + ' kaliti');
    assert.equal(r.explain, asl[i].explain, asl[i].id + ' izohi');
    assert.equal(r.image, asl[i].image, asl[i].id + ' rasmi');
  });
});


test('kaliti yoʻq savol eksportda boʻsh katak bilan chiqadi', () => {
  /* Hujjatdan olingan 21 ta savolda kalit yo'q. "A" deb yozib qo'yish
     — eng xavfli xato: moderator uni tekshirilgan kalit deb o'ylaydi. */
  const csv = toCsv([{ id: '#A4', topic: 'Svetofor', text: 'Kaliti yoʻq savol matni',
    options: ['a', 'b', 'c'], correct: null, explain: '', sign: null, image: null, state: 'draft' }]);
  const cells = csv.split('\n')[1].split(';');
  assert.equal(cells[CSV_COLUMNS.indexOf('togri')], '', 'kalit katagi boʻsh boʻlishi kerak');
});


test('eski 4 ustunli fayl ham import boʻladi (E ustunisiz)', () => {
  /* Ilgari yozilgan fayllar ishlashdan to'xtamasligi kerak. */
  const oldHead = ['id', 'mavzu', 'savol', 'A', 'B', 'C', 'D', 'togri', 'izoh', 'belgi', 'holat'].join(';');
  const oldLine = ['', 'Svetofor', 'Eski formatdagi savol matni', 'a', 'b', 'c', 'd', 'D', 'izoh', '', 'draft'].join(';');
  const r = parseBulk([oldHead, oldLine].join('\n'), []);
  assert.deepEqual(plain(r[0].errors), []);
  assert.equal(r[0].options.length, 4);
  assert.equal(r[0].correct, 3);
});
