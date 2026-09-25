-- ═══════════════════════════════════════════════════════════════════════
--  IQUEST — 0004: haftalik liga va reyting
--
--  Liga — FAOLLIK ballari bo'yicha (CONTRACT §6.7): har hafta foydalanuvchi
--  o'z darajasidagi (Bronza → Kumush → Oltin → Platina → Olmos) ~30
--  kishilik guruhga tushadi; hafta oxirida guruhdagi eng yaxshi 20% bir
--  daraja ko'tariladi, eng pasti 20% tushadi. Ballni FAQAT server beradi
--  (record_test_result / record_game_result, 0006) — mijoz liga
--  jadvallariga yoza olmaydi.
--
--  Reyting — ikki xil: eng yaxshi TEKSHIRILGAN IQuest balli (oraliq bilan,
--  §6.1) va jami ball. IQ reytingida faqat ROZILIK BERGANLAR
--  (profiles.show_on_leaderboard): ism yonida IQ bahosini hammaga ochish
--  standart holat bo'lmasligi kerak.
--
--  NIMA UCHUN KO'RINISH (VIEW) EMAS, FUNKSIYA: guruhdagi boshqa odamning
--  ismini ko'rsatish uchun profiles'ni o'qish kerak, profiles RLS'i esa
--  (to'g'ri) faqat o'zini ko'rsatadi. security_invoker ko'rinish boshqa
--  ismni ko'ra olmaydi; RLS'ni chetlab o'tadigan (definer) ko'rinish esa
--  jadvalning HAMMA ustunini ochib qo'yish xavfini tug'diradi va apply.sh
--  uni taqiqlaydi. Definer FUNKSIYA qaytaradigan ustunlarni aniq sanab
--  beradi: rank, ism, avatar, ball — boshqa hech narsa (user_id ham emas).
-- ═══════════════════════════════════════════════════════════════════════

create type public.league_tier as enum ('bronza', 'kumush', 'oltin', 'platina', 'olmos');

-- Hafta — Toshkent vaqti bilan dushanbadan boshlanadi.
create function public.league_week(ts timestamptz default now())
returns date
language sql stable
set search_path = pg_catalog, pg_temp
as $$
  select date_trunc('week', ts at time zone 'Asia/Tashkent')::date;
$$;

