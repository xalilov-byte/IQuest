/* ─────────────────────────────────────────────────────────────────────────
   src/cert/qr.js — QR kod kodlovchisining tekshiruvi

   NIMA UCHUN MUHIM: sertifikatdagi QR tekshirish sahifasiga olib boradi.
   QR "ko'zga o'xshash" chiqib, lekin skanerlanmasa — hech kim sezmaydi
   (rasm chiroyli!), sertifikat esa tekshirib bo'lmaydigan qog'ozga
   aylanadi. Shuning uchun bu yerda ko'rinish emas, STANDARTNING O'ZI
   tekshiriladi: ISO/IEC 18004 dagi ma'lum qiymatlar (RS, format, versiya,
   tekislash jadvali, sig'im), tuzilma va jarima qoidalari.

   Repodan tashqarida qo'shimcha isbot (bu yerda bog'liqlik yo'q):
   mustaqil dekoderlar (jsQR, ZXing) 1143 satrda — lotin, kirill, emoji,
   URL, har versiya × har ECC chegara uzunligida, har niqobda — asl satrni
   qaytargan, RS bironta kodso'zni tuzatmagan (ya'ni xato "yashirilmagan"),
   ZXing enkoderi esa 609 ta ASCII holatda AYNAN shu matritsani (niqob
   tanlovi bilan) bergan. Pastdagi "oltin" matritsa shu yo'l bilan
   tasdiqlangan.

   Ishga tushirish:  node --test tests/cert-qr.test.mjs
   ───────────────────────────────────────────────────────────────────── */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(read('src/iq/index.js'), ctx);
vm.runInContext(read('src/cert/qr.js'), ctx);
const IQ = ctx.window.IQ;
const C = IQ.cert;
const Q = C._qr;
// vm ichidagi massivlar boshqa realm'niki — solishtirishdan oldin oddiy JSON.
const plain = x => JSON.parse(JSON.stringify(x));
const ECCS = ['L', 'M', 'Q', 'H'];

/* ── GF(256) va Reed–Solomon ───────────────────────────────────────── */

test('GF(256): primitiv ko\'phad 0x11D, log/antilog bir-biriga teskari', () => {
  assert.deepEqual(plain(Q.EXP.slice(0, 10)), [1, 2, 4, 8, 16, 32, 64, 128, 29, 58]);
  for (let x = 1; x < 256; x++) assert.equal(Q.EXP[Q.LOG[x]], x);
  assert.equal(Q.gfMul(0x80, 2), 0x1D);           // x^7 · x = x^8 ≡ x^4+x^3+x^2+1
  assert.equal(Q.gfMul(0, 77), 0);
  for (let a = 1; a < 256; a += 7) for (let b = 1; b < 256; b += 11) {
    assert.equal(Q.gfMul(a, b), Q.gfMul(b, a));
  }
});

test('RS generator ko\'phadlari ISO 18004 A-ilova bilan bir xil (α darajalarida)', () => {
  const alpha = n => plain(Q.rsGenerator(n)).map(c => Q.LOG[c]);
  assert.deepEqual(alpha(7), [87, 229, 146, 149, 238, 102, 21]);
  assert.deepEqual(alpha(10), [251, 67, 46, 61, 118, 70, 64, 94, 32, 45]);
});

