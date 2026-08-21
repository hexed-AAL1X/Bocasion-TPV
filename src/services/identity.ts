import { apiUrl } from "../config/api";
import { getRucpeApiKey, hasRucpeApiKey, rucpeUrl } from "../config/rucpe";
import { getClientByDocument } from "../data/clients";

export type IdentityResult = {
  document: string;
  type: "dni" | "ruc";
  name: string;
};

type JsonRecord = Record<string, unknown>;

const identityCache = new Map<string, IdentityResult>();
const identityInflight = new Map<string, Promise<IdentityResult>>();
const IDENTITY_CACHE_KEY = "bocasoft-identity-cache-v2";
const IDENTITY_CACHE_TTL_MS = 7 * 24 * 60 * 60_000;
const IDENTITY_CACHE_MAX = 300;

type StoredIdentity = IdentityResult & { at: number };

function loadIdentityCacheFromStorage(): void {
  if (identityCache.size > 0) return;
  try {
    const raw =
      localStorage.getItem(IDENTITY_CACHE_KEY) ?? sessionStorage.getItem("bocasoft-identity-cache-v1");
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, StoredIdentity | IdentityResult>;
    const now = Date.now();
    for (const [key, value] of Object.entries(parsed)) {
      if (!value?.document || !value?.name || !value?.type) continue;
      const at = "at" in value && typeof value.at === "number" ? value.at : now;
      if (now - at > IDENTITY_CACHE_TTL_MS) continue;
      identityCache.set(key, {
        document: value.document,
        type: value.type,
        name: value.name,
      });
    }
  } catch {
    /* ignore */
  }
}

