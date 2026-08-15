import { memo, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { COMPANY_RUC } from "../../config/pos";
import { DEFAULT_REGISTER_ID, getRegisterById } from "../../data/posRegisters";
import {
  formatSaleDateLabel,
  getSalesDaySnapshot,
  getSalesForRegisterAndDate,
  isSameDay,
  snapshotFromSalesList,
  subscribeSales,
} from "../../services/salesSession";
import {
  getCachedNavaSales,
  isNavaOnline,
  listNavaSaleDates,
  listNavaSalesForDate,
  mergeDaySales,
} from "../../services/navaDocs";
import { openDocsAnnexDialog, isAppDialogOpen, setDocsAnnexContext, primeDocsAnnexDialog } from "../../services/appDialogs";
import { formatPercent, formatQty, formatSoles } from "../../utils/formatMoney";
import { downloadSalesReportXls } from "../../utils/exportSalesReportXls";
import { ModalStackRoot, useModalStack } from "../ModalStack/ModalStackContext";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { PrintPropertiesDialog } from "../PrintPropertiesDialog/PrintPropertiesDialog";
import { SalesDayCalendar } from "./SalesDayCalendar";
import { SalesRegisterPicker } from "./SalesRegisterPicker";
import type { CompletedSale } from "../../types/sales";
import styles from "./SalesDayMonitor.module.css";

type Props = {
  onClose: () => void;
};

type ContentProps = Props & {
  windowRef: RefObject<HTMLDivElement | null>;
};

function formatDateTime(d: Date): string {
  return d.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateTimeErp(d: Date): string {
  const date = d.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const hours = d.getHours();
  const h12 = hours % 12 || 12;
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours < 12 ? "AM" : "PM";
  return `${date} ${String(h12).padStart(2, "0")}:${minutes} ${ampm}`;
}

function correlativo(from: number, to: number): string {
  if (from === 0 && to === 0) return "0 al 0";
  return `${from} al ${to}`;
}

const DocsAnnexIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
    <rect x="4" y="2" width="13" height="17" rx="1" fill="#f8f8f8" stroke="#7a7a7a" strokeWidth="1.2" />
    <line x1="7" y1="7" x2="14" y2="7" stroke="#9a9a9a" strokeWidth="1.2" />
    <line x1="7" y1="10" x2="14" y2="10" stroke="#9a9a9a" strokeWidth="1.2" />
    <line x1="7" y1="13" x2="11" y2="13" stroke="#9a9a9a" strokeWidth="1.2" />
    <path
      d="M15 14h4v4M19 14l-5 5"
      fill="none"
      stroke="#6a6a6a"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PrintIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
    <rect x="6" y="2" width="12" height="5" rx="0.5" fill="#e8e8e8" stroke="#7a7a7a" strokeWidth="1.2" />
    <rect x="4" y="9" width="16" height="9" rx="1" fill="#f4f4f4" stroke="#7a7a7a" strokeWidth="1.2" />
    <rect x="7" y="13" width="10" height="6" fill="#fff" stroke="#9a9a9a" strokeWidth="1" />
    <line x1="8" y1="5" x2="16" y2="5" stroke="#9a9a9a" strokeWidth="1" />
  </svg>
);

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const ExcelIcon = () => (
  <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden>
    <path d="M2 1h8.5L15 5.5V17a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" fill="#f4fbf7" stroke="#7a7a7a" strokeWidth="0.7" />
    <path d="M10.5 1l4.5 4.5h-4.5z" fill="#c8e0d0" />
    <path d="M1 2a1 1 0 0 1 1-1h5v16H2a1 1 0 0 1-1-1V2z" fill="#217346" />
    <line x1="2.8" y1="6.8" x2="5.8" y2="10.5" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
    <line x1="5.8" y1="6.8" x2="2.8" y2="10.5" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
    <rect x="7" y="5.5" width="7.5" height="2" fill="#1d6338" />
    <line x1="10.8" y1="5.5" x2="10.8" y2="7.5" stroke="#4caf80" strokeWidth="0.5" />
    <line x1="7" y1="9.5" x2="14.5" y2="9.5" stroke="#a8d4ba" strokeWidth="0.6" />
    <line x1="7" y1="12" x2="14.5" y2="12" stroke="#a8d4ba" strokeWidth="0.6" />
    <line x1="7" y1="14.5" x2="14.5" y2="14.5" stroke="#a8d4ba" strokeWidth="0.6" />
    <line x1="10.8" y1="7.5" x2="10.8" y2="16" stroke="#a8d4ba" strokeWidth="0.6" />
    <rect x="7.5" y="8" width="2.8" height="1.2" fill="#d8f0e4" rx="0.2" />
    <rect x="11.3" y="8" width="2.8" height="1.2" fill="#d8f0e4" rx="0.2" />
    <rect x="7.5" y="10.2" width="2.2" height="1.5" fill="#edf7f2" rx="0.2" />
    <rect x="11.3" y="10.2" width="2.8" height="1.5" fill="#c4e8d4" rx="0.2" />
    <rect x="7.5" y="12.7" width="2.8" height="1.5" fill="#c4e8d4" rx="0.2" />
    <rect x="11.3" y="12.7" width="2.2" height="1.5" fill="#edf7f2" rx="0.2" />
  </svg>
);

function SalesDayMonitorContent({ onClose, windowRef }: ContentProps) {
  const { hasOpenLayers } = useModalStack();
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, {
    panelRef: windowRef,
  });
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [tick, setTick] = useState(0);
  const [saleDate, setSaleDate] = useState(() => new Date());
  const [registerId, setRegisterId] = useState(DEFAULT_REGISTER_ID);
  const [sqlSales, setSqlSales] = useState<CompletedSale[]>(() => getCachedNavaSales(new Date()));
  const [navaDates, setNavaDates] = useState<Date[]>([]);
  const [navaRefresh, setNavaRefresh] = useState(0);
  const [navaOffline, setNavaOffline] = useState(() => !isNavaOnline());
  const today = useMemo(() => new Date(), []);
  const selectedRegister = useMemo(
    () => getRegisterById(registerId) ?? getRegisterById(DEFAULT_REGISTER_ID)!,
    [registerId],
  );
  const viewingToday = isSameDay(saleDate, today);

  useEffect(() => subscribeSales(() => setTick((n) => n + 1)), []);

  useEffect(() => {
    void listNavaSaleDates().then((dates) => {
      setNavaDates(dates);
      setNavaOffline(!isNavaOnline());
    });
  }, [navaRefresh]);

  useEffect(() => {
    let cancelled = false;
    setSqlSales(getCachedNavaSales(saleDate));
    void listNavaSalesForDate(saleDate)
      .then((rows) => {
        if (cancelled) return;
        setSqlSales(rows);
        setNavaOffline(!isNavaOnline());
      })
      .catch(() => {
        if (cancelled) return;
        setSqlSales(getCachedNavaSales(saleDate));
        setNavaOffline(true);
      });
    return () => {
      cancelled = true;
    };
  }, [saleDate, navaRefresh]);

  const snapshot = useMemo(() => {
    const local = getSalesForRegisterAndDate(registerId, saleDate);
    const merged = mergeDaySales(local, sqlSales);
    return merged.length
      ? snapshotFromSalesList(registerId, saleDate, merged)
      : getSalesDaySnapshot(registerId, saleDate);
  }, [registerId, saleDate, tick, sqlSales]);
  const {
    docs,
    monetary,
    groups,
    articles,
    grandTotal,
    openedAt,
    closedAt,
    sessionClosed,
    availableDates: snapshotDates,
  } = snapshot;
  const availableDates = useMemo(() => {
    const map = new Map<string, Date>();
    for (const date of [...snapshotDates, ...navaDates]) {
      map.set(
        `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
        date,
      );
    }
    return [...map.values()].sort((a, b) => b.getTime() - a.getTime());
  }, [snapshotDates, navaDates]);
  const totalArticleQty = useMemo(
    () => articles.reduce((sum, row) => sum + row.qty, 0),
    [articles],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showPrintDialog || isAppDialogOpen("docsAnnex") || hasOpenLayers) return;
      requestClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hasOpenLayers, showPrintDialog, requestClose]);

  const saleDateLabel = formatSaleDateLabel(saleDate);

  // Precarga liquidación tras el paint del Monitor: el click solo revela.
  useEffect(() => {
    setDocsAnnexContext({
      registerId,
      registerLabel: selectedRegister.label,
      registerPoint: selectedRegister.point,
      saleDate: saleDateLabel,
    });
    let cancelled = false;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        if (!cancelled) primeDocsAnnexDialog();
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(outer);
      if (inner) cancelAnimationFrame(inner);
    };
  }, [registerId, saleDateLabel, selectedRegister.label, selectedRegister.point]);

  const handleDocsAnnex = () => {
    openDocsAnnexDialog({
      registerId,
      registerLabel: selectedRegister.label,
      registerPoint: selectedRegister.point,
      saleDate: saleDateLabel,
    });
  };

  const handlePrint = () => setShowPrintDialog(true);

  const reportData = useMemo(
    () => ({
      saleDate: saleDateLabel,
      vendorLabel: selectedRegister.label,
      docs,
      monetary,
      groups,
      articles,
      grandTotal,
    }),
    [saleDateLabel, selectedRegister.label, docs, monetary, groups, articles, grandTotal],
  );

  const previewMeta = useMemo(() => {
    const shortId = selectedRegister.label.replace(/_CJA\d+$/i, "").slice(0, 8);
    return {
      branch: selectedRegister.branch,
      registerLabel: selectedRegister.label,
      vendorLabel: selectedRegister.label,
      saleDate: saleDateLabel,
      sessionStatus: sessionClosed ? ("Cerrado" as const) : ("Abierto" as const),
      sessionOpenedAt: openedAt,
      sessionClosedAt: closedAt,
      openedAtLabel: openedAt ? `${shortId}(${formatDateTimeErp(openedAt)})` : "—",
      ruc: COMPANY_RUC,
    };
  }, [selectedRegister, saleDateLabel, sessionClosed, openedAt, closedAt]);

  const handleExport = () => downloadSalesReportXls(reportData);

  const hasSales = grandTotal > 0;

  return (
    <div
      className={styles.overlay}
      {...overlayProps}
      onClick={onBackdropClick}
      role="presentation"
    >
      <div
        ref={windowRef}
        className={styles.window}
        {...panelProps}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="sales-monitor-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h1 id="sales-monitor-title" className={styles.titleText}>
            Monitor de Ventas
          </h1>
          <button type="button" className={styles.titleClose} onClick={requestClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className={styles.meta}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Sucursal:</span>
            <span className={styles.metaValue}>{selectedRegister.branch}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Fecha venta:</span>
            <span className={styles.metaValue}>
              <SalesDayCalendar
                value={saleDate}
                onChange={setSaleDate}
                datesWithSales={availableDates}
              />
            </span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Punto Venta:</span>
            <span className={styles.metaValue}>{selectedRegister.point}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Caja #ID {selectedRegister.id}:</span>
            <span className={styles.metaValue}>
              <SalesRegisterPicker
                value={registerId}
                onChange={setRegisterId}
                saleDate={saleDate}
              />
            </span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Fecha apertura:</span>
            <span className={styles.metaValue}>
              {openedAt ? formatDateTime(openedAt) : "—"}
            </span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Fecha de cierre:</span>
            <span className={styles.metaValue}>
              {closedAt ? formatDateTime(closedAt) : "—"}
            </span>
          </div>
        </div>

        <div className={styles.toolbar}>
          <span
            className={[
              styles.toolbarTitle,
              sessionClosed ? styles.toolbarTitleClosed : styles.toolbarTitleOpen,
            ].join(" ")}
          >
            Reporte X ( {sessionClosed ? "Cerrado" : "Abierto"} )
          </span>
          <button
            type="button"
            className={`${styles.toolbarBtn} ${styles.toolbarBtnRefresh}`}
            title="Actualizar datos"
            aria-label="Actualizar datos"
            onClick={() => {
              setTick((t) => t + 1);
              setNavaRefresh((n) => n + 1);
            }}
          >
            <RefreshIcon />
          </button>
          <button
            type="button"
            className={styles.toolbarBtn}
            title="Anexo de documentos"
            aria-label="Anexo de documentos"
            onClick={handleDocsAnnex}
          >
            <DocsAnnexIcon />
          </button>
          <button
            type="button"
            className={styles.toolbarBtn}
            title="Imprimir liquidación"
            aria-label="Imprimir liquidación"
            onClick={handlePrint}
          >
            <PrintIcon />
          </button>
          <button
            type="button"
            className={styles.toolbarBtn}
            title="Exportar a Excel"
            aria-label="Exportar a Excel"
            onClick={handleExport}
          >
            <ExcelIcon />
          </button>
        </div>

        <div className={styles.bodyWrap}>
          <div className={styles.scrollArea}>
            {navaOffline ? (
              <p className={styles.navaBanner}>
                Sin conexión al SQL de Nava (PC Windows / Tailscale). Las ventas pasadas
                viven ahí: enciende <strong>WIN-C6EKJGJR3FH</strong> y pulsa Actualizar.
                {sqlSales.length ? " Mostrando la última copia guardada en este equipo." : ""}
              </p>
            ) : null}
            {!hasSales ? (
              <p className={styles.emptyHint}>
                {navaOffline
                  ? `No hay copia local de ventas para el ${saleDateLabel}. Con el servidor encendido verás boletas y facturas de mst01fac.`
                  : viewingToday
                    ? `Aún no hay ventas registradas hoy en ${selectedRegister.label}. Cobre comprobantes en el TPV para ver el reporte.`
                    : `No hay ventas de Nava ni de esta caja para el ${saleDateLabel}.`}
              </p>
            ) : null}

            <div className={styles.summaryGrid}>
              <section className={styles.panel}>
                <h2 className={styles.panelTitle}>DOCS. EMITIDOS</h2>
                <table className={styles.table}>
                  <colgroup>
                    <col className={styles.colLabelDocs} />
                    <col className={styles.colTotalCount} />
                    <col className={styles.colCorrelativo} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th />
                      <th className={styles.num}>Total</th>
                      <th className={styles.correlativo}>Correlativo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Docs. boleta</td>
                      <td className={styles.num}>{docs.boletas}</td>
                      <td className={styles.correlativo}>
                        {correlativo(docs.boletaFrom, docs.boletaTo)}
                      </td>
                    </tr>
                    <tr>
                      <td>Docs. nota vta.</td>
                      <td className={styles.num}>{docs.notas}</td>
                      <td className={styles.correlativo}>
                        {correlativo(docs.notaFrom, docs.notaTo)}
                      </td>
                    </tr>
                    <tr>
                      <td>Docs. factura</td>
                      <td className={styles.num}>{docs.facturas}</td>
                      <td className={styles.correlativo}>
                        {correlativo(docs.facturaFrom, docs.facturaTo)}
                      </td>
                    </tr>
                    <tr>
                      <td>Docs. anulados</td>
                      <td className={styles.num}>{docs.anulados}</td>
                      <td className={styles.correlativo} />
                    </tr>
                    <tr className={styles.total}>
                      <td>Total docs. emitidos</td>
                      <td className={styles.num}>{docs.total}</td>
                      <td className={styles.correlativo} />
                    </tr>
                  </tbody>
                </table>
              </section>

              <section className={styles.panel}>
                <h2 className={styles.panelTitle}>VENTA MONETARIA</h2>
                <table className={styles.table}>
                  <colgroup>
                    <col className={styles.colLabelWide} />
                    <col className={styles.colNum} />
                  </colgroup>
                  <tbody>
                    <tr className={styles.subHeader}>
                      <td colSpan={2}>1. Por venta:</td>
                    </tr>
                    <tr>
                      <td>Contado</td>
                      <td className={styles.num}>{formatSoles(monetary.contado)}</td>
                    </tr>
                    <tr>
                      <td>Tarjeta</td>
                      <td className={styles.num}>{formatSoles(monetary.tarjeta)}</td>
                    </tr>
                    {monetary.cards.map((card) => (
                      <tr key={card.label}>
                        <td style={{ paddingLeft: 16 }}>{card.label}</td>
                        <td className={styles.num}>{formatSoles(card.total)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td>Banco</td>
                      <td className={styles.num}>{formatSoles(monetary.banco)}</td>
                    </tr>
                    <tr>
                      <td>Crédito</td>
                      <td className={styles.num}>{formatSoles(monetary.credito)}</td>
                    </tr>
                    <tr className={styles.total}>
                      <td>TOTAL VENTA EN (S/.)</td>
                      <td className={styles.num}>{formatSoles(monetary.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </section>
            </div>

            <section className={`${styles.panel} ${styles.groupTable}`}>
              <h2 className={styles.panelTitle}>VENTA LINEAS/GRUPO</h2>
              <table className={styles.table}>
                <colgroup>
                  <col className={styles.colLabel} />
                  <col className={styles.colNum} />
                  <col className={styles.colNum} />
                </colgroup>
                <thead>
                  <tr>
                    <th />
                    <th className={styles.num}>Total</th>
                    <th className={styles.num}>Porcentaje</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((row) => (
                    <tr key={row.group}>
                      <td>{row.group}</td>
                      <td className={styles.num}>{formatSoles(row.total)}</td>
                      <td className={styles.num}>{formatPercent(row.percent)}</td>
                    </tr>
                  ))}
                  <tr className={styles.total}>
                    <td>Total lineas</td>
                    <td className={styles.num}>{formatSoles(grandTotal)}</td>
                    <td className={styles.num}>{formatPercent(grandTotal > 0 ? 100 : 0)}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className={`${styles.panel} ${styles.articleTable}`}>
              <h2 className={styles.panelTitle}>VENTA ARTICULOS</h2>
              <table className={styles.table}>
                <colgroup>
                  <col className={styles.colLabel} />
                  <col className={styles.colNum} />
                  <col className={styles.colNum} />
                </colgroup>
                <thead>
                  <tr>
                    <th />
                    <th className={styles.num}>Cantidad</th>
                    <th className={styles.num}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((row) => (
                    <tr key={row.description}>
                      <td>{row.description}</td>
                      <td className={styles.num}>{formatQty(row.qty)}</td>
                      <td className={styles.num}>{formatSoles(row.total)}</td>
                    </tr>
                  ))}
                  <tr className={styles.total}>
                    <td>Total lineas</td>
                    <td className={styles.num}>{formatQty(totalArticleQty)}</td>
                    <td className={styles.num}>{formatSoles(grandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className={styles.footerBlock}>
              <h2 className={styles.footerTitle}>TIPOS DE VENTA</h2>
              <table className={styles.table}>
                <colgroup>
                  <col className={styles.colLabel} />
                  <col className={styles.colNum} />
                  <col className={styles.colNum} />
                </colgroup>
                <thead>
                  <tr>
                    <th />
                    <th className={styles.num}>Importe</th>
                    <th className={styles.num}>Porcentaje</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Mercadería</td>
                    <td className={styles.num}>{formatSoles(grandTotal)}</td>
                    <td className={styles.num}>{formatPercent(grandTotal > 0 ? 100 : 0)}</td>
                  </tr>
                  <tr className={styles.total}>
                    <td>Total ventas</td>
                    <td className={styles.num}>{formatSoles(grandTotal)}</td>
                    <td className={styles.num}>{formatPercent(grandTotal > 0 ? 100 : 0)}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className={styles.footerBlock}>
              <h2 className={styles.footerTitle}>COMANDAS: ARTICULOS</h2>
              <table className={styles.table}>
                <colgroup>
                  <col className={styles.colLabel} />
                  <col className={styles.colNum} />
                  <col className={styles.colNum} />
                </colgroup>
                <thead>
                  <tr>
                    <th />
                    <th className={styles.num}>Cantidad</th>
                    <th className={styles.num}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className={styles.total}>
                    <td>Total lineas</td>
                    <td className={styles.num}>{formatQty(0)}</td>
                    <td className={styles.num}>{formatSoles(0)}</td>
                  </tr>
                </tbody>
              </table>
            </section>
          </div>
        </div>
      </div>

      {showPrintDialog && (
        <PrintPropertiesDialog
          reportData={reportData}
          previewMeta={previewMeta}
          onClose={() => setShowPrintDialog(false)}
        />
      )}
    </div>
  );
}

export const SalesDayMonitor = memo(function SalesDayMonitor({ onClose }: Props) {
  const windowRef = useRef<HTMLDivElement>(null);

  return (
    <ModalStackRoot anchorRef={windowRef} onDismissAll={onClose}>
      <SalesDayMonitorContent
        windowRef={windowRef}
        onClose={onClose}
      />
    </ModalStackRoot>
  );
});
