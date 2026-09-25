-- ═══════════════════════════════════════════════════════════════════════
--  ZUKKO — og'zaki savollar: RLS va "to'rt ko'z" qoidasi tekshiruvi
--
--  Har bo'lim — haqiqiy hujum: moderator o'z savolini o'zi nashr etishga,
--  tasdiqni soxtalashtirishga, nashrdagi savolning kalitini jimgina
--  almashtirishga urinadi; anon va oddiy foydalanuvchi qoralamani
--  o'qishga va yozishga urinadi.
--
--  Ikki qatlamli himoyalarda (masalan INSERT bilan darhol nashr: trigger
--  + siyosat + CHECK) har qatlam ALOHIDA tekshiriladi va kutilgan xato
--  turi aniq ushlanadi: bitta qatlam olib tashlansa, boshqa xato chiqadi
--  va test yiqiladi (supabase/tests/run.sh dagi mutantlar buni isbotlaydi).
--
--  Bitta tranzaksiya, oxirida ROLLBACK — bazada iz qolmaydi.
-- ═══════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on
\set QUIET on

do $$ begin
  if coalesce(obj_description('auth'::regnamespace, 'pg_namespace'), '') <> 'zukko-local-stub' then
    raise exception 'TO''XTATILDI: bu test faqat lokal taqlid bazasida ishlaydi (supabase/tests/_stub.sql)';
  end if;
end $$;

begin;

\set su    'reset role; set request.jwt.claim.sub = ''''; set request.jwt.claims = '''';'
\set anon  'reset role; set request.jwt.claim.sub = ''''; set request.jwt.claims = ''''; set role anon;'
\set as_u1 'reset role; set request.jwt.claims = ''''; set request.jwt.claim.sub = ''bbbbbbbb-0000-0000-0000-000000000001''; set role authenticated;'
\set as_a  'reset role; set request.jwt.claims = ''''; set request.jwt.claim.sub = ''bbbbbbbb-0000-0000-0000-00000000000a''; set role authenticated;'
\set as_b  'reset role; set request.jwt.claims = ''''; set request.jwt.claim.sub = ''bbbbbbbb-0000-0000-0000-00000000000b''; set role authenticated;'
\set as_c  'reset role; set request.jwt.claims = ''''; set request.jwt.claim.sub = ''bbbbbbbb-0000-0000-0000-00000000000c''; set role authenticated;'
\set as_aud 'reset role; set request.jwt.claims = ''''; set request.jwt.claim.sub = ''bbbbbbbb-0000-0000-0000-00000000000d''; set role authenticated;'
\set as_own 'reset role; set request.jwt.claims = ''''; set request.jwt.claim.sub = ''bbbbbbbb-0000-0000-0000-00000000000e''; set role authenticated;'

:su

create function pg_temp.visible(q text) returns bigint language plpgsql as $$
declare n bigint;
begin
  begin
    execute 'select count(*) from (' || q || ') x' into n;
  exception when insufficient_privilege then n := 0;
  end;
  return n;
end $$;

-- To'g'ri savol + ixtiyoriy o'zgartirishlar. Joriy rol huquqi bilan
-- yoziladi — ya'ni RLS, trigger va CHECK'lar to'liq ishlaydi.
create function pg_temp.base_item(k text) returns jsonb language sql as $$
  select jsonb_build_object(
    'key', k, 'kind', 'analogy', 'level', 4,
    'uz_prompt', 'Munosabatni davom ettiring', 'uz_stimulus', 'Kitob : o''qimoq = qalam : ?',
    'uz_options', jsonb_build_array('Yozmoq', 'Sotmoq', 'Sindirmoq', 'Yo''qotmoq'),
    'ru_prompt', 'Продолжите отношение', 'ru_stimulus', 'Книга : читать = ручка : ?',
    'ru_options', jsonb_build_array('Писать', 'Продавать', 'Ломать', 'Терять'),
    'correct', 0,
    'explain_uz', 'Kitob o''qiladi, qalam bilan yoziladi.',
    'explain_ru', 'Книгу читают, ручкой пишут.',
    'state', 'draft');
$$;

