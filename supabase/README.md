# Baza (Supabase)

Bu papkada savollar bazasining sxemasi, boshlang'ich ma'lumoti va
xavfsizlik tekshiruvlari turadi.

```
supabase/
├─ config.json              ← loyiha URL va publishable kalit (OMMAVIY)
├─ apply.sh                 ← migratsiya+seed'ni qo'llash (CI va lokal)
├─ migrations/
│  └─ 0001_init.sql         ← sxema, RLS, triggerlar
├─ seed/
│  └─ 0002_questions.sql    ← 8 mavzu, 10 savol (GENERATOR yasaydi)
└─ tests/
   ├─ _stub.sql             ← Supabase auth sxemasining lokal taqlidi
   └─ 0001_rls.sql          ← RLS va "to'rt ko'z" qoidasi tekshiruvi
```

---

## 1. Qanday qo'llanadi

Ikki yo'l bor. **Birinchisi tavsiya etiladi** — SQL'ni qo'lda nusxalab
qo'yish kerak emas.

### A) CI orqali (avtomatik)

Bir martalik sozlash, keyin bitta tugma:

1. Supabase → **Project Settings → Database → Connection string** →
   **URI** ni nusxalang (Session pooler tavsiya etiladi). Satrda
   `[YOUR-PASSWORD]` bo'lsa, haqiqiy parol bilan almashtiring.
2. GitHub → repo → **Settings → Secrets and variables → Actions** →
   **New repository secret**:
   - Nom: `SUPABASE_DB_URL`
   - Qiymat: o'sha URI
3. **Actions → "Bazaga qo'llash" → Run workflow** → `tasdiq` maydoniga
   `ha` deb yozib ishga tushiring.

Workflow migratsiya va seed'ni qo'llaydi, keyin **tashqaridan** RLS
tekshiruvini o'tkazadi: nashr etilgan savollar ko'rinishini, qoralama
va audit jurnali esa ko'rinmasligini tasdiqlaydi.

Parol GitHub Secrets'da qoladi — logda ko'rinmaydi, repoga tushmaydi.

Nima uchun shunday: Claude Code ishlayotgan bulutli muhitdan Supabase
domeni tashqi tarmoq siyosati bilan bloklangan (HTTP 403 — brauzer
bilan ham, `curl` bilan ham tekshirilgan), GitHub runner'ida esa
tarmoq ochiq.

### B) Qo'lda (SQL Editor)

1. [Supabase panel](https://supabase.com/dashboard) → loyihangiz → **SQL Editor**
2. `migrations/0001_init.sql` ni butunlay nusxalab qo'yib **Run**
3. `seed/0002_questions.sql` ni nusxalab qo'yib **Run**
4. Tekshirish — shu so'rovni bajaring:

   ```sql
   select count(*) from public.topics;               -- 8
   select count(*) from public.questions;            -- 10
   select count(*) from public.question_translations; -- 10
   select count(*) from public.published_questions;  -- 10
   select count(*) from public.audit_log;            -- 10
   ```

Shundan keyin GitHub'dagi **Baza** workflow'i jonli tekshiruvni ham
o'tkazadi: qoralama savollar va audit jurnali tashqaridan ko'rinmasligini
haqiqiy loyihada tasdiqlaydi.

### O'zingizga "owner" rolini berish

Migratsiya barcha yangi foydalanuvchiga `user` rolini beradi. Admin
panelda ishlash uchun o'zingizga `owner` kerak. Avval ilovaga kirib
(hisob yaratib), keyin SQL Editor'da:

```sql
update public.profiles set role = 'owner' where id = auth.uid();
-- yoki email bo'yicha:
update public.profiles p set role = 'owner'
from auth.users u where u.id = p.id and u.email = 'siz@example.com';
```

Buni **faqat SQL Editor'dan** qilish mumkin — ilova orqali hech kim
o'ziga rol bera olmaydi (tekshirilgan: `tests/0001_rls.sql`).

---

## 2. Nima uchun RLS bu yerda eng muhim narsa

Klient (APK, sayt, Telegram) **publishable** kalit bilan ishlaydi va u
kalit hammaga ko'rinadi: mobil ilovadan kalitni yashirib bo'lmaydi —
APK'ni ochgan odam uni topadi.

Ya'ni ma'lumotni kalit emas, **faqat RLS himoya qiladi.**

Shuning uchun migratsiyada:

- har bir jadvalda RLS **yoqilgan**;
- standart holat — **hech kimga ruxsat yo'q**, ruxsatlar aniq siyosat
  bilan beriladi;
- ommaga faqat **nashr etilgan** savollar ko'rinadi (qoralama va ko'rib
  chiqishdagilar chiqmaydi);
