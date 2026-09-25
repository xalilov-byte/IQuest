/* ─────────────────────────────────────────────────────────────────────────
   gen/spatial.js — fazoviy tafakkur savollari (aqlda aylantirish)

   NIMA UCHUN TEST SVG'NI O'ZI O'QIYDI: generatorning ichki rejasiga
   (kataklar, rollar) ishonib tekshirsak, "rejada to'g'ri, rasmda xato"
   holatini ko'rmay qolamiz — foydalanuvchi esa faqat rasmni ko'radi.
   Shuning uchun har bir kafolat RASMDAN tiklanadi: <polygon>lardan katak
   markazlari, burchagi, tomoni olinadi, to'rga qaytariladi va shu
   yerdagi mustaqil geometriya (generatordagidan boshqa kod, boshqa
   ko'zgu o'qi) bilan solishtiriladi.

   Asosiy xavflar (IQ testida jimgina natijani buzadigan):
     · shakl simmetrik → "ko'zgu aksi" ham burilgan nusxa → 2 to'g'ri javob;
     · variantlar naqshi javobni aytib qo'yadi (masalan "to'g'ri + 3 ta
       ko'zgu": uchtasi bir xil, bittasi boshqacha) — stimulsiz topiladi;
     · to'g'ri javob o'rni notekis; masshtab/markaz farqi yorliq bo'ladi;
     · izohdagi harf yoki burchak rasmga mos emas.

   Ishga tushirish:  node --test tests/iq-spatial.test.mjs
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const FILES = ['src/iq/rng.js', 'src/iq/index.js', 'src/iq/gen/spatial.js'];
const read = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');

/* Brauzer taqlidi: window === global. Math.random chaqirilsa darhol
   yiqiladi — tasodif faqat IQ.rng dan bo'lishi shart (determinizm). */
function load() {
  const ctx = { console };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext('Math.random = function () { throw new Error("Math.random taqiqlangan"); };', ctx);
  for (const f of FILES) vm.runInContext(read(f), ctx, { filename: f });
  return ctx.IQ;
}
const IQ = load();
const G = IQ.generator('spatial');
/* vm realm'idagi obyektlar boshqa prototipga ega — deepEqual uchun. */
const plain = x => JSON.parse(JSON.stringify(x));

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const N = 2000;
const SEEDS = Array.from({ length: N }, (_, i) => Math.imul(i + 1, 2654435761) >>> 0);
/* Og'ir tekshiruvlar (bir-katak-ko'chirish sinflari, reja) uchun kichikroq
   to'plam — baribir har darajada yuzlab savol. */
const N_ROLES = 400;
const LETTERS = 'ABCDEF';

const cache = new Map();
function batch(level) {
  if (!cache.has(level)) {
    cache.set(level, SEEDS.map(seed => ({ seed, item: IQ.makeItem('spatial', seed, level) })));
  }
  return cache.get(level);
}

/* ── Mustaqil geometriya (generator kodidan foydalanmaydi) ─────────── */

const DIR4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function tNorm(cells) {
  const mx = Math.min(...cells.map(c => c[0])), my = Math.min(...cells.map(c => c[1]));
  return cells.map(([x, y]) => [x - mx, y - my]);
}
/* Kalit: siljitilgan kataklar raqamlari (x·64 + y), saralangan. Generator
   bitmaskadan foydalanadi — bu yerda ataylab boshqa ko'rinish. */
function tKey(cells) {
  let mx = Infinity, my = Infinity;
  for (const [x, y] of cells) { if (x < mx) mx = x; if (y < my) my = y; }
  return cells.map(([x, y]) => (x - mx) * 64 + (y - my)).sort((a, b) => a - b).join(',');
}
/* (x, y) → (−y, x): y pastga qaragan ekranda SOAT MILI BO'YICHA 90°. */
const tRot = cells => cells.map(([x, y]) => [-y, x]);
const tRotN = (cells, n) => { let c = cells; for (let i = 0; i < ((n % 4) + 4) % 4; i++) c = tRot(c); return c; };
/* Ko'zgu — generatordagidan BOSHQA o'q bo'yicha (y → −y). Burilish sinfi
   uchun o'qning farqi yo'q; farq bo'lsa, bu xatoni ushlaydi. */
const tMirror = cells => cells.map(([x, y]) => [x, -y]);
const tRotClass = cells => [0, 1, 2, 3].map(n => tKey(tRotN(cells, n))).sort()[0];
const tFreeClass = cells => [tRotClass(cells), tRotClass(tMirror(cells))].sort()[0];
function tConnected(cells) {
  const keys = new Set(cells.map(([x, y]) => x + ':' + y));
  const seen = new Set([cells[0][0] + ':' + cells[0][1]]), st = [cells[0]];
  while (st.length) {
    const [x, y] = st.pop();
    for (const [dx, dy] of DIR4) {
      const k = (x + dx) + ':' + (y + dy);
      if (keys.has(k) && !seen.has(k)) { seen.add(k); st.push([x + dx, y + dy]); }
    }
  }
  return seen.size === keys.size;
}
/* Bitta katakni boshqa joyga ko'chirib olinadigan shakllar sinflari.
   Natija faqat shaklning burilish sinfiga bog'liq — shu bo'yicha eslab
   qolinadi (ko'r yechuvchi bir shaklni bir necha marta so'raydi). */
