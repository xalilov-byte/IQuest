/* ─────────────────────────────────────────────────────────────────────────
   SAVOLLAR MANBASI — bazadan olish, qurilmada saqlash, offline ishlash

   ASOSIY QAROR: ilova bazaga BOGʻLIQ EMAS.

   APK ichida savollar toʻplami allaqachon bor (dizayn faylidagi QUESTIONS
   massivi). Bu qatlam uni ALMASHTIRADI — lekin faqat almashtirishga
   haqiqatan muvaffaq boʻlsa. Ya'ni:

     · internet yoʻq            → APK ichidagi toʻplam bilan ishlaydi
     · baza hali sozlanmagan    → APK ichidagi toʻplam bilan ishlaydi
     · baza javob bermadi       → oxirgi saqlangan nusxa, boʻlmasa APK'dagi
     · hammasi yaxshi           → bazadagi eng yangi savollar

   Shuning uchun bazani sozlash ilovani ishga tushirish uchun SHART EMAS —
   u faqat savollarni markazdan boshqarish imkonini beradi.

   NIMA UCHUN QURILMADA SAQLANADI: ilovaning asosiy kuchi offline ishlash.
   Bir marta yuklab olingan savollar keyin internetsiz ham ishlaydi.
   ───────────────────────────────────────────────────────────────────── */

