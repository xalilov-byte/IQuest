/* ─────────────────────────────────────────────────────────────────────────
   IQ.verbal — og'zaki mantiq (o'xshatish, ortiqchasini topish, guruh,
   munosabat)

   Bu generator savol O'YLAB TOPMAYDI: savollar qo'lda yozilgan va odam
   tekshiradigan kontentdan olinadi — content/verbal.json. Build uni
   bundle'ga `window.IQ_VERBAL = {…}` sifatida qo'yadi. Ma'lumot bo'lmasa
   (fayl yo'q yoki buzuq) tur ro'yxatdan O'TMAYDI — ilova qolgan turlar
   bilan ishlayveradi.

   NEGA QO'LDA: og'zaki savolda bir ma'nolilikni kod bilan kafolatlab
   bo'lmaydi. "Qush : uya = asalari : ?" kabi savolda ikkinchi himoya
   qilsa bo'ladigan javob bor-yo'qligini faqat odam ko'radi. Shuning uchun
   har yozuvda `reviewed` bayrog'i bor va izohda (explain) nega aynan shu
   javob, eng ishonarli distraktor esa nega xato ekani yoziladi.

   Urug' nima qiladi:
     · darajadagi yozuvlardan birini tanlaydi (IQ.rng — deterministik);
     · variantlar tartibini aralashtiradi. JSON'da to'g'ri javob qayerda
       turgani ahamiyatsiz: foydalanuvchi ko'radigan o'rin urug'ga bog'liq
       va tekis taqsimlangan (shartnoma §2, 3-band). uz, ru va en variantlar
       BITTA perm bilan aralashtiriladi — til almashtirilganda javob o'rni
       o'zgarmaydi.

   Tillar (shartnoma §2, ARXITEKTURA §8): `en` — ixtiyoriy. Yozuvning `en`
   qismi buzuq bo'lsa (variantlar soni boshqa, bo'sh satr) u ishlatilmaydi,
   yozuv esa uz/ru bilan qoladi — hovuz TILGA BOG'LIQ EMAS (aks holda bir
   xil `verbal:level:seed` turli tilda turli savol bo'lardi). `langs` ga
   'en' faqat HAMMA yozuvda to'g'ri `en` bo'lsa qo'shiladi ("hammasi yoki
   hech narsa", §8.4).

   "Ortiqchasini top" savolida stimul variantlar ro'yxati EMAS (u ekranda
   ikki marta chiqardi): JSON'dagi qisqa qoida jumlasi ("Toʻrttasining
   umumiy belgisi bor.") — hamma turdagi kabi stimul JSON'dan olinadi.

   Darajada yozuv bo'lmasa — eng yaqin darajadagisi olinadi (teng bo'lsa
   pastrog'i). Bunda b yozuvning haqiqiy darajasiga qarab ±0.75 ichida
   suriladi — savol so'ralganidan osonroq bo'lsa, ball ham shuni biladi.

   Savolga qo'shimcha `key` maydoni qo'shiladi (masalan "v017") — test va
   tahlil savol qaysi yozuvdan chiqqanini bilishi uchun. validateItem
   ortiqcha maydonga qaramaydi.

   DIQQAT (server qayta tekshiruvi, §10): `verbal:${level}:${seed}` qaysi
   yozuvga tushishi darajadagi yozuvlar ro'yxatiga bog'liq. Yozuv qo'shish,
   o'chirish yoki darajasini o'zgartirish eski urug'larni boshqa savolga
   olib boradi — kontent o'zgarsa `engine` versiyasi ham o'zgarishi kerak.

   To'liq shartnoma: src/iq/CONTRACT.md
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const IQ = root.IQ = root.IQ || {};
  const DATA = root.IQ_VERBAL;
  if (!DATA || !Array.isArray(DATA.items) || typeof IQ.register !== 'function') return;

  const LEVEL_MIN = 1, LEVEL_MAX = 10;
  const KINDS = ['analogy', 'odd', 'category', 'relation'];

  /* ── Yozuvni tekshirish ─────────────────────────────────────────────
     To'liq sxema testda tekshiriladi (tests/iq-verbal.test.mjs). Bu yerda
     faqat ilovani yiqitadigan narsalar: buzuq yozuv jimgina tashlanadi,
     ilova qolganlari bilan ishlaydi. */
  const str = s => typeof s === 'string' && s.trim() !== '';
  const side = v => v && str(v.prompt) && str(v.stimulus) && Array.isArray(v.options)
                      && v.options.length >= 4 && v.options.length <= 6 && v.options.every(str);
  function usable(it) {
    return it && str(it.key) && KINDS.indexOf(it.kind) >= 0
      && Number.isInteger(it.level) && it.level >= LEVEL_MIN && it.level <= LEVEL_MAX
      && side(it.uz) && side(it.ru) && it.uz.options.length === it.ru.options.length
      && Number.isInteger(it.correct) && it.correct >= 0 && it.correct < it.uz.options.length
      && it.explain && str(it.explain.uz) && str(it.explain.ru);
  }
  /* `en` ixtiyoriy: bor va to'g'ri bo'lsagina ishlatiladi. */
  const hasEn = it => side(it.en) && it.en.options.length === it.uz.options.length && str(it.explain.en);

  /* Darajalar bo'yicha hovuz. Kalit bo'yicha saralanadi: JSON'dagi tartib
     o'zgarsa ham urug' → yozuv bog'lanishi o'zgarmasin. */
  const byLevel = {};
  for (let L = LEVEL_MIN; L <= LEVEL_MAX; L++) byLevel[L] = [];
  const all = DATA.items.filter(usable)
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  all.forEach(it => byLevel[it.level].push(it));
  if (!all.length) return;
  const ALL_EN = all.every(hasEn);

  /* Eng yaqin bo'sh bo'lmagan daraja (teng masofada — pastrog'i). */
  function poolFor(level) {
    for (let d = 0; d <= LEVEL_MAX - LEVEL_MIN; d++) {
      if (byLevel[level - d] && byLevel[level - d].length) return byLevel[level - d];
      if (byLevel[level + d] && byLevel[level + d].length) return byLevel[level + d];
    }
    return [];
  }

  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

  /* Matn obyekti: en faqat yozuvda to'g'ri en bo'lsa qo'shiladi. */
  const txt = (uz, ru, en, withEn) => (withEn ? { uz, ru, en } : { uz, ru });

  function generate(seed, level) {
    const r = IQ.rng(seed);
    const lv = clamp(Math.round(level), LEVEL_MIN, LEVEL_MAX);
    const pool = poolFor(lv);
    const src = pool[r.int(pool.length)];
    const k = src.uz.options.length;
    const en = hasEn(src);

    /* perm[i] — ko'rsatiladigan i-o'rindagi variantning JSON'dagi indeksi.
       uz, ru va en bitta perm bilan: hamma til doim bir-biriga mos. */
    const perm = r.shuffle(Array.from({ length: k }, (_, i) => i));

    /* Yozuv boshqa darajadan olingan bo'lsa, b shunga qarab suriladi
       (±0.75 — shartnoma chegarasi). */
    const b = IQ.levelToB(lv) + clamp((src.level - lv) * 0.5, -0.75, 0.75);

    return {
      id: 'verbal:' + level + ':' + seed,
      type: 'verbal',
      level,
      b,
      prompt: txt(src.uz.prompt, src.ru.prompt, en && src.en.prompt, en),
      stimulus: Object.assign({ kind: 'text' }, txt(src.uz.stimulus, src.ru.stimulus, en && src.en.stimulus, en)),
      options: perm.map(i => Object.assign({ kind: 'text' },
        txt(src.uz.options[i], src.ru.options[i], en && src.en.options[i], en))),
      correct: perm.indexOf(src.correct),
      explain: txt(src.explain.uz, src.explain.ru, en && src.explain.en, en),
      key: src.key,
    };
  }

  IQ.register({
    type: 'verbal',
    /* ru: 'Словесная логика' — 'Вербальная логика' 360 px da kesilardi (F52). */
    label: { uz: 'Ogʻzaki mantiq', ru: 'Словесная логика', en: 'Verbal reasoning' },
    langs: ALL_EN ? ['uz', 'ru', 'en'] : ['uz', 'ru'],
    generate,
    /* Test uchun: darajadagi hovuz (nusxa emas — o'zgartirmang). */
    pool: level => poolFor(clamp(Math.round(level), LEVEL_MIN, LEVEL_MAX)),
  });
})(typeof window !== 'undefined' ? window : globalThis);
