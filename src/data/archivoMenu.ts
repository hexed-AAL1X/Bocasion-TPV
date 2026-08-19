export type ArchivoSectionId =
  | "informacion"
  | "configurar-pagina"
  | "impresion-docs"
  | "cambiar-empresa"
  | "exportacion"
  | "importacion"
  | "opciones"
  | "salir";

export type ArchivoMenuItem = {
  id: ArchivoSectionId;
  label: string;
  iconFile?: string;
  danger?: boolean;
};

export const ARCHIVO_MENU: ArchivoMenuItem[] = [
  { id: "informacion", label: "Información", iconFile: "activo-inbox.png" },
  { id: "configurar-pagina", label: "Configurar página", iconFile: "menu-shell32-138.png" },
  { id: "impresion-docs", label: "Impresión docs. vta. por bl...", iconFile: "menu-shell32-151.png" },
  { id: "cambiar-empresa", label: "Cambiar empresa", iconFile: "activo-clientes.png" },
  { id: "exportacion", label: "Exportación de datos...", iconFile: "activo-notas-salida.png" },
  { id: "importacion", label: "Importación de datos...", iconFile: "activo-notas-ingreso.png" },
  { id: "opciones", label: "Opciones", iconFile: "menu-shell32-46.png" },
  { id: "salir", label: "Salir", iconFile: "inbox-shell32-28.png", danger: true },
];

import { imageUrl } from "../utils/assetUrl";

export function archivoIconSrc(file: string): string {
  return imageUrl(`iconos/${file}`);
}

/** Datos de sesión mostrados en Archivo → Información (referencia ERP). */
export const ARCHIVO_SESSION = {
  region: "Lima",
  tienda: "Alicorp",
  puntoEmision: "Alicorp_cja1",
  almacen: "Alicorp",
  cuentaPrincipal: "Principal",
};

export function applyArchivoSession(vendor: {
  nombre: string;
  ptoVta?: string;
  almacen?: string;
  tienda?: string;
}): void {
  if (vendor.tienda) ARCHIVO_SESSION.tienda = vendor.tienda;
  if (vendor.almacen) ARCHIVO_SESSION.almacen = vendor.almacen;
  ARCHIVO_SESSION.puntoEmision = vendor.ptoVta || vendor.nombre;
}
