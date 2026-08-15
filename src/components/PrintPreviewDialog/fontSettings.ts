export type FontStyleId = "normal" | "italic" | "bold" | "boldItalic";

export type FontSettings = {
  family: string;
  style: FontStyleId;
  size: number;
  script: string;
};

export type FontStyleDef = {
  id: FontStyleId;
  label: string;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  cssFamily?: string;
};

export type FontFamilyDef = {
  id: string;
  cssFamily: string;
  styles: FontStyleDef[];
  fontStretch?: "normal" | "condensed" | "expanded";
  letterSpacing?: string;
};

export const FONT_SCRIPTS = ["OEM/DOS", "ANSI", "Símbolo"];

export const FONT_SIZE_MIN = 6;
export const FONT_SIZE_MAX = 9;
export const FONT_SIZES = [6, 7, 8, 9];

/** Rango de zoom en vista preliminar (Ampliar / Reducir fuente). */
export const PREVIEW_FONT_SIZE_MIN = 6;
export const PREVIEW_FONT_SIZE_MAX = 24;

export function clampFontSize(size: number): number {
  return Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, Math.round(size) || FONT_SIZE_MAX));
}

export function clampPreviewFontSize(size: number): number {
  return Math.max(
    PREVIEW_FONT_SIZE_MIN,
    Math.min(PREVIEW_FONT_SIZE_MAX, Math.round(size) || DEFAULT_FONT_SETTINGS.size),
  );
}

/** Catálogo ERP: cada fuente con familia CSS distinta y estilos propios. */
export const FONT_CATALOG: FontFamilyDef[] = [
  {
    id: "FoxFont",
    cssFamily: '"Geist Mono", "Courier New", monospace',
    styles: [{ id: "normal", label: "Normal", fontWeight: 400, fontStyle: "normal" }],
  },
  {
    id: "FoxPro Window Font",
    cssFamily: '"Poppins", Tahoma, "Segoe UI", sans-serif',
    styles: [
      { id: "normal", label: "Normal", fontWeight: 400, fontStyle: "normal" },
      { id: "bold", label: "Negrita", fontWeight: 700, fontStyle: "normal" },
    ],
  },
  {
    id: "Franklin Gothic",
    cssFamily: 'Arial, "Arial Narrow", "Helvetica Neue", sans-serif',
    fontStretch: "condensed",
    letterSpacing: "0.03em",
    styles: [
      { id: "normal", label: "Normal", fontWeight: 400, fontStyle: "normal" },
      { id: "italic", label: "Oblicua", fontWeight: 400, fontStyle: "italic" },
      { id: "bold", label: "Negrita", fontWeight: 700, fontStyle: "normal" },
      { id: "boldItalic", label: "Oblicua negrita", fontWeight: 700, fontStyle: "italic" },
    ],
  },
  {
    id: "Gabriola",
    cssFamily: 'Georgia, "Times New Roman", serif',
    styles: [
      { id: "normal", label: "Normal", fontWeight: 400, fontStyle: "normal" },
      { id: "italic", label: "Oblicua", fontWeight: 400, fontStyle: "italic" },
    ],
  },
  {
    id: "Gadugi",
    cssFamily: 'Tahoma, "Segoe UI", system-ui, sans-serif',
    styles: [
      { id: "normal", label: "Normal", fontWeight: 400, fontStyle: "normal" },
      { id: "bold", label: "Negrita", fontWeight: 700, fontStyle: "normal" },
    ],
  },
  {
    id: "Lucida Console",
    cssFamily: '"Lucida Console", "Courier New", monospace',
    styles: [
      { id: "normal", label: "Normal", fontWeight: 400, fontStyle: "normal" },
      { id: "bold", label: "Negrita", fontWeight: 700, fontStyle: "normal" },
    ],
  },
  {
    id: "Courier New",
    cssFamily: '"Courier New", Courier, monospace',
    styles: [
      { id: "normal", label: "Normal", fontWeight: 400, fontStyle: "normal" },
      { id: "italic", label: "Oblicua", fontWeight: 400, fontStyle: "italic" },
      { id: "bold", label: "Negrita", fontWeight: 700, fontStyle: "normal" },
      { id: "boldItalic", label: "Oblicua negrita", fontWeight: 700, fontStyle: "italic" },
    ],
  },
  {
    id: "Liberation Mono",
    cssFamily: '"Liberation Mono", "Courier New", Courier, monospace',
    styles: [
      { id: "normal", label: "Normal", fontWeight: 400, fontStyle: "normal" },
      { id: "bold", label: "Negrita", fontWeight: 700, fontStyle: "normal" },
    ],
  },
  {
    id: "Consolas",
    cssFamily: 'Consolas, "Liberation Mono", "Geist Mono", monospace',
    styles: [
      { id: "normal", label: "Normal", fontWeight: 400, fontStyle: "normal" },
      { id: "italic", label: "Oblicua", fontWeight: 400, fontStyle: "italic" },
      { id: "bold", label: "Negrita", fontWeight: 700, fontStyle: "normal" },
      { id: "boldItalic", label: "Oblicua negrita", fontWeight: 700, fontStyle: "italic" },
    ],
  },
];

