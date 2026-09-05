/**
 * Genera build/config.env embebido en la app instalada.
 *
 * Instalador (CI / pack:*): perfil DESARROLLO, host público primero
 * (cualquier PC con internet → WIN-C6EKJGJR3FH). Tailscale queda de fallback.
 *
 * npm run dev: usa .env del repo (Tailscale primero en oficina).
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const outDir = path.join(root, "build");
const outFile = path.join(outDir, "config.env");
const srcEnv = path.join(root, ".env");

const API_KEYS = [
  "VITE_API_BASE_URL",
  "APISPERU_TOKEN",
  "RUCPE_API_KEY",
  "VITE_RUCPE_API_KEY",
  "GITHUB_UPDATES_REPO",
];

const DEV_SQL_KEYS = [
  "MSSQL_DEV_LABEL",
  "MSSQL_DEV_HOST",
  "MSSQL_DEV_HOST_FALLBACK",
  "MSSQL_DEV_PORT",
  "MSSQL_DEV_DATABASE",
  "MSSQL_DEV_AUTH",
  "MSSQL_DEV_DOMAIN",
  "MSSQL_DEV_USER",
  "MSSQL_DEV_PASSWORD",
];

function parseEnvFile(text) {
  const map = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    map[key] = value;
  }
  return map;
}

function isInstallerBuild() {
  return (
    process.env.BOCASOFT_INSTALLER === "1" ||
    process.env.GITHUB_ACTIONS === "true" ||
    process.argv.includes("--installer")
  );
}

/** ¿Parece IP Tailscale (CGNAT 100.x)? */
function isTailscaleHost(host) {
  return /^100\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(String(host ?? "").trim());
}

/**
 * En el instalador: host público primero (cualquier PC), Tailscale de respaldo.
 * En local: respeta el orden del .env.
 */
function installerDevHosts(merged) {
  const primary = String(merged.MSSQL_DEV_HOST ?? "").trim();
  const fallbacks = String(merged.MSSQL_DEV_HOST_FALLBACK ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);

  const publicHost =
    fallbacks.find((h) => h && !isTailscaleHost(h)) ||
    (!isTailscaleHost(primary) ? primary : "") ||
    String(merged.MSSQL_DEV_PUBLIC_HOST ?? "").trim();

  const tailscaleHost =
    (isTailscaleHost(primary) ? primary : "") ||
    fallbacks.find((h) => isTailscaleHost(h)) ||
    "";

  const host = publicHost || primary;
  const fallback = [tailscaleHost, ...fallbacks.filter((h) => h !== host && h !== publicHost)]
    .filter(Boolean)
    .filter((h, i, arr) => arr.indexOf(h) === i)
    .join(",");

  return { host, fallback };
}

const merged = {};
if (fs.existsSync(srcEnv)) {
  Object.assign(merged, parseEnvFile(fs.readFileSync(srcEnv, "utf8")));
}
for (const [key, value] of Object.entries(process.env)) {
  if (value != null && String(value).length) merged[key] = String(value);
}

const installer = isInstallerBuild();
const lines = [];

if (installer) {
  const { host, fallback } = installerDevHosts(merged);
  lines.push("# Config embebida: DESARROLLO (WIN-C6) vía IP pública — cualquier PC");
  lines.push("MSSQL_PROFILE=dev");
  lines.push("MSSQL_PROFILES=dev");
  lines.push("MSSQL_DEV_LABEL=Desarrollo");
  if (host) lines.push(`MSSQL_DEV_HOST=${host}`);
  if (fallback) lines.push(`MSSQL_DEV_HOST_FALLBACK=${fallback}`);

  for (const key of DEV_SQL_KEYS) {
    if (key === "MSSQL_DEV_HOST" || key === "MSSQL_DEV_HOST_FALLBACK" || key === "MSSQL_DEV_LABEL") {
      continue;
    }
    const val = merged[key];
    if (val) lines.push(`${key}=${val}`);
  }
  for (const key of API_KEYS) {
    const val = merged[key];
    if (val) lines.push(`${key}=${val}`);
  }

  if (!host || !merged.MSSQL_DEV_USER || !merged.MSSQL_DEV_PASSWORD) {
    console.warn(
      "[prepare-config-env] Faltan MSSQL_DEV_* (host/user/password) — el instalador no conectará a SQL desarrollo.",
    );
  } else {
    console.log(
      `[prepare-config-env] Instalador → SQL desarrollo host=${host}` +
        (fallback ? ` fallback=${fallback}` : ""),
    );
  }
} else {
  lines.push("# Config local (build de prueba; npm run dev usa .env del repo)");
  for (const [key, value] of Object.entries(merged)) {
    if (key.startsWith("MSSQL_") || API_KEYS.includes(key)) {
      lines.push(`${key}=${value}`);
    }
  }
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, `${lines.join("\n")}\n`, "utf8");
console.log(
  `[prepare-config-env] ${outFile} (${lines.length} claves, modo=${installer ? "instalador/dev-público" : "local"})`,
);
