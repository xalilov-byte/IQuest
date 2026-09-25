#!/usr/bin/env node
/* ─────────────────────────────────────────────────────────────────────────
   Edge Function mantig'i + HAQIQIY PostgreSQL (integratsiya)

   functions.test.mjs bazani xotirada taqlid qiladi — tez, lekin taqlid
   0006_record.sql dan farq qilib qolishi mumkin (argument nomi, tur,
   jsonb shakli, xato kodi). Bu skript handler.mjs ni o'zgarishsiz
   ishlatadi, faqat baza adapteri PostgREST o'rniga psql orqali AYNAN
   o'sha funksiyalarni service_role sifatida chaqiradi.

   Ishga tushirish: supabase/tests/run.mjs (toza, migratsiya qilingan
   bazada):  node supabase/tests/functions.integration.mjs <baza_nomi>

   "Vaqt o'tdi" — test_sessions.shown_at ni superuser orqaga suradi
   (aks holda 30 savol uchun 30 × 300 ms kutish kerak bo'lardi).
   ───────────────────────────────────────────────────────────────────── */

import { spawnSync } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { IQ } from '../functions/_shared/engine/index.mjs';
import { handle } from '../functions/_shared/handler.mjs';
import { dbError } from '../functions/_shared/db.mjs';

const DB = process.argv[2];
if (!DB) { console.error('ishlatilishi: functions.integration.mjs <baza_nomi>'); process.exit(2); }
const PSQL = process.env.PG_BIN ? process.env.PG_BIN + '/psql' : 'psql';
const SECRET = 'integratsiya-jwt-siri-kamida-32-belgi-uzunlikda';

