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
   bosishlarning ≥ 10% i bo'lsa, points = 0 (score saqlanadi).

   score = to'liq eslab qolingan eng ko'p katak soni (0 — hech biri).
   nextLevel: muvaffaqiyat ulushi ≥ 0.8 → +1, < 0.5 → −1 (1..10).

   REPLAY: hamma o'tishlar REJALASHTIRILGAN vaqtda (ko'rsatish tugashi,
   vaqt tugashi, feedback tugashi) — tick qachon chaqirilgani ahamiyatsiz.
   Jurnalga faqat holatni o'zgartirgan hodisalar yoziladi (bosilgan
   start, qabul qilingan bosish, faza o'zgartirgan tick). Shuning uchun
   IQ.games.replay aynan shu result() va aynan shu log() ni beradi.

   Vaqt faqat `now` argumentidan, tasodif faqat IQ.rng(seed) dan.
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const IQ = root.IQ;

  const ROUNDS = 10;
  const FEEDBACK_MS = 900;
  const MIN_COUNT = 2, MAX_COUNT = 14;
  const FAST_MS = 120;                      // odam bunchalik tez ketma-ket bosa olmaydi

  const T = (uz, ru) => ({ uz, ru });

  const startCount = L => 3 + ((L - 1) >> 1);
  const levelCols = L => (L <= 2 ? 3 : L <= 5 ? 4 : L <= 8 ? 5 : 6);
  const countCols = c => (c <= 4 ? 3 : c <= 7 ? 4 : c <= 10 ? 5 : 6);
  const showMs = (c, L) => Math.max(1000, 1400 + 220 * c - 60 * L);
  const inputMs = c => 5000 + 1200 * c;

  const BTN_START = { id: 'start', label: T('Boshlash', 'Начать'), kind: 'primary' };

  IQ.games.register({
    id: 'matrix-memory',
    skill: 'memory',
    title: T('Kataklar xotirasi', 'Память на клетки'),
    desc: T('Yongan kataklarni eslab qoling va ularni qayta toping',
            'Запомните подсвеченные клетки и найдите их снова'),

    create(seed, level) {
      const L = Math.max(1, Math.min(10, level | 0 || 1));
      const r = IQ.rng(seed);
      const log = [];

      let phase = 'intro';
      let lastNow = null, t0 = null, tEnd = null;
      let round = 0;                        // joriy raund (0 dan)
      let count = startCount(L);            // KEYINGI raunddagi katak soni
      let cur = null;                       // { cols, n, count, target[], picked[], found, wrong, ok }
      let phaseEnd = 0;                     // keyingi rejalashtirilgan o'tish vaqti
      let raw = 0, successes = 0, best = 0, played = 0;
      let inputs = 0, fast = 0, lastInput = 0;

      /* Vaqtni tozalash: son bo'lmasa yoki orqaga ketsa — oxirgisi. */
      function clock(now) {
        let t = (typeof now === 'number' && isFinite(now)) ? now : (lastNow === null ? 0 : lastNow);
        if (lastNow !== null && t < lastNow) t = lastNow;
        lastNow = t;
        return t;
      }

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
        if (advance(t)) log.push({ t, k: 'tick', v: null });
        return t;
      }

      function points() {
        const bot = fast >= 3 && fast * 10 >= inputs;
        return bot ? 0 : Math.round(raw);
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
          { label: T('Raund', 'Раунд'), value: shownRound + '/' + ROUNDS },
          { label: T('Ball', 'Очки'), value: String(points()) },
          { label: T('Kataklar', 'Клеток'), value: String(cur ? cur.count : count) },
        ];
      }

      const game = {
        get done() { return phase === 'done'; },

        tick(now) {
          const n = log.length;
          step(now);
          return log.length !== n;
        },

        tap(i, now) {
          const t = step(now);
          if (phase !== 'input' || !Number.isInteger(i) || i < 0 || i >= cur.n || cur.picked[i]) return;
          log.push({ t, k: 'tap', v: i });
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
          const t = step(now);
          if (id !== 'start' || phase !== 'intro') return;
          log.push({ t, k: 'press', v: id });
          t0 = t;
          startRound(t);
        },

        log: () => log.map(e => ({ t: e.t, k: e.k, v: e.v })),

        view() {
          if (phase === 'intro') {
            return {
              phase,
              prompt: T('Bir nechta katak bir lahza yonadi. Ularni eslab qoling, keyin o\'sha kataklarni bosing.',
                        'Несколько клеток ненадолго подсветятся. Запомните их, затем нажмите на эти клетки.'),
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
                uz: 'To\'g\'ri raundlar: ' + successes + '/' + played + ' · Eng ko\'p: ' + best + ' ta katak',
                ru: 'Верных раундов: ' + successes + '/' + played + ' · Максимум: ' + best + ' клеток',
              },
              grid: null, buttons: [], progress: 1,
            };
          }
          let prompt;
          if (phase === 'show') prompt = T('Eslab qoling…', 'Запоминайте…');
          else if (phase === 'input') {
            const left = cur.count - cur.found;
            prompt = T('Yongan kataklarni bosing (qoldi: ' + left + ')',
                       'Нажмите клетки, которые светились (осталось: ' + left + ')');
          } else if (cur.ok) prompt = T('To\'g\'ri!', 'Верно!');
          else if (cur.wrong >= 0) prompt = T('Xato. Topilmagan kataklar ko\'rsatildi.', 'Ошибка. Показаны ненайденные клетки.');
          else prompt = T('Vaqt tugadi. Topilmagan kataklar ko\'rsatildi.', 'Время вышло. Показаны ненайденные клетки.');
          return {
            phase, prompt, hud: hud(), display: null, grid: cellsView(), buttons: [],
            progress: Math.min(1, (round + (phase === 'feedback' ? 1 : 0)) / ROUNDS),
          };
        },

        result() {
          const d = phase === 'done';
          const rate = played ? successes / played : 0;
          const next = !d ? L : rate >= 0.8 ? L + 1 : rate < 0.5 ? L - 1 : L;
          return {
            score: best,
            points: points(),
            correct: successes,
            total: played,
            durationMs: t0 === null ? 0 : (d ? tEnd : lastNow) - t0,
            nextLevel: Math.max(1, Math.min(10, next)),
          };
        },
      };
      return game;
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
