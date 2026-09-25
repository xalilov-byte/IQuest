/* ─────────────────────────────────────────────────────────────────────────
   src/iq/score.js — baholash (3PL IRT, EAP) va uning HALOLLIGI

   Bu fayldagi eng muhim testlar — simulyatsiya. "IQ" raqami va uning
   oralig'i va'da beradi; va'da rostligini faqat haqiqiy θ si ma'lum
   odamlar ustida tekshirish mumkin. Shuning uchun 1200 ta "virtual odam"
   yaratiladi: θ ~ N(0,1), har biri savollarga AYNAN 3PL modeli bo'yicha
   javob beradi. Savollar generatordan emas — b va k to'g'ridan-to'g'ri
   (generatorlar boshqa agentda, bu yerda faqat baholash tekshiriladi).

   Tekshiriladi:
     (a) 30 savolda baho haqiqiy θ bilan korrelyatsiya ≥ 0.85;
     (b) 90% oraliq haqiqiy θ ni 85..95% hollarda qamraydi — oraliq
         yolg'on "aniq" (tor) ham, keraksiz keng ham emas;
     (c) adaptiv tanlov tasodifiy tanlovdan yomon emas;
     (d) chekkalarda (θ = ±3) baho qulab tushmaydi.

   Hamma tasodif urug'li (IQ.rng) — test har safar bir xil natija beradi.

   Ishga tushirish:  node --test tests/iq-score.test.mjs
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const load = f => fs.readFileSync(new URL('../src/iq/' + f, import.meta.url), 'utf8');

function env() {
  const ctx = { window: {}, console };
  vm.createContext(ctx);
  for (const f of ['rng.js', 'index.js', 'score.js']) vm.runInContext(load(f), ctx);
  return ctx.window.IQ;
}

const IQ = env();
const S = IQ.score;

/* ── Yordamchilar ─────────────────────────────────────────────────── */

function normal(g) {
  let u = 0;
  while (u === 0) u = g.next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * g.next());
}

/* Haqiqiy posterior — mustaqil, sodda va juda zich hisob:
   −12..12 da 6001 nuqta, to'g'ridan-to'g'ri formula (log shkalada). */
function reference(resp) {
  const N = 6001, ts = [], ls = [];
  for (let q = 0; q < N; q++) {
    const t = -12 + 24 * q / (N - 1);
    let l = -t * t / 2;
    for (const r of resp) {
      const c = typeof r.c === 'number' ? r.c : r.k ? 1 / r.k : 0.25;
      const p = c + (1 - c) / (1 + Math.exp(-(t - r.b)));
      l += Math.log(r.correct ? p : 1 - p);
    }
    ts.push(t); ls.push(l);
  }
  const m = Math.max(...ls);
  let sw = 0, st = 0;
  const w = ls.map(l => Math.exp(l - m));
  w.forEach((x, q) => { sw += x; st += x * ts[q]; });
  const theta = st / sw;
  let sv = 0;
  w.forEach((x, q) => { sv += x * (ts[q] - theta) ** 2; });
  return { theta, se: Math.sqrt(sv / sw) };
}

/* Bitta virtual odamning testi. select(θ̂, g) → daraja. Savol b si
   daraja atrofida ±0.75 (generatorlar shuncha siljitishi mumkin —
   CONTRACT.md §2), variantlar 4..6 (ko'pi 4). */
const K_POOL = [4, 4, 4, 5, 6];
function simulate(theta, n, select, g) {
  const resp = [];
  let est = S.estimate(resp);
  for (let i = 0; i < n; i++) {
    const level = select(est.theta, g);
    const b = IQ.levelToB(level) + (g.next() * 1.5 - 0.75);
    const k = K_POOL[g.int(K_POOL.length)];
    resp.push({ b, k, correct: g.next() < S.prob(theta, b, 1 / k) });
    est = S.estimate(resp);
  }
  return est;
}

