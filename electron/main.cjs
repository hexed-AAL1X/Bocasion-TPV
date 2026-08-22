const { app, BrowserWindow, ipcMain, shell, session, dialog, clipboard, net } = require("electron");
const { execFile, spawn } = require("node:child_process");
const { promisify } = require("node:util");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { loadLogoEscPos, resolveLogoPath } = require("./thermalLogoEscPos.cjs");
const { checkForUpdates, downloadAndInstall, autoCheckOnStartup, applyPendingUpdateOnStartup } = require("./appUpdater.cjs");
const { mapPrinterInfo } = require("./printerInfo.cjs");
const { resolvePrinterStatus } = require("./printerStatus.cjs");

// Estabilidad Chromium en Linux/AppImage (sandbox y GPU suelen tumbar Network Service).
if (process.platform === "linux") {
  app.commandLine.appendSwitch("no-sandbox");
  app.commandLine.appendSwitch("disable-setuid-sandbox");
  app.commandLine.appendSwitch("disable-gpu-sandbox");
  app.commandLine.appendSwitch("disable-dev-shm-usage");
}

// Una sola instancia (si el lock apunta a un proceso muerto, Electron lo reemplaza).
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });
}

// Config: fusiona resources/config.env (instalada) + .env (dev); userData gana por clave.
try {
  require("./loadAppEnv.cjs").loadAppEnv({ override: true });
} catch {
  /* dotenv opcional */
}

const execFileAsync = promisify(execFile);

const exportRevealState = {
  lastFileOpen: { path: null, at: 0 },
};

const { createExportFolderReveal } = require("./exportFolderReveal.cjs");

const { revealExportFileInFolder, normalizeExportPath, exportDirectoryOf } =
  createExportFolderReveal({ shell, execFileAsync, spawn });

function shouldSkipRecentFileOpen(filePath) {
  const last = exportRevealState.lastFileOpen;
  if (last.path !== filePath) return false;
  return Date.now() - last.at < 800;
}

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

ipcMain.handle("get-printers", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return [];
  const printers = await win.webContents.getPrintersAsync();
  const platform = process.platform;

  return Promise.all(
    printers.map(async (p) => {
      const mapped = await mapPrinterInfo(p, platform);
      const status = await resolvePrinterStatus(p, platform);
      return {
        ...mapped,
        portName: mapped.location || mapped.portName || "?",
        status,
        isDefault: p.isDefault,
      };
    }),
  );
});

function createHiddenHtmlWindow() {
  return new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
  });
}

const THERMAL_PAPER_WIDTH_MM = 80;
const THERMAL_PAPER_WIDTH_PX = Math.round((THERMAL_PAPER_WIDTH_MM / 25.4) * 96);

/** Ventana = ancho exacto 80 mm para que el PDF no escale el contenido. */
function createThermalPrintWindow() {
  return new BrowserWindow({
    show: false,
    width: THERMAL_PAPER_WIDTH_PX + 16,
    height: 2400,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
  });
}

async function writeTempHtmlFile(html) {
  const text = String(html ?? "");
  if (!text.trim()) {
    throw new Error("El documento HTML está vacío");
  }
  const tmpFile = path.join(
    app.getPath("temp"),
    `bocasoft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.html`,
  );
  await fs.writeFile(tmpFile, text, "utf8");
  const stat = await fs.stat(tmpFile);
  if (!stat.isFile() || stat.size === 0) {
    throw new Error("No se pudo escribir el archivo temporal HTML");
  }
  return tmpFile;
}

function scheduleTempFileCleanup(tmpFile, delayMs = 120_000) {
  setTimeout(() => {
    fs.unlink(tmpFile).catch(() => {});
  }, delayMs);
}

async function loadHtmlInWindow(htmlWindow, html) {
  const tmpFile = await writeTempHtmlFile(html);
  try {
    await withTimeout(
      htmlWindow.loadFile(tmpFile),
      20_000,
      "No se pudo cargar el documento HTML",
    );
  } catch (err) {
    await fs.unlink(tmpFile).catch(() => {});
    throw err;
  }
  return tmpFile;
}

async function measureThermalDocumentHeightPx(htmlWindow) {
  return htmlWindow.webContents.executeJavaScript(
    `new Promise((resolve) => {
      const measure = () => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const body = document.body;
            if (!body) {
              resolve(320);
              return;
            }
            const childBottom = Array.from(body.children).reduce(
              (max, el) => Math.max(max, el.offsetTop + el.offsetHeight),
              0,
            );
            resolve(Math.max(
              body.scrollHeight,
              body.offsetHeight,
              document.documentElement.scrollHeight,
              childBottom,
              320,
            ));
          });
        });
      };
      const waitFonts = document.fonts && document.fonts.ready
        ? document.fonts.ready
        : Promise.resolve();
      const pending = Array.from(document.images).filter((img) => !img.complete);
      if (pending.length === 0) {
        waitFonts.then(measure);
        return;
      }
      let left = pending.length;
      const tick = () => {
        if (--left <= 0) waitFonts.then(measure);
      };
      pending.forEach((img) => {
        img.addEventListener("load", tick, { once: true });
        img.addEventListener("error", tick, { once: true });
      });
    })`,
    true,
  );
}

async function readThermalHeightHintMm(htmlWindow) {
  return htmlWindow.webContents.executeJavaScript(
    `(() => {
      const meta = document.querySelector('meta[name="bocasoft-thermal-height-mm"]');
      return meta ? Number(meta.getAttribute("content")) || 0 : 0;
    })()`,
    true,
  );
}

async function resolveThermalHeightMm(htmlWindow) {
  const [hintMm, heightPx] = await Promise.all([
    readThermalHeightHintMm(htmlWindow),
    measureThermalDocumentHeightPx(htmlWindow),
  ]);
  const measuredMm = Math.ceil((Number(heightPx) / 96) * 25.4) + 20;
  return Math.max(80, Math.ceil(Math.max(Number(hintMm) || 0, measuredMm) * 1.08));
}

async function waitForThermalLayout(htmlWindow) {
  await htmlWindow.webContents.executeJavaScript(
    "document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()",
    true,
  );
  await new Promise((resolve) => setTimeout(resolve, 800));
}

async function assertThermalDocumentReady(htmlWindow) {
  const ready = await htmlWindow.webContents.executeJavaScript(
    `(() => {
      const body = document.body;
      if (!body) return false;
      const textLen = (body.innerText || "").trim().length;
      const hasRows = body.querySelector(".tr-body, .tr-row, .tr-meta, .tr-meta-field");
      return textLen > 20 || Boolean(hasRows);
    })()`,
    true,
  );
  if (!ready) {
    throw new Error("El ticket no se renderizó correctamente antes de imprimir");
  }
}

async function delayAfterPrintJob() {
  await new Promise((resolve) => setTimeout(resolve, 3500));
}

async function printThermalViaPdfFile(htmlWindow, { printerName, copies }) {
  const { buffer: pdfBuffer } = await renderThermalPdfFromWindow(htmlWindow);
  if (!pdfBuffer || pdfBuffer.length < 500) {
    throw new Error(
      `PDF del ticket vacío o demasiado pequeño (${pdfBuffer?.length ?? 0} bytes)`,
    );
  }
  const pdfFile = path.join(
    app.getPath("temp"),
    `bocasoft-print-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`,
  );
  await fs.writeFile(pdfFile, pdfBuffer);
  console.log(`[BocaSoft] PDF térmico generado: ${pdfFile} (${pdfBuffer.length} bytes)`);
  try {
    await printPdfWithSystem(pdfFile, { printerName, copies, officePrint: false });
  } finally {
    scheduleTempFileCleanup(pdfFile, 120_000);
  }
}

async function printOfficeViaPdfFile(htmlWindow, { printerName, copies }) {
  await waitForThermalLayout(htmlWindow);
  await assertThermalDocumentReady(htmlWindow);
  const pdfBuffer = await withTimeout(
    htmlWindow.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      margins: { marginType: "default" },
      scale: 1,
      pageSize: "A4",
    }),
    60_000,
    "La generación del PDF de oficina tardó demasiado",
  );
  if (!pdfBuffer || pdfBuffer.length < 500) {
    throw new Error(`PDF de oficina vacío (${pdfBuffer?.length ?? 0} bytes)`);
  }
  const pdfFile = path.join(
    app.getPath("temp"),
    `bocasoft-office-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`,
  );
  await fs.writeFile(pdfFile, pdfBuffer);
  console.log(`[BocaSoft] PDF oficina generado: ${pdfFile} (${pdfBuffer.length} bytes)`);
  try {
    await printPdfWithSystem(pdfFile, { printerName, copies, officePrint: true });
  } finally {
    scheduleTempFileCleanup(pdfFile, 120_000);
  }
}

async function printThermalHtmlDirect(htmlWindow, { printerName, copies }) {
  await waitForThermalLayout(htmlWindow);
  await assertThermalDocumentReady(htmlWindow);
  const heightMm = await resolveThermalHeightMm(htmlWindow);

  await withTimeout(
    new Promise((resolve, reject) => {
      htmlWindow.webContents.print(
        {
          silent: Boolean(printerName),
          printBackground: true,
          copies: Math.max(1, Number(copies) || 1),
          deviceName: printerName,
          margins: { marginType: "none" },
          scale: 1,
          pageSize: {
            width: THERMAL_PAPER_WIDTH_MM * 1000,
            height: heightMm * 1000,
          },
        },
        (success, failureReason) => {
          if (success) resolve();
          else reject(new Error(failureReason || "Impresión térmica cancelada o fallida"));
        },
      );
    }),
    120_000,
    "Tiempo agotado en la impresión térmica",
  );
}

