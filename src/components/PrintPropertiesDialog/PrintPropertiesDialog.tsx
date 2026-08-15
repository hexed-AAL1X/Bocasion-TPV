import {useCallback, useEffect, useMemo, useState, useRef } from "react";
import type { PrinterInfoLite } from "../../types/printer";
import type { PrintPreviewMeta } from "../../utils/buildThermalPrintPreview";
import {
  buildThermalPrintPreview,
  previewRowsToPlainText,
} from "../../utils/buildThermalPrintPreview";
import {
  buildDocsAnnexPlainText,
  buildDocsAnnexPrintPreview,
  type DocsAnnexPrintData,
} from "../../utils/buildDocsAnnexPrintPreview";
import {
  buildCarriersPlainText,
  type CarriersPrintData,
} from "../../utils/buildCarriersPrintPreview";
import {
  buildWarehousesPlainText,
  type WarehousesPrintData,
} from "../../utils/buildWarehousesPrintPreview";
import {
  buildVehiclesPlainText,
  type VehiclesPrintData,
} from "../../utils/buildVehiclesPrintPreview";
import {
  buildDriversPlainText,
  type DriversPrintData,
} from "../../utils/buildDriversPrintPreview";
import {
  buildSellersPlainText,
  type SellersPrintData,
} from "../../utils/buildSellersPrintPreview";
import {
  buildSellerCategoriesPlainText,
  type SellerCategoriesPrintData,
} from "../../utils/buildSellerCategoriesPrintPreview";
import {
  buildDocumentsPlainText,
  type DocumentsPrintData,
} from "../../utils/buildDocumentsPrintPreview";
import {
  buildSaleConditionsPlainText,
  type SaleConditionsPrintData,
} from "../../utils/buildSaleConditionsPrintPreview";
import {
  buildEmissionPointsPlainText,
  type EmissionPointsPrintData,
} from "../../utils/buildEmissionPointsPrintPreview";
import { getListReportHtml } from "../../utils/exportListPrintXls";
import type { SalesReportExportData } from "../../utils/exportSalesReportXls";
import { defaultPrinterName, findPrinter, loadSystemPrinters } from "../../utils/loadSystemPrinters";
import { isLikelyThermalPrinter } from "../../utils/printerKind";
import { buildSalesReportHtml, openReportPrintWindow } from "../../utils/salesReportDocument";
import { buildPrintReceiptHtml } from "../../utils/thermalPrintLayout";
import {
  getPrintLayoutContext,
  loadPrintLayoutSettings,
} from "../../services/printLayoutSettings";
import { runDocsAnnexExport } from "../../utils/runDocsAnnexExport";
import { runListPrintExport } from "../../utils/runListPrintExport";
import { runSalesReportExport } from "../../utils/runSalesReportExport";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { PageSetupDialog, type PageSetupSettings } from "../PrintPreviewDialog/PageSetupDialog";
import { PrintPreviewDialog } from "../PrintPreviewDialog/PrintPreviewDialog";
import type { ExportFileKind } from "./exportFileConfig";
import { ExportFileDialog, type ExportFileOptions } from "./ExportFileDialog";
import { ExportExcelDialog } from "./ExportExcelDialog";
import { EmailClientPickerDialog } from "./EmailClientPickerDialog";
import { ExportSplitButton } from "./ExportSplitButton";
import { PrinterDialog } from "./PrinterDialog";
import { WinSelect } from "../WinSelect/WinSelect";
import {
  CopiesActionIcon,
  EmailActionIcon,
  ExitActionIcon,
  ExportActionIcon,
  HtmlActionIcon,
  PdfActionIcon,
  PreviewActionIcon,
  PRINT_FORMATS,
  PrintActionIcon,
  TxtActionIcon,
  type PrintFormatId,
} from "./printDialogIcons";
import styles from "./PrintPropertiesDialog.module.css";

const DEFAULT_PAGE_SETUP: PageSetupSettings = {
  paperSize: "carta",
  orientation: "portrait",
  margins: { left: 12, right: 12, top: 12, bottom: 12 },
  pageWidthPx: 320,
};

