/* VAQTINCHALIK QOLIP — score agenti bu faylni to'liq almashtiradi.
   Shartnoma: src/iq/CONTRACT.md §3. Ilova shu API ustida quriladi. */
(function (root) {
  const IQ = root.IQ = root.IQ || {};

  function create(opts) {
    opts = opts || {};
    const mode = opts.mode === 'test' ? 'test' : 'practice';
    const types = (opts.types && opts.types.length) ? opts.types : IQ.types();
    const length = opts.length || (mode === 'test' ? 30 : 10);
    const seed = (opts.seed >>> 0) || (Date.now() >>> 0);
    const rng = IQ.rng(seed);
    const log = [];
    let theta = 0, level = opts.startLevel || 5, cur = null, t0 = Date.now();

    const nextItem = () => {
      if (log.length >= length) { cur = null; return; }
      const type = types[log.length % types.length];
      for (let k = 0; k < 5; k++) {
        try { cur = IQ.makeItem(type, rng.int(4294967295), level); return; }
        catch (e) { if (k === 4) throw e; }
      }
    };
    nextItem();

    return {
      mode, length, seed,
      get index() { return log.length; },
      get done() { return cur === null; },
      current: () => cur,
      answer(i, ms) {
        if (!cur) throw new Error('[IQ] sessiya tugagan');
        const it = cur, ok = i === it.correct;
        log.push({ id: it.id, type: it.type, level: it.level, b: it.b, correct: ok, ms: ms | 0 });
        theta = IQ.score.estimate(log).theta;
        level = IQ.score.nextLevel(theta, rng);
        nextItem();
        return { correct: ok, correctIndex: it.correct, item: it };
      },
      result() {
        const est = IQ.score.estimate(log);
        const iv = IQ.score.interval(est.theta, est.se);
        const byType = {};
        log.forEach(r => {
          const b = byType[r.type] || (byType[r.type] = { n: 0, correct: 0 });
          b.n++; if (r.correct) b.correct++;
        });
        return {
          mode, n: log.length, correct: log.filter(r => r.correct).length,
          durationMs: Date.now() - t0,
          theta: est.theta, se: est.se, iq: IQ.score.toIQ(est.theta), lo: iv.lo, hi: iv.hi,
          reliable: log.length >= 20,
          byType, items: log.slice(),
        };
      },
      snapshot: () => ({ v: 1, opts: { mode, types, length, seed }, log: log.slice() }),
    };
  }

  IQ.session = { create, restore: snap => create(snap && snap.opts) };
})(typeof window !== 'undefined' ? window : globalThis);
