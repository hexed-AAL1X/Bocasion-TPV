import {
  APP_LOGO_GRAY_SRC,
  APP_LOGO_SRC,
  COMPANY_LOGO_SRC,
} from "../config/brand";
import { getEfficientMode } from "../services/performanceSettings";

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

async function waitForFonts(efficient: boolean): Promise<void> {
  if (typeof document === "undefined" || !document.fonts?.load) return;
  try {
    // En eficiente solo forzamos el peso que usa el login; 600/700 cargan al usarse.
    if (efficient) {
      await document.fonts.load('400 1em "Poppins"');
      return;
    }
    await Promise.all([
      document.fonts.load('400 1em "Poppins"'),
      document.fonts.load('600 1em "Poppins"'),
      document.fonts.load('700 1em "Poppins"'),
    ]);
    await document.fonts.ready;
  } catch {
    /* ignore */
  }
}

export async function waitForAppReady(): Promise<void> {
  const efficient = getEfficientMode();
  // En eficiente: solo logo del splash; gray/company se piden al montar pantallas.
  const images = efficient
    ? [APP_LOGO_SRC]
    : [APP_LOGO_SRC, APP_LOGO_GRAY_SRC, COMPANY_LOGO_SRC];
  const ready = Promise.all([waitForFonts(efficient), ...images.map(preloadImage)]);
  await Promise.race([
    ready,
    new Promise<void>((resolve) => {
      setTimeout(resolve, efficient ? 800 : 2000);
    }),
  ]);
}

export function markAppReady(): void {
  document.documentElement.classList.add("app-ready");
  window.bocasoft?.signalRendererReady?.();
}
