/* ─────────────────────────────────────────────────────────────────────────
   AVATARLAR — 16 ta tayyor avatar (ARXITEKTURA §5.2) → window.IQ_AVATARS

   Statik maʼlumot: hech narsa saqlanmaydi, hech kimni chaqirmaydi. Profil
   `{ kind: 'preset', id }` shaklida faqat id ni saqlaydi, rasm shu yerdan
   olinadi.

   USLUB (qatʼiy, tests/avatars.test.mjs isbotlaydi):
   · viewBox 96×96, fon SHAFFOF — orqasida profil rangidagi doira turadi
     (uni UI chizadi, chunki <img> ichidagi SVG CSS oʻzgaruvchisini
     koʻrmaydi, rang esa catalog.js dan keladi);
   · faqat ikki rang: oq #FFFFFF shakl va #1C1B29 kontur/detallar. 2 px
     kontur 12 ta rangning har birida siluetni ajratib turadi — faqat
     siyoh chizigʻi «Grafit» (#3A3850) ustida yoʻqolib ketardi, faqat oq
     esa «Sariq» ustida;
   · ≤ 6 ta shakl, har SVG ≤ 1,6 KB, matn yoʻq, inson yuzi yoʻq, diniy
     yoki siyosiy belgi yoʻq;
   · hamma chiziq markazdan ≤ 46 px radiusda: avatar doira ichida
     kesilsa ham, kesilmasa ham bir xil koʻrinadi;
   · skript, on*=, <foreignObject>, href, url(), style YOʻQ. Ilova ularni
     `<img src="data:image/svg+xml,…">` bilan koʻrsatadi (IQ.svgSrc kabi),
     hech qachon innerHTML bilan emas.

   Tartib — Rasm varagʻidagi 4×4 setka tartibi: 12 hayvon, 4 geometrik.
   Nomlar {uz, ru, en}. Oʻzbekchada ʻ (U+02BB) va ʼ (U+02BC).
   ───────────────────────────────────────────────────────────────────── */

