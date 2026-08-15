import { carrierListOptions, buildCarriersPrintPreview, buildCarriersPrintHtml, type CarriersPrintData } from "./buildCarriersPrintPreview";
import { driverListOptions, buildDriversPrintPreview, buildDriversPrintHtml, type DriversPrintData } from "./buildDriversPrintPreview";
import { buildListExportTableData, type BuildListPrintPreviewOptions, prepareListWordExportHtml } from "./buildListPrintPreview";
import { buildSellersPrintHtml, buildSellersPrintPreview, sellerListOptions, type SellersPrintData } from "./buildSellersPrintPreview";
import {
  buildSellerCategoriesPrintHtml,
  buildSellerCategoriesPrintPreview,
  sellerCategoryListOptions,
  type SellerCategoriesPrintData,
} from "./buildSellerCategoriesPrintPreview";
import {
  buildDocumentsPrintHtml,
  buildDocumentsPrintPreview,
  documentListOptions,
  type DocumentsPrintData,
} from "./buildDocumentsPrintPreview";
import {
  buildSaleConditionsPrintHtml,
  buildSaleConditionsPrintPreview,
  saleConditionListOptions,
  type SaleConditionsPrintData,
} from "./buildSaleConditionsPrintPreview";
import {
  buildEmissionPointsPrintHtml,
  buildEmissionPointsPrintPreview,
  emissionPointListOptions,
  type EmissionPointsPrintData,
} from "./buildEmissionPointsPrintPreview";
import { vehicleListOptions, buildVehiclesPrintPreview, buildVehiclesPrintHtml, type VehiclesPrintData } from "./buildVehiclesPrintPreview";
import {
  warehouseListOptions,
  type WarehousesPrintData,
  buildWarehousesPrintPreview,
  buildWarehousesPrintHtml,
} from "./buildWarehousesPrintPreview";
import { buildExcelListReportContent } from "./exportExcelTemplate";
import {
  buildExportColumnsFromFields,
  type SelectedExportField,
} from "./exportFieldCatalogs";

export type ListExcelExportOptions = {
  hideGridlines?: boolean;
  exportFields?: SelectedExportField[];
};

function pxToExcelWidth(widthPx: number): number {
  return Math.min(Math.max(Math.round(widthPx * 0.85), 48), 320);
}

function columnWidthsForExport(table: ReturnType<typeof buildListExportTableData>): number[] {
  return table.headers.map((header, index) => {
    const maxChars = Math.max(
      header.length,
      ...table.rows.map((row) => (row[index] ?? "").length),
    );
    const fromPx = pxToExcelWidth(table.columnWidthsPx[index] ?? 80);
    const fromContent = Math.min(Math.max(Math.round(maxChars * 6.5), 48), 420);
    return Math.max(fromPx, fromContent);
  });
}

function toExcelContent(
  table: ReturnType<typeof buildListExportTableData>,
  excelOptions?: ListExcelExportOptions,
): string {
  return buildExcelListReportContent({
    sheetName: table.sheetName,
    title: table.title,
    metaLines: table.metaLines,
    headers: table.headers,
    rows: table.rows,
    rightAlignIndices: table.rightAlignIndices,
    columnWidths: columnWidthsForExport(table),
    footerLine: table.footerLine,
    hideGridlines: excelOptions?.hideGridlines,
  });
}

function withExportColumns<T extends string, R extends Record<T, string | number | boolean>>(
  options: BuildListPrintPreviewOptions<T, R> & { sheetName: string },
  excelOptions?: ListExcelExportOptions,
): BuildListPrintPreviewOptions<T, R> & { sheetName: string } {
  if (!excelOptions?.exportFields?.length) return options;
  const columns = buildExportColumnsFromFields(options.defaultColumns, excelOptions.exportFields);
  if (columns.length === 0) return options;
  return { ...options, columns };
}

export function getWarehousesListXlsContent(
  data: WarehousesPrintData,
  excelOptions?: ListExcelExportOptions,
): string {
  return toExcelContent(
    buildListExportTableData(
      withExportColumns({ ...warehouseListOptions(data), sheetName: "Almacenes" }, excelOptions),
    ),
    excelOptions,
  );
}

export function getCarriersListXlsContent(
  data: CarriersPrintData,
  excelOptions?: ListExcelExportOptions,
): string {
  return toExcelContent(
    buildListExportTableData(
      withExportColumns({ ...carrierListOptions(data), sheetName: "Transportistas" }, excelOptions),
    ),
    excelOptions,
  );
}