async function renderThermalPdfFromWindow(htmlWindow) {
  await waitForThermalLayout(htmlWindow);
  await assertThermalDocumentReady(htmlWindow);
  const heightMm = await resolveThermalHeightMm(htmlWindow);

  return {
    buffer: await withTimeout(
      htmlWindow.webContents.printToPDF({
        printBackground: true,
        preferCSSPageSize: false,
        margins: { marginType: "none" },
        scale: 1,
        pageSize: {
          width: THERMAL_PAPER_WIDTH_MM * 1000,
          height: heightMm * 1000,
        },
      }),
      60_000,
      "La generación del PDF del ticket tardó demasiado",
    ),
    heightMm,
  };
}

async function injectLogoIntoReceiptHtml(html) {
  if (!html.includes("{{BOCASOFT_LOGO_URI}}")) {
    return html;
  }
  const logoPath = resolveLogoPath();
  if (!logoPath) {
    return html.replace(/\{\{BOCASOFT_LOGO_URI\}\}/g, "");
  }
  const data = await fs.readFile(logoPath);
  const dataUri = `data:image/png;base64,${data.toString("base64")}`;
  return html.replace(/\{\{BOCASOFT_LOGO_URI\}\}/g, dataUri);
}

function toPrinterEncoding(text) {
  return String(text)
    .replace(/[áàäâ]/gi, "a")
    .replace(/[éèëê]/gi, "e")
    .replace(/[íìïî]/gi, "i")
    .replace(/[óòöô]/gi, "o")
    .replace(/[úùüû]/gi, "u")
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "N");
}

async function buildEscPosPayload(text) {
  const logo = loadLogoEscPos();
  const normalized = toPrinterEncoding(String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n"));
  const init = Buffer.from([0x1b, 0x40]);
  const body = Buffer.from(`${normalized}\n\n`, "ascii");
  const feed = Buffer.from([0x1b, 0x64, 0x0a]);
  const cut = Buffer.from([0x1d, 0x56, 0x41, 0x0a]);
  return Buffer.concat([init, logo, body, feed, cut]);
}

async function printRawTextTicket(text, { printerName, copies }) {
  const payload = await buildEscPosPayload(text);
  const tmpFile = path.join(
    app.getPath("temp"),
    `bocasoft-raw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.prn`,
  );
  await fs.writeFile(tmpFile, payload);
  try {
    const copyCount = Math.max(1, Number(copies) || 1);
    for (let copy = 0; copy < copyCount; copy += 1) {
      const args = ["-o", "raw"];
      if (printerName) {
        args.push("-d", printerName);
      }
      args.push(tmpFile);
      await execFileAsync("lp", args);
    }
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
}

async function printPdfWithElectronWindow(pdfPath, { printerName, copies }) {
  const pdfWin = createHiddenHtmlWindow();
  try {
    await withTimeout(
      pdfWin.loadURL(pathToFileURL(pdfPath).href),
      20_000,
      "No se pudo cargar el PDF para imprimir",
    );
    await new Promise((resolve) => setTimeout(resolve, 500));
    await withTimeout(
      new Promise((resolve, reject) => {
        pdfWin.webContents.print(
          {
            silent: false,
            printBackground: true,
            copies: Math.max(1, Number(copies) || 1),
            deviceName: printerName,
            margins: { marginType: "none" },
          },
          (success, failureReason) => {
            if (success) resolve();
            else reject(new Error(failureReason || "Impresión cancelada o fallida"));
          },
        );
      }),
      120_000,
      "Tiempo agotado en el diálogo de impresión",
    );
  } finally {
    if (!pdfWin.isDestroyed()) {
      pdfWin.close();
    }
  }
}

async function printPdfWithSystem(pdfPath, { printerName, copies, officePrint }) {
  const stat = await fs.stat(pdfPath);
  if (!stat.isFile() || stat.size === 0) {
    throw new Error("El PDF de impresión está vacío");
  }

  if (process.platform === "win32") {
    await printPdfWithElectronWindow(pdfPath, { printerName, copies });
    return;
  }

  const args = [];
  if (printerName) {
    args.push("-d", printerName);
  }
  const copyCount = Math.max(1, Number(copies) || 1);
  if (copyCount > 1) {
    args.push("-n", String(copyCount));
  }
  args.push("-o", "document-format=application/pdf");
  if (officePrint) {
    args.push("-o", "fit-to-page=true");
  } else {
    args.push("-o", "fit-to-page=false");
    args.push("-o", "scaling=100");
  }
  args.push(pdfPath);

  try {
    const { stdout } = await execFileAsync("lp", args);
    console.log(
      `[BocaSoft] lp OK (${stat.size} bytes${officePrint ? ", oficina A4" : ""}): ${String(stdout).trim() || pdfPath}`,
    );
  } catch (err) {
    console.warn(
      `[BocaSoft] lp falló (${err instanceof Error ? err.message : err}); usando diálogo de impresión`,
    );
    await printPdfWithElectronWindow(pdfPath, { printerName, copies });
  }
}

function attachRendererRecovery(win) {
  win.webContents.on("render-process-gone", (_event, details) => {
    console.error(`[BocaSoft] Renderer detenido (${details.reason})`);
    if (details.reason === "crashed" || details.reason === "oom" || details.reason === "killed") {
      if (!win.isDestroyed()) {
        win.reload();
      }
    }
  });
}

function attachDevServerRecovery(win) {
  if (!process.env.VITE_DEV_SERVER_URL) return;

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  let retryCount = 0;
  const maxRetries = 5;

  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame || validatedURL !== devUrl) return;
    if (retryCount >= maxRetries) {
      console.error(`[BocaSoft] No se pudo cargar ${devUrl} tras ${maxRetries} intentos`);
      return;
    }
    retryCount += 1;
    const delayMs = Math.min(1500 * retryCount, 6000);
    console.warn(
      `[BocaSoft] Fallo al cargar dev server (${errorCode}: ${errorDescription}). Reintento ${retryCount}/${maxRetries} en ${delayMs}ms`,
    );
    setTimeout(() => {
      if (!win.isDestroyed()) {
        void win.loadURL(devUrl);
      }
    }, delayMs);
  });

  win.webContents.on("did-finish-load", () => {
    retryCount = 0;
  });
}

function forwardRendererLogs(win) {
  // Reenvía console.log/warn/error del renderer al terminal
  win.webContents.on("console-message", (_event, level, message) => {
    // Filtrar mensajes de Vite HMR y de React para no saturar
    if (message.includes("[vite]") || message.includes("Download the React")) return;
    const prefix = level === 2 ? "[renderer:warn]" : level === 3 ? "[renderer:error]" : "[renderer]";
    // Eliminar secuencias de color ANSI que no se ven bien en terminal
    const clean = message.replace(/%c/g, "").replace(/color:[^;]+;[^,]*/g, "");
    if (level === 3) {
      console.error(`${prefix} ${clean}`);
    } else {
      console.log(`${prefix} ${clean}`);
    }
  });
}

function loadMainWindowContent(win) {
  if (process.env.VITE_DEV_SERVER_URL) {
    void win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: "detach" });
    forwardRendererLogs(win);
    return;
  }
  void win.loadFile(path.join(__dirname, "../dist/index.html"));
}

