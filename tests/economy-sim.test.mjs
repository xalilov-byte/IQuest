/* ─────────────────────────────────────────────────────────────────────────
   Iqtisod simulyatsiyasi (ARXITEKTURA §6.8, §14)

   30 kunlik hodisa oqimi HAQIQIY modullar orqali yuritiladi: catalog,
   wallet, badges, league — Main qiladigan chaqiruvlar tartibida
   (ilova ochildi → hafta yopildi → nishonlar → vazifalar → mashq/oʻyin).
   Vaqt kiritiladi, tasodif urugʻli — natija har safar bir xil.

   «Barqaror hafta daromadi» = takrorlanadigan manbalar: 15–30-kunlardagi
   vazifa tangalari (7 kunga keltirilgan) + shu oraliqda berilgan hafta
   yakuni mukofotlarining oʻrtachasi. Bir martalik manbalar (nishonlar,
   xush kelibsiz) alohida hisoblanadi (§6.8: «birinchi oyda +200–400»).
   Oraliqdan chiqsa CI yiqiladi: faol 200–320, oddiy 80–160, kam 20–80.

   Raqamlarni koʻrish:  SIM_REPORT=1 node --test tests/economy-sim.test.mjs
   ───────────────────────────────────────────────────────────────────── */

process.env.TZ = 'Asia/Tashkent';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const SRC = f => fs.readFileSync(new URL('../src/' + f, import.meta.url), 'utf8');
const MODS = ['catalog.js', 'wallet.js', 'badges.js', 'league.js'].map(f => [f, SRC(f)]);

const LEAGUE_MIN = [0, 150, 500, 1200, 2500, 5000];       // Main LEAGUES (§6.2)
const tierOf = b => { let i = 0; LEAGUE_MIN.forEach((m, k) => { if (b >= m) i = k; }); return i; };
const GAMES = ['flanker', 'matrix-memory', 'mental-math', 'nback', 'schulte', 'sequence'];
const TYPES = ['matrix', 'series', 'spatial', 'verbal'];
const DAY = 86400000;
const START = new Date(2026, 8, 1, 0, 0).getTime();        // 2026-09-01, seshanba

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function app() {
  const store = new Map();
  const ctx = { console };
  ctx.window = ctx;
  ctx.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null),
                       setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
  vm.createContext(ctx);
  MODS.forEach(([f, s]) => vm.runInContext(s, ctx, { filename: f }));
  return { C: ctx.nzCatalog, W: ctx.nzWallet, B: ctx.nzBadges, L: ctx.nzLeague };
}

/* Profil: qaysi kunlari faol va nima qiladi. */
const PROFILES = {
  // har kuni: aralash mashq (10), eng zaif tur mashqi (10), Xatolarim takrori, 1–2 oʻyin; 1-kuni IQ test
  faol:  { seed: 11, active: () => true, practice: 2, review: true, games: [1, 2], acc: 0.72, test: [1], profileDay: 2, levelEvery: 5 },
  // haftada 5 kun: bitta mashq (10) va bitta oʻyin
  oddiy: { seed: 22, active: d => d % 7 !== 3 && d % 7 !== 6, practice: 1, review: false, games: [1, 1], acc: 0.65, test: [3], profileDay: 6, levelEvery: 9 },
  // haftada 3 kun: faqat bitta oʻyin
  kam:   { seed: 33, active: d => d % 7 === 0 || d % 7 === 2 || d % 7 === 4, practice: 0, review: false, games: [1, 1], acc: 0.6, test: [], profileDay: null, levelEvery: 99 },
  // himoya tekshiruvi: har kuni 40 ta oʻyin va 3 ta IQ test, mashq yoʻq
  fermer: { seed: 44, active: () => true, practice: 0, review: false, games: [40, 40], acc: 0.9, test: 'daily', profileDay: null, levelEvery: 99 },
};

