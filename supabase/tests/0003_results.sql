-- ═══════════════════════════════════════════════════════════════════════
--  IQUEST — natijalar: faqat server yozadi, faqat egasi o'qiydi
--
--  Hujumlar: mijoz (anon va tizimga kirgan) test/o'yin natijasini,
--  kalibrlash javobini, sertifikatni to'g'ridan-to'g'ri yozishga yoki
--  server funksiyasini o'zi chaqirishga urinadi; boshqaning natijasini
--  o'qishga, o'z natijasini o'zgartirishga, tanlab o'chirishga urinadi.
--  Server (service_role) yo'li esa ishlashi, cheklovlarga (kunlik chegara,
--  bitta urug' — bir marta, kunlik ball) bo'ysunishi kerak.
--
--  Bitta tranzaksiya, oxirida ROLLBACK — bazada iz qolmaydi.
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
\set nosub 'reset role; set request.jwt.claim.sub = ''''; set request.jwt.claims = ''''; set role authenticated;'
\set as_u1 'reset role; set request.jwt.claims = ''''; set request.jwt.claim.sub = ''dddddddd-0000-0000-0000-000000000001''; set role authenticated;'
\set as_u2 'reset role; set request.jwt.claims = ''''; set request.jwt.claim.sub = ''dddddddd-0000-0000-0000-000000000002''; set role authenticated;'
\set as_mod 'reset role; set request.jwt.claims = ''''; set request.jwt.claim.sub = ''dddddddd-0000-0000-0000-00000000000a''; set role authenticated;'
\set as_aud 'reset role; set request.jwt.claims = ''''; set request.jwt.claim.sub = ''dddddddd-0000-0000-0000-00000000000d''; set role authenticated;'
\set as_own 'reset role; set request.jwt.claims = ''''; set request.jwt.claim.sub = ''dddddddd-0000-0000-0000-00000000000e''; set role authenticated;'

:su

create function pg_temp.visible(q text) returns bigint language plpgsql as $$
declare n bigint;
begin
  begin
    execute 'select count(*) from (' || q || ') x' into n;
  exception when insufficient_privilege then n := 0;
  end;
  return n;
end $$;

-- Joriy rol bilan SQL bajaradi; SQLSTATE yoki 'ok' qaytaradi.
create function pg_temp.try(q text) returns text language plpgsql as $$
begin
  execute q;
  return 'ok';
exception when others then
  return sqlstate;
end $$;

-- Server hisoblagan Result (IQ.session.verify shakli).
create function pg_temp.result(patch jsonb default '{}') returns jsonb language sql as $$
  select jsonb_build_object(
    'n', 30, 'correct', 18, 'iq', 108, 'lo', 100, 'hi', 116, 'theta', 0.53, 'se', 0.3,
    'reliable', true, 'durationMs', 600000,
    'byType', '{"matrix":{"n":10,"correct":6},"series":{"n":10,"correct":6},"verbal":{"n":10,"correct":6}}'::jsonb
  ) || patch;
$$;

create function pg_temp.rec(u text, seed bigint, patch jsonb default '{}', pts int default 50,
                            susp boolean default false, resp jsonb default null,
                            client uuid default gen_random_uuid()) returns jsonb language sql as $$
  select public.record_test_result(u::uuid, client, '1', seed, 'test', pg_temp.result(patch), susp, pts, resp);
$$;

create function pg_temp.responses(n int, patch jsonb default '{}') returns jsonb language sql as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'item_id', 'matrix:' || (1 + i % 10) || ':' || (1000 + i),
           'type', 'matrix', 'level', 1 + i % 10, 'b', ((1 + i % 10) - 5.5) * 0.5, 'k', 6,
           'correct', i % 3 = 0, 'ms', 5000 + i) || patch), '[]'::jsonb)
    from generate_series(0, n - 1) i;
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('dddddddd-0000-0000-0000-000000000001', 'u1@r.uz', '{"name":"Birinchi"}'),
  ('dddddddd-0000-0000-0000-000000000002', 'u2@r.uz', '{"name":"Ikkinchi"}'),
  ('dddddddd-0000-0000-0000-00000000000a', 'm@r.uz',  '{"name":"Moderator"}'),
  ('dddddddd-0000-0000-0000-00000000000d', 'd@r.uz',  '{"name":"Auditor"}'),
  ('dddddddd-0000-0000-0000-00000000000e', 'e@r.uz',  '{"name":"Egasi"}');
update public.profiles set role = 'moderator' where id = 'dddddddd-0000-0000-0000-00000000000a';
update public.profiles set role = 'auditor'   where id = 'dddddddd-0000-0000-0000-00000000000d';
update public.profiles set role = 'owner'     where id = 'dddddddd-0000-0000-0000-00000000000e';


-- ═══ 1. MIJOZ NATIJA, BALL, SERTIFIKATNI O'ZI YOZA OLMAYDI ═════════════
create temp table _attacks (name text, q text);
insert into _attacks values
  ('test_results INSERT', $q$insert into public.test_results (user_id, client_id, engine, seed, mode, iq, lo, hi, theta, se, n, correct, reliable, by_type, duration_ms, certified)
     values ('dddddddd-0000-0000-0000-000000000001', gen_random_uuid(), '1', 1, 'test', 145, 140, 145, 3, 0.2, 30, 30, true, '{}', 1000, true)$q$),
  ('game_results INSERT', $q$insert into public.game_results (user_id, client_id, engine, game, level, seed, score, points, correct, total, duration_ms)
     values ('dddddddd-0000-0000-0000-000000000001', gen_random_uuid(), '1', 'schulte', 5, 1, 999, 999, 1, 1, 1000)$q$),
  ('item_responses INSERT', $q$insert into public.item_responses (session, seq, item_id, type, level, b, correct, ms)
     values (gen_random_uuid(), 0, 'matrix:5:1', 'matrix', 5, 0, true, 1000)$q$),
  ('certificates INSERT', $q$insert into public.certificates (code, user_id, test_result_id, name, iq, lo, hi, engine)
     values ('IQ-2222-2222', 'dddddddd-0000-0000-0000-000000000001', 1, 'Soxta', 145, 140, 145, '1')$q$),
  ('test_sessions INSERT', $q$insert into public.test_sessions (user_id, engine, seed, types, length, deadline)
     values ('dddddddd-0000-0000-0000-000000000001', '1', 1, '{matrix}', 30, now() + interval '1 hour')$q$),
  ('league_members INSERT', $q$insert into public.league_members (week, user_id, tier, grp, points)
     values (public.league_week(), 'dddddddd-0000-0000-0000-000000000001', 'olmos', 1, 99999)$q$),
  ('record_test_result()', $q$select public.record_test_result('dddddddd-0000-0000-0000-000000000001', gen_random_uuid(), '1', 7, 'test', '{"iq":145}', false, 1000, null)$q$),
  ('record_game_result()', $q$select public.record_game_result('dddddddd-0000-0000-0000-000000000001', gen_random_uuid(), '1', 'schulte', 5, 7, '{"points":1000}', false)$q$),
  ('record_result()', $q$select public.record_result('dddddddd-0000-0000-0000-000000000001', gen_random_uuid(), '1', 7, 'test', '{"iq":145}', false, 1000, null, true, true)$q$),
  ('league_add_points()', $q$select public.league_add_points('dddddddd-0000-0000-0000-000000000001', 99999)$q$),
  ('certificate_issue()', $q$select public.certificate_issue(1, 'dddddddd-0000-0000-0000-000000000001')$q$);
grant select on _attacks to anon, authenticated;

:anon
do $$
declare a record; st text;
begin
  for a in select * from _attacks loop
    st := pg_temp.try(a.q);
    if st <> '42501' then
      raise exception 'FAIL: mijoz yozdi — anon %: %', a.name, st;
    end if;
  end loop;
end $$;
:as_u1
do $$
declare a record; st text;
begin
  for a in select * from _attacks loop
    st := pg_temp.try(a.q);
    if st <> '42501' then
      raise exception 'FAIL: mijoz yozdi — foydalanuvchi %: %', a.name, st;
    end if;
  end loop;
  raise notice '1 ✔ mijoz natija/o''yin/javob/sertifikat/sessiya/liga yoza olmaydi, server funksiyalarini chaqira olmaydi (% hujum × 2)',
    (select count(*) from _attacks);
end $$;


-- ═══ 2. SERVER YO'LI: yozadi, takrorni va qayta urug'ni ushlaydi ═══════
:svc
do $$
declare r jsonb; r2 jsonb; st text;
begin
  r := pg_temp.rec('dddddddd-0000-0000-0000-000000000001', 1001, client => 'dddddddd-1111-0000-0000-000000000001');
  if (r ->> 'duplicate')::boolean or (r ->> 'points')::int <> 50 then
    raise exception 'FAIL: server natijani yoza olmadi: %', r;
  end if;
  -- Tarmoq uzilgan, mijoz qayta yubordi — o'sha javob, ikkinchi nusxa yo'q.
  r2 := pg_temp.rec('dddddddd-0000-0000-0000-000000000001', 1001, client => 'dddddddd-1111-0000-0000-000000000001');
  if not (r2 ->> 'duplicate')::boolean or r2 ->> 'id' <> r ->> 'id' then
    raise exception 'FAIL: qayta yuborish ikkinchi nusxa yaratdi: %', r2;
  end if;
  -- Bitta urug' — bir marta (boshqa client_id bilan ham).
  st := pg_temp.try($q$select pg_temp.rec('dddddddd-0000-0000-0000-000000000001', 1001)$q$);
  if st <> '23505' then raise exception 'FAIL: bitta urug'' ikki marta ball berdi (%)', st; end if;
  perform pg_temp.rec('dddddddd-0000-0000-0000-000000000002', 2001, '{"iq":95,"lo":88,"hi":102}');
  -- Mijoz jurnali yo'li hech qachon sertifikatli emas.
  if exists (select 1 from public.test_results where certified) then
    raise exception 'FAIL: qurilmadagi test (submit-test) certified bo''lib yozildi';
  end if;
  raise notice '2 ✔ server yozadi; qayta yuborish nusxa yaratmaydi; urug'' bir marta; mijoz jurnali sertifikatsiz';
end $$;


-- ═══ 3. O'QISH: faqat o'zi ═════════════════════════════════════════════
:as_u1
do $$ begin
  if pg_temp.visible('select * from public.test_results') <> 1
     or pg_temp.visible('select * from public.test_results where user_id = ''dddddddd-0000-0000-0000-000000000002''') <> 0 then
    raise exception 'FAIL: foydalanuvchi boshqaning natijasini ko''rdi';
  end if;
