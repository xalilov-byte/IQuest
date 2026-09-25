-- ═══════════════════════════════════════════════════════════════════════
--  ZUKKO — 0001: poydevor (hisoblar, rollar, audit jurnali)
--
--  Bu YANGI baza: Nazariy'dan faqat isbotlangan naqshlar olindi, uning
--  jadvallari (topics, questions…) yo'q. Qo'llash: supabase/apply.sh —
--  u har faylni BITTA tranzaksiyada ishga tushiradi, shuning uchun bu
--  yerda begin/commit yo'q (yarim qo'llangan migratsiya bo'lmaydi).
--
--  ENG MUHIM NARSA — RLS. Klient (APK, sayt) "publishable" kalit bilan
--  ishlaydi va u kalit hammaga ko'rinadi: APK'ni ochgan odam uni topadi.
--  Ya'ni ma'lumotni kalit emas, faqat BAZANING O'ZI himoya qiladi:
--    · har jadvalda RLS yoqilgan, standart holat — hech kimga ruxsat yo'q;
--    · huquqlar (GRANT) ham aniq beriladi: Supabase standart holatda
--      anon'ga HAMMA narsani beradi, shuning uchun avval hammasi olinadi,
--      keyin faqat kerakligi qaytariladi.
--  Har bir to'siq supabase/tests/ da haqiqiy hujum so'rovi bilan
--  tekshiriladi va supabase/tests/run.sh to'siq olib tashlanganda test
--  haqiqatan yiqilishini ham tekshiradi (mutantlar).
-- ═══════════════════════════════════════════════════════════════════════

-- ── Rollar ─────────────────────────────────────────────────────────────
-- user — oddiy foydalanuvchi (standart). Qolganlari — xodimlar:
--   support   — foydalanuvchiga yordam (profillarni ko'radi)
--   moderator — og'zaki savollarni yozadi, ko'rib chiqadi, nashr etadi
--   auditor   — hamma narsani O'QIYDI (jurnal, qoralamalar), yozmaydi
--   owner     — egasi, rollarni beradi
create type public.app_role as enum ('user', 'support', 'moderator', 'auditor', 'owner');


-- ═══ 1. HISOBLAR ═══════════════════════════════════════════════════════

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  /* Telegram id — kelajakda Telegram orqali kirish uchun. Uni FAQAT
     server (Telegram imzosini tekshirgan Edge Function, service kaliti
     bilan) yozadi. Klient yoza olsa, boshqa odamning Telegram hisobini
     o'ziga bog'lab olardi — pastdagi profiles_guard va handle_new_user. */
  tg_id       bigint unique,
  name        text constraint profiles_name_len check (char_length(name) <= 80),
  -- Faqat https: reyting va liga ro'yxatida chiziladi, http aralash kontent.
  avatar_url  text constraint profiles_avatar_url check (
                avatar_url is null or (char_length(avatar_url) <= 500 and avatar_url ~ '^https://')),
  /* Umumiy reytingda (taxminiy IQ bilan!) ko'rinish — faqat foydalanuvchi
     o'zi yoqsa. IQ bahosi sezgir ma'lumot: uni ism bilan hammaga ochish
     standart holat bo'lmasligi kerak. Liga guruhida esa faqat faollik
     ballari ko'rinadi (0004_league.sql). */
  show_on_leaderboard boolean not null default false,
  role        public.app_role not null default 'user',
  created_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Foydalanuvchi profili, auth.users bilan 1:1. Rol va tg_id ni klient '
  'o''zgartira olmaydi (profiles_guard).';


-- ── Rol tekshirgich ────────────────────────────────────────────────────
-- SECURITY DEFINER ataylab: bu funksiya profiles'dan o'qiydi, profiles
-- siyosati esa shu funksiyani chaqiradi. Oddiy funksiya bo'lsa cheksiz
-- rekursiya bo'lardi; definer esa RLS'ni chetlab o'tadi. search_path
-- qat'iy: definer funksiyada u bo'lmasa, chaqiruvchi o'z sxemasidagi
-- soxta "profiles" ni qo'yib natijani o'zgartira olardi.
create function public.has_role(roles public.app_role[])
returns boolean
language sql stable
security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = any(roles)
  );
$$;

create function public.my_role()
returns public.app_role
language sql stable
security definer set search_path = public, pg_temp
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Supabase "anonim kirish" (anonymous sign-in) yoqilsa, har kim bir
-- zumda cheksiz "authenticated" hisob ochadi — ya'ni "tizimga kirgan"
-- degani endi "kimdir" degani emas. Yozishga ruxsat beradigan joylar
-- (natija, kalibrlash javoblari) shu funksiya bilan anonim sessiyani
-- rad etadi. Loyiha sozlamasida anonim kirish O'CHIQ turishi kerak
-- (README), bu esa ikkinchi qatlam.
create function public.is_anonymous_user()
returns boolean
language sql stable
set search_path = public, pg_temp
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;


