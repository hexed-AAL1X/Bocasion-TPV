<?php
/**
 * Copiar este archivo como config.php y completar los valores.
 * config.php no debe ser público (protegido por .htaccess).
 */
return [
    // Preferido: https://consulta.rucpe.com/ — clave gratis en /api
    // DNI (8 dígitos) + RUC (11 dígitos) con la misma clave.
    'rucpe_api_key' => '',

    // Legacy (solo si no usas rucpe):
    'apisperu_token' => '',
    'dni_provider' => 'rucpe', // rucpe | eldni | apisperu
    'ruc_provider' => 'rucpe', // rucpe | apisperu

    // Orígenes permitidos (app Electron/Vite). Añade tu dominio si aplica.
    'cors_origins' => [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'https://bocasion.com',
        'https://www.bocasion.com',
    ],
];
