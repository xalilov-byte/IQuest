-- ═══════════════════════════════════════════════════════════════════════
--  IQUEST — 0003: test va o'yin natijalari (FAQAT SERVER YOZADI)
--
--  ASOSIY TAMOYIL (CONTRACT.md §10): ball, liga va sertifikat faqat server
--  QAYTA HISOBLAGAN natijadan. Mijozdagi hamma narsani o'zgartirish mumkin
--  — APK ochiladi, so'rov qo'lda yuboriladi. Shuning uchun:
--
--    · mijoz test_results / game_results / item_responses ga YOZA OLMAYDI
--      (na INSERT huquqi, na siyosati bor);
--    · qurilmadagi test/o'yin: mijoz jurnalni (urug' + javoblar) Edge
--      Function'ga yuboradi (submit-test, submit-game); funksiya savollarni
--      AYNI dvigatel kodi bilan qayta yaratadi, ballni qayta hisoblaydi va
--      service_role bilan 0006_record.sql dagi funksiyani chaqiradi. Bu
--      natija shaxsiy tarix va liga ballari uchun — SERTIFIKAT BERMAYDI:
--      qurilmada to'g'ri javob (item.correct) xotirada turadi, devtools
--      bilan uni o'qigan odamning jurnali ham "to'g'ri" chiqadi;
--    · SERTIFIKATLI test butunlay serverda o'tadi (test-start/test-answer,
--      0006: test_sessions) — urug', tartib va vaqt serverda;
--    · foydalanuvchi faqat O'Z natijalarini o'qiydi.
--
--  Maxfiylik:
--    test_results — SHAXSIY ("taxminiy IQ" sezgir). Na boshqa foydalanuvchi,
--      na xodim API orqali ko'rmaydi. O'zgartirib va tanlab o'chirib
--      bo'lmaydi; hammasini o'chirish — delete_my_data().
--    item_responses — ANONIM (kalibrlash): user_id yo'q, vaqt — kun
--      aniqligida. Endi uni ham faqat server yozadi, TEKSHIRILGAN
--      jurnaldan — soxta javob bilan qiyinlikni surish yo'li yopiq.
-- ═══════════════════════════════════════════════════════════════════════


-- ═══ 1. TEST NATIJALARI ════════════════════════════════════════════════

/* byType ({ matrix: {n, correct}, … }) tekshirgichi. jsonb — "istalgan
   narsa" degani emas: cheklovsiz u axlat joylash yo'li bo'lardi. */
create function public.by_type_ok(j jsonb, total_n int, total_correct int)
returns boolean
language plpgsql immutable
set search_path = pg_catalog, pg_temp
as $$
declare
  k text;
  v jsonb;
  cnt int := 0;
  sum_n int := 0;
  sum_c int := 0;
  vn numeric;
  vc numeric;
begin
  if j is null or jsonb_typeof(j) <> 'object' or octet_length(j::text) > 1024 then
    return false;
  end if;
  for k, v in select * from jsonb_each(j) loop
    cnt := cnt + 1;
    if cnt > 8 or k !~ '^[a-z]{2,16}$' or jsonb_typeof(v) <> 'object' then
      return false;
    end if;
    if (select count(*) from jsonb_object_keys(v)) <> 2
       or jsonb_typeof(v -> 'n') is distinct from 'number'
       or jsonb_typeof(v -> 'correct') is distinct from 'number' then
      return false;
    end if;
    vn := (v ->> 'n')::numeric;
    vc := (v ->> 'correct')::numeric;
    if vn <> trunc(vn) or vc <> trunc(vc)
       or vn < 0 or vn > 200 or vc < 0 or vc > vn then
      return false;
    end if;
    sum_n := sum_n + vn::int;
    sum_c := sum_c + vc::int;
  end loop;
  return sum_n <= total_n and sum_c <= total_correct;
end;
$$;

