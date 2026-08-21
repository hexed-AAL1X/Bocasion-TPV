import { Fragment, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { useResizableTableLayout } from "../../hooks/useResizableTableColumns";
import { USD_RATE } from "../../config/currency";
import { POS_BRANCH } from "../../config/pos";
import { formatClienteLabel } from "../../services/identity";
import { getCachedNavaSales, listNavaSalesForDate, mergeDaySales } from "../../services/navaDocs";
import {
  getSaleById,
  getSalesForRegisterAndDate,
  parseSaleDateLabel,
  resolveForpagoDisplay,
  subscribeSales,
  updateSalePayment,
} from "../../services/salesSession";
import type { CompletedSale, PaymentConfirmPayload, PaymentMethod, SaleDocType } from "../../types/sales";
import type { DocsAnnexPrintData } from "../../utils/buildDocsAnnexPrintPreview";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { toggleWithWindowAnimation } from "../../utils/windowMaximizeAnimation";
import styles from "./DocsAnnexDialog.module.css";

const PaymentDialog = lazy(() =>
  import("../PaymentDialog/PaymentDialog").then((m) => ({ default: m.PaymentDialog })),
);
const PrintPropertiesDialog = lazy(() =>
  import("../PrintPropertiesDialog/PrintPropertiesDialog").then((m) => ({
    default: m.PrintPropertiesDialog,
  })),
);

function TitleMaximizeIcon({ restore }: { restore?: boolean }) {
  if (restore) {
    return (
      <svg viewBox="0 0 10 10" width={10} height={10} aria-hidden>
        <rect x="0.5" y="2.5" width="6" height="6" fill="#9ab8d0" stroke="#1a1a1a" strokeWidth="0.9" />
        <rect x="3.5" y="0.5" width="6" height="6" fill="#d8e8f8" stroke="#1a1a1a" strokeWidth="0.9" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 10 10" width={10} height={10} aria-hidden>
      <rect x="1.25" y="1.25" width="7.5" height="7.5" fill="none" stroke="#1a1a1a" strokeWidth="1.25" />
    </svg>
  );
}

export type DocsAnnexMode = "default" | "payment-edit";

type Props = {
  registerId: string;
  registerLabel: string;
  registerPoint: string;
  saleDate: string;
  onClose: () => void;
  mode?: DocsAnnexMode;
};

const DOC_PREFIX: Record<SaleDocType, string> = {
  boleta: "03/B034",
  factura: "01/F001",
  nota: "04/N001",
};

function fmtDoc(docType: SaleDocType, num: number, docRef?: string): string {
  if (docRef?.trim()) return docRef.trim();
  return `${DOC_PREFIX[docType]}-${String(num).padStart(7, "0")}`;
}

function fmtTime(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const h = String(hours).padStart(2, "0");
  return `${day}/${month}/${year} ${h}:${minutes} ${ampm}`;
}

function fmtN(n: number): string {
  if (n === 0) return "";
  return n.toFixed(2);
}

type AnnexRow = {
  saleId: string;
  fecreg: string;
  documento: string;
  cliente: string;
  total: number;
  contado: number;
  credito: number;
  otros: number;
  tipovta: string;
  forpago: string;
  nroCta: string;
  recibidoS: number;
  vueltoS: number;
  recibidoUs: number;
  vueltoUs: number;
  tarjeta: number;
  banco: number;
  montoS: number;
  tCamb: number;
  vendedor: string;
  anulado: number;
  nroOperacion: string;
};

function displayCliente(label: string): string {
  const legacy = label.match(/^(.+?)\((dni|ruc)(\d+)\)$/i);
  if (legacy) {
    const [, name, type, digits] = legacy;
    return formatClienteLabel(name, type.toLowerCase() as "dni" | "ruc", digits);
  }
  return label;
}

function buildRow(sale: CompletedSale): AnnexRow {
  const pm = sale.paymentMethod;
  const t = sale.total;
  const tipovta = sale.tipoVenta || sale.lines[0]?.group || "Mercaderia";
  const isTarjeta = pm === "tarjeta";
  const isBanco = pm === "banco";
  const isCredito = pm === "credito";
  const isCash = pm === "soles" || pm === "mixto";
  const isDolar = pm === "dolar";

  return {
    saleId: sale.id,
    fecreg: fmtTime(sale.at),
    documento: fmtDoc(sale.docType, sale.docNumber, sale.docRef),
    cliente: displayCliente(sale.clienteLabel),
    total: t,
    contado: isCash ? t : 0,
    credito: isCredito ? t : 0,
    otros: 0,
    tipovta,
    forpago: resolveForpagoDisplay(sale.paymentMethod, sale.forpagoLabel),
    nroCta: sale.nroCta,
    recibidoS: sale.receivedS,
    vueltoS: sale.vueltoS,
    recibidoUs: sale.receivedUs,
    vueltoUs: sale.vueltoUs,
    tarjeta: isTarjeta ? t : 0,
    banco: isBanco ? t : 0,
    montoS: isDolar ? 0 : t,
    tCamb: isDolar ? USD_RATE : 0,
    vendedor: sale.vendedor,
    anulado: sale.anulado,
    nroOperacion: sale.nroOperacion,
  };
}

function exportCsv(rows: AnnexRow[], registerLabel: string, saleDate: string): void {
  const headers = [
    "Fecreg", "Documento", "Cliente", "Total S/", "Contado", "Crédito", "Otros",
    "Tipovta", "Forpago", "Nro.Cta.", "Recibido S/", "Vuelto S/",
    "Recibido US$", "Vuelto US$", "Tarjeta", "Banco", "Monto S/", "T.Camb.",
    "Vendedor", "Anulado S/", "N° Operac.",
  ];
  const csvRows = rows.map((r) => [
    r.fecreg, r.documento, r.cliente,
    r.total.toFixed(2), fmtN(r.contado), fmtN(r.credito), fmtN(r.otros),
    r.tipovta, r.forpago, r.nroCta,
    fmtN(r.recibidoS), fmtN(r.vueltoS), fmtN(r.recibidoUs), fmtN(r.vueltoUs),
    fmtN(r.tarjeta), fmtN(r.banco), fmtN(r.montoS),
    r.tCamb > 0 ? r.tCamb.toFixed(3) : "", r.vendedor,
    fmtN(r.anulado), r.nroOperacion,
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...csvRows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Anexo_Documentos_${saleDate.replace(/\//g, "-")}_${registerLabel}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type Totals = Pick<
  AnnexRow,
  | "total"
  | "contado"
  | "credito"
  | "otros"
  | "recibidoS"
  | "vueltoS"
  | "recibidoUs"
  | "vueltoUs"
  | "tarjeta"
  | "banco"
  | "montoS"
  | "anulado"
>;

function sumRows(rows: AnnexRow[]): Totals {
  return rows.reduce<Totals>(
    (acc, r) => ({
      total: acc.total + r.total,
      contado: acc.contado + r.contado,
      credito: acc.credito + r.credito,
      otros: acc.otros + r.otros,
      recibidoS: acc.recibidoS + r.recibidoS,
      vueltoS: acc.vueltoS + r.vueltoS,
      recibidoUs: acc.recibidoUs + r.recibidoUs,
      vueltoUs: acc.vueltoUs + r.vueltoUs,
      tarjeta: acc.tarjeta + r.tarjeta,
      banco: acc.banco + r.banco,
      montoS: acc.montoS + r.montoS,
      anulado: acc.anulado + r.anulado,
    }),
    {
      total: 0, contado: 0, credito: 0, otros: 0,
      recibidoS: 0, vueltoS: 0, recibidoUs: 0, vueltoUs: 0,
      tarjeta: 0, banco: 0, montoS: 0, anulado: 0,
    },
  );
}

function initialReceivedForSale(sale: CompletedSale): number | undefined {
  if (sale.paymentMethod === "dolar") {
    return sale.receivedUs > 0 ? sale.receivedUs : undefined;
  }
  if (sale.paymentMethod === "credito") return undefined;
  return sale.receivedS > 0 ? sale.receivedS : sale.total;
}

const ExcelToolbarIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" aria-hidden>
    <path d="M2 1h8.5L15 5.5V17a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" fill="#f4fbf7" stroke="#7a7a7a" strokeWidth="0.7" />
    <path d="M10.5 1l4.5 4.5h-4.5z" fill="#c8e0d0" />
    <path d="M1 2a1 1 0 0 1 1-1h5v16H2a1 1 0 0 1-1-1V2z" fill="#217346" />
    <line x1="2.8" y1="6.8" x2="5.8" y2="10.5" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
    <line x1="5.8" y1="6.8" x2="2.8" y2="10.5" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
    <rect x="7" y="5.5" width="7.5" height="2" fill="#1d6338" />
    <line x1="7" y1="9.5" x2="14.5" y2="9.5" stroke="#a8d4ba" strokeWidth="0.6" />
    <line x1="7" y1="12" x2="14.5" y2="12" stroke="#a8d4ba" strokeWidth="0.6" />
    <line x1="7" y1="14.5" x2="14.5" y2="14.5" stroke="#a8d4ba" strokeWidth="0.6" />
    <line x1="10.8" y1="7.5" x2="10.8" y2="16" stroke="#a8d4ba" strokeWidth="0.6" />
  </svg>
);

const PrintToolbarIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" aria-hidden>
    <rect x="4" y="1.5" width="10" height="4" rx="0.5" fill="#e8e8e8" stroke="#7a7a7a" strokeWidth="0.9" />
    <rect x="2" y="6.5" width="14" height="7" rx="1" fill="#f4f4f4" stroke="#7a7a7a" strokeWidth="0.9" />
    <rect x="4" y="10" width="10" height="6" fill="#fff" stroke="#9a9a9a" strokeWidth="0.8" />
    <line x1="5" y1="4" x2="13" y2="4" stroke="#9a9a9a" strokeWidth="0.8" />
    <circle cx="13.5" cy="9.5" r="0.8" fill="#4a4a4a" />
  </svg>
);

const PaymentEditIcon = () => (
  <svg viewBox="0 0 14 14" width="12" height="12" aria-hidden>
    <rect x="1" y="1" width="12" height="12" fill="#fff" stroke="#666" strokeWidth="0.8" />
    <line x1="1" y1="4.5" x2="13" y2="4.5" stroke="#7a9ab8" strokeWidth="0.7" />
    <line x1="1" y1="8" x2="13" y2="8" stroke="#7a9ab8" strokeWidth="0.7" />
    <line x1="4.5" y1="1" x2="4.5" y2="13" stroke="#7a9ab8" strokeWidth="0.7" />
    <line x1="8" y1="1" x2="8" y2="13" stroke="#7a9ab8" strokeWidth="0.7" />
    <rect x="9.5" y="9.5" width="3" height="3" fill="#f0b040" stroke="#c08020" strokeWidth="0.5" />
  </svg>
);

type AnnexColumnDef = {
  key: string;
  label: string;
  defaultWidth: number;
  minWidth: number;
  resizable?: boolean;
  stretchWeight?: number;
  align?: "left" | "right" | "center";
  clip?: boolean;
};

const ANNEX_COLUMNS: AnnexColumnDef[] = [
  { key: "fecreg", label: "Fecreg", defaultWidth: 128, minWidth: 110, stretchWeight: 1, clip: true },
  { key: "documento", label: "Documento", defaultWidth: 122, minWidth: 108, stretchWeight: 1, clip: true },
  { key: "cliente", label: "Cliente", defaultWidth: 150, minWidth: 100, stretchWeight: 2, clip: true },
  { key: "total", label: "Total S/", defaultWidth: 64, minWidth: 56, align: "right" },
  { key: "contado", label: "Contado", defaultWidth: 60, minWidth: 52, align: "right" },
  { key: "credito", label: "Crédito", defaultWidth: 58, minWidth: 52, align: "right" },
  { key: "otros", label: "Otros", defaultWidth: 48, minWidth: 44, align: "right" },
  { key: "tipovta", label: "Tipovta", defaultWidth: 78, minWidth: 64, stretchWeight: 1, clip: true },
  { key: "forpago", label: "Forpago", defaultWidth: 72, minWidth: 60, stretchWeight: 1, clip: true },
  { key: "payEdit", label: "", defaultWidth: 24, minWidth: 24, resizable: false, align: "center" },
  { key: "nroCta", label: "Nro.Cta.", defaultWidth: 52, minWidth: 44, align: "center" },
  { key: "recibidoS", label: "Recibido S/", defaultWidth: 72, minWidth: 64, align: "right" },
  { key: "vueltoS", label: "Vuelto S/", defaultWidth: 64, minWidth: 56, align: "right" },
  { key: "recibidoUs", label: "Recibido US$", defaultWidth: 78, minWidth: 68, align: "right" },
  { key: "vueltoUs", label: "Vuelto US$", defaultWidth: 68, minWidth: 56, align: "right" },
  { key: "tarjeta", label: "Tarjeta", defaultWidth: 56, minWidth: 48, align: "right" },
  { key: "banco", label: "Banco", defaultWidth: 52, minWidth: 44, align: "right" },
  { key: "montoS", label: "Monto S/", defaultWidth: 64, minWidth: 56, align: "right" },
  { key: "tCamb", label: "T.Camb.", defaultWidth: 56, minWidth: 48, align: "right" },
  { key: "vendedor", label: "Vendedor", defaultWidth: 72, minWidth: 56, stretchWeight: 1, clip: true },
  { key: "anulado", label: "Anulado S/", defaultWidth: 68, minWidth: 56, align: "right" },
  { key: "operacion", label: "N° Operac.", defaultWidth: 72, minWidth: 60, stretchWeight: 1, clip: true },
];

const PAYMENT_EDIT_COLUMN_KEYS = new Set([
  "fecreg",
  "documento",
  "cliente",
  "total",
  "forpago",
  "payEdit",
  "nroCta",
  "recibidoS",
  "vueltoS",
  "recibidoUs",
  "vueltoUs",
  "tarjeta",
  "banco",
  "montoS",
  "tCamb",
]);

function columnsForMode(mode: DocsAnnexMode): AnnexColumnDef[] {
  if (mode === "payment-edit") {
    return ANNEX_COLUMNS.filter((col) => PAYMENT_EDIT_COLUMN_KEYS.has(col.key));
  }
  return ANNEX_COLUMNS;
}

const FROZEN_COLUMN_COUNT = 3;

function frozenLeftOffsets(widths: number[]): number[] {
  return widths.slice(0, FROZEN_COLUMN_COUNT).map((_, index) =>
    widths.slice(0, index).reduce((sum, width) => sum + width, 0),
  );
}

function stickyClasses(index: number, extra?: string): string {
  if (index >= FROZEN_COLUMN_COUNT) return extra ?? "";
  return [
    extra,
    styles.stickyCol,
    index === FROZEN_COLUMN_COUNT - 1 ? styles.stickyColEdge : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function headerCellClasses(index: number, extra?: string): string {
  if (index < FROZEN_COLUMN_COUNT) {
    return [stickyClasses(index, extra), styles.stickyTh].filter(Boolean).join(" ");
  }
  return [extra, styles.scrollTh].filter(Boolean).join(" ");
}

function stickyHeaderStyle(
  index: number,
  offsets: number[],
  widths: number[],
): CSSProperties | undefined {
  const width = widths[index];
  const sizing =
    width > 0
      ? { width, minWidth: width, maxWidth: width }
      : undefined;
  if (index >= FROZEN_COLUMN_COUNT) return sizing;
  return { ...sizing, left: offsets[index], zIndex: 30 + index };
}

function stickyCellStyle(
  index: number,
  offsets: number[],
  widths: number[],
): CSSProperties | undefined {
  const width = widths[index];
  const sizing =
    width > 0
      ? { width, minWidth: width, maxWidth: width }
      : undefined;
  if (index >= FROZEN_COLUMN_COUNT) return sizing;
  return { ...sizing, left: offsets[index], zIndex: 10 + index };
}

function footerCellValue(key: string, totals: Totals): string {
  switch (key) {
    case "total":
      return totals.total > 0 ? totals.total.toFixed(2) : "";
    case "contado":
      return fmtN(totals.contado);
    case "credito":
      return fmtN(totals.credito);
    case "otros":
      return fmtN(totals.otros);
    case "recibidoS":
      return fmtN(totals.recibidoS);
    case "vueltoS":
      return fmtN(totals.vueltoS);
    case "recibidoUs":
      return fmtN(totals.recibidoUs);
    case "vueltoUs":
      return fmtN(totals.vueltoUs);
    case "tarjeta":
      return fmtN(totals.tarjeta);
    case "banco":
      return fmtN(totals.banco);
    case "montoS":
      return fmtN(totals.montoS);
    case "anulado":
      return fmtN(totals.anulado);
    default:
      return "";
  }
}

function renderAnnexBodyCell(
  row: AnnexRow,
  col: AnnexColumnDef,
  index: number,
  frozenOffsets: number[],
  layoutWidths: number[],
  paymentEditMode: boolean,
  openPaymentEditor: (saleId: string, e: MouseEvent) => void,
): ReactNode {
  const payEditHighlight = paymentEditMode && col.key === "payEdit" ? styles.payEditColHighlight : "";
  const forpagoHighlight = paymentEditMode && col.key === "forpago" ? styles.payEditColNeighbor : "";

  switch (col.key) {
    case "fecreg":
      return (
        <td
          className={stickyClasses(index, `${styles.tdFecreg} ${styles.cellClip}`)}
          style={stickyCellStyle(index, frozenOffsets, layoutWidths)}
          title={row.fecreg}
        >
          {row.fecreg}
        </td>
      );
    case "documento":
      return (
        <td
          className={stickyClasses(index, `${styles.tdDoc} ${styles.cellClip}`)}
          style={stickyCellStyle(index, frozenOffsets, layoutWidths)}
        >
          <span className={styles.docLink} title={row.documento}>
            {row.documento}
          </span>
        </td>
      );
    case "cliente":
      return (
        <td
          className={stickyClasses(index, styles.cellClip)}
          style={stickyCellStyle(index, frozenOffsets, layoutWidths)}
          title={row.cliente}
        >
          {row.cliente}
        </td>
      );
    case "total":
      return <td className={styles.tdNum}>{row.total.toFixed(2)}</td>;
    case "contado":
      return <td className={styles.tdNum}>{fmtN(row.contado)}</td>;
    case "credito":
      return <td className={styles.tdNum}>{fmtN(row.credito)}</td>;
    case "otros":
      return <td className={styles.tdNum}>{fmtN(row.otros)}</td>;
    case "tipovta":
      return (
        <td className={styles.cellClip} title={row.tipovta}>
          {row.tipovta}
        </td>
      );
    case "forpago":
      return (
        <td className={[styles.cellClip, forpagoHighlight].filter(Boolean).join(" ")} title={row.forpago}>
          {row.forpago}
        </td>
      );
    case "payEdit":
      return (
        <td className={[styles.tdPayEdit, payEditHighlight].filter(Boolean).join(" ")}>
          <button
            type="button"
            className={styles.payEditBtn}
            title="Editar la forma de pago"
            aria-label={`Editar forma de pago del documento ${row.documento}`}
            onClick={(e) => openPaymentEditor(row.saleId, e)}
          >
            <PaymentEditIcon />
          </button>
        </td>
      );
    case "nroCta":
      return <td className={styles.tdNroCta}>{row.nroCta}</td>;
    case "recibidoS":
      return <td className={styles.tdNum}>{fmtN(row.recibidoS)}</td>;
    case "vueltoS":
      return <td className={styles.tdNum}>{fmtN(row.vueltoS)}</td>;
    case "recibidoUs":
      return <td className={styles.tdNum}>{fmtN(row.recibidoUs)}</td>;
    case "vueltoUs":
      return <td className={styles.tdNum}>{fmtN(row.vueltoUs)}</td>;
    case "tarjeta":
      return <td className={styles.tdNum}>{fmtN(row.tarjeta)}</td>;
    case "banco":
      return <td className={styles.tdNum}>{fmtN(row.banco)}</td>;
    case "montoS":
      return <td className={styles.tdNum}>{fmtN(row.montoS)}</td>;
    case "tCamb":
      return <td className={styles.tdNum}>{row.tCamb > 0 ? row.tCamb.toFixed(3) : ""}</td>;
    case "vendedor":
      return (
        <td className={`${styles.tdVendedor} ${styles.cellClip}`} title={row.vendedor}>
          {row.vendedor}
        </td>
      );
    case "anulado":
      return <td className={styles.tdNum}>{fmtN(row.anulado)}</td>;
    case "operacion":
      return (
        <td className={styles.cellClip} title={row.nroOperacion}>
          {row.nroOperacion}
        </td>
      );
    default:
      return <td />;
  }
}

function renderAnnexFooterCell(
  col: AnnexColumnDef,
  index: number,
  frozenOffsets: number[],
  layoutWidths: number[],
  totals: Totals,
  paymentEditMode: boolean,
): ReactNode {
  const payEditHighlight = paymentEditMode && col.key === "payEdit" ? styles.payEditColHighlight : "";

  if (index < FROZEN_COLUMN_COUNT) {
    return (
      <td
        className={stickyClasses(index, index === 0 ? styles.totalsLabel : undefined)}
        style={stickyCellStyle(index, frozenOffsets, layoutWidths)}
      />
    );
  }

  const value = footerCellValue(col.key, totals);
  if (value) {
    return <td className={styles.tdNum}>{value}</td>;
  }

  if (col.key === "payEdit") {
    return <td className={[styles.tdPayEdit, payEditHighlight].filter(Boolean).join(" ")} />;
  }

  return <td />;
}

export function DocsAnnexDialog({
  registerId,
  registerLabel,
  registerPoint,
  saleDate,
  onClose,
  mode = "default",
}: Props) {
  const paymentEditMode = mode === "payment-edit";
  const windowRef = useRef<HTMLDivElement>(null);
  const [maximized, setMaximized] = useState(false);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, {
    panelRef: windowRef,
    dragDisabled: maximized,
  });
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [salesRevision, setSalesRevision] = useState(0);
  const [sqlSales, setSqlSales] = useState<CompletedSale[]>(() =>
    getCachedNavaSales(parseSaleDateLabel(saleDate)),
  );
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const visibleColumns = useMemo(() => columnsForMode(mode), [mode]);
  const { tableWrapRefCallback, layoutWidths, tableStyle, getColumnStyle, startResize } = useResizableTableLayout(
    visibleColumns,
    { resetDeps: [mode], frozenColumnCount: FROZEN_COLUMN_COUNT },
  );
  const frozenOffsets = useMemo(() => frozenLeftOffsets(layoutWidths), [layoutWidths]);

  useEffect(() => subscribeSales(() => setSalesRevision((n) => n + 1)), []);

  const rows = useMemo(() => {
    const date = parseSaleDateLabel(saleDate);
    const local = getSalesForRegisterAndDate(registerId, date);
    return mergeDaySales(local, sqlSales).map(buildRow);
  }, [registerId, saleDate, salesRevision, sqlSales]);

  useEffect(() => {
    const date = parseSaleDateLabel(saleDate);
    let cancelled = false;
    void listNavaSalesForDate(date, registerId)
      .then((sales) => {
        if (!cancelled) setSqlSales(sales);
      })
      .catch(() => {
        /* se muestra lo local */
      });
    return () => {
      cancelled = true;
    };
  }, [saleDate, registerId]);
  const totals = useMemo(() => sumRows(rows), [rows]);
  const editingSale = editingSaleId ? getSaleById(editingSaleId) : undefined;

  const annexPrintData = useMemo<DocsAnnexPrintData>(
    () => ({
      branch: POS_BRANCH,
      point: registerPoint,
      registerLabel,
      saleDate,
      rows,
      totals,
    }),
    [registerPoint, registerLabel, saleDate, rows, totals],
  );

  const handleExcel = () => exportCsv(rows, registerLabel, saleDate);
  const handlePrint = () => setShowPrintDialog(true);

  const handlePaymentConfirm = (method: PaymentMethod, payment: PaymentConfirmPayload) => {
    if (!editingSaleId) return;
    updateSalePayment(editingSaleId, method, payment);
    setSalesRevision((n) => n + 1);
    setEditingSaleId(null);
  };

  const openPaymentEditor = useCallback((saleId: string, e: MouseEvent) => {
    e.stopPropagation();
    if (!getSaleById(saleId)) return;
    setSelectedSaleId(saleId);
    setEditingSaleId(saleId);
  }, []);

  const handleRowSelect = useCallback((saleId: string) => {
    if (!paymentEditMode) return;
    setSelectedSaleId(saleId);
  }, [paymentEditMode]);

  const toggleMaximized = useCallback(() => {
    toggleWithWindowAnimation(windowRef.current, () => {
      setMaximized((m) => !m);
    });
  }, []);

  return (
    <div
      className={`${styles.overlay} ${maximized ? styles.overlayMax : ""}`}
      {...overlayProps}
      role="presentation"
      onClick={onBackdropClick}
    >
      <div
        ref={windowRef}
        className={`${styles.window} ${maximized ? styles.windowMax : ""}`}
        {...panelProps}
        role="dialog"
        aria-labelledby="annex-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.titleBar}>
          <h1 id="annex-title" className={styles.titleText}>
            {paymentEditMode
              ? "Anexo de documentos — Cambio de forma de pago"
              : "Liquidación de venta - Anexo de documentos"}
          </h1>
          <div className={styles.titleBtns}>
            <button
              type="button"
              className={styles.titleSysBtn}
              onClick={toggleMaximized}
              aria-label={maximized ? "Restaurar" : "Maximizar"}
            >
              <TitleMaximizeIcon restore={maximized} />
            </button>
            <button
              type="button"
              className={`${styles.titleSysBtn} ${styles.titleClose}`}
              onClick={requestClose}
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        </header>

        <div className={styles.infoBar}>
          <div className={styles.infoMeta}>
            <span className={styles.infoItem}>
              <span className={styles.infoLabel}>Tienda:</span> {POS_BRANCH}
            </span>
            <span className={styles.infoSep} aria-hidden="true" />
            <span className={styles.infoItem}>
              <span className={styles.infoLabel}>Caja:</span> {registerPoint}
            </span>
            <span className={styles.infoSep} aria-hidden="true" />
            <span className={styles.infoItem}>
              <span className={styles.infoLabel}>Responsable:</span> {registerLabel}
            </span>
            <span className={styles.infoSep} aria-hidden="true" />
            <span className={styles.infoItem}>
              <span className={styles.infoLabel}>Vta. del día:</span> {saleDate} 12:00 AM
            </span>
          </div>
          {!paymentEditMode ? (
            <div className={styles.infoActions}>
              <button type="button" className={styles.infoBtn} title="Exportar a Excel" aria-label="Exportar a Excel" onClick={handleExcel}>
                <ExcelToolbarIcon />
              </button>
              <button type="button" className={styles.infoBtn} title="Imprimir" aria-label="Imprimir" onClick={handlePrint}>
                <PrintToolbarIcon />
              </button>
            </div>
          ) : null}
        </div>

        {paymentEditMode ? (
          <div className={styles.modeHint}>
            Seleccione un documento y pulse el icono de edición para cambiar la forma de pago.
          </div>
        ) : null}

        <div className={styles.tableWrap} ref={tableWrapRefCallback}>
          {rows.length === 0 ? (
            <p className={styles.emptyMsg}>No hay datos</p>
          ) : (
            <table className={styles.table} style={tableStyle}>
              <colgroup>
                {layoutWidths.map((_, index) => (
                  <col key={visibleColumns[index].key} style={getColumnStyle(index)} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {visibleColumns.map((col, index) => (
                    <th
                      key={col.key}
                      className={headerCellClasses(
                        index,
                        [
                          col.align === "right"
                            ? styles.thNum
                            : col.align === "center"
                              ? styles.thCenter
                              : undefined,
                          paymentEditMode && col.key === "payEdit" ? styles.payEditColHighlightTh : "",
                          paymentEditMode && col.key === "forpago" ? styles.payEditColNeighborTh : "",
                        ]
                          .filter(Boolean)
                          .join(" "),
                      )}
                      style={stickyHeaderStyle(index, frozenOffsets, layoutWidths)}
                      aria-label={col.key === "payEdit" ? "Editar forma de pago" : undefined}
                    >
                      <span className={styles.thLabel}>{col.label}</span>
                      {col.resizable !== false && index < visibleColumns.length - 1 ? (
                        <span
                          className={styles.colResizeHandle}
                          role="separator"
                          aria-orientation="vertical"
                          aria-label={`Redimensionar columna ${col.label || col.key}`}
                          onMouseDown={(e) => startResize(index, e)}
                        />
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.saleId}
                    className={[
                      i % 2 === 0 ? styles.rowEven : styles.rowOdd,
                      paymentEditMode ? styles.rowSelectable : "",
                      paymentEditMode && selectedSaleId === row.saleId ? styles.rowSelectedPayment : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => handleRowSelect(row.saleId)}
                  >
                    {visibleColumns.map((col, index) => (
                      <Fragment key={col.key}>
                        {renderAnnexBodyCell(
                          row,
                          col,
                          index,
                          frozenOffsets,
                          layoutWidths,
                          paymentEditMode,
                          openPaymentEditor,
                        )}
                      </Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={styles.totalsRow}>
                  {visibleColumns.map((col, index) => (
                    <Fragment key={col.key}>
                      {renderAnnexFooterCell(col, index, frozenOffsets, layoutWidths, totals, paymentEditMode)}
                    </Fragment>
                  ))}
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        <div className={styles.statusBar}>
          <span>
            {paymentEditMode
              ? "Cambio de forma de pago"
              : `${rows.length} registro${rows.length !== 1 ? "s" : ""}`}
          </span>
        </div>
      </div>

      {editingSale ? (
        <Suspense fallback={null}>
          <PaymentDialog
            elevated
            total={editingSale.total}
            initial={{
              method: editingSale.paymentMethod,
              received: initialReceivedForSale(editingSale),
              cardProvider: editingSale.forpagoLabel || undefined,
              documentLabel: fmtDoc(editingSale.docType, editingSale.docNumber),
            }}
            onClose={() => setEditingSaleId(null)}
            onConfirm={handlePaymentConfirm}
          />
        </Suspense>
      ) : null}

      {showPrintDialog ? (
        <Suspense fallback={null}>
          <PrintPropertiesDialog
            annexData={annexPrintData}
            onClose={() => setShowPrintDialog(false)}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
