-- ═══════════════════════════════════════════════════════════════════════
--  IQUEST — sertifikatlar tekshiruvi
--
--  Hujumlar: mijoz sertifikatni o'zi yozishga, boshqaning sertifikatlari
--  ro'yxatini o'qishga, boshqaning natijasiga sertifikat so'rashga,
--  sertifikatni bekor qilishga urinadi; tekshirish sahifasi (anon) kod
--  bilan ortiqcha maydon oladimi.
--  Mantiq: faqat serverda o'tgan (certified), rasmiy, ishonchli,
--  shubhasiz, ≥ 30 savolli test; kod formati va tasodifiyligi; ism
--  berilgan paytdagicha qoladi; bekor qilingan sertifikat "bekor" deb
--  ko'rinadi.
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
\set anon  'reset role; set request.jwt.claim.sub = ''''; set request.jwt.claims = ''''; set role anon;'
\set as_u1 'reset role; set request.jwt.claims = ''''; set request.jwt.claim.sub = ''ffffffff-0000-0000-0000-000000000001''; set role authenticated;'
\set as_u2 'reset role; set request.jwt.claims = ''''; set request.jwt.claim.sub = ''ffffffff-0000-0000-0000-000000000002''; set role authenticated;'
\set as_mod 'reset role; set request.jwt.claims = ''''; set request.jwt.claim.sub = ''ffffffff-0000-0000-0000-00000000000a''; set role authenticated;'
\set as_aud 'reset role; set request.jwt.claims = ''''; set request.jwt.claim.sub = ''ffffffff-0000-0000-0000-00000000000d''; set role authenticated;'
\set as_own 'reset role; set request.jwt.claims = ''''; set request.jwt.claim.sub = ''ffffffff-0000-0000-0000-00000000000e''; set role authenticated;'

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

create function pg_temp.try(q text) returns text language plpgsql as $$
begin
  execute q;
  return 'ok';
exception when others then
  return sqlstate;
end $$;

create function pg_temp.keys(q text) returns text language plpgsql as $$
declare k text;
begin
  execute 'select string_agg(distinct k, '','' order by k) from (select jsonb_object_keys(to_jsonb(r)) k from ('
          || q || ') r) x' into k;
  return k;
end $$;

create function pg_temp.result(patch jsonb default '{}') returns jsonb language sql as $$
  select jsonb_build_object(
    'n', 30, 'correct', 22, 'iq', 118, 'lo', 110, 'hi', 126, 'theta', 1.2, 'se', 0.45,
    'reliable', true, 'durationMs', 900000,
    'byType', '{"matrix":{"n":15,"correct":11},"series":{"n":15,"correct":11}}'::jsonb) || patch;
$$;

-- Serverda o'tgan test natijasi (test_session_finish ichidagi yo'l).
create function pg_temp.certified(u text, seed bigint, patch jsonb default '{}',
                                  mode text default 'test', susp boolean default false,
                                  cert boolean default true) returns jsonb language sql as $$
  select public.record_result(u::uuid, gen_random_uuid(), '1', seed, mode, pg_temp.result(patch),
                              susp, 0, null, cert, cert);
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('ffffffff-0000-0000-0000-000000000001', 'u1@c.uz', '{"name":"Nodira Karimova"}'),
  ('ffffffff-0000-0000-0000-000000000002', 'u2@c.uz', '{}'),
  ('ffffffff-0000-0000-0000-00000000000a', 'm@c.uz',  '{"name":"Moderator"}'),
  ('ffffffff-0000-0000-0000-00000000000d', 'd@c.uz',  '{"name":"Auditor"}'),
  ('ffffffff-0000-0000-0000-00000000000e', 'e@c.uz',  '{"name":"Egasi"}');
update public.profiles set role = 'moderator' where id = 'ffffffff-0000-0000-0000-00000000000a';
update public.profiles set role = 'auditor'   where id = 'ffffffff-0000-0000-0000-00000000000d';
update public.profiles set role = 'owner'     where id = 'ffffffff-0000-0000-0000-00000000000e';

create temp table _codes (who text, code text, rid bigint);
grant select on _codes to anon, authenticated;


-- ═══ 1. QACHON BERILADI ═══════════════════════════════════════════════
do $$
declare r jsonb; c record;
begin
  r := pg_temp.certified('ffffffff-0000-0000-0000-000000000001', 1);
  if r ->> 'certificate' is null or r ->> 'certificate' !~ '^IQ-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$' then
    raise exception 'FAIL: sertifikatli test sertifikat bermadi yoki kod formati noto''g''ri: %', r;
  end if;
  insert into _codes values ('u1', r ->> 'certificate', (r ->> 'id')::bigint);

  for c in select * from (values
    ('qurilmadagi test (certified emas)', 2, '{}'::jsonb, 'test', false, false),
    ('mashq',                             3, '{}'::jsonb, 'practice', false, true),
    ('ishonchsiz (reliable = false)',     4, '{"reliable":false}'::jsonb, 'test', false, true),
    ('shubhali',                          5, '{}'::jsonb, 'test', true, true),
    ('30 tadan kam savol',                6, '{"n":20,"correct":15,"byType":{"matrix":{"n":20,"correct":15}}}'::jsonb, 'test', false, true)
  ) t(name, seed, patch, mode, susp, cert)
  loop
    r := pg_temp.certified('ffffffff-0000-0000-0000-000000000001', c.seed, c.patch, c.mode, c.susp, c.cert);
    if r ->> 'certificate' is not null then
      raise exception 'FAIL: sertifikat berilmasligi kerak edi: %', c.name;
    end if;
  end loop;

  -- Ismsiz profil: natija yoziladi, sertifikat — ism qo'shilgandan keyin.
  r := pg_temp.certified('ffffffff-0000-0000-0000-000000000002', 7);
  if r ->> 'certificate' is not null then
    raise exception 'FAIL: ismsiz profilga sertifikat berildi';
  end if;
  insert into _codes values ('u2-natija', null, (r ->> 'id')::bigint);
  raise notice '1 ✔ sertifikat faqat serverda o''tgan, rasmiy, ishonchli, shubhasiz, ≥30 savolli testdan';
end $$;


-- ═══ 2. MIJOZ SERTIFIKATNI O'ZI YOZA/O'ZGARTIRA OLMAYDI ════════════════
:as_u1
do $$
declare q text; st text;
begin
  foreach q in array array[
    $a$insert into public.certificates (code, user_id, test_result_id, name, iq, lo, hi, engine)
       values ('IQ-2222-3333', auth.uid(), (select rid from _codes where who = 'u1'), 'Soxta', 145, 140, 145, '1')$a$,
    $a$update public.certificates set iq = 145, hi = 145$a$,
    $a$update public.certificates set revoked_at = null, revoked_reason = null$a$,
    $a$delete from public.certificates$a$,
    $a$select public.certificate_issue((select rid from _codes where who = 'u1'), auth.uid())$a$,
    $a$select public.certificate_code()$a$
  ] loop
    st := pg_temp.try(q);
    if st <> '42501' then raise exception 'FAIL: mijoz sertifikatni o''zgartirdi (%): %', st, q; end if;
  end loop;
  -- O'z sertifikatlari ro'yxatini ko'radi.
  if pg_temp.visible('select * from public.certificates') <> 1 then
    raise exception 'FAIL: foydalanuvchi o''z sertifikatini ko''rmadi';
  end if;
  -- Boshqaning natijasiga sertifikat so'rash.
  st := pg_temp.try('select public.issue_certificate((select rid from _codes where who = ''u2-natija''))');
  if st = 'ok' then raise exception 'FAIL: boshqaning natijasiga sertifikat berildi'; end if;
end $$;
:su
do $$ begin
  if (select iq from public.certificates where code = (select code from _codes where who = 'u1')) <> 118 then
    raise exception 'FAIL: sertifikat qiymati o''zgardi';
  end if;
end $$;
:anon
do $$ begin
  if pg_temp.try($a$insert into public.certificates (code, user_id, test_result_id, name, iq, lo, hi, engine)
       values ('IQ-2222-4444', 'ffffffff-0000-0000-0000-000000000001', 1, 'Soxta', 145, 140, 145, '1')$a$) <> '42501' then
    raise exception 'FAIL: anon sertifikat yozdi';
  end if;
  raise notice '2 ✔ mijoz sertifikatni yozolmaydi, o''zgartira/o''chira olmaydi, boshqaning natijasiga so''ray olmaydi';
end $$;


-- ═══ 3. BOSHQANING SERTIFIKATLAR RO'YXATI YOPIQ ════════════════════════
:as_u2
do $$ begin
  if pg_temp.visible('select * from public.certificates') <> 0 then
    raise exception 'FAIL: foydalanuvchi boshqaning sertifikatlari ro''yxatini ko''rdi';
  end if;
end $$;
:as_aud
do $$ begin
  if pg_temp.visible('select * from public.certificates') <> 0 then
    raise exception 'FAIL: auditor sertifikatlar ro''yxatini ko''rdi';
  end if;
end $$;
:anon
do $$ begin
  if pg_temp.visible('select * from public.certificates') <> 0 then
    raise exception 'FAIL: anon sertifikatlar jadvalini o''qidi';
  end if;
  raise notice '3 ✔ sertifikatlar ro''yxatini faqat egasi ko''radi';
end $$;


-- ═══ 4. ISMNI QO'SHGACH — O'ZI SO'RAYDI ════════════════════════════════
:as_u2
update public.profiles set name = 'Jasur Aliyev' where id = auth.uid();
do $$
declare c text; c2 text;
begin
  c := public.issue_certificate((select rid from _codes where who = 'u2-natija'));
  c2 := public.issue_certificate((select rid from _codes where who = 'u2-natija'));
  if c is null or c <> c2 then
    raise exception 'FAIL: ism qo''shilgach sertifikat berilmadi yoki ikkinchi marta boshqa kod (%, %)', c, c2;
  end if;
  raise notice '4 ✔ ism qo''shilgach o''z natijasiga sertifikat so''raladi; qayta so''rash — o''sha kod';
end $$;


-- ═══ 5. TEKSHIRISH SAHIFASI: faqat ko'rsatiladigan maydonlar ═══════════
:anon
do $$
declare k text; code text := (select c.code from _codes c where c.who = 'u1'); r record;
begin
  k := pg_temp.keys(format('select * from public.get_certificate(%L)', code));
  if k <> 'code,hi,iq,issued_at,lo,name,revoked,revoked_at' then
    raise exception 'FAIL: get_certificate() ortiqcha maydon qaytardi: %', k;
  end if;
  select * into r from public.get_certificate('  ' || lower(code) || ' ');
  if r.code is distinct from code or r.name <> 'Nodira Karimova' or r.iq <> 118 or r.lo <> 110 or r.hi <> 126
     or r.revoked then
    raise exception 'FAIL: get_certificate() noto''g''ri: %', row_to_json(r);
  end if;
  if (select count(*) from public.get_certificate('IQ-2222-2222')) <> 0
     or (select count(*) from public.get_certificate(repeat('A', 5000))) <> 0
     or (select count(*) from public.get_certificate('%')) <> 0 then
    raise exception 'FAIL: get_certificate() noma''lum kod bilan nimadir qaytardi';
  end if;
  raise notice '5 ✔ get_certificate(): kod bilan faqat ism, ball, oraliq, sana, holat';
end $$;


-- ═══ 6. KOD — TASODIFIY, TAKRORLANMAYDI ════════════════════════════════
:su
do $$
declare n int; d int; bad int;
begin
  select count(*), count(distinct c), count(*) filter (where c !~ '^IQ-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$')
    into n, d, bad
    from (select public.certificate_code() c from generate_series(1, 5000)) x;
  if d <> n or bad <> 0 then
    raise exception 'FAIL: sertifikat kodi takrorlandi yoki formati buzildi (% / %, buzuq %)', d, n, bad;
  end if;
  -- Har o'rinda alifboning ko'p qismi uchraydi (doimiy belgi yo'q).
  select min(cnt) into d from (
    select pos, count(distinct substr(replace(c, '-', ''), pos, 1)) cnt
      from (select public.certificate_code() c from generate_series(1, 2000)) x,
           generate_series(3, 10) pos
     group by pos) y;
  if d < 30 then raise exception 'FAIL: sertifikat kodining biror o''rni tasodifiy emas (% xil belgi)', d; end if;
  raise notice '6 ✔ 5000 kod — takrorsiz, format to''g''ri, har o''rin tasodifiy';
end $$;


-- ═══ 7. ISM BERILGAN PAYTDAGICHA ═══════════════════════════════════════
:as_u1
update public.profiles set name = 'Boshqa Odam' where id = auth.uid();
:anon
do $$ begin
  if (select name from public.get_certificate((select code from _codes where who = 'u1'))) <> 'Nodira Karimova' then
    raise exception 'FAIL: profil ismi o''zgarganda sertifikatdagi ism ham o''zgardi';
  end if;
  raise notice '7 ✔ sertifikatdagi ism berilgan paytdagicha qoladi';
end $$;


-- ═══ 8. BEKOR QILISH — faqat egasi (owner), jurnal bilan ═══════════════
:as_u1
do $$ begin
  if pg_temp.try(format('select public.revoke_certificate(%L, %L)', (select code from _codes where who = 'u1'), 'o''zim')) <> '42501' then
    raise exception 'FAIL: sertifikat egasi (foydalanuvchi) uni bekor qila oldi';
  end if;
end $$;
:as_mod
do $$ begin
  if pg_temp.try(format('select public.revoke_certificate(%L, %L)', (select code from _codes where who = 'u1'), 'x')) <> '42501' then
    raise exception 'FAIL: moderator sertifikatni bekor qila oldi';
  end if;
end $$;
:as_own
do $$ begin
  if pg_temp.try(format('select public.revoke_certificate(%L, %L)', (select code from _codes where who = 'u1'), '  ')) <> '22023' then
    raise exception 'FAIL: sababsiz bekor qilindi';
  end if;
  perform public.revoke_certificate((select code from _codes where who = 'u1'), 'test qoidabuzarlik bilan topshirilgan');
end $$;
:anon
do $$
declare r record;
begin
  select * into r from public.get_certificate((select code from _codes where who = 'u1'));
  if r.code is null or not r.revoked or r.revoked_at is null then
    raise exception 'FAIL: bekor qilingan sertifikat tekshirish sahifasida "haqiqiy" ko''rindi';
  end if;
end $$;
:su
do $$ begin
  if not exists (select 1 from public.audit_log where action = 'sertifikat berildi'
                   and resource = 'certificate:' || (select code from _codes where who = 'u1'))
     or not exists (select 1 from public.audit_log where action = 'sertifikat bekor qilindi'
                   and actor_id = 'ffffffff-0000-0000-0000-00000000000e') then
    raise exception 'FAIL: sertifikat berilishi/bekor qilinishi jurnalga tushmadi';
  end if;
  if exists (select 1 from public.audit_log where action like 'sertifikat%' and after ? 'iq') then
    raise exception 'FAIL: jurnalga IQ qiymati ko''chdi';
  end if;
  raise notice '8 ✔ bekor qilish — faqat egasi, sabab bilan; tekshirishda "bekor" ko''rinadi; jurnalda (IQ''siz)';
end $$;


-- ═══ 9. MA'LUMOT O'CHIRILSA — SERTIFIKAT HAM ═══════════════════════════
:su
insert into _codes select 'u2', code, test_result_id from public.certificates
 where user_id = 'ffffffff-0000-0000-0000-000000000002';
:as_u2
select public.delete_my_data() \g /dev/null
:anon
do $$ begin
  if (select count(*) from _codes where who = 'u2') <> 1
     or (select count(*) from public.get_certificate((select code from _codes where who = 'u2'))) <> 0 then
    raise exception 'FAIL: delete_my_data() dan keyin sertifikat tekshirish sahifasida qoldi';
  end if;
end $$;
:su
do $$ begin
  if exists (select 1 from public.certificates where user_id = 'ffffffff-0000-0000-0000-000000000002') then
    raise exception 'FAIL: delete_my_data() dan keyin sertifikat qoldi';
  end if;
  raise notice '9 ✔ "ma''lumotimni o''chiring" sertifikatni ham o''chiradi';
end $$;

rollback;
\echo '✅ 0005_certificates.sql — sertifikatlar tekshiruvi o''tdi'
