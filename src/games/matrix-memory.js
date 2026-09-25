/* ─────────────────────────────────────────────────────────────────────────
   O'yin: "Xotira matritsasi" (matrix-memory) — ko'rish-fazoviy xotira

   QOIDA: panjarada K ta katak bir lahza yonadi (phase 'show'), keyin
   o'chadi. O'yinchi aynan o'sha kataklarni bosadi (phase 'input').
   Birinchi noto'g'ri bosish yoki vaqt tugashi — raund yutqazildi.
   Raund yutildi → qiyinlik zinapoyasida bir pog'ona yuqoriga (K oshadi,
   kerak bo'lsa panjara 3×3 → 6×6 kattalashadi); yutqazildi → bir pog'ona
   pastga. 10 raund yoki 3 ta xato — o'yin tugaydi.

   NIMA UCHUN ZINAPOYA (staircase): boshlang'ich daraja taxmin xolos.
   Har raundda bir pog'ona yuqori/past yurish o'yinchini tez orada o'z
   chegarasiga olib keladi — kuchli odam zerikmaydi, kuchsizi 3 raundda
   yiqilib ketmaydi. Keyingi daraja (nextLevel) ham shu chegaradan olinadi.

   DARAJA (1..10) → boshlang'ich pog'ona = daraja − 1 va ko'rsatish vaqti:
     daraja  pog'ona  panjara  K   ko'rsatish (ms)
       1       0       3×3     3   1300
       2       1       3×3     4   1350
       3       2       4×4     4   1300
       4       3       4×4     5   1350
       5       4       4×4     6   1400
       6       5       5×5     6   1350
       7       6       5×5     7   1400
       8       7       5×5     8   1450
       9       8       6×6     8   1400
      10       9       6×6     9   1450
   Ko'rsatish vaqti = 1000 + 100·K − 50·(daraja − 1), kamida 800 ms:
   katak ko'p bo'lsa ko'proq vaqt (ma'lumot ko'p), daraja yuqori
   bo'lsa qisqaroq (qiyinroq).

   BALL (points, liga uchun): har YUTILGAN raund uchun K + 5.
     · K — eslangan kataklar soni: qiyinroq raund ko'proq beradi,
       shuning uchun o'z darajasida o'ynash past darajada "ball
       yig'ish"dan foydaliroq;
     · +5 — raundni to'liq yutgani uchun (qisman topish ball bermaydi:
       tasodifiy bosuvchi ham bir-ikki katakni topib oladi).
     O'z darajasida oddiy o'yin ≈ 40–70; mukammal o'yin 1-darajada 110,
     10-darajada 175; mutlaq chegara 10·(14 + 5) = 190.
     Raundda birorta to'g'ri bosish oldingi bosishdan < 120 ms keyin
     bo'lsa — raund "shubhali" va ball bermaydi (avtokliker; odam
     barmog'i bunday tez ketma-ket bosa olmaydi). O'yin jarayoni
     o'zgarmaydi — faqat ball olinmaydi.

   score — eng ko'p to'g'ri eslangan kataklar soni (K). correct/total —
   yutilgan/o'ynalgan raundlar.

   VAQT: faqat `now` argumentidan (CONTRACT.md §9). Fazalar ular
   o'zgargan paytdagi `now` dan sanaladi: ilova fonda qolib tick kech
   kelsa, o'yinchi yongan kataklarni baribir to'liq vaqt ko'radi.
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const IQ = root.IQ;

  /* Qiyinlik zinapoyasi: [ustunlar, yonadigan kataklar soni K].
     K har doim panjaraning yarmidan kam — aks holda "qaysilar yonmagan"
     ni eslash osonroq bo'lib qoladi va qiyinlik K bilan o'smaydi. */
  const LADDER = [
    [3, 3], [3, 4], [4, 4], [4, 5], [4, 6], [5, 6], [5, 7], [5, 8],
    [6, 8], [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  ];
  const ROUNDS = 10;
  const MAX_ERRORS = 3;
  const PRE_MS = 600;          // yonishdan oldin bo'sh panjara: "yangi raund" belgisi
  const FB_OK_MS = 800;
  const FB_BAD_MS = 1600;      // xatoda uzoqroq: o'yinchi qaysi kataklar yonganini ko'rib olsin
  const MIN_GAP_MS = 120;      // bundan tez ketma-ket bosish — odamniki emas
  const MAX_JUMP = 3;          // nextLevel bir o'yinda ±3 dan ko'p o'zgarmaydi

  const showMs = (level, k) => Math.max(800, 1000 + 100 * k - 50 * (level - 1));
  /* Kiritish uchun vaqt saxiy: maqsad tezlik emas, xotira. Chegara
     faqat o'yin abadiy osilib qolmasligi uchun. */
  const inputMs = k => 4000 + 1000 * k;

  const tx = (uz, ru) => ({ uz, ru });
  const clampLevel = lv => Math.max(1, Math.min(10, Math.round(Number(lv)) || 1));

  const START_BTN = { id: 'start', label: tx('Boshlash', 'Начать'), kind: 'primary' };
  const L_ROUND = tx('Raund', 'Раунд');
  const L_CELLS = tx('Kataklar', 'Клетки');
  const L_ERR = tx('Xato', 'Ошибки');

  function create(seed, level) {
    const L = clampLevel(level);
    const r = IQ.rng(seed >>> 0);
    const log = [];

    let phase = 'intro';
    let lit = false;             // 'show' ichida: false — tayyorlanish, true — kataklar yongan
    let step = L - 1;
    let cols = LADDER[step][0], k = LADDER[step][1];
    let target = [], picked = []; // picked: 0 — bosilmagan, 1 — to'g'ri, 2 — xato
    let found = 0, tainted = false, outcome = '';
    let deadline = 0;
    let rounds = 0, wins = 0, errors = 0, best = 0, bestStep = -1, points = 0;
    let t0 = null, tEnd = null, tLast = null;
    let clock = -Infinity, raw = null, off = 0, lastInput = -Infinity;

    /* O'yin vaqti: `now` ning o'sishi, lekin HECH QACHON orqaga ketmaydi.
       Qurilma soati orqaga surilsa (NTP, qo'lda o'zgartirish), farq
       `off` ga qo'shiladi va o'yin vaqti shu joydan davom etadi — aks
       holda o'yin soat "yetib kelguncha" qotib qolardi, bosishlar
       oralig'i manfiy chiqib avtokliker deb hisoblanardi. Jurnalga
       tayyor (o'yin) vaqti yoziladi, u o'sib boradi, shuning uchun
       replay'da `off` doim 0 va natija bir xil. */
    function at(now) {
      if (Number.isFinite(now)) {
        if (raw !== null && now < raw) off += raw - now;
        raw = now;
        if (now + off > clock) clock = now + off;
      } else if (clock === -Infinity) clock = 0;
      return clock;
    }

    function newRound(t) {
      cols = LADDER[step][0]; k = LADDER[step][1];
      const n = cols * cols;
      const idx = r.shuffle(Array.from({ length: n }, (_, i) => i)).slice(0, k);
      target = new Array(n).fill(false);
      for (const i of idx) target[i] = true;
      picked = new Array(n).fill(0);
      found = 0; tainted = false; outcome = ''; lit = false;
      phase = 'show'; deadline = t + PRE_MS;
    }

    function endRound(win, t) {
      rounds++;
      if (win) {
        wins++;
        if (k > best) best = k;
        if (step > bestStep) bestStep = step;
        if (!tainted) points += k + 5;
        step = Math.min(step + 1, LADDER.length - 1);
      } else {
        errors++;
        step = Math.max(0, step - 1);
      }
      phase = 'feedback';
      deadline = t + (win ? FB_OK_MS : FB_BAD_MS);
    }

    /* Vaqt bo'yicha o'tish. Holatni FAQAT o'zgarish bo'lganda o'zgartiradi
       va shunda true qaytaradi — tick esa aynan shunday chaqiriqlarni
       jurnalga yozadi. Shu sababli jurnalga tushmagan tick hech narsani
       o'zgartirmagan bo'ladi va replay natijasi bir xil chiqadi. */
    function advance(t) {
      if (phase === 'show' && t >= deadline) {
        if (!lit) { lit = true; deadline = t + showMs(L, k); }
        else { phase = 'input'; deadline = t + inputMs(k); }
        return true;
      }
      if (phase === 'input' && t >= deadline) {
        outcome = 'timeout';
        endRound(false, t);
        return true;
      }
      if (phase === 'feedback' && t >= deadline) {
        if (rounds >= ROUNDS || errors >= MAX_ERRORS) { phase = 'done'; tEnd = t; }
        else newRound(t);
        return true;
      }
      return false;
    }

    /* t — o'yin vaqti (at() dan o'tgan). tap/press ham avval shuni
       chaqiradi: bosish qaysi fazaga tushishini vaqt hal qiladi. at() ni
       ikki marta qo'llamaslik uchun tick'dan alohida. */
    function sync(t) {
      const ch = advance(t);
      if (ch) { log.push({ t, k: 'tick', v: 0 }); tLast = t; }
      return ch;
    }

    function tick(now) {
      if (phase === 'done') return false;
      return sync(at(now));
    }

    function tap(i, now) {
      if (phase === 'done') return;
      const t = at(now);
      sync(t);   // avval vaqt: bosish qaysi fazaga tushganini aniqlaydi
      if (phase === 'intro' || phase === 'done') return;   // panjara yo'q
      if (!(Number.isInteger(i) && i >= 0 && i < cols * cols)) return;
      log.push({ t, k: 'tap', v: i }); tLast = t;
      const fast = t - lastInput < MIN_GAP_MS;
      lastInput = t;
      /* 'show' va 'feedback' da bosish hisoblanmaydi: yongan katakni
         ko'rib turib bosish xotira emas. */
      if (phase !== 'input' || picked[i]) return;
      if (target[i]) {
        picked[i] = 1; found++;
        if (fast) tainted = true;
        if (found === k) { outcome = 'ok'; endRound(true, t); }
      } else {
        picked[i] = 2; outcome = 'bad';
        endRound(false, t);
      }
    }

    function press(id, now) {
      if (phase === 'done') return;
      const t = at(now);
      sync(t);
      if (phase !== 'intro' || id !== 'start') return;
      log.push({ t, k: 'press', v: id }); tLast = t;
      lastInput = t;
      t0 = t;
      newRound(t);
    }

    /* Keyingi daraja: eng yuqori YUTILGAN pog'onadan bir pastdan boshlash
       (daraja d → boshlang'ich pog'ona d − 1, ya'ni daraja = bestStep).
       Birinchi raundlar ishonchli yutiladi, keyin zinapoya yana
       chegaraga olib chiqadi. Hech narsa yutilmasa — bir daraja past. */
    function nextLevel() {
      if (!rounds) return L;
      const want = wins ? Math.max(1, bestStep) : L - 1;
      const lo = Math.max(1, L - MAX_JUMP), hi = Math.min(10, L + MAX_JUMP);
      return Math.max(lo, Math.min(hi, want));
    }

    function cellState(i) {
      if (phase === 'show') return lit && target[i] ? 'lit' : 'idle';
      if (phase === 'input') return picked[i] === 1 ? 'ok' : 'idle';
      // feedback: tanlangan — ✓/✕, topilmagan nishon — qayta yonadi
      if (picked[i] === 1) return 'ok';
      if (picked[i] === 2) return 'bad';
      return target[i] ? 'lit' : 'idle';
    }

    function prompt() {
      switch (phase) {
        case 'intro': return tx(
          'Bir necha katak bir lahza yonadi. Ular o\'chgach, aynan o\'sha kataklarni bosing.',
          'Несколько клеток ненадолго подсветятся. Когда они погаснут, нажмите именно на них.');
        case 'show': return lit
          ? tx('Yongan kataklarni eslab qoling', 'Запомните подсвеченные клетки')
          : tx('Diqqat…', 'Внимание…');
        case 'input': return tx(
          'Yongan kataklarni bosing: ' + found + '/' + k,
          'Нажмите клетки, которые светились: ' + found + '/' + k);
        case 'feedback':
          if (outcome === 'ok') return tx('To\'g\'ri!', 'Верно!');
          if (outcome === 'timeout') return tx(
            'Vaqt tugadi. Yongan kataklar ko\'rsatildi',
            'Время вышло. Показаны клетки, которые светились');
          return tx('Xato. Yongan kataklar ko\'rsatildi', 'Ошибка. Показаны клетки, которые светились');
        default: return tx('O\'yin tugadi', 'Игра окончена');
      }
    }

    return {
      get done() { return phase === 'done'; },
      tick,
      tap,
      press,
      log: () => log.map(e => ({ t: e.t, k: e.k, v: e.v })),
      view() {
        const shownRound = phase === 'show' || phase === 'input' ? rounds + 1 : rounds;
        let display = null;
        if (phase === 'intro') display = { kind: 'text',
          uz: ROUNDS + ' raund. Har to\'g\'ri raunddan keyin kataklar ko\'payadi, xatodan keyin kamayadi. ' + MAX_ERRORS + ' ta xatoda o\'yin tugaydi.',
          ru: ROUNDS + ' раундов. После верного раунда клеток больше, после ошибки — меньше. После ' + MAX_ERRORS + ' ошибок игра заканчивается.' };
        else if (phase === 'done') display = { kind: 'text',
          uz: 'Eng ko\'p eslangan kataklar: ' + best + ' · yutilgan raundlar: ' + wins + '/' + rounds,
          ru: 'Максимум запомненных клеток: ' + best + ' · верных раундов: ' + wins + '/' + rounds };
        const hasGrid = phase === 'show' || phase === 'input' || phase === 'feedback';
        return {
          phase,
          prompt: prompt(),
          hud: [
            { label: L_ROUND, value: shownRound + '/' + ROUNDS },
            { label: L_CELLS, value: String(k) },
            { label: L_ERR, value: errors + '/' + MAX_ERRORS },
          ],
          display,
          grid: hasGrid
            ? { cols, cells: target.map((_, i) => ({ label: '', state: cellState(i) })) }
            : null,
          buttons: phase === 'intro' ? [START_BTN] : [],
          progress: phase === 'done' ? 1 : rounds / ROUNDS,
        };
      },
      result() {
        const end = tEnd !== null ? tEnd : tLast;
        return {
          score: best,
          points,
          correct: wins,
          total: rounds,
          durationMs: t0 === null || end === null ? 0 : end - t0,
          nextLevel: nextLevel(),
        };
      },
    };
  }

  IQ.games.register({
    id: 'matrix-memory',
    skill: 'memory',
    title: tx('Xotira matritsasi', 'Матрица памяти'),
    desc: tx(
      'Bir lahza yongan kataklarni eslab qoling va qayta toping. Ko\'rish xotirasi mashqi.',
      'Запомните клетки, которые ненадолго подсветились, и найдите их снова. Упражнение на зрительную память.'),
    create,
  });
})(typeof window !== 'undefined' ? window : globalThis);
