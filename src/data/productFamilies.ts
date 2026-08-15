/** Familias de producto — selector de transferencia entre almacenes. */
export const PRODUCT_FAMILIES = [
  "Navasoft",
  "Prod. Terminado",
  "Envases Y Embalajes",
  "Materia Prima",
  "Mercaderia",
  "Suministros",
  "Servicios",
  "Sub. Producto",
  "Publicidad",
  "Restaurant Bar",
] as const;

export type ProductFamily = (typeof PRODUCT_FAMILIES)[number];
