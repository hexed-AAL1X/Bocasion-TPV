/**
 * Genera public/boot-theme.js con tokens CSS de todas las paletas.
 * Se ejecuta antes de dev/build para evitar FOUC antes del bundle React.
 */
import { writeFileSync } from "node:fs";
import { PALETTE_CATALOG } from "../src/theme/paletteCatalog";
import type { PaletteTokens } from "../src/theme/paletteTypes";

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

function tokensToCssVars(tokens: PaletteTokens): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, cssVar] of Object.entries(TOKEN_TO_CSS) as [keyof PaletteTokens, string][]) {
    out[cssVar] = tokens[key];
  }
  return out;
}

const palettes: Record<string, { light: Record<string, string>; dark: Record<string, string> }> = {};
for (const [id, def] of Object.entries(PALETTE_CATALOG)) {
  palettes[id] = {
    light: tokensToCssVars(def.light),
    dark: tokensToCssVars(def.dark),
  };
}

const output = `// Generado por scripts/gen-boot-theme.ts — no editar a mano
(function () {
  var PALETTES = ${JSON.stringify(palettes)};
  var TOKEN_KEYS = ${JSON.stringify(Object.values(TOKEN_TO_CSS))};

  function readTheme() {
    try {
      var t = localStorage.getItem("bocasoft-theme");
      if (t !== "dark" && t !== "light") {
        t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      return t;
    } catch (e) {
      return "light";
    }
  }

  function readPalette() {
    try {
      var p = localStorage.getItem("bocasoft-color-palette");
      if (p && PALETTES[p]) return p;
    } catch (e) { /* ignore */ }
    return "default";
  }

  function applyBootTheme() {
    var root = document.documentElement;
    var mode = readTheme();
    var paletteId = readPalette();
    var tokens = (PALETTES[paletteId] && PALETTES[paletteId][mode]) || PALETTES.default.light;
    for (var i = 0; i < TOKEN_KEYS.length; i++) {
      var cssVar = TOKEN_KEYS[i];
      if (tokens[cssVar]) root.style.setProperty(cssVar, tokens[cssVar]);
    }
    var loginBg = tokens["--login-bg"] || "#ececec";
    document.body && (document.body.style.backgroundColor = loginBg);
  }

  applyBootTheme();
})();
`;

writeFileSync(new URL("../public/boot-theme.js", import.meta.url), output);
console.log("public/boot-theme.js generado");
