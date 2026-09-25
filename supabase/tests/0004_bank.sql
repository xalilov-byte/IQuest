-- ═══════════════════════════════════════════════════════════════════════
--  NAZARIY — 0004_bank.sql migratsiyasining tekshiruvi
--
--  0004 sxemani KENGAYTIRADI (variant soni 2..5, kalit null bo'lishi
--  mumkin, rasm maydoni). Kengaytirish har doim xavfli: yumshatilgan
--  cheklov bilan birga himoya ham yo'qolishi mumkin. Shuning uchun bu
--  yerda har bir yangi qoidaning TISHLAYOTGANI tekshiriladi.
--
--  Eng muhimi — 3-bo'lim: hujjatdan avtomatik olingan javob kaliti bilan
--  savol nashr ETILMAYDI. Bu 301 ta savolning barchasi 'draft' bo'lib
--  turishining yagona sababi. Bu tekshiruv yiqilsa, noto'g'ri kalitli
--  savol imtihonga tayyorlanayotgan odamga ko'rinadi.
--
--  Qanday ishga tushiriladi (0003 testidan keyin):
--    psql -f supabase/tests/0004_bank.sql
-- ═══════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on

\set modE '77777777-7777-7777-7777-777777777777'
\set modF '88888888-8888-8888-8888-888888888888'

insert into auth.users (id, email, raw_user_meta_data) values
  (:'modE', 'mod-e@test.uz', '{"name":"Moderator E"}'),
  (:'modF', 'mod-f@test.uz', '{"name":"Moderator F"}')
on conflict (id) do nothing;

update public.profiles set role = 'moderator' where id in (:'modE', :'modF');


-- ═══ 1. Variant soni endi 2..5 — lekin 1 va 6 emas ═════════════════════
do $$
declare ok boolean;
begin
  -- ikkita variant — ruxsat (hujjatda 49 ta shunday savol bor)
  insert into public.questions (ref, topic_id, text, options, correct, state)
  select '#T401', t.id, 'Ikki variantli savol — ruxsat etilishi kerak',
         array['Ha, buzdi','Yo''q, buzmadi'], 1, 'draft'
  from public.topics t limit 1;

  ok := false;
  begin
    insert into public.questions (ref, topic_id, text, options, correct, state)
    select '#T402', t.id, 'Bitta variantli savol — bo''lmasligi kerak',
           array['Yagona variant'], 0, 'draft'
    from public.topics t limit 1;
  exception when check_violation then ok := true;
  end;
  if not ok then raise exception 'XATO: bitta variantli savol o''tib ketdi'; end if;

  ok := false;
  begin
    insert into public.questions (ref, topic_id, text, options, correct, state)
    select '#T403', t.id, 'Olti variantli savol — bo''lmasligi kerak',
           array['a','b','c','d','e','f'], 0, 'draft'
    from public.topics t limit 1;
  exception when check_violation then ok := true;
  end;
  if not ok then raise exception 'XATO: olti variantli savol o''tib ketdi'; end if;
  raise notice '1 ✔ variant soni 2..5 bilan chegaralangan';
end $$;


-- ═══ 2. correct massiv uzunligiga bog'liq ══════════════════════════════
--
--  Ilgari chegara qattiq "0..3" edi. Endi u massiv uzunligidan kelib
--  chiqadi — aks holda 2 variantli savolga correct=3 yozib qo'yish mumkin
--  bo'lardi va ilova bo'sh javobni to'g'ri deb ko'rsatardi.
do $$
declare ok boolean := false;
begin
  begin
    insert into public.questions (ref, topic_id, text, options, correct, state)
    select '#T404', t.id, 'Ikki variant, lekin kalit uchinchisini ko''rsatadi',
           array['Birinchi','Ikkinchi'], 2, 'draft'
    from public.topics t limit 1;
  exception when check_violation then ok := true;
  end;
  if not ok then raise exception 'XATO: chegaradan tashqaridagi kalit o''tib ketdi'; end if;

  -- besh variantli savolda correct=4 esa to'g'ri
  insert into public.questions (ref, topic_id, text, options, correct, state)
  select '#T405', t.id, 'Besh variantli savol, oxirgisi to''g''ri',
         array['a','b','c','d','to''g''ri'], 4, 'draft'
  from public.topics t limit 1;
  raise notice '2 ✔ kalit massiv uzunligi bilan bog''liq';
end $$;


-- ═══ 3. Avtomatik kalit bilan NASHR ETIB BO'LMAYDI ═════════════════════
--
--  Bu migratsiyaning asosiy maqsadi. Savol 301 tasi hujjatdan olingan
--  kalit bilan keldi (key_source = 'docx-geometry'). Kalitni odam
--  tekshirmaguncha savol foydalanuvchiga chiqmasligi kerak — hatto
--  to'rt ko'z qoidasi bajarilgan bo'lsa ham.
insert into public.questions (ref, topic_id, text, options, correct, state, key_source, updated_by)
select '#T406', t.id, 'Hujjatdan olingan kalitli savol — nashr etilmasin',
       array['Birinchi','Ikkinchi','Uchinchi'], 2, 'draft', 'docx-geometry', :'modE'
