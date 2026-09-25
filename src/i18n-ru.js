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
     Kunlik vazifalar → Задания дня      · Doʻkon → Магазин · Nishonlar → Значки
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
  "kun": "дн.",
  "Yangi": "Новое",
  "Bugun": "Сегодня",

  /* ── Qoliplar ({0} — son) ─────────────────────────────────────────── */
  "{0} kun": { one: "{0} день", few: "{0} дня", many: "{0} дней" },
  "+{0} ball": { one: "+{0} балл", few: "+{0} балла", many: "+{0} баллов" },
  "{0} ball": { one: "{0} балл", few: "{0} балла", many: "{0} баллов" },
  "◆ +{0} ball": { one: "◆ +{0} балл", few: "◆ +{0} балла", many: "◆ +{0} баллов" },
  "{0} tanga": { one: "{0} монета", few: "{0} монеты", many: "{0} монет" },
  "+{0} tanga": { one: "+{0} монета", few: "+{0} монеты", many: "+{0} монет" },
  "● +{0} tanga": { one: "● +{0} монета", few: "● +{0} монеты", many: "● +{0} монет" },
  "{0} ta savol": { one: "{0} вопрос", few: "{0} вопроса", many: "{0} вопросов" },
  "{0}-daraja": "Уровень {0}",
  "{0}% · {1} ta javob": "{0}% · ответов: {1}",
  "Oraliq {0}–{1}": "Диапазон {0}–{1}",
  "Oraliq {0}+": "Диапазон {0}+",
  "Oraliq ≤{0}": "Диапазон ≤{0}",
  "Ketma-ket faol kunlar: {0}": "Активных дней подряд: {0}",
  "Ketma-ketlik: {0} kun": { one: "Серия: {0} день", few: "Серия: {0} дня", many: "Серия: {0} дней" },

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
  "Oʻtgan hafta": "Прошлая неделя",
  "Eng yaxshi hafta": "Лучшая неделя",
  "Oxirgi haftalar": "Последние недели",
  "Eng yaxshi IQ": "Лучший IQ",
  "Jami ball": "Всего баллов",
  "{0} liga!": "Лига «{0}»!",
  "Mukofot: {0}": "Награда: {0}",

  /* ── Bosh ekran ───────────────────────────────────────────────────── */
  "IQ test": "IQ-тест",
  "{0} savol · moslashuvchan": {
    one: "{0} вопрос · адаптивный", few: "{0} вопроса · адаптивный", many: "{0} вопросов · адаптивный",
  },
  "{0}/{1} · davom ettiring": "{0}/{1} · продолжите",
  "Boshlash": "Начать",
  "Davom ettirish": "Продолжить",
  "Yangidan": "Заново",
  "Oxirgi IQ": "Последний IQ",
  "Oxirgi natija: IQ {0}": "Последний результат: IQ {0}",
  "Bugungi mashq": "Тренировка дня",
  "IQ oʻyinlari": "IQ-игры",
  "{0} ta oʻyin": { one: "{0} игра", few: "{0} игры", many: "{0} игр" },
  "Kunlik vazifalar": "Задания дня",
  "Aql oʻyini": "Игра для ума",
  "Xatolarni tuzating": "Исправьте ошибки",
  "{0} mashqi": "Тренировка: {0}",
  "✓ Olindi": "✓ Получено",
  "Keyingi qadam": "Следующий шаг",

  /* ── Mashq ────────────────────────────────────────────────────────── */
  "Xatolarim": "Мои ошибки",
  "Saqlangan": "Сохранённые",
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
  "Saqlanganlardan olib tashlash": "Убрать из сохранённых",
  "Savol rasmi": "Изображение к вопросу",
  "Variant": "Вариант",
  "Toʻgʻri": "Верно",
  "Notoʻgʻri · javob {0}": "Неверно · ответ {0}",
  "Notoʻgʻri · toʻgʻri javob: {0}": "Неверно · верный ответ: {0}",
  "Izoh": "Объяснение",
  "Javobni tanlang": "Выберите ответ",
  "Yakunlash": "Завершить",
  "Natija": "Результат",

  /* ── Natija ekrani ────────────────────────────────────────────────── */
  "NATIJA": "РЕЗУЛЬТАТ",
  "TOʻGʻRI": "ВЕРНО",
  "Mashq qilish": "Тренироваться",
  "Yana mashq": "Ещё тренировка",
  "Test xatolari": "Ошибки теста",
  "Mashq xatolari": "Ошибки тренировки",

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
  "Juda tez bosildi — ball berilmadi": "Слишком быстрые нажатия — баллы не начислены",

  /* ── Profil ───────────────────────────────────────────────────────── */
  "Testlar": "Тесты",
  "Yechilgan savollar": "Решено вопросов",
  "Eng uzun ketma-ketlik": "Лучшая серия",
  "Eng uzun streak": "Лучшая серия",
  "Testlar tarixi": "История тестов",
  "Hali test topshirilmagan": "Тестов ещё нет",
  "Savol turlari": "Типы вопросов",
  "Profilni tahrirlash": "Редактировать профиль",
  "Bio qoʻshing": "Добавьте био",
  "Nishonlar": "Значки",
  "Doʻkon": "Магазин",

  /* ── Profilni tahrirlash ──────────────────────────────────────────── */
  "Rasmni oʻzgartirish": "Изменить фото",
  "Rang": "Цвет",
  "Foydalanuvchi nomi": "Имя пользователя",
  "Bio": "Био",
  "Oʻzgarishlar saqlanmadi": "Изменения не сохранены",
  "Chiqish": "Выйти",
  "Qolish": "Остаться",
  "Rasm": "Фото",
  "Galereyadan": "Из галереи",
  "Olib tashlash": "Убрать",
  "Bu rasmni ochib boʻlmadi": "Не удалось открыть это фото",
  "Rasm juda katta": "Фото слишком большое",
  "Rasm saqlanmadi": "Фото не сохранено",
  "Boshqa rasm": "Другое фото",
  "Yuqori": "Верх",
  "Markaz": "Центр",
  "Past": "Низ",
  "Chap": "Слева",
  "Oʻng": "Справа",
  "3–20 ta belgi": "3–20 символов",
  "Harf bilan boshlansin": "Начните с буквы",
  "Faqat a–z, 0–9, nuqta va _": "Только a–z, 0–9, точка и _",
  "Nuqta va _ ketma-ket boʻlmasin": "Точка и _ не должны идти подряд",
  "Bu nomni tanlab boʻlmaydi": "Это имя недоступно",
  "Nomaqbul soʻz": "Недопустимое слово",
  "Koʻpi bilan 80 ta belgi": "Не более 80 символов",
  "Havola qoʻshib boʻlmaydi": "Ссылки не допускаются",

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
  "Narxi": "Цена",
  "Balans": "Баланс",
  "Yana {0} tanga kerak": {
    one: "Нужна ещё {0} монета", few: "Нужно ещё {0} монеты", many: "Нужно ещё {0} монет",
  },
  "Sizniki!": "Теперь ваше!",
  "Qoʻllash": "Применить",
  "Kunlik vazifalar — kuniga 30 gacha": "Задания дня — до 30 в день",
  "Nishonlar — bir martalik mukofot": "Значки — разовая награда",
  "Hafta yakuni — ligaga qarab 100 gacha": "Итоги недели — до 100 по лиге",

  /* ── Sozlamalar ───────────────────────────────────────────────────── */
  "Umumiy": "Общие",
  "Til": "Язык",
  "Qurilma": "Как в системе",
  "Yorugʻ": "Светлая",
  "Tungi": "Тёмная",
  "Ovoz": "Звук",
  "Ovoz effektlari": "Звуковые эффекты",
  "Tebranish": "Вибрация",
  "Yoniq": "Вкл.",
  "Oʻchiq": "Выкл.",
  "Bildirishnoma": "Уведомления",
  "Bildirishnomalar": "Уведомления",
  "Kunlik eslatma": "Ежедневное напоминание",
  "Har kuni {0}": "Каждый день в {0}",
  "Tizim sozlamalarida ruxsat bering": "Разрешите в настройках системы",
  "Ketma-ketlik eslatmasi": "Напоминание о серии",
  "Streak eslatmasi": "Напоминание о серии",
  "Faol boʻlmagan kuni {0}": "В неактивный день в {0}",
  "Yordam": "Помощь",
  "Qanday ishlaydi": "Как это работает",
  "Aloqa": "Контакты",
  "Ilovani baholash": "Оценить приложение",
  "Huquqiy": "Правовая информация",
  "Maʼlumotlar": "Данные",
  "Foydalanish shartlari": "Условия использования",
  "Maxfiylik siyosati": "Политика конфиденциальности",
  "Maʼlumotlarni oʻchirish": "Удалить данные",

  /* ── Tasdiq oynalari ──────────────────────────────────────────────── */
  "Testni toʻxtatish?": "Приостановить тест?",
  "Javoblar saqlanadi — keyin davom ettirasiz.": "Ответы сохранятся — продолжите позже.",
  "Toʻxtatish": "Приостановить",
  "Yangi test?": "Новый тест?",
  "Tugallanmagan test oʻchiriladi.": "Незавершённый тест будет удалён.",
  "Maʼlumotlarni oʻchirish?": "Удалить данные?",
  "Natijalar, ballar va roʻyxatlar oʻchiriladi.": "Результаты, баллы и списки будут удалены.",
  "Natijalar, ballar, tangalar, nishonlar va profil oʻchiriladi.":
    "Результаты, баллы, монеты, значки и профиль будут удалены.",
  "Oʻchirish": "Удалить",
  "Maʼlumotlar oʻchirildi": "Данные удалены",
  "Testni tiklab boʻlmadi": "Не удалось восстановить тест",
  "Yangi test boshlang.": "Начните новый тест.",
  "Xatolar yoʻq": "Ошибок нет",
  "Xato qilgan savollaringiz shu yerda toʻplanadi.": "Здесь соберутся вопросы, в которых вы ошиблись.",
  "Saqlangan savol yoʻq": "Нет сохранённых вопросов",
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

  /* ── Qurilma xabarlari (bootstrap.js, notify.js) ──────────────────── */
  "Chiqish uchun yana bir marta bosing": "Нажмите ещё раз, чтобы выйти",
  "Bildirishnomaga ruxsat berilmagan — tizim sozlamalaridan yoqing":
    "Нет разрешения на уведомления — включите его в настройках системы",
  "Bugungi mashq sizni kutmoqda: 10 ta savol yoki bitta aql oʻyini.":
    "Тренировка дня ждёт: 10 вопросов или одна игра.",
  "Bugungi vazifalar tayyor: 10 ta savol va bitta aql oʻyini.":
    "Задания дня готовы: 10 вопросов и одна игра для ума.",
  // Koʻplik: «серию из 1 дня / из 2 дней / из 5 дней».
  "{0} kunlik seriyani saqlab qoling — bugun bitta savol yetarli.": {
    one: "Сохраните серию из {0} дня — сегодня хватит одного вопроса.",
    few: "Сохраните серию из {0} дней — сегодня хватит одного вопроса.",
    many: "Сохраните серию из {0} дней — сегодня хватит одного вопроса.",
  },
  "IQ test · aql oʻyinlari · liga": "IQ-тест · игры для ума · лига",
  "IQ test · oʻyinlar · liga": "IQ-тест · игры · лига",
  "Mantiqiy fikrlashingizni sinang va mashq qiling": "Проверьте и потренируйте логическое мышление",
  // «из 30 вопросов», «из 21 вопроса» — qaratqich kelishigi.
  "{0} savollik moslashuvchan IQ test, mashq va aql oʻyinlari.": {
    one: "Адаптивный IQ-тест из {0} вопроса, тренировка и игры для ума.",
    few: "Адаптивный IQ-тест из {0} вопросов, тренировка и игры для ума.",
    many: "Адаптивный IQ-тест из {0} вопросов, тренировка и игры для ума.",
  },
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
  "aql oʻyini": { one: "игра для ума", few: "игры для ума", many: "игр для ума" },
  "IQ oʻyini": { one: "IQ-игра", few: "IQ-игры", many: "IQ-игр" },
  "liga darajasi": { one: "уровень лиги", few: "уровня лиги", many: "уровней лиги" },
  "Testni boshlang": "Начните тест",
  "Qiyinlik javoblaringizga moslashadi.": "Сложность подстраивается под ваши ответы.",
  "Natijani koʻring": "Смотрите результат",
  "IQ balli va savol turlari boʻyicha tahlil.": "Результат IQ и разбор по типам вопросов.",
  "IQ natijasi va savol turlari boʻyicha tahlil.": "Результат IQ и разбор по типам вопросов.",
  "Mashq qiling": "Тренируйтесь",
  "Har kuni mashq — ligada yuqoriga.": "Тренировка каждый день — выше в лиге.",
  "Ilovada nima bor": "Что есть в приложении",
  "{0} ta moslashuvchan savol.": {
    one: "{0} адаптивный вопрос.", few: "{0} адаптивных вопроса.", many: "{0} адаптивных вопросов.",
  },
  "Har bir savol turi alohida, izoh bilan.": "Каждый тип вопросов отдельно, с объяснением.",
  "Xotira, diqqat va tezlik.": "Память, внимание и скорость.",
  "Liga": "Лига",
  "Haftalik ballar — Bronzadan Olmosgacha.": "Баллы за неделю — от Бронзы до Алмаза.",
  "Haftalik ballar — Boshlovchidan Olmosgacha.": "Баллы за неделю — от Новичка до Алмаза.",
  "Xato qilingan savollar takrori.": "Повтор вопросов с ошибками.",
  "Internetsiz": "Без интернета",
  "Hammasi telefonda ishlaydi.": "Всё работает на телефоне.",
  "Bugundan boshlang": "Начните сегодня",
  "Roʻyxatdan oʻtish shart emas.": "Регистрация не нужна.",
  "Interfeys asosi:": "Основа интерфейса:",
  "UI asosi: Game Management App UI Kit (CC BY 4.0)": "Основа интерфейса: Game Management App UI Kit (CC BY 4.0)",
};
