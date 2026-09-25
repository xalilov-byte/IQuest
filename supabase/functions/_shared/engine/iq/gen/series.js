/* ─────────────────────────────────────────────────────────────────────────
   IQ.series — son qatorlari (va yuqori darajada sonli 3×3 panjara)

   Qator ko'rsatiladi ("2, 4, 8, 16, ?"), keyingi son so'raladi.
   Yuqori darajada — 3×3 sonli panjara, so'roq belgisi o'ng pastda.

   ENG NOZIK JOY — BIR MA'NOLILIK. Har qanday chekli qatorga cheksiz ko'p
   qoida mos keladi: "1, 2, 4, ?" — ×2 bo'lsa 8, farqlar +1, +2 bo'lsa 7.
   Agar variantlarda 7 ham, 8 ham bo'lsa, savol XATO: to'g'ri fikrlagan
   odam "noto'g'ri" deb baholanadi va natija jimgina buziladi. Amaliy
   kafolat (to'liq matematik kafolat mumkin emas):

     1. Qoidalar kutubxonasi (fitSeries / fitGrid) — odam o'ylab topishi
        mumkin bo'lgan qoida oilalari. Har savol uchun BARCHA oilalar
        ko'rsatilgan hadlarga moslab ko'riladi.
     2. Boshqa oila ham mos kelsa va BOSHQA javob bersa — o'sha son
        variantlarga HECH QACHON qo'yilmaydi.
     3. "Okkam" qoidasi: mo'ljallangan qoidadan murakkab bo'lmagan boshqa
        qoida (kamida bitta haqiqiy tekshiruv bilan) mos kelib, boshqa
        javob bersa — savol butunlay tashlanadi va qayta yaratiladi. Aks
        holda odam oddiyroq javobni topadi, uni variantlarda ko'rmaydi va
        adashadi (formal xato bo'lmasa ham savol yomon).
     4. Mo'ljallangan qoida o'z fitter'i orqali aynan javobni bermasa —
        generatorda xato bor, savol tashlanadi.

   Tartib va o'rinlar:
     · To'g'ri javobning variantlar ichidagi o'rni — rng.shuffle (tekis).
     · SARALANGAN o'rni ham tekis: avval "to'g'ri javob saralanganda
       nechanchi bo'lsin" (R) tasodifan tanlanadi, keyin R ta distraktor
       pastdan, qolgani yuqoridan olinadi. Busiz ±1, ±d distraktorlar
       javobni doim o'rtaga qo'yadi va ayyor odam "o'rtachasini" tanlaydi.

   Test uchun ichki ma'lumot: IQ.generator('series').inspect(seed, level)
   — savol + qoida oilasi + har distraktor qaysi xato ekani + rad etilgan
   urinishlar soni. Savolning o'zi shartnomadagi shakldan chiqmaydi.

   To'liq shartnoma: src/iq/CONTRACT.md
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const IQ = root.IQ = root.IQ || {};

  const LIM = 10000;        // qatordagi har son: |x| < LIM
  const GLIM = 1000;        // panjara: katakka sig'ishi uchun |x| < GLIM
  const MIN_POS = 8;        // musbat qatorda javob >= 8: pastda 5 ta musbat distraktorga joy bo'lsin
  const MAX_ATTEMPTS = 80;

  /* ── Matn ─────────────────────────────────────────────────────────── */

  const MINUS = '−';   // haqiqiy minus belgisi: "−3" chiziqchadan ko'ra aniq o'qiladi
  const fmt = n => (n < 0 ? MINUS + (-n) : String(n));
  const par = n => (n < 0 ? '(' + fmt(n) + ')' : fmt(n));           // amaldan keyingi operand
  const sgn = n => (n < 0 ? MINUS + (-n) : '+' + n);                 // qadam: "+3", "−2"
  const plus = (a, d) => fmt(a) + (d < 0 ? ' ' + MINUS + ' ' + (-d) : ' + ' + d);
  /* Rus tili: "в 2 раза", "в 5 раз". */
  const ruRaz = n => {
    const a = Math.abs(n), m10 = a % 10, m100 = a % 100;
    return m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'раза' : 'раз';
  };
  const list3 = a => a.slice(0, 3).map(fmt).join(', ') + ', …';

  /* ── Yordamchi arifmetika ─────────────────────────────────────────── */

  const isInt = Number.isInteger;
  const near = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
  /* Kasr hisobida 36.00000000001 chiqib qolmasin — yaqin bo'lsa butunga. */
  const tidy = x => (isFinite(x) && Math.abs(x - Math.round(x)) < 1e-9 ? Math.round(x) : x);
  const diffs = a => a.slice(1).map((v, i) => v - a[i]);
  const allEq = a => a.every(v => v === a[0]);
  const seqOf = (n, f) => Array.from({ length: n }, (_, i) => f(i));
  const m = (v, why) => ({ v, why });

  function isPrime(n) {
    if (!isInt(n) || n < 2) return false;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
    return true;
  }
  const nextPrime = n => { let p = n + 1; while (!isPrime(p)) p++; return p; };

  /* ══ QOIDALAR KUTUBXONASI (fitter) ══════════════════════════════════
     fitSeries(t) → [{ fam, cx, next, checks }]
       fam    — oila nomi
       cx     — murakkablik (1 — eng oddiy); Okkam qoidasida solishtiriladi
       next   — shu oila bo'yicha keyingi son (butun bo'lmasligi mumkin)
       checks — nechta ORTIQCHA tekshiruvdan o'tdi (hadlar − parametrlar).
                0 bo'lsa oila "bo'sh" mos keldi (parametr ko'p, dalil yo'q):
                uning javobi variantlardan baribir chiqariladi, lekin
                savolni tashlashga asos emas. */

  /* alt2/alt3 ichki qatorlari uchun: arifmetik yoki geometrik. */
  function subFits(s) {
    const out = [];
    if (s.length < 2) return out;
    const L = s[s.length - 1], ck = s.length - 2, d = diffs(s);
    if (allEq(d)) out.push({ k: 'a', next: L + d[0], checks: ck });
    if (s[0] !== 0 && s[1] !== 0 && s.every((v, i) => i === 0 || v * s[0] === s[i - 1] * s[1])) {
      out.push({ k: 'g', next: tidy(L * s[1] / s[0]), checks: ck });
    }
    return out;
  }

  /* Bir sinfdagi qadamlar ([oldingi, keyingi] juftlari) qaysi amalga mos. */
  function stepOps(pairs) {
    const out = [];
    if (!pairs.length) return out;
    const d0 = pairs[0][1] - pairs[0][0];
    if (pairs.every(p => p[1] - p[0] === d0)) out.push(x => x + d0);
    const a0 = pairs[0][0], b0 = pairs[0][1];
    if (a0 !== 0 && pairs.every(p => p[0] !== 0 && p[1] * a0 === p[0] * b0)) out.push(x => tidy(x * b0 / a0));
    return out;
  }

  /* Amallar N qadamli sikl bilan takrorlanadi (+2, ×2, +2, ×2 …). */
  function fitCyc(t, N, fam, cx, add) {
    const n = t.length;
    if (n - 1 < N) return;
    const cls = seqOf(N, () => []);
    for (let j = 0; j < n - 1; j++) cls[j % N].push([t[j], t[j + 1]]);
    const ops = cls.map(stepOps);
    if (ops.some(o => !o.length)) return;
    /* Dalil — ENG KAM tekshirilgan sinf bo'yicha: bitta qadamli sinfda
       "+4" ham, "×2" ham to'g'ri — bunday bashorat hech narsaga tayanmaydi. */
    const checks = Math.min(...cls.map(p => p.length - 1));
    for (const f of ops[(n - 1) % N]) add(fam, cx, f(t[n - 1]), checks);
  }

  function fitSeries(t) {
    const out = [], n = t.length;
    const add = (fam, cx, next, checks) => {
      next = tidy(next);
      if (isFinite(next)) out.push({ fam, cx, next, checks: Math.max(0, checks) });
    };
    if (n < 3) return out;
    const last = t[n - 1], prev = t[n - 2];
    const D = diffs(t), D2 = diffs(D), D3 = diffs(D2);
    let ok, i;

    // arifmetik: +d
    if (allEq(D)) add('arith', 1, last + D[0], n - 2);
    // geometrik: ×r (r kasr yoki manfiy bo'lishi mumkin) — ko'paytirib solishtiramiz, bo'lishsiz
    if (t[0] !== 0 && t[1] !== 0 && t.every((v, j) => j === 0 || v * t[0] === t[j - 1] * t[1])) {
      add('geom', 2, last * t[1] / t[0], n - 2);
    }
    // ikkinchi tartibli farq (farqlar arifmetik o'sadi) va kvadratlar
    if (D2.length && allEq(D2)) {
      const nx = last + D[D.length - 1] + D2[0];
      add('diff2', 3, nx, n - 3);
      // (i+k)² + c: ikkinchi farq 2 va birinchi farq toq (k butun)
      if (D2[0] === 2 && Math.abs(D[0]) % 2 === 1) add('pow2', 3, nx, n - 2);
    }
    // uchinchi tartibli farq va kublar
    if (D3.length && allEq(D3)) {
      const nx = last + D[D.length - 1] + D2[D2.length - 1] + D3[0];
      add('diff3', 5, nx, n - 4);
      if (D3[0] === 6 && D2[0] % 6 === 0) add('pow3', 4, nx, n - 2);
    }
    // Fibonachchi turi
    for (ok = true, i = 2; i < n; i++) if (t[i] !== t[i - 1] + t[i - 2]) ok = false;
    if (ok) add('fib', 4, last + prev, n - 2);
    const c = t[2] - t[1] - t[0];
    for (ok = true, i = 3; i < n; i++) if (t[i] !== t[i - 1] + t[i - 2] + c) ok = false;
    if (ok) add('fibc', 5, last + prev + c, n - 3);
    if (n >= 4) {
      for (ok = true, i = 3; i < n; i++) if (t[i] !== t[i - 1] + t[i - 2] + t[i - 3]) ok = false;
      if (ok) add('trib', 5, last + prev + t[n - 3], n - 3);
    }
    for (ok = true, i = 2; i < n; i++) if (t[i] !== t[i - 1] * t[i - 2]) ok = false;
    if (ok) add('prodfib', 6, last * prev, n - 2);
    // chiziqli rekurrent: x → p·x + q (×2+1 kabi kompozitsiya; +d va ×r ham shu ichida)
    if (t[1] === t[0]) {
      if (allEq(t)) add('linrec', 5, last, n - 3);
    } else {
      const pn = t[2] - t[1], pd = t[1] - t[0], qn = t[1] * pd - pn * t[0];
      for (ok = true, i = 1; i < n - 1; i++) if (t[i + 1] * pd !== pn * t[i] + qn) ok = false;
      if (ok) add('linrec', 5, (pn * last + qn) / pd, n - 3);
    }
    // ikki oldingi hadning chiziqli kombinatsiyasi: a(n) = p·a(n−1) + q·a(n−2)
    /* p, q ni ikkita ketma-ket tenglamadan topamiz. Boshidagi uchlik
       geometrik bo'lsa (det = 0) tizim aniqlanmaydi — keyingi juftga
       o'tamiz; hammasi 0 bo'lsa qator geometrik va javobi geom bilan bir xil. */
    for (let j = 1; j + 2 < n; j++) {
      const det = t[j] * t[j] - t[j - 1] * t[j + 1];
      if (det === 0) continue;
      const pN = t[j + 1] * t[j] - t[j - 1] * t[j + 2], qN = t[j] * t[j + 2] - t[j + 1] * t[j + 1];
      for (ok = true, i = 2; i < n; i++) if (t[i] * det !== pN * t[i - 1] + qN * t[i - 2]) ok = false;
      if (ok) add('linrec2', 6, (pN * last + qN * prev) / det, n - 4);
      break;
    }
    // ko'paytuvchilar arifmetik o'sadi: ×2, ×3, ×4 …
    if (t.slice(0, -1).every(v => v !== 0)) {
      const R = t.slice(1).map((v, j) => v / t[j]), e = R[1] - R[0];
      if (R.every((x, j) => j === 0 || near(x - R[j - 1], e))) add('ratio', 5, last * (R[R.length - 1] + e), n - 3);
    }
    // ikki qator almashinuvi (juft/toq o'rinlar), har biri arifmetik yoki geometrik
    {
      const E = t.filter((_, j) => j % 2 === 0), O = t.filter((_, j) => j % 2 === 1);
      const cur = n % 2 === 0 ? E : O, oth = n % 2 === 0 ? O : E;
      const fc = subFits(cur), fo = subFits(oth);
      if (fo.length) {
        const ckO = Math.max(...fo.map(f => f.checks));
        for (const f of fc) add('alt2', f.k === 'a' && fo.some(g => g.k === 'a') ? 3 : 5, f.next, Math.min(f.checks, ckO));
      }
    }
    // uch qator almashinuvi (faqat arifmetik)
    if (n >= 6) {
      const S = [0, 1, 2].map(r => subFits(t.filter((_, j) => j % 3 === r)).filter(f => f.k === 'a'));
      if (S.every(f => f.length)) add('alt3', 6, S[n % 3][0].next, Math.min(...S.map(f => f[0].checks)));
    }
    // almashinuvchi amallar: 2 va 3 qadamli sikl, har qadam +c yoki ×c
    fitCyc(t, 2, 'cyc2', 4, add);
    fitCyc(t, 3, 'cyc3', 5, add);
    // oldingisining kvadrati ± c
    {
      const c2 = t[1] - t[0] * t[0];
      for (ok = true, i = 1; i < n - 1; i++) if (t[i + 1] !== t[i] * t[i] + c2) ok = false;
      if (ok) add('sqprev', 6, last * last + c2, n - 2);
    }
    // ketma-ket tub sonlar
    if (t.every(isPrime)) {
      for (ok = true, i = 1; i < n; i++) if (nextPrime(t[i - 1]) !== t[i]) ok = false;
      if (ok) add('primes', 4, nextPrime(last), n - 1);
    }
    return out;
  }

  /* ── Panjara qoidalari: uchlik (x, y, z) ichidagi munosabat ──────────
     Qator (yoki ustun) 0 va 1 to'liq, 2-sida z noma'lum. Parametrli
     munosabatda k birinchi uchlikdan topiladi, ikkinchisida tekshiriladi. */
  const RELS = [
    { id: 'sum', cx: 4, f: (x, y) => x + y },
    { id: 'arith', cx: 4, f: (x, y) => 2 * y - x },
    { id: 'diff', cx: 5, f: (x, y) => x - y },
    { id: 'rdiff', cx: 5, f: (x, y) => y - x },
    { id: 'prod', cx: 5, f: (x, y) => x * y },
    { id: 'quot', cx: 5, f: (x, y) => (y ? x / y : NaN) },
    { id: 'rquot', cx: 5, f: (x, y) => (x ? y / x : NaN) },
    { id: 'geom', cx: 5, f: (x, y) => (x ? y * y / x : NaN) },
    { id: 'sumconst', cx: 5, k: (x, y, z) => x + y + z, f: (x, y, k) => k - x - y },
    { id: 'xk', cx: 5, k: (x, y, z) => z - x, f: (x, y, k) => x + k },
    { id: 'yk', cx: 5, k: (x, y, z) => z - y, f: (x, y, k) => y + k },
    { id: 'xm', cx: 5, k: (x, y, z) => (x ? z / x : NaN), f: (x, y, k) => x * k },
    { id: 'ym', cx: 5, k: (x, y, z) => (y ? z / y : NaN), f: (x, y, k) => y * k },
    { id: 'sumk', cx: 6, k: (x, y, z) => z - x - y, f: (x, y, k) => x + y + k },
    { id: 'diffk', cx: 6, k: (x, y, z) => z - x + y, f: (x, y, k) => x - y + k },
    { id: 'rdiffk', cx: 6, k: (x, y, z) => z - y + x, f: (x, y, k) => y - x + k },
    { id: 'arithk', cx: 6, k: (x, y, z) => z - 2 * y + x, f: (x, y, k) => 2 * y - x + k },
    { id: 'prodk', cx: 6, k: (x, y, z) => z - x * y, f: (x, y, k) => x * y + k },
    { id: 'sumx', cx: 6, k: (x, y, z) => (x + y ? z / (x + y) : NaN), f: (x, y, k) => (x + y) * k },
  ];

  function fitTriples(T, tag, out) {
    for (const R of RELS) {
      let k;
      if (R.k) {
        k = R.k(T[0][0], T[0][1], T[0][2]);
        if (!isFinite(k) || !near(R.f(T[1][0], T[1][1], k), T[1][2])) continue;
      } else if (!near(R.f(T[0][0], T[0][1]), T[0][2]) || !near(R.f(T[1][0], T[1][1]), T[1][2])) continue;
      const nx = tidy(R.f(T[2][0], T[2][1], k));
      if (isFinite(nx)) out.push({ fam: tag + ':' + R.id, cx: R.cx, next: nx, checks: R.k ? 1 : 2 });
    }
    // har qator bir xil sonlar to'plamidan (lotin kvadrati): yetishmagani
    const s0 = T[0].slice().sort((a, b) => a - b), s1 = T[1].slice().sort((a, b) => a - b);
    if (s0.join() === s1.join()) {
      const rest = s0.slice();
      for (const v of [T[2][0], T[2][1]]) {
        const j = rest.indexOf(v);
        if (j < 0) { rest.length = 0; break; }
        rest.splice(j, 1);
      }
      if (rest.length === 1) out.push({ fam: tag + ':perm', cx: 4, next: rest[0], checks: 2 });
    }
  }

  /* M[2][2] — noma'lum (qiymatiga qaralmaydi). */
  function fitGrid(M) {
    const out = [];
    fitTriples([M[0], M[1], [M[2][0], M[2][1]]], 'row', out);
    const col = j => [M[0][j], M[1][j], M[2][j]];
    fitTriples([col(0), col(1), [M[0][2], M[1][2]]], 'col', out);
    // panjarani qator deb o'qish: qatorlab va ustunlab (1, 2, 3, 4, … 9 kabi)
    const rm = [M[0][0], M[0][1], M[0][2], M[1][0], M[1][1], M[1][2], M[2][0], M[2][1]];
    const cm = [M[0][0], M[1][0], M[2][0], M[0][1], M[1][1], M[2][1], M[0][2], M[1][2]];
    for (const f of fitSeries(rm)) out.push({ fam: 'flat:' + f.fam, cx: f.cx + 2, next: f.next, checks: f.checks });
    for (const f of fitSeries(cm)) out.push({ fam: 'flatc:' + f.fam, cx: f.cx + 2, next: f.next, checks: f.checks });
    return out;
  }

  /* ══ QOIDA OILALARI (generatorlar) ═══════════════════════════════════
     gen(r, level) → null (parametr yaramadi) yoki
       { terms | grid, answer, explain:{uz,ru}, mistakes:[{v, why}], step }
     mistakes — ISHONARLI xatolar; why — qaysi xato:
       off     hisobda ±1/±2 (±10) adashish
       step    qadam kattaligi noto'g'ri (+d±1, ×(r+1))
       step2   qoida ikki marta qo'llangan / bir had tashlab ketilgan
       wrongop boshqa amal (× o'rniga +, yig'indi o'rniga ko'paytma …)
       branch  almashinuvchi qatorning boshqa tarmog'i / sikldagi boshqa amal
       dir     teskari yo'nalish
       sign    ishora xatosi
       noinc   farq (ko'paytuvchi) o'zgarishi unutilgan, doimiy deb olingan
       part    murakkab qoidaning faqat bir qismi qo'llangan
       col     panjarada qator o'rniga ustun (yoki aksincha) olingan
       copy    panjarada qo'shni son ko'chirilgan */
  const WHY = ['off', 'step', 'step2', 'wrongop', 'branch', 'dir', 'sign', 'noinc', 'part', 'col', 'copy'];

  const V = Object.create(null);
  function def(id, fam, cx, gen) { V[id] = { id, fam, cx, gen }; }

  /* Qatorni (len + 1 had) ko'rsatiladigan qism va javobga bo'ladi. */
  const cut = full => ({ t: full.slice(0, -1), ans: full[full.length - 1] });

  function arithText(d, last, ans) {
    return d > 0
      ? { uz: `Har bir son oldingisidan ${d} ga katta: ${plus(last, d)} = ${fmt(ans)}.`,
          ru: `Каждое число на ${d} больше предыдущего: ${plus(last, d)} = ${fmt(ans)}.` }
      : { uz: `Har bir son oldingisidan ${-d} ga kichik: ${plus(last, d)} = ${fmt(ans)}.`,
          ru: `Каждое число на ${-d} меньше предыдущего: ${plus(last, d)} = ${fmt(ans)}.` };
  }

  function arithMistakes(t, ans, d) {
    const last = t[t.length - 1];
    return [m(ans + d, 'step2'),
      d > 0 ? m(last * 2, 'wrongop') : last % 2 === 0 ? m(last / 2, 'wrongop') : m(last - d, 'dir'),
      m(ans + (d > 0 ? 1 : -1) * (Math.abs(d) + 1), 'step'), m(-ans, 'sign')];
  }

  // 1-daraja: kichik musbat qadam
  def('arith_up', 'arith', 1, (r, L) => {
    const len = L <= 2 ? 5 : 6, d = r.range(2, L === 1 ? 5 : 9), a = r.range(1, L === 1 ? 12 : 30);
    const { t, ans } = cut(seqOf(len + 1, i => a + i * d));
    return { terms: t, answer: ans, step: d, explain: arithText(d, t[len - 1], ans), mistakes: arithMistakes(t, ans, d) };
  });

  // kamayuvchi arifmetik, hammasi musbat
  def('arith_down', 'arith', 1.5, (r, L) => {
    const len = L <= 2 ? 5 : 6, d = -r.range(2, L === 1 ? 5 : 9);
    const ans = r.range(MIN_POS, MIN_POS + 30), a = ans - len * d;
    const { t } = cut(seqOf(len + 1, i => a + i * d));
    return { terms: t, answer: ans, step: -d, explain: arithText(d, t[len - 1], ans), mistakes: arithMistakes(t, ans, d) };
  });

  // noldan o'tuvchi arifmetik (manfiy sonlar)
  def('arith_neg', 'arith', 2.5, (r) => {
    const len = 6, d = r.pick([-1, 1]) * r.range(3, 9), ans = r.range(-40, 40), a = ans - len * d;
    const full = seqOf(len + 1, i => a + i * d);
    if (!(Math.min(...full) < 0 && Math.max(...full) > 0)) return null;
    const { t } = cut(full);
    return { terms: t, answer: ans, step: Math.abs(d), explain: arithText(d, t[len - 1], ans), mistakes: arithMistakes(t, ans, d) };
  });

  function geomText(r, last, ans) {
    if (r >= 2) {
      return { uz: `Har bir son oldingisidan ${r} barobar katta: ${fmt(last)} × ${r} = ${fmt(ans)}.`,
        ru: `Каждое число в ${r} ${ruRaz(r)} больше предыдущего: ${fmt(last)} × ${r} = ${fmt(ans)}.` };
    }
    const q = -r;
    return { uz: `Har bir son oldingisini ${fmt(r)} ga ko'paytirishdan hosil bo'ladi: ishora almashadi, ishorasiz qiymati ${q} barobar ortadi. ${fmt(last)} × ${par(r)} = ${fmt(ans)}.`,
      ru: `Каждое число — предыдущее, умноженное на ${fmt(r)}: знак чередуется, а величина без учёта знака растёт в ${q} ${ruRaz(q)}. ${fmt(last)} × ${par(r)} = ${fmt(ans)}.` };
  }

  function geomMistakes(t, ans, q) {
    const last = t[t.length - 1], prev = t[t.length - 2];
    return [m(last + (last - prev), 'wrongop'), m(last + q, 'wrongop'), m(last * (q + 1), 'step'),
      m(ans * q, 'step2'), m(ans + q, 'step'), m(-ans, 'sign')];
  }

  // ×2, ×3 kichik boshlanish
  def('geom', 'geom', 2, (r, L) => {
    const q = L === 1 ? 2 : r.pick([2, 2, 3]), a = r.range(1, q === 2 ? 9 : 5), len = 5;
    const { t, ans } = cut(seqOf(len + 1, i => a * q ** i));
    if (ans < MIN_POS) return null;
    return { terms: t, answer: ans, step: q, explain: geomText(q, t[len - 1], ans), mistakes: geomMistakes(t, ans, q) };
  });

  // ×4, ×5 yoki uzunroq ×3
  def('geom_big', 'geom', 2.5, (r) => {
    const q = r.pick([3, 4, 5]), len = q === 3 ? 6 : 5, a = r.range(1, q === 3 ? 10 : 3);
    const { t, ans } = cut(seqOf(len + 1, i => a * q ** i));
    return { terms: t, answer: ans, step: q, explain: geomText(q, t[len - 1], ans), mistakes: geomMistakes(t, ans, q) };
  });

  // ÷2, ÷3 — kamayuvchi geometrik
  def('geom_half', 'geom', 2.5, (r) => {
    const q = r.pick([2, 2, 3]), len = 5, ans = r.range(MIN_POS, q === 2 ? 60 : 40);
    const full = seqOf(len + 1, i => ans * q ** (len - i));
    if (full[0] >= LIM) return null;
    const { t } = cut(full), last = t[len - 1];
    return {
      terms: t, answer: ans, step: ans,
      explain: { uz: `Har bir son oldingisidan ${q} barobar kichik: ${last} : ${q} = ${ans}.`,
        ru: `Каждое число в ${q} ${ruRaz(q)} меньше предыдущего: ${last} : ${q} = ${ans}.` },
      mistakes: [m(last - q, 'wrongop'), m(ans % q === 0 ? ans / q : ans - 3, 'step2'),
        m(last % (q + 1) === 0 ? last / (q + 1) : last - 2 * q, 'step'), m(last - ans / 2, 'wrongop')],
    };
  });

  // ×(−2), ×(−3): ishora almashadi
  def('geom_neg', 'geom', 3.5, (r) => {
    const q = r.pick([-2, -2, -3]), len = q === -2 ? r.pick([5, 6]) : 5, a = r.pick([-1, 1]) * r.range(1, 5);
    const { t, ans } = cut(seqOf(len + 1, i => a * q ** i));
    const last = t[len - 1], prev = t[len - 2];
    return {
      terms: t, answer: ans, step: Math.abs(last), explain: geomText(q, last, ans),
      mistakes: [m(-ans, 'sign'), m(last + (last - prev), 'wrongop'),
        m(last * (q - 1), 'step'), m(last * (q + 1), 'step'), m(last - q, 'wrongop')],
    };
  });

  /* Ikki qator almashinuvi. g — qaysi tarmoq geometrik (-1: hech biri). */
  function alt2Build(r, L, opts) {
    const len = r.pick([6, 7]);
    let fE, fO, dE, dO, gE = false, gO = false;
    if (opts.mix) {
      const q = r.pick([2, 2, 3]), g0 = r.range(1, q === 2 ? 5 : 3), b = r.range(opts.neg ? -20 : 1, 30);
      const d = r.pick([-1, 1]) * r.range(2, 9);
      const geomOnEven = r.chance(0.5);
      const G = i => g0 * q ** i, A = i => b + i * d;
      fE = geomOnEven ? G : A; fO = geomOnEven ? A : G; gE = geomOnEven; gO = !geomOnEven;
      dE = geomOnEven ? q : d; dO = geomOnEven ? d : q;
    } else {
      const span = L >= 5 ? 9 : 6;
      dE = r.pick([-1, 1]) * r.range(1, span); dO = r.pick([-1, 1]) * r.range(1, span);
      if (dE === dO) return null;
      const a = r.range(opts.neg ? -15 : 1, 25), b = r.range(opts.neg ? -15 : 1, 30);
      fE = i => a + i * dE; fO = i => b + i * dO;
    }
    const full = seqOf(len + 1, i => (i % 2 === 0 ? fE(i / 2) : fO((i - 1) / 2)));
    const neg = full.some(v => v < 0);
    if (opts.neg ? !neg : full.some(v => v <= 0)) return null;
    const { t, ans } = cut(full);
    const E = t.filter((_, i) => i % 2 === 0), O = t.filter((_, i) => i % 2 === 1);
    const onEven = len % 2 === 0;                // javob 1-, 3-, 5- … o'rinda (toq)
    const same = t[len - 2], last = t[len - 1];
    const dc = onEven ? dE : dO, gc = onEven ? gE : gO, dOth = onEven ? dO : dE, gOth = onEven ? gO : gE;
    const stepTxt = (d, g) => (g ? { uz: `har safar ×${d}`, ru: `каждый раз ×${d}` } : { uz: `qadam ${sgn(d)}`, ru: `шаг ${sgn(d)}` });
    const sE = stepTxt(dE, gE), sO = stepTxt(dO, gO);
    const expr = gc ? `${fmt(same)} × ${dc}` : plus(same, dc);
    const pos = len + 1;
    const othNext = gOth ? last * dOth : last + dOth;
    const mistakes = [m(othNext, 'branch'), m(gc ? last * dc : last + dc, 'branch'),
      m(gc ? ans * dc : ans + dc, 'step2'), m(gc ? same + dc : same * 2, 'wrongop'), m(gc ? (same % dc === 0 ? same / dc : same - dc) : same - dc, 'dir')];
    return {
      terms: t, answer: ans, step: Math.abs(gc ? same : dc), mistakes,
      explain: {
        uz: `Ikki qator navbatlashadi: toq o'rinlarda ${list3(E)} (${sE.uz}), juft o'rinlarda ${list3(O)} (${sO.uz}). ` +
          `Keyingi son ${pos}-o'rinda turadi va ${onEven ? 'toq' : 'juft'} o'rinlardagi qatorni davom ettiradi: ${expr} = ${fmt(ans)}.`,
        ru: `Чередуются два ряда: на нечётных местах ${list3(E)} (${sE.ru}), на чётных — ${list3(O)} (${sO.ru}). ` +
          `Следующее число стоит на ${pos}-м месте и продолжает ряд на ${onEven ? 'нечётных' : 'чётных'} местах: ${expr} = ${fmt(ans)}.`,
      },
    };
  }
  def('alt2', 'alt2', 3, (r, L) => alt2Build(r, L, {}));
  def('alt2_neg', 'alt2', 4, (r, L) => alt2Build(r, L, { neg: true }));
  def('alt2mix', 'alt2', 5, (r, L) => alt2Build(r, L, { mix: true, neg: L >= 10 && r.chance(0.5) }));

  function diff2Build(r, L, down) {
    const len = 6;
    let a, d0, e;
    if (!down) { a = r.range(1, 20); d0 = r.range(1, 5); e = r.range(1, 3); } else if (r.chance(0.5)) {
      a = r.range(1, 30); d0 = r.range(8, 16); e = -r.range(1, 3);
    } else { a = r.range(-5, 40); d0 = -r.range(3, 9); e = r.range(1, 3); }
    const ds = seqOf(len, i => d0 + i * e);
    if (ds[len - 1] === 0) return null;
    const full = [a];
    for (const d of ds) full.push(full[full.length - 1] + d);
    const { t, ans } = cut(full), last = t[len - 1], dL = ds[len - 2], dN = ds[len - 1];
    const dl = ds.slice(0, len - 1).map(sgn).join(', ');
    return {
      terms: t, answer: ans, step: Math.max(1, Math.abs(dN)),
      explain: {
        uz: `Qo'shni sonlar orasidagi farqlar har safar ${Math.abs(e)} ga ${e > 0 ? 'ortadi' : 'kamayadi'}: ${dl}. Keyingi farq ${sgn(dN)}: ${plus(last, dN)} = ${fmt(ans)}.`,
        ru: `Разности соседних чисел каждый раз ${e > 0 ? 'увеличиваются' : 'уменьшаются'} на ${Math.abs(e)}: ${dl}. Следующая разность ${sgn(dN)}: ${plus(last, dN)} = ${fmt(ans)}.`,
      },
      mistakes: [m(last + dL, 'noinc'), m(ans + e, 'step2'), m(last + dN + 2 * e, 'step2'),
        m(last - dN, 'dir'), m(last * 2, 'wrongop')],
    };
  }
  def('diff2', 'diff2', 3, (r, L) => diff2Build(r, L, false));
  def('diff2_down', 'diff2', 4, (r, L) => diff2Build(r, L, true));

  // kvadratlar: k², (k+1)², …
  def('square', 'pow2', 3, (r, L) => {
    const len = r.pick([5, 6]), k = r.range(1, L >= 5 ? 9 : 6);
    const { t, ans } = cut(seqOf(len + 1, i => (i + k) ** 2)), M = k + len, last = t[len - 1], prev = t[len - 2];
    return {
      terms: t, answer: ans, step: 2 * M,
      explain: { uz: `Bular ketma-ket sonlarning kvadratlari: ${k}², ${k + 1}², ${k + 2}², … Keyingisi: ${M}² = ${ans}.`,
        ru: `Это квадраты последовательных чисел: ${k}², ${k + 1}², ${k + 2}², … Следующее число: ${M}² = ${ans}.` },
      mistakes: [m(last + (last - prev), 'noinc'), m((M + 1) ** 2, 'step2'), m(last * 2, 'wrongop'),
        m(M * (M + 1), 'step')],
    };
  });

  // kvadrat ± c: 2, 5, 10, 17 …
  def('square_c', 'pow2', 3.5, (r) => {
    const len = r.pick([5, 6]), k = r.range(1, 7), c = r.pick([-1, 1]) * r.range(1, 4);
    const { t, ans } = cut(seqOf(len + 1, i => (i + k) ** 2 + c)), M = k + len, last = t[len - 1], prev = t[len - 2];
    const cs = c > 0 ? ` + ${c}` : ` ${MINUS} ${-c}`;
    return {
      terms: t, answer: ans, step: 2 * M,
      explain: { uz: `Har bir son — ketma-ket sonning kvadrati${c > 0 ? `ga ${c} qo'shilgani` : `dan ${-c} ayirilgani`}: ${k}²${cs}, ${k + 1}²${cs}, ${k + 2}²${cs}, … Keyingisi: ${M}²${cs} = ${fmt(ans)}.`,
        ru: `Каждое число — квадрат очередного числа ${c > 0 ? 'плюс' : 'минус'} ${Math.abs(c)}: ${k}²${cs}, ${k + 1}²${cs}, ${k + 2}²${cs}, … Следующее число: ${M}²${cs} = ${fmt(ans)}.` },
      mistakes: [m(M * M, 'part'), m(M * M - c, 'sign'), m((M + 1) ** 2 + c, 'step2'), m(last + (last - prev), 'noinc')],
    };
  });

  // n·(n+1), n·(n+2)
  def('ntimes', 'diff2', 3.5, (r) => {
    const len = r.pick([5, 6]), k = r.range(1, 6), j = r.pick([1, 2]);
    const { t, ans } = cut(seqOf(len + 1, i => (i + k) * (i + k + j))), M = k + len, last = t[len - 1], prev = t[len - 2];
    return {
      terms: t, answer: ans, step: 2 * M,
      explain: { uz: `Har bir son — ikki sonning ko'paytmasi: ${k}×${k + j}, ${k + 1}×${k + 1 + j}, ${k + 2}×${k + 2 + j}, … Keyingisi: ${M}×${M + j} = ${ans}.`,
        ru: `Каждое число — произведение двух чисел: ${k}×${k + j}, ${k + 1}×${k + 1 + j}, ${k + 2}×${k + 2 + j}, … Следующее число: ${M}×${M + j} = ${ans}.` },
      mistakes: [m(last + (last - prev), 'noinc'), m((M + 1) * (M + 1 + j), 'step2'), m(M * M, 'part'), m((M + j) ** 2, 'wrongop')],
    };
  });

  // kublar
  def('cube', 'pow3', 4, (r) => {
    const len = 5, k = r.range(1, 3);
    const { t, ans } = cut(seqOf(len + 1, i => (i + k) ** 3)), M = k + len, last = t[len - 1], prev = t[len - 2];
    const D = diffs(t), D2 = diffs(D);
    return {
      terms: t, answer: ans, step: M * M,
      explain: { uz: `Bular ketma-ket sonlarning kublari: ${k}³, ${k + 1}³, ${k + 2}³, … Keyingisi: ${M}³ = ${ans}.`,
        ru: `Это кубы последовательных чисел: ${k}³, ${k + 1}³, ${k + 2}³, … Следующее число: ${M}³ = ${ans}.` },
      mistakes: [m(last + (last - prev), 'noinc'), m(last + D[D.length - 1] + D2[D2.length - 1], 'noinc'), m(M * M, 'wrongop'),
        m((M + 1) ** 3, 'step2')],
    };
  });

  // Fibonachchi turi: har son oldingi ikkitasining yig'indisi
  def('fib', 'fib', 4, (r) => {
    const len = 6, a = r.range(1, 6), b = r.range(1, 8), full = [a, b];
    while (full.length < len + 1) full.push(full[full.length - 1] + full[full.length - 2]);
    const { t, ans } = cut(full), last = t[len - 1], prev = t[len - 2];
    return {
      terms: t, answer: ans, step: prev,
      explain: { uz: `Har bir son oldingi ikkita sonning yig'indisiga teng: ${prev} + ${last} = ${ans}.`,
        ru: `Каждое число равно сумме двух предыдущих: ${prev} + ${last} = ${ans}.` },
      mistakes: [m(last * 2, 'wrongop'), m(last + (last - prev), 'wrongop'), m(ans + t[len - 3], 'step2'),
        m(last + prev + prev, 'step')],
    };
  });

  // yig'indi ± c
  def('fibc', 'fibc', 5, (r) => {
    const len = 6, a = r.range(1, 6), b = r.range(1, 6), c = r.pick([-1, 1]) * r.range(1, 3), full = [a, b];
    while (full.length < len + 1) full.push(full[full.length - 1] + full[full.length - 2] + c);
    if (full.some(v => v <= 0)) return null;
    const { t, ans } = cut(full), last = t[len - 1], prev = t[len - 2];
    const cs = c > 0 ? ` + ${c}` : ` ${MINUS} ${-c}`;
    return {
      terms: t, answer: ans, step: Math.abs(c) + 1,
      explain: { uz: `Har bir son oldingi ikkita son yig'indisidan ${Math.abs(c)} ga ${c > 0 ? 'katta' : 'kichik'}: ${prev} + ${last}${cs} = ${ans}.`,
        ru: `Каждое число на ${Math.abs(c)} ${c > 0 ? 'больше' : 'меньше'} суммы двух предыдущих: ${prev} + ${last}${cs} = ${ans}.` },
      mistakes: [m(last + prev, 'part'), m(last + prev - c, 'sign'), m(ans + c, 'step2'),
        m(last * 2 + c, 'wrongop')],
    };
  });

  // uchta oldingining yig'indisi
  def('trib', 'trib', 5, (r) => {
    const len = r.pick([6, 7]), full = [r.range(1, 4), r.range(1, 4), r.range(1, 5)];
    while (full.length < len + 1) { const n = full.length; full.push(full[n - 1] + full[n - 2] + full[n - 3]); }
    const { t, ans } = cut(full), last = t[len - 1], prev = t[len - 2], p3 = t[len - 3];
    return {
      terms: t, answer: ans, step: p3,
      explain: { uz: `Har bir son oldingi uchta sonning yig'indisiga teng: ${p3} + ${prev} + ${last} = ${ans}.`,
        ru: `Каждое число равно сумме трёх предыдущих: ${p3} + ${prev} + ${last} = ${ans}.` },
      mistakes: [m(last + prev, 'part'), m(ans + t[len - 4], 'step2'), m(last * 2, 'wrongop')],
    };
  });

  // oldingi ikkitasining ko'paytmasi
  def('prodfib', 'prodfib', 6, (r) => {
    const [a, b, len] = r.pick([[1, 2, 6], [2, 2, 5], [1, 3, 6], [2, 3, 5], [3, 2, 5], [1, 4, 5], [2, 1, 6], [3, 1, 6], [1, 5, 5], [2, 4, 5], [4, 1, 6]]);
    const full = [a, b];
    while (full.length < len + 1) full.push(full[full.length - 1] * full[full.length - 2]);
    const { t, ans } = cut(full), last = t[len - 1], prev = t[len - 2];
    if (ans >= LIM) return null;
    return {
      terms: t, answer: ans, step: last,
      explain: { uz: `Har bir son oldingi ikkita sonning ko'paytmasiga teng: ${prev} × ${last} = ${ans}.`,
        ru: `Каждое число равно произведению двух предыдущих: ${prev} × ${last} = ${ans}.` },
      mistakes: [m(last + prev, 'wrongop'), m(last * 2, 'wrongop'), m(last % prev === 0 ? last * (last / prev) : ans + prev, 'noinc'),
        m(ans + last, 'step'), m(ans - last, 'step')],
    };
  });

  // kompozitsiya: x → x·p + c
  function linrecBuild(r, neg) {
    const len = r.pick([5, 6]);
    const p = neg ? r.pick([-2, -2, -3, 2, 3]) : r.pick([2, 2, 3]);
    const c = r.pick([-1, 1]) * r.range(1, neg ? 6 : 5), a = neg ? r.pick([-1, 1]) * r.range(1, 6) : r.range(1, 6);
    const full = [a];
    while (full.length < len + 1) full.push(full[full.length - 1] * p + c);
    if (full.some(v => Math.abs(v) >= LIM)) return null;
    if (neg ? !full.some(v => v < 0) : full.some(v => v <= 0)) return null;
    if (new Set(full).size < full.length) return null;          // qo'zg'almas nuqta — qator "qotib" qoladi
    const { t, ans } = cut(full), last = t[len - 1], prev = t[len - 2];
    const cs = c > 0 ? `+ ${c}` : `${MINUS} ${-c}`;
    return {
      terms: t, answer: ans, step: Math.abs(c),
      explain: {
        uz: `Har bir son oldingisini ${fmt(p)} ga ko'paytirib, ${c > 0 ? c + ' qo\'shishdan' : -c + ' ayirishdan'} hosil bo'ladi: ${fmt(last)} × ${par(p)} ${cs} = ${fmt(ans)}.`,
        ru: `Каждое число получается из предыдущего так: умножить на ${fmt(p)} и ${c > 0 ? 'прибавить' : 'вычесть'} ${Math.abs(c)}: ${fmt(last)} × ${par(p)} ${cs} = ${fmt(ans)}.`,
      },
      mistakes: [m(last * p, 'part'), m(last * p - c, 'sign'), m(last + c, 'part'), m(ans + c, 'step2'), m(last + (last - prev), 'wrongop'),
        m(-ans, 'sign')],
    };
  }
  def('linrec', 'linrec', 5, r => linrecBuild(r, false));
  def('linrec_neg', 'linrec', 6, r => linrecBuild(r, true));

  // ko'paytuvchi o'sadi: ×1, ×2, ×3 …
  def('ratio', 'ratio', 5, (r, L) => {
    const len = 5, e = L >= 10 ? r.pick([1, 1, 2]) : 1, r0 = r.range(1, 3), a = r.range(1, 4);
    const full = [a];
    for (let i = 0; i < len; i++) full.push(full[i] * (r0 + i * e));
    const { t, ans } = cut(full), last = t[len - 1], prev = t[len - 2], rN = r0 + (len - 1) * e;
    if (ans >= LIM || ans < MIN_POS) return null;
    const rl = [0, 1, 2].map(i => '×' + (r0 + i * e)).join(', ');
    return {
      terms: t, answer: ans, step: last,
      explain: { uz: `Ko'paytuvchi har safar ${e} ga ortadi: ${rl}, … Keyingi ko'paytuvchi ×${rN}: ${last} × ${rN} = ${ans}.`,
        ru: `Множитель каждый раз увеличивается на ${e}: ${rl}, … Следующий множитель ×${rN}: ${last} × ${rN} = ${ans}.` },
      mistakes: [m(last * (rN - e), 'noinc'), m(last * (rN + e), 'step2'), m(last + (last - prev), 'wrongop'), m(ans + last, 'step'),
        m(last + rN, 'wrongop')],
    };
  });

  // a(n) = p·a(n−1) + q·a(n−2)
  def('linrec2', 'linrec2', 6, (r) => {
    const [p, q] = r.pick([[1, 2], [2, 1], [1, 3]]), len = 6, full = [r.range(1, 4), r.range(1, 4)];
    while (full.length < len + 1) { const n = full.length; full.push(p * full[n - 1] + q * full[n - 2]); }
    const { t, ans } = cut(full), last = t[len - 1], prev = t[len - 2];
    if (ans >= LIM) return null;
    const qw = { 2: ['2 barobari', 'удвоенного'], 3: ['3 barobari', 'утроенного'] };
    const ex = p === 1
      ? { uz: `Har bir son oldingi son bilan undan oldingi sonning ${qw[q][0]} yig'indisiga teng: ${last} + ${q} × ${prev} = ${ans}.`,
          ru: `Каждое число равно сумме предыдущего и ${qw[q][1]} числа перед ним: ${last} + ${q} × ${prev} = ${ans}.` }
      : { uz: `Har bir son oldingi sonning 2 barobari bilan undan oldingi son yig'indisiga teng: 2 × ${last} + ${prev} = ${ans}.`,
          ru: `Каждое число равно сумме удвоенного предыдущего и числа перед ним: 2 × ${last} + ${prev} = ${ans}.` };
    return {
      terms: t, answer: ans, step: prev,
      explain: ex,
      mistakes: [m(last + prev, 'part'), m(q * last + p * prev, 'wrongop'), m(p * last, 'part'),
        m(ans + prev, 'step'), m(last * 2, 'wrongop')],
    };
  });

  // farqlar uchtadan aylanadi: +1, +3, −2, +1, +3, −2 …
  def('cyc3', 'cyc3', 5, (r, L) => {
    const len = 7, ds = r.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3).map(d => (r.chance(0.35) ? -d : d));
    const a = r.range(L >= 8 ? -5 : 5, 30), full = [a];
    for (let j = 0; j < len; j++) full.push(full[j] + ds[j % 3]);
    if (L < 8 && full.some(v => v <= 0)) return null;
    const { t, ans } = cut(full), last = t[len - 1], cyc = ds.map(sgn);
    const lst = cyc.concat(cyc).join(', ');
    return {
      terms: t, answer: ans, step: Math.abs(ds[0]),
      explain: { uz: `Farqlar navbat bilan takrorlanadi: ${lst}, … Keyingi farq ${cyc[0]}: ${plus(last, ds[0])} = ${fmt(ans)}.`,
        ru: `Разности повторяются по кругу: ${lst}, … Следующая разность ${cyc[0]}: ${plus(last, ds[0])} = ${fmt(ans)}.` },
      mistakes: [m(last + ds[1], 'branch'), m(last + ds[2], 'branch'), m(ans + ds[1], 'step2'), m(last - ds[0], 'dir')],
    };
  });

  // almashinuvchi amallar: +2, ×2, +2, ×2 …
  def('altop', 'cyc2', 4, (r) => {
    const pat = r.pick(['addmul', 'muladd', 'mulsub', 'addsub']), len = r.pick([6, 7]);
    const q = r.pick([2, 2, 3]), p = r.range(1, 5);
    let ops, a;
    if (pat === 'addmul') { ops = [['+', p], ['×', q]]; a = r.range(1, 6); }
    else if (pat === 'muladd') { ops = [['×', q], ['+', p]]; a = r.range(1, 6); }
    else if (pat === 'mulsub') { ops = [['×', q], [MINUS, p]]; a = r.range(2, 7); }
    else { const s = r.range(1, 6); if (s === p) return null; ops = [['+', p + s], [MINUS, s]]; a = r.range(1, 20); }
    const ap = (x, o) => (o[0] === '+' ? x + o[1] : o[0] === '×' ? x * o[1] : x - o[1]);
    const full = [a];
    for (let j = 0; j < len; j++) full.push(ap(full[j], ops[j % 2]));
    if (full.some(v => v <= 0 || v >= LIM)) return null;
    const { t, ans } = cut(full), last = t[len - 1], oN = ops[(len - 1) % 2], oO = ops[len % 2];
    const os = ops.map(o => o[0] + o[1]);
    return {
      terms: t, answer: ans, step: oN[0] === '×' ? last : oN[1],
      explain: { uz: `Amallar navbatlashadi: ${os[0]}, ${os[1]}, ${os[0]}, ${os[1]}, … Keyingi amal ${oN[0]}${oN[1]}: ${last} ${oN[0]} ${oN[1]} = ${ans}.`,
        ru: `Действия чередуются: ${os[0]}, ${os[1]}, ${os[0]}, ${os[1]}, … Следующее действие ${oN[0]}${oN[1]}: ${last} ${oN[0]} ${oN[1]} = ${ans}.` },
      mistakes: [m(ap(last, oO), 'branch'), m(ap(ans, oO), 'step2'), m(ap(ap(last, oO), oN), 'step2'),
        m(ap(last, oN[0] === '×' ? ['+', oN[1]] : ['×', 2]), 'wrongop')],
    };
  });

  /* ── 3×3 panjara ──────────────────────────────────────────────────── */

  function gridBuild(fill, explain, extra) {
    return (r, L) => {
      const M = fill(r, L);
      if (!M) return null;
      const ans = M[2][2], x = M[2][0], y = M[2][1], up = M[1][2], up2 = M[0][2];
      const flat = [].concat(...M);
      if (flat.some(v => !isInt(v) || Math.abs(v) >= GLIM)) return null;
      if (new Set(flat).size < (fill.allowRepeat ? 3 : 7)) return null;   // bir xil sonlarga to'la panjara — tushunarsiz
      return {
        grid: M, answer: ans, step: Math.max(1, Math.abs(up - up2)),
        explain: explain(M, x, y, ans),
        mistakes: [m(x + y, 'wrongop'), m(x * y, 'wrongop'), m(x - y, 'wrongop'), m(2 * y - x, 'wrongop'),
          m(up + (up - up2), 'col'), m(up + up2, 'col'), m(up, 'copy')]
          .concat(extra ? extra(M, x, y, ans) : []),
      };
    };
  }
  const rows3 = (r, f) => [0, 1, 2].map(() => f());

  def('g_sum', 'row:sum', 4.5, gridBuild((r, L) => rows3(r, () => {
    const x = r.range(2, L >= 8 ? 60 : 30), y = r.range(2, L >= 8 ? 60 : 30); return [x, y, x + y];
  }), (M, x, y, a) => ({ uz: `Har bir qatorda uchinchi son birinchi ikkitasining yig'indisiga teng: ${fmt(x)} + ${par(y)} = ${fmt(a)}.`,
    ru: `В каждой строке третье число равно сумме первых двух: ${fmt(x)} + ${par(y)} = ${fmt(a)}.` })));

  def('g_arith', 'row:arith', 4.5, gridBuild((r) => {
    const ds = r.shuffle([-7, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 9]).slice(0, 3);
    return ds.map(d => { const a = r.range(d < 0 ? 20 : 1, d < 0 ? 60 : 40); return [a, a + d, a + 2 * d]; });
  }, (M, x, y, a) => {
    const d = y - x;
    return { uz: `Har bir qatorda sonlar teng qadam bilan o'zgaradi (har qatorning o'z qadami bor). Uchinchi qatorda qadam ${sgn(d)}: ${plus(y, d)} = ${fmt(a)}.`,
      ru: `В каждой строке числа меняются с постоянным шагом (у каждой строки свой шаг). В третьей строке шаг ${sgn(d)}: ${plus(y, d)} = ${fmt(a)}.` };
  }, (M, x, y) => [m(y + (M[1][1] - M[1][0]), 'branch'), m(y + (M[0][1] - M[0][0]), 'branch')]));

  const permFill = (r) => {
    const vals = r.shuffle([...Array(40).keys()].map(i => i + MIN_POS)).slice(0, 3);
    const rowOrder = r.shuffle([0, 1, 2]), colOrder = r.shuffle([0, 1, 2]);
    return rowOrder.map(i => colOrder.map(j => vals[(i + j) % 3]));
  };
  permFill.allowRepeat = true;
  def('g_perm', 'row:perm', 4, gridBuild(permFill, (M, x, y, a) => {
    const v = M[0].slice().sort((p, q) => p - q);
    return { uz: `Har bir qatorda va har bir ustunda ${v.map(fmt).join(', ')} sonlari bittadan uchraydi. Uchinchi qatorda ${fmt(a)} yetishmaydi.`,
      ru: `В каждой строке и в каждом столбце числа ${v.map(fmt).join(', ')} встречаются по одному разу. В третьей строке не хватает числа ${fmt(a)}.` };
  }, (M, x, y, a) => [m(x, 'copy'), m(y, 'copy'), m(x + y - a, 'wrongop')]));

  def('g_diff', 'row:diff', 5, gridBuild((r, L) => rows3(r, () => {
    const y = r.range(2, 40), x = L >= 9 && r.chance(0.3) ? r.range(2, 60) : y + r.range(MIN_POS, 50); return [x, y, x - y];
  }), (M, x, y, a) => ({ uz: `Har bir qatorda uchinchi son birinchi va ikkinchi sonning ayirmasiga teng: ${fmt(x)} − ${par(y)} = ${fmt(a)}.`,
    ru: `В каждой строке третье число равно разности первого и второго: ${fmt(x)} − ${par(y)} = ${fmt(a)}.` }),
  (M, x, y, a) => [m(-a, 'sign')]));

  def('g_prod', 'row:prod', 5, gridBuild((r) => rows3(r, () => {
    const x = r.range(2, 12), y = r.range(2, 12); return [x, y, x * y];
  }), (M, x, y, a) => ({ uz: `Har bir qatorda uchinchi son birinchi ikkitasining ko'paytmasiga teng: ${fmt(x)} × ${par(y)} = ${fmt(a)}.`,
    ru: `В каждой строке третье число равно произведению первых двух: ${fmt(x)} × ${par(y)} = ${fmt(a)}.` }),
  (M, x, y, a) => [m(a + x, 'step'), m(a - y, 'step')]));

  def('g_colsum', 'col:sum', 5, gridBuild((r) => {
    const A = seqOf(3, () => r.range(2, 45)), B = seqOf(3, () => r.range(2, 45));
    return [A, B, A.map((v, j) => v + B[j])];
  }, (M, x, y, a) => ({ uz: `Har bir ustunda pastki son yuqoridagi ikkita sonning yig'indisiga teng: ${fmt(M[0][2])} + ${par(M[1][2])} = ${fmt(a)}.`,
    ru: `В каждом столбце нижнее число равно сумме двух верхних: ${fmt(M[0][2])} + ${par(M[1][2])} = ${fmt(a)}.` })));

  def('g_sumconst', 'row:sumconst', 5.5, gridBuild((r) => {
    const S = r.range(30, 90);
    return rows3(r, () => { const x = r.range(2, S - 12), y = r.range(2, S - x - MIN_POS); return [x, y, S - x - y]; });
  }, (M, x, y, a) => {
    const S = M[0][0] + M[0][1] + M[0][2];
    return { uz: `Har bir qatordagi sonlar yig'indisi ${fmt(S)} ga teng: ${fmt(S)} − ${par(x)} − ${par(y)} = ${fmt(a)}.`,
      ru: `Сумма чисел в каждой строке равна ${fmt(S)}: ${fmt(S)} − ${par(x)} − ${par(y)} = ${fmt(a)}.` };
  }, (M, x, y) => { const S = M[0][0] + M[0][1] + M[0][2]; return [m(S - x, 'part'), m(S - y, 'part')]; }));

  const kText = k => (k > 0 ? ` + ${k}` : ` ${MINUS} ${-k}`);
  def('g_sumk', 'row:sumk', 6, (r, L) => {
    const k = r.pick([-1, 1]) * r.range(1, 6);
    return gridBuild((rr) => rows3(rr, () => { const x = rr.range(2, 50), y = rr.range(2, 50); return [x, y, x + y + k]; }),
      (M, x, y, a) => ({ uz: `Har bir qatorda uchinchi son birinchi ikkitasining yig'indisidan ${Math.abs(k)} ga ${k > 0 ? 'katta' : 'kichik'}: ${fmt(x)} + ${par(y)}${kText(k)} = ${fmt(a)}.`,
        ru: `В каждой строке третье число на ${Math.abs(k)} ${k > 0 ? 'больше' : 'меньше'} суммы первых двух: ${fmt(x)} + ${par(y)}${kText(k)} = ${fmt(a)}.` }),
      (M, x, y, a) => [m(x + y, 'part'), m(x + y - k, 'sign'), m(a + k, 'step2')])(r, L);
  });

  def('g_prodk', 'row:prodk', 6.5, (r, L) => {
    const k = r.pick([-1, 1]) * r.range(1, 6);
    return gridBuild((rr) => rows3(rr, () => { const x = rr.range(2, 11), y = rr.range(2, 11); return [x, y, x * y + k]; }),
      (M, x, y, a) => ({ uz: `Har bir qatorda uchinchi son birinchi ikkitasining ko'paytmasidan ${Math.abs(k)} ga ${k > 0 ? 'katta' : 'kichik'}: ${fmt(x)} × ${par(y)}${kText(k)} = ${fmt(a)}.`,
        ru: `В каждой строке третье число на ${Math.abs(k)} ${k > 0 ? 'больше' : 'меньше'} произведения первых двух: ${fmt(x)} × ${par(y)}${kText(k)} = ${fmt(a)}.` }),
      (M, x, y, a) => [m(x * y, 'part'), m(x * y - k, 'sign'), m(x + y + k, 'wrongop'), m(a + k, 'step2')])(r, L);
  });

  def('g_sumx', 'row:sumx', 6, (r, L) => {
    const k = r.pick([2, 3]);
    return gridBuild((rr) => rows3(rr, () => { const x = rr.range(2, 30), y = rr.range(2, 30); return [x, y, (x + y) * k]; }),
      (M, x, y, a) => ({ uz: `Har bir qatorda uchinchi son birinchi ikkitasi yig'indisining ${k} barobariga teng: (${fmt(x)} + ${par(y)}) × ${k} = ${fmt(a)}.`,
        ru: `В каждой строке третье число в ${k} ${ruRaz(k)} больше суммы первых двух: (${fmt(x)} + ${par(y)}) × ${k} = ${fmt(a)}.` }),
      (M, x, y, a) => [m(x + y, 'part'), m((x + y) * (k + 1), 'step'), m(x * y * k, 'wrongop'), m(x + y * k, 'part')])(r, L);
  });

  /* ══ DARAJALAR ═══════════════════════════════════════════════════════
     Har darajada qaysi oila qanday og'irlik bilan chiqadi. Daraja oshgani
     sari oddiy +d, ×r kamayadi, ikki qoidali va manfiy sonli oilalar,
     keyin 3×3 panjara qo'shiladi. O'rtacha murakkablik (cx) har darajada
     qat'iy oshadi — test buni tekshiradi. */
  const LEVELS = {
    1: { arith_up: 7, arith_down: 2, geom: 1 },
    2: { arith_up: 3, arith_down: 3, geom: 3, geom_half: 1 },
    3: { arith_up: 1, arith_down: 1, geom: 2, geom_half: 2, geom_big: 1, alt2: 1, diff2: 2 },
    4: { geom_half: 1, geom_big: 1, arith_neg: 2, alt2: 2, diff2: 2, square: 2, fib: 1 },
    5: { arith_neg: 1, alt2: 2, diff2: 1, square: 1, square_c: 2, ntimes: 1, geom_neg: 2, cube: 1, fib: 2, altop: 1 },
    6: { alt2_neg: 2, diff2_down: 2, square_c: 1, ntimes: 1, geom_neg: 1, cube: 1, fib: 1, altop: 2, fibc: 1 },
    7: { alt2_neg: 1, diff2_down: 1, altop: 2, cyc3: 2, linrec: 2, fibc: 1, trib: 1, alt2mix: 1, g_sum: 1, g_arith: 1, g_perm: 1 },
    8: { altop: 1, cyc3: 1, linrec: 2, ratio: 2, trib: 1, fibc: 1, alt2mix: 2, g_sum: 1, g_arith: 1, g_diff: 1, g_prod: 1, g_colsum: 1, g_sumconst: 1 },
    9: { linrec: 1, ratio: 2, alt2mix: 2, linrec2: 2, prodfib: 1, linrec_neg: 1, g_prod: 1, g_diff: 1, g_sumk: 1, g_prodk: 1, g_sumx: 1, g_colsum: 1 },
    10: { linrec2: 3, prodfib: 1, linrec_neg: 2, ratio: 1, alt2mix: 1, g_sumk: 2, g_prodk: 2, g_sumx: 1 },
  };

  /* Darajaning kutilgan o'rtacha murakkabligi — b ni shunga nisbatan siljitamiz. */
  const EXP_CX = {};
  for (const L in LEVELS) {
    let s = 0, w = 0;
    for (const id in LEVELS[L]) { s += V[id].cx * LEVELS[L][id]; w += LEVELS[L][id]; }
    EXP_CX[L] = s / w;
  }

  /* Variantlar soni: past darajada 4, o'rtada 5, yuqorida 6 — tasodifan
     topish ehtimoli ham kamayadi. */
  const optionCount = L => (L <= 3 ? 4 : L <= 7 ? 5 : 6);

  function pickWeighted(r, table) {
    const ids = Object.keys(table);
    let x = r.int(ids.reduce((s, id) => s + table[id], 0));
    for (const id of ids) { x -= table[id]; if (x < 0) return id; }
    return ids[ids.length - 1];
  }

  /* ── Variantlarni tanlash ─────────────────────────────────────────────
     R = to'g'ri javob saralangan variantlar ichida nechanchi (0..k−1) —
     TEKIS tasodif. Pastdan R ta, yuqoridan k−1−R ta distraktor olinadi.

     Distraktor ikki xil:
       · ishonarli xato (g.mistakes: boshqa amal, tarmoq, qadam …);
       · "yaqin xato" — mavjud variantlardan TASODIFIY birining ±1/±2/±3
         (yoki ±qadam) qo'shnisi. Tayanch javob ham, distraktor ham
         bo'lishi mumkin — shunda "±1 qo'shnisi bor son — javob" degan
         ayyorlik ishlamaydi (javob atrofida to'da yig'ilmaydi).
     avoid'dagi son (boshqa qoidaning javobi) hech qaysi bosqichda
     olinmaydi. Qatorda ko'rsatilgan hadni takrorlash — tekin "yo'q"
     variant (odam qator takrorlanmasligini ko'radi), shuning uchun olinmaydi;
     faqat javobning o'zi ko'rsatilgan hadga teng bo'lsa (davriy qator) —
     aks holda "qatorda bor yagona son — javob" degan yorliq paydo bo'lardi.
     Oxirgi had esa har doim chiqariladi. */
  const P_NEAR = 0.35;
  function pickOptions(r, g, avoid, k, lim) {
    const ans = g.answer, lo = g.neg ? -lim + 1 : 1, hi = lim - 1;
    const shown = new Set(g.terms ? (g.terms.includes(ans) ? [] : g.terms).concat(g.terms[g.terms.length - 1]) : []);
    const seen = new Set([ans]);
    let dropped = 0;
    const okv = v => {
      if (!isInt(v) || v < lo || v > hi || seen.has(v) || shown.has(v)) return false;
      if (avoid.has(v)) { seen.add(v); dropped++; return false; }
      return true;
    };
    const side = v => (v < ans ? 'b' : 'a');
    const onSide = (v, s) => (s === 'b' ? v < ans : v > ans);
    const R = r.int(k);
    const slots = r.shuffle(seqOf(R, () => 'b').concat(seqOf(k - 1 - R, () => 'a')));
    const P = { b: [], a: [] };
    for (const x of r.shuffle(g.mistakes)) if (isInt(x.v) && x.v !== ans) P[side(x.v)].push(x);
    const st = Math.max(1, Math.abs(g.step | 0));
    const gaps = st > 3 && st <= 20 ? [1, 2, 3, st] : [1, 2, 3];
    const members = [{ v: ans, why: null }], ds = [];
    const near = (s, gs) => {
      for (const mb of r.shuffle(members)) {
        for (const d of r.shuffle(gs)) {
          for (const v of r.shuffle([mb.v - d, mb.v + d])) {
            if (onSide(v, s) && okv(v)) return { v, why: mb.why || (d === st && d > 3 ? 'step' : 'off') };
          }
        }
      }
      return null;
    };
    for (const s of slots) {
      let x = null;
      if (!r.chance(P_NEAR)) while (!x && P[s].length) { const c = P[s].shift(); if (okv(c.v)) x = c; }
      x = x || near(s, gaps) || near(s, seqOf(60, i => i + 1));
      if (!x) return null;
      seen.add(x.v); ds.push(x); members.push(x);
    }
    return { R, ds, dropped };
  }

  /* ── SVG: 3×3 panjara ─────────────────────────────────────────────── */
  function gridSvg(M) {
    let s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect width="300" height="300" fill="#fff"/>';
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const x = 6 + j * 96, y = 6 + i * 96, q = i === 2 && j === 2;
        const txt = q ? '?' : fmt(M[i][j]);
        const fs = txt.length <= 2 ? 40 : txt.length === 3 ? 34 : 28;
        s += '<rect x="' + x + '" y="' + y + '" width="88" height="88" rx="10" fill="#fff" stroke="' + (q ? '#8a8799' : '#1c1b29') +
          '" stroke-width="3"' + (q ? ' stroke-dasharray="8 6"' : '') + '/>';
        s += '<text x="' + (x + 44) + '" y="' + (y + 44 + Math.round(fs * 0.35)) + '" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="' +
          fs + '" font-weight="700" fill="#1c1b29">' + txt + '</text>';
      }
    }
    return s + '</svg>';
  }

  const PROMPT_SERIES = { uz: 'Qatorni davom ettiring. Keyingi son qaysi?', ru: 'Продолжите ряд. Какое число следующее?' };
  const PROMPT_GRID = { uz: 'Jadvaldagi so\'roq belgisi o\'rniga qaysi son turishi kerak?', ru: 'Какое число должно стоять вместо знака вопроса?' };

  /* ── Asosiy: bitta savol ──────────────────────────────────────────── */
  function inspect(seed, level) {
    const L = Math.max(1, Math.min(10, Math.round(level) || 1));
    seed = seed >>> 0;
    /* Daraja urug'ga qo'shiladi: bir xil urug' turli darajada turli savol beradi. */
    const r = IQ.rng(IQ.hash('series:' + L + ':' + seed));
    const stats = { gen: 0, self: 0, occam: 0, opts: 0, leak: 0, dropped: 0, occamBy: [] };
    let fallback = false;
    for (let attempt = 0; attempt < MAX_ATTEMPTS * 2; attempt++) {
      if (attempt === MAX_ATTEMPTS) fallback = true;         // juda kam bo'lishi kerak; test 0 ekanini tekshiradi
      const vid = fallback ? 'arith_up' : pickWeighted(r, LEVELS[L]);
      const v = V[vid];
      const g = v.gen(r, L);
      const isGrid = !!(g && g.grid);
      const lim = isGrid ? GLIM : LIM;
      if (!g) { stats.gen++; continue; }
      const vals = isGrid ? [].concat(...g.grid) : g.terms.concat(g.answer);
      if (vals.some(x => !isInt(x) || Math.abs(x) >= lim)) { stats.gen++; continue; }
      g.neg = vals.some(x => x < 0);
      if (!g.neg && g.answer < MIN_POS) { stats.gen++; continue; }

      const alts = isGrid ? fitGrid(g.grid) : fitSeries(g.terms);
      const own = alts.find(a => a.fam === v.fam && a.next === g.answer);
      if (!own) { stats.self++; continue; }                 // generator va fitter kelishmadi — xato savol chiqmasin
      /* Okkam: murakkab bo'lmagan boshqa qoida haqiqatan mos kelib, boshqa BUTUN javob bersa — tashlaymiz. */
      const rival = alts.find(a => a.checks >= 1 && isInt(a.next) && a.next !== g.answer && a.cx <= own.cx);
      if (rival) { stats.occam++; stats.occamBy.push(vid + '>' + rival.fam); continue; }
      const avoid = new Set(alts.filter(a => a.next !== g.answer).map(a => a.next));
      const k = optionCount(L);
      const picked = pickOptions(r, g, avoid, k, lim);
      if (!picked) { stats.opts++; continue; }
      stats.dropped += picked.dropped;
      /* Oxirgi himoya: variantlarda boshqa qoidaning javobi bo'lsa — qayta. */
      if (picked.ds.some(d => avoid.has(d.v))) { stats.leak++; continue; }

      const order = r.shuffle([{ v: g.answer, why: null }].concat(picked.ds));
      const text = n => ({ kind: 'text', uz: fmt(n), ru: fmt(n) });
      const cx = v.cx;
      /* b: darajaning boshlang'ich qiymati + shu savol qoidasi darajaning
         o'rtachasidan qanchalik murakkab ekaniga qarab ±0.75 gacha. */
      const adj = Math.max(-0.75, Math.min(0.75, 0.35 * (cx - EXP_CX[L])));
      const b = Math.round((IQ.levelToB(L) + adj) * 100) / 100;
      const stimText = isGrid ? null : g.terms.map(fmt).join(', ') + ', ?';
      const item = {
        id: 'series:' + L + ':' + seed,
        type: 'series',
        level: L,
        b,
        prompt: Object.assign({}, isGrid ? PROMPT_GRID : PROMPT_SERIES),   // nusxa: bir savolni o'zgartirish boshqasiga ta'sir qilmasin
        stimulus: isGrid ? { kind: 'svg', svg: gridSvg(g.grid) } : { kind: 'text', uz: stimText, ru: stimText },
        options: order.map(o => text(o.v)),
        correct: order.findIndex(o => o.why === null),
        explain: g.explain,
      };
      return {
        item, variant: vid, fam: v.fam, cx, attempts: attempt + 1, stats, fallback,
        terms: g.terms || null, grid: g.grid || null, answer: g.answer, sortedRank: picked.R,
        distractors: picked.ds, alts,
      };
    }
    throw new Error('[IQ] series: savol yaratib bo\'lmadi (' + seed + ', ' + L + ')');
  }

  IQ.register({
    type: 'series',
    label: { uz: 'Son qatorlari', ru: 'Числовые ряды' },
    generate: (seed, level) => inspect(seed, level).item,
    /* Quyidagilar shartnomadan tashqari — faqat testlar va tahlil uchun. */
    inspect,
    fitSeries,
    fitGrid,
    variants: Object.keys(V).map(id => ({ id, fam: V[id].fam, cx: V[id].cx })),
    levels: LEVELS,
    expectedCx: EXP_CX,
    why: WHY.slice(),
    optionCount,
  });
})(typeof window !== 'undefined' ? window : globalThis);
