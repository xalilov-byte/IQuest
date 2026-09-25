#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
#  Migratsiya va seed'ni bazaga qo'llash.
#
#  Ishlatilishi:
#      SUPABASE_DB_URL='postgresql://…' bash supabase/apply.sh
#
#  Bir xil skript ikki joyda ishlaydi:
#    · CI (.github/workflows/db-apply.yml) — haqiqiy Supabase bazasiga
#    · lokal PostgreSQL — tekshirish uchun
#  Shuning uchun CI'da birinchi marta sinalmaydi: xulqi allaqachon
#  ma'lum bo'ladi.
#
#  XAVFSIZLIK: skript FAQAT qo'shadi. Jadval o'chirish yoki ma'lumotni
#  tozalash yo'q. Migratsiya allaqachon qo'llangan bo'lsa — o'tkazib
#  yuboriladi, qaytadan urinilmaydi.
# ─────────────────────────────────────────────────────────────────────────
set -euo pipefail

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "XATO: SUPABASE_DB_URL o'rnatilmagan" >&2
  exit 1
fi

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PSQL=(psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -X -q)

echo "── Ulanish tekshirilmoqda ──"
"${PSQL[@]}" -tAc "select 'server: '||current_setting('server_version');"

# ── Migratsiyalar ──
# Ilgari bu yerda faqat 0001_init.sql bor edi va "topics jadvali bormi?"
# degan bitta tekshiruv qilinardi. Bu ikkinchi migratsiya yozilishi bilan
# buziladi: sxema mavjud bo'lgani uchun YANGI migratsiya ham o'tkazib
# yuborilardi va tuzatish hech qachon qo'llanmasdi.
#
# Endi qo'llanganlar jadvalda qayd etiladi va migrations/ dagi har bir
# fayl tartib bilan bir marta ishlaydi.
"${PSQL[@]}" -c "
  create table if not exists public.schema_migrations (
    filename    text primary key,
    applied_at  timestamptz not null default now()
  );

  /* public sxemasidagi har bir jadval PostgREST orqali ochiq turadi,
     shuning uchun bu yerda ham RLS yoqiladi. SIYOSAT ATAYLAB YOZILMAYDI:
     RLS yoqilgan va siyosati yo'q jadval hech kimga ko'rinmaydi. Jadval
     faqat shu skript uchun kerak — u baza egasi sifatida ulanadi va RLS
     unga taalluqli emas. Migratsiya tarixi maxfiy emas, lekin 'public
     dagi hamma jadvalda RLS bor' qoidasining istisnosi bo'lishi ham
     kerak emas — istisno bir marta yo'l qo'yilsa, keyingisi sezilmay
     qoladi. */
  alter table public.schema_migrations enable row level security;"

# Eski bazalar uchun: sxema bor, lekin jadval bo'sh bo'lsa 0001 allaqachon
# qo'llangan degani — uni qayta ishga tushirmaymiz, faqat qayd etamiz.
"${PSQL[@]}" -c "
  insert into public.schema_migrations (filename)
  select '0001_init.sql'
   where to_regclass('public.topics') is not null
     and not exists (select 1 from public.schema_migrations
                      where filename = '0001_init.sql');"

for f in "$HERE"/migrations/*.sql; do
  name="$(basename "$f")"
  done_already=$("${PSQL[@]}" -tAc \
    "select 1 from public.schema_migrations where filename = '$name';")
  if [ -n "$done_already" ]; then
    echo "── $name — allaqachon qo'llangan, o'tkazib yuborildi ──"
    continue
  fi
  echo "── Migratsiya qo'llanmoqda: $name ──"
  "${PSQL[@]}" -f "$f"
  "${PSQL[@]}" -c \
    "insert into public.schema_migrations (filename) values ('$name');"
  echo "   qo'llandi"
done

# Seed idempotent: "on conflict" bilan yozilgan, shuning uchun har doim
# xavfsiz ishga tushadi va mavjud savollarni takrorlamaydi.
#
# Ilgari bu yerda bitta fayl nomi yozilgan edi. Ikkinchi seed qo'shilishi
# bilan u sezdirmay tashlab ketilardi — migratsiyalardagi xuddi shu xato.
# Endi seed/ dagi hamma fayl tartib bilan ishlaydi.
for seed in "$HERE"/seed/*.sql; do
  echo "── Seed qo'llanmoqda: $(basename "$seed") ──"
  "${PSQL[@]}" -f "$seed"
done

echo "── Natija ──"
"${PSQL[@]}" -tAc "
  select '  mavzular:        '||count(*) from public.topics
  union all select '  savollar:        '||count(*) from public.questions
  union all select '  tarjimalar:      '||count(*) from public.question_translations
  union all select '  nashr etilgan:   '||count(*) from public.published_questions
  union all select '  audit yozuvlari: '||count(*) from public.audit_log;"

# ── RLS yoqilganini tasdiqlash ──
# Eng muhim tekshiruv: RLS o'chib qolgan jadval bo'lsa, publishable
# kalit bilan hamma narsa ochiq bo'lib qoladi.
echo "── RLS holati ──"
UNPROTECTED=$("${PSQL[@]}" -tAc "
  select coalesce(string_agg(tablename, ', '), '')
  from pg_tables
  where schemaname = 'public' and not rowsecurity;")

if [ -n "$UNPROTECTED" ]; then
  echo "XATO: RLS yoqilmagan jadval(lar): $UNPROTECTED" >&2
  exit 1
fi
echo "  public sxemasidagi barcha jadvalda RLS yoqilgan"

echo
echo "✅ Qo'llash tugadi"
