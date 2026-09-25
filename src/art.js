/* ─────────────────────────────────────────────────────────────────────────
   ART — TOʻLDIRILGAN ILLYUSTRATSIYALAR (ARXITEKTURA §9.1, §9.4, §6.6, §6.7)

   window.nzArt — liga qalqonlari, yutuq medalyonlari, kolleksiya
   emblemalari, tanga, ◆ ball va IQ belgisi. Hammasi SVG SATR qaytaradi;
   ekranga <img src="{{ x.src }}"> orqali chiqadi (nzArt.src(svg) → data
   URI). Sabab: <img> ichidagi SVG da skript umuman ishlamaydi va sahifa
   CSS iga aralashmaydi. Liga ranglari shuning uchun shu faylda turadi —
   <img> ichidagi SVG CSS oʻzgaruvchisini koʻrmaydi (§9.1).

   API:
     nzArt.LEAGUES               — 6 liga: { id, name, fill, ink, chevrons }
     nzArt.ACHIEVEMENTS          — 21 yutuq: { id, metal, field, glyph }
     nzArt.COLLECTION            — 8 kolleksiya: { id, accent }
     nzArt.shield(tier, opts)    — tier 0..5; opts.mini → ≤24 px uchun soddasi
     nzArt.medal(id, opts)       — yutuq (olti burchak) yoki kolleksiya (doira);
                                   opts.locked → kulrang; opts.lock → qulf
                                   belgisi (yutuqda standart bor, kolleksiyada
                                   yoʻq — u yerda narx chipi turadi);
                                   opts.theme 'light'|'dark' — faqat kulrang
                                   holat va qulf chipiga taʼsir qiladi
     nzArt.coin(), nzArt.ball(opts), nzArt.mark(opts)
     nzArt.src(svg)              — data URI (keshlanadi)
     nzArt.has(id)               — medal id maʼlummi

   QOIDALAR:
     · Daraja faqat rang bilan emas: qalqonda chevronlar soni (0–5) va
       bezak (ichki chiziq → toj-gavhar → toj → qanot → ikki qavat qanot),
       medalyonda halqa ostidagi 1/2/3 nuqta (bronza/kumush/oltin).
     · Har rasmda toʻq «rim» chizigʻi bor — yorugʻ va tungi fonda ham
       siluet ajralib turadi, shuning uchun ochiq rasmlar ikki temada bir xil.
     · Xavfsizlik: <script>, on*=, foreignObject, href, <style>, url(), id
       yoʻq (test tekshiradi). Deterministik: tasodif va sana yoʻq.
     · Ildiz <svg> da role="img" — ichiga joylansa ham Main dagi ikonka
       chiziq rampi (svg:not([role="img"])) unga tegmaydi.
   ───────────────────────────────────────────────────────────────────── */

