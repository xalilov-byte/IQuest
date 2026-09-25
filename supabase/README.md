# Baza (Supabase) — Zukko

Bu papkada Zukko bazasining sxemasi, seed generatori va xavfsizlik
tekshiruvlari turadi.

**Baza ixtiyoriy.** `config.json` bo'sh bo'lsa ilova to'liq offline
ishlaydi va tarmoqqa BIRORTA ham so'rov yubormaydi: savollarning asosiy
qismi qurilmada yaratiladi (`src/iq/gen/`), og'zaki savollar esa APK
ichida keladi (`content/verbal.json`). Baza faqat ikki narsa beradi:

1. og'zaki savollarni markazdan tuzatish va yangilash (xodim ko'rib
   chiqqandan keyin);
2. tizimga kirgan foydalanuvchining test natijalarini saqlash.

```
supabase/
├─ config.json            ← loyiha URL va publishable kalit (OMMAVIY). Hozir BO'SH — ataylab
├─ apply.sh               ← migratsiya + seed'ni qo'llash (CI va lokal)
├─ mkseed.mjs             ← content/verbal.json → seed/0001_verbal.sql
├─ migrations/
│  ├─ 0001_init.sql       ← rollar, profillar, audit jurnali
│  ├─ 0002_verbal.sql     ← og'zaki savollar, "to'rt ko'z", published_verbal
│  └─ 0003_results.sql    ← test natijalari, anonim javoblar (kalibrlash)
├─ seed/                  ← GENERATOR yasaydi, qo'lda tahrirlanmaydi
└─ tests/
   ├─ _stub.sql           ← Supabase auth va standart huquqlarining taqlidi
   ├─ 0001_accounts.sql   ← hisoblar, rollar, jurnal, huquqlar (lint)
   ├─ 0002_verbal.sql     ← RLS va to'rt ko'z — haqiqiy hujum so'rovlari
   ├─ 0003_results.sql    ← natijalar va anonim javoblar
   ├─ mutants.mjs         ← salbiy tekshiruv: har himoya olib tashlanadi
   ├─ run.mjs             ← to'liq zanjir + mutantlar (CI shuni ishlatadi)
   ├─ live.sh             ← jonli loyihani tashqaridan tekshirish
   ├─ mkseed.test.mjs     ← seed generatori testlari
   └─ fixtures/verbal.sample.json
```

> **Nazariy'ning bazasi bilan hech qanday aloqa yo'q.** Bu repo Nazariy'dan
> nusxa olingan, lekin Zukko — alohida mahsulot, alohida Supabase loyihasi.
> Nazariy'ning URL, kaliti yoki ulanish satri bu repoga hech qachon
> yozilmaydi. `apply.sh` Nazariy bazasini tanib, unga hech narsa yozmasdan
> to'xtaydi (tekshirilgan: `tests/run.mjs`, 2-bo'lim).

---

## 1. Yangi Supabase loyihasini ochish

Bir martalik ish, taxminan 15 daqiqa.

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
   Nomi: `zukko`. Region — foydalanuvchilarga yaqini. Baza parolini
   parol menejeriga saqlang (u faqat 3-qadamda kerak).
2. **Authentication → Sign In / Providers**:
   - **Allow anonymous sign-ins — O'CHIQ.** Yoqilsa har kim bir zumda
     cheksiz "tizimga kirgan" hisob ochadi. Baza anonim sessiyani baribir
     rad etadi (`is_anonymous_user()`), lekin bu ikkinchi qatlam.
   - Email tasdiqlash (Confirm email) — yoqiq qolsin.
3. **Project Settings → Database → Connection string → URI** (Session
   pooler). `[YOUR-PASSWORD]` ni haqiqiy parol bilan almashtiring.
   GitHub → repo → **Settings → Secrets and variables → Actions → New
   repository secret**: nom `SUPABASE_DB_URL`, qiymat — o'sha URI.
   Bu satr baza parolini saqlaydi: faqat GitHub Secrets'da turadi, logda
   ko'rinmaydi, repoga tushmaydi. Chatga ham yozmang.