export function getVehiclesListXlsContent(
  data: VehiclesPrintData,
  excelOptions?: ListExcelExportOptions,
): string {
  return toExcelContent(
    buildListExportTableData(
      withExportColumns({ ...vehicleListOptions(data), sheetName: "Vehiculos" }, excelOptions),
    ),
    excelOptions,
  );
}

export function getDriversListXlsContent(
  data: DriversPrintData,
  excelOptions?: ListExcelExportOptions,
): string {
  return toExcelContent(
    buildListExportTableData(
      withExportColumns({ ...driverListOptions(data), sheetName: "Choferes" }, excelOptions),
    ),
    excelOptions,
  );
}

export function getSellersListXlsContent(
  data: SellersPrintData,
  excelOptions?: ListExcelExportOptions,
): string {
  return toExcelContent(
    buildListExportTableData(
      withExportColumns({ ...sellerListOptions(data), sheetName: "Vendedores" }, excelOptions),
    ),
    excelOptions,
  );
}

export function getSellerCategoriesListXlsContent(
  data: SellerCategoriesPrintData,
  excelOptions?: ListExcelExportOptions,
): string {
  return toExcelContent(
    buildListExportTableData(
      withExportColumns({ ...sellerCategoryListOptions(data), sheetName: "Categorias" }, excelOptions),
    ),
    excelOptions,
  );
}

export function getWarehousesListDocumentHtml(data: WarehousesPrintData): string {
  return buildWarehousesPrintHtml(data);
}

export function getCarriersListDocumentHtml(data: CarriersPrintData): string {
  return buildCarriersPrintHtml(data);
}

export function getVehiclesListDocumentHtml(data: VehiclesPrintData): string {
  return buildVehiclesPrintHtml(data);
}

export function getDriversListDocumentHtml(data: DriversPrintData): string {
  return buildDriversPrintHtml(data);
}

export function getSellersListDocumentHtml(data: SellersPrintData): string {
  return buildSellersPrintHtml(data);
}

export function getSellerCategoriesListDocumentHtml(data: SellerCategoriesPrintData): string {
  return buildSellerCategoriesPrintHtml(data);
}

export function getDocumentsListXlsContent(
  data: DocumentsPrintData,
  excelOptions?: ListExcelExportOptions,
): string {
  return toExcelContent(
    buildListExportTableData(
      withExportColumns({ ...documentListOptions(data), sheetName: "Documentos" }, excelOptions),
    ),
    excelOptions,
  );
}

export function getDocumentsListDocumentHtml(data: DocumentsPrintData): string {
  return buildDocumentsPrintHtml(data);
}

export function getSaleConditionsListXlsContent(
  data: SaleConditionsPrintData,
  excelOptions?: ListExcelExportOptions,
): string {
  return toExcelContent(
    buildListExportTableData(
      withExportColumns({ ...saleConditionListOptions(data), sheetName: "CondicionesVenta" }, excelOptions),
    ),
    excelOptions,
  );
}

export function getSaleConditionsListDocumentHtml(data: SaleConditionsPrintData): string {
  return buildSaleConditionsPrintHtml(data);
}

export function getEmissionPointsListXlsContent(
  data: EmissionPointsPrintData,
  excelOptions?: ListExcelExportOptions,
): string {
  return toExcelContent(
    buildListExportTableData(
      withExportColumns({ ...emissionPointListOptions(data), sheetName: "PuntosEmision" }, excelOptions),
    ),
    excelOptions,
  );
}

export function getEmissionPointsListDocumentHtml(data: EmissionPointsPrintData): string {
  return buildEmissionPointsPrintHtml(data);
}

const LIST_WORD_OPTIONS = { pageOrientation: "landscape" as const };

export function getWarehousesListWordHtml(data: WarehousesPrintData): string {
  return prepareListWordExportHtml(
    buildWarehousesPrintPreview(data),
    "Listado de Almacenes",
    LIST_WORD_OPTIONS,
  );
}

export function getCarriersListWordHtml(data: CarriersPrintData): string {
  return prepareListWordExportHtml(
    buildCarriersPrintPreview(data),
    "Listado de Transportistas",
    LIST_WORD_OPTIONS,
  );
}

export function getVehiclesListWordHtml(data: VehiclesPrintData): string {
  return prepareListWordExportHtml(
    buildVehiclesPrintPreview(data),
    "Listado de Vehículos",
    LIST_WORD_OPTIONS,
  );
}

