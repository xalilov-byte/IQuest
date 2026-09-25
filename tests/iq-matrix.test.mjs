/* ─────────────────────────────────────────────────────────────────────────
   src/iq/gen/matrix.js — Raven uslubidagi 3×3 matritsa savollari

   Nimani isbotlaymiz (CONTRACT §2 kafolatlari + matritsaga xos xavflar):

   1. Shakl: minglab urug' × har daraja uchun IQ.validateItem bo'sh.
   2. Determinizm: bir xil (seed, level) → baytma-bayt bir xil savol, yangi
      kontekstda ham. Math.random va Date.now "zaharlangan" — ishlatilsa
      test yiqiladi.
   3. KO'R YECHUVCHI tasodifdan yuqori emas. RAVEN dataset'ining ma'lum
      xatosi: distraktorlar to'g'ri javobdan bittadan atributni o'zgartirib
      yasalgani uchun to'g'ri javob variantlar ichidagi "eng ko'p
      uchraydigan qiymatlar" bo'lib qolgan va matritsaga qaramasdan
      topilgan. Bu yerda bir nechta ko'r strategiya sinaladi: ko'pchilik
      ovozi (atribut bo'yicha va SVG teglari bo'yicha), ozchilik ovozi,
      "o'rtacha qiymat", va boshqa urug'larda O'RGATILGAN statistik model.
   4. Aniq bitta javob: MUSTAQIL (generator kodidan foydalanmaydigan)
      tekshiruvchi qoidalar oilasini qatorlar va ustunlar bo'yicha sinaydi:
      ma'lum 8 katakka mos keladigan har qoida to'g'ri javobni bashorat
      qiladi, har distraktor esa kamida bittasini buzadi. Generatorning
      "bu distraktor falon qoidani buzadi" degan ichki tavsifi ham shu
      tekshiruvchi bilan tasdiqlanadi.
   5. Variantlar kanonik tavsif bo'yicha juft-juft farqli, chizilgan SVG
      tavsifga mos (chizuvchi in'ektiv).
   6. To'g'ri javob o'rni tekis: har o'rin 1/k ± 0.04.
   7. Daraja murakkablikni haqiqatan oshiradi.
   8. SVG qoidalari (oq fon, faqat uch rang, viewBox, tashqi havola yo'q).

   Yuklash: rng.js → index.js → gen/matrix.js, node:vm ichida (manba faylga
   test uchun o'zgartirish kiritilmagan). vm boshqa "realm" — deepEqual
   uchun J() bilan oddiy JSON'ga aylantiramiz.

   Mutatsion tekshiruv (himoyani olib tashlab test tishlashini ko'rish)
   uchun generatorning boshqa nusxasini berish mumkin:
       IQ_MATRIX_SRC=/tmp/buzilgan-matrix.js node --test tests/iq-matrix.test.mjs
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const IQ_DIR = new URL('../src/iq/', import.meta.url);
const GEN_SRC = fs.readFileSync(process.env.IQ_MATRIX_SRC || new URL('gen/matrix.js', IQ_DIR), 'utf8');

const J = x => JSON.parse(JSON.stringify(x));

function load() {
  const ctx = { console };
  ctx.window = ctx;
  vm.createContext(ctx);
  /* Tasodif faqat IQ.rng dan. Boshqa manba ishlatilsa — darhol xato. */
  vm.runInContext(
    'Math.random = function () { throw new Error("Math.random taqiqlangan"); };' +
    'Date.now = function () { throw new Error("Date.now taqiqlangan"); };', ctx);
  for (const f of ['rng.js', 'index.js']) {
    vm.runInContext(fs.readFileSync(new URL(f, IQ_DIR), 'utf8'), ctx, { filename: f });
  }
  vm.runInContext(GEN_SRC, ctx, { filename: 'gen/matrix.js' });
  return ctx.IQ;
}

const IQ = load();
const gen = IQ.generator('matrix');
const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const N = 2000;
const seedOf = i => (i * 2654435761) >>> 0;   // urug'lar 32-bit oralig'iga tarqaladi

