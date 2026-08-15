import type { ExportFileKind } from "../components/PrintPropertiesDialog/exportFileConfig";
import { detectExportPlatform, getPathSeparator } from "./exportPaths";

export type ExportContext = "sales-report" | "docs-annex" | "list-print";

export function defaultExportBaseName(
  saleDate: string,
  kind?: ExportFileKind,
  context: ExportContext = "sales-report",
): string {
  const safeDate = saleDate.replace(/\//g, "-");
  if (context === "docs-annex") {
    if (kind === "dbf" || kind === "word") {
      return `Anexo_Documentos_${safeDate}`;
    }
    return `Anexo de documentos (${safeDate})`;
  }
  if (context === "list-print") {
    if (kind === "dbf" || kind === "word") {
      return safeDate.replace(/[^\w\- ]+/g, "_").replace(/\s+/g, "_");
    }
    return safeDate;
  }
  if (kind === "dbf" || kind === "word") {
    return `Cierre_de_Caja_${safeDate}`;
  }
  return `Cierre de Caja (${safeDate})`;
}

export function buildExportFilename(baseName: string, extension: string): string {
  const clean = baseName.trim() || "Cierre de Caja";
  const ext = extension.startsWith(".") ? extension : `.${extension}`;
  return clean.toLowerCase().endsWith(ext.toLowerCase()) ? clean : `${clean}${ext}`;
}

export function ensureTrailingSep(dir: string, platform = detectExportPlatform()): string {
  if (!dir) return dir;
  if (dir.endsWith("\\") || dir.endsWith("/")) return dir;
  return `${dir}${getPathSeparator(platform)}`;
}

/** Ruta visible en el diálogo de exportación: carpeta + fecha entre paréntesis. */
export function formatSaveDirectoryLabel(directory: string, saleDate: string): string {
  const dir = ensureTrailingSep(directory.trim());
  return `${dir} (${saleDate})`;
}
