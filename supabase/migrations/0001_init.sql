-- ═══════════════════════════════════════════════════════════════════════
--  NAZARIY — 0001: poydevor (hisoblar, savollar bazasi, audit)
--
--  Qanday ishga tushiriladi:
--    Supabase → SQL Editor → shu faylni butunlay nusxalab qo'yib "Run".
--    Migratsiya IDEMPOTENT emas — bir marta ishga tushiriladi. Qaytadan
--    kerak bo'lsa avval 0000_reset.sql (pastda izoh) bilan tozalanadi.
--
--  ENG MUHIM NARSA — RLS.
--  Klient (APK, sayt, Telegram) "publishable" kalit bilan ishlaydi va u
--  kalit hammaga ko'rinadi: mobil ilovadan kalitni yashirib bo'lmaydi.
--  Ya'ni ma'lumotni kalit emas, FAQAT RLS himoya qiladi. Shuning uchun
--  bu yerda har bir jadvalda RLS yoqilgan va standart holat "hech kimga
--  ruxsat yo'q" — ruxsatlar esa aniq siyosat bilan beriladi.
--
--  Ikki qoida dizaynda ataylab o'ylab qo'yilgan va shu yerda MAJBURLANADI
--  (klientga ishonilmaydi):
--    1. "To'rt ko'z" — javob kaliti o'zgarsa savol ko'rib chiqishga
--       qaytadi va o'zgartirgan odam o'zi tasdiqlay OLMAYDI.
--    2. "Jurnalga tushmaydigan o'zgarish bo'lmaydi" — audit yozuvini
--       trigger yozadi, klient emas.
-- ═══════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Rollar ─────────────────────────────────────────────────────────────
-- Dizayndagi ROLES bilan bir xil: egasi, moderator, qo'llab-quvvatlash,
-- auditor. "user" — oddiy foydalanuvchi (standart).
create type public.app_role as enum ('user', 'support', 'moderator', 'auditor', 'owner');

create type public.question_state as enum ('draft', 'review', 'published', 'archived');


-- ═══ 1. HISOBLAR ═══════════════════════════════════════════════════════

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  tg_id         bigint unique,          -- Telegram foydalanuvchi id
  phone         text unique,
  name          text,
  username      text,
  avatar_url    text,
  role          public.app_role not null default 'user',
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz
);

comment on table public.profiles is
  'Foydalanuvchi profili. auth.users bilan 1:1. Telegram va telefon bir '
  'qatorda turadi — bir odam ikki yo''l bilan kirsa ham bitta hisob bo''ladi.';

-- Yangi foydalanuvchi ro'yxatdan o'tsa profil o'zi yaraladi.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, username, avatar_url, tg_id)
  values (
    new.id,
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'avatar_url',
    nullif(new.raw_user_meta_data ->> 'tg_id', '')::bigint
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ── Rol tekshirgich ────────────────────────────────────────────────────
-- SECURITY DEFINER ataylab: bu funksiya profiles'dan o'qiydi, profiles
-- siyosati esa shu funksiyani chaqiradi. Oddiy funksiya bo'lsa cheksiz
-- rekursiya bo'lardi; definer esa RLS'ni chetlab o'tadi.
create or replace function public.has_role(roles public.app_role[])
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = any(roles)
  );
$$;

create or replace function public.my_role()
returns public.app_role
language sql stable
security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;


-- ═══ 2. SAVOLLAR BAZASI ════════════════════════════════════════════════

