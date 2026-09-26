# IQuest toʻlov boti (Cloudflare Worker)

Bitta fayl — `worker.js`, bazasiz, kutubxonasiz. Chek rasmini admin chatiga
yuboradi; admin ✅ bossa foydalanuvchiga natijani ochuvchi tugma keladi.
Umumiy oqim: [../PAYWALL.md](../PAYWALL.md).

## O'rnatish (5 qadam)

1. **Token.** Telegram'da @BotFather → `/newbot` → token (`123:ABC…`).
   Bot nomini `site.config.json` → `paywall.bot` ga yozing (`@` siz).
2. **Deploy.** Shu papkada:
   ```sh
   cd bot
   npx wrangler login
   npx wrangler deploy        # → https://iquest-pay-bot.<siz>.workers.dev
   ```
3. **Maxfiy qiymatlar** (har biri soʻralganda kiritiladi):
   ```sh
   npx wrangler secret put BOT_TOKEN        # 1-qadamdagi token
   npx wrangler secret put ADMIN_CHAT_ID    # admin chat id (guruh: -100…)
   npx wrangler secret put UNLOCK_SECRET    # site.config.json paywall.secret bilan BIR XIL
   npx wrangler secret put WEBAPP_URL       # Mini App manzili, masalan https://iquest.uz/
   npx wrangler secret put WEBHOOK_SECRET   # ixtiyoriy, tasodifiy satr
   ```
   Admin chat id: botni guruhga qoʻshing (yoki botga yozing) va
   `https://api.telegram.org/bot<TOKEN>/getUpdates` dan `chat.id` ni oling.
4. **Webhook:**
   ```sh
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://iquest-pay-bot.<siz>.workers.dev/&secret_token=<WEBHOOK_SECRET>"
   ```
5. **Ilova.** `node build.mjs --target=web` va saytni yangilang. Sinab koʻring:
   test → «Chekni yuborish» → rasm → admin chatida ✅ → «Natijani ochish».

## Qoidalar

- Tugmalarni faqat `ADMIN_CHAT_ID` dagi bosishlar qabul qilinadi (guruhda —
  har bir aʼzo, shaxsiy chatda — faqat oʻsha odam).
- Test kodi botning soʻrov xabarida yuradi; foydalanuvchi rasmni shu xabarga
  **javob** qilib yuboradi (yoki izohga `IQ-XXXX` yozadi).
- `UNLOCK_SECRET` oʻzgarsa, `site.config.json` dagi `secret` ham oʻzgarsin va
  web qayta yigʻilsin — aks holda havola ochmaydi.
- Sinov: `npm test` (`tests/paywall.test.mjs` — soxta fetch bilan).