ipcMain.handle("print-report", async (_event, options) => {
  if (!options || typeof options.html !== "string" || !options.html.trim()) {
    throw new Error("El documento de impresión está vacío");
  }

  const printerName =
    typeof options.printerName === "string" && options.printerName.trim()
      ? options.printerName.trim()
      : undefined;
  const copies = Math.max(1, Number(options.copies) || 1);

  if (options.continuousThermal) {
    const printWin = createThermalPrintWindow();
    let tmpFile = null;

    try {
      const htmlForLoad = await injectLogoIntoReceiptHtml(options.html);
      tmpFile = await loadHtmlInWindow(printWin, htmlForLoad);

      if (process.platform === "linux") {
        try {
          await printThermalViaPdfFile(printWin, { printerName, copies });
          await delayAfterPrintJob();
          return;
        } catch (pdfErr) {
          console.warn(
            `[BocaSoft] PDF térmico en Linux falló (${pdfErr instanceof Error ? pdfErr.message : pdfErr})`,
          );
        }
      } else {
        try {
          await printThermalHtmlDirect(printWin, { printerName, copies });
          await delayAfterPrintJob();
          return;
        } catch (directErr) {
          console.warn(
            `[BocaSoft] Impresión térmica directa falló (${directErr instanceof Error ? directErr.message : directErr}); probando PDF`,
          );
        }

        try {
          await printThermalViaPdfFile(printWin, { printerName, copies });
          await delayAfterPrintJob();
          return;
        } catch (pdfErr) {
          console.warn(
            `[BocaSoft] PDF térmico falló (${pdfErr instanceof Error ? pdfErr.message : pdfErr})`,
          );
        }
      }

      if (
        process.platform === "linux" &&
        typeof options.plainText === "string" &&
        options.plainText.trim()
      ) {
        await printRawTextTicket(options.plainText, { printerName, copies });
        return;
      }

      throw new Error("No se pudo imprimir el ticket térmico");
    } finally {
      if (!printWin.isDestroyed()) {
        printWin.close();
      }
      if (tmpFile) {
        scheduleTempFileCleanup(tmpFile);
      }
    }
  }

  if (options.officePrint) {
    const printWin = createHiddenHtmlWindow();
    let tmpFile = null;

    try {
      const htmlForLoad = await injectLogoIntoReceiptHtml(options.html);
      tmpFile = await loadHtmlInWindow(printWin, htmlForLoad);

      if (process.platform === "linux" || process.platform === "win32") {
        await printOfficeViaPdfFile(printWin, { printerName, copies });
        await delayAfterPrintJob();
        return;
      }

      await printWin.webContents.executeJavaScript(
        "document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()",
        true,
      );
      await new Promise((resolve) => setTimeout(resolve, 250));

      await withTimeout(
        new Promise((resolve, reject) => {
          printWin.webContents.print(
            {
              silent: Boolean(printerName),
              printBackground: true,
              copies,
              deviceName: printerName,
            },
            (success, failureReason) => {
              if (success) resolve();
              else reject(new Error(failureReason || "Impresión cancelada o fallida"));
            },
          );
        }),
        120_000,
        "Tiempo agotado en la impresión de oficina",
      );
      return;
    } finally {
      if (!printWin.isDestroyed()) {
        printWin.close();
      }
      if (tmpFile) {
        scheduleTempFileCleanup(tmpFile);
      }
    }
  }

  const printWin = createHiddenHtmlWindow();
  let tmpFile = null;

  try {
    tmpFile = await loadHtmlInWindow(printWin, options.html);

    await printWin.webContents.executeJavaScript(
      "document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()",
      true,
    );
    await new Promise((resolve) => setTimeout(resolve, 250));

    const printOptions = {
      silent: Boolean(printerName),
      printBackground: true,
      copies,
      deviceName: printerName,
    };

    await withTimeout(
      new Promise((resolve, reject) => {
        printWin.webContents.print(
          printOptions,
          (success, failureReason) => {
            if (success) resolve();
            else reject(new Error(failureReason || "Impresión cancelada o fallida"));
          },
        );
      }),
      120_000,
      "Tiempo agotado en el diálogo de impresión",
    );
  } finally {
    if (!printWin.isDestroyed()) {
      printWin.close();
    }
    if (tmpFile) {
      scheduleTempFileCleanup(tmpFile);
    }
  }
});

const EXPORT_SUBFOLDERS = {
  excel: "XLS",
  word: "DOC",
  dbf: "DBF",
  txtData: "TXT",
  txt: "TXT",
  jpg: "JPG",
  png: "PNG",
  pdf: "PDF",
  html: "HTML",
};

function withTrailingSep(dir) {
  if (!dir) return dir;
  return dir.endsWith(path.sep) ? dir : `${dir}${path.sep}`;
}

function remapLegacyDocumentsPath(cleaned) {
  const home = app.getPath("home");
  const docs = app.getPath("documents");
  const englishDocs = path.join(home, "Documents");
  if (cleaned === englishDocs || cleaned.startsWith(`${englishDocs}${path.sep}`)) {
    const suffix = cleaned.slice(englishDocs.length).replace(/^[/\\]+/, "");
    return suffix ? path.join(docs, suffix) : docs;
  }
  return cleaned;
}

function normalizeExportDirectory(directory) {
  if (typeof directory !== "string" || !directory.trim()) {
    throw new Error("La carpeta de destino no es v?lida");
  }
  let cleaned = directory.trim().replace(/[/\\]+$/, "");
  if (process.platform !== "win32") {
    if (cleaned.startsWith("~/")) {
      cleaned = path.join(app.getPath("home"), cleaned.slice(2));
    } else if (/^[a-zA-Z]:[\\/]/.test(cleaned)) {
      cleaned = path.join(app.getPath("documents"), "BocaSoft", "exports", "TMP");
    }
    cleaned = remapLegacyDocumentsPath(cleaned);
  }
  return path.normalize(cleaned);
}

function createPdfRenderWindow() {
  return createHiddenHtmlWindow();
}

async function renderPdfBuffer(html) {
  const printWin = createPdfRenderWindow();
  const started = Date.now();
  let tmpFile = null;
  try {
    tmpFile = await loadHtmlInWindow(printWin, html);
    await new Promise((resolve) => setTimeout(resolve, 450));
    console.log(`[BocaSoft] PDF HTML listo en ${Date.now() - started}ms`);

    const pdfStarted = Date.now();
    const pdfBuffer = await withTimeout(
      printWin.webContents.printToPDF({
        printBackground: true,
        preferCSSPageSize: true,
        margins: { marginType: "default" },
      }),
      45_000,
      "La generaci?n del PDF tard? demasiado. Intente de nuevo.",
    );
    console.log(`[BocaSoft] printToPDF en ${Date.now() - pdfStarted}ms`);
    return pdfBuffer;
  } finally {
    if (!printWin.isDestroyed()) {
      printWin.close();
    }
    if (tmpFile) {
      await fs.unlink(tmpFile).catch(() => {});
    }
  }
}

async function ensureExportDirectory(directory) {
  const normalized = normalizeExportDirectory(directory);
  await fs.mkdir(normalized, { recursive: true });
  const stat = await fs.stat(normalized);
  if (!stat.isDirectory()) {
    throw new Error(`No se pudo crear la carpeta: ${normalized}`);
  }
  return normalized;
}

async function getDefaultExportDirectory(kind) {
  const sub = EXPORT_SUBFOLDERS[kind] || "TMP";
  const dir =
    process.platform === "win32"
      ? path.win32.join("C:", "NAVASOFT", "TMP", sub)
      : path.join(app.getPath("documents"), "BocaSoft", "exports", sub);
  await fs.mkdir(dir, { recursive: true });
  return withTrailingSep(dir);
}

function resolveDialogDefaultPath(defaultPath) {
  if (typeof defaultPath !== "string" || !defaultPath.trim()) {
    return app.getPath("documents");
  }
  try {
    return normalizeExportDirectory(defaultPath);
  } catch {
    return app.getPath("documents");
  }
}

ipcMain.handle("get-default-export-directory", async (_event, kind) => {
  return await getDefaultExportDirectory(kind);
});

ipcMain.handle("resolve-export-directory", async (_event, directory, kind) => {
  if (typeof directory === "string" && directory.trim()) {
    const normalized = await ensureExportDirectory(directory);
    return withTrailingSep(normalized);
  }
  if (typeof kind === "string" && kind) {
    return await getDefaultExportDirectory(kind);
  }
  const fallback = path.join(app.getPath("documents"), "BocaSoft", "exports", "TMP");
  await fs.mkdir(fallback, { recursive: true });
  return withTrailingSep(fallback);
});

function restoreWindowFocus(win) {
  if (!win || win.isDestroyed()) return;
  const focus = () => {
    if (win.isDestroyed()) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
    if (!win.webContents.isDestroyed()) {
      win.webContents.focus();
    }
  };
  focus();
  setTimeout(focus, 80);
  setTimeout(focus, 250);
}

function isLiveWindow(win) {
  return Boolean(win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed());
}

async function pickDirectoryWithDialog(defaultPath) {
  const startDir = await ensureExportDirectory(defaultPath);
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
    defaultPath: startDir,
    title: "Seleccionar carpeta de destino",
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return withTrailingSep(result.filePaths[0]);
}

