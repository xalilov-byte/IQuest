/* ─────────────────────────────────────────────────────────────────────────
   Og'zaki mantiq: content/verbal.json + src/iq/gen/verbal.js

   NIMA UCHUN BU TEST MUHIM: og'zaki savolni kompyuter "to'g'ri" deb
   isbotlay olmaydi — bir ma'nolilikni odam tekshiradi (reviewed).
   Lekin mexanik xatolarni (uz va ru'da variantlar soni har xil, correct
   chegaradan tashqarida, bir xil variant ikki marta, tarjimada boshqa
   alifbo aralashib qolgan) mashina ushlashi SHART: bunday savol
   foydalanuvchiga chiqsa, IQ natijasi jimgina buziladi va buni hech kim
   sezmaydi. Backend ham shu faylni bazaga seed qiladi — format shu
   yerda qotiriladi.

   Manba faylga test uchun hech narsa qo'shilmagan: u node:vm ichida
   `window` taqlidi bilan yuklanadi (namuna: tests/data.test.mjs).
   vm boshqa "realm" — undan kelgan obyektlarni deepEqual'dan oldin
   JSON orqali o'tkazamiz (prototiplar boshqa bo'lgani uchun).
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const read = p => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const RNG = read('../src/iq/rng.js');
const INDEX = read('../src/iq/index.js');
const VERBAL = read('../src/iq/gen/verbal.js');
const DATA = JSON.parse(read('../content/verbal.json'));

const plain = x => JSON.parse(JSON.stringify(x));
const KINDS = ['analogy', 'odd', 'category', 'relation'];

/* Yangi, toza muhit: rng → index → verbal (build'dagi tartib).
   verbal — undefined bo'lsa window.IQ_VERBAL umuman qo'yilmaydi. */
function load(verbal) {
  const ctx = { console };
  vm.createContext(ctx);
  ctx.window = ctx;
  if (verbal !== undefined) ctx.IQ_VERBAL = plain(verbal);
  vm.runInContext(RNG, ctx);
  vm.runInContext(INDEX, ctx);
  vm.runInContext(VERBAL, ctx);
  return ctx.IQ;
}

/* Taqqoslash uchun normallash: katta-kichik harf, bo'shliqlar va
   tutuq belgisining turli yozilishi (' ʻ ʼ ’ `) farq qilmaydi —
   "O'rik" va "oʻrik " odam ko'zi uchun bitta variant. */
