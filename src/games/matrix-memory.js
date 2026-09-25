/* ─────────────────────────────────────────────────────────────────────────
   src/games/matrix-memory.js — "Kataklar xotirasi" (ko'rish-fazoviy xotira)

   QOIDA: panjarada bir nechta katak bir lahza yonadi ('show'), keyin
   o'chadi ('input') — foydalanuvchi o'sha kataklarni istalgan tartibda
   bosadi. Hammasi topilsa — raund muvaffaqiyatli. Birinchi noto'g'ri
   bosish yoki vaqt tugashi — raund xato. 10 ta raund (≈ 1–1.5 daqiqa).

   MOSLASHUV (sessiya ichida): muvaffaqiyat → keyingi raundda +1 katak,
   xato → −1 katak (2..14). Katak ko'paysa panjara ham kattalashadi
   (3×3 → 6×6). Boshlang'ich son va panjara darajaga bog'liq:
     katak soni  = 3 + ⌊(daraja − 1) / 2⌋        (1→3 … 10→7)
     panjara     = daraja ≤2: 3×3, ≤5: 4×4, ≤8: 5×5, aks holda 6×6
     ko'rsatish  = max(1000, 1400 + 220·katak − 60·daraja) ms

   BALL (liga uchun, points):
     muvaffaqiyatli raund → 1.5 × katak soni
     xato raund           → 0.5 × shu raundda topilgan katak
     points = round(yig'indi). Normal o'yin ≈ 40–110, mukammal ≈ 130–170.
   BOTGA QARSHI: bir raund ichida ketma-ket ikki bosish orasi < 120 ms
   bo'lsa — "tez" (raundning birinchi bosishi hisoblanmaydi: odam katak
   o'chishini kutib turib darhol bosishi mumkin). Tez bosishlar ≥ 3 ta VA hamma
   bosishlarning ≥ 10% i bo'lsa — flagged: points = 0, daraja o'zgarmaydi
   (score saqlanadi). Sababi done-ko'rinishning display matnida.

   score = to'liq eslab qolingan eng ko'p katak soni (0 — hech biri).
   nextLevel: muvaffaqiyat ulushi ≥ 0.8 → +1, < 0.5 → −1 (1..10).

   PAUZA: pause(now) / resume(now) (yoki press('pause'|'resume')).
   Pauzada o'yin vaqti to'xtaydi, panjara yashiriladi (eslab qolish
   uchun qo'shimcha vaqt yo'q), bosishlar e'tiborsiz. Davom etgach
   RESUME_MS (devor vaqti) "Tayyorlaning…" — o'yin vaqti hali to'xtagan.
   Ikkalasi jurnalga 'press' bo'lib yoziladi — replay aynan tiklaydi.

   REPLAY: hamma o'tishlar REJALASHTIRILGAN (o'yin) vaqtda. Jurnalga
   kiritilgan DEVOR vaqti (now) yoziladi, faqat holatni o'zgartirgan
   hodisalar: start, qabul qilingan bosish, faza o'zgartirgan tick,
   pause/resume. Shuning uchun IQ.games.replay aynan shu result() va log()
   ni beradi.

   Matnlar: T(uz, ru, en), langs: ['uz','ru','en'] (CONTRACT §2, §9).
   Vaqt faqat `now` argumentidan, tasodif faqat IQ.rng(seed) dan.
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const IQ = root.IQ;

  const ROUNDS = 10;
  const FEEDBACK_MS = 900;
  const MIN_COUNT = 2, MAX_COUNT = 14;
  const FAST_MS = 120;                      // odam bunchalik tez ketma-ket bosa olmaydi
  const RESUME_MS = 600;

  const T = (uz, ru, en) => ({ uz, ru, en });

  const startCount = L => 3 + ((L - 1) >> 1);
  const levelCols = L => (L <= 2 ? 3 : L <= 5 ? 4 : L <= 8 ? 5 : 6);
  const countCols = c => (c <= 4 ? 3 : c <= 7 ? 4 : c <= 10 ? 5 : 6);
  const showMs = (c, L) => Math.max(1000, 1400 + 220 * c - 60 * L);
  const inputMs = c => 5000 + 1200 * c;

  const BTN_START = { id: 'start', label: T('Boshlash', 'Начать', 'Start'), kind: 'primary' };
  const BTN_RESUME = { id: 'resume', label: T('Davom etish', 'Продолжить', 'Resume'), kind: 'primary' };
  const P_PAUSED = T('Vaqt toʻxtatildi', 'Время остановлено', 'The clock is stopped');
  const P_READY = T('Tayyorlaning…', 'Приготовьтесь…', 'Get ready…');
  const P_OVER = T('Oʻyin tugadi', 'Игра окончена', 'Game over');
  const BOT = T('Juda tez bosishlar — ball berilmadi', 'Слишком быстрые нажатия — баллы не начислены', 'Taps too fast — no points awarded');

  IQ.games.register({
    id: 'matrix-memory',
    skill: 'memory',
    langs: ['uz', 'ru', 'en'],
    title: T('Kataklar xotirasi', 'Память на клетки', 'Grid memory'),
    desc: T('Yongan kataklarni eslab qoling va ularni qayta toping',
            'Запомните подсвеченные клетки и найдите их снова',
            'Remember the highlighted cells and find them again'),

    create(seed, level) {
      const L = Math.max(1, Math.min(10, level | 0 || 1));
      const r = IQ.rng(seed);
      const log = [];

      let phase = 'intro';
      let lastNow = null, t0 = null, tEnd = null;     // o'yin vaqti
      let round = 0;                        // joriy raund (0 dan)
      let count = startCount(L);            // KEYINGI raunddagi katak soni
      let cur = null;                       // { cols, n, count, target[], picked[], found, wrong, ok }
      let phaseEnd = 0;                     // keyingi rejalashtirilgan o'tish vaqti
      let raw = 0, successes = 0, best = 0, played = 0;
      let inputs = 0, fast = 0, lastInput = 0;

      /* Devor vaqti → o'yin vaqti. wall — tozalangan (son, orqaga
         ketmaydi); off — pauzalar yig'indisi; hold — o'yin vaqti g da
         to'xtagan, devor vaqti `until` gacha (Infinity — pauza). */
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
      const push = (k, v) => log.push({ t: wall, k, v });

      function startRound(t) {
        const cols = Math.max(levelCols(L), countCols(count));
        const n = cols * cols;
        const order = r.shuffle(Array.from({ length: n }, (_, i) => i));
        const target = new Array(n).fill(false);
        for (let i = 0; i < count; i++) target[order[i]] = true;
        cur = { cols, n, count, target, picked: new Array(n).fill(false), found: 0, wrong: -1, ok: false };
        phase = 'show';
        phaseEnd = t + showMs(count, L);
      }

      function finishRound(ok, t) {
        played++;
        cur.ok = ok;
        if (ok) {
          successes++;
          raw += 1.5 * cur.count;
          if (cur.count > best) best = cur.count;
          count = Math.min(MAX_COUNT, cur.count + 1);
        } else {
          raw += 0.5 * cur.found;
          count = Math.max(MIN_COUNT, cur.count - 1);
        }
        phase = 'feedback';
        phaseEnd = t + FEEDBACK_MS;
      }

      /* Muddati kelgan hamma o'tishlarni bajaradi. O'tish bo'lsa — true. */
      function advance(now) {
        let changed = false;
        while ((phase === 'show' || phase === 'input' || phase === 'feedback') && now >= phaseEnd) {
          changed = true;
          const t = phaseEnd;
          if (phase === 'show') {
            phase = 'input';
            phaseEnd = t + inputMs(cur.count);
            lastInput = -Infinity;
          } else if (phase === 'input') {
            finishRound(false, t);          // vaqt tugadi
          } else if (round + 1 >= ROUNDS) {
            phase = 'done';
            tEnd = t;
          } else {
            round++;
            startRound(t);
          }
        }
        return changed;
      }

      function step(now) {
        const t = clock(now);
        if (advance(t)) push('tick', null);
        return t;
      }

      const flagged = () => fast >= 3 && fast * 10 >= inputs;
      const points = () => (flagged() ? 0 : Math.round(raw));

      /* Panjara shakli hamma fazada bir xil (intro va pauzada ham) —
         ekran sakramaydi. */
      function blankGrid(cols, state) {
        return { cols, cells: Array.from({ length: cols * cols }, () => ({ label: '', state })) };
      }

      function cellsView() {
        const c = cur, out = [];
        for (let i = 0; i < c.n; i++) {
          let state = 'idle';
          if (phase === 'show') state = c.target[i] ? 'lit' : 'idle';
          else if (phase === 'input') state = c.picked[i] && c.target[i] ? 'ok' : 'idle';
          else if (phase === 'feedback') {
            if (i === c.wrong) state = 'bad';
            else if (c.target[i]) state = c.picked[i] ? 'ok' : 'lit';   // 'lit' — topilmay qolgani
          }
          out.push({ label: '', state });
        }
        return { cols: c.cols, cells: out };
      }

      function hud() {
        const shownRound = Math.min(round + 1, ROUNDS);
        return [
          { label: T('Raund', 'Раунд', 'Round'), value: shownRound + '/' + ROUNDS },
          { label: T('Ball', 'Баллы', 'Points'), value: String(points()) },
          { label: T('Kataklar', 'Клеток', 'Cells'), value: String(cur ? cur.count : count) },
        ];
      }

      const progress = () => Math.min(1, (round + (phase === 'feedback' ? 1 : 0)) / ROUNDS);

      const game = {
        get done() { return phase === 'done'; },
        get paused() { return paused(); },

        tick(now) {
          const n = log.length, h = holding();
          step(now);
          return log.length !== n || h !== holding();
        },

        tap(i, now) {
          const t = step(now);
          if (holding() || phase !== 'input' || !Number.isInteger(i) || i < 0 || i >= cur.n || cur.picked[i]) return;
          push('tap', i);
          inputs++;
          if (t - lastInput < FAST_MS) fast++;
          lastInput = t;
          cur.picked[i] = true;
          if (cur.target[i]) {
            cur.found++;
            if (cur.found === cur.count) finishRound(true, t);
          } else {
            cur.wrong = i;
            finishRound(false, t);
          }
        },

        press(id, now) {
          if (id === 'pause') { game.pause(now); return; }
          if (id === 'resume') { game.resume(now); return; }
          const t = step(now);
          if (id !== 'start' || phase !== 'intro') return;
          push('press', id);
          t0 = t;
          startRound(t);
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
              prompt: T('Kataklar bir lahza yonadi — eslab qoling, keyin ularni bosing',
                        'Клетки ненадолго подсветятся — запомните их и нажмите',
                        'Some cells light up briefly — remember them, then tap them'),
              hud: hud(), display: null,
              grid: blankGrid(Math.max(levelCols(L), countCols(count)), 'disabled'),
              buttons: [BTN_START], progress: 0,
            };
          }
          if (phase === 'done') {
            const bot = flagged();
            return {
              phase, paused: false,
              prompt: bot ? BOT : P_OVER,
              hud: hud(),
              display: bot ? Object.assign({ kind: 'text' }, BOT) : {
                kind: 'text',
                uz: 'Eng koʻp eslab qolingan kataklar: ' + best,
                ru: 'Больше всего запомнено клеток: ' + best,
                en: 'Most cells remembered: ' + best,
              },
              grid: blankGrid(cur.cols, 'disabled'), buttons: [], progress: 1,
            };
          }
          if (holding()) {
            const p = paused();
            return {
              phase, paused: p, prompt: p ? P_PAUSED : P_READY, hud: hud(), display: null,
              grid: blankGrid(cur.cols, 'hidden'), buttons: p ? [BTN_RESUME] : [], progress: progress(),
            };
          }
          let prompt;
          if (phase === 'show') prompt = T('Eslab qoling…', 'Запоминайте…', 'Memorize…');
          else if (phase === 'input') {
            const left = cur.count - cur.found;
            prompt = T('Yongan kataklarni bosing (qoldi: ' + left + ')',
                       'Нажмите клетки, которые светились (осталось: ' + left + ')',
                       'Tap the cells that lit up (' + left + ' left)');
          } else if (cur.ok) prompt = T('Toʻgʻri!', 'Верно!', 'Correct!');
          else if (cur.wrong >= 0) prompt = T('Xato. Topilmagan kataklar koʻrsatildi.', 'Ошибка. Показаны ненайденные клетки.', 'Wrong. The cells you missed are shown.');
          else prompt = T('Vaqt tugadi. Topilmagan kataklar koʻrsatildi.', 'Время вышло. Показаны ненайденные клетки.', 'Time’s up. The cells you missed are shown.');
          return {
            phase, paused: false, prompt, hud: hud(), display: null, grid: cellsView(), buttons: [],
            progress: progress(),
          };
        },

        result() {
          const d = phase === 'done', bot = flagged();
          const rate = played ? successes / played : 0;
          const next = !d || bot ? L : rate >= 0.8 ? L + 1 : rate < 0.5 ? L - 1 : L;
          return {
            score: best,
            points: points(),
            correct: successes,
            total: played,
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
