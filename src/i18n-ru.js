/* ─────────────────────────────────────────────────────────────────────────
   RUS TILI LUGʻATI (window.nzRu)

   Kalit — MANBA satrning oʻzi (oʻzbek lotin, dizayn faylida yozilgani).
   Yangi matn qoʻshilganda kalit oʻylab topish kerak emas: matnni shu
   yerga koʻchirib, tarjimasini yozish yetarli. Kalitda apostrof faqat
   ʻ (U+02BB, oʻ/gʻ) va ʼ (U+02BC, tutuq) — manba satr bilan AYNAN bir xil
   boʻlishi shart, aks holda tarjima jimgina oʻzbekcha qoladi.

   Tarjimasi yoʻq satr oʻzbekcha qoladi (ARXITEKTURA §8.3). Qamrovni
   `node tools/i18n-extract.mjs --lang=ru` koʻrsatadi.

   SAVOLLAR, OʻYINLAR, KATALOG BU YERDA EMAS: ularning matni oʻzida
   {uz, ru, en} koʻrinishida keladi (src/iq/CONTRACT.md).

   KOʻPLIK. Songa bogʻliq satr qiymati — obyekt { one, few, many }:
       1, 21, 101 → one (балл) · 2–4, 22–24 → few (балла) · 5–20, 0 → many (баллов)
   Ilova uni nzTN("+{0} ball", n) bilan chaqiradi (i18n.js). Oddiy T()
   «many» shaklini oladi. Son ikki nuqtadan keyin turadigan «Вопросов: {0}»
   shakli ham toʻgʻri (har qanday son bilan oʻqiladi).

   TERMINLAR (glossariy, CONTRACT §17):
     ball (liga)      → балл / баллы     («очки» EMAS)
     tanga            → монета / монеты
     ketma-ketlik     → серия (дней)
     IQ natijasi      → результат IQ     («балл IQ» EMAS — «ball» faqat liga)
     Mashq            → Тренировка       · Reyting → Рейтинг
     IQ oʻyinlari     → IQ-игры          · Aql oʻyini → игра для ума
     Kunlik vazifalar → Ежедневные задания      · Doʻkon → Магазин · Nishonlar → Значки
     Vitrina          → Витрина          · Oraliq → Диапазон

   TAQIQLANGAN (CONTRACT §6, Play siyosati) tarjimada ham: «официальный»,
   «сертифицированный», Mensa, перцентиль, «повышает IQ» vaʼdasi —
   tests/honesty.test.mjs tekshiradi.

   TARTIB: boʻlimlar ekran boʻyicha. Yangi satrni tegishli boʻlimga
   qoʻying, oxiriga emas. Admin panel oʻzbek tilida qoladi.
   ───────────────────────────────────────────────────────────────────── */