/* Har daraja uchun 2000 savol bir marta yasaladi, hamma test shundan foydalanadi. */
const CACHE = new Map();
function data(level) {
  if (!CACHE.has(level)) {
    const arr = [];
    for (let i = 1; i <= N; i++) {
      const seed = seedOf(i);
      const d = gen.describe(seed, level);
      arr.push({ seed, item: J(d.item), spec: J(d.spec) });
    }
    CACHE.set(level, arr);
  }
  return CACHE.get(level);
}

/* ── Mustaqil tekshiruvchi (generator kodiga tayanmaydi) ── */
const T_DICE = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8], 7: [0, 2, 3, 4, 5, 6, 8], 8: [0, 1, 2, 3, 5, 6, 7, 8], 9: [0, 1, 2, 3, 4, 5, 6, 7, 8] };
const T_SIDES = { triangle: 3, square: 4, diamond: 4, pentagon: 5, hexagon: 6 };
const T_RING = { grid: [0, 1, 2, 5, 8, 7, 6, 3], spokes: [0, 1, 2, 3, 4, 5, 6, 7] };
const popcnt = m => m.toString(2).split('').filter(c => c === '1').length;

function turn(mask, ring, k) {
  let out = 0;
  for (let i = 0; i < 9; i++) {
    if ((mask >> i) & 1) {
      const p = ring.indexOf(i);
      out |= 1 << (p === -1 ? i : ring[(p + k + 8 * ring.length) % ring.length]);
    }
  }
  return out;
}

/* Odam ko'radigan belgilar: asosiy atributlar + hosilalar (zar naqshi,
   elementlar soni). */
function features(p) {
  const f = Object.assign({}, p);
  if (p.number !== undefined) f.dots = T_DICE[p.number].reduce((m, i) => m | (1 << i), 0);
  if (p.pos !== undefined) f.count = popcnt(p.pos);
  if (p.spokes !== undefined) f.count = popcnt(p.spokes);
  return f;
}

/* Belgi turi → qoidalar oilasi: (a, b) → c yoki undefined. */
function family(key) {
  const F = [['doimiy', (a, b) => (a === b ? a : undefined)]];
  const numeric = key === 'size' || key === 'number' || key === 'count' || key === 'sides';
  if (numeric) {
    for (let d = -9; d <= 9; d++) if (d !== 0) F.push(['progressiya' + d, (a, b) => (b - a === d ? b + d : undefined)]);
  }
  if (key === 'number' || key === 'count') {
    F.push(['yig\'indi', (a, b) => a + b]);
    F.push(['ayirma', (a, b) => (a > b ? a - b : undefined)]);
    F.push(['teskari ayirma', (a, b) => (b > a ? b - a : undefined)]);
  }
  if (key === 'rot') {
    for (let d = 1; d <= 3; d++) F.push(['burilish' + d, (a, b) => ((b - a + 4) % 4 === d ? (b + d) % 4 : undefined)]);
  }
  if (key === 'pos' || key === 'dots' || key === 'spokes') {
    const ring = key === 'spokes' ? T_RING.spokes : T_RING.grid;
    for (const k of [1, 2, 3, -1, -2, -3]) F.push(['surilish' + k, (a, b) => (turn(a, ring, k) === b ? turn(b, ring, k) : undefined)]);
    F.push(['birlashma', (a, b) => a | b], ['kesishma', (a, b) => a & b], ['XOR', (a, b) => a ^ b],
      ['ayirma', (a, b) => a & ~b], ['teskari ayirma', (a, b) => b & ~a]);
  }
  return F;
}

