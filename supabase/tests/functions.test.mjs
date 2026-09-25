/* ─────────────────────────────────────────────────────────────────────────
   Edge Function'lar mantig'ining tekshiruvi (Node — Deno shart emas)

   Serverdagi AYNAN o'sha modullar yuklanadi: supabase/functions/_shared/
   (handler, core, auth) va dvigatel nusxasi (_shared/engine — strict ES
   modul, Deno'dagidek). Baza — xotiradagi taqlid (0006 dagi funksiyalar
   xulqi); haqiqiy PostgreSQL bilan to'liq zanjir esa run.mjs dagi
   integratsion testda (functions.integration.mjs).

   Asosiy hujumlar:
     · test-start / test-answer javobida correct, explain, id (urug') —
       HECH QACHON yo'q (o'nlab so'rovlar bo'ylab rekursiv tekshiriladi);
     · boshqaning sessiyasiga javob, tez javob, yopilgan sessiyaga javob;
     · soxta/imzosiz/muddati o'tgan/service_role token;
     · mijoz yuborgan ball (iq, points) e'tiborga olinmaydi.

   Ishga tushirish:  node --test supabase/tests/*.test.mjs
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { IQ } from '../functions/_shared/engine/index.mjs';
import { handle } from '../functions/_shared/handler.mjs';
import { publicItem, replaySession, verifyClientTest, verifyGame, CERT_LENGTH } from '../functions/_shared/core.mjs';
import { dbError, restDb } from '../functions/_shared/db.mjs';

const SECRET = 'sinov-uchun-jwt-siri-kamida-32-belgi-uzunlikda';
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';

/* ── Sinov o'yini: dvigateldagi haqiqiy o'yinlar boshqa egalarniki va
   hali yozilyapti — verifyGame mexanikasi ulardan mustaqil sinalsin. ── */
if (!IQ.games.get('probe')) {
  IQ.games.register({
    id: 'probe', skill: 'attention',
    title: { uz: 'Sinov', ru: 'Тест' }, desc: { uz: 'Sinov', ru: 'Тест' },
    create(seed, level) {
      const r = IQ.rng(seed), N = 9, ROUNDS = 5, log = [];
      let round = 0, hits = 0, lit = r.int(N), t0 = null, tEnd = 0, done = false;
      return {
        get done() { return done; },
        tick(now) { if (t0 === null) t0 = now; return false; },
        tap(i, now) {
          if (done) return;
          log.push({ t: now, k: 'tap', v: i });
          if (i === lit) hits++;
          if (++round >= ROUNDS) { done = true; tEnd = now; } else lit = r.int(N);
        },
        press() {},
        log: () => log.slice(),
        lit: () => lit,
        view: () => ({}),
        result: () => ({ score: hits, points: hits * 20, correct: hits, total: ROUNDS,
                         durationMs: t0 === null ? 0 : tEnd - t0, nextLevel: level }),
      };
    },
  });
}

/* ── JWT ─────────────────────────────────────────────────────────────── */
const b64u = x => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url');
function jwt(claims, opts) {
  opts = opts || {};
  const header = b64u({ alg: opts.alg || 'HS256', typ: 'JWT' });
  const payload = b64u(Object.assign({ role: 'authenticated', aud: 'authenticated',
                                       exp: Math.floor(Date.now() / 1000) + 3600 }, claims));
  const sig = opts.alg === 'none' ? '' : createHmac('sha256', opts.secret || SECRET)
    .update(header + '.' + payload).digest('base64url');
  return header + '.' + payload + '.' + sig;
}
const tok = (sub, extra) => jwt(Object.assign({ sub }, extra || {}));

