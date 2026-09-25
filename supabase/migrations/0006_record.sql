-- ═══════════════════════════════════════════════════════════════════════
--  IQUEST — 0006: tekshirilgan natijani yozish va SERVERDA o'tadigan test
--
--  Bu fayldagi funksiyalarni FAQAT service_role chaqiradi — ya'ni Edge
--  Function (supabase/functions/*). anon va authenticated ularni chaqira
--  olmaydi (EXECUTE olingan): aks holda istalgan odam "IQ 145" ni
--  to'g'ridan-to'g'ri yozib qo'yardi.
--
--  Ikki yo'l:
--
--  1. Qurilmadagi test/o'yin (submit-test, submit-game): mijoz jurnali
--     server dvigateli bilan QAYTA O'YNALADI (IQ.session.verify,
--     IQ.games.replay), ball qayta hisoblanadi → record_test_result /
--     record_game_result. Shaxsiy tarix va liga ballari uchun. Sertifikat
--     YO'Q: qurilmada to'g'ri javob xotirada — jurnal "to'g'ri" bo'lishi
--     halollikni isbotlamaydi (CONTRACT §10).
--
--  2. Sertifikatli test (test-start, test-answer): butunlay serverda.
--     test_sessions — urug' shu yerda, mijoz uni HECH QACHON ko'rmaydi
--     (RLS yoqilgan, siyosat va huquq yo'q). Har savol javobsiz beriladi,
--     javob vaqtini BAZA o'lchaydi (now() − shown_at), tartib bilan
--     (optimistik indeks) yoziladi. Yakunda natija certified = true
--     bo'lib yoziladi va shartlar bajarilsa sertifikat beriladi.
--
--  Mashina o'qiydigan xato kodlari (SQLSTATE; Edge Function HTTP'ga
--  aylantiradi):
--     ZK400 noto'g'ri so'rov   ZK404 sessiya topilmadi (yoki boshqaniki)
--     ZK409 bu savolga allaqachon javob berilgan / ochiq sessiya bor
--     ZK410 sessiya yopilgan yoki muddati o'tgan
--     ZK422 juda tez javob      ZK429 kunlik chegara
-- ═══════════════════════════════════════════════════════════════════════

-- Kunlik ball chegarasi (test + o'yin). Liga faollik bo'yicha — skript
-- bilan cheksiz "faollik" yig'ib bo'lmasin.
create function public.daily_points_cap() returns int
language sql immutable set search_path = pg_catalog, pg_temp as $$ select 2000 $$;

create function public.points_today(p_user uuid)
returns int
language sql stable
set search_path = public, pg_temp
as $$
  select coalesce((select sum(points) from public.test_results
                    where user_id = p_user and created_at > now() - interval '24 hours'), 0)
       + coalesce((select sum(points) from public.game_results
                    where user_id = p_user and created_at > now() - interval '24 hours'), 0);
$$;

-- 32 bitli kriptografik tasodifiy son (gen_random_uuid — pg_strong_random).
create function public.random_u32()
returns bigint
language sql volatile
set search_path = pg_catalog, pg_temp
as $$
  select ('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint;
$$;


/* Ichki yozuvchi — ikkala yo'l ham shu yerdan o'tadi (bitta tranzaksiya:
   natija + liga balli + sertifikat + kalibrlash javoblari).
   p_result — server hisoblagan Result:
     { n, correct, iq, lo, hi, theta, se, reliable, byType, durationMs }
   p_responses — [{ item_id, type, level, b, k, correct, ms }] yoki null
     (foydalanuvchi kalibrlashga rozilik bermagan).
   p_certified — test serverda o'tgan (test_sessions); p_issue — sertifikat
     berishga urinish (faqat to'liq yakunlangan server sessiyasi). */
create function public.record_result(
  p_user uuid, p_client_id uuid, p_engine text, p_seed bigint, p_mode text,
  p_result jsonb, p_suspicious boolean, p_points int, p_responses jsonb,
  p_certified boolean, p_issue boolean)
returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  prev public.test_results;
  granted int;
  rid bigint;
  cert text;
  sess uuid;
begin
  if p_user is null or p_client_id is null or p_result is null then
    raise exception 'foydalanuvchi, client_id va natija kerak' using errcode = 'ZK400';
  end if;

  -- Qayta yuborish (tarmoq uzilgan) — o'sha javob, ikkinchi nusxa yo'q.
  select * into prev from public.test_results where user_id = p_user and client_id = p_client_id;
  if prev.id is not null then
    return jsonb_build_object('id', prev.id, 'points', prev.points, 'duplicate', true,
      'certificate', (select code from public.certificates where test_result_id = prev.id));
  end if;

  if (select count(*) from public.test_results
       where user_id = p_user and created_at > now() - interval '24 hours') >= 100 then
    raise exception 'kunlik chegara: 24 soatda 100 tadan ortiq natija yozilmaydi' using errcode = 'ZK429';
  end if;

  granted := case when coalesce(p_suspicious, false) then 0
                  else least(greatest(coalesce(p_points, 0), 0),
                             greatest(public.daily_points_cap() - public.points_today(p_user), 0)) end;

  insert into public.test_results
    (user_id, client_id, engine, seed, certified, mode, iq, lo, hi, theta, se, n, correct,
     reliable, by_type, duration_ms, suspicious, points)
  values
    (p_user, p_client_id, p_engine, p_seed, coalesce(p_certified, false), p_mode,
     (p_result ->> 'iq')::smallint, (p_result ->> 'lo')::smallint, (p_result ->> 'hi')::smallint,
     (p_result ->> 'theta')::double precision, (p_result ->> 'se')::double precision,
     (p_result ->> 'n')::smallint, (p_result ->> 'correct')::smallint,
     (p_result ->> 'reliable')::boolean, p_result -> 'byType',
     least(greatest(round((p_result ->> 'durationMs')::numeric), 0), 86400000)::int,
     coalesce(p_suspicious, false), granted)
  returning id into rid;

  perform public.league_add_points(p_user, granted);

  if coalesce(p_certified, false) and coalesce(p_issue, false) then
    cert := public.certificate_issue(rid, p_user);
  end if;

  /* Kalibrlash javoblari — anonim: yangi tasodifiy sessiya id'si, natija
     id'si bilan hech qayerda bog'lanmaydi. Buzuq qator butun to'plamni
     rad etadi (yarim sessiya kalibrlashni buzadi) — natija baribir yoziladi. */
  if p_responses is not null and jsonb_typeof(p_responses) = 'array'
     and jsonb_array_length(p_responses) between 1 and 200 then
    sess := gen_random_uuid();
    begin
      insert into public.item_responses (session, seq, item_id, type, level, b, k, correct, ms)
      select sess, (e.i - 1)::smallint,
             e.r ->> 'item_id', e.r ->> 'type', (e.r ->> 'level')::smallint,
             (e.r ->> 'b')::real, (e.r ->> 'k')::smallint,
             (e.r ->> 'correct')::boolean, least((e.r ->> 'ms')::integer, 600000)
        from jsonb_array_elements(p_responses) with ordinality as e(r, i);
    exception when others then
      raise warning 'kalibrlash javoblari yozilmadi: %', sqlerrm;
    end;
  end if;

  return jsonb_build_object('id', rid, 'points', granted, 'certificate', cert, 'duplicate', false);
end;
$$;


/* 1-yo'l: qurilmadagi test (mijoz jurnali server dvigatelida qayta
   o'ynalgan). Hech qachon certified emas — sertifikat bermaydi. */
create function public.record_test_result(
  p_user uuid, p_client_id uuid, p_engine text, p_seed bigint, p_mode text,
  p_result jsonb, p_suspicious boolean, p_points int, p_responses jsonb)
returns jsonb
language sql
security definer set search_path = public, pg_temp
as $$
  select public.record_result(p_user, p_client_id, p_engine, p_seed, p_mode,
                              p_result, p_suspicious, p_points, p_responses, false, false);
$$;


/* O'yin: server replay qilgan natija { score, points, correct, total,
   durationMs }. */
create function public.record_game_result(
  p_user uuid, p_client_id uuid, p_engine text, p_game text, p_level int, p_seed bigint,
  p_result jsonb, p_suspicious boolean)
returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  prev public.game_results;
  granted int;
  rid bigint;
begin
  if p_user is null or p_client_id is null or p_result is null then
    raise exception 'foydalanuvchi, client_id va natija kerak' using errcode = 'ZK400';
  end if;

  select * into prev from public.game_results where user_id = p_user and client_id = p_client_id;
  if prev.id is not null then
    return jsonb_build_object('id', prev.id, 'points', prev.points, 'duplicate', true);
  end if;

  if (select count(*) from public.game_results
       where user_id = p_user and created_at > now() - interval '24 hours') >= 200 then
    raise exception 'kunlik chegara: 24 soatda 200 tadan ortiq o''yin yozilmaydi' using errcode = 'ZK429';
  end if;

  granted := case when coalesce(p_suspicious, false) then 0
                  else least(greatest(coalesce((p_result ->> 'points')::int, 0), 0),
                             greatest(public.daily_points_cap() - public.points_today(p_user), 0)) end;

  insert into public.game_results
    (user_id, client_id, engine, game, level, seed, score, points, correct, total, duration_ms, suspicious)
  values
    (p_user, p_client_id, p_engine, p_game, p_level, p_seed,
     (p_result ->> 'score')::int, granted,
     (p_result ->> 'correct')::int, (p_result ->> 'total')::int,
     least(greatest(round((p_result ->> 'durationMs')::numeric), 0), 3600000)::int,
     coalesce(p_suspicious, false))
  returning id into rid;

  perform public.league_add_points(p_user, granted);

  return jsonb_build_object('id', rid, 'points', granted, 'duplicate', false);
end;
$$;


-- ═══ 2-yo'l: SERTIFIKATLI TEST (serverda) ══════════════════════════════
create table public.test_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  engine          text not null constraint sessions_engine check (engine ~ '^[A-Za-z0-9._-]{1,40}$'),
  -- MAXFIY. Urug' bilan dvigatel hamma savolni va to'g'ri javobni beradi.
  seed            bigint not null constraint sessions_seed check (seed between 0 and 4294967295),
  types           text[] not null constraint sessions_types check (cardinality(types) between 1 and 16),
  length          smallint not null constraint sessions_length check (length between 30 and 200),
  -- [{ id, answer, ms }] — ms ni BAZA o'lchagan.
  log             jsonb not null default '[]'::jsonb
                  constraint sessions_log check (jsonb_typeof(log) = 'array'),
  shown_at        timestamptz not null default now(),   -- joriy savol berilgan payt
  started_at      timestamptz not null default now(),
  deadline        timestamptz not null,
  state           text not null default 'open'
                  constraint sessions_state check (state in ('open', 'done', 'expired', 'void')),
  finished_at     timestamptz,
  test_result_id  bigint references public.test_results (id) on delete set null,
  constraint sessions_log_len check (jsonb_array_length(log) <= length)
);

