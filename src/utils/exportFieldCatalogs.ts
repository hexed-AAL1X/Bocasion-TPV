export type ExportListKind =
  | "documents"
  | "sale-conditions"
  | "warehouses"
  | "carriers"
  | "vehicles"
  | "drivers"
  | "sellers"
  | "seller-categories"
  | "emission-points";

export type ExportFieldDef = {
  columnKey: string;
  label: string;
};

export type ExportFieldCatalog = {
  available: ExportFieldDef[];
  exportFields: ExportFieldDef[];
};

type ListColumnSource = {
  key: string;
  label: string;
};

function catalogFromTableColumns(columns: ListColumnSource[]): ExportFieldCatalog {
  return {
    available: [],
    exportFields: columns.map((column) => ({
      columnKey: column.key,
      label: column.label,
    })),
  };
}

/** Columnas visibles en cada cuadro de listado (mismas etiquetas que la grilla). */
const LIST_TABLE_COLUMNS: Record<ExportListKind, ListColumnSource[]> = {
  documents: [
    { key: "codigo", label: "Código" },
    { key: "nombre", label: "Nombre" },
    { key: "registroCompra", label: "Reg.Compra" },
    { key: "ventaDirecta", label: "Vta. Directa" },
    { key: "codSunat", label: "Cod. Sunat" },
  ],
  "sale-conditions": [
    { key: "codigo", label: "Código" },
    { key: "nombre", label: "Nombre" },
    { key: "condicion", label: "Condición" },
    { key: "vencimiento", label: "Venc." },
  ],
  warehouses: [
    { key: "codigo", label: "Código" },
    { key: "almacen", label: "Almacén" },
    { key: "direccion", label: "Dirección" },
    { key: "telefono", label: "Telefono" },
    { key: "tipo", label: "Tipo" },
    { key: "sucursal", label: "Sucursal" },
    { key: "tienda", label: "Tienda" },
    { key: "recepManual", label: "Recep. manual" },
  ],
  carriers: [
    { key: "codigo", label: "Código" },
    { key: "razonSocial", label: "Razón social" },
    { key: "ruc", label: "RUC" },
    { key: "dni", label: "DNI" },
    { key: "vehiculos", label: "Vehículos" },
    { key: "choferes", label: "Choferes" },
    { key: "direccion", label: "Dirección" },
  ],
  vehicles: [
    { key: "placa", label: "Placa" },
    { key: "marca", label: "Marca" },
    { key: "chofer", label: "Chofer" },
  ],
  drivers: [
    { key: "codigo", label: "Cd" },
    { key: "nombre", label: "Chofer" },
    { key: "dni", label: "DNI" },
    { key: "licencia", label: "N° Licencia" },
    { key: "telefono", label: "Teléfono" },
    { key: "direccion", label: "Dirección" },
  ],
  sellers: [
    { key: "codigo", label: "Código" },
    { key: "nombre", label: "Nombre" },
    { key: "grupo", label: "Grupo" },
  ],
  "seller-categories": [
    { key: "codigo", label: "Código" },
    { key: "nombre", label: "Categoría" },
  ],
  "emission-points": [
    { key: "sucursal", label: "Sucursal" },
    { key: "tienda", label: "Tienda" },
    { key: "codigo", label: "Código" },
    { key: "nombre", label: "Punto de venta" },
    { key: "maqRegSerie", label: "Maq. Reg.(Serie)" },
  ],
};

export const EXPORT_FIELD_CATALOGS: Record<ExportListKind, ExportFieldCatalog> = {
  documents: catalogFromTableColumns(LIST_TABLE_COLUMNS.documents),
  "sale-conditions": catalogFromTableColumns(LIST_TABLE_COLUMNS["sale-conditions"]),
  warehouses: catalogFromTableColumns(LIST_TABLE_COLUMNS.warehouses),
  carriers: catalogFromTableColumns(LIST_TABLE_COLUMNS.carriers),
  vehicles: catalogFromTableColumns(LIST_TABLE_COLUMNS.vehicles),
  drivers: catalogFromTableColumns(LIST_TABLE_COLUMNS.drivers),
  sellers: catalogFromTableColumns(LIST_TABLE_COLUMNS.sellers),
  "seller-categories": catalogFromTableColumns(LIST_TABLE_COLUMNS["seller-categories"]),
  "emission-points": catalogFromTableColumns(LIST_TABLE_COLUMNS["emission-points"]),
};

export function resolveExportListKind(data: {
  documentsData?: unknown;
  saleConditionsData?: unknown;
  warehousesData?: unknown;
  carriersData?: unknown;
  vehiclesData?: unknown;
  driversData?: unknown;
  sellersData?: unknown;
  sellerCategoriesData?: unknown;
  emissionPointsData?: unknown;
}): ExportListKind | null {
  if (data.documentsData) return "documents";
  if (data.saleConditionsData) return "sale-conditions";
  if (data.warehousesData) return "warehouses";
  if (data.carriersData) return "carriers";
  if (data.vehiclesData) return "vehicles";
  if (data.driversData) return "drivers";
  if (data.sellersData) return "sellers";
  if (data.sellerCategoriesData) return "seller-categories";
  if (data.emissionPointsData) return "emission-points";
  return null;
}

export function getExportFieldCatalog(kind: ExportListKind | null): ExportFieldCatalog | null {
  if (!kind) return null;
  return EXPORT_FIELD_CATALOGS[kind];
}

export type SelectedExportField = ExportFieldDef & { enabled: boolean };

export function initialExportFieldState(catalog: ExportFieldCatalog): {
  available: ExportFieldDef[];
  exportFields: SelectedExportField[];
} {
  return {
    available: [...catalog.available],
    exportFields: catalog.exportFields.map((field) => ({ ...field, enabled: true })),
  };
}

export function hasEnabledExportColumns(fields: SelectedExportField[]): boolean {
  return fields.some((field) => field.enabled);
}

export function buildExportColumnsFromFields<T extends string>(
  defaultColumns: Array<{ key: T; label: string; widthPx: number; printLabel?: string }>,
  selectedFields: SelectedExportField[],
): Array<{ key: T; label: string; widthPx: number; printLabel?: string }> {
  const byKey = new Map(defaultColumns.map((column) => [column.key, column]));
  return selectedFields
    .filter((field) => field.enabled)
    .map((field) => {
      const column = byKey.get(field.columnKey as T);
      if (column) return column;
      return {
        key: field.columnKey as T,
        label: field.label,
        widthPx: 80,
      };
    });
}