/* ── Bazaning xotiradagi taqlidi (0006 xulqi) ────────────────────────── */
class FakeDb {
  constructor(clock) {
    this.clock = clock;
    this.sessions = [];
    this.results = [];
    this.games = [];
    this.calls = [];
  }
  async rpc(name, a) {
    this.calls.push([name, JSON.parse(JSON.stringify(a))]);
    if (!this[name]) throw new Error('FakeDb: ' + name);
    return JSON.parse(JSON.stringify(this[name](a)));
  }
  err(code, msg) { return dbError({ code, message: msg || code }, 400); }
  now() { return new Date(this.clock.t).toISOString(); }
  test_session_open({ p_user, p_engine, p_types, p_length, p_create }) {
    let s = this.sessions.find(x => x.user_id === p_user && x.state === 'open');
    if (s) return Object.assign({}, s, { created: false, now: this.now() });
    if (!p_create) return null;
    if (this.sessions.filter(x => x.user_id === p_user && this.clock.t - x.started < 864e5).length >= 3) {
      throw this.err('ZK429');
    }
    s = { id: randomUUID(), user_id: p_user, engine: p_engine, seed: (Math.random() * 4294967296) >>> 0,
          types: p_types, length: p_length, log: [], shown: this.clock.t, started: this.clock.t,
          deadline: new Date(this.clock.t + 3600e3).toISOString(), state: 'open' };
    this.sessions.push(s);
    return Object.assign({}, s, { created: true, now: this.now() });
  }
  test_session_answer({ p_session, p_user, p_index, p_item_id, p_answer, p_min_ms }) {
    const s = this.sessions.find(x => x.id === p_session);
    if (!s || s.user_id !== p_user) throw this.err('ZK404');
    if (s.state !== 'open') throw this.err('ZK410');
    if (this.clock.t > Date.parse(s.deadline)) throw this.err('ZK410');
    if (p_index !== s.log.length) throw this.err('ZK409');
    const ms = this.clock.t - s.shown;
    if (ms < Math.max(p_min_ms || 300, 300)) throw this.err('ZK422');
    s.log.push({ id: p_item_id, answer: p_answer, ms });
    s.shown = this.clock.t;
    return { index: p_index + 1, ms };
  }
  test_session_finish({ p_session, p_user, p_state, p_result, p_eligible, p_points }) {
    const s = this.sessions.find(x => x.id === p_session);
    if (!s || s.user_id !== p_user) throw this.err('ZK404');
    if (s.state !== 'open') throw this.err('ZK410');
    if (p_state === 'done' && s.log.length !== s.length) throw this.err('ZK409');
    s.state = p_state;
    const cert = p_eligible && p_state === 'done' && s.length >= 30 && p_result.reliable ? 'IQ-TEST-2345' : null;
    this.results.push({ user: p_user, certified: true, result: p_result, points: p_points, cert });
    return { id: this.results.length, points: p_points, certificate: cert, duplicate: false };
  }
  test_session_void({ p_session, p_user }) {
    const s = this.sessions.find(x => x.id === p_session && x.user_id === p_user && x.state === 'open');
    if (s) s.state = 'void';
    return null;
  }
  record_test_result(a) {
    this.results.push({ user: a.p_user, certified: false, result: a.p_result, points: a.p_points, args: a });
    return { id: this.results.length, points: a.p_points, duplicate: false };
  }
  record_game_result(a) {
    this.games.push(a);
    return { id: this.games.length, points: a.p_result.points, duplicate: false };
  }
}

function setup(envOver) {
  const clock = { t: Date.parse('2026-09-25T08:00:00Z') };
  const db = new FakeDb(clock);
  const env = Object.assign({ JWT_SECRET: SECRET }, envOver || {});
  const deps = { IQ, db, env: n => env[n], fetch: async () => { throw new Error('tarmoq yo\'q'); },
                 now: () => Date.now() };
  const seen = [];     // test davomidagi hamma javob — sizish tekshiruvi uchun
  async function call(route, body, token, headers) {
    const req = new Request('https://api.test/functions/v1/' + route, {
      method: (headers && headers.method) || 'POST',
      headers: Object.assign({ 'content-type': 'application/json' },
                             token ? { authorization: 'Bearer ' + token } : {},
                             (headers && headers.h) || {}),
      body: (headers && headers.method === 'GET') ? undefined : JSON.stringify(body || {}),
    });
    const res = await handle(route, req, deps);
    const json = res.status === 204 ? null : await res.json();
    if (route === 'test-start' || route === 'test-answer') seen.push(json);
    return { status: res.status, json, res };
  }
  return { clock, db, deps, call, seen };
}