function simulate(name, days = 30) {
  const P = PROFILES[name];
  const r = rng(P.seed);
  const { C, W, B, L } = app();
  const u = { answered: 0, tests: 0, streak: 0, longest: 0, lastActive: null, wrong: 0, fixes: 0,
              games: {}, days: Object.create(null), lastRun: null, profile: false };
  const perDay = [];      // { day, quest, week, badge, welcome }
  const buys = [];

  for (let d = 1; d <= days; d++) {
    const t0 = START + (d - 1) * DAY + 19 * 3600000;       // har kuni 19:00
    let t = t0;
    const tick = () => (t += 30000);
    const day = W.dayKey(t);
    const got = { day: d, quest: 0, week: 0, badge: 0, welcome: 0 };
    perDay.push(got);
    if (!P.active(d)) continue;

    const credit = (n, src, key) => { if (W.credit(n, src, key, tick())) got[src] += n; };
    /* ── Ilova ochildi (Main tartibi, §10.3) ── */
    W.touch(tick());
    if (d === 1) credit(C.rewards.welcome, 'welcome', 'welcome');
    if (!W.frozen(t)) {
      L.pending(u.days, day).forEach(({ w, ball }) => {
        if (!L.close(w, ball, tick())) return;
        const coins = C.rewards.weekly[tierOf(ball)];
        if (coins > 0) credit(coins, 'week', 'w:' + w);
      });
    }
    const lv = Math.min(10, 3 + Math.floor(d / P.levelEvery));
    const levels = { matrix: lv, series: Math.max(1, lv - 1), spatial: lv, verbal: Math.max(1, lv - 2) };
    const stats = () => {
      const cur = Object.keys(u.days).filter(k => k >= L.weekStart(day)).reduce((s, k) => s + u.days[k], 0);
      return { answered: u.answered, testsDone: u.tests, longestStreak: u.longest,
        bestWeekBall: Math.max((L.best() || { ball: 0 }).ball, cur), levels, games: u.games,
        fixes: B.counters().fixes, lastRun: u.lastRun, profileComplete: u.profile };
    };
    const badges = () => B.check(stats(), tick()).forEach(id => credit(B.info(id).coins, 'badge', 'b:' + id));
    badges();
    const q = W.quests(day, { wrongCount: u.wrong, weakestType: W.weakest(levels, TYPES),
                              gameOfDay: GAMES[d % GAMES.length] }, tick());

    /* ── Faollik ── */
    const points = n => { u.days[day] = (u.days[day] || 0) + n; };
    const activeToday = () => {
      if (u.lastActive === day) return;
      u.streak = u.lastActive === W.dayKey(t - DAY) ? u.streak + 1 : 1;
      u.lastActive = day; u.longest = Math.max(u.longest, u.streak);
    };
    const answer = (mode, type) => {
      const ok = r() < P.acc;
      u.answered++; activeToday();
      if (mode !== 'test' && ok) points(10);
      if (mode === 'practice' && !ok) u.wrong++;
      let fixed = false;
      if (mode === 'review' && ok && u.wrong > 0) { u.wrong--; B.bump('fixes'); fixed = true; }
      W.track({ type: 'answer', mode, correct: ok, itemType: type, fixed: mode === 'review' ? fixed : undefined }, tick())
        .forEach(x => { got.quest += x.reward; });
      return ok;
    };
    const run = (mode, n, typeOf) => {
      let c = 0;
      for (let i = 0; i < n; i++) if (answer(mode, typeOf(i))) c++;
      u.lastRun = { kind: mode, n, correct: c };
      badges();
    };
    const tests = P.test === 'daily' ? 3 : (P.test.includes(d) ? 1 : 0);
    for (let k = 0; k < tests; k++) {
      run('test', 30, i => TYPES[i % 4]);
      u.tests++; points(Math.round(30 * P.acc) * 10);          // test ballari oxirida bir yoʻla
      badges();
    }
    if (P.practice >= 1) run('practice', 10, i => TYPES[Math.floor(r() * 4)]);
    if (P.practice >= 2) {
      const q3 = q[2];
      if (q3.kind === 'type') run('practice', 10, () => q3.type);
      else run('practice', 10, i => TYPES[i % 4]);
    }
    if (P.review && u.wrong >= 1) run('review', Math.min(10, Math.max(3, u.wrong)), i => TYPES[i % 4]);
    const ng = P.games[0] + Math.floor(r() * (P.games[1] - P.games[0] + 1));
    for (let k = 0; k < ng; k++) {
      const id = GAMES[(d + k) % GAMES.length];
      const g = u.games[id] || (u.games[id] = { plays: 0, level: 1 });
      g.plays++; g.level = Math.min(10, 1 + Math.floor(g.plays / 2));
      points(40 + Math.floor(r() * 70));
      activeToday();
      W.track({ type: 'game', id }, tick()).forEach(x => { got.quest += x.reward; });
      badges();
    }
    if (P.profileDay && d >= P.profileDay && !u.profile) { u.profile = true; badges(); }

    /* ── Xarid: eng arzon yetadigan narsa (balans hech qachon < 0) ── */
    const want = C.shelves.flatMap(s => s.items.map(e => s.kind + ':' + e.id))
      .filter(id => !W.owns(id)).sort((a, b) => C.item(a).price - C.item(b).price)[0];
    if (want && W.balance() >= C.item(want).price) {
      const res = W.spend(want, tick());
      assert.equal(res.ok, true);
      buys.push({ day: d, item: want });
    }
    assert.ok(W.balance() >= 0);
  }

  const s = W.state();
  const sum = (from, to, k) => perDay.filter(x => x.day >= from && x.day <= to).reduce((a, x) => a + x[k], 0);
  const weekCredits = s.ledger.filter(e => e.src === 'week');
  const steadyWeeks = perDay.filter(x => x.day >= 15 && x.week > 0).map(x => x.week);
  const weeksClosed = L.weeks().filter(w => w.w >= L.weekStart(W.dayKey(START + 14 * DAY)));
  const weeklyAvg = weeksClosed.length ? weeksClosed.reduce((a, w) => a + C.rewards.weekly[tierOf(w.ball)], 0) / weeksClosed.length : 0;
  return {
    name, W, B, L, C, perDay, buys, state: s, u,
    questRate: sum(15, 30, 'quest') / 16 * 7,
    weeklyAvg,
    steady: sum(15, 30, 'quest') / 16 * 7 + weeklyAvg,
    month: { quest: sum(1, 30, 'quest'), week: sum(1, 30, 'week'), badge: sum(1, 30, 'badge'), welcome: sum(1, 30, 'welcome') },
    maxQuestDay: Math.max(...perDay.map(x => x.quest)),
    maxWeek: Math.max(0, ...weekCredits.map(e => e.amt)),
    leagues: L.weeks().reverse().map(w => w.w + ':' + w.ball + '→' + ['Bosh', 'Bronza', 'Kumush', 'Oltin', 'Platina', 'Olmos'][tierOf(w.ball)]),
    badges: Object.keys(B.earned()), steadyWeeks,
  };
}

