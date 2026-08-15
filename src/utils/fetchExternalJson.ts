import { isDesktopApp } from "./electronExport";

const PROXY_PREFIX: Record<string, string> = {
  "https://estadisticas.bcrp.gob.pe": "/proxy-external/bcrp",
  "https://api.open-meteo.com": "/proxy-external/open-meteo",
  "https://geocoding-api.open-meteo.com": "/proxy-external/open-meteo-geo",
  "http://ip-api.com": "/proxy-external/ip-api",
  "https://ip-api.com": "/proxy-external/ip-api",
};

const CACHE_MS = 30 * 60_000;
const STORAGE_KEY = "bocasoft-external-json-cache-v2";

const memoryCache = new Map<string, { data: unknown; at: number }>();
const inflight = new Map<string, Promise<unknown | null>>();

function readStorageCache(): Record<string, { data: unknown; at: number }> {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem("bocasoft-external-json-cache");
    return raw ? (JSON.parse(raw) as Record<string, { data: unknown; at: number }>) : {};
  } catch {
    return {};
  }
}

function writeStorageCache(all: Record<string, { data: unknown; at: number }>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* quota */
  }
}

function getCached(url: string, maxAgeMs = CACHE_MS): unknown | null {
  const mem = memoryCache.get(url);
  if (mem && Date.now() - mem.at < maxAgeMs) return mem.data;

  const stored = readStorageCache()[url];
  if (stored && Date.now() - stored.at < maxAgeMs) {
    memoryCache.set(url, stored);
    return stored.data;
  }

  return null;
}

function getStaleCache(url: string): unknown | null {
  const mem = memoryCache.get(url);
  if (mem) return mem.data;
  return readStorageCache()[url]?.data ?? null;
}

function setCache(url: string, data: unknown): void {
  const entry = { data, at: Date.now() };
  memoryCache.set(url, entry);
  const all = readStorageCache();
  all[url] = entry;
  writeStorageCache(all);
}

function toDevProxyUrl(url: string): string | null {
  for (const [origin, prefix] of Object.entries(PROXY_PREFIX)) {
    if (url.startsWith(origin)) {
      return `${prefix}${url.slice(origin.length)}`;
    }
  }
  return null;
}

async function fetchExternalJsonInner<T>(url: string): Promise<T | null> {
  try {
    if (isDesktopApp() && window.bocasoft?.fetchJsonUrl) {
      const data = await window.bocasoft.fetchJsonUrl(url);
      if (data != null) {
        setCache(url, data);
        return data as T;
      }
      return getStaleCache(url) as T | null;
    }

    const proxyPath = toDevProxyUrl(url);
    if (proxyPath) {
      const res = await fetch(proxyPath);
      if (res.ok) {
        const data = (await res.json()) as T;
        setCache(url, data);
        return data;
      }
      return getStaleCache(url) as T | null;
    }
  } catch {
    /* sin acceso */
  }

  return getStaleCache(url) as T | null;
}

export async function fetchExternalJson<T = unknown>(url: string): Promise<T | null> {
  const cached = getCached(url);
  if (cached != null) return cached as T;

  const pending = inflight.get(url);
  if (pending) return (await pending) as T | null;

  const promise = fetchExternalJsonInner<T>(url);
  inflight.set(url, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(url);
  }
}
