# Google Play — chiqarish paketi (IQuest)

Bu hujjat Play Console'ga kiritiladigan **hamma narsani** bir joyda
saqlaydi: do'kon sahifasi matnlari, "Data safety" anketasi javoblari,
kontent reytingi, imzo kaliti tartibi va chiqarishdan oldingi ro'yxat.

Nima uchun bitta faylda: Play Console'da o'nlab maydon bor va ularning
ko'pi keyin o'zgartirilganda **qayta ko'rikdan** o'tadi. Javoblarni
oldindan yozib qo'yish har safar "biz nima deb aytgan edik?" degan
savolni yo'q qiladi. Ayniqsa Data safety: u maxfiylik siyosati bilan
**bir xil** bo'lishi shart, aks holda ilova olib tashlanadi.

> **Matn yozishdan oldin — `src/iq/CONTRACT.md` §6 (halollik qoidalari).**
> IQ-test janri Play'ning *Deceptive Behavior* va *Health claims*
> qoidalariga eng ko'p tushadigan joy. Bu hujjatdagi har bir jumla shu
> qoidalar bilan tekshirilgan. Qisqasi:
>
> | Mumkin | Mumkin EMAS |
> |---|---|
> | "taxminiy IQ", har doim **oraliq** bilan | oraliqsiz yolg'iz raqam |
> | "mantiqiy fikrlashni mashq qiling", "natijangiz o'sishini kuzating" | "IQ'ingizni X ballga oshiring", "aqlliroq bo'ling" |
> | "IQuest.uz tomonidan berilgan sertifikat" (keyingi versiya) | "rasmiy", "sertifikatlangan/akkreditatsiyalangan test", "Mensa", "klinik" |
> | "akademik litsey va boshqa qabul testlaridagi mantiqiy topshiriqlar turini mashq qilish" | "DTM'ga tayyorlaydi" (DTM'da mantiq bo'limi **yo'q**) |
> | — | persentil, "aholining X% idan aqlliroq" (norm yo'q) |
> | — | sog'liq da'volari: diqqat buzilishi, demensiya, xotira kasalligi |
> | test va natija **bepul** | natijani pul/obuna ortiga yashirish |
>
> Yana bir qoida: do'kon matni va skrinshotlarda faqat **shu versiyada
> haqiqatan ishlaydigan** narsa. Liga, reyting va sertifikat server
> tekshiruvini talab qiladi (CONTRACT §10) va v1 da **yo'q** — ular
> uchun matn §2.4 da tayyor turadi, lekin ishga tushmaguncha
> ishlatilmaydi.

---

## 1. Holat: nima tayyor, nima yo'q

| Talab | Holati |
|---|---|
| AAB yig'iladi | ✅ `npm run aab` / CI (`IQuest-release.aab`) |
| Paket nomi `uz.iquest.app` | ✅ birinchi yuklashdan keyin o'zgarmaydi |
| `targetSdk` 36, `minSdk` 24 | ✅ |
| Ortiqcha ruxsat yo'q | ✅ faqat `INTERNET` (+ bildirishnoma) |
| `SCHEDULE_EXACT_ALARM` olib tashlangan | ✅ manifestda `tools:node="remove"` |
| Ikonka (IQ monogramma) | ✅ `tools/icon.html` → `resources/` → `android/.../res` |
| Maxfiylik siyosati (ochiq URL) | ❌ sahifa matni hali **Nazariy** uchun (`src/site/pages.mjs`) — IQuest'ga qayta yozilishi va hosting kerak |
| Ma'lumotni o'chirish sahifasi | ⚠️ sahifa bor, matni tekshirilishi va **hosting** kerak |
| Aloqa manzili | ❌ `site.config.json` → `contactEmail` (hozir PLACEHOLDER) |
| Domen `iquest.uz` | ❌ `domainConfirmed: false` |
| Do'kon matnlari | ✅ pastda (uz + ru) |
| Grafik materiallar | ⚠️ `npm run play:assets` — ikonka va sarlavha rasmi tayyor; ekran suratlari UI tugagach olinadi |
| Imzo kaliti | ❌ **siz yaratasiz** (§6) |
| Ishlamaydigan to'lov oqimi | ✅ mobil build'dan **kesilgan** |
| Savollar | ✅ generatorlar (matritsa, son qatori, fazoviy) — tugamaydi; ⚠️ og'zaki savollar `reviewed: false` |
| Natija ekranida rad qilish matni | ⚠️ UI'da borligini tekshiring (CONTRACT §6.2) |
| Liga, reyting, sertifikat | ⏳ **keyingi versiya** (server kerak) |

---

## 2. Do'kon sahifasi — o'zbekcha (asosiy til: `uz`)

### Ilova nomi (30 belgigacha)

```
IQuest — IQ test va mantiq
```

### Qisqa tavsif (80 belgigacha)

```
Mantiqiy fikrlashni sinang: IQ test va aql o'yinlari. Internetsiz, bepul.
```

> ⚠ **Chiqarishdan oldin tavsifni build bilan solishtiring.** Quyida
> sanalgan har bir funksiya (ayniqsa o'yinlar ro'yxati va kirill yozuvi)
> yuklanayotgan AAB'da **haqiqatan bo'lishi** kerak. Yo'g'ini olib
> tashlang — bermaydigan narsani va'da qilish Play qoidalarini buzadi.
> Savollar soni va vaqt kabi raqamlar ataylab yozilmagan: ular ilova
> bilan birga o'zgaradi va do'kon matni eskirib qoladi.

### To'liq tavsif (4000 belgigacha)

```
IQuest — mantiqiy fikrlash topshiriqlari va aql o'yinlari ilovasi.
Qisqa IQ test yeching, natijangizni taxminiy ball va oraliq ko'rinishida
oling, keyin kuchsiz tomoningizni mashq qiling.

IQ TEST
Savollar javoblaringizga qarab moslashadi: to'g'ri javobdan keyin
qiyinroq, xatodan keyin osonroq savol keladi. Shuning uchun har kimga
o'z darajasiga yaqin savollar tushadi.

TO'RT XIL TOPSHIRIQ
• Matritsalar — 3×3 jadvaldagi qonuniyatni topib, bo'sh katakni to'ldiring.
• Son qatorlari — keyingi sonni toping.
• Fazoviy tafakkur — shaklni aqlda aylantiring, yetishmagan bo'lakni toping.
• Og'zaki mantiq — analogiya, ortiqchasini topish, tushunchalar.

NATIJA — HALOL
Natija "taxminiy IQ" va oraliq bilan ko'rsatiladi, masalan: 108 (100–116).
Qaysi turdagi topshiriqlar yaxshi, qaysilari qiyinroq bo'lgani ham
ko'rinadi. Savol kam bo'lsa, ilova raqam o'ylab topmaydi — faqat
to'g'ri javoblar sonini ko'rsatadi.

MASHQ VA IZOHLAR
Har bir tur bo'yicha alohida mashq. Daraja sizga moslashadi. Har
javobdan keyin qoida tushuntiriladi — nima uchun aynan shu javob.

AQL O'YINLARI
Xotira, diqqat va tezlik uchun qisqa o'yinlar: har biri 1–2 daqiqa.
Natijangiz o'sishini kuzatib borasiz.

SAVOLLAR TUGAMAYDI
Matritsa, son qatori va fazoviy topshiriqlar telefoningizning o'zida
yaratiladi, shuning uchun har safar yangi savol chiqadi — javoblarni
yodlab olib bo'lmaydi.

INTERNETSIZ ISHLAYDI
Hammasi ilovaning ichida. Metroda, yo'lda, internet yo'q joyda ham
ishlaydi.

REKLAMA VA HISOB YO'Q
Reklama yo'q. Ro'yxatdan o'tish shart emas — ochasiz va boshlaysiz.
Ilova sizdan ism, telefon raqami yoki boshqa shaxsiy ma'lumot
so'ramaydi, analitika tizimi ham yo'q. Natijalaringiz faqat
telefoningizda saqlanadi.

QABUL TESTLARIGA MASHQ
Akademik litsey, ijod maktablari kabi ba'zi qabul testlarida mantiqiy
topshiriqlar bo'limi bor. IQuest'da shu turdagi topshiriqlarni mashq
qilishingiz mumkin. IQuest bu imtihonlar yoki ularni o'tkazuvchi
tashkilotlar bilan bog'liq emas.

TILLAR
O'zbekcha (lotin va kirill) va ruscha.

TUNGI REJIM
Telefon sozlamasiga ergashadi.

MUHIM
IQuest — klinik yoki rasmiy IQ testi emas va hech qanday tashkilot
tomonidan tasdiqlanmagan. Savollar hali katta guruhda me'yorlanmagan,
shuning uchun natija taxminiy va faqat o'zingizni kuzatish uchun.
Mashq qilgan topshiriq turlaringizda natija oshishi tabiiy — bu umumiy
aqliy qobiliyat oshdi degani emas.

Savol yoki izohda xato topsangiz yozing — bunday xabarlar navbatdan
tashqari ko'riladi.
```

### 2.4. Keyingi versiya uchun tayyor matn — HOZIR ISHLATILMAYDI

Faqat server tekshiruvi (CONTRACT §10) ishga tushgandan va funksiya
build'da haqiqatan ishlagandan keyin to'liq tavsifga qo'shiladi.
Bir vaqtda Data safety (§4.2) va maxfiylik siyosati ham yangilanadi.

```
LIGA VA REYTING
Haftalik liga — faollik ballari bo'yicha. Reyting — tekshirilgan eng
yaxshi natijalar bo'yicha. Ballar serverda qayta hisoblanadi, shuning
uchun ro'yxatda soxta natija bo'lmaydi.

IQUEST SERTIFIKATI
To'liq testdan keyin IQuest.uz tomonidan beriladigan sertifikat:
taxminiy ball, oraliq, sana, ismingiz va noyob tekshirish kodi.
Bu IQuest testi natijasi — rasmiy yoki klinik IQ hujjati emas.
```

---

## 3. Do'kon sahifasi — ruscha (`ru-RU`)

### Ilova nomi

```
IQuest — IQ тест и логика
```

### Qisqa tavsif

```
Логическое мышление: IQ-тест и игры для ума. Без интернета, бесплатно.
```

### To'liq tavsif

```
IQuest — приложение с задачами на логическое мышление и играми для ума.
Пройдите короткий IQ-тест, получите результат в виде ориентировочного
балла с интервалом и тренируйте то, что даётся труднее.

IQ-ТЕСТ
Вопросы подстраиваются под ваши ответы: после верного — сложнее, после
ошибки — проще. Поэтому каждому достаются вопросы, близкие к его уровню.

ЧЕТЫРЕ ВИДА ЗАДАНИЙ
• Матрицы — найдите закономерность в таблице 3×3 и заполните пустую клетку.
• Числовые ряды — найдите следующее число.
• Пространственное мышление — поверните фигуру в уме, найдите недостающую часть.
• Вербальная логика — аналогии, лишнее слово, понятия.

ЧЕСТНЫЙ РЕЗУЛЬТАТ
Результат показывается как «ориентировочный IQ» с интервалом, например:
108 (100–116). Видно, какие типы заданий получаются лучше, а какие
сложнее. Если вопросов мало, приложение не придумывает число — только
показывает количество верных ответов.

ТРЕНИРОВКА И ПОЯСНЕНИЯ
Отдельная тренировка по каждому типу. Уровень подстраивается под вас.
После каждого ответа — пояснение правила: почему верен именно этот ответ.

ИГРЫ ДЛЯ УМА
Короткие игры на память, внимание и скорость — по 1–2 минуты.
Следите за тем, как растут ваши результаты.

ВОПРОСЫ НЕ ЗАКАНЧИВАЮТСЯ
Матрицы, числовые ряды и пространственные задания создаются прямо на
телефоне, поэтому каждый раз вопрос новый — ответы невозможно заучить.

РАБОТАЕТ БЕЗ ИНТЕРНЕТА
Всё внутри приложения. В метро, в дороге, там где нет сети — всё работает.

БЕЗ РЕКЛАМЫ И БЕЗ РЕГИСТРАЦИИ
Рекламы нет. Регистрация не нужна — открыли и начали. Приложение не
спрашивает имя, телефон или другие личные данные, аналитики тоже нет.
Результаты хранятся только на вашем телефоне.

ПОДГОТОВКА К ВСТУПИТЕЛЬНЫМ ТЕСТАМ
В некоторых вступительных тестах (например, в академические лицеи и
творческие школы) есть раздел логических заданий. В IQuest можно
тренировать задания такого типа. IQuest не связан с этими экзаменами и
организациями, которые их проводят.

ЯЗЫКИ
Узбекский (латиница и кириллица) и русский.

ТЁМНАЯ ТЕМА
Следует настройке телефона.

ВАЖНО
IQuest — не клинический и не официальный IQ-тест, он не одобрен
никакой организацией. Вопросы ещё не нормированы на большой выборке,
поэтому результат ориентировочный и предназначен только для
самонаблюдения. Рост результата в тех типах заданий, которые вы
тренируете, естественен — это не означает, что выросли общие
умственные способности.

Если вы нашли ошибку в вопросе или пояснении — напишите нам, такие
сообщения рассматриваются в первую очередь.
```

### 3.4. Следующая версия — СЕЙЧАС НЕ ИСПОЛЬЗУЕТСЯ

(§2.4 bilan bir xil shart.)

```
ЛИГА И РЕЙТИНГ
Еженедельная лига — по очкам активности. Рейтинг — по лучшим
проверенным результатам. Очки пересчитываются на сервере, поэтому
поддельных результатов в списке нет.

СЕРТИФИКАТ IQUEST
После полного теста — сертификат от IQuest.uz: ориентировочный балл,
интервал, дата, ваше имя и уникальный код проверки. Это результат
теста IQuest, а не официальный или клинический документ об IQ.
```

---

## 4. Data safety anketasi

⚠️ **Bu javoblar `dist/site/maxfiylik/` sahifasi bilan bir xil bo'lishi
SHART.** Ular kod tekshirilib yozilgan (`localStorage` kalitlari,
`fetch` chaqiruvlari, uchinchi tomon kutubxonalari). Ilovaga analitika,
reklama, hisob yoki server qo'shilsa — **avval** ikkalasi yangilanadi.

### 4.1. v1 (hozirgi holat — hammasi qurilmada)

| Savol | Javob |
|---|---|
| Ma'lumot yig'iladimi yoki ulashiladimi? | **Yo'q** |
| Ma'lumot shifrlanib uzatiladimi? | Savol berilmaydi (hech narsa uzatilmaydi) |
| O'chirish so'rovi yo'li bormi? | Ha — `/malumot-ochirish/` (ilova ma'lumotini tozalash yoki o'chirish) |
| Bu ilova bolalar uchunmi? | Yo'q (§5) |

**Nima uchun "yig'ilmaydi":** v1 hech qanday so'rov yubormaydi.
Savollar qurilmada generatorlardan yaratiladi (`src/iq/gen/`), og'zaki
savollar APK ichida (`content/verbal.json`). Server sozlamasi
(`supabase/config.json`) **ataylab bo'sh** — `src/data.js` bo'sh
sozlama bilan tarmoqqa chiqmaydi. Ball, streak, test tarixi va
javoblar **faqat qurilmada** (`localStorage`, `nz-progress`).
`INTERNET` ruxsati Capacitor WebView uchun standart; bildirishnoma —
qurilmaning o'zida rejalashtiriladigan kunlik eslatma, u ham hech
narsa yubormaydi.

**Android zaxira nusxasi.** Manifestda `allowBackup="true"`, ya'ni
Android o'zining zaxira tizimi bilan ilova ma'lumotini foydalanuvchining
**o'z** Google hisobiga ko'chirishi mumkin (yangi telefonga o'tganda
progress qaytadi). Bu Android platformasining funksiyasi, biz bu
ma'lumotni ko'rmaymiz. Play uni "developer tomonidan yig'ish" deb
hisoblamaydi, lekin maxfiylik siyosatida u aytiladi.

### 4.2. Keyingi versiya (server bilan) — HOZIR BELGILANMAYDI

Liga, reyting va sertifikat qo'shilganda javob **"Ha, yig'iladi"** ga
o'zgaradi. Taxminiy ro'yxat (aniq ro'yxat server kodi yozilgach,
kodni tekshirib to'ldiriladi):

| Ma'lumot turi (Play) | Nima | Nima uchun | Majburiymi |
|---|---|---|---|
| Personal info → Name | sertifikatdagi va reytingdagi ism | sertifikat, reyting | ixtiyoriy (faqat shu funksiyalar uchun) |
| App activity → Other actions | test javoblari jurnali, o'yin jurnali | natijani serverda qayta hisoblash (CONTRACT §10) | shu funksiyalar uchun |
| App activity → Other user-generated content | — (agar ism ochiq ko'rinsa, IARC §5 ga qarang) | reyting | — |
| Device or other IDs / User IDs | anonim foydalanuvchi ID | natijani egasiga bog'lash | shu funksiyalar uchun |

Shifrlash: Ha (HTTPS). O'chirish: `/malumot-ochirish/` + ilova ichida
tugma. Ma'lumot uchinchi tomonga **sotilmaydi va ulashilmaydi**
(Supabase — ishlov beruvchi, "sharing" hisoblanmaydi).

---

## 5. Kontent reytingi (IARC) va auditoriya

| Savol | Javob (v1) |
|---|---|
| Zo'ravonlik, qon, qo'rqinchli sahnalar | Yo'q |
| Jinsiy mazmun | Yo'q |
| Haqoratli til | Yo'q |
| Giyohvandlik, alkogol, tamaki | Yo'q |
| Qimor yoki qimorga o'xshash mexanika | Yo'q (ball va o'yinlar pulsiz, tasodifiy mukofot yo'q) |
| Reklama | Yo'q |
| Foydalanuvchi yaratadigan kontent | Yo'q |
| Foydalanuvchilar o'rtasida muloqot | Yo'q |
| Joylashuv ulashiladimi | Yo'q |
| Ilova ichida xarid | **Yo'q** (to'lov qatlami kesilgan; test va natija doim bepul) |

Kutilayotgan reyting: **3+ / Everyone** (PEGI 3).

**Keyingi versiyada** reytingda boshqa foydalanuvchilarning ismlari
ko'rinsa, "users can interact / share content" savoliga qayta javob
beriladi va reyting anketasi yangilanadi.

**Maqsadli auditoriya:** 13+ (13–15, 16–17, 18+). 13 yoshdan kichiklar
tanlanmaydi — aks holda Families siyosati (qo'shimcha talablar) amal
qiladi. Ilova bolalarga mo'ljallanmagan, lekin reklama va ma'lumot
yig'ish yo'qligi uchun bu yerda xavf past.

**Kategoriya:** Education. (Health & Fitness **emas** — sog'liq
da'vosi yo'q. Games → Puzzle ham mumkin, lekin unda IARC anketasi
o'yin sifatida to'ldiriladi.)

**Teglar:** IQ test, mantiq, logika, aql o'yinlari, boshqotirma, тест IQ.

---

## 6. Imzo kaliti — bu qadamni faqat siz qila olasiz

Play'ga yuklanadigan AAB imzolanishi shart. Kalit **bir marta**
yaratiladi va **yo'qotilmasligi kerak**: yo'qolsa, o'sha ilovaga
yangilanish chiqarib bo'lmaydi (Play App Signing yoqilgan bo'lsa
yuklash kalitini tiklash mumkin, lekin bu alohida jarayon).

```bash
keytool -genkey -v -keystore iquest.keystore \
  -alias iquest -keyalg RSA -keysize 2048 -validity 10000
```

Keyin CI imzolashi uchun GitHub → Settings → Secrets and variables →
Actions → New repository secret:

| Secret | Qiymat |
|---|---|
| `KEYSTORE_BASE64` | `base64 -w0 iquest.keystore` natijasi |
| `KEYSTORE_PASSWORD` | kalit ombori paroli |
| `KEY_ALIAS` | `iquest` |
| `KEY_PASSWORD` | kalit paroli |

**Kalit fayli va parollar repoga tushmaydi** (`.gitignore` da
`*.keystore`, `*.jks`, `android/keystore.properties`). Parolni chatga
ham yozish kerak emas — faqat GitHub Secrets'ga.

Secrets qo'yilmasa CI baribir ishlaydi, lekin release imzosiz chiqadi
va Play uni qabul qilmaydi.

---

## 7. Versiya

`version.json` — yagona manba. Har yuklashda `versionCode` **oshishi
shart** (Play bir xil yoki kichik raqamni rad etadi).

```json
{ "versionCode": 1, "versionName": "1.0.0" }
```

`android/app/build.gradle` shu fayldan o'qiydi, ya'ni ikki joyda
tahrirlash kerak emas.

---

## 8. Chiqarishdan oldin — ro'yxat

**Sizdan:**

- [ ] `site.config.json` → `contactEmail` (haqiqiy manzil)
- [ ] `site.config.json` → `domain` (`iquest.uz`) + `domainConfirmed: true`
- [ ] Saytni hostingga qo'yish (`dist/site/`) — maxfiylik siyosati va
      ma'lumotni o'chirish sahifalari **ochiq URL** bo'lishi shart
- [ ] Imzo kalitini yaratish va GitHub Secrets'ga qo'yish (§6)
- [ ] Play Console'da dasturchi hisobi (bir martalik $25)
- [ ] **Og'zaki savollarni ko'rib chiqish** — `content/verbal.json` da
      hammasi `reviewed: false`. Bitta noto'g'ri savol (ikki to'g'ri
      javob, xato izoh) IQ natijasini jimgina buzadi.
- [ ] Do'kon matnidagi har bir funksiyani yuklanadigan AAB'da ochib
      ko'rish (o'yinlar ro'yxati, kirill yozuvi)

**Kod tomonidan:**

- [x] AAB imzolanadigan holda yig'iladi (`IQuest-release.aab`)
- [x] Paket nomi `uz.iquest.app`, ilova nomi "IQuest"
- [x] Ortiqcha ruxsat yo'q
- [x] Ishlamaydigan to'lov oqimi mobil build'dan kesilgan
- [x] Ikonka (IQ monogramma), splash, OG rasm
- [x] Do'kon matnlari (uz + ru), §6 qoidalari bilan tekshirilgan
- [ ] Maxfiylik siyosati, shartlar, aloqa, ma'lumotni o'chirish
      sahifalari **IQuest uchun** qayta yozilgan (`src/site/pages.mjs`,
      `tools/mksite.mjs` — hozir Nazariy matni)
- [ ] Natija ekranida: "Taxminiy IQ", oraliq va rad qilish matni
      (CONTRACT §6.1–6.2); `reliable: false` da raqam yo'q
- [ ] `npm test` yashil (generatorlar, baholash, o'yinlar)
- [ ] Ekran suratlari yangi UI'dan (`npm run play:assets`), ko'z bilan
      tekshirilgan: liga, reyting, sertifikat va oraliqsiz IQ raqami
      suratga tushmagan

---

## 9. Birinchi chiqarish — qanday

1. **Internal testing** dan boshlang, Production'dan emas. O'zingiz va
   2–3 odam o'rnatib ko'radi. Play bu yo'lni tez o'tkazadi.
2. Xato topilmasa **Closed testing** — yangi shaxsiy dasturchi hisoblari
   uchun Play buni **talab qiladi**: Production'ga chiqishdan oldin
   kamida **12 ta tester 14 kun** davomida closed testing'da bo'lishi
   kerak.
3. Keyin Production.

Test davri og'zaki savollarni ko'rib chiqish va natija matnlarini
sinovchilarda tekshirish uchun eng qulay vaqt: "taxminiy" va oraliq
odamlarga tushunarlimi, rad qilish matni ko'rinadimi.

---

## 10. Materiallar qayerda

| Nima | Yo'l |
|---|---|
| AAB (Play'ga yuklanadi) | CI → `iquest-android` → `IQuest-release.aab` |
| APK (qo'lda sinash) | CI → `iquest-android` → `IQuest-debug.apk` (yoki Release `sinov-…`) |
| Sayt | CI → `iquest-sayt` → `dist/site/` |
| Ikonka, sarlavha rasmi, suratlar | `resources/play/` (`npm run play:assets`) |
| Ikonka manbasi | `tools/icon.html` (`npm run icons`) |
| Havola ko'rinishi rasmi | `resources/og.jpg` (`npm run og`) |
