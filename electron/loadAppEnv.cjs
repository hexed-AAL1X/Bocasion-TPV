const fsSync = require("node:fs");
const path = require("node:path");

let loaded = false;

function candidateEnvPaths() {
  const paths = [];
  try {
    const { app } = require("electron");
    if (app?.isReady?.() || app?.getPath) {
      paths.push(path.join(app.getPath("userData"), "config.env"));
      paths.push(path.join(app.getPath("userData"), ".env"));
    }
  } catch {
    /* app aún no disponible */
  }

  if (process.resourcesPath) {
    paths.push(path.join(process.resourcesPath, "config.env"));
    paths.push(path.join(process.resourcesPath, ".env"));
  }

  // Desarrollo / asar unpacked: raíz del proyecto
  paths.push(path.join(__dirname, "..", ".env"));
  paths.push(path.join(__dirname, "..", "build", "config.env"));

  // AppImage: carpeta junto al ejecutable
  if (process.env.APPIMAGE) {
    paths.push(path.join(path.dirname(process.env.APPIMAGE), "config.env"));
  }
  try {
    paths.push(path.join(path.dirname(process.execPath), "config.env"));
  } catch {
    /* ignore */
  }

  return [...new Set(paths)];
}

/** Carga .env / config.env: userData > resources (instalada) > proyecto (dev). */
function loadAppEnv(options = {}) {
  const override = options.override === true;
  if (loaded && !override) return { loaded: true, path: null };
  try {
    const dotenv = require("dotenv");
    for (const envPath of candidateEnvPaths()) {
      if (!fsSync.existsSync(envPath)) continue;
      dotenv.config({ path: envPath, override });
      loaded = true;
      return { loaded: true, path: envPath };
    }
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
