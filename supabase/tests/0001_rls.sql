-- ═══════════════════════════════════════════════════════════════════════
--  NAZARIY — migratsiya tekshiruvi (RLS va "to'rt ko'z" qoidasi)
--
--  Nima uchun kerak: klient "publishable" kalit bilan ishlaydi va u
--  kalit hammaga ko'rinadi. Ya'ni ma'lumotni faqat RLS himoya qiladi.
--  "RLS yozdim" degan gap yetarli emas — u HAQIQATAN to'sayotganini
--  tekshirish kerak, aks holda butun himoya faqat taxminga tayanadi.
--
--  Qanday ishga tushiriladi (lokal Postgres'da, CI shu bilan tekshiradi):
--    psql -f supabase/tests/_stub.sql        -- Supabase auth taqlidi
--    psql -f supabase/migrations/0001_init.sql
--    psql -f supabase/seed/0002_questions.sql
--    psql -f supabase/tests/0001_rls.sql     -- shu fayl
--
--  Xato bo'lsa skript "FAIL: …" bilan yiqiladi.
-- ═══════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on

-- ── Sinov foydalanuvchilari ────────────────────────────────────────────
-- auth.users'ga qo'shish profil yaratuvchi triggerni ishga tushiradi.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'oddiy@test.uz',   '{"name":"Oddiy"}'),
  ('22222222-2222-2222-2222-222222222222', 'mod-a@test.uz',   '{"name":"Moderator A"}'),
  ('33333333-3333-3333-3333-333333333333', 'mod-b@test.uz',   '{"name":"Moderator B"}'),
  ('44444444-4444-4444-4444-444444444444', 'auditor@test.uz', '{"name":"Auditor"}');

do $$
begin
  if (select count(*) from public.profiles) <> 4 then
    raise exception 'FAIL: profil yaratuvchi trigger ishlamadi (kutilgan 4, bor %)',
      (select count(*) from public.profiles);
  end if;
end $$;

update public.profiles set role = 'moderator' where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set role = 'moderator' where id = '33333333-3333-3333-3333-333333333333';
update public.profiles set role = 'auditor'   where id = '44444444-4444-4444-4444-444444444444';

-- Qoralama savol qo'shamiz (egasi huquqi bilan, RLS'dan tashqari) —
-- keyin uni ommaga KO'RINMASLIGINI tekshiramiz.
insert into public.questions (ref, topic_id, text, options, correct, state, updated_by)
select '#900', t.id, 'Bu qoralama savol — ommaga ko''rinmasligi kerak',
       array['A varianti', 'B varianti', 'C varianti', 'D varianti'], 0, 'draft',
       '22222222-2222-2222-2222-222222222222'
from public.topics t where t.slug = 'svetofor';


-- ═══ 1. ANON (kirmagan foydalanuvchi) ══════════════════════════════════
set role anon;

do $$
begin
  -- Nashr etilganlar ko'rinadi
  if (select count(*) from public.questions) <> 10 then
    raise exception 'FAIL: anon nashr etilgan 10 savolni ko''rishi kerak, ko''rdi %',
      (select count(*) from public.questions);
  end if;
  -- Qoralama KO'RINMAYDI
  if exists (select 1 from public.questions where ref = '#900') then
    raise exception 'FAIL: anon qoralama savolni ko''rdi — RLS teshik';
  end if;
  -- Mavzular ko'rinadi (ilova birinchi ochilishda ularga muhtoj).
  -- ANIQ SON tekshirilmaydi: yangi seed yangi mavzu qo'shadi va bu
  -- tekshiruvning maqsadi "anon mavzularni ko'ra oladimi", "nechta
  -- mavzu bor" emas. 0002 dagi sakkiztasi — eng kam chegara.
  if (select count(*) from public.topics) < 8 then
    raise exception 'FAIL: anon mavzularni ko''rmadi (% ta)',
      (select count(*) from public.topics);
  end if;
  -- Tarjimalar ko'rinadi
  if (select count(*) from public.question_translations) <> 10 then
    raise exception 'FAIL: anon tarjimalarni ko''rmadi';
  end if;
