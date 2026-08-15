import type { WarehouseRecord } from "../data/warehouses";
import { formatRecepManualSiNo } from "./warehouseFormUtils";
import type { PreviewRow } from "./buildThermalPrintPreview";
import {
  buildListPlainText,
  buildListPrintHtmlFromRows,
  buildListPrintPreview,
  type BuildListPrintPreviewOptions,
} from "./buildListPrintPreview";
import type { ListPrintColumn } from "./listPrintColumns";

export type WarehousePrintColumnKey =
  | "codigo"
  | "almacen"
  | "direccion"
  | "telefono"
  | "tipo"
  | "sucursal"
  | "tienda"
  | "recepManual";

export type WarehousePrintColumn = ListPrintColumn<WarehousePrintColumnKey>;

export type WarehousesPrintData = {
  rows: WarehouseRecord[];
  filterLabel: string;
  saleDate?: string;
  columns?: WarehousePrintColumn[];
};

const DEFAULT_COLUMNS: WarehousePrintColumn[] = [
  { key: "codigo", label: "Código", widthPx: 52 },
  { key: "almacen", label: "Almacén", widthPx: 140 },
  { key: "direccion", label: "Dirección", widthPx: 320 },
  { key: "telefono", label: "Telefono", widthPx: 72 },
  { key: "tipo", label: "Tipo", widthPx: 260 },
  { key: "sucursal", label: "Sucursal", widthPx: 88 },
  { key: "tienda", label: "Tienda", widthPx: 140 },
  { key: "recepManual", label: "Recep. manual", widthPx: 107 },
];

const RIGHT_ALIGN_KEYS: WarehousePrintColumnKey[] = [];

export function warehouseListOptions(data: WarehousesPrintData): BuildListPrintPreviewOptions<
  WarehousePrintColumnKey,
  WarehouseRecord
> {
  return {
    reportTitle: "Listado de Almacenes",
    saleDate: data.saleDate,
    columns: data.columns,
    defaultColumns: DEFAULT_COLUMNS,
    rightAlignKeys: RIGHT_ALIGN_KEYS,
    rows: data.rows,
    filterLabel: data.filterLabel,
    expandContentKeys: ["direccion", "tipo", "almacen"],
    trailingRule: true,
    cellFormatters: {
      recepManual: (row) => formatRecepManualSiNo(row.recepManual),
    },
  };
}

export function buildWarehousesPrintPreview(data: WarehousesPrintData): PreviewRow[] {
  return buildListPrintPreview(warehouseListOptions(data));
}

export function buildWarehousesPlainText(data: WarehousesPrintData): string {
  return buildListPlainText(warehouseListOptions(data));
}

export function buildWarehousesPrintHtml(data: WarehousesPrintData): string {
  return buildListPrintHtmlFromRows(
    "Listado de Almacenes",
    buildWarehousesPrintPreview(data),
    { pageOrientation: "landscape" },
  );
}
