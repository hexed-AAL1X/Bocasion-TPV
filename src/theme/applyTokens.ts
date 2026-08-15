import {
  DEFAULT_COLOR_PALETTE,
  getPaletteTokens,
  isColorPaletteId,
  type ColorPaletteId,
  type PaletteTokens,
  type ThemeMode,
} from "./definitions";
import { buildWinClassicTokens } from "./winClassicTokens";

const TOKEN_TO_CSS: Record<keyof PaletteTokens, string> = {
  colorBg: "--color-bg",
  colorCard: "--color-card",
  colorSidebar: "--color-sidebar",
  colorText: "--color-text",
  colorTextDim: "--color-text-dim",
  colorBorder: "--color-border",
  colorRibbonTabs: "--color-ribbon-tabs",
  colorEntryHeader: "--color-entry-header",
  ribbonTabTop: "--ribbon-tab-top",
  ribbonTabBottom: "--ribbon-tab-bottom",
  ribbonToolbarTop: "--ribbon-toolbar-top",
  ribbonToolbarBottom: "--ribbon-toolbar-bottom",
  colorStatusBg: "--color-status-bg",
  colorStatusBorder: "--color-status-border",
  inputFocusBg: "--input-focus-bg",
  loginBg: "--login-bg",
  btnSecondaryBg: "--btn-secondary-bg",
  btnSecondaryHover: "--btn-secondary-hover",
  scrollbar: "--scrollbar",
  tabDivider: "--tab-divider",
  tabHoverBg: "--tab-hover-bg",
  primary: "--primary",
  primaryDark: "--primary-dark",
  primaryLight: "--primary-light",
  primaryRgb: "--primary-rgb",
};

export const PALETTE_TRANSITION_MS = 480;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  if (document.documentElement.classList.contains("efficient-mode")) return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type ApplyPaletteOptions = {
  animate?: boolean;
};

export function applyPaletteTokens(
  paletteId: ColorPaletteId,
  mode: ThemeMode,
  options?: ApplyPaletteOptions,
): void {
  const tokens = getPaletteTokens(paletteId, mode);
  const root = document.documentElement;
  const shouldAnimate = options?.animate === true && !prefersReducedMotion();

  if (shouldAnimate) {
    root.classList.add("palette-transitioning");
  }

  root.setAttribute("data-palette", paletteId);

  for (const [key, cssVar] of Object.entries(TOKEN_TO_CSS) as [keyof PaletteTokens, string][]) {
    root.style.setProperty(cssVar, tokens[key]);
  }

  for (const [cssVar, value] of Object.entries(buildWinClassicTokens(tokens, mode, paletteId))) {
    root.style.setProperty(cssVar, value);
  }

  if (shouldAnimate) {
    window.setTimeout(() => {
      root.classList.remove("palette-transitioning");
    }, PALETTE_TRANSITION_MS);
  }
}

const STORAGE_KEY = "bocasoft-color-palette";

export function getStoredColorPalette(): ColorPaletteId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isColorPaletteId(stored)) return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_COLOR_PALETTE;
}

export function storeColorPalette(paletteId: ColorPaletteId): void {
  try {
    localStorage.setItem(STORAGE_KEY, paletteId);
  } catch {
    /* ignore */
  }
}

export function initPaletteTheme(mode: ThemeMode): ColorPaletteId {
  const paletteId = getStoredColorPalette();
  applyPaletteTokens(paletteId, mode);
  return paletteId;
}

/** Convierte tokens a estilo inline para vistas previas. */
export function tokensToPreviewStyle(tokens: PaletteTokens): Record<string, string> {
  const style: Record<string, string> = {};
  for (const [key, cssVar] of Object.entries(TOKEN_TO_CSS) as [keyof PaletteTokens, string][]) {
    style[cssVar] = tokens[key];
  }
  return style;
}
