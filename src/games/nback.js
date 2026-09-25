/* ─────────────────────────────────────────────────────────────────────────
   src/games/nback.js — "N-orqaga" (ishchi xotira, harfli n-back)

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
   da — "tez". Tez ≥ 3 ta VA javoblarning ≥ 10% i → points = 0.
   nextLevel: H − F ≥ 0.8 → +1, < 0.4 → −1 (1..10).

   REPLAY: harflar rejalashtirilgan vaqtda almashadi; jurnalga start,
   qabul qilingan javoblar va harf almashtirgan tick'lar yoziladi ("+"
   ko'rinishi — faqat ko'rinish, yozilmaydi).
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const IQ = root.IQ;

  const TRIALS = 24, MATCHES = 8;
  const LEAD_MS = 600, BLANK_MS = 400;
  const FAST_MS = 120;
  const LETTERS = ['B', 'D', 'F', 'K', 'L', 'M', 'N', 'R', 'S', 'T'];

  const T = (uz, ru) => ({ uz, ru });

  const nOf = L => (L <= 3 ? 1 : L <= 7 ? 2 : 3);
  const periodMs = L => 3000 - 100 * L;

  const BTN_START = { id: 'start', label: T('Boshlash', 'Начать'), kind: 'primary' };
  const BTN_YES = { id: 'yes', label: T('Mos', 'Совпадает'), kind: 'primary' };
  const BTN_NO = { id: 'no', label: T('Mos emas', 'Не совпадает'), kind: 'secondary' };

  const backText = n => (n === 1
    ? T('oldingi harf', 'предыдущей буквой')
    : T(n + ' qadam oldingi harf', 'буквой ' + n + ' шага назад'));

  IQ.games.register({
    id: 'nback',
    skill: 'memory',
    title: T('N-orqaga', 'N-назад'),
    desc: T('Harf bir necha qadam oldingisi bilan bir xilmi — tez va aniq javob bering',
            'Совпадает ли буква с той, что была несколько шагов назад? Отвечайте быстро и точно'),

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
      let lastNow = null, t0 = null, tEnd = null;
      let k = -1;                           // joriy harf (−1 — tayyorlanish)
      let answer = null;                    // joriy harfga javob: 'yes' | 'no' | null
      let lastOk = false;
      let blank = false;                    // "+" ko'rinib turibdimi (faqat ko'rinish)
      let hits = 0, matchWrong = 0, rejects = 0, nonWrong = 0;
      let answers = 0, fast = 0;

      const onset = i => t0 + LEAD_MS + i * P;
      const judged = () => hits + matchWrong + rejects + nonWrong;

      function clock(now) {
        let t = (typeof now === 'number' && isFinite(now)) ? now : (lastNow === null ? 0 : lastNow);
        if (lastNow !== null && t < lastNow) t = lastNow;
        lastNow = t;
        return t;
      }

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
        if (advance(t)) log.push({ t, k: 'tick', v: null });
        blank = blankAt(t);
        return t;
      }

      function rates() {
        const H = hits / MATCHES;
        const F = nonWrong / (TRIALS - MATCHES);
        return Math.max(0, H - F);
      }

      function points() {
        const bot = fast >= 3 && fast * 10 >= answers;
        return bot ? 0 : Math.round(rates() * (50 + 10 * N + 5 * L));
      }

      function hud() {
        return [
          { label: T('Harf', 'Буква'), value: Math.max(0, Math.min(TRIALS, k - N + 1)) + '/' + TRIALS },
          { label: T('To\'g\'ri', 'Верно'), value: String(hits + rejects) },
          { label: T('Orqaga', 'Назад'), value: String(N) },
        ];
      }

      const game = {
        get done() { return phase === 'done'; },

        tick(now) {
          const n = log.length, b = blank;
          step(now);
          return log.length !== n || b !== blank;
        },

        tap() { /* bu o'yinda panjara yo'q — bosish e'tiborsiz */ },

        press(id, now) {
          const t = step(now);
          if (phase === 'intro') {
            if (id !== 'start') return;
            log.push({ t, k: 'press', v: id });
            t0 = t;
            phase = 'show';
            k = -1;
            blank = blankAt(t);
            return;
          }
          if (phase !== 'input' || (id !== 'yes' && id !== 'no')) return;
          log.push({ t, k: 'press', v: id });
          answers++;
          if (t - onset(k) < FAST_MS) fast++;
          answer = id;
          if (isMatch[k]) { if (id === 'yes') hits++; else matchWrong++; }
          else if (id === 'no') rejects++; else nonWrong++;
          lastOk = (id === 'yes') === isMatch[k];
          phase = 'feedback';
        },

        log: () => log.map(e => ({ t: e.t, k: e.k, v: e.v })),

        view() {
          if (phase === 'intro') {
            const b = backText(N);
            return {
              phase,
              prompt: T('Harflar birma-bir chiqadi. Har harf ' + b.uz + ' bilan bir xil bo\'lsa — "Mos", aks holda — "Mos emas".',
                        'Буквы появляются по одной. Если буква совпадает с ' + b.ru + ' — «Совпадает», иначе — «Не совпадает».'),
              hud: hud(), display: null, grid: null, buttons: [BTN_START], progress: 0,
            };
          }
          if (phase === 'done') {
            return {
              phase,
              prompt: T('O\'yin tugadi', 'Игра окончена'),
              hud: hud(),
              display: {
                kind: 'text',
                uz: 'To\'g\'ri javoblar: ' + (hits + rejects) + '/' + TRIALS,
                ru: 'Верных ответов: ' + (hits + rejects) + '/' + TRIALS,
              },
              grid: null, buttons: [], progress: 1,
            };
          }
          const ch = blank ? '+' : seq[k];
          let prompt;
          const b = backText(N);
          if (phase === 'show') prompt = k < 0 ? T('Tayyorlaning…', 'Приготовьтесь…') : T('Eslab qoling', 'Запоминайте');
          else if (phase === 'input') prompt = T('Bu harf ' + b.uz + ' bilan bir xilmi?', 'Совпадает ли буква с ' + b.ru + '?');
          else prompt = lastOk ? T('To\'g\'ri!', 'Верно!') : T('Xato', 'Ошибка');
          return {
            phase, prompt, hud: hud(),
            display: { kind: 'text', uz: ch, ru: ch },
            grid: null,
            buttons: phase === 'input' ? [BTN_YES, BTN_NO] : [],
            progress: Math.min(1, judged() / TRIALS),
          };
        },

        result() {
          const d = phase === 'done';
          const s = rates();
          const next = !d ? L : s >= 0.8 ? L + 1 : s < 0.4 ? L - 1 : L;
          return {
            score: Math.round(100 * s),
            points: points(),
            correct: hits + rejects,
            total: d ? TRIALS : judged(),
            durationMs: t0 === null ? 0 : (d ? tEnd : lastNow) - t0,
            nextLevel: Math.max(1, Math.min(10, next)),
          };
        },
      };
      return game;
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
