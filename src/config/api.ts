/** Base del API de identidad (DNI/RUC). Vacío = proxy local /api en desarrollo. */
const raw = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";

export function getApiBaseUrl(): string {
  return raw.replace(/\/$/, "");
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${normalized}` : normalized;
}

export function hasRemoteApi(): boolean {
  return Boolean(getApiBaseUrl());
}
