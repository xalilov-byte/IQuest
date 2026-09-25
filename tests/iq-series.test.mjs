/* ─────────────────────────────────────────────────────────────────────────
   src/iq/gen/series.js — son qatorlari va sonli 3×3 panjara

   NIMA UCHUN BU TEST MUHIM: son qatorida xato savol JIMGINA natijani
   buzadi. "1, 2, 4, ?" — ×2 bo'lsa 8, farqlar +1, +2 bo'lsa 7. Ikkalasi
   variantda bo'lsa, to'g'ri fikrlagan odam "xato" deb baholanadi va buni
   hech kim sezmaydi. Shuning uchun bir ma'nolilik IKKI marta
   tekshiriladi:
     · generator ichida (o'z qoidalar kutubxonasi — fitSeries/fitGrid);
     · shu yerda, MUSTAQIL — boshqa usulda yozilgan tekshirgich bilan
       (Lagranj ekstrapolyatsiyasi, parametrlarni yechish o'rniga saralab
       chiqish). Generator fitter'idagi xato bu yerda ushlanadi.

   Savol faqat shartnomadagi ochiq shakldan (stimulus matni / SVG,
   variantlar) o'qiladi — generatorning ichki javobiga ishonilmaydi.

   Ishga tushirish:  node --test tests/iq-series.test.mjs

   Fayllar node:vm ichida `window` taqlidi bilan yuklanadi — manbaga test
   uchun birorta o'zgartirish kiritilmagan.
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const FILES = ['src/iq/rng.js', 'src/iq/index.js', 'src/iq/gen/series.js'];
const SRC = FILES.map(f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8'));

/* Har chaqiruv — yangi, toza muhit. Ikkita muhitda bir xil savol chiqishi
   yashirin global holat yo'qligini isbotlaydi. */
function realm() {
  const ctx = {};
  ctx.window = ctx;
  vm.createContext(ctx);
  FILES.forEach((f, i) => vm.runInContext(SRC[i], ctx, { filename: f }));
  return ctx.IQ;
}

/* vm realm'idagi obyektlar boshqa prototipga ega — deepEqual uchun oddiy JSON. */
const plain = x => JSON.parse(JSON.stringify(x));

const IQ = realm();
const G = IQ.generator('series');
const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const N = 3000;                             // validlik va bir ma'nolilik: 3000 urug' × 10 daraja
const N_POS = 2000;                         // o'rinlar tekisligi: shartnomadagi 2000
const seedOf = s => (Math.imul(s + 1, 2654435761) >>> 0);   // urug'lar butun uint32 bo'ylab tarqalsin

/* Korpus bir marta yaratiladi — hamma testlar shundan foydalanadi. */
let corpus = null;
function getCorpus() {
  if (corpus) return corpus;
  corpus = {};
  for (const L of LEVELS) {
    corpus[L] = [];
    for (let s = 0; s < N; s++) corpus[L].push(G.inspect(seedOf(s), L));
  }
  return corpus;
}

/* ── Ochiq shakldan o'qish ────────────────────────────────────────────── */

const num = s => Number(String(s).replace(/−/g, '-'));
const isGrid = it => it.stimulus.kind === 'svg';

function parseSeries(it) {
  const parts = it.stimulus.uz.split(', ');
  assert.equal(parts.pop(), '?', 'qator "?" bilan tugashi kerak: ' + it.stimulus.uz);
  return parts.map(num);
}