function persistIdentityCache(key: string, value: IdentityResult): void {
  identityCache.set(key, value);
  try {
    const payload: Record<string, StoredIdentity> = {};
    const now = Date.now();
    // Mantener entradas recientes; limitar tamaño.
    const entries = [...identityCache.entries()].slice(-IDENTITY_CACHE_MAX);
    for (const [k, v] of entries) {
      payload[k] = { ...v, at: now };
    }
    localStorage.setItem(IDENTITY_CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

function pickName(data: JsonRecord): string {
  const candidates = [
    data.full_name,
    data.nombre_completo,
    data.nombreCompleto,
    data.razon_social,
    data.razonSocial,
    data.nombre,
    data.nombre_o_razon_social,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  const apPat = data.apellido_paterno ?? data.apellidoPaterno ?? data.first_last_name;
  const apMat = data.apellido_materno ?? data.apellidoMaterno ?? data.second_last_name;
  const nombres = data.nombres ?? data.first_name;

  if (typeof apPat === "string" || typeof apMat === "string" || typeof nombres === "string") {
    return [apPat, apMat, nombres]
      .filter((v) => typeof v === "string" && v.trim())
      .join(" ")
      .trim();
  }

  return "";
}

function parseLegacyResponse(
  json: unknown,
  document: string,
  type: "dni" | "ruc",
): IdentityResult {
  const root = json as JsonRecord;
  const data = (root.data ?? root.result ?? root) as JsonRecord;

  const name = pickName(data);
  if (!name) {
    const msg =
      typeof root.message === "string"
        ? root.message
        : typeof root.error === "string"
          ? root.error
          : typeof root.detail === "string"
            ? root.detail
            : "No se encontró nombre en la respuesta del servidor";
    throw new Error(friendlyApiMessage(msg));
  }

  const docFromApi =
    typeof data.dni === "string"
      ? data.dni.replace(/\D/g, "")
      : typeof data.ruc === "string"
        ? data.ruc.replace(/\D/g, "")
        : typeof data.document_number === "string"
          ? data.document_number.replace(/\D/g, "")
          : document;

  return { document: docFromApi || document, type, name };
}

function parseRucpeJsonResponse(json: unknown, document: string): IdentityResult {
  const data = json as JsonRecord;
  const name = pickName(data);
  if (!name) {
    throw new Error("No se encontró la razón social para ese RUC");
  }
  const docFromApi = String(data.ruc ?? document).replace(/\D/g, "");
  return { document: docFromApi || document, type: "ruc", name };
}

/** Extrae razón social del HTML público `/buscar` de consulta.rucpe.com. */
export function parseRucpeBuscarHtml(html: string, ruc: string): string | null {
  const hrefIdx = html.indexOf(`/ruc/${ruc}`);
  if (hrefIdx < 0) return null;
  const slice = html.slice(hrefIdx, hrefIdx + 1200);
  const match = slice.match(
    new RegExp(`${ruc}\\s*<\\/span>\\s*<span[^>]*>([^<]+)<\\/span>`, "i"),
  );
  const name = match?.[1]?.trim();
  return name || null;
}

/** DNI = 8 dígitos · RUC = 11 dígitos (Perú). */
export function normalizeDocument(raw: string): { type: "dni" | "ruc"; value: string } | null {
  const digits = raw.replace(/\D/g, "");
  if (/^\d{8}$/.test(digits)) return { type: "dni", value: digits };
  if (/^\d{11}$/.test(digits)) return { type: "ruc", value: digits };
  return null;
}

export function formatDocumentLabel(type: "dni" | "ruc", value: string): string {
  return type === "dni" ? `DNI ${value}` : `RUC ${value}`;
}

export function formatClienteLabel(
  nombre: string,
  type: "dni" | "ruc",
  value: string,
): string {
  return `${nombre.trim()} (${formatDocumentLabel(type, value)})`;
}

function friendlyApiMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("not authenticated") || lower.includes("api key")) {
    return "Falta o es inválida la clave API de consulta.rucpe.com.";
  }
  if (message === "Ocurrió un Error" || lower.includes("ocurrió un error")) {
    return "No se obtuvieron datos del documento. Verifica el número o intenta de nuevo.";
  }
  if (lower.includes("api primaria") || lower.includes("fallback sin") || lower.includes("sin datos")) {
    return "No se pudo consultar el documento. Intente de nuevo.";
  }
  if (lower.includes("not found") || lower.includes("no encontr")) {
    return "Documento no encontrado en el padrón.";
  }
  return message;
}

/** DNI: proxy remoto/local (eldni.com), como antes. */
async function fetchDniFromLegacy(value: string): Promise<IdentityResult> {
  if (typeof window !== "undefined" && window.bocasoft?.lookupIdentity) {
    const native = await window.bocasoft.lookupIdentity({ type: "dni", value });
    if (!native.ok) {
      throw new Error(friendlyApiMessage(native.message));
    }
    return native.result;
  }

  const absolute = apiUrl(`/api/dni/${value}`);
  if (
    typeof window !== "undefined" &&
    window.bocasoft?.fetchJsonUrl &&
    /^https?:\/\//i.test(absolute)
  ) {
    const json = await window.bocasoft.fetchJsonUrl(absolute);
    if (json == null) {
      throw new Error("No se pudo consultar el servicio de DNI");
    }
    const root = json as JsonRecord;
    if (root.success === false) {
      const raw =
        typeof root.message === "string" ? root.message : "Error al consultar DNI";
      throw new Error(friendlyApiMessage(raw));
    }
    return parseLegacyResponse(json, value, "dni");
  }

  const res = await fetch(absolute);

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error("Respuesta inválida del servidor");
  }

  const root = json as JsonRecord;
  if (!res.ok || root.success === false) {
    const raw =
      typeof root.message === "string"
        ? root.message
        : `Error al consultar DNI (${res.status})`;
    throw new Error(friendlyApiMessage(raw));
  }

  return parseLegacyResponse(json, value, "dni");
}

/** RUC vía API JSON (si hay clave). */
async function fetchRucFromRucpeApi(value: string): Promise<IdentityResult> {
  const key = getRucpeApiKey();
  const absoluteUrl = rucpeUrl(`/ruc/${value}`);
  const headers = {
    Accept: "application/json",
    "X-API-Key": key,
  };

  if (typeof window !== "undefined" && window.bocasoft?.fetchJsonUrl) {
    const json = await window.bocasoft.fetchJsonUrl({ url: absoluteUrl, headers });
    if (json == null) {
      throw new Error("No se pudo consultar consulta.rucpe.com");
    }
    const errWrap = json as JsonRecord;
    if (errWrap.__httpError === true) {
      const body = (errWrap.body ?? {}) as JsonRecord;
      const raw =
        typeof body.detail === "string"
          ? body.detail
          : typeof body.message === "string"
            ? body.message
            : `Error al consultar RUC (${String(errWrap.status ?? "")})`;
      throw new Error(friendlyApiMessage(raw));
    }
    return parseRucpeJsonResponse(json, value);
  }

  const proxyPath = `/proxy-external/rucpe/api/v1/ruc/${value}`;
  const res = await fetch(proxyPath, { headers });
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error("Respuesta inválida de consulta.rucpe.com");
  }
  if (!res.ok) {
    const root = (json ?? {}) as JsonRecord;
    const raw =
      typeof root.detail === "string"
        ? root.detail
        : typeof root.message === "string"
          ? root.message
          : `Error al consultar RUC (${res.status})`;
    throw new Error(friendlyApiMessage(raw));
  }
  return parseRucpeJsonResponse(json, value);
}

