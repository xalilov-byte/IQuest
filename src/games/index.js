/* ─────────────────────────────────────────────────────────────────────────
   IQ.games — o'yinlar reyestri va ko'rinish (view) tekshirgichi

   NIMA UCHUN O'YIN O'Z EKRANINI CHIZMAYDI: ilova bitta Design Canvas
   faylida (src/Main.dc.html) va o'z runtime'ida ishlaydi — u faqat
   onClick'ni biladi. Har o'yin uchun alohida ekran yozish o'sha katta
   faylni har safar ochishni talab qilardi. Shuning uchun o'yin faqat
   HOLAT va ko'rinish MA'LUMOTINI beradi (GameView), ilovada esa bitta
   umumiy o'yin ekrani har qanday o'yinni chizadi.

   NIMA UCHUN VAQT TASHQARIDAN BERILADI (now): o'yin ichida Date.now()
   yo'q. Sabablar:
     · test deterministik — "3 soniya o'tdi" deb aniq sinab bo'ladi;
     · server o'yinni jurnal bo'yicha QAYTA O'YNAY oladi (replay) va
       ball haqiqiy ekanini tekshiradi — liga va reyting soxta ball
       bilan to'lmaydi.

   To'liq shartnoma: src/iq/CONTRACT.md §9.
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const IQ = root.IQ = root.IQ || {};
  const games = Object.create(null);

  const PHASES = ['intro', 'show', 'input', 'feedback', 'done'];
  const CELL_STATES = ['idle', 'lit', 'ok', 'bad', 'hidden', 'disabled'];
  const SKILLS = ['attention', 'memory', 'speed', 'logic', 'spatial'];

  const isText = v => v && typeof v.uz === 'string' && v.uz !== '' && typeof v.ru === 'string' && v.ru !== '';

  function register(g) {
    const errs = [];
    if (!g || typeof g.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(g.id)) errs.push('id');
    if (!isText(g && g.title)) errs.push('title');
    if (!isText(g && g.desc)) errs.push('desc');
    if (!g || SKILLS.indexOf(g.skill) === -1) errs.push('skill (' + SKILLS.join('|') + ')');
    if (!g || typeof g.create !== 'function') errs.push('create()');
    if (errs.length) throw new Error('[IQ.games] noto\'g\'ri o\'yin: ' + errs.join(', '));
    games[g.id] = g;
  }

  /* GameView shaklini tekshiradi. Bo'sh ro'yxat — to'g'ri. */
  function validateView(v) {
    const e = [];
    if (!v || typeof v !== 'object') return ['view obyekt emas'];
    if (PHASES.indexOf(v.phase) === -1) e.push('phase: ' + v.phase);
    if (!isText(v.prompt)) e.push('prompt uz/ru');
    if (!Array.isArray(v.hud) || v.hud.length > 3) e.push('hud massiv, ≤ 3');
    else v.hud.forEach((h, i) => {
      if (!isText(h.label) || typeof h.value !== 'string') e.push('hud[' + i + ']');
    });
    if (v.display !== null && v.display !== undefined) {
      const d = v.display;
      if (d.kind === 'svg') {
        if (typeof d.svg !== 'string' || d.svg.indexOf('<svg') !== 0) e.push('display.svg');
        else if (/<script|\son\w+\s*=|<foreignObject|href\s*=\s*["'](?!#)/i.test(d.svg)) e.push('display.svg xavfli');
      } else if (d.kind !== 'text' || !isText(d)) e.push('display');
    }
    if (v.grid !== null && v.grid !== undefined) {
      const g = v.grid;
      if (!(Number.isInteger(g.cols) && g.cols >= 2 && g.cols <= 6)) e.push('grid.cols 2..6');
      if (!Array.isArray(g.cells) || !g.cells.length || g.cells.length > 36) e.push('grid.cells 1..36');
      else g.cells.forEach((c, i) => {
        if (typeof c.label !== 'string') e.push('cells[' + i + '].label');
        if (CELL_STATES.indexOf(c.state) === -1) e.push('cells[' + i + '].state: ' + c.state);
        if (c.svg !== undefined && (typeof c.svg !== 'string' || c.svg.indexOf('<svg') !== 0)) e.push('cells[' + i + '].svg');
      });
    }
    if (!Array.isArray(v.buttons) || v.buttons.length > 4) e.push('buttons massiv, ≤ 4');
    else v.buttons.forEach((b, i) => {
      if (typeof b.id !== 'string' || !isText(b.label) || ['primary', 'secondary'].indexOf(b.kind) === -1) e.push('buttons[' + i + ']');
    });
    if (!(typeof v.progress === 'number' && v.progress >= 0 && v.progress <= 1)) e.push('progress 0..1');
    return e;
  }

  function create(id, seed, level) {
    const g = games[id];
    if (!g) throw new Error('[IQ.games] o\'yin yo\'q: ' + id);
    const lv = Math.max(1, Math.min(10, Math.round(level)));
    return g.create(seed >>> 0, lv);
  }

  /* Serverdagi tekshiruv uchun: o'yinni urug', daraja va hodisalar
     jurnali bo'yicha qayta o'ynaydi va natijani qaytaradi. Mijoz
     yuborgan ball bilan solishtiriladi — mos kelmasa ball qabul
     qilinmaydi. */
  function replay(id, seed, level, log) {
    const game = create(id, seed, level);
    for (const ev of log) {
      game.tick(ev.t);
      if (ev.k === 'tap') game.tap(ev.v, ev.t);
      else if (ev.k === 'press') game.press(ev.v, ev.t);
      else if (ev.k !== 'tick') throw new Error('[IQ.games] noma\'lum hodisa: ' + ev.k);
    }
    return game;
  }

  IQ.games = {
    register,
    list: () => Object.keys(games).filter(k => k !== 'demo').map(k => games[k]),
    get: id => games[id] || null,
    create,
    replay,
    validateView,
    SKILLS,
  };
})(typeof window !== 'undefined' ? window : globalThis);
