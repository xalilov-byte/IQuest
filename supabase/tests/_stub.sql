-- ═══════════════════════════════════════════════════════════════════════
--  Supabase'ga xos qismlarning LOKAL TAQLIDI (faqat sinov uchun)
--
--  Supabase'da bular allaqachon bor. Bu fayl lokal PostgreSQL'ni
--  Supabase'ga iloji boricha YAQIN qiladi — ayniqsa huquqlar bo'yicha.
--
--  ENG MUHIM JOY — pastdagi "default privileges". Supabase public
--  sxemasida yaratilgan HAR BIR jadval, funksiya va ketma-ketlikka anon
--  va authenticated rollariga TO'LIQ huquq beradi. Nazariy'dagi taqlid
--  bundan qattiqroq edi (anon'ga faqat SELECT) — bunday taqlidda
--  "anon yoza olmaydi" degan test RLS tufayli emas, taqlidning o'zi
--  tufayli o'tardi, haqiqiy Supabase'da esa teshik ochiq qolardi.
--  Shuning uchun bu yerda Supabase'dagi (eng yomon) holat taqlid
--  qilinadi va migratsiyalar kerakli huquqni o'zi aniq beradi/oladi.
-- ═══════════════════════════════════════════════════════════════════════

create schema if not exists auth;

-- Testlar shu belgini tekshiradi: ular auth.users ga sinov foydalanuvchi
-- yozadi, shuning uchun HAQIQIY bazada tasodifan ishga tushib qolmasligi
-- kerak (har test faylining boshiga qarang).
comment on schema auth is 'zukko-local-stub';

create table if not exists auth.users (
  id                  uuid primary key default gen_random_uuid(),
  email               text,
  raw_user_meta_data  jsonb default '{}'::jsonb,
  created_at          timestamptz default now()
);

-- Supabase'da auth.uid() JWT'dagi "sub" ni o'qiydi. Lokal sinovda uni
-- sessiya sozlamasi bilan taqlid qilamiz: set request.jwt.claim.sub = '…'
create or replace function auth.uid()
returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

-- auth.jwt() — butun da'volar to'plami. Supabase'dagi kabi
-- request.jwt.claims dan o'qiladi (masalan {"is_anonymous": true}).
create or replace function auth.jwt()
returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
$$;

-- Supabase rollari
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  -- Edge Function shu rol bilan yozadi (Supabase'da ham BYPASSRLS).
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;

-- Supabase'ning standart huquqlari (eng yomon holat — yuqoridagi izoh).
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
