/**
 * Recorta archivos pesados del runtime de Electron antes de comprimir.
 * El binario Chromium (~180–200 MB) es el suelo real del tamaño.
 */
const fs = require("node:fs");
const path = require("node:path");

const REMOVE_FILES = [
  "LICENSES.chromium.html",
  "LICENSE.electron.txt",
  "LICENSE",
  "version",
  "vk_swiftshader_icd.json",
  "chrome_200_percent.pak",
];

const REMOVE_DIRS = [
  // Locales no usados (electronLanguages ya filtra, por si queda basura)
];

function rmSize(full) {
  try {
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      let total = 0;
      for (const name of fs.readdirSync(full)) {
        total += rmSize(path.join(full, name));
      }
      fs.rmSync(full, { recursive: true, force: true });
      return total;
    }
    fs.rmSync(full, { force: true });
    return st.size;
  } catch {
    return 0;
  }
}

function stripAzureFromAsar(resourcesDir) {
  // Si node_modules quedó unpacked, quitar @azure (auth AAD; no lo usamos)
  const azure = path.join(resourcesDir, "app.asar.unpacked", "node_modules", "@azure");
  if (fs.existsSync(azure)) {
    return rmSize(azure);
  }
  return 0;
}

exports.default = async function afterPack(context) {
  const dir = context.appOutDir;
  let freed = 0;

  for (const name of REMOVE_FILES) {
    const full = path.join(dir, name);
    const bytes = rmSize(full);
    if (bytes) {
      freed += bytes;
      console.log(`[afterPack] removed ${name} (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
    }
  }

  for (const name of REMOVE_DIRS) {
    const full = path.join(dir, name);
    const bytes = rmSize(full);
    if (bytes) {
      freed += bytes;
      console.log(`[afterPack] removed dir ${name} (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
    }
  }

  // Locales: dejar solo es / en-US
  const locales = path.join(dir, "locales");
  if (fs.existsSync(locales)) {
    const keep = new Set(["es.pak", "es-419.pak", "en-US.pak"]);
    for (const name of fs.readdirSync(locales)) {
      if (keep.has(name)) continue;
      freed += rmSize(path.join(locales, name));
    }
  }

  freed += stripAzureFromAsar(path.join(dir, "resources"));

  // SwiftShader / GPU software (opcional; en cajas TPV suele bastar GPU del sistema)
  for (const name of ["libvk_swiftshader.so", "vk_swiftshader.dll", "libGLESv2.so"]) {
    // No borrar GLESv2: Chromium lo necesita en muchos Linux
    if (name === "libGLESv2.so") continue;
    const full = path.join(dir, name);
    const bytes = rmSize(full);
    if (bytes) {
      freed += bytes;
      console.log(`[afterPack] removed ${name} (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
    }
  }

  console.log(`[afterPack] freed ~${(freed / 1024 / 1024).toFixed(1)} MB before compress`);
};