end $$;
:as_aud
do $$ begin
  if pg_temp.visible('select * from public.test_results') <> 0 then
    raise exception 'FAIL: auditor boshqaning natijasini ko''rdi';
  end if;
end $$;
:as_own
do $$ begin
  if pg_temp.visible('select * from public.test_results') <> 0 then
    raise exception 'FAIL: egasi API orqali boshqaning natijasini ko''rdi';
  end if;
end $$;
:as_mod
do $$ begin
  if pg_temp.visible('select * from public.test_results') <> 0 then
    raise exception 'FAIL: moderator boshqaning natijasini ko''rdi';
  end if;
  raise notice '3 ✔ natijani faqat egasi ko''radi (xodim ham ko''rmaydi)';
end $$;


-- ═══ 4. TARIX BUZILMAYDI ═══════════════════════════════════════════════
:as_u1
do $$ begin
  perform pg_temp.try('update public.test_results set iq = 145, hi = 145, certified = true');
  perform pg_temp.try('delete from public.test_results');
end $$;
:su
do $$ begin
  if (select iq from public.test_results where user_id = 'dddddddd-0000-0000-0000-000000000001') <> 108
     or exists (select 1 from public.test_results where certified) then
    raise exception 'FAIL: natija o''zgartirildi — tarix buzildi';
  end if;
  if not exists (select 1 from public.test_results where user_id = 'dddddddd-0000-0000-0000-000000000001') then
    raise exception 'FAIL: natija birma-bir o''chirildi — faqat delete_my_data() orqali';
  end if;
  raise notice '4 ✔ natijani o''zgartirib ham, tanlab o''chirib ham bo''lmaydi';
