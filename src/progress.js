/* ─────────────────────────────────────────────────────────────────────────
   PROGRESS — ILOVA YOPILGANDA HAM ESLAB QOLADI

   Shu faylgacha ilova hech narsani saqlamasdi. Ballar, streak,
   "Xatolarim", "Saqlangan", marafon rekordi — hammasi xotirada edi va
   ilova yopilishi bilan nolga qaytardi. Imtihonga tayyorlanish esa bir
   kunlik ish emas: odam bugun 20 savol yechadi, ertaga davom etadi.
   Har ochilishda noldan boshlanadigan ilova mashq qilishning ma'nosini
   yo'q qiladi.

   UCH QAROR:

   1. SAQLANADIGANI INDEKS EMAS, ref.
      "Saqlangan" va "Xatolarim" ro'yxatlari dizaynda QUESTIONS massivi
      indekslari bilan ishlaydi. Indeksni qurilmada saqlash jimgina
      buzilardi: bank bazadan yangilanganda (src/data.js) o'rtaga bitta
      savol qo'shilsa, indeks 4 boshqa savolga ko'rsata boshlaydi va odam
      o'zi saqlamagan savolni ko'radi. Shuning uchun diskda ref turadi,
      indeksga o'girish esa yuklash paytida bo'ladi.

   2. BIRINCHI OCHILISHDA HAMMASI NOL.
      Dizaynda 12 480 ball, 47 rekord va 5 kunlik streak yozilgan edi —
      bular maket uchun chizilgan raqamlar. Ilovani birinchi ochgan odam
      o'zi ishlamagan 12 480 ballni ko'rsa, undan keyingi hech qaysi
      raqamga ishonmaydi. Demo qiymatlar faqat Design Canvas'da qoladi
      (props orqali), haqiqiy ilovada boshlanish nol.

   3. KUN 04:00 DA ALMASHADI, YARIM KECHADA EMAS.
      Kunlik vazifalar va streak uchun kun chegarasi kerak. Yarim kecha
      yaramaydi: kechqurun 23:50 da boshlab 00:10 da tugatgan odam ikki
      xil kunga tushib qolardi va streak'i buzilardi. Talaba kech
      o'qiydi, shuning uchun chegara — mahalliy vaqt bilan 04:00.

   NIMA SAQLANMAYDI: javob berilayotgan test (quiz). Ilova o'rtada
   yopilsa test boshidan boshlanadi. Ataylab: yarim tugagan imtihonni
   tiklash uning vaqt bosimini yo'qotadi, ya'ni simulyatsiya haqiqatga
   o'xshamay qoladi.
   ───────────────────────────────────────────────────────────────────── */

