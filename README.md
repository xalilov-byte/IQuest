# IQuest — Android ilova

IQ testi va mantiqiy (aql) o'yinlari ilovasi. Sayt: **IQuest.uz**,
Android ID: `uz.iquest.app`. **To'liq offline ishlaydi**: savollar
qurilmaning o'zida yaratiladi (generatorlar), shriftlar va hamma
narsa APK ichida — bir marta o'rnatilgandan keyin internet kerak emas.
Yangilanishlar **Play Market orqali** keladi.

Loyiha Nazariy (haydovchilik nazariy imtihoni ilovasi) dvigateli
asosida qurilgan: Capacitor Android + bitta Design Canvas fayli
(`src/Main.dc.html`) + o'z runtime'i. Ichki `nz` prefikslari
(`window.nzProgress`, `.nz-card`) ataylab o'zgartirilmagan — ular
foydalanuvchiga ko'rinmaydi.

**Barcha qismlar uchun yagona kelishuv — `src/iq/CONTRACT.md`.** API,
fayl egaligi va, eng muhimi, **halollik qoidalari** (§6) o'sha yerda.
Qisqasi: ball har doim "taxminiy" va oraliq bilan; "IQ oshiradi",
"rasmiy", "sertifikatlangan", "Mensa", "klinik", persentil — yo'q;
test va natija har doim bepul.

---

## 1. Nima qayerda

```
iquest/
├─ src/
│  ├─ Main.dc.html      ← DIZAYN MANBASI: ekranlar, CSS, ilova mantig'i
│  ├─ iq/               ← IQ YADROSI (ilovadan mustaqil, testlanadi)
│  │  ├─ CONTRACT.md    ← shartnoma — avval shuni o'qing
│  │  ├─ rng.js         ← deterministik tasodif (IQ.rng) — Math.random TAQIQ
│  │  ├─ index.js       ← generatorlar reyestri + savol tekshirgichi
│  │  ├─ score.js       ← Rasch/EAP baholash, taxminiy IQ va 90% oraliq
│  │  ├─ session.js     ← test va mashq oqimi (adaptiv, qayta o'ynaladi)
│  │  └─ gen/           ← savol generatorlari: matrix, series, spatial, verbal
│  ├─ games/            ← aql o'yinlari (Schulte, n-back, ketma-ketlik…)
│  ├─ cert/             ← sertifikat (keyingi versiya, faqat server bilan)
│  ├─ progress.js       ← qurilma xotirasi: ball, streak, test tarixi
│  ├─ runtime.js        ← kichik render (sc-if / sc-for / {{ }}), morph
│  ├─ i18n.js, i18n-ru.js ← o'zbek (lotin/kirill) va rus
│  ├─ shell.css         ← maketni qurilma ekraniga moslash (§5)
│  ├─ bootstrap.js      ← tema, Android "orqaga" tugmasi, status bar
│  └─ site/             ← saytning matn sahifalari (maxfiylik va h.k.)
├─ content/
│  └─ verbal.json       ← og'zaki savollar (qo'lda yozilgan, uz + ru)
├─ tests/               ← `npm test` — node:test, tashqi kutubxonasiz
├─ build.mjs            ← src/ → www/ | dist/web/ | dist/admin/
├─ site.config.json     ← domen, aloqa, bot nomi — bitta joyda
├─ version.json         ← versionCode / versionName — yagona manba
├─ android/             ← Android Studio loyihasi
├─ resources/           ← ikonka, splash va OG rasm manbalari
├─ tools/               ← sayt yig'uvchi, ikonka / OG / Play grafika generatori
├─ supabase/            ← server qismi (hozir ATAYLAB ulanmagan, §8)
├─ PLAY.md              ← Play Console paketi (matnlar, Data safety)
└─ .github/workflows/   ← GitHub'da avtomatik APK/AAB yig'ish va testlar
```

### IQ yadrosi — `src/iq/`

Savollar bankdan olinmaydi — **generatorlar** ularni urug'dan (seed)
yaratadi: `IQ.makeItem(type, seed, level)`. Bir xil `(seed, level)` →
aynan bir xil savol (SVG baytma-bayt bir xil). Bu uch narsani beradi:

- **cheksiz savol** — ilova offline, lekin savollar tugamaydi;
- **tekshiriladigan natija** — server keyinchalik testni jurnal
  bo'yicha qayta yaratib, ballni o'zi hisoblay oladi (CONTRACT §10);
- **testlanadigan sifat** — har generator minglab urug'da tekshiriladi:
  aniq bitta to'g'ri javob, variantlar vizual farqli, to'g'ri javob
  o'rni tekis taqsimlangan, daraja haqiqatan qiyinlashadi, rang yagona
  farq emas (§2).

To'rt tur: **matritsa** (Raven uslubidagi 3×3), **son qatorlari**,
**fazoviy** (aqlda aylantirish, bo'lak to'ldirish), **og'zaki**
(`content/verbal.json` — analogiya, ortiqchasini top va h.k.).

Baholash (`score.js`): Rasch modeli, EAP baho, `100 + 15·θ` shkalasi
va 90% oraliq. Savollar hali katta guruhda **me'yorlanmagan**, shuning
uchun natija ekranida doim "taxminiy" so'zi, oraliq va rad qilish
matni turadi; savol kam bo'lsa (`reliable: false`) IQ raqami umuman
ko'rsatilmaydi.

### Aql o'yinlari — `src/games/`

Har o'yin faqat HOLAT beradi (`GameView`), ekranni ilovadagi bitta
umumiy o'yin ekrani chizadi. Vaqt tashqaridan (`tick(now)`) keladi —
o'yin ichida `Date.now()`, `setTimeout`, `Math.random()` yo'q. Shu
sababli o'yin jurnal bo'yicha **qayta o'ynaladi** (`IQ.games.replay`)
va testda aynan shu ball chiqishi isbotlanadi. Shartnoma: §9.

### Testlar — `tests/`

```bash
npm test          # node --test 'tests/**/*.test.mjs'
```