/* Ma'lum 8 katakka mos keladigan HAR qoidaning (3,3) bashorati. */
function predict(key, grid) {
  const out = [];
  const byRows = grid;
  const byCols = [0, 1, 2].map(j => grid.map(row => row[j]));
  for (const lines of [byRows, byCols]) {
    for (const [name, fn] of family(key)) {
      if (fn(lines[0][0], lines[0][1]) !== lines[0][2]) continue;
      if (fn(lines[1][0], lines[1][1]) !== lines[1][2]) continue;
      const p = fn(lines[2][0], lines[2][1]);
      if (p !== undefined) out.push({ name, p });
    }
    /* "Har qatorda o'sha uch qiymat" (uchlik taqsimoti). */
    const a = lines[0].slice().sort(), b = lines[1].slice().sort();
    if (a.join() === b.join()) {
      const left = a.slice();
      const ok = [lines[2][0], lines[2][1]].every(v => { const i = left.indexOf(v); if (i < 0) return false; left.splice(i, 1); return true; });
      if (ok) out.push({ name: 'uchlik', p: left[0] });
    }
  }
  return out;
}

/* Kalit bo'yicha to'g'ri javob belgilari va hamma bashoratlar. */
function analyse(spec) {
  const cells = spec.cells.map(row => row.map(features));
  const truth = cells[2][2];
  const res = {};
  for (const key of Object.keys(truth)) {
    const grid = cells.map(row => row.map(f => f[key]));
    res[key] = predict(key, grid).map(x => ({ name: x.name, ok: v => v === x.p, p: x.p }));
    if (key === 'shape' || key === 'frame') {
      const sides = grid.map(row => row.map(v => T_SIDES[v]));
      const known = sides.every((row, i) => row.every((v, j) => (i === 2 && j === 2) || v !== undefined));
      if (known) {
        for (const x of predict('sides', sides)) res[key].push({ name: 'burchaklar ' + x.name, ok: v => T_SIDES[v] === x.p, p: 'sides' + x.p });
      }
    }
  }
  return res;
}

const canon = p => JSON.stringify(Object.keys(p).sort().map(k => [k, p[k]]));
const CELL_FRAME = '<rect x="1" y="1" width="98" height="98" rx="6" fill="#fff" stroke="#8a8799" stroke-width="1.5"/>';

/* ─────────────────────────────────────────────────────────────────── */

test('ro\'yxatdan o\'tgan: tur, nom, IQ.types()', () => {
  assert.ok(gen, 'matrix generatori yo\'q');
  assert.ok(IQ.types().includes('matrix'));
  assert.equal(typeof gen.label.uz, 'string');
  assert.equal(typeof gen.label.ru, 'string');
});

test('validateItem: 2000 urug\' × 10 daraja — hammasi to\'g\'ri shaklda', () => {
  for (const level of LEVELS) {
    for (const { seed, item } of data(level)) {
      const errs = IQ.validateItem(item);
      assert.deepEqual(J(errs), [], `level ${level}, seed ${seed}: ${errs.join('; ')}`);
      assert.equal(item.id, `matrix:${level}:${seed}`);
      assert.equal(item.type, 'matrix');
      assert.equal(item.level, level);
    }
  }
  /* Chekka urug'lar va makeItem yo'li (ilova aynan shuni chaqiradi). */
  for (const level of LEVELS) {
    for (const seed of [0, 1, 0xffffffff, 0x7fffffff, 123456789]) {
      assert.deepEqual(J(IQ.makeItem('matrix', seed, level)), J(gen.generate(seed, level)));
    }
    for (const { seed, item } of data(level).slice(0, 100)) {
      assert.deepEqual(J(IQ.makeItem('matrix', seed, level)), item, 'makeItem va describe bir xil savol berishi kerak');
    }
  }
});

test('determinizm: bir xil (seed, level) → baytma-bayt bir xil, yangi kontekstda ham', () => {
  assert.ok(!/Math\.random|Date\.now|new Date/.test(GEN_SRC), 'generator faqat IQ.rng dan foydalanishi kerak');
  const other = load();   // butunlay yangi kontekst — yashirin holat yo'q
  for (const level of LEVELS) {
    for (const { seed, item } of data(level).slice(0, 300)) {
      assert.deepEqual(J(gen.generate(seed, level)), item, `takror: level ${level}, seed ${seed}`);
      const again = other.makeItem('matrix', seed, level);
      assert.equal(again.stimulus.svg, item.stimulus.svg);
      assert.deepEqual(J(again), item);
    }
  }
  /* Boshqa urug' — boshqa savol (generator urug'ni e'tiborsiz qoldirmaydi). */
  const stims = new Set(data(7).map(x => x.item.stimulus.svg));
  assert.ok(stims.size > N * 0.99, 'urug\'lar har xil savol berishi kerak: ' + stims.size);
});

