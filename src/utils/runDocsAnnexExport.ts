import type { ExportFileKind } from "../components/PrintPropertiesDialog/exportFileConfig";
import { EXPORT_FILE_CONFIG } from "../components/PrintPropertiesDialog/exportFileConfig";
import type { DocsAnnexPrintData } from "./buildDocsAnnexPrintPreview";
import { buildExportFilename } from "./exportFileHelpers";
import { requireElectronExport } from "./electronExport";
import { getDocsAnnexWordHtml, getDocsAnnexXlsContent } from "./exportDocsAnnexXls";
import { getDocsAnnexDbfContent } from "./exportSalesReportDbf";
import {
  downloadBlob,
  openBlobUrl,
  openReportPrintWindow,
} from "./salesReportDocument";

export type RunDocsAnnexExportOptions = {
  kind: ExportFileKind;
  annexData: DocsAnnexPrintData;
  reportHtml: string;
  annexPlainText: string;
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
  annexPlainText: string,
  reportHtml: string,
  annexData: DocsAnnexPrintData,
): string {
  switch (kind) {
    case "excel":
      return getDocsAnnexXlsContent(annexData);
    case "word":
      return getDocsAnnexWordHtml(annexData);
    case "txtData":
    case "txt":
      return annexPlainText;
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

export async function runDocsAnnexExport(
  options: RunDocsAnnexExportOptions,
): Promise<string | null> {
  const {
    kind,
    annexData,
    reportHtml,
    annexPlainText,
    fileName,
    saveDirectory,
    viewAfter,
    browserDirectoryHandle,
  } = options;
  const config = EXPORT_FILE_CONFIG[kind];
  const filename = buildExportFilename(fileName, config.extension);
  const api = window.bocasoft;

  if (kind === "pdf") {
    if (typeof api?.platform === "string" && !api?.exportPdfFile) {
      throw new Error("La exportación a PDF no está disponible. Reinicie la aplicación Electron.");
    }
    if (api?.exportPdfFile) {
      return api.exportPdfFile({ directory: saveDirectory, filename, html: reportHtml });
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
    const bytes = getDocsAnnexDbfContent(annexData);
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
    return api.exportWordFile({
      directory: saveDirectory,
      filename,
      html: getDocsAnnexWordHtml(annexData),
    });
  }

  const textKinds: ExportFileKind[] = ["excel", "txtData", "txt", "html"];
  if (api?.saveExportFile && textKinds.includes(kind)) {
    const content = getTextContent(kind, annexPlainText, reportHtml, annexData);
    return api.saveExportFile({ directory: saveDirectory, filename, content });
  }

  if (browserDirectoryHandle && textKinds.includes(kind)) {
    const content = getTextContent(kind, annexPlainText, reportHtml, annexData);
    const mime = getTextMime(kind);
    const fileHandle = await browserDirectoryHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(new Blob([content], { type: mime }));
    await writable.close();
    return `${browserDirectoryHandle.name}\\${filename}`;
  }

  if (kind === "dbf") {
    const bytes = getDocsAnnexDbfContent(annexData);
    const url = downloadBlob(bytes, filename, "application/octet-stream");
    if (viewAfter) openBlobUrl(url);
    return filename;
  }

  if (textKinds.includes(kind)) {
    const content = getTextContent(kind, annexPlainText, reportHtml, annexData);
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
