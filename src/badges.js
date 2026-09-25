/* ─────────────────────────────────────────────────────────────────────────
   BADGES — YUTUQ NISHONLARI (window.nzBadges, kalit nz-badges)

   21 ta nishon, faqat oʻynab olinadi (ARXITEKTURA §6.6). Sotib olinadigan
   kolleksiya nishonlari bu yerda emas — ular src/catalog.js da.

   QOIDALAR:

   1. IQ CHEGARASIGA BOGʻLIQ NISHON YOʻQ (CONTRACT §6). U natija daʼvosi
      boʻlardi va testni qayta-qayta topshirishga undardi. Shuning uchun
      hech bir qoida `stats` dan IQ natijasini oʻqimaydi — test buni
      Proxy orqali tekshiradi. Nomlarda «daho», «top %», «rasmiy» yoʻq.

   2. HECH QACHON QAYTARIB OLINMAYDI. Daraja pasaysa, liga tushsa yoki
      seriya uzilsa ham olingan nishon qoladi. `progress()` olingan
      nishon uchun doim toʻliq qiymatni koʻrsatadi.

   3. ORQAGA QARAB HISOBLANADI. 1.0 dan yangilangan foydalanuvchida
      birinchi `check()` shartlari bajarilgan hamma nishonni bir yoʻla
      beradi — har biri bir martalik, cheklov kerak emas.

   4. HAMYONNI BILMAYDI (§10.4). `check()` faqat yangi id larni
      qaytaradi. Tangani Main beradi:
        nzWallet.credit(nzBadges.info(id).coins, 'badge', 'b:' + id)
      Kalit bir martalik, shuning uchun takroriy chaqiruv xavfsiz.

   5. «Streak» soʻzi foydalanuvchiga koʻrinmaydi (koʻrib chiqish F27/F59:
      kirillda «стреак» boʻlib chiqardi). Shart matnida «ketma-ket kun»,
      «seriya» ishlatiladi.

   `stats` obyektini Main yigʻadi (§6.6):
     { answered, testsDone, longestStreak, bestWeekBall,
       levels: { matrix, series, spatial, verbal },
       games: { id: { plays, level } }, fixes,
       lastRun: { kind, n, correct }, profileComplete }
   Yetishmagan yoki buzilgan maydon 0 / false deb olinadi.

   Nomlar 80 px katakka 2 qatorda sigʻadi: ru/en da har soʻz ≤ 12 belgi
   (soʻz oʻrtasidan boʻlinmasin).
   ───────────────────────────────────────────────────────────────────── */