/* ── Ko'r yechuvchilar: faqat variantlarni ko'radi ── */

function pickBest(scores, rnd, max = true) {
  const best = max ? Math.max(...scores) : Math.min(...scores);
  const idx = [];
  scores.forEach((s, i) => { if (s === best) idx.push(i); });
  return idx[rnd.int(idx.length)];   // tenglikda tasodifiy (urug'li) tanlov
}
const attrFeats = o => Object.entries(o).map(([k, v]) => k + '=' + v);
const svgFeats = svg => svg.match(/<[^>]+>/g);

/* Har belgi nechta variantda uchraydi → variant bali = yig'indi. */
function voteScores(featLists) {
  const cnt = new Map();
  for (const fs of featLists) for (const f of new Set(fs)) cnt.set(f, (cnt.get(f) || 0) + 1);
  return featLists.map(fs => [...new Set(fs)].reduce((s, f) => s + cnt.get(f), 0));
}

/* Har atribut bo'yicha ko'pchilik qiymati → "modal variant"; unga eng
   ko'p atributi mos keladigani tanlanadi. */
function modalScores(opts) {
  const keys = Object.keys(opts[0]);
  const modal = {};
  for (const k of keys) {
    const cnt = new Map();
    for (const o of opts) cnt.set(o[k], (cnt.get(o[k]) || 0) + 1);
    const best = Math.max(...cnt.values());
    modal[k] = [...cnt.entries()].filter(e => e[1] === best).map(e => e[0]);
  }
  return opts.map(o => keys.filter(k => modal[k].includes(o[k])).length);
}

/* "O'rtacha qiymat" strategiyasi: sonli atributlarda o'rtachaga eng
   yaqin variant (RAVEN'ning boshqa klassik yorlig'i). */
function middleScores(opts) {
  const keys = Object.keys(opts[0]).filter(k => typeof opts[0][k] === 'number' && k !== 'pos' && k !== 'spokes');
  return opts.map(o => -keys.reduce((s, k) => {
    const mean = opts.reduce((t, x) => t + x[k], 0) / opts.length;
    return s + Math.abs(o[k] - mean);
  }, 0));
}

function blindAccuracy(level, solver) {
  const rnd = IQ.rng(4242 + level);
  let hit = 0;
  const arr = data(level);
  for (const { item, spec } of arr) if (solver(item, spec, rnd) === item.correct) hit++;
  return { acc: hit / arr.length, k: arr[0].item.options.length };
}

const SOLVERS = {
  'ko\'pchilik (atributlar)': (item, spec, rnd) => pickBest(voteScores(spec.options.map(attrFeats)), rnd),
  'ko\'pchilik (modal variant)': (item, spec, rnd) => pickBest(modalScores(spec.options), rnd),
  'ko\'pchilik (SVG teglari)': (item, spec, rnd) => pickBest(voteScores(item.options.map(o => svgFeats(o.svg))), rnd),
  'ozchilik (atributlar)': (item, spec, rnd) => pickBest(voteScores(spec.options.map(attrFeats)), rnd, false),
  'o\'rtacha qiymat': (item, spec, rnd) => pickBest(middleScores(spec.options), rnd),
};

test('KO\'R YECHUVCHI: faqat variantlarga qarab tasodifdan yuqori natija yo\'q (≤ 1/k + 0.05)', t => {
  const report = [];
  for (const [name, solver] of Object.entries(SOLVERS)) {
    const row = [];
    for (const level of LEVELS) {
      const { acc, k } = blindAccuracy(level, solver);
      row.push(acc.toFixed(3));
      assert.ok(acc <= 1 / k + 0.05,
        `"${name}" ${level}-darajada ${acc.toFixed(3)} topdi (tasodif ${(1 / k).toFixed(3)}) — variantlarda yorliq bor`);
    }
    report.push(name + ': ' + row.join(' '));
  }
  t.diagnostic('aniqlik, daraja 1..10 bo\'yicha:'); report.forEach(l => t.diagnostic(l));
});

