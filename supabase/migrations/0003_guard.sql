-- ═══════════════════════════════════════════════════════════════════════
--  0003 — "TO'RT KO'Z" QOIDASINING UCHTA TESHIGI YOPILADI
--
--  Tekshiruvda (ANALYSIS.md) aniqlandiki, 0001_init.sql dagi guard uch
--  yo'l bilan chetlab o'tiladi. Uchalasi ham mahalliy PostgreSQL'da
--  HAQIQIY SO'ROV bilan tasdiqlangan — taxmin emas.
--
--  1. INSERT bilan darhol nashr etish.
--     Guard faqat `tg_op = 'UPDATE'` ichida tekshirardi. Moderator
--     bitta INSERT bilan state='published' yozib, savolni ikkinchi odam
--     tasdig'isiz ilovaga chiqarardi — anon uni darhol o'qidi.
--
--  2. options massivini almashtirish.
--     Guard `correct` INDEKSINI kuzatardi, lekin correct — options
--     ichidagi o'rin. Massiv ichini almashtirish indeksni o'zgartirmaydi:
--       oldin: correct=1 → to'g'ri javob
--       keyin: correct=1 → NOTO'G'RI javob, holat published bo'lib qoldi
--     Bu eng yashirin yo'l: hech qayerda hech narsa "o'zgargan" ko'rinmaydi.
--
--  3. question_translations butunlay qo'riqsiz.
--     Ruscha javob varianti ham javob kaliti, lekin bu jadvalda na guard,
--     na audit triggeri bor edi. Rus tilida ishlatadigan foydalanuvchi
--     uchun kalit o'zgardi, hech kim tasdiqlamadi va JURNALDA IZ
--     QOLMADI — 0001 boshidagi "jurnalga tushmaydigan o'zgarish
--     bo'lmaydi" qoidasining to'g'ridan-to'g'ri buzilishi.
--
--  Bundan tashqari: tg_id ni ro'yxatdan o'tish meta-ma'lumotidan olish
--  to'xtatiladi (pastdagi izohga qarang).
--
--  Bu fayl IDEMPOTENT: create or replace + drop trigger if exists.
--  Sxema allaqachon qo'llangan bazada ham xavfsiz ishlaydi.
-- ═══════════════════════════════════════════════════════════════════════

begin;

-- ── 1 va 2: questions_guard ────────────────────────────────────────────
create or replace function public.questions_guard()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);

  if tg_op = 'INSERT' then
    /* Yangi savol darhol nashr etilgan holatda yaratilmaydi — u avval
       ko'rib chiqishdan o'tishi kerak. Aks holda to'rt ko'z qoidasi
       ma'nosiz bo'lardi: uni chetlab o'tish uchun UPDATE emas, INSERT
       qilish yetardi.

       auth.uid() null bo'lgan holat ATAYLAB ruxsat etiladi — bu
       to'g'ridan-to'g'ri bazaga ulanish (seed, migratsiya, xizmat
       kaliti). Bunday ulanishi bor odam baribir hamma narsani qila
       oladi, shuning uchun uni to'sish himoya emas, faqat seed'ni
       buzardi. */
    if new.state = 'published' and auth.uid() is not null then
      raise exception
        'yangi savol darhol nashr etilmaydi: avval qoralama yoki ko''rib chiqish';
    end if;

  elsif tg_op = 'UPDATE' then
    /* Javob kaliti o'zgardi → majburan ko'rib chiqishga qaytadi.

       DIQQAT: `correct` — options massividagi O'RIN. Variantlarni
       almashtirish correct ni o'zgartirmaydi, lekin JAVOBNI
       o'zgartiradi. Shuning uchun ikkalasi ham kuzatiladi. */
    if new.correct is distinct from old.correct
       or new.options is distinct from old.options then
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

/* Ikkinchi qatlam: RLS siyosati ham buni to'sadi. Trigger yetarli, lekin
   himoya bitta joyga tayanmasligi kerak — siyosat kelajakda trigger
   o'zgartirilib qo'yilsa ham o'z ishini qiladi. */
drop policy if exists questions_staff_insert on public.questions;
create policy questions_staff_insert on public.questions
  for insert to authenticated
  with check (
    public.has_role(array['owner','moderator']::public.app_role[])
    and state in ('draft', 'review')
  );


-- ── 3: question_translations uchun guard va audit ──────────────────────

/* Tarjima o'zgarsa asosiy savol ko'rib chiqishga qaytadi.

   Nima uchun butun savol qaytadi, faqat tarjima emas: foydalanuvchi
   uchun "savol" bitta narsa. Ruscha varianti noto'g'ri bo'lsa, savol
   rus tilidagi odam uchun buzilgan — holat esa bitta ustunda saqlanadi.
   Shuning uchun tekshiruv ham bitta joyda bo'lishi kerak. */
