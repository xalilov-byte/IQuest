-- ═══════════════════════════════════════════════════════════════════════
--  ZUKKO — hisoblar, rollar, audit jurnali va umumiy huquqlar tekshiruvi
--
--  "RLS yozdim" degan gap yetarli emas — u HAQIQATAN to'sayotgani
--  tekshirilishi kerak. Shuning uchun har bo'limda hujumchi aynan
--  klient qila oladigan so'rovni yuboradi (anon yoki boshqa foydalanuvchi
--  sifatida) va natija tekshiriladi.
--
--  Ishga tushirish: supabase/tests/run.sh (toza baza → _stub.sql →
--  apply.sh → shu fayl). Fayl bitta tranzaksiyada ishlaydi va oxirida
--  ROLLBACK qiladi — bazada iz qoldirmaydi, istalgan tartibda ishlaydi.
--  Xato bo'lsa "FAIL: …" bilan yiqiladi.
-- ═══════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on
\set QUIET on

-- Bu test auth.users ga sinov foydalanuvchilarini yozadi. HAQIQIY bazada
-- (Supabase) tasodifan ishga tushib qolmasligi kerak.
do $$ begin
  if coalesce(obj_description('auth'::regnamespace, 'pg_namespace'), '') <> 'zukko-local-stub' then
    raise exception 'TO''XTATILDI: bu test faqat lokal taqlid bazasida ishlaydi (supabase/tests/_stub.sql)';
  end if;
end $$;

begin;

-- Rol almashtirish makrolari. auth.uid() request.jwt.claim.sub dan o'qiladi.
\set su    'reset role; set request.jwt.claim.sub = ''''; set request.jwt.claims = '''';'
\set anon  'reset role; set request.jwt.claim.sub = ''''; set request.jwt.claims = ''''; set role anon;'
\set as_u1 'reset role; set request.jwt.claims = ''''; set request.jwt.claim.sub = ''aaaaaaaa-0000-0000-0000-000000000001''; set role authenticated;'
\set as_u2 'reset role; set request.jwt.claims = ''''; set request.jwt.claim.sub = ''aaaaaaaa-0000-0000-0000-000000000002''; set role authenticated;'
\set as_mod 'reset role; set request.jwt.claims = ''''; set request.jwt.claim.sub = ''aaaaaaaa-0000-0000-0000-00000000000a''; set role authenticated;'
\set as_aud 'reset role; set request.jwt.claims = ''''; set request.jwt.claim.sub = ''aaaaaaaa-0000-0000-0000-00000000000d''; set role authenticated;'
\set as_own 'reset role; set request.jwt.claims = ''''; set request.jwt.claim.sub = ''aaaaaaaa-0000-0000-0000-00000000000e''; set role authenticated;'
\set as_sup 'reset role; set request.jwt.claims = ''''; set request.jwt.claim.sub = ''aaaaaaaa-0000-0000-0000-00000000000f''; set role authenticated;'

:su

-- "Nechta qator ko'rinadi" — huquq yo'qligi (permission denied) ham
-- "ko'rinmaydi" degani, shuning uchun u 0 deb hisoblanadi.
create function pg_temp.visible(q text) returns bigint language plpgsql as $$
declare n bigint;
begin
  begin
    execute 'select count(*) from (' || q || ') x' into n;
  exception when insufficient_privilege then n := 0;
  end;
  return n;
end $$;