test('KO\'R YECHUVCHI: boshqa urug\'larda o\'rgatilgan statistik model ham tasodif darajasida', t => {
  /* Naive Bayes: "to'g'ri javobda falon qiymat ko'proq uchraydimi?" —
     birinchi 1000 urug'da o'rganadi, qolgan 1000 da sinaladi. Qiymatlar
     taqsimotidagi har qanday og'ish (masalan to'g'ri javob ko'pincha eng
     katta son) shu yerda ko'rinadi. */
  const row = [];
  for (const level of LEVELS) {
    const arr = data(level);
    const train = arr.slice(0, N / 2), testSet = arr.slice(N / 2);
    const cC = new Map(), cD = new Map();
    let nC = 0, nD = 0;
    for (const { spec } of train) {
      spec.options.forEach((o, i) => {
        const m = i === spec.correct ? cC : cD;
        if (i === spec.correct) nC++; else nD++;
        for (const f of attrFeats(o)) m.set(f, (m.get(f) || 0) + 1);
      });
    }
    const rnd = IQ.rng(99 + level);
    let hit = 0;
    for (const { spec } of testSet) {
      const scores = spec.options.map(o => attrFeats(o).reduce((s, f) =>
        s + Math.log(((cC.get(f) || 0) + 1) / (nC + 2)) - Math.log(((cD.get(f) || 0) + 1) / (nD + 2)), 0));
      if (pickBest(scores, rnd) === spec.correct) hit++;
    }
    const acc = hit / testSet.length, k = arr[0].spec.k;
    row.push(acc.toFixed(3));
    assert.ok(acc <= 1 / k + 0.05, `naive Bayes ${level}-darajada ${acc.toFixed(3)} (tasodif ${(1 / k).toFixed(3)})`);
  }
  t.diagnostic('naive Bayes aniqligi, daraja 1..10: ' + row.join(' '));
});

test('to\'g\'ri javob o\'rni tekis: 2000 urug\'da har o\'rin 1/k ± 0.04', t => {
  const report = [];
  for (const level of LEVELS) {
    const arr = data(level);
    const k = arr[0].item.options.length;
    const cnt = new Array(k).fill(0);
    for (const { item } of arr) {
      assert.equal(item.options.length, k, 'bir darajada variantlar soni o\'zgarmaydi');
      cnt[item.correct]++;
    }
    const share = cnt.map(c => c / arr.length);
    report.push(level + ': ' + share.map(x => x.toFixed(3)).join(' '));
    share.forEach((s, i) => assert.ok(Math.abs(s - 1 / k) <= 0.04,
      `${level}-daraja, ${i}-o'rin: ${s.toFixed(3)} (kutilgan ${(1 / k).toFixed(3)} ± 0.04)`));
  }
  report.forEach(l => t.diagnostic(l));
});