from public.topics t limit 1;

set role authenticated;
set request.jwt.claim.sub = :'modF';   -- BOSHQA odam: to'rt ko'z bajarildi

do $$
declare ok boolean := false;
begin
  begin
    update public.questions set state = 'published' where ref = '#T406';
  exception when check_violation then ok := true;
  end;
  if not ok then
    raise exception 'XATO: avtomatik kalitli savol nashr etildi — eng xavfli teshik';
  end if;
  raise notice '3 ✔ key_source = docx-geometry bo''lgan savol nashr etilmaydi';
end $$;

-- Kalitni odam tuzatsa — manba 'human' bo'ladi va nashr yo'li ochiladi.
update public.questions set correct = 1 where ref = '#T406';

do $$
declare src text; st public.question_state;
begin
  select key_source, state into src, st from public.questions where ref = '#T406';
  if src <> 'human' then raise exception 'XATO: kalitni odam o''zgartirdi, manba hali ham %', src; end if;
  if st <> 'review' then raise exception 'XATO: kalit o''zgardi, lekin holat % (review kutilgan)', st; end if;
  raise notice '4 ✔ kalitga odam tekkanda manba human bo''ladi va savol ko''rib chiqishga qaytadi';
end $$;

reset role;
reset request.jwt.claim.sub;


-- ═══ 5. Kalitsiz savol ham nashr etilmaydi ═════════════════════════════
insert into public.questions (ref, topic_id, text, options, correct, state, key_source, updated_by)
select '#T407', t.id, 'Kaliti umuman yo''q savol — nashr etilmasin',
       array['Birinchi','Ikkinchi','Uchinchi'], null, 'draft', 'human', :'modE'
from public.topics t limit 1;

set role authenticated;
set request.jwt.claim.sub = :'modF';

do $$
declare ok boolean := false;
begin
  begin
    update public.questions set state = 'published' where ref = '#T407';
  exception when check_violation then ok := true;
  end;
  if not ok then raise exception 'XATO: kalitsiz savol nashr etildi'; end if;
  raise notice '5 ✔ correct = null bo''lgan savol nashr etilmaydi';
end $$;

reset role;
reset request.jwt.claim.sub;


-- ═══ 6. Tarjimadagi variant soni asl savolnikiga teng bo'lishi shart ════
--
--  Mos kelmasa rus tilidagi foydalanuvchi boshqa javobni bosadi: kalit
--  o'rin raqami, matn esa boshqa massivda.
do $$
declare ok boolean := false;
begin
  begin
    insert into public.question_translations (question_id, lang, text, options)
    select id, 'ru', 'Вопрос с двумя вариантами', array['Первый','Второй']
    from public.questions where ref = '#T406';       -- savolda 3 ta variant
  exception when raise_exception then ok := true;
  end;
  if not ok then raise exception 'XATO: variant soni mos kelmagan tarjima yozildi'; end if;

  insert into public.question_translations (question_id, lang, text, options)
  select id, 'ru', 'Вопрос с тремя вариантами', array['Первый','Второй','Третий']
  from public.questions where ref = '#T406';
  raise notice '6 ✔ tarjima variantlari soni asl savolnikiga teng bo''lishi shart';
end $$;


-- ═══ 7. Seed haqiqatan ham foydalanuvchiga ko'rinmaydi ═════════════════
do $$
declare n int;
begin
  select count(*) into n
    from public.published_questions
   where ref like '#A%';
  if n <> 0 then
    raise exception 'XATO: hujjatdan olingan % ta savol foydalanuvchiga ko''rinyapti', n;
  end if;
  select count(*) into n from public.questions where key_source = 'docx-geometry';
  if n < 100 then raise exception 'XATO: bank seed qo''llanmagan (% ta savol)', n; end if;
  raise notice '7 ✔ bankdagi % ta savolning hech biri nashr etilmagan', n;
end $$;


-- ═══ 8. Klient koʻrinishida `image` ustuni bor ═════════════════════════
--
--  published_questions — KO'RINISH (view). PostgreSQL ko'rinishi yangi
--  ustunni o'zi olmaydi: u yaratilgan paytdagi ro'yxatni eslab qoladi.
--  Ustun bo'lmasa klient `select=...,image` deb so'raganda 400 oladi va
--  savollar UMUMAN yuklanmaydi — ilova APK ichidagi 10 savolda qolib
--  ketadi. Shuning uchun 0005_image_view.sql yozilgan.
do $$
declare n int;
begin
  select count(*) into n from information_schema.columns
   where table_schema = 'public' and table_name = 'published_questions'
     and column_name = 'image';
  if n <> 1 then
    raise exception 'XATO: published_questions koʻrinishida image ustuni yoʻq — klient savollarni yuklay olmaydi';
  end if;
  raise notice '8 ✔ published_questions koʻrinishi image ustunini beradi';
end $$;


-- ── Tozalash ──
delete from public.questions where ref like '#T4%';

do $$ begin raise notice '';
  raise notice '✅ 0004_bank.sql tekshiruvi to''liq o''tdi';
end $$;
