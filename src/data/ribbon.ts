export type RibbonTabId =
  | "archivo"
  | "inicio"
  | "entidades"
  | "almacen"
  | "logistica"
  | "ventas"
  | "cobranzas"
  | "herramientas"
  | "soporte";

export const ribbonTabs: { id: RibbonTabId; label: string }[] = [
  { id: "archivo", label: "Archivo" },
  { id: "inicio", label: "Inicio" },
  { id: "entidades", label: "Entidades" },
  { id: "almacen", label: "Almacén" },
  { id: "logistica", label: "Logística" },
  { id: "ventas", label: "Ventas" },
  { id: "cobranzas", label: "Cobranzas" },
  { id: "herramientas", label: "Herramientas" },
  { id: "soporte", label: "Soporte" },
];

export type RibbonAction = {
  id: string;
  label: string;
  group: string;
  /** Ilustración tipo ERP (no icono vectorial de trazo) */
  image: string;
};

import { imageUrl } from "../utils/assetUrl";

const ribbonIcon = (id: string) => imageUrl(`ribbon/${id}.png`);

export const inicioActions: RibbonAction[] = [
  { id: "inbox", label: "Actualizar Inbox", group: "Inbox", image: ribbonIcon("inbox") },
  { id: "productos", label: "Padrón de Items", group: "Compras", image: ribbonIcon("productos") },
  { id: "orden-compra", label: "Orden compra", group: "Compras", image: ribbonIcon("orden-compra") },
  { id: "notas-ingreso", label: "Notas ingreso", group: "Compras", image: ribbonIcon("notas-ingreso") },
  { id: "notas-salida", label: "Notas salida", group: "Compras", image: ribbonIcon("notas-salida") },
  { id: "mostrador", label: "Mostrador ventas", group: "Mostrador", image: ribbonIcon("mostrador") },
  { id: "menu", label: "Definir Menu", group: "Menus", image: ribbonIcon("menu") },
  { id: "remision", label: "G/Remisión", group: "Despacho", image: ribbonIcon("remision") },
  { id: "boleta", label: "Boleta vta.", group: "Documentos venta", image: ribbonIcon("boleta") },
  { id: "factura", label: "Factura", group: "Documentos venta", image: ribbonIcon("factura") },
  { id: "nota-vta", label: "Nota vta.", group: "Documentos venta", image: ribbonIcon("nota-vta") },
  { id: "clientes", label: "Clientes", group: "Catálogos", image: ribbonIcon("clientes") },
  { id: "cobranzas", label: "Cobranzas", group: "Ingresos", image: ribbonIcon("cobranzas") },
];