const oneMoveMemo = new Map();
function tOneMoves(cells) {
  const key = tRotClass(cells);
  if (!oneMoveMemo.has(key)) oneMoveMemo.set(key, tOneMovesRaw(cells));
  return oneMoveMemo.get(key);
}
function tOneMovesRaw(cells) {
  const out = new Set();
  cells.forEach((c, i) => {
    const rest = cells.filter((_, j) => j !== i);
    if (!tConnected(rest)) return;
    const keys = new Set(rest.map(([x, y]) => x + ':' + y)), seen = new Set();
    for (const [x, y] of rest) {
      for (const [dx, dy] of DIR4) {
        const nx = x + dx, ny = y + dy, k = nx + ':' + ny;
        if (keys.has(k) || seen.has(k) || (nx === c[0] && ny === c[1])) continue;
        seen.add(k);
        out.add(tRotClass(rest.concat([[nx, ny]])));
      }
    }
  });
  return out;
}
const dims = cells => {
  const n = tNorm(cells);
  const w = Math.max(...n.map(c => c[0])) + 1, h = Math.max(...n.map(c => c[1])) + 1;
  return Math.min(w, h) + 'x' + Math.max(w, h);
};

/* ── SVG'ni o'qish ─────────────────────────────────────────────────── */

function parseSvg(svg) {
  const vb = /viewBox="([^"]+)"/.exec(svg)[1].trim().split(/\s+/).map(Number);
  const groups = [];
  for (const m of svg.matchAll(/<g ([^>]*)>([\s\S]*?)<\/g>/g)) {
    const polys = [...m[2].matchAll(/<polygon points="([^"]+)"\/>/g)].map(p => {
      const a = p[1].trim().split(/[\s,]+/).map(Number), q = [];
      for (let i = 0; i < a.length; i += 2) q.push([a[i], a[i + 1]]);
      return q;
    });
    groups.push({ dashed: /stroke-dasharray/.test(m[1]), polys });
  }
  return { vb, groups };
}

/* Ko'pburchaklar → { side, phi (0|45), cells (to'rga qaytarilgan), box }.
   Kataklar tartibi saqlanadi (taxta/teshikni ajratish uchun). */
function readShape(polys) {
  const errs = [];
  const [p0, p1] = polys[0];
  const side = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  const raw = ((Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) * 180 / Math.PI) % 90 + 90) % 90;
  const phi = (Math.round(raw / 45) * 45) % 90;
  const dev = Math.abs(raw - Math.round(raw / 45) * 45);
  if (dev > 0.3) errs.push('katak burchagi 45° karrasi emas: ' + raw.toFixed(2));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const q of polys) {
    if (q.length !== 4) { errs.push('katak 4 burchakli emas'); continue; }
    for (let i = 0; i < 4; i++) {
      const a = q[i], b = q[(i + 1) % 4];
      if (Math.abs(Math.hypot(b[0] - a[0], b[1] - a[1]) - side) > 0.05) errs.push('katak tomonlari har xil');
      x0 = Math.min(x0, a[0]); x1 = Math.max(x1, a[0]); y0 = Math.min(y0, a[1]); y1 = Math.max(y1, a[1]);
    }
    const d1 = Math.hypot(q[2][0] - q[0][0], q[2][1] - q[0][1]), d2 = Math.hypot(q[3][0] - q[1][0], q[3][1] - q[1][1]);
    if (Math.abs(d1 - d2) > 0.05) errs.push('katak kvadrat emas');
  }
  const t = -phi * Math.PI / 180, c = Math.cos(t), s = Math.sin(t);
  const centers = polys.map(q => {
    const mx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, my = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4;
    return [(mx * c - my * s) / side, (mx * s + my * c) / side];
  });
  let off = 0;
  const cells = centers.map(([u, v]) => {
    const du = u - centers[0][0], dv = v - centers[0][1];
    const iu = Math.round(du), iv = Math.round(dv);
    off = Math.max(off, Math.abs(du - iu), Math.abs(dv - iv));
    return [iu, iv];
  });
  if (off > 0.02) errs.push('kataklar to\'rga tushmaydi (' + off.toFixed(3) + ')');
  if (new Set(cells.map(([x, y]) => x + ':' + y)).size !== cells.length) errs.push('ikki katak ustma-ust');
  return { side, phi, cells: tNorm(cells), box: { x0, y0, x1, y1 }, errs };
}

/* ── Izohni o'qish ─────────────────────────────────────────────────── */

