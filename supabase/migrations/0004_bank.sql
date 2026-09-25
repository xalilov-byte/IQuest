-- ═══════════════════════════════════════════════════════════════════════
--  NAZARIY — 0004: haqiqiy savollar banki uchun sxema
--
--  0001 dagi sxema qo'lda yozilgan 10 ta savolga moslangan edi: har
--  savolda ANIQ to'rtta variant va javob kaliti albatta ma'lum deb
--  hisoblangan. Rasmiy avtotest to'plami boshqacha chiqdi:
--
--    · variantlar soni 2 dan 5 gacha (3 ta variant eng ko'p uchraydi),
--    · savolning yarmidan ko'pi yo'l vaziyati RASMIga bog'liq,
--    · javob kaliti hujjatda matn bilan berilmagan — u faqat variant
--      yonidagi yashil nuqta bilan ko'rsatilgan (tools/mkbank.mjs).
--
--  Shu uchta narsa uchun sxema kengaytiriladi. Eng muhimi — uchinchisi:
--  kalit avtomatik topilgan bo'lsa, savol FOYDALANUVCHIGA KO'RSATILMAYDI.
--  Odam tasdiqlamaguncha u 'draft' bo'lib qoladi. Noto'g'ri javob kaliti
--  bu loyihada qilinishi mumkin bo'lgan eng katta zarar: odam imtihonga
--  noto'g'ri bilim bilan boradi.
--
--  Ishga tushirish: supabase/apply.sh (0001, 0003 dan keyin).
-- ═══════════════════════════════════════════════════════════════════════

begin;

-- ── 1. Variantlar soni: 4 emas, 2..5 ───────────────────────────────────
alter table public.questions
  drop constraint questions_options_four;
alter table public.questions
  add constraint questions_options_count
  check (array_length(options, 1) between 2 and 5);

alter table public.question_translations
  drop constraint qt_options_four;
alter table public.question_translations
  add constraint qt_options_count
  check (array_length(options, 1) between 2 and 5);

-- Tarjima variantlari soni asl savolnikiga teng bo'lishi shart. Buni
-- CHECK bilan yozib bo'lmaydi (ikki jadval), shuning uchun trigger.
-- Har doim ishlaydi — seed uchun ham istisno yo'q: bu yerda xato bo'lsa
-- rus tilidagi foydalanuvchi boshqa javobni bosadi.
create or replace function public.translations_match_options()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  n int;
begin
  select array_length(options, 1) into n
    from public.questions where id = new.question_id;
  if n is null then
    raise exception 'savol topilmadi: %', new.question_id;
  end if;
  if array_length(new.options, 1) <> n then
    raise exception 'tarjimada % ta variant, savolda % ta',
      array_length(new.options, 1), n;
  end if;
  return new;
end;
$$;

create trigger question_translations_match
  before insert or update on public.question_translations
  for each row execute function public.translations_match_options();

-- ── 2. Javob kaliti noma'lum bo'lishi mumkin ───────────────────────────
-- Ilgari `correct` NOT NULL edi, ya'ni "kalit har doim ma'lum" deb
-- hisoblangan. Endi kalit noma'lum bo'lsa null yoziladi — bu "0 -
-- birinchi variant" deb yozib qo'yishdan ming marta yaxshi.
alter table public.questions
  alter column correct drop not null;

alter table public.questions
  drop constraint questions_correct_range;
alter table public.questions
  add constraint questions_correct_range
  check (correct is null or correct between 0 and array_length(options, 1) - 1);

-- Kalit qayerdan kelgan.
--   'human'         — odam kiritgan yoki tekshirib tasdiqlagan
--   'docx-geometry' — hujjatdagi yashil nuqta koordinatasidan olingan
alter table public.questions
  add column key_source text not null default 'human'
  constraint questions_key_source_known check (key_source in ('human', 'docx-geometry'));

comment on column public.questions.key_source is
  'Javob kaliti qayerdan olingan. Avtomatik olingan kalit bilan savol '
  'nashr etilmaydi — avval odam tekshiradi.';

-- ENG MUHIM QOIDA. Nashr etilgan savolda kalit bo'lishi SHART va u odam
-- tomonidan tasdiqlangan bo'lishi shart.
alter table public.questions
  add constraint questions_published_key
  check (state <> 'published' or (correct is not null and key_source = 'human'));

-- ── 3. Savol rasmi ─────────────────────────────────────────────────────
-- Yo'l vaziyati rasmi (content/images/ dagi fayl nomi). Rasmsiz savol
-- "qaysi avtomobil birinchi o'tadi?" degan savolga aylanib qoladi.
alter table public.questions add column image text;
comment on column public.questions.image is
  'Savol rasmining fayl nomi (content/images/). Rasm bo''lsa, ilova uni '
  'savol matni ustida ko''rsatadi.';

-- ── 4. Juda qisqa savol chegarasi ──────────────────────────────────────
-- 15 belgi juda qattiq chiqdi: "Asosiy yo'l –" kabi ta'rif savollari
-- qonuniy va ular 13 belgi. Chegara mavjudligi baribir kerak — yarim
-- yozilgan savolni ushlaydi.
-- (0003_guard.sql bu chegarani questions_text_len deb qayta nomlagan va
-- yuqori chegara ham qo'shgan: 15..500. Faqat pastki chegara tushadi.)
alter table public.questions
  drop constraint questions_text_len;
alter table public.questions
  add constraint questions_text_len
  check (char_length(text) between 12 and 500);

-- ── 5. Kalitga odam tekkan bo'lsa — bu "human" ─────────────────────────
-- Quyidagi funksiya 0003_guard.sql dagining aynan o'zi, faqat BITTA
-- qoida qo'shilgan: kalitni tirik odam o'zgartirgan bo'lsa, manba ham
-- 'human' bo'ladi. Busiz moderator avtomatik topilgan kalitni tuzatsa
-- ham savol nashr etilmay qolaverardi.
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

    /* YANGI (0004): kalitni tizimga kirgan odam o'zgartirgan bo'lsa,
       kalit endi avtomatik emas — uni odam qo'ygan. */
    if new.correct is distinct from old.correct and auth.uid() is not null then
      new.key_source := 'human';
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

commit;
