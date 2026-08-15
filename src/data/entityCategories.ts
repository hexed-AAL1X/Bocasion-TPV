export type EntityCategoryKind = "clientes" | "proveedores" | "productos";

export type EntityCategoryRecord = {
  id: string;
  codigo: string;
  nombre: string;
};

export const ENTITY_CATEGORY_KIND_LABEL: Record<EntityCategoryKind, string> = {
  clientes: "Clientes",
  proveedores: "Proveedores",
  productos: "Productos",
};

export function entityCategoryWindowTitle(kind: EntityCategoryKind): string {
  return `Categoria -> ${ENTITY_CATEGORY_KIND_LABEL[kind]}`;
}

type Seed = readonly [codigo: string, nombre: string];

function seed(kind: EntityCategoryKind, [codigo, nombre]: Seed): EntityCategoryRecord {
  return {
    id: `ec-${kind}-${codigo}`,
    codigo,
    nombre,
  };
}

const CLIENT_SEEDS: Seed[] = [
  ["01", "ALUMNO"],
  ["02", "ADMINISTRATIVO"],
  ["03", "DOCENTE"],
  ["04", "OTRO"],
];

const SUPPLIER_SEEDS: Seed[] = [
  ["01", "ND"],
  ["02", "AGENTE DE ADUANA"],
  ["03", "AGENTE DE CARGA"],
  ["04", "EXTERIOR"],
  ["05", "CIA. SEGURO"],
];

const PRODUCT_SEEDS: Seed[] = [
  ["01", "MERCADERIA"],
  ["02", "PROD.TERMINADO"],
  ["03", "SUB PRODUCTO"],
  ["04", "PROD.PROCESO"],
  ["05", "MATERIA PRIMA"],
  ["06", "SUMINISTROS"],
  ["07", "ENVASES Y EMB"],
  ["08", "SERVICIO"],
];

export const ENTITY_CATEGORY_SEEDS: Record<EntityCategoryKind, EntityCategoryRecord[]> = {
  clientes: CLIENT_SEEDS.map((row) => seed("clientes", row)),
  proveedores: SUPPLIER_SEEDS.map((row) => seed("proveedores", row)),
  productos: PRODUCT_SEEDS.map((row) => seed("productos", row)),
};

export function sortEntityCategories(rows: EntityCategoryRecord[]): EntityCategoryRecord[] {
  return [...rows].sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }));
}

export function formatEntityCategoryCodigo(codigo: string, mode: "add" | "edit"): string {
  const digits = codigo.replace(/\D/g, "");
  if (!digits) return mode === "add" ? "" : codigo;
  return digits.padStart(2, "0").slice(-2);
}

export function nextEntityCategoryCodigo(existing: EntityCategoryRecord[]): string {
  let max = 0;
  for (const row of existing) {
    const n = Number.parseInt(row.codigo.replace(/\D/g, ""), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return String(max + 1).padStart(2, "0");
}

export function cloneEntityCategorySeeds(): Record<EntityCategoryKind, EntityCategoryRecord[]> {
  return {
    clientes: sortEntityCategories(ENTITY_CATEGORY_SEEDS.clientes.map((row) => ({ ...row }))),
    proveedores: sortEntityCategories(ENTITY_CATEGORY_SEEDS.proveedores.map((row) => ({ ...row }))),
    productos: sortEntityCategories(ENTITY_CATEGORY_SEEDS.productos.map((row) => ({ ...row }))),
  };
}