end $$;

-- Anon yozishga urinsa — to'silishi kerak
do $$
declare blocked boolean := false;
begin
  begin
    insert into public.questions (topic_id, text, options, correct)
    select id, 'Anon qo''shgan savol — bo''lmasligi kerak',
           array['a','b','c','d'], 0 from public.topics limit 1;
  exception when others then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: anon savol qo''sha oldi'; end if;
end $$;

-- Anon jurnalni ko'rmasligi kerak
do $$
begin
  if exists (select 1 from public.audit_log) then
    raise exception 'FAIL: anon audit jurnalini ko''rdi';
  end if;
end $$;

-- Anon profillarni ko'rmasligi kerak
do $$
begin
  if exists (select 1 from public.profiles) then
    raise exception 'FAIL: anon profillarni ko''rdi';
  end if;
end $$;

reset role;


-- ═══ 2. ODDIY FOYDALANUVCHI ════════════════════════════════════════════
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

do $$
declare blocked boolean := false;
begin
  -- O'z profilini ko'radi
  if (select count(*) from public.profiles) <> 1 then
    raise exception 'FAIL: foydalanuvchi faqat o''z profilini ko''rishi kerak, ko''rdi %',
      (select count(*) from public.profiles);
  end if;

  -- Savol qo'sha olmaydi
  begin
    insert into public.questions (topic_id, text, options, correct)
    select id, 'Oddiy foydalanuvchi qo''shgan savol', array['a','b','c','d'], 0
    from public.topics limit 1;
  exception when others then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: oddiy foydalanuvchi savol qo''sha oldi'; end if;
end $$;

-- O'zini "owner" qilib qo'ya olmasligi kerak — eng muhim tekshiruv
do $$
declare blocked boolean := false;
begin
  begin
    update public.profiles set role = 'owner'
    where id = '11111111-1111-1111-1111-111111111111';
    if (select role from public.profiles where id = '11111111-1111-1111-1111-111111111111') = 'owner' then
      blocked := false;
    else
      blocked := true;
    end if;
  exception when others then blocked := true;
  end;
  if not blocked then
    raise exception 'FAIL: foydalanuvchi o''ziga owner rolini bera oldi — eng og''ir teshik';
  end if;
end $$;

reset role;
reset request.jwt.claim.sub;


-- ═══ 3. MODERATOR: savol qo'shish ══════════════════════════════════════
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

insert into public.questions (ref, topic_id, text, options, correct, state)
select '#901', t.id, 'Moderator A qo''shgan sinov savoli matni',
       array['A varianti', 'B varianti', 'C varianti', 'D varianti'], 1, 'review'
from public.topics t where t.slug = 'svetofor';

do $$
begin
  if not exists (select 1 from public.questions where ref = '#901') then
    raise exception 'FAIL: moderator savol qo''sha olmadi';
  end if;
  -- Moderator qoralamalarni ham ko'radi
  if not exists (select 1 from public.questions where ref = '#900') then
    raise exception 'FAIL: moderator qoralama savolni ko''rmadi';
  end if;
end $$;


-- ═══ 4. TO'RT KO'Z QOIDASI ═════════════════════════════════════════════
-- Moderator A savolni kiritdi → o'zi nashr eta OLMAYDI.
do $$
declare blocked boolean := false;
begin
  begin
    update public.questions set state = 'published' where ref = '#901';
  exception when others then blocked := true;
  end;
  if not blocked then
    raise exception 'FAIL: to''rt ko''z qoidasi ishlamadi — o''z o''zgarishini o''zi nashr etdi';
  end if;
end $$;

reset role;
reset request.jwt.claim.sub;

-- Moderator B esa nashr eta oladi
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

update public.questions set state = 'published' where ref = '#901';

do $$
begin
  if (select state from public.questions where ref = '#901') <> 'published' then
    raise exception 'FAIL: boshqa moderator nashr eta olmadi';
  end if;
  if (select reviewed_by from public.questions where ref = '#901')
     <> '33333333-3333-3333-3333-333333333333' then
    raise exception 'FAIL: reviewed_by tasdiqlagan odamga yozilmadi';
  end if;