-- Foydalanuvchining joriy darajasi (yangi o'yinchi — bronza).
create table public.league_state (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  tier        public.league_tier not null default 'bronza',
  updated_at  timestamptz not null default now()
);

create table public.league_members (
  week       date not null constraint league_week_monday check (extract(isodow from week) = 1),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  tier       public.league_tier not null,
  grp        integer not null constraint league_grp check (grp >= 1),
  points     integer not null default 0 constraint league_points check (points >= 0),
  joined_at  timestamptz not null default now(),
  primary key (week, user_id)
);

create index league_members_group_idx on public.league_members (week, tier, grp);

create table public.league_results (
  week     date not null,
  user_id  uuid not null references public.profiles (id) on delete cascade,
  tier     public.league_tier not null,
  grp      integer not null,
  rank     integer not null,
  points   integer not null,
  outcome  text not null constraint league_outcome check (outcome in ('up', 'stay', 'down')),
  primary key (week, user_id)
);

create table public.league_closed (
  week       date primary key,
  closed_at  timestamptz not null default now(),
  members    integer not null
);

-- Guruh hajmi va zona ulushi — bitta joyda.
create function public.league_group_size() returns int
language sql immutable set search_path = pg_catalog, pg_temp as $$ select 30 $$;


/* Ball qo'shish (faqat record_* funksiyalaridan). Birinchi ball — haftaga
   qo'shilish: o'z darajasidagi 30 dan kam kishilik guruhga, bo'lmasa
   yangi guruhga. Guruh tanlash advisory lock bilan ketma-ket: ikki kishi
   bir vaqtda qo'shilsa guruh 31 kishi bo'lib qolmasin. */
create function public.league_add_points(p_user uuid, p_points int)
returns void
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  w date := public.league_week();
  t public.league_tier;
  g int;
begin
  if p_points is null or p_points <= 0 then
    return;
  end if;
  update public.league_members set points = points + p_points
   where week = w and user_id = p_user;
  if found then
    return;
  end if;

  select tier into t from public.league_state where user_id = p_user;
  t := coalesce(t, 'bronza');
  perform pg_advisory_xact_lock(hashtext('iquest-liga'), hashtext(w::text || ':' || t::text));

  select m.grp into g
    from public.league_members m
   where m.week = w and m.tier = t
   group by m.grp
  having count(*) < public.league_group_size()
   order by m.grp
   limit 1;
  if g is null then
    select coalesce(max(m.grp), 0) + 1 into g
      from public.league_members m where m.week = w and m.tier = t;
  end if;

  insert into public.league_members (week, user_id, tier, grp, points)
  values (w, p_user, t, g, p_points)
  on conflict (week, user_id) do update set points = public.league_members.points + excluded.points;
end;
$$;


/* Haftani yopish: ko'tarilish va tushish. pg_cron yoki Edge Function
   (service_role) chaqiradi — supabase/cron.sql. Idempotent: yopilgan
   hafta qayta yopilmaydi. Joriy yoki kelajakdagi haftani yopib bo'lmaydi
   (o'yin hali davom etyapti).

   Har guruhda: o'rin — ball kamayishi bo'yicha, teng ballda kim oldin
   qo'shilgan. Yuqori ceil(n·20%) ko'tariladi (ball > 0 va daraja < Olmos),
   pastki floor(n·20%) tushadi (daraja > Bronza). 30 kishilik guruhda —
   6 va 6. Bitta kishilik guruh: ball bo'lsa ko'tariladi, tushmaydi. */
create function public.league_close_week(p_week date)
returns integer
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  n int;
  tiers public.league_tier[] := enum_range(null::public.league_tier);
begin
  if p_week is null or extract(isodow from p_week) <> 1 then
    raise exception 'hafta dushanba sanasi bilan beriladi: %', p_week;
  end if;
  if p_week >= public.league_week() then
    raise exception 'joriy yoki kelajakdagi haftani yopib bo''lmaydi: %', p_week;
  end if;
  perform pg_advisory_xact_lock(hashtext('iquest-liga-yopish'), hashtext(p_week::text));
  if exists (select 1 from public.league_closed where week = p_week) then
    return 0;
  end if;

  with ranked as (
    select m.*,
           row_number() over (partition by m.tier, m.grp order by m.points desc, m.joined_at, m.user_id) as rnk,
           count(*)     over (partition by m.tier, m.grp) as size
      from public.league_members m
     where m.week = p_week
  )
  insert into public.league_results (week, user_id, tier, grp, rank, points, outcome)
  select r.week, r.user_id, r.tier, r.grp, r.rnk, r.points,
         case
           when r.rnk <= ceil(r.size * 0.2) and r.points > 0 and r.tier <> 'olmos' then 'up'
           when r.rnk > r.size - floor(r.size * 0.2) and r.tier <> 'bronza' then 'down'
           else 'stay'
         end
    from ranked r;
  get diagnostics n = row_count;

  insert into public.league_state as s (user_id, tier, updated_at)
  select lr.user_id,
         case lr.outcome
           when 'up'   then tiers[array_position(tiers, lr.tier) + 1]
           when 'down' then tiers[array_position(tiers, lr.tier) - 1]
           else lr.tier
         end,
         now()
    from public.league_results lr
   where lr.week = p_week
  on conflict (user_id) do update set tier = excluded.tier, updated_at = excluded.updated_at;

  insert into public.league_closed (week, members) values (p_week, n);
  insert into public.audit_log (actor_id, actor_role, action, resource, after)
  values (auth.uid(), public.my_role(), 'liga haftasi yopildi', 'league:' || p_week,
          jsonb_build_object('members', n));
  return n;
end;
$$;


-- ── Ko'rsatiladigan maydonlar ──────────────────────────────────────────
create function public.display_name(p public.profiles)
returns text
language sql stable
set search_path = pg_catalog, pg_temp
as $$
  select coalesce(nullif(btrim(p.name), ''), 'IQuest o''yinchisi');
$$;

/* Mening liga guruhim (joriy hafta). Faqat tizimga kirgan va faqat O'Z
   guruhi. Qaytaradi: o'rin, ism, avatar, ball, daraja, "bu menman" —
   boshqa hech narsa. */
create function public.league_board()
returns table (rank integer, display_name text, avatar_url text, points integer,
               tier public.league_tier, is_me boolean)
language plpgsql stable
security definer set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  me record;
begin
  if uid is null then
    raise exception 'tizimga kirish kerak' using errcode = '42501';
  end if;
  select m.week, m.tier, m.grp into me
    from public.league_members m
   where m.week = public.league_week() and m.user_id = uid;
  if me.week is null then
    return;   -- bu hafta hali ball yo'q — guruh ham yo'q
  end if;
  return query
    select (row_number() over (order by m.points desc, m.joined_at, m.user_id))::int,
           public.display_name(p), p.avatar_url, m.points, m.tier, m.user_id = uid
      from public.league_members m
      join public.profiles p on p.id = m.user_id
     where m.week = me.week and m.tier = me.tier and m.grp = me.grp
     order by 1;
end;
$$;

/* Umumiy reyting. Hammaga ochiq (sayt sahifasi ham), lekin faqat
   show_on_leaderboard = true bo'lganlar.
     'iq'     — eng yaxshi SERTIFIKATLI natija: serverda o'tgan test
                (certified), reliable, shubhasiz. IQ har doim ORALIQ bilan
                (lo, hi) — ilova "taxminiy" deb, oraliq bilan ko'rsatadi.
     'points' — jami ball (test + o'yin). */
create function public.leaderboard(p_kind text, p_limit int default 50)
returns table (rank integer, display_name text, avatar_url text, value integer,
               iq integer, lo integer, hi integer, is_me boolean)
language plpgsql stable
security definer set search_path = public, pg_temp
as $$
declare
  lim int := least(greatest(coalesce(p_limit, 50), 1), 100);
  uid uuid := auth.uid();
begin
  if p_kind = 'iq' then
    return query
      with best as (
        select distinct on (r.user_id) r.user_id, r.iq, r.lo, r.hi, r.created_at
          from public.test_results r
         where r.mode = 'test' and r.reliable and r.certified and not r.suspicious
         order by r.user_id, r.iq desc, r.lo desc, r.created_at
      )
      select (row_number() over (order by b.iq desc, b.lo desc, b.created_at))::int,
             public.display_name(p), p.avatar_url, b.iq::int, b.iq::int, b.lo::int, b.hi::int,
             coalesce(b.user_id = uid, false)
        from best b
        join public.profiles p on p.id = b.user_id
       where p.show_on_leaderboard
       order by 1
       limit lim;
  elsif p_kind = 'points' then
    return query
      with tot as (
        select x.user_id, sum(x.points)::int as pts, min(x.created_at) as first_at
          from (select user_id, points, created_at from public.test_results
                union all
                select user_id, points, created_at from public.game_results) x
         group by x.user_id
        having sum(x.points) > 0
      )
      select (row_number() over (order by t.pts desc, t.first_at))::int,
             public.display_name(p), p.avatar_url, t.pts, null::int, null::int, null::int,
             coalesce(t.user_id = uid, false)
        from tot t
        join public.profiles p on p.id = t.user_id
       where p.show_on_leaderboard
       order by 1
       limit lim;
  else
    raise exception 'reyting turi: iq | points' using errcode = '22023';
  end if;
end;
$$;


-- ═══ RLS VA HUQUQLAR ═══════════════════════════════════════════════════
alter table public.league_state   enable row level security;
alter table public.league_members enable row level security;
alter table public.league_results enable row level security;
alter table public.league_closed  enable row level security;

-- O'z yozuvlarini ko'radi (daraja tarixi). Boshqalarniki — faqat
-- league_board() orqali, faqat ko'rsatiladigan maydonlar.
create policy league_state_self on public.league_state
  for select to authenticated using (user_id = auth.uid());
create policy league_members_self on public.league_members
  for select to authenticated using (user_id = auth.uid());
create policy league_results_self on public.league_results
  for select to authenticated using (user_id = auth.uid());

revoke all on public.league_state   from anon, authenticated;
revoke all on public.league_members from anon, authenticated;
revoke all on public.league_results from anon, authenticated;
revoke all on public.league_closed  from anon, authenticated;
grant select on public.league_state, public.league_members, public.league_results to authenticated;

revoke all on function public.league_add_points(uuid, int) from public, anon, authenticated;
revoke all on function public.league_close_week(date)      from public, anon, authenticated;
revoke all on function public.league_board()               from public, anon, authenticated;
revoke all on function public.leaderboard(text, int)       from public, anon, authenticated;
grant execute on function public.league_close_week(date) to service_role;
grant execute on function public.league_board()          to authenticated;
grant execute on function public.leaderboard(text, int)  to anon, authenticated;