create function pg_temp.new_item(j jsonb) returns void language plpgsql as $$
begin
  insert into public.verbal_items
    (key, kind, level, uz_prompt, uz_stimulus, uz_options, ru_prompt, ru_stimulus, ru_options,
     correct, explain_uz, explain_ru, state,
     author_id, content_by, reviewed_by, published_at)
  select r.key, r.kind, r.level, r.uz_prompt, r.uz_stimulus, r.uz_options,
         r.ru_prompt, r.ru_stimulus, r.ru_options, r.correct, r.explain_uz, r.explain_ru, r.state,
         r.author_id, r.content_by, r.reviewed_by, r.published_at
    from jsonb_populate_record(null::public.verbal_items, j) r;
end $$;

create function pg_temp.st(k text) returns text language sql as $$
  select state::text from public.verbal_items where key = k;
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'u1@v.uz',  '{"name":"Foydalanuvchi"}'),
  ('bbbbbbbb-0000-0000-0000-00000000000a', 'a@v.uz',   '{"name":"Moderator A"}'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'b@v.uz',   '{"name":"Moderator B"}'),
  ('bbbbbbbb-0000-0000-0000-00000000000c', 'c@v.uz',   '{"name":"Moderator C"}'),
  ('bbbbbbbb-0000-0000-0000-00000000000d', 'd@v.uz',   '{"name":"Auditor"}'),
  ('bbbbbbbb-0000-0000-0000-00000000000e', 'e@v.uz',   '{"name":"Egasi"}');
update public.profiles set role = 'moderator'
 where id in ('bbbbbbbb-0000-0000-0000-00000000000a', 'bbbbbbbb-0000-0000-0000-00000000000b',
              'bbbbbbbb-0000-0000-0000-00000000000c');
update public.profiles set role = 'auditor' where id = 'bbbbbbbb-0000-0000-0000-00000000000d';
update public.profiles set role = 'owner'   where id = 'bbbbbbbb-0000-0000-0000-00000000000e';


-- ═══ 0. SEED: hammasi qoralama va ommaga ko'rinmaydi ═══════════════════
create temp table _seed as
  select key from public.verbal_items where author_id is null;
grant select on _seed to anon, authenticated;

do $$ begin
  if exists (select 1 from public.verbal_items where author_id is null and state <> 'draft') then
    raise exception 'FAIL: seed savoli qoralama emas — odam ko''rmagan savol nashrda';
  end if;
end $$;

:anon
do $$
begin
  if pg_temp.visible('select 1 from public.published_verbal p join _seed s using (key) where not p.retired') <> 0
     or pg_temp.visible('select 1 from public.verbal_items v join _seed s using (key)') <> 0 then
    raise exception 'FAIL: anon qoralama (seed) savolni ko''rdi';
  end if;
  raise notice '0 ✔ seed (% ta) — hammasi qoralama, ommaga ko''rinmaydi',
    (select count(*) from _seed);
end $$;


-- ═══ 1. ANON VA ODDIY FOYDALANUVCHI YOZA OLMAYDI ═══════════════════════
do $$
declare blocked boolean := false;
begin
  begin
    perform pg_temp.new_item(pg_temp.base_item('v90100'));
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: anon savol qo''sha oldi'; end if;
end $$;

:as_u1
do $$
declare blocked boolean := false;
begin
  begin
    perform pg_temp.new_item(pg_temp.base_item('v90101'));
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: oddiy foydalanuvchi savol qo''sha oldi'; end if;
  raise notice '1 ✔ anon va oddiy foydalanuvchi savol qo''sha olmaydi';
end $$;


-- ═══ 2. MODERATOR A QORALAMA YOZADI — tizim maydonlari soxtalanmaydi ════
:as_a
do $$ begin
  perform pg_temp.new_item(pg_temp.base_item('v90001') || jsonb_build_object(
    'author_id',    'bbbbbbbb-0000-0000-0000-00000000000b',
    'content_by',   'bbbbbbbb-0000-0000-0000-00000000000b',
    'reviewed_by',  'bbbbbbbb-0000-0000-0000-00000000000b',
    'published_at', now()));
  perform pg_temp.new_item(pg_temp.base_item('v90002'));
end $$;

:su
do $$
declare v record;
begin
  select * into v from public.verbal_items where key = 'v90001';
  if v.author_id <> 'bbbbbbbb-0000-0000-0000-00000000000a'
     or v.content_by <> 'bbbbbbbb-0000-0000-0000-00000000000a'
     or v.reviewed_by is not null or v.published_at is not null then
    raise exception 'FAIL: INSERT''da tizim maydonlari soxtalashtirildi (author %, content %, reviewed %)',
      v.author_id, v.content_by, v.reviewed_by;
  end if;
  raise notice '2 ✔ INSERT''da muallif/ko''rib chiquvchi maydonlarini klient yoza olmaydi';
