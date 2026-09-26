# IQuest — Google Play marketing kit

Hammasi **`node tools/mkplaykit.mjs`** bilan yaratiladi. Savol urugʻlari qatʼiy (`pickSeeds`), shuning uchun qayta
ishga tushirsangiz — xuddi shu savollar, xuddi shu IQ natijasi, xuddi shu kompozitsiya va matnlar; skrinshot va videodagi
test/natija/izoh ham **bir xil** (bitta urugʻ).
Brend: egasi tasdiqlagan **«01 Matrix»** logo (navy `#10183A`, marjon `#FF5B3A` / qorongʻi fonda `#FF6A4B`),
manba — `brand-src/` (uchta SVG). Shriftlar: Manrope 700/800 (sarlavhalar, kirill ham), wordmark — Space Grotesk 700 (konturlangan).
Ilova suratlari — **haqiqiy ilova** (Playwright, yigʻilgan `www/index.html`), soxta UI yoʻq.

## Fayllar va Play Console'da qayerga

| Fayl | Nima | Qayerga |
|---|---|---|
| `screenshots/uz/01..08.png` | 1080×1920 PNG (alfasiz, < 8 MB), brend foni + 2 qatorli sarlavha + telefon | **Grow users → Store presence → Main store listing → Graphics → Phone screenshots** (asosiy til *uz*). Tartib: 01 → 08 (birinchi 2–3 tasi qidiruvda koʻrinadi) |
| `screenshots/ru/01..08.png` | xuddi shu, ruscha sarlavhalar | Oʻsha sahifa → **Manage translations → Russian (ru-RU)** → Graphics → Phone screenshots |
| `feature-graphic-uz.png`, `feature-graphic-ru.png` | 1024×500 PNG: lockup + qisqa shior (IQ test va aql oʻyinlari); markaz (play tugmasi joyi) boʻsh | **Main store listing → Graphics → Feature graphic** (uz — asosiy, ru — tarjimada). **Asosiy variant — shu.** `resources/brand/play/feature-graphic-1024x500-*.jpg` da «Bepul»/«Reklamasiz» tugmalari bor — Play preview talablari narx/aksiya matnini taqiqlaydi; brend jamoasi ularni olib tashlasa, istalganini yuklash mumkin |
| `video/promo-horizontal-1920x1080.mp4` (uz), `…-ru.mp4` | **Play videosi**: 30 s, 1920×1080, 30 fps, H.264, ovozsiz; yakunda doʻkon/narx soʻzi yoʻq | Play fayl qabul qilmaydi: ovozni qoʻshib (VOICEOVER.md) **YouTube'ga oddiy video** qilib yuklang (Public yoki Unlisted), soʻng **Main store listing → Graphics → Video** maydoniga havola (ru tarjimasiga — `…-ru.mp4` ning havolasi). Havola faqat `https://www.youtube.com/watch?v=…` koʻrinishida: **Shorts, playlist yoki kanal havolasi va qoʻshimcha parametrlar (`&t=`, `&list=`…) qabul qilinmaydi**; yosh cheklovi yoʻq, reklama (monetizatsiya) oʻchiq, «embedding» yoqiq |
| `video/promo-vertical-1080x1920.mp4` (uz), `…-ru.mp4` | 30 s vertikal; yakunda «Google Playʼda». Muhim bosishlar y ≤ 1450 (pastki qatlam ostida qolmaydi) | YouTube Shorts, Instagram Reels, TikTok, Telegram. **Play'ga emas** (≤ 60 s vertikal YouTube'da Shorts boʻlib qoladi, Play Shorts havolasini qabul qilmaydi) |
| `video/promo15-*.mp4` | 15 s qisqa versiya (vertikal + gorizontal), yakunda «Google Playʼda» | Reklama (Google Ads App campaigns), Stories |
| `VOICEOVER.md` | uz + ru diktor matni, sahna vaqtlari, boʻgʻin/s, TTS koʻrsatmalari, ovozni qoʻshish buyrugʻi | — |
| `voiceover/{uz,ru}-{30,15}s.txt` | TTS ga toʻgʻridan-toʻgʻri qoʻyiladigan matn (har sahna — bitta qator) | — |
| `voiceover/{uz,ru}-{30,15}s.ssml` | SSML 1.0 (`xml:lang`, pauzalar, IQuest/IQ talaffuzi `<sub alias>`) | — |
| `raw/{uz,ru}/01..08.png` | 1080×1920 ramkasiz ilova suratlari (360×640 @3) — oʻsha retseptlar | Sayt, ijtimoiy tarmoq, koʻrik. **Play'ga yuklash uchun emas**: 640 px balandlikda uzun roʻyxatlar (natija, nishonlar) pastki chetdan davom etadi — telefondagidek, lekin doʻkon suratida chala koʻrinadi. Play uchun — `screenshots/` |
| `contact-sheet.png` | hamma suratlar + video kadrlari (koʻrik uchun) | yuklanmaydi |
| `brand-src/*.svg` | logo manbasi | yuklanmaydi |

Ikonka 512×512 — `resources/brand/play/` (`npm run brand`); bu paketda ikonka yoʻq.
`brand-src/` — egasi tasdiqlagan «01 Matrix» manbasi (`resources/brand/logo/` dagi eksportlar bilan bir xil shakl).

### Skrinshotlar

| № | Ekran (retsept) | uz | ru |
|---|---|---|---|
| 01 | `test-picked` | Mantiqni sinab koʻring | Проверьте свою логику |
| 02 | `result-test` | IQ natijasi va oraliq | Результат IQ и диапазон |
| 03 | `explain` | Har javobga izoh | Разбор каждого ответа |
| 04 | `practice` | 4 xil topshiriq | 4 типа заданий |
| 05 | `games` | 6 ta IQ oʻyini | 6 IQ-игр для ума |
| 06 | `badges` | Nishonlar yigʻing | Собирайте значки |
| 07 | `shop-badges` | Profilingizni bezang | Украшайте профиль |
| 08 | `onboard-lang` | 4 tilda, internetsiz | 4 языка, без интернета |

