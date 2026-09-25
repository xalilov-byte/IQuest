/* ─────────────────────────────────────────────────────────────────────────
   src/games/mental-math.js — Og'zaki hisob (skill: speed)

   QOIDA. 60 soniyada iloji boricha ko'p misol yechish. Ekranda misol
   ("7 + 5 = ?"), ostida 4 ta javob — 2×2 katak (grid). To'g'ri javob
   0,25 s 'ok' bo'lib yonadi; xato — tanlangan 'bad', to'g'risi 'ok',
   0,7 s (xato vaqt yo'qotadi). Keyin darhol keyingi misol. Raund 60 s
   yoki 40 ta javob bilan tugaydi (qaysi biri oldin) — o'yin uzunligi
   chegaralangan.

   MISOLLAR (daraja bo'yicha; hammasi butun son, bo'lish doim qoldiqsiz):
     1: a ± b, bir xonali, natija ≥ 1        2: 20 gacha ±
     3: ikki xonali ± bir xonali, ×2..5      4: ikki xonali ± ikki xonali (doim
                                                o'nlikdan o'tish / olish), ×3..9
     5: ×, ÷ jadvali, o'tish bilan ± (100+)   6: ikki amal: a+b−c, a×b±c, a÷b+c
     7: ikki xonali × bir xonali, 3 xonali ÷, a + b×c (amallar tartibi)
     8: MANFIY natija ruxsat: a − b (b > a), (a+b)×c, a×b − c×d
     9: 11..19 × 11..19, a×b + c×d, (a − b)×c, 3 xonali ÷ bir xonali
    10: 12..25 × 12..25, (a+b)×c − d, a×b÷c, katta a×b − c×d
   1–7 darajada hech bir javob (va variant) manfiy emas.

   VARIANTLAR. Aniq bitta to'g'ri; qolgan uchtasi "ishonarli xato":
   amalni adashtirish (a+b o'rniga a−b yoki a×b), o'nlikdan o'tishdagi
   xato (±10), amallar tartibi xatosi ((a+b)×c), jadvalda bir qator
   siljish (a×(b±1)), ±1/±2. Variantlar o'sish tartibida ko'rsatiladi
   (kerakli sonni tez topish uchun), to'g'ri javobning O'RNI esa
   tasodifiy: undan kichik variantlar soni 0..3 dan teng tanlanadi —
   "o'rtadagisini tanla" naqshi ishlamaydi. Yana: javob hech qachon ikki
   distraktorning o'rtasi emas (19×6, 19×7, 19×8 kabi uchlik yo'q);
   kamida bitta distraktor ±10 ichida; bir qarashda chiqib ketadigan
   (4 barobardan uzoq) variant yo'q.

   BAHOLASH:
     to'g'ri  = to'g'ri javoblar (javob vaqti ≥ 250 ms — undan tezi
                odamga imkonsiz: o'qish + hisob + bosish)
     sof      = to'g'ri − xato      (tasodifiy bosish: 1 to'g'ri / 3 xato → manfiy)
     perf     = clamp(sof / TARGET[daraja], 0, 1)
                TARGET = 30 27 24 21 19 16 14 12 10 9 — "a'lo" sof natija
     score    = round(100 · perf)
     points   = round((60 + 9·daraja) · perf)   → maksimum 69 … 150
     nextLevel: perf ≥ 0.75 → +1, perf < 0.40 → −1, aks holda o'sha.

   BOTGA QARSHI: shubhali kiritish — oldingisidan < 120 ms keyin YOKI
   misol ko'ringanidan < 250 ms da javob. Ketma-ket 3 ta shubhali yoki
   jami ≥ 5 va ≥ 15% — points = 0, daraja o'zgarmaydi.

   Jurnal: 'press' start, har 'tap', holatni vaqt bilan o'zgartirgan
   (keyingi misol / tugadi) 'tick'. O'tishlar rejalashtirilgan vaqtda
   hisoblanadi — natija tick chastotasiga bog'liq emas.
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const IQ = root.IQ;

  const FAST_MS = 120, MIN_RT = 250, LIMIT_MS = 60000, MAXQ = 40, FB_OK = 250, FB_BAD = 700;
  const TARGET = [0, 30, 27, 24, 21, 19, 16, 14, 12, 10, 9];
  const MINUS = '−';

  const T = (uz, ru) => ({ uz, ru });
  const num = v => (v < 0 ? MINUS + (-v) : String(v));
  const clampLv = l => Math.max(1, Math.min(10, Math.round(Number(l)) || 1));
  const clockText = ms => { const s = Math.ceil(Math.max(0, ms) / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  /* ── Misol shablonlari: { text, value, near } — near: ishonarli xatolar ── */
  const P = (text, value, near) => ({ text, value, near });
  const add = (a, b) => P(a + ' + ' + b, a + b, [a - b, a + b + 10, a + b - 10, a <= 12 && b <= 12 ? a * b : NaN]);
  const sub = (a, b) => P(a + ' ' + MINUS + ' ' + b, a - b, [a + b, a - b + 10, a - b - 10, b - a]);
  const mul = (a, b) => P(a + ' × ' + b, a * b, [a + b, a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, a * b + 10, a * b - 10]);
  const div = (b, q) => P((b * q) + ' ÷ ' + b, q, [q + 1, q - 1, q + 2, q - 2, q + 10, q - 10, b]);
  const addSub = (a, b, c) => P(a + ' + ' + b + ' ' + MINUS + ' ' + c, a + b - c, [a + b + c, a - b + c, a + b - c + 10, a + b - c - 10]);
  const mulAdd = (a, b, c) => P(a + ' × ' + b + ' + ' + c, a * b + c, [a * (b + c), a * b - c, a * b + c + 10, a * b + c - 10]);
  const mulSub = (a, b, c) => P(a + ' × ' + b + ' ' + MINUS + ' ' + c, a * b - c, [a * (b - c), a * b + c, a * b - c + 10, a * b - c - 10]);
  const divAdd = (b, q, c) => P((b * q) + ' ÷ ' + b + ' + ' + c, q + c, [q + c + 1, q + c - 1, q + c + 10, b + c, q * c]);
  const addMul = (a, b, c) => P(a + ' + ' + b + ' × ' + c, a + b * c, [(a + b) * c, a + b + c, a + b * (c + 1), a + b * (c - 1)]);
  const subMul = (a, b, c) => P(a + ' ' + MINUS + ' ' + b + ' × ' + c, a - b * c, [(a - b) * c, a - b - c, a - b * c + 10, a - b * c - 10]);
  const parMul = (a, b, c) => P('(' + a + ' + ' + b + ') × ' + c, (a + b) * c, [a + b * c, (a + b) * (c + 1), (a + b) * (c - 1), (a + b) * c + 10]);
  const mulMinusMul = (a, b, c, d) => P(a + ' × ' + b + ' ' + MINUS + ' ' + c + ' × ' + d, a * b - c * d, [(a * b - c) * d, a * b + c * d, a * b - c * d + 10, a * b - c * d - 10]);
  const mulPlusMul = (a, b, c, d) => P(a + ' × ' + b + ' + ' + c + ' × ' + d, a * b + c * d, [(a * b + c) * d, a * b - c * d, a * b + c * d + 10, a * b + c * d - 10]);
  const parSubMul = (a, b, c) => P('(' + a + ' ' + MINUS + ' ' + b + ') × ' + c, (a - b) * c, [a - b * c, (b - a) * c, (a - b) * (c + 1), (a - b) * c + 10]);
  const parMulSub = (a, b, c, d) => P('(' + a + ' + ' + b + ') × ' + c + ' ' + MINUS + ' ' + d, (a + b) * c - d, [a + b * c - d, (a + b) * c + d, (a + b) * c - d + 10, (a + b) * c - d - 10]);
  const mulDiv = (c, k, b) => P((c * k) + ' × ' + b + ' ÷ ' + c, k * b, [k * b + b, k * b - b, k * b + 10, k + b]);

  function problem(R, L) {
    const r = (a, b) => R.range(a, b);
    const pick = fs => fs[R.int(fs.length)]();
    switch (L) {
      case 1: return pick([() => add(r(1, 9), r(1, 9)), () => { const a = r(3, 12); return sub(a, r(1, a - 1)); }]);
      case 2: return pick([() => add(r(6, 14), r(3, 9)), () => sub(r(11, 20), r(2, 9))]);
      case 3: return pick([() => add(r(12, 89), r(3, 9)), () => sub(r(20, 99), r(3, 9)), () => mul(r(2, 5), r(2, 9))]);
      case 4: return pick([
        () => { const ua = r(1, 9); return add(10 * r(1, 5) + ua, 10 * r(1, 3) + r(10 - ua, 9)); },          // birlikdan o'tadi
        () => { const ua = r(0, 8), ta = r(3, 9); return sub(10 * ta + ua, 10 * r(1, ta - 1) + r(ua + 1, 9)); }, // o'nlikdan oladi
        () => mul(r(3, 9), r(3, 9))]);
      case 5: return pick([() => mul(r(3, 9), r(3, 9)), () => div(r(2, 9), r(2, 9)),
        () => { const ua = r(1, 9); return add(10 * r(2, 7) + ua, 10 * r(1, 5) + r(10 - ua, 9)); },
        () => { const ua = r(0, 8); return sub(100 + 10 * r(0, 9) + ua, 10 * r(2, 9) + r(ua + 1, 9)); }]);
      case 6: return pick([() => { const a = r(10, 40), b = r(5, 30); return addSub(a, b, r(5, a + b - 1)); },
        () => mulAdd(r(2, 9), r(2, 9), r(2, 20)), () => { const a = r(2, 9), b = r(2, 9); return mulSub(a, b, r(1, a * b - 1)); },
        () => divAdd(r(2, 9), r(2, 9), r(2, 20))]);
      case 7: return pick([() => mul(r(12, 29), r(3, 9)), () => div(r(3, 9), r(11, 25)), () => addMul(r(2, 30), r(2, 9), r(2, 9)),
        () => { const b = r(2, 9), c = r(2, 9); return subMul(r(b * c + 1, b * c + 30), b, c); }]);
      case 8: return pick([() => { const a = r(11, 59); return sub(a, r(a + 12, a + 60)); }, () => parMul(r(2, 15), r(2, 15), r(2, 9)),
        () => mulMinusMul(r(2, 9), r(2, 9), r(2, 9), r(2, 9)), () => subMul(r(12, 60), r(3, 9), r(3, 9))]);
      case 9: return pick([() => mul(r(11, 19), r(11, 19)), () => mulPlusMul(r(3, 12), r(3, 12), r(3, 12), r(3, 12)),
        () => { const a = r(2, 20); let b = r(2, 19); if (b >= a) b++; return parSubMul(a, b, r(2, 9)); },
        () => div(r(3, 9), r(12, 60))]);
      default: return pick([() => mul(r(12, 25), r(12, 25)), () => parMulSub(r(2, 20), r(2, 20), r(2, 9), r(2, 50)),
        () => mulDiv(r(3, 9), r(2, 9), r(2, 12)), () => mulMinusMul(r(4, 15), r(4, 15), r(4, 15), r(4, 15))]);
    }
  }

  /* 4 ta variant: to'g'ri + 3 ta ishonarli xato. O'sish tartibida;
     to'g'ri javobdan kichiklar soni (= o'rni) tasodifiy 0..3. */
  /* Ishonarli: javobga yaqin (±12), ishora xatosi (−v) yoki bir xil
     ishorali va 4 barobardan oshmaydi. "19 × 7" yonida "26" (a+b) —
     bir qarashda chiqarib tashlanadi, shuning uchun olinmaydi. */
  function plausible(x, v) {
    if (Math.abs(x - v) <= 12 || x === -v) return true;
    const ax = Math.abs(x), av = Math.abs(v);
    return (x < 0) === (v < 0) && Math.min(ax, av) > 0 && Math.max(ax, av) <= 4 * Math.min(ax, av);
  }

  function options(R, p, allowNeg) {
    const v = p.value, seen = new Set([v]), pool = [];
    const ok = x => Number.isInteger(x) && !seen.has(x) && (allowNeg || x >= 0) && plausible(x, v);
    for (const x of R.shuffle(p.near)) if (ok(x)) { seen.add(x); pool.push(x); }
    for (const d of [1, 2, 10, 3, 4, 5, 11, 9, 6, 7, 8, 12, 20]) {
      for (const s of R.shuffle([1, -1])) { const x = v + s * d; if (ok(x)) { seen.add(x); pool.push(x); } }
    }
    const below = pool.filter(x => x < v), above = pool.filter(x => x > v);
    let lo = Math.min(R.int(4), below.length);
    if (above.length < 3 - lo) lo = 3 - above.length;
    /* Kamida bitta yaqin (±10) distraktor — javob "yolg'iz" turib qolmasin
       (uzoqlarni tashlab, yaqin to'dani tanlash naqshi ishlamasin). */
    const side = lo === 0 ? above : lo === 3 ? below : (R.chance(0.5) ? below : above);
    const ci = side.findIndex(x => Math.abs(x - v) <= 10);
    if (ci > 0) side.unshift(side.splice(ci, 1)[0]);
    /* Variantlar orasida 3 hadli arifmetik progressiya bo'lmasin: {v−d, v, v+d}
       bo'lsa "o'rtadagisi to'g'ri" — misolni yechmasdan topiladi (masalan,
       19×6, 19×7, 19×8). Iloji bo'lmasa (1-darajada juda kichik javob) —
       shartsiz olinadi. */
    const chosen = [v];
    const apFree = x => {
      for (let i = 0; i < chosen.length; i++) {
        for (let j = i + 1; j < chosen.length; j++) {
          const a = chosen[i], b = chosen[j];
          if (a + b === 2 * x || a + x === 2 * b || b + x === 2 * a) return false;
        }
      }
      return true;
    };
    const take = (list, n) => {
      const got = [];
      for (const strict of [true, false]) {
        for (const x of list) {
          if (got.length >= n) break;
          if (got.indexOf(x) === -1 && (!strict || apFree(x))) { got.push(x); chosen.push(x); }
        }
      }
      return got;
    };
    const lower = take(below, lo), upper = take(above, 3 - lo);
    const opts = lower.concat(upper, [v]).sort((a, b) => a - b);
    return { opts, correct: opts.indexOf(v) };
  }

  function rules(level) {
    const L = clampLv(level);
    return { level: L, limitMs: LIMIT_MS, maxQ: MAXQ, target: TARGET[L], minRtMs: MIN_RT, allowNegative: L >= 8 };
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
    id: 'mental-math', skill: 'speed',
    title: T('Og\'zaki hisob', 'Устный счёт'),
    desc: T('60 soniyada iloji boricha ko\'p misol yeching', 'Решите как можно больше примеров за 60 секунд'),
    rules,
    create(seed, level) {
      const cfg = rules(level), L = cfg.level, R = IQ.rng(seed);
      const Q = [];
      for (let i = 0; i < MAXQ; i++) { const p = problem(R, L); const o = options(R, p, cfg.allowNegative); Q.push({ text: p.text, value: p.value, opts: o.opts, correct: o.correct }); }
      const guard = makeGuard(), log = [];

      let last = null, lastLog = null, shown = '';
      let phase = 'intro', t0 = null, endAt = null;
      let qi = 0, tShow = 0, fbUntil = 0, chosen = -1, answered = 0, correct = 0, wrong = 0;

      function clock(now) {
        let t = (typeof now === 'number' && isFinite(now)) ? now : (last === null ? 0 : last);
        if (last !== null && t < last) t = last;
        return (last = t);
      }
      const push = (t, kind, v) => { log.push({ t, k: kind, v }); lastLog = t; };
      const finish = t => { phase = 'done'; endAt = t; };

      function advance(t) {
        let moved = false;
        const tEnd = t0 + LIMIT_MS;
        for (;;) {
          if (phase === 'feedback' && t >= fbUntil && fbUntil < tEnd) {
            if (answered >= MAXQ) finish(fbUntil);
            else { qi++; tShow = fbUntil; chosen = -1; phase = 'input'; }
          } else if ((phase === 'input' || phase === 'feedback') && t >= tEnd) finish(tEnd);
          else break;
          moved = true;
        }
        if (moved) push(t, 'tick', null);
      }

      function perfOf() {
        return Math.max(0, Math.min(1, (correct - wrong) / cfg.target));
      }

      const hudPlay = () => [
        { label: T('Vaqt', 'Время'), value: clockText(t0 + LIMIT_MS - last) },
        { label: T('To\'g\'ri', 'Верно'), value: String(correct) },
        { label: T('Xato', 'Ошибки'), value: String(wrong) },
      ];

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
          t0 = t; qi = 0; tShow = t; phase = 'input';
        },
        tap(i, now) {
          const t = clock(now);
          if (phase === 'intro' || phase === 'done') return;
          advance(t);
          if (phase === 'done' || !Number.isInteger(i) || i < 0 || i > 3) return;
          push(t, 'tap', i);
          if (phase !== 'input') { guard.input(t, false); return; }
          const q = Q[qi], fast = t - tShow < MIN_RT, right = i === q.correct;
          guard.input(t, fast);
          answered++; chosen = i;
          if (!right) wrong++;
          else if (!fast) correct++;
          phase = 'feedback'; fbUntil = t + (right ? FB_OK : FB_BAD);
        },
        log: () => log.map(e => ({ t: e.t, k: e.k, v: e.v })),
        result() {
          const perf = perfOf(), bot = guard.flagged();
          return {
            score: Math.round(100 * perf),
            points: bot ? 0 : Math.round((60 + 9 * L) * perf),
            correct, total: answered,
            durationMs: t0 === null ? 0 : (phase === 'done' ? endAt : lastLog) - t0,
            nextLevel: bot || t0 === null ? L : perf >= 0.75 ? Math.min(10, L + 1) : perf < 0.4 ? Math.max(1, L - 1) : L,
          };
        },
        view() {
          if (phase === 'intro') {
            return {
              phase,
              prompt: T('60 soniyada iloji boricha ko\'p misol yeching. Xato javob bitta to\'g\'ri javobni "yeydi".',
                        'Решите как можно больше примеров за 60 секунд. Ошибка «съедает» один верный ответ.'),
              hud: [{ label: T('Daraja', 'Уровень'), value: String(L) }, { label: T('Vaqt', 'Время'), value: '1:00' }],
              display: { kind: 'text', uz: '4 ta javobdan to\'g\'risini bosing', ru: 'Нажмите верный из 4 ответов' },
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
                    { label: T('To\'g\'ri', 'Верно'), value: correct + '/' + answered },
                    { label: T('Xato', 'Ошибки'), value: String(wrong) }],
              display: { kind: 'text', uz: correct + ' ta to\'g\'ri javob', ru: 'Верных ответов: ' + correct },
              grid: null, buttons: [], progress: 1,
            };
          }
          const q = Q[qi], fb = phase === 'feedback';
          const cells = q.opts.map((o, i) => ({
            label: num(o),
            state: !fb ? 'idle' : i === q.correct ? 'ok' : i === chosen ? 'bad' : 'disabled',
          }));
          const right = fb && chosen === q.correct;
          return {
            phase,
            prompt: !fb ? T('To\'g\'ri javobni tanlang', 'Выберите верный ответ')
                  : right ? T('To\'g\'ri!', 'Верно!')
                  : T('Xato — to\'g\'ri javob: ' + num(q.value), 'Ошибка — верный ответ: ' + num(q.value)),
            hud: hudPlay(),
            display: { kind: 'text', uz: q.text + ' = ' + (fb ? num(q.value) : '?'), ru: q.text + ' = ' + (fb ? num(q.value) : '?') },
            grid: { cols: 2, cells },
            buttons: [],
            progress: Math.min(1, Math.max((last - t0) / LIMIT_MS, answered / MAXQ)),
          };
        },
      };
      return g;
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
