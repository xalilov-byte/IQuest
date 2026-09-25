# HANDOFF — ishni boshqa sessiya yoki akkauntda davom ettirish

> Bu fayl har muhim bosqichda yangilanadi. Oxirgi yangilanish sanasi
> pastdagi "Holat" jadvali sarlavhasida.

## 1. Boshqa Claude akkauntida davom etish

1. O'sha akkauntda GitHub'ni ulang: **https://claude.ai/connect-github**
   (GitHub foydalanuvchisi `xalilov-byte`). Claude GitHub App
   `xalilov-byte/IQuest` repo'siga o'rnatilgan bo'lishi kerak — o'sha
   sahifadan.
2. claude.ai/code da yangi sessiya: repo **`xalilov-byte/IQuest`**.
3. Birinchi xabar: **"HANDOFF.md va CLAUDE.md ni o'qi, `snapshot`
   shoxchasini tekshir va davom et."**

Shoxchalar:

| Shoxcha | Nima |
|---|---|
| `main` | oxirgi toza, CI o'tgan holat (integratsiyadan keyin yangilanadi) |
| `wip` | tekshirilgan va commit qilingan ishlar (har agent tugaganda) |
| `snapshot` | **avtomatik, har 10 daqiqada**: ishchi papkaning to'liq holati, agentlarning YARIM ishi bilan. Build o'tmasligi mumkin. Sessiya to'satdan uzilsa — eng yangi ish shu yerda |