/* Obyekt ichida (rekursiv) taqiqlangan kalitlar bormi. */
function forbiddenKeys(x, keys, path, out) {
  out = out || [];
  if (Array.isArray(x)) x.forEach((v, i) => forbiddenKeys(v, keys, path + '[' + i + ']', out));
  else if (x && typeof x === 'object') {
    for (const k of Object.keys(x)) {
      if (keys.includes(k)) out.push(path + '.' + k);
      forbiddenKeys(x[k], keys, path + '.' + k, out);
    }
  }
  return out;
}

/* Sessiyani tugatguncha javob beradi. pick(item, index) → javob indeksi. */
async function playToEnd(env, token, first, pick) {
  let r = first;
  let guard = 0;
  while (r.json.ok && !r.json.finished && guard++ < 100) {
    env.clock.t += 4000;
    r = await env.call('test-answer', { session: first.json.session, answer: pick(r.json.item, r.json.index) }, token);
  }
  return r;
}


/* ═══ 1. SAVOL MIJOZGA JAVOBSIZ VA URUG'SIZ ═════════════════════════════ */

test('publicItem: correct, explain, id, b yo\'q; urug\' SVG/matn ichida ham sizmaydi', () => {
  let checked = 0;
  for (const type of IQ.types()) {
    for (let level = 1; level <= 10; level++) {
      for (let k = 0; k < 12; k++) {
        const seed = (123457 + level * 7919 + k * 104729) >>> 0;
        let it;
        try { it = IQ.makeItem(type, seed, level); } catch (e) { continue; }
        const p = publicItem(it);
        assert.deepEqual(Object.keys(p).filter(x => !['type', 'level', 'prompt', 'stimulus', 'options', 'timeLimit'].includes(x)), []);
        const s = JSON.stringify(p);
        const itemSeed = it.id.split(':')[2];
        assert.ok(!s.includes(it.id), 'savol id si javobda bor: ' + it.id);
        if (itemSeed.length >= 5) assert.ok(!s.includes(itemSeed), `${type}: urug' (${itemSeed}) savol ichida sizib chiqdi`);
        checked++;
      }
    }
  }
  assert.ok(checked > 100, 'yetarli savol tekshirilmadi: ' + checked);
});


/* ═══ 2. SERTIFIKATLI TEST — to'liq oqim ═════════════════════════════════ */

test('sertifikatli test: boshlash → 30 javob → natija, sertifikat, ko\'rib chiqish; hech bir savolda javob yo\'q', async () => {
  const env = setup();
  const t = tok(A);
  const start = await env.call('test-start', {}, t);
  assert.equal(start.status, 200, JSON.stringify(start.json));
  assert.equal(start.json.index, 0);
  assert.equal(start.json.length, CERT_LENGTH);
  assert.ok(start.json.deadline && start.json.session);

  /* Server urug'ini bilgan "sinovchi" javoblarning ~60% ini to'g'ri
     beradi — natija ishonchli bo'lsin (hammasi to'g'ri bo'lsa θ shkala
     tepasiga chiqadi va se > 0.5 — reliable: false, bu ham to'g'ri xulq). */
  const row = env.db.sessions[0];
  const shadow = IQ.session.create({ mode: 'test', types: row.types, length: row.length, seed: row.seed });
  const end = await playToEnd(env, t, start, (item, i) => {
    const it = shadow.current();
    const ans = (i % 5 < 3) ? it.correct : (it.correct + 1) % it.options.length;
    shadow.answer(ans, 4000);
    return ans;
  });

  assert.equal(end.status, 200, JSON.stringify(end.json));
  assert.equal(end.json.finished, true);
  assert.equal(end.json.state, 'done');
  assert.equal(end.json.result.n, 30);
  assert.equal(end.json.result.reliable, true);
  assert.equal(end.json.certificate, 'IQ-TEST-2345');
  assert.equal(end.json.review.length, 30);
  assert.ok(end.json.review.every(r => Number.isInteger(r.correct) && r.explain), 'yakunda ko\'rib chiqishda javob va izoh bor');

  // Yakundan OLDINGI hamma javobda correct/explain/id/b yo'q.
  const during = env.seen.filter(j => !j.finished);
  assert.ok(during.length >= 30);
  assert.deepEqual(forbiddenKeys(during, ['correct', 'explain', 'id', 'b', 'seed', 'log']), []);

  // Natijani server hisobladi: bazaga dvigatel natijasi ketdi, sertifikat shartlari bilan.
  const fin = env.db.calls.find(c => c[0] === 'test_session_finish')[1];
  assert.equal(fin.p_eligible, true);
  assert.equal(fin.p_result.n, 30);
  assert.equal(fin.p_user, A, 'foydalanuvchi tokendan olinadi');
  assert.deepEqual(env.db.results[0].result, fin.p_result);

  // Yopilgan sessiyaga javob — rad.
  env.clock.t += 5000;
  const late = await env.call('test-answer', { session: start.json.session, answer: 0 }, t);
  assert.equal(late.status, 410);
});