const norm = s => String(s).toLowerCase().replace(/[ʻʼ’‘`]/g, "'").replace(/\s+/g, ' ').trim();

/* Urug'lar: butun uint32 oralig'idan, chekka qiymatlar bilan. */
const seeds = (n, tag = 's') => {
  const IQ = load(DATA);
  const out = [0, 1, 0xffffffff];
  for (let i = 0; out.length < n; i++) out.push(IQ.hash(tag + i));
  return out;
};

/* ── Kontent sxemasi ─────────────────────────────────────────────── */

const ITEM_FIELDS = ['key', 'kind', 'level', 'uz', 'ru', 'correct', 'explain', 'reviewed'];
const CYR = /[Ѐ-ӿ]/;
const LAT = /[A-Za-z]/;
const nonEmpty = s => typeof s === 'string' && s.trim() !== '';

/* Xatolar ro'yxatini qaytaradi (bo'sh — to'g'ri). Alohida funksiya:
   uni buzilgan nusxada ham sinaymiz — tekshirgich o'zi ishlashini
   isbotlash uchun. */
function schemaErrors(data) {
  const errs = [];
  if (!data || data.version !== 1) errs.push('version 1 emas');
  if (!data || !Array.isArray(data.items)) return errs.concat('items massiv emas');
  const keys = new Set();
  data.items.forEach((it, n) => {
    const at = (it && it.key) || '#' + n;
    const e = m => errs.push(at + ': ' + m);
    if (!it || typeof it !== 'object') return e('obyekt emas');
    Object.keys(it).forEach(f => { if (!ITEM_FIELDS.includes(f)) e('ortiqcha maydon ' + f); });
    if (typeof it.key !== 'string' || !/^v\d{3}$/.test(it.key)) e('key v### shaklida emas');
    else if (keys.has(it.key)) e('key takrorlangan');
    else keys.add(it.key);
    if (!KINDS.includes(it.kind)) e('kind noto\'g\'ri: ' + it.kind);
    if (!(Number.isInteger(it.level) && it.level >= 1 && it.level <= 10)) e('level 1..10 emas');
    if (it.reviewed !== false) e('reviewed false emas');
    let k = -1;
    for (const lang of ['uz', 'ru']) {
      const L = it[lang];
      if (!L || typeof L !== 'object') { e(lang + ' yo\'q'); continue; }
      const extra = Object.keys(L).filter(f => !['prompt', 'stimulus', 'options'].includes(f));
      if (extra.length) e(lang + ' ortiqcha maydon ' + extra.join(','));
      if (!nonEmpty(L.prompt)) e(lang + '.prompt bo\'sh');
      if (!nonEmpty(L.stimulus)) e(lang + '.stimulus bo\'sh');
      if (!Array.isArray(L.options) || L.options.length < 4 || L.options.length > 6) {
        e(lang + '.options 4..6 emas');
        continue;
      }
      if (!L.options.every(nonEmpty)) e(lang + '.options ichida bo\'sh matn');
      const seen = new Set(L.options.map(norm));
      if (seen.size !== L.options.length) e(lang + '.options ichida takror');
      if (k === -1) k = L.options.length;
      else if (k !== L.options.length) e('uz va ru variantlar soni har xil');
      /* So'roq belgisi analogiyaning o'zagi: u yo'qolsa savol ma'nosiz. */
      if (it.kind === 'analogy' && !String(L.stimulus).includes('?')) e(lang + '.stimulus da "?" yo\'q');
    }
    if (!(Number.isInteger(it.correct) && it.correct >= 0 && it.correct < k)) e('correct chegaradan tashqarida');
    if (!it.explain || !nonEmpty(it.explain.uz) || !nonEmpty(it.explain.ru)) e('explain uz/ru yo\'q');
    /* Alifbo aralashmasligi: o'zbekcha matnda kirill, ruscha matnda
       lotin harfi bo'lsa — deyarli har doim nusxa-ko'chirish xatosi
       (tarjima boshqa tilga tushib qolgan). */
    const uzText = it.uz && [it.uz.prompt, it.uz.stimulus, ...(it.uz.options || []), it.explain && it.explain.uz].join(' ');
    const ruText = it.ru && [it.ru.prompt, it.ru.stimulus, ...(it.ru.options || []), it.explain && it.explain.ru].join(' ');
    if (uzText && CYR.test(uzText)) e('uz matnida kirill harfi');
    if (ruText && LAT.test(ruText)) e('ru matnida lotin harfi');
    /* O'zbekcha tutuq/o' g' uchun noto'g'ri belgilar (` ‘ ’) — imlo. */
    if (uzText && /[`‘’]/.test(uzText)) e('uz matnida noto\'g\'ri tutuq belgisi');
  });
  return errs;
}

test('kontent: sxema to\'g\'ri (har maydon, uz/ru teng, correct chegarada, key yagona)', () => {
  assert.deepEqual(schemaErrors(DATA), []);
});

test('kontent: sxema tekshirgichi buzuq savolni HAQIQATAN ushlaydi', () => {
  /* Tekshirgich "doim bo'sh" qaytarsa, yuqoridagi test hech narsani
     isbotlamaydi. Har bir buzilish alohida ushlanishi kerak. */
  const cases = {
    /* 5 ta — o'zi ruxsat etilgan son, lekin uz'da 4 ta: aynan nomuvofiqlik ushlanishi kerak. */
    'uz va ru variantlar soni har xil': d => { d.items[0].ru.options.push('лишний'); },
    'correct chegaradan tashqarida': d => { d.items[1].correct = d.items[1].uz.options.length; },
    'key takrorlangan': d => { d.items[2].key = d.items[3].key; },
    'key v### shaklida emas': d => { d.items[4].key = 'v12'; },
    'uz.options ichida takror': d => { d.items[5].uz.options[1] = '  ' + d.items[5].uz.options[0].toUpperCase() + ' '; },
    'ru.options ichida takror': d => { d.items[6].ru.options[2] = d.items[6].ru.options[3]; },
    'kind noto\'g\'ri': d => { d.items[7].kind = 'riddle'; },
    'reviewed false emas': d => { d.items[8].reviewed = true; },
    'explain uz/ru yo\'q': d => { delete d.items[9].explain.ru; },
    'uz matnida kirill harfi': d => { d.items[10].uz.options[0] = 'кот'; },
    'ru matnida lotin harfi': d => { d.items[11].ru.stimulus = 'Kot'; },
    'ortiqcha maydon': d => { d.items[12].answer = 1; },
    'noto\'g\'ri tutuq belgisi': d => { d.items[13].explain.uz = 'O`rik'; },
    '"?" yo\'q': d => { d.items[0].uz.stimulus = d.items[0].uz.stimulus.replace('?', ''); },
  };
  for (const [what, mutate] of Object.entries(cases)) {
    const d = plain(DATA);
    mutate(d);
    const errs = schemaErrors(d);
    assert.ok(errs.some(m => m.includes(what)), 'ushlanmadi: ' + what + ' → ' + JSON.stringify(errs));
  }
});

