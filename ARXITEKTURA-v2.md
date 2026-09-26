# IQuest v2.0 — Arxitektura (backend: hisob, guruhlar, chat, reyting, duel)

**Holat:** yakuniy loyiha, amalga oshirish uchun. **Sana:** 2026-09-26.
**Asos:** `ARXITEKTURA.md` (v1.1: §0 navigatsiya, §2 navigatsiya modeli, §5
profil, §6 iqtisod, §10 maʼlumot modeli, §11 ijtimoiy eskiz) va
`src/iq/CONTRACT.md` (§6 halollik, §10 server tekshiruvi, §12–§17).
**Egasining talabi (2026-09-26):** oʻqituvchi guruh yaratadi va oʻquvchilarini
qoʻshadi; guruh ichida chat va guruh reytingi; barcha oʻquvchilarning umumiy
reytingi, oʻqituvchilar reytingi, umumiy reyting; har kim boshqalarning
profilini koʻra oladi; chat shaxsiy va guruh chatiga boʻlinadi; foydalanuvchilar
bir-birini duelga chaqiradi, duel turini chaqiruvchi tanlaydi. **Eng muhim
talab — hech kim ilova ichida adashib qolmasin.**
**Ustunlik:** bu hujjat `ARXITEKTURA.md` §2.4 va §11 ni **almashtiradi**
(ular v2 eskizi edi). Qolgan v1.1 qoidalari kuchda. WP-B0 bu hujjatni
CONTRACTʼning yangi §18–§23 boʻlimlariga koʻchiradi; ziddiyat boʻlsa avval
CONTRACT, keyin kod.

---

## 0. Bir ekranda (egasi uchun)

### 0.1 Nima quriladi — 8 qator

1. **Hisob.** Google yoki Telegram orqali kirish. Hisobsiz ham ilova
   v1.1 dagidek toʻliq ishlaydi (test, mashq, oʻyinlar, doʻkon).
2. **Guruhlar.** Faqat oʻqituvchi yaratadi. Oʻquvchilar kod, havola yoki QR
   orqali qoʻshiladi, oʻqituvchi tasdiqlaydi. Guruh ichida: **Chat · Reyting ·
   Aʼzolar**.
3. **Suhbatlar** — yangi 5-tab. Ikki boʻlim: **Guruhlar** va **Shaxsiy**.
4. **Reyting** tabi uch boʻlimli: **Liga** (men va doʻstlarim) · **Umumiy**
   (hamma / faqat oʻquvchilar, hudud va davr boʻyicha) · **Oʻqituvchilar**
   (oʻquvchilari eng faol oʻqituvchilar).
5. **Ommaviy profil** — istalgan ism yoki reyting qatoriga bosilganda
   ochiladi: avatar, nom, liga, vitrina, statistika, duel hisobi.
6. **Duel** — ikki kishi bir xil savollarni (yoki bir xil oʻyinni) yechadi,
   natijani server tekshiradi. Turini chaqiruvchi tanlaydi. Uyi — **Mashq →
   Duellar**.
7. **Bildirishnomalar** — Bosh sarlavhasidagi qoʻngʻiroqcha (inbox) va
   telefon push xabarlari.
8. **Xavfsizlik.** Shikoyat, bloklash, soʻz filtri, moderatorlar paneli.
   Voyaga yetgan odam voyaga yetmagan bilan **shaxsiy yozisha olmaydi**:
   oʻqituvchi oʻquvchilari bilan faqat guruh chatida gaplashadi.

### 0.2 Yetti qoida (hamma qaror shulardan chiqadi)

1. **Har narsaning bitta uyi bor** (v1.1 §0.3). Yangi narsa avval shu
   hujjatning navigatsiya daraxtida uy oladi, keyin quriladi.
2. **Oflayn birinchi.** Hisobsiz va internetsiz hamma v1.1 funksiyasi ishlaydi.
   Serverga bogʻliq narsa internet boʻlmasa oxirgi saqlangan holatda, «Internet
   yoʻq» qatori bilan koʻrinadi.
3. **Reyting faqat server tekshirgan natijadan.** Mijoz yuborgan raqamga
   ishonilmaydi: server savollarni aynan oʻsha kod bilan qayta yaratadi yoki
   oʻyinni qayta oʻynaydi (CONTRACT §10).
4. **Reyting — ball (◆) boʻyicha, IQ boʻyicha emas.** Hech qayerda persentil,
   «X % dan aqlliroq», «eng aqlli» yoʻq (CONTRACT §6).
5. **Bolalar xavfsizligi dizaynda.** Kattalar va voyaga yetmaganlar orasida
   shaxsiy yozishma va doʻstlik yoʻq. Rasm yuklash yoʻq. Havola va telefon
   raqami chatda oʻtmaydi.
6. **Pul yoʻq, tasodif yoʻq, oʻtkazma yoʻq.** Duel tanga bermaydi. Tanga va
   narsani boshqa odamga oʻtkazib boʻlmaydi.
7. **Server oʻchirgichi.** Har bir ijtimoiy funksiya (chat, DM, duel, guruh)
   serverdagi bayroq bilan masofadan oʻchiriladi. Oʻchsa, u ilovada
   **umuman koʻrinmaydi** (v1.1 qoidasi: oʻchiq tugma, «tez kunda» yoʻq).

### 0.3 Navigatsiya daraxti (v2)

```
PASTKI MENYU — 5 tab: Bosh · Mashq · Reyting · Suhbatlar · Profil
│
├─ BOSH
│   ├─ [avatar + nom] ............... → Profil tab
│   ├─ olov 7 · [● 120] → Doʻkon · [qoʻngʻiroqcha•] → BILDIRISHNOMALAR (L1)
│   ├─ Liga kartasi ................. → Reyting tab (Liga)
│   ├─ IQ test kartasi .............. → Savol → Natija
│   └─ Kunlik vazifalar (3 qator) ... (v1.1 dagidek)
│
├─ MASHQ
│   ├─ [Duellar  •2] qatori ......... → DUELLAR (L1)
│   │     ├─ «+» ..................... → DUEL YARATISH (L1)
│   │     └─ duel qatori ............. → DUEL (L1) → [Oʻynash] → Savol/Oʻyin → DUEL (natija)
│   ├─ Savol turlari ×4 · Xatolarim · Saqlangan · IQ oʻyinlari ×6 (v1.1)
│
├─ REYTING   segment: Liga | Umumiy | Oʻqituvchilar
│   ├─ Liga: liga kartasi, zinapoya, rekordlar, oxirgi haftalar, «Doʻstlar bu hafta»
│   ├─ Umumiy: [Bu hafta▾] [Oʻzbekiston▾] [Hammasi▾] → 100 qator + «Siz» qatori
│   ├─ Oʻqituvchilar: [Bu hafta▾] [Oʻzbekiston▾] → 100 qator
│   └─ har qator .................... → OMMAVIY PROFIL (L1)
│
├─ SUHBATLAR   segment: Guruhlar | Shaxsiy          sarlavhada: qidiruv · «+»
│   ├─ Guruhlar: guruh qatorlari .... → GURUH (L1)  segment: Chat | Reyting | Aʼzolar
│   │     ├─ (oʻqituvchi) tishli gʻildirak → GURUH SOZLAMALARI (L1)
│   │     ├─ Aʼzolar → oʻquvchi qatori → Oʻquvchi kartasi (varaq) / OMMAVIY PROFIL
│   │     └─ (oʻquvchi) «⋯» → Guruh haqida · Shikoyat · Guruhdan chiqish
│   ├─ Shaxsiy: [Doʻstlar · 12 ›] → DOʻSTLAR (L1: Doʻstlar | Soʻrovlar)
│   │           suhbat qatorlari .... → SUHBAT (L1)
│   ├─ qidiruv ...................... → FOYDALANUVCHI QIDIRISH (L1)
│   └─ «+» varagʻi: Guruhga qoʻshilish · Doʻst qoʻshish · Guruh yaratish (faqat oʻqituvchi)
│
└─ PROFIL
    ├─ tishli gʻildirak → SOZLAMALAR
    │     + «Hisob» boʻlimi: Hisob · Maxfiylik › · Bloklanganlar › · Chiqish · Hisobni oʻchirish
    │     + «Bildirishnomalar»ga: Xabarlar · Duellar · Guruh eʼlonlari · Doʻstlik soʻrovlari
    ├─ (mehmon) «Hisobga kiring» kartasi → KIRISH oqimi
    ├─ [Profilni tahrirlash] · Nishonlar · Doʻkon · Testlar tarixi · Savol turlari (v1.1)
    └─ «Boshqalarga qanday koʻrinadi» → OMMAVIY PROFIL (oʻzimniki, koʻrish rejimi)

KIRISH OQIMI (toʻliq ekran, bir marta): Kirish usuli → Yosh → Siz kimsiz →
  Foydalanuvchi nomi → Hudud → Qoidalar → Qurilmadagi natijalarni koʻchirish
```

### 0.4 Nima qayerda — har narsaning bitta uyi

| Narsa | Uyi | Boshqa kirish nuqtalari (faqat havola) |
|---|---|---|
| Hisobga kirish / chiqish | Sozlamalar → Hisob | Profildagi «Hisobga kiring» kartasi, Suhbatlar va Reytingdagi kirish kartasi, guruh havolasi |
| Maxfiylik sozlamalari | Sozlamalar → Hisob → Maxfiylik | — |
| Bloklanganlar roʻyxati | Sozlamalar → Hisob → Bloklanganlar | Ommaviy profil «⋯ → Bloklash» (faqat amal) |
| Guruhlar roʻyxati | Suhbatlar → Guruhlar | Bildirishnoma (taklif, tasdiq) |
| Guruh chati, guruh reytingi, aʼzolar | Guruh ekrani (3 segment) | — |
| Guruh sozlamalari, taklif kodi, soʻrovlar | Guruh → tishli gʻildirak (oʻqituvchi) | Bildirishnoma «Qoʻshilish soʻrovi» |
| Oʻquvchi faolligi (oʻqituvchi paneli) | Guruh → Aʼzolar → Oʻquvchi kartasi | — |
| Shaxsiy suhbatlar | Suhbatlar → Shaxsiy | Ommaviy profil [Xabar yozish] |
| Doʻstlar va soʻrovlar | Suhbatlar → Shaxsiy → Doʻstlar | Bildirishnoma, ommaviy profil [Doʻst qoʻshish] |
| Foydalanuvchi qidirish | Suhbatlar → qidiruv belgisi | — |
| Duellar (kutilayotgan, faol, tarix) | Mashq → Duellar | Bildirishnoma, ommaviy profil [Duelga chaqirish], guruh aʼzosi kartasi, suhbat «⋯» |
| Mening haftalik ligam | Reyting → Liga | Bosh → liga kartasi |
| Umumiy va oʻqituvchilar reytingi | Reyting → Umumiy / Oʻqituvchilar | — |
| Guruh reytingi | Guruh → Reyting | — |
| Oʻz profilim (tahrirlash) | Profil tab | Bosh → avatar |
| Boshqalarning profili | Ommaviy profil (L1) | Reyting qatori, guruh aʼzosi, suhbat sarlavhasi, duel |
| Bildirishnomalar tarixi | Bosh → qoʻngʻiroqcha | Push xabarga bosish |
| Bildirishnoma sozlamalari | Sozlamalar → Bildirishnomalar | — |
| Shikoyat qilish | Har obyektning «⋯» menyusi (profil, xabar, guruh) | — |
| Oʻqituvchini tasdiqlash soʻrovi | Sozlamalar → Hisob → «Oʻqituvchi maqomi» | Guruh sozlamalaridagi limit qatori |
| Hisobni oʻchirish | Sozlamalar → Hisob → Hisobni oʻchirish | Sayt: iquest.uz/hisobni-ochirish/ |

**Oʻrganiladigan qoida (foydalanuvchi uchun bitta jumla):** «Oʻynash — Mashqda,
solishtirish — Reytingda, gaplashish — Suhbatlarda, oʻzim — Profilda».
Duel oʻyin boʻlgani uchun Mashqda; guruh gaplashish joyi boʻlgani uchun
Suhbatlarda; guruh reytingi guruhning oʻzida (u guruh aʼzolari uchun).

### 0.5 Rollar va huquqlar

**Rollar:**
- **Mehmon** — hisobsiz foydalanuvchi (v1.1 holati).
- **Oʻquvchi (13–17)** — voyaga yetmagan hisob. Hisob turi «Oʻquvchi» yoki
  «Boshqa» boʻlishidan qatʼi nazar, yoshi 13–17 boʻlsa shu qoidalar.
- **Foydalanuvchi (18+)** — voyaga yetgan «Oʻquvchi» (talaba) yoki «Boshqa».
- **Oʻqituvchi** — 18+, hisob turi «Oʻqituvchi». Tasdiqlangan (✓) yoki tasdiqlanmagan.
- **Guruh admini** — oʻqituvchi guruhiga yordamchi qilib tayinlagan boshqa oʻqituvchi.
- **Moderator** — IQuest xodimi (`profiles.role = moderator | owner`), faqat admin panel orqali.

| Amal | Mehmon | Oʻquvchi 13–17 | Foydalanuvchi 18+ | Oʻqituvchi | Guruh admini | Moderator |
|---|---|---|---|---|---|---|
| v1.1 funksiyalari (oflayn) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Reytinglarni koʻrish | faqat Liga (mahalliy) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Umumiy reytingda qatnashish | ✗ | ✓ (oʻchirsa boʻladi) | ✓ (oʻchirsa boʻladi) | ✓ | ✓ | ✗ (xodim hisobi chiqmaydi) |
| Oʻqituvchilar reytingida qatnashish | ✗ | ✗ | ✗ | faqat ✓ tasdiqlangan | faqat ✓ | ✗ |
| Ommaviy profilni koʻrish | ✗ | ✓ | ✓ (13–17 niki qisqa) | ✓ (13–17 niki qisqa; oʻz guruhidagi toʻliq) | shu | ✓ toʻliq |
| Doʻst qoʻshish | ✗ | faqat 13–17 bilan | faqat 18+ bilan | faqat 18+ bilan | shu | — |
| Shaxsiy xabar (DM) | ✗ | faqat 13–17 doʻst bilan | faqat 18+ doʻst bilan | faqat 18+ doʻst bilan; **oʻquvchi bilan ✗** | shu | ✗ (faqat shikoyat konteksti) |
| Guruh yaratish | ✗ | ✗ | ✗ | ✓ (3 ta; ✓ bilan 20 ta) | ✗ | — |
| Guruhga qoʻshilish | ✗ | kod/taklif bilan | kod/taklif bilan | kod/taklif bilan | — | — |
| Guruh chatida yozish | ✗ | ✓ (chat rejimi «Hamma» boʻlsa) | ✓ (shu) | ✓ doim | ✓ doim | ✗ |
| Xabarni oʻchirish | — | oʻzinikini, 24 soat ichida | shu | oʻz guruhida hammasini | oʻz guruhida hammasini | hamma joyda yashiradi |
| Soʻrovni tasdiqlash, aʼzoni chiqarish, ovozsiz qilish | — | ✗ | ✗ | ✓ | ✓ (egani emas) | platforma banni |
| Kodni yangilash, chat rejimi, sekin rejim | — | ✗ | ✗ | ✓ | ✓ | — |
| Guruhni arxivlash, egalikni oʻtkazish, admin tayinlash | — | ✗ | ✗ | ✓ | ✗ | ✓ |
| Oʻquvchi kartasi (faollik) | — | faqat oʻzinikini | — | oʻz guruhi aʼzolarini | oʻz guruhi aʼzolarini | shikoyat boʻyicha |
| Boshqaning IQ natijasini koʻrish | ✗ | ✗ | 18+ doʻst oʻzi yoqsa | 18+ doʻst oʻzi yoqsa; **oʻquvchiniki ✗** | shu | ✗ |
| Duelga chaqirish | ✗ | doʻst va guruhdosh | doʻst va guruhdosh | guruhdosh va doʻst | shu | — |
| Shikoyat, bloklash | ✗ | ✓ | ✓ | ✓ | ✓ | koʻrib chiqadi |
| Ban, kontentni yashirish, oʻqituvchini tasdiqlash | — | — | — | — | — | ✓ (jurnal bilan) |
| DM mazmunini oʻqish | — | — | — | — | — | faqat shikoyat qilingan xabar ±10 ta kontekst, har ochilish jurnalga yoziladi |

### 0.6 Nima qachon chiqadi

| Versiya | Ichida |
|---|---|
| **v2.0-alpha** (ichki test) | Hisob, kirish oqimi, natijalarni server tekshiruvi, server ligasi, Umumiy va Oʻqituvchilar reytingi, ommaviy profil, server hamyoni, hisobni oʻchirish |
| **v2.0-beta** (Play yopiq testi, 2–3 maktab) | Guruhlar (chat, reyting, aʼzolar, oʻqituvchi paneli), doʻstlar, shaxsiy chat, duel (3 tur), bildirishnomalar va push, shikoyat/bloklash, moderatsiya paneli |
| **v2.0** (ommaviy) | Beta 2 hafta P0 muammosiz oʻtgach; Data safety va IARC yangilangan |
| **v2.1** | «3 raund» duel, jonli duel, guruh **Vazifasi** (oʻqituvchi bir xil savollar toʻplamini muddat bilan beradi), reaksiyalar, sinf filtri, moderatsiyadan oʻtgan rasm avatar, maʼlumotni yuklab olish |
| **v2.2** | Maktablar reytingi, turnirlar, sertifikat (`src/cert/**`) |

---

## 1. Asosiy qarorlar (qisqa roʻyxat)

1. **5 tab:** Bosh · Mashq · Reyting · **Suhbatlar** · Profil. v1.1 dagi «Doʻstlar»
   nomi «Suhbatlar» ga almashadi: tabning asosiy mazmuni — guruh va shaxsiy
   chatlar; doʻstlar roʻyxati uning ichida.
2. **Duel uyi — Mashq**, chat emas. Duel — oʻynash. Chaqiruv suhbat, profil yoki
   guruhdan ham boshlanadi, lekin roʻyxat va natija faqat Mashq → Duellar da.
3. **Guruhni faqat oʻqituvchi (18+) yaratadi.** Har guruhning javobgar kattasi
   bor. Oʻquvchilar oʻz guruhini ochmaydi (v2.0).
4. **Voyaga yetgan ↔ voyaga yetmagan: doʻstlik ham, DM ham yoʻq.** Oʻqituvchi
   oʻquvchi bilan faqat guruh chatida (hamma koʻradigan joyda) gaplashadi.
5. **13 yoshdan kichiklarga hisob yoʻq.** Ular ilovadan mehmon sifatida
   (oflayn) foydalanadi. Play maqsadli auditoriyasi: 13+ (Families emas).
6. **Kirish: Google va Telegram.** SMS yoʻq (narx, SIM kartasiz bolalar).
   Parol yoʻq.
7. **Reyting metrikasi — tekshirilgan ball (◆).** IQ boʻyicha reyting yoʻq.
   IQ natijasi boshqa odamga faqat 18+ doʻstga va egasi yoqsa koʻrinadi.
8. **Oʻqituvchilar reytingi = oʻquvchilar faolligi**, oʻqituvchining oʻz oʻyini
   emas: tasdiqlangan oʻqituvchining eng faol 30 oʻquvchisi haftalik balli
   yigʻindisi, har oʻquvchi 2 500 bilan chegaralangan.
9. **Duel savollari serverda yashirin urugʻdan yaratiladi** va toʻgʻri javobsiz
   yuboriladi; oʻyin duelida urugʻ ochiq, server jurnalni qayta oʻynaydi.
10. **Duel tanga bermaydi.** Ball oddiy oʻyindagidek (+10 toʻgʻri javob /
    oʻyin balli) va gʻalaba uchun +20 ball (kuniga ≤ 5, bir raqib bilan kuniga 1).
11. **Asinxron duel:** qabul qilingach ikkalasi 24 soat ichida istagan paytida
    oʻynaydi. Birinchi oʻynaganning natijasi ikkinchisi tugatmaguncha yashirin.
12. **Server hamyoni** (v1.1 §6.10): sarflash va egalik serverda; kirimlar
    kalit boʻyicha va halol maksimum bilan chegaralangan holda qabul qilinadi.
13. **Yozish faqat RPC yoki Edge Function orqali.** Jadvallarga toʻgʻridan-toʻgʻri
    INSERT/UPDATE siyosati yoʻq (oʻqish RLS bilan). Qoidalar bir joyda.
14. **Soʻz filtri bitta:** `src/profile.js` ildizlari va normallashtirish
    Edge Functionʼda aynan shu fayl bilan ishlaydi.
15. **Rasm yuklash v2.0 da yoʻq.** Ommaviy avatar — 16 ta tayyor avatar yoki
    bosh harf. Oʻz rasmi qurilmada qoladi (v1.1 dagidek).
16. **Realtime SDKʼsiz**: oʻz kichik WebSocket mijozimiz (`src/realtime.js`),
    faqat yopiq (private) kanallar, DB trigger yuboradi, mijoz yubormaydi.
17. **Push FCM orqali**, xabar matni push ichida koʻrsatilmaydi. 13–17 yoshga
    22:00–07:00 oraligʻida push yoʻq.
18. **Supabase Pro**, yangi alohida loyiha (Nazariy bazasiga hech qachon
    yozilmaydi — `supabase/config.json` izohi). Hudud va qonun talabi — §12.4.

---

## 2. Navigatsiya modeli v2

### 2.1 Ekran darajalari (v1.1 §2.1 ga qoʻshimcha)