- audit jurnali faqat auditor va egasiga ko'rinadi, hech kim uni
  o'zgartira olmaydi;
- foydalanuvchi o'ziga rol bera olmaydi.

Bularning har biri `tests/0001_rls.sql` da tekshiriladi va CI har
push'da o'tkazadi. "RLS yozdim" degan gap yetarli emas — u haqiqatan
to'sayotgani tasdiqlanishi kerak.

**`service_role` kaliti hech qachon repoga yoki klientga tushmaydi.** U
RLS'ni butunlay chetlab o'tadi va faqat serverda (Edge Function)
ishlatiladi.

---

## 3. Ikki qoida bazada majburlanadi

Dizaynda o'ylab qo'yilgan ikki qoida klientda emas, **bazada**
bajariladi — klient kodini chetlab o'tish mumkin (API'ga qo'lda so'rov),
bazani esa yo'q.

### "To'rt ko'z"

Javob kaliti o'zgarsa savol **majburan** ko'rib chiqishga qaytadi va
o'zgartirgan odam **o'zi tasdiqlay olmaydi** — boshqa xodim nashr etishi
shart. Sabab: noto'g'ri javob kaliti imtihonga tayyorlanayotgan odam
uchun eng og'ir zarar.

### "Jurnalga tushmaydigan o'zgarish bo'lmaydi"

Audit yozuvini **trigger** qo'yadi, klient emas. Shuning uchun jurnalga
tushmaydigan o'zgarish bo'lishi mumkin emas.

---

## 4. Seed generatori

`seed/0002_questions.sql` **qo'lda tahrir qilinmaydi** — u generator
bilan yasaladi:

```bash
node tools/mkseed.mjs
```

Manba: `src/Main.dc.html` (QUESTIONS massivi) va `src/i18n-ru.js` (rus
tarjimalari). CI generator natijasi commit qilingan fayl bilan mos
kelishini tekshiradi.

Savollar DB'ga ko'chib, admin panel ishlagandan keyin bu generator
kerak bo'lmaydi — manba DB bo'ladi.

---

## 5. Supabase MCP serveri

`.mcp.json` da Supabase'ning MCP serveri sozlangan. U Claude Code'ga
bazani to'g'ridan-to'g'ri ko'rish imkonini beradi: jadvallarni o'qish,
migratsiya qo'llash, loglarni tekshirish.

```
.mcp.json → supabase (http)
  https://mcp.supabase.com/mcp?project_ref=nnjlshvfrgosnjqezblx&features=…
```

**Ishga tushirish uchun bir marta autentifikatsiya kerak** — buni faqat
o'z kompyuteringizdagi oddiy terminalda qilish mumkin (IDE kengaytmasida
emas):

```bash
claude /mcp          # supabase → Authenticate
```

### Bu sessiyada ishlamaydi — nima uchun

Ikki mustaqil sabab:

1. **Tarmoq.** `mcp.supabase.com` bu muhitning tashqi tarmoq siyosati
   bilan bloklangan (HTTP 403), xuddi `supabase.com` va loyiha domeni
   kabi. Shuning uchun server bu yerdan umuman ko'rinmaydi.
2. **Autentifikatsiya.** OAuth oqimi brauzer va interaktiv terminal
   talab qiladi; bu sessiya ularning ikkalasiga ham ega emas.

Ya'ni MCP serveri **sizning mashinangizdagi** Claude Code sessiyalarida
ishlaydi, bu bulutli sessiyada esa yo'q. Shu sababli bazadagi ishlar
bu yerda boshqa yo'l bilan tekshiriladi: lokal PostgreSQL (§6) va
CI'dagi jonli tekshiruv (`.github/workflows/db.yml`).

---

## 6. Lokal tekshiruv (Supabase kerak emas)

Migratsiyani o'zgartirgandan keyin lokal PostgreSQL'da sinash mumkin:

```bash
psql -f supabase/tests/_stub.sql          # auth sxemasi taqlidi
psql -f supabase/migrations/0001_init.sql
psql -f supabase/seed/0002_questions.sql
psql -f supabase/tests/0001_rls.sql       # "HAMMA TEKSHIRUV O'TDI"
```

Xuddi shu ketma-ketlikni CI ham bajaradi (`.github/workflows/db.yml`),
shuning uchun SQL'dagi xato Supabase'ga tegmasdan tutiladi.