function parseGrid(it) {
  const cells = [...it.stimulus.svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(x => x[1]);
  assert.equal(cells.length, 9, 'panjarada 9 katak bo\'lishi kerak');
  assert.equal(cells[8], '?', 'so\'roq belgisi o\'ng pastda');
  const v = cells.slice(0, 8).map(num);
  return [[v[0], v[1], v[2]], [v[3], v[4], v[5]], [v[6], v[7], null]];
}

/* Array.from — natija shu realm massivi bo'lsin (vm massivining .map'i vm massivini qaytaradi). */
const optionValues = it => Array.from(it.options, o => num(o.uz));

/* ══ MUSTAQIL QOIDALAR TEKSHIRGICHI ════════════════════════════════════
   Generatordagi oilalar bilan bir xil ro'yxat, lekin boshqacha yozilgan:
   parametrlar yechilmaydi, kichik to'plamdan saralab ko'riladi;
   polinomlar farqlar jadvali emas, Lagranj bilan. Maqsad — generator
   fitter'idagi xatoni ushlash. */

const same = (a, b) => isFinite(a) && isFinite(b) && Math.abs(a - b) < 1e-7 * Math.max(1, Math.abs(a), Math.abs(b));
const rnd = v => (Math.abs(v - Math.round(v)) < 1e-6 ? Math.round(v) : v);
const seqOf = (n, f) => Array.from({ length: n }, (_, i) => f(i));
const fitsFrom = (t, from, f) => { for (let i = from; i < t.length; i++) if (!same(f(i), t[i])) return false; return true; };

function lagrange(xs, ys, x) {
  let s = 0;
  for (let i = 0; i < xs.length; i++) {
    let p = ys[i];
    for (let j = 0; j < xs.length; j++) if (j !== i) p *= (x - xs[j]) / (xs[i] - xs[j]);
    s += p;
  }
  return s;
}

const P1 = [];
for (let p = -6; p <= 6; p++) P1.push(p);
for (const [a, b] of [[1, 2], [1, 3], [1, 4], [1, 5], [2, 3], [3, 2], [5, 2]]) P1.push(a / b, -a / b);

const isPrime = n => { if (!Number.isInteger(n) || n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };

/* Ichki qator uchun: arifmetik (va kerak bo'lsa geometrik) davomi. */
function subNext(s, withGeom) {
  const out = [];
  if (s.length < 2) return out;
  const d = s[1] - s[0];
  if (s.every((v, i) => v === s[0] + i * d)) out.push(s[s.length - 1] + d);
  if (withGeom && s[0] !== 0 && s[1] !== 0) {
    const q = s[1] / s[0];
    if (s.every((v, i) => same(s[0] * q ** i, v))) out.push(s[s.length - 1] * q);
  }
  return out;
}

/* Qatorning barcha "odamona" davomlari: [{ rule, next }]. */
function rulesSeries(t) {
  const n = t.length, out = [];
  const push = (rule, v) => { if (isFinite(v)) out.push({ rule, next: rnd(v) }); };
  const last = t[n - 1], prev = t[n - 2];
  if (n < 3) return out;
  // polinom 1..3 daraja (arifmetik, ikkinchi/uchinchi farq, kvadrat, kub)
  for (let deg = 1; deg <= 3; deg++) {
    if (n < deg + 1) continue;
    const xs = seqOf(deg + 1, i => n - deg - 1 + i), ys = xs.map(i => t[i]);
    if (t.every((v, i) => same(lagrange(xs, ys, i), v))) push('poly' + deg, lagrange(xs, ys, n));
  }
  // geometrik (istalgan nisbat)
  if (t[0] !== 0 && t[1] !== 0) { const q = t[1] / t[0]; if (t.every((v, i) => same(t[0] * q ** i, v))) push('geom', last * q); }
  // x → p·x + q (p kichik ratsional to'plamdan saralanadi)
  for (const p of P1) { const q = t[1] - p * t[0]; if (fitsFrom(t, 2, i => p * t[i - 1] + q)) push('lin1', p * last + q); }
  // a(n) = p·a(n−1) + q·a(n−2), p, q butun −4..4 (Fibonachchi ham shu ichida)
  for (let p = -4; p <= 4; p++) for (let q = -4; q <= 4; q++) if (fitsFrom(t, 2, i => p * t[i - 1] + q * t[i - 2])) push('lin2', p * last + q * prev);
  { const c = t[2] - t[1] - t[0]; if (fitsFrom(t, 3, i => t[i - 1] + t[i - 2] + c)) push('fibc', last + prev + c); }
  if (n >= 4 && fitsFrom(t, 3, i => t[i - 1] + t[i - 2] + t[i - 3])) push('trib', last + prev + t[n - 3]);
  if (fitsFrom(t, 2, i => t[i - 1] * t[i - 2])) push('prodfib', last * prev);
  // ko'paytuvchi arifmetik o'sadi (×2, ×3, ×4 …)
  if (t.slice(0, -1).every(v => v !== 0)) {
    const R = t.slice(1).map((v, i) => v / t[i]), e = R[1] - R[0];
    if (R.every((x, i) => same(x, R[0] + i * e))) push('ratio', last * (R[0] + (n - 1) * e));
  }
  // qatorlar almashinuvi: 2 ta (arifmetik/geometrik), 3 ta (arifmetik)
  for (const K of [2, 3]) {
    const subs = seqOf(K, c => t.filter((_, i) => i % K === c));
    if (subs.some(s => s.length < 2)) continue;
    const nx = subs.map(s => subNext(s, K === 2));
    if (nx.every(o => o.length)) for (const v of nx[n % K]) push('inter' + K, v);
  }
  // amallar sikli: 2 va 3 qadam, har biri +c yoki ×c
  for (const K of [2, 3]) {
    if (n - 1 < K) continue;
    const cls = seqOf(K, () => []);
    for (let j = 0; j < n - 1; j++) cls[j % K].push([t[j], t[j + 1]]);
    const ops = cls.map(ps => {
      const o = [];
      if (ps.every(p => p[1] - p[0] === ps[0][1] - ps[0][0])) o.push(x => x + ps[0][1] - ps[0][0]);
      if (ps.every(p => p[0] !== 0) && ps.every(p => same(p[1] / p[0], ps[0][1] / ps[0][0]))) o.push(x => x * ps[0][1] / ps[0][0]);
      return o;
    });
    if (ops.every(o => o.length)) for (const f of ops[(n - 1) % K]) push('cycle' + K, f(last));
  }
  { const c = t[1] - t[0] * t[0]; if (fitsFrom(t, 2, i => t[i - 1] * t[i - 1] + c)) push('sqprev', last * last + c); }
  if (t.every(isPrime) && t.every((v, i) => i === 0 || (v > t[i - 1] && seqOf(v - t[i - 1] - 1, j => t[i - 1] + 1 + j).every(x => !isPrime(x))))) {
    let p = last + 1; while (!isPrime(p)) p++; push('primes', p);
  }
  return out;
}

/* Panjara: qator va ustun uchliklari (x, y → z) va panjarani qator deb o'qish. */
const AFF = [[1, 1], [-1, 2], [1, -1], [-1, 1], [1, 0], [0, 1], [-1, -1]];   // z = a·x + b·y + c
function tripleNext(T) {
  const out = [];
  const [[x0, y0, z0], [x1, y1, z1], [x2, y2]] = T;
  for (const [a, b] of AFF) { const c = z0 - a * x0 - b * y0; if (same(a * x1 + b * y1 + c, z1)) out.push(a * x2 + b * y2 + c); }
  { const c = z0 - x0 * y0; if (same(x1 * y1 + c, z1)) out.push(x2 * y2 + c); }
  for (const g of [(x) => x, (x, y) => y, (x, y) => x + y]) {
    const d0 = g(x0, y0); if (d0 === 0) continue;
    const k = z0 / d0; if (same(g(x1, y1) * k, z1)) out.push(g(x2, y2) * k);
  }
  for (const f of [(x, y) => x / y, (x, y) => y / x, (x, y) => y * y / x]) {
    if (same(f(x0, y0), z0) && same(f(x1, y1), z1)) out.push(f(x2, y2));
  }
  const key = a => a.slice().sort((p, q) => p - q).join();
  if (key(T[0]) === key(T[1])) {
    const rest = T[0].slice();
    let ok = true;
    for (const v of [x2, y2]) { const i = rest.indexOf(v); if (i < 0) ok = false; else rest.splice(i, 1); }
    if (ok) out.push(rest[0]);
  }
  return out.filter(isFinite).map(rnd);
}

function rulesGrid(M) {
  const col = j => [M[0][j], M[1][j], M[2][j]];
  const preds = tripleNext([M[0], M[1], [M[2][0], M[2][1]]]).concat(tripleNext([col(0), col(1), [M[0][2], M[1][2]]]));
  const rm = [M[0][0], M[0][1], M[0][2], M[1][0], M[1][1], M[1][2], M[2][0], M[2][1]];
  const cm = [M[0][0], M[1][0], M[2][0], M[0][1], M[1][1], M[2][1], M[0][2], M[1][2]];
  for (const r of rulesSeries(rm).concat(rulesSeries(cm))) preds.push(r.next);
  return preds;
}

/* Savol bir ma'noli emasligi sabablari (bo'sh — yaxshi):
     · to'g'ri javob birorta qoida bilan asoslanmagan;
     · biror distraktor boshqa mos qoidaning javobi. */
function ambiguity(it) {
  const preds = new Set(isGrid(it) ? rulesGrid(parseGrid(it)) : rulesSeries(parseSeries(it)).map(r => r.next));
  const vals = optionValues(it), ans = vals[it.correct], errs = [];
  if (!preds.has(ans)) errs.push('javob hech qaysi qoida bilan asoslanmagan: ' + ans);
  vals.forEach((v, i) => { if (i !== it.correct && preds.has(v)) errs.push('distraktor ' + v + ' ham qoidaga mos'); });
  return errs;
}

/* ── Statistika yordamchilari (salbiy testlarda ham tekshiriladi) ─────── */

/* Har o'rin ulushi 1/k ± tol ichidami. Buzilgan o'rinlar ro'yxati. */
function uniformBad(indices, k, tol = 0.04) {
  const c = new Array(k).fill(0);
  for (const i of indices) c[i]++;
  return c.map((x, i) => ({ i, share: x / indices.length })).filter(o => Math.abs(o.share - 1 / k) > tol);
}

const sortedRank = it => { const v = optionValues(it), a = v[it.correct]; return v.filter(x => x < a).length; };

const ruRaz = n => { const m10 = n % 10, m100 = n % 100; return m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'раза' : 'раз'; };

/* ══ TESTLAR ═══════════════════════════════════════════════════════════ */

test('ro\'yxatdan o\'tgan: IQ.types() da "series", label uz/ru', () => {
  assert.ok(IQ.types().includes('series'));
  assert.equal(G.type, 'series');
  assert.ok(G.label.uz && G.label.ru);
});

test('minglab urug\' × har daraja: validateItem bo\'sh, shakl to\'g\'ri', () => {
  const C = getCorpus();
  for (const L of LEVELS) {
    for (const x of C[L]) {
      const it = x.item;
      assert.deepEqual(plain(IQ.validateItem(it)), [], it.id);
      assert.equal(it.type, 'series');
      assert.equal(it.level, L);
      assert.match(it.id, new RegExp('^series:' + L + ':\\d+$'));
      assert.equal(it.options.length, G.optionCount(L), 'variantlar soni darajaga mos');
      assert.ok(it.options.length >= 4 && it.options.length <= 6);
      const vals = optionValues(it);
      assert.equal(new Set(vals).size, vals.length, 'variantlar son sifatida ham har xil: ' + it.id);
      assert.equal(vals[it.correct], x.answer, 'correct indeksi javobga ishora qiladi');
      const lim = isGrid(it) ? 1000 : 10000;
      const shown = isGrid(it) ? [].concat(...parseGrid(it)).filter(v => v !== null) : parseSeries(it);
      for (const v of shown.concat(vals)) {
        assert.ok(Number.isInteger(v) && Math.abs(v) < lim, 'son butun va |x| < ' + lim + ': ' + v + ' ' + it.id);
      }
      if (!isGrid(it)) {
        assert.ok(shown.length >= 5 && shown.length <= 7, '5–7 had: ' + it.stimulus.uz);
        assert.equal(it.stimulus.uz, it.stimulus.ru);
      }
      assert.equal(x.fallback, false, 'zaxira (oddiy +d) yo\'liga tushmasligi kerak: ' + it.id);
    }
  }
});

test('deterministik: bir xil (seed, level) → aynan bir xil savol, boshqa muhitda ham', () => {
  const IQ2 = realm();
  for (const L of LEVELS) {
    for (let s = 0; s < 300; s++) {
      const seed = seedOf(s);
      const a = plain(G.generate(seed, L));
      assert.deepEqual(plain(G.generate(seed, L)), a);
      assert.deepEqual(plain(IQ2.generator('series').generate(seed, L)), a, 'yangi muhitda ham bir xil');
      assert.deepEqual(plain(IQ.makeItem('series', seed, L)), a, 'makeItem orqali ham bir xil');
    }
  }
  // Math.random / vaqtga bog'liqlik yo'q
  const src = SRC[2].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.ok(!/Math\.random|Date\.now|new Date/.test(src), 'faqat IQ.rng');
});

test('turli urug\' — turli savol (generator "qotib" qolmagan)', () => {
  for (const L of LEVELS) {
    const stim = new Set(getCorpus()[L].slice(0, 500).map(x => JSON.stringify([x.item.stimulus, x.item.options])));
    assert.ok(stim.size >= 400, 'daraja ' + L + ': 500 urug\'dan faqat ' + stim.size + ' xil savol');
  }
});

test('bir ma\'nolilik (misol): "1, 2, 4, ?" — ×2 → 8 va farqlar +1,+2 → 7 ikkalasi topiladi', () => {
  const gen = plain(G.fitSeries([1, 2, 4]));
  assert.ok(gen.some(f => f.fam === 'geom' && f.next === 8), 'generator fitter: ×2 → 8');
  assert.ok(gen.some(f => f.fam === 'diff2' && f.next === 7), 'generator fitter: +1, +2, +3 → 7');
  const mine = rulesSeries([1, 2, 4]).map(r => r.next);
  assert.ok(mine.includes(8) && mine.includes(7), 'mustaqil tekshirgich ham ikkalasini topadi');
});

test('bir ma\'nolilik: MUSTAQIL tekshirgich — har savolda javob asosli, distraktor hech qaysi mos qoidaning javobi emas', (t) => {
  const C = getCorpus();
  let n = 0;
  for (const L of LEVELS) {
    for (const x of C[L]) {
      assert.deepEqual(ambiguity(x.item), [], x.item.id + ' ' + (x.item.stimulus.uz || 'panjara ' + JSON.stringify(x.grid)));
      n++;
    }
  }
  t.diagnostic('mustaqil tekshiruvdan o\'tgan savollar: ' + n);
});

test('bir ma\'nolilik: generatorning o\'z fitter\'i topgan muqobil javoblar variantlarda yo\'q', (t) => {
  const C = getCorpus();
  const tot = { attempts: 0, occam: 0, self: 0, leak: 0, dropped: 0, gen: 0, opts: 0 };
  const by = {};
  for (const L of LEVELS) {
    for (const x of C[L]) {
      const vals = optionValues(x.item);
      const alts = plain(x.alts);
      assert.ok(alts.some(a => a.fam === x.fam && a.next === x.answer), 'mo\'ljallangan qoida javobni beradi: ' + x.item.id);
      for (const a of alts) {
        if (a.next === x.answer) continue;
        vals.forEach((v, i) => assert.ok(i === x.item.correct || v !== a.next, x.item.id + ': ' + a.fam + ' → ' + a.next + ' variantda'));
        // Okkam: murakkab bo'lmagan muqobil qoida haqiqiy dalil bilan mos kelmagan
        const own = alts.find(o => o.fam === x.fam && o.next === x.answer);
        assert.ok(!(a.checks >= 1 && Number.isInteger(a.next) && a.cx <= own.cx), x.item.id + ': oddiyroq ' + a.fam + ' → ' + a.next);
      }
      tot.attempts += x.attempts;
      for (const k of ['occam', 'self', 'leak', 'dropped', 'gen', 'opts']) tot[k] += x.stats[k];
      for (const o of x.stats.occamBy) { const f = o.split('>')[1]; by[f] = (by[f] || 0) + 1; }
    }
  }
  assert.equal(tot.leak, 0, 'variant tanlash avoid\'ni hurmat qiladi — oxirgi himoya ishga tushmasligi kerak');
  const items = LEVELS.length * N;
  t.diagnostic(`${items} savol, ${tot.attempts} urinish. Rad etilgan: Okkam (oddiyroq muqobil qoida) ${tot.occam}, ` +
    `o'z qoidasi mos kelmagan ${tot.self}, parametr yaramagan ${tot.gen}; muqobil javob bo'lgani uchun olib tashlangan distraktor nomzodlari ${tot.dropped}`);
  t.diagnostic('Okkam sabablari (oila → soni): ' + JSON.stringify(Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 12)));
});

test('distraktorlar: qaysi xato ekani ma\'lum, juft-juft farqli, javobga teng emas, ishonarli xatolar ulushi yetarli', () => {
  const C = getCorpus();
  const WHY = new Set(plain(G.why));
  for (const L of LEVELS) {
    let plausible = 0, all = 0;
    for (const x of C[L]) {
      const vals = optionValues(x.item);
      const ds = plain(x.distractors);
      assert.equal(ds.length, vals.length - 1);
      assert.deepEqual(ds.map(d => d.v).sort((a, b) => a - b), vals.filter((_, i) => i !== x.item.correct).sort((a, b) => a - b));
      assert.equal(new Set(ds.map(d => d.v)).size, ds.length);
      /* Ko'rsatilgan hadni takrorlash — tekin "yo'q" variant bo'lardi. Istisno:
         javobning o'zi qatorda bor (davriy qator) — shunda boshqa hadlar ham
         variant bo'la oladi (aks holda javob "qatordagi yagona son" bo'lib qoladi). */
      if (!isGrid(x.item)) {
        const t = parseSeries(x.item);
        assert.ok(!ds.some(d => d.v === t[t.length - 1]), 'oxirgi had variantda: ' + x.item.id);
        if (!t.includes(x.answer)) assert.ok(!ds.some(d => t.includes(d.v)), 'ko\'rsatilgan had variantda: ' + x.item.id);
      }
      for (const d of ds) {
        assert.ok(WHY.has(d.why), 'noma\'lum xato turi: ' + d.why);
        assert.notEqual(d.v, x.answer);
        all++;
        if (d.why !== 'off') plausible++;
      }
    }
    /* "±1 hisob xatosi" ham ruxsat etilgan xato, lekin ko'pchilik bo'lmasin.
       1-darajada (+d) javobdan PASTDA qoidaga asoslangan xato deyarli yo'q —
       shuning uchun chegara 0.40. */
    assert.ok(plausible / all >= 0.40, 'daraja ' + L + ': ishonarli xatolar ulushi ' + (plausible / all).toFixed(2));
  }
});

test('to\'g\'ri javob o\'rni tekis: 2000 urug\'da har o\'rin 1/k ± 0.04 (ko\'rsatilgan tartib va saralangan tartib)', () => {
  const C = getCorpus();
  for (const L of LEVELS) {
    const items = C[L].slice(0, N_POS).map(x => x.item), k = G.optionCount(L);
    assert.deepEqual(uniformBad(items.map(it => it.correct), k), [], 'daraja ' + L + ': ko\'rsatilgan o\'rin');
    assert.deepEqual(uniformBad(items.map(sortedRank), k), [], 'daraja ' + L + ': saralangandagi o\'rin ("o\'rtachasi" yorlig\'i)');
  }
});

test('ayyorlik strategiyalari tasodifdan sezilarli yaxshi emas ("to\'da markazi", "±1 qo\'shnisi bor")', () => {
  const C = getCorpus();
  for (const L of LEVELS) {
    const k = G.optionCount(L);
    let clus = 0, nb = 0;
    const items = C[L].slice(0, N_POS).map(x => x.item);
    for (const it of items) {
      const v = optionValues(it);
      const sc = v.map(a => v.filter(b => b !== a && Math.abs(a - b) <= 2).length), best = Math.max(...sc);
      const c1 = sc.map((c, i) => (c === best ? i : -1)).filter(i => i >= 0);
      if (c1.includes(it.correct)) clus += 1 / c1.length;
      const c2 = v.map((a, i) => (v.some(b => Math.abs(a - b) === 1) ? i : -1)).filter(i => i >= 0);
      nb += c2.length ? (c2.includes(it.correct) ? 1 / c2.length : 0) : 1 / k;
    }
    assert.ok(clus / items.length <= 1 / k + 0.05, 'daraja ' + L + ': to\'da strategiyasi ' + (clus / items.length).toFixed(3));
    assert.ok(nb / items.length <= 1 / k + 0.05, 'daraja ' + L + ': qo\'shni strategiyasi ' + (nb / items.length).toFixed(3));
  }
});

test('daraja qiyinlikni haqiqatan oshiradi', (t) => {
  const C = getCorpus();
  const cx = [], first = [], bAvg = [], grid = [];
  for (const L of LEVELS) {
    const xs = C[L];
    cx.push(xs.reduce((s, x) => s + x.cx, 0) / xs.length);
    bAvg.push(xs.reduce((s, x) => s + x.item.b, 0) / xs.length);
    grid.push(xs.filter(x => isGrid(x.item)).length / xs.length);
    /* Mustaqil o'lchov: javobni eng oddiy qoida (+d yoki ×r) bilan topsa
       bo'ladigan savollar ulushi. Daraja oshgani sari kamayishi kerak. */
    first.push(xs.filter(x => !isGrid(x.item) && rulesSeries(parseSeries(x.item)).some(r => (r.rule === 'poly1' || r.rule === 'geom') && r.next === x.answer)).length / xs.length);
  }
  t.diagnostic('o\'rtacha murakkablik: ' + cx.map(v => v.toFixed(2)).join(' '));
  t.diagnostic('+d / ×r bilan yechiladiganlar ulushi: ' + first.map(v => v.toFixed(2)).join(' '));
  t.diagnostic('panjara ulushi: ' + grid.map(v => v.toFixed(2)).join(' '));
  for (let i = 1; i < LEVELS.length; i++) {
    assert.ok(cx[i] > cx[i - 1] + 0.2, `murakkablik ${i}→${i + 1}: ${cx[i - 1].toFixed(2)} → ${cx[i].toFixed(2)}`);
    assert.ok(bAvg[i] > bAvg[i - 1], 'o\'rtacha b oshadi');
    assert.ok(first[i] <= first[i - 1] + 0.02, `oddiy qoidalar ulushi ${i}→${i + 1} oshmasin`);
  }
  assert.ok(first[0] >= 0.99 && first[9] <= 0.02, '1-daraja — deyarli hammasi +d/×r, 10-daraja — deyarli hech biri');
  assert.ok(grid.slice(0, 6).every(g => g === 0) && grid[9] > 0.2, 'panjara faqat yuqori darajada');
  for (const L of LEVELS) for (const x of C[L]) assert.ok(Math.abs(x.item.b - IQ.levelToB(L)) <= 0.75 + 1e-9);
});

test('explain: qoida uz va ru\'da, javob bilan; rus grammatikasi ("в 2 раза", "в 5 раз")', () => {
  const C = getCorpus();
  const seenRaz = new Set();
  for (const L of LEVELS) {
    for (const x of C[L]) {
      const it = x.item, ans = it.options[it.correct].uz;
      for (const lang of ['uz', 'ru']) {
        const s = it.explain[lang];
        assert.ok(s.includes(ans), lang + ' izohida javob yo\'q: ' + s);
        assert.ok(!/undefined|NaN|null|\[object|\$\{/.test(s), s);
        assert.ok(/[.!]$/.test(s), 'gap nuqta bilan tugaydi: ' + s);
        assert.ok(!/ {2}/.test(s), 'qo\'sh bo\'shliq: ' + s);
        assert.ok(!/--|\+ -|\+ −|− −\d/.test(s), 'ishora ketma-ket: ' + s);
      }
      assert.ok(!/[а-яё]/i.test(it.explain.uz), 'uz matnda kirill harfi: ' + it.explain.uz);
      assert.ok(/[а-яё]/i.test(it.explain.ru) && !/[a-z]/i.test(it.explain.ru), 'ru matn faqat kirillda: ' + it.explain.ru);
      assert.ok(!/[а-яё]/i.test(it.prompt.uz) && /[а-яё]/i.test(it.prompt.ru));
      /* \b kirill harfidan keyin ishlamaydi (JS'da \w faqat ASCII) — shuning uchun (?![а-яё]). */
      for (const mm of it.explain.ru.matchAll(/в (\d+) (раза|раз)(?![а-яё])/g)) {
        assert.equal(mm[2], ruRaz(Number(mm[1])), 'rus: ' + mm[0]);
        seenRaz.add(mm[2]);
      }
      assert.ok(!/в 1 раз/.test(it.explain.ru));
    }
  }
  assert.ok(seenRaz.has('раза') && seenRaz.has('раз'), 'ikkala shakl ham uchradi (tekshiruv bo\'sh o\'tmadi)');
});

test('panjara SVG: shartnoma qoidalari (xmlns, viewBox, oq fon, ruxsat etilgan ranglar, skriptsiz)', () => {
  const C = getCorpus();
  let n = 0;
  for (const L of LEVELS) {
    for (const x of C[L]) {
      if (!isGrid(x.item)) continue;
      n++;
      const svg = x.item.stimulus.svg;
      assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">'));
      assert.ok(svg.includes('<rect width="300" height="300" fill="#fff"/>'), 'o\'z oq foni');
      const colors = new Set([...svg.matchAll(/#[0-9a-f]{3,6}\b/gi)].map(mm => mm[0].toLowerCase()));
      for (const c of colors) assert.ok(['#fff', '#1c1b29', '#8a8799'].includes(c), 'ruxsat etilmagan rang ' + c);
      assert.ok(!/<script|\son\w+=|foreignObject|href/.test(svg));
      assert.equal((svg.match(/>\?</g) || []).length, 1);
    }
  }
  assert.ok(n > 1000, 'panjara savollari yetarli: ' + n);
});

/* ── Salbiy tekshiruvlar: tekshirgichlarning o'zi "tishlaydi" ─────────── */

test('salbiy: 1, 2, 4 → variantlarda 7 va 8 bo\'lgan savolni mustaqil tekshirgich ushlaydi', () => {
  const bad = {
    stimulus: { kind: 'text', uz: '1, 2, 4, ?', ru: '1, 2, 4, ?' },
    options: [6, 7, 8, 9].map(v => ({ kind: 'text', uz: String(v), ru: String(v) })),
    correct: 2,
  };
  assert.deepEqual(ambiguity(bad), ['distraktor 7 ham qoidaga mos']);
  /* Uch had juda kam: "+1, +2, +1, …" sikli ham bo'sh mos keladi → 5.
     Tekshirgich uni ham topadi — shuning uchun generator 5–7 had ko'rsatadi. */
  const cyc = { ...bad, options: [5, 6, 8, 9].map(v => ({ kind: 'text', uz: String(v), ru: String(v) })) };
  assert.deepEqual(ambiguity(cyc), ['distraktor 5 ham qoidaga mos']);
  const good = { ...bad, options: [6, 9, 8, 10].map(v => ({ kind: 'text', uz: String(v), ru: String(v) })) };
  assert.deepEqual(ambiguity(good), []);
  const unjustified = { ...bad, options: [6, 9, 10, 11].map(v => ({ kind: 'text', uz: String(v), ru: String(v) })) };
  assert.equal(ambiguity(unjustified).length, 1, 'asossiz javob ham ushlanadi');
});

test('salbiy: ikki ma\'noli panjarani mustaqil tekshirgich ushlaydi', () => {
  /* Qatorda ko'paytma (2×3=6, 3×4=12 → 4×5=20), ustunda esa arifmetik
     qadam (6, 12 → 18). Ikkala qoida ham ko'rsatilgan sonlarga to'liq mos. */
  const M = [[2, 3, 6], [3, 4, 12], [4, 5, null]];
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">' +
    [].concat(...M).map(v => '<text>' + (v === null ? '?' : v) + '</text>').join('') + '</svg>';
  const preds = new Set(rulesGrid(M));
  assert.ok(preds.has(20) && preds.has(18));
  const opt = vs => vs.map(v => ({ kind: 'text', uz: String(v), ru: String(v) }));
  const bad = { stimulus: { kind: 'svg', svg }, options: opt([16, 18, 20, 23]), correct: 2 };
  assert.deepEqual(ambiguity(bad), ['distraktor 18 ham qoidaga mos']);
  /* Generatorning o'z fitter'i ham ikkalasini topadi va Okkam bo'yicha
     bunday panjarani chiqarmaydi (ustun arifmetikasi ko'paytmadan oddiy). */
  const alts = plain(G.fitGrid([[2, 3, 6], [3, 4, 12], [4, 5, 0]]));
  assert.ok(alts.some(a => a.fam === 'row:prod' && a.next === 20));
  assert.ok(alts.some(a => a.fam === 'col:arith' && a.next === 18 && a.cx <= 5 && a.checks >= 1));
});

test('salbiy: tekislik tekshirgichi "doim A" va "doim o\'rtada" ni ushlaydi', () => {
  const k = 4;
  assert.ok(uniformBad(new Array(2000).fill(0), k).length > 0, 'doim birinchi o\'rin');
  assert.ok(uniformBad(Array.from({ length: 2000 }, (_, i) => 1 + (i % 2)), k).length > 0, 'doim o\'rtadagi ikkitadan biri');
  assert.deepEqual(uniformBad(Array.from({ length: 2000 }, (_, i) => i % k), k), [], 'tekis — o\'tadi');
  // generatorning haqiqiy savolini "doim o'rtada" qilib buzamiz: saralangan o'rin tekshiruvi yiqiladi
  const items = getCorpus()[1].slice(0, 400).map(x => {
    const it = plain(x.item), a = optionValues(it)[it.correct];
    const vals = [a - 2, a - 1, a, a + 1];
    return { ...it, options: vals.map(v => ({ kind: 'text', uz: String(v), ru: String(v) })), correct: 2 };
  });
  assert.ok(uniformBad(items.map(sortedRank), k).length > 0);
});

test('salbiy: validateItem buzilgan series savolini ushlaydi', () => {
  const it = plain(G.generate(seedOf(7), 5));
  assert.deepEqual(plain(IQ.validateItem(it)), []);
  const dup = plain(it); dup.options[1] = dup.options[0];
  assert.ok(IQ.validateItem(dup).length > 0, 'takror variant');
  const idx = plain(it); idx.correct = idx.options.length;
  assert.ok(IQ.validateItem(idx).length > 0, 'indeks chegaradan tashqarida');
  const bb = plain(it); bb.b = IQ.levelToB(5) + 0.9;
  assert.ok(IQ.validateItem(bb).length > 0, 'b darajadan juda uzoq');
});
