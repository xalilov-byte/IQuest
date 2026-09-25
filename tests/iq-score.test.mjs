/* ─────────────────────────────────────────────────────────────────────────
   src/iq/score.js — EAP bahosi, IQ shkalasi, oraliq, keyingi daraja

   NIMA UCHUN BU TEST MUHIM: baholovchidagi xato hech qayerda ko'rinmaydi —
   ilova baribir "Taxminiy IQ: 112 (104–120)" deb chiqaradi. Raqam to'g'ri
   ekanini faqat SIMULYATSIYA ko'rsatadi: qobiliyati ma'lum (θ) odamlarni
   modeldan "yechdiramiz" va baho θ ni qaytarishini, 90% oraliq esa
   haqiqatan ~90% hollarda θ ni ushlashini tekshiramiz.

   Simulyatsiya to'liq deterministik (IQ.rng) — test bugun o'tib, ertaga
   yiqilmaydi.

   Ishga tushirish:  node --test tests/iq-score.test.mjs
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const FILES = ['src/iq/rng.js', 'src/iq/index.js', 'src/iq/score.js'];
const SRC = FILES.map(f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8'));

function realm() {
  const ctx = {};
  ctx.window = ctx;
  vm.createContext(ctx);
  FILES.forEach((f, i) => vm.runInContext(SRC[i], ctx, { filename: f }));
  return ctx.IQ;
}

const IQ = realm();
const S = IQ.score;

/* Box–Muller: N(0,1) IQ.rng dan. */
function normal(r) {
  const u = 1 - r.next(), v = r.next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* Bitta odamning adaptiv testi — sessiyadagi kabi: daraja nextLevel dan,
   generator b ni darajadan ±0.75 gacha siljitadi, variantlar 4..6 ta.
   Javob score.prob (c = 1/k) modelidan. */
function examinee(theta, n, r) {
  const resp = [], trace = [];
  for (let i = 0; i < n; i++) {
    const est = S.estimate(resp);
    trace.push(est);
    const L = S.nextLevel(Math.round(est.theta * 1e4) / 1e4, r);
    const b = IQ.levelToB(L) + (r.next() * 1.5 - 0.75);
    const k = 4 + r.int(3);
    resp.push({ b, k, correct: r.next() < S.prob(theta, b, k) });
  }
  const est = S.estimate(resp);
  trace.push(est);
  return { est, trace, resp };
}


/* ── estimate: asosiy xossalar ─────────────────────────────────────── */

test('javobsiz — prior: theta 0, se ≈ 1', () => {
  const e = S.estimate([]);
  assert.ok(Math.abs(e.theta) < 1e-9, e.theta);
  assert.ok(Math.abs(e.se - 1) < 0.01, 'se ' + e.se);
  assert.deepEqual({ ...S.estimate() }, { ...e }, 'undefined ham bo\'sh ro\'yxat');
});


test('monotonlik: bitta xatoni to\'g\'riga aylantirish bahoni oshiradi', () => {
  const r = IQ.rng(1);
  for (let trial = 0; trial < 200; trial++) {
    const n = 5 + r.int(30);
    const resp = [];
    for (let i = 0; i < n; i++) resp.push({ b: r.next() * 5 - 2.5, k: 4 + r.int(3), correct: r.chance(0.5) });
    const wrong = resp.map((x, i) => (x.correct ? -1 : i)).filter(i => i >= 0);
    if (!wrong.length) continue;
    const j = wrong[r.int(wrong.length)];
    const better = resp.map((x, i) => (i === j ? { ...x, correct: true } : x));
    assert.ok(S.estimate(better).theta > S.estimate(resp).theta, 'trial ' + trial);
  }
});


/* Toza Raschda (k yo'q) qiyinroq savolga to'g'ri javob doim ko'proq ball
   beradi. c = 1/k bilan bu FAQAT θ atrofida to'g'ri: θ dan ancha qiyin
   savolga to'g'ri javob asosan tasodif (taxmin) deb qabul qilinadi va
   bahoni kamroq ko'taradi — 3PL modelining ataylab tanlangan xossasi
   (tasodifiy belgilash bilan ball "yig'ib" bo'lmaydi). Lekin to'g'ri
   javob hech qachon bahoni TUSHIRMAYDI. */
test('monotonlik: qiyinroq savolni yechish ko\'proq ball beradi (Rasch), hech qachon kamaytirmaydi (c = 1/k)', () => {
  const base = [{ b: 0, correct: true }, { b: 0.5, correct: false }];
  let prev = -Infinity;
  for (let b = -3; b <= 3; b += 0.5) {
    const t = S.estimate(base.concat([{ b, correct: true }])).theta;
    assert.ok(t > prev, 'b ' + b);
    prev = t;
  }
  // …va osonroq savolda xato qilish ko'proq jazolaydi (k bilan ham).
  for (const k of [undefined, 4, 6]) {
    const bk = base.map(x => ({ ...x, k }));
    prev = -Infinity;
    for (let b = -3; b <= 3; b += 0.5) {
      const t = S.estimate(bk.concat([{ b, k, correct: false }])).theta;
      assert.ok(t > prev, 'k ' + k + ', b ' + b);
      prev = t;
    }
    const t0 = S.estimate(bk).theta;
    for (let b = -3; b <= 3; b += 0.5) {
      assert.ok(S.estimate(bk.concat([{ b, k, correct: true }])).theta > t0, 'to\'g\'ri javob tushirmaydi: k ' + k + ', b ' + b);
      assert.ok(S.estimate(bk.concat([{ b, k, correct: false }])).theta < t0, 'xato javob oshirmaydi: k ' + k + ', b ' + b);
    }
  }
});


test('ko\'p to\'g\'ri — yuqori, ko\'p xato — past (ulush bo\'yicha tartib)', () => {
  let prev = -Infinity;
  for (let c = 0; c <= 20; c++) {
    const resp = [];
    for (let i = 0; i < 20; i++) resp.push({ b: 0, k: 4, correct: i < c });
    const t = S.estimate(resp).theta;
    assert.ok(t > prev, 'to\'g\'ri ' + c);
    prev = t;
  }
});


test('se savol soni bilan kamayadi', () => {
  let prev = Infinity;
  for (const n of [0, 5, 10, 20, 40, 80]) {
    const resp = [];
    for (let i = 0; i < n; i++) resp.push({ b: (i % 5 - 2) * 0.3, k: 4, correct: i % 2 === 0 });
    const se = S.estimate(resp).se;
    assert.ok(se < prev, 'n ' + n + ': se ' + se + ' ≥ ' + prev);
    prev = se;
  }
});


test('chekka holatlar chekli: hammasi to\'g\'ri / hammasi xato / 500 savol', () => {
  const all = (n, b, ok) => Array.from({ length: n }, () => ({ b, k: 4, correct: ok }));
  for (const resp of [all(60, 3, true), all(60, -3, false), all(500, 3, true), all(500, -3, false),
                      all(500, 0, true), all(1, 0, true)]) {
    const e = S.estimate(resp);
    assert.ok(isFinite(e.theta) && isFinite(e.se), JSON.stringify(e));
    assert.ok(e.theta >= -4 && e.theta <= 4, 'theta ' + e.theta);
    assert.ok(e.se > 0, 'se ' + e.se);
  }
  assert.equal(S.toIQ(S.estimate(all(60, 3, true)).theta), 145);
  assert.equal(S.toIQ(S.estimate(all(60, -3, false)).theta), 55);
});


test('buzuq yozuvlar hisobga olinmaydi, yiqilmaydi', () => {
  const good = [{ b: 0, k: 4, correct: true }];
  const junk = good.concat([null, {}, { b: NaN, correct: true }, { b: 'x', correct: false },
                            { b: Infinity, correct: true }]);
  assert.deepEqual({ ...S.estimate(junk) }, { ...S.estimate(good) });
});


test('taxmin chegarasi c = 1/k: to\'g\'ri javob kamroq, xato ko\'proq ma\'lumot', () => {
  assert.equal(S.guess(4), 0.25);
  assert.equal(S.guess(5), 0.2);
  assert.equal(S.guess(undefined), 0, 'k yo\'q — toza Rasch');
  assert.equal(S.guess(1), 0);
  assert.ok(Math.abs(S.prob(-10, 0, 4) - 0.25) < 1e-4, 'qobiliyatsiz odam ham 1/k topadi');
  assert.ok(Math.abs(S.prob(0, 0) - 0.5) < 1e-12, 'Rasch: θ = b da 50%');
  assert.ok(Math.abs(S.prob(0, 0, 4) - 0.625) < 1e-12);

  // Qiyin savolga to'g'ri javob: 4 variantda tasodif bo'lishi mumkin →
  // baho toza Raschdagidan kamroq ko'tariladi.
  const hard = [{ b: 2, correct: true }];
  assert.ok(S.estimate(hard.map(x => ({ ...x, k: 4 }))).theta < S.estimate(hard).theta);

  // Tasodifan belgilagan odam (har savolda 1/k): baho past bo'lishi kerak.
  const r = IQ.rng(77);
  let sum = 0;
  for (let e = 0; e < 200; e++) {
    const resp = [];
    for (let i = 0; i < 30; i++) {
      const k = 4 + r.int(3), b = r.next() * 3 - 1.5;
      resp.push({ b, k, correct: r.next() < 1 / k });
    }
    sum += S.estimate(resp).theta;
  }
  assert.ok(sum / 200 < -1, 'tasodifiy javob beruvchi o\'rtacha theta ' + (sum / 200));
});


/* ── toIQ, interval ────────────────────────────────────────────────── */

test('toIQ: 100 + 15θ, butun son, 55..145', () => {
  assert.equal(S.toIQ(0), 100);
  assert.equal(S.toIQ(1), 115);
  assert.equal(S.toIQ(-1), 85);
  assert.equal(S.toIQ(0.5), 108);          // 107.5 → 108
  assert.equal(S.toIQ(2.99), 145);
  assert.equal(S.toIQ(10), 145);
  assert.equal(S.toIQ(-10), 55);
  assert.equal(S.toIQ(Infinity), 145);
  assert.equal(S.toIQ(-Infinity), 55);
  assert.equal(S.toIQ(NaN), 100);
  for (let t = -5; t <= 5; t += 0.137) assert.ok(Number.isInteger(S.toIQ(t)));
});


test('interval: standart z = 1.645 (90%), lo ≤ iq ≤ hi', () => {
  assert.deepEqual({ ...S.interval(0, 0.4) }, { lo: S.toIQ(-0.658), hi: S.toIQ(0.658) });
  assert.deepEqual({ ...S.interval(0, 0.4) }, { ...S.interval(0, 0.4, 1.645) });
  assert.deepEqual({ ...S.interval(0, 1, 1) }, { lo: 85, hi: 115 });
  assert.deepEqual({ ...S.interval(3, 0.5) }, { lo: 133, hi: 145 }, 'chegarada qisiladi');
  assert.deepEqual({ ...S.interval(0.3, NaN) }, { lo: 105, hi: 105 }, 'se buzuq — nol kenglik');
  const r = IQ.rng(5);
  for (let i = 0; i < 500; i++) {
    const t = r.next() * 8 - 4, se = r.next();
    const iv = S.interval(t, se);
    assert.ok(iv.lo <= S.toIQ(t) && S.toIQ(t) <= iv.hi);
  }
});


/* ── nextLevel ─────────────────────────────────────────────────────── */

test('nextLevel: har doim 1..10 butun son', () => {
  const r = IQ.rng(3);
  for (const t of [-100, -4, -2.5, -1, 0, 0.3, 1, 2.2, 4, 100, Infinity, -Infinity, NaN]) {
    for (let i = 0; i < 50; i++) {
      const L = S.nextLevel(t, r);
      assert.ok(Number.isInteger(L) && L >= 1 && L <= 10, t + ' → ' + L);
    }
  }
  assert.equal(S.nextLevel(-100, r), 1);
  assert.equal(S.nextLevel(100, r), 10);
});


test('nextLevel: levelToB ≈ θ − 0.3, jitter o\'rtachani siljitmaydi', () => {
  const r = IQ.rng(11);
  for (const t of [-1.5, -0.7, 0, 0.45, 1.2, 1.8]) {
    const target = (t - S.TARGET_OFFSET) / 0.5 + 5.5;         // uzluksiz daraja
    let sum = 0, M = 4000;
    const seen = new Set();
    for (let i = 0; i < M; i++) { const L = S.nextLevel(t, r); sum += L; seen.add(L); }
    assert.ok(Math.abs(sum / M - target) < 0.05, 'θ ' + t + ': o\'rtacha ' + sum / M + ' ≠ ' + target);
    assert.ok(seen.size <= 2, 'jitter kichik — faqat qo\'shni ikki daraja: ' + [...seen]);
    for (const L of seen) assert.ok(Math.abs(IQ.levelToB(L) - (t - S.TARGET_OFFSET)) <= 0.5);
  }
});


test('nextLevel: rng siz deterministik, θ bo\'yicha kamaymaydi', () => {
  let prev = 0;
  for (let t = -4; t <= 4; t += 0.05) {
    const L = S.nextLevel(t);
    assert.equal(L, S.nextLevel(t));
    assert.ok(L >= prev);
    prev = L;
  }
  assert.equal(S.nextLevel(0.3), 6);        // b* = 0 → daraja 5.5 → 6
});


/* ── Simulyatsiya: ma'lum θ qayta tiklanadimi ──────────────────────── */

test('simulyatsiya: 2000 odam, θ ~ N(0,1), 30 savol — siljish kichik, 90% oraliq ≈ 90%', () => {
  const r = IQ.rng(20260925);
  const N = 2000, n = 30;
  let err = 0, sq = 0, seSum = 0, cover = 0, coverIQ = 0;
  for (let e = 0; e < N; e++) {
    const theta = normal(r);
    const { est } = examinee(theta, n, r);
    const d = est.theta - theta;
    err += d; sq += d * d; seSum += est.se;
    if (Math.abs(d) <= 1.645 * est.se) cover++;
    const iv = S.interval(est.theta, est.se);
    const trueIQ = 100 + 15 * theta;
    if (trueIQ >= iv.lo - 0.5 && trueIQ <= iv.hi + 0.5) coverIQ++;
  }
  const bias = err / N, rmse = Math.sqrt(sq / N), meanSe = seSum / N;
  const cov = cover / N;
  console.log(`  [sim] N=${N} n=${n}: bias ${bias.toFixed(3)}, RMSE ${rmse.toFixed(3)}, ` +
              `o'rtacha se ${meanSe.toFixed(3)}, 90% qamrov ${(cov * 100).toFixed(1)}%, ` +
              `IQ-oraliq qamrovi ${(coverIQ / N * 100).toFixed(1)}%`);
  assert.ok(Math.abs(bias) < 0.05, 'o\'rtacha siljish ' + bias);
  assert.ok(cov > 0.87 && cov < 0.93, '90% oraliq qamrovi ' + cov);
  assert.ok(Math.abs(meanSe / rmse - 1) < 0.1, 'se haqiqiy xatoga mos emas: se ' + meanSe + ', RMSE ' + rmse);
  assert.ok(rmse < 0.5, 'RMSE ' + rmse);
});


/* EAP prior tomon "qisadi" (shrinkage): chekkadagi odam bahosi 0 ga
   biroz yaqinroq chiqadi — bu xato emas, N(0,1) priorning oqibati
   (siljish ≈ −θ·se²). O'rtada deyarli yo'q, ±2 da ~0.4 logit. */
test('simulyatsiya: qat\'iy θ — baho θ ni kuzatadi, tartib saqlanadi', () => {
  const r = IQ.rng(99);
  const M = 300;
  const means = [];
  for (const theta of [-2, -1, 0, 1, 2]) {
    let s = 0;
    for (let e = 0; e < M; e++) s += examinee(theta, 30, r).est.theta;
    const m = s / M;
    means.push(m);
    const tol = Math.abs(theta) >= 2 ? 0.5 : 0.25;
    console.log(`  [sim] θ=${theta}: o'rtacha baho ${m.toFixed(3)}`);
    assert.ok(Math.abs(m - theta) < tol, 'θ ' + theta + ': o\'rtacha ' + m);
    assert.ok(Math.abs(m) <= Math.abs(theta) + 0.05, 'prior tomon qisiladi, undan uzoqlashmaydi');
  }
  for (let i = 1; i < means.length; i++) assert.ok(means[i] > means[i - 1] + 0.5);
});


test('simulyatsiya: adaptiv testda se savol sayin kamayadi', () => {
  const r = IQ.rng(4242);
  const M = 300, at = [0, 5, 10, 20, 30];
  const sum = at.map(() => 0);
  for (let e = 0; e < M; e++) {
    const { trace } = examinee(normal(r), 30, r);
    at.forEach((n, i) => { sum[i] += trace[n].se; });
  }
  const mean = sum.map(s => s / M);
  console.log('  [sim] o\'rtacha se n=' + at.join('/') + ': ' + mean.map(x => x.toFixed(3)).join(' / '));
  for (let i = 1; i < mean.length; i++) assert.ok(mean[i] < mean[i - 1], JSON.stringify(mean));
  assert.ok(mean[4] < 0.5, '30 savoldan keyin se ' + mean[4]);
});