-- ═══ 1. RO'YXATDAN O'TISH: meta-ma'lumotdan rol va tg_id OLINMAYDI ═════
--  raw_user_meta_data ni klient signUp() da O'ZI to'ldiradi.
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'u1@test.uz',  '{"name":"Birinchi"}'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'u2@test.uz',  '{"name":"Ikkinchi"}'),
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'mod@test.uz', '{"name":"Moderator"}'),
  ('aaaaaaaa-0000-0000-0000-00000000000d', 'aud@test.uz', '{"name":"Auditor"}'),
  ('aaaaaaaa-0000-0000-0000-00000000000e', 'own@test.uz', '{"name":"Egasi"}'),
  ('aaaaaaaa-0000-0000-0000-00000000000f', 'sup@test.uz', '{"name":"Yordam"}'),
  ('aaaaaaaa-0000-0000-0000-000000000bad', 'atk@test.uz',
   jsonb_build_object('name', '  Hujumchi  ', 'role', 'owner', 'tg_id', 123456789,
                      'extra', repeat('x', 5000))),
  ('aaaaaaaa-0000-0000-0000-000000000b0b', 'long@test.uz',
   jsonb_build_object('name', repeat('Uzun', 100)));

-- Rollarni bazaga to'g'ridan-to'g'ri ulanish (auth.uid() null) beradi —
-- README'dagi "o'zingizga owner berish" yo'li aynan shu.
update public.profiles set role = 'moderator' where id = 'aaaaaaaa-0000-0000-0000-00000000000a';
update public.profiles set role = 'auditor'   where id = 'aaaaaaaa-0000-0000-0000-00000000000d';
update public.profiles set role = 'owner'     where id = 'aaaaaaaa-0000-0000-0000-00000000000e';
update public.profiles set role = 'support'   where id = 'aaaaaaaa-0000-0000-0000-00000000000f';

do $$
declare p record;
begin
  select * into p from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000bad';
  if p.id is null then raise exception 'FAIL: profil yaratuvchi trigger ishlamadi'; end if;
  if p.role <> 'user' then
    raise exception 'FAIL: role meta-ma''lumotdan olindi (%) — har kim o''zini owner qilardi', p.role;
  end if;
  if p.tg_id is not null then
    raise exception 'FAIL: tg_id meta-ma''lumotdan olindi — boshqaning Telegram hisobini egallash mumkin';
  end if;
  if p.name is distinct from 'Hujumchi' then
    raise exception 'FAIL: ism yozilmadi yoki kesilmadi (%)', p.name;
  end if;
  if (select char_length(name) from public.profiles
       where id = 'aaaaaaaa-0000-0000-0000-000000000b0b') <> 80 then
    raise exception 'FAIL: juda uzun ism 80 belgiga kesilmadi';
  end if;
  raise notice '1 ✔ ro''yxatdan o''tishda rol va tg_id klientdan olinmaydi';
end $$;


-- ═══ 2. ANON (kirmagan) ════════════════════════════════════════════════
:anon

do $$
declare blocked boolean := false;
begin
  if pg_temp.visible('select * from public.profiles') <> 0 then
    raise exception 'FAIL: anon profillarni ko''rdi';
  end if;
  if pg_temp.visible('select * from public.audit_log') <> 0 then
    raise exception 'FAIL: anon audit jurnalini ko''rdi';
  end if;
  if public.has_role(array['user','support','moderator','auditor','owner']::public.app_role[]) then
    raise exception 'FAIL: anon uchun has_role true qaytardi';
  end if;
  begin
    insert into public.profiles (id, name) values ('aaaaaaaa-0000-0000-0000-00000000cafe', 'soxta');
  exception when others then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: anon profil yarata oldi'; end if;
  raise notice '2 ✔ anon profil va jurnalni ko''rmaydi, profil yarata olmaydi';
end $$;


-- ═══ 3. ODDIY FOYDALANUVCHI: o'z profilida ═════════════════════════════
:as_u1

do $$
begin
  if pg_temp.visible('select * from public.profiles') <> 1
     or not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'FAIL: foydalanuvchi faqat o''z profilini ko''rishi kerak (ko''rdi %)',
      pg_temp.visible('select * from public.profiles');
  end if;
end $$;

-- 3a. O'zini "owner" qilib qo'yish — eng og'ir teshik.
do $$ begin
  begin
    update public.profiles set role = 'owner' where id = auth.uid();
  exception when others then null;
  end;