/** RUC vía buscador público HTML (sin API key) — igual que en la web. */
async function fetchRucFromRucpePublic(value: string): Promise<IdentityResult> {
  if (typeof window !== "undefined" && window.bocasoft?.lookupIdentity) {
    const native = await window.bocasoft.lookupIdentity({ type: "ruc", value });
    if (!native.ok) {
      throw new Error(friendlyApiMessage(native.message));
    }
    return native.result;
  }

  const proxyPath = `/proxy-external/rucpe/buscar?q=${encodeURIComponent(value)}`;
  const res = await fetch(proxyPath, {
    headers: { Accept: "text/html", "HX-Request": "true" },
  });
  if (!res.ok) {
    throw new Error(`Error al consultar RUC (${res.status})`);
  }
  const html = await res.text();
  const name = parseRucpeBuscarHtml(html, value);
  if (!name) {
    throw new Error("RUC no encontrado en consulta.rucpe.com");
  }
  return { document: value, type: "ruc", name };
}

async function fetchRuc(value: string): Promise<IdentityResult> {
  if (hasRucpeApiKey()) {
    try {
      return await fetchRucFromRucpeApi(value);
    } catch {
      // Si la clave falla, caer al buscador público.
    }
  }
  return fetchRucFromRucpePublic(value);
}

export async function fetchIdentity(documentRaw: string): Promise<IdentityResult> {
  const parsed = normalizeDocument(documentRaw);
  if (!parsed) {
    throw new Error("Ingrese un DNI (8 dígitos) o RUC (11 dígitos)");
  }

  loadIdentityCacheFromStorage();

  const cacheKey = `${parsed.type}:${parsed.value}`;
  const cached = identityCache.get(cacheKey);
  if (cached) return cached;

  const pending = identityInflight.get(cacheKey);
  if (pending) return pending;

  const work = (async (): Promise<IdentityResult> => {
    const localClient = getClientByDocument(parsed.value);
    if (localClient) {
      const local: IdentityResult = {
        document: localClient.document,
        type: localClient.type,
        name: localClient.name,
      };
      persistIdentityCache(cacheKey, local);
      return local;
    }

    const result = await (async () => {
      const run = () =>
        parsed.type === "dni"
          ? fetchDniFromLegacy(parsed.value)
          : fetchRuc(parsed.value);
      try {
        return await run();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const transient =
          /intente de nuevo|sin datos|sin nombre|timeout|ocupado|red|connect|primaria|fallback/i.test(
            msg,
          );
        if (!transient) throw err;
        await new Promise((resolve) => setTimeout(resolve, 450));
        return await run();
      }
    })();

    persistIdentityCache(cacheKey, result);
    return result;
  })();

  identityInflight.set(cacheKey, work);
  try {
    return await work;
  } finally {
    identityInflight.delete(cacheKey);
  }
}
