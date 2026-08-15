import type { ExportFileKind } from "../components/PrintPropertiesDialog/exportFileConfig";
import { EXPORT_SUBFOLDERS } from "../components/PrintPropertiesDialog/exportFileConfig";

export type ExportPlatform = NodeJS.Platform | "browser";

export function detectExportPlatform(): ExportPlatform {
  return window.bocasoft?.platform ?? "browser";
}

export function isWindowsPlatform(platform: ExportPlatform = detectExportPlatform()): boolean {
  return platform === "win32";
}

export function isMacPlatform(platform: ExportPlatform = detectExportPlatform()): boolean {
  return platform === "darwin";
}

export function isLinuxPlatform(platform: ExportPlatform = detectExportPlatform()): boolean {
  return platform === "linux";
}

/** Etiqueta legible del SO para mensajes al usuario. */
export function describeExportPlatform(platform: ExportPlatform = detectExportPlatform()): string {
  if (platform === "win32") return "Windows";
  if (platform === "darwin") return "macOS";
  if (platform === "linux") return "Linux";
  return "navegador";
}

export function getPathSeparator(platform: ExportPlatform = detectExportPlatform()): string {
  return isWindowsPlatform(platform) ? "\\" : "/";
}

/** Carpeta por defecto según SO (fallback en renderer sin Electron). */
export function resolveDefaultExportFolder(
  kind: ExportFileKind,
  platform: ExportPlatform = detectExportPlatform(),
): string {
  const sub = EXPORT_SUBFOLDERS[kind];
  const sep = getPathSeparator(platform);

  if (isWindowsPlatform(platform)) {
    return `C:\\NAVASOFT\\TMP\\${sub}\\`;
  }

  return `~/Documents/BocaSoft/exports/${sub}${sep}`;
}
