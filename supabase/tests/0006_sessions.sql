-- ═══════════════════════════════════════════════════════════════════════
--  IQUEST — serverda o'tadigan sertifikatli test (test_sessions)
--
--  Hujumlar: mijoz o'z sessiyasining URUG'ini o'qishga (u bilan hamma
--  savol va to'g'ri javob tiklanadi), sessiyani o'zi yaratishga yoki
--  jurnaliga yozishga, boshqaning sessiyasiga javob yuborishga, bir
--  savolga ikki marta javob berishga, juda tez (skript) javob berishga,
--  yopilgan yoki muddati o'tgan sessiyaga javob yuborishga urinadi.
--
--  Vaqt: bitta tranzaksiyada now() o'zgarmaydi, shuning uchun "vaqt
--  o'tdi" — shown_at ni superuser orqaga surib taqlid qilinadi.
--
--  Bitta tranzaksiya, oxirida ROLLBACK.
-- ═══════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on
\set QUIET on

do $$ begin
  if coalesce(obj_description('auth'::regnamespace, 'pg_namespace'), '') <> 'zukko-local-stub' then
    raise exception 'TO''XTATILDI: bu test faqat lokal taqlid bazasida ishlaydi (supabase/tests/_stub.sql)';
  end if;
end $$;

begin;