4. GitHub → **Actions → "Bazaga qo'llash" → Run workflow** → `tasdiq`
   maydoniga `ha`. Workflow `apply.sh` ni ishga tushiradi.
5. **Project Settings → API**: `Project URL` va **publishable** kalitni
   (`sb_publishable_…`, eski nomi `anon`) `config.json` ga yozing va commit
   qiling. **Hech qachon `service_role` yoki `secret` kalitni yozmang** —
   ular RLS'ni butunlay chetlab o'tadi va APK'dan ularni har kim oladi.
6. Push'dan keyin **"Baza"** workflow'ining `jonli-tekshiruv` qismi
   loyihani tashqaridan tekshiradi (`tests/live.sh`).

### O'zingizga `owner` rolini berish

Har yangi hisob `user` rolini oladi. Ilovaga (yoki admin panelga) kirib
hisob yarating, keyin Supabase → **SQL Editor**:

```sql
update public.profiles p set role = 'owner'
  from auth.users u
 where u.id = p.id and u.email = 'siz@example.com';
```

Rolni faqat shu yo'l bilan (bazaga to'g'ridan-to'g'ri) yoki boshqa
`owner` bera oladi — ilova orqali hech kim o'ziga rol bera olmaydi
(tekshirilgan: `tests/0001_accounts.sql`, 3–4-bo'lim).

**To'rt ko'z qoidasi ikki xodimni talab qiladi.** Savol mazmunini
o'zgartirgan odam uni o'zi nashr eta olmaydi — hatto `owner` ham. Kamida
ikkita `moderator`/`owner` hisobi kerak. Bu ataylab.

---

## 2. Nima uchun RLS — yagona himoya

Klient (APK, sayt) **publishable** kalit bilan ishlaydi va u kalit
hammaga ko'rinadi: APK'ni ochgan odam uni bir daqiqada topadi. U kalit
bilan istalgan so'rovni qo'lda yuborish mumkin — ilova kodini chetlab.

Ya'ni **ma'lumotni kalit ham, ilova kodi ham himoya qilmaydi. Faqat
bazaning o'zi** — Row Level Security (RLS) siyosatlari, huquqlar (GRANT)
va triggerlar. Shuning uchun:

- har jadvalda RLS yoqilgan; siyosatsiz jadval — hech kimga ko'rinmaydi;
- Supabase standart holatda `anon`ga HAMMA huquqni beradi — migratsiyalar
  avval hammasini oladi (`revoke all`), keyin faqat keraklisini beradi;
- qoidalar (to'rt ko'z, kunlik chegara, jurnal) **bazada**, klientda emas;
- `security definer` funksiyalarda `search_path` qat'iy;
- ko'rinish (`published_verbal`) `security_invoker` — RLS'ni chetlab
  o'tadigan orqa eshik emas.

"RLS yozdim" degan gap yetarli emas. Har himoya haqiqiy hujum so'rovi
bilan tekshiriladi, va **har himoya uchun salbiy tekshiruv bor**:
`tests/run.mjs` uni migratsiyadan olib tashlaydi va test aynan o'sha
joyda yiqilishini talab qiladi (§6).

---

## 3. Jadvallar va siyosatlar

| Jadval | anon | foydalanuvchi | moderator | auditor | owner | Izoh |
|---|---|---|---|---|---|---|
| `profiles` | — | o'zini o'qiydi, ismini o'zgartiradi | ro'yxatni o'qiydi | ro'yxatni o'qiydi | + rol beradi | rol va `tg_id` ni klient o'zgartira olmaydi (trigger); `support` ham ro'yxatni ko'radi |
| `verbal_items` | faqat `published`, faqat klient ustunlari | faqat `published` | hammasini o'qiydi, yozadi, nashr etadi* | hammasini o'qiydi | = moderator | DELETE yo'q — arxivlanadi |
| `verbal_retired` | o'qiydi | o'qiydi | o'qiydi | o'qiydi | o'qiydi | faqat kalit; trigger yuritadi |
| `published_verbal` (view) | o'qiydi | o'qiydi | o'qiydi | o'qiydi | o'qiydi | klient shu yerdan oladi |
| `test_results` | — | faqat O'ZINIKI: qo'shadi, o'qiydi | — | — | — | UPDATE/DELETE yo'q; kuniga 100 ta |
| `item_responses` | — | — (faqat funksiya orqali yozadi) | — | o'qiydi | o'qiydi | anonim, `user_id` yo'q |
| `response_quota` | — | — | — | — | — | hech kimga ko'rinmaydi |
| `audit_log` | — | — | — | o'qiydi | o'qiydi | yozuvni faqat trigger qo'yadi; hech kim o'zgartirmaydi |

\* **To'rt ko'z** (`verbal_guard`, bazada majburlanadi):
- yangi savol INSERT bilan darhol `published` bo'lmaydi (trigger +
  siyosat + CHECK — uch qatlam, har biri alohida tekshirilgan);
