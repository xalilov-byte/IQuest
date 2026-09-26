# IQuest'ni aHOST'ga joylash (Telegram-first)

**Qanday ishlaydi:** sayt (`https://iquest.uz/`) — faqat tanishtiruv sahifasi va
bitta tugma: **«Telegram botda ochish»**. Ilovaning oʻzi **@IQuestebot** ichida
Mini App boʻlib ochiladi (`https://iquest.uz/app/`). Toʻlov cheklari ham shu
botga keladi — **sizning shaxsiy chatingizga**, ✅/❌ tugmalari bilan. Admin
panel ham shu bot ichida (faqat sizga koʻrinadi). Android ilovasi bunga tegmaydi.

Hammasi bitta arxivda: `dist/iquest-ahost.zip`.

---

## 0. Domen aHOST'ga qarashi kerak (Cloudflare EMAS)

Oldin Cloudflare tavsiya qilingan edi — **endi kerak emas**. Domen
registratorida (iquest.uz sotib olingan joy) NS serverlar **aHOST'ning oʻz
serverlari** boʻlsin (aHOST kabinetida / xat bilan berilgan, odatda
`ns1.ahost.uz`, `ns2.ahost.uz` koʻrinishida). Cloudflare NS qoʻyilgan boʻlsa —
aHOST'nikiga qaytaring. Oʻzgarish 1–24 soatda kuchga kiradi.

## 1. Botni sozlash (@BotFather)

Bot allaqachon bor: **@IQuestebot**. @BotFather'da:

1. `/mybots` → **IQuestebot** → **Bot Settings** → **Menu Button** →
   **Configure menu button** → manzil: `https://iquest.uz/app/`, nom: `IQuest`.
2. (Tavsiya) **Bot Settings → Configure Mini App → Enable Mini App** →
   manzil: `https://iquest.uz/app/`.
3. Token'ni hech kimga bermang. Token oshkor boʻlsa: `/revoke` → yangisini
   `bot/config.php` ga yozing.

## 2. `site.config.json` — toʻlov maʼlumotlari

`paywall` boʻlimida:

| Maydon      | Nima yozish kerak                                   |
|-------------|-----------------------------------------------------|
| `card`      | Sizning karta raqamingiz (masalan `8600 1234 5678 9012`) |
| `cardOwner` | Karta egasining ismi familiyasi                     |
| `price`     | Narx matni, masalan `10 000 soʻm`                   |
| `bot`       | `IQuestebot` (allaqachon yozilgan)                  |
| `secret`    | Allaqachon tasodifiy yozilgan — **oʻzgartirmang** (oʻzgartirsangiz, `bot/config.php` dagi `UNLOCK_SECRET` ham aynan shunday boʻlsin) |
| `adminTg`   | Sizning Telegram nomingiz (`@` siz) — «Adminga yozish» uchun |

