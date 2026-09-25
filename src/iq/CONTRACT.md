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
      "correct": 2,
      "explain": { "uz": "…", "ru": "…" },
      "reviewed": false
    }
  ]
}
```

- `key` — barqaror, hech qachon qayta ishlatilmaydi (`v001`, `v002`…).
- `kind` — `analogy` | `odd` (ortiqchasini top) | `category` | `relation`.
- uz va ru'da variantlar soni va `correct` indeksi **bir xil**.
- `reviewed: false` — odam ko'rib chiqmaguncha. Hozir hammasi false.

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
  items: [{ id, type, level, b, k, answer: int, correct: bool, ms }],
}
```

`items[].answer` — foydalanuvchi tanlagan variant indeksi. SHART: server
natijani shu jurnal bo'yicha QAYTA hisoblaydi (§10) — savol urug'dan
qayta yaratiladi, javob tekshiriladi, ball qayta chiqariladi. Mijoz
yuborgan `iq` ga ishonilmaydi.

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
   (AQShda Lumosity shunday va'dalar uchun FTC bilan kelishuvda 2 mln $
   tovon to'lagan; LearningRx "IQ 12 haftada 15 ballga oshadi" degani
   uchun jazolangan — raqamli va'da bizga eng yaqin xavf). Mumkin:
   "mantiqiy fikrlashni mashq qiling", "natijangiz o'sishini kuzating".
   Mumkin emas: "IQ'ingizni 20 ballga oshiring", "aqlli bo'ling".
4. **"Rasmiy", "sertifikatlangan/akkreditatsiyalangan test", "Mensa",
   "klinik"** degan ishoralar yo'q — test hech qanday tashkilot
   tomonidan tasdiqlanmagan. IQuest'ning O'Z sertifikati (§6.7) bundan
   mustasno: u "IQuest.uz tomonidan berilgan" deb aniq yoziladi.
5. `reliable: false` bo'lsa IQ raqami ko'rsatilmaydi — faqat to'g'ri
   javoblar soni.
6. **Natija hech qachon pul ortida emas.** Test va uning natijasi (oraliq
   bilan) bepul. IQ-test janrining №1 shikoyati — "natijani ko'rish uchun
   yashirin obuna" (Buyuk Britaniyada bunday reklama taqiqlangan).
7. **Mahsulot egasining qarori (2026-09-25):** liga, reyting,
   IQ o'yinlari va sertifikat BO'LADI. Mezon — Google Play siyosati
   (Deceptive Behavior, Health claims). Shunga ko'ra:
   - **Sertifikat** IQuest.uz tomonidan beriladi: "IQuest testi natijasi"
     — ball, oraliq, sana, ism, noyob kod va tekshirish havolasi
     (iquest.uz/sertifikat/?kod=…). Faqat SERVERDA qayta hisoblangan
     (§10), `reliable: true` test uchun. "Rasmiy IQ", "klinik",
     davlat/Mensa bilan bog'liqlik ishorasi yo'q.
   - **O'yinlar** "IQ o'yinlari" / "aql o'yinlari" deb ataladi. Do'kon
     va reklama matnida "IQ'ingizni X ballga oshiradi" kabi KAFOLAT va
     raqamli va'da yo'q — Play shuning uchun ilovani olib tashlashi
     mumkin. "Mashq qiling, natijangiz o'sishini kuzating" — mumkin.
   - **Liga** — faollik ballari bo'yicha (haftalik). **Reyting** — eng
     yaxshi tekshirilgan IQuest balli va umumiy ball bo'yicha. Ikkalasi
     ham faqat serverda tekshirilgan ballardan (§10).
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
  title: { uz, ru }, desc: { uz, ru },
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
  prompt:  { uz, ru },
  hud:     [{ label: { uz, ru }, value: string }],    // ≤ 3 ta
  display: null | { kind: 'text', uz, ru } | { kind: 'svg', svg },
  grid:    null | { cols: 2..6, cells: [{ label: string, svg?, state }] },   // ≤ 36 katak
           // state: 'idle' | 'lit' | 'ok' | 'bad' | 'hidden' | 'disabled'
  buttons: [{ id, label: { uz, ru }, kind: 'primary' | 'secondary' }],    // ≤ 4 ta
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
  natija uchun; kod — tasodifiy, taxmin qilib bo'lmaydigan
  (masalan `IQ-7K3P-92XQ`); tekshirish sahifasi faqat ko'rsatiladigan
  maydonlarni oladi (RPC orqali, jadvalni to'liq o'qish yo'q).
- Generator kodi o'zgarsa eski urug'lar boshqa savol beradi — shuning
  uchun natijada `engine` versiyasi saqlanadi va server shu versiyani
  qo'llab-quvvatlaydi (yoki eski natijani qayta tekshirmaydi).

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
| games-memory | `src/games/{matrix-memory,sequence,nback}.js`, `tests/game-{matrix-memory,sequence,nback}.test.mjs` |
| games-speed | `src/games/{schulte,mental-math,flanker}.js`, `tests/game-{schulte,mental-math,flanker}.test.mjs` |
| cert | `src/cert/**`, `tests/cert-*.test.mjs` |
| integrator | `build.mjs`, `package.json`, `version.json`, `src/iq/{rng,index}.js`, `src/iq/CONTRACT.md`, `src/iq/gen/demo.js`, `src/games/{index,demo}.js`, `.github/workflows/js.yml` |

`npm test` hamma testni ishga tushiradi. O'zingizniki yashil bo'lishi
shart; boshqaning testi (u hali ishlayotgan bo'lsa) qizil bo'lishi
mumkin — uni tuzatmang, hisobotda ayting.
