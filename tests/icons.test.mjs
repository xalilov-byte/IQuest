/* ─────────────────────────────────────────────────────────────────────────
   src/icons.js — glif reyestri tekshiruvi (ARXITEKTURA §9.4, §14)

   · §9.4 jadvalidagi har glif reyestrda bor;
   · har glifda 1..3 element, faqat yoʻl buyruqlari;
   · geometriya 1..23 ichida (yoylar va egri chiziqlar namunalab olinadi);
   · manbada takrorlangan kalit yoʻq (obyekt literalida jimgina ustiga
     yozilib ketardi);
   · Main.dc.html ishlatgan har nom reyestrda bor;
   · deterministik.

   Ishga tushirish:  npm test
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('../src/icons.js', import.meta.url), 'utf8');

function load() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  return ctx.window.nzIcons;
}

/* §9.4 «Kerakli gliflar» jadvali + topshiriqdagi qoʻshimchalar (tanga, ◆,
   kamera, info, orqaga/strelkalar, nishon medalyonlari uchun maʼnolar). */
const SPEC = {
  navigatsiya: ['home', 'dumbbell', 'trophy', 'user', 'gear', 'chevron-left', 'chevron-right', 'x', 'check', 'plus', 'external-link'],
  amallar: ['pencil', 'image', 'trash', 'lock', 'bookmark', 'x-circle', 'pause'],
  sozlamalar: ['globe', 'moon', 'volume', 'vibrate', 'bell', 'clock', 'flame', 'help-circle', 'mail', 'star', 'doc', 'shield-check'],
  iqtisod: ['bag', 'medal', 'palette', 'sparkle', 'coin', 'diamond'],
  turlar: ['matrix', 'series', 'spatial', 'verbal'],
  konikmalar: ['attention', 'memory', 'speed', 'logic', 'puzzle', 'spatial'],
  oyinlar: ['flanker', 'matrix-memory', 'mental-math', 'nback', 'schulte', 'sequence'],
  v2: ['users', 'message', 'user-plus', 'search', 'flag', 'ban', 'share', 'link'],
  qoshimcha: ['camera', 'info', 'chevron-up', 'chevron-down', 'arrow-left', 'arrow-right', 'minus',
    'check-circle', 'alert', 'play', 'sun', 'test', 'level-up', 'peak'],
};

test('§9.4 dagi har glif reyestrda bor', () => {
  const I = load();
  const miss = [];
  Object.values(SPEC).flat().forEach(n => { if (!Object.prototype.hasOwnProperty.call(I, n)) miss.push(n); });
  assert.deepEqual(miss, []);
});

test('har glif: 1..3 ta boʻsh boʻlmagan yoʻl, faqat yoʻl sintaksisi, muzlatilgan', () => {
  const I = load();
  assert.ok(Object.isFrozen(I));
  for (const [name, a] of Object.entries(I)) {
    assert.ok(Array.isArray(a), name);
    assert.ok(a.length >= 1 && a.length <= 3, name + ': element soni ' + a.length);
    assert.ok(Object.isFrozen(a), name);
    a.forEach((d, i) => {
      assert.equal(typeof d, 'string', name);
      assert.ok(d.length > 0 && d.length <= 900, name + '[' + i + '] uzunligi');
      assert.match(d, /^[Mm][MmLlHhVvCcSsQqTtAaZz0-9.,\s-]*$/, name + '[' + i + '] sintaksisi');
    });
  }
  assert.ok(Object.keys(I).length >= 70);
  assert.ok(JSON.stringify(I).length < 16000, 'reyestr hajmi');
});

/* ── Yoʻlni oddiy nuqtalar roʻyxatiga aylantirish ──────────────────── */
function points(d) {
  const toks = d.match(/[a-zA-Z]|-?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/g);
  const out = [];
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, cx = 0, cy = 0, prev = '';
  const num = () => { const v = Number(toks[i++]); assert.ok(isFinite(v), 'son kutilgan: ' + d); return v; };
  const push = (px, py) => out.push([px, py]);
  const bez = (p) => {                       // p: nazorat nuqtalari (boshlanish bilan)
    for (let t = 0; t <= 1.0001; t += 1 / 24) {
      let q = p.map(v => v.slice());
      while (q.length > 1) q = q.slice(1).map((v, k) => [q[k][0] + (v[0] - q[k][0]) * t, q[k][1] + (v[1] - q[k][1]) * t]);
      push(q[0][0], q[0][1]);
    }
  };
  const arc = (x1, y1, rx, ry, phi, fa, fs, x2, y2) => {
    rx = Math.abs(rx); ry = Math.abs(ry);
    if (!rx || !ry) { push(x2, y2); return; }
    const c = Math.cos(phi * Math.PI / 180), s = Math.sin(phi * Math.PI / 180);
    const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
    const x1p = c * dx + s * dy, y1p = -s * dx + c * dy;
    const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
    let k = Math.sqrt(Math.max(0, (rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p) /
      (rx * rx * y1p * y1p + ry * ry * x1p * x1p)));
    if (fa === fs) k = -k;
    const cxp = k * rx * y1p / ry, cyp = -k * ry * x1p / rx;
    const ccx = c * cxp - s * cyp + (x1 + x2) / 2, ccy = s * cxp + c * cyp + (y1 + y2) / 2;
    const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!fs && dt > 0) dt -= 2 * Math.PI;
    if (fs && dt < 0) dt += 2 * Math.PI;
    for (let j = 0; j <= 32; j++) {
      const t = t1 + dt * j / 32;
      push(ccx + rx * Math.cos(t) * c - ry * Math.sin(t) * s, ccy + rx * Math.cos(t) * s + ry * Math.sin(t) * c);
    }
  };
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    const smooth = prev === 'C' || prev === 'S';   // S faqat oldingi egridan keyin aks ettiradi
    prev = C;
    if (C === 'Z') { x = sx; y = sy; push(x, y); continue; }
    if (C === 'M') { x = ox + num(); y = oy + num(); sx = x; sy = y; push(x, y); cmd = rel ? 'l' : 'L'; }
    else if (C === 'L' || C === 'T') { x = ox + num(); y = oy + num(); push(x, y); }
    else if (C === 'H') { x = ox + num(); push(x, y); }
    else if (C === 'V') { y = (rel ? y : 0) + num(); push(x, y); }
    else if (C === 'C') {
      const p1 = [ox + num(), oy + num()], p2 = [ox + num(), oy + num()], p3 = [ox + num(), oy + num()];
      bez([[x, y], p1, p2, p3]); cx = p2[0]; cy = p2[1]; x = p3[0]; y = p3[1];
    } else if (C === 'S') {
      const p1 = smooth ? [2 * x - cx, 2 * y - cy] : [x, y], p2 = [ox + num(), oy + num()], p3 = [ox + num(), oy + num()];
      bez([[x, y], p1, p2, p3]); cx = p2[0]; cy = p2[1]; x = p3[0]; y = p3[1];
    } else if (C === 'Q') {
      const p1 = [ox + num(), oy + num()], p2 = [ox + num(), oy + num()];
      bez([[x, y], p1, p2]); x = p2[0]; y = p2[1];
    } else if (C === 'A') {
      const rx = num(), ry = num(), phi = num(), fa = num(), fs = num(), x2 = ox + num(), y2 = oy + num();
      arc(x, y, rx, ry, phi, fa, fs, x2, y2); x = x2; y = y2;
    } else assert.fail('nomaʼlum buyruq ' + cmd + ' : ' + d);
  }
  return out;
}

