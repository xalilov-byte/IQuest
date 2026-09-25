# Zukko — IQ yadrosi shartnomasi

Bu hujjat parallel ishlayotgan hamma qismlar uchun **yagona kelishuv**.
Kim nimani o'zgartirsa ham, shu yerdagi API va qoidalar buzilmaydi.
O'zgartirish kerak bo'lsa — avval shu hujjat, keyin kod.

Loyiha Nazariy (haydovchilik nazariy imtihoni ilovasi) asosida qurilgan.
Dvigatel o'sha: Capacitor Android + bitta Design Canvas fayli
(`src/Main.dc.html`) + o'z runtime'i + Supabase. Ichki `nz` prefikslari
(`window.nzProgress`, `.nz-card`, `nz-root`) **o'zgartirilmaydi** — ular
foydalanuvchiga ko'rinmaydi, o'zgartirish esa build tekshiruvlarini buzadi.

---

## 1. Modul formati

Har bir fayl — oddiy skript, import/eksport yo'q:

```js
(function (root) {
  const IQ = root.IQ = root.IQ || {};
  // ...
})(typeof window !== 'undefined' ? window : globalThis);
```

Build (`build.mjs`) ularni `index.html` ga shu tartibda qo'yadi:
`rng.js → index.js → score.js → session.js → gen/*.js (alifbo)`.
Testlar `node:vm` ichida `window` taqlidi bilan yuklaydi (namuna:
`tests/data.test.mjs`). Manba faylga test uchun o'zgartirish kiritilmaydi.

**Tashqi kutubxona yo'q.** Hamma narsa qo'lda: ilova offline ishlaydi va
CSP tashqi skriptni to'sadi.

---

## 2. Savol (Item)

Generator: `IQ.register({ type, label: {uz, ru}, generate(seed, level) })`.
`generate(seed: uint32, level: 1..10) → Item`. **Deterministik**: bir xil
`(seed, level)` → aynan bir xil Item (SVG baytma-bayt bir xil). Tasodif
faqat `IQ.rng(seed)` dan (`src/iq/rng.js`), `Math.random()` TAQIQLANGAN.

```js
Item = {
  id:       'matrix:7:123456',          // `${type}:${level}:${seed}`
  type:     'matrix' | 'series' | 'spatial' | 'verbal',
  level:    1..10,                      // so'ralgan daraja
  b:        number,                     // Rasch qiyinligi, IQ.levelToB(level) ± 0.75
  prompt:   { uz, ru },                 // "Bo'sh katakka qaysi shakl mos keladi?"
  stimulus: { kind: 'svg', svg } | { kind: 'text', uz, ru },
  options:  Array<{ kind: 'svg', svg } | { kind: 'text', uz, ru }>,   // 4..6 ta
  correct:  int,                        // options ichidagi indeks
  explain:  { uz, ru },                 // QOIDA — nima uchun shu javob
  timeLimit?: number,                   // soniya, ixtiyoriy
}
```

`IQ.validateItem(item) → string[]` (bo'sh = to'g'ri). `IQ.makeItem(type,
seed, level)` har savolni tekshiradi va buzuqini **otadi** — chaqiruvchi
boshqa urug' bilan qayta urinadi. Har generator testi minglab urug' uchun
`validateItem` bo'sh qaytarishini tekshiradi.

### Har bir generator KAFOLATLAYDIGAN narsalar (testda isbotlanadi)

1. **Aniq bitta to'g'ri javob.** Distraktor qoidani buzishi kerak — faqat
   "boshqacha ko'rinishi" yetarli emas. Testda: har distraktor uchun
   qaysi qoida buzilganini generator bilishi va test buni tekshirishi.
2. **Variantlar vizual jihatdan farq qiladi** — SVG satrlari har xil
   bo'lishi yetarli emas (bir xil shakl, boshqa tartibdagi atribut ham
   "har xil satr"). Solishtirish kanonik tavsif bo'yicha.
3. **To'g'ri javob o'rni tekis taqsimlangan.** 2000 urug'da har o'rin
   ulushi `1/k ± 0.04`. (Klassik xato: to'g'ri javob doim A yoki
   "eng o'rtachasi" — ayyor odam qoidani emas, naqshni topadi.)
4. **Daraja haqiqatan qiyinlikni oshiradi** — daraja bilan qoidalar soni /
   murakkabligi oshadi. Testda: yuqori darajada o'rtacha qoida soni ≥.
5. **Rang yagona farq emas.** Ranglarni farqlay olmaydigan odam ham
   yecha olishi kerak: farq shakl, son, to'ldirish (bo'sh / to'liq /
   shtrix), o'lcham, burilish bilan. Qizil–yashil farqi taqiqlangan.

### SVG qoidalari

- `<svg xmlns="http://www.w3.org/2000/svg" viewBox="...">` bilan boshlanadi.
- O'z oq foni (`<rect ... fill="#fff"/>`): SVG `<img>` ichida
  ko'rsatiladi va CSS o'zgaruvchilarini (tungi tema) ko'rmaydi.
- Chiziq rangi `#1c1b29`, kulrang `#8a8799`, fon `#ffffff`.
- Skript, `on*=` atributi, `<foreignObject>`, tashqi `href` TAQIQLANGAN
  (`validateItem` ushlaydi). Ichki `href="#id"` mumkin.
- Ilova SVG'ni `<img src="${IQ.svgSrc(svg)}">` bilan ko'rsatadi — hech
  qachon innerHTML bilan emas.
- Variant SVG'si kvadrat (`viewBox="0 0 100 100"`), stimul — istalgan
  nisbat, lekin eni ≤ bo'yining 1.6 barobari (telefon ekrani).

---

## 3. Sessiya — `src/iq/session.js`

