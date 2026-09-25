/* ─────────────────────────────────────────────────────────────────────────
   RUS TILI LUGʻATI

   Kalit — MANBA satrning oʻzi (oʻzbek lotin, dizayn faylida yozilgani).
   Shuning uchun yangi matn qoʻshilganda kalit oʻylab topish kerak emas:
   matnni shu yerga koʻchirib, tarjimasini yozish yetarli.

   Tarjimasi yoʻq satr oʻzbekcha qoladi — ilova buzilmaydi, shunchaki
   oʻsha joy tarjimasiz koʻrinadi.

   Oʻzbek lotin ↔ kirill uchun lugʻat KERAK EMAS — u avtomatik oʻgiriladi
   (i18n.js dagi transliterate).

   QOLIPLAR: faqat raqamli — {0}, {1}. Harfli qolip ({n}) kirill rejimida
   harfma-harf o'girilib ({н}) ishlamay qoladi.

   ILOVA NOMI kalit ichida TURMAYDI: u {0} bilan qo'yiladi (nom hali
   yakuniy emas — o'zgarsa lug'at buzilmasin).

   SAVOLLAR bu yerda yo'q: generatorlar matnni o'zi uz va ru da beradi
   (src/iq/CONTRACT.md §2).

   HALOLLIK (CONTRACT.md §6) tarjimada ham: "примерный", hech qachon
   "точный", "настоящий", "официальный"; persentil yo'q.

   TARTIB: boʻlimlar ekran boʻyicha. Yangi satrni tegishli boʻlimga
   qoʻying, oxiriga emas — shunda nima qayerdaligini topish oson.

   QAMROV: faqat FOYDALANUVCHI ilovasi va landing. Admin panel o'zbek
   tilida qoladi — u ichki ish quroli.
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
  "kun": "дней",
  "Faol": "Активна",
  "daqiqa": "минут",
  "Tema": "Тема",
  "Orqaga": "Назад",
  "Ortga": "Назад",
  "Yopish": "Закрыть",

  /* ── Qoʻshib yasaladigan satrlarning matn boʻlaklari ──────────────── */
  /* Bular T() bilan alohida oʻgiriladi (raqam qoʻshilishidan oldin) */
  "ta savol · qayta yechish": "вопроса · пройти снова",
  "Rekord:": "Рекорд:",
  "tur": "вида",
  "javob": "ответов",
  "Daraja": "Уровень",
  "daraja": "уровень",
  "qoldi": "осталось",
  "savol · aralash": "вопросов · вперемешку",
  "Variant": "Вариант",
  "Topshiriq rasmi": "Изображение к заданию",
  "hali boshlanmagan": "ещё не начато",
  "Oyiga": "В месяц",
  "soʻm": "сум",
  "tejaysiz": "экономия",
  "1 oy Pro": "1 месяц Pro",
  "Notoʻgʻri · toʻgʻri javob —": "Неверно · правильный ответ —",
  "gacha faol": "активен до",
  "gacha amal qiladi.": "действует до.",
  "toʻlash": "оплатить",
  "kerak": "нужно",
  "yana": "ещё",
  "Tasdiqlash uchun": "Для подтверждения",
  "sarflash": "списать",

  /* ── Natija matni (HALOLLIK: doim "taxminiy" va oraliq) ───────────── */
  "Taxminiy IQ": "Примерный IQ",
  "Taxminiy IQ: {0} ({1})": "Примерный IQ: {0} ({1})",
  /* Oraliq shkaladan chiqsa: "145+" o'zgarmaydi, past chegara so'z bilan. */
  "55 dan past": "ниже 55",
  "{0}/{1} toʻgʻri javob": "{0}/{1} верных ответов",
  "Bu klinik IQ testi emas. Savollar hali katta guruhda meʼyorlanmagan, shuning uchun natija taxminiy va faqat oʻzingizni kuzatish uchun.":
    "Это не клинический IQ-тест. Вопросы ещё не нормированы на большой группе, поэтому результат примерный и нужен только для самонаблюдения.",

  /* ── Bosh ekran ───────────────────────────────────────────────────── */
  "Kunlik vazifa": "Ежедневное задание",
  "Bugun 20 savol yech": "Решите 20 вопросов сегодня",
  "Rejimlar": "Режимы",
  "Yechilgan savollar": "Решено вопросов",
  "Soʻnggi natija": "Последний результат",
  "Hali topshirilmagan": "Ещё не пройден",
  "tarix — profilda": "история — в профиле",
  "taxminiy ball oraliq bilan": "примерный балл с интервалом",
  "Tugallanmagan IQ testi": "Незавершённый IQ-тест",
  "{0}-savoldan davom etasiz": "Продолжите с {0}-го вопроса",
  "Tashlash": "Сбросить",
  "Davom ettirish": "Продолжить",

  /* ── Rejimlar ─────────────────────────────────────────────────────── */
  "IQ testi": "IQ-тест",
  "Mashq": "Тренировка",
  "Kunlik mashq": "Ежедневная тренировка",
  "Xatolarim": "Мои ошибки",
  "Marafon": "Марафон",
  "Saqlangan": "Сохранённые",
  "Turni tanlang. Daraja soʻnggi natijalaringizdan olinadi va javoblaringizga qarab moslashadi. Har javobdan keyin qoida tushuntiriladi.":
    "Выберите вид заданий. Уровень берётся из последних результатов и подстраивается под ваши ответы. После каждого ответа объясняется правило.",
  "Savol turlari hali yuklanmadi. Ilovani qayta oching.":
    "Виды заданий ещё не загрузились. Откройте приложение заново.",

  /* ── Savol turlari ────────────────────────────────────────────────── */
  "Matritsalar": "Матрицы",
  "Son qatorlari": "Числовые ряды",
  "Fazoviy tafakkur": "Пространственное мышление",
  "Soʻz mantiqi": "Словесная логика",
  "3×3 jadvaldagi shakllar qonuniyatini toping": "Найдите закономерность фигур в таблице 3×3",
  "Qatordagi keyingi sonni qoidadan toping": "Найдите следующее число ряда по правилу",
  "Shaklni aylantiring, koʻzguda va bukilgan holda koʻring": "Поверните фигуру, отразите её в зеркале, представьте сложенной",
  "Analogiya, ortiqchasini topish, tushunchalar aloqasi": "Аналогии, лишнее слово, связи между понятиями",

  /* ── Bo'sh holatlar ───────────────────────────────────────────────── */
  "Hali xatoingiz yoʻq": "Ошибок пока нет",
  "Saqlangan savol yoʻq": "Нет сохранённых вопросов",
  "Savollar hali tayyor emas": "Вопросы ещё не готовы",
  "Savol generatorlari yuklanmadi. Ilovani qayta oching — muammo takrorlansa, bizga yozing.":
    "Генераторы вопросов не загрузились. Откройте приложение заново — если проблема повторится, напишите нам.",
  "Test yoki mashq paytida savol tepasidagi xatchoʻp tugmasini bosing — qiyin savollar shu yerda jamlanadi va istagan vaqtda qayta yechasiz.":
    "Во время теста или тренировки нажмите закладку над вопросом — сложные вопросы соберутся здесь, и вы сможете решить их снова.",
  "Bu yerda xato qilgan savollaringiz toʻplanadi. Avval mashq qiling yoki test topshiring — keyin shu yerdan qaytadan ishlaysiz.":
    "Здесь собираются вопросы, в которых вы ошиблись. Сначала потренируйтесь или пройдите тест — потом возвращайтесь сюда.",
  "Hozircha boʻsh — testda xatchoʻp bilan saqlang":
    "Пока пусто — сохраняйте вопросы закладкой во время теста",

  /* ── Test ekrani ──────────────────────────────────────────────────── */
  "Testdan chiqish": "Выйти из теста",
  "Qolgan vaqt": "Оставшееся время",
  "Javobni tanlang": "Выберите ответ",
  "Keyingi savol": "Следующий вопрос",
  "Testni yakunlash": "Завершить тест",
  "Natijani koʻrish": "Посмотреть результат",
  "Toʻgʻri!": "Верно!",
  "Savolni saqlash": "Сохранить вопрос",
  "Saqlanganlardan olib tashlash": "Убрать из сохранённых",
  "Ketma-ket toʻgʻri:": "Верных подряд:",
  "Javobni tanlab, «Keyingi savol» ni bosing. Natija test oxirida koʻrsatiladi.":
    "Выберите ответ и нажмите «Следующий вопрос». Результат будет показан в конце теста.",

  /* ── Natija ekrani ────────────────────────────────────────────────── */
  "Test yakunlandi": "Тест завершён",
  "Javob berilmadi": "Нет ответов",
  "Vaqt tugadi": "Время вышло",
  "IQ bahosi chiqarilmadi": "Оценка IQ не рассчитана",
  "Mashq yakunlandi": "Тренировка завершена",
  "{0} ta ketma-ket toʻgʻri!": "{0} верных подряд!",
  "Yangi rekord!": "Новый рекорд!",
  "Oraliq oʻlchov noaniqligini koʻrsatadi: javoblaringiz shu oraliqdagi har qanday ball bilan mos keladi.":
    "Интервал показывает погрешность измерения: ваши ответы согласуются с любым баллом внутри него.",
  "Vaqt tugadi — natija javob berilgan savollardan hisoblandi. Oraliq oʻlchov noaniqligini koʻrsatadi: savol qancha koʻp boʻlsa, u shuncha tor.":
    "Время вышло — результат рассчитан по отвеченным вопросам. Интервал показывает погрешность: чем больше вопросов, тем он уже.",
  "Ishonchli baho uchun javoblar yetarli emas ({0} ta). Testni oxirigacha yeching — shunda taxminiy ball oraliq bilan chiqadi.":
    "Для надёжной оценки ответов недостаточно ({0}). Пройдите тест до конца — тогда появится примерный балл с интервалом.",
  "Bu safar ball yetarlicha aniq baholanmadi — oraliq juda keng chiqdi. Bu koʻpincha javoblar shoshilib yoki tasodifan berilganda boʻladi. Testni xotirjam qayta topshirib koʻring.":
    "В этот раз балл не удалось оценить достаточно точно — интервал вышел слишком широким. Обычно так бывает, когда ответы даны наспех или наугад. Попробуйте спокойно пройти тест ещё раз.",
  "Bu — eng yaxshi natijangiz. Yana urinib koʻring!": "Это ваш лучший результат. Попробуйте ещё!",
  "Rekordingiz — {0}. Yana urinib koʻring!": "Ваш рекорд — {0}. Попробуйте ещё!",
  "{0}/{1} toʻgʻri javob. Xatolar «Xatolarim» boʻlimiga tushdi — istalgan vaqtda qaytadan ishlang.":
    "{0}/{1} верных ответов. Ошибки попали в «Мои ошибки» — вернитесь к ним в любое время.",
  "Turlar boʻyicha": "По видам заданий",
  "IQ testlari tarixi": "История IQ-тестов",
  "Taxminiy IQ tarixi grafigi": "График истории примерного IQ",
  "Xatolarni koʻrib chiqing": "Разберите ошибки",
  "Har biriga izoh bilan — «Xatolarim» rejimida": "С объяснением к каждой — в режиме «Мои ошибки»",
  "Testni qayta topshirish": "Пройти тест снова",

  /* ── Vazifalar ────────────────────────────────────────────────────── */
  "Kunlik": "Ежедневные",
  "Bir martalik": "Разовые",
  "Ijtimoiy": "Социальные",
  "Kunlik, bir martalik va ijtimoiy vazifalar": "Ежедневные, разовые и социальные задания",
  "20 savol yech": "Решить 20 вопросов",
  "Bitta mashqni oxirigacha yech": "Пройти одну тренировку до конца",
  "Bajarildi": "Выполнено",
  "Istalgan rejimda": "В любом режиме",
  "Kunlik kirish": "Ежедневный вход",
  "Ilova ochildi": "Приложение открыто",
  "Birinchi IQ testini topshirish": "Пройти первый IQ-тест",
  "Profilni toʻldirish": "Заполнить профиль",
  "Ism va yosh guruhi": "Имя и возрастная группа",
  "Kanalga obuna boʻlish": "Подписаться на канал",
  "Telegram kanal": "Канал в Telegram",
  "Doʻst taklif qilish": "Пригласить друга",
  "Havola orqali": "По ссылке",

  /* ── Reyting va guruhlar ──────────────────────────────────────────── */
  "liga": "лига",
  /* Qolipli kalitlar: o'zbekchada "Boshlovchi liga" (nom + so'z),
     ruschada "Лига «Новичок»" (so'z + nom). */
  "{0} liga": "Лига «{0}»",
  "{0} liga · top": "Лига «{0}» · топ",
  "ligagacha": "до лиги —",
  "Eng yuqori liga": "Высшая лига",
  "top": "топ",
  "Boshlovchi": "Новичок",
  "Bronza": "Бронза",
  "Kumush": "Серебро",
  "Oltin": "Золото",
  "Platina": "Платина",
  "Olmos": "Алмаз",
  "Mehmon": "Гость",

  /* ── Profil ───────────────────────────────────────────────────────── */
  "Saqlangan savollar": "Сохранённые вопросы",
  "Yutuqlar": "Достижения",
  "Toʻgʻri javob": "Верных ответов",
  "IQ testlari": "IQ-тесты",
  "Eng uzun streak": "Самая длинная серия",
  "Eng koʻp oʻsish imkoniyati — shu turni koʻproq mashq qiling":
    "Здесь больше всего места для роста — тренируйте этот вид чаще",
  "Hali test topshirilmagan — birinchi natijangiz shu yerda koʻrinadi":
    "Тест ещё не пройден — здесь появится ваш первый результат",
  "Bir nechta savolga javob bering — turlar boʻyicha natijangiz shu yerda koʻrinadi":
    "Ответьте на несколько вопросов — здесь появятся результаты по видам заданий",
  "Sozlamalar": "Настройки",

  /* ── Yutuqlar ─────────────────────────────────────────────────────── */
  "Birinchi IQ testi": "Первый IQ-тест",
  "7 kunlik seriya": "Серия 7 дней",
  "500 savol yechildi": "Решено 500 вопросов",
  "Barcha turlar": "Все виды",
  "Marafon chempioni": "Чемпион марафона",

  /* ── Pro va toʻlov ────────────────────────────────────────────────── */
  "Obuna holati": "Статус подписки",
  "Obunani bekor qilish": "Отменить подписку",
  "Pro faollashtirildi": "Pro активирован",
  "Proʻni faollashtirish": "Активировать Pro",
  "Pro'ni faollashtirish": "Активировать Pro",
  "Siz Pro'dasiz": "У вас Pro",
  "Mantiqiy fikrlashni muntazam mashq qiling": "Тренируйте логическое мышление регулярно",
  "Pro qoʻshimcha mashq va batafsil tahlil beradi. IQ testi va uning natijasi har doim bepul.":
    "Pro даёт дополнительные тренировки и подробную аналитику. IQ-тест и его результат всегда бесплатны.",
  "Qoʻshimcha mashq va batafsil tahlil": "Дополнительные тренировки и подробная аналитика",
  "Qoʻshimcha mashq": "Дополнительные тренировки",
  "Har bir tur boʻyicha kengaytirilgan mashq toʻplamlari va qiyin darajalar":
    "Расширенные наборы по каждому виду заданий и сложные уровни",
  "Batafsil tahlil": "Подробная аналитика",
  "Turlar kesimida kuchli va zaif tomonlar, haftalik dinamika":
    "Сильные и слабые стороны по видам заданий, динамика по неделям",
  "Xatolar ustida ishlash": "Работа над ошибками",
  "Har bir xatoga qadam-baqadam yechim va oʻxshash topshiriqlar":
    "Пошаговое решение каждой ошибки и похожие задания",
  "Reklamasiz": "Без рекламы",
  "Hech narsa mashqdan chalgʻitmaydi": "Ничто не отвлекает от тренировки",
  "Barcha imkoniyatlar ochiq. Muddat tugagach oddiy rejimga qaytasiz — hech narsa yoʻqolmaydi.":
    "Все возможности открыты. После окончания срока вернётесь в обычный режим — ничего не потеряется.",
  "Obuna avtomatik yangilanadi, istalgan vaqtda shu sahifadan bekor qilasiz. Bepul rejim ochiq qoladi: IQ testi va natijasi, mashq, kunlik vazifalar, streak va reyting.":
    "Подписка продлевается автоматически, отменить можно в любой момент на этой странице. Бесплатно остаются: IQ-тест и его результат, тренировки, ежедневные задания, серия и рейтинг.",
  "Bekor qilsangiz ham joriy davr oxirigacha Pro amal qiladi. IQ testi, mashq, streak va reyting bepul rejimda hech qachon yopilmaydi.":
    "Даже после отмены Pro действует до конца текущего периода. IQ-тест, тренировки, серия и рейтинг в бесплатном режиме не закрываются никогда.",
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
  "Har oy yangilanadi": "Обновляется каждый месяц",
  "1 oy": "1 месяц",
  "12 oy": "12 месяцев",
  "1 oyga yetadi": "Хватит на 1 месяц",
  "1 oylik Pro darhol yoqiladi. Sarflangan ball qaytarilmaydi, lekin obuna avtomatik yangilanmaydi — muddat tugagach oddiy rejimga qaytasiz.":
    "Pro на 1 месяц включится сразу. Списанные баллы не возвращаются, но подписка не продлевается автоматически — после срока вернётесь в обычный режим.",
  "Karta maʼlumotlari bank tomonida tekshiriladi va {0} serverida saqlanmaydi. Tasdiqlash uchun telefoningizga bankdan SMS kod yuboriladi.":
    "Данные карты проверяет банк, на сервере {0} они не хранятся. Для подтверждения банк отправит SMS-код на ваш телефон.",
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
  "Mantiqiy fikrlash · oʻzbek va rus tilida": "Логическое мышление · на узбекском и русском",
  "Mantiqiy fikrlashingizni sinang va mashq qiling": "Проверьте и тренируйте логическое мышление",
  "Matritsalar, son qatorlari, fazoviy va soʻz mantiqi topshiriqlari. IQ testi taxminiy ballni oraliq bilan koʻrsatadi, mashqda esa har javobdan keyin qoida tushuntiriladi.":
    "Матрицы, числовые ряды, пространственные и словесно-логические задания. IQ-тест показывает примерный балл с интервалом, а в тренировке после каждого ответа объясняется правило.",
  "Telegramda ochish": "Открыть в Telegram",
  "Brauzerda sinash": "Попробовать в браузере",
  "Brauzerda ochish": "Открыть в браузере",
  "IQ testi natijasi": "Результат IQ-теста",
  "namuna": "пример",
  "topshiriq turi": "вида заданий",
  "savollik IQ testi": "вопросов в IQ-тесте",
  "qiyinlik darajasi": "уровней сложности",
  "Offline": "Офлайн",
  "internetsiz ishlaydi": "работает без интернета",
  "Topshiriq turlari": "Виды заданий",
  "Qanday ishlaydi": "Как это работает",
  "Saytni oching": "Откройте сайт",
  "Botni oching": "Откройте бота",
  "Mashq qiling": "Тренируйтесь",
  "IQ testini topshiring": "Пройдите IQ-тест",
  "— roʻyxatdan oʻtish shart emas, Telegram akkaunt yetarli.":
    "— регистрация не нужна, достаточно аккаунта Telegram.",
  "Roʻyxatdan oʻtish shart emas — darhol boshlaysiz.": "Регистрация не нужна — начинайте сразу.",
  "Botni ochish 10 soniya — roʻyxatdan oʻtish shart emas.": "Открыть бота — 10 секунд, регистрация не нужна.",
  "Har javobdan keyin qoida tushuntiriladi. Kuniga 10 daqiqa yetarli.":
    "После каждого ответа объясняется правило. Достаточно 10 минут в день.",
  "natija taxminiy ball va oraliq bilan.": "результат — примерный балл с интервалом.",
  "Qanday baholanadi": "Как оценивается",
  "Moslashuvchan qiyinlik": "Адаптивная сложность",
  "Har javobdan keyin keyingi savol darajasi moslashadi: toʻgʻri javobdan keyin qiyinroq, xatodan keyin osonroq.":
    "После каждого ответа уровень следующего вопроса подстраивается: после верного — сложнее, после ошибки — проще.",
  "Ball — oraliq bilan": "Балл — с интервалом",
  "Javoblar Rasch modeli bilan baholanadi va IQ testlaridagi odatiy shkalaga oʻtkaziladi. Natija doim oraliq bilan: masalan, 108 (100–116).":
    "Ответы оцениваются по модели Раша и переводятся в привычную для IQ-тестов шкалу. Результат всегда с интервалом: например, 108 (100–116).",
  "Ishonchsiz boʻlsa — raqam yoʻq": "Ненадёжно — без числа",
  "Javoblar 20 tadan kam boʻlsa yoki oraliq juda keng chiqsa, IQ bahosi umuman koʻrsatilmaydi — faqat toʻgʻri javoblar soni.":
    "Если ответов меньше 20 или интервал слишком широкий, оценка IQ не показывается вовсе — только число верных ответов.",
  "har savoldan keyin natija koʻrsatilmaydi.": "после вопросов результат не показывается.",
  "Bitta tur, darajangizga mos. Har javobdan keyin izoh.": "Один вид заданий под ваш уровень. Объяснение после каждого ответа.",
  "savol, hamma turlar aralash.": "вопросов, все виды вперемешку.",
  "Notoʻgʻri yechilgan savollar takrori.": "Повтор вопросов, в которых была ошибка.",
  "Qiyinlik oshib boradi — birinchi xatoga qadar.": "Сложность растёт — до первой ошибки.",
  "Onlayn: savollar va vaqt serverda. Ishonchli natijaga tekshirish kodli sertifikat.":
    "Онлайн: вопросы и время на сервере. За надёжный результат — сертификат с кодом проверки.",
  "Diqqat, xotira va tezlik uchun qisqa oʻyinlar.": "Короткие игры на внимание, память и скорость.",
  "Haftalik liga va reyting — faqat server tekshirgan ballar bilan.": "Лига недели и рейтинг — только с баллами, проверенными сервером.",
  "Halol natija": "Честный результат",
  "Mashq qilgan turingizda natija oshadi — bu kutilgan hol. Lekin bu umumiy aql oshdi degani emas va biz buni vaʼda qilmaymiz.":
    "В тех видах заданий, которые вы тренируете, результат растёт — это ожидаемо. Но это не значит, что вырос общий интеллект, и мы этого не обещаем.",
  "Akademik litsey, ijod maktablari va El-yurt umidi tanlovlarida mantiq boʻlimi bor — shu turdagi topshiriqlarni mashq qilishingiz mumkin. Ilova hech qaysi tashkilot bilan bogʻliq emas.":
    "В отборах в академические лицеи, творческие школы и «Эл-юрт умиди» есть раздел логики — здесь можно тренировать задания такого типа. Приложение не связано ни с одной организацией.",
  "Bugundan boshlang": "Начните сегодня",
  "UI asosi: Game Management App UI Kit (CC BY 4.0)":
    "Основа UI: Game Management App UI Kit (CC BY 4.0)",

  /* ── Sertifikatli (onlayn) test ───────────────────────────────────── */
  "Sertifikatli test": "Тест с сертификатом",
  "Onlayn · tizimga kirish kerak · {0} savol": "Онлайн · нужен вход · {0} вопросов",
  "Onlayn · server ulanganda ishlaydi": "Онлайн · заработает после подключения сервера",
  "Sertifikatli test: savollar va vaqt serverda. Javobni tanlab, «Keyingi savol» ni bosing.":
    "Тест с сертификатом: вопросы и время — на сервере. Выберите ответ и нажмите «Следующий вопрос».",
  "Yuborilmoqda…": "Отправляется…",
  "Sessiya tugagan — qayta tizimga kiring.": "Сессия истекла — войдите снова.",
  "Javob yuborilmadi — internet aloqasini tekshirib, qayta bosing.":
    "Ответ не отправлен — проверьте интернет и нажмите ещё раз.",
  "Server bilan bogʻlanilmoqda…": "Подключение к серверу…",
  "Internet kerak": "Нужен интернет",
  "Testni boshlab boʻlmadi": "Не удалось начать тест",
  "Sertifikatli test hozircha ishlamaydi": "Тест с сертификатом пока недоступен",
  "Tizimga kiring": "Войдите в аккаунт",
  "Sertifikatli test uchun hisobingizga kiring — natija va sertifikat sizning nomingizga yoziladi.":
    "Для теста с сертификатом войдите в аккаунт — результат и сертификат будут оформлены на ваше имя.",
  "Sertifikatli testning savollari serverdan keladi va natija u yerda hisoblanadi. Internetga ulanib, qayta urinib koʻring.":
    "Вопросы теста с сертификатом приходят с сервера, и результат считается там. Подключитесь к интернету и попробуйте снова.",
  "Server javob bermadi. Birozdan keyin qayta urinib koʻring.": "Сервер не ответил. Попробуйте чуть позже.",
  "Bu rejim server bilan ishlaydi: savollar serverdan keladi, natija u yerda hisoblanadi va sertifikat beriladi. Oddiy IQ testi internetsiz ham ishlaydi.":
    "Этот режим работает с сервером: вопросы приходят оттуда, результат считается там и выдаётся сертификат. Обычный IQ-тест работает и без интернета.",
  "Qayta urinish": "Повторить",
  "Savol yaratishda xato boʻldi — test shu yerda toʻxtadi.": "При создании вопроса произошла ошибка — тест остановлен здесь.",
  "Sertifikat": "Сертификат",
  "Kod: {0}. Sertifikatni shu kod bilan saytda tekshirish mumkin.": "Код: {0}. Сертификат можно проверить на сайте по этому коду.",
  "Bu natija uchun sertifikat berilmadi: sertifikat faqat ishonchli (oraliq yetarlicha tor) natijaga beriladi.":
    "Сертификат не выдан: он выдаётся только за надёжный результат (достаточно узкий интервал).",
  "Sertifikat faqat onlayn — sertifikatli testda beriladi: u yerda savollar va vaqt serverda, natija u yerda hisoblanadi. Bu test shaxsiy kuzatuv uchun.":
    "Сертификат выдаётся только в онлайн-тесте с сертификатом: там вопросы и время на сервере, результат считается там. Этот тест — для самонаблюдения.",
  "Sertifikatli testni boshlash": "Начать тест с сертификатом",
  "Sertifikat — IQuest testi natijasi: taxminiy ball va oraliq. Klinik yoki rasmiy IQ hujjati emas.":
    "Сертификат — результат теста IQuest: примерный балл и интервал. Это не клинический и не официальный документ об IQ.",
  "Savollarni koʻrib chiqish": "Разбор вопросов",
  "Toʻgʻri javoblar va izohlar bilan": "С правильными ответами и объяснениями",
  "Koʻrib chiqish": "Разбор",

  /* ── IQ o'yinlari ─────────────────────────────────────────────────── */
  "IQ oʻyinlari": "IQ-игры",
  "oʻyin": "игр",
  "Diqqat, xotira va tezlikni mashq qiling. Daraja natijangizga qarab oʻzgaradi. Oʻyin natijasi IQ bahosi emas.":
    "Тренируйте внимание, память и скорость. Уровень меняется по вашим результатам. Результат игры — не оценка IQ.",
  "Oʻyinlar hali yuklanmadi. Ilovani qayta oching.": "Игры ещё не загрузились. Откройте приложение заново.",
  "Diqqat": "Внимание",
  "Xotira": "Память",
  "Tezlik": "Скорость",
  "Mantiq": "Логика",
  "Fazoviy": "Пространство",
  "eng yaxshi natija": "лучший результат",
  "Oʻyindan chiqish": "Выйти из игры",
  "Katak": "Клетка",
  "Oʻyinni koʻrsatib boʻlmadi. Chiqib, qayta boshlang.": "Не удалось показать игру. Выйдите и начните заново.",
  "Natija": "Результат",
  "Oʻyin tugadi": "Игра окончена",
  "Toʻgʻri": "Верно",
  "Vaqt": "Время",
  "soniya": "сек",
  "Keyingi safar: {0}-daraja": "В следующий раз: уровень {0}",
  "Keyingi safar osonroq: {0}-daraja": "В следующий раз проще: уровень {0}",
  "Daraja oʻzgarmadi: {0}": "Уровень не изменился: {0}",
  "Oʻyin natijasi IQ bahosi emas — bu diqqat, xotira va tezlik mashqi. Natijangiz oʻsishini kuzating.":
    "Результат игры — не оценка IQ, а тренировка внимания, памяти и скорости. Следите за своим прогрессом.",
  "Yana oʻynash": "Сыграть ещё",
  "Oʻyinlar roʻyxati": "Список игр",

  /* ── Liga va reyting ──────────────────────────────────────────────── */
  "Liga": "Лига",
  "Liga va reyting": "Лига и рейтинг",
  "Liga — haftalik faollik ballari boʻyicha: test, mashq va oʻyinlar. Ligaga faqat server tekshirgan ballar kiradi.":
    "Лига — по баллам активности за неделю: тесты, тренировки и игры. В лигу идут только баллы, проверенные сервером.",
  "Sizning ballaringiz · shu qurilmada": "Ваши баллы · на этом устройстве",
  "Reyting — eng yaxshi tekshirilgan IQ testi natijasi (doim oraliq bilan) va umumiy ball boʻyicha. Natija serverda qayta hisoblangandan keyingina kiradi.":
    "Рейтинг — по лучшему проверенному результату IQ-теста (всегда с интервалом) и общему баллу. Результат попадает туда только после пересчёта на сервере.",
  "Eng yaxshi natijangiz · shu qurilmada, server tekshirmagan": "Ваш лучший результат · на этом устройстве, сервер не проверял",
  "Hali ishonchli natija yoʻq": "Надёжного результата пока нет",
  "Umumiy reyting": "Общий рейтинг",
  "Haftalik liga": "Лига недели",
  "Yuklanmoqda…": "Загрузка…",
  "Jadval server ulanganda koʻrinadi": "Таблица появится после подключения сервера",
  "Jadval yuklanmadi": "Таблица не загрузилась",
  "Liga va reyting serverda yuritiladi — ballar u yerda qayta tekshiriladi. Hozir server ulanmagan, shuning uchun boshqa ishtirokchilar koʻrsatilmaydi. Oʻz natijangiz yuqorida.":
    "Лига и рейтинг ведутся на сервере — баллы там перепроверяются. Сейчас сервер не подключён, поэтому других участников не показываем. Ваш собственный результат — выше.",
  "Internet aloqasini tekshiring va tizimga kiring — ishtirokchilar va oʻrningiz shu yerda chiqadi.":
    "Проверьте интернет и войдите в аккаунт — участники и ваше место появятся здесь.",
  "siz": "вы",

  /* ── Oy nomlari ───────────────────────────────────────────────────── */
  "yanvar": "января", "fevral": "февраля", "mart": "марта",
  "aprel": "апреля", "may": "мая", "iyun": "июня",
  "iyul": "июля", "avgust": "августа", "sentabr": "сентября",
  "oktabr": "октября", "noyabr": "ноября", "dekabr": "декабря",
};
