# Google Play — chiqarish paketi

Bu hujjat Play Console'ga kiritiladigan **hamma narsani** bir joyda
saqlaydi: do'kon sahifasi matnlari, "Data safety" anketasi javoblari,
kontent reytingi, imzo kaliti tartibi va chiqarishdan oldingi ro'yxat.

Nima uchun bitta faylda: Play Console'da o'nlab maydon bor va ularning
ko'pi keyin o'zgartirilganda **qayta ko'rikdan** o'tadi. Javoblarni
oldindan yozib qo'yish har safar "biz nima deb aytgan edik?" degan
savolni yo'q qiladi. Ayniqsa Data safety: u maxfiylik siyosati bilan
**bir xil** bo'lishi shart, aks holda ilova olib tashlanadi.

---

## 1. Holat: nima tayyor, nima yo'q

| Talab | Holati |
|---|---|
| AAB yig'iladi | ✅ `npm run aab` / CI |
| `targetSdk` 36, `minSdk` 24 | ✅ |
| Ortiqcha ruxsat yo'q | ✅ faqat `INTERNET` (+ bildirishnoma) |
| `SCHEDULE_EXACT_ALARM` olib tashlangan | ✅ manifestda `tools:node="remove"` |
| Maxfiylik siyosati (ochiq URL) | ⚠️ sahifa tayyor, **hosting kerak** |
| Ma'lumotni o'chirish sahifasi | ⚠️ sahifa tayyor, **hosting kerak** |
| Aloqa manzili | ❌ `site.config.json` → `contactEmail` |
| Do'kon matnlari | ✅ pastda |
| Grafik materiallar | ✅ `resources/play/` |
| Imzo kaliti | ❌ **siz yaratasiz** (§6) |
| Ishlamaydigan to'lov oqimi | ✅ mobil build'dan **kesilgan** |
| Savollar soni | ❌ 10 ta — chiqarish uchun kam (§8) |

---

## 2. Do'kon sahifasi — o'zbekcha (asosiy til: `uz`)

### Ilova nomi (30 belgigacha)

```
Nazariy — avtotest va YHQ
```

### Qisqa tavsif (80 belgigacha)

```
YHQ nazariy imtihoniga tayyorgarlik. Internetsiz ishlaydi, reklama yo'q.
```

> ⚠ **Quyidagi tavsifdagi "20 savol, 25 daqiqa" — ilovaning MAQSADLI
> formati** (`EXAM_SIZE` / `EXAM_PER_Q`, `src/Main.dc.html`). Ilova bankda
> yetarli savol bo'lgandagina shu formatni beradi; hozir bank kichik va
> imtihon qisqaroq. **Do'konga chiqarishdan oldin** `node tools/mkplay.mjs`
> ni ishga tushiring — u bank formatni ko'tara olmasa ogohlantiradi va
> grafikaga haqiqiy raqamni yozadi. Tavsifni ham o'shanda tekshiring:
> bermaydigan narsani va'da qilish Play qoidalarini buzadi.

### To'liq tavsif (4000 belgigacha)