const ADAPTIVE = (t, g) => S.nextLevel(t, g);
const RANDOM = (t, g) => 1 + g.int(10);

function summary(thetas, ests, z = 1.645) {
  const n = thetas.length, mean = a => a.reduce((s, x) => s + x, 0) / a.length;
  const est = ests.map(e => e.theta), mx = mean(thetas), my = mean(est);
  let sxy = 0, sxx = 0, syy = 0, cover = 0, sq = 0;
  for (let i = 0; i < n; i++) {
    sxy += (thetas[i] - mx) * (est[i] - my);
    sxx += (thetas[i] - mx) ** 2;
    syy += (est[i] - my) ** 2;
    if (Math.abs(est[i] - thetas[i]) <= z * ests[i].se) cover++;
    sq += (est[i] - thetas[i]) ** 2;
  }
  return {
    r: sxy / Math.sqrt(sxx * syy), cover: cover / n, rmse: Math.sqrt(sq / n),
    bias: my - mx, meanEst: my, meanSe: mean(ests.map(e => e.se)),
  };
}

const f3 = x => x.toFixed(3);

/* Asosiy populyatsiya — bir marta, hamma simulyatsiya testlari uchun.
   Dangasa: faqat birinchi kerak bo'lganda (--test-name-pattern bilan
   boshqa test tanlansa, ~5 s simulyatsiya bekorga yurmasin). */
const N_PEOPLE = 1200, N_ITEMS = 30;
let POP_CACHE = null;
const pop = () => POP_CACHE || (POP_CACHE = (() => {
  const g = IQ.rng(20260925);
  const thetas = [], adaptive = [], random = [];
  for (let i = 0; i < N_PEOPLE; i++) thetas.push(normal(g));
  /* Bir xil odamlar, ikki xil tanlov — farq faqat tanlovdan. */
  const ga = IQ.rng(1), gr = IQ.rng(2);
  thetas.forEach(t => { adaptive.push(simulate(t, N_ITEMS, ADAPTIVE, ga)); });
  thetas.forEach(t => { random.push(simulate(t, N_ITEMS, RANDOM, gr)); });
  return { thetas, adaptive, random };
})());


/* ── Model ────────────────────────────────────────────────────────── */

test('prob: 3PL formulasi — P = c + (1−c)/(1+e^−(θ−b))', () => {
  assert.equal(S.prob(0, 0, 0.25), 0.625, 'θ = b da taxmin va yarim');
  assert.equal(S.prob(0, 0, 0), 0.5);
  assert.ok(Math.abs(S.prob(-30, 0, 0.25) - 0.25) < 1e-9, 'juda past θ da ham ehtimol c ga teng, 0 emas');
  assert.ok(Math.abs(S.prob(30, 0, 0.25) - 1) < 1e-9);
  assert.equal(S.prob(0, 0), 0.625, 'c berilmasa — 0.25 (4 variant)');
});


test('estimate: javobsiz — prior N(0,1)', () => {
  const e = S.estimate([]);
  assert.ok(Math.abs(e.theta) < 1e-9);
  assert.ok(Math.abs(e.se - 1) < 1e-3, 'se ' + e.se);
  assert.ok(S.GRID_N >= 61, 'kvadratura kamida 61 nuqta');
});


/* 1e-5 logit = 0.00015 IQ ball. Eng katta farq (2.4e-6) — 60 ta eng
   oson savolga hammasi xato: posterior θ ≈ −5.4, to'r chetidan (−8)
   6 s.o. uzoqda. ±4 to'r bu yerda 0.4–1.4 logit adashardi. */