ipcMain.handle("pick-export-directory", async (event, defaultPath) => {
  const win = BrowserWindow.fromWebContents(event.sender);

  if (process.platform === "linux") {
    try {
      const picked = await pickDirectoryWithDialog(defaultPath);
      restoreWindowFocus(win);
      return picked;
    } catch (err) {
      restoreWindowFocus(win);
      const message = err instanceof Error ? err.message : "No se pudo abrir el selector de carpetas";
      throw new Error(message);
    }
  }

  const dialogOptions = {
    properties: ["openDirectory", "createDirectory"],
    defaultPath: await ensureExportDirectory(defaultPath),
    title: "Seleccionar carpeta de destino",
  };

  if (!win || win.isDestroyed()) {
    const result = await dialog.showOpenDialog(dialogOptions);
    if (result.canceled || !result.filePaths[0]) return null;
    return withTrailingSep(result.filePaths[0]);
  }

  win.setEnabled(false);
  try {
    const result = await dialog.showOpenDialog(win, dialogOptions);
    if (result.canceled || !result.filePaths[0]) return null;
    return withTrailingSep(result.filePaths[0]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo abrir el selector de carpetas";
    throw new Error(message);
  } finally {
    if (!win.isDestroyed()) {
      win.setEnabled(true);
      restoreWindowFocus(win);
    }
  }
});

function sanitizeExportFilename(filename) {
  const base = path.basename(String(filename || "").trim() || "export.txt");
  return base.replace(/[<>:"|?*\u0000-\u001f]/g, "_");
}

ipcMain.handle("save-export-file", async (_event, options) => {
  if (!options || typeof options.directory !== "string" || typeof options.filename !== "string") {
    throw new Error("Par?metros de guardado inv?lidos");
  }
  const directory = await ensureExportDirectory(options.directory);
  const safeName = sanitizeExportFilename(options.filename);
  const filePath = path.join(directory, safeName);
  const content = typeof options.content === "string" ? options.content : "";
  await fs.writeFile(filePath, content, "utf8");
  const stat = await fs.stat(filePath);
  if (!stat.isFile() || stat.size === 0) {
    throw new Error(`No se pudo verificar el archivo guardado: ${filePath}`);
  }
  console.log(`[BocaSoft] Exportado: ${filePath} (${stat.size} bytes)`);
  return filePath;
});

ipcMain.handle("save-export-binary-file", async (_event, options) => {
  if (!options || typeof options.directory !== "string" || typeof options.filename !== "string") {
    throw new Error("Par?metros de guardado binario inv?lidos");
  }
  if (typeof options.contentBase64 !== "string" || !options.contentBase64.trim()) {
    throw new Error("Contenido binario inv?lido");
  }
  const directory = await ensureExportDirectory(options.directory);
  const safeName = sanitizeExportFilename(options.filename);
  const filePath = path.join(directory, safeName);
  const buffer = Buffer.from(options.contentBase64, "base64");
  await fs.writeFile(filePath, buffer);
  const stat = await fs.stat(filePath);
  if (!stat.isFile() || stat.size === 0) {
    throw new Error(`No se pudo verificar el archivo guardado: ${filePath}`);
  }
  console.log(`[BocaSoft] Exportado (binario): ${filePath} (${stat.size} bytes)`);
  return filePath;
});

async function renderReportImageBuffer(html, format) {
  const renderWin = createPdfRenderWindow();
  const started = Date.now();
  let tmpFile = null;
  try {
    tmpFile = await loadHtmlInWindow(renderWin, html);
    await new Promise((resolve) => setTimeout(resolve, 450));

    const size = await renderWin.webContents.executeJavaScript(`(() => {
      const doc = document.documentElement;
      const body = document.body;
      const width = Math.max(doc.scrollWidth, body ? body.scrollWidth : 0, 600);
      const height = Math.max(doc.scrollHeight, body ? body.scrollHeight : 0, 400);
      return { width: Math.min(width, 1400), height: Math.min(height, 4000) };
    })()`);

    renderWin.setContentSize(Math.ceil(size.width), Math.ceil(size.height));
    await new Promise((resolve) => setTimeout(resolve, 250));

    const image = await renderWin.webContents.capturePage();
    const buffer =
      format === "png" ? image.toPNG() : image.toJPEG(Math.min(100, Math.max(60, 92)));
    console.log(
      `[BocaSoft] Imagen capturada en ${Date.now() - started}ms (${buffer.length} bytes, ${format})`,
    );
    return buffer;
  } finally {
    if (!renderWin.isDestroyed()) {
      renderWin.close();
    }
    if (tmpFile) {
      await fs.unlink(tmpFile).catch(() => {});
    }
  }
}

ipcMain.handle("export-report-image", async (_event, options) => {
  if (!options || typeof options.directory !== "string" || typeof options.filename !== "string") {
    throw new Error("Par?metros de imagen inv?lidos");
  }
  if (typeof options.html !== "string") throw new Error("HTML de reporte inv?lido");
  const format = options.format === "png" ? "png" : "jpeg";

  const exportStarted = Date.now();
  const imageBuffer = await renderReportImageBuffer(options.html, format);
  const directory = await ensureExportDirectory(options.directory);
  const safeName = sanitizeExportFilename(options.filename);
  const filePath = path.join(directory, safeName);
  await fs.writeFile(filePath, imageBuffer);
  const stat = await fs.stat(filePath);
  if (!stat.isFile() || stat.size === 0) {
    throw new Error(`No se pudo verificar la imagen guardada: ${filePath}`);
  }
  console.log(
    `[BocaSoft] Imagen exportada: ${filePath} (${stat.size} bytes, total ${Date.now() - exportStarted}ms)`,
  );
  return filePath;
});

ipcMain.handle("show-export-in-folder", async (_event, filePath) => {
  if (typeof filePath !== "string" || !filePath.trim()) return false;
  const resolved = normalizeExportPath(filePath);
  try {
    await fs.access(resolved);
  } catch {
    return false;
  }
  await revealExportFileInFolder(resolved);
  return true;
});

async function resolveLibreOfficeBinary() {
  const names =
    process.platform === "win32" ? ["soffice.exe", "libreoffice.exe"] : ["libreoffice", "soffice"];
  const pathCandidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
          "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
        ]
      : ["/usr/bin/libreoffice", "/usr/bin/soffice", "/snap/bin/libreoffice"];

  for (const candidate of pathCandidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      /* siguiente candidato */
    }
  }

  for (const name of names) {
    const pathEnv = process.env.PATH || "";
    const segments = pathEnv.split(path.delimiter).filter(Boolean);
    for (const segment of segments) {
      const fullPath = path.join(segment, name);
      try {
        await fs.access(fullPath);
        return fullPath;
      } catch {
        /* siguiente candidato */
      }
    }
  }

  throw new Error("LibreOffice no est? instalado o no se encuentra en el PATH");
}

const ODT_SECTION_HEADER_MARKERS = [
  "DOCS. EMITIDOS",
  "VENTA MONETARIA",
  "VENTA LINEAS/GRUPO",
  "VENTA ARTICULOS",
  "TIPOS DE VENTA",
  "C O M A N D A S:",
  ">ARTICULOS</text:p>",
];

function patchOdtSectionHeaderRows(xml) {
  const sectionHeaderCellStyle =
    '<style:style style:name="SectionHeaderCell" style:family="table-cell">' +
    '<style:table-cell-properties fo:background-color="#d4d0c8" fo:padding="0.049cm" ' +
    'fo:border="0.05pt solid #000000"><style:background-image/></style:table-cell-properties>' +
    "</style:style>";

  if (!xml.includes('style:name="SectionHeaderCell"')) {
    xml = xml.replace("</office:automatic-styles>", `${sectionHeaderCellStyle}</office:automatic-styles>`);
  }

  const rows = xml.split("</table:table-row>");
  const patchedRows = rows.map((chunk) => {
    const rowXml = chunk.includes("<table:table-row")
      ? `${chunk}</table:table-row>`
      : chunk;
    if (!rowXml.includes("<table:table-row")) return chunk;

    const isSectionHeader = ODT_SECTION_HEADER_MARKERS.some((marker) => rowXml.includes(marker));
    if (!isSectionHeader) return chunk;

    return chunk.replace(/table:style-name="[^"]*"/g, 'table:style-name="SectionHeaderCell"');
  });
  xml = patchedRows.join("</table:table-row>");

  return xml;
}

function isSalesReportOdt(xml) {
  return ODT_SECTION_HEADER_MARKERS.some((marker) => xml.includes(marker));
}

function patchOdtMonospaceList(xml) {
  // Listados en tabla HTML: estilos inline; no parchear celdas ODT (corrompe content.xml).
  if (xml.includes("<table:table")) return xml;

  const monoStyle =
    '<style:style style:name="BocaListMono" style:family="paragraph">' +
    '<style:paragraph-properties fo:margin-left="0cm" fo:margin-right="0cm" ' +
    'fo:margin-top="0cm" fo:margin-bottom="0cm" fo:line-height="115%"/>' +
    '<style:text-properties style:font-name="Courier New" fo:font-family="Courier New" ' +
    'style:font-name-asian="Courier New" style:font-name-complex="Courier New" fo:font-size="9pt"/>' +
    "</style:style>";

  if (!xml.includes('style:name="BocaListMono"')) {
    xml = xml.replace("</office:automatic-styles>", `${monoStyle}</office:automatic-styles>`);
  }

  return xml.replace(
    /<text:p text:style-name="([^"]*)"([^>]*)>/g,
    (match, styleName, rest) => {
      if (styleName.startsWith("Table") || styleName.includes("Heading")) return match;
      return `<text:p text:style-name="BocaListMono"${rest}>`;
    },
  );
}

function patchOdtPageSize(xml, pageWidthMm, pageHeightMm) {
  if (!pageWidthMm || !pageHeightMm) return xml;
  const wCm = (pageWidthMm / 10).toFixed(2) + "cm";
  const hCm = (pageHeightMm / 10).toFixed(2) + "cm";
  const orientation = pageWidthMm > pageHeightMm ? "landscape" : "portrait";
  // Reemplazo global simple: fo:page-width / fo:page-height / style:print-orientation
  xml = xml.replace(/fo:page-width="[^"]*"/g, `fo:page-width="${wCm}"`);
  xml = xml.replace(/fo:page-height="[^"]*"/g, `fo:page-height="${hCm}"`);
  xml = xml.replace(/style:print-orientation="[^"]*"/g, `style:print-orientation="${orientation}"`);
  // Si no existe print-orientation, inyectarlo en page-layout-properties
  if (!xml.includes("style:print-orientation")) {
    xml = xml.replace(
      /(<style:page-layout-properties)(\s)/g,
      `$1 style:print-orientation="${orientation}"$2`,
    );
  }
  return xml;
}

