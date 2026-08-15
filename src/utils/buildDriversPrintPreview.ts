import type { DriverRecord } from "../data/drivers";
import type { PreviewRow } from "./buildThermalPrintPreview";
import {
  buildListPlainText,
  buildListPrintHtmlFromRows,
  buildListPrintPreview,
  type BuildListPrintPreviewOptions,
} from "./buildListPrintPreview";
import type { ListPrintColumn } from "./listPrintColumns";

export type DriverPrintColumnKey =
  | "codigo"
  | "nombre"
  | "dni"
  | "licencia"
  | "telefono"
  | "direccion";

export type DriverPrintColumn = ListPrintColumn<DriverPrintColumnKey>;

export type DriversPrintData = {
  rows: DriverRecord[];
  carrierName: string;
  filterLabel?: string;
  saleDate?: string;
  columns?: DriverPrintColumn[];
};

const DEFAULT_COLUMNS: DriverPrintColumn[] = [
  { key: "codigo", label: "Cd", widthPx: 52 },
  { key: "nombre", label: "Chofer", widthPx: 160 },
  { key: "dni", label: "DNI", widthPx: 80 },
  { key: "licencia", label: "N° Licencia", widthPx: 88 },
  { key: "telefono", label: "Telefono", widthPx: 88 },
  { key: "direccion", label: "Direccion", widthPx: 140 },
];

export function driverListOptions(data: DriversPrintData): BuildListPrintPreviewOptions<
  DriverPrintColumnKey,
  DriverRecord
> {
  return {
    reportTitle: "Listado de Choferes",
    saleDate: data.saleDate,
    columns: data.columns,
    defaultColumns: DEFAULT_COLUMNS,
    rows: data.rows,
    filterLabel: data.filterLabel,
    extraMetaLines: [`Transportista: ${data.carrierName}`],
    trailingRule: true,
    expandContentKeys: ["direccion", "nombre"],
  };
}

export function buildDriversPrintPreview(data: DriversPrintData): PreviewRow[] {
  return buildListPrintPreview(driverListOptions(data));
}

export function buildDriversPlainText(data: DriversPrintData): string {
  return buildListPlainText(driverListOptions(data));
}

export function buildDriversPrintHtml(data: DriversPrintData): string {
  return buildListPrintHtmlFromRows(
    "Listado de Choferes",
    buildDriversPrintPreview(data),
    { pageOrientation: "landscape" },
  );
}
