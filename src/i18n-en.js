/* ─────────────────────────────────────────────────────────────────────────
   INGLIZ TILI LUGʻATI (window.nzEn) — ARXITEKTURA §8

   Mexanizm nzRu bilan bir xil: kalit — MANBA oʻzbekcha satrning oʻzi
   (apostrof ʻ/ʼ bilan, AYNAN). Tarjima topilmasa oʻzbekcha matn chiqadi
   (§8.3), lekin chiqarilgan buildʼga u yetib bormaydi: ingliz tili faqat
   `tools/i18n-extract.mjs` boʻyicha yetishmayotgan kalit 0 ta boʻlganda
   yoqiladi (§8.4 darvoza).

   KOʻPLIK — { one, other }: nzTN("+{0} ball", 1) → "+1 point".

   USLUB: tabiiy, qisqa, premium ingliz tili (Sentence case, tugmalarda
   fe'l). Soʻzma-soʻz tarjima emas. Joy tor — matn oʻzbekchadan uzun
   boʻlmasin.

   GLOSSARIY (§8.5, CONTRACT §17 — boshqa soʻz ishlatilmaydi):
     Bosh / Mashq / Reyting / Profil → Home / Practice / League / Profile
     ball → points · tanga → coins · ketma-ketlik → streak
     Boshlovchi · Bronza · Kumush · Oltin · Platina · Olmos
        → Beginner · Bronze · Silver · Gold · Platinum · Diamond
     Kunlik vazifalar → Daily quests · Xatolarim / Saqlangan → Mistakes / Saved (360 px plitkaga sigʻishi uchun; §8.5 da «My mistakes»)
     IQ oʻyinlari / Aql oʻyini → IQ games / Brain game
     Doʻkon / Nishonlar / Vitrina → Shop / Badges / Showcase
     Sozlamalar / Eslatma → Settings / Reminder · Oraliq → Range
     IQ natijasi → IQ / result (hech qachon "IQ points" emas)

   TAQIQLANGAN (§6, §8.5): official, certified, accredited, clinical,
   Mensa, percentile, "smarter than", "raise/boost/increase your IQ" —
   tests/honesty.test.mjs tekshiradi.
   ───────────────────────────────────────────────────────────────────── */