test('estimate: kvadratura aniq — mustaqil zich hisob bilan farq < 1e-5 (chekka holatlar ham)', () => {
  const g = IQ.rng(77);
  const cases = [];
  for (let i = 0; i < 150; i++) {
    const n = g.int(41), t = g.next() * 8 - 4, resp = [];
    for (let j = 0; j < n; j++) {
      const b = g.next() * 6 - 3, k = 4 + g.int(3);
      resp.push({ b, k, correct: g.next() < S.prob(t, b, 1 / k) });
    }
    cases.push(resp);
  }
  /* Posterior to'r chetiga tiraladigan holatlar: hammasi to'g'ri / xato. */
  const same = (n, b, ok, extra) => Array.from({ length: n }, () => Object.assign({ b, correct: ok }, extra));
  cases.push(same(30, 2.5, true, { k: 4 }), same(30, -2.5, false, { k: 4 }),
             same(60, 3, true, { k: 6 }), same(60, -3, false, { k: 4 }),
             same(30, 2, true, { c: 0 }), same(30, -2, false, { c: 0 }));
  let worst = 0;
  for (const resp of cases) {
    const a = S.estimate(resp), r = reference(resp);
    worst = Math.max(worst, Math.abs(a.theta - r.theta), Math.abs(a.se - r.se));
  }
  assert.ok(worst < 1e-5, 'eng katta farq ' + worst);
});


test('estimate: taxmin (c = 1/k) hisobga olinadi', () => {
  /* Qiyin savolga to'g'ri javob — 4 variantli savolda bu tasodif bo'lishi
     mumkin, variantsiz (c = 0) savolda emas. 3PL buni kamroq "qobiliyat"
     deb o'qishi kerak. */
  const pat = [{ b: 2, correct: true }, { b: 2, correct: true }, { b: -1, correct: false }, { b: 0, correct: false }];
  const with4 = S.estimate(pat.map(r => Object.assign({ k: 4 }, r)));
  const rasch = S.estimate(pat.map(r => Object.assign({ c: 0 }, r)));
  const with6 = S.estimate(pat.map(r => Object.assign({ k: 6 }, r)));
  const none = S.estimate(pat);
  assert.ok(with4.theta < rasch.theta - 0.1, `3PL ${with4.theta} < Rasch ${rasch.theta}`);
  assert.ok(with6.theta > with4.theta, 'ko\'p variant — taxmin kam — to\'g\'ri javob ko\'proq aytadi');
  assert.equal(none.theta, with4.theta, 'k yo\'q — 4 variant deb olinadi');
  assert.equal(S.estimate([{ b: 0, correct: true, c: 0.5, k: 4 }]).theta,
               S.estimate([{ b: 0, correct: true, c: 0.5 }]).theta, 'aniq c k dan ustun');
});


test('estimate: to\'g\'ri javob θ ni oshiradi, ko\'p javob se ni kamaytiradi', () => {
  const g = IQ.rng(5);
  const base = [];
  for (let i = 0; i < 20; i++) base.push({ b: g.next() * 4 - 2, k: 4, correct: g.next() < 0.6 });
  const e0 = S.estimate(base);
  for (let i = 0; i < base.length; i++) {
    if (base[i].correct) continue;
    const flipped = base.map((r, j) => (j === i ? Object.assign({}, r, { correct: true }) : r));
    assert.ok(S.estimate(flipped).theta > e0.theta, i + '-javob to\'g\'ri bo\'lsa θ oshishi kerak');
  }
  let prev = 1.01;
  for (let n = 0; n <= 20; n += 5) {
    const se = S.estimate(base.slice(0, n)).se;
    assert.ok(se < prev, `n=${n}: se ${se} kamayishi kerak`);
    prev = se;
  }
});


test('estimate: buzuq kirish NaN bermaydi, ilovani yiqitmaydi', () => {
  const junk = [
    null, undefined, {}, { b: 'x', correct: true }, { b: NaN, correct: true },
    { b: Infinity, correct: false }, { b: 1e6, correct: true }, { b: -1e6, correct: false },
    { b: -1e6, correct: true, c: 0 }, { b: 1e6, correct: true, c: 0 },
    { b: 0, correct: true, c: 7 }, { b: 0, correct: true, k: 1 }, { b: 0, correct: 'ha' },
  ];
  for (const input of [junk, null, undefined, 'x', 42, [{ b: 1, correct: true }].concat(junk)]) {
    const e = S.estimate(input);
    assert.ok(Number.isFinite(e.theta) && Number.isFinite(e.se) && e.se > 0, JSON.stringify(e));
  }
  /* Buzuq b tashlanadi — to'g'ri javoblarning bahosi o'zgarmaydi. */
  assert.equal(S.estimate([{ b: 1, correct: true }, { b: NaN, correct: false }]).theta,
               S.estimate([{ b: 1, correct: true }]).theta);
});


