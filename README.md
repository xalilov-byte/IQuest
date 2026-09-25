# Nazariy — Android ilova

YHQ (avtotest) nazariy imtihoniga tayyorgarlik ilovasi. **To'liq offline
ishlaydi**: bir marta o'rnatilgandan keyin internet umuman kerak emas —
savollar, suratlar, shriftlar, hammasi APK ichida. Yangilanishlar
(savollar, dizayn, tuzatishlar) **Play Market orqali** keladi: telefonda
internet yoqilganda Play Market ilovani o'zi yangilaydi.

Dizayn manbasi — `src/Main.dc.html`. Ilovadagi birorta ham ekranning
uslubi o'zgartirilmagan.

---

## 1. Nima qayerda

```
nazariy-app/
├─ src/
│  ├─ Main.dc.html      ← DIZAYN MANBASI. Uchala ilova shu faylda.
│  ├─ reyting-bg.jpg    ← "Reyting" plitkasi fon surati
│  ├─ hafta-bg.jpg      ← "Bu hafta" plitkasi fon surati
│  ├─ runtime.js        ← kichik render (sc-if / sc-for / {{ }}), 140 qator
│  ├─ shell.css         ← maketni qurilma ekraniga moslash (§4)
│  ├─ shell-admin.css   ← admin paneli qobig'i (matn tanlanadi, ramka yo'q)
│  └─ bootstrap.js      ← tema, Android "orqaga" tugmasi, status bar
├─ build.mjs            ← src/ → www/ | dist/web/ | dist/admin/
├─ www/                 ← mobil build (Capacitor shuni oladi)
├─ dist/web/            ← sayt ilovasi (landing + ilova)
├─ dist/admin/          ← admin panel build'i
├─ dist/site/           ← TAYYOR SAYT (hostingga shuni qo'yiladi)
├─ site.config.json     ← domen, aloqa, bot nomi — bitta joyda
├─ android/             ← Android Studio loyihasi
├─ resources/           ← ilova ikonkasi va splash manbalari
├─ tools/               ← sayt yig'uvchi, ikonka va OG rasm generatori
├─ REJA.md              ← ishlab chiqish rejasi (bosqichlar, qarorlar)
├─ SAVOLLAR.md          ← savollar bazasini to'ldirish yo'riqnomasi
├─ savollar-shablon.csv ← import uchun shablon
├─ PLAY.md              ← Play Console paketi (matnlar, Data safety)
└─ .github/workflows/   ← GitHub'da avtomatik APK/AAB yig'ish
```

Umumiy hajm: **~500 KB** (shriftlar bilan). APK taxminan 4–6 MB chiqadi.

### Uchta build maqsadi

Manba faylda uchta mustaqil ilova bir joyda yashaydi. `build.mjs` har bir
maqsad uchun **keraksiz qatlamni kesib tashlaydi**:

| Buyruq | Chiqish | Nima kiradi |
|---|---|---|
| `npm run build` | `www/` | Foydalanuvchi ilovasi. Admin va landing **kesiladi** |
| `npm run build:web` | `dist/web/` | Foydalanuvchi ilovasi + landing. Admin **kesiladi** |
| `npm run build:admin` | `dist/admin/` | Faqat admin panel |
| `npm run site` | `dist/site/` | **Tayyor sayt**: landing + huquqiy sahifalar + PWA |

**Nima uchun kesiladi, yashirilmaydi:** admin panel APK ichida qolsa,
ilovani ochgan har qanday odam admin ekranlarini ko'radi va API'ga qo'lda
so'rov yuborishga urinadi. Shuning uchun admin qatlami mobil va sayt
build'lariga **umuman kirmaydi**. Buni `build.mjs` o'zi tekshiradi —
admin nomlaridan bittasi qolsa, build yiqiladi.

Kesish foydalanuvchi ilovasining ko'rinishiga **tegmaydi**: eski va yangi
build'ning barcha ekranlari piksel darajasida bir xil (tekshirilgan).
Mobil build hajmi 254 KB dan 147 KB ga tushdi.

---

### Sayt

`npm run site` → `dist/site/`. Hostingga (Cloudflare Pages, Vercel va
h.k.) shu papkani qo'yish kifoya — build mashinasi kerak emas. CI ham
har push'da yig'ib, `nazariy-sayt` nomi bilan saqlaydi.

| Manzil | Nima | Hajm |
|---|---|---|
| `/` | Landing + brauzerdagi ilova | 259 KB |
| `/maxfiylik/` | Maxfiylik siyosati | 12 KB |
| `/shartlar/` | Foydalanish shartlari | 10 KB |
| `/aloqa/` | Aloqa | 8 KB |
| `/malumot-ochirish/` | Ma'lumotni o'chirish | 9 KB |

