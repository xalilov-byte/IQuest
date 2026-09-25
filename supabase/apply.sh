#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
#  IQuest — migratsiya va seed'ni bazaga qo'llash.
#
#  Ikki xil ulanish (bittasi kerak):
#
#    1) Ulanish satri:
#         SUPABASE_DB_URL='postgresql://postgres:…@127.0.0.1:5432/postgres' \
#           bash supabase/apply.sh
#
#    2) Tayyor psql buyrug'i — masalan serverda, bazaning porti tashqariga
#       ochilmagan bo'lsa (shunday bo'lishi KERAK), konteyner ichidagi psql:
#         PSQL_CMD='docker compose exec -T db psql -U postgres -d postgres' \
#           bash supabase/apply.sh
#       SQL stdin orqali uzatiladi, ya'ni fayllar konteyner ichida bo'lishi
#       shart emas. (-T — stdin uchun shart.)
#
#  Rol: `postgres` (Supabase image'ida jadvallar egasi). Migratsiyalar
#  auth.users ga trigger qo'yadi va anon/authenticated/service_role
#  huquqlarini boshqaradi.
#
#  Bir xil skript ikki joyda ishlaydi: serverda (deploy/, DEPLOY.md) va
#  lokal/CI da (supabase/tests/run.mjs) — xulqi oldindan sinalgan.
#
#  XAVFSIZLIK:
#    · Skript FAQAT qo'shadi. Jadval o'chirish yoki tozalash yo'q.
#    · Har migratsiya BITTA tranzaksiyada qo'llanadi va shu tranzaksiyaning
#      o'zida qayd etiladi: yarim qo'llangan migratsiya yoki "qo'llandi,
#      lekin qayd etilmadi" holati bo'lmaydi.
#    · Boshqa loyihaning bazasiga (ayniqsa Nazariy'ga — bu repo undan
#      nusxa olingan) qo'llashdan OLDIN to'xtaydi. Pastga qarang.
# ─────────────────────────────────────────────────────────────────────────
set -euo pipefail
shopt -s nullglob

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -n "${PSQL_CMD:-}" ]; then
  read -r -a PSQL <<< "$PSQL_CMD"
  PSQL+=(-v ON_ERROR_STOP=1 -X -q)
elif [ -n "${SUPABASE_DB_URL:-}" ]; then
  PSQL=(psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -X -q)
else
  echo "XATO: SUPABASE_DB_URL yoki PSQL_CMD o'rnatilmagan" >&2
  exit 1
fi

# Faylni (va qo'shimcha SQL'ni) BITTA tranzaksiyada, stdin orqali.
# ON_ERROR_STOP: xatoda psql chiqadi, ochiq tranzaksiya bekor bo'ladi.
run_tx() {
  { echo 'begin;'; cat "$1"; printf '\n%s\n' "${2:-}"; echo 'commit;'; } | "${PSQL[@]}"
}

echo "── Ulanish tekshirilmoqda ──"
"${PSQL[@]}" -tAc "select '  server: '||current_setting('server_version');"

