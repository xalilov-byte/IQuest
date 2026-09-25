/* VAQTINCHALIK — faqat haqiqiy generatorlar tayyor bo'lguncha ilovani
   ishlatib turish uchun. Integratsiyada O'CHIRILADI. Turi "demo",
   IQ.types() uni qaytarmaydi. Uch tilli namuna ham: langs da 'en'
   eʼlon qilingani uchun validateItem hamma matnda en ni talab qiladi
   (CONTRACT §2). */
(function (root) {
  const IQ = root.IQ;
  const circles = n => {
    let s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff"/>';
    for (let i = 0; i < n; i++) s += '<circle cx="' + (18 + (i % 4) * 21) + '" cy="' + (30 + Math.floor(i / 4) * 30) + '" r="8" fill="#1c1b29"/>';
    return s + '</svg>';
  };
  IQ.register({
    type: 'demo', label: { uz: 'Namuna', ru: 'Пример', en: 'Sample' },
    langs: ['uz', 'ru', 'en'],
    generate(seed, level) {
      const r = IQ.rng(seed), n = r.range(2, 8);
      const opts = r.shuffle([n, n + 1, n - 1, n + 2].map(k => ({ k, o: { kind: 'svg', svg: circles(k) } })));
      return {
        id: 'demo:' + level + ':' + seed, type: 'demo', level, b: IQ.levelToB(level),
        prompt: { uz: 'Qaysi rasmda ' + n + ' ta doira bor?', ru: 'На каком рисунке ' + n + ' кругов?',
                  en: 'Which picture has ' + n + ' circles?' },
        stimulus: { kind: 'text', uz: n + ' ta doira', ru: n + ' кругов', en: n + ' circles' },
        options: opts.map(x => x.o), correct: opts.findIndex(x => x.k === n),
        explain: { uz: 'Doiralarni sanang.', ru: 'Посчитайте круги.', en: 'Count the circles.' },
      };
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