create table public.topics (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table public.questions (
  id              uuid primary key default gen_random_uuid(),
  -- Inson o'qiy oladigan raqam (#142) — admin panelda va jurnalda
  -- ishlatiladi. uuid'dan farqli, uni og'zaki aytish mumkin.
  ref             text unique,
  topic_id        uuid not null references public.topics (id) on delete restrict,
  text            text not null,
  options         text[] not null,
  correct         smallint not null,
  explain         text,
  -- Yo'l belgisi kaliti (priority, noentry, warning…). Bo'lsa — savol
  -- "Yo'l belgilari" rejimiga tushadi.
  sign            text,
  state           public.question_state not null default 'draft',
  author_id       uuid references public.profiles (id),
  updated_by      uuid references public.profiles (id),
  reviewed_by     uuid references public.profiles (id),
  key_changed_at  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint questions_options_four  check (array_length(options, 1) = 4),
  constraint questions_correct_range check (correct between 0 and 3),
  -- Juda qisqa savol — deyarli har doim yarim yozilgan savol.
  constraint questions_text_min      check (char_length(text) >= 15)
);

create index questions_state_idx on public.questions (state);
create index questions_topic_idx on public.questions (topic_id);
create index questions_sign_idx  on public.questions (sign) where sign is not null;

-- Rus tilidagi variant. O'zbek kirill KERAK EMAS — u transliteratsiya
-- bilan klientda hosil qilinadi (src/i18n.js), ya'ni saqlanmaydi.
create table public.question_translations (
  question_id  uuid not null references public.questions (id) on delete cascade,
  lang         text not null check (lang in ('ru')),
  text         text not null,
  options      text[] not null,
  explain      text,
  updated_at   timestamptz not null default now(),
  primary key (question_id, lang),
  constraint qt_options_four check (array_length(options, 1) = 4)
);


-- ── "To'rt ko'z" qoidasi ───────────────────────────────────────────────
-- Nima uchun bu yerda, klientda emas: noto'g'ri javob kaliti imtihonga
-- tayyorlanayotgan odam uchun eng og'ir zarar. Klient kodini chetlab
-- o'tish mumkin (API'ga qo'lda so'rov), bazani esa yo'q.
create or replace function public.questions_guard()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);

  if tg_op = 'UPDATE' then
    -- Javob kaliti o'zgardi → majburan ko'rib chiqishga qaytadi.
    if new.correct is distinct from old.correct then
      new.state := 'review';
      new.key_changed_at := now();
      new.reviewed_by := null;
    end if;

    -- Nashr etish: oxirgi tahrir qilgan odam o'zi tasdiqlay olmaydi.
    if new.state = 'published' and old.state <> 'published' then
      if auth.uid() is null then
        raise exception 'nashr etish uchun tizimga kirgan foydalanuvchi kerak';
      end if;
      if old.updated_by is not null and auth.uid() = old.updated_by then
        raise exception
          'to''rt ko''z qoidasi: o''zingiz kiritgan o''zgarishni o''zingiz nashr eta olmaysiz';
      end if;
      new.reviewed_by := auth.uid();
    end if;
  end if;

  return new;
end;
$$;

create trigger questions_guard_trg
  before insert or update on public.questions
  for each row execute function public.questions_guard();


-- ═══ 3. KONTENT PAKETI ═════════════════════════════════════════════════
-- Offline ishlash uchun: nashr etilgan savollar versiyalangan paketga
-- yig'iladi, klient uni bir marta yuklab olib qurilmada saqlaydi.
-- Paket yig'uvchi keyingi qadamda (REJA.md Faza 2) qo'shiladi.

create table public.question_packs (
  id              uuid primary key default gen_random_uuid(),
  version         int unique not null,
  question_count  int not null default 0,
  checksum        text,
  published_by    uuid references public.profiles (id),
  published_at    timestamptz not null default now()
);

create table public.pack_questions (
  pack_id      uuid not null references public.question_packs (id) on delete cascade,
  question_id  uuid not null references public.questions (id) on delete restrict,
  primary key (pack_id, question_id)
);


-- ═══ 4. AUDIT JURNALI ══════════════════════════════════════════════════
-- Dizayn qoidasi: "jurnalga tushmaydigan o'zgarish bo'lmasligi kerak".
-- Shuning uchun yozuvni TRIGGER qo'yadi — klient jurnalni chetlab o'ta
-- olmaydi va o'chira ham olmaydi (UPDATE/DELETE siyosati yo'q).

create table public.audit_log (
  id           bigserial primary key,
  actor_id     uuid references public.profiles (id),
  actor_role   public.app_role,
  action       text not null,
  resource     text,
  before       jsonb,
  after        jsonb,
  reason_code  text,
  created_at   timestamptz not null default now()
);

create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_actor_idx   on public.audit_log (actor_id);

create or replace function public.audit_questions()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  act text;
begin
  if tg_op = 'INSERT' then
    act := 'savol yaratildi';
  elsif tg_op = 'DELETE' then
    act := 'savol o''chirildi';
  elsif new.correct is distinct from old.correct then
    act := 'javob kaliti o''zgartirildi';
  elsif new.state is distinct from old.state then
    act := 'savol holati: ' || old.state || ' → ' || new.state;
  else
    act := 'savol tahrirlandi';
  end if;

  insert into public.audit_log (actor_id, actor_role, action, resource, before, after)
  values (
    auth.uid(),
    public.my_role(),
    act,
    coalesce(new.ref, old.ref, coalesce(new.id, old.id)::text),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_questions_trg
  after insert or update or delete on public.questions
  for each row execute function public.audit_questions();


-- ═══ 5. RLS — barcha jadvalda ══════════════════════════════════════════
-- RLS yoqilgan, lekin siyosat berilmagan jadval = hech kim o'qiy ham,
-- yoza ham olmaydi. Quyida faqat kerakli teshiklar ochiladi.

alter table public.profiles              enable row level security;
alter table public.topics                enable row level security;
alter table public.questions             enable row level security;
alter table public.question_translations enable row level security;
alter table public.question_packs        enable row level security;
alter table public.pack_questions        enable row level security;
alter table public.audit_log             enable row level security;

-- ── profiles ──
-- Har kim faqat o'z qatorini ko'radi va tahrirlaydi. Rolni o'zgartirish
-- taqiqlanadi (aks holda har kim o'zini "owner" qilib qo'yardi).
create policy profiles_self_read on public.profiles
  for select using (id = auth.uid());

create policy profiles_self_update on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = public.my_role());