end $$;

-- Anon va oddiy foydalanuvchi qoralamani ko'rmaydi.
:anon
do $$ begin
  if pg_temp.visible('select 1 from public.verbal_items where key in (''v90001'',''v90002'')') <> 0
     or pg_temp.visible('select 1 from public.published_verbal where key in (''v90001'',''v90002'')') <> 0 then
    raise exception 'FAIL: anon qoralama savolni ko''rdi — RLS teshik';
  end if;
end $$;
:as_u1
do $$ begin
  if pg_temp.visible('select 1 from public.verbal_items where key in (''v90001'',''v90002'')') <> 0 then
    raise exception 'FAIL: oddiy foydalanuvchi qoralama savolni ko''rdi';
  end if;
end $$;


-- ═══ 3. INSERT BILAN DARHOL NASHR — uch qatlam, har biri alohida ═══════
-- 3a. Oddiy hujum (hamma qatlam joyida).
:as_a
do $$ begin
  begin
    perform pg_temp.new_item(pg_temp.base_item('v90003') || '{"state":"published"}');
  exception when others then null;
  end;
  if exists (select 1 from public.verbal_items where key = 'v90003') then
    raise exception 'FAIL: moderator bitta INSERT bilan savolni darhol nashr etdi';
  end if;
end $$;

