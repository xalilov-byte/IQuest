/* VAQTINCHALIK QOLIP — score agenti bu faylni to'liq almashtiradi.
   Faqat shartnomadagi API'ni beradi (src/iq/CONTRACT.md §4), ilova
   ishlab turishi uchun. Matematikasi ATAYLAB sodda: ulushdan theta. */
(function (root) {
  const IQ = root.IQ = root.IQ || {};
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  IQ.score = {
    estimate(responses) {
      const n = responses.length;
      if (!n) return { theta: 0, se: 1 };
      const p = (responses.filter(r => r.correct).length + 0.5) / (n + 1);
      return { theta: clamp(Math.log(p / (1 - p)), -3, 3), se: 1 / Math.sqrt(n + 1) };
    },
    toIQ: theta => Math.round(clamp(100 + 15 * theta, 55, 145)),
    interval(theta, se, z) {
      const k = (z || 1.645) * se;
      return { lo: IQ.score.toIQ(theta - k), hi: IQ.score.toIQ(theta + k) };
    },
    nextLevel: (theta, rng) => clamp(Math.round(theta / 0.5 + 5.5 + (rng ? rng.int(3) - 1 : 0)), 1, 10),
  };
})(typeof window !== 'undefined' ? window : globalThis);