(function () {
  /* ── Rang yordamchilari ─────────────────────────────────────────── */
  const hex2 = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
  const mix = (a, b, t) => { const x = hex2(a), y = hex2(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
  const lighten = (c, t) => mix(c, '#FFFFFF', t);
  const darken = (c, t) => mix(c, '#000000', t);

  const INK = '#1C1B29';
  const WHITE = '#FFFFFF';

  const svg = (w, body, label) =>
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + w + '" viewBox="0 0 ' + w + ' ' + w +
    '" role="img"' + (label ? ' aria-label="' + label + '"' : '') + '>' + body + '</svg>';

  /* ── Ligalar (§9.1 jadvali; kontrast test bilan isbotlanadi) ─────── */
  const LEAGUES = [
    { id: 'boshlovchi', name: 'Boshlovchi', fill: '#8A8799', ink: WHITE, chevrons: 0 },
    { id: 'bronza', name: 'Bronza', fill: '#C77B3F', ink: WHITE, chevrons: 1 },
    { id: 'kumush', name: 'Kumush', fill: '#A7B1C2', ink: INK, chevrons: 2 },
    { id: 'oltin', name: 'Oltin', fill: '#E0A100', ink: INK, chevrons: 3 },
    { id: 'platina', name: 'Platina', fill: '#3FC1BE', ink: INK, chevrons: 4 },
    { id: 'olmos', name: 'Olmos', fill: '#7C8CFF', ink: INK, chevrons: 5 },
  ];

  /* Qirralar: oq chevronli ligada ikkinchi qirra TOʻQROQ, toʻq chevronlida
     birinchi qirra OCHROQ — shunda chevron kontrasti hech qaysi qirrada
     jadvaldagi qiymatdan tushmaydi. */
  function tones(c, ink) {
    const light = ink === WHITE;
    return {
      a: light ? c : lighten(c, 0.2),
      b: light ? darken(c, 0.12) : c,
      rim: darken(c, 0.38),
      orn: light ? lighten(c, 0.12) : lighten(c, 0.28),
    };
  }
  LEAGUES.forEach(L => { L.tones = tones(L.fill, L.ink); Object.freeze(L.tones); Object.freeze(L); });

  /* ── Qalqon ─────────────────────────────────────────────────────── */
  const BODY = 'M28 13H68Q76 13 76 21V44C76 63 64 77 48 87C32 77 20 63 20 44V21Q20 13 28 13Z';
  const HALF = 'M48 13H68Q76 13 76 21V44C76 63 64 77 48 87Z';
  const INSET = 'M31 20H65Q69 20 69 24V44C69 59 60 70 48 78C36 70 27 59 27 44V24Q27 20 31 20Z';
  const CROWN = 'M33 16V5L40.5 10.5 48 2 55.5 10.5 63 5V16Z';
  const GEM = 'M48 4 55 12 48 20 41 12Z';
  /* Qanot — yumaloq uchli «pat»lar (kapsula): tinch, tartibli siluet,
     tikanli qirra yoʻq. Hammasi bitta ildizdan yelpigʻichdek ochiladi.
     [x1, y1, x2, y2] — tanaga yopishgan uchdan tashqi uchgacha. */
  const FEATHERS = [[25, 30, 8, 15], [24, 32, 4, 27], [25, 34, 6, 40]];

  function chevrons(k, cy, ink, sw, gap, w, h) {
    if (!k) return '';
    const total = (k - 1) * gap + h;
    let d = '';
    for (let i = 0; i < k; i++) {
      const y = cy - total / 2 + i * gap;
      d += 'M' + (48 - w) + ' ' + y + 'l' + w + ' ' + h + ' ' + w + ' ' + (-h);
    }
    return '<path d="' + d + '" fill="none" stroke="' + ink + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round"/>';
  }

  const shape = (d, fill, rim, sw, extra) =>
    '<path d="' + d + '" fill="' + fill + '"' + (rim ? ' stroke="' + rim + '" stroke-width="' + sw + '" stroke-linejoin="round"' : '') + (extra || '') + '/>';

  function shieldSvg(tier, mini) {
    const L = LEAGUES[tier], t = L.tones;
    let s = '';
    const nf = tier >= 5 ? 3 : tier >= 4 ? 2 : 0;
    if (nf) {
      const fw = mini ? 13 : 9, rw = fw + (mini ? 6 : 4);
      let d = '';
      FEATHERS.slice(0, nf).forEach(f => {
        d += 'M' + f[0] + ' ' + f[1] + 'L' + f[2] + ' ' + f[3] + 'M' + (96 - f[0]) + ' ' + f[1] + 'L' + (96 - f[2]) + ' ' + f[3];
      });
      s += '<path d="' + d + '" stroke="' + t.rim + '" stroke-width="' + rw + '" stroke-linecap="round"/>' +
           '<path d="' + d + '" stroke="' + t.orn + '" stroke-width="' + fw + '" stroke-linecap="round"/>';
    }
    if (tier >= 3) s += shape(CROWN, t.orn, t.rim, mini ? 5 : 3);
    if (tier >= 5 && !mini) s += '<circle cx="48" cy="11" r="3.2" fill="' + WHITE + '" stroke="' + t.rim + '" stroke-width="2"/>';
    s += shape(BODY, t.a, t.rim, mini ? 7 : 4);
    s += shape(HALF, t.b);
    if (!mini && tier >= 1) s += '<path d="' + INSET + '" fill="none" stroke="' + WHITE + '" stroke-opacity=".32" stroke-width="2"/>';
    if (tier === 2) s += shape(GEM, t.orn, t.rim, mini ? 5 : 3);
    /* 16 px da 5 ta chevron qoʻshilib ketadi — mini variantda yoʻgʻonroq va
       koʻpi bilan 3 ta; darajaning qolgan qismini qanot va toj bildiradi,
       yonida esa liga nomi doim yoziladi (§3.3). */
    s += mini ? chevrons(Math.min(L.chevrons, 3), 47, L.ink, 11, 17, 16, 9)
              : chevrons(L.chevrons, 48, L.ink, 6, 9.5, 14, 8);
    return svg(96, s, L.name);
  }

  /* ── Yutuq medalyonlari (§6.6) ──────────────────────────────────── */
  const METALS = {
    bronze: '#C77B3F',
    silver: '#A7B1C2',
    gold: '#E0A100',
  };
  const PIPS = { bronze: 1, silver: 2, gold: 3 };

  const F = { practice: '#3D5EFF', series: '#0E7F79', spatial: '#8552F0', verbal: '#C43D6E',
              games: '#0E7F79', streak: '#1A7F53', league: '#6B3FE0', fix: '#C43D6E', profile: '#8552F0' };

  const ACHIEVEMENTS = [
    { id: 'first-test', metal: 'gold', field: F.practice, glyph: 'test' },
    { id: 'answers-100', metal: 'bronze', field: F.practice, glyph: 'dumbbell' },
    { id: 'answers-500', metal: 'silver', field: F.practice, glyph: 'dumbbell' },
    { id: 'answers-2000', metal: 'gold', field: F.practice, glyph: 'dumbbell' },
    { id: 'perfect-10', metal: 'gold', field: F.practice, glyph: 'star' },
    { id: 'fixer-20', metal: 'silver', field: F.fix, glyph: 'check-circle' },
    { id: 'matrix-7', metal: 'silver', field: F.practice, glyph: 'matrix' },
    { id: 'series-7', metal: 'silver', field: F.series, glyph: 'series' },
    { id: 'spatial-7', metal: 'silver', field: F.spatial, glyph: 'spatial' },
    { id: 'verbal-7', metal: 'silver', field: F.verbal, glyph: 'verbal' },
    { id: 'games-all', metal: 'bronze', field: F.games, glyph: 'puzzle' },
    { id: 'game-lv5', metal: 'silver', field: F.games, glyph: 'level-up' },
    { id: 'game-lv10', metal: 'gold', field: F.games, glyph: 'peak' },
    { id: 'streak-3', metal: 'bronze', field: F.streak, glyph: 'flame' },
    { id: 'streak-7', metal: 'silver', field: F.streak, glyph: 'flame' },
    { id: 'streak-30', metal: 'gold', field: F.streak, glyph: 'flame' },
    { id: 'league-silver', metal: 'league', tier: 2, field: F.league, glyph: null },
    { id: 'league-gold', metal: 'league', tier: 3, field: F.league, glyph: null },
    { id: 'league-platinum', metal: 'league', tier: 4, field: F.league, glyph: null },
    { id: 'league-diamond', metal: 'league', tier: 5, field: F.league, glyph: null },
    { id: 'profile', metal: 'bronze', field: F.profile, glyph: 'user' },
  ];
  ACHIEVEMENTS.forEach(Object.freeze);

  /* Kulrang holat — ikki temaga alohida, shunda qulflangan nishon tungi
     fonda «porlab» turmaydi va yorugʻda ham xira koʻrinadi. */
  const GREY = {
    light: { ring: '#CFCCDB', ringB: '#BDB9CC', rim: '#A29EB4', field: '#B1ADC2', fieldB: '#A29EB4', glyph: '#FFFFFF', chip: '#6A6580', chipInk: '#FFFFFF', halo: '#FFFFFF' },
    dark: { ring: '#48445E', ringB: '#3E3A53', rim: '#57536E', field: '#34304A', fieldB: '#2E2A42', glyph: '#8A85A6', chip: '#9C97B8', chipInk: '#14121F', halo: '#1E1B2E' },
  };

  const HEX_O = 'M48 5 85.2 26.5V69.5L48 91 10.8 69.5V26.5Z';
  const HEX_OB = 'M48 5 85.2 26.5V69.5L48 91Z';
  const HEX_I = 'M48 17 74.8 32.5V63.5L48 79 21.2 63.5V32.5Z';
  const HEX_IB = 'M48 17 74.8 32.5V63.5L48 79Z';

  function glyph(name, color, cx, cy, scale, sw) {
    const I = window.nzIcons;
    const a = I && name && Object.prototype.hasOwnProperty.call(I, name) ? I[name] : null;
    if (!a) return '';
    const o = 12 * scale;
    return '<g transform="translate(' + (cx - o) + ' ' + (cy - o) + ') scale(' + scale + ')" fill="none" stroke="' + color +
      '" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round">' +
      a.map(d => '<path d="' + d + '"/>').join('') + '</g>';
  }

  function lockChip(g, cx, cy) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="17" fill="' + g.chip + '" stroke="' + g.halo + '" stroke-width="4"/>' +
      glyph('lock', g.chipInk, cx, cy, 0.9, 2.6);
  }

  function achievementSvg(a, locked, lock, theme) {
    let ring, ringB, rim, field, fieldB, ink, dots;
    const g = GREY[theme];
    if (locked) {
      ring = g.ring; ringB = g.ringB; rim = g.rim; field = g.field; fieldB = g.fieldB; ink = g.glyph; dots = g.rim;
    } else {
      const base = a.metal === 'league' ? LEAGUES[a.tier].fill : METALS[a.metal];
      ring = lighten(base, 0.18); ringB = darken(base, 0.06); rim = darken(base, 0.38);
      field = a.field; fieldB = darken(a.field, 0.14); ink = WHITE; dots = rim;
    }
    let s = shape(HEX_O, ring, rim, 5) + shape(HEX_OB, ringB) +
      shape(HEX_I, field, darken(field, locked ? 0.05 : 0.3), 2) + shape(HEX_IB, fieldB);
    if (a.metal === 'league') s += chevrons(LEAGUES[a.tier].chevrons, 48, ink, 5, 8.5, 12, 7);
    else s += glyph(a.glyph, ink, 48, 48, 1.55, 2.35);
    const k = PIPS[a.metal] || 0;
    for (let i = 0; i < k; i++) {
      s += '<circle cx="' + (48 + (i - (k - 1) / 2) * 8) + '" cy="85" r="3" fill="' + dots + '"/>';
    }
    if (locked && lock) s += lockChip(g, 74, 74);
    return svg(96, s);
  }

  /* ── Kolleksiya emblemalari (§6.7): doira, tanga rangidagi halqa ─── */
  const COIN = '#FFA726', COIN_B = '#F29100', COIN_RIM = '#C77700';
  const NIGHT = '#2B2270', NIGHT_B = '#221B5A';

  const COLLECTION = [
    { id: 'compass', accent: '#FF6FA5' },
    { id: 'rocket', accent: '#38BDF8' },
    { id: 'knight', accent: '#B9A2FF' },
    { id: 'maze', accent: '#5FE3A1' },
    { id: 'crystal', accent: '#35D6CC' },
    { id: 'planet', accent: '#FF8A65' },
    { id: 'tangram', accent: '#FF87B8' },
    { id: 'infinity', accent: '#B9A2FF' },
  ];
  COLLECTION.forEach(Object.freeze);

  /* Har emblema: w — asosiy (oq) ton, c — urgʻu ton, bg — maydon rangi
     (kesiklar uchun). Markaz (48,48), radius ≈ 26 ichida. */
  const EMBLEM = {
    compass: (w, c, bg) =>
      '<circle cx="48" cy="48" r="25" fill="none" stroke="' + w + '" stroke-opacity=".45" stroke-width="2.5"/>' +
      '<path d="M48 19v5M48 72v5M19 48h5M72 48h5" stroke="' + w + '" stroke-width="3" stroke-linecap="round"/>' +
      '<g transform="rotate(45 48 48)"><path d="M48 25 55 48H41Z" fill="' + c + '" stroke="' + c + '" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M41 48H55L48 71Z" fill="' + w + '" stroke="' + w + '" stroke-width="2" stroke-linejoin="round"/></g>' +
      '<circle cx="48" cy="48" r="3.5" fill="' + bg + '"/>',
    rocket: (w, c, bg) =>
      '<g transform="rotate(45 48 48)">' +
      '<path d="M40 56 31 66 40 64ZM56 56 65 66 56 64Z" fill="' + c + '" stroke="' + c + '" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M42 64Q48 80 54 64Z" fill="' + c + '" stroke="' + c + '" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M48 20C57 28 59 42 57 62H39C37 42 39 28 48 20Z" fill="' + w + '"/>' +
      '<circle cx="48" cy="40" r="5.5" fill="' + c + '" stroke="' + bg + '" stroke-width="2.5"/></g>',
    knight: (w, c, bg) =>
      '<path d="M37 70C37 58 42 52 47 44 42 45 38 48 34 50 30 52 26 49 26 45 26 38 31 32 36 27L35 20 41 24C49 21 58 25 61 34 64 43 62 56 62 70Z" fill="' + w + '" stroke="' + w + '" stroke-width="2" stroke-linejoin="round"/>' +
      '<circle cx="42" cy="32" r="2.6" fill="' + bg + '"/>' +
      '<rect x="31" y="68" width="34" height="8" rx="3" fill="' + c + '"/>',
    maze: (w, c) =>
      '<path d="M52.57 26.48A22 22 0 1 1 43.43 26.48M43.55 60.22A13 13 0 1 1 52.45 60.22M61 48H70M26 48H35" fill="none" stroke="' + w + '" stroke-width="4.5" stroke-linecap="round"/>' +
      '<circle cx="48" cy="48" r="4.5" fill="' + c + '"/>',
    crystal: (w, c, bg) =>
      '<path d="M33 39 42 27H54L63 39 48 72Z" fill="' + w + '" stroke="' + w + '" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M48 27H54L63 39 48 72Z" fill="' + c + '" stroke="' + c + '" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M33 39H63M42 27 48 39 54 27M48 39V71" fill="none" stroke="' + bg + '" stroke-opacity=".55" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>',
    planet: (w, c, bg) =>
      '<g transform="rotate(-20 48 48)"><path d="M17 48A31 9.5 0 0 1 79 48" fill="none" stroke="' + w + '" stroke-width="4" stroke-linecap="round"/></g>' +
      '<circle cx="48" cy="48" r="16" fill="' + c + '"/>' +
      '<path d="M34 42Q48 38 62 42" fill="none" stroke="' + bg + '" stroke-opacity=".25" stroke-width="3" stroke-linecap="round"/>' +
      '<g transform="rotate(-20 48 48)"><path d="M17 48A31 9.5 0 0 0 79 48" fill="none" stroke="' + bg + '" stroke-width="8" stroke-linecap="round"/>' +
      '<path d="M17 48A31 9.5 0 0 0 79 48" fill="none" stroke="' + w + '" stroke-width="4" stroke-linecap="round"/></g>',
    tangram: (w, c) => {
      /* Toʻrt xil tangram boʻlagi erkin kompozitsiyada (katta uchburchak,
         kvadrat, parallelogramm, kichik uchburchak) — butun kvadrat
         «konvert»ga oʻxshab qolardi. */
      const P = [
        ['25,64 49,40 49,64', w], ['57,23 66,32 57,41 48,32', c],
        ['57,46 67,46 67,56', w], ['52,71 59,64 71,64 64,71', c],
      ];
      return '<g transform="translate(48 48) scale(1.15) translate(-48 -48)">' +
        P.map(p => '<polygon points="' + p[0] + '" fill="' + p[1] + '" stroke="' + p[1] +
        '" stroke-width="2" stroke-linejoin="round"/>').join('') + '</g>';
    },
    infinity: (w, c) =>
      '<path d="M48 48C56 38 71 35 71 48 71 61 56 58 48 48" fill="none" stroke="' + c + '" stroke-width="7" stroke-linecap="round"/>' +
      '<path d="M48 48C40 38 25 35 25 48 25 61 40 58 48 48 52 43 54 41 57 39.6" fill="none" stroke="' + w + '" stroke-width="7" stroke-linecap="round"/>',
  };

  function emblemSvg(e, locked, lock, theme) {
    const g = GREY[theme];
    const ring = locked ? g.ring : COIN, ringB = locked ? g.ringB : COIN_B, rim = locked ? g.rim : COIN_RIM;
    const field = locked ? g.field : NIGHT, fieldB = locked ? g.fieldB : NIGHT_B;
    const w = locked ? g.glyph : WHITE;
    const c = locked ? (theme === 'dark' ? '#6E6A86' : '#DAD7E4') : e.accent;
    let s = '<circle cx="48" cy="48" r="44" fill="' + ring + '" stroke="' + rim + '" stroke-width="3"/>' +
      '<path d="M48 4A44 44 0 0 1 48 92Z" fill="' + ringB + '"/>' +
      '<circle cx="48" cy="48" r="35" fill="' + field + '" stroke="' + rim + '" stroke-width="2"/>' +
      '<path d="M48 13A35 35 0 0 1 48 83Z" fill="' + fieldB + '"/>' +
      '<circle cx="48" cy="48" r="31.5" fill="none" stroke="' + WHITE + '" stroke-opacity="' + (locked ? '.1' : '.14') + '" stroke-width="1.5"/>';
    s += EMBLEM[e.id](w, c, fieldB);
    if (locked && lock) s += lockChip(g, 74, 74);
    return svg(96, s);
  }

  /* ── Tanga, ball, IQ belgisi ────────────────────────────────────── */
  function coinSvg() {
    return svg(24,
      '<circle cx="12" cy="12" r="10.5" fill="' + COIN + '" stroke="' + COIN_RIM + '" stroke-width="1.5"/>' +
      '<circle cx="12" cy="12" r="6.5" fill="none" stroke="' + COIN_RIM + '" stroke-opacity=".55" stroke-width="1.5"/>' +
      '<path d="M7.4 9.6A5 5 0 0 1 10.2 6.8" fill="none" stroke="' + WHITE + '" stroke-opacity=".75" stroke-width="1.6" stroke-linecap="round"/>');
  }

  function ballSvg(theme) {
    const top = theme === 'dark' ? '#B9A2FF' : '#9C7BFF';
    const bot = theme === 'dark' ? '#9C7BFF' : '#8552F0';
    return svg(24,
      '<path d="M12 2.5 21.5 12 12 21.5 2.5 12Z" fill="' + bot + '" stroke="' + bot + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M2.5 12 12 2.5 21.5 12Z" fill="' + top + '" stroke="' + top + '" stroke-width="2.5" stroke-linejoin="round"/>');
  }

  function markSvg(color) {
    const c = /^#[0-9A-Fa-f]{6}$/.test(color || '') ? color : '#FFA726';
    return svg(100,
      '<rect x="8" y="21" width="16" height="58" rx="3" fill="' + c + '"/>' +
      '<circle cx="63" cy="50" r="21" fill="none" stroke="' + c + '" stroke-width="16"/>' +
      '<path d="M60 64 92 86" stroke="' + c + '" stroke-width="15" stroke-linecap="round"/>', 'IQuest');
  }

  /* ── Kesh va ommaviy API ────────────────────────────────────────── */
  const cache = new Map();
  const memo = (key, make) => {
    if (!cache.has(key)) cache.set(key, make());
    return cache.get(key);
  };
  const theme = o => (o && o.theme === 'dark' ? 'dark' : 'light');

  const byId = Object.create(null);
  ACHIEVEMENTS.forEach(a => { byId[a.id] = { kind: 'a', v: a }; });
  COLLECTION.forEach(e => { byId[e.id] = { kind: 'c', v: e }; });

  const uris = new Map();

  window.nzArt = Object.freeze({
    LEAGUES: Object.freeze(LEAGUES),
    ACHIEVEMENTS: Object.freeze(ACHIEVEMENTS),
    COLLECTION: Object.freeze(COLLECTION),

    shield(tier, opts) {
      const t = Math.max(0, Math.min(5, Math.floor(Number(tier)) || 0));
      const mini = !!(opts && opts.mini);
      return memo('s' + t + (mini ? 'm' : ''), () => shieldSvg(t, mini));
    },

    medal(id, opts) {
      const hit = Object.prototype.hasOwnProperty.call(byId, id) ? byId[id] : null;
      if (!hit) return '';
      const o = opts || {};
      const locked = !!o.locked, th = theme(o);
      const lock = locked && (o.lock === undefined ? hit.kind === 'a' : !!o.lock);
      return memo('m' + id + (locked ? 'L' : '') + (lock ? 'k' : '') + th, () =>
        hit.kind === 'a' ? achievementSvg(hit.v, locked, lock, th) : emblemSvg(hit.v, locked, lock, th));
    },

    has: id => Object.prototype.hasOwnProperty.call(byId, id),
    coin: () => memo('coin', coinSvg),
    ball: opts => { const th = theme(opts); return memo('ball' + th, () => ballSvg(th)); },
    mark: opts => { const c = opts && opts.color; return memo('mark' + c, () => markSvg(c)); },

    src(s) {
      if (typeof s !== 'string' || !s) return '';
      if (!uris.has(s)) uris.set(s, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s));
      return uris.get(s);
    },
  });
})();