-- 3b. Faqat trigger: superuser (RLS'ni chetlab o'tadi) + tizimga kirgan
--     xodim sifatida; CHECK qondirilgan (ko'rib chiquvchi — boshqa odam).
:su
set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-00000000000a';
do $$
declare blocked boolean := false;
begin
  begin
    perform pg_temp.new_item(pg_temp.base_item('v90004') || jsonb_build_object(
      'state', 'published', 'reviewed_by', 'bbbbbbbb-0000-0000-0000-00000000000b', 'published_at', now()));
  exception
    when raise_exception then blocked := true;
    when check_violation then
      raise exception 'FAIL: qo''riqchi trigger INSERT bilan nashrni to''smadi (faqat CHECK ushladi)';
  end;
  if not blocked then raise exception 'FAIL: qo''riqchi trigger INSERT bilan nashrni to''smadi'; end if;
end $$;

-- 3c. Faqat siyosat: trigger vaqtincha o'chiriladi.
:su
alter table public.verbal_items disable trigger verbal_guard_trg;
:as_a
do $$
declare blocked boolean := false;
begin
  begin
    perform pg_temp.new_item(pg_temp.base_item('v90005') || jsonb_build_object(
      'state', 'published', 'reviewed_by', 'bbbbbbbb-0000-0000-0000-00000000000b', 'published_at', now()));
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: siyosat (triggersiz) INSERT bilan nashrni to''smadi'; end if;
end $$;
:su
alter table public.verbal_items enable trigger verbal_guard_trg;

-- 3d. Faqat CHECK: to'g'ridan-to'g'ri ulanish (auth.uid() null — trigger
--     istisnosi) o'zi yozib o'zi tasdiqlagan savolni ham nashrga qo'ya olmaydi.
do $$
declare blocked boolean := false;
begin
  begin
    perform pg_temp.new_item(pg_temp.base_item('v90006') || jsonb_build_object(
      'state', 'published', 'published_at', now(),
      'content_by',  'bbbbbbbb-0000-0000-0000-00000000000a',
      'reviewed_by', 'bbbbbbbb-0000-0000-0000-00000000000a'));
  exception when check_violation then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: CHECK o''z-o''zini tasdiqlagan nashrni to''smadi'; end if;
  raise notice '3 ✔ INSERT bilan darhol nashr: trigger, siyosat va CHECK — har biri alohida to''sadi';
end $$;


-- ═══ 4. TO'RT KO'Z: muallif o'zi nashr eta olmaydi ═════════════════════
:as_a
do $$
declare blocked boolean := false;
begin
  begin
    update public.verbal_items set state = 'published' where key = 'v90001';
  exception
    when raise_exception then blocked := true;
    when check_violation then
      raise exception 'FAIL: to''rt ko''z qo''riqchisi muallifni to''xtatmadi (faqat CHECK ushladi)';
  end;
  if not blocked or pg_temp.st('v90001') <> 'draft' then
    raise exception 'FAIL: to''rt ko''z — muallif o''z savolini o''zi nashr etdi';
  end if;
end $$;

-- 4b. Nazariy'dagi aylanma yo'l: B faqat IZOHNI tuzatadi (oxirgi tahrir
--     endi B'niki), keyin A nashr etishga urinadi. Mazmun muallifi hali ham A.
:as_b
update public.verbal_items set explain_uz = 'Kitob o''qiladi, qalam bilan esa yoziladi.' where key = 'v90001';
:as_a
do $$
declare blocked boolean := false;
begin
  begin
    update public.verbal_items set state = 'published' where key = 'v90001';
  exception
    when raise_exception then blocked := true;
    when check_violation then
      raise exception 'FAIL: to''rt ko''z (izoh orqali aylanma) — qo''riqchi to''xtatmadi (faqat CHECK ushladi)';
  end;
  if not blocked or pg_temp.st('v90001') <> 'draft' then
    raise exception 'FAIL: to''rt ko''z (izoh orqali aylanma) — boshqa odam izohni tuzatgach muallif o''zi nashr etdi';
  end if;
  raise notice '4 ✔ muallif o''zi nashr eta olmaydi — boshqa odam izohni tahrirlagandan keyin ham';
end $$;

-- 4c. Halol yo'l: boshqa moderator nashr etadi.
:as_b
update public.verbal_items set state = 'published' where key = 'v90001';
:su
do $$
declare v record;
begin
  select * into v from public.verbal_items where key = 'v90001';
  if v.state <> 'published' then raise exception 'FAIL: halol yo''l — boshqa moderator nashr eta olmadi'; end if;
  if v.reviewed_by <> 'bbbbbbbb-0000-0000-0000-00000000000b' or v.published_at is null then
    raise exception 'FAIL: nashr etgan odam (reviewed_by) yozilmadi';
  end if;
end $$;

-- Endi anon ko'radi — klient shaklida (content/verbal.json bilan bir xil).
:anon
do $$
declare p record;
begin
  select * into p from public.published_verbal where key = 'v90001';
  if p.key is null then raise exception 'FAIL: nashr etilgan savol anon''ga ko''rinmadi'; end if;
  if p.retired or p.uz ->> 'prompt' is null or jsonb_array_length(p.ru -> 'options') <> 4
     or p.explain ->> 'ru' is null or p.correct <> 0 or p.level <> 4 then
    raise exception 'FAIL: published_verbal shakli klient kutganidek emas: %', row_to_json(p);
  end if;
  if pg_temp.visible('select author_id, reviewed_by from public.verbal_items') <> 0 then
    raise exception 'FAIL: anon xodimlarning ichki identifikatorlarini ko''rdi';
  end if;
  raise notice '  ✔ nashr etilgan savol ommaga klient shaklida ko''rinadi';
end $$;


-- ═══ 5. NASHRDAGI SAVOL MAZMUNI O'ZGARSA — KO'RIB CHIQISHGA QAYTADI ════
-- 5a. Kalit.
:as_a
update public.verbal_items set correct = 1 where key = 'v90001';
:su
do $$
declare v record;
begin
  select * into v from public.verbal_items where key = 'v90001';
  if v.state <> 'review' then
    raise exception 'FAIL: kalit o''zgardi, savol esa nashrda qoldi (holat: %)', v.state;
  end if;
  if v.reviewed_by is not null or v.key_changed_at is null
     or v.content_by <> 'bbbbbbbb-0000-0000-0000-00000000000a' then
    raise exception 'FAIL: kalit o''zgarganda oldingi tasdiq bekor qilinmadi';
  end if;
end $$;
:anon
do $$ begin
  if pg_temp.visible('select 1 from public.published_verbal where key = ''v90001'' and not retired') <> 0 then
    raise exception 'FAIL: kalit o''zgargan (tekshirilmagan) savol ommaga ko''rinib turibdi';
  end if;
end $$;

-- 5b. Ruscha variantlar o'rni almashtirildi — correct o'zgarmagan, lekin
--     rus tilidagi odam uchun JAVOB o'zgardi (Nazariy'dagi eng yashirin yo'l).
:as_b
update public.verbal_items set state = 'published' where key = 'v90001';   -- A'ning kaliti, B ko'rdi
:as_c
update public.verbal_items
   set ru_options = array['Продавать', 'Ломать', 'Терять', 'Писать']
 where key = 'v90001';
:su
do $$ begin
  if pg_temp.st('v90001') <> 'review' then
    raise exception 'FAIL: ruscha variantlar almashtirildi, savol esa nashrda qoldi';
  end if;
end $$;

-- 5c. Stimul — boshqa savolga aylantiradi.
:as_a
update public.verbal_items set state = 'published' where key = 'v90001';   -- C'ning o'zgarishi, A ko'rdi
:as_c
update public.verbal_items set uz_stimulus = 'Kitob : o''qimoq = qoshiq : ?' where key = 'v90001';
:su
do $$ begin
  if pg_temp.st('v90001') <> 'review' then
    raise exception 'FAIL: stimul o''zgardi, savol esa nashrda qoldi';
  end if;
end $$;

-- 5d. Faqat izoh — javob o'zgarmaydi, nashrda qoladi (guard haddan
--     tashqari qattiq emasligi ham tekshiriladi).
:as_b
update public.verbal_items set state = 'published' where key = 'v90001';
:as_c
update public.verbal_items set explain_ru = 'Книгу читают, а ручкой пишут.' where key = 'v90001';
:su
do $$ begin
  if pg_temp.st('v90001') <> 'published'
     or (select reviewed_by from public.verbal_items where key = 'v90001')
        <> 'bbbbbbbb-0000-0000-0000-00000000000b' then
    raise exception 'FAIL: faqat izoh o''zgardi, lekin savol keraksiz ko''rib chiqishga tushdi';
  end if;
  raise notice '5 ✔ kalit, ruscha variantlar yoki stimul o''zgarsa — ko''rib chiqishga; izoh — yo''q';
end $$;


-- ═══ 6. TASDIQNI SOXTALASHTIRISH (UPDATE) ══════════════════════════════
:as_a
update public.verbal_items
   set reviewed_by = 'bbbbbbbb-0000-0000-0000-00000000000b',
       content_by  = 'bbbbbbbb-0000-0000-0000-00000000000b',
       published_at = now(), state = 'review'
 where key = 'v90002';
:su
do $$
declare v record;
begin
  select * into v from public.verbal_items where key = 'v90002';
  if v.reviewed_by is not null or v.content_by <> 'bbbbbbbb-0000-0000-0000-00000000000a'
     or v.published_at is not null then
    raise exception 'FAIL: reviewed_by soxtalashtirildi (reviewed %, content %)', v.reviewed_by, v.content_by;
  end if;
end $$;
:as_a
do $$ begin
  begin
    update public.verbal_items set state = 'published' where key = 'v90002';
  exception
    when raise_exception then null;
    when check_violation then
      raise exception 'FAIL: to''rt ko''z — soxta content_by bilan qo''riqchi to''xtatmadi (faqat CHECK ushladi)';
  end;
  if pg_temp.st('v90002') = 'published' then
    raise exception 'FAIL: to''rt ko''z — content_by soxtalashtirilgach muallif o''zi nashr etdi';
  end if;
  raise notice '6 ✔ reviewed_by/content_by ni klient yoza olmaydi';
end $$;


-- ═══ 7. KALIT (key) O'ZGARMAYDI, SAVOL O'CHIRILMAYDI ═══════════════════
:as_b
do $$
declare blocked boolean := false;
begin
  begin
    update public.verbal_items set key = 'v90009' where key = 'v90001';
  exception when raise_exception then blocked := true;
  end;
  if not blocked or not exists (select 1 from public.verbal_items where key = 'v90001') then
    raise exception 'FAIL: key o''zgardi — kalit barqaror bo''lishi kerak';
  end if;
end $$;

:as_own
do $$ begin
  begin
    delete from public.verbal_items where key in ('v90001', 'v90002');
  exception when others then null;
  end;
end $$;
:su
do $$ begin
  if (select count(*) from public.verbal_items where key in ('v90001', 'v90002')) <> 2 then
    raise exception 'FAIL: savol o''chirildi — faqat arxivlanishi mumkin';
  end if;
  raise notice '7 ✔ key o''zgarmaydi, savol o''chirilmaydi (hatto egasi ham)';
end $$;


-- ═══ 8. ODDIY FOYDALANUVCHI VA AUDITOR TAHRIRLAY OLMAYDI ═══════════════
:as_u1
do $$ begin
  begin
    update public.verbal_items set correct = 3 where key = 'v90001';
  exception when others then null;
  end;
end $$;
:as_aud
do $$ begin
  if pg_temp.visible('select 1 from public.verbal_items where key = ''v90002''') <> 1 then
    raise exception 'FAIL: auditor qoralamani ko''rmadi';
  end if;
  begin
    update public.verbal_items set correct = 3 where key = 'v90001';
  exception when others then null;
  end;
end $$;
:su
do $$ begin
  if (select correct from public.verbal_items where key = 'v90001') <> 1
     or pg_temp.st('v90001') <> 'published' then
    raise exception 'FAIL: oddiy foydalanuvchi yoki auditor nashrdagi savolni o''zgartirdi';
  end if;
  raise notice '8 ✔ oddiy foydalanuvchi va auditor savolni o''zgartira olmaydi';
end $$;


-- ═══ 9. TO'G'RIDAN-TO'G'RI ULANISH NASHR ETA OLMAYDI ═══════════════════
-- auth.uid() null — seed/migratsiya istisnosi yozishga ruxsat beradi,
-- lekin NASHR — faqat tizimga kirgan ko'rib chiquvchi (kim ko'rgani iz
-- qoldirishi kerak).
do $$
declare blocked boolean := false;
begin
  begin
    update public.verbal_items set state = 'published' where key = 'v90002';
  exception
    when raise_exception then blocked := true;
    when check_violation then
      raise exception 'FAIL: tizimga kirmagan ulanish nashrini qo''riqchi to''smadi (faqat CHECK ushladi)';
  end;
  if not blocked then raise exception 'FAIL: auth.uid() null bilan nashr etildi — ko''rib chiquvchi izsiz'; end if;
  raise notice '9 ✔ tizimga kirmagan ulanish (seed/migratsiya) nashr eta olmaydi';
