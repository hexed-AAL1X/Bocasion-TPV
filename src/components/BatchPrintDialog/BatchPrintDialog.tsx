import { useEffect, useMemo, useRef, useState } from "react";
import { ARCHIVO_SESSION } from "../../data/archivoMenu";
import {
  BATCH_PRINT_DOC_TYPES,
  formatBatchPrintDate,
  getBatchPrintDoc,
  type BatchPrintDocId,
} from "../../data/batchPrintConfig";
import { POS_REGISTERS, loadPosRegistersFromNava } from "../../data/posRegisters";
import { getActiveRegisterId } from "../../services/salesSession";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { WinSelect } from "../WinSelect/WinSelect";
import { SalesDayCalendar } from "../SalesDayMonitor/SalesDayCalendar";
import { BatchDocPickerDialog } from "./BatchDocPickerDialog";
import styles from "./BatchPrintDialog.module.css";

type Props = {
  onClose: () => void;
};

const LookupIcon = () => (
  <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
    <rect x="2" y="4" width="11" height="9" rx="1" fill="#f8f6f0" stroke="#848078" strokeWidth="1" />
    <path d="M11 8h5l2 2v5h-7V8z" fill="#e8e4d8" stroke="#848078" strokeWidth="0.8" />
    <path d="M5 7h5M5 10h3" stroke="#848078" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

function defaultRegisterId(): string {
  const sessionPoint = ARCHIVO_SESSION.puntoEmision.toUpperCase();
  const bySession = POS_REGISTERS.find((item) => item.point.toUpperCase() === sessionPoint);
  if (bySession) return bySession.id;
  return getActiveRegisterId();
}

export function BatchPrintDialog({ onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, { panelRef });
  const dateFieldRef = useRef<HTMLDivElement>(null);

  const [docType, setDocType] = useState<BatchPrintDocId>("boleta");
  const [copies, setCopies] = useState(1);
  const [issueDate, setIssueDate] = useState(() => new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [registerId, setRegisterId] = useState(defaultRegisterId);
  const [docFrom, setDocFrom] = useState("B -");
  const [docTo, setDocTo] = useState("B -");
  const [printToPdf, setPrintToPdf] = useState(false);
  const [docPickerTarget, setDocPickerTarget] = useState<"from" | "to" | null>(null);

  const docTypeOptions = useMemo(
    () => BATCH_PRINT_DOC_TYPES.map((item) => ({ value: item.id, label: item.label })),
    [],
  );

  const [registerTick, setRegisterTick] = useState(0);
  const registerOptions = useMemo(
    () => POS_REGISTERS.map((item) => ({ value: item.id, label: item.point })),
    [registerTick],
  );

  useEffect(() => {
    void loadPosRegistersFromNava().then(() => setRegisterTick((n) => n + 1));
  }, []);

  useEffect(() => {
    const doc = getBatchPrintDoc(docType);
    setDocFrom(doc.rangePrefix);
    setDocTo(doc.rangePrefix);
  }, [docType]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestClose]);

  const handlePrint = () => {
    requestClose();
  };

  const handleDocPick = (value: string) => {
    if (docPickerTarget === "from") setDocFrom(value);
    if (docPickerTarget === "to") setDocTo(value);
    setDocPickerTarget(null);
  };

  return (
    <div className={styles.overlay} {...overlayProps} onClick={onBackdropClick} role="presentation">
      <div
          ref={panelRef}
        className={styles.dialog}
        {...panelProps}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-print-title"
      >
        <header className={styles.titleBar}>
          <h2 id="batch-print-title" className={styles.titleText}>
            Impresión de Doc. x Lotes
          </h2>
          <button type="button" className={styles.closeBtn} onClick={requestClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className={styles.body}>
          <section className={styles.section}>
            <h3 className={styles.sectionHeader}>Seleccionar documento a imprimir</h3>
            <div className={styles.formRows}>
              <div className={styles.formRow}>
                <label className={styles.formLabel} htmlFor="batch-doc-type">
                  Doc. a imprimir
                </label>
                <WinSelect
                  id="batch-doc-type"
                  className={styles.select}
                  value={docType}
                  options={docTypeOptions}
                  onChange={(next) => setDocType(next as BatchPrintDocId)}
                  aria-label="Documento a imprimir"
                />
              </div>
              <div className={styles.formRow}>
                <label className={styles.formLabel} htmlFor="batch-copies">
                  Nº copias x doc.
                </label>
                <input
                  id="batch-copies"
                  className={styles.spinnerInput}
                  type="number"
                  min={1}
                  max={99}
                  value={copies}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setCopies(Number.isFinite(next) && next > 0 ? Math.min(99, Math.floor(next)) : 1);
                  }}
                />
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionHeader}>Rango de documento</h3>
            <div className={styles.formRows}>
              <div className={styles.formRow}>
                <label className={styles.formLabel} htmlFor="batch-issue-date">
                  Fecha de emisión
                </label>
                <div className={styles.dateField} ref={dateFieldRef}>
                  <input
                    id="batch-issue-date"
                    className={styles.textInput}
                    value={formatBatchPrintDate(issueDate)}
                    readOnly
                    tabIndex={-1}
                    onClick={() => setCalendarOpen(true)}
                  />
                  <button
                    type="button"
                    className={[
                      styles.calendarBtn,
                      calendarOpen ? styles.calendarBtnOpen : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setCalendarOpen((current) => !current)}
                    title="Seleccionar fecha"
                    aria-expanded={calendarOpen}
                    aria-haspopup="dialog"
                  >
                    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
                      <rect x="1" y="2" width="14" height="13" rx="1" fill="#fff" stroke="#848078" />
                      <line x1="1" y1="6" x2="15" y2="6" stroke="#848078" />
                    </svg>
                  </button>
                  <SalesDayCalendar
                    anchorRef={dateFieldRef}
                    open={calendarOpen}
                    onOpenChange={setCalendarOpen}
                    value={issueDate}
                    onChange={setIssueDate}
                    ariaLabel="Seleccionar fecha de emisión"
                  />
                </div>
              </div>
              <div className={styles.formRow}>
                <label className={styles.formLabel} htmlFor="batch-register">
                  Punto de venta
                </label>
                <WinSelect
                  id="batch-register"
                  className={styles.select}
                  value={registerId}
                  options={registerOptions}
                  onChange={setRegisterId}
                  aria-label="Punto de venta"
                />
              </div>
              <div className={styles.formRow}>
                <label className={styles.formLabel} htmlFor="batch-doc-from">
                  Documento: Desde
                </label>
                <div className={styles.lookupField}>
                  <input
                    id="batch-doc-from"
                    className={styles.textInput}
                    value={docFrom}
                    onChange={(event) => setDocFrom(event.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.lookupBtn}
                    title="Buscar documento"
                    onClick={() => setDocPickerTarget("from")}
                  >
                    <LookupIcon />
                  </button>
                </div>
              </div>
              <div className={styles.formRow}>
                <label className={styles.formLabel} htmlFor="batch-doc-to">
                  Hasta
                </label>
                <div className={styles.lookupField}>
                  <input
                    id="batch-doc-to"
                    className={styles.textInput}
                    value={docTo}
                    onChange={(event) => setDocTo(event.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.lookupBtn}
                    title="Buscar documento"
                    onClick={() => setDocPickerTarget("to")}
                  >
                    <LookupIcon />
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionHeader}>Impresión a PDF</h3>
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={printToPdf}
                onChange={(event) => setPrintToPdf(event.target.checked)}
              />
              <span>Imprimir los docs. en un archivo PDF</span>
            </label>
          </section>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.footerBtn} onClick={requestClose}>
            Cancelar
          </button>
          <button type="button" className={`${styles.footerBtn} ${styles.footerBtnPrimary}`} onClick={handlePrint}>
            Imprimir
          </button>
        </footer>
      </div>

      {docPickerTarget && (
        <BatchDocPickerDialog
          docType={docType}
          registerId={registerId}
          issueDate={issueDate}
          onSelect={handleDocPick}
          onClose={() => setDocPickerTarget(null)}
        />
      )}
    </div>
  );
}