const HEAD_UZ = /^([A-F]) — (?:asl shakl|bo'sh joy shakli)ning (?:soat mili bo'yicha (\d+)°|soat miliga teskari (\d+)°|(180)°) ga burilgani\./;
const HEAD_RU = /^([A-F]) — (?:исходная фигура|форма пустого места), повёрнутая на (\d+)°( по часовой стрелке| против часовой стрелки|)\./;
const ROLE_UZ = [["ko'zgudagi aksi: ", 'mirror'], ["ko'zgudagi aksi, ustiga", 'moved-mirror'],
  ['boshqa shakl: bitta', 'moved'], ['boshqa shakl: katakchalar', 'other']];
const ROLE_RU = [['зеркальное отражение: ', 'mirror'], ['зеркальное отражение, к тому же', 'moved-mirror'],
  ['другая фигура: одна клетка', 'moved'], ['другая фигура: клетки', 'other']];

function readExplain(text, head, roles, lang) {
  const m = head.exec(text);
  if (!m) return null;
  let letter = m[1], theta;
  if (lang === 'uz') theta = m[2] ? +m[2] : m[3] ? -m[3] : 180;
  else theta = m[3] === ' против часовой стрелки' ? -m[2] : +m[2];
  const groups = {};
  const rest = text.slice(m[0].length);
  for (const g of rest.matchAll(/([A-F](?:, [A-F])*(?: (?:va|и) [A-F])?) — ([^.]+)\./g)) {
    const r = roles.find(([p]) => g[2].startsWith(p));
    for (const L of g[1].match(/[A-F]/g)) groups[L] = r ? r[1] : '??';
  }
  return { letter, theta, groups };
}

/* ── Savolni rasmdan to'liq tekshirish ─────────────────────────────── */

