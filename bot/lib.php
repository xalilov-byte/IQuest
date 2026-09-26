<?php
/* ─────────────────────────────────────────────────────────────────────────
   IQuest boti — umumiy funksiyalar (bot.php, admin-api.php, file.php).
   Bazasiz, Composer'siz. Buyurtmalar — bitta JSON fayl (data/orders.json,
   flock bilan; .htaccess brauzerdan yopadi). DEPLOY-AHOST.md.

   Sozlama (config.php):
     BOT_TOKEN      — @BotFather tokeni
     ADMIN_IDS      — admin(lar) Telegram id raqami, vergul bilan: "12345,67890"
                      (id — botga /myid yozing)
     UNLOCK_SECRET  — site.config.json → paywall.secret bilan BIR XIL
     WEBAPP_URL     — Mini App manzili: https://<domen>/app/
     WEBHOOK_SECRET — ixtiyoriy; setWebhook secret_token bilan bir xil
     PRICE          — bitta natija narxi, soʻm (statistika uchun), masalan 10000
     DATA_DIR       — ixtiyoriy; sukut: bot/data
   ───────────────────────────────────────────────────────────────────── */

date_default_timezone_set('Asia/Tashkent');
const IQ_ALPHA = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const IQ_CODE_RE = '/IQ-[0-9A-HJKMNP-TV-Z]{4}/';

function iq_config() {
  $env = is_file(__DIR__ . '/config.php') ? (require __DIR__ . '/config.php') : [];
  return is_array($env) ? $env : [];
}

/* ── Ochish kodi — src/paywall.js bilan AYNAN bir xil (tests/bot-php.test.mjs).
   JS charCodeAt — UTF-16 birliklari, shuning uchun satr UTF-16 ga yoyiladi. */
function iq_utf16_units($s) {
  $out = [];
  $n = strlen($s);
  for ($i = 0; $i < $n; ) {
    $c = ord($s[$i]);
    if ($c < 0x80) { $cp = $c; $i += 1; }
    elseif ($c < 0xE0) { $cp = (($c & 0x1F) << 6) | (ord($s[$i + 1]) & 0x3F); $i += 2; }
    elseif ($c < 0xF0) { $cp = (($c & 0x0F) << 12) | ((ord($s[$i + 1]) & 0x3F) << 6) | (ord($s[$i + 2]) & 0x3F); $i += 3; }
    else { $cp = (($c & 0x07) << 18) | ((ord($s[$i + 1]) & 0x3F) << 12) | ((ord($s[$i + 2]) & 0x3F) << 6) | (ord($s[$i + 3]) & 0x3F); $i += 4; }
    if ($cp >= 0x10000) { $cp -= 0x10000; $out[] = 0xD800 | ($cp >> 10); $out[] = 0xDC00 | ($cp & 0x3FF); }
    else $out[] = $cp;
  }
  return $out;
}
function iq_fnv($str) {
  $h = 0x811c9dc5;
  foreach (iq_utf16_units($str) as $u) {
    $h ^= $u;
    $h = ($h * 0x01000193) & 0xFFFFFFFF;
  }
  return $h;
}
function iq_b32($n, $len) {
  $out = '';
  for ($i = 0; $i < $len; $i++) $out .= IQ_ALPHA[($n >> (27 - 5 * $i)) & 31];
  return $out;
}
function iq_unlock_code($code, $secret) { return iq_b32(iq_fnv($code . ':' . (string)$secret), 6); }
/* src/paywall.js iqTag() ning teskarisi. Notoʻgʻri belgi — null. */
function iq_tag_decode($code, $tag, $secret) {
  $tag = strtoupper((string)$tag);
  if (strlen($tag) !== 2) return null;
  $a = strpos(IQ_ALPHA, $tag[0]); $b = strpos(IQ_ALPHA, $tag[1]);
  if ($a === false || $b === false) return null;
  $iq = (($a << 5) | $b) ^ (iq_fnv($code . ':iq:' . (string)$secret) & 0x3FF);
  return ($iq >= 40 && $iq <= 200) ? $iq : null;
}

function iq_admin_ids($env) {
  $raw = $env['ADMIN_IDS'] ?? '';
  $list = is_array($raw) ? $raw : explode(',', (string)$raw);
  $out = [];
  foreach ($list as $x) { $x = trim((string)$x); if (preg_match('/^\d+$/', $x)) $out[] = $x; }
  return $out;
}
function iq_is_admin($env, $uid) { return in_array((string)$uid, iq_admin_ids($env), true); }
function iq_admin_url($env) {
  $base = (string)($env['WEBAPP_URL'] ?? '');
  return (substr($base, -1) === '/' ? $base : $base . '/') . 'admin.html';
}
function iq_unlock_url($env, $code) {
  $base = (string)($env['WEBAPP_URL'] ?? '');
  return $base . (strpos($base, '?') === false ? '?' : '&') . 'unlock=' . $code . '-' . iq_unlock_code($code, $env['UNLOCK_SECRET'] ?? '');
}

