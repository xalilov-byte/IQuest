/* ─────────────────────────────────────────────────────────────────────────
   ICONS — BITTA GLIF REYESTRI (ARXITEKTURA §9.4, 2-qatlam)

   window.nzIcons = { nom: [path1, path2?, path3?] }

   Markup har doim shunday chizadi (hech qachon qoʻlda yozilgan yoʻl yoʻq):
     <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
       <path d="{{ x.path1 }}"></path><path d="{{ x.path2 }}"></path><path d="{{ x.path3 }}"></path>
     </svg>
   Yordamchi: nzIcons.paths('gear') → { path1, path2, path3 } (yoʻq element
   '' boʻladi — boʻsh d hech narsa chizmaydi). Bu funksiya sanab
   boʻlinmaydi (enumerable emas), shuning uchun Object.keys(nzIcons) faqat
   glif nomlarini beradi.

   KEYLINE SHARTNOMASI (Main.dc.html dagi IKONKA TIZIMI izohi bilan bir xil):
     · maydon 24×24, geometriya 1..23 ichida (test tekshiradi), asosiy
       shakllar 2..22 da — CSS rampidagi 2.25–2.9 qalin chiziq ham chetga
       tegmaydi;
     · faqat chiziq (fill yoʻq): qalinlik, uchlar va burchaklar CSS dan
       keladi (svg:not([role="img"]) qoidasi), shuning uchun bu yerda
       stroke-width yozilmaydi;
     · doira radiusi 9.5 (2.35 chiziq bilan ham 1 px boʻsh joy qoladi),
       katta toʻrtburchak 3..21, burchak radiusi 2 (kichik shaklda 1–1.5);
     · alohida elementlar orasida ≥1.4 birlik toza tirqish (22 px da
       oʻqiladi);
     · bitta glifda ≤3 element (<path>);
     · bir maʼno = bir glif. «spatial» ham savol turi, ham koʻnikma —
       maʼnosi bitta (fazo), shuning uchun glif ham bitta.

   Yoʻllarning bir qismi Lucide (ISC litsenziyasi) dan moslashtirilgan
   (README §7). Oʻyin gliflari (flanker, matrix-memory, mental-math, nback,
   schulte, sequence) shu ilova uchun chizilgan.

   Eslatma — flanker: spetsifikatsiya «5 strelka» deydi, lekin 24 px
   maydonda 5 ta strelka 2.35 chiziq bilan bir-biriga yopishib qoladi
   (tirqish <0.7). Shuning uchun uch qatorli ← → ← : oʻrtadagisi teskari,
   gʻoya (chalgʻituvchi qoʻshnilar) saqlanadi.
   ───────────────────────────────────────────────────────────────────── */

