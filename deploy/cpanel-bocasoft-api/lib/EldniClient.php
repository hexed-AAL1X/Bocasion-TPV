<?php

final class EldniClient
{
    private const URL = 'https://eldni.com/pe/buscar-datos-por-dni';
    private const UA = 'Mozilla/5.0 (compatible; BocaSoft/1.0; +https://www.bocasion.com)';

    public static function query(string $dni): array
    {
        $session = self::openSession();
        if (!$session['ok']) {
            return $session;
        }

        $ch = curl_init(self::URL);
        if ($ch === false) {
            return self::err(502, 'No se pudo consultar eldni.com');
        }

        $body = http_build_query(['dni' => $dni, '_token' => $session['token']]);

        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 25,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_HTTPHEADER => [
                'Accept: text/html,application/xhtml+xml',
                'Content-Type: application/x-www-form-urlencoded',
                'User-Agent: ' . self::UA,
                'Referer: ' . self::URL,
                'Origin: https://eldni.com',
                'Cookie: ' . $session['cookie'],
            ],
        ]);

        $html = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($html === false) {
            return self::err(502, 'No se pudo consultar eldni.com');
        }

        if ($status === 419) {
            return self::err(502, 'Sesión expirada en eldni.com. Intenta de nuevo.');
        }

        if ($status < 200 || $status >= 300) {
            return self::err(502, "eldni.com respondió con error ($status)");
        }

        if (strpos($html, 'No se encontraron datos para el DNI') !== false) {
            return self::err(404, 'DNI no encontrado');
        }

        $nombres = self::readInput($html, 'nombres');
        $apPat = self::readInput($html, 'apellidop');
        $apMat = self::readInput($html, 'apellidom');
        $completo = self::readInput($html, 'completos');
        $nombreCompleto = $completo !== '' ? $completo : trim("$apPat $apMat $nombres");

        if ($nombreCompleto === '') {
            return self::err(502, 'eldni.com no devolvió datos parseables para este DNI');
        }

        return [
            'ok' => true,
            'status' => 200,
            'body' => [
                'success' => true,
                'data' => [
                    'dni' => $dni,
                    'nombres' => $nombres,
                    'apellido_paterno' => $apPat,
                    'apellido_materno' => $apMat,
                    'nombre_completo' => $nombreCompleto,
                ],
                'provider' => 'eldni.com',
            ],
        ];
    }

    private static function openSession(): array
    {
        $ch = curl_init(self::URL);
        if ($ch === false) {
            return self::err(502, 'No se pudo conectar con eldni.com');
        }

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER => true,
            CURLOPT_TIMEOUT => 25,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_HTTPHEADER => [
                'Accept: text/html,application/xhtml+xml',
                'User-Agent: ' . self::UA,
            ],
        ]);

        $raw = curl_exec($ch);
        if ($raw === false) {
            curl_close($ch);
            return self::err(502, 'No se pudo conectar con eldni.com');
        }

        $headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        curl_close($ch);

        $headers = substr($raw, 0, $headerSize);
        $html = substr($raw, $headerSize);

        if (!preg_match('/name="_token"\s+value="([^"]+)"/i', $html, $m)) {
            return self::err(502, 'No se pudo obtener token CSRF de eldni.com');
        }

        $cookie = self::parseCookies($headers);
        if ($cookie === '') {
            return self::err(502, 'No se pudo iniciar sesión en eldni.com');
        }

        return ['ok' => true, 'token' => $m[1], 'cookie' => $cookie];
    }

    private static function parseCookies(string $headers): string
    {
        $pairs = [];
        foreach (preg_split('/\r\n/', $headers) as $line) {
            if (stripos($line, 'Set-Cookie:') !== 0) {
                continue;
            }
            $value = trim(substr($line, 11));
            $part = explode(';', $value, 2)[0] ?? '';
            if ($part !== '') {
                $pairs[] = $part;
            }
        }
        return implode('; ', $pairs);
    }

    private static function readInput(string $html, string $id): string
    {
        if (preg_match('/id="' . preg_quote($id, '/') . '"\s+value="([^"]*)"/i', $html, $m)) {
            return trim($m[1]);
        }
        return '';
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
