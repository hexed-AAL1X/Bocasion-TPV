import { PALETTE_CATALOG } from "./paletteCatalog";
import type { ColorPaletteId, PaletteTokens, ThemeMode } from "./paletteTypes";

export type { ColorPaletteId, ThemeMode, PaletteTokens, PaletteDefinition } from "./paletteTypes";
export { DEFAULT_COLOR_PALETTE } from "./paletteTypes";

export const PALETTE_DEFINITIONS = PALETTE_CATALOG;

export const COLOR_PALETTE_OPTIONS = Object.values(PALETTE_DEFINITIONS);

export function isColorPaletteId(value: string): value is ColorPaletteId {
  return value in PALETTE_DEFINITIONS;
}

export function getPaletteTokens(paletteId: ColorPaletteId, mode: ThemeMode): PaletteTokens {
  return PALETTE_DEFINITIONS[paletteId][mode];
}
