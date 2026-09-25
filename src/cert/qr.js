/* ─────────────────────────────────────────────────────────────────────────
   src/cert/qr.js — QR kod (ISO/IEC 18004) kodlovchisi, bog'liqliksiz

   NIMA UCHUN O'ZIMIZNIKI: ilova offline ishlaydi va CSP tashqi skriptni
   to'sadi (CONTRACT §1) — kutubxona olib bo'lmaydi. Sertifikatdagi QR esa
   tekshirish sahifasiga olib boradi: agar u skanerlanmasa, sertifikatni
   hech kim tekshira olmaydi va u qog'oz parchasiga aylanadi. Shuning uchun
   "ko'zga QR'ga o'xshash" yetarli emas — standart bo'yicha to'liq:

     - bayt rejimi (UTF-8), ECC L/M/Q/H, versiyalar 1..40;
     - Reed–Solomon GF(256), primitiv ko'phad x^8+x^4+x^3+x^2+1 (0x11D);
     - bloklarga bo'lish va aralashtirish (interleave) standart jadval bo'yicha;
     - 8 ta niqob, eng kichik jarimali tanlanadi (ISO 18004 §7.8.3, N1..N4);
     - format (BCH 15,5) va versiya (BCH 18,6, v ≥ 7) ma'lumoti.

   API:
     IQ.cert.qr(text, { ecc: 'M', minVersion, maxVersion, mask })
       → { size, modules: boolean[][], version, ecc, mask }
         modules[y][x] — true = qora. Jim zona KIRMAYDI (u chizishda qo'shiladi,
         standart 4 modul) — shunda chaqiruvchi o'z chegarasini tanlay oladi.
     IQ.cert.qrSvg(text, { ecc, margin: 4, dark, light, px }) → SVG satr
     IQ.cert.qrPath(qr, x0, y0, cell) → SVG <path d> — sertifikat ichiga
         joylash uchun (render.js ishlatadi)

   To'g'rilik repoda ma'lum vektorlar bilan (tests/cert-qr.test.mjs), repodan
   tashqarida esa mustaqil dekoder (jsQR) bilan yuzlab satrda isbotlangan.
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const IQ = root.IQ = root.IQ || {};
  const CERT = IQ.cert = IQ.cert || {};

  /* ── Jadvallar (ISO/IEC 18004, 9-jadval) ─────────────────────────────
     Indeks — versiya (0-o'rin bo'sh). Bu raqamlarni formula bilan
     chiqarib bo'lmaydi: standart ularni qo'lda tanlagan. Test ulardan
     kelib chiqadigan bayt sig'imini standartdagi sig'im jadvali bilan
     solishtiradi — bitta raqam xato bo'lsa, o'sha versiya yiqiladi. */
  const ECC_ORDER = ['L', 'M', 'Q', 'H'];
  /* Format ma'lumotidagi 2 bitlik kod — ECC tartibidan farq qiladi
     (L=01, M=00, Q=11, H=10). Bu klassik xato joyi. */
  const ECC_FORMAT = { L: 1, M: 0, Q: 3, H: 2 };
  const ECC_PER_BLOCK = {
    L: [0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    M: [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    Q: [0, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    H: [0, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  };
  const NUM_BLOCKS = {
    L: [0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    M: [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    Q: [0, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    H: [0, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
  };
  const VERSION_MIN = 1, VERSION_MAX = 40;

  /* ── GF(256) arifmetikasi ────────────────────────────────────────────
     Log/antilog jadvallari: ko'paytirish = darajalarni qo'shish. */
  const EXP = new Array(512), LOG = new Array(256);
  (function () {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP[i] = x; LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11D;
    }
    /* Ikkinchi yarmi — (log a + log b) ni 255 ga bo'lmasdan o'qish uchun. */
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
    LOG[0] = -1;
  })();
  const gfMul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];

  /* Generator ko'phad g(x) = Π (x − α^i), i = 0..n−1. Koeffitsientlar
     yuqori darajadan pastga, bosh koeffitsient (doim 1) tashlanadi.
     Kesh: har versiyada bir necha xil n bor, har chaqiruvda qayta
     hisoblash shart emas. */
  const genCache = Object.create(null);
  function rsGenerator(n) {
    if (genCache[n]) return genCache[n];
    let poly = [1];
    for (let i = 0; i < n; i++) {
      const next = new Array(poly.length + 1).fill(0);
      for (let j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];                      // x · poly
        next[j + 1] ^= gfMul(poly[j], EXP[i]);   // −α^i · poly (GF(2) da − = +)
      }
      poly = next;
    }
    return (genCache[n] = poly.slice(1));
  }

  /* Ma'lumot baytlarining RS qoldig'i: data · x^n mod g(x). */
  function rsEncode(data, n) {
    const gen = rsGenerator(n);
    const rem = new Array(n).fill(0);
    for (let i = 0; i < data.length; i++) {
      const factor = data[i] ^ rem.shift();
      rem.push(0);
      if (factor !== 0) for (let j = 0; j < n; j++) rem[j] ^= gfMul(gen[j], factor);
    }
    return rem;
  }

  /* ── Versiya geometriyasi ─────────────────────────────────────────── */
  const sizeOf = v => 17 + 4 * v;

  /* Tekislash (alignment) naqshlari markazlari. Standart jadvalni (E-ilova)
     qadam formulasi bilan beradi: birinchisi doim 6, oxirgisi size−7,
     oraliqlar teng juft qadam; faqat v32 da standart formula chiqargan
     qadamdan chetga chiqadi (26). Test butun jadval bilan solishtiradi. */
  function alignmentPositions(v) {
    if (v === 1) return [];
    const n = Math.floor(v / 7) + 2;
    const step = v === 32 ? 26 : Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2;
    const out = [6];
    for (let pos = sizeOf(v) - 7; out.length < n; pos -= step) out.splice(1, 0, pos);
    return out;
  }

  /* Ma'lumot uchun qolgan modullar soni (funksional naqshlar ayirilgan). */
  function rawDataModules(v) {
    let r = (16 * v + 128) * v + 64;
    if (v >= 2) {
      const n = Math.floor(v / 7) + 2;
      r -= (25 * n - 10) * n - 55;
      if (v >= 7) r -= 36;
    }
    return r;
  }
  const dataCodewords = (v, ecc) =>
    Math.floor(rawDataModules(v) / 8) - ECC_PER_BLOCK[ecc][v] * NUM_BLOCKS[ecc][v];

  /* Bayt rejimidagi belgilar soni maydoni: v1–9 da 8 bit, v10+ da 16 bit. */
  const countBits = v => (v < 10 ? 8 : 16);
  /* Shu versiya/ECC'ga sig'adigan eng ko'p bayt. */
  const byteCapacity = (v, ecc) => Math.floor((dataCodewords(v, ecc) * 8 - 4 - countBits(v)) / 8);

  /* ── Format va versiya ma'lumoti (BCH) ─────────────────────────────── */
  function formatBits(ecc, mask) {
    const data = (ECC_FORMAT[ecc] << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    /* 0x5412 niqobi — format hech qachon butunlay nol bo'lmasin
       (aks holda uni bo'sh joydan ajratib bo'lmaydi). */
    return ((data << 10) | (rem & 0x3FF)) ^ 0x5412;
  }
  function versionBits(v) {
    let rem = v;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
    return (v << 12) | (rem & 0xFFF);
  }

  /* ── UTF-8 ────────────────────────────────────────────────────────────
     TextEncoder'ga tayanmaymiz: node:vm muhitida va eski WebView'da u
     bo'lmasligi mumkin. Yolg'iz surrogat → U+FFFD (brauzer ham shunday). */
  function utf8(str) {
    const out = [];
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c >= 0xD800 && c <= 0xDBFF && i + 1 < str.length) {
        const d = str.charCodeAt(i + 1);
        if (d >= 0xDC00 && d <= 0xDFFF) { c = 0x10000 + ((c - 0xD800) << 10) + (d - 0xDC00); i++; }
        else c = 0xFFFD;
      } else if (c >= 0xD800 && c <= 0xDFFF) c = 0xFFFD;
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }

  /* ── Kodso'zlar ───────────────────────────────────────────────────────
     ECI qo'yilmaydi: skanerlar (jsQR, ZXing, telefon kameralari) bayt
     rejimidagi UTF-8 ni o'zi taniydi, ECI esa ba'zi eski o'quvchilarni
     chalg'itadi. Bizning asosiy yuk — ASCII URL. */
  function dataCodewordsFor(bytes, v, ecc) {
    const bits = [];
    const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    put(0b0100, 4);                    // bayt rejimi
    put(bytes.length, countBits(v));
    for (const b of bytes) put(b, 8);
    const capBits = dataCodewords(v, ecc) * 8;
    put(0, Math.min(4, capBits - bits.length));           // terminator
    put(0, (8 - bits.length % 8) % 8);                     // bayt chegarasigacha
    const out = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      out.push(b);
    }
    /* To'ldiruvchi baytlar 0xEC, 0x11 navbatma-navbat — standart talabi. */
    for (let pad = 0xEC; out.length < capBits / 8; pad ^= 0xEC ^ 0x11) out.push(pad);
    return out;
  }

  /* Bloklarga bo'lish, har blokka RS, keyin aralashtirish. Qisqa bloklar
     oldin keladi; uzun bloklarda bitta ortiq ma'lumot kodso'zi bor. */
  function addEccAndInterleave(data, v, ecc) {
    const nBlocks = NUM_BLOCKS[ecc][v], eccLen = ECC_PER_BLOCK[ecc][v];
    const total = Math.floor(rawDataModules(v) / 8);
    const nShort = nBlocks - total % nBlocks;
    const shortData = Math.floor(total / nBlocks) - eccLen;
    const blocks = [];
    for (let i = 0, k = 0; i < nBlocks; i++) {
      const len = shortData + (i < nShort ? 0 : 1);
      const d = data.slice(k, k + len);
      k += len;
      blocks.push({ d, e: rsEncode(d, eccLen) });
    }
    const out = [];
    for (let i = 0; i <= shortData; i++) {
      for (const b of blocks) if (i < b.d.length) out.push(b.d[i]);
    }
    for (let i = 0; i < eccLen; i++) for (const b of blocks) out.push(b.e[i]);
    return out;
  }

  /* ── Matritsa ─────────────────────────────────────────────────────── */
  function makeGrid(size) {
    const g = [], f = [];
    for (let y = 0; y < size; y++) { g.push(new Array(size).fill(false)); f.push(new Array(size).fill(false)); }
    return { size, m: g, fn: f };
  }
  const setFn = (G, x, y, dark) => { G.m[y][x] = dark; G.fn[y][x] = true; };

  function drawFinder(G, cx, cy) {
    /* 7×7 naqsh + 1 modullik oq ajratgich (chegaradan chiqqani tashlanadi). */
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= G.size || y >= G.size) continue;
      const d = Math.max(Math.abs(dx), Math.abs(dy));
      setFn(G, x, y, d !== 2 && d !== 4);
    }
  }
  function drawAlignment(G, cx, cy) {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      setFn(G, cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }

  function drawFormat(G, bits) {
    const s = G.size, bit = i => ((bits >>> i) & 1) === 1;
    /* Birinchi nusxa — yuqori chap finder atrofida. */
    for (let i = 0; i <= 5; i++) setFn(G, 8, i, bit(i));
    setFn(G, 8, 7, bit(6));
    setFn(G, 8, 8, bit(7));
    setFn(G, 7, 8, bit(8));
    for (let i = 9; i < 15; i++) setFn(G, 14 - i, 8, bit(i));
    /* Ikkinchi nusxa — yuqori o'ng va pastki chap: bittasi dog' bilan
       buzilsa ham skaner ikkinchisini o'qiydi. */
    for (let i = 0; i < 8; i++) setFn(G, s - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) setFn(G, 8, s - 15 + i, bit(i));
    setFn(G, 8, s - 8, true);          // "qora modul" — doim qora
  }

  function drawVersion(G, v) {
    if (v < 7) return;
    const bits = versionBits(v), s = G.size;
    for (let i = 0; i < 18; i++) {
      const dark = ((bits >>> i) & 1) === 1;
      const a = s - 11 + (i % 3), b = Math.floor(i / 3);
      setFn(G, a, b, dark);            // yuqori o'ng blok
      setFn(G, b, a, dark);            // pastki chap blok
    }
  }

  function drawFunctionPatterns(G, v) {
    const s = G.size;
    /* Vaqt (timing) chiziqlari — finderlar ustidan yoziladi, shuning uchun
       birinchi chiziladi. */
    for (let i = 0; i < s; i++) { setFn(G, 6, i, i % 2 === 0); setFn(G, i, 6, i % 2 === 0); }
    drawFinder(G, 3, 3);
    drawFinder(G, s - 4, 3);
    drawFinder(G, 3, s - 4);
    const al = alignmentPositions(v), n = al.length;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      /* Finder bilan ustma-ust tushadigan uch burchak o'tkaziladi. */
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
      drawAlignment(G, al[i], al[j]);
    }
    /* Format joyi band qilinadi (qiymat niqob tanlangandan keyin yoziladi). */
    drawFormat(G, 0);
    drawVersion(G, v);
  }

  /* Ma'lumot bitlari: pastki o'ngdan boshlab ikki ustunli "ilon" yo'li,
     6-ustun (vertikal timing) tashlab o'tiladi. Qolgan (remainder) bitlar
     0 bo'lib qoladi — standart shunday. */
  function drawCodewords(G, cw) {
    const s = G.size;
    let i = 0;
    for (let right = s - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < s; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? s - 1 - vert : vert;
          if (!G.fn[y][x] && i < cw.length * 8) {
            G.m[y][x] = ((cw[i >>> 3] >>> (7 - (i & 7))) & 1) === 1;
            i++;
          }
        }
      }
    }
  }

  const MASKS = [
    (x, y) => (x + y) % 2 === 0,
    (x, y) => y % 2 === 0,
    (x, y) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
    (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0,
    (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0,
  ];
  /* Niqob XOR — ikki marta qo'llansa asliga qaytadi (niqoblarni sinashda
     shunga tayanamiz). Funksional modullarga tegmaydi. */
  function applyMask(G, k) {
    const f = MASKS[k];
    for (let y = 0; y < G.size; y++) for (let x = 0; x < G.size; x++) {
      if (!G.fn[y][x] && f(x, y)) G.m[y][x] = !G.m[y][x];
    }
  }

  /* ── Jarima (ISO 18004 §7.8.3) ────────────────────────────────────────
     N1: qator/ustunda 5+ bir xil rang ketma-ket → 3 + (uzunlik − 5).
     N2: har 2×2 bir xil rangli blok → 3 (ustma-ust bloklar ham sanaladi).
     N3: finderga o'xshash 1:1:3:1:1 naqsh, bir tomonida 4 oq → 40.
         Simvol tashqarisi oq hisoblanadi — haqiqiy QR'da jim zona bor
         (at() chegaradan tashqarida false qaytaradi).
     N4: qora ulushining 50% dan har 5% og'ishi → 10.
     Niqob skanerlanishni o'zgartirmaydi (har qaysi niqob to'g'ri QR),
     lekin yomon niqob kamerani adashtiradi: yolg'on finder yoki katta
     bir xil dog'. */
  function penalty(m) {
    const s = m.length;
    let p = 0;
    const at = (x, y) => x >= 0 && y >= 0 && x < s && y < s && m[y][x];
    for (let pass = 0; pass < 2; pass++) {
      const get = pass === 0 ? (a, b) => at(b, a) : (a, b) => at(a, b);   // qatorlar, keyin ustunlar
      for (let a = 0; a < s; a++) {
        let run = 1;
        for (let b = 1; b <= s; b++) {
          if (b < s && get(a, b) === get(a, b - 1)) run++;
          else { if (run >= 5) p += 3 + (run - 5); run = 1; }
        }
        /* N3: yadro 1011101, uning OLDIDA yoki ORQASIDA 4 oq modul bo'lsa
           — bitta jarima (ikki tomoni ham oq bo'lsa ham bitta). Standart
           matni bu yerda ikki xil o'qiladi; biz ZXing va libqrencode
           o'qishini tanladik — shunda natijani ular bilan modulma-modul
           solishtirib tekshirish mumkin. */
        for (let b = 0; b + 6 < s; b++) {
          if (!(get(a, b) && !get(a, b + 1) && get(a, b + 2) && get(a, b + 3) && get(a, b + 4) &&
                !get(a, b + 5) && get(a, b + 6))) continue;
          const white = (from, to) => { for (let k = from; k < to; k++) if (get(a, k)) return false; return true; };
          if (white(b - 4, b) || white(b + 7, b + 11)) p += 40;
        }
      }
    }
    for (let y = 0; y < s - 1; y++) for (let x = 0; x < s - 1; x++) {
      const c = m[y][x];
      if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3;
    }
    let dark = 0;
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) if (m[y][x]) dark++;
    const total = s * s;
    p += Math.floor(Math.abs(dark * 20 - total * 10) / total) * 10;
    return p;
  }

  /* ── Asosiy funksiya ─────────────────────────────────────────────── */
  function qr(text, opts) {
    const o = opts || {};
    const ecc = o.ecc === undefined ? 'M' : String(o.ecc).toUpperCase();
    if (ECC_ORDER.indexOf(ecc) < 0) throw new Error('[qr] ecc L/M/Q/H bo\'lishi kerak: ' + o.ecc);
    const minV = o.minVersion === undefined ? VERSION_MIN : o.minVersion;
    const maxV = o.maxVersion === undefined ? VERSION_MAX : o.maxVersion;
    if (!(Number.isInteger(minV) && Number.isInteger(maxV) && minV >= VERSION_MIN && maxV <= VERSION_MAX && minV <= maxV)) {
      throw new Error('[qr] versiya oralig\'i 1..40 emas');
    }
    const forced = o.mask === undefined || o.mask === -1 ? -1 : o.mask;
    if (forced !== -1 && !(Number.isInteger(forced) && forced >= 0 && forced <= 7)) {
      throw new Error('[qr] niqob 0..7 bo\'lishi kerak');
    }
    const bytes = utf8(String(text));
    let v = minV;
    while (v <= maxV && bytes.length > byteCapacity(v, ecc)) v++;
    if (v > maxV) {
      throw new Error('[qr] matn sig\'maydi: ' + bytes.length + ' bayt, ' + ecc + ' v' + maxV +
                      ' sig\'imi ' + byteCapacity(maxV, ecc));
    }

    const G = makeGrid(sizeOf(v));
    drawFunctionPatterns(G, v);
    drawCodewords(G, addEccAndInterleave(dataCodewordsFor(bytes, v, ecc), v, ecc));

    /* Har niqobni sinab, eng kami tanlanadi. Teng bo'lsa — kichik raqam
       (deterministik: bir xil matn doim bir xil rasm). */
    let mask = forced;
    if (mask === -1) {
      let best = Infinity;
      for (let k = 0; k < 8; k++) {
        applyMask(G, k);
        drawFormat(G, formatBits(ecc, k));
        const pen = penalty(G.m);
        if (pen < best) { best = pen; mask = k; }
        applyMask(G, k);               // XOR — qaytarish
      }
    }
    applyMask(G, mask);
    drawFormat(G, formatBits(ecc, mask));
    return { size: G.size, modules: G.m, version: v, ecc, mask };
  }

  /* ── SVG ──────────────────────────────────────────────────────────────
     Qora modullar gorizontal bo'laklarga birlashtirib bitta <path> —
     minglab <rect> dan ancha yengil va bo'laklar orasida anti-alias
     "tirqishi" qolmaydi. */
  function qrPath(q, x0, y0, cell) {
    const r = n => Math.round(n * 1000) / 1000;
    let d = '';
    for (let y = 0; y < q.size; y++) {
      for (let x = 0; x < q.size; x++) {
        if (!q.modules[y][x]) continue;
        let len = 1;
        while (x + len < q.size && q.modules[y][x + len]) len++;
        d += 'M' + r(x0 + x * cell) + ' ' + r(y0 + y * cell) + 'h' + r(len * cell) + 'v' + r(cell) + 'h' + r(-len * cell) + 'z';
        x += len - 1;
      }
    }
    return d;
  }

  /* Rang faqat #rgb / #rrggbb: qiymat SVG atributiga to'g'ridan-to'g'ri
     tushadi, ixtiyoriy satr esa atributni yopib, yangi teg ochishi mumkin. */
  const COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  function qrSvg(text, opts) {
    const o = opts || {};
    const q = qr(text, o);
    const margin = o.margin === undefined ? 4 : o.margin;
    if (!(Number.isInteger(margin) && margin >= 0 && margin <= 16)) throw new Error('[qr] margin 0..16');
    const dark = COLOR_RE.test(o.dark || '') ? o.dark : '#000000';
    const light = COLOR_RE.test(o.light || '') ? o.light : '#ffffff';
    const n = q.size + margin * 2;
    const px = Number.isInteger(o.px) && o.px > 0 ? ' width="' + o.px + '" height="' + o.px + '"' : '';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + ' ' + n + '"' + px +
      ' shape-rendering="crispEdges"><rect width="' + n + '" height="' + n + '" fill="' + light + '"/>' +
      '<path fill="' + dark + '" d="' + qrPath(q, margin, margin, 1) + '"/></svg>';
  }

  CERT.qr = qr;
  CERT.qrSvg = qrSvg;
  CERT.qrPath = qrPath;
  /* Ichki qismlar — faqat testlar uchun (ma'lum vektorlar bilan solishtirish).
     Ilova ularga tayanmasin. */
  CERT._qr = {
    gfMul, rsGenerator, rsEncode, formatBits, versionBits, alignmentPositions,
    rawDataModules, dataCodewords, byteCapacity, utf8, penalty, sizeOf,
    ECC_PER_BLOCK, NUM_BLOCKS, LOG, EXP,
  };
})(typeof window !== 'undefined' ? window : globalThis);
