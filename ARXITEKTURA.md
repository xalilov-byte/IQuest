# IQuest v1.1 — Arxitektura (yakuniy spetsifikatsiya)

**Holat:** yakuniy, amalga oshirish uchun. **Sana:** 2026-09-25.
**Asos:** «Aniqlik birinchi» taklifi (ikkala hakam gʻolib deb topgan). Unga
dizayn-tizim taklifidan (ranglar roli, token shkalasi, ikonkalar, rasm
quvuri, sozlamalar gigiyenasi) va faollik taklifidan (bildirishnoma
rejalashtiruvchisi, iqtisod simulyatsiyasi, soat himoyasi, inglizcha
lugʻat) qismlar qoʻshilgan. Hakamlarning barcha majburiy tuzatishlari
kiritilgan.
**Bogʻliq hujjat:** `src/iq/CONTRACT.md`. WP0 bu hujjatni CONTRACTʼning
§12–§17 boʻlimlariga koʻchiradi. Ziddiyat boʻlsa CONTRACT ustun: avval
CONTRACT oʻzgaradi, keyin kod.

---

## 0. Bir ekranda: ilova qanday tuzilgan

### 0.1 Oltita qoida (egasi uchun)

1. **Bosh** — «bugun nima qilaman». Bitta aniq keyingi qadam.
2. **Mashq** — «nimani mashq qilaman». Savol turlari va aql oʻyinlari.
3. **Reyting** — «shu hafta qayerdaman». Liga, rekordlar, oxirgi haftalar.
4. **Profil** — «men kimman». Rasm, nom, bio, nishonlar, tangalar.
5. **Sozlamalar** — «ilova qanday ishlaydi». Til, tema, ovoz, eslatmalar,
   huquqiy sahifalar, maʼlumotlar. Profil tepasidagi **tishli gʻildirak**dan
   ochiladi va Profil sahifasida boshqa sozlama qatori qolmaydi.
6. **Har narsaning bitta uyi bor.** Bir narsa ikki joyda sozlanmaydi.
   Serverni talab qiladigan narsa (chat, guruh, doʻstlar) ishlamaguncha
   ilovada umuman koʻrinmaydi: «tez kunda» yozuvi ham, oʻchiq tugma ham yoʻq.

### 0.2 Navigatsiya daraxti

```
PASTKI MENYU — 4 tab, tartib oʻzgarmaydi
│
├─ BOSH
│   ├─ [avatar + ism] ................ → Profil tab
│   ├─ olov 7  (faqat maʼlumot, tugma emas)
│   ├─ [● 120] tanga ................. → Doʻkon
│   ├─ Liga kartasi .................. → Reyting tab
│   ├─ IQ test kartasi ............... → (1-marta «Test qanday oʻtadi») → Savol → Natija
│   └─ Kunlik vazifalar (3 qator)
│        ├─ Bugungi mashq ............ → Savol (aralash mashq) → Natija
│        ├─ Aql oʻyini ............... → Oʻyin (kun oʻyini) → Oʻyin yakuni
│        └─ Xatolarni tuzating         → Savol (takrorlash) → Natija
│           yoki «{Tur} mashqi»        → Savol (shu tur) → Natija
│
├─ MASHQ
│   ├─ Savol turlari ×4 .............. → Savol → Natija
│   ├─ Xatolarim · Saqlangan ......... → Savol (takrorlash) → Natija
│   └─ IQ oʻyinlari ×6 ............... → Oʻyin → Oʻyin yakuni
│
├─ REYTING (faqat koʻrish)
│   Liga kartasi · Zinapoya · Rekordlar · Oxirgi haftalar
│
└─ PROFIL
    ├─ tishli gʻildirak .............. → SOZLAMALAR
    │     Til · Tema · Ovoz effektlari · Tebranish ·
    │     Kunlik eslatma · Vaqt · Streak eslatmasi ·
    │     Qanday ishlaydi · Aloqa · Ilovani baholash ·
    │     Foydalanish shartlari · Maxfiylik siyosati ·
    │     Maʼlumotlarni oʻchirish
    ├─ [Profilni tahrirlash] ......... → PROFILNI TAHRIRLASH (rasm, rang, nom, bio)
    ├─ Nishonlar ..................... → NISHONLAR (yutuqlar + kolleksiya)
    ├─ Doʻkon ........................ → DOʻKON (ranglar + nishonlar)
    ├─ Testlar tarixi (roʻyxat)
    └─ Savol turlari (darajalar)

BIRINCHI KIRISH (bir marta):
  Til → IQ test → Mashq va oʻyinlar → Ball va tanga → Profilingiz → Eslatma → Bosh
```

### 0.3 Nima qayerda — har narsaning bitta uyi

| Narsa | Uyi | Boshqa kirish nuqtasi |
|---|---|---|
| Til, tema, ovoz, tebranish | Sozlamalar | Birinchi kirishda til |
| Eslatmalar (bildirishnoma sozlamasi) | Sozlamalar → «Bildirishnomalar» boʻlimi | Birinchi kirishning oxirgi qadami |
| Bildirishnomalar tarixi (inbox) | **v1.x da yoʻq.** v2 da Bosh sarlavhasidagi qoʻngʻiroqcha | — |
| Rasm, rang, nom, bio | Profilni tahrirlash | Birinchi kirishdagi «Profilingiz» |
| Nishonlar (yutuq va kolleksiya) | Nishonlar ekrani | Profildagi vitrina |
| Tanga sarflash | Doʻkon | Bosh sahifadagi tanga, Profildagi «Doʻkon» qatori, qulflangan rang |
| Liga holati (toʻliq) | Reyting | Bosh sahifadagi liga kartasi (qisqa) |
| Test tarixi | Profil | — |
| Qoʻllanma | Birinchi kirish | Sozlamalar → «Qanday ishlaydi» |
| Huquqiy matn va rad qilish matnlari | Faqat sayt: Foydalanish shartlari | Sozlamalar → «Foydalanish shartlari» |
| Chat, guruh, doʻstlar | v2: 5-tab «Doʻstlar» | — |

### 0.4 Ikki valyuta (eng muhim tushuncha)

| | **Ball** ◆ (binafsha) | **Tanga** ● (oltin) |
|---|---|---|
| Nima uchun | Haftalik ligada koʻtarilish | Profilni bezash (Doʻkon) |
| Qayerdan | Toʻgʻri javob (+10, bir savolga bir marta), oʻyin (30–150) | Kunlik vazifalar, nishonlar, hafta yakuni, xush kelibsiz bonusi |
| Sarflanadimi | **Hech qachon** | Faqat Doʻkonda |
| Pulga sotiladimi | Yoʻq | Yoʻq |

Xarid qilish liga oʻrnini **hech qachon** pasaytirmaydi. Ball va tanga bir-biriga
aylantirilmaydi. «Ball» soʻzi faqat liga ballari uchun ishlatiladi: IQ natijasi
har doim «IQ» yoki «natija» deb ataladi.

### 0.5 Nima qachon chiqadi

| Versiya | Ichida |
|---|---|
| **v1.1.0** (versionCode 2) | Yangi navigatsiya, Sozlamalar ekrani, profil (rasm, rang, nom, bio, vitrina), tanga, kunlik vazifalar, nishonlar, Doʻkon, birinchi kirish, yangi Bosh sahifa, Reyting qoʻshimchalari, ovozlar, ikonkalar tizimi, bildirishnomalar v2, brend aktivlari. Tillar: oʻzbek (lotin), oʻzbek (kirill), rus. Rus tilidagi huquqiy sahifalar. |
| **v1.2.0** (versionCode 3) | Ingliz tili. U hamma kontent tayyor boʻlib, build darvozasidan oʻtgandagina yoqiladi. |
| **v2.0** (backend bilan) | Hisob, serverda tekshirilgan liga jadvali, doʻstlar, guruhlar, chat, inbox, push bildirishnomalar, server hamyoni. |

---

## 1. Asosiy qarorlar (qisqa roʻyxat)

1. **4 tab qoladi**: Bosh · Mashq · Reyting · Profil. v2 da 5-tab «Doʻstlar» qoʻshiladi (Reyting va Profil orasida).
2. **Sozlamalar alohida ekran.** U Profildagi tishli gʻildirakdan ochiladi. Profil sahifasida sozlama qatori qolmaydi.
3. **Eslatmalar Sozlamalar ichida.** Ular alohida ichki ekran emas, Sozlamalardagi «Bildirishnomalar» boʻlimining 3 ta qatori. Inbox v1.x da yoʻq.
4. **Profil**: foydalanuvchi nomi (ixtiyoriy), bio (≤80), 16 ta bepul tayyor avatar yoki oʻz rasmi (qurilmada), 12 ta rang (6 tasi bepul), 3 ta nishonli vitrina. Nom berilmaguncha hamma joyda «Mehmon» koʻrinadi.
5. **Ikki valyuta qatʼiy ajratilgan.** Ball — binafsha ◆, tanga — oltin ●. Oltin rang ilova xromida faqat tangaga tegishli.
6. **Tanga manbalari 4 ta**: kunlik vazifalar (kuniga ≤30), bir martalik yutuq nishonlari, hafta yakuni mukofoti (≤100), xush kelibsiz bonusi (50). Test topshirgani uchun tanga **berilmaydi**, test javoblari vazifaga kirmaydi, IQ chegarasiga bogʻliq nishon yoʻq.
7. **Doʻkon v1**: 6 ta pulli rang va 8 ta kolleksiya nishoni, jami 5 100 tanga. Katalog `src/catalog.js` jadvalidan chiziladi. Yangi javon qoʻshish uchun jadvalga maʼlumot va bitta segment kifoya.
8. **Bosh sahifa 4 ta qatʼiy blokdan iborat**: sarlavha, liga kartasi, IQ test kartasi, Kunlik vazifalar. 740 px va undan baland ekranda aylantirish (scroll) kerak emas. Toʻyingan (saturated) rangli blok faqat IQ test kartasi.
9. **Birinchi kirish**: 6 qadam, 2 qator matndan oshmaydi, «Oʻtkazib yuborish» doim bor. 1.0 dan yangilanganlar faqat 2 qadamni koʻradi.
10. **Ingliz tili «hammasi yoki hech narsa» tamoyilida ishlaydi.** Hamma savol turi, hamma oʻyin, 134 ta ogʻzaki savolning hammasi, UI lugʻati va inglizcha huquqiy sahifalar tayyor boʻlmaguncha til tanlovida English chiqmaydi. Inglizcha test uz/ru testi bilan bir xil tarkibda boʻladi.
11. **Bildirishnomalar**: yangi oʻrnatishda standart holati oʻchiq. Ruxsat faqat tugma bosilganda soʻraladi. Kuniga koʻpi bilan 2 ta, faqat noaniq alarm ishlatiladi, ilovaning oʻz kichik ikonkasi bor.
12. **Main.dc.html yagona orkestrator.** Hamma mantiq kichik modullarda (`settings`, `profile`, `wallet`, `badges`, `league`, `catalog`, `avatars`, `icons`, `art`). Modullar bir-birining holatiga tegmaydi.
13. **Runtimeʼga matn va fayl kiritish qoʻshiladi**: delegatsiyalangan `input`/`change` hodisalari, «boshqarilmaydigan» inputlar. Bu UI paketining birinchi ishi.
14. **Brend**: mavjud IQ monogrammasi saqlanadi. Android 13 mavzuli ikonkasi, bildirishnoma ikonkasi va barcha ijtimoiy tarmoq oʻlchamlari bitta `tools/brand.html` manbasidan qayta yasaladi. Play ekran suratlari **1080×1920** ga oʻtadi (hozirgi 1170×2532 Playʼning 2:1 chegarasidan oshadi).
15. **Hozircha shu** (egasining «hozirchaga shu boʻladi» qarori): v1.1 da streak himoyasi, kunlik maqsad tanlovi, inbox, tip-varaqlar (faqat bitta test tanishtiruvi bor), kamera, ism yonidagi emblema va pulsiz sotilmaydigan ranglar **yoʻq**. Ular kerak boʻlsa, avval navigatsiya daraxtida uyi belgilanadi.

---

## 2. Navigatsiya modeli

### 2.1 Ekran darajalari (foydalanuvchi oʻrganadigan qoida)

| Daraja | Nima | Koʻrinishi | Pastki menyu |
|---|---|---|---|
| **L0 — Tab** | Bosh, Mashq, Reyting, Profil | Oddiy ekran | Bor |
| **L1 — Ichki ekran (push)** | Sozlamalar, Profilni tahrirlash, Nishonlar, Doʻkon | Toʻliq ekran. Tepada 56 px sarlavha: chapda 44 px orqaga ‹, markazda nom (17/700), oʻngda 44 px joy | Yoʻq |
| **Toʻliq ekranli oqim** | Birinchi kirish, Savol, Natija, Oʻyin | Toʻliq ekran (mavjud) | Yoʻq |
| **Varaq (sheet)** | Tanlov va maʼlumot (til, tema, vaqt, rasm, xarid, nishon…) | Pastdan chiqadi, balandligi qatʼiy | — |
| **Dialog** | Tasdiq (2 tugma) | Mavjud tasdiq varagʻi | — |
| **Bayram kartasi** | Yangi nishon, liga koʻtarilishi, hafta yakuni | Markazdagi 300×340 karta, ostida parda | — |
| **Toast** | Kichik xabar (masalan xush kelibsiz bonusi) | Pastki menyu ustida 48 px pill (sarlavhani toʻsmaydi), 2,4 s | — |

Qoida: L1 ekrandan faqat L1 yoki varaq ochiladi. Savol yoki oʻyin boshlanganda push-stek tozalanadi. Ichki ekranlarning ichma-ichligi 1 darajadan oshmaydi.

### 2.2 Mainʼdagi yangi holat (state)

```js
stack:     [],        // [{ name: 'settings'|'profileEdit'|'badges'|'shop', params? }]
sheet:     null,      // { kind: 'lang'|'theme'|'time'|'avatar'|'photo'|'buy'|'badge'|'coinHelp'|'testIntro', ...params }
dialog:    null,      // mavjud turlar + 'unsavedProfile'
onboard:   null,      // { step: 0..5, mode: 'new'|'upgrade'|'replay' }
celebrate: [],        // navbat: [{ kind: 'badge'|'league'|'week'|'summary', ... }]
toast:     null,      // { text, until }
edit:      null,      // Profilni tahrirlash qoralamasi: { username, bio, color, avatar, photoData, errs }
settings:  {},        // nzSettings.get() nusxasi (qayta chizish uchun)
profile:   {},        // nzProfile.get() nusxasi
coins:     0,         // nzWallet.balance() nusxasi
// OLIB TASHLANADI: soundOn, notifOn (endi nzSettings da)
```

`tabsOn = app && !run && !result && !game && !stack.length && !onboard`.
`fullOn = !tabsOn`. Bu build.mjs dagi `fullOn` langarining oʻzi, satr oʻzgarmaydi.
Ichki ekranlar `fullOn` konteyneri ichida yangi `stackOn` bloki sifatida chiziladi.
Konteynerning klassi `nz-screens-quiz` boʻlgani uchun `scrollTop()` ularni ham qamraydi.

### 2.3 Android «orqaga» zanjiri (`app.onBack`, tartib qatʼiy)

1. dialog → yopiladi
2. varaq → yopiladi
3. bayram kartasi → «Davom etish» bilan bir xil
4. birinchi kirish → oldingi qadam. 0-qadamda `false` qaytadi va «Chiqish uchun yana bir marta bosing» chiqadi. Qayta koʻrish rejimida 1-qadamdan orqaga bosilsa Sozlamalarga qaytadi
5. Savoldagi «Izoh» varagʻi → yopiladi (mavjud)
6. oʻyin → chiqadi (mavjud)
7. test yoki mashq → mavjud chiqish tasdigʻi
8. natija → yopiladi
9. push-stek → bitta ekran orqaga. Profilni tahrirlashda saqlanmagan oʻzgarish boʻlsa `unsavedProfile` dialogi chiqadi
10. tab ≠ Bosh → Bosh
11. Boshda → `false` (bootstrap «ikki marta bosish»ni koʻrsatadi)

`bootstrap.js` faqat `app.onBack()` ni chaqiradi. Holat nomlarini faqat Main biladi (mavjud tamoyil).

### 2.4 v2 (backend bilan)

5 tab: Bosh · Mashq · Reyting · **Doʻstlar** · Profil. Tab soni oʻzgarganda
build.mjs dagi `repeat(4,1fr)` langari integrator bilan birga oʻzgaradi.
`SOCIAL_ON=false` turganda build ijtimoiy nomlar (`valsFriends`, `valsChat`,
«Doʻstlar» tab yozuvi) bundleʼda yoʻqligini tekshiradi. Bu MONEY_NAMES
tekshiruvi bilan bir xil tartibda ishlaydi.

---

## 3. Ekranlar

**Umumiy qoidalar (hamma ekranda):**
- Yon chekka 16 px, bloklar orasi 12 px, boʻlimlar orasi 24 px.
- Karta radiusi 20, «hero» radiusi 24, tugma radiusi 14.
- Soya faqat bitta: `--shadow`.
- Hamma sanagich `tabular-nums` bilan yoziladi.
- Paydo boʻlib-yoʻqoladigan har bir qator uchun joy **oldindan** ajratiladi. Shartli elementlar `visibility`/shaffoflik bilan yashiriladi, `sc-if` bilan olib tashlanmaydi.
- Ekranda koʻpi bilan **bitta** toʻldirilgan asosiy tugma boʻladi. Roʻyxat ekranlarida bunday tugma yoʻq.
- Ekranda koʻpi bilan **bitta** toʻyingan rangli blok boʻladi (§9.1).

### 3.1 BOSH (qayta quriladi)

**Maqsad:** bugungi keyingi qadam. **Asosiy amal:** IQ test kartasidagi tugma.
Test allaqachon topshirilgan boʻlsa, asosiy amal birinchi bajarilmagan vazifa boʻladi.

Balandlik byudjeti (390×800): 20 + 48 + 12 + 108 + 12 + 180 + 12 + 232 = **624 px**.
Unga 68 px pastki menyu va 16 px zaxira qoʻshiladi. Natijada 740 px va undan baland ekranda aylantirish kerak emas.

**H1 · Sarlavha, 48 px**
- **Chapda tugma** (→ Profil tab):
  - avatar 40 px: rasm, tayyor avatar yoki bosh harf, fonida profil rangi, atrofida 2 px halqa profil rangida;
  - yonida nom 16/700 (sigʻmasa «…» bilan qisqaradi). Nom — foydalanuvchi nomi, u berilmagan boʻlsa «Mehmon».
- **Oʻngda**:
  - **Streak** — tugma emas, **fonsiz oddiy yozuv**: olov glifi 18 px `--green-ink` va son 16/800, eng kami 44 px eni. `aria-label="Ketma-ket faol kunlar: 7"`. Fon ham, soya ham yoʻq, shuning uchun tugmaga oʻxshamaydi.
  - **Tanga** — tugma (→ Doʻkon): balandligi 36 px, fon `--surface`, `--shadow`, oltin tanga glifi 18 px va son 15/800 `--coin-ink`. Eng kami eni 84 px, 5 xonali «12 345» sigʻadi. Balans 400 ms davomida sanab oʻzgaradi, eni oʻzgarmaydi.