create table public.test_results (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  /* Mijoz yaratgan tasodifiy id: tarmoq uzilib qayta yuborilsa ikkinchi
     nusxa bo'lmaydi. */
  client_id    uuid not null,
  -- Dvigatel versiyasi: generator o'zgarsa eski urug' boshqa savol beradi.
  engine       text not null constraint results_engine check (engine ~ '^[A-Za-z0-9._-]{1,40}$'),
  seed         bigint not null constraint results_seed check (seed between 0 and 4294967295),
  /* Test SERVERDA o'tkazilgan (test_sessions): urug' mijozga
     ko'rsatilmagan, savollar javobsiz berilgan, vaqtni server o'lchagan.
     Sertifikat va IQ reytingi FAQAT shunday natijadan. */
  certified    boolean not null default false,
  mode         text not null constraint results_mode check (mode in ('test', 'practice')),
  iq           smallint not null constraint results_iq_range check (iq between 55 and 145),
  lo           smallint not null constraint results_lo_range check (lo between 55 and 145),
  hi           smallint not null constraint results_hi_range check (hi between 55 and 145),
  theta        double precision not null constraint results_theta_range check (theta between -8 and 8),
  se           double precision not null constraint results_se_range check (se > 0 and se <= 2),
  n            smallint not null constraint results_n_range check (n between 1 and 200),
  correct      smallint not null,
  reliable     boolean not null,
  by_type      jsonb not null,
  duration_ms  integer not null constraint results_duration_range check (duration_ms between 0 and 86400000),
  /* Server tekshiruvi shubhali deb topdi (masalan g'ayritabiiy tez
     javoblar): natija tarixda qoladi, lekin ball, sertifikat va reyting
     bermaydi. */
  suspicious   boolean not null default false,
  points       integer not null default 0 constraint results_points_range check (points between 0 and 1000),
  created_at   timestamptz not null default now(),

  constraint results_correct_range check (correct between 0 and n),
  constraint results_interval check (lo <= iq and iq <= hi),
  constraint results_by_type_valid check (public.by_type_ok(by_type, n, correct)),
  constraint results_client_unique unique (user_id, client_id),
  -- Bitta urug' bitta foydalanuvchida bir marta: qayta yuborib ball
  -- yig'ish yo'q.
  constraint results_seed_once unique (user_id, mode, seed)
);

create index test_results_user_idx on public.test_results (user_id, created_at desc);
create index test_results_board_idx on public.test_results (user_id, iq desc)
  where mode = 'test' and reliable and certified and not suspicious;

comment on table public.test_results is
  'Server tekshirgan test natijalari. Faqat egasi o''qiydi; yozish faqat '
  'record_test_result() (service_role, Edge Function) orqali.';


-- ═══ 3. O'YIN NATIJALARI ═══════════════════════════════════════════════
create table public.game_results (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  client_id    uuid not null,
  engine       text not null constraint games_engine check (engine ~ '^[A-Za-z0-9._-]{1,40}$'),
  game         text not null constraint games_id check (game ~ '^[a-z][a-z0-9-]{1,31}$'),
  level        smallint not null constraint games_level check (level between 1 and 10),
  seed         bigint not null constraint games_seed check (seed between 0 and 4294967295),
  score        integer not null constraint games_score check (score between -1000000 and 1000000),
  points       integer not null constraint games_points check (points between 0 and 1000),
  correct      integer not null,
  total        integer not null,
  duration_ms  integer not null constraint games_duration check (duration_ms between 0 and 3600000),
  suspicious   boolean not null default false,
  created_at   timestamptz not null default now(),
  constraint games_counts check (correct >= 0 and total >= 0 and correct <= total and total <= 10000),
  constraint games_client_unique unique (user_id, client_id),
  constraint games_seed_once unique (user_id, game, level, seed)
);

create index game_results_user_idx on public.game_results (user_id, created_at desc);


-- ═══ 4. SAVOL JAVOBLARI (KALIBRLASH, ANONIM) ═══════════════════════════
/* Kim yozadi: FAQAT server (0006), tekshirilgan jurnaldan yoki serverda
   o'tgan testdan, va foydalanuvchi rozilik bergan bo'lsa (calibrate). Oldingi
   rejada mijoz funksiya orqali yozardi — endi server natijani baribir
   qayta o'ynaydi, ya'ni javoblar unda ISHONCHLI holda bor; mijozga
   alohida yozish yo'lini ochishning keragi qolmadi. Kim o'qiydi: faqat
   auditor va owner. */
create table public.item_responses (
  session     uuid not null,
  seq         smallint not null constraint responses_seq_range check (seq between 0 and 199),
  item_id     text not null constraint responses_item_id_format
              check (char_length(item_id) <= 48
                     and item_id ~ '^[a-z]{2,16}:([1-9]|10):[A-Za-z0-9_-]{1,24}$'),
  type        text not null constraint responses_type_format check (type ~ '^[a-z]{2,16}$'),
  level       smallint not null constraint responses_level_range check (level between 1 and 10),
  b           real not null constraint responses_b_range check (b between -4 and 4),
  k           smallint constraint responses_k_range check (k between 2 and 8),
  correct     boolean not null,
  ms          integer not null constraint responses_ms_range check (ms between 0 and 600000),
  -- Vaqt faqat KUN aniqligida: soniyagacha vaqt belgisi javoblarni
  -- test_results bilan vaqt bo'yicha ulashga imkon berardi.
  created_on  date not null default current_date,
  primary key (session, seq),
  constraint responses_item_id_matches check (
    split_part(item_id, ':', 1) = type
    and split_part(item_id, ':', 2) = level::text)
);