-- Bir vaqtda bitta ochiq sessiya.
create unique index test_sessions_one_open on public.test_sessions (user_id) where state = 'open';
create index test_sessions_user_idx on public.test_sessions (user_id, started_at desc);


/* Ochiq sessiyani qaytaradi yoki (p_create bo'lsa) yangisini ochadi.
   Kuniga 3 ta: sertifikatli test ~30 savol, 20–40 daqiqa. Ko'p urinish
   natijani "yaxshilash" (bir xil turdagi savollarni yodlab olish) va
   server resursi uchun ochiq eshik bo'lardi; 3 ta — uzilish yoki yomon
   kundan keyin qayta urinishga yetarli. Uzilgan sessiya yangisini
   sarflamaydi — u davom ettiriladi (resume). Muddat — 60 daqiqa. */
create function public.test_session_open(
  p_user uuid, p_engine text, p_types text[], p_length int, p_create boolean)
returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  s public.test_sessions;
begin
  if p_user is null then
    raise exception 'foydalanuvchi kerak' using errcode = 'ZK400';
  end if;
  select * into s from public.test_sessions where user_id = p_user and state = 'open';
  if s.id is not null then
    return to_jsonb(s) || jsonb_build_object('created', false, 'now', now());
  end if;
  if not coalesce(p_create, false) then
    return null;
  end if;
  if (select count(*) from public.test_sessions
       where user_id = p_user and started_at > now() - interval '24 hours') >= 3 then
    raise exception 'kunlik chegara: 24 soatda 3 tadan ortiq sertifikatli test boshlab bo''lmaydi'
      using errcode = 'ZK429';
  end if;
  begin
    insert into public.test_sessions (user_id, engine, seed, types, length, deadline)
    values (p_user, p_engine, public.random_u32(), p_types, p_length, now() + interval '60 minutes')
    returning * into s;
  exception when unique_violation then
    -- Parallel so'rov allaqachon ochdi — o'shani qaytaramiz.
    select * into s from public.test_sessions where user_id = p_user and state = 'open';
    return to_jsonb(s) || jsonb_build_object('created', false, 'now', now());
  end;
  return to_jsonb(s) || jsonb_build_object('created', true, 'now', now());