window.nzRu = {
  /* ── Navigatsiya va umumiy ────────────────────────────────────────── */
  "Bosh": "Главная",
  "Mashq": "Тренировка",
  "Reyting": "Рейтинг",
  "Profil": "Профиль",
  "Web sayt": "Сайт",
  "Mehmon": "Гость",
  "Tema": "Тема",
  "Sozlamalar": "Настройки",
  "Bekor qilish": "Отмена",
  "Davom etish": "Продолжить",
  "Yopish": "Закрыть",
  "Tayyor": "Готово",
  "Saqlash": "Сохранить",
  "Orqaga": "Назад",
  "Keyingi": "Далее",
  "Yangi": "Новое",
  "Bugun": "Сегодня",

  /* ── Qoliplar ({0} — son) ─────────────────────────────────────────── */
  "{0} kun": { one: "{0} день", few: "{0} дня", many: "{0} дней" },
  "+{0} ball": { one: "+{0} балл", few: "+{0} балла", many: "+{0} баллов" },
  "{0} ball": { one: "{0} балл", few: "{0} балла", many: "{0} баллов" },
  "{0} tanga": { one: "{0} монета", few: "{0} монеты", many: "{0} монет" },
  "+{0} tanga": { one: "+{0} монета", few: "+{0} монеты", many: "+{0} монет" },
  "{0} ta savol": { one: "{0} вопрос", few: "{0} вопроса", many: "{0} вопросов" },
  "{0}-daraja": "Уровень {0}",
  "{0}% · {1} ta javob": "{0}% · ответов: {1}",
  "Oraliq {0}–{1}": "Диапазон {0}–{1}",
  "Oraliq {0}+": "Диапазон {0}+",
  "Oraliq ≤{0}": "Диапазон ≤{0}",
  "Ketma-ket faol kunlar: {0}": "Активных дней подряд: {0}",

  /* ── Liga ─────────────────────────────────────────────────────────── */
  "{0} liga": "Лига «{0}»",
  // Koʻplik {1} boʻyicha: nzTN(tpl, k, [T(nom), nzI18n.num(k)])
  "{0} ligagacha {1} ball": {
    one: "До лиги «{0}» остался {1} балл",
    few: "До лиги «{0}» осталось {1} балла",
    many: "До лиги «{0}» осталось {1} баллов",
  },
  "Eng yuqori liga": "Высшая лига",
  "Boshlovchi": "Новичок",
  "Bronza": "Бронза",
  "Kumush": "Серебро",
  "Oltin": "Золото",
  "Platina": "Платина",
  "Olmos": "Алмаз",
  "Bu hafta": "Эта неделя",
  "Bu hafta: {0} ball": { one: "На этой неделе: {0} балл", few: "На этой неделе: {0} балла", many: "На этой неделе: {0} баллов" },
  "Eng yaxshi hafta": "Лучшая неделя",
  "Oxirgi haftalar": "Последние недели",
  "Eng yaxshi IQ": "Лучший IQ",
  "Jami ball": "Всего баллов",
  "{0} liga!": "Лига «{0}»!",
  "Bu hafta {0} ball": { one: "На этой неделе {0} балл", few: "На этой неделе {0} балла", many: "На этой неделе {0} баллов" },
  "Oʻtgan hafta: {0}": "Прошлая неделя: {0}",
  "Mukofot:": "Награда:",
  "Mukofot: Bronzadan boshlab": "Награда: начиная с Бронзы",
  "Hafta yakuni": "Итоги недели",
  "joriy": "текущая",
  "oʻtildi": "пройдена",

  /* ── Bosh ekran ───────────────────────────────────────────────────── */
  "IQ test": "IQ-тест",
  "{0} savol · moslashuvchan": {
    one: "{0} вопрос · адаптивный", few: "{0} вопроса · адаптивный", many: "{0} вопросов · адаптивный",
  },
  "{0}/{1} · davom ettiring": "{0}/{1} · продолжите",
  "Boshlash": "Начать",
  "Davom ettirish": "Продолжить",
  "Yangidan": "Заново",
  "Bugungi mashq": "Тренировка дня",
  "IQ oʻyinlari": "IQ-игры",
  "Kunlik vazifalar": "Ежедневные задания",
  "Aql oʻyini": "Игра для ума",
  "Xatolarni tuzating": "Исправьте ошибки",
  "{0} mashqi": "Тренировка: {0}",
  "Oxirgi natija: {0}": "Последний результат: {0}",
  "Qayta topshirish": "Пройти заново",
  "{0}/{1} savol": "Вопросы: {0}/{1}",
  "Kun oʻyini: {0}": "Игра: {0}",
  "Olindi": "Готово",
  "Tanga: {0}": "Монеты: {0}",

  /* ── Mashq ────────────────────────────────────────────────────────── */
  "Xatolarim": "Ошибки",
  "Saqlangan": "Закладки",
  "Diqqat": "Внимание",
  "Xotira": "Память",
  "Tezlik": "Скорость",
  "Mantiq": "Логика",
  "Fazoviy": "Пространство",

  /* ── Savol ekrani ─────────────────────────────────────────────────── */
  "Pauza": "Пауза",
  "Testni toʻxtatish": "Приостановить тест",
  "Mashqdan chiqish": "Выйти из тренировки",
  "Savolni saqlash": "Сохранить вопрос",
  "Saqlanganlardan olib tashlash": "Убрать из закладок",
  "Savol rasmi": "Изображение к вопросу",
  "Variant": "Вариант",
  "Toʻgʻri": "Верно",
  "Izoh": "Разбор",
  "Javobni tanlang": "Выберите ответ",
  "Yakunlash": "Завершить",
  "Natija": "Результат",
  "Notoʻgʻri": "Неверно",
  "Toʻgʻri javob: {0}": "Верный ответ: {0}",
  "Test qanday oʻtadi": "Как проходит тест",
  "Variantni tanlang va «Keyingi»ni bosing": "Выберите вариант и нажмите «Далее»",
  "Oldingi savolga qaytib boʻlmaydi": "К предыдущему вопросу вернуться нельзя",
  "Toʻxtatsangiz — keyin davom etasiz": "Можно приостановить и продолжить позже",

  /* ── Natija ekrani ────────────────────────────────────────────────── */
  "NATIJA": "РЕЗУЛЬТАТ",
  "TOʻGʻRI": "ВЕРНО",
  "Mashq qilish": "Тренироваться",
  "Yana mashq": "Ещё тренировка",

  /* ── Oʻyin ekrani ─────────────────────────────────────────────────── */
  "Oʻyindan chiqish": "Выйти из игры",
  "Qayta oʻynash": "Сыграть ещё",
  "Vaqt": "Время",
  "Keyingi daraja": "След. уровень",
  "Katak": "Клетка",
  "yongan": "подсвечена",
  "toʻgʻri": "верно",
  "xato": "ошибка",
  "yopiq": "скрыта",
  "faol emas": "неактивна",
  "Juda tez bosishlar — ball berilmadi": "Слишком быстрые нажатия — баллы не начислены",
  "Daraja": "Уровень",

  /* ── Profil ───────────────────────────────────────────────────────── */
  "Testlar": "Тесты",
  "Eng uzun ketma-ketlik": "Лучшая серия",
  "Testlar tarixi": "История тестов",
  "Hali test topshirilmagan": "Тестов ещё нет",
  "Savol turlari": "Типы вопросов",
  "Profilni tahrirlash": "Редактировать профиль",
  /* Tahrirlash ekrani sarlavhasi (standart 88 px sarlavha, bir qator). */
  "Tahrirlash": "Профиль",
  "Bio qoʻshing": "Добавьте био",
  "Nishonlar": "Значки",
  "Doʻkon": "Магазин",

  /* ── Profilni tahrirlash ──────────────────────────────────────────── */
  "Rasmni oʻzgartirish": "Изменить фото",
  "Rang": "Цвет",
  "Foydalanuvchi nomi": "Имя пользователя",
  "Bio": "Био",
  "Oʻzgarishlar saqlanmagan": "Изменения не сохранены",
  "Chiqish": "Выйти",
  "Qolish": "Остаться",
  "Rasm": "Фото",
  "Galereyadan": "Из галереи",
  "Olib tashlash": "Убрать",
  "Bu rasmni ochib boʻlmadi": "Не удалось открыть это фото",
  "Rasm saqlanmadi": "Фото не сохранено",
  "Boshqa rasm": "Другое фото",
  "Yuqori": "Верх",
  "Markaz": "Центр",
  "Past": "Низ",
  "Chap": "Слева",
  "Oʻng": "Справа",
  "Galereya": "Галерея",

  /* ── Nishonlar va Doʻkon ──────────────────────────────────────────── */
  "Vitrina": "Витрина",
  "Yutuqlar": "Достижения",
  "Kolleksiya": "Коллекция",
  "Olingan: {0}": "Получено: {0}",
  "Vitrinaga qoʻyish": "На витрину",
  "Vitrinadan olish": "Убрать с витрины",
  "Vitrina toʻla": "Витрина заполнена",
  "Sotib olish": "Купить",
  "Yangi nishon": "Новый значок",
  "Ranglar": "Цвета",
  "Sizda bor": "Есть",
  "✓ Tanlangan": "✓ Выбрано",
  "Tanga qanday olinadi": "Как получить монеты",
  "Yana {0} tanga kerak": {
    one: "Нужна ещё {0} монета", few: "Нужно ещё {0} монеты", many: "Нужно ещё {0} монет",
  },
  "Sizniki!": "Теперь ваше!",
  "Qoʻllash": "Применить",
  "Boʻsh joy": "Пустое место",
  "olinmagan": "не получен",
  "Kolleksiya nishoni": "Коллекционный значок",
  "Narxi: {0} tanga": { one: "Цена: {0} монета", few: "Цена: {0} монеты", many: "Цена: {0} монет" },
  "Balans: {0} tanga": { one: "Баланс: {0} монета", few: "Баланс: {0} монеты", many: "Баланс: {0} монет" },
  "Sotib olish · {0}": "Купить · {0}",
  "Yangi nishonlar": "Новые значки",
  "{0} ta yangi nishon": { one: "{0} новый значок", few: "{0} новых значка", many: "{0} новых значков" },
  "Koʻrish": "Посмотреть",

  /* ── Sozlamalar ───────────────────────────────────────────────────── */
  "Umumiy": "Общие",
  "Til": "Язык",
  "Qurilma": "Как в системе",
  "Yorugʻ": "Светлая",
  "Tungi": "Тёмная",
  "Ovoz": "Звук",
  "Ovoz effektlari": "Звуковые эффекты",
  "Tebranish": "Вибрация",
  "Bildirishnomalar": "Уведомления",
  "Kunlik eslatma": "Напоминание",
  "Har kuni {0}": "Каждый день в {0}",
  "Tizim sozlamalarida ruxsat bering": "Разрешите в настройках системы",
  "Ketma-ketlik eslatmasi": "Напоминание о серии",
  "Faol boʻlmagan kuni {0}": "В неактивный день в {0}",
  "Yordam": "Помощь",
  "Qanday ishlaydi": "Как это работает",
  "Aloqa": "Контакты",
  "Ilovani baholash": "Оценить приложение",
  "Huquqiy": "Правовая информация",
  "Maʼlumotlar": "Данные",
  "Foydalanish shartlari": "Условия использования",
  "Maxfiylik siyosati": "Конфиденциальность",
  "Maʼlumotlarni oʻchirish": "Удалить данные",

  /* ── Tasdiq oynalari ──────────────────────────────────────────────── */
  "Testni toʻxtatish?": "Приостановить тест?",
  "Javoblar saqlanadi — keyin davom ettirasiz.": "Ответы сохранятся — продолжите позже.",
  "Toʻxtatish": "Приостановить",
  "Yangi test?": "Новый тест?",
  "Tugallanmagan test oʻchiriladi.": "Незавершённый тест будет удалён.",
  "Maʼlumotlarni oʻchirish?": "Удалить данные?",
  "Natijalar, ballar, tangalar, nishonlar va profil oʻchiriladi.":
    "Результаты, баллы, монеты, значки и профиль будут удалены.",
  "Oʻchirish": "Удалить",
  "Maʼlumotlar oʻchirildi": "Данные удалены",
  "Testni tiklab boʻlmadi": "Не удалось восстановить тест",
  "Yangi test boshlang.": "Начните новый тест.",
  "Xatolar yoʻq": "Ошибок нет",
  "Xato qilgan savollaringiz shu yerda toʻplanadi.": "Здесь соберутся вопросы, в которых вы ошиблись.",
  "Saqlangan savol yoʻq": "В закладках пока пусто",
  "Mashqda xatchoʻp tugmasini bosing.": "В тренировке нажмите на закладку.",
  "Xatolik": "Ошибка",
  "Ilovani qayta oching.": "Откройте приложение заново.",

  /* ── Birinchi kirish ──────────────────────────────────────────────── */
  "Tilni tanlang": "Выберите язык",
  "Mashq va oʻyinlar": "Тренировка и игры",
  "Har kuni savollar va aql oʻyinlari. Daraja sizga moslashadi.":
    "Вопросы и игры для ума каждый день. Уровень подстраивается под вас.",
  "Ball va tanga": "Баллы и монеты",
  "Yangi: tanga va doʻkon": "Новое: монеты и магазин",
  "Ball — ligada koʻtarilish uchun. Tanga — profilni bezash uchun.":
    "Баллы — для роста в лиге. Монеты — для оформления профиля.",
  "Ball": "Баллы",
  "Tanga": "Монеты",
  "Profilingiz": "Ваш профиль",
  "Rasm, rang va nom tanlang.": "Выберите фото, цвет и имя.",
  "Eslatma": "Напоминание",
  "Har kuni mashq vaqtini eslatamiz.": "Будем напоминать о тренировке каждый день.",
  "Yoqish": "Включить",
  "Kerak emas": "Не нужно",
  "Keyinroq": "Позже",
  "Oʻtkazib yuborish": "Пропустить",
  "{0} ta savol. Natija — IQ va oraliq.": { one: "{0} вопрос. Результат — IQ и диапазон.", few: "{0} вопроса. Результат — IQ и диапазон.", many: "{0} вопросов. Результат — IQ и диапазон." },
  "Matritsa": "Матрица",

  /* ── Qurilma xabarlari (bootstrap.js, notify.js) ──────────────────── */
  "Chiqish uchun yana bir marta bosing": "Нажмите ещё раз, чтобы выйти",
  "Bildirishnomaga ruxsat berilmagan — tizim sozlamalaridan yoqing":
    "Нет разрешения на уведомления — включите его в настройках системы",
  "Bugungi vazifalar tayyor: 10 ta savol va bitta aql oʻyini.":
    "Задания дня готовы: 10 вопросов и одна игра для ума.",
  // Koʻplik: «серию из 1 дня / из 2 дней / из 5 дней».
  "{0} kunlik ketma-ketlikni saqlab qoling — bugun bitta savol yetarli.": {
    one: "Сохраните серию из {0} дня — сегодня хватит одного вопроса.",
    few: "Сохраните серию из {0} дней — сегодня хватит одного вопроса.",
    many: "Сохраните серию из {0} дней — сегодня хватит одного вопроса.",
  },

  /* ── Landing (sayt) ───────────────────────────────────────────────── */
  "Mantiqiy fikrlashingizni sinang va mashq qiling": "Проверьте и потренируйте логическое мышление",
  "{0} savollik moslashuvchan IQ test, mashq va IQ oʻyinlari.": {
    one: "Адаптивный IQ-тест из {0} вопроса, тренировка и IQ-игры.",
    few: "Адаптивный IQ-тест из {0} вопросов, тренировка и IQ-игры.",
    many: "Адаптивный IQ-тест из {0} вопросов, тренировка и IQ-игры.",
  },
  "Telegramda ochish": "Открыть в Telegram",
  "Brauzerda ochish": "Открыть в браузере",
  /* Katta raqam ostidagi yozuvlar — nzI18n.plural("savol turi", 4). */
  "savollik test": { one: "вопрос в тесте", few: "вопроса в тесте", many: "вопросов в тесте" },
  "savol turi": { one: "тип вопросов", few: "типа вопросов", many: "типов вопросов" },
  "IQ oʻyini": { one: "IQ-игра", few: "IQ-игры", many: "IQ-игр" },
  "Testni boshlang": "Начните тест",
  "Qiyinlik javoblaringizga moslashadi.": "Сложность подстраивается под ваши ответы.",
  "Natijani koʻring": "Смотрите результат",
  "IQ natijasi va savol turlari boʻyicha tahlil.": "Результат IQ и разбор по типам вопросов.",
  "Mashq qiling": "Тренируйтесь",
  "Har kuni mashq — natijangiz oʻsishini kuzating.": "Тренируйтесь каждый день и следите за ростом результата.",
  "Ilovada nima bor": "Что есть в приложении",
  "{0} ta moslashuvchan savol.": {
    one: "{0} адаптивный вопрос.", few: "{0} адаптивных вопроса.", many: "{0} адаптивных вопросов.",
  },
  "Har bir savol turi alohida, izoh bilan.": "Каждый тип вопросов отдельно, с объяснением.",
  "Xotira, diqqat va tezlik.": "Память, внимание и скорость.",
  "Liga": "Лига",
  "Kerakli savollarni qayta yeching.": "Решайте нужные вопросы повторно.",
  "Xato qilingan savollar takrori.": "Повтор вопросов с ошибками.",
  "Internetsiz": "Без интернета",
  "Hammasi telefonda ishlaydi.": "Всё работает на телефоне.",
  "Bugundan boshlang": "Начните сегодня",
  "Roʻyxatdan oʻtish shart emas.": "Регистрация не нужна.",
  "Interfeys asosi:": "Основа интерфейса:",
  "IQ test · mashq · IQ oʻyinlari": "IQ-тест · тренировка · IQ-игры",
  /* Paywall (faqat web, PAYWALL.md) */
  "1) Ilovangizda toʻlov qiling": "1) Оплатите в своём приложении",
  "2) Chek rasmini botga yuboring": "2) Отправьте фото чека боту",
  "Adminga yozish": "Написать админу",
  "Chekni yuborish": "Отправить чек",
  "IQuest testi natijasi": "Результат теста IQuest",
  "IQuest.uz tomonidan berilgan": "Выдан IQuest.uz",
  "Ism Familiya": "Имя Фамилия",
  "Ismingizni yozing": "Введите имя",
  "Karta raqami": "Номер карты",
  "Kod notoʻgʻri": "Неверный код",
  "Kodni kiritish": "Ввести код",
  "Natija tayyor": "Результат готов",
  "Natija va sertifikatni olish uchun {0} toʻlang": "Чтобы получить результат и сертификат, оплатите {0}",
  "Natijani ochish": "Открыть результат",
  "Nusxalandi": "Скопировано",
  "Nusxalash": "Копировать",
  "Ochish": "Открыть",
  "Ochish kodi": "Код доступа",
  "Rasm yuklanmasa — shu yerni bosing": "Если не скачалось — нажмите здесь",
  "Sana": "Дата",
  "Sertifikat": "Сертификат",
  "Sertifikat kodi": "Код сертификата",
  "Test kodi": "Код теста",
  "Toʻliq ismingiz": "Ваше полное имя",
  "Toʻlov kutilmoqda": "Ожидается оплата",
  "Yuklab olish": "Скачать",
};