const inspectCache = new WeakMap();
function inspect(item, opt = {}) {
  const hit = inspectCache.get(item);
  if (hit && (hit.roles || !opt.roles)) return hit;
  const r = inspectRaw(item, opt);
  inspectCache.set(item, r);
  return r;
}
function inspectRaw(item, opt) {
  const errs = [...IQ.validateItem(item)];
  const st = parseSvg(item.stimulus.svg);
  let kind, target, tPhi = 0, sides = [];
  const solidG = st.groups.filter(g => !g.dashed), dashG = st.groups.filter(g => g.dashed);
  if (solidG.length === 1 && dashG.length === 0) {
    kind = 'rotate';
    const S = readShape(solidG[0].polys);
    errs.push(...S.errs.map(e => 'stimul: ' + e));
    target = S.cells; tPhi = S.phi; sides.push(S.side);
  } else if (solidG.length === 1 && dashG.length === 1) {
    kind = 'fill';
    const nb = solidG[0].polys.length;
    const S = readShape(solidG[0].polys.concat(dashG[0].polys));
    errs.push(...S.errs.map(e => 'taxta: ' + e));
    if (S.phi !== 0) errs.push('taxta qiya');
    const w = Math.max(...S.cells.map(c => c[0])) + 1, h = Math.max(...S.cells.map(c => c[1])) + 1;
    if (w * h !== S.cells.length) errs.push('taxta + teshik to\'liq to\'rtburchak emas');
    const hole = S.cells.slice(nb);
    if (!hole.every(([x, y]) => x >= 1 && y >= 1 && x <= w - 2 && y <= h - 2)) errs.push('teshik taxta chetiga tegib turibdi');
    if (!tConnected(hole)) errs.push('teshik bog\'lanmagan');
    target = tNorm(hole); sides.push(S.side);
    const ar = st.vb[2] / st.vb[3];
    if (ar > 1.6) errs.push('stimul juda keng');
  } else {
    errs.push('stimul tuzilishi noma\'lum');
    return { errs };
  }
  if (!tConnected(target)) errs.push('stimul shakli bog\'lanmagan');

  const opts = [...item.options].map((o, i) => {
    const P = parseSvg(o.svg);
    if (P.vb.join(' ') !== '0 0 100 100') errs.push(`options[${i}]: viewBox 0 0 100 100 emas`);
    if (!o.svg.includes('<rect width="100" height="100" fill="#fff"/>')) errs.push(`options[${i}]: oq fon yo'q`);
    if (P.groups.length !== 1 || P.groups[0].dashed) { errs.push(`options[${i}]: tuzilishi noma'lum`); return null; }
    const S = readShape(P.groups[0].polys);
    errs.push(...S.errs.map(e => `options[${i}]: ` + e));
    const cx = (S.box.x0 + S.box.x1) / 2, cy = (S.box.y0 + S.box.y1) / 2;
    if (Math.abs(cx - 50) > 0.02 || Math.abs(cy - 50) > 0.02) errs.push(`options[${i}]: markazda emas (${cx}, ${cy})`);
    if (S.box.x0 < 2 || S.box.y0 < 2 || S.box.x1 > 98 || S.box.y1 > 98) errs.push(`options[${i}]: chegaradan chiqib ketgan`);
    sides.push(S.side);
    return S;
  });
  if (opts.includes(null)) return { errs };
  if (Math.max(...sides) - Math.min(...sides) > 0.02) errs.push('masshtab har xil: ' + sides.map(s => s.toFixed(2)).join(', '));
  if (opts.some(o => o.cells.length !== target.length)) errs.push('katak soni har xil');

  /* ASOSIY KAFOLAT: to'g'ri — stimulning burilgani; distraktor — hech
     qaysi burilishi emas. "fill"da — ag'darilgani ham emas. */
  const tr = tRotClass(target), tm = tRotClass(tMirror(target));
  if (kind === 'rotate' && tr === tm) errs.push('stimul shakli simmetrik (xiral emas): ko\'zgu aksi ham burilishi');
  const classes = opts.map(o => tRotClass(o.cells));
  if (classes[item.correct] !== tr) errs.push('to\'g\'ri variant stimulning burilgani emas');
  classes.forEach((c, i) => {
    if (i === item.correct) return;
    if (c === tr) errs.push(`distraktor ${LETTERS[i]} — stimulning burilgani (ikkinchi to'g'ri javob)`);
    if (kind === 'fill' && tFreeClass(opts[i].cells) === tFreeClass(target)) errs.push(`distraktor ${LETTERS[i]} ag'darilsa teshikka tushadi`);
  });
  if (new Set(classes).size !== classes.length) errs.push('ikki variant bir xil shakl (kanonik)');

  /* Izoh: harf va burchak rasmga mos. Variant = stimul, θ ga burilgan:
     R(φo)·So = R(θ)·R(φs)·Ss  ⇒  So = R(θ + φs − φo)·Ss. */
  const ex = readExplain(item.explain.uz, HEAD_UZ, ROLE_UZ, 'uz');
  const exRu = readExplain(item.explain.ru, HEAD_RU, ROLE_RU, 'ru');
  let theta = null;
  if (!ex || !exRu) errs.push('izoh boshi o\'qilmadi');
  else {
    if (ex.letter !== LETTERS[item.correct]) errs.push('izohdagi harf to\'g\'ri javob emas');
    if (exRu.letter !== ex.letter || exRu.theta !== ex.theta) errs.push('uz va ru izohi har xil');
    theta = ex.theta;
    if (((theta % 360) + 360) % 360 === 0) errs.push('to\'g\'ri javob burilmagan');
    const co = opts[item.correct];
    const delta = theta + tPhi - co.phi;
    if (((delta % 90) + 90) % 90 !== 0) errs.push('izohdagi burchak rasmga mos emas');
    else if (tKey(tRotN(target, delta / 90)) !== tKey(co.cells)) errs.push(`izohdagi burchak (${theta}°) rasmga mos emas`);
  }

  /* Rollar: rasmdan hisoblanadi (og'ir — faqat so'ralganda). */
  let roles = null;
  if (opt.roles) {
    let mv = null, mvm = null;
    roles = classes.map((c, i) => {
      if (i === item.correct) return 'correct';
      if (c === tm) return 'mirror';
      if ((mv = mv || tOneMoves(target)).has(c)) return 'moved';
      if ((mvm = mvm || tOneMoves(tMirror(target))).has(c)) return 'moved-mirror';
      return 'other';
    });
    if (ex && exRu) {
      roles.forEach((r, i) => {
        if (r === 'correct') {
          if (ex.groups[LETTERS[i]] || exRu.groups[LETTERS[i]]) errs.push('to\'g\'ri javob distraktor sifatida izohlangan');
          return;
        }
        if (ex.groups[LETTERS[i]] !== r) errs.push(`izoh (uz): ${LETTERS[i]} — "${ex.groups[LETTERS[i]]}", rasmda "${r}"`);
        if (exRu.groups[LETTERS[i]] !== r) errs.push(`izoh (ru): ${LETTERS[i]} — "${exRu.groups[LETTERS[i]]}", rasmda "${r}"`);
      });
    }
  }
  return { errs, kind, target, tPhi, opts, classes, theta, roles };
}

/* ── Sintetik (buzilgan) savollar — tekshirgich tishlashini isbotlash uchun */

function drawCells(cells, side, o45 = 0) {
  const a = o45 * Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
  const quads = tNorm(cells).map(([x, y]) => [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]]
    .map(([px, py]) => [(px * c - py * s) * side, (px * s + py * c) * side]));
  const pts = quads.flat();
  const mx = (Math.min(...pts.map(p => p[0])) + Math.max(...pts.map(p => p[0]))) / 2;
  const my = (Math.min(...pts.map(p => p[1])) + Math.max(...pts.map(p => p[1]))) / 2;
  const f = v => String(Math.round(v * 100) / 100);
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff"/>'
    + '<g fill="#8a8799" fill-opacity=".45" stroke="#1c1b29" stroke-width="1.5">'
    + quads.map(q => '<polygon points="' + q.map(([x, y]) => f(x - mx + 50) + ',' + f(y - my + 50)).join(' ') + '"/>').join('')
    + '</g></svg>';
}

