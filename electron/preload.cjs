const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("bocasoft", {
  platform: process.platform,
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  fetchJsonUrl: (urlOrOpts) => ipcRenderer.invoke("fetch-json-url", urlOrOpts),
  lookupIdentity: (payload) => ipcRenderer.invoke("lookup-identity", payload),
  warmupHttp: () => ipcRenderer.invoke("warmup-http"),
  listNavaDocs: (payload) => ipcRenderer.invoke("list-nava-docs", payload),
  listNavaDates: () => ipcRenderer.invoke("list-nava-dates"),
  insertNavaSale: (payload) => ipcRenderer.invoke("insert-nava-sale", payload),
  getPrinters: () => ipcRenderer.invoke("get-printers"),
  printReport: (options) => ipcRenderer.invoke("print-report", options),
  getDefaultExportDirectory: (kind) => ipcRenderer.invoke("get-default-export-directory", kind),
  resolveExportDirectory: (directory, kind) =>
    ipcRenderer.invoke("resolve-export-directory", directory, kind),
  pickExportDirectory: (defaultPath) => ipcRenderer.invoke("pick-export-directory", defaultPath),
  saveExportFile: (options) => ipcRenderer.invoke("save-export-file", options),
  saveExportBinaryFile: (options) => ipcRenderer.invoke("save-export-binary-file", options),
  exportReportImage: (options) => ipcRenderer.invoke("export-report-image", options),
  exportPdfFile: (options) => ipcRenderer.invoke("export-pdf-file", options),
  exportWordFile: (options) => ipcRenderer.invoke("export-word-file", options),
  openExportFile: (filePath) => ipcRenderer.invoke("open-export-file", filePath),
  showExportInFolder: (filePath) => ipcRenderer.invoke("show-export-in-folder", filePath),
  composeEmailWithAttachment: (options) =>
    ipcRenderer.invoke("compose-email-with-attachment", options),
  openWebEmailWithAttachment: (options) =>
    ipcRenderer.invoke("open-web-email-with-attachment", options),
  openGmailComposeWithAttachment: (options) =>
    ipcRenderer.invoke("open-gmail-compose-with-attachment", options),
  restoreAppFocus: () => ipcRenderer.invoke("restore-app-focus"),
  showAppMessage: (options) => ipcRenderer.invoke("show-app-message", options),
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  installUpdate: (payload) => ipcRenderer.invoke("install-update", payload),
  onUpdateDownloadProgress: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("update-download-progress", listener);
    return () => ipcRenderer.removeListener("update-download-progress", listener);
  },
  signalRendererReady: () => ipcRenderer.send("renderer-ready"),
});