async function patchOdtLayout(odtPath, pageWidthMm, pageHeightMm) {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "bocasoft-odt-"));
  try {
    await execFileAsync("unzip", ["-q", odtPath, "-d", workDir], { timeout: 30_000 });
    for (const name of ["content.xml", "styles.xml"]) {
      const xmlPath = path.join(workDir, name);
      try {
        await fs.access(xmlPath);
      } catch {
        continue;
      }
      let xml = await fs.readFile(xmlPath, "utf8");
      xml = xml
        .replace(/fo:font-size="2pt"/g, 'fo:font-size="8pt"')
        .replace(/style:font-size-asian="2pt"/g, 'style:font-size-asian="8pt"')
        .replace(/style:font-size-complex="2pt"/g, 'style:font-size-complex="8pt"');

      // Tamaño de página: aplicar en styles.xml Y content.xml (LO puede usar cualquiera)
      xml = patchOdtPageSize(xml, pageWidthMm, pageHeightMm);

      if (isSalesReportOdt(xml)) {
        xml = xml.replace(
          /<style:table-properties style:width="[\d.]+cm"/g,
          '<style:table-properties style:width="17cm"',
        );
      } else if (xml.includes("<table:table")) {
        xml = xml.replace(
          /<style:table-properties style:width="[\d.]+cm"/g,
          '<style:table-properties style:width="27cm"',
        );
      }

      if (name === "content.xml") {
        xml = patchOdtSectionHeaderRows(xml);
        xml = patchOdtMonospaceList(xml);
      }

      await fs.writeFile(xmlPath, xml, "utf8");
    }

    const mimetypePath = path.join(workDir, "mimetype");
    try {
      await fs.access(mimetypePath);
    } catch {
      await fs.writeFile(mimetypePath, "application/vnd.oasis.opendocument.text", "utf8");
    }

    const patchedPath = `${odtPath}.patched`;
    await fs.rm(patchedPath, { force: true }).catch(() => undefined);
    // ODT exige mimetype sin comprimir como primera entrada del ZIP.
    await execFileAsync(
      "bash",
      [
        "-c",
        `cd "${workDir}" && zip -0 -X "${patchedPath}" mimetype && zip -X -r "${patchedPath}" . -x mimetype`,
      ],
      { timeout: 30_000 },
    );
    await fs.rename(patchedPath, odtPath);
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function convertHtmlToWordDoc(html, destPath) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "bocasoft-word-"));
  const htmlPath = path.join(tmpDir, "report.html");
  const loBinary = await resolveLibreOfficeBinary();
  const loProfile = path.join(tmpDir, "lo-profile");
  const convertFormats = ["odt", "doc", "docx"];

  // Extraer tamaño de página del @page CSS para forzarlo en el ODT (LO ignora @page en HTML)
  let pageWidthMm = null;
  let pageHeightMm = null;
  const pageSizeMatch = html.match(/@page\s*\{[^}]*size:\s*([\d.]+)mm\s+([\d.]+)mm/);
  if (pageSizeMatch) {
    pageWidthMm = parseFloat(pageSizeMatch[1]);
    pageHeightMm = parseFloat(pageSizeMatch[2]);
  }

  try {
    await fs.writeFile(htmlPath, html, "utf8");
    let lastError = null;

    for (const convertTarget of convertFormats) {
      const producedPath = path.join(tmpDir, `report.${convertTarget}`);
      try {
        await fs.rm(producedPath, { force: true }).catch(() => undefined);
        await execFileAsync(
          loBinary,
          [
            "--headless",
            `-env:UserInstallation=file://${loProfile}`,
            "--convert-to",
            convertTarget,
            htmlPath,
            "--outdir",
            tmpDir,
          ],
          { timeout: 90_000 },
        );
        await fs.access(producedPath);
        if (convertTarget === "odt") {
          await patchOdtLayout(producedPath, pageWidthMm, pageHeightMm);
        }
        await fs.copyFile(producedPath, destPath);
        console.log(`[BocaSoft] Word convertido vía LibreOffice (${convertTarget})`);
        return;
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError ?? new Error("LibreOffice no generó el documento");
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

ipcMain.handle("export-word-file", async (_event, options) => {
  if (!options || typeof options.directory !== "string" || typeof options.filename !== "string") {
    throw new Error("Par?metros de Word inv?lidos");
  }
  if (typeof options.html !== "string") throw new Error("HTML de reporte inv?lido");

  const exportStarted = Date.now();
  const directory = await ensureExportDirectory(options.directory);
  const safeName = sanitizeExportFilename(options.filename);
  const filePath = path.join(directory, safeName);

  try {
    await convertHtmlToWordDoc(options.html, filePath);
    console.log(
      `[BocaSoft] Word exportado (ODT): ${filePath} (total ${Date.now() - exportStarted}ms)`,
    );
  } catch (err) {
    const detail = err instanceof Error ? err.message : "conversión fallida";
    console.warn(`[BocaSoft] LibreOffice no convirtió (${detail}), guardando HTML Word como .doc`);
    await fs.writeFile(filePath, options.html, "utf8");
  }

  const stat = await fs.stat(filePath);
  if (!stat.isFile() || stat.size === 0) {
    throw new Error(`No se pudo verificar el documento guardado: ${filePath}`);
  }
  return filePath;
});

ipcMain.handle("export-pdf-file", async (_event, options) => {
  if (!options || typeof options.directory !== "string" || typeof options.filename !== "string") {
    throw new Error("Par?metros de PDF inv?lidos");
  }
  if (typeof options.html !== "string") throw new Error("HTML de reporte inv?lido");

  const exportStarted = Date.now();
  const pdfBuffer = await renderPdfBuffer(options.html);
  const directory = await ensureExportDirectory(options.directory);
  const safeName = sanitizeExportFilename(options.filename);
  const filePath = path.join(directory, safeName);
  await fs.writeFile(filePath, pdfBuffer);
  const stat = await fs.stat(filePath);
  if (!stat.isFile() || stat.size === 0) {
    throw new Error(`No se pudo verificar el PDF guardado: ${filePath}`);
  }
  console.log(
    `[BocaSoft] PDF exportado: ${filePath} (${stat.size} bytes, total ${Date.now() - exportStarted}ms)`,
  );
  return filePath;
});

const LIBREOFFICE_WRITER_EXTENSIONS = new Set([".doc", ".docx", ".odt", ".rtf"]);
const LIBREOFFICE_CALC_EXTENSIONS = new Set([".xls", ".xlsx", ".ods", ".csv"]);

async function openExportFileWithPreferredApp(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const useLibreOffice =
    LIBREOFFICE_WRITER_EXTENSIONS.has(ext) || LIBREOFFICE_CALC_EXTENSIONS.has(ext);

  if (useLibreOffice) {
    try {
      const loBinary = await resolveLibreOfficeBinary();
      const child = spawn(loBinary, [filePath], {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
      console.log(`[BocaSoft] Abierto con LibreOffice: ${filePath}`);
      return;
    } catch (err) {
      const detail = err instanceof Error ? err.message : "LibreOffice no disponible";
      console.warn(`[BocaSoft] ${detail}, usando aplicaci?n predeterminada`);
    }
  }

  const error = await shell.openPath(filePath);
  if (error) throw new Error(error);
}

function encodeMimeHeader(value) {
  const text = String(value ?? "");
  if (/^[\x00-\x7F]*$/.test(text)) return text;
  const encoded = Buffer.from(text, "utf8").toString("base64");
  return `=?UTF-8?B?${encoded}?=`;
}

function attachmentMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".pdf": "application/pdf",
    ".html": "text/html",
    ".htm": "text/html",
    ".txt": "text/plain",
    ".dbf": "application/octet-stream",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
  };
  return map[ext] || "application/octet-stream";
}

function wrapBase64(base64) {
  return base64.replace(/.{1,76}/g, "$&\n").trim();
}

async function buildEmlWithAttachment({ subject, body, attachmentPath }) {
  const attachmentName = path.basename(attachmentPath);
  const attachmentData = await fs.readFile(attachmentPath);
  const base64 = attachmentData.toString("base64");
  const mimeType = attachmentMimeType(attachmentPath);
  const boundary = `----=_BocaSoft_${Date.now()}`;
  const safeSubject = encodeMimeHeader(subject);
  const plainBody = String(body ?? "").replace(/\r\n/g, "\n");

  const eml = [
    "MIME-Version: 1.0",
    `Subject: ${safeSubject}`,
    "To: ",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    plainBody,
    "",
    `--${boundary}`,
    `Content-Type: ${mimeType}; name="${attachmentName}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${attachmentName}"`,
    "",
    wrapBase64(base64),
    `--${boundary}--`,
    "",
  ].join("\r\n");

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "bocasoft-eml-"));
  const emlPath = path.join(tmpDir, "mensaje.eml");
  await fs.writeFile(emlPath, eml, "utf8");
  return emlPath;
}

async function composeViaXdgEmail({ subject, body, attachmentPath }) {
  await execFileAsync(
    "xdg-email",
    ["--attach", attachmentPath, "--subject", subject, "--body", body],
    { timeout: 20000 },
  );
}

async function composeViaMacMail({ subject, body, attachmentPath }) {
  const esc = (value) =>
    String(value ?? "")
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"');
  const script = `
tell application "Mail"
  set newMessage to make new outgoing message with properties {subject:"${esc(subject)}", content:"${esc(body)}", visible:true}
  tell newMessage
    make new attachment with properties {file name:POSIX file "${esc(attachmentPath)}"} at after the last paragraph
  end tell
  activate
end tell`;
  await execFileAsync("osascript", ["-e", script], { timeout: 20000 });
}

async function composeEmailWithAttachment({ subject, body, attachmentPath }) {
  if (typeof attachmentPath !== "string" || !attachmentPath.trim()) {
    throw new Error("No se indic? el archivo adjunto.");
  }
  await fs.access(attachmentPath);

  const payload = {
    subject: String(subject ?? ""),
    body: String(body ?? ""),
    attachmentPath,
  };

  if (process.platform === "linux") {
    try {
      await composeViaXdgEmail(payload);
      return { method: "xdg-email" };
    } catch (err) {
      console.warn("[BocaSoft] xdg-email fall?, usando borrador .eml:", err);
    }
  }

  if (process.platform === "darwin") {
    try {
      await composeViaMacMail(payload);
      return { method: "mail-app" };
    } catch (err) {
      console.warn("[BocaSoft] Mail.app fall?, usando borrador .eml:", err);
    }
  }

  const emlPath = await buildEmlWithAttachment(payload);
  const error = await shell.openPath(emlPath);
  if (error) throw new Error(error);
  return { method: "eml", emlPath };
}

ipcMain.handle("compose-email-with-attachment", async (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  try {
    const result = await composeEmailWithAttachment(options ?? {});
    restoreWindowFocus(win);
    return result;
  } catch (err) {
    restoreWindowFocus(win);
    const message = err instanceof Error ? err.message : "No se pudo abrir el correo con adjunto";
    throw new Error(message);
  }
});

function pathToFileUri(filePath) {
  const resolved = path.resolve(filePath);
  if (process.platform === "win32") {
    const normalized = resolved.replace(/\\/g, "/");
    return `file:///${encodeURI(normalized).replace(/^\//, "")}`;
  }
  return `file://${encodeURI(resolved)}`;
}

async function copyFileToClipboard(filePath) {
  const absolute = path.resolve(filePath);
  await fs.access(absolute);

  if (process.platform === "linux") {
    const uri = pathToFileUri(absolute);
    clipboard.write({
      "x-special/gnome-copied-files": Buffer.from(`copy\n${uri}`, "utf8"),
      "text/uri-list": Buffer.from(`${uri}\r\n`, "utf8"),
      text: absolute,
    });
    return;
  }

  if (process.platform === "darwin") {
    const esc = absolute.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    await execFileAsync("osascript", ["-e", `set the clipboard to (POSIX file "${esc}")`], {
      timeout: 10000,
    });
    return;
  }

  if (process.platform === "win32") {
    const esc = absolute.replace(/'/g, "''");
    await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-Command", `Set-Clipboard -Path '${esc}'`],
      { timeout: 10000 },
    );
  }
}

ipcMain.handle("open-web-email-with-attachment", async (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const url = options?.url;
  const attachmentPath = options?.attachmentPath;
  if (typeof url !== "string" || !url.trim()) {
    throw new Error("URL de correo inválida.");
  }
  if (typeof attachmentPath !== "string" || !attachmentPath.trim()) {
    throw new Error("No se indicó el archivo adjunto.");
  }

  try {
    await copyFileToClipboard(attachmentPath);
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      await shell.openExternal(url);
    } else {
      throw new Error("URL de correo no permitida.");
    }
    shell.showItemInFolder(path.resolve(attachmentPath));
    restoreWindowFocus(win);
    return { copied: true };
  } catch (err) {
    restoreWindowFocus(win);
    const message = err instanceof Error ? err.message : "No se pudo preparar el correo web";
    throw new Error(message);
  }
});

