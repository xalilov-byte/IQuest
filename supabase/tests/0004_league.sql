-- ═══════════════════════════════════════════════════════════════════════
--  IQUEST — haftalik liga va reyting tekshiruvi
--
--  Hujumlar: mijoz liga jadvallariga yoki ball funksiyasiga yozishga,
--  haftani o'zi yopishga, boshqa guruhni yoki maxfiy maydonni (user_id,
--  natija, IQ — rozilik bermaganniki) ko'rishga urinadi.
--  Mantiq: ~30 kishilik guruhlar, hafta oxirida yuqori 20% ko'tariladi,
--  pastki 20% tushadi; reytingda faqat sertifikatli (serverda o'tgan)
--  natija va faqat rozilik berganlar.
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
\set as_u1 'reset role; set request.jwt.claims = ''''; set request.jwt.claim.sub = ''eeeeeeee-0000-0000-0000-000000000001''; set role authenticated;'
\set as_u2 'reset role; set request.jwt.claims = ''''; set request.jwt.claim.sub = ''eeeeeeee-0000-0000-0000-000000000002''; set role authenticated;'

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

-- Funksiya natijasidagi ustunlar nomi (tartiblangan).
create function pg_temp.keys(q text) returns text language plpgsql as $$
declare k text;
begin
  execute 'select string_agg(distinct k, '','' order by k) from (select jsonb_object_keys(to_jsonb(r)) k from ('
          || q || ') r) x' into k;
  return k;
end $$;

create function pg_temp.result(patch jsonb default '{}') returns jsonb language sql as $$
  select jsonb_build_object(
    'n', 30, 'correct', 18, 'iq', 108, 'lo', 100, 'hi', 116, 'theta', 0.53, 'se', 0.3,
    'reliable', true, 'durationMs', 600000,
    'byType', '{"matrix":{"n":15,"correct":9},"series":{"n":15,"correct":9}}'::jsonb) || patch;
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'u1@l.uz', '{"name":"Aziza"}'),
  ('eeeeeeee-0000-0000-0000-000000000002', 'u2@l.uz', '{"name":"Bobur"}'),
  ('eeeeeeee-0000-0000-0000-000000000003', 'u3@l.uz', '{"name":"Dilshod"}'),
  ('eeeeeeee-0000-0000-0000-000000000004', 'u4@l.uz', '{"name":"Gulnora"}');
-- 65 ta "o'yinchi" — guruhlarga bo'linishni sinash uchun.
insert into auth.users (id, raw_user_meta_data)
select ('eeeeeeee-1111-0000-0000-' || lpad(i::text, 12, '0'))::uuid, jsonb_build_object('name', 'O''yinchi ' || i)
  from generate_series(1, 65) i;


-- ═══ 1. BALL SERVERDAN LIGAGA ═══════════════════════════════════════════
:svc
do $$
declare m record;
begin
  perform public.record_test_result('eeeeeeee-0000-0000-0000-000000000001', gen_random_uuid(), '1', 1, 'practice',
            pg_temp.result(), false, 50, null);
  perform public.record_game_result('eeeeeeee-0000-0000-0000-000000000001', gen_random_uuid(), '1', 'schulte', 5, 1,
            '{"score":10,"points":30,"correct":5,"total":5,"durationMs":60000}', false);
  select * into m from public.league_members
   where week = public.league_week() and user_id = 'eeeeeeee-0000-0000-0000-000000000001';
  if m.user_id is null or m.points <> 80 or m.tier <> 'bronza' or m.grp <> 1 then
    raise exception 'FAIL: liga — server bergan ball haftalik guruhga tushmadi: %', row_to_json(m);
  end if;
  raise notice '1 ✔ server bergan ball (test + o''yin) haftalik liga guruhiga tushadi';
end $$;


