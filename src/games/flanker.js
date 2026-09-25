/* ─────────────────────────────────────────────────────────────────────────
   src/games/flanker.js — Strelkalar (Eriksen flanker testi, skill: attention)

   QOIDA. Ekranda bir qator strelka (5 yoki 7 ta). Faqat O'RTADAGI
   strelka yo'nalishini bosish kerak: "◀ Chap" yoki "O'ng ▶". Yondagilar
   (flankerlar) chalg'itadi:
     · mos (congruent)      → → → → →   yondagilar ham o'sha tomonga;
     · zid (incongruent)    → → ← → →   yondagilar teskari — qiyin;
     · neytral (1–3 daraja) ▬ ▬ → ▬ ▬   yo'nalishsiz to'rtburchaklar.
   Har sinov: "+" nishon (0,3–1,1 s, tasodifiy — ritmga moslashib oldindan
   bosib bo'lmasin), keyin strelkalar javobgacha yoki muddat tugaguncha
   (daraja bo'yicha 2,5 → 0,95 s). Keyin qisqa javob ekrani (to'g'ri
   0,3 s; xato / kechikish / juda erta 0,7 s). 40 sinov ≈ 1–1,5 daqiqa;
   eng uzoq holatda ham (hech bosmasa) chegaralangan.

   Chap va o'ng har turda teng (toq bo'lsa ±1), tartib aralash (IQ.rng).
   "+" paytida bosish e'tiborsiz (xato ham, javob ham emas).
   Yo'nalish shakl bilan beriladi (rang emas); fikr-mulohazada belgisi
   (✓ / ✗ chizig'i) va matn bor.

   DARAJALAR: strelkalar 5 (1–5) → 7 (6–10); zid ulushi 25% → 65%;
   neytral 25% → 0; muddat 2500 → 950 ms; 7+ darajada qator nishondan
   yuqorida yoki pastda chiqadi (joyi oldindan ma'lum emas).

   BAHOLASH:
     to'g'ri  = to'g'ri yo'nalish, javob vaqti (RT) ≥ 150 ms. Undan tezi —
                "juda erta" (taxmin, ko'rib ulgurmagan): hisoblanmaydi.
     aniqlik  = to'g'ri / 40
     aniq_k   = clamp((aniqlik − 0.5) / 0.45, 0, 1)   (50% — tasodif → 0)
     tezlik_k = clamp(1 − 0.7 · (o'rtacha_RT − 500) / 650, 0.3, 1)
                (o'rtacha RT faqat to'g'ri javoblardan; ≤ 500 ms → 1)
     perf     = aniq_k · tezlik_k                         ∈ [0, 1]
     score    = round(100 · perf)
     points   = round((60 + 9·daraja) · perf)   → maksimum 69 … 150
     nextLevel: perf ≥ 0.75 → +1, perf < 0.40 → −1, aks holda o'sha.

   BOTGA QARSHI: shubhali kiritish — oldingisidan < 120 ms keyin YOKI
   strelkalar chiqqanidan < 150 ms da javob. Ketma-ket 3 ta shubhali yoki
   jami ≥ 5 va ≥ 15% — flagged: points = 0, daraja o'zgarmaydi. Sababi
   done-ko'rinishning display matnida.

   PAUZA: pause(now) / resume(now) (yoki press('pause'|'resume')). Vaqt
   (javob vaqti ham) to'xtaydi, strelkalar o'rnida pauza belgisi.
   "Davom etish" tugmasi "Chap/O'ng" bilan bir joyda — davom etgach
   RESUME_MS "Tayyorlaning…" (nishon, bosish e'tiborsiz) tasodifiy
   ikkinchi bosishni yutadi; keyin sinov to'xtagan joyidan davom etadi.

   Jurnal: kiritilgan DEVOR vaqti bilan 'press' (start, left, right,
   pause, resume), holatni vaqt bilan o'zgartirgan 'tick' (strelkalar
   chiqdi / muddat tugadi / keyingi sinov / tugadi). O'tishlar
   rejalashtirilgan (o'yin) vaqtda hisoblanadi — natija tick
   chastotasiga bog'liq emas.

   Matnlar: T(uz, ru, en), langs: ['uz','ru','en'] (CONTRACT §2, §9).
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const IQ = root.IQ;

  const FAST_MS = 120, MIN_RT = 150, TRIALS = 40, FB_OK = 300, FB_BAD = 700, FIRST_EXTRA = 500, RESUME_MS = 600;
  const INK = '#1c1b29', GREY = '#8a8799';
  //            strelka, zid, neytral, muddat, "+" min, "+" max, joy o'zgaradi
  const LV = [null,
    [5, 0.25, 0.25, 2500, 700, 1100, false],
    [5, 0.35, 0.20, 2200, 650, 1000, false],
    [5, 0.45, 0.10, 2000, 600, 950, false],
    [5, 0.50, 0, 1800, 550, 900, false],
    [5, 0.50, 0, 1600, 500, 850, false],
    [7, 0.50, 0, 1450, 450, 800, false],
    [7, 0.55, 0, 1300, 450, 750, true],
    [7, 0.60, 0, 1150, 400, 700, true],
    [7, 0.60, 0, 1050, 350, 650, true],
    [7, 0.65, 0, 950, 300, 600, true]];

  const T = (uz, ru, en) => ({ uz, ru, en });
  const clampLv = l => Math.max(1, Math.min(10, Math.round(Number(l)) || 1));

  function rules(level) {
    const L = clampLv(level), c = LV[L];
    return { level: L, trials: TRIALS, arrows: c[0], incongruent: c[1], neutral: c[2], deadlineMs: c[3],
      fixMinMs: c[4], fixMaxMs: c[5], jitter: c[6], minRtMs: MIN_RT };
  }

  /* ── SVG: 320×200 (eni = 1.6 × bo'yi), oq fon. Strelkalar <use href="#l|#r|#n">. ── */
  const DEFS = '<defs>' +
    '<path id="r" d="M-22 -6H4V-16L22 0L4 16V6H-22Z"/>' +
    '<path id="l" d="M22 -6H-4V-16L-22 0L-4 16V6H22Z"/>' +
    '<rect id="n" x="-20" y="-6" width="40" height="12" rx="3"/>' +
    '</defs>';
  const svg = body => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">' +
    '<rect width="320" height="200" fill="#fff"/>' + DEFS + body + '</svg>';
  const PAUSE = svg('<rect x="140" y="76" width="12" height="48" rx="4" fill="' + GREY + '"/><rect x="168" y="76" width="12" height="48" rx="4" fill="' + GREY + '"/>');
  const FIX = svg('<path d="M160 86V114M146 100H174" stroke="' + INK + '" stroke-width="4" stroke-linecap="round" fill="none"/>');

  /* Qator: markaz — target, qolganlari — flanker ('same' | 'opp' | 'n'). */
  function row(tr, n, dimFlank) {
    const sp = n === 5 ? 58 : 44, sc = n === 5 ? 1 : 0.8, mid = (n - 1) / 2;
    const other = tr.dir === 'l' ? 'r' : 'l';
    const fl = tr.type === 'con' ? tr.dir : tr.type === 'inc' ? other : 'n';
    let s = '';
    for (let i = 0; i < n; i++) {
      const id = i === mid ? tr.dir : fl, x = 160 + (i - mid) * sp;
      s += '<use href="#' + id + '" transform="translate(' + x + ' ' + tr.y + ') scale(' + sc + ')" fill="' + (dimFlank && i !== mid ? GREY : INK) + '"/>';
    }
    return s;
  }
  function mark(ok, y) {
    const my = y <= 100 ? y + 58 : y - 58;
    const d = ok ? 'M148 ' + my + 'L157 ' + (my + 9) + 'L174 ' + (my - 9) : 'M150 ' + (my - 10) + 'L170 ' + (my + 10) + 'M170 ' + (my - 10) + 'L150 ' + (my + 10);
    return '<path d="' + d + '" stroke="' + INK + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
  }

  /* Botga qarshi hisob (izoh yuqorida). */
  function makeGuard() {
    let prev = null, run = 0, maxRun = 0, n = 0, sus = 0;
    return {
      input(t, suspect) {
        const s = !!suspect || (prev !== null && t - prev < FAST_MS);
        prev = t; n++;
        if (s) { sus++; run++; if (run > maxRun) maxRun = run; } else run = 0;
      },
      flagged: () => maxRun >= 3 || (sus >= 5 && sus >= 0.15 * n),
    };
  }

  /* Strelka belgisi + U+FE0E (emoji emas, matn ko'rinishi) + U+2002
     (en-space: ba'zi shriftlarda oddiy probel belgi yonida yo'qoladi). */
  const L_ = '◀\uFE0E\u2002', _R = '\u2002▶\uFE0E';
  const BTN = [{ id: 'left', label: T(L_ + 'Chap', L_ + 'Влево', L_ + 'Left'), kind: 'primary' },
               { id: 'right', label: T('Oʻng' + _R, 'Вправо' + _R, 'Right' + _R), kind: 'primary' }];
  const BTN_START = { id: 'start', label: T('Boshlash', 'Начать', 'Start'), kind: 'primary' };
  const BTN_RESUME = { id: 'resume', label: T('Davom etish', 'Продолжить', 'Resume'), kind: 'primary' };
  const P_PAUSED = T('Vaqt toʻxtatildi', 'Время остановлено', 'The clock is stopped');
  const P_READY = T('Tayyorlaning…', 'Приготовьтесь…', 'Get ready…');
  const P_OVER = T('Oʻyin tugadi', 'Игра окончена', 'Game over');
  const P_ASK = T('Oʻrtadagi strelka qaysi tomonga?', 'Куда смотрит средняя стрелка?', 'Which way does the middle arrow point?');
  const BOT = T('Juda tez bosishlar — ball berilmadi', 'Слишком быстрые нажатия — баллы не начислены', 'Taps too fast — no points awarded');

  IQ.games.register({
    id: 'flanker', skill: 'attention',
    langs: ['uz', 'ru', 'en'],
    title: T('Strelkalar', 'Стрелки', 'Arrows'),
    desc: T('Faqat oʻrtadagi strelkaga qarang — yondagilar chalgʻitadi', 'Смотрите только на среднюю стрелку — соседние отвлекают',
            'Watch only the middle arrow — the others are there to distract you'),
    rules,
    create(seed, level) {
      const cfg = rules(level), L = cfg.level, R = IQ.rng(seed);
      /* Sinovlar: turlar ulushi aniq, har turda chap/o'ng teng. */
      const nInc = Math.round(TRIALS * cfg.incongruent), nNeu = Math.round(TRIALS * cfg.neutral);
      const list = [];
      for (const [type, cnt] of [['inc', nInc], ['neu', nNeu], ['con', TRIALS - nInc - nNeu]]) {
        const firstL = R.chance(0.5);
        for (let j = 0; j < cnt; j++) list.push({ type, dir: (j % 2 === 0) === firstL ? 'l' : 'r' });
      }
      const trials = R.shuffle(list).map(tr => ({
        type: tr.type, dir: tr.dir,
        fix: R.range(cfg.fixMinMs, cfg.fixMaxMs),
        y: cfg.jitter ? (R.chance(0.5) ? 58 : 142) : 100,
      }));
      const guard = makeGuard(), log = [], res = [];

      let last = null, lastLog = null, shown = '';      // o'yin vaqti
      let phase = 'intro', t0 = null, endAt = null;
      let ti = 0, fixEnd = 0, onset = 0, fbUntil = 0;

      /* Devor vaqti → o'yin vaqti: off — pauzalar yig'indisi, hold — o'yin
         vaqti g da to'xtagan, devor vaqti `until` gacha (Infinity — pauza). */
      let wall = null, off = 0, hold = null;
      function clock(now) {
        let w = (typeof now === 'number' && isFinite(now)) ? now : (wall === null ? 0 : wall);
        if (wall !== null && w < wall) w = wall;
        wall = w;
        return (last = hold && w < hold.until ? hold.g : w - off);
      }
      const paused = () => hold !== null && hold.until === Infinity;
      const holding = () => hold !== null && wall < hold.until;
      const running = () => phase !== 'intro' && phase !== 'done';
      const push = (t, kind, v) => { log.push({ t: wall, k: kind, v }); lastLog = t; };

      function advance(t) {
        let moved = false;
        for (;;) {
          if (phase === 'show' && t >= fixEnd) { phase = 'input'; onset = fixEnd; }
          else if (phase === 'input' && t >= onset + cfg.deadlineMs) {
            res.push({ out: 'miss', rt: null });
            phase = 'feedback'; fbUntil = onset + cfg.deadlineMs + FB_BAD;
          } else if (phase === 'feedback' && t >= fbUntil) {
            ti++;
            if (ti >= TRIALS) { phase = 'done'; endAt = fbUntil; }
            else { phase = 'show'; fixEnd = fbUntil + trials[ti].fix; }
          } else break;
          moved = true;
        }
        if (moved) push(t, 'tick', null);
      }

      function stats() {
        let ok = 0, rtSum = 0, bad = 0;
        for (const r of res) { if (r.out === 'ok') { ok++; rtSum += r.rt; } else bad++; }
        const meanRt = ok ? rtSum / ok : null;
        const accK = Math.max(0, Math.min(1, (ok / TRIALS - 0.5) / 0.45));
        const spdK = ok ? Math.max(0.3, Math.min(1, 1 - 0.7 * (meanRt - 500) / 650)) : 0;
        return { ok, bad, meanRt, perf: accK * spdK };
      }

      /* Ko'rinishni belgilaydigan hamma narsa (SVG'ni har tick'da qurib
         solishtirish qimmat): tick shu o'zgargandagina true. */
      const sig = () => [phase, paused(), holding(), ti, res.length].join('|');

      const g = {
        get done() { return phase === 'done'; },
        get paused() { return paused(); },
        tick(now) {
          const t = clock(now);
          if (running()) advance(t);
          const key = sig(), changed = key !== shown;
          shown = key;
          return changed;
        },
        press(id, now) {
          if (id === 'pause') { g.pause(now); return; }
          if (id === 'resume') { g.resume(now); return; }
          const t = clock(now);
          if (phase === 'done' || holding()) return;
          if (phase === 'intro') {
            if (id !== 'start') return;
            push(t, 'press', id);
            t0 = t; ti = 0; phase = 'show'; fixEnd = t + FIRST_EXTRA + trials[0].fix;
            return;
          }
          advance(t);
          if (phase === 'done' || (id !== 'left' && id !== 'right')) return;
          push(t, 'press', id);
          if (phase !== 'input') { guard.input(t, false); return; }
          const rt = t - onset, fast = rt < MIN_RT;
          guard.input(t, fast);
          const out = fast ? 'fast' : (id === 'left' ? 'l' : 'r') === trials[ti].dir ? 'ok' : 'bad';
          res.push({ out, rt });
          phase = 'feedback'; fbUntil = t + (out === 'ok' ? FB_OK : FB_BAD);
        },
        /* O'yin vaqtini to'xtatadi. Faqat o'yin paytida; true — to'xtadi. */
        pause(now) {
          const t = clock(now);
          if (!running() || paused()) return false;
          advance(t);
          if (!running()) return false;
          hold = { g: t, until: Infinity };
          log.push({ t: wall, k: 'press', v: 'pause' });   // lastLog o'zgarmaydi
          return true;
        },
        /* Davom etadi: RESUME_MS "Tayyorlaning…", keyin vaqt yuradi. */
        resume(now) {
          const t = clock(now);
          if (!paused()) return false;
          const until = wall + RESUME_MS;
          off = until - hold.g;
          hold = { g: hold.g, until };
          log.push({ t: wall, k: 'press', v: 'resume' });   // lastLog o'zgarmaydi
          return true;
        },
        tap() {},
        log: () => log.map(e => ({ t: e.t, k: e.k, v: e.v })),
        result() {
          const s = stats(), bot = guard.flagged();
          return {
            score: Math.round(100 * s.perf),
            points: bot ? 0 : Math.round((60 + 9 * L) * s.perf),
            correct: s.ok, total: TRIALS,
            durationMs: t0 === null ? 0 : (phase === 'done' ? endAt : lastLog) - t0,
            nextLevel: bot || t0 === null ? L : s.perf >= 0.75 ? Math.min(10, L + 1) : s.perf < 0.4 ? Math.max(1, L - 1) : L,
            flagged: bot,
          };
        },
        view() {
          const s = stats();
          /* HUD — hamma fazada bir xil uyalar (intro'da boshlang'ich qiymat). */
          const hud = [{ label: T('Toʻgʻri', 'Верно', 'Correct'), value: String(s.ok) },
                       { label: T('Xato', 'Ошибки', 'Mistakes'), value: String(s.bad) },
                       { label: T('Oʻrtacha, ms', 'Среднее, мс', 'Avg time, ms'), value: s.meanRt === null ? '—' : String(Math.round(s.meanRt)) }];
          if (phase === 'intro') {
            return {
              phase, paused: false,
              prompt: T('Faqat oʻrtadagi strelka yoʻnalishini bosing — yondagilarga eʼtibor bermang',
                        'Нажимайте, куда смотрит средняя стрелка, — соседние не в счёт',
                        'Tap the way the middle arrow points — ignore the others'),
              hud,
              display: { kind: 'svg', svg: svg(row({ type: 'inc', dir: 'r', y: 100 }, cfg.arrows, true)) },
              grid: null,
              buttons: [BTN_START],
              progress: 0,
            };
          }
          if (phase === 'done') {
            const bot = guard.flagged();
            return {
              phase, paused: false,
              prompt: bot ? BOT : P_OVER,
              hud,
              /* Ball tezlik va aniqlikdan chiqadi — aniqlik yakun uyasida,
                 bu yerda tezlik. */
              display: bot ? Object.assign({ kind: 'text' }, BOT) : (() => {
                const ms = s.meanRt === null ? '—' : String(Math.round(s.meanRt));
                return { kind: 'text', uz: 'Oʻrtacha javob vaqti: ' + ms + ' ms', ru: 'Среднее время ответа: ' + ms + ' мс', en: 'Average response time: ' + ms + ' ms' };
              })(),
              grid: null, buttons: [], progress: 1,
            };
          }
          const tr = trials[ti], progress = Math.min(1, res.length / TRIALS);
          if (holding()) {
            const p = paused();
            return { phase, paused: p, prompt: p ? P_PAUSED : P_READY, hud,
              display: { kind: 'svg', svg: p ? PAUSE : FIX }, grid: null, buttons: p ? [BTN_RESUME] : [], progress };
          }
          let prompt = P_ASK, display;
          if (phase === 'show') display = { kind: 'svg', svg: FIX };
          else if (phase === 'input') display = { kind: 'svg', svg: svg(row(tr, cfg.arrows, false)) };
          else {
            const out = res[res.length - 1].out;
            prompt = out === 'ok' ? T('Toʻgʻri!', 'Верно!', 'Correct!')
              : out === 'miss' ? T('Kechikdingiz', 'Слишком поздно', 'Too slow')
              : out === 'fast' ? T('Juda erta — strelkani koʻrib bosing', 'Слишком рано — сначала посмотрите', 'Too early — wait for the arrows')
              : T('Xato — oʻrtadagisiga qarang', 'Ошибка — смотрите на среднюю', 'Wrong — look at the middle one');
            display = { kind: 'svg', svg: svg(row(tr, cfg.arrows, true) + mark(out === 'ok', tr.y)) };
          }
          return { phase, paused: false, prompt, hud, display, grid: null, buttons: BTN, progress };
        },
      };
      /* Ilova har bosishdan keyin qayta chizadi — tick faqat o'shandan
         beri o'zgargan bo'lsa true qaytarsin. */
      for (const m of ['tap', 'press', 'pause', 'resume']) {
        const f = g[m];
        g[m] = function () { const r = f.apply(g, arguments); shown = sig(); return r; };
      }
      return g;
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
