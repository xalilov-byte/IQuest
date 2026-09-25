#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
#  Jonli Supabase loyihasini TASHQARIDAN tekshirish (publishable kalit bilan)
#
#  Ishlatilishi:
#      bash supabase/tests/live.sh            — migratsiya hali yo'q bo'lsa eslatadi
#      bash supabase/tests/live.sh --strict   — migratsiya bo'lishi SHART (db-apply)
#
#  URL va kalit supabase/config.json dan olinadi (ikkalasi ham OMMAVIY —
#  klient APK'sida baribir bor). Bo'sh bo'lsa: hech qanday so'rov yo'q.
#
#  Nima uchun kerak: lokal testlar (run.mjs) SXEMANI tekshiradi. Bu esa
#  haqiqiy loyihada klient ko'radigan manzarani: PostgREST, Supabase
#  standart huquqlari va qo'llangan migratsiyalar birgalikda. Klient
#  qila oladigan narsani aynan klient kabi qilib ko'radi.
#
#  Hech narsa YOZMAYDI: yozishga urinishlar RLS/huquq to'sishi kerak bo'lgan
#  anon so'rovlar va javob 401/403 bo'lishi talab qilinadi. Boshqa javob —
#  xato (2xx — teshik; 400 — so'rov to'siqqa yetmasdan boshqa sababdan
#  yiqildi, ya'ni to'siq ishlayotgani ISBOTLANMADI).
# ─────────────────────────────────────────────────────────────────────────
set -euo pipefail

STRICT=0
[ "${1:-}" = "--strict" ] && STRICT=1

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
URL=$(node -p "require('$HERE/supabase/config.json').url || ''")
KEY=$(node -p "require('$HERE/supabase/config.json').publishableKey || ''")

if [ -z "$URL" ] || [ -z "$KEY" ]; then
  echo "::notice::supabase/config.json bo'sh — ilova offline ishlaydi, jonli tekshiruv o'tkazib yuborildi."
  exit 0
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
FAILS=0

# get <yo'l> → HTTP kodi; tana $TMP/body da
get() {
  curl -s -o "$TMP/body" -w '%{http_code}' "$URL/rest/v1/$1" -H "apikey: $KEY"
}
post() {
  curl -s -o "$TMP/body" -w '%{http_code}' -X POST "$URL/rest/v1/$1" \
    -H "apikey: $KEY" -H 'Content-Type: application/json' -H 'Prefer: return=minimal' -d "$2"
}
rows() {
  node -e "try { const d = JSON.parse(require('fs').readFileSync('$TMP/body','utf8')); console.log(Array.isArray(d) ? d.length : -1) } catch (e) { console.log(-1) }"
}
bad() { echo "::error::$1"; FAILS=$((FAILS + 1)); }

# ── 1. Klient ko'rinishi mavjud va o'qiladi ──
code=$(get 'published_verbal?select=key,retired&limit=500')
if [ "$code" = "404" ] || grep -q 'PGRST205\|does not exist' "$TMP/body" 2>/dev/null; then
  if [ "$STRICT" = "1" ]; then
    bad "published_verbal ko'rinishi yo'q — migratsiya qo'llanmagan"
    exit 1
  fi
  echo "::notice::Migratsiya hali qo'llanmagan. Actions → \"Bazaga qo'llash\" (supabase/README.md)."
  exit 0
fi
if [ "$code" != "200" ]; then
  bad "published_verbal: HTTP $code"
  cat "$TMP/body"; echo
  exit 1
fi
echo "  nashr etilgan og'zaki savol / arxiv kaliti (tashqaridan): $(rows)"

# ── 2. Qoralama tashqariga chiqmaydi ──
code=$(get 'verbal_items?select=key,state&state=neq.published&limit=5')
if [ "$code" = "200" ] && [ "$(rows)" != "0" ]; then
  bad "RLS TESHIK: publishable kalit bilan nashr etilmagan savollar ko'rindi"
  cat "$TMP/body"; echo
else
  echo "  qoralama savollar tashqaridan ko'rinmaydi"
fi

# Xodimlarning ichki identifikatorlari anon'ga berilmaydi (ustun huquqi).
code=$(get 'verbal_items?select=key,author_id,reviewed_by&limit=1')
if [ "$code" = "200" ]; then
  bad "anon verbal_items dagi xodim identifikatorlarini o'qiy oladi (author_id/reviewed_by)"
else
  echo "  xodim identifikatorlari anon'ga yopiq (HTTP $code)"
fi

# ── 3. Maxfiy jadvallar anon'ga ko'rinmaydi ──
for t in audit_log profiles test_results item_responses response_quota schema_migrations; do
  code=$(get "$t?select=*&limit=1")
  n=$(rows)
  if [ "$code" = "200" ] && [ "$n" != "0" ]; then
    bad "RLS TESHIK: $t publishable kalit bilan o'qildi"
  else
    echo "  $t — tashqaridan o'qilmaydi (HTTP $code)"
  fi
done

# ── 4. Anon yoza olmaydi ──
RESULT='{"client_id":"00000000-0000-4000-8000-000000000000","mode":"test","iq":100,"lo":95,"hi":105,"theta":0,"se":0.3,"n":30,"correct":15,"reliable":true,"by_type":{"matrix":{"n":30,"correct":15}},"duration_ms":1000}'
check_denied() {
  local what="$1" code="$2"
  case "$code" in
    401|403) echo "  $what — rad etildi (HTTP $code)" ;;
    2*)      bad "TESHIK: $what anon uchun QABUL QILINDI (HTTP $code)"; cat "$TMP/body"; echo ;;
    *)       bad "$what: HTTP $code — to'siq (401/403) ishlagani isbotlanmadi"; cat "$TMP/body"; echo ;;
  esac
}
check_denied "anon test_results INSERT" "$(post 'test_results' "$RESULT")"
check_denied "anon verbal_items INSERT" "$(post 'verbal_items' '{"key":"v000000","kind":"odd","level":1,"state":"published"}')"
check_denied "anon submit_item_responses()" "$(post 'rpc/submit_item_responses' '{"p_session":"00000000-0000-4000-8000-000000000000","p_rows":[]}')"
check_denied "anon delete_my_results()" "$(post 'rpc/delete_my_results' '{}')"

if [ "$FAILS" -gt 0 ]; then
  echo "❌ Jonli tekshiruv: $FAILS ta muammo"
  exit 1
fi
echo "✅ RLS tashqaridan ham to'g'ri ishlayapti"
