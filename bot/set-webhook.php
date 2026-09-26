<?php
/* ─────────────────────────────────────────────────────────────────────────
   WEBHOOK'NI ULASH — brauzerda BIR MARTA oching:
       https://<domen>/bot/set-webhook.php
   «Webhook ulandi» chiqsa — bu faylni cPanel File Manager'dan OʻCHIRING.
   (DEPLOY-AHOST.md, 7-qadam.) Telegram'ga bot.php manzilini aytadi.
   ───────────────────────────────────────────────────────────────────── */
header('Content-Type: text/plain; charset=utf-8');
$env = is_file(__DIR__ . '/config.php') ? (require __DIR__ . '/config.php') : null;
if (!is_array($env) || empty($env['BOT_TOKEN'])) { echo "XATO: bot/config.php yoʻq yoki BOT_TOKEN boʻsh.\n"; exit; }

$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
         (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
if (!$https) { echo "XATO: sahifani https:// bilan oching (SSL yoqilganmi? DEPLOY-AHOST.md, 6-qadam).\n"; exit; }

$dir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
$hook = 'https://' . $_SERVER['HTTP_HOST'] . $dir . '/bot.php';
$params = ['url' => $hook, 'allowed_updates' => json_encode(['message', 'callback_query']), 'drop_pending_updates' => 'true'];
if (!empty($env['WEBHOOK_SECRET'])) $params['secret_token'] = $env['WEBHOOK_SECRET'];

$api = 'https://api.telegram.org/bot' . $env['BOT_TOKEN'] . '/';
function tg_get($url) {
  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15]);
    $r = curl_exec($ch); curl_close($ch); return $r;
  }
  return @file_get_contents($url);
}
$set = json_decode((string)tg_get($api . 'setWebhook?' . http_build_query($params)), true);
$info = json_decode((string)tg_get($api . 'getWebhookInfo'), true);
$me = json_decode((string)tg_get($api . 'getMe'), true);

if (!empty($set['ok'])) {
  echo "Webhook ulandi: $hook\n";
  if (!empty($me['result']['username'])) echo "Bot: @" . $me['result']['username'] . "\n";
  echo "\nEndi bu faylni (bot/set-webhook.php) cPanel File Manager'dan OʻCHIRING.\n";
} else {
  echo "XATO: " . ($set['description'] ?? 'Telegram javob bermadi (token toʻgʻrimi?)') . "\n";
}
echo "\n--- getWebhookInfo ---\n" . json_encode($info['result'] ?? $info, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