**H2 · Liga kartasi, 108 px** (oddiy `--surface` karta, toʻyingan emas; → Reyting)
- 1-qator, 44 px:
  - chapda 44 px liga qalqoni (liga rangi va 0–5 ta chevron — daraja faqat rang bilan emas, shakl bilan ham bildiriladi);
  - «Bronza liga» 16/700 va uning ostida «Bu hafta» 13/600 xira;
  - oʻngda ◆ va «180» 28/800 Space Grotesk, `--ball-ink` rangida.
- 2-qator: 8 px progress chizigʻi, rangi `--ball`.
- 3-qator, 16 px: «Kumush ligagacha 320 ball» 13/600 xira. Eng yuqori ligada «Eng yuqori liga».

**H3 · IQ test kartasi, qatʼiy 180 px** (fon `--primary`, oʻngda 14% shaffoflikdagi IQ belgisi — mavjud)
- Sarlavha «IQ test» 28/800.
- Pastki qator uchun 20 px joy ajratilgan.
- Progress chizigʻi 8 px, u doim bor (davom ettirish holatidan boshqa holatlarda boʻsh).
- Tugmalar qatori 52 px.

| Holat | Pastki qator | Tugmalar |
|---|---|---|
| YANGI (hali test yoʻq) | «30 savol · moslashuvchan» | [Boshlash] — oq, asosiy |
| DAVOM (tugallanmagan test bor) | «12/30 · davom ettiring», chiziq 40% | [Davom ettirish] oq, asosiy · [Yangidan] shaffof (→ mavjud `discardTest` dialogi) |
| BAJARILGAN (≥1 test, tugallanmagani yoʻq) | «Oxirgi natija: IQ 104» (IQ koʻrsatilmaydigan natijada «18/30») | [Qayta topshirish] shaffof (oq 16% fon, oq matn) |

Birinchi marta «Boshlash» bosilganda (`settings.tips.testIntro === false`) test darhol boshlanmaydi. Avval «Test qanday oʻtadi» varagʻi chiqadi (§3.12).

**H4 · Kunlik vazifalar kartasi, 232 px**
- Sarlavha, 40 px: chapda «Kunlik vazifalar» 17/700, oʻngda «1/3» 13/700. Uchala vazifa bajarilganda «3/3 ✓» `--green-ink`.
- Uchta 64 px qator, oralarida ingichka chiziq (hairline). Har qatorda:
  - 40 px ikonka plitkasi;
  - nom 16/700 va uning ostida 13/600 xira progress yozuvi;
  - oʻngda 64×28 mukofot chipi. Bajarilmagan vazifada «● +10» (`--coin-ink`), bajarilganda oʻsha oʻlchamdagi yashil «✓ Olindi» chipi.

| Qator | Ikonka | Nom | Pastki yozuv | Bosilganda |
|---|---|---|---|---|
| Q1 | dumbbell (Mashq glifi) | Bugungi mashq | «3/10 savol» | Aralash mashq (10 savol) |
| Q2 | kun oʻyinining glifi | Aql oʻyini | «Kun oʻyini: Shulte jadvali» | Kun oʻyini ochiladi. Istalgan tugallangan oʻyin hisoblanadi |
| Q3a | x-circle | Xatolarni tuzating | «1/3 savol» | Xatolarim takrori |
| Q3b | savol turi glifi | «Son qatorlari mashqi» | «2/5 savol» | Shu tur boʻyicha mashq |

- Q3 qaysi koʻrinishda chiqishi kun boshida bir marta hal qilinadi (§6.4). **Qulflangan, bosib boʻlmaydigan qator yoʻq.**
- Bajarilgan qator ham bosiladi va oʻsha faoliyat qayta boshlanadi. Oʻlik element yoʻq.
- **«Keyingi qadam» belgisi:** IQ kartasi BAJARILGAN holatda boʻlsa, birinchi bajarilmagan vazifa qatori `--primary-soft` fon va `--primary-ink` nom oladi. YANGI va DAVOM holatlarida bu belgi yoʻq, chunki asosiy amal IQ kartasida.

**Kun oʻyini:** oʻyinlar `id` boʻyicha tartiblanadi, indeks = `dayNumber(dayKey) % soni`. Demo oʻyin kirmaydi.
Funksiya Mainʼda: `gameOfDay(dayKey)`.

**Bosh sahifadan olib tashlanadi:**
- «Oxirgi IQ» plitkasi. U notoʻgʻri Profilga olib borardi, endi uning maʼlumoti H3 ning BAJARILGAN holatida.
- «Bugungi mashq» plitkasi — endi Q1.
- «IQ oʻyinlari» qatori — Mashq bilan takror edi, oʻrnini Q2 egallaydi.
- 56 px haftalik ball sarlavhasi — endi H2 ichida.

**Yangi foydalanuvchi:**
- Sarlavhada «Mehmon», olov 0, ● 50 (xush kelibsiz bonusidan keyin).
- «Boshlovchi liga · ◆ 0», «Bronza ligagacha 150 ball».
- IQ kartasi YANGI holatda.
- Vazifalar: 0/10, «Kun oʻyini: …» va «{eng past darajali tur} mashqi 0/5», chunki Xatolarim hali boʻsh.

### 3.2 MASHQ

**Maqsad:** nimani mashq qilishni tanlash. Roʻyxat ekrani, asosiy tugma yoʻq.
- h1 «Mashq» 28/800.
- 4 ta savol turi qatori, har biri 76 px (mavjud).
- Ikki plitka, har biri 72 px: «Xatolarim» va «Saqlangan» (mavjud). Roʻyxat boʻsh boʻlsa mavjud dialog chiqadi.
- h2 «IQ oʻyinlari», undan keyin 6 ta 76 px qator. Har oʻyinning **oʻz glifi** bor (hozirgi uchta bir xil «qatlamlar» ikonkasi oʻrniga, §9.4).
  Kun oʻyinida nomdan keyin 20 px balandlikdagi «Bugun» pilli turadi. Oʻngda daraja chipi (mavjud).
- Demo oʻyin faqat `IQ_DEMO=1` buildʼida chiqadi (mavjud).

### 3.3 REYTING

**Maqsad:** shu hafta qayerdaman. Faqat koʻrish uchun.
Server boʻlmaguncha boshqa odamlar roʻyxati yoʻq, oʻylab topilgan odam yoʻq.
Serverdan keladigan roʻyxat uchun `leaderboardRows()` ilgagi saqlanadi.

1. **h1 «Reyting».**
2. **Liga kartasi.** Bu ekrandagi yagona toʻyingan blok: binafsha fon, nuqtali naqsh (mavjud).
   - Mavjud qatorlar: «Bu hafta», sanalar, liga nomi 30/800, 10 px chiziq, «Kumush ligagacha 320 ball», «180 / 500».
   - **YANGI qator, 18 px joy ajratilgan:**
     - chapda «Mukofot: ● +10» — joriy liga uchun hafta yakunida beriladigan tanga. Boshlovchi ligada «Mukofot: Bronzadan boshlab»;
     - oʻngda «Oʻtgan hafta: 620». Bu oʻzing bilan poyga; maʼlumot boʻlmasa «Oʻtgan hafta: —».
3. **Zinapoya.** 3×2 chip, har biri 64 px.
   - 1-qator: 16 px qalqon va nom.
   - 2-qator: «500+ · ●25». Boshlovchida faqat «0+».
   - Joriy liga — binafsha toʻldirilgan, oʻtilganlari ✓ bilan, keyingilari xira (mavjud mantiq).
4. **Rekordlar.** 2 ta 88 px plitka:
   - «Eng yaxshi IQ» (`--primary-ink`);
   - «Eng yaxshi hafta» (◆ bilan, `--ball-ink`) — barcha haftalar va joriy haftaning eng kattasi.
   - Maʼlumot boʻlmasa «—».
   - «Jami ball» bu yerdan Profilga koʻchadi.
5. **«Oxirgi haftalar» kartasi, 168 px.** 4 ta ustun: joriy hafta va undan oldingi 3 hafta.
   - Qiymat ustun ustida (12/700 tabular), hafta boshlanish sanasi ostida («21.09»).
   - Joriy hafta `--ball` rangida, oldingilari `--ball` 40% shaffoflikda. Farq faqat rangda emas: joriy ustun ostidagi sana qalin yoziladi.
   - Maʼlumot boʻlmasa ustunlar 0 balandlikda, yorligʻi «0». Karta balandligi oʻzgarmaydi.

### 3.4 PROFIL

**Maqsad:** men kimman va nimaga erishdim. **Asosiy amal:** «Profilni tahrirlash» (shaffof tugma).

1. **Sarlavha, 44 px.** Chapda h1 «Profil», oʻngda 44 px tishli gʻildirak (→ Sozlamalar, `aria-label="Sozlamalar"`).
2. **Identifikatsiya kartasi, 256 px** (`--surface`, radius 24):
   - Tepada 72 px tasma: profil rangining 18% shaffofligidagi alohida qatlam (gradientli rangda ham shunday). Toʻyingan blok hisoblanmaydi.
   - Chapda 88 px avatar. U tasmaga 44 px kirib turadi, atrofida 4 px `--surface` halqa, ustida 28 px qalam belgisi (→ Profilni tahrirlash).
   - Avatar oʻngida liga chipi: 28 px pill, 16 px qalqon va «Bronza liga» (→ Reyting tab).
   - Nom 22/800, sigʻmasa «…» bilan qisqaradi. Nom boʻlmasa «Mehmon».
   - Bio 15/500 xira, 2 qator, qatʼiy 42 px. Boʻsh boʻlsa «Bio qoʻshing» `--primary-ink` (→ tahrirlash).
   - Vitrina qatori, 40 px: 3 ta 40 px medalyon. Boʻsh joy — 40 px punktir doira. Bosilganda → Nishonlar.
   - Shaffof tugma «Profilni tahrirlash», 44 px.
3. **Statistika 2×2** (mavjud uslub, 88 px plitkalar):
   - «Eng yaxshi IQ»;
   - «Testlar»;
   - «Jami ball» (◆, `--ball-ink`);
   - «Eng uzun streak».
4. **Ikki qatorli karta**, har qator 64 px:
   - medal plitka · «Nishonlar» · oʻngda «7/29» · ›
   - sumka plitka · «Doʻkon» · oʻngda «● 120» · ›
5. **h2 «Testlar tarixi»** (mavjud, oxirgi 30 ta). Boʻsh boʻlsa «Hali test topshirilmagan».
6. **h2 «Savol turlari»** (mavjud daraja chiziqlari).

**Olib tashlanadi:** «Sozlamalar» boʻlimi va `goSettings` scroll hiylasi.

### 3.5 PROFILNI TAHRIRLASH (L1)

**Sarlavha:** ‹ · «Profilni tahrirlash» · oʻngda matnli tugma **«Saqlash»** (17/700, `--primary-ink`).
- Hech narsa oʻzgarmagan yoki biror maydon notoʻgʻri boʻlsa «Saqlash» xira va bosilmaydi.
- Saqlangandan keyin tugma 1 soniya ✓ koʻrsatadi va ekran yopiladi.
- «Saqlash» sarlavhada turadi, chunki yopishqoq pastki panel ekran klaviaturasi ostida qolib ketadi (Keyboard plagini yoʻq, ekran chekkadan chekkaga).

Ekran tarkibi (maydonlar ekranning yuqori yarmida; fokus olgan maydon koʻrinishga suriladi):
1. **Avatar koʻrinishi** 112 px, markazda, profil rangidagi halqa bilan. Ostida shaffof tugma «Rasmni oʻzgartirish» (40 px) → **Rasm varagʻi**.
2. **«Rang»** — 12 ta 44 px namuna, 6×2 setka.
   - Tanlangani: 3 px halqa va ✓ glifi.
   - Qulflangani: 14 px qulf glifi. Har namuna ostida 14 px qator ajratilgan, qulflangan namunada u yerda narx turadi («●150», 11/700).
   - Qulflangan namuna bosilsa → **Xarid varagʻi**. Xarid qilingach rang shu yerda darhol tanlanadi.
3. **«Foydalanuvchi nomi»** — 52 px input.
   - Kichik harfga oʻzi oʻtadi, boʻshliq qabul qilinmaydi.
   - Ostida 18 px yordam qatori: chapda xato (`--destructive-ink`), oʻngda «8/20».
4. **«Bio»** — qatʼiy 76 px, 2 qatorli matn maydoni. Yordam qatorida «0/80».

**Chiqish:** saqlanmagan oʻzgarish bilan chiqilsa `unsavedProfile` dialogi chiqadi.
Sarlavha «Oʻzgarishlar saqlanmadi», tugmalar [Chiqish] (xavfli uslub) va [Qolish].

**Rasm varagʻi (qatʼiy 420 px):**
- Sarlavha «Rasm».
- 4×4 setkada 16 ta 64 px tayyor avatar, har biri joriy profil rangi ustida.
- Pastki qator:
  - [Galereyadan] (image ikonkasi) — yashirin fayl inputini ochadi;
  - [Olib tashlash] — bosh harfga qaytaradi; avatar allaqachon bosh harf boʻlsa xira.
- 18 px xato qatori: «Bu rasmni ochib boʻlmadi» / «Rasm juda katta».

**Rasm koʻrinishi varagʻi (qatʼiy 440 px):**
- Markazda 160 px doira koʻrinishi.
- 36 px segment tugma:
  - portret rasm uchun: **Yuqori | Markaz | Past** (standart — Yuqori, yuz kesilmasin);
  - albom rasm uchun: **Chap | Markaz | Oʻng**;
  - kvadrat rasmda segment xira va joyi saqlanadi.
- [Tayyor] (asosiy) va «Boshqa rasm» (matnli tugma).
- 18 px xato qatori.
- [Tayyor] faqat qoralamaga yozadi. Diskka yozish faqat tahrirlash ekranidagi «Saqlash» bilan boʻladi. Joy yetmasa: «Rasm saqlanmadi».

### 3.6 SOZLAMALAR (L1) — §7.1 da toʻliq

Roʻyxat ekrani, asosiy tugma yoʻq. Pastda «IQuest 1.1.0» (13/600, xira, markazda).

### 3.7 NISHONLAR (L1)

**Sarlavha:** ‹ · «Nishonlar» · oʻngda «7/29» chipi.
1. **«Vitrina»**: 3 ta 72 px joy.
   - Toʻla joy bosilsa → Nishon varagʻi.
   - Boʻsh joy punktir doira, bosilmaydi, bu shunchaki maʼlumot.
2. **h2 «Yutuqlar»** — 21 ta nishon, 4 ustunli setka.
   - Katak 80×104: 60 px medalyon va 2 qatorli nom 12/700.
   - Olinmaganlari kulrang va qulf glifi bilan.
3. **h2 «Kolleksiya»** — 8 ta nishon, xuddi shu setka. Sizda yoʻqlari kulrang va narx chipi bilan.

**Nishon varagʻi (qatʼiy 400 px):**
- 104 px medalyon, nom 20/700.
- Shart matni 15/500 xira, 2 qator.
- 18 px progress qatori: «37/100» yoki «Olingan: 25.09.2026».
- Tugmalar holatga qarab:
  - olingan nishon: [Vitrinaga qoʻyish] yoki [Vitrinadan olish]. Vitrina toʻla boʻlsa xira [Vitrina toʻla];
  - olinmagan yutuq: faqat [Yopish];
  - sizda yoʻq kolleksiya nishoni: [Sotib olish · ●300] → Xarid varagʻi.

### 3.8 DOʻKON (L1)

**Sarlavha:** ‹ · «Doʻkon» · oʻngda tanga pilli (Boshdagi bilan bir xil komponent, bu yerda bosilmaydi).
1. **Segment tugma, 40 px:** «Ranglar | Nishonlar».
2. **Setka:** 3 ustun, 104×128 kartalar.
   - Koʻrinish: 56 px rangli doira ichida sizning bosh harfingiz, yoki medalyon.
   - Nom 13/700.
   - Holat chipi, 28 px: «●150» / «Sizda bor» / «✓ Tanlangan».
3. **Pastki qator, 56 px:** «Tanga qanday olinadi» › → varaq.

**Xarid varagʻi (qatʼiy 380 px):**
- 96 px koʻrinish: avataringiz shu rangda yoki medalyon. Nom 20/700.
- Ikki qator: «Narxi ● 150», «Balans ● 120».
- Tugma holatlari (varaq balandligi oʻzgarmaydi):
  - yetadi → [Sotib olish] (asosiy);
  - yetmaydi → xira [Yana 30 tanga kerak] va matnli tugma «Tanga qanday olinadi»;
  - sotib olingach → «Sizniki!» sarlavhasi va [Qoʻllash] (rang uchun) yoki [Vitrinaga qoʻyish] (nishon uchun), yonida [Yopish].
- Ovozlar: xarid — `purchase`, tanga yetmasa — `denied`.

**«Tanga qanday olinadi» varagʻi (qatʼiy 320 px):** 3 ta ikonkali qator.
- «Kunlik vazifalar — kuniga 30 gacha»
- «Nishonlar — bir martalik mukofot»
- «Hafta yakuni — ligaga qarab 100 gacha»

### 3.9 SAVOL, NATIJA, OʻYIN (oʻzgarishlar)

- **Savol:** joylashuv oʻzgarmaydi. Testda faqat `select` ovozi chiqadi (§9.5). Bayram kartalari savol va oʻyin paytida **hech qachon** chiqmaydi.
- **Natija:** oraliq qatori ostida qatʼiy **28 px mukofot qatori** qoʻshiladi.
  - Undagi chiplar: «◆ +120 ball» va, agar shu oqimda vazifa bajarilgan boʻlsa, «● +10 tanga».
  - Tanga boʻlmasa uning joyi koʻrinmas holda saqlanadi.
  - Testda tanga chipi hech qachon chiqmaydi, chunki test javoblari vazifaga kirmaydi.
- **Oʻyin yakuni:**
  - ball qatoridagi oltin olmos binafsha ◆ ga almashadi;
  - tanga chipi uchun joy xuddi shunday ajratiladi;
  - daraja oshsa `levelUp` ovozi chiqadi.
- **Matn tekshiruvi:** IQ natijasi hech qayerda «ball» deb atalmaydi.
  - Landingʼdagi «IQ balli va savol turlari boʻyicha tahlil» → «IQ natijasi va savol turlari boʻyicha tahlil».
  - Natija, tarix va bildirishnoma matnlari tekshiriladi.

### 3.10 Varaq va dialoglar (qatʼiy balandliklar)

| Tur | Balandlik | Tarkibi |
|---|---|---|
| `lang` Til | 320 | 4 ta 56 px radio qator, har til oʻz yozuvida |
| `theme` Tema | 260 | Qurilma / Yorugʻ / Tungi |
| `time` Vaqt | 300 | 4×2 chip: 07:00 09:00 12:00 15:00 18:00 19:00 20:00 21:00 |
| `avatar` Rasm | 420 | §3.5 |
| `photo` Rasm koʻrinishi | 440 | §3.5 |
| `buy` Xarid | 380 | §3.8 |
| `badge` Nishon | 400 | §3.7 |
| `coinHelp` Tanga qanday olinadi | 320 | §3.8 |
| `testIntro` Test qanday oʻtadi | 340 | §3.12 |
| dialog `unsavedProfile` | mavjud | [Chiqish] / [Qolish] |

