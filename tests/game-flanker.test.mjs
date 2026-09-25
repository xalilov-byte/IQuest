/* ─────────────────────────────────────────────────────────────────────────
   tests/game-flanker.test.mjs — Strelkalar (Eriksen flanker) o'yini
   (src/games/flanker.js)

   NIMA TEKSHIRILADI:
     · stimul SVG'dan MUSTAQIL o'qiladi (<use href="#l|#r|#n">): o'rtadagi
       strelka — to'g'ri javob; yondagilar bir xil; mos / zid / neytral
       ulushi daraja qoidasiga aynan mos; chap-o'ng teng;
     · minglab tasodifiy ketma-ketlikda validateView doim bo'sh;
     · deterministik; replay aynan; natija tick chastotasiga bog'liq emas;
     · ideal bot — yuqori ball; tasodifiy bosuvchi (50% omad) — 0 ga yaqin;
       tezlik-bot (strelka chiqqach < 150 ms) — 0 ball;
     · daraja oshgani sari qiyinlashadi (zid ulushi, muddat, strelkalar);
       har sinovga muddat — o'yin uzunligi chegaralangan;
     · uz/ru/en matnlar (ʻ, ʼ, «»), ko'rsatma 2 qatorga sig'adi; HUD intro'da
       ham o'yindagi uyalar;
     · pauza: javob vaqti to'xtaydi, strelkalar yashirinadi, pauzali jurnal
       replay'da aynan.

   Fayllar node:vm ichida yuklanadi; muhitda Math.random va Date.now
   chaqirilsa — xato otadi.
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const FILES = ['src/iq/rng.js', 'src/games/index.js', 'src/games/flanker.js'];
const SRC = FILES.map(f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8'));

function realm() {
  const ctx = {};
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext("Math.random = () => { throw new Error('Math.random taqiqlangan'); };" +
                  "Date.now = () => { throw new Error('Date.now taqiqlangan'); };", ctx);
  FILES.forEach((f, i) => vm.runInContext(SRC[i], ctx, { filename: f }));
  return ctx.IQ;
}

const plain = x => JSON.parse(JSON.stringify(x));
const IQ = realm();
const ID = 'flanker';
const G = IQ.games.get(ID);
const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const seedOf = s => (Math.imul(s + 1, 2654435761) >>> 0);
const pmax = L => 60 + 9 * L;
const TRIALS = 40;

function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Stimulni SVG'dan o'qiydi: strelkalar tartibi, o'rtadagisi, tur, balandlik. */
function parseStim(svg) {
  assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">'), 'svg boshi');
  assert.ok(svg.includes('fill="#fff"'), 'oq fon');
  const uses = [...svg.matchAll(/<use href="#([lrn])" transform="translate\(([\d.]+) ([\d.]+)\)/g)];
  const ids = uses.map(m => m[1]), ys = new Set(uses.map(m => Number(m[3])));
  assert.ok(ids.length % 2 === 1 && ids.length >= 5, 'toq sonli strelka: ' + ids.length);
  assert.equal(ys.size, 1, 'bir qatorda');
  const mid = (ids.length - 1) / 2, center = ids[mid], fl = ids.filter((_, i) => i !== mid);
  assert.ok(center === 'l' || center === 'r', 'o\'rtadagi — strelka');
  assert.ok(fl.every(x => x === fl[0]), 'yondagilar bir xil');
  const type = fl[0] === center ? 'con' : fl[0] === 'n' ? 'neu' : 'inc';
  const xs = uses.map(m => Number(m[2]));
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] > xs[i - 1], 'chapdan o\'ngga');
  return { n: ids.length, center, type, y: [...ys][0] };
}

function checkView(g, where) {
  const v = g.view();
  const e = IQ.games.validateView(v, ID);
  if (e.length) assert.fail(where + ': ' + e.join('; ') + ' — ' + JSON.stringify(v).slice(0, 300));
  checkLangs(v, where);
  return v;
}
const check = checkView;

