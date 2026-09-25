/* ─────────────────────────────────────────────────────────────────────────
   gen/spatial.js — fazoviy tafakkur: shaklni aqlda aylantirish

   IKKI TUR:

   1. "rotate" (asosiy, hamma darajada) — Shepard–Metzler testining 2D
      ko'rinishi. Stimul: assimetrik poliomino (5–9 katak). Savol: qaysi
      variant shu shaklning BURILGAN ko'rinishi (ko'zgudagi aksi emas)?
      Distraktorlar: ko'zgu aksi (burilgan), bitta katagi ko'chirilgan
      shakl va uning ko'zgu aksi.

   2. "fill" (7+ darajada, ~25%) — "qaysi bo'lak bo'sh joyni aniq
      to'ldiradi?". To'rtburchak ichida bo'lak shaklidagi teshik bor;
      variantlar — burilgan bo'laklar.

   ENG MUHIM TO'RT QAROR (va nima uchun):

   a) Shakl XIRAL bo'lishi shart: ko'zgu aksi hech bir burilishiga teng
      emas. Aks holda "ko'zgu" distraktori ham burilgan nusxa bo'lib
      qoladi va savolda ikkita to'g'ri javob chiqadi. Tekshiruv — kanonik
      shakl (4 burilish × siljitish bo'yicha eng kichik yozuv).

   b) TO'G'RI JAVOB TO'PLAM QURILGANDAN KEYIN, TEKIS TANLANADI. Avval
      variantlar to'plami quriladi ({A, A', C, C', ...}: A va C — bitta
      "o'zak"ka bitta katakni ikki xil joyga qo'shib olingan shakllar,
      ' — ko'zgu aksi), keyin ulardan biri tasodifan "to'g'ri" deb
      tanlanadi va stimul SHUNDAN yasaladi. Natija: variantlarga qarab
      (stimulsiz) to'g'ri javobni topishning iloji yo'q — to'plam
      to'g'ri javob tanlanishidan oldin tayyor, har element teng ehtimolli.
      Klassik xato — "to'g'ri + 3 ta ko'zgu": uch variant bir-birining
      burilgani, bittasi "boshqacha" — ayyor odam qoidani emas, naqshni
      topadi (100% ga yaqin). Bu yerda bunday naqsh yo'q.

   c) Hamma variant bir xil masshtabda va markazda. Masshtab to'plamdagi
      hamma shaklning hamma ruxsat etilgan burilishidagi eng katta
      o'lchamidan hisoblanadi — tanlangan burilishga bog'liq emas, ya'ni
      o'lcham ham yorliq bo'lib qolmaydi. SVG'da kataklar ekrandagi
      o'rni bo'yicha tartiblanadi — manba kodidagi tartib ham hech narsa
      aytmaydi.

   d) "fill" turida variantlar orasida ko'zgu jufti YO'Q (hamma
      variantning "erkin" sinfi — burish+ag'darish bo'yicha — har xil).
      Qog'oz bo'lakni odam tabiiy ravishda ag'darib ham ko'radi; shunday
      qilsa ham faqat bitta bo'lak mos keladi — ikki xil talqin yo'q.

   Darajalar: katak soni (5→9), variantlar soni (4→6), burilish burchagi
   (90° → 45° karralari), "ko'chirilgan katak" nozikligi (butunlay boshqa
   shakl → istalgan ko'chirish → o'lchami bir xil → yaqin joyga
   ko'chirish).

   Test: tests/iq-spatial.test.mjs — SVG'ni o'zi o'qib (generatorga
   ishonmay) hamma kafolatni qayta tekshiradi.
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const IQ = root.IQ = root.IQ || {};

  /* Global nomlar mahalliy nusxada: testlar faylni node:vm ichida
     yuklaydi, u yerda har global murojaat (Math, Set, Infinity) sekin
     yo'ldan o'tadi — 20 000 savollik test ikki barobar cho'zilardi. */
  const { min, max, abs, round, floor, SQRT1_2 } = Math;
  const HashSet = Set;
  const INF = 1e9;

  /* ── Katak to'plamlari ustida geometriya ─────────────────────────────
     Katak — [x, y], ekran koordinatasi (y pastga). Shu sababli
     (x, y) → (−y, x) ekranda SOAT MILI BO'YICHA 90° burish. */

  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  /* Katak kaliti — son (satr emas): bir savolga minglab to'plam
     tekshiruvi ketadi. Koordinatalar |x|, |y| < 100 — to'qnashuv yo'q. */
  const K = (x, y) => (x + 100) * 1000 + (y + 100);
  const POW2 = [];
  for (let i = 0, v = 1; i < 64; i++, v *= 2) POW2.push(v);

  function norm(cells) {
    let mx = INF, my = INF;
    for (const c of cells) { if (c[0] < mx) mx = c[0]; if (c[1] < my) my = c[1]; }
    return cells.map(c => [c[0] - mx, c[1] - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  }
  const rot = cells => cells.map(c => [-c[1], c[0]]);
  const flip = cells => cells.map(c => [-c[0], c[1]]);

  /* Burilish bo'yicha kanonik yozuv: 4 burilishning eng kichigi.
     Ikki shakl bir-birining burilgani ⇔ yozuvlari teng.
     Yozuv — son: siljitishdan keyingi kataklar bitmaskasi × 16 + eni
     (eni bo'lmasa 2×3 va 3×2 bir xil maska berishi mumkin edi). Satr
     emas, son — chunki bir savolga minglab taqqoslash ketadi. 9 katakli
     shaklda eni×bo'yi ≤ 25, ya'ni son 2^30 dan kichik — aniq. To'rt
     burilish bitta o'tishda: (x,y) → (x,y), (−y,x), (−x,−y), (y,−x). */
  function rotCode(cells) {
    let x0 = INF, y0 = INF, x1 = -INF, y1 = -INF;
    for (const c of cells) {
      if (c[0] < x0) x0 = c[0]; if (c[0] > x1) x1 = c[0];
      if (c[1] < y0) y0 = c[1]; if (c[1] > y1) y1 = c[1];
    }
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    let m0 = 0, m1 = 0, m2 = 0, m3 = 0;
    for (const c of cells) {
      const x = c[0], y = c[1];
      m0 += POW2[(y - y0) * w + (x - x0)];
      m1 += POW2[(x - x0) * h + (y1 - y)];
      m2 += POW2[(y1 - y) * w + (x1 - x)];
      m3 += POW2[(x1 - x) * h + (y - y0)];
    }
    return min(m0 * 16 + w, m1 * 16 + h, m2 * 16 + w, m3 * 16 + h);
  }
  /* Erkin sinf: burish VA ag'darish bo'yicha. "fill" turi uchun. */
  const freeCode = cells => {
    const a = rotCode(cells), b = rotCode(flip(cells));
    return a < b ? a : b;
  };
  const isChiral = cells => rotCode(cells) !== rotCode(flip(cells));

  function box(cells) {
    let x0 = INF, y0 = INF, x1 = -INF, y1 = -INF;
    for (const c of cells) {
      if (c[0] < x0) x0 = c[0]; if (c[0] > x1) x1 = c[0];
      if (c[1] < y0) y0 = c[1]; if (c[1] > y1) y1 = c[1];
    }
    return { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }

  function connected(cells) {
    if (!cells.length) return false;
    const set = new HashSet(cells.map(c => K(c[0], c[1])));
    const seen = new HashSet([K(cells[0][0], cells[0][1])]);
    const stack = [cells[0]];
    while (stack.length) {
      const [x, y] = stack.pop();
      for (const d of DIRS) {
        const k = K(x + d[0], y + d[1]);
        if (set.has(k) && !seen.has(k)) { seen.add(k); stack.push([x + d[0], y + d[1]]); }
      }
    }
    return seen.size === set.size;
  }

  /* Teshikli shakl (ichida yopiq bo'sh katak) — ko'zga chalkash va
     "bo'lak" sifatida ma'nosiz. Tashqaridan suv quyib ko'ramiz:
     yetib bormagan bo'sh katak — teshik. */
  function hasHole(cells) {
    const b = box(cells);
    const set = new HashSet(cells.map(c => K(c[0], c[1])));
    const seen = new HashSet([K(b.x0 - 1, b.y0 - 1)]);
    const stack = [[b.x0 - 1, b.y0 - 1]];
    while (stack.length) {
      const [x, y] = stack.pop();
      for (const d of DIRS) {
        const nx = x + d[0], ny = y + d[1], k = K(nx, ny);
        if (nx < b.x0 - 1 || ny < b.y0 - 1 || nx > b.x0 + b.w || ny > b.y0 + b.h) continue;
        if (set.has(k) || seen.has(k)) continue;
        seen.add(k); stack.push([nx, ny]);
      }
    }
    return seen.size + set.size < (b.w + 2) * (b.h + 2);
  }

  /* Shaklga yon tomoni bilan tegib turgan bo'sh kataklar. */
  function frontier(cells) {
    const set = new HashSet(cells.map(c => K(c[0], c[1])));
    const out = [], got = new HashSet();
    for (const c of cells) {
      for (const d of DIRS) {
        const x = c[0] + d[0], y = c[1] + d[1], k = K(x, y);
        if (set.has(k) || got.has(k)) continue;
        got.add(k); out.push([x, y]);
      }
    }
    return out.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  }

  /* Tasodifiy o'sish bilan poliomino. Chegarali quti — telefon ekranida
     katak juda mayda bo'lib ketmasin. */
  function randomPoly(r, n, maxDim) {
    const cells = [[0, 0]], set = new HashSet([K(0, 0)]);
    for (let guard = 0; cells.length < n && guard < 2000; guard++) {
      const c = r.pick(cells), d = r.pick(DIRS);
      const x = c[0] + d[0], y = c[1] + d[1];
      if (set.has(K(x, y))) continue;
      const b = box(cells.concat([[x, y]]));
      if (b.w > maxDim || b.h > maxDim) continue;
      cells.push([x, y]); set.add(K(x, y));
    }
    return cells.length === n ? norm(cells) : null;
  }

  function randomChiral(r, n, maxDim) {
    for (let t = 0; t < 300; t++) {
      const p = randomPoly(r, n, maxDim);
      if (p && !hasHole(p) && isChiral(p)) return p;
    }
    return null;
  }

  /* Bitta katakni boshqa joyga ko'chirib olinadigan hamma shakllar
     (burilish sinfi bo'yicha). Distraktorga to'g'ri IZOH berish uchun:
     "bitta katagi ko'chgan" deyishdan oldin buni haqiqatan tekshiramiz. */
  function oneMoveCodes(cells) {
    const out = new HashSet();
    cells.forEach((c, i) => {
      const core = cells.filter((_, j) => j !== i);
      if (!connected(core)) return;
      for (const a of frontier(core)) {
        if (a[0] === c[0] && a[1] === c[1]) continue;
        out.add(rotCode(core.concat([a])));
      }
    });
    return out;
  }

  /* Umumiy "o'zak"dan shakllar oilasi: A = o'zak + c, qolganlari —
     o'zak + boshqa katak. Hammasi bir-biridan aynan bitta katak
     ko'chirish bilan farq qiladi — shuning uchun qaysi biri to'g'ri deb
     tanlansa ham, qolganlari "bitta katagi ko'chgan" bo'ladi (simmetriya).
       m          — nechta shakl kerak
       chiral     — har biri xiral bo'lsin ("rotate" uchun shart)
       sameBox    — hammasining o'lchami (eni×bo'yi) bir xil: bo'yiga-eniga
                    qarab ajratib bo'lmaydi, faqat aylantirib solishtirish
       near       — ko'chirilgan katak asl joyidan ≤ 2 katak nariga */
  function coreFamily(r, n, maxDim, m, opt) {
    for (let t = 0; t < 80; t++) {
      const A = randomChiral(r, n, maxDim);
      if (!A) continue;
      const ci = r.int(A.length), c = A[ci];
      const core = A.filter((_, i) => i !== ci);
      if (!connected(core)) continue;
      const bA = box(A);
      const cands = [];
      for (const a of frontier(core)) {
        if (a[0] === c[0] && a[1] === c[1]) continue;
        const S = core.concat([a]), b = box(S);
        if (b.w > maxDim || b.h > maxDim) continue;
        if (opt.sameBox && (b.w !== bA.w || b.h !== bA.h)) continue;
        if (opt.near && max(abs(a[0] - c[0]), abs(a[1] - c[1])) > 2) continue;
        if (opt.chiral && !isChiral(S)) continue;
        if (hasHole(S)) continue;
        cands.push({ S: norm(S), f: freeCode(S) });
      }
      const seen = new HashSet([freeCode(A)]), fam = [A];
      for (const x of r.shuffle(cands)) {
        if (fam.length === m) break;
        if (seen.has(x.f)) continue;
        seen.add(x.f); fam.push(x.S);
      }
      if (fam.length === m) return fam;
    }
    return null;
  }

  /* ── Darajalar ───────────────────────────────────────────────────────
     n      — katak soni
     k      — variantlar soni
     fam    — ikkinchi shakl qanday olinadi:
                free   — butunlay boshqa tasodifiy shakl (farqi yaqqol)
                move   — bitta katak istalgan joyga ko'chgan
                subtle — ko'chgan, lekin o'lchami (eni×bo'yi) o'zgarmagan
                fine   — subtle + katak ≤ 2 katak nariga ko'chgan
     rel90  — to'g'ri javob stimulga nisbatan qancha burilgan (45° birlikda)
     pOdd   — 45° ning toq karrasiga burilish ehtimoli (0 — faqat 90°)
     pFill  — "fill" turi ehtimoli */
  function config(level) {
    const n = [5, 5, 6, 6, 7, 7, 8, 8, 9, 9][level - 1];
    return {
      n,
      k: level <= 3 ? 4 : level <= 6 ? 5 : 6,
      maxDim: n <= 7 ? 4 : 5,
      fam: level <= 2 ? 'free' : level <= 5 ? 'move' : level <= 8 ? 'subtle' : 'fine',
      rel90: level === 1 ? [2, 6] : [2, 4, 6],
      pOdd: level >= 7 ? [0.3, 0.45, 0.6, 0.75][level - 7] : 0,
      pFill: level >= 7 ? 0.25 : 0,
    };
  }

  /* ── Chizish ─────────────────────────────────────────────────────────
     Burilish o — 45° birlikda, 0..7, soat mili bo'yicha. Kosinus/sinus
     jadvaldan (Math.cos emas): 90° karralarida aniq 0/±1 chiqadi, SVG
     baytma-bayt bir xil bo'ladi. */
  const RT = SQRT1_2;
  const COS = [1, RT, 0, -RT, -1, -RT, 0, RT];
  const SIN = [0, RT, 1, RT, 0, -RT, -1, -RT];
  const INK = '#1c1b29', GRAY = '#8a8799';
  const fmt = v => String(round(v * 100) / 100);

  function quads(cells, o) {
    const c = COS[o], s = SIN[o];
    return cells.map(([x, y]) => [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]]
      .map(([px, py]) => [px * c - py * s, px * s + py * c]));
  }
  function extent(cells, o) {
    const c = COS[o], s = SIN[o];
    let x0 = INF, y0 = INF, x1 = -INF, y1 = -INF;
    for (const cell of cells) {
      for (let k = 0; k < 4; k++) {
        const px = cell[0] + (k === 1 || k === 2 ? 1 : 0), py = cell[1] + (k >= 2 ? 1 : 0);
        const x = px * c - py * s, y = px * s + py * c;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    return { x0, y0, w: x1 - x0, h: y1 - y0 };
  }

  /* Kataklar → <polygon>lar, shakl (cx, cy) markazida, katak tomoni s.
     Tartib — ekrandagi o'rin bo'yicha (yuqoridan pastga, chapdan o'ngga):
     manba kodida "qaysi katak ko'chgan" degan iz qolmasin. */
  function polys(cells, o, s, cx, cy) {
    const e = extent(cells, o);
    const ox = cx - (e.x0 + e.w / 2) * s, oy = cy - (e.y0 + e.h / 2) * s;
    return quads(cells, o).map(q => {
      const pts = q.map(([x, y]) => [x * s + ox, y * s + oy]);
      const mx = (pts[0][0] + pts[2][0]) / 2, my = (pts[0][1] + pts[2][1]) / 2;
      return {
        mx: round(mx * 100), my: round(my * 100),
        str: '<polygon points="' + pts.map(p => fmt(p[0]) + ',' + fmt(p[1])).join(' ') + '"/>',
      };
    }).sort((a, b) => a.my - b.my || a.mx - b.mx).map(p => p.str).join('');
  }

  const head = v => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + v + ' ' + v + '">'
                  + '<rect width="' + v + '" height="' + v + '" fill="#fff"/>';
  const solid = '<g fill="' + GRAY + '" fill-opacity=".45" stroke="' + INK + '" stroke-width="1.5" stroke-linejoin="round">';
  const dashed = '<g fill="#fff" stroke="' + GRAY + '" stroke-width="1" stroke-dasharray="2.5 2">';
  const boardG = '<g fill="' + GRAY + '" fill-opacity=".45" stroke="' + GRAY + '" stroke-width=".6">';

  function shapeSvg(cells, o, s) {
    return head(100) + solid + polys(cells, o, s, 50, 50) + '</g></svg>';
  }

  /* To'rtburchak taxta, ichida teshik (hole). Teshik taxta chetidan kamida
     bitta katak ichkarida — "bo'sh joy" qayerda ekani aniq. Viewbox
     kvadrat: eni bo'yidan 1.6 barobardan oshmaydi (shartnoma). */
  function boardSvg(hole, bw, bh, s) {
    const V = round((max(bw, bh) * s + 16) * 100) / 100;
    const set = new HashSet(hole.map(c => K(c[0], c[1])));
    const board = [];
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) if (!set.has(K(x, y))) board.push([x, y]);
    /* polys() har to'plamni o'zicha markazlaydi — bu yerda esa taxta va
       teshik BITTA koordinatada bo'lishi shart. Shuning uchun ikkalasiga
       ham butun taxta markazidan hisoblangan bir xil siljish beramiz. */
    const X = x => V / 2 + (x - bw / 2) * s, Y = y => V / 2 + (y - bh / 2) * s;
    const place = cells => cells.map(([x, y]) => {
      const px = X(x), py = Y(y);
      const pts = [[px, py], [px + s, py], [px + s, py + s], [px, py + s]];
      return {
        mx: round((px + s / 2) * 100), my: round((py + s / 2) * 100),
        str: '<polygon points="' + pts.map(p => fmt(p[0]) + ',' + fmt(p[1])).join(' ') + '"/>',
      };
    }).sort((a, b) => a.my - b.my || a.mx - b.mx).map(p => p.str).join('');
    /* Taxta ichidagi to'r xira, teshik chegarasi va taxta cheti esa qalin
       qora: ko'z darhol teshik SHAKLINI ko'radi, taxta katakchalarini emas. */
    const P = (x, y) => fmt(X(x)) + ' ' + fmt(Y(y));
    let d = 'M' + P(0, 0) + 'L' + P(bw, 0) + 'L' + P(bw, bh) + 'L' + P(0, bh) + 'Z';
    for (const [x, y] of hole) {
      if (!set.has(K(x, y - 1))) d += 'M' + P(x, y) + 'L' + P(x + 1, y);
      if (!set.has(K(x, y + 1))) d += 'M' + P(x, y + 1) + 'L' + P(x + 1, y + 1);
      if (!set.has(K(x - 1, y))) d += 'M' + P(x, y) + 'L' + P(x, y + 1);
      if (!set.has(K(x + 1, y))) d += 'M' + P(x + 1, y) + 'L' + P(x + 1, y + 1);
    }
    return head(V) + boardG + place(board) + '</g>' + dashed + place(hole) + '</g>'
      + '<path d="' + d + '" fill="none" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="square"/></svg>';
  }

  /* ── Matnlar ─────────────────────────────────────────────────────────
     Uch til: uz, ru, en. Izoh: to'g'ri javob jumlasi + har distraktor
     guruhi alohida jumla (ilova har jumlani alohida qatorda ko'rsatadi).
     O'zbekcha matnda oʻ/gʻ — ʻ (U+02BB), oddiy apostrof emas. Savol
     (prompt) qisqa — bir-ikki qator; tafsilot izohda. */
  const LETTERS = 'ABCDEF';
  const LANGS = ['uz', 'ru', 'en'];
  const AND = { uz: 'va', ru: 'и', en: 'and' };
  const join = (ls, and) => ls.length === 1 ? ls[0] : ls.slice(0, -1).join(', ') + ' ' + and + ' ' + ls[ls.length - 1];

  /* rel — 45° birlikda, soat mili bo'yicha (1..7). */
  const TURN = {
    uz: d => (d === 180 ? '180° ga' : d < 180 ? 'soat mili boʻyicha ' + d + '° ga' : 'soat miliga teskari ' + (360 - d) + '° ga'),
    ru: d => (d === 180 ? 'на 180°' : d < 180 ? 'на ' + d + '° по часовой стрелке' : 'на ' + (360 - d) + '° против часовой стрелки'),
    en: d => (d === 180 ? '180°' : d < 180 ? d + '° clockwise' : (360 - d) + '° counterclockwise'),
  };
  const HEAD = {
    rotate: {
      uz: (L, t) => L + ' — asl shaklning ' + t + ' burilgani.',
      ru: (L, t) => L + ' — исходная фигура, повёрнутая ' + t + '.',
      en: (L, t) => L + ' is the original shape rotated ' + t + '.',
    },
    fill: {
      uz: (L, t) => L + ' — boʻsh joy shaklining ' + t + ' burilgani.',
      ru: (L, t) => L + ' — форма пустого места, повёрнутая ' + t + '.',
      en: (L, t) => L + ' is the shape of the gap rotated ' + t + '.',
    },
  };

  const ROLE_TEXT = {
    mirror: {
      uz: 'koʻzgudagi aksi: burib asl shaklga ustma-ust tushirib boʻlmaydi',
      ru: 'зеркальное отражение: поворотом его с исходной фигурой не совместить',
      en: 'mirror image: no rotation makes it match the original',
    },
    moved: {
      uz: 'boshqa shakl: bitta katagi boshqa joyga koʻchgan',
      ru: 'другая фигура: одна клетка перенесена в другое место',
      en: 'a different shape: one square has moved',
    },
    'moved-mirror': {
      uz: 'koʻzgudagi aksi, ustiga bitta katagi boshqa joyga koʻchgan',
      ru: 'зеркальное отражение, к тому же одна клетка перенесена',
      en: 'mirror image, and one square has moved too',
    },
    other: {
      uz: 'boshqa shakl: katakchalar boshqacha joylashgan',
      ru: 'другая фигура: клетки расположены иначе',
      en: 'a different shape: the squares are arranged differently',
    },
  };
  const ROLE_ORDER = ['mirror', 'moved', 'moved-mirror', 'other'];

  /* Savol bir-ikki qatorga sig'adi (uz ≤ 60 belgi): 360 px ekranda
     rus va kirill yozuvida ham variantlarni pastga surib yubormaydi. */
  const PROMPT = {
    rotate: {
      uz: 'Qaysi shakl — shu shaklning burilgani (koʻzgu aksi emas)?',
      ru: 'Какая фигура — эта же, но повёрнутая (не зеркальная)?',
      en: 'Which shape is this one rotated, not mirrored?',
    },
    fill: {
      uz: 'Qaysi boʻlak boʻsh joyni aniq toʻldiradi? Burish mumkin.',
      ru: 'Какая деталь точно заполнит пустое место? Можно вращать.',
      en: 'Which piece fills the gap exactly? You may rotate it.',
    },
  };

  /* ── Reja: savolning "mazmuni" (SVG'dan oldin) ──────────────────────
     Test ham shuni ishlatadi: generator har distraktor qaysi qoidani
     buzganini BILADI (role), test esa buni rasmdan mustaqil tekshiradi. */
  function tryPlan(r, level, cfg) {
    const kind = r.chance(cfg.pFill) ? 'fill' : 'rotate';
    const k = cfg.k;
    let list;

    if (kind === 'rotate') {
      const m = Math.ceil(k / 2);
      let bases;
      if (cfg.fam === 'free') {
        const A = randomChiral(r, cfg.n, cfg.maxDim);
        let B = null;
        for (let t = 0; A && t < 50 && !B; t++) {
          const x = randomChiral(r, cfg.n, cfg.maxDim);
          if (x && freeCode(x) !== freeCode(A)) B = x;
        }
        bases = A && B ? [A, B] : null;
      } else {
        bases = coreFamily(r, cfg.n, cfg.maxDim, m, {
          chiral: true, sameBox: cfg.fam !== 'move', near: cfg.fam === 'fine',
        });
      }
      if (!bases) return null;
      /* k toq bo'lsa (5), bitta shaklning ko'zgu jufti qo'yilmaydi.
         Qaysinisi — tasodif; to'g'ri javob baribir hamma variant ichidan
         tekis tanlanadi, ya'ni "juftsiz variant" ham yorliq emas. */
      const lonely = k % 2 ? r.int(bases.length) : -1;
      list = [];
      bases.forEach((S, i) => {
        list.push({ cells: norm(S) });
        if (i !== lonely) list.push({ cells: norm(flip(S)) });
      });
    } else {
      const fam = coreFamily(r, cfg.n, cfg.maxDim, k, {
        chiral: false, sameBox: true, near: cfg.fam === 'fine',
      });
      if (!fam) return null;
      list = fam.map(S => ({ cells: norm(S) }));
    }

    /* Himoya: variantlar burilish sinfi bo'yicha juft-juft farqli.
       (Xiral + erkin sinflari har xil bo'lsa bu o'z-o'zidan to'g'ri,
       lekin kafolatni taxmin bilan emas, tekshiruv bilan beramiz.) */
    const codes = list.map(x => rotCode(x.cells));
    if (new HashSet(codes).size !== codes.length) return null;

    /* Har variantning burilishi to'g'ri javobga BOG'LIQ EMAS: hammasiga
       bir xil qoida bilan. "fill"da faqat 90° (taxta to'g'ri burchakli). */
    const pOdd = kind === 'fill' ? 0 : cfg.pOdd;
    list.forEach(x => { x.o = 2 * r.int(4) + (pOdd && r.chance(pOdd) ? 1 : 0); });

    const opts = r.shuffle(list);
    const correct = r.int(k);                 // to'plam tayyor — endi tekis tanlov
    const C = opts[correct];

    /* Stimul to'g'ri javobdan NOLDAN FARQLI burchakka burilgan: aks holda
       rasmni ustma-ust qo'yib solishtirish kifoya, aylantirish kerak emas. */
    const rel = pOdd && r.chance(pOdd) ? r.pick([1, 3, 5, 7]) : r.pick(cfg.rel90);
    const so = (C.o - rel + 8) % 8;

    /* Har distraktor qaysi qoidani buzadi — to'g'ri javobga nisbatan. */
    const target = C.cells;
    const tRot = rotCode(target), tMir = rotCode(flip(target));
    const moves = oneMoveCodes(target), movesMir = oneMoveCodes(flip(target));
    const tFree = freeCode(target);
    const roles = opts.map((x, i) => {
      if (i === correct) return 'correct';
      const c = rotCode(x.cells);
      if (c === tRot) return null;                         // ikkinchi to'g'ri javob — bo'lmasligi kerak
      if (kind === 'fill' && freeCode(x.cells) === tFree) return null;  // ag'darsa mos keladi
      if (c === tMir) return 'mirror';
      if (moves.has(c)) return 'moved';
      if (movesMir.has(c)) return 'moved-mirror';
      return 'other';
    });
    if (roles.includes(null)) return null;
    if (kind === 'rotate' && !isChiral(target)) return null;

    /* Masshtab: to'plamdagi hamma shaklning hamma RUXSAT ETILGAN
       burilishidagi eng katta o'lchami bo'yicha. Tanlangan burilishga
       bog'liq emas — o'lcham hech narsa aytmaydi. */
    const allowed = pOdd ? [0, 1, 2, 3, 4, 5, 6, 7] : [0, 2, 4, 6];
    let ext = 0;
    for (const x of opts) for (const o of allowed) {
      const e = extent(x.cells, o);
      ext = max(ext, e.w, e.h);
    }
    const cell = floor(min(22, 84 / ext) * 100) / 100;

    /* Qiyinlik: Shepard–Metzler — javob vaqti burilish burchagi bilan
       chiziqli o'sadi (45° → oson, 180° → eng qiyin). "fill"da ko'zgu
       tuzog'i yo'q — biroz osonroq. Chegara ±0.3 (shartnoma: ±0.75). */
    const dis = min(rel, 8 - rel) * 45;
    const adj = (dis - 112.5) / 67.5 * 0.15 - (kind === 'fill' ? 0.15 : 0);
    const b = round((IQ.levelToB(level) + adj) * 1000) / 1000;

    const plan = {
      kind, level, n: cfg.n, k, fam: cfg.fam, correct, rel, b, cell,
      options: opts.map((x, i) => ({ cells: x.cells, o: x.o, role: roles[i] })),
    };
    if (kind === 'rotate') {
      plan.stimulus = { cells: target, o: so };
    } else {
      // Teshik: to'g'ri bo'lak so burilishda, taxta chetidan 1 katak ichkarida.
      let h = target;
      for (let i = 0; i < so / 2; i++) h = rot(h);
      h = norm(h).map(([x, y]) => [x + 1, y + 1]);
      const bb = box(h);
      plan.stimulus = { hole: h, w: bb.w + 2, h: bb.h + 2, o: so };
    }
    return plan;
  }

  function plan(seed, level) {
    const lv = max(1, min(10, round(level)));
    const cfg = config(lv);
    // Daraja ham urug'ga qo'shiladi: bir urug' har darajada boshqa savol.
    const r = IQ.rng((seed ^ Math.imul(lv, 0x9E3779B1)) >>> 0);
    for (let t = 0; t < 40; t++) {
      const p = tryPlan(r, lv, cfg);
      if (p) return p;
    }
    throw new Error('[IQ] spatial: savol qurib bo\'lmadi (seed ' + seed + ', level ' + lv + ')');
  }

  function explain(p) {
    const out = {};
    for (const lang of LANGS) {
      const parts = [HEAD[p.kind][lang](LETTERS[p.correct], TURN[lang](p.rel * 45))];
      for (const role of ROLE_ORDER) {
        const ls = [];
        p.options.forEach((x, i) => { if (x.role === role) ls.push(LETTERS[i]); });
        if (ls.length) parts.push(join(ls, AND[lang]) + ' — ' + ROLE_TEXT[role][lang] + '.');
      }
      out[lang] = parts.join(' ');
    }
    return out;
  }

  function generate(seed, level) {
    const p = plan(seed, level);
    const stimulus = p.kind === 'rotate'
      ? shapeSvg(p.stimulus.cells, p.stimulus.o, p.cell)
      : boardSvg(p.stimulus.hole, p.stimulus.w, p.stimulus.h, p.cell);
    return {
      id: 'spatial:' + p.level + ':' + (seed >>> 0),
      type: 'spatial',
      level: p.level,
      b: p.b,
      prompt: { uz: PROMPT[p.kind].uz, ru: PROMPT[p.kind].ru, en: PROMPT[p.kind].en },
      stimulus: { kind: 'svg', svg: stimulus },
      options: p.options.map(x => ({ kind: 'svg', svg: shapeSvg(x.cells, x.o, p.cell) })),
      correct: p.correct,
      explain: explain(p),
    };
  }

  IQ.register({
    type: 'spatial',
    /* ru nomi qisqa: ro'yxat qatorida va sarlavhada 360 px da ham sig'adi
       ("Пространственное мышление" hamma kenglikda "…" ga kesilardi). */
    label: { uz: 'Fazoviy tafakkur', ru: 'Пространство', en: 'Spatial' },
    langs: ['uz', 'ru', 'en'],
    generate,
    /* Testlar uchun: savolning ichki rejasi (rollar, kataklar). Ilova
       buni ishlatmaydi. */
    plan,
  });
})(typeof window !== 'undefined' ? window : globalThis);
