import type { VehicleRecord } from "../data/vehicles";
import type { PreviewRow } from "./buildThermalPrintPreview";
import {
  buildListPlainText,
  buildListPrintHtmlFromRows,
  buildListPrintPreview,
  type BuildListPrintPreviewOptions,
} from "./buildListPrintPreview";
import type { ListPrintColumn } from "./listPrintColumns";

export type VehiclePrintColumnKey = "placa" | "marca" | "chofer";

export type VehiclePrintColumn = ListPrintColumn<VehiclePrintColumnKey>;

export type VehiclesPrintData = {
  rows: VehicleRecord[];
  carrierName: string;
  filterLabel?: string;
  saleDate?: string;
  columns?: VehiclePrintColumn[];
};

const DEFAULT_COLUMNS: VehiclePrintColumn[] = [
  { key: "placa", label: "Placa", widthPx: 96 },
  { key: "marca", label: "Marca", widthPx: 112 },
  { key: "chofer", label: "Chofer", widthPx: 180 },
];

export function vehicleListOptions(data: VehiclesPrintData): BuildListPrintPreviewOptions<
  VehiclePrintColumnKey,
  VehicleRecord
> {
  return {
    reportTitle: "Listado de Vehiculos",
    saleDate: data.saleDate,
    columns: data.columns,
    defaultColumns: DEFAULT_COLUMNS,
    rows: data.rows,
    filterLabel: data.filterLabel,
    extraMetaLines: [`Transportista: ${data.carrierName}`],
    trailingRule: true,
    expandContentKeys: ["chofer", "marca"],
  };
}

export function buildVehiclesPrintPreview(data: VehiclesPrintData): PreviewRow[] {
  return buildListPrintPreview(vehicleListOptions(data));
}

export function buildVehiclesPlainText(data: VehiclesPrintData): string {
  return buildListPlainText(vehicleListOptions(data));
}

export function buildVehiclesPrintHtml(data: VehiclesPrintData): string {
  return buildListPrintHtmlFromRows(
    "Listado de Vehiculos",
    buildVehiclesPrintPreview(data),
    { pageOrientation: "landscape" },
  );
}
