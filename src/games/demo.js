/* VAQTINCHALIK — UI umumiy o'yin ekranini haqiqiy o'yinlar tayyor
   bo'lguncha sinashi uchun. build'ga faqat IQ_DEMO=1 bilan tushadi.
   Integratsiyada O'CHIRILADI. Qoidasi: yongan katakni bosing, 5 marta. */
(function (root) {
  const IQ = root.IQ;
  IQ.games.register({
    id: 'demo', skill: 'attention',
    title: { uz: 'Namuna o\'yin', ru: 'Пример игры' },
    desc: { uz: 'Yongan katakni bosing', ru: 'Нажмите на подсвеченную клетку' },
    create(seed, level) {
      const r = IQ.rng(seed), N = 9, ROUNDS = 5, log = [];
      let round = 0, hits = 0, lit = r.int(N), t0 = null, tEnd = 0, done = false;
      const g = {
        get done() { return done; },
        tick(now) { if (t0 === null) t0 = now; return false; },
        tap(i, now) {
          if (done) return;
          if (t0 === null) t0 = now;
          log.push({ t: now, k: 'tap', v: i });
          if (i === lit) hits++;
          round++;
          if (round >= ROUNDS) { done = true; tEnd = now; } else lit = r.int(N);
        },
        press() {},
        log: () => log.slice(),
        view() {
          return {
            phase: done ? 'done' : 'input',
            prompt: { uz: 'Yongan katakni bosing', ru: 'Нажмите на подсвеченную клетку' },
            hud: [{ label: { uz: 'To\'g\'ri', ru: 'Верно' }, value: String(hits) }],
            display: null,
            grid: { cols: 3, cells: Array.from({ length: N }, (_, i) => ({ label: '', state: !done && i === lit ? 'lit' : 'idle' })) },
            buttons: [],
            progress: round / ROUNDS,
          };
        },
        result: () => ({ score: hits, points: hits * 10, correct: hits, total: ROUNDS,
          durationMs: t0 === null ? 0 : tEnd - t0, nextLevel: level }),
      };
      return g;
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
