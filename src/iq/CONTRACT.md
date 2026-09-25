# IQuest — IQ yadrosi shartnomasi

Bu hujjat parallel ishlayotgan hamma qismlar uchun **yagona kelishuv**.
Kim nimani o'zgartirsa ham, shu yerdagi API va qoidalar buzilmaydi.
O'zgartirish kerak bo'lsa — avval shu hujjat, keyin kod.

**Nom: IQuest** (ilova), sayt **IQuest.uz**, Android ID `uz.iquest.app`.
(Ish boshida "Zukko" deb atalgan — u nom band chiqdi. Papka nomi
/home/user/Zukko qoladi, foydalanuvchiga ko'rinadigan hamma joyda IQuest.)

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

**Ilova skriptlari tartibi** (ARXITEKTURA §10.5; har biri alohida
`<script>`, boshida `/* ── src/<fayl> ── */` belgisi):

```
i18n-ru → i18n-en → i18n → runtime → feedback → notify → nzSite → settings →
progress → catalog → icons → art → avatars → profile → wallet → badges →
league → IQ bundle → Main (logic) → data → bootstrap
```

- `nzSite` — build yasaydigan maʼlumot (§14; `nzSite.langs` — §15).
- v1.1 ning yangi fayllari (`i18n-en`, `settings`, `catalog`, `icons`, `art`,
  `avatars`, `profile`, `wallet`, `badges`, `league`) hali yoʻq boʻlsa build
  ularni **oʻtkazib yuboradi**: Main har modulni `window.nzX` borligini
  tekshirib ishlatadi, yoʻq modulning funksiyasi yashiriladi.
  `node build.mjs --strict` (yoki `IQ_STRICT=1`, WP11 reliz nomzodi) da
  yoʻq fayl — xato.
- Statik maʼlumot (`nzCatalog`, `nzIcons`, `nzArt`, `IQ_AVATARS`) holatli
  modullardan OLDIN yuklanadi, shuning uchun ularni istalgan modul oʻqiy
  oladi. Holatli modullar (`settings`, `profile`, `wallet`, `badges`,
  `league`) bir-birini CHAQIRMAYDI — ularni faqat Main ulaydi (§13).
- Har yangi modul — shu §1 formatidagi IIFE, import yoʻq, `node:vm` da
  `window`/`localStorage` taqlidi va kiritilgan `now` bilan testlanadi.

**Tashqi kutubxona yo'q.** Hamma narsa qo'lda: ilova offline ishlaydi va
CSP tashqi skriptni to'sadi.

---

## 2. Savol (Item)

Generator: `IQ.register({ type, label: {uz, ru, en?}, langs?, generate(seed, level) })`.
`generate(seed: uint32, level: 1..10) → Item`. **Deterministik**: bir xil
`(seed, level)` → aynan bir xil Item (SVG baytma-bayt bir xil). Tasodif
faqat `IQ.rng(seed)` dan (`src/iq/rng.js`), `Math.random()` TAQIQLANGAN.

```js
Item = {
  id:       'matrix:7:123456',          // `${type}:${level}:${seed}`
  type:     'matrix' | 'series' | 'spatial' | 'verbal',
  level:    1..10,                      // so'ralgan daraja
  b:        number,                     // Rasch qiyinligi, IQ.levelToB(level) ± 0.75
  prompt:   { uz, ru, en? },            // "Bo'sh katakka qaysi shakl mos keladi?"
  stimulus: { kind: 'svg', svg } | { kind: 'text', uz, ru, en? },
  options:  Array<{ kind: 'svg', svg } | { kind: 'text', uz, ru, en? }>,   // 4..6 ta
  correct:  int,                        // options ichidagi indeks
  explain:  { uz, ru, en? },            // QOIDA — nima uchun shu javob
  timeLimit?: number,                   // soniya, ixtiyoriy
}
```

`IQ.validateItem(item) → string[]` (bo'sh = to'g'ri). `IQ.makeItem(type,
seed, level)` har savolni tekshiradi va buzuqini **otadi** — chaqiruvchi
boshqa urug' bilan qayta urinadi. Har generator testi minglab urug' uchun
`validateItem` bo'sh qaytarishini tekshiradi.

### Tillar: matn obyekti `{ uz, ru, en? }` va `langs`

- **Matn obyekti** — `{ uz, ru, en? }`. `uz` va `ru` doim boʻsh boʻlmagan
  satr. `en` ixtiyoriy, lekin BOR boʻlsa — boʻsh boʻlmagan satr (`''`,
  `null`, raqam — xato). `uz-cyrl` kontent tili emas: kirill oʻzbek
  lotinidan avtomatik oʻgiriladi (`src/i18n.js`), generator uni yozmaydi.
- **`langs`** — generator eʼlon qiladigan kontent tillari:
  `['uz','ru']` (standart — `langs` yoʻq boʻlsa shu) yoki `['uz','ru','en']`.
  Boshqa qiymatda `register` otadi. `IQ.CONTENT_LANGS = ['uz','ru','en']`.
- Generator `'en'` ni eʼlon qilsa: `register` `label.en` ni talab qiladi,
  `validateItem` esa HAMMA matnda (prompt, explain, matnli stimul va
  variantlar) boʻsh boʻlmagan `en` ni talab qiladi va matnli variantlarning
  `en` i ham takrorlanmasligini tekshiradi. `en` ni eʼlon qilmagan
  generatorda `en` ixtiyoriy (eski xulq, orqaga mos).
- `IQ.langsOf(type) → string[]` — eʼlon qilingan tillar nusxasi
  (nomaʼlum tur → `[]`). Build EN darvozasi shundan foydalanadi (§15).
- **Savol ID si tilga bogʻliq EMAS.** `(type, seed, level)` hamma tilda
  aynan bir xil savolni beradi — faqat matn tili farq qiladi. Tilga qarab
  filtrlash, urugʻni almashtirish yoki `en: null` bilan savolni chiqarib
  tashlash TAQIQLANGAN: `session.restore` va `verify` buziladi (§3, §10).
- `'en'` eʼlon qilgan generatorning testi (2 000 urugʻ): `en` bor va boʻsh
  emas; `en` da kirill harfi va oʻzbek `ʻ` yoʻq; `verify` natijasi hamma
  tilda bir xil. Inglizcha koʻplik yordamchisi (`series.js`) `ruRaz` ga
  parallel yoziladi.

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

### Og'zaki savollar — `content/verbal.json`

Generator emas, qo'lda yozilgan kontent. Ikki ega unga tayanadi:
**verbal** (yozadi) va **backend** (bazaga seed qiladi). Shakl:

```json
{
  "version": 1,
  "items": [
    {
      "key": "v001",
      "kind": "analogy",
      "level": 3,
      "uz": { "prompt": "…", "stimulus": "Qush : uya = asalari : ?", "options": ["…", "…", "…", "…"] },
      "ru": { "prompt": "…", "stimulus": "Птица : гнездо = пчела : ?", "options": ["…", "…", "…", "…"] },
      "en": { "prompt": "…", "stimulus": "Bird : nest = bee : ?", "options": ["…", "…", "…", "…"] },
      "correct": 2,
      "explain": { "uz": "…", "ru": "…", "en": "…" },
      "reviewed": false,
      "reviewed_en": false
    }
  ]
}
```

- `key` — barqaror, hech qachon qayta ishlatilmaydi (`v001`, `v002`…).
- `kind` — `analogy` | `odd` (ortiqchasini top) | `category` | `relation`.
  `odd` da `stimulus` — qatʼiy qoida qatori (variantlar unda takrorlanmaydi).
- uz, ru va en'da variantlar soni va `correct` indeksi **bir xil**.
- `reviewed: false` — odam ko'rib chiqmaguncha. Hozir hammasi false.
- **`en` — HAMMA yozuvda yoki hech birida** (§15). `en` — soʻzma-soʻz
  tarjima emas, **moslashtirish**: soʻz munosabati ingliz tilida ham
  toʻgʻri boʻlishi kerak, faqat oʻzbek madaniyatiga xos soʻz boʻlmasin.
  `key` va `correct` HECH QACHON oʻzgarmaydi. `level` koʻrib chiqish
  natijasida oʻzgarishi mumkin (egasi tasdiqlagan qayta darajalash), lekin
  HAR QANDAY kontent yoki daraja oʻzgarishi urugʻ → yozuv moslamasini
  oʻzgartiradi, shuning uchun u engine versiyasini oshirish bilan birga
  keladi (§3, §10). `reviewed_en: false` — inglizchani
  yaxshi biladigan odam tekshirmaguncha. Qisman `en` (bir qismi yoʻq yoki
  `en: null`) TAQIQLANGAN: `verbal:level:seed` qaysi yozuvga tushishi
  darajadagi roʻyxatga bogʻliq, filtrlangan roʻyxat bir xil ID ni turli
  tilda turli savolga olib boradi.

Build uni `window.IQ_VERBAL = {…}` sifatida bundle'ga qo'yadi (`build.mjs`),
`gen/verbal.js` shundan o'qiydi. Testlar faylni diskdan o'qib
`window.IQ_VERBAL` ga qo'yadi.

---

## 3. Sessiya — `src/iq/session.js`

Test va mashq oqimi ilovada emas, shu modulda (testlanadigan joyda).

```js
const s = IQ.session.create({
  mode: 'test' | 'practice',
  types?: string[],       // default: IQ.types() (hammasi)
  length?: number,        // default: test 30, practice 10
  seed?: number,          // default: Date.now()
  startLevel?: number | { [type]: number },  // practice; yo'q bo'lsa nzProgress.levelFor(type), u ham yo'q bo'lsa 3
});
s.mode, s.length, s.seed, s.index, s.done
s.current()             → Item | null   (tugagan bo'lsa null)
s.answer(i, ms)         → { correct: bool, correctIndex: int, item }
                        // i: 0..k-1; -1 / null / undefined = javobsiz (xato hisoblanadi); boshqasi otadi
                        // ms: shu savolga ketgan vaqt — durationMs shularning YIG'INDISI
s.result()              → Result
s.snapshot()            → JSON-serializable (ilova yopilsa davom ettirish)
s.payload()             → { engine, seed, mode, types, length, items: [{ id, answer, ms }], startLevels? }  // serverga (§10)
IQ.session.restore(snapshot) → Session   (aynan shu joydan, aynan shu savollar)
IQ.session.verify(payload, { allowPartial? }) → Result   // §10: qayta yaratadi va qayta hisoblaydi
IQ.session.ENGINE       // sessiya algoritmi versiyasi (hozir 2; 1-engine payload → IQ_ENGINE_MISMATCH)
IQ.session.contentKey(item) → string   // mazmun kaliti: `type#key` (verbal) yoki type:hash(prompt+stimulus)
IQ.session.bankSide(item) → 'test'|'practice'|null   // qo'lda yozilgan bank: IQ.hash('side:'+key) % 2
IQ.session.RULES        // { minItems, chanceZ, fastMedianMs }

Result = {
  mode, n, correct, durationMs,
  theta, se,              // qobiliyat bahosi va xatosi (logit)
  iq, lo, hi,             // IQ-uslubidagi natija va 90% oraliq («ball» emas — §17)
  loOpen, hiOpen,         // oraliq 55..145 chegarasidan chiqdimi (qisishdan OLDIN hisoblanadi)
  flag,                   // null | 'practice' | 'short' | 'chance' | 'fast' (tartib shu, birinchisi)
  reliable: bool,         // reliable ⇔ flag === null; false bo'lsa ilova IQ raqamini KO'RSATMAYDI
  byType: { [type]: { n, correct } },
  items: [{ id, type, level, b, k, answer: int, correct: bool, ms }],
  complete, seed, types, length, engine,   // qo'shimcha maydonlar
}
```

`restore` va `verify` jurnalni qayta o'ynaydi va nomuvofiqlikda OTADI —
`err.code`: `IQ_REPLAY_MISMATCH` (qayta yaratilgan `id` jurnaldagidan
farq qiladi; `.index`, `.expected`, `.got`), `IQ_ENGINE_MISMATCH`,
`IQ_INCOMPLETE` (`verify`: tugallanmagan test — omadli boshlanishdan
keyin to'xtab qolishning oldini oladi), `IQ_GEN_FAILED` (20 urinishda
ham savol yaratilmadi). Ilova tiklash xatosida saqlangan holatni
tashlab yuboradi va buni foydalanuvchiga aytadi.

`IQ_GEN_FAILED` faqat yaroqli (takrorlanmaydigan, bank qismiga mos)
savol umuman topilmaganda otiladi.

**Ishonchlilik (`flag`):** `practice` — mashq; `short` — savol
`RULES.minItems` dan kam; `chance` — to'g'ri javoblar tasodifdan yetarli
yuqori emas: `correct ≤ Σ1/k + 1.645·√Σ(1/k)(1−1/k)` (`IQ.score.chance`);
`fast` — javoblarning kamida yarmida `ms > 0` va median `ms < 1500`.
`reliable === (flag === null)` doim.

**Takrorlanmaslik:** bitta sessiyada bir xil `contentKey` li savol ikki
marta chiqmaydi. **Verbal bank** test va mashqqa bo'lingan:
`bankSide(item)` — test faqat `'test'` qismidan, mashq faqat
`'practice'` qismidan oladi (generator savollari bo'linmaydi).

`types` ni ilova ANIQ beradi: default `IQ.types()` bundle'da qaysi
generator borligiga bog'liq.

`items[].answer` — foydalanuvchi tanlagan variant indeksi. SHART: server
natijani shu jurnal bo'yicha QAYTA hisoblaydi (§10) — savol urug'dan
qayta yaratiladi, javob tekshiriladi, ball qayta chiqariladi. Mijoz
yuborgan `iq` ga ishonilmaydi.

---

## 4. Baholash — `src/iq/score.js`

```js
IQ.score.estimate(responses: [{ b, correct, k? }]) → { theta, se }   // EAP, N(0,1) prior, 81 nuqta
IQ.score.toIQ(theta) → int, 55..145                               // 100 + 15·θ
IQ.score.interval(theta, se, z = 1.645) → { lo, hi, loOpen, hiOpen }   // open — qisishdan oldin 55..145 dan chiqqan
IQ.score.chance(responses: [{ k }]) → { mean, sd }                  // tasodifiy javoblar: μ = Σ1/k, σ² = Σ(1/k)(1−1/k)
IQ.score.IQ_MIN, IQ.score.IQ_MAX                                   // 55, 145
IQ.score.nextLevel(theta, rng) → 1..10                            // b* = θ − 0.3, tasodifiy yaxlitlash
IQ.score.prob(theta, b, k), IQ.score.guess(k)                     // P = c + (1−c)·σ(θ−b), c = 1/k
```

Taxmin qilish hisobga olinadi (c = 1/k, k — variantlar soni): busiz
tasodifan belgilagan odam o'z darajasidan ancha yuqori ball olardi.
30 savoldan keyin 90% oraliq taxminan ±11 IQ — shunday
ko'rsatiladi, toraytirilmaydi. Uchlar qisishdan OLDIN hisoblanadi;
ochiq uch (`loOpen` / `hiOpen`) ilovada «≤{hi}» / «{lo}+» deb yoziladi —
qisilgan 55 yoki 145 hech qachon aniq chegara sifatida ko'rsatilmaydi
(sertifikatda ham, §10).

---

## 5. Progress — `src/progress.js` (`window.nzProgress`)

Mavjud API (ball, streak, "Xatolarim", "Saqlangan") saqlanadi. Qo'shiladi:

```js
nzProgress.recordTest(result)   // diskka; tarix: testlar ≤100, mashqlar ≤30 (rejim bo'yicha alohida chegara);
                                // test mavzulari (Xatolarim uchun) shu yerda qo'shiladi
nzProgress.testHistory()        // [{ at, mode, iq, lo, hi, loOpen, hiOpen, flag, n, correct, reliable, byType, theta, se }] — eskidan yangiga
nzProgress.testStats()          // { count, best } — tarix chegarasidan qat'i nazar
nzProgress.levelFor(type)       // 1..10 — shu turdagi so'nggi javoblardan; sovuq start — umumiy EAP (pooled)
nzProgress.activeToday()        // bugun faol bo'lganmi (eslatmalar, §14)
nzProgress.markActive()         // o'yin kabi javobsiz faoliyat streak'ni yangilaydi
```

Mashq natijasi ham `recordTest` ga beriladi — aks holda `levelFor`
o'zgarmaydi. Shuning uchun IQ tarixi ekrani `mode === 'test'` bo'yicha
filtrlaydi.

---

## 6. HALOLLIK QOIDALARI (matn yozadigan HAMMA uchun)

Bu mahsulotning eng nozik joyi. "IQ" so'zi va'da beradi — shuning
uchun biz NIMA DEMASLIGIMIZ qat'iy, lekin ilova o'zini oqlab ham
o'tirmaydi.

**Mahsulot egasining qarori (2026-09-25, №2):** ilova premium, tartibli
va ishonchli ko'rinishi kerak (Nazariy darajasida). Ilova ICHIDA rad
qilish / ogohlantirish matnlari ("taxminiy", "klinik emas", "norasmiy",
"me'yorlanmagan", "namuna") YO'Q — ular ishonchni tushiradi. Hammasi
**Foydalanish shartlari** (oferta, `src/site/pages.mjs` → `/shartlar/`)
sahifasida to'liq yoziladi; ilovada Sozlamalar → «Foydalanish shartlari»
havolasi bor (§14). Ilova muhitida raqobat hissi bo'lishi kerak (liga
darajalari, ball, shaxsiy rekord).

1. **Natija ekrani:** katta IQ raqami va uning ostida BITTA kichik
   xira qator — oraliq, professional hisobotlardagidek: "Oraliq
   97–119". Izoh jumlasi yo'q. Oraliq olib tashlanmaydi: u raqamni
   ishonchliroq qiladi, xatoni esa yashirmaydi.
2. **Rad qilish matni** — faqat Foydalanish shartlarida: *"IQuest
   testi klinik diagnostika vositasi emas va hech qanday tashkilot
   tomonidan tasdiqlanmagan. Natija savollarga bergan javoblaringiz
   asosida statistik baholanadi va xatolik oralig'iga ega."*
3. **"IQ oshiradi" deb VA'DA QILINMAYDI.** Mashq qilingan topshiriqda
   natija oshadi — bu isbotlangan. Umumiy aqlga ko'chishi — isbotlanmagan
   (AQShda Lumosity shunday va'dalar uchun FTC bilan kelishuvda 2 mln $
   tovon to'lagan; LearningRx "IQ 12 haftada 15 ballga oshadi" degani
   uchun jazolangan — raqamli va'da bizga eng yaqin xavf). Mumkin:
   "mantiqiy fikrlashni mashq qiling", "natijangiz o'sishini kuzating".
   Mumkin emas: "IQ'ingizni 20 ballga oshiring", "aqlli bo'ling".
4. **"Rasmiy", "sertifikatlangan/akkreditatsiyalangan test", "Mensa",
   "klinik"** degan ishoralar yo'q — test hech qanday tashkilot
   tomonidan tasdiqlanmagan. IQuest'ning O'Z sertifikati (§6.7) bundan
   mustasno: u "IQuest.uz tomonidan berilgan" deb aniq yoziladi.
   Ingliz tilida ham: official, certified, accredited, clinical, Mensa,
   percentile, «smarter than», «raise/boost/increase your IQ» — roʻyxat
   `tools/honesty.mjs` da (§17).
5. `reliable: false` bo'lsa IQ raqami ko'rsatilmaydi — faqat to'g'ri
   javoblar soni. (Haqiqatga yaqinlik talabi: 10 savollik mashqdan
   IQ chiqarish — to'qima raqam.)
6. **Natija hech qachon pul ortida emas.** Test va uning natijasi (oraliq
   bilan) bepul. IQ-test janrining №1 shikoyati — "natijani ko'rish uchun
   yashirin obuna" (Buyuk Britaniyada bunday reklama taqiqlangan).
7. **Mahsulot egasining qarori (2026-09-25):** liga, reyting,
   IQ o'yinlari va sertifikat BO'LADI. Mezon — Google Play siyosati
   (Deceptive Behavior, Health claims). Shunga ko'ra:
   - **Sertifikat** IQuest.uz tomonidan beriladi: "IQuest testi natijasi"
     — IQ natijasi, oraliq, sana, ism, noyob kod va tekshirish havolasi
     (iquest.uz/sertifikat/?kod=…). Faqat SERVERDA qayta hisoblangan
     (§10), `reliable: true` test uchun. "Rasmiy IQ", "klinik",
     davlat/Mensa bilan bog'liqlik ishorasi yo'q.
   - **O'yinlar** "IQ o'yinlari" / "aql o'yinlari" deb ataladi. Do'kon
     va reklama matnida "IQ'ingizni X ballga oshiradi" kabi KAFOLAT va
     raqamli va'da yo'q — Play shuning uchun ilovani olib tashlashi
     mumkin. "Mashq qiling, natijangiz o'sishini kuzating" — mumkin.
   - **Liga** — faollik ballari bo'yicha (haftalik). **Reyting** — eng
     yaxshi tekshirilgan IQ natijasi va umumiy ball bo'yicha. Ikkalasi
     ham faqat serverda tekshirilgan natijalardan (§10). v1.x da liga
     mahalliy va faqat o'zing bilan poyga (§13), boshqa odamlar ro'yxati yo'q.
   - Hanuz YO'Q: persentil / "aholining X% idan aqlliroq" (norm yo'q —
     bu to'qima raqam), sog'liq da'volari (diqqat buzilishi, demensiya,
     xotira kasalligi).
8. **Qabul imtihonlari.** Akademik litsey, ijod maktablari, El-yurt
   umidi testlarida IQ/mantiq bo'limi bor — "shu turdagi topshiriqlarni
   mashq qiling" deyish mumkin. **DTM'da mantiq bo'limi YO'Q** — "DTM'ga
   tayyorlaydi" deyish yolg'on. "Rasmiy", "agentlik bilan bog'liq"
   degan ishora ham yo'q.

---

## 9. O'yinlar — `src/games/`

Test savollaridan tashqari interaktiv "IQ o'yinlari". Reyestr:
`src/games/index.js` (integratorniki). Namuna: `src/games/demo.js`.

```js
IQ.games.register({
  id: 'schulte',                     // barqaror, [a-z0-9-]
  title: { uz, ru, en? }, desc: { uz, ru, en? },
  langs?: ['uz','ru'] | ['uz','ru','en'],   // §2 dagi kabi; yoʻq → ['uz','ru']
  skill: 'attention' | 'memory' | 'speed' | 'logic' | 'spatial',
  create(seed, level) → Game,        // level 1..10, deterministik (IQ.rng)
});

Game = {
  view()          → GameView,        // joriy holat — faqat ma'lumot
  tap(i, now)     // grid katagi bosildi
  press(id, now)  // tugma bosildi
  tick(now)       → bool             // vaqt o'tishi; ko'rinish o'zgarsa true
  done            // getter
  log()           → [{ t, k: 'tap' | 'press' | 'tick', v }]   // replay uchun
  result()        → { score, points, correct, total, durationMs, nextLevel }
}

GameView = {
  phase:   'intro' | 'show' | 'input' | 'feedback' | 'done',
  prompt:  { uz, ru, en? },
  hud:     [{ label: { uz, ru, en? }, value: string }],    // ≤ 3 ta
  display: null | { kind: 'text', uz, ru, en? } | { kind: 'svg', svg },
  grid:    null | { cols: 2..6, cells: [{ label: string, svg?, state }] },   // ≤ 36 katak
           // state: 'idle' | 'lit' | 'ok' | 'bad' | 'hidden' | 'disabled'
  buttons: [{ id, label: { uz, ru, en? }, kind: 'primary' | 'secondary' }],    // ≤ 4 ta
  progress: 0..1,
}
```

Qoidalar:
- **Vaqt faqat `now` argumentidan.** O'yin ichida `Date.now()`,
  `setTimeout`, `Math.random()` TAQIQLANGAN. Ilova har ~100 ms da
  `tick(Date.now())` chaqiradi va `true` bo'lsa qayta chizadi.
- **Replay:** `IQ.games.replay(id, seed, level, log)` aynan shu
  `result()` ni berishi SHART — test bilan isbotlanadi. Server shu
  orqali ballni tekshiradi.
- **points** — liga uchun. Normal o'yin (≈ 1–2 daqiqa) ≈ 30–150 ball;
  formula izohlanadi; imkonsiz tezlik (masalan bosishlar orasida < 120 ms
  ketma-ket) ball bermaydi — bot/avtoklikerga qarshi.
- `validateView(view)` har holatda bo'sh — test minglab tasodifiy
  bosishlar bilan tekshiradi (o'yin hech qachon buzuq ko'rinish bermaydi).
- **Tillar** (§2 qoidasi): matn obyektlari `{ uz, ru, en? }`, `en` bor
  boʻlsa boʻsh boʻlmagan satr. Oʻyin `langs` da `'en'` ni eʼlon qilsa,
  `register` `title.en`/`desc.en` ni talab qiladi, `validateView(view, id)`
  esa HAMMA matnda (prompt, hud yorligʻi, matnli display, tugma) `en` ni
  talab qiladi. Ikkinchi argument — oʻyin `id` si (yoki tillar massivi);
  nomaʼlum `id` — xato. Argumentsiz — eski xulq (`en` ixtiyoriy).
  `'en'` eʼlon qilgan oʻyinning testi `validateView(v, ID)` ni chaqiradi.
  Oʻyin ichidagi `T(uz, ru)` yordamchisi `T(uz, ru, en)` boʻladi.
- `IQ.games.langsOf(id) → string[]` — eʼlon qilingan tillar nusxasi
  (nomaʼlum `id` → `[]`).
- Rang yagona farq emas (§2 dagi kabi). Katak holatlari ilova
  tomonidan chiziladi; `svg` faqat katak ICHIDAGI rasm uchun.

---

## 10. Server tekshiruvi, sertifikat, liga, reyting

Mijozdagi hamma narsani o'zgartirish mumkin (APK ochiladi, so'rov qo'lda
yuboriladi). Shuning uchun **ball, liga va sertifikat faqat server qayta
hisoblagan natijadan** chiqadi:

- Test: mijoz `{ seed, mode, types, length, items: [{ id, answer, ms }] }`
  yuboradi. Server (Supabase Edge Function) har `id` dan savolni AYNI
  generator kodi bilan qayta yaratadi, `answer` ni tekshiradi, `IQ.score`
  bilan qayta hisoblaydi. Adaptiv ketma-ketlik ham tekshiriladi:
  `IQ.session.restore` jurnalni qayta o'ynaganda aynan shu `id`lar chiqishi
  kerak (aks holda mijoz oson savollarni tanlab olgan).
- O'yin: mijoz `{ game, seed, level, log }` yuboradi, server
  `IQ.games.replay` bilan ballni qayta chiqaradi.
- Sertifikat: faqat `mode: 'test'`, `reliable: true`, server tasdiqlagan
  natija uchun; oraliq ochiq uchi ilovadagidek «≤{hi}» / «{lo}+» (§4); kod — tasodifiy, taxmin qilib bo'lmaydigan
  (masalan `IQ-7K3P-92XQ`); tekshirish sahifasi faqat ko'rsatiladigan
  maydonlarni oladi (RPC orqali, jadvalni to'liq o'qish yo'q).
- Generator kodi o'zgarsa eski urug'lar boshqa savol beradi — shuning
  uchun natijada `engine` versiyasi saqlanadi va server shu versiyani
  qo'llab-quvvatlaydi (yoki eski natijani qayta tekshirmaydi).
  DIQQAT: `IQ.session.ENGINE` (hozir 2) faqat sessiya algoritmini qamraydi.
  Verbal kontent yoki darajasi o'zgarsa (urug' → yozuv moslamasi
  o'zgaradi) ENGINE oshiriladi (§2).
  Backend qurilganda saqlanadigan versiya generatorlar versiyasini ham
  o'z ichiga olishi kerak (ochiq masala).

---

## 11. Dizayn standarti (mahsulot egasining qarori, 2026-09-25)

Mezon — Nazariy'dagi premium, tartibli muhit. Har komponent va har
yozuv o'z joyini biladi.

1. **Har ekranda bitta asosiy harakat.** Foydalanuvchi keyin nima
   qilishini o'ylab o'tirmaydi. Sarlavha 1–3 so'z; ostida ko'pi bilan
   bitta qisqa qator. Kartochkalarda tushuntirish paragrafi yo'q.
2. **Joy siljimaydi (layout shift yo'q).** Sarlavha, HUD, progress
   chizig'i, variantlar panjarasi va pastki tugmalar doim bir joyda
   va bir o'lchamda. Paydo bo'lib-yo'qoladigan tugma yoki izoh uchun
   joy OLDINDAN ajratiladi. Sanagich va taymerlar `tabular-nums`.
   Rasm uchun `aspect-ratio` qutisi — yuklanganda hech narsa sakramaydi.
3. **Mashq izohi** javobdan keyin "Izoh" tugmasi ortida, qat'iy
   balandlikdagi aylantiriladigan joyda.
4. **Bir xil o'lchov tizimi:** kartochka radiusi, oraliqlar, shrift
   o'lchamlari va tugma uslubi hamma ekranda bir xil.
5. **Raqobat hissi:** Bosh ekranda liga darajasi va ball ko'rinadi;
   Reyting tabida liga zinapoyasi (Bronza → Kumush → Oltin → Platina
   → Olmos), joriy daraja, keyingisigacha progress, shaxsiy rekord.
   To'qima foydalanuvchilar ro'yxati YO'Q — umumiy reyting ro'yxati
   server (§10) tayyor bo'lganda qo'shiladi.

---

## 12. Profil — `src/profile.js`, `src/avatars.js` (WP2)

Toʻliq tafsilot: ARXITEKTURA §5. Bu yerda — majburiy qoidalar va API.

**Kalitlar:** `nz-profile` (profil) va `nz-avatar-img` (rasm, ≤ 64 000
belgi, ALOHIDA kalit — katta satr profil yozuvini sekinlashtirmasin).

```js
// nz-profile
{ v: 1, username: '', bio: '', color: 'purple',
  avatar: { kind: 'initial' } | { kind: 'preset', id: 'owl' } | { kind: 'photo' },
  showcase: null | ['first-test', 'compass'],   // ≤ 3; null — avtomatik (oxirgi 3 ta)
  updatedAt: 1759000000000 }
```

**Foydalanuvchi nomi (ixtiyoriy).** `^[a-z][a-z0-9._]{2,19}$`; ichida
`..`, `__`, `._`, `_.` yoʻq; `.` yoki `_` bilan tugamaydi. Kiritishda
kichik harfga oʻtadi, boʻshliq tashlanadi; tutuq belgisi va kirill qabul
qilinmaydi. **Band soʻzlar:** `iquest*`, admin, administrator, moderator,
moder, support, yordam, help, official, rasmiy, mensa, system, tizim, root,
null, undefined, bot, telegram, google, play. **Nomaqbul soʻzlar** (~150
uz/ru/en ildiz, `profile.js` ichida): avval normallashtirish — kichik
harf, kirill → lotin, leet (`0→o 1→i 3→e 4→a 5→s @→a`), keyin ildiz
boʻyicha. Nom berilmaguncha hamma joyda «Mehmon». Oflayn noyoblik
tekshirilmaydi: UI hech qachon «bu nom sizniki» demaydi (v2 da band qilish).

**Bio (ixtiyoriy).** 0–80 kod nuqtasi; yangi qator → boʻshliq, boʻshliqlar
siqiladi, chetlari kesiladi; havola rad etiladi
(`/https?:|www\.|t\.me\/|@\w{4,}|\.(uz|com|ru|org|net|me|io)\b/i`);
nomaqbul soʻz tekshiruvi nomdagi bilan bir xil.

**Xato kodlari → matn** (18 px qator, `--destructive-ink`): `len` «3–20 ta
belgi» · `start` «Harf bilan boshlansin» · `chars` «Faqat a–z, 0–9, nuqta
va _» · `format` «Nuqta va _ ketma-ket boʻlmasin» · `reserved` «Bu nomni
tanlab boʻlmaydi» · `bad` «Nomaqbul soʻz» · bio `len` «Koʻpi bilan 80 ta
belgi» · bio `link` «Havola qoʻshib boʻlmaydi».

**Foydalanuvchi matni** (nom, bio) hamma joyda `…Raw` kalit bilan
bogʻlanadi (`usernameRaw`, `bioRaw`, `editUsernameRaw`) va satrlar
MASSIVIDA uzatilmaydi — aks holda `nzI18n.deep` uni oʻgiradi va oʻzgargan
matn diskka qaytib yoziladi. Hech qachon tarjima ham, transliteratsiya ham
qilinmaydi (§15).

**Avatar.** `initial` — nomning bosh harfi (nom yoʻq → «M»), profil rangi
ustida, harf rangi — rangning `on` qiymati. `preset` — 16 ta bepul tayyor
avatar (12 hayvon + 4 geometrik) `window.IQ_AVATARS = [{ id, name, svg }]`
dan, koʻrsatish tartibi = massiv tartibi. Tayyor avatar: viewBox 96×96,
shaffof fon, faqat `#FFFFFF` shakl + `#1C1B29` (2 px kontur va detallar),
≤ 6 shakl, ≤ 1,6 KB, matn va inson yuzi yoʻq; `<img src=data:svg>` orqali
(§2 SVG qoidalari, `validateItem` darajasidagi xavfsizlik). `photo` —
rasm `nz-avatar-img` da. Oʻlchamlar: 32/40/64/88/112/160, doim
`aspect-ratio:1/1` + `object-fit:cover`.

**Rasm quvuri** (`preparePhoto(file, align)`):
- `<input type="file" accept="image/jpeg,image/png,image/webp">`, `capture`
  atributi YOʻQ (tizim tanlagichi; `CAMERA`/`READ_MEDIA_IMAGES` ruxsati
  kerak emas — Play foto siyosati). Input markupda DOIM bor, yashirin,
  shartli bloklardan tashqarida; tugma `input.click()` bilan ochadi.
- > 15 MB — dekodlashdan OLDIN rad (`size`). Dekodlash
  `createImageBitmap(file, {imageOrientation:'from-image'})`, zaxira
  `FileReader.readAsDataURL` → `Image`; blob URL yoʻq (CSP). Dekodlanmasa
  (masalan HEIC) — `decode`.
- Kvadrat kesish: portret `top|center|bottom` (standart `top`), albom
  `left|center|right`. 256×256, `toDataURL('image/jpeg', 0.82)`;
  > 64 000 belgi → 0,70 → 0,60 → 192 px.
- `preparePhoto` diskka YOZMAYDI. Yozish faqat «Saqlash» →
  `commitPhoto(dataUrl)`; `QuotaExceeded` → `{ ok: false, err: 'quota' }`,
  yarim holat yoʻq. Rasm v1.x da qurilmadan chiqmaydi.

**Profil rangi.** 12 ta (hex faqat `src/catalog.js` da, §13). FAQAT
identifikatsiya yuzalarida: avatar foni, Boshdagi 2 px halqa, Profil
tasmasi (18 %). Ilova xromiga, tugmaga, diagrammaga TUSHMAYDI.

**Vitrina.** ≤ 3 nishon (olingan yutuq yoki sotib olingan kolleksiya
nishoni). `showcase: null` — avtomatik (oxirgi 3 ta); birinchi «Vitrinaga
qoʻyish/olish» dan keyin aniq roʻyxatga aylanadi.

<!-- api -->
```js
nzProfile: get(), save(patch) → { ok, errs: { username?, bio? } },   // hammasi yoki hech narsa
           validateUsername(s) → null|'len'|'start'|'chars'|'format'|'reserved'|'bad',
           cleanBio(s) → { value, err: null|'len'|'link'|'bad' },
           photo() → dataUrl|null,
           preparePhoto(file, align) → Promise<{ ok, dataUrl?, shape?, err? }>,   // shape: portrait|landscape|square; err: type|size|decode|encode
           commitPhoto(dataUrl) → { ok, err? }, removePhoto(), reset()
IQ_AVATARS: 16 ta tayyor avatar — statik maʼlumot
```

---

## 13. Iqtisod — `src/wallet.js`, `src/badges.js`, `src/league.js`, `src/catalog.js` (WP3)

Toʻliq tafsilot: ARXITEKTURA §6, §10.

**Ikki valyuta qatʼiy ajratilgan.**

| | **Ball** ◆ (binafsha, `--ball`) | **Tanga** ● (oltin, `--coin`) |
|---|---|---|
| Nima uchun | Haftalik ligada koʻtarilish | Profilni bezash (Doʻkon) |
| Qayerdan | Toʻgʻri javob +10 (bir savolga bir marta), oʻyin 30–150 | Kunlik vazifalar, yutuq nishonlari, hafta yakuni, xush kelibsiz |
| Sarflanadimi | HECH QACHON | Faqat Doʻkonda |

Bir-biriga aylantirilmaydi; xarid ball, liga, IQ yoki darajaga taʼsir
qilmaydi. IAP yoʻq, tasodifiy mukofot (quti, lotereya) yoʻq, narxlar
qatʼiy va doim koʻrinadi. Yutuq nishonini sotib olib boʻlmaydi. Oltin rang
ilova xromida faqat tangaga tegishli.

**Liga** (haftalik ball, dushanba–yakshanba; `LEAGUES` Mainʼda):
Boshlovchi 0 · Bronza 150 · Kumush 500 · Oltin 1 200 · Platina 2 500 ·
Olmos 5 000. v1.x da faqat oʻzing bilan poyga: boshqa odamlar roʻyxati
yoʻq, `leaderboardRows()` ilgagi server uchun saqlanadi.

**Tanga manbalari — 4 ta, hammasi chegaralangan va kalit boʻyicha takrorlanmaydi:**

| Manba | Miqdor | Chegara | Kalit (`credit(n, src, key)`) |
|---|---|---|---|
| Kunlik vazifalar q1–q3 | har biri +10 | kuniga ≤ 30 | `q:<kun>:<q1\|q2\|q3>` |
| Yutuq nishoni | 10–150 | bir marta | `b:<id>` |
| Hafta yakuni | 0 / 10 / 25 / 40 / 60 / 100 (liga boʻyicha) | haftasiga bir marta | `w:<dushanba>` |
| Xush kelibsiz | 50 | bir marta | `welcome` |

**Hech qachon berilmaydi:** har javob uchun, ilovani ochgani uchun, IQ
test topshirgani/qayta topshirgani uchun (faqat bir martalik «Birinchi
test» nishoni), tasodifiy sandiq, pul evaziga.

**Kunlik vazifalar** (`nzWallet.quests(day, ctx)`; kun `dayKey`, 04:00 da
almashadi; roʻyxat kun boshida BIR MARTA tuziladi va qayta hisoblanmaydi):

| Id | Nima hisoblanadi | Maqsad |
|---|---|---|
| q1 «Bugungi mashq» | mashq VA takrorlash rejimidagi har javob | 10 |
| q2 «Aql oʻyini» | istalgan tugallangan oʻyin (demo emas) | 1 |
| q3a «Xatolarni tuzating» | takrorlashdagi toʻgʻri javob; faqat kun boshida Xatolarimda ≥ 3 savol boʻlsa | 3 |
| q3b «{Tur} mashqi» | mashq/takrorlashda shu turdagi javob; tur — `levelFor` boʻyicha eng past (teng boʻlsa `IQ.types()` tartibi) | 5 |

TEST JAVOBLARI HECH BIR VAZIFAGA KIRMAYDI. Qulflangan vazifa yoʻq.
Vazifa bajarilishi bilan `track()` tangani OʻZI beradi va natijani
qaytaradi — Main faqat koʻrsatadi.

**Hafta yakuni.** Main ilova ochilganda va har yangi hafta boshida
`nz-iq-ui.days` oynasidagi (21 kun, koʻpi bilan 2 ta) yopilgan, hisob-kitob
qilinmagan haftalarni oladi: hafta balli → `nzLeague.close(dushanba, ball)`
(`true` — yangi yopilish) → liga → `credit(mukofot, 'week', 'w:'+dushanba)`
→ mukofot > 0 boʻlsa bayram kartasi.

**Yutuq nishonlari — 21 ta** (jami 870 tanga; id lar ARXITEKTURA §6.6):
faqat oʻynab olinadi, HECH QACHON qaytarib olinmaydi. IQ chegarasiga
bogʻliq nishon YOʻQ (hech bir qoida `iq` maydonini oʻqimaydi — test
manbani tekshiradi); nomlarda «Daho», «Top X %», real odamlar, «rasmiy»
yoʻq. Tekshiriladi: `finishRun`, `finishGame`, har javobdan keyin, profil
saqlanganda, hafta yopilganda, ilova ochilganda. `stats` (Main yigʻadi):
`answered, testsDone, longestStreak, bestWeekBall, levels{matrix, series,
spatial, verbal}, games{id:{plays, level}}, fixes, lastRun{kind, n, correct},
profileComplete`. Yangilangan (1.0 → 1.1) foydalanuvchida orqaga qarab
hisoblanadi, bitta yigʻma kartada koʻrsatiladi.

**Doʻkon katalogi** (`window.nzCatalog`, BITTA jadval — barcha iqtisod
raqamlari shu yerda): 12 profil rangi (6 tasi bepul; 4 × 150, 2 gradient
× 300 — jami 1 200; standart `purple`), 8 kolleksiya nishoni (300–800,
jami 3 900; yumaloq medalyon, tanga halqasi — yutuqlar esa olti burchak),
Doʻkon hajmi 5 100. `rewards: { welcome: 50, quest: 10, weekly: [0, 10,
25, 40, 60, 100] }`, `quests: { practice: 10, game: 1, fix: 3, type: 5 }`.
Xarid id si: `'color:red'`, `'badge:compass'`. Har rangning `on` qiymati
rangga (gradientda ikkala toʻxtashga) nisbatan WCAG ≥ 3:1 — testda
hisoblanadi. Nomlar matn obyekti `{uz, ru, en}` (oʻzbekchasi — lugʻat
manba satri, §15).

**Himoya.** Har kirim `credit(n, src, key)` orqali va kalit boʻyicha
takrorlanmaydi (migratsiya oʻrtasida yiqilsa ham). **Soat himoyasi:**
`nz-wallet.maxSeen`; `now < maxSeen − 6 soat` boʻlsa vazifa progressi va
vazifa/hafta mukofotlari soat `maxSeen` dan oʻtguncha toʻxtaydi. Jurnal
≤ 100 yozuv. `credited` tozalash: `q:` > 21 kun, `w:` > 16 hafta; `b:` va
`welcome` abadiy. Refund yoʻq, xarid doimiy, balans hech qachon manfiy
emas. **Simulyatsiya** (`tests/economy-sim.test.mjs`, 30 kun, 15–30-kun
haftalik daromad): faol 200–320, oddiy 80–160, kam 20–80 — chiqsa CI yiqiladi.

**Maʼlumot shakllari va versiya** (ARXITEKTURA §10.2–§10.3 — majburiy):

```js
// nz-wallet
{ v: 1, balance, earned, spent,
  owned: { colors: ['red'], badges: ['compass'] },   // bepul ranglar saqlanmaydi
  credited: { 'welcome': 1, 'b:first-test': 1, 'w:2026-09-14': 1, 'q:2026-09-25:q1': 1 },
  quests: { day: '2026-09-25', list: [{ id: 'q1', kind: 'practice', target: 10, n: 3 }, …] },
  maxSeen, ledger: [{ at, amt, src, key }] }          // ≤ 100
// nz-badges
{ v: 1, earned: { 'first-test': 1759000000000 }, seen: ['first-test'], counters: { fixes: 12 } }
// nz-league
{ v: 1, weeks: { '2026-09-14': 620 }, best: { w, ball }, announced: { w, tier } }   // weeks ≤ 12
```

Har yangi kalit: `const V = 1`; `sane(raw)` — `v === V` → har maydon
alohida tekshiriladi (`Object.create(null)` xaritalar, chegaralar, ruxsat
roʻyxatlari); `v < V` → `migrate` zanjiri; `v > V` (ilova eski versiyaga
qaytarilgan) → xotirada standart qiymat va `readOnly = true`, YANGI
MAʼLUMOT USTIGA HECH QACHON YOZILMAYDI; buzilgan/yoʻq → standart, ilova
yiqilmaydi (`localStorage` ishlamasa ham). **`nz-iq-ui` versiyasi
OSHIRILMAYDI** (`uiSane()` `v !== 1` da roʻyxatlarni oʻchiradi) — liga
tarixi shuning uchun alohida `nz-league` da.

**Modul chegaralari.** Main — yagona orkestrator. Holatli modullar
bir-birini CHAQIRMAYDI: wallet nishonlarni bilmaydi, badges hamyonni
bilmaydi, profile ularning hech birini bilmaydi. Statik maʼlumotni
(`nzCatalog`, `nzIcons`, `IQ_AVATARS`, `nzArt`) istalgan modul oʻqiydi.

**Nomlash cheklovi** (build tekshiradi): mobil kodda MONEY_NAMES
(`openPay`, `confirmPay`, `valsMoney`, `openPro`, `openRedeem`,
`payStepMethod`, `proFinePrint`, `plansFrom`, `PRO_BENEFITS`, `PAY_METHODS`)
va FORBIDDEN_CODE (`ROLES`, `REASONS`, `logAction`, …) taqiqlangan. Doʻkon
kodida: `valsShop`, `openBuy`, `buyItem`, `confirmBuy`; v2 da
`REPORT_KINDS`, `MEMBER_KINDS`.

**«Maʼlumotlarni oʻchirish»** (§10.6 ARXITEKTURA): `nz-progress`,
`nz-attempts`, `nz-iq-tests`, `nz-iq-ui`, `nz-iq-run`, `nz-profile`,
`nz-avatar-img`, `nz-wallet`, `nz-badges`, `nz-league` oʻchadi; `nz-lang`,
`nz-theme`, `nz-settings` QOLADI (xush kelibsiz bonusi qayta berilmaydi).
Keyin bildirishnoma rejasi qayta tuziladi.

**v2.** Hamyon serverga oʻtadi; mahalliy balans bir marta `min(balans,
1 500)` bilan import qilinadi, xaridlar oʻzgarishsiz. `credited` kalitlari
→ `idem_key`.

<!-- api -->
```js
nzWallet:  balance(), state(), owns(itemId), credit(n, src, key) → bool,
           spend(itemId) → { ok, err? },   // err: unknown|owned|free|funds|readonly; itemId 'color:red' | 'badge:compass'
           quests(day, ctx) → [{ id, kind, type?, n, target, done, reward }],   // ctx: { wrongCount, weakestType, gameOfDay }
           track(evt) → [{ id, reward }],   // evt: { type: 'answer', mode, correct, itemType } | { type: 'game', id }
           touch(now), ledger(n), reset()
nzBadges:  catalogue(), earned(), check(stats, now) → [yangi id], progress(id, stats) → { n, target }|null,
           bump(counter, n), counters(), unseen(), markSeen(ids), reset()
nzLeague:  close(weekStart, ball) → bool, weeks(n) → [{ w, ball }], best() → { w, ball }|null,
           announced(w) → tier|-1, announce(w, tier), reset()
nzCatalog: .colors, .badges, .rewards, .quests, item(itemId)
```

---

## 14. Sozlamalar va eslatmalar — `src/settings.js`, `src/notify.js`, `src/feedback.js`, `src/bootstrap.js` (WP1)

Toʻliq tafsilot: ARXITEKTURA §7, §9.5, §4.

```js
// nz-settings
{ v: 1, sound: true, haptics: true,
  remind: { on: false, h: 19, m: 0 }, streakRemind: false,
  onboard: { done: true, at: 1759000000000, from: '1.1.0' },
  tips: { testIntro: false } }
```

- **Migratsiya** (`settings.js` yuklanishi bilan, bootstrapʼning birinchi
  `save()` idan OLDIN): `nz-settings` yoʻq boʻlsa `nz-progress.soundOn`/
  `notifOn` dan `sound`/`remind.on` ga bir marta koʻchiriladi (`null` →
  standart). `progress.js` `save()` endi `soundOn`/`notifOn` ni QAYTA
  YOZMAYDI (WP4). Yangi oʻrnatishda `remind.on = false`, `streakRemind = false`.
- `soundOn`/`notifOn` Main stateʼidan olib tashlanadi — yagona uy `nzSettings`.
- **Sozlamalar ekrani** (L1, Profildagi tishli gʻildirakdan; Profilda
  sozlama qatori QOLMAYDI). Boʻlimlar: Umumiy (Til → `lang` varagʻi, Tema
  → `theme`), Ovoz (Ovoz effektlari, Tebranish — `navigator.vibrate` yoʻq
  boʻlsa yashirin), Bildirishnomalar (Kunlik eslatma, Vaqt, Streak
  eslatmasi — LocalNotifications plagini yoʻq boʻlsa BUTUN boʻlim
  yashirin; eslatma oʻchiq boʻlsa «Vaqt» 40 % xira, yoʻqolmaydi), Yordam
  (Qanday ishlaydi → birinchi kirish qayta koʻrish; Aloqa —
  `!nzSite.contactReady` da yashirin; Ilovani baholash — `nzSite.playUrl`
  boʻsh boʻlsa yashirin), Huquqiy (Foydalanish shartlari, Maxfiylik
  siyosati: uz/uz-cyrl → `/<slug>/`, ru → `/ru/<slug>/`, en →
  `/en/<slug>/`, `nzSite.siteUrl` ga nisbatan), Maʼlumotlar
  (Maʼlumotlarni oʻchirish → dialog). Pastda «IQuest {nzSite.version}».
- **`nzSite`** (build yasaydi, `site.config.json` va `version.json` dan):
  `{ telegramBot, siteUrl, startView, version, contactReady, playUrl,
  langs }`. `contactReady = !/PLACEHOLDER/.test(contactEmail)`; aloqa
  manzilining oʻzi bundleʼga QOʻYILMAYDI. `langs` — §15.
- **Birinchi kirish:** yangi oʻrnatish (`nz-settings` yoʻq va hech qanday
  javob/test yoʻq) → 0…5 qadam; 1.0 dan yangilash → 3 → 4; qayta koʻrish
  (Sozlamalar → «Qanday ishlaydi») → 1 → 2 → 3. Oxirida
  `markOnboarded(ver)`; oʻrtada oʻldirilsa boshidan. `tips.testIntro` —
  «Test qanday oʻtadi» varagʻi bir marta (`tip`/`markTip`).
- **Bildirishnomalar** — faqat mahalliy, `isExactNotification: false`
  (`SCHEDULE_EXACT_ALARM` yoʻq). Kunlik eslatma ID 1901–1907 (keyingi 7
  kunning har biri, bir martalik; bugun faol boʻlsa yoki vaqt oʻtgan boʻlsa
  bugungisi yoʻq). Streak eslatmasi ID 1911, 21:30, faqat `streak ≥ 2`:
  bugun faol → ertaga, aks holda (hozir < 21:30) bugun. Kuniga ≤ 2: eslatma
  vaqti ≥ 19:30 boʻlsa oʻsha kuni streak eslatmasi yoʻq. Matn reja
  tuzilayotgan tilda (`nzT`, `nzTN`). `buildPlan` — SOF funksiya.
  `apply` avval 1901–1907 va 1911 ni bekor qiladi. Qayta tuzish: ochilish,
  fonga ketish/qaytish, kunning birinchi faoliyati, eslatma sozlamasi yoki
  til oʻzgarishi. Bosilganda `extra: {to:'home'}` → `app.openFrom(to)`
  (savol/oʻyin ketayotgan boʻlsa hech narsa almashmaydi). Kichik ikonka
  `ic_stat_iquest`.
- **Ruxsat** (`POST_NOTIFICATIONS`) faqat foydalanuvchi niyati bilan:
  birinchi kirishdagi [Yoqish] yoki almashtirgich. Rad etilsa almashtirgich
  qaytadi, toast «Bildirishnomaga ruxsat berilmagan — tizim sozlamalaridan
  yoqing». Inbox v1.x da YOʻQ.
- **Ovozlar** (`nzFeedback`, WebAudio sintezi, 0 bayt aktiv): select,
  correct, wrong, finish, gameStart, levelUp, coin, purchase, badge,
  leagueUp, streak, denied. Choʻqqi gain ≤ 0,16 (fanfara ≤ 0,12); 60 ms
  ichida bittadan ortiq emas; fonda ovoz yoʻq; navigatsiyada ovoz yoʻq;
  **TEST paytida faqat `select`** (toʻgʻri-notoʻgʻri sezdirilmaydi). Ovoz
  va tebranish alohida almashtirgich. Eski `correct`/`wrong`/`finish`/
  `setEnabled` taxallus sifatida qoladi.

<!-- api -->
```js
nzSettings: get(), set(patch) → nusxa, isOnboarded(), markOnboarded(ver),
            tip(id) → bool, markTip(id), readOnly()
nzNotify:   available(), buildPlan(now, cfg, ctx) → [{ id, at, title, body, extra }],   // cfg: nzSettings.get(); ctx: { activeToday, streak, lang }
            apply(plan, opts) → Promise<holat>   // opts: { interactive }; holat: scheduled|denied|no-permission|unsupported|error
nzFeedback: play(name), configure(opts)   // opts: { sound, haptics }
nzProgress: activeToday() → bool, markActive(), testStats()   // qoʻshimcha; mavjud API (§5) saqlanadi
```

---

## 15. Tillar va EN darvozasi — `src/i18n*.js`, `tools/i18n-extract.mjs` (WP5), kontent egalari (WP10a–f), `/en/` sahifalar (WP9)

Toʻliq tafsilot: ARXITEKTURA §8.

**Egasining qarori (2026-09-25, №3):** ingliz tili SHU bosqichda
quriladi (WP5, WP9, WP10a–f parallel). U til tanlovida va birinchi
kirishda FAQAT darvoza (pastda) ochiq buildʼda chiqadi. Darvoza yopiq
boʻlsa reliz uz / uz-cyrl / ru bilan chiqadi — yarim inglizcha build
foydalanuvchiga YETMAYDI.

**UI lugʻati.** `LANGS = ['uz', 'uz-cyrl', 'ru', 'en']`; til nomlari oʻz
yozuvida: «Oʻzbekcha», «Ўзбекча», «Русский», «English». `src/i18n-en.js` →
`window.nzEn`, `nzRu` kabi aniq oʻzbekcha manba satr bilan kalitlanadi.
Qiymat — satr yoki koʻplik obyekti (en `{one, other}`, ru `{one, few,
many}`); `nzI18n.plural(tpl, n)` va global `nzTN(tpl, n)` —
`Intl.PluralRules`. Raqam va sana hamma tilda bir xil («1 200»,
dd.mm.yyyy, 24 soat). `<html lang="en">`. Foydalanuvchi matni (`…Raw`) hech
qachon oʻgirilmaydi. Katalog, nishon va avatar nomlari shu lugʻat (yoki
`{uz, ru, en}` obyekt) orqali.

**Kontent.** Matn obyekti `{ uz, ru, en? }` va `langs` — §2 (generatorlar)
va §9 (oʻyinlar). `content/verbal.json` — 134 yozuvning HAMMASIDA `en` va
`explain.en` (§2). Inglizcha test uz/ru testi bilan BIR XIL tarkibda: per-tur
filtrlash yoʻq, savol ID si tilga bogʻliq emas.

**Zaxira.** UI: `nzEn[key] || oʻzbekcha manba`. Kontent: `pickLang(v,'en')
= v.en || v.uz`, `pickLang(v,'ru') = v.ru || v.uz` — zaxira HECH QACHON rus
tiliga tushmaydi. Zaxira faqat yiqilishdan himoya; chiqarilgan buildʼga
u yetib bormaydi (darvoza). Eski snapshotʼda `en` boʻlmasa oʻzbekcha
koʻrsatiladi, savol oʻzgarmaydi.

**Darvoza («hammasi yoki hech narsa»).** `build.mjs` 4 shartning HAMMASI
bajarilganda `nzSite.langs` ga `'en'` ni qoʻshadi:

1. **UI lugʻati toʻliq:** `tools/i18n-extract.mjs` boʻyicha `nzEn` da
   yetishmayotgan kalit 0 ta. Build modulni `import()` qiladi va
   `coverage({ root, langs: ['en'] })` ni chaqiradi: `missing.en` (lugʻatda
   yoʻq satrlar) va `triplets.missingEn` (`{uz, ru, en}` obyektlarida `en`
   yoʻq joylar — katalog, nishon, avatar) ikkalasi ham boʻsh boʻlishi shart.
   (Zaxira: `missing(dict, 'en') → string[]` yoki `extract()`.)
   `src/i18n-en.js` `node:vm` da yuklanadi (`window.nzEn`).
2. **Hamma generator va oʻyin `en` ni eʼlon qilgan:** build IQ bundleʼni
   `node:vm` da yuklaydi; `IQ.types()` ning har biri uchun
   `IQ.langsOf(t)` va `IQ.games.list()` ning har biri uchun
   `IQ.games.langsOf(id)` da `'en'` boʻlishi shart (roʻyxat boʻsh boʻlmasin).
   Qoʻshimcha namuna: har tur uchun har darajada bitta `makeItem`
   (`validateItem` `en` ni talab qiladi), har oʻyin uchun
   `validateView(view, id)`. Bundle faylidan biri yuklanmasa — darvoza yopiq.
3. **Verbal toʻliq:** `content/verbal.json` dagi HAR yozuvda `en.prompt`,
   `en.stimulus`, `en.options` (soni uz bilan bir xil, boʻsh emas) va
   `explain.en`.
4. **Inglizcha huquqiy sahifalar:** `src/site/pages.mjs` —
   `legalReady(cfg, 'en') → bool` (`/en/shartlar/` va `/en/maxfiylik/`
   tayyor, Shartlarda toʻliq rad qilish matni). Bunday eksport boʻlmasa
   build `allPages(cfg)`/`pages(cfg)` roʻyxatida `en/shartlar` va
   `en/maxfiylik` yoʻllarini qidiradi (`{ lang:'en', slug }` yoki
   `slug:'en/…'`/`path`).

Bitta shart bajarilmasa: English til tanlovida ham, birinchi kirishda ham
CHIQMAYDI, build esa sabablarni ogohlantirish sifatida yozadi (build
yiqilmaydi). `node build.mjs --lang-en` — ishlab chiqish uchun darvozani
majburan ochadi. `src/i18n.js` darvoza holatini `window.nzSite.langs` dan
(dangasa, `nzSite` undan keyin yuklanadi) oʻqiydi; `'en'` yoʻq boʻlsa
saqlangan `'en'` tanlovi qurilma tiliga qaytadi (oʻchirilmaydi).

**Egalar testlari** (har biri oʻz faylida, 2 000 urugʻ / tasodifiy oʻyin):
`en` bor va boʻsh emas; `en` da kirill va `ʻ` yoʻq; ID tilga bogʻliq emas;
`verify` hamma tilda bir xil. `tests/i18n-coverage.test.mjs` —
`tools/i18n-extract.mjs` yigʻgan satrlar ru va en lugʻatida (istisno: brend
soʻzlar IQuest, IQ, Telegram, Google Play).

<!-- api -->
```js
nzI18n: get(), set(lang), t(s), deep(v, key), plural(tpl, n), .langs, .labels
window: nzT(s), nzTN(tpl, n)
IQ: langsOf(type), validateItem(item), makeItem(type, seed, level), types(), .CONTENT_LANGS
IQ.games: langsOf(id), validateView(view, id), list(), get(id), create(id, seed, level), replay(id, seed, level, log)
```

---

## 16. Navigatsiya darajalari (WP7, `src/Main.dc.html`)

Toʻliq tafsilot: ARXITEKTURA §0, §2, §3.

**Pastki menyu — 4 tab, tartib oʻzgarmaydi:** Bosh · Mashq · Reyting ·
Profil. v2 da 5-tab «Doʻstlar» (Reyting va Profil orasida) — faqat backend
bilan; `repeat(4,1fr)` langari integrator bilan birga oʻzgaradi.

| Daraja | Nima | Pastki menyu |
|---|---|---|
| L0 — Tab | Bosh, Mashq, Reyting, Profil | Bor |
| L1 — Ichki ekran (push) | Sozlamalar, Profilni tahrirlash, Nishonlar, Doʻkon; 56 px sarlavha (‹ · nom · 44 px joy) | Yoʻq |
| Toʻliq ekranli oqim | Birinchi kirish, Savol, Natija, Oʻyin | Yoʻq |
| Varaq (sheet) | `lang` 320 · `theme` 260 · `time` 300 · `avatar` 420 · `photo` 440 · `buy` 380 · `badge` 400 · `coinHelp` 320 · `testIntro` 340 (px, qatʼiy) | — |
| Dialog | Tasdiq (2 tugma), shu jumladan `unsavedProfile` | — |
| Bayram kartasi | Yangi nishon, liga koʻtarilishi, hafta yakuni (300×340); > 3 ta boʻlsa bitta yigʻma karta | — |
| Toast | 48 px pill, 2,4 s, hech narsani toʻsmaydi | — |

**Qoidalar:**
- L1 dan faqat L1 yoki varaq ochiladi; ichma-ichlik ≤ 1. Savol yoki oʻyin
  boshlanganda push-stek tozalanadi.
- `tabsOn = app && !run && !result && !game && !stack.length && !onboard`,
  `fullOn = !tabsOn` — build.mjs dagi `fullOn` langari satri OʻZGARMAYDI;
  ichki ekranlar `fullOn` konteyneri (`nz-screens-quiz`) ichida `stackOn`
  bloki sifatida chiziladi.
- Mainʼdagi yangi holat: `stack, sheet, dialog, onboard, celebrate, toast,
  edit, settings, profile, coins` (ARXITEKTURA §2.2); `soundOn`/`notifOn`
  olib tashlanadi.
- **«Orqaga» zanjiri** (`app.onBack`, tartib qatʼiy): dialog → varaq →
  bayram kartasi («Davom etish») → birinchi kirish (oldingi qadam; 0-qadamda
  `false`) → «Izoh» varagʻi → oʻyin → test/mashq tasdigʻi → natija →
  push-stek (tahrirlashda saqlanmagan oʻzgarish → `unsavedProfile`) →
  tab ≠ Bosh → Bosh → `false`. `bootstrap.js` faqat `app.onBack()` ni
  chaqiradi; holat nomlarini faqat Main biladi.
- **Bayram kartalari** savol va oʻyin paytida HECH QACHON chiqmaydi — faqat
  tab ekranlarida, Natijadan yoki Oʻyin yakunidan keyin. Kichik tanga (+10)
  uchun karta yoʻq: Natija/Oʻyin yakunidagi 28 px mukofot qatori yoki toast.
- **Har narsaning bitta uyi bor** (ARXITEKTURA §0.3). Yangi funksiya avval
  navigatsiya daraxtida uy oladi.
- **Layout shift yoʻq** (§11, ARXITEKTURA §9.6): shartli elementlar joyi
  oldindan ajratiladi, `visibility`/shaffoflik bilan yashiriladi; input
  yoki uning yordam qatori oldida shartli (`sc-if`) qoʻshni yoʻq.
- **Ijtimoiy qatlam (SOCIAL) — v1.x da UMUMAN YOʻQ:** chat, guruh,
  doʻstlar, inbox, «tez kunda» yozuvi, oʻchiq tugma, «doʻstni taklif
  qiling», soxta foydalanuvchi — yoʻq (Play: broken functionality,
  Deceptive Behavior). `build.mjs` da `SOCIAL_ON = false` turganda build
  kodda `valsFriends`, `valsChat`, `valsGroups`, `valsInbox`,
  `REPORT_KINDS`, `MEMBER_KINDS` nomlarini, markup va kod satrlarida
  «Doʻst…», «Suhbat…», «chat», «Guruh(lar)», «tez kunda», «coming soon»
  matnlarini topsa YIQILADI (MONEY_NAMES tekshiruvi bilan bir xil tartib).
- **NEED markerlari** (build): `valsSettings`, `valsShop`, `valsBadges`,
  `valsProfileEdit`, `valsOnboard` — manbada bor boʻlsa yigʻilgan faylda
  ham boʻlishi shart (kesish ularni tushirib qoʻymasin); `--strict` da
  manbada ham boʻlishi shart. WP7 `must()` langarlarini oʻzgartirmaydi
  (`repeat(4,1fr)`, telefon ramkasi, `fullOn` satri).

---

## 17. Glossariy — «ball» faqat liga uchun

**«Ball» soʻzi FAQAT liga ballari (◆) uchun.** IQ natijasi har doim «IQ»
yoki «natija» deb ataladi: «IQ balli», «test balli», «110 ball» — XATO.
Tanga — faqat ● va Doʻkon uchun. Test javoblari uchun tanga yoʻq.

| Oʻzbekcha (manba) | Русский | English |
|---|---|---|
| Bosh / Mashq / Reyting / Profil | Главная / Тренировка / Рейтинг / Профиль | Home / Practice / League / Profile |
| ball ◆ | баллы | points |
| tanga ● | монеты | coins |
| streak | серия | streak |
| Boshlovchi · Bronza · Kumush · Oltin · Platina · Olmos | Новичок · Бронза · Серебро · Золото · Платина · Алмаз | Beginner · Bronze · Silver · Gold · Platinum · Diamond |
| Kunlik vazifalar | Ежедневные задания | Daily quests |
| Xatolarim / Saqlangan | Мои ошибки / Сохранённые | My mistakes / Saved |
| IQ oʻyinlari / Aql oʻyini | IQ-игры / Игра для ума | IQ games / Brain game |
| Doʻkon / Nishonlar / Vitrina | Магазин / Значки / Витрина | Shop / Badges / Showcase |
| Sozlamalar / Eslatma | Настройки / Напоминание | Settings / Reminder |
| Oraliq | Диапазон | Range |
| IQ natijasi | результат IQ | IQ result |

Halollik taqiqlari (§6) hamma tilda amal qiladi; inglizcha roʻyxat:
official, certified, accredited, clinical, Mensa, percentile,
«smarter than», «raise/boost/increase your IQ» — `tools/honesty.mjs`
(testlarda va `mkbrand` da). Nishon nomlarida IQ, «daho», «top %» yoʻq.

---

## 7. Fayl egaligi (parallel ish paytida)

Har fayl bitta egaga tegishli. Boshqaning fayliga TEGMANG — kerak bo'lsa
yakunda hisobotga yozing, integratsiyada hal qilinadi. Jadval —
ARXITEKTURA §13.1 (v1.1 paketlari); `backend` va `cert` o'zgarmaydi.
`src/Main.dc.html` ning yagona egasi bor; `src/i18n-en.js` birgalikda
egalik qilinmaydi.

| Paket | Ega | Fayllar |
|---|---|---|
| WP0 / WP11 | integrator | `src/iq/CONTRACT.md`, `ARXITEKTURA.md`, `build.mjs`, `package.json`, `version.json`, `src/iq/{rng,index}.js`, `src/iq/gen/demo.js`, `src/games/{index,demo}.js`, `.github/workflows/js.yml`, `tests/api-surface.test.mjs`, `tests/build.test.mjs` |
| WP1 | device | `src/settings.js`, `src/feedback.js`, `src/notify.js`, `src/bootstrap.js`, `tests/settings.test.mjs`, `tests/feedback.test.mjs`, `tests/notify.test.mjs` |
| WP2 | profile | `src/profile.js`, `src/avatars.js`, `tests/profile.test.mjs`, `tests/avatars.test.mjs` |
| WP3 | economy | `src/wallet.js`, `src/badges.js`, `src/league.js`, `src/catalog.js`, `tests/wallet.test.mjs`, `tests/badges.test.mjs`, `tests/league.test.mjs`, `tests/catalog.test.mjs`, `tests/economy-sim.test.mjs` |
| WP4 | score | `src/progress.js`, `src/iq/score.js`, `src/iq/session.js`, `tests/progress.test.mjs`, `tests/iq-score.test.mjs`, `tests/iq-session.test.mjs` |
| WP5 | i18n | `src/i18n.js`, `src/i18n-ru.js`, `src/i18n-en.js`, `tools/i18n-extract.mjs`, `tools/honesty.mjs`, `tests/i18n.test.mjs`, `tests/i18n-coverage.test.mjs`, `tests/honesty.test.mjs` |
| WP6 | art | `src/icons.js`, `src/art.js`, `tests/icons.test.mjs`, `tests/art.test.mjs` |
| WP7 | ui | `src/Main.dc.html`, `src/runtime.js`, `src/shell.css`, `src/shell-admin.css`, `src/admin-*.js`, `tools/source.mjs`, `tools/uishots.mjs`, `tests/bulk.test.mjs`, `tests/runtime.test.mjs` |
| WP8 | brand | `tools/icon.html`, `tools/brand.html`, `tools/mkbrand.mjs`, `tools/mkicons.mjs`, `tools/mkog.mjs`, `tools/mkplay.mjs`, `resources/**`, `android/**`, `capacitor.config.json`, `site.config.json`, `PLAY.md`, `README.md`, `RASMLAR.md`, `.github/workflows/android.yml`, `.claude/agents/**` |
| WP9 | site | `src/site/**`, `tools/mksite.mjs` |
| WP10a | matrix | `src/iq/gen/matrix.js`, `tests/iq-matrix.test.mjs` |
| WP10b | series | `src/iq/gen/series.js`, `tests/iq-series.test.mjs` |
| WP10c | spatial | `src/iq/gen/spatial.js`, `tests/iq-spatial.test.mjs` |
| WP10d | verbal | `src/iq/gen/verbal.js`, `content/verbal.json`, `tests/iq-verbal.test.mjs` |
| WP10e | games-memory | `src/games/{matrix-memory,sequence,nback}.js`, `tests/game-{matrix-memory,sequence,nback}.test.mjs` |
| WP10f | games-speed | `src/games/{schulte,mental-math,flanker}.js`, `tests/game-{schulte,mental-math,flanker}.test.mjs` |
| — | backend | `supabase/**`, `src/data.js`, `tests/data.test.mjs`, `.github/workflows/db.yml`, `.github/workflows/db-apply.yml` |
| — | cert | `src/cert/**`, `tests/cert-*.test.mjs` |

`npm test` hamma testni ishga tushiradi. O'zingizniki yashil bo'lishi
shart; boshqaning testi (u hali ishlayotgan bo'lsa) qizil bo'lishi
mumkin — uni tuzatmang, hisobotda ayting. `IQ_STRICT=1 npm test` va
`node build.mjs --strict` — integratsiya (WP11) rejimi: yo'q modul yoki
hali v1.1 ga o'tmagan API o'tkazib yuborilmaydi, xato beradi.