function sql(text, role) {
  const input = '\\set VERBOSITY verbose\n' + (role ? `set role ${role};\n` : '') + text + '\n';
  const r = spawnSync(PSQL, ['-X', '-q', '-tA', '-v', 'ON_ERROR_STOP=1', '-d', DB], { input, encoding: 'utf8' });
  if (r.status !== 0) {
    const m = /ERROR:\s+([0-9A-Z]{5}):\s+([^\n]*)/.exec(r.stderr || '');
    if (m) throw dbError({ code: m[1], message: m[2] }, 400);
    throw new Error('psql: ' + r.stderr);
  }
  return r.stdout.trim();
}
const lit = s => "'" + String(s).replace(/'/g, "''") + "'";

// Nomli argumentlar bilan chaqirish — PostgREST ham aynan shunday qiladi.
sql(`
  create schema if not exists zk_test;
  create or replace function zk_test.call(fn text, args jsonb) returns jsonb language plpgsql as $$
  declare p record; parts text[] := '{}'; k text; t text; v jsonb; val text; r jsonb;
  begin
    select * into p from pg_proc where proname = fn and pronamespace = 'public'::regnamespace;
    for i in 1..coalesce(array_length(p.proargnames, 1), 0) loop
      k := p.proargnames[i];
      t := format_type(p.proargtypes[i - 1], null);
      if args ? k then
        v := args -> k;
        val := case when jsonb_typeof(v) = 'null' then null
                    when t in ('jsonb', 'json') then v::text
                    when t like '%[]' then (select coalesce(array_agg(x), '{}')::text from jsonb_array_elements_text(v) x)
                    when jsonb_typeof(v) = 'string' then v #>> '{}'
                    else v::text end;
        parts := parts || format('%I => %L::%s', k, val, t);
      end if;
    end loop;
    execute format('select to_jsonb(public.%I(%s))', fn, array_to_string(parts, ', ')) into r;
    return r;
  end $$;
  grant usage on schema zk_test to service_role;
  grant execute on function zk_test.call(text, jsonb) to service_role;`);

let shift = true;   // test_session_answer dan oldin "vaqt o'tdi"
const db = {
  async rpc(name, args) {
    if (name === 'test_session_answer' && shift) {
      sql(`update public.test_sessions set shown_at = shown_at - interval '2 seconds' where id = ${lit(args.p_session)};`);
    }
    const out = sql(`select zk_test.call(${lit(name)}, ${lit(JSON.stringify(args))}::jsonb);`, 'service_role');
    return out ? JSON.parse(out) : null;
  },
};

const b64u = x => Buffer.from(JSON.stringify(x)).toString('base64url');
function tok(sub) {
  const h = b64u({ alg: 'HS256', typ: 'JWT' });
  const p = b64u({ sub, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 600 });
  return h + '.' + p + '.' + createHmac('sha256', SECRET).update(h + '.' + p).digest('base64url');
}
const deps = { IQ, db, env: n => ({ JWT_SECRET: SECRET })[n], fetch: null, now: () => Date.now() };
async function call(route, body, sub) {
  const res = await handle(route, new Request('https://api.test/functions/v1/' + route, {
    method: 'POST', headers: { authorization: 'Bearer ' + tok(sub), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }), deps);
  return { status: res.status, json: await res.json() };
}
function bad(obj, keys, path, out) {
  out = out || [];
  if (Array.isArray(obj)) obj.forEach((v, i) => bad(v, keys, path + '[' + i + ']', out));
  else if (obj && typeof obj === 'object') {
    for (const k of Object.keys(obj)) { if (keys.includes(k)) out.push(path + '.' + k); bad(obj[k], keys, path + '.' + k, out); }
  }
  return out;
}
const ok = m => console.log('  ✔ ' + m);

const A = randomUUID(), B = randomUUID();
sql(`insert into auth.users (id, raw_user_meta_data) values
       (${lit(A)}, '{"name":"Integratsiya A"}'), (${lit(B)}, '{"name":"Integratsiya B"}');`);

try {
  // ── Sertifikatli test ──
  const start = await call('test-start', {}, A);
  assert.equal(start.status, 200, JSON.stringify(start.json));
  const row = JSON.parse(sql(`select to_jsonb(s) from public.test_sessions s where id = ${lit(start.json.session)};`));
  // Qisqa urug' tasodifan SVG raqamlariga to'g'ri kelishi mumkin — faqat uzuni tekshiriladi.
  if (String(row.seed).length >= 6) assert.ok(!JSON.stringify(start.json).includes(String(row.seed)), 'urug\' javobda bor');
  assert.deepEqual(bad(start.json, ['correct', 'explain', 'id', 'b', 'seed']), []);
  ok('test-start: sessiya bazada, urug\' javobda yo\'q');

  shift = false;
  const fast = await call('test-answer', { session: start.json.session, answer: 0 }, A);
  assert.equal(fast.status, 422, JSON.stringify(fast.json));
  shift = true;
  const hijack = await call('test-answer', { session: start.json.session, answer: 0 }, B);
  assert.equal(hijack.status, 410);
  ok('tez javob (baza o\'lchagan vaqt) — 422; boshqaning sessiyasi — 410');

  const shadow = IQ.session.create({ mode: 'test', types: row.types, length: row.length, seed: Number(row.seed) });
  let r = start;
  const seen = [start.json];
  for (let i = 0; !r.json.finished && i < 40; i++) {
    const it = shadow.current();
    const ans = i % 5 < 3 ? it.correct : (it.correct + 1) % it.options.length;
    shadow.answer(ans, 2000);
    r = await call('test-answer', { session: start.json.session, answer: ans }, A);
    assert.equal(r.status, 200, JSON.stringify(r.json));
    if (!r.json.finished) seen.push(r.json);
  }
  assert.equal(r.json.finished, true);
  assert.deepEqual(bad(seen, ['correct', 'explain', 'id', 'b', 'seed']), []);
  assert.match(r.json.certificate, /^IQ-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
  const tr = JSON.parse(sql(`select to_jsonb(t) from public.test_results t where user_id = ${lit(A)} and certified;`));
  assert.equal(tr.iq, r.json.result.iq);
  assert.equal(tr.n, 30);
  const cert = JSON.parse(sql(`select to_jsonb(c) from public.get_certificate(${lit(r.json.certificate)}) c;`, 'anon'));
  assert.equal(cert.name, 'Integratsiya A');
  assert.equal(cert.iq, r.json.result.iq);
  ok(`30 savol: javobsiz savollar, server vaqti, natija certified, sertifikat ${r.json.certificate} tekshirish sahifasida`);

  const after = await call('test-answer', { session: start.json.session, answer: 0 }, A);
  assert.equal(after.status, 410);
  ok('yopilgan sessiyaga javob — 410');

  // ── Qurilmadagi test ──
  const s = IQ.session.create({ mode: 'test', seed: 20260925 });
  for (let n = 0; !s.done; n++) { const it = s.current(); s.answer(n % 2 ? it.correct : -1, 3000); }
  const cid = randomUUID();
  const sub = await call('submit-test', { client_id: cid, journal: s.submission(), iq: 145 }, B);
  assert.equal(sub.status, 200, JSON.stringify(sub.json));
  const again = await call('submit-test', { client_id: cid, journal: s.submission() }, B);
  assert.equal(again.json.duplicate, true);
  const ctr = JSON.parse(sql(`select to_jsonb(t) from public.test_results t where user_id = ${lit(B)};`));
  assert.equal(ctr.certified, false);
  assert.equal(ctr.iq, s.result().iq);
  assert.equal(sql(`select count(*) from public.certificates where user_id = ${lit(B)};`), '0');
  ok('submit-test: server qayta hisobladi, certified emas, sertifikat yo\'q, qayta yuborish — nusxa emas');

  // ── Liga ──
  const board = sql(`set request.jwt.claim.sub = ${lit(A)}; set role authenticated;
                     select coalesce(json_agg(b), '[]') from public.league_board() b;`);
  const me = JSON.parse(board).find(x => x.is_me);
  assert.ok(me && me.points === r.json.points && me.points > 0, 'liga: ' + board);
  ok(`liga: serverdagi test ${me.points} ball berdi, league_board() da ko'rinadi`);
} finally {
  sql(`delete from auth.users where id in (${lit(A)}, ${lit(B)}); drop schema zk_test cascade;`);
}
console.log('✅ integratsiya (handler + haqiqiy baza) o\'tdi');