(function (root) {
  const INK = '#1C1B29';
  const PAPER = '#FFFFFF';
  const HEAD = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">' +
    '<g fill="#FFFFFF" stroke="#1C1B29" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">';
  const TAIL = '</g></svg>';

  /* Chizmalar. Har qator: [id, tur, {uz, ru, en}, ichki qism]. Qoidalar:
     oq shakl — meros fill/stroke; siyoh — fill="#1C1B29"; yaltiroq —
     stroke="none" (oq); chiziq — fill="none". */
  const BODY = {
    owl: '<path d="M20 18Q34 30 48 29Q62 30 76 18C83 34 82 44 80 56C78 74 64 85 48 85C32 85 18 74 16 56C14 44 13 34 20 18Z"/><path d="M22 47a13 13 0 1 0 26 0a13 13 0 1 0 -26 0M48 47a13 13 0 1 0 26 0a13 13 0 1 0 -26 0"/><path fill="#1C1B29" d="M29.5 48a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0 -13 0M53.5 48a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0 -13 0M43.5 59Q48 57 52.5 59L48 66Z"/><path stroke="none" d="M35.8 46a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M59.8 46a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0"/><path fill="none" d="M36 72q3 3 6 0M54 72q3 3 6 0M45 78q3 3 6 0"/>',
    fox: '<path d="M22 14L38 31Q48 28 58 31L74 14Q80 30 78 44L84 58Q70 77 48 83Q26 77 12 58L18 44Q16 30 22 14Z"/><path fill="#1C1B29" d="M25 22L33.5 31.5Q27.5 34 25 39ZM71 22L62.5 31.5Q68.5 34 71 39ZM32.8 51a4.2 4.2 0 1 0 8.4 0a4.2 4.2 0 1 0 -8.4 0M54.8 51a4.2 4.2 0 1 0 8.4 0a4.2 4.2 0 1 0 -8.4 0M43.5 70Q48 67.5 52.5 70Q50.5 75 48 75Q45.5 75 43.5 70Z"/><path stroke="none" d="M36.9 49.6a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M58.9 49.6a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0"/><path fill="none" d="M19 50Q33 55 39 65Q43 73 48 75Q53 73 57 65Q63 55 77 50"/>',
    cat: '<path d="M21 17L36 30Q48 27 60 30L75 17Q80 33 79 48Q80 78 48 80Q16 78 17 48Q16 33 21 17Z"/><path fill="#1C1B29" d="M24 25L32 31.5Q26.5 34 24 40ZM72 25L64 31.5Q69.5 34 72 40ZM32 50a5 5 0 1 0 10 0a5 5 0 1 0 -10 0M54 50a5 5 0 1 0 10 0a5 5 0 1 0 -10 0M45 59.5H51L48 62.5Z"/><path stroke="none" d="M37 48.2a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0M59 48.2a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0"/><path fill="none" d="M48 62.5Q48 66.5 44 67M48 62.5Q48 66.5 52 67M11 55L27 58M12 64L27 62M85 55L69 58M84 64L69 62"/>',
    bear: '<path d="M16 28a11 11 0 1 0 22 0a11 11 0 1 0 -22 0M58 28a11 11 0 1 0 22 0a11 11 0 1 0 -22 0"/><path d="M18 54a30 30 0 1 0 60 0a30 30 0 1 0 -60 0"/><path d="M34 65A14 10.5 0 1 0 62 65A14 10.5 0 1 0 34 65"/><path fill="#1C1B29" d="M22 27.5a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0 -9 0M65 27.5a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0 -9 0M33 48a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M55 48a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M42 60A6 4 0 1 0 54 60A6 4 0 1 0 42 60"/><path stroke="none" d="M36.9 46.6a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M58.9 46.6a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0"/><path fill="none" d="M48 64V68M42.5 67.5Q45.5 71 48 68Q50.5 71 53.5 67.5"/>',
    lion: '<path d="M48 14Q60.2 4.6 66 18.8Q81.2 16.8 79.2 32Q93.4 37.8 84 50Q93.4 62.2 79.2 68Q81.2 83.2 66 81.2Q60.2 95.4 48 86Q35.8 95.4 30 81.2Q14.8 83.2 16.8 68Q2.6 62.2 12 50Q2.6 37.8 16.8 32Q14.8 16.8 30 18.8Q35.8 4.6 48 14Z"/><path d="M25 52a23 23 0 1 0 46 0a23 23 0 1 0 -46 0"/><path fill="#1C1B29" d="M35.2 47a3.8 3.8 0 1 0 7.6 0a3.8 3.8 0 1 0 -7.6 0M53.2 47a3.8 3.8 0 1 0 7.6 0a3.8 3.8 0 1 0 -7.6 0M43 55.5Q48 53.5 53 55.5Q51 60.5 48 60.5Q45 60.5 43 55.5Z"/><path stroke="none" d="M39 45.6a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0 -2.8 0M57 45.6a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0 -2.8 0"/><path fill="none" d="M48 60.5V64M42.5 64Q48 69 53.5 64"/>',
    eagle: '<path d="M28 84Q16 70 17 50L9 42L19 38Q24 18 46 17Q66 16 72 35Q86 37 88 52Q88 61 81 63Q82 56 76 55L68 56Q63 64 66 76Q60 86 46 86Q36 87 28 84Z"/><path fill="#1C1B29" d="M51 40a5 5 0 1 0 10 0a5 5 0 1 0 -10 0M47 33Q57 26 69 32Q58 30 47 33ZM75.4 44a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0"/><path stroke="none" d="M55.8 38.4a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0"/><path fill="none" d="M72 35Q67 45 68 56M25 68q4 5 8 0q4 5 8 0q4 5 8 0q4 5 8 0q4 5 8 0"/>',
    panda: '<path fill="#1C1B29" d="M15.5 28a10.5 10.5 0 1 0 21 0a10.5 10.5 0 1 0 -21 0M59.5 28a10.5 10.5 0 1 0 21 0a10.5 10.5 0 1 0 -21 0"/><path d="M18 54a30 30 0 1 0 60 0a30 30 0 1 0 -60 0"/><path fill="#1C1B29" d="M40.5 42.6A9.5 6.8 118 1 0 31.5 59.4A9.5 6.8 118 1 0 40.5 42.6M55.5 42.6A9.5 6.8 62 1 0 64.5 59.4A9.5 6.8 62 1 0 55.5 42.6M42.5 62A5.5 3.8 0 1 0 53.5 62A5.5 3.8 0 1 0 42.5 62"/><path stroke="none" d="M34.7 49.5a2.8 2.8 0 1 0 5.6 0a2.8 2.8 0 1 0 -5.6 0M55.7 49.5a2.8 2.8 0 1 0 5.6 0a2.8 2.8 0 1 0 -5.6 0"/><path fill="none" d="M48 66V69M43 68.5Q45.5 71.5 48 69Q50.5 71.5 53 68.5"/>',
    rabbit: '<path d="M38.6 8.2A19 8.5 98 1 0 33.4 45.8A19 8.5 98 1 0 38.6 8.2M57.4 8.2A19 8.5 82 1 0 62.6 45.8A19 8.5 82 1 0 57.4 8.2"/><path d="M25 61a23 23 0 1 0 46 0a23 23 0 1 0 -46 0"/><path fill="#1C1B29" d="M37.9 15.1A12 3.4 98 1 0 34.5 38.9A12 3.4 98 1 0 37.9 15.1M58.1 15.1A12 3.4 82 1 0 61.5 38.9A12 3.4 82 1 0 58.1 15.1M35 58a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M53 58a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M45 65Q48 63.5 51 65Q49.5 68 48 68Q46.5 68 45 65Z"/><path stroke="none" d="M38.9 56.6a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M56.9 56.6a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0"/><path fill="none" d="M48 68V70.5M44 71Q46 73.5 48 70.5Q50 73.5 52 71"/>',
    penguin: '<path d="M48 13C67 13 77 30 77 52C77 72 65 86 48 86C31 86 19 72 19 52C19 30 29 13 48 13Z"/><path fill="#1C1B29" d="M48 13C67 13 77 30 77 52C77 69 70 80 62 84C67 73 69 61 67 51C66 40 61 34 55 34C52 34 49.5 36 48 38.5C46.5 36 44 34 41 34C35 34 30 40 29 51C27 61 29 73 34 84C26 80 19 69 19 52C19 30 29 13 48 13ZM20 56Q10 64 12 76Q19 72 22 66ZM76 56Q86 64 84 76Q77 72 74 66ZM36.9 48a3.6 3.6 0 1 0 7.2 0a3.6 3.6 0 1 0 -7.2 0M51.9 48a3.6 3.6 0 1 0 7.2 0a3.6 3.6 0 1 0 -7.2 0M44 55Q48 53 52 55L48 61Z"/><path stroke="none" d="M40.6 46.6a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0M55.6 46.6a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0"/>',
    turtle: '<path d="M60 60L64 74Q68 77 72 74L70 60ZM26 60L24 74Q28 77 32 74L36 60ZM18 58L9 64L20 63ZM67.5 50a10.5 10.5 0 1 0 21 0a10.5 10.5 0 1 0 -21 0"/><path d="M17 60Q18 27 46 26Q74 27 75 60Z"/><path d="M13 60H79Q83 60 81 64Q80 67 76 67H16Q12 67 11 64Q10 60 13 60Z"/><path fill="none" d="M32 60L36 46L46 40L56 46L60 60M36 46L22 44M56 46L70 44M46 40V27M81 55.5Q84.5 56.5 87 53.5"/><path fill="#1C1B29" d="M78.9 47.5a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0"/>',
    dolphin: '<path d="M87 42Q84 48 72 48Q54 49 40 62Q33 69 30 76L35 85Q26 83 21 77Q17 79 12 75Q17 70 22 69Q24 56 32 44Q40 30 52 25L44 12Q54 13 60 22Q72 22 78 30Q82 36 87 42Z"/><path d="M52 52Q48 60 42 64Q51 64 58 54Z"/><path fill="#1C1B29" d="M68.2 37a2.8 2.8 0 1 0 5.6 0a2.8 2.8 0 1 0 -5.6 0"/><path stroke="none" d="M71 36a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path fill="none" d="M87 42Q81 44 74 43M56 78q5-4 10 0t10 0"/>',
    deer: '<path fill="none" stroke-width="8" d="M41 32Q35 22 30 11M33.5 19.5L23 15M36.5 25.5L25 27M55 32Q61 22 66 11M62.5 19.5L73 15M59.5 25.5L71 27"/><path fill="none" stroke="#FFFFFF" stroke-width="4" d="M41 32Q35 22 30 11M33.5 19.5L23 15M36.5 25.5L25 27M55 32Q61 22 66 11M62.5 19.5L73 15M59.5 25.5L71 27"/><path d="M37 41Q24 29 12 36Q22 47 37 46ZM59 41Q72 29 84 36Q74 47 59 46Z"/><path d="M48 30C62 30 66 43 64 56C62 70 56 83 48 83C40 83 34 70 32 56C30 43 34 30 48 30Z"/><path fill="#1C1B29" d="M36.9 50a3.6 3.6 0 1 0 7.2 0a3.6 3.6 0 1 0 -7.2 0M51.9 50a3.6 3.6 0 1 0 7.2 0a3.6 3.6 0 1 0 -7.2 0M41.5 74A6.5 4.5 0 1 0 54.5 74A6.5 4.5 0 1 0 41.5 74M31 38Q23 35 17 37Q23 42 31 42ZM65 38Q73 35 79 37Q73 42 65 42Z"/><path stroke="none" d="M40.6 48.6a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0M55.6 48.6a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0"/>',
    cube: '<path d="M48 13L80 31.5V68.5L48 87L16 68.5V31.5Z"/><path fill="#1C1B29" d="M48 50L80 31.5V68.5L48 87Z"/><path fill="none" d="M16 31.5L48 50"/>',
    orbit: '<path fill="none" stroke-width="7" d="M11.8 64.6A39 12.5 -22 0 1 84.2 35.4"/><path fill="none" stroke="#FFFFFF" stroke-width="3" d="M11.8 64.6A39 12.5 -22 0 1 84.2 35.4"/><path d="M29 50a19 19 0 1 0 38 0a19 19 0 1 0 -38 0"/><path fill="none" stroke-width="7" d="M84.2 35.4A39 12.5 -22 0 1 11.8 64.6"/><path fill="none" stroke="#FFFFFF" stroke-width="3" d="M84.2 35.4A39 12.5 -22 0 1 11.8 64.6"/><path fill="#1C1B29" d="M28.3 67.4a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0 -11 0"/>',
    spark: '<path d="M42 18Q46 48 76 52Q46 56 42 86Q38 56 8 52Q38 48 42 18Z"/><path d="M71 13Q72.5 24.5 84 26Q72.5 27.5 71 39Q69.5 27.5 58 26Q69.5 24.5 71 13Z"/><path fill="#1C1B29" d="M70 70a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M42 44Q43 51 50 52Q43 53 42 60Q41 53 34 52Q41 51 42 44Z"/>',
    spiral: '<path fill="none" stroke-width="8" d="M46 49A3.5 3.5 0 0 1 53 49A7 7 0 0 1 39 49A10.5 10.5 0 0 1 60 49A14 14 0 0 1 32 49A17.5 17.5 0 0 1 67 49A21 21 0 0 1 25 49A24.5 24.5 0 0 1 74 49"/><path fill="none" stroke="#FFFFFF" stroke-width="4" d="M46 49A3.5 3.5 0 0 1 53 49A7 7 0 0 1 39 49A10.5 10.5 0 0 1 60 49A14 14 0 0 1 32 49A17.5 17.5 0 0 1 67 49A21 21 0 0 1 25 49A24.5 24.5 0 0 1 74 49"/><path fill="#1C1B29" d="M41.8 49a4.2 4.2 0 1 0 8.4 0a4.2 4.2 0 1 0 -8.4 0"/>',
  };

  const META = [
    ['owl',     'animal', { uz: 'Boyoʻgʻli', ru: 'Сова',     en: 'Owl' }],
    ['fox',     'animal', { uz: 'Tulki',     ru: 'Лиса',     en: 'Fox' }],
    ['cat',     'animal', { uz: 'Mushuk',    ru: 'Кошка',    en: 'Cat' }],
    ['bear',    'animal', { uz: 'Ayiq',      ru: 'Медведь',  en: 'Bear' }],
    ['lion',    'animal', { uz: 'Sher',      ru: 'Лев',      en: 'Lion' }],
    ['eagle',   'animal', { uz: 'Burgut',    ru: 'Орёл',     en: 'Eagle' }],
    ['panda',   'animal', { uz: 'Panda',     ru: 'Панда',    en: 'Panda' }],
    ['rabbit',  'animal', { uz: 'Quyon',     ru: 'Кролик',   en: 'Rabbit' }],
    ['penguin', 'animal', { uz: 'Pingvin',   ru: 'Пингвин',  en: 'Penguin' }],
    ['turtle',  'animal', { uz: 'Toshbaqa',  ru: 'Черепаха', en: 'Turtle' }],
    ['dolphin', 'animal', { uz: 'Delfin',    ru: 'Дельфин',  en: 'Dolphin' }],
    ['deer',    'animal', { uz: 'Bugʻu',     ru: 'Олень',    en: 'Deer' }],
    ['cube',    'shape',  { uz: 'Kub',       ru: 'Куб',      en: 'Cube' }],
    ['orbit',   'shape',  { uz: 'Orbita',    ru: 'Орбита',   en: 'Orbit' }],
    ['spark',   'shape',  { uz: 'Uchqun',    ru: 'Искра',    en: 'Spark' }],
    ['spiral',  'shape',  { uz: 'Spiral',    ru: 'Спираль',  en: 'Spiral' }],
  ];

  /* SVG xavfsizlik tekshiruvi (IQ.validateItem darajasida va undan
     qatʼiyroq). Boʻsh massiv — toʻgʻri. Testlar va ehtiyot uchun ochiq. */
  const ALLOWED_TAGS = { svg: 1, g: 1, path: 1, circle: 1, ellipse: 1, rect: 1 };
  const SHAPES = /<(path|circle|ellipse|rect)\b/g;
  const MAX_BYTES = 1600;

  function validate(svg) {
    const errs = [];
    if (typeof svg !== 'string') return ['svg satr emas'];
    if (svg.indexOf('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"') !== 0) errs.push('boshlanishi yoki viewBox notoʻgʻri');
    if (!/<\/svg>$/.test(svg)) errs.push('</svg> bilan tugamaydi');
    let bytes = 0;
    for (let i = 0; i < svg.length; i++) bytes += svg.charCodeAt(i) < 128 ? 1 : 3;
    if (bytes > MAX_BYTES) errs.push('hajm ' + bytes + ' > ' + MAX_BYTES);
    if (/<script|\son\w+\s*=|<foreignObject|href\s*=|url\s*\(|style\s*=|<style|<image|<text|<a[\s>]|javascript:|<!|<\?/i.test(svg)) {
      errs.push('taqiqlangan element yoki atribut');
    }
    (svg.match(/<\/?([a-zA-Z][\w:-]*)/g) || []).forEach(t => {
      const name = t.replace(/^<\/?/, '');
      if (!ALLOWED_TAGS[name]) errs.push('ruxsat etilmagan teg: ' + name);
    });
    const colors = {};
    (svg.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|currentColor/g) || []).forEach(c => { colors[c.toUpperCase()] = 1; });
    (svg.match(/(?:fill|stroke)="([^"]*)"/g) || []).forEach(a => {
      const v = a.replace(/^[a-z]+="|"$/g, '');
      if (v !== 'none' && !/^#[0-9a-fA-F]{6}$/.test(v)) errs.push('rang qiymati: ' + v);
    });
    const set = Object.keys(colors).sort().join(',');
    if (set !== [INK, PAPER].sort().join(',')) errs.push('ranglar aynan ikkita boʻlishi kerak: ' + set);
    const shapes = (svg.match(SHAPES) || []).length;
    if (shapes < 1 || shapes > 6) errs.push('shakllar soni ' + shapes);
    return errs;
  }

  const svgSrc = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

  const list = META.map(m => Object.freeze({
    id: m[0], kind: m[1], name: Object.freeze(m[2]), svg: HEAD + BODY[m[0]] + TAIL,
  }));
  const byId = Object.create(null);
  list.forEach(a => { byId[a.id] = a; });

  root.IQ_AVATARS = Object.freeze({
    COLORS: Object.freeze([PAPER, INK]),
    ids: Object.freeze(list.map(a => a.id)),
    list: Object.freeze(list),
    has: id => typeof id === 'string' && !!byId[id],
    get: id => (typeof id === 'string' && byId[id]) || null,
    svg: id => (typeof id === 'string' && byId[id]) ? byId[id].svg : null,
    /* <img src> uchun tayyor data URI. Nomaʼlum id → null. */
    src: id => (typeof id === 'string' && byId[id]) ? svgSrc(byId[id].svg) : null,
    name: (id, lang) => {
      const a = typeof id === 'string' && byId[id];
      if (!a) return '';
      /* uz-cyrl uchun lotin manba qaytadi — kirillga UI (nzI18n) oʻgiradi. */
      return a.name[lang] || a.name.uz;
    },
    validate: validate,
  });
})(typeof window !== 'undefined' ? window : globalThis);