end $$;
-- 3b. O'z tg_id sini yozish — boshqaning Telegram hisobini o'ziga bog'lash.
do $$ begin
  begin
    update public.profiles set tg_id = 987654321 where id = auth.uid();
  exception when others then null;
  end;
end $$;
-- 3c. Boshqaning ismini o'zgartirish.
do $$ begin
  begin
    update public.profiles set name = 'buzildi' where id = 'aaaaaaaa-0000-0000-0000-000000000002';
  exception when others then null;
  end;
end $$;
-- 3d. Halol yo'l: o'z ismini o'zgartirish ishlashi kerak.
update public.profiles set name = 'Yangi ism' where id = auth.uid();

-- 3e. O'z profilini o'chirish (hisobni o'chirish — boshqa yo'l bilan).
do $$ begin
  begin
    delete from public.profiles where id = auth.uid();
  exception when others then null;
  end;
end $$;

:su
do $$
declare p record;
begin
  select * into p from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001';
  if p.id is null then raise exception 'FAIL: foydalanuvchi o''z profilini o''chira oldi'; end if;
  if p.role <> 'user' then
    raise exception 'FAIL: foydalanuvchi o''ziga % rolini bera oldi — eng og''ir teshik', p.role;
  end if;
  if p.tg_id is not null then
    raise exception 'FAIL: foydalanuvchi o''z tg_id sini o''zgartira oldi — Telegram hisobini egallash';
  end if;
  if p.name <> 'Yangi ism' then
    raise exception 'FAIL: halol yo''l buzildi — foydalanuvchi o''z ismini o''zgartira olmadi';
  end if;
  if (select name from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000002') <> 'Ikkinchi' then
    raise exception 'FAIL: foydalanuvchi boshqaning profilini o''zgartirdi';
  end if;
  raise notice '3 ✔ foydalanuvchi o''ziga rol/tg_id bera olmaydi, boshqaning profiliga tegolmaydi';
end $$;


-- ═══ 4. ROLNI FAQAT EGASI BERADI ═══════════════════════════════════════
:as_mod
do $$ begin
  begin
    update public.profiles set role = 'moderator' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
  exception when others then null;
  end;
end $$;
:su
do $$ begin
  if (select role from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001') <> 'user' then
    raise exception 'FAIL: moderator boshqaga rol bera oldi — rolni faqat egasi beradi';
  end if;
end $$;

-- Xodimlar ro'yxatni ko'radi (admin panel uchun).
:as_sup
do $$ begin
  if pg_temp.visible('select * from public.profiles') < 8 then
    raise exception 'FAIL: support xodimi profillar ro''yxatini ko''rmadi';
  end if;
end $$;

:as_own
update public.profiles set role = 'support' where id = 'aaaaaaaa-0000-0000-0000-000000000002';
:su
do $$ begin
  if (select role from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000002') <> 'support' then
    raise exception 'FAIL: egasi rol bera olmadi';
  end if;
  if not exists (
    select 1 from public.audit_log
     where resource = 'profile:aaaaaaaa-0000-0000-0000-000000000002'
       and action = 'rol o''zgartirildi: user → support'
       and actor_id = 'aaaaaaaa-0000-0000-0000-00000000000e') then
    raise exception 'FAIL: rol o''zgarishi jurnalga tushmadi (yoki kim qilgani yozilmadi)';
  end if;
  raise notice '4 ✔ rolni faqat egasi beradi va bu jurnalga tushadi';
end $$;


-- ═══ 5. AUDIT JURNALI ══════════════════════════════════════════════════
:as_u1
do $$
declare blocked boolean := false;
begin
  if pg_temp.visible('select * from public.audit_log') <> 0 then
    raise exception 'FAIL: oddiy foydalanuvchi audit jurnalini ko''rdi';
  end if;
  -- Soxta yozuv qo'shish (izni yashirish uchun "shovqin" yoki tuhmat).
  begin
    insert into public.audit_log (action, resource) values ('soxta yozuv', 'x');
  exception when others then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: foydalanuvchi audit jurnaliga yozuv qo''sha oldi'; end if;
end $$;

:as_mod
do $$ begin
  if pg_temp.visible('select * from public.audit_log') <> 0 then
    raise exception 'FAIL: moderator audit jurnalini ko''rdi (faqat auditor va egasi)';
  end if;
end $$;

:as_aud
do $$
declare n0 bigint; n1 bigint;
begin
  n0 := pg_temp.visible('select * from public.audit_log');
  if n0 < 1 then raise exception 'FAIL: auditor audit jurnalini ko''rmadi'; end if;
  -- Auditor ham jurnalni o'zgartira olmaydi.
  begin
    delete from public.audit_log;
  exception when others then null;
  end;
  begin
    update public.audit_log set action = 'tahrirlandi';
  exception when others then null;
  end;
  n1 := pg_temp.visible('select * from public.audit_log where action <> ''tahrirlandi''');
  if n1 <> n0 then
    raise exception 'FAIL: auditor audit jurnalini o''zgartirdi yoki o''chirdi (% → %)', n0, n1;
  end if;
  raise notice '5 ✔ jurnalni faqat auditor/egasi o''qiydi, hech kim o''zgartira olmaydi';
end $$;

:su
-- ═══ 6. UMUMIY QOIDALAR (lint) ═════════════════════════════════════════
--  Oxirida — ataylab: yuqoridagi hujum testlari birinchi yiqilsin (xabari
--  aniqroq). Bu bo'lim esa huquqlar qatlamini (GRANT) alohida tekshiradi:
--  RLS ushlab qoladigan hujumda ortiqcha huquq ko'rinmaydi, lekin u
--  himoyaning ikkinchi qatlami yo'qolganini bildiradi.
do $$
declare bad text;
begin
  -- Har jadvalda RLS.
  select string_agg(tablename, ', ') into bad
    from pg_tables where schemaname = 'public' and not rowsecurity;
  if bad is not null then raise exception 'FAIL: RLS yoqilmagan jadval: %', bad; end if;

  -- Har ko'rinish security_invoker (aks holda RLS'ni chetlab o'tadi).
  select string_agg(c.relname, ', ') into bad
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'v'
     and not coalesce(c.reloptions @> array['security_invoker=true'], false);
  if bad is not null then raise exception 'FAIL: security_invoker''siz ko''rinish: %', bad; end if;

  -- SECURITY DEFINER funksiyada search_path qat'iy bo'lishi shart.
  select string_agg(p.proname, ', ') into bad
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef
     and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%');
  if bad is not null then raise exception 'FAIL: search_path''siz definer funksiya: %', bad; end if;

  /* Huquqlar qatlami. Supabase standart holatda anon'ga HAMMA huquqni
     beradi (_stub.sql shuni taqlid qiladi) — migratsiyalar ularni aniq
     olishi kerak. TRUNCATE alohida: u RLS'ni butunlay chetlab o'tadi. */
  select string_agg(format('%s:%s', t.tablename, p.priv), ', ') into bad
    from pg_tables t
    cross join unnest(array['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p(priv)
   where t.schemaname = 'public'
     and has_table_privilege('anon', format('public.%I', t.tablename), p.priv);
  if bad is not null then raise exception 'FAIL: anon yozish huquqiga ega: %', bad; end if;

  select string_agg(format('%s:%s', t.tablename, p.priv), ', ') into bad
    from pg_tables t
    cross join unnest(array['DELETE','TRUNCATE','REFERENCES','TRIGGER']) p(priv)
   where t.schemaname = 'public'
     and has_table_privilege('authenticated', format('public.%I', t.tablename), p.priv);
  if bad is not null then raise exception 'FAIL: authenticated ortiqcha huquqqa ega: %', bad; end if;

  select string_agg(t, ', ') into bad
    from unnest(array['profiles','audit_log','test_results','game_results','test_sessions',
                      'item_responses','certificates','league_state','league_members',
                      'league_results','league_closed']) t
   where has_table_privilege('anon', 'public.' || t, 'SELECT');
  if bad is not null then raise exception 'FAIL: anon maxfiy jadvalni o''qish huquqiga ega: %', bad; end if;

  if has_table_privilege('authenticated', 'public.audit_log', 'INSERT')
     or has_table_privilege('authenticated', 'public.audit_log', 'UPDATE') then
    raise exception 'FAIL: authenticated audit jurnaliga yozish huquqiga ega';
  end if;

  -- Natija, ball va sertifikatni FAQAT server yozadi (CONTRACT §10).
  select string_agg(format('%s:%s', t, p), ', ') into bad
    from unnest(array['test_results','game_results','test_sessions','item_responses','certificates',
                      'league_state','league_members','league_results','league_closed']) t
    cross join unnest(array['INSERT','UPDATE']) p
   where has_table_privilege('authenticated', 'public.' || t, p);
  if bad is not null then raise exception 'FAIL: authenticated natija/ball/sertifikat yozish huquqiga ega: %', bad; end if;

  -- Server test sessiyasida MAXFIY urug' bor — mijoz uni o'qiy olmasligi shart.
  if has_table_privilege('authenticated', 'public.test_sessions', 'SELECT')
     or has_table_privilege('anon', 'public.test_sessions', 'SELECT') then
    raise exception 'FAIL: mijoz test_sessions ni o''qish huquqiga ega — urug'' sizib chiqadi';
  end if;

  /* SECURITY DEFINER funksiyalar RLS'ni chetlab o'tadi — har biri kim
     chaqira olishi aniq bo'lishi kerak. Ro'yxat ATAYLAB yopiq: yangi
     definer funksiya qo'shilib, EXECUTE olinmasa (PostgreSQL uni
     standart holatda hammaga beradi), shu yerda yiqiladi. */
  select string_agg(p.oid::regprocedure::text, ', ') into bad
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef and p.prorettype <> 'trigger'::regtype
     and has_function_privilege('anon', p.oid, 'EXECUTE')
     and p.proname not in ('has_role', 'my_role', 'leaderboard', 'get_certificate');
  if bad is not null then raise exception 'FAIL: anon RPC huquqiga ega: %', bad; end if;

  select string_agg(p.oid::regprocedure::text, ', ') into bad
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef and p.prorettype <> 'trigger'::regtype
     and has_function_privilege('authenticated', p.oid, 'EXECUTE')
     and p.proname not in ('has_role', 'my_role', 'leaderboard', 'get_certificate',
                           'delete_my_data', 'issue_certificate',
                           'league_board', 'revoke_certificate');
  if bad is not null then raise exception 'FAIL: authenticated server funksiyasini chaqira oladi: %', bad; end if;

  -- Server yozuvchi funksiyalari service_role'da bo'lishi SHART (aks
  -- holda Edge Function ham yoza olmaydi — bu ham buzilish).
  select string_agg(f, ', ') into bad
    from unnest(array[
      'public.record_test_result(uuid,uuid,text,bigint,text,jsonb,boolean,integer,jsonb)',
      'public.record_game_result(uuid,uuid,text,text,integer,bigint,jsonb,boolean)',
      'public.league_close_week(date)', 'public.league_close_due()',
      'public.test_session_open(uuid,text,text[],integer,boolean)',
      'public.test_session_answer(uuid,uuid,integer,text,integer,integer)',
      'public.test_session_finish(uuid,uuid,text,jsonb,boolean,integer,jsonb)',
      'public.test_session_void(uuid,uuid)']) f
   where not has_function_privilege('service_role', f, 'EXECUTE');
  if bad is not null then raise exception 'FAIL: service_role server funksiyasini chaqira olmaydi: %', bad; end if;

  raise notice '6 ✔ RLS hamma jadvalda, ko''rinishlar security_invoker, huquqlar minimal';
end $$;


rollback;
\echo '✅ 0001_accounts.sql — hisoblar va jurnal tekshiruvi o''tdi'