test('davom ettirish: qayta boshlash — o\'sha sessiya, o\'sha savol; resume yangisini ochmaydi', async () => {
  const env = setup();
  const none = await env.call('test-start', { resume: true }, tok(A));
  assert.equal(none.status, 404);
  assert.equal(none.json.error, 'none');
  assert.equal(env.db.sessions.length, 0, 'resume yangi sessiya ochmasligi kerak');

  const a = await env.call('test-start', {}, tok(A));
  env.clock.t += 2000;
  const ans = await env.call('test-answer', { session: a.json.session, answer: 1 }, tok(A));
  assert.equal(ans.json.index, 1);
  const again = await env.call('test-start', { resume: true }, tok(A));
  assert.equal(again.json.session, a.json.session);
  assert.equal(again.json.index, 1);
  assert.equal(again.json.resumed, true);
  assert.deepEqual(again.json.item, ans.json.item, 'aynan o\'sha savol qayta beriladi');
});


test('tez javob (< MIN_MS) rad etiladi va hisoblanmaydi', async () => {
  const env = setup();
  const a = await env.call('test-start', {}, tok(A));
  env.clock.t += IQ.session.MIN_MS - 1;
  const fast = await env.call('test-answer', { session: a.json.session, answer: 0 }, tok(A));
  assert.equal(fast.status, 422);
  assert.equal(fast.json.error, 'too_fast');
  assert.equal(env.db.sessions[0].log.length, 0, 'tez javob jurnalga yozilmasligi kerak');
  env.clock.t += 5;
  const ok = await env.call('test-answer', { session: a.json.session, answer: 0 }, tok(A));
  assert.equal(ok.status, 200);
});


test('boshqaning sessiyasiga javob yuborib bo\'lmaydi', async () => {
  const env = setup();
  const a = await env.call('test-start', {}, tok(A));
  await env.call('test-start', {}, tok(B));
  env.clock.t += 2000;
  const hijack = await env.call('test-answer', { session: a.json.session, answer: 0 }, tok(B));
  assert.equal(hijack.status, 410);
  assert.equal(env.db.sessions[0].log.length, 0, 'A ning sessiyasiga hech narsa yozilmadi');
  const noSession = await env.call('test-answer', { session: a.json.session, answer: 0 }, tok(C));
  assert.equal(noSession.status, 410);
});


test('javob chegarasi va shakli tekshiriladi', async () => {
  const env = setup();
  const a = await env.call('test-start', {}, tok(A));
  env.clock.t += 2000;
  for (const bad of [99, -2, 1.5, '1', null]) {
    const r = await env.call('test-answer', { session: a.json.session, answer: bad }, tok(A));
    assert.equal(r.status, 400, 'answer=' + JSON.stringify(bad));
  }
  const r = await env.call('test-answer', { session: 'sessiya', answer: 0 }, tok(A));
  assert.equal(r.status, 400);
  assert.equal(env.db.sessions[0].log.length, 0);
});


