export type SellerCategoryRecord = {
  id: string;
  codigo: number;
  nombre: string;
};

/** Tabla de categoría de vendedores — TODO: cargar desde API / SQL Server */
export const SELLER_CATEGORIES: SellerCategoryRecord[] = [
  { id: "sc-1", codigo: 1, nombre: "Fuerza de venta Provincia" },
  { id: "sc-2", codigo: 2, nombre: "Fuerza de venta Lima" },
  { id: "sc-3", codigo: 3, nombre: "Telefono" },
  { id: "sc-4", codigo: 4, nombre: "Mostrador" },
  { id: "sc-5", codigo: 5, nombre: "Junior" },
];

export function sortSellerCategories(rows: SellerCategoryRecord[]): SellerCategoryRecord[] {
  return [...rows].sort((a, b) => a.codigo - b.codigo);
}

export function sellerCategoryNames(rows: SellerCategoryRecord[]): string[] {
  return sortSellerCategories(rows).map((row) => row.nombre);
}

export function formatCategoryCodigo(codigo: number, mode: "add" | "edit"): string {
  return mode === "add" ? String(codigo).padStart(4, "0") : String(codigo);
}

export function nextSellerCategoryCodigo(rows: SellerCategoryRecord[]): number {
  let max = 0;
  for (const row of rows) {
    max = Math.max(max, row.codigo);
  }
  return max + 1;
}
