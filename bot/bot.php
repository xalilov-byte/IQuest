<?php
/* ─────────────────────────────────────────────────────────────────────────
   IQuest BOTI — webhook (bitta bot hamma narsa uchun). DEPLOY-AHOST.md.

   Foydalanuvchi:
     /start               → salom + «IQuestni ochish» web_app tugmasi (WEBAPP_URL)
     /start pay_<KOD>[_T] → chek rasmini soʻraydi (force_reply); T — IQ belgisi
                            (src/paywall.js iqTag), buyurtma «draft» boʻlib yoziladi
     rasm (javob)         → buyurtma «pending», rasm HAR BIR ADMIN_IDS ga
                            [✅ Tasdiq] [❌ Yolgʻon] tugmalari bilan
     /myid                → foydalanuvchining Telegram id raqami
   Admin (ADMIN_IDS):
     /start, /admin       → qoʻshimcha «Admin panel» web_app tugmasi (app/admin.html)
     ✅ / ❌              → iq_decide(): foydalanuvchiga «Natijani ochish»
                            (WEBAPP_URL?unlock=<KOD>-<OCHISH>) yoki rad xabari
   Tugmalarni faqat ADMIN_IDS dagi odamlar bosa oladi.
   WEBHOOK_SECRET berilgan boʻlsa — X-Telegram-Bot-Api-Secret-Token tekshiriladi.
   ───────────────────────────────────────────────────────────────────── */
require_once __DIR__ . '/lib.php';

function iq_hello($env, $chat, $uid) {
  $admin = iq_is_admin($env, $uid);
  $rows = [];
  if (!empty($env['WEBAPP_URL'])) $rows[] = [['text' => iq_text('app'), 'web_app' => ['url' => (string)$env['WEBAPP_URL']]]];
  if ($admin && !empty($env['WEBAPP_URL'])) $rows[] = [['text' => iq_text('admin'), 'web_app' => ['url' => iq_admin_url($env)]]];
  $body = ['chat_id' => $chat, 'text' => iq_text($admin ? 'helloAdmin' : 'hello')];
  if ($rows) $body['reply_markup'] = ['inline_keyboard' => $rows];
  iq_api($env, 'sendMessage', $body);
}

