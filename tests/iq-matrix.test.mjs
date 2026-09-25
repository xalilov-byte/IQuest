/* ─────────────────────────────────────────────────────────────────────────
   gen/matrix.js — Raven uslubidagi progressiv matritsalar

   NIMA UCHUN TEST SVG'NI O'ZI O'QIYDI: generatorning ichki rejasiga
   ishonib tekshirsak, "rejada to'g'ri, rasmda xato" holatini ko'rmay
   qolamiz — foydalanuvchi esa faqat rasmni ko'radi. Shuning uchun har
   kafolat RASMDAN tiklanadi: <circle>/<polygon>lardan shakl turi,
   radiusi, burchagi, markazi, bo'yog'i; <path>dan ramka chiziqlari. Keyin
   shu yerdagi MUSTAQIL qoidalar kutubxonasi (generatordagidan boshqa
   kod; ustiga generator tekshirmaydigan "diagonal" oilasi ham bor) har
   atribut uchun javobni o'zi topadi.

   Asosiy xavflar (IQ testida jimgina natijani buzadigan):
     · ikki qoida ikki xil javob beradi → ikki "to'g'ri" javob;
     · distraktor aslida qoidaga mos (farqi faqat SVG satrida);
     · variantlar naqshi javobni aytib qo'yadi — klassik Raven xatosi:
       to'g'ri javob + bittadan atributi o'zgartirilgan distraktorlar →
       to'g'ri javob to'plamning "markazi", matritsaga qaramay topiladi;
     · masshtab, rang yoki SVG uzunligi yorliq bo'lib qoladi;
     · izohdagi harf yoki qoida rasmga mos emas.

   Ishga tushirish:  node --test tests/iq-matrix.test.mjs
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const FILES = ['src/iq/rng.js', 'src/iq/index.js', 'src/iq/gen/matrix.js'];
const read = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');

/* Brauzer taqlidi: window === global. Math.random chaqirilsa darhol
   yiqiladi — tasodif faqat IQ.rng dan bo'lishi shart (determinizm). */
function load() {
  const ctx = { console };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext('Math.random = function () { throw new Error("Math.random taqiqlangan"); };', ctx);
  vm.runInContext('Date.now = function () { throw new Error("Date.now taqiqlangan"); };', ctx);
  for (const f of FILES) vm.runInContext(read(f), ctx, { filename: f });
  return ctx.IQ;
}
const IQ = load();
const G = IQ.generator('matrix');
/* vm realm'idagi obyektlar boshqa prototipga ega — deepEqual uchun. */
const plain = x => JSON.parse(JSON.stringify(x));

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const N = 2000;
const SEEDS = Array.from({ length: N }, (_, i) => Math.imul(i + 1, 2654435761) >>> 0);
/* Rejani (plan) qayta hisoblash og'irroq — har darajada 500 ta yetarli. */
const N_PLAN = 500;
const LETTERS = 'ABCDEF';

const cache = new Map();
function batch(level) {
  if (!cache.has(level)) {
    cache.set(level, SEEDS.map(seed => ({ seed, item: IQ.makeItem('matrix', seed, level) })));
  }
  return cache.get(level);
}

/* ── Vizual spetsifikatsiya (test o'zi biladi) ──────────────────────
   Shakl "o'lchami" = tashqi radius / koeffitsient; o'lcham darajalari
   0.55 : 0.78 : 1. Bular rasmning shartnomasi — generator ularni
   o'zgartirsa, test ham ongli ravishda o'zgartiriladi. */
const SHAPES = { 0: 'circle', 3: 'tri', 4: 'square', 5: 'pent', 6: 'hex' };
const SHAPE_ORDER = ['circle', 'tri', 'square', 'pent', 'hex'];   // generator indekslari bilan solishtirish uchun
const SF = { circle: 1, tri: 1.32, square: 1.12, pent: 1.07, hex: 1.05 };
const SIZE_LEVELS = [0.55, 0.78, 1];
const FILLS = { '#fff': 'empty', '#1c1b29': 'solid', 'url(#h)': 'hatch' };
const FILL_ORDER = ['empty', 'solid', 'hatch'];
/* Rejadagi chiziq bitlari tartibi (soat mili bo'yicha chap yuqoridan) —
   faqat rejani rasm bilan solishtirish uchun. */
const LINE_NAMES = ['T1', 'T2', 'R1', 'R2', 'B1', 'B2', 'L1', 'L2'];
const ATTRS = ['shape', 'count', 'size', 'fill', 'rot', 'pos', 'lines'];
const KIND = { shape: 'nom', fill: 'nom', count: 'ord', size: 'ord', rot: 'cyc', pos: 'cyc', lines: 'set' };

/* ── SVG'ni o'qish ─────────────────────────────────────────────────── */

const num = s => Number(s);
const deg = (x, y) => ((Math.atan2(y, x) * 180 / Math.PI) % 360 + 360) % 360;
const angEq = (a, b, tol = 1.5) => { const d = Math.abs(((a - b) % 360 + 540) % 360 - 180); return d <= tol; };

/* Ramka yarim tomonlari: o'rta nuqtasi bo'yicha nomlanadi. */
function segName(x1, y1, x2, y2) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (Math.abs(len - 43) > 0.2) return null;
  if (y1 === 7 && y2 === 7) return mx < 50 ? 'T1' : 'T2';
  if (x1 === 93 && x2 === 93) return my < 50 ? 'R1' : 'R2';
  if (y1 === 93 && y2 === 93) return mx > 50 ? 'B1' : 'B2';
  if (x1 === 7 && x2 === 7) return my > 50 ? 'L1' : 'L2';
  return null;
}
function readLines(d, errs) {
  const names = [];
  for (const m of d.matchAll(/M([\d.]+) ([\d.]+)([HV])([\d.]+)/g)) {
    const x1 = num(m[1]), y1 = num(m[2]);
    const x2 = m[3] === 'H' ? num(m[4]) : x1, y2 = m[3] === 'V' ? num(m[4]) : y1;
    const n = segName(x1, y1, x2, y2);
    if (!n) errs.push('noma\'lum chiziq ' + m[0]);
    else names.push(n);
  }
  if (d.replace(/M[\d.]+ [\d.]+[HV][\d.]+/g, '') !== '') errs.push('chiziq yo\'li o\'qilmadi: ' + d);
  if (new Set(names).size !== names.length) errs.push('bir chiziq ikki marta');
  return names.sort().join(',');
}

/* Bitta shakl: turi, markazi, tashqi radiusi, burilishi, bo'yog'i. */
function readObject(tag, attrs, errs) {
  const fill = /fill="([^"]+)"/.exec(attrs)[1];
  if (!(fill in FILLS)) errs.push('ruxsat etilmagan bo\'yoq ' + fill);
  if (tag === 'circle') {
    const cx = num(/cx="([\d.]+)"/.exec(attrs)[1]), cy = num(/cy="([\d.]+)"/.exec(attrs)[1]), R = num(/ r="([\d.]+)"/.exec(attrs)[1]);
    return { shape: 'circle', cx, cy, R, rot: 0, fill: FILLS[fill] };
  }
  const pts = /points="([^"]+)"/.exec(attrs)[1].trim().split(/\s+/).map(p => p.split(',').map(num));
  const shape = SHAPES[pts.length];
  if (!shape) { errs.push('noma\'lum ko\'pburchak: ' + pts.length + ' uch'); return null; }
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const rs = pts.map(p => Math.hypot(p[0] - cx, p[1] - cy)), R = rs.reduce((s, v) => s + v, 0) / rs.length;
  if (rs.some(v => Math.abs(v - R) > 0.25)) errs.push(shape + ' muntazam emas');
  const angles = pts.map(p => deg(p[0] - cx, p[1] - cy));
  // qo'shni uchlar orasidagi burchak teng
  const step = 360 / pts.length;
  const sorted = angles.slice().sort((a, b) => a - b);
  sorted.forEach((a, i) => { if (i && !angEq(a - sorted[i - 1], step, 2)) errs.push(shape + ' uchlari notekis'); });
  let rot = 0;
  if (shape === 'tri') {
    // uch qaysi tomonga: yuqori (270°), o'ng (0°), past (90°), chap (180°)
    const hits = [270, 0, 90, 180].map((t, i) => (angles.some(a => angEq(a, t)) ? i : -1)).filter(i => i >= 0);
    if (hits.length !== 1) errs.push('uchburchak yo\'nalishi aniq emas');
    rot = hits[0];
  } else {
    const std = { square: 45, pent: 270, hex: 0 }[shape];
    if (!angles.some(a => angEq(a, std))) errs.push(shape + ' odatiy holatda emas');
  }
  return { shape, cx, cy, R, rot, fill: FILLS[fill] };
}

