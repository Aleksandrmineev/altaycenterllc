<?php
// sendtg.php — отправка формы в Telegram (продакшн)
header('Content-Type: application/json; charset=utf-8');

// === НАСТРОЙКИ ===
$TOKEN   = '8042188223:AAGiQLFwnSYK86FX0O3dMUbsj6dPK-1xwLc';
$CHAT_ID = '303648524';              // можно несколько через запятую: "111,222"
$TG_HOST = 'api.telegram.org';
$TG_IP   = '149.154.167.220';        // обнови из nslookup при необходимости
date_default_timezone_set('Europe/Vienna');

// Разрешаем только POST с JSON
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Bad JSON']);
    exit;
}

// Honeypot (если добавлено скрытое поле name="hp")
if (!empty($data['hp'])) {
    echo json_encode(['ok' => true]);
    exit;
}

// Поля формы
$name    = trim($data['name']    ?? '');
$contact = trim($data['contact'] ?? '');
$dates   = trim($data['dates']   ?? '');
$msg     = trim($data['message'] ?? '');
$url     = trim($data['meta']['url'] ?? '');

// Мини-валидация
if ($name === '' && $contact === '') {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'name or contact required']);
    exit;
}

// Метаданные
$ip      = $_SERVER['REMOTE_ADDR']     ?? '';
$referer = $_SERVER['HTTP_REFERER']    ?? '';
$ua      = $_SERVER['HTTP_USER_AGENT'] ?? '';
$when    = date('Y-m-d H:i:s');

// Экранирование
$esc = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

// Тело сообщения
$text  = "<b>Заявка на бронирование</b>\n";
if ($name)    $text .= "— <b>Имя:</b> "         . $esc($name)    . "\n";
if ($contact) $text .= "— <b>Контакт:</b> "     . $esc($contact) . "\n";
if ($dates)   $text .= "— <b>Даты/состав:</b> " . $esc($dates)   . "\n";
if ($msg)     $text .= "— <b>Комментарий:</b> " . $esc($msg)     . "\n";
$text .= "\n<b>Метаданные</b>\n";
if ($url)     $text .= "🌐 <code>" . $esc($url) . "</code>\n";
if ($referer) $text .= "↩️ Ref: <code>" . $esc($referer) . "</code>\n";
$text .= "🕒 " . $esc($when) . " (Europe/Vienna)\n";
if ($ip)      $text .= "🧭 IP: <code>" . $esc($ip) . "</code>\n";
if ($ua)      $text .= "💻 UA: <code>" . $esc($ua) . "</code>\n";

// Отправка (поддержка нескольких chat_id)
$api     = "https://{$TG_HOST}/bot{$TOKEN}/sendMessage";
$payload = [
    'text' => $text,
    'parse_mode' => 'HTML',
    'disable_web_page_preview' => true
];

$ids  = array_filter(array_map('trim', explode(',', $CHAT_ID)));
$fail = [];

foreach ($ids as $id) {
    $payload['chat_id'] = $id;

    $ch = curl_init($api);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($payload, '', '&', PHP_QUERY_RFC3986),
        CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => [
            'Host: ' . $TG_HOST,
            'Content-Type: application/x-www-form-urlencoded'
        ],
        CURLOPT_RESOLVE => ["{$TG_HOST}:443:$TG_IP"], // обходим DNS InfinityFree
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);
    $resp = curl_exec($ch);
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    $ok = false;
    if ($resp !== false && $http < 400) {
        $j = json_decode($resp, true);
        $ok = is_array($j) && !empty($j['ok']);
    }
    if (!$ok) $fail[] = ['chat_id' => $id, 'http' => $http, 'err' => $err, 'resp' => $resp];
}

if ($fail) {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'tg_send_failed', 'details' => $fail], JSON_UNESCAPED_UNICODE);
} else {
    echo json_encode(['ok' => true]);
}