test('aniq bitta javob: mustaqil tekshiruvchi — har talqin to\'g\'ri javobni beradi, har distraktor qoidani buzadi', () => {
  for (const level of LEVELS) {
    for (const { seed, spec } of data(level)) {
      const where = `level ${level}, seed ${seed}`;
      const truth = spec.options[spec.correct];
      assert.equal(canon(truth), canon(spec.cells[2][2]), where + ': to\'g\'ri variant matritsaning (3,3) katagi');
      const A = analyse(spec);
      const tf = features(truth);

      /* 1) Mos keladigan HAR qoida to'g'ri javobni bashorat qiladi —
         "boshqacha o'qish"da boshqa javob chiqmaydi. */
      for (const [key, preds] of Object.entries(A)) {
        for (const x of preds) {
          assert.ok(x.ok(tf[key]), `${where}: "${key}" bo'yicha "${x.name}" qoidasi ${x.p} deydi, javob esa ${tf[key]}`);
        }
      }
      /* 2) Generator e'lon qilgan har qoida haqiqatan ko'rinadi. */
      for (const a of spec.attrs) {
        assert.ok(A[a.key].length > 0, `${where}: "${a.key}" (${a.rule.name}) qoidasini tekshiruvchi topa olmadi`);
      }
      /* 3) Har distraktor kamida bitta qoidani buzadi; generatorning ichki
         tavsifi mustaqil tekshiruvchi bilan tasdiqlanadi. */
      spec.options.forEach((o, i) => {
        if (i === spec.correct) { assert.deepEqual(spec.violations[i], []); return; }
        const of = features(o);
        const broken = Object.keys(A).filter(key => A[key].length > 0 && A[key].some(x => !x.ok(of[key])));
        assert.ok(broken.length > 0, `${where}: ${i}-variant hech qaysi qoidani buzmaydi`);
        const v = spec.violations[i];
        assert.ok(v.length > 0, `${where}: ${i}-variant uchun generator buzilgan qoidani bilmaydi`);
        for (const x of v) {
          assert.equal(x.expected, truth[x.key]);
          assert.equal(x.got, o[x.key]);
          assert.notEqual(x.got, x.expected);
          assert.ok(broken.includes(x.key), `${where}: generator "${x.key}" buzilgan deydi, tekshiruvchi tasdiqlamadi`);
        }
      });
    }
  }
});

test('variantlar kanonik tavsif bo\'yicha juft-juft farqli, SVG tavsifga mos', () => {
  for (const level of LEVELS) {
    /* Chizuvchi in'ektivmi: bir xil sxemadagi (joylashuv + atributlar
       to'plami) ikki xil tavsif bir xil rasm bermasligi kerak. Turli
       sxemalar solishtirilmaydi: bitta savol ichida sxema yagona. */
    const drawn = new Map();
    for (const [n, { seed, item, spec }] of data(level).entries()) {
      const where = `level ${level}, seed ${seed}`;
      const keys = spec.options.map(canon);
      assert.equal(new Set(keys).size, keys.length, where + ': variantlar kanonik tavsif bo\'yicha takrorlangan');
      assert.equal(new Set(item.options.map(o => o.svg)).size, keys.length, where + ': SVG takrorlangan');
      if (n >= 500) continue;   // qayta chizish qimmat — tavsif↔rasm bog'lanishi 500 ta savolda
      const panels = spec.options.concat(spec.cells.flat());
      for (const p of panels) {
        const svg = spec.layout + '|' + Object.keys(p).sort().join() + '|' + gen.panelSvg(spec.layout, p);
        const prev = drawn.get(svg);
        assert.ok(prev === undefined || prev === canon(p), where + ': ikki xil tavsif bir xil chizildi: ' + prev + ' / ' + canon(p));
        drawn.set(svg, canon(p));
      }
      /* Variant aynan o'z tavsifining rasmi. */
      spec.options.forEach((o, i) => {
        const body = gen.panelSvg(spec.layout, o);
        const svg = item.options[i].svg;
        assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff"/>'));
        /* Variantda matritsa katagi bilan aynan bir xil ramka bor (o'lcham
           ramkaga nisbatan solishtiriladi), undan keyin — tavsif rasmi. */
        assert.ok(svg.endsWith(CELL_FRAME + body + '</svg>'), where + `: ${i}-variant rasmi tavsifga mos emas`);
      });
      /* Stimulda 8 ta ma'lum katak aynan tavsifdagidek chizilgan. */
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        if (r === 2 && c === 2) continue;
        assert.ok(item.stimulus.svg.includes(CELL_FRAME + gen.panelSvg(spec.layout, spec.cells[r][c]) + '</g>'),
          where + `: (${r},${c}) katak tavsifga mos emas`);
      }
      assert.equal((item.stimulus.svg.match(/<g /g) || []).length, 9, where + ': 9 ta katak bo\'lishi kerak');
    }
  }
});