end $$;


-- ═══ 10. MA'LUMOT BUTUNLIGI (CHECK) ═══════════════════════════════════
:as_a
do $$
declare
  c record;
  blocked boolean;
begin
  for c in select * from (values
    ('key formati',             '{"key":"x1"}'::jsonb),
    ('key qisqa',               '{"key":"v1"}'),
    ('noma''lum kind',          '{"kind":"math"}'),
    ('level 0',                 '{"level":0}'),
    ('level 11',                '{"level":11}'),
    ('3 ta variant',            '{"uz_options":["A","B","C"],"ru_options":["А","Б","В"]}'),
    ('7 ta variant',            '{"uz_options":["A","B","C","D","E","F","G"],"ru_options":["А","Б","В","Г","Д","Е","Ж"]}'),
    ('variant soni mos emas',   '{"ru_options":["Писать","Продавать","Ломать","Терять","Лишний"]}'),
    ('correct = variantlar soni','{"correct":4}'),
    ('correct manfiy',          '{"correct":-1}'),
    ('takroriy variant',        '{"uz_options":["Yozmoq","Sotmoq"," yozmoq ","Yo''qotmoq"]}'),
    ('ruscha takroriy variant', '{"ru_options":["Писать","Продавать","Ломать","Писать"]}'),
    ('bo''sh variant',          '{"uz_options":["Yozmoq","Sotmoq","   ","Yo''qotmoq"]}'),
    ('uzun variant',            jsonb_build_object('uz_options', jsonb_build_array(repeat('a', 121), 'b', 'c', 'd'))),
    ('uzun savol',              jsonb_build_object('uz_prompt', repeat('a', 301))),
    ('bo''sh savol',            '{"ru_prompt":"  a  "}'),
    ('stimul faqat uz''da',     '{"ru_stimulus":null}'),
    ('bo''sh izoh',             '{"explain_ru":"   "}'),
    ('uzun izoh',               jsonb_build_object('explain_uz', repeat('a', 601)))
  ) t(name, patch)
  loop
    blocked := false;
    begin
      perform pg_temp.new_item(pg_temp.base_item('v90050') || c.patch);
    exception when check_violation then blocked := true;
    end;
    if not blocked then raise exception 'FAIL: CHECK — "%" qabul qilindi', c.name; end if;
  end loop;
  raise notice '10 ✔ buzuq savol (19 xil holat) bazaga yozilmaydi';