export const FONT_FAMILIES = FONT_CATALOG.map((f) => f.id);

export const DEFAULT_FONT_SETTINGS: FontSettings = {
  family: "FoxFont",
  style: "normal",
  size: 9,
  script: "OEM/DOS",
};

/** Fuente monoespaciada para listados ERP (Almacenes, transportistas, etc.). */
export const LIST_PRINT_FONT_SETTINGS: FontSettings = {
  family: "Courier New",
  style: "normal",
  size: 9,
  script: "OEM/DOS",
};

/** Reporte de ventas / ticket térmico: monoespaciada densa estilo ERP. */
export const THERMAL_PRINT_FONT_SETTINGS: FontSettings = {
  family: "FoxFont",
  style: "normal",
  size: 9,
  script: "OEM/DOS",
};

export function getFamilyDef(family: string): FontFamilyDef {
  return FONT_CATALOG.find((f) => f.id === family) ?? FONT_CATALOG[0];
}

export function getStylesForFamily(family: string): FontStyleDef[] {
  return getFamilyDef(family).styles;
}

export function normalizeFontSettings(settings: FontSettings): FontSettings {
  const styles = getStylesForFamily(settings.family);
  const style = styles.some((s) => s.id === settings.style) ? settings.style : styles[0].id;
  return { ...settings, style, size: clampFontSize(settings.size) };
}

export type ResolvedPreviewFont = {
  fontFamily: string;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  fontStretch?: "normal" | "condensed" | "expanded";
  letterSpacing?: string;
};

export function resolvePreviewFont(settings: FontSettings): ResolvedPreviewFont {
  const normalized = normalizeFontSettings(settings);
  const familyDef = getFamilyDef(normalized.family);
  const styleDef =
    familyDef.styles.find((s) => s.id === normalized.style) ?? familyDef.styles[0];

  return {
    fontFamily: styleDef.cssFamily ?? familyDef.cssFamily,
    fontWeight: styleDef.fontWeight,
    fontStyle: styleDef.fontStyle,
    fontStretch: familyDef.fontStretch,
    letterSpacing: familyDef.letterSpacing,
  };
}

/** @deprecated Usar resolvePreviewFont */
export function familyToCss(family: string): string {
  return getFamilyDef(family).cssFamily;
}

/** @deprecated Usar resolvePreviewFont */
export function styleToCss(style: FontStyleId): {
  fontWeight: number;
  fontStyle: "normal" | "italic";
} {
  const { fontWeight, fontStyle } = resolvePreviewFont({ ...DEFAULT_FONT_SETTINGS, style });
  return { fontWeight, fontStyle };
}

export function fontPropertiesLabel(settings: FontSettings): string {
  const normalized = normalizeFontSettings(settings);
  const styleCode =
    normalized.style === "normal"
      ? "N"
      : normalized.style === "italic"
        ? "O"
        : normalized.style === "bold"
          ? "B"
          : "BO";
  return `${normalized.family}, ${normalized.size}, ${styleCode}, 1`;
}
