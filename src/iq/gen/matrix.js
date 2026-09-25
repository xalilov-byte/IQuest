/* ─────────────────────────────────────────────────────────────────────────
   gen/matrix.js — Raven uslubidagi progressiv matritsalar

   3×3 panjara (1-darajada 2×2), o'ng pastki katak bo'sh ("?"). Har katak
   — bitta "panel": bir nechta bir xil shakl (+ yuqori darajada ramka
   chiziqlari). Panel ATRIBUTLARDAN iborat:

     shape  — doira, uchburchak, kvadrat, beshburchak, oltiburchak
     count  — shakllar soni, 1..4 (5 ta sig'dirilsa shakl juda maydalashadi:
              kichik shtrixli uchburchak telefon ekranida bo'shdan ajralmaydi)
     size   — kichik / o'rta / katta
     fill   — bo'sh / to'la / shtrixli (rang emas — naqsh!)
     rot    — uchburchak uchining yo'nalishi (yuqori, o'ng, past, chap)
     pos    — yolg'iz shakl qaysi burchakda turibdi
     lines  — ramkaning 8 ta yarim tomonidan qaysilari chizilgan

   "Rejim" qaysi atributlar o'zgarishi mumkinligini belgilaydi: obj
   (shakl/son/o'lcham/bo'yoq), rot (uchburchak burilishi — shakl doim
   uchburchak, aks holda doira "burilgani" ma'nosiz), pos (bitta shakl
   burchaklar bo'ylab yuradi — son doim 1).

   Har atributga bitta QOIDA (qatorlar bo'yicha):
     const — hamma katakda bir xil
     row   — qatorda bir xil, qatordan qatorga o'zgaradi (2×2 da col ham)
     prog  — chapdan o'ngga bir qadamga o'zgaradi (son ±1, o'lcham,
             burilish 90°, burchak soat mili bo'yicha — oxirgi ikkisi
             aylanma, mod 4)
     d3    — "uchtadan biri": har qatorda uchta qiymat bir martadan
             (lotin kvadrati — ustunlarda ham)
     arith — son: uchinchi = birinchi ± ikkinchi
     op    — chiziqlar: uchinchi = birinchi ∪ / − / ⊕ / ∩ ikkinchi

   ENG MUHIM UCH QAROR (va nima uchun):

   a) VARIANTLAR TO'PLAMI TO'G'RI JAVOBDAN OLDIN QURILADI. Klassik Raven
      distraktor xatosi: to'g'ri javobni olib, har distraktorda bitta
      atributni o'zgartirish. Natija — to'g'ri javob to'plamning
      "markazi" (boshqalar bilan eng ko'p umumiy atributli variant), ayyor
      odam matritsaga qaramay ~100% topadi. Bu yerda variantlar —
      simmetrik "dizayn" (I-RAVEN g'oyasi): tanlangan m ta atributning
      qiymatlari to'liq ko'paytma (2×2, 3×2) yoki kubning simmetrik
      qismi (oltiburchak, 4 bitdan 2 tasi). Unda har variant
      bir xil holatda: har qiymat bir xil marta uchraydi, har variantning
      "qo'shnilari" soni bir xil. SO'NG to'g'ri javob tekis tanlanadi va
      matritsa ORQAGA — shu javobdan — quriladi. Faqat variantlarga
      qaragan yechuvchi uchun hamma variant teng ehtimolli (test bir
      necha "ko'r" strategiya bilan tekshiradi).

      Panjarani ham ko'radigan "yuzaki" strategiyalar ("oxirgi qatorga eng
      kam o'xshagan", "panjarada nusxasi yo'q" ...) ham tekshiriladi. Ular
      uchun ikki chora: panjaradagi qolgan qiymatlar distraktorlarga
      qaramay TASODIFAN olinadi va har darajada "qatorda bir xil" qoidasi
      hamda (~35%) o'zgarmas atributni buzuvchi distraktorlar bor — shunda
      "javob oxirgi qatordan farq qiladi" degan naqsh ishlamaydi.

   b) BIR MA'NOLILIK. Har atribut uchun ko'rinib turgan 8 katakka
      qoidalar kutubxonasidagi HAMMA oila (qatorlar va ustunlar bo'yicha:
      o'zgarmas, har qatorda o'z qadamli progressiya, uchtadan biri,
      ±arifmetika, to'plam amallari) moslab ko'riladi. Mos kelganlarning
      hammasi aynan bitta javob berishi shart; aks holda shu atributning
      1–2-qatorlari qayta chiziladi (javob o'zgarmaydi — tekislik
      buzilmaydi). Demak har distraktor kamida bitta atributda yagona
      bashoratdan farq qiladi — ya'ni qoidani buzadi — va generator
      qaysinisini biladi (plan().options[i].viol).

   c) RANG YAGONA FARQ EMAS. Faqat #1c1b29 (siyoh), #fff (fon), #8a8799
      (panjara, "?"). "Bo'yalishi" — bo'sh / to'la / shtrix naqshi:
      ranglarni ajratmaydigan odam ham ko'radi. O'lcham — 0.55 : 0.78 : 1,
      har savolda bitta masshtab.

   Darajalar: panjara (2×2 → 3×3), o'zgaruvchi atributlar soni (1 → 4),
   qoida murakkabligi (row → prog → d3 → arith / chiziq amallari, XOR),
   variantlar soni (4 → 6) va distraktor dizayni.

   Test: tests/iq-matrix.test.mjs — SVG'ni o'zi o'qib, qoidalarni mustaqil
   tekshirgich bilan qayta topadi va hamma kafolatni qayta tekshiradi.
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const IQ = root.IQ = root.IQ || {};

  /* Global nomlar mahalliy nusxada: node:vm ichida har global murojaat
     sekin — 20 000 savollik test cho'zilib ketadi (spatial.js dagi kabi). */
  const { min, max, abs, round, cos, sin, PI } = Math;
  const HashSet = Set;

  const ATTRS = ['shape', 'count', 'size', 'fill', 'rot', 'pos', 'lines'];
  /* nom — nominal (tartibsiz), ord — tartibli, cyc — aylanma (mod 4),
     set — to'plam (8 bitli niqob). */
  const KIND = { shape: 'nom', fill: 'nom', count: 'ord', size: 'ord', rot: 'cyc', pos: 'cyc', lines: 'set' };
  const DOM = {
    shape: [0, 1, 2, 3, 4], count: [1, 2, 3, 4], size: [0, 1, 2],
    fill: [0, 1, 2], rot: [0, 1, 2, 3], pos: [0, 1, 2, 3],
  };
  const inDom = (a, v) => (a === 'count' ? v >= 1 && v <= 4 : a === 'size' ? v >= 0 && v <= 2 : true);
  const mod4 = v => ((v % 4) + 4) % 4;

  /* Rejim: o'zgarishi mumkin bo'lgan atributlar va qolganlarining qat'iy
     qiymati (pos −1 — markazda; lines 0 — chiziq yo'q). */
  const MODES = {
    obj: { attrs: ['shape', 'count', 'size', 'fill'], base: { rot: 0, pos: -1, lines: 0 } },
    rot: { attrs: ['rot', 'count', 'size', 'fill'], base: { shape: 1, pos: -1, lines: 0 } },
    pos: { attrs: ['pos', 'shape', 'size', 'fill'], base: { count: 1, rot: 0, lines: 0 } },
  };

  /* Chiziq to'plamlari ustida amallar (8 bit). rsub faqat tekshiruvda:
     odam "ikkinchidan birinchini ayirish" deb ham o'qishi mumkin. */
  const OPS = {
    or: (a, b) => a | b,
    and: (a, b) => a & b,
    xor: (a, b) => a ^ b,
    sub: (a, b) => a & ~b & 255,
    rsub: (a, b) => b & ~a & 255,
  };
  const ARITH = [(a, b) => a + b, (a, b) => a - b, (a, b) => b - a];

  /* Qoida murakkabligi — daraja testida va b ni sozlashda ishlatiladi. */
  const WEIGHT = { const: 0, row: 1, col: 1, prog: 2, d3: 2, arith: 3, or: 3, sub: 3, xor: 4, and: 4 };

  /* ── Darajalar ───────────────────────────────────────────────────────
     n      — panjara (2 yoki 3)
     nVar   — nechta atribut o'zgaradi (chiziqlar ham shu songa kiradi)
     fam    — ruxsat etilgan qoida oilalari (takror — ehtimolni oshiradi)
     lines  — chiziqlar qatlami ehtimoli; ops — ruxsat etilgan amallar
     designs— variantlar dizayni (pastda DESIGNS)
     constOpt — variantlarda o'zgarmas atribut ham o'zgarishi ehtimoli
     (standart CONST_OPT; yuqoridagi a) bandiga qarang) */
  const CONST_OPT = 0.35;
  const CONFIG = [
    null,
    { n: 2, nVar: [1], fam: ['row', 'col'], designs: ['P2'] },
    { n: 3, nVar: [1], fam: ['row', 'prog'], designs: ['P2'] },
    { n: 3, nVar: [2], fam: ['row', 'row', 'prog', 'prog', 'd3'], designs: ['P2'] },
    { n: 3, nVar: [2], fam: ['row', 'prog', 'd3', 'd3'], designs: ['P32'], constOpt: 0.5 },
    { n: 3, nVar: [2, 3], fam: ['row', 'prog', 'd3', 'd3'], designs: ['P32', 'H3'] },
    { n: 3, nVar: [3], fam: ['row', 'prog', 'd3', 'd3'], designs: ['H3', 'P32'] },
    { n: 3, nVar: [3], fam: ['row', 'prog', 'd3', 'arith'], lines: 0.5, ops: ['or', 'sub'], designs: ['H3'] },
    { n: 3, nVar: [3], fam: ['row', 'prog', 'd3', 'arith'], lines: 1, ops: ['or', 'sub', 'xor'], designs: ['H3'] },
    { n: 3, nVar: [4], fam: ['row', 'prog', 'd3', 'arith'], lines: 1, ops: ['or', 'sub', 'xor', 'and'], designs: ['J42', 'H3'] },
    { n: 3, nVar: [4], fam: ['row', 'prog', 'prog', 'd3', 'arith', 'arith'], lines: 1, ops: ['xor', 'or', 'sub', 'and'], xor: true, designs: ['J42'] },
  ];

  /* ── Variantlar dizaynlari ──────────────────────────────────────────
     card — har atribut nechta qiymat oladi; vecs — har variant qaysi
     qiymat indekslarini oladi. Hammasi "tranzitiv": qaysi variant to'g'ri
     deb tanlansa ham, qolganlariga nisbatan holati bir xil.
       P2  — 2×2 ko'paytma (k 4)
       P32 — 3×2 ko'paytma (k 6)
       H3  — kub minus qarama-qarshi ikki uch, oltiburchak (k 6)
       J42 — 4 bitdan aynan 2 tasi 1: har juft 2 yoki 4 atributda farq (k 6) */
  const DESIGNS = {
    P2: { card: [2, 2], vecs: [[0, 0], [0, 1], [1, 0], [1, 1]] },
    P32: { card: [3, 2], vecs: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]] },
    H3: { card: [2, 2, 2], vecs: [[1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 1, 1], [1, 0, 1], [1, 1, 0]] },
    J42: { card: [2, 2, 2, 2], vecs: [[1, 1, 0, 0], [1, 0, 1, 0], [1, 0, 0, 1], [0, 1, 1, 0], [0, 1, 0, 1], [0, 0, 1, 1]] },
  };

  /* 3×3 lotin kvadratlari (12 ta), qiymat indekslari 0..2 da. s — kvadrat
     "sinfi": kataklar (j + s·i) mod 3 bo'yicha guruhlanadi. Qiymatlarni
     qayta nomlash bilan faqat ikki sinf bor (diagonal / teskari
     diagonal). Ikki "uchtadan biri" atributi bir sinfda bo'lsa, ular
     doim birga o'zgaradi (uchburchak doim kichik...) — bu ikki qoida
     emas, bitta. Shuning uchun ikkinchisi iloji bo'lsa boshqa sinfdan. */
  const LATIN = [];
  for (const p of [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]) {
    for (const s of [1, 2]) LATIN.push({ s, L: [0, 1, 2].map(i => [0, 1, 2].map(j => p[(j + s * i) % 3])) });
  }

  /* ── Bir ma'nolilik: ko'rinib turgan kataklarga mos HAMMA qoidalar ─── */

  const lineOf = (M, i, t) => M.map((_, j) => (t ? M[j][i] : M[i][j]));
  const distinct3 = l => l[0] !== l[1] && l[1] !== l[2] && l[0] !== l[2];
  const sameSet = (l, s) => l.every(v => s.includes(v));

  /* M — n×n qiymatlar, o'ng pastki katak e'tiborga olinmaydi. Natija —
     mos kelgan qoidalar bashorat qilgan javoblar to'plami. Qatorlar VA
     ustunlar bo'yicha o'qiladi: odam ikkalasini ham sinab ko'radi.
     Bashorat qiymatlar oralig'idan tashqarida bo'lsa ham (masalan 0 yoki
     5 ta shakl) hisobga olinadi: variantlarda bo'lmasa ham, u odamni
     chalg'itadi — bunday panjara qayta chiziladi. */
  function predict(a, M) {
    const n = M.length, k = KIND[a], P = new HashSet();
    for (const t of [false, true]) {
      const full = [];
      for (let i = 0; i < n - 1; i++) full.push(lineOf(M, i, t));
      const part = lineOf(M, n - 1, t);
      if (n === 2) {
        const f = full[0], p = part[0];
        if (f[0] === f[1]) P.add(p);
        if (k === 'ord') P.add(p + f[1] - f[0]);
        if (k === 'cyc') P.add(mod4(p + f[1] - f[0]));
        continue;
      }
      const p0 = part[0], p1 = part[1];
      if (full.every(l => l[0] === l[1] && l[1] === l[2]) && p0 === p1) P.add(p0);
      if (k === 'ord' || k === 'cyc') {
        // har qator o'z qadamli progressiya (qadam 0 — o'zgarmas ham shu)
        const md = k === 'cyc' ? mod4 : (v => v);
        if (full.every(l => md(l[1] - l[0]) === md(l[2] - l[1]))) P.add(md(2 * p1 - p0));
      }
      const s0 = full[0];
      if (distinct3(s0) && full.every(l => distinct3(l) && sameSet(l, s0))
          && p0 !== p1 && s0.includes(p0) && s0.includes(p1)) {
        P.add(s0.find(v => v !== p0 && v !== p1));
      }
      if (a === 'count') {
        for (const f of ARITH) {
          if (full.every(l => l[2] === f(l[0], l[1]))) P.add(f(p0, p1));
        }
      }
      if (k === 'set') {
        for (const op in OPS) if (full.every(l => l[2] === OPS[op](l[0], l[1]))) P.add(OPS[op](p0, p1));
      }
    }
    return P;
  }
  const unique = (a, M, x) => {
    const P = predict(a, M);
    return P.size === 1 && P.has(x);
  };

  /* ── Bitta atribut uchun panjara — JAVOBDAN ORQAGA ──────────────────
     x — javob katagidagi qiymat (allaqachon tanlangan). Qolgan qiymatlar
     domendan TASODIFAN — distraktorlardagi qiymatlarga qarab EMAS. Sinab
     ko'rilgan: distraktor qiymatini ataylab panjaraga qo'ysak ("ishonarli
     xato"), u oxirgi qatorda paydo bo'ladi va "oxirgi qatorga eng kam
     o'xshagan variant" strategiyasi 10-darajada 95% topadi. Tasodifiy
     tanlovda bunday bog'liqlik yo'q (test: yuzaki strategiyalar).
     Natija null — bu oila x uchun mumkin emas. */
  const others = (r, a, need, x) => r.shuffle(DOM[a].filter(v => v !== x)).slice(0, need);
  const grid = (n, f) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => f(i, j)));

  function buildAttr(r, a, fam, x, cfg, latUsed) {
    const n = cfg.n, k = KIND[a];
    if (fam === 'const') return { M: grid(n, () => x) };
    if (fam === 'row' || fam === 'col') {
      const u = others(r, a, n - 1, x);
      const vals = u.concat([x]);
      return { M: grid(n, (i, j) => (fam === 'row' ? vals[i] : vals[j])) };
    }
    if (fam === 'prog') {
      let steps;
      if (k === 'cyc') steps = [1, -1];
      else steps = [1, -1].filter(d => inDom(a, x - 2 * d));
      if (!steps.length) return null;
      const d = r.pick(steps);
      const s3 = k === 'cyc' ? mod4(x - 2 * d) : x - 2 * d;
      let starts = k === 'cyc' ? [0, 1, 2, 3] : DOM[a].filter(s => inDom(a, s + 2 * d));
      // Qatorlar bir-biridan farq qilsin (iloji bo'lsa).
      const fresh = starts.filter(s => s !== s3);
      starts = r.shuffle(fresh.length >= 2 ? fresh : starts);
      const S = [starts[0], starts.length > 1 ? starts[1] : starts[0], s3];
      return { M: grid(n, (i, j) => (k === 'cyc' ? mod4(S[i] + j * d) : S[i] + j * d)), d };
    }
    if (fam === 'd3') {
      const T = r.shuffle([x].concat(others(r, a, 2, x)));
      const fit = LATIN.filter(q => T[q.L[2][2]] === x);
      const least = min(...fit.map(q => latUsed[q.s]));
      const q = r.pick(fit.filter(c => latUsed[c.s] === least)), L = q.L;
      return { M: grid(n, (i, j) => T[L[i][j]]), T: L[0].map(i => T[i]), s: q.s };
    }
    if (fam === 'arith') {
      if (a !== 'count') return null;
      const ok = [];
      if (x >= 2) ok.push('add');
      if (x <= 3) ok.push('sub');
      const op = r.pick(ok);
      const row = res => {
        // (a, b, a ± b), hammasi 1..4 ichida
        if (op === 'add') { const p = r.range(1, res - 1); return [p, res - p, res]; }
        const q = r.range(1, 4 - res); return [res + q, q, res];
      };
      const any = () => (op === 'add' ? r.range(2, 4) : r.range(1, 3));
      const M = [row(any()), row(any()), row(x)];
      return { M, op };
    }
    return null;
  }

  /* Chiziqlar: A va B ning uchala qismi (faqat A, faqat B, ikkalasi)
     bo'sh emas — shunda 5 ta amal 5 xil natija beradi va qator qaysi
     amalni ko'rsatayotgani bir ma'noli. */
  function linePair(r) {
    const bits = r.shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
    let A = 0, B = 0;
    bits.forEach((b, i) => {
      const reg = i < 3 ? i + 1 : r.chance(0.4) ? 1 + r.int(3) : 0;
      if (reg & 1) A |= 1 << b;
      if (reg & 2) B |= 1 << b;
    });
    return [A, B];
  }
  function buildLines(r, op, A3, B3) {
    const rows = [linePair(r), linePair(r), [A3, B3]];
    return { M: rows.map(([A, B]) => [A, B, OPS[op](A, B)]), op };
  }

  /* ── Reja ───────────────────────────────────────────────────────── */

  function famFor(r, a, cfg, nVar) {
    const ok = cfg.fam.filter(f => {
      if (f === 'arith') return a === 'count';
      if (f === 'prog') return KIND[a] !== 'nom' && (a !== 'size' || nVar >= 2);
      return true;
    });
    return ok.length ? r.pick(ok) : 'row';
  }

  function pickValues(r, a, need, lv) {
    if (a === 'count' && need === 2 && lv >= 5) {
      const v = r.range(1, 3);
      return r.shuffle([v, v + 1]);
    }
    return r.shuffle(DOM[a]).slice(0, need);
  }

  function tryPlan(r, lv, cfg) {
    const modeName = r.pick(['obj', 'obj', 'rot', 'pos']), mode = MODES[modeName];
    const nVar = r.pick(cfg.nVar);
    const useLines = !!cfg.lines && r.chance(cfg.lines);
    const pool = r.shuffle(mode.attrs);
    const V = useLines ? ['lines'].concat(pool.slice(0, nVar - 1)) : pool.slice(0, nVar);
    const consts = pool.filter(a => !V.includes(a));
    const all = mode.attrs.concat(useLines ? ['lines'] : []);

    const fam = {};
    for (const a of V) fam[a] = a === 'lines' ? 'op' : famFor(r, a, cfg, nVar);
    for (const a of consts) fam[a] = 'const';

    // 5-daraja: 2 ta qoida → 3×2 ko'paytma, 3 ta → oltiburchak.
    const designName = cfg.nVar.length > 1 ? (nVar >= 3 ? 'H3' : 'P32') : r.pick(cfg.designs);
    const D = DESIGNS[designName], m = D.card.length;
    /* Variantlarda o'zgaradigan atributlar: avval qoidali (o'zgaruvchi)
       atributlar, yetmasa — o'zgarmaslar. 3 qiymatli joyga chiziqlar
       faqat 3 ta amal ruxsat etilganda tushadi. */
    let optAttrs = r.shuffle(V).concat(r.shuffle(consts)).slice(0, m);
    if (consts.length && m >= 2 && r.chance(cfg.constOpt || CONST_OPT)) optAttrs[m - 1] = r.pick(consts);
    if (D.card[0] === 3) {
      const big = optAttrs.findIndex(a => a !== 'lines' && DOM[a].length > 3);
      if (big > 0) optAttrs = [optAttrs[big]].concat(optAttrs.filter((_, i) => i !== big));
    }
    if (D.card[0] === 3 && optAttrs[0] === 'lines' && cfg.ops.length < 3) {
      optAttrs = optAttrs.slice(1).concat(optAttrs[0]);
    }

    // Chiziqlar: javob qatorining A3, B3 i oldindan (variant qiymatlari shulardan).
    let A3 = 0, B3 = 0, lineOp = null;
    const opOf = new Map();
    if (useLines) [A3, B3] = linePair(r);

    const vals = {};
    optAttrs.forEach((a, i) => {
      const need = D.card[i];
      if (a === 'lines') {
        let ops = r.shuffle(cfg.ops);
        if (cfg.xor) ops = ['xor'].concat(ops.filter(o => o !== 'xor'));
        ops = ops.slice(0, need);
        vals.lines = r.shuffle(ops.map(o => { const v = OPS[o](A3, B3); opOf.set(v, o); return v; }));
      } else {
        vals[a] = pickValues(r, a, need, lv);
      }
    });
    if (useLines && !vals.lines) lineOp = r.pick(cfg.ops);

    // Variantlarda o'zgarmaydigan atributlar uchun javob qiymati.
    const X = {};
    for (const a of all) {
      if (vals[a]) continue;
      if (a === 'lines') { X.lines = OPS[lineOp](A3, B3); continue; }
      X[a] = r.pick(DOM[a]);
    }

    const list = D.vecs.map(vec => {
      const d = Object.assign({}, mode.base);
      for (const a of all) d[a] = vals[a] ? vals[a][vec[optAttrs.indexOf(a)]] : X[a];
      return d;
    });
    const opts = r.shuffle(list);
    const correct = r.int(opts.length);           // to'plam tayyor — endi tekis tanlov
    const ans = opts[correct];

    /* Har atribut uchun panjara: javobdan orqaga, bir ma'nolilik
       tekshiruvi bilan. Muvaffaqiyatsiz bo'lsa — faqat shu atributning
       1–2-qatorlari qayta, keyin boshqa oila. Javob O'ZGARMAYDI. */
    const rules = {}, latUsed = [0, 0, 0];
    for (const a of all) {
      const x = ans[a];
      let got = null;
      if (a === 'lines') {
        const op = vals.lines ? opOf.get(x) : lineOp;
        for (let t = 0; t < 200 && !got; t++) {
          const b = buildLines(r, op, A3, B3);
          if (unique(a, b.M, x)) got = { fam: op, M: b.M };
        }
      } else {
        const tries = fam[a] === 'const' ? ['const'] : [fam[a]].concat(cfg.n === 2 ? ['row', 'col'] : ['d3', 'row']);
        for (const f of tries) {
          for (let t = 0; t < 30 && !got; t++) {
            const b = buildAttr(r, a, f, x, cfg, latUsed);
            if (!b) break;
            if (unique(a, b.M, x)) got = Object.assign({ fam: f === 'arith' ? 'arith' : f }, b);
          }
          if (got) break;
        }
      }
      if (!got) return null;
      if (got.fam === 'd3') latUsed[got.s]++;
      rules[a] = got;
    }

    const n = cfg.n;
    const cells = grid(n, (i, j) => {
      const d = Object.assign({}, mode.base);
      for (const a of all) d[a] = rules[a].M[i][j];
      return d;
    });
    const same = (p, q) => ATTRS.every(a => p[a] === q[a]);
    if (!same(cells[n - 1][n - 1], ans)) return null;   // himoya: qurilish xatosi

    const options = opts.map((o, i) => ({
      desc: o,
      viol: i === correct ? [] : ATTRS.filter(a => o[a] !== ans[a]),
    }));
    if (options.some((o, i) => i !== correct && !o.viol.length)) return null;

    const ruleList = ATTRS.filter(a => rules[a] && (rules[a].fam !== 'const' || optAttrs.includes(a)));
    const cx = ATTRS.reduce((s, a) => s + (rules[a] ? WEIGHT[rules[a].fam] : 0), 0);
    /* Qiyinlik: daraja b si + qoidalar murakkabligining shu daraja
       o'rtachasidan farqi (±0.3, shartnoma ±0.75). */
    const adj = max(-0.3, min(0.3, (cx - EXPECT_CX[lv]) * 0.1));
    const b = round((IQ.levelToB(lv) + adj) * 1000) / 1000;

    return {
      level: lv, n, mode: modeName, design: designName, k: opts.length, correct, b, cx,
      varying: V.slice().sort((p, q) => ATTRS.indexOf(p) - ATTRS.indexOf(q)),
      optAttrs, ruleList, rules, cells, answer: ans, options,
    };
  }

  /* Har darajadagi o'rtacha murakkablik (o'lchangan) — b sozlash nuqtasi. */
  const EXPECT_CX = [0, 1, 1.2, 3, 3.4, 4.3, 5.1, 5.6, 6.7, 8.4, 8.8];

  function plan(seed, level) {
    const lv = max(1, min(10, round(level)));
    const cfg = CONFIG[lv];
    // Daraja ham urug'ga qo'shiladi: bir urug' har darajada boshqa savol.
    const r = IQ.rng((seed ^ Math.imul(lv, 0x9E3779B1)) >>> 0);
    for (let t = 0; t < 30; t++) {
      const p = tryPlan(r, lv, cfg);
      if (p) return p;
    }
    throw new Error('[IQ] matrix: savol qurib bo\'lmadi (seed ' + seed + ', level ' + lv + ')');
  }

  /* ── Chizish ─────────────────────────────────────────────────────────
     Panel 100×100 lokal koordinatada. Shakl "o'lchami" — tashqi
     aylana radiusi × shakl koeffitsienti: uchburchak doiradan ko'zga
     kichik ko'rinadi, shuning uchun biroz kattaroq chiziladi (maydonlar
     tenglashuvi yarmigacha). Koeffitsientlar — vizual spetsifikatsiya,
     test ham shularni biladi. */
  const INK = '#1c1b29', GRAY = '#8a8799';
  const SF = [1, 1.32, 1.12, 1.07, 1.05];
  const SIZES = [0.55, 0.78, 1];
  const fmt = v => String(round(v * 10) / 10);
  const FILL_ATTR = ['#fff', INK, 'url(#h)'];

  /* Burchaklar (gradus, ekran — y pastga): uchburchak uchi yuqoriga
     (−90°) + 90°·rot; kvadrat tomonlari o'qlarga parallel; beshburchak
     uchi yuqoriga; oltiburchak usti tekis (beshburchakdan farqi aniq). */
  function vertices(shape, rot) {
    const nV = [0, 3, 4, 5, 6][shape];
    const a0 = [0, -90 + 90 * rot, 45, -90, 0][shape];
    const out = [];
    for (let i = 0; i < nV; i++) {
      const t = (a0 + i * 360 / nV) * PI / 180;
      out.push([cos(t), sin(t)]);
    }
    return out;
  }

  /* Joylashuv (count ta shakl) — "e" shaklning eng katta yarim o'lchami
     (savol bo'yicha bitta), markaz (50, 50). */
  function layout(count, e) {
    const s = e + 2.5, h = 0.866 * s;
    if (count === 1) return [[0, 0]];
    if (count === 2) return [[-s, 0], [s, 0]];
    if (count === 3) return [[0, -h], [-s, h], [s, h]];
    return [[-s, -s], [s, -s], [-s, s], [s, s]];
  }
  const POS = [[-21, -21], [21, -21], [21, 21], [-21, 21]];
  /* Ramkaning 8 yarim tomoni, soat mili bo'yicha chap yuqoridan. */
  const SEG = ['M7 7H50', 'M50 7H93', 'M93 7V50', 'M93 50V93', 'M93 93H50', 'M50 93H7', 'M7 93V50', 'M7 50V7'];

  function panelSvg(d, R, x, y) {
    let s = '<g transform="translate(' + x + ' ' + y + ')" stroke="' + INK + '" stroke-width="2">';
    if (d.lines) {
      let p = '';
      for (let i = 0; i < 8; i++) if (d.lines & (1 << i)) p += SEG[i];
      s += '<path d="' + p + '" fill="none" stroke-width="2.5" stroke-linecap="round"/>';
    }
    const rad = R * SIZES[d.size] * SF[d.shape];
    const centers = d.pos >= 0 ? [POS[d.pos]] : layout(d.count, R * SF[1]);
    const fill = FILL_ATTR[d.fill];
    for (const [cx0, cy0] of centers) {
      const cx = 50 + cx0, cy = 50 + cy0;
      if (d.shape === 0) {
        s += '<circle cx="' + fmt(cx) + '" cy="' + fmt(cy) + '" r="' + fmt(rad) + '" fill="' + fill + '"/>';
      } else {
        s += '<polygon points="' + vertices(d.shape, d.rot).map(([u, v]) => fmt(cx + u * rad) + ',' + fmt(cy + v * rad)).join(' ')
          + '" fill="' + fill + '"/>';
      }
    }
    return s + '</g>';
  }

  const head = (w, h) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '">'
    + '<rect width="' + w + '" height="' + h + '" fill="#fff"/>';
  /* Shtrix — faqat siyoh chiziqlar (rang emas). Kerak bo'lsagina qo'shiladi. */
  const HATCH = '<defs><pattern id="h" width="3.4" height="3.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
    + '<path d="M0 0V3.4" stroke="' + INK + '" stroke-width="1.3"/></pattern></defs>';

  /* Masshtab savol bo'yicha BITTA: panjara va hamma variantlardagi eng
     ko'p shakl soni bo'yicha. Qaysi variant to'g'ri ekaniga bog'liq emas. */
  function baseR(p) {
    if (p.mode === 'pos') return 13;
    let c = 1;
    for (const row of p.cells) for (const d of row) c = max(c, d.count);
    for (const o of p.options) c = max(c, o.desc.count);
    return c === 1 ? 25 : 14.5;
  }

  /* Kenglik doim 328 (3×3 panjara eni): ilova stimulni ekran eniga
     cho'zadi, 2×2 panjara ham shu enda bo'lsa katak 3×3 dagidek
     ko'rinadi — o'lcham qoidasida stimul va variantlar bir masshtabda
     (2×2 ni 328 ga cho'zsak, "kichik" shakl variantdagi "o'rta"dek
     ko'rinardi). Nisbat 328:220 ≈ 1.49 ≤ 1.6. */
  function stimulusSvg(p, R) {
    const n = p.n, W = 328, H = 108 * n + 4, x0 = 6 + (W - H) / 2;
    let s = head(W, H), body = '', hatched = false;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = x0 + 108 * j, y = 6 + 108 * i;
        if (i === n - 1 && j === n - 1) {
          body += '<rect x="' + x + '" y="' + y + '" width="100" height="100" rx="4" fill="#fff" stroke="' + GRAY
            + '" stroke-width="1.5" stroke-dasharray="5 4"/><text x="' + (x + 50) + '" y="' + (y + 66)
            + '" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="700" text-anchor="middle" fill="'
            + GRAY + '">?</text>';
          continue;
        }
        const d = p.cells[i][j];
        if (d.fill === 2) hatched = true;
        body += '<rect x="' + x + '" y="' + y + '" width="100" height="100" rx="4" fill="#fff" stroke="' + GRAY + '" stroke-width="1.2"/>';
        body += panelSvg(d, R, x, y);
      }
    }
    return s + (hatched ? HATCH : '') + body + '</svg>';
  }
  const optionSvg = (d, R) => head(100, 100) + (d.fill === 2 ? HATCH : '') + panelSvg(d, R, 0, 0) + '</svg>';

  /* ── Matnlar ─────────────────────────────────────────────────────────
     Uch til: uz, ru, en. Har tilda izoh bir xil tuzilishda: "X — to'g'ri
     javob." + qoidalar ("; " bilan ajratilgan — ilova har qoidani alohida
     qatorda ko'rsatadi) + har distraktor guruhi alohida jumla. Test uchala
     tildagi izohni ham rasm bilan solishtiradi. O'zbekcha matnda oʻ/gʻ —
     ʻ (U+02BB), oddiy apostrof emas. */
  const LETTERS = 'ABCDEF';
  const LANGS = ['uz', 'ru', 'en'];
  const AND = { uz: 'va', ru: 'и', en: 'and' };
  const joinL = (ls, and) => (ls.length === 1 ? ls[0] : ls.slice(0, -1).join(', ') + ' ' + and + ' ' + ls[ls.length - 1]);

  const NAME = {
    uz: { shape: 'Shakli', count: 'Soni', size: 'Oʻlchami', fill: 'Boʻyalishi', rot: 'Yoʻnalishi', pos: 'Joyi', lines: 'Chiziqlari' },
    ru: { shape: 'Форма', count: 'Количество', size: 'Размер', fill: 'Заливка', rot: 'Направление', pos: 'Положение', lines: 'Линии' },
    en: { shape: 'Shape', count: 'Count', size: 'Size', fill: 'Fill', rot: 'Direction', pos: 'Position', lines: 'Lines' },
  };
  const VALUE = {
    uz: {
      shape: ['doira', 'uchburchak', 'kvadrat', 'beshburchak', 'oltiburchak'],
      size: ['kichik', 'oʻrta', 'katta'],
      fill: ['boʻsh', 'toʻla', 'shtrixli'],
      rot: ['yuqoriga', 'oʻngga', 'pastga', 'chapga'],
      pos: ['yuqori chap', 'yuqori oʻng', 'pastki oʻng', 'pastki chap'],
    },
    ru: {
      shape: ['круг', 'треугольник', 'квадрат', 'пятиугольник', 'шестиугольник'],
      size: ['маленький', 'средний', 'большой'],
      fill: ['без заливки', 'сплошная', 'штриховка'],
      rot: ['вверх', 'вправо', 'вниз', 'влево'],
      pos: ['левый верхний', 'правый верхний', 'правый нижний', 'левый нижний'],
    },
    en: {
      shape: ['circle', 'triangle', 'square', 'pentagon', 'hexagon'],
      size: ['small', 'medium', 'large'],
      fill: ['empty', 'solid', 'hatched'],
      rot: ['up', 'right', 'down', 'left'],
      pos: ['top left', 'top right', 'bottom right', 'bottom left'],
    },
  };
  const val = (lang, a, v) => (a === 'count' ? String(v) : VALUE[lang][a][v]);
  const lower = s => s.charAt(0).toLowerCase() + s.slice(1);

  const LINE_OP = {
    uz: {
      or: 'birinchi va ikkinchi katak chiziqlari birga (qoʻshiladi)',
      sub: 'birinchi katak chiziqlaridan ikkinchida borlari ayriladi',
      xor: 'faqat bitta katakda bor chiziqlar (ikkalasida borlari oʻchadi)',
      and: 'faqat ikkala katakda ham bor chiziqlar',
    },
    ru: {
      or: 'линии первой и второй клеток вместе (сложение)',
      sub: 'линии первой клетки минус линии второй (вычитание)',
      xor: 'только линии, которые есть ровно в одной из двух клеток (общие исчезают)',
      and: 'только линии, которые есть в обеих клетках',
    },
    en: {
      or: 'the lines of the first two cells combined',
      sub: 'the lines of the first cell minus those of the second',
      xor: 'only the lines found in exactly one of the first two cells (shared lines vanish)',
      and: 'only the lines found in both of the first two cells',
    },
  };

  /* Bitta atribut qoidasi — bitta qator (izohda "; " bilan ajratiladi). */
  function ruleText(lang, a, rule, ans) {
    const N = NAME[lang][a], f = rule.fam;
    const T = (uz, ru, en) => N + ': ' + (lang === 'uz' ? uz : lang === 'ru' ? ru : en);
    if (f === 'const') {
      const v = val(lang, a, ans[a]);
      return T('hamma katakda bir xil (' + v + ')', 'во всех клетках одинаково (' + v + ')', 'the same in every cell (' + v + ')');
    }
    if (f === 'row') {
      return T('har qatorda bir xil, qatordan qatorga oʻzgaradi', 'в каждой строке одинаково, от строки к строке меняется',
        'the same within each row, changes from row to row');
    }
    if (f === 'col') return T('har ustunda bir xil', 'в каждом столбце одинаково', 'the same within each column');
    if (f === 'd3') {
      const vs = rule.T.map(v => val(lang, a, v)).join(', ');
      return T('har qatorda ' + vs + ' — har biri bir martadan', 'в каждой строке ' + vs + ' — по одному разу',
        'each row has ' + vs + ' — one of each');
    }
    if (f === 'arith') {
      const s = rule.op === 'add' ? '+' : '−';
      return T('har qatorda uchinchi katak = birinchi ' + s + ' ikkinchi', 'в каждой строке третья клетка = первая ' + s + ' вторая',
        'in each row, third cell = first ' + s + ' second');
    }
    if (f === 'prog') {
      const d = rule.d, up = d > 0;
      if (a === 'count') {
        return T('har qatorda chapdan oʻngga ' + abs(d) + ' taga ' + (up ? 'ortadi' : 'kamayadi'),
          'в каждой строке слева направо ' + (up ? 'увеличивается' : 'уменьшается') + ' на ' + abs(d),
          'in each row it goes ' + (up ? 'up' : 'down') + ' by ' + abs(d) + ' from left to right');
      }
      if (a === 'size') {
        return T('har qatorda chapdan oʻngga shakllar ' + (up ? 'kattalashadi' : 'kichrayadi'),
          'в каждой строке слева направо фигуры ' + (up ? 'увеличиваются' : 'уменьшаются'),
          'in each row the shapes get ' + (up ? 'bigger' : 'smaller') + ' from left to right');
      }
      const cw = {
        uz: up ? 'soat mili boʻyicha' : 'soat miliga teskari',
        ru: up ? 'по часовой стрелке' : 'против часовой стрелки',
        en: up ? 'clockwise' : 'counterclockwise',
      }[lang];
      if (a === 'rot') {
        return T('har qatorda har qadamda uchburchak ' + cw + ' 90° buriladi',
          'в каждой строке треугольник с каждым шагом поворачивается на 90° ' + cw,
          'in each row the triangle turns 90° ' + cw + ' at each step');
      }
      return T('har qatorda shakl har qadamda ' + cw + ' keyingi burchakka oʻtadi',
        'в каждой строке фигура с каждым шагом переходит в следующий угол ' + cw,
        'in each row the shape moves to the next corner ' + cw + ' at each step');
    }
    // chiziqlar amali
    return T('har qatorda uchinchi katak — ' + LINE_OP.uz[f], 'в каждой строке третья клетка — ' + LINE_OP.ru[f],
      'in each row the third cell shows ' + LINE_OP.en[f]);
  }

  const HEAD = {
    uz: L => L + ' — toʻgʻri javob. Qoidalar: ',
    ru: L => L + ' — правильный ответ. Правила: ',
    en: L => L + ' is correct. Rules: ',
  };
  /* Bir xil qoidani buzgan distraktorlar — bitta jumla. */
  const WRONG = {
    uz: (ls, as) => ls + ' — ' + as + ' qoidaga mos emas.',
    ru: (ls, as) => ls + ' — не подходит: ' + as + '.',
    en: (ls, as) => ls + ' — wrong ' + as + '.',
  };

  function explain(p) {
    const out = {};
    const groups = new Map();
    p.options.forEach((o, i) => {
      if (i === p.correct) return;
      const key = o.viol.join(',');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(LETTERS[i]);
    });
    for (const lang of LANGS) {
      const parts = [HEAD[lang](LETTERS[p.correct]) + p.ruleList.map(a => ruleText(lang, a, p.rules[a], p.answer)).join('; ') + '.'];
      for (const [key, ls] of groups) {
        parts.push(WRONG[lang](joinL(ls, AND[lang]), joinL(key.split(',').map(a => lower(NAME[lang][a])), AND[lang])));
      }
      out[lang] = parts.join(' ');
    }
    return out;
  }

  /* Savol qisqa (bir qator): qoida izohda. */
  const PROMPT = {
    uz: 'Boʻsh katakka qaysi rasm mos keladi?',
    ru: 'Какая картинка подходит в пустую клетку?',
    en: 'Which picture fits the empty cell?',
  };

  function generate(seed, level) {
    const p = plan(seed, level);
    const R = baseR(p);
    return {
      id: 'matrix:' + p.level + ':' + (seed >>> 0),
      type: 'matrix',
      level: p.level,
      b: p.b,
      prompt: { uz: PROMPT.uz, ru: PROMPT.ru, en: PROMPT.en },
      stimulus: { kind: 'svg', svg: stimulusSvg(p, R) },
      options: p.options.map(o => ({ kind: 'svg', svg: optionSvg(o.desc, R) })),
      correct: p.correct,
      explain: explain(p),
    };
  }

  IQ.register({
    type: 'matrix',
    label: { uz: 'Matritsalar', ru: 'Матрицы', en: 'Matrices' },
    langs: ['uz', 'ru', 'en'],
    generate,
    /* Testlar uchun: savolning ichki rejasi (qoidalar, har distraktor
       buzgan atributlar). Ilova buni ishlatmaydi. */
    plan,
  });
})(typeof window !== 'undefined' ? window : globalThis);
