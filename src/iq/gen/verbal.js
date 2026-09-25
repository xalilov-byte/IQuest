/* ─────────────────────────────────────────────────────────────────────────
   IQ — og'zaki mantiq savollari (analogiya, ortiqchasini topish,
   guruhga kiritish, munosabat)

   Bu generator savolni O'ZI O'YLAB TOPMAYDI: og'zaki savolda bir
   ma'nolilikni faqat odam kafolatlay oladi (so'zning ikkinchi ma'nosi,
   tarjimadagi siljish, madaniy kontekst). Shuning uchun savollar qo'lda
   yozilgan — content/verbal.json. Build uni window.IQ_VERBAL sifatida
   bundle'ga qo'yadi, bu fayl esa faqat:
     · urug' bo'yicha shu darajadagi savollardan birini tanlaydi;
     · variantlar tartibini aralashtiradi (aks holda JSON'dagi o'rin
       yodlanib qoladi va odam mantiqni emas, naqshni topadi);
     · savolni umumiy Item shakliga keltiradi (CONTRACT.md §2).

   window.IQ_VERBAL bo'lmasa (masalan, fayl build'ga kirmagan bo'lsa)
   generator jimgina RO'YXATDAN O'TMAYDI: ilova qolgan turlar bilan
   ishlayveradi. Xato otish ilovani to'liq to'xtatib qo'yardi.
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const IQ = root.IQ;
  const DATA = root.IQ_VERBAL;
  if (!IQ || typeof IQ.register !== 'function' || !DATA || !Array.isArray(DATA.items)) return;

  const OPTIONS_MIN = 4, OPTIONS_MAX = 6;
  const nonEmpty = s => typeof s === 'string' && s.trim() !== '';

  /* Kontentni ishonchsiz ma'lumot deb qaraymiz: kelajakda uni baza yoki
     tahrirchi ham yozishi mumkin. Shakli buzuq savol foydalanuvchiga
     umuman chiqmasligi kerak — IQ natijasini jimgina buzadi. Shuning
     uchun bu yerda tashlab yuboriladi, qolganlari ishlayveradi. */
  function usable(it) {
    if (!it || !(it.level >= 1 && it.level <= 10) || !Number.isInteger(it.level)) return false;
    const u = it.uz, r = it.ru;
    if (!u || !r || !nonEmpty(u.prompt) || !nonEmpty(r.prompt)
        || !nonEmpty(u.stimulus) || !nonEmpty(r.stimulus)) return false;
    if (!Array.isArray(u.options) || !Array.isArray(r.options)) return false;
    const k = u.options.length;
    if (k !== r.options.length || k < OPTIONS_MIN || k > OPTIONS_MAX) return false;
    if (!u.options.every(nonEmpty) || !r.options.every(nonEmpty)) return false;
    if (!(Number.isInteger(it.correct) && it.correct >= 0 && it.correct < k)) return false;
    return !!(it.explain && nonEmpty(it.explain.uz) && nonEmpty(it.explain.ru));
  }

  /* Daraja → savollar. JSON tartibi saqlanadi: tanlov deterministik
     bo'lishi uchun (bir xil urug' → bir xil savol) tartib barqaror
     bo'lishi shart. */
  const byLevel = Object.create(null);
  DATA.items.filter(usable).forEach(it => {
    (byLevel[it.level] = byLevel[it.level] || []).push(it);
  });
  const levels = Object.keys(byLevel).map(Number);
  if (!levels.length) return;

  /* So'ralgan darajada savol bo'lmasa — eng yaqin daraja. Teng uzoqlikda
     PASTROG'I olinadi: juda qiyin savol natijani tasodifiy qilib
     qo'yadi, biroz osonrog'i esa baribir ma'lumot beradi. */
  function pool(level) {
    for (let d = 0; d < 10; d++) {
      if (byLevel[level - d]) return byLevel[level - d];
      if (byLevel[level + d]) return byLevel[level + d];
    }
    return byLevel[levels[0]];
  }

  IQ.register({
    type: 'verbal',
    label: { uz: "So'z mantiqi", ru: 'Словесная логика' },
    generate(seed, level) {
      const r = IQ.rng(seed);
      const items = pool(level);
      const src = items[r.int(items.length)];
      /* Indekslarni aralashtiramiz, so'ng to'g'ri javob QAYERGA
         ketganini qayta hisoblaymiz — uz va ru bir xil tartibda. */
      const order = r.shuffle(src.uz.options.map((_, i) => i));
      return {
        id: 'verbal:' + level + ':' + seed,
        type: 'verbal',
        level,
        b: IQ.levelToB(level),
        /* key — kontentdagi barqaror kalit: qiyinlikni keyinchalik
           savol bo'yicha kalibrlash va odam tekshiruvi uchun. */
        key: src.key,
        prompt: { uz: src.uz.prompt, ru: src.ru.prompt },
        stimulus: { kind: 'text', uz: src.uz.stimulus, ru: src.ru.stimulus },
        options: order.map(i => ({ kind: 'text', uz: src.uz.options[i], ru: src.ru.options[i] })),
        correct: order.indexOf(src.correct),
        explain: { uz: src.explain.uz, ru: src.explain.ru },
      };
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