- javobga ta'sir qiluvchi mazmun (kalit, variantlar, stimul, savol matni,
  daraja — **ikkala tilda**) o'zgarsa, savol `review` ga qaytadi va
  oldingi tasdiq bekor bo'ladi; faqat izoh o'zgarsa — nashrda qoladi;
- mazmunni oxirgi o'zgartirgan odam (`content_by`) uni nashr eta olmaydi.
  Nazariy'da "oxirgi tahrir qilgan" (`updated_by`) tekshirilardi — boshqa
  odam izohdagi vergulni tuzatsa, muallif o'z kalitini o'zi nashr eta
  olardi; bu yo'l yopilgan va testda isbotlangan;
- `reviewed_by`, `content_by`, `author_id` ni klient yoza olmaydi;
- `key` o'zgarmaydi, savol o'chirilmaydi;
- nashr faqat tizimga kirgan xodim tomonidan (seed/migratsiya — yo'q);
- CHECK: nashr etilgan savolda `reviewed_by` bor va u `content_by` emas.

`auth.uid() = null` istisnosi (bazaga to'g'ridan-to'g'ri ulanish: seed,
migratsiya, service kaliti) yozishga ruxsat beradi — bunday ulanishi bor
odam baribir hamma narsani qila oladi. Lekin nashr etishga emas.

**Funksiyalar** (faqat `authenticated`; `anon`dan EXECUTE olingan va
funksiya ichida ham `auth.uid()` tekshiriladi):
- `delete_my_results()` — "ma'lumotimni o'chiring": o'z natijalarining
  HAMMASI (tanlab emas — tarix halol bo'lsin). Jurnalga soni bilan
  tushadi, IQ qiymatlarisiz.
- `submit_item_responses(session, rows)` — anonim javoblar (§4).

---

## 4. `item_responses` — qaror va asosi

Savol qiyinligini kelajakda kalibrlash uchun "qaysi savolga qanday javob
berildi" kerak — "kim javob bergani" emas.

- **anon yoza olmaydi.** Publishable kalit APK ichida; anon INSERT —
  butun internetga ochiq yozish nuqtasi. Bitta skript soxta javoblar
  bilan savollar qiyinligini (demak IQ bahosini ham) xohlagan tomonga
  surardi va bazani to'ldirardi.
- **Tizimga kirgan — faqat funksiya orqali**, jadvalga to'g'ridan-to'g'ri
  emas: bitta chaqiruv = bitta sessiya (1..200 javob), sessiya qayta
  yozilmaydi va unga qo'shib bo'lmaydi, har hisobga kuniga 20 sessiya,
  anonim hisob rad etiladi. Buzuq bitta qator — butun sessiya rad.
- **Anonimlik:** jadvalda `user_id` yo'q, vaqt faqat kun aniqligida.
  Kvota alohida jadvalda va javoblarga ulanmaydi. Hech bir rol API orqali
  ikkalasini (natijalar va javoblar) birga o'qiy olmaydi.
- **Klient hozircha yubormaydi** (`submitResult(result, { calibrate: true })`
  — faqat ochiq ruxsat bilan). Yig'ish maxfiylik matnida aytilgan kundan
  boshlanadi; sxema va himoya esa tayyor va sinalgan.

Halol cheklov: natija va o'sha testning javoblari bir kunda yuborilsa,
yig'indilarini (n, correct, turlar bo'yicha) solishtirib ularni taxminan
ulash mumkin — lekin faqat bazaning egasi (SQL) ikkalasini ko'radi.

---

## 5. Seed generatori

`seed/0001_verbal.sql` **qo'lda tahrir qilinmaydi**:

```bash
node supabase/mkseed.mjs
```

Manba — `content/verbal.json` (shakli: `src/iq/CONTRACT.md` §2). Fayl
yo'q bo'lsa generator aniq xabar bilan to'xtaydi. Tekshiruvlar bazadagi
CHECK'lar bilan bir xil — xato bazada emas, generator'da, qaysi savolda
ekani bilan chiqadi.

- Hamma savol **`draft`** bo'lib tushadi — faylda `reviewed: true` bo'lsa
  ham. Kim ko'rgani faqat bazada, to'rt ko'z orqali qayd etiladi.
- Qayta ishga tushirish xavfsiz: faqat hali hech kim tegmagan va mazmuni
  o'zgargan qoralama yangilanadi. Odam tahrirlagan yoki nashr etilgan
  savolga seed tegmaydi (u yerda manba endi baza), jurnalga shovqin
  tushmaydi.
- CI (`db.yml`) generatorni qayta ishga tushirib, `seed/` o'zgarmaganini
  tekshiradi.

---

## 6. Lokal tekshiruv (Supabase kerak emas)

```bash
# PostgreSQL 16, lokal server. PG* — LOKAL serverni ko'rsatadi.
PGHOST=/tmp PGPORT=5434 PGUSER=postgres node supabase/tests/run.mjs
node --test supabase/tests/*.test.mjs        # seed generatori
```

`run.mjs`:
1. toza baza → `_stub.sql` → `apply.sh` → `apply.sh` yana (hech narsa
   o'zgarmasligi shart) → namunaviy seed ikki marta (jurnalga ham
   yozmasligi shart) → `0001`..`0003` testlari;
2. `apply.sh` Nazariy'ga o'xshagan va begona migratsiyali bazaga yozmasdan
   to'xtashi;
3. **salbiy tekshiruv** — `mutants.mjs` dagi har himoya (RLS, siyosat,
   trigger, CHECK, GRANT…) alohida olib tashlanadi; testlar yiqilishi va
   chiqishda aynan o'sha himoyaning `FAIL:` xabari bo'lishi talab qilinadi.
   Tirik qolgan mutant = hech bir test tekshirmayotgan himoya.

Yurituvchi faqat lokal serverda ishlaydi (`PGHOST` tekshiriladi), test
fayllari esa `_stub.sql` belgisi bo'lmagan bazada (ya'ni haqiqiy
Supabase'da) ishga tushishdan bosh tortadi.

---

## 7. Hali qilinmagan / bilish kerak

- **Admin panel** (`src/admin-*.js`, UI egasi) hali Nazariy jadvallariga
  (`questions`, `topics`) murojaat qiladi — ular bu bazada yo'q. Og'zaki
  savollar uchun `verbal_items` ga moslash kerak.
- **Foydalanuvchi kirishi** ilovada hali yo'q. `src/data.js` tayyor:
  kirish qatlami `nzData.setSession({ access_token, user_id, expires_at })`
  ni chaqiradi, natija ekrani `nzData.submitResult(result)` ni.
- **`.mcp.json`** dagi Supabase MCP serveri eski (Nazariy) loyihani
  ko'rsatadi — uni Zukko loyihasiga yo'naltirish yoki olib tashlash kerak
  (bu fayl backend egaligida emas).
- Xodim hisobini o'chirish: u yozgan/ko'rib chiqqan savollar tashqi
  kalit bilan bog'langan — avval bu bog'lanishlarni hal qilish kerak
  (ataylab: "kim tasdiqlagan" izi yo'qolmasin).
- Bazaning egasi (SQL Editor, `service_role`) hamma narsani ko'radi —
  RLS faqat API orqali kirishni cheklaydi.
