# Google Play — chiqarish paketi (IQuest)

Bu hujjat Play Console'ga kiritiladigan **hamma narsani** bir joyda
saqlaydi: do'kon sahifasi matnlari, kategoriya, kontent reytingi,
"Data safety" anketasi, siyosat talablari, imzo kaliti va chiqarish
tartibi.

Nima uchun bitta faylda: Play Console'da o'nlab maydon bor va ularning
ko'pi keyin o'zgartirilganda **qayta ko'rikdan** o'tadi. Javoblarni
oldindan yozib qo'yish har safar "biz nima deb aytgan edik?" degan
savolni yo'q qiladi. Ayniqsa Data safety: u maxfiylik siyosati bilan
**bir xil** bo'lishi shart, aks holda ilova olib tashlanadi.

**Hamma matn `src/iq/CONTRACT.md` §6 ga bo'ysunadi.** Mahsulot egasining
asosiy talabi: ilova **Google Play siyosati tufayli olib tashlanmasligi**
kerak — ya'ni "IQ'ingizni X ballga oshiradi" kabi kafolat va raqamli
va'da yo'q, sog'liq da'volari yo'q (§6). Bu yerda biror narsa
o'zgartirilsa, avval o'sha bo'limlarni qayta o'qing.

| | |
|---|---|
| Ilova nomi | **IQuest** |
| applicationId | `uz.iquest.app` (birinchi yuklashdan keyin o'zgarmaydi) |
| Sayt | **iquest.uz** (sertifikat tekshirish: `iquest.uz/sertifikat/?kod=…`) |
| Tillar | o'zbek (asosiy), rus |

> Loyiha Nazariy (haydovchilik imtihoni ilovasi, `uz.nazariy.app`)
> dvigatelidan olingan. Nazariy Play'da **alohida ilova** bo'lib qoladi:
> IQuest uning ID'sini, imzo kalitini, bazasini va nomini ishlatmaydi.
> Ish nomi "Zukko" edi — u band chiqqani uchun almashtirilgan.

---

## 0. Ochiq savollar — chiqarishdan OLDIN hal qilinadi

| # | Savol | Nega muhim |
|---|---|---|
| 1 | **"IQuest" nomi Play'da va savdo belgisi sifatida bo'shmi?** Bu muhitdan Play qidiruvi tekshirilmadi. | Bir xil yoki juda o'xshash nom — "impersonation" shikoyati va qidiruvda adashish. applicationId birinchi yuklashdan keyin o'zgarmaydi. |
| 2 | **Kirish usuli**: Telegram, telefon yoki email? | Data safety (§5.2), hisobni o'chirish talabi (§6.4). |
| 3 | **Sertifikat pullikmi?** Ilova ichida sotilsa — faqat Play Billing (§6.3). Qog'ozda pochta orqali yuborilsa — jismoniy tovar, boshqa to'lov mumkin. | To'lov siyosati buzilsa — ilova olib tashlanadi. Test va natija esa har holda bepul (CONTRACT §6.6). |
| 4 | **Anonim javoblar kalibrlash uchun** yuboriladimi — rozilik bilanmi yoki standart holatda? | Data safety §5.3, maxfiylik siyosati. |
| 5 | **Maqsadli yosh.** 13 yoshdan kichiklar (masalan, ijod maktablariga tayyorlanayotganlar) auditoriyaga kiradimi? | Kirsa — Play **Families** siyosati: ota-ona roziligi, SDK va ma'lumot cheklovlari (§4.3). Reyting va ism ko'rsatish ham qayta ko'riladi. |
| 6 | **Tavsifdagi har funksiya chiqarishda bormi**: 6 ta o'yin, liga, reyting, sertifikat, og'zaki savollar (`reviewed: true`)? | Bermaydigan narsani va'da qilish — Play "Misleading claims". Yo'q funksiya tavsifdan olinadi. |
| 7 | **Kirill yozuvi** (`uz-cyrl`, transliteratsiya) do'kon tavsifida aytiladimi? | Faqat to'liq tekshirilgan bo'lsa. |
| 8 | **Nashriyotchi (developer) nomi** va yuridik shaxs, aloqa pochtasi. | `site.config.json` → `publisherLegal`, `contactEmail`; maxfiylik siyosati. |

---

## 1. Holat: nima tayyor, nima yo'q

| Talab | Holati |
|---|---|
| applicationId `uz.iquest.app` (Nazariy'dan alohida) | ✅ `capacitor.config.json` — yagona manba; build.gradle va CI tekshiradi |
| AAB yig'iladi | ⚠️ CI'da tekshirilsin (`Android build`) |
| `targetSdk` 36, `minSdk` 24 | ✅ `android/variables.gradle` |
| Ortiqcha ruxsat yo'q | ✅ faqat `INTERNET` (+ bildirishnoma) |
| `SCHEDULE_EXACT_ALARM` olib tashlangan | ✅ manifestda `tools:node="remove"` |
| Mobil build'da tashqi to'lov yo'q | ✅ `build.mjs` → `money: false` (§6.3) |
| Yangi imzo kaliti | ❌ **siz yaratasiz** (§7) |
| Sayt `iquest.uz` hostingda | ❌ keyin `site.config.json` → `domainConfirmed: true` |
| Maxfiylik siyosati, hisobni o'chirish sahifasi (ochiq URL) | ⚠️ sahifalar yig'iladi (`dist/site/`), matni IQuest uchun yangilansin (§6.5) |
| Aloqa manzili | ❌ `site.config.json` → `contactEmail` |
| Do'kon matnlari | ✅ pastda (§2, §3) |
| Grafika | ⚠️ `npm run play:assets` — UI tayyor bo'lgach suratlar olinadi; rasmlar RASMLAR.md bo'yicha |
| Data safety | ⚠️ taxminiy (§5) — **integratsiyada kod bo'yicha tekshirilsin** |

---

## 2. Do'kon sahifasi — o'zbekcha (asosiy til: `uz`)

### Ilova nomi (30 belgigacha)

```
IQuest: IQ testi va o'yinlar
```

(28 belgi). Muqobil: `IQuest: IQ test, aql o'yinlari` (30 — chegarada),
`IQuest — IQ testi va mantiq` (27). "IQuest: IQ testi va aql o'yinlari"
33 belgi — sig'maydi. Nomda "eng yaxshi", "#1", "bepul", "rasmiy", emoji
va BOSH HARFLAR bo'lmaydi (Play metadata siyosati; "IQuest" — brend
yozilishi).

### Qisqa tavsif (80 belgigacha)

```
IQ testi, aql o'yinlari va liga. Natija taxminiy — oraliq bilan, bepul.
```

### To'liq tavsif (4000 belgigacha)

Har paragraf bitta qatorda — Play qator ko'chishini aynan saqlaydi,
shuning uchun blok o'zgarishsiz nusxalanadi.

```
IQuest — IQ testi, aql o'yinlari va mantiqiy topshiriqlar. Mashq qiling, test topshiring va natijangiz qanday o'zgarayotganini kuzating.

IQ TESTI
• Matritsalar — bo'sh katakka qaysi shakl mos keladi?
• Son qatorlari — keyingi son qaysi qoida bilan keladi?
• Fazoviy topshiriqlar — shakl burilsa yoki aks ettirilsa nima bo'ladi?
• Og'zaki mantiq — o'xshatish, ortiqchasini topish, turkumlash.

Test moslashuvchan: keyingi savolning qiyinligi oldingi javoblaringizga qarab tanlanadi. Matritsa, son va fazoviy topshiriqlar har safar yangidan tuziladi, shuning uchun ularni yodlab olib bo'lmaydi — qoidani topish kerak.

NATIJA — TAXMINIY VA ORALIQ BILAN
Test oxirida IQuest balli ko'rsatiladi, har doim oraliq bilan, masalan: 108 (100–116). Bitta raqam aniqlikni bo'rttirib ko'rsatardi, oraliq esa qisqa testning haqiqiy aniqligini aytadi. Savol kam bo'lsa, raqam ko'rsatilmaydi — faqat to'g'ri javoblar soni. Qaysi turdagi topshiriqlarda kuchliroq ekaningiz ham ko'rinadi. Test va natija bepul.

AQL O'YINLARI
Qisqa interaktiv mashqlar: Shulte jadvali, xotira matritsasi, ketma-ketlik, N-back, tez hisob, yo'nalish (flanker). Daraja natijangizga qarab moslashadi.

MASHQ VA IZOHLAR
Har bir topshiriq turi bo'yicha alohida mashq. Har javobdan keyin qoida tushuntiriladi: nima uchun aynan shu javob to'g'ri.

LIGA VA REYTING
Test, mashq va o'yinlar uchun faollik ballari to'playsiz va haftalik ligada Boshlovchidan Olmosgacha ko'tarilasiz. Reytingda eng yaxshi natijalar ko'rinadi. Ballar server tomonidan qayta tekshiriladi — ular halol.

SERTIFIKAT
To'liq testni topshirib, hisobingiz bilan kirsangiz, IQuest.uz natijangizni qayta tekshiradi va sertifikat beradi: ism, ball va oraliq, sana, noyob kod. Har kim sertifikatni iquest.uz saytida kod orqali tekshira oladi. Bu IQuest testining natijasi — klinik yoki psixologik xulosa emas.

QABUL TESTLARIGA TAYYORGARLIK
Akademik litseylar, ijod maktablari va El-yurt umidi tanlovlaridagi mantiq topshiriqlariga o'xshash turdagi masalalarni mashq qilish mumkin. IQuest bu tashkilotlar bilan bog'liq emas va ularning savollarini takrorlamaydi.

INTERNETSIZ HAM
Test, mashq va o'yinlar internetsiz ishlaydi. Liga, reyting va sertifikat uchun internet va hisob kerak.

IKKI TIL
O'zbek va rus tillarida.

MUHIM
IQuest klinik yoki psixologik diagnostika vositasi emas. Savollar hali katta guruhda me'yorlanmagan, shuning uchun natija taxminiy va o'zingizni kuzatish uchun. Undan maktab bahosi, ishga qabul yoki sog'liq (diqqat, xotira) haqida xulosa chiqarish uchun foydalanmang. Mashq qilingan topshiriq yoki o'yinda natija yaxshilanishi tabiiy — bu umumiy aql oshganini anglatmaydi.

Topshiriq yoki izohda xato topsangiz, yozing — bunday xabarlar navbatdan tashqari ko'riladi.
```

---

## 3. Do'kon sahifasi — ruscha (`ru-RU`)

### Ilova nomi

```
IQuest: тест IQ и игры для ума
```

(30 — chegarada). Muqobil: `IQuest — тест IQ и логика` (25).

### Qisqa tavsif

```
Тест IQ, игры для ума и лига. Результат примерный — с интервалом, бесплатно.
```

### To'liq tavsif

```
IQuest — тест IQ, игры для ума и задачи на логику. Тренируйтесь, проходите тест и следите за тем, как меняется ваш результат.

ТЕСТ IQ
• Матрицы — какая фигура подходит в пустую клетку?
• Числовые ряды — по какому правилу идёт следующее число?
• Пространственные задачи — что будет, если фигуру повернуть или отразить?
• Словесная логика — аналогии, лишнее слово, классификация.

Тест адаптивный: сложность следующего вопроса подбирается по вашим предыдущим ответам. Матрицы, числовые ряды и пространственные задачи каждый раз составляются заново, поэтому их нельзя выучить — нужно найти правило.

РЕЗУЛЬТАТ — ПРИМЕРНЫЙ И С ИНТЕРВАЛОМ
В конце теста показывается балл IQuest, всегда с интервалом, например: 108 (100–116). Одно число создавало бы ложное впечатление точности, а интервал честно показывает точность короткого теста. Если вопросов мало, число не показывается — только количество верных ответов. Видно и то, в каких типах заданий вы сильнее. Тест и результат бесплатны.

ИГРЫ ДЛЯ УМА
Короткие интерактивные упражнения: таблица Шульте, матрица памяти, последовательность, N-back, быстрый счёт, направление (фланкер). Уровень подстраивается под ваш результат.

ТРЕНИРОВКА И ОБЪЯСНЕНИЯ
Отдельная тренировка по каждому типу заданий. После каждого ответа объясняется правило: почему верен именно этот ответ.

ЛИГА И РЕЙТИНГ
За тесты, тренировки и игры вы получаете баллы активности и поднимаетесь в недельной лиге — от «Новичка» до «Алмаза». В рейтинге видны лучшие результаты. Баллы перепроверяются на сервере — они честные.

СЕРТИФИКАТ
Если вы прошли полный тест и вошли в аккаунт, IQuest.uz перепроверит результат и выдаст сертификат: имя, балл с интервалом, дата, уникальный код. Любой может проверить сертификат по коду на сайте iquest.uz. Это результат теста IQuest, а не клиническое или психологическое заключение.

ПОДГОТОВКА К ВСТУПИТЕЛЬНЫМ ТЕСТАМ
Можно тренироваться на задачах того же типа, что встречаются в логических заданиях отборов в академические лицеи, творческие школы и «El-yurt umidi». IQuest не связан с этими организациями и не повторяет их вопросы.

И БЕЗ ИНТЕРНЕТА
Тест, тренировка и игры работают без интернета. Для лиги, рейтинга и сертификата нужны интернет и аккаунт.

ДВА ЯЗЫКА
Узбекский и русский.

ВАЖНО
IQuest — не клинический и не психологический диагностический инструмент. Вопросы ещё не нормированы на большой выборке, поэтому результат примерный и предназначен для самонаблюдения. Не используйте его для выводов о школьных оценках, приёме на работу или здоровье (внимание, память). Рост результата в тренируемом задании или игре естественен — это не означает роста общего интеллекта.

Если вы нашли ошибку в задании или объяснении — напишите нам, такие сообщения рассматриваются в первую очередь.
```

⚠️ Liga nomlari ruschada ("Новичок" … "Алмаз") UI lug'ati bilan bir xil
bo'lishi kerak (`src/i18n-ru.js`) — chiqarishdan oldin solishtiring.

---

## 4. Kategoriya, auditoriya, kontent reytingi

### 4.1 Kategoriya: **Education** (ilova turi: App)

Ikkinchi variant — **Puzzle**, lekin u **Games** turkumida: uni tanlash
ilova turini "Game" ga o'zgartiradi. O'yinlar va liga qo'shilgan bo'lsa
ham Education tanlandi, chunki:

1. **Asosiy mahsulot — test, mashq va izoh**: har javobdan keyin qoida
   tushuntiriladi, daraja natijaga qarab tanlanadi, natija tarixi
   kuzatiladi. O'yinlar — shu mashqning qisqa shakli, alohida o'yin sikli
   (sarguzasht, bosqichlar, xarid) emas.
2. **Siyosat xavfi kichikroq.** "Game" turi o'yin kutilmasini beradi va
   raqobatchilar "brain game" ilovalari — ular orasida "miya yoshini
   kamaytiradi" kabi da'volar ko'p va Play ularni aynan shu uchun
   tekshiradi. Education pozitsiyasi "mashq qiling, kuzating" degan
   halol va'daga mos (CONTRACT §6).
3. **Asosiy foydalanuvchi — o'quvchi** (litsey va boshqa tanlovlarga
   tayyorgarlik); u "Education" bo'limida qidiradi.