# ── Bu Zukko bazasimi? ───────────────────────────────────────────────────
# Repo Nazariy'dan nusxa olingan. Nazariy'ning ulanish satri tasodifan
# shu repo secret'iga qo'yilsa, skript o'sha JONLI bazaga (boshqa
# mahsulotning foydalanuvchilari!) yangi jadvallar yozardi. Bundan ham
# yomoni: Nazariy'da "0001_init.sql" allaqachon qayd etilgan — Zukko'ning
# shu nomli migratsiyasi "qo'llangan" deb JIMGINA o'tkazib yuborilardi.
#
# Ikki belgi bo'yicha to'xtaymiz:
#   1. Nazariy jadvallari (topics, questions) bor;
#   2. schema_migrations da bu papkada YO'Q migratsiya qayd etilgan —
#      baza boshqa loyihaniki yoki migratsiya fayli o'chirilgan.
FOREIGN=$("${PSQL[@]}" -tAc "
  select coalesce(string_agg(t, ', '), '') from (
    select 'public.' || c as t from unnest(array['topics', 'questions']) c
     where to_regclass('public.' || c) is not null) x;")
if [ -n "$FOREIGN" ]; then
  echo "XATO: bazada boshqa loyihaning jadvallari bor ($FOREIGN)." >&2
  echo "      Bu Zukko bazasi emas (Nazariy'ga o'xshaydi). Hech narsa qilinmadi." >&2
  echo "      SUPABASE_DB_URL YANGI Zukko loyihasiniki ekanini tekshiring." >&2
  exit 2
fi

KNOWN=""
for f in "$HERE"/migrations/*.sql; do KNOWN="$KNOWN'$(basename "$f")',"; done
KNOWN="${KNOWN%,}"
if [ -z "$KNOWN" ]; then
  echo "XATO: migrations/ bo'sh" >&2
  exit 1
fi
UNKNOWN=""
# Jadval hali yo'q bo'lsa (toza baza) so'rov umuman yuborilmaydi: nomi
# so'rov tahlilida (parse) hal qilinadi va yo'q jadval xato beradi.
if [ -n "$("${PSQL[@]}" -tAc "select to_regclass('public.schema_migrations');")" ]; then
  UNKNOWN=$("${PSQL[@]}" -tAc "
    select coalesce(string_agg(filename, ', '), '')
      from public.schema_migrations
     where filename not in ($KNOWN);")
fi
if [ -n "$UNKNOWN" ]; then
  echo "XATO: bazada bu repoda yo'q migratsiya(lar) qayd etilgan: $UNKNOWN" >&2
  echo "      Baza boshqa loyihaniki yoki migratsiya fayli o'chirilgan. Hech narsa qilinmadi." >&2
  exit 2
fi

# ── Migratsiyalar ────────────────────────────────────────────────────────
"${PSQL[@]}" -c "
  create table if not exists public.schema_migrations (
    filename    text primary key,
    applied_at  timestamptz not null default now()
  );
  /* public sxemasidagi har jadval PostgREST orqali ochiq turadi. RLS
     yoqilgan, siyosati yo'q va huquqi olingan jadval hech kimga
     ko'rinmaydi. Jadval faqat shu skript uchun — u baza egasi sifatida
     ulanadi. Migratsiya tarixi maxfiy emas, lekin 'public dagi hamma
     jadvalda RLS bor' qoidasining istisnosi bo'lmasligi kerak: istisno
     bir marta yo'l qo'yilsa, keyingisi sezilmay qoladi. */
  alter table public.schema_migrations enable row level security;
  revoke all on public.schema_migrations from public;
  do \$\$ begin
    if exists (select 1 from pg_roles where rolname = 'anon') then
      revoke all on public.schema_migrations from anon, authenticated;
    end if;
  end \$\$;"

for f in "$HERE"/migrations/*.sql; do
  name="$(basename "$f")"
  done_already=$("${PSQL[@]}" -tAc \
    "select 1 from public.schema_migrations where filename = '$name';")
  if [ -n "$done_already" ]; then
    echo "── $name — allaqachon qo'llangan, o'tkazib yuborildi ──"
    continue
  fi
  echo "── Migratsiya qo'llanmoqda: $name ──"
  run_tx "$f" "insert into public.schema_migrations (filename) values ('$name');"
  echo "   qo'llandi"
done

# ── Seed ─────────────────────────────────────────────────────────────────
# Seed idempotent: savol faqat hali hech kim tegmagan qoralama bo'lsa
# yangilanadi, o'zgarmagan bo'lsa umuman tegilmaydi (jurnalga ham
# tushmaydi). Shuning uchun har ishga tushishda xavfsiz.
#
# seed/ dagi HAMMA fayl tartib bilan ishlaydi — bitta nom yozib qo'yilsa,
# ikkinchi seed qo'shilganda u jimgina tashlab ketilardi.
seeds=("$HERE"/seed/*.sql)
if [ ${#seeds[@]} -eq 0 ]; then
  echo "── Seed yo'q (seed/ bo'sh) — 'node supabase/mkseed.mjs' bilan yasaladi ──"
fi
for seed in "${seeds[@]}"; do
  echo "── Seed qo'llanmoqda: $(basename "$seed") ──"
  run_tx "$seed"
done

echo "── Natija ──"
"${PSQL[@]}" -tAc "
  select '  og''zaki savollar:   '||count(*) from public.verbal_items
  union all select '  nashr etilgan:      '||count(*) from public.verbal_items where state = 'published'
  union all select '  qoralama:           '||count(*) from public.verbal_items where state = 'draft'
  union all select '  audit yozuvlari:    '||count(*) from public.audit_log;"

# ── RLS yoqilganini tasdiqlash ───────────────────────────────────────────
# Eng muhim tekshiruv: RLS o'chib qolgan jadval bo'lsa, publishable kalit
# bilan u butunlay ochiq bo'lib qoladi.
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

# Ko'rinish (view) standart holatda EGASI huquqi bilan ishlaydi, ya'ni
# RLS'ni chetlab o'tadi. Har ko'rinish security_invoker bo'lishi shart.
BYPASS=$("${PSQL[@]}" -tAc "
  select coalesce(string_agg(c.relname, ', '), '')
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'v'
    and not coalesce(c.reloptions @> array['security_invoker=true'], false);")
if [ -n "$BYPASS" ]; then
  echo "XATO: security_invoker'siz ko'rinish(lar) — RLS'ni chetlab o'tadi: $BYPASS" >&2
  exit 1
fi
echo "  barcha ko'rinishlar security_invoker"

echo
echo "✅ Qo'llash tugadi"