(function () {
  /* Sonni qisqa yozish: 3 xonagacha, ortiqcha nollarsiz. */
  const n = v => String(Math.round(v * 1000) / 1000).replace(/^(-?)0\./, '$1.');

  /* Doira — ikki yoy (SVG <circle> emas: reyestrda faqat yoʻl bor). */
  const circ = (cx, cy, r) =>
    'M' + n(cx - r) + ' ' + n(cy) + 'a' + n(r) + ' ' + n(r) + ' 0 1 0 ' + n(2 * r) + ' 0' +
    'a' + n(r) + ' ' + n(r) + ' 0 1 0 ' + n(-2 * r) + ' 0z';

  /* Yumaloq burchakli toʻrtburchak. */
  const rrect = (x, y, w, h, r) =>
    'M' + n(x + r) + ' ' + n(y) + 'h' + n(w - 2 * r) +
    'a' + n(r) + ' ' + n(r) + ' 0 0 1 ' + n(r) + ' ' + n(r) + 'v' + n(h - 2 * r) +
    'a' + n(r) + ' ' + n(r) + ' 0 0 1 ' + n(-r) + ' ' + n(r) + 'h' + n(-(w - 2 * r)) +
    'a' + n(r) + ' ' + n(r) + ' 0 0 1 ' + n(-r) + ' ' + n(-r) + 'v' + n(-(h - 2 * r)) +
    'a' + n(r) + ' ' + n(r) + ' 0 0 1 ' + n(r) + ' ' + n(-r) + 'z';

  /* Toʻla nuqta: r=.5 doira + chiziq = ~3.3 birlik yaxlit dogʻ. */
  const dot = (x, y) => circ(x, y, 0.5);

  /* Katakni «toʻldirish»: kichik kvadrat qalin chiziq bilan katakni yopadi. */
  const cell = (cx, cy) => 'M' + n(cx - 0.7) + ' ' + n(cy - 0.7) + 'h1.4v1.4h-1.4z';

  const R = 9.5;            // standart doira radiusi
  const RING = circ(12, 12, R);

  const I = {
    /* ── Navigatsiya ─────────────────────────────────────────────── */
    home: [
      'M3 10a2 2 0 0 1 .71-1.53l7-6a2 2 0 0 1 2.58 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
      'M9 21v-6.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V21',
    ],
    dumbbell: [                                   // Mashq tabi
      'M7 6v12M17 6v12',
      'M3 9.25v5.5M21 9.25v5.5',
      'M7 12h10',
    ],
    trophy: [                                     // Reyting tabi
      'M7 3.5h10V9a5 5 0 0 1-10 0z',
      'M7 5.5H5a2 2 0 0 0-2 2A4 4 0 0 0 7 11.5h.7M17 5.5h2a2 2 0 0 1 2 2 4 4 0 0 1-4 4h-.7',
      'M12 14v3M8.5 21v-1.5a2.5 2.5 0 0 1 2.5-2.5h2a2.5 2.5 0 0 1 2.5 2.5V21z',
    ],
    user: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', circ(12, 7, 4)],
    gear: [
      'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
      circ(12, 12, 3),
    ],
    'chevron-left': ['M15 18l-6-6 6-6'],
    'chevron-right': ['M9 18l6-6-6-6'],
    'chevron-up': ['M18 15l-6-6-6 6'],
    'chevron-down': ['M6 9l6 6 6-6'],
    'arrow-left': ['M19 12H5', 'M12 19l-7-7 7-7'],
    'arrow-right': ['M5 12h14', 'M12 5l7 7-7 7'],
    x: ['M18 6 6 18M6 6l12 12'],
    check: ['M20 6 9 17l-5-5'],
    plus: ['M5 12h14M12 5v14'],
    minus: ['M5 12h14'],
    'external-link': ['M15 3h6v6', 'M10 14 21 3', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'],

    /* ── Amallar ─────────────────────────────────────────────────── */
    pencil: [
      'M21.17 6.81a1 1 0 0 0-3.98-3.98L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z',
      'M15 5l4 4',
    ],
    image: [rrect(3, 3, 18, 18, 2), circ(9, 9, 2), 'M21 15l-3.09-3.09a2 2 0 0 0-2.82 0L6 21'],
    camera: [
      'M14.5 4.5h-5L7 7.5H4.5a2 2 0 0 0-2 2V18a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2V9.5a2 2 0 0 0-2-2H17z',
      circ(12, 13.5, 3.25),
    ],
    trash: [
      'M3.5 6h17M8.5 6V4.5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2V6',
      'M18.5 6v13.5a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V6',
      'M10 11v6M14 11v6',
    ],
    lock: [rrect(4, 11, 16, 10, 2), 'M7.5 11V7.5a4.5 4.5 0 0 1 9 0V11', 'M12 15v2'],
    bookmark: ['M17 3a2 2 0 0 1 2 2v15.1a.5.5 0 0 1-.78.42L12 17l-6.22 3.52A.5.5 0 0 1 5 20.1V5a2 2 0 0 1 2-2z'],
    'x-circle': [RING, 'M15 9l-6 6M9 9l6 6'],
    'check-circle': [RING, 'M8.5 12.5l2.5 2.5 4.5-5'],
    pause: [rrect(6, 4.5, 4, 15, 1.5), rrect(14, 4.5, 4, 15, 1.5)],
    play: ['M6.5 5.13a1.5 1.5 0 0 1 2.27-1.29l10.6 6.87a1.5 1.5 0 0 1 0 2.58l-10.6 6.87A1.5 1.5 0 0 1 6.5 18.87z'],
    info: [RING, 'M12 16.5v-5M12 7.75h.01'],
    alert: ['M21.73 18l-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z', 'M12 9v4', 'M12 17h.01'],

    /* ── Sozlamalar ──────────────────────────────────────────────── */
    globe: [RING, 'M12 2.5a14.5 14.5 0 0 0 0 19 14.5 14.5 0 0 0 0-19', 'M2.5 12h19'],
    moon: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z'],
    sun: [
      circ(12, 12, 4),
      'M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41',
    ],
    volume: [
      'M11 4.7a.7.7 0 0 0-1.2-.5L6.41 7.59A1.4 1.4 0 0 1 5.42 8H3.5a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h1.92a1.4 1.4 0 0 1 1 .41l3.38 3.38a.7.7 0 0 0 1.2-.49z',
      'M15.5 9a5 5 0 0 1 0 6',
      'M18.86 18.36a9 9 0 0 0 0-12.72',
    ],
    vibrate: ['M2.5 8.5l2 1.75-2 1.75 2 1.75-2 1.75M21.5 8.5l-2 1.75 2 1.75-2 1.75 2 1.75', rrect(8, 4.5, 8, 15, 1.5)],
    bell: [
      'M10.27 21a2 2 0 0 0 3.46 0',
      'M3.76 15.33A1 1 0 0 0 4.5 17h15a1 1 0 0 0 .74-1.67C18.91 13.96 17.5 12.5 17.5 8.5a5.5 5.5 0 0 0-11 0c0 4-1.41 5.46-2.74 6.83',
    ],
    clock: [RING, 'M12 6.5V12l3.5 2'],
    flame: [
      'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z',
    ],
    'help-circle': [RING, 'M9.1 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3', 'M12 17h.01'],
    mail: [rrect(2.5, 4.5, 19, 15, 2), 'M21.5 7.5l-8.49 5.4a2 2 0 0 1-2.02 0L2.5 7.5'],
    star: [
      'M11.53 2.3a.53.53 0 0 1 .95 0l2.31 4.68a2.12 2.12 0 0 0 1.6 1.16l5.16.76a.53.53 0 0 1 .3.9l-3.74 3.64a2.12 2.12 0 0 0-.61 1.88l.88 5.14a.53.53 0 0 1-.77.56l-4.62-2.43a2.12 2.12 0 0 0-1.97 0L6.4 21.01a.53.53 0 0 1-.77-.56l.88-5.14a2.12 2.12 0 0 0-.61-1.88L2.16 9.8a.53.53 0 0 1 .3-.91l5.16-.75a2.12 2.12 0 0 0 1.6-1.16z',
    ],
    doc: [
      'M14.5 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-12z',
      'M14 2.5v4a2 2 0 0 0 2 2h3.5',
      'M8.5 13h7M8.5 17h4.5',
    ],
    'shield-check': [
      'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
      'M9 12l2 2 4-4',
    ],

    /* ── Iqtisod ─────────────────────────────────────────────────── */
    bag: [                                        // Doʻkon
      'M3.9 5.97a2 2 0 0 0-.4 1.2V19.5a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2V7.17a2 2 0 0 0-.4-1.2l-1.8-2.47a2 2 0 0 0-1.6-.8H7.3a2 2 0 0 0-1.6.8z',
      'M3.7 6.5h16.6',
      'M15.5 10a3.5 3.5 0 0 1-7 0',
    ],
    medal: [                                      // Nishonlar: olti burchak medalyon + lenta
      'M12 8.5l5.63 3.25v6.5L12 21.5l-5.63-3.25v-6.5z',
      'M7 2.5l2.2 7.6M17 2.5l-2.2 7.6',
    ],
    palette: [
      'M12 21.5a9.5 9.5 0 0 1 0-19c5.25 0 9.5 3.8 9.5 8.5a4.75 4.75 0 0 1-4.75 4.75h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.55z',
      dot(13.5, 6.5) + dot(17.5, 10.5) + dot(8.5, 7.5) + dot(6.5, 12.5),
    ],
    sparkle: [
      'M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0l1.58 6.14a2 2 0 0 0 1.44 1.44l6.14 1.58a.5.5 0 0 1 0 .96l-6.14 1.58a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z',
      'M20 3v4M22 5h-4',
      'M4 17v2M5 18H3',
    ],
    coin: [                                       // tanga ustuni (monoxrom; rangli — nzArt.coin). Nishon (attention) bilan adashmasin deb doira emas
      'M4 8.5c0-2.2 3.58-4 8-4s8 1.8 8 4-3.58 4-8 4-8-1.8-8-4z',
      'M4 8.5v7c0 2.2 3.58 4 8 4s8-1.8 8-4v-7',
      'M4 12c0 2.2 3.58 4 8 4s8-1.8 8-4',
    ],
    diamond: ['M10.59 2.91a2 2 0 0 1 2.82 0l7.68 7.68a2 2 0 0 1 0 2.82l-7.68 7.68a2 2 0 0 1-2.82 0l-7.68-7.68a2 2 0 0 1 0-2.82z'], // ◆ ball

    /* ── Savol turlari ───────────────────────────────────────────── */
    matrix: [rrect(3, 3, 18, 18, 2), 'M9 3v18M15 3v18M3 9h18M3 15h18'],
    series: ['M21 7l-7.5 7.5-4-4L3 17', 'M15 7h6v6'],        // faqat son qatorlari
    spatial: [                                                // kub (tur va koʻnikma)
      'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
      'M3.3 7L12 12l8.7-5',
      'M12 22V12',
    ],
    verbal: ['M4 6h16M4 12h10M4 18h14'],

    /* ── Koʻnikmalar ─────────────────────────────────────────────── */
    attention: [circ(12, 12, R), circ(12, 12, 5), dot(12, 12)],
    memory: [
      'M12.83 2.68a2 2 0 0 0-1.66 0L3.1 6.33a1 1 0 0 0 0 1.83l8.07 3.66a2 2 0 0 0 1.66 0l8.07-3.66a1 1 0 0 0 0-1.83z',
      'M21.5 12.15l-8.67 3.94a2 2 0 0 1-1.66 0L2.5 12.15',
      'M21.5 16.9l-8.67 3.94a2 2 0 0 1-1.66 0L2.5 16.9',
    ],
    speed: ['M4.5 14a1 1 0 0 1-.78-1.63l9.4-9.7a.5.5 0 0 1 .86.46l-1.82 5.72A1 1 0 0 0 13.1 10h6.4a1 1 0 0 1 .78 1.63l-9.4 9.7a.5.5 0 0 1-.86-.46l1.82-5.72A1 1 0 0 0 10.9 14z'],
    logic: [
      'M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5',
      'M9 18h6',
      'M10 21.5h4',
    ],
    puzzle: ['M6 7h2.6a2.4 2.4 0 1 1 3.8 0H15a2 2 0 0 1 2 2v2.6a2.4 2.4 0 1 1 0 3.8V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z'],

    /* ── Oʻyinlar ────────────────────────────────────────────────── */
    flanker: [
      'M19.5 5.5h-15M7.25 2.75 4.5 5.5l2.75 2.75',
      'M4.5 12h15M16.75 9.25 19.5 12l-2.75 2.75',
      'M19.5 18.5h-15M7.25 15.75 4.5 18.5l2.75 2.75',
    ],
    'matrix-memory': [rrect(3, 3, 18, 18, 2), 'M9 3v18M15 3v18M3 9h18M3 15h18', cell(18, 6) + cell(6, 12)],
    'mental-math': [rrect(3, 3, 18, 18, 3.5), 'M12 6.75v6M9 9.75h6', 'M9 16.5h6'],
    nback: ['M3.5 12a8.5 8.5 0 1 0 8.5-8.5 9.2 9.2 0 0 0-6.36 2.59L3.5 8.25', 'M3.5 3.5v4.75h4.75', dot(12, 12)],
    schulte: [
      rrect(3, 3, 18, 18, 2),
      'M12 3v18M3 12h18',
      'M6.3 6.6 7.6 5.7v4.4',
    ],
    sequence: [
      circ(5.5, 5.5, 2.5) + circ(18.5, 12, 2.5) + circ(5.5, 18.5, 2.5),
      'M8 5.5h5.5a5 4 0 0 1 5 4M18.5 14.5a5 4 0 0 1-5 4H8',
    ],

    /* ── Nishon medalyonlari uchun qoʻshimcha maʼnolar ───────────── */
    test: [rrect(8, 2.5, 8, 4, 1), 'M16 4.5h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h2', 'M9 14l2 2 4-4'],
    'level-up': ['M17 11l-5-5-5 5M17 18l-5-5-5 5'],
    peak: ['M2.5 20 9 7.5l3.5 6.5 2.5-3.5 6.5 9.5z', 'M9 7.5V3l3 1.25L9 5.5'],

    /* ── v2 zaxirasi (reyestrda bor, v1.x da ishlatilmaydi) ──────── */
    users: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', circ(9, 7, 4), 'M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'],
    message: ['M7.9 20A9 9 0 1 0 4 16.1L2.5 21.5z'],
    'user-plus': ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', circ(9, 7, 4), 'M19 8v6M22 11h-6'],
    search: [circ(11, 11, 7.5), 'M21 21l-4.7-4.7'],
    flag: ['M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z', 'M4 21.5V15'],
    ban: [RING, 'M5.3 5.3l13.4 13.4'],
    share: [circ(18, 5, 3) + circ(6, 12, 3) + circ(18, 19, 3), 'M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98'],
    link: [
      'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
      'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
    ],
  };

  Object.keys(I).forEach(k => Object.freeze(I[k]));

  /* Bogʻlash yordamchisi: har doim uchta satr (yoʻq element — ''). Nomaʼlum
     nom ekranni buzmasin: boʻsh glif qaytadi, xato otilmaydi. */
  Object.defineProperty(I, 'paths', {
    enumerable: false,
    value: function (name) {
      const a = Object.prototype.hasOwnProperty.call(I, name) ? I[name] : [];
      return { path1: a[0] || '', path2: a[1] || '', path3: a[2] || '' };
    },
  });

  window.nzIcons = Object.freeze(I);
})();
