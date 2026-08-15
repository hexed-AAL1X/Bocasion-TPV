import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("bocasoft", {
  platform: process.platform,
  openExternal: (url: string) => ipcRenderer.invoke("open-external", url),
  getPrinters: () => ipcRenderer.invoke("get-printers"),
  printReport: (options: {
    html: string;
    copies: number;
    printerName?: string;
    continuousThermal?: boolean;
    /** Ticket de ventas en hoja A4 (impresoras de oficina). */
    officePrint?: boolean;
    plainText?: string;
  }) => ipcRenderer.invoke("print-report", options),
  getDefaultExportDirectory: (kind: string) =>
    ipcRenderer.invoke("get-default-export-directory", kind),
  resolveExportDirectory: (directory: string, kind?: string) =>
    ipcRenderer.invoke("resolve-export-directory", directory, kind),
  pickExportDirectory: (defaultPath?: string) =>
    ipcRenderer.invoke("pick-export-directory", defaultPath),
  saveExportFile: (options: { directory: string; filename: string; content: string }) =>
    ipcRenderer.invoke("save-export-file", options),
  saveExportBinaryFile: (options: {
    directory: string;
    filename: string;
    contentBase64: string;
  }) => ipcRenderer.invoke("save-export-binary-file", options),
  exportReportImage: (options: {
    directory: string;
    filename: string;
    html: string;
    format: "jpeg" | "png";
  }) => ipcRenderer.invoke("export-report-image", options),
  exportPdfFile: (options: { directory: string; filename: string; html: string }) =>
    ipcRenderer.invoke("export-pdf-file", options),
  exportWordFile: (options: { directory: string; filename: string; html: string }) =>
    ipcRenderer.invoke("export-word-file", options),
  openExportFile: (filePath: string) => ipcRenderer.invoke("open-export-file", filePath),
  showExportInFolder: (filePath: string) => ipcRenderer.invoke("show-export-in-folder", filePath),
  composeEmailWithAttachment: (options: {
    subject: string;
    body: string;
    attachmentPath: string;
  }) => ipcRenderer.invoke("compose-email-with-attachment", options),
  openWebEmailWithAttachment: (options: { url: string; attachmentPath: string }) =>
    ipcRenderer.invoke("open-web-email-with-attachment", options),
  openGmailComposeWithAttachment: (options: {
    subject: string;
    body: string;
    attachmentPath: string;
  }) => ipcRenderer.invoke("open-gmail-compose-with-attachment", options),
  restoreAppFocus: () => ipcRenderer.invoke("restore-app-focus"),
  showAppMessage: (options: { title: string; message: string }) =>
    ipcRenderer.invoke("show-app-message", options),
});
