/**
 * Genera build/config.env para empaquetarlo con la app instalada.
 * Lee el .env del repo (o variables de entorno del CI).
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const outDir = path.join(root, "build");
const outFile = path.join(outDir, "config.env");
const srcEnv = path.join(root, ".env");

const KEEP_PREFIXES = [
  "MSSQL_",
  "VITE_API_BASE_URL",
  "APISPERU_TOKEN",
  "RUCPE_API_KEY",
  "VITE_RUCPE_API_KEY",
  "GITHUB_UPDATES_REPO",
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

function shouldKeep(key) {
  return KEEP_PREFIXES.some((prefix) => key === prefix || key.startsWith(prefix));
}

const merged = {};
if (fs.existsSync(srcEnv)) {
  Object.assign(merged, parseEnvFile(fs.readFileSync(srcEnv, "utf8")));
}
for (const [key, value] of Object.entries(process.env)) {
  if (shouldKeep(key) && value != null && String(value).length) {
    merged[key] = String(value);
  }
}

const lines = Object.entries(merged)
  .filter(([key]) => shouldKeep(key))
  .map(([key, value]) => `${key}=${value}`);

if (!lines.length) {
  console.warn("[prepare-config-env] Sin variables SQL/API: la app instalada pedirá config.env en userData.");
}

// Etapa actual: instaladores arrancan en desarrollo (Tailscale / SQL dev)
const activeProfile = String(merged.MSSQL_PROFILE ?? "dev").trim().toLowerCase();
const profileIdx = lines.findIndex((line) => line.startsWith("MSSQL_PROFILE="));
if (profileIdx >= 0) lines[profileIdx] = `MSSQL_PROFILE=${activeProfile}`;
else lines.push(`MSSQL_PROFILE=${activeProfile}`);

if (activeProfile === "dev" && (!merged.MSSQL_DEV_USER || !merged.MSSQL_DEV_PASSWORD)) {
  console.warn(
    "[prepare-config-env] ADVERTENCIA: faltan MSSQL_DEV_USER/PASSWORD; el instalador no conectará a SQL dev.",
  );
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, `${lines.join("\n")}\n`, "utf8");
console.log(`[prepare-config-env] Escrito ${outFile} (${lines.length} claves)`);