/* ── Ko'r yechuvchilar: faqat variantlarni ko'radi (stimul, izoh yo'q) ── */

function unique(vals) {
  const i = vals.findIndex(v => vals.filter(x => x === v).length === 1);
  return vals.filter(v => vals.filter(x => x === v).length === 1).length === 1 ? i : 0;
}
const BLIND = {
  'birinchi variant': () => 0,
  'yagona burilish sinfi (qolganlari bir-birining burilgani)': o => unique(o.map(x => tRotClass(x.cells))),
  'ko\'zgu jufti yo\'q variant': o => {
    const cl = o.map(x => tRotClass(x.cells));
    const i = o.findIndex(x => !cl.includes(tRotClass(tMirror(x.cells))));
    return i < 0 ? 0 : i;
  },
  'ko\'zgu jufti bor variant': o => {
    const cl = o.map(x => tRotClass(x.cells));
    const i = o.findIndex(x => cl.includes(tRotClass(tMirror(x.cells))));
    return i < 0 ? 0 : i;
  },
  'eng ko\'p "qarindosh" (ko\'zgu yoki bitta katak farq)': o => {
    const cl = o.map(x => tRotClass(x.cells));
    const score = o.map(x => {
      const rel = new Set([tRotClass(tMirror(x.cells)), ...tOneMoves(x.cells), ...tOneMoves(tMirror(x.cells))]);
      return cl.filter(c => rel.has(c)).length;
    });
    return score.indexOf(Math.max(...score));
  },
  'yagona burchak (45° yoki 0°)': o => unique(o.map(x => x.phi)),
  'yagona o\'lcham (eni×bo\'yi)': o => unique(o.map(x => dims(x.cells))),
  'eng uzun SVG': (o, item) => {
    const L = item.options.map(x => x.svg.length);
    return L.indexOf(Math.max(...L));
  },
};

/* ═════════════════════════════════════════════════════════════════════ */

test('ro\'yxatda bor, nomi uz/ru', () => {
  assert.ok(G, 'spatial generatori ro\'yxatdan o\'tmagan');
  assert.ok(IQ.types().includes('spatial'));
  assert.ok(G.label.uz && G.label.ru);
});

test('har darajada 2000 urug\': makeItem yiqilmaydi, validateItem bo\'sh', () => {
  for (const L of LEVELS) {
    for (const { seed, item } of batch(L)) {
      assert.deepEqual(plain(IQ.validateItem(item)), [], `level ${L}, seed ${seed}`);
      assert.equal(item.id, `spatial:${L}:${seed}`);
      assert.equal(item.level, L);
      assert.equal(item.stimulus.kind, 'svg');
    }
  }
  // chekka urug'lar va daraja chegaralari
  for (const seed of [0, 1, 0xFFFFFFFF, 0x80000000]) {
    for (const L of [0, 1, 10, 11]) {
      const it = IQ.makeItem('spatial', seed, L);
      assert.equal(it.level, Math.min(10, Math.max(1, L)));
    }
  }
});

test('RASMDAN: to\'g\'ri javob — stimulning burilgani; har distraktor — hech qaysi burilishi emas; shakl xiral', () => {
  const kinds = { rotate: 0, fill: 0 };
  for (const L of LEVELS) {
    for (const { seed, item } of batch(L)) {
      const r = inspect(item);
      assert.deepEqual(r.errs, [], `level ${L}, seed ${seed}: ${r.errs.join('; ')}`);
      kinds[r.kind]++;
    }
  }
  assert.ok(kinds.rotate > 0 && kinds.fill > 0, 'ikkala tur ham uchrashi kerak');
});

test('distraktor rollari: generator bilgani = rasmdan hisoblangani = izohda aytilgani', () => {
  const seen = {};
  for (const L of LEVELS) {
    for (const { seed, item } of batch(L).slice(0, N_ROLES)) {
      const r = inspect(item, { roles: true });
      assert.deepEqual(r.errs, [], `level ${L}, seed ${seed}: ${r.errs.join('; ')}`);
      const p = G.plan(seed, L);
      assert.equal(p.correct, item.correct);
      assert.deepEqual(plain(p.options.map(o => o.role)), r.roles, `level ${L}, seed ${seed}`);
      for (const role of r.roles) seen[role] = (seen[role] || 0) + 1;
      // har distraktor qoidani buzadi — roli bor (null/undefined emas)
      assert.ok(r.roles.every(x => ['correct', 'mirror', 'moved', 'moved-mirror', 'other'].includes(x)));
    }
  }
  // "rotate"da ko'zgu distraktori deyarli har doim bor (5 variantda juftsiz
  // shakl to'g'ri bo'lib chiqsa — yo'q), yuqori darajada — ko'chirilgan
  for (const role of ['mirror', 'moved', 'moved-mirror']) assert.ok(seen[role] > 100, role + ' kam: ' + seen[role]);
  for (const L of [3, 6, 10]) {
    const withMirror = batch(L).slice(0, N_ROLES).filter(({ item }) => {
      const r = inspect(item, { roles: true });
      return r.kind === 'rotate' && r.roles.includes('mirror');
    }).length;
    const rot = batch(L).slice(0, N_ROLES).filter(({ item }) => inspect(item).kind === 'rotate').length;
    assert.ok(withMirror / rot >= 0.75, `level ${L}: ko'zgu distraktorli savollar ${withMirror}/${rot}`);
  }
});

