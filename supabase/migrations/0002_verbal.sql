-- ═══════════════════════════════════════════════════════════════════════
--  ZUKKO — 0002: og'zaki savollar (verbal_items) va "to'rt ko'z" qoidasi
--
--  Og'zaki savollar generator emas, qo'lda yozilgan kontent
--  (content/verbal.json, shakli — src/iq/CONTRACT.md §2). Bazaga ular
--  seed orqali HAMMASI 'draft' holatida tushadi va foydalanuvchiga FAQAT
--  odam ko'rib chiqib nashr etgandan keyin chiqadi.
--
--  Nima uchun bunchalik qat'iy: IQ testida noto'g'ri javob kaliti
--  natijani JIMGINA buzadi — odam to'g'ri javob berib "xato" oladi va
--  buni hech kim sezmaydi. Shuning uchun:
--    1. Yangi savol INSERT bilan darhol nashr etilmaydi.
--    2. Javobga ta'sir qiladigan mazmun (kalit, variantlar, stimul,
--       savol matni — IKKALA tilda) o'zgarsa savol majburan ko'rib
--       chiqishga qaytadi va oldingi tasdiq bekor bo'ladi.
--    3. Mazmunni oxirgi o'zgartirgan odam uni o'zi nashr eta olmaydi.
--    4. Ko'rib chiquvchi (reviewed_by) va boshqa tizim maydonlarini
--       klient yoza olmaydi — ularni faqat qo'riqchi trigger qo'yadi.
--  Qoidalar bazada, klientda emas: klient kodini chetlab o'tish mumkin
--  (API'ga qo'lda so'rov), bazani esa yo'q.
--
--  Nazariy'dan farqi (tekshiruvda topilgan teshiklar hisobga olingan):
--    · uz va ru BITTA qatorda. Nazariy'da tarjima alohida jadvalda edi va
--      u yerda na qo'riqchi, na audit bor edi — ruscha kalitni hech kim
--      tasdiqlamasdan o'zgartirish mumkin edi. Bitta qator = bitta holat
--      = bitta tekshiruv.
--    · To'rt ko'z "oxirgi TAHRIR qilgan" (updated_by) bo'yicha emas,
--      "mazmunni oxirgi O'ZGARTIRGAN" (content_by) bo'yicha. Aks holda A
--      kalitni o'zgartiradi, B faqat izohdagi vergulni tuzatadi va A
--      endi o'z kalitini o'zi nashr eta oladi (testda isbotlangan).
-- ═══════════════════════════════════════════════════════════════════════

create type public.item_state as enum ('draft', 'review', 'published', 'archived');


-- ── Variantlar ro'yxatini tekshirgich ──────────────────────────────────
/* Bir xil ikki variant — ikkalasi ham "to'g'ri" bo'lib qolishi yoki
   odam farqni qidirib vaqt yo'qotishi mumkin. Solishtirish katta-kichik
   harf va ortiqcha bo'shliqsiz: "Asalari" va " asalari " — bitta javob.
   CHECK ichida quyi so'rov yozib bo'lmaydi, shuning uchun funksiya. */
create function public.options_ok(opts text[], maxlen int)
returns boolean
language sql immutable
set search_path = pg_catalog, pg_temp
as $$
  select opts is not null
     and array_ndims(opts) = 1
     and array_position(opts, null) is null
     and not exists (
       select 1 from unnest(opts) o
        where o !~ '\S' or char_length(o) > maxlen)
     and (select count(distinct lower(regexp_replace(btrim(o), '\s+', ' ', 'g')))
            from unnest(opts) o) = cardinality(opts);
$$;


create table public.verbal_items (
  id              uuid primary key default gen_random_uuid(),
  -- Barqaror kalit (v001, v002…): hech qachon o'zgarmaydi va qayta
  -- ishlatilmaydi. Ilova keshi va arxiv ro'yxati shu kalit bilan ishlaydi.
  key             text not null unique
                  constraint verbal_key_format check (key ~ '^v[0-9]{3,6}$'),
  kind            text not null
                  constraint verbal_kind_known check (kind in ('analogy', 'odd', 'category', 'relation')),
  level           smallint not null
                  constraint verbal_level_range check (level between 1 and 10),
  uz_prompt       text not null,
  uz_stimulus     text,
  uz_options      text[] not null,
  ru_prompt       text not null,
  ru_stimulus     text,
  ru_options      text[] not null,
  correct         smallint not null,
  explain_uz      text not null,
  explain_ru      text not null,
  state           public.item_state not null default 'draft',

  -- Tizim maydonlari — ularni FAQAT verbal_guard qo'yadi.
  author_id       uuid references public.profiles (id),
  updated_by      uuid references public.profiles (id),  -- oxirgi har qanday tahrir
  content_by      uuid references public.profiles (id),  -- javobga ta'sir qiluvchi mazmunni oxirgi o'zgartirgan
  reviewed_by     uuid references public.profiles (id),  -- nashr etgan (ko'rib chiqqan) odam
  key_changed_at  timestamptz,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Hajm: juda uzun matn har bir foydalanuvchining keshiga ketadi
  -- (Nazariy'da 2 MB'lik "savol" qabul qilingan edi).
  constraint verbal_prompt_len check (
    char_length(btrim(uz_prompt)) between 3 and 300
    and char_length(btrim(ru_prompt)) between 3 and 300),
  -- Stimul ixtiyoriy ("ortiqchasini toping" savolida faqat variantlar
  -- bo'ladi), lekin bir tilda bo'lib, boshqasida yo'q bo'lishi mumkin
  -- emas — aks holda ikki tildagi savol boshqa-boshqa savol.
  constraint verbal_stimulus_pair check ((uz_stimulus is null) = (ru_stimulus is null)),
  constraint verbal_stimulus_len check (
    (uz_stimulus is null or char_length(btrim(uz_stimulus)) between 1 and 300)
    and (ru_stimulus is null or char_length(btrim(ru_stimulus)) between 1 and 300)),
  -- 4..6 variant — IQ.validateItem bilan bir xil (src/iq/index.js).
  constraint verbal_options_count check (array_length(uz_options, 1) between 4 and 6),
  -- uz va ru'da variantlar soni BIR XIL: kalit — o'rin raqami, matn esa
  -- boshqa massivda. Sonlar farq qilsa rus tilidagi odam boshqa javobni
  -- bosadi (CONTRACT §2).
  constraint verbal_options_same_count check (array_length(ru_options, 1) = array_length(uz_options, 1)),
  constraint verbal_options_valid check (
    public.options_ok(uz_options, 120) and public.options_ok(ru_options, 120)),
  constraint verbal_correct_range check (correct >= 0 and correct < array_length(uz_options, 1)),
  constraint verbal_explain_len check (
    char_length(btrim(explain_uz)) between 3 and 600
    and char_length(btrim(explain_ru)) between 3 and 600),
  -- ENG MUHIM INVARIANT: nashr etilgan savolni odam ko'rib chiqqan va u
  -- mazmunni oxirgi o'zgartirgan odam EMAS. Qo'riqchi trigger buni
  -- allaqachon ta'minlaydi; CHECK ikkinchi qatlam — trigger kelajakda
  -- buzib qo'yilsa ham yoki bazaga to'g'ridan-to'g'ri yozilsa ham ushlaydi.
  constraint verbal_published_reviewed check (
    state <> 'published'
    or (reviewed_by is not null
        and reviewed_by is distinct from content_by
        and published_at is not null))
);

create index verbal_items_state_idx on public.verbal_items (state);

comment on table public.verbal_items is
  'Og''zaki savollar (uz + ru bitta qatorda). Ommaga faqat state=published. '
  'Tizim maydonlarini verbal_guard qo''yadi, klient emas.';


-- ── Javobga ta'sir qiladigan mazmun ────────────────────────────────────
/* Qaysi ustunlar "javob kaliti" hisoblanadi — bitta joyda, qo'riqchi ham,
   audit ham shundan foydalanadi.

   Nazariy'dan saboq: u yerda faqat `correct` kuzatilgan edi, holbuki
   correct — variantlar massividagi O'RIN. Variantlarni almashtirish
   indeksni o'zgartirmaydi, lekin JAVOBNI o'zgartiradi. Og'zaki savolda
   bundan ham ko'p: stimulni ("Qush : uya = asalari : ?") o'zgartirsangiz
   to'g'ri javob butunlay boshqa bo'ladi. Daraja (level) ham shu yerda —
   u savolning qiyinligi, ya'ni IQ bahosiga to'g'ridan-to'g'ri ta'sir
   qiladi. Tashqarida qolgani faqat izoh (explain): u javobni
   o'zgartirmaydi, uning xatosini tuzatish esa tez bo'lishi kerak. */
create function public.verbal_content(v public.verbal_items)
returns jsonb
language sql immutable
set search_path = pg_catalog, pg_temp
as $$
  select jsonb_build_array(
    v.kind, v.level, v.correct,
    v.uz_prompt, v.uz_stimulus, v.uz_options,
    v.ru_prompt, v.ru_stimulus, v.ru_options);
$$;


-- ── "To'rt ko'z" qo'riqchisi ───────────────────────────────────────────
create function public.verbal_guard()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
begin
  new.updated_at := now();

  if tg_op = 'INSERT' then
    /* auth.uid() null — bazaga to'g'ridan-to'g'ri ulanish (seed,
       migratsiya, service kaliti). U ATAYLAB istisno: bunday ulanishi
       bor odam baribir hamma narsani qila oladi, uni to'sish himoya
       emas, faqat seed'ni buzardi. Lekin CHECK'lar (jumladan
       verbal_published_reviewed) unga ham amal qiladi. */
    if uid is not null then
      /* Darhol nashr — to'rt ko'z qoidasini chetlab o'tishning eng oddiy
         yo'li (Nazariy'da isbotlangan): UPDATE emas, INSERT qilish. */
      if new.state not in ('draft', 'review') then
        raise exception 'yangi savol darhol nashr etilmaydi: avval qoralama yoki ko''rib chiqish';
      end if;
      new.author_id      := uid;
      new.updated_by     := uid;
      new.content_by     := uid;
      new.reviewed_by    := null;
      new.published_at   := null;
      new.key_changed_at := null;
      new.created_at     := now();
    end if;
    return new;
  end if;

  -- ── UPDATE ──
  if new.key is distinct from old.key or new.id is distinct from old.id then
    raise exception 'savol kaliti (key) o''zgarmaydi: u barqaror va qayta ishlatilmaydi';
  end if;

  /* Tizim maydonlari klientdan kelmaydi. Aks holda moderator
     `reviewed_by = <hamkasbi>` yoki `content_by = null` deb yozib,
     "boshqa odam ko'rgan" degan soxta iz qoldirardi. */
  if uid is not null then
    new.author_id      := old.author_id;
    new.created_at     := old.created_at;
    new.content_by     := old.content_by;
    new.reviewed_by    := old.reviewed_by;
    new.key_changed_at := old.key_changed_at;
    new.published_at   := old.published_at;
    new.updated_by     := uid;
  end if;

  -- Mazmun o'zgardi → oldingi tasdiq bekor, nashrdan ko'rib chiqishga.
  if public.verbal_content(new) is distinct from public.verbal_content(old) then
    new.content_by     := uid;
    new.key_changed_at := now();
    new.reviewed_by    := null;
    if new.state = 'published' then
      new.state := 'review';
    end if;
  end if;

  -- Nashr etish: mazmun muallifidan BOSHQA tizimga kirgan xodim.
  if new.state = 'published' and old.state is distinct from 'published' then
    if uid is null then
      raise exception 'nashr etish uchun tizimga kirgan xodim (ko''rib chiquvchi) kerak';
    end if;
    if new.content_by is not null and new.content_by = uid then
      raise exception
        'to''rt ko''z qoidasi: o''zingiz yozgan yoki o''zgartirgan mazmunni o''zingiz nashr eta olmaysiz';
    end if;
    new.reviewed_by  := uid;
    new.published_at := now();
  end if;

  return new;
end;
$$;

create trigger verbal_guard_trg
  before insert or update on public.verbal_items
  for each row execute function public.verbal_guard();


-- ── Arxivlangan kalitlar ro'yxati ──────────────────────────────────────
/* Ilova og'zaki savollarni APK ichida ham olib yuradi (content/verbal.json)
   va bazadagi nashr etilganlarni ular ustiga QO'SHADI (src/data.js). Demak
   bazada savolni arxivlash yetarli emas: APK ichidagi nusxasi baribir
   chiqib turaverardi — noto'g'ri savolni olib tashlashning yagona yo'li
   yangi APK bo'lib qolardi. Shuning uchun arxivlangan kalitlar alohida,
   hammaga ochiq ro'yxatda turadi — faqat KALIT, mazmun emas (arxivdagi
   qoralama matni tashqariga chiqmasligi kerak). Ro'yxatni faqat trigger
   yuritadi. */
create table public.verbal_retired (
  key         text primary key references public.verbal_items (key) on delete cascade,
  retired_at  timestamptz not null default now()
);

create function public.verbal_sync_retired()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
begin
  if new.state = 'archived' then
    insert into public.verbal_retired (key) values (new.key)
    on conflict (key) do nothing;
  else
    delete from public.verbal_retired where key = new.key;
  end if;
  return new;
end;
$$;

create trigger verbal_retired_trg
  after insert or update of state on public.verbal_items
  for each row execute function public.verbal_sync_retired();


-- ── Audit ──────────────────────────────────────────────────────────────
create function public.audit_verbal()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  act text;
begin
  /* Hech narsa o'zgarmagan UPDATE jurnalga tushmaydi. apply.sh seed'ni
     har safar qayta ishga tushiradi; filtrsiz har safar yuzlab bo'sh
     yozuv qo'shilardi va jurnal — himoyaning eng muhim qismi — tez
     orada shovqinga ko'milardi. */
  if tg_op = 'UPDATE'
     and (to_jsonb(new) - array['updated_at', 'updated_by'])
         = (to_jsonb(old) - array['updated_at', 'updated_by']) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    act := 'savol yaratildi';
  elsif tg_op = 'DELETE' then
    act := 'savol o''chirildi';
  elsif public.verbal_content(new) is distinct from public.verbal_content(old) then
    act := 'savol mazmuni (javob kaliti) o''zgartirildi';
  elsif new.state is distinct from old.state then
    act := 'savol holati: ' || old.state || ' → ' || new.state;
  else
    act := 'savol tahrirlandi';
  end if;

  insert into public.audit_log (actor_id, actor_role, action, resource, before, after)
  values (
    auth.uid(), public.my_role(), act,
    'verbal:' || coalesce(new.key, old.key),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_verbal_trg
  after insert or update or delete on public.verbal_items
  for each row execute function public.audit_verbal();


-- ═══ RLS VA HUQUQLAR ═══════════════════════════════════════════════════

alter table public.verbal_items   enable row level security;
alter table public.verbal_retired enable row level security;

-- Ommaga FAQAT nashr etilgan savollar. Qoralama va ko'rib chiqishdagilar
-- tashqariga chiqmaydi: kaliti hali tekshirilmagan savol natijani buzadi.
create policy verbal_public_read on public.verbal_items
  for select to anon, authenticated
  using (state = 'published');

create policy verbal_staff_read on public.verbal_items
  for select to authenticated
  using (public.has_role(array['moderator','auditor','owner']::public.app_role[]));

-- Ikkinchi qatlam: qo'riqchi trigger yetarli, lekin himoya bitta joyga
-- tayanmasligi kerak — trigger kelajakda buzib qo'yilsa ham siyosat
-- nashr etilgan holatdagi INSERT'ni to'sadi.
create policy verbal_staff_insert on public.verbal_items
  for insert to authenticated
  with check (
    public.has_role(array['moderator','owner']::public.app_role[])
    and state in ('draft', 'review'));

create policy verbal_staff_update on public.verbal_items
  for update to authenticated
  using (public.has_role(array['moderator','owner']::public.app_role[]))
  with check (public.has_role(array['moderator','owner']::public.app_role[]));

-- DELETE YO'Q: savol arxivlanadi (state='archived'), o'chirilmaydi —
-- kalit qayta ishlatilmasin va arxiv ro'yxati ilovaga yetib borsin.

create policy verbal_retired_public_read on public.verbal_retired
  for select to anon, authenticated
  using (true);

revoke all on public.verbal_items   from anon, authenticated;
revoke all on public.verbal_retired from anon, authenticated;

/* anon'ga faqat klientga kerakli ustunlar. Nashr etilgan qatorda ham
   xodimlarning ichki identifikatorlari (author_id, reviewed_by…)
   tashqariga chiqmaydi. Xodimlar tizimga kirib ishlaydi (authenticated),
   ularga to'liq ustunlar kerak — qatorlarni esa RLS cheklaydi. */
grant select (key, kind, level,
              uz_prompt, uz_stimulus, uz_options,
              ru_prompt, ru_stimulus, ru_options,
              correct, explain_uz, explain_ru, state, updated_at)
  on public.verbal_items to anon;
grant select, insert, update on public.verbal_items to authenticated;
grant select on public.verbal_retired to anon, authenticated;


-- ═══ Klient uchun ko'rinish ════════════════════════════════════════════
/* Shakl content/verbal.json dagi bilan bir xil ({ key, kind, level,
   uz: {prompt, stimulus?, options}, ru: {…}, correct, explain: {uz, ru} })
   — src/data.js uni to'g'ridan-to'g'ri window.IQ_VERBAL ga qo'sha oladi.
   Arxivlangan kalitlar shu yerning o'zida `retired = true` qatori bo'lib
   keladi (mazmunsiz): klient bitta so'rov bilan ikkalasini oladi.

   security_invoker = true: ko'rinish RLS'ni chaqiruvchi huquqi bilan
   qo'llaydi, ya'ni u RLS'ni chetlab o'tadigan orqa eshik emas. */
create view public.published_verbal
with (security_invoker = true) as
  select v.key, v.kind, v.level,
         jsonb_strip_nulls(jsonb_build_object(
           'prompt', v.uz_prompt, 'stimulus', v.uz_stimulus, 'options', to_jsonb(v.uz_options))) as uz,
         jsonb_strip_nulls(jsonb_build_object(
           'prompt', v.ru_prompt, 'stimulus', v.ru_stimulus, 'options', to_jsonb(v.ru_options))) as ru,
         v.correct,
         jsonb_build_object('uz', v.explain_uz, 'ru', v.explain_ru) as explain,
         false as retired,
         v.updated_at
    from public.verbal_items v
   where v.state = 'published'
  union all
  select r.key, null::text, null::smallint, null::jsonb, null::jsonb,
         null::smallint, null::jsonb, true, r.retired_at
    from public.verbal_retired r;

comment on view public.published_verbal is
  'Klient uchun og''zaki savollar (nashr etilganlar + arxivlangan kalitlar). '
  'security_invoker=true — RLS chaqiruvchi huquqi bilan qo''llanadi.';

revoke all on public.published_verbal from anon, authenticated;
grant select on public.published_verbal to anon, authenticated;