Test va mashq oqimi ilovada emas, shu modulda (testlanadigan joyda).

```js
const s = IQ.session.create({
  mode: 'test' | 'practice',
  types?: string[],       // default: IQ.types() (hammasi)
  length?: number,        // default: test 30, practice 10
  seed?: number,          // default: Date.now()
  startLevel?: number,    // practice: nzProgress.levelFor(type)
});
s.mode, s.length, s.seed, s.index, s.done
s.current()             → Item | null   (tugagan bo'lsa null)
s.answer(i, ms)         → { correct: bool, correctIndex: int, item }
s.result()              → Result
s.snapshot()            → JSON-serializable (ilova yopilsa davom ettirish)
IQ.session.restore(snapshot) → Session   (aynan shu joydan, aynan shu savollar)

Result = {
  mode, n, correct, durationMs,
  theta, se,              // qobiliyat bahosi va xatosi (logit)
  iq, lo, hi,             // taxminiy IQ-uslubidagi ball va 90% oraliq
  reliable: bool,         // false — savol kam (masalan < 20): ilova IQ raqamini KO'RSATMAYDI
  byType: { [type]: { n, correct } },
  items: [{ id, type, level, b, correct: bool, ms }],
}
```

---

## 4. Baholash — `src/iq/score.js`

```js
IQ.score.estimate(responses: [{ b, correct }]) → { theta, se }   // EAP, N(0,1) prior
IQ.score.toIQ(theta) → int, 55..145                               // 100 + 15·θ
IQ.score.interval(theta, se, z = 1.645) → { lo, hi }
IQ.score.nextLevel(theta, rng) → 1..10                            // b ≈ θ atrofida
```

---

## 5. Progress — `src/progress.js` (`window.nzProgress`)

Mavjud API (ball, streak, "Xatolarim", "Saqlangan") saqlanadi. Qo'shiladi:

```js
nzProgress.recordTest(result)   // diskka; tarix eng ko'pi 100 ta
nzProgress.testHistory()        // [{ at, iq, lo, hi, n, correct, reliable, byType }] — eskidan yangiga
nzProgress.levelFor(type)       // 1..10 — shu turdagi so'nggi natijalardan mashq darajasi
```

---

## 6. HALOLLIK QOIDALARI (matn yozadigan HAMMA uchun)

Bu mahsulotning eng nozik joyi. "IQ" so'zi va'da beradi, biz esa
me'yorlanmagan (norm) test qilyapmiz.

1. **Ball har doim "taxminiy"** va har doim ORALIQ bilan: "Taxminiy IQ:
   108 (100–116)". Oraliqsiz yolg'iz raqam ko'rsatilmaydi.
2. **Rad qilish matni** natija ekranida doim ko'rinadi: *"Bu klinik IQ
   testi emas. Savollar hali katta guruhda me'yorlanmagan, shuning uchun
   natija taxminiy va faqat o'zingizni kuzatish uchun."*
3. **"IQ oshiradi" deb VA'DA QILINMAYDI.** Mashq qilingan topshiriqda
   natija oshadi — bu isbotlangan. Umumiy aqlga ko'chishi — isbotlanmagan
   (AQShda Lumosity shunday va'da uchun 2 mln $ jarima to'lagan). Mumkin:
   "mantiqiy fikrlashni mashq qiling", "natijangiz o'sishini kuzating".
   Mumkin emas: "IQ'ingizni 20 ballga oshiring", "aqlli bo'ling".
4. **"Rasmiy", "sertifikatlangan", "Mensa", "klinik"** so'zlari yo'q.
5. `reliable: false` bo'lsa IQ raqami ko'rsatilmaydi — faqat to'g'ri
   javoblar soni.

---

## 7. Fayl egaligi (parallel ish paytida)

Har fayl bitta egaga tegishli. Boshqaning fayliga TEGMANG — kerak bo'lsa
yakunda hisobotga yozing, integratsiyada hal qilinadi.

| Ega | Fayllar |
|---|---|
| matrix | `src/iq/gen/matrix.js`, `tests/iq-matrix.test.mjs` |
| series | `src/iq/gen/series.js`, `tests/iq-series.test.mjs` |
| spatial | `src/iq/gen/spatial.js`, `tests/iq-spatial.test.mjs` |
| verbal | `src/iq/gen/verbal.js`, `content/verbal.json`, `tests/iq-verbal.test.mjs` |
| score | `src/iq/score.js`, `src/iq/session.js`, `src/progress.js`, `tests/iq-score.test.mjs`, `tests/iq-session.test.mjs`, `tests/progress.test.mjs` |
| ui | `src/Main.dc.html`, `src/i18n-ru.js`, `src/i18n.js`, `src/site/**`, `src/shell*.css`, `src/admin-*.js`, `tools/source.mjs`, `tools/mksite.mjs`, `tests/bulk.test.mjs` |
| backend | `supabase/**`, `src/data.js`, `tests/data.test.mjs`, `.github/workflows/db.yml`, `.github/workflows/db-apply.yml` |
| brand | `android/**`, `capacitor.config.json`, `site.config.json`, `resources/**`, `tools/icon.html`, `tools/mk{icons,og,play}.mjs`, `README.md`, `PLAY.md`, `RASMLAR.md`, `.github/workflows/android.yml`, `.claude/agents/**` |
| integrator | `build.mjs`, `package.json`, `version.json`, `src/iq/{rng,index}.js`, `src/iq/CONTRACT.md`, `src/iq/gen/demo.js`, `.github/workflows/js.yml` |

`npm test` hamma testni ishga tushiradi. O'zingizniki yashil bo'lishi
shart; boshqaning testi (u hali ishlayotgan bo'lsa) qizil bo'lishi
mumkin — uni tuzatmang, hisobotda ayting.
