import type { PageSetupSettings } from "../components/PrintPreviewDialog/PageSetupDialog";

export const DEFAULT_PAGE_SETUP: PageSetupSettings = {
  paperSize: "carta",
  orientation: "portrait",
  margins: { left: 25, right: 25, top: 25, bottom: 25 },
  pageWidthPx: 400,
};

const STORAGE_KEY = "bocasoft-page-setup";

export function loadPageSetupSettings(): PageSetupSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PAGE_SETUP;
    const parsed = JSON.parse(raw) as Partial<PageSetupSettings>;
    return {
      ...DEFAULT_PAGE_SETUP,
      ...parsed,
      margins: { ...DEFAULT_PAGE_SETUP.margins, ...parsed.margins },
    };
  } catch {
    return DEFAULT_PAGE_SETUP;
  }
}

export function savePageSetupSettings(settings: PageSetupSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
