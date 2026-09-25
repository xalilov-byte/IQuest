/* ─────────────────────────────────────────────────────────────────────────
   src/iq/gen/verbal.js + content/verbal.json — og'zaki mantiq

   Og'zaki savol qo'lda yoziladi, shuning uchun bu yerda ikki narsa
   tekshiriladi:
     1. KONTENT (JSON) — sxema, ikki til mosligi, variantlar takrorlanmasligi,
        darajalar qamrovi, to'g'ri javob indeksining taqsimoti, imlo
        qoidalari (oʻ/gʻ — ʻ bilan, tutuq — ʼ bilan). Bir ma'nolilikni kod
        tekshira olmaydi — buni odam qiladi (`reviewed`). Lekin odam
        ko'rishidan oldin mexanik xatolar shu yerda ushlanadi.
     2. GENERATOR — deterministiklik, validateItem, to'g'ri javob o'rnining
        tekisligi, aralashtirishda uz/ru variantlar bir-biridan
        ajralib ketmasligi.

   Build faylni `window.IQ_VERBAL` sifatida bundle'ga qo'yadi; test ham
   xuddi shunday: JSON diskdan o'qiladi va vm muhitida window.IQ_VERBAL ga
   qo'yiladi, keyin verbal.js yuklanadi.

   Ishga tushirish:  node --test tests/iq-verbal.test.mjs
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const FILES = ['src/iq/rng.js', 'src/iq/index.js', 'src/iq/gen/verbal.js'];
const SRC = FILES.map(f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8'));
const RAW = fs.readFileSync(new URL('../content/verbal.json', import.meta.url), 'utf8');
const DATA = JSON.parse(RAW);

/* Har chaqiruv — yangi, toza muhit. `data` — window.IQ_VERBAL; argument
   umuman berilmasa — diskdagi fayl, `undefined` berilsa — build'dagi
   "fayl yo'q" holati (window.IQ_VERBAL o'rnatilmaydi). */
function realm(...args) {
  const data = args.length ? args[0] : DATA;
  const ctx = {};
  ctx.window = ctx;
  vm.createContext(ctx);
  if (data !== undefined) ctx.IQ_VERBAL = JSON.parse(JSON.stringify(data));
  FILES.forEach((f, i) => vm.runInContext(SRC[i], ctx, { filename: f }));
  return ctx.IQ;
}

const plain = x => JSON.parse(JSON.stringify(x));

const IQ = realm();
const G = IQ.generator('verbal');
const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const KINDS = ['analogy', 'odd', 'category', 'relation'];
const N = 3000;                             // validlik: 3000 urug' × 10 daraja
const N_POS = 2000;                         // o'rinlar tekisligi: shartnomadagi 2000
const seedOf = s => (Math.imul(s + 1, 2654435761) >>> 0);
const ITEMS = DATA.items;
const BY_KEY = new Map(ITEMS.map(it => [it.key, it]));

/* O'rinlar tekisligi: har o'rin ulushi 1/k ± tol. Buzilgan o'rinlar
   ro'yxati (bo'sh — yaxshi). */
function uniformBad(positions, k, tol = 0.04) {
  const cnt = Array(k).fill(0);
  positions.forEach(p => cnt[p]++);
  const bad = [];
  cnt.forEach((c, i) => {
    const share = c / positions.length;
    if (Math.abs(share - 1 / k) > tol) bad.push({ pos: i, share: +share.toFixed(3) });
  });
  return bad;
}

/* "Ortiqchasini top" stimuli — variantlar ko'rsatilgan tartibda. */
const joinList = opts => opts.join(opts.some(o => o.includes(',') || o.includes(' — ')) ? '; ' : ', ');

