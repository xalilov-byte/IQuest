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
   ≥ 15% — points = 0, daraja o'zgarmaydi. Bitta qo'sh bosish jazolanmaydi.

   Jurnal (log): 'press' start, har 'tap', va o'yin holatini vaqt bilan
   o'zgartirgan (jadval yopildi / keyingisi / tugadi) 'tick'. Holat
   o'tishlari rejalashtirilgan vaqtda hisoblanadi (tick kelgan paytda
   emas) — natija tick chastotasiga bog'liq emas.
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const IQ = root.IQ;

  const FAST_MS = 120, BAD_MS = 400, OK_MS = 250, BREAK_MS = 1500;
  const MODE_K = { asc: 1, desc: 1.15, zig: 1.6 };
  //            tomon, tartib, jadvallar, topilgan 'ok' bo'lib qoladimi
  const LV = [null,
    [3, 'asc', 5, true], [4, 'asc', 4, true], [4, 'desc', 4, true],
    [5, 'asc', 3, false], [5, 'desc', 3, false], [6, 'asc', 2, false],
    [4, 'zig', 4, false], [6, 'desc', 2, false], [5, 'zig', 2, false],
    [6, 'zig', 1, false]];

  const T = (uz, ru) => ({ uz, ru });
  const sec = ms => (Math.max(0, ms) / 1000).toFixed(1).replace('.', ',');
  const clockText = ms => { const s = Math.floor(Math.max(0, ms) / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const clampLv = l => Math.max(1, Math.min(10, Math.round(Number(l)) || 1));

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

  function ruleText(n, mode) {
    if (mode === 'asc') return T('1 dan ' + n + ' gacha tartib bilan bosing', 'Нажимайте по порядку: от 1 до ' + n);
    if (mode === 'desc') return T(n + ' dan 1 gacha kamayish tartibida bosing', 'Нажимайте по убыванию: от ' + n + ' до 1');
    return T('Navbat bilan bosing: 1 → ' + n + ' → 2 → ' + (n - 1) + ' → …', 'Нажимайте поочерёдно: 1 → ' + n + ' → 2 → ' + (n - 1) + ' → …');
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
    title: T('Shulte jadvali', 'Таблица Шульте'),
    desc: T('Sonlarni tartib bilan imkon qadar tez toping', 'Находите числа по порядку как можно быстрее'),
    rules, order,
    create(seed, level) {
      const cfg = rules(level), R = IQ.rng(seed), N = cfg.n, ORDER = order(N, cfg.mode);
      const layouts = [];
      for (let k = 0; k < cfg.tables; k++) layouts.push(R.shuffle(Array.from({ length: N }, (_, i) => i + 1)));
      const TOTAL = N * cfg.tables, guard = makeGuard(), log = [], stats = [];

      let last = null, lastLog = null, shown = '';
      let phase = 'intro', t0 = null, endAt = null;
      let ti = 0, k = 0, found = null, tStart = 0, tErr = 0, errors = 0, fbUntil = 0;
      let badCell = -1, badUntil = 0, okCell = -1, okUntil = 0;

      /* Vaqt faqat tashqaridan. Orqaga ketgan yoki son bo'lmagan vaqt
         oxirgi ma'lum vaqtga tenglanadi — holat orqaga qaytmaydi. */
      function clock(now) {
        let t = (typeof now === 'number' && isFinite(now)) ? now : (last === null ? 0 : last);
        if (last !== null && t < last) t = last;
        return (last = t);
      }
      const push = (t, kind, v) => { log.push({ t, k: kind, v }); lastLog = t; };

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

      const g = {
        get done() { return phase === 'done'; },
        tick(now) {
          const t = clock(now);
          if (phase !== 'intro' && phase !== 'done') advance(t);
          const key = JSON.stringify(g.view()), changed = key !== shown;
          shown = key;
          return changed;
        },
        press(id, now) {
          const t = clock(now);
          if (phase !== 'intro' || id !== 'start') return;
          push(t, 'press', id);
          t0 = t; ti = 0; startTable(t);
        },
        tap(i, now) {
          const t = clock(now);
          if (phase === 'intro' || phase === 'done') return;
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
          };
        },
        view() {
          const rule = ruleText(N, cfg.mode), sz = cfg.side + '×' + cfg.side;
          if (phase === 'intro') {
            return {
              phase, prompt: rule,
              hud: [{ label: T('Daraja', 'Уровень'), value: String(cfg.level) },
                    { label: T('Jadval', 'Таблица'), value: sz },
                    { label: T('Jadvallar', 'Таблиц'), value: String(cfg.tables) }],
              display: { kind: 'text', uz: 'Tez va xatosiz! Noto\'g\'ri bosish — jarima.', ru: 'Быстро и без ошибок! Неверное нажатие — штраф.' },
              grid: null,
              buttons: [{ id: 'start', label: T('Boshlash', 'Начать'), kind: 'primary' }],
              progress: 0,
            };
          }
          if (phase === 'done') {
            const r = g.result(), bot = guard.flagged();
            return {
              phase,
              prompt: bot ? T('Juda tez bosishlar aniqlandi — ball berilmadi', 'Слишком быстрые нажатия — очки не начислены')
                          : T('O\'yin tugadi', 'Игра окончена'),
              hud: [{ label: T('Ball', 'Очки'), value: String(r.points) },
                    { label: T('Topildi', 'Найдено'), value: r.correct + '/' + r.total },
                    { label: T('Xato', 'Ошибки'), value: String(errors) }],
              display: { kind: 'text', uz: 'Natija: ' + r.score + ' / 100', ru: 'Результат: ' + r.score + ' / 100' },
              grid: null, buttons: [], progress: 1,
            };
          }
          const hud = [];
          if (cfg.tables > 1) hud.push({ label: T('Jadval', 'Таблица'), value: (ti + 1) + '/' + cfg.tables });
          const progress = Math.min(1, (stats.reduce((a, s) => a + s.found, 0) + (phase === 'input' ? k : 0)) / TOTAL);
          if (phase === 'feedback') {
            const s = stats[stats.length - 1];
            hud.push({ label: T('Vaqt, s', 'Время, с'), value: sec(s.ms) }, { label: T('Xato', 'Ошибки'), value: String(s.errors) });
            return {
              phase,
              prompt: s.timedOut
                ? T('Vaqt tugadi — ' + s.found + ' / ' + N + ' topildi', 'Время вышло — найдено ' + s.found + ' из ' + N)
                : T('Jadval tugadi! Keyingisi hozir', 'Таблица пройдена! Сейчас следующая'),
              hud,
              display: { kind: 'text', uz: sec(s.ms) + ' s', ru: sec(s.ms) + ' с' },
              grid: null, buttons: [], progress,
            };
          }
          hud.push({ label: T('Vaqt', 'Время'), value: clockText(last - tStart) },
                   { label: T('Xato', 'Ошибки'), value: String(errors) });
          return {
            phase, prompt: rule, hud, display: null,
            grid: { cols: cfg.side, cells: cellsView() },
            buttons: [], progress,
          };
        },
      };
      return g;
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