Matn sahifalarida **JS yo'q**: maxfiylik siyosatini o'qish uchun 259 KB
lik ilovani yuklab olish kerak emas. Uchtasi (maxfiylik, aloqa,
ma'lumotni o'chirish) — Google Play'ning majburiy talabi.

Domen, aloqa manzili va bot nomi **faqat `site.config.json` da**.
Domen tasdiqlanmaguncha (`domainConfirmed: false`) `sitemap.xml`,
`canonical` va `og:image` yozilmaydi va `robots.txt` indekslashni
taqiqlaydi — tugallanmagan sayt qidiruvga tushmasligi kerak.

`npm run og` — havola ko'rinishidagi rasmni (`resources/og.jpg`) qayta
yasaydi. U bir marta yasalib repoda saqlanadi, chunki yasash uchun
brauzer kerak va uni har build'da ishga tushirish CI'ni sekinlashtiradi.


## 2. Yig'ish

Ikki yo'l bor. Kompyuteringizda hech narsa yo'q bo'lsa — birinchisi.

### A) GitHub orqali (hech narsa o'rnatmasdan)

1. Bu papkani GitHub repozitoriyasiga yuklang
2. Imzo kaliti yarating (bir marta, quyida §3)
3. GitHub → **Settings → Secrets and variables → Actions** ga 4 ta secret qo'shing:
   `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`
4. **Actions → Android build → Run workflow**
   (har bir `main` yoki `claude/...` shoxchasiga push'da ham o'zi ishga tushadi)
5. 5–7 daqiqadan keyin `nazariy-android` arxivini yuklab oling. Ichida:

   | Fayl | Nima uchun |
   |---|---|
   | `Nazariy-debug.apk` | Telefonga **darhol o'rnatiladi**. Secrets kerak emas — sinash uchun eng qulayi. |
   | `Nazariy-release.apk` | Secrets qo'yilgan bo'lsa imzolangan; bo'lmasa imzosiz (o'rnatilmaydi). |
   | `Nazariy-release.aab` | Play Market uchun. Imzo **shart**. |

   APK'ni telefonga tashlab, "Noma'lum manbalardan o'rnatish"ga ruxsat
   berib o'rnatiladi.

### B) Kompyuterda (Android Studio)

Kerak: Android Studio (Android SDK bilan) va Node.js 20+.

```bash
npm install
npm run sync          # src/ → www/ → android/
npm run aab           # Play Market uchun .aab
npm run apk           # telefonda sinash uchun .apk

npm run build:all     # uchala maqsadni yig'ish (mobil + sayt + admin)
```

Natijalar:
`android/app/build/outputs/bundle/release/Nazariy-release.aab`
`android/app/build/outputs/apk/release/Nazariy-release.apk`

Android Studio'da ochish: `npm run open`

---

## 3. Imzo kaliti (bir marta, juda muhim)

Play Market ilovani imzo kaliti bilan taniydi. **Bu faylni yo'qotsangiz,
ilovani boshqa hech qachon yangilay olmaysiz** — yangi ilova sifatida
qaytadan chiqarishga to'g'ri keladi. Nusxasini xavfsiz joyda saqlang.

```bash
keytool -genkey -v -keystore nazariy.keystore \
  -alias nazariy -keyalg RSA -keysize 2048 -validity 10000
```