-- ═══ 2. GURUHLAR ~30 KISHI ═════════════════════════════════════════════
:su
do $$
declare sizes text;
begin
  perform public.league_add_points(('eeeeeeee-1111-0000-0000-' || lpad(i::text, 12, '0'))::uuid, 10 + i)
     from generate_series(1, 65) i;
  select string_agg(n::text, ',' order by grp) into sizes
    from (select grp, count(*) n from public.league_members
           where week = public.league_week() and tier = 'bronza' group by grp) x;
  if sizes <> '30,30,6' then
    raise exception 'FAIL: liga guruhlari 30 kishidan oshdi yoki noto''g''ri bo''lindi (%)', sizes;
  end if;
  -- Boshqa darajadagi o'yinchi o'z darajasining guruhiga tushadi.
  insert into public.league_state (user_id, tier) values ('eeeeeeee-0000-0000-0000-000000000003', 'oltin');
  perform public.league_add_points('eeeeeeee-0000-0000-0000-000000000003', 5);
  if (select tier::text || grp from public.league_members
       where week = public.league_week() and user_id = 'eeeeeeee-0000-0000-0000-000000000003') <> 'oltin1' then
    raise exception 'FAIL: liga — o''yinchi o''z darajasidagi guruhga tushmadi';
  end if;
  raise notice '2 ✔ guruhlar 30 kishidan oshmaydi (66 → 30, 30, 6), daraja bo''yicha alohida';
end $$;


-- ═══ 3. MIJOZ LIGAGA YOZA OLMAYDI ══════════════════════════════════════
:as_u1
do $$
declare q text; st text;
begin
  foreach q in array array[
    $a$insert into public.league_members (week, user_id, tier, grp, points) values (public.league_week() - 7, auth.uid(), 'olmos', 1, 1)$a$,
    $a$update public.league_members set points = 99999$a$,
    $a$insert into public.league_state (user_id, tier) values (auth.uid(), 'olmos')$a$,
    $a$update public.league_state set tier = 'olmos'$a$,
    $a$select public.league_add_points(auth.uid(), 99999)$a$,
    $a$select public.league_close_week(public.league_week() - 7)$a$,
    $a$select public.league_close_due()$a$
  ] loop
    st := pg_temp.try(q);
    if st <> '42501' then raise exception 'FAIL: mijoz ligani o''zgartirdi (%): %', st, q; end if;
  end loop;
  if (select points from public.league_members where user_id = auth.uid()) <> 80 then
    raise exception 'FAIL: mijoz liga ballini o''zgartirdi';
  end if;
  -- O'z yozuvini ko'radi, boshqalarnikini — yo'q.
  if pg_temp.visible('select * from public.league_members') <> 1 then
    raise exception 'FAIL: mijoz boshqalarning liga yozuvlarini to''g''ridan-to''g''ri o''qidi';
  end if;
  raise notice '3 ✔ mijoz liga jadvallari va funksiyalariga yoza olmaydi; faqat o''z yozuvini ko''radi';
end $$;


-- ═══ 4. GURUH JADVALI: faqat o'z guruhi, faqat ko'rsatiladigan maydonlar
:as_u1
do $$
declare k text;
begin
  k := pg_temp.keys('select * from public.league_board()');
  if k <> 'avatar_url,display_name,is_me,points,rank,tier' then
    raise exception 'FAIL: league_board() ortiqcha maydon qaytardi: %', k;
  end if;
  if (select count(*) from public.league_board()) <> 30
     or (select count(*) from public.league_board() where is_me) <> 1
     or (select rank from public.league_board() where is_me) <> 1 then
    raise exception 'FAIL: league_board() o''z guruhini to''g''ri bermadi';
  end if;
  if exists (select 1 from public.league_board() where display_name = 'Dilshod') then
    raise exception 'FAIL: league_board() boshqa guruh (oltin) a''zosini ko''rsatdi';
  end if;
end $$;
:as_u2
do $$ begin
  if (select count(*) from public.league_board()) <> 0 then
    raise exception 'FAIL: bu hafta ball olmagan foydalanuvchi begona guruhni ko''rdi';
  end if;
end $$;
:anon
do $$ begin
  if pg_temp.try('select * from public.league_board()') <> '42501' then
    raise exception 'FAIL: anon liga guruhini ko''rdi';
  end if;
  raise notice '4 ✔ league_board(): faqat o''z guruhi, faqat o''rin/ism/avatar/ball/daraja';