test('variantlar juft-juft farqli (kanonik tavsif bo\'yicha, SVG satri emas)', () => {
  for (const L of LEVELS) {
    for (const { seed, item } of batch(L)) {
      const r = inspect(item);
      const displayed = r.opts.map(o => o.phi + '#' + tKey(o.cells));
      assert.equal(new Set(displayed).size, displayed.length, `level ${L}, seed ${seed}: bir xil rasm`);
      assert.equal(new Set(r.classes).size, r.classes.length, `level ${L}, seed ${seed}: bir xil shakl`);
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

test('ko\'r yechuvchi (faqat variantlar, stimulsiz) tasodifdan yuqori topa olmaydi', (t) => {
  const report = [];
  for (const L of LEVELS) {
    const b = batch(L).slice(0, 1000), k = b[0].item.options.length;
    const parsed = b.map(({ item }) => ({ item, opts: item.options.map(o => readShape(parseSvg(o.svg).groups[0].polys)) }));
    for (const [name, solve] of Object.entries(BLIND)) {
      const acc = parsed.filter(({ item, opts }) => solve(opts, item) === item.correct).length / parsed.length;
      report.push(`L${L} k=${k} ${name}: ${acc.toFixed(3)}`);
      assert.ok(acc <= 1 / k + 0.05, `level ${L}, "${name}": aniqlik ${acc.toFixed(3)} > tasodif ${(1 / k).toFixed(3)} + 0.05`);
    }
  }
  for (const line of report) t.diagnostic(line);
});

test('ko\'r yechuvchi haqiqatan tishlaydi: "to\'g\'ri + 3 ta ko\'zgu" naqshini darhol topadi', () => {
  // Klassik yomon generator: to'g'ri javob + ko'zgu aksining 3 ta burilishi.
  let hit = 0, total = 0;
  for (const { seed, item } of batch(1).slice(0, 300)) {
    const r = inspect(item);
    const side = r.opts[0].side;
    const opts = [drawCells(tRotN(r.target, 1), side)];
    for (let q = 0; q < 3; q++) opts.push(drawCells(tRotN(tMirror(r.target), q), side));
    const pos = seed % 4;
    [opts[0], opts[pos]] = [opts[pos], opts[0]];
    const fake = { options: opts.map(svg => ({ kind: 'svg', svg })), correct: pos };
    const parsed = fake.options.map(o => readShape(parseSvg(o.svg).groups[0].polys));
    total++;
    if (BLIND['yagona burilish sinfi (qolganlari bir-birining burilgani)'](parsed, fake) === pos) hit++;
  }
  assert.ok(hit / total > 0.95, 'ko\'r yechuvchi naqshni topmadi: ' + hit / total);
});

test('determinizm: bir xil (seed, level) → baytma-bayt bir xil; yangi muhitda ham', () => {
  const IQ2 = load();
  for (const L of LEVELS) {
    for (const seed of SEEDS.slice(0, 150)) {
      const a = IQ.makeItem('spatial', seed, L), b = IQ.makeItem('spatial', seed, L), c = IQ2.makeItem('spatial', seed, L);
      assert.equal(JSON.stringify(a), JSON.stringify(b));
      assert.equal(JSON.stringify(a), JSON.stringify(c), `level ${L}, seed ${seed}: boshqa muhitda boshqa savol`);
    }
  }
  // Har xil urug' — har xil savol (generator urug'ni e'tiborsiz qoldirmaydi).
  const svgs = new Set(SEEDS.slice(0, 200).map(s => IQ.makeItem('spatial', s, 5).stimulus.svg));
  assert.ok(svgs.size > 150);
  // Manba faylda Math.random yo'q (muhitda u chaqirilsa yiqiladi — yuqorida).
  assert.ok(!/Math\.random/.test(read('src/iq/gen/spatial.js')));
});

test('SVG qoidalari: oq fon, ruxsat etilgan ranglar, skript/tashqi havola yo\'q', () => {
  const ALLOWED = new Set(['#fff', '#1c1b29', '#8a8799']);
  for (const L of LEVELS) {
    for (const { item } of batch(L).slice(0, 300)) {
      for (const svg of [item.stimulus.svg, ...item.options.map(o => o.svg)]) {
        assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="'));
        assert.ok(/<rect width="[\d.]+" height="[\d.]+" fill="#fff"\/>/.test(svg), 'oq fon yo\'q');
        for (const c of svg.match(/#[0-9a-fA-F]{3,6}\b/g)) assert.ok(ALLOWED.has(c), 'ruxsat etilmagan rang ' + c);
        assert.ok(!/<script|\son\w+=|href|foreignObject/i.test(svg));
      }
    }
  }
});

test('masshtab va markaz: bitta savolda hamma katak bir xil o\'lchamda, variant markazda', () => {
  // inspect() buni har savolda tekshiradi; bu yerda — boshqa savollar orasida
  // ham o'lcham darajaga qarab barqaror (0 yoki cheksiz emas).
  for (const L of LEVELS) {
    for (const { item } of batch(L).slice(0, 200)) {
      const r = inspect(item);
      assert.deepEqual(r.errs, []);
      assert.ok(r.opts[0].side >= 11 && r.opts[0].side <= 22.01, 'katak o\'lchami ' + r.opts[0].side);
    }
  }
});

test('daraja murakkablikni oshiradi: katak, variant, burchak, distraktor nozikligi', () => {
  const stat = LEVELS.map(L => {
    const rs = batch(L).map(({ item }) => inspect(item));
    const mean = f => rs.reduce((s, r) => s + f(r), 0) / rs.length;
    return {
      L,
      cells: mean(r => r.target.length),
      k: mean(r => r.opts.length),
      opt45: mean(r => r.opts.filter(o => o.phi === 45).length / r.opts.length),
      dis: mean(r => Math.min(Math.abs(r.theta) % 360, 360 - Math.abs(r.theta) % 360)),
      sameBox: mean(r => new Set(r.opts.map(o => dims(o.cells))).size === 1 ? 1 : 0),
    };
  });
  for (let i = 1; i < stat.length; i++) {
    const a = stat[i - 1], b = stat[i];
    assert.ok(b.cells >= a.cells, `katak soni kamaydi: L${a.L}→L${b.L}`);
    assert.ok(b.k >= a.k, `variantlar soni kamaydi: L${a.L}→L${b.L}`);
    if (b.L >= 8) assert.ok(b.opt45 > a.opt45 + 0.03, `45° ulushi oshmadi: L${a.L}→L${b.L}`);
    const score = s => s.cells + s.k + 4 * s.opt45 + 2 * s.sameBox + s.dis / 90;
    assert.ok(score(b) >= score(a), `umumiy murakkablik kamaydi: L${a.L}→L${b.L}`);
  }
  assert.ok(stat[9].cells > stat[0].cells && stat[9].k > stat[0].k);
  stat.filter(s => s.L <= 6).forEach(s => assert.equal(s.opt45, 0, `L${s.L}: 45° bo'lmasligi kerak`));
  stat.filter(s => s.L >= 7).forEach(s => assert.ok(s.opt45 > 0.15, `L${s.L}: 45° kam`));
  assert.ok(stat[1].dis > stat[0].dis, 'L2 da 180° ham bo\'lishi kerak');
  // Nozik distraktor: 6+ darajada hamma variantning eni×bo'yi bir xil —
  // o'lchamga qarab chiqarib tashlab bo'lmaydi, faqat aylantirib.
  stat.filter(s => s.L >= 6).forEach(s => assert.equal(s.sameBox, 1, `L${s.L}: o'lcham yorliq bo'lib qolgan`));
  assert.ok(stat.slice(0, 5).every(s => s.sameBox < 1));
});

test('b: IQ.levelToB(level) ± 0.75; 180° burilish 90° dan qiyinroq', () => {
  for (const L of LEVELS) {
    const by = { 90: [], 180: [] };
    for (const { item } of batch(L).slice(0, 500)) {
      assert.ok(Math.abs(item.b - IQ.levelToB(L)) <= 0.75);
      const r = inspect(item);
      const d = Math.min(Math.abs(r.theta), 360 - Math.abs(r.theta));
      if (by[d] && r.kind === 'rotate') by[d].push(item.b);
    }
    const avg = a => a.reduce((s, x) => s + x, 0) / a.length;
    if (by[90].length && by[180].length) assert.ok(avg(by[180]) > avg(by[90]), `level ${L}`);
  }
});

test('fill turi: faqat yuqori darajada; ag\'darib ham faqat bitta bo\'lak mos keladi', () => {
  for (const L of LEVELS) {
    const fills = batch(L).filter(({ item }) => item.prompt.uz.includes('bo\'lak'));
    if (L < 7) assert.equal(fills.length, 0, `L${L}: fill bo'lmasligi kerak`);
    else assert.ok(fills.length > N * 0.15, `L${L}: fill juda kam`);
    for (const { seed, item } of fills.slice(0, 100)) {
      const r = inspect(item);
      assert.equal(r.kind, 'fill');
      const free = r.opts.map(o => tFreeClass(o.cells));
      assert.equal(free.filter(f => f === tFreeClass(r.target)).length, 1, `L${L} seed ${seed}`);
      assert.ok(r.opts.every(o => o.phi === 0));
    }
  }
});

test('tekshirgich o\'zi tishlaydi: buzilgan savollarni ushlaydi', () => {
  /* Namuna savol shunday tanlanadi: har mutatsiya HAQIQATAN xato bo'lsin.
     Masalan, shakl 180° simmetrik bo'lsa, "90°" ni "−90°" ga almashtirish
     xato emas — shuning uchun 4 burilishi ham har xil shakl olinadi. */
  const asym = r => new Set([0, 1, 2, 3].map(n => tKey(tRotN(r.target, n)))).size === 4;
  const rot = batch(5).map(x => x.item).find(it => {
    const r = inspect(it, { roles: true });
    return r.kind === 'rotate' && r.theta === 90 && asym(r) && r.roles.includes('mirror') && r.roles.includes('moved');
  });
  const fill = batch(9).map(x => x.item).find(it => inspect(it).kind === 'fill');
  const clone = it => JSON.parse(JSON.stringify(it));
  const other = it => (it.correct + 1) % it.options.length;
  const hasErr = (it, re) => inspect(it, { roles: true }).errs.some(e => re.test(e));

  assert.deepEqual(inspect(rot, { roles: true }).errs, []);
  assert.deepEqual(inspect(fill, { roles: true }).errs, []);

  // 1) distraktor o'rniga stimulning o'zi → ikkinchi to'g'ri javob
  let m = clone(rot); m.options[other(m)].svg = m.stimulus.svg;
  assert.ok(hasErr(m, /ikkinchi to'g'ri javob/));

  // 2) simmetrik (axiral) shakl: stimul va variantlar ko'zgusi = burilishi
  const r0 = inspect(rot), side = r0.opts[0].side;
  const T = [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]];            // T-pentomino — simmetrik
  m = clone(rot);
  m.stimulus.svg = drawCells(T, side);
  m.options = m.options.slice(0, 4).map((o, i) => ({ kind: 'svg', svg: drawCells(i === 0 ? tRotN(T, 1) : [[0, 0], [1, 0], [2, 0], [3, 0], [i, 1]], side) }));
  m.correct = 0;
  assert.ok(hasErr(m, /xiral emas/));

  // 3) "fill": distraktor — teshikning ko'zgu aksi (ag'darsa tushadi)
  const rf = inspect(fill);
  m = clone(fill); m.options[other(m)].svg = drawCells(tMirror(rf.target), rf.opts[0].side);
  assert.ok(hasErr(m, /ag'darilsa teshikka tushadi/));

  // 4) bitta variant boshqa masshtabda
  m = clone(rot); m.options[0].svg = drawCells(r0.opts[0].cells, side * 0.9, r0.opts[0].phi / 45);
  assert.ok(hasErr(m, /masshtab har xil/));

  // 5) variant markazdan siljigan
  m = clone(rot);
  m.options[1].svg = m.options[1].svg.replace(/points="([^"]+)"/g, (_, p) => 'points="' + p.split(' ').map(xy => {
    const [x, y] = xy.split(',').map(Number); return (x + 3) + ',' + y;
  }).join(' ') + '"');
  assert.ok(hasErr(m, /markazda emas/));

  // 6) izohdagi harf / burchak / rol noto'g'ri
  m = clone(rot); m.correct = other(m);
  assert.ok(inspect(m).errs.length > 0);
  m = clone(rot);                                  // faqat uz o'zgardi → uz ≠ ru
  m.explain.uz = m.explain.uz.replace("soat mili bo'yicha 90°", '180°');
  assert.ok(hasErr(m, /uz va ru izohi har xil/));
  m.explain.ru = m.explain.ru.replace('на 90° по часовой стрелке', 'на 180°');  // ikkalasi ham, lekin rasmga zid
  assert.ok(hasErr(m, /izohdagi burchak \(180°\) rasmga mos emas/));
  m = clone(rot);
  m.explain.uz = m.explain.uz.replace("ko'zgudagi aksi: ", 'boshqa shakl: katakchalar ').replace(/boshqa shakl: bitta/, "ko'zgudagi aksi: bitta");
  assert.ok(hasErr(m, /izoh \(uz\)/));

  // 7) ikki bir xil variant (kanonik), SVG satri boshqacha bo'lsa ham
  m = clone(rot);
  const c = inspect(rot).opts[rot.correct];
  m.options[other(m)].svg = drawCells(tRotN(c.cells, 2), side, c.phi / 45);
  assert.ok(hasErr(m, /ikki variant bir xil shakl|ikkinchi to'g'ri javob/));
});