const GMAIL_PARTITION = "persist:bocasoft-gmail";
const GMAIL_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
let gmailComposeWindow = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildGmailComposeUrl(subject, body) {
  const su = encodeURIComponent(String(subject ?? ""));
  const b = encodeURIComponent(String(body ?? ""));
  return `https://mail.google.com/mail/?view=cm&fs=1&su=${su}&body=${b}`;
}

async function clickGmailAttachButton(webContents) {
  return webContents.executeJavaScript(`
    (function() {
      const labels = ["Adjuntar archivos", "Attach files"];
      for (const label of labels) {
        const byAria = document.querySelector('[aria-label="' + label + '"]');
        if (byAria) { byAria.click(); return true; }
        const byTooltip = document.querySelector('[data-tooltip="' + label + '"]');
        if (byTooltip) { byTooltip.click(); return true; }
      }
      const input = document.querySelector('input[type="file"]');
      return Boolean(input);
    })()
  `);
}

async function setFileOnInputViaCdp(webContents, absolutePath) {
  const dbg = webContents.debugger;
  const wasAttached = dbg.isAttached();
  if (!wasAttached) dbg.attach("1.3");
  try {
    await dbg.sendCommand("DOM.enable");
    const { root } = await dbg.sendCommand("DOM.getDocument", { depth: -1, pierce: true });
    const { nodeId } = await dbg.sendCommand("DOM.querySelector", {
      nodeId: root.nodeId,
      selector: 'input[type="file"]',
    });
    if (!nodeId) return false;
    await dbg.sendCommand("DOM.setFileInputFiles", {
      nodeId,
      files: [absolutePath],
    });
    return true;
  } finally {
    if (!wasAttached && dbg.isAttached()) dbg.detach();
  }
}

async function tryAttachFileToGmail(webContents, attachmentPath) {
  const absolute = path.resolve(attachmentPath);
  await fs.access(absolute);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (!webContents || webContents.isDestroyed()) return false;
    try {
      await clickGmailAttachButton(webContents);
      await sleep(700);
      if (webContents.isDestroyed()) return false;
      if (await setFileOnInputViaCdp(webContents, absolute)) {
        console.log(`[BocaSoft] Gmail adjunto OK: ${absolute}`);
        return true;
      }
    } catch (err) {
      console.warn(`[BocaSoft] Gmail adjunto intento ${attempt + 1}:`, err);
    }
    await sleep(1500);
  }
  return false;
}

function getOrCreateGmailWindow() {
  if (isLiveWindow(gmailComposeWindow)) {
    return gmailComposeWindow;
  }
  gmailComposeWindow = new BrowserWindow({
    width: 980,
    height: 760,
    title: "Gmail — BocaSoft",
    modal: false,
    autoHideMenuBar: true,
    webPreferences: {
      partition: GMAIL_PARTITION,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  gmailComposeWindow.webContents.setUserAgent(GMAIL_USER_AGENT);
  gmailComposeWindow.on("closed", () => {
    gmailComposeWindow = null;
  });
  return gmailComposeWindow;
}

async function waitForWebContentsLoad(webContents, url, timeoutMs = 45000) {
  if (!webContents || webContents.isDestroyed()) {
    throw new Error("La ventana de Gmail no está disponible.");
  }
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Tiempo de espera agotado al cargar Gmail")),
      timeoutMs,
    );
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    const fail = (err) => {
      clearTimeout(timer);
      reject(err);
    };
    if (webContents.isDestroyed()) {
      fail(new Error("La ventana de Gmail se cerró antes de cargar."));
      return;
    }
    webContents.once("did-finish-load", done);
    webContents.once("destroyed", () => fail(new Error("La ventana de Gmail se cerró antes de cargar.")));
    void webContents.loadURL(url).catch(fail);
  });
}