/* Panel (lokal 0..100) → xom tavsif. O'lcham hali "xom" (radius/koef). */
function readPanel(body, errs) {
  const lp = /<path d="([^"]+)" fill="none"[^>]*\/>/.exec(body);
  const lines = lp ? readLines(lp[1], errs) : '';
  const objs = [];
  for (const m of body.matchAll(/<(circle|polygon) ([^>]*)\/>/g)) {
    const o = readObject(m[1], m[2], errs);
    if (o) objs.push(o);
  }
  if (!objs.length) { errs.push('panelda shakl yo\'q'); return null; }
  const o0 = objs[0];
  for (const o of objs) {
    if (o.shape !== o0.shape || o.fill !== o0.fill || o.rot !== o0.rot || Math.abs(o.R - o0.R) > 0.15) {
      errs.push('bitta panelda har xil shakllar');
    }
  }
  // Ustma-ust tushmaydi, ramka ichida (chiziqlar x=7, x=93 da, qalinligi 2.5).
  for (let i = 0; i < objs.length; i++) {
    const o = objs[i];
    if (o.cx - o.R < 8.5 || o.cy - o.R < 8.5 || o.cx + o.R > 91.5 || o.cy + o.R > 91.5) errs.push('shakl ramkadan chiqqan');
    for (let j = i + 1; j < objs.length; j++) {
      if (Math.hypot(o.cx - objs[j].cx, o.cy - objs[j].cy) < o.R + objs[j].R - 0.2) errs.push('shakllar ustma-ust');
    }
  }
  // Markaz — shakllar markazlari to'rtburchagining o'rtasi.
  const xs = objs.map(o => o.cx), ys = objs.map(o => o.cy);
  const mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2;
  let pos = 'c';
  if (objs.length === 1 && (Math.abs(mx - 50) > 3 || Math.abs(my - 50) > 3)) {
    if (Math.abs(Math.abs(mx - 50) - Math.abs(my - 50)) > 0.5) errs.push('yolg\'iz shakl burchak diagonalida emas');
    pos = my < 50 ? (mx < 50 ? 0 : 1) : (mx > 50 ? 2 : 3);     // soat mili bo'yicha
  } else if (Math.abs(mx - 50) > 0.2 || Math.abs(my - 50) > 0.2) {
    errs.push('shakllar markazda emas (' + mx.toFixed(2) + ', ' + my.toFixed(2) + ')');
  }
  return {
    shape: o0.shape, count: objs.length, raw: Math.round(o0.R / SF[o0.shape] * 100) / 100,
    fill: o0.fill, rot: o0.rot, pos, lines,
  };
}

function panelsOf(svg, errs) {
  const out = [];
  for (const m of svg.matchAll(/<g transform="translate\(([\d.]+) ([\d.]+)\)" stroke="#1c1b29" stroke-width="2">([\s\S]*?)<\/g>/g)) {
    out.push({ x: num(m[1]), y: num(m[2]), p: readPanel(m[3], errs) });
  }
  return out;
}

/* O'lcham darajasi: savoldagi (panjara + variantlar) hamma "xom"
   o'lchamlar bitta masshtabga 0.55/0.78/1 nisbatda tushishi shart.
   Koordinatalar 0.1 ga yaxlitlangan — bir xil darajadagi ikki xil shakl
   xom o'lchami ~1% farq qilishi mumkin, shuning uchun avval guruhlanadi.
   Guruh bitta bo'lsa, daraja nisbiy (2 deb olinadi). */
function sizeLevels(raws, errs) {
  const vals = [...new Set(raws)].sort((a, b) => a - b);
  const reps = [];
  for (const v of vals) if (!reps.length || v / reps[reps.length - 1] > 1.03) reps.push(v);
  const top = vals[vals.length - 1];
  const fitsScale = s => vals.every(v => SIZE_LEVELS.some(l => Math.abs(v / s - l) < 0.02));
  const s = SIZE_LEVELS.slice().reverse().map(l => top / l).find(fitsScale);
  if (!s) { errs.push('o\'lchamlar bitta masshtabga tushmaydi: ' + vals.join(', ')); return { level: () => -1, groups: reps.length }; }
  return { level: v => SIZE_LEVELS.findIndex(l => Math.abs(v / s - l) < 0.02), groups: reps.length };
}

const keyOf = p => [p.shape, p.count, p.size, p.fill, p.rot, p.pos, p.lines].join('/');

/* ── Mustaqil qoidalar kutubxonasi ───────────────────────────────────
   grid — n×n, o'ng pastki katak null. Natija — mos kelgan HAR oila:
   { fam, dir, pred }. Generatordagi predict() dan boshqa kod: qadamlar
   ro'yxat sifatida, to'plamlar satr sifatida, ustiga "diagonal" oilasi. */
const uniq = a => [...new Set(a)];
const asSet = s => new Set(s ? s.split(',') : []);
const setStr = S => [...S].sort().join(',');
const SETOPS = {
  union: (a, b) => setStr(new Set([...asSet(a), ...asSet(b)])),
  inter: (a, b) => { const B = asSet(b); return setStr(new Set([...asSet(a)].filter(x => B.has(x)))); },
  xor: (a, b) => { const A = asSet(a), B = asSet(b); return setStr(new Set([...A].filter(x => !B.has(x)).concat([...B].filter(x => !A.has(x))))); },
  minus: (a, b) => { const B = asSet(b); return setStr(new Set([...asSet(a)].filter(x => !B.has(x)))); },
  rminus: (a, b) => { const A = asSet(a); return setStr(new Set([...asSet(b)].filter(x => !A.has(x)))); },
};
const NUMOPS = { sum: (a, b) => a + b, diff: (a, b) => a - b, rdiff: (a, b) => b - a };