function iq_text($k, $arg = '') {
  $T = [
    'ask' => 'Toʻlov chekini rasm qilib yuboring. Test kodi: ' . $arg,
    'hello' => 'Salom! IQuest — IQ test, mashq va IQ oʻyinlari. Boshlash uchun «IQuestni ochish» tugmasini bosing.',
    'helloAdmin' => 'Salom, admin! Cheklar shu chatga keladi. Roʻyxat va statistika — «Admin panel».',
    'noCode' => 'Chekni «Test kodi» yozilgan xabarga javob qilib yuboring (ilovadagi «Chekni yuborish» tugmasi).',
    'got' => 'Chek qabul qilindi. Tekshirilgach xabar beramiz.',
    'ok' => 'Toʻlov tasdiqlandi! Natijangiz va sertifikatingiz tayyor.',
    'no' => 'Chek tasdiqlanmadi. Savollar boʻlsa, adminga yozing.',
    'open' => 'Natijani ochish',
    'app' => 'IQuestni ochish',
    'admin' => 'Admin panel',
    'myid' => 'Sizning Telegram ID raqamingiz: ' . $arg,
    'noAdmin' => 'Admin sozlanmagan: bot/config.php → ADMIN_IDS ga oʻz ID raqamingizni yozing (/myid).',
  ];
  return $T[$k];
}

/* ── Telegram Bot API. Sinovda $GLOBALS['IQ_API_HOOK'] (callable) chaqiriladi.
   Qaytadi: javob massivi (json) yoki null. ─────────────────────────── */
function iq_api($env, $method, $body) {
  if (isset($GLOBALS['IQ_API_HOOK']) && is_callable($GLOBALS['IQ_API_HOOK'])) {
    return call_user_func($GLOBALS['IQ_API_HOOK'], $method, $body);
  }
  $res = iq_http('https://api.telegram.org/bot' . $env['BOT_TOKEN'] . '/' . $method,
                 json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
  $j = is_string($res) ? json_decode($res, true) : null;
  return is_array($j) ? $j : null;
}
function iq_http($url, $json = null) {
  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    $opt = [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20];
    if ($json !== null) $opt += [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $json,
                                 CURLOPT_HTTPHEADER => ['Content-Type: application/json']];
    curl_setopt_array($ch, $opt);
    $res = curl_exec($ch);
    curl_close($ch);
    return $res;
  }
  $ctx = $json === null ? stream_context_create(['http' => ['timeout' => 20]])
    : stream_context_create(['http' => ['method' => 'POST', 'header' => "Content-Type: application/json\r\n",
                                        'content' => $json, 'timeout' => 20]]);
  return @file_get_contents($url, false, $ctx);
}

/* ── Buyurtmalar (data/orders.json) ──────────────────────────────────────
   { v:1, orders: { "IQ-4F7K": { code, uid, name, username, iq, status,
     created, paid, decided, by, file, kind, amount, msgs:[[chat,msg],…] } } }
   status: draft (/start pay_ bosildi) → pending (chek keldi) → ok | no. */
