import "dotenv/config";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { queryEldniDni } from "./providers/eldni.js";
import { queryRucpe, toLegacyIdentityBody } from "./providers/rucpe.js";

const PORT = Number(process.env.API_PORT ?? 3001);
const APIS_PERU_BASE = "https://dniruc.apisperu.com/api/v1";
const apisperuToken = process.env.APISPERU_TOKEN?.trim();
const rucpeKey = process.env.RUCPE_API_KEY?.trim();
const dniProvider = (process.env.DNI_PROVIDER ?? (rucpeKey ? "rucpe" : "eldni")).toLowerCase();
const rucProvider = (process.env.RUC_PROVIDER ?? (rucpeKey ? "rucpe" : "apisperu")).toLowerCase();

const defaultOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
const corsOrigins = process.env.CORS_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? defaultOrigins;

const app = express();
app.use(helmet());
app.use(
  cors({
    origin: corsOrigins,
  }),
);
app.use(express.json({ limit: "32kb" }));
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

function requireApisperu(res: express.Response): boolean {
  if (!apisperuToken) {
    res.status(500).json({
      success: false,
      message: "Falta APISPERU_TOKEN en .env (o configura RUCPE_API_KEY)",
    });
    return false;
  }
  return true;
}

function requireRucpe(res: express.Response): boolean {
  if (!rucpeKey) {
    res.status(500).json({
      success: false,
      message:
        "Falta RUCPE_API_KEY en .env. Obtén una gratis en https://consulta.rucpe.com/api",
    });
    return false;
  }
  return true;
}

function friendlyApisError(status: number, message: string): string {
  if (status === 401 || message.toLowerCase().includes("token not found")) {
    return "Token no enviado o inválido. Revisa APISPERU_TOKEN en .env";
  }
  if (message === "Ocurrió un Error" || message.toLowerCase().includes("ocurrió un error")) {
    return "APIsPeru rechazó la consulta. Revisa el token en apisperu.com/admin (plan activo, consultas disponibles). Soporte: soporte@apisperu.pe o WhatsApp +51 935 600 914";
  }
  return message;
}

async function queryApisPeru(path: string) {
  const url = `${APIS_PERU_BASE}${path}?token=${encodeURIComponent(apisperuToken!)}`;

  const upstream = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apisperuToken}`,
    },
  });

  const text = await upstream.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { success: false, message: text || "Error desconocido de APIsPeru" };
  }

  const record = body as { success?: boolean; message?: string; status?: string };
  const msg = record?.message ?? text;

  if (upstream.ok && record.success !== false && record.status !== "error") {
    return { status: upstream.status, body };
  }

  return {
    status: upstream.status >= 400 ? upstream.status : 502,
    body: { success: false, message: friendlyApisError(upstream.status, String(msg)) },
  };
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    dniProvider,
    rucProvider: rucProvider === "rucpe" && rucpeKey ? "consulta.rucpe.com" : apisperuToken ? "dniruc.apisperu.com" : null,
    hasRucpeKey: Boolean(rucpeKey),
    hasApisperuToken: Boolean(apisperuToken),
  });
});

app.get("/api/dni/:dni", async (req, res) => {
  const dni = String(req.params.dni).replace(/\D/g, "");
  if (!/^\d{8}$/.test(dni)) {
    res.status(400).json({ success: false, message: "DNI inválido (8 dígitos)" });
    return;
  }

  if (dniProvider === "rucpe") {
    if (!requireRucpe(res)) return;
    const result = await queryRucpe("dni", dni, rucpeKey!);
    if (!result.ok) {
      res.status(result.status).json({ success: false, message: result.message });
      return;
    }
    res.json(toLegacyIdentityBody("dni", result.data));
    return;
  }

  if (dniProvider === "apisperu") {
    if (!requireApisperu(res)) return;
    const { status, body } = await queryApisPeru(`/dni/${dni}`);
    res.status(status).json(body);
    return;
  }

  const result = await queryEldniDni(dni);
  if (!result.ok) {
    res.status(result.status).json({ success: false, message: result.message });
    return;
  }

  res.json({ success: true, data: result.data, provider: "eldni.com" });
});

app.get("/api/ruc/:ruc", async (req, res) => {
  const ruc = String(req.params.ruc).replace(/\D/g, "");
  if (!/^\d{11}$/.test(ruc)) {
    res.status(400).json({ success: false, message: "RUC inválido (11 dígitos)" });
    return;
  }

  if (rucProvider === "rucpe") {
    if (!requireRucpe(res)) return;
    const result = await queryRucpe("ruc", ruc, rucpeKey!);
    if (!result.ok) {
      res.status(result.status).json({ success: false, message: result.message });
      return;
    }
    res.json(toLegacyIdentityBody("ruc", result.data));
    return;
  }

  if (!requireApisperu(res)) return;
  const { status, body } = await queryApisPeru(`/ruc/${ruc}`);
  res.status(status).json(body);
});

const server = app.listen(PORT, () => {
  console.log(`Intranet Ventas API → http://localhost:${PORT}`);
  console.log(
    `  DNI: ${
      dniProvider === "rucpe"
        ? "consulta.rucpe.com"
        : dniProvider === "apisperu"
          ? "APIsPeru"
          : "eldni.com (gratis)"
    }`,
  );
  console.log(
    `  RUC: ${
      rucProvider === "rucpe" && rucpeKey
        ? "consulta.rucpe.com"
        : apisperuToken
          ? "APIsPeru"
          : "sin proveedor"
    }`,
  );
  if (!rucpeKey && !apisperuToken) {
    console.warn(
      "⚠  Configura RUCPE_API_KEY (recomendado, https://consulta.rucpe.com/api) o APISPERU_TOKEN",
    );
  }
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\n❌ Puerto ${PORT} ya está en uso (p. ej. un API viejo de Cursor en 3001).\n` +
        `   Cambia API_PORT en .env (ahora recomendado: 3002) o libera el puerto:\n` +
        `   fuser -k ${PORT}/tcp\n`,
    );
  } else {
    console.error(err);
  }
  process.exit(1);
});
