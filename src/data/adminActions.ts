import { imageUrl } from "../utils/assetUrl";

export type AdminActionVariant = "default" | "primary" | "danger";

export type AdminAction = {
  id: string;
  label: string;
  /** Ruta bajo images/ (ribbon curada o catálogo iconos). */
  iconSrc: string;
  variant?: AdminActionVariant;
};

const ribbon = (name: string) => imageUrl(`ribbon/${name}.png`);
const icon = (file: string) => imageUrl(`iconos/${file}`);

/**
 * Iconos alineados con la función de cada botón del TPV.
 * Preferimos PNG de la cinta (Vista/Navasoft) cuando existe equivalente.
 */
export const adminActions: AdminAction[] = [
  { id: "delete", label: "Eliminar", variant: "danger", iconSrc: icon("inbox-shell32-32.png") },
  { id: "ruc", label: "RUC/DNI", iconSrc: ribbon("clientes") },
  { id: "doc", label: "Factura / Boleta", variant: "primary", iconSrc: ribbon("factura") },
  { id: "qty", label: "Cantidad", iconSrc: icon("menu-shell32-134.png") },
  { id: "dscto", label: "Dscto. Venta", variant: "danger", iconSrc: icon("menu-shell32-274.png") },
  { id: "nota", label: "Nota de Venta", variant: "danger", iconSrc: ribbon("nota-vta") },
  { id: "acceso1", label: "Control acceso", iconSrc: icon("menu-shell32-48.png") },
  { id: "bolsa", label: "BOLSA (Icbper)", iconSrc: icon("productos-shell32-275.png") },
  { id: "acceso2", label: "Control acceso", iconSrc: icon("menu-shell32-49.png") },
  { id: "lineas", label: "Lineas", iconSrc: ribbon("productos") },
  { id: "ventas-dia", label: "Ventas del día", iconSrc: ribbon("mostrador") },
  { id: "cierre", label: "Cierre Caja (z)", iconSrc: icon("menu-shell32-137.png") },
  { id: "tipo-vta", label: "Cambiar Tipo vta.", iconSrc: icon("menu-shell32-166.png") },
  { id: "vendedor", label: "Cambiar Vendedor", iconSrc: icon("clientes-imageres-195.png") },
  { id: "otras", label: "Otras Func.", iconSrc: icon("menu-shell32-46.png") },
];
