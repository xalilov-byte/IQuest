<?php
/* Chek rasmi (admin panel uchun). ?id=<file_id>&exp=<unix>&sig=<imzo> —
   imzoni faqat admin-api.php beradi (1 soat). Token brauzerga chiqmaydi. */
require_once __DIR__ . '/lib.php';
$env = iq_config();
$id = (string)($_GET['id'] ?? ''); $exp = (int)($_GET['exp'] ?? 0); $sig = (string)($_GET['sig'] ?? '');
if (empty($env['BOT_TOKEN']) || $id === '' || $exp < time() || !hash_equals(iq_file_sig($env, $id, $exp), $sig)) {
  http_response_code(403); exit;
}
$r = iq_api($env, 'getFile', ['file_id' => $id]);
$path = $r['result']['file_path'] ?? '';
if ($path === '') { http_response_code(404); exit; }
$data = iq_http('https://api.telegram.org/file/bot' . $env['BOT_TOKEN'] . '/' . $path);
if (!is_string($data) || $data === '') { http_response_code(502); exit; }
$ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
$types = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp', 'gif' => 'image/gif'];
header('Content-Type: ' . ($types[$ext] ?? 'application/octet-stream'));
header('Cache-Control: private, max-age=3600');
header('X-Content-Type-Options: nosniff');
echo $data;
