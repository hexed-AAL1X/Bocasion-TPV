import type { PaletteDefinition, PaletteTokens } from "./paletteTypes";

type PalettePair = { light: PaletteTokens; dark: PaletteTokens };

/** Arma un tema completo a partir de variantes claro/oscuro. */
export function createPalette(
  id: PaletteDefinition["id"],
  label: string,
  description: string,
  pair: PalettePair,
): PaletteDefinition {
  return { id, label, description, light: pair.light, dark: pair.dark };
}

/** Tokens base reutilizables — solo hay que sobreescribir lo distintivo. */
export function baseLight(overrides: Partial<PaletteTokens>): PaletteTokens {
  return {
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
    tabHoverBg: "rgba(37, 104, 168, 0.08)",
    primary: "#2568a8",
    primaryDark: "#1a5080",
    primaryLight: "#4080c0",
    primaryRgb: "37, 104, 168",
    ...overrides,
  };
}

export function baseDark(overrides: Partial<PaletteTokens>): PaletteTokens {
  return {
    colorBg: "#141414",
    colorCard: "#1e1e1e",
    colorSidebar: "#1a1a1a",
    colorText: "#ececec",
    colorTextDim: "#9a9a9a",
    colorBorder: "#3d3d3d",
    colorRibbonTabs: "#242424",
    colorEntryHeader: "#2a2a2a",
    ribbonTabTop: "#2a2a2a",
    ribbonTabBottom: "#1a1a1a",
    ribbonToolbarTop: "#262626",
    ribbonToolbarBottom: "#1c1c1c",
    colorStatusBg: "#2a2a2a",
    colorStatusBorder: "#404040",
    inputFocusBg: "#282828",
    loginBg: "#121212",
    btnSecondaryBg: "#333333",
    btnSecondaryHover: "#3d3d3d",
    scrollbar: "#4a4a4a",
    tabDivider: "rgba(255, 255, 255, 0.1)",
    tabHoverBg: "rgba(107, 168, 224, 0.1)",
    primary: "#6ba8e0",
    primaryDark: "#4a88c0",
    primaryLight: "#88c0f0",
    primaryRgb: "107, 168, 224",
    ...overrides,
  };
}
