export function isElectronApp(): boolean {
  return typeof window.bocasoft?.platform === "string";
}

/** Escritorio Electron o Tauri (misma API window.bocasoft). */
export function isDesktopApp(): boolean {
  return isElectronApp();
}

export function isElectronExportReady(): boolean {
  const api = window.bocasoft;
  return (
    isElectronApp() &&
    typeof api?.resolveExportDirectory === "function" &&
    typeof api?.saveExportFile === "function"
  );
}

export function requireElectronExport(): void {
  if (isElectronExportReady()) return;
  if (isElectronApp()) {
    throw new Error(
      "La exportación a archivo no está disponible.\n\nCierre la aplicación y vuelva a ejecutar: npm run dev",
    );
  }
  throw new Error(
    "La exportación a carpeta solo funciona en la ventana de escritorio.\n\n" +
      "No use el navegador (localhost:5173). Use la ventana «Intranet Ventas» que se abre al ejecutar npm run dev.",
  );
}