test('RS kodlash: ma\'lum vektorlar (ISO 18004 I-ilova "01234567" 1-M; "HELLO WORLD" 1-M)', () => {
  assert.deepEqual(plain(Q.rsEncode([16, 32, 12, 86, 97, 128, 236, 17, 236, 17, 236, 17, 236, 17, 236, 17], 10)),
    [165, 36, 212, 193, 237, 54, 199, 135, 44, 85]);
  assert.deepEqual(plain(Q.rsEncode([32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17], 10)),
    [196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
});

/* ── Format va versiya ma'lumoti ──────────────────────────────────── */

test('format bitlari: standartdagi 32 qiymatli jadval (ISO 18004 C-ilova)', () => {
  const T = {
    L: ['111011111000100', '111001011110011', '111110110101010', '111100010011101', '110011000101111', '110001100011000', '110110001000001', '110100101110110'],
    M: ['101010000010010', '101000100100101', '101111001111100', '101101101001011', '100010111111001', '100000011001110', '100111110010111', '100101010100000'],
    Q: ['011010101011111', '011000001101000', '011111100110001', '011101000000110', '010010010110100', '010000110000011', '010111011011010', '010101111101101'],
    H: ['001011010001001', '001001110111110', '001110011100111', '001100111010000', '000011101100010', '000001001010101', '000110100001100', '000100000111011'],
  };
  for (const e of ECCS) T[e].forEach((bits, mask) => {
    assert.equal(Q.formatBits(e, mask), parseInt(bits, 2), `format ${e} niqob ${mask}`);
  });
});

test('versiya bitlari v7..v40: standart jadval (ISO 18004 D-ilova)', () => {
  const V = [0x07C94, 0x085BC, 0x09A99, 0x0A4D3, 0x0BBF6, 0x0C762, 0x0D847, 0x0E60D, 0x0F928, 0x10B78,
    0x1145D, 0x12A17, 0x13532, 0x149A6, 0x15683, 0x168C9, 0x177EC, 0x18EC4, 0x191E1, 0x1AFAB, 0x1B08E,
    0x1CC1A, 0x1D33F, 0x1ED75, 0x1F250, 0x209D5, 0x216F0, 0x228BA, 0x2379F, 0x24B0B, 0x2542E, 0x26A64,
    0x27541, 0x28C69];
  V.forEach((bits, i) => assert.equal(Q.versionBits(i + 7), bits, 'v' + (i + 7)));
});

test('tekislash naqshlari markazlari: to\'liq jadval v1..v40 (ISO 18004 E-ilova)', () => {
  /* Eslatma: jsQR'ning o'z jadvalida v23 uchun 74 yozilgan — xato, ISO va
     ZXing'da 78. Bizniki standart bo'yicha. */
  const A = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
    [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78],
    [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90], [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102],
    [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118], [6, 26, 50, 74, 98, 122],
    [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130], [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138],
    [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154],
    [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170]];
  A.forEach((a, i) => assert.deepEqual(plain(Q.alignmentPositions(i + 1)), a, 'v' + (i + 1)));
});

test('bayt rejimi sig\'imi standart jadval bilan bir xil (blok jadvallarining isboti)', () => {
  /* Sig'im = (umumiy kodso'z − blok soni × blokdagi ECC) dan chiqadi:
     ECC_PER_BLOCK yoki NUM_BLOCKS da bitta raqam xato bo'lsa, shu yerda
     yiqiladi. */
  const CAP = {
    1: [17, 14, 11, 7], 2: [32, 26, 20, 14], 3: [53, 42, 32, 24], 4: [78, 62, 46, 34], 5: [106, 84, 60, 44],
    6: [134, 106, 74, 58], 7: [154, 122, 86, 64], 8: [192, 152, 108, 84], 9: [230, 180, 130, 98],
    10: [271, 213, 151, 119], 15: [520, 412, 292, 220], 23: [1091, 857, 611, 461], 40: [2953, 2331, 1663, 1273],
  };
  for (const v in CAP) ECCS.forEach((e, i) => assert.equal(Q.byteCapacity(+v, e), CAP[v][i], `v${v}-${e}`));
  /* Har versiyada: sig'im ECC darajasi oshgani sari kamayadi, versiya
     oshgani sari oshadi. */
  for (let v = 1; v <= 40; v++) {
    for (let i = 1; i < 4; i++) assert.ok(Q.byteCapacity(v, ECCS[i]) < Q.byteCapacity(v, ECCS[i - 1]));
    if (v > 1) for (const e of ECCS) assert.ok(Q.byteCapacity(v, e) > Q.byteCapacity(v - 1, e));
  }
});

test('UTF-8: kirill, o\'zbek apostrofi, emoji, yolg\'iz surrogat', () => {
  assert.deepEqual(plain(Q.utf8('a')), [0x61]);
  assert.deepEqual(plain(Q.utf8('Ш')), [0xD0, 0xA8]);
  assert.deepEqual(plain(Q.utf8('oʻ')), [0x6F, 0xCA, 0xBB]);
  assert.deepEqual(plain(Q.utf8('€')), [0xE2, 0x82, 0xAC]);
  assert.deepEqual(plain(Q.utf8(String.fromCodePoint(0x1F600))), [0xF0, 0x9F, 0x98, 0x80]);
  assert.deepEqual(plain(Q.utf8(String.fromCharCode(0xD800) + 'x')), [0xEF, 0xBF, 0xBD, 0x78]);
});

/* ── Tuzilma ──────────────────────────────────────────────────────── */

function checkStructure(q, text) {
  const m = q.modules, s = q.size, v = q.version;
  assert.equal(s, 17 + 4 * v, text + ': o\'lcham');
  assert.equal(m.length, s);
  m.forEach(r => assert.equal(r.length, s));
  /* Finderlar: 7×7 (qora ramka, oq halqa, 3×3 qora markaz) + oq ajratgich. */
  for (const [fx, fy] of [[0, 0], [s - 7, 0], [0, s - 7]]) {
    for (let dy = -1; dy <= 7; dy++) for (let dx = -1; dx <= 7; dx++) {
      const x = fx + dx, y = fy + dy;
      if (x < 0 || y < 0 || x >= s || y >= s) continue;
      const d = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
      assert.equal(m[y][x], d !== 2 && d !== 4, `finder (${x},${y})`);
    }
  }
  /* Timing: 6-qator va 6-ustun, finderlar orasida navbatma-navbat. */
  for (let i = 8; i < s - 8; i++) {
    assert.equal(m[6][i], i % 2 === 0, `timing qator ${i}`);
    assert.equal(m[i][6], i % 2 === 0, `timing ustun ${i}`);
  }
  assert.equal(m[s - 8][8], true, '"qora modul"');
  /* Tekislash naqshlari — finder bilan ustma-ust tushadigan uch burchakdan tashqari hammasi. */
  const al = plain(Q.alignmentPositions(v)), n = al.length;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      assert.equal(m[al[i] + dy][al[j] + dx], Math.max(Math.abs(dx), Math.abs(dy)) !== 1, `alignment (${al[j]},${al[i]})`);
    }
  }
  /* Format: ikkala nusxa ham formatBits(ecc, mask) ga teng (skaner shunday o'qiydi). */
  const bit = b => (b ? 1 : 0);
  let a = 0, b = 0;
  for (let x = 0; x <= 8; x++) if (x !== 6) a = (a << 1) | bit(m[8][x]);
  for (let y = 7; y >= 0; y--) if (y !== 6) a = (a << 1) | bit(m[y][8]);
  for (let y = s - 1; y >= s - 7; y--) b = (b << 1) | bit(m[y][8]);
  for (let x = s - 8; x < s; x++) b = (b << 1) | bit(m[8][x]);
  const f = Q.formatBits(q.ecc, q.mask);
  assert.equal(a, f, text + ': format 1-nusxa');
  assert.equal(b, f, text + ': format 2-nusxa');
  /* Versiya (v ≥ 7): yuqori o'ng va pastki chap 6×3 bloklar. */
  if (v >= 7) {
    let tr = 0, bl = 0;
    for (let y = 5; y >= 0; y--) for (let x = s - 9; x >= s - 11; x--) tr = (tr << 1) | bit(m[y][x]);
    for (let x = 5; x >= 0; x--) for (let y = s - 9; y >= s - 11; y--) bl = (bl << 1) | bit(m[y][x]);
    assert.equal(tr, Q.versionBits(v), text + ': versiya yuqori o\'ng');
    assert.equal(bl, Q.versionBits(v), text + ': versiya pastki chap');
  }
}

