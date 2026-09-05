const { app, dialog, net, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { loadAppEnv } = require("./loadAppEnv.cjs");

function githubToken() {
  loadAppEnv();
  return String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();
}

function repoSlug() {
  loadAppEnv();
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
      list.find((asset) => /Setup.*\.exe$/i.test(asset.name)) ||
      list.find((asset) => /\.exe$/i.test(asset.name) && !/portable/i.test(asset.name)) ||
      list.find((asset) => /\.exe$/i.test(asset.name))
    );
  }
  if (process.platform === "linux") {
    return list.find((asset) => /\.AppImage$/i.test(asset.name));
  }
  return list.find((asset) => /\.dmg$/i.test(asset.name) || /\.zip$/i.test(asset.name));
}

function pendingUpdateMetaPath() {
  return path.join(app.getPath("userData"), "pending-update.json");
}

function pendingUpdateDir() {
  return path.join(app.getPath("userData"), "pending-update");
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
            ? "GitHub limitó la consulta. Espera un momento o configura GITHUB_TOKEN."
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

function resolveLinuxInstallTargets() {
  const targets = [];
  const appImage = process.env.APPIMAGE;
  if (appImage && fs.existsSync(appImage)) {
    targets.push({ type: "appimage", path: appImage });
  }

  // Lanzador / carpeta de release: buscar AppImage junto al exe o al script
  const exeDir = path.dirname(process.execPath);
  const searchDirs = [exeDir, path.dirname(exeDir)];
  if (appImage) searchDirs.unshift(path.dirname(appImage));

  for (const dir of searchDirs) {
    try {
      const names = fs.readdirSync(dir).filter((name) => /\.AppImage$/i.test(name));
      for (const name of names) {
        const full = path.join(dir, name);
        if (!targets.some((row) => row.path === full)) {
          targets.push({ type: "appimage", path: full });
        }
      }
    } catch {
      /* ignore */
    }
  }

  // Si corre desde linux-unpacked, también actualizar cualquier AppImage hermano
  if (/linux-unpacked/i.test(exeDir) || /[/\\]resources[/\\]app/i.test(exeDir)) {
    const releaseRoot = path.resolve(exeDir, "..", "..");
    try {
      const names = fs.readdirSync(releaseRoot).filter((name) => /\.AppImage$/i.test(name));
      for (const name of names) {
        const full = path.join(releaseRoot, name);
        if (!targets.some((row) => row.path === full)) {
          targets.push({ type: "appimage", path: full });
        }
      }
    } catch {
      /* ignore */
    }
  }

  return targets;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

async function applyLinuxAppImageUpdate(downloadedPath, targets) {
  const primary = targets[0]?.path;
  if (!primary) {
    await shell.openPath(downloadedPath);
    return { applied: false, opened: true };
  }

  const scriptPath = path.join(os.tmpdir(), `bocasoft-apply-update-${Date.now()}.sh`);
  const copies = targets
    .map((row) => row.path)
    .filter((p, i, arr) => arr.indexOf(p) === i)
    .map((dest) => {
      // Mantener nombre estable sin versión para el próximo arranque del lanzador
      const stable = path.join(path.dirname(dest), "Intranet-Ventas.AppImage");
      return `
cp -f ${shellQuote(downloadedPath)} ${shellQuote(dest)} || true
chmod +x ${shellQuote(dest)} || true
cp -f ${shellQuote(downloadedPath)} ${shellQuote(stable)} || true
chmod +x ${shellQuote(stable)} || true
`;
    })
    .join("\n");

  const relaunch = process.env.APPIMAGE || primary;
  const script = `#!/bin/bash
set -e
sleep 1
${copies}
nohup ${shellQuote(relaunch)} >/dev/null 2>&1 &
rm -f ${shellQuote(downloadedPath)}
rm -f "$0"
`;
  await fsp.writeFile(scriptPath, script, { mode: 0o755 });
  const child = spawn(scriptPath, [], { detached: true, stdio: "ignore" });
  child.unref();
  app.quit();
  return { applied: true };
}

async function applyWindowsUpdate(filePath) {
  const installDir = path.dirname(process.execPath).replace(/[\\/]+$/, "");
  const exePath = process.execPath;
  const exeName = path.basename(exePath);
  const pid = process.pid;
  const scriptPath = path.join(os.tmpdir(), `bocasoft-apply-update-${Date.now()}.cmd`);

  // NSIS: /S silencioso; /D=DIR debe ir al final y sin comillas.
  const script = `@echo off
setlocal EnableExtensions
set "INSTALLER=${filePath.replace(/"/g, "")}"
set "INSTALLDIR=${installDir.replace(/"/g, "")}"
set "EXEPATH=${path.join(installDir, exeName).replace(/"/g, "")}"
set "PID=${pid}"
:wait
tasklist /FI "PID eq %PID%" 2>nul | findstr /I "%PID%" >nul
if not errorlevel 1 (
  timeout /t 1 /nobreak >nul
  goto wait
)
timeout /t 1 /nobreak >nul
"%INSTALLER%" /S /D=%INSTALLDIR%
if exist "%EXEPATH%" (
  start "" "%EXEPATH%"
) else (
  start "" "${exePath.replace(/"/g, "")}"
)
del /f /q "%INSTALLER%" >nul 2>&1
del /f /q "%~f0" >nul 2>&1
`;

  await fsp.writeFile(scriptPath, script, "utf8");
  const child = spawn("cmd.exe", ["/c", scriptPath], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  app.quit();
  return { applied: true };
}

async function applyDownloadedUpdate(filePath) {
  if (process.platform === "win32") {
    return applyWindowsUpdate(filePath);
  }

  if (process.platform === "linux") {
    const targets = resolveLinuxInstallTargets();
    if (targets.length || process.env.APPIMAGE) {
      return applyLinuxAppImageUpdate(filePath, targets.length ? targets : [{ type: "appimage", path: process.env.APPIMAGE }]);
    }
  }

  await shell.openPath(filePath);
  return { applied: false, opened: true };
}

async function savePendingUpdate(filePath, meta) {
  const dir = pendingUpdateDir();
  await fsp.mkdir(dir, { recursive: true });
  const dest = path.join(dir, path.basename(filePath));
  await fsp.copyFile(filePath, dest);
  await fsp.writeFile(
    pendingUpdateMetaPath(),
    JSON.stringify({
      ...meta,
      filePath: dest,
      savedAt: Date.now(),
    }),
    "utf8",
  );
  return dest;
}

async function clearPendingUpdate() {
  try {
    await fsp.rm(pendingUpdateMetaPath(), { force: true });
  } catch {
    /* ignore */
  }
  try {
    await fsp.rm(pendingUpdateDir(), { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

/** Aplica una actualización pendiente antes de abrir la UI (evita volver a la versión vieja). */
async function applyPendingUpdateOnStartup() {
  if (!app.isPackaged) return false;
  let meta;
  try {
    meta = JSON.parse(await fsp.readFile(pendingUpdateMetaPath(), "utf8"));
  } catch {
    return false;
  }
  const filePath = String(meta?.filePath ?? "");
  if (!filePath || !fs.existsSync(filePath)) {
    await clearPendingUpdate();
    return false;
  }
  try {
    await applyDownloadedUpdate(filePath);
    await clearPendingUpdate();
    return true;
  } catch (err) {
    console.error("[updater] No se pudo aplicar actualización pendiente:", err);
    return false;
  }
}

async function downloadAndInstall(payload, browserWindow) {
  const url = String(payload?.downloadUrl ?? "").trim();
  const fileName = String(payload?.fileName ?? "bocasoft-update.bin").replace(/[^\w.\- ]+/g, "_");
  if (!url.startsWith("https://")) {
    throw new Error("No hay un instalador publicado para este sistema.");
  }
  await fsp.mkdir(pendingUpdateDir(), { recursive: true });
  const dest = path.join(pendingUpdateDir(), fileName);
  const webContents = browserWindow?.webContents;
  await downloadToFile(url, dest, (percent) => sendProgress(webContents, percent));
  await savePendingUpdate(dest, {
    latest: payload?.latest,
    downloadUrl: url,
    fileName,
  });

  const latest = String(payload?.latest ?? "");
  const win = browserWindow && !browserWindow.isDestroyed() ? browserWindow : null;
  const choice = await dialog.showMessageBox(win ?? undefined, {
    type: "info",
    title: "Actualización lista",
    message: latest ? `Se descargó la versión ${latest}.` : "Se descargó la actualización.",
    detail:
      "Se instalará encima de la carpeta actual y quedará permanente. Reinicia ahora (recomendado) o al volver a abrir la app.",
    buttons: ["Reiniciar ahora", "Después"],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  });
  if (choice.response !== 0) {
    return { downloaded: true, applied: false, pending: true, path: dest };
  }
  const result = await applyDownloadedUpdate(dest);
  if (result.applied) await clearPendingUpdate();
  return result;
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
  applyPendingUpdateOnStartup,
  repoSlug,
};