test('muddat o\'tsa: yakun "expired", javobsizlar xato, sertifikat YO\'Q', async () => {
  const env = setup();
  const a = await env.call('test-start', {}, tok(A));
  env.clock.t += 2000;
  await env.call('test-answer', { session: a.json.session, answer: 0 }, tok(A));
  env.clock.t += 61 * 60 * 1000;
  const r = await env.call('test-answer', { session: a.json.session, answer: 0 }, tok(A));
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.state, 'expired');
  assert.equal(r.json.certificate, null);
  assert.equal(r.json.result.n, 30);
  const fin = env.db.calls.find(c => c[0] === 'test_session_finish')[1];
  assert.equal(fin.p_eligible, false);
  assert.equal(fin.p_state, 'expired');
});


test('server dvigateli yangilanib sessiya qayta o\'ynalmasa — bekor qilinadi, yangisi ochiladi', async () => {
  const env = setup();
  const a = await env.call('test-start', {}, tok(A));
  env.clock.t += 2000;
  await env.call('test-answer', { session: a.json.session, answer: 0 }, tok(A));
  env.db.sessions[0].log[0].id = 'matrix:5:999999';   // endi dvigatelga mos emas
  const r = await env.call('test-start', {}, tok(A));
  assert.equal(r.status, 200);
  assert.notEqual(r.json.session, a.json.session);
  assert.equal(env.db.sessions[0].state, 'void');
});


/* ═══ 3. TOKEN ══════════════════════════════════════════════════════════ */

test('token: yo\'q, soxta imzo, alg=none, muddati o\'tgan, service_role — 401; anonim — 403', async () => {
  const env = setup();
  const cases = [
    [null, 401],
    [jwt({ sub: A }, { secret: 'boshqa-sir-boshqa-sir-boshqa-sir-0000' }), 401],
    [jwt({ sub: A }, { alg: 'none' }), 401],
    [jwt({ sub: A, exp: Math.floor(Date.now() / 1000) - 10 }), 401],
    [jwt({ sub: A, role: 'service_role' }), 401],
    [jwt({ sub: A, role: 'anon' }), 401],
    [jwt({ sub: 'hech-kim' }), 401],
    ['bu.token.emas', 401],
    [jwt({ sub: A, is_anonymous: true }), 403],
  ];
  for (const [t, want] of cases) {
    const r = await env.call('test-start', {}, t);
    assert.equal(r.status, want, 'token: ' + String(t).slice(0, 40));
  }
  assert.equal(env.db.calls.length, 0, 'bazaga birorta ham so\'rov ketmadi');
});


test('JWT_SECRET bo\'lmasa — foydalanuvchi GoTrue\'dan so\'raladi', async () => {
  const env = setup({ JWT_SECRET: undefined, SUPABASE_URL: 'http://kong:8000', SUPABASE_ANON_KEY: 'anon' });
  const asked = [];
  env.deps.fetch = async (url, init) => {
    asked.push([url, init.headers.Authorization]);
    return init.headers.Authorization === 'Bearer yaxshi'
      ? new Response(JSON.stringify({ id: A, is_anonymous: false }), { status: 200 })
      : new Response('{}', { status: 401 });
  };
  assert.equal((await env.call('test-start', {}, 'yaxshi')).status, 200);
  assert.equal((await env.call('test-start', {}, 'yomon')).status, 401);
  assert.equal(asked[0][0], 'http://kong:8000/auth/v1/user');

  const bare = setup({ JWT_SECRET: undefined });
  const r = await bare.call('test-start', {}, 'x');
  assert.equal(r.status, 500);
  assert.equal(r.json.message, undefined, '5xx da ichki xabar tashqariga chiqmaydi');
});


/* ═══ 4. HTTP ═══════════════════════════════════════════════════════════ */

