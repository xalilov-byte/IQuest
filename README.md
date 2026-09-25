# IQuest — IQ testi, aql o'yinlari va mantiq mashqlari

Android ilova va sayt (**iquest.uz**), **o'zbek va rus tillarida**.
Adaptiv IQ testi (matritsa, son qatori, fazoviy va og'zaki topshiriqlar),
aql o'yinlari, mashq rejimi va har javobdan keyin qoida izohi. Natija —
**taxminiy** IQuest balli, har doim oraliq bilan. Hisob bilan: haftalik
liga, reyting va tekshiriladigan sertifikat — hammasi faqat **server qayta
hisoblagan** ballardan.

Test, mashq va o'yinlar **internetsiz ishlaydi**: savollar telefonning
o'zida tuziladi. Android ID — `uz.iquest.app`.

---

## 1. Halollik va Play siyosati — birinchi o'qing

"IQ" so'zi va'da beradi, biz esa hali me'yorlanmagan (norm) test
qilyapmiz. Hamma matn — ilovada, saytda, do'konda, sertifikatda —
`src/iq/CONTRACT.md` §6 ga bo'ysunadi. Mahsulot egasining asosiy talabi:
ilova **Google Play siyosati tufayli olib tashlanmasligi** kerak.
Qisqasi:

- ball **har doim "taxminiy" va oraliq bilan**: "Taxminiy IQ: 108 (100–116)";
- natija ekranida rad qilish matni doim ko'rinadi ("Bu klinik IQ testi emas…");
- savol kam bo'lsa (`reliable: false`) raqam ko'rsatilmaydi;
- **kafolat va raqamli va'da yo'q** ("IQ'ingizni 20 ballga oshiradi" —
  Play shuning uchun ilovani olib tashlashi mumkin); mumkin: "mashq
  qiling, natijangiz o'sishini kuzating";
- **sog'liq da'volari yo'q** (diqqat buzilishi, xotira, demensiya, "miya
  salomatligi");
- persentil ("X% dan aqlliroq"), "rasmiy / klinik / Mensa" yo'q;
  sertifikat — "IQuest testi natijasi", tekshirish kodi bilan;
- test va natija **hech qachon pul ortida emas**;
- "DTM'ga tayyorlaydi" yo'q; litsey, ijod maktablari, El-yurt umidi —
  "shu turdagi topshiriqlarni mashq qiling".

Batafsil: PLAY.md §6.

---

## 2. Qanday ishlaydi

### IQ yadrosi — `src/iq/`

Ilova mantig'i UI'dan ajratilgan va alohida testlanadi. To'liq API —
**`src/iq/CONTRACT.md`**.

```
seed ──► IQ.rng(seed)                     rng.js      urug'li tasodif (mulberry32)
           │
           ▼
   gen/<tur>.js  generate(seed, level)    matrix · series · spatial · verbal
           │     (register() bilan ro'yxatdan o'tadi)
           ▼
   IQ.makeItem(type, seed, level)         index.js    har savolni validateItem() dan
           │                                          o'tkazadi, buzuqini OTADI
           ▼
   IQ.session.create({mode:'test'|'practice'})        session.js
           │  current() → answer(i, ms) → …           keyingi savol darajasi
           │                                          joriy bahoga qarab (adaptiv)
           ▼
   IQ.score.estimate(javoblar) → {theta, se}          score.js   IRT, EAP bahosi
   IQ.score.toIQ(theta), interval(theta, se)                     100 + 15·θ, 90% oraliq
           │
           ▼
   Result { iq, lo, hi, reliable, byType, … } ──► nzProgress.recordTest()  (progress.js)
```

- **Generatorlar deterministik**: bir xil `(seed, level)` → baytma-bayt
  bir xil savol. Faqat urug' saqlanadi va savol qayta tiklanadi; server
  ham aynan shu kod bilan qayta yaratib tekshiradi. `Math.random()`
  taqiqlangan.
- **Har generator kafolatlaydi** (testda isbotlanadi): aniq bitta to'g'ri
  javob, har distraktor qoidani buzadi, variantlar vizual farq qiladi,
  to'g'ri javob o'rni tekis taqsimlangan, rang yagona farq emas.
- **Og'zaki savollar** generator emas — qo'lda yozilgan
  `content/verbal.json`; build uni `window.IQ_VERBAL` sifatida qo'yadi.
- **Baholash**: savol qiyinligi `b` darajadan olinadi (`IQ.levelToB`),
  qobiliyat EAP bilan, prior N(0,1). Aniq model va sabablari — `score.js`
  boshidagi izohda. Savollar hali **kalibrlanmagan**: `b` — a priori
  taxmin, shuning uchun natija "taxminiy".
- SVG savollar faqat `<img src="data:…">` bilan chiziladi (hech qachon
  `innerHTML`) va `validateItem` skript/tashqi havolani ushlaydi.

### Aql o'yinlari — `src/games/`

`IQ.games.register({ id, title, skill, create(seed, level) })` —
Shulte jadvali, xotira matritsasi, ketma-ketlik, N-back, tez hisob,
yo'nalish (flanker). O'yin ichida vaqt faqat `now` argumentidan keladi
(`Date.now()`, `setTimeout`, `Math.random()` taqiqlangan), shuning uchun
har o'yin **jurnaldan qayta o'ynaladi**: `IQ.games.replay(id, seed,
level, log)` aynan shu natijani beradi (CONTRACT §9).

### Server tekshiruvi, liga, reyting, sertifikat

Mijozdagi hamma narsani o'zgartirish mumkin (APK ochiladi), shuning uchun
**ball, liga va sertifikat faqat server qayta hisoblagan natijadan**
chiqadi (CONTRACT §10): test uchun server savollarni urug'dan qayta
yaratadi va javoblarni `IQ.score` bilan qayta baholaydi; o'yin uchun
jurnalni `IQ.games.replay` bilan qayta o'ynaydi. Sertifikat — faqat
`reliable: true` test uchun, noyob kod va tekshirish sahifasi bilan
(`iquest.uz/sertifikat/?kod=…`, QR — `src/cert/`). Baza —
`supabase/` (supabase/README.md).

### Ilova qobig'i (Nazariy dvigateli)

| Fayl | Nima |
|---|---|
| `src/Main.dc.html` | UI — bitta Design Canvas komponenti (markup + CSS + mantiq) |
| `src/runtime.js` | kichik render: `sc-if`, `sc-for`, `{{ }}`, DOM morphing |
| `src/progress.js` | `window.nzProgress` — qurilma xotirasi, natijalar tarixi, `levelFor` |
| `src/i18n.js`, `src/i18n-ru.js` | tillar: o'zbek (lotin; kirill — transliteratsiya), rus |
| `src/data.js` | baza bilan aloqa (ixtiyoriy — test va o'yinlar busiz ham ishlaydi) |
| `src/bootstrap.js` | tema, Android "orqaga" tugmasi, status bar |
| `build.mjs` | `src/` → `www/` · `dist/web/` · `dist/admin/`, keraksiz qatlamni kesadi |

Ichki `nz` prefikslari (`window.nzProgress`, `.nz-card`) Nazariy'dan
qolgan va **ataylab o'zgartirilmaydi**: foydalanuvchiga ko'rinmaydi,
o'zgartirish esa build tekshiruvlarini buzadi.

---

## 3. Nima qayerda

```
Zukko/                  ← papka nomi ichki (ish nomi), mahsulot — IQuest
├─ src/
│  ├─ iq/               ← IQ YADROSI: CONTRACT.md, rng, index, score, session, gen/
│  ├─ games/            ← aql o'yinlari (IQ.games)
│  ├─ cert/             ← sertifikat: QR, chizish
│  ├─ Main.dc.html      ← UI manbasi (ilova, landing, admin — bitta faylda)
│  ├─ site/pages.mjs    ← sayt matn sahifalari (maxfiylik, shartlar, aloqa…)
│  └─ *.js, *.css       ← runtime, progress, i18n, qobiq
├─ content/verbal.json  ← og'zaki savollar
├─ tests/               ← node --test (manba fayllar node:vm ichida)
├─ build.mjs            ← yig'uvchi
├─ www/                 ← mobil build (Capacitor shuni oladi)
├─ dist/                ← web/, admin/, site/ (TAYYOR SAYT)
├─ android/             ← Android Studio loyihasi (Capacitor)
├─ capacitor.config.json← appId va appName — YAGONA MANBA (§7)
├─ site.config.json     ← domen, aloqa, nashriyotchi — bitta joyda
├─ version.json         ← versionCode / versionName — yagona manba
├─ resources/           ← ikonka, splash, OG manbalari; art/ — siz yaratgan rasmlar
├─ tools/               ← sayt, ikonka, OG va Play grafikasi generatorlari
├─ supabase/            ← baza sxemasi, RLS, testlar
├─ PLAY.md              ← Play Console paketi (matnlar, Data safety, kalit)
├─ RASMLAR.md           ← kerakli rasmlar: o'lcham, yo'l, promptlar
└─ .github/workflows/   ← CI: testlar, Android build, baza
```

---

## 4. Buyruqlar

Kerak: Node.js 20+ (CI — 22). Android yig'ish uchun — Android SDK (yoki
faqat CI).

```bash
npm install
npm test              # hamma testlar (node --test)

npm run build         # www/          — Android ilovasi (admin va pul qatlami kesiladi)
npm run build:web     # dist/web/     — sayt ilovasi + landing
npm run build:admin   # dist/admin/   — admin panel
npm run site          # dist/site/    — tayyor sayt (landing + huquqiy sahifalar + PWA)
npm run build:all     # to'rttasi birga

npm run sync          # build + npx cap sync android
npm run apk           # .apk (imzo uchun kalit — PLAY.md §7)
npm run aab           # Play uchun .aab
npm run open          # Android Studio'da ochish

npm run icons         # resources/ → Android ikonka va splash (RASMLAR.md)
npm run og            # resources/og.jpg — havola ko'rinishi rasmi
npm run play:assets   # resources/play/ — Play ikonka, sarlavha rasmi, suratlar (uz/ru)
```

Rasm generatorlari (`icons`, `og`, `play:assets`) Playwright + Chromium
talab qiladi; Playwright loyihaning bog'liqligi **emas** (100+ MB) —
loyihada yoki global (`npm i -g playwright`) qidiriladi. Natijalar
(`resources/*.png`, `og.jpg`, Android `res/`) repoda saqlanadi, CI ularni
yasamaydi. `resources/play/` esa chiqarishdan oldin yangi UI'dan yasaladi.

**Qatlamlarni kesish.** Admin panel APK'da qolsa, ilovani ochgan har kim
admin ekranlarini ko'radi; tashqi to'lov oqimi APK'da qolsa, Play ilovani
olib tashlaydi (Play Billing majburiy). Shuning uchun `build.mjs` ularni
yashirmaydi, **kesadi** va qolib ketgan nomni topsa yiqiladi.

---

## 5. CI (GitHub Actions)

| Workflow | Qachon | Nima qiladi |
|---|---|---|
| `js.yml` — JS testlari | har push / PR | `npm ci && npm test` |
| `android.yml` — Android build | `main`, `claude/**`, `v*` teg | web + sayt + admin build → `cap sync` → `assembleDebug assembleRelease bundleRelease` → paket nomi va ilova nomi tekshiruvi → artefaktlar |
| `db.yml`, `db-apply.yml` — Baza | `supabase/**` o'zgarsa | migratsiya va RLS testlari; qo'lda — Supabase'ga qo'llash |

`android.yml` natijalari:

| Qayerda | Nima |
|---|---|
| Artefakt `iquest-android` | `IQuest-debug.apk`, `IQuest-release.apk`, `IQuest-release.aab` |
| Artefakt `iquest-sayt` | `dist/site/` — hostingga shu papka qo'yiladi |
| Release `sinov-<shoxcha>` (prerelease, "IQuest — sinov APK") | debug va imzolangan APK — telefonda havola orqali o'rnatiladi |

Imzo kaliti secret'lari `IQUEST_KEYSTORE_BASE64`, `IQUEST_KEYSTORE_PASSWORD`,
`IQUEST_KEY_ALIAS`, `IQUEST_KEY_PASSWORD` — **IQuest'ning o'z kaliti**,
Nazariy'niki emas (PLAY.md §7). Secrets bo'lmasa ham workflow ishlaydi:
`IQuest-debug.apk` har doim o'rnatiladi, release esa imzosiz chiqadi.

Bu muhitda lokal Android build ishlamaydi (Google Maven bloklangan),
shuning uchun Android o'zgarishlari **CI'da** tekshiriladi. Ikki to'siq:

- `android/app/build.gradle` → `iqIdentity`: `MainActivity.java` paketi
  va `strings.xml` qiymatlari `capacitor.config.json` ga mos; ID'da
  "nazariy" bo'lsa yoki kalit alias'i "nazariy" bo'lsa — build to'xtaydi;
- CI qadami "Ilova identifikatorini tekshirish": tayyor APK ichidagi
  paket nomi va ilova nomi (`aapt2 dump badging`) `capacitor.config.json`
  bilan bir xil; `www/` da eski nomlar (Nazariy, Zukko) qolsa —
  ogohlantirish.

---

## 6. Sayt

`npm run site` → `dist/site/`. Hostingga (Cloudflare Pages, Vercel va
h.k.) shu papkani qo'yish kifoya. Domen — `iquest.uz`.

| Manzil | Nima |
|---|---|
| `/` | Landing + brauzerdagi ilova |
| `/maxfiylik/` | Maxfiylik siyosati (Play talabi) |
| `/shartlar/` | Foydalanish shartlari |
| `/aloqa/` | Aloqa (Play talabi) |
| `/malumot-ochirish/` | Ma'lumotni / hisobni o'chirish (Play talabi) |
| `/sertifikat/?kod=…` | Sertifikatni tekshirish (cert/backend) |

Domen, aloqa manzili va nashriyotchi **faqat `site.config.json` da**.
Noma'lum qiymatlar (aloqa pochtasi, yuridik shaxs) ataylab to'ldirilmagan.
Sayt domenda haqiqatan ochilmaguncha (`domainConfirmed: false`)
`sitemap.xml`, `canonical` va `og:image` yozilmaydi va `robots.txt`
indekslashni taqiqlaydi.

---

## 7. Android: identifikator, nom, ikonka

**Yagona manba — `capacitor.config.json`** (`appId`, `appName`).
`android/app/build.gradle` namespace, applicationId va APK fayl nomini
shundan oladi; CI kutilgan qiymatlarni ham shundan o'qiydi.

`applicationId` (`uz.iquest.app`) — Play'dagi doimiy manzil: **birinchi
yuklashdan keyin o'zgartirib bo'lmaydi.**

**Ikonka va splash** — `npm run icons`. Manba: `resources/art/` dagi
rasmlar (RASMLAR.md), yo'q qatlamlar esa `tools/icon.html` dan
(vaqtinchalik geometrik belgi: 3×3 panjara, "Q" halqasi, oltin katak)
chiziladi. `capacitor-assets` `android/app/src/main/res/**` ni qayta
yozadi va `AndroidManifest.xml` ni qayta formatlashi mumkin (mazmuni
o'zgarmaydi).

### Nomni almashtirish

Ish davomida nom bir marta almashgan (ish nomi Zukko → IQuest) — aynan
shu tartib bilan, nusxada sinab ko'rilgan. Yana kerak bo'lsa, **Play'ga
birinchi yuklashdan OLDIN**:

```bash
OLD_ID=uz.iquest.app   NEW_ID=uz.yangi.app      # yangi ID
OLD=IQuest             NEW=Yangi                # yangi nom (lotin harflari)
old=$(echo "$OLD" | tr A-Z a-z); new=$(echo "$NEW" | tr A-Z a-z)
OLDU=$(echo "$OLD" | tr a-z A-Z); NEWU=$(echo "$NEW" | tr a-z A-Z)

# 1) Java paketi papkasi (build.gradle MainActivity'ni shu yerda kutadi)
mkdir -p "android/app/src/main/java/${NEW_ID//.//}"
mv "android/app/src/main/java/${OLD_ID//.//}/MainActivity.java" \
   "android/app/src/main/java/${NEW_ID//.//}/"
rmdir -p "android/app/src/main/java/${OLD_ID//.//}" 2>/dev/null || true

# 2) Qolgan hamma joy: ID, keyin nomning uch yozilishi (IQuest, iquest, IQUEST)
grep -rlI --exclude-dir={node_modules,.git,www,dist} \
     -e "$OLD_ID" -e "$OLD" -e "$old" -e "$OLDU" . |
  xargs sed -i -e "s/${OLD_ID//./\\.}/$NEW_ID/g" \
               -e "s/$OLD/$NEW/g" -e "s/$old/$new/g" -e "s/$OLDU/$NEWU/g"

# 3) Tekshirish
grep -rniI --exclude-dir={node_modules,.git,www,dist} "$old" .   # bo'sh bo'lishi kerak
npm test && npm run build:all
npm run icons && npm run og                                        # rasmlardagi nom
```

Keyin: GitHub secret nomlari (`IQUEST_*` → yangi prefiks) yangidan
qo'shiladi; do'kon matnlari (PLAY.md) o'qib chiqiladi — avtomatik
almashtirish grammatikani buzishi mumkin ("IQuest'ning" kabi
qo'shimchalar); domen (`site.config.json`, sertifikat havolasi) alohida
tekshiriladi; vaqtinchalik ikonka belgisi ("Q") nomga bog'liq —
`tools/icon.html`. `build.gradle` va CI qolgan nomuvofiqlikni tutadi.

Nom uchraydigan joylar:

| Joy | Nima |
|---|---|
| `capacitor.config.json` | `appId`, `appName` — **manba** |
| `android/app/src/main/res/values/strings.xml` | `app_name`, `title_activity_main`, `package_name`, `custom_url_scheme` |
| `android/app/src/main/java/uz/iquest/app/MainActivity.java` | papka yo'li va `package` satri |
| `android/app/src/androidTest/…/ExampleInstrumentedTest.java` | kutilgan paket nomi |
| `android/app/build.gradle` | `IQUEST_*` muhit o'zgaruvchilari, izohlar (ID va nom — manbadan) |
| `.github/workflows/android.yml` | artefakt nomlari `iquest-android`, `iquest-sayt`; secret nomlari `IQUEST_*`; izohlar (sarlavha va fayl nomi — manbadan) |
| `site.config.json` | `domain`, `appId`, `appName`, `publisher`, `playUrl` izohi, `description` |
| `tools/icon.html` | belgi ("Q" — nomning bosh harfi) va izoh |
| `tools/mkog.mjs`, `tools/mkplay.mjs` | nom `capacitor.config.json` dan o'qiladi; rasmni qayta yasash kifoya |
| `README.md`, `PLAY.md`, `RASMLAR.md`, `.claude/agents/*.md` | matnlar |
| boshqa egalar | `package.json`, `src/Main.dc.html`, `src/i18n*.js`, `src/cert/**`, `tools/mksite.mjs`, `src/site/pages.mjs`, `src/iq/CONTRACT.md`, `.github/workflows/js.yml`, `supabase/**` — `grep -rni iquest` bilan |

---

## 8. Nazariy'dan kelib chiqishi

IQuest Nazariy (haydovchilik nazariy imtihoni ilovasi, `uz.nazariy.app`)
dvigatelidan qurilgan: Capacitor qobig'i, `Main.dc.html` + o'z runtime'i,
build va qatlamlarni kesish, sayt yig'uvchi, CI, Supabase naqshlari.
Mahsulot esa **butunlay alohida**:

- Nazariy Play'da o'z ilovasi bo'lib qoladi; IQuest uning **ID'sini,
  imzo kalitini, bazasini va nomini ishlatmaydi** (build va CI buni
  tekshiradi);
- savollar banki, yo'l belgilari va imtihon formati o'rniga — IQ yadrosi
  (`src/iq/`) va aql o'yinlari (`src/games/`);
- haydovchilik mavzusidagi rasmlar (`src/reyting-bg.jpg`,
  `src/hafta-bg.jpg`) hali APK'ga tushadi — almashtirish yoki build'dan
  olib tashlash kerak (RASMLAR.md §10–11).

---

## 9. Texnik eslatmalar

**Nega Capacitor, TWA emas.** TWA saytni ko'rsatadi va yangilanish
saytdan keladi. Bu yerda test va o'yinlar telefonda, internetsiz
ishlashi kerak, yangilanish esa Play'dan keladi. Capacitor web fayllarni
APK ichiga qo'yadi.

**Nega o'z render'i.** Dizayn fayli Design Canvas formatida (`sc-if`,
`sc-for`, `{{ }}`). Kanvas runtime'i muharrir bilan keladi va ilovaga
yaramaydi, shuning uchun aynan shu uch imkoniyat uchun kichik render
yozilgan (`src/runtime.js`). U DOM'ni qayta yaratmaydi, **morph**
qiladi — scroll joyi va animatsiyalar saqlanadi.

**Shriftlar offline.** Manrope va Space Grotesk `www/fonts/` ichida
(`@fontsource` dan), Google Fonts havolasi yo'q.

**Pastki menyu va Android navigatsiyasi.** `src/shell.css` panelni
`env(safe-area-inset-bottom)` bilan tizim paneli ustiga ko'taradi,
sirti esa uning ostigacha davom etadi.

**Assets eskirishi.** `./gradlew` to'g'ridan-to'g'ri chaqirilsa, APK
eski `www/` bilan yig'ilishi mumkin edi. `build.gradle` → `nzAssetsFresh`
yig'ishdan oldin ikkala nusxani solishtiradi va farq bo'lsa to'xtaydi —
`npm run sync` qiling.
