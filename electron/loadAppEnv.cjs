const fsSync = require("node:fs");
const path = require("node:path");

let loaded = false;

function candidateEnvPaths() {
  const paths = [];

  // Empaquetado: config embebido en resources (generado en build con prepare-config-env)
  if (process.resourcesPath) {
    paths.push(path.join(process.resourcesPath, "config.env"));
    paths.push(path.join(process.resourcesPath, ".env"));
  }
  paths.push(path.join(__dirname, "..", "build", "config.env"));

  if (process.env.APPIMAGE) {
    paths.push(path.join(path.dirname(process.env.APPIMAGE), "config.env"));
  }
  try {
    paths.push(path.join(path.dirname(process.execPath), "config.env"));
  } catch {
    /* ignore */
  }

  // Repo local (npm run dev)
  paths.push(path.join(__dirname, "..", ".env"));

  // Overrides del usuario (mayor prioridad por clave)
  try {
    const { app } = require("electron");
    if (app?.isReady?.() || app?.getPath) {
      paths.push(path.join(app.getPath("userData"), "config.env"));
      paths.push(path.join(app.getPath("userData"), ".env"));
    }
  } catch {
    /* app aún no disponible */
  }

  return [...new Set(paths)];
}

/** Fusiona config.env de menor a mayor prioridad; userData gana solo en claves que define. */
function loadAppEnv(options = {}) {
  const override = options.override === true;
  if (loaded && !override) return { loaded: true, path: null };
  try {
    const dotenv = require("dotenv");
    const paths = candidateEnvPaths().filter((envPath) => fsSync.existsSync(envPath));
    let lastPath = null;
    for (const envPath of paths) {
      dotenv.config({ path: envPath, override: true });
      lastPath = envPath;
    }
    loaded = true;
    return paths.length ? { loaded: true, path: lastPath } : { loaded: false, path: null };
  } catch {
    /* dotenv opcional */
  }
  loaded = true;
  return { loaded: false, path: null };
}

function isPackagedApp() {
  try {
    const { app } = require("electron");
    return Boolean(app?.isPackaged);
  } catch {
    return false;
  }
}

module.exports = {
  loadAppEnv,
  candidateEnvPaths,
  isPackagedApp,
};
