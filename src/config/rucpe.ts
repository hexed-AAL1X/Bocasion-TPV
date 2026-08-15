/** API RUC/DNI — https://consulta.rucpe.com/ (padrón SUNAT + RENIEC). */
const RUCPE_BASE = "https://consulta.rucpe.com/api/v1";

export function getRucpeApiKey(): string {
  return (import.meta.env.VITE_RUCPE_API_KEY ?? "").trim();
}

export function hasRucpeApiKey(): boolean {
  return Boolean(getRucpeApiKey());
}

export function rucpeUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${RUCPE_BASE}${normalized}`;
}

export const RUCPE_DOCS_URL = "https://consulta.rucpe.com/api";
