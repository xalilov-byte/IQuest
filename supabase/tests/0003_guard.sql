-- ═══════════════════════════════════════════════════════════════════════
--  NAZARIY — 0003_guard.sql migratsiyasining tekshiruvi
--
--  0001 dagi "to'rt ko'z" qoidasi uch yo'l bilan chetlab o'tilardi. Uchala
--  yo'l ham HAQIQIY so'rov bilan tasdiqlangan edi — shuning uchun ular
--  endi doimiy test bo'lib qoladi. Aks holda triggerni kelajakda kim
--  bo'lmasin qayta yozganda teshik jimgina qaytadi.
--
--  Qanday ishga tushiriladi:
--    psql -f supabase/tests/_stub.sql
--    psql -f supabase/migrations/0001_init.sql
--    psql -f supabase/migrations/0003_guard.sql
--    psql -f supabase/seed/0002_questions.sql
--    psql -f supabase/tests/0003_guard.sql      -- shu fayl
--
--  O'z foydalanuvchilarini va o'z savolini (#902) yaratadi, shuning
--  uchun 0001_rls.sql dan keyin ham bemalol ishlaydi. TARTIB MUHIM:
--  0001 profil va savol sonini ANIQ raqam bilan tekshiradi, shuning
--  uchun u birinchi ishlashi kerak.
-- ═══════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on

\set modC '55555555-5555-5555-5555-555555555555'
\set modD '66666666-6666-6666-6666-666666666666'

insert into auth.users (id, email, raw_user_meta_data) values
  (:'modC', 'mod-c@test.uz', '{"name":"Moderator C"}'),
  (:'modD', 'mod-d@test.uz', '{"name":"Moderator D"}')
on conflict (id) do nothing;

update public.profiles set role = 'moderator' where id in (:'modC', :'modD');


-- ═══ 1. INSERT bilan darhol nashr etish — TO'SILISHI KERAK ═════════════
--
--  Eski guard faqat UPDATE ichida tekshirardi. Moderator bitta INSERT
--  bilan state='published' yozib, savolni ikkinchi odam tasdig'isiz
--  ilovaga chiqarardi.

set role authenticated;
set request.jwt.claim.sub = :'modC';

do $$
declare blocked boolean := false;
begin
  begin
    insert into public.questions (ref, topic_id, text, options, correct, state)
    select '#903', t.id, 'INSERT bilan darhol nashr — bo''lmasligi kerak',
           array['A varianti','B varianti','C varianti','D varianti'], 0, 'published'
    from public.topics t limit 1;
  exception when others then blocked := true;
  end;
  if not blocked then
    raise exception
      'FAIL: moderator bitta INSERT bilan savolni darhol nashr etdi — to''rt ko''z chetlab o''tildi';
  end if;
end $$;

-- Halol yo'l esa ishlashi kerak: qoralama sifatida kiritish.
insert into public.questions (ref, topic_id, text, options, correct, state)
select '#902', t.id, 'Chorrahada svetofor yashil yonganda nima qilasiz?',
       array['To''xtayman','Harakatni davom ettiraman','Signal beraman','Orqaga qaytaman'],
       1, 'draft'
from public.topics t limit 1;

reset role;
reset request.jwt.claim.sub;


-- Ikkinchi odam nashr etadi — bu ruxsat etilgan.
set role authenticated;
set request.jwt.claim.sub = :'modD';
update public.questions set state = 'published' where ref = '#902';
reset role;
reset request.jwt.claim.sub;

do $$
begin
  if (select state from public.questions where ref = '#902') <> 'published' then
    raise exception 'FAIL: halol yo''l buzildi — ikkinchi moderator nashr eta olmadi';
  end if;
end $$;


-- ═══ 2. options MASSIVINI ALMASHTIRISH — KO'RIB CHIQISHGA QAYTSIN ══════
--
--  `correct` — massiv ichidagi O'RIN. Variantlarni joyini almashtirish
--  correct ni o'zgartirmaydi, lekin JAVOBNI o'zgartiradi:
--    oldin: correct=1 → "Harakatni davom ettiraman"  (to'g'ri)
--    keyin: correct=1 → "To'xtayman"                 (noto'g'ri)
--  Eski guard buni ko'rmasdi va savol `published` bo'lib qolardi.

set role authenticated;
set request.jwt.claim.sub = :'modC';

update public.questions
   set options = array['Harakatni davom ettiraman','To''xtayman','Signal beraman','Orqaga qaytaman']
 where ref = '#902';

reset role;
reset request.jwt.claim.sub;

do $$
declare st text;
begin
  select state into st from public.questions where ref = '#902';
  if st <> 'review' then
    raise exception
      'FAIL: javob variantlari almashtirildi, lekin savol nashrda qoldi (holat: %)', st;
  end if;
  if (select reviewed_by from public.questions where ref = '#902') is not null then
    raise exception 'FAIL: variantlar almashtirilganda oldingi tasdiq bekor qilinmadi';
  end if;
  if (select key_changed_at from public.questions where ref = '#902') is null then
    raise exception 'FAIL: variantlar almashtirilganda key_changed_at yozilmadi';
  end if;
end $$;

-- Qayta nashr etamiz — keyingi tekshiruv nashr etilgan savolni talab qiladi.
set role authenticated;
set request.jwt.claim.sub = :'modD';
update public.questions set state = 'published' where ref = '#902';
reset role;
reset request.jwt.claim.sub;


-- ═══ 3. TARJIMA ORQALI KALITNI O'ZGARTIRISH ════════════════════════════
--
--  Ruscha javob varianti ham javob kalitidir, lekin question_translations
--  da na guard, na audit triggeri bor edi: rus tilidagi foydalanuvchi
--  uchun kalit o'zgarardi, hech kim tasdiqlamasdi va jurnalda iz
--  qolmasdi.

-- 3a. Nashr etilgan savolga yangi tarjima qo'shish ham ko'rib chiqishni
--     talab qiladi — u yangi javob kaliti.
set role authenticated;
set request.jwt.claim.sub = :'modC';

insert into public.question_translations (question_id, lang, text, options)
select id, 'ru', 'Что вы сделаете на зелёный сигнал светофора?',
       array['Остановлюсь','Продолжу движение','Подам сигнал','Сдам назад']
from public.questions where ref = '#902';

reset role;
reset request.jwt.claim.sub;

do $$
begin
  if (select state from public.questions where ref = '#902') <> 'review' then
    raise exception
      'FAIL: nashr etilgan savolga yangi javob kaliti (tarjima) tasdiqsiz qo''shildi';
  end if;
end $$;

set role authenticated;
set request.jwt.claim.sub = :'modD';
update public.questions set state = 'published' where ref = '#902';
reset role;
reset request.jwt.claim.sub;


-- 3b. Mavjud tarjimaning variantlarini almashtirish — asosiy hujum.
set role authenticated;
set request.jwt.claim.sub = :'modC';

update public.question_translations
   set options = array['Продолжу движение','Остановлюсь','Подам сигнал','Сдам назад']
 where lang = 'ru'
   and question_id = (select id from public.questions where ref = '#902');

reset role;
reset request.jwt.claim.sub;

do $$
declare st text;
begin
  select state into st from public.questions where ref = '#902';
  if st <> 'review' then
    raise exception
      'FAIL: tarjima kaliti o''zgardi, savol esa nashrda qoldi (holat: %)', st;
  end if;

  -- Jurnalda iz qolishi kerak — 0001 boshidagi asosiy qoida.
  if not exists (
    select 1 from public.audit_log
     where resource = '#902'
       and action = 'tarjima javob variantlari o''zgartirildi (ru)'
  ) then
    raise exception 'FAIL: tarjima kalitining o''zgarishi audit jurnaliga tushmadi';
  end if;
  if not exists (
    select 1 from public.audit_log
     where resource = '#902' and action = 'tarjima qo''shildi (ru)'
  ) then
    raise exception 'FAIL: tarjima qo''shilishi audit jurnaliga tushmadi';
  end if;
end $$;


-- 3c. Faqat izoh o'zgarsa savol nashrda qolishi kerak — guard haddan
--     tashqari qattiq bo'lmasligi ham tekshiriladi.
set role authenticated;
set request.jwt.claim.sub = :'modD';
update public.questions set state = 'published' where ref = '#902';
reset role;
reset request.jwt.claim.sub;

set role authenticated;
set request.jwt.claim.sub = :'modC';
update public.question_translations
   set explain = 'Зелёный сигнал разрешает движение.'
 where lang = 'ru'
   and question_id = (select id from public.questions where ref = '#902');
reset role;
reset request.jwt.claim.sub;

do $$
begin
  if (select state from public.questions where ref = '#902') <> 'published' then
    raise exception
      'FAIL: faqat izoh o''zgardi, lekin savol keraksiz ravishda ko''rib chiqishga tushdi';
  end if;
end $$;


-- 3d. Hech narsa o'zgarmagan UPDATE jurnalga tushmasligi kerak.
--     Seed tarjimalarni `on conflict do update` bilan yozadi, ya'ni
--     apply.sh har ishga tushganda bir xil matn qayta yoziladi. Filtrsiz
--     bu har safar 10 ta bo'sh yozuv qo'shardi va jurnal — himoyaning
--     eng muhim qismi — shovqinga ko'milardi.
create temp table _n_before as select count(*) as n from public.audit_log;

set role authenticated;
set request.jwt.claim.sub = :'modC';

update public.question_translations
   set text = text, options = options, explain = explain, updated_at = now()
 where lang = 'ru'
   and question_id = (select id from public.questions where ref = '#902');

reset role;
reset request.jwt.claim.sub;

do $$
declare n_before int := (select n from _n_before);
        n_after  int;
begin
  select count(*) into n_after from public.audit_log;
  if n_after <> n_before then
    raise exception
      'FAIL: hech narsa o''zgarmagan tarjima UPDATE''i jurnalga % ta yozuv qo''shdi',
      n_after - n_before;
  end if;
  if (select state from public.questions where ref = '#902') <> 'published' then
    raise exception
      'FAIL: bo''sh UPDATE savolni keraksiz ravishda ko''rib chiqishga tushirdi';
  end if;
end $$;


-- ═══ 4. tg_id RO'YXATDAN O'TISH META-MA'LUMOTIDAN OLINMAYDI ════════════
--
--  raw_user_meta_data ni klient signUp() da o'zi to'ldiradi. tg_id ni
--  undan olish boshqa odamning Telegram hisobini oldindan egallash
--  imkonini berardi.

insert into auth.users (id, email, raw_user_meta_data) values
  ('77777777-7777-7777-7777-777777777777', 'hujumchi@test.uz',
   '{"name":"Hujumchi","tg_id":123456789,"role":"owner"}');

do $$
declare p record;
begin
  select * into p from public.profiles
   where id = '77777777-7777-7777-7777-777777777777';

  if p.tg_id is not null then
    raise exception
      'FAIL: tg_id klient meta-ma''lumotidan olindi — hisobni oldindan egallash mumkin';
  end if;
  if p.role <> 'user' then
    raise exception 'FAIL: role klient meta-ma''lumotidan olindi (%)', p.role;
  end if;
  if p.name <> 'Hujumchi' then
    raise exception 'FAIL: name yozilmadi — trigger butunlay ishlamayapti';
  end if;
end $$;


-- ═══ 5. SAVOL MATNIGA YUQORI CHEGARA ═══════════════════════════════════
--
--  2 MB'lik savol bazaga tushsa, u har bir foydalanuvchining keshiga
--  ketardi va ~5 MB chegarasiga urilib offline rejimni o'chirardi.

do $$
declare blocked boolean := false;
begin
  begin
    insert into public.questions (topic_id, text, options, correct)
    select id, repeat('a', 600), array['a','b','c','d'], 0
    from public.topics limit 1;
  exception when others then blocked := true;
  end;
  if not blocked then
    raise exception 'FAIL: 600 belgilik savol qabul qilindi — yuqori chegara yo''q';
  end if;
end $$;


select 'GUARD TEKSHIRUVLARI O''TDI' as natija;