function fitsOf(a, grid) {
  const n = grid.length, kind = KIND[a], out = [];
  const m4 = v => ((v % 4) + 4) % 4;
  for (const dir of ['row', 'col']) {
    const at = (i, j) => (dir === 'row' ? grid[i][j] : grid[j][i]);
    const lines = [];
    for (let i = 0; i < n; i++) { const l = []; for (let j = 0; j < n; j++) l.push(at(i, j)); lines.push(l); }
    const full = lines.slice(0, n - 1), part = lines[n - 1].slice(0, n - 1);
    const numeric = full.flat().concat(part).every(v => typeof v === 'number');
    const flat = l => l.every(v => v === l[0]);
    if (full.every(flat) && flat(part)) out.push({ fam: 'same', dir, pred: part[0] });
    if (n === 2) {
      // 2×2 analogiya: A:B = C:?  (tartibli / aylanma atributda farq ko'chadi)
      if (numeric && kind === 'ord') out.push({ fam: 'step', dir, pred: part[0] + full[0][1] - full[0][0] });
      if (numeric && kind === 'cyc') out.push({ fam: 'step', dir, pred: m4(part[0] + full[0][1] - full[0][0]) });
      continue;
    }
    if (numeric && (kind === 'ord' || kind === 'cyc')) {
      const norm = kind === 'cyc' ? m4 : v => v;
      const diffs = full.map(l => [norm(l[1] - l[0]), norm(l[2] - l[1])]);
      if (diffs.every(d => d[0] === d[1])) {
        const last = norm(part[1] - part[0]);
        out.push({ fam: 'step', dir, pred: norm(part[1] + last), last });
      }
    }
    const sig = l => l.map(String).sort().join('|');
    if (full.every(l => uniq(l).length === 3 && sig(l) === sig(full[0]))
        && part[0] !== part[1] && full[0].includes(part[0]) && full[0].includes(part[1])) {
      out.push({ fam: 'd3', dir, pred: full[0].filter(v => v !== part[0] && v !== part[1])[0] });
    }
    if (a === 'count' && numeric) {
      for (const [name, f] of Object.entries(NUMOPS)) {
        if (full.every(l => l[2] === f(l[0], l[1]))) out.push({ fam: name, dir, pred: f(part[0], part[1]) });
      }
    }
    if (kind === 'set') {
      for (const [name, f] of Object.entries(SETOPS)) {
        if (full.every(l => l[2] === f(l[0], l[1]))) out.push({ fam: name, dir, pred: f(part[0], part[1]) });
      }
    }
  }
  /* Diagonal: bir diagonaldagi kataklar bir xil (lotin kvadratining
     boshqa ko'rinishi). Generator buni ALOHIDA tekshirmaydi — agar u
     boshqa javob bersa, shu yerda ushlanadi. */
  if (n === 3) {
    for (const s of [1, 2]) {
      const cls = {};
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        if (i === 2 && j === 2) continue;
        (cls[(j + s * i) % 3] = cls[(j + s * i) % 3] || []).push(grid[i][j]);
      }
      if (Object.values(cls).every(v => uniq(v).length === 1) && uniq(Object.values(cls).map(v => v[0])).length === 3) {
        out.push({ fam: 'diag', dir: 'diag' + s, pred: cls[(2 + 2 * s) % 3][0] });
      }
    }
  }
  return out;
}

/* ── Izohni o'qish ─────────────────────────────────────────────────── */

const NAME_UZ = { shakli: 'shape', soni: 'count', 'oʻlchami': 'size', 'boʻyalishi': 'fill', 'yoʻnalishi': 'rot', joyi: 'pos', chiziqlari: 'lines' };
const NAME_RU = { форма: 'shape', количество: 'count', размер: 'size', заливка: 'fill', направление: 'rot', положение: 'pos', линии: 'lines' };
const NAME_EN = { shape: 'shape', count: 'count', size: 'size', fill: 'fill', direction: 'rot', position: 'pos', lines: 'lines' };
const RULE_UZ = [
  [/hamma katakda bir xil/, 'all'],
  [/har qatorda bir xil, qatordan qatorga oʻzgaradi/, 'rows'],
  [/har ustunda bir xil/, 'cols'],
  [/bir martadan/, 'd3'],
  [/taga ortadi|shakllar kattalashadi|soat mili boʻyicha/, 'step+'],
  [/taga kamayadi|shakllar kichrayadi|soat miliga teskari/, 'step-'],
  [/= birinchi \+ ikkinchi/, 'sum'],
  [/= birinchi − ikkinchi/, 'diff'],
  [/chiziqlari birga \(qoʻshiladi\)/, 'union'],
  [/ikkinchida borlari ayriladi/, 'minus'],
  [/faqat bitta katakda bor chiziqlar/, 'xor'],
  [/faqat ikkala katakda ham bor/, 'inter'],
];

function readExplain(ex, errs) {
  const mu = /^([A-F]) — toʻgʻri javob\. Qoidalar: ([^.]*)\.(.*)$/.exec(ex.uz);
  const mr = /^([A-F]) — правильный ответ\. Правила: ([^.]*)\.(.*)$/.exec(ex.ru);
  const me = /^([A-F]) is correct\. Rules: ([^.]*)\.(.*)$/.exec(ex.en || '');
  if (!mu || !mr || !me) { errs.push('izoh boshi o\'qilmadi'); return null; }
  const rules = {};
  for (const part of mu[2].split('; ')) {
    const m = /^([^:]+): (.+)$/.exec(part);
    const a = m && NAME_UZ[m[1].toLowerCase()];
    if (!a) { errs.push('izohdagi qoida o\'qilmadi: ' + part); continue; }
    const hit = RULE_UZ.filter(([re]) => re.test(m[2]));
    if (hit.length !== 1) errs.push('qoida turi aniq emas: ' + part);
    else rules[a] = hit[0][1];
  }
  const viol = (text, re, names, and) => {
    const g = {};
    for (const m of text.matchAll(re)) {
      const as = m[2].split(new RegExp(', | ' + and + ' ')).map(s => names[s]);
      if (as.some(x => !x)) errs.push('izohdagi atribut nomi o\'qilmadi: ' + m[2]);
      for (const L of m[1].match(/[A-F]/g)) g[L] = as.slice().sort().join(',');
    }
    return g;
  };
  const vu = viol(mu[3], /([A-F](?:, [A-F])*(?: va [A-F])?) — ([^.]+?) qoidaga mos emas\./g, NAME_UZ, 'va');
  const vr = viol(mr[3], /([A-F](?:, [A-F])*(?: и [A-F])?) — не подходит: ([^.]+)\./g, NAME_RU, 'и');
  const ve = viol(me[3], /([A-F](?:, [A-F])*(?: and [A-F])?) — wrong ([^.]+)\./g, NAME_EN, 'and');
  // en qoidalari: har biri "Atribut: …", atribut nomi uz dagisi bilan bir xil tartibda
  const rulesEn = me[2].split('; ').map(part => NAME_EN[(/^([^:]+): /.exec(part) || [])[1]?.toLowerCase()]);
  const rulesRu = mr[2].split('; ').length;
  return { letter: mu[1], letterRu: mr[1], letterEn: me[1], rules, rulesRu, rulesEn, vu, vr, ve };
}

/* ── Savolni rasmdan to'liq tekshirish ─────────────────────────────── */