\set su    'reset role; set request.jwt.claim.sub = ''''; set request.jwt.claims = '''';'
\set svc   'reset role; set request.jwt.claim.sub = ''''; set request.jwt.claims = ''''; set role service_role;'
\set anon  'reset role; set request.jwt.claim.sub = ''''; set request.jwt.claims = ''''; set role anon;'
\set as_u1 'reset role; set request.jwt.claims = ''''; set request.jwt.claim.sub = ''abababab-0000-0000-0000-000000000001''; set role authenticated;'

:su

create function pg_temp.try(q text) returns text language plpgsql as $$
begin
  execute q;
  return 'ok';
exception when others then
  return sqlstate;
end $$;

create function pg_temp.visible(q text) returns bigint language plpgsql as $$
declare n bigint;
begin
  begin
    execute 'select count(*) from (' || q || ') x' into n;
  exception when insufficient_privilege then n := 0;
  end;
  return n;
end $$;

create function pg_temp.result(patch jsonb default '{}') returns jsonb language sql as $$
  select jsonb_build_object(
    'n', 30, 'correct', 21, 'iq', 115, 'lo', 107, 'hi', 123, 'theta', 1.0, 'se', 0.45,
    'reliable', true, 'durationMs', 1200000,
    'byType', '{"matrix":{"n":15,"correct":11},"series":{"n":15,"correct":10}}'::jsonb) || patch;
$$;

-- "Vaqt o'tdi": joriy savol ms millisekund oldin berilgan.
create function pg_temp.wait(sid uuid, ms int) returns void language sql as $$
  update public.test_sessions set shown_at = now() - make_interval(secs => ms / 1000.0) where id = sid;
$$;

create temp table _s (name text primary key, id uuid);
grant select, insert on _s to service_role, authenticated, anon;

insert into auth.users (id, email, raw_user_meta_data) values
  ('abababab-0000-0000-0000-000000000001', 'u1@s.uz', '{"name":"Sardor"}'),
  ('abababab-0000-0000-0000-000000000002', 'u2@s.uz', '{"name":"Malika"}');


-- ═══ 1. MIJOZ SESSIYANI (URUG'NI) O'QIY HAM, YOZA HAM OLMAYDI ══════════
:svc
insert into _s select 'u1', (public.test_session_open('abababab-0000-0000-0000-000000000001', '1',
                             array['matrix','series'], 30, true) ->> 'id')::uuid;
:as_u1
do $$
declare q text; st text;
begin
  if pg_temp.visible('select seed from public.test_sessions') <> 0
     or pg_temp.visible('select * from public.test_sessions where user_id = auth.uid()') <> 0 then
    raise exception 'FAIL: mijoz o''z sessiyasining urug''ini o''qidi — hamma javob tiklanadi';
  end if;
  foreach q in array array[
    $a$update public.test_sessions set log = '[]', deadline = now() + interval '9 hours'$a$,
    $a$insert into public.test_sessions (user_id, engine, seed, types, length, deadline) values (auth.uid(), '1', 1, '{matrix}', 30, now() + interval '1 hour')$a$,
    $a$select public.test_session_open(auth.uid(), '1', array['matrix'], 30, true)$a$,
    $a$select public.test_session_answer((select id from _s where name = 'u1'), auth.uid(), 0, 'matrix:5:1', 0, 0)$a$,
    $a$select public.test_session_finish((select id from _s where name = 'u1'), auth.uid(), 'done', '{}', true, 0, null)$a$,
    $a$select public.test_session_void((select id from _s where name = 'u1'), auth.uid())$a$
  ] loop
    st := pg_temp.try(q);
    if st <> '42501' then raise exception 'FAIL: mijoz sessiyani boshqardi (%): %', st, q; end if;
  end loop;
end $$;
:anon
do $$ begin
  if pg_temp.visible('select seed from public.test_sessions') <> 0 then
    raise exception 'FAIL: anon sessiya urug''ini o''qidi';
  end if;
  raise notice '1 ✔ mijoz (hatto o''z) sessiyasining urug''ini o''qiy olmaydi va sessiya funksiyalarini chaqira olmaydi';
end $$;


-- ═══ 2. OCHISH: bitta ochiq sessiya, qayta ochish — o'sha ═══════════════
:svc
do $$
declare a jsonb; b jsonb; c jsonb;
begin
  a := public.test_session_open('abababab-0000-0000-0000-000000000001', '1', array['matrix','series'], 30, true);
  if (a ->> 'created')::boolean or (a ->> 'id')::uuid <> (select id from _s where name = 'u1') then
    raise exception 'FAIL: ochiq sessiya bor edi, lekin yangisi ochildi';
  end if;
  if (a ->> 'seed')::bigint not between 0 and 4294967295 or (a ->> 'deadline')::timestamptz <= now() then
    raise exception 'FAIL: sessiya urug''i yoki muddati noto''g''ri: %', a;
  end if;
  -- resume rejimi (p_create = false): ochiq bo'lmasa — null, yangisi ochilmaydi.
  b := public.test_session_open('abababab-0000-0000-0000-000000000002', '1', array['matrix'], 30, false);
  if b is not null or exists (select 1 from public.test_sessions where user_id = 'abababab-0000-0000-0000-000000000002') then
    raise exception 'FAIL: resume yangi sessiya ochdi';
  end if;
  -- Muddat 60 daqiqa.
  if (a ->> 'deadline')::timestamptz > now() + interval '61 minutes' then
    raise exception 'FAIL: sessiya muddati 60 daqiqadan uzun';
  end if;
  raise notice '2 ✔ bitta ochiq sessiya; qayta ochish — o''sha; resume yangisini ochmaydi';
end $$;


-- ═══ 3. JAVOB: vaqtni BAZA o'lchaydi, tez javob rad ════════════════════
:svc
do $$
declare sid uuid := (select id from _s where name = 'u1'); r jsonb; st text;
begin
  -- Hozirgina berilgan savolga darhol javob — skript.
  st := pg_temp.try(format('select public.test_session_answer(%L, %L, 0, %L, 1, 300)',
                           sid, 'abababab-0000-0000-0000-000000000001', 'matrix:5:1'));
  if st <> 'ZK422' then raise exception 'FAIL: 300 ms dan tez javob qabul qilindi (%)', st; end if;
  -- Mijoz min_ms ni pasaytira olmaydi (0 berilsa ham 300).
  st := pg_temp.try(format('select public.test_session_answer(%L, %L, 0, %L, 1, 0)',
                           sid, 'abababab-0000-0000-0000-000000000001', 'matrix:5:1'));
  if st <> 'ZK422' then raise exception 'FAIL: min_ms = 0 bilan tez javob o''tdi (%)', st; end if;

  perform pg_temp.wait(sid, 2500);
  r := public.test_session_answer(sid, 'abababab-0000-0000-0000-000000000001', 0, 'matrix:5:1', 1, 300);
  if (r ->> 'index')::int <> 1 or (r ->> 'ms')::int not between 2400 and 2600 then
    raise exception 'FAIL: javob vaqti noto''g''ri o''lchandi: %', r;
  end if;
  if (select jsonb_array_length(log) from public.test_sessions where id = sid) <> 1
     or (select (log -> 0 ->> 'ms')::int from public.test_sessions where id = sid) not between 2400 and 2600 then
    raise exception 'FAIL: javob jurnalga (server vaqti bilan) yozilmadi';
  end if;
  -- Keyingi savol vaqti qaytadan boshlandi.
  if (select shown_at from public.test_sessions where id = sid) <> now() then
    raise exception 'FAIL: keyingi savol berilgan payt yangilanmadi';
  end if;

  -- Bir savolga ikki marta javob (yoki parallel so'rov).
  perform pg_temp.wait(sid, 2000);
  st := pg_temp.try(format('select public.test_session_answer(%L, %L, 0, %L, 2, 300)',
                           sid, 'abababab-0000-0000-0000-000000000001', 'matrix:5:1'));
  if st <> 'ZK409' then raise exception 'FAIL: bir savolga ikki marta javob yozildi (%)', st; end if;

  -- Boshqaning sessiyasi — "topilmadi".
  st := pg_temp.try(format('select public.test_session_answer(%L, %L, 1, %L, 0, 300)',
                           sid, 'abababab-0000-0000-0000-000000000002', 'series:5:2'));
  if st <> 'ZK404' then raise exception 'FAIL: boshqaning sessiyasiga javob yozildi (%)', st; end if;
  st := pg_temp.try(format('select public.test_session_finish(%L, %L, %L, %L, true, 0, null)',
                           sid, 'abababab-0000-0000-0000-000000000002', 'expired', pg_temp.result()));
  if st <> 'ZK404' then raise exception 'FAIL: boshqaning sessiyasi yakunlandi (%)', st; end if;

  -- Javob chegarasi.
  st := pg_temp.try(format('select public.test_session_answer(%L, %L, 1, %L, 99, 300)',
                           sid, 'abababab-0000-0000-0000-000000000001', 'series:5:2'));
  if st <> 'ZK400' then raise exception 'FAIL: chegaradan tashqari javob qabul qilindi (%)', st; end if;
  raise notice '3 ✔ vaqtni baza o''lchaydi; <300 ms rad; ikki marta javob va boshqaning sessiyasi rad';
end $$;


-- ═══ 4. YAKUN: faqat to'liq sessiya, certified natija va sertifikat ════
:svc
do $$
declare sid uuid := (select id from _s where name = 'u1'); r jsonb; st text;
begin
  st := pg_temp.try(format('select public.test_session_finish(%L, %L, %L, %L, true, 150, null)',
                           sid, 'abababab-0000-0000-0000-000000000001', 'done', pg_temp.result()));
  if st <> 'ZK409' then raise exception 'FAIL: tugamagan sessiya "done" bo''lib yakunlandi (%)', st; end if;
end $$;
:su
update public.test_sessions
   set log = (select jsonb_agg(jsonb_build_object('id', 'matrix:5:' || i, 'answer', 0, 'ms', 5000))
                from generate_series(1, 30) i)
 where id = (select id from _s where name = 'u1');
:svc
do $$
declare sid uuid := (select id from _s where name = 'u1'); r jsonb; st text; t record;
begin
  r := public.test_session_finish(sid, 'abababab-0000-0000-0000-000000000001', 'done', pg_temp.result(), true, 150, null);
  if r ->> 'certificate' is null then raise exception 'FAIL: serverda o''tgan test sertifikat bermadi: %', r; end if;
  select * into t from public.test_results where id = (r ->> 'id')::bigint;
  if not t.certified or t.client_id <> sid or t.mode <> 'test' or t.points <> 150 then
    raise exception 'FAIL: serverda o''tgan test natijasi noto''g''ri yozildi';
  end if;
  if (select state || ':' || coalesce(test_result_id::text, '') from public.test_sessions where id = sid)
     <> 'done:' || (r ->> 'id') then
    raise exception 'FAIL: sessiya yopilmadi';
  end if;
  -- Yopilgan sessiyaga javob va qayta yakun — rad.
  st := pg_temp.try(format('select public.test_session_answer(%L, %L, 30, %L, 0, 300)',
                           sid, 'abababab-0000-0000-0000-000000000001', 'matrix:5:1'));
  if st <> 'ZK410' then raise exception 'FAIL: yopilgan sessiyaga javob qabul qilindi (%)', st; end if;
  st := pg_temp.try(format('select public.test_session_finish(%L, %L, %L, %L, true, 150, null)',
                           sid, 'abababab-0000-0000-0000-000000000001', 'done', pg_temp.result()));
  if st <> 'ZK410' then raise exception 'FAIL: sessiya ikki marta yakunlandi (%)', st; end if;
  raise notice '4 ✔ faqat to''liq sessiya yakunlanadi; natija certified, sertifikat beriladi; yopilgandan keyin hech narsa qabul qilinmaydi';
end $$;


-- ═══ 5. MUDDAT O'TSA: javob rad, natija bor, sertifikat yo'q ═══════════
:svc
insert into _s select 'u2', (public.test_session_open('abababab-0000-0000-0000-000000000002', '1',
                             array['matrix','series'], 30, true) ->> 'id')::uuid;
:su
update public.test_sessions set deadline = now() - interval '1 second', shown_at = now() - interval '5 seconds'
 where id = (select id from _s where name = 'u2');
:svc
do $$
declare sid uuid := (select id from _s where name = 'u2'); r jsonb; st text;
begin
  st := pg_temp.try(format('select public.test_session_answer(%L, %L, 0, %L, 0, 300)',
                           sid, 'abababab-0000-0000-0000-000000000002', 'matrix:5:1'));
  if st <> 'ZK410' then raise exception 'FAIL: muddati o''tgan sessiyaga javob qabul qilindi (%)', st; end if;
  r := public.test_session_finish(sid, 'abababab-0000-0000-0000-000000000002', 'expired',
         pg_temp.result('{"correct":3,"iq":70,"lo":62,"hi":78,"theta":-2,"byType":{"matrix":{"n":15,"correct":2},"series":{"n":15,"correct":1}}}'),
         true, 10, null);
  if r ->> 'certificate' is not null then
    raise exception 'FAIL: muddati o''tgan sessiya sertifikat berdi';
  end if;
  if not (select certified from public.test_results where id = (r ->> 'id')::bigint) then
    raise exception 'FAIL: muddati o''tgan serverdagi test natijasi yozilmadi';
  end if;
  raise notice '5 ✔ muddat o''tsa javob rad; natija yoziladi, sertifikat berilmaydi';
end $$;


-- ═══ 6. KUNIGA 3 TA SESSIYA; VOID ══════════════════════════════════════
:svc
do $$
declare st text; sid uuid;
begin
  -- U2: 1 ta (expired). Yana 2 ta ochib yopamiz → 3; to'rtinchisi — rad.
  for i in 1..2 loop
    sid := (public.test_session_open('abababab-0000-0000-0000-000000000002', '1', array['matrix'], 30, true) ->> 'id')::uuid;
    perform public.test_session_void(sid, 'abababab-0000-0000-0000-000000000002');
  end loop;
  if (select state from public.test_sessions where id = sid) <> 'void' then
    raise exception 'FAIL: test_session_void() sessiyani bekor qilmadi';
  end if;
  st := pg_temp.try($q$select public.test_session_open('abababab-0000-0000-0000-000000000002', '1', array['matrix'], 30, true)$q$);
  if st <> 'ZK429' then raise exception 'FAIL: kunlik sertifikatli test chegarasi (3) ishlamadi (%)', st; end if;
  -- Boshqaning sessiyasini bekor qilib bo'lmaydi.
  sid := (select id from _s where name = 'u1');
  perform public.test_session_void(sid, 'abababab-0000-0000-0000-000000000002');
  if (select state from public.test_sessions where id = sid) <> 'done' then
    raise exception 'FAIL: boshqaning sessiyasi bekor qilindi';
  end if;
  -- Qisqa (≤ 30 dan kam) sertifikatli sessiya ochib bo'lmaydi.
  st := pg_temp.try($q$select public.test_session_open('abababab-0000-0000-0000-000000000001', '1', array['matrix'], 10, true)$q$);
  if st <> '23514' then raise exception 'FAIL: 30 tadan qisqa sertifikatli sessiya ochildi (%)', st; end if;
  raise notice '6 ✔ kuniga 3 ta sertifikatli test; void faqat o''ziniki; 30 tadan qisqa sessiya yo''q';
end $$;

rollback;
\echo '✅ 0006_sessions.sql — serverdagi sertifikatli test tekshiruvi o''tdi'
