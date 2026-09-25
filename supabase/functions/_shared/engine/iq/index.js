/* ─────────────────────────────────────────────────────────────────────────
   IQ — savol generatorlari reyestri va savol shaklining tekshirgichi

   Har bir savol turi (matritsa, son qatori, fazoviy, og'zaki) o'z
   faylida yashaydi: src/iq/gen/<tur>.js. U o'zini shu yerda ro'yxatdan
   o'tkazadi:

       IQ.register({ type: 'matrix', label: {uz, ru}, generate(seed, level) })

   Ilova va testlar generatorga TO'G'RIDAN-TO'G'RI murojaat qilmaydi —
   faqat IQ.makeItem() orqali. Sabab: har bir savol shu yerdan o'tadi va
   validateItem() uni tekshiradi. Buzuq savol (ikki to'g'ri javob, bir xil
   variantlar, noto'g'ri indeks) foydalanuvchiga YETIB BORMAYDI — IQ
   testida noto'g'ri savol natijani jimgina buzadi va buni hech kim
   sezmaydi.

   To'liq shartnoma: src/iq/CONTRACT.md
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const IQ = root.IQ = root.IQ || {};
  const gens = Object.create(null);

  const LEVEL_MIN = 1, LEVEL_MAX = 10;
  const OPTIONS_MIN = 4, OPTIONS_MAX = 6;

  /* A priori qiyinlik (Rasch shkalasida, logit). Daraja 1..10 → b −2.25..+2.25.
     Bu BOSHLANG'ICH taxmin: haqiqiy qiyinlik foydalanuvchilar javobidan
     keyinroq kalibrlanadi. Generator o'z savoli uchun b ni ±0.75 gacha
     o'zgartirishi mumkin (masalan, bir darajadagi ba'zi qoidalar
     boshqasidan qiyinroq bo'lsa), lekin buni izohlashi kerak. */
  const levelToB = level => (level - 5.5) * 0.5;

  function register(g) {
    if (!g || typeof g.type !== 'string' || typeof g.generate !== 'function') {
      throw new Error('[IQ] generator noto\'g\'ri: type va generate() shart');
    }
    gens[g.type] = g;
  }

  const isText = v => v && typeof v.uz === 'string' && v.uz.trim() !== ''
                        && typeof v.ru === 'string' && v.ru.trim() !== '';

  function checkVisual(v, where, errs) {
    if (!v || (v.kind !== 'svg' && v.kind !== 'text')) {
      errs.push(where + ': kind "svg" yoki "text" bo\'lishi kerak');
      return;
    }
    if (v.kind === 'svg') {
      if (typeof v.svg !== 'string' || v.svg.indexOf('<svg') !== 0) {
        errs.push(where + ': svg "<svg" bilan boshlanishi kerak');
      } else {
        /* SVG <img src="data:..."> ichida ko'rsatiladi — u yerda skript
           baribir ishlamaydi. Lekin generator hech qachon skript, tashqi
           havola yoki foreignObject qo'ymasligi kerak: bir kun kimdir uni
           innerHTML bilan qo'ysa, teshik ochiladi. */
        /* href faqat ichki bo'lishi mumkin: href="#shakl" (<use> uchun). */
        if (/<script|\son\w+\s*=|<foreignObject|href\s*=\s*["'](?!#)/i.test(v.svg)) {
          errs.push(where + ': svg ichida skript, hodisa atributi yoki tashqi havola bor');
        }
        if (!/viewBox=/.test(v.svg)) errs.push(where + ': svg da viewBox yo\'q');
      }
    } else if (!isText(v)) {
      errs.push(where + ': matnda uz va ru ikkalasi ham bo\'lishi kerak');
    }
  }

  /* Savol shaklini tekshiradi. Xatolar ro'yxatini qaytaradi (bo'sh — to'g'ri). */
  function validateItem(it) {
    const errs = [];
    if (!it || typeof it !== 'object') return ['savol obyekt emas'];
    if (typeof it.id !== 'string' || !it.id) errs.push('id yo\'q');
    if (!gens[it.type] && it.type !== 'demo') errs.push('noma\'lum tur: ' + it.type);
    if (!(it.level >= LEVEL_MIN && it.level <= LEVEL_MAX && Number.isInteger(it.level))) {
      errs.push('level 1..10 butun son emas: ' + it.level);
    }
    if (typeof it.b !== 'number' || !isFinite(it.b)) errs.push('b son emas');
    else if (Math.abs(it.b - levelToB(it.level)) > 0.75 + 1e-9) {
      errs.push('b darajadan juda uzoq: level ' + it.level + ', b ' + it.b);
    }
    if (!isText(it.prompt)) errs.push('prompt da uz/ru yo\'q');
    if (!isText(it.explain)) errs.push('explain da uz/ru yo\'q');
    checkVisual(it.stimulus, 'stimulus', errs);

    if (!Array.isArray(it.options) || it.options.length < OPTIONS_MIN || it.options.length > OPTIONS_MAX) {
      errs.push('variantlar soni ' + OPTIONS_MIN + '..' + OPTIONS_MAX + ' emas');
    } else {
      it.options.forEach((o, i) => checkVisual(o, 'options[' + i + ']', errs));
      /* Ikki bir xil variant — ikkalasi ham "to'g'ri" bo'lib qolishi yoki
         odam farqni qidirib vaqt yo'qotishi mumkin. */
      const keys = it.options.map(o => o && (o.kind === 'svg' ? o.svg : o.uz + '|' + o.ru));
      if (new Set(keys).size !== keys.length) errs.push('variantlar takrorlangan');
      if (!(Number.isInteger(it.correct) && it.correct >= 0 && it.correct < it.options.length)) {
        errs.push('correct noto\'g\'ri indeks: ' + it.correct);
      }
    }
    if (it.timeLimit !== undefined && !(it.timeLimit > 0)) errs.push('timeLimit musbat emas');
    return errs;
  }

  /* Savol yaratadi va TEKSHIRADI. Buzuq savol qaytarilmaydi — xato
     otiladi, chaqiruvchi boshqa urug' bilan qayta urinadi. */
  function makeItem(type, seed, level) {
    const g = gens[type];
    if (!g) throw new Error('[IQ] generator yo\'q: ' + type);
    const lv = Math.max(LEVEL_MIN, Math.min(LEVEL_MAX, Math.round(level)));
    const it = g.generate(seed >>> 0, lv);
    const errs = validateItem(it);
    if (errs.length) throw new Error('[IQ] ' + type + ' buzuq savol berdi: ' + errs.join('; '));
    return it;
  }

  /* SVG → <img src> uchun data URI. Ilova SVG'ni innerHTML bilan EMAS,
     rasm sifatida ko'rsatadi: <img> ichidagi SVG'da skript umuman
     ishlamaydi, ya'ni generator xatosi ham XSS'ga aylanmaydi. */
  const svgSrc = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

  IQ.register = register;
  IQ.types = () => Object.keys(gens).filter(t => t !== 'demo');
  IQ.generator = type => gens[type] || null;
  IQ.validateItem = validateItem;
  IQ.makeItem = makeItem;
  IQ.levelToB = levelToB;
  IQ.svgSrc = svgSrc;
  IQ.LEVEL_MIN = LEVEL_MIN;
  IQ.LEVEL_MAX = LEVEL_MAX;
})(typeof window !== 'undefined' ? window : globalThis);
