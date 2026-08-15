# BocaSoft — API identidad (DNI / RUC)

Servicio Express independiente para desplegar en tu servidor privado.

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Estado del servicio |
| GET | `/api/dni/:dni` | Consulta DNI (8 dígitos) |
| GET | `/api/ruc/:ruc` | Consulta RUC (11 dígitos, requiere token) |

## Empaquetar y subir al servidor

En tu máquina (desde la raíz del repo):

```bash
npm run pack:api
```

Genera `release/bocasoft-identity-api-0.1.0.tgz`. En el VPS:

```bash
mkdir -p ~/bocasoft-api && cd ~/bocasoft-api
tar -xzf bocasoft-identity-api-0.1.0.tgz
cd package
cp .env.example .env   # editar token y CORS
npm install --omit=dev
node dist/index.cjs
```

Con Node 20+ y archivo `.env` en la misma carpeta:

```bash
node --env-file=.env dist/index.cjs
```

Recomendado en producción: **pm2** o **systemd** detrás de nginx con HTTPS.

## Variables

Ver `.env.example`. Importante:

- `RUCPE_API_KEY` — preferido (DNI + RUC vía [consulta.rucpe.com](https://consulta.rucpe.com/api))
- `APISPERU_TOKEN` — fallback legacy para RUC
- `CORS_ORIGINS` — debe incluir el origen desde donde abre la app (p. ej. `http://localhost:5173`)

## Desarrollo local del API

```bash
cd server
cp .env.example .env
npm install
npm run dev
```
