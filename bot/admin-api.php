<?php
/* ─────────────────────────────────────────────────────────────────────────
   Admin panel API (app/admin.html). POST JSON:
     { initData, action: "list" }                    → buyurtmalar + statistika
     { initData, action: "decide", code, act: ok|no } → iq_decide() (chatdagi ✅/❌ bilan bir xil)
   Ruxsat: Telegram.WebApp.initData HMAC (BOT_TOKEN) + user.id ∈ ADMIN_IDS.
   ───────────────────────────────────────────────────────────────────── */
require_once __DIR__ . '/lib.php';

function iq_admin_api($env, $in) {
  $user = iq_verify_init_data($env, (string)($in['initData'] ?? ''));
  if (!$user) return [401, ['ok' => false, 'error' => 'Telegram tekshiruvidan oʻtmadi — panelni bot orqali oching']];
  if (!iq_is_admin($env, $user['id'])) return [403, ['ok' => false, 'error' => 'Ruxsat yoʻq']];
  $action = (string)($in['action'] ?? 'list');
  if ($action === 'decide') {
    $code = strtoupper((string)($in['code'] ?? ''));
    if (!preg_match('/^IQ-[0-9A-HJKMNP-TV-Z]{4}$/', $code)) return [400, ['ok' => false, 'error' => 'Kod notoʻgʻri']];
    $res = iq_decide($env, $code, ($in['act'] ?? '') === 'ok' ? 'ok' : 'no', $user);
    if (!$res['ok']) return [409, ['ok' => false, 'error' => $res['error']]];
  }
  $orders = []; $day = date('Y-m-d');
  $st = ['todayCount' => 0, 'todaySum' => 0, 'totalCount' => 0, 'totalSum' => 0, 'pending' => 0];
  foreach (iq_orders($env) as $o) {
    if (($o['status'] ?? '') === 'draft') continue;
    if ($o['status'] === 'pending') $st['pending']++;
    if ($o['status'] === 'ok') {
      $st['totalCount']++; $st['totalSum'] += (int)($o['amount'] ?? 0);
      if (date('Y-m-d', (int)($o['decided'] ?? 0)) === $day) { $st['todayCount']++; $st['todaySum'] += (int)($o['amount'] ?? 0); }
    }
    $orders[] = ['code' => $o['code'], 'status' => $o['status'], 'name' => $o['name'] ?? '', 'username' => $o['username'] ?? '',
      'uid' => $o['uid'], 'iq' => $o['iq'] ?? null, 'paid' => $o['paid'] ?? null, 'decided' => $o['decided'] ?? null,
      'by' => $o['by'] ?? '', 'img' => !empty($o['file']) ? iq_file_url($env, $o['file']) : ''];
  }
  usort($orders, function ($a, $b) { return ($b['paid'] ?? 0) <=> ($a['paid'] ?? 0); });
  return [200, ['ok' => true, 'orders' => $orders, 'stats' => $st, 'price' => (int)($env['PRICE'] ?? 0)]];
}

if (!defined('IQ_BOT_TEST')) {
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  $env = iq_config();
  if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST' || empty($env['BOT_TOKEN'])) {
    http_response_code(405); echo '{"ok":false}'; exit;
  }
  $in = json_decode((string)file_get_contents('php://input'), true);
  try { list($code, $out) = iq_admin_api($env, is_array($in) ? $in : []); }
  catch (Throwable $e) { $code = 500; $out = ['ok' => false, 'error' => 'Server xatosi']; error_log('iquest admin: ' . $e->getMessage()); }
  http_response_code($code);
  echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