### 3.11 Bayram va toast qoidalari

- **Bayram kartasi** (300×340, markazda, parda ustida) faqat uchta holatda chiqadi:
  - **yangi nishon**: medalyon 104 px (0,6 → 1,08 → 1, 400 ms), «Yangi nishon», nom, «● +20»;
  - **liga koʻtarilishi**: qalqon, «Kumush liga!», «Bu hafta 500 ball»;
  - **hafta yakuni**: qalqon, «Oʻtgan hafta: Kumush», «● +25 tanga».
  - Har kartada bitta tugma [Davom etish].
- **Navbat:** kartalar bittadan koʻrsatiladi. Ular faqat tab ekranlarida, Natija koʻringandan keyin yoki Oʻyin yakunida chiqadi. Savol va oʻyin paytida chiqmaydi (testda toʻgʻri-notoʻgʻri sezdirilmaydi).
- **Birdaniga 3 tadan ortiq** karta boʻlsa (masalan 1.0 dan yangilangan foydalanuvchi), bitta yigʻma karta chiqadi: «6 ta yangi nishon · ● +140 tanga», [Koʻrish] → Nishonlar va matnli tugma «Yopish».
- **Kichik tanga** (vazifa +10) uchun karta chiqmaydi. U Natija va Oʻyin yakunidagi mukofot qatorida koʻrinadi va `coin` ovozi chalinadi. Mukofot qatori boʻlmagan joyda (masalan xush kelibsiz bonusi) — **toast** «● +50 tanga».
- Liga koʻtarilishi har hafta har bir liga uchun bir marta koʻrsatiladi (`nzLeague.announce`).

### 3.12 «Test qanday oʻtadi» varagʻi (bir marta, kerakli joyda)

Birinchi «Boshlash» bosilganda chiqadi.
- Sarlavha «Test qanday oʻtadi».
- 3 ta ikonkali qator:
  1. «Variantni tanlang va «Keyingi»ni bosing»
  2. «Oldingi savolga qaytib boʻlmaydi»
  3. «Toʻxtatsangiz — keyin davom etasiz»
- Tugma [Boshlash]. Bosilganda `settings.tips.testIntro = true` yoziladi va test boshlanadi.
- Varaq yopilsa (orqaga tugmasi yoki parda) test boshlanmaydi, bayroq ham yozilmaydi.

---

## 4. Birinchi kirish (onboarding)

### 4.1 Kim nimani koʻradi

| Holat | Qanday aniqlanadi | Oqim |
|---|---|---|
| Yangi oʻrnatish | `nz-settings` yoʻq va (`nz-progress.totalAnswered === 0` va `nz-iq-tests` boʻsh) | 0 → 1 → 2 → 3 → 4 → 5 → Bosh |
| 1.0 dan yangilash | `nz-settings` yoʻq va (`totalAnswered > 0` yoki testlar bor) | 3 → 4 → Bosh. 3-qadam sarlavhasi «Yangi: tanga va doʻkon» |
| Qayta koʻrish | Sozlamalar → «Qanday ishlaydi» | 1 → 2 → 3, oxirida [Tayyor] → Sozlamalar |

`nz-settings.onboard.done = true` oqim oxirida yoziladi, oqim avtomatik boshqa chiqmaydi.
Ilova oqim oʻrtasida oʻldirilsa, keyingi ochilishda oqim boshidan boshlanadi (qisqa oqim, holatni saqlash shart emas).

### 4.2 Qolip (har qadamda bir xil, hech narsa siljimaydi)

- **Tepa, 44 px:**
  - chapda 5 ta 6 px nuqta (1–5-qadamlar; 0-qadamda nuqtalar joyi boʻsh qoladi);
  - oʻngda matnli tugma «Oʻtkazib yuborish» (faqat 1–3-qadamlarda; boshqa qadamlarda joy saqlanadi).
- **Rasm qutisi, 280 px:** qatʼiy nisbatda, oʻz SVG va komponentlarimiz bilan chiziladi, rastr rasm yoʻq.
- **Sarlavha** 28/800, 1–3 soʻz.
- **Pastki qator** 16/500 xira, koʻpi bilan 2 qator, 44 px ajratilgan.
- **Pastda yopishqoq 76 px panel:** asosiy tugma va kerak boʻlsa matnli ikkinchi tugma. Uning joyi har doim ajratilgan.

### 4.3 Qadamlar (yakuniy oʻzbekcha matn)

| # | Sarlavha | Pastki qator | Tarkibi | Tugmalar |
|---|---|---|---|---|
| 0 | Tilni tanlang | — | 4 ta 64 px radio qator: «Oʻzbekcha», «Ўзбекча», «Русский», «English» (English faqat darvoza ochiq boʻlsa). Oldindan tanlangani `navigator.language` dan: `ru*` → Русский, `en*` → English (yoqilgan boʻlsa), `uz-Cyrl*` → Ўзбекча, qolgani → Oʻzbekcha. Qator bosilishi bilan ilova tili darhol almashadi | [Davom etish] |
| 1 | IQ test | 30 ta savol. Natija — IQ va oraliq. | Haqiqiy generator matritsasi (qatʼiy urugʻ `20260925`, daraja 4) | [Keyingi] |
| 2 | Mashq va oʻyinlar | Har kuni savollar va aql oʻyinlari. Daraja sizga moslashadi. | 3 plitka: Matritsa · Xotira · Tezlik glifi | [Keyingi] |
| 3 | Ball va tanga | Ball — ligada koʻtarilish uchun. Tanga — profilni bezash uchun. | Yonma-yon ikki katta chip: binafsha «◆ Ball» va oltin «● Tanga» | [Keyingi] |
| 4 | Profilingiz | Rasm, rang va nom tanlang. | 6 ta 64 px tayyor avatar va [Galereya] plitkasi, 6 ta bepul rang (44 px), «Foydalanuvchi nomi» inputi (boʻsh, 18 px xato qatori bilan). Bio bu yerda soʻralmaydi | [Saqlash] · «Keyinroq» |
| 5 | Eslatma | Har kuni mashq vaqtini eslatamiz. | Chiplar 09:00 · 12:00 · 19:00 · 21:00 (19:00 tanlangan). Bu qadam faqat LocalNotifications plagini bor joyda chiqadi | [Yoqish] · «Kerak emas» |

**Oqim oxiri:**
- Bosh sahifa ochiladi, IQ kartasi YANGI holatda va u yagona asosiy amal.
- Xush kelibsiz bonusi `credit(50, 'welcome', 'welcome')` beriladi. Toast «● +50 tanga» chiqadi, `coin` ovozi chalinadi, tanga pilli sanab oshadi.
- Qoʻshimcha ekran yoʻq.

**3-qadam eng muhim aniqlik ekrani:** ikki valyuta faqat shu yerda, yonma-yon, bir marta tushuntiriladi.

**5-qadam tafsilotlari:**
- [Yoqish] Android 13+ da `POST_NOTIFICATIONS` ruxsatini soʻraydi. Ruxsat berilsa `remind.on = true` va `streakRemind = true`.
- Ruxsat berilmasa toast «Bildirishnomaga ruxsat berilmagan — tizim sozlamalaridan yoqing» chiqadi, oqim davom etadi, eslatma oʻchiq qoladi.
- «Kerak emas» → ikkalasi ham oʻchiq qoladi.

**4-qadam tafsilotlari:**
- [Saqlash] `nzProfile.save()` ni chaqiradi. Nom notoʻgʻri boʻlsa xato qatorda chiqadi va oʻtilmaydi. Boʻsh nom — ruxsat.
- «Keyinroq» bosh harf avatari, Binafsha rang va boʻsh nom bilan davom etadi.

### 4.4 Oʻtkazib yuborish va orqaga

- 0-qadamni oʻtkazib boʻlmaydi, lekin unda doim toʻgʻri standart tanlov turadi (bitta bosish yetadi).
- «Oʻtkazib yuborish» (1–3-qadamlar) → 4-qadam. Profil bir ekranga arziydi va «Keyinroq» doim bir bosishda turadi.
- Android «orqaga» → oldingi qadam. 0-qadamda «Chiqish uchun yana bir marta bosing».
- Eng yomon holatda Boshgacha 4 ta bosish yetadi.

### 4.5 Yangilangan foydalanuvchilar (1.0 → 1.1)

1. Til, tema va eslatma sozlamalari saqlanadi (`nz-progress` dan koʻchiriladi, §10.3).
2. Yangilash oqimi: 3-qadam («Yangi: tanga va doʻkon») → 4-qadam → Bosh va +50 tanga.
3. Nishonlar mavjud statistikadan orqaga qarab hisoblanadi (§6.6). Ularning tangasi har biri oʻz kaliti bilan beriladi, shuning uchun ikki marta berilmaydi.
4. Oldingi yopilgan haftalar (koʻpi bilan 2 ta, §6.5) hisob-kitob qilinadi.
5. Hammasi **bitta yigʻma kartada** koʻrsatiladi: «{n} ta yangi nishon · ● +{t} tanga».

### 4.6 Halollik

- Birinchi kirishda rad qilish matni ham, «aqlingizni oshiring» ham, «rasmiy» ham yoʻq.
- Har ekran ilova nima qilishini ≤2 qisqa qatorda aytadi.
- Huquqiy matn faqat Foydalanish shartlarida (egasining qarori).

---

## 5. Profil

### 5.1 Maydonlar va tekshiruv (`src/profile.js`, kalit `nz-profile`)

**Foydalanuvchi nomi (ixtiyoriy):**
- Regex `^[a-z][a-z0-9._]{2,19}$` (3–20 belgi).
- Ichida `..`, `__`, `._`, `_.` boʻlmaydi. Nuqta yoki `_` bilan tugamaydi.
- Kiritishda kichik harfga oʻtadi, boʻshliq tashlanadi. Oʻzbek tutuq belgisi va kirill harf qabul qilinmaydi.
- **Band soʻzlar:** `iquest*`, admin, administrator, moderator, moder, support, yordam, help, official, rasmiy, mensa, system, tizim, root, null, undefined, bot, telegram, google, play.
- **Nomaqbul soʻzlar:** `profile.js` ichidagi ~150 ta uz/ru/en ildiz.
  - Tekshirishdan oldin matn normallashtiriladi: kichik harf, kirill → lotin, «leetspeak» belgilari qaytariladi (`0→o 1→i 3→e 4→a 5→s @→a`).
  - Tekshiruv ildiz boʻyicha.
- Oflayn holatda nomning noyobligini tekshirib boʻlmaydi. UI hech qachon «bu nom sizniki» demaydi. Backend kelganda nom bir martalik «band qilish» qadamidan oʻtadi (§11).

**Bio (ixtiyoriy):**
- 0–80 belgi (kod nuqtalari boʻyicha sanaladi).
- Yangi qator boʻshliqqa aylanadi, boʻshliqlar siqiladi, chetlari kesiladi.
- Havola rad etiladi: `/https?:|www\.|t\.me\/|@\w{4,}|\.(uz|com|ru|org|net|me|io)\b/i`.
- Nomaqbul soʻz tekshiruvi (yuqoridagi bilan bir xil).

**Xato matnlari** (18 px qatorda, 13/600, `--destructive-ink`):

| Kod | Matn |
|---|---|
| `len` | «3–20 ta belgi» |
| `start` | «Harf bilan boshlansin» |
| `chars` | «Faqat a–z, 0–9, nuqta va _» |
| `format` | «Nuqta va _ ketma-ket boʻlmasin» |
| `reserved` | «Bu nomni tanlab boʻlmaydi» |
| `bad` | «Nomaqbul soʻz» |
| bio `len` | «Koʻpi bilan 80 ta belgi» |
| bio `link` | «Havola qoʻshib boʻlmaydi» |

**Koʻrsatish qoidasi:**
- Foydalanuvchi matni (nom, bio) hamma joyda `…Raw` kalit bilan bogʻlanadi (`usernameRaw`, `bioRaw`, `editUsernameRaw`). Shunday qilinmasa `nzI18n.deep` uni kirillga oʻgiradi yoki lugʻat boʻyicha tarjima qiladi va oʻzgargan matn diskka qaytib yoziladi.
- Foydalanuvchi matni **satrlar massivi** ichida uzatilmaydi, chunki `deep()` massiv elementlariga kalit bermaydi. Har doim `…Raw` kalitli obyekt ishlatiladi.

### 5.2 Avatar

Avatar turlari:
- `{kind:'initial'}` — nomning bosh harfi (nom boʻlmasa «M»), profil rangi ustida. Harf avatar oʻlchamining 40% i, qalinligi 800, rangi rangning «on» qiymati.
- `{kind:'preset', id}` — 16 ta tayyor avatardan biri.
- `{kind:'photo'}` — rasm alohida `nz-avatar-img` kalitida saqlanadi.

**16 ta tayyor avatar** (hammasi bepul; `src/avatars.js` → `window.IQ_AVATARS`):
- 12 ta hayvon: boyoʻgʻli, tulki, mushuk, ayiq, sher, burgut, panda, quyon, pingvin, toshbaqa, delfin, bugʻu.
- 4 ta geometrik: kub, orbita, uchqun, spiral.
- **Uslub:**
  - viewBox 96×96, fon shaffof (orqasida profil rangidagi doira turadi);
  - faqat ikki rang: oq `#FFFFFF` shakl + 2 px `#1C1B29` kontur va `#1C1B29` detallar. Kontur har qanday profil rangida siluetni ajratib turadi;
  - ≤6 ta shakl, har biri ≤1,6 KB, matn yoʻq, inson yuzi yoʻq.
- Ular `<img src=data:svg>` orqali koʻrsatiladi (generatorlar kabi xavfsiz yoʻl).

**Rasm quvuri** (`nzProfile.preparePhoto(file, align)`):
1. Fayl `<input type="file" accept="image/jpeg,image/png,image/webp">` orqali tanlanadi. **`capture` atributi yoʻq.** Capacitor tizim tanlagichini ochadi, shuning uchun `CAMERA` va `READ_MEDIA_IMAGES` ruxsati kerak emas (Play foto ruxsatlari siyosati).
   Input markupda **doim bor**, yashirin, shartli bloklardan tashqarida turadi. Uni tugma `input.click()` bilan ochadi.
2. 15 MB dan katta fayl dekodlashdan **oldin** rad etiladi → «Rasm juda katta».
3. Dekodlash: `createImageBitmap(file, {imageOrientation:'from-image'})`. EXIF burilishi hisobga olinadi.
   Zaxira yoʻli: `FileReader.readAsDataURL` → `Image`. Blob URL ishlatilmaydi (CSP `img-src`).
   Dekodlab boʻlmasa (masalan HEIC) → «Bu rasmni ochib boʻlmadi».
4. Kvadrat kesish `align` boʻyicha:
   - portret rasmda `top` | `center` | `bottom` (standart `top`);
   - albom rasmda `left` | `center` | `right`.
5. 256×256 canvasʼga chiziladi (smoothing `high`), keyin `toDataURL('image/jpeg', 0.82)`.
   Natija 64 000 belgidan uzun boʻlsa 0,70 → 0,60 → 192 px bilan qayta urinadi. Odatiy hajm 18–35 KB.
6. `preparePhoto` diskka **yozmaydi**, faqat `dataUrl` qaytaradi. `File` obyekti Mainʼda (`this.pendingFile`, stateʼda emas) saqlanadi va joylashuv almashtirilganda qayta kesiladi.
7. Yozish faqat «Saqlash» bosilganda boʻladi: `nzProfile.commitPhoto(dataUrl)`. `QuotaExceeded` → «Rasm saqlanmadi», holat yarim yozilmaydi.
8. Rasm v1.x da qurilmadan **chiqmaydi**. Maxfiylik siyosati buni aytadi, Data safety oʻzgarmaydi.

**Koʻrsatish oʻlchamlari:** 32 (roʻyxat), 40 (Bosh), 64 (varaq), 88 (Profil), 112 (tahrirlash), 160 (rasm koʻrinishi).
Rasm har doim `aspect-ratio: 1/1` qutisida va `object-fit: cover` bilan koʻrsatiladi, shuning uchun hech narsa sakramaydi.

### 5.3 Profil rangi

- 12 ta rang (§6.7). Ularning hex qiymatlari **faqat** `src/catalog.js` da turadi.
  Bu maʼlumot, token emas: token qatlamidagi «hex faqat `:root` da» qoidasi shunga moslab toʻldiriladi.
- Rang **faqat identifikatsiya yuzalarida** ishlatiladi:
  - avatar foni;
  - Bosh sahifadagi avatar halqasi (2 px);
  - Profil tasmasi (18%);
  - v2 da oʻz chat pufagingiz.
- U hech qachon ilova xromiga, tugmaga yoki diagrammaga tushmaydi. Ilova bitta brend boʻlib qoladi, kontrast bir marta isbotlanadi.
- Boshlanishda 6 ta bepul rangdan biri tanlanadi, ular orasida istalgancha bepul almashtirish mumkin. Qolgan 6 tasi Doʻkonda.

### 5.4 Vitrina

- Profilda koʻpi bilan 3 ta nishon koʻrsatiladi (olingan yutuq yoki sotib olingan kolleksiya nishoni).
- `showcase: null` — avtomatik rejim: eng oxirgi 3 ta nishon.
- Foydalanuvchi birinchi marta «Vitrinaga qoʻyish» yoki «Vitrinadan olish»ni bosganda avtomatik roʻyxat aniq roʻyxatga aylanadi va keyin oʻshandan foydalaniladi.

---

## 6. Iqtisod: ball va tanga

### 6.1 Qoida

Koordinator tavsiyasi **qatʼiy** qabul qilinadi:
- **Ball** (◆, binafsha) — XPʼga oʻxshash, liga uchun, sarflanmaydi.
- **Tanga** (●, oltin) — faqat Doʻkon uchun.

Qoʻshimcha shartlar:
- Ular bir-biriga aylantirilmaydi. Xarid ball, liga, IQ yoki darajaga taʼsir qilmaydi.
- IAP (pulga sotish) yoʻq, tasodifiy mukofot (quti, lotereya) yoʻq. Narxlar qatʼiy va doim koʻrinadi.
- Yutuq nishonini sotib olib boʻlmaydi.

### 6.2 Ball (oʻzgarmaydi)

- **Manbalar:**
  - +10 har bir toʻgʻri javob uchun, bir savolga bir marta (`progress.js` dagi `scored`);
  - oʻyin natijasi 30–150 (`result().points`).
- **Test ballari** test tugaganda bir yoʻla qoʻshiladi (mavjud qoida, javob paytida sezdirmaslik uchun).
- **Haftalik ball** (dushanba–yakshanba) ligani belgilaydi. `LEAGUES` Mainʼda qoladi (`tools/source.mjs` uni oʻqiydi):

| Liga | Boshlovchi | Bronza | Kumush | Oltin | Platina | Olmos |
|---|---|---|---|---|---|---|
| Chegara | 0 | 150 | 500 | 1 200 | 2 500 | 5 000 |

- **Umrbod yigʻindi** — Profildagi «Jami ball».

### 6.3 Tanga qayerdan keladi (4 manba, hammasi chegaralangan va kalit boʻyicha takrorlanmaydi)