test('kontent: kamida 150 savol, har darajada ≥ 12, har tur bor', () => {
  assert.ok(DATA.items.length >= 150, 'savollar: ' + DATA.items.length);
  for (let lv = 1; lv <= 10; lv++) {
    const n = DATA.items.filter(it => it.level === lv).length;
    assert.ok(n >= 12, lv + '-darajada ' + n + ' ta savol');
  }
  for (const k of KINDS) assert.ok(DATA.items.some(it => it.kind === k), 'tur yo\'q: ' + k);
});

test('kontent: JSON\'dagi correct bitta o\'ringa to\'planmagan', () => {
  /* Backend savollarni aynan JSON tartibida bazaga yozadi. Agar biror
     iste'molchi aralashtirishni unutsa, javob doim "A" bo'lib qolmasin. */
  const byPos = {};
  DATA.items.forEach(it => { byPos[it.correct] = (byPos[it.correct] || 0) + 1; });
  for (const [pos, n] of Object.entries(byPos)) {
    assert.ok(n / DATA.items.length <= 0.4, 'correct=' + pos + ' juda ko\'p: ' + n);
  }
});

/* ── Generator ───────────────────────────────────────────────────── */

const byKey = new Map(DATA.items.map(it => [it.key, it]));

test('generator: ro\'yxatdan o\'tadi va Item shakli to\'g\'ri', () => {
  const IQ = load(DATA);
  assert.ok(IQ.generator('verbal'), 'verbal ro\'yxatdan o\'tmagan');
  assert.ok(IQ.types().includes('verbal'));
  const it = IQ.makeItem('verbal', 12345, 4);
  assert.equal(it.id, 'verbal:4:12345');
  assert.equal(it.type, 'verbal');
  assert.equal(it.level, 4);
  assert.equal(it.b, IQ.levelToB(4));
  assert.equal(it.stimulus.kind, 'text');
  assert.ok(it.options.every(o => o.kind === 'text'));
  const src = byKey.get(it.key);
  assert.ok(src, 'key kontentda yo\'q: ' + it.key);
  assert.deepEqual(plain(it.prompt), { uz: src.uz.prompt, ru: src.ru.prompt });
  assert.deepEqual(plain(it.stimulus), { kind: 'text', uz: src.uz.stimulus, ru: src.ru.stimulus });
  assert.deepEqual(plain(it.explain), src.explain);
});

test('generator: minglab urug\' × har daraja — validateItem bo\'sh', () => {
  const IQ = load(DATA);
  const S = seeds(400);
  let n = 0;
  for (let lv = 1; lv <= 10; lv++) {
    for (const s of S) {
      const it = IQ.generator('verbal').generate(s, lv);
      const errs = IQ.validateItem(it);
      assert.deepEqual(plain(errs), [], `verbal:${lv}:${s} → ${errs.join('; ')}`);
      assert.equal(it.id, `verbal:${lv}:${s}`);
      assert.equal(it.b, IQ.levelToB(lv));
      n++;
    }
  }
  assert.equal(n, 4000);
});

test('generator: deterministik — bir xil (urug\', daraja) → aynan bir xil savol', () => {
  const A = load(DATA), B = load(DATA);
  for (let lv = 1; lv <= 10; lv++) {
    for (const s of seeds(150, 'd' + lv)) {
      const a = JSON.stringify(A.generator('verbal').generate(s, lv));
      assert.equal(a, JSON.stringify(A.generator('verbal').generate(s, lv)), 'bir muhitda qayta');
      assert.equal(a, JSON.stringify(B.generator('verbal').generate(s, lv)), 'yangi muhitda');
    }
  }
});

test('generator: aralashtirishdan keyin to\'g\'ri javob matni va uz↔ru juftligi o\'zgarmaydi', () => {
  const IQ = load(DATA);
  for (let lv = 1; lv <= 10; lv++) {
    for (const s of seeds(300, 'c' + lv)) {
      const it = IQ.generator('verbal').generate(s, lv);
      const src = byKey.get(it.key);
      assert.equal(it.options[it.correct].uz, src.uz.options[src.correct], it.id + ' uz');
      assert.equal(it.options[it.correct].ru, src.ru.options[src.correct], it.id + ' ru');
      /* Har variantning uz va ru'si manbadagi BIR XIL o'rindan kelishi
         kerak — aks holda o'zbekcha va ruscha ekranda boshqa-boshqa
         javob to'g'ri bo'lib qoladi. */
      const pairs = src.uz.options.map((u, i) => u + '|' + src.ru.options[i]).sort();
      assert.deepEqual(it.options.map(o => o.uz + '|' + o.ru).sort(), pairs, it.id);
    }
  }
});

