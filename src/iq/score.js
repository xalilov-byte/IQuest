/* ─────────────────────────────────────────────────────────────────────────
   IQ.score — javoblardan qobiliyat bahosi (theta) va IQ-uslubidagi ball

   Shartnoma: src/iq/CONTRACT.md §4.

   MODEL. Har savolning qiyinligi b (logit, Rasch shkalasi). To'g'ri javob
   ehtimoli:

       P(to'g'ri | θ) = c + (1 − c) · σ(θ − b),     σ(x) = 1 / (1 + e^−x)

   Bu Rasch (1PL) modeli + "taxmin qilish" pastki chegarasi c (3PL
   uslubida, lekin c ni ma'lumotdan baholamaymiz — u QAT'IY):

       c = 1 / k,   k — savoldagi variantlar soni (items[].k)

   NEGA c = 1/k: variant tanlanadigan testda hech narsa bilmagan odam ham
   4 variantli savolning ~25% ini topadi. Toza Rasch (c = 0) buni
   "qobiliyat" deb hisoblaydi: tasodifan belgilagan odam θ ≈ −1.5 o'rniga
   ancha yuqori chiqardi, qiyin savolga tasodifan to'g'ri javob esa
   bahoni keskin ko'tarardi. c ni baholash uchun esa minglab odamning
   javobi kerak (bizda hali yo'q) — shuning uchun eng halol boshlang'ich
   taxmin: tasodifiy tanlash ehtimoli 1/k. k berilmagan bo'lsa (eski
   jurnal yoki boshqa manba) c = 0, ya'ni toza Rasch.

   BAHO — EAP (posteriorning o'rtachasi), prior N(0, 1). Integral
   sonli: [-4, 4] oralig'ida 0.1 qadamli 81 nuqta. Nega EAP, maksimal
   haqiqatlik (ML) emas: hamma javob to'g'ri (yoki hammasi xato) bo'lsa
   ML cheksizlikka ketadi; EAP har doim chekli va prior tufayli oz
   savolda ham o'rinli. se — posteriorning standart og'ishi.

   [-4, 4] yetarli: IQ shkalasi 55..145 ya'ni θ ∈ [-3, 3]; N(0,1) priorda
   |θ| > 4 ning ulushi ~6·10⁻⁵ — natijaga ta'siri IQ ballining
   yaxlitlashidan ham kichik.

   Tasodif (nextLevel dagi jitter) faqat uzatilgan IQ.rng dan —
   Math.random() yo'q: server sessiyani aynan qayta o'ynashi kerak (§10).
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const IQ = root.IQ = root.IQ || {};

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  /* Kvadratura to'ri va logarifmik prior — bir marta hisoblanadi. */
  const GRID_MIN = -4, GRID_MAX = 4, GRID_N = 81;
  const GRID = [], LOG_PRIOR = [];
  for (let j = 0; j < GRID_N; j++) {
    const t = GRID_MIN + (GRID_MAX - GRID_MIN) * j / (GRID_N - 1);
    GRID.push(t);
    LOG_PRIOR.push(-t * t / 2);            // N(0,1), doimiysi qisqaradi
  }

  const IQ_MIN = 55, IQ_MAX = 145;

  /* Math.* bir marta olinadi: estimate() ichki tsikli (javoblar × 81
     nuqta) simulyatsiya testlarida millionlab marta aylanadi. */
  const exp = Math.exp, log = Math.log;

  /* Taxmin chegarasi: k — variantlar soni (2 dan kam bo'lsa c = 0). */
  const guess = k => (Number.isInteger(k) && k >= 2 ? 1 / k : 0);

  /* To'g'ri javob ehtimoli. Testlar simulyatsiyasi ham shuni ishlatadi —
     baholovchi va "haqiqat" bir xil modelda. */
  function prob(theta, b, k) {
    const c = guess(k);
    return c + (1 - c) / (1 + exp(b - theta));
  }

  /* log(p) ni 0 ga tushib qolishdan himoya: p juda kichik bo'lsa
     −Infinity chiqib, butun posterior NaN ga aylanardi. */
  const EPS = 1e-12;

  function estimate(responses) {
    const lp = LOG_PRIOR.slice();
    const list = responses || [];
    for (const r of list) {
      if (!r || typeof r.b !== 'number' || !isFinite(r.b)) continue;   // buzuq yozuv hisobga olinmaydi
      const b = r.b, c = guess(r.k), ok = !!r.correct;
      for (let j = 0; j < GRID_N; j++) {
        let p = c + (1 - c) / (1 + exp(b - GRID[j]));
        if (p < EPS) p = EPS; else if (p > 1 - EPS) p = 1 - EPS;
        lp[j] += ok ? log(p) : log(1 - p);
      }
    }
    /* Eng katta qiymatni ayirib eksponentlaymiz — aks holda ko'p savolda
       e^(−500) nolga tushadi (underflow). */
    let max = -Infinity;
    for (let j = 0; j < GRID_N; j++) if (lp[j] > max) max = lp[j];
    let sw = 0, st = 0;
    const w = new Array(GRID_N);
    for (let j = 0; j < GRID_N; j++) {
      w[j] = exp(lp[j] - max);
      sw += w[j];
      st += w[j] * GRID[j];
    }
    const theta = st / sw;
    let v = 0;
    for (let j = 0; j < GRID_N; j++) v += w[j] * (GRID[j] - theta) * (GRID[j] - theta);
    return { theta, se: Math.sqrt(v / sw) };
  }

  /* 100 + 15·θ, butun son, 55..145. Chegaradan tashqaridagi raqamni
     ko'rsatish uchun test juda qisqa va me'yorlanmagan (CONTRACT §6). */
  function toIQ(theta) {
    if (typeof theta !== 'number' || isNaN(theta)) return 100;
    return Math.round(clamp(100 + 15 * theta, IQ_MIN, IQ_MAX));
  }

  /* Oraliq θ ± z·se, IQ shkalasida. z = 1.645 → 90%. */
  function interval(theta, se, z) {
    const zz = typeof z === 'number' && isFinite(z) ? z : 1.645;
    const s = typeof se === 'number' && isFinite(se) && se > 0 ? se : 0;
    return { lo: toIQ(theta - zz * s), hi: toIQ(theta + zz * s) };
  }

  /* Keyingi savol darajasi.

     Maqsad qiyinlik b* = θ − 0.3, aniq θ emas: taxmin chegarasi c bor
     modelda savol eng ko'p ma'lumot beradigan nuqta b dan biroz yuqorida
     — θ_max = b + ln((1 + √(1 + 8c)) / 2). k = 4 (c = 0.25) uchun 0.31,
     k = 6 uchun 0.23. Ya'ni eng foydali savol θ dan ~0.3 logit OSON.

     b* darajaga aylantiriladi (IQ.levelToB ning teskarisi) va
     TASODIFIY YAXLITLANADI: L = 4.3 bo'lsa 70% ehtimol bilan 4, 30% —
     5. Bu "kichik jitter": o'rtacha darajani siljitmaydi, lekin bir xil
     javob bergan ikki odamga doim aynan bir xil savollar zanjiri
     tushmasligini ta'minlaydi. rng berilmasa — oddiy yaxlitlash. */
  const TARGET_OFFSET = 0.3;

  function nextLevel(theta, rng) {
    const t = typeof theta === 'number' && isFinite(theta) ? theta : 0;
    const b1 = IQ.levelToB(1), step = IQ.levelToB(2) - b1;
    const L = 1 + (t - TARGET_OFFSET - b1) / step;
    const u = rng ? rng.next() : 0.5;
    return clamp(Math.floor(L + u), IQ.LEVEL_MIN || 1, IQ.LEVEL_MAX || 10);
  }

  IQ.score = {
    estimate,
    toIQ,
    interval,
    nextLevel,
    prob,
    guess,
    TARGET_OFFSET,
  };
})(typeof window !== 'undefined' ? window : globalThis);
