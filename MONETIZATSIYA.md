# IQuest — Monetizatsiya (sinov bosqichi, faqat Telegram)

**Holat:** reja. Egasi qarori (2026-09-26): pullik qism hozircha **faqat
Telegram'da** sinaladi, to'lov — karta orqali, chek skrinshoti, admin
qo'lda tasdiqlaydi. Play'dagi ilova **bepul qoladi** (pastda §6).

---

## 1. Nima bepul, nima pullik

Qoida: odam ilovani to'liq ishlata oladi; pul faqat **qo'shimcha qiymat**
uchun. "Hamma narsa pullik" degan taassurot bo'lmasligi kerak.

| Bepul (har doim) | Pullik |
|---|---|
| IQ test (30 savol), mashq, 6 ta IQ o'yini | **Sertifikat** — ism, IQ, oraliq, sana, noyob kod, tekshirish havolasi |
| Natija: **IQ raqami va oraliq** | **Batafsil tahlil** — savol turlari bo'yicha kuchli/zaif tomonlar, vaqt tahlili, tavsiyalar |
| Kunlik vazifalar, tanga, nishonlar, liga | **Pro obuna** (§3) |
| Oddiy reyting | |

**Tavsiya (muhim):** IQ raqamini pul ortiga yashirmang — faqat
sertifikat va batafsil tahlil pullik bo'lsin. Sabablari:
- "Natijani ko'rish uchun to'lang" — IQ-test janrining №1 shikoyati;
  odamlar buni aldov deb qabul qiladi va baho (reyting) tushadi.
- Bepul raqam — eng yaxshi reklama: odam natijasini do'stiga yuboradi,
  sertifikatni esa "rasmiy ko'rinishda" olish uchun to'laydi.

Agar baribir natijaning o'zi pullik bo'lsin desangiz: test oxirida
"Natija tayyor" ekrani, raqam yopiq, **test boshlanishidan OLDIN**
narxi aniq yozilgan bo'lishi shart (yashirin to'lov — shikoyat va
bloklanish sababi).

## 2. Narxlar (boshlang'ich taklif, keyin o'zgartirish oson)

| Mahsulot | Narx |
|---|---|
| Sertifikat (bitta test uchun) | 15 000 so'm |
| Batafsil tahlil | 10 000 so'm |
| Sertifikat + tahlil | 20 000 so'm |
| Pro — 1 oy | 25 000 so'm |
| Pro — 3 oy | 60 000 so'm |

## 3. Pro obuna — kam, lekin sezilarli

1. Har testdan keyin **batafsil tahlil** bepul.
2. **Sertifikat** 50% chegirma.
3. **Test tarixi grafigi** va turlar bo'yicha o'sish.
4. Profil uchun **Pro ramka va 4 ta qo'shimcha rang**.

Bepul foydalanuvchidan HECH NARSA olib qo'yilmaydi.

## 4. Oddiy arxitektura (kam kod, kam xarajat)

```
Telegram Mini App (bizning web build, dist/web)
   │  test tugadi → natija + "Sertifikat olish" tugmasi
   ▼
Telegram bot (@IQuestBot)
   1. Buyurtma: kod IQ-XXXX, summa, karta raqami ko'rsatiladi
   2. Foydalanuvchi chek skrinshotini botga yuboradi
   3. Bot uni ADMIN guruhiga yuboradi: [✅ Tasdiqlash] [❌ Rad etish]
   4. Tasdiqlansa → sertifikat (PNG/PDF) botda yuboriladi,
      Pro bo'lsa → muddati yoziladi, Mini App'da ochiladi
   ▼
Supabase (bitta kichik loyiha, Free tarif yetadi)
   · users(tg_id, name, pro_until)
   · results(id, tg_id, payload, iq, lo, hi, verified_at)
   · orders(code, tg_id, product, amount, status, check_file_id, admin_id)
   · certificates(code, result_id, name, issued_at)
   · Edge Function "bot"     — Telegram webhook (1–4)
   · Edge Function "verify"  — natijani IQ.session.verify() bilan QAYTA
                               hisoblaydi (sertifikatdagi raqam soxta bo'lmasin)
   · Sahifa iquest.uz/sertifikat/?kod=IQ-XXXX — tekshirish (faqat
     ism, IQ, oraliq, sana ko'rinadi)
```

Nima uchun shunday:
- **Server faqat bitta:** Supabase (bepul tarif sinov uchun yetadi).
- **Admin paneli kerak emas** — tasdiqlash Telegram'dagi tugmalar orqali.
- **Sertifikat raqami serverda qayta hisoblanadi** — mijoz yuborgan
  IQ ga ishonilmaydi (CONTRACT §10).
- **Mini App** — hozirgi sayt build'i (`npm run build:web`) ozgina
  qo'shimcha bilan: Telegram WebApp SDK, "Sertifikat olish" tugmasi.

## 5. Xavflar va qoidalar

- **Soxta chek:** admin har chekni **bank ilovasida** tushum bilan
  solishtiradi; summa va buyurtma kodi izohda bo'lishi so'raladi.
- **Soliq/qonun:** kartaga to'lov qabul qilish uchun o'zini o'zi band
  qilgan (YaTT/"samozanyatiy") sifatida ro'yxatdan o'tish kerak.
  Hajm oshsa — Payme/Click (avtomatik tasdiqlash) ga o'tiladi.
- **Qaytarish:** sertifikat noto'g'ri berilsa — pul qaytariladi;
  shartlar Foydalanish shartlarida yoziladi.
- **Sertifikat matni:** "IQuest.uz tomonidan berilgan · IQuest testi
  natijasi". "Rasmiy", "klinik", Mensa — yo'q (CONTRACT §6).

## 6. Play Market bilan bog'liq — MUHIM

- Play'dagi ilovada **to'lov ham, "Telegram'da to'lang" degan havola
  ham bo'lmaydi.** Play qoidasi: ilova ichidagi raqamli mahsulot faqat
  Google Play Billing orqali sotiladi; tashqi to'lovga yo'naltirish
  taqiqlanadi — ilova olib tashlanishi mumkin.
- Shuning uchun pullik qism **alohida kanal**: Telegram Mini App.
  Play ilovasi o'zgarmaydi.
- Keyinchalik Play'da ham sotmoqchi bo'lsak — Play Billing qo'shiladi
  (Google ~15% oladi).

## 7. Reyting (sinov uchun oddiy)

Mini App ichida bitta jadval: **haftalik ball** bo'yicha top-50
(Telegram ismi yoki taxallus). Ball faqat serverda tekshirilgan
test/mashq natijalaridan. IQ bo'yicha reyting yo'q.

## 8. Qurish tartibi (taxminan 1–1,5 hafta)

1. Supabase loyihasi (egasi ochadi), 4 jadval + RLS.
2. Bot: buyurtma → chek → admin tugmalari → sertifikat yuborish.
3. Sertifikat dizayni (PNG, yangi "Matritsa" brendi) + tekshirish sahifasi.
4. Mini App: web build + Telegram SDK + "Sertifikat olish" / Pro.
5. Oddiy reyting.

**Egasidan kerak:** bot tokeni (@BotFather), admin guruhi, karta raqami,
narxlarni tasdiqlash, Supabase loyihasi.
