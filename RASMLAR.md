# Rasmlar — ro'yxat, o'lchamlar va tayyor promptlar (IQuest)

Bu hujjat **siz yaratadigan** rasmlar uchun. Har bir rasm uchun: nima,
qayerga qo'yiladi (aniq yo'l), o'lcham va format, shaffoflik, xavfsiz
zona va rasm generatoriga beriladigan **tayyor prompt** (inglizcha —
generatorlar uni yaxshiroq tushunadi) hamda o'zbekcha qisqa izoh.

Hozir loyihada vaqtinchalik rasmlar turibdi: ikonka va splash
`tools/icon.html` dan chizilgan (3×3 panjara ustida "Q" halqasi va oltin
katak), OG va Play grafikasi CSS fon bilan yig'ilgan. Siz rasm
qo'yganingizda skriptlar o'shani oladi — **kod tahrirlash kerak emas**
(1–6, 12). Ilova ichidagi yangi rasmlar (7–9, 13–16) UI va build'ga
ulanishi kerak — har birida yozilgan.

---

## Asosiy qoidalar

1. **Rasmda matn YO'Q.** Harf, raqam, so'z, logotip yozuvi, suv belgisi —
   hech narsa. Generatorlar matnni buzadi (ayniqsa o'zbekcha va
   kirillcha). Matn keyin skript yoki dizayn dasturida, aniq shriftda
   qo'shiladi. Shuning uchun har promptda "no text" takrorlanadi — olib
   tashlamang. Logotipdagi "IQuest" yozuvi ham generatorda emas,
   shrift bilan teriladi (§17).
2. **Manba fayllar `resources/art/` ga** (papkani o'zingiz yarating).
   Skriptlar shu papkadan o'qiydi, tayyor fayllarni o'zi yasaydi. Asl
   rasmni hech qachon faqat kichraytirilgan ko'rinishda saqlamang.
3. **Siyosat rasmda ham** (`src/iq/CONTRACT.md` §6, PLAY.md §6.1):
   miya, tibbiy belgilar, "IQ 140" kabi raqam, davlat hujjatiga o'xshash
   belgilar (gerb, muhr, lenta, shtamp) yo'q. Miya surati "miya
   salomatligi" va'dasini beradi, muhr va gerb esa "rasmiy natija"
   taassurotini — ikkalasi ham Play'da aldamchi da'vo hisoblanishi mumkin.
4. **Bolalarga qaratilgandek emas**: multfilm qahramonlari, hayvonlar,
   o'yinchoq uslubi yo'q (PLAY.md §4.3 — Families siyosati).
5. Haqiqiy odam yuzi yo'q (ruxsat va o'xshatish muammosi).
6. **Rang yagona farq emas** — liga nishonlari va o'yin ikonkalari
   shakl bilan ham farqlanadi (ranglarni farqlamaydigan odam uchun).

---

## Yagona uslub

