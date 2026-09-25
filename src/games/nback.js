/* ─────────────────────────────────────────────────────────────────────────
   src/games/nback.js — "Harf xotirasi" (ishchi xotira, harfli n-back)

   QOIDA: ekranda harflar ketma-ket, bir tekis sur'atda chiqadi. Har
   harf uchun: u n qadam oldingi harf bilan BIR XILmi? — "Mos" yoki
   "Mos emas". Birinchi n ta harf faqat eslab qolinadi ('show'), undan
   keyingi 24 tasi baholanadi ('input' → javobdan keyin 'feedback').
   Javob berilmasa, keyingi harf chiqqanda — javobsiz (xato) hisoblanadi.
   Har harf davrining oxirgi 400 ms ida "+" ko'rinadi — bir xil harf
   ketma-ket kelganda ham yangi harf chiqqani seziladi.

   Darajaga bog'liq:
     n      = daraja ≤3: 1, ≤7: 2, aks holda 3
     davr   = 3000 − 100·daraja ms (1→2.9 s … 10→2.0 s)
     o'yin  = (n + 24) davr + 600 ms tayyorlanish ≈ 50–75 s
   24 tadan aniq 8 tasi mos (1/3), qolganlari aniq mos EMAS.

   BAHO: H = mos harflarda "Mos" ulushi; F = mos bo'lmaganlarda "Mos
   emas" dan boshqa har qanday holat (noto'g'ri yoki javobsiz) ulushi.
   "Hammasiga Mos" (H=1, F=1) ham, "hech narsa bosmaslik" ham 0 beradi —
   tasodifiy bosish ball keltirmaydi.
     score  = round(100 · max(0, H − F))
     points = round(max(0, H − F) · (50 + 10·n + 5·daraja))
              mukammal: 1-daraja 65, 5-daraja 95, 10-daraja 130
   BOTGA QARSHI: javob harf chiqqanidan (rejalashtirilgan vaqt) < 120 ms
   da — "tez". Tez ≥ 3 ta VA javoblarning ≥ 10% i → flagged: points = 0,
   daraja o'zgarmaydi. Sababi done-ko'rinishning display matnida.
   nextLevel: H − F ≥ 0.8 → +1, < 0.4 → −1 (1..10).

   PAUZA: pause(now) / resume(now) (yoki press('pause'|'resume')). Pauzada
   harflar oqimi to'xtaydi (o'yin vaqti), harf yashiriladi, javoblar
   e'tiborsiz; davom etgach RESUME_MS "Tayyorlaning…" ("+"), keyin oqim
   to'xtagan joyidan davom etadi. "Davom etish" tugmasi "Mos" bilan bir
   joyda — tayyorlanish oralig'i tasodifiy ikkinchi bosishni yutadi.

   REPLAY: harflar rejalashtirilgan (o'yin) vaqtda almashadi; jurnalga
   kiritilgan DEVOR vaqti bilan start, qabul qilingan javoblar, harf
   almashtirgan tick'lar va pause/resume yoziladi ("+" ko'rinishi — faqat
   ko'rinish, yozilmaydi).

   Matnlar: T(uz, ru, en), langs: ['uz','ru','en'] (CONTRACT §2, §9).
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const IQ = root.IQ;

  const TRIALS = 24, MATCHES = 8;
  const LEAD_MS = 600, BLANK_MS = 400;
  const FAST_MS = 120;
  const RESUME_MS = 600;
  const LETTERS = ['B', 'D', 'F', 'K', 'L', 'M', 'N', 'R', 'S', 'T'];

  const T = (uz, ru, en) => ({ uz, ru, en });

  const nOf = L => (L <= 3 ? 1 : L <= 7 ? 2 : 3);
  const periodMs = L => 3000 - 100 * L;

  const BTN_START = { id: 'start', label: T('Boshlash', 'Начать', 'Start'), kind: 'primary' };
  const BTN_YES = { id: 'yes', label: T('Mos', 'Совпадает', 'Match'), kind: 'primary' };
  const BTN_NO = { id: 'no', label: T('Mos emas', 'Не совпадает', 'No match'), kind: 'secondary' };
  const BTN_RESUME = { id: 'resume', label: T('Davom etish', 'Продолжить', 'Resume'), kind: 'primary' };
  const P_PAUSED = T('Vaqt toʻxtatildi', 'Время остановлено', 'The clock is stopped');
  const P_READY = T('Tayyorlaning…', 'Приготовьтесь…', 'Get ready…');
  const P_OVER = T('Oʻyin tugadi', 'Игра окончена', 'Game over');
  const BOT = T('Juda tez bosishlar — ball berilmadi', 'Слишком быстрые нажатия — баллы не начислены', 'Taps too fast — no points awarded');
  const text = s => ({ kind: 'text', uz: s, ru: s, en: s });

  /* Savol (intro va 'input' da deyarli bir xil — matn uzunligi barqaror). */
  const question = (n, each) => (n === 1
    ? T((each ? 'Har bir' : 'Bu') + ' harf oldingi harf bilan bir xilmi?',
        (each ? 'Совпадает ли каждая буква' : 'Совпадает ли буква') + ' с предыдущей?',
        'Is ' + (each ? 'each' : 'this') + ' letter the same as the one before it?')
    : T((each ? 'Har bir' : 'Bu') + ' harf ' + n + ' qadam oldingi harf bilan bir xilmi?',
        (each ? 'Совпадает ли каждая буква' : 'Совпадает ли буква') + ' с буквой ' + n + ' шага назад?',
        'Is ' + (each ? 'each' : 'this') + ' letter the same as the one ' + n + ' steps back?'));

  IQ.games.register({
    id: 'nback',
    skill: 'memory',
    langs: ['uz', 'ru', 'en'],
    title: T('Harf xotirasi', 'Память на буквы', 'Letter memory'),
    desc: T('Harf bir necha qadam oldingisi bilan bir xilmi — tez va aniq javob bering',
            'Совпадает ли буква с той, что была несколько шагов назад? Отвечайте быстро и точно',
            'Is the letter the same as the one a few steps back? Answer quickly and accurately'),

    create(seed, level) {
      const L = Math.max(1, Math.min(10, level | 0 || 1));
      const r = IQ.rng(seed);
      const N = nOf(L), P = periodMs(L), COUNT = N + TRIALS;

      /* Ketma-ketlik: baholanadigan 24 tadan aniq 8 tasi mos. */
      const isMatch = new Array(COUNT).fill(false);
      r.shuffle(Array.from({ length: TRIALS }, (_, i) => i < MATCHES)).forEach((m, j) => { isMatch[N + j] = m; });
      const seq = [];
      for (let k = 0; k < COUNT; k++) {
        if (k < N) seq.push(r.pick(LETTERS));
        else if (isMatch[k]) seq.push(seq[k - N]);
        else seq.push(r.pick(LETTERS.filter(c => c !== seq[k - N])));
      }

      const log = [];
      let phase = 'intro';
      let lastNow = null, t0 = null, tEnd = null;     // o'yin vaqti
      let k = -1;                           // joriy harf (−1 — tayyorlanish)
      let answer = null;                    // joriy harfga javob: 'yes' | 'no' | null
      let lastOk = false;
      let blank = false;                    // "+" ko'rinib turibdimi (faqat ko'rinish)
      let hits = 0, matchWrong = 0, rejects = 0, nonWrong = 0;
      let answers = 0, fast = 0;

      const onset = i => t0 + LEAD_MS + i * P;
      const judged = () => hits + matchWrong + rejects + nonWrong;

      /* Devor vaqti → o'yin vaqti (matrix-memory.js dagi kabi): wall —
         tozalangan devor vaqti, off — pauzalar yig'indisi, hold — o'yin
         vaqti g da to'xtagan, devor vaqti `until` gacha (Infinity — pauza). */
      let wall = null, off = 0, hold = null;
      function clock(now) {
        let w = (typeof now === 'number' && isFinite(now)) ? now : (wall === null ? 0 : wall);
        if (wall !== null && w < wall) w = wall;
        wall = w;
        const t = hold && w < hold.until ? hold.g : w - off;
        lastNow = t;
        return t;
      }
      const paused = () => hold !== null && hold.until === Infinity;
      const holding = () => hold !== null && wall < hold.until;
      const running = () => phase !== 'intro' && phase !== 'done';
      const push = (kind, v) => log.push({ t: wall, k: kind, v });

      /* Joriy harfni yopadi: javob bo'lmasa — xato hisoblanadi. */
      function closeTrial() {
        if (k < N || answer !== null) return;
        if (isMatch[k]) matchWrong++; else nonWrong++;
      }

      function advance(now) {
        let changed = false;
        while (phase !== 'intro' && phase !== 'done' && now >= onset(k + 1)) {
          changed = true;
          closeTrial();
          k++;
          answer = null;
          if (k >= COUNT) { phase = 'done'; tEnd = onset(COUNT); k = COUNT - 1; break; }
          phase = k < N ? 'show' : 'input';
        }
        return changed;
      }

      function blankAt(now) {
        if (phase === 'intro' || phase === 'done') return false;
        if (k < 0) return true;
        return now >= onset(k + 1) - BLANK_MS;
      }

      function step(now) {
        const t = clock(now);
        if (advance(t)) push('tick', null);
        blank = blankAt(t);
        return t;
      }

      function rates() {
        const H = hits / MATCHES;
        const F = nonWrong / (TRIALS - MATCHES);
        return Math.max(0, H - F);
      }

      const flagged = () => fast >= 3 && fast * 10 >= answers;
      const points = () => (flagged() ? 0 : Math.round(rates() * (50 + 10 * N + 5 * L)));

      /* 3-uya — N ("2 · qadam oldin"): daraja bilan o'zgaradi (1 → 2 → 3). */
      function hud() {
        return [
          { label: T('Harf', 'Буква', 'Letter'), value: Math.max(0, Math.min(TRIALS, k - N + 1)) + '/' + TRIALS },
          { label: T('Toʻgʻri', 'Верно', 'Correct'), value: String(hits + rejects) },
          { label: T('Qadam oldin', 'Шагов назад', 'Steps back'), value: String(N) },
        ];
      }

      const game = {
        get done() { return phase === 'done'; },
        get paused() { return paused(); },

        tick(now) {
          const n = log.length, b = blank, h = holding();
          step(now);
          return log.length !== n || b !== blank || h !== holding();
        },

        tap() { /* bu o'yinda panjara yo'q — bosish e'tiborsiz */ },

        press(id, now) {
          if (id === 'pause') { game.pause(now); return; }
          if (id === 'resume') { game.resume(now); return; }
          const t = step(now);
          if (holding()) return;
          if (phase === 'intro') {
            if (id !== 'start') return;
            push('press', id);
            t0 = t;
            phase = 'show';
            k = -1;
            blank = blankAt(t);
            return;
          }
          if (phase !== 'input' || (id !== 'yes' && id !== 'no')) return;
          push('press', id);
          answers++;
          if (t - onset(k) < FAST_MS) fast++;
          answer = id;
          if (isMatch[k]) { if (id === 'yes') hits++; else matchWrong++; }
          else if (id === 'no') rejects++; else nonWrong++;
          lastOk = (id === 'yes') === isMatch[k];
          phase = 'feedback';
        },

        /* O'yin vaqtini to'xtatadi. Faqat o'yin paytida; true — to'xtadi. */
        pause(now) {
          const t = step(now);
          if (!running() || paused()) return false;
          hold = { g: t, until: Infinity };
          push('press', 'pause');
          return true;
        },

        /* Davom etadi: RESUME_MS "Tayyorlaning…", keyin vaqt yuradi. */
        resume(now) {
          clock(now);
          if (!paused()) return false;
          const until = wall + RESUME_MS;
          off = until - hold.g;
          hold = { g: hold.g, until };
          push('press', 'resume');
          return true;
        },

        log: () => log.map(e => ({ t: e.t, k: e.k, v: e.v })),

        view() {
          if (phase === 'intro') {
            return {
              phase, paused: false,
              prompt: question(N, true),
              hud: hud(), display: text('+'), grid: null, buttons: [BTN_START], progress: 0,
            };
          }
          if (phase === 'done') {
            const bot = flagged(), nm = TRIALS - MATCHES;
            return {
              phase, paused: false,
              prompt: bot ? BOT : P_OVER,
              hud: hud(),
              /* Ball H − F dan chiqadi — shu ikkisi ko'rsatiladi (to'g'ri
                 javoblar jami o'yin yakunidagi uyada bor). */
              display: bot ? Object.assign({ kind: 'text' }, BOT) : {
                kind: 'text',
                uz: 'Moslar: ' + hits + '/' + MATCHES + ' · mos emaslar: ' + rejects + '/' + nm,
                ru: 'Совпадения: ' + hits + '/' + MATCHES + ' · несовпадения: ' + rejects + '/' + nm,
                en: 'Matches: ' + hits + '/' + MATCHES + ' · non-matches: ' + rejects + '/' + nm,
              },
              grid: null, buttons: [], progress: 1,
            };
          }
          if (holding()) {
            const p = paused();
            return {
              phase, paused: p, prompt: p ? P_PAUSED : P_READY, hud: hud(),
              display: p ? { kind: 'text', uz: 'Pauza', ru: 'Пауза', en: 'Paused' } : text('+'),
              grid: null, buttons: p ? [BTN_RESUME] : [],
              progress: Math.min(1, judged() / TRIALS),
            };
          }
          const ch = blank ? '+' : seq[k];
          let prompt;
          if (phase === 'show') prompt = k < 0 ? P_READY : T('Eslab qoling', 'Запоминайте', 'Memorize');
          else if (phase === 'input') prompt = question(N, false);
          else prompt = lastOk ? T('Toʻgʻri!', 'Верно!', 'Correct!') : T('Xato', 'Ошибка', 'Wrong');
          return {
            phase, paused: false, prompt, hud: hud(),
            display: text(ch),
            grid: null,
            buttons: phase === 'input' ? [BTN_YES, BTN_NO] : [],
            progress: Math.min(1, judged() / TRIALS),
          };
        },

        result() {
          const d = phase === 'done', bot = flagged();
          const s = rates();
          const next = !d || bot ? L : s >= 0.8 ? L + 1 : s < 0.4 ? L - 1 : L;
          return {
            score: Math.round(100 * s),
            points: points(),
            correct: hits + rejects,
            total: d ? TRIALS : judged(),
            durationMs: t0 === null ? 0 : (d ? tEnd : lastNow) - t0,
            nextLevel: Math.max(1, Math.min(10, next)),
            flagged: bot,
          };
        },
      };
      return game;
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
