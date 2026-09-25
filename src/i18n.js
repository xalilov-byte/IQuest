/* ─────────────────────────────────────────────────────────────────────────
   TILLAR — oʻzbek (lotin) · oʻzbek (kirill) · rus · ingliz

   MANBA TILI — oʻzbek lotin, yaʼni dizayn faylida yozilgani. Shuning
   uchun markupʼda birorta matn kalitga almashtirilmadi: dizaynni ochgan
   odam hamon haqiqiy matnni koʻradi, `{{ t.homeTitle }}` emas.

   TOʻRT TIL, IKKI XIL MEXANIZM:

   1. lotin → kirill: LUGʻAT KERAK EMAS. Ikkisi bir tilning ikki
      alifbosi, shuning uchun matn avtomatik oʻgiriladi
      (transliteratsiya). Yangi matn qoʻshilganda oʻzi ishlaydi.

   2. lotin → rus / ingliz: HAQIQIY TARJIMA. Lugʻat manba satrning
      OʻZI bilan kalitlanadi (`i18n-ru.js` → window.nzRu,
      `i18n-en.js` → window.nzEn). Tarjima topilmasa matn oʻzbekcha
      qoladi (ARXITEKTURA §8.3) — hech qachon rus tiliga tushmaydi.

   KOʻPLIK (§8.1). Lugʻat qiymati satr YOKI koʻplik obyekti:
       ruscha   { one, few, many }        1 балл · 2 балла · 5 баллов
       inglizcha { one, other }           1 point · 5 points
   Son bilan yasaladigan matn uchun:
       nzTN("+{0} ball", 22)                          → "+22 балла"
       nzTN("{0} ligagacha {1} ball", k, [T(nom), nzI18n.num(k)])
       nzI18n.plural("savol turi", 4)                 → "типа вопросов" (qolip, toʻldirilmagan)
   Oddiy T()/t() koʻplik obyektini olsa «koʻp» shaklini qaytaradi
   (ru many, en other) — yiqilmaydi, lekin son bilan kelishmasligi
   mumkin, shuning uchun sonli matnda nzTN ishlatiladi.

   INGLIZ TILI DARVOZASI (§8.4). 'en' til roʻyxatida faqat build
   darvozasi ochiq boʻlsa chiqadi. Darvoza shu yoʻllardan biri bilan
   ochiladi (hammasi dangasa tekshiriladi):
     • window.nzLangs massivida 'en' bor (build bu fayldan OLDIN qoʻyadi,
       CONTRACT §1 skript tartibi) — asosiy yoʻl;
     • window.nzSite.langs massivida 'en' bor;
     • build `nzI18n.langs.push('en')` qiladi (massiv har doim bir xil);
     • nzI18n.enable('en') chaqiriladi (--lang-en, testlar).
   Hech biri boʻlmasa yoki window.nzEn yoʻq boʻlsa — ingliz tili YOʻQ:
   saqlangan 'en' tanlovi ham qurilma tiliga qaytadi (lekin oʻchirilmaydi,
   darvoza ochilgan buildʼda qaytib keladi).

   NIMA OʻGIRILMAYDI: brend va texnik nomlar (IQuest, IQ, Telegram…),
   foydalanuvchi nomlari (@iquest_uz), havolalar va e-pochtalar, litsenziya
   va atributsiya satrlari (CC BY 4.0, «… UI Kit»), til nomlari, bitta
   bosh harf (javob variantlari A–F), rim raqamlari (Olov II) va
   renderVals() dagi "xom" kalitlar (…Raw, …Src, …Url — pastda deep()).
   ───────────────────────────────────────────────────────────────────── */

