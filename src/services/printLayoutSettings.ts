import {
  LIST_PRINT_FONT_SETTINGS,
  THERMAL_PRINT_FONT_SETTINGS,
  normalizeFontSettings,
  type FontSettings,
} from "../components/PrintPreviewDialog/fontSettings";

export type PrintLineSpacing = "single" | "oneHalf" | "double";

export type PrintLayoutContext = "thermal" | "list" | "annex";

export type PrintLayoutSettings = {
  fontSettings: FontSettings;
  lineSpacing: PrintLineSpacing;
};

const STORAGE_PREFIX = "bocasoft-print-layout-";

function defaultForContext(context: PrintLayoutContext): PrintLayoutSettings {
  if (context === "thermal") {
    return { fontSettings: THERMAL_PRINT_FONT_SETTINGS, lineSpacing: "single" };
  }
  return { fontSettings: LIST_PRINT_FONT_SETTINGS, lineSpacing: "single" };
}

export function getPrintLayoutContext(isListPrint: boolean, isAnnex: boolean): PrintLayoutContext {
  if (isListPrint) return "list";
  if (isAnnex) return "annex";
  return "thermal";
}

export function loadPrintLayoutSettings(context: PrintLayoutContext): PrintLayoutSettings {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${context}`);
    if (!raw) return defaultForContext(context);
    const parsed = JSON.parse(raw) as Partial<PrintLayoutSettings>;
    return {
      fontSettings: normalizeFontSettings(
        parsed.fontSettings ?? defaultForContext(context).fontSettings,
      ),
      lineSpacing: parsed.lineSpacing ?? "single",
    };
  } catch {
    return defaultForContext(context);
  }
}

export function savePrintLayoutSettings(
  context: PrintLayoutContext,
  settings: PrintLayoutSettings,
): void {
  localStorage.setItem(
    `${STORAGE_PREFIX}${context}`,
    JSON.stringify({
      fontSettings: normalizeFontSettings(settings.fontSettings),
      lineSpacing: settings.lineSpacing,
    }),
  );
}
