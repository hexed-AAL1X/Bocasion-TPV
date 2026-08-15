import type { ExportFileKind } from "../components/PrintPropertiesDialog/exportFileConfig";
import { EXPORT_FILE_CONFIG } from "../components/PrintPropertiesDialog/exportFileConfig";
import type { CarriersPrintData } from "./buildCarriersPrintPreview";
import type { DriversPrintData } from "./buildDriversPrintPreview";
import type { SellersPrintData } from "./buildSellersPrintPreview";
import type { SellerCategoriesPrintData } from "./buildSellerCategoriesPrintPreview";
import type { DocumentsPrintData } from "./buildDocumentsPrintPreview";
import type { SaleConditionsPrintData } from "./buildSaleConditionsPrintPreview";
import type { EmissionPointsPrintData } from "./buildEmissionPointsPrintPreview";
import type { VehiclesPrintData } from "./buildVehiclesPrintPreview";
import type { WarehousesPrintData } from "./buildWarehousesPrintPreview";
import { buildExportFilename } from "./exportFileHelpers";
import { requireElectronExport } from "./electronExport";
import {
  getCarriersListDocumentHtml,
  getCarriersListXlsContent,
  getDriversListDocumentHtml,
  getDriversListXlsContent,
  getListReportWordHtml,
  getSellersListDocumentHtml,
  getSellersListXlsContent,
  getSellerCategoriesListDocumentHtml,
  getSellerCategoriesListXlsContent,
  getDocumentsListDocumentHtml,
  getDocumentsListXlsContent,
  getSaleConditionsListDocumentHtml,
  getSaleConditionsListXlsContent,
  getEmissionPointsListDocumentHtml,
  getEmissionPointsListXlsContent,
  getVehiclesListDocumentHtml,
  getVehiclesListXlsContent,
  getWarehousesListDocumentHtml,
  getWarehousesListXlsContent,
  type ListExcelExportOptions,
} from "./exportListPrintXls";
import { downloadBlob, openBlobUrl, openReportPrintWindow } from "./salesReportDocument";

export type RunListPrintExportOptions = {
  kind: ExportFileKind;
  reportHtml: string;
  listPlainText: string;
  warehousesData?: WarehousesPrintData;
  carriersData?: CarriersPrintData;
  vehiclesData?: VehiclesPrintData;
  driversData?: DriversPrintData;
  sellersData?: SellersPrintData;
  sellerCategoriesData?: SellerCategoriesPrintData;
  documentsData?: DocumentsPrintData;
  saleConditionsData?: SaleConditionsPrintData;
  emissionPointsData?: EmissionPointsPrintData;
  fileName: string;
  saveDirectory: string;
  viewAfter: boolean;
  browserDirectoryHandle?: FileSystemDirectoryHandle | null;
  excelOptions?: ListExcelExportOptions;
};

function getDocumentHtml(options: RunListPrintExportOptions): string {
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
    reportHtml,
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
  return reportHtml;
}

function getWordHtml(options: RunListPrintExportOptions): string {
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
    reportHtml,
  } = options;
  if (
    warehousesData ||
    carriersData ||
    vehiclesData ||
    driversData ||
    sellersData ||
    sellerCategoriesData ||
    documentsData ||
    saleConditionsData ||
    emissionPointsData
  ) {
    return getListReportWordHtml({
      warehousesData,
      carriersData,
      vehiclesData,
      driversData,
      sellersData,
      sellerCategoriesData,
      documentsData,
      saleConditionsData,
      emissionPointsData,
    });
  }
  return reportHtml;
}