4. Qidiruv kategoriyaga emas, kalit so'zlarga bog'liq — "IQ test",
   "aql o'yinlari" so'rovlarida Education'dagi ilova ham chiqadi.

Teglar (Play taklif qilganlaridan, borlari): Brain games, Test prep,
Logic.

### 4.2 Kalit so'zlar (tavsif ichida tabiiy uchraydi)

IQ test, aql o'yinlari, mantiq, matritsa, Shulte jadvali, N-back,
litsey testi, тест IQ, игры для ума, логика.

Play kalit so'zlarni takrorlab to'ldirishni (keyword stuffing)
taqiqlaydi — ro'yxat tavsif oxiriga yopishtirilmaydi.

### 4.3 Maqsadli auditoriya (Target audience and content)

Tavsiya: **13–15, 16–17, 18+**. 13 yoshdan kichiklar TANLANMAYDI.

Sabab: 13 yoshdan kichik bolalar tanlansa, Play **Families** siyosati
qo'llanadi — ota-ona roziligi, faqat Families tasdiqlagan SDK'lar,
ma'lumot yig'ishga qattiq cheklov. IQuest'da hisob, ochiq reyting (ism
ko'rinadi) va sertifikat (ism yoziladi) bor — bular bolalar uchun
alohida loyihalanishi kerak bo'lardi (§0, 5-savol). Do'kon matni va
grafikasi ham bolalarga qaratilgandek ko'rinmasligi kerak (RASMLAR.md
uslubi shunga mos).

