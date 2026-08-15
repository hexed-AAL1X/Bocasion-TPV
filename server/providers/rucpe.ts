const RUCPE_BASE = "https://consulta.rucpe.com/api/v1";

export type RucpeResult =
  | { ok: true; status: number; data: Record<string, unknown> }
  | { ok: false; status: number; message: string };

function friendlyMessage(status: number, detail: string): string {
  const lower = detail.toLowerCase();
  if (status === 401 || lower.includes("api key") || lower.includes("not authenticated")) {
    return "Clave API inválida. Revisa RUCPE_API_KEY en .env (https://consulta.rucpe.com/api)";
  }
  if (status === 404 || lower.includes("not found") || lower.includes("no encontr")) {
    return "Documento no encontrado en el padrón.";
  }
  return detail || `Error al consultar consulta.rucpe.com (${status})`;
}

export async function queryRucpe(
  type: "dni" | "ruc",
  value: string,
  apiKey: string,
): Promise<RucpeResult> {
  const url = `${RUCPE_BASE}/${type}/${value}`;

  try {
    const upstream = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-API-Key": apiKey,
      },
    });

    const text = await upstream.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      return {
        ok: false,
        status: 502,
        message: "Respuesta inválida de consulta.rucpe.com",
      };
    }

    const record = (body ?? {}) as Record<string, unknown>;
    if (!upstream.ok) {
      const detail =
        typeof record.detail === "string"
          ? record.detail
          : typeof record.message === "string"
            ? record.message
            : text || `HTTP ${upstream.status}`;
      return {
        ok: false,
        status: upstream.status >= 400 ? upstream.status : 502,
        message: friendlyMessage(upstream.status, detail),
      };
    }

    return { ok: true, status: upstream.status, data: record };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error de red";
    return {
      ok: false,
      status: 502,
      message: `No se pudo conectar con consulta.rucpe.com: ${msg}`,
    };
  }
}

/** Normaliza respuesta rucpe al formato { success, data } que espera el frontend legacy. */
export function toLegacyIdentityBody(
  type: "dni" | "ruc",
  data: Record<string, unknown>,
): { success: true; data: Record<string, unknown>; provider: string } {
  if (type === "ruc") {
    return {
      success: true,
      provider: "consulta.rucpe.com",
      data: {
        ruc: data.ruc,
        razonSocial: data.razon_social,
        razon_social: data.razon_social,
        estado: data.estado,
        condicion: data.condicion_domicilio,
        direccion: [data.tipo_via, data.nombre_via, data.numero].filter(Boolean).join(" "),
        departamento: data.departamento,
        provincia: data.provincia,
        distrito: data.distrito,
        ubigeo: data.ubigeo,
      },
    };
  }

  const fullName =
    typeof data.full_name === "string"
      ? data.full_name
      : [data.first_last_name, data.second_last_name, data.first_name]
          .filter((v) => typeof v === "string" && String(v).trim())
          .join(" ");

  return {
    success: true,
    provider: "consulta.rucpe.com",
    data: {
      dni: data.document_number,
      document_number: data.document_number,
      nombreCompleto: fullName,
      full_name: fullName,
      nombres: data.first_name,
      apellidoPaterno: data.first_last_name,
      apellidoMaterno: data.second_last_name,
    },
  };
}
