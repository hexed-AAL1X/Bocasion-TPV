import type { PreviewRow } from "./buildThermalPrintPreview";
import {
  buildReceiptPrintHtml,
  THERMAL_LOGO_PLACEHOLDER,
} from "./buildThermalPrintPreview";
import {
  clampFontSize,
  resolvePreviewFont,
  normalizeFontSettings,
  type FontSettings,
} from "../components/PrintPreviewDialog/fontSettings";
import type { PrintLineSpacing } from "../services/printLayoutSettings";

export const PRINT_LINE_HEIGHT: Record<PrintLineSpacing, number> = {
  single: 1.2,
  oneHalf: 1.65,
  double: 2.2,
};

export function buildPrintReceiptHtml(
  rows: PreviewRow[],
  options: {
    fontSettings: FontSettings;
    lineSpacing?: PrintLineSpacing;
    maxWidthPx?: number;
    wideLayout?: boolean;
    officePrint?: boolean;
  },
): string {
  const fontSettings = normalizeFontSettings(options.fontSettings);
  const previewFont = resolvePreviewFont(fontSettings);
  const lineSpacing = options.lineSpacing ?? "single";

  return buildReceiptPrintHtml(rows, {
    fontFamily: previewFont.fontFamily,
    fontSizePt: clampFontSize(fontSettings.size),
    fontWeight: previewFont.fontWeight,
    fontStyle: previewFont.fontStyle,
    fontStretch: previewFont.fontStretch,
    letterSpacing: previewFont.letterSpacing,
    lineHeight: PRINT_LINE_HEIGHT[lineSpacing],
    wideLayout: options.wideLayout,
    logoSrc: options.wideLayout ? undefined : THERMAL_LOGO_PLACEHOLDER,
    officePrint: options.officePrint,
  });
}
