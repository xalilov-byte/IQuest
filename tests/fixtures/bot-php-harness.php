<?php
/* tests/bot-php.test.mjs uchun: stdin — { env, steps:[…] }, stdout — natijalar (JSON).
   Telegram API chaqirilmaydi: IQ_API_HOOK chaqiruvlarni yozib oladi. */
define('IQ_BOT_TEST', 1);
require __DIR__ . '/../../bot/bot.php';
require __DIR__ . '/../../bot/admin-api.php';
$in = json_decode(stream_get_contents(STDIN), true);
$env = $in['env'];
$calls = []; $mid = 100;
$GLOBALS['IQ_API_HOOK'] = function ($method, $body) use (&$calls, &$mid) {
  $calls[] = ['method' => $method, 'body' => $body];
  return ['ok' => true, 'result' => ['message_id' => ++$mid]];
};
$out = [];
foreach ($in['steps'] as $s) {
  $calls = [];
  if ($s['fn'] === 'unlock') $out[] = iq_unlock_code($s['code'], $s['secret']);
  elseif ($s['fn'] === 'tag') $out[] = iq_tag_decode($s['code'], $s['tag'], $s['secret']);
  elseif ($s['fn'] === 'update') { iq_handle_update($s['update'], $env); $out[] = $calls; }
  elseif ($s['fn'] === 'api') { $r = iq_admin_api($env, $s['body']); $out[] = ['status' => $r[0], 'body' => $r[1], 'calls' => $calls]; }
  elseif ($s['fn'] === 'orders') $out[] = iq_orders($env);
}
echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
