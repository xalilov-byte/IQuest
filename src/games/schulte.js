/* ─────────────────────────────────────────────────────────────────────────
   src/games/schulte.js — Shulte jadvali (skill: attention)

   QOIDA. Jadvalda 1..N sonlar aralash turadi (3×3 dan 6×6 gacha). Ularni
   daraja belgilagan tartibda bosish kerak:
     · asc  — o'sish:  1 → 2 → … → N;
     · desc — kamayish: N → … → 2 → 1;
     · zig  — navbat bilan ikki chetdan: 1 → N → 2 → N−1 → …
              (ikki ketma-ketlik aralash — diqqatni almashtirish).
   Harflar ataylab ishlatilmaydi: o'zbek lotin (A B D E …) va rus alifbosi
   tartibi har xil — harf tartibi ikki tilda ikki xil topshiriq bo'lib
   qolardi. "zig" esa faqat sonlar bilan, ikkala tilda bir xil.

   Noto'g'ri katak 0,4 s 'bad' bo'lib yonadi va xato sanaladi. Topilgan
   katakni qayta bosish xato EMAS (e'tiborsiz) — ekran "sakrashi" yoki
   qo'sh bosish odamni jazolamasin. Past darajalarda (1–3) topilgan
   katak 'ok' bo'lib qoladi; yuqorida klassik usul — bir lahza 'ok',
   keyin yana oddiy ko'rinadi (qidiruv maydoni toraymaydi).

   Bir o'yin — 1–5 jadval (≈ 36–75 son, odatda 1–2 daqiqa). Jadvallar
   orasida 1,5 s tanaffus (faol vaqtga kirmaydi). Har jadvalga chegara:
   N × max(3 s, 2,5·P) — o'yin cheksiz cho'zilmaydi; vaqt tugasa jadval
   topilgan sonlar bilan yopiladi.

   DARAJALAR (tomon × tartib × jadvallar):
     1: 3×3 asc ×5   2: 4×4 asc ×4   3: 4×4 desc ×4   4: 5×5 asc ×3
     5: 5×5 desc ×3  6: 6×6 asc ×2   7: 4×4 zig ×4    8: 6×6 desc ×2
     9: 5×5 zig ×2  10: 6×6 zig ×1
   Qiyinlik o'lchovi — "yaxshi" sur'at P (ms/son) har darajada o'sadi:
     P = (100 + 150·tomon) × {asc 1, desc 1.15, zig 1.6}

   BAHOLASH (faqat jurnaldan chiqadigan sonlar — replay aynan qaytaradi):
     s        = P · topilgan / faol_vaqt        (1 — yaxshi, 1.25 — a'lo)
     tezlik   = min(1, s / 1.25)
     aniqlik  = max(0, 1 − 2 · xatolar / jami)
     perf     = (topilgan / jami) · tezlik · aniqlik          ∈ [0, 1]
     score    = round(100 · perf)
     points   = round((60 + 9·daraja) · perf)   → maksimum 69 … 150
     nextLevel: perf ≥ 0.75 → +1, perf < 0.40 → −1, aks holda o'sha.
   Tasodifiy bosuvchi: xatolar jamidan ko'p → aniqlik 0 → 0 ball.

   BOTGA QARSHI: kiritishlar orasidagi < 120 ms oraliq "shubhali".
   Ketma-ket 3 ta shubhali (4 ta bosish ≈ 0,4 s ichida) yoki jami ≥ 5 va
   ≥ 15% — flagged: points = 0, daraja o'zgarmaydi. Sababi done-
   ko'rinishning display matnida. Bitta qo'sh bosish jazolanmaydi.

   KO'RINISH: panjara HAMMA fazada bir xil o'lchamda turadi — intro'da
   bo'sh 'disabled' kataklar (sonlar oldindan ko'rinmaydi), jadvallar
   orasida tugagan jadval 'disabled', pauzada 'hidden'. HUD har doim
   Jadval · Vaqt · Xato (1 jadvalli darajada ham "1/1").

   PAUZA: pause(now) / resume(now) (yoki press('pause'|'resume')). Faol
   vaqt to'xtaydi, sonlar yashiriladi, bosishlar e'tiborsiz; davom etgach
   RESUME_MS "Tayyorlaning…" (vaqt hali to'xtagan).

   Jurnal (log): kiritilgan DEVOR vaqti bilan 'press' start, har 'tap',
   o'yin holatini vaqt bilan o'zgartirgan (jadval yopildi / keyingisi /
   tugadi) 'tick' va 'press' pause/resume. Holat o'tishlari
   rejalashtirilgan (o'yin) vaqtda hisoblanadi (tick kelgan paytda emas) —
   natija tick chastotasiga bog'liq emas.

   Matnlar: T(uz, ru, en), langs: ['uz','ru','en'] (CONTRACT §2, §9).
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const IQ = root.IQ;

  const FAST_MS = 120, BAD_MS = 400, OK_MS = 250, BREAK_MS = 1500, RESUME_MS = 600;
  const MODE_K = { asc: 1, desc: 1.15, zig: 1.6 };
  //            tomon, tartib, jadvallar, topilgan 'ok' bo'lib qoladimi
  const LV = [null,
    [3, 'asc', 5, true], [4, 'asc', 4, true], [4, 'desc', 4, true],
    [5, 'asc', 3, false], [5, 'desc', 3, false], [6, 'asc', 2, false],
    [4, 'zig', 4, false], [6, 'desc', 2, false], [5, 'zig', 2, false],
    [6, 'zig', 1, false]];

  const T = (uz, ru, en) => ({ uz, ru, en });
  const clockText = ms => { const s = Math.floor(Math.max(0, ms) / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const clampLv = l => Math.max(1, Math.min(10, Math.round(Number(l)) || 1));

  const BTN_START = { id: 'start', label: T('Boshlash', 'Начать', 'Start'), kind: 'primary' };
  const BTN_RESUME = { id: 'resume', label: T('Davom etish', 'Продолжить', 'Resume'), kind: 'primary' };
  const P_PAUSED = T('Vaqt toʻxtatildi', 'Время остановлено', 'The clock is stopped');
  const P_READY = T('Tayyorlaning…', 'Приготовьтесь…', 'Get ready…');
  const P_OVER = T('Oʻyin tugadi', 'Игра окончена', 'Game over');
  const BOT = T('Juda tez bosishlar — ball berilmadi', 'Слишком быстрые нажатия — баллы не начислены', 'Taps too fast — no points awarded');

  /* Daraja qoidalari — testlar va ilova (masalan, "5×5, kamayish") uchun ochiq. */
  function rules(level) {
    const L = clampLv(level), c = LV[L], n = c[0] * c[0];
    const paceMs = Math.round((100 + 150 * c[0]) * MODE_K[c[1]]);
    return { level: L, side: c[0], n, mode: c[1], tables: c[2], keepFound: c[3],
      paceMs, limitMs: n * Math.max(3000, Math.round(2.5 * paceMs)), breakMs: BREAK_MS };
  }

  /* Bosish tartibi: qaysi son nechanchi bo'lib bosiladi. */
  function order(n, mode) {
    const out = [];
    if (mode === 'asc') for (let i = 1; i <= n; i++) out.push(i);
    else if (mode === 'desc') for (let i = n; i >= 1; i--) out.push(i);
    else for (let lo = 1, hi = n; lo <= hi;) { out.push(lo++); if (lo <= hi) out.push(hi--); }
    return out;
  }

  /* Qoida — intro va o'yin paytida BIR XIL matn (ko'rsatma sakramaydi). */
  function ruleText(n, mode) {
    if (mode === 'asc') return T('1 dan ' + n + ' gacha tartib bilan bosing', 'Нажимайте по порядку: от 1 до ' + n, 'Tap the numbers in order from 1 to ' + n);
    if (mode === 'desc') return T(n + ' dan 1 gacha kamayish tartibida bosing', 'Нажимайте по убыванию: от ' + n + ' до 1', 'Tap the numbers in reverse, from ' + n + ' down to 1');
    return T('Navbat bilan bosing: 1 → ' + n + ' → 2 → ' + (n - 1) + ' → …', 'Нажимайте поочерёдно: 1 → ' + n + ' → 2 → ' + (n - 1) + ' → …',
      'Alternate the ends: 1 → ' + n + ' → 2 → ' + (n - 1) + ' → …');
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

  IQ.games.register({
    id: 'schulte', skill: 'attention',
    langs: ['uz', 'ru', 'en'],
    gridKind: 'square',
    title: T('Shulte jadvali', 'Таблица Шульте', 'Schulte table'),
    desc: T('Sonlarni tartib bilan imkon qadar tez toping', 'Находите числа по порядку как можно быстрее', 'Find the numbers in order as fast as you can'),
    rules, order,
    create(seed, level) {
      const cfg = rules(level), R = IQ.rng(seed), N = cfg.n, ORDER = order(N, cfg.mode);
      const layouts = [];
      for (let k = 0; k < cfg.tables; k++) layouts.push(R.shuffle(Array.from({ length: N }, (_, i) => i + 1)));
      const TOTAL = N * cfg.tables, guard = makeGuard(), log = [], stats = [];

      let last = null, lastLog = null, shown = '';      // o'yin vaqti
      let phase = 'intro', t0 = null, endAt = null;
      let ti = 0, k = 0, found = null, tStart = 0, tErr = 0, errors = 0, fbUntil = 0;
      let badCell = -1, badUntil = 0, okCell = -1, okUntil = 0;

      /* Vaqt faqat tashqaridan. Orqaga ketgan yoki son bo'lmagan vaqt
         oxirgi ma'lum vaqtga tenglanadi — holat orqaga qaytmaydi.
         Devor vaqti → o'yin vaqti: off — pauzalar yig'indisi, hold — o'yin
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

      function startTable(t) {
        found = new Array(N).fill(false); k = 0; tStart = t; tErr = 0;
        badCell = okCell = -1; phase = 'input';
      }
      function endTable(t, timedOut) {
        stats.push({ found: k, ms: t - tStart, errors: tErr, timedOut });
        if (ti + 1 >= cfg.tables) { phase = 'done'; endAt = t; }
        else { phase = 'feedback'; fbUntil = t + BREAK_MS; }
      }
      /* Rejalashtirilgan o'tishlar — o'z vaqti bilan, tartib bo'yicha. */
      function advance(t) {
        let moved = false;
        for (;;) {
          if (phase === 'input' && t >= tStart + cfg.limitMs) endTable(tStart + cfg.limitMs, true);
          else if (phase === 'feedback' && t >= fbUntil) { ti++; startTable(fbUntil); }
          else break;
          moved = true;
        }
        if (moved) push(t, 'tick', null);
      }

      function perfOf() {
        const st = stats.slice();
        if (phase === 'input' && t0 !== null) st.push({ found: k, ms: Math.max(0, lastLog - tStart), errors: tErr });
        let f = 0, ms = 0;
        for (const s of st) { f += s.found; ms += s.ms; }
        const speed = f ? Math.min(1, (cfg.paceMs * f / Math.max(1, ms)) / 1.25) : 0;
        const acc = Math.max(0, 1 - 2 * errors / TOTAL);
        return { found: f, perf: (f / TOTAL) * speed * acc };
      }

      const cellsView = () => layouts[ti].map((num, i) => {
        let state = 'idle';
        if (found[i]) state = (cfg.keepFound || (i === okCell && last < okUntil)) ? 'ok' : 'idle';
        else if (i === badCell && last < badUntil) state = 'bad';
        return { label: String(num), state };
      });
      /* kind: 'square' — Shulte jadvali har fazada kvadrat kataklar (L2). */
      const blankGrid = state => ({ cols: cfg.side, kind: 'square', cells: Array.from({ length: N }, () => ({ label: '', state })) });

      /* HUD — hamma fazada bir xil uyalar. Vaqt: joriy (yoki tugagan)
         jadvalning faol vaqti. */
      function hud() {
        let ms = 0;
        if (phase === 'input') ms = last - tStart;
        else if (phase === 'feedback' || phase === 'done') ms = stats[stats.length - 1].ms;
        return [{ label: T('Jadval', 'Таблица', 'Table'), value: Math.min(ti + 1, cfg.tables) + '/' + cfg.tables },
                { label: T('Vaqt', 'Время', 'Time'), value: clockText(ms) },
                { label: T('Xato', 'Ошибки', 'Mistakes'), value: String(errors) }];
      }
      /* Ko'rinishni belgilaydigan hamma narsa (view() ni har tick'da
         qurib solishtirish qimmat): tick shu o'zgargandagina true. */
      const sig = () => [phase, paused(), holding(), ti, k, errors, stats.length,
        badCell, last < badUntil, okCell, last < okUntil, hud()[1].value].join('|');
      const progress = () => Math.min(1, (stats.reduce((a, s) => a + s.found, 0) + (phase === 'input' ? k : 0)) / TOTAL);

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
          if (phase !== 'intro' || id !== 'start') return;
          push(t, 'press', id);
          t0 = t; ti = 0; startTable(t);
        },
        tap(i, now) {
          const t = clock(now);
          if (!running() || holding()) return;
          advance(t);
          if (phase === 'done' || !Number.isInteger(i) || i < 0 || i >= N) return;
          push(t, 'tap', i);
          guard.input(t, false);
          if (phase !== 'input' || found[i]) return;
          if (layouts[ti][i] === ORDER[k]) {
            found[i] = true; k++; okCell = i; okUntil = t + OK_MS;
            if (badCell === i) badCell = -1;
            if (k >= N) endTable(t, false);
          } else {
            errors++; tErr++; badCell = i; badUntil = t + BAD_MS;
          }
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
        log: () => log.map(e => ({ t: e.t, k: e.k, v: e.v })),
        result() {
          const p = perfOf(), bot = guard.flagged(), L = cfg.level;
          return {
            score: Math.round(100 * p.perf),
            points: bot ? 0 : Math.round((60 + 9 * L) * p.perf),
            correct: p.found,
            total: TOTAL,
            durationMs: t0 === null ? 0 : (phase === 'done' ? endAt : lastLog) - t0,
            nextLevel: bot || t0 === null ? L : p.perf >= 0.75 ? Math.min(10, L + 1) : p.perf < 0.4 ? Math.max(1, L - 1) : L,
            flagged: bot,
          };
        },
        view() {
          const rule = ruleText(N, cfg.mode);
          if (phase === 'intro') {
            return {
              phase, paused: false, prompt: rule, hud: hud(), display: null,
              grid: blankGrid('disabled'), buttons: [BTN_START], progress: 0,
            };
          }
          if (phase === 'done') {
            const bot = guard.flagged();
            return {
              phase, paused: false,
              prompt: bot ? BOT : P_OVER,
              hud: hud(),
              display: bot ? Object.assign({ kind: 'text' }, BOT)
                : { kind: 'text', uz: 'Xato bosishlar: ' + errors, ru: 'Ошибочных нажатий: ' + errors, en: 'Wrong taps: ' + errors },
              grid: { cols: cfg.side, kind: 'square', cells: layouts[ti].map(num => ({ label: String(num), state: 'disabled' })) },
              buttons: [], progress: 1,
            };
          }
          if (holding()) {
            const p = paused();
            return {
              phase, paused: p, prompt: p ? P_PAUSED : P_READY, hud: hud(), display: null,
              grid: blankGrid('hidden'), buttons: p ? [BTN_RESUME] : [], progress: progress(),
            };
          }
          if (phase === 'feedback') {
            const s = stats[stats.length - 1];
            return {
              phase, paused: false,
              prompt: s.timedOut
                ? T('Vaqt tugadi — ' + s.found + ' / ' + N + ' topildi', 'Время вышло — найдено ' + s.found + ' из ' + N, 'Time’s up — found ' + s.found + ' of ' + N)
                : T('Jadval tugadi! Keyingisi hozir boshlanadi', 'Таблица пройдена! Сейчас начнётся следующая', 'Table complete! The next one starts now'),
              hud: hud(), display: null,
              grid: { cols: cfg.side, kind: 'square', cells: layouts[ti].map(num => ({ label: String(num), state: 'disabled' })) },
              buttons: [], progress: progress(),
            };
          }
          return {
            phase, paused: false, prompt: rule, hud: hud(), display: null,
            grid: { cols: cfg.side, kind: 'square', cells: cellsView() },
            buttons: [], progress: progress(),
          };
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
