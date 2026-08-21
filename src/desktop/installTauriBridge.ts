import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";

function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  );
}

type IdentityLookupResult =
  | { ok: true; provider?: string; result: { document: string; type: "dni" | "ruc"; name: string } }
  | { ok: false; message: string };

/**
 * Expone `window.bocasoft` en Tauri con la misma forma que Electron preload,
 * para que DNI/RUC, tipo de cambio y clima usen HTTP nativo (sin CORS).
 */
export async function installTauriDesktopBridge(): Promise<void> {
  if (!isTauriRuntime()) return;
  if (
    window.bocasoft?.fetchJsonUrl &&
    window.bocasoft?.lookupIdentity &&
    window.bocasoft?.warmupHttp &&
    window.bocasoft?.listNavaDocs
  ) {
    return;
  }

  let platform: NodeJS.Platform = "linux";
  try {
    const os = await invoke<string>("get_platform");
    if (os === "windows") platform = "win32";
    else if (os === "macos") platform = "darwin";
    else platform = "linux";
  } catch {
    /* keep linux */
  }

  window.bocasoft = {
    ...(window.bocasoft ?? {}),
    platform,
    openExternal: async (url: string) => {
      await openUrl(url);
    },
    fetchJsonUrl: async (urlOrOpts) => {
      const data = await invoke<unknown>("fetch_json_url", { urlOrOpts });
      return data ?? null;
    },
    lookupIdentity: async (payload) => {
      return invoke<IdentityLookupResult>("lookup_identity", { payload });
    },
    warmupHttp: async () => {
      try {
        await invoke<boolean>("warmup_http");
      } catch {
        /* ignore */
      }
    },
    listNavaDocs: async (payload) => {
      return invoke("list_nava_docs", { payload });
    },
    listNavaDates: async (payload) => {
      return invoke("list_nava_dates", { payload });
    },
    insertNavaSale: async (payload) => {
      return invoke("insert_nava_sale", { payload });
    },
    signalRendererReady: () => {
      /* no-op en Tauri */
    },
  };
}