test('tuzilma: finder, timing, tekislash, qora modul, format va versiya — v1..v40, har ECC', () => {
  for (let v = 1; v <= 40; v++) {
    const e = ECCS[v % 4];
    /* 6 bayt — v1-H ga ham sig'adi, ya'ni har versiyani majburlash mumkin. */
    const q = C.qr('IQuest', { ecc: e, minVersion: v });
    assert.equal(q.version, v);
    assert.equal(q.ecc, e);
    checkStructure(q, `v${v}-${e}`);
  }
  for (const e of ECCS) for (let mask = 0; mask < 8; mask++) {
    checkStructure(C.qr('Сертификат IQuest', { ecc: e, mask, minVersion: 7 }), `v7-${e}-niqob${mask}`);
  }
});

test('versiya tanlovi: sig\'adigan eng kichigi; chegarada aniq; sig\'masa — xato', () => {
  for (const e of ECCS) for (const v of [1, 2, 9, 10, 26, 39]) {
    const cap = Q.byteCapacity(v, e);
    assert.equal(C.qr('x'.repeat(cap), { ecc: e }).version, v, `${e} ${cap} bayt → v${v}`);
    assert.equal(C.qr('x'.repeat(cap + 1), { ecc: e }).version, v + 1, `${e} ${cap + 1} bayt → v${v + 1}`);
  }
  /* Kirill harfi 2 bayt: sig'im belgida emas, BAYTDA hisoblanadi. */
  assert.equal(C.qr('Ш'.repeat(7), { ecc: 'M' }).version, 1);   // 14 bayt
  assert.equal(C.qr('Ш'.repeat(8), { ecc: 'M' }).version, 2);   // 16 bayt
  assert.throws(() => C.qr('x'.repeat(2332), { ecc: 'M' }), /sig'maydi/);
  assert.throws(() => C.qr('x'.repeat(200), { ecc: 'M', maxVersion: 5 }), /sig'maydi/);
  assert.throws(() => C.qr('a', { ecc: 'X' }), /ecc/);
  assert.throws(() => C.qr('a', { mask: 8 }), /niqob/);
  assert.throws(() => C.qr('a', { minVersion: 0 }), /versiya/);
  /* Sertifikat URL'i — 4-versiya (33×33), M daraja. */
  assert.equal(C.qr('https://iquest.uz/sertifikat/?kod=IQ-7K3P-92XQ').version, 4);
  assert.equal(C.qr('https://iquest.uz/sertifikat/?kod=IQ-7K3P-92XQ').ecc, 'M');
});

/* ── Niqob va jarima ──────────────────────────────────────────────── */

const grid = (n, f) => Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => f(x, y)));

