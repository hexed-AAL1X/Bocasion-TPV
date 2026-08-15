<?php

final class ApisPeruClient
{
    private const BASE = 'https://dniruc.apisperu.com/api/v1';

    public static function query(string $path, string $token): array
    {
        $url = self::BASE . $path . '?token=' . rawurlencode($token);

        $ch = curl_init($url);
        if ($ch === false) {
            return self::err(502, 'No se pudo conectar con APIsPeru');
        }

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 25,
            CURLOPT_HTTPHEADER => [
                'Accept: application/json',
                'Authorization: Bearer ' . $token,
            ],
        ]);

        $text = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($text === false) {
            return self::err(502, 'No se pudo conectar con APIsPeru');
        }

        $body = json_decode($text, true);
        if (!is_array($body)) {
            return self::err(502, $text !== '' ? $text : 'Error desconocido de APIsPeru');
        }

        $msg = $body['message'] ?? $text;
        $failed = $status >= 400 || ($body['success'] ?? true) === false || ($body['status'] ?? '') === 'error';

        if (!$failed) {
            return ['ok' => true, 'status' => $status, 'body' => $body];
        }

        $friendly = self::friendlyError($status, is_string($msg) ? $msg : 'Error APIsPeru');
        return self::err($status >= 400 ? $status : 502, $friendly);
    }

    private static function friendlyError(int $status, string $message): string
    {
        if ($status === 401 || stripos($message, 'token not found') !== false) {
            return 'Token no enviado o inválido. Revisa APISPERU_TOKEN en config.php';
        }
        if ($message === 'Ocurrió un Error' || stripos($message, 'ocurrió un error') !== false) {
            return 'APIsPeru rechazó la consulta. Revisa el token en apisperu.com/admin';
        }
        return $message;
    }

    private static function err(int $status, string $message): array
    {
        return [
            'ok' => false,
            'status' => $status,
            'body' => ['success' => false, 'message' => $message],
        ];
    }
}