ipcMain.handle("open-gmail-compose-with-attachment", async (event, options) => {
  const mainWin = BrowserWindow.fromWebContents(event.sender);
  try {
    const subject = String(options?.subject ?? "");
    const body = String(options?.body ?? "");
    const attachmentPath = options?.attachmentPath;

    if (typeof attachmentPath !== "string" || !attachmentPath.trim()) {
      throw new Error("No se indicó el archivo adjunto.");
    }
    const absolute = path.resolve(attachmentPath);
    await fs.access(absolute);

    const url = buildGmailComposeUrl(subject, body);
    const gmailWin = getOrCreateGmailWindow();
    if (!isLiveWindow(gmailWin)) {
      throw new Error("No se pudo crear la ventana de Gmail.");
    }

    await waitForWebContentsLoad(gmailWin.webContents, url);

    if (!isLiveWindow(gmailWin)) {
      throw new Error("La ventana de Gmail se cerró inesperadamente.");
    }

    gmailWin.show();
    gmailWin.focus();

    await sleep(2800);

    if (!isLiveWindow(gmailWin)) {
      throw new Error("La ventana de Gmail se cerró inesperadamente.");
    }

    const attached = await tryAttachFileToGmail(gmailWin.webContents, absolute);

    if (!attached) {
      await copyFileToClipboard(absolute);
      const needsLogin =
        isLiveWindow(gmailWin) &&
        gmailWin.webContents.getURL().includes("accounts.google.com");
      return { attached: false, needsLogin };
    }

    return { attached: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo abrir Gmail";
    throw new Error(message);
  } finally {
    restoreWindowFocus(mainWin);
  }
});

ipcMain.handle("restore-app-focus", async (event) => {
  restoreWindowFocus(BrowserWindow.fromWebContents(event.sender));
});

ipcMain.handle("show-app-message", async (event, options) => {
  const mainWin = BrowserWindow.fromWebContents(event.sender);
  const title = String(options?.title ?? "BocaSoft");
  const message = String(options?.message ?? "");
  try {
    if (mainWin && !mainWin.isDestroyed()) {
      await dialog.showMessageBox(mainWin, {
        type: "warning",
        title,
        message: title,
        detail: message,
        buttons: ["Ok"],
        defaultId: 0,
        noLink: true,
      });
    }
  } finally {
    restoreWindowFocus(mainWin);
  }
});

ipcMain.handle("open-export-file", async (event, filePath) => {
  if (typeof filePath !== "string" || !filePath.trim()) return;
  const resolved = normalizeExportPath(filePath);
  try {
    await fs.access(resolved);
  } catch {
    throw new Error(`El archivo no existe: ${filePath}`);
  }
  if (shouldSkipRecentFileOpen(resolved)) {
    console.log(`[BocaSoft] Archivo abierto hace poco, omitiendo: ${resolved}`);
    return;
  }
  const win = BrowserWindow.fromWebContents(event.sender);
  // No esperar a LibreOffice/visor: evita congelar la UI del TPV.
  void openExportFileWithPreferredApp(resolved)
    .then(() => {
      exportRevealState.lastFileOpen = { path: resolved, at: Date.now() };
    })
    .catch((err) => {
      const message = err instanceof Error ? err.message : "No se pudo abrir el archivo";
      console.error(`[BocaSoft] ${message}`);
    })
    .finally(() => restoreWindowFocus(win));
});

ipcMain.handle("check-for-updates", async () => {
  return checkForUpdates();
});

ipcMain.handle("install-update", async (event, payload) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return downloadAndInstall(payload ?? {}, win);
});

ipcMain.handle("open-external", async (_event, url) => {
  if (typeof url !== "string") return;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      await shell.openExternal(url);
    }
  } catch {
    /* URL inv?lida */
  }
});

const ALLOWED_FETCH_JSON_HOSTS = new Set([
  "estadisticas.bcrp.gob.pe",
  "api.open-meteo.com",
  "geocoding-api.open-meteo.com",
  "ip-api.com",
  "consulta.rucpe.com",
  "bocasion.com",
  "dniruc.apisperu.com",
  "eldni.com",
  "api.github.com",
]);

const DNI_API_FALLBACK = "https://bocasion.com/dni-api";

function identityEnvKey(name) {
  return String(process.env[name] ?? "").trim();
}

function dniApiBase() {
  const raw = identityEnvKey("VITE_API_BASE_URL");
  if (raw) return raw.replace(/\/$/, "");
  return DNI_API_FALLBACK;
}

function configuredApiHost() {
  try {
    return new URL(dniApiBase()).hostname;
  } catch {
    return null;
  }
}

function isFetchHostAllowed(hostname) {
  return ALLOWED_FETCH_JSON_HOSTS.has(hostname) || hostname === configuredApiHost();
}

function isFetchProtocolOk(parsed) {
  if (parsed.protocol === "https:") return true;
  if (parsed.protocol !== "http:") return false;
  return parsed.hostname === "ip-api.com" || parsed.hostname === configuredApiHost();
}

function pickIdentityName(data) {
  if (!data || typeof data !== "object") return "";
  const candidates = [
    data.full_name,
    data.nombre_completo,
    data.nombreCompleto,
    data.razon_social,
    data.razonSocial,
    data.nombre,
    data.nombre_o_razon_social,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  const apPat = data.apellido_paterno ?? data.apellidoPaterno ?? data.first_last_name;
  const apMat = data.apellido_materno ?? data.apellidoMaterno ?? data.second_last_name;
  const nombres = data.nombres ?? data.first_name;
  return [apPat, apMat, nombres]
    .filter((v) => typeof v === "string" && v.trim())
    .join(" ")
    .trim();
}

function parseRucpeBuscarHtml(html, ruc) {
  const hrefIdx = html.indexOf(`/ruc/${ruc}`);
  if (hrefIdx < 0) return null;
  const slice = html.slice(hrefIdx, hrefIdx + 1200);
  const match = slice.match(new RegExp(`${ruc}\\s*<\\/span>\\s*<span[^>]*>([^<]+)<\\/span>`, "i"));
  const name = match && match[1] ? match[1].trim() : "";
  return name || null;
}

async function fetchWithTimeout(url, opts = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await net.fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonHttps(url, headers, timeoutMs = 8000) {
  const response = await fetchWithTimeout(
    url,
    { headers: { Accept: "application/json", ...(headers || {}) } },
    timeoutMs,
  );
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  return { ok: response.ok, status: response.status, body, text };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNotFoundIdentity(status, message) {
  if (status === 404) return true;
  const lower = String(message ?? "").toLowerCase();
  if (!lower) return false;
  if (/token|api key|autentic|rate|timeout|conect|network|429|500|502|503/.test(lower)) {
    return false;
  }
  return /no encontr|not found|no existe|inválido|invalido/.test(lower);
}

function identityFromPayload(body, type, value, provider) {
  const name = pickIdentityName(body?.data ?? body);
  if (!name) return null;
  const docRaw = body?.data ?? body ?? {};
  const fromApi = String(docRaw.dni ?? docRaw.ruc ?? docRaw.document_number ?? value).replace(/\D/g, "");
  return {
    ok: true,
    provider,
    result: { document: fromApi || value, type, name },
  };
}

function identityFail(status, message) {
  const text = String(message || "").trim() || "Sin datos";
  return {
    ok: false,
    retryable: !isNotFoundIdentity(status, text),
    message: text,
  };
}

async function lookupJsonIdentity(url, headers, timeoutMs, type, value, provider) {
  try {
    const { ok, status, body } = await fetchJsonHttps(url, headers, timeoutMs);
    const hit = identityFromPayload(body, type, value, provider);
    if (hit) return hit;
    if (status === 429 || status >= 500) {
      return identityFail(status, `Servicio ocupado (${provider})`);
    }
    const msg =
      (body && (body.message || body.detail || body.error)) ||
      (!ok ? `HTTP ${status}` : "Sin nombre");
    if (!ok || body?.success === false) {
      return identityFail(status, msg);
    }
    return identityFail(status, msg);
  } catch (err) {
    return identityFail(0, err instanceof Error ? err.message : "Error de red");
  }
}

async function withRetry(fn, attempts = 2) {
  let last = identityFail(0, "Sin respuesta");
  for (let i = 0; i < attempts; i += 1) {
    last = await fn();
    if (last.ok || last.retryable === false) return last;
    if (i + 1 < attempts) await delay(400);
  }
  return last;
}

/** Primera promesa que resuelve con ok:true; si todas fallan, unifica el mensaje. */
async function raceFirstOk(tasks) {
  return await new Promise((resolve) => {
    let pending = tasks.length;
    let settled = false;
    const fails = [];
    if (pending === 0) {
      resolve({ ok: false, message: "Sin proveedores de consulta" });
      return;
    }
    const finish = (res) => {
      if (settled) return;
      settled = true;
      resolve(res);
    };
    for (const task of tasks) {
      Promise.resolve()
        .then(() => task())
        .then((res) => {
          if (res && res.ok) {
            finish(res);
            return;
          }
          if (res) fails.push(res);
          pending -= 1;
          if (pending === 0) {
            const allMissing = fails.length > 0 && fails.every((row) => row.retryable === false);
            finish({
              ok: false,
              message: allMissing
                ? "Documento no encontrado en el padrón."
                : "No se pudo consultar el documento. Intente de nuevo.",
            });
          }
        })
        .catch((err) => {
          fails.push({
            ok: false,
            retryable: true,
            message: err instanceof Error ? err.message : "Error de red",
          });
          pending -= 1;
          if (pending === 0) {
            finish({
              ok: false,
              message: "No se pudo consultar el documento. Intente de nuevo.",
            });
          }
        });
    }
  });
}

function apisperuToken() {
  return identityEnvKey("APISPERU_TOKEN");
}

function rucpeApiKey() {
  return identityEnvKey("RUCPE_API_KEY") || identityEnvKey("VITE_RUCPE_API_KEY");
}

ipcMain.handle("list-sql-profiles", async () => {
  const { listSqlProfiles } = require("./navaSql.cjs");
  return listSqlProfiles();
});

ipcMain.handle("get-sql-status", async () => {
  const { getSqlStatus } = require("./navaSql.cjs");
  return getSqlStatus();
});

ipcMain.handle("set-sql-profile", async (_event, profileId) => {
  const { setSqlProfile } = require("./navaSql.cjs");
  return setSqlProfile(profileId);
});

ipcMain.handle("list-nava-day-report", async (_event, payload) => {
  const { listNavaDayReport } = require("./navaSql.cjs");
  try {
    return await listNavaDayReport(payload);
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : String(err));
  }
});

ipcMain.handle("list-nava-vendors", async () => {
  const { listNavaVendors } = require("./navaSql.cjs");
  try {
    return await listNavaVendors();
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : String(err));
  }
});

ipcMain.handle("nava-login", async (_event, payload) => {
  const { navaLogin } = require("./navaSql.cjs");
  try {
    return await navaLogin(payload ?? {});
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : String(err));
  }
});