function iq_data_dir($env) {
  $d = !empty($env['DATA_DIR']) ? rtrim((string)$env['DATA_DIR'], '/') : __DIR__ . '/data';
  if (!is_dir($d)) @mkdir($d, 0750, true);
  if (!is_file($d . '/.htaccess')) @file_put_contents($d . '/.htaccess', "Require all denied\nDeny from all\n");
  return $d;
}
/* $fn(&$db) — qulf ostida oʻzgartiradi; qaytgan qiymat uzatiladi. */
function iq_store($env, $fn) {
  $f = fopen(iq_data_dir($env) . '/orders.json', 'c+');
  if (!$f) throw new RuntimeException('orders.json ochilmadi');
  flock($f, LOCK_EX);
  $raw = stream_get_contents($f);
  $db = $raw ? json_decode($raw, true) : null;
  if (!is_array($db) || !isset($db['orders']) || !is_array($db['orders'])) $db = ['v' => 1, 'orders' => []];
  $before = json_encode($db);
  $ret = $fn($db);
  $after = json_encode($db, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
  if (json_encode($db) !== $before) { ftruncate($f, 0); rewind($f); fwrite($f, $after); fflush($f); }
  flock($f, LOCK_UN);
  fclose($f);
  return $ret;
}
function iq_orders($env) { return iq_store($env, function (&$db) { return $db['orders']; }); }

function iq_name($u) {
  if (!$u) return '';
  $name = implode(' ', array_filter([$u['first_name'] ?? '', $u['last_name'] ?? ''], 'strlen'));
  return $name !== '' ? $name : (!empty($u['username']) ? '@' . $u['username'] : '');
}
function iq_who($u) {
  if (!$u) return '?';
  $name = !empty($u['username']) ? '@' . $u['username'] : (iq_name($u) ?: '—');
  return $name . ' (' . $u['id'] . ')';
}
function iq_caption($o) {
  return 'Test kodi: ' . $o['code'] . ' · Foydalanuvchi: ' . ($o['who'] ?? ('(' . $o['uid'] . ')')) .
         (!empty($o['iq']) ? ' · IQ ' . $o['iq'] : '');
}

/* ── Qaror — chatdagi tugma ham, admin panel ham SHU funksiyadan oʻtadi. ──
   Qaytadi: ['ok'=>true, 'order'=>…] yoki ['ok'=>false, 'error'=>…]. */
function iq_decide($env, $code, $act, $adminUser) {
  $act = $act === 'ok' ? 'ok' : 'no';
  $by = !empty($adminUser['username']) ? '@' . $adminUser['username']
      : (!empty($adminUser['first_name']) ? $adminUser['first_name'] : 'admin');
  $res = iq_store($env, function (&$db) use ($code, $act, $by, $env) {
    $o = $db['orders'][$code] ?? null;
    if (!$o || ($o['status'] ?? '') === 'draft') return ['ok' => false, 'error' => 'Buyurtma topilmadi'];
    if (in_array($o['status'], ['ok', 'no'], true)) {
      return ['ok' => false, 'error' => $o['status'] === 'ok' ? 'Allaqachon tasdiqlangan' : 'Allaqachon rad etilgan', 'order' => $o];
    }
    $o['status'] = $act;
    $o['decided'] = time();
    $o['by'] = $by;
    $o['amount'] = $act === 'ok' ? (int)($env['PRICE'] ?? 0) : 0;
    $db['orders'][$code] = $o;
    return ['ok' => true, 'order' => $o];
  });
  if (!$res['ok']) return $res;
  $o = $res['order'];
  if ($act === 'ok') {
    iq_api($env, 'sendMessage', ['chat_id' => (int)$o['uid'], 'text' => iq_text('ok'),
      'reply_markup' => ['inline_keyboard' => [[['text' => iq_text('open'), 'web_app' => ['url' => iq_unlock_url($env, $code)]]]]]]);
  } else {
    iq_api($env, 'sendMessage', ['chat_id' => (int)$o['uid'], 'text' => iq_text('no')]);
  }
  /* Har bir admindagi chek nusxasi yangilanadi (tugmalar olinadi). */
  $mark = $act === 'ok' ? '✅ Tasdiqlandi (' . $by . ')' : '❌ Rad etildi (' . $by . ')';
  foreach (($o['msgs'] ?? []) as $cm) {
    iq_api($env, 'editMessageCaption', ['chat_id' => $cm[0], 'message_id' => $cm[1],
      'caption' => iq_caption($o) . "\n" . $mark, 'reply_markup' => ['inline_keyboard' => []]]);
  }
  return $res;
}

/* ── Telegram.WebApp.initData tekshiruvi (admin panel) ─────────────────
   https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
   Qaytadi: foydalanuvchi massivi yoki null. */
function iq_verify_init_data($env, $initData, $maxAge = 86400) {
  if (!is_string($initData) || $initData === '' || empty($env['BOT_TOKEN'])) return null;
  $pairs = [];
  foreach (explode('&', $initData) as $kv) {
    $p = strpos($kv, '=');
    if ($p === false) continue;
    $pairs[urldecode(substr($kv, 0, $p))] = urldecode(substr($kv, $p + 1));
  }
  if (empty($pairs['hash'])) return null;
  $hash = $pairs['hash'];
  unset($pairs['hash']);
  ksort($pairs, SORT_STRING);
  $lines = [];
  foreach ($pairs as $k => $v) $lines[] = $k . '=' . $v;
  $secret = hash_hmac('sha256', (string)$env['BOT_TOKEN'], 'WebAppData', true);
  if (!hash_equals(hash_hmac('sha256', implode("\n", $lines), $secret), strtolower($hash))) return null;
  if ($maxAge > 0 && (time() - (int)($pairs['auth_date'] ?? 0)) > $maxAge) return null;
  $user = json_decode($pairs['user'] ?? '', true);
  return is_array($user) && isset($user['id']) ? $user : null;
}

/* Chek rasmi uchun qisqa muddatli imzo (file.php) — initData URL'ga tushmasin. */
function iq_file_sig($env, $id, $exp) {
  return substr(hash_hmac('sha256', 'file:' . $id . ':' . $exp, (string)$env['BOT_TOKEN']), 0, 32);
}
function iq_file_url($env, $id) {
  $exp = time() + 3600;
  return '../bot/file.php?id=' . rawurlencode($id) . '&exp=' . $exp . '&sig=' . iq_file_sig($env, $id, $exp);
}
