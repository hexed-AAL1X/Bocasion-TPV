# Intranet Ventas — Bocasión S.A.C.

App de escritorio (Electron + React) — gestión de inventario y punto de venta para Bocasión S.A.C.

## Desarrollo

```bash
npm install
cp .env.example .env
```

### Opción A — API en hosting cPanel (Yachay.lat, etc.)

1. Genera el ZIP: `npm run pack:cpanel`
2. En cPanel → `public_html` → carpeta `bocasoft-api` → sube y extrae el ZIP.
3. Copia `config.example.php` → `config.php` (token APIsPeru + CORS). Ver `deploy/cpanel-bocasoft-api/README-CPANEL.md`.
4. En `.env` de la app:

```env
VITE_API_BASE_URL=https://tudominio.com/bocasoft-api
```

5. Solo la UI: `npm run dev`

### Opción A2 — API Node en VPS

`npm run pack:api` → ver `server/README.md`.

### Opción B — API local (pruebas sin servidor)

```bash
npm run dev:all   # API + Electron/Vite
```

### Build de escritorio (Linux AppImage)

```bash
npm run build:desktop
# → release/Intranet Ventas-0.1.0.AppImage
chmod +x release/*.AppImage && ./release/*.AppImage
```

Alias: `npm run pack:linux`.

### Build de escritorio (Windows)

En una máquina **Windows** (recomendado):

```bash
npm run build:win
# → release/Intranet Ventas Setup 0.1.0.exe  (instalador)
# → release/Intranet Ventas 0.1.0.exe        (portable, sin instalar)
```

Alias: `npm run pack:win`. Desde Linux se puede intentar el mismo comando, pero el instalador NSIS suele requerir Wine; lo fiable es generar el `.exe` en Windows.

### Consulta RUC/DNI

1. Escribe el **DNI (8 dígitos)** o **RUC (11 dígitos)** en el campo del TPV.
2. Al completar 8 u 11 dígitos, o al pulsar **RUC/DNI**, la app consulta [consulta.rucpe.com](https://consulta.rucpe.com/).

| Variable | Dónde | Uso |
|----------|--------|-----|
| `VITE_RUCPE_API_KEY` | `.env` de la app | Consulta directa desde Electron |
| `RUCPE_API_KEY` | API local / proxy Vite | Misma clave, lado servidor |
| `rucpe_api_key` | `config.php` (cPanel) | Si usas `VITE_API_BASE_URL` |

Clave gratis: [consulta.rucpe.com/api](https://consulta.rucpe.com/api). Docs: [consulta.rucpe.com/docs](https://consulta.rucpe.com/docs).

Sin clave rucpe, la app sigue usando el proxy (`VITE_API_BASE_URL` / API local) como fallback.

### Seguridad (API)

- Preferible: `RUCPE_API_KEY` / `rucpe_api_key` solo en servidor.
- Helmet, rate limit (120 req/min) y CORS configurable vía `CORS_ORIGINS`.
- Electron: `contextIsolation` activo, sin `nodeIntegration`.

Si ves error al consultar, revisa el token en [apisperu.com/admin](https://apisperu.com/admin) o genera uno nuevo.

## Stack (planificado)

- **UI:** React + Electron
- **Estilos:** variables CSS (paleta corporativa), Poppins, Geist Mono
- **Backend:** Node.js + SQL + PHP (login) — pendiente
