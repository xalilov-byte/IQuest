/* ─────────────────────────────────────────────────────────────────────────
   O'yin: "N-back" (nback) — ishchi xotira

   QOIDA: 3×3 taxtaning chetidagi 8 ta joydan birida kvadrat paydo bo'ladi
   (har SOA ms da yangisi). Joriy joy N qadam oldingisi bilan BIR XIL
   bo'lsa — «Mos» tugmasi bosiladi, aks holda hech narsa bosilmaydi.
   Birinchi N ta ko'rinish faqat eslab qolish uchun (phase 'show'),
   keyingi 20 tasi baholanadi (phase 'input'), ulardan aniq 6 tasi (30%)
   mos keladi.

   NIMA UCHUN HARF EMAS, JOY (fazoviy N-back): ilova o'zbek (lotin) va rus
   (kirill) tilida. "A", "B", "C", "E", "H", "K", "M", "O", "P", "T", "X"
   ikkala alifboda bir xil ko'rinadi, lekin boshqacha o'qiladi (kirill "В"
   — "v", "Н" — "n", "Р" — "r"): o'yinchi ichida "aytib" eslaydi va harf
   nomi chalg'itadi. Raqam bu muammoni hal qiladi, lekin arifmetik
   uyg'unlik ("7 dan keyin 8") kutilmagan naqsh beradi. Joy esa tilga
   umuman bog'liq emas, o'qish talab qilmaydi va Jaeggi va boshq. (2008)
   dual N-back'ining fazoviy qismi aynan shunday — 8 joy, markazda
   nuqta. Kvadrat rang bilan emas, to'liq/bo'sh ko'rinish bilan
   ajraladi (§2.5).

   DARAJA (1..10):
     daraja  N  SOA (ms)  "tuzoq"lar
       1     1   3000      —
       2     1   2500      —
       3     2   3000      —
       4     2   2500      —
       5     2   2000      —
       6     3   3000      —
       7     3   2500      —
       8     3   2000      —
       9     3   2000     30%
      10     3   1800     50%
   Ko'rinishlar soni 20 + N. Kvadrat har SOA boshida 500 ms ko'rinadi,
   qolgan vaqt taxta bo'sh (bir joy ketma-ket kelsa ham yangi ko'rinish
   sezilsin). "Tuzoq" — mos EMAS ko'rinishning ulushi, u N−1 yoki N+1
   qadam oldingi joyni takrorlaydi: "tanish tuyuldi" bilan bosib
   yuboradiganni ushlaydi (yuqori darajada qiyinlik shu).

   BAHOLASH — Pr = (topilgan / mos) − (noto'g'ri bosish / mos emas)
   (Snodgrass & Corwin, 1988; N-back tadqiqotlarida keng ishlatiladi).
   NIMA UCHUN d′ EMAS:
     · 6 ta mosda "hammasini topdi" (ulush = 1) tez-tez bo'ladi — d′
       cheksiz, qo'shimcha tuzatish (loglinear) kerak va natija
       tuzatishga bog'liq bo'lib qoladi;
     · d′ teskari normal taqsimot funksiyasini (log/exp) talab qiladi —
       Math.log/exp natijasi JS dvigatellari orasida oxirgi bitda farq
       qilishi mumkin, server replay esa BAYTMA-BAYT bir xil natija
       berishi shart. Pr faqat butun sonlar va bitta bo'lish — IEEE da
       aniq belgilangan.
     · Pr da tasodif = 0: "hammasiga bosish" ham, "hech narsa bosmaslik"
       ham, tangaday bosish ham ≈ 0 beradi. Shuning uchun ball ham ≈ 0.
   score = max(0, round(100·Pr)) — "aniqlik %".
   correct = topilgan + to'g'ri o'tkazib yuborilgan, total = 20.

   BALL (points): max(0, round(Pr′ · (40 + 12·daraja))), bu yerda Pr′ da
   faqat "toza" topilganlar hisoblanadi. 1-daraja mukammal → 52,
   5-daraja → 100, 10-daraja → 160; odatiy Pr ≈ 0.6 → 30–80.
   Toza bo'lmagan javob:
     · ko'rinish paydo bo'lganidan < 120 ms ichida bosish — odam bunday
       tez javob bera olmaydi (oldindan bosish). Bunday bosish hisobga
       olinmaydi;
     · oldingi bosishdan < 120 ms keyin (avtokliker) — javob yoziladi,
       lekin topilgan bo'lsa ham ball bermaydi; noto'g'ri bo'lsa
       jarima baribir qoladi.

   KEYINGI DARAJA — Jaeggi va boshq. (2008) qoidasi: xato (o'tkazib
   yuborilgan mos + noto'g'ri bosish) 3 tadan kam → +1, 5 tadan ko'p → −1.

   VAQT: ko'rinishlar "Boshlash" bosilgan paytdan qat'iy jadval bo'yicha
   (ritm — N-back'ning bir qismi, tick kechikishi uni surmaydi).
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const IQ = root.IQ;

  const LEVELS = [null,
    [1, 3000, 0], [1, 2500, 0],
    [2, 3000, 0], [2, 2500, 0], [2, 2000, 0],
    [3, 3000, 0], [3, 2500, 0], [3, 2000, 0], [3, 2000, 0.3], [3, 1800, 0.5],
  ];
  const SCORED = 20;           // baholanadigan ko'rinishlar
  const TARGETS = 6;           // ulardan mos keladigani (30%)
  const NONTARGETS = SCORED - TARGETS;
  const LEAD_MS = 1500;        // "Boshlash" dan birinchi ko'rinishgacha
  const ON_MS = 500;
  const RT_MIN_MS = 120;       // bundan tez javob — oldindan bosish
  const MIN_GAP_MS = 120;      // bundan tez ketma-ket bosish — avtokliker

  /* 3×3 taxtaning chetidagi 8 katak (soat yo'nalishida), markaz — nuqta. */
  const RING = [0, 1, 2, 5, 8, 7, 6, 3];

  /* SVG'lar oldindan: 0..7 — kvadrat shu joyda, 8 — bo'sh taxta.
     Qoidalar §2 dagidek: o'z oq foni, chiziq #1c1b29, kulrang #8a8799. */
  const BOARDS = (function () {
    const cell = c => ({ x: 5 + (c % 3) * 31, y: 5 + Math.floor(c / 3) * 31 });
    let base = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
      + '<rect width="100" height="100" fill="#fff"/>';
    for (const c of RING) {
      const p = cell(c);
      base += '<rect x="' + p.x + '" y="' + p.y + '" width="28" height="28" rx="4" fill="none" stroke="#8a8799" stroke-width="1.5"/>';
    }
    base += '<path d="M50 45v10M45 50h10" stroke="#8a8799" stroke-width="2"/>';
    const out = RING.map(c => {
      const p = cell(c);
      return base + '<rect x="' + (p.x + 2) + '" y="' + (p.y + 2) + '" width="24" height="24" rx="3" fill="#1c1b29"/></svg>';
    });
    out.push(base + '</svg>');
    return out;
  })();

  const tx = (uz, ru) => ({ uz, ru });
  const clampLevel = lv => Math.max(1, Math.min(10, Math.round(Number(lv)) || 1));
  const stepsRu = n => (n === 1 ? 'шаг' : 'шага');
  const secText = ms => String(ms / 1000).replace('.', ',');

  const START_BTN = { id: 'start', label: tx('Boshlash', 'Начать'), kind: 'primary' };
  const MATCH_BTN = { id: 'match', label: tx('Mos', 'Совпадает'), kind: 'primary' };
  const L_N = tx('N', 'N');
  const L_TOTAL = tx('Ko\'rinishlar', 'Показов');
  const L_HITS = tx('Topildi', 'Найдено');
  const L_ERR = tx('Xato', 'Ошибки');

  function create(seed, level) {
    const L = clampLevel(level);
    const r = IQ.rng(seed >>> 0);
    const N = LEVELS[L][0], SOA = LEVELS[L][1], LURE = LEVELS[L][2];
    const LEN = SCORED + N;
    const PMAX = 40 + 12 * L;

    /* Ketma-ketlik o'yin boshida to'liq tuziladi: mos keladiganlar
       aniq 6 ta (tasodifan 3 yoki 10 bo'lib qolsa, baho beqaror). */
    const isT = new Array(LEN).fill(false);
    r.shuffle(Array.from({ length: SCORED }, (_, i) => N + i))
      .slice(0, TARGETS).forEach(i => { isT[i] = true; });
    const seq = [];
    for (let i = 0; i < LEN; i++) {
      if (i < N) { seq.push(r.int(8)); continue; }
      const back = seq[i - N];
      if (isT[i]) { seq.push(back); continue; }
      let p = -1;
      if (LURE && r.chance(LURE)) {
        const lures = [seq[i - N + 1], i - N - 1 >= 0 ? seq[i - N - 1] : -1]
          .filter(x => x >= 0 && x !== back);
        if (lures.length) p = r.pick(lures);
      }
      if (p < 0) { p = r.int(7); if (p >= back) p++; }   // N oldingisidan farqli
      seq.push(p);
    }

    const log = [];
    let phase = 'intro';
    let idx = -1, lit = false;
    const resp = new Array(LEN).fill(0);   // 0 — bosilmagan, 1 — toza javob, 2 — shubhali (tez)
    let t0 = null, tStart = 0, tEnd = null, tLast = null;
    let clock = -Infinity, lastInput = -Infinity;

    function at(now) {
      if (Number.isFinite(now)) { if (now > clock) clock = now; }
      else if (clock === -Infinity) clock = 0;
      return clock;
    }

    /* Holat faqat ko'rinish o'zgarganda o'zgaradi va shunda true
       (tick jurnali shunga tayanadi — matrix-memory.js izohiga qarang). */
    function advance(t) {
      if (phase !== 'show' && phase !== 'input') return false;
      const rel = t - tStart;
      if (rel >= LEN * SOA) {
        phase = 'done'; lit = false;
        tEnd = tStart + LEN * SOA;   // jadvaldagi oxir — tick kechikishiga bog'liq emas
        return true;
      }
      const j = rel < 0 ? -1 : Math.floor(rel / SOA);
      const on = j >= 0 && rel - j * SOA < ON_MS;
      const ph = j >= N ? 'input' : 'show';
      if (j === idx && on === lit && ph === phase) return false;
      idx = j; lit = on; phase = ph;
      return true;
    }

    function tick(now) {
      if (phase === 'done') return false;
      const t = at(now);
      const ch = advance(t);
      if (ch) { log.push({ t, k: 'tick', v: 0 }); tLast = t; }
      return ch;
    }

    function press(id, now) {
      if (phase === 'done') return;
      const t = at(now);
      tick(t);
      if (phase === 'done') return;
      if (phase === 'intro') {
        if (id !== 'start') return;
        log.push({ t, k: 'press', v: id }); tLast = t;
        lastInput = t;
        t0 = t; tStart = t + LEAD_MS;
        phase = 'show'; idx = -1; lit = false;
        return;
      }
      if (id !== 'match') return;
      log.push({ t, k: 'press', v: id }); tLast = t;
      const fast = t - lastInput < MIN_GAP_MS;
      lastInput = t;
      // birinchi N ta — solishtiradigan narsa yo'q; bitta ko'rinishga bitta javob
      if (idx < N || resp[idx]) return;
      if (t - (tStart + idx * SOA) < RT_MIN_MS) return;
      resp[idx] = fast ? 2 : 1;
    }

    /* upto — tugagan ko'rinishlar chegarasi: joriy ko'rinishda o'yinchi
       hali bosishi mumkin, uni "o'tkazib yuborildi" deb bo'lmaydi. */
    function tally() {
      const upto = phase === 'done' ? LEN : Math.max(N, idx);
      let hit = 0, clean = 0, fa = 0, miss = 0, cr = 0;
      for (let j = N; j < LEN; j++) {
        if (resp[j]) {
          if (isT[j]) { hit++; if (resp[j] === 1) clean++; } else fa++;
        } else if (j < upto) {
          if (isT[j]) miss++; else cr++;
        }
      }
      return { hit, clean, fa, miss, cr, seen: upto - N };
    }

    /* Pr ni butun sonlarda hisoblaydi: (h·NT − f·T)·k / (T·NT). */
    const pr = (h, f, k) => Math.round((h * NONTARGETS - f * TARGETS) * k / (TARGETS * NONTARGETS));

    function prompt() {
      if (phase === 'intro') return tx(
        'Kvadrat har gal 8 ta joydan birida chiqadi. Joyi ' + N + ' qadam oldingisi bilan bir xil bo\'lsa, «Mos» tugmasini bosing.',
        'Квадрат каждый раз появляется в одном из 8 мест. Если место то же, что ' + N + ' ' + stepsRu(N) + ' назад, нажмите «Совпадает».');
      if (phase === 'show') return tx('Hozircha faqat eslab qoling', 'Пока просто запоминайте');
      if (phase === 'input') {
        if (resp[idx]) return isT[idx]
          ? tx('To\'g\'ri — mos', 'Верно — совпадает')
          : tx('Xato — mos emas edi', 'Ошибка — не совпадало');
        return tx(
          'Joy ' + N + ' qadam oldingisi bilan bir xilmi?',
          'Место то же, что ' + N + ' ' + stepsRu(N) + ' назад?');
      }
      return tx('O\'yin tugadi', 'Игра окончена');
    }

    return {
      get done() { return phase === 'done'; },
      tick,
      /* Panjara yo'q (grid: null) — katak bosish bu o'yinda ma'nosiz. */
      tap() {},
      press,
      log: () => log.map(e => ({ t: e.t, k: e.k, v: e.v })),
      view() {
        const s = tally();
        let display, hud;
        if (phase === 'intro') {
          display = { kind: 'text',
            uz: LEN + ' ta ko\'rinish, har ' + secText(SOA) + ' soniyada bittadan. Taxminan har uchtadan biri mos keladi. Birinchi ' + N + ' tasini faqat eslab qoling.',
            ru: LEN + ' показов, по одному каждые ' + secText(SOA) + ' с. Примерно каждый третий совпадает. Первые ' + N + ' просто запомните.' };
          hud = [{ label: L_N, value: String(N) }, { label: L_TOTAL, value: String(LEN) }];
        } else if (phase === 'done') {
          display = { kind: 'text',
            uz: 'Aniqlik: ' + Math.max(0, pr(s.hit, s.fa, 100)) + '% · topildi ' + s.hit + '/' + TARGETS + ' · noto\'g\'ri bosish: ' + s.fa,
            ru: 'Точность: ' + Math.max(0, pr(s.hit, s.fa, 100)) + '% · найдено ' + s.hit + '/' + TARGETS + ' · лишних нажатий: ' + s.fa };
          hud = [{ label: L_N, value: String(N) }, { label: L_HITS, value: String(s.hit) }, { label: L_ERR, value: String(s.fa + s.miss) }];
        } else {
          display = { kind: 'svg', svg: BOARDS[lit ? seq[idx] : 8] };
          hud = [{ label: L_N, value: String(N) }, { label: L_HITS, value: String(s.hit) }, { label: L_ERR, value: String(s.fa + s.miss) }];
        }
        return {
          phase,
          prompt: prompt(),
          hud,
          display,
          grid: null,
          buttons: phase === 'intro' ? [START_BTN] : phase === 'done' ? [] : [MATCH_BTN],
          progress: phase === 'done' ? 1 : phase === 'intro' ? 0 : Math.max(0, idx + 1) / LEN,
        };
      },
      result() {
        const s = tally();
        const done = phase === 'done';
        const errors = (TARGETS - s.hit) + s.fa;
        const end = tEnd !== null ? tEnd : tLast;
        return {
          score: Math.max(0, pr(s.hit, s.fa, 100)),
          points: Math.max(0, pr(s.clean, s.fa, PMAX)),
          correct: s.hit + s.cr,
          total: done ? SCORED : Math.max(0, s.seen),
          durationMs: t0 === null || end === null ? 0 : end - t0,
          nextLevel: !done ? L : Math.max(1, Math.min(10, errors < 3 ? L + 1 : errors > 5 ? L - 1 : L)),
        };
      },
    };
  }

  IQ.games.register({
    id: 'nback',
    skill: 'memory',
    title: tx('N-back', 'N-back'),
    desc: tx(
      'Kvadrat joyini N qadam oldingisi bilan solishtiring. Ishchi xotira mashqi.',
      'Сравнивайте положение квадрата с тем, что было N шагов назад. Упражнение на рабочую память.'),
    create,
  });
})(typeof window !== 'undefined' ? window : globalThis);