const RES = {};
for (const n of Object.keys(PROFILES)) RES[n] = simulate(n);

if (process.env.SIM_REPORT) {
  for (const r of Object.values(RES)) {
    console.log(`\n== ${r.name} ==`);
    console.log(`  barqaror hafta daromadi: ${r.steady.toFixed(1)} (vazifa ${r.questRate.toFixed(1)}/hafta + hafta mukofoti ${r.weeklyAvg.toFixed(1)})`);
    console.log(`  1-oy: vazifa ${r.month.quest}, hafta ${r.month.week}, nishon ${r.month.badge}, xush kelibsiz ${r.month.welcome} → jami ${r.state.earned}`);
    console.log(`  balans ${r.state.balance}, sarflangan ${r.state.spent}, xaridlar: ${r.buys.map(b => b.day + ':' + b.item).join(', ')}`);
    console.log(`  haftalar: ${r.leagues.join(' | ')}`);
    console.log(`  nishonlar (${r.badges.length}): ${r.badges.join(', ')}`);
    console.log(`  kunlik vazifa max ${r.maxQuestDay}, hafta mukofoti max ${r.maxWeek}; eng uzun seriya ${r.u.longest}`);
  }
}

test('barqaror hafta daromadi §6.8 oraliqlarida', () => {
  const R = { faol: [200, 320], oddiy: [80, 160], kam: [20, 80] };
  for (const [n, [lo, hi]] of Object.entries(R)) {
    const v = RES[n].steady;
    assert.ok(v >= lo && v <= hi, `${n}: ${v.toFixed(1)} ∉ [${lo}, ${hi}]`);
  }
});

test('manbalar chegaralangan: kuniga ≤ 30, hafta ≤ 100, nishonlar ≤ 870', () => {
  for (const r of Object.values(RES)) {
    assert.ok(r.maxQuestDay <= 3 * r.C.rewards.quest, r.name);
    assert.ok(r.maxWeek <= Math.max(...r.C.rewards.weekly), r.name);
    assert.ok(r.month.badge <= r.B.catalogue().reduce((a, b) => a + b.coins, 0), r.name);
    assert.ok(r.month.welcome <= r.C.rewards.welcome, r.name);
    assert.equal(r.state.balance, r.state.earned - r.state.spent, r.name);
    const srcs = new Set(r.state.ledger.map(e => e.src));
    [...srcs].forEach(s => assert.ok(['quest', 'badge', 'week', 'welcome', 'buy'].includes(s), s));
  }
});

test('fermer: 40 oʻyin va 3 test kuniga — baribir vazifadan kuniga faqat 10 tanga', () => {
  const r = RES.fermer;
  r.perDay.forEach(x => assert.ok(x.quest <= 10, 'kun ' + x.day + ': ' + x.quest));
  assert.equal(r.month.quest, 300, 'faqat q2: 30 kun × 10');
});

/* §6.8 «+200–400» — taxmin. Faol profilda 30-kuni «Olov III» (150) ham
   tushadi, shuning uchun chegara kengroq: bir martalik manba barqaror
   daromaddan oshib ketmasin (≤ 2,5 hafta daromadi). */
test('birinchi oyda nishonlar: faol foydalanuvchida bir necha yuz tanga, cheksiz emas (§6.8)', () => {
  assert.ok(RES.faol.month.badge >= 200 && RES.faol.month.badge <= 2.5 * RES.faol.steady, String(RES.faol.month.badge));
  assert.ok(RES.kam.month.badge < RES.oddiy.month.badge);
});

test('Doʻkon muddati: faol ≈ 5 oy, oddiy ≈ 10 oy (butun doʻkon 5 100)', () => {
  const total = RES.faol.C.total();
  const months = n => total / (RES[n].steady * 52 / 12);
  assert.ok(months('faol') >= 3.5 && months('faol') <= 7, months('faol').toFixed(1));
  assert.ok(months('oddiy') >= 7 && months('oddiy') <= 14, months('oddiy').toFixed(1));
});