const inspectCache = new WeakMap();
function inspect(item) {
  if (!inspectCache.has(item)) inspectCache.set(item, inspectRaw(item));
  return inspectCache.get(item);
}
function inspectRaw(item) {
  const errs = [...IQ.validateItem(item)];
  const st = item.stimulus.svg;
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(st);
  if (!vb) return { errs: errs.concat('stimul viewBox o\'qilmadi') };
  const W = num(vb[1]), H = num(vb[2]);
  if (W / H > 1.6) errs.push('stimul juda keng');
  /* Eni doim 328 — 2×2 ham 3×3 dagi masshtabda ko'rinsin (katak 100). */
  if (W !== 328) errs.push('stimul eni 328 emas: ' + W);
  const n = Math.round((H - 4) / 108);
  if (![2, 3].includes(n) || H !== 108 * n + 4) return { errs: errs.concat('panjara o\'lchami noma\'lum: ' + H) };
  const x0 = 6 + (W - H) / 2;
  // "?" katagi — o'ng pastda, ichida shakl yo'q
  const q = /<rect x="([\d.]+)" y="([\d.]+)" width="100" height="100" rx="4" fill="#fff" stroke="#8a8799" stroke-width="1.5" stroke-dasharray="[^"]+"\/><text [^>]*>\?<\/text>/.exec(st);
  if (!q || num(q[1]) !== x0 + 108 * (n - 1) || num(q[2]) !== 6 + 108 * (n - 1)) errs.push('"?" katagi o\'ng pastda emas');

  const P = panelsOf(st, errs);
  if (P.length !== n * n - 1) return { errs: errs.concat('panjarada ' + P.length + ' panel') };
  const grid = Array.from({ length: n }, () => new Array(n).fill(null));
  for (const { x, y, p } of P) {
    const i = (y - 6) / 108, j = (x - x0) / 108;
    if (!Number.isInteger(i) || !Number.isInteger(j) || grid[i][j] || (i === n - 1 && j === n - 1)) {
      return { errs: errs.concat('panel joyi noto\'g\'ri') };
    }
    grid[i][j] = p;
  }
  const opts = item.options.map((o, i) => {
    if (!o.svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff"/>')) {
      errs.push(`options[${i}]: kvadrat 100×100 va oq fon emas`);
    }
    const ps = panelsOf(o.svg, errs);
    if (ps.length !== 1 || ps[0].x !== 0 || ps[0].y !== 0) { errs.push(`options[${i}]: tuzilishi noma'lum`); return null; }
    return ps[0].p;
  });
  const visible = grid.flat().filter(Boolean);
  if (opts.includes(null) || visible.includes(null) || visible.length !== n * n - 1) return { errs };

  // O'lcham darajalari — butun savol bo'yicha bitta masshtab.
  const lvl = sizeLevels(visible.concat(opts).map(p => p.raw), errs);
  for (const p of visible.concat(opts)) p.size = lvl.level(p.raw);

  // Har atribut: mos oilalar → yagona bashorat.
  const pred = {}, fits = {};
  for (const a of ATTRS) {
    const g = grid.map(row => row.map(p => (p ? p[a] : null)));
    fits[a] = fitsOf(a, g);
    const ps = uniq(fits[a].map(f => JSON.stringify(f.pred)));
    if (ps.length !== 1) {
      errs.push(`${a}: ${ps.length ? 'ikki xil javob — ' + ps.join(' / ') + ' (' + fits[a].map(f => f.fam + '@' + f.dir).join(', ') + ')' : 'hech qaysi qoida mos emas'}`);
    } else pred[a] = JSON.parse(ps[0]);
  }
  const keys = opts.map(keyOf);
  if (new Set(keys).size !== keys.length) errs.push('ikki variant bir xil (kanonik)');
  const viol = opts.map(o => ATTRS.filter(a => a in pred && o[a] !== pred[a]));
  if (Object.keys(pred).length === ATTRS.length) {
    viol.forEach((v, i) => {
      if (i === item.correct && v.length) errs.push(`to'g'ri variant ${LETTERS[i]} qoidaga mos emas: ${v.join(', ')}`);
      if (i !== item.correct && !v.length) errs.push(`distraktor ${LETTERS[i]} hamma qoidaga mos (ikkinchi to'g'ri javob)`);
    });
  }
  const varying = ATTRS.filter(a => uniq(visible.map(p => p[a])).length > 1);

  // Izoh: harf, buzilgan atributlar, qoida turi — rasmga mos.
  const ex = readExplain(item.explain, errs);
  if (ex) {
    if (ex.letter !== LETTERS[item.correct] || ex.letterRu !== ex.letter || ex.letterEn !== ex.letter) errs.push('izohdagi harf to\'g\'ri javob emas');
    if (ex.rulesEn.join() !== Object.keys(ex.rules).join()) errs.push('en izohidagi qoidalar uz dagisidan farq qiladi: ' + ex.rulesEn.join());
    viol.forEach((v, i) => {
      if (i === item.correct) {
        if (ex.vu[LETTERS[i]] || ex.vr[LETTERS[i]] || ex.ve[LETTERS[i]]) errs.push('to\'g\'ri javob distraktor sifatida izohlangan');
        return;
      }
      const want = v.slice().sort().join(',');
      if (ex.vu[LETTERS[i]] !== want) errs.push(`izoh (uz): ${LETTERS[i]} — "${ex.vu[LETTERS[i]]}", rasmda "${want}"`);
      if (ex.vr[LETTERS[i]] !== want) errs.push(`izoh (ru): ${LETTERS[i]} — "${ex.vr[LETTERS[i]]}", rasmda "${want}"`);
      if (ex.ve[LETTERS[i]] !== want) errs.push(`izoh (en): ${LETTERS[i]} — "${ex.ve[LETTERS[i]]}", rasmda "${want}"`);
    });
    if (ex.rulesRu !== Object.keys(ex.rules).length) errs.push('uz va ru izohida qoidalar soni har xil');
    for (const a of varying) if (!ex.rules[a]) errs.push(`izohda o'zgaruvchi atribut qoidasi yo'q: ${a}`);
    for (const [a, r] of Object.entries(ex.rules)) {
      const f = fits[a], ok = x => x.pred === pred[a];
      const good = {
        all: () => !varying.includes(a),
        rows: () => varying.includes(a) && f.some(x => x.fam === 'same' && x.dir === 'row' && ok(x)),
        cols: () => varying.includes(a) && f.some(x => x.fam === 'same' && x.dir === 'col' && ok(x)),
        d3: () => f.some(x => x.fam === 'd3' && x.dir === 'row' && ok(x)),
        'step+': () => f.some(x => x.fam === 'step' && x.dir === 'row' && ok(x) && (KIND[a] === 'cyc' ? x.last === 1 : x.last > 0)),
        'step-': () => f.some(x => x.fam === 'step' && x.dir === 'row' && ok(x) && (KIND[a] === 'cyc' ? x.last === 3 : x.last < 0)),
      }[r] || (() => f.some(x => x.fam === r && x.dir === 'row' && ok(x)));
      if (!good()) errs.push(`izohdagi qoida rasmga mos emas: ${a} — ${r}`);
    }
  }
  return { errs, n, grid, opts, pred, fits, viol, varying, keys, ex, sizeGroups: lvl.groups };
}

/* ── Ko'r yechuvchilar: faqat variantlarni ko'radi (stimul, izoh yo'q) ──
   Har biri — "ayyor odam" strategiyasi. o — variantlar tavsifi (o'lcham
   xom son sifatida: panjarasiz daraja ma'lum emas). */
const argmax = s => s.indexOf(Math.max(...s));
const argmin = s => s.indexOf(Math.min(...s));
const BA = ['shape', 'count', 'raw', 'fill', 'rot', 'pos', 'lines'];
/* Ko'r yechuvchi o'lchamni faqat variantlardan biladi: xom o'lchamlar
   guruhlanadi (bir darajadagi ikki shakl ~1% farq qilishi mumkin) va
   guruh raqami (0 — eng kichik) olinadi. */
