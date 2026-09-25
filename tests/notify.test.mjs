/* ─────────────────────────────────────────────────────────────────────────
   src/notify.js — eslatmalar rejasi va uni qoʻllash (ARXITEKTURA §7.2, §14)

   buildPlan — sof funksiya, snapshot testlari:
     bugun faol / faol emas; streak 0/1/2; vaqt oʻtgan; ≥19:30 qoidasi;
     til; 7 kun davomida kuniga ≤2 ta.
   apply — LocalNotifications taqlidi bilan: avval 1901–1907 va 1911
   bekor, ruxsat faqat interactive da soʻraladi, faqat noaniq alarm.

   Ishga tushirish:  npm test
   ───────────────────────────────────────────────────────────────────── */

process.env.TZ = 'Asia/Tashkent';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('../src/notify.js', import.meta.url), 'utf8');
const plain = x => JSON.parse(JSON.stringify(x));

const RU = {
  'Bugungi vazifalar tayyor: 10 ta savol va bitta aql oʻyini.': 'RU-daily',
  '{0} kunlik ketma-ketlikni saqlab qoling — bugun bitta savol yetarli.': 'RU-streak {0}',
};

/* lang — nzT/nzTN taqlidi uchun joriy til (i18n.js kabi global). */
function env(opts) {
  const o = opts || {};
  const calls = [];
  const ui = { lang: o.lang || 'uz' };
  const ln = o.plugin === false ? null : {
    perm: o.perm || 'granted',
    after: o.after || 'granted',
    async checkPermissions() { calls.push(['check']); return { display: this.perm }; },
    async requestPermissions() { calls.push(['request']); this.perm = this.after; return { display: this.perm }; },
    async cancel(a) { calls.push(['cancel', a.notifications.map(n => n.id)]); if (o.cancelThrows) throw new Error('x'); },
    async schedule(a) {
      calls.push(['schedule', a.notifications]);
      if (o.scheduleThrows) throw new Error('boom');
      return { notifications: a.notifications.map(n => ({ id: n.id })) };
    },
  };
  const win = {
    nzT: s => (ui.lang === 'ru' && RU[s]) || s,
    nzTN: (s, n) => ((ui.lang === 'ru' && RU[s]) || s).replace('{0}', String(n)),
  };
  if (ln) win.Capacitor = { Plugins: { LocalNotifications: ln } };
  const ctx = { window: win, Date, Promise };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  return { n: win.nzNotify, calls, ui, ln };
}

