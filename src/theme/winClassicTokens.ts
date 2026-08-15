import type { ColorPaletteId, PaletteTokens, ThemeMode } from "./paletteTypes";

type RGB = { r: number; g: number; b: number };

function clamp(n: number, min = 0, max = 255): number {
  return Math.min(max, Math.max(min, Math.round(n)));
}

function parseColor(input: string): RGB | null {
  const value = input.trim();
  if (value.startsWith("#")) {
    const hex = value.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
  }

  const rgba = value.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (rgba) {
    return { r: +rgba[1], g: +rgba[2], b: +rgba[3] };
  }

  return null;
}

function toHex({ r, g, b }: RGB): string {
  return `#${[r, g, b].map((channel) => clamp(channel).toString(16).padStart(2, "0")).join("")}`;
}

function mix(a: string, b: string, t: number): string {
  const ca = parseColor(a);
  const cb = parseColor(b);
  if (!ca || !cb) return a;
  return toHex({
    r: ca.r + (cb.r - ca.r) * t,
    g: ca.g + (cb.g - ca.g) * t,
    b: ca.b + (cb.b - ca.b) * t,
  });
}

function lighten(hex: string, amount: number): string {
  return mix(hex, "#ffffff", amount);
}

function darken(hex: string, amount: number): string {
  return mix(hex, "#000000", amount);
}