end $$;


-- ═══ 5. HAFTANI YOPISH: ko'tarilish va tushish ═════════════════════════
:su
do $$
declare w date := public.league_week() - 7;
        n int; ups text; downs text;
begin
  -- O'tgan haftadagi "oltin" guruhi: 10 kishi, ball 100, 90, … 10.
  insert into public.league_members (week, user_id, tier, grp, points, joined_at)
  select w, ('eeeeeeee-1111-0000-0000-' || lpad(i::text, 12, '0'))::uuid, 'oltin', 1, 110 - i * 10,
         now() - interval '8 days' + i * interval '1 minute'
    from generate_series(1, 10) i;
  -- Bronzada yolg'iz o'yinchi (ball bor) va olmosda yolg'iz o'yinchi.
  insert into public.league_members (week, user_id, tier, grp, points) values
    (w, 'eeeeeeee-0000-0000-0000-000000000002', 'bronza', 1, 5),
    (w, 'eeeeeeee-0000-0000-0000-000000000004', 'olmos', 1, 500);

  -- Joriy haftani yopib bo'lmaydi.
  if pg_temp.try('select public.league_close_week(public.league_week())') = 'ok' then
    raise exception 'FAIL: liga — joriy (davom etayotgan) hafta yopildi';
  end if;

  n := public.league_close_week(w);
  if n <> 12 then raise exception 'FAIL: liga — % a''zo qayta ishlandi, 12 kutilgan', n; end if;

  select string_agg(right(user_id::text, 2), ',' order by rank) into ups
    from public.league_results where week = w and tier = 'oltin' and outcome = 'up';
  select string_agg(right(user_id::text, 2), ',' order by rank) into downs
    from public.league_results where week = w and tier = 'oltin' and outcome = 'down';
  if ups <> '01,02' or downs <> '09,10' then
    raise exception 'FAIL: liga — ko''tarilish/tushish noto''g''ri (yuqori %, past %)', ups, downs;
  end if;
  if (select tier from public.league_state where user_id = 'eeeeeeee-1111-0000-0000-000000000001') <> 'platina'
     or (select tier from public.league_state where user_id = 'eeeeeeee-1111-0000-0000-000000000010') <> 'kumush'
     or (select tier from public.league_state where user_id = 'eeeeeeee-1111-0000-0000-000000000005') <> 'oltin' then
    raise exception 'FAIL: liga — yangi daraja league_state ga yozilmadi';
  end if;
  if (select tier from public.league_state where user_id = 'eeeeeeee-0000-0000-0000-000000000002') <> 'kumush'
     or (select tier from public.league_state where user_id = 'eeeeeeee-0000-0000-0000-000000000004') <> 'olmos' then
    raise exception 'FAIL: liga — chegaradagi daraja (bronza/olmos) noto''g''ri';
  end if;

  -- Idempotent: qayta yopish hech narsani o'zgartirmaydi.
  if public.league_close_week(w) <> 0 then raise exception 'FAIL: liga — hafta ikki marta yopildi'; end if;

  -- Cron yo'li: yopilmagan eski haftalarni o'zi topadi.
  insert into public.league_members (week, user_id, tier, grp, points)
  values (w - 7, 'eeeeeeee-0000-0000-0000-000000000004', 'bronza', 1, 1);
  n := public.league_close_due();
  if n <> 1 or not exists (select 1 from public.league_closed where week = w - 7) then
    raise exception 'FAIL: league_close_due() yopilmagan haftani yopmadi (%)', n;
  end if;
  raise notice '5 ✔ hafta yopilishi: yuqori 20%% ko''tariladi, pastki 20%% tushadi, idempotent, joriy hafta yopilmaydi';
end $$;