| Daraja | v2 da qoʻshiladi |
|---|---|
| **L0 — Tab** | Suhbatlar (4-oʻrin). Tab soni 5: `repeat(5,1fr)` (build langari WP-B0 bilan birga oʻzgaradi). Server bayrogʻi `social` oʻchiq boʻlsa — 4 tab, v1.1 holati |
| **L1 — Ichki ekran** | Bildirishnomalar, Duellar, Duel yaratish, Duel, Guruh, Guruh sozlamalari, Guruh yaratish, Suhbat, Doʻstlar, Foydalanuvchi qidirish, Ommaviy profil, Maxfiylik, Bloklanganlar, Soʻrovlar (guruh) |
| **Toʻliq ekranli oqim** | Kirish oqimi (7 qadam), Duel oʻyini (mavjud Savol va Oʻyin ekranlari `duel` rejimida) |
| **Varaq** | `signin` 360 · `joinGroup` 340 · `invite` 520 · `plusMenu` 260 · `report` 480 · `msgActions` 260 · `memberCard` 560 · `pickOpponent` 560 · `pickGame` 520 · `rankPeriod` 260 · `rankRegion` 560 · `rankWho` 220 · `groupAbout` 420 · `duelRules` 380 (px, qatʼiy) |
| **Dialog** | `leaveGroup`, `removeMember`, `blockUser`, `archiveGroup`, `deleteAccount`, `signOut`, `declineDuel`, `cancelDuel` |

### 2.2 Stek qoidasi (v1.1 dagi «ichma-ichlik ≤ 1» kengayadi)

- Push-stek chuqurligi **≤ 3** (masalan: Guruh → Ommaviy profil → Suhbat).
- Stekda allaqachon bor ekranni ochish yangi nusxa qoʻshmaydi — stek oʻsha
  ekrangacha qisqaradi (profil → suhbat → profil aylanasi yoʻq).
- 4-ekran kerak boʻlsa, eng pastki ekran olib tashlanadi (orqaga bosganda
  tab ochiladi). Foydalanuvchi uchun natija: «Orqaga» ≤ 3 marta bosilganda
  doim tabga qaytadi.
- Tabga bosish stekni tozalaydi va oʻsha tabni ochadi.
- Savol yoki oʻyin (duel ham) boshlanganda stek tozalanmaydi, **saqlanadi**:
  duel tugagach foydalanuvchi Duel ekraniga qaytadi (v1.1 dan farq; faqat
  duel oqimi uchun: `returnTo: 'duel'`).

### 2.3 Mainʼdagi yangi holat

```js
stack:   [{ name: 'inbox'|'duels'|'duelNew'|'duel'|'group'|'groupSettings'|'groupNew'|
                   'groupRequests'|'chat'|'friends'|'search'|'profileView'|'privacy'|'blocked',
            params? }],                      // ≤ 3
social:  { on, account, unread: { inbox, chats, duels }, offline },   // nzAccount/nzInbox nusxasi
rank:    { seg: 'league'|'all'|'teachers', period: 'week'|'month'|'all', region: 0..15, who: 'all'|'students' },
chats:   { seg: 'groups'|'dm' },
draft:   { [chatId]: '…' },                  // yuborilmagan xabar (faqat xotirada)
```

`tabsOn` formulasi oʻzgarmaydi (`!stack.length` allaqachon bor). Duel oʻyini
`run.duel = { id, returnTo }` bilan belgilanadi.

### 2.4 «Orqaga» zanjiri (v1.1 §2.3 ga qoʻshimcha)

1–8 oʻzgarmaydi (dialog → varaq → bayram → birinchi kirish → Izoh → oʻyin →
test/mashq tasdigʻi → natija). **Kirish oqimi** 4-bandda birinchi kirish bilan
bir xil ishlaydi (oldingi qadam; 0-qadamda oqimdan chiqish, hisob yaratilmaydi).
**Duel oʻyini** 6–7-bandda: chiqish tasdigʻi «Duelni tark etasizmi? Javob
berilmagan savollar xato hisoblanadi» [Chiqish]/[Davom etish]. Keyin 9 — push-stek
(Suhbatda yozilgan qoralama bor boʻlsa u `draft` da saqlanadi, dialog yoʻq),
10 — tab ≠ Bosh → Bosh, 11 — `false`.

### 2.5 Belgilar (badge) — qayerda nima sanaladi

| Belgi | Joyi | Nimani sanaydi |
|---|---|---|
| Qizil nuqta 8 px | Bosh → qoʻngʻiroqcha | Oʻqilmagan bildirishnoma bor |
| Son (1–99, keyin «99+») | Suhbatlar tab ikonkasida | Oʻqilmagan suhbatlar soni (xabarlar emas) |
| Son | Mashq tab ikonkasida va Mashq → Duellar qatorida | Sizning navbatingizdagi duellar (qabul qilish yoki oʻynash) |
| Son | Suhbatlar → Shaxsiy → «Doʻstlar» qatorida | Kiruvchi doʻstlik soʻrovlari |
| Son | Guruh → tishli gʻildirak (oʻqituvchi) | Kutilayotgan qoʻshilish soʻrovlari |

Bitta fakt bitta joyda sanaladi: duel chaqiruvi bildirishnomasi oʻqilganda
Mashq belgisi yoʻqolmaydi — u duel qabul qilinmaguncha qoladi (u vazifa, xabar
emas).

### 2.6 Chuqur havolalar (deep links)

| Havola | Nima ochadi |
|---|---|
| `https://iquest.uz/g/K7PQ2M` | Android App Links → ilova → `joinGroup` varagʻi (kod toʻldirilgan). Hisob yoʻq boʻlsa avval kirish oqimi. Ilova yoʻq boʻlsa sayt sahifasi: guruh nomi va [Google Playʼdan yuklash] |
| Push `extra: { to: 'chat', id }` | Suhbat (Guruh yoki DM) |
| Push `extra: { to: 'duel', id }` | Duel |
| Push `extra: { to: 'inbox' }` | Bildirishnomalar |
| Push `extra: { to: 'groupRequests', id }` | Guruh → Soʻrovlar |

`app.openFrom(to, id)` (v1.1 bootstrap) kengayadi. Savol yoki oʻyin ketayotgan
boʻlsa hech narsa almashmaydi — havola `pendingOpen` ga yoziladi va natija
ekranidan keyin ochiladi. Foydalanuvchi profiliga ochiq havola (`/u/…`) v2.0 da
**yoʻq** (voyaga yetmaganlarni tashqaridan topish yoʻli boʻlmasin).

### 2.7 Server bayroqlari va koʻrinish

`app_config` jadvalidagi bayroqlar: `social`, `groups`, `dm`, `duels`, `push`,
`rank_public`, `min_version_code`. Ilova ularni ochilishda oladi va
`nz-social-cfg` da saqlaydi (oflayn — oxirgi qiymat; hech qachon olinmagan
boʻlsa — hammasi oʻchiq).

| Holat | UI |
|---|---|
| Build `SOCIAL_ON=false` yoki `supabase/config.json` boʻsh | v1.1: 4 tab, ijtimoiy nom ham, matn ham bundleʼda yoʻq (mavjud build himoyasi) |
| `social=false` (server) | 4 tab, Reytingda faqat Liga, Mashqda Duellar qatori yoʻq, qoʻngʻiroqcha yoʻq |
| `dm=false` | Shaxsiy segment va [Xabar yozish] tugmasi yoʻq; guruhlar ishlaydi |
| `duels=false` | Duellar qatori va [Duelga chaqirish] yoʻq |
| `groups=false` | Guruhlar segmenti yoʻq; Suhbatlar faqat Shaxsiy |
| Mehmon | Suhbatlar tabi bor: boʻsh holat «Guruhlar, chat va duellar uchun hisob kerak» + [Kirish]. Reyting → Umumiy/Oʻqituvchilar: kirish kartasi. Qoʻngʻiroqcha yoʻq |
| Hisob bor, internet yoʻq | Oxirgi saqlangan roʻyxatlar; ekran tepasida doim ajratilgan 32 px joyda «Internet yoʻq — oxirgi maʼlumot» qatori (internet boʻlsa joy `visibility:hidden`, layout shift yoʻq) |
| `min_version_code` > joriy | Ijtimoiy ekranlar oʻrnida «Yangilash kerak» kartasi va [Yangilash] → Play. Oflayn funksiyalar ishlayveradi |

---

## 3. Hisob va kirish

### 3.1 Kirish usullari

| Usul | Qanday | Nima uchun |
|---|---|---|
| **Google** (asosiy) | Android Credential Manager orqali Google ID token (`@capacitor-firebase/authentication`, faqat Google provayderi, `skipNativeAuth: true`) → Supabase `POST /auth/v1/token?grant_type=id_token` (`provider: google`, `nonce`) | Har Android telefonda Google hisobi bor, bir bosish, bepul |
| **Telegram** (ikkinchi) | Ilova `https://t.me/<bot>?start=login_<nonce>` ni ochadi → bot (`tg-bot` Edge Function webhook) /start ni oladi, «Tasdiqlash» tugmasini koʻrsatadi → bosilgach `login_nonces` da nonce ↔ tg_id bogʻlanadi → ilova `auth-telegram` ni har 2 s (≤ 120 s) soʻraydi va sessiya oladi | Oʻzbekistonda eng koʻp ishlatiladigan messenjer; `profiles.tg_id` allaqachon bor |
| **Veb** (sayt, hisobni oʻchirish sahifasi) | Supabase OAuth (Google) redirect; Telegram Login Widget | — |

- **SMS yoʻq** (har SMS pul turadi, koʻp oʻquvchida SIM yoʻq), **parol yoʻq**.
- `auth-telegram`: nonce 128-bit, 5 daqiqa yashaydi, bir marta ishlatiladi.
  Foydalanuvchi `auth.admin.createUser({ email: 'tg<ID>@tg.iquest.uz',
  email_confirm: true })` bilan yaratiladi (email ichki, hech qachon
  koʻrsatilmaydi va xat yuborilmaydi), sessiya `generateLink('magiclink')` →
  `verifyOtp` orqali beriladi. `tg_id` faqat bot tasdiqlagan qiymatdan yoziladi
  (0003_guard dagi qoida: meta-maʼlumotdan emas).
- **Hisoblarni bogʻlash:** bir hisobga Google va Telegram ikkalasi ulanishi
  mumkin (Sozlamalar → Hisob → «Kirish usullari»). Ikkinchi usul boshqa mavjud
  hisobga tegishli boʻlsa — «Bu Telegram boshqa hisobga ulangan» xatosi,
  birlashtirish yoʻq (v2.0).
- **Sessiya** `nz-auth` kalitida (`access_token`, `refresh_token`,
  `expires_at`); `nzApi` muddatidan 60 s oldin yangilaydi. Refresh xatosi
  (401) → hisob «chiqilgan» holatga oʻtadi, mahalliy maʼlumot saqlanadi.

### 3.2 Kirish oqimi (toʻliq ekran, v1.1 §4.2 qolipi)

Qolip v1.1 birinchi kirish bilan bir xil (44 px tepa, 280 px rasm qutisi,
sarlavha 28/800, ≤ 2 qator, 76 px pastki panel). «Oʻtkazib yuborish» yoʻq —
har qadam hisob uchun majburiy, lekin tepadagi ✕ oqimdan chiqaradi (hisob
yaratilmaydi, Google/Telegram sessiyasi bekor qilinadi).

| # | Sarlavha | Tarkibi | Tugma | Qoida |
|---|---|---|---|---|
| K0 | Hisobga kirish | 2 ta 56 px tugma: [Google bilan kirish], [Telegram bilan kirish]. Ostida 13/600: «Kirish bilan Foydalanish shartlari va Maxfiylik siyosatiga rozilik bildirasiz» (havolalar) | — | Mavjud hisob boʻlsa (oldin oʻtgan) → K6 yoki darhol Bosh |
| K1 | Yoshingiz | Ikki 52 px tanlagich: **Tugʻilgan yil** (joriy yil − 100 … joriy yil) va **oy** (1–12). Oldindan tanlangan qiymat **yoʻq** (neytral yosh soʻrovi) | [Davom etish] (ikkalasi tanlanguncha xira) | < 13 → «Hisob 13 yoshdan. Ilovadan hisobsiz foydalanishingiz mumkin» + [Tushunarli] → hisob **yaratilmaydi**, auth foydalanuvchi oʻchiriladi, qurilmaga 24 soatlik `nz-age-lock` yoziladi (qayta urinish shu vaqtgacha shu ekranni koʻrsatadi). Yosh keyin oʻzgartirilmaydi (faqat qoʻllab-quvvatlash orqali) |
| K2 | Siz kimsiz? | 3 ta 64 px radio: «Oʻquvchi» (maktab, litsey, talaba), «Oʻqituvchi», «Boshqa» | [Davom etish] | 18 yoshdan kichikda «Oʻqituvchi» xira, ostida «18 yoshdan» |
| K3 | Foydalanuvchi nomi | 52 px input, v1.1 qoidalari (`validateUsername`), mahalliy nom oldindan qoʻyilgan. 18 px qator: xato yoki «✓ Boʻsh» (serverdan, 400 ms debounce). Band boʻlsa 3 ta taklif chipi: `ali_2026`, `ali.iq`, `ali7` | [Davom etish] | Nomsiz hisob yoʻq (ommaviy profil uchun kerak). Nom serverda `claim_username` bilan atomar band qilinadi |
| K4 | Hududingiz | 15 qatorli roʻyxat (Toshkent sh., Toshkent vil., Andijon, Buxoro, Fargʻona, Jizzax, Xorazm, Namangan, Navoiy, Qashqadaryo, Qoraqalpogʻiston, Samarqand, Sirdaryo, Surxondaryo, Boshqa davlat) | [Davom etish] · «Koʻrsatmaslik» | Faqat reyting filtri uchun. 30 kunda bir marta oʻzgaradi |
| K5 | Qoidalar | 4 ta ikonkali qator: «Hurmat bilan yozing — haqorat, tahdid va behayo gap taqiqlangan», «Telefon raqami, manzil va havola yozilmaydi», «Yomon xabarni «Shikoyat» bilan yuboring — 24 soatda koʻramiz», «Qoidani buzgan hisob bloklanadi». Havola: «Foydalanish shartlari» | [Qabul qilaman] | `terms_version` yoziladi. Shartlar versiyasi oshsa, keyingi ijtimoiy amaldan oldin shu qadam qayta chiqadi |
| K6 | Natijalarni koʻchirish | Faqat qurilmada v1.1 maʼlumoti boʻlsa: «Bu qurilmadagi nishonlar, tangalar (1 500 gacha) va xaridlar hisobingizga oʻtadi. Ball va reyting hisobdan keyingi natijalardan boshlanadi.» | [Koʻchirish] · «Keyinroq» (Sozlamalar → Hisob da qoladi) | §14. Hisobga bir marta, bitta qurilmadan |

Oqim oxiri: Bosh, toast «Xush kelibsiz, @nom». Oqim oʻrtada oʻldirilsa: server
hisobi K1–K5 tugamaguncha `profiles.onboarded_at = null` — ijtimoiy RPC lar
rad etadi, keyingi ochilishda oqim birinchi toʻldirilmagan qadamdan davom etadi.

### 3.3 Hisob turi va yosh guruhi

- `age_band`: `13_15`, `16_17`, `18p` — tugʻilgan yil va oydan, Toshkent vaqti
  boʻyicha, har kuni 00:10 da cron qayta hisoblaydi (tugʻilgan oyning 1-kuni).
- «Voyaga yetmagan» = `13_15` yoki `16_17`. Xavfsizlik qoidalari shu ikki sinf
  (voyaga yetmagan / 18+) boʻyicha; `13_15` qoʻshimcha: profil standart holatda
  faqat doʻst va guruhdoshlarga toʻliq, push 21:00–08:00 oraligʻida yoʻq.
- 18 ga toʻlgan foydalanuvchi: voyaga yetmagan doʻstlari bilan doʻstlik
  **saqlanadi, lekin DM yopiladi** (suhbat faqat oʻqish uchun qoladi). Bu holat
  kam va xavfsiz tomonga ogʻadi.
- Hisob turi keyin oʻzgartiriladi: Oʻquvchi/Boshqa → Oʻqituvchi (18+ boʻlsa);
  Oʻqituvchi → boshqa tur (faqat egalik qiladigan guruhi yoʻq boʻlsa).

### 3.4 Oʻqituvchi maqomi va tasdiqlash

| | Tasdiqlanmagan | Tasdiqlangan ✓ |
|---|---|---|
| Guruh soni | ≤ 3 | ≤ 20 |
| Guruh hajmi | ≤ 40 aʼzo | ≤ 60 aʼzo |
| Oʻqituvchilar reytingida | yoʻq | bor (≥ 5 faol oʻquvchi boʻlsa) |
| Profilda | «Oʻqituvchi» chipi | «Oʻqituvchi ✓» chipi |

**Soʻrov** (Sozlamalar → Hisob → «Oʻqituvchi maqomi» → [Tasdiqlash soʻrovi]):
maktab nomi va raqami (≤ 80), hudud, fan (roʻyxat), ixtiyoriy izoh (≤ 200).
Hujjat rasmi **soʻralmaydi** (ortiqcha shaxsiy maʼlumot). Moderator 48 soat
ichida tekshiradi: guruh faolligi (≥ 1 guruh, ≥ 5 aʼzo, ≥ 7 kun), shikoyat
yoʻqligi, kerak boʻlsa maktabning ochiq kanallari. Rad etilsa sababi
bildirishnomada, 30 kundan keyin qayta soʻrash mumkin.

### 3.5 Foydalanuvchi nomi (server)

- Qoidalar v1.1 §5.1 bilan aynan bir xil (Edge Function `profile.js` ning
  oʻzini ishlatadi); qoʻshimcha: `citext` noyoblik, oʻchirilgan hisob nomi
  30 kun band turadi.
- Oʻzgartirish 30 kunda bir marta (`username_changed_at`); Profilni tahrirlashda
  «Keyingi oʻzgartirish: 26.10.2026» 18 px qatori.
- **Taqlidga qarshi:** nom `iquest`, `admin`, `moder`, `support`, `official`,
  `rasmiy`, `ustoz_official` kabi band qismlarni oʻz ichiga olmaydi (mavjud
  `RESERVED_PART`), oʻqituvchi ham «ustoz» soʻzini nom sifatida olishi mumkin,
  lekin ✓ belgisi faqat tasdiqdan keyin.

### 3.6 Chiqish va hisobni oʻchirish

- **Chiqish** (dialog `signOut`): «Hisobdan chiqasizmi? Natijalar hisobda saqlanadi.»
  [Chiqish]/[Bekor qilish] + belgilash qatori «Bu qurilmadagi maʼlumotni ham
  oʻchirish» (standart oʻchiq; umumiy telefonda foydali). Chiqqach ilova mehmon
  rejimida, mahalliy v1.1 maʼlumot oʻz joyida.
- **Hisobni oʻchirish** (Sozlamalar → Hisob, `--destructive-ink`): dialog
  `deleteAccount` — sarlavha «Hisob oʻchirilsinmi?», matn «Profil, nom,
  xabarlar, natijalar, tangalar va duellar oʻchiriladi. Buni qaytarib
  boʻlmaydi.», 52 px input «Tasdiqlash uchun nomingizni yozing», [Oʻchirish]
  (nom mos kelguncha xira) / [Bekor qilish].
  - Darhol: profil yashiriladi, barcha sessiyalar bekor qilinadi, guruh va
    reytinglardan chiqadi, push tokenlari oʻchadi.
  - 30 kun ichida (cron `purge_deleted`): `auth.users` va `profiles` qatori
    oʻchadi; xabarlar matni `null`, muallif «Oʻchirilgan hisob»; natijalar,
    hamyon, duel oʻyinlari oʻchadi; shikoyatlar reporter maydoni `null` bilan
    1 yil saqlanadi (xavfsizlik uchun, maxfiylik siyosatida yozilgan).
  - Egalik qilgan guruhlar: eng eski guruh admini ega boʻladi; admin boʻlmasa
    guruh arxivlanadi (30 kun faqat oʻqish, keyin oʻchadi) va aʼzolarga
    bildirishnoma.
- **Veb:** `iquest.uz/hisobni-ochirish/` — Google/Telegram bilan kirish →
  xuddi shu `account` Edge Function (`action: delete`). Kira olmaydigan
  foydalanuvchi uchun aloqa manzili (Play talabi).

---

## 4. Ekranlar va oqimlar

**Umumiy qoidalar** v1.1 §3 dagidek (16/12/24 px oraliqlar, bitta asosiy tugma,
bitta toʻyingan blok, layout shift yoʻq, `tabular-nums`, foydalanuvchi matni
faqat `…Raw` kalit bilan). Qoʻshimcha:
- **Roʻyxat qatori 64 px:** 40 px avatar · nom 16/700 (sigʻmasa «…») + pastki
  qator 13/600 xira · oʻngda qiymat yoki belgi. Guruh qatori ham 64 px.
- **Boʻsh holat** (v1.1 komponenti): 48 px ikonka, bitta 15/600 qator, bitta tugma.
- **Yuklanish:** skelet qatorlar (qatʼiy 64 px), aylanuvchi indikator yoʻq.
- **Foydalanuvchi nomi** hamma joyda `@` siz, 16/700; oʻqituvchida ✓ glifi
  16 px, `--primary-ink`.

### 4.1 SUHBATLAR (L0)

**Maqsad:** gaplashish. **Asosiy tugma yoʻq** (roʻyxat ekrani).
1. **Sarlavha 44 px:** h1 «Suhbatlar»; oʻngda 44 px qidiruv (→ Foydalanuvchi
   qidirish) va 44 px «+» (→ `plusMenu` varagʻi).