/* Qiyinlik: generator ichidagi og'irliklardan MUSTAQIL o'lchov. */
const HARD = ['arith', 'shift', 'or', 'and', 'xor'];
const T_WEIGHT = { same: 0, const: 0.5, prog: 1, dist3: 1.5, shift: 2, or: 2, and: 2, arith: 2.5, xor: 3 };

test('daraja murakkablikni oshiradi: atributlar soni, qoida turlari, variantlar soni', t => {
  const rows = [];
  let prev = null;
  for (const level of LEVELS) {
    const arr = data(level);
    const varying = arr.map(x => x.spec.attrs.filter(a => a.rule.name !== 'same'));
    const s = {
      level,
      k: arr[0].spec.k,
      vary: varying.reduce((t, v) => t + v.length, 0) / arr.length,
      score: varying.reduce((t, v) => t + v.reduce((u, a) => u + T_WEIGHT[a.rule.name], 0), 0) / arr.length,
      hard: varying.filter(v => v.some(a => HARD.includes(a.rule.name))).length / arr.length,
      /* Distraktorlar sinaydigan O'ZGARUVCHI atributlar (doimiy o'q —
         masalan 1-darajadagi "rang hamma joyda bir xil" — hisobga kirmaydi). */
      axes: arr.reduce((t, x) => t + x.spec.attrs.filter(a => a.axis >= 0 && a.rule.name !== 'same').length, 0) / arr.length,
    };
    rows.push(`${level}: k=${s.k} o'zgaruvchi=${s.vary.toFixed(2)} ball=${s.score.toFixed(2)} og'ir=${s.hard.toFixed(2)} o'qlar=${s.axes.toFixed(2)}`);
    if (prev) {
      assert.ok(s.k >= prev.k, `${level}: variantlar soni kamaydi`);
      assert.ok(s.vary >= prev.vary, `${level}: o'zgaruvchi atributlar soni kamaydi`);
      assert.ok(s.score > prev.score, `${level}: qoidalar murakkabligi oshmadi (${prev.score.toFixed(2)} → ${s.score.toFixed(2)})`);
      assert.ok(s.axes >= prev.axes, `${level}: distraktorlar sinaydigan atributlar soni kamaydi`);
    }
    if (level <= 5) assert.equal(s.hard, 0, `${level}: past darajada arifmetika/XOR bo'lmasligi kerak`);
    if (level >= 9) assert.equal(s.hard, 1, `${level}: yuqori darajada har savolda og'ir qoida bo'lishi kerak`);
    prev = s;
  }
  assert.equal(data(1)[0].spec.k, 4);
  assert.equal(data(10)[0].spec.k, 6);
  assert.ok(prev.vary >= 4, '10-darajada kamida 4 ta atribut o\'zgaradi');
  /* Arifmetika va ustma-ust qo'yishning hammasi yuqori darajalarda uchraydi. */
  const seen = new Set();
  for (const level of [6, 7, 8, 9, 10]) for (const { spec } of data(level)) for (const a of spec.attrs) seen.add(a.rule.name);
  for (const r of ['arith', 'xor', 'or', 'and', 'shift', 'dist3', 'prog']) assert.ok(seen.has(r), r + ' qoidasi hech qachon chiqmadi');
  rows.forEach(l => t.diagnostic(l));
});

test('b: IQ.levelToB(level) ± 0.75 ichida va daraja bilan o\'sadi', () => {
  let prev = -Infinity;
  for (const level of LEVELS) {
    const arr = data(level);
    for (const { item } of arr) assert.ok(Math.abs(item.b - IQ.levelToB(level)) <= 0.75 + 1e-9);
    const mean = arr.reduce((s, x) => s + x.item.b, 0) / arr.length;
    assert.ok(mean > prev, `${level}: o'rtacha b oshmadi`);
    prev = mean;
  }
});