end;
$$;


/* Javobni yozadi. Vaqtni BAZA o'lchaydi: savol berilgan paytdan (shown_at)
   hozirgacha. p_index — Edge Function qayta tug'dirgan savolning o'rni:
   jurnal uzunligiga teng bo'lishi SHART (ikki marta yuborilgan javob yoki
   parallel so'rov boshqa savolga yozilib qolmasin). */
create function public.test_session_answer(
  p_session uuid, p_user uuid, p_index int, p_item_id text, p_answer int, p_min_ms int)
returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  s public.test_sessions;
  ms bigint;
begin
  select * into s from public.test_sessions where id = p_session for update;
  -- Boshqaning sessiyasi "topilmadi" — borligini ham oshkor qilmaymiz.
  if s.id is null or s.user_id is distinct from p_user then
    raise exception 'sessiya topilmadi' using errcode = 'ZK404';
  end if;
  if s.state <> 'open' then
    raise exception 'sessiya yopilgan' using errcode = 'ZK410';
  end if;
  if now() > s.deadline then
    raise exception 'sessiya muddati tugagan' using errcode = 'ZK410';
  end if;
  if p_index is distinct from jsonb_array_length(s.log) then
    raise exception 'bu savolga allaqachon javob berilgan' using errcode = 'ZK409';
  end if;
  if p_answer is null or p_answer < -1 or p_answer > 15
     or p_item_id is null or char_length(p_item_id) > 64 then
    raise exception 'javob noto''g''ri' using errcode = 'ZK400';
  end if;
  ms := floor(extract(epoch from (now() - s.shown_at)) * 1000);
  if ms < greatest(coalesce(p_min_ms, 300), 300) then
    raise exception 'juda tez javob (% ms)', ms using errcode = 'ZK422';
  end if;
  update public.test_sessions
     set log = log || jsonb_build_array(jsonb_build_object('id', p_item_id, 'answer', p_answer, 'ms', ms)),
         shown_at = now()
   where id = p_session;
  return jsonb_build_object('index', p_index + 1, 'ms', ms);