| Manba | Miqdor | Chegara | Kalit |
|---|---|---|---|
| Kunlik vazifalar (Q1–Q3) | har biri +10 | kuniga ≤30 | `q:<kun>:<q1\|q2\|q3>` |
| Yutuq nishoni | 10–150 (§6.6) | bir marta | `b:<id>` |
| Hafta yakuni | 0 / 10 / 25 / 40 / 60 / 100 | haftasiga bir marta | `w:<dushanba>` |
| Xush kelibsiz | 50 | bir marta | `welcome` |

**Hech qachon berilmaydi:**
- har bir javob uchun tanga;
- ilovani ochgani uchun tanga;
- IQ test topshirgani yoki qayta topshirgani uchun tanga (faqat bir martalik «Birinchi test» nishoni bor);
- tasodifiy sandiq;
- pul evaziga tanga.

### 6.4 Kunlik vazifalar (aniq qoidalar)

- **Qachon tuziladi:** kun birinchi marta soʻralganda (`nzWallet.quests(day, ctx)`), kun `dayKey` boʻyicha, 04:00 da almashadi. Oʻsha kun davomida roʻyxat **qayta hisoblanmaydi**.
- **Test javoblari hech bir vazifaga kirmaydi.** Test mashq emas va uni qayta topshirishga undov boʻlmasligi kerak.

| Id | Vazifa | Nima hisoblanadi | Maqsad | Mukofot |
|---|---|---|---|---|
| q1 | Bugungi mashq | Mashq **va** takrorlash rejimidagi har bir javob | 10 | +10 |
| q2 | Aql oʻyini | Istalgan tugallangan oʻyin (demoʼdan boshqa) | 1 | +10 |
| q3 (a) | Xatolarni tuzating | Takrorlashdagi toʻgʻri javob. **Faqat** kun boshida Xatolarimda ≥3 savol boʻlsa beriladi | 3 | +10 |
| q3 (b) | «{Tur} mashqi» | Mashq yoki takrorlashda shu turdagi har bir javob. Tur — `levelFor` boʻyicha eng past daraja (teng boʻlsa `IQ.types()` tartibida). Xatolarim 3 tadan kam boʻlsa q3 shu koʻrinishda beriladi | 5 | +10 |

- Har ikki koʻrinish ham doim bajarsa boʻladigan vazifa. Qulflangan vazifa yoʻq.
- Vazifa bajarilishi bilan `nzWallet.track()` tangani **oʻzi** beradi (kalit `q:<kun>:<id>`) va natijani qaytaradi. Main uni faqat koʻrsatadi.

### 6.5 Hafta yakuni mukofoti

- **Qachon:** ilova ochilganda va 04:00 dan keyingi har bir yangi hafta boshida Main tekshiradi.
- **Qaysi haftalar:** yopilgan va hali hisob-kitob qilinmagan haftalar. Faqat `nz-iq-ui.days` oynasi (21 kun) ichidagilar, yaʼni koʻpi bilan 2 ta.
- **Qadamlar:**
  1. Main hafta ballini `ui.days` dan hisoblaydi.
  2. `nzLeague.close(dushanba, ball)` yangi yopilish boʻlsa `true` qaytaradi.
  3. Main ligani `LEAGUES` boʻyicha topadi.
  4. `nzWallet.credit(mukofot, 'week', 'w:'+dushanba)` chaqiriladi.
  5. Mukofot > 0 boʻlsa «hafta yakuni» bayram kartasi chiqadi.
- **Mukofot jadvali:** Boshlovchi 0 · Bronza 10 · Kumush 25 · Oltin 40 · Platina 60 · Olmos 100.
- Ball yoʻq haftaga 0 yoziladi, karta chiqmaydi.

### 6.6 Yutuq nishonlari (21 ta; faqat oʻynab olinadi; hech qachon qaytarib olinmaydi)

IQ chegarasiga bogʻliq nishon **yoʻq**: u natija daʼvosi boʻlardi va testni qayta-qayta topshirishga undardi. Nomlarda «Daho», «Top X%», real odamlar va «rasmiy» yoʻq.

| id | Nomi | Sharti | Tanga | Daraja |
|---|---|---|---|---|
| first-test | Birinchi test | IQ testni oxirigacha (30/30) yeching | 20 | oltin |
| answers-100 | Mashqchi I | 100 ta javob | 10 | bronza |
| answers-500 | Mashqchi II | 500 ta javob | 30 | kumush |
| answers-2000 | Mashqchi III | 2 000 ta javob | 80 | oltin |
| perfect-10 | Xatosiz | Bitta mashqda 10/10 (takrorlash hisoblanmaydi) | 20 | oltin |
| fixer-20 | Tuzatuvchi | Xatolarimdan jami 20 ta savolni tuzating | 20 | kumush |
| matrix-7 | Matritsa ustasi | Matritsalarda 7-daraja | 30 | kumush |
| series-7 | Son ustasi | Son qatorlarida 7-daraja | 30 | kumush |
| spatial-7 | Fazo ustasi | Fazoviy tafakkurda 7-daraja | 30 | kumush |
| verbal-7 | Soʻz ustasi | Ogʻzaki mantiqda 7-daraja | 30 | kumush |
| games-all | Kashfiyotchi | 6 ta oʻyinning har birini bir marta oʻynang | 20 | bronza |
| game-lv5 | Yuqori daraja | Istalgan oʻyinda 5-daraja | 20 | kumush |
| game-lv10 | Choʻqqi | Istalgan oʻyinda 10-daraja | 60 | oltin |
| streak-3 | Olov I | 3 kunlik streak | 15 | bronza |
| streak-7 | Olov II | 7 kunlik streak | 40 | kumush |
| streak-30 | Olov III | 30 kunlik streak | 150 | oltin |
| league-silver | Kumush | Bir haftada 500 ball | 25 | liga rangi |
| league-gold | Oltin | Bir haftada 1 200 ball | 50 | liga rangi |
| league-platinum | Platina | Bir haftada 2 500 ball | 80 | liga rangi |
| league-diamond | Olmos | Bir haftada 5 000 ball | 100 | liga rangi |
| profile | Tanishuv | Nom, avatar (bosh harf emas) va bio toʻldirilgan | 10 | bronza |

Jami: **870 tanga**. Yangilangan foydalanuvchida nishonlar orqaga qarab hisoblanadi va hech qanday cheklov qoʻyilmaydi, chunki har biri bir martalik.

**Qachon tekshiriladi:** `finishRun`, `finishGame`, har bir javobdan keyin, profil saqlanganda, hafta yopilganda va ilova ochilganda.

**`stats` obyekti** (Main yigʻadi):
- `answered` — `nzProgress.stats().answered`;
- `testsDone` — toʻliq testlar soni;
- `longestStreak`;
- `bestWeekBall` — `max(nzLeague.best, joriy hafta)`;
- `levels{matrix, series, spatial, verbal}`;
- `games{id:{plays, level}}`;
- `fixes` — `nzBadges.counters().fixes`;
- `lastRun{kind, n, correct}`;
- `profileComplete`.

### 6.7 Doʻkon katalogi (`src/catalog.js`)

**Profil ranglari — 12 ta.**
«on» — rang ustidagi bosh harf rangi. Kontrast ≥3:1 (katta qalin matn), test bilan isbotlanadi. Qiymatlar hisoblab chiqilgan.

| id | Nomi | Rang | on | Kontrast | Narx |
|---|---|---|---|---|---|
| purple | Binafsha | #8552F0 | #FFFFFF | 4.71 | bepul |
| blue | Koʻk | #3D5EFF | #FFFFFF | 4.95 | bepul |
| teal | Firuza | #22B8B0 | #0B3230 | 5.65 | bepul |
| green | Yashil | #4CC38A | #0B2C1E | 6.80 | bepul |
| pink | Pushti | #FF6FA5 | #4A1029 | 5.77 | bepul |
| gold | Sariq | #FFA726 | #2A1B00 | 8.61 | bepul |
| red | Qizil | #E5484D | #FFFFFF | 3.91 | 150 |
| sky | Osmon | #38BDF8 | #082F49 | 6.48 | 150 |
| graphite | Grafit | #3A3850 | #FFFFFF | 11.28 | 150 |
| cherry | Olcha | #B4235A | #FFFFFF | 6.31 | 150 |
| dawn | Shafaq | #FF6FA5 → #FFA726 (135°) | #2A1B00 | 6.43 / 8.61 | 300 |
| night | Tun | #3D5EFF → #8552F0 (135°) | #FFFFFF | 4.95 / 4.71 | 300 |

Ranglar yigʻindisi: **1 200**. Standart rang — `purple`.

**Kolleksiya nishonlari — 8 ta.** Ular aniq «sotib olingan» nishon, yutuq bilan adashtirilmaydi. Shakli yumaloq medalyon, tanga rangidagi halqa bilan. Yutuqlar esa olti burchakli.

| id | Nomi | Narx |
|---|---|---|
| compass | Kompas | 300 |
| rocket | Raketa | 300 |
| knight | Shaxmat oti | 400 |
| maze | Labirint | 400 |
| crystal | Kristall | 500 |
| planet | Sayyora | 500 |
| tangram | Tangram | 700 |
| infinity | Cheksizlik | 800 |

Kolleksiya yigʻindisi: **3 900**. Doʻkonning umumiy hajmi: **5 100 tanga**.

**Bitta jadval:** barcha iqtisod raqamlari `nzCatalog` da:
```js
rewards: { welcome: 50, quest: 10, weekly: [0, 10, 25, 40, 60, 100] },
quests:  { practice: 10, game: 1, fix: 3, type: 5 }
```
Nomlar oʻzbekcha manba satrlar boʻlib, lugʻat orqali tarjima qilinadi (§8).

### 6.8 Hisob-kitob

| Profil | Hafta faoliyati | Tanga/hafta |
|---|---|---|
| Faol | 7 kun × 3 vazifa (210) + Kumush (25) | ≈ 235 |
| Oddiy | 5 kun × 2 vazifa (100) + Bronza (10) | ≈ 110 |
| Kam | 3 kun × 1 vazifa (30) + 0–10 | ≈ 30–40 |

- Birinchi oyda bunga nishonlar qoʻshiladi (+200–400).
- Butun Doʻkon (5 100) faol foydalanuvchida ≈ 5 oyda, oddiy foydalanuvchida ≈ 10 oyda tugaydi.
- Keyingi javonlar (avatar ramkalari, premium avatar toʻplamlari) sinklar tugashidan **oldin** rejalanadi, moʻljal v1.4.
- **Simulyatsiya testi** (`tests/economy-sim.test.mjs`) 30 kunlik hodisa oqimini yuritadi. 15–30-kunlardagi barqaror hafta daromadi quyidagi oraliqdan chiqsa CI yiqiladi: faol **200–320**, oddiy **80–160**, kam **20–80**.

### 6.9 Inflyatsiyaga qarshi va himoya

- Faqat qatʼiy sonli va chegaralangan manbalar bor, cheksiz manba yoʻq. Oʻyinni qayta-qayta oʻynash ball beradi, lekin q2 dan ortiq tanga bermaydi.
- Har bir kirim `credit(n, src, key)` orqali oʻtadi va kalit boʻyicha takrorlanmaydi. Ilova migratsiya oʻrtasida yiqilsa ham ikki marta berilmaydi.
- **Soat himoyasi:** `nz-wallet.maxSeen` — koʻrilgan eng katta vaqt. `now < maxSeen − 6 soat` boʻlsa (soat orqaga surilgan), vazifa progressi va vazifa hamda hafta mukofotlari soat `maxSeen` dan oʻtguncha toʻxtaydi.
- **Jurnal:** oxirgi 100 ta yozuv.
- **`credited` kalitlarini tozalash:** `q:` — 21 kundan eski, `w:` — 16 haftadan eski. `b:` va `welcome` abadiy saqlanadi.
- Qaytarish (refund) yoʻq, xarid doimiy. Balans hech qachon manfiy boʻlmaydi.
- «Maʼlumotlarni oʻchirish» hamyonni nolga qaytaradi.

### 6.10 Backend migratsiyasi (v2)

- Hamyon serverga oʻtadi va server hal qiluvchi boʻladi.
- Mahalliy balans bir marta import qilinadi, lekin `min(balans, 1 500)` bilan cheklanadi, chunki oflayn qiymatni oʻzgartirish mumkin.
- Sotib olingan narsalar oʻzgarishsiz import qilinadi.
- Mahalliy `nz-wallet`, `nz-badges` va `nz-profile` shakllari server jadvallariga mos keladi (§11).

---

## 7. Sozlamalar va bildirishnomalar

### 7.1 SOZLAMALAR ekrani (L1, Profildagi tishli gʻildirakdan)

**Tuzilishi:**
- Guruhlangan kartalar (radius 20).
- Boʻlim sarlavhasi 13/700 xira, jumla registrida, 28 px.
- Qator 56 px: 36 px ikonka plitkasi · nom 16/600 · qiymat 15/600 xira va › yoki 51×31 almashtirgich yoki ↗.
- Pastki qatorli qatorlar qatʼiy 64 px.
- Almashtirgich `role="switch"` va `aria-checked` bilan. Butun qator bosiladi. Yoqilgan holatda tugmachada ✓ glifi chiqadi (holat faqat rang bilan bildirilmaydi).

| Boʻlim | Ikonka | Qator | Qiymat / boshqaruv | Qoida |
|---|---|---|---|---|
| **Umumiy** | globe | Til | «Oʻzbekcha» › → `lang` varagʻi | Hozirgi «bosib aylantirish» oʻrniga |
| | moon | Tema | «Qurilma» › → `theme` varagʻi | `nz-theme` (mavjud) |
| **Ovoz** | volume | Ovoz effektlari | almashtirgich, standart yoniq | |
| | vibrate | Tebranish | almashtirgich, standart yoniq | `navigator.vibrate` boʻlmasa qator yashiriladi |
| **Bildirishnomalar** (plagin boʻlmasa, masalan veb buildʼda, **butun boʻlim yashiriladi**) | bell | Kunlik eslatma | almashtirgich. Pastki qator 18 px: «Har kuni 19:00» yoki «Tizim sozlamalarida ruxsat bering» | Qator 64 px |
| | clock | Vaqt | «19:00» › → `time` varagʻi | Eslatma oʻchiq boʻlsa qator 40% xira va bosilmaydi, balandligi oʻzgarmaydi |
| | flame | Streak eslatmasi | almashtirgich. Pastki qator: «Faol boʻlmagan kuni 21:30» | Qator 64 px |
| **Yordam** | help-circle | Qanday ishlaydi | › → birinchi kirish (qayta koʻrish) | |
| | mail | Aloqa | ↗ | `contactEmail` hali PLACEHOLDER boʻlsa **yashiriladi** |
| | star | Ilovani baholash | ↗ | `playUrl` boʻsh boʻlsa **yashiriladi** |
| **Huquqiy** | doc | Foydalanish shartlari | ↗ | Havola tilga mos: uz va uz-cyrl → `/shartlar/`, ru → `/ru/shartlar/`, en → `/en/shartlar/` |
| | shield-check | Maxfiylik siyosati | ↗ | Xuddi shunday |
| **Maʼlumotlar** | trash | Maʼlumotlarni oʻchirish | `--destructive-ink` → dialog | §10.6 |

- **Pastki yozuv:** «IQuest 1.1.0». Qiymat buildʼdan keladi: `nzSite.version` ← `version.json`.
- **Dialog matni:** sarlavha «Maʼlumotlarni oʻchirish?», matn «Natijalar, ballar, tangalar, nishonlar va profil oʻchiriladi.», tugmalar [Oʻchirish] / [Bekor qilish].
- `nzSite` ga build quyidagilarni qoʻshadi: `contactReady` (`!/PLACEHOLDER/.test(contactEmail)`), `playUrl`, `version`.

### 7.2 Tizim bildirishnomalari (`src/notify.js`)

**Faqat mahalliy.** `isExactNotification: false`. `SCHEDULE_EXACT_ALARM` manifestdan olib tashlanganicha qoladi.

| Tur | ID | Qachon | Matn (uz manba) |
|---|---|---|---|
| Kunlik eslatma | 1901–1907 | Keyingi 7 kunning har birida tanlangan vaqtda bir martalik. Bugun allaqachon faol boʻlgan boʻlsa yoki vaqt oʻtgan boʻlsa bugungisi qoʻyilmaydi | «Bugungi vazifalar tayyor: 10 ta savol va bitta aql oʻyini.» |
| Streak eslatmasi | 1911 | Bir martalik, 21:30. Faqat streak ≥2 boʻlsa | «{0} kunlik streakni saqlab qoling — bugun bitta savol yetarli.» |

**Rejalashtiruvchi — sof funksiya:**
`nzNotify.buildPlan(now, cfg, ctx) → [{id, at, title, body, extra}]`
- `cfg`: `nzSettings.get()`.
- `ctx`: `{ activeToday, streak, lang }`.

Qoidalari:
- Kunlik eslatma: `cfg.remind.on` boʻlsa, 7 kun uchun. Bugungisi `activeToday` yoki vaqt oʻtgan boʻlsa tashlanadi.
- Streak eslatmasi: `cfg.streakRemind` va `streak ≥ 2` boʻlsa.
  - `activeToday` → **ertaga** 21:30 (streak ertaga xavf ostida boʻladi).
  - Aks holda, agar hozir < bugun 21:30 → **bugun** 21:30.
- **Kuniga koʻpi bilan 2 ta:** kunlik eslatma vaqti ≥ 19:30 boʻlsa, oʻsha kuni streak eslatmasi qoʻyilmaydi (2 soatdan yaqin, kunlik eslatma yetarli).
- Matn **reja tuzilayotgan paytdagi tilda** yoziladi (`nzT`, `nzTN`).

**Qoʻllash:**
`nzNotify.apply(plan, {interactive}) → Promise<'scheduled'|'denied'|'no-permission'|'unsupported'|'error'>`
U avval 1901–1907 va 1911 ni bekor qiladi, keyin rejani qoʻyadi.

**Rejani qayta tuzish vaqtlari** (bootstrap chaqiradi):
- ilova ochilganda, fonga ketganda va qaytganda;
- kunning birinchi faoliyatida (streak eslatmasi darhol bekor qilinadi yoki ertaga suriladi);
- eslatma sozlamasi yoki til oʻzgarganda.

Rejani **qoʻllash ishi** kunning birinchi faoliyati yoki sozlama oʻzgarganda Mainʼning `settings` yoki `activeToday` oʻzgarishidan keladi. Bootstrap buni `syncSettings` ichida kuzatadi.

**Bosilganda:** bildirishnomada `extra: {to:'home'}` bor. `bootstrap.js` `localNotificationActionPerformed` ni tinglaydi va `app.openFrom(to)` ni chaqiradi.
Savol yoki oʻyin ketayotgan boʻlsa hech narsa almashtirilmaydi. Aks holda push-stek va varaqlar yopiladi va tab ochiladi.
v1.1 da har doim Bosh.

**Kichik ikonka:** `ic_stat_iquest` (oq siluet).
`capacitor.config.json` → `plugins.LocalNotifications: { smallIcon: "ic_stat_iquest", iconColor: "#3D5EFF" }`.
Bu boʻlmasa eslatma koʻp qurilmada kulrang yoki oq kvadrat boʻlib chiqadi.

### 7.3 Ruxsat