- Holat ilovaning oʻzi bilan «yashab» tayyorlanadi: `alisher_k` profili (boyoʻgʻli avatar, bio), 12 kun ketma-ket mashq,
  uch marta «Xatolarim» takrorlash, bitta toʻliq IQ test, ilova bergan nishonlar va tangalar.
- **Bosh sahifa ishlatilmaydi**: unda liga kartasi va oraliqsiz «Oxirgi natija: IQ …» bor (PLAY.md §8: oraliqsiz IQ raqami
  va liga doʻkon suratiga tushmaydi). Skript har suratda tekshiradi: oraliqsiz IQ raqami, «liga», taqiqlangan daʼvo,
  varaqda kesilgan qator, tepada yarmi kesilgan karta — topilsa yiqiladi.
- 02 va video natija sahnasidagi «+230 ball» — natija ekranining oʻzida (liga ballari, CONTRACT §17 dagi soʻz); kamera IQ raqami va oraliqqa qaratilgan.
- 03 — izoh varagʻi: telefon 1.3× (pastki qismi — varaq — asosiy), savol toʻliq sigʻadigan qilib tanlangan.
- 08 — birinchi ishga tushirishdagi til tanlash ekrani (haqiqiy UI, 4 til).

### Video sahnalari (30 s)

- 00:00.0–00:01.5 **intro** — IQ test va aql oʻyinlari
- 00:01.5–00:07.5 **test** — Mantiqni sinab koʻring
- 00:07.5–00:11.5 **result** — IQ natijasi va oraliq
- 00:11.5–00:15.5 **explain** — Har javobga izoh
- 00:15.5–00:21.0 **game** — 6 ta IQ oʻyini
- 00:21.0–00:25.5 **shop** — Profilingizni bezang
- 00:25.5–00:30.0 **outro** — IQ test va aql oʻyinlari (Play) / Google Playʼda · 4 tilda · Internetsiz

- Kadr 0 dan toʻliq lockup (poster kadri); marjon «javob» katagi 0.1 s da toʻladi, telefon 0.75 s da chiqa boshlaydi.
- Ilova qismlari — haqiqiy bosishlar (Playwright `mouse.click`, CDP screencast). Marjon halqa — teginish koʻrsatkichi; ekran almashishi bilan oʻchadi.
- Sahnalar orasida 0.15 s ilova fonida kesim (ikki ekran ustma-ust tushmaydi). Gorizontal versiyada kamera faol joyga yaqinlashadi.
- Natija sahnasida faqat kamera yaqinlashadi: ilovada IQ sanagichi yoʻq, shuning uchun chizilmagan; raqam doim oraliq bilan.

## Qayta yaratish

```sh
# 1) Ilovani yigʻish (repo'ni ifloslamaslik uchun nusxada):
mkdir -p /tmp/iq && cd /home/user/IQuest && tar cf - --exclude=./node_modules --exclude=./android --exclude=./.git \
  --exclude=./www --exclude=./dist . | (cd /tmp/iq && tar xf -) && ln -sfn $PWD/node_modules /tmp/iq/node_modules
(cd /tmp/iq && node build.mjs)
# 2) ffmpeg: PATH da boʻlmasa —  pip install imageio-ffmpeg   (yoki FFMPEG=/yoʻl/ffmpeg)
# 3) Paket:
node tools/mkplaykit.mjs --app=/tmp/iq/www/index.html                 # hammasi (~20 daqiqa)
node tools/mkplaykit.mjs --app=… --only=shots,feature,sheet           # faqat rasmlar
node tools/mkplaykit.mjs --app=… --only=video --lang=uz --cut=full    # faqat 30 s uz video (--orient=h|v)
node tools/mkplaykit.mjs --only=docs                                  # README, VOICEOVER (ilova kerak emas)
```

Talablar: global Playwright + Chromium (`npm root -g`), `sharp` (loyihada bor), ffmpeg (libx264).
Matnlar skript boshida (`SHOTS`, `VCAP`, `VO`, `TIMELINES`); hammasi `tools/honesty.mjs`, liga/reyting, narx va doʻkon nomi
regexlaridan oʻtadi, ovoz qatorlari oʻz oynasiga sigʻishi tekshiriladi — xato boʻlsa skript toʻxtaydi.

Ovozni qoʻshish (video uzunligi saqlanadi):

```sh
ffmpeg -i video.mp4 -i vo.wav -map 0:v -map 1:a -c:v copy -af apad -c:a aac -t 30 out.mp4     # 30 s
ffmpeg -i video.mp4 -i vo.wav -map 0:v -map 1:a -c:v copy -af apad -c:a aac -t 15 out.mp4     # promo15-*
```

## Play talablari (tekshirilgan)

- Skrinshot: PNG, 1080×1920 (9:16), alfa-kanalsiz, har biri ≤ 8 MB; 2–8 ta.
- Feature graphic: 1024×500 PNG, alfa-kanalsiz; markazda play tugmasi uchun joy boʻsh.
- Preview asset'larda narx/aksiya («bepul»), doʻkon nomi/nishoni, reyting va «№1» daʼvolari yoʻq.
- Promo video: faqat oddiy YouTube havolasi `https://www.youtube.com/watch?v=…`; Shorts, playlist yoki kanal havolasi va
  qoʻshimcha parametrlar qabul qilinmaydi; yosh cheklovi yoʻq; reklamasiz (monetizatsiya oʻchiq); «embeddable»; gorizontal tavsiya etiladi.