2. **Segment 40 px:** «Guruhlar | Shaxsiy». Tanlov `nz-social-ui` da eslanadi;
   birinchi marta: guruhi bor boʻlsa Guruhlar, aks holda Shaxsiy. Har segment
   nomi yonida oʻqilmaganlar soni (chip 20 px).
3. **32 px holat qatori** (§2.7, faqat oflaynda koʻrinadi).
4. **Guruhlar segmenti:** guruh qatorlari (oxirgi xabar vaqti boʻyicha).
   - Qator: 40 px guruh avatari (12 ta tayyor guruh belgisi), nom + sinf yorligʻi
     «7-B», pastki qator «@ali: Ertaga test…» yoki «Aʼzolar: 28», oʻngda vaqt
     13/600 va oʻqilmaganlar chipi. Ovozsiz guruhda chip kulrang.
   - Boʻsh: «Hali guruhingiz yoʻq» + [Guruhga qoʻshilish] (oʻqituvchida
     [Guruh yaratish]).
5. **Shaxsiy segmenti:**
   - Birinchi qator 64 px: users plitkasi · «Doʻstlar» · oʻngda «12» va soʻrov
     chipi «+2» · › → Doʻstlar.
   - DM qatorlari (oxirgi xabar boʻyicha): avatar, nom, oxirgi xabar, vaqt, chip.
   - Boʻsh: «Shaxsiy suhbatlar doʻstlar bilan boʻladi» + [Doʻst qoʻshish].
   - Voyaga yetmagan hisobda sarlavha ostida hech qanday ogohlantirish yoʻq —
     qoida tizimda, matnda emas.

**`plusMenu` varagʻi (260 px):** 3 ta 56 px qator: «Guruhga qoʻshilish» (link
ikonkasi) → `joinGroup`; «Doʻst qoʻshish» → Foydalanuvchi qidirish; «Guruh
yaratish» (faqat oʻqituvchida; boshqalarda qator **yoʻq**, xira emas).

### 4.2 Guruh yaratish, taklif, qoʻshilish

**GURUH YARATISH (L1)** — sarlavha ‹ · «Yangi guruh» · oʻngda matnli «Yaratish».
1. Guruh belgisi: 12 ta 56 px tayyor belgi (kitob, atom, globus, kalkulyator,
   palitra, nota, raketa, lampochka, shaxmat, matritsa, DNK, yulduz), 4×3 setka.
2. «Guruh nomi» 52 px input, 3–32 belgi, filtr (`scan`), yordam qatori «0/32».
3. «Sinf yoki izoh» 52 px input, ixtiyoriy, ≤ 12 belgi («7-B», «Olimpiada»).
4. «Qoʻshilish» segment 40 px: **«Soʻrov bilan»** (standart) | «Kod bilan darhol».
5. Limit qatori 18 px: «3 tadan 1 ta guruh» (tasdiqlanmagan) — bosilsa
   «Oʻqituvchi maqomi» ekrani.
«Yaratish» → Guruh ekrani ochiladi, chat boʻsh va uning oʻrnida **«Oʻquvchilarni
taklif qiling»** kartasi: kod «K7P-Q2M» 28/800 (tabular), [Ulashish] (asosiy)
va «QR kodni koʻrsatish» (matnli) → `invite` varagʻi.

**Taklif kodi:**
- 6 belgi, alifbo `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (0/O, 1/I/L yoʻq), koʻrsatishda
  3+3 tire bilan. Kod ↔ guruh noyob. Muddati standart 30 kun
  (`code_expires_at`); [Kodni yangilash] eski kodni darhol bekor qiladi.
- Havola: `https://iquest.uz/g/K7PQ2M`. [Ulashish] — Android tizim ulashish
  oynasi, matn: «IQuestʼdagi «7-B matematika» guruhiga qoʻshiling: {havola}».
- **`invite` varagʻi (520 px):** guruh nomi, 240 px QR (havola; oʻzimiz chizamiz,
  `src/qr.js`, tashqi kutubxona yoʻq), kod 28/800, [Ulashish], «Kodni yangilash»
  (matnli, faqat ega/admin), 18 px qator «Amal qiladi: 26.10.2026 gacha».
  Oʻquvchi QR ni **telefon kamerasi** bilan skanerlaydi (ilova ichida skaner
  yoʻq → `CAMERA` ruxsati kerak emas).
- **Nom boʻyicha taklif:** Guruh → Aʼzolar → [Taklif qilish] → aniq nom kiritiladi
  → oʻquvchiga bildirishnoma «@ustoz_karimov sizni «7-B» guruhiga taklif qildi»
  [Qabul qilish]/[Rad etish]. Taklif = oldindan tasdiqlangan soʻrov; oʻquvchi
  qabul qilsagina aʼzo boʻladi (oʻqituvchi hech kimni roziligisiz qoʻsha olmaydi).

**`joinGroup` varagʻi (340 px):** sarlavha «Guruhga qoʻshilish», 52 px kod
inputi (6 belgi, katta harfga oʻtadi, tire va boʻshliq tashlanadi), 18 px xato
qatori, [Davom etish]. Keyin varaq ichida (balandlik oʻzgarmaydi) **guruh
koʻrinishi**: belgi, nom, «@ustoz_karimov · Oʻqituvchi ✓», «Aʼzolar: 28» va
**shaffoflik qatori** 13/600: «Oʻqituvchi guruhdagi faolligingizni koʻradi:
ball, faol kunlar, savol turlari boʻyicha aniqlik. IQ natijalaringiz
koʻrinmaydi.» → [Soʻrov yuborish] yoki [Qoʻshilish] (join_mode ga qarab).
- Xatolar: «Kod topilmadi», «Kod muddati tugagan», «Guruh toʻla», «Siz bu
  guruhdasiz», «Juda koʻp urinish — 1 soatdan keyin» (10 urinish/soat).
- Soʻrov yuborilgach: Guruhlar roʻyxatida xira qator «7-B — soʻrov yuborildi»
  (bosilsa «Soʻrovni bekor qilish»). Tasdiqlansa bildirishnoma va push.

**SOʻROVLAR (L1, ega/admin):** qatorlar: avatar, nom, «Oʻquvchi · 14 kun
oldin roʻyxatdan oʻtgan», oʻngda ikki 36 px tugma ✓ / ✕. Sarlavhada matnli
«Hammasini qabul qilish» (tasdiq dialogi bilan). Soʻrov 14 kunda javobsiz
boʻlsa oʻchadi. Oʻquvchida bir vaqtda ≤ 10 ta kutilayotgan soʻrov.

### 4.3 GURUH ekrani (L1)

**Sarlavha 56 px:** ‹ · markazda guruh nomi 17/700 va ostida «28 aʼzo» 12/600 ·
oʻngda ega/adminda tishli gʻildirak (soʻrov boʻlsa son belgisi), oʻquvchida «⋯»
(→ `groupAbout` varagʻi: belgi, nom, oʻqituvchi, aʼzolar soni, «Qoʻshilgan
sana», qatorlar «Ovozsiz qilish» (almashtirgich), «Shikoyat qilish», «Guruhdan
chiqish» `--destructive-ink`).
**Segment 40 px:** «Chat | Reyting | Aʼzolar». Standart — Chat.

**Chat segmenti:**
- Qadalgan xabar (bor boʻlsa) 48 px tasma: «📌»siz, pin glifi + 1 qator matn;
  bosilsa oʻsha xabarga siljiydi.
- Xabarlar roʻyxati pastdan yuqoriga, 50 tadan sahifalanadi.
- Pufak: oʻzimniki oʻngda (fon — mening profil rangim 18 %, v1.1 §5.3),
  boshqalarniki chapda `--surface`; har guruh boshida 24 px avatar va nom;
  oʻqituvchi nomi yonida «Oʻqituvchi» 11/700 chipi (rang emas, matn).
- Tizim xabarlari markazda 13/600 xira: «@ali guruhga qoʻshildi», «Oʻqituvchi
  chat rejimini oʻzgartirdi», duel kartasi «@ali ↔ @vali duel: 8–6».
- **Yozish paneli 64 px** (pastda, klaviatura bilan koʻtariladi): 52 px matn
  maydoni (1–4 qator, keyin ichida aylanadi), oʻngda 44 px yuborish tugmasi
  (boʻsh matnda xira). Yordam qatori 18 px **panel ustida**, doim ajratilgan:
  xato («Nomaqbul soʻz», «Havola yuborib boʻlmaydi», «Telefon raqami yuborib
  boʻlmaydi», «Sekin rejim: 12 s»), yoki 450 dan oshsa «463/500».
- Chat rejimi «Faqat oʻqituvchilar» boʻlsa panel oʻrnida (xuddi shu 64 px)
  13/600 matn «Bu guruhda faqat oʻqituvchilar yozadi».
- Ovozsiz qilingan aʼzoga: «Siz 1 soatga ovozsiz qilingansiz (14:32 gacha)».
- Xabarni bosib turish → `msgActions` varagʻi: «Nusxa olish», «Javob berish»,
  «Oʻchirish» (oʻzimniki 24 soatda / ega-admin har qanday), «Qadash» (ega/admin),
  «Shikoyat qilish» (boshqaniki), «@ali profili».

**Reyting segmenti (guruh reytingi):**
- Chip qatori 36 px: «Bu hafta | Bu oy | Hamma vaqt» (segment, varaq emas).
- Tepada 88 px karta: «Guruh bu hafta ◆ 12 480 · 21/28 faol».
- Qatorlar 64 px: oʻrin (1–3 medal shaklidagi 28 px doira ichida raqam; rang
  qoʻshimcha, yagona belgi emas), avatar, nom, pastki qatorda 7 ta 6 px faollik
  nuqtasi (hafta kunlari), oʻngda «◆ 820». Oʻzim qatori `--primary-soft`.
- Faqat aʼzolar (ega va adminlar roʻyxatda **yoʻq**). Oʻquvchi guruh reytingidan
  chiqa olmaydi (guruhning maqsadi shu) — bu qoʻshilish varagʻida aytilgan.
- Ball faqat server tekshirgan natijalardan, joriy haftada ≤ 5 daqiqa kechikish;
  ostida 13/600 «◆ — tekshirilgan mashq, test, oʻyin va duel ballari».

**Aʼzolar segmenti:**
- Tepada ega/adminga [Taklif qilish] (shaffof tugma 44 px) va «Soʻrovlar (3) ›».
- Guruhlar: «Oʻqituvchilar» (ega, adminlar) va «Oʻquvchilar (28)».
- **Oʻquvchi uchun** qator: avatar, nom, liga chipi → bosilsa Ommaviy profil.
- **Oʻqituvchi uchun (oʻqituvchi paneli):** qator pastki matni «Bu hafta ◆ 420 ·
  5 kun» va oxirgi faollik «bugun / 3 kun oldin»; tartiblash chip qatori
  «Ball | Faollik | Nom». Qator bosilsa **`memberCard` varagʻi (560 px):**
  - 64 px avatar, nom, «Qoʻshilgan: 12.09.2026»;
  - «Oxirgi 4 hafta» 4 ustunli ◆ diagramma (v1.1 «Oxirgi haftalar» komponenti);
  - «Savol turlari (30 kun)»: 4 qator, har biri tur glifi, nom, 6 px chiziq va
    «72 % · 54 ta» (mashq va test javoblari, faqat tekshirilgan);
  - «Oʻyinlar: 23 · Duellar: 4»;
  - tugmalar: [Profil] (shaffof), «Ovozsiz qilish ▾» (1 soat / 1 kun / 7 kun),
    «Guruhdan chiqarish» `--destructive-ink` → dialog `removeMember`;
  - **IQ natijasi yoʻq.** Hech qachon (egasining halollik va bola xavfsizligi
    qoidasi).
- Admin tayinlash (faqat ega): oʻqituvchi hisobi boʻlgan aʼzo qatorida
  «⋯ → Yordamchi qilish». Oddiy oʻquvchini admin qilib boʻlmaydi.

**GURUH SOZLAMALARI (L1, ega/admin)** — v1.1 sozlama qatorlari uslubida:

| Boʻlim | Qator | Boshqaruv |
|---|---|---|
| Guruh | Nom · Belgi · Sinf yorligʻi | › (tahrirlash varaqlari) |
| Taklif | Kod «K7P-Q2M» | › → `invite` |
| | Qoʻshilish | «Soʻrov bilan» / «Kod bilan darhol» |
| | Soʻrovlar | «3» › |
| Chat | Kim yozadi | «Hamma» / «Faqat oʻqituvchilar» |
| | Sekin rejim | Oʻchiq / 10 s / 30 s / 60 s (standart 10 s) |
| Aʼzolar | Yordamchi oʻqituvchilar | «1» › |
| | Guruh hajmi | «28 / 40» (maʼlumot) |
| Xavfli | Egalikni oʻtkazish (faqat ega, faqat oʻqituvchi adminga) | › dialog |
| | Guruhni arxivlash (faqat ega) | `--destructive-ink` → dialog «Chat faqat oʻqish uchun qoladi, 30 kundan keyin oʻchadi» |

### 4.4 Shaxsiy chat, doʻstlar, qidiruv

**SUHBAT (L1, DM):** sarlavha ‹ · 32 px avatar + nom (bosilsa Ommaviy profil) ·
«⋯» (→ varaq: «Duelga chaqirish», «Ovozsiz qilish», «Bloklash», «Shikoyat
qilish»). Tarkibi guruh chati bilan bir xil komponentlar (tizim xabarlari,
pufak, 64 px panel, 18 px yordam qatori). Sekin rejim yoʻq, lekin 20 xabar/daqiqa.
Suhbat faqat `can_dm` rost boʻlganda yoziladi; yopilsa (bloklash, doʻstlikdan
chiqish, 18 ga toʻlish) panel oʻrnida «Bu suhbatga yozib boʻlmaydi».

**DOʻSTLAR (L1):** segment «Doʻstlar | Soʻrovlar (2)».
- Doʻstlar: qatorlar (avatar, nom, liga chipi) → Ommaviy profil; «⋯» →
  «Doʻstlikdan chiqarish».
- Soʻrovlar: kiruvchi (✓ / ✕ tugmalari), ostida «Yuborilgan» (xira, «Bekor qilish»).
- Boʻsh: «Doʻst qoʻshish uchun aniq nomni qidiring» + [Qidirish].

**FOYDALANUVCHI QIDIRISH (L1):** 52 px input «Aniq foydalanuvchi nomi», Enter
yoki 600 ms dan keyin **aniq moslik** qidiriladi (prefiks yoʻq, roʻyxat yoʻq —
begonalarni koʻzdan kechirish imkoni boʻlmasin). Natija: bitta 64 px qator yoki
«Topilmadi». Blok qilgan/qilingan, oʻchirilgan, banlangan hisob — «Topilmadi».
Chegara: 60 qidiruv/soat.

**Doʻstlik qoidalari:**
- Soʻrov faqat bir xil yosh sinfi ichida (voyaga yetmagan ↔ voyaga yetmagan,
  18+ ↔ 18+). Boshqa sinfdagi profilda [Doʻst qoʻshish] tugmasi **yoʻq**.
- ≤ 30 soʻrov/kun, ≤ 50 kutilayotgan chiquvchi, ≤ 500 doʻst.
- Rad etilgan soʻrovni 30 kun qayta yuborib boʻlmaydi (tugma «Soʻrov yuborilgan»
  xira koʻrinadi — rad etilgani aytilmaydi).
- Hisobi 24 soatdan yosh foydalanuvchi soʻrov yubora olmaydi (spam botlarga qarshi).

### 4.5 Chat qoidalari (guruh va shaxsiy)

| Qoida | Guruh chati | Shaxsiy (DM) |
|---|---|---|
| Kim koʻradi | Hamma aʼzolar (yangi aʼzo butun tarixni koʻradi) | Faqat ikki kishi |
| Kim yozadi | Rejim «Hamma»: aʼzolar; «Faqat oʻqituvchilar»: ega va adminlar | Faqat `can_dm`: bir xil yosh sinfidagi qabul qilingan doʻstlar, bloklanmagan, qabul qiluvchida «Kim yozadi: Doʻstlar» |
| Kattalar va voyaga yetmaganlar | Guruhda birga boʻlishi mumkin (ochiq, oʻqituvchi nazoratida) | **Hech qachon** |
| Xabar | Faqat matn, 1–500 kod nuqtasi, emoji mumkin, ≥ 3 ketma-ket boʻsh qator → 1 | Shu |
| Rasm, ovoz, fayl, stiker | Yoʻq (v2.0) | Yoʻq |
| Havola | Rad etiladi (bio regexi) — hamma uchun | Shu |
| Telefon raqami (≥ 7 raqam boʻshliq/tire bilan) | Guruhda voyaga yetmagan boʻlsa rad | Rad (hamma uchun) |
| `@nom` | Faqat shu guruh aʼzosining nomi → uning bildirishnomasi (≤ 5 ta/xabar) | Rad (boshqa joyga olib ketish yoʻli) |
| Nomaqbul soʻz | Rad (`scan` → `bad`), mijoz ham oldindan tekshiradi | Shu |
| Tezlik | Sekin rejim (standart 10 s) + 20/daqiqa + 1 000/kun | 20/daqiqa + 1 000/kun |
| Tahrirlash | Yoʻq | Yoʻq |
| Oʻchirish | Oʻziniki 24 soatda; ega/admin istalganini → «Xabar oʻchirildi» | Oʻziniki 24 soatda (ikkala tomondan) |
| Bloklash taʼsiri | Bloklangan odam xabarlari men uchun «Bloklangan foydalanuvchi xabari» (bosilsa ochiladi) | Suhbat yopiladi, yangi xabar yoʻq |
| Avto-yashirish | 3 ta mustaqil shikoyat (hisobi ≥ 7 kun) → xabar moderatsiyagacha yashirin | Shu |
| Saqlash muddati | 12 oy, keyin oʻchadi | 12 oy |
| Push | «7-B: yangi xabar» (matnsiz); @eslatish — «@ali sizni eslatdi» | «@ali yangi xabar yubordi» (matnsiz) |

Yuborish oqimi: mijoz `nzProfile.scan()` bilan oldindan tekshiradi (yordam
qatori darhol) → `chat-send` Edge Function yana tekshiradi → `messages` ga
yozadi → trigger Realtime kanaliga yuboradi. Internet yoʻq: xabar yuborilmaydi,
pufak ostida «Yuborilmadi · Qayta urinish» (navbat yoʻq — eski xabar kechikib
chiqmasin).

### 4.6 OMMAVIY PROFIL (L1) va maxfiylik

**Sarlavha:** ‹ · «Profil» · «⋯» (Shikoyat qilish, Bloklash / Blokdan chiqarish).
Tarkib (v1.1 identifikatsiya kartasi komponenti, qalam belgisiz):

| Maydon | Hamma koʻradi | Faqat toʻliq koʻrinishda |
|---|---|---|
| Avatar (tayyor yoki bosh harf), profil rangi tasmasi | ✓ | |
| Foydalanuvchi nomi, «Oʻqituvchi (✓)» chipi | ✓ | |
| Liga chipi (joriy hafta, server) | ✓ | |
| Vitrina (3 nishon) | ✓ | |
| Bio | | ✓ |
| Statistika 2×2: «Jami ball ◆», «Eng uzun streak», «Nishonlar 12/29», «Duellar 12–5–1» | | ✓ |
| «Oxirgi haftalar» ◆ diagrammasi | | ✓ |
| Umumiy guruhlar («Siz bilan: 7-B») | | ✓ (faqat umumiylari) |
| «Eng yaxshi IQ» | | faqat 18+ egasi yoqsa va koʻruvchi 18+ doʻst boʻlsa; server tasdiqlagan `reliable` natija, oraliq bilan («IQ 112 · 104–120») |
| Hudud, yosh, maktab, tugʻilgan sana, guruhlar roʻyxati | **Hech kimga** | |

**Toʻliq koʻrinish kimga:** 18+ profili — standart holatda hammaga (`profile_vis
= all`), «Faqat doʻstlar va guruhdoshlar» ga oʻzgartirsa boʻladi. Voyaga
yetmagan profili — **faqat doʻstlari va guruhdoshlariga** (oʻzgartirib
boʻlmaydi); boshqalarga qisqa koʻrinish (avatar, nom, liga, vitrina).

**Tugmalar** (koʻpi bilan bitta toʻldirilgan): [Duelga chaqirish] (asosiy,
`duel_from` ruxsat bersa) · [Xabar yozish] (`can_dm` boʻlsa) · [Doʻst qoʻshish] /
«Soʻrov yuborilgan» / «Doʻstlar ✓» (bir xil yosh sinfida boʻlsa). Ruxsat
boʻlmagan tugma **chizilmaydi**; tugmalar qatori joyi (52 px) doim ajratilgan.

**Oʻz ommaviy profilim:** Profil → «Boshqalarga qanday koʻrinadi» → shu ekran,
tepada segment «Hamma koʻradi | Doʻstlar koʻradi».

**MAXFIYLIK (L1, Sozlamalar → Hisob):**

| Qator | Qiymatlar | Standart (18+) | Standart (13–17) |
|---|---|---|---|
| Profilim kimga toʻliq koʻrinadi | Hamma / Doʻstlar va guruhdoshlar | Hamma | Doʻstlar va guruhdoshlar (qulflangan, qator 40 % xira, pastki matn «18 yoshgacha shunday») |
| Kim yozishi mumkin | Doʻstlar / Hech kim | Doʻstlar | Doʻstlar |
| Kim duelga chaqira oladi | Doʻstlar va guruhdoshlar / Hech kim | Doʻstlar va guruhdoshlar | shu |
| Umumiy reytingda koʻrinish | almashtirgich | yoniq | yoniq |
| Eng yaxshi IQʼni doʻstlarga koʻrsatish | almashtirgich | oʻchiq | qator yoʻq |

