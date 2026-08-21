/**
 * Recorta archivos pesados del runtime de Electron antes de generar AppImage.
 * No toca el binario principal (Chromium ~188 MB): ese es el suelo del tamaño.
 */
const fs = require("node:fs");
const path = require("node:path");

const REMOVE = [
  "LICENSES.chromium.html",
  "LICENSE.electron.txt",
  "chrome_200_percent.pak",
];

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "linux") return;

  const dir = context.appOutDir;
  let freed = 0;

  for (const name of REMOVE) {
    const full = path.join(dir, name);
    try {
      const st = fs.statSync(full);
      fs.rmSync(full, { force: true });
      freed += st.size;
      console.log(`[afterPack] removed ${name} (${(st.size / 1024 / 1024).toFixed(1)} MB)`);
    } catch {
      /* no existe */
    }
  }

  console.log(`[afterPack] freed ~${(freed / 1024 / 1024).toFixed(1)} MB before compress`);
};
