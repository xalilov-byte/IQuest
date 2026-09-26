# Paywall — natija uchun toʻlov (web / Telegram Mini App)

Oddiy, serversiz sinov varianti. **Faqat web build** (`node build.mjs --target=web`)
da yoqiladi; mobil ilova (APK) va admin build'ida natija bepul, paywall kodi
va sozlamasi umuman kirmaydi.

## Foydalanuvchi nima koʻradi

1. Toʻliq IQ test tugaydi (`reliable: true`) → IQ raqami oʻrniga **«Natija tayyor»**
   ekrani: narx, karta raqami + «Nusxalash», karta egasi, test kodi (`IQ-4F7K`)
   + «Nusxalash», «Toʻlov kutilmoqda» belgisi.
2. **«Chekni yuborish»** → botga oʻtadi (`t.me/<bot>?start=pay_IQ-4F7K`),
   bot chek rasmini soʻraydi.
3. Admin chatida chek rasmi **[✅ Tasdiq] [❌ Yolgʻon]** tugmalari bilan chiqadi.
4. ✅ bosilsa, bot foydalanuvchiga **«Natijani ochish»** tugmasini yuboradi —
   u ilovani `?unlock=IQ-4F7K-XXXXXX` bilan ochadi, natija avtomatik ochiladi
   (doimiy saqlanadi) va «Sertifikat» tugmasi paydo boʻladi.
5. Sertifikat: toʻliq ism bir marta soʻraladi, «Yuklab olish» — PNG (1600×1131).

Yopiq natijalar qurilmada saqlanadi: Bosh ekranda «Natijani ochish», Profil →
Testlar tarixida «Toʻlov kutilmoqda» (bosilsa shu ekran ochiladi).

**Zaxira:** ekranning pastida «Kodni kiritish» maydoni bor. Bot ishlamasa,
admin kodni qoʻlda beradi:

```sh
node tools/unlock.mjs IQ-4F7K      # → 6 belgili ochish kodi
```

## Sozlash — `site.config.json` → `paywall`

| Maydon      | Nima                                                       |
|-------------|------------------------------------------------------------|
| `enabled`   | `true` — web build'da yoqilgan                             |
| `price`     | Ekrandagi narx matni, masalan `10 000 soʻm`                |
| `card`      | Karta raqami (koʻrsatiladi, nusxada boʻshliqsiz)           |
| `cardOwner` | Karta egasining ismi                                       |
| `adminTg`   | Admin Telegram nomi, `@` siz («Adminga yozish»)            |
| `bot`       | Bot nomi, `@` siz. Boʻsh boʻlsa asosiy tugma adminga yozadi |
| `secret`    | Ochish kodi siri — bot `UNLOCK_SECRET` bilan **bir xil**   |

Hozirgi qiymatlar — PLACEHOLDER. Ishga tushirishdan oldin haqiqiy karta, ism,
bot nomi va yangi `secret` yozilsin, keyin `node build.mjs --target=web`.

Bot oʻrnatish — [bot/README.md](bot/README.md).

## Xavfsizlik (egasi bilan kelishilgan)

- `secret` **web bundle ichida koʻrinadi**: dasturchi uni topib, kodni oʻzi
  hisoblay oladi. Sinov bosqichi uchun egasi buni qabul qilgan. Keyinchalik
  tekshiruv serverga koʻchadi.
- Ochish qurilmaga bogʻliq (localStorage). Maʼlumot oʻchirilsa yoki boshqa
  qurilmada ochilsa, natija yana yopiq koʻrinadi — kod baribir ishlaydi.

## Algoritm

- Test kodi: `IQ-` + FNV-1a(`iquest:test:<seed>`) ning 4 belgisi (Crockford base32).
- Ochish kodi: FNV-1a(`<testKod>:<secret>`) ning 6 belgisi (Crockford base32).
  Kiritishda katta/kichik harf, boʻshliq, `O→0`, `I/L→1` farq qilmaydi.
- Kod: `src/paywall.js` (ilova, `tools/unlock.mjs`), `bot/worker.js` (nusxa;
  `tests/paywall.test.mjs` ikkalasini solishtiradi).
