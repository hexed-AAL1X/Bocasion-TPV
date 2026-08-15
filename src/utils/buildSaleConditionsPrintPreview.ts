import type { SaleConditionRecord } from "../data/paymentConditions";
import type { PreviewRow } from "./buildThermalPrintPreview";
import {
  buildListPlainText,
  buildListPrintHtmlFromRows,
  buildListPrintPreview,
  type BuildListPrintPreviewOptions,
} from "./buildListPrintPreview";
import type { ListPrintColumn } from "./listPrintColumns";

export type SaleConditionPrintColumnKey = "codigo" | "nombre" | "condicion" | "vencimiento";

export type SaleConditionPrintColumn = ListPrintColumn<SaleConditionPrintColumnKey>;

export type SaleConditionPrintRow = {
  codigo: string;
  nombre: string;
  condicion: string;
  vencimiento: string;
};

export type SaleConditionsPrintData = {
  rows: SaleConditionRecord[];
  filterLabel?: string;
  saleDate?: string;
  columns?: SaleConditionPrintColumn[];
};

const DEFAULT_COLUMNS: SaleConditionPrintColumn[] = [
  { key: "codigo", label: "Codigo", widthPx: 48 },
  { key: "nombre", label: "Nombre", widthPx: 200 },
  { key: "condicion", label: "Condicion", widthPx: 88 },
  { key: "vencimiento", label: "Venc.", widthPx: 48 },
];

function toPrintRows(rows: SaleConditionRecord[]): SaleConditionPrintRow[] {
  return rows.map((row) => ({
    codigo: row.codigo,
    nombre: row.nombre,
    condicion: row.condicion,
    vencimiento: String(row.vencimiento),
  }));
}

export function saleConditionListOptions(
  data: SaleConditionsPrintData,
): BuildListPrintPreviewOptions<SaleConditionPrintColumnKey, SaleConditionPrintRow> {
  return {
    reportTitle: "Condiciones de venta",
    saleDate: data.saleDate,
    columns: data.columns,
    defaultColumns: DEFAULT_COLUMNS,
    rows: toPrintRows(data.rows),
    filterLabel: data.filterLabel,
    trailingRule: true,
    expandContentKeys: ["nombre"],
  };
}

export function buildSaleConditionsPrintPreview(data: SaleConditionsPrintData): PreviewRow[] {
  return buildListPrintPreview(saleConditionListOptions(data));
}

export function buildSaleConditionsPlainText(data: SaleConditionsPrintData): string {
  return buildListPlainText(saleConditionListOptions(data));
}

export function buildSaleConditionsPrintHtml(data: SaleConditionsPrintData): string {
  return buildListPrintHtmlFromRows(
    "Condiciones de venta",
    buildSaleConditionsPrintPreview(data),
    { pageOrientation: "landscape" },
  );
}