function getTextContent(options: RunListPrintExportOptions): string {
  const {
    kind,
    reportHtml,
    listPlainText,
    warehousesData,
    carriersData,
    vehiclesData,
    driversData,
    sellersData,
    sellerCategoriesData,
    documentsData,
    saleConditionsData,
    emissionPointsData,
    excelOptions,
  } = options;

  switch (kind) {
    case "excel":
      if (warehousesData) return getWarehousesListXlsContent(warehousesData, excelOptions);
      if (carriersData) return getCarriersListXlsContent(carriersData, excelOptions);
      if (vehiclesData) return getVehiclesListXlsContent(vehiclesData, excelOptions);
      if (driversData) return getDriversListXlsContent(driversData, excelOptions);
      if (sellersData) return getSellersListXlsContent(sellersData, excelOptions);
      if (sellerCategoriesData) return getSellerCategoriesListXlsContent(sellerCategoriesData, excelOptions);
      if (documentsData) return getDocumentsListXlsContent(documentsData, excelOptions);
      if (saleConditionsData) return getSaleConditionsListXlsContent(saleConditionsData, excelOptions);
      if (emissionPointsData) return getEmissionPointsListXlsContent(emissionPointsData, excelOptions);
      return listPlainText;
    case "word":
    case "html":
      if (
        warehousesData ||
        carriersData ||
        vehiclesData ||
        driversData ||
        sellersData ||
        sellerCategoriesData ||
        documentsData ||
        saleConditionsData ||
        emissionPointsData
      ) {
        return getDocumentHtml(options);
      }
      return reportHtml;
    case "txtData":
    case "txt":
      return listPlainText;
    default:
      return "";
  }
}

function getTextMime(kind: ExportFileKind): string {
  switch (kind) {
    case "excel":
      return "application/vnd.ms-excel;charset=utf-8";
    case "word":
      return "application/msword";
    case "txtData":
    case "txt":
      return "text/plain;charset=utf-8";
    case "html":
      return "text/html;charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

export async function runListPrintExport(
  options: RunListPrintExportOptions,
): Promise<string | null> {
  const { kind, reportHtml, fileName, saveDirectory, viewAfter, browserDirectoryHandle } = options;
  const config = EXPORT_FILE_CONFIG[kind];
  const filename = buildExportFilename(fileName, config.extension);
  const api = window.bocasoft;

  if (kind === "dbf") {
    throw new Error("El formato DBF no está disponible para listados.");
  }

  if (kind === "pdf") {
    const pdfHtml =
      options.warehousesData || options.carriersData || options.vehiclesData || options.driversData || options.sellersData || options.sellerCategoriesData || options.documentsData || options.saleConditionsData || options.emissionPointsData
        ? getDocumentHtml(options)
        : reportHtml;
    if (typeof api?.platform === "string" && !api?.exportPdfFile) {
      throw new Error("La exportación a PDF no está disponible. Reinicie la aplicación Electron.");
    }
    if (api?.exportPdfFile) {
      return api.exportPdfFile({ directory: saveDirectory, filename, html: pdfHtml });
    }
    const win = openReportPrintWindow(pdfHtml, { preview: viewAfter, autoPrint: !viewAfter });
    if (!win) throw new Error("No se pudo abrir el diálogo de PDF");
    return null;
  }

  requireElectronExport();

  const listDocumentHtml =
    options.warehousesData || options.carriersData || options.vehiclesData || options.driversData || options.sellersData || options.sellerCategoriesData || options.documentsData || options.saleConditionsData || options.emissionPointsData
      ? getDocumentHtml(options)
      : reportHtml;

  if ((kind === "jpg" || kind === "png") && api?.exportReportImage) {
    return api.exportReportImage({
      directory: saveDirectory,
      filename,
      html: listDocumentHtml,
      format: kind === "jpg" ? "jpeg" : "png",
    });
  }

  if (kind === "word") {
    if (!api?.exportWordFile) {
      throw new Error("La exportación a Word no está disponible. Reinicie la aplicación Electron.");
    }
    return api.exportWordFile({
      directory: saveDirectory,
      filename,
      html: getWordHtml(options),
    });
  }

  const textKinds: ExportFileKind[] = ["excel", "txtData", "txt", "html"];
  if (api?.saveExportFile && textKinds.includes(kind)) {
    const content = getTextContent(options);
    return api.saveExportFile({ directory: saveDirectory, filename, content });
  }

  if (browserDirectoryHandle && textKinds.includes(kind)) {
    const content = getTextContent(options);
    const mime = getTextMime(kind);
    const fileHandle = await browserDirectoryHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(new Blob([content], { type: mime }));
    await writable.close();
    return `${browserDirectoryHandle.name}\\${filename}`;
  }

  if (textKinds.includes(kind)) {
    const content = getTextContent(options);
    const mime = getTextMime(kind);
    const url = downloadBlob(content, filename, mime);
    if (viewAfter) openBlobUrl(url);
    return filename;
  }

  if (kind === "jpg" || kind === "png") {
    throw new Error(
      "La exportación a imagen no está disponible. Reinicie la aplicación Electron.",
    );
  }

  throw new Error(`Formato de exportación no soportado: ${kind}`);
}