(function () {
  const ALL = ['uz', 'uz-cyrl', 'ru', 'en'];
  const STORE_KEY = 'nz-lang';

  /* Til nomlari — har biri OʻZ yozuvida (§8.1). Ular hech qachon
     oʻgirilmaydi: kirill rejimida «English» → «Энглиш» boʻlib qolmasin. */
  const LABELS = { 'uz': 'Oʻzbekcha', 'uz-cyrl': 'Ўзбекча', 'ru': 'Русский', 'en': 'English' };
  const NAMES = new Set(Object.keys(LABELS).map(k => LABELS[k]));
  const HTML_LANG = { 'uz': 'uz', 'uz-cyrl': 'uz-Cyrl', 'ru': 'ru', 'en': 'en' };

  /* Oʻgirilmaydigan tokenlar. Brendlar kirill matn ichida ham lotin
     boʻlib qoladi — bu odatiy amaliyot va tanilishni saqlaydi. */
  const KEEP = new Set([
    'IQuest', 'IQ', 'Telegram', 'Play', 'Market', 'Google',
    'Android', 'App', 'Mini', 'Web', 'Bot', 'ID', 'CSV', 'SMS',
    'Wi', 'Fi', 'N', 'UI', 'PDF', 'QR', 'English',
  ]);
  const ROMAN = /^[IVX]{2,5}$/;          // Olov II, Olov III (nishon nomlari)

  /* Apostrof koʻrinishlari. Toʻgʻrisi: oʻ/gʻ uchun ʻ (U+02BB), tutuq
     uchun ʼ (U+02BC). Matnda (ayniqsa huquqiy sahifa va eski satrlarda)
     ' ’ ‘ ` ham uchraydi — hammasi oʻqiladi. */
  const APOS = ['ʻ', "'", '’', '‘', '`'];

  /* Lotin → kirill. Uzun qoidalar oldin tekshiriladi (sh, ch, oʻ, gʻ,
     ya, yo, yu, ye, ts), aks holda "sh" s+h boʻlib "сҳ" chiqib ketadi. */
  const PAIRS = [
    ["SH", "Ш"], ["Sh", "Ш"], ["sh", "ш"],
    ["CH", "Ч"], ["Ch", "Ч"], ["ch", "ч"],
    /* t + -siz / -simon — qoʻshimcha chegarasi, ц EMAS: Internetsiz →
       Интернетсиз, itsimon → итсимон. Oʻzlashma soʻzlar (-tsiya,
       matritsa, retsept) quyidagi "ts" → "ц" qoidasiga tushadi. */
    ["TSIZ", "ТСИЗ"], ["Tsiz", "Тсиз"], ["tsiz", "тсиз"],
    ["TSIMON", "ТСИМОН"], ["tsimon", "тсимон"],
    ["TS", "Ц"], ["Ts", "Ц"], ["ts", "ц"],
    ["YA", "Я"], ["Ya", "Я"], ["ya", "я"],
  ];
  // "yoʻ" — "yo" DAN OLDIN: aks holda "yoʻl" → "ёʻл", toʻgʻrisi "йўл".
  for (const a of APOS) PAIRS.push(["YO" + a, "ЙЎ"], ["Yo" + a, "Йў"], ["yo" + a, "йў"]);
  PAIRS.push(
    ["YO", "Ё"], ["Yo", "Ё"], ["yo", "ё"],
    ["YU", "Ю"], ["Yu", "Ю"], ["yu", "ю"],
    ["YE", "Е"], ["Ye", "Е"], ["ye", "е"]);
  for (const a of APOS) PAIRS.push(["O" + a, "Ў"], ["o" + a, "ў"], ["G" + a, "Ғ"], ["g" + a, "ғ"]);
  PAIRS.push(
    ["A", "А"], ["a", "а"], ["B", "Б"], ["b", "б"], ["D", "Д"], ["d", "д"],
    ["E", "Е"], ["e", "е"], ["F", "Ф"], ["f", "ф"], ["G", "Г"], ["g", "г"],
    ["H", "Ҳ"], ["h", "ҳ"], ["I", "И"], ["i", "и"], ["J", "Ж"], ["j", "ж"],
    ["K", "К"], ["k", "к"], ["L", "Л"], ["l", "л"], ["M", "М"], ["m", "м"],
    ["N", "Н"], ["n", "н"], ["O", "О"], ["o", "о"], ["P", "П"], ["p", "п"],
    ["Q", "Қ"], ["q", "қ"], ["R", "Р"], ["r", "р"], ["S", "С"], ["s", "с"],
    ["T", "Т"], ["t", "т"], ["U", "У"], ["u", "у"], ["V", "В"], ["v", "в"],
    ["W", "В"], ["w", "в"], ["X", "Х"], ["x", "х"], ["Y", "Й"], ["y", "й"],
    ["Z", "З"], ["z", "з"], ["C", "С"], ["c", "с"]);
  // Tutuq belgisi (U+02BC) — har doim ъ (katta harflar orasida Ъ),
  // translitCore ichida.

  const LETTER = /[A-Za-zʻʼ’'‘`]/;
  const APOS_RX = /[ʻʼ’'‘`]/;
  const ASCII_LETTER = /[A-Za-z]/;
  const QUOTE = /['‘’`]/;               // soʻz chetida — qoʻshtirnoq

  /* t bilan tugaydigan fe'l oʻzagi + -sa/-sin (shart va buyruq mayli):
     ketsa → кетса, aytsin → айтсин (ц emas). Faqat BUTUN soʻz shu
     shaklda boʻlsa ishlaydi — "sotsial" (социал) tegilmaydi. */
  const T_STEM = /^(ket|ayt|qayt|yet|oʻt|tut|sot|yot|bit|yut|kut|tort|eshit|koʻrsat|oʻrgat|yarat|tugat|boshlat|ishlat)(s(?:a|in)[a-zʻ]*)$/i;

  function isVowelAt(w, i) {
    // oʻzbek unlisi: a, o, u (e va i emas — "reestr", "ideal" ruscha
    // oʻzlashmalarda е qoladi) yoki oʻ.
    const c = w[i];
    if (c === undefined) return false;
    if (/[aouAOU]/.test(c)) return true;
    return APOS_RX.test(c) && c !== 'ʼ' && /[oO]/.test(w[i - 1] || '');
  }

  function isUpper(c) { return !!c && c !== c.toLowerCase(); }

  function translitWord(w) {
    // Oʻzbek fe'li + -sa/-sin: ts → тс (yuqoridagi T_STEM izohi).
    const norm = w.replace(/[ʻ'’‘`]/g, 'ʻ');
    const stem = T_STEM.exec(norm);
    if (stem) {
      const cut = stem[1].length;
      // Oʻzak asl yozuvda necha belgi — apostrof varianti ham 1 belgi.
      return translitCore(w.slice(0, cut)) + translitCore(w.slice(cut));
    }
    return translitCore(w);
  }

  function translitCore(w) {
    let out = '';
    let i = 0;
    while (i < w.length) {
      const c = w[i];
      /* e → э: soʻz boshida (eng → энг) va unlidan keyin (aeroport →
         аэропорт, poeziya → поэзия). Lotin yozuvida unlidan keyingi
         "йе" tovushi "ye" deb yoziladi, shuning uchun unlidan keyingi
         yolgʻiz "e" doim э. */
      if ((c === 'e' || c === 'E') && (i === 0 || isVowelAt(w, i - 1))) {
        out += c === 'E' ? 'Э' : 'э';
        i += 1;
        continue;
      }
      let hit = null;
      for (const p of PAIRS) {
        if (w.startsWith(p[0], i)) { hit = p; break; }
      }
      if (hit) { out += hit[1]; i += hit[0].length; continue; }
      /* ' ’ ‘ ` ʻ ikki harf ORASIDA (oʻ/gʻ/yoʻ juftlari allaqachon
         olingan) — bu tutuq: eʼtibor, maʼlumot → эътибор, маълумот.
         Soʻz chetidagi apostrof qoʻshtirnoq yoki qoʻshimcha belgisi —
         u tegilmaydi. */
      if (c === 'ʼ' || APOS_RX.test(c) && i > 0 && i < w.length - 1 &&
          ASCII_LETTER.test(w[i - 1]) && ASCII_LETTER.test(w[i + 1])) {
        out += (isUpper(w[i - 1]) && (i + 1 >= w.length || isUpper(w[i + 1]))) ? 'Ъ' : 'ъ';
        i += 1;
        continue;
      }
      out += c;
      i += 1;
    }
    return out;
  }

  function keepWord(word) {
    const bare = word.replace(/[ʻʼ’'‘`]/g, '');
    // Bitta bosh harf — javob varianti (A–F), lekin «U» olmoshi (U haqida)
    // oʻzbekcha soʻz: У.
    return KEEP.has(word) || KEEP.has(bare) || ROMAN.test(word) ||
           (bare.length === 1 && bare === bare.toUpperCase() && bare !== 'U');
  }

  function translitToken(word) {
    // 'Boshlash' / ‘Boshlash’ — qoʻshtirnoq ichidagi soʻz: chetidagi
    // belgilar qoʻshtirnoq, ular gʻ/ъ ga aylanmaydi ("'Tanlang'" →
    // "'Танланг'", "Танланғ" emas).
    let lead = '', tail = '';
    while (word.length > 1 && QUOTE.test(word[0])) { lead += word[0]; word = word.slice(1); }
    if (lead) {
      while (word.length > 1 && QUOTE.test(word[word.length - 1])) {
        tail = word[word.length - 1] + tail; word = word.slice(0, -1);
      }
    }
    if (keepWord(word)) return lead + word + tail;
    // IQuest’ga, IQʼingiz — brend oʻzgarmaydi, qoʻshimchasi oʻgiriladi.
    const m = /^([A-Za-z]+)([ʻʼ’'‘`])([A-Za-z].*)$/.exec(word);
    if (m && KEEP.has(m[1])) return lead + m[1] + m[2] + translitWord(m[3]) + tail;
    return lead + translitWord(word) + tail;
  }

  function translitRun(text) {
    let out = '';
    let i = 0;
    while (i < text.length) {
      if (LETTER.test(text[i])) {
        let j = i;
        while (j < text.length && LETTER.test(text[j])) j++;
        out += translitToken(text.slice(i, j));
        i = j;
      } else {
        out += text[i];
        i++;
      }
    }
    return out;
  }

  /* Havola, domen, e-pochta yoki foydalanuvchi nomi — shu BOʻLAK (boʻsh
     joygacha) oʻgirilmaydi, qolgan matn esa oʻgiriladi. */
  const URLISH = /^[(«"']*@|https?:\/\/|mailto:|www\.|t\.me\/|[\w.+-]+@[\w-]+\.|\.(uz|com|org|net|ru|io|app|dev)\b/i;

  /* Litsenziya va atributsiya — IBORA darajasida himoya (translitRun faqat
     soʻz koʻradi). Litsenziya talabi: asar nomi va litsenziya nomi asl
     holida koʻrinishi shart («Гаме Манагемент App УИ Кит (СС БЙ 4.0)»
     emas). Yangi atributsiya qoʻshilsa — shu yerga. UI tomonida eng
     yaxshisi …Raw kalit (renderVals → deep() uni umuman tegmaydi). */
  const PROTECT = new RegExp([
    '(?:[A-Z][A-Za-z0-9]*[ \\t]+){0,6}UI[ \\t]+Kit\\b',          // "Game Management App UI Kit"
    '\\bCC[ -]BY(?:[ -](?:SA|NC|ND))*(?:[ \\t]+\\d\\.\\d)?',      // CC BY 4.0, CC BY-SA 4.0
    '\\bCC0\\b',
    '\\bSIL[ \\t]+Open[ \\t]+Font[ \\t]+License(?:[ \\t]+\\d\\.\\d)?',
    '\\bOFL(?:-\\d\\.\\d)?\\b',
    '\\b(?:MIT|Apache|BSD|ISC)[ \\t]+License(?:[ \\t]+\\d\\.\\d)?',
    '\\bSpace[ \\t]+Grotesk\\b', '\\bManrope\\b', '\\bFontsource\\b',
    '©[^·•\\n]*',
  ].join('|'), 'g');

  function translitPlain(text) {
    if (!text) return text;
    if (/\s/.test(text) || URLISH.test(text)) {
      return text.split(/(\s+)/).map(tok =>
        (!tok || /^\s+$/.test(tok) || URLISH.test(tok)) ? tok : translitRun(tok)).join('');
    }
    return translitRun(text);
  }

  function transliterate(text) {
    if (!text || typeof text !== 'string') return text;
    let out = '', last = 0, m;
    PROTECT.lastIndex = 0;
    while ((m = PROTECT.exec(text)) !== null) {
      if (m[0] === '') { PROTECT.lastIndex++; continue; }
      out += translitPlain(text.slice(last, m.index)) + m[0];
      last = m.index + m[0].length;
    }
    return out + translitPlain(text.slice(last));
  }

  /* ── Koʻplik ──────────────────────────────────────────────────────── */
  const PR = {};
  function pluralRule(L) {
    const loc = L === 'ru' ? 'ru' : 'en';
    if (!(loc in PR)) {
      try { PR[loc] = new Intl.PluralRules(loc); } catch (e) { PR[loc] = null; }
    }
    return PR[loc];
  }
  /* Qoʻlda zaxira (Intl yoʻq eski WebView uchun) — CLDR bilan bir xil. */
  function manualCategory(L, n) {
    if (L === 'ru') {
      if (n % 1 !== 0) return 'other';
      const a = n % 10, b = n % 100;
      if (a === 1 && b !== 11) return 'one';
      if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return 'few';
      return 'many';
    }
    return n === 1 ? 'one' : 'other';
  }
  function category(L, n) {
    const x = Math.abs(Number(n));
    if (!isFinite(x)) return L === 'ru' ? 'many' : 'other';
    const r = pluralRule(L);
    return r ? r.select(x) : manualCategory(L, x);
  }
  const ORDER = {
    ru: { one: ['one', 'many', 'other'], few: ['few', 'many', 'other'], many: ['many', 'other', 'few'],
          other: ['other', 'many', 'few'] },
    en: { one: ['one', 'other'], other: ['other', 'many', 'one'] },
  };
  /* Koʻplik obyektidan shakl. n yoʻq (oddiy t()) → «koʻp» shakli. */
  function form(obj, L, n) {
    const cat = n == null ? (L === 'ru' ? 'many' : 'other') : category(L, n);
    const chain = (ORDER[L === 'ru' ? 'ru' : 'en'][cat]) || [cat];
    for (const k of chain) if (typeof obj[k] === 'string') return obj[k];
    for (const k in obj) if (typeof obj[k] === 'string') return obj[k];
    return '';
  }

  /* Raqam — hamma tilda bir xil: «1 200» (boʻlinmas boʻsh joy, qator
     raqam oʻrtasida uzilmaydi). */
  function num(n) {
    const v = Math.round(Number(n) || 0);
    const s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return v < 0 ? '-' + s : s;
  }

  function fill(tpl, vals) {
    return String(tpl).replace(/\{(\d+)\}/g, (m, i) => (i in vals && vals[i] != null) ? String(vals[i]) : m);
  }

  /* ── Holat va darvoza ─────────────────────────────────────────────── */
  const LIVE = ['uz', 'uz-cyrl', 'ru'];   // nzI18n.langs — har doim SHU massiv
  let ownEn = false;                       // 'en' ni sync() qoʻshganmi
  let forced = false;                      // nzI18n.enable('en')

  function hasEn() {
    const d = window.nzEn;
    return !!d && typeof d === 'object' && Object.keys(d).length > 0;
  }
  function siteSaysEn() {
    const has = a => Array.isArray(a) && a.indexOf('en') !== -1;
    const s = window.nzSite;
    return has(window.nzLangs) || !!(s && has(s.langs));
  }
  function sync() {
    const i = LIVE.indexOf('en');
    const want = hasEn() && (forced || siteSaysEn());
    if (want && i === -1) { LIVE.push('en'); ownEn = true; }
    else if (!want && i !== -1 && ownEn) { LIVE.splice(i, 1); ownEn = false; }
    return LIVE;
  }
  function available(v) {
    sync();
    return LIVE.indexOf(v) !== -1 && ALL.indexOf(v) !== -1 && (v !== 'en' || hasEn());
  }

  /* Qurilma tili (§4.3, 0-qadam): ru* → ru, en* → en (darvoza ochiq
     boʻlsa), uz-Cyrl* → uz-cyrl, qolgani → uz. */
  function detect() {
    let raw = '';
    try { raw = String((typeof navigator !== 'undefined' && navigator.language) || ''); } catch (e) {}
    const l = raw.toLowerCase().replace(/_/g, '-');
    if (/^uz-cyrl/.test(l)) return 'uz-cyrl';
    if (/^ru(\b|-)/.test(l) || l === 'ru') return 'ru';
    if (/^en(\b|-)/.test(l) && available('en')) return 'en';
    return 'uz';
  }

  function read() {
    try {
      const v = localStorage.getItem(STORE_KEY);
      return ALL.indexOf(v) !== -1 ? v : null;
    } catch (e) { return null; }
  }
  function write(v) {
    try { localStorage.setItem(STORE_KEY, v); } catch (e) {}
  }

  let lang = 'uz';

  function applyDom(v) {
    /* <html data-lang="…" lang="…"> — CSS ilgagi va ekran oʻqiruvchi
       uchun. Shrift uchun kerak emas: brauzer kirill belgilarini Space
       Grotesk'da topmasa oʻzi Manrope'ga oʻtadi. */
    try {
      document.documentElement.setAttribute('data-lang', v);
      document.documentElement.setAttribute('lang', HTML_LANG[v] || 'uz');
    } catch (e) {}
  }

  /* Joriy til. Saqlangan 'en' darvoza yopiq boʻlsa qurilma tiliga
     qaytadi (yozilmaydi — keyingi buildʼda tanlov qaytib keladi). */
  function cur() {
    if (lang === 'en' && !available('en')) { lang = detect(); applyDom(lang); }
    return lang;
  }

  function dict(L) {
    if (L === 'ru') return window.nzRu || null;
    if (L === 'en') return window.nzEn || null;
    return null;
  }

  function lookup(d, text) {
    if (Object.prototype.hasOwnProperty.call(d, text)) return { v: d[text], key: text };
    const trimmed = text.trim();
    if (trimmed !== text && Object.prototype.hasOwnProperty.call(d, trimmed)) return { v: d[trimmed], key: trimmed };
    return null;
  }

  /* OʻGIRILMAYDIGAN QIYMATLAR.

     renderVals() faqat matn qaytarmaydi — ichida SVG chizma yoʻllari,
     CSS qiymatlari va identifikatorlar ham bor. Ularni oʻgirish ilovani
     buzadi: "M9 11l3 3" ning "l" buyrugʻi "л" boʻlsa, ikonka chizilmaydi,
     "var(--gold)" esa rangni yoʻqotadi. Kalit nomiga emas, QIYMAT
     SHAKLIGA qarab ajratiladi. */
  const PATH_CHARS = /^[MmLlHhVvCcSsQqTtAaZz\d\s.,+-]+$/;
  function isSvgPath(str) {
    const digits = str.match(/\d/g);
    return str.length >= 8 && digits !== null && digits.length >= 3 && PATH_CHARS.test(str);
  }
  function isCss(str) {
    return /^(var\(|--[a-z]|#[0-9a-fA-F]{3,8}$|rgba?\()/.test(str);
  }
  function isDataUri(str) { return str.slice(0, 5) === 'data:'; }
  function skip(str) {
    return isCss(str) || isDataUri(str) || isSvgPath(str) || NAMES.has(str);
  }

  /* KALIT boʻyicha chetlab oʻtiladigan qiymatlar (deep() uchun) — har
     qanday turdagi qiymat (satr, massiv, obyekt) butunligicha tegilmaydi:
       …Raw  — tilga bogʻliq boʻlmagan yoki FOYDALANUVCHI matni (nom,
               bio, variant harfi "A", HUD qiymati "12/24") — §8.1:
               hech qachon tarjima ham, transliteratsiya ham qilinmaydi;
       …Src  — rasm manbasi; …Url — havola;
       path1, path2 — SVG yoʻli;
       theme, …Current, …pressed — atribut qiymatlari (data-theme="dark"
               kirillda "дарк" boʻlib, tungi tema yoqilmay qolardi). */
  const RAW_KEY = /(Raw|Src|Url|Current|[Pp]ressed)$|^path\d$|^theme$/;

  /* Satrni joriy tilga oʻgiradi. Oʻzbek lotinda — hech narsa qilmaydi. */
  function t(text) {
    if (typeof text !== 'string' || !text) return text;
    const L = cur();
    if (L === 'uz') return text;
    if (skip(text)) return text;
    if (L === 'uz-cyrl') return transliterate(text);
    const d = dict(L);
    if (d) {
      const hit = lookup(d, text);
      if (hit && hit.v) {
        const v = typeof hit.v === 'string' ? hit.v : form(hit.v, L, null);
        return hit.key === text ? v : text.replace(hit.key, v);
      }
    }
    return text;   // tarjima yoʻq — oʻzbekcha qoladi (§8.3)
  }

  /* Son uchun toʻgʻri shakldagi QOLIP ({0} toʻldirilmagan). */
  function plural(tpl, n) {
    if (typeof tpl !== 'string' || !tpl) return tpl;
    const L = cur();
    if (L === 'uz') return tpl;
    if (L === 'uz-cyrl') return transliterate(tpl);
    const d = dict(L);
    const hit = d && lookup(d, tpl);
    if (!hit || !hit.v) return tpl;
    const v = typeof hit.v === 'string' ? hit.v : form(hit.v, L, n);
    return hit.key === tpl ? v : tpl.replace(hit.key, v);
  }

  /* Qolip + son → tayyor satr. args berilmasa {0} = num(n); berilsa
     {i} = args[i] (qiymatlar TAYYOR matn: kerak boʻlsa T() dan oʻtkazing). */
  function tn(tpl, n, args) {
    const vals = Array.isArray(args) ? args
      : (arguments.length > 2 ? Array.prototype.slice.call(arguments, 2) : [num(n)]);
    return fill(plural(tpl, n), vals);
  }

  const api = {
    labels: LABELS,
    all: ALL.slice(),
    get: cur,
    set: function (v) {
      if (!available(v)) return cur();
      lang = v;
      write(v);
      applyDom(v);
      return lang;
    },
    detect: detect,
    available: available,
    /* Darvozani majburan ochish: build --lang-en yoki testlar. */
    enable: function (v) { if (v === 'en') { forced = true; sync(); } return LIVE; },
    t: t,
    plural: plural,
    tn: tn,
    num: num,
    category: function (n, L) { return category(L || cur(), n); },
    transliterate: transliterate,
    /* Obyektdagi barcha satr qiymatlarini oʻgiradi — renderVals()
       natijasi shu orqali oʻtadi. Uslub obyektlari (…style) va xom
       kalitlar (RAW_KEY) tegilmaydi. */
    deep: function deep(v, key) {
      if (cur() === 'uz') return v;
      if (key && RAW_KEY.test(key)) return v;
      if (typeof v === 'string') return t(v);
      if (Array.isArray(v)) return v.map(x => deep(x));
      if (v && typeof v === 'object') {
        if (/style$/i.test(key || '')) return v;
        const out = {};
        for (const k in v) out[k] = deep(v[k], k);
        return out;
      }
      return v;
    },
  };
  // langs — jonli massiv: darvoza holati har oʻqilganda yangilanadi.
  Object.defineProperty(api, 'langs', { enumerable: true, get: sync });
  window.nzI18n = api;

  /* Qisqa taxalluslar. Satrlar qoʻshib yasalganda ("3" + "/20 savol")
     butun natijani lugʻatdan topib boʻlmaydi — faqat MATN boʻlagi
     oʻgiriladi: nzT("savol"). Son bilan: nzTN("{0} ta savol", n). */
  window.nzT = t;
  window.nzTN = tn;

  // Boshlangʻich til: saqlangani, yoʻqsa qurilma tili (§4.3). Ishga
  // tushishda YOZILMAYDI — foydalanuvchi tanlamaguncha qurilmaga ergashadi.
  const init = read() || detect();
  lang = (init === 'en' && !hasEn()) ? 'uz' : init;
  applyDom(lang);
})();