```
Nazariy — haydovchilik guvohnomasi olish uchun nazariy imtihonga
(avtotest, YHQ) tayyorlanish ilovasi.

IMTIHON SIMULYATSIYASI
Haqiqiy format bilan mashq qilasiz: 20 savol, 25 daqiqa, 2 xato limiti.
Vaqt bosimi ham shu yerda — imtihon xonasida birinchi marta shoshilib
qolmaslik uchun.

MAVZULAR BO'YICHA MASHQ
Savollar mavzularga ajratilgan: umumiy qoidalar, yo'l belgilari, tezlik
rejimi, chorrahalar, svetofor, quvib o'tish, to'xtab turish, birinchi
yordam. Har biri alohida progress bilan.

YO'L BELGILARI
Belgilar alohida rejimda: "rasm → nom" testi bilan yodlanadi.

XATOLAR USTIDA ISHLASH
Xato qilgan savolingiz "Xatolarim" ro'yxatiga tushadi va to'g'ri javob
berganingizda undan chiqadi. Yodlab olish emas, tushunib olish uchun.
Har bir javobdan keyin izoh ko'rsatiladi — qaysi qoida va nima uchun.

SAQLANGAN SAVOLLAR
Qiyin savolni xatcho'p bilan belgilab qo'yasiz va keyin qaytib
kelasiz.

MARAFON
Ketma-ket to'g'ri javoblar rejimi: bitta xato — oxiri. Rekordingizni
yangilab borasiz.

KUNLIK VAZIFALAR VA STREAK
Har kuni kichik maqsad va ketma-ket kunlar hisobi. Kuniga 10 daqiqa
bir haftada bir kun o'tirishdan ko'ra ko'proq foyda beradi.

INTERNETSIZ ISHLAYDI
Savollar ilovaning ichida. Metroda, yo'lda, internet yo'q joyda —
hammasi ishlaydi. Internet faqat savollar yangilanishi uchun kerak.

REKLAMA VA HISOB YO'Q
Reklama yo'q. Ro'yxatdan o'tish shart emas — ochasiz va yechishni
boshlaysiz. Ilova sizdan ism, telefon raqami yoki boshqa shaxsiy
ma'lumot so'ramaydi va analitika tizimi ham yo'q. Natijalaringiz
telefoningizda saqlanadi.

UCH TIL
O'zbekcha (lotin), o'zbekcha (kirill) va ruscha.

TUNGI REJIM
Telefon sozlamasiga ergashadi.

MUHIM
Nazariy — o'quv ilovasi. U rasmiy imtihon emas va rasmiy organ bilan
bog'liq emas. Haqiqiy imtihondagi savollar, ularning soni va o'tish
shartlari boshqacha bo'lishi mumkin. Rasmiy qoidalar bo'yicha yakuniy
manba — O'zbekiston Respublikasining amaldagi yo'l harakati qoidalari.

Ilovadagi izohda xatolik topsangiz yozing — bunday xabarlar navbatdan
tashqari ko'riladi.
```

---

## 3. Do'kon sahifasi — ruscha (`ru-RU`)

### Ilova nomi

```
Nazariy — автотест и ПДД
```

### Qisqa tavsif

```
Подготовка к теоретическому экзамену ПДД. Работает без интернета.
```

### To'liq tavsif

```
Nazariy — приложение для подготовки к теоретическому экзамену на
водительское удостоверение (автотест, ПДД Узбекистана).

СИМУЛЯЦИЯ ЭКЗАМЕНА
Тренировка в реальном формате: 20 вопросов, 25 минут, лимит 2 ошибки.
Ограничение по времени тоже здесь — чтобы в экзаменационном классе это
не оказалось неожиданностью.

ПРАКТИКА ПО ТЕМАМ
Вопросы разбиты по темам: общие правила, дорожные знаки, скоростной
режим, перекрёстки, светофор, обгон, остановка и стоянка, первая
помощь. У каждой темы свой прогресс.

ДОРОЖНЫЕ ЗНАКИ
Отдельный режим: тест «картинка → название».

РАБОТА НАД ОШИБКАМИ
Вопрос, в котором вы ошиблись, попадает в список «Мои ошибки» и
уходит из него, когда вы ответите верно. После каждого ответа —
пояснение: какое правило и почему.

СОХРАНЁННЫЕ ВОПРОСЫ
Сложный вопрос можно отметить закладкой и вернуться к нему позже.

МАРАФОН
Режим серии верных ответов: одна ошибка — конец. Обновляйте свой
рекорд.

ЕЖЕДНЕВНЫЕ ЗАДАНИЯ И СЕРИЯ ДНЕЙ
Небольшая цель на каждый день и счёт серии. 10 минут в день полезнее,
чем один долгий день в неделю.

РАБОТАЕТ БЕЗ ИНТЕРНЕТА
Вопросы внутри приложения. В метро, в дороге, там где нет сети — всё
работает. Интернет нужен только для обновления вопросов.

БЕЗ РЕКЛАМЫ И БЕЗ РЕГИСТРАЦИИ
Рекламы нет. Регистрация не нужна — открыли и начали. Приложение не
спрашивает имя, телефон или другие личные данные, аналитики тоже нет.
Результаты хранятся на вашем телефоне.

ТРИ ЯЗЫКА
Узбекский (латиница), узбекский (кириллица) и русский.

ТЁМНАЯ ТЕМА
Следует настройке телефона.

ВАЖНО
Nazariy — учебное приложение. Это не официальный экзамен, и оно не
связано с государственными органами. Вопросы реального экзамена, их
количество и условия сдачи могут отличаться. Окончательный источник —
действующие Правила дорожного движения Республики Узбекистан.

Если вы нашли ошибку в пояснении — напишите нам, такие сообщения
рассматриваются в первую очередь.
```