create or replace function public.translations_guard()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  qid uuid := coalesce(new.question_id, old.question_id);
begin
  /* Seed va migratsiya (auth.uid() null — bazaga to'g'ridan-to'g'ri
     ulanish) qaytarmaydi. questions_guard dagi INSERT bandida xuddi shu
     istisno bor va sababi ham bir xil: bunday ulanishi bor odam baribir
     hamma narsani qila oladi, uni to'sish himoya emas.

     Bu yerda u ayniqsa zarur: seed avval savolni `published` holatda
     yozadi, keyin uning ruscha tarjimasini qo'shadi. Istisnosiz o'sha
     tarjima o'z savolini darhol `review` ga tushirardi va toza baza
     BO'SH ilova bilan ochilardi — nashr etilgan savol qolmasdi. */
  if auth.uid() is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'UPDATE'
     and new.options is not distinct from old.options
     and new.text is not distinct from old.text then
    -- Faqat izoh o'zgargan — javob kaliti tegilmagan, qaytarish shart emas.
    return new;
  end if;

  update public.questions
     set state = 'review',
         key_changed_at = now(),
         reviewed_by = null
   where id = qid
     and state = 'published';

  return coalesce(new, old);
end;
$$;

drop trigger if exists translations_guard_trg on public.question_translations;
create trigger translations_guard_trg
  after insert or update or delete on public.question_translations
  for each row execute function public.translations_guard();


create or replace function public.audit_translations()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  act text;
  qref text;
begin
  /* Hech narsa o'zgarmagan UPDATE jurnalga tushmaydi. Seed tarjimalarni
     `on conflict do update` bilan yozadi, ya'ni apply.sh har ishga
     tushganda bir xil matn qayta yoziladi. Filtrsiz bu har safar 10 ta
     "tarjima tahrirlandi" yozuvi qo'shardi va jurnal — himoyaning eng
     muhim qismi — tez orada foydasiz shovqinga aylanardi. */
  if tg_op = 'UPDATE'
     and new.text    is not distinct from old.text
     and new.options is not distinct from old.options
     and new.explain is not distinct from old.explain then
    return new;
  end if;

  if tg_op = 'INSERT' then
    act := 'tarjima qo''shildi (' || new.lang || ')';
  elsif tg_op = 'DELETE' then
    act := 'tarjima o''chirildi (' || old.lang || ')';
  elsif new.options is distinct from old.options then
    act := 'tarjima javob variantlari o''zgartirildi (' || new.lang || ')';
  else
    act := 'tarjima tahrirlandi (' || new.lang || ')';
  end if;

  select ref into qref from public.questions
   where id = coalesce(new.question_id, old.question_id);

  insert into public.audit_log (actor_id, actor_role, action, resource, before, after)
  values (
    auth.uid(),
    public.my_role(),
    act,
    coalesce(qref, coalesce(new.question_id, old.question_id)::text),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_translations_trg on public.question_translations;
create trigger audit_translations_trg
  after insert or update or delete on public.question_translations
  for each row execute function public.audit_translations();


-- ── 4: tg_id ro'yxatdan o'tish meta-ma'lumotidan OLINMAYDI ─────────────

/* Muammo (tasdiqlangan): raw_user_meta_data ni klient signUp() da o'zi
   to'ldiradi. tg_id ni undan olish ikki zarar berardi:

     1. Hisobni oldindan egallash — hujumchi boshqa odamning Telegram
        id'sini yozib qo'yadi; Telegram orqali kirish tg_id bo'yicha
        moslasa, o'sha hisob hujumchiniki bo'ladi.
     2. Egasini bloklash — haqiqiy odamning ro'yxatdan o'tishi
        "duplicate key ... profiles_tg_id_key" bilan butunlay yiqiladi.
        Hujumchi 1000 ta tg_id yozib 1000 odamni to'sib qo'yadi.

   role allaqachon to'g'ri e'tiborsiz qoldirilgan edi — tg_id ham xuddi
   shunday bo'lishi kerak. U FAQAT serverda Telegram imzosi (initData
   HMAC) tekshirilgandan keyin yoziladi.

   name va username ham klientdan keladi, lekin ular oddiy ko'rsatma
   matn — faqat uzunligi cheklanadi, chunki admin panelda ular
   ro'yxatda chiziladi. */
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, username, avatar_url)
  values (
    new.id,
    left(nullif(new.raw_user_meta_data ->> 'name', ''), 80),
    left(nullif(new.raw_user_meta_data ->> 'username', ''), 40),
    left(nullif(new.raw_user_meta_data ->> 'avatar_url', ''), 500)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;


-- ── 5: savol matni uzunligiga yuqori chegara ───────────────────────────

/* Tekshiruvda 2 MB'lik bitta savol ok=true bilan qabul qilingan edi. U
   bazaga, u yerdan har bir foydalanuvchiga tushardi va klient keshi
   ~5 MB chegarasiga urilib jimgina yiqilardi — natijada BUTUN
   foydalanuvchi bazasining offline rejimi o'chardi. */
alter table public.questions drop constraint if exists questions_text_min;
alter table public.questions
  add constraint questions_text_len
  check (char_length(text) between 15 and 500);

commit;