(function (root) {
  'use strict';

  const KEY = 'nz-badges';
  const V = 1;
  const ID_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
  const EARNED_MAX = 64;
  const COUNTER_MAX = 1000000;
  const COUNTERS = ['fixes'];

  /* Hisobga olinadigan oʻyinlar (demo emas). «Kashfiyotchi» — 6 tasining
     har birini kamida bir marta oʻynash. */
  const GAMES = ['flanker', 'matrix-memory', 'mental-math', 'nback', 'schulte', 'sequence'];

  const L = (uz, ru, en) => ({ uz: uz, ru: ru, en: en });
  const num = v => (typeof v === 'number' && isFinite(v) && v > 0 ? v : 0);
  const obj = v => (v && typeof v === 'object' ? v : {});

  function maxGameLevel(s) {
    const g = obj(s.games);
    let m = 0;
    Object.keys(g).forEach(id => {
      if (id === 'demo') return;
      m = Math.max(m, num(obj(g[id]).level));
    });
    return m;
  }
  function gamesPlayed(s) {
    const g = obj(s.games);
    return GAMES.filter(id => num(obj(g[id]).plays) >= 1).length;
  }
  /* «Xatosiz»: bitta toʻliq mashq, hammasi toʻgʻri. Takrorlash va test
     hisoblanmaydi. */
  function perfect(s) {
    const r = obj(s.lastRun);
    if (r.kind !== 'practice') return 0;
    const n = num(r.n), c = num(r.correct);
    return n >= 10 && c === n ? 10 : Math.min(c, 9);
  }

  /* tier: 'bronze' | 'silver' | 'gold' | 'league'. league — liga
     darajasi indeksi (Main LEAGUES: 2 Kumush … 5 Olmos), medalyon rangi. */
  const TABLE = [
    { id: 'first-test', coins: 20, tier: 'gold', target: 1, value: s => num(s.testsDone),
      name: L('Birinchi test', 'Первый тест', 'First test'),
      cond: L('IQ testni oxirigacha (30/30) yeching', 'Пройдите IQ-тест до конца (30/30)', 'Finish the IQ test (30/30)') },
    { id: 'answers-100', coins: 10, tier: 'bronze', target: 100, value: s => num(s.answered),
      name: L('Mashqchi I', 'Практик I', 'Trainee I'),
      cond: L('100 ta savolga javob bering', 'Ответьте на 100 вопросов', 'Answer 100 questions') },
    { id: 'answers-500', coins: 30, tier: 'silver', target: 500, value: s => num(s.answered),
      name: L('Mashqchi II', 'Практик II', 'Trainee II'),
      cond: L('500 ta savolga javob bering', 'Ответьте на 500 вопросов', 'Answer 500 questions') },
    { id: 'answers-2000', coins: 80, tier: 'gold', target: 2000, value: s => num(s.answered),
      name: L('Mashqchi III', 'Практик III', 'Trainee III'),
      cond: L('2 000 ta savolga javob bering', 'Ответьте на 2 000 вопросов', 'Answer 2,000 questions') },
    { id: 'perfect-10', coins: 20, tier: 'gold', target: 10, value: perfect,
      name: L('Xatosiz', 'Без ошибок', 'Flawless'),
      cond: L('Bitta mashqda 10/10 (takrorlash hisoblanmaydi)', '10/10 в одной тренировке (повтор не считается)', '10/10 in one practice (review doesn’t count)') },
    { id: 'fixer-20', coins: 20, tier: 'silver', target: 20, value: (s, c) => Math.max(num(s.fixes), num(c.fixes)),
      name: L('Tuzatuvchi', 'Работа над ошибками', 'Fixer'),
      cond: L('Xatolarimdan jami 20 ta savolni tuzating', 'Исправьте 20 вопросов из «Моих ошибок»', 'Fix 20 questions from My mistakes') },
    { id: 'matrix-7', coins: 30, tier: 'silver', target: 7, value: s => num(obj(s.levels).matrix),
      name: L('Matritsa ustasi', 'Мастер матриц', 'Matrix master'),
      cond: L('Matritsalarda 7-darajaga yeting', 'Достигните 7-го уровня в матрицах', 'Reach level 7 in Matrices') },
    { id: 'series-7', coins: 30, tier: 'silver', target: 7, value: s => num(obj(s.levels).series),
      name: L('Son ustasi', 'Мастер чисел', 'Number master'),
      cond: L('Son qatorlarida 7-darajaga yeting', 'Достигните 7-го уровня в числовых рядах', 'Reach level 7 in Number series') },
    { id: 'spatial-7', coins: 30, tier: 'silver', target: 7, value: s => num(obj(s.levels).spatial),
      name: L('Fazo ustasi', 'Пространство', 'Space master'),
      cond: L('Fazoviy tafakkurda 7-darajaga yeting', 'Достигните 7-го уровня в пространственном мышлении', 'Reach level 7 in Spatial reasoning') },
    { id: 'verbal-7', coins: 30, tier: 'silver', target: 7, value: s => num(obj(s.levels).verbal),
      name: L('Soʻz ustasi', 'Мастер слова', 'Word master'),
      cond: L('Ogʻzaki mantiqda 7-darajaga yeting', 'Достигните 7-го уровня в вербальной логике', 'Reach level 7 in Verbal logic') },
    { id: 'games-all', coins: 20, tier: 'bronze', target: GAMES.length, value: gamesPlayed,
      name: L('Kashfiyotchi', 'Разведчик', 'Explorer'),
      cond: L('6 ta oʻyinning har birini bir marta oʻynang', 'Сыграйте в каждую из 6 игр', 'Play each of the 6 games once') },
    { id: 'game-lv5', coins: 20, tier: 'silver', target: 5, value: maxGameLevel,
      name: L('Yuqori daraja', 'Высокий уровень', 'High level'),
      cond: L('Istalgan oʻyinda 5-darajaga yeting', 'Достигните 5-го уровня в любой игре', 'Reach level 5 in any game') },
    { id: 'game-lv10', coins: 60, tier: 'gold', target: 10, value: maxGameLevel,
      name: L('Choʻqqi', 'Вершина', 'Summit'),
      cond: L('Istalgan oʻyinda 10-darajaga yeting', 'Достигните 10-го уровня в любой игре', 'Reach level 10 in any game') },
    { id: 'streak-3', coins: 15, tier: 'bronze', target: 3, value: s => num(s.longestStreak),
      name: L('Olov I', 'Пламя I', 'Flame I'),
      cond: L('3 kun ketma-ket faol boʻling', 'Будьте активны 3 дня подряд', 'Be active 3 days in a row') },
    { id: 'streak-7', coins: 40, tier: 'silver', target: 7, value: s => num(s.longestStreak),
      name: L('Olov II', 'Пламя II', 'Flame II'),
      cond: L('7 kun ketma-ket faol boʻling', 'Будьте активны 7 дней подряд', 'Be active 7 days in a row') },
    { id: 'streak-30', coins: 150, tier: 'gold', target: 30, value: s => num(s.longestStreak),
      name: L('Olov III', 'Пламя III', 'Flame III'),
      cond: L('30 kun ketma-ket faol boʻling', 'Будьте активны 30 дней подряд', 'Be active 30 days in a row') },
    { id: 'league-silver', coins: 25, tier: 'league', league: 2, target: 500, value: s => num(s.bestWeekBall),
      name: L('Kumush', 'Серебро', 'Silver'),
      cond: L('Bir haftada 500 ball toʻplang', 'Наберите 500 баллов за неделю', 'Earn 500 points in one week') },
    { id: 'league-gold', coins: 50, tier: 'league', league: 3, target: 1200, value: s => num(s.bestWeekBall),
      name: L('Oltin', 'Золото', 'Gold'),
      cond: L('Bir haftada 1 200 ball toʻplang', 'Наберите 1 200 баллов за неделю', 'Earn 1,200 points in one week') },
    { id: 'league-platinum', coins: 80, tier: 'league', league: 4, target: 2500, value: s => num(s.bestWeekBall),
      name: L('Platina', 'Платина', 'Platinum'),
      cond: L('Bir haftada 2 500 ball toʻplang', 'Наберите 2 500 баллов за неделю', 'Earn 2,500 points in one week') },
    { id: 'league-diamond', coins: 100, tier: 'league', league: 5, target: 5000, value: s => num(s.bestWeekBall),
      name: L('Olmos', 'Алмаз', 'Diamond'),
      cond: L('Bir haftada 5 000 ball toʻplang', 'Наберите 5 000 баллов за неделю', 'Earn 5,000 points in one week') },
    { id: 'profile', coins: 10, tier: 'bronze', target: 1, value: s => (s.profileComplete === true ? 1 : 0),
      name: L('Tanishuv', 'Знакомство', 'Introduction'),
      cond: L('Nom, avatar (bosh harf emas) va bioni toʻldiring', 'Заполните имя, аватар (не инициал) и био', 'Add a name, an avatar (not an initial) and a bio') },
  ];
  const BY_ID = Object.create(null);
  TABLE.forEach(b => { BY_ID[b.id] = b; });

  function entry(b) {
    const o = { id: b.id, kind: 'achievement', shape: 'hex', coins: b.coins, tier: b.tier, target: b.target,
                name: Object.assign({}, b.name), cond: Object.assign({}, b.cond) };
    if (b.league !== undefined) o.league = b.league;
    return o;
  }

  /* ── Qurilma xotirasi ─────────────────────────────────────────────── */
  function ls() {
    try {
      if (root.localStorage) return root.localStorage;
      return typeof localStorage !== 'undefined' ? localStorage : null;
    } catch (e) { return null; }
  }
  function readRaw() {
    try { const s = ls(); const v = s ? s.getItem(KEY) : null; return v ? JSON.parse(v) : null; }
    catch (e) { return null; }
  }

  function blank() {
    return { v: V, earned: Object.create(null), seen: [], counters: { fixes: 0 } };
  }

  /* Notanish, lekin toʻgʻri shakldagi id lar saqlanib qoladi: yangiroq
     versiyada qoʻshilgan nishon eski versiyada yoʻqolmasin. */
  function sane(raw) {
    const b = blank();
    if (!raw || typeof raw !== 'object' || raw.v !== V) return b;
    if (raw.earned && typeof raw.earned === 'object') {
      Object.keys(raw.earned).slice(0, EARNED_MAX).forEach(k => {
        const t = raw.earned[k];
        if (ID_RE.test(k) && typeof t === 'number' && isFinite(t) && t > 0) b.earned[k] = t;
      });
    }
    if (Array.isArray(raw.seen)) {
      const s = Object.create(null);
      raw.seen.forEach(x => { if (typeof x === 'string' && b.earned[x] && !s[x]) { s[x] = 1; b.seen.push(x); } });
    }
    const c = obj(raw.counters);
    COUNTERS.forEach(k => { b.counters[k] = Math.min(COUNTER_MAX, Math.floor(num(c[k]))); });
    return b;
  }

  let readOnly = false;
  let S = load();
  function load() {
    const raw = readRaw();
    if (raw && typeof raw === 'object' && typeof raw.v === 'number' && raw.v > V) {
      readOnly = true;
      return blank();
    }
    return sane(raw);
  }
  function save() {
    if (readOnly) return false;
    try { const s = ls(); if (!s) return false; s.setItem(KEY, JSON.stringify(S)); return true; }
    catch (e) { return false; }
  }

  const nowOf = now => (typeof now === 'number' && isFinite(now) ? now : Date.now());

  root.nzBadges = {
    /* 21 ta yutuq, qatʼiy tartibda (nusxa). */
    catalogue: function () { return TABLE.map(entry); },

    info: function (id) { return BY_ID[id] ? entry(BY_ID[id]) : null; },

    /* { id: olingan vaqt (ms) } — faqat katalogdagi nishonlar. */
    earned: function () {
      const out = {};
      TABLE.forEach(b => { if (S.earned[b.id]) out[b.id] = S.earned[b.id]; });
      return out;
    },

    has: function (id) { return !!(BY_ID[id] && S.earned[id]); },

    /* «7/21» uchun. */
    summary: function () {
      let n = 0;
      TABLE.forEach(b => { if (S.earned[b.id]) n++; });
      return { earned: n, total: TABLE.length };
    },

    /* Shartlarni tekshiradi va YANGI olingan id larni qaytaradi (katalog
       tartibida). Olinganlar qayta qaytmaydi va hech qachon olib tashlanmaydi. */
    check: function (stats, now) {
      if (readOnly) return [];
      const s = obj(stats);
      const t = nowOf(now);
      const fresh = [];
      TABLE.forEach(b => {
        if (S.earned[b.id]) return;
        if (b.value(s, S.counters) >= b.target) { S.earned[b.id] = t; fresh.push(b.id); }
      });
      if (fresh.length) save();
      return fresh;
    },

    /* Nishon varagʻidagi «37/100». Notanish id → null. */
    progress: function (id, stats) {
      const b = BY_ID[id];
      if (!b) return null;
      if (S.earned[id]) return { n: b.target, target: b.target };
      return { n: Math.min(Math.floor(b.value(obj(stats), S.counters)), b.target), target: b.target };
    },

    /* Hisoblagich: bump('fixes') — Xatolarimdan savol chiqib ketganda.
       Notanish hisoblagich → null. */
    bump: function (counter, n) {
      if (COUNTERS.indexOf(counter) === -1) return null;
      const k = n === undefined ? 1 : Math.floor(num(n));
      if (readOnly) return S.counters[counter];
      S.counters[counter] = Math.min(COUNTER_MAX, S.counters[counter] + k);
      save();
      return S.counters[counter];
    },

    counters: function () { return Object.assign({}, S.counters); },

    /* Hali bayram kartasi koʻrsatilmagan nishonlar (katalog tartibida). */
    unseen: function () {
      return TABLE.filter(b => S.earned[b.id] && S.seen.indexOf(b.id) === -1).map(b => b.id);
    },

    markSeen: function (ids) {
      if (readOnly) return;
      let changed = false;
      (Array.isArray(ids) ? ids : [ids]).forEach(id => {
        if (typeof id === 'string' && S.earned[id] && S.seen.indexOf(id) === -1) { S.seen.push(id); changed = true; }
      });
      if (changed) save();
    },

    readOnly: function () { return readOnly; },

    reset: function () {
      S = blank();
      readOnly = false;
      try { const s = ls(); if (s) s.removeItem(KEY); } catch (e) {}
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