- `POST_NOTIFICATIONS` **faqat** foydalanuvchi niyati bilan soʻraladi: birinchi kirishdagi [Yoqish] yoki Sozlamalardagi almashtirgich. Ilova ochilishida soʻralmaydi, faqat tekshiriladi (mavjud tamoyil).
- **Rad etilsa:**
  - almashtirgich oʻchiq holatga qaytadi;
  - toast «Bildirishnomaga ruxsat berilmagan — tizim sozlamalaridan yoqing» chiqadi;
  - «Kunlik eslatma» pastki qatorida «Tizim sozlamalarida ruxsat bering» yoziladi.
- **Yangi oʻrnatishda** `remind.on = false` va `streakRemind = false`, foydalanuvchi oʻzi yoqmaguncha. (Hozirgi `notifOn: true` standarti chalgʻitadi.)
- **1.0 dan yangilanganda** `notifOn` qiymati koʻchiriladi. Ochilishdagi ruxsatsiz tekshiruv ruxsat boʻlmasa uni jimgina oʻchiradi (mavjud xulq).

### 7.4 Inbox — v1.x da yoʻq

Har bir mahalliy hodisa (nishon, vazifa, liga, hafta yakuni) oʻz vaqtida bir marta koʻrsatiladi: bayram kartasida yoki mukofot qatorida. Keyin u oʻz uyida yashaydi: Nishonlar, Reyting, tanga pilli.
Oʻzimiz yaratgan hodisalardan iborat inbox bir xil faktning ikkinchi uyi boʻlardi.
**v2:** Bosh sarlavhasining oʻng tomonida, tanga pillidan keyin qoʻngʻiroqcha (oʻqilmaganlik nuqtasi bilan) → «Bildirishnomalar» ekrani. Unda doʻstlik soʻrovlari, guruh taklifi, eslatib oʻtishlar va server liga natijalari boʻladi (§11).

---

## 8. Tillar: ingliz tili (4-til)

### 8.1 UI lugʻati

- `LANGS = ['uz', 'uz-cyrl', 'ru', 'en']`.
- Til nomlari har biri oʻz yozuvida: «Oʻzbekcha», «Ўзбекча», «Русский», «English». Hozirgi «(lotin)/(кирилл)» qoʻshimchasi olib tashlanadi, chunki yozuvning oʻzi uni koʻrsatib turadi.
- Yangi fayl `src/i18n-en.js` → `window.nzEn`. U `nzRu` kabi aniq oʻzbekcha manba satr boʻyicha kalitlanadi. `i18n.js` dagi `dict()` rus tili uchun `nzRu`, ingliz tili uchun `nzEn` ni qaytaradi.
- `<html lang="en">`.
- **Koʻplik shakllari:** lugʻat qiymati satr yoki koʻplik obyekti boʻlishi mumkin:
  - inglizcha `{one, other}`;
  - ruscha `{one, few, many}`.
  Yangi `nzI18n.plural(tpl, n)` va global `nzTN(tpl, n)` `Intl.PluralRules` dan foydalanadi.
  Masalan `"{0} ta savol"` → `{one:"{0} question", other:"{0} questions"}`.
  Oʻzbek va oʻzbek-kirill kalitni oʻzicha ishlatadi.
- **Raqam va sana** hamma tilda bir xil: «1 200», dd.mm.yyyy, 24 soatlik vaqt.
- **Foydalanuvchi matni** (`…Raw`) hech qachon tarjima ham, transliteratsiya ham qilinmaydi.
- **Katalog satrlari** (nishon nomi va sharti, rang nomi, avatar nomi) `catalog.js`, `badges.js` va `avatars.js` da oʻzbekcha manba sifatida turadi va xuddi shu lugʻat orqali oʻgiriladi.
- **Qamrov testi** `tests/i18n-coverage.test.mjs` ikkala lugʻatda ham boʻlishi kerak boʻlgan satrlarni yigʻadi:
  - `Main.dc.html` markup matn tugunlari;
  - `aria-label`, `placeholder` va `title` atributlari;
  - `T("…")`, `nzTN("…")` va dialog K-jadvali;
  - `catalog.js`, `badges.js`, `avatars.js`;
  - `bootstrap.js` va `notify.js` satrlari.

  Istisno roʻyxati: brend soʻzlar (IQuest, IQ, Telegram, Google Play).
  Test rus lugʻatidagi bugungi boʻshliqlarni ham yopadi: hozir unda 140 ta yozuv bor, UI satrlari esa undan koʻp.
- Chiqarib olish mantigʻi `tools/i18n-extract.mjs` da. Uni test ham, build darvozasi ham ishlatadi.

### 8.2 Kontent: `{uz, ru}` → `{uz, ru, en}`

- **CONTRACT oʻzgarishi (§2, §9):** matn obyektlari `en` ni olishi mumkin.
  - Generator yoki oʻyin `register({ …, langs: ['uz','ru','en'] })` deb eʼlon qilganda `validateItem`/`validateView` boʻsh boʻlmagan `en` ni **talab qiladi**.
  - `langs` yoʻq boʻlsa `['uz','ru']` deb hisoblanadi.
  - Yangi yordamchilar: `IQ.langsOf(type)`, `IQ.games.langsOf(id)`.
- **Ish hajmi (har egasi oʻz faylida, oʻz testlari bilan):**

| Fayl | Hajm | Eslatma |
|---|---|---|
| matrix.js | ≈ 35 boʻlak | Qoida matnlari, prompt |
| series.js | ≈ 40 shablon | Inglizcha koʻplik yordamchisi, `ruRaz` ga parallel |
| spatial.js | ≈ 15 | |
| verbal.js | 6 | + `content/verbal.json` |
| 6 ta oʻyin | ≈ 90–100 satr | `T(uz, ru)` → `T(uz, ru, en)` |

- **content/verbal.json — 134 yozuvning hammasi:**
  - har bir yozuvga `"en": {prompt, stimulus, options[]}` va `explain.en` qoʻshiladi;
  - variantlar soni va `correct` indeksi uz/ru bilan **bir xil**;
  - soʻzma-soʻz tarjima emas, **moslashtirish**: soʻz munosabati ingliz tilida ham toʻgʻri boʻlishi, faqat oʻzbek madaniyatiga xos soʻz boʻlmasligi kerak;
  - `key` va `level` oʻzgarmaydi;
  - yangi bayroq `reviewed_en: false` — inglizcha matnni yaxshi biladigan odam tekshirmaguncha.
- **Nima uchun hammasi:** `verbal:level:seed` qaysi yozuvga tushishi darajadagi roʻyxatga bogʻliq (verbal.js dagi ogohlantirish).
  Inglizcha roʻyxatni filtrlash yoki `en: null` bilan chiqarib tashlash bir xil ID ni turli tilda turli savolga olib boradi. Bu `session.restore` va `verify` (§3, §10) ni buzadi. **Taqiqlangan.**
- **Qoʻshimcha tekshiruvlar (har egasining testida, 2 000 urugʻ / tasodifiy oʻyin boʻyicha):**
  - `en` bor va boʻsh emas;
  - `en` da kirill harfi yoʻq, oʻzbek `ʻ` belgisi yoʻq;
  - savol ID si tilga bogʻliq emas;
  - `verify` natijasi hamma tilda bir xil.

### 8.3 Fallback

- UI: `nzEn[key] || oʻzbekcha manba`.
- Kontent: `pickLang(v, 'en') = v.en || v.uz`, `pickLang(v, 'ru') = v.ru || v.uz`. Zaxira hech qachon rus tiliga tushmaydi.
- Zaxira faqat yiqilishdan himoya uchun bor, chiqarilgan buildʼga u yetib bormaydi (darvoza).
- Ingliz tilida tiklangan eski test snapshotʼida `en` siz matn boʻlsa, oʻzbekcha matn koʻrsatiladi. Savol oʻzgarmaydi.

### 8.4 Chiqarish darvozasi («hammasi yoki hech narsa»)

`build.mjs` quyidagi 4 shart **hammasi** bajarilganda `nzI18n.langs` ga `'en'` ni qoʻshadi:
1. `tools/i18n-extract.mjs` boʻyicha `nzEn` da yetishmayotgan kalit **0 ta**.
2. Bundleʼdagi har bir generator (`IQ.types()`) va har bir oʻyin (`IQ.games.list()`) `langs` da `'en'` ni eʼlon qilgan. Build bundleʼni `node:vm` da yuklab tekshiradi, bu arzon.
3. `content/verbal.json` dagi 134 yozuvning hammasida `en` va `explain.en` bor.
4. Sayt buildʼida `/en/shartlar/` va `/en/maxfiylik/` sahifalari bor. Rad qilish matni faqat Shartlarda yashaydi, shuning uchun ular ingliz tili yoqilishidan **oldin** majburiy.

Bitta shart bajarilmasa English til tanlovida ham, birinchi kirishda ham **chiqmaydi**, build esa ogohlantirish chiqaradi.
Ishlab chiqish uchun `--lang-en` bayrogʻi darvozani majburan ochadi.
**Hech qachon** ingliz tilidagi IQ test uz/ru dan kam savol turi bilan chiqmaydi (per-tur filtrlash yoʻq).

### 8.5 Inglizcha lugʻat (glossary)

| Oʻzbekcha | English |
|---|---|
| Bosh / Mashq / Reyting / Profil | Home / Practice / League / Profile |
| ball | points |
| tanga | coins |
| streak | streak |
| Boshlovchi · Bronza · Kumush · Oltin · Platina · Olmos | Beginner · Bronze · Silver · Gold · Platinum · Diamond |
| Kunlik vazifalar | Daily quests |
| Xatolarim / Saqlangan | Mistakes / Saved (360 px plitka; CONTRACT §17) |
| IQ oʻyinlari / Aql oʻyini | IQ games / Brain game |
| Doʻkon / Nishonlar / Vitrina | Shop / Badges / Showcase |
| Sozlamalar / Eslatma | Settings / Reminder |
| Oraliq | Range |

§6 dagi taqiqlar ingliz tilida ham amal qiladi: official, certified, accredited, clinical, Mensa, percentile, «smarter than», «raise/boost/increase your IQ».
Ular `tools/honesty.mjs` roʻyxatida turadi (§14).

### 8.6 Hajm va reja

- **Hajm:** UI ≈ 300 satr, generatorlar ≈ 95, oʻyinlar ≈ 100, verbal ≈ 950 satr (ogʻzaki savollarni ingliz tilini yaxshi biladigan odam tekshirishi kerak).
- **Reja:**
  - v1.1 arxitekturani 3 tilda chiqaradi;
  - WP10a–f va WP5 ning inglizcha qismi v1.1 bilan **parallel** boradi;
  - darvoza ochilgach English v1.2 da chiqadi.
- **PLAY.md** ga en-US listing qoʻshiladi (xuddi shu halollik qoidalari bilan).

---

## 9. Dizayn tizimi

### 9.1 Rang rollari (bitta rang — bitta maʼno)

| Rol | Token | Qayerda |
|---|---|---|
| Asosiy harakat | `--primary` / `--primary-ink` / `--primary-soft` | Tugmalar, faol tab, havolalar, «keyingi qadam» belgisi. **Faqat shu** |
| Raqobat | `--ball` / `--ball-ink` (binafsha) va `--purple` | Ball ◆, liga kartasi, zinapoya, haftalik ustunlar |
| Tanga | `--coin` / `--coin-rim` / `--coin-ink` / `--coin-on` (oltin) | **Faqat** tanga: pill, chiplar, narxlar |
| Streak va muvaffaqiyat | `--green-ink`, `--success` | Olov, toʻgʻri javob, «✓ Olindi» |
| Xavf va xato | `--destructive`, `--destructive-ink` | Notoʻgʻri javob, oʻchirish, xato qatori |
| Kategoriya | `--primary-ink`, `--teal-ink`, `--purple`, `--pink-ink` (oltin **yoʻq**) | **Faqat** 40/44 px kategoriya plitkasi ichida (savol turi, koʻnikma, Saqlangan) |
| Identifikatsiya | profil rangi (catalog.js) | Faqat avatar, avatar halqasi, Profil tasmasi |

**Bitta toʻyingan blok qoidasi:**
- Bosh — IQ test kartasi;
- Reyting — liga kartasi;
- Natija — natija halqasi;
- Profil — yoʻq (tasma 18% shaffoflikda).

Boshdagi hozirgi binafsha va yashil plitkalar olib tashlanadi.

**Yangi tokenlar** (`:root` va `[data-theme="dark"]`, kontrast hisoblab chiqilgan):

| Token | Yorugʻ | Tungi | Oʻlchangan kontrast |
|---|---|---|---|
| `--ball` (toʻldirish) | #8552F0 | #9C7BFF | Grafika. Yonida doim raqam yorligʻi |
| `--ball-ink` (matn va ikonka) | #6B3FE0 | #B9A2FF | Yorugʻda: oq ustida 6.15, surface-alt ustida 5.16, fon ustida 5.61. Tungida: surface ustida 7.73, surface-alt ustida 7.06 |
| `--coin` (toʻldirish) | #FFA726 | #FFB84D | = `--gold` |
| `--coin-rim` | #C77700 | #FFB84D | Oq ustida 3.46 (grafika ≥3) |
| `--coin-ink` | #965C00 | #FFB84D | = `--gold-ink`. Oq ustida 5.49, surface-alt ustida 4.60 |
| `--coin-on` | #2A1B00 | #2A1B00 | `--coin` ustida 8.61 |

**Qayta boʻyash:**
- Bosh va Oʻyin yakunidagi oltin ◆ → `--ball`.
- Reyting va Profildagi «Jami ball» `--gold-ink` → `--ball-ink`.
- Kategoriya plitkalaridan oltin olib tashlanadi, shunda oltin faqat tangaga qoladi:
  - «Tezlik» koʻnikmasi `--gold-ink` → `--teal-ink`;
  - «Fazoviy» koʻnikmasi `--teal-ink` → `--purple` (Fazoviy savol turi bilan bir xil boʻladi);
  - «Saqlangan» plitkasi `--gold-ink` → `--primary-ink`;
  - nomaʼlum tur (`_`) `--gold-ink` → `--muted-foreground`.

**Liga ranglari** faqat qalqon SVG larida (`src/art.js`) turadi, chunki `<img>` ichidagi SVG CSS oʻzgaruvchisini koʻrmaydi.
Qalqonda liga darajasi chevronlar soni bilan ham bildiriladi.

| Liga | Qalqon | Chevron rangi | Kontrast |
|---|---|---|---|
| Boshlovchi (0 chevron) | #8A8799 | #FFFFFF | 3.50 |
| Bronza (1) | #C77B3F | #FFFFFF | 3.32 |
| Kumush (2) | #A7B1C2 | #1C1B29 | 7.84 |
| Oltin (3) | #E0A100 | #1C1B29 | 7.48 |
| Platina (4) | #3FC1BE | #1C1B29 | 7.74 |
| Olmos (5) | #7C8CFF | #1C1B29 | 5.70 |

Yutuq medalyonlari halqasi: bronza #C77B3F, kumush #A7B1C2, oltin #E0A100 (`art.js`).

### 9.2 Token shkalasi (yopiq toʻplam)

- **Oraliq:** 4 · 8 · 12 · 16 · 20 · 24 · 32. Ekran cheti 16, karta ichki cheti 16, bloklar orasi 12, boʻlimlar orasi 24.
- **Radius:** 8 (kichik chip) · 12 (44 px plitka) · 14 (tugma, input) · 20 (karta) · 24 (hero, varaq, identifikatsiya kartasi) · 999 (pill).
- **Balandlik:**

| Element | px |
|---|---|
| sarlavha qatori | 44 |
| push sarlavhasi | 56 |
| sozlama qatori | 56 (pastki qatorli qator 64) |
| roʻyxat qatori | 64 |
| Mashq qatori | 76 |
| tugma | 52 |
| input | 52 |
| chip / pill | 36 (kichik chip 28) |
| pastki menyu | 68 |
| almashtirgich | 51×31 |
| rang namunasi | 44 |
| plitkalar | 44 / 40 / 36, ichida 24 / 22 / 20 px ikonka |

- **Shrift — faqat 9 uslub:**
  - display-xl 56/800 Space Grotesk (natija IQ);
  - display-l 40/800 SG (bayram raqamlari);
  - display-m 28/800 SG (h1, stat qiymati, hero sarlavhasi);
  - title 20/700 (h2, varaq sarlavhasi);
  - headline 17/700 (push sarlavhasi, karta sarlavhasi);
  - body-strong 16/700;
  - body 15/600;
  - caption 13/600;
  - overline 12/800 (katta harf, +0.06em).
  - Yagona istisno: tab yorligʻi 11/700.
  - Hamma raqamlar `tabular-nums` bilan.
- **Harakat:**

| Token | Qiymat | Ishlatilishi |
|---|---|---|
| `--dur-fast` | 120 ms | Bosish, `scale(.96)`, mavjud |
| `--dur-base` | 180 ms | Tab almashishi, fade |
| `--dur-rise` | 220 ms | Mavjud `nzRise` |
| push | 220 ms | 24 px siljish + fade kirish, chiqish 180 ms |
| `--dur-sheet` | 260 ms | `cubic-bezier(.2,.8,.2,1)`, parda 200 ms |
| toast | 200 ms | |
| sanagich | 400 ms | Qatʼiy enli pill ichida |
| medalyon | 400 ms | 0,6 → 1,08 → 1 |

  Konfetti, parallaks va aylanuvchi animatsiya yoʻq. `prefers-reduced-motion` hammasini oniy qiladi (mavjud qoida).

### 9.3 Komponentlar (yopiq roʻyxat, 3-qatlam)

Ekranlar faqat shularni teradi. Yangi element avval eng quyi mos qatlamga qoʻshiladi (mavjud QATLAMLAR qoidasi).

**Tugma va boshqaruv:**
- Tugma (asosiy / shaffof / yumshoq / xavfli, 52 px)
- IconButton 44
- Almashtirgich 51×31
- Segment 36/40

**Chip va pill:**
- Chip 36 va 28
- Narx/holat chipi 28
- Mukofot chipi 64×28
- Valyuta pilli 36

**Qator va karta:**
- Qator: plitka + nom + qiymat + aksessuar
- Karta, HeroCard, StatTile 88

**Sarlavha:**
- Push sarlavhasi 56
- Boʻlim sarlavhasi 28

**Overlay:**
- Varaq (tutqich 40×4, sarlavha 20/700, har tur uchun qatʼiy balandlik)
- Dialog
- Toast 48
- Bayram kartasi 300×340

**Kiritish:**
- Input 52 va matn maydoni 76, ikkalasi ham 18 px yordam/xato qatori bilan

**Tasvir:**
- Avatar: 32/40/64/88/112/160 × bosh harf / tayyor / rasm
- Medalyon: olti burchak (yutuq) yoki doira (kolleksiya) × 40/60/104. Olinmagani kulrang va qulf bilan
- Rang namunasi 44
- Liga qalqoni 16/44/104
- Progress chizigʻi 6/8/10
- Boʻsh holat: 48 px ikonka, bitta 15/600 qator, ixtiyoriy tugma

### 9.4 Ikonkalar (2-qatlam)

- **Bitta reyestr:** `src/icons.js` → `window.nzIcons = { name: [path1, path2, path3?] }`.
  Markup har doim `path1`–`path3` ni reyestrdan bogʻlaydi. Yangi markupda qoʻlda yozilgan ikonka yoʻli yoʻq.
  `i18n` ning `RAW_KEY` qoidasi `^path\d$` ni allaqachon chetlab oʻtadi.