/* ── IQ shkalasi ──────────────────────────────────────────────────── */

test('toIQ: 100 + 15θ, butun, 55..145', () => {
  assert.equal(S.toIQ(0), 100);
  assert.equal(S.toIQ(1), 115);
  assert.equal(S.toIQ(-0.5), 93, 'round(92.5) = 93');
  assert.equal(S.toIQ(3), 145);
  assert.equal(S.toIQ(9), 145);
  assert.equal(S.toIQ(-9), 55);
  for (let t = -5; t <= 5; t += 0.137) assert.ok(Number.isInteger(S.toIQ(t)));
});


test('interval: θ ± z·se IQ shkalasida, standart z = 1.645 (90%)', () => {
  assert.deepEqual({ ...S.interval(0, 0.4) }, { lo: 90, hi: 110 }, '1.645·0.4·15 = 9.87');
  assert.deepEqual({ ...S.interval(0, 0.4, 1.96) }, { lo: 88, hi: 112 });
  assert.deepEqual({ ...S.interval(0.5, 0, 1.645) }, { lo: 108, hi: 108 });
  assert.deepEqual({ ...S.interval(2.8, 0.4) }, { lo: 132, hi: 145 }, 'yuqorida kesiladi');
  for (let t = -3; t <= 3; t += 0.25) {
    const iv = S.interval(t, 0.45), iq = S.toIQ(t);
    assert.ok(iv.lo <= iq && iq <= iv.hi);
  }
});


/* ── Keyingi savol ────────────────────────────────────────────────── */

test('nextLevel: 3PL da ma\'lumot cho\'qqisi b dan yuqorida — tanlov shunga to\'g\'rilangan', () => {
  /* Birnbaum: θ_max = b + ln((1+√(1+8c))/2). Formulani sonli tekshiramiz:
     θ = 0 uchun eng ko'p ma'lumot beradigan b ni to'rda topamiz. */
  for (const c of [0, 0.25, 1 / 6]) {
    let best = 0, bi = 0;
    for (let b = -3; b <= 3; b += 0.001) {
      const I = S.info(0, b, c);
      if (I > bi) { bi = I; best = b; }
    }
    assert.ok(Math.abs(best - S.bestB(0, c)) < 0.002, `c=${c}: argmax ${best}, formula ${S.bestB(0, c)}`);
  }
  assert.ok(Math.abs(S.bestB(0, 0.25) + 0.3116) < 1e-3, 'c = 0.25 da b* = θ − 0.31');
  /* Oddiy "b = θ" tanlov bilan farq qiladigan nuqta: θ = 0.2 da
     b = θ → daraja round(5.9) = 6; to'g'rilangan → round(5.28) = 5. */
  assert.equal(S.nextLevel(0.2), 5);
  /* Tasodifsiz: har θ da daraja = b* ga eng yaqin daraja. */
  for (let t = -2; t <= 2; t += 0.1) {
    const lv = S.nextLevel(t);
    const want = Math.min(10, Math.max(1, Math.round(S.bestB(t, 0.25) / 0.5 + 5.5)));
    assert.equal(lv, want, 'θ=' + t);
  }
});


