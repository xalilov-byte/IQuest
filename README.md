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
Qisqasi: natija — katta IQ raqami va bitta "Oraliq a–b" qatori; ilova
ICHIDA "taxminiy" / "klinik emas" kabi rad qilish matni yo'q — u
Foydalanish shartlarida (`/shartlar/`, egasi qarori №2). "IQ oshiradi",
"rasmiy", "sertifikatlangan", "Mensa", "klinik", persentil — hech
qayerda yo'q; test va natija har doim bepul.

**v1.1 arxitekturasi — `ARXITEKTURA.md`** (navigatsiya, profil, tanga
va nishonlar, sozlamalar, brend). Ziddiyat bo'lsa CONTRACT ustun.

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
│  ├─ settings.js, profile.js, avatars.js   ← sozlamalar, profil (v1.1)
│  ├─ wallet.js, badges.js, league.js, catalog.js ← tanga, nishonlar, liga, Do'kon (v1.1)
│  ├─ icons.js, art.js  ← glif reyestri, qalqon/medalyon rasmlari (v1.1)
│  ├─ notify.js, feedback.js ← eslatmalar, ovoz va tebranish
│  ├─ runtime.js        ← kichik render (sc-if / sc-for / {{ }}), morph
│  ├─ i18n.js, i18n-ru.js, i18n-en.js ← o'zbek (lotin/kirill), rus, ingliz (v1.2)
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
├─ resources/           ← ikonka, splash, OG rasm manbalari
│  └─ brand/            ← logo, bannerlar, Play grafikasi (MANIFEST.json, PREVIEW.jpg)
├─ tools/               ← sayt yig'uvchi; brand.html + mkbrand / mkicons / mkplay / mkog
├─ supabase/            ← server qismi (hozir ATAYLAB ulanmagan, §9)
├─ PLAY.md              ← Play Console paketi (matnlar, Data safety)
└─ .github/workflows/   ← GitHub'da avtomatik APK/AAB yig'ish va testlar
```

### «X qayerda?» — ekran → modul → mantiq → kalit (ARXITEKTURA §10.7)

| Foydalanuvchi joyi | Main'dagi modul | Mantiq fayli | `localStorage` kaliti |
|---|---|---|---|
| Bosh | `valsHome` | `wallet.js` (vazifalar), `progress.js` | `nz-wallet`, `nz-iq-ui` |
| Mashq | `valsPractice` | `iq/*`, `games/*` | `nz-iq-ui` |
| Reyting | `valsLeague` | `league.js`, Main `LEAGUES` | `nz-iq-ui`, `nz-league` |
| Profil | `valsProfile` | `profile.js`, `badges.js` | `nz-profile` |
| Profilni tahrirlash | `valsProfileEdit` | `profile.js`, `avatars.js`, `catalog.js` | `nz-profile`, `nz-avatar-img` |
| Nishonlar | `valsBadges` | `badges.js`, `catalog.js` | `nz-badges`, `nz-wallet` |
| Do'kon | `valsShop` | `wallet.js`, `catalog.js` | `nz-wallet` |
| Sozlamalar | `valsSettings` | `settings.js`, `notify.js`, `feedback.js` | `nz-settings` |
| Birinchi kirish | `valsOnboard` | `settings.js`, `profile.js` | `nz-settings` |
| Bayram, toast, varaqlar | `valsCelebrate`, `valsSheet` | — (faqat state) | — |
| Savol, natija, o'yin | `valsRun`, `valsResult`, `valsGame` | `iq/session.js`, `iq/score.js` | `nz-iq-run`, `nz-iq-tests` |
| Ilova qobig'i | — | `bootstrap.js` (tema, "orqaga", bildirishnoma bosilishi) | `nz-lang`, `nz-theme` |
| Brend va ikonkalar | — | `tools/brand.html` | — (fayllar `resources/brand/`) |

"Ma'lumotlarni o'chirish" `nz-progress`, `nz-attempts`, `nz-iq-tests`,
`nz-iq-ui`, `nz-iq-run`, `nz-profile`, `nz-avatar-img`, `nz-wallet`,
`nz-badges`, `nz-league` ni o'chiradi; `nz-lang`, `nz-theme`,
`nz-settings` qoladi (ARXITEKTURA §10.6).

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
uchun IQ raqami **har doim oraliq bilan** ko'rsatiladi ("Oraliq 97–119");
bu cheklov va rad qilish matni to'liq Foydalanish shartlarida yozilgan
(CONTRACT §6.1–6.2). Savol kam bo'lsa (`reliable: false`) IQ raqami
umuman ko'rsatilmaydi — faqat to'g'ri javoblar soni.

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
yasaydi (brend manbasidan, pastdagi "Brend" bo'limi). Rastr fayllar
(`og.jpg`, ikonkalar, bannerlar) bir marta yasalib repoda saqlanadi:
yasash uchun brauzer kerak, CI esa brauzersiz ishlaydi.

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
{ "versionCode": 3, "versionName": "1.1.1" }
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
Bu yerda `src/bootstrap.js` faqat `app.onBack()` ni chaqiradi, holat
nomlarini esa faqat Main biladi. Tartib qat'iy (ARXITEKTURA §2.3):

```
 1. dialog                         → yopiladi
 2. varaq (sheet)                  → yopiladi
 3. bayram kartasi                 → "Davom etish" bilan bir xil
 4. birinchi kirish                → oldingi qadam (0-qadamda: "yana bosing";
                                     qayta ko'rishda 1-qadamdan → Sozlamalar)
 5. savoldagi "Izoh" varag'i       → yopiladi
 6. o'yin                          → chiqadi
 7. test yoki mashq                → chiqish tasdig'i
 8. natija                         → yopiladi
 9. push-stek (Sozlamalar, Profilni tahrirlash, Nishonlar, Do'kon)
                                   → bitta ekran orqaga; saqlanmagan profil
                                     o'zgarishi bo'lsa "unsavedProfile" dialogi
10. tab ≠ Bosh                     → Bosh
11. Bosh                           → false → "Chiqish uchun yana bosing"
```

Yangi ekran qo'shilganda uning qadami ham shu zanjirga (Main'dagi
`onBack`) qo'shiladi — aks holda "orqaga" ilovani yopib yuboradi.
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

**Ikonka** — manba `tools/brand.html`, keyin `npm run icons`
(= `node tools/mkicons.mjs`; Playwright + Chromium kerak). Natija:
`resources/icon-*.png` va `android/app/src/main/res/` — adaptiv ikonka
(to'liq 108dp qatlamlar), Android 13 **mavzuli ikonka** (`<monochrome>`),
bildirishnoma kichik ikonkasi `drawable-*/ic_stat_iquest.png`
(`capacitor.config.json` → `LocalNotifications.smallIcon`).
`npx capacitor-assets generate` ni **ishlatmang**: u `<monochrome>` ni
o'chiradi (CI buni ushlaydi). Batafsil — pastdagi "Brend" bo'limi.

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

**Ikonkalar litsenziyasi.** `src/icons.js` va `tools/brand.html` dagi
ba'zi gliflar [Lucide](https://lucide.dev) yo'llaridan moslashtirilgan
(ISC litsenziyasi — bepul, atribusiya bilan).

**Nazariy merosi: `QUESTIONS` va `src/data.js`.** Main'dagi `QUESTIONS`
massivi va `src/data.js` (bazadan savol olish, `nz-questions` keshi,
`sign`/`image` maydonlari) Nazariy'dan qolgan qatlam. IQuest savollari
**generatorlardan** keladi (`src/iq/gen/`, `content/verbal.json`), yo'l
belgisi rasmlari (.jpg) va savollar banki ilovada yo'q; `supabase/config.json`
bo'sh bo'lgani uchun `data.js` tarmoqqa chiqmaydi.

---

## 8. Brend (ARXITEKTURA §12)

Yagona manba — **`tools/brand.html`**: belgi, so'z belgisi (harflar
shriftdan konturga aylantiriladi), naqsh, qoliplar, matnlar (uz/ru/en)
va aktivlar reyestri. Ko'rish: `node tools/mkbrand.mjs --serve`.

| Buyruq | Nima qiladi |
|---|---|
| `npm run brand` (`node tools/mkbrand.mjs`) | `resources/brand/**`: logo (SVG + PDF + PNG), Instagram, Telegram, Facebook, YouTube, X, Play sarlavha rasmi, OG — `_uz`, `_ru`; `--lang=uz,ru,en` bilan `_en` ham. `MANIFEST.json` (fayl, o'lcham, til, sha256), `PREVIEW.jpg` (hammasi bitta varaqda). Har matn halollik lintidan o'tadi |
| `npm run brand:daily` (`--daily --date=YYYY-MM-DD --lang=uz`) | «Kun savoli» posti: sanadan urug' → haqiqiy generator savoli, javob ikkinchi slaydda (`resources/brand/daily/<sana>/`) |
| `npm run icons` (`node tools/mkicons.mjs`) | Launcher, mavzuli va bildirishnoma ikonkalari, splash manbalari |
| `npm run play:assets` (`node tools/mkplay.mjs`) | Play ekran suratlari 1080×1920, har til 6 ta — **haqiqiy** ilovadan |
| `npm run og` | faqat OG rasm |

**Palitra:** Tun `#14121F` · Indigo `#2B2270` · Oltin `#FFA726` (yorug'
fonda so'z belgisidagi «IQ» `#E8890C`) · Ko'k `#3D5EFF` · Binafsha
`#8552F0` · Qog'oz `#F5F3FF`. Naqsh — 12 px nuqtali setka, oq 15%.
Shior: «Mantiqni mashq qiling» / «Тренируйте логику» / «Train your logic».

**Belgi:** oltin geometrik «IQ» monogrammasi indigo plitkada; Q dumi —
«quest», oldinga yo'l. Bo'sh joy har tomondan 8 birlik (100 birlikli
setkada; SVG fayllarda shu zaxira bor). Eng kichik: belgi 20 px,
gorizontal lokap 96 px eni; ≤32 px da kichik variant (halqa 18, dum 13).
Lokaplar: gorizontal, vertikal, faqat belgi — qorong'i, yorug', oq, qora.

**Taqiqlar** (CONTRACT §6, ARXITEKTURA §12.4, §16-2): miya, stetoskop,
xoch, dafna, «rasmiy» muhr, «IQ 150» kabi raqam; liga, reyting,
sertifikat (server bo'lmaguncha); «rasmiy/official», Mensa, «IQ
oshiradi», raqamli va'da; soxta foydalanuvchi soni yoki sharh; chat
skrinshotlari. Banner kartalari faqat haqiqiy narsadan: qat'iy urug'li
generator matritsasi, tanga va nishon medalyoni, `www/` dan olingan
ilova surati (bo'lmasa telefon kartasi chizilmaydi). Domen
`site.config.json` da tasdiqlanmaguncha bannerlarda yozilmaydi.

Aktivlar repoga commit qilinadi; CI ularni yasamaydi. UI o'zgarsa:
`npm run build && npm run brand && npm run play:assets`.

---

## 9. Keyingi versiya: server (hozir YO'Q)

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
