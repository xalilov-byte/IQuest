/* ─────────────────────────────────────────────────────────────────────────
   TILLAR — oʻzbek (lotin) · oʻzbek (kirill) · rus

   MANBA TILI — oʻzbek lotin, ya'ni dizayn faylida yozilgani. Shuning
   uchun markup'da birorta matn kalitga almashtirilmadi: dizaynni ochgan
   odam hamon haqiqiy matnni koʻradi, `{{ t.homeTitle }}` emas.

   UCH TIL, IKKI XIL MEXANIZM:

   1. lotin → kirill: LUGʻAT KERAK EMAS. Ikkisi bir tilning ikki
      alifbosi, shuning uchun matn avtomatik oʻgiriladi
      (transliteratsiya). Bu yuzlab satrni qoʻlda tarjima qilishdan
      qutqaradi va yangi matn qoʻshilganda oʻzi ishlaydi.

   2. lotin → rus: HAQIQIY TARJIMA kerak. Lugʻat manba satrning
      OʻZI bilan kalitlanadi (`i18n-ru.js`). Tarjima topilmasa matn
      oʻzbekcha qoladi — buzilmaydi, shunchaki tarjimasiz koʻrinadi.

   NIMA OʻGIRILMAYDI: brend va texnik nomlar (Telegram, Click, Payme,
   Pro…), foydalanuvchi nomlari (@sardor_t), havolalar, bitta bosh
   harf (javob variantlari A–D va toifa "B" uchun).
   ───────────────────────────────────────────────────────────────────── */