Domen ishlay boshlagach: `"domainConfirmed": true` qiling (aks holda sayt
Google'da chiqmaydi).

## 3. `bot/config.php` — bot sozlamasi

Fayl tayyor (git'ga kirmaydi). Uni matn muharriri bilan oching:

- `BOT_TOKEN` — @BotFather bergan token (`8616…:AA…`) ni qoʻshtirnoq ichiga qoʻying.
- `ADMIN_IDS` — **hozircha boʻsh qoldiring**, 8-qadamda toʻldirasiz.
- `UNLOCK_SECRET` — tayyor (site.config.json dagi `secret` bilan bir xil).
- `WEBAPP_URL` — `https://iquest.uz/app/` (tayyor).
- `WEBHOOK_SECRET` — tayyor (tasodifiy).
- `PRICE` — narx soʻmda raqam bilan (`10000`) — admin paneldagi summa uchun.

## 4. Arxivni yasash

Kompyuterda, loyiha papkasida:

```sh
npm run deploy:ahost
```

Natija: `dist/iquest-ahost.zip`. Oxirida **«⚠ TOʻLDIRING»** roʻyxati chiqsa —
oʻsha joylarni toʻldirib, buyruqni qayta ishga tushiring.

## 5. Yuklash (cPanel → File Manager)

1. aHOST cPanel → **File Manager** → `public_html` papkasini oching.
2. Eski fayllar boʻlsa (masalan `index.html` namunasi) — oʻchiring.
3. **Upload** → `iquest-ahost.zip` ni tanlang.
4. Yuklangan zip ustida oʻng tugma → **Extract** → `public_html` ga oching.
5. Zip faylni oʻchiring. Yashirin `.htaccess` fayli ham ochilganini tekshiring
   (File Manager → Settings → **Show Hidden Files**).

Natijada: `public_html/index.html`, `public_html/app/`, `public_html/bot/`, `public_html/.htaccess`.

## 6. SSL (https)

cPanel → **SSL/TLS Status** (yoki **Let's Encrypt SSL**) → `iquest.uz` va
`www.iquest.uz` ni belgilang → **Run AutoSSL** / **Issue**. Bir necha daqiqada
yashil qulf paydo boʻladi. Telegram Mini App **faqat https** bilan ishlaydi.

## 7. Webhook'ni ulash

Brauzerda bir marta oching:

```
https://iquest.uz/bot/set-webhook.php
```

«Webhook ulandi» chiqsa — **File Manager'dan `bot/set-webhook.php` ni oʻchiring**.

## 8. Oʻzingizni admin qilish

1. Telegram'da @IQuestebot ga `/myid` yozing → bot raqam yuboradi (masalan `123456789`).
2. File Manager → `public_html/bot/config.php` → **Edit** →
   `'ADMIN_IDS' => '123456789',` → Save. (Bir nechta admin: `'111,222'`.)
3. Kompyuterdagi `bot/config.php` ga ham yozib qoʻying (keyingi yangilanishda yoʻqolmasin).
4. Botga `/start` yozing — endi **«Admin panel»** tugmasi ham chiqadi.

## 9. Tekshirish roʻyxati

- [ ] `https://iquest.uz/` — landing ochiladi, «Telegram botda ochish» botga olib boradi.
- [ ] @IQuestebot → `/start` → «IQuestni ochish» → ilova Telegram ichida ochiladi.
- [ ] Ichki ekranda Telegram'ning «orqaga» tugmasi ishlaydi.
- [ ] Toʻliq IQ testni tugating → toʻlov ekrani (karta, narx, test kodi).
- [ ] «Chekni yuborish» → bot chek rasmini soʻraydi → rasmni **javob** qilib yuboring.
- [ ] Sizga (admin) chek keladi: IQ, kod, foydalanuvchi va ✅/❌.
- [ ] ✅ bosing → foydalanuvchiga «Natijani ochish» → natija va sertifikat ochiladi.
- [ ] «Admin panel» → roʻyxat (Kutilmoqda / Tasdiqlangan / Rad etilgan), bugungi va jami summa.
- [ ] `https://iquest.uz/bot/config.php` — **ochilmasligi** kerak (403).

## Yangilash

Kod yoki matn oʻzgarsa: `npm run deploy:ahost` → zip'ni yana `public_html` ga
yuklab Extract qiling (fayllar ustidan yoziladi). `bot/data/orders.json`
(buyurtmalar) zip'da yoʻq — u oʻchmaydi.

## Muammo boʻlsa

- Bot javob bermaydi → `set-webhook.php` ni qayta yuklab oching; `getWebhookInfo`
  dagi `last_error_message` ni koʻring. cPanel → **Errors** logi.
- «Natijani ochish» natijani ochmaydi → `UNLOCK_SECRET` va `paywall.secret` bir xilmi?
- Admin panel «Ruxsat yoʻq» → `ADMIN_IDS` da oʻz `/myid` raqamingiz bormi?
