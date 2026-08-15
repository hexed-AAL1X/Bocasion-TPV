# API BocaSoft — cPanel (Yachay.lat / public_html)

Paquete PHP para hosting compartido. **No requiere Node.js.**

## 1. Subir archivos

En **Administrador de archivos** → `public_html`:

1. Crea la carpeta `bocasoft-api` (o el nombre que prefieras).
2. Sube **todo** el contenido de esta carpeta (`index.php`, `.htaccess`, `lib/`, `config.example.php`).
3. Copia `config.example.php` → `config.php`
   - **Preferido:** pon `rucpe_api_key` de [consulta.rucpe.com/api](https://consulta.rucpe.com/api) (DNI 8 + RUC 11).
   - `dni_provider` / `ruc_provider` = `rucpe`
   - `cors_origins` — incluye `http://localhost:5173`

## 2. Probar en el navegador

Diagnóstico (sin rewrite):

```
https://TU-DOMINIO/dni-api/check.php
```

Debe mostrar `"curl": true` y `"config_exists": true`.

Luego:

```
https://TU-DOMINIO/dni-api/api/health
```

Si la carpeta no se llama `dni-api`, edita `.htaccess` → `RewriteBase /tu-carpeta/`

Debe responder JSON con `"ok": true`.

DNI de prueba:

```
https://TU-DOMINIO/bocasoft-api/api/dni/73223071
```

## 3. Conectar la app BocaSoft

En el `.env` del proyecto (raíz):

```env
VITE_API_BASE_URL=https://TU-DOMINIO/bocasoft-api
```

Luego solo:

```bash
npm run dev
```

## 4. Si las rutas no funcionan (404)

Edita `.htaccess` y descomenta **RewriteBase** con la ruta de tu carpeta:

```apache
RewriteBase /bocasoft-api/
```

## 5. Empaquetar ZIP desde tu PC

```bash
npm run pack:cpanel
```

Genera `release/bocasoft-api-cpanel.zip` listo para subir y extraer en cPanel.

## Endpoints (igual que el API Node)

| GET | Ruta |
|-----|------|
| `/api/health` | Estado |
| `/api/dni/12345678` | DNI vía **eldni.com** (sin token) |
| `/api/ruc/20123456789` | RUC vía APIsPeru (requiere token) |
