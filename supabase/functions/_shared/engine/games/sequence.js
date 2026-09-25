/* ─────────────────────────────────────────────────────────────────────────
   O'yin: "Ketma-ketlik" (sequence) — Simon / Corsi turidagi xotira o'yini

   QOIDA: kataklar birma-bir yonadi (phase 'show'), keyin o'yinchi ularni
   AYNAN SHU TARTIBDA bosadi (phase 'input'). To'g'ri takrorlasa —
   ketma-ketlikka yana bitta katak qo'shiladi (oldingilari o'zgarmaydi,
   Simon kabi). Xato yoki 5 soniya jimlik — bitta imkoniyat ketadi va
   xuddi shu uzunlikda YANGI ketma-ketlik beriladi (eskisini ikkinchi
   marta ko'rib yodlab olish xotirani emas, takrorni o'lchaydi).
   2 ta imkoniyat tugasa yoki 8 raund o'ynalsa — o'yin tugaydi (8 raund:
   mukammal o'yin ham ≈ 1.5 daqiqada tugaydi; chegaradan o'tganlarni
   nextLevel keyingi safar yuqoriroq darajaga olib chiqadi).

   Asosiy ko'rsatkich (score) — to'g'ri takrorlangan ENG UZUN ketma-ketlik
   (psixologiyada "span"). correct/total — yutilgan/o'ynalgan raundlar.

   DARAJA (1..10):
     daraja  boshlang'ich uzunlik  yonish + pauza (ms)  panjara
       1           3                700 + 300          3×3
       2           3                675 + 290          3×3
       3           4                650 + 280          3×3
       4           4                625 + 270          3×3
       5           5                600 + 260          3×3
       6           5                575 + 250          3×3
       7           6                550 + 240          4×4
       8           6                525 + 230          4×4
       9           7                500 + 220          4×4
      10           7                475 + 210          4×4
   Juft darajalar toq qo'shnisidan faqat tezroq — shuning uchun daraja
   bir pog'ona oshganda sakrash sezilmaydi. 4×4 da o'rinlar ko'p, har
   bir katakning joyini eslash qiyinroq.

   BALL (points, liga uchun): har YUTILGAN raund uchun n + 10
   (n — o'sha raunddagi ketma-ketlik uzunligi). Uzunroq ketma-ketlik
   ko'proq beradi, shuning uchun o'z darajasida o'ynash foydaliroq.
   +10 katta, chunki o'z chegarasida o'ynayotgan odam odatda 2–3 raund
   yutadi va o'yin qisqa (≈ 40 s): n + 5 bilan u ≈ 20 ball olardi —
   boshqa xotira o'yinlaridan ancha kam, liga uchun adolatsiz.
   Oddiy o'yin ≈ 30–60, 1-darajada mukammal o'yin 3..10 → 132,
   10-darajada 7..14 → 164. Qisman takrorlash ball bermaydi (tasodifiy
   bosuvchi ham birinchi katakni topib qo'yadi). Raundda birorta to'g'ri
   bosish oldingi bosishdan < 120 ms keyin bo'lsa — raund ball bermaydi
   (avtokliker).
   Bir katakni < 120 ms ichida qayta bosish "barmoq sakrashi" deb
   e'tiborsiz qoldiriladi: ketma-ketlikda bir katak ketma-ket ikki marta
   kelmaydi, demak bu hech qachon haqiqiy javob emas.

   VAQT: faqat `now` dan. 'show' ichidagi yonishlar ko'rsatish boshlangan
   paytdan qat'iy jadval bo'yicha (ritm tick kechikishiga bog'liq emas).
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const IQ = root.IQ;

  const ROUNDS = 8;
  const LIVES = 2;
  const PRE_MS = 700;          // ko'rsatishdan oldin bo'sh panjara — "diqqat"
  const IDLE_MS = 5000;        // shuncha jimlik — xato (o'yin osilib qolmasin)
  const FLASH_MS = 250;        // bosilgan katak qisqa ✓ bilan tasdiqlanadi
  const FB_OK_MS = 700;
  const FB_BAD_MS = 1400;      // xatoda to'g'ri katakni ko'rib olish uchun
  const MIN_GAP_MS = 120;
  const MAX_JUMP = 3;

  const startLen = L => 2 + Math.ceil(L / 2);
  const onMs = L => 700 - 25 * (L - 1);
  const gapMs = L => 300 - 10 * (L - 1);
  const colsFor = L => (L >= 7 ? 4 : 3);

  const tx = (uz, ru) => ({ uz, ru });
  const clampLevel = lv => Math.max(1, Math.min(10, Math.round(Number(lv)) || 1));

  const START_BTN = { id: 'start', label: tx('Boshlash', 'Начать'), kind: 'primary' };
  const L_LEN = tx('Uzunlik', 'Длина');
  const L_ROUND = tx('Raund', 'Раунд');
  const L_LIVES = tx('Imkoniyat', 'Попытки');

  function create(seed, level) {
    const L = clampLevel(level);
    const r = IQ.rng(seed >>> 0);
    const cols = colsFor(L), n = cols * cols;
    const on = onMs(L), per = on + gapMs(L);
    const log = [];

    let phase = 'intro';
    let seq = [];
    let pos = 0;                 // 'input': nechta katak to'g'ri bosildi
    let litIdx = -1;             // 'show': hozir yongan element (−1 — hech biri)
    let shown = -1;              // 'show': shu paytgacha yongan eng katta indeks
    let showT = 0, deadline = 0;
    let flash = -1, flashUntil = 0;
    let bad = -1, expect = -1, outcome = '', lastWin = false, tainted = false;
    let lives = LIVES, rounds = 0, wins = 0, best = 0, points = 0;
    let t0 = null, tEnd = null, tLast = null;
    let clock = -Infinity, lastInput = -Infinity, lastCell = -1;

    function at(now) {
      if (Number.isFinite(now)) { if (now > clock) clock = now; }
      else if (clock === -Infinity) clock = 0;
      return clock;
    }

    /* Yangi katak: oldingisidan farqli. Bir katak ketma-ket ikki marta
       yonsa, ekranda ikkinchisi ko'rinmay qolishi mumkin (pauza qisqa). */
    function nextCell(prev) {
      if (prev === undefined) return r.int(n);
      const c = r.int(n - 1);
      return c >= prev ? c + 1 : c;
    }
    function fresh(len) {
      const a = [];
      while (a.length < len) a.push(nextCell(a[a.length - 1]));
      return a;
    }

    function startShow(t) {
      pos = 0; litIdx = -1; shown = -1; flash = -1; bad = -1; expect = -1;
      outcome = ''; tainted = false;
      phase = 'show'; showT = t;
    }

    function endRound(win, t) {
      rounds++;
      if (win) {
        wins++;
        if (seq.length > best) best = seq.length;
        if (!tainted) points += seq.length + 10;
      } else {
        lives--;
        flash = -1;
      }
      lastWin = win;
      phase = 'feedback';
      deadline = t + (win ? FB_OK_MS : FB_BAD_MS);
    }

    /* Holat faqat o'zgarganda o'zgaradi va true qaytadi (tick jurnali
       shunga tayanadi — matrix-memory.js dagi izohga qarang). */
    function advance(t) {
      if (phase === 'show') {
        const rel = t - showT - PRE_MS;
        if (rel >= seq.length * per) {
          phase = 'input'; litIdx = -1; deadline = t + IDLE_MS;
          return true;
        }
        const j = Math.floor(rel / per);
        const want = rel >= 0 && rel - j * per < on ? j : -1;
        if (want === litIdx) return false;
        litIdx = want;
        if (want > shown) shown = want;
        return true;
      }
      if (phase === 'input') {
        if (t >= deadline) {
          expect = seq[pos]; bad = -1; outcome = 'timeout';
          endRound(false, t);
          return true;
        }
        if (flash >= 0 && t >= flashUntil) { flash = -1; return true; }
        return false;
      }
      if (phase === 'feedback' && t >= deadline) {
        if (lives <= 0 || rounds >= ROUNDS) { phase = 'done'; tEnd = t; }
        else {
          if (lastWin) seq.push(nextCell(seq[seq.length - 1]));
          else seq = fresh(seq.length);
          startShow(t);
        }
        return true;
      }
      return false;
    }

    function tick(now) {
      if (phase === 'done') return false;
      const t = at(now);
      const ch = advance(t);
      if (ch) { log.push({ t, k: 'tick', v: 0 }); tLast = t; }
      return ch;
    }

    function tap(i, now) {
      if (phase === 'done') return;
      const t = at(now);
      tick(t);
      if (phase === 'intro' || phase === 'done') return;
      if (!(Number.isInteger(i) && i >= 0 && i < n)) return;
      log.push({ t, k: 'tap', v: i }); tLast = t;
      const gap = t - lastInput;
      const fast = gap < MIN_GAP_MS;
      const bounce = fast && i === lastCell;
      lastInput = t; lastCell = i;
      // 'show'/'feedback' da bosish hisoblanmaydi; barmoq sakrashi — ham.
      if (phase !== 'input' || bounce) return;
      if (i === seq[pos]) {
        pos++;
        if (fast) tainted = true;
        flash = i; flashUntil = t + FLASH_MS;
        deadline = t + IDLE_MS;
        if (pos === seq.length) { outcome = 'ok'; endRound(true, t); }
      } else {
        bad = i; expect = seq[pos]; outcome = 'bad';
        endRound(false, t);
      }
    }

    function press(id, now) {
      if (phase === 'done') return;
      const t = at(now);
      tick(t);
      if (phase !== 'intro' || id !== 'start') return;
      log.push({ t, k: 'press', v: id }); tLast = t;
      lastInput = t; lastCell = -1;
      t0 = t;
      seq = fresh(startLen(L));
      startShow(t);
    }

    /* Keyingi daraja: boshlang'ich uzunlik = eng uzun yutilgan − 1
       bo'ladigan daraja (juftidan, ya'ni tezrog'idan). startLen(2b − 6)
       = b − 1. Birinchi raund ishonchli yutiladi, keyingisi chegarada.
       Hech narsa yutilmasa — bir daraja past. */
    function nextLevel() {
      if (!rounds) return L;
      const want = wins ? 2 * best - 6 : L - 1;
      const lo = Math.max(1, L - MAX_JUMP), hi = Math.min(10, L + MAX_JUMP);
      return Math.max(lo, Math.min(hi, want));
    }

    function cellState(i) {
      if (phase === 'show') return litIdx >= 0 && seq[litIdx] === i ? 'lit' : 'idle';
      if (phase === 'input') return i === flash ? 'ok' : 'idle';
      // feedback
      if (outcome === 'ok') return i === flash ? 'ok' : 'idle';
      if (i === bad) return 'bad';
      return i === expect ? 'lit' : 'idle';
    }

    function prompt() {
      switch (phase) {
        case 'intro': return tx(
          'Kataklar birin-ketin yonadi. Ular tugagach, xuddi shu tartibda bosing.',
          'Клетки загораются по очереди. Затем нажмите их в том же порядке.');
        case 'show': return shown < 0
          ? tx('Diqqat…', 'Внимание…')
          : tx('Tartibni eslab qoling', 'Запомните порядок');
        case 'input': return tx(
          'Xuddi shu tartibda bosing: ' + pos + '/' + seq.length,
          'Нажмите в том же порядке: ' + pos + '/' + seq.length);
        case 'feedback':
          if (outcome === 'ok') return rounds >= ROUNDS
            ? tx('To\'g\'ri!', 'Верно!')
            : tx('To\'g\'ri! Endi bittaga uzunroq', 'Верно! Теперь на одну длиннее');
          if (outcome === 'timeout') return tx(
            'Vaqt tugadi. Keyingi to\'g\'ri katak belgilandi',
            'Время вышло. Отмечена следующая верная клетка');
          return tx('Xato. To\'g\'ri katak belgilandi', 'Ошибка. Отмечена верная клетка');
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
        const len = seq.length || startLen(L);
        let display = null;
        if (phase === 'intro') display = { kind: 'text',
          uz: 'Har to\'g\'ri takrorlashdan keyin ketma-ketlik bittaga uzayadi. ' + LIVES + ' ta xatoda yoki ' + ROUNDS + ' raunddan keyin o\'yin tugaydi.',
          ru: 'После каждого верного повтора последовательность удлиняется на одну клетку. Игра заканчивается после ' + LIVES + ' ошибок или ' + ROUNDS + ' раундов.' };
        else if (phase === 'done') display = { kind: 'text',
          uz: 'Eng uzun to\'g\'ri ketma-ketlik: ' + best + ' · yutilgan raundlar: ' + wins + '/' + rounds,
          ru: 'Самая длинная верная последовательность: ' + best + ' · верных раундов: ' + wins + '/' + rounds };
        const hasGrid = phase === 'show' || phase === 'input' || phase === 'feedback';
        const cells = [];
        if (hasGrid) for (let i = 0; i < n; i++) cells.push({ label: '', state: cellState(i) });
        return {
          phase,
          prompt: prompt(),
          hud: [
            { label: L_LEN, value: String(len) },
            { label: L_ROUND, value: shownRound + '/' + ROUNDS },
            { label: L_LIVES, value: String(lives) },
          ],
          display,
          grid: hasGrid ? { cols, cells } : null,
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
    id: 'sequence',
    skill: 'memory',
    title: tx('Ketma-ketlik', 'Последовательность'),
    desc: tx(
      'Kataklar qaysi tartibda yonganini eslab qoling va takrorlang. Har safar ketma-ketlik uzayadi.',
      'Запомните, в каком порядке загораются клетки, и повторите. С каждым разом последовательность длиннее.'),
    create,
  });
})(typeof window !== 'undefined' ? window : globalThis);