- **Keyline shartnomasi saqlanadi:**
  - 24×24;
  - har tomondan ≥1 px boʻsh joy;
  - yumaloq uchlar va burchaklar;
  - glifda ≤3 element;
  - bir maʼno = bir glif;
  - chiziq qalinligi mavjud CSS rampidan.
- Lucide yoʻllari moslashtirilishi mumkin (ISC litsenziyasi). Bu README §7 ga yoziladi.
- **Aniqlashtirish:** hozir 2×2 setka ham «Mashq» tabini, ham «IQ oʻyinlari»ni bildiradi. Endi:
  - **Mashq** — gantel (`dumbbell`);
  - **IQ oʻyinlari** — boshqotirma boʻlagi (`puzzle`);
  - 6 ta oʻyinning har biri oʻz glifiga ega.

**Kerakli gliflar:**

| Guruh | Gliflar |
|---|---|
| Navigatsiya | home, dumbbell, trophy, user, gear, chevron-left, chevron-right, x, check, plus, external-link |
| Amallar | pencil, image, trash, lock, bookmark, x-circle, pause |
| Sozlamalar | globe, moon, volume, vibrate, bell, clock, flame, help-circle, mail, star, doc, shield-check |
| Iqtisod | bag (Doʻkon), medal (Nishonlar), palette (Ranglar), sparkle (bayram) |
| Savol turlari | matrix (3×3 setka), series (trend — **faqat** son qatorlari uchun), spatial (kub), verbal (chiziqlar) |
| Koʻnikmalar | attention (nishon), memory (qatlamlar), speed (chaqmoq), logic (lampochka), puzzle |
| Oʻyinlar | flanker (5 strelka, oʻrtadagisi teskari), matrix-memory (3×3 setka, 2 katak toʻla), mental-math (± yumaloq kvadratda), nback (soat miliga teskari strelka + nuqta), schulte (2×2 raqamli setka), sequence (yoʻl bilan ulangan 3 nuqta) |
| v2 zaxirasi (reyestrda bor, ishlatilmaydi) | users, message, user-plus, search, flag, ban, share, link |

- Vazifa qatorlari maʼno gliflarini qayta ishlatadi: Q1 = dumbbell, Q2 = oʻyin glifi, Q3 = x-circle yoki savol turi glifi.
- **Toʻldirilgan illyustratsiyalar** (`role="img"`, chiziq qoidasidan tashqari; `src/art.js` va `src/avatars.js`):
  - 6 ta liga qalqoni;
  - yutuq medalyoni (olti burchak + nzIcons dan oq glif);
  - 8 ta kolleksiya emblemasi (ikki tusli);
  - tanga, ◆ ball;
  - 16 ta avatar;
  - IQ belgisi.
- UI da emoji yoʻq.

### 9.5 Ovoz effektlari (`src/feedback.js`)

- WebAudio sintezi, aktiv fayllar 0 bayt.
- Hammasi bitta C-major pentatonika «oilasi»da. Choʻqqi gain ≤0,16, fanfaralar ≤0,12.
- **API:** `nzFeedback.play(name)` va `nzFeedback.configure({sound, haptics})`. Eski `correct`/`wrong`/`finish`/`setEnabled` taxallus sifatida qoladi.

| Nomi | Qachon | Tovush | Davomiyligi | Tebranish |
|---|---|---|---|---|
| select | Testda variant tanlanganda, almashtirgich, rang namunasi | 1047 Hz sine, choʻqqi 0,05 | 30 ms | 6 ms |
| correct | Mashqda toʻgʻri | G5 → D6 (mavjud) | 250 ms | 18 |
| wrong | Mashqda notoʻgʻri | 196 → 165 square (mavjud) | 320 ms | [26,45,26] |
| finish | Oqim tugadi | C6-E6-G6 (mavjud) | 500 ms | [18,60,18,60,30] |
| gameStart | Oʻyin boshlandi | G5 blip | 80 ms | 12 |
| levelUp | Oʻyin darajasi oshdi | C6-D6-E6-G6 triangle | 450 ms | [15,30,15] |
| coin | Tanga tushdi | E6 + B6 yorqin chertish | 160 ms | 12 |
| purchase | Xarid | Filtrlangan shovqin 120 ms + coin | 300 ms | 25 |
| badge | Yangi nishon | C5-E5-G5-C6-E6 triangle fanfara | 900 ms | [20,40,20,40,40] |
| leagueUp | Liga koʻtarildi yoki hafta mukofoti | Koʻtariluvchi sweep + C-major akkord | 1 100 ms | [30,50,30] |
| streak | Kunning birinchi faoliyati | G4 → C5 iliq | 280 ms | 15 |
| denied | Tanga yetmaydi | A3 sine | 150 ms | 20 |

**Qoidalar:**
- Navigatsiya va scrollʼda ovoz yoʻq.
- **Test paytida faqat `select`** chalinadi, toʻgʻri-notoʻgʻri sezdirilmaydi. `streak` va `coin` Natijada chalinadi.
- Ovoz va tebranish alohida almashtirgichlar bilan boshqariladi.
- 60 ms ichida bitta ovozdan ortigʻi chalinmaydi. Fonda ovoz yoʻq.
- `AudioContext` birinchi bosishda tiklanadi (mavjud).

### 9.6 Layout shift qoidalari (majburiy)

- **Bosh:** IQ kartasi uch holatda ham 180 px. Vazifa qatorlari 64 px, chip 64×28 qatʼiy.
- **Profil:** bio 42 px, vitrina 40 px.
- **Kiritish:** har input va matn maydoni ostida 18 px yordam qatori doim bor.
- **Natija va Oʻyin yakuni:** mukofot qatori qatʼiy 28 px; tanga chipi boʻlmasa joy egallamaydi — qolgan chip markazda turadi, qator balandligi oʻzgarmaydi.
- **Varaqlar** har tur uchun qatʼiy balandlikda. Xarid varagʻi uch holatda ham 380 px.
- **Sozlamalar:** «Vaqt» qatori oʻchiq holatda xira boʻladi, yoʻqolmaydi.
- **Morph xavfi:** runtime DOMʼni pozitsiya boʻyicha solishtiradi. Input yoki uning yordam qatori oldida shartli (`sc-if`) qoʻshni element boʻlmasligi kerak, aks holda input qayta yaratiladi va fokus yoki IME matni yoʻqoladi. Yashirish faqat `visibility` yoki shaffoflik bilan qilinadi.
- **Bayram va toast** faqat overlay boʻladi, oqimga tushmaydi.

---

## 10. Maʼlumot modeli

### 10.1 Kalitlar va egalari (bitta kalit = bitta ega = bitta `sane()`)

| Kalit | Ega fayl | Holat |
|---|---|---|
| `nz-progress`, `nz-attempts`, `nz-iq-tests` | src/progress.js | Mavjud. `soundOn`/`notifOn` endi faqat oʻqiladi (migratsiya uchun) |
| `nz-iq-ui` | src/Main.dc.html | Mavjud, **v:1 qoladi**. Hech narsa qoʻshilmaydi |
| `nz-iq-run` | src/Main.dc.html | Mavjud |
| `nz-lang` | src/i18n.js | Mavjud, endi `'en'` ham boʻlishi mumkin |
| `nz-theme` | src/Main.dc.html | Mavjud |
| `nz-settings` | **src/settings.js** (yangi) | Sozlamalar, birinchi kirish, tiplar |
| `nz-profile` | **src/profile.js** (yangi) | Nom, bio, rang, avatar, vitrina |
| `nz-avatar-img` | **src/profile.js** | Rasm, ≤64 000 belgi, alohida kalit |
| `nz-wallet` | **src/wallet.js** (yangi) | Tanga, xaridlar, vazifalar, jurnal |
| `nz-badges` | **src/badges.js** (yangi) | Olingan nishonlar, hisoblagichlar |
| `nz-league` | **src/league.js** (yangi) | Yopilgan haftalar, eng yaxshi hafta, eʼlonlar |

**Statik maʼlumot** (saqlanmaydi):
- `src/catalog.js` → `nzCatalog`
- `src/avatars.js` → `IQ_AVATARS`
- `src/icons.js` → `nzIcons`
- `src/art.js` → `nzArt`

### 10.2 JSON shakllari

```js
// nz-settings
{ v: 1, sound: true, haptics: true,
  remind: { on: false, h: 19, m: 0 }, streakRemind: false,
  onboard: { done: true, at: 1759000000000, from: '1.1.0' },
  tips: { testIntro: false } }

// nz-profile
{ v: 1, username: '', bio: '', color: 'purple',
  avatar: { kind: 'initial' } | { kind: 'preset', id: 'owl' } | { kind: 'photo' },
  showcase: null | ['first-test', 'compass'],   // ≤3
  updatedAt: 1759000000000 }

// nz-avatar-img
"data:image/jpeg;base64,…"                     // ≤ 64 000 belgi

// nz-wallet
{ v: 1, balance: 120, earned: 300, spent: 180,
  owned: { colors: ['red'], badges: ['compass'] },   // bepul ranglar saqlanmaydi, katalogdan kelib chiqadi
  credited: { 'welcome': 1, 'b:first-test': 1, 'w:2026-09-14': 1, 'q:2026-09-25:q1': 1 },
  quests: { day: '2026-09-25', list: [
    { id: 'q1', kind: 'practice', target: 10, n: 3 },
    { id: 'q2', kind: 'game',     target: 1,  n: 0 },
    { id: 'q3', kind: 'fix',      target: 3,  n: 1 }            // yoki { kind:'type', type:'series', target:5 }
  ] },
  maxSeen: 1759000000000,
  ledger: [ { at: 1759000000000, amt: 10, src: 'quest', key: 'q:2026-09-25:q1' } ] }   // ≤100

// nz-badges
{ v: 1, earned: { 'first-test': 1759000000000 }, seen: ['first-test'], counters: { fixes: 12 } }

// nz-league
{ v: 1, weeks: { '2026-09-14': 620, '2026-09-07': 410 },   // yopilgan haftalar, ≤12
  best: { w: '2026-09-14', ball: 620 },
  announced: { w: '2026-09-21', tier: 1 } }                 // shu hafta koʻrsatilgan eng yuqori liga
```

### 10.3 Versiya va migratsiya (har yangi modulda bir xil)

- `const V = 1`. `sane(raw)` quyidagicha ishlaydi:
  - `raw.v === V` → har maydon alohida tekshiriladi: `Object.create(null)` xaritalar, chegaralar, ruxsat roʻyxatlari;
  - `raw.v < V` → `migrate` zanjiri (v1 → v2 → …), keyin qayta yoziladi;
  - `raw.v > V` (ilova eski versiyaga qaytarilgan) → xotirada standart qiymatlar, `readOnly = true`. **Yangi maʼlumotning ustiga hech qachon yozilmaydi.** Bu hozirgi «versiya mos emas → boʻsh» maʼlumot yoʻqotish naqshini yangi kalitlarda tuzatadi;
  - buzilgan yoki yoʻq kalit → standart qiymat. Ilova yiqilmaydi, `localStorage` ishlamasa ham ishlayveradi.
- **`nz-iq-ui` versiyasi oshirilmaydi.** `uiSane()` bugun `v !== 1` da boʻsh qaytaradi, bu Xatolarim, Saqlangan, oʻyinlar va kunlar roʻyxatini oʻchirib yuborardi. Liga tarixi shuning uchun alohida `nz-league` da.
- **1.1 ning birinchi ishga tushishi** (tartib qatʼiy):
  1. `settings.js` yuklanishi bilan: `nz-settings` yoʻq boʻlsa, `nz-progress.soundOn`/`notifOn` dan `sound`/`remind.on` ga bir marta koʻchiradi (`null` → standart). Bu bootstrapʼning birinchi `save()` idan **oldin** boʻladi.
  2. `progress.js` ning `save()` metodi endi `soundOn`/`notifOn` ni **qayta yozmaydi**: saqlangan qiymat oʻzgarmaydi, eski versiya uni oʻqiy oladi.
  3. Main: `nz-league` boʻsh boʻlsa, `ui.days` dan oldingi (≤2) yopilgan haftani toʻldiradi (§6.5, mukofotlar kalit bilan).
  4. Main: `nzBadges.check(stats)` → orqaga qarab berilgan nishonlar → `credit` → bitta yigʻma karta.
  5. Birinchi kirish yangi yoki yangilash oqimida (§4.1).

### 10.4 Modul chegaralari va APIʼlar

**Qoidalar:**
- **Main.dc.html yagona orkestrator.** Domen hodisalaridan keyin modullarni chaqiradi va natijani chizadi:
  - javob qabul qilindi, oqim tugadi, oʻyin tugadi;
  - profil saqlandi, ilova ochildi, hafta almashdi.
- **Holatli modullar bir-birini chaqirmaydi.** Wallet nishonlarni bilmaydi, badges hamyonni bilmaydi, profile ularning hech birini bilmaydi.
  Statik maʼlumotni (`nzCatalog`, `nzIcons`, `IQ_AVATARS`) istalgan modul oʻqishi mumkin, u build tartibida oldinroq yuklanadi.
- **Har modul** CONTRACT §1 formatidagi oddiy IIFE: import yoʻq. U `node:vm` da `window` va `localStorage` taqlidi, kiritilgan `now` bilan testlanadi.
- **Nomlash cheklovi:** build mobil kodda quyidagi nomlarni taqiqlaydi:
  - MONEY_NAMES: `openPay`, `confirmPay`, `valsMoney`, `openPro`, `openRedeem`, `payStepMethod`, `proFinePrint`, `plansFrom`, `PRO_BENEFITS`, `PAY_METHODS`;
  - FORBIDDEN_CODE: `ROLES`, `REASONS`, `logAction`.

  Shuning uchun Doʻkon kodida `valsShop`, `openBuy`, `buyItem`, `confirmBuy` ishlatiladi.

```js
nzSettings: get(), set(patch) → nusxa, isOnboarded(), markOnboarded(ver),
            tip(id) → bool, markTip(id), readOnly()

nzProfile:  get(), save(patch) → { ok, errs: { username?, bio? } },   // hammasi yoki hech narsa
            validateUsername(s) → null|'len'|'start'|'chars'|'format'|'reserved'|'bad',
            cleanBio(s) → { value, err: null|'len'|'link'|'bad' },
            photo() → dataUrl|null,
            preparePhoto(file, align) → Promise<{ ok, dataUrl?, shape?: 'portrait'|'landscape'|'square',
                                                  err?: 'type'|'size'|'decode'|'encode' }>,
            commitPhoto(dataUrl) → { ok, err?: 'quota' }, removePhoto(), reset()

nzWallet:   balance(), state(), owns(itemId), credit(n, src, key) → bool,
            spend(itemId) → { ok, err?: 'unknown'|'owned'|'free'|'funds'|'readonly' },  // itemId: 'color:red' | 'badge:compass'
            quests(day, ctx: { wrongCount, weakestType, gameOfDay }) → [{ id, kind, type?, n, target, done, reward }],
            track(evt: { type: 'answer', mode, correct, itemType } | { type: 'game', id }) → [{ id, reward }],
            touch(now), ledger(n), reset()

nzBadges:   catalogue(), earned(), check(stats, now) → [yangi id], progress(id, stats) → { n, target }|null,
            bump(counter, n = 1), counters(), unseen(), markSeen(ids), reset()

nzLeague:   close(weekStart, ball) → bool, weeks(n) → [{ w, ball }], best() → { w, ball }|null,
            announced(w) → tier|-1, announce(w, tier), reset()

nzNotify:   available(), buildPlan(now, cfg, ctx) → [...], apply(plan, { interactive }) → Promise<holat>

nzFeedback: play(name), configure({ sound, haptics }), + eski taxalluslar

nzProgress (qoʻshimcha): activeToday() → bool      // kunlik eslatma va streak eslatmasi uchun
```

### 10.5 Build tartibi (`build.mjs`)

1. i18n-ru
2. i18n-en
2a. `window.nzLangs` (EN darvozasi — i18n init() dagi qurilma tili aniqlashi uni koʻrishi uchun)
3. i18n
4. runtime
5. feedback
6. notify
7. site (`nzSite`)
8. settings
9. progress
10. catalog
11. icons
12. art
13. avatars
14. profile
15. wallet
16. badges
17. league
18. IQ bundle
19. logic (Main)
20. data
21. bootstrap

Modul boʻlmasa uning funksiyasi yashiriladi (`window.nzProgress` dagi kabi xususiyatni aniqlash). Main modul hali birlashtirilmagan paytda kichik stub bilan ishlaydi.

### 10.6 «Maʼlumotlarni oʻchirish»

- **Oʻchiriladi:**
  - `nz-progress`, `nz-attempts`, `nz-iq-tests` (`nzProgress.reset`);
  - `nz-iq-ui`, `nz-iq-run`;
  - `nz-profile`, `nz-avatar-img`;
  - `nz-wallet`, `nz-badges`, `nz-league`.
- **Qoladi:** `nz-lang`, `nz-theme`, `nz-settings` (sozlamalar va «birinchi kirish oʻtilgan» bayrogʻi). Shuning uchun xush kelibsiz bonusi qayta berilmaydi.
- Oʻchirishdan keyin bildirishnoma rejasi qayta tuziladi.

### 10.7 README xaritasi («X qayerda» savoliga bitta javob)