end $$;


-- ═══ 5. QIYMAT CHEGARALARI — server xatosi ham bazaga o'tmaydi ═════════
:svc
do $$
declare c record; st text; s bigint := 5000;
begin
  for c in select * from (values
    ('iq chegarasi 146',        '{"iq":146,"hi":146}'::jsonb),
    ('lo > iq',                 '{"lo":110}'),
    ('n = 201',                 '{"n":201}'),
    ('correct > n',             '{"correct":31}'),
    ('theta = 9',               '{"theta":9}'),
    ('se = 0',                  '{"se":0}'),
    ('by_type kaliti',          '{"byType":{"Matrix!":{"n":1,"correct":0}}}'),
    ('by_type yig''indi > n',   '{"byType":{"matrix":{"n":20,"correct":1},"series":{"n":20,"correct":1}}}'),
    ('by_type hajmi',           ('{"byType":{"matrix":{"n":1.' || repeat('0', 2000) || ',"correct":0}}}')::jsonb)
  ) t(name, patch)
  loop
    s := s + 1;
    st := pg_temp.try(format('select pg_temp.rec(%L, %s, %L)', 'dddddddd-0000-0000-0000-000000000002', s, c.patch));
    if st <> '23514' then raise exception 'FAIL: CHECK — "%" qabul qilindi (%)', c.name, st; end if;
  end loop;
  -- Ball chegarasi (1000) — server xatosi bo'lsa ham.
  st := pg_temp.try($q$select pg_temp.rec('dddddddd-0000-0000-0000-000000000002', 5999, pts => 5000)$q$);
  if st <> '23514' then raise exception 'FAIL: CHECK — natijaga 1000 dan ortiq ball yozildi (%)', st; end if;
  raise notice '5 ✔ chegaradan tashqari qiymat (10 holat) — server xatosi bo''lsa ham yozilmaydi';