Snapshot'dan davom etish: `git fetch origin snapshot && git checkout -b
davom origin/snapshot`, keyin `git diff wip..davom --stat` — qaysi
fayllar yarim qolgani ko'rinadi. Fayl egaligi (CONTRACT §7) bo'yicha
qaysi agent ishi ekanini aniqlang va o'sha qismni qayta topshiring.

## 2. Egasining qarorlari (o'zgarmaydi)

- Nom **IQuest**, sayt **iquest.uz**, Android `uz.iquest.app`.
- Liga (haftalik ball), reyting, 6 ta IQ o'yini, IQuest.uz beradigan
  sertifikat — BO'LADI. Mezon: faqat Google Play siyosati.
- Hamma narsa egasining **VDS** serverida: sayt, `api.iquest.uz`,
  `admin.iquest.uz`, baza va barcha foydalanuvchi ma'lumotlari.
- Nazariy alohida qoladi, unga tegilmaydi.

## 3. Holat (2026-09-25, 09:00 UTC)

| Qism | Holat | Fayllar |
|---|---|---|
| Asos (Nazariy'dan, haydovchilik kontentisiz) | ✅ | — |
| IQ yadrosi: reyestr, validateItem, rng | ✅ | `src/iq/{index,rng}.js` |
| Matritsa generatori | ✅ 13 test | `src/iq/gen/matrix.js` |
| Son qatorlari | ✅ 17 test | `src/iq/gen/series.js` |
| Fazoviy | ✅ 15 test | `src/iq/gen/spatial.js` |
| Og'zaki (170 savol uz/ru, `reviewed:false`) | ✅ 15 test | `content/verbal.json`, `src/iq/gen/verbal.js` |
| Baholash (3PL/EAP), sessiya, verify, progress | ✅ 77 test | `src/iq/{score,session}.js`, `src/progress.js` |
| O'yinlar reyestri | ✅ | `src/games/index.js` |
| Brend, Android ID, ikonka, PLAY.md, RASMLAR.md | ✅ | `android/`, `resources/`, … |
| **UI** (ekranlar, o'yin ekrani, liga, sertifikat oqimi, landing, i18n) | ⏳ | `src/Main.dc.html`, `src/i18n*.js`, `src/site/`, `tools/{source,mksite}.mjs` |
| **Backend** (sxema, RLS, liga, sertifikat, Edge Functions, serverdagi test, data.js) | ⏳ | `supabase/**`, `src/data.js` |
| **Xotira o'yinlari** (matrix-memory, sequence, nback) | ⏳ | `src/games/{matrix-memory,sequence,nback}.js` |
| **Tezlik o'yinlari** (schulte, mental-math, flanker) | ⏳ | `src/games/{schulte,mental-math,flanker}.js` |
| **Sertifikat** (QR + SVG) | ⏳ | `src/cert/**` |
| **VDS deploy** (Docker, TLS, backup, GitHub deploy) | ⏳ | `deploy/**`, `DEPLOY.md`, `.github/workflows/deploy.yml` |
| Integratsiya | ⬜ | pastda §5 |

Har qismning to'liq talabi — `src/iq/CONTRACT.md` dagi tegishli bo'lim va
§7 egalik jadvali. Tugallanmagan qismni qayta topshirishda agentga:
CONTRACT.md ni o'qishni, faqat o'z fayllariga tegishni, commit
qilmaslikni, har kafolat uchun "tishlaydigan" test yozishni va o'zbekcha
qisqa hisobot berishni ayting.

## 4. Muhim texnik qarorlar (nega shunday)

- Savollar qurilmada **urug'dan** yaratiladi (cheksiz, to'g'riligi
  kafolatlangan). Har generator: bir ma'nolilik, "ko'r yechuvchi"ga
  chidamlilik (variantlarga qarab javob topilmaydi), to'g'ri javob o'rni
  tekis — testlarda isbotlangan.
- Qurilmada to'g'ri javob xotirada ⇒ **sertifikat faqat serverdagi
  onlayn testdan** (savollar javobsiz keladi, vaqt/tartib serverda).
- O'yinlar vaqtni `now` argumentidan oladi ⇒ server jurnal bo'yicha
  **replay** qilib ballni tekshiradi (liga).
- `reliable`: n ≥ 20 va se ≤ 0.5 (1200 virtual odam simulyatsiyasi:
  r = 0.89, 90% oraliq qamrovi 0.90).

## 5. Integratsiya — qolgan ishlar ro'yxati

- [ ] `src/iq/gen/demo.js` va `src/games/demo.js` ni o'chirish.
- [ ] UI ↔ backend: `window.nzData.remoteTest` (serverdagi test),
      leaderboard, sertifikat API — UI chaqiruvlari data.js dagi haqiqiy
      API bilan mos kelishini tekshirish.
- [ ] UI ↔ o'yinlar: 6 ta haqiqiy o'yin umumiy o'yin ekranida.
- [ ] UI ↔ `IQ.cert.render` — natija va `/sertifikat/` sahifasi.
- [ ] `build.mjs`: `src/img/` ni `www/` ga ko'chirish (RASMLAR.md).
- [ ] `supabase/config.json`: server o'rnatilgach `url =
      https://api.iquest.uz`, `publishableKey = ANON_KEY` (ochiq kalit).
- [ ] `npm test`, `npm run build:all`, brauzerda to'liq oqim (uz / uz-kirill
      / ru, yorug'/tungi, 360×640) — JS xatosiz.
- [ ] `main` ga push → CI: JS testlari, DB testlari, **Android build**
      (`uz.iquest.app` ning birinchi yig'ilishi — build.gradle'dagi
      `iqIdentity` tekshiruvi), Release'dan APK.
- [ ] Muhim: `main` ga oraliq (integratsiyasiz) push qilinsa Android
      build IQuest nomi bilan eski UI'ni chiqarib qo'yishi mumkin — shuning
      uchun oraliq ishlar `wip` ga.

## 6. Egasidan kutilayotganlar

- VDS: OT, RAM/CPU, joylashgan davlat (O'zbekiston — shaxsiy ma'lumot
  lokalizatsiyasi); `iquest.uz` DNS: A yozuvlar `@`, `www`, `api`, `admin`.
- GitHub Secrets (DEPLOY.md bo'yicha): `VDS_HOST`, `VDS_USER`,
  `VDS_SSH_KEY`, `VDS_KNOWN_HOSTS`; imzo: `IQUEST_KEYSTORE_*`.
- Rasmlar (RASMLAR.md) — birinchi navbatda #2, #3, #5.
- PLAY.md ochiq savollari: kirish usuli (Telegram / telefon / email),
  sertifikat pullikmi, 13 yoshdan kichiklar, nashriyotchi va aloqa
  emaili, server davlati.
- Og'zaki savollarni odam ko'rib chiqishi (`reviewed:false`).

## 7. Muhit haqida (Claude Code on the web)

- Tarmoq: `registry.npmjs.org` ochiq; `dl.google.com`, Docker Hub,
  Supabase hostlari proxy'da bloklangan — aylanib o'tilmaydi.
- Lokal PostgreSQL 16: `/usr/lib/postgresql/16/bin`, root sifatida
  ishlamaydi — `su postgres -c "initdb …"`. SQL testlar:
  `supabase/tests/_stub.sql` → `supabase/apply.sh` → `supabase/tests/*.sql`.
- Brauzer tekshiruvi: Playwright (`npm i playwright-core` scratchpad'ga),
  Chromium `/opt/pw-browsers/chromium-*/chrome-linux/chrome`.