/* ── Tillar, tipografika va pauza (CONTRACT §2, §9; ARXITEKTURA §8) ──── */
const RESUME = 600;                                  // o'yindagi RESUME_MS
const CYR = /[Ѐ-ӿ]/;
function checkText(o, where) {
  for (const k of ['uz', 'ru', 'en']) assert.ok(o && typeof o[k] === 'string' && o[k].trim() !== '', where + ': ' + k);
  assert.ok(!CYR.test(o.en) && !/[ʻʼ«»]/.test(o.en), where + ': en da kirill / ʻ / «»: ' + o.en);
  assert.ok(!/['"‘’]/.test(o.uz), where + ': uz da ʻ/ʼ/«» o\'rniga boshqa belgi: ' + o.uz);
  assert.ok(!/[A-Za-z]{2}/.test(o.ru), where + ': ru da lotin so\'z: ' + o.ru);
}
/* Har ko'rinish: hamma matnda uz/ru/en; ko'rsatma 2 qatorga sig'adi
   (Playwright o'lchovi bilan tanlangan chegara), HUD yorlig'i qisqa. */
function checkLangs(v, where) {
  assert.equal(typeof v.paused, 'boolean', where + ': paused');
  checkText(v.prompt, where + ' prompt');
  for (const k of ['uz', 'ru', 'en']) assert.ok(v.prompt[k].length <= 76, where + ': ko\'rsatma uzun: ' + v.prompt[k]);
  v.hud.forEach((h, i) => {
    checkText(h.label, where + ' hud' + i);
    for (const k of ['uz', 'ru', 'en']) assert.ok(h.label[k].length <= 14, where + ': HUD yorlig\'i uzun: ' + h.label[k]);
  });
  if (v.display && v.display.kind === 'text') checkText(v.display, where + ' display');
  v.buttons.forEach((b, i) => checkText(b.label, where + ' tugma' + i));
}
/* Jurnalga pauza qo'shadi: i-hodisadan keyin (o'sha devor vaqtida)
   'pause', gap ms dan keyin 'resume'; keyingi hodisalar gap + RESUME ga
   suriladi. O'yin vaqti o'zgarmaydi — natija aynan o'sha bo'lishi kerak. */
function withPause(log, i, gap) {
  const P = log[i].t, out = log.slice(0, i + 1);
  out.push({ t: P, k: 'press', v: 'pause' }, { t: P + gap, k: 'press', v: 'resume' });
  for (const e of log.slice(i + 1)) out.push({ t: e.t + gap + RESUME, k: e.k, v: e.v });
  return out;
}
/* Tugagan o'yin jurnaliga 1–3 ta pauza qo'shib replay qiladi: natija va
   jurnal aynan (pauza vaqti o'yinga kirmaydi). `ok(e)` — pauza qo'yiladigan
   hodisa. */
function checkPausedReplay(seed, level, log, res, rs, ok = () => true) {
  const R = prng(rs);
  const idx = log.map((e, i) => i).filter(i => i < log.length - 1 && ok(log[i]));
  if (!idx.length) return;
  const picks = [...new Set([0, 1, 2].slice(0, 1 + Math.floor(R() * 3)).map(() => idx[Math.floor(R() * idx.length)]))].sort((a, b) => b - a);
  let pl = log;
  for (const i of picks) pl = withPause(pl, i, 1000 + Math.floor(R() * 600000));
  const rp = IQ.games.replay(ID, seed, level, JSON.parse(JSON.stringify(pl)));
  assert.deepEqual(plain(rp.result()), plain(res), 'pauzali replay natijasi');
  assert.deepEqual(plain(rp.log()), pl, 'pauzali replay jurnali');
}
function checkRegistered() {
  const G = IQ.games.get(ID);
  checkText(G.title, 'title');
  checkText(G.desc, 'desc');
  assert.deepEqual(plain(G.langs), ['uz', 'ru', 'en']);
  if (IQ.games.langsOf) assert.deepEqual(plain(IQ.games.langsOf(ID)), ['uz', 'ru', 'en']);
}
const BOT_EN = 'Taps too fast — no points awarded';
/* Jonli pauza: intro'da pauza yo'q; o'yin paytida pause → ko'rinish
   ma'lumot bermaydi, faqat "Davom etish"; kutish (10 daqiqa) o'yinni
   tugatmaydi, tick false, bosishlar e'tiborsiz va jurnalga yozilmaydi;
   resume → RESUME ms "Tayyorlaning…" (bosish yana e'tiborsiz), keyin
   o'yin to'xtagan joyidan. `inputs(g, t)` — o'yinning hamma bosishlari. */
function livePause(inputs, { level = 3, warm = 1300 } = {}) {
  const g = IQ.games.create(ID, 7, level);
  assert.equal(g.pause(500), false, 'intro — pauza yo\'q');
  assert.equal(g.resume(600), false);
  assert.equal(g.log().length, 0);
  g.press('start', 1000);
  g.tick(warm);
  const before = JSON.stringify(g.view()), n0 = g.log().length, res0 = JSON.stringify(g.result());
  assert.equal(g.pause(warm), true);
  assert.equal(g.paused, true);
  assert.equal(g.pause(warm + 10), false, 'ikkinchi pauza — yo\'q');
  const v = check(g, 'pauza');
  assert.equal(v.paused, true);
  assert.deepEqual(plain(v.buttons.map(b => b.id)), ['resume']);
  assert.equal(v.prompt.en, 'Paused — the clock is stopped');
  if (v.grid) assert.ok(v.grid.cells.every(c => c.state === 'hidden' && c.label === ''), 'pauzada panjara yashirin');
  const pv = JSON.stringify(v);
  g.tick(warm);                                   // ilova pauzadan keyin bir marta chizadi
  let t = warm;
  for (let s = 0; s < 40; s++) { t += 15000; assert.equal(g.tick(t), false); inputs(g, t); }
  assert.equal(JSON.stringify(g.view()), pv);
  assert.equal(g.log().length, n0 + 1, 'pauzada hech narsa yozilmaydi');
  assert.ok(!g.done, '10 daqiqa pauza o\'yinni tugatmaydi');
  assert.equal(JSON.stringify(g.result()), res0, 'pauza natijani o\'zgartirmaydi');
  assert.equal(g.resume(t), true);
  assert.equal(g.paused, false);
  const rv = check(g, 'tayyorlanish');
  assert.equal(rv.paused, false);
  assert.equal(rv.prompt.en, 'Get ready…');
  assert.deepEqual(plain(rv.buttons), []);
  if (rv.grid) assert.ok(rv.grid.cells.every(c => c.state === 'hidden'));
  inputs(g, t + 100);
  g.tick(t + 200);
  assert.equal(g.log().length, n0 + 2, 'tayyorlanishda bosish e\'tiborsiz');
  assert.equal(g.tick(t + RESUME - 1), false);
  assert.equal(g.tick(t + RESUME), true, 'tayyorlanish tugadi');
  assert.deepEqual(plain(g.log().slice(n0)), [{ t: warm, k: 'press', v: 'pause' }, { t, k: 'press', v: 'resume' }]);
  check(g, 'davom');
  return { g, before, after: JSON.stringify(g.view()), res0, t: t + RESUME };
}

/* "Ilova" kabi o'ynatadi. policy(view, t, since) → 'left' | 'right' | null.
   since — joriy bosqich birinchi ko'rilgan vaqt. */
function play(seed, level, policy, { step = 10, start = 5000, iq = IQ, onView = null } = {}) {
  const g = iq.games.create(ID, seed, level);
  let t = start, key = null, since = 0;
  g.tick(t); checkView(g, 'intro');
  g.press('start', t);
  while (!g.done && t - start < 600000) {
    t += step;
    g.tick(t);
    const v = checkView(g, 'play');
    const k = v.phase + '|' + v.progress;
    if (k !== key) { key = k; since = t; if (onView) onView(v, t); }
    const a = policy(v, t, since);
    if (a) { g.press(a, t); checkView(g, 'press'); }
  }
  assert.ok(g.done);
  checkView(g, 'done');
  return g;
}

const dirOf = v => (parseStim(v.display.svg).center === 'l' ? 'left' : 'right');
function responder(rt, { acc = 1, seed = 1 } = {}) {
  const r = prng(seed);
  let done = null;
  return (v, t, since) => {
    if (v.phase !== 'input' || done === since || t - since < rt) return null;
    done = since;
    const d = dirOf(v);
    return r() < acc ? d : (d === 'left' ? 'right' : 'left');
  };
}
function randomPresser(seed, lo, hi) {
  const r = prng(seed);
  let next = 0;
  return (v, t) => {
    if (t < next) return null;
    next = t + lo + Math.floor(r() * (hi - lo));
    return r() < 0.5 ? 'left' : 'right';
  };
}

function checkResult(r, L) {
  assert.ok(Number.isInteger(r.points) && r.points >= 0 && r.points <= pmax(L), 'points: ' + r.points);
  assert.ok(Number.isInteger(r.score) && r.score >= 0 && r.score <= 100, 'score');
  assert.ok(Number.isInteger(r.correct) && r.correct >= 0 && r.correct <= r.total, 'correct');
  assert.equal(r.total, TRIALS);
  assert.ok(Number.isFinite(r.durationMs) && r.durationMs >= 0 && r.durationMs <= maxDuration(L), 'durationMs: ' + r.durationMs);
  assert.ok(Number.isInteger(r.nextLevel) && Math.abs(r.nextLevel - L) <= 1 && r.nextLevel >= 1 && r.nextLevel <= 10, 'nextLevel');
}
function maxDuration(L) {
  const c = G.rules(L);
  return 500 + TRIALS * (c.fixMaxMs + c.deadlineMs + 700);
}

/* Korpus: har daraja × 40 urug' — ideal bot o'ynaydi, har stimul yoziladi. */
let corpus = null;
function getCorpus() {
  if (corpus) return corpus;
  corpus = {};
  for (const L of LEVELS) {
    corpus[L] = [];
    for (let s = 0; s < 40; s++) {
      const trials = [];
      const g = play(seedOf(s), L, responder(400), { step: 100, onView: v => { if (v.phase === 'input') trials.push(parseStim(v.display.svg)); } });
      assert.equal(trials.length, TRIALS);
      assert.equal(g.result().correct, TRIALS, 'o\'rtadagi strelka — to\'g\'ri javob');
      corpus[L].push(trials);
    }
  }
  return corpus;
}

/* ══ TESTLAR ═══════════════════════════════════════════════════════════ */

test('ro\'yxatda: id, skill "attention", nom va tavsif uz/ru, tugmalar', () => {
  assert.ok(G);
  assert.equal(G.skill, 'attention');
  assert.ok(G.title.uz && G.title.ru && G.desc.uz && G.desc.ru);
  assert.ok(IQ.games.list().some(g => g.id === ID));
  const g = IQ.games.create(ID, 1, 1);
  g.press('start', 0);
  const b = plain(g.view().buttons);
  assert.deepEqual(b.map(x => x.id), ['left', 'right']);
  // belgi + U+FE0E (matn ko'rinishi) + U+2002 (en-space) — belgi va so'z yopishib qolmaydi
  assert.deepEqual(b.map(x => x.label), [{ uz: '◀\uFE0E\u2002Chap', ru: '◀\uFE0E\u2002Влево', en: '◀\uFE0E\u2002Left' },
    { uz: 'Oʻng\u2002▶\uFE0E', ru: 'Вправо\u2002▶\uFE0E', en: 'Right\u2002▶\uFE0E' }]);
});

test('manbada Math.random / Date.now / setTimeout yo\'q', () => {
  assert.doesNotMatch(SRC[2], /Math\.random|Date\.now|setTimeout|setInterval|performance\.now/);
});

test('stimullar: to\'g\'ri javob — o\'rtadagi, turlar ulushi aniq, chap-o\'ng teng', () => {
  const C = getCorpus();
  for (const L of LEVELS) {
    const c = G.rules(L);
    for (const trials of C[L]) {
      const cnt = { con: 0, inc: 0, neu: 0 };
      for (const tr of trials) { cnt[tr.type]++; assert.equal(tr.n, c.arrows); }
      assert.equal(cnt.inc, Math.round(TRIALS * c.incongruent), 'L' + L + ' zid');
      assert.equal(cnt.neu, Math.round(TRIALS * c.neutral), 'L' + L + ' neytral');
      for (const type of ['con', 'inc', 'neu']) {
        const l = trials.filter(tr => tr.type === type && tr.center === 'l').length, r = cnt[type] - l;
        assert.ok(Math.abs(l - r) <= 1, 'L' + L + ' ' + type + ' chap/o\'ng ' + l + '/' + r);
      }
      // joy: 1–6 da markazda, 7+ da yuqori/past aralash
      const ys = new Set(trials.map(tr => tr.y));
      if (c.jitter) assert.ok(ys.size === 2 && !ys.has(100)); else assert.deepEqual([...ys], [100]);
    }
    // tartib urug'ga bog'liq (bir xil ketma-ketlik takrorlanmaydi)
    const sigs = new Set(C[L].map(trials => trials.map(tr => tr.center + tr.type).join()));
    assert.ok(sigs.size >= 39);
  }
});

test('"+" paytida ko\'rinish — nishon (strelkasiz); bosish e\'tiborsiz', () => {
  const g = IQ.games.create(ID, 7, 3);
  g.press('start', 0);
  const v = g.view();
  assert.equal(v.phase, 'show');
  assert.ok(!v.display.svg.includes('<use'), 'nishonda strelka yo\'q');
  g.press('left', 100);
  g.press('right', 400);
  assert.equal(g.view().phase, 'show');
  assert.equal(g.view().progress, 0);
  const r = g.result();
  assert.equal(r.correct, 0);
});

test('minglab tasodifiy ketma-ketlik: validateView doim bo\'sh, progress kamaymaydi, replay aynan', () => {
  const r = prng(777);
  const WEIRD_T = [NaN, undefined, -Infinity, Infinity];
  const IDS = ['left', 'right', 'left', 'right', 'start', 'x', null, 3, 'pause', 'resume', 'resume'];
  let finished = 0, pausedSeen = 0;
  for (let seq = 0; seq < 2000; seq++) {
    const L = 1 + (seq % 10), seed = seedOf(seq * 11 + 1);
    const g = IQ.games.create(ID, seed, L);
    let t = Math.floor(r() * 1e9), prog = 0;
    const n = 30 + Math.floor(r() * 170);
    for (let e = 0; e < n; e++) {
      const y = r();
      if (y < 0.2) { /* o'sha vaqt */ } else if (y < 0.5) t += Math.floor(r() * 200);
      else if (y < 0.85) t += Math.floor(r() * 1500);
      else if (y < 0.97) t += Math.floor(r() * 20000);
      else t -= Math.floor(r() * 800);
      const tt = r() < 0.03 ? WEIRD_T[Math.floor(r() * WEIRD_T.length)] : t;
      const x = r();
      if (x < 0.35) {
        const before = JSON.stringify(g.view());
        if (!g.tick(tt)) assert.equal(JSON.stringify(g.view()), before, 'tick false — ko\'rinish o\'zgarmasligi kerak');
      }
      else if (x < 0.45) g.press(r() < 0.8 ? 'start' : IDS[Math.floor(r() * IDS.length)], tt);
      else if (x < 0.5) g.tap(Math.floor(r() * 10) - 2, tt);
      else {
        const v = g.view();
        g.press(v.phase === 'input' && v.display.svg.includes('<use') && r() < 0.6 ? dirOf(v) : IDS[Math.floor(r() * IDS.length)], tt);
      }
      const v = g.view();
      const errs = IQ.games.validateView(v, ID);
      if (errs.length) assert.fail('seq ' + seq + ' e ' + e + ': ' + errs.join('; '));
      if (e % 4 === 0) checkLangs(v, 'seq ' + seq);
      if (v.paused) pausedSeen++;
      assert.ok(v.progress >= prog - 1e-12, 'progress kamaymaydi');
      prog = v.progress;
      if (e % 16 === 0) assert.equal(JSON.stringify(g.view()), JSON.stringify(v), 'view() holatni o\'zgartirmaydi');
    }
    if (g.done) finished++;
    const res = plain(g.result());
    checkResult(res, L);
    const log = JSON.parse(JSON.stringify(g.log()));
    const rp = IQ.games.replay(ID, seed, L, log);
    assert.deepEqual(plain(rp.result()), res, 'replay natijasi — seq ' + seq);
    assert.deepEqual(plain(rp.log()), log, 'replay jurnali — seq ' + seq);
    assert.equal(rp.done, g.done);
  }
  assert.ok(finished > 300, 'ko\'p ketma-ketlik oxirigacha yetdi: ' + finished);
  assert.ok(pausedSeen > 100, 'pauza uchradi: ' + pausedSeen);
});

test('deterministik: ikki alohida muhitda bir xil urug\' → bir xil ko\'rinishlar va natija', () => {
  const IQ2 = realm();
  for (const L of [1, 6, 10]) {
    const seen = [[], []];
    [IQ, IQ2].forEach((iq, w) => {
      const g = play(4242, L, responder(500, { acc: 0.9, seed: 3 }), { iq, step: 20, onView: v => seen[w].push(JSON.stringify(v)) });
      seen[w].push(JSON.stringify(g.result()), JSON.stringify(g.log()));
    });
    assert.equal(seen[0].length, seen[1].length);
    assert.ok(seen[0].every((v, i) => v === seen[1][i]), 'L' + L);
  }
});

test('replay: bot o\'yinlari aynan qayta chiqadi; natija tick chastotasiga bog\'liq emas', () => {
  for (const L of LEVELS) {
    const runs = [
      { seed: seedOf(L), g: play(seedOf(L), L, responder(450)) },
      { seed: seedOf(L + 20), g: play(seedOf(L + 20), L, randomPresser(L, 150, 1200), { step: 20 }) },
      { seed: seedOf(L + 40), g: play(seedOf(L + 40), L, responder(700, { acc: 0.85, seed: L })) },
    ];
    runs.forEach(({ seed, g }, j) => {
      const log = JSON.parse(JSON.stringify(g.log()));
      const rp = IQ.games.replay(ID, seed, L, log);
      assert.deepEqual(plain(rp.result()), plain(g.result()));
      assert.deepEqual(plain(rp.log()), log);
      assert.ok(rp.done);
      checkPausedReplay(seed, L, log, g.result(), L * 3 + j);
    });
    // faqat bosishlar (tick'siz) + oxirida uzoq kelajakdagi bitta tick
    const g = runs[2].g, inputs = g.log().filter(e => e.k !== 'tick');
    const h = IQ.games.create(ID, seedOf(L + 40), L);
    for (const e of inputs) h.press(e.v, e.t);
    h.tick(inputs[inputs.length - 1].t + 10 * maxDuration(L));
    assert.deepEqual(plain(h.result()), plain(g.result()), 'tick\'siz — L' + L);
  }
});

test('ideal bot (RT 350 ms): har darajada maksimal ball, daraja oshadi', () => {
  for (const L of LEVELS) {
    const r = play(seedOf(100 + L), L, responder(350)).result();
    checkResult(r, L);
    assert.equal(r.correct, TRIALS);
    assert.equal(r.score, 100);
    assert.equal(r.points, pmax(L));
    assert.equal(r.nextLevel, Math.min(10, L + 1));
  }
});

test('odamga o\'xshash o\'yin — ball 30..150; sekin va xatoli o\'yinchi pastroq', () => {
  for (const L of LEVELS) {
    const good = play(seedOf(200 + L), L, responder(600, { acc: 0.92, seed: L })).result();
    assert.ok(good.points >= 30 && good.points <= 150, 'L' + L + ': ' + good.points);
    const rt = Math.min(850, G.rules(L).deadlineMs - 100);
    const weak = play(seedOf(200 + L), L, responder(rt, { acc: 0.8, seed: L })).result();
    assert.ok(weak.points < good.points, 'L' + L + ' sust: ' + weak.points + ' < ' + good.points);
    assert.ok(weak.nextLevel <= L);
  }
});

test('tasodifiy bosuvchi (50% omad): 0 ga yaqin ball, daraja oshmaydi', () => {
  let sum = 0, n = 0;
  for (const L of [1, 3, 5, 8, 10]) {
    for (let s = 0; s < 8; s++) {
      const r = play(seedOf(300 + s), L, randomPresser(s * 13 + L, 150, 900), { step: 20 }).result();
      checkResult(r, L);
      assert.ok(r.points <= 15, 'L' + L + ' points ' + r.points);
      assert.ok(r.nextLevel <= L);
      sum += r.points; n++;
    }
    // javob berib, lekin tasodifiy tomonni bosuvchi (aniq 50%)
    const r = play(seedOf(350 + L), L, responder(500, { acc: 0.5, seed: 9 })).result();
    assert.ok(r.points <= 15, 'L' + L + ' 50%: ' + r.points);
  }
  assert.ok(sum / n <= 3, 'o\'rtacha ' + sum / n);
});

test('tezlik-bot (strelka chiqqach < 150 ms javob) — 0 ball; 160 ms — ball beriladi', () => {
  for (const L of LEVELS) {
    for (const rt of [0, 50, 100, 139]) {
      const r = play(seedOf(400 + L), L, responder(rt)).result();
      assert.equal(r.points, 0, 'L' + L + ' rt ' + rt);
      assert.equal(r.correct, 0, 'juda erta javob to\'g\'ri sanalmaydi');
      assert.equal(r.flagged, true);
      assert.equal(r.nextLevel, L);
    }
    const ok = play(seedOf(400 + L), L, responder(160)).result();
    assert.equal(ok.points, pmax(L), 'L' + L + ' 160 ms');
  }
  // bitta-ikkita erta bosish odamni jazolamaydi (faqat o'sha sinov hisoblanmaydi)
  let n = 0;
  const r = play(seedOf(450), 4, (v, t, since) => {
    if (v.phase !== 'input') return null;
    if (t - since === 50 && ++n % 15 === 0) return dirOf(v);
    return t - since === 500 ? dirOf(v) : null;
  }).result();
  assert.ok(r.points > 0.8 * pmax(4), 'points ' + r.points);
});

test('muddat: javob bo\'lmasa sinov darajadagi muddatda yopiladi; o\'yin chegaralangan', () => {
  for (const L of LEVELS) {
    const c = G.rules(L), spans = [];
    let onset = null;
    const g = play(seedOf(500 + L), L, () => null, { onView: (v, t) => {
      if (v.phase === 'input') onset = t;
      else if (v.phase === 'feedback' && onset !== null) { spans.push(t - onset); onset = null; }
    } });
    assert.equal(spans.length, TRIALS);
    for (const s of spans) assert.ok(Math.abs(s - c.deadlineMs) <= 10, 'L' + L + ' muddat ' + s + ' ≈ ' + c.deadlineMs);
    const r = g.result();
    assert.equal(r.correct, 0);
    assert.equal(r.points, 0);
    assert.ok(r.durationMs <= maxDuration(L) && r.durationMs <= 170000, 'L' + L + ' ' + r.durationMs);
    assert.equal(g.view().phase, 'done');
  }
});

test('daraja oshgani sari qiyinlashadi', () => {
  const R = LEVELS.map(L => G.rules(L));
  for (let i = 1; i < R.length; i++) {
    assert.ok(R[i].deadlineMs < R[i - 1].deadlineMs, 'muddat qisqaradi');
    assert.ok(R[i].incongruent >= R[i - 1].incongruent, 'zid ulushi kamaymaydi');
    assert.ok(R[i].neutral <= R[i - 1].neutral, 'neytral (oson) kamaymaydi');
    assert.ok(R[i].arrows >= R[i - 1].arrows, 'strelkalar kamaymaydi');
    assert.ok(R[i].fixMinMs <= R[i - 1].fixMinMs && R[i].fixMaxMs <= R[i - 1].fixMaxMs, 'nishon qisqaradi');
    assert.ok(!R[i - 1].jitter || R[i].jitter, 'joy o\'zgarishi yoqilgach qoladi');
  }
  assert.ok(R[9].incongruent > R[0].incongruent && R[9].arrows > R[0].arrows && R[9].jitter && !R[0].jitter);
  // kuzatilgan stimullarda ham: zid ulushi o'sadi, neytral kamayadi
  const C = getCorpus();
  const share = (L, type) => C[L].flat().filter(tr => tr.type === type).length / (C[L].length * TRIALS);
  for (let L = 2; L <= 10; L++) {
    assert.ok(share(L, 'inc') >= share(L - 1, 'inc'));
    assert.ok(share(L, 'neu') <= share(L - 1, 'neu'));
  }
  // bir xil tezlikdagi o'yinchi yuqori darajada ko'proq kechikadi (muddat qisqa)
  const misses = L => { const r = play(seedOf(600), L, responder(1000)).result(); return TRIALS - r.correct; };
  assert.ok(misses(10) > misses(1));
});

test('feedback: to\'g\'ri 0,3 s, xato 0,7 s, juda erta — hisoblanmaydi', () => {
  const g = IQ.games.create(ID, 99, 2);
  g.press('start', 0);
  let t = 0;
  const toInput = () => { while (g.view().phase !== 'input') { t += 5; g.tick(t); } return t; };
  let on = toInput();
  const d = dirOf(g.view());
  g.press(d, on + 400);
  assert.equal(g.view().phase, 'feedback');
  assert.equal(g.view().prompt.uz, 'Toʻgʻri!');
  assert.ok(g.view().display.svg.includes('#8a8799'), 'yondagilar kulrang');
  g.tick(on + 699); assert.equal(g.view().phase, 'feedback');
  g.tick(on + 700); assert.equal(g.view().phase, 'show');
  t = on + 700;
  on = toInput();
  g.press(dirOf(g.view()) === 'left' ? 'right' : 'left', on + 500);
  g.tick(on + 500 + 699); assert.equal(g.view().phase, 'feedback');
  g.tick(on + 500 + 700); assert.equal(g.view().phase, 'show');
  t = on + 1200;
  on = toInput();
  g.press(dirOf(g.view()), on + 40);
  assert.match(g.view().prompt.uz, /Juda erta/);
  const r = g.result();
  assert.equal(r.correct, 1);
  assert.equal(g.view().hud.find(h => h.label.uz === 'Xato').value, '2');
});

test('intro va done: start tugmasi va namuna, done da tugma yo\'q, progress 0 → 1', () => {
  const g = IQ.games.create(ID, 1, 3);
  const v0 = g.view();
  assert.equal(v0.phase, 'intro');
  assert.equal(v0.progress, 0);
  assert.deepEqual(plain(v0.buttons.map(b => b.id)), ['start']);
  const ex = parseStim(v0.display.svg);
  assert.equal(ex.type, 'inc', 'namuna — zid holat');
  g.press('left', 10);
  g.tap(0, 20);
  assert.equal(g.view().phase, 'intro');
  assert.deepEqual(plain(g.log()), []);
  assert.deepEqual(plain(g.result()), { score: 0, points: 0, correct: 0, total: TRIALS, durationMs: 0, nextLevel: 3, flagged: false });
  const d = play(1, 3, responder(400)).view();
  assert.equal(d.phase, 'done');
  assert.equal(d.progress, 1);
  assert.deepEqual(plain(d.buttons), []);
  assert.match(d.display.en, /^Average response time: \d+ ms$/);
});

test('matnlar: uz/ru/en, langs; "eʼtibor" tutuq bilan; bot sababi yakun matnida', () => {
  checkRegistered();
  assert.match(IQ.games.create(ID, 1, 1).view().prompt.uz, /eʼtibor/);
  const v = play(seedOf(401), 1, responder(0)).view();
  assert.equal(v.display.en, BOT_EN);
});

test('intro: HUD o\'yindagi uyalar (daraja takrorlanmaydi), display — SVG', () => {
  for (const L of LEVELS) {
    const g = IQ.games.create(ID, L, L);
    const a = checkView(g, 'intro');
    assert.deepEqual(plain(a.hud.map(h => h.value)), ['0', '0', '—']);
    g.press('start', 0);
    const b = checkView(g, 'show');
    assert.deepEqual(plain(a.hud.map(h => h.label)), plain(b.hud.map(h => h.label)));
    assert.equal(a.display.kind, 'svg');
    assert.equal(a.grid, null);
  }
});

test('pauza (jonli): javob vaqti to\'xtaydi, strelkalar yashirinadi, keyin aynan davom etadi', () => {
  const inputs = (g, t) => { g.press('left', t); g.press('right', t); g.press('start', t); };
  // L3: start 1000 + 500 + nishon ≤ 950 → 2800 da strelkalar ko'rinadi
  const { before, after, res0, g, t } = livePause(inputs, { warm: 2800 });
  assert.equal(JSON.parse(before).phase, 'input');
  const pv = IQ.games.create(ID, 7, 3);
  pv.press('start', 1000); pv.tick(2800); pv.pause(2800);
  assert.ok(!pv.view().display.svg.includes('<use'), 'pauzada strelka ko\'rinmaydi');
  assert.equal(after, before);
  assert.equal(JSON.stringify(g.result()), res0);
  // javob: RT pauza oldidagi va keyingi vaqt yig'indisi (pauza kirmaydi)
  g.press(dirOf(g.view()), t + 300);
  const rp = IQ.games.replay(ID, 7, 3, plain(g.log()));
  assert.deepEqual(plain(rp.result()), plain(g.result()));
  assert.equal(g.result().correct, 1);
  assert.ok(g.view().hud[2].value < 1500, 'o\'rtacha RT pauzasiz: ' + g.view().hud[2].value);
});