test('CORS: faqat ruxsat etilgan manba; faqat POST; katta tana — 413', async () => {
  const env = setup();
  const pre = await env.call('test-start', null, null, { method: 'OPTIONS', h: { origin: 'https://iquest.uz' } });
  assert.equal(pre.status, 204);
  assert.equal(pre.res.headers.get('access-control-allow-origin'), 'https://iquest.uz');
  const evil = await env.call('test-start', null, null, { method: 'OPTIONS', h: { origin: 'https://yomon.example' } });
  assert.equal(evil.res.headers.get('access-control-allow-origin'), null);
  const get = await env.call('test-start', null, tok(A), { method: 'GET' });
  assert.equal(get.status, 405);
  const big = await env.call('submit-game', { client_id: randomUUID(), pad: 'x'.repeat(600 * 1024) }, tok(A));
  assert.equal(big.status, 413);
});


/* ═══ 5. QURILMADAGI TEST (submit-test) ═════════════════════════════════ */

function clientJournal(seed, ms) {
  const s = IQ.session.create({ mode: 'test', seed });
  let n = 0;
  while (!s.done) {
    const it = s.current();
    s.answer(n++ % 2 ? it.correct : (it.correct + 1) % it.options.length, typeof ms === 'function' ? ms(n) : ms);
  }
  return { s, journal: s.submission(), result: s.result() };
}

test('submit-test: ball serverda qayta hisoblanadi, mijoz yuborgani e\'tiborga olinmaydi; sertifikat yo\'q', async () => {
  const env = setup();
  const { journal, result } = clientJournal(424242, 5000);
  const body = { client_id: randomUUID(), journal, iq: 145, points: 1000, user_id: B, certificate: true };
  const r = await env.call('submit-test', body, tok(A));
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const args = env.db.calls.find(c => c[0] === 'record_test_result')[1];
  assert.equal(args.p_user, A, 'foydalanuvchi TOKENdan, tanadagi user_id emas');
  assert.equal(args.p_result.iq, result.iq);
  assert.equal(args.p_result.correct, result.correct);
  assert.ok(args.p_points <= 3 * result.correct + 20, 'ball server formulasi bilan');
  assert.equal(args.p_responses, null, 'rozilik yo\'q — kalibrlash javoblari yuborilmaydi');
  assert.ok(!('p_certified' in args), 'qurilmadagi test sertifikat yo\'liga kira olmaydi');
});

test('submit-test: soxtalashtirilgan jurnal rad etiladi', async () => {
  const env = setup();
  const { journal } = clientJournal(777, 5000);
  const cases = {
    'tartib almashgan': j => { const t = j.items[0]; j.items[0] = j.items[1]; j.items[1] = t; },
    'begona savol': j => { j.items[3].id = 'matrix:1:1'; },
    'javob chegarada emas': j => { j.items[2].answer = 99; },
    'juda tez': j => { j.items[4].ms = 10; },
    'yarim test': j => { j.items.pop(); },
    'boshqa urug\'': j => { j.seed = j.seed + 1; },
    'boshqa dvigatel': j => { j.engine = 'eski'; },
  };
  for (const [name, patch] of Object.entries(cases)) {
    const j = JSON.parse(JSON.stringify(journal));
    patch(j);
    const r = await env.call('submit-test', { client_id: randomUUID(), journal: j }, tok(A));
    assert.ok(r.status === 422 || r.status === 409, name + ': ' + r.status);
  }
  assert.equal(env.db.calls.length, 0, 'rad etilgan jurnal bazaga yetib bormadi');
});

test('submit-test: hamma javob chegaraga yopishgan (skript) — shubhali, 0 ball; rozilik bilan kalibrlash', async () => {
  const env = setup();
  const { journal } = clientJournal(99, 350);
  const r = await env.call('submit-test', { client_id: randomUUID(), journal, calibrate: true }, tok(A));
  assert.equal(r.status, 200);
  const args = env.db.calls[0][1];
  assert.equal(args.p_suspicious, true);
  assert.equal(args.p_points, 0);
  assert.equal(args.p_responses.length, 30);
  assert.deepEqual(forbiddenKeys(args.p_responses, ['user', 'user_id', 'client_id', 'seed']), []);
});


/* ═══ 6. O'YIN (submit-game) ════════════════════════════════════════════ */

function playProbe(seed, level, dt) {
  const g = IQ.games.create('probe', seed, level);
  let t = 1000;
  g.tick(t);
  while (!g.done) { t += dt; g.tick(t); g.tap(g.lit(), t); }
  return { log: g.log(), result: g.result() };
}

