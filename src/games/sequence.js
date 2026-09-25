/* ─────────────────────────────────────────────────────────────────────────
   src/games/sequence.js — "Kataklar tartibi" (Korsi bloklari uslubida)

   QOIDA: kataklar BIRMA-BIR yonadi ('show'), keyin foydalanuvchi ularni
   AYNAN SHU TARTIBDA bosadi ('input'). Hammasi to'g'ri — raund
   muvaffaqiyatli; birinchi noto'g'ri bosish yoki vaqt tugashi — xato.
   Ketma-ketlikda katak takrorlanmaydi. 10 ta raund (≈ 1–1.5 daqiqa).

   MOSLASHUV: muvaffaqiyat → uzunlik +1, xato → −1 (2..12). Uzunlik
   oshsa panjara ham kattalashadi. Darajaga bog'liq:
     boshlang'ich uzunlik = 3 + ⌊(daraja − 1) / 2⌋     (1→3 … 10→7)
     panjara              = daraja ≤3: 3×3, ≤7: 4×4, aks holda 5×5
     yonish               = max(450, 750 − 30·daraja) ms, oraliq 250 ms,
                            birinchi yonishdan oldin 500 ms tayyorlanish

   Ko'rsatish tick(now) bilan oldinga suriladi: ilova ~100 ms da tick
   chaqirsa yetarli (yonish ≥ 450 ms). Kataklar holati shu vaqtdan
   hisoblanadi, shuning uchun tick siyrak bo'lsa ham tartib buzilmaydi.

   BALL (points):
     muvaffaqiyatli raund → 1.5 × uzunlik
     xato raund           → 0.5 × to'g'ri bosilgan boshlang'ich qism
     points = round(yig'indi). Normal o'yin ≈ 40–100, mukammal ≈ 120–150.
   BOTGA QARSHI: bir raund ichida ikki bosish orasi < 120 ms — "tez"
   (raundning birinchi bosishi hisoblanmaydi — uni oldindan kutish mumkin).
   Tez ≥ 3 ta VA bosishlarning ≥ 10% i → flagged: points = 0, daraja
   o'zgarmaydi. Sababi done-ko'rinishning display matnida.

   score = to'liq takrorlangan eng uzun ketma-ketlik (Korsi "span"i).
   nextLevel: muvaffaqiyat ulushi ≥ 0.8 → +1, < 0.5 → −1 (1..10).

   PAUZA: pause(now) / resume(now) (yoki press('pause'|'resume')).
   Pauzada o'yin vaqti to'xtaydi, panjara yashiriladi, bosishlar
   e'tiborsiz; davom etgach RESUME_MS "Tayyorlaning…" (vaqt hali to'xtagan).
   Ko'rsatish to'xtagan joyidan davom etadi — qo'shimcha ko'rish vaqti yo'q.

   REPLAY: hamma faza o'tishlari rejalashtirilgan (o'yin) vaqtda; jurnalga
   kiritilgan DEVOR vaqti bilan start, qabul qilingan bosishlar, FAZA
   o'zgartirgan tick'lar va pause/resume yoziladi (yonayotgan katak
   almashishi — faqat ko'rinish, jurnalga yozilmaydi).

   Matnlar: T(uz, ru, en), langs: ['uz','ru','en'] (CONTRACT §2, §9).
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const IQ = root.IQ;

  const ROUNDS = 10;
  const FEEDBACK_MS = 1000;
  const LEAD_MS = 500, OFF_MS = 250;
  const MIN_SPAN = 2, MAX_SPAN = 12;
  const FAST_MS = 120;
  const RESUME_MS = 600;

  const T = (uz, ru, en) => ({ uz, ru, en });

  const startSpan = L => 3 + ((L - 1) >> 1);
  const levelCols = L => (L <= 3 ? 3 : L <= 7 ? 4 : 5);
  const spanCols = s => (s <= 6 ? 3 : s <= 10 ? 4 : 5);
  const onMs = L => Math.max(450, 750 - 30 * L);
  const inputMs = s => 5000 + 1500 * s;

  const BTN_START = { id: 'start', label: T('Boshlash', 'Начать', 'Start'), kind: 'primary' };
  const BTN_RESUME = { id: 'resume', label: T('Davom etish', 'Продолжить', 'Resume'), kind: 'primary' };
  const P_PAUSED = T('Vaqt toʻxtatildi', 'Время остановлено', 'The clock is stopped');
  const P_READY = T('Tayyorlaning…', 'Приготовьтесь…', 'Get ready…');
  const P_OVER = T('Oʻyin tugadi', 'Игра окончена', 'Game over');
  const BOT = T('Juda tez bosishlar — ball berilmadi', 'Слишком быстрые нажатия — баллы не начислены', 'Taps too fast — no points awarded');

  IQ.games.register({
    id: 'sequence',
    skill: 'memory',
    langs: ['uz', 'ru', 'en'],
    title: T('Kataklar tartibi', 'Порядок клеток', 'Sequence'),
    desc: T('Kataklar qaysi tartibda yonganini eslab qoling va takrorlang',
            'Запомните порядок, в котором загорались клетки, и повторите его',
            'Remember the order in which the cells light up and repeat it'),

    create(seed, level) {
      const L = Math.max(1, Math.min(10, level | 0 || 1));
      const r = IQ.rng(seed);
      const ON = onMs(L), STEP = ON + OFF_MS;
      const log = [];

      let phase = 'intro';
      let lastNow = null, t0 = null, tEnd = null;     // o'yin vaqti
      let round = 0;
      let span = startSpan(L);              // KEYINGI raund uzunligi
      let cur = null;                       // { cols, n, seq[], pos, wrong, ok, showStart }
      let phaseEnd = 0;
      let lit = -1;                         // 'show' da hozir yonayotgan katak
      let raw = 0, successes = 0, best = 0, played = 0;
      let inputs = 0, fast = 0, lastInput = 0;

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
      const push = (k, v) => log.push({ t: wall, k, v });

      function startRound(t) {
        const cols = Math.max(levelCols(L), spanCols(span));
        const n = cols * cols;
        const len = Math.min(span, n - 1);
        const seq = r.shuffle(Array.from({ length: n }, (_, i) => i)).slice(0, len);
        cur = { cols, n, seq, pos: 0, wrong: -1, ok: false, showStart: t };
        phase = 'show';
        phaseEnd = t + LEAD_MS + len * STEP;
      }

      function finishRound(ok, t) {
        played++;
        cur.ok = ok;
        const len = cur.seq.length;
        if (ok) {
          successes++;
          raw += 1.5 * len;
          if (len > best) best = len;
          span = Math.min(MAX_SPAN, len + 1);
        } else {
          raw += 0.5 * cur.pos;
          span = Math.max(MIN_SPAN, len - 1);
        }
        phase = 'feedback';
        phaseEnd = t + FEEDBACK_MS;
      }

      function advance(now) {
        let changed = false;
        while ((phase === 'show' || phase === 'input' || phase === 'feedback') && now >= phaseEnd) {
          changed = true;
          const t = phaseEnd;
          if (phase === 'show') {
            phase = 'input';
            phaseEnd = t + inputMs(cur.seq.length);
            lastInput = -Infinity;
          } else if (phase === 'input') {
            finishRound(false, t);
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

      /* Hozir qaysi katak yonishi kerak (faqat ko'rinish uchun). */
      function litAt(now) {
        if (phase !== 'show') return -1;
        const dt = now - cur.showStart - LEAD_MS;
        if (dt < 0) return -1;
        const k = Math.floor(dt / STEP);
        if (k >= cur.seq.length || dt - k * STEP >= ON) return -1;
        return cur.seq[k];
      }

      function step(now) {
        const t = clock(now);
        if (advance(t)) push('tick', null);
        return t;
      }

      const flagged = () => fast >= 3 && fast * 10 >= inputs;
      const points = () => (flagged() ? 0 : Math.round(raw));

      function blankGrid(cols, state) {
        return { cols, cells: Array.from({ length: cols * cols }, () => ({ label: '', state })) };
      }
      const progress = () => Math.min(1, (round + (phase === 'feedback' ? 1 : 0)) / ROUNDS);

      function cellsView() {
        const c = cur, out = [];
        const order = new Array(c.n).fill(-1);
        c.seq.forEach((cell, k) => { order[cell] = k; });
        for (let i = 0; i < c.n; i++) {
          let state = 'idle', label = '';
          const k = order[i];
          if (phase === 'show') state = i === lit ? 'lit' : 'idle';
          else if (phase === 'input') {
            if (k >= 0 && k < c.pos) { state = 'ok'; label = String(k + 1); }
          } else if (phase === 'feedback') {
            if (i === c.wrong) state = 'bad';
            else if (k >= 0) {
              state = k < c.pos ? 'ok' : 'lit';   // 'lit' + raqam — to'g'ri tartibning qolgani
              label = String(k + 1);
            }
          }
          out.push({ label, state });
        }
        return { cols: c.cols, cells: out };
      }

      function hud() {
        return [
          { label: T('Raund', 'Раунд', 'Round'), value: Math.min(round + 1, ROUNDS) + '/' + ROUNDS },
          { label: T('Ball', 'Баллы', 'Points'), value: String(points()) },
          { label: T('Uzunlik', 'Длина', 'Length'), value: String(cur ? cur.seq.length : span) },
        ];
      }

      const game = {
        get done() { return phase === 'done'; },
        get paused() { return paused(); },

        tick(now) {
          const n = log.length, h = holding();
          const t = step(now);
          const l = litAt(t);
          const moved = l !== lit;
          lit = l;
          return moved || log.length !== n || h !== holding();
        },

        tap(i, now) {
          const t = step(now);
          lit = litAt(t);
          if (holding() || phase !== 'input' || !Number.isInteger(i) || i < 0 || i >= cur.n) return;
          if (cur.seq.indexOf(i) >= 0 && cur.seq.indexOf(i) < cur.pos) return;   // allaqachon bosilgan
          push('tap', i);
          inputs++;
          if (t - lastInput < FAST_MS) fast++;
          lastInput = t;
          if (cur.seq[cur.pos] === i) {
            cur.pos++;
            if (cur.pos === cur.seq.length) finishRound(true, t);
          } else {
            cur.wrong = i;
            finishRound(false, t);
          }
        },

        press(id, now) {
          if (id === 'pause') { game.pause(now); return; }
          if (id === 'resume') { game.resume(now); return; }
          const t = step(now);
          lit = litAt(t);
          if (id !== 'start' || phase !== 'intro') return;
          push('press', id);
          t0 = t;
          startRound(t);
          lit = litAt(t);
        },

        /* O'yin vaqtini to'xtatadi. Faqat o'yin paytida; true — to'xtadi. */
        pause(now) {
          const t = step(now);
          lit = litAt(t);
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
              prompt: T('Kataklar birma-bir yonadi — xuddi shu tartibda bosing',
                        'Клетки загорятся по очереди — нажмите их в том же порядке',
                        'Cells light up one by one — tap them in the same order'),
              hud: hud(), display: null,
              grid: blankGrid(Math.max(levelCols(L), spanCols(span)), 'disabled'),
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
                uz: 'Eng uzun takrorlangan tartib: ' + best,
                ru: 'Самая длинная последовательность: ' + best,
                en: 'Longest sequence repeated: ' + best,
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
          if (phase === 'show') prompt = T('Tartibni kuzating…', 'Следите за порядком…', 'Watch the order…');
          else if (phase === 'input') {
            prompt = T('Xuddi shu tartibda bosing: ' + (cur.pos + 1) + '-katak',
                       'Нажимайте в том же порядке: клетка ' + (cur.pos + 1),
                       'Tap in the same order: cell ' + (cur.pos + 1));
          } else if (cur.ok) prompt = T('Toʻgʻri!', 'Верно!', 'Correct!');
          else if (cur.wrong >= 0) prompt = T('Xato. Toʻgʻri tartib raqamlar bilan koʻrsatildi.', 'Ошибка. Правильный порядок показан цифрами.', 'Wrong. The correct order is shown with numbers.');
          else prompt = T('Vaqt tugadi. Toʻgʻri tartib raqamlar bilan koʻrsatildi.', 'Время вышло. Правильный порядок показан цифрами.', 'Time’s up. The correct order is shown with numbers.');
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
