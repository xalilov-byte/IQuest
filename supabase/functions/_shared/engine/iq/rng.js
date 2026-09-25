/* ─────────────────────────────────────────────────────────────────────────
   IQ.rng — urug'li (seeded) tasodifiy son generatori

   NEGA OddIY Math.random EMAS: savol urug'dan (seed) QAYTA TIKLANADIGAN
   bo'lishi shart. Aynan shu urug' → aynan shu savol, aynan shu variantlar
   tartibi. Busiz:
     · "Xatolarim" rejimida xato qilingan savolni qaytadan ko'rsatib
       bo'lmaydi (faqat urug'ni saqlaymiz, butun SVG'ni emas);
     · testlar tasodifga bog'liq bo'lib qoladi — bugun o'tib, ertaga
       yiqiladi;
     · bir xil savolga javob bergan odamlarni solishtirib bo'lmaydi
       (qiyinlikni kalibrlash uchun kerak).

   Algoritm — mulberry32: 32-bit holat, tez, sifati test savollari uchun
   yetarli. Kriptografik EMAS va bo'lishi ham shart emas.
   ───────────────────────────────────────────────────────────────────── */
(function (root) {
  const IQ = root.IQ = root.IQ || {};

  function rng(seed) {
    let s = (seed >>> 0) || 0x9e3779b9;   // 0 urug' ham ishlaydi
    const next = () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const int = n => Math.floor(next() * n);           // 0 .. n-1
    return {
      next,
      int,
      range: (lo, hi) => lo + int(hi - lo + 1),        // lo .. hi (ikkalasi ham kiradi)
      pick: arr => arr[int(arr.length)],
      /* Fisher–Yates. Yangi massiv qaytaradi — asl massiv o'zgarmaydi. */
      shuffle: arr => {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
          const j = int(i + 1);
          const t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
      },
      chance: p => next() < p,
    };
  }

  /* Matndan urug' (masalan "matrix:7:123" → son). Savol ID'sini qayta
     urug'ga aylantirish uchun. FNV-1a. */
  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }

  IQ.rng = rng;
  IQ.hash = hash;
})(typeof window !== 'undefined' ? window : globalThis);
