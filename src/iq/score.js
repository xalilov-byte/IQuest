/* ─────────────────────────────────────────────────────────────────────────
   IQ.score — qobiliyat bahosi (IRT, uch parametrli logistik model)

   NIMA UCHUN ULUSH EMAS, IRT: "30 tadan 20 ta to'g'ri" ikki odam uchun
   bir xil raqam, lekin biriga oson, boshqasiga qiyin savollar tushgan
   bo'lishi mumkin (sessiya adaptiv — savol qiyinligi javobga qarab
   o'zgaradi). IRT har javobni savolning qiyinligi (b) bilan birga
   o'qiydi: qiyin savolga to'g'ri javob oson savolga to'g'ri javobdan
   ko'proq narsa aytadi.

   MODEL — 3PL (Birnbaum, 1968; Lord, 1980 "Applications of IRT", 2-bob):

       P(to'g'ri | θ, b, c) = c + (1 − c) / (1 + e^−(θ − b))

   θ — odamning qobiliyati (logit), b — savol qiyinligi (IQ.levelToB
   shkalasi, Rasch logiti), c — TAXMIN QILIB TOPISH ehtimoli. Ajratish
   (a) parametri 1 ga teng: savollar hali kalibrlanmagan, a ni bilmaymiz,
   Rasch shkalasidagi b bilan esa a = 1 mos keladi.

   NIMA UCHUN c: variantli savolda hech narsa bilmagan odam ham 1/k
   ehtimol bilan topadi. Rasch (c = 0) buni bilmaydi va qiyin savolga
   tasodifan to'g'ri javobni "qobiliyat" deb hisoblaydi — past θ li
   odamning bahosi yuqoriga siljiydi, ORALIQ esa yolg'on tor chiqadi.
   c = 1/k: k — variantlar soni (javob obyektida `k` yoki to'g'ridan-
   to'g'ri `c`; yo'q bo'lsa 4 variant, c = 0.25).

   BAHO — EAP (Bock & Mislevy, 1982): θ ning posterior o'rtachasi,
   prior N(0, 1). Nega MLE emas: hamma javobi to'g'ri (yoki hammasi
   xato) odam uchun MLE cheksizlikka ketadi, EAP esa har doim chekli.
   Integral kvadratura bilan: −8..8 oralig'ida 161 ta teng qadamli
   nuqta (qadam 0.1). Posterior silliq va tez so'nadi, shuning uchun
   teng qadamli yig'indi aniq (testda −12..12 dagi 6001 nuqtali hisob
   bilan solishtiriladi). se — posterior standart og'ishi.

   Hamma hisob LOG shkalada: 30 ta ehtimol ko'paytmasi kichrayib
   ketmasin, b qanchalik g'alati bo'lmasin NaN chiqmasin.
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const IQ = root.IQ = root.IQ || {};

  /* Variantlar soni noma'lum bo'lsa — 4 ta (shartnomadagi eng kam son).
     Kam variant = ko'p taxmin: bu tanlov bahoni ehtiyotkor qiladi. */
  const C_DEFAULT = 0.25;

  /* Kvadratura to'ri: −8..8, qadam 0.1 (161 nuqta).

     NEGA ±4 EMAS (prior massasining 99.994% i ±4 ichida bo'lsa ham):
     prior emas, POSTERIOR muhim. 30 ta eng qiyin savolga hammasi to'g'ri
     javob bergan odamning posteriori θ ≈ 4.0 ± 0.5 da turadi; ±4 to'r
     uni kesib θ = 3.64, se = 0.30 berardi (o'lchangan) — ya'ni oraliq
     aynan eng kam ma'lumotli joyda YOLG'ON tor chiqardi. Pastda ham
     shunday: 30 ta eng oson savolga hammasi xato (tasodifdan ham
     past) → θ ≈ −4.4 ± 0.5. ±8 bunday holatlarni ham sig'diradi.

     Qadam 0.1: posterior s.o. ≥ ~0.2 bo'lganda silliq, tez so'nuvchi
     funksiya uchun teng qadamli yig'indi xatosi ~exp(−2π²σ²/h²) —
     amalda nol. Talab ≥ 61 nuqta; 161 nuqta 30 javobda ~0.1 ms. */
  const GRID_MIN = -8, GRID_MAX = 8, GRID_N = 161;
  const GRID = new Float64Array(GRID_N);
  /* e^θ to'rning har nuqtasida — oldindan. Shunda e^(θ−b) = e^θ·e^−b va
     ichki siklda exp umuman yo'q, nuqtaga bitta log qoladi. */
  const EGRID = new Float64Array(GRID_N);
  for (let q = 0; q < GRID_N; q++) {
    GRID[q] = GRID_MIN + (GRID_MAX - GRID_MIN) * q / (GRID_N - 1);
    EGRID[q] = Math.exp(GRID[q]);
  }
  /* |b| > 30 — amalda cheksiz oson/qiyin savol (to'rda P farqi < 1e−10);
     kesish e^−b ni to'lib ketishdan saqlaydi. */
  const B_MAX = 30;

  /* Math funksiyalari mahalliy nomga olinadi: estimate() har javobda
     chaqiriladi va ichki siklda ~5000 marta log qiladi. Global
     `Math` ni har safar qidirish brauzerda arzon, lekin node:vm
     (testlar) da 10 barobar sekin — o'lchangan: 1.8 ms → 0.13 ms. */
  const exp = Math.exp, log = Math.log, log1p = Math.log1p, sqrt = Math.sqrt;
  const min = Math.min, max = Math.max, round = Math.round;
  const clamp = (x, a, b) => max(a, min(b, x));
  const isNum = x => typeof x === 'number' && x - x === 0;   // son va chekli (NaN, ±∞ emas)

  const sigmoid = x => (x >= 0 ? 1 / (1 + exp(-x)) : exp(x) / (1 + exp(x)));

  /* Javobdan c: avval aniq `c`, keyin `k` (variantlar soni), bo'lmasa 0.25.
     c ∈ [0, 1): c = 1 bo'lsa javob hech narsa aytmaydi (hamma topadi). */
  function guessOf(r) {
    if (r && isNum(r.c) && r.c >= 0 && r.c < 1) return r.c;
    if (r && Number.isInteger(r.k) && r.k >= 2) return 1 / r.k;
    return C_DEFAULT;
  }

  const guessArg = c => (isNum(c) && c >= 0 && c < 1 ? c : C_DEFAULT);

  /* To'g'ri javob ehtimoli (3PL). */
  function prob(theta, b, c) {
    c = guessArg(c);
    return c + (1 - c) * sigmoid(theta - b);
  }

  /* Fisher ma'lumoti (Lord 1980, (2-17)):  I = P'² / (P(1 − P)),
     P' = (1 − c)·σ(1 − σ). Savol tanlashda va testlarda ishlatiladi. */
  function info(theta, b, c) {
    c = guessArg(c);
    const s = sigmoid(theta - b), p = c + (1 - c) * s, d = (1 - c) * s * (1 - s);
    return p > 0 && p < 1 ? d * d / (p * (1 - p)) : 0;
  }

  /* EAP. responses: [{ b, correct, k?, c? }].
     opts (ixtiyoriy, shartnomaga QO'SHIMCHA): { mean, sd } — prior.
     Standart N(0, 1): natija (Result) doim shu bilan hisoblanadi, chunki
     IQ shkalasi (100 ± 15) aynan shu populyatsiya taqsimotiga bog'langan.
     Boshqa prior faqat mashq rejimida KEYINGI SAVOLNI tanlash uchun.

     b soni bo'lmagan javob tashlab yuboriladi — bitta buzuq yozuv butun
     bahoni NaN qilib yubormasin. */
  function estimate(responses, opts) {
    const mean = opts && isNum(opts.mean) ? opts.mean : 0;
    const sd = opts && isNum(opts.sd) && opts.sd > 0 ? opts.sd : 1;
    const L = new Float64Array(GRID_N);
    for (let q = 0; q < GRID_N; q++) {
      const z = (GRID[q] - mean) / sd;
      L[q] = -0.5 * z * z;          // prior; doimiy ko'paytuvchi normallashda qisqaradi
    }
    const list = Array.isArray(responses) ? responses : [];
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      if (!r || !isNum(r.b)) continue;
      const b = clamp(r.b, -B_MAX, B_MAX), c = guessOf(r), ok = !!r.correct;
      const eb = exp(-b), logWrong = log(1 - c);
      /* u = e^(θ−b), σ = u/(1+u).
           to'g'ri: log P     = log(c + (1−c)σ);  c = 0 da  (θ−b) − log(1+u)
           xato:    log(1−P)  = log(1−c) + log(1−σ) = log(1−c) − log(1+u)
         Ikkalasi ham |θ−b| ≤ 38 da to'lib ketmaydi va NaN bermaydi. */
      if (ok && c > 0) {
        for (let q = 0; q < GRID_N; q++) {
          const u = EGRID[q] * eb;
          L[q] += log(c + (1 - c) * u / (1 + u));
        }
      } else if (ok) {
        for (let q = 0; q < GRID_N; q++) L[q] += (GRID[q] - b) - log1p(EGRID[q] * eb);
      } else {
        for (let q = 0; q < GRID_N; q++) L[q] += logWrong - log1p(EGRID[q] * eb);
      }
    }
    let top = -Infinity;
    for (let q = 0; q < GRID_N; q++) if (L[q] > top) top = L[q];
    let sw = 0, st = 0;
    for (let q = 0; q < GRID_N; q++) {
      const w = exp(L[q] - top);
      L[q] = w; sw += w; st += w * GRID[q];
    }
    const theta = st / sw;
    let sv = 0;
    for (let q = 0; q < GRID_N; q++) {
      const d = GRID[q] - theta;
      sv += L[q] * d * d;
    }
    return { theta, se: sqrt(sv / sw) };
  }

  /* IQ uslubidagi ball: 100 + 15θ. Bu MEYORLANGAN IQ emas — θ = 0 bu
     "savollarimiz shkalasining o'rtasi", populyatsiya o'rtachasi emas
     (CONTRACT.md §6). 55..145 (±3σ) dan tashqarisini bu testning
     aniqligi bilan ajratib bo'lmaydi — chegarada kesiladi. */
  const toIQ = theta => round(clamp(100 + 15 * theta, 55, 145));

  /* Oraliq: θ ± z·se, keyin IQ shkalasiga. z = 1.645 → 90%.
     Normal yaqinlashuv: 20+ javobda posterior normalga yaqin
     (simulyatsiyada qamrov ~0.90 — tests/iq-score.test.mjs). */
  function interval(theta, se, z) {
    const w = (isNum(z) && z >= 0 ? z : 1.645) * (isNum(se) && se >= 0 ? se : 0);
    return { lo: toIQ(theta - w), hi: toIQ(theta + w) };
  }

  /* θ uchun eng ko'p ma'lumot beradigan qiyinlik.
     3PL da ma'lumot cho'qqisi b da EMAS, undan biroz yuqorida
     (Birnbaum 1968; Lord 1980, (10-4)):
         θ_max = b + ln((1 + √(1 + 8c)) / 2) / a
     Demak θ berilganda eng yaxshi b = θ − ln((1 + √(1 + 8c)) / 2).
     c = 0.25 da siljish 0.31 logit (Rasch'da 0). Sabab: oson tomonda
     taxmin shovqini yo'q, qiyin tomonda esa to'g'ri javob tasodif
     bo'lishi mumkin. Shu nuqtada P(to'g'ri) ≈ 0.68. */
  const bestB = (theta, c) => theta - log((1 + sqrt(1 + 8 * guessArg(c))) / 2);

  /* b → daraja (IQ.levelToB ning teskarisi). levelToB chiziqli, shuning
     uchun uni o'zidan o'qiymiz — integrator shkalani o'zgartirsa, bu
     yer ham o'zi moslashadi. */
  function levelOf(b) {
    const f = IQ.levelToB || (l => (l - 5.5) * 0.5);
    const b1 = f(1), step = f(2) - b1;
    return 1 + (b - b1) / step;
  }

  /* Keyingi savol darajasi. rng (IQ.rng) berilsa — ±0.75 daraja tekis
     tasodif: hamma bir xil θ da bir xil darajani olmasin (savol
     "ta'sirini" yoyish — randomesque, Kingsbury & Zara 1989). 0.75
     daraja = 0.375 logit: shuncha siljishda ma'lumot cho'qqidan bir
     necha foizga kamayadi, ya'ni aniqlik deyarli yo'qolmaydi.
     c (ixtiyoriy, QO'SHIMCHA) — keyingi savolning taxmin ehtimoli. */
  const JITTER = 0.75;
  function nextLevel(theta, rng, c) {
    const t = isNum(theta) ? theta : 0;
    let lv = levelOf(bestB(t, c));
    if (rng && typeof rng.next === 'function') lv += (rng.next() * 2 - 1) * JITTER;
    return clamp(round(lv), IQ.LEVEL_MIN || 1, IQ.LEVEL_MAX || 10);
  }

  IQ.score = {
    estimate,
    toIQ,
    interval,
    nextLevel,
    /* Qo'shimchalar (shartnomaga zid emas): testlar va sessiya uchun. */
    prob,
    info,
    bestB,
    C_DEFAULT,
    GRID_N,
  };
})(typeof window !== 'undefined' ? window : globalThis);
