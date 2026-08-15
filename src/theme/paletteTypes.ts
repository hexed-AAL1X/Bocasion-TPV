export type ColorPaletteId =
  | "default"
  | "bocasion"
  | "slate"
  | "arena"
  | "ocean"
  | "graphite";

export type ThemeMode = "light" | "dark";

/** Tokens de superficie aplicados como variables CSS (--color-bg, etc.). */
export type PaletteTokens = {
  colorBg: string;
  colorCard: string;
  colorSidebar: string;
  colorText: string;
  colorTextDim: string;
  colorBorder: string;
  colorRibbonTabs: string;
  colorEntryHeader: string;
  ribbonTabTop: string;
  ribbonTabBottom: string;
  ribbonToolbarTop: string;
  ribbonToolbarBottom: string;
  colorStatusBg: string;
  colorStatusBorder: string;
  inputFocusBg: string;
  loginBg: string;
  btnSecondaryBg: string;
  btnSecondaryHover: string;
  scrollbar: string;
  tabDivider: string;
  tabHoverBg: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryRgb: string;
};

export type PaletteDefinition = {
  id: ColorPaletteId;
  label: string;
  description: string;
  light: PaletteTokens;
  dark: PaletteTokens;
};

export const DEFAULT_COLOR_PALETTE: ColorPaletteId = "default";
