/* ─────────────────────────────────────────────────────────────────────────
   RUS TILI LUGʻATI

   Kalit — MANBA satrning oʻzi (oʻzbek lotin, dizayn faylida yozilgani).
   Shuning uchun yangi matn qoʻshilganda kalit oʻylab topish kerak emas:
   matnni shu yerga koʻchirib, tarjimasini yozish yetarli.

   Tarjimasi yoʻq satr oʻzbekcha qoladi — ilova buzilmaydi, shunchaki
   oʻsha joy tarjimasiz koʻrinadi.

   Oʻzbek lotin ↔ kirill uchun lugʻat KERAK EMAS — u avtomatik oʻgiriladi
   (i18n.js dagi transliterate).

   SAVOLLAR VA OʻYINLAR BU YERDA EMAS: ularning matni generator va
   oʻyinning oʻzida {uz, ru} koʻrinishida keladi (src/iq/CONTRACT.md),
   ilova joriy tildagisini tanlaydi.

   QOLIPLAR: "{0} ta savol" kabi satrlarda {0} — raqam oʻrni. Rus
   tilida soʻz tartibi boshqacha boʻlishi mumkin, shuning uchun qolip
   butunligicha tarjima qilinadi ("Вопросов: {0}"). Rus tilida koʻplik
   shakli songa bogʻliq (1 вопрос / 5 вопросов) — shuning uchun son
   koʻpincha ikki nuqtadan keyin qoʻyiladi: bu har qanday son bilan
   toʻgʻri oʻqiladi.

   TAQIQLANGAN (CONTRACT §6, Play siyosati) tarjimada ham: "официальный",
   "сертифицированный", Mensa, перцентиль, "повышает IQ" vaʼdasi.

   TARTIB: boʻlimlar ekran boʻyicha. Yangi satrni tegishli boʻlimga
   qoʻying, oxiriga emas — shunda nima qayerdaligini topish oson.

   QAMROV: faqat FOYDALANUVCHI ilovasi va landing. Admin panel oʻzbek
   tilida qoladi — u ichki ish quroli.
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
  "kun": "дн.",
  "Yangi": "Новое",

  /* ── Qoliplar ({0} — son) ─────────────────────────────────────────── */
  "{0} kun": "{0} дн.",
  "+{0} ball": "+{0} баллов",
  "{0} ta savol": "Вопросов: {0}",
  "{0}-daraja": "Уровень {0}",
  "{0}% · {1} ta javob": "{0}% · ответов: {1}",
  "Oraliq {0}–{1}": "Диапазон {0}–{1}",
  "Ketma-ket faol kunlar: {0}": "Активных дней подряд: {0}",

  /* ── Liga ─────────────────────────────────────────────────────────── */
  "{0} liga": "Лига «{0}»",
  "{0} ligagacha {1} ball": "До лиги «{0}»: {1} баллов",
  "Eng yuqori liga": "Высшая лига",
  "Boshlovchi": "Новичок",
  "Bronza": "Бронза",
  "Kumush": "Серебро",
  "Oltin": "Золото",
  "Platina": "Платина",
  "Olmos": "Алмаз",
  "Bu hafta": "Эта неделя",
  "Eng yaxshi IQ": "Лучший IQ",
  "Jami ball": "Всего баллов",

  /* ── Bosh ekran ───────────────────────────────────────────────────── */
  "IQ test": "IQ-тест",
  "{0} savol · moslashuvchan": "{0} вопросов · адаптивный",
  "{0}/{1} · davom ettiring": "{0}/{1} · продолжите",
  "Boshlash": "Начать",
  "Davom ettirish": "Продолжить",
  "Yangidan": "Заново",
  "Oxirgi IQ": "Последний IQ",
  "Bugungi mashq": "Тренировка дня",
  "IQ oʻyinlari": "IQ-игры",
  "{0} ta oʻyin": "Игр: {0}",

  /* ── Mashq ────────────────────────────────────────────────────────── */
  "Xatolarim": "Мои ошибки",
  "Saqlangan": "Сохранённые",
  "Diqqat": "Внимание",
  "Xotira": "Память",
  "Tezlik": "Скорость",
  "Mantiq": "Логика",
  "Fazoviy": "Пространство",

  /* ── Savol ekrani ─────────────────────────────────────────────────── */
  "Testni toʻxtatish": "Приостановить тест",
  "Mashqdan chiqish": "Выйти из тренировки",
  "Savolni saqlash": "Сохранить вопрос",
  "Saqlanganlardan olib tashlash": "Убрать из сохранённых",
  "Savol rasmi": "Изображение к вопросу",
  "Variant": "Вариант",
  "Toʻgʻri": "Верно",
  "Notoʻgʻri · javob {0}": "Неверно · ответ {0}",
  "Izoh": "Объяснение",
  "Javobni tanlang": "Выберите ответ",
  "Keyingi": "Далее",
  "Yakunlash": "Завершить",
  "Natija": "Результат",

  /* ── Natija ekrani ────────────────────────────────────────────────── */
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

  /* ── Profil va sozlamalar ─────────────────────────────────────────── */
  "Testlar": "Тесты",
  "Yechilgan savollar": "Решено вопросов",
  "Eng uzun streak": "Лучшая серия",
  "Testlar tarixi": "История тестов",
  "Hali test topshirilmagan": "Тестов ещё нет",
  "Savol turlari": "Типы вопросов",
  "Til": "Язык",
  "Qurilma": "Как в системе",
  "Yorugʻ": "Светлая",
  "Tungi": "Тёмная",
  "Ovoz": "Звук",
  "Yoniq": "Вкл.",
  "Oʻchiq": "Выкл.",
  "Bildirishnoma": "Уведомления",
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

  /* ── Qurilma xabarlari (bootstrap.js, notify.js) ──────────────────── */
  "Chiqish uchun yana bir marta bosing": "Нажмите ещё раз, чтобы выйти",
  "Bildirishnomaga ruxsat berilmagan — tizim sozlamalaridan yoqing":
    "Нет разрешения на уведомления — включите его в настройках системы",
  "Bugungi mashq sizni kutmoqda: 10 ta savol yoki bitta aql oʻyini.":
    "Тренировка дня ждёт: 10 вопросов или одна игра.",

  /* ── Landing (sayt) ───────────────────────────────────────────────── */
  "IQ test · aql oʻyinlari · liga": "IQ-тест · игры для ума · лига",
  "Mantiqiy fikrlashingizni sinang va mashq qiling": "Проверьте и потренируйте логическое мышление",
  "{0} savollik moslashuvchan IQ test, mashq va aql oʻyinlari.":
    "Адаптивный IQ-тест из {0} вопросов, тренировка и игры для ума.",
  "Telegramda ochish": "Открыть в Telegram",
  "Brauzerda ochish": "Открыть в браузере",
  "savollik test": "вопросов в тесте",
  "savol turi": "типа вопросов",
  "aql oʻyini": "игр для ума",
  "liga darajasi": "уровней лиги",
  "Qanday ishlaydi": "Как это работает",
  "Testni boshlang": "Начните тест",
  "Qiyinlik javoblaringizga moslashadi.": "Сложность подстраивается под ваши ответы.",
  "Natijani koʻring": "Смотрите результат",
  "IQ balli va savol turlari boʻyicha tahlil.": "Балл IQ и разбор по типам вопросов.",
  "Mashq qiling": "Тренируйтесь",
  "Har kuni mashq — ligada yuqoriga.": "Тренировка каждый день — выше в лиге.",
  "Ilovada nima bor": "Что есть в приложении",
  "{0} ta moslashuvchan savol.": "{0} адаптивных вопросов.",
  "Har bir savol turi alohida, izoh bilan.": "Каждый тип вопросов отдельно, с объяснением.",
  "Xotira, diqqat va tezlik.": "Память, внимание и скорость.",
  "Liga": "Лига",
  "Haftalik ballar — Bronzadan Olmosgacha.": "Баллы за неделю — от Бронзы до Алмаза.",
  "Xato qilingan savollar takrori.": "Повтор вопросов с ошибками.",
  "Internetsiz": "Без интернета",
  "Hammasi telefonda ishlaydi.": "Всё работает на телефоне.",
  "Bugundan boshlang": "Начните сегодня",
  "Roʻyxatdan oʻtish shart emas.": "Регистрация не нужна.",
  "UI asosi: Game Management App UI Kit (CC BY 4.0)": "Основа интерфейса: Game Management App UI Kit (CC BY 4.0)",
};