end;
$$;


/* Yakun: natija (server dvigatelida hisoblangan) certified bo'lib
   yoziladi. Sertifikat faqat to'liq yakunlangan ('done') sessiyadan,
   length ≥ 30 va p_eligible (Edge Function: turlar = to'liq IQ.types(),
   mode test) bo'lsa; reliable/shubhasizlikni certificate_issue tekshiradi.
   Muddati o'tgan ('expired') sessiya natija beradi (javobsizlar — xato),
   sertifikat bermaydi. */
create function public.test_session_finish(
  p_session uuid, p_user uuid, p_state text, p_result jsonb, p_eligible boolean,
  p_points int, p_responses jsonb)
returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  s public.test_sessions;
  res jsonb;
begin
  if p_state not in ('done', 'expired') then
    raise exception 'yakun holati: done | expired' using errcode = 'ZK400';
  end if;
  select * into s from public.test_sessions where id = p_session for update;
  if s.id is null or s.user_id is distinct from p_user then
    raise exception 'sessiya topilmadi' using errcode = 'ZK404';
  end if;
  if s.state <> 'open' then
    raise exception 'sessiya yopilgan' using errcode = 'ZK410';
  end if;
  if p_state = 'done' and jsonb_array_length(s.log) <> s.length then
    raise exception 'sessiya hali tugamagan (% / %)', jsonb_array_length(s.log), s.length
      using errcode = 'ZK409';
  end if;
  res := public.record_result(p_user, s.id, s.engine, s.seed, 'test', p_result, false,
                              p_points, p_responses, true,
                              coalesce(p_eligible, false) and p_state = 'done' and s.length >= 30);
  update public.test_sessions
     set state = p_state, finished_at = now(), test_result_id = (res ->> 'id')::bigint
   where id = s.id;
  return res;