(function () {
  const CACHE_KEY = 'nz-questions';
  /* Versiya oshirilsa saqlangan nusxa tashlab yuboriladi. 1 → 2: savolga
     `image` maydoni qo'shildi va variant soni 4 dan 2..5 ga o'tdi. Eski
     keshda rasm yo'q — u tozalanmasa, yangilangan ilova ham rasmsiz
     savollarni ko'rsatib turardi. */
  const CACHE_VERSION = 2;
  /* Bazadagi cheklov bilan bir xil (0004_bank.sql: 2..5). Harflar ham
     shuncha: A, B, C, D, E. */
  const MAX_OPTIONS = 5;
  const TIMEOUT_MS = 8000;
  /* Saqlangan nusxa shu muddatdan yosh boʻlsa, tarmoqqa UMUMAN
     chiqilmaydi. Sabab: savollar bazasi kuniga bir necha marta
     oʻzgarmaydi, ilova esa kuniga bir necha marta ochiladi. Har
     ochilishda soʻrov yuborish — behuda trafik va batareya, sekin
     internetda esa ilovaning birinchi soniyalarini ogʻirlashtiradi. */
  const FRESH_MS = 6 * 60 * 60 * 1000;   // 6 soat

  const cfg = window.nzSupabase || null;     // build.mjs joylashtiradi

  /* Holat — sozlamalar yoki diagnostika uchun:
       bundled — APK ichidagi toʻplam
       cache   — qurilmada saqlangan nusxa
       live    — bazadan hozir olingan
       error   — bazaga murojaat muvaffaqiyatsiz (toʻplam oʻzgarmadi) */
  let status = 'bundled';
  let raw = null;            // { rows, ru }  — bazadan kelgani

  function log(msg) {
    // Konsolga faqat muhim narsa: ishlab chiqishda foydali, foydalanuvchiga
    // koʻrinmaydi.
    try { console.info('[nzData] ' + msg); } catch (e) {}
  }

  /* ── Qurilmada saqlash ─────────────────────────────────────────────── */
  function readCache() {
    try {
      const s = localStorage.getItem(CACHE_KEY);
      if (!s) return null;
      const d = JSON.parse(s);
      if (!d || d.v !== CACHE_VERSION || !Array.isArray(d.rows)) return null;
      return d;
    } catch (e) { return null; }
  }

  function dropCache() {
    try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
  }

  /* ── Kelgan ma'lumot shakli ───────────────────────────────────────────
     Bazadan kelgan javob ham, saqlangan nusxa ham ISHONCHSIZ manba:
     birinchisini noto'g'ri deploy buzishi mumkin, ikkinchisini esa
     foydalanuvchi qo'lda tahrirlashi mumkin.

     Nima uchun bu shunchalik muhim: bir marta buzuq javob kelib kesh
     yozilsa, keyingi ochilishlarda kesh YANGI hisoblanadi va ilova
     tarmoqqa UMUMAN chiqmaydi. Ya'ni bitta noto'g'ri deploy o'sha
     oynada ilova ochgan har bir odamning kontent quvurini abadiy
     o'ldiradi — yagona chiqish Android sozlamalaridan ilova ma'lumotini
     tozalash, u esa butun progressni ham o'chiradi.

     Buzuq qatorlar tashlab yuboriladi, butun to'plam emas: bitta xato
     savol tufayli qolgan 599 tasidan voz kechish foydalanuvchiga
     yordam bermaydi. Lekin birorta ham yaroqli qator qolmasa — bu
     javob umuman ishlatilmaydi. */
  function sane(rows) {
    if (!Array.isArray(rows)) return null;
    const ok = rows.filter(r =>
      r && typeof r === 'object'
      && (typeof r.ref === 'string' || typeof r.id === 'string')
      && typeof r.text === 'string' && r.text.trim() !== ''
      /* Variant soni 2..5. Ilgari bu yerda "aynan 4" yozilgan edi va
         rasmiy avtotest to'plami kelganda 2 va 3 variantli savollarning
         hammasi jimgina tashlab yuborilardi — bank 301 tadan 50 taga
         tushib qolardi. Chegara MAX_OPTIONS bazadagi cheklov bilan bir
         xil (0004_bank.sql: array_length between 2 and 5). */
      && Array.isArray(r.options)
      && r.options.length >= 2 && r.options.length <= MAX_OPTIONS
      && r.options.every(o => typeof o === 'string' && o.trim() !== '')
      /* Kalit massiv uzunligiga bog'liq: 2 variantli savolda correct=3
         bo'sh javobni to'g'ri deb ko'rsatardi. */
      && typeof r.correct === 'number'
      && r.correct >= 0 && r.correct < r.options.length
    );
    if (!ok.length) return null;
    if (ok.length < rows.length) {
      log((rows.length - ok.length) + ' ta buzuq savol tashlab yuborildi');
    }
    return ok;
  }

  function writeCache(rows, ru) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        v: CACHE_VERSION, at: Date.now(), rows: rows, ru: ru || {},
      }));
    } catch (e) {
      // Joy yetmasa (localStorage ~5 MB) — saqlamaymiz, ilova baribir
      // ishlaydi, faqat keyingi ochilishda yana bazaga murojaat qiladi.
      log('saqlab boʻlmadi: ' + (e && e.name));
    }
  }

  /* ── Bazadan olish ─────────────────────────────────────────────────── */
  async function get(path) {
    const url = cfg.url + '/rest/v1/' + path;
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT_MS) : null;
    try {
      const res = await fetch(url, {
        headers: { apikey: cfg.publishableKey, Accept: 'application/json' },
        signal: ctrl ? ctrl.signal : undefined,
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function fetchAll() {
    // Savollar va rus tarjimalari — ikki soʻrov. Koʻrinish (view) FK
    // ma'lumotini saqlamaydi, shuning uchun ichma-ich select ishlamaydi.
    const rows = await get(
      'published_questions?select=id,ref,text,options,correct,explain,sign,image,topic_name,sort_order' +
      '&order=sort_order.asc,ref.asc');
    if (!Array.isArray(rows) || !rows.length) throw new Error('bazada nashr etilgan savol yoʻq');

    let ru = {};
    try {
      const tr = await get('question_translations?select=question_id,text,options,explain&lang=eq.ru');
      if (Array.isArray(tr)) tr.forEach(t => { ru[t.question_id] = t; });
    } catch (e) {
      // Tarjima olinmasa savollar baribir oʻzbekcha ishlaydi.
      log('rus tarjimalari olinmadi: ' + (e && e.message));
    }
    return { rows: rows, ru: ru };
  }

  /* ── Ilovaning savol bankini almashtirish ──────────────────────────── */
  /* QUESTIONS, ALL_INDICES va SIGN_INDICES dizayn faylida const, lekin
     massiv — ichidagini almashtirish mumkin. Shu yoʻl tanlangani uchun
     dizayn mantiqida birorta joy oʻzgartirilmadi: u qanday ishlagan
     boʻlsa, shundayligicha ishlaydi, faqat bank boshqa manbadan keladi. */
  function toItem(row, ru, lang) {
    let t = (lang === 'ru' && ru[row.id]) ? ru[row.id] : null;
    /* Tarjima qatori qisman bo'lishi mumkin (matn bor, variantlar yo'q —
       yoki teskarisi). Bo'sh matnli tarjima qo'llansa savol matni null
       bo'lib qoladi va ekran chizilmaydi. Shuning uchun tarjima faqat
       MATNI joyida bo'lsa ishlatiladi; variantlar esa pastda alohida
       tekshiriladi va kerak bo'lsa o'zbekchasi qoladi. */
    if (t && (typeof t.text !== 'string' || t.text.trim() === '')) t = null;
    return {
      /* ref — barqaror belgi. Foydalanuvchining saqlangan va xato
         savollari qurilmada SHU belgi bilan saqlanadi, massiv indeksi
         bilan emas: bank yangilanganda indekslar siljiydi, ref esa
         savolning oʻzi bilan qoladi. Bazada ref boʻsh boʻlishi mumkin
         (ustun nullable), shuning uchun zaxira sifatida uuid olinadi. */
      ref: row.ref || row.id,
      topic: row.topic_name,
      text: t ? t.text : row.text,
      /* Tarjima variantlari soni asl savolnikiga TENG bo'lishi shart.
         Kalit — o'rin raqami, matn esa boshqa massivda: sonlar mos
         kelmasa rus tilidagi foydalanuvchi boshqa javobni bosadi.
         Bazada buni trigger ham tekshiradi (0004_bank.sql), lekin
         klient bazaga ishonmaydi — kesh buzilgan bo'lishi mumkin. */
      options: (t && Array.isArray(t.options) && t.options.length === row.options.length)
        ? t.options : row.options,
      correct: row.correct,
      explain: t ? (t.explain || row.explain) : row.explain,
      sign: row.sign || undefined,
      /* Yo'l vaziyati rasmi (fayl nomi). Rasmsiz savol "qaysi avtomobil
         birinchi o'tadi?" degan javobsiz savolga aylanadi. */
      image: (typeof row.image === 'string' && row.image) ? row.image : undefined,
    };
  }

  let bundled = null;        // APK ichidagi asl to'plamning nusxasi

  function fill(items) {
    QUESTIONS.length = 0;
    items.forEach(x => QUESTIONS.push(x));

    ALL_INDICES.length = 0;
    QUESTIONS.forEach((_, i) => ALL_INDICES.push(i));

    SIGN_INDICES.length = 0;
    QUESTIONS.forEach((q, i) => { if (q.sign) SIGN_INDICES.push(i); });
  }

  function swap(items) {
    if (typeof QUESTIONS === 'undefined') return false;
    /* Asl to'plam almashtirishdan OLDIN saqlab qo'yiladi: almashtirish
       yarim yo'lda yiqilsa (QUESTIONS bo'shatilgan, lekin to'ldirilmagan)
       ilova savolsiz qolardi — bu bo'sh ekran demakdir. */
    if (!bundled) bundled = QUESTIONS.slice();
    if (!Array.isArray(items) || !items.length) return false;
    try {
      fill(items);
      return true;
    } catch (e) {
      log('bank almashtirilmadi: ' + (e && e.message) + ' — APK toʻplami qaytarildi');
      try { fill(bundled); } catch (e2) {}
      return false;
    }
  }

  window.nzData = {
    status: function () { return status; },
    count: function () { return (typeof QUESTIONS === 'undefined') ? 0 : QUESTIONS.length; },

    /* Joriy til uchun bankni qayta yigʻadi (til almashganda chaqiriladi).
       Bazadan maʼlumot kelmagan boʻlsa hech narsa qilmaydi — APK ichidagi
       toʻplam oʻz oʻrnida qoladi. */
    applyLang: function (lang) {
      if (!raw) return false;
      return swap(raw.rows.map(r => toItem(r, raw.ru, lang)));
    },

    /* Bazadan olib, bankni almashtiradi.
       onSwap — almashtirish amalga oshsa chaqiriladi (ekranni qayta
       chizish uchun). canSwap — hozir almashtirish xavfsizmi (test
       davomida bank oʻzgarsa, indekslar buziladi). */
    sync: async function (lang, canSwap, onSwap) {
      // 1) Avval saqlangan nusxa — darhol va tarmoqsiz.
      let cached = readCache();
      if (cached && canSwap()) {
        const rows = sane(cached.rows);
        if (!rows || !swap(rows.map(r => toItem(r, cached.ru || {}, lang)))) {
          /* Buzuq nusxani O'CHIRAMIZ. Aks holda u "yangi" bo'lib qolib
             ilovani tarmoqqa chiqishdan to'sardi va ilova o'zi tuzala
             olmasdi. O'chirilgach, quyidagi yangilik tekshiruvi ham
             o'tkazib yuborilmaydi — shuning uchun cached null qilinadi. */
          log('saqlangan nusxa yaroqsiz — oʻchirildi');
          dropCache();
          cached = null;
        } else {
          raw = { rows: rows, ru: cached.ru || {} };
          status = 'cache';
          log('saqlangan nusxadan ' + rows.length + ' savol');
          onSwap();
        }
      }

      // 2) Keyin bazadan — yangilanish bo'lsa oladi.
      if (!cfg || !cfg.url || !cfg.publishableKey) {
        log('baza sozlanmagan — APK ichidagi toʻplam ishlatiladi');
        return status;
      }
      if (cached && cached.at && (Date.now() - cached.at) < FRESH_MS) {
        log('saqlangan nusxa yangi — tarmoqqa chiqilmadi');
        return status;
      }
      try {
        const got = await fetchAll();
        /* Kesh faqat TEKSHIRUVDAN KEYIN yoziladi. Ilgari u so'rovdan
           keyin darhol yozilardi, ya'ni buzuq javob ham diskka tushib
           qolardi. */
        const rows = sane(got.rows);
        if (!rows) throw new Error('bazadan kelgan savollar shakli notoʻgʻri');
        got.rows = rows;
        writeCache(rows, got.ru);
        raw = got;
        if (canSwap()) {
          if (swap(rows.map(r => toItem(r, got.ru, lang)))) {
            status = 'live';
            log('bazadan ' + got.rows.length + ' savol');
            onSwap();
          }
        } else {
          // Test davom etyapti — yangi bank keyingi ochilishda qoʻllanadi
          // (saqlangan nusxa allaqachon yozildi).
          status = 'cache';
          log('test davom etyapti — yangilanish keyingi safar qoʻllanadi');
        }
      } catch (e) {
        if (status === 'bundled') status = 'error';
        log('bazaga ulanib boʻlmadi: ' + (e && e.message) + ' — mavjud toʻplam saqlanadi');
      }
      return status;
    },
  };
})();