-- ═══ 6. REYTING: sertifikatli natija, faqat rozilik berganlar ══════════
:su
do $$ begin
  update public.profiles set show_on_leaderboard = true
   where id in ('eeeeeeee-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000003',
                'eeeeeeee-0000-0000-0000-000000000004');
  -- U1: sertifikatli (serverda o'tgan) 120 — ko'rinadi.
  perform public.record_result('eeeeeeee-0000-0000-0000-000000000001', gen_random_uuid(), '1', 11, 'test',
            pg_temp.result('{"iq":120,"lo":112,"hi":128}'), false, 0, null, true, true);
  -- U2: sertifikatli 135, lekin rozilik YO'Q — ko'rinmasligi kerak.
  perform public.record_result('eeeeeeee-0000-0000-0000-000000000002', gen_random_uuid(), '1', 12, 'test',
            pg_temp.result('{"iq":135,"lo":127,"hi":143}'), false, 0, null, true, true);
  -- U3: faqat qurilmadagi (sertifikatsiz) 140 va mashq 145 — ko'rinmasligi kerak.
  perform public.record_result('eeeeeeee-0000-0000-0000-000000000003', gen_random_uuid(), '1', 13, 'test',
            pg_temp.result('{"iq":140,"lo":132,"hi":145}'), false, 0, null, false, false);
  perform public.record_result('eeeeeeee-0000-0000-0000-000000000003', gen_random_uuid(), '1', 14, 'practice',
            pg_temp.result('{"iq":145,"lo":137,"hi":145}'), false, 0, null, true, true);
  -- U4: sertifikatli, lekin shubhali va ishonchsiz — ko'rinmasligi kerak.
  perform public.record_result('eeeeeeee-0000-0000-0000-000000000004', gen_random_uuid(), '1', 15, 'test',
            pg_temp.result('{"iq":144,"lo":136,"hi":145}'), true, 0, null, true, true);
  perform public.record_result('eeeeeeee-0000-0000-0000-000000000004', gen_random_uuid(), '1', 16, 'test',
            pg_temp.result('{"iq":143,"lo":120,"hi":145,"reliable":false}'), false, 0, null, true, true);
end $$;

:anon
do $$
declare k text;
begin
  k := pg_temp.keys('select * from public.leaderboard(''iq'')');
  if k <> 'avatar_url,display_name,hi,iq,is_me,lo,rank,value' then
    raise exception 'FAIL: leaderboard() ortiqcha maydon qaytardi: %', k;
  end if;
  if (select string_agg(display_name || ':' || iq || '(' || lo || '-' || hi || ')', ',' order by rank)
        from public.leaderboard('iq')) <> 'Aziza:120(112-128)' then
    raise exception 'FAIL: IQ reytingi — sertifikatsiz/rozilik bermagan/shubhali natija ko''rindi: %',
      (select string_agg(display_name || ':' || iq, ',') from public.leaderboard('iq'));
  end if;
  if exists (select 1 from public.leaderboard('iq') where is_me) then
    raise exception 'FAIL: anon uchun is_me true';
  end if;
  if pg_temp.try('select * from public.leaderboard(''hamma'')') <> '22023' then
    raise exception 'FAIL: noma''lum reyting turi qabul qilindi';
  end if;
end $$;
:as_u1
do $$ begin
  if not (select is_me from public.leaderboard('iq') where display_name = 'Aziza') then
    raise exception 'FAIL: leaderboard() is_me ni belgilamadi';
  end if;
  -- Jami ball: U1 — 80 (1-bo'lim), U3 — 5 emas (u faqat liga orqali), rozilik berganlar.
  if (select value from public.leaderboard('points') where display_name = 'Aziza') <> 80
     or exists (select 1 from public.leaderboard('points') where display_name = 'Bobur') then
    raise exception 'FAIL: ball reytingi noto''g''ri yoki rozilik bermagan ko''rindi';
  end if;
  if (select count(*) from public.leaderboard('iq', 100000)) > 100 then
    raise exception 'FAIL: reyting chegarasi (100) ishlamadi';
  end if;
  raise notice '6 ✔ reyting: faqat sertifikatli, ishonchli, shubhasiz natija; faqat rozilik berganlar; IQ oraliq bilan';
end $$;

rollback;
\echo '✅ 0004_league.sql — liga va reyting tekshiruvi o''tdi'
