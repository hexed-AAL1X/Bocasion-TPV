<?php

header('Content-Type: application/json; charset=utf-8');

try {
    if (!function_exists('curl_init')) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'El hosting debe tener la extensión PHP curl habilitada.',
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    require __DIR__ . '/lib/bootstrap.php';
    require __DIR__ . '/lib/EldniClient.php';
    require __DIR__ . '/lib/ApisPeruClient.php';
    require __DIR__ . '/lib/RucpeClient.php';

    $config = load_config();
    apply_cors($config);

    $path = route_path();
    $apisperuToken = trim((string) ($config['apisperu_token'] ?? ''));
    $rucpeKey = trim((string) ($config['rucpe_api_key'] ?? ''));
    $dniProvider = strtolower((string) ($config['dni_provider'] ?? ($rucpeKey !== '' ? 'rucpe' : 'eldni')));
    $rucProvider = strtolower((string) ($config['ruc_provider'] ?? ($rucpeKey !== '' ? 'rucpe' : 'apisperu')));

    if ($path === '/api/health') {
        json_response(200, [
            'ok' => true,
            'dniProvider' => $dniProvider,
            'rucProvider' => $rucProvider === 'rucpe' && $rucpeKey !== ''
                ? 'consulta.rucpe.com'
                : ($apisperuToken !== '' ? 'dniruc.apisperu.com' : null),
            'hasRucpeKey' => $rucpeKey !== '',
            'hasApisperuToken' => $apisperuToken !== '',
            'host' => 'cpanel-php',
        ]);
    }

    if (preg_match('#^/api/dni/(\d{8})$#', $path, $m)) {
        $dni = $m[1];

        if ($dniProvider === 'rucpe') {
            if ($rucpeKey === '') {
                json_response(500, [
                    'success' => false,
                    'message' => 'Falta rucpe_api_key en config.php (https://consulta.rucpe.com/api)',
                ]);
            }
            $result = RucpeClient::query('dni', $dni, $rucpeKey);
            json_response($result['status'], $result['body']);
        }

        if ($dniProvider === 'apisperu') {
            if ($apisperuToken === '') {
                json_response(500, [
                    'success' => false,
                    'message' => 'Falta APISPERU_TOKEN en config.php',
                ]);
            }
            $result = ApisPeruClient::query("/dni/$dni", $apisperuToken);
            json_response($result['status'], $result['body']);
        }

        $result = EldniClient::query($dni);
        json_response($result['status'], $result['body']);
    }

    if (preg_match('#^/api/ruc/(\d{11})$#', $path, $m)) {
        $ruc = $m[1];

        if ($rucProvider === 'rucpe') {
            if ($rucpeKey === '') {
                json_response(500, [
                    'success' => false,
                    'message' => 'Falta rucpe_api_key en config.php (https://consulta.rucpe.com/api)',
                ]);
            }
            $result = RucpeClient::query('ruc', $ruc, $rucpeKey);
            json_response($result['status'], $result['body']);
        }

        if ($apisperuToken === '') {
            json_response(500, [
                'success' => false,
                'message' => 'Falta APISPERU_TOKEN o rucpe_api_key en config.php (requerido para RUC)',
            ]);
        }

        $result = ApisPeruClient::query('/ruc/' . $ruc, $apisperuToken);
        json_response($result['status'], $result['body']);
    }

    json_response(404, ['success' => false, 'message' => 'Ruta no encontrada', 'path' => $path]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'hint' => 'Abre /dni-api/check.php para diagnóstico',
    ], JSON_UNESCAPED_UNICODE);
}