Modullar `node:vm` ichida `window` taqlidi bilan yuklanadi (manba
faylga test uchun o'zgartirish kiritilmaydi). Nomlash: `iq-*.test.mjs`
(generatorlar, baholash, sessiya), `game-*.test.mjs` (o'yinlar),
`cert-*.test.mjs`, `progress.test.mjs`, `data.test.mjs`,
`bulk.test.mjs`. CI (`.github/workflows/js.yml`) har push'da ishga
tushiradi.

### Build maqsadlari

Manba faylda bir nechta mustaqil ilova bir joyda yashaydi. `build.mjs`
har bir maqsad uchun **keraksiz qatlamni kesib tashlaydi**:

| Buyruq | Chiqish | Nima kiradi |
|---|---|---|
| `npm run build` | `www/` | Foydalanuvchi ilovasi. Admin, landing va pul qatlami **kesiladi** |
| `npm run build:web` | `dist/web/` | Foydalanuvchi ilovasi + landing. Admin **kesiladi** |
| `npm run build:admin` | `dist/admin/` | Faqat admin panel |
| `npm run site` | `dist/site/` | **Tayyor sayt**: landing + huquqiy sahifalar + PWA |

**Nima uchun kesiladi, yashirilmaydi:** admin panel APK ichida qolsa,
ilovani ochgan har qanday odam admin ekranlarini ko'radi va API'ga qo'lda
so'rov yuborishga urinadi. Shuning uchun admin qatlami mobil va sayt
build'lariga **umuman kirmaydi**. Buni `build.mjs` o'zi tekshiradi —
admin nomlaridan bittasi qolsa, build yiqiladi. Pul qatlami ham mobil
build'dan kesiladi: test va natija hech qachon pul ortida emas (§6.6).

IQ yadrosi (`src/iq/*.js`, `gen/*.js`) va o'yinlar oddiy skript
sifatida `index.html` ga joylanadi — import yo'q, tashqi kutubxona yo'q
(CSP tashqi skriptni to'sadi, ilova offline).

---

### Sayt

`npm run site` → `dist/site/`. Hostingga (Cloudflare Pages, Vercel va
h.k.) shu papkani qo'yish kifoya — build mashinasi kerak emas. CI ham
har push'da yig'ib, `iquest-sayt` nomi bilan saqlaydi.

| Manzil | Nima |
|---|---|
| `/` | Landing + brauzerdagi ilova |
| `/maxfiylik/` | Maxfiylik siyosati |
| `/shartlar/` | Foydalanish shartlari |
| `/aloqa/` | Aloqa |
| `/malumot-ochirish/` | Ma'lumotni o'chirish |

Matn sahifalarida **JS yo'q**: maxfiylik siyosatini o'qish uchun butun
ilovani yuklab olish kerak emas. Uchtasi (maxfiylik, aloqa, ma'lumotni
o'chirish) — Google Play'ning majburiy talabi.

Domen, aloqa manzili va bot nomi **faqat `site.config.json` da**.
Domen tasdiqlanmaguncha (`domainConfirmed: false`) `sitemap.xml`,
`canonical` va `og:image` yozilmaydi va `robots.txt` indekslashni
taqiqlaydi — tugallanmagan sayt qidiruvga tushmasligi kerak. Telegram
bot hali yo'q, shuning uchun `telegramBot` bo'sh — Telegram tugmalari
ko'rsatilmaydi.

`npm run og` — havola ko'rinishidagi rasmni (`resources/og.jpg`) qayta
yasaydi. U bir marta yasalib repoda saqlanadi, chunki yasash uchun
brauzer kerak va uni har build'da ishga tushirish CI'ni sekinlashtiradi.

---

## 2. Yig'ish

Ikki yo'l bor. Kompyuteringizda hech narsa yo'q bo'lsa — birinchisi.

### A) GitHub orqali (hech narsa o'rnatmasdan)

1. Bu papkani GitHub repozitoriyasiga yuklang
2. Imzo kaliti yarating (bir marta, quyida §3)
3. GitHub → **Settings → Secrets and variables → Actions** ga 4 ta secret qo'shing:
   `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`
4. **Actions → Android build → Run workflow**
   (har bir `main` yoki `claude/...` shoxchasiga push'da ham o'zi ishga tushadi)
5. 5–7 daqiqadan keyin `iquest-android` arxivini yuklab oling. Ichida:

   | Fayl | Nima uchun |
   |---|---|
   | `IQuest-debug.apk` | Telefonga **darhol o'rnatiladi**. Secrets kerak emas — sinash uchun eng qulayi. |
   | `IQuest-release.apk` | Secrets qo'yilgan bo'lsa imzolangan; bo'lmasa imzosiz (o'rnatilmaydi). |
   | `IQuest-release.aab` | Play Market uchun. Imzo **shart**. |

   Debug APK Release'ga ham qo'yiladi (`sinov-<shoxcha>` tegi) —
   telefonda brauzerdan to'g'ridan-to'g'ri yuklab olish uchun.
   "Noma'lum manbalardan o'rnatish"ga ruxsat berib o'rnatiladi.

### B) Kompyuterda (Android Studio)

Kerak: Android Studio (Android SDK bilan) va Node.js 20+.

```bash
npm install
npm test              # IQ yadrosi, o'yinlar, progress testlari
npm run sync          # src/ → www/ → android/
npm run aab           # Play Market uchun .aab
npm run apk           # telefonda sinash uchun .apk

npm run build:all     # hamma maqsadni yig'ish (mobil + sayt + admin)
```

Natijalar:
`android/app/build/outputs/bundle/release/IQuest-release.aab`
`android/app/build/outputs/apk/release/IQuest-release.apk`

Android Studio'da ochish: `npm run open`

**Eskirgan assets'dan himoya.** `./gradlew` to'g'ridan-to'g'ri
chaqirilsa va `npm run sync` unutilgan bo'lsa, APK eski veb-nusxa bilan
yig'ilardi. `android/app/build.gradle` dagi `nzAssetsFresh` vazifasi
`www/index.html` ni APK ichidagi nusxa bilan solishtiradi va farq
bo'lsa build'ni to'xtatadi.

---

## 3. Imzo kaliti (bir marta, juda muhim)

Play Market ilovani imzo kaliti bilan taniydi. **Bu faylni yo'qotsangiz,
ilovani boshqa hech qachon yangilay olmaysiz** — yangi ilova sifatida
qaytadan chiqarishga to'g'ri keladi. Nusxasini xavfsiz joyda saqlang.

```bash
keytool -genkey -v -keystore iquest.keystore \
  -alias iquest -keyalg RSA -keysize 2048 -validity 10000
```

**Mahalliy yig'ish uchun** `android/keystore.properties` faylini yarating
(u `.gitignore` da — git'ga tushmaydi):

```properties
storeFile=/to/liq/yo/l/iquest.keystore
storePassword=...
keyAlias=iquest
keyPassword=...
```

**GitHub uchun** kalitni base64 ga o'giring va secret sifatida qo'ying:

```bash
base64 -w0 iquest.keystore > keystore.txt
```

CI ichida kalit `IQUEST_KEYSTORE`, `IQUEST_STORE_PASSWORD`,
`IQUEST_KEY_ALIAS`, `IQUEST_KEY_PASSWORD` muhit o'zgaruvchilari orqali
`build.gradle` ga beriladi (workflow buni o'zi qiladi).

---

## 4. Play Market'ga joylash

To'liq paket — **`PLAY.md`** (do'kon matnlari uz + ru, Data safety,
IARC, chiqarishdan oldingi ro'yxat). Qisqasi:

1. [Play Console](https://play.google.com/console) da dasturchi akkaunti
   (bir martalik $25)
2. **Create app** → nomi "IQuest", til o'zbek, bepul
3. **Internal testing → Create new release** → `IQuest-release.aab`
4. Do'kon sahifasi, grafika (`npm run play:assets`), maxfiylik siyosati
   havolasi, **Data safety** (v1: hech narsa yig'ilmaydi), reyting anketasi
5. Yangi shaxsiy hisob uchun: closed testing (12+ tester, 14 kun),
   keyin Production

### Yangilanish chiqarish

Versiya **faqat `version.json` da** — `build.gradle` o'sha fayldan
o'qiydi:

```json
{ "versionCode": 2, "versionName": "1.0.1" }
```

`versionCode` HAR SAFAR +1 (Play bir xil yoki kichik raqamni rad
etadi). Keyin `npm run aab` → Play Console'ga yangi `.aab` → **Rollout**.

---

## 5. Maket → ilova: nima o'zgardi

Dizayn "maket" sifatida chizilgan: brauzer sahifasi ichida markazlashgan
390px telefon ramkasi, tepasida ilova / sayt / admin almashtirgichi.
Ilovada esa ramka — qurilma ekranining o'zi. Faqat shu moslandi
(`src/shell.css`), ekranlarning uslubiga tegilmadi:

| Maketda | Ilovada |
|---|---|
| 390px ramka, chekka, radius, soya | butun ekran (`100dvh`), chekkasiz |
| tepadagi ilova/sayt/admin almashtirgichi | yashirilgan (o'chirilmagan) |
| butun sahifa scroll qilardi | ekran maydonining o'zi scroll qiladi |
| tema tugmasi maket sarlavhasida | **qurilma sozlamasidan** (Android tungi rejimi) |

### Pastki menyu va Android navigatsiyasi

Ilovaning pastki tab paneli Androidning o'z navigatsiya paneli (uch
tugma yoki jest chizig'i) ortida qolib ketmasligi kerak. Yechim
`shell.css` da:

```css
.nz-nav{
  height: calc(68px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
}
```

Panelning **sirti** tizim paneli ostigacha davom etadi (rang uzilmaydi),
**bosiladigan qismi** esa uning tepasida qoladi. Tepada ham xuddi shunday:
ramka `padding-top: env(safe-area-inset-top)` oladi, shuning uchun kontent
status bar ostiga kirib ketmaydi. (`capacitor.config.json` da
`adjustMarginsForEdgeToEdge: "disable"` — chekkalarni Capacitor emas,
shu CSS boshqaradi.)

### "Orqaga" tugmasi

Standart holatda WebView'da orqaga bosilsa ilova darhol yopiladi.
Bu yerda orqaga tugmasi ilovaning o'z ierarxiyasi bo'yicha yuradi
(`src/bootstrap.js`):

```
ochiq oyna (drawer / tasdiq)           → yopiladi
test ketyapti                          → testdan chiqadi
tab ≠ Bosh                             → Bosh ekranga qaytadi
Bosh ekranda                           → "Chiqish uchun yana bosing" → chiqadi
```

Yangi ekran (masalan o'yin) qo'shilganda uning chiqish qadami ham shu
zanjirga qo'shiladi — aks holda "orqaga" ilovani yopib yuboradi.
Test ilova yopilgandan keyin davom ettirilishi uchun sessiyada
`IQ.session.snapshot()` / `restore()` bor (CONTRACT §3).

---

## 6. Sozlamalar

**Paket nomi** (`uz.iquest.app`) — Play Market'da ilovaning doimiy
manzili. **Birinchi yuklashdan keyin o'zgartirib bo'lmaydi.** U uch
joyda yozilgan va ular bir xil bo'lishi shart:

```
capacitor.config.json                        → "appId"
android/app/build.gradle                     → applicationId, namespace
android/app/src/main/res/values/strings.xml  → package_name, custom_url_scheme
```

(`MainActivity.java` ham shu paket papkasida:
`android/app/src/main/java/uz/iquest/app/`.)

**Ilova nomi** — `strings.xml` → `app_name` va `capacitor.config.json`
→ `appName` ("IQuest").

**Ikonka** — `tools/icon.html` ni tahrirlang, keyin `npm run icons`
(Playwright + Chromium kerak; natija `resources/*.png` va
`android/app/src/main/res/mipmap-*`, `drawable-*`). Belgi — qalin "IQ"
monogrammasi; tibbiy/klinik ishoralar (miya, xoch, stetoskop) ataylab
ishlatilmagan.

---

## 7. Texnik eslatmalar

**Nega Capacitor, TWA emas.** TWA (Trusted Web Activity) saytni ko'rsatadi
va yangilanish saytdan keladi — bizga esa aksincha kerak: hamma narsa
telefonda saqlansin, yangilanish Play Market'dan kelsin. Capacitor aynan
shunday ishlaydi: web fayllar APK ichiga kiradi, internet talab qilinmaydi.

**Nega o'z render'i.** Dizayn fayli Claude Design Canvas formatida
(`sc-if`, `sc-for`, `{{ }}`). Kanvas runtime'i muharrir bilan birga keladi
va ilovaga yaramaydi, shuning uchun aynan shu uch imkoniyat uchun kichik
render yozildi (`src/runtime.js`). U DOM'ni qaytadan yaratmaydi, balki
**morph** qiladi — holat o'zgarganda ro'yxatning scroll joyi saqlanadi
va animatsiyalar qaytadan ijro etilmaydi.

**SVG xavfsiz ko'rsatiladi.** Generatorlar yasagan SVG hech qachon
`innerHTML` bilan qo'yilmaydi — faqat `<img src="${IQ.svgSrc(svg)}">`.
`validateItem` skript, `on*=`, `<foreignObject>` va tashqi `href` ni
ushlaydi (CONTRACT §2).

**Shriftlar offline.** Manrope va Space Grotesk `www/fonts/` ichida
(woff2). Google Fonts havolasi yo'q — internetsiz ham shriftlar to'g'ri
ko'rinadi.

---

## 8. Keyingi versiya: server (hozir YO'Q)

`supabase/config.json` **ataylab bo'sh**: bu loyiha Nazariy'dan nusxa
olingan va o'sha mahsulotning bazasiga hech qachon yozmasligi kerak.
Bo'sh sozlama bilan ilova to'liq offline ishlaydi va **hech qanday
ma'lumot yubormaydi**.

Rejadagi qism (CONTRACT §7, §10) — hammasi faqat **serverda qayta
hisoblangan** natijadan:

| Funksiya | Qanday tekshiriladi |
|---|---|
| Test natijasini tasdiqlash | Supabase Edge Function savollarni urug'dan qayta yaratadi, javoblarni tekshiradi, ballni o'zi hisoblaydi — mijoz yuborgan `iq` ga ishonilmaydi |
| O'yin ballari | `IQ.games.replay` bilan jurnal qayta o'ynaladi |
| Liga (haftalik, faollik ballari) | faqat tekshirilgan ballardan |
| Reyting | eng yaxshi tekshirilgan IQuest balli va umumiy ball |
| Sertifikat | IQuest.uz tomonidan, faqat `mode: 'test'`, `reliable: true`, server tasdiqlagan natija uchun; noyob kod + tekshirish havolasi |

Bular ishga tushmaguncha do'kon matnida, skrinshotlarda va reklamada
**ko'rsatilmaydi** (PLAY.md). Server qo'shilganda maxfiylik siyosati
va Data safety **avval** yangilanadi.
