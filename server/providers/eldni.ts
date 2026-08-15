const ELDNI_DNI_URL = "https://eldni.com/pe/buscar-datos-por-dni";
const USER_AGENT =
  "Mozilla/5.0 (compatible; BocaSoft/1.0; +https://www.bocasion.com)";

export type EldniDniData = {
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombre_completo: string;
};

export type EldniResult =
  | { ok: true; data: EldniDniData }
  | { ok: false; status: number; message: string };

function readInputValue(html: string, id: string): string {
  const re = new RegExp(`id="${id}"\\s+value="([^"]*)"`, "i");
  const match = html.match(re);
  return match?.[1]?.trim() ?? "";
}

function friendlyFetchError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const cause =
    err instanceof Error && err.cause instanceof Error ? err.cause.message : "";

  if (msg === "fetch failed" || cause.includes("ECONNREFUSED") || cause.includes("ENOTFOUND")) {
    return "No se pudo conectar con eldni.com. Revisa tu conexión a internet.";
  }
  return msg || "Error al conectar con eldni.com";
}

function buildCookieHeader(setCookies: string[]): string {
  const pairs: string[] = [];
  for (const raw of setCookies) {
    const part = raw.split(";")[0]?.trim();
    if (part) pairs.push(part);
  }
  return pairs.join("; ");
}

async function openEldniSession(): Promise<{ token: string; cookie: string }> {
  const res = await fetch(ELDNI_DNI_URL, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": USER_AGENT,
    },
  });

  if (!res.ok) {
    throw new Error(`eldni.com no respondió (${res.status})`);
  }

  const html = await res.text();
  const tokenMatch = html.match(/name="_token"\s+value="([^"]+)"/i);
  const token = tokenMatch?.[1]?.trim();
  if (!token) {
    throw new Error("No se pudo obtener token CSRF de eldni.com");
  }

  const setCookies =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [];

  const cookie = buildCookieHeader(setCookies);
  if (!cookie) {
    throw new Error("No se pudo iniciar sesión en eldni.com");
  }

  return { token, cookie };
}

export async function queryEldniDni(dni: string): Promise<EldniResult> {
  let session: { token: string; cookie: string };
  try {
    session = await openEldniSession();
  } catch (err) {
    return {
      ok: false,
      status: 502,
      message: friendlyFetchError(err),
    };
  }

  const body = new URLSearchParams({
    dni,
    _token: session.token,
  });

  let html: string;
  try {
    const res = await fetch(ELDNI_DNI_URL, {
      method: "POST",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
        Referer: ELDNI_DNI_URL,
        Origin: "https://eldni.com",
        Cookie: session.cookie,
      },
      body: body.toString(),
      redirect: "follow",
    });

    html = await res.text();

    if (res.status === 419) {
      return {
        ok: false,
        status: 502,
        message: "Sesión expirada en eldni.com. Intenta de nuevo.",
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        status: 502,
        message: `eldni.com respondió con error (${res.status})`,
      };
    }
  } catch {
    return {
      ok: false,
      status: 502,
      message: "No se pudo consultar eldni.com",
    };
  }

  if (html.includes("No se encontraron datos para el DNI")) {
    return {
      ok: false,
      status: 404,
      message: "DNI no encontrado",
    };
  }

  const nombres = readInputValue(html, "nombres");
  const apellidoPaterno = readInputValue(html, "apellidop");
  const apellidoMaterno = readInputValue(html, "apellidom");
  const nombreCompleto =
    readInputValue(html, "completos") ||
    [apellidoPaterno, apellidoMaterno, nombres].filter(Boolean).join(" ").trim();

  if (!nombreCompleto) {
    return {
      ok: false,
      status: 502,
      message: "eldni.com no devolvió datos parseables para este DNI",
    };
  }

  return {
    ok: true,
    data: {
      dni,
      nombres,
      apellido_paterno: apellidoPaterno,
      apellido_materno: apellidoMaterno,
      nombre_completo: nombreCompleto,
    },
  };
}