**Mahalliy yig'ish uchun** `android/keystore.properties` faylini yarating
(u `.gitignore` da — git'ga tushmaydi):

```properties
storeFile=/to/liq/yo/l/nazariy.keystore
storePassword=...
keyAlias=nazariy
keyPassword=...
```

**GitHub uchun** kalitni base64 ga o'giring va secret sifatida qo'ying:

```bash
base64 -w0 nazariy.keystore > keystore.txt
```

---

## 4. Play Market'ga joylash

1. [Play Console](https://play.google.com/console) da dasturchi akkaunti
   (bir martalik $25)
2. **Create app** → nomi "Nazariy", til o'zbek, ilova turi: bepul/pulli
3. **Production → Create new release** → `app-release.aab` ni yuklang
4. To'ldirish shart bo'lgan bo'limlar: ilova tavsifi, skrinshotlar
   (kamida 2 ta telefon skrinshoti), 512×512 ikonka, feature grafika
   1024×500, maxfiylik siyosati havolasi, **Data safety** (bu ilova
   internetga hech narsa yubormaydi — "No data collected"), reyting anketasi
5. Ko'rikdan o'tgach chiqadi (odatda 1–3 kun, birinchi marta uzunroq)

### Yangilanish chiqarish

Har bir yangi versiyada `android/app/build.gradle` da:

```gradle
versionCode 2          // HAR SAFAR +1 (Play Market shuni solishtiradi)
versionName "1.0.1"    // odamlar ko'radigan raqam
```

Keyin `npm run aab` → Play Console'ga yangi `.aab` → **Rollout**.
Foydalanuvchilar telefonida internet yoqilganda Play Market yangilanishni
o'zi yuklab oladi. Savollarni o'zgartirish ham shu yo'l bilan:
`src/Main.dc.html` ichidagi `QUESTIONS` ro'yxatini tahrirlang → qayta
yig'ing → yangi versiya.

---

## 5. Maket → ilova: nima o'zgardi

Dizayn "maket" sifatida chizilgan: brauzer sahifasi ichida markazlashgan
390px telefon ramkasi, tepasida "Mini App / Web sayt / Admin"
almashtirgichi. Ilovada esa ramka — qurilma ekranining o'zi. Faqat shu
ikki narsa moslandi (`src/shell.css`), ekranlarning uslubiga tegilmadi:

| Maketda | Ilovada |
|---|---|
| 390px ramka, chekka, radius, soya | butun ekran (`100dvh`), chekkasiz |
| tepadagi Mini App/Web sayt/Admin | yashirilgan (o'chirilmagan) |
| butun sahifa scroll qilardi | ekran maydonining o'zi scroll qiladi |
| tema tugmasi maket sarlavhasida | **qurilma sozlamasidan** (Android tungi rejimi) |

### Pastki menyu va Android navigatsiyasi

Siz aytgan muammo: ilovaning pastki tab paneli Androidning o'z
navigatsiya paneli (uch tugma yoki jest chizig'i) ortida qolib ketmasligi
kerak. Yechim `shell.css` da:

```css
.nz-nav{
  height: calc(68px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
}
```

Panelning **sirti** tizim paneli ostigacha davom etadi (rang uzilmaydi),
**bosiladigan qismi** esa uning tepasida qoladi. Tepada ham xuddi shunday:
ramka `padding-top: env(safe-area-inset-top)` oladi, shuning uchun kontent
status bar ostiga kirib ketmaydi.

### "Orqaga" tugmasi

Standart holatda WebView'da orqaga bosilsa ilova darhol yopiladi.
Bu yerda orqaga tugmasi ilovaning o'z ierarxiyasi bo'yicha yuradi
(`src/bootstrap.js`):

```
ochiq oyna (to'lov / drawer / tasdiq) → yopiladi
test ketyapti                          → testdan chiqadi
tab ≠ Bosh                             → Bosh ekranga qaytadi
Bosh ekranda                           → "Chiqish uchun yana bosing" → chiqadi
```

---

## 6. Sozlamalar

**Paket nomi** (`uz.nazariy.app`) — Play Market'da ilovaning doimiy
manzili. **Birinchi yuklashdan keyin o'zgartirib bo'lmaydi.** Boshqa nom
kerak bo'lsa, HOZIR o'zgartiring — uch joyda:

```
capacitor.config.json                        → "appId"
android/app/build.gradle                     → applicationId, namespace
android/app/src/main/res/values/strings.xml  → package_name, custom_url_scheme
```

**Ilova nomi** — `android/app/src/main/res/values/strings.xml` → `app_name`.

**Ikonka** — `tools/icon.html` ni tahrirlang, keyin `npm run icons`.

---

## 7. Texnik eslatmalar

**Nega Capacitor, TWA emas.** TWA (Trusted Web Activity) saytni ko'rsatadi
va yangilanish saytdan keladi — sizga esa aksincha kerak edi: hamma narsa
telefonda saqlansin, yangilanish Play Market'dan kelsin. Capacitor aynan
shunday ishlaydi: web fayllar APK ichiga kiradi, internet talab qilinmaydi.

**Nega o'z render'i.** Dizayn fayli Claude Design Canvas formatida
(`sc-if`, `sc-for`, `{{ }}`). Kanvas runtime'i muharrir bilan birga keladi
va ilovaga yaramaydi, shuning uchun aynan shu uch imkoniyat uchun 140
qatorlik render yozildi (`src/runtime.js`). U DOM'ni qaytadan yaratmaydi,
balki **morph** qiladi — shuning uchun holat o'zgarganda ro'yxatning
scroll joyi saqlanadi va animatsiyalar qaytadan ijro etilmaydi.

**Tuzatilgan xato.** Test ekranida savolga javob berilganda
`primary is not defined` xatosi tushib, ekran qotib qolardi:
`valsQuiz` ichida `primary` o'zgaruvchisi e'lon qilinmagan edi (u faqat
`valsMoney` da bor edi). Bu dizayn manbasidagi haqiqiy xato edi —
`src/Main.dc.html` da ham, nashr qilingan kanvasda ham tuzatildi.

**Shriftlar offline.** Manrope va Space Grotesk `www/fonts/` ichida
(12 ta woff2, 160 KB). Google Fonts havolasi olib tashlangan — internetsiz
ham shriftlar to'g'ri ko'rinadi.