window.nzEn = {
  /* ── Navigatsiya va umumiy ────────────────────────────────────────── */
  "Bosh": "Home",
  "Mashq": "Practice",
  "Reyting": "League",
  "Profil": "Profile",
  "Web sayt": "Website",
  "Mehmon": "Guest",
  "Tema": "Theme",
  "Sozlamalar": "Settings",
  "Bekor qilish": "Cancel",
  "Davom etish": "Continue",
  "Yopish": "Close",
  "Tayyor": "Done",
  "Saqlash": "Save",
  "Orqaga": "Back",
  "Keyingi": "Next",
  "Yangi": "New",
  "Bugun": "Today",

  /* ── Qoliplar ({0} — son) ─────────────────────────────────────────── */
  "{0} kun": { one: "{0} day", other: "{0} days" },
  "+{0} ball": { one: "+{0} point", other: "+{0} points" },
  "{0} ball": { one: "{0} point", other: "{0} points" },
  "{0} tanga": { one: "{0} coin", other: "{0} coins" },
  "+{0} tanga": { one: "+{0} coin", other: "+{0} coins" },
  "{0} ta savol": { one: "{0} question", other: "{0} questions" },
  "{0}-daraja": "Level {0}",
  "{0}% · {1} ta javob": "{0}% · {1} answered",
  "Oraliq {0}–{1}": "Range {0}–{1}",
  "Oraliq {0}+": "Range {0}+",
  "Oraliq ≤{0}": "Range ≤{0}",
  "Ketma-ket faol kunlar: {0}": "Active days in a row: {0}",

  /* ── Liga ─────────────────────────────────────────────────────────── */
  "{0} liga": "{0} League",
  "{0} ligagacha {1} ball": { one: "{1} point to {0}", other: "{1} points to {0}" },
  "Eng yuqori liga": "Top league",
  "Boshlovchi": "Beginner",
  "Bronza": "Bronze",
  "Kumush": "Silver",
  "Oltin": "Gold",
  "Platina": "Platinum",
  "Olmos": "Diamond",
  "Bu hafta": "This week",
  "Bu hafta: {0} ball": { one: "This week: {0} point", other: "This week: {0} points" },
  "Eng yaxshi hafta": "Best week",
  "Oxirgi haftalar": "Recent weeks",
  "Eng yaxshi IQ": "Best IQ",
  "Jami ball": "Total points",
  "{0} liga!": "{0} League!",
  "Bu hafta {0} ball": { one: "{0} point this week", other: "{0} points this week" },
  "Oʻtgan hafta: {0}": "Last week: {0}",
  "Mukofot:": "Reward:",
  "Mukofot: Bronzadan boshlab": "Reward: from Bronze up",
  "Hafta yakuni": "Week results",
  "joriy": "current",
  "oʻtildi": "passed",

  /* ── Bosh ekran ───────────────────────────────────────────────────── */
  "IQ test": "IQ test",
  "{0} savol · moslashuvchan": { one: "{0} question · adaptive", other: "{0} questions · adaptive" },
  "{0}/{1} · davom ettiring": "{0}/{1} · pick up where you left off",
  "Boshlash": "Start",
  "Davom ettirish": "Resume",
  "Yangidan": "Start over",
  "Bugungi mashq": "Today’s practice",
  "IQ oʻyinlari": "IQ games",
  "Kunlik vazifalar": "Daily quests",
  "Aql oʻyini": "Brain game",
  "Xatolarni tuzating": "Fix your mistakes",
  "{0} mashqi": "{0} practice",
  "Oxirgi natija: {0}": "Last result: {0}",
  "Qayta topshirish": "Retake",
  "{0}/{1} savol": "{0}/{1} questions",
  "Kun oʻyini: {0}": "Today: {0}",
  "Olindi": "Claimed",
  "Tanga: {0}": "Coins: {0}",

  /* ── Mashq ────────────────────────────────────────────────────────── */
  "Xatolarim": "Mistakes",
  "Saqlangan": "Saved",
  "Diqqat": "Attention",
  "Xotira": "Memory",
  "Tezlik": "Speed",
  "Mantiq": "Logic",
  "Fazoviy": "Spatial",

  /* ── Savol ekrani ─────────────────────────────────────────────────── */
  "Pauza": "Pause",
  "Testni toʻxtatish": "Pause test",
  "Mashqdan chiqish": "Exit practice",
  "Savolni saqlash": "Save question",
  "Saqlanganlardan olib tashlash": "Remove from saved",
  "Savol rasmi": "Question image",
  "Variant": "Option",
  "Toʻgʻri": "Correct",
  "Izoh": "Explanation",
  "Javobni tanlang": "Choose an answer",
  "Yakunlash": "Finish",
  "Natija": "Result",
  "Notoʻgʻri": "Incorrect",
  "Toʻgʻri javob: {0}": "Answer: {0}",
  "Test qanday oʻtadi": "How the test works",
  "Variantni tanlang va «Keyingi»ni bosing": "Pick an option, then tap “Next”",
  "Oldingi savolga qaytib boʻlmaydi": "You can’t go back to a previous question",
  "Toʻxtatsangiz — keyin davom etasiz": "Pause any time and pick up later",

  /* ── Natija ekrani ────────────────────────────────────────────────── */
  "NATIJA": "RESULT",
  "TOʻGʻRI": "CORRECT",
  "Mashq qilish": "Practice",
  "Yana mashq": "Practice again",

  /* ── Oʻyin ekrani ─────────────────────────────────────────────────── */
  "Oʻyindan chiqish": "Exit game",
  "Qayta oʻynash": "Play again",
  "Vaqt": "Time",
  "Keyingi daraja": "Next level",
  "Katak": "Cell",
  "yongan": "lit",
  "toʻgʻri": "correct",
  "xato": "wrong",
  "yopiq": "hidden",
  "faol emas": "inactive",
  "Juda tez bosishlar — ball berilmadi": "Taps too fast — no points awarded",
  "Daraja": "Level",

  /* ── Profil ───────────────────────────────────────────────────────── */
  "Testlar": "Tests",
  "Eng uzun ketma-ketlik": "Longest streak",
  "Testlar tarixi": "Test history",
  "Hali test topshirilmagan": "No tests yet",
  "Savol turlari": "Question types",
  "Profilni tahrirlash": "Edit profile",
  /* Tahrirlash ekrani sarlavhasi (standart 88 px sarlavha, bir qator). */
  "Tahrirlash": "Edit profile",
  "Bio qoʻshing": "Add a bio",
  "Nishonlar": "Badges",
  "Doʻkon": "Shop",

  /* ── Profilni tahrirlash ──────────────────────────────────────────── */
  "Rasmni oʻzgartirish": "Change photo",
  "Rang": "Color",
  "Foydalanuvchi nomi": "Username",
  "Bio": "Bio",
  "Oʻzgarishlar saqlanmagan": "Unsaved changes",
  "Chiqish": "Leave",
  "Qolish": "Stay",
  "Rasm": "Photo",
  "Galereyadan": "From gallery",
  "Olib tashlash": "Remove",
  "Bu rasmni ochib boʻlmadi": "Couldn’t open this photo",
  "Rasm saqlanmadi": "Photo wasn’t saved",
  "Boshqa rasm": "Choose another",
  "Yuqori": "Top",
  "Markaz": "Center",
  "Past": "Bottom",
  "Chap": "Left",
  "Oʻng": "Right",
  "Galereya": "Gallery",

  /* ── Nishonlar va Doʻkon ──────────────────────────────────────────── */
  "Vitrina": "Showcase",
  "Yutuqlar": "Achievements",
  "Kolleksiya": "Collection",
  "Olingan: {0}": "Earned: {0}",
  "Vitrinaga qoʻyish": "Add to showcase",
  "Vitrinadan olish": "Remove from showcase",
  "Vitrina toʻla": "Showcase is full",
  "Sotib olish": "Buy",
  "Yangi nishon": "New badge",
  "Ranglar": "Colors",
  "Sizda bor": "Owned",
  "✓ Tanlangan": "✓ Selected",
  "Tanga qanday olinadi": "How to earn coins",
  "Yana {0} tanga kerak": { one: "{0} more coin needed", other: "{0} more coins needed" },
  "Sizniki!": "It’s yours!",
  "Qoʻllash": "Apply",
  "Boʻsh joy": "Empty slot",
  "olinmagan": "not earned",
  "Kolleksiya nishoni": "Collection badge",
  "Narxi: {0} tanga": { one: "Price: {0} coin", other: "Price: {0} coins" },
  "Balans: {0} tanga": { one: "Balance: {0} coin", other: "Balance: {0} coins" },
  "Sotib olish · {0}": "Buy · {0}",
  "Yangi nishonlar": "New badges",
  "{0} ta yangi nishon": { one: "{0} new badge", other: "{0} new badges" },
  "Koʻrish": "View",

  /* ── Sozlamalar ───────────────────────────────────────────────────── */
  "Umumiy": "General",
  "Til": "Language",
  "Qurilma": "System",
  "Yorugʻ": "Light",
  "Tungi": "Dark",
  "Ovoz": "Sound",
  "Ovoz effektlari": "Sound effects",
  "Tebranish": "Vibration",
  "Bildirishnomalar": "Notifications",
  "Kunlik eslatma": "Daily reminder",
  "Har kuni {0}": "Every day at {0}",
  "Tizim sozlamalarida ruxsat bering": "Allow in system settings",
  "Ketma-ketlik eslatmasi": "Streak reminder",
  "Faol boʻlmagan kuni {0}": "On inactive days at {0}",
  "Yordam": "Help",
  "Qanday ishlaydi": "How it works",
  "Aloqa": "Contact",
  "Ilovani baholash": "Rate the app",
  "Huquqiy": "Legal",
  "Maʼlumotlar": "Data",
  "Foydalanish shartlari": "Terms of use",
  "Maxfiylik siyosati": "Privacy policy",
  "Maʼlumotlarni oʻchirish": "Delete data",

  /* ── Tasdiq oynalari ──────────────────────────────────────────────── */
  "Testni toʻxtatish?": "Pause the test?",
  "Javoblar saqlanadi — keyin davom ettirasiz.": "Your answers are saved — continue any time.",
  "Toʻxtatish": "Pause",
  "Yangi test?": "Start a new test?",
  "Tugallanmagan test oʻchiriladi.": "Your unfinished test will be deleted.",
  "Maʼlumotlarni oʻchirish?": "Delete your data?",
  "Natijalar, ballar, tangalar, nishonlar va profil oʻchiriladi.":
    "Results, points, coins, badges and your profile will be deleted.",
  "Oʻchirish": "Delete",
  "Maʼlumotlar oʻchirildi": "Data deleted",
  "Testni tiklab boʻlmadi": "Couldn’t restore the test",
  "Yangi test boshlang.": "Start a new test.",
  "Xatolar yoʻq": "No mistakes",
  "Xato qilgan savollaringiz shu yerda toʻplanadi.": "Questions you get wrong will collect here.",
  "Saqlangan savol yoʻq": "No saved questions",
  "Mashqda xatchoʻp tugmasini bosing.": "Tap the bookmark during practice.",
  "Xatolik": "Something went wrong",
  "Ilovani qayta oching.": "Please reopen the app.",

  /* ── Birinchi kirish ──────────────────────────────────────────────── */
  "Tilni tanlang": "Choose your language",
  "Mashq va oʻyinlar": "Practice and games",
  "Har kuni savollar va aql oʻyinlari. Daraja sizga moslashadi.":
    "Daily questions and brain games. The level adapts to you.",
  "Ball va tanga": "Points and coins",
  "Yangi: tanga va doʻkon": "New: coins and shop",
  "Ball — ligada koʻtarilish uchun. Tanga — profilni bezash uchun.":
    "Points move you up the league. Coins style your profile.",
  "Ball": "Points",
  "Tanga": "Coins",
  "Profilingiz": "Your profile",
  "Rasm, rang va nom tanlang.": "Pick a photo, color and name.",
  "Eslatma": "Reminder",
  "Har kuni mashq vaqtini eslatamiz.": "We’ll remind you to practice every day.",
  "Yoqish": "Turn on",
  "Kerak emas": "Not now",
  "Keyinroq": "Later",
  "Oʻtkazib yuborish": "Skip",
  "{0} ta savol. Natija — IQ va oraliq.": { one: "{0} question. You get your IQ and a range.", other: "{0} questions. You get your IQ and a range." },
  "Matritsa": "Matrix",

  /* ── Qurilma xabarlari (bootstrap.js, notify.js) ──────────────────── */
  "Chiqish uchun yana bir marta bosing": "Press again to exit",
  "Bildirishnomaga ruxsat berilmagan — tizim sozlamalaridan yoqing":
    "Notifications are off — turn them on in system settings",
  "Bugungi vazifalar tayyor: 10 ta savol va bitta aql oʻyini.":
    "Today’s quests are ready: 10 questions and one brain game.",
  "{0} kunlik ketma-ketlikni saqlab qoling — bugun bitta savol yetarli.":
    "Keep your {0}-day streak — one question today is enough.",

  /* ── Landing (sayt) ───────────────────────────────────────────────── */
  "Mantiqiy fikrlashingizni sinang va mashq qiling": "Test and train your logical thinking",
  "{0} savollik moslashuvchan IQ test, mashq va IQ oʻyinlari.":
    "A {0}-question adaptive IQ test, practice and IQ games.",
  "Telegramda ochish": "Open in Telegram",
  "Brauzerda ochish": "Open in browser",
  "savollik test": { one: "question per test", other: "questions per test" },
  "savol turi": { one: "question type", other: "question types" },
  "IQ oʻyini": { one: "IQ game", other: "IQ games" },
  "Testni boshlang": "Take the test",
  "Qiyinlik javoblaringizga moslashadi.": "Difficulty adapts to your answers.",
  "Natijani koʻring": "See your result",
  "IQ natijasi va savol turlari boʻyicha tahlil.": "Your IQ and a breakdown by question type.",
  "Mashq qiling": "Practice",
  "Har kuni mashq — natijangiz oʻsishini kuzating.": "Practice daily and track how your results grow.",
  "Ilovada nima bor": "What’s inside",
  "{0} ta moslashuvchan savol.": { one: "{0} adaptive question.", other: "{0} adaptive questions." },
  "Har bir savol turi alohida, izoh bilan.": "Each question type on its own, with explanations.",
  "Xotira, diqqat va tezlik.": "Memory, attention and speed.",
  "Liga": "League",
  "Kerakli savollarni qayta yeching.": "Solve the questions you need again.",
  "Xato qilingan savollar takrori.": "Review the questions you missed.",
  "Internetsiz": "Works offline",
  "Hammasi telefonda ishlaydi.": "Everything runs on your phone.",
  "Bugundan boshlang": "Start today",
  "Roʻyxatdan oʻtish shart emas.": "No sign-up needed.",
  "Interfeys asosi:": "Interface based on:",
  "IQ test · mashq · IQ oʻyinlari": "IQ test · practice · IQ games",
  /* Paywall (faqat web, PAYWALL.md) */
  "1) Ilovangizda toʻlov qiling": "1) Pay in your banking app",
  "2) Chek rasmini botga yuboring": "2) Send a photo of the receipt to the bot",
  "Adminga yozish": "Message admin",
  "Chekni yuborish": "Send receipt",
  "IQuest testi natijasi": "IQuest test result",
  "IQuest.uz tomonidan berilgan": "Issued by IQuest.uz",
  "Ism Familiya": "First Last",
  "Ismingizni yozing": "Enter your name",
  "Karta raqami": "Card number",
  "Kod notoʻgʻri": "Wrong code",
  "Kodni kiritish": "Enter code",
  "Natija tayyor": "Result ready",
  "Natija va sertifikatni olish uchun {0} toʻlang": "Pay {0} to get your result and certificate",
  "Natijani ochish": "Open result",
  "Nusxalandi": "Copied",
  "Nusxalash": "Copy",
  "Ochish": "Unlock",
  "Ochish kodi": "Unlock code",
  "Rasm yuklanmasa — shu yerni bosing": "If it didn't download, tap here",
  "Sana": "Date",
  "Sertifikat": "Certificate",
  "Sertifikat kodi": "Certificate code",
  "Test kodi": "Test code",
  "Toʻliq ismingiz": "Your full name",
  "Toʻlov kutilmoqda": "Awaiting payment",
  "Yuklab olish": "Download",
};