test('SVG qoidalari: oq fon, faqat uch rang, viewBox, ichki shtrix naqshi, tashqi havola yo\'q', () => {
  const PAINTS = new Set(['#1c1b29', '#8a8799', '#fff', 'none', 'url(#zh)']);
  for (const level of LEVELS) {
    for (const { seed, item } of data(level).slice(0, 500)) {
      const where = `level ${level}, seed ${seed}`;
      const all = [item.stimulus.svg].concat(item.options.map(o => o.svg));
      for (const svg of all) {
        const m = /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 (\d+) (\d+)"><rect width="(\d+)" height="(\d+)" fill="#fff"\/>/.exec(svg);
        assert.ok(m, where + ': SVG boshi (viewBox + oq fon) noto\'g\'ri');
        assert.equal(m[1], m[3]); assert.equal(m[2], m[4]);
        for (const [, v] of svg.matchAll(/(?:fill|stroke)="([^"]*)"/g)) assert.ok(PAINTS.has(v), where + ': ruxsat etilmagan rang ' + v);
        assert.ok(!/<script|<foreignObject|\son\w+=|<image|<use/i.test(svg), where + ': taqiqlangan element');
        assert.ok(!/href/.test(svg), where + ': havola bo\'lmasligi kerak');
        if (svg.includes('url(#zh)')) assert.ok(/<pattern id="zh"[^>]*>.*<\/pattern>/.test(svg), where + ': shtrix naqshi aniqlanmagan');
        /* Chiziqlar telefonda ko'rinadigan qalinlikda. */
        for (const [, w] of svg.matchAll(/stroke-width="([\d.]+)"/g)) assert.ok(+w >= 1.5, where + ': juda ingichka chiziq ' + w);
      }
      for (const o of item.options) assert.ok(o.svg.includes('viewBox="0 0 100 100"'), where + ': variant 100×100 emas');
      const [, w, h] = /viewBox="0 0 (\d+) (\d+)"/.exec(item.stimulus.svg);
      assert.ok(+w / +h <= 1.6 && +w >= 300 && +w <= 340, where + ': stimul o\'lchami: ' + w + '×' + h);
    }
  }
});

test('rang yagona farq emas: to\'ldirish faqat oq / shtrix / kulrang / qora', () => {
  for (const level of LEVELS) {
    for (const { spec } of data(level)) {
      for (const p of spec.options.concat(spec.cells.flat())) {
        if (p.fill !== undefined) assert.ok(['white', 'hatch', 'gray', 'black'].includes(p.fill));
      }
    }
  }
});

test('explain: o\'zgaradigan har atribut va uning qoidasi uz va ru da aytiladi', () => {
  const RULE_WORDS = {
    prog: { uz: /pogʻona|taga|burchaklar soni|buriladi/, ru: /ступен|на \d|число углов|поворачивается/ },
    dist3: { uz: /bittadan uchraydi/, ru: /по одному разу/ },
    const: { uz: /qator ichida oʻzgarmaydi/, ru: /внутри строки не меняется/ },
    same: { uz: /hamma katakda bir xil/, ru: /во всех клетках одинаково/ },
    arith: { uz: /3-ustun = 1-ustun [+−] 2-ustun/, ru: /3-й столбец = 1-й [+−] 2-й/ },
    shift: { uz: /suriladi|buriladi/, ru: /сдвигаются|поворачиваются/ },
    or: { uz: /hammasi saqlanadi/, ru: /всё сохраняется/ },
    xor: { uz: /faqat bittasida/, ru: /лишь на одной/ },
    and: { uz: /ikkalasida ham bor/, ru: /и на 1-й, и на 2-й/ },
  };
  for (const level of LEVELS) {
    for (const { seed, item, spec } of data(level).slice(0, 400)) {
      for (const a of spec.attrs) {
        if (a.rule.name === 'same' && a.axis < 0) continue;
        for (const lang of ['uz', 'ru']) {
          const line = item.explain[lang].split('\n').find(l => l.startsWith('• ' + a.name[lang] + ':'));
          assert.ok(line, `level ${level}, seed ${seed}: ${lang} explain'da "${a.name[lang]}" yo'q`);
          assert.match(line, RULE_WORDS[a.rule.name][lang]);
        }
      }
    }
  }
});