(function () {
  const KEY = 'nz-progress';
  const QUEUE_KEY = 'nz-attempts';
  const VERSION = 1;

  /* Navbat chegarasi. Javoblar serverga yuborish uchun yig'iladi
     (REJA.md Faza 4), lekin server tomoni hali yo'q — foydalanuvchi
     hisobi Telegram yoki SMS orqali keladi. Navbat cheksiz o'smasligi
     kerak, shuning uchun eng qadimgilari tashlanadi: yangi javob eski
     javobdan qimmatliroq. */
  const QUEUE_MAX = 2000;

  /* Ball to'langan savollar ro'yxatining chegarasi. 600 savollik bank
     uchun ~4 KB, ya'ni chegara amalda tegmaydi — u faqat cheksiz
     o'sishdan himoya. Eng qadimgilari tashlanadi: ular qayta to'lanadi,
     lekin bu yuzlab savol yechilgandan keyingi holat. */
  const SCORED_MAX = 5000;

  /* IQ testlari tarixi (CONTRACT.md §5): eng ko'pi 100 ta, eskisi
     tushadi. Bitta yozuv ~150 bayt → 100 tasi ~15 KB. Holat bilan bir
     kalitda yoziladi (yozish 400 ms da bir marta birlashtiriladi), shuning
     uchun cheksiz o'smasligi shart. */
  const TESTS_MAX = 100;

  /* levelFor() uchun: har tur bo'yicha so'nggi 30 ta javob (test va
     mashqdan). 30 — bitta to'liq testga teng ma'lumot (θ ning s.o. ~0.45);
     undan eskisi tushadi, ya'ni mashq qilgan odamning darajasi eski
     natijaga yopishib qolmaydi. */
  const RECENT_MAX = 30;
  const TYPES_MAX = 20;          // tur nomlari — ishonchsiz kirish, cheksiz o'smasin
  const TYPE_LEN_MAX = 30;

  /* ── Qurilma xotirasi ──────────────────────────────────────────────
     localStorage ishlamasligi mumkin: brauzerning maxfiy oynasi, sayt
     ma'lumoti bloklangan, joy tugagan. Bunday holda ilova SAQLAMASDAN
     ishlaydi — xato ko'rsatmaydi va yiqilmaydi. */
  let works = true;

  function read(key) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch (e) { works = false; return null; }
  }

  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { works = false; return false; }
  }

  /* ── Kun hisobi (04:00 chegarasi) ──────────────────────────────────── */
  const DAY_START_HOUR = 4;

  function dayKey(ts) {
    const d = new Date((ts == null ? Date.now() : ts) - DAY_START_HOUR * 3600000);
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  }

  /* Ketma-ket kunmi? Sanani qo'shib-ayirmasdan, ikki kun kalitining
     farqini kun sonida o'lchaymiz — soat mintaqasi o'zgarsa ham to'g'ri
     ishlaydi, chunki ikkalasi ham bir xil usulda yasalgan. */
  function daysBetween(a, b) {
    if (!a || !b) return null;
    const p = a.split('-').map(Number), q = b.split('-').map(Number);
    const ms = Date.UTC(q[0], q[1] - 1, q[2]) - Date.UTC(p[0], p[1] - 1, p[2]);
    return Math.round(ms / 86400000);
  }

  /* ── Bo'sh holat ───────────────────────────────────────────────────── */
  function blank() {
    return {
      v: VERSION,
      points: 0,
      marathonBest: 0,
      /* Umrbod hisoblagichlar — profil ekranidagi raqamlar shulardan
         chiqadi. Ular kunlik hisoblagichlardan farqli, hech qachon
         nolga qaytmaydi. */
      totalAnswered: 0,
      totalCorrect: 0,
      totalExams: 0,
      /* Imtihon rejimidagi javoblar — "Imtihon tayyorligi" shundan
         hisoblanadi (umrbod aniqlikdan emas, izohi answered() da). */
      examAnswered: 0,
      examCorrect: 0,
      streak: 0,
      longest: 0,
      lastActiveDay: null,     // oxirgi javob berilgan kun
      /* Mavzu kesimidagi umrbod hisob: { "Yoʻl belgilari": [n, toʻgʻri] }.
         Prototipsiz obyekt: mavzu nomi bazadan keladi va "constructor"
         bo'lishi mumkin — oddiy {} da store.topics[nom] || [0,0] o'sha
         nom uchun FUNKSIYA qaytarardi va hisob NaN ga aylanardi.
         Profildagi "Mavzular boʻyicha" ilgari qattiq yozilgan massiv edi
         va yangi foydalanuvchiga ham "Birinchi yordam mavzusida zaifsiz
         (42%)" derdi. Bu raqamni bank emas, aynan shu odam javob
         bergan savollar berishi kerak.

         Ikki elementli massiv — obyekt emas: har bir mavzu uchun
         localStorage'da 8 belgi o'rniga ~14 belgi ketardi va bu yozuv
         har javobda diskka tushadi. */
      topics: Object.create(null),
      wrong: [],               // ref'lar
      saved: [],               // ref'lar
      day: null,               // kunlik hisoblagichlar qaysi kunga tegishli
      answered: 0,
      exams: 0,
      signs: [],               // ref'lar
      /* Ball TO'LANGAN savollar (ref). Bir savol uchun +10 faqat BIR
         MARTA beriladi.

         Ilgari har to'g'ri javobga rejimdan qat'i nazar +10 berilardi —
         "Xatolarim" takrorlariga ham, marafonning cheksiz aylanishiga
         ham. Marafon poolni `(index + 1) % pool.length` bilan aylantiradi,
         ya'ni o'sha 10 savolni qayta-qayta yechib ballni cheksiz
         oshirish mumkin edi. Ball esa ligani belgilaydi.

         Takrorlash o'zi JAZOLANMAYDI: streak, kunlik vazifa, mavzu
         kesimidagi hisob va "Xatolarim" ro'yxatidan chiqish — hammasi
         ishlayveradi. Faqat BALL ikkinchi marta to'lanmaydi. */
      scored: [],
      tasks: [],               // mukofot berilgan vazifa id'lari
      /* Sozlamalar. Ilgari ular saqlanmasdi: ovozni o'chirgan odam
         ilovani qayta ochganda ovoz yana yonib turardi. Sozlama —
         foydalanuvchining aytgan gapi; uni har safar unutish uni
         e'tiborsiz qoldirish. null = hali tanlanmagan (dizayndagi
         standart qiymat ishlatiladi). */
      soundOn: null,
      notifOn: null,
      /* IQ testlari natijalari, eskidan yangiga. byType diskda
         { tur: [n, to'g'ri] } — topics bilan bir xil sabab (joy). */
      tests: [],
      /* Tur bo'yicha so'nggi javoblar: { tur: [[b, k, 0|1], ...] } —
         levelFor() shulardan hisoblaydi. Prototipsiz obyekt: tur nomi
         "constructor" bo'lsa ham funksiya qaytmasin. */
      iqRecent: Object.create(null),
    };
  }

  /* ── IQ yozuvlarini tekshirish ─────────────────────────────────────
     Versiya (VERSION) OSHIRILMAGAN: tests va iqRecent — yangi, ixtiyoriy
     maydonlar. Versiyani oshirish sane() da butun eski progressni (ball,
     streak, "Saqlangan") nolga tushirardi. Eski yozuvda bu maydonlar
     yo'q → bo'sh; buzuq bo'lsa → faqat buzuq YOZUV tashlanadi, qolgani
     saqlanadi. */
  const isInt = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
  const isNum = x => typeof x === 'number' && isFinite(x);
  /* "__proto__" — yagona xavfli nom: testHistory() oddiy {} ga
     byType["__proto__"] = … yozganda u xususiyat emas, PROTOTIP bo'lib
     qolardi. Generator turi hech qachon bunday nomlanmaydi. */
  const okType = k => typeof k === 'string' && k.length > 0 && k.length <= TYPE_LEN_MAX && k !== '__proto__';

  /* { tur: [n, to'g'ri] } — diskdagi shakl. Natijadan ({ n, correct })
     ham, diskdan ([n, c]) ham o'qiydi. */
  function saneByType(v) {
    const out = Object.create(null);
    if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
    Object.keys(v).slice(0, TYPES_MAX).forEach(k => {
      const x = v[k];
      const n = Array.isArray(x) ? x[0] : x && x.n;
      const c = Array.isArray(x) ? x[1] : x && x.correct;
      if (okType(k) && isInt(n, 1, 1000) && isInt(c, 0, n)) out[k] = [n, c];
    });
    return out;
  }

  function saneTest(e) {
    if (!e || typeof e !== 'object') return null;
    if (!(isNum(e.at) && e.at > 0)) return null;
    if (!isInt(e.iq, 55, 145) || !isInt(e.lo, 55, 145) || !isInt(e.hi, 55, 145)) return null;
    if (!(e.lo <= e.iq && e.iq <= e.hi)) return null;
    if (!isInt(e.n, 1, 1000) || !isInt(e.correct, 0, e.n)) return null;
    return {
      at: e.at, iq: e.iq, lo: e.lo, hi: e.hi, n: e.n, correct: e.correct,
      reliable: e.reliable === true,
      theta: isNum(e.theta) ? Math.round(e.theta * 1000) / 1000 : null,
      se: isNum(e.se) && e.se >= 0 ? Math.round(e.se * 1000) / 1000 : null,
      byType: saneByType(e.byType),
    };
  }

  function saneTests(v) {
    if (!Array.isArray(v)) return [];
    const out = [];
    v.forEach(e => { const t = saneTest(e); if (t) out.push(t); });
    return out.slice(-TESTS_MAX);
  }

  /* Bitta javob: [b, k, 0|1]. b — logit (±10 dan tashqarisi buzuq),
     k — variantlar soni. */
  const saneResp = r => (Array.isArray(r) && r.length === 3 && isNum(r[0]) && Math.abs(r[0]) <= 10 &&
    isInt(r[1], 2, 10) && (r[2] === 0 || r[2] === 1)) ? [r[0], r[1], r[2]] : null;

  function saneRecent(v) {
    const out = Object.create(null);
    if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
    Object.keys(v).slice(0, TYPES_MAX).forEach(k => {
      if (!okType(k) || !Array.isArray(v[k])) return;
      const list = v[k].map(saneResp).filter(Boolean).slice(-RECENT_MAX);
      if (list.length) out[k] = list;
    });
    return out;
  }

  /* Saqlangan ma'lumot ishonchsiz manba: foydalanuvchi uni qo'lda
     o'zgartirishi yoki eski versiya qoldirishi mumkin. Har bir maydon
     shakli tekshiriladi, yaramasi bo'sh qiymatga tushadi — buzilgan
     yozuv tufayli ilova ishlamay qolmasligi kerak. */
  function sane(raw) {
    const b = blank();
    if (!raw || typeof raw !== 'object' || raw.v !== VERSION) return b;
    const num = (v, d) => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : d);
    const refs = v => (Array.isArray(v) ? v.filter(x => typeof x === 'string') : []);
    const str = v => (typeof v === 'string' ? v : null);
    return {
      v: VERSION,
      points: num(raw.points, 0),
      marathonBest: num(raw.marathonBest, 0),
      totalAnswered: num(raw.totalAnswered, 0),
      totalCorrect: num(raw.totalCorrect, 0),
      totalExams: num(raw.totalExams, 0),
      examAnswered: num(raw.examAnswered, 0),
      examCorrect: num(raw.examCorrect, 0),
      streak: num(raw.streak, 0),
      longest: num(raw.longest, 0),
      lastActiveDay: str(raw.lastActiveDay),
      /* Mavzu nomlari bazadan keladi, ya'ni ular ham ishonchsiz kirish.
         Nomi 60 belgidan uzun yoki qiymati ikkita musbat son bo'lmagan
         yozuv tashlanadi; to'g'ri javob soni umumiy sondan katta
         bo'lolmaydi, aks holda profilda 300% chiqardi. */
      topics: (() => {
        const out = Object.create(null);
        const t = raw.topics;
        if (!t || typeof t !== 'object') return out;
        Object.keys(t).slice(0, 200).forEach(k => {
          const v = t[k];
          if (typeof k !== 'string' || !k || k.length > 60) return;
          if (!Array.isArray(v) || v.length !== 2) return;
          const n = num(v[0], 0), c = num(v[1], 0);
          if (n > 0) out[k] = [n, Math.min(c, n)];
        });
        return out;
      })(),
      wrong: refs(raw.wrong),
      saved: refs(raw.saved),
      day: str(raw.day),
      answered: num(raw.answered, 0),
      exams: num(raw.exams, 0),
      signs: refs(raw.signs),
      scored: refs(raw.scored).slice(-SCORED_MAX),
      tasks: Array.isArray(raw.tasks) ? raw.tasks.filter(x => typeof x === 'string') : [],
      soundOn: typeof raw.soundOn === 'boolean' ? raw.soundOn : null,
      notifOn: typeof raw.notifOn === 'boolean' ? raw.notifOn : null,
      tests: saneTests(raw.tests),
      iqRecent: saneRecent(raw.iqRecent),
    };
  }

  let store = sane(read(KEY));

  /* Kunlik hisoblagichlar boshqa kunga tegishli bo'lsa — nolga.
     Yuklashda va har javobda tekshiriladi: ilova kechqurun ochiq
     qoldirilib ertalab davom etilsa, kunlik vazifalar yangi kunga
     o'tishi kerak. */
  function rollDay() {
    const today = dayKey();
    if (store.day === today) return false;
    store.day = today;
    store.answered = 0;
    store.exams = 0;
    store.signs = [];
    store.tasks = [];
    return true;
  }
  rollDay();

  /* Ko'rsatiladigan streak. Saqlangan raqamning o'zi yetmaydi: odam uch
     kun ilovani ochmasa streak uzilgan, lekin diskda eski raqam turadi.
     Qoida: bugun yoki kechagi kunda javob berilgan bo'lsa streak amal
     qiladi (bugun hali tugamagan — uni yo'qotish uchun erta), undan
     eskisi esa uzilgan. */
  /* Ball to'langan ref'lar — tez qidirish uchun. Massivning o'zi diskka
     yoziladi (Set JSON'ga tushmaydi), Set esa faqat xotirada. */
  let scoredIdx = null;
  function scoredSet() {
    if (!scoredIdx) scoredIdx = new Set(store.scored);
    return scoredIdx;
  }

  function liveStreak() {
    const d = daysBetween(store.lastActiveDay, dayKey());
    if (d === null || d > 1) return 0;
    return store.streak;
  }

  /* ── ref ↔ indeks ──────────────────────────────────────────────────
     QUESTIONS bank almashganda o'zgaradi, shuning uchun har o'girishda
     u parametr sifatida uzatiladi — modul global holatga tayanmaydi. */
  function indexMap(questions) {
    /* Object.create(null) — oddiy {} EMAS. Sabab: `ref` erkin matn
       (parseBulk uni cheklamaydi), ya'ni u "constructor" yoki
       "__proto__" bo'lishi mumkin. Oddiy obyektda m["constructor"]
       hech qachon undefined bo'lmaydi — u Object.prototype dan
       KELADI. Natijasi ikki xil zarar edi:
         toIndices(["constructor"], Q) → [ƒ Object]  (indeks o'rniga funksiya)
         orphansOf(["constructor"], Q) → []          (yetim ham deb sanalmaydi)
       Ikkinchisi og'irroq: bunday savol "Saqlangan" ro'yxatidan
       BUTUNLAY va qaytarib bo'lmas o'chardi — yetimlar mexanizmi ham
       uni ushlamasdi. */
    const m = Object.create(null);
    (questions || []).forEach((q, i) => { if (q && q.ref) m[q.ref] = i; });
    return m;
  }

  /* ── Bankda yo'q ref'lar ("yetimlar") ───────────────────────────────
     Bu yerda oson yo'qotib qo'yiladigan ma'lumot bor. Tasavvur qiling:
     odam internetda bazadagi 500 savoldan #300 ni saqlab qo'ydi. Keyin
     internetsiz ochdi — bank APK ichidagi 10 savolga tushdi, #300 esa
     indeksga o'girilmaydi. Agar shundan keyin holat diskka yozilsa,
     #300 ro'yxatdan BUTUNLAY o'chib ketardi va odam uni qaytarib
     olmasdi.

     Shuning uchun o'girishda moslanmagan ref'lar chetga yig'iladi va
     yozishda qaytariladi. Ular ko'rinmaydi (bankda yo'q), lekin
     yo'qolmaydi ham — bank qaytganda o'z joyiga tushadi. */
  let orphans = { wrong: [], saved: [], signs: [] };

  function toIndices(refs, questions) {
    const m = indexMap(questions);
    const out = [];
    (refs || []).forEach(r => { if (m[r] !== undefined) out.push(m[r]); });
    return out;
  }

  function orphansOf(refs, questions) {
    const m = indexMap(questions);
    return (refs || []).filter(r => m[r] === undefined);
  }

  function uniq(a) {
    const seen = Object.create(null), out = [];
    a.forEach(x => { if (!seen[x]) { seen[x] = 1; out.push(x); } });
    return out;
  }

  function toRefs(indices, questions) {
    const out = [];
    (indices || []).forEach(i => {
      const q = questions && questions[i];
      if (q && q.ref) out.push(q.ref);
    });
    return out;
  }

  /* ── Yozish: darhol emas, birlashtirib ─────────────────────────────
     setState har bosishda chaqiriladi (test davomida sekundda bir necha
     marta). Har birida diskka yozish — keraksiz ish, shuning uchun
     yozuvlar birlashtiriladi. Lekin ilova YOPILAYOTGANDA kutish mumkin
     emas: oxirgi javob yo'qolib qolardi. Shuning uchun flush() ham bor
     va u ilova fonga ketganda chaqiriladi. */
  let timer = null;
  let pending = null;

  /* Javoblar navbati ham SHU YERDA birlashtiriladi.

     Ilgari u birlashtirilmasdi: har javobda butun navbat diskdan
     o'qilib, parse qilinib, qaytadan yozilardi. Navbat to'lganda
     (QUEUE_MAX = 2000 yozuv, ~221 KB) bu bitta javobga ~1.6 ms
     SINXRON ish degani — aynan odam javobni bosgan lahzada, asosiy
     oqimda. 20 savollik imtihonda ~4.4 MB yoziladi va ~32 ms
     bloklanadi; telefonda 3–6 barobar ko'proq. Kuniga 50 savol
     yechadigan odam ~40 kunda shu holatga tushadi.

     Endi navbat xotirada turadi va holat bilan bir vaqtda, 400 ms da
     bir marta yoziladi. Diskdan o'qish esa umuman bir marta —
     birinchi javobda. */
  let queue = null;          // null = hali diskdan o'qilmagan
  let queueDirty = false;

  function queueLoad() {
    if (queue) return queue;
    const q = read(QUEUE_KEY);
    queue = Array.isArray(q) ? q : [];
    return queue;
  }

  function commit() {
    timer = null;
    if (pending) { write(KEY, pending); pending = null; }
    if (queueDirty && queue) {
      /* Kesish yozish paytida bo'ladi, har qo'shishda emas: eng
         qadimgilari tashlanadi, yangi javob eski javobdan qimmatliroq. */
      if (queue.length > QUEUE_MAX) queue = queue.slice(-QUEUE_MAX);
      write(QUEUE_KEY, queue);
      queueDirty = false;
    }
  }

  function flush() {
    if (timer) { clearTimeout(timer); timer = null; }
    commit();
  }

  /* Natijadagi savollarni (Result.items) tur bo'yicha so'nggi javoblar
     ro'yxatiga qo'shadi. Qaytaradi: nechta qo'shildi. */
  function addRecent(items) {
    if (!Array.isArray(items)) return 0;
    let added = 0;
    items.forEach(it => {
      if (!it || !okType(it.type)) return;
      const k = isInt(it.k, 2, 10) ? it.k : 4;
      const r = saneResp([isNum(it.b) ? Math.round(it.b * 100) / 100 : NaN, k, it.correct === true ? 1 : 0]);
      if (!r) return;
      let list = store.iqRecent[it.type];
      if (!list) {
        if (Object.keys(store.iqRecent).length >= TYPES_MAX) return;
        list = store.iqRecent[it.type] = [];
      }
      list.push(r);
      if (list.length > RECENT_MAX) list.splice(0, list.length - RECENT_MAX);
      added++;
    });
    return added;
  }

  /* Mashq natijasi: tarixga TUSHMAYDI (u IQ testi emas — 10 savol,
     boshqa boshlanish nuqtasi), faqat levelFor() uchun javoblar. */
  function recordPractice(result) {
    if (!result || typeof result !== 'object') return false;
    if (!addRecent(result.items)) return false;
    pending = Object.assign({}, store);
    if (!timer) timer = setTimeout(commit, 400);
    return true;
  }

  window.nzProgress = {
    /* Saqlash ishlayaptimi. Ilova bunga qarab xulqini o'zgartirmaydi —
       bu faqat tekshirish va jurnal uchun. */
    works: function () { return works; },
    dayKey: dayKey,

    /* Ilova ochilganda holatga qo'yiladigan qiymatlar. QUESTIONS
       uzatiladi, chunki ref'larni indeksga o'girish kerak. */
    initial: function (questions) {
      orphans = {
        wrong: orphansOf(store.wrong, questions),
        saved: orphansOf(store.saved, questions),
        signs: orphansOf(store.signs, questions),
      };
      return {
        points: store.points,
        marathonBest: store.marathonBest,
        streak: liveStreak(),
        longestStreak: store.longest,
        wrongIds: toIndices(store.wrong, questions),
        savedIds: toIndices(store.saved, questions),
        answeredCount: store.answered,
        examsDone: store.exams,
        signsAnswered: toIndices(store.signs, questions),
        tasksAwarded: store.tasks.slice(),
        soundOn: store.soundOn,
        notifOn: store.notifOn,
      };
    },

    /* Holatni diskka. Chaqiruvchi butun state'ni beradi, bu yerda faqat
       kerakli maydonlar olinadi — ilova holatining qolgani (ochiq oyna,
       tanlangan tab, test) saqlanmaydi va saqlanmasligi kerak. */
    save: function (state, questions) {
      if (!state) return;
      store.points = state.points || 0;
      store.marathonBest = state.marathonBest || 0;
      store.wrong = uniq(toRefs(state.wrongIds, questions).concat(orphans.wrong));
      store.saved = uniq(toRefs(state.savedIds, questions).concat(orphans.saved));
      store.day = dayKey();
      store.answered = state.answeredCount || 0;
      store.exams = state.examsDone || 0;
      store.signs = uniq(toRefs(state.signsAnswered, questions).concat(orphans.signs));
      store.tasks = Array.isArray(state.tasksAwarded) ? state.tasksAwarded.slice() : [];
      store.soundOn = !!state.soundOn;
      store.notifOn = !!state.notifOn;

      pending = Object.assign({}, store);
      if (!timer) timer = setTimeout(commit, 400);
    },

    flush: flush,

    /* Javob berildi. Qiladigan ishlari:
         1. streak'ni yuritadi (kuniga bir marta)
         2. javobni navbatga qo'yadi (serverga yuborish uchun)
         3. mavzu va imtihon kesimidagi hisobni yuritadi
         4. shu javob uchun BERILADIGAN BALLNI hisoblaydi

       Qaytaradi: { streak, award }.
         streak — kun o'zgargan bo'lsa 0 dan farqli qiymat, aks holda
                  null; chaqiruvchi shunda ekranni yangilaydi.
         award  — shu javobga beriladigan ball (10 yoki 0). Qaror shu
                  yerda qabul qilinadi, dizaynda emas: takror javob
                  qaysi ekanini faqat saqlash qatlami biladi. */
    answered: function (a) {
      // Ilova 04:00 dan o'tib ochiq qolgan bo'lsa — yangi kun.
      const rolled = rollDay();
      const today = dayKey();
      let changed = rolled ? -1 : null;

      store.totalAnswered += 1;
      if (a && a.correct) store.totalCorrect += 1;

      /* Imtihon tayyorligi FAQAT imtihon rejimidagi javoblardan
         hisoblanadi. Umrbod aniqlik yaramaydi: "Xatolarim" takrorlari
         ham unga tushardi va bir savolni uch marta to'g'ri yechgan odam
         "tayyorligi" oshib borardi. Natijada imtihondan oldingi eng
         muhim raqam sistematik ravishda haqiqatdan yuqori chiqardi —
         odamni tayyor bo'lmagan holda imtihonga yuborardi. */
      const examMode = !a || !a.mode || a.mode === 'exam';
      if (examMode) {
        store.examAnswered += 1;
        if (a && a.correct) store.examCorrect += 1;
      }

      // Ball: bir savol uchun bir marta (yuqoridagi `scored` izohiga qarang).
      let award = 0;
      if (a && a.correct) {
        if (!a.ref) {
          award = 10;                      // ref yo'q — takrorni aniqlab bo'lmaydi
        } else if (scoredSet().has(a.ref)) {
          award = 0;
        } else {
          award = 10;
          scoredSet().add(a.ref);
          store.scored.push(a.ref);
          if (store.scored.length > SCORED_MAX) {
            store.scored = store.scored.slice(-SCORED_MAX);
          }
        }
      }

      if (a && typeof a.topic === 'string' && a.topic) {
        const k = a.topic.slice(0, 60);
        const cur = store.topics[k] || [0, 0];
        store.topics[k] = [cur[0] + 1, cur[1] + (a.correct ? 1 : 0)];
      }

      if (store.lastActiveDay !== today) {
        const gap = daysBetween(store.lastActiveDay, today);
        // gap === 1 → kecha ham yechgan, ketma-ketlik davom etadi.
        // Boshqa har qanday holatda (birinchi kun yoki uzilgan) — 1 dan.
        store.streak = (gap === 1) ? store.streak + 1 : 1;
        store.lastActiveDay = today;
        if (store.streak > store.longest) store.longest = store.streak;
        changed = store.streak;
      }

      if (a && a.ref) {
        queueLoad().push({
          u: uuid(),
          r: a.ref,
          c: a.chosen,
          k: a.correct ? 1 : 0,
          m: a.mode || 'exam',
          t: new Date().toISOString(),
        });
        queueDirty = true;
      }

      pending = Object.assign({}, store);
      if (!timer) timer = setTimeout(commit, 400);
      return { streak: changed, award: award };
    },

    /* Imtihon oxirigacha yetdi. Alohida chaqiruv kerak, chunki
       "imtihon topshirildi" javob berishdan boshqa fakt: yarim
       tashlangan imtihon sanalmasligi kerak. */
    examFinished: function () {
      store.totalExams += 1;
      pending = Object.assign({}, store);
      if (!timer) timer = setTimeout(commit, 400);
    },

    /* Profil ekranidagi umrbod raqamlar. Hech qanday hisob yo'q
       bo'lsa nol qaytadi — o'ylab topilgan raqam emas. */
    stats: function () {
      return {
        answered: store.totalAnswered,
        correct: store.totalCorrect,
        exams: store.totalExams,
        accuracy: store.totalAnswered
          ? Math.round(store.totalCorrect / store.totalAnswered * 100)
          : null,
        examAnswered: store.examAnswered,
        examAccuracy: store.examAnswered
          ? Math.round(store.examCorrect / store.examAnswered * 100)
          : null,
        longest: store.longest,
        marathonBest: store.marathonBest,
        topicsTouched: Object.keys(store.topics).length,
      };
    },

    /* Mavzu kesimidagi haqiqiy natija, eng zaifi oxirida.
       Bo'sh massiv = hali birorta savolga javob berilmagan; chaqiruvchi
       shunda foiz emas, bo'sh holat ko'rsatishi kerak.

       minN — shovqin chegarasi. 1 ta savolga javob berib xato qilgan
       odamga "Chorrahalar: 0%" deyish ma'lumot emas, tasodif: u
       mavzuni bilmasligini emas, bitta savolni ko'rganini bildiradi. */
    topicStats: function (minN) {
      const min = typeof minN === 'number' ? minN : 3;
      return Object.keys(store.topics)
        .map(name => {
          const v = store.topics[name];
          return { name: name, n: v[0], correct: v[1],
                   pct: Math.round(v[1] / v[0] * 100) };
        })
        .filter(t => t.n >= min)
        .sort((a, b) => a.pct - b.pct || b.n - a.n);
    },

    longest: function () { return store.longest; },
    streak: liveStreak,

    /* ── IQ testi natijalari (src/iq/CONTRACT.md §5) ─────────────────

       recordTest(result) — IQ.session natijasi (Result). Tarixga yoziladi
       (≤ 100, eskisi tushadi) va DARHOL diskka: bu 30 savollik mehnat,
       400 ms kutish paytida ilova yopilsa yo'qolmasin. Savollari
       levelFor() ga ham qo'shiladi. Mashq natijasi (mode: 'practice')
       berilsa — tarixga emas, faqat levelFor() ga (recordPractice).
       Qaytaradi: yozildimi (buzuq yoki 0 savollik natija — false). */
    recordTest: function (result) {
      if (!result || typeof result !== 'object') return false;
      if (result.mode === 'practice') return recordPractice(result);
      const e = saneTest({
        at: Date.now(), iq: result.iq, lo: result.lo, hi: result.hi,
        n: result.n, correct: result.correct, reliable: result.reliable === true,
        theta: result.theta, se: result.se, byType: result.byType,
      });
      if (!e) return false;
      store.tests.push(e);
      if (store.tests.length > TESTS_MAX) store.tests = store.tests.slice(-TESTS_MAX);
      addRecent(result.items);
      pending = Object.assign({}, store);
      flush();
      return true;
    },

    /* QO'SHIMCHA (shartnomaga zid emas): mashq natijasini levelFor()
       uchun yozish. recordTest({mode:'practice'}) ham shu yerga keladi. */
    recordPractice: recordPractice,

    /* [{ at, iq, lo, hi, n, correct, reliable, byType, theta, se }] —
       eskidan yangiga. Har chaqiriqda yangi obyektlar: chaqiruvchi
       o'zgartirsa ham saqlangan tarix buzilmaydi. */
    testHistory: function () {
      return store.tests.map(e => {
        const byType = {};
        Object.keys(e.byType).forEach(k => { byType[k] = { n: e.byType[k][0], correct: e.byType[k][1] }; });
        return { at: e.at, iq: e.iq, lo: e.lo, hi: e.hi, n: e.n, correct: e.correct,
                 reliable: e.reliable, byType: byType, theta: e.theta, se: e.se };
      });
    },

    /* Mashq darajasi (1..10) — shu turdagi so'nggi ≤ 30 javobdan
       (test va mashq aralash, vaqt tartibida).

       QANDAY: javoblar [b, k, to'g'ri] IQ.score.estimate ga beriladi
       (3PL, EAP, prior N(0,1)) → θ; daraja = IQ.score.nextLevel(θ)
       tasodifsiz, ya'ni shu θ uchun eng ko'p ma'lumot beradigan daraja.
       U yerda P(to'g'ri) ≈ 0.68: mashq uchun "qiyin, lekin
       yengiladigan" nuqta.

       NEGA SHUNDAY: (1) byType dagi ulushning o'zi yetmaydi — adaptiv
       testda hamma ~68% topadi, ulush darajani emas, adaptivlikni
       o'lchaydi; savol qiyinligi (b) bilan birga o'qish kerak.
       (2) Prior kam ma'lumotni o'rtaga tortadi: 2 ta to'g'ri javob
       odamni 5 dan 10 ga otib yubormaydi. (3) Faqat so'nggi 30 ta —
       mashq qilib o'sgan odam eski natijasiga bog'lanib qolmaydi.

       Ma'lumot yo'q (yoki IQ yadrosi yuklanmagan) — 5, o'rta daraja. */
    levelFor: function (type) {
      const list = okType(type) ? store.iqRecent[type] : null;
      if (!list || !list.length) return 5;
      const S = window.IQ && window.IQ.score;
      if (!S || typeof S.estimate !== 'function' || typeof S.nextLevel !== 'function') return 5;
      try {
        const est = S.estimate(list.map(r => ({ b: r[0], k: r[1], correct: r[2] === 1 })));
        const lv = S.nextLevel(est.theta);
        return isInt(lv, 1, 10) ? lv : 5;
      } catch (e) { return 5; }
    },

    /* Serverga yuborilmagan javoblar soni. Sinxronizatsiya kelganda
       (Faza 4) shu navbat bo'shatiladi. */
    queued: function () {
      // Xotiradagi navbat diskdagidan yangiroq bo'lishi mumkin (hali
      // yozilmagan javoblar) — shuning uchun avval u so'raladi.
      if (queue) return Math.min(queue.length, QUEUE_MAX);
      const q = read(QUEUE_KEY);
      return Array.isArray(q) ? q.length : 0;
    },

    /* Hammasini tozalash. Hozir interfeysda tugmasi yo'q — u
       sozlamalarga qo'shilganda shu funksiya chaqiriladi. */
    reset: function () {
      store = blank();
      store.day = dayKey();
      orphans = { wrong: [], saved: [], signs: [] };
      pending = null;
      queue = [];
      queueDirty = false;
      scoredIdx = null;
      if (timer) { clearTimeout(timer); timer = null; }
      try { localStorage.removeItem(KEY); localStorage.removeItem(QUEUE_KEY); }
      catch (e) {}
    },
  };

  /* client_uuid — idempotentlik kaliti (REJA.md §3). Navbat ikki marta
     yuborilsa server ikkinchisini e'tiborsiz qoldiradi. crypto.randomUUID
     eski WebView'da bo'lmasligi mumkin, shuning uchun zaxira yo'l bor. */
  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    const b = new Uint8Array(16);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(b);
    else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' +
           h.slice(16, 20) + '-' + h.slice(20);
  }
})();