end;
$$;

/* Dvigatel yangilanib, ochiq sessiyani qayta o'ynab bo'lmay qolsa —
   bekor qilinadi (natija yozilmaydi, kunlik urinish qaytarilmaydi). */
create function public.test_session_void(p_session uuid, p_user uuid)
returns void
language plpgsql
security definer set search_path = public, pg_temp
as $$
begin
  update public.test_sessions set state = 'void', finished_at = now()
   where id = p_session and user_id = p_user and state = 'open';
end;
$$;


/* Cron uchun: o'tgan (va undan oldingi yopilmagan) haftalarni yopadi.
   Argumentsiz — pg_cron ifodasi ham, tashqi cron (HTTP RPC) ham oddiy
   bo'lsin (supabase/cron.sql, README). */
create function public.league_close_due()
returns integer
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  w date;
  total int := 0;
begin
  for w in
    select distinct m.week from public.league_members m
     where m.week < public.league_week()
       and not exists (select 1 from public.league_closed c where c.week = m.week)
     order by m.week
  loop
    total := total + public.league_close_week(w);
  end loop;
  return total;
end;
$$;


-- ═══ RLS VA HUQUQLAR ═══════════════════════════════════════════════════
/* test_sessions: RLS yoqilgan, siyosat YO'Q, huquq olingan — mijoz (hatto
   o'z sessiyasini ham) o'qiy olmaydi: urug' va jurnal faqat Edge
   Function (service_role, RLS'dan tashqari) qo'lida. */
alter table public.test_sessions enable row level security;
revoke all on public.test_sessions from anon, authenticated;

revoke all on function public.daily_points_cap()  from public, anon, authenticated;
revoke all on function public.points_today(uuid)  from public, anon, authenticated;
revoke all on function public.random_u32()        from public, anon, authenticated;
revoke all on function public.record_result(uuid, uuid, text, bigint, text, jsonb, boolean, int, jsonb, boolean, boolean)
  from public, anon, authenticated;
revoke all on function public.record_test_result(uuid, uuid, text, bigint, text, jsonb, boolean, int, jsonb)
  from public, anon, authenticated;
revoke all on function public.record_game_result(uuid, uuid, text, text, int, bigint, jsonb, boolean)
  from public, anon, authenticated;
revoke all on function public.test_session_open(uuid, text, text[], int, boolean) from public, anon, authenticated;
revoke all on function public.test_session_answer(uuid, uuid, int, text, int, int) from public, anon, authenticated;
revoke all on function public.test_session_finish(uuid, uuid, text, jsonb, boolean, int, jsonb)
  from public, anon, authenticated;
revoke all on function public.test_session_void(uuid, uuid) from public, anon, authenticated;
revoke all on function public.league_close_due() from public, anon, authenticated;

grant execute on function public.record_test_result(uuid, uuid, text, bigint, text, jsonb, boolean, int, jsonb)
  to service_role;
grant execute on function public.record_game_result(uuid, uuid, text, text, int, bigint, jsonb, boolean)
  to service_role;
grant execute on function public.test_session_open(uuid, text, text[], int, boolean) to service_role;
grant execute on function public.test_session_answer(uuid, uuid, int, text, int, int) to service_role;
grant execute on function public.test_session_finish(uuid, uuid, text, jsonb, boolean, int, jsonb)
  to service_role;
grant execute on function public.test_session_void(uuid, uuid) to service_role;
grant execute on function public.league_close_due() to service_role;