function iq_handle_update($update, $env) {
  $msg = $update['message'] ?? null;
  if ($msg && isset($msg['chat']) && ($msg['chat']['type'] ?? '') === 'private') {
    $chat = $msg['chat']['id'];
    $from = $msg['from'] ?? ['id' => $chat];
    $uid = $from['id'] ?? $chat;
    $text = trim((string)($msg['text'] ?? ''));

    if (preg_match('/^\/myid(@\w+)?$/', $text)) {
      iq_api($env, 'sendMessage', ['chat_id' => $chat, 'text' => iq_text('myid', (string)$uid)]);
      return;
    }
    if (preg_match('/^\/admin(@\w+)?$/', $text)) {
      iq_hello($env, $chat, $uid);              // admin'ga — «Admin panel» tugmasi bilan
      return;
    }
    if (strpos($text, '/start') === 0) {
      $code = ''; $tag = '';
      if (preg_match('/^\/start\s+pay_(IQ-[0-9A-Za-z]{4})(?:_([0-9A-Za-z]{2}))?$/', $text, $m)) {
        $code = strtoupper($m[1]); $tag = $m[2] ?? '';
      }
      if ($code !== '' && preg_match(IQ_CODE_RE, $code)) {
        $iq = $tag !== '' ? iq_tag_decode($code, $tag, $env['UNLOCK_SECRET'] ?? '') : null;
        iq_store($env, function (&$db) use ($code, $uid, $from, $iq) {
          $o = $db['orders'][$code] ?? null;
          if ($o && in_array($o['status'], ['pending', 'ok'], true)) return;   // qaror kutilmoqda / tasdiqlangan
          $db['orders'][$code] = ['code' => $code, 'uid' => $uid, 'name' => iq_name($from),
            'username' => $from['username'] ?? '', 'who' => iq_who($from), 'iq' => $iq,
            'status' => 'draft', 'created' => time()];
        });
        iq_api($env, 'sendMessage', ['chat_id' => $chat, 'text' => iq_text('ask', $code),
          'reply_markup' => ['force_reply' => true, 'input_field_placeholder' => 'Chek rasmi']]);
      } else {
        iq_hello($env, $chat, $uid);
      }
      return;
    }

    $photo = !empty($msg['photo']) ? $msg['photo'][count($msg['photo']) - 1]['file_id'] : '';
    $doc = ($photo === '' && isset($msg['document']) && preg_match('/^image\//', (string)($msg['document']['mime_type'] ?? '')))
      ? $msg['document']['file_id'] : '';
    if ($photo === '' && $doc === '') { iq_hello($env, $chat, $uid); return; }

    $ref = $msg['reply_to_message'] ?? null;
    $src = (($ref && !empty($ref['from']['is_bot'])) ? (string)($ref['text'] ?? '') : '') . ' ' . (string)($msg['caption'] ?? '');
    if (!preg_match(IQ_CODE_RE, strtoupper($src), $cm)) {
      iq_api($env, 'sendMessage', ['chat_id' => $chat, 'text' => iq_text('noCode')]);
      return;
    }
    $code = $cm[0];
    $admins = iq_admin_ids($env);
    $o = iq_store($env, function (&$db) use ($code, $uid, $from, $photo, $doc) {
      $prev = $db['orders'][$code] ?? [];
      if (in_array($prev['status'] ?? '', ['ok'], true)) return $prev;          // allaqachon tasdiqlangan
      $o = array_merge($prev, ['code' => $code, 'uid' => $uid, 'name' => iq_name($from),
        'username' => $from['username'] ?? '', 'who' => iq_who($from), 'iq' => $prev['iq'] ?? null,
        'status' => 'pending', 'created' => $prev['created'] ?? time(), 'paid' => time(),
        'file' => $photo !== '' ? $photo : $doc, 'kind' => $photo !== '' ? 'photo' : 'document', 'msgs' => []]);
      $db['orders'][$code] = $o;
      return $o;
    });
    if (($o['status'] ?? '') === 'ok') {
      iq_api($env, 'sendMessage', ['chat_id' => $chat, 'text' => iq_text('ok'),
        'reply_markup' => ['inline_keyboard' => [[['text' => iq_text('open'), 'web_app' => ['url' => iq_unlock_url($env, $code)]]]]]]);
      return;
    }
    $markup = ['inline_keyboard' => [[
      ['text' => '✅ Tasdiq', 'callback_data' => 'ok:' . $code . ':' . $uid],
      ['text' => '❌ Yolgʻon', 'callback_data' => 'no:' . $code . ':' . $uid],
    ]]];
    $msgs = [];
    foreach ($admins as $aid) {
      $body = ['chat_id' => (int)$aid, 'caption' => iq_caption($o), 'reply_markup' => $markup];
      if ($photo !== '') { $body['photo'] = $photo; $r = iq_api($env, 'sendPhoto', $body); }
      else { $body['document'] = $doc; $r = iq_api($env, 'sendDocument', $body); }
      if (isset($r['result']['message_id'])) $msgs[] = [(int)$aid, (int)$r['result']['message_id']];
    }
    if ($msgs) iq_store($env, function (&$db) use ($code, $msgs) { $db['orders'][$code]['msgs'] = $msgs; });
    iq_api($env, 'sendMessage', ['chat_id' => $chat, 'text' => iq_text('got')]);
    if (!$admins) error_log('iquest bot: ' . iq_text('noAdmin'));
    return;
  }

  $cq = $update['callback_query'] ?? null;
  if ($cq) {
    $ok = preg_match('/^(ok|no):(IQ-[0-9A-Z]{4}):(\d+)$/', (string)($cq['data'] ?? ''), $m);
    if (!$ok || !iq_is_admin($env, $cq['from']['id'] ?? '')) {
      iq_api($env, 'answerCallbackQuery', ['callback_query_id' => $cq['id'], 'text' => 'Ruxsat yoʻq', 'show_alert' => true]);
      return;
    }
    $res = iq_decide($env, $m[2], $m[1], $cq['from'] ?? []);
    iq_api($env, 'answerCallbackQuery', ['callback_query_id' => $cq['id'],
      'text' => $res['ok'] ? ($m[1] === 'ok' ? 'Tasdiqlandi' : 'Rad etildi') : $res['error']]);
  }
}

/* ── Webhook kirish nuqtasi ──────────────────────────────────────────── */
if (!defined('IQ_BOT_TEST')) {
  $env = iq_config();
  if (empty($env['BOT_TOKEN'])) { http_response_code(500); echo 'config.php yoʻq yoki BOT_TOKEN boʻsh'; exit; }
  if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') { echo 'IQuest bot'; exit; }
  if (!empty($env['WEBHOOK_SECRET']) &&
      !hash_equals((string)$env['WEBHOOK_SECRET'], (string)($_SERVER['HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN'] ?? ''))) {
    http_response_code(403); echo 'forbidden'; exit;
  }
  $update = json_decode((string)file_get_contents('php://input'), true);
  if (!is_array($update)) { http_response_code(400); echo 'bad json'; exit; }
  try { iq_handle_update($update, $env); } catch (Throwable $e) { error_log('iquest bot: ' . $e->getMessage()); }
  echo 'ok';   // Telegram qayta yubormasin
}