| Foydalanuvchi joyi | Mainʼdagi modul | Mantiq fayli | Kalit |
|---|---|---|---|
| Bosh | valsHome | wallet.js (vazifalar), progress.js | nz-wallet, nz-iq-ui |
| Mashq | valsPractice | iq/*, games/* | nz-iq-ui |
| Reyting | valsLeague | league.js, Main `LEAGUES` | nz-iq-ui, nz-league |
| Profil | valsProfile | profile.js, badges.js | nz-profile |
| Profilni tahrirlash | valsProfileEdit | profile.js, avatars.js, catalog.js | nz-profile, nz-avatar-img |
| Nishonlar | valsBadges | badges.js, catalog.js | nz-badges, nz-wallet |
| Doʻkon | valsShop | wallet.js, catalog.js | nz-wallet |
| Sozlamalar | valsSettings | settings.js, notify.js, feedback.js | nz-settings |
| Birinchi kirish | valsOnboard | settings.js, profile.js | nz-settings |
| Bayram, toast, varaqlar | valsCelebrate, valsSheet | — (faqat state) | — |

Mainʼdagi fayl xaritasi izohi (§4 modullar roʻyxati) shu `vals*` nomlari bilan yangilanadi.

---

## 11. Ijtimoiy funksiyalar (v2 — faqat server bilan)

### 11.1 Qayerda yashaydi

- **5-tab «Doʻstlar»** (users ikonkasi), Reyting va Profil orasida. Ekran tarkibi, yuqoridan pastga:
  - 48 px qidiruv «Foydalanuvchi nomi boʻyicha qidirish» (faqat aniq nom boʻyicha);
  - «Doʻstlik soʻrovlari (2)» qatori (faqat soʻrov boʻlsa);
  - bitta «Suhbatlar» roʻyxati — DM va guruhlar aralash, oxirgi xabar boʻyicha (Telegram modeli, ichki tab yoʻq);
  - sarlavhadagi «+» → varaq: «Yangi suhbat» / «Guruh yaratish» / «Doʻst qoʻshish».
- **Ochiq profil** (qidiruv, chat yoki guruhdan ochiladi):
  - avatar, nom, bio, vitrina, liga chipi;
  - eng yaxshi IQ faqat egasi yoqsa koʻrinadi («Eng yaxshi IQʼni koʻrsatish», standart **oʻchiq**);
  - [Xabar yozish] / [Doʻst qoʻshish];
  - «⋯» → «Shikoyat qilish», «Bloklash».
- **Guruhlar:**
  - nom 3–32 belgi, faqat tayyor avatar, ≤50 aʼzo;
  - rollar: ega, admin, aʼzo;
  - faqat taklif bilan (nom yoki havola orqali);
  - guruh ekrani: «Chat | Reyting» segmenti. Reyting — aʼzolarning haftalik balli, faqat server tekshirgan ballardan (CONTRACT §10).
- **Xabarlar:** faqat matn, ≤500 belgi, emoji mumkin. v2.0 da rasm, ovoz va fayl yoʻq.
- **Reyting tabiga** «Liga | Doʻstlar» segmenti va server liga jadvali qoʻshiladi (`leaderboardRows()` ilgagi).
- **Inbox:** Bosh sarlavhasidagi qoʻngʻiroqcha (§7.4). FCM push faqat Data safety yangilangandan keyin.
- **Sozlamalarga «Hisob» boʻlimi** qoʻshiladi: Kirish, «Kim yozishi mumkin» (Hech kim / Doʻstlar), Bloklanganlar, Hisobni oʻchirish.

### 11.2 Maʼlumot modeli (Supabase Postgres, hamma jadvalda RLS)

```
profiles(id uuid pk = auth.uid, username citext unique, bio text check(length ≤ 80), color text,
         avatar_kind, avatar_preset, show_best_iq bool default false, birth_year int2,
         created_at, username_changed_at, banned_at)
friendships(a uuid, b uuid, status 'pending'|'accepted', requested_by, created_at; pk (a,b), a < b)
blocks(blocker, blocked, created_at; pk (blocker, blocked))
conversations(id, kind 'dm'|'group', title, avatar_preset, created_by, invite_code unique, member_limit 50, created_at)
conversation_members(conv_id, user_id, member_kind 'owner'|'admin'|'member', joined_at, last_read_at, muted_until)
messages(id bigserial, conv_id, sender_id, body text check(length ≤ 500), created_at, deleted_at, hidden_by_mod bool)
reports(id, reporter, target_kind 'user'|'message'|'group'|'avatar', target_id,
        report_kind 'spam'|'harassment'|'hate'|'sexual'|'self_harm'|'other', note ≤300,
        status 'open'|'actioned'|'dismissed', created_at, resolved_by, resolved_at)
notifications(id, user_id, kind, payload jsonb, created_at, read_at)
wallet_ledger(id, user_id, amount, source, idem_key, created_at; unique(user_id, idem_key)) + wallets view
badges_earned(user_id, badge_id, at)   purchases(user_id, item_id, price, at)
week_scores(user_id, week, ball_verified)            -- faqat §10 tekshirgan natijalardan
```

- Realtime: har suhbat uchun bitta kanal, faqat aʼzolar oʻqiydi. Bloklangan juftliklar RLS va qidiruvda filtrlanadi.
- **Kod nomlari:** mobil build `ROLES` va `REASONS` ni taqiqlaydi, shuning uchun `member_kind` va `report_kind` ishlatiladi. JS da `REPORT_KINDS` va `MEMBER_KINDS`.
- **Mahalliy shakllar serverga mos:** `nz-profile` → `profiles`, `nz-wallet.credited` kalitlari → `idem_key`, `nz-badges` → `badges_earned`. Migratsiya — toʻgʻridan-toʻgʻri yuklash va nomni band qilish.
- **Nomni band qilish:** mahalliy nom birinchi kelganga beriladi. Band boʻlsa «Bu nom band — boshqasini tanlang» va takliflar chiqadi. Server bilan nomni 30 kunda bir marta oʻzgartirish mumkin.

### 11.3 Hozir nima chiqadi (v1.x) va nima backend bilan (v2)

- **v1.x:**
  - mahalliy profil, nishonlar, hamyon, vazifalar, Doʻkon, haftalik mukofot;
  - reyestrdagi v2 ikonkalari (ishlatilmaydi);
  - `leaderboardRows()` ilgagi.

  **Hech qanday ijtimoiy UI yoʻq:** oʻchiq tugma yoʻq, «tez kunda» yoʻq, «doʻstni taklif qiling» yoʻq, soxta foydalanuvchi yoʻq (Play «broken functionality» va Deceptive Behavior qoidalari, CONTRACT §6).
- **v2:**
  - kirish (Google yoki Telegram), nomni band qilish, ochiq profil;
  - doʻstlar, DM, guruhlar, shikoyat va bloklash;
  - inbox va FCM, server liga jadvali, server hamyoni.
  - Oʻz rasmlari moderatsiya boʻlmaguncha faqat egasining qurilmasida qoladi. v2.0 da ochiq avatar faqat tayyor avatar.

### 11.4 Play va UGC talablari (v2 ning 1-kunida hammasi boʻlishi shart)

1. **UGC shartlari:** nomaqbul kontent taqiqi. Birinchi xabar yoki guruhdan **oldin** ilova ichida qabul qilinadi.
2. **Shikoyat:** har foydalanuvchi, xabar, guruh va avatarda «⋯ → Shikoyat qilish», sabab roʻyxati bilan va «Shikoyat yuborildi» tasdigʻi.
3. **Bloklash:** kontent ikki tomonga yashiriladi, DM va taklif toʻsiladi.
4. **Moderatsiya navbati** admin panelda. Har amal mavjud confirm + `logAction` modeli bilan (bu faqat admin buildʼida), javob 24 soat ichida.
5. **Avtomatik yashirish:** 3 ta mustaqil shikoyatdan keyin kontent koʻrib chiqilguncha yashiriladi.
6. **Server tomonda:** nomaqbul soʻz filtri (nom, bio, guruh nomi, xabar; roʻyxat `profile.js` bilan umumiy).
7. **Tezlik chegaralari:** 20 xabar/daqiqa, 30 doʻstlik soʻrovi/kun, 5 guruh/kun.
8. **Suhbat xavfsizligi:**
   - DM faqat qabul qilingan doʻstlar orasida;
   - guruhlar faqat taklif bilan;
   - begonani topish faqat aniq nom boʻyicha.
9. **Yosh:**
   - roʻyxatdan oʻtishda tugʻilgan yil soʻraladi, maqsadli auditoriya 13+ (hech qachon Families);
   - **16 yoshgacha:** erkin matnli chat yoʻq (faqat liga va reyting), rasmi boshqalarga koʻrinmaydi.
10. **Rasmlar:** yuklangan avatar faqat qabul qilingan doʻstlarga va faqat avtomatik moderatsiyadan keyin koʻrinadi. Shikoyat qilingan avatar koʻrib chiqilguncha tayyor avatarga qaytadi.
11. **Hisobni oʻchirish:** ilova ichida va vebda (mavjud `/malumot-ochirish/` yangilanadi).
12. **Chiqarishdan OLDIN:**
    - Data safety yangilanadi: foydalanuvchi ID, nom, xabarlar, ixtiyoriy rasm;
    - IARC javoblari: «users can interact», «shares user-generated content»;
    - **Child Safety Standards (CSAE)** siyosati va aloqa nuqtasi eʼlon qilinadi;
    - xabar va shikoyatlarni saqlash muddati maxfiylik siyosatida yoziladi.
13. Hech qanday roʻyxatda soxta yoki bot foydalanuvchi yoʻq.

---

## 12. Brend: logo, ilova ikonkasi, bannerlar

### 12.1 Logo tizimi (mavjud belgi saqlanadi va rasmiylashtiriladi)

- **Belgi** — geometrik «IQ» monogrammasi, 100 birlikli setkada. Q ning dumi yoʻl kabi choʻzilgan: «quest» — oldinga yurish.
  - I tayoqchasi: `x8 y21 w16 h58 r3`;
  - halqa: markaz (63, 50), r 21, chiziq 16;
  - dum: (60, 64) → (92, 86), chiziq 15, uchlari yumaloq.
  - ≤32 px uchun kichik variant: halqa 18, dum 13.
  - Rang: indigo gradient #2B2270 → #14121F ustida oltin #FFA726.
  - Miya, stetoskop, xoch, dafna, «rasmiy» muhr, «IQ 150» kabi raqam yoʻq (CONTRACT §6).
- **Boʻsh joy:** har tomondan 8 birlik. Eng kichik oʻlcham: belgi 20 px, gorizontal lokap 96 px eni.
- **Soʻz belgisi:** «IQuest», Space Grotesk 700, tracking −0.02em. «IQ» oltin rangda, «uest» qorongʻi fonda #F4F2FF, yorugʻ fonda #1C1B29. SVG eksportida konturga aylantiriladi.
- **Lokaplar:** gorizontal (belgi + belgi balandligining 0,4 barobari oraliq + soʻz belgisi), vertikal, faqat belgi. Har biri qorongʻi va yorugʻ variantda, yana monoxrom oq va qora.
- **Palitra:** Tun #14121F · Indigo #2B2270 · Oltin #FFA726 · Koʻk #3D5EFF · Binafsha #8552F0 · Qogʻoz #F5F3FF. Naqsh — 12 px nuqtali setka, oq 15% (ilovadagi matritsa tili).
- **Shior** (daʼvosiz, 3 tilda):
  - «Mantiqni mashq qiling»
  - «Тренируйте логику»
  - «Train your logic»

  «IQ oshiradi» va raqamli vaʼda yoʻq.

### 12.2 Ilova ikonkasi

- **Adaptiv ikonka** (mavjud): oldingi qatlamda monogramma 66/108 xavfsiz zonada, orqasida gradient.
- **YANGI — Android 13 mavzuli ikonkasi:**
  - `ic_launcher_monochrome` — shaffof fondagi bir rangli belgi, xuddi shu xavfsiz zonada;
  - `mipmap-anydpi-v26/ic_launcher.xml` va `ic_launcher_round.xml` ga `<monochrome>` qoʻshiladi.
- **YANGI — bildirishnoma ikonkasi** `ic_stat_iquest`: shaffof fondagi oq siluet.
  - mdpi 24, hdpi 36, xhdpi 48, xxhdpi 72, xxxhdpi 96 px;
  - `capacitor.config.json` ga yoziladi (§7.2).
- **Play ikonkasi:** 512×512, 32-bit PNG.
- **Splash:** oʻzgarmaydi (#14121F).
- **PWA ikonkalari:** 192 va 512 (maskable), apple-touch 180, favicon 32.

### 12.3 Aniq oʻlchamlar (px; matnli aktivlarda `_uz`, `_ru` variantlari, v1.2 da `_en`)

| Platforma | Aktivlar |
|---|---|
| **Google Play** | Ikonka 512×512. Feature graphic 1024×500 JPG (alfa kanali yoʻq). **Telefon ekran suratlari 1080×1920** (viewport 360×640 @3), har til uchun 6 ta. `tools/mkplay.mjs` hozir 1170×2532 chiqaradi — bu 2,16:1, Playʼning 2:1 chegarasidan oshadi, shuning uchun **tuzatiladi** |
| **Instagram** | Avatar 1080×1080 (doira ichida xavfsiz, belgi 56%). Post 1080×1080. Portret post 1080×1350. Story va reel muqovasi 1080×1920 (tepa 250 va past 340 px boʻsh). 5 ta highlight muqovasi 1080×1920 (Test, Mashq, Oʻyinlar, Yangiliklar, Yordam), glif markazdagi 420 px doira ichida |
| **Telegram** | Kanal va bot avatari 640×640 (doira ichida xavfsiz). Post rasmi 1280×720. Bot tavsifi rasmi 640×360 |
| **Facebook** | Profil 720×720. Muqova 1640×924: asosiy mazmun markazdagi 1640×624 tasma ichida, yon tomonlardan 160 px chekinib |
| **YouTube** | Profil 800×800. Banner 2560×1440: hamma matn markazdagi 1546×423 xavfsiz zona ichida. Watermark 150×150 PNG (shaffof). Thumbnail qolipi 1280×720 |
| **X** | Profil 400×400. Header 1500×500 (pastki chap 420×200 avatar uchun boʻsh). Post 1600×900 |
| **Veb** | OG 1200×630 JPG (mavjud `mkog`, yangi lokap bilan qayta yasaladi) |

### 12.4 Banner qolipi va halollik

- **Tuzilishi:** toʻq indigo fon, nuqtali naqsh.
  - Chapda soʻz belgisi va shior.
  - Oʻngda mahsulotning **haqiqiy** qismlaridan 3 ta suzuvchi karta:
    1. haqiqiy generator matritsasi (qatʼiy urugʻ);
    2. tanga va nishon medalyoni;
    3. `www/` dan olingan **haqiqiy** ilova ekran surati (Bosh yoki mashq savoli).
- **Taqiqlangan:**
  - liga qalqoni, zinapoya, «reyting», «sertifikat» (PLAY.md: server boʻlmaguncha reklama qilinmaydi, §16-2);
  - chat skrinshotlari (v2 gacha);
  - «rasmiy», «official», Mensa, IQ oshishi va raqamli vaʼdalar;
  - soxta foydalanuvchi soni yoki sharh.
- **Play ekran suratlari:** haqiqiy UI. Reyting tabi skrinshot sifatida ishlatilmaydi.
- **«Kun savoli» post qolipi** (1080×1080 va 1080×1920):
  - `IQ.makeItem(tur, seed(sana), daraja)` dan haqiqiy savol va 4 variant;
  - javob ikkinchi slaydda (`…-answer.png`);
  - halol va cheksiz qayta yasaladigan kontent.

### 12.5 Qayta yasaladigan quvur (repoda)

- **`tools/brand.html`** — yagona manba. Mavjud `tools/icon.html` dan olinadi. Ichida:
  - belgi, soʻz belgisi, naqsh va qurilma ramkasi uchun SVG `<symbol>`lar;
  - `node_modules/@fontsource` dan oflayn `@font-face`;
  - har bir aktiv uchun `<section data-id data-w data-h data-langs>`;
  - URLʼdan `?id=&lang=` oʻqiladi.
- **`tools/mkbrand.mjs`** — Playwright, `mkog` va `mkplay` dagi `loadChromium()` naqshi. U ketma-ket:
  1. `www/` dan yangi ilova ekranlarini oladi (yorugʻ va qorongʻi, 3 til) → `resources/brand/_shots/`;
  2. har bir aktiv va har bir til uchun viewport = w×h, DSF 1, skrinshot oladi. Alfa taqiqlangan joyda JPG (tekislangan) yozadi. Lokaplar PDF da `page.pdf` bilan, shrift ichiga joylanadi;
  3. PNG sarlavhasidan aniq oʻlchamni va taqiqlangan joyda alfa yoʻqligini tekshiradi;
  4. har bir matn tuguni ustidan **halollik linti**ni yuritadi (`tools/honesty.mjs`); topilsa yiqiladi;
  5. `resources/brand/MANIFEST.json` yozadi: fayl, platforma, oʻlcham, til, sha256.
- **Deterministik:** `Date.now` yoʻq, «Kun savoli» sanasi `--date` argumentidan olinadi.
- **Chiqish:** `resources/brand/{logo,play,instagram,telegram,facebook,youtube,x,web}/<id>-<w>x<h>[-<lang>].png|jpg|svg|pdf`.
- **npm skriptlari:**
  - `"brand": "node tools/mkbrand.mjs"`;
  - `"brand:daily": "node tools/mkbrand.mjs --daily --date=YYYY-MM-DD --lang=uz"`;
  - `npm run icons` endi monoxrom qatlam va `ic_stat_iquest` ni ham yozadi.
- Aktivlar `og.jpg` kabi repoga **commit** qilinadi. CI ularni qayta yasamaydi, chunki brauzer kerak.
- README ga «Brend» boʻlimi qoʻshiladi: palitra, boʻsh joy, taqiqlar, buyruqlar.

---

## 13. Ish paketlari

**Qoida:** har fayl bitta paketga tegishli. WP0 CONTRACT §7 ni quyidagi jadvalga moslab **birinchi** yangilaydi.
Main.dc.html ning yagona egasi bor. `src/i18n-en.js` birgalikda egalik qilinmaydi.

### 13.1 Paketlar

| WP | Ega | Fayllar | Nima beradi | Bogʻliqlik | Hajm |
|---|---|---|---|---|---|
| **WP0** | integrator | `src/iq/CONTRACT.md`, `build.mjs`, `package.json`, `version.json`, `src/iq/index.js`, `src/games/index.js`, `src/iq/gen/demo.js`, `src/games/demo.js`, `.github/workflows/js.yml`, `tests/api-surface.test.mjs`, `tests/build.test.mjs` | CONTRACT §12 Profil, §13 Iqtisod, §14 Sozlamalar va eslatmalar, §15 Tillar va darvoza, §16 Navigatsiya darajalari, §17 Glossariy («ball» faqat liga uchun). §2/§9 matn `{uz, ru, en?}` + `langs`. §7 jadvali. Build: skript tartibi, `nzSite.{version, contactReady, playUrl}`, EN darvozasi (§8.4), yangi NEED markerlari, SOCIAL himoyasi. `langsOf()` va `isText` ga `en`. Versiya 1.1.0 / versionCode 2 | — (birinchi) | ≈1 kun |
| **WP1** | device | `src/settings.js`, `src/feedback.js`, `src/notify.js`, `src/bootstrap.js`, `tests/settings.test.mjs`, `tests/feedback.test.mjs`, `tests/notify.test.mjs` | `nzSettings` + migratsiya. 12 ta ovoz va alohida tebranish. `buildPlan` va `apply` (ID 1901–1907, 1911). Bootstrap: `nzSettings` sinxronizatsiyasi, reja qayta tuzish nuqtalari, bosilganda yoʻnaltirish, `soundOn`/`notifOn` oʻrniga `nzSettings` | WP0 | ≈2 kun |
| **WP2** | profile | `src/profile.js`, `src/avatars.js`, `tests/profile.test.mjs`, `tests/avatars.test.mjs` | Tekshiruv, nomaqbul soʻz roʻyxati, rasm quvuri, 16 avatar | WP0 | ≈2,5 kun |
| **WP3** | economy | `src/wallet.js`, `src/badges.js`, `src/league.js`, `src/catalog.js`, `tests/wallet.test.mjs`, `tests/badges.test.mjs`, `tests/league.test.mjs`, `tests/catalog.test.mjs`, `tests/economy-sim.test.mjs` | Hamyon, vazifalar, soat himoyasi, 21 nishon, liga tarixi, katalog, simulyatsiya | WP0 | ≈3 kun |
| **WP4** | score | `src/progress.js`, `tests/progress.test.mjs` | `save()` `soundOn`/`notifOn` ni qayta yozmaydi. `activeToday()` | WP0 | ≈0,5 kun |
| **WP5** | i18n | `src/i18n.js`, `src/i18n-ru.js`, `src/i18n-en.js`, `tools/i18n-extract.mjs`, `tools/honesty.mjs`, `tests/i18n.test.mjs`, `tests/i18n-coverage.test.mjs`, `tests/honesty.test.mjs` | 4 til, `plural`/`nzTN`, til nomlari, `detect()`. Rus tilidagi boʻshliqlar yopiladi. Inglizcha lugʻat. Halollik linti | WP0. Yakuniy tozalash WP7 satrlari muzlatilgach | ≈2 + 1 kun |
| **WP6** | art | `src/icons.js`, `src/art.js`, `tests/icons.test.mjs`, `tests/art.test.mjs` | Glif reyestri (§9.4), 6 qalqon, medalyon, 8 emblema | WP0 | ≈2 kun |
| **WP7** | ui | `src/Main.dc.html`, `src/runtime.js`, `src/shell.css`, `src/shell-admin.css`, `src/admin-*.js`, `tools/source.mjs`, `tools/uishots.mjs` (yangi), `tests/bulk.test.mjs`, `tests/runtime.test.mjs` (yangi) | Hamma ekranlar (U1–U5 quyida) | WP0. Modullar stub bilan | ≈11–12 kun (**kritik yoʻl**) |
| **WP8** | brand | `tools/icon.html`, `tools/brand.html`, `tools/mkbrand.mjs`, `tools/mkicons.mjs`, `tools/mkog.mjs`, `tools/mkplay.mjs`, `resources/**`, `android/**`, `capacitor.config.json`, `site.config.json`, `PLAY.md`, `README.md`, `RASMLAR.md`, `.github/workflows/android.yml` | §12 hammasi. Play skrinshotlari 1080×1920. `ic_stat_iquest` va monoxrom. README xaritasi (§10.7). **CI tekshiruvi:** birlashtirilgan manifestda `READ_MEDIA_IMAGES`, `READ_EXTERNAL_STORAGE`, `CAMERA` yoʻq | WP0, WP5 (`honesty.mjs`). Skrinshotlar WP7 dan keyin | ≈3 kun |
| **WP9** | site | `src/site/**`, `tools/mksite.mjs` | Maxfiylik siyosati: rasm, nom va bio faqat qurilmada, «Maʼlumotlarni oʻchirish» bilan oʻchadi, yangi maʼlumot yigʻilmaydi. Shartlar: «Tanga va nishonlar pul qiymatiga ega emas, sotilmaydi va almashtirilmaydi». `/ru/` huquqiy sahifalari (v1.1). `/en/` (v1.2 uchun majburiy) | WP0 | ≈1,5 + 1 kun |
| **WP10a** | matrix | `src/iq/gen/matrix.js` + testi | `en`, `langs` | WP0 | ≈0,5–1 kun |
| **WP10b** | series | `src/iq/gen/series.js` + testi | `en`, inglizcha koʻplik | WP0 | ≈1 kun |
| **WP10c** | spatial | `src/iq/gen/spatial.js` + testi | `en` | WP0 | ≈0,5 kun |
| **WP10d** | verbal | `src/iq/gen/verbal.js`, `content/verbal.json`, `tests/iq-verbal.test.mjs` | 134 ta moslashtirish, `reviewed_en`, `usable()` ga ixtiyoriy `en` | WP0 | ≈4 kun + tekshiruvchi |
| **WP10e** | games-memory | `src/games/{matrix-memory,sequence,nback}.js` + testlari | `en` | WP0 | ≈1 kun |
| **WP10f** | games-speed | `src/games/{schulte,mental-math,flanker}.js` + testlari | `en` | WP0 | ≈1 kun |
| **WP11** | integrator | `build.mjs` (yakuniy), `version.json`, CONTRACT §7 (yakuniy) | Integratsiya, reliz nomzodi, QA | Hammasi | ≈1,5 kun |

`backend` va `cert` egalari oʻzgarmaydi.

### 13.2 WP7 ichki tartibi (bitta fayl, ketma-ket)

| Bosqich | Nima | Kerak | Hajm |
|---|---|---|---|
| **U1 poydevor** | (a) `runtime.js`: `oninput`/`onchange` atributlari (`el.__input`/`el.__change`), `mount` da delegatsiyalangan `input` va `change` tinglovchilari, `morph` ularni koʻchiradi va **`.value` xususiyatiga hech qachon tegmaydi**; boshqarilmaydigan inputlar (`value` atributi faqat yaratishda ishlaydi, har `input` hodisasi stateʼga koʻchiriladi). (b) Tokenlar, `nzIcons` bogʻlash (`path3`), komponentlar (§9.3). (c) Push-stek, sarlavha, varaq qatlami, toast, `onBack` zanjiri (§2.3). (d) Sozlamalar ekrani va Til/Tema/Vaqt varaqlari; Profildan sozlamalar olib tashlanadi; `soundOn`/`notifOn` → `nzSettings` | WP1 (stub bilan) | 3 kun |
| **U2 identifikatsiya** | Profil, Profilni tahrirlash, Rasm va Rasm koʻrinishi varaqlari, yashirin fayl inputi | WP2 | 2,5 kun |
| **U3 iqtisod UI** | Nishonlar va Nishon varagʻi, Doʻkon va Xarid varagʻi, «Tanga qanday olinadi», bayram navbati, Natija va Oʻyin yakunidagi mukofot qatori; `stats()`, `track()`, `check()`, hafta yopilishi `commit`, `finishRun`, `finishGame` va ilova ochilishiga ulanadi | WP3, WP6 | 2,5 kun |
| **U4 Bosh va birinchi kirish** | Yangi Bosh (H1–H4), `gameOfDay`, «Test qanday oʻtadi» varagʻi, birinchi kirish (yangi, yangilash va qayta koʻrish oqimlari) | WP3, WP6 | 2 kun |
| **U5 sayqal** | Reyting qoʻshimchalari (mukofot qatori, «Oʻtgan hafta», qalqonlar, «Oxirgi haftalar»), Mashq gliflari va «Bugun» pilli, `clearAll` yangi kalitlar bilan, «ball» matnlari tekshiruvi, harakat, 360/390 px × 3 til × 2 tema; **satrlar muzlatiladi** | — | 1,5 kun |

WP7 qoidalari:
- build.mjs `must()` langarlarini oʻzgartirmaydi (`repeat(4,1fr)`, telefon ramkasi, `fullOn` satrlari).
- Yangi markupga Design Canvas uchun `hint-placeholder-*` atributlari qoʻyiladi.

### 13.3 Tartib va kritik yoʻl

```
Kun 1        WP0 (CONTRACT + build skeleti)
Kun 2–4      WP1  WP2  WP3  WP4  WP5  WP6  WP9  WP10a–f  (parallel)   |  WP7-U1
Kun 5–7                                                               |  WP7-U2
Kun 7–9                                                               |  WP7-U3
Kun 10–11    WP8 (brend quvuri; skrinshotlar U5 dan keyin)            |  WP7-U4
Kun 12–13                                                             |  WP7-U5 → satrlar muzlaydi
Kun 13–14    WP5 yakuniy tozalash (ru + en satrlari)  →  WP11 integratsiya + QA  →  v1.1 RC
Keyin        WP10a–f + WP5 en + WP9 /en/  → darvoza yashil → v1.2
```

- **Kritik yoʻl:** WP0 → U1 → U2 → U3 → U4 → U5 → WP5 tozalash → WP11. Taxminan **14 ish kuni**.
- WP1–WP6 (≤3 kun) U1–U3 oynasida tugaydi. WP7 ularni stub bilan kutmasdan boshlaydi.

---

## 14. Test strategiyasi

1. **Modul unit testlari** (`node:test` + `node:vm`, `window`/`localStorage` taqlidi, kiritilgan `now`; mavjud naqsh):
   - **settings:** migratsiya jadvali (`soundOn`/`notifOn` = `null`/`true`/`false`); yangiroq versiya → `readOnly`, ustiga yozilmaydi; buzilgan yozuv → standartlar diskka yoziladi (G5).
   - **profile:**
     - ≥60 ta nom holati (chegaralar, `._`, band soʻzlar, leet orqali nomaqbul soʻz, kirill, tutuq);
     - bio (havola, 80 belgi, yangi qator);
     - canvas stub bilan rasm quvuri: 15 MB rad, 64 000 belgi uchun qayta urinish zinapoyasi, `align` kesishi, `quota`;
     - `save` hammasi yoki hech narsa.
   - **avatars:** `validateItem` darajasidagi SVG xavfsizligi, ≤1,6 KB, viewBox 96, faqat 2 rang.
   - **wallet:**
     - kalit boʻyicha takrorlanmaslik;
     - 04:00 dagi kun almashishi;
     - vazifalar kun boshida qatʼiylanadi;
     - q3 almashish qoidasi (Xatolarim < 3 → tur vazifasi);
     - test javoblari hisoblanmaydi;
     - soat himoyasi;
     - `spend` xatolari va balans ≥ 0;
     - jurnal chegarasi, kalitlarni tozalash, `readOnly`.
   - **badges:**
     - har qoida uchun alohida test;
     - nishon qaytarib olinmaydi;
     - **hech bir qoida `iq` maydonini oʻqimaydi** (test manbani tekshiradi);
     - orqaga qarab hisoblash.
   - **league:** `close` takrorlanmaydi, `best`, 12 hafta chegarasi, yil va oy chegaralari.
   - **catalog:**
     - ID lar noyob;
     - aynan 6 ta bepul rang;
     - pullilar > 0;
     - **WCAG kontrasti hisoblanadi:** `on` rang ranga nisbatan va har ikki gradient toʻxtashiga nisbatan ≥3:1.
   - **economy-sim:** 30 kunlik faol, oddiy va kam oqimlar §6.8 oraliqlarida.
   - **feedback:** `AudioContext` stub. 12 nomning har biri chalinadi, gain ≤0,16, oʻchiq → jim, tebranish alohida.
   - **notify:** `buildPlan` snapshot testlari:
     - bugun faol yoki faol emas;
     - streak 0/1/2;
     - vaqt oʻtgan;
     - vaqt ≥19:30 qoidasi;
     - til;
     - 7 kun davomida kuniga ≤2 ta.
   - **icons:** koordinatalar 1..23 ichida, ≤3 yoʻl, Main ishlatgan har nom reyestrda bor.
   - **art:** SVG xavfsizligi, qalqondagi chevron kontrasti ≥3:1.
   - **progress:** `save()` `soundOn`/`notifOn` ni oʻzgartirmaydi, `activeToday()`.
2. **Shartnoma testlari:**
   - `api-surface`: hujjatdagi har bir `window.nz*` metodi bor.
   - `en` eʼlon qilgan har generator va oʻyin 2 000 urugʻda `validateItem`/`validateView` dan oʻtadi.
   - Savol ID lari tilga bogʻliq emas; `verify` hamma tilda bir xil natija beradi.
   - verbal: har yozuvda `en`, variantlar soni va `correct` bir xil.
3. **i18n testlari:**
   - rus tilida qamrov (hozir), ingliz tilida qamrov (v1.2 darvozasi);
   - koʻplik shakllari;
   - **Raw qoidasi:** `deep()` `usernameRaw: 'Salom'` ni uz-cyrl da ham oʻzgartirmaydi;
   - `honesty` lint: taqiqlangan soʻzlar ru/en lugʻatlarida, verbal `en` da, bildirishnoma matnlarida, katalog va nishon nomlarida, `mkbrand` matnlarida.
4. **Build testlari:**
   - mobil build yangi modullarni toʻgʻri tartibda oʻz ichiga oladi;
   - NEED markerlari: `valsSettings`, `valsShop`, `valsBadges`, `valsProfileEdit`, `valsOnboard`;
   - MONEY_NAMES va FORBIDDEN_CODE hamon oʻtadi;
   - bitta `langs` eʼlonini olib tashlash EN darvozasini yopadi;
   - SOCIAL himoyasi ishlaydi.
5. **UI** (`tools/uishots.mjs`, Playwright, CI da emas):
   - ≈24 ekran va varaq × 3 til (v1.2 da 4) × 2 tema × 360/390 px.
   - **Layout shift tekshiruvi:** qatʼiy elementlarning (sarlavhalar, kartalar, tugma qatorlari, yordam qatorlari, pastki menyu) chegaralari holat oʻzgarishidan oldin va keyin **bir xil** boʻlishi kerak. Tekshiriladigan holatlar:
     - IQ kartasi YANGI / DAVOM / BAJARILGAN;
     - vazifa bajarilishi;
     - notoʻgʻri nom kiritish, bio yozish;
     - xarid qila oladi / qila olmaydi / sotib oldi;
     - eslatma yoqilgan / oʻchirilgan;
     - Profil boʻsh / toʻla.
   - Rus tilida sarlavhalar «…» ga kesilmaydi.
   - **Oqimlar:**
     - birinchi kirish: yangi, yangilash, oʻtkazib yuborish;
     - xarid: yetmaydi → vazifa → sotib olish → qoʻllash;
     - «orqaga» zanjiri.
6. **Qurilmada qoʻlda tekshirish** (Android 10 / 13 / 14 / 15):
   - galereya tanlagichi ruxsat soʻramaydi; HEIC xatosi chiqadi;
   - bildirishnoma ruxsati berilgan va rad etilgan holatlar; ikkala tur ishlaydi; kichik ikonka koʻrinadi;
   - mavzuli ikonka;
   - «orqaga» zanjiri;
   - klaviatura maydonlarni yopmaydi;
   - **maʼlumotli 1.0 dan yangilash:** roʻyxatlar saqlanadi, nishonlar yigʻma kartada chiqadi, tanga ikki marta berilmaydi;
   - «Maʼlumotlarni oʻchirish».

---

## 15. Xatarlar va himoya

| # | Xatar | Himoya |
|---|---|---|
| 1 | Main.dc.html tor boʻgʻiz (4 600 → ≈6 500 qator, bitta ega) | Mantiq modullarda, Main faqat chizadi. U1 1-kundan boshlanadi. Bosqichlar alohida birlashtiriladi |
| 2 | Runtime hozir faqat bosishni biladi, ilovada birorta `<input>` yoʻq | U1 ning birinchi ishi. Boshqarilmaydigan inputlar, pozitsion morph qoidasi (§9.6), `runtime.test.mjs`, uzbek va rus klaviaturasida qurilmada IME tekshiruvi |
| 3 | Klaviatura maydonlarni yopadi (ekran chekkadan chekkaga, Keyboard plagini yoʻq) | «Saqlash» sarlavhada, maydonlar yuqori yarmida, fokusda `scrollIntoView`. Android 15 da muammo qolsa `@capacitor/keyboard` (`resize: body`) qoʻshiladi |
| 4 | `nz-iq-ui` versiyasi oshirilsa roʻyxatlar oʻchadi | Versiya oshirilmaydi. Liga tarixi `nz-league` da. Yangi kalitlar yangiroq versiyada `readOnly` |
| 5 | `localStorage` sigʻimi va rasm hajmi | 64 000 belgi chegarasi va qayta kodlash, alohida kalit, `QuotaExceeded` → xato qatori, yarim holat yoʻq |
| 6 | Play siyosati | Foto: faqat tizim tanlagichi, manifestda CI tekshiruvi. Bildirishnoma: ruxsat faqat niyat bilan, aniq alarm yoʻq, kuniga ≤2. Iqtisod: IAP yoʻq, tasodif yoʻq (IARC «qimor mexanikasi yoʻq» toʻgʻri qoladi). Skrinshotlar 1080×1920 |
| 7 | Ikki valyuta chalkashligi | Birinchi kirishning 3-qadamida bir marta oʻrgatiladi. Rang va glif qatʼiy (binafsha ◆ / oltin ●). Natijada ikkalasi ham belgisi bilan koʻrinadi |
| 8 | Iqtisod muvozanati va oflayn aldov | Simulyatsiya testi, bitta jadval (`nzCatalog`), soat himoyasi. Hamma narsa kosmetik va oflayn. v2 da server hamyoni va 1 500 import chegarasi |
| 9 | Ingliz tili sifati va hajmi (≈950 verbal satr) | Moslashtirish qoidasi, `reviewed_en`, «hammasi yoki hech narsa» darvozasi. Yarim inglizcha build foydalanuvchiga yetmaydi |
| 10 | Foydalanuvchi matnining tarjima yoki transliteratsiya boʻlib ketishi | `…Raw` kalitlar, massivda uzatilmaydi, test |
| 11 | Halollik qoidasining yangi matnda buzilishi | `tools/honesty.mjs` testlarda va `mkbrand` da. Nishonlarda IQ, «daho», «top %» yoʻq. «Ball» faqat liga uchun (glossariy) |
| 12 | Build nomlari toʻqnashuvi | MONEY_NAMES va FORBIDDEN_CODE roʻyxati CONTRACT da, `valsShop`/`buyItem`/`REPORT_KINDS` nomlari |
| 13 | Bildirishnoma ishonchliligi (Doze, OEM batareya tejash) | Noaniq yetkazish qabul qilinadi (CONTRACT da yozilgan). 8+ kun ochilmasa eslatmalar toʻxtaydi, bu spam emas |
| 14 | Backend kelganda nom toʻqnashuvi | UI «bu nom sizniki» demaydi, band qilish oqimi bor. Band va nomaqbul roʻyxatlar hozirdan amal qiladi |
| 15 | Qamrov oʻsib ketishi («va hokazolar») | Yangi funksiya avval navigatsiya daraxtida uy oladi (§0.3). v1.x da ijtimoiy UI qoldigʻi yoʻq, buni build himoyasi tekshiradi |

---

## 16. Egasining qarori kerak

1. **Bildirishnomalar tarixi (inbox) v1.1 da kerakmi?**
   «Bildirishnomani qayergadir kirgazish» soʻzi bu spetsifikatsiyada «eslatma sozlamalari Sozlamalar ichida» deb tushunildi.
   **Standart: yoʻq.** v1.1 da inbox yoʻq, qoʻngʻiroqcha v2 uchun saqlanadi.
   Agar tarix ham kerak boʻlsa, kichik `nzInbox` paketi qoʻshiladi: 50 yozuv, Bosh sarlavhasida qoʻngʻiroqcha, qoʻshimcha ≈2 kun.
2. **Doʻkon matni va bannerlarda mahalliy haftalik liga tilga olinsinmi?**
   PLAY.md hozir liga va reytingni server paydo boʻlguncha reklama qilishni taqiqlaydi.
   **Standart: yoʻq.** Matn va bannerlarda liga, reyting, sertifikat yoʻq. Play skrinshotlari haqiqiy UI, lekin Reyting tabi ishlatilmaydi.
3. **Iqtisod raqamlari:**
   - ranglar 150/300, kolleksiya 300–800;
   - vazifa +10 (kuniga ≤30), hafta 0–100, xush kelibsiz 50.

   **Standart: §6 dagidek.** Hammasi `src/catalog.js` dagi bitta jadvalda, keyin oʻzgartirish oson (daromad hech qachon orqaga qarab kamaytirilmaydi).
4. **Ingliz tili qachon?**
   **Standart: v1.2** — hamma kontent, 134 verbal va `/en/` huquqiy sahifalar tayyor boʻlib, darvoza ochilganda.
   Uni v1.1 ga kiritish relizni verbal moslashtirish va tekshiruv muddatiga (≈4 kun + tekshiruvchi) bogʻlaydi.
5. **Profilda faqat «foydalanuvchi nomi»mi yoki alohida «Ism» ham boʻlsinmi?**
   **Standart: faqat foydalanuvchi nomi** (kamroq maydon, aniqroq). Nom berilmaguncha «Mehmon» koʻrinadi.