export function getDriversListWordHtml(data: DriversPrintData): string {
  return prepareListWordExportHtml(
    buildDriversPrintPreview(data),
    "Listado de Choferes",
    LIST_WORD_OPTIONS,
  );
}

export function getSellersListWordHtml(data: SellersPrintData): string {
  return prepareListWordExportHtml(
    buildSellersPrintPreview(data),
    "Listado de Vendedores",
    LIST_WORD_OPTIONS,
  );
}

export function getSellerCategoriesListWordHtml(data: SellerCategoriesPrintData): string {
  return prepareListWordExportHtml(
    buildSellerCategoriesPrintPreview(data),
    data.reportTitle ?? "Tabla de Categoria de Vendedores",
    LIST_WORD_OPTIONS,
  );
}

export function getDocumentsListWordHtml(data: DocumentsPrintData): string {
  return prepareListWordExportHtml(buildDocumentsPrintPreview(data), "Documentos", LIST_WORD_OPTIONS);
}

export function getSaleConditionsListWordHtml(data: SaleConditionsPrintData): string {
  return prepareListWordExportHtml(
    buildSaleConditionsPrintPreview(data),
    "Condiciones de venta",
    LIST_WORD_OPTIONS,
  );
}

export function getEmissionPointsListWordHtml(data: EmissionPointsPrintData): string {
  return prepareListWordExportHtml(
    buildEmissionPointsPrintPreview(data),
    "Puntos de emisión de documentos",
    LIST_WORD_OPTIONS,
  );
}

/** HTML para imprimir / PDF / HTML. Almacenes: monoespaciado; demás listados: plantilla tabular. */
export function getListReportHtml(options: {
  warehousesData?: WarehousesPrintData;
  carriersData?: CarriersPrintData;
  vehiclesData?: VehiclesPrintData;
  driversData?: DriversPrintData;
  sellersData?: SellersPrintData;
  sellerCategoriesData?: SellerCategoriesPrintData;
  documentsData?: DocumentsPrintData;
  saleConditionsData?: SaleConditionsPrintData;
  emissionPointsData?: EmissionPointsPrintData;
}): string {
  const {
    warehousesData,
    carriersData,
    vehiclesData,
    driversData,
    sellersData,
    sellerCategoriesData,
    documentsData,
    saleConditionsData,
    emissionPointsData,
  } = options;
  if (warehousesData) return getWarehousesListDocumentHtml(warehousesData);
  if (carriersData) return getCarriersListDocumentHtml(carriersData);
  if (vehiclesData) return getVehiclesListDocumentHtml(vehiclesData);
  if (driversData) return getDriversListDocumentHtml(driversData);
  if (sellersData) return getSellersListDocumentHtml(sellersData);
  if (sellerCategoriesData) return getSellerCategoriesListDocumentHtml(sellerCategoriesData);
  if (documentsData) return getDocumentsListDocumentHtml(documentsData);
  if (saleConditionsData) return getSaleConditionsListDocumentHtml(saleConditionsData);
  if (emissionPointsData) return getEmissionPointsListDocumentHtml(emissionPointsData);
  return "";
}

export function getListReportWordHtml(options: {
  warehousesData?: WarehousesPrintData;
  carriersData?: CarriersPrintData;
  vehiclesData?: VehiclesPrintData;
  driversData?: DriversPrintData;
  sellersData?: SellersPrintData;
  sellerCategoriesData?: SellerCategoriesPrintData;
  documentsData?: DocumentsPrintData;
  saleConditionsData?: SaleConditionsPrintData;
  emissionPointsData?: EmissionPointsPrintData;
}): string {
  const {
    warehousesData,
    carriersData,
    vehiclesData,
    driversData,
    sellersData,
    sellerCategoriesData,
    documentsData,
    saleConditionsData,
    emissionPointsData,
  } = options;
  if (warehousesData) return getWarehousesListWordHtml(warehousesData);
  if (carriersData) return getCarriersListWordHtml(carriersData);
  if (vehiclesData) return getVehiclesListWordHtml(vehiclesData);
  if (driversData) return getDriversListWordHtml(driversData);
  if (sellersData) return getSellersListWordHtml(sellersData);
  if (sellerCategoriesData) return getSellerCategoriesListWordHtml(sellerCategoriesData);
  if (documentsData) return getDocumentsListWordHtml(documentsData);
  if (saleConditionsData) return getSaleConditionsListWordHtml(saleConditionsData);
  if (emissionPointsData) return getEmissionPointsListWordHtml(emissionPointsData);
  return "";
}
