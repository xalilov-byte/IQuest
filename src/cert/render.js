/* ─────────────────────────────────────────────────────────────────────────
   src/cert/render.js — sertifikat tasviri (SVG, A4 gorizontal) va PNG

   Kim chaqiradi: ilovadagi "Sertifikat" tugmasi va saytdagi /sertifikat/
   sahifasi (UI), kerak bo'lsa server ham (SVG — oddiy satr, DOM kerak emas).
   Sertifikat MA'LUMOTINI bu fayl yaratmaydi: kod, ball va oraliq faqat
   server qayta hisoblagan natijadan keladi (CONTRACT §10). Bu yerda —
   faqat chizish.

   API:
     IQ.cert.render(data, lang) → SVG satr (viewBox 0 0 1123 794 — A4, 96 dpi)
       data = { name, score, lo, hi, date: 'YYYY-MM-DD…', code, url?, testN?, lang?, bg? }
       lang = 'uz' | 'ru' (bo'lmasa data.lang, u ham bo'lmasa 'uz')
       Xato ma'lumotda (ball yo'q, lo > score, kod bo'sh) — OTADI: sertifikatda
       "NaN" yoki bo'sh ball chiqqandan ko'ra baland xato yaxshi.
     IQ.cert.png(svg, scale = 2) → Promise<Blob>   (faqat brauzerda, canvas orqali)
     IQ.cert.W, IQ.cert.H — o'lcham; IQ.cert.SAFE — chetdan hoshiya (72 px ≈ 19 mm):
       fon ramkasi shu hoshiyaga sig'sa, matn/QR bilan ustma-ust tushmaydi

   MATN QOIDALARI (CONTRACT §6.7): "IQuest testi natijasi", ball DOIM oraliq
   bilan va "taxminiy"; "rasmiy", "klinik", Mensa, davlat ishorasi YO'Q.
   Test bu so'zlarni ikkala tilda qidiradi.

   XAVFSIZLIK: ism foydalanuvchidan keladi. U faqat matn tuguniga tushadi
   va XML-escape qilinadi; boshqaruv/bidi belgilari olib tashlanadi,
   uzunligi cheklanadi. SVG ilovada <img> orqali ko'rsatiladi (skript
   ishlamaydi), lekin kimdir bir kun uni innerHTML bilan qo'ysa ham,
   ismdan teg yoki atribut paydo bo'lmasligi kerak.
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const IQ = root.IQ = root.IQ || {};
  const CERT = IQ.cert = IQ.cert || {};

  const W = 1123, H = 794;
  /* Brend: #4C6FFF (tools/icon.html) atrofida ko'k → binafsha. Matn rangi
     SVG qoidalaridagi #1c1b29; kulrang #8a8799 dan biroz to'qroq — oq
     qog'ozda chop etilganda och kulrang o'qilmay qoladi. */
  const BRAND = '#4C6FFF', BRAND_LO = '#3552E0', VIOLET = '#7B5CFF', GOLD = '#FFB84D';
  const INK = '#1c1b29', GRAY = '#5f5c73';
  /* SVG <img> ichida sahifa shriftini (@font-face) ko'rmaydi: Manrope faqat
     o'rnatilgan bo'lsa chiqadi, bo'lmasa tizim shrifti. Hammasida kirill bor. */
  const FONT = "'Manrope', 'Segoe UI', Arial, sans-serif";
  const MONO = "Consolas, 'DejaVu Sans Mono', 'Courier New', monospace";

  /* Chetdan hoshiya: hamma matn va QR shu chegaradan ichkarida (fon rasmi
     ramkasi uchun kafolat; test Chromium'da o'lchab tekshiradi). */
  const SAFE = 72;
  const NAME_MAX = 60;           // belgi (kod nuqtasi) — undan uzuni "…" bilan kesiladi
  const NAME_FONT_MAX = 54, NAME_FONT_MIN = 24, NAME_WIDTH = 880;

  const T = {
    uz: {
      title: 'SERTIFIKAT',
      owner: 'Ushbu sertifikat egasi',
      score: 'IQuest testi natijasi: ',
      range: (lo, hi) => 'taxminiy oraliq ' + lo + '–' + hi,
      items: n => n + ' ta savol',
      date: 'SANA',
      code: 'SERTIFIKAT KODI',
      verify: 'Tekshirish: ',
      footer: 'IQuest.uz tomonidan berilgan onlayn test natijasi',
      svgTitle: 'IQuest sertifikati',
      months: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust',
        'sentabr', 'oktabr', 'noyabr', 'dekabr'],
      /* O'zbek adabiy shakli: "2026-yil 25-sentabr". */
      fmtDate: (y, m, d, M) => y + '-yil ' + d + '-' + M[m - 1],
    },
    ru: {
      title: 'СЕРТИФИКАТ',
      owner: 'Владелец сертификата',
      score: 'Результат теста IQuest: ',
      range: (lo, hi) => 'примерный диапазон ' + lo + '–' + hi,
      items: n => n + ' ' + ruPlural(n, 'вопрос', 'вопроса', 'вопросов'),
      date: 'ДАТА',
      code: 'КОД СЕРТИФИКАТА',
      verify: 'Проверка: ',
      footer: 'Результат онлайн-теста, выданный IQuest.uz',
      svgTitle: 'Сертификат IQuest',
      /* Sana ichida — qaratqich kelishigi: "25 сентября". */
      months: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа',
        'сентября', 'октября', 'ноября', 'декабря'],
      fmtDate: (y, m, d, M) => d + ' ' + M[m - 1] + ' ' + y + ' г.',
    },
  };
  function ruPlural(n, one, few, many) {
    const a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return one;
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
    return many;
  }

  /* ── Xavfsiz matn ─────────────────────────────────────────────────────
     "=" ham escape qilinadi: matnda "onload=" yoki "href=" ko'rinishi
     zararsiz bo'lsa ham, SVG'ni naqsh bilan tekshiradigan har qanday
     vosita (IQ.validateItem kabi) uni atribut deb biladi. &#61; ko'rinishda
     bir xil, lekin hech qachon atributga o'xshamaydi. */
  const esc = s => String(s).replace(/[&<>"'=]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '=': '&#61;' })[c]);

  /* Ismni tozalash:
     - C0/C1 boshqaruv belgilari (tab, yangi qator, NUL…) — XML 1.0 ularning
       ko'pini umuman taqiqlaydi: bitta \u0001 butun SVG'ni "buzuq rasm"ga
       aylantiradi;
     - bidi boshqaruvi (U+202A–202E, U+2066–2069, U+200E/F) — matnni ko'rinishda
       teskari aylantirib, boshqa ism ko'rsatish (spoofing) mumkin;
     - U+2028/2029, U+FEFF, U+FFFE/FFFF, yolg'iz surrogatlar — XML'da yaroqsiz
       yoki ko'rinmas;
     - bo'shliqlar bittaga, chetlari kesiladi; 60 kod nuqtasidan uzuni "…". */
  /* Diapazonlar son bilan yozilgan: manbada ko'rinmas belgi yoki U+2028
     (JS'da qator oxiri!) literal holda qolib ketmasin. */
  const BAD_RANGES = [[0x00, 0x1F], [0x7F, 0x9F], [0x200E, 0x200F], [0x202A, 0x202E], [0x2066, 0x2069],
    [0x2028, 0x2029], [0xFEFF, 0xFEFF], [0xFFFE, 0xFFFF]];
  const hex4 = n => '\\u' + ('000' + n.toString(16)).slice(-4);
  const BAD_CHARS = new RegExp('[' + BAD_RANGES.map(r => hex4(r[0]) + '-' + hex4(r[1])).join('') + ']', 'g');
  function dropLoneSurrogates(s) {
    let out = '';
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      if (c >= 0xD800 && c <= 0xDBFF) {
        const d = s.charCodeAt(i + 1);
        if (d >= 0xDC00 && d <= 0xDFFF) { out += s[i] + s[i + 1]; i++; }
      } else if (!(c >= 0xDC00 && c <= 0xDFFF)) out += s[i];
    }
    return out;
  }
  function cleanName(raw) {
    let s = dropLoneSurrogates(raw == null ? '' : String(raw));
    if (typeof s.normalize === 'function') s = s.normalize('NFC');
    s = s.replace(BAD_CHARS, ' ').replace(/\s+/g, ' ').trim();
    const cps = Array.from(s);
    if (cps.length > NAME_MAX) s = cps.slice(0, NAME_MAX - 1).join('').trim() + '…';
    return s;
  }

  /* ── Matn enini taxmin qilish ─────────────────────────────────────────
     SVG'da "max-width" yo'q va Node'da (serverda) shrift o'lchab bo'lmaydi.
     Shuning uchun Arial Bold o'lchamlariga (em) yaqin jadval + 8% zaxira
     (fitText): taxmin haqiqiydan KATTAROQ chiqishi kerak — kichikroq shrift
     xavfsiz, ramkadan chiqqan ism esa yo'q. Roboto (Android) Arial'dan
     torroq, Segoe UI ~5% kengroq — zaxira ikkalasini qoplaydi. Chromium'da
     yuzlab tasodifiy ism bilan o'lchab tekshirilgan (scratchpad/cert). */
  const NARROW = " iljIıt.,:;|!'ʻʼ‘’`()[]{}-/rfг";
  const WIDE = 'mwMWшщжюмыфШЩЖЮМЫФ@%';
  function charEm(ch) {
    const c = ch.codePointAt(0);
    if (NARROW.indexOf(ch) >= 0) return 0.32;
    if (WIDE.indexOf(ch) >= 0) return 0.93;
    if (c >= 0x41 && c <= 0x5A) return 0.72;                        // A–Z
    if (c >= 0x30 && c <= 0x39) return 0.56;                        // 0–9
    if (c >= 0x61 && c <= 0x7A) return 0.59;                        // a–z
    if (c >= 0x400 && c <= 0x42F || c >= 0x490 && c <= 0x4FF && c % 2 === 0) return 0.74;  // kirill bosh
    if (c >= 0x430 && c <= 0x4FF) return 0.61;                      // kirill kichik
    if (c < 0x250) return 0.66;                                     // lotin kengaytmasi (ö, ş, ç…)
    return 1.0;                                                     // boshqa yozuvlar, emoji
  }
  const textEm = s => Array.from(s).reduce((a, ch) => a + charEm(ch), 0);

  /* Ism uchun shrift: sig'guncha kichraytiriladi; eng kichigida ham sig'masa
     — oxiri "…" bilan kesiladi. Bold uchun 8% zaxira. */
  function fitText(s, maxW, fMax, fMin) {
    const em = textEm(s) * 1.08;
    if (em * fMax <= maxW) return { text: s, size: fMax };
    const size = Math.max(fMin, Math.floor(maxW / Math.max(em, 0.001)));
    if (em * size <= maxW) return { text: s, size };
    const cps = Array.from(s);
    while (cps.length > 1 && (textEm(cps.join('') + '…') * 1.08) * fMin > maxW) cps.pop();
    return { text: cps.join('').trim() + '…', size: fMin };
  }

  /* ── Maydonlar ─────────────────────────────────────────────────────── */
  function intField(v, name, min, max) {
    const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
    if (typeof n !== 'number' || !isFinite(n)) throw new Error('[cert] ' + name + ' son emas: ' + v);
    const r = Math.round(n);
    if (r < min || r > max) throw new Error('[cert] ' + name + ' ' + min + '..' + max + ' oralig\'ida emas: ' + v);
    return r;
  }

  /* Sana: faqat YYYY-MM-DD qismi olinadi, vaqt zonasi o'zgartirilmaydi —
     qaysi kun yozilishini server hal qiladi (Toshkent va UTC orasida kun
     farq qilishi mumkin). Yaroqsiz sana — qator chiqmaydi. */
  function fmtDate(iso, t) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    if (!m) return '';
    const y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return '';
    return t.fmtDate(y, mo, d, t.months);
  }

  /* Kod — server bergan (masalan IQ-7K3P-92XQ). Katta-kichik harf
     O'ZGARTIRILMAYDI: tekshirish sahifasi aynan shu satrni qidiradi. */
  const cleanCode = c => String(c == null ? '' : c).replace(/[^A-Za-z0-9-]/g, '').slice(0, 32);

  const VERIFY_BASE = 'https://iquest.uz/sertifikat/?kod=';
  /* QR ichiga faqat http(s) havola; boshqasi (javascript:, bo'sh joyli satr)
     bo'lsa — koddan qurilgan standart havola. */
  function cleanUrl(u, code) {
    const s = typeof u === 'string' ? u.trim() : '';
    if (/^https?:\/\/[^\s<>"'`\\]+$/i.test(s) && s.length <= 300) return s;
    return VERIFY_BASE + encodeURIComponent(code);
  }
  const displayUrl = u => u.replace(/^https?:\/\//i, '').replace(/^www\./i, '');

  /* Fon rasmi: faqat data:image (raster) URI. Tashqi manzil <img> ichida
     baribir yuklanmaydi, SVG fon esa o'z ichida havola/skript olib kelishi
     mumkin — shuning uchun svg+xml ham qabul qilinmaydi. */
  const BG_RE = /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/;
  const BG_MAX = 12 * 1024 * 1024;
  function cleanBg(bg) {
    if (typeof bg !== 'string') return '';
    const s = bg.replace(/\s+/g, '');
    return s.length <= BG_MAX && BG_RE.test(s) ? s : '';
  }

  /* ── Bezak ─────────────────────────────────────────────────────────── */
  const r2 = n => Math.round(n * 100) / 100;

  /* Brend belgisi: 3×3 matritsa, pastki o'ng katak oltin — "bo'sh katakni
     top" topshirig'i (ilova ikonkasi bilan bir oila). */
  function logoTile(x, y, s) {
    const cell = s * 0.2, gap = s * 0.08, pad = (s - 3 * cell - 2 * gap) / 2;
    let o = '<rect x="' + r2(x) + '" y="' + r2(y) + '" width="' + r2(s) + '" height="' + r2(s) +
      '" rx="' + r2(s * 0.23) + '" fill="url(#cg-brand)"/>';
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const last = i === 2 && j === 2;
      o += '<rect x="' + r2(x + pad + j * (cell + gap)) + '" y="' + r2(y + pad + i * (cell + gap)) +
        '" width="' + r2(cell) + '" height="' + r2(cell) + '" rx="' + r2(cell * 0.28) +
        '" fill="' + (last ? GOLD : '#ffffff') + '"' + (last ? '' : ' fill-opacity="0.85"') + '/>';
    }
    return o;
  }

  /* Yuqori o'ng burchakdagi xira 3×3 matritsa — belgining aks-sadosi. */
  function cornerMotif(x, y) {
    const c = 14, g = 8;
    let o = '<g>';
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const last = i === 2 && j === 2;
      o += '<rect x="' + (x + j * (c + g)) + '" y="' + (y + i * (c + g)) + '" width="' + c + '" height="' + c +
        '" rx="4" fill="' + (last ? GOLD : BRAND) + '" fill-opacity="' + (last ? '0.55' : '0.14') + '"/>';
    }
    return o + '</g>';
  }

  function vectorFrame() {
    return (
      /* Burchaklardagi yumshoq to'lqinlar — brend gradienti, juda xira
         (chop etishda siyoh sarfi kam, matn ustida xalaqit bermaydi). */
      '<path d="M0 0H430C330 40 250 120 205 230C160 330 90 390 0 410Z" fill="url(#cg-brand)" fill-opacity="0.07"/>' +
      '<path d="M0 0H260C190 30 140 90 110 160C80 230 45 265 0 280Z" fill="url(#cg-brand)" fill-opacity="0.08"/>' +
      '<path d="M1123 794H693C793 754 873 674 918 564C963 464 1033 404 1123 384Z" fill="url(#cg-brand)" fill-opacity="0.07"/>' +
      '<path d="M1123 794H863C933 764 983 704 1013 634C1043 564 1078 529 1123 514Z" fill="url(#cg-brand)" fill-opacity="0.08"/>' +
      cornerMotif(972, 80) +
      /* Ikki qavat ramka: tashqi — gradient, ichki — ingichka. */
      '<rect x="20" y="20" width="1083" height="754" rx="22" fill="none" stroke="url(#cg-brand)" stroke-width="7"/>' +
      '<rect x="36" y="36" width="1051" height="722" rx="12" fill="none" stroke="' + BRAND + '" stroke-opacity="0.35" stroke-width="1.2"/>' +
      [[36, 36], [1087, 36], [36, 758], [1087, 758]].map(p =>
        '<rect x="' + (p[0] - 6) + '" y="' + (p[1] - 6) + '" width="12" height="12" transform="rotate(45 ' + p[0] + ' ' + p[1] + ')" fill="url(#cg-brand)"/>'
      ).join('')
    );
  }

  /* ── Asosiy chizish ───────────────────────────────────────────────── */
  function render(data, lang) {
    const d = data || {};
    const L = (lang || d.lang) === 'ru' ? 'ru' : 'uz';
    const t = T[L];

    const score = intField(d.score, 'score', 0, 300);
    const lo = intField(d.lo, 'lo', 0, 300);
    const hi = intField(d.hi, 'hi', 0, 300);
    if (!(lo <= score && score <= hi)) throw new Error('[cert] oraliq noto\'g\'ri: ' + lo + ' ≤ ' + score + ' ≤ ' + hi + ' emas');
    const code = cleanCode(d.code);
    if (!code) throw new Error('[cert] kod yo\'q');
    let testN = null;
    if (d.testN !== undefined && d.testN !== null) testN = intField(d.testN, 'testN', 1, 1000);
    const url = cleanUrl(d.url, code);
    const bg = cleanBg(d.bg);
    const date = fmtDate(d.date, t);
    const nameClean = cleanName(d.name) || '—';
    const nm = fitText(nameClean, NAME_WIDTH, NAME_FONT_MAX, NAME_FONT_MIN);

    /* QR: M daraja — chop etilgan qog'oz bir oz dog'lansa ham o'qiladi,
       URL ~50 belgi v4 (33 modul) ga sig'adi. Modul o'lchami 0.5 ga
       yaxlitlanadi: 2× PNG'da butun pikselga tushadi, chegaralar aniq. */
    const q = CERT.qr(url, { ecc: 'M' });
    const QUIET = 4, QBOX = 164;
    const cell = Math.max(1.5, Math.min(4.5, Math.floor(QBOX / (q.size + 2 * QUIET) * 2) / 2));
    const qSide = (q.size + 2 * QUIET) * cell;
    const BOTTOM = 694;                          // QR va chap blok pastki chizig'i
    const qx = W - 96 - qSide, qy = BOTTOM - qSide;

    const verifyText = t.verify + displayUrl(url);
    const vf = fitText(verifyText, 560, 15, 10);
    const cx = W / 2;
    const txt = (x, y, size, body, extra) =>
      '<text x="' + r2(x) + '" y="' + r2(y) + '" font-size="' + size + '"' + (extra || '') + '>' + body + '</text>';

    let o = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '"' +
      ' font-family="' + esc(FONT) + '">' +
      '<title>' + esc(t.svgTitle + ': ' + nameClean) + '</title>' +
      '<defs>' +
      '<linearGradient id="cg-brand" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + BRAND + '"/><stop offset="0.55" stop-color="' + BRAND_LO + '"/><stop offset="1" stop-color="' + VIOLET + '"/>' +
      '</linearGradient>' +
      '<linearGradient id="cg-text" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="' + BRAND + '"/><stop offset="1" stop-color="' + VIOLET + '"/>' +
      '</linearGradient>' +
      '</defs>' +
      /* O'z oq foni — <img> ichida tungi tema ko'rinmaydi (CONTRACT §2). */
      '<rect width="' + W + '" height="' + H + '" fill="#ffffff"/>';

    if (bg) {
      /* Foydalanuvchi bergan ramka rasmi: butun varaqni qoplaydi (nisbati
         boshqa bo'lsa — markazdan kesiladi). Hamma matn va QR chetdan
         SAFE (72 px ≈ 19 mm) ichkarida, ya'ni ramka shu kenglikdagi
         hoshiyaga sig'sa, hech narsa ustma-ust tushmaydi. */
      o += '<image href="' + esc(bg) + '" x="0" y="0" width="' + W + '" height="' + H + '" preserveAspectRatio="xMidYMid slice"/>';
    } else {
      o += vectorFrame();
    }

    /* Sarlavha: belgi + "IQuest". Taxminiy en bo'yicha markazlanadi. */
    const brandSize = 30, tile = 42;
    const brandW = tile + 12 + textEm('IQuest') * brandSize;
    const bx = cx - brandW / 2;
    o += logoTile(bx, 80, tile);
    o += txt(bx + tile + 12, 112, brandSize, 'IQuest', ' font-weight="800" fill="' + INK + '"');

    /* "SERTIFIKAT": harf oralig'i oxirgi harfdan keyin ham qo'shiladi —
       markazni yarim oraliqqa suramiz. */
    o += txt(cx + 7, 198, 60, esc(t.title), ' text-anchor="middle" font-weight="800" letter-spacing="14" fill="url(#cg-text)"');
    o += '<path d="M' + (cx - 150) + ' 228H' + (cx - 16) + 'M' + (cx + 16) + ' 228H' + (cx + 150) + '" stroke="' + BRAND + '" stroke-opacity="0.45" stroke-width="1.5"/>' +
      '<rect x="' + (cx - 6) + '" y="222" width="12" height="12" transform="rotate(45 ' + cx + ' 228)" fill="' + GOLD + '"/>';

    o += txt(cx, 284, 20, esc(t.owner), ' text-anchor="middle" fill="' + GRAY + '" letter-spacing="0.5"');
    o += txt(cx, 350, nm.size, esc(nm.text), ' text-anchor="middle" font-weight="800" fill="' + INK + '"');
    /* Gradient userSpaceOnUse: balandligi 0 bo'lgan chiziqda objectBoundingBox
       gradienti umuman chizilmaydi (SVG qoidasi) — chiziq yo'qolib qolardi. */
    o += '<linearGradient id="cg-line" gradientUnits="userSpaceOnUse" x1="' + (cx - 300) + '" y1="0" x2="' + (cx + 300) + '" y2="0">' +
      '<stop offset="0" stop-color="' + BRAND + '" stop-opacity="0"/><stop offset="0.5" stop-color="' + BRAND + '" stop-opacity="0.6"/>' +
      '<stop offset="1" stop-color="' + VIOLET + '" stop-opacity="0"/></linearGradient>' +
      '<path d="M' + (cx - 300) + ' 374H' + (cx + 300) + '" stroke="url(#cg-line)" stroke-width="1.5"/>';

    /* Ball: yolg'iz raqam emas — pastida doim oraliq va "taxminiy" (§6.1). */
    o += txt(cx, 432, 26, esc(t.score) + '<tspan font-size="46" font-weight="800" fill="' + BRAND + '">' + score + '</tspan>',
      ' text-anchor="middle" fill="' + INK + '" font-weight="600"');
    const sub = t.range(lo, hi) + (testN ? ' · ' + t.items(testN) : '');
    o += txt(cx, 466, 19, esc(sub), ' text-anchor="middle" fill="' + GRAY + '"');

    /* Pastki chap: sana, kod, tekshirish havolasi — pastki chiziqqa
       tekislanadi (sana bo'lmasa blok shunchaki qisqaroq). */
    const lx = 104;
    o += txt(lx, BOTTOM - 4, vf.size, esc(vf.text), ' fill="' + BRAND_LO + '" font-weight="600"');
    o += txt(lx, BOTTOM - 42, 23, esc(code), ' fill="' + INK + '" font-weight="700" letter-spacing="1.5" font-family="' + esc(MONO) + '"');
    o += txt(lx, BOTTOM - 70, 13, esc(t.code), ' fill="' + GRAY + '" letter-spacing="2" font-weight="700"');
    if (date) {
      o += txt(lx, BOTTOM - 110, 22, esc(date), ' fill="' + INK + '" font-weight="700"');
      o += txt(lx, BOTTOM - 138, 13, esc(t.date), ' fill="' + GRAY + '" letter-spacing="2" font-weight="700"');
    }

    /* Pastki o'ng: QR, o'z oq jim zonasi bilan (fon rasmi ustida ham o'qilsin). */
    o += '<rect x="' + r2(qx - 1) + '" y="' + r2(qy - 1) + '" width="' + r2(qSide + 2) + '" height="' + r2(qSide + 2) +
      '" rx="10" fill="#ffffff" stroke="' + BRAND + '" stroke-opacity="0.3" stroke-width="1"/>';
    o += '<path fill="' + INK + '" shape-rendering="crispEdges" d="' + CERT.qrPath(q, qx + QUIET * cell, qy + QUIET * cell, cell) + '"/>';

    o += txt(cx, 716, 12.5, esc(t.footer), ' text-anchor="middle" fill="' + GRAY + '"');
    return o + '</svg>';
  }

  /* ── PNG (brauzer) ────────────────────────────────────────────────────
     SVG → <img> → canvas → Blob. Data URI (blob: emas) — ilova CSP'si
     rasmlar uchun data: ga ruxsat beradi (IQ.svgSrc ham shunday). Oq fon
     oldin to'ldiriladi: PNG shaffof bo'lib qolmasin. */
  function png(svg, scale) {
    const s = typeof scale === 'number' && scale > 0 && scale <= 4 ? scale : 2;
    return new Promise(function (resolve, reject) {
      if (typeof document === 'undefined' || typeof Image === 'undefined') {
        reject(new Error('[cert] png faqat brauzerda ishlaydi'));
        return;
      }
      const m = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
      const w = m ? +m[1] : W, h = m ? +m[2] : H;
      const img = new Image();
      img.onload = function () {
        try {
          const c = document.createElement('canvas');
          c.width = Math.round(w * s); c.height = Math.round(h * s);
          const g = c.getContext('2d');
          g.fillStyle = '#ffffff';
          g.fillRect(0, 0, c.width, c.height);
          g.drawImage(img, 0, 0, c.width, c.height);
          c.toBlob(function (b) { b ? resolve(b) : reject(new Error('[cert] toBlob bo\'sh qaytdi')); }, 'image/png');
        } catch (e) { reject(e); }
      };
      img.onerror = function () { reject(new Error('[cert] SVG rasm sifatida ochilmadi')); };
      img.src = IQ.svgSrc ? IQ.svgSrc(svg) : 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }

  CERT.render = render;
  CERT.png = png;
  CERT.W = W;
  CERT.H = H;
  CERT.SAFE = SAFE;
  /* Faqat testlar uchun. */
  CERT._render = { cleanName, cleanCode, cleanUrl, cleanBg, fmtDate: (iso, l) => fmtDate(iso, T[l === 'ru' ? 'ru' : 'uz']), textEm, fitText, esc, NAME_MAX };
})(typeof window !== 'undefined' ? window : globalThis);
