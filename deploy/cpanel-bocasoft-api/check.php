<?php

header('Content-Type: application/json; charset=utf-8');

$checks = [
    'php_version' => PHP_VERSION,
    'curl' => function_exists('curl_init'),
    'config_exists' => is_file(__DIR__ . '/config.php'),
    'lib_readable' => is_readable(__DIR__ . '/lib/bootstrap.php'),
    'htaccess' => is_file(__DIR__ . '/.htaccess'),
];

if ($checks['config_exists']) {
    $cfg = @include __DIR__ . '/config.php';
    $checks['dni_provider'] = is_array($cfg) ? ($cfg['dni_provider'] ?? '?') : 'config inválido';
}

if ($checks['curl']) {
    $ch = curl_init('https://eldni.com/pe/buscar-datos-por-dni');
    curl_setopt_array($ch, [
        CURLOPT_NOBODY => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    curl_exec($ch);
    $checks['eldni_reachable'] = curl_errno($ch) === 0;
    $checks['eldni_http'] = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
}

echo json_encode(['ok' => true, 'checks' => $checks], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