### 4.4 Kontent reytingi (IARC anketasi)

Kategoriya: **Reference, News, or Educational**.

| Savol | Javob |
|---|---|
| Zo'ravonlik, qon, qo'rqinchli sahnalar | Yo'q |
| Jinsiy mazmun, yalang'ochlik | Yo'q |
| Haqoratli til | Yo'q |
| Giyohvandlik, alkogol, tamaki | Yo'q |
| Qimor yoki qimorga o'xshash mexanika (pulga tikish, lootbox, tasodifiy mukofot sotish) | Yo'q — liga faqat faollik ballari |
| Foydalanuvchilar o'zaro muloqot qiladimi / kontent almashadimi | Chat yo'q. **Reytingda boshqalarning ismi ko'rinadi** — shuning uchun "Users Interact" savoliga **Ha** deb javob berish xavfsizroq (⚠️ UI bilan tekshirilsin) |
| Foydalanuvchi ma'lumoti boshqalarga ko'rsatiladimi | Ha — ism reytingda va sertifikat tekshirish sahifasida (foydalanuvchi o'zi tanlaydi) |
| Joylashuv ulashiladimi | Yo'q |
| Raqamli tovar sotib olish | Hozir yo'q (§0, 3-savol) |
| Cheklanmagan internet (veb-brauzer) | Yo'q |

Kutilayotgan reyting: **3+ / Everyone / PEGI 3** ("Users Interact"
belgisi bilan bo'lishi mumkin).

### 4.5 App content — boshqa deklaratsiyalar

| Bo'lim | Javob |
|---|---|
| Ads (reklama) | Yo'q (reklama SDK'si yo'q). Qo'shilsa — shu yerda va Data safety'da |
| App access | Test, mashq va o'yinlar kirishsiz ishlaydi. Liga, reyting, sertifikat — hisob bilan: tekshiruvchi uchun **sinov hisobi** va kirish yo'riqnomasi beriladi |
| Health apps | **"Ilovamda sog'liq funksiyalari yo'q"** |
| Financial features | Yo'q |
| Government apps | Yo'q (davlat organi, litsey, DTM yoki imtihon markazi bilan bog'liqlik ishorasi ham yo'q) |
| News app | Yo'q |

---

## 5. Data safety anketasi

⚠️ **TAXMINIY — integratsiyada kod bo'yicha tekshirilsin.** Hisob,
server tekshiruvi, liga va sertifikat qatlamini backend va cert
agentlari quryapti (`supabase/`, `src/data.js`, `src/cert/`,
CONTRACT §10). Javoblar chiqarishdan oldin tekshiriladi va
`dist/site/maxfiylik/` sahifasi bilan **bir xil** bo'ladi. Ilovaga
analitika, reklama yoki yangi so'rov qo'shilsa — **avval** ikkalasi
yangilanadi.

### 5.1 Hisobsiz foydalanish

Test, mashq, o'yinlar va natija tarixi **faqat qurilmada**
(`localStorage`, `nzProgress`). Hech narsa serverga ketmaydi (5.3
yoqilmagan bo'lsa).

### 5.2 Hisob bilan (liga, reyting, sertifikat)

Server ballni o'zi qayta hisoblaydi (CONTRACT §10), shuning uchun test
javoblari va o'yin jurnali serverga yuboriladi.

| Ma'lumot turi (Play) | Yig'iladi | Ulashiladi | Majburiy? | Maqsad |
|---|---|---|---|---|
| Personal info → Name (reytingdagi va sertifikatdagi ism) | Ha | Yo'q | Liga/sertifikat uchun | App functionality, Account management |
| Personal info → Email *yoki* Phone (kirish usuliga qarab; Telegram bo'lsa — User IDs) | Ha | Yo'q | Kirish uchun | Account management |
| Personal info → User IDs (hisob ID, Telegram ID) | Ha | Yo'q | Ha | Account management, App functionality |
| App activity → App interactions (test javoblari va vaqti, o'yin bosishlari jurnali, ballar) | Ha | Yo'q | Liga/sertifikat uchun | App functionality (ballni tekshirish, liga, reyting, sertifikat), Fraud prevention |

- Ma'lumot IQuest serverida saqlanadi (maxfiylik siyosati loyihasi
  bo'yicha — o'z VDS'i, uchinchi tomon bulut xizmatisiz; davlat —
  `site.config.json` → `serverCountry`, hali noma'lum). Hosting yoki
  boshqa xizmat ko'rsatuvchi bizning nomimizdan ishlasa, Play ta'rifi
  bo'yicha bu "ulashish" emas. ⚠️ Backend yakunlanganda tekshirilsin.
- Reytingda ism va ball boshqa foydalanuvchilarga, sertifikat tekshirish
  sahifasida esa **kodni bilgan har kimga** ko'rinadi (ism, ball, oraliq,
  sana). Bu foydalanuvchi o'zi boshlagan va kutgan harakat, lekin
  maxfiylik siyosatida aniq yoziladi; reytingda ism o'rniga taxallus
  tanlash imkoni tavsiya etiladi.

### 5.3 Kalibrlash uchun anonim javoblar (agar yoqilsa)

Savollarning haqiqiy qiyinligini hisoblash uchun: savol ID'si (turi,
darajasi, urug'i), to'g'ri/noto'g'ri, javob vaqti. Ism, hisob va qurilma
ID'si **yo'q**.

| Ma'lumot turi | Yig'iladi | Ulashiladi | Majburiy? | Maqsad |
|---|---|---|---|---|
| App activity → App interactions | Ha | Yo'q | **Ixtiyoriy** (rozilik tugmasi tavsiya etiladi) | Analytics (savollarni kalibrlash) |

Anonim bo'lsa ham Play uni "yig'ilgan" deb hisoblaydi.

### 5.4 Umumiy savollar

| Savol | Javob |
|---|---|
| Ma'lumot uzatishda shifrlanadimi? | Ha (HTTPS) |
| Foydalanuvchi o'chirishni so'ray oladimi? | Ha — ilova ichida va `iquest.uz/malumot-ochirish/` (§6.4) |
| Play Families siyosatiga mos (bolalar uchun)? | Qo'llanmaydi (§4.3) |

**Android zaxira nusxasi.** Manifestda `allowBackup="true"`: Android
ilova ma'lumotini foydalanuvchining **o'z** Google hisobiga ko'chirishi
mumkin. Biz bu ma'lumotni ko'rmaymiz, Play uni "yig'ish" deb
hisoblamaydi, lekin maxfiylik siyosatida aytiladi.

---

## 6. Google Play siyosati — nimaga e'tibor

### 6.1 Aldamchi va sog'liq da'volari (Deceptive Behavior, Health)

Play ilova qila olmaydigan narsani va'da qilishni va tibbiy da'volarni
taqiqlaydi — bu **ilovani olib tashlash** sababi. Do'kon matni, grafika,
ekran suratlari, reklama, sertifikat va ilova ichidagi matn uchun:

| Mumkin emas | Nega |
|---|---|
| "IQ'ingizni 20 ballga oshiring", "12 haftada +15", "aqlli bo'lasiz", kafolat | Raqamli va'da va kafolat — isbotlanmagan. Lumosity shunday va'dalar uchun FTC bilan kelishuvda 2 mln $ **tovon** (redress) to'lagan; LearningRx "IQ 15 ballga oshadi" degani uchun jazolangan |
| "Xotirani / diqqatni yaxshilaydi", "DEHB", "demensiyaning oldini oladi", "miya salomatligi", "miya yoshi" | Sog'liq da'vosi — Health siyosati. N-back va Shulte jadvali ayniqsa shunday reklama qilinadi — bizda yo'q |
| "Rasmiy IQ", "sertifikatlangan", "klinik", "Mensa", davlat/litsey/DTM bilan bog'liqlik ishorasi (gerb, muhr, "tavsiya etilgan") | Yolg'on vakolat; Government va impersonation siyosati |
| "Aholining 95% idan aqlliroq", persentil, "haqiqiy / aniq IQ" | Me'yor guruhi yo'q — to'qima raqam |
| "DTM'ga tayyorlaydi" | DTM testida mantiq bo'limi yo'q — yolg'on |
| Oraliqsiz IQ raqami (ulashish kartasida ham) | CONTRACT §6.1 — aniqlikni bo'rttiradi |

Mumkin: "IQ testi", "aql o'yinlari", "mashq qiling, natijangiz o'sishini
kuzating", "liga va reyting", "IQuest sertifikati — test natijasi,
tekshirish kodi bilan", "litsey va ijod maktablari testlaridagi mantiq
topshiriqlari turini mashq qiling", "taxminiy natija, oraliq bilan".

**Sertifikat** — "IQuest testi natijasi": ball, oraliq, sana, ism, noyob
kod va tekshirish havolasi. Dizaynida davlat hujjatiga o'xshash belgi
(gerb, muhr, lenta) yo'q (RASMLAR.md). Faqat server tekshirgan,
`reliable: true` test uchun beriladi (CONTRACT §6.7, §10).

### 6.2 Metadata

Nom 30 belgigacha, emoji yo'q, "eng yaxshi / #1 / top / bepul" nom va
ikonkada yo'q. Ekran suratlari **haqiqiy** ilovadan (`npm run
play:assets`), hali ishlamaydigan funksiya ko'rsatilmaydi. Tavsifda
noma'lum foydalanuvchilarning "sharhlari" bo'lmaydi.

### 6.3 To'lovlar — Play Billing majburiy

Ilova ichida **raqamli** narsa (sertifikat PDF'i, qo'shimcha o'yinlar,
reklamasiz rejim, obuna) sotilsa — faqat **Google Play Billing**
orqali. APK ichida **Click, Payme, Uzum yoki boshqa tashqi to'lov** oqimi
va saytdagi to'lov sahifasiga olib boruvchi havola/tugma **bo'lmasligi
kerak** — aks holda ilova olib tashlanadi. Jismoniy tovar (masalan,
pochta orqali qog'oz sertifikat) bundan mustasno.

Hozir mobil build'da pul qatlami butunlay kesilgan (`build.mjs`,
`money: false`); sayt build'ida qolgan to'lov qatlami Play siyosatiga
tushmaydi, lekin APK undan havola bermasligi shart.

Test va natija **hech qachon** pullik emas (CONTRACT §6.6).

### 6.4 Hisobni o'chirish

Ilovada hisob yaratish bor ekan, Play ikkalasini talab qiladi: **ilova
ichida** hisobni o'chirish va **veb-havola** (`iquest.uz/malumot-ochirish/`).
Hisob bilan birga natijalar, liga ballari va ism o'chadi. Berilgan
sertifikatlar bilan nima bo'lishi (tekshirish sahifasi "bekor qilingan"
deb ko'rsatadimi) — maxfiylik siyosatida yoziladi. Havola Data safety →
"Delete account URL" ga yoziladi.

### 6.5 Maxfiylik siyosati

Ochiq URL (`iquest.uz/maxfiylik/`), Play Console va ilova ichida havola.
Matn IQuest uchun yangilanadi (UI agentining fayli — `src/site/pages.mjs`):
nima yig'iladi (§5), reyting va sertifikatda nima ochiq ko'rinadi, kim
ko'radi, qancha saqlanadi, qanday o'chiriladi, aloqa manzili.

---

## 7. Imzo kaliti — YANGI, faqat IQuest uchun

**Nazariy'ning kaliti ishlatilmaydi.** Sabablari:

- kalit sizib chiqsa yoki tiklanishi kerak bo'lsa, **ikki ilova birdan**
  xavf ostida qoladi;
- bir xil sertifikat bilan imzolangan ilovalar Android'da bir-biriga
  "ishonadi" (signature ruxsatlari) — bizga bu kerak emas;
- ilovalardan birini boshqa dasturchi hisobiga o'tkazish kerak bo'lsa,
  umumiy kalit buni murakkablashtiradi.

Himoya kodda ham bor: CI secret nomlari `IQUEST_*` (Nazariy
repozitoriyasidagi umumiy `KEYSTORE_BASE64` jimgina ishlatilmasin) va
alias'i "nazariy" bo'lgan kalit bilan `android/app/build.gradle` build'ni
to'xtatadi.

### 7.1 Play App Signing

Yangi ilovalar uchun Play App Signing majburiy (AAB bilan). Siz yaratadigan
kalit — **yuklash kaliti (upload key)**: u bilan AAB imzolanadi, Google
uni tekshirib, ilovani o'zidagi **ilova imzolash kaliti** bilan qayta
imzolaydi. Upload key yo'qolsa, Play Console orqali almashtirish mumkin
(bir necha kun). Baribir nusxasini xavfsiz joyda saqlang.

### 7.2 Kalit yaratish (bir marta, o'z kompyuteringizda)

```bash
keytool -genkeypair -v \
  -keystore iquest-upload.jks -storetype PKCS12 \
  -alias iquest -keyalg RSA -keysize 4096 -validity 10000
```

`keytool` JDK bilan keladi. Parol va "ism, tashkilot" savollarini
so'raydi. **Kalit fayli va parollar repoga TUSHMAYDI** (`.gitignore`:
`*.keystore`, `*.jks`, `android/keystore.properties`) va chatga ham
yozilmaydi.

### 7.3 Mahalliy yig'ish uchun

`android/keystore.properties` (git'ga tushmaydi):

```properties
storeFile=/to/liq/yo/l/iquest-upload.jks
storePassword=...
keyAlias=iquest
keyPassword=...
```

### 7.4 CI (GitHub Actions) uchun

GitHub → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Qiymat |
|---|---|
| `IQUEST_KEYSTORE_BASE64` | `base64 -w0 iquest-upload.jks` natijasi |
| `IQUEST_KEYSTORE_PASSWORD` | kalit ombori paroli |
| `IQUEST_KEY_ALIAS` | `iquest` |
| `IQUEST_KEY_PASSWORD` | kalit paroli |

Secrets qo'yilmasa CI baribir ishlaydi, lekin release imzosiz chiqadi va
Play uni qabul qilmaydi. `IQuest-debug.apk` esa har doim o'rnatiladi.

---

## 8. Versiya

`version.json` — yagona manba. Har yuklashda `versionCode` **oshishi
shart** (Play bir xil yoki kichik raqamni rad etadi).

```json
{ "versionCode": 1, "versionName": "1.0.0" }
```

`android/app/build.gradle` shu fayldan o'qiydi — boshqa joyda tahrir
kerak emas.

---

## 9. Chiqarish tartibi

### 9.1 Chiqarishdan oldin — ro'yxat

**Sizdan:**

- [ ] "IQuest" nomi Play'da va savdo belgisi sifatida tekshirildi (§0, 1)
- [ ] Yangi imzo kaliti va GitHub Secrets (§7)
- [ ] Sayt `iquest.uz` hostingda → `site.config.json`: `domainConfirmed: true`, `contactEmail`, `publisherLegal`
- [ ] Maxfiylik siyosati va hisobni o'chirish sahifalari **ochiq URL**
- [ ] Rasmlar (RASMLAR.md) → `npm run icons`, `npm run og`, `npm run play:assets`
- [ ] Play Console dasturchi hisobi; tekshiruvchi uchun sinov hisobi (§4.5)

**Kod tomonidan (integratsiyada tekshiriladi):**

- [ ] CI yashil: `JS testlari` va `Android build` (paket nomi va ilova nomi tekshiruvi shu yerda)
- [ ] `www/index.html` da "Nazariy" va "Zukko" qolmagan (CI ogohlantiradi)
- [ ] Natija ekrani CONTRACT §6 ga mos (oraliq, rad qilish matni, `reliable: false`)
- [ ] Tavsifdagi har funksiya ilovada bor (§0, 6)
- [ ] Liga, reyting va sertifikat faqat server tekshirgan ballardan (CONTRACT §10)
- [ ] Data safety (§5) kod va maxfiylik siyosati bilan bir xil
- [ ] Ekran suratlari yangi UI'dan olingan

### 9.2 Birinchi chiqarish

1. **Create app**: nom (§2), standart til — o'zbek, turi — App, bepul.
   *Bepul deb belgilangan ilovani keyin pulli qilib bo'lmaydi* (ichki
   xarid qo'shish mumkin).
2. Store listing (§2, §3), grafika (`resources/play/`), App content
   (§4, §5, maxfiylik siyosati URL, hisobni o'chirish URL).
3. **Internal testing**: `IQuest-release.aab` (CI → `iquest-android`
   artefakti). O'zingiz va 2–3 kishi o'rnatadi. Pre-launch report'ni
   ko'ring (yiqilish, ruxsatlar, kirish imkoniyatlari).
4. **Closed testing** — yangi shaxsiy dasturchi hisobi uchun Play
   Production'dan oldin buni talab qiladi (yozish vaqtida: kamida 12
   tester, 14 kun ketma-ket; aniq talabni Play Console'da tekshiring).
5. **Production** — ko'rik odatda 1–7 kun, birinchi marta uzoqroq.

### 9.3 Yangilanish

`version.json` → `versionCode` +1, `versionName` → push → CI → yangi
`.aab` → Play Console → yangi release → Rollout.

---

## 10. Materiallar qayerda

| Nima | Yo'l |
|---|---|
| AAB (Play'ga yuklanadi) | CI → `iquest-android` → `IQuest-release.aab` |
| APK (qo'lda sinash) | CI → `iquest-android` → `IQuest-debug.apk`; telefonda — Release `sinov-<shoxcha>` |
| Sayt | CI → `iquest-sayt` → `dist/site/` |
| Ikonka 512, sarlavha rasmi (uz/ru), suratlar (uz/ru) | `resources/play/` (`npm run play:assets`) |
| Havola ko'rinishi rasmi | `resources/og.jpg` (`npm run og`) |
| Rasm talablari va promptlar | `RASMLAR.md` |