const at = (y, mo, d, h, m) => new Date(y, mo - 1, d, h, m || 0).getTime();
const cfg = (x) => Object.assign({ remind: { on: true, h: 19, m: 0 }, streakRemind: true }, x || {});
const fmt = t => {
  const d = new Date(t);
  return `${d.getMonth() + 1}-${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const snap = plan => plain(plan.map(p => `${p.id} ${fmt(p.at)} ${p.extra.kind}`));

const NOON = at(2026, 9, 25, 12);

test('faol emas, streak 5, 19:00: 7 ta kunlik + bugun 21:30 streak', () => {
  const { n } = env();
  const plan = n.buildPlan(NOON, cfg(), { activeToday: false, streak: 5, lang: 'uz' });
  assert.deepEqual(snap(plan), [
    '1901 9-25 19:00 daily', '1911 9-25 21:30 streak', '1902 9-26 19:00 daily',
    '1903 9-27 19:00 daily', '1904 9-28 19:00 daily', '1905 9-29 19:00 daily',
    '1906 9-30 19:00 daily', '1907 10-1 19:00 daily',
  ]);
  const d = plan.find(p => p.id === 1901), s = plan.find(p => p.id === 1911);
  assert.equal(d.title, 'IQuest');
  assert.equal(d.body, 'Bugungi vazifalar tayyor: 10 ta savol va bitta aql oʻyini.');
  assert.equal(s.body, '5 kunlik ketma-ketlikni saqlab qoling — bugun bitta savol yetarli.');
  assert.deepEqual(plain(d.extra), { to: 'home', kind: 'daily', lang: 'uz' });
});

test('bugun faol: bugungi kunlik tashlanadi, streak ERTAGA 21:30', () => {
  const { n } = env();
  const plan = n.buildPlan(NOON, cfg(), { activeToday: true, streak: 5, lang: 'uz' });
  assert.deepEqual(snap(plan).slice(0, 3), ['1902 9-26 19:00 daily', '1911 9-26 21:30 streak', '1903 9-27 19:00 daily']);
  assert.equal(plan.length, 7);
  assert.ok(!plan.some(p => p.id === 1901));
});

test('streak 0 / 1 → streak eslatmasi yoʻq; 2 → bor', () => {
  const { n } = env();
  for (const [streak, has] of [[0, false], [1, false], [2, true]]) {
    const plan = n.buildPlan(NOON, cfg(), { activeToday: false, streak, lang: 'uz' });
    assert.equal(plan.some(p => p.id === 1911), has, `streak ${streak}`);
  }
  const off = n.buildPlan(NOON, cfg({ streakRemind: false }), { activeToday: false, streak: 9, lang: 'uz' });
  assert.ok(!off.some(p => p.id === 1911));
});

test('vaqt oʻtgan: bugungi kunlik ham, 21:30 dan keyin bugungi streak ham yoʻq', () => {
  const { n } = env();
  const p1 = n.buildPlan(at(2026, 9, 25, 20), cfg(), { activeToday: false, streak: 3, lang: 'uz' });
  assert.deepEqual(snap(p1).slice(0, 2), ['1911 9-25 21:30 streak', '1902 9-26 19:00 daily']);
  const p2 = n.buildPlan(at(2026, 9, 25, 22), cfg(), { activeToday: false, streak: 3, lang: 'uz' });
  assert.ok(!p2.some(p => p.id === 1911), 'streak yarim tunda buziladi — kechikkan eslatma yoʻq');
  assert.equal(p2.length, 6);
});

test('kun 04:00 da almashadi: 02:00 da hali «kecha» — oʻtib ketgan vaqtlar qoʻyilmaydi', () => {
  const { n } = env();
  const plan = n.buildPlan(at(2026, 9, 26, 2), cfg(), { activeToday: false, streak: 3, lang: 'uz' });
  assert.deepEqual(snap(plan), [
    '1902 9-26 19:00 daily', '1903 9-27 19:00 daily', '1904 9-28 19:00 daily',
    '1905 9-29 19:00 daily', '1906 9-30 19:00 daily', '1907 10-1 19:00 daily',
  ]);
});

test('kunlik eslatma ≥ 19:30 → streak eslatmasi qoʻyilmaydi; < 19:30 → qoʻyiladi', () => {
  const { n } = env();
  for (const [h, m, has] of [[19, 30, false], [21, 0, false], [19, 29, true], [9, 0, true]]) {
    const plan = n.buildPlan(at(2026, 9, 25, 8), cfg({ remind: { on: true, h, m } }), { activeToday: false, streak: 4, lang: 'uz' });
    assert.equal(plan.some(p => p.id === 1911), has, `${h}:${m}`);
  }
  const noDaily = n.buildPlan(NOON, cfg({ remind: { on: false, h: 21, m: 0 } }), { activeToday: false, streak: 4, lang: 'uz' });
  assert.deepEqual(snap(noDaily), ['1911 9-25 21:30 streak'], 'kunlik eslatma oʻchiq — streak yolgʻiz');
});

test('hammasi oʻchiq (yangi oʻrnatish standarti) → boʻsh reja', () => {
  const { n } = env();
  const plan = n.buildPlan(NOON, { remind: { on: false, h: 19, m: 0 }, streakRemind: false }, { activeToday: false, streak: 9, lang: 'uz' });
  assert.deepEqual(plain(plan), []);
  assert.deepEqual(plain(n.buildPlan(NOON, null, null)), []);
});

test('til: matn reja tuzilayotgan paytdagi tilda; til almashsa yangi reja yangi tilda', () => {
  const e = env({ lang: 'uz' });
  const ctx = { activeToday: false, streak: 3, lang: 'uz' };
  const uz = e.n.buildPlan(NOON, cfg(), ctx);
  e.ui.lang = 'ru';
  const ru = e.n.buildPlan(NOON, cfg(), Object.assign({}, ctx, { lang: 'ru' }));
  assert.equal(uz[0].body, 'Bugungi vazifalar tayyor: 10 ta savol va bitta aql oʻyini.');
  assert.equal(ru[0].body, 'RU-daily');
  assert.equal(ru.find(p => p.id === 1911).body, 'RU-streak 3');
  assert.equal(ru[0].extra.lang, 'ru');
  assert.equal(ru[0].title, 'IQuest', 'brend nomi tarjima qilinmaydi');
});

test('matn halol: vaʼda yoʻq, faqat kunda sanaladigan narsa', () => {
  const { n } = env();
  const plan = n.buildPlan(NOON, cfg(), { activeToday: false, streak: 3, lang: 'uz' });
  for (const p of plan) {
    assert.ok(!/IQ.*osh|aqlli|rasmiy|yoki bitta/i.test(p.body), p.body);
  }
});

test('7 kun davomida kuniga ≤ 2 ta, ID lar noyob va hammasi kelajakda', () => {
  const { n } = env();
  const times = [];
  for (let h = 0; h < 24; h++) times.push(at(2026, 9, 25, h, 17));
  for (const now of times) {
    for (const [rh, rm] of [[7, 0], [9, 0], [12, 0], [18, 0], [19, 0], [19, 30], [20, 0], [21, 0], [2, 0], [23, 59]]) {
      for (const active of [false, true]) {
        for (const streak of [0, 2, 30]) {
          for (const on of [false, true]) {
            const plan = n.buildPlan(now, { remind: { on, h: rh, m: rm }, streakRemind: true }, { activeToday: active, streak, lang: 'uz' });
            const ids = plan.map(p => p.id);
            assert.equal(new Set(ids).size, ids.length);
            assert.ok(plan.length <= 8);
            const per = {};
            for (const p of plan) {
              assert.ok(p.at > now, 'oʻtgan vaqt yoʻq');
              assert.ok(p.at <= now + 8 * 86400000);
              assert.ok([1901, 1902, 1903, 1904, 1905, 1906, 1907, 1911].includes(p.id));
              const d = new Date(p.at); const k = d.toDateString();
              per[k] = (per[k] || 0) + 1;
              assert.ok(per[k] <= 2, `kuniga ≤2: ${k}`);
            }
          }
        }
      }
    }
  }
});

test('apply: plagin yoʻq → unsupported', async () => {
  const { n } = env({ plugin: false });
  assert.equal(n.available(), false);
  assert.equal(await n.apply([], {}), 'unsupported');
  assert.equal(await n.permission(), 'unsupported');
});

test('apply: avval hamma ID bekor, keyin noaniq alarm bilan qoʻyiladi', async () => {
  const { n, calls } = env();
  const now = Date.now();
  const plan = n.buildPlan(now, cfg(), { activeToday: false, streak: 3, lang: 'uz' });
  assert.equal(await n.apply(plan, { interactive: false }), 'scheduled');
  assert.deepEqual(plain(calls[0]), ['cancel', [1901, 1902, 1903, 1904, 1905, 1906, 1907, 1911]]);
  const sch = calls.find(c => c[0] === 'schedule')[1];
  assert.equal(sch.length, plan.length);
  for (const x of sch) {
    assert.equal(x.isExactNotification, false, 'aniq alarm yoʻq');
    assert.ok(x.schedule.at instanceof Date);
    assert.equal(x.schedule.allowWhileIdle, true);
    assert.equal(x.schedule.on, undefined, 'takroriy reja yoʻq');
    assert.equal(x.extra.to, 'home');
  }
  assert.ok(!calls.some(c => c[0] === 'request'));
});

test('apply: ruxsat yoʻq — ochilishda soʻralmaydi (no-permission), bosilganda soʻraladi', async () => {
  const plan = [{ id: 1902, at: Date.now() + 86400000, title: 'IQuest', body: 'x', extra: { to: 'home' } }];
  const a = env({ perm: 'prompt' });
  assert.equal(await a.n.apply(plan, { interactive: false }), 'no-permission');
  assert.ok(!a.calls.some(c => c[0] === 'request' || c[0] === 'schedule'));
  assert.equal(a.calls[0][0], 'cancel', 'eski eslatmalar baribir olib tashlanadi');

  const b = env({ perm: 'prompt', after: 'denied' });
  assert.equal(await b.n.apply(plan, { interactive: true }), 'denied');
  assert.ok(b.calls.some(c => c[0] === 'request'));
  assert.ok(!b.calls.some(c => c[0] === 'schedule'));

  const c = env({ perm: 'prompt', after: 'granted' });
  assert.equal(await c.n.apply(plan, { interactive: true }), 'scheduled');
  assert.ok(c.calls.some(x => x[0] === 'schedule'));
});

test('apply: boʻsh reja — faqat bekor qilish; interactive boʻlsa ruxsat soʻraladi', async () => {
  const a = env({ perm: 'prompt' });
  assert.equal(await a.n.apply([], { interactive: false }), 'scheduled');
  assert.deepEqual(a.calls.map(c => c[0]), ['cancel']);
  const b = env({ perm: 'prompt', after: 'denied' });
  assert.equal(await b.n.apply([], { interactive: true }), 'denied', 'streak eslatmasi yoqildi (streak < 2) — ruxsat hozir soʻraladi');
});

test('apply: oʻtib ketgan va begona ID li yozuvlar qoʻyilmaydi; xato → error', async () => {
  const e = env();
  const plan = [
    { id: 1901, at: Date.now() - 1000, title: 'IQuest', body: 'x', extra: {} },
    { id: 42, at: Date.now() + 86400000, title: 'IQuest', body: 'x', extra: {} },
    { id: 1903, at: Date.now() + 86400000, title: 'IQuest', body: 'x', extra: {} },
  ];
  assert.equal(await e.n.apply(plan, {}), 'scheduled');
  assert.deepEqual(e.calls.find(c => c[0] === 'schedule')[1].map(x => x.id), [1903]);
  const bad = env({ scheduleThrows: true });
  assert.equal(await bad.n.apply(plan, {}), 'error');
  const badCancel = env({ cancelThrows: true });
  assert.equal(await badCancel.n.apply(plan, {}), 'scheduled', 'cancel xatosi rejani toʻxtatmaydi');
});

test('apply: chaqiruvlar ketma-ket — cancel/schedule aralashmaydi', async () => {
  const e = env();
  const p = [{ id: 1902, at: Date.now() + 86400000, title: 'IQuest', body: 'x', extra: {} }];
  await Promise.all([e.n.apply(p, {}), e.n.apply(p, {}), e.n.apply([], {})]);
  assert.deepEqual(e.calls.map(c => c[0]), ['cancel', 'check', 'schedule', 'cancel', 'check', 'schedule', 'cancel']);
});

test('permission(): soʻramasdan holatni aytadi', async () => {
  assert.equal(await env({ perm: 'granted' }).n.permission(), 'granted');
  assert.equal(await env({ perm: 'denied' }).n.permission(), 'denied');
  assert.equal(await env({ perm: 'prompt' }).n.permission(), 'prompt');
});