---

## 4. Data safety anketasi

⚠️ **Bu javoblar `dist/site/maxfiylik/` sahifasi bilan bir xil bo'lishi
SHART.** Ular kod tekshirilib yozilgan (`localStorage` kalitlari,
`fetch` chaqiruvlari, uchinchi tomon kutubxonalari). Ilovaga analitika,
reklama yoki hisob qo'shilsa — **avval** ikkalasi yangilanadi.

| Savol | Javob |
|---|---|
| Ma'lumot yig'iladimi yoki ulashiladimi? | **Yo'q** |
| Ma'lumot shifrlanib uzatiladimi? | Ha (HTTPS) — faqat savollarni olish so'rovi |
| O'chirish so'rovi yo'li bormi? | Ha — `/malumot-ochirish/` |
| Bu ilova bolalar uchunmi? | Yo'q |

**Nima uchun "yig'ilmaydi":** ilova hech qanday foydalanuvchi
ma'lumotini serverga yubormaydi. Ball, streak, ro'yxatlar va javoblar
**faqat qurilmada** (`localStorage`). Tashqariga ketadigan yagona
so'rov — savollar ro'yxatini olish, unda foydalanuvchiga tegishli hech
narsa yo'q.

**Android zaxira nusxasi.** Manifestda `allowBackup="true"`, ya'ni
Android o'zining zaxira tizimi bilan ilova ma'lumotini foydalanuvchining
**o'z** Google hisobiga ko'chirishi mumkin (yangi telefonga o'tganda
progress qaytadi). Bu Android platformasining funksiyasi, biz bu
ma'lumotni ko'rmaymiz. Play uni "developer tomonidan yig'ish" deb
hisoblamaydi, lekin maxfiylik siyosatida u aytilgan.

---

## 5. Kontent reytingi (IARC) va auditoriya

| Savol | Javob |
|---|---|
| Zo'ravonlik, qon, qo'rqinchli sahnalar | Yo'q |
| Jinsiy mazmun | Yo'q |
| Haqoratli til | Yo'q |
| Giyohvandlik, alkogol, tamaki | Yo'q |
| Qimor yoki qimorga o'xshash mexanika | Yo'q |
| Reklama | Yo'q |
| Foydalanuvchi yaratadigan kontent | Yo'q |
| Foydalanuvchilar o'rtasida muloqot | Yo'q |
| Joylashuv ulashiladimi | Yo'q |
| Ilova ichida xarid | **Yo'q** (v1 da to'lov qatlami kesilgan) |

Kutilayotgan reyting: **3+ / Everyone**.

**Maqsadli auditoriya:** 18+ (haydovchilik guvohnomasi olayotganlar).
"Bolalar uchun" toifasiga kiritilmaydi.

**Kategoriya:** Education. Ikkinchi variant — Auto & Vehicles.