create policy profiles_staff_read on public.profiles
  for select using (public.has_role(array['support','moderator','auditor','owner']::public.app_role[]));

-- Rolni faqat egasi o'zgartiradi.
create policy profiles_owner_write on public.profiles
  for update using (public.has_role(array['owner']::public.app_role[]));

-- ── topics: hammaga o'qish (kirmagan foydalanuvchiga ham) ──
-- Mavzu nomlari maxfiy emas va ilova birinchi ochilishda ularga muhtoj.
create policy topics_public_read on public.topics
  for select using (true);

create policy topics_staff_write on public.topics
  for all using (public.has_role(array['moderator','owner']::public.app_role[]))
  with check (public.has_role(array['moderator','owner']::public.app_role[]));

-- ── questions ──
-- Ommaga FAQAT nashr etilgan savollar. Qoralama va ko'rib chiqishdagi
-- savollar tashqariga chiqmaydi: yarim yozilgan yoki kaliti shubhali
-- savol foydalanuvchini chalg'itadi.
create policy questions_public_read on public.questions
  for select using (state = 'published');

create policy questions_staff_read on public.questions
  for select using (public.has_role(array['moderator','auditor','owner']::public.app_role[]));

create policy questions_staff_insert on public.questions
  for insert with check (public.has_role(array['moderator','owner']::public.app_role[]));

create policy questions_staff_update on public.questions
  for update using (public.has_role(array['moderator','owner']::public.app_role[]))
  with check (public.has_role(array['moderator','owner']::public.app_role[]));

-- O'chirish YO'Q: savol arxivlanadi (state='archived'), o'chirilmaydi.
-- Sabab — o'chirilgan savol statistikani (DIF/DIS) ham olib ketadi.

-- ── question_translations: asosiy savol ko'rinsa, tarjimasi ham ──
create policy qt_public_read on public.question_translations
  for select using (exists (
    select 1 from public.questions q
    where q.id = question_id and q.state = 'published'
  ));

create policy qt_staff_all on public.question_translations
  for all using (public.has_role(array['moderator','owner']::public.app_role[]))
  with check (public.has_role(array['moderator','owner']::public.app_role[]));

-- ── paketlar: hammaga o'qish ──
create policy packs_public_read on public.question_packs
  for select using (true);

create policy pack_questions_public_read on public.pack_questions
  for select using (true);

create policy packs_staff_write on public.question_packs
  for all using (public.has_role(array['moderator','owner']::public.app_role[]))
  with check (public.has_role(array['moderator','owner']::public.app_role[]));

create policy pack_questions_staff_write on public.pack_questions
  for all using (public.has_role(array['moderator','owner']::public.app_role[]))
  with check (public.has_role(array['moderator','owner']::public.app_role[]));

-- ── audit_log: faqat o'qish, faqat auditor va egasi ──
-- INSERT siyosati YO'Q — yozuvni faqat trigger (security definer)
-- qo'yadi. UPDATE/DELETE siyosati ham YO'Q — jurnal o'zgartirilmaydi.
create policy audit_read on public.audit_log
  for select using (public.has_role(array['auditor','owner']::public.app_role[]));


-- ═══ 6. Qulaylik: nashr etilgan savollar ko'rinishi ════════════════════
-- Klient shu ko'rinishdan o'qiydi: mavzu nomi bilan birga, faqat
-- kerakli ustunlar. Ichki maydonlar (author_id, updated_by…) chiqmaydi.
create view public.published_questions
with (security_invoker = true) as
  select q.id, q.ref, q.text, q.options, q.correct, q.explain, q.sign,
         t.slug as topic_slug, t.name as topic_name, t.sort_order,
         q.updated_at
  from public.questions q
  join public.topics t on t.id = q.topic_id
  where q.state = 'published';

comment on view public.published_questions is
  'Klient uchun savollar. security_invoker=true — RLS chaqiruvchi '
  'huquqi bilan qo''llanadi, ya''ni ko''rinish RLS''ni chetlab o''tmaydi.';


-- ═══════════════════════════════════════════════════════════════════════
--  TOZALASH (kerak bo'lsa — EHTIYOT BO'LING, hammasini o'chiradi):
--
--    drop view if exists public.published_questions;
--    drop table if exists public.audit_log, public.pack_questions,
--      public.question_packs, public.question_translations,
--      public.questions, public.topics, public.profiles cascade;
--    drop function if exists public.has_role, public.my_role,
--      public.questions_guard, public.audit_questions,
--      public.handle_new_user cascade;
--    drop type if exists public.question_state, public.app_role;
--    drop trigger if exists on_auth_user_created on auth.users;
-- ═══════════════════════════════════════════════════════════════════════