(function () {
  const LANGS = ['uz', 'uz-cyrl', 'ru'];
  const STORE_KEY = 'nz-lang';

  /* Oʻgirilmaydigan tokenlar. Brendlar kirill matn ichida ham lotin
     boʻlib qoladi — bu odatiy amaliyot va tanilishni saqlaydi. */
  const KEEP = new Set([
    'Nazariy', 'Pro', 'Telegram', 'Stars', 'Click', 'Payme', 'Uzum',
    'UZCARD', 'HUMO', 'SMS', 'YHQ', 'DIF', 'DIS', 'NFD', 'Play', 'Market',
    'Android', 'App', 'Mini', 'Web', 'Bot', 'ID', 'CSV', 'km', 'm',
    'OO', 'YY', 'Wi', 'Fi',
  ]);

  /* Lotin → kirill. Uzun qoidalar oldin tekshiriladi (sh, ch, oʻ, gʻ,
     ya, yo, yu, ye, ts), aks holda "sh" s+h boʻlib "сҳ" chiqib ketadi. */
  const PAIRS = [
    ["SH", "Ш"], ["Sh", "Ш"], ["sh", "ш"],
    ["CH", "Ч"], ["Ch", "Ч"], ["ch", "ч"],
    ["TS", "Ц"], ["Ts", "Ц"], ["ts", "ц"],
    ["YA", "Я"], ["Ya", "Я"], ["ya", "я"],
    // "yoʻ" — "yo" DAN OLDIN: aks holda "yoʻl" → "ёʻл" boʻlib qoladi,
    // toʻgʻrisi esa "йўл" (y + oʻ, ya'ni й + ў).
    ["YOʻ", "ЙЎ"], ["Yoʻ", "Йў"], ["yoʻ", "йў"],
    ["YO'", "ЙЎ"], ["Yo'", "Йў"], ["yo'", "йў"],
    ["YO’", "ЙЎ"], ["Yo’", "Йў"], ["yo’", "йў"],
    ["YO", "Ё"], ["Yo", "Ё"], ["yo", "ё"],
    ["YU", "Ю"], ["Yu", "Ю"], ["yu", "ю"],
    ["YE", "Е"], ["Ye", "Е"], ["ye", "е"],
    // Oʻ va Gʻ — okina (ʻ) bilan; matnda turli apostroflar uchraydi.
    ["Oʻ", "Ў"], ["oʻ", "ў"], ["O'", "Ў"], ["o'", "ў"], ["O’", "Ў"], ["o’", "ў"],
    ["Gʻ", "Ғ"], ["gʻ", "ғ"], ["G'", "Ғ"], ["g'", "ғ"], ["G’", "Ғ"], ["g’", "ғ"],
    ["A", "А"], ["a", "а"], ["B", "Б"], ["b", "б"], ["D", "Д"], ["d", "д"],
    ["E", "Е"], ["e", "е"], ["F", "Ф"], ["f", "ф"], ["G", "Г"], ["g", "г"],
    ["H", "Ҳ"], ["h", "ҳ"], ["I", "И"], ["i", "и"], ["J", "Ж"], ["j", "ж"],
    ["K", "К"], ["k", "к"], ["L", "Л"], ["l", "л"], ["M", "М"], ["m", "м"],
    ["N", "Н"], ["n", "н"], ["O", "О"], ["o", "о"], ["P", "П"], ["p", "п"],
    ["Q", "Қ"], ["q", "қ"], ["R", "Р"], ["r", "р"], ["S", "С"], ["s", "с"],
    ["T", "Т"], ["t", "т"], ["U", "У"], ["u", "у"], ["V", "В"], ["v", "в"],
    ["W", "В"], ["w", "в"], ["X", "Х"], ["x", "х"], ["Y", "Й"], ["y", "й"],
    ["Z", "З"], ["z", "з"], ["C", "С"], ["c", "с"],
    // Tutuq belgisi
    ["ʼ", "ъ"], ["ʼ", "ъ"],
  ];

  const LETTER = /[A-Za-zʻʼ’']/;

  function translitWord(w) {
    let out = '';
    let i = 0;
    while (i < w.length) {
      // Soʻz boshidagi "e" kirillda "э" boʻladi: eng → энг, esa → эса.
      if (i === 0 && (w[0] === 'e' || w[0] === 'E') &&
          !(w.slice(0, 2) === 'ye' || w.slice(0, 2) === 'Ye')) {
        out += w[0] === 'E' ? 'Э' : 'э';
        i += 1;
        continue;
      }
      let hit = null;
      for (const [from, to] of PAIRS) {
        if (w.startsWith(from, i)) { hit = [from, to]; break; }
      }
      if (hit) { out += hit[1]; i += hit[0].length; }
      else { out += w[i]; i += 1; }
    }
    return out;
  }

  function transliterate(text) {
    if (!text) return text;
    // Havola yoki foydalanuvchi nomi boʻlsa butunlay tegilmaydi.
    if (/(^|\s)[@]/.test(text) || /https?:\/\/|t\.me|\.uz\b|\.com\b/.test(text)) {
      // Faqat havola/nom boʻlagi emas, butun satr saqlanadi — ichidagi
      // soʻzni oʻgirib, havolani buzib qoʻyish xavfidan koʻra shu yaxshi.
      return text;
    }
    let out = '';
    let i = 0;
    while (i < text.length) {
      if (LETTER.test(text[i])) {
        let j = i;
        while (j < text.length && LETTER.test(text[j])) j++;
        const word = text.slice(i, j);
        const bare = word.replace(/[ʻʼ’']/g, '');
        const keep = KEEP.has(word) || KEEP.has(bare) ||
                     (bare.length === 1 && bare === bare.toUpperCase());
        out += keep ? word : translitWord(word);
        i = j;
      } else {
        out += text[i];
        i++;
      }
    }
    return out;
  }

  /* ── Holat ─────────────────────────────────────────────────────────── */
  let lang = 'uz';

  function read() {
    try {
      const v = localStorage.getItem(STORE_KEY);
      return LANGS.indexOf(v) !== -1 ? v : null;
    } catch (e) { return null; }
  }
  function write(v) {
    try { localStorage.setItem(STORE_KEY, v); } catch (e) {}
  }

  function dict() {
    return (lang === 'ru' && window.nzRu) ? window.nzRu : null;
  }

  /* OʻGIRILMAYDIGAN QIYMATLAR.

     renderVals() faqat matn qaytarmaydi — ichida SVG chizma yoʻllari,
     CSS qiymatlari va identifikatorlar ham bor. Ularni oʻgirish ilovani
     buzadi: "M9 11l3 3" ning "l" buyrugʻi "л" boʻlsa, ikonka chizilmaydi
     (brauzer "Expected path command" deb xato beradi), "var(--gold)"
     esa rangni yoʻqotadi.

     Kalit nomiga emas, QIYMAT SHAKLIGA qarab ajratiladi — kalit nomlari
     ro'yxati vaqt oʻtib eskiradi va bittasini unutish oson. */
  const PATH_CHARS = /^[MmLlHhVvCcSsQqTtAaZz\d\s.,+-]+$/;

  function isSvgPath(str) {
    // Uzun, uchdan koʻp raqamli va FAQAT yoʻl buyruqlari harflaridan
    // iborat. Uzunlik sharti "10 m" kabi qisqa matnni himoya qiladi
    // ("m" ham yoʻl buyrugʻi harfi).
    const digits = str.match(/\d/g);
    return str.length >= 8 && digits !== null && digits.length >= 3 && PATH_CHARS.test(str);
  }

  function isCss(str) {
    return /^(var\(|--[a-z]|#[0-9a-fA-F]{3,8}$|rgba?\()/.test(str);
  }

  function skip(str) {
    return isCss(str) || isSvgPath(str);
  }

  /* Satrni joriy tilga oʻgiradi. Oʻzbek lotinda — hech narsa qilmaydi
     (nol xarajat). */
  function t(text) {
    if (typeof text !== 'string' || !text) return text;
    if (lang === 'uz') return text;
    if (skip(text)) return text;
    if (lang === 'uz-cyrl') return transliterate(text);
    const d = dict();
    if (d) {
      const hit = d[text];
      if (hit) return hit;
      // Boshi/oxiridagi boʻsh joy lugʻatda boʻlmasligi mumkin
      const trimmed = text.trim();
      if (trimmed !== text && d[trimmed]) {
        return text.replace(trimmed, d[trimmed]);
      }
    }
    return text;   // tarjima yoʻq — oʻzbekcha qoladi
  }

  window.nzI18n = {
    langs: LANGS,
    labels: { 'uz': 'Oʻzbek (lotin)', 'uz-cyrl': 'Ўзбек (кирилл)', 'ru': 'Русский' },
    get: function () { return lang; },
    set: function (v) {
      if (LANGS.indexOf(v) === -1) return lang;
      lang = v;
      write(v);
      /* <html data-lang="…"> — CSS uchun ilgak.

         Shrift uchun bu KERAK EMAS: sarlavhalar uslubi
         'Space Grotesk', Manrope, … tartibida yozilgan va brauzer
         kirill belgilarini Space Grotesk'da topmaganda oʻzi Manrope'ga
         oʻtadi (zaxira shrift har bir belgi uchun alohida tanlanadi).
         Atribut kelajakda tilga bogʻliq CSS kerak boʻlsa va sahifa
         tilini bildirish uchun qoldirildi. */
      try {
        document.documentElement.setAttribute('data-lang', v);
        document.documentElement.setAttribute('lang', v === 'ru' ? 'ru' : 'uz');
      } catch (e) {}
      return lang;
    },
    t: t,
    transliterate: transliterate,
    /* Obyektdagi barcha satr qiymatlarini oʻgiradi — renderVals()
       natijasi shu orqali oʻtadi. Funksiya, massiv va ichma-ich obyekt
       ham qamraladi; uslub obyektlari (style) tegilmaydi. */
    deep: function (v, key) {
      if (lang === 'uz') return v;
      if (typeof v === 'string') return t(v);
      if (Array.isArray(v)) return v.map(x => window.nzI18n.deep(x));
      if (v && typeof v === 'object') {
        // Uslub obyektlarini oʻgirish mantiqsiz va xatarli ("flex" →
        // "флех" CSS'ni buzadi), shuning uchun ular chetlab oʻtiladi.
        // "rowStyle", "badgeStyle" … va oddiy "style" (javob variantlari
        // uchun shunday nomlangan) — hammasi chetlab oʻtiladi.
        if (/style$/i.test(key || '')) return v;
        const out = {};
        for (const k in v) out[k] = window.nzI18n.deep(v[k], k);
        return out;
      }
      return v;
    },
  };

  /* Qisqa taxallus. Mantiqda satrlar qoʻshilib yasalganda
     ("3" + "/20 savol") butun natijani lugʻatdan topib boʻlmaydi —
     shuning uchun faqat MATN boʻlagi oʻgiriladi: n + "/20 " + nzT("savol").
     Shu qisqa nom oʻqilishini saqlaydi. */
  window.nzT = t;

  // Boshlangʻich til: saqlangani bor boʻlsa u, yoʻqsa oʻzbek lotin.
  window.nzI18n.set(read() || 'uz');
})();