**Teglar:** avtotest, YHQ, ПДД, haydovchilik, imtihon, test.

---

## 6. Imzo kaliti — bu qadamni faqat siz qila olasiz

Play'ga yuklanadigan AAB imzolanishi shart. Kalit **bir marta**
yaratiladi va **yo'qotilmasligi kerak**: yo'qolsa, o'sha ilovaga
yangilanish chiqarib bo'lmaydi (Play App Signing yoqilgan bo'lsa
tiklash mumkin, lekin bu alohida jarayon).

```bash
keytool -genkey -v -keystore nazariy.keystore \
  -alias nazariy -keyalg RSA -keysize 2048 -validity 10000
```

Keyin CI imzolashi uchun GitHub → Settings → Secrets and variables →
Actions → New repository secret:

| Secret | Qiymat |
|---|---|
| `KEYSTORE_BASE64` | `base64 -w0 nazariy.keystore` natijasi |
| `KEYSTORE_PASSWORD` | kalit ombori paroli |
| `KEY_ALIAS` | `nazariy` |
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
- [ ] `site.config.json` → `domain` + `domainConfirmed: true`
- [ ] Saytni hostingga qo'yish (`dist/site/`) — maxfiylik siyosati va
      ma'lumotni o'chirish sahifalari **ochiq URL** bo'lishi shart
- [ ] Imzo kalitini yaratish va GitHub Secrets'ga qo'yish (§6)
- [ ] Play Console'da dasturchi hisobi (bir martalik $25)
- [ ] **Savollar bazasini to'ldirish** — hozir 10 ta savol bor.
      Admin panel tayyor (`dist/admin/`), savollarni u orqali
      kiritasiz. 10 savol bilan chiqarilgan ilova birinchi
      sharhlardan keyin tiklanmaydi.

**Kod tomonidan (tayyor):**

- [x] AAB imzolanadigan holda yig'iladi
- [x] Ortiqcha ruxsat yo'q
- [x] Ishlamaydigan to'lov oqimi mobil build'dan kesilgan
- [x] Maxfiylik siyosati, shartlar, aloqa, ma'lumotni o'chirish
      sahifalari
- [x] Do'kon matnlari (uz + ru)
- [x] Ikonka 512×512, sarlavha rasmi 1024×500, 5 ta ekran surati
- [x] Ekran suratlarida ishlamaydigan funksiya ko'rsatilmaydi
      (reyting ro'yxati namunaviy, shuning uchun suratga kirmadi)

---

## 9. Birinchi chiqarish — qanday

1. **Internal testing** dan boshlang, Production'dan emas. O'zingiz va
   2–3 odam o'rnatib ko'radi. Play bu yo'lni tez o'tkazadi.
2. Xato topilmasa **Closed testing** (20 ta tester, 14 kun) —
   yangi dasturchi hisoblari uchun Play buni **talab qiladi**.
3. Keyin Production.

Yangi shaxsiy dasturchi hisobi uchun Play qoidasi: Production'ga
chiqishdan oldin kamida **12 ta tester 14 kun** davomida closed
testing'da bo'lishi kerak. Shuning uchun 10 savol bilan boshlab, test
davrida bazani to'ldirish mumkin — lekin Production'ga chiqqanda
baza to'liq bo'lishi kerak.

---

## 10. Materiallar qayerda

| Nima | Yo'l |
|---|---|
| AAB (Play'ga yuklanadi) | CI → `nazariy-android` → `Nazariy-release.aab` |
| APK (qo'lda sinash) | CI → `nazariy-android` → `Nazariy-debug.apk` |
| Sayt | CI → `nazariy-sayt` → `dist/site/` |
| Ikonka, sarlavha rasmi, suratlar | `resources/play/` (`npm run play:assets`) |
| Havola ko'rinishi rasmi | `resources/og.jpg` (`npm run og`) |