test('jarima qoidalari N1..N4: qo\'lda hisoblangan qiymatlar', () => {
  /* Butunlay oq 21×21: N1 = 42 chiziq × (3 + 16) = 798; N2 = 400 blok × 3 =
     1200; N3 = 0 (qora yo'q); N4 = 0% qora → 10 qadam × 10 = 100. */
  assert.equal(Q.penalty(grid(21, () => false)), 2098);
  /* Shaxmat taxtasi: ketma-ketlik ham, 2×2 ham, finder ham yo'q; qora
     221/441 ≈ 50.1% → 0. */
  assert.equal(Q.penalty(grid(21, (x, y) => (x + y) % 2 === 0)), 0);
  /* Oq maydon, 10-qatorda chapda 1011101 (finderga o'xshash yadro):
     N1 qatorlar 20×19 + (3+9) = 392; ustunlar 16×19 + 5×2×8 = 384;
     N2 (400 − 14) × 3 = 1158; N3: yadro bitta, chap tomoni simvol tashqarisi
     (oq hisoblanadi), o'ng tomoni ham oq — lekin BITTA jarima = 40;
     N4 5/441 qora → 9 × 10 = 90. Jami 2064. */
  const P = [1, 0, 1, 1, 1, 0, 1];
  assert.equal(Q.penalty(grid(21, (x, y) => y === 10 && x < 7 && P[x] === 1)), 2064);
});

test('niqob: 8 tadan eng kam jarimalisi tanlanadi (teng bo\'lsa — kichik raqam)', () => {
  const texts = ['https://iquest.uz/sertifikat/?kod=IQ-7K3P-92XQ', 'Oʻzbekiston', 'Сертификат', 'a', 'x'.repeat(120)];
  const seen = new Set();
  for (const t of texts) for (const e of ECCS) {
    const auto = C.qr(t, { ecc: e });
    const pens = [];
    for (let k = 0; k < 8; k++) pens.push(Q.penalty(C.qr(t, { ecc: e, mask: k }).modules));
    const best = pens.indexOf(Math.min(...pens));
    assert.equal(auto.mask, best, `${e} "${t.slice(0, 12)}" jarimalar ${pens}`);
    assert.deepEqual(plain(auto.modules), plain(C.qr(t, { ecc: e, mask: best }).modules));
    seen.add(best);
  }
  assert.ok(seen.size >= 3, 'turli matnlarda turli niqoblar tanlanishi kerak: ' + [...seen]);
});

/* ── Oltin namuna va determinizm ──────────────────────────────────── */

test('oltin matritsa: sertifikat URL\'i (v4-M, niqob 6) — jsQR va ZXing bilan tasdiqlangan', () => {
  const GOLD = [
    '#######.#..#....#.........#######', '#.....#.##.##...##.##.....#.....#', '#.###.#.##.#.....##..####.#.###.#',
    '#.###.#..#.#...#..........#.###.#', '#.###.#.#..#.###.##.####..#.###.#', '#.....#...#..##..#..#..##.#.....#',
    '#######.#.#.#.#.#.#.#.#.#.#######', '..........#.##....###..##........', '#..######..##.####.##.#..#..#.###',
    '###.##.....##.###.##..##....####.', '#..#.##.###.#.##.##..#.#....###.#', '##.###.##...#.#..#..#..#.###..#..',
    '...##.#.#..#.###########.####...#', '...##.....#.#...##.#.#.##..#.#...', '##....##.#..###.#.#.......#..##..',
    '##.#...#.##.#..#...#..#.##.####.#', '..#####..#.##.#.#..##.#.#######..', '....##.####.#.##..####....#.#.#.#',
    '.####.#....#..##...#...#.###.##.#', '..#....#.#..#.#..##.##......###..', '####.##.#..##..#...###.......#..#',
    '#.####.....#.#..#.#.#.#####.#....', '#.##.##...####.##....###......###', '#..###.#.#.#..#.###....#.#.#..#.#',
    '##..#######....##..#....#####.#..', '........##.#..###.#...###...#.##.', '#######.#.#..###..#######.#.#.#..',
    '#.....#.##.##.###..#...##...####.', '#.###.#.#.#.#.#..#####.######....', '#.###.#.###..##.....##..##.#.##.#',
    '#.###.#...#.#.#.###.#.###..##.###', '#.....#...#.#..##........####.###', '#######.##.####.##....#.##.##....',
  ];
  const q = C.qr('https://iquest.uz/sertifikat/?kod=IQ-7K3P-92XQ', { ecc: 'M' });
  assert.equal(q.version, 4);
  assert.equal(q.mask, 6);
  assert.deepEqual(plain(q.modules).map(r => r.map(b => (b ? '#' : '.')).join('')), GOLD);
});

