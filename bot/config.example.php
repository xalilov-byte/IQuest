<?php
/* IQuest boti sozlamasi. Shu faylni config.php nomi bilan nusxalang va
   toʻldiring (DEPLOY-AHOST.md). config.php GIT'GA QOʻSHILMAYDI (.gitignore)
   va brauzerdan ochilmaydi (.htaccess). */
return [
  // @BotFather bergan token: 123456789:AA...
  'BOT_TOKEN' => '',
  // Admin(lar)ning Telegram ID raqami (botga /myid yozing). Bir nechta — vergul bilan: '111,222'
  'ADMIN_IDS' => '',
  // site.config.json → paywall.secret bilan AYNAN BIR XIL boʻlishi shart
  'UNLOCK_SECRET' => 'change-me',
  // Mini App manzili (oxirida / bilan)
  'WEBAPP_URL' => 'https://iquest.uz/app/',
  // Ixtiyoriy, lekin tavsiya: tasodifiy satr (faqat A-Z a-z 0-9 _ -)
  'WEBHOOK_SECRET' => '',
  // Bitta natija narxi, soʻm (admin paneldagi summa uchun)
  'PRICE' => 10000,
];
