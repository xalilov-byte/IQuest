/* ─────────────────────────────────────────────────────────────────────────
   src/avatars.js — 16 ta tayyor avatar (ARXITEKTURA §5.2, §9.4, §14).

   Tekshiriladi: SVG xavfsizligi (IQ.validateItem darajasi va undan
   qatʼiyroq), ≤ 1,6 KB, viewBox 96, aynan 2 rang, ≤ 6 shakl, matn yoʻq,
   hamma chiziq avatar doirasi ichida (yoʻl namunalari bilan hisoblanadi —
   40 px da ham, kesilmagan holatda ham hech narsa chetga tegmaydi).

   Ishga tushirish:  npm test
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('../src/avatars.js', import.meta.url), 'utf8');

function load() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  return ctx.window.IQ_AVATARS;
}
const A = load();

const IDS = ['owl', 'fox', 'cat', 'bear', 'lion', 'eagle', 'panda', 'rabbit',
  'penguin', 'turtle', 'dolphin', 'deer', 'cube', 'orbit', 'spark', 'spiral'];

test('16 ta avatar, §5.2 dagi tartib: 12 hayvon, 4 geometrik', () => {
  assert.deepEqual([...A.ids], IDS);
  assert.equal(A.list.length, 16);
  assert.equal(A.list.filter(a => a.kind === 'animal').length, 12);
  assert.deepEqual([...A.list.filter(a => a.kind === 'shape').map(a => a.id)], ['cube', 'orbit', 'spark', 'spiral']);
  assert.equal(new Set(A.ids).size, 16);
});

test('nomlar {uz, ru, en}; oʻzbekchada ʻ (U+02BB), inglizchada kirill yoʻq', () => {
  A.list.forEach(a => {
    ['uz', 'ru', 'en'].forEach(l => assert.ok(typeof a.name[l] === 'string' && a.name[l].length > 1, a.id + '.' + l));
    assert.ok(!/['’`]/.test(a.name.uz), a.id);
    assert.ok(/^[A-Za-z ]+$/.test(a.name.en), a.id);
    assert.ok(/[а-яё]/i.test(a.name.ru), a.id);
  });
  assert.equal(A.name('owl', 'uz'), 'Boyoʻgʻli');
  assert.equal(A.name('deer', 'uz'), 'Bugʻu');
  assert.equal(A.name('deer', 'en'), 'Deer');
  assert.equal(A.name('nope', 'uz'), '');
});

test('har SVG: validate() boʻsh, ≤ 1 600 bayt, viewBox 0 0 96 96, xmlns', () => {
  A.list.forEach(a => {
    assert.deepEqual([...A.validate(a.svg)], [], a.id);
    assert.ok(Buffer.byteLength(a.svg, 'utf8') <= 1600, a.id + ' ' + Buffer.byteLength(a.svg));
    assert.ok(a.svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">'), a.id);
  });
});

test('xavfsizlik: CONTRACT §2 regexi va qoʻshimcha taqiqlar', () => {
  const CONTRACT = /<script|\son\w+\s*=|<foreignObject|href\s*=\s*["'](?!#)/i;
  A.list.forEach(a => {
    assert.ok(!CONTRACT.test(a.svg), a.id);
    assert.ok(!/href|url\(|style|<text|<image|javascript|<!|<\?/i.test(a.svg), a.id);
  });
  // validate() haqiqatan ushlaydi
  const base = A.svg('owl');
  const bad = [
    base.replace('</g>', '<script>alert(1)</script></g>'),
    base.replace('<path ', '<path onload="x()" '),
    base.replace('</g>', '<foreignObject></foreignObject></g>'),
    base.replace('</g>', '<image href="http://x/y.png"/></g>'),
    base.replace('</g>', '<use href="#a"/></g>'),
    base.replace('</g>', '<text>Hi</text></g>'),
    base.replace('fill="#1C1B29"', 'fill="#FF0000"'),
    base.replace('fill="#1C1B29"', 'fill="url(#g)"'),
    base.replace('fill="#1C1B29"', 'fill="currentColor"'),
    base.replace('viewBox="0 0 96 96"', 'viewBox="0 0 100 100"'),
    base.replace('<g ', '<g style="fill:red" '),
    base.replace('</g>', '<path d="M0 0"/><path d="M0 0"/><path d="M0 0"/><path d="M0 0"/></g>'),
    base.replace('</g>', '<path d="' + 'M1 1'.repeat(300) + '"/></g>'),
  ];
  bad.forEach((s, i) => assert.ok(A.validate(s).length > 0, 'holat ' + i));
});

test('aynan 2 rang: #FFFFFF va #1C1B29 (profil rangi orqadagi doirada)', () => {
  assert.deepEqual([...A.COLORS], ['#FFFFFF', '#1C1B29']);
  A.list.forEach(a => {
    const cols = new Set((a.svg.match(/#[0-9a-fA-F]{3,8}\b/g) || []).map(c => c.toUpperCase()));
    assert.deepEqual([...cols].sort(), ['#1C1B29', '#FFFFFF'], a.id);
    (a.svg.match(/(?:fill|stroke)="([^"]*)"/g) || []).forEach(v => {
      assert.match(v, /="(none|#FFFFFF|#1C1B29)"$/, a.id + ' ' + v);
    });
    assert.ok(!/opacity|rgb|hsl|gradient/i.test(a.svg), a.id);
  });
});

test('≤ 6 shakl, faqat ruxsat etilgan teglar, fon shaffof (toʻliq kvadrat yoʻq)', () => {
  A.list.forEach(a => {
    const shapes = (a.svg.match(/<(path|circle|ellipse|rect)\b/g) || []).length;
    assert.ok(shapes >= 2 && shapes <= 6, a.id + ' ' + shapes);
    (a.svg.match(/<\/?([a-zA-Z]+)/g) || []).forEach(t => assert.match(t, /^<\/?(svg|g|path|circle|ellipse|rect)$/, a.id));
    assert.ok(!/<rect[^>]*width="96"/.test(a.svg), a.id);
  });
});

test('XML toʻgʻri tuzilgan: teglar muvozanatli', () => {
  A.list.forEach(a => {
    const stack = [];
    const re = /<(\/?)([a-z]+)[^>]*?(\/?)>/g;
    let m;
    while ((m = re.exec(a.svg))) {
      if (m[1]) assert.equal(stack.pop(), m[2], a.id);
      else if (!m[3]) stack.push(m[2]);
    }
    assert.equal(stack.length, 0, a.id);
  });
});

/* ── Yoʻl namunalari: hamma chiziq doira ichida ──────────────────────── */
function samplePath(d) {
  const toks = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g);
  const pts = [];
  let i = 0, cx = 0, cy = 0, sx = 0, sy = 0, cmd = '', lqx = null, lqy = null;
  const num = () => Number(toks[i++]);
  const isNum = () => i < toks.length && !/[a-zA-Z]/.test(toks[i]);
  const quad = (x0, y0, x1, y1, x2, y2) => {
    for (let t = 0; t <= 1; t += 0.05) pts.push([(1 - t) ** 2 * x0 + 2 * (1 - t) * t * x1 + t * t * x2, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * y1 + t * t * y2]);
  };
  const cubic = (x0, y0, x1, y1, x2, y2, x3, y3) => {
    for (let t = 0; t <= 1; t += 0.05) {
      const u = 1 - t;
      pts.push([u ** 3 * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3 * x3, u ** 3 * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * y3]);
    }
  };
  const arc = (x1, y1, rx, ry, phi, fa, fs, x2, y2) => {
    const p = phi * Math.PI / 180, c = Math.cos(p), s = Math.sin(p);
    const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
    const x1p = c * dx + s * dy, y1p = -s * dx + c * dy;
    rx = Math.abs(rx); ry = Math.abs(ry);
    const lam = x1p * x1p / (rx * rx) + y1p * y1p / (ry * ry);
    if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
    const num2 = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
    let co = Math.sqrt(Math.max(0, num2 / (rx * rx * y1p * y1p + ry * ry * x1p * x1p)));
    if (fa === fs) co = -co;
    const cxp = co * rx * y1p / ry, cyp = -co * ry * x1p / rx;
    const ccx = c * cxp - s * cyp + (x1 + x2) / 2, ccy = s * cxp + c * cyp + (y1 + y2) / 2;
    const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!fs && dt > 0) dt -= 2 * Math.PI;
    if (fs && dt < 0) dt += 2 * Math.PI;
    for (let k = 0; k <= 40; k++) {
      const t = t1 + dt * k / 40;
      pts.push([ccx + rx * Math.cos(t) * c - ry * Math.sin(t) * s, ccy + rx * Math.cos(t) * s + ry * Math.sin(t) * c]);
    }
  };
  while (i < toks.length) {
    if (!isNum()) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    const ox = rel ? cx : 0, oy = rel ? cy : 0;
    if (C === 'Z') { cx = sx; cy = sy; pts.push([cx, cy]); lqx = null; continue; }
    if (C === 'M') { cx = ox + num(); cy = oy + num(); sx = cx; sy = cy; pts.push([cx, cy]); cmd = rel ? 'l' : 'L'; lqx = null; continue; }
    if (C === 'L') { cx = ox + num(); cy = oy + num(); pts.push([cx, cy]); lqx = null; continue; }
    if (C === 'H') { cx = ox + num(); pts.push([cx, cy]); lqx = null; continue; }
    if (C === 'V') { cy = oy + num(); pts.push([cx, cy]); lqx = null; continue; }
    if (C === 'Q') { const x1 = ox + num(), y1 = oy + num(), x = ox + num(), y = oy + num(); quad(cx, cy, x1, y1, x, y); lqx = x1; lqy = y1; cx = x; cy = y; continue; }
    if (C === 'T') {
      const x1 = lqx === null ? cx : 2 * cx - lqx, y1 = lqx === null ? cy : 2 * cy - lqy;
      const x = ox + num(), y = oy + num(); quad(cx, cy, x1, y1, x, y); lqx = x1; lqy = y1; cx = x; cy = y; continue;
    }
    if (C === 'C') { const a = [ox + num(), oy + num(), ox + num(), oy + num(), ox + num(), oy + num()]; cubic(cx, cy, ...a); cx = a[4]; cy = a[5]; lqx = null; continue; }
    if (C === 'A') { const rx = num(), ry = num(), phi = num(), fa = num(), fs = num(), x = ox + num(), y = oy + num(); arc(cx, cy, rx, ry, phi, fa, fs, x, y); cx = x; cy = y; lqx = null; continue; }
    throw new Error('buyruq: ' + cmd);
  }
  return pts;
}

