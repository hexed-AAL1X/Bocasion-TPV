import type { ExportFileKind } from "../components/PrintPropertiesDialog/exportFileConfig";
import { EXPORT_FILE_CONFIG } from "../components/PrintPropertiesDialog/exportFileConfig";
import type { SalesReportExportData } from "./exportSalesReportXls";
import { getSalesReportXlsContent } from "./exportSalesReportXls";
import { buildExportFilename } from "./exportFileHelpers";
import { requireElectronExport } from "./electronExport";
import { buildSalesReportDataTxt } from "./exportSalesReportDataTxt";
import { getSalesReportDbfContent } from "./exportSalesReportDbf";
import { getSalesReportWordHtml } from "./exportSalesReportWord";
import {
  buildSalesReportTxt,
  downloadBlob,
  openBlobUrl,
  openReportPrintWindow,
} from "./salesReportDocument";

export type RunSalesReportExportOptions = {
  kind: ExportFileKind;
  reportData: SalesReportExportData;
  reportHtml: string;
  fileName: string;
  saveDirectory: string;
  viewAfter: boolean;
  browserDirectoryHandle?: FileSystemDirectoryHandle | null;
};

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function getTextContent(
  kind: ExportFileKind,
  reportData: SalesReportExportData,
  reportHtml: string,
): string {
  switch (kind) {
    case "excel":
      return getSalesReportXlsContent(reportData);
    case "word":
      return getSalesReportWordHtml(reportData);
    case "txtData":
      return buildSalesReportDataTxt(reportData);
    case "txt":
      return buildSalesReportTxt(reportData);
    case "html":
      return reportHtml;
    default:
      return "";
  }
}

function getTextMime(kind: ExportFileKind): string {
  switch (kind) {
    case "excel":
      return "application/vnd.ms-excel;charset=utf-8";
    case "word":
      return "application/msword";
    case "txtData":
    case "txt":
      return "text/plain;charset=utf-8";
    case "html":
      return "text/html;charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

async function saveViaBrowserHandle(
  handle: FileSystemDirectoryHandle,
  filename: string,
  content: string | Uint8Array,
  mime: string,
): Promise<string> {
  const fileHandle = await handle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  const blob =
    typeof content === "string"
      ? new Blob([content], { type: mime })
      : new Blob([Uint8Array.from(content)], { type: mime });
  await writable.write(blob);
  await writable.close();
  return `${handle.name}\\${filename}`;
}

async function openBrowserSavedFile(
  handle: FileSystemDirectoryHandle,
  filename: string,
  mime: string,
): Promise<void> {
  const fileHandle = await handle.getFileHandle(filename);
  const file = await fileHandle.getFile();
  const url = URL.createObjectURL(new Blob([await file.arrayBuffer()], { type: mime }));
  openBlobUrl(url);
}

export async function runSalesReportExport(
  options: RunSalesReportExportOptions,
): Promise<string | null> {
  const { kind, reportData, reportHtml, fileName, saveDirectory, viewAfter, browserDirectoryHandle } =
    options;
  const config = EXPORT_FILE_CONFIG[kind];
  const filename = buildExportFilename(fileName, config.extension);
  const api = window.bocasoft;

  if (kind === "pdf") {
    if (typeof api?.platform === "string" && !api?.exportPdfFile) {
      throw new Error("La exportación a PDF no está disponible. Reinicie la aplicación Electron.");
    }
    if (api?.exportPdfFile) {
      try {
        return await api.exportPdfFile({
          directory: saveDirectory,
          filename,
          html: reportHtml,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al generar PDF";
        throw new Error(message);
      }
    }
    const win = openReportPrintWindow(reportHtml, { preview: viewAfter, autoPrint: !viewAfter });
    if (!win) throw new Error("No se pudo abrir el diálogo de PDF");
    return null;
  }

  requireElectronExport();

  if ((kind === "jpg" || kind === "png") && api?.exportReportImage) {
    return api.exportReportImage({
      directory: saveDirectory,
      filename,
      html: reportHtml,
      format: kind === "jpg" ? "jpeg" : "png",
    });
  }

  if (kind === "dbf" && api?.saveExportBinaryFile) {
    const bytes = getSalesReportDbfContent(reportData);
    return api.saveExportBinaryFile({
      directory: saveDirectory,
      filename,
      contentBase64: uint8ArrayToBase64(bytes),
    });
  }

  if (kind === "word") {
    if (!api?.exportWordFile) {
      throw new Error("La exportación a Word no está disponible. Reinicie la aplicación Electron.");
    }
    const html = getSalesReportWordHtml(reportData);
    return api.exportWordFile({
      directory: saveDirectory,
      filename,
      html,
    });
  }

  const textKinds: ExportFileKind[] = ["excel", "txtData", "txt", "html"];
  if (api?.saveExportFile && textKinds.includes(kind)) {
    const content = getTextContent(kind, reportData, reportHtml);
    return api.saveExportFile({
      directory: saveDirectory,
      filename,
      content,
    });
  }

  if (browserDirectoryHandle) {
    const mime = getTextMime(kind);
    if (kind === "dbf") {
      const bytes = getSalesReportDbfContent(reportData);
      const label = await saveViaBrowserHandle(browserDirectoryHandle, filename, bytes, mime);
      if (viewAfter) await openBrowserSavedFile(browserDirectoryHandle, filename, mime);
      return label;
    }
    if (textKinds.includes(kind)) {
      const content = getTextContent(kind, reportData, reportHtml);
      const label = await saveViaBrowserHandle(browserDirectoryHandle, filename, content, mime);
      if (viewAfter) await openBrowserSavedFile(browserDirectoryHandle, filename, mime);
      return label;
    }
  }

  if (kind === "dbf") {
    const bytes = getSalesReportDbfContent(reportData);
    const url = downloadBlob(bytes, filename, "application/octet-stream");
    if (viewAfter) openBlobUrl(url);
    return filename;
  }

  if (textKinds.includes(kind)) {
    const content = getTextContent(kind, reportData, reportHtml);
    const mime = getTextMime(kind);
    const url = downloadBlob(content, filename, mime);
    if (viewAfter) openBlobUrl(url);
    return filename;
  }

  if (kind === "jpg" || kind === "png") {
    throw new Error(
      "La exportación a imagen no está disponible. Reinicie la aplicación Electron.",
    );
  }

  throw new Error(`Formato de exportación no soportado: ${kind}`);
}