function blindView(opts) {
  const vals = [...new Set(opts.map(o => o.raw))].sort((a, b) => a - b), rank = new Map();
  let g = -1, prev = 0;
  for (const v of vals) { if (g < 0 || v / prev > 1.03) g++; rank.set(v, g); prev = v; }
  return opts.map(o => Object.assign({}, o, { raw: rank.get(o.raw) }));
}
const shared = (o, i) => o.reduce((s, x, j) => s + (j === i ? 0 : BA.filter(a => x[a] === o[i][a]).length), 0);
const BLIND = {
  'birinchi variant': () => 0,
  'oxirgi variant': o => o.length - 1,
  'eng ko\'p umumiy atributli ("markaz", moda)': o => argmax(o.map((_, i) => shared(o, i))),
  'eng kam umumiy atributli ("ortiqchasi")': o => argmin(o.map((_, i) => shared(o, i))),
  'har atributda eng ko\'p uchragan qiymatlar': o => argmax(o.map(x => BA.reduce((s, a) => s + o.filter(y => y[a] === x[a]).length, 0))),
  'yagona qiymati bor variant': o => {
    const i = o.findIndex(x => BA.some(a => o.filter(y => y[a] === x[a]).length === 1));
    return i < 0 ? 0 : i;
  },
  'tartibli o\'rtacha (son va o\'lcham medianasi)': o => {
    const med = a => { const v = o.map(x => x[a]).sort((p, q) => p - q); return v[v.length >> 1]; };
    const mc = med('count'), mr = med('raw');
    return argmin(o.map(x => Math.abs(x.count - mc) + Math.abs(x.raw - mr)));
  },
  'eng ko\'p shakl': o => argmax(o.map(x => x.count)),
  'eng kam shakl': o => argmin(o.map(x => x.count)),
  'eng katta shakl': o => argmax(o.map(x => x.raw)),
  'eng ko\'p chiziq': o => argmax(o.map(x => (x.lines ? x.lines.split(',').length : 0))),
  'eng uzun SVG': (o, item) => argmax(item.options.map(x => x.svg.length)),
  'eng qisqa SVG': (o, item) => argmin(item.options.map(x => x.svg.length)),
};

/* Panjarani ham ko'radigan, lekin qoidani emas "yuzaki" strategiyalar.
   r — inspect() natijasi (panjara va variantlar rasmdan o'qilgan). */
const freq = (r, o) => { const vis = r.grid.flat().filter(Boolean); return ATTRS.reduce((s, a) => s + vis.filter(p => p[a] === o[a]).length, 0); };
const lastSim = (r, o) => r.grid[r.n - 1].filter(Boolean).reduce((s, p) => s + ATTRS.filter(a => p[a] === o[a]).length, 0);
const firstOr0 = i => (i < 0 ? 0 : i);
const SHALLOW = {
  'panjaradagi biror katakning aynan nusxasi': r => { const g = new Set(r.grid.flat().filter(Boolean).map(keyOf)); return firstOr0(r.keys.findIndex(k => g.has(k))); },
  'panjarada nusxasi yo\'q variant': r => { const g = new Set(r.grid.flat().filter(Boolean).map(keyOf)); return firstOr0(r.keys.findIndex(k => !g.has(k))); },
  'qiymatlari panjarada eng ko\'p uchraydigan': r => argmax(r.opts.map(o => freq(r, o))),
  'qiymatlari panjarada eng kam uchraydigan': r => argmin(r.opts.map(o => freq(r, o))),
  'hamma qiymati panjarada bor': r => { const vis = r.grid.flat().filter(Boolean); return firstOr0(r.opts.findIndex(o => ATTRS.every(a => vis.some(p => p[a] === o[a])))); },
  'oxirgi qatorga eng o\'xshash': r => argmax(r.opts.map(o => lastSim(r, o))),
  'oxirgi qatorga eng kam o\'xshash': r => argmin(r.opts.map(o => lastSim(r, o))),
  'yuqoridagi katakka eng o\'xshash': r => { const up = r.grid[r.n - 2][r.n - 1]; return argmax(r.opts.map(o => ATTRS.filter(a => up[a] === o[a]).length)); },
};

/* ═════════════════════════════════════════════════════════════════════ */

test('ro\'yxatda bor, nomi uz/ru', () => {
  assert.ok(G, 'matrix generatori ro\'yxatdan o\'tmagan');
  assert.ok(IQ.types().includes('matrix'));
  assert.equal(G.label.uz, 'Matritsalar');
  assert.equal(G.label.ru, 'Матрицы');
  assert.equal(G.label.en, 'Matrices');
  assert.deepEqual(plain(G.langs), ['uz', 'ru', 'en']);
  if (IQ.langsOf) assert.deepEqual(plain(IQ.langsOf('matrix')), ['uz', 'ru', 'en']);
});

