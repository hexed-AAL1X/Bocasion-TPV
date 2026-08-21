import { findVendorByCode } from "../data/vendors";
import type { Vendor } from "../data/vendors";

function tryDemoVendor(clave: string): Vendor | undefined {
  return findVendorByCode(clave);
}

export function vendorFromNavaLogin(row: {
  usuario: string;
  nombres?: string;
  apellidos?: string;
  codven?: string;
  nomven?: string;
  codusu?: string;
  nompto?: string;
  nomalm?: string;
  nomtie?: string;
}): Vendor {
  const nombre =
    [row.nombres, row.apellidos].filter(Boolean).join(" ").trim() ||
    row.nomven?.trim() ||
    row.usuario;
  const ptoVta = row.nompto?.trim() || nombre;
  const almacen = row.nomalm?.trim() || "";
  const tienda = row.nomtie?.trim() || almacen || "";
  return {
    code: (row.codven || row.codusu || row.usuario).trim(),
    usuario: row.usuario.trim(),
    nombre,
    ptoVta,
    almacen,
    tienda,
  };
}

export async function authenticateVendor(clave: string): Promise<Vendor> {
  const password = clave.trim();
  if (!password) {
    throw new Error("Ingrese su clave");
  }
  const api = window.bocasoft?.navaLogin;
  if (api) {
    try {
      const row = await api({ password });
      return vendorFromNavaLogin(row);
    } catch (err) {
      const demo = tryDemoVendor(password);
      if (demo) return demo;
      throw err instanceof Error ? err : new Error(String(err));
    }
  }
  const demo = tryDemoVendor(password);
  if (demo) return demo;
  throw new Error("Clave incorrecta");
}
