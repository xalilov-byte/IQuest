/* ─────────────────────────────────────────────────────────────────────────
   src/games/sequence.js — "Ketma-ketlik" (Korsi bloklari uslubida)

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
   (raundning birinchi bosishi hisoblanmaydi — uni oldindan kutish mumkin). Tez ≥ 3 ta VA bosishlarning ≥ 10% i → points = 0.

   score = to'liq takrorlangan eng uzun ketma-ketlik (Korsi "span"i).
   nextLevel: muvaffaqiyat ulushi ≥ 0.8 → +1, < 0.5 → −1 (1..10).

   REPLAY: hamma faza o'tishlari rejalashtirilgan vaqtda; jurnalga
   start, qabul qilingan bosishlar va FAZA o'zgartirgan tick'lar yoziladi
   (yonayotgan katak almashishi — faqat ko'rinish, jurnalga yozilmaydi).
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const IQ = root.IQ;

  const ROUNDS = 10;
  const FEEDBACK_MS = 1000;
  const LEAD_MS = 500, OFF_MS = 250;
  const MIN_SPAN = 2, MAX_SPAN = 12;
  const FAST_MS = 120;

  const T = (uz, ru) => ({ uz, ru });

  const startSpan = L => 3 + ((L - 1) >> 1);
  const levelCols = L => (L <= 3 ? 3 : L <= 7 ? 4 : 5);
  const spanCols = s => (s <= 6 ? 3 : s <= 10 ? 4 : 5);
  const onMs = L => Math.max(450, 750 - 30 * L);
  const inputMs = s => 5000 + 1500 * s;

  const BTN_START = { id: 'start', label: T('Boshlash', 'Начать'), kind: 'primary' };

  IQ.games.register({
    id: 'sequence',
    skill: 'memory',
    title: T('Ketma-ketlik', 'Последовательность'),
    desc: T('Kataklar qaysi tartibda yonganini eslab qoling va takrorlang',
            'Запомните порядок, в котором загорались клетки, и повторите его'),

    create(seed, level) {
      const L = Math.max(1, Math.min(10, level | 0 || 1));
      const r = IQ.rng(seed);
      const ON = onMs(L), STEP = ON + OFF_MS;
      const log = [];

      let phase = 'intro';
      let lastNow = null, t0 = null, tEnd = null;
      let round = 0;
      let span = startSpan(L);              // KEYINGI raund uzunligi
      let cur = null;                       // { cols, n, seq[], pos, wrong, ok, showStart }
      let phaseEnd = 0;
      let lit = -1;                         // 'show' da hozir yonayotgan katak
      let raw = 0, successes = 0, best = 0, played = 0;
      let inputs = 0, fast = 0, lastInput = 0;

      function clock(now) {
        let t = (typeof now === 'number' && isFinite(now)) ? now : (lastNow === null ? 0 : lastNow);
        if (lastNow !== null && t < lastNow) t = lastNow;
        lastNow = t;
        return t;
      }

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
        if (advance(t)) log.push({ t, k: 'tick', v: null });
        return t;
      }

      function points() {
        const bot = fast >= 3 && fast * 10 >= inputs;
        return bot ? 0 : Math.round(raw);
      }

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
          { label: T('Raund', 'Раунд'), value: Math.min(round + 1, ROUNDS) + '/' + ROUNDS },
          { label: T('Ball', 'Очки'), value: String(points()) },
          { label: T('Uzunlik', 'Длина'), value: String(cur ? cur.seq.length : span) },
        ];
      }

      const game = {
        get done() { return phase === 'done'; },

        tick(now) {
          const n = log.length;
          const t = step(now);
          const l = litAt(t);
          const moved = l !== lit;
          lit = l;
          return moved || log.length !== n;
        },

        tap(i, now) {
          const t = step(now);
          lit = litAt(t);
          if (phase !== 'input' || !Number.isInteger(i) || i < 0 || i >= cur.n) return;
          if (cur.seq.indexOf(i) >= 0 && cur.seq.indexOf(i) < cur.pos) return;   // allaqachon bosilgan
          log.push({ t, k: 'tap', v: i });
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
          const t = step(now);
          lit = litAt(t);
          if (id !== 'start' || phase !== 'intro') return;
          log.push({ t, k: 'press', v: id });
          t0 = t;
          startRound(t);
          lit = litAt(t);
        },

        log: () => log.map(e => ({ t: e.t, k: e.k, v: e.v })),

        view() {
          if (phase === 'intro') {
            return {
              phase,
              prompt: T('Kataklar birma-bir yonadi. Tartibni eslab qoling va xuddi shu tartibda bosing.',
                        'Клетки загорятся по очереди. Запомните порядок и нажмите их в том же порядке.'),
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
                uz: 'To\'g\'ri raundlar: ' + successes + '/' + played + ' · Eng uzun: ' + best,
                ru: 'Верных раундов: ' + successes + '/' + played + ' · Самая длинная: ' + best,
              },
              grid: null, buttons: [], progress: 1,
            };
          }
          let prompt;
          if (phase === 'show') prompt = T('Tartibni kuzating…', 'Следите за порядком…');
          else if (phase === 'input') {
            prompt = T('Xuddi shu tartibda bosing (' + (cur.pos + 1) + '-katak)',
                       'Нажмите в том же порядке (клетка ' + (cur.pos + 1) + ')');
          } else if (cur.ok) prompt = T('To\'g\'ri!', 'Верно!');
          else if (cur.wrong >= 0) prompt = T('Xato. To\'g\'ri tartib raqamlar bilan ko\'rsatildi.', 'Ошибка. Правильный порядок показан цифрами.');
          else prompt = T('Vaqt tugadi. To\'g\'ri tartib raqamlar bilan ko\'rsatildi.', 'Время вышло. Правильный порядок показан цифрами.');
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
