import { APP_WEBSITE_URL } from "../config/brand";

export async function openExternalUrl(url: string = APP_WEBSITE_URL): Promise<void> {
  if (window.bocasoft?.openExternal) {
    await window.bocasoft.openExternal(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