Onlayn holat, «oxirgi marta koʻrilgan», «yozmoqda…», xabar oʻqilganlik belgisi
**yoʻq** (kuzatish va bosimga qarshi; v2.0).

### 4.7 REYTING (L0)

**Sarlavha:** h1 «Reyting». **Segment 40 px:** «Liga | Umumiy | Oʻqituvchilar».
Mehmonda segment yoʻq — v1.1 ekrani (mahalliy liga) va pastda 88 px karta
«Boshqalar bilan solishtirish uchun hisobga kiring» [Kirish].

**Liga** — v1.1 §3.3 ekrani, lekin hisobda **server haftalik balli** bilan
(tekshirilmagan mahalliy ball koʻrsatilmaydi; farq boʻlsa izoh yoʻq — manba
bitta). Qoʻshimcha 5-blok **«Doʻstlar bu hafta»**: ≤ 50 qator (doʻstlar + men),
◆ boʻyicha; boʻsh boʻlsa «Doʻst qoʻshing — shu yerda solishtirasiz» [Doʻst qoʻshish].

**Umumiy:**
- Filtr chiplari qatori 36 px: [Bu hafta ▾] → `rankPeriod` (Bu hafta / Bu oy /
  Hamma vaqt) · [Oʻzbekiston ▾] → `rankRegion` (Oʻzbekiston + 14 hudud + «Boshqa
  davlatlar») · [Hammasi ▾] → `rankWho` (Hammasi / Oʻquvchilar). Tanlov
  `nz-social-ui` da eslanadi.
- 13/600 izoh qatori: «◆ — tekshirilgan natijalar balli · 5 daqiqada yangilanadi».
- Roʻyxat: top 100. Qator 64 px: oʻrin 15/800 tabular (1–3 medal doirasi),
  avatar, nom + 16 px liga qalqoni, oʻngda «◆ 4 820».
- **«Siz» qatori** pastda yopishqoq 64 px (pastki menyu ustida): «#1 234 · ◆ 820»
  yoki «Bu davrda tekshirilgan natija yoʻq» yoki «Reytingda koʻrinmaysiz
  (Maxfiylik)». Top 100 da boʻlsam yopishqoq qator oʻrniga oʻz qatorim
  belgilanadi, joy saqlanadi.
- Faqat: `in_rankings = true`, banlanmagan, xodim emas, davrda ≥ 1 tekshirilgan
  natija.
- **«Oʻquvchilar»** filtri = hisob turi «Oʻquvchi» (har yosh). «Hammasi» =
  oʻquvchi, oʻqituvchi va boshqa.

**Oʻqituvchilar:**
- Filtr: [Bu hafta ▾] (Bu hafta / Bu oy) · [Oʻzbekiston ▾].
- Izoh qatori: «Oʻquvchilari eng faol oʻqituvchilar».
- Qator: oʻrin, avatar, nom ✓, pastki qator «28 ta faol oʻquvchi», oʻngda «◆ 41 200».
- **Taʼrif (sinf balli):** davrdagi har bir oʻquvchining tekshirilgan balli,
  oʻquvchi baliga chegara (hafta: 2 500, oy: 10 000), oʻqituvchining **barcha
  guruhlaridagi** eng yaxshi 30 oʻquvchi yigʻindisi. Oʻquvchi guruhda ≥ 7 kun
  boʻlgan va hisobi ≥ 7 kunlik boʻlishi shart. Bitta oʻquvchi bir necha
  oʻqituvchiga hisoblanishi mumkin (matematika va informatika ustozi).
  Qatnashish sharti: tasdiqlangan ✓, davrda ≥ 5 faol oʻquvchi. Oʻqituvchining
  oʻz oʻyini **hisoblanmaydi** (u Umumiy da).
- Oʻqituvchi bosilsa Ommaviy profil (unda «Guruhlar: 4 · Oʻquvchilar: 96»).

