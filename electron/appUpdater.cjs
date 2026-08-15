const { app, dialog, net, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

function githubToken() {
  return String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();
}

function repoSlug() {
  const env = String(process.env.GITHUB_UPDATES_REPO ?? "").trim();
  if (env.includes("/")) return env.replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/, "");
  try {
    const pkg = require("../package.json");
    const url = pkg.repository?.url || pkg.repository || "";
    const match = String(url).match(/github\.com[:/]([^/]+)\/([^/.]+)/i);
    if (match) return `${match[1]}/${match[2]}`;
  } catch {
    /* package.json */
  }
  return "hexed-AAL1X/Bocasion-TPV";
}

function parseVersion(value) {
  return String(value ?? "")
    .replace(/^v/i, "")
    .split(/[.+-]/)
    .map((part) => Number.parseInt(part, 10) || 0);
}

function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  const len = Math.max(left.length, right.length);
  for (let i = 0; i < len; i += 1) {
    const delta = (left[i] || 0) - (right[i] || 0);
    if (delta) return delta;
  }
  return 0;
}

async function githubJson(url) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "BocaSoft-IntranetVentas",
  };
  const token = githubToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await net.fetch(url, { headers });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: response.ok, status: response.status, json };
}

function pickAsset(assets) {
  const list = Array.isArray(assets) ? assets : [];
  if (process.platform === "win32") {
    return (
      list.find((asset) => /\.exe$/i.test(asset.name) && !/portable/i.test(asset.name)) ||
      list.find((asset) => /\.exe$/i.test(asset.name))
    );
  }
  if (process.platform === "linux") {
    return list.find((asset) => /\.AppImage$/i.test(asset.name));
  }
  return list.find((asset) => /\.dmg$/i.test(asset.name) || /\.zip$/i.test(asset.name));
}

async function checkForUpdates() {
  const current = app.getVersion();
  const slug = repoSlug();
  const packaged = app.isPackaged;
  try {
    const { ok, status, json } = await githubJson(
      `https://api.github.com/repos/${slug}/releases/latest`,
    );
    if (status === 404) {
      return {
        status: "latest",
        current,
        latest: current,
        packaged,
        canInstall: false,
        htmlUrl: `https://github.com/${slug}/releases`,
        message: `Estás en la versión ${current}. Aún no hay un release publicado en GitHub (${slug}).`,
      };
    }
    if (!ok || !json?.tag_name) {
      return {
        status: "error",
        current,
        packaged,
        canInstall: false,
        message:
          status === 403
            ? "GitHub limitó la consulta. Espera un momento o configura GITHUB_TOKEN en .env."
            : "No se pudo consultar GitHub. Revisa la conexión.",
      };
    }
    const latest = String(json.tag_name).replace(/^v/i, "");
    const htmlUrl = String(json.html_url || `https://github.com/${slug}/releases`);
    const asset = pickAsset(json.assets);
    if (compareVersions(latest, current) <= 0) {
      return {
        status: "latest",
        current,
        latest,
        packaged,
        canInstall: false,
        htmlUrl,
        message: `Ya tienes la versión más reciente (${current}).`,
      };
    }
    return {
      status: "available",
      current,
      latest,
      packaged,
      canInstall: Boolean(asset?.browser_download_url) && packaged,
      htmlUrl,
      downloadUrl: asset?.browser_download_url || "",
      fileName: asset?.name || "",
      size: asset?.size || 0,
      notes: String(json.body || "").slice(0, 1200),
      message: `Hay una versión nueva: ${latest} (ahora tienes ${current}).`,
    };
  } catch (err) {
    return {
      status: "error",
      current,
      packaged,
      canInstall: false,
      message: err instanceof Error ? err.message : "No se pudo buscar actualizaciones.",
    };
  }
}

function sendProgress(webContents, percent) {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send("update-download-progress", { percent });
  }
}

async function downloadToFile(url, dest, onProgress) {
  const headers = {
    Accept: "application/octet-stream",
    "User-Agent": "BocaSoft-IntranetVentas",
  };
  const token = githubToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await net.fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`La descarga falló (${response.status}).`);
  }
  const total = Number(response.headers.get("content-length") || 0);
  const file = fs.createWriteStream(dest);
  const reader = response.body?.getReader?.();
  if (!reader) {
    const buffer = Buffer.from(await response.arrayBuffer());
    await fsp.writeFile(dest, buffer);
    onProgress(100);
    return;
  }
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    file.write(Buffer.from(value));
    received += value.byteLength;
    if (total) onProgress(Math.min(99, Math.round((received / total) * 100)));
  }
  await new Promise((resolve, reject) => {
    file.end((err) => (err ? reject(err) : resolve()));
  });
  onProgress(100);
}

async function applyDownloadedUpdate(filePath) {
  if (process.platform === "win32") {
    const child = spawn(filePath, [], { detached: true, stdio: "ignore" });
    child.unref();
    app.quit();
    return { applied: true };
  }

  const currentAppImage = process.env.APPIMAGE;
  if (process.platform === "linux" && currentAppImage) {
    const scriptPath = path.join(os.tmpdir(), "bocasoft-apply-update.sh");
    const script = `#!/bin/bash
sleep 2
mv -f ${JSON.stringify(filePath)} ${JSON.stringify(currentAppImage)}
chmod +x ${JSON.stringify(currentAppImage)}
nohup ${JSON.stringify(currentAppImage)} >/dev/null 2>&1 &
rm -f "$0"
`;
    await fsp.writeFile(scriptPath, script, { mode: 0o755 });
    const child = spawn(scriptPath, [], { detached: true, stdio: "ignore" });
    child.unref();
    app.quit();
    return { applied: true };
  }

  await shell.openPath(filePath);
  return { applied: false, opened: true };
}

async function downloadAndInstall(payload, browserWindow) {
  const url = String(payload?.downloadUrl ?? "").trim();
  const fileName = String(payload?.fileName ?? "bocasoft-update.bin").replace(/[^\w.\- ]+/g, "_");
  if (!url.startsWith("https://")) {
    throw new Error("No hay un instalador publicado para este sistema.");
  }
  const dest = path.join(os.tmpdir(), fileName);
  const webContents = browserWindow?.webContents;
  await downloadToFile(url, dest, (percent) => sendProgress(webContents, percent));

  const latest = String(payload?.latest ?? "");
  const win = browserWindow && !browserWindow.isDestroyed() ? browserWindow : null;
  const choice = await dialog.showMessageBox(win ?? undefined, {
    type: "info",
    title: "Actualización lista",
    message: latest ? `Se descargó la versión ${latest}.` : "Se descargó la actualización.",
    detail: "Reinicia ahora para instalarla. Si eliges Después, el instalador queda en la carpeta temporal.",
    buttons: ["Reiniciar ahora", "Después"],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  });
  if (choice.response !== 0) {
    return { downloaded: true, applied: false, path: dest };
  }
  return applyDownloadedUpdate(dest);
}

async function autoCheckOnStartup(getWindow) {
  if (!app.isPackaged) return;
  const result = await checkForUpdates();
  if (result.status !== "available" || !result.canInstall || !result.downloadUrl) return;
  const win = getWindow();
  const choice = await dialog.showMessageBox(win && !win.isDestroyed() ? win : undefined, {
    type: "info",
    title: "Actualización disponible",
    message: result.message,
    detail: "¿Descargar e instalar ahora?",
    buttons: ["Actualizar", "Más tarde"],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  });
  if (choice.response !== 0) return;
  await downloadAndInstall(result, win);
}

module.exports = {
  checkForUpdates,
  downloadAndInstall,
  autoCheckOnStartup,
  repoSlug,
};
