import { imageUrl } from "../utils/assetUrl";
import type { AlmacenLargeAction } from "./almacenRibbon";

const ribbonIcon = (id: string) => imageUrl(`ribbon/${id}.png`);
const icon = (file: string) => imageUrl(`iconos/${file}`);

export const ventasCatalogos: AlmacenLargeAction[] = [
  { id: "clientes", label: "Clientes", image: ribbonIcon("clientes") },
  { id: "lista-precios", label: "Lista precios", image: icon("activo-cobranzas.png") },
];

export const ventasMostrador: AlmacenLargeAction[] = [
  { id: "mostrador", label: "Mostrador ventas", image: ribbonIcon("mostrador") },
];

export const ventasDespacho: AlmacenLargeAction[] = [
  { id: "remision", label: "G/Remisión", image: ribbonIcon("remision") },
];

export const ventasDocumentos: AlmacenLargeAction[] = [
  { id: "boleta", label: "Boleta vta.", image: ribbonIcon("boleta") },
  { id: "factura", label: "Factura", image: ribbonIcon("factura") },
  { id: "nota-vta", label: "Nota vta.", image: ribbonIcon("nota-vta") },
  { id: "comanda", label: "Comanda", image: icon("activo-menu.png") },
];

export const ventasNotasContables: AlmacenLargeAction[] = [
  { id: "ncredito", label: "N/Crédito", image: icon("activo-notas-ingreso.png"), badge: "NC" },
  { id: "ndebito", label: "N/Débito", image: icon("activo-notas-salida.png"), badge: "ND" },
];

export const ventasKiosco: AlmacenLargeAction[] = [
  { id: "cierre-diario", label: "Cierre diario", image: icon("mostrador-shell32-281.png") },
];

export const ventasMenuChevrons: Record<string, boolean> = {
  "lista-precios": true,
  remision: true,
  boleta: true,
};