end $$;


-- ═══ 11. ARXIV: kalit ilovaga "olib tashlang" bo'lib yetib boradi ═══════
:as_a
update public.verbal_items set state = 'archived' where key = 'v90001';
:anon
do $$
declare p record;
begin
  select * into p from public.published_verbal where key = 'v90001';
  if p.key is null or not p.retired then
    raise exception 'FAIL: arxivlangan kalit ommaviy ro''yxatga tushmadi — APK''dagi nusxasi chiqib turaveradi';
  end if;
  if p.uz is not null or p.correct is not null then
    raise exception 'FAIL: arxivlangan savol mazmuni tashqariga chiqdi';
  end if;
  if pg_temp.visible('select 1 from public.verbal_items where key = ''v90001''') <> 0 then
    raise exception 'FAIL: anon arxivlangan savolni ko''rdi';
  end if;
end $$;
-- Arxiv ro'yxatini klient o'zgartira olmaydi.
do $$ begin
  begin
    delete from public.verbal_retired;
  exception when others then null;
  end;
  begin
    insert into public.verbal_retired (key) values ('v90002');
  exception when others then null;
  end;
end $$;
:as_u1
do $$ begin
  begin
    delete from public.verbal_retired;
  exception when others then null;
  end;
end $$;
:su
do $$ begin
  if not exists (select 1 from public.verbal_retired where key = 'v90001')
     or exists (select 1 from public.verbal_retired where key = 'v90002') then
    raise exception 'FAIL: arxiv ro''yxatini klient o''zgartirdi';
  end if;
