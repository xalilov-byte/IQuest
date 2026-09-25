/* ─────────────────────────────────────────────────────────────────────────
   Matritsa savollari — Raven uslubidagi 3×3 panjara

   Panjarada 8 ta rasm va pastki o'ng burchakda "?" bor. Har rasm bir
   nechta ATRIBUTdan iborat (shakl, o'lcham, rang, son, joylashuv,
   yo'nalish, nurlar, tashqi shakl). Har atribut har QATORDA bitta qoida
   bo'yicha o'zgaradi:

     same   — hamma katakda bir xil (doimiy)
     const  — qator ichida bir xil, qatordan qatorga o'zgaradi
     prog   — progressiya: har qadamda +d (o'lcham, son, burchaklar soni,
              burilish)
     dist3  — "uchlik taqsimoti": har qatorda o'sha uch qiymat, tartibi har
              xil (lotin kvadrati)
     arith  — son: 3-ustun = 1-ustun + 2-ustun yoki 1-ustun − 2-ustun
     shift  — joylashuv/nurlar chekka bo'ylab suriladi (aylanadi)
     or/xor/and — ustma-ust qo'yish: 3-rasm = 1-rasm ∪ / ⊕ / ∩ 2-rasm

   ── ENG MUHIM: KONTEKSTSIZ YORLIQ (SHORTCUT) YO'Q ──────────────────────
   RAVEN dataset'idagi ma'lum xato: distraktorlar to'g'ri javobdan bittadan
   atributni o'zgartirib yasalgan. Natijada to'g'ri javob variantlar
   ichidagi "eng ko'p uchraydigan qiymatlar" yig'indisi bo'lib qoladi va
   matritsaga QARAMASDAN topiladi (I-RAVEN maqolasi shuni ko'rsatgan).

   Bu yerda tartib TESKARI: avval variantlar TO'PLAMI yasaladi, keyin
   to'g'ri javob shu to'plamdan TEKIS tasodif bilan tanlanadi, va FAQAT
   SHUNDAN KEYIN matritsa o'sha javobga olib keladigan qilib quriladi:

     1. Har "o'q" (distraktorlar farq qiladigan atribut) uchun m ta qiymat
        S_j olinadi — qaysi biri to'g'ri bo'lishini hali hech kim bilmaydi.
     2. Variantlar = kod so'zlari (CODES) bo'yicha S_j qiymatlaridan
        yig'ilgan kortejlar. Kodlar muvozanatli: har qiymat variantlarda
        teng marta uchraydi (5 variantli koddan tashqari — pastga qarang).
     3. To'g'ri kod so'zi r.int(k) bilan tanlanadi.
     4. Matritsa to'g'ri qiymatlardan ORQAGA qarab quriladi.

   Shunda variantlar to'plami (ko'r yechuvchi ko'radigan yagona narsa)
   to'g'ri javob qaysi ekanidan MUTLAQO mustaqil: har qanday ko'r strategiya
   (ko'pchilik ovozi, ozchilik, "o'rtacha qiymat", o'rgatilgan statistik
   model) aniq 1/k natija beradi. Bu shunchaki "RAVEN xatosini
   takrorlamadik" emas, balki matematik kafolat.

   Aniq bitta javob: har atribut uchun ichki "tekshiruvchi" (predictions)
   qoidalar oilasini QATORLAR VA USTUNLAR bo'yicha sinaydi. Ma'lum
   8 katakka mos keladigan HAR QANDAY qoida bir xil javobni bashorat
   qilishi shart — aks holda qatorlar qayta quriladi (javob o'zgarmaydi).
   Shunday qilib "boshqacha o'qish"da ham to'g'ri bo'lib chiqadigan
   distraktor qolmaydi.

   Test: tests/iq-matrix.test.mjs (u tekshiruvchini MUSTAQIL qayta yozgan).
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const IQ = root.IQ = root.IQ || {};

  /* ── Ranglar (CONTRACT §2): faqat shu uchtasi. Farq rangda emas,
     yorqinlik va naqshda (oq / shtrix / kulrang / qora), shuning uchun
     ranglarni ajrata olmaydigan odam ham yechadi. ── */
  const INK = '#1c1b29', GRAY = '#8a8799', BG = '#fff';

  const SHAPES6 = ['circle', 'square', 'triangle', 'diamond', 'pentagon', 'hexagon'];
  /* Kichik shakllar (radiusi ~6–12) uchun faqat to'rttasi: telefonda
     15 px kattalikdagi beshburchak bilan oltiburchakni ajratib bo'lmaydi. */
  const SHAPES4 = ['circle', 'square', 'triangle', 'diamond'];
  /* Burchaklar soni bo'yicha progressiya: 3 → 4 → 5 → 6. Romb ham 4
     burchakli, doira burchaksiz — ular bu ketma-ketlikka kirmaydi. */
  const SIDE_SHAPES = ['triangle', 'square', 'pentagon', 'hexagon'];
  /* Tashqi ramka. Uchburchak yo'q: uning ichki doirasi juda kichik,
     ichidagi shakllar sig'maydi. */
  const FRAMES = ['circle', 'square', 'diamond', 'pentagon', 'hexagon'];
  const FILLS4 = ['white', 'hatch', 'gray', 'black'];
  /* Kichik shakllarda shtrix 2–3 chiziqqa tushib qoladi va kulrangdan
     ajralmaydi — shuning uchun ularda faqat oq / kulrang / qora. */
  const FILLS3 = ['white', 'gray', 'black'];
  const SIDES = { triangle: 3, square: 4, diamond: 4, pentagon: 5, hexagon: 6 };

  /* 3×3 panjara katakchalari (qator bo'yicha 0..8). Chekka halqa soat
     mili bo'yicha; markaz (4) surilishda joyida qoladi. */
  const RING9 = [0, 1, 2, 5, 8, 7, 6, 3];
  /* Nurlar: 0 — tepaga, keyin soat mili bo'yicha har 45°. */
  const RING8 = [0, 1, 2, 3, 4, 5, 6, 7];
  /* O'yin soqqasi (zar) joylashuvlari — sanash ko'z bilan oson bo'lsin. */
  const DICE = [null, [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8],
    [0, 2, 3, 5, 6, 8], [0, 2, 3, 4, 5, 6, 8], [0, 1, 2, 3, 5, 6, 7, 8], [0, 1, 2, 3, 4, 5, 6, 7, 8]];

  /* ── Yordamchilar ── */
  const range = (a, b) => { const o = []; for (let i = a; i <= b; i++) o.push(i); return o; };
  const bit = i => 1 << i;
  const popcount = m => { let c = 0; while (m) { m &= m - 1; c++; } return c; };
  const mod = (a, n) => ((a % n) + n) % n;
  /* Koordinatalar 0.1 aniqlikda: SVG qisqa bo'ladi va baytma-bayt barqaror. */
  const f1 = x => Math.round(x * 10) / 10;
  const diceMask = n => DICE[n].reduce((m, i) => m | bit(i), 0);

  function shiftSet(mask, ring, d) {
    let out = 0;
    for (let i = 0; i < 9; i++) {
      if (!(mask & bit(i))) continue;
      const p = ring.indexOf(i);
      out |= bit(p < 0 ? i : ring[mod(p + d, ring.length)]);
    }
    return out;
  }

  function randSet(r, n, lo, hi) {
    const idx = r.shuffle(range(0, n - 1)).slice(0, r.range(lo, hi));
    return idx.reduce((m, i) => m | bit(i), 0);
  }

  /* ── Atributlar ──
     kind: 'shape' (toifa + burchaklar soni), 'cat' (toifa), 'ord' (tartibli
     indeks), 'num' (son), 'rot' (burilish, 4 ga modul), 'set' (bitmask). */
  const DEF = {
    shape6: { kind: 'shape', dom: SHAPES6 },
    shape4: { kind: 'shape', dom: SHAPES4 },
    frame:  { kind: 'shape', dom: FRAMES },
    size5:  { kind: 'ord', dom: [0, 1, 2, 3, 4] },
    size3:  { kind: 'ord', dom: [0, 1, 2] },
    fill4:  { kind: 'cat', dom: FILLS4 },
    fill3:  { kind: 'cat', dom: FILLS3 },
    rot:    { kind: 'rot', dom: [0, 1, 2, 3] },
    num5:   { kind: 'num', dom: range(1, 5) },
    num9:   { kind: 'num', dom: range(1, 9) },
    /* To'plam qiymatlari 2..5 elementli: bitta nuqta — juda oson, 6+ —
       ko'z bilan solishtirish qiyin. Qator kataklari 1..7 bo'lishi mumkin. */
    pos:    { kind: 'set', n: 9, ring: RING9, lo: 2, hi: 5, cellHi: 7 },
    spokes: { kind: 'set', n: 8, ring: RING8, lo: 2, hi: 5, cellHi: 7 },
  };

  /* Joylashuv (layout) → atribut → [ta'rif, ruxsat etilgan qoidalar].
     'same' hammasiga ruxsat. Uch qiymatli o'lchamda progressiya YO'Q:
     (0,1,2) dan boshqa qator yo'q, ya'ni javob "tepadagi katakdan
     ko'chirish" bilan topilardi. */
  const LAYOUTS = {
    C:  { shape: ['shape6', ['prog', 'dist3', 'const']], size: ['size5', ['prog', 'dist3', 'const']],
          fill: ['fill4', ['dist3', 'const']], rot: ['rot', ['prog', 'dist3']] },
    G4: { number: ['num5', ['prog', 'dist3', 'const']], shape: ['shape4', ['dist3', 'const']],
          size: ['size3', ['dist3', 'const']], fill: ['fill3', ['dist3', 'const']] },
    G9: { number: ['num9', ['prog', 'dist3', 'const', 'arith']], shape: ['shape4', ['dist3', 'const']],
          size: ['size3', ['dist3', 'const']], fill: ['fill3', ['dist3', 'const']] },
    P9: { pos: ['pos', ['shift', 'dist3', 'or', 'and', 'xor']], shape: ['shape4', ['dist3', 'const']],
          size: ['size3', ['dist3', 'const']], fill: ['fill3', ['dist3', 'const']] },
    W:  { spokes: ['spokes', ['shift', 'dist3', 'or', 'and', 'xor']], shape: ['shape4', ['dist3', 'const']],
          size: ['size3', ['dist3', 'const']], fill: ['fill3', ['dist3', 'const']] },
    FC: { frame: ['frame', ['dist3', 'const']], shape: ['shape4', ['dist3', 'const']],
          size: ['size3', ['dist3', 'const']], fill: ['fill4', ['dist3', 'const']] },
    FD: { frame: ['frame', ['dist3', 'const']], number: ['num5', ['prog', 'dist3', 'arith']],
          shape: ['shape4', ['dist3', 'const']], fill: ['fill3', ['dist3', 'const']] },
    FP: { frame: ['frame', ['dist3', 'const']], pos: ['pos', ['shift', 'dist3', 'or', 'and', 'xor']],
          shape: ['shape4', ['dist3', 'const']], fill: ['fill3', ['dist3', 'const']] },
  };
  /* "Og'ir" qoida (arifmetika, ustma-ust qo'yish) qo'llanadigan atribut. */
  const PRIMARY = { G9: 'number', P9: 'pos', W: 'spokes', FD: 'number', FP: 'pos' };

  /* ── Variant kodlari ──
     Har qator — bitta variant, har ustun — bitta "o'q" (atribut), raqam —
     shu atributning S_j ichidagi qiymat indeksi. To'g'ri javob kod
     so'zlaridan tekis tanlanadi, shuning uchun ko'r yechuvchiga hech narsa
     qolmaydi. Muvozanat (har qiymat teng uchrashi) — ortiqcha sug'urta:
     ko'pchilik ovozi hamma variantga bir xil ball beradi.
     5:3 — 5 toq son, ikkilik atributlarda to'liq muvozanat mumkin emas;
     lekin to'g'ri javob baribir tekis tanlanadi, demak kafolat saqlanadi
     (testda ko'pchilik/ozchilik ovozi ham 1/5 atrofida). */
  const CODES = {
    '4:1': [[0], [1], [2], [3]],
    '4:2': [[0, 0], [0, 1], [1, 0], [1, 1]],
    '5:3': [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 0], [1, 1, 1]],
    '6:3': [[0, 0, 1], [0, 1, 0], [0, 1, 1], [1, 0, 0], [1, 0, 1], [1, 1, 0]],
    '6:4': [[1, 1, 0, 0], [1, 0, 1, 0], [1, 0, 0, 1], [0, 1, 1, 0], [0, 1, 0, 1], [0, 0, 1, 1]],
  };

  /* ── Daraja → reja ──
     Daraja oshgani sari: o'zgaruvchi atributlar soni (1,1,2,3,3,3,3,4,4,4),
     qoida turlari (prog → dist3 → arith/shift → or/and/xor), variantlar
     soni (4,4,4,5,5,6,…), distraktorlarning "yaqinligi" (5+ darajada
     qo'shni qiymatlar) va progressiya qadami (8+ da ±2 ham). */
  const SOFT = ['prog', 'dist3'];
  const HARD = {
    6:  { num: ['arith'], set: ['shift', 'or', 'and'] },
    7:  { num: ['arith'], set: ['xor', 'xor', 'or', 'and'] },
    8:  { num: ['arith', 'prog', 'dist3'], set: ['shift', 'or', 'and', 'xor', 'dist3'] },
    9:  { num: ['arith'], set: ['xor', 'or', 'and', 'shift'] },
    10: { num: ['arith'], set: ['xor', 'xor', 'and'] },
  };
  const LEVEL_LAYOUTS = {
    6: ['G9', 'P9', 'W', 'FD'],
    7: ['G9', 'P9', 'W', 'FD', 'FP'],
    8: ['G9', 'P9', 'W', 'FC', 'FD', 'FP'],
    9: ['G9', 'P9', 'W', 'FD', 'FP'],
    10: ['G9', 'P9', 'W', 'FD', 'FP'],
  };

  const allowed = (layout, key, pool) => LAYOUTS[layout][key][1].filter(x => pool.indexOf(x) >= 0);

  function makePlan(level, r) {
    const P = { level, near: level >= 5, steps: level >= 8 ? [1, 2] : [1] };
    const vary = [];   // [key, rule]
    let layout, code;

    if (level === 1) {
      /* Burchaklar progressiyasi faqat 4 qiymatli (3..6): chetdagi javobda
         "tepadagi katakni ko'chirish"dan boshqa bir ma'noli matritsa
         chiqmaydi. Shuning uchun 1-darajada o'lcham (5 qiymat) va son
         (1..5) ko'proq. */
      layout = r.pick(['C', 'C', 'G4', 'G4']);
      vary.push(layout === 'C' ? [r.pick(['size', 'size', 'shape']), 'prog'] : ['number', 'prog']);
      code = '4:2';
    } else if (level === 2) {
      layout = r.pick(['C', 'C', 'G4', 'G9']);
      const key = r.pick(Object.keys(LAYOUTS[layout]));
      vary.push([key, r.pick(allowed(layout, key, SOFT))]);
      code = r.chance(0.5) ? '4:1' : '4:2';
    } else if (level <= 5) {
      layout = r.pick(level === 5 ? ['C', 'G4', 'G9', 'FC'] : ['C', 'G4', 'G9']);
      let keys;
      if (layout === 'C') {
        /* Burilish faqat uchburchakda ko'rinadi (kvadrat 90° da o'zgarmaydi,
           kvadrat 45° da rombga aylanadi). Shuning uchun burilish bo'lsa,
           shakl doimiy uchburchak. */
        keys = r.shuffle(r.chance(0.25) ? ['size', 'fill', 'rot'] : ['shape', 'size', 'fill']);
      } else {
        keys = r.shuffle(Object.keys(LAYOUTS[layout]));
      }
      const n = level === 3 ? 2 : 3;
      keys = keys.slice(0, n);
      if (level === 4) {
        /* 4-daraja: ikki "yumshoq" qoida + bitta "qator ichida doimiy". */
        const ci = keys.findIndex(k => LAYOUTS[layout][k][1].indexOf('const') >= 0);
        keys.forEach((k, i) => vary.push([k, i === ci ? 'const' : r.pick(allowed(layout, k, SOFT))]));
      } else {
        keys.forEach(k => vary.push([k, r.pick(allowed(layout, k, SOFT))]));
      }
      code = level === 3 ? '4:2' : '5:3';
    } else {
      layout = r.pick(LEVEL_LAYOUTS[level]);
      const prim = PRIMARY[layout];
      const others = r.shuffle(Object.keys(LAYOUTS[layout]).filter(k => k !== prim));
      const n = level <= 7 ? 3 : 4;
      const keys = (prim ? [prim] : []).concat(others).slice(0, n);
      keys.forEach(k => {
        let rule;
        if (k === prim) rule = r.pick(HARD[level][DEF[LAYOUTS[layout][k][0]].kind === 'set' ? 'set' : 'num']);
        else rule = level === 10 ? 'dist3' : r.pick(allowed(layout, k, SOFT));
        vary.push([k, rule]);
      });
      code = n === 3 ? '6:3' : '6:4';
    }

    /* Atributlar ro'yxati: o'zgaradiganlari + qolganlari 'same'. */
    const useRot = vary.some(v => v[0] === 'rot');
    const attrs = [];
    for (const key of Object.keys(LAYOUTS[layout])) {
      if (key === 'rot' && !useRot) continue;
      const v = vary.find(x => x[0] === key);
      const rule = { name: v ? v[1] : 'same' };
      if (rule.name === 'arith') rule.op = r.pick(['add', 'sub']);
      attrs.push({ key, def: DEF[LAYOUTS[layout][key][0]], rule, axis: -1, fixed: null });
      if (key === 'shape' && useRot) attrs[attrs.length - 1].fixed = 'triangle';
    }

    /* O'qlar: distraktorlar farq qiladigan atributlar. */
    let axes = vary.map(v => v[0]);
    if (code === '4:1') {
      const a = attrs.find(x => x.key === axes[0]);
      if (feasible(a.def, a.rule, P).length < 4) code = '4:2';
    }
    const width = CODES[code][0].length;
    if (axes.length < width) {
      /* 1-2 darajada bitta qoida bor; ikkinchi o'q — doimiy atribut
         (distraktor "hamma katakda bir xil" qoidasini buzadi). */
      const same = r.shuffle(attrs.filter(a => a.rule.name === 'same' && !a.fixed && a.def.kind !== 'set' && a.def.kind !== 'rot'));
      axes = axes.concat(same.slice(0, width - axes.length).map(a => a.key));
    }
    axes = r.shuffle(axes.slice(0, width));
    axes.forEach((key, j) => { attrs.find(a => a.key === key).axis = j; });

    P.layout = layout;
    P.code = code;
    P.k = CODES[code].length;
    P.attrs = attrs;
    return P;
  }

  /* ── Qoidaga mos keladigan javob qiymatlari ──
     S_j shu ro'yxatdan olinadi. Ro'yxat qoidaga bog'liq, lekin to'g'ri
     javobga bog'liq EMAS — shuning uchun variantlar to'plami javobdan
     mustaqil bo'lib qoladi. Har qiymatdan matritsa qurish mumkinligi
     kafolatlangan. */
  function feasible(def, rule, P) {
    if (rule.name === 'prog' && def.kind !== 'rot') {
      const F = def.kind === 'shape' ? SIDE_SHAPES : def.dom;
      /* Qiymat 3-ustunda turishi uchun c − 2d ham diapazonda bo'lishi kerak. */
      return F.filter((v, i) => P.steps.some(s => i - 2 * s >= 0 || i + 2 * s < F.length));
    }
    if (rule.name === 'arith') {
      const N = def.dom[def.dom.length - 1];
      return rule.op === 'add' ? def.dom.filter(v => v >= 2) : def.dom.filter(v => v <= N - 1);
    }
    return def.dom;
  }

  /* m ta har xil qiymat, tasodifiy tartibda. 5+ darajada tartibli
     atributlar uchun "qo'shni" qiymatlar oynasi (masalan 5 va 6 nuqta) —
     farqni sezish uchun diqqat kerak. To'plamlar uchun: bitta asos
     to'plamdan har xil BITTA elementni almashtirib olingan variantlar;
     ular o'zaro teng masofada, shuning uchun "o'rtadagisi" yo'q. */
  function sampleValues(def, rule, m, P, r) {
    if (def.kind === 'set') {
      for (;;) {
        const base = randSet(r, def.n, def.lo + 1, def.hi - 1);
        const vars = r.shuffle(range(0, def.n - 1)).map(i => base ^ bit(i))
          .filter(s => popcount(s) >= def.lo && popcount(s) <= def.hi);
        if (vars.length >= m) return vars.slice(0, m);
      }
    }
    const F = feasible(def, rule, P);
    const ordered = def.kind === 'ord' || def.kind === 'num' || def.kind === 'rot' ||
      (def.kind === 'shape' && rule.name === 'prog');
    let vals;
    if (P.near && ordered && F.length > m) {
      if (def.kind === 'rot') { const s = r.int(4); vals = range(0, m - 1).map(i => F[(s + i) % 4]); }
      else { const s = r.int(F.length - m + 1); vals = F.slice(s, s + m); }
    } else {
      vals = r.shuffle(F).slice(0, m);
    }
    return r.shuffle(vals);
  }

  /* ── Matritsani javobdan orqaga qurish ──
     c — (3,3) katak qiymati. alts — shu atributning boshqa variant
     qiymatlari: dist3 da ular matritsaga ham qo'yiladi, shunda
     "matritsada uchramaydigan qiymatli variantni tashla" degan hiyla
     ishlamaydi. */
  function buildGrid(a, c, alts, P, r) {
    const def = a.def, rule = a.rule;
    const rnd = () => (def.kind === 'set' ? randSet(r, def.n, def.lo, def.hi) : r.pick(def.dom));
    const rows = (x, y, z) => [x, y, z];
    switch (rule.name) {
      case 'same': return [rows(c, c, c), rows(c, c, c), rows(c, c, c)];
      case 'const': {
        let v1, v2;
        do { v1 = rnd(); v2 = rnd(); } while (v1 === c && v2 === c);
        return [rows(v1, v1, v1), rows(v2, v2, v2), rows(c, c, c)];
      }
      case 'prog': {
        if (def.kind === 'rot') {
          const d = r.pick([1, -1]); rule.d = d;
          const row = s => rows(s, mod(s + d, 4), mod(s + 2 * d, 4));
          return [row(r.int(4)), row(r.int(4)), row(mod(c - 2 * d, 4))];
        }
        const F = def.kind === 'shape' ? SIDE_SHAPES : def.dom;
        const ci = F.indexOf(c), n = F.length;
        const ds = [];
        for (const s of P.steps) for (const d of [s, -s]) if (ci - 2 * d >= 0 && ci - 2 * d < n) ds.push(d);
        const d = r.pick(ds); rule.d = d;
        const starts = range(0, n - 1).filter(s => s + 2 * d >= 0 && s + 2 * d < n);
        const row = s => rows(F[s], F[s + d], F[s + 2 * d]);
        return [row(r.pick(starts)), row(r.pick(starts)), row(ci - 2 * d)];
      }
      case 'dist3': {
        const vals = [c];
        for (const v of r.shuffle(alts)) if (vals.length < 3 && vals.indexOf(v) < 0) vals.push(v);
        while (vals.length < 3) { const v = rnd(); if (vals.indexOf(v) < 0) vals.push(v); }
        /* Tasodifiy lotin kvadrati: L[i][j] = (x_i + y_j) mod 3. 3×3 dagi
           12 ta lotin kvadratining hammasi shu ko'rinishga keladi. */
        const x = r.shuffle([0, 1, 2]), y = r.shuffle([0, 1, 2]);
        const s22 = (x[2] + y[2]) % 3;
        const rest = r.shuffle([vals[1], vals[2]]);
        const map = {}; map[s22] = c; map[(s22 + 1) % 3] = rest[0]; map[(s22 + 2) % 3] = rest[1];
        return [0, 1, 2].map(i => [0, 1, 2].map(j => map[(x[i] + y[j]) % 3]));
      }
      case 'arith': {
        const N = def.dom[def.dom.length - 1];
        const row = t => {
          if (rule.op === 'add') {
            const p = t == null ? r.range(1, N - 1) : r.range(1, t - 1);
            const q = t == null ? r.range(1, N - p) : t - p;
            return rows(p, q, p + q);
          }
          const q = t == null ? r.range(1, N - 1) : r.range(1, N - t);
          const p = t == null ? r.range(q + 1, N) : t + q;
          return rows(p, q, p - q);
        };
        return [row(null), row(null), row(c)];
      }
      case 'shift': {
        const d = r.pick(P.steps.length > 1 ? [1, -1, 2, -2] : [1, -1]); rule.d = d;
        const row = s => rows(s, shiftSet(s, def.ring, d), shiftSet(s, def.ring, 2 * d));
        return [row(rnd()), row(rnd()), row(shiftSet(c, def.ring, -2 * d))];
      }
      case 'or': case 'and': case 'xor': {
        const full = bit(def.n) - 1;
        const row = t => {
          const T = t == null ? rnd() : t;
          for (;;) {
            let A = 0, B = 0;
            if (rule.name === 'or') {
              /* Har element: faqat A da, faqat B da yoki ikkalasida. */
              for (let i = 0; i < def.n; i++) {
                if (!(T & bit(i))) continue;
                const w = r.int(3);
                if (w !== 1) A |= bit(i);
                if (w !== 0) B |= bit(i);
              }
            } else if (rule.name === 'and') {
              A = T; B = T;
              for (let i = 0; i < def.n; i++) {
                if (T & bit(i)) continue;
                const w = r.int(3);
                if (w === 0) A |= bit(i); else if (w === 1) B |= bit(i);
              }
            } else {
              A = randSet(r, def.n, 1, def.cellHi);
              B = (A ^ T) & full;
            }
            if (A && B && A !== B && popcount(A) <= def.cellHi && popcount(B) <= def.cellHi) return rows(A, B, T);
          }
        };
        return [row(null), row(null), row(c)];
      }
    }
    throw new Error('[matrix] noma\'lum qoida: ' + rule.name);
  }

  /* ── Tekshiruvchi: "boshqacha o'qish" bormi? ──
     Kuzatiladigan har atribut uchun qoidalar oilasi qatorlar VA ustunlar
     bo'yicha sinaladi. Ma'lum 8 katakka mos kelgan har qoida (3,3) uchun
     bashorat beradi. Hammasi to'g'ri javobga teng bo'lishi shart.
     Hosila atributlar ham tekshiriladi: zar joylashuvi (nuqtalar soni →
     naqsh) va to'plamdagi elementlar soni — odam ularga ham qarashi
     mumkin. */
  const KIND = { shape: 'shape', frame: 'shape', fill: 'cat', size: 'ord', rot: 'rot',
    number: 'num', count: 'num', pos: 'set9', spokes: 'set8' };
  const LINE_RULES = {};
  function lineRules(kind) {
    if (LINE_RULES[kind]) return LINE_RULES[kind];
    const R = [(a, b) => (a === b ? a : null)];
    if (kind === 'ord' || kind === 'num' || kind === 'sides') {
      for (let d = -8; d <= 8; d++) if (d) R.push((a, b) => (b - a === d ? b + d : null));
    }
    if (kind === 'num') {
      R.push((a, b) => a + b, (a, b) => (a - b > 0 ? a - b : null), (a, b) => (b - a > 0 ? b - a : null));
    }
    if (kind === 'rot') for (const d of [1, 2, 3]) R.push((a, b) => (mod(b - a, 4) === d ? mod(b + d, 4) : null));
    if (kind === 'set9' || kind === 'set8') {
      const ring = kind === 'set9' ? RING9 : RING8;
      for (const d of [1, -1, 2, -2, 3, -3]) {
        R.push((a, b) => (b === shiftSet(a, ring, d) ? shiftSet(b, ring, d) : null));
      }
      R.push((a, b) => a | b, (a, b) => a & b, (a, b) => a ^ b, (a, b) => a & ~b, (a, b) => b & ~a);
    }
    return (LINE_RULES[kind] = R);
  }

  function predictions(kind, g) {
    const out = [];
    const views = [g, [0, 1, 2].map(j => [g[0][j], g[1][j], g[2][j]])];
    for (const L of views) {
      for (const f of lineRules(kind)) {
        const p0 = f(L[0][0], L[0][1]); if (p0 === null || p0 !== L[0][2]) continue;
        const p1 = f(L[1][0], L[1][1]); if (p1 === null || p1 !== L[1][2]) continue;
        const p2 = f(L[2][0], L[2][1]); if (p2 !== null) out.push(p2);
      }
      /* Har qatorda bir xil qiymatlar to'plami (multiset) → yetishmagani. */
      const k0 = L[0].slice().sort().join('|'), k1 = L[1].slice().sort().join('|');
      if (k0 === k1) {
        const rest = L[0].slice();
        let ok = true;
        for (const v of [L[2][0], L[2][1]]) { const i = rest.indexOf(v); if (i < 0) { ok = false; break; } rest.splice(i, 1); }
        if (ok) out.push(rest[0]);
      }
    }
    return out;
  }

  /* Katak → kuzatiladigan atributlar (asosiy + hosila). */
  function observe(layout, p) {
    const o = Object.assign({}, p);
    if (layout === 'G4' || layout === 'G9' || layout === 'FD') o.pos = diceMask(p.number);
    if (layout === 'P9' || layout === 'FP') o.count = popcount(p.pos);
    if (layout === 'W') o.count = popcount(p.spokes);
    return o;
  }

  function ambiguous(layout, cells) {
    const obs = cells.map(row => row.map(p => observe(layout, p)));
    const c = obs[2][2];
    for (const key of Object.keys(c)) {
      const g = obs.map(row => row.map(p => p[key]));
      if (predictions(KIND[key], g).some(p => p !== c[key])) return true;
      if (KIND[key] === 'shape') {
        /* Burchaklar soni progressiyasi (doira burchaksiz — qatnashmaydi). */
        const sg = g.map(row => row.map(v => SIDES[v] || 0));
        if (sg.every((row, i) => row.every((v, j) => v || (i === 2 && j === 2)))) {
          if (predictions('sides', sg).some(p => p !== SIDES[c[key]])) return true;
        }
      }
    }
    return false;
  }

  /* ── Chizish ── */
  const PAINT = { white: 'fill="' + BG + '"', gray: 'fill="' + GRAY + '"', black: 'fill="' + INK + '"', hatch: 'fill="url(#zh)"' };
  /* Shtrix — ichki <pattern> (tashqi havola emas). Oq fon + qiya qora
     chiziqlar: kulrangdan naqshi bilan, qoradan yorqinligi bilan farq qiladi. */
  const DEFS = '<defs><pattern id="zh" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
    '<rect width="6" height="6" fill="' + BG + '"/><rect width="2.2" height="6" fill="' + INK + '"/></pattern></defs>';

  function ngon(cx, cy, R, n, start) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (start + i * 360 / n) * Math.PI / 180;
      pts.push(f1(cx + R * Math.cos(a)) + ',' + f1(cy + R * Math.sin(a)));
    }
    return pts.join(' ');
  }

  /* r — shaklning "ko'rinma radiusi". Koeffitsientlar shakllar bir xil
     o'lchamda ko'z bilan teng ko'rinishi uchun tanlangan (uchburchak
     maydoni kichikroq, shuning uchun kattaroq radius). */
  function entity(shape, cx, cy, r, fill, rot, sw) {
    const paint = PAINT[fill] + ' stroke="' + INK + '" stroke-width="' + sw + '" stroke-linejoin="round"';
    switch (shape) {
      case 'circle': return '<circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + f1(r * 0.92) + '" ' + paint + '/>';
      case 'square': {
        const h = r * 0.8;
        return '<rect x="' + f1(cx - h) + '" y="' + f1(cy - h) + '" width="' + f1(2 * h) + '" height="' + f1(2 * h) + '" ' + paint + '/>';
      }
      case 'diamond':
        return '<polygon points="' + [[0, -1.1], [0.78, 0], [0, 1.1], [-0.78, 0]]
          .map(v => f1(cx + v[0] * r) + ',' + f1(cy + v[1] * r)).join(' ') + '" ' + paint + '/>';
      case 'triangle': return '<polygon points="' + ngon(cx, cy, r * 1.15, 3, -90 + 90 * (rot || 0)) + '" ' + paint + '/>';
      case 'pentagon': return '<polygon points="' + ngon(cx, cy, r * 1.02, 5, -90) + '" ' + paint + '/>';
      case 'hexagon': return '<polygon points="' + ngon(cx, cy, r * 0.98, 6, -90) + '" ' + paint + '/>';
    }
    throw new Error('[matrix] noma\'lum shakl: ' + shape);
  }

  function frameEl(shape) {
    const st = ' fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"';
    switch (shape) {
      case 'circle': return '<circle cx="50" cy="50" r="44"' + st + '/>';
      case 'square': return '<rect x="12" y="12" width="76" height="76"' + st + '/>';
      case 'diamond': return '<polygon points="50,5 95,50 50,95 5,50"' + st + '/>';
      case 'pentagon': return '<polygon points="' + ngon(50, 52, 46, 5, -90) + '"' + st + '/>';
      case 'hexagon': return '<polygon points="' + ngon(50, 50, 45, 6, -90) + '"' + st + '/>';
    }
    throw new Error('[matrix] noma\'lum ramka: ' + shape);
  }

  /* Geometriya 100×100 katak uchun. Stimul panjarasida katak ~100 px
     (360 px ekranda), shuning uchun chiziq 2–2.6 birlik ≈ 2–2.6 px. */
  const GEO = {
    C:  { r: [14, 19.5, 25, 30.5, 36], sw: 2.6 },
    G4: { lat: [25, 50, 75], r: [7.5, 10.5, 13.5], sw: 2.2 },
    G9: { lat: [20, 50, 80], r: [6.5, 9, 11.5], sw: 2 },
    P9: { lat: [20, 50, 80], r: [6.5, 9, 11.5], sw: 2 },
    W:  { r: [7, 10, 13], sw: 2, s1: 19, s2: 44 },
    FC: { r: [10, 14.5, 19], sw: 2.3 },
    FD: { lat: [36, 50, 64], r: [5.5], sw: 1.8 },
    FP: { lat: [35, 50, 65], r: [5.5], sw: 1.8 },
  };

  function panelSvg(layout, p) {
    const g = GEO[layout];
    const sz = p.size === undefined ? 0 : p.size;
    let s = '';
    if (p.frame !== undefined) s += frameEl(p.frame);
    switch (layout) {
      case 'C': case 'FC':
        return s + entity(p.shape, 50, 50, g.r[sz], p.fill, p.rot, g.sw);
      case 'G4': case 'G9': case 'FD':
        for (const i of DICE[p.number]) s += entity(p.shape, g.lat[i % 3], g.lat[(i / 3) | 0], g.r[sz], p.fill, 0, g.sw);
        return s;
      case 'P9': case 'FP':
        /* Bo'sh o'rinlarda xira nuqta: odam 3×3 panjarani ko'radi va
           "qaysi katakda bor/yo'q" (ustma-ust qo'yish, surilish) ni
           solishtira oladi. Nuqta shakldan ancha kichik va konturisiz —
           kulrang shakl bilan adashtirilmaydi. */
        for (let i = 0; i < 9; i++) {
          const x = g.lat[i % 3], y = g.lat[(i / 3) | 0];
          s += p.pos & bit(i) ? entity(p.shape, x, y, g.r[sz], p.fill, 0, g.sw)
            : '<circle cx="' + x + '" cy="' + y + '" r="1.6" fill="' + GRAY + '"/>';
        }
        return s;
      case 'W': {
        let d = '';
        for (let i = 0; i < 8; i++) {
          if (!(p.spokes & bit(i))) continue;
          const a = i * Math.PI / 4, sx = Math.sin(a), sy = -Math.cos(a);
          d += 'M' + f1(50 + g.s1 * sx) + ' ' + f1(50 + g.s1 * sy) + 'L' + f1(50 + g.s2 * sx) + ' ' + f1(50 + g.s2 * sy);
        }
        return '<path d="' + d + '" fill="none" stroke="' + INK + '" stroke-width="4.5" stroke-linecap="round"/>' +
          entity(p.shape, 50, 50, g.r[sz], p.fill, 0, g.sw);
      }
    }
    throw new Error('[matrix] noma\'lum joylashuv: ' + layout);
  }

  const SVG_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="';
  /* Katak ramkasi — matritsada ham, variantda ham AYNAN bir xil. Ilova
     variantni stimul katagidan boshqa masshtabda ko'rsatishi mumkin
     (masalan 4 variant bir qatorda); shunda o'lchamni ko'z mutlaq
     piksel bilan emas, ramkaga nisbatan solishtiradi va "o'lcham"
     qoidasi buzilmaydi. */
  const CELL = '<rect x="1" y="1" width="98" height="98" rx="6" fill="' + BG + '" stroke="' + GRAY + '" stroke-width="1.5"/>';

  function optionSvg(layout, p) {
    const body = panelSvg(layout, p);
    return SVG_OPEN + '0 0 100 100"><rect width="100" height="100" fill="' + BG + '"/>' +
      (body.indexOf('url(#zh)') >= 0 ? DEFS : '') + CELL + body + '</svg>';
  }

  /* Stimul: 3×3, katak 100, oraliq 8 → 320×320 (kvadrat, telefon uchun
     eni/bo'yi = 1 ≤ 1.6). */
  function stimulusSvg(layout, cells) {
    const SIZE = 320, PAD = 2, STEP = 108;
    let body = '';
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const t = '<g transform="translate(' + (PAD + j * STEP) + ' ' + (PAD + i * STEP) + ')">';
        if (i === 2 && j === 2) {
          body += t + '<rect x="1" y="1" width="98" height="98" rx="6" fill="' + BG + '" stroke="' + GRAY +
            '" stroke-width="2" stroke-dasharray="7 5"/><text x="50" y="67" text-anchor="middle" ' +
            'font-family="sans-serif" font-size="48" font-weight="700" fill="' + GRAY + '">?</text></g>';
        } else {
          body += t + CELL + panelSvg(layout, cells[i][j]) + '</g>';
        }
      }
    }
    return SVG_OPEN + '0 0 ' + SIZE + ' ' + SIZE + '"><rect width="' + SIZE + '" height="' + SIZE + '" fill="' + BG + '"/>' +
      (body.indexOf('url(#zh)') >= 0 ? DEFS : '') + body + '</svg>';
  }

  /* ── Matn (uz / ru) ── */
  const NAMES = {
    shape:  { uz: 'shakl', ru: 'форма' },
    size:   { uz: "oʻlcham", ru: 'размер' },
    fill:   { uz: 'rang', ru: 'заливка' },
    rot:    { uz: "yoʻnalish", ru: 'направление' },
    number: { uz: 'shakllar soni', ru: 'количество фигур' },
    pos:    { uz: 'shakllar joylashuvi', ru: 'расположение фигур' },
    spokes: { uz: 'nurlar', ru: 'лучи' },
    frame:  { uz: 'tashqi shakl', ru: 'внешняя фигура' },
  };
  const INNER_NAMES = {
    shape:  { uz: 'ichki shakl', ru: 'внутренняя фигура' },
    size:   { uz: "ichki shakl oʻlchami", ru: 'размер внутренней фигуры' },
    fill:   { uz: 'ichki shakl rangi', ru: 'заливка внутренней фигуры' },
    number: { uz: 'ichidagi shakllar soni', ru: 'количество фигур внутри' },
    pos:    { uz: 'ichidagi shakllar joylashuvi', ru: 'расположение фигур внутри' },
  };
  const HUB_NAMES = {
    shape: { uz: 'markazdagi shakl', ru: 'фигура в центре' },
    size:  { uz: "markazdagi shakl oʻlchami", ru: 'размер фигуры в центре' },
    fill:  { uz: 'markazdagi shakl rangi', ru: 'заливка фигуры в центре' },
  };
  function attrName(layout, key) {
    if (layout === 'W' && HUB_NAMES[key]) return HUB_NAMES[key];
    if (layout[0] === 'F' && INNER_NAMES[key]) return INNER_NAMES[key];
    return NAMES[key];
  }

  const VN = {
    shape: { circle: ['doira', 'круг'], square: ['kvadrat', 'квадрат'], triangle: ['uchburchak', 'треугольник'],
      diamond: ['romb', 'ромб'], pentagon: ['beshburchak', 'пятиугольник'], hexagon: ['oltiburchak', 'шестиугольник'] },
    fill: { white: ['oq', 'белая'], hatch: ['shtrixli', 'штриховка'], gray: ['kulrang', 'серая'], black: ['qora', 'чёрная'] },
    size5: [['juda kichik', 'очень маленький'], ['kichik', 'маленький'], ["oʻrtacha", 'средний'], ['katta', 'большой'], ['juda katta', 'очень большой']],
    size3: [['kichik', 'маленький'], ["oʻrtacha", 'средний'], ['katta', 'большой']],
    rot: [['uchi tepaga', 'вершиной вверх'], ["uchi oʻngga", 'вершиной вправо'], ['uchi pastga', 'вершиной вниз'], ['uchi chapga', 'вершиной влево']],
  };
  function valName(a, v) {
    let t;
    if (a.key === 'shape' || a.key === 'frame') t = VN.shape[v];
    else if (a.key === 'fill') t = VN.fill[v];
    else if (a.key === 'size') t = (a.def.dom.length === 5 ? VN.size5 : VN.size3)[v];
    else if (a.key === 'rot') t = VN.rot[v];
    else if (a.def.kind === 'num') t = [String(v), String(v)];
    return t ? { uz: t[0], ru: t[1] } : null;
  }

  function ruleText(P, a, cells) {
    const N = attrName(P.layout, a.key);
    const V = v => valName(a, v);
    const c = a.c, rule = a.rule;
    const row3 = [cells[2][0][a.key], cells[2][1][a.key], c];
    const seq = lang => row3.map(v => V(v)[lang]).join(' → ');
    const el = a.key === 'spokes' ? { uz: 'nurlar', ru: 'лучи' } : { uz: 'shakllar', ru: 'фигуры' };
    switch (rule.name) {
      case 'same':
        return { uz: N.uz + ': hamma katakda bir xil — ' + V(c).uz + '.',
                 ru: N.ru + ': во всех клетках одинаково — ' + V(c).ru + '.' };
      case 'const':
        return { uz: N.uz + ": qator ichida oʻzgarmaydi, qatordan qatorga almashadi; 3-qatorda — " + V(c).uz + '.',
                 ru: N.ru + ': внутри строки не меняется, от строки к строке меняется; в 3-й строке — ' + V(c).ru + '.' };
      case 'prog': {
        const d = rule.d, k = Math.abs(d), up = d > 0;
        let uz, ru;
        if (a.key === 'size') {
          uz = N.uz + ': har qatorda chapdan oʻngga ' + (k === 1 ? 'bir' : 'ikki') + " pogʻonadan " + (up ? 'kattalashadi' : 'kichrayadi');
          ru = N.ru + ': в каждой строке слева направо ' + (up ? 'увеличивается' : 'уменьшается') + ' на ' + (k === 1 ? 'одну ступень' : 'две ступени');
        } else if (a.key === 'rot') {
          uz = N.uz + ': har qatorda uchburchak 90° ' + (up ? "soat mili boʻyicha" : 'soat miliga teskari') + ' buriladi';
          ru = N.ru + ': в каждой строке треугольник поворачивается на 90° ' + (up ? 'по часовой стрелке' : 'против часовой стрелки');
        } else if (a.def.kind === 'shape') {
          uz = N.uz + ': har qatorda burchaklar soni ' + (k === 1 ? 'bittaga' : 'ikkitaga') + ' ' + (up ? 'oshadi' : 'kamayadi');
          ru = N.ru + ': в каждой строке число углов ' + (up ? 'растёт' : 'уменьшается') + ' на ' + (k === 1 ? 'один' : 'два');
        } else {
          uz = N.uz + ': har qatorda chapdan oʻngga ' + k + ' taga ' + (up ? "koʻpayadi" : 'kamayadi');
          ru = N.ru + ': в каждой строке слева направо ' + (up ? 'увеличивается' : 'уменьшается') + ' на ' + k;
        }
        return { uz: uz + ' (3-qator: ' + seq('uz') + ').', ru: ru + ' (3-я строка: ' + seq('ru') + ').' };
      }
      case 'dist3': {
        if (a.def.kind === 'set') {
          return { uz: N.uz + ": har qatorda oʻsha uchta naqsh bittadan uchraydi, faqat tartibi boshqa; 3-qatorda yetishmagani — javob.",
                   ru: N.ru + ': в каждой строке по одному разу встречаются одни и те же три узора; ответ — тот, которого не хватает в 3-й строке.' };
        }
        const vals = a.grid[0].slice().sort((x, y) => a.def.dom.indexOf(x) - a.def.dom.indexOf(y));
        const list = lang => vals.slice(0, 2).map(v => V(v)[lang]).join(', ') + (lang === 'uz' ? ' va ' : ' и ') + V(vals[2])[lang];
        return { uz: N.uz + ': har qatorda ' + list('uz') + ' bittadan uchraydi, faqat tartibi boshqa; 3-qatorda ' + V(c).uz + ' yetishmaydi.',
                 ru: N.ru + ': в каждой строке по одному разу встречаются ' + list('ru') + ', меняется только порядок; в 3-й строке не хватает: ' + V(c).ru + '.' };
      }
      case 'arith': {
        const op = rule.op === 'add' ? '+' : '−';
        const ex = row3[0] + ' ' + op + ' ' + row3[1] + ' = ' + c;
        return { uz: N.uz + ': 3-ustun = 1-ustun ' + op + ' 2-ustun (3-qator: ' + ex + ').',
                 ru: N.ru + ': 3-й столбец = 1-й ' + op + ' 2-й (3-я строка: ' + ex + ').' };
      }
      case 'shift': {
        const k = Math.abs(rule.d), cw = rule.d > 0;
        const dirUz = cw ? "soat mili boʻyicha" : 'soat miliga teskari';
        const dirRu = cw ? 'по часовой стрелке' : 'против часовой стрелки';
        if (a.key === 'spokes') {
          return { uz: N.uz + ': har qatorda ' + (45 * k) + '° ' + dirUz + ' buriladi.',
                   ru: N.ru + ': в каждой строке поворачиваются на ' + (45 * k) + '° ' + dirRu + '.' };
        }
        const center = a.grid.some(row => row.some(m => m & bit(4)));
        return { uz: N.uz + ": har qatorda shakllar chetdagi katakchalar boʻylab " + k + ' qadam ' + dirUz + ' suriladi' +
                   (center ? ' (markazdagisi joyida qoladi).' : '.'),
                 ru: N.ru + ': в каждой строке фигуры сдвигаются по краю на ' + k + (k === 1 ? ' шаг ' : ' шага ') + dirRu +
                   (center ? ' (центральная остаётся на месте).' : '.') };
      }
      case 'or':
        return { uz: N.uz + ": 1- va 2-rasmni ustma-ust qoʻysangiz, 3-rasm chiqadi — hammasi saqlanadi.",
                 ru: N.ru + ': наложите 1-ю и 2-ю картинки — получится 3-я, всё сохраняется.' };
      case 'xor':
        return { uz: N.uz + ": 1- va 2-rasm ustma-ust qoʻyiladi — ikkalasida ham bor " + el.uz + " oʻchadi, faqat bittasida borlari qoladi.",
                 ru: N.ru + ': 1-я и 2-я картинки накладываются — общие ' + el.ru + ' исчезают, остаются только те, что есть лишь на одной.' };
      case 'and':
        return { uz: N.uz + ': 3-rasmda faqat 1- va 2-rasmning ikkalasida ham bor ' + el.uz + ' qoladi.',
                 ru: N.ru + ': на 3-й картинке остаются только ' + el.ru + ', которые есть и на 1-й, и на 2-й.' };
    }
    throw new Error('[matrix] matn yoʻq: ' + rule.name);
  }

  function explainText(P, cells) {
    const uz = ["Qoidalar har qatorda chapdan oʻngga ishlaydi:"];
    const ru = ['Правила действуют в каждой строке слева направо:'];
    for (const a of P.attrs) {
      /* Hamma variantda bir xil bo'lgan doimiy atribut javobga ta'sir
         qilmaydi — uni sanab o'tirmaymiz. */
      if (a.rule.name === 'same' && a.axis < 0) continue;
      const t = ruleText(P, a, cells);
      uz.push('• ' + t.uz); ru.push('• ' + t.ru);
    }
    /* To'plamni so'z bilan atab bo'lmaydi — elementlar sonini aytamiz. */
    const ansVal = a => (a.def.kind === 'set'
      ? { uz: popcount(a.c) + ' ta', ru: popcount(a.c) + ' шт.' } : valName(a, a.c));
    const ans = P.attrs.filter(a => a.axis >= 0 && ansVal(a));
    if (ans.length) {
      uz.push('Javob: ' + ans.map(a => attrName(P.layout, a.key).uz + ' — ' + ansVal(a).uz).join(', ') + '.');
      ru.push('Ответ: ' + ans.map(a => attrName(P.layout, a.key).ru + ' — ' + ansVal(a).ru).join(', ') + '.');
    } else {
      uz.push('Javob — hamma qoidaga mos keladigan yagona rasm.');
      ru.push('Ответ — единственная картинка, подходящая под все правила.');
    }
    return { uz: uz.join('\n'), ru: ru.join('\n') };
  }

  /* ── Qiyinlik ──
     Qoida og'irliklari — boshlang'ich taxmin (odamlar uchun XOR
     arifmetikadan, arifmetika progressiyadan qiyinroq — Raven
     tadqiqotlaridagi umumiy manzara). REF — shu darajadagi o'rtacha ball
     (2000 urug'da o'lchangan). b = levelToB(level) + 0.2·(ball − REF),
     ±0.5 bilan chegaralangan: bir darajada qiyinroq qoidalar to'plami
     tushgan savol biroz yuqoriroq b oladi. Haqiqiy b foydalanuvchi
     javoblaridan keyin kalibrlanadi. */
  const WEIGHT = { same: 0, const: 0.5, prog: 1, dist3: 1.5, shift: 2, or: 2, and: 2.25, arith: 2.5, xor: 3 };
  const REF = [0, 1, 1.37, 2.81, 3.3, 4.29, 5.29, 5.55, 6.39, 6.88, 7.16];
  function scoreOf(attrs) {
    return attrs.reduce((s, a) => s + WEIGHT[a.rule.name] + (a.rule.name === 'prog' && Math.abs(a.rule.d) === 2 ? 0.25 : 0), 0);
  }

  /* ── Yig'ish ── */
  function attempt(r, level) {
    const P = makePlan(level, r);
    const code = CODES[P.code];
    const axes = P.attrs.filter(a => a.axis >= 0).sort((x, y) => x.axis - y.axis);
    const m = axes.map((_, j) => 1 + Math.max.apply(null, code.map(w => w[j])));

    /* 1) Variant qiymatlari — javob hali noma'lum. */
    axes.forEach((a, j) => { a.values = sampleValues(a.def, a.rule, m[j], P, r); });
    /* 2) Variantlar tartibi va to'g'ri kod so'zi — ikkalasi ham tekis. */
    const order = r.shuffle(range(0, code.length - 1));
    const ci = r.int(code.length);
    /* 3) To'g'ri qiymatlar. */
    for (const a of P.attrs) {
      if (a.axis >= 0) a.c = a.values[code[ci][a.axis]];
      else a.c = a.fixed || sampleValues(a.def, a.rule, 1, P, r)[0];
    }
    /* 4) Matritsa: javob o'zgarmaydi, faqat qolgan kataklar qayta
       quriladi — shuning uchun qayta urinishlar javob taqsimotini
       buzmaydi. (Butun rejani qayta tuzish — build() dagi sikl — esa
       buzishi mumkin: agar biror javob qiymati bilan matritsa HECH
       QACHON chiqmasa, o'sha qiymat to'g'ri javob bo'lmay qoladi va ko'r
       yechuvchi uni chetlab o'tishni "o'rganadi". Shuning uchun quyidagi
       ikkinchi shart yumshoq, birinchisi esa har qiymat uchun tez
       bajariladi — testda tekshirilgan.) */
    for (let t = 0; t < 100; t++) {
      for (const a of P.attrs) {
        const alts = a.axis >= 0 ? a.values.filter(v => v !== a.c) : [];
        a.grid = buildGrid(a, a.c, alts, P, r);
      }
      const cells = [0, 1, 2].map(i => [0, 1, 2].map(j => {
        const p = {};
        for (const a of P.attrs) p[a.key] = a.grid[i][j];
        return p;
      }));
      if (ambiguous(P.layout, cells)) continue;
      /* Javob 3-ustundagi yuqori katakning aynan nusxasi bo'lmasin —
         aks holda "tepadagini ko'chir" hiylasi qoidani bilmasdan ishlaydi.
         Tor diapazonda (masalan 1..4 nuqta, bitta qoida) bu har doim ham
         mumkin emas, shuning uchun 40 urinishdan keyin talab qilinmaydi. */
      const key = p => JSON.stringify(p);
      if (t < 40 && (key(cells[2][2]) === key(cells[0][2]) || key(cells[2][2]) === key(cells[1][2]))) continue;
      return finish(P, cells, order, ci);
    }
    return null;
  }

  function finish(P, cells, order, ci) {
    const code = CODES[P.code];
    const options = order.map(w => {
      const p = {};
      for (const a of P.attrs) p[a.key] = a.axis >= 0 ? a.values[code[w][a.axis]] : a.c;
      return p;
    });
    const correct = order.indexOf(ci);
    const truth = cells[2][2];
    /* Har distraktor qaysi qoidani buzadi — ichki tavsif (testda
       mustaqil tekshiriladi). */
    const violations = options.map((o, i) => (i === correct ? [] : P.attrs
      .filter(a => o[a.key] !== truth[a.key])
      .map(a => ({ key: a.key, rule: a.rule.name, expected: truth[a.key], got: o[a.key] }))));
    const score = scoreOf(P.attrs);
    const adj = Math.max(-0.5, Math.min(0.5, 0.2 * (score - REF[P.level])));
    return { P, cells, options, correct, violations, score, adj };
  }

  function build(seed, level) {
    const r = IQ.rng(seed);
    /* Deyarli har doim birinchi urinishda chiqadi; qayta rejalash —
       noyob holatlar uchun (masalan tekshiruvchi 80 marta rad etsa). */
    for (let i = 0; i < 20; i++) {
      const res = attempt(r, level);
      if (res) return res;
    }
    throw new Error('[matrix] savol tuzilmadi: ' + seed + '/' + level);
  }

  function toItem(seed, level, R) {
    const P = R.P;
    return {
      id: 'matrix:' + level + ':' + seed,
      type: 'matrix',
      level,
      b: Math.round((IQ.levelToB(level) + R.adj) * 100) / 100,
      prompt: { uz: "Qonuniyatni toping: boʻsh katakka qaysi rasm mos keladi?",
                ru: 'Найдите закономерность: какая картинка подходит в пустую клетку?' },
      stimulus: { kind: 'svg', svg: stimulusSvg(P.layout, R.cells) },
      options: R.options.map(o => ({ kind: 'svg', svg: optionSvg(P.layout, o) })),
      correct: R.correct,
      explain: explainText(P, R.cells),
    };
  }

  function generate(seed, level) {
    return toItem(seed, level, build(seed, level));
  }

  /* Test va tahlil uchun ichki tavsif. Ilova buni ishlatmaydi. */
  function describe(seed, level) {
    const R = build(seed, level);
    const P = R.P;
    return {
      item: toItem(seed, level, R),
      spec: {
        layout: P.layout, level, k: P.k, code: P.code, score: R.score,
        attrs: P.attrs.map(a => ({
          key: a.key, kind: a.def.kind, rule: Object.assign({}, a.rule), axis: a.axis,
          values: a.values ? a.values.slice() : null, grid: a.grid.map(row => row.slice()),
          name: attrName(P.layout, a.key),
        })),
        cells: R.cells, options: R.options, correct: R.correct, violations: R.violations,
      },
    };
  }

  IQ.register({
    type: 'matrix',
    label: { uz: 'Matritsalar', ru: 'Матрицы' },
    generate,
    describe,
    panelSvg,
  });
})(typeof window !== 'undefined' ? window : globalThis);
