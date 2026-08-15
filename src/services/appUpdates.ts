import { APP_VERSION } from "../config/brand";

export type UpdateCheckResult = {
  status: "latest" | "available" | "error";
  current: string;
  latest?: string;
  packaged?: boolean;
  canInstall?: boolean;
  htmlUrl?: string;
  downloadUrl?: string;
  fileName?: string;
  size?: number;
  notes?: string;
  message: string;
};

const DEFAULT_REPO = "hexed-AAL1X/BocaSoft";

function repoSlug(): string {
  const fromEnv = String(import.meta.env.VITE_GITHUB_UPDATES_REPO ?? "").trim();
  if (fromEnv.includes("/")) return fromEnv;
  return DEFAULT_REPO;
}

function parseVersion(value: string): number[] {
  return value
    .replace(/^v/i, "")
    .split(/[.+-]/)
    .map((part) => Number.parseInt(part, 10) || 0);
}

function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  const len = Math.max(left.length, right.length);
  for (let i = 0; i < len; i += 1) {
    const delta = (left[i] || 0) - (right[i] || 0);
    if (delta) return delta;
  }
  return 0;
}

type GithubRelease = {
  tag_name?: string;
  html_url?: string;
  body?: string;
  assets?: Array<{
    name: string;
    browser_download_url: string;
    size: number;
  }>;
};

function pickAsset(assets: GithubRelease["assets"]) {
  const list = assets ?? [];
  const platform = window.bocasoft?.platform ?? (navigator.platform.startsWith("Win") ? "win32" : "linux");
  if (platform === "win32") {
    return (
      list.find((asset) => /\.exe$/i.test(asset.name) && !/portable/i.test(asset.name)) ??
      list.find((asset) => /\.exe$/i.test(asset.name))
    );
  }
  return list.find((asset) => /\.AppImage$/i.test(asset.name));
}

async function checkViaGithubApi(): Promise<UpdateCheckResult> {
  const current = APP_VERSION;
  const slug = repoSlug();
  const url = `https://api.github.com/repos/${slug}/releases/latest`;
  const json = (await window.bocasoft?.fetchJsonUrl?.(url)) as GithubRelease | null;
  if (!json?.tag_name) {
    return {
      status: "latest",
      current,
      latest: current,
      message: `Estás en la versión ${current}. Aún no hay un release publicado en GitHub (${slug}).`,
      htmlUrl: `https://github.com/${slug}/releases`,
    };
  }
  const latest = json.tag_name.replace(/^v/i, "");
  const htmlUrl = json.html_url || `https://github.com/${slug}/releases`;
  if (compareVersions(latest, current) <= 0) {
    return {
      status: "latest",
      current,
      latest,
      htmlUrl,
      message: `Ya tienes la versión más reciente (${current}).`,
    };
  }
  const asset = pickAsset(json.assets);
  return {
    status: "available",
    current,
    latest,
    htmlUrl,
    downloadUrl: asset?.browser_download_url,
    fileName: asset?.name,
    size: asset?.size,
    canInstall: false,
    notes: (json.body ?? "").slice(0, 1200),
    message: `Hay una versión nueva: ${latest} (ahora tienes ${current}).`,
  };
}

export async function checkForProductUpdates(): Promise<UpdateCheckResult> {
  if (window.bocasoft?.checkForUpdates) {
    return window.bocasoft.checkForUpdates();
  }
  try {
    return await checkViaGithubApi();
  } catch {
    return {
      status: "error",
      current: APP_VERSION,
      message: "No se pudo consultar GitHub. Revisa la conexión.",
    };
  }
}

export async function installProductUpdate(result: UpdateCheckResult): Promise<void> {
  if (result.canInstall && result.downloadUrl && window.bocasoft?.installUpdate) {
    await window.bocasoft.installUpdate({
      downloadUrl: result.downloadUrl,
      fileName: result.fileName,
      latest: result.latest,
    });
    return;
  }
  if (result.htmlUrl) {
    await window.bocasoft?.openExternal?.(result.htmlUrl);
    return;
  }
}