Hamma rasmlar bitta oila bo'lib ko'rinishi uchun **har bir promptda**
quyidagi ikki blok bor (pastdagi promptlarga allaqachon qo'shilgan):

**STYLE**

```
Style: clean modern flat illustration with soft depth — rounded geometric shapes, smooth gradients, gentle soft shadows, no outlines, crisp vector-like edges. Color palette: electric indigo #4C6FFF, deep navy #14121F, violet #8552F0, warm amber #FFB84D, mint green #4CC38A, off-white #F4F2FF. Motifs: abstract logic puzzles — grids and matrices of rounded tiles, circles, squares, triangles, dot sequences, arrows. Mood: calm, smart, trustworthy, modern; not childish, not corporate-stock. Balanced composition with generous empty space.
```

**NEGATIVE** (generatorda alohida "negative prompt" maydoni bo'lsa —
o'sha yerga; bo'lmasa promptning oxiriga):

```
No text, no letters, no numbers, no digits, no words, no typography, no logos, no watermark, no signature, no UI screenshots, no people, no faces, no hands, no brain, no medical symbols, no official seals, no coats of arms, no stamps, no ribbons, no cartoon characters, no animals, no photorealism, no clutter.
```

Izoh: ranglar ilova palitrasi (`src/Main.dc.html` → `--primary`,
`--purple`, `--gold`, `--green`) va ikonka rangi bilan bir xil. Liga
nishonlaridagi metall ranglari — yagona istisno (§14).

---

## Ro'yxat

| # | Rasm | Manba o'lchami | Shaffof | Manba yo'li | Ilovadagi yo'l / buyruq |
|---|---|---|---|---|---|
| 1 | Ilova ikonkasi (to'liq) | 1024×1024 PNG | yo'q | `resources/art/icon-full.png` | `npm run icons` |
| 2 | Adaptiv ikonka — old qatlam | 1024×1024 PNG | **ha** | `resources/art/icon-foreground.png` | `npm run icons` |
| 3 | Adaptiv ikonka — fon | 1024×1024 PNG | yo'q | `resources/art/icon-background.png` | `npm run icons` |
| 4 | Splash (ixtiyoriy) | 2732×2732 PNG | yo'q | `resources/art/splash.png` | `npm run icons` |
| 5 | Play sarlavha rasmi foni | ≥1024×500 (~2:1) PNG | yo'q | `resources/art/feature-bg.png` | `npm run play:assets` |
| 6 | Play suratlari foni | 1080×1920 PNG | yo'q | `resources/art/screenshot-bg.png` | `npm run play:assets` |
| 7–9 | Onboarding (3 ta) | 1536×1536 PNG | yo'q | `resources/art/onboarding-{1,2,3}.png` | `src/img/onboarding-{1,2,3}.jpg` 960×960 |
| 10 | "Liga" kartasi foni | 1536×1440 PNG | yo'q | `resources/art/reyting-bg.png` | `src/reyting-bg.jpg` 1024×960 |
| 11 | "Bu hafta" kartasi foni | 1536×1440 PNG | yo'q | `resources/art/hafta-bg.png` | `src/hafta-bg.jpg` 1024×960 |
| 12 | OG (havola ko'rinishi) foni | ≥1200×630 PNG | yo'q | `resources/art/og-bg.png` | `npm run og` |
| 13 | Sertifikat foni va ramkasi | 3508×2480 PNG (A4 gorizontal, 300 dpi) | yo'q | `resources/art/cert-bg.png` | cert agenti bilan (§13) |
| 14 | Liga nishonlari (6 ta) | 1024×1024 PNG | **ha** | `resources/art/league/<daraja>.png` | `src/img/league-<daraja>.png` 256×256 |
| 15 | O'yin ikonkalari (6 ta) | 1024×1024 PNG | yo'q | `resources/art/games/<id>.png` | `src/img/game-<id>.png` 192×192 |
| 16 | Logotip belgisi (mark) | 1024×1024 PNG | **ha** | `resources/art/logo-mark.png` | §17 |
| 17 | Logotip: gorizontal va kvadrat | SVG + 1024 PNG | — | — | `resources/brand/…` |

Minimal to'plam do'konga chiqish uchun — **2, 3, 5** (ikonka va splash
2+3 dan yig'iladi). **10–11 almashtirilishi yoki olib tashlanishi SHART**
(§10–11). Qolganlari funksiya tayyor bo'lganda.

`npm run icons` o'lcham va shaffoflikni tekshiradi: rasm kvadrat
bo'lmasa, kichik bo'lsa yoki old qatlamda alfa kanal yo'q bo'lsa —
nima noto'g'riligini aytib to'xtaydi.

**`src/img/` haqida:** yangi ilova rasmlari uchun taklif qilingan papka.
Hozir `build.mjs` faqat `src/reyting-bg.jpg` va `src/hafta-bg.jpg` ni
`www/` ga ko'chiradi — `src/img/` ni ko'chirishni integrator qo'shadi,
rasmlarni ekranga UI agenti ulaydi.

---

## 1. Ilova ikonkasi — to'liq

- **Yo'l:** `resources/art/icon-full.png`
- **O'lcham:** 1024×1024, PNG, **shaffof emas**, to'liq kvadrat
  (burchaklarni yumaloqlamang, soya qo'shmang — Play va launcher shaklni
  o'zi kesadi, Play burchakni ~20% radius bilan yumaloqlaydi).
- **Xavfsiz zona:** asosiy belgi markaziy ~620px doira ichida; hech
  narsa chetga 100px dan yaqin kelmasin.
- **Qayerda ko'rinadi:** eski Android launcher'lari, Play 512×512
  ikonka, sayt favicon'i va PWA ikonkalari.
- Bo'lmasa: 2 + 3 qatlamlardan avtomatik yig'iladi.

```
App icon for "a logic puzzle and IQ test app". Centered bold symbol: a 3×3 grid of rounded square tiles in translucent white; over it a thick white ring centered on the middle tile, with a short diagonal tail from the ring toward the bottom-right tile, so the whole symbol reads like a magnifying glass and like the shape of the letter Q; the bottom-right tile is solid warm amber #FFB84D and sits at the end of the tail like a found answer. Background: smooth diagonal gradient from #6384FF (top-left) to #3552E0 (bottom-right). The symbol fills about 55% of the canvas, perfectly centered. Full-bleed square, no rounded corners, no border, no drop shadow at the edges. Style: clean modern flat illustration with soft depth — rounded geometric shapes, smooth gradients, gentle soft shadows, no outlines, crisp vector-like edges. Color palette: electric indigo #4C6FFF, deep navy #14121F, violet #8552F0, warm amber #FFB84D, mint green #4CC38A, off-white #F4F2FF. Motifs: abstract logic puzzles — grids and matrices of rounded tiles, circles, squares, triangles, dot sequences, arrows. Mood: calm, smart, trustworthy, modern; not childish, not corporate-stock. Balanced composition with generous empty space. No text, no letters, no numbers, no digits, no words, no typography, no logos, no watermark, no signature, no UI screenshots, no people, no faces, no hands, no brain, no medical symbols, no official seals, no coats of arms, no stamps, no ribbons, no cartoon characters, no animals, no photorealism, no clutter.
```

Izoh: hozirgi vaqtinchalik belgi bilan bir xil g'oya (matritsa + "Q"
halqa/lupa + oltin "javob" katagi). "Q" ni harf sifatida emas, shakl
sifatida tasvirlang — generator harfni shrift bilan yozib qo'ymasin.
48px da ham o'qilishi kerak — mayda detal qo'shmang.

---

## 2. Adaptiv ikonka — old qatlam (foreground)

- **Yo'l:** `resources/art/icon-foreground.png`
- **O'lcham:** 1024×1024, PNG, **SHAFFOF fon** (alfa kanal) — faqat belgi.
- **Xavfsiz zona:** Android adaptiv ikonkasi 108dp, shundan launcher
  faqat markaziy 72dp ni ko'rsatadi va uni doira, kvadrat yoki
  "squircle" bilan kesadi; **markaziy 66dp doira** har qanday shaklda
  ko'rinishi kafolatlangan.
  Bu loyihaning quvuri (`capacitor-assets`) 1024px rasmni 72dp
  maydonga joylaydi, shuning uchun:
  - asosiy belgi — markaziy **~620px doira** ichida (standart 108dp
    hisobida ham 66dp ga to'g'ri keladi — ikki holatda ham xavfsiz);
  - hech narsa markaziy **940px doiradan** tashqariga chiqmasin.
- Fon qatlami (3) ustiga qo'yiladi va ba'zi launcher'larda harakatlanadi
  (parallax) — belgining o'zida fon bo'lmasin.

```
The same app symbol isolated on a fully transparent background (alpha channel), no background color at all: a 3×3 grid of rounded square tiles in translucent white (about 25% opacity); over it a thick white ring centered on the middle tile, with a short diagonal tail toward the bottom-right tile, reading like a magnifying glass and like the shape of the letter Q; the bottom-right tile is solid warm amber #FFB84D at the end of the tail. Symbol centered, about 55% of the canvas width, lots of empty transparent margin around it. Style: clean modern flat illustration with soft depth — rounded geometric shapes, smooth gradients, gentle soft shadows, no outlines, crisp vector-like edges. Color palette: electric indigo #4C6FFF, deep navy #14121F, violet #8552F0, warm amber #FFB84D, mint green #4CC38A, off-white #F4F2FF. Motifs: abstract logic puzzles — grids and matrices of rounded tiles, circles, squares, triangles, dot sequences, arrows. Mood: calm, smart, trustworthy, modern; not childish, not corporate-stock. Balanced composition with generous empty space. No text, no letters, no numbers, no digits, no words, no typography, no logos, no watermark, no signature, no UI screenshots, no people, no faces, no hands, no brain, no medical symbols, no official seals, no coats of arms, no stamps, no ribbons, no cartoon characters, no animals, no photorealism, no clutter.
```

Izoh: generator shaffof fonni qo'llamasa — belgini **tekis yashil
(#00FF00)** fonda yarating va fonni olib tashlang (remove.bg, Photoshop,
Figma). Oq fon tanlamang — oq halqa yo'qolib qoladi. Xira kataklar yarim
shaffof bo'lishi kerak — fon olib tashlanganda ular o'chib ketmaganini
tekshiring.

---

## 3. Adaptiv ikonka — fon qatlami (background)

- **Yo'l:** `resources/art/icon-background.png`
- **O'lcham:** 1024×1024, PNG, shaffof emas.
- **Xavfsiz zona:** muhim detal yo'q — chetlari kesiladi va harakatlanadi.

```
Smooth abstract background for an app icon: diagonal gradient from #6384FF at the top-left to #3552E0 at the bottom-right, with a very subtle, low-contrast pattern of faint rounded squares arranged in a loose grid, softly fading toward the edges. No focal point, nothing in the center that competes with a symbol placed on top. Full-bleed square, seamless, no border. Style: clean modern flat illustration with soft depth — rounded geometric shapes, smooth gradients, gentle soft shadows, no outlines, crisp vector-like edges. Color palette: electric indigo #4C6FFF, deep navy #14121F, violet #8552F0, warm amber #FFB84D, mint green #4CC38A, off-white #F4F2FF. Mood: calm, smart, trustworthy, modern; not childish, not corporate-stock. No text, no letters, no numbers, no digits, no words, no typography, no logos, no watermark, no signature, no UI screenshots, no people, no faces, no hands, no brain, no medical symbols, no official seals, no coats of arms, no stamps, no ribbons, no cartoon characters, no animals, no photorealism, no clutter.
```

Izoh: eng oddiy variant ham yaxshi — tekis gradient. Naqsh qo'shsangiz,
48px da "shovqin" bo'lmasligi uchun juda xira bo'lsin.

---

## 4. Splash (ixtiyoriy)

- **Yo'l:** `resources/art/splash.png`
- **O'lcham:** 2732×2732, PNG, shaffof emas.
- **Xavfsiz zona:** telefon ekraniga `CENTER_CROP` bilan kesiladi —
  portretda kvadratning faqat markaziy ~1260px kengligi qoladi. Belgi
  **markaziy 1000×1000px** ichida, qolgan hamma joy tekis `#14121F`
  (ilova foni bilan bir xil — splash'dan ilovaga o'tishda "sakrash"
  bo'lmasin).
- Bo'lmasa: 2 + 3 qatlamlardan yig'iladi (qorong'i fonda yumaloq
  burchakli brend plitkasi) — odatda shu yetarli va belgi ikonka bilan
  aynan bir xil bo'ladi.

```
Minimal splash screen artwork, perfectly square. Solid flat deep navy #14121F background everywhere. Exactly in the center, a rounded-square app tile about 22% of the canvas width: diagonal gradient from #6384FF to #3552E0, containing a 3×3 grid of translucent rounded tiles with a thick white ring and a short diagonal tail toward an amber #FFB84D bottom-right tile (a magnifying-glass / Q-like shape). A very soft indigo glow directly around the tile, fading out quickly. Everything outside the central area is completely empty and flat. Style: clean modern flat illustration with soft depth — rounded geometric shapes, smooth gradients, gentle soft shadows, no outlines, crisp vector-like edges. Color palette: electric indigo #4C6FFF, deep navy #14121F, violet #8552F0, warm amber #FFB84D, mint green #4CC38A, off-white #F4F2FF. No text, no letters, no numbers, no digits, no words, no typography, no logos, no watermark, no signature, no UI screenshots, no people, no faces, no hands, no brain, no medical symbols, no official seals, no coats of arms, no stamps, no ribbons, no cartoon characters, no animals, no photorealism, no clutter.
```

---

## 5. Play sarlavha rasmi (feature graphic) foni

- **Yo'l:** `resources/art/feature-bg.png`
- **O'lcham:** kamida 1024×500, nisbati ~2:1 (masalan 2048×1024 —
  skript markazdan kesadi). PNG, shaffof emas.
- **Xavfsiz zona:** markaziy ~60% kenglik — **bo'sh va qorong'iroq**:
  u yerga logotip, sarlavha va ikki "chip" yoziladi (uz va ru uchun
  alohida). Bezak elementlari chap va o'ng uchdan birlikda. Eng chetdagi
  5% ga muhim detal qo'ymang — Play ba'zi joylarda kesadi.

```
Wide 2:1 banner background for an app store header. Deep navy #14121F base with large soft glowing gradients of indigo #4C6FFF (upper left) and violet #8552F0 (lower right). Along the far left and far right thirds only: sparse floating abstract logic-puzzle and brain-game elements with gentle depth-of-field blur — small 3×3 matrices of rounded tiles, a grid of tiles with a few glowing ones, a row of chevron arrows, circles, triangles, short dot sequences, one tile highlighted in warm amber. The central 60% of the image is calm, dark, smooth and completely empty (text will be placed there later). Style: clean modern flat illustration with soft depth — rounded geometric shapes, smooth gradients, gentle soft shadows, no outlines, crisp vector-like edges. Color palette: electric indigo #4C6FFF, deep navy #14121F, violet #8552F0, warm amber #FFB84D, mint green #4CC38A, off-white #F4F2FF. Motifs: abstract logic puzzles — grids and matrices of rounded tiles, circles, squares, triangles, dot sequences, arrows. Mood: calm, smart, trustworthy, modern; not childish, not corporate-stock. Balanced composition with generous empty space. No text, no letters, no numbers, no digits, no words, no typography, no logos, no watermark, no signature, no UI screenshots, no people, no faces, no hands, no brain, no medical symbols, no official seals, no coats of arms, no stamps, no ribbons, no cartoon characters, no animals, no photorealism, no clutter.
```

Izoh: skript markazga qo'shimcha qorong'ilik qo'yadi — matn har qanday
fonda o'qiladi. Natija: `resources/play/{uz,ru}/feature-1024x500.png`.

---

## 6. Play ekran suratlari foni (ramka)

- **Yo'l:** `resources/art/screenshot-bg.png`
- **O'lcham:** 1080×1920 (9:16), PNG, shaffof emas.
- **Xavfsiz zona** (skript joylashtiradi):
  - yuqori qism **y 0–430px** — 2 qatorli oq izoh matni: sokin, to'qroq,
    kontrastli joy;
  - telefon surati **x 210–870, y 430–1880** — bu joy baribir yopiladi,
    bezak faqat chetlarda va pastki burchaklarda ko'rinadi.

```
Vertical 9:16 background for app store screenshots. Smooth vertical gradient from electric indigo #4C6FFF at the top through #3552E0 to deep navy #14121F at the bottom. The top quarter is calm, smooth and uncluttered (a white caption will be placed there). Sparse floating abstract logic shapes — rounded tiles, small 3×3 matrices, circles, triangles, dot sequences, one amber tile — only along the left and right edges and in the bottom corners, with soft depth blur. The whole central column is empty (a phone screenshot will cover it). Style: clean modern flat illustration with soft depth — rounded geometric shapes, smooth gradients, gentle soft shadows, no outlines, crisp vector-like edges. Color palette: electric indigo #4C6FFF, deep navy #14121F, violet #8552F0, warm amber #FFB84D, mint green #4CC38A, off-white #F4F2FF. Motifs: abstract logic puzzles — grids and matrices of rounded tiles, circles, squares, triangles, dot sequences, arrows. Mood: calm, smart, trustworthy, modern; not childish, not corporate-stock. Balanced composition with generous empty space. No text, no letters, no numbers, no digits, no words, no typography, no logos, no watermark, no signature, no UI screenshots, no people, no faces, no hands, no brain, no medical symbols, no official seals, no coats of arms, no stamps, no ribbons, no cartoon characters, no animals, no photorealism, no clutter.
```

Izoh: nega ramka kerak — telefon ekrani nisbati (2.16) Play chegarasidan
(2:1) oshadi, xom surat yuklanmaydi (`tools/mkplay.mjs`).

---

## 7–9. Onboarding illyustratsiyalari (3 ta)

- **Manba:** `resources/art/onboarding-1.png`, `-2.png`, `-3.png` —
  1536×1536 (1:1), PNG, shaffof emas.
- **Ilovaga:** `src/img/onboarding-1.jpg`, `-2.jpg`, `-3.jpg` — 960×960
  JPEG, har biri ≤ 150 KB:

  ```bash
  mkdir -p src/img
  for i in 1 2 3; do node -e "require('sharp')('resources/art/onboarding-$i.png').resize(960,960).jpeg({quality:80,mozjpeg:true}).toFile('src/img/onboarding-$i.jpg')"; done
  ```

- **Xavfsiz zona:** asosiy obyekt markaziy 70% da; rasm yumaloq burchakli
  kartada ko'rsatiladi (chetlar biroz kesilishi mumkin).
- **Fon:** o'z foni bor (o'rta to'qlikdagi indigo–binafsha gradient) —
  kunduzgi va tungi temada bir xil yaxshi ko'rinadi.
- ⚠️ **Integratsiya:** onboarding ekrani — UI agenti (`src/Main.dc.html`),
  `src/img/` ni ko'chirish — integrator (`build.mjs`). Sarlavha va izoh
  matni rasmda emas, ekranda.

**7 — "IQ testi"** (topshiriqlar)

```
Square illustration: a floating 3×3 puzzle matrix made of rounded off-white tiles, each tile holding simple geometric shapes (circles, squares, triangles) in a clear progressing pattern; the bottom-right tile is empty with a softly glowing amber outline, as if waiting for the answer; three candidate answer tiles float nearby at slightly different depths. Soft indigo-to-violet gradient background (#4C6FFF to #8552F0) with gentle light from the top-left. Main object within the central 70%. Style: clean modern flat illustration with soft depth — rounded geometric shapes, smooth gradients, gentle soft shadows, no outlines, crisp vector-like edges. Color palette: electric indigo #4C6FFF, deep navy #14121F, violet #8552F0, warm amber #FFB84D, mint green #4CC38A, off-white #F4F2FF. Motifs: abstract logic puzzles — grids and matrices of rounded tiles, circles, squares, triangles, dot sequences, arrows. Mood: calm, smart, trustworthy, modern; not childish, not corporate-stock. Balanced composition with generous empty space. No text, no letters, no numbers, no digits, no words, no typography, no logos, no watermark, no signature, no UI screenshots, no people, no faces, no hands, no brain, no medical symbols, no official seals, no coats of arms, no stamps, no ribbons, no cartoon characters, no animals, no photorealism, no clutter.
```

**8 — "Aql o'yinlari va liga"**

```
Square illustration: a playful but calm arrangement of small floating game tiles — a 5×5 grid of rounded tiles with a subtle path of highlighted tiles, a 4×4 grid with a few glowing cells, a row of five chevron arrows where the middle one points the other way, and a short stack of cards receding into depth — arranged around a simple podium made of three rounded blocks of different heights. Soft indigo-to-violet gradient background (#4C6FFF to #8552F0). Main objects within the central 70%. Style: clean modern flat illustration with soft depth — rounded geometric shapes, smooth gradients, gentle soft shadows, no outlines, crisp vector-like edges. Color palette: electric indigo #4C6FFF, deep navy #14121F, violet #8552F0, warm amber #FFB84D, mint green #4CC38A, off-white #F4F2FF. Motifs: abstract logic puzzles — grids and matrices of rounded tiles, circles, squares, triangles, dot sequences, arrows. Mood: calm, smart, trustworthy, modern; not childish, not corporate-stock. Balanced composition with generous empty space. No text, no letters, no numbers, no digits, no words, no typography, no logos, no watermark, no signature, no UI screenshots, no people, no faces, no hands, no brain, no medical symbols, no official seals, no coats of arms, no stamps, no ribbons, no trophies, no rockets, no cartoon characters, no animals, no photorealism, no clutter.
```

**9 — "Taxminiy natija, oraliq bilan"**

```
Square illustration: a long horizontal scale made of rounded segments floating in space; a wide highlighted band in warm amber covers a section of the scale (a range, not a single point), with a small soft marker inside the band; faint blurred segments fade out at both ends to suggest uncertainty; a few small geometric shapes float calmly around. Conveys "an honest estimate within a range". Soft indigo-to-violet gradient background (#4C6FFF to #8552F0). Main object within the central 70%. Style: clean modern flat illustration with soft depth — rounded geometric shapes, smooth gradients, gentle soft shadows, no outlines, crisp vector-like edges. Color palette: electric indigo #4C6FFF, deep navy #14121F, violet #8552F0, warm amber #FFB84D, mint green #4CC38A, off-white #F4F2FF. Motifs: abstract logic puzzles — grids and matrices of rounded tiles, circles, squares, triangles, dot sequences, arrows. Mood: calm, smart, trustworthy, modern; not childish, not corporate-stock. Balanced composition with generous empty space. No text, no letters, no numbers, no digits, no words, no typography, no tick labels, no gauge or speedometer, no bell curve, no logos, no watermark, no signature, no UI screenshots, no people, no faces, no hands, no brain, no medical symbols, no official seals, no coats of arms, no stamps, no ribbons, no cartoon characters, no animals, no photorealism, no clutter.
```

Izoh (9): bitta nuqta emas — **oraliq** (CONTRACT §6.1). Qo'ng'iroqsimon
egri chiziq ATAYLAB yo'q: u "aholiga nisbatan o'rningiz" (persentil)
degan ma'no beradi, me'yor guruhi esa yo'q. Raketa, kubok, "level up"
belgisi ham yo'q — ular "IQ oshadi" va'dasiga yaqin (§6.3).

---

## 10–11. "Liga" va "Bu hafta" kartalari foni

**Hozirgilari almashtirilishi yoki build'dan olib tashlanishi SHART.**
Tekshirildi: `src/reyting-bg.jpg` — yo'lda "У" belgili o'quv avtomobili,
`src/hafta-bg.jpg` — "HAYDOVCHILIK GUVOHNOMASI" yozuvli guvohnoma va
mashina kaliti (Nazariy'dan qolgan; ikkinchisida o'qiladigan matn bor).
UI hozir kartalarda ularni ko'rsatmaydi (tekis rang), lekin `build.mjs`
ularni hali ham `www/` ga — ya'ni **APK ichiga** — ko'chiradi va CSS
klasslari (`.nz-card-reyting`, `.nz-card-hafta`) ni talab qiladi. Ikki
yo'l: (a) quyidagi talablar bo'yicha yangi rasm qo'yiladi va UI uni
qaytaradi; (b) integrator ularni `build.mjs` dan olib tashlaydi.

- **Ilovaga:** fayl nomi O'ZGARMAYDI (`build.mjs` shu nomlarni kutadi):
  `src/reyting-bg.jpg`, `src/hafta-bg.jpg` — 1024×960 (16:15) JPEG,
  har biri ≤ 150 KB:

  ```bash
  for n in reyting hafta; do node -e "require('sharp')('resources/art/$n-bg.png').resize(1024,960,{fit:'cover',position:'bottom'}).jpeg({quality:80,mozjpeg:true}).toFile('src/$n-bg.jpg')"; done
  ```

- **Qanday ko'rsatiladi** (`.nz-card-reyting`, `.nz-card-hafta`): bosh
  ekranda yarim kenglikdagi karta (~170×160px), `background-size: cover;
  background-position: center bottom`, ustida yuqoridan pastga
  qorong'ilashuvchi gradient; **chap yuqori burchakda ilovaning o'z oq
  ikonkasi va oq matn**.
- **Xavfsiz zona:** chap yuqori chorak **bo'sh va sokin**. Asosiy obyekt —
  pastki o'ng yarmida. Rasmda belgi yoki ikonka "pishirilmasin" (ilgari
  rasmdagi belgi UI ikonkasi bilan to'qnashgan).

**10 — "Liga"** (binafsha, `--purple` #8552F0)

```
Square-ish illustration (16:15) for a small app card. Abstract podium made of three rounded geometric blocks of different heights in violet tones, with small floating rounded tiles, circles and triangles above it, softly lit. Background: smooth violet gradient from #8552F0 to deep #3B1F8F. The main object sits in the lower-right half of the frame; the upper-left quarter is calm, smooth and empty (white text and an icon will be overlaid there). Style: clean modern flat illustration with soft depth — rounded geometric shapes, smooth gradients, gentle soft shadows, no outlines, crisp vector-like edges. Color palette: electric indigo #4C6FFF, deep navy #14121F, violet #8552F0, warm amber #FFB84D, mint green #4CC38A, off-white #F4F2FF. Motifs: abstract logic puzzles — grids and matrices of rounded tiles, circles, squares, triangles, dot sequences, arrows. Mood: calm, smart, trustworthy, modern; not childish, not corporate-stock. Balanced composition with generous empty space. No text, no letters, no numbers, no digits, no words, no typography, no logos, no icons, no watermark, no signature, no UI screenshots, no people, no faces, no hands, no brain, no medical symbols, no official seals, no coats of arms, no stamps, no ribbons, no trophies, no cars, no roads, no cartoon characters, no animals, no photorealism, no clutter.
```

**11 — "Bu hafta"** (yashil, `--green` #4CC38A)

```
Square-ish illustration (16:15) for a small app card. An abstract weekly tracker: a row of seven rounded tiles floating in slight perspective, some filled with soft mint-green light and a subtle check-like glow, the rest empty and translucent; a few small geometric shapes (circles, triangles, tiny 3×3 matrices) float nearby. Background: smooth mint-green gradient from #4CC38A to deep #0F5A3C. The main object sits in the lower-right half of the frame; the upper-left quarter is calm, smooth and empty (text and an icon will be overlaid there). Style: clean modern flat illustration with soft depth — rounded geometric shapes, smooth gradients, gentle soft shadows, no outlines, crisp vector-like edges. Color palette: electric indigo #4C6FFF, deep navy #14121F, violet #8552F0, warm amber #FFB84D, mint green #4CC38A, off-white #F4F2FF. Motifs: abstract logic puzzles — grids and matrices of rounded tiles, circles, squares, triangles, dot sequences, arrows. Mood: calm, smart, trustworthy, modern; not childish, not corporate-stock. Balanced composition with generous empty space. No text, no letters, no numbers, no digits, no words, no typography, no logos, no icons, no calendar pages with dates, no watermark, no signature, no UI screenshots, no people, no faces, no hands, no brain, no medical symbols, no official seals, no coats of arms, no stamps, no ribbons, no ID cards, no keys, no cars, no trophies, no cartoon characters, no animals, no photorealism, no clutter.
```

Izoh: sanali kalendar sahifasi yo'q — generator unga raqam yozadi.

---

## 12. OG (havola ko'rinishi) foni

- **Yo'l:** `resources/art/og-bg.png`
- **O'lcham:** kamida 1200×630 (nisbat ~1.91:1), PNG, shaffof emas.
- **Xavfsiz zona:** chap **~55%** — sokin va qorong'i (logotip, sarlavha,
  chiplar va "klinik test emas" izohi yoziladi; skript u yerga qo'shimcha
  qorong'ilik ham qo'yadi). Illyustratsiya — o'ng 45% da. Telegram rasmni
  to'liq ko'rsatadi; WhatsApp va ba'zi tarmoqlar markazdan kvadrat qilib
  kesadi — illyustratsiya o'ng chetga yopishmasin.
- Bo'lmasa: CSS fon + o'ngda chizilgan matritsa kartasi (hozirgi
  `resources/og.jpg`).

```
Wide 1.91:1 social preview background. Deep navy #14121F base with a large soft indigo #4C6FFF glow in the upper left and a violet #8552F0 glow in the lower right. On the right 45% of the image: a floating 3×3 puzzle matrix of rounded off-white tiles with simple geometric shapes in a progressing pattern and one empty tile with a glowing amber outline, slightly tilted, with a few smaller game tiles and shapes floating around it at different depths. The left 55% is calm, dark, smooth and completely empty (text will be placed there). Style: clean modern flat illustration with soft depth — rounded geometric shapes, smooth gradients, gentle soft shadows, no outlines, crisp vector-like edges. Color palette: electric indigo #4C6FFF, deep navy #14121F, violet #8552F0, warm amber #FFB84D, mint green #4CC38A, off-white #F4F2FF. Motifs: abstract logic puzzles — grids and matrices of rounded tiles, circles, squares, triangles, dot sequences, arrows. Mood: calm, smart, trustworthy, modern; not childish, not corporate-stock. Balanced composition with generous empty space. No text, no letters, no numbers, no digits, no words, no typography, no question marks, no logos, no watermark, no signature, no UI screenshots, no people, no faces, no hands, no brain, no medical symbols, no official seals, no coats of arms, no stamps, no ribbons, no cartoon characters, no animals, no photorealism, no clutter.
```

---

## 13. Sertifikat foni va ramkasi

- **Manba:** `resources/art/cert-bg.png` — **A4 gorizontal**, 297×210 mm,
  300 dpi → **3508×2480 px**, PNG, RGB, shaffof emas.
- **Ilovaga / saytga:** sertifikatni chizish — cert agentining ishi
  (`src/cert/**`). Taklif: ekran va PDF uchun 1754×1240 (A4, 150 dpi)
  JPEG ≤ 300 KB, chop etish uchun esa to'liq 3508×2480 manba. Aniq yo'l
  cert agenti bilan kelishiladi.
- **Matn YO'Q** — hammasi keyin chiziladi: sarlavha ("IQuest testi
  natijasi"), ism, ball va oraliq, sana, noyob kod, tekshirish havolasi
  va QR kod.
- **Xavfsiz zonalar** (3508×2480 da):
  - chetdan **15 mm (~180px)** — printerlar chetni kesadi; ramka shu
    chiziqdan ichkarida boshlanadi;
  - markaz **x 420–3090, y 440–2040** — deyarli tekis, **och** fon
    (matn o'qilsin va siyoh tejalsin);
  - pastki o'ng burchak **x 2700–3200, y 1700–2200** — QR kod joyi:
    **toza oq**, naqshsiz (QR faqat oq fonda ishonchli skanerlanadi);
  - pastki chap burchak — tekshirish havolasi matni uchun sokin joy.
- **Nima bo'lmasligi kerak:** gerb, muhr, shtamp, lenta, oltin "davlat"
  naqshi (gilosh), "diplom" ko'rinishi — sertifikat **rasmiy hujjatga
  o'xshamasligi** kerak (CONTRACT §6.7, PLAY.md §6.1). Bu IQuest
  testining natijasi, xolos.

```
Landscape A4 certificate background artwork for printing, 297 by 210 millimeters. Very light off-white paper tone #F7F6FC covering almost the whole sheet. An elegant thin frame inset from the edges made of a repeating pattern of tiny rounded squares and small circles in indigo #4C6FFF and violet #8552F0, with slightly richer decorative corners built from small 3×3 tile matrices; one tiny tile in each corner is warm amber #FFB84D. A very faint, large 3×3 rounded-tile matrix watermark at low opacity near the left side. The central area is plain and calm (text will be placed there). The bottom-right area inside the frame is pure white and completely empty (a QR code will be placed there). Modern, clean, premium, trustworthy; clearly a private brand certificate, not a government document. Style: clean modern flat illustration with soft depth — rounded geometric shapes, smooth gradients, gentle soft shadows, no outlines, crisp vector-like edges. Color palette: electric indigo #4C6FFF, deep navy #14121F, violet #8552F0, warm amber #FFB84D, mint green #4CC38A, off-white #F4F2FF. Mood: calm, smart, trustworthy, modern; not childish, not corporate-stock. Balanced composition with generous empty space. No text, no letters, no numbers, no digits, no words, no typography, no logos, no watermark text, no signature, no people, no faces, no brain, no medical symbols, no official seals, no coats of arms, no stamps, no ribbons, no rosettes, no gold foil seals, no guilloche banknote patterns, no laurel wreaths, no cartoon characters, no animals, no photorealism, no clutter.
```

Izoh: generatorlar odatda 3508×2480 bermaydi — 3:2 ga yaqin eng katta
o'lchamda yarating (masalan 3072×2048) va A4 nisbatiga (1.414:1) kesib,
kattalashtiring (Upscayl, Photoshop "Preserve details"). Ramka chiziqlari
kattalashtirishda loyqalanmasligini tekshiring; kerak bo'lsa ramkani
dizayn dasturida vektor bilan qayta chizing. Chop etib ko'ring: och fon
oddiy ofis printerida kulrang dog' bo'lib chiqmasin.

---

## 14. Liga nishonlari (6 ta)

Liga darajalari ilovadagi bilan bir xil (`src/Main.dc.html` → `LEAGUES`):

| Daraja | Fayl nomi (`<daraja>`) | Material / rang | Shakl belgisi (rangsiz ham farqlanadi) |
|---|---|---|---|
| Boshlovchi | `boshlovchi` | kulrang-ko'k shifer, #8A8799 + #F4F2FF | 1 ta nuqta |
| Bronza | `bronza` | iliq bronza, #C9895A | 2 ta nuqta |
| Kumush | `kumush` | sovuq kumush, #C7CCD8 | 3 ta nuqta |
| Oltin | `oltin` | oltin, #FFB84D / #E39B2E | 4 ta nuqta |
| Platina | `platina` | platina, oqish-feruza, #A8E6E2 | 5 ta nuqta |
| Olmos | `olmos` | qirrali kristall, ko'kish-binafsha, #8FD3FF + #8552F0 | 6 ta nuqta + qirralar |

- **Manba:** `resources/art/league/<daraja>.png` — 1024×1024, PNG,
  **shaffof fon**.
- **Ilovaga:** `src/img/league-<daraja>.png` — 256×256 PNG, har biri
  ≤ 40 KB:

  ```bash
  mkdir -p src/img
  for d in boshlovchi bronza kumush oltin platina olmos; do node -e "require('sharp')('resources/art/league/$d.png').resize(256,256).png({compressionLevel:9,palette:true}).toFile('src/img/league-$d.png')"; done
  ```

- **Xavfsiz zona:** nishon markaziy 80% da, 48px da ham tanilsin.
- **Bir oila:** hammasi bir xil shakl (yumaloq burchakli olti qirrali
  qalqon), bir xil yorug'lik va burchak — faqat material va nuqtalar
  soni o'zgaradi. Shuning uchun bitta promptni olib, faqat `[MATERIAL]`
  va `[N]` ni almashtiring. Olti rasmni **bitta sessiyada, bir xil urug'
  (seed) bilan** yarating.
- ⚠️ Integratsiya: UI agenti (liga ekrani), integrator (`src/img/`).

```
Game league badge icon, isolated on a fully transparent background (alpha channel). A rounded hexagonal shield with softly beveled edges made of [MATERIAL]; in the center, a small embossed 3×3 matrix of rounded tiles; along the bottom edge of the shield, a neat row of [N] small round pips indicating the tier. Front view, perfectly centered, symmetrical, soft top-left light, subtle inner glow, the badge fills about 80% of the canvas. Consistent icon family style. Style: clean modern flat illustration with soft depth — rounded geometric shapes, smooth gradients, gentle soft shadows, no outlines, crisp vector-like edges. Color palette: electric indigo #4C6FFF, deep navy #14121F, violet #8552F0, warm amber #FFB84D, mint green #4CC38A, off-white #F4F2FF, plus the tier material color. Mood: calm, smart, trustworthy, modern; not childish, not corporate-stock. No text, no letters, no numbers, no digits, no words, no typography, no logos, no watermark, no signature, no people, no faces, no brain, no medical symbols, no official seals, no coats of arms, no stamps, no ribbons, no laurel wreaths, no crowns, no stars with numbers, no cartoon characters, no animals, no photorealism, no clutter.
```

`[MATERIAL]` va `[N]` o'rniga:

| Daraja | [MATERIAL] | [N] |
|---|---|---|
| Boshlovchi | `matte slate blue-gray stone (#8A8799) with off-white details` | `one` |
| Bronza | `warm polished bronze (#C9895A)` | `two` |
| Kumush | `cool brushed silver (#C7CCD8)` | `three` |
| Oltin | `rich polished gold (#FFB84D to #E39B2E)` | `four` |
| Platina | `pale platinum with a faint teal sheen (#A8E6E2)` | `five` |
| Olmos | `faceted translucent crystal in icy blue and violet (#8FD3FF, #8552F0) with sharp light facets` | `six` |

Izoh: nuqtalar soni — daraja rangsiz ham farqlanishi uchun (Qoida 6).
Toj, kubok va yulduz yo'q: liga — faollik ballari, "aql darajasi" emas.

---

## 15. O'yin ikonkalari (6 ta)

O'yin ID'lari — `src/iq/CONTRACT.md` §7 dagi fayl nomlari bilan bir xil:

| O'yin | `<id>` | Plitka rangi (ko'nikma) | Belgi |
|---|---|---|---|
| Shulte jadvali | `schulte` | indigo #4C6FFF (diqqat) | 5×5 panjara, kataklar bo'ylab ingichka yo'l, bitta oltin katak |
| Xotira matritsasi | `matrix-memory` | binafsha #8552F0 (xotira) | 4×4 panjara, 4 ta yorug' katak, qolgani xira |
| Ketma-ketlik | `sequence` | binafsha #8552F0 (xotira) | qatorda 4 ta katak, navbat bilan yonishini ko'rsatuvchi kichik nuqtalar va strelka |
| N-back | `nback` | binafsha #8552F0 (xotira) | chuqurlikka ketuvchi 3 ta karta, orqadagi bilan oldingisini bog'lovchi egri strelka |
| Tez hisob | `mental-math` | yashil #4CC38A (tezlik) | yumaloq tayoqchalardan qo'shuv, ayiruv va tenglik belgilari |
| Yo'nalish (flanker) | `flanker` | indigo #4C6FFF (diqqat) | qatorda 5 ta burchak strelka (chevron), o'rtadagisi teskari va oltin |

- **Manba:** `resources/art/games/<id>.png` — 1024×1024, PNG, shaffof
  emas (to'liq kvadrat plitka; burchak yumaloqligini UI CSS bilan beradi).
- **Ilovaga:** `src/img/game-<id>.png` — 192×192 PNG, har biri ≤ 30 KB:

  ```bash
  mkdir -p src/img
  for g in schulte matrix-memory sequence nback mental-math flanker; do node -e "require('sharp')('resources/art/games/$g.png').resize(192,192).png({compressionLevel:9,palette:true}).toFile('src/img/game-$g.png')"; done
  ```

- **Xavfsiz zona:** belgi markaziy 60% da (UI plitkani yumaloqlaydi va
  kichik o'lchamda — ~44px — ko'rsatadi).
- **Bir oila:** bir xil plitka gradienti yo'nalishi, bir xil oq belgi
  qalinligi, har birida faqat BITTA oltin aksent. Olti rasmni bitta
  sessiyada, bir xil urug' bilan yarating; `[TILE]` va `[SYMBOL]` ni
  almashtiring.
- ⚠️ Integratsiya: UI agenti (o'yinlar ro'yxati), integrator (`src/img/`).

```
Square app-style icon tile for a brain game, full-bleed square (no rounded corners, no border). Background: smooth diagonal gradient of [TILE]. In the center, a bold simple white symbol: [SYMBOL]. Exactly one small accent element in warm amber #FFB84D. The symbol fills about 55% of the tile, perfectly centered, thick consistent stroke weight, readable at 44 pixels. Consistent icon family style. Style: clean modern flat illustration with soft depth — rounded geometric shapes, smooth gradients, gentle soft shadows, no outlines, crisp vector-like edges. Color palette: electric indigo #4C6FFF, deep navy #14121F, violet #8552F0, warm amber #FFB84D, mint green #4CC38A, off-white #F4F2FF. Mood: calm, smart, trustworthy, modern; not childish, not corporate-stock. Balanced composition with generous empty space. No text, no letters, no numbers, no digits, no words, no typography, no logos, no watermark, no signature, no UI screenshots, no people, no faces, no hands, no brain, no medical symbols, no official seals, no coats of arms, no stamps, no ribbons, no cartoon characters, no animals, no photorealism, no clutter.
```

`[TILE]` va `[SYMBOL]` o'rniga:

| `<id>` | [TILE] | [SYMBOL] |
|---|---|---|
| `schulte` | `indigo #6384FF to #3552E0` | `a 5×5 grid of small rounded squares with a thin connected path running through several of them in order; the last square on the path is amber` |
| `matrix-memory` | `violet #9A6BFF to #6A3BD6` | `a 4×4 grid of rounded squares where four squares glow solid white and the rest are faint outlines; one glowing square is amber` |
| `sequence` | `violet #9A6BFF to #6A3BD6` | `a horizontal row of four rounded squares with a small arrow above them pointing right and tiny dots under them showing an order; the third square is lit amber` |
| `nback` | `violet #9A6BFF to #6A3BD6` | `three rounded cards stacked in depth, receding to the upper left, with a curved arrow linking the back card to the front card; the back card has an amber edge` |
| `mental-math` | `mint green #5FD69C to #2E9E6C` | `a plus sign, a minus sign and an equals sign made of thick rounded bars arranged in a tidy cluster; the equals sign is amber` |
| `flanker` | `indigo #6384FF to #3552E0` | `a horizontal row of five bold chevron arrows, four pointing right and the middle one pointing left in amber` |

Izoh: plitka rangi o'yin turini (diqqat / xotira / tezlik) bildiradi,
belgi shakli esa o'yinni — rang yagona farq emas. Shulte jadvali va tez
hisob odatda raqam bilan chiziladi — bu yerda ATAYLAB raqamsiz (generator
raqamni buzadi va "no digits" bilan zid bo'lardi).

---

## 16–17. Logotip

### 16. Belgi (mark)

- **Manba:** `resources/art/logo-mark.png` — 1024×1024, PNG, **shaffof fon**.
- Bu — ikonka belgisi (1–2) ning plitkasiz, yolg'iz varianti: katak
  panjarasi, halqa ("Q"/lupa) va oltin katak.

```
Brand logo mark isolated on a fully transparent background (alpha channel): a compact 3×3 grid of small rounded square tiles in indigo #4C6FFF at 30% opacity, with a thick indigo #4C6FFF ring centered on the middle tile and a short diagonal tail toward the bottom-right tile, which is solid warm amber #FFB84D — the shape reads like a magnifying glass and like the letter Q. Flat, no shadows, crisp geometric construction, perfectly centered, works in a single color. Style: clean modern flat illustration with soft depth — rounded geometric shapes, smooth gradients, gentle soft shadows, no outlines, crisp vector-like edges. Color palette: electric indigo #4C6FFF, deep navy #14121F, violet #8552F0, warm amber #FFB84D, mint green #4CC38A, off-white #F4F2FF. Mood: calm, smart, trustworthy, modern; not childish, not corporate-stock. No text, no letters, no numbers, no digits, no words, no typography, no logos, no watermark, no signature, no people, no faces, no hands, no brain, no medical symbols, no official seals, no coats of arms, no stamps, no ribbons, no cartoon characters, no animals, no photorealism, no clutter.
```

Izoh: logotip vektor bo'lishi kerak (har o'lchamda tiniq). Generator
rasmini Figma/Illustrator'da **vektorga qayta chizing** (bu oddiy
geometriya: 8 ta yumaloq kvadrat, halqa, dum, oltin kvadrat) — rasterni
"auto-trace" qilish chekkalarni buzadi. `tools/icon.html` dagi SVG
belgisi aynan shu geometriya — undan ham boshlash mumkin.

### 17. Gorizontal va kvadrat logotip

Generator bilan EMAS — dizayn dasturida yig'iladi, chunki "IQuest"
yozuvi aniq shrift bilan terilishi shart.

| Fayl | Nima | Qanday |
|---|---|---|
| `resources/brand/iquest-logo-horizontal.svg` | belgi + yozuv, och fon uchun | belgi chapda; o'ngda "IQuest" — Manrope ExtraBold (800), harf oralig'i −2%; "IQ" #4C6FFF, "uest" #14121F; belgi balandligi = yozuvning bosh harf balandligidan ~1.3 barobar |
| `resources/brand/iquest-logo-horizontal-dark.svg` | qorong'i fon uchun | xuddi shu, "uest" #F4F2FF |
| `resources/brand/iquest-logo-square.png` | kvadrat, 1024×1024 | belgi brend plitkasida — ilova ikonkasi (`resources/icon-only.png`) bilan bir xil bo'lishi mumkin |

- Yozuvni SVG'ga qo'yishdan oldin **konturga aylantiring** ("Outline
  text" / "Create outlines") — aks holda Manrope o'rnatilmagan
  kompyuterda boshqa shrift chiqadi. Shrift: `node_modules/@fontsource/manrope`
  yoki Google Fonts (ochiq litsenziya, OFL).
- Atrofdagi bo'sh joy: har tomondan kamida belgi kengligining 25% i.
- Minimal o'lcham: gorizontal — 96px kenglik, kvadrat — 24px.

---

## Rasmlar qo'yilgandan keyin

```bash
npm run icons        # 1–4:  resources/*.png + android/app/src/main/res/**
npm run og           # 12:   resources/og.jpg
npm run build        # www/  (suratlar uchun)
npm run play:assets  # 5–6:  resources/play/{uz,ru}/…, icon-512.png
# 7–11, 14–15: yuqoridagi sharp buyruqlari (src/…)
# 13, 16–17:   cert agenti va dizayn dasturi
```

Tekshirish: `resources/play/` va `android/app/src/main/res/mipmap-*`
ichidagi rasmlarni ko'zdan kechiring; telefonda `IQuest-debug.apk` ni
o'rnatib ikonka va splash'ni ko'ring (launcher'ga qarab shakl har xil).
`npm run icons` `AndroidManifest.xml` ni qayta formatlashi mumkin
(mazmuni o'zgarmaydi) — diff'da ko'rinsa, formatlashni qaytarish mumkin.
