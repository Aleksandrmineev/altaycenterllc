<?php
$TOKEN = '8042188223:AAGiQLFwnSYK86FX0O3dMUbsj6dPK-1xwLc';
$CHAT_ID = '303648524';
$host = 'api.telegram.org';
$ipTG = '149.154.167.220';
$api = "https://{$host}/bot{$TOKEN}/sendMessage";
$payload = ['chat_id' => $CHAT_ID, 'text' => 'Test from InfinityFree', 'parse_mode' => 'HTML'];

$ch = curl_init($api);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => http_build_query($payload),
    CURLOPT_TIMEOUT => 15,
    CURLOPT_HTTPHEADER => ['Host: ' . $host, 'Content-Type: application/x-www-form-urlencoded'],
    CURLOPT_RESOLVE => ["$host:443:$ipTG"],
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
]);
$resp = curl_exec($ch);
$http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err = curl_error($ch);
curl_close($ch);
header('Content-Type:text/plain; charset=utf-8');
var_dump($http, $resp, $err);