test('yoʻl tahlilchisi oʻzi toʻgʻri ishlaydi (doira chegarasi)', () => {
  const p = points('M2.5 12a9.5 9.5 0 1 0 19 0a9.5 9.5 0 1 0-19 0z');
  const ys = p.map(q => q[1]);
  assert.ok(Math.abs(Math.min(...ys) - 2.5) < 0.05 && Math.abs(Math.max(...ys) - 21.5) < 0.05);
});

test('keyline: har glif geometriyasi 1..23 ichida', () => {
  const I = load();
  const bad = [];
  for (const [name, a] of Object.entries(I)) {
    a.forEach(d => points(d).forEach(([px, py]) => {
      if (px < 1 - 1e-6 || px > 23 + 1e-6 || py < 1 - 1e-6 || py > 23 + 1e-6) bad.push(name + ' (' + px.toFixed(2) + ',' + py.toFixed(2) + ')');
    }));
  }
  assert.deepEqual([...new Set(bad.map(b => b.split(' ')[0]))], [], bad.slice(0, 5).join('; '));
});

test('manbada takrorlangan glif kaliti yoʻq', () => {
  const body = SRC.slice(SRC.indexOf('const I = {'), SRC.indexOf('Object.keys(I).forEach'));
  const keys = [...body.matchAll(/^\s{4}('[\w-]+'|[\w]+):\s*\[/gm)].map(m => m[1].replace(/'/g, ''));
  assert.equal(new Set(keys).size, keys.length, 'takror: ' + keys.filter((k, i) => keys.indexOf(k) !== i));
  assert.equal(keys.length, Object.keys(load()).length);
});

test('paths() — uchta satr, nomaʼlum nomda boʻsh, sanab boʻlinmaydi', () => {
  const I = load();
  const p = I.paths('gear');
  assert.equal(p.path1, I.gear[0]);
  assert.equal(p.path2, I.gear[1]);
  assert.equal(p.path3, '');
  assert.deepEqual(JSON.parse(JSON.stringify(I.paths('yoq-glif'))), { path1: '', path2: '', path3: '' });
  assert.deepEqual(JSON.parse(JSON.stringify(I.paths('paths'))), { path1: '', path2: '', path3: '' });
  assert.ok(!Object.keys(I).includes('paths'));
});

test('bir maʼno = bir glif: turli nomlarda bir xil chizma yoʻq', () => {
  const I = load();
  const seen = new Map();
  for (const [name, a] of Object.entries(I)) {
    const k = a.join('|');
    assert.ok(!seen.has(k), name + ' va ' + seen.get(k) + ' bir xil');
    seen.set(k, name);
  }
});

test('Main.dc.html ishlatgan har glif nomi reyestrda bor', () => {
  const I = load();
  let main = '';
  try { main = fs.readFileSync(new URL('../src/Main.dc.html', import.meta.url), 'utf8'); } catch (e) { return; }
  const used = new Set();
  const pats = [
    /nzIcons\s*\[\s*["']([\w-]+)["']\s*\]/g,
    /nzIcons\.(?!paths\b)([A-Za-z_$][\w$]*)/g,
    /nzIcons\.paths\(\s*["']([\w-]+)["']\s*\)/g,
    /\b(?:icon|ico|glyph)\(\s*["']([\w-]+)["']\s*\)/g,
  ];
  pats.forEach(re => { for (const m of main.matchAll(re)) used.add(m[1]); });
  const miss = [...used].filter(n => !Object.prototype.hasOwnProperty.call(I, n));
  assert.deepEqual(miss, []);
});

test('deterministik: ikki yuklash bir xil, tasodif va sana yoʻq', () => {
  assert.equal(JSON.stringify(load()), JSON.stringify(load()));
  assert.doesNotMatch(SRC, /Math\.random|Date\.now|new Date/);
});