end $$;


-- ═══ 6. BALL: shubhali — 0; kunlik chegara 2000 ════════════════════════
:svc
do $$
declare r jsonb;
begin
  r := pg_temp.rec('dddddddd-0000-0000-0000-000000000002', 6001, pts => 100, susp => true);
  if (r ->> 'points')::int <> 0 then raise exception 'FAIL: shubhali natija ball oldi'; end if;
  perform pg_temp.rec('dddddddd-0000-0000-0000-000000000002', 6002, pts => 1000);
  perform pg_temp.rec('dddddddd-0000-0000-0000-000000000002', 6003, pts => 1000);
  r := pg_temp.rec('dddddddd-0000-0000-0000-000000000002', 6004, pts => 500);
  if (r ->> 'points')::int <> 0 then
    raise exception 'FAIL: kunlik ball chegarasi ishlamadi (% ball berildi)', r ->> 'points';
  end if;
  raise notice '6 ✔ shubhali natija ball olmaydi; kuniga 2000 balldan ortiq yig''ilmaydi';
end $$;


-- ═══ 7. HAJM: kunlik 100 ta natija ═════════════════════════════════════
:svc
do $$
declare st text; have int;
begin
  select count(*) into have from public.test_results where user_id = 'dddddddd-0000-0000-0000-000000000001';
  for i in 1..(100 - have) loop
    perform pg_temp.rec('dddddddd-0000-0000-0000-000000000001', 7000 + i, pts => 0);
  end loop;
  st := pg_temp.try($q$select pg_temp.rec('dddddddd-0000-0000-0000-000000000001', 7999, pts => 0)$q$);
  if st <> 'ZK429' then
    raise exception 'FAIL: kunlik chegara (natijalar) ishlamadi — bitta hisob cheksiz yoza oladi (%)', st;
  end if;
  raise notice '7 ✔ 24 soatda 100 tadan ortiq natija yozilmaydi';
