import { imageUrl } from "../utils/assetUrl";

/** Nombre visible de la aplicación (escritorio e informes). */
export const APP_NAME = "Intranet Ventas";
/** Título de marca en «Acerca de». */
export const PRODUCT_NAME = "Bocasión";
export const PRODUCT_TAGLINE = "Sistema de Punto de Venta";
export const COMPANY_NAME = "Bocasión S.A.C.";
export const COMPANY_NAME_REPORT = "BOCASION S.A.C.";
export const COMPANY_ADDRESS =
  "AV. INTIHUATANA NRO. 459 URB. TAMBO DE MONTERRICO DPTO. 201";
/** Líneas del encabezado en ticket térmico (evita cortes incorrectos al centrar). */
export const THERMAL_RECEIPT_HEADER_LINES = [
  "AV. INTIHUATANA NRO. 459",
  "URB. TAMBO DE MONTERRICO",
  "DPTO. 201",
] as const;
export const COPYRIGHT_YEAR_START = 2018;
/** Inyectada en build desde package.json (vite); en Electron preferir getAppVersion(). */
export const APP_VERSION = String(import.meta.env.VITE_APP_VERSION ?? "0.0.0");
export const APP_DEFAULT_DIR = "C:\\bocasoft\\intranet\\";
export const APP_PRODUCT_ID = "B7A3F2E91C04";
export const APP_WINDOW_TITLE = `${APP_NAME} — ${COMPANY_NAME}`;
export const APP_LOGO_INITIALS = "IV";

/** Icono de app — archivos en public/images/ */
export const APP_LOGO_SRC = imageUrl("apicon.png");
export const APP_LOGO_GRAY_SRC = imageUrl("apicon_gray.png");
/** Logo corporativo (marca Bocasión, p. ej. «Acerca de»). */
export const COMPANY_LOGO_SRC = imageUrl("logo.png");
/** Logo B/N recortado (sin márgenes transparentes) para tickets térmicos. */
export const THERMAL_RECEIPT_LOGO_SRC = imageUrl("logo_gray_thermal.png");
export const APP_WEBSITE = "www.bocasion.com";
export const APP_WEBSITE_URL = "https://www.bocasion.com";
