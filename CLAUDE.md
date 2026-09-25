# IQuest — Claude uchun loyiha yo'riqnomasi

**IQuest** (sayt iquest.uz, Android `uz.iquest.app`): IQ testlari, IQ
o'yinlari, liga/reyting va IQuest.uz beradigan sertifikat. Tillar: o'zbek
lotin (manba), o'zbek kirill (avtomatik), rus. Nazariy (haydovchilik
imtihoni ilovasi, `xalilov-byte/Nazariy`) dvigatelidan olingan.

## Avval o'qing

1. **`HANDOFF.md`** — hozirgi holat, nima tayyor, nima qoldi, qanday
   davom ettirish (boshqa sessiya/akkauntdan davom etish uchun).
2. **`src/iq/CONTRACT.md`** — yagona kelishuv: savol shakli, sessiya,
   baholash, o'yinlar, server tekshiruvi, halollik qoidalari, fayl egaligi.

## O'zgarmas qoidalar

- **Nazariy'ga tegilmaydi** — uning repo'siga ham, bazasiga ham. Nazariy
  alohida jonli mahsulot.
- **Maxfiy narsa repoga yozilmaydi**: parol, service_role kaliti, SSH
  kalit, token. Ular faqat serverda (`/opt/iquest/.env`) yoki GitHub
  Secrets'da. `supabase/config.json` dagi publishable/anon kalit ochiq —
  bu normal, ma'lumotni faqat RLS himoya qiladi.
- **Mezon — Google Play siyosati** (CONTRACT §6): "IQ'ni X ballga
  oshiradi" kabi kafolat/raqamli va'da va sog'liq da'volari yo'q;
  sertifikat "IQuest testi natijasi", "rasmiy IQ" emas.
- **Ball, liga, sertifikat faqat serverda tekshirilgan natijadan**
  (CONTRACT §10). Sertifikat faqat serverda o'tkaziladigan onlayn testdan.
- Hamma narsa egasining **VDS** serverida (o'z-o'zini xosting qilingan
  Supabase, Docker). supabase.com buluti ishlatilmaydi.
- Har himoya uchun test, va test **tishlashi isbotlanadi** (himoyani
  vaqtincha olib tashlab test yiqilishini ko'rish).
- Izohlar o'zbekcha (lotin): NIMA uchun shunday qilingan.
- Ichki `nz` prefikslari (`window.nzProgress`, `.nz-card`) o'zgartirilmaydi.

## Buyruqlar

```
npm ci                 # bog'liqliklar
npm test               # hamma testlar (node:test + node:vm), ~1–2 daqiqa
npm run build:all      # mobil (www/), sayt (dist/web/), admin (dist/admin/)
IQ_DEMO=1 npm run build   # demo generator/o'yin bilan (faqat ishlab chiqish)
```

Android APK faqat CI'da yig'iladi (`.github/workflows/android.yml`) —
Claude muhitida `dl.google.com` bloklangan. APK Release'ga chiqadi:
`sinov-<shoxcha>` tegi.