end $$;


-- ═══ 8. KALIBRLASH JAVOBLARI — anonim, faqat server ════════════════════
:svc
do $$
declare cols text; n0 bigint;
begin
  select count(*) into n0 from public.item_responses;
  perform public.record_test_result('dddddddd-0000-0000-0000-000000000002', gen_random_uuid(), '1', 8001, 'practice',
            pg_temp.result(), false, 10, pg_temp.responses(30));
  if (select count(*) from public.item_responses) <> n0 + 30 then
    raise exception 'FAIL: rozilik bilan yuborilgan kalibrlash javoblari yozilmadi';
  end if;
  -- Buzuq to'plam: natija yoziladi, javoblar — yo'q (yarim sessiya yo'q).
  perform public.record_test_result('dddddddd-0000-0000-0000-000000000002', gen_random_uuid(), '1', 8002, 'practice',
            pg_temp.result(), false, 10, pg_temp.responses(5, '{"level": 11}'));
  if (select count(*) from public.item_responses) <> n0 + 30 then
    raise exception 'FAIL: buzuq kalibrlash to''plamidan qatorlar yozilib qoldi';
  end if;
  if not exists (select 1 from public.test_results where seed = 8002) then
    raise exception 'FAIL: buzuq kalibrlash javobi natijaning o''zini ham yo''qotdi';
  end if;
  select string_agg(column_name, ',' order by ordinal_position) into cols
    from information_schema.columns where table_schema = 'public' and table_name = 'item_responses';
  if cols <> 'session,seq,item_id,type,level,b,k,correct,ms,created_on' then
    raise exception 'FAIL: item_responses ustunlari o''zgardi (%) — anonimlikni qayta ko''rib chiqing', cols;
  end if;
end $$;
:as_u1
do $$ begin
  if pg_temp.visible('select * from public.item_responses') <> 0 then
    raise exception 'FAIL: oddiy foydalanuvchi item_responses ni o''qidi';
  end if;
end $$;
:as_mod
do $$ begin
  if pg_temp.visible('select * from public.item_responses') <> 0 then
    raise exception 'FAIL: moderator item_responses ni o''qidi (faqat auditor/owner)';
  end if;
end $$;
:as_aud
do $$ begin
  if pg_temp.visible('select * from public.item_responses') < 30 then
    raise exception 'FAIL: auditor item_responses ni o''qiy olmadi';
  end if;
  raise notice '8 ✔ kalibrlash: faqat server yozadi, buzuq to''plam rad, user_id yo''q, faqat auditor/egasi o''qiydi';
end $$;


-- ═══ 9. O'YIN NATIJALARI ═══════════════════════════════════════════════
:svc
do $$
declare r jsonb; st text;
begin
  r := public.record_game_result('dddddddd-0000-0000-0000-000000000001', 'dddddddd-2222-0000-0000-000000000001',
         '1', 'schulte', 5, 42, '{"score":120,"points":80,"correct":25,"total":25,"durationMs":61000}', false);
  if (r ->> 'duplicate')::boolean then raise exception 'FAIL: o''yin natijasi yozilmadi'; end if;
  r := public.record_game_result('dddddddd-0000-0000-0000-000000000001', 'dddddddd-2222-0000-0000-000000000001',
         '1', 'schulte', 5, 42, '{"score":120,"points":80,"correct":25,"total":25,"durationMs":61000}', false);
  if not (r ->> 'duplicate')::boolean then raise exception 'FAIL: o''yin qayta yuborilganda nusxa yaratildi'; end if;
  st := pg_temp.try($q$select public.record_game_result('dddddddd-0000-0000-0000-000000000001', gen_random_uuid(),
         '1', 'schulte', 5, 42, '{"score":120,"points":80,"correct":25,"total":25,"durationMs":61000}', false)$q$);
  if st <> '23505' then raise exception 'FAIL: o''yinning bitta urug''i ikki marta ball berdi (%)', st; end if;
  r := public.record_game_result('dddddddd-0000-0000-0000-000000000001', gen_random_uuid(),
         '1', 'schulte', 5, 43, '{"score":999,"points":150,"correct":25,"total":25,"durationMs":1000}', true);
  if (r ->> 'points')::int <> 0 then raise exception 'FAIL: shubhali o''yin ball oldi'; end if;
  st := pg_temp.try($q$select public.record_game_result('dddddddd-0000-0000-0000-000000000001', gen_random_uuid(),
         '1', 'schulte', 5, 44, '{"score":1,"points":1,"correct":5,"total":2,"durationMs":1000}', false)$q$);
  if st <> '23514' then raise exception 'FAIL: CHECK — correct > total o''yin natijasi yozildi (%)', st; end if;
end $$;
:as_u2
do $$ begin
  if pg_temp.visible('select * from public.game_results') <> 0 then
    raise exception 'FAIL: foydalanuvchi boshqaning o''yin natijasini ko''rdi';
  end if;
  raise notice '9 ✔ o''yin: server yozadi, takror/qayta urug'' yo''q, shubhali — 0 ball, boshqaga ko''rinmaydi';
end $$;


-- ═══ 10. "MA'LUMOTIMNI O'CHIRING" ══════════════════════════════════════
:anon
do $$ begin
  if pg_temp.try('select public.delete_my_data()') <> '42501' then
    raise exception 'FAIL: anon delete_my_data() ni chaqira oldi';
  end if;
end $$;
:nosub
do $$
declare st text;
begin
  st := pg_temp.try('select public.delete_my_data()');
  if st <> '42501' then raise exception 'FAIL: delete_my_data() auth.uid() null bilan to''xtamadi (%)', st; end if;
end $$;
:as_u1
do $$
declare r jsonb;
begin
  r := public.delete_my_data();
  if (r ->> 'tests')::int < 100 or (r ->> 'games')::int <> 2 then
    raise exception 'FAIL: delete_my_data() % — hammasi o''chmadi', r;
  end if;
end $$;
:su
do $$
declare a record;
begin
  if exists (select 1 from public.test_results where user_id = 'dddddddd-0000-0000-0000-000000000001')
     or exists (select 1 from public.game_results where user_id = 'dddddddd-0000-0000-0000-000000000001')
     or exists (select 1 from public.league_members where user_id = 'dddddddd-0000-0000-0000-000000000001') then
    raise exception 'FAIL: delete_my_data() foydalanuvchi ma''lumotini qoldirdi';
  end if;
  if not exists (select 1 from public.test_results where user_id = 'dddddddd-0000-0000-0000-000000000002') then
    raise exception 'FAIL: boshqaning natijasi o''chdi — delete_my_data() faqat o''zinikini';
  end if;
  select * into a from public.audit_log where action = 'test_results o''chirildi' order by id desc limit 1;
  if a.id is null or a.actor_id <> 'dddddddd-0000-0000-0000-000000000001'
     or not (a.after -> 'users') @> '["dddddddd-0000-0000-0000-000000000001"]'::jsonb then
    raise exception 'FAIL: o''chirish jurnalga tushmadi (yoki kim yozilmadi)';
  end if;
  if a.after::text like '%"iq"%' then
    raise exception 'FAIL: jurnalga natija qiymatlari (IQ) ko''chdi';
  end if;
end $$;
-- Hisob o'chirilsa — natijalar ham, jurnal bilan.
delete from auth.users where id = 'dddddddd-0000-0000-0000-000000000002';
do $$ begin
  if exists (select 1 from public.test_results where user_id = 'dddddddd-0000-0000-0000-000000000002') then
    raise exception 'FAIL: hisob o''chirildi, natijalari qoldi';
  end if;
  if not exists (select 1 from public.audit_log where action = 'test_results o''chirildi' and actor_id is null) then
    raise exception 'FAIL: hisob bilan birga o''chgan natijalar jurnalga tushmadi';
  end if;
  raise notice '10 ✔ delete_my_data(): faqat o''zinikini, hammasini, jurnal bilan (qiymatsiz)';
end $$;

rollback;
\echo '✅ 0003_results.sql — natijalar tekshiruvi o''tdi'
