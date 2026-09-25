-- ═══════════════════════════════════════════════════════════════════════
--  NAZARIY — 0005: published_questions ko'rinishiga `image` qo'shish
--
--  0004_bank.sql questions jadvaliga `image` ustunini qo'shdi, lekin
--  PostgreSQL ko'rinishi (view) yangi ustunni O'ZI OLMAYDI — u
--  yaratilgan paytdagi ustunlar ro'yxatini eslab qoladi. Ya'ni klient
--  `published_questions?select=...,image` deb so'rasa, xato oladi va
--  butun savollar yuklanishi yiqiladi.
--
--  0004 allaqachon qo'llangan bo'lishi mumkin, shuning uchun u tahrir
--  QILINMAYDI — tuzatish alohida migratsiya bo'ladi.
--
--  Ishga tushirish: supabase/apply.sh
-- ═══════════════════════════════════════════════════════════════════════

begin;

-- `create or replace view` yangi ustun qo'shishga ruxsat beradi (ustunlar
-- OXIRIGA qo'shilsa va turlari o'zgarmasa). Shuning uchun `image`
-- oxirida turadi.
create or replace view public.published_questions
with (security_invoker = true) as
  select q.id, q.ref, q.text, q.options, q.correct, q.explain, q.sign,
         t.slug as topic_slug, t.name as topic_name, t.sort_order,
         q.updated_at, q.image
  from public.questions q
  join public.topics t on t.id = q.topic_id
  where q.state = 'published';

comment on view public.published_questions is
  'Klient uchun savollar. security_invoker=true — RLS chaqiruvchi '
  'huquqi bilan qo''llanadi, ya''ni ko''rinish RLS''ni chetlab o''tmaydi.';

commit;
