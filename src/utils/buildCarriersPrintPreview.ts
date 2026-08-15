import type { CarrierRecord } from "../data/carriers";
import type { PreviewRow } from "./buildThermalPrintPreview";
import {
  buildListPlainText,
  buildListPrintHtmlFromRows,
  buildListPrintPreview,
  type BuildListPrintPreviewOptions,
} from "./buildListPrintPreview";
import type { ListPrintColumn } from "./listPrintColumns";

export type CarrierPrintColumnKey =
  | "codigo"
  | "razonSocial"
  | "ruc"
  | "dni"
  | "vehiculos"
  | "choferes"
  | "direccion";

export type CarrierPrintColumn = ListPrintColumn<CarrierPrintColumnKey>;

export type CarriersPrintData = {
  rows: CarrierRecord[];
  filterLabel?: string;
  saleDate?: string;
  columns?: CarrierPrintColumn[];
};

const DEFAULT_COLUMNS: CarrierPrintColumn[] = [
  { key: "codigo", label: "Código", widthPx: 56 },
  { key: "razonSocial", label: "Razón social", widthPx: 180 },
  { key: "ruc", label: "RUC", widthPx: 88 },
  { key: "dni", label: "DNI", widthPx: 72 },
  { key: "vehiculos", label: "Vehículos", printLabel: "Vehiculos", widthPx: 72 },
  { key: "choferes", label: "Choferes", widthPx: 72 },
  { key: "direccion", label: "Dirección", widthPx: 220 },
];

const RIGHT_ALIGN_KEYS: CarrierPrintColumnKey[] = ["vehiculos", "choferes"];

export function carrierListOptions(data: CarriersPrintData): BuildListPrintPreviewOptions<
  CarrierPrintColumnKey,
  CarrierRecord
> {
  return {
    reportTitle: "Listado de Transportistas",
    saleDate: data.saleDate,
    columns: data.columns,
    defaultColumns: DEFAULT_COLUMNS,
    rightAlignKeys: RIGHT_ALIGN_KEYS,
    rows: data.rows,
    filterLabel: data.filterLabel,
    expandContentKeys: ["direccion", "razonSocial"],
    trailingRule: true,
  };
}

export function buildCarriersPrintPreview(data: CarriersPrintData): PreviewRow[] {
  return buildListPrintPreview(carrierListOptions(data));
}

export function buildCarriersPlainText(data: CarriersPrintData): string {
  return buildListPlainText(carrierListOptions(data));
}

export function buildCarriersPrintHtml(data: CarriersPrintData): string {
  return buildListPrintHtmlFromRows(
    "Listado de Transportistas",
    buildCarriersPrintPreview(data),
    { pageOrientation: "landscape" },
  );
}