type Props = {
  reportData?: SalesReportExportData;
  previewMeta?: PrintPreviewMeta;
  annexData?: DocsAnnexPrintData;
  warehousesData?: WarehousesPrintData;
  carriersData?: CarriersPrintData;
  vehiclesData?: VehiclesPrintData;
  driversData?: DriversPrintData;
  sellersData?: SellersPrintData;
  sellerCategoriesData?: SellerCategoriesPrintData;
  documentsData?: DocumentsPrintData;
  saleConditionsData?: SaleConditionsPrintData;
  emissionPointsData?: EmissionPointsPrintData;
  onClose: () => void;
};

export function PrintPropertiesDialog({
  reportData,
  previewMeta,
  annexData,
  warehousesData,
  carriersData,
  vehiclesData,
  driversData,
  sellersData,
  sellerCategoriesData,
  documentsData,
  saleConditionsData,
  emissionPointsData,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, { panelRef });
  const [showPreview, setShowPreview] = useState(false);
  const [showPageSetup, setShowPageSetup] = useState(false);
  const [showPrinterDialog, setShowPrinterDialog] = useState(false);
  const [exportKind, setExportKind] = useState<ExportFileKind | null>(null);
  const [emailPickerState, setEmailPickerState] = useState<{
    subject: string;
    body: string;
    attachmentPath?: string | null;
  } | null>(null);
  const [printerInfos, setPrinterInfos] = useState<PrinterInfoLite[]>([]);
  const [printer, setPrinter] = useState("");
  const [pageSetup, setPageSetup] = useState<PageSetupSettings>(DEFAULT_PAGE_SETUP);
  const [printFormat, setPrintFormat] = useState<PrintFormatId>("borrador");
  const [pageMode, setPageMode] = useState<"all" | "range">("all");
  const [pageFrom, setPageFrom] = useState(1);
  const [pageTo, setPageTo] = useState(9999);
  const [copies, setCopies] = useState(1);
  const [progress, setProgress] = useState("");
  const [busy, setBusy] = useState(false);
  const [printLayoutVersion, setPrintLayoutVersion] = useState(0);

  const isWarehouses = Boolean(warehousesData);
  const isCarriers = Boolean(carriersData);
  const isVehicles = Boolean(vehiclesData);
  const isDrivers = Boolean(driversData);
  const isSellers = Boolean(sellersData);
  const isSellerCategories = Boolean(sellerCategoriesData);
  const isDocuments = Boolean(documentsData);
  const isSaleConditions = Boolean(saleConditionsData);
  const isEmissionPoints = Boolean(emissionPointsData);
  const isListPrint = isWarehouses || isCarriers || isVehicles || isDrivers || isSellers || isSellerCategories || isDocuments || isSaleConditions || isEmissionPoints;
  const isAnnex = Boolean(annexData) && !isListPrint;
  const printLayoutContext = getPrintLayoutContext(isListPrint, isAnnex);
  const isThermalSalesReport = Boolean(reportData && previewMeta) && !isListPrint && !isAnnex;

  const thermalPlainText = useMemo(() => {
    if (!reportData || !previewMeta || isListPrint || isAnnex) return undefined;
    return previewRowsToPlainText(buildThermalPrintPreview(reportData, previewMeta));
  }, [annexData, isAnnex, isListPrint, previewMeta, reportData]);

  const buildReportHtml = useCallback(() => {
    if (isListPrint) {
      return getListReportHtml({
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

    const printLayout = loadPrintLayoutSettings(printLayoutContext);

    if (annexData) {
      return buildPrintReceiptHtml(buildDocsAnnexPrintPreview(annexData), {
        fontSettings: printLayout.fontSettings,
        lineSpacing: printLayout.lineSpacing,
        wideLayout: true,
      });
    }
    if (reportData && previewMeta) {
      return buildPrintReceiptHtml(buildThermalPrintPreview(reportData, previewMeta), {
        fontSettings: printLayout.fontSettings,
        lineSpacing: printLayout.lineSpacing,
      });
    }
    return buildSalesReportHtml(reportData!);
  }, [
    annexData,
    carriersData,
    documentsData,
    saleConditionsData,
    emissionPointsData,
    driversData,
    isListPrint,
    previewMeta,
    printLayoutContext,
    reportData,
    sellerCategoriesData,
    sellersData,
    vehiclesData,
    warehousesData,
    printLayoutVersion,
  ]);

  const reportHtml = useMemo(() => buildReportHtml(), [buildReportHtml]);
  const listPlainText = useMemo(() => {
    if (warehousesData) return buildWarehousesPlainText(warehousesData);
    if (carriersData) return buildCarriersPlainText(carriersData);
    if (vehiclesData) return buildVehiclesPlainText(vehiclesData);
    if (driversData) return buildDriversPlainText(driversData);
    if (sellersData) return buildSellersPlainText(sellersData);
    if (sellerCategoriesData) return buildSellerCategoriesPlainText(sellerCategoriesData);
    if (documentsData) return buildDocumentsPlainText(documentsData);
    if (saleConditionsData) return buildSaleConditionsPlainText(saleConditionsData);
    if (emissionPointsData) return buildEmissionPointsPlainText(emissionPointsData);
    return "";
  }, [warehousesData, carriersData, vehiclesData, driversData, sellersData, sellerCategoriesData, documentsData, saleConditionsData, emissionPointsData]);
  const annexPlainText = useMemo(
    () => (annexData ? buildDocsAnnexPlainText(annexData) : ""),
    [annexData],
  );
  const saleDateLabel = isWarehouses
    ? "Listado de Almacenes"
    : isCarriers
      ? "Listado de Transportistas"
      : isVehicles
        ? `Listado de Vehículos — ${vehiclesData!.carrierName}`
        : isDrivers
          ? `Listado de Choferes — ${driversData!.carrierName}`
          : isSellers
            ? "Listado de Vendedores"
            : isSellerCategories
              ? (sellerCategoriesData?.reportTitle ?? "Tabla de Categoria de Vendedores")
              : isDocuments
                ? "Documentos"
                : isSaleConditions
                  ? "Condiciones de venta"
                  : isEmissionPoints
                    ? "Puntos de emisión de documentos"
                    : (annexData?.saleDate ?? reportData!.saleDate);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (exportKind) {
        setExportKind(null);
        return;
      }
      if (showPageSetup) {
        setShowPageSetup(false);
        return;
      }
      if (showPrinterDialog) {
        setShowPrinterDialog(false);
        return;
      }
      if (showPreview) {
        setShowPreview(false);
        return;
      }
      requestClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [exportKind, requestClose, showPageSetup, showPrinterDialog, showPreview]);

  const refreshPrinters = useCallback(async () => {
    const list = await loadSystemPrinters();
    setPrinterInfos(list);
    setPrinter((current) => {
      if (current && list.some((p) => p.name === current)) return current;
      return defaultPrinterName(list);
    });
  }, []);

  useEffect(() => {
    void refreshPrinters();
  }, [refreshPrinters]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshPrinters();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [refreshPrinters]);

  const openPrinterDialog = () => {
    void refreshPrinters().then(() => setShowPrinterDialog(true));
  };

  const runWithProgress = useCallback(async (label: string, action: () => void | Promise<void>) => {
    setBusy(true);
    setProgress(label);
    try {
      await action();
      setProgress("Listo");
    } catch (err) {
      setProgress("Error");
      const detail = err instanceof Error ? err.message : "";
      window.setTimeout(() => {
        window.alert(
          detail
            ? `No se pudo completar la operación.\n\n${detail}`
            : "No se pudo completar la operación.",
        );
      }, 150);
    } finally {
      window.setTimeout(() => {
        setBusy(false);
        setProgress("");
      }, 1200);
    }
  }, []);

  const handlePrint = () => {
    void runWithProgress("Imprimiendo…", async () => {
      let html = buildReportHtml();
      const selectedPrinter = findPrinter(printerInfos, printer) ?? printerInfos[0];
      const printerLabel = selectedPrinter?.name ?? printer;
      const useThermalPath =
        isThermalSalesReport &&
        isLikelyThermalPrinter(printerLabel, selectedPrinter?.description);
      const officePrint = isThermalSalesReport && !useThermalPath;

      if (officePrint && reportData && previewMeta) {
        const printLayout = loadPrintLayoutSettings(printLayoutContext);
        html = buildPrintReceiptHtml(buildThermalPrintPreview(reportData, previewMeta), {
          fontSettings: printLayout.fontSettings,
          lineSpacing: printLayout.lineSpacing,
          officePrint: true,
        });
      }

      const api = window.bocasoft;
      if (api?.printReport) {
        await api.printReport({
          html,
          plainText: thermalPlainText,
          copies,
          printerName: printerLabel,
          continuousThermal: useThermalPath,
          officePrint,
        });
        return;
      }
      const win = openReportPrintWindow(html, { autoPrint: true });
      if (!win) throw new Error("No se pudo abrir la ventana de impresión");
    });
  };

  const handlePreview = () => {
    setShowPreview(true);
    setProgress("Vista preliminar abierta");
    window.setTimeout(() => setProgress(""), 1500);
  };

  const runExport = useCallback(
    async (kind: ExportFileKind, options: ExportFileOptions) => {
      if (isListPrint) {
        const savedPath = await runListPrintExport({
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
          fileName: options.fileName,
          saveDirectory: options.saveDirectory,
          viewAfter: options.viewAfter,
          browserDirectoryHandle: options.browserDirectoryHandle,
          excelOptions:
            kind === "excel"
              ? {
                  hideGridlines: options.hideGridlines,
                  exportFields: options.exportFields,
                }
              : undefined,
        });
        const label = savedPath ?? options.fileName;
        setProgress(`Exportado: ${label}`);
        window.setTimeout(() => setProgress(""), 1500);
        return savedPath;
      }

      const savedPath = isAnnex
        ? await runDocsAnnexExport({
            kind,
            annexData: annexData!,
            reportHtml,
            annexPlainText,
            fileName: options.fileName,
            saveDirectory: options.saveDirectory,
            viewAfter: options.viewAfter,
            browserDirectoryHandle: options.browserDirectoryHandle,
          })
        : await runSalesReportExport({
            kind,
            reportData: reportData!,
            reportHtml,
            fileName: options.fileName,
            saveDirectory: options.saveDirectory,
            viewAfter: options.viewAfter,
            browserDirectoryHandle: options.browserDirectoryHandle,
          });

      const label = savedPath ?? options.fileName;
      setProgress(`Exportado: ${label}`);
      window.setTimeout(() => setProgress(""), 1500);
      return savedPath;
    },
    [annexData, annexPlainText, carriersData, driversData, sellersData, sellerCategoriesData, documentsData, saleConditionsData, emissionPointsData, isAnnex, isListPrint, reportData, reportHtml, listPlainText, vehiclesData, warehousesData],
  );

  const openExportDialog = (kind: ExportFileKind) => setExportKind(kind);

  const handleSendEmail = useCallback(
    (savedPath?: string | null) => {
      const subject = isWarehouses
        ? "Listado de Almacenes"
        : isCarriers
          ? "Listado de Transportistas"
          : isVehicles
            ? `Listado de Vehículos — ${vehiclesData!.carrierName}`
            : isDrivers
              ? `Listado de Choferes — ${driversData!.carrierName}`
              : isSellers
                ? "Listado de Vendedores"
                : isAnnex
                ? `Anexo de documentos — ${saleDateLabel}`
                : `Cierre de Caja — ${saleDateLabel}`;
      const bodyText = isWarehouses
        ? "Adjunto listado de almacenes."
        : isCarriers
          ? "Adjunto listado de transportistas."
          : isVehicles
            ? `Adjunto listado de vehículos.\n\nTransportista: ${vehiclesData!.carrierName}`
            : isDrivers
              ? `Adjunto listado de choferes.\n\nTransportista: ${driversData!.carrierName}`
              : isSellers
                ? "Adjunto listado de vendedores."
                : isAnnex
                ? `Adjunto anexo de documentos de liquidación.\n\nTienda: ${annexData!.branch}\nCaja: ${annexData!.point}\nFecha: ${saleDateLabel}`
                : `Adjunto reporte de cierre de caja.\n\nTienda: ${reportData!.vendorLabel}\nFecha: ${saleDateLabel}\nTotal: S/ ${reportData!.grandTotal.toFixed(2)}`;

      setEmailPickerState({
        subject,
        body: bodyText,
        attachmentPath: savedPath ?? null,
      });
    },
    [annexData, driversData, isAnnex, isCarriers, isDrivers, isSellers, isVehicles, isWarehouses, reportData, saleDateLabel, vehiclesData],
  );

  const printerOptions = useMemo(
    () => printerInfos.map((p) => ({ value: p.name, label: p.name })),
    [printerInfos],
  );

  const formatOptions = useMemo(
    () => PRINT_FORMATS.map((f) => ({ value: f.value, label: f.label })),
    [],
  );

  const activePrinter = useMemo(
    () => findPrinter(printerInfos, printer) ?? printerInfos[0],
    [printerInfos, printer],
  );
  const printerStatus = activePrinter?.status ?? "Listo";
  const orientationLabel = pageSetup.orientation === "portrait" ? "Vertical" : "Horizontal";

  return (
    <div className={styles.overlay} {...overlayProps} onClick={onBackdropClick} role="presentation">
      <div
          ref={panelRef}
        className={styles.dialog}
        {...panelProps}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="print-props-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h2 id="print-props-title" className={styles.titleText}>
            Propiedades de impresión
          </h2>
          <button type="button" className={styles.titleClose} onClick={requestClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.left}>
            <fieldset className={styles.group}>
              <legend className={styles.groupTitle}>Impresora</legend>
              <div className={styles.printerRow}>
                <label htmlFor="printer-name">Nombre:</label>
                <WinSelect
                  id="printer-name"
                  className={styles.select}
                  value={printer || defaultPrinterName(printerInfos)}
                  options={printerOptions}
                  onChange={(next) => {
                    setPrinter(next);
                    void refreshPrinters();
                  }}
                  disabled={busy || printerInfos.length === 0}
                  aria-label="Impresora"
                />
                <button
                  type="button"
                  className={styles.propsBtn}
                  onClick={() => setShowPageSetup(true)}
                  disabled={busy}
                >
                  Propiedades
                </button>
                <button type="button" className={styles.propsBtn} onClick={openPrinterDialog} disabled={busy}>
                  Impresora…
                </button>
              </div>
              <div className={styles.statusGrid}>
                <span>Estado:</span>
                <span>{printerStatus}</span>
                <span>Color:</span>
                <span>Color</span>
                <span>Orientación:</span>
                <span>{orientationLabel}</span>
              </div>
            </fieldset>

            <fieldset className={styles.group}>
              <legend className={styles.groupTitle}>Formato de impresión</legend>
              <div className={styles.fieldRow}>
                <label htmlFor="print-format">Tipo:</label>
                <WinSelect
                  id="print-format"
                  className={styles.select}
                  value={printFormat}
                  options={formatOptions}
                  onChange={(next) => setPrintFormat(next as PrintFormatId)}
                  disabled={busy}
                  aria-label="Formato de impresión"
                />
              </div>
            </fieldset>

            <div className={styles.progress}>
              <strong>Progreso:</strong> {progress || " "}
            </div>

            <fieldset className={styles.group}>
              <legend className={styles.groupTitle}>Intervalos de impresión</legend>
              <div className={styles.radioGroup}>
                <label className={styles.radioLine}>
                  <input
                    type="radio"
                    name="pages"
                    checked={pageMode === "all"}
                    onChange={() => setPageMode("all")}
                    disabled={busy}
                  />
                  Todas
                </label>
                <label className={styles.radioLine}>
                  <input
                    type="radio"
                    name="pages"
                    checked={pageMode === "range"}
                    onChange={() => setPageMode("range")}
                    disabled={busy}
                  />
                  Páginas de
                  <input
                    type="number"
                    min={1}
                    value={pageFrom}
                    onChange={(e) => setPageFrom(Number(e.target.value) || 1)}
                    disabled={busy || pageMode !== "range"}
                  />
                  a
                  <input
                    type="number"
                    min={1}
                    value={pageTo}
                    onChange={(e) => setPageTo(Number(e.target.value) || 1)}
                    disabled={busy || pageMode !== "range"}
                  />
                </label>
              </div>
            </fieldset>

            <fieldset className={styles.group}>
              <legend className={styles.groupTitle}>Copias</legend>
              <div className={styles.copiesRow}>
                <div className={styles.copiesIcon} aria-hidden>
                  <CopiesActionIcon />
                </div>
                <div className={styles.copiesField}>
                  <label htmlFor="copies">Nº:</label>
                  <input
                    id="copies"
                    type="number"
                    min={1}
                    max={99}
                    value={copies}
                    onChange={(e) => setCopies(Math.max(1, Number(e.target.value) || 1))}
                    disabled={busy}
                  />
                </div>
              </div>
            </fieldset>

            <p className={styles.note}>* Envía el resultado directamente a la impresora seleccionada</p>
          </div>

          <div className={styles.right}>
            <div className={styles.rightPanel}>
              <div className={styles.actionColumn}>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                onClick={handlePrint}
                disabled={busy}
              >
                <span className={styles.actionBtnIcon}>
                  <PrintActionIcon />
                </span>
                Imprimir
              </button>
              <button type="button" className={styles.actionBtn} onClick={handlePreview} disabled={busy}>
                <span className={styles.actionBtnIcon}>
                  <PreviewActionIcon />
                </span>
                Vista preliminar
              </button>

              <fieldset className={styles.exportGroup}>
                <legend className={styles.exportTitle}>
                  <span className={styles.exportTitleIcon}>
                    <ExportActionIcon />
                  </span>
                  Exportar
                </legend>
                <ExportSplitButton disabled={busy} onSelect={openExportDialog} />
                <button type="button" className={styles.exportBtn} onClick={() => openExportDialog("pdf")} disabled={busy}>
                  <span className={styles.exportActionIcon}>
                    <PdfActionIcon />
                  </span>
                  <span className={styles.exportActionLabel}>PDF</span>
                </button>
                <button type="button" className={styles.exportBtn} onClick={() => openExportDialog("html")} disabled={busy}>
                  <span className={styles.exportActionIcon}>
                    <HtmlActionIcon />
                  </span>
                  <span className={styles.exportActionLabel}>HTML</span>
                </button>
                <button type="button" className={styles.exportBtn} onClick={() => openExportDialog("txt")} disabled={busy}>
                  <span className={styles.exportActionIcon}>
                    <TxtActionIcon />
                  </span>
                  <span className={styles.exportActionLabel}>Archivo (TXT)</span>
                </button>
                <button type="button" className={styles.exportBtn} onClick={() => handleSendEmail()} disabled={busy}>
                  <span className={styles.exportActionIcon}>
                    <EmailActionIcon />
                  </span>
                  <span className={styles.exportActionLabel}>Enviar correo…</span>
                </button>
              </fieldset>

              <button type="button" className={styles.exitBtn} onClick={requestClose} disabled={busy}>
                <span className={styles.actionBtnIcon}>
                  <ExitActionIcon />
                </span>
                Salir
              </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPreview && (
        <PrintPreviewDialog
          reportData={reportData}
          meta={previewMeta}
          annexData={annexData}
          warehousesData={warehousesData}
          carriersData={carriersData}
          vehiclesData={vehiclesData}
          driversData={driversData}
          sellersData={sellersData}
          sellerCategoriesData={sellerCategoriesData}
          documentsData={documentsData}
          saleConditionsData={saleConditionsData}
          emissionPointsData={emissionPointsData}
          onClose={() => {
            setShowPreview(false);
            setPrintLayoutVersion((version) => version + 1);
          }}
        />
      )}

      {emailPickerState && (
        <EmailClientPickerDialog
          subject={emailPickerState.subject}
          body={emailPickerState.body}
          attachmentPath={emailPickerState.attachmentPath}
          onWebEmailReady={() => {
            setProgress("Gmail abierto con el adjunto del reporte exportado.");
            window.setTimeout(() => setProgress(""), 8000);
          }}
          onClose={() => setEmailPickerState(null)}
        />
      )}

      {exportKind === "excel" ? (
        <ExportExcelDialog
          saleDate={saleDateLabel}
          exportContext={isListPrint ? "list-print" : isAnnex ? "docs-annex" : "sales-report"}
          listData={{
            documentsData,
            saleConditionsData,
            warehousesData,
            carriersData,
            vehiclesData,
            driversData,
            sellersData,
            sellerCategoriesData,
            emissionPointsData,
          }}
          onClose={() => setExportKind(null)}
          onExport={(options) => runExport("excel", options)}
          onExportEmail={(savedPath) => handleSendEmail(savedPath)}
        />
      ) : exportKind ? (
        <ExportFileDialog
          kind={exportKind}
          saleDate={saleDateLabel}
          exportContext={isListPrint ? "list-print" : isAnnex ? "docs-annex" : "sales-report"}
          onClose={() => setExportKind(null)}
          onExport={(options) => runExport(exportKind, options)}
          onExportEmail={(savedPath) => handleSendEmail(savedPath)}
        />
      ) : null}

      {showPageSetup && (
        <PageSetupDialog
          settings={pageSetup}
          onApply={setPageSetup}
          onClose={() => setShowPageSetup(false)}
        />
      )}

      {showPrinterDialog && printerInfos.length > 0 && (
        <PrinterDialog
          printers={printerInfos}
          selectedName={printer || defaultPrinterName(printerInfos)}
          onApply={setPrinter}
          onClose={() => setShowPrinterDialog(false)}
        />
      )}
    </div>
  );
}