test('hamma chiziq markazdan ≤ 47 px (doira ichida, 40 px da ham chetga tegmaydi)', () => {
  A.list.forEach(a => {
    let worst = 0;
    const re = /<path([^>]*)d="([^"]+)"/g;
    let m;
    while ((m = re.exec(a.svg))) {
      const attrs = m[1];
      const sw = /stroke="none"/.test(attrs) ? 0 : Number((attrs.match(/stroke-width="([\d.]+)"/) || [0, 2])[1]);
      samplePath(m[2]).forEach(([x, y]) => {
        worst = Math.max(worst, Math.hypot(x - 48, y - 48) + sw / 2);
      });
    }
    if (process.env.AV_DEBUG) console.log(a.id, worst.toFixed(1));
    assert.ok(worst <= 47, a.id + ' ' + worst.toFixed(1));
    assert.ok(worst >= 28, a.id + ' juda kichik: ' + worst.toFixed(1));
  });
});

test('yordamchilar: has/get/svg/src; nomaʼlum id → null', () => {
  assert.equal(A.has('owl'), true);
  assert.equal(A.has('constructor'), false);
  assert.equal(A.has(null), false);
  assert.equal(A.get('x'), null);
  assert.equal(A.svg('x'), null);
  assert.equal(A.src('x'), null);
  const src = A.src('spiral');
  assert.ok(src.startsWith('data:image/svg+xml;charset=utf-8,'));
  assert.equal(decodeURIComponent(src.slice(src.indexOf(',') + 1)), A.svg('spiral'));
  assert.ok(Object.isFrozen(A) && Object.isFrozen(A.list) && Object.isFrozen(A.list[0]));
});

test('deterministik: ikki marta yuklash bir xil satr beradi', () => {
  const B = load();
  A.list.forEach((a, i) => assert.equal(B.list[i].svg, a.svg));
});