end $$;


-- ═══ 5. JAVOB KALITI O'ZGARSA — MAJBURAN KO'RIB CHIQISHGA ══════════════
update public.questions set correct = 2 where ref = '#901';

do $$
begin
  if (select state from public.questions where ref = '#901') <> 'review' then
    raise exception 'FAIL: javob kaliti o''zgardi, lekin savol ko''rib chiqishga qaytmadi (holat: %)',
      (select state from public.questions where ref = '#901');
  end if;
  if (select reviewed_by from public.questions where ref = '#901') is not null then
    raise exception 'FAIL: kalit o''zgarganda oldingi tasdiq bekor qilinmadi';
  end if;
  if (select key_changed_at from public.questions where ref = '#901') is null then
    raise exception 'FAIL: key_changed_at yozilmadi';
  end if;
end $$;

reset role;
reset request.jwt.claim.sub;


-- ═══ 6. AUDIT JURNALI ══════════════════════════════════════════════════
-- Har bir o'zgarish jurnalga tushgan bo'lishi kerak.
set role authenticated;
set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';   -- auditor

do $$
declare n int;
begin
  select count(*) into n from public.audit_log;
  -- 10 seed + 1 qoralama + 1 moderator savoli + nashr + kalit o'zgarishi
  if n < 14 then
    raise exception 'FAIL: audit jurnalida yozuv yetishmaydi (bor %, kutilgan >= 14)', n;
  end if;

  if not exists (
    select 1 from public.audit_log
    where action = 'javob kaliti o''zgartirildi' and resource = '#901'
  ) then
    raise exception 'FAIL: javob kaliti o''zgarishi jurnalga tushmadi';
  end if;

  if not exists (
    select 1 from public.audit_log
    where resource = '#901' and action like 'savol holati:%published%'
  ) then
    raise exception 'FAIL: nashr etish jurnalga tushmadi';
  end if;
end $$;

-- Auditor jurnalni o'zgartira olmasligi kerak
do $$
declare blocked boolean := false;
begin
  begin
    delete from public.audit_log where resource = '#901';
    if not exists (select 1 from public.audit_log where resource = '#901') then
      blocked := false;
    else
      blocked := true;
    end if;
  exception when others then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: audit jurnali yozuvi o''chirildi'; end if;
end $$;

reset role;
reset request.jwt.claim.sub;


-- ═══ 7. MA'LUMOT BUTUNLIGI ═════════════════════════════════════════════
do $$
declare blocked boolean := false;
begin
  /* Variant soni: 0004_bank.sql dan boshlab 2..5 (rasmiy avtotest
     to'plamida 2, 3, 4 va 5 variantli savollar bor). Chegara baribir
     bor — bitta variantli "savol" yarim yozilgan savol. */
  begin
    insert into public.questions (topic_id, text, options, correct)
    select id, 'Bitta variantli savol — qabul qilinmasligi kerak',
           array['yagona'], 0 from public.topics limit 1;
  exception when others then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: 1 variantli savol qabul qilindi'; end if;

  -- Javob kaliti massiv uzunligidan tashqarida bo'lmasligi kerak
  blocked := false;
  begin
    insert into public.questions (topic_id, text, options, correct)
    select id, 'Kaliti 9 bo''lgan savol — qabul qilinmasligi kerak',
           array['a','b','c','d'], 9 from public.topics limit 1;
  exception when others then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: kaliti diapazondan tashqari savol qabul qilindi'; end if;

  -- Juda qisqa savol matni
  blocked := false;
  begin
    insert into public.questions (topic_id, text, options, correct)
    select id, 'Qisqa', array['a','b','c','d'], 0 from public.topics limit 1;
  exception when others then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: juda qisqa savol qabul qilindi'; end if;
end $$;


select 'HAMMA TEKSHIRUV O''TDI' as natija;
