import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { useCollapsibleBarAnimation } from "../AppDialog/useCollapsibleBarAnimation";
import {
  buildThermalPrintPreview,
  maxPreviewRowChars,
  previewRowsToPlainText,
  type PrintPreviewMeta,
} from "../../utils/buildThermalPrintPreview";
import {
  buildDocsAnnexPrintPreview,
  type DocsAnnexPrintData,
} from "../../utils/buildDocsAnnexPrintPreview";
import {
  buildCarriersPrintPreview,
  type CarriersPrintData,
} from "../../utils/buildCarriersPrintPreview";
import {
  buildWarehousesPrintPreview,
  type WarehousesPrintData,
} from "../../utils/buildWarehousesPrintPreview";
import {
  buildVehiclesPrintPreview,
  type VehiclesPrintData,
} from "../../utils/buildVehiclesPrintPreview";
import {
  buildDriversPrintPreview,
  type DriversPrintData,
} from "../../utils/buildDriversPrintPreview";
import {
  buildSellersPrintPreview,
  type SellersPrintData,
} from "../../utils/buildSellersPrintPreview";
import {
  buildSellerCategoriesPrintPreview,
  type SellerCategoriesPrintData,
} from "../../utils/buildSellerCategoriesPrintPreview";
import {
  buildDocumentsPrintPreview,
  type DocumentsPrintData,
} from "../../utils/buildDocumentsPrintPreview";
import {
  buildSaleConditionsPrintPreview,
  type SaleConditionsPrintData,
} from "../../utils/buildSaleConditionsPrintPreview";
import {
  buildEmissionPointsPrintPreview,
  type EmissionPointsPrintData,
} from "../../utils/buildEmissionPointsPrintPreview";
import { getListReportHtml } from "../../utils/exportListPrintXls";
import { EditPropertiesDialog } from "./EditPropertiesDialog";
import { FontDialog } from "./FontDialog";
import { GoToLineDialog } from "./GoToLineDialog";
import {
  clampPreviewFontSize,
  clampFontSize,
  normalizeFontSettings,
  resolvePreviewFont,
  type FontSettings,
} from "./fontSettings";
import { PageSetupDialog, type PageSetupSettings } from "./PageSetupDialog";
import { ReceiptPreview } from "./ReceiptPreview";
import { ThermalTicketPreview } from "./ThermalTicketPreview";
import type { SalesReportExportData } from "../../utils/exportSalesReportXls";
import { downloadBlob, openReportPrintWindow } from "../../utils/salesReportDocument";
import {
  getPrintLayoutContext,
  loadPrintLayoutSettings,
  savePrintLayoutSettings,
  type PrintLineSpacing,
} from "../../services/printLayoutSettings";
import { buildPrintReceiptHtml, PRINT_LINE_HEIGHT } from "../../utils/thermalPrintLayout";
import styles from "./PrintPreviewDialog.module.css";

type Props = {
  reportData?: SalesReportExportData;
  meta?: PrintPreviewMeta;
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

type OpenMenu = "file" | "edit" | "format" | null;
type LineSpacing = PrintLineSpacing;
type SubDialog = "pageSetup" | "font" | "properties" | "goToLine" | null;

const PageSetupIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden>
    <rect x="2" y="1" width="12" height="14" fill="#fff" stroke="#666" strokeWidth="1" />
    <line x1="4" y1="4" x2="12" y2="4" stroke="#c060c0" strokeWidth="1.5" />
    <line x1="4" y1="7" x2="10" y2="7" stroke="#c060c0" strokeWidth="1" />
    <line x1="4" y1="10" x2="11" y2="10" stroke="#c060c0" strokeWidth="1" />
  </svg>
);

const PrintIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden>
    <rect x="4" y="1" width="8" height="4" fill="#ddd" stroke="#333" strokeWidth="0.8" />
    <rect x="2" y="6" width="12" height="7" fill="#eee" stroke="#333" strokeWidth="0.8" />
    <rect x="5" y="9" width="6" height="4" fill="#fff" stroke="#666" strokeWidth="0.6" />
  </svg>
);

const FindIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden>
    <circle cx="7" cy="7" r="4" fill="none" stroke="#333" strokeWidth="1.2" />
    <line x1="10" y1="10" x2="14" y2="14" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const PropertiesIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden>
    <rect x="3" y="2" width="10" height="12" fill="#fff" stroke="#333" strokeWidth="0.8" />
    <path d="M5 6h6M5 9h4" stroke="#666" strokeWidth="0.8" />
  </svg>
);

const FontIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden>
    <text x="2" y="13" fontSize="12" fontWeight="700" fill="#1565c0" fontFamily="serif">
      A
    </text>
  </svg>
);

const EnlargeIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden>
    <text x="1" y="12" fontSize="10" fontWeight="700" fill="#000" fontFamily="serif">
      A
    </text>
    <path d="M12 4v6M9 7h6" stroke="#333" strokeWidth="1.2" />
  </svg>
);

const ReduceIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden>
    <text x="1" y="12" fontSize="8" fontWeight="700" fill="#000" fontFamily="serif">
      A
    </text>
    <line x1="9" y1="7" x2="15" y2="7" stroke="#333" strokeWidth="1.2" />
  </svg>
);

const WhitespaceIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden>
    <text x="1" y="11" fontSize="9" fill="#000" fontFamily="monospace">
      a·b
    </text>
  </svg>
);

function Mnemonic({ letter, rest }: { letter: string; rest: string }) {
  return (
    <>
      <span className={styles.mnemonic}>{letter}</span>
      {rest}
    </>
  );
}

const ANNEX_PAGE_SETUP: PageSetupSettings = {
  paperSize: "carta",
  orientation: "landscape",
  margins: { left: 12, right: 12, top: 12, bottom: 12 },
  pageWidthPx: 1100,
};

const REPORT_PAGE_SETUP: PageSetupSettings = {
  paperSize: "carta",
  orientation: "portrait",
  margins: { left: 12, right: 12, top: 12, bottom: 12 },
  pageWidthPx: 320,
};

