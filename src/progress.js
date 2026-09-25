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
    };
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

  const tests = [];   // VAQTINCHALIK — recordTest() qolipi uchun

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

    /* ── IQ testi natijalari — VAQTINCHALIK QOLIP ────────────────────
       score agenti bularni diskka saqlanadigan qilib almashtiradi
       (src/iq/CONTRACT.md §5). Hozir faqat xotirada. */
    recordTest: function (result) {
      tests.push({ at: Date.now(), iq: result.iq, lo: result.lo, hi: result.hi,
        n: result.n, correct: result.correct, reliable: !!result.reliable,
        byType: result.byType });
    },
    testHistory: function () { return tests.slice(); },
    levelFor: function (type) { return 5; },

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