end $$;
-- Qayta nashr — ro'yxatdan chiqadi. Mazmunni oxirgi o'zgartirgan — C,
-- shuning uchun B nashr eta oladi.
:as_b
update public.verbal_items set state = 'published' where key = 'v90001';
:su
do $$ begin
  if exists (select 1 from public.verbal_retired where key = 'v90001') or pg_temp.st('v90001') <> 'published' then
    raise exception 'FAIL: arxiv — qayta nashr etilgan savol ro''yxatdan chiqmadi';
  end if;
  raise notice '11 ✔ arxivlangan kalit ommaga (mazmunsiz) chiqadi, qayta nashrda olib tashlanadi';
end $$;


-- ═══ 12. AUDIT JURNALI ═════════════════════════════════════════════════
do $$
declare n0 bigint; n1 bigint;
begin
  if not exists (select 1 from public.audit_log where resource = 'verbal:v90001' and action = 'savol yaratildi'
                   and actor_id = 'bbbbbbbb-0000-0000-0000-00000000000a') then
    raise exception 'FAIL: savol yaratilishi jurnalga tushmadi';
  end if;
  if (select count(*) from public.audit_log
       where resource = 'verbal:v90001' and action = 'savol mazmuni (javob kaliti) o''zgartirildi') < 3 then
    raise exception 'FAIL: mazmun o''zgarishlari (kalit, ruscha variant, stimul) jurnalga tushmadi';
  end if;
  if not exists (select 1 from public.audit_log where resource = 'verbal:v90001'
                   and action = 'savol holati: draft → published'
                   and actor_id = 'bbbbbbbb-0000-0000-0000-00000000000b') then
    raise exception 'FAIL: nashr etish (kim nashr etgani bilan) jurnalga tushmadi';
  end if;
  if not exists (select 1 from public.audit_log where resource = 'verbal:v90001' and action = 'savol tahrirlandi') then
    raise exception 'FAIL: izoh tahriri jurnalga tushmadi';
  end if;
end $$;

-- Hech narsa o'zgarmagan UPDATE jurnalga tushmaydi (seed har safar
-- qayta ishlaydi — filtrsiz jurnal shovqinga ko'milardi).
create temp table _n as select count(*) as n from public.audit_log;
:as_b
update public.verbal_items set explain_uz = explain_uz, correct = correct where key in ('v90001', 'v90002');
:su
do $$ begin
  if (select count(*) from public.audit_log) <> (select n from _n) then
    raise exception 'FAIL: bo''sh UPDATE jurnalga yozuv qo''shdi';
  end if;
  if pg_temp.st('v90001') <> 'published' then
    raise exception 'FAIL: bo''sh UPDATE savolni keraksiz ko''rib chiqishga tushirdi';
  end if;
  raise notice '12 ✔ har o''zgarish jurnalga (kim bilan) tushadi, bo''sh UPDATE — yo''q';
end $$;

rollback;
\echo '✅ 0002_verbal.sql — og''zaki savollar va to''rt ko''z qoidasi tekshiruvi o''tdi'