test('generator: so\'ralgan darajadagi savol beriladi va hamma savol yetib boradi', () => {
  const IQ = load(DATA);
  for (let lv = 1; lv <= 10; lv++) {
    const want = new Set(DATA.items.filter(it => it.level === lv).map(it => it.key));
    const got = new Set();
    for (const s of seeds(1500, 'l' + lv)) {
      const it = IQ.generator('verbal').generate(s, lv);
      assert.equal(byKey.get(it.key).level, lv, it.id + ' boshqa darajadan: ' + it.key);
      got.add(it.key);
    }
    assert.deepEqual([...want].filter(k => !got.has(k)), [], lv + '-darajada chiqmagan savollar');
  }
});

/* Tekislik tekshiruvi: har o'rin ulushi 1/k ± 0.04. */
function assertUniform(IQ, level, n, tag) {
  const counts = {};
  let k = 0;
  for (const s of seeds(n, tag)) {
    const it = IQ.generator('verbal').generate(s, level);
    k = it.options.length;
    counts[k] = counts[k] || new Array(k).fill(0);
    counts[k][it.correct]++;
  }
  for (const [kk, arr] of Object.entries(counts)) {
    const total = arr.reduce((a, b) => a + b, 0);
    if (total < 400) continue;           // kam namunada ulush shovqinli
    arr.forEach((c, i) => {
      const share = c / total;
      assert.ok(Math.abs(share - 1 / kk) <= 0.04,
        `${level}-daraja, k=${kk}, o'rin ${i}: ${share.toFixed(3)} (${arr.join(',')})`);
    });
  }
}

test('generator: to\'g\'ri javob o\'rni tekis — haqiqiy bank, har daraja 2000 urug\'', () => {
  const IQ = load(DATA);
  for (let lv = 1; lv <= 10; lv++) assertUniform(IQ, lv, 2000, 'u' + lv);
});

test('generator: to\'g\'ri javob o\'rni tekis — BITTA savolli bankda ham', () => {
  /* Haqiqiy bankda JSON'dagi correct o'zi aralash, shuning uchun
     aralashtirish o'chib qolsa ham ulushlar tasodifan tekis chiqishi
     mumkin. Bitta savolda esa faqat aralashtirish tekislik beradi. */
  const one = { version: 1, items: [plain(DATA.items[0])] };
  assertUniform(load(one), DATA.items[0].level, 4000, 'one');
});

test('generator: daraja bo\'sh bo\'lsa — eng yaqin daraja (teng bo\'lsa pastrog\'i)', () => {
  const pick = lv => DATA.items.find(it => it.level === lv);
  const bank = { version: 1, items: [pick(3), pick(7)].map(plain) };
  const IQ = load(bank);
  const from = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 7, 7: 7, 8: 7, 10: 7 };
  for (const [lv, src] of Object.entries(from)) {
    const it = IQ.makeItem('verbal', 99, Number(lv));
    assert.equal(byKey.get(it.key).level, src, lv + '-daraja so\'ralganda');
    assert.equal(it.level, Number(lv), 'Item.level so\'ralgan daraja bo\'lib qoladi');
    assert.equal(it.b, IQ.levelToB(Number(lv)));
  }
});

test('generator: window.IQ_VERBAL bo\'lmasa — ro\'yxatdan o\'tmaydi va xato otmaydi', () => {
  let IQ;
  assert.doesNotThrow(() => { IQ = load(undefined); });
  assert.equal(IQ.generator('verbal'), null);
  assert.ok(!IQ.types().includes('verbal'));
  /* Bo'sh yoki butunlay buzuq bank ham xuddi shunday. */
  for (const bad of [{}, { items: [] }, { items: [{ key: 'v001' }] }, { items: 'x' }]) {
    assert.doesNotThrow(() => { IQ = load(bad); });
    assert.equal(IQ.generator('verbal'), null, JSON.stringify(bad));
  }
});

test('generator: shakli buzuq savol foydalanuvchiga chiqmaydi, qolganlari ishlaydi', () => {
  const good = plain(DATA.items[0]);
  const broken = plain(DATA.items[1]);
  broken.level = good.level;
  broken.ru.options.pop();                  // uz 4 ta, ru 3 ta
  const IQ = load({ version: 1, items: [broken, good] });
  for (const s of seeds(300, 'b')) {
    assert.equal(IQ.generator('verbal').generate(s, good.level).key, good.key);
  }
});