export function PrintPreviewDialog({
  reportData,
  meta,
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
  const rows = useMemo(() => {
    if (warehousesData) return buildWarehousesPrintPreview(warehousesData);
    if (carriersData) return buildCarriersPrintPreview(carriersData);
    if (vehiclesData) return buildVehiclesPrintPreview(vehiclesData);
    if (driversData) return buildDriversPrintPreview(driversData);
    if (sellersData) return buildSellersPrintPreview(sellersData);
    if (sellerCategoriesData) return buildSellerCategoriesPrintPreview(sellerCategoriesData);
    if (documentsData) return buildDocumentsPrintPreview(documentsData);
    if (saleConditionsData) return buildSaleConditionsPrintPreview(saleConditionsData);
    if (emissionPointsData) return buildEmissionPointsPrintPreview(emissionPointsData);
    if (annexData) return buildDocsAnnexPrintPreview(annexData);
    return buildThermalPrintPreview(reportData!, meta!);
  }, [warehousesData, carriersData, vehiclesData, driversData, sellersData, sellerCategoriesData, documentsData, saleConditionsData, emissionPointsData, annexData, reportData, meta]);

  const previewRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuBarRef = useRef<HTMLElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);
  const findPosRef = useRef(0);

  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [subDialog, setSubDialog] = useState<SubDialog>(null);
  const [showFind, setShowFind] = useState(false);
  const { barMounted: findBarMounted, barProps: findBarProps } = useCollapsibleBarAnimation(showFind);
  const [findQuery, setFindQuery] = useState("");
  const [lineSpacing, setLineSpacing] = useState<LineSpacing>(
    () => loadPrintLayoutSettings(printLayoutContext).lineSpacing,
  );
  const [fontSettings, setFontSettings] = useState<FontSettings>(
    () => loadPrintLayoutSettings(printLayoutContext).fontSettings,
  );
  const previewFont = useMemo(() => resolvePreviewFont(fontSettings), [fontSettings]);

  const updateLineSpacing = useCallback(
    (next: LineSpacing) => {
      setLineSpacing(next);
      savePrintLayoutSettings(printLayoutContext, {
        fontSettings,
        lineSpacing: next,
      });
    },
    [fontSettings, printLayoutContext],
  );

  const applyFontSettings = useCallback(
    (next: FontSettings) => {
      const normalized = normalizeFontSettings(next);
      setFontSettings(normalized);
      savePrintLayoutSettings(printLayoutContext, {
        fontSettings: normalized,
        lineSpacing,
      });
    },
    [lineSpacing, printLayoutContext],
  );

  const clampContextFontSize = useCallback(
    (size: number) =>
      isListPrint || isAnnex ? clampPreviewFontSize(size) : clampFontSize(size),
    [isListPrint, isAnnex],
  );

  const bumpFontSize = useCallback(
    (delta: number) => {
      setFontSettings((f) => {
        const normalized = normalizeFontSettings({
          ...f,
          size: clampContextFontSize(f.size + delta),
        });
        savePrintLayoutSettings(printLayoutContext, {
          fontSettings: normalized,
          lineSpacing,
        });
        return normalized;
      });
    },
    [clampContextFontSize, lineSpacing, printLayoutContext],
  );
  const [showWhitespace, setShowWhitespace] = useState(false);
  const [pageSetup, setPageSetup] = useState<PageSetupSettings>(
    isListPrint || isAnnex ? ANNEX_PAGE_SETUP : REPORT_PAGE_SETUP,
  );

  const isWideReport = isListPrint || isAnnex;
  const isThermalTicket = !isWideReport;
  const contentChars = useMemo(() => maxPreviewRowChars(rows), [rows]);
  const lineCount = rows.length;
  const previewFontSize = clampPreviewFontSize(fontSettings.size);

  const pageWidthPx = isWideReport ? contentChars * 8 : pageSetup.pageWidthPx;
  const pagePaddingPx = useMemo(
    () => ({
      paddingTop: Math.round(pageSetup.margins.top * 0.45),
      paddingRight: Math.round(pageSetup.margins.right * 0.45),
      paddingBottom: Math.round(pageSetup.margins.bottom * 0.45),
      paddingLeft: Math.round(pageSetup.margins.left * 0.45),
    }),
    [pageSetup.margins],
  );

  const plainText = useMemo(() => previewRowsToPlainText(rows), [rows]);

  const closeMenus = useCallback(() => setOpenMenu(null), []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuBarRef.current?.contains(e.target as Node)) return;
      closeMenus();
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [closeMenus]);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1 : e.deltaY > 0 ? -1 : 0;
      if (delta === 0) return;
      bumpFontSize(delta);
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [bumpFontSize]);

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

  const handleSaveAs = () => {
    const file = `vista-preliminar-${saleDateLabel.replace(/\//g, "-")}.txt`;
    downloadBlob(plainText, file, "text/plain;charset=utf-8");
    closeMenus();
  };

  const handlePrint = () => {
    if (isWarehouses) {
      openReportPrintWindow(getListReportHtml({ warehousesData: warehousesData! }), { autoPrint: true });
      closeMenus();
      return;
    }
    if (isCarriers) {
      openReportPrintWindow(getListReportHtml({ carriersData: carriersData! }), { autoPrint: true });
      closeMenus();
      return;
    }
    if (isVehicles) {
      openReportPrintWindow(getListReportHtml({ vehiclesData: vehiclesData! }), { autoPrint: true });
      closeMenus();
      return;
    }
    if (isDrivers) {
      openReportPrintWindow(getListReportHtml({ driversData: driversData! }), { autoPrint: true });
      closeMenus();
      return;
    }
    if (isSellers) {
      openReportPrintWindow(getListReportHtml({ sellersData: sellersData! }), { autoPrint: true });
      closeMenus();
      return;
    }
    if (isSellerCategories) {
      openReportPrintWindow(getListReportHtml({ sellerCategoriesData: sellerCategoriesData! }), { autoPrint: true });
      closeMenus();
      return;
    }
    if (isDocuments) {
      openReportPrintWindow(getListReportHtml({ documentsData: documentsData! }), { autoPrint: true });
      closeMenus();
      return;
    }
    if (isSaleConditions) {
      openReportPrintWindow(getListReportHtml({ saleConditionsData: saleConditionsData! }), { autoPrint: true });
      closeMenus();
      return;
    }
    if (isEmissionPoints) {
      openReportPrintWindow(getListReportHtml({ emissionPointsData: emissionPointsData! }), { autoPrint: true });
      closeMenus();
      return;
    }
    if (annexData) {
      openReportPrintWindow(
        buildPrintReceiptHtml(rows, {
          fontSettings,
          lineSpacing,
          wideLayout: true,
        }),
        { autoPrint: true },
      );
      closeMenus();
      return;
    }

    openReportPrintWindow(
      buildPrintReceiptHtml(rows, {
        fontSettings,
        lineSpacing,
      }),
      { autoPrint: true },
    );
    closeMenus();
  };

  const handleSelectAll = () => {
    const el = previewRef.current;
    if (!el) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    closeMenus();
  };

  const scrollRangeIntoView = (range: Range) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = range.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    if (rect.top < wrapRect.top || rect.bottom > wrapRect.bottom) {
      const top = rect.top - wrapRect.top + wrap.scrollTop - wrap.clientHeight / 3;
      wrap.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
  };

  const selectTextRange = (root: HTMLElement, start: number, end: number): boolean => {
    const range = document.createRange();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let pos = 0;
    let startNode: Text | null = null;
    let startOffset = 0;
    let endNode: Text | null = null;
    let endOffset = 0;

    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      const len = node.textContent?.length ?? 0;
      const nextPos = pos + len;

      if (!startNode && nextPos > start) {
        startNode = node;
        startOffset = start - pos;
      }
      if (!endNode && nextPos >= end) {
        endNode = node;
        endOffset = end - pos;
        break;
      }
      pos = nextPos;
    }

    if (!startNode || !endNode) return false;

    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    scrollRangeIntoView(range);
    return true;
  };

  const handleFindNext = useCallback(() => {
    const q = findQuery.trim();
    if (!q) return;
    const el = previewRef.current;
    if (!el) return;

    const text = el.textContent ?? "";
    const haystack = text.toLowerCase();
    const needle = q.toLowerCase();
    const len = needle.length;
    if (!len) return;

    let from = findPosRef.current;
    if (from > text.length) from = 0;

    let idx = haystack.indexOf(needle, from);
    if (idx < 0 && from > 0) {
      idx = haystack.indexOf(needle, 0);
    }
    if (idx < 0) return;

    findPosRef.current = idx + len;
    selectTextRange(el, idx, idx + len);
  }, [findQuery]);

  useEffect(() => {
    findPosRef.current = 0;
  }, [findQuery]);

  useEffect(() => {
    if (showFind) {
      findInputRef.current?.focus();
      findInputRef.current?.select();
    }
  }, [showFind]);

  const handleGoToLine = useCallback(
    (n: number) => {
      const target = previewRef.current?.querySelector(`[data-line="${n}"]`);
      target?.scrollIntoView({ block: "start", behavior: "smooth" });
      setSubDialog(null);
      closeMenus();
    },
    [closeMenus],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (subDialog) {
          setSubDialog(null);
          return;
        }
        if (showFind) {
          setShowFind(false);
          return;
        }
        requestClose();
        return;
      }
      if (e.ctrlKey && e.key === "f4") {
        e.preventDefault();
        requestClose();
      }
      if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        handlePrint();
      }
      if (e.ctrlKey && e.key === "a") {
        e.preventDefault();
        handleSelectAll();
      }
      if (e.ctrlKey && e.key === "f") {
        e.preventDefault();
        setShowFind(true);
        closeMenus();
      }
      if (showFind && (e.key === "F3" || (e.ctrlKey && e.key === "g"))) {
        e.preventDefault();
        handleFindNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className={styles.overlay} {...overlayProps} onClick={onBackdropClick} role="presentation">
      <div
        ref={panelRef}
        className={[styles.window, isWideReport ? styles.windowWide : ""].filter(Boolean).join(" ")}
        {...panelProps}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="print-preview-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h2 id="print-preview-title" className={styles.titleText}>
            Vista Preliminar
          </h2>
          <button type="button" className={styles.titleClose} onClick={requestClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <nav className={styles.menuBar} ref={menuBarRef} aria-label="Menú vista preliminar">
          <div className={styles.menuSlot}>
            <button
              type="button"
              className={[styles.menuTrigger, openMenu === "file" ? styles.menuTriggerActive : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setOpenMenu((m) => (m === "file" ? null : "file"))}
            >
              Archivo
            </button>
            {openMenu === "file" && (
              <div className={styles.menuDropdown}>
              <button type="button" className={styles.menuItem} onClick={requestClose}>
                <span className={styles.menuItemIcon} />
                <span>
                  <Mnemonic letter="C" rest="errar" />
                </span>
                <span className={styles.menuShortcut}>Ctrl+F4</span>
              </button>
              <button type="button" className={styles.menuItem} onClick={handleSaveAs}>
                <span className={styles.menuItemIcon} />
                <span>
                  <Mnemonic letter="G" rest="uardar como…" />
                </span>
              </button>
              <button
                type="button"
                className={styles.menuItem}
                onClick={() => {
                  setSubDialog("pageSetup");
                  closeMenus();
                }}
              >
                <span className={styles.menuItemIcon}>
                  <PageSetupIcon />
                </span>
                <span>
                  <Mnemonic letter="C" rest="onfigurar página…" />
                </span>
              </button>
              <button type="button" className={styles.menuItem} onClick={handlePrint}>
                <span className={styles.menuItemIcon}>
                  <PrintIcon />
                </span>
                <span>
                  <Mnemonic letter="I" rest="mprimir…" />
                </span>
                <span className={styles.menuShortcut}>Ctrl+P</span>
              </button>
            </div>
            )}
          </div>

          <div className={styles.menuSlot}>
            <button
              type="button"
              className={[styles.menuTrigger, openMenu === "edit" ? styles.menuTriggerActive : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setOpenMenu((m) => (m === "edit" ? null : "edit"))}
            >
              Editar
            </button>
            {openMenu === "edit" && (
              <div className={styles.menuDropdown}>
              <button type="button" className={styles.menuItem} onClick={handleSelectAll}>
                <span className={styles.menuItemIcon} />
                <span>
                  <Mnemonic letter="S" rest="eleccionar todo" />
                </span>
                <span className={styles.menuShortcut}>Ctrl+A</span>
              </button>
              <div className={styles.menuSeparator} />
              <button
                type="button"
                className={styles.menuItem}
                onClick={() => {
                  setShowFind(true);
                  closeMenus();
                }}
              >
                <span className={styles.menuItemIcon}>
                  <FindIcon />
                </span>
                <span>
                  <Mnemonic letter="B" rest="uscar…" />
                </span>
                <span className={styles.menuShortcut}>Ctrl+F</span>
              </button>
              <button
                type="button"
                className={styles.menuItem}
                onClick={() => {
                  setSubDialog("goToLine");
                  closeMenus();
                }}
              >
                <span className={styles.menuItemIcon} />
                <span>
                  <Mnemonic letter="I" rest="r a línea…" />
                </span>
              </button>
              <div className={styles.menuSeparator} />
              <button
                type="button"
                className={styles.menuItem}
                onClick={() => {
                  setSubDialog("properties");
                  closeMenus();
                }}
              >
                <span className={styles.menuItemIcon}>
                  <PropertiesIcon />
                </span>
                <span>
                  <Mnemonic letter="P" rest="ropiedades…" />
                </span>
              </button>
            </div>
            )}
          </div>

          <div className={styles.menuSlot}>
            <button
              type="button"
              className={[styles.menuTrigger, openMenu === "format" ? styles.menuTriggerActive : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setOpenMenu((m) => (m === "format" ? null : "format"))}
            >
              Formato
            </button>
            {openMenu === "format" && (
              <div className={`${styles.menuDropdown} ${styles.menuDropdownWide}`}>
              <button
                type="button"
                className={styles.menuItem}
                onClick={() => {
                  setSubDialog("font");
                  closeMenus();
                }}
              >
                <span className={styles.menuItemIcon}>
                  <FontIcon />
                </span>
                <span>
                  <Mnemonic letter="F" rest="uente…" />
                </span>
              </button>
              <button
                type="button"
                className={styles.menuItem}
                onClick={() => bumpFontSize(1)}
              >
                <span className={styles.menuItemIcon}>
                  <EnlargeIcon />
                </span>
                <span>
                  <Mnemonic letter="A" rest="mpliar fuente" />
                </span>
              </button>
              <button
                type="button"
                className={styles.menuItem}
                onClick={() => bumpFontSize(-1)}
              >
                <span className={styles.menuItemIcon}>
                  <ReduceIcon />
                </span>
                <span>
                  <Mnemonic letter="R" rest="educir fuente" />
                </span>
              </button>
              <div className={styles.menuSeparator} />
              <button
                type="button"
                className={styles.menuItem}
                onClick={() => updateLineSpacing("single")}
              >
                <span className={styles.menuItemIcon}>
                  {lineSpacing === "single" ? <span className={styles.menuCheck}>✓</span> : null}
                </span>
                <span>
                  <Mnemonic letter="E" rest="spacio sencillo" />
                </span>
              </button>
              <button
                type="button"
                className={styles.menuItem}
                onClick={() => updateLineSpacing("oneHalf")}
              >
                <span className={styles.menuItemIcon}>
                  {lineSpacing === "oneHalf" ? <span className={styles.menuCheck}>✓</span> : null}
                </span>
                <span>Espacio 1 1/2</span>
              </button>
              <button
                type="button"
                className={styles.menuItem}
                onClick={() => updateLineSpacing("double")}
              >
                <span className={styles.menuItemIcon}>
                  {lineSpacing === "double" ? <span className={styles.menuCheck}>✓</span> : null}
                </span>
                <span>Espacio doble</span>
              </button>
              <div className={styles.menuSeparator} />
              <button
                type="button"
                className={styles.menuItem}
                onClick={() => setShowWhitespace((v) => !v)}
              >
                <span className={styles.menuItemIcon}>
                  <WhitespaceIcon />
                </span>
                <span>
                  <Mnemonic letter="V" rest="er espacios en blanco" />
                </span>
              </button>
            </div>
            )}
          </div>
        </nav>

        {findBarMounted && (
          <div className={styles.findBarShell} {...findBarProps}>
            <div className={styles.findBar}>
            <label htmlFor="preview-find">Buscar:</label>
            <input
              ref={findInputRef}
              id="preview-find"
              className={styles.findInput}
              value={findQuery}
              onChange={(e) => setFindQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "F3") {
                  e.preventDefault();
                  handleFindNext();
                }
              }}
            />
            <button type="button" className={styles.findBtn} onClick={handleFindNext}>
              Siguiente
            </button>
            <button type="button" className={styles.findBtn} onClick={() => setShowFind(false)}>
              Cerrar
            </button>
            </div>
          </div>
        )}

        <div
          className={[styles.previewWrap, isWideReport ? styles.previewWrapFit : ""]
            .filter(Boolean)
            .join(" ")}
          ref={wrapRef}
        >
          <div
            className={[
              styles.previewPaper,
              isWideReport ? styles.previewPaperWide : "",
              isThermalTicket ? styles.previewPaperThermal : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={isThermalTicket ? undefined : pagePaddingPx}
          >
            {isThermalTicket ? (
              <ThermalTicketPreview
                rows={rows}
                fontFamily={previewFont.fontFamily}
                fontSizePt={fontSettings.size}
                fontWeight={previewFont.fontWeight}
                fontStyle={previewFont.fontStyle}
                fontStretch={previewFont.fontStretch}
                letterSpacing={previewFont.letterSpacing}
                lineSpacing={lineSpacing}
                showWhitespace={showWhitespace}
                contentRef={previewRef}
              />
            ) : (
              <ReceiptPreview
                rows={rows}
                fontSize={previewFontSize}
                fontFamily={previewFont.fontFamily}
                fontWeight={previewFont.fontWeight}
                fontStyle={previewFont.fontStyle}
                fontStretch={previewFont.fontStretch}
                letterSpacing={previewFont.letterSpacing}
                lineHeight={PRINT_LINE_HEIGHT[lineSpacing]}
                maxWidthPx={pageWidthPx}
                wideLayout={isWideReport}
                showWhitespace={showWhitespace}
                contentRef={previewRef}
              />
            )}
          </div>
        </div>

        {!isWideReport ? <div className={styles.scrollbarHint} aria-hidden /> : null}
      </div>

      {subDialog === "pageSetup" && (
        <PageSetupDialog
          settings={pageSetup}
          onApply={setPageSetup}
          onClose={() => setSubDialog(null)}
        />
      )}

      {subDialog === "font" && (
        <FontDialog
          settings={fontSettings}
          onApply={applyFontSettings}
          onClose={() => setSubDialog(null)}
        />
      )}

      {subDialog === "goToLine" && (
        <GoToLineDialog
          lineCount={lineCount}
          onGo={handleGoToLine}
          onClose={() => setSubDialog(null)}
        />
      )}

      {subDialog === "properties" && (
        <EditPropertiesDialog
          lineCount={lineCount}
          plainTextLength={plainText.length}
          saleDate={saleDateLabel}
          openedAtLabel={meta?.openedAtLabel ?? annexData?.registerLabel ?? ""}
          fontSettings={fontSettings}
          showWhitespace={showWhitespace}
          onApply={setShowWhitespace}
          onOpenFont={() => setSubDialog("font")}
          onClose={() => setSubDialog(null)}
        />
      )}
    </div>
  );
}