/* Solishtirish uchun normallash: katta-kichik harf, bo'shliq, apostrof turlari. */
const norm = s => s.toLowerCase().replace(/[ʻʼ'’`‘]/g, "'").replace(/\s+/g, ' ').trim();

/* ══ KONTENT ═══════════════════════════════════════════════════════════ */

test('kontent: sxema — kalitlar, turlar, darajalar, ikki til, variantlar soni, correct', () => {
  assert.equal(DATA.version, 1);
  assert.ok(Array.isArray(ITEMS));
  assert.ok(ITEMS.length >= 120, 'kamida 120 ta savol: ' + ITEMS.length);
  const keys = new Set();
  for (const it of ITEMS) {
    const where = it.key || JSON.stringify(it).slice(0, 60);
    assert.match(it.key, /^v\d{3}$/, 'kalit shakli: ' + where);
    assert.ok(!keys.has(it.key), 'kalit takrorlangan: ' + it.key);
    keys.add(it.key);
    assert.ok(KINDS.includes(it.kind), where + ': kind ' + it.kind);
    assert.ok(Number.isInteger(it.level) && it.level >= 1 && it.level <= 10, where + ': level');
    for (const lang of ['uz', 'ru']) {
      const s = it[lang];
      assert.ok(s && typeof s.prompt === 'string' && s.prompt.trim(), where + ': ' + lang + '.prompt');
      assert.ok(typeof s.stimulus === 'string' && s.stimulus.trim(), where + ': ' + lang + '.stimulus');
      assert.ok(Array.isArray(s.options) && s.options.length >= 4 && s.options.length <= 6,
        where + ': ' + lang + '.options 4..6');
      s.options.forEach(o => assert.ok(typeof o === 'string' && o.trim(), where + ': bo\'sh variant'));
      assert.ok(typeof it.explain[lang] === 'string' && it.explain[lang].trim(), where + ': explain.' + lang);
    }
    assert.equal(it.uz.options.length, it.ru.options.length, where + ': uz va ru variantlar soni bir xil');
    assert.ok(Number.isInteger(it.correct) && it.correct >= 0 && it.correct < it.uz.options.length,
      where + ': correct indeks');
    assert.equal(it.reviewed, false, where + ': odam ko\'rmaguncha reviewed: false');
    assert.deepEqual(Object.keys(it).sort(),
      ['correct', 'explain', 'key', 'kind', 'level', 'reviewed', 'ru', 'uz'], where + ': ortiqcha/yetishmagan maydon');
  }
  /* Kalitlar ketma-ket (v001, v002, …): kalit qayta ishlatilmaydi, lekin
     o'rtasida teshik ham qolmasin — o'chirilgan savol "reviewed" orqali
     emas, kalitni tashlab ketish orqali ko'rinib qolmasligi uchun. */
  const nums = [...keys].map(k => +k.slice(1)).sort((a, b) => a - b);
  nums.forEach((n, i) => assert.equal(n, i + 1, 'kalitlar ketma-ket: v' + String(i + 1).padStart(3, '0')));
});

test('kontent: bir savol ichida variantlar takrorlanmaydi (har ikki tilda) va stimulda javob yo\'q', () => {
  for (const it of ITEMS) {
    for (const lang of ['uz', 'ru']) {
      const o = it[lang].options.map(norm);
      assert.equal(new Set(o).size, o.length, it.key + ': ' + lang + ' variantlari takrorlangan: ' + o.join(' | '));
    }
    /* O'xshatishda javob stimulda allaqachon turgan bo'lmasin
       ("A : B = C : ?" va javob — C). */
    if (it.kind === 'analogy') {
      for (const lang of ['uz', 'ru']) {
        const terms = it[lang].stimulus.split(/\s*[:=]\s*/).map(norm);
        assert.ok(!terms.includes(norm(it[lang].options[it.correct])), it.key + ': javob stimulda bor');
      }
    }
  }
});

test('kontent: darajalar va turlar qamrovi', () => {
  const byLevel = {}, byKind = {};
  for (const it of ITEMS) {
    byLevel[it.level] = (byLevel[it.level] || 0) + 1;
    byKind[it.kind] = (byKind[it.kind] || 0) + 1;
  }
  for (const L of LEVELS) assert.ok((byLevel[L] || 0) >= 8, 'daraja ' + L + ': kamida 8 ta, bor ' + (byLevel[L] || 0));
  for (const k of KINDS) assert.ok((byKind[k] || 0) >= 15, k + ': kamida 15 ta, bor ' + (byKind[k] || 0));
  /* Har tur kamida 8 ta darajada uchraydi — bir tur faqat "oson" yoki
     faqat "qiyin" bo'lib qolmasin. */
  for (const k of KINDS) {
    const lv = new Set(ITEMS.filter(it => it.kind === k).map(it => it.level));
    assert.ok(lv.size >= 8, k + ': faqat ' + lv.size + ' darajada');
  }
});

test('kontent: to\'g\'ri javob indeksi JSON\'da ham qiyshiq emas', () => {
  /* Generator baribir aralashtiradi, lekin backend JSON'ni to'g'ridan-
     to'g'ri bazaga qo'yadi — u yerda "javob doim birinchi" bo'lib qolmasin. */
  const byK = {};
  for (const it of ITEMS) (byK[it.uz.options.length] = byK[it.uz.options.length] || []).push(it.correct);
  for (const [k, pos] of Object.entries(byK)) {
    if (pos.length < 20) continue;
    assert.deepEqual(uniformBad(pos, +k, 0.08), [], k + ' variantli savollar: ' + pos.length + ' ta');
  }
  /* Har darajada bitta o'rin yarmidan ko'p bo'lmasin. */
  for (const L of LEVELS) {
    const pos = ITEMS.filter(it => it.level === L).map(it => it.correct);
    const max = Math.max(...[0, 1, 2, 3, 4, 5].map(p => pos.filter(x => x === p).length));
    assert.ok(max / pos.length <= 0.5, 'daraja ' + L + ': bitta o\'rinda ' + max + '/' + pos.length);
  }
});

test('kontent: til va imlo — uz lotinda (oʻ/gʻ — ʻ, tutuq — ʼ), ru kirillda, tinish belgilari', () => {
  const texts = it => ['uz', 'ru'].map(lang => [lang,
    [it[lang].prompt, it[lang].stimulus, ...it[lang].options, it.explain[lang]]]);
  for (const it of ITEMS) {
    for (const [lang, arr] of texts(it)) {
      for (const s of arr) {
        const w = it.key + ' ' + lang + ': ' + s;
        assert.equal(s, s.trim(), 'chetida bo\'shliq: ' + w);
        assert.ok(!/ {2}/.test(s), 'qo\'sh bo\'shliq: ' + w);
        assert.ok(!/undefined|null|NaN|\$\{|TODO/.test(s), w);
        assert.ok(!/ [,.;:!?]/.test(s.replace(/ : /g, '')), 'tinish belgisi oldida bo\'shliq: ' + w);
        if (lang === 'uz') {
          assert.ok(!/[а-яёўқғҳ]/i.test(s), 'uz matnda kirill harfi: ' + w);
          assert.ok(!/['’‘`]/.test(s), 'uz matnda oddiy apostrof — oʻ/gʻ uchun ʻ, tutuq uchun ʼ: ' + w);
          assert.ok(!/[^oOgG]ʻ/.test(s), 'ʻ faqat o/g dan keyin: ' + w);
          assert.ok(!/[oOgG]ʼ/.test(s), 'oʼ/gʼ — ʻ bo\'lishi kerak: ' + w);
        } else {
          assert.ok(!/[a-z]/i.test(s), 'ru matnda lotin harfi: ' + w);
          assert.ok(!/[ʻʼ'’]/.test(s), 'ru matnda apostrof: ' + w);
        }
      }
      const ex = it.explain[lang];
      assert.ok(/[.!]$/.test(ex), it.key + ': izoh nuqta bilan tugaydi');
      assert.ok(/\?/.test(it[lang].prompt) && /[?.]$/.test(it[lang].prompt), it.key + ': savolda so\'roq belgisi bor');
      /* Izoh variant O'RNIGA ishora qilmasin — generator variantlarni
         aralashtiradi, "A variant" ma'nosiz bo'lib qoladi. */
      assert.ok(!/\b[A-E]\)|\b[A-E] variant|вариант [A-EА-Д]\b|\b\d-variant/.test(ex), it.key + ': izohda o\'rin: ' + ex);
    }
  }
});

test('kontent: tur shakllari — o\'xshatish "A : B = C : ?", ortiqcha — stimul variantlardan', () => {
  for (const it of ITEMS) {
    if (it.kind === 'analogy') {
      for (const lang of ['uz', 'ru']) {
        assert.match(it[lang].stimulus, /^[^:=]+ : [^:=]+ = [^:=]+ : \?$/, it.key + ' ' + lang + ': ' + it[lang].stimulus);
      }
    }
    if (it.kind === 'odd') {
      for (const lang of ['uz', 'ru']) {
        assert.equal(it[lang].stimulus, joinList(it[lang].options), it.key + ' ' + lang + ': stimul = variantlar ro\'yxati');
      }
    }
  }
});

test('kontent: izoh to\'g\'ri javobni aytadi (tur bo\'yicha)', () => {
  /* Kamida: izohda to'g'ri javob so'zi (yoki uning o'zagi) uchraydi.
     Qo'shimchalar (suzmoq → suzib, плавать → плаванием) tufayli so'zning
     3 harfli boshi qidiriladi.
     Bu izoh boshqa savoldan ko'chirib qo'yilmaganini ushlaydi. */
  const stem = w => norm(w).replace(/[«»"]/g, '').split(/[\s—-]+/).filter(x => x.length >= 3)
    .map(x => x.slice(0, x.length <= 4 ? x.length - 1 : 3));
  const miss = [];
  for (const it of ITEMS) {
    for (const lang of ['uz', 'ru']) {
      const ans = it[lang].options[it.correct];
      const ex = norm(it.explain[lang]);
      const st = stem(ans);
      if (st.length && !st.some(s => ex.includes(s))) miss.push(it.key + ' ' + lang + ': "' + ans + '" — ' + it.explain[lang]);
    }
  }
  assert.deepEqual(miss, [], 'izohda javob yo\'q');
});

/* ══ GENERATOR ═════════════════════════════════════════════════════════ */

let corpus = null;
function getCorpus() {
  if (corpus) return corpus;
  corpus = {};
  for (const L of LEVELS) {
    corpus[L] = [];
    for (let s = 0; s < N; s++) corpus[L].push(G.generate(seedOf(s), L));
  }
  return corpus;
}

test('ro\'yxatdan o\'tgan: IQ.types() da "verbal", label uz/ru', () => {
  assert.ok(IQ.types().includes('verbal'));
  assert.equal(G.type, 'verbal');
  assert.equal(G.label.uz, 'Ogʻzaki mantiq');
  assert.equal(G.label.ru, 'Вербальная логика');
});

test('window.IQ_VERBAL bo\'lmasa (yoki bo\'sh bo\'lsa) — tur ro\'yxatdan o\'tmaydi', () => {
  for (const d of [undefined, null, {}, { version: 1, items: [] }, { version: 1, items: [{ key: 'x' }] }]) {
    const iq = realm(d);
    assert.ok(!iq.types().includes('verbal'), JSON.stringify(d));
    assert.equal(iq.generator('verbal'), null);
  }
});

test('minglab urug\' × har daraja: validateItem bo\'sh, shakl va manbaga moslik', () => {
  const C = getCorpus();
  for (const L of LEVELS) {
    for (const it of C[L]) {
      assert.deepEqual(plain(IQ.validateItem(it)), [], it.id);
      assert.equal(it.type, 'verbal');
      assert.equal(it.level, L);
      assert.match(it.id, new RegExp('^verbal:' + L + ':\\d+$'));
      const src = BY_KEY.get(it.key);
      assert.ok(src, 'key manbada bor: ' + it.key);
      assert.equal(src.level, L, 'har darajada yozuv bor — boshqa darajadan olinmaydi');
      assert.equal(it.b, IQ.levelToB(L));
      assert.equal(it.options.length, src.uz.options.length);
      assert.deepEqual(plain(it.prompt), { uz: src.uz.prompt, ru: src.ru.prompt });
      assert.deepEqual(plain(it.explain), src.explain);
      assert.equal(it.stimulus.kind, 'text');
      it.options.forEach(o => assert.equal(o.kind, 'text'));
      if (src.kind === 'odd') {
        assert.equal(it.stimulus.uz, joinList(it.options.map(o => o.uz)), 'ortiqcha: stimul ko\'rsatilgan tartibda');
        assert.equal(it.stimulus.ru, joinList(it.options.map(o => o.ru)));
      } else {
        assert.equal(it.stimulus.uz, src.uz.stimulus);
        assert.equal(it.stimulus.ru, src.ru.stimulus);
      }
    }
  }
});

test('aralashtirish uz/ru juftligini buzmaydi, to\'g\'ri javob o\'sha variantda qoladi', () => {
  const C = getCorpus();
  for (const L of LEVELS) {
    for (const it of C[L]) {
      const src = BY_KEY.get(it.key);
      const seen = new Set();
      it.options.forEach((o, i) => {
        const j = src.uz.options.indexOf(o.uz);
        assert.ok(j >= 0, it.id + ': uz variant manbada yo\'q');
        assert.equal(o.ru, src.ru.options[j], it.id + ': ' + i + '-o\'rinda uz va ru boshqa-boshqa variant');
        seen.add(j);
      });
      assert.equal(seen.size, src.uz.options.length, it.id + ': hamma variant bir martadan');
      assert.equal(it.options[it.correct].uz, src.uz.options[src.correct], it.id + ': correct (uz)');
      assert.equal(it.options[it.correct].ru, src.ru.options[src.correct], it.id + ': correct (ru)');
    }
  }
});

test('deterministik: bir xil (seed, level) → aynan bir xil savol, boshqa muhitda ham; Math.random yo\'q', () => {
  const IQ2 = realm();
  for (const L of LEVELS) {
    for (let s = 0; s < 300; s++) {
      const seed = seedOf(s);
      const a = plain(G.generate(seed, L));
      assert.deepEqual(plain(G.generate(seed, L)), a);
      assert.deepEqual(plain(IQ2.generator('verbal').generate(seed, L)), a, 'yangi muhitda ham bir xil');
      assert.deepEqual(plain(IQ.makeItem('verbal', seed, L)), a, 'makeItem orqali ham bir xil');
    }
  }
  /* JSON'dagi yozuvlar tartibi urug' → savol bog'lanishiga ta'sir qilmaydi
     (hovuz kalit bo'yicha saralanadi). */
  const IQ3 = realm({ version: 1, items: ITEMS.slice().reverse() });
  for (const L of LEVELS) {
    for (let s = 0; s < 50; s++) {
      assert.deepEqual(plain(IQ3.generator('verbal').generate(seedOf(s), L)), plain(G.generate(seedOf(s), L)));
    }
  }
  const src = SRC[2].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.ok(!/Math\.random|Date\.now|new Date/.test(src), 'faqat IQ.rng');
});

test('har darajada hamma yozuv urug\'lar orasida uchraydi va taxminan teng ulushda', () => {
  const C = getCorpus();
  for (const L of LEVELS) {
    const want = ITEMS.filter(it => it.level === L).map(it => it.key);
    const cnt = {};
    C[L].forEach(it => { cnt[it.key] = (cnt[it.key] || 0) + 1; });
    for (const k of want) {
      const share = (cnt[k] || 0) / N;
      assert.ok(Math.abs(share - 1 / want.length) < 0.035, 'daraja ' + L + ', ' + k + ': ulush ' + share.toFixed(3));
    }
    assert.deepEqual(Object.keys(cnt).sort(), want.slice().sort());
  }
});

test('to\'g\'ri javob o\'rni tekis: 2000 urug\'da har o\'rin 1/k ± 0.04', () => {
  const C = getCorpus();
  for (const L of LEVELS) {
    const items = C[L].slice(0, N_POS);
    const byK = {};
    items.forEach(it => (byK[it.options.length] = byK[it.options.length] || []).push(it.correct));
    for (const [k, pos] of Object.entries(byK)) {
      /* Kichik guruhda (masalan, darajada bitta 4 variantli yozuv) tasodifiy
         tebranish katta — faqat yetarli namunada tekshiriladi. */
      if (pos.length < 500) continue;
      assert.deepEqual(uniformBad(pos, +k), [], 'daraja ' + L + ', ' + k + ' variant (' + pos.length + ' ta)');
    }
  }
  /* Bir yozuv ichida ham: aralashtirish haqiqatan tekis (JSON'dagi
     joyiga yopishib qolmagan). */
  const one = ITEMS[0], hits = [];
  for (let s = 0; hits.length < N_POS && s < 200000; s++) {
    const it = G.generate(seedOf(s), one.level);
    if (it.key === one.key) hits.push(it.correct);
  }
  assert.equal(hits.length, N_POS);
  assert.deepEqual(uniformBad(hits, one.uz.options.length), [], one.key + ' ichida');
});

test('darajada yozuv bo\'lmasa — eng yaqin daraja (teng bo\'lsa pastrog\'i), b ±0.75 ichida', () => {
  const mk = (key, level) => {
    const base = ITEMS.find(it => it.kind === 'analogy');
    return Object.assign(JSON.parse(JSON.stringify(base)), { key, level });
  };
  const iq = realm({ version: 1, items: [mk('v001', 3), mk('v002', 7)] });
  const g = iq.generator('verbal');
  const expect = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 7, 7: 7, 8: 7, 9: 7, 10: 7 };
  for (const L of LEVELS) {
    for (let s = 0; s < 50; s++) {
      const it = iq.makeItem('verbal', seedOf(s), L);
      assert.deepEqual(plain(iq.validateItem(it)), [], it.id);
      assert.equal(it.level, L);
      assert.equal(it.key, expect[L] === 3 ? 'v001' : 'v002', 'daraja ' + L);
      const d = expect[L] - L;
      assert.ok(Math.abs(it.b - (iq.levelToB(L) + Math.max(-0.75, Math.min(0.75, d * 0.5)))) < 1e-12);
      assert.equal(g.pool(L)[0].level, expect[L]);
    }
  }
  /* Buzuq yozuv jimgina tashlanadi, ilova yiqilmaydi. */
  const bad = mk('v003', 5); bad.ru.options.pop();
  const iq2 = realm({ version: 1, items: [mk('v001', 3), bad] });
  assert.equal(iq2.makeItem('verbal', 1, 5).key, 'v001');
});

test('salbiy: validateItem buzilgan verbal savolini ushlaydi', () => {
  const it = plain(G.generate(12345, 5));
  const broken = [
    Object.assign({}, it, { correct: it.options.length }),
    Object.assign({}, it, { options: it.options.slice(0, 3) }),
    Object.assign({}, it, { options: [it.options[0], it.options[0]].concat(it.options.slice(2)) }),
    Object.assign({}, it, { stimulus: { kind: 'text', uz: 'x', ru: '' } }),
    Object.assign({}, it, { b: IQ.levelToB(5) + 2 }),
  ];
  for (const b of broken) assert.ok(IQ.validateItem(b).length > 0, JSON.stringify(b).slice(0, 80));
});
