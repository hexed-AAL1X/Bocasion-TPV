import type { SellerCategoryRecord } from "../data/sellerCategories";
import type { PreviewRow } from "./buildThermalPrintPreview";
import {
  buildListPlainText,
  buildListPrintHtmlFromRows,
  buildListPrintPreview,
  type BuildListPrintPreviewOptions,
} from "./buildListPrintPreview";
import type { ListPrintColumn } from "./listPrintColumns";

export type SellerCategoryPrintColumnKey = "codigo" | "nombre";

export type SellerCategoryPrintColumn = ListPrintColumn<SellerCategoryPrintColumnKey>;

export type SellerCategoryPrintRow = {
  codigo: string;
  nombre: string;
};

export type SellerCategoriesPrintData = {
  rows: SellerCategoryRecord[];
  filterLabel?: string;
  saleDate?: string;
  columns?: SellerCategoryPrintColumn[];
  /** Título del listado (p. ej. Categoría cliente/proveedor/producto). */
  reportTitle?: string;
};

const DEFAULT_COLUMNS: SellerCategoryPrintColumn[] = [
  { key: "codigo", label: "Codigo", widthPx: 56 },
  { key: "nombre", label: "Categoria", widthPx: 280 },
];

function toPrintRows(rows: SellerCategoryRecord[]): SellerCategoryPrintRow[] {
  return rows.map((row) => ({
    codigo: String(row.codigo),
    nombre: row.nombre.toUpperCase(),
  }));
}

export function sellerCategoryListOptions(
  data: SellerCategoriesPrintData,
): BuildListPrintPreviewOptions<SellerCategoryPrintColumnKey, SellerCategoryPrintRow> {
  return {
    reportTitle: data.reportTitle ?? "Tabla de Categoria de Vendedores",
    saleDate: data.saleDate,
    columns: data.columns,
    defaultColumns: DEFAULT_COLUMNS,
    rows: toPrintRows(data.rows),
    filterLabel: data.filterLabel,
    trailingRule: true,
    expandContentKeys: ["nombre"],
  };
}

export function buildSellerCategoriesPrintPreview(data: SellerCategoriesPrintData): PreviewRow[] {
  return buildListPrintPreview(sellerCategoryListOptions(data));
}

export function buildSellerCategoriesPlainText(data: SellerCategoriesPrintData): string {
  return buildListPlainText(sellerCategoryListOptions(data));
}

export function buildSellerCategoriesPrintHtml(data: SellerCategoriesPrintData): string {
  return buildListPrintHtmlFromRows(
    data.reportTitle ?? "Tabla de Categoria de Vendedores",
    buildSellerCategoriesPrintPreview(data),
    { pageOrientation: "landscape" },
  );
}
