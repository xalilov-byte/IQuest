/* ─────────────────────────────────────────────────────────────────────────
   RUS TILI LUGʻATI

   Kalit — MANBA satrning oʻzi (oʻzbek lotin, dizayn faylida yozilgani).
   Shuning uchun yangi matn qoʻshilganda kalit oʻylab topish kerak emas:
   matnni shu yerga koʻchirib, tarjimasini yozish yetarli.

   Tarjimasi yoʻq satr oʻzbekcha qoladi — ilova buzilmaydi, shunchaki
   oʻsha joy tarjimasiz koʻrinadi.

   Oʻzbek lotin ↔ kirill uchun lugʻat KERAK EMAS — u avtomatik oʻgiriladi
   (i18n.js dagi transliterate).

   TARTIB: boʻlimlar ekran boʻyicha. Yangi satrni tegishli boʻlimga
   qoʻying, oxiriga emas — shunda nima qayerdaligini topish oson.

   QAMROV: faqat FOYDALANUVCHI ilovasi. Admin panel o'zbek tilida
   qoladi — u ichki ish quroli va uni faqat jamoa ishlatadi, shuning
   uchun uni uch tilda saqlash ortiqcha yuk bo'lardi.
   ───────────────────────────────────────────────────────────────────── */

window.nzRu = {
  /* ── Navigatsiya va umumiy ────────────────────────────────────────── */
  "Bosh": "Главная",
  "Vazifalar": "Задания",
  "Reyting": "Рейтинг",
  "Profil": "Профиль",
  "Bosh sahifa": "На главную",
  "Bosh sahifaga qaytish": "Вернуться на главную",
  "Bekor qilish": "Отмена",
  "Davom etish": "Продолжить",
  "Qayta yechish": "Пройти снова",
  "Tez kunda": "Скоро",
  "yoki": "или",
  "ball": "баллов",
  "Ball": "Баллы",
  "savol": "вопросов",
  "belgi": "знаков",
  "kun": "дней",
  "Faol": "Активна",

  /* ── Qoʻshib yasaladigan satrlarning matn boʻlaklari ──────────────── */
  /* Bular T() bilan alohida oʻgiriladi (raqam qoʻshilishidan oldin) */
  "ta savol · qayta yechish": "вопроса · пройти снова",
  "Rekord:": "Рекорд:",
  "Oyiga": "В месяц",
  "soʻm": "сум",
  "tejaysiz": "экономия",
  "1 oy Pro": "1 месяц Pro",
  "Toʻgʻri! +10 ball": "Верно! +10 баллов",
  "Notoʻgʻri · toʻgʻri javob —": "Неверно · правильный ответ —",
  /* Ekran oʻqiruvchi uchun rasmning alt matni. */
  "Savol rasmi": "Изображение к вопросу",
  "Cheksiz imtihon va chuqur tahlil": "Неограниченные экзамены и глубокая аналитика",
  "ta xatoni koʻrib chiqing": "ошибок — разберите их",
  "ta ketma-ket toʻgʻri!": "верных подряд!",
  "toʻgʻri javob. Istalgancha qayta mashq qilishingiz mumkin.":
    "верных ответов. Можно тренироваться сколько угодно.",
  "gacha faol": "активен до",
  "gacha amal qiladi.": "действует до.",
  "Rekordingiz —": "Ваш рекорд —",
  "Yana urinib koʻring!": "Попробуйте ещё!",
  "toʻlash": "оплатить",
  "kerak": "нужно",
  "yana": "ещё",
  "Tasdiqlash uchun": "Для подтверждения",
  "sarflash": "списать",

  /* ── Bosh ekran ───────────────────────────────────────────────────── */
  "Imtihon tayyorligi": "Готовность к экзамену",
  "Bu hafta": "На этой неделе",
  "Kunlik vazifa": "Ежедневное задание",
  "Bugun 20 savol yech": "Решите 20 вопросов сегодня",
  "Rejimlar": "Режимы",
  "2s 40 daq": "2 ч 40 мин",

  /* ── Test rejimlari ───────────────────────────────────────────────── */
  "Imtihon": "Экзамен",
  "Imtihon (demo)": "Экзамен (демо)",
  "10 savol · 12:30 · 2 xato limiti": "10 вопросов · 12:30 · лимит 2 ошибки",
  "Mavzular": "Темы",
  "Yoʻl belgilari": "Дорожные знаки",
  "Xatolarim": "Мои ошибки",
  "Marafon": "Марафон",
  "Saqlangan": "Сохранённые",
  /* Mavzu va belgi sonlari BANKDAN hisoblanadi, shuning uchun bu
     yerdagi kalit son bilan boshlanmaydi — faqat qo'shilib
     yasaladigan matn bo'lagi turadi. Ilgari "18 mavzu" va "240 belgi"
     kaliti bor edi: bank boshqa son bergan zahoti ikkalasi ham
     ishlamay qolgan va rus tilida o'zbekcha matn chiqib turgan. */
  "boʻlim — har birini alohida mashq qiling.":
    "разделов — тренируйте каждый отдельно.",
  "Belgilar lugʻati va «rasm → nom» testi.":
    "Справочник знаков и тест «картинка → название».",
  "Faqat notoʻgʻri yechilgan savollar takrori.":
    "Повтор только тех вопросов, где была ошибка.",
  "Cheksiz savollar — xatoga qadar davom etadi.":
    "Бесконечные вопросы — до первой ошибки.",
  "Test paytida savol tepasidagi xatchoʻp tugmasini bosing — qiyin savollar shu yerda jamlanadi va istagan vaqtda qayta yechasiz.":
    "Во время теста нажмите закладку над вопросом — сложные вопросы соберутся здесь, и вы сможете пройти их снова.",
  "Bu yerda xato qilgan savollaringiz toʻplanadi. Avval biror testni yeching — keyin shu yerdan qaytadan mashq qilasiz.":
    "Здесь собираются вопросы, в которых вы ошиблись. Сначала пройдите любой тест — потом потренируетесь здесь.",
  "Hali xatoingiz yoʻq": "Ошибок пока нет",
  "Saqlangan savol yoʻq": "Нет сохранённых вопросов",
  "Hozircha boʻsh — testda xatchoʻp bilan saqlang":
    "Пока пусто — сохраняйте вопросы закладкой во время теста",
  /* "Tezkor test" rejimi landing'dan olib tashlandi — u ilovada yo'q
     edi. Imtihon formati endi qo'shib yasaladi (examFmt), shuning
     uchun bu yerda butun jumla emas, BO'LAKLARI o'giriladi. */
  "Xatchoʻp bilan belgilangan savollar takrori.":
    "Повтор вопросов, отмеченных закладкой.",
  "daqiqa": "минут",
  /* "2 xato limiti" → "2 ошибки". So'zma-so'z "лимит ошибок" qo'shilib
     yasalganda "2 лимит ошибок" bo'lib chiqardi — grammatik xato. */
  "xato limiti": "ошибки",
  "haqiqiy format bilan mashq.": "тренировка в реальном формате.",
  "haqiqiy simulyatsiya.": "настоящая симуляция.",
  "Barcha mavzular": "Все темы",

  /* ── Test ekrani ──────────────────────────────────────────────────── */
  "Javobni tanlang": "Выберите ответ",
  "Keyingi savol": "Следующий вопрос",
  "Natijani koʻrish": "Посмотреть результат",
  "Toʻgʻri": "Верно",
  "Xato": "Ошибка",
  "Xato limiti": "Лимит ошибок",
  "Savolni saqlash": "Сохранить вопрос",
  "Saqlanganlardan olib tashlash": "Убрать из сохранённых",
  "Ketma-ket toʻgʻri:": "Верных подряд:",
  "Mashq yakunlandi": "Тренировка завершена",
  "Oʻtdingiz!": "Вы прошли!",
  "Oʻtdingiz": "Пройдено",
  "Oʻtmadingiz": "Не пройдено",
  "Xatosiz natija!": "Без ошибок!",
  "Yangi rekord!": "Новый рекорд!",
  "Eng tez oʻsish imkoniyati shu yerda": "Здесь быстрее всего вырастет результат",
  "Marafon rejimida bilimingizni sinang": "Проверьте себя в режиме марафона",
  "Imtihon formatida {0} tagacha xato ruxsat etiladi. Shu tempda davom eting.":
    "В формате экзамена допускается до 2 ошибок. Продолжайте в этом темпе.",
  "Ruxsat etilgan xato — {0} ta. Xatolaringizni «Xatolarim» rejimida takrorlang.":
    "Допустимо 2 ошибки. Повторите свои ошибки в режиме «Мои ошибки».",
  "Bu — sessiyadagi eng yaxshi natijangiz. Yana urinib koʻring!":
    "Это ваш лучший результат за сессию. Попробуйте ещё!",

  /* ── Vazifalar ────────────────────────────────────────────────────── */
  "Kunlik": "Ежедневные",
  "Bir martalik": "Разовые",
  "Ijtimoiy": "Социальные",
  "Kunlik, bir martalik va ijtimoiy vazifalar": "Ежедневные, разовые и социальные задания",
  "20 savol yech": "Решить 20 вопросов",
  "Bitta imtihon topshir": "Сдать один экзамен",
  "Har qanday natija bilan": "С любым результатом",
  "Topshirildi": "Сдан",
  "Kunlik kirish": "Ежедневный вход",
  "Ilova ochildi": "Приложение открыто",
  "Barcha yoʻl belgilarini koʻrish": "Посмотреть все дорожные знаки",
  "Profilni toʻldirish": "Заполнить профиль",
  "Ism va toifa": "Имя и категория",
  "Kanalga obuna boʻlish": "Подписаться на канал",
  "Doʻst taklif qilish": "Пригласить друга",
  "Havola orqali": "По ссылке",

  /* ── Reyting va guruhlar ──────────────────────────────────────────── */
  "Shaxsiy": "Личный",
  "Guruh": "Группа",
  /* Liga yorliqlari endi bo'laklardan yasaladi (daraja nomi + so'z),
     chunki daraja balldan hisoblanadi. Ilgari butun satr qo'lda
     yozilgan edi: "Kumush liga · #142", "Kumush → Oltin",
     "Oltin ligagacha 2 520 ball". */
  "Reyting hali ishga tushmagan — quyidagi roʻyxat namunaviy. Ballaringiz telefonda saqlanmoqda va reyting yoqilganda hisobga olinadi.":
    "Рейтинг ещё не запущен — список ниже демонстрационный. Ваши баллы сохраняются на телефоне и будут учтены, когда рейтинг включат.",
  "liga": "лига",
  /* Qolipli kalitlar: o'zbekchada "Boshlovchi liga" (nom + so'z),
     ruschada "Лига «Новичок»" (so'z + nom). Qo'shib yasaganda rus
     tilida "Новичок лига" chiqardi — grammatik xato. */
  "{0} liga": "Лига «{0}»",
  "{0} liga · top": "Лига «{0}» · топ",
  "ligagacha": "до лиги —",
  "Eng yuqori liga": "Высшая лига",
  /* Liga nomi endi hisoblanadi, sarlavha esa qo'shib yasaladi
     (leagueTopTitle) — shuning uchun kalit butun jumla emas, bo'lagi. */
  "top": "топ",
  "Mening guruhim": "Моя группа",
  "Top guruhlar": "Топ групп",
  "Guruh yaratish": "Создать группу",
  "Kod bilan qoʻshilish": "Войти по коду",
  "aʼzo": "участников",
  "umumiy ball": "всего баллов",
  "oʻrin": "место",
  "Har oy yangilanadi": "Обновляется каждый месяц",
  "Bronza": "Бронза",
  "Kumush": "Серебро",
  "Oltin": "Золото",
  "Platina": "Платина",
  "Olmos": "Алмаз",
  "Sardor (siz)": "Сардор (вы)",

  /* ── Profil ───────────────────────────────────────────────────────── */
  "Saqlangan savollar": "Сохранённые вопросы",
  "Mavzular boʻyicha": "По темам",
  "Yutuqlar": "Достижения",
  "Yechilgan savollar": "Решено вопросов",
  "Toʻgʻri javob": "Верных ответов",
  "Imtihonlar": "Экзамены",
  "Eng uzun streak": "Самая длинная серия",
  "Eng katta oʻsish imkoniyati — shu mavzuni koʻproq mashq qiling":
    "Здесь самый большой потенциал роста — тренируйте эту тему чаще",
  "Sozlamalar": "Настройки",

  /* ── Yutuqlar ─────────────────────────────────────────────────────── */
  "Birinchi imtihon": "Первый экзамен",
  "Birinchi testni yechdi": "Пройден первый тест",
  "7 kunlik seriya": "Серия 7 дней",
  "Ertasi kuni qaytdi": "Вернулся на следующий день",
  "500 savol yechildi": "Решено 500 вопросов",
  "Marafon chempioni": "Чемпион марафона",
  "Boshlovchi": "Новичок",
  "Roʻyxatdan oʻtdi": "Зарегистрировался",
  "Pro faollashtirdi": "Активировал Pro",
  "Pro sahifasini koʻrdi": "Открыл страницу Pro",
  "Bot ochildi": "Бот открыт",

  /* ── Mavzular ─────────────────────────────────────────────────────── */
  "Umumiy qoidalar": "Общие правила",
  "Chorrahalar": "Перекрёстки",
  "Svetofor": "Светофор",
  "Tezlik rejimi": "Скоростной режим",
  "Tezlik va joylashish": "Скорость и расположение",
  "Quvib oʻtish": "Обгон",
  "Toʻxtab turish": "Остановка и стоянка",
  "Birinchi yordam": "Первая помощь",

  /* ── Pro va toʻlov ────────────────────────────────────────────────── */
  "Nazariy Pro": "Nazariy Pro",
  "Obuna holati": "Статус подписки",
  "Obunani bekor qilish": "Отменить подписку",
  "Pro faollashtirildi": "Pro активирован",
  "Proʻni faollashtirish": "Активировать Pro",
  "Pro'ni faollashtirish": "Активировать Pro",
  "Siz Pro'dasiz": "У вас Pro",
  "Cheksiz imtihon": "Неограниченные экзамены",
  "Kuniga 3 tadan emas — xohlagancha simulyatsiya":
    "Не по 3 в день — симуляций сколько угодно",
  "Xato ustida chuqur ish": "Глубокая работа над ошибками",
  "Har bir xatoga kengaytirilgan izoh va oʻxshash savollar":
    "Расширенное объяснение к каждой ошибке и похожие вопросы",
  "Batafsil tahlil": "Подробная аналитика",
  "Mavzular kesimida zaif nuqtalar va haftalik dinamika":
    "Слабые места по темам и динамика по неделям",
  "Reklamasiz": "Без рекламы",
  "Hech narsa mashqdan chalgʻitmaydi": "Ничего не отвлекает от тренировки",
  "Offline rejim": "Офлайн-режим",
  "Internetsiz ham savollar va belgilar qoʻlda":
    "Вопросы и знаки под рукой даже без интернета",
  "Pro cheklovlarni olib tashlaydi va xatolaringiz ustida chuqurroq ishlashga yordam beradi.":
    "Pro снимает ограничения и помогает глубже работать над ошибками.",
  "Barcha imkoniyatlar ochiq. Muddat tugagach oddiy rejimga qaytasiz — hech narsa yoʻqolmaydi.":
    "Все возможности открыты. После окончания срока вернётесь в обычный режим — ничего не потеряется.",
  "Obuna avtomatik yangilanadi, istalgan vaqtda shu sahifadan bekor qilasiz. Bepul rejim ochiq qoladi: kunlik vazifalar, streak, reyting va savollar bazasi.":
    "Подписка продлевается автоматически, отменить можно в любой момент на этой странице. Бесплатный режим остаётся: ежедневные задания, серия, рейтинг и база вопросов.",
  "Bekor qilsangiz ham joriy davr oxirigacha Pro amal qiladi. Bepul rejimdagi savollar, streak va reyting hech qachon yopilmaydi.":
    "Даже после отмены Pro действует до конца текущего периода. Вопросы, серия и рейтинг в бесплатном режиме не закрываются никогда.",
  "Toʻlov": "Оплата",
  "Toʻlov usuli": "Способ оплаты",
  "Telegram Stars": "Telegram Stars",
  "Telegram hisobingizdagi Stars bilan": "Звёздами с вашего счёта Telegram",
  "Hamyon yoki karta orqali": "Кошелёк или карта",
  "Hamyon · boʻlib toʻlash": "Кошелёк · рассрочка",
  "Karta raqamini kiritib": "Вводом номера карты",
  "Karta raqami": "Номер карты",
  "Amal qilish muddati": "Срок действия",
  "SMS kod": "SMS-код",
  "Ball evaziga Pro": "Pro за баллы",
  "Ball evaziga olish": "Получить за баллы",
  "Ball evaziga 1 oy olish": "Получить 1 месяц за баллы",
  "Ball hali yetarli emas": "Баллов пока недостаточно",
  "Hozirgi balans": "Текущий баланс",
  "Sarflanadi": "Списывается",
  "Qoladi": "Останется",
  "1 oy": "1 месяц",
  "12 oy": "12 месяцев",
  "1 oyga yetadi": "Хватит на 1 месяц",
  "1 oylik Pro darhol yoqiladi. Sarflangan ball qaytarilmaydi, lekin obuna avtomatik yangilanmaydi — muddat tugagach oddiy rejimga qaytasiz.":
    "Pro на 1 месяц включится сразу. Списанные баллы не возвращаются, но подписка не продлевается автоматически — после срока вернётесь в обычный режим.",
  "Karta maʼlumotlari bank tomonida tekshiriladi va Nazariy serverida saqlanmaydi. Tasdiqlash uchun telefoningizga bankdan SMS kod yuboriladi.":
    "Данные карты проверяет банк, на сервере Nazariy они не хранятся. Для подтверждения банк отправит SMS-код на ваш телефон.",
  "Toʻlov Telegram hisobingizdagi Stars bilan amalga oshiriladi. Yetkazib berilmagan xarid uchun /paysupport orqali qaytarib olish mumkin.":
    "Оплата проходит звёздами Stars с вашего аккаунта Telegram. Если покупка не доставлена, вернуть средства можно через /paysupport.",

  /* ── Sozlamalar ───────────────────────────────────────────────────── */
  "Til": "Язык",
  "Ovoz": "Звук",
  "Bildirishnoma": "Уведомления",
  "Yoniq": "Вкл",
  "Oʻchiq": "Выкл",
  "Oʻchirilgan": "Отключено",
  "Har kuni 19:00": "Каждый день в 19:00",

  /* ── Landing (sayt) ───────────────────────────────────────────────── */
  "Telegram Mini App · Oʻzbekiston": "Telegram Mini App · Узбекистан",
  "Avtotestdan birinchi urinishda oʻting": "Сдайте автотест с первой попытки",
  "Telegramda ochish": "Открыть в Telegram",
  "Brauzerda sinash": "Попробовать в браузере",
  "Bugungi natija": "Результат дня",
  "Qanday ishlaydi": "Как это работает",
  "Oʻrganish rejimlari": "Режимы обучения",
  "Bugundan boshlang": "Начните сегодня",
  "Botni ochish 10 soniya — birinchi test bepul.":
    "Открыть бота — 10 секунд, первый тест бесплатно.",
  "Botni oching": "Откройте бота",
  "— roʻyxatdan oʻtish shart emas, Telegram akkaunt yetarli.":
    "t.me/NazariyBot — регистрация не нужна, достаточно аккаунта Telegram.",
  "Kuniga 10 daqiqa: 20 savol, kunlik vazifa va streak.":
    "10 минут в день: 20 вопросов, ежедневное задание и серия.",
  "Imtihonni topshiring": "Сдайте экзамен",
  "Imtihonga tayyorlanishni tezlashtiring": "Ускорьте подготовку к экзамену",
  "Kunlik test yeching": "Проходите ежедневный тест",
  "savol bazasi": "вопросов в базе",
  "mavzu": "тем",
  "yoʻl belgisi": "дорожных знаков",
  "savol / daqiqa": "вопросов / минут",
  "UI asosi: Game Management App UI Kit (CC BY 4.0)":
    "Основа UI: Game Management App UI Kit (CC BY 4.0)",

  /* ── Oy nomlari ───────────────────────────────────────────────────── */
  "yanvar": "января", "fevral": "февраля", "mart": "марта",
  "aprel": "апреля", "may": "мая", "iyun": "июня",
  "iyul": "июля", "avgust": "августа", "sentabr": "сентября",
  "oktabr": "октября", "noyabr": "ноября", "dekabr": "декабря",

  /* ─────────────────────────────────────────────────────────────────────
     DEMO SAVOLLARI — VAQTINCHA.

     Savollar bazasi hozir kodda (QUESTIONS massivi). U serverga
     koʻchgach (REJA.md Faza 2), tarjima ham `question_translations`
     jadvaliga oʻtadi va bu boʻlim OʻCHIRILADI. Shu yerda turishining
     yagona sababi — rus tilini tanlagan odam savollarni ham rus tilida
     koʻrishi kerak, aks holda "Русский" yarim yolgʻon boʻlardi.
     ───────────────────────────────────────────────────────────────── */

  /* Javob variantlaridagi oʻlchov birliklari (demo savollar bilan birga
     DB'ga koʻchadi) */
  "3 m": "3 м", "5 m": "5 м", "10 m": "10 м", "15 m": "15 м",
  "30 m": "30 м", "50 m": "50 м", "100 m": "100 м",
  "60 km/soat": "60 км/ч", "70 km/soat": "70 км/ч",
  "80 km/soat": "80 км/ч", "90 km/soat": "90 км/ч",
  "100 km/soat": "100 км/ч", "110 km/soat": "110 км/ч", "130 km/soat": "130 км/ч",

  "«Yoʻl harakati xavfsizligi» nuqtai nazaridan haydovchi harakatni boshlashdan oldin nima qilishi shart?":
    "Что обязан сделать водитель перед началом движения с точки зрения безопасности дорожного движения?",
  "Faqat ovoz signalini berish": "Только подать звуковой сигнал",
  "Manyovr niyatini yoʻnalish koʻrsatkichi bilan bildirish va boshqa harakat qatnashchilariga xalaqit bermaslik":
    "Подать сигнал указателем поворота о намерении совершить манёвр и не создавать помех другим участникам движения",
  "Faqat orqa koʻrinish koʻzgusiga qarash": "Только посмотреть в зеркало заднего вида",
  "Hech qanday cheklov yoʻq": "Никаких ограничений нет",
  "YHQ 8-bandi: manyovr boshlashdan oldin yoʻnalish koʻrsatkichi bilan signal berilishi va manyovr xavfsiz boʻlishi shart.":
    "Пункт 8 ПДД: перед началом манёвра необходимо подать сигнал указателем поворота, и манёвр должен быть безопасным.",

  "Rasmda koʻrsatilgan belgi nimani anglatadi?": "Что обозначает знак, показанный на рисунке?",
  "Yoʻl berish": "Уступите дорогу",
  "Bosh yoʻl": "Главная дорога",
  "Toʻxtamasdan harakatlanish taqiqlanadi": "Движение без остановки запрещено",
  "Tor yoʻldan oʻtish": "Проезд по узкой дороге",
  "«Bosh yoʻl» (2.1) — belgi qoʻyilgan yoʻl tartibga solinmagan chorrahalarda imtiyozli yoʻl hisoblanadi.":
    "«Главная дорога» (2.1) — дорога со этим знаком считается приоритетной на нерегулируемых перекрёстках.",

  "Aholi punktlarida yengil avtomobil uchun ruxsat etilgan eng katta tezlik qancha?":
    "Какая максимальная разрешённая скорость для легкового автомобиля в населённых пунктах?",
  "Aholi punktlarida umumiy chegara — 70 km/soat emas, 60 km/soat (agar belgi bilan boshqacha koʻrsatilmagan boʻlsa).":
    "Общее ограничение в населённых пунктах — не 70 км/ч, а 60 км/ч (если знаком не установлено иное).",

  "Bu belgi qoʻyilgan yoʻl uchastkasiga qaysi transport kirishi mumkin?":
    "Какому транспорту разрешён въезд на участок дороги с этим знаком?",
  "Yoʻnalishli transport vositalari": "Маршрутным транспортным средствам",
  "Barcha transport vositalari": "Всем транспортным средствам",
  "Faqat yengil avtomobillar": "Только легковым автомобилям",
  "Hech qaysi transport vositasi": "Никакому транспортному средству",
  "«Kirish taqiqlangan» (3.1) belgisi yoʻnalishli transport vositalariga taalluqli emas.":
    "Знак «Въезд запрещён» (3.1) не распространяется на маршрутные транспортные средства.",

  "Tartibga solinmagan teng ahamiyatli chorrahada haydovchi kimga yoʻl berishi shart?":
    "Кому обязан уступить дорогу водитель на нерегулируемом равнозначном перекрёстке?",
  "Chapdan yaqinlashayotgan transportga": "Транспорту, приближающемуся слева",
  "Oʻngdan yaqinlashayotgan transportga": "Транспорту, приближающемуся справа",
  "Tezligi kattaroq transportga": "Транспорту с большей скоростью",
  "Yuk avtomobiliga": "Грузовому автомобилю",
  "Teng ahamiyatli chorrahada «oʻngdan halaqit» qoidasi ishlaydi — oʻngdan kelayotganga yoʻl beriladi.":
    "На равнозначном перекрёстке действует правило «помеха справа» — уступают тому, кто приближается справа.",

  "Svetoforning sariq miltillovchi signali nimani bildiradi?":
    "Что означает жёлтый мигающий сигнал светофора?",
  "Harakat taqiqlangan": "Движение запрещено",
  "Chorraha tartibga solinmagan, ehtiyot boʻlib oʻtish mumkin":
    "Перекрёсток нерегулируемый, проезд разрешён с осторожностью",
  "Toʻxtash majburiy": "Остановка обязательна",
  "Faqat oʻngga burilish mumkin": "Разрешён только поворот направо",
  "Sariq miltillovchi signal chorrahaning tartibga solinmaganini bildiradi; oʻtishda belgilar va yoʻl berish qoidalariga amal qilinadi.":
    "Жёлтый мигающий сигнал означает, что перекрёсток нерегулируемый; при проезде руководствуются знаками и правилами приоритета.",

  "Uchburchak shaklidagi qizil hoshiyali belgilar qaysi guruhga kiradi?":
    "К какой группе относятся знаки треугольной формы с красной каймой?",
  "Taqiqlovchi": "Запрещающие",
  "Buyuruvchi": "Предписывающие",
  "Ogohlantiruvchi": "Предупреждающие",
  "Axborot-ishorat": "Информационно-указательные",
  "Qizil hoshiyali teng yonli uchburchak — ogohlantiruvchi belgilar guruhi (1-guruh).":
    "Равнобедренный треугольник с красной каймой — группа предупреждающих знаков (1-я группа).",

  "Quvib oʻtish qaysi holatda taqiqlanadi?": "В каком случае обгон запрещён?",
  "Yoʻl kengligi 7 metrdan ortiq boʻlsa": "Если ширина дороги более 7 метров",
  "Tartibga solinmagan piyodalar oʻtish joyida": "На нерегулируемом пешеходном переходе",
  "Aholi punkti tashqarisida": "Вне населённого пункта",
  "Ikki qatorli yoʻlda": "На дороге с двумя полосами",
  "Piyodalar oʻtish joylarida quvib oʻtish taqiqlanadi — piyoda koʻrinmay qolishi xavfi bor.":
    "На пешеходных переходах обгон запрещён — есть риск не увидеть пешехода.",

  "Temir yoʻl kesishmasidan qancha masofada toʻxtash taqiqlanadi?":
    "На каком расстоянии от железнодорожного переезда запрещена остановка?",
  "Temir yoʻl kesishmalarida va ularga 50 metrdan yaqin masofada toʻxtash taqiqlanadi.":
    "Остановка запрещена на железнодорожных переездах и ближе 50 метров от них.",

  "Arterial qon ketishida birinchi navbatda nima qilinadi?":
    "Что делают в первую очередь при артериальном кровотечении?",
  "Jarohatga sovuq qoʻyiladi": "К ране прикладывают холод",
  "Jarohat ustidan bogʻlov qoʻyiladi": "На рану накладывают повязку",
  "Jarohatdan yuqoriga qon toʻxtatuvchi jgut qoʻyiladi":
    "Выше раны накладывают кровоостанавливающий жгут",
  "Jabrlanuvchiga suv beriladi": "Пострадавшему дают воду",
  "Arterial qon ketishida jgut jarohatdan yuqoriga qoʻyiladi va qoʻyilgan vaqti yozib qoldiriladi.":
    "При артериальном кровотечении жгут накладывают выше раны и записывают время наложения.",
};
