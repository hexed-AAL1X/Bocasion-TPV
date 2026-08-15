import type { SellerRecord } from "../data/sellers";
import type { PreviewRow } from "./buildThermalPrintPreview";
import {
  buildListPlainText,
  buildListPrintHtmlFromRows,
  buildListPrintPreview,
  type BuildListPrintPreviewOptions,
} from "./buildListPrintPreview";
import type { ListPrintColumn } from "./listPrintColumns";

export type SellerPrintColumnKey = "codigo" | "nombre" | "grupo";

export type SellerPrintColumn = ListPrintColumn<SellerPrintColumnKey>;

export type SellersPrintData = {
  rows: SellerRecord[];
  filterLabel?: string;
  saleDate?: string;
  columns?: SellerPrintColumn[];
};

const DEFAULT_COLUMNS: SellerPrintColumn[] = [
  { key: "codigo", label: "Codigo", widthPx: 56 },
  { key: "nombre", label: "Nombre", widthPx: 220 },
  { key: "grupo", label: "Grupo", widthPx: 120 },
];

export function sellerListOptions(
  data: SellersPrintData,
): BuildListPrintPreviewOptions<SellerPrintColumnKey, SellerRecord> {
  return {
    reportTitle: "Listado de Vendedores",
    saleDate: data.saleDate,
    columns: data.columns,
    defaultColumns: DEFAULT_COLUMNS,
    rows: data.rows,
    filterLabel: data.filterLabel,
    trailingRule: true,
    expandContentKeys: ["nombre", "grupo"],
  };
}

export function buildSellersPrintPreview(data: SellersPrintData): PreviewRow[] {
  return buildListPrintPreview(sellerListOptions(data));
}

export function buildSellersPlainText(data: SellersPrintData): string {
  return buildListPlainText(sellerListOptions(data));
}

export function buildSellersPrintHtml(data: SellersPrintData): string {
  return buildListPrintHtmlFromRows(
    "Listado de Vendedores",
    buildSellersPrintPreview(data),
    { pageOrientation: "landscape" },
  );
}