**Halollik:** sarlavhalarda «eng aqlli», «daho», «top X %», «IQ reytingi» yoʻq.
Oʻrin (#1 234) koʻrsatiladi, foiz hech qachon. `tools/honesty.mjs` roʻyxatiga
qoʻshiladi: «eng aqlli», «самый умный», «smartest», «top \d+ ?%», «лучше \d+ ?%».

### 4.8 DUELLAR

#### 4.8.1 Duel turlari (v2.0)

| Tur (`duel_kind`) | Nomi (UI) | Tarkibi | Parametrlar (chaqiruvchi tanlaydi) | Gʻolib |
|---|---|---|---|---|
| `blitz` | Aralash blits | 10 savol, 4 tur aralash (har turdan 2–3) | Qiyinlik: Oson (3) / Oʻrta (5, standart) / Qiyin (7). Vaqt: 2 / 3 (standart) / 5 daqiqa (umumiy) | Koʻproq toʻgʻri; teng boʻlsa kamroq vaqt; u ham teng (±1 s) → durang |
| `type` | Bitta tur | 10 savol, bitta tur | Tur: Matritsa / Son qatorlari / Fazoviy / Ogʻzaki. Qiyinlik, Vaqt | Shu |
| `game` | Aql oʻyini | Bitta oʻyin, bir xil urugʻ va daraja | Oʻyin: 6 tadan biri. Qiyinlik: Oson (3) / Oʻrta (5) / Qiyin (7) daraja | Koʻproq `points`; teng → `score`; teng → kamroq `durationMs`; `points = 0` (bot qoidasi) — magʻlubiyat |
| `bo3` (v2.1) | 3 raund | 3 raund: 5 savollik blits · oʻyin · oʻyin (yoki chaqiruvchi tanlagan uchtasi) | Raundlar, qiyinlik | 2 raund yutgan |

Jonli (bir vaqtda) duel v2.1 da: xuddi shu spetsifikatsiya, faqat ikkalasi
bir paytda boshlaydi va Realtime orqali bir-birining progressini (savol raqami,
javob emas) koʻradi.

#### 4.8.2 Hayot sikli

```
             ┌── cancel (chaqiruvchi, raqib hali oʻynamagan) ──→ CANCELLED
 create ──→ PENDING ──decline──→ DECLINED
             │  └── 24 soat javobsiz ──→ EXPIRED
             │     (chaqiruvchi PENDING da oʻynashi mumkin)
           accept
             ▼
           ACTIVE  (deadline = accepted_at + 24 soat; har biri 1 marta oʻynaydi)
             │  ikkalasi topshirdi ─────────────→ DONE (gʻolib / durang)
             └  deadline oʻtdi: bittasi oʻynagan → DONE (texnik gʻalaba, bonus yoʻq)
                               hech kim         → EXPIRED
```

- **Kim chaqira oladi:** raqibning `duel_from` sozlamasi ruxsat bersa — doʻst yoki
  umumiy guruh aʼzosi. Bloklangan juftlik yoʻq. ≤ 20 chaqiruv/kun, ≤ 5
  kutilayotgan chiquvchi, bir juftlik orasida bir vaqtda ≤ 1 ochiq duel.
- **Oʻynash:** [Oʻynash] → `duel` Edge Function `start` → savollar (yoki oʻyin
  urugʻi) keladi, server `started_at` yozadi. Bir marta boshlangan oʻyin qayta
  boshlanmaydi: ilova yopilsa, vaqt tugaguncha **davom ettirish** mumkin (server
  savollarni va berilgan javoblarni saqlaydi); vaqt tugasa javobsizlar xato.
- **Natija yashirinligi:** birinchi topshirganning natijasi ikkinchisi
  topshirmaguncha raqibga koʻrinmaydi (duel kartasida «?»).
- **Tugash:** ikkalasiga bildirishnoma «Duel natijasi: siz yutdingiz 8–6», duel
  kartasi va (umumiy guruh chatidan boshlangan boʻlsa) oʻsha chatga tizim xabari.
- **Qayta bellashuv:** DONE kartasida [Qayta bellashuv] — xuddi shu tur va
  parametrlar, yangi urugʻ, chaqiruvchi = bosgan odam. Oddiy chaqiruv
  chegaralariga kiradi.

#### 4.8.3 Ekranlar

**Mashq tabida** h1 dan keyin 64 px qator: swords glifi plitkasi · «Duellar» ·
pastki qator «Sizning navbatingiz: 2» yoki «Doʻstingizni chaqiring» · oʻngda son
belgisi · ›. (Mashq roʻyxat ekrani boʻlib qoladi; qator toʻyingan emas.)

**DUELLAR (L1):** sarlavha ‹ · «Duellar» · oʻngda 44 px «+» (→ Duel yaratish).
Boʻlimlar (boʻsh boʻlim sarlavhasi bilan birga chizilmaydi):
1. «Sizning navbatingiz» — qabul qilish yoki oʻynash kerak boʻlganlar.
2. «Raqib kutilmoqda».
3. «Tugaganlar» — oxirgi 30 ta.
Qator 64 px: raqib avatari, nom, pastki qator «Aralash blits · Oʻrta · 3 daq»,
oʻngda holat chipi 28 px: «Qabul qiling» / «Oʻynang · 18 soat» / «Kutilmoqda» /
«Yutdingiz 8–6» (`--green-ink`) / «Yutqazdingiz 5–7» / «Durang» / «Muddati tugadi».
Boʻsh: «Hali duel yoʻq» + [Duelga chaqirish].
Tepada 88 px statistika kartasi: «Gʻalaba 12 · Magʻlubiyat 5 · Durang 1».

**DUEL YARATISH (L1):** sarlavha ‹ · «Yangi duel». Asosiy tugma pastda
yopishqoq 76 px panelda [Chaqirish] (raqib tanlanmaguncha xira).
1. «Raqib» qatori 64 px → `pickOpponent` varagʻi (560 px): 52 px mahalliy
   filtr inputi, «Doʻstlar» va «Guruhdoshlar» boʻlimlari (duel qabul
   qilmaydiganlar koʻrsatilmaydi). Profildan kelinganda raqib oldindan tanlangan.
2. «Duel turi» — 3 ta 64 px radio qator (pastki qatorlari: «10 savol · 4 tur»,
   «10 savol · bitta tur», «Bitta oʻyin · bir xil daraja»).
3. **Parametrlar maydoni qatʼiy 176 px** (turga qarab ichi almashadi, balandlik
   oʻzgarmaydi): Blits — «Qiyinlik» segment 40 + «Vaqt» segment 40; Bitta tur —
   4 ta tur chipi + «Qiyinlik» + «Vaqt»; Aql oʻyini — «Oʻyin» qatori 64 (→
   `pickGame`) + «Qiyinlik».
4. Izoh qatori 13/600: «Natijangiz raqib oʻynamaguncha yashirin. Duel tanga
   bermaydi, ball beradi.»
[Chaqirish] → Duel ekrani (PENDING), toast «Chaqiruv yuborildi», chaqiruvchida
[Hozir oʻynash] asosiy tugma.

**DUEL (L1):** sarlavha ‹ · «Duel» · «⋯» (Qoidalar → `duelRules`, Shikoyat
qilish — «Shubhali natija»). Tarkib qatʼiy joylashuvda:
- 120 px «yuzma-yuz» blok: chapda men (64 px avatar, nom), oʻngda raqib;
  oʻrtada holat: «VS» / «8 – 6» / «? – 6».
- Qoidalar kartasi 3 qator: tur, qiyinlik, vaqt (yoki oʻyin nomi).
- Holat qatori 18 px: «Qabul qilish muddati: 23 soat», «Oʻynash muddati: 18 soat».
- Tugmalar (holatga qarab, joy doim 52 + 44 px):

| Holat | Chaqiruvchi | Raqib |
|---|---|---|
| PENDING, oʻynamagan | [Hozir oʻynash] · «Bekor qilish» | [Qabul qilish] · «Rad etish» |
| PENDING, oʻynagan | «Raqib javobi kutilmoqda» (xira) · «Bekor qilish» yoʻq | [Qabul qilish] · «Rad etish» |
| ACTIVE, oʻynamagan | [Oʻynash] | [Oʻynash] |
| ACTIVE, oʻynagan | «Raqib kutilmoqda» | shu |
| DONE | [Qayta bellashuv] · «Savollarni koʻrish» (savol duellarida) | shu |

- DONE da natija jadvali: har ikki tomon uchun «8/10 · 2:14» yoki «◆ 124 ball ·
  Daraja 5», gʻolib yonida kubok glifi (rang emas, shakl), ball qatori
  «◆ +80 · gʻalaba +20».
- **«Savollarni koʻrish»** — duel savollari roʻyxati (server `review`):
  savol, mening javobim, toʻgʻri javob, izoh (v1.1 «Izoh» komponenti).
  Duel savollari ogʻzaki bankning **mashq** qismidan olinadi (test qismi
  oshkor boʻlmaydi, CONTRACT §3).

**Duel oʻyini:** mavjud Savol ekrani `duel` rejimida: HUD da umumiy qolgan vaqt
(taymer `tabular-nums`) va «3/10»; toʻgʻri/notoʻgʻri **koʻrsatilmaydi**, izoh
tugmasi yoʻq, ovoz faqat `select` (test qoidasi), «Keyingi» bilan oʻtiladi,
orqaga qaytish yoʻq. Oʻyin dueli — mavjud Oʻyin ekrani, oʻyin yakunida
«Natija yuborildi» va [Duelga qaytish].

#### 4.8.4 Ball, iqtisod va duel

- Savol duelida: +10 ◆ har toʻgʻri javob uchun; oʻyin duelida: oʻyinning
  `points`. Kunlik chegaralarga (§6.4) kiradi.
- **Gʻalaba bonusi +20 ◆** — kuniga ≤ 5 ta, bir raqib bilan kuniga ≤ 1 ta
  (kelishib yutqazish fermasiga qarshi). Texnik gʻalaba va durang bonus bermaydi.
- **Tanga: yoʻq.** Pul tikish, tanga tikish, yutuq sandigʻi yoʻq. Kunlik vazifa
  q2 «Aql oʻyini» oʻyin dueli bilan ham bajariladi — u baribir kuniga +10 bilan
  chegaralangan (v1.1).
- Duel statistikasi (`duel_w/l/d`) profilda; duel ballari haftalik ligaga kiradi.

#### 4.8.5 Duel firibgarligiga qarshi

| Xavf | Himoya |
|---|---|
| Oʻzgartirilgan ilova toʻgʻri javobni hisoblab beradi | Savol duelida urugʻ **serverda yashirin** (`duel_secrets`), mijozga `correct`, `explain`, `id` va urugʻsiz savol keladi; javobni server tekshiradi. Urugʻni rasmdan topish uchun 2³² × daraja generatsiya kerak — duel vaqtida imkonsiz |
| Vaqtni choʻzish | Vaqt server soatida: `submit` `started_at + limit + 30 s` dan kech kelsa, kechikkan javoblar xato |
| Tez bosuvchi bot | Javob vaqtlari medianasi < 1 500 ms (≥ 5 javob) → `flag: fast`, oʻyin hisoblanmaydi, magʻlubiyat |
| Oʻyin jurnalini soxtalashtirish | `IQ.games.replay` bilan qayta oʻynash; < 120 ms ketma-ket bosish → 0 ball (mavjud qoida); statistik tekshiruv (§10.7) |
| Ikki hisob bilan gʻalaba fermasi | Bonus kuniga 1/juftlik, 5/kun; tanga yoʻq; shubhali juftliklar moderatsiya roʻyxatida |
| Savollarni raqibga yuborish | Faqat ikki doʻst bir-birini aldaydi; reytingga taʼsiri chegaralangan (ball kunlik chegarada) |
| Javob bermay chiqib ketish | Javobsiz savol xato; vaqt oʻtgach avtomatik topshiriladi |

### 4.9 BILDIRISHNOMALAR (inbox) va push

**Joyi:** Bosh sarlavhasi, tanga pillidan keyin 44 px qoʻngʻiroqcha (oʻqilmagan
boʻlsa 8 px qizil nuqta). Sarlavha 360 px da: avatar 40 + nom (≥ 64 px, «…» bilan
qisqaradi) + olov 44 + tanga 84 + qoʻngʻiroqcha 44. Mehmonda qoʻngʻiroqcha yoʻq.

**BILDIRISHNOMALAR (L1):** sarlavha ‹ · «Bildirishnomalar» · matnli «Hammasini
oʻqish». Qatorlar 64 px (ikonka plitkasi, 2 qator matn, vaqt), oʻqilmagani
`--primary-soft` fonda; ichidagi tugmalar faqat soʻrov turlarida (✓ / ✕).
Saqlanadi: 60 kun yoki 200 ta.

| Tur (`notif_kind`) | Matn (uz manba) | Bosilganda | Push |
|---|---|---|---|
| `friend_request` | «@ali doʻstlik soʻrovi yubordi» [✓][✕] | Ommaviy profil | ✓ |
| `friend_accepted` | «@ali soʻrovingizni qabul qildi» | Ommaviy profil | — |
| `group_invite` | «@ustoz sizni «7-B» guruhiga taklif qildi» [✓][✕] | Guruh koʻrinishi | ✓ |
| `group_request` (egaga) | «@ali «7-B» ga qoʻshilmoqchi» | Soʻrovlar | ✓ (soatiga ≤ 1, yigʻma) |
| `group_joined` | «Siz «7-B» guruhiga qoʻshildingiz» | Guruh | ✓ |
| `group_removed` | «Siz «7-B» guruhidan chiqarildingiz» | — | — |
| `mention` | «@ustoz sizni «7-B» da eslatdi» | Suhbat, xabarga | ✓ |
| `duel_challenge` | «@ali sizni duelga chaqirdi: Aralash blits» | Duel | ✓ |
| `duel_accepted` | «@ali duelni qabul qildi — oʻynang» | Duel | ✓ |
| `duel_result` | «Duel: siz yutdingiz 8–6» | Duel | ✓ |
| `duel_expiring` | «Duel muddati 2 soatda tugaydi» | Duel | ✓ |
| `week_result` | «Oʻtgan hafta: Kumush liga · ● +25» | Reyting → Liga | — |
| `teacher_status` | «Oʻqituvchi maqomingiz tasdiqlandi ✓» | Sozlamalar → Hisob | ✓ |
| `mod_notice` | «Xabaringiz qoidaga zid deb oʻchirildi» / «Hisobingiz 1 kunga cheklangan» | Qoidalar sahifasi | ✓ |

Chat xabarlari inboxga **tushmaydi** (ularning uyi — Suhbatlar); faqat
@eslatish tushadi.

**Push (FCM):**
- `@capacitor/push-notifications`; token `push_tokens` da (`platform`, `lang`).
  Ruxsat faqat foydalanuvchi niyati bilan: Sozlamalar → Bildirishnomalar dagi
  almashtirgich yoki birinchi guruhga qoʻshilgandan keyin bir martalik varaq
  «Guruh xabarlarini bildiraylikmi?» [Yoqish] · «Kerak emas» (v1.1 §7.3 tamoyili).
- Android kanallari: `reminders` (mavjud mahalliy eslatmalar), `social`
  (xabarlar), `duels`, `groups`.
- Matnda xabar mazmuni **yoʻq** (qulflangan ekranda maxfiylik).
- Yigʻish: bitta suhbat uchun 2 daqiqada ≤ 1 push (`collapse_key = chat id`);
  foydalanuvchiga ≤ 30 push/kun.
- Jim soatlar: 13–15 — 21:00–08:00, 16–17 — 22:00–07:00 (Toshkent). Bu vaqtda
  faqat inbox.
- Til: push matni foydalanuvchining `lang` ida serverda yoziladi (4 til lugʻati
  `_shared/push-i18n.json`, WP5 yasaydi).

### 4.10 Sozlamalar qoʻshimchalari

| Boʻlim | Qator | Boshqaruv |
|---|---|---|
| **Hisob** (yangi, «Umumiy» dan oldin) | Hisob | «@ali · Google» › (Kirish usullari, Hudud, Hisob turi) yoki [Kirish] |
| | Oʻqituvchi maqomi (faqat oʻqituvchi) | «Tasdiqlanmagan» › |
| | Maxfiylik | › |
| | Bloklanganlar | «2» › |
| | Hisobdan chiqish | dialog `signOut` |
| | Hisobni oʻchirish | `--destructive-ink` → dialog `deleteAccount` |
| **Bildirishnomalar** (mavjud boʻlimga) | Xabarlar | almashtirgich (push) |
| | Duellar | almashtirgich |
| | Guruh eʼlonlari va soʻrovlar | almashtirgich |
| | Doʻstlik soʻrovlari | almashtirgich |
| **Huquqiy** | + «Hamjamiyat qoidalari» | ↗ `/qoidalar/` |
| | + «Bolalar xavfsizligi» | ↗ `/bolalar-xavfsizligi/` |

v1.1 dagi «Maʼlumotlarni oʻchirish» faqat **qurilmadagi** maʼlumotni oʻchiradi —
qator nomi «Qurilmadagi maʼlumotni oʻchirish» ga oʻzgaradi (hisob bilan
adashtirilmasin), dialog matniga «Hisobingiz va serverdagi natijalar
oʻchmaydi» qoʻshiladi.

---

## 5. Halollik va iqtisod (v2 qoʻshimchalari)

### 5.1 Halollik (CONTRACT §6 davomi)

1. Reyting — **IQuest ballari** (◆) boʻyicha. Hech bir ekranda IQ boʻyicha
   tartiblangan roʻyxat yoʻq. IQ — shaxsiy natija.
2. Persentil, «X % dan yuqori», «top 10 %», «eng aqlli», «sinfning eng aqllisi»
   yoʻq. Oʻrin raqami (#12) mumkin — bu faqat ball tartibi.
3. Oʻqituvchilar reytingi «oʻquvchilari eng faol» deb ataladi — «eng yaxshi
   oʻqituvchi», «oʻquvchilarining IQ si oshgan» emas.
4. Oʻqituvchiga oʻquvchining IQ natijasi koʻrsatilmaydi (tanlov ham yoʻq):
   natija sinf ichida baholash yoki tamgʻa vositasiga aylanmasin.
5. Guruh reytingi va duel natijasi «aql» haqida xulosa matni bilan chiqmaydi
   («siz aqlliroqsiz» yoʻq): faqat «8–6», «Yutdingiz».
6. Reklama, Play matni va bannerlar: «sinfingiz bilan musobaqalashing»,
   «doʻstingizni duelga chaqiring» — mumkin; «kim aqlliroq ekanini bilib oling»,
   «IQ reytingi» — mumkin emas. PLAY.md dagi «server boʻlmaguncha liga va reyting
   reklama qilinmaydi» qoidasi v2.0 ommaviy chiqishida bekor boʻladi.

### 5.2 Ikki valyuta serverda

| | Ball ◆ | Tanga ● |
|---|---|---|
| Hisobsiz | Mahalliy (v1.1) | Mahalliy (v1.1) |
| Hisob bilan — manba | Faqat §6 tekshirgan natijalar | Server hamyoni (`wallet_ledger`) |
| Duel | +10/toʻgʻri, oʻyin balli, gʻalaba +20 | **Yoʻq** |
| Guruh | Guruh reytingi aʼzolarning balli | Yoʻq |
| Oʻtkazish | Yoʻq | **Yoʻq** (sovgʻa, savdo, almashish yoʻq) |

**Server hamyoni** (`wallet` Edge Function):
- **Sarflash** faqat serverda: narx `_shared/catalog.js` dan (`src/catalog.js`
  ning oʻzi, bundle orqali), balans yetmasa `funds`. Egalik `purchases` da.
- **Kirim** — mijoz kalitlarni yuboradi, server halol maksimumdan oshirmaydi:

| Kalit | Server tekshiruvi |
|---|---|
| `welcome` | Hisobga bir marta, 50 |
| `q:<kun>:q1` | Shu kun (Toshkent, 04:00 chegarasi) ≥ 10 ta tekshirilgan mashq/takrorlash javobi; kun bugun yoki kecha |
| `q:<kun>:q2` | Shu kun ≥ 1 tekshirilgan oʻyin (oʻyin dueli ham) |
| `q:<kun>:q3` | Shu kun ≥ 3 ta tekshirilgan mashq/takrorlash javobi (fix/type farqi mijozda; server faqat faollikni tekshiradi) |
| `w:<dushanba>` | Miqdor serverda `week_scores` va `LEAGUES` dan hisoblanadi (mijoz miqdori eʼtiborga olinmaydi) |
| `b:<id>` | Nishon katalogda bor va bir marta. Serverda hisoblanadiganlari (`first-test`, `answers-*`, `league-*`, `games-all`, `game-lv*`, `duel`) server statistikasi bilan tekshiriladi; qolganlari (`fixer-20`, `perfect-10`, `profile`, `streak-*`) qabul qilinadi — jami chegara 870 |
| `import` | Hisobga bir marta, `min(balans, 1 500)` (v1.1 §6.10) |

Natija: oʻzgartirilgan ilova ham halol faol foydalanuvchidan koʻp tanga ololmaydi
(kuniga 30 + bir martalik nishonlar), tanga esa faqat kosmetika va
oʻtkazilmaydi — farm qilishning maʼnosi yoʻq.

---

## 6. Server tekshiruvi (Edge Functions, Deno)

### 6.1 Oqim

```
Mijoz (oflayn ham)                       Server
 finishRun / finishGame / duel submit
   → nzSync.enqueue({cid, kind, build, payload, playedAt})   (nz-sync, ≤ 200)
   → internet boʻlsa: POST /functions/v1/submit  (≤ 20 ta bir soʻrovda)
                                          ├ JWT → user_id; rate limit 30 soʻrov/daq
                                          ├ build → _shared/iq/<build>.js (yoʻq → unsupported)
                                          ├ kind boʻyicha verify/replay (6.2)
                                          ├ chegaralar (6.4) → ball
                                          ├ INSERT verified_results (unique user_id+cid)
                                          └ apply_ball(): day_scores, week_scores,
                                            type_stats, profiles.total_ball, streak
   ← [{cid, status, ball, flag, reason}], week_ball, tier
 nzSync.ack(cid); Main liga kartasini server qiymati bilan yangilaydi
```

- **Idempotent:** `cid` (mijoz UUID v4) — qayta yuborilsa avvalgi javob qaytadi.
- **Yosh chegarasi:** `playedAt` ≤ hozir + 5 daq va ≥ hozir − 7 kun, aks holda
  `stale` (ball yoʻq). Ball **qabul qilingan paytdagi** server haftasiga yoziladi
  (mijoz soati hech qachon hafta tanlamaydi). Yakshanba kechqurun oflayn
  oʻynalgan natija dushanba kelsa — yangi haftaga. Bu qoida Maxfiylik emas,
  «Qanday ishlaydi» sahifasida bitta jumla bilan yoziladi.
- Hajm: payload ≤ 64 KB, oʻyin jurnali ≤ 5 000 hodisa, `durationMs` ≤ 20 daq,
  savol `ms` 0…600 000.

### 6.2 Tur boʻyicha tekshiruv

| `kind` | Payload | Server | Ball |
|---|---|---|---|
| `test` | `session.payload()` (`mode: 'test'`) | `IQ.session.verify(payload)` (toʻliq boʻlishi shart) → Result; `reliable`, `iq`, `lo`, `hi` saqlanadi | 10 × toʻgʻri, agar `flag` ∈ {null, 'short'}; `chance`/`fast` → 0. Kuniga ≤ 2 test ball beradi |
| `practice` | `session.payload()` (`mode: 'practice'`, `startLevels`) | `IQ.session.verify(payload, { allowPartial: true })` — mashq erta tugashi mumkin; id lar mos kelishi shart | 10 × toʻgʻri; mediana ms < 1 500 (≥ 5 javob) → 0 |
| `review` | `{ items: [{ id, answer, ms }] }` (Xatolarim/Saqlangan) | Har `id` = `type:level:seed` → `IQ.makeItem(type, seed, level)` (id qayta yaratilgan item.id ga teng boʻlishi shart), javob tekshiriladi; ≤ 50 item | 10 × toʻgʻri, kuniga ≤ 300 |
| `game` | `{ game, seed, level, log, result }` | `IQ.games.replay(id, seed, level, log)` → `result()`; `done` boʻlishi shart; mijoz `result` bilan mos kelmasa `mismatch` (log saqlanadi, tahlil uchun) | `points` (server hisoblagani) |
| `duel` | `duel` Edge Function orqali (§4.8), `submit` ga kelmaydi | §6.5 | §4.8.4 |

- Ogʻzaki bank (`key` li) savollari: foydalanuvchi uchun **bir martalik** ball
  (`verbal_scored(user_id, key)`, ≤ 134 qator/foydalanuvchi) — v1.1 «bir
  savolga bir marta» qoidasining serverdagi aniq qismi. Generator savollarida
  urugʻ fazosi cheksiz; ular uchun sessiya ichida takrorlanmaslik (ENGINE 2) va
  kunlik chegara amal qiladi.
- Test natijasi (`reliable`) → `profiles.iq_best` (faqat tekshirilgan) —
  sertifikat (v2.2) va ixtiyoriy «Eng yaxshi IQ» shu yerdan.
- Tekshirilmagan natija mijozda qoladi: ilova uni Profil tarixida koʻrsatadi
  (v1.1), lekin ball faqat server javobidan.

### 6.3 Engine / build versiyasi siyosati

CONTRACT §10 dagi ochiq masala shunday yopiladi:

1. **`IQ.BUILD`** — build yasaydigan qatʼiy 12 belgili hash:
   `sha256(src/iq/rng.js + index.js + score.js + session.js + gen/*.js (alifbo)
   + content/verbal.json + src/games/index.js + src/games/*.js (alifbo))`.
   Qoʻshimcha `IQ.BUILDS = { session: 'a1b2…', gen: { matrix: '…', … }, games:
   { schulte: '…', … } }` — har qism alohida (oʻyin duelida faqat oʻsha oʻyin
   hashi solishtiriladi). `nzSite.iqBuild = IQ.BUILD`.
2. `IQ.session.ENGINE` (2) qoladi — u algoritm versiyasi; `BUILD` esa kontent
   va kodning aniq nusxasi. Payloadda ikkalasi ham (`engine`, `build`).
3. **`tools/mkedge.mjs`** (WP-B0) har reliz buildʼida
   `supabase/functions/_shared/iq/<BUILD>.js` ni yozadi: xuddi shu fayllar
   CONTRACT §1 tartibida, boshida Deno shimi (`globalThis.window = globalThis`,
   xotiradagi `localStorage`), oxirida `export default globalThis.IQ`.
   `_shared/iq/index.json`: `[{ build, versionCode, releasedAt }]`.
4. **Qoʻllab-quvvatlash oynasi:** server oxirgi **3** reliz buildʼini va 90
   kundan yosh har buildni saqlaydi. Eskisi → `unsupported`: natija mijozda
   qoladi, toast «Natija reytingga kirmadi — ilovani yangilang» (kuniga bir marta).
   `app_config.min_version_code` shu bilan birga oshiriladi.
5. **Paritet darvozasi (CI):** `tools/mkgolden.mjs` 500 ta test/mashq payloadi
   (tasodifiy javoblar), 300 ta oʻyin jurnali (tasodifiy bosuvchi bot) va 100
   review toʻplamini yozadi; `tests/edge-parity.test.mjs` (Node) va
   `supabase/functions/tests/parity_test.ts` (Deno) ikkalasi bir xil JSON
   natija berishi shart. Farq → reliz toʻxtaydi.
6. Generator yoki oʻyin oʻzgarsa BUILD oʻzi oʻzgaradi (qoʻlda versiya yoʻq);
   eski natijalar qayta tekshirilmaydi — `verified_results.build` saqlanadi.
7. Duel: savol duelida savollarni server yaratadi (mijoz buildi ahamiyatsiz,
   faqat chizadi). Oʻyin duelida duel yaratilganda `spec.gameBuild` yoziladi;
   raqib ilovasidagi `IQ.BUILDS.games[id]` boshqacha boʻlsa [Oʻynash] oʻrnida
   «Bu duel uchun ilovani yangilang».

### 6.4 Kunlik chegaralar (Toshkent kuni, 04:00)

| Manba | Chegara |
|---|---|
| Savol balli (test + mashq + review + savol duellari) | ≤ 1 500 ◆/kun (150 toʻgʻri javob) |
| Review | ≤ 300 ◆/kun (yuqoridagi ichida) |
| Test | ball beradigan test ≤ 2/kun |
| Oʻyin balli (oʻyin + oʻyin duellari) | ≤ 20 oʻyin/kun hisoblanadi |
| Duel gʻalaba bonusi | ≤ 5 × 20 = 100 ◆/kun, bir juftlik bilan ≤ 1 |

Chegaradan oshgan natija saqlanadi va tekshiriladi (statistika, nishonlar),
faqat ball 0. Mijozga `capped: true` qaytadi; Natija ekranidagi 28 px mukofot
qatorida ◆ chipi oʻrniga «Bugungi ball chegarasi» 13/600 (bir marta, joy oʻsha).
Hisob-kitob: faol halol foydalanuvchi (≈ 1 soat/kun) Olmos ligasiga (5 000/hafta)
4–5 kunda yetadi; chegara faqat bot va «24 soat» fermani toʻsadi.

### 6.5 `duel` Edge Function — savol dueli

- `create`: spec tekshiriladi, `duels` (PENDING) va `duel_secrets.seed =
  random uint32` yoziladi.
- `start`: `IQ.session.create({ mode: 'duel', seed, types, length: 10, level })`
  (§13.4, WP4 qoʻshadi: qatʼiy daraja, moslashuv yoʻq, ogʻzaki bankning
  `practice` qismi, takrorlanmaslik ENGINE 2 dagidek) bilan 10 savol yaratiladi;
  mijozga `[{ n, type, prompt, stimulus, options }]` (toʻgʻri javob, izoh, id,
  urugʻ yoʻq) va `deadline` qaytadi; `duel_plays.started_at` yoziladi.
  Qayta chaqirilsa (ilova yopilgan) — xuddi shu savollar va saqlangan javoblar.
- `answer` (ixtiyoriy, har savoldan keyin): `{ n, answer, ms }` saqlanadi —
  tiklash va vaqtni kuzatish uchun. Internet uzilsa javoblar mijozda turadi va
  `submit` da hammasi birga keladi.
- `submit`: server javoblarni oʻz savollariga solishtiradi, `ms` yigʻindisini
  server oraligʻi (`submitted_at − started_at`) bilan chegaralaydi, `fast`
  qoidasini qoʻllaydi, natijani yozadi; ikkinchi topshiruvda gʻolibni aniqlaydi,
  ball (`apply_ball`) va bildirishnomalarni yozadi.
- `review` (faqat DONE): savollar `correct` va `explain` bilan.
- Oʻyin dueli: `start` urugʻ va darajani qaytaradi; mijoz oddiy oʻyin kodini
  ishlatadi; `submit` jurnal bilan keladi, server `replay` qiladi.

---

## 7. Maʼlumot modeli (Supabase Postgres)

### 7.1 Tamoyillar

1. **Yangi Supabase loyihasi** «iquest» (Nazariy bazasi emas). Mavjud
   `0001`–`0005` migratsiyalari (profiles, rollar, `has_role`, audit, savollar
   banki) qoʻllanadi va qayta ishlatiladi; v2 migratsiyalari `0010` dan boshlanadi.
2. Har jadvalda RLS yoqilgan; standart — hech kimga ruxsat yoʻq (README §2).
3. **Oʻqish** — RLS siyosati yoki `security definer` RPC; **yozish** — faqat
   RPC (SQL, oddiy qoidalar) yoki Edge Function (`service_role`, JS kerak
   boʻlganda: filtr, tekshiruv, FCM, auth). Mijozda toʻgʻridan-toʻgʻri
   INSERT/UPDATE/DELETE siyosati yoʻq.
4. Kod nomlari: mobil buildda `ROLES`/`REASONS` taqiqlangan — SQL da
   `member_kind`, `report_kind`, `reason_code`; JS da `MEMBER_KINDS`, `REPORT_KINDS`.
5. Vaqt `timestamptz`; «kun» va «hafta» `Asia/Tashkent`, 04:00 chegarasi:
   `public.iq_day(ts) = ((ts at time zone 'Asia/Tashkent') - interval '4 hours')::date`,
   `public.iq_week(ts) = date_trunc('week', iq_day(ts))::date` (dushanba).

### 7.2 Migratsiyalar

| Fayl | Tarkibi | Ega |
|---|---|---|
| `0010_accounts.sql` | `citext`, enumlar, `profiles` kengaytmasi, `app_config`, `login_nonces`, yosh va aloqa yordamchilari, `claim_username`, `profile_card`, `rate_limit` | WP-B1 |
| `0011_results.sql` | `verified_results`, `day_scores`, `week_scores`, `type_stats`, `verbal_scored`, `apply_ball`, `leaderboard_cache`, `leaderboard`, `my_rank`, `teacher_board` | WP-B1 |
| `0012_social.sql` | `friendships`, `blocks`, `notifications`, `push_tokens`, `friend_*` RPC lar, `block_user`, `notifications_*` | WP-B1 |
| `0013_groups_chat.sql` | `groups`, `group_members`, `group_requests`, `chats`, `dm_pairs`, `messages`, `chat_reads`, Realtime siyosatlari va triggerlari, `my_chats`, `chat_messages`, `group_*` oʻqish RPC lari | WP-B1 |
| `0014_duels.sql` | `duels`, `duel_secrets`, `duel_plays`, `duel_view`, `my_duels`, muddat cron | WP-B4 |
| `0015_wallet.sql` | `wallet_ledger`, `purchases`, `badges_earned`, `legacy_imports`, `my_wallet` | WP-B1 |
| `0016_moderation.sql` | `reports`, `mod_actions` (faqat qoʻshish), `teacher_requests`, avto-yashirish triggeri, `mod_queue`, `mod_context` | WP-B1 |
| `0017_cron.sql` | `pg_cron` ishlari (§7.6) | WP-B1 |

Har migratsiyaga `supabase/tests/00NN_*.sql` tekshiruvi (mavjud uslub:
`_stub.sql` + rollar taqlidi + «HAMMA TEKSHIRUV OʻTDI»).

### 7.3 Jadvallar

```sql
-- ── 0010 ────────────────────────────────────────────────────────────────
create extension if not exists citext;
create type account_kind as enum ('student','teacher','other');
create type age_band     as enum ('13_15','16_17','18p');
create type audience     as enum ('all','friends','none');

alter table profiles                                   -- 0001 dagi jadval (id, tg_id, role, …)
  alter column username type citext,
  add column bio            text     check (char_length(bio) <= 80),
  add column color          text     not null default 'purple',        -- catalog id
  add column avatar_kind    text     not null default 'initial' check (avatar_kind in ('initial','preset')),
  add column avatar_preset  text,                                       -- IQ_AVATARS id
  add column kind           account_kind,
  add column birth_ym       date,                                       -- oyning 1-kuni; FAQAT egasi va xodim
  add column band           age_band,                                   -- cron yangilaydi
  add column region         smallint check (region between 1 and 15),
  add column teacher_ok_at  timestamptz,                                -- ✓ tasdiqlangan
  add column profile_vis    audience not null default 'all'     check (profile_vis in ('all','friends')),
  add column dm_from        audience not null default 'friends' check (dm_from in ('friends','none')),
  add column duel_from      audience not null default 'friends' check (duel_from in ('friends','none')),
  add column in_rankings    boolean  not null default true,
  add column show_best_iq   boolean  not null default false,
  add column terms_version  smallint,
  add column onboarded_at   timestamptz,
  add column username_changed_at timestamptz,
  add column region_changed_at   timestamptz,
  add column total_ball     bigint   not null default 0,
  add column best_week_ball int      not null default 0,
  add column streak         smallint not null default 0,
  add column longest_streak smallint not null default 0,
  add column last_day       date,
  add column iq_best        smallint, add column iq_best_lo smallint, add column iq_best_hi smallint,
  add column duel_w int not null default 0, add column duel_l int not null default 0, add column duel_d int not null default 0,
  add column showcase       text[]   check (cardinality(showcase) <= 3),
  add column muted_until    timestamptz,                                -- platforma: yozish taqiqi
  add column banned_until   timestamptz,
  add column deleted_at     timestamptz;
create unique index profiles_username_uq on profiles (username) where username is not null;
create index profiles_region_idx on profiles (region) where in_rankings;

create table app_config  (key text primary key, value jsonb not null, updated_at timestamptz default now());
create table login_nonces(nonce text primary key, tg_id bigint, tg_name text, created_at timestamptz default now(), used_at timestamptz);
create table rate_counters(user_id uuid, bucket text, win_start timestamptz, n int, primary key (user_id, bucket, win_start));
create table username_holds(username citext primary key, until timestamptz not null);   -- oʻchirilgan hisob nomi 30 kun

-- ── 0011 ────────────────────────────────────────────────────────────────
create table verified_results (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles on delete cascade,
  cid uuid not null,                               -- mijoz idempotentlik kaliti
  kind text not null check (kind in ('test','practice','review','game','duel')),
  build text not null, engine smallint,
  game text, level smallint, n smallint, correct smallint, points int,
  flag text, reliable boolean, iq smallint, lo smallint, hi smallint,
  ball int not null default 0, capped boolean not null default false,
  status text not null check (status in ('ok','rejected','stale','unsupported','mismatch')),
  reason text,
  payload jsonb,                                   -- 90 kundan keyin null (cron)
  played_at timestamptz, created_at timestamptz not null default now(),
  day date not null, week date not null,
  unique (user_id, cid));
create index vr_user_idx on verified_results (user_id, created_at desc);

create table day_scores  (user_id uuid references profiles on delete cascade, day date,
  ball int not null default 0, q_ball int not null default 0, review_ball int not null default 0,
  games smallint not null default 0, tests smallint not null default 0, duel_bonus smallint not null default 0,
  answers int not null default 0, primary key (user_id, day));
create table week_scores (user_id uuid references profiles on delete cascade, week date,
  ball int not null default 0, updated_at timestamptz default now(), primary key (user_id, week));
create index week_scores_board on week_scores (week, ball desc);
create table month_scores(user_id uuid references profiles on delete cascade, month date,
  ball int not null default 0, primary key (user_id, month));
create index month_scores_board on month_scores (month, ball desc);
create index profiles_total_board on profiles (total_ball desc) where in_rankings and deleted_at is null;
create table type_stats  (user_id uuid references profiles on delete cascade, day date, type text,
  n int not null default 0, correct int not null default 0, primary key (user_id, day, type));
create table verbal_scored(user_id uuid references profiles on delete cascade, key text, primary key (user_id, key));

create table leaderboard_cache (                    -- har 5 daqiqada qayta quriladi
  board text,            -- 'all' | 'students' | 'teachers'
  period text,           -- 'week' | 'month' | 'all'
  region smallint,       -- 0 = Oʻzbekiston (hammasi)
  rank int, user_id uuid, ball bigint, extra jsonb,  -- teachers: { students: 28 }
  built_at timestamptz,
  primary key (board, period, region, rank));

-- ── 0012 ────────────────────────────────────────────────────────────────
create table friendships (a uuid, b uuid, status text check (status in ('pending','accepted')),
  requested_by uuid not null, created_at timestamptz default now(), accepted_at timestamptz,
  primary key (a, b), check (a < b));
create index friendships_b on friendships (b);
create table friend_declines (from_id uuid, to_id uuid, until timestamptz, primary key (from_id, to_id));
create table blocks (blocker uuid, blocked uuid, created_at timestamptz default now(), primary key (blocker, blocked));
create index blocks_blocked on blocks (blocked);
create type notif_kind as enum ('friend_request','friend_accepted','group_invite','group_request','group_joined',
  'group_removed','mention','duel_challenge','duel_accepted','duel_result','duel_expiring','week_result',
  'teacher_status','mod_notice');
create table notifications (id bigint generated always as identity primary key,
  user_id uuid not null references profiles on delete cascade, kind notif_kind not null,
  actor uuid, ref_id text, payload jsonb, created_at timestamptz default now(), read_at timestamptz,
  pushed_at timestamptz);
create index notifications_user on notifications (user_id, id desc);
create table push_tokens (token text primary key, user_id uuid not null references profiles on delete cascade,
  platform text, lang text, created_at timestamptz default now(), seen_at timestamptz);

-- ── 0013 ────────────────────────────────────────────────────────────────
create table groups (id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles, title text not null check (char_length(title) between 3 and 32),
  icon text not null, class_label text check (char_length(class_label) <= 12),
  join_mode text not null default 'request' check (join_mode in ('request','code')),
  chat_mode text not null default 'all' check (chat_mode in ('all','staff')),
  slow_s smallint not null default 10 check (slow_s in (0,10,30,60)),
  invite_code text unique, code_expires_at timestamptz,
  member_limit smallint not null default 40, member_count smallint not null default 0,
  pinned_msg bigint, created_at timestamptz default now(), archived_at timestamptz);
create table group_members (group_id uuid references groups on delete cascade, user_id uuid references profiles on delete cascade,
  member_kind text not null check (member_kind in ('owner','admin','member')),
  joined_at timestamptz default now(), muted_until timestamptz, primary key (group_id, user_id));
create index group_members_user on group_members (user_id);
create table group_requests (group_id uuid references groups on delete cascade, user_id uuid references profiles on delete cascade,
  via text check (via in ('code','invite')), created_at timestamptz default now(), primary key (group_id, user_id));
create table chats (id uuid primary key default gen_random_uuid(), kind text not null check (kind in ('group','dm')),
  group_id uuid unique references groups on delete cascade, last_msg_id bigint, last_msg_at timestamptz);
create table dm_pairs (chat_id uuid primary key references chats on delete cascade, a uuid not null, b uuid not null,
  unique (a, b), check (a < b));
create table messages (id bigint generated always as identity primary key,
  chat_id uuid not null references chats on delete cascade, sender_id uuid references profiles on delete set null,
  kind text not null default 'text' check (kind in ('text','system','duel')),
  body text check (char_length(body) <= 500), meta jsonb, reply_to bigint,
  created_at timestamptz not null default now(),
  deleted_at timestamptz, deleted_by uuid, hidden_at timestamptz, report_n smallint not null default 0);
create index messages_chat on messages (chat_id, id desc);
create table chat_reads (chat_id uuid references chats on delete cascade, user_id uuid references profiles on delete cascade,
  last_read_id bigint not null default 0, muted boolean not null default false, primary key (chat_id, user_id));

-- ── 0014 ────────────────────────────────────────────────────────────────
create table duels (id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('blitz','type','game','bo3')),
  spec jsonb not null,               -- { n:10, level:5, types:[…], limit_s:180, game?, gameBuild? }
  a uuid not null references profiles, b uuid not null references profiles, check (a <> b),
  status text not null check (status in ('pending','active','done','declined','expired','cancelled')),
  group_id uuid references groups on delete set null, rematch_of uuid,
  created_at timestamptz default now(), accepted_at timestamptz, deadline_at timestamptz not null,
  winner uuid, draw boolean, technical boolean, summary jsonb);   -- summary faqat DONE da
create index duels_a on duels (a, created_at desc);
create index duels_b on duels (b, created_at desc);
create table duel_secrets (duel_id uuid primary key references duels on delete cascade, seed bigint not null);
create table duel_plays (duel_id uuid references duels on delete cascade, user_id uuid references profiles on delete cascade,
  started_at timestamptz, submitted_at timestamptz, answers jsonb, correct smallint, ms int,
  points int, score int, flag text, ball int, primary key (duel_id, user_id));

-- ── 0015 ────────────────────────────────────────────────────────────────
create table wallet_ledger (id bigint generated always as identity primary key,
  user_id uuid not null references profiles on delete cascade, amount int not null check (amount > 0),
  src text not null, idem_key text not null, created_at timestamptz default now(), unique (user_id, idem_key));
create table purchases (user_id uuid references profiles on delete cascade, item_id text, price int not null,
  src text not null default 'shop', at timestamptz default now(), primary key (user_id, item_id));
create table badges_earned (user_id uuid references profiles on delete cascade, badge_id text,
  src text not null default 'play', at timestamptz default now(), primary key (user_id, badge_id));
create table legacy_imports (user_id uuid primary key references profiles on delete cascade,
  device_hash text, at timestamptz default now(), summary jsonb);

-- ── 0016 ────────────────────────────────────────────────────────────────
create table reports (id bigint generated always as identity primary key,
  reporter uuid references profiles on delete set null,
  target_kind text not null check (target_kind in ('user','message','group','duel')),
  target_id text not null,
  report_kind text not null check (report_kind in ('spam','harassment','hate','sexual','self_harm',
                                                   'child_safety','cheating','impersonation','other')),
  note text check (char_length(note) <= 300),
  status text not null default 'open' check (status in ('open','actioned','dismissed')),
  priority smallint not null default 2,      -- child_safety, self_harm = 0
  created_at timestamptz default now(), resolved_by uuid, resolved_at timestamptz, action text,
  unique (reporter, target_kind, target_id));
create table mod_actions (id bigint generated always as identity primary key,
  actor uuid not null, action text not null, target_kind text, target_id text,
  reason_code text not null, note text, created_at timestamptz default now());   -- UPDATE/DELETE trigger bilan taqiqlangan
create table teacher_requests (user_id uuid primary key references profiles on delete cascade,
  school text, region smallint, subject text, note text, status text default 'open',
  created_at timestamptz default now(), decided_by uuid, decided_at timestamptz, decision_note text);
```

### 7.4 Yordamchi funksiyalar (hammasi `stable security definer set search_path = public`)

| Funksiya | Nima qaytaradi |
|---|---|
| `is_minor(uid)` | `band in ('13_15','16_17')` |
| `same_age_class(a, b)` | ikkalasi voyaga yetmagan yoki ikkalasi 18+ |
| `blocked_between(a, b)` | istalgan tomondan blok bor |
| `are_friends(a, b)` | `accepted` doʻstlik |
| `share_group(a, b)` | ikkalasi bir faol guruh aʼzosi |
| `is_active(uid)` | `onboarded_at` bor, `deleted_at` va amaldagi `banned_until` yoʻq |
| `can_dm(a, b)` | `is_active` ikkalasi · `are_friends` · `same_age_class` · `not blocked_between` · `b.dm_from = 'friends'` · `app_config.dm` |
| `can_duel(a, b)` | `is_active` · `not blocked_between` · (`are_friends` yoki `share_group`) · `b.duel_from = 'friends'` |
| `full_view(viewer, target)` | `viewer = target` · xodim · (`target` 18+ va `profile_vis = 'all'`) · `are_friends` · `share_group` |
| `is_group_member(g)` / `is_group_staff(g)` | `auth.uid()` aʼzo / ega yoki admin (arxivlanmagan guruh) |
| `is_chat_member(c)` | guruh chati → `is_group_member`; DM → `dm_pairs` da |
| `rate_limit(bucket, max, window)` | `rate_counters` ga upsert; oshsa `raise exception 'rate:<bucket>'` |

### 7.5 RLS siyosatlari

«EF» — faqat Edge Function (`service_role`, RLS ni chetlab oʻtadi). «RPC» —
`security definer` funksiya, ichida `auth.uid()` va qoidalar tekshiriladi.

| Jadval | SELECT (mijoz) | INSERT / UPDATE / DELETE |
|---|---|---|
| `profiles` | Faqat oʻz qatori (`id = auth.uid()`), xodim — hammasi. Boshqalar: `profile_card(uid)` RPC (maydonlar `full_view` ga qarab), `search_user(username)` RPC (aniq moslik, blok/oʻchirilgan/ban → null) | EF `profile-save` (nom, bio, rang, avatar, vitrina, maxfiylik), EF `account` (yosh, tur, hudud, shartlar). `role` ni hech kim oʻzgartira olmaydi (0001 qoidasi saqlanadi) |
| `app_config` | anon ham oʻqiydi | faqat SQL Editor |
| `login_nonces`, `rate_counters`, `username_holds`, `duel_secrets`, `legacy_imports` | **yoʻq** | faqat EF / RPC ichida |
| `verified_results` | oʻziniki (payloadsiz koʻrinish `my_results`) | EF `submit` |
| `day_scores`, `week_scores`, `month_scores`, `type_stats` | oʻziniki | EF (`apply_ball`) |
| `leaderboard_cache` | yoʻq — `leaderboard(board, period, region, offset)` RPC (autentifikatsiya shart, 100 qator, faqat ommaviy maydonlar: nom, avatar, rang, liga, ball) | cron |
| `friendships` | `auth.uid() in (a, b)` | RPC `friend_request(uid)`, `friend_respond(uid, ok)`, `unfriend(uid)` |
| `blocks` | `blocker = auth.uid()` | RPC `block_user(uid)`, `unblock_user(uid)` (blok doʻstlikni oʻchiradi, ochiq duellarni bekor qiladi) |
| `notifications` | `user_id = auth.uid()` | trigger va EF yozadi; RPC `notifications_read(upto_id)` |
| `push_tokens` | yoʻq | RPC `push_register(token, lang)`, `push_unregister(token)` |
| `groups` | `is_group_member(id)` yoki xodim; kod boʻyicha: `group_preview(code)` RPC (nom, belgi, ega nomi, aʼzolar soni, join_mode; 10/soat) | EF `group` (create, update, rotate_code, archive, transfer) |
| `group_members` | `is_group_member(group_id)` | EF `group` (join, approve, invite-accept, leave, remove, mute, promote) |
| `group_requests` | `user_id = auth.uid()` yoki `is_group_staff(group_id)` | EF `group` |
| `chats`, `dm_pairs` | `is_chat_member(id)` | EF (`chat-send` birinchi DM da yaratadi, `group` guruh bilan) |
| `messages` | `is_chat_member(chat_id)` va `hidden_at is null` (yoki xodim); matn `deleted_at` boʻlsa `null` qaytadi — oʻqish `chat_messages(chat_id, before_id, limit ≤ 50)` RPC orqali (blok belgisi qoʻshiladi) | EF `chat-send`; RPC `message_delete(id)` (oʻziniki 24 soat / guruh xodimi) |
| `chat_reads` | `user_id = auth.uid()` | RPC `chat_read(chat_id, upto_id)`, `chat_mute(chat_id, on)` |
| `duels` | `auth.uid() in (a, b)`; `summary` DONE gacha `null` | EF `duel` |
| `duel_plays` | oʻziniki; raqibniki faqat duel DONE boʻlganda | EF `duel` |
| `wallet_ledger`, `purchases`, `badges_earned` | oʻziniki (`my_wallet()` RPC: balans = Σ ledger − Σ narx) | EF `wallet` |
| `reports` | `reporter = auth.uid()` (faqat holat) ; xodim — hammasi | RPC `report(target_kind, target_id, report_kind, note)` (20/kun, bir obyektga bir marta); xodim — EF `mod` |
| `mod_actions` | `has_role('{moderator,auditor,owner}')` | EF `mod` (faqat qoʻshish) |
| `teacher_requests` | oʻziniki; xodim — hammasi | RPC `teacher_request(...)`; EF `mod` qaror |
| `realtime.messages` (kanal ruxsati) | `topic = 'user:' || auth.uid()` yoki (`topic like 'chat:%'` va `is_chat_member(topic uuid)`) | mijoz yozmaydi (INSERT siyosati yoʻq) |

**Moderator va DM:** xodim `messages` ni toʻgʻridan-toʻgʻri SELECT qiladi, lekin
admin panel faqat `mod_context(report_id)` RPC dan foydalanadi (shikoyat
qilingan xabar ± 10 ta, har chaqiruv `mod_actions` ga `view_context` yozadi).
Auditor jurnaldan kim nimani koʻrganini tekshiradi.

### 7.6 `pg_cron` ishlari

| Vaqt | Ish |
|---|---|
| har 5 daqiqa | `rebuild_leaderboards()` — `week`/`month`/`all` × `all`/`students`/`teachers` × 16 hudud, har biri top 1 000 |
| har 10 daqiqa | `expire_duels()` — PENDING > 24 soat, ACTIVE deadline oʻtgan; `duel_expiring` (2 soat qolganda, bir marta) |
| har kuni 00:10 (Toshkent) | `refresh_bands()` (yosh guruhi), streak tuzatish (kun oʻtib ketganlarga 0) |
| dushanba 04:15 | `close_week()` — oʻtgan hafta `best_week_ball`, `week_result` bildirishnomasi |
| har kuni 03:00 | Saqlash muddatlari: xabarlar > 365 kun oʻchadi; bildirishnomalar > 60 kun; `verified_results.payload` > 90 kun → `null`; `day_scores`/`type_stats` > 400 kun; `rate_counters` > 2 kun; `login_nonces` > 1 kun; `purge_deleted()` (oʻchirishga 30 kun toʻlganlar) |
| har soat | Guruh kodi muddati tugaganlarni tozalash; 14 kunlik javobsiz `group_requests` |

Reyting hisoblash narxi: 200 000 faol foydalanuvchida ham `week_scores` dan
bitta indeksli `row_number()` — < 2 s; `my_rank()` — `count(*) where ball >
mine` indeks boʻyicha (top 1 000 dan tashqaridagi oʻz oʻrni uchun).

---

## 8. Edge Functions

Hammasi `supabase/functions/<nom>/index.ts`, Deno, `service_role` faqat serverda.
Umumiy: `_shared/auth.ts` (JWT → user, `is_active`, `banned_until`),
`_shared/limits.ts` (`rate_limit` RPC), `_shared/filter.js` (`src/profile.js`
bundleʼi: `validateUsername`, `cleanBio`, **yangi `scan(text, opts)`**),
`_shared/catalog.js` (`src/catalog.js`), `_shared/iq/<BUILD>.js`,
`_shared/push-i18n.json`, `_shared/errors.ts` (bir xil xato shakli
`{ error: 'code', retryAfter? }`).

| Funksiya | Amallar (`action`) | Asosiy qoidalar | Chegara |
|---|---|---|---|
| `submit` | — (natijalar toʻplami) | §6 | 30 soʻrov/daq, 20 natija/soʻrov |
| `duel` | `create`, `respond`, `cancel`, `start`, `answer`, `submit`, `review`, `rematch` | §4.8, §6.5 | create 20/kun; answer 60/daq |
| `chat-send` | — | `can_dm` yoki guruh aʼzoligi + chat rejimi + `muted_until` + sekin rejim; `scan()` (bad, link, phone, mention); ilk DM da `chats`+`dm_pairs` yaratadi; `@nom` → `mention` | 20/daq, 1 000/kun |
| `profile-save` | — | `validateUsername`, `cleanBio`, rang egaligi (`purchases` yoki bepul), avatar preset roʻyxatda, vitrina nishonlari `badges_earned`/`purchases` da; nom 30 kunda 1 marta | 30/soat |
| `group` | `create`, `update`, `rotate_code`, `join`, `cancel_request`, `approve`, `reject`, `invite`, `invite_respond`, `leave`, `remove`, `mute`, `promote`, `demote`, `transfer`, `archive` | §4.2–§4.3, oʻqituvchi limitlari §3.4; nom `scan()` | create 3/kun; join 10/soat |
| `wallet` | `sync` (kirimlar toʻplami), `spend`, `import` | §5.2 | 30/daq |
| `account` | `onboard` (yosh, tur, hudud, shartlar), `import` (§14), `delete`, `export` (v2.1) | §3 | — |
| `auth-telegram` | `nonce`, `poll` | §3.1 | IP boʻyicha 30/daq |
| `tg-bot` | Telegram webhook (`/start login_<nonce>`) | `X-Telegram-Bot-Api-Secret-Token` tekshiruvi | — |
| `push` | DB webhook: `notifications` INSERT va `messages` INSERT | FCM HTTP v1 (xizmat hisobi kaliti Supabase secrets da); jim soatlar; yigʻish; oʻlik tokenni oʻchirish | — |
| `mod` | `resolve`, `hide`, `restore`, `delete_message`, `warn`, `mute_user`, `ban`, `unban`, `reset_profile`, `teacher_decide`, `archive_group` | `has_role(moderator, owner)`; har amal `mod_actions` ga `reason_code` bilan; ban → `auth.admin.signOut(user, 'global')` | — |

**`scan(text, opts)`** (WP2, `src/profile.js` ga qoʻshiladi, sof funksiya):
`→ { bad: bool, link: bool, phone: bool, mentions: string[] }`. Normallashtirish
v1.1 dagi bilan bir xil (kichik harf, kirill → lotin, leet); `phone` — boʻshliq,
tire, qavs, nuqta olib tashlangach ≥ 7 ketma-ket raqam yoki `+998`; `link` — bio
regexi (`@\w{4,}` ni `mentions` ga ajratadi). Mijoz ham, server ham aynan shu
funksiyani chaqiradi (bitta haqiqat manbai).

---

## 9. Realtime

- **Mijoz:** `src/realtime.js` — SDKʼsiz Phoenix protokoli (`phx_join`,
  `heartbeat` 25 s, `access_token` yangilanishi), ≈ 250 qator, `node:vm` da
  soxta WebSocket bilan testlanadi. Ulanish faqat ilova oldingi planda va
  foydalanuvchi Suhbatlar, Guruh, Suhbat yoki Duel ekranida boʻlganda; fonga
  ketgach 30 s da uziladi (batareya, «peak connections» narxi).
- **Kanallar (hammasi `private: true`):**

| Kanal | Kim oʻqiydi | Hodisalar |
|---|---|---|
| `user:<uid>` | faqat oʻzi | `notif` (yangi bildirishnoma), `unread` (suhbatlar soni), `duel` (holat oʻzgardi), `chat_new` (roʻyxat uchun: chat id, vaqt, 60 belgili parcha) |
| `chat:<chat_id>` | chat aʼzolari | `msg` (yangi xabar), `msg_del` (oʻchirildi/yashirildi), `pin`, `mode` (chat rejimi) |

- **Yuboruvchi — faqat baza:** `messages` AFTER INSERT/UPDATE triggeri
  `realtime.send(payload, 'msg', 'chat:'||chat_id, true)`; `notifications` va
  `duels` triggerlari `user:<uid>` ga. Mijoz broadcast yubora olmaydi
  (`realtime.messages` da INSERT siyosati yoʻq) — soxta xabar yoʻq.
- **Presence va «yozmoqda» yoʻq** (maxfiylik, narx).
- **Zaxira:** WebSocket 3 marta ulanmasa — ochiq ekranda 15 s da bir
  `chat_messages(after_id)` soʻrovi.
- **Kesh:** `nz-chat-cache` — har suhbatning oxirgi 50 xabari, ≤ 30 suhbat,
  ≤ 400 KB; oflaynda oʻqish uchun. Chiqishda oʻchadi.

---

## 10. Moderatsiya va bolalar xavfsizligi

### 10.1 Oʻqituvchi va oʻquvchi xavfsizligi — nima uchun DM yoʻq

**Qaror:** voyaga yetgan va voyaga yetmagan hisob orasida shaxsiy yozishma va
doʻstlik yoʻq; oʻqituvchi oʻquvchi bilan faqat guruh chatida gaplashadi.
**Asoslar:**
1. **Play Child Safety Standards (CSAE)** va UGC siyosati: ilova bolalarni
   yolgʻiz kattalar bilan yopiq kanalga olib boradigan yoʻlni kamaytirishi
   kerak. Grooming deyarli har doim shaxsiy kanalda boshlanadi.
2. **Maktab amaliyoti:** koʻp mamlakatlarda oʻqituvchi–oʻquvchi aloqasi ochiq
   (sinf, ota-ona koʻradigan) kanalda boʻlishi tavsiya qilinadi. Guruh chati —
   aynan shu: 30 ta guvoh, oʻqituvchining oʻzi ham himoyalangan.
3. **Yosh oʻzi eʼlon qilinadi.** Kattani «oʻquvchi» deb yozilishidan toʻxtatib
   boʻlmaydi; shuning uchun xavfsizlik «oʻqituvchi» yorligʻiga emas, **yosh
   sinfiga** bogʻlangan: har qanday 18+ hisob voyaga yetmaganga DM yoza olmaydi.
4. **Funksiya yoʻqolmaydi:** oʻqituvchining oʻquvchiga aytadigan gapi guruh
   chatida, qadalgan xabarda va (v2.1) Vazifada. Shaxsiy masala — ota-ona va
   maktab orqali, ilova orqali emas.

Qoʻshimcha himoyalar: oʻqituvchi oʻquvchining yoshi, hududi, maktabi va boshqa
guruhlarini koʻrmaydi; guruhdan chiqqan oʻquvchi maʼlumoti (kartasi) darhol
yopiladi; oʻquvchi istalgan payt «Guruhdan chiqish» qiladi va guruhni shikoyat
qila oladi (shikoyat oʻqituvchiga koʻrinmaydi).

### 10.2 Shikoyat va bloklash

- **«⋯ → Shikoyat qilish»** har foydalanuvchi (profil), xabar, guruh va duel
  yonida. `report` varagʻi (480 px): 8 ta radio qator — «Spam», «Haqorat yoki
  tahqirlash», «Nafrat», «Behayo kontent», «Oʻziga zarar yetkazish», «Bolaga
  xavf», «Firibgarlik (duel)», «Boshqa»; ixtiyoriy izoh 76 px (≤ 300); [Yuborish].
  Tasdiq toast «Shikoyat yuborildi. Rahmat». Shikoyat qiluvchi kimligi hech
  kimga (oʻqituvchiga ham) koʻrinmaydi.
- «Bolaga xavf» va «Oʻziga zarar» — **ustuvorlik 0**: moderatorga darhol
  push/email, maqsad javob ≤ 2 soat (ish vaqtida), ≤ 12 soat (tunda). «Oʻziga
  zarar» shikoyatidan keyin shikoyatchiga ishonch telefoni maʼlumoti (sayt
  sahifasi havolasi) koʻrsatiladi.
- **Bloklash** (dialog `blockUser`: «@ali bloklansinmi? U sizga yoza olmaydi,
  duelga chaqira olmaydi va profilingizni koʻrmaydi.» [Bloklash]/[Bekor
  qilish]): doʻstlik oʻchadi, ochiq duellar bekor, DM yopiladi, qidiruvda bir-
  birini topmaydi, umumiy guruhda xabarlari yigʻilgan koʻrinishda. Blokdan
  chiqarish — Sozlamalar → Hisob → Bloklanganlar.
- **Avto-yashirish:** 3 ta mustaqil shikoyat (hisobi ≥ 7 kun, har xil
  foydalanuvchi) → xabar/bio/guruh nomi moderatsiyagacha yashirin; bio va nom
  standart holatga qaytadi («Mehmon» emas — `user12345` vaqtinchalik nom).
  Ommaviy yolgʻon shikoyat: shikoyatlari ≥ 80 % rad etilgan foydalanuvchining
  ovozi avto-yashirishda hisoblanmaydi.

### 10.3 Filtrlar va tezlik chegaralari

| Nima | Chegara |
|---|---|
| Xabar | 20/daqiqa, 1 000/kun; sekin rejim guruhda (standart 10 s) |
| Hisobi < 24 soat | DM yoʻq, doʻstlik soʻrovi yoʻq, guruhda 5 xabar/daqiqa |
| Doʻstlik soʻrovi | 30/kun, 50 kutilayotgan |
| Guruhga qoʻshilish urinishi | 10/soat (kod terish), 10 kutilayotgan soʻrov |
| Guruh yaratish | 3/kun |
| Duel chaqiruvi | 20/kun, 5 kutilayotgan |
| Qidiruv | 60/soat |
| Shikoyat | 20/kun |
| Nom oʻzgartirish | 30 kunda 1 |
| Soʻz filtri | Nom, bio, guruh nomi, sinf yorligʻi, xabar — `scan()`; rad etilgan urinishlar hisoblanadi: 10 ta/soat → 1 soat yozish taqiqi (avtomatik `muted_until`) |

### 10.4 Oʻqituvchi vositalari (guruh ichida)

Xabarni oʻchirish, qadash, aʼzoni ovozsiz qilish (1 soat / 1 kun / 7 kun),
guruhdan chiqarish (qayta qoʻshilish faqat yangi soʻrov bilan), chat rejimi
(«Faqat oʻqituvchilar»), sekin rejim, kodni yangilash, soʻrovlarni tasdiqlash,
yordamchi tayinlash, guruhni arxivlash. Har amal guruh chatiga tizim xabari
(«Oʻqituvchi @ali ni 1 soatga ovozsiz qildi» — faqat ovozsiz va chiqarish,
xabar oʻchirishda emas) va `mod_actions` ga yoziladi (`actor` = oʻqituvchi,
`reason_code = 'group_tool'`) — oʻqituvchi suiisteʼmolini moderator koʻra oladi.

### 10.5 Admin panel (mavjud admin buildni qayta ishlatish)

`node build.mjs --target=admin` → `dist/admin/` (mavjud: kirish, `ROLES`,
`confirm` oynasi va `logAction`). Yangi **«Moderatsiya»** boʻlimi (WP7 V6):

| Ekran | Tarkibi |
|---|---|
| Navbat | `mod_queue` — ochiq shikoyatlar, ustuvorlik va yosh boʻyicha tartib, SLA taymeri (24 soat, 0-ustuvorlik 2 soat) |
| Shikoyat | Obyekt, `mod_context` (± 10 xabar), shikoyatchilar soni, avvalgi qarorlar; tugmalar: Rad etish · Yashirish · Oʻchirish · Ogohlantirish · Yozishni taqiqlash (1 kun/7 kun) · Ban (7 kun/doimiy) · Profilni tozalash — har biri `confirm` + majburiy `reason_code` |
| Foydalanuvchi | Profil (yosh sinfi, hisob yoshi, kirish usuli), shikoyatlar tarixi, `mod_actions`, guruhlari, DM **mazmunisiz** statistika |
| Guruh | Aʼzolar, oʻqituvchi amallari jurnali, shikoyatlar, «Guruhni arxivlash» |
| Oʻqituvchi soʻrovlari | `teacher_requests` navbati, guruh faolligi, qaror (✓ / rad + sabab) |
| Duel shubhalari | Tez/bot bayroqli natijalar, gʻalaba fermasi juftliklari (bir juftlik haftada ≥ 5 duel, bir tomonlama natija) |
| Jurnal | `mod_actions` (auditor faqat oʻqiydi) |

Rollar mavjud `app_role` enumidan: `moderator` (navbat, amallar), `support`
(foydalanuvchi kartasi, oʻqituvchi soʻrovlari), `auditor` (faqat jurnal),
`owner` (hammasi + `app_config`). Xodim hisoblari reytinglarda chiqmaydi.

### 10.6 Play UGC talablari — chiqishdan oldingi roʻyxat

1. Hamjamiyat qoidalari ilova ichida birinchi ijtimoiy amaldan **oldin**
   qabul qilinadi (K5) va saytda `/qoidalar/`.
2. Shikoyat har UGC turida (profil, xabar, guruh, duel), bloklash har
   foydalanuvchida — §10.2.
3. Moderatsiya: 24 soat ichida javob, 0-ustuvorlik 2/12 soat; kamida 2 ta
   moderator (egasi + 1), navbat bosh qolmasin.
4. Hisobni ilova ichida va vebda oʻchirish — §3.6.
5. Child Safety Standards: `/bolalar-xavfsizligi/` sahifasi (CSAE taqiqi,
   shikoyat yoʻli, aloqa shaxsi, huquqni muhofaza qilish organlariga xabar berish
   tartibi), Play Console da aloqa nuqtasi eʼlon qilinadi.
6. Maqsadli auditoriya 13+ (Families dasturi **emas**); IARC soʻrovnomasi
   yangilanadi: «Users can interact», «Shares user-generated content», «Digital
   purchases: no», «Unrestricted internet: no».
7. Data safety yangilanadi (§12.2).
8. Ilova tavsifida (PLAY.md) chat va guruhlar borligi aytiladi.

---

## 11. Suiisteʼmol holatlari

| # | Holat | Qanday aniqlanadi / toʻsiladi |
|---|---|---|
| 1 | Oʻzgartirilgan APK soxta natija yuboradi | Server qayta yaratadi/qayta oʻynaydi (§6.2); mos kelmasa `rejected` |
| 2 | Bot mashqda toʻgʻri javoblarni hisoblab ball yigʻadi | Kunlik chegara 1 500, `fast` qoidasi, reyting top 100 dagi keskin sakrash (hafta balli > oldingi 4 hafta oʻrtachasidan 5×) → `mod_queue` ga «shubhali», tekshirilguncha reytingda yashirin |
| 3 | Oʻyin jurnalini sintez qilish | Replay qonuniyligi, 120 ms qoidasi, reaksiya vaqti dispersiyasi juda past (< 15 ms) → shubhali |
| 4 | Duelda kelishib yutqazish | Bonus 1/juftlik/kun, 5/kun; tanga yoʻq; juftlik statistikasi admin panelda |
| 5 | Oʻqituvchi soxta oʻquvchi hisoblarini ochib reytingni koʻtaradi | Faqat ✓ oʻqituvchilar; oʻquvchi hisobi ≥ 7 kun va guruhda ≥ 7 kun; har oʻquvchi 2 500/hafta bilan chegaralangan; har soxta hisob haqiqiy tekshirilgan oʻyin talab qiladi; bir qurilmadan koʻp hisob (Google/Telegram ID) → moderator |
| 6 | Taklif kodini terib topish | 32⁶ ≈ 1 mlrd, 10 urinish/soat, standart «Soʻrov bilan» — kodni topgan ham faqat soʻrov yuboradi |
| 7 | Guruhga «reyd» (koʻp begonalar) | Soʻrov rejimi; kod 30 kunda eskiradi; [Kodni yangilash]; aʼzo limiti 40/60 |
| 8 | Katta odam voyaga yetmaganni topib yozishga urinadi | DM va doʻstlik yosh sinfi boʻyicha yopiq; qidiruv faqat aniq nom; voyaga yetmagan profili begonaga qisqa; ochiq profil havolasi yoʻq |
| 9 | Suhbatni boshqa ilovaga olib ketish (telefon, @telegram) | `scan()` telefon, havola va `@handle` ni rad etadi |
| 10 | Guruh chatida haqorat, bulling | Oʻqituvchi vositalari, shikoyat, avto-yashirish, sekin rejim, rad etilgan soʻzlar → avtomatik 1 soat |
| 11 | Oʻqituvchining oʻzi oʻquvchini haqorat qiladi | Oʻquvchi guruhni shikoyat qiladi (oʻqituvchiga koʻrinmaydi); moderator `mod_actions` va chatni koʻradi; oʻqituvchi hisobi cheklanadi, guruh boshqa adminga oʻtadi yoki arxivlanadi |
| 12 | Rasmiy yoki oʻqituvchi nomini taqlid qilish | Band soʻzlar (`RESERVED_PART`), ✓ faqat tasdiqdan keyin, «Taqlid» shikoyat turi |
| 13 | Nomaqbul nom/bio | `validateUsername`, `cleanBio`, avto-yashirish, «Profilni tozalash» |
| 14 | Yolgʻon ommaviy shikoyat | Mustaqil shikoyatchilar, hisob yoshi ≥ 7 kun, rad etilgan shikoyatlar ulushi hisobga olinadi |
| 15 | Ban aylanib oʻtish (yangi hisob) | Google `sub` va Telegram ID band; yangi hisob 24 soat cheklangan; qurilma identifikatori **yigʻilmaydi** (maxfiylik) — qolgan xavf qabul qilinadi |
| 16 | Tanga fermasi koʻp hisob bilan | Tanga oʻtkazilmaydi, import hisobga bir marta, kirim halol maksimum bilan chegaralangan |
| 17 | Duel chaqiruvlari bilan bezovta qilish | `duel_from = none`, 20/kun, 5 kutilayotgan, bloklash |
| 18 | Yosh haqida yolgʻon (13 dan kichik) | Neytral soʻrov, 24 soatlik qulf, yosh keyin oʻzgarmaydi; aniqlansa (shikoyat) hisob oʻchiriladi |

---

## 12. Maxfiylik, Data safety, huquqiy

### 12.1 Yangi yigʻiladigan maʼlumot

| Maʼlumot | Nima uchun | Kim koʻradi | Saqlash |
|---|---|---|---|
| Google email / Telegram ID va ismi | Kirish | Faqat tizim va xodim (support) | Hisob bilan |
| Tugʻilgan yil va oy | Yosh qoidalari | Egasi va xodim | Hisob bilan |
| Hisob turi, hudud, maktab (faqat oʻqituvchi soʻrovida) | Reyting filtri, tasdiq | Hudud: hech kim (faqat filtr); maktab: xodim | Hisob bilan |
| Foydalanuvchi nomi, bio, avatar tanlovi, rang, vitrina | Ommaviy profil | §4.6 | Hisob bilan |
| Natijalar (javoblar jurnali, oʻyin jurnali) | Tekshiruv, reyting, oʻqituvchi paneli | Egasi; umumlashmasi oʻqituvchiga | Jurnal 90 kun, umumlashma 400 kun |
| Xabarlar | Chat | Chat aʼzolari; moderator faqat shikoyat boʻyicha | 12 oy |
| Shikoyatlar, moderatsiya jurnali | Xavfsizlik | Xodim | 2 yil (oʻchirilgan hisobda anonim) |
| FCM tokeni | Push | Tizim | Chiqishgacha / 60 kun faolsizlik |

Oʻz rasmi (`nz-avatar-img`) **qurilmadan chiqmaydi** (v1.1 dagidek). IQ natijasi
serverda saqlanadi (sertifikat va shaxsiy tarix uchun), boshqalarga faqat §4.6
qoidasi bilan.

### 12.2 Play Data safety (yangilanadi)

- **Collected:** Personal info → Email address (Google kirishda), User IDs
  (foydalanuvchi nomi, Telegram ID), Other info (tugʻilgan yil va oy, hudud);
  Messages → Other in-app messages; App activity → In-app actions (natijalar),
  Other user-generated content (bio, guruh nomi); Device or other IDs (FCM token).
- **Shared:** yoʻq (Supabase va Google FCM — xizmat koʻrsatuvchi, «sharing» emas).
- **Encrypted in transit:** ha. **Deletion request:** ha (ilova + veb).
- **Optional:** hisob butunlay ixtiyoriy — ilova hisobsiz ishlaydi.
- **Purpose:** App functionality, Account management, Fraud prevention / security.

### 12.3 Hujjatlar (WP9)

| Sahifa | Oʻzgarish |
|---|---|
| `/maxfiylik/` (+ `/ru/`, `/en/`) | §12.1 jadvali, saqlash muddatlari, oʻqituvchi nimani koʻradi, xodim DMni qachon koʻradi, 13 yosh chegarasi, oʻchirish tartibi, xizmat koʻrsatuvchilar (Supabase, Google FCM, Telegram), maʼlumot joylashuvi |
| `/shartlar/` | UGC qoidalari, hisob yopish asoslari, duel va reyting qoidalari («ball — IQuest faollik balli, IQ emas»), «tanga oʻtkazilmaydi» |
| `/qoidalar/` (yangi) | Hamjamiyat qoidalari (K5 ning toʻliq matni) |
| `/bolalar-xavfsizligi/` (yangi) | CSAE standartlari, aloqa shaxsi |
| `/hisobni-ochirish/` (yangi; `/malumot-ochirish/` undan havola) | Veb orqali oʻchirish |
| `/g/<kod>` (yangi) | Guruh taklifi sahifasi + `/.well-known/assetlinks.json` (App Links) |
| `/oqituvchilar/` (yangi) | Oʻqituvchi qoʻllanmasi: guruh ochish, kod, QR, paneli, qoidalar |

### 12.4 Maʼlumot joylashuvi (qonun)

Oʻzbekistonning «Shaxsga doir maʼlumotlar toʻgʻrisida»gi qonuni (2021-yil
oʻzgartirishlari, 27¹-modda) fuqarolarning shaxsga doir maʼlumotlarini
Oʻzbekiston hududidagi serverlarda ham saqlashni talab qiladi — **yurist bilan
tasdiqlanishi shart** (v2.0-beta dan oldin). Variantlar:
- **A (standart, tez):** Supabase Cloud, Frankfurt (eu-central-1, Toshkentgacha
  ≈ 80 ms) + yurist xulosasi va zarur boʻlsa vakolatli organda roʻyxatdan oʻtish.
- **B (qonun talabi qatʼiy boʻlsa):** Supabase (open source) ni Oʻzbekistondagi
  maʼlumotlar markazida oʻzimiz joylashtirish (Postgres, GoTrue, Realtime,
  Edge Runtime, Kong). Kod oʻzgarmaydi (bir xil API), lekin DevOps yuki va
  narx oshadi (≈ 2–3 hafta sozlash + oylik server).
Arxitektura ikkalasiga ham mos: mijoz faqat `nzSupabase.url` ni biladi.

---

## 13. Klient modullari (CONTRACT §1 formati)

### 13.1 Yangi fayllar

| Fayl | Global | Vazifa | Kalit |
|---|---|---|---|
| `src/api.js` | `nzApi` | Supabase REST/RPC/Functions fetch oʻrami (`admin-api.js` uslubi, SDK yoʻq): sessiya, token yangilash, 8 s timeout, qayta urinish (faqat idempotent), xato kodlari → matn | `nz-auth` |
| `src/account.js` | `nzAccount` | Holat (`guest`/`signing`/`onboarding`/`ready`/`signedOut`), Google/Telegram kirish, onboarding qadamlari, import, chiqish, oʻchirish, `app_config` keshi | `nz-account`, `nz-social-cfg` |
| `src/sync.js` | `nzSync` | Natijalar navbati (≤ 200, eng eskisi 7 kundan keyin tashlanadi), `flush()`, hamyon kirimlari (`wallet.sync`) | `nz-sync` |
| `src/realtime.js` | `nzRealtime` | §9 WebSocket mijozi | — |
| `src/social.js` | `nzSocial` | Profil kartasi, qidiruv, doʻstlar, bloklar, shikoyat, maxfiylik | `nz-social-ui` |
| `src/chat.js` | `nzChat` | Suhbatlar roʻyxati, xabarlar sahifasi, yuborish, oʻchirish, oʻqildi, kesh | `nz-chat-cache` |
| `src/groups.js` | `nzGroups` | Guruh CRUD, kod, soʻrovlar, aʼzolar, oʻquvchi kartasi, guruh reytingi | — |
| `src/duel.js` | `nzDuel` | Duel roʻyxati, yaratish, javob, start/answer/submit, review; savol duelining mahalliy holati (tiklash uchun) | `nz-duel-run` |
| `src/inbox.js` | `nzInbox` | Bildirishnomalar, oʻqilganlik, push roʻyxatga olish va bosish | — |
| `src/rank.js` | `nzRank` | Reyting soʻrovlari, 60 s xotira keshi, «Siz» qatori | — |
| `src/qr.js` | `nzQr` | QR kod SVG (ISO 18004, M darajasi) — sof funksiya | — |

**Chegaralar:** holatli modullar bir-birini CHAQIRMAYDI (v1.1 qoidasi); hammasi
faqat `nzApi` va `nzRealtime` dan foydalanadi (ular infratuzilma, holatli
modul emas). Main yagona orkestrator. Har modul `node:vm` da soxta `fetch`,
`WebSocket`, `localStorage` va kiritilgan `now` bilan testlanadi.

### 13.2 Mavjud fayllarga qoʻshimchalar (egalari oʻzgarmaydi)

| Fayl (ega) | Qoʻshimcha |
|---|---|
| `src/iq/session.js` (WP4) | `mode: 'duel'` — qatʼiy `level`, moslashuvsiz, `bankSide 'practice'`, `flag: 'duel'`, `reliable: false`; `restore`/`verify` uni qabul qiladi. `test`/`practice` natijalari bitma-bit oʻzgarmaydi (golden test), shuning uchun `ENGINE` 2 qoladi |
| `src/iq/index.js`, `build.mjs` (WP0) | `IQ.BUILD`, `IQ.BUILDS` (build yozadi) |
| `src/profile.js` (WP2) | `scan(text, opts)`; modul yuklanishi `window`/`localStorage` siz ham yiqilmasin (Deno) |
| `src/wallet.js` (WP3) | Server rejimi: `adopt(serverState)`, `pendingCredits()`, `ack(keys)`; hisobda `spend` → `nzApi` orqali Main chaqiradi, mahalliy faqat natijani yozadi |
| `src/league.js` (WP3) | `adoptWeeks(serverWeeks)` — hisobda liga tarixi serverdan |
| `src/progress.js` (WP4) | Oʻzgarmaydi; `nz-attempts` (Nazariy qoldigʻi) v2 da ishlatilmaydi |
| `src/notify.js`, `src/bootstrap.js` (WP1) | Push ruxsati, `pushNotificationActionPerformed` → `app.openFrom(to, id)`; kanal `reminders` nomi |
| `src/i18n*.js` (WP5) | ≈ 350 yangi satr × ru/en; `_shared/push-i18n.json` generatori; halollik roʻyxati (§4.7) |
| `src/icons.js`, `src/art.js` (WP6) | Gliflar: users, message, search, flag, ban, share, link, qr, swords, pin, crown (kubok), shield-user; 12 guruh belgisi |
| `src/Main.dc.html` (WP7) | Hamma ekranlar (§4), `vals*` modullari: `valsChats`, `valsGroup`, `valsGroupSettings`, `valsChat`, `valsFriends`, `valsProfileView`, `valsRankAll`, `valsDuels`, `valsDuel`, `valsInbox`, `valsAccount`, `valsPrivacy` |

### 13.3 Build (WP-B0)

- Skript tartibi: `… league → api → realtime → account → sync → social → chat →
  groups → duel → inbox → rank → qr → IQ bundle → Main → data → bootstrap`.
- `SOCIAL_ON` = `true` faqat `supabase/config.json` da `url` va
  `publishableKey` boʻlsa **va** `--social` bayrogʻi bilan (reliz buildi).
  Aks holda mavjud himoya (nomlar va matnlar bundleʼda yoʻq) ishlaydi.
- NEED markerlari: `valsChats`, `valsGroup`, `valsDuels`, `valsInbox`,
  `valsAccount`, `valsRankAll`.
- `repeat(4,1fr)` langari → `repeat(var(--tabs),1fr)`; `--tabs` 4 yoki 5.
- CSP `connect-src` ga `https://<ref>.supabase.co wss://<ref>.supabase.co`.
- `tools/mkedge.mjs`, `tools/mkgolden.mjs` (§6.3).
- Versiya: `2.0.0`, `versionCode 10`.

### 13.4 Native (WP8)

`@capacitor/push-notifications`, `@capacitor-firebase/authentication` (faqat
Google), `google-services.json` (CI secret), App Links intent-filter
(`iquest.uz/g/*`, `autoVerify`), bildirishnoma kanallari, `POST_NOTIFICATIONS`
(mavjud). Manifestda `CAMERA`, `READ_MEDIA_IMAGES`, `READ_CONTACTS` **yoʻq** —
CI tekshiruvi kengaytiriladi.

---

## 14. v1.1 dan koʻchish

**Qachon:** kirish oqimining K6 qadami yoki keyin Sozlamalar → Hisob →
«Qurilmadagi natijalarni koʻchirish». **Hisobga bir marta** (`legacy_imports`),
birinchi bajarilgan qurilmadan.

| Mahalliy kalit | Serverga | Qoida |
|---|---|---|
| `nz-profile.username` | K3 da taklif sifatida | Band qilish (§3.5) |
| `nz-profile.bio`, `color`, `avatar` (`preset`/`initial`), `showcase` | `profiles` | Qayta tekshiriladi; `photo` → `initial` (rasm qurilmada qoladi) |
| `nz-wallet.balance` | `wallet_ledger` `import` | `min(balans, 1 500)` |
| `nz-wallet.owned` | `purchases` (`src: 'import'`, narx 0) | Oʻzgarishsiz (v1.1 §6.10); katalogda boʻlmagan id tashlanadi |
| `nz-wallet.credited` (`welcome`, `b:*`, `w:*`) | `wallet_ledger` idem kalitlari (miqdor 0, faqat takrorlanmaslik uchun) | Import qilingan kalit qayta tanga bermaydi |
| `nz-badges.earned` | `badges_earned` (`src: 'import'`) | Oʻzgarishsiz |
| `nz-league.weeks` | `legacy_imports.summary` | Faqat oʻz tarixida («Hisobdan oldin»), **reytingga kirmaydi** |
| `nz-iq-tests`, `nz-progress`, `nz-iq-ui` (Xatolarim, Saqlangan) | Koʻchirilmaydi | Qurilmada qoladi va ishlayveradi; IQ tarixi tekshirilmagan |

- Import qilinmagan ikkinchi qurilma: server holati yuklanadi; mahalliy
  tanga/nishonlar **qoʻshilmaydi** (bir marta — multi-qurilma fermasiga qarshi),
  toast «Bu qurilmadagi tangalar hisobga qoʻshilmadi».
- Hisob bilan ishlaganda `nz-wallet`, `nz-badges`, `nz-league` server nusxasi
  (kesh) boʻlib qoladi; oflayn kirimlar `pendingCredits()` bilan keyin
  yuboriladi, xarid faqat internet bilan.
- Chiqishdan keyin qurilma yana mehmon rejimida, oxirgi kesh mahalliy
  maʼlumot sifatida qoladi (tanlov: «Bu qurilmadagi maʼlumotni ham oʻchirish»).

---

## 15. Xarajatlar (Supabase Pro, 2026 narxlari taxminiy — buyurtmadan oldin tekshirilsin)

**Asos narxlar:** Pro $25/oy (100 000 MAU, 8 GB disk, 250 GB trafik, 2 mln
Edge Function chaqiruvi, 5 mln Realtime xabar, 500 bir vaqtdagi Realtime ulanish,
$10 compute krediti). Oshsa: MAU $0,00325; disk $0,125/GB; trafik $0,09/GB;
Edge $2 / 1 mln; Realtime xabar $2,50 / 1 mln; ulanish $10 / 1 000; compute
Small $15, Medium $60, Large $110. FCM va Telegram bot — bepul. SMS — yoʻq.

**Faraz:** kunlik faol = MAU × 30 %; faol foydalanuvchi kuniga 6 ta `submit`,
3 ta boshqa EF, 15 xabar; har xabar oʻrtacha 4 ta onlayn qabul qiluvchiga;
bir vaqtdagi ulanish = DAU × 8 %.

| | 5 000 MAU | 30 000 MAU | 150 000 MAU |
|---|---|---|---|
| Pro | $25 | $25 | $25 |
| Compute | Micro (kredit) $0 | Small $5 | Medium $50 |
| MAU ortigʻi | — | — | $163 |
| Edge (oyiga) | 1,2 mln → $0 | 7,3 mln → $11 | 36 mln → $68 |
| Realtime xabar | 2,7 mln → $0 | 16 mln → $28 | 81 mln → $190 |
| Realtime ulanish | 120 → $0 | 720 → $10 | 3 600 → $40 |
| Disk / trafik | $0 | $0–5 | $10–20 |
| **Jami, oyiga** | **≈ $25–30** | **≈ $80–110** | **≈ $550–650** |

Qoʻshimcha: domen va sayt (mavjud), moderator mehnati (asosiy haqiqiy xarajat:
30 000 MAU da kuniga ≈ 20–60 shikoyat → yarim stavka). Tejash dastagi: xabar
yuborishni EF dan SQL RPC ga koʻchirish (filtrni Postgresʼda takrorlash) Edge
chaqiruvlarini ≈ 60 % kamaytiradi — faqat 150 000 MAU dan keyin arziydi.

---

## 16. Bosqichlar va ish paketlari

### 16.1 Bosqichlar

| Bosqich | Davomiyligi | Chiqish mezoni |
|---|---|---|
| **F0 — tayyorgarlik** | 1 hafta (parallel) | Supabase loyihasi, yurist xulosasi (§12.4), Telegram bot, Firebase loyihasi, CONTRACT §18–§23 |
| **v2.0-alpha** | 3 hafta | Hisob, `submit` va paritet darvozasi yashil, reytinglar, ommaviy profil, server hamyoni, oʻchirish; ichki 20 kishi |
| **v2.0-beta** | 3 hafta + 2 hafta yopiq test | Guruhlar, chat, doʻstlar, duellar, inbox/push, moderatsiya paneli; 2–3 maktab (≈ 300 foydalanuvchi) |
| **v2.0** | — | Beta: 0 ta P0 xavfsizlik hodisasi, shikoyatga javob ≤ 24 soat (95 %), crash-free ≥ 99,5 %, paritet farqi 0; Data safety/IARC tasdiqlangan |

### 16.2 Ish paketlari

| WP | Ega | Fayllar | Nima beradi | Bogʻliqlik | Hajm |
|---|---|---|---|---|---|
| **WP-B0** | integrator | `src/iq/CONTRACT.md`, `build.mjs`, `version.json`, `package.json`, `src/iq/index.js`, `tools/mkedge.mjs`, `tools/mkgolden.mjs`, `tests/build.test.mjs`, `tests/edge-parity.test.mjs`, `.github/workflows/js.yml` | CONTRACT §18 Hisob, §19 Server tekshiruvi va BUILD, §20 Ijtimoiy qoidalar, §21 Duel, §22 Maʼlumot va RLS, §23 Navigatsiya v2; build (§13.3) | — (birinchi) | 3 kun |
| **WP-B1** | db | `supabase/migrations/0010–0013, 0015–0017`, `supabase/tests/0010–0017`, `supabase/README.md`, `supabase/config.json`, `.github/workflows/db*.yml` | Sxema, RLS, RPC, cron, testlar | WP-B0 | 7 kun |
| **WP-B2** | verify | `supabase/functions/submit/**`, `supabase/functions/_shared/{iq/**,auth.ts,limits.ts,errors.ts}`, `supabase/functions/tests/parity_test.ts`, `supabase/functions/deno.json` | §6 hammasi | WP-B0, WP-B1 (0011) | 4 kun |
| **WP-B3** | social-edge | `supabase/functions/{chat-send,profile-save,group,wallet,account,auth-telegram,tg-bot,push,mod}/**`, `_shared/{filter.js,catalog.js,push-i18n.json}` | §8 (duel va submitdan tashqari) | WP-B1 | 9 kun |
| **WP-B4** | duel | `supabase/migrations/0014_duels.sql`, `supabase/tests/0014_duels.sql`, `supabase/functions/duel/**` | §4.8, §6.5 | WP-B1, WP-B2, WP4 | 5 kun |
| **WP4** | score | `src/iq/session.js`, `tests/iq-session.test.mjs` | `mode: 'duel'` + golden | WP-B0 | 1 kun |
| **WP2** | profile | `src/profile.js`, `tests/profile.test.mjs` | `scan()`, Deno-xavfsiz yuklanish | WP-B0 | 1 kun |
| **WP3** | economy | `src/wallet.js`, `src/league.js` + testlari | Server rejimi | WP-B0 | 2 kun |
| **WP1** | device | `src/notify.js`, `src/bootstrap.js` + testlari | Push, chuqur havolalar | WP-C1 | 2 kun |
| **WP-C1** | net | `src/api.js`, `src/account.js`, `src/sync.js`, `src/realtime.js`, `tests/{api,account,sync,realtime}.test.mjs` | Tarmoq, hisob, navbat, Realtime | WP-B0 (API shartnomasi) | 6 kun |
| **WP-C2** | social | `src/social.js`, `src/chat.js`, `src/groups.js`, `src/duel.js`, `src/inbox.js`, `src/rank.js`, `src/qr.js` + testlari | Domen modullari | WP-C1 | 7 kun |
| **WP7** | ui | `src/Main.dc.html`, `src/runtime.js`, `src/shell*.css`, `src/admin-*.js`, `tools/uishots.mjs` | V1 navigatsiya, 5 tab, kirish oqimi, Sozlamalar → Hisob (4 k) · V2 Reyting 3 segment, ommaviy profil, maxfiylik (3 k) · V3 Suhbatlar, guruh, suhbat, doʻstlar, qidiruv (5 k) · V4 Duellar va duel oʻyini (3 k) · V5 inbox, push varagʻi, sayqal, satrlar muzlashi (2 k) · V6 admin moderatsiya (3 k) | modullar stub bilan | 20 kun (**kritik yoʻl**) |
| **WP5** | i18n | `src/i18n*.js`, `tools/i18n-extract.mjs`, `tools/honesty.mjs` + testlari | ru/en satrlar, push lugʻati, halollik | WP7 V5 | 3 kun |
| **WP6** | art | `src/icons.js`, `src/art.js` + testlari | Gliflar, 12 guruh belgisi | WP-B0 | 2 kun |
| **WP8** | brand/android | `android/**`, `capacitor.config.json`, `PLAY.md`, `.github/workflows/android.yml` | §13.4, Data safety, IARC, maqsadli auditoriya | WP-C1 | 3 kun |
| **WP9** | site | `src/site/**`, `tools/mksite.mjs` | §12.3 sahifalari, `/g/`, assetlinks | WP-B0 | 4 kun |

`cert` egasi oʻzgarmaydi (v2.2). `Main.dc.html` ning yagona egasi — WP7.

### 16.3 Tartib va kritik yoʻl

```
Hafta 1   WP-B0 → WP-B1 (0010–0011) · WP4 · WP2 · WP6 · WP9 (huquqiy)   | WP7-V1 (stub bilan)
Hafta 2   WP-B2 · WP-B1 (0012–0013) · WP-C1 · WP3                        | WP7-V1 → V2
Hafta 3   WP-B3 · WP-B1 (0015–0017) · WP-C1 · WP8                        | WP7-V2
          → v2.0-alpha (hisob, reyting, profil, hamyon)
Hafta 4   WP-B3 · WP-B4 · WP-C2                                          | WP7-V3
Hafta 5   WP-B4 · WP-C2 · WP1                                            | WP7-V3 → V4
Hafta 6   integratsiya, xavfsizlik testlari                              | WP7-V4 → V5 → WP5
Hafta 7   yuk testi                                                      | WP7-V6 → v2.0-beta
Hafta 8–9 yopiq test (maktablar), tuzatishlar  → v2.0
```

Kritik yoʻl: WP-B0 → WP7 V1…V6 (≈ 20 ish kuni) + beta. Taxminan **9 hafta**
ommaviy chiqishgacha. Backend (B1–B4) va klient modullari (C1–C2) WP7 dan
oldinda yuradi; WP7 ularni stub bilan kutmasdan boshlaydi (v1.1 tajribasi).

---

## 17. Test strategiyasi

1. **SQL / RLS** (`supabase/tests/00NN_*.sql`, CI `db.yml`, lokal Postgres +
   `_stub.sql`). Rollar: anon, oʻquvchi 14, oʻquvchi 17, foydalanuvchi 25,
   oʻqituvchi, oʻqituvchi ✓, guruh admini, moderator, auditor, banlangan,
   oʻchirilgan. Kamida quyidagilar **isbotlanadi**:
   - 25 yoshli 14 yoshliga DM yoza olmaydi, doʻstlik soʻrovi yubora olmaydi, uning bio/statistikasini koʻrmaydi;
   - bloklangan juftlik: DM, duel, qidiruv, profil kartasi yopiq;
   - begona `chat:<id>` kanaliga qoʻshila olmaydi, `messages` ni oʻqiy olmaydi;
   - aʼzo boʻlmagan guruhni `select` qila olmaydi; kod bilan faqat `group_preview`;
   - hech kim `verified_results`, `week_scores`, `wallet_ledger`, `purchases` ga toʻgʻridan-toʻgʻri yoza olmaydi;
   - `duel_secrets` hech kimga koʻrinmaydi; raqib natijasi DONE gacha yashirin;
   - oʻqituvchi oʻquvchining `birth_ym`, `region`, `iq_best` ini oʻqiy olmaydi;
   - `role` ni hech kim oʻzgartira olmaydi (0001 testi saqlanadi);
   - `mod_actions` UPDATE/DELETE qilinmaydi; `mod_context` har chaqiruvi jurnalga tushadi;
   - reytingda `in_rankings=false`, banlangan, xodim hisoblari yoʻq.
2. **Paritet** (§6.3): Node va Deno golden natijalari bitma-bit teng; `session`
   `test`/`practice` golden — `duel` rejimi qoʻshilgandan keyin oʻzgarmagan.
3. **Edge Function testlari** (`deno test`, lokal Supabase): har amal uchun
   ruxsat/rad jadvali, chegaralar (`rate:*`), idempotentlik (`cid` qayta),
   soxta payload (id almashtirilgan → `IQ_REPLAY_MISMATCH`), eski BUILD →
   `unsupported`, kunlik chegara → `capped`, duel: qabuldan oldin `start` rad,
   kech `submit` → javoblar xato, `fast` → magʻlubiyat, bonus 1/juftlik.
4. **Klient modullari** (`node:vm`, soxta `fetch`/`WebSocket`/`localStorage`,
   kiritilgan `now`): token yangilash, oflayn navbat (200 chegara, 7 kun),
   Realtime qayta ulanish va zaxira soʻrovi, `scan()` holatlari (≥ 80: telefon
   formatlari, leet, kirill, `@mention`), QR (ISO test vektorlari).
5. **Suiisteʼmol ssenariylari** (`tests/abuse/*.mjs`, CI da staging bazaga):
   kod terish 11-urinishda rad; 21-xabar/daqiqa rad; blokdan keyin duel yoʻq;
   gʻalaba fermasi bonus bermaydi; import ikkinchi marta rad.
6. **Yuk testi** (k6, staging, relizdan oldin): 2 000 bir vaqtdagi WebSocket,
   200 xabar/s, `leaderboard` 500 soʻrov/s (p95 < 300 ms), `submit` 100/s
   (p95 < 800 ms, 30 savollik test verify ≈ 50 ms).
7. **UI** (`tools/uishots.mjs`): ≈ 30 yangi ekran/varaq × 4 til × 2 tema ×
   360/390 px; layout shift tekshiruvi: suhbat paneli (xato qatori bor/yoʻq,
   chat rejimi), duel ekrani 5 holati, profil tugmalar qatori (ruxsatlar),
   Reyting «Siz» qatori, oflayn qator.
8. **Qurilmada** (Android 10/13/14/15): Google va Telegram kirish, push ruxsati
   va kanallar, App Links (ilova bor/yoʻq), oflayn → onlayn navbat, duelni
   oʻrtada yopib davom ettirish, hisobni oʻchirish (ilova va veb), 1.1 dan
   yangilash + import, Play pre-launch hisoboti.
9. **Beta monitoringi:** EF xatolari (`rejected`/`mismatch` ulushi > 0,5 % →
   ogohlantirish), shikoyat SLA, push yetkazish, Realtime ulanishlar.

---

## 18. Xatarlar va himoya

| # | Xatar | Himoya |
|---|---|---|
| 1 | Maʼlumot joylashuvi qonuni (§12.4) | Beta dan oldin yurist; B varianti (UZ da oʻzimiz joylashtirish) arxitekturada tayyor |
| 2 | Play UGC / bolalar xavfsizligi tufayli rad | §10.6 roʻyxati 1-kundan; yosh sinfi qoidalari; server oʻchirgichlari (DM ni masofadan yopish) |
| 3 | Moderatsiya yuki | Avto-yashirish, soʻz filtri, sekin rejim, oʻqituvchi vositalari; beta 300 kishi bilan kalibrlash; 2 moderator |
| 4 | Yosh haqida yolgʻon | Neytral soʻrov, qulf; xavfsizlik «oʻqituvchi» yorligʻiga emas, yosh sinfiga va «katta ↔ bola» DM taqiqiga tayanadi; qolgan xavf qabul qilingan |
| 5 | Oʻzgartirilgan ilova bilan firibgarlik | Qayta tekshiruv, yashirin duel urugʻi, kunlik chegaralar, shubhali roʻyxat; mukammal emas — mukofot kosmetik |
| 6 | Node va Deno natijasi farqi → halol natija rad | Paritet darvozasi, θ yaxlitlash (mavjud), `mismatch` jurnali |
| 7 | `Main.dc.html` hajmi (≈ 6 500 → ≈ 9 500 qator), bitta ega | Mantiq modullarda, ekran bosqichlari alohida birlashtiriladi; V6 admin kechiksa beta Supabase Studio dagi `mod_queue` koʻrinishi bilan boshlanadi |
| 8 | SDKʼsiz Realtime murakkabligi | Kichik protokol qismi, soxta server testlari, 15 s soʻrov zaxirasi |
| 9 | Firebase qoʻshilishi (Google kirish, FCM) | Faqat auth va messaging modullari, analytics yoʻq; Data safety da aytiladi |
| 10 | Xarajat oʻsishi (Realtime xabarlar) | Ulanish faqat ijtimoiy ekranlarda, 30 s da uzish; §15 tejash dastagi |
| 11 | Oflayn natija haftani almashtiradi (yakshanba → dushanba) | Qoida oddiy va bir xil; «Qanday ishlaydi» da bir jumla |
| 12 | Oʻqituvchilar reytingi «oʻqituvchi sifati» deb tushuniladi | Nomi va izohi «oʻquvchilari eng faol»; halollik linti |
| 13 | Ijtimoiy funksiya v1.1 soddaligini buzadi | 5 tab, bitta uy jadvali, stek ≤ 3, mehmon uchun hammasi v1.1 dagidek |
| 14 | RLS xatosi → maʼlumot sizib chiqishi | Yozish faqat RPC/EF; §17.1 dagi isbot testlari CI da har push; `service_role` faqat EF secrets da |
| 15 | Push spam hissi | Standart holatda faqat foydalanuvchi yoqqanda, 30/kun, yigʻish, jim soatlar |

---

## 19. Egasining qarori kerak

1. **5-tab nomi va joyi.** **Standart:** «Suhbatlar», Reyting va Profil orasida
   (ichida «Guruhlar | Shaxsiy»). Muqobil: «Guruhlar» (agar mahsulot asosan
   maktab guruhlari uchun boʻlsa).
2. **13 yoshdan kichiklar.** **Standart:** hisob yoʻq, ilovadan faqat mehmon
   sifatida foydalanadi; Play auditoriyasi 13+. (Boshlangʻich sinflar uchun
   ota-ona roziligi bilan «sinf hisobi» — alohida katta ish, v3 dan oldin emas.)
3. **Oʻqituvchi ↔ oʻquvchi shaxsiy yozishmasi.** **Standart:** yoʻq; har qanday
   18+ ↔ 13–17 DM va doʻstlik yoʻq, aloqa faqat guruh chatida.
4. **Kirish usullari.** **Standart:** Google + Telegram; SMS va parol yoʻq.
5. **Oʻqituvchini tasdiqlash.** **Standart:** guruh ochish darhol (3 × 40),
   Oʻqituvchilar reytingi va katta limit (20 × 60) faqat moderator tasdigʻidan
   keyin (48 soat, hujjat rasmisiz).
6. **IQ va reyting.** **Standart:** IQ boʻyicha reyting yoʻq; oʻqituvchi
   oʻquvchi IQ sini koʻrmaydi; boshqalarga IQ faqat 18+ doʻstga egasi yoqsa.
7. **Server qayerda.** **Standart:** Supabase Cloud Frankfurt + beta dan oldin
   yurist xulosasi; qonun talab qilsa Oʻzbekistondagi serverga oʻzimiz
   joylashtirish (≈ +2–3 hafta).
8. **Duel mukofoti.** **Standart:** tanga yoʻq; +10 ◆/toʻgʻri javob (yoki oʻyin
   balli) va gʻalaba uchun +20 ◆ (kuniga ≤ 5, bir raqib bilan ≤ 1).