ipcMain.handle("list-nava-docs", async (_event, payload) => {
  const { listNavaDocs } = require("./navaSql.cjs");
  try {
    return await listNavaDocs(payload ?? {});
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : String(err));
  }
});

ipcMain.handle("list-nava-dates", async (_event, payload) => {
  const { listNavaDates } = require("./navaSql.cjs");
  try {
    return await listNavaDates(payload);
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : String(err));
  }
});

ipcMain.handle("insert-nava-sale", async (_event, payload) => {
  const { insertNavaSale } = require("./navaSql.cjs");
  try {
    return await insertNavaSale(payload ?? {});
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : String(err));
  }
});

ipcMain.handle("peek-nava-doc-series", async () => {
  const { peekNavaDocSeries } = require("./navaSql.cjs");
  try {
    return await peekNavaDocSeries();
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : String(err));
  }
});

ipcMain.handle("warmup-http", async () => {
  const urls = [
    `${dniApiBase()}/`,
    `${DNI_API_FALLBACK}/`,
    "https://consulta.rucpe.com/",
    "https://estadisticas.bcrp.gob.pe/",
  ];
  await Promise.allSettled(
    urls.map((url) =>
      fetchWithTimeout(url, { headers: { Accept: "*/*" }, method: "GET" }, 1800).then((r) =>
        r.arrayBuffer(),
      ),
    ),
  );
  return true;
});

/** DNI/RUC: varias fuentes en paralelo; un fallo transitorio no corta las demás. */
ipcMain.handle("lookup-identity", async (_event, payload) => {
  const type = payload?.type === "dni" || payload?.type === "ruc" ? payload.type : null;
  const value = String(payload?.value ?? "").replace(/\D/g, "");
  if (!type) {
    return { ok: false, message: "Tipo de documento no soportado" };
  }

  if (type === "dni") {
    if (!/^\d{8}$/.test(value)) {
      return { ok: false, message: "DNI inválido (8 dígitos)" };
    }
    const primary = dniApiBase();
    const tasks = [
      () =>
        withRetry(() =>
          lookupJsonIdentity(`${primary}/api/dni/${value}`, null, 7000, "dni", value, primary),
        ),
    ];
    if (primary.replace(/\/$/, "") !== DNI_API_FALLBACK.replace(/\/$/, "")) {
      tasks.push(() =>
        withRetry(() =>
          lookupJsonIdentity(
            `${DNI_API_FALLBACK}/api/dni/${value}`,
            null,
            8000,
            "dni",
            value,
            DNI_API_FALLBACK,
          ),
        ),
      );
    }
    const apis = apisperuToken();
    if (apis) {
      tasks.push(() =>
        withRetry(() =>
          lookupJsonIdentity(
            `https://dniruc.apisperu.com/api/v1/dni/${value}?token=${encodeURIComponent(apis)}`,
            { Authorization: `Bearer ${apis}` },
            8000,
            "dni",
            value,
            "dniruc.apisperu.com",
          ),
        ),
      );
    }
    const rucpeKey = rucpeApiKey();
    if (rucpeKey) {
      tasks.push(() =>
        withRetry(() =>
          lookupJsonIdentity(
            `https://consulta.rucpe.com/api/v1/dni/${value}`,
            { "X-API-Key": rucpeKey },
            8000,
            "dni",
            value,
            "consulta.rucpe.com",
          ),
        ),
      );
    }
    try {
      return await raceFirstOk(tasks);
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : "Error al consultar DNI",
      };
    }
  }

  if (!/^\d{11}$/.test(value)) {
    return { ok: false, message: "RUC inválido (11 dígitos)" };
  }

  const rucpeKey = rucpeApiKey();
  const apis = apisperuToken();
  const tasks = [];
  if (rucpeKey) {
    tasks.push(() =>
      withRetry(() =>
        lookupJsonIdentity(
          `https://consulta.rucpe.com/api/v1/ruc/${value}`,
          { "X-API-Key": rucpeKey },
          7000,
          "ruc",
          value,
          "consulta.rucpe.com",
        ),
      ),
    );
  }
  if (apis) {
    tasks.push(() =>
      withRetry(() =>
        lookupJsonIdentity(
          `https://dniruc.apisperu.com/api/v1/ruc/${value}?token=${encodeURIComponent(apis)}`,
          { Authorization: `Bearer ${apis}` },
          8000,
          "ruc",
          value,
          "dniruc.apisperu.com",
        ),
      ),
    );
  }
  tasks.push(async () => {
    try {
      const buscarUrl = `https://consulta.rucpe.com/buscar?q=${encodeURIComponent(value)}`;
      const response = await fetchWithTimeout(
        buscarUrl,
        {
          headers: {
            Accept: "text/html",
            "HX-Request": "true",
            "User-Agent": "Mozilla/5.0 (compatible; BocaSoft/1.0)",
          },
        },
        8000,
      );
      const html = await response.text();
      if (!response.ok) {
        return identityFail(response.status, `Error al consultar RUC (${response.status})`);
      }
      const name = parseRucpeBuscarHtml(html, value);
      if (!name) {
        return identityFail(404, "RUC no encontrado en consulta.rucpe.com");
      }
      return {
        ok: true,
        provider: "consulta.rucpe.com/buscar",
        result: { document: value, type: "ruc", name },
      };
    } catch (err) {
      return identityFail(0, err instanceof Error ? err.message : "Error de red");
    }
  });

  try {
    return await raceFirstOk(tasks);
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Error al consultar RUC",
    };
  }
});

ipcMain.handle("fetch-json-url", async (_event, urlOrOpts) => {
  const url = typeof urlOrOpts === "string" ? urlOrOpts : urlOrOpts?.url;
  const extraHeaders =
    typeof urlOrOpts === "object" && urlOrOpts && typeof urlOrOpts.headers === "object"
      ? urlOrOpts.headers
      : null;
  if (typeof url !== "string") return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const protocolOk = isFetchProtocolOk(parsed);
  if (!protocolOk || !isFetchHostAllowed(parsed.hostname)) {
    return null;
  }
  try {
    const headers = { Accept: "application/json" };
    if (extraHeaders) {
      for (const [key, value] of Object.entries(extraHeaders)) {
        if (typeof value === "string" && value.trim()) {
          headers[key] = value.trim();
        }
      }
    }
    const response = await net.fetch(url, { headers });
    const contentType = response.headers.get("content-type") ?? "";
    const text = await response.text();
    if (!contentType.includes("json") && text.trimStart().startsWith("<")) {
      return null;
    }
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
    if (!response.ok) {
      // Solo con headers (consulta RUC/DNI): devolver detalle de error.
      if (extraHeaders) {
        return { __httpError: true, status: response.status, body: json };
      }
      return null;
    }
    return json;
  } catch (err) {
    console.error("[BocaSoft] fetch-json-url:", err instanceof Error ? err.message : err);
    return null;
  }
});

function createWindow() {
  let shown = false;
  const showMainWindow = () => {
    if (shown) return;
    shown = true;
    win.show();
  };

  const win = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    show: false,
    backgroundColor: "#ececec",
    title: "Intranet Ventas ? Bocasi?n S.A.C.",
    icon: [
      path.join(__dirname, "../dist/images/apicon.png"),
      path.join(__dirname, "../public/images/apicon.png"),
    ].find((p) => fsSync.existsSync(p)),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.once("ready-to-show", showMainWindow);
  // Si Chromium tarda o el NetworkService falla, no dejar la app invisible.
  setTimeout(showMainWindow, 2500);
  win.webContents.once("did-finish-load", () => {
    setTimeout(showMainWindow, 100);
  });
  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) return;
    console.error(`[BocaSoft] Fallo al cargar UI (${errorCode}): ${errorDescription} — ${validatedURL}`);
    showMainWindow();
  });

  const onRendererReady = (_event, contents) => {
    if (contents === win.webContents) showMainWindow();
  };
  ipcMain.on("renderer-ready", onRendererReady);
  win.on("closed", () => {
    ipcMain.removeListener("renderer-ready", onRendererReady);
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  attachRendererRecovery(win);
  attachDevServerRecovery(win);
  loadMainWindowContent(win);
}

app.whenReady().then(async () => {
  if (!gotSingleInstanceLock) return;

  // Si hay update pendiente, reemplaza el binario y relanza (no abrir UI vieja).
  try {
    const applied = await applyPendingUpdateOnStartup();
    if (applied) return;
  } catch (err) {
    console.error("[updater] pending update:", err);
  }

  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    if (permission === "geolocation") {
      callback(true);
      return;
    }
    callback(false);
  });

  createWindow();

  setTimeout(() => {
    void autoCheckOnStartup(() => BrowserWindow.getAllWindows()[0] ?? null);
  }, 12000);

  const gmailSession = session.fromPartition(GMAIL_PARTITION);
  gmailSession.setPermissionRequestHandler((_wc, _permission, callback) => {
    callback(true);
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