test('nextLevel: kichik tasodif — hamma bir xil daraja olmaydi, lekin uzoqlashmaydi; 1..10', () => {
  const g = IQ.rng(9);
  for (const t of [-1, 0, 0.3, 1.2]) {
    const base = S.nextLevel(t), seen = new Set();
    for (let i = 0; i < 500; i++) {
      const lv = S.nextLevel(t, g);
      seen.add(lv);
      assert.ok(Math.abs(lv - base) <= 1, `θ=${t}: ${lv} vs ${base}`);
    }
    assert.ok(seen.size >= 2, `θ=${t}: faqat ${[...seen]} — tasodif yo'q`);
  }
  for (let i = 0; i < 200; i++) {
    assert.equal(S.nextLevel(9, g), 10);
    assert.equal(S.nextLevel(-9, g), 1);
    const lv = S.nextLevel(g.next() * 20 - 10, g);
    assert.ok(Number.isInteger(lv) && lv >= 1 && lv <= 10);
  }
  assert.equal(S.nextLevel(NaN), S.nextLevel(0), 'buzuq θ — o\'rtadan');
});


/* ── HALOLLIK: simulyatsiya ───────────────────────────────────────── */

test(`(a) ${N_PEOPLE} virtual odam, 30 savol: baho haqiqiy θ bilan korrelyatsiya ≥ 0.85`, () => {
  const s = summary(pop().thetas, pop().adaptive);
  console.log(`  adaptiv 30: r = ${f3(s.r)}, RMSE = ${f3(s.rmse)}, o'rtacha se = ${f3(s.meanSe)}, siljish = ${f3(s.bias)}`);
  assert.ok(s.r >= 0.85, 'r = ' + s.r);
  assert.ok(Math.abs(s.bias) < 0.05, 'populyatsiya bo\'yicha siljish yo\'q: ' + s.bias);
});


test('(b) 90% oraliq haqiqiy θ ni ~90% hollarda qamraydi (0.85..0.95)', () => {
  const s = summary(pop().thetas, pop().adaptive);
  /* IQ shkalasida ham: interval() + toIQ (yaxlitlash, 55..145 kesish). */
  let inIQ = 0;
  pop().thetas.forEach((t, i) => {
    const e = pop().adaptive[i], iv = S.interval(e.theta, e.se);
    const trueIQ = Math.min(145, Math.max(55, 100 + 15 * t));
    if (trueIQ >= iv.lo - 0.5 && trueIQ <= iv.hi + 0.5) inIQ++;
  });
  const covIQ = inIQ / pop().thetas.length;
  /* se yolg'on bo'lsa (masalan posterior o'rniga 1/√n), qamrov 0.9 dan
     uzoqlashadi — shu sababli ikki tomonlama chegara. */
  const s68 = summary(pop().thetas, pop().adaptive, 1);
  console.log(`  qamrov: θ da ${f3(s.cover)}, IQ da ${f3(covIQ)}; ±1·se → ${f3(s68.cover)} (kutilgan 0.68)`);
  assert.ok(s.cover >= 0.85 && s.cover <= 0.95, 'qamrov ' + s.cover);
  assert.ok(covIQ >= 0.85 && covIQ <= 0.95, 'IQ qamrovi ' + covIQ);
  assert.ok(s68.cover >= 0.62 && s68.cover <= 0.74, '±1·se qamrovi ' + s68.cover);
});


test('(c) adaptiv tanlov tasodifiy tanlovdan past bo\'lmagan xatolik beradi', () => {
  const a = summary(pop().thetas, pop().adaptive), r = summary(pop().thetas, pop().random);
  console.log(`  RMSE: adaptiv ${f3(a.rmse)} vs tasodifiy ${f3(r.rmse)}; r: ${f3(a.r)} vs ${f3(r.r)}; se: ${f3(a.meanSe)} vs ${f3(r.meanSe)}`);
  assert.ok(a.rmse <= r.rmse, `adaptiv ${a.rmse} > tasodifiy ${r.rmse}`);
  assert.ok(a.meanSe <= r.meanSe, 'adaptiv testning o\'z aniqligi ham yomon emas');
});


