import { imageUrl } from "../utils/assetUrl";
export type AlmacenLargeAction = {
  id: string;
  label: string;
  image: string;
  badge?: string;
  /** Texto en una sola línea con ancho automático (p. ej. etiquetas largas). */
  wide?: boolean;
};

export type AlmacenMenuAction = {
  id: string;
  label: string;
  image: string;
};

const ribbonIcon = (id: string) => imageUrl(`ribbon/${id}.png`);
const icon = (file: string) => imageUrl(`iconos/${file}`);

export const almacenArticulos: AlmacenLargeAction[] = [
  { id: "productos", label: "Padrón de Productos", image: ribbonIcon("productos") },
];

export const almacenDocs: AlmacenLargeAction[] = [
  { id: "nota-ingreso", label: "Nota Ingreso", image: ribbonIcon("notas-ingreso") },
  { id: "nota-salida", label: "Nota salida", image: ribbonIcon("notas-salida") },
];

export const almacenKardex: AlmacenLargeAction[] = [
  { id: "kardex", label: "Kardex", image: icon("menu-shell32-161.png") },
];

export const almacenInventarioMenu: AlmacenMenuAction[] = [
  { id: "toma-inventarios", label: "Toma de inventarios", image: icon("menu-shell32-138.png") },
  { id: "cierre-almacenes", label: "Cierre de almacenes", image: icon("menu-shell32-165.png") },
];

export const almacenStockConsolidado: AlmacenLargeAction = {
  id: "stock-consolidado",
  label: "Stock consolidado",
  image: icon("productos-shell32-259.png"),
  badge: "8",
};
