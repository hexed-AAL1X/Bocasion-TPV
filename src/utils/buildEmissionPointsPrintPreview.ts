import type { EmissionPointRecord } from "../data/emissionPoints";
import type { PreviewRow } from "./buildThermalPrintPreview";
import {
  buildListPlainText,
  buildListPrintHtmlFromRows,
  buildListPrintPreview,
  type BuildListPrintPreviewOptions,
} from "./buildListPrintPreview";
import type { ListPrintColumn } from "./listPrintColumns";

export type EmissionPointPrintColumnKey = "sucursal" | "tienda" | "codigo" | "nombre" | "maqRegSerie";

export type EmissionPointPrintColumn = ListPrintColumn<EmissionPointPrintColumnKey>;

export type EmissionPointsPrintData = {
  rows: EmissionPointRecord[];
  filterLabel?: string;
  saleDate?: string;
  columns?: EmissionPointPrintColumn[];
};

const DEFAULT_COLUMNS: EmissionPointPrintColumn[] = [
  { key: "sucursal", label: "Sucursal", widthPx: 72 },
  { key: "tienda", label: "Tienda", widthPx: 120 },
  { key: "codigo", label: "Codigo", widthPx: 48 },
  { key: "nombre", label: "Punto de venta", widthPx: 180 },
  { key: "maqRegSerie", label: "Maq. Reg.(Serie)", widthPx: 120 },
];

export function emissionPointListOptions(
  data: EmissionPointsPrintData,
): BuildListPrintPreviewOptions<EmissionPointPrintColumnKey, EmissionPointRecord> {
  return {
    reportTitle: "Puntos de emisión de documentos",
    saleDate: data.saleDate,
    columns: data.columns,
    defaultColumns: DEFAULT_COLUMNS,
    rows: data.rows,
    filterLabel: data.filterLabel,
    trailingRule: true,
    expandContentKeys: ["nombre", "tienda", "maqRegSerie"],
  };
}

export function buildEmissionPointsPrintPreview(data: EmissionPointsPrintData): PreviewRow[] {
  return buildListPrintPreview(emissionPointListOptions(data));
}

export function buildEmissionPointsPlainText(data: EmissionPointsPrintData): string {
  return buildListPlainText(emissionPointListOptions(data));
}

export function buildEmissionPointsPrintHtml(data: EmissionPointsPrintData): string {
  return buildListPrintHtmlFromRows(
    "Puntos de emisión de documentos",
    buildEmissionPointsPrintPreview(data),
    { pageOrientation: "landscape" },
  );
}