create index item_responses_item_idx on public.item_responses (item_id);


-- ═══ 5. O'CHIRISH VA JURNAL ════════════════════════════════════════════

/* O'chirish jurnalga tushadi — QIYMATLARISIZ (faqat nechta va kimniki).
   IQ qiymatini jurnalga yozish uni auditor ko'radigan joyga ko'chirish
   bo'lardi. Xuddi shu sababdan natija QO'SHILISHI jurnalga yozilmaydi.
   Statement darajasida: hisob o'chirilganda (cascade) ham ishlaydi. */
create function public.audit_results_delete()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  cnt int;
  users jsonb;
begin
  select count(*), coalesce(jsonb_agg(distinct g.user_id), '[]'::jsonb)
    into cnt, users
    from gone g;
  if cnt > 0 then
    insert into public.audit_log (actor_id, actor_role, action, resource, after)
    values (auth.uid(), public.my_role(), tg_table_name || ' o''chirildi', tg_table_name,
            jsonb_build_object('count', cnt, 'users', users));
  end if;
  return null;
end;
$$;

create trigger audit_results_delete_trg
  after delete on public.test_results
  referencing old table as gone
  for each statement execute function public.audit_results_delete();

create trigger audit_games_delete_trg
  after delete on public.game_results
  referencing old table as gone
  for each statement execute function public.audit_results_delete();

/* "Ma'lumotimni o'chiring". DELETE siyosati emas, alohida funksiya:
   siyosat natijalarni BIRMA-BIR o'chirishga ruxsat berardi — odam yomon
   natijalarini tanlab o'chirib, o'sish grafigini va reytingni "chiroyli"
   qilib qo'yardi. Funksiya faqat HAMMASINI o'chiradi: test va o'yin
   natijalari, ularning sertifikatlari (cascade), server test sessiyalari
   va liga yozuvlari. Anonim kalibrlash javoblari qoladi — ularda kimniki ekanini
   ko'rsatadigan hech narsa yo'q. */
create function public.delete_my_data()
returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  n_tests int;
  n_games int;
begin
  if uid is null then
    raise exception 'tizimga kirish kerak' using errcode = '42501';
  end if;
  delete from public.test_results where user_id = uid;
  get diagnostics n_tests = row_count;
  delete from public.game_results where user_id = uid;
  get diagnostics n_games = row_count;
  delete from public.test_sessions where user_id = uid;
  -- Liga (0004) va sessiya (0006) jadvallari keyinroq yaratiladi — plpgsql
  -- nomlarni chaqirilgan paytda hal qiladi.
  delete from public.league_members where user_id = uid;
  delete from public.league_results where user_id = uid;
  delete from public.league_state where user_id = uid;
  return jsonb_build_object('tests', n_tests, 'games', n_games);
end;
$$;


-- ═══ 6. RLS VA HUQUQLAR ════════════════════════════════════════════════

alter table public.test_results   enable row level security;
alter table public.game_results   enable row level security;
alter table public.item_responses enable row level security;

-- Faqat o'zi o'qiydi. INSERT/UPDATE/DELETE siyosati YO'Q — yozish faqat
-- service_role (Edge Function) orqali; xodimlar uchun o'qish ham yo'q.
create policy results_self_read on public.test_results
  for select to authenticated
  using (user_id = auth.uid());

create policy games_self_read on public.game_results
  for select to authenticated
  using (user_id = auth.uid());

create policy responses_staff_read on public.item_responses
  for select to authenticated
  using (public.has_role(array['auditor','owner']::public.app_role[]));

revoke all on public.test_results   from anon, authenticated;
revoke all on public.game_results   from anon, authenticated;
revoke all on public.item_responses from anon, authenticated;
grant select on public.test_results   to authenticated;
grant select on public.game_results   to authenticated;
grant select on public.item_responses to authenticated;

-- Funksiyalar: PostgreSQL EXECUTE'ni standart holatda hammaga (PUBLIC)
-- beradi, Supabase esa anon'ga alohida. Ikkalasidan ham olinadi.
revoke all on function public.delete_my_data() from public, anon, authenticated;
grant execute on function public.delete_my_data() to authenticated;