/* ── Til sifati: uz imlosi (oʻ/gʻ — ʻ), en bor va unga uz/ru aralashmagan ── */
const UZ_WORDS = /\b(va|har|bir|ga|bilan|qator|qatorda|katak|katakka|shakl|shakli|javob|qoida|qoidaga|emas|keyingi|hamma|uchinchi)\b/i;
function langErrs(v, where) {
  const e = [];
  for (const lang of ['uz', 'ru', 'en']) {
    if (typeof v[lang] !== 'string' || !v[lang].trim()) e.push(where + ': ' + lang + ' yoʻq');
    else if (v[lang] !== v[lang].trim() || / {2}|undefined|NaN|null|\[object|\$\{/.test(v[lang])) e.push(where + ': ' + lang + ' buzuq: ' + v[lang]);
  }
  if (e.length) return e;
  const { uz, en } = v;
  if (/['’‘`]/.test(uz)) e.push(where + ': uz da oddiy apostrof (oʻ/gʻ — ʻ, tutuq — ʼ): ' + uz);
  if (/[^oOgG]ʻ/.test(uz) || /[oOgG]ʼ/.test(uz)) e.push(where + ': uz da ʻ/ʼ notoʻgʻri: ' + uz);
  if (/[а-яёўқғҳ]/i.test(uz)) e.push(where + ': uz da kirill: ' + uz);
  if (/[а-яёўқғҳʻʼ]/i.test(en)) e.push(where + ': en da kirill yoki ʻ/ʼ: ' + en);
  if (UZ_WORDS.test(en)) e.push(where + ': en da oʻzbekcha soʻz: ' + en);
  if (/[a-zа-я]{3}/i.test(uz) && en === uz) e.push(where + ': en = uz');
  return e;
}

test('til: uz imlosi (ʻ), en bor va toza; savol qisqa (uz ≤ 60 belgi)', () => {
  assert.deepEqual(langErrs(G.label, 'label'), []);
  for (const L of LEVELS) {
    for (const { seed, item } of batch(L)) {
      const errs = langErrs(item.prompt, 'prompt').concat(langErrs(item.explain, 'explain'));
      assert.deepEqual(errs, [], `level ${L}, seed ${seed}`);
      assert.ok([...item.prompt.uz].length <= 60 && [...item.prompt.ru].length <= 64 && [...item.prompt.en].length <= 64, 'savol uzun');
      assert.ok(/[.]$/.test(item.explain.en));
    }
  }
  // tekshirgich tishlaydi
  assert.ok(langErrs({ uz: "Bo'sh", ru: 'а', en: 'x' }, 't').length > 0);
  assert.ok(langErrs({ uz: 'Boʻsh', ru: 'а', en: 'har qatorda' }, 't').length > 0);
  assert.ok(langErrs({ uz: 'Boʻsh', ru: 'а' }, 't').length > 0);
});

test('har darajada 2000 urug\': makeItem yiqilmaydi, validateItem bo\'sh, shakl to\'g\'ri', () => {
  for (const L of LEVELS) {
    for (const { seed, item } of batch(L)) {
      assert.deepEqual(plain(IQ.validateItem(item)), [], `level ${L}, seed ${seed}`);
      assert.equal(item.id, `matrix:${L}:${seed}`);
      assert.equal(item.type, 'matrix');
      assert.equal(item.level, L);
      assert.equal(item.stimulus.kind, 'svg');
      assert.ok(item.options.every(o => o.kind === 'svg'));
      assert.ok(item.prompt.uz && item.prompt.ru);
    }
  }
  for (const seed of [0, 1, 0xFFFFFFFF, 0x80000000]) {
    for (const L of [0, 1, 10, 11]) {
      const it = IQ.makeItem('matrix', seed, L);
      assert.equal(it.level, Math.min(10, Math.max(1, L)));
    }
  }
});

test('RASMDAN: har atributga yagona bashorat; to\'g\'ri variant hammasiga mos; har distraktor kamida bittasini buzadi; izoh rasmga mos', () => {
  const famSeen = {};
  for (const L of LEVELS) {
    for (const { seed, item } of batch(L)) {
      const r = inspect(item);
      assert.deepEqual(r.errs, [], `level ${L}, seed ${seed}: ${r.errs.join('; ')}`);
      for (const a of r.varying) {
        for (const f of r.fits[a]) if (f.dir === 'row') famSeen[a + ':' + f.fam] = (famSeen[a + ':' + f.fam] || 0) + 1;
      }
    }
  }
  // Hamma qoida oilasi haqiqatan uchraydi (kutubxona "o'lik" emas).
  for (const k of ['count:step', 'count:d3', 'count:sum', 'count:diff', 'size:step', 'size:d3', 'shape:d3', 'shape:same',
    'fill:d3', 'rot:step', 'rot:d3', 'pos:step', 'pos:d3', 'lines:union', 'lines:minus', 'lines:xor', 'lines:inter']) {
    assert.ok(famSeen[k] > 20, `${k} deyarli uchramaydi: ${famSeen[k]}`);
  }
});

test('generator biladi: plan() dagi to\'g\'ri javob, qoida turi va har distraktor buzgan atributlar = rasmdan topilgani', () => {
  const FAM = { const: 'all', row: 'same', col: 'same', prog: 'step', d3: 'd3', or: 'union', sub: 'minus', xor: 'xor', and: 'inter' };
  for (const L of LEVELS) {
    for (const { seed, item } of batch(L).slice(0, N_PLAN)) {
      const r = inspect(item), p = G.plan(seed, L);
      assert.equal(p.correct, item.correct);
      assert.equal(p.options.length, item.options.length);
      p.options.forEach((o, i) => {
        assert.deepEqual(plain(o.viol).sort(), r.viol[i].slice().sort(), `level ${L}, seed ${seed}, ${LETTERS[i]}`);
        if (i !== p.correct) assert.ok(o.viol.length >= 1);
      });
      for (const a of ATTRS) {
        const rule = p.rules[a];
        if (!rule) { assert.ok(!r.varying.includes(a), `${a} rejada yo'q, rasmda o'zgaradi`); continue; }
        const fam = rule.fam === 'arith' ? (rule.op === 'add' ? 'sum' : 'diff') : FAM[rule.fam];
        const dir = rule.fam === 'col' ? 'col' : 'row';
        if (fam === 'all') { assert.ok(!r.varying.includes(a), `L${L} seed ${seed}: ${a} o'zgarmas deyilgan`); continue; }
        assert.ok(r.varying.includes(a), `L${L} seed ${seed}: ${a} o'zgaruvchi deyilgan, rasmda o'zgarmaydi`);
        assert.ok(r.fits[a].some(f => f.fam === fam && f.dir === dir && f.pred === r.pred[a]),
          `L${L} seed ${seed}: ${a} — rejada ${rule.fam}, rasmda ${r.fits[a].map(f => f.fam + '@' + f.dir).join(', ')}`);
      }
      // Reja aytgan "o'zgaruvchi atributlar" = rasmda o'zgarayotganlar.
      assert.deepEqual(plain(p.varying), r.varying, `level ${L}, seed ${seed}`);
      // Rejadagi har katak va variant = rasmda chizilgani ("rejada to'g'ri, rasmda xato" yo'q).
      const same = (d, q, where) => {
        const want = {
          shape: SHAPE_ORDER[d.shape], count: d.count, fill: FILL_ORDER[d.fill], rot: d.rot,
          pos: d.pos < 0 ? 'c' : d.pos, lines: LINE_NAMES.filter((_, b) => d.lines & (1 << b)).sort().join(','),
        };
        if (r.sizeGroups > 1) want.size = d.size;       // bitta o'lcham bo'lsa daraja nisbiy
        for (const a in want) assert.equal(q[a], want[a], `L${L} seed ${seed} ${where}: ${a}`);
      };
      p.cells.forEach((row, i) => row.forEach((d, j) => { if (r.grid[i][j]) same(d, r.grid[i][j], `katak ${i},${j}`); }));
      p.options.forEach((o, i) => same(o.desc, r.opts[i], LETTERS[i]));
    }
  }
});

test('variantlar juft-juft farqli (kanonik tavsif bo\'yicha, SVG satri emas)', () => {
  for (const L of LEVELS) {
    for (const { seed, item } of batch(L)) {
      const r = inspect(item);
      assert.equal(new Set(r.keys).size, r.keys.length, `level ${L}, seed ${seed}`);
    }
  }
});

test('to\'g\'ri javob o\'rni tekis: har darajada 2000 urug\'da 1/k ± 0.04', () => {
  for (const L of LEVELS) {
    const b = batch(L), k = b[0].item.options.length;
    const cnt = new Array(k).fill(0);
    for (const { item } of b) { assert.equal(item.options.length, k); cnt[item.correct]++; }
    cnt.forEach((c, i) => assert.ok(Math.abs(c / N - 1 / k) <= 0.04,
      `level ${L}: ${LETTERS[i]} o'rni ${(c / N).toFixed(3)} (kutilgan ${(1 / k).toFixed(3)})`));
  }
});

test('ko\'r yechuvchi (faqat variantlar) tasodifdan yuqori topa olmaydi — "markaz"/"moda" ham', (t) => {
  const report = [];
  for (const L of LEVELS) {
    const b = batch(L), k = b[0].item.options.length;
    for (const [name, solve] of Object.entries(BLIND)) {
      const acc = b.filter(({ item }) => solve(blindView(inspect(item).opts), item) === item.correct).length / b.length;
      report.push(`L${L} k=${k} ${name}: ${acc.toFixed(3)}`);
      assert.ok(acc <= 1 / k + 0.04, `level ${L}, "${name}": aniqlik ${acc.toFixed(3)} > tasodif ${(1 / k).toFixed(3)} + 0.04`);
    }
  }
  for (const line of report) t.diagnostic(line);
});

test('yuzaki (panjarani ko\'radigan, qoidani emas) strategiyalar ham ishonchli emas', (t) => {
  const report = [], bad = [];
  for (const L of LEVELS) {
    const b = batch(L), k = b[0].item.options.length;
    for (const [name, solve] of Object.entries(SHALLOW)) {
      const acc = b.filter(({ item }) => solve(inspect(item)) === item.correct).length / b.length;
      report.push(`L${L} k=${k} ${name}: ${acc.toFixed(3)}`);
      /* Bu strategiyalar qisman "fikrlash" (masalan, qiymatlar panjarada
         uchraydimi) — tasodifdan biroz yuqori bo'lishi tabiiy, lekin
         qoidani topmasdan savolni ishonchli yechib bo'lmasligi shart.
         1–2-darajada bitta qoida "qatorda bir xil" — u yerda katakni
         ko'chirish qoidaning O'ZI, shuning uchun faqat 3+ darajada. */
      if (L >= 3 && acc > 1 / k + 0.25) bad.push(`level ${L}, "${name}": aniqlik ${acc.toFixed(3)}`);
    }
  }
  for (const line of report) t.diagnostic(line);
  assert.deepEqual(bad, []);
});

test('ko\'r yechuvchi haqiqatan tishlaydi: "to\'g\'ri + bittadan o\'zgartirilgan" klassik to\'plamni darhol topadi', () => {
  /* Klassik yomon generator: to'g'ri javob, har distraktorda bitta atribut
     boshqa qiymatga. Bizning "markaz" yechuvchimiz buni ~100% topishi kerak
     — aks holda yuqoridagi "tasodif darajasida" natija hech narsani
     isbotlamaydi. */
  let hit = 0, total = 0;
  for (const L of [3, 6, 9]) {
    for (const { seed, item } of batch(L).slice(0, 300)) {
      const r = { opts: blindView(inspect(item).opts) }, c = r.opts[item.correct];
      const k = r.opts.length, attrs = BA.filter(a => r.opts.some(o => o[a] !== c[a]));
      const bad = [];
      for (let i = 0; bad.length < k - 1; i++) {
        const a = attrs[i % attrs.length], other = r.opts.find(o => o[a] !== c[a] && !bad.some(x => x[a] === o[a] && BA.every(b => b === a || x[b] === c[b])));
        if (!other) { bad.push(Object.assign({}, c, { [a]: 'x' + i })); continue; }
        bad.push(Object.assign({}, c, { [a]: other[a] }));
      }
      const pos = seed % k, set = bad.slice();
      set.splice(pos, 0, c);
      total++;
      if (BLIND['eng ko\'p umumiy atributli ("markaz", moda)'](set) === pos) hit++;
    }
  }
  assert.ok(hit / total > 0.9, 'ko\'r yechuvchi klassik naqshni topmadi: ' + hit / total);
});

test('determinizm: bir xil (seed, level) → baytma-bayt bir xil; yangi muhitda ham', () => {
  const IQ2 = load();
  for (const L of LEVELS) {
    for (const seed of SEEDS.slice(0, 150)) {
      const a = IQ.makeItem('matrix', seed, L), b = IQ.makeItem('matrix', seed, L), c = IQ2.makeItem('matrix', seed, L);
      assert.equal(JSON.stringify(a), JSON.stringify(b));
      assert.equal(JSON.stringify(a), JSON.stringify(c), `level ${L}, seed ${seed}: boshqa muhitda boshqa savol`);
    }
  }
  // Har xil urug' — har xil savol (generator urug'ni e'tiborsiz qoldirmaydi).
  for (const L of [1, 5, 10]) {
    const svgs = new Set(SEEDS.slice(0, 200).map(s => IQ.makeItem('matrix', s, L).stimulus.svg));
    assert.ok(svgs.size > 190, `L${L}: ${svgs.size}`);
  }
  const src = read('src/iq/gen/matrix.js');
  assert.ok(!/Math\.random|Date\.now/.test(src));
});

test('SVG qoidalari: oq fon, ruxsat etilgan ranglar, skript/tashqi havola yo\'q, o\'lchami kichik', () => {
  const ALLOWED = new Set(['#fff', '#1c1b29', '#8a8799']);
  let maxS = 0, maxO = 0;
  for (const L of LEVELS) {
    for (const { item } of batch(L)) {
      const s = item.stimulus.svg;
      assert.ok(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 (\d+) (\d+)"><rect width="\1" height="\2" fill="#fff"\/>/.test(s), 'stimul boshi');
      maxS = Math.max(maxS, s.length);
      for (const svg of [s, ...item.options.map(o => o.svg)]) {
        for (const c of svg.match(/#[0-9a-fA-F]{3,6}\b/g)) assert.ok(ALLOWED.has(c), 'ruxsat etilmagan rang ' + c);
        assert.ok(!/<script|\son\w+=|href|foreignObject|<image|<style/i.test(svg));
        assert.ok(!/NaN|undefined|Infinity/.test(svg), 'buzuq son');
      }
      for (const o of item.options) maxO = Math.max(maxO, o.svg.length);
    }
  }
  assert.ok(maxS <= 7000, 'stimul SVG juda katta: ' + maxS);
  assert.ok(maxO <= 1200, 'variant SVG juda katta: ' + maxO);
});

test('rang yagona farq emas: bo\'yoq faqat bo\'sh/to\'la/shtrix, shakl chizig\'i siyoh, kulrang faqat panjarada', () => {
  // Ikkala "rang" ham deyarli neytral kulrang (to'yinganligi past): qizil–yashil yo'q.
  for (const c of ['#1c1b29', '#8a8799']) {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
    assert.ok(Math.max(r, g, b) - Math.min(r, g, b) <= 0x14, c);
  }
  for (const L of LEVELS) {
    for (const { item } of batch(L).slice(0, 300)) {
      for (const svg of [item.stimulus.svg, ...item.options.map(o => o.svg)]) {
        for (const m of svg.matchAll(/<(circle|polygon) [^>]*fill="([^"]+)"/g)) assert.ok(m[2] in FILLS, m[2]);
        for (const m of svg.matchAll(/<g transform[^>]*>/g)) assert.ok(m[0].includes('stroke="#1c1b29"'));
        // Kulrang faqat katak ramkasi va "?" da — variantda umuman yo'q.
        const grayTags = [...svg.matchAll(/<(\w+)[^>]*#8a8799[^>]*>/g)].map(m => m[1]);
        assert.ok(grayTags.every(t => t === 'rect' || t === 'text'), grayTags.join(','));
      }
      assert.ok(item.options.every(o => !o.svg.includes('#8a8799')));
      // Variantlar kulrangni siyohga almashtirgandan keyin ham farqli (rang yorliq emas).
      const keys = item.options.map(o => { const e = []; const p = panelsOf(o.svg.replace(/#8a8799/g, '#1c1b29'), e)[0].p; return keyOf(Object.assign(p, { size: p.raw })); });
      assert.equal(new Set(keys).size, keys.length);
    }
  }
});

test('daraja murakkablikni oshiradi: panjara, variantlar soni, o\'zgaruvchi atributlar, qoida murakkabligi', (t) => {
  const W = { same: 1, step: 2, d3: 2, sum: 3, diff: 3, union: 3, minus: 3, xor: 4, inter: 4 };
  const stat = LEVELS.map(L => {
    const rs = batch(L).map(({ item }) => inspect(item));
    const mean = f => rs.reduce((s, r) => s + f(r), 0) / rs.length;
    // Qoida og'irligi: rasmdan topilgan (qatorlar bo'yicha) eng "oddiy" mos oila.
    const cx = r => r.varying.reduce((s, a) => s + Math.min(...r.fits[a].filter(f => f.dir === 'row' || f.dir === 'col').map(f => W[f.fam] || 5)), 0);
    return {
      L, n: mean(r => r.n), k: mean(r => r.opts.length), vary: mean(r => r.varying.length), cx: mean(cx),
      lines: mean(r => (r.varying.includes('lines') ? 1 : 0)),
    };
  });
  for (const s of stat) t.diagnostic(`L${s.L}: n=${s.n} k=${s.k} o'zgaruvchi=${s.vary.toFixed(2)} murakkablik=${s.cx.toFixed(2)} chiziqlar=${s.lines.toFixed(2)}`);
  assert.equal(stat[0].n, 2);
  stat.slice(1).forEach(s => assert.equal(s.n, 3));
  for (let i = 1; i < stat.length; i++) {
    const a = stat[i - 1], b = stat[i];
    assert.ok(b.k >= a.k, `variantlar soni kamaydi: L${a.L}→L${b.L}`);
    assert.ok(b.vary >= a.vary - 1e-9, `o'zgaruvchi atributlar kamaydi: L${a.L}→L${b.L}`);
    assert.ok(b.cx > a.cx, `qoida murakkabligi oshmadi: L${a.L}→L${b.L} (${a.cx.toFixed(2)} → ${b.cx.toFixed(2)})`);
  }
  assert.ok(stat[9].vary >= 4 && stat[0].vary === 1);
  assert.ok(stat.slice(0, 6).every(s => s.lines === 0), 'chiziqlar faqat 7+ darajada');
  assert.ok(stat[7].lines === 1 && stat[9].lines === 1);
});

test('b: IQ.levelToB(level) ± 0.75; bir darajada murakkabroq savol — qiyinroq', () => {
  for (const L of LEVELS) {
    const rows = batch(L).slice(0, N_PLAN).map(({ seed, item }) => ({ b: item.b, cx: G.plan(seed, L).cx }));
    for (const { b } of rows) assert.ok(Math.abs(b - IQ.levelToB(L)) <= 0.75);
    const med = rows.map(x => x.cx).sort((p, q) => p - q)[rows.length >> 1];
    const hi = rows.filter(x => x.cx > med), lo = rows.filter(x => x.cx < med);
    const avg = a => a.reduce((s, x) => s + x.b, 0) / a.length;
    if (hi.length > 20 && lo.length > 20) assert.ok(avg(hi) > avg(lo), `level ${L}`);
  }
});

test('izoh: uz/ru, harf to\'g\'ri, qoidalar va distraktor xatolari aniq (misol)', () => {
  const item = batch(8)[0].item, r = inspect(item);
  assert.deepEqual(r.errs, []);
  assert.match(item.explain.uz, /^[A-F] — toʻgʻri javob\. Qoidalar: /);
  assert.match(item.explain.en, /^[A-F] is correct\. Rules: /);
  assert.match(item.explain.ru, /^[A-F] — правильный ответ\. Правила: /);
  assert.ok(/qoidaga mos emas\./.test(item.explain.uz) && /не подходит: /.test(item.explain.ru) && / — wrong /.test(item.explain.en));
  // Har o'zgaruvchi atribut izohda o'z qoidasi bilan.
  for (const a of r.varying) assert.ok(r.ex.rules[a], a);
});

/* ── Tekshirgich o'zi tishlaydi: buzilgan savollarni ushlaydi ──────── */

test('tekshirgich: qoidalar kutubxonasi ikki ma\'noli panjarani ushlaydi', () => {
  const pr = (a, g) => uniq(fitsOf(a, g).map(f => f.pred));
  // son: qatorlar 1,2,3 va 1,2,3 → "uchtadan biri" 3 deydi; oxirgi qator 2,1 → progressiya 0 deydi
  assert.deepEqual(pr('count', [[1, 2, 3], [1, 2, 3], [2, 1, null]]).sort(), [0, 3]);
  // son: (1,2,3), (2,1,3) → qo'shish ham, "uchtadan biri" ham; (2,2,?) → qo'shish 4, d3 mos emas — bitta
  assert.deepEqual(pr('count', [[1, 2, 3], [2, 1, 3], [2, 2, null]]), [4]);
  // (1,2,3), (2,3,4), (3,4,?) → progressiya 5; ustunlar ham 5 — bitta javob
  assert.deepEqual(pr('count', [[1, 2, 3], [2, 3, 4], [3, 4, null]]), [5]);
  // chiziqlar: kesishmasiz qatorlarda ∪ va ⊕ bir xil natija beradi — ikkalasi mos, lekin oxirgi qatorda farq qiladi
  const g = [['T1', 'R1', 'R1,T1'], ['B1', 'L1', 'B1,L1'], ['T1,T2', 'T2', null]];
  assert.deepEqual(pr('lines', g).sort(), ['T1', 'T1,T2']);
  // diagonal oilasi: lotin kvadrati diagonallari
  assert.deepEqual(pr('shape', [['a', 'b', 'c'], ['b', 'c', 'a'], ['c', 'a', null]]), ['b']);
});

test('tekshirgich: buzilgan savollarni ushlaydi (distraktor = javob, rang, masshtab, izoh, joy)', () => {
  const base = batch(6).map(x => x.item).find(it => inspect(it).errs.length === 0 && /<circle/.test(it.options[it.correct].svg)
    && inspect(it).opts[it.correct].count >= 2);
  assert.ok(base);
  assert.deepEqual(inspect(base).errs, []);
  const clone = it => JSON.parse(JSON.stringify(it));
  const other = it => (it.correct + 1) % it.options.length;
  const hasErr = (it, re) => inspect(it).errs.some(e => re.test(e));

  // 1) distraktor o'rniga to'g'ri javob, lekin shakllar TESKARI tartibda (SVG satri boshqa)
  let m = clone(base);
  const c = m.options[m.correct].svg;
  const objs = c.match(/<circle [^>]*\/>/g);
  m.options[other(m)].svg = c.replace(objs.join(''), objs.slice().reverse().join(''));
  assert.notEqual(m.options[other(m)].svg, c);
  assert.ok(hasErr(m, /ikki variant bir xil/));
  assert.ok(hasErr(m, /hamma qoidaga mos/));

  // 2) ruxsat etilmagan bo'yoq (rang bilan farq)
  m = clone(base); m.options[0].svg = m.options[0].svg.replace(/(<(?:circle|polygon) [^>]*fill=")[^"]+"/, '$1#e33"');
  assert.ok(hasErr(m, /ruxsat etilmagan bo'yoq/));

  // 3) bitta variantda masshtab boshqacha
  m = clone(base); m.options[0].svg = m.options[0].svg.replace(/ r="([\d.]+)"/g, (_, r) => ' r="' + (r * 0.9).toFixed(1) + '"');
  assert.ok(hasErr(m, /bitta masshtabga tushmaydi|ustma-ust|qoidaga mos emas|bir xil/));

  // 4) izoh: harf / distraktor xatosi noto'g'ri
  m = clone(base); m.correct = other(m);
  assert.ok(inspect(m).errs.length > 0);
  m = clone(base); m.explain.uz = m.explain.uz.replace(/^[A-F]/, L => (L === 'A' ? 'B' : 'A'));
  assert.ok(hasErr(m, /izohdagi harf/));
  m = clone(base);
  m.explain.uz = m.explain.uz.replace(/ — ([^.]+?) qoidaga mos emas\./, (s, x) => ' — ' + (x === 'shakli' ? 'soni' : 'shakli') + ' qoidaga mos emas.');
  assert.ok(hasErr(m, /izoh \(uz\)/));

  // 5) panjaradagi bitta katak buzildi (shakl ko'chdi) → qoida topilmaydi yoki javob boshqa
  m = clone(base);
  m.stimulus.svg = m.stimulus.svg.replace(/<circle cx="([\d.]+)"/, (_, x) => '<circle cx="' + (Number(x) + 4) + '"');
  assert.ok(inspect(m).errs.length > 0);

  // 6) "?" katagi yo'q
  m = clone(base); m.stimulus.svg = m.stimulus.svg.replace('>?</text>', '>!</text>');
  assert.ok(hasErr(m, /"\?" katagi/));
});

test('tekshirgich: o\'rin tekisligi va ko\'r yechuvchi "doim A" generatorini ushlaydi', () => {
  // Hamma to'g'ri javobni A ga ko'chirsak — tekislik testi yiqilishi shart.
  const b = batch(4), k = b[0].item.options.length;
  const cnt = new Array(k).fill(0);
  for (const { item } of b) cnt[0]++;
  assert.ok(cnt.some(c => Math.abs(c / N - 1 / k) > 0.04));
  // "birinchi variant" yechuvchisi bunday generatorda 100%
  const acc = b.filter(() => BLIND['birinchi variant']() === 0).length / b.length;
  assert.equal(acc, 1);
});