test('submit-game: ball replay bilan serverda; mijoz yuborgan ball e\'tiborsiz', async () => {
  const env = setup();
  const { log, result } = playProbe(5, 3, 700);
  const r = await env.call('submit-game', { client_id: randomUUID(), game: 'probe', seed: 5, level: 3, log,
                                            points: 1000, score: 99999 }, tok(A));
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const args = env.db.calls[0][1];
  assert.equal(args.p_result.points, result.points);
  assert.equal(args.p_result.score, result.score);
  assert.equal(args.p_user, A);
});

test('submit-game: noma\'lum/demo o\'yin, tugamagan o\'yin, orqaga vaqt, avtokliker', async () => {
  const env = setup();
  const { log } = playProbe(5, 3, 700);
  const bad = [
    { game: 'demo', seed: 5, level: 3, log },
    { game: 'yoq-oyin', seed: 5, level: 3, log },
    { game: 'probe', seed: 5, level: 3, log: log.slice(0, 2) },
    { game: 'probe', seed: 5, level: 3, log: log.map((e, i) => Object.assign({}, e, { t: 10000 - i })) },
    { game: 'probe', seed: -1, level: 3, log },
    { game: 'probe', seed: 5, level: 11, log },
  ];
  for (const b of bad) {
    const r = await env.call('submit-game', Object.assign({ client_id: randomUUID() }, b), tok(A));
    assert.ok(r.status === 400 || r.status === 422, JSON.stringify(b).slice(0, 60) + ' → ' + r.status);
  }
  assert.equal(env.db.calls.length, 0);

  // Avtokliker: 30 ms oraliq bilan — natija yoziladi, ball 0.
  const fast = playProbe(6, 3, 30);
  const many = fast.log.concat(Array.from({ length: 12 }, (_, i) => ({ t: fast.log[4].t + 30 * (i + 1), k: 'tap', v: 0 })));
  const r = await env.call('submit-game', { client_id: randomUUID(), game: 'probe', seed: 6, level: 3, log: many }, tok(A));
  assert.equal(r.status, 200);
  assert.equal(env.db.calls[0][1].p_suspicious, true);
  assert.equal(env.db.calls[0][1].p_result.points, 0);
});


/* ═══ 7. BAZA ADAPTERI ══════════════════════════════════════════════════ */

test('restDb: service kaliti faqat muhitdan; baza xato kodlari HTTP ga', async () => {
  assert.throws(() => restDb({ env: () => undefined }), e => e.code === 'config');
  const sent = [];
  const db = restDb({
    env: n => ({ SUPABASE_URL: 'http://kong:8000/', SUPABASE_SERVICE_ROLE_KEY: 'svc' })[n],
    fetch: async (url, init) => {
      sent.push([url, init.headers.Authorization]);
      return new Response(JSON.stringify({ code: 'ZK429', message: 'kunlik chegara' }), { status: 400 });
    },
  });
  await assert.rejects(db.rpc('test_session_open', {}), e => e.code === 'limit' && e.status === 429);
  assert.deepEqual(sent[0], ['http://kong:8000/rest/v1/rpc/test_session_open', 'Bearer svc']);
  assert.equal(dbError({ code: '42501' }, 401).status, 500, 'huquq xatosi — server sozlamasi, mijoz aybi emas');
});

test('replaySession: o\'zi yaratgan savollarni aynan qayta beradi', () => {
  const row = { seed: 31337, types: IQ.types(), length: 30, log: [] };
  const fresh = IQ.session.create({ mode: 'test', types: row.types, length: 30, seed: 31337 });
  for (let i = 0; i < 5; i++) {
    const it = fresh.current();
    row.log.push({ id: it.id, answer: 0, ms: 1000 });
    fresh.answer(0, 1000);
  }
  const { s, items } = replaySession(IQ, row);
  assert.equal(items.length, 5);
  assert.equal(s.current().id, fresh.current().id);
  row.log[2].id = 'series:3:1';
  assert.throws(() => replaySession(IQ, row), e => e.code === 'engine');
});