test('(d) chekkalarda (θ = ±3) baho qulab tushmaydi', () => {
  const g = IQ.rng(33), N = 250, rows = {};
  for (const t of [-3, -2, 2, 3]) {
    const ests = [];
    for (let i = 0; i < N; i++) ests.push(simulate(t, N_ITEMS, ADAPTIVE, g));
    const s = summary(Array(N).fill(t), ests);
    s.maxSe = Math.max(...ests.map(e => e.se));
    s.finite = ests.every(e => Number.isFinite(e.theta) && Number.isFinite(e.se));
    s.iq = S.toIQ(s.meanEst);
    rows[t] = s;
    console.log(`  θ=${t}: o'rtacha baho ${f3(s.meanEst)} (IQ ${s.iq}), RMSE ${f3(s.rmse)}, ` +
                `o'rtacha se ${f3(s.meanSe)}, qamrov ${f3(s.cover)}`);
  }
  for (const t of [-3, -2, 2, 3]) {
    assert.ok(rows[t].finite, 'NaN/∞ yo\'q');
    assert.ok(rows[t].maxSe < 0.7, `θ=${t}: se ${rows[t].maxSe} — baho "hech narsa bilmayman" ga aylanmasin`);
    assert.ok(Math.sign(rows[t].meanEst) === Math.sign(t), 'to\'g\'ri tomonda');
  }
  /* "Qulab tushmaydi": chekkadagi odam o'rtaga tortilib yo'qolmaydi —
     o'rtacha IQ ≥ 130 / ≤ 70 va ±3 hali ±2 dan ajraladi. EAP prior
     tufayli biroz o'rtaga tortadi (shrinkage) — bu kutilgan, lekin
     cheklangan: RMSE < 1 logit. */
  assert.ok(rows[3].meanEst >= 2, 'θ=3: ' + rows[3].meanEst);
  assert.ok(rows[-3].meanEst <= -2, 'θ=−3: ' + rows[-3].meanEst);
  assert.ok(rows[3].meanEst > rows[2].meanEst + 0.4, '+3 va +2 ajraladi');
  assert.ok(rows[-3].meanEst < rows[-2].meanEst - 0.4, '−3 va −2 ajraladi');
  for (const t of [-3, 3]) assert.ok(rows[t].rmse < 1, `θ=${t}: RMSE ${rows[t].rmse}`);
});


/* ── Tezlik ───────────────────────────────────────────────────────── */

test('tezlik: estimate har javobda — 30 javobda ham < 5 ms', () => {
  const g = IQ.rng(3), resp = [];
  for (let i = 0; i < 30; i++) resp.push({ b: g.next() * 4 - 2, k: 4, correct: g.next() < 0.6 });
  for (let i = 0; i < 50; i++) S.estimate(resp);              // qizdirish (JIT)
  const t = [];
  const t0 = performance.now();
  for (let rep = 0; rep < 20; rep++) {
    for (let n = 1; n <= 30; n++) {                           // sessiyadagidek: 1, 2, …, 30 javob
      const a = performance.now();
      S.estimate(resp.slice(0, n));
      t.push(performance.now() - a);
    }
  }
  const session = (performance.now() - t0) / 20;
  const per30 = (() => {
    const a = performance.now();
    for (let i = 0; i < 200; i++) S.estimate(resp);
    return (performance.now() - a) / 200;
  })();
  const p99 = t.sort((x, y) => x - y)[Math.floor(t.length * 0.99)];
  console.log(`  estimate(30 javob): o'rtacha ${per30.toFixed(3)} ms; 1..30 chaqiriqlar p99 ${p99.toFixed(3)} ms, ` +
              `eng sekini ${t[t.length - 1].toFixed(3)} ms; butun sessiya (1..30) ${session.toFixed(2)} ms`);
  assert.ok(per30 < 5, per30 + ' ms');
  /* p99 — bitta tasodifiy GC pauzasi testni yiqitmasin, lekin "odatda
     tez" emas, "deyarli har doim tez" tekshirilsin. */
  assert.ok(p99 < 5, 'p99 ' + p99 + ' ms');
});