test('determinizm: bir xil matn → bir xil matritsa va SVG; boshqa ECC → boshqa', () => {
  const t = 'https://iquest.uz/sertifikat/?kod=IQ-AB12-CD34';
  assert.deepEqual(plain(C.qr(t).modules), plain(C.qr(t).modules));
  assert.equal(C.qrSvg(t), C.qrSvg(t));
  assert.notDeepEqual(plain(C.qr(t, { ecc: 'L' }).modules), plain(C.qr(t, { ecc: 'H' }).modules));
  /* Qayta chaqiruv ichki holatni buzmaydi (generator keshi, niqob XOR). */
  const first = JSON.stringify(plain(C.qr('Сертификат', { ecc: 'Q' }).modules));
  for (let i = 0; i < 5; i++) C.qr('boshqa ' + i, { ecc: ECCS[i % 4] });
  assert.equal(JSON.stringify(plain(C.qr('Сертификат', { ecc: 'Q' }).modules)), first);
});

/* ── SVG ──────────────────────────────────────────────────────────── */

test('qrSvg: 4 modullik jim zona, oq fon, modullar path\'dan aynan tiklanadi', () => {
  const t = 'https://iquest.uz/sertifikat/?kod=IQ-7K3P-92XQ';
  const q = C.qr(t);
  const svg = C.qrSvg(t);
  const n = q.size + 8;
  assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + ' ' + n + '"'));
  assert.match(svg, new RegExp('<rect width="' + n + '" height="' + n + '" fill="#ffffff"/>'));
  /* path → modullar: har bo'lak "M x y h w v 1 h -w z". */
  const d = /<path fill="#000000" d="([^"]*)"/.exec(svg)[1];
  const got = grid(q.size, () => false);
  for (const [, x, y, w] of d.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    assert.ok(+x >= 4 && +y >= 4 && +x + +w <= 4 + q.size && +y < 4 + q.size, 'modul jim zonaga chiqmasin');
    for (let k = 0; k < +w; k++) got[+y - 4][+x - 4 + k] = true;
  }
  assert.deepEqual(got, plain(q.modules));
  /* Margin va px parametrlari. */
  assert.match(C.qrSvg(t, { margin: 2, px: 200 }), new RegExp('viewBox="0 0 ' + (q.size + 4) + ' ' + (q.size + 4) + '" width="200" height="200"'));
  assert.throws(() => C.qrSvg(t, { margin: 99 }), /margin/);
});

test('qrSvg xavfsiz: rang faqat #hex, IQ.validateItem SVG qoidalaridan o\'tadi', () => {
  const svg = C.qrSvg('x', { dark: '"/><script>alert(1)</script>', light: 'url(https://evil.example/)' });
  assert.match(svg, /fill="#000000"/);
  assert.match(svg, /fill="#ffffff"/);
  assert.doesNotMatch(svg, /script|evil/);
  assert.match(C.qrSvg('x', { dark: '#1c1b29' }), /fill="#1c1b29"/);
  /* Contract §2 dagi tekshirgich: skript, on*=, foreignObject, tashqi href yo'q. */
  const item = {
    id: 'demo:1:1', type: 'demo', level: 1, b: IQ.levelToB(1),
    prompt: { uz: 'a', ru: 'a' }, explain: { uz: 'a', ru: 'a' },
    stimulus: { kind: 'svg', svg: C.qrSvg('https://iquest.uz/sertifikat/?kod=IQ-7K3P-92XQ') },
    options: ['1', '2', '3', '4'].map(s => ({ kind: 'text', uz: s, ru: s })), correct: 0,
  };
  assert.deepEqual(plain(IQ.validateItem(item)), []);
});
