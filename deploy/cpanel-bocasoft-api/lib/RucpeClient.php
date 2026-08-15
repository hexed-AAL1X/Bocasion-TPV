<?php

/**
 * Cliente API https://consulta.rucpe.com/ (SUNAT + RENIEC).
 */
class RucpeClient
{
    private const BASE = 'https://consulta.rucpe.com/api/v1';

    /**
     * @return array{status:int, body:array}
     */
    public static function query(string $type, string $value, string $apiKey): array
    {
        $type = $type === 'ruc' ? 'ruc' : 'dni';
        $url = self::BASE . '/' . $type . '/' . rawurlencode($value);

        $ch = curl_init($url);
        if ($ch === false) {
            return self::err(502, 'No se pudo iniciar consulta a consulta.rucpe.com');
        }

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_HTTPHEADER => [
                'Accept: application/json',
                'X-API-Key: ' . $apiKey,
            ],
        ]);

        $raw = curl_exec($ch);
        $errno = curl_errno($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($errno !== 0 || $raw === false) {
            return self::err(502, 'No se pudo conectar con consulta.rucpe.com');
        }

        $json = json_decode($raw, true);
        if (!is_array($json)) {
            return self::err(502, 'Respuesta inválida de consulta.rucpe.com');
        }

        if ($status < 200 || $status >= 300) {
            $detail = '';
            if (isset($json['detail']) && is_string($json['detail'])) {
                $detail = $json['detail'];
            } elseif (isset($json['message']) && is_string($json['message'])) {
                $detail = $json['message'];
            }
            return [
                'status' => $status >= 400 ? $status : 502,
                'body' => [
                    'success' => false,
                    'message' => self::friendly($status, $detail),
                ],
            ];
        }

        return [
            'status' => $status,
            'body' => self::toLegacy($type, $json),
        ];
    }

    /**
     * @param array<string,mixed> $data
     * @return array{success:true, provider:string, data:array<string,mixed>}
     */
    private static function toLegacy(string $type, array $data): array
    {
        if ($type === 'ruc') {
            $via = trim(implode(' ', array_filter([
                $data['tipo_via'] ?? null,
                $data['nombre_via'] ?? null,
                $data['numero'] ?? null,
            ])));

            return [
                'success' => true,
                'provider' => 'consulta.rucpe.com',
                'data' => [
                    'ruc' => $data['ruc'] ?? null,
                    'razonSocial' => $data['razon_social'] ?? null,
                    'razon_social' => $data['razon_social'] ?? null,
                    'estado' => $data['estado'] ?? null,
                    'condicion' => $data['condicion_domicilio'] ?? null,
                    'direccion' => $via,
                    'departamento' => $data['departamento'] ?? null,
                    'provincia' => $data['provincia'] ?? null,
                    'distrito' => $data['distrito'] ?? null,
                    'ubigeo' => $data['ubigeo'] ?? null,
                ],
            ];
        }

        $full = isset($data['full_name']) && is_string($data['full_name'])
            ? $data['full_name']
            : trim(implode(' ', array_filter([
                $data['first_last_name'] ?? null,
                $data['second_last_name'] ?? null,
                $data['first_name'] ?? null,
            ])));

        return [
            'success' => true,
            'provider' => 'consulta.rucpe.com',
            'data' => [
                'dni' => $data['document_number'] ?? null,
                'document_number' => $data['document_number'] ?? null,
                'nombreCompleto' => $full,
                'full_name' => $full,
                'nombres' => $data['first_name'] ?? null,
                'apellidoPaterno' => $data['first_last_name'] ?? null,
                'apellidoMaterno' => $data['second_last_name'] ?? null,
            ],
        ];
    }

    private static function friendly(int $status, string $detail): string
    {
        $lower = strtolower($detail);
        if ($status === 401 || strpos($lower, 'api key') !== false || strpos($lower, 'not authenticated') !== false) {
            return 'Clave API inválida. Revisa rucpe_api_key en config.php (https://consulta.rucpe.com/api)';
        }
        if ($status === 404 || strpos($lower, 'not found') !== false || strpos($lower, 'no encontr') !== false) {
            return 'Documento no encontrado en el padrón.';
        }
        return $detail !== '' ? $detail : "Error al consultar consulta.rucpe.com ($status)";
    }

    /** @return array{status:int, body:array} */
    private static function err(int $status, string $message): array
    {
        return [
            'status' => $status,
            'body' => ['success' => false, 'message' => $message],
        ];
    }
}