function relativeLuminance({ r, g, b }: RGB): number {
  const channels = [r, g, b].map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** Texto legible sobre el fondo de ítem seleccionado (claro u oscuro según luminancia). */
function selectionTextColor(bg: string, tokens: PaletteTokens): string {
  const rgb = parseColor(bg);
  if (!rgb) return "#ffffff";
  return relativeLuminance(rgb) > 0.52 ? tokens.colorBg : "#ffffff";
}

/** Cabecera metálica XP usando los tonos del ribbon del tema activo. */
function shadeGradient(tokens: PaletteTokens): string {
  const top = lighten(tokens.ribbonTabTop, 0.05);
  const mid = tokens.ribbonTabBottom;
  const bottom = darken(tokens.ribbonTabBottom, 0.09);
  return `linear-gradient(180deg, ${top} 0%, ${mid} 52%, ${bottom} 100%)`;
}

/** Barra de título XP con el acento primario del tema. */
function titleGradient(tokens: PaletteTokens, mode: ThemeMode): string {
  if (mode === "dark") {
    return `linear-gradient(180deg, ${darken(tokens.primaryDark, 0.2)} 0%, ${tokens.primaryDark} 45%, ${tokens.primary} 100%)`;
  }
  return `linear-gradient(180deg, ${darken(tokens.primaryDark, 0.1)} 0%, ${tokens.primary} 45%, ${lighten(tokens.primaryLight, 0.04)} 100%)`;
}

function dialogBtnGradient(tokens: PaletteTokens, mode: ThemeMode, primary = false): string {
  if (primary) {
    if (mode === "dark") {
      return `linear-gradient(180deg, ${lighten(tokens.primaryLight, 0.05)} 0%, ${tokens.primary} 46%, ${darken(tokens.primaryDark, 0.06)} 50%, ${tokens.primary} 100%)`;
    }
    return `linear-gradient(180deg, ${lighten(tokens.primaryLight, 0.22)} 0%, ${tokens.primary} 46%, ${tokens.primaryDark} 50%, ${tokens.primary} 100%)`;
  }

  if (mode === "dark") {
    return `linear-gradient(180deg, ${lighten(tokens.colorCard, 0.06)} 0%, ${tokens.colorEntryHeader} 46%, ${darken(tokens.colorBorder, 0.05)} 50%, ${tokens.colorCard} 100%)`;
  }

  return `linear-gradient(180deg, ${lighten(tokens.colorCard, 0.35)} 0%, ${tokens.btnSecondaryBg} 42%, ${tokens.btnSecondaryHover} 50%, ${tokens.colorBorder} 52%, ${lighten(tokens.colorCard, 0.15)} 100%)`;
}

function toolbarBtnGradient(tokens: PaletteTokens, mode: ThemeMode): string {
  if (mode === "dark") {
    return `linear-gradient(180deg, ${lighten(tokens.colorCard, 0.04)} 0%, ${tokens.colorEntryHeader} 100%)`;
  }
  return `linear-gradient(180deg, ${lighten(tokens.colorCard, 0.4)} 0%, ${tokens.btnSecondaryBg} 100%)`;
}

function selectCaretUrl(color: string): string {
  const rgb = parseColor(color);
  const hex = rgb ? toHex(rgb).slice(1) : "666666";
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='4' viewBox='0 0 6 4'%3E%3Cpath fill='%23${hex}' d='M0 0h6L3 4z'/%3E%3C/svg%3E")`;
}

function dialogSurface(tokens: PaletteTokens, paletteId: ColorPaletteId, mode: ThemeMode): string {
  if (paletteId === "default" && mode === "light") {
    return mix(tokens.colorBg, "#ece9d8", 0.1);
  }
  return tokens.colorBg;
}

/**
 * Variables --win-* derivadas de la paleta activa.
 * Conserva la estructura XP (gradientes, relieves) sin mezclar colores ajenos al tema.
 */
export function buildWinClassicTokens(
  tokens: PaletteTokens,
  mode: ThemeMode,
  paletteId: ColorPaletteId = "default",
): Record<string, string> {
  const surface = dialogSurface(tokens, paletteId, mode);
  const panelBg = tokens.inputFocusBg;
  const borderDark = darken(tokens.colorBorder, mode === "dark" ? 0.06 : 0.14);
  const tableHover =
    mode === "dark"
      ? mix(tokens.colorCard, tokens.primary, 0.26)
      : mix(tokens.colorCard, tokens.primary, 0.11);
  const listSelectedBg = tokens.primaryDark;
  const listSelectedText = selectionTextColor(listSelectedBg, tokens);
  const listSelectedOutline =
    mode === "dark" ? lighten(tokens.primary, 0.12) : lighten(tokens.primaryLight, 0.08);
  const tableOdd = mix(tokens.colorEntryHeader, tokens.colorCard, 0.35);
  const shadowInset =
    mode === "dark" ? "rgba(255, 255, 255, 0.05)" : lighten(surface, 0.28);

  return {
    "--win-surface": surface,
    "--win-border": tokens.colorBorder,
    "--win-border-dark": borderDark,
    "--win-group-bg": tokens.colorEntryHeader,
    "--win-panel-bg": panelBg,
    "--win-shade-bg": shadeGradient(tokens),
    "--win-title-bg": titleGradient(tokens, mode),
    "--win-title-border": `1px solid ${darken(tokens.primaryDark, mode === "dark" ? 0.1 : 0.18)}`,
    "--win-shadow":
      mode === "dark"
        ? `0 0 0 1px ${shadowInset} inset, 0 8px 24px rgba(0, 0, 0, 0.55)`
        : `0 0 0 1px ${shadowInset} inset, 0 8px 24px rgba(0, 0, 0, 0.28)`,
    "--win-input-border": tokens.colorBorder,
    "--win-btn-bg": toolbarBtnGradient(tokens, mode),
    "--win-text": tokens.colorText,
    "--win-text-dim": tokens.colorTextDim,
    "--win-text-muted": mix(tokens.colorTextDim, tokens.colorText, 0.25),
    "--win-table-border": tokens.colorBorder,
    "--win-table-border-soft": mix(tokens.colorBorder, tokens.colorCard, 0.35),
    "--win-table-row-even": panelBg,
    "--win-table-row-odd": tableOdd,
    "--win-table-row-hover": tableHover,
    "--win-table-total-bg": tokens.colorEntryHeader,
    "--win-table-subheader-bg": mix(tokens.colorEntryHeader, tokens.colorCard, 0.4),
    "--win-table-totals-row-bg": tokens.colorRibbonTabs,
    "--win-table-highlight": mix(tokens.colorEntryHeader, tokens.primary, mode === "dark" ? 0.22 : 0.1),
    "--win-table-highlight-soft": mix(tokens.colorCard, tokens.primary, mode === "dark" ? 0.16 : 0.07),
    "--win-link": tokens.primaryDark,
    "--win-link-hover": tokens.primary,
    "--win-status-open": mode === "dark" ? "#f07060" : "#c00000",
    "--win-status-closed": tokens.primaryDark,
    "--win-toolbar-btn-border": tokens.colorBorder,
    "--win-separator": borderDark,
    "--win-picker-bg": panelBg,
    "--win-picker-border": tokens.colorBorder,
    "--win-picker-body-bg": tokens.colorCard,
    "--win-picker-footer-bg": tokens.colorEntryHeader,
    "--win-picker-list-head-bg": tokens.colorEntryHeader,
    "--win-picker-list-head-text": tokens.colorTextDim,
    "--win-picker-hover": tableHover,
    "--win-picker-active": mode === "dark" ? mix(tokens.colorCard, "#c42b1c", 0.35) : mix(panelBg, "#fde8e6", 0.55),
    "--win-list-selected-bg": listSelectedBg,
    "--win-list-selected-text": listSelectedText,
    "--win-list-selected-outline": listSelectedOutline,
    "--win-picker-active-border": "#c42b1c",
    "--win-hint-bg": mix(tokens.colorEntryHeader, tokens.primary, mode === "dark" ? 0.08 : 0.05),
    "--win-hint-border": tokens.colorBorder,
    "--win-hint-text": tokens.colorText,
    "--win-menu-bar-bg": tokens.colorRibbonTabs,
    "--win-preview-bg": mode === "dark" ? darken(tokens.colorBg, 0.15) : "#808080",
    "--win-preview-paper": panelBg,
    "--win-receipt-text": tokens.colorText,
    "--win-receipt-highlight": tokens.primaryDark,
    "--win-field-bg": panelBg,
    "--win-focus-outline": tokens.colorText,
    "--win-dialog-btn-border": borderDark,
    "--win-dialog-btn-border-hover": tokens.colorBorder,
    "--win-dialog-btn-bg": dialogBtnGradient(tokens, mode),
    "--win-dialog-btn-bg-hover":
      mode === "dark"
        ? `linear-gradient(180deg, ${lighten(tokens.colorCard, 0.1)} 0%, ${lighten(tokens.colorEntryHeader, 0.04)} 46%, ${tokens.colorEntryHeader} 50%, ${lighten(tokens.colorCard, 0.06)} 100%)`
        : `linear-gradient(180deg, ${lighten(tokens.colorCard, 0.45)} 0%, ${lighten(tokens.btnSecondaryBg, 0.08)} 42%, ${tokens.btnSecondaryBg} 50%, ${lighten(tokens.colorCard, 0.2)} 100%)`,
    "--win-dialog-btn-bg-active":
      mode === "dark"
        ? `linear-gradient(180deg, ${darken(tokens.colorBorder, 0.08)} 0%, ${tokens.colorEntryHeader} 100%)`
        : `linear-gradient(180deg, ${tokens.colorBorder} 0%, ${tokens.colorEntryHeader} 100%)`,
    "--win-dialog-btn-primary-border": tokens.primaryDark,
    "--win-dialog-btn-primary-border-hover": tokens.primary,
    "--win-dialog-btn-primary-bg": dialogBtnGradient(tokens, mode, true),
    "--win-dialog-btn-primary-bg-hover": dialogBtnGradient(tokens, mode, true),
    "--win-dialog-btn-primary-bg-active": `linear-gradient(180deg, ${darken(tokens.primaryDark, 0.1)} 0%, ${tokens.primaryDark} 100%)`,
    "--win-dialog-btn-primary-text": mode === "dark" && paletteId === "graphite" ? tokens.colorBg : "#fff",
    "--win-select-caret": selectCaretUrl(tokens.colorTextDim),
    "--win-picker-caret-color": tokens.colorTextDim,
  };
}

export const WIN_CLASSIC_TOKEN_KEYS = Object.keys(
  buildWinClassicTokens(
    {
      colorBg: "#e0e0e0",
      colorCard: "#f2f2f2",
      colorSidebar: "#e8e8e8",
      colorText: "#1a1a1a",
      colorTextDim: "#4a4a4a",
      colorBorder: "#b0b0b0",
      colorRibbonTabs: "#d4d4d4",
      colorEntryHeader: "#e6e6e6",
      ribbonTabTop: "#e8e8e8",
      ribbonTabBottom: "#d0d0d0",
      ribbonToolbarTop: "#f0f0f0",
      ribbonToolbarBottom: "#dcdcdc",
      colorStatusBg: "#d4d4d4",
      colorStatusBorder: "#a8a8a8",
      inputFocusBg: "#fafafa",
      loginBg: "#ececec",
      btnSecondaryBg: "#e4e4e4",
      btnSecondaryHover: "#d4d4d4",
      scrollbar: "#c0c0c0",
      tabDivider: "rgba(0, 0, 0, 0.1)",
      tabHoverBg: "rgba(0, 0, 0, 0.05)",
      primary: "#2568a8",
      primaryDark: "#1a5080",
      primaryLight: "#4080c0",
      primaryRgb: "37, 104, 168",
    },
    "light",
    "default",
  ),
) as string[];