-- ── Yangi foydalanuvchi → profil ───────────────────────────────────────
/* raw_user_meta_data ni klient signUp() da O'ZI to'ldiradi. Shuning uchun
   undan faqat ko'rsatma ism olinadi (uzunligi cheklanib). role va tg_id
   hech qachon olinmaydi — Nazariy testlarida isbotlangan teshik:
     · role: har kim o'zini "owner" qilib ro'yxatdan o'tardi;
     · tg_id: boshqa odamning Telegram id'sini yozib (1) uning hisobini
       oldindan egallash yoki (2) unique kalit tufayli egasining
       ro'yxatdan o'tishini butunlay to'sish mumkin edi. */
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, left(nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), 80))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ── Profil qo'riqchisi ─────────────────────────────────────────────────
/* RLS "qaysi QATOR" ni tekshiradi, "qaysi USTUN" ni emas: o'z profilini
   tahrirlash huquqi bor odam uning HAR bir ustunini yoza oladi. Nazariy'da
   aynan shunday edi — foydalanuvchi o'z tg_id sini o'zgartira olardi.
   Shuning uchun ustun darajasidagi qoidalar trigger'da:
     · id, created_at — o'zgarmaydi;
     · tg_id — faqat server (auth.uid() null: service kaliti yoki bazaga
       to'g'ridan-to'g'ri ulanish);
     · role — faqat egasi (owner).
   auth.uid() null istisnosi: bunday ulanishi bor odam baribir hamma
   narsani qila oladi — uni to'sish himoya emas, faqat migratsiya va
   xizmat ishini buzardi. */
create function public.profiles_guard()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
    raise exception 'profil: id va created_at o''zgarmaydi';
  end if;
  if new.tg_id is distinct from old.tg_id then
    raise exception 'profil: tg_id ni faqat server yozadi';
  end if;
  if new.role is distinct from old.role
     and not public.has_role(array['owner']::public.app_role[]) then
    raise exception 'profil: rolni faqat egasi (owner) o''zgartiradi';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_trg
  before update on public.profiles
  for each row execute function public.profiles_guard();


-- ═══ 2. AUDIT JURNALI ══════════════════════════════════════════════════
-- Qoida: "jurnalga tushmaydigan o'zgarish bo'lmaydi". Shuning uchun
-- yozuvni TRIGGER qo'yadi, klient emas: klient jurnalni chetlab o'ta
-- olmaydi, soxta yozuv qo'sha olmaydi va o'chira olmaydi (INSERT/UPDATE/
-- DELETE na siyosati, na huquqi bor).
--
-- actor_id da ATAYLAB tashqi kalit (FK) yo'q: xodimning hisobi keyin
-- o'chirilsa ham "kim qildi" yozuvi saqlanishi kerak. FK bo'lsa yo hisob
-- o'chirilmasdi, yo jurnal yozuvi o'zgarardi (set null).

create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  actor_role  public.app_role,
  action      text not null,
  resource    text,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);

create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_actor_idx   on public.audit_log (actor_id);

-- Rol va Telegram bog'lanishi — hisobni egallashning ikki yo'li, shuning
-- uchun ularning har bir o'zgarishi jurnalga tushadi. Ism o'zgarishi
-- tushmaydi: u xavfsizlik hodisasi emas, jurnalni esa shovqin o'ldiradi.
create function public.audit_profiles()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role then
    insert into public.audit_log (actor_id, actor_role, action, resource, before, after)
    values (auth.uid(), public.my_role(),
            'rol o''zgartirildi: ' || old.role || ' → ' || new.role,
            'profile:' || new.id,
            jsonb_build_object('role', old.role), jsonb_build_object('role', new.role));
  end if;
  if new.tg_id is distinct from old.tg_id then
    insert into public.audit_log (actor_id, actor_role, action, resource, before, after)
    values (auth.uid(), public.my_role(), 'telegram bog''lanishi o''zgardi',
            'profile:' || new.id,
            jsonb_build_object('tg_id', old.tg_id), jsonb_build_object('tg_id', new.tg_id));
  end if;
  return new;
end;
$$;

create trigger audit_profiles_trg
  after update on public.profiles
  for each row execute function public.audit_profiles();


-- ═══ 3. RLS VA HUQUQLAR ════════════════════════════════════════════════

alter table public.profiles  enable row level security;
alter table public.audit_log enable row level security;

-- ── profiles ──
-- Har kim faqat o'z qatorini ko'radi va tahrirlaydi (ustun cheklovlari —
-- profiles_guard). Xodimlar ro'yxatni ko'radi (admin panel).
create policy profiles_self_read on public.profiles
  for select to authenticated using (id = auth.uid());

create policy profiles_staff_read on public.profiles
  for select to authenticated
  using (public.has_role(array['support','moderator','auditor','owner']::public.app_role[]));

create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_owner_update on public.profiles
  for update to authenticated
  using (public.has_role(array['owner']::public.app_role[]))
  with check (public.has_role(array['owner']::public.app_role[]));

-- INSERT (profilni trigger yaratadi) va DELETE (auth.users o'chsa
-- cascade) siyosati YO'Q.

-- ── audit_log: faqat o'qish, faqat auditor va egasi ──
create policy audit_read on public.audit_log
  for select to authenticated
  using (public.has_role(array['auditor','owner']::public.app_role[]));

-- ── Huquqlar ──
-- Supabase standart holatda anon/authenticated'ga HAMMA huquqni beradi.
-- Avval olinadi, keyin faqat kerakligi beriladi — RLS bilan birga ikki
-- qatlam: biri unutilsa, ikkinchisi ushlaydi.
revoke all on public.profiles  from anon, authenticated;
revoke all on public.audit_log from anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.audit_log to authenticated;
