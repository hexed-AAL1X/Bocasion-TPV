/**
 * Revela archivos exportados en el gestor del SO (Linux / Windows / macOS).
 */
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

/** @typedef {{ shell: import('electron').Shell, execFileAsync: Function, spawn: Function, log?: Function, warn?: Function }} ExportFolderRevealDeps */

/**
 * @param {ExportFolderRevealDeps} deps
 */
function createExportFolderReveal(deps) {
  const { shell, execFileAsync } = deps;
  const log = deps.log ?? ((message) => console.log(message));
  const warn = deps.warn ?? ((message) => console.warn(message));

  function normalizeExportPath(filePath) {
    return path.resolve(String(filePath || "").trim());
  }

  function exportDirectoryOf(filePath) {
    return path.dirname(normalizeExportPath(filePath));
  }

  function sessionEnv() {
    const env = { ...process.env };
    if (process.platform === "linux") {
      if (!env.DISPLAY) {
        env.DISPLAY = ":0";
      }
      if (!env.DBUS_SESSION_BUS_ADDRESS) {
        const uid = typeof process.getuid === "function" ? process.getuid() : os.userInfo().uid;
        env.DBUS_SESSION_BUS_ADDRESS = `unix:path=/run/user/${uid}/bus`;
      }
    }
    return env;
  }

  async function tryLinuxFileManagerShowItems(uri) {
    const attempts = [
      () =>
        execFileAsync(
          "gdbus",
          [
            "call",
            "--session",
            "--dest",
            "org.freedesktop.FileManager1",
            "--object-path",
            "/org/freedesktop/FileManager1",
            "--method",
            "org.freedesktop.FileManager1.ShowItems",
            `['${uri}']`,
            "",
          ],
          { env: sessionEnv(), timeout: 8000 },
        ),
      () =>
        execFileAsync(
          "dbus-send",
          [
            "--session",
            "--print-reply",
            "--dest=org.freedesktop.FileManager1",
            "/org/freedesktop/FileManager1",
            "org.freedesktop.FileManager1.ShowItems",
            `array:string:${uri}`,
            "string:",
          ],
          { env: sessionEnv(), timeout: 8000 },
        ),
    ];

    for (const attempt of attempts) {
      try {
        await attempt();
        return true;
      } catch {
        // siguiente método
      }
    }
    return false;
  }

  async function revealExportFileInFolderLinux(resolved, folderPath) {
    const uri = pathToFileURL(resolved).href;

    if (await tryLinuxFileManagerShowItems(uri)) {
      log(`[BocaSoft] Carpeta (D-Bus): ${folderPath}`);
      return;
    }

    try {
      await execFileAsync("xdg-open", [folderPath], { env: sessionEnv(), timeout: 8000 });
      log(`[BocaSoft] Carpeta (xdg-open): ${folderPath}`);
      return;
    } catch {
      shell.showItemInFolder(resolved);
      log(`[BocaSoft] Carpeta (showItemInFolder): ${folderPath}`);
    }
  }

  async function revealExportFileInFolderWindows(resolved, folderPath) {
    try {
      await execFileAsync("explorer.exe", ["/select,", resolved], { windowsHide: true });
      log(`[BocaSoft] Carpeta (Explorer): ${folderPath}`);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      warn(`[BocaSoft] Explorer /select falló (${detail}), usando showItemInFolder`);
      shell.showItemInFolder(resolved);
    }
  }

  async function revealExportFileInFolderDarwin(resolved, folderPath) {
    try {
      shell.showItemInFolder(resolved);
      log(`[BocaSoft] Carpeta (Finder): ${folderPath}`);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      warn(`[BocaSoft] showItemInFolder falló (${detail}), probando open -R`);
      try {
        await execFileAsync("open", ["-R", resolved], { timeout: 8000 });
      } catch {
        shell.showItemInFolder(resolved);
      }
    }
  }

  /**
   * @param {string} filePath
   */
  async function revealExportFileInFolder(filePath) {
    const resolved = normalizeExportPath(filePath);
    const folderPath = exportDirectoryOf(resolved);

    switch (process.platform) {
      case "linux":
        await revealExportFileInFolderLinux(resolved, folderPath);
        break;
      case "win32":
        await revealExportFileInFolderWindows(resolved, folderPath);
        break;
      case "darwin":
        await revealExportFileInFolderDarwin(resolved, folderPath);
        break;
      default:
        shell.showItemInFolder(resolved);
        log(`[BocaSoft] Carpeta (${process.platform}): ${folderPath}`);
        break;
    }
  }

  return {
    revealExportFileInFolder,
    normalizeExportPath,
    exportDirectoryOf,
  };
}

module.exports = { createExportFolderReveal };
