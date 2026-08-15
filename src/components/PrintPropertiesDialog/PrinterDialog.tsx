import {useEffect, useMemo, useState, useRef } from "react";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { WinSelect } from "../WinSelect/WinSelect";
import type { PrinterInfoLite } from "../../types/printer";
import styles from "./PrinterDialog.module.css";

type Props = {
  printers: PrinterInfoLite[];
  selectedName: string;
  onApply: (name: string) => void;
  onClose: () => void;
};

export function PrinterDialog({ printers, selectedName, onApply, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, { panelRef });
  const [draftName, setDraftName] = useState(selectedName);

  useEffect(() => {
    setDraftName(selectedName);
  }, [selectedName]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      requestClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [requestClose]);

  const printerOptions = useMemo(
    () => printers.map((p) => ({ value: p.name, label: p.name })),
    [printers],
  );

  const selected = useMemo(
    () => printers.find((p) => p.name === draftName) ?? printers[0],
    [draftName, printers],
  );

  const handleOk = () => {
    if (selected) onApply(selected.name);
    requestClose();
  };

  return (
    <div className={styles.overlay} {...overlayProps} onClick={onBackdropClick} role="presentation">
      <div
          ref={panelRef}
        className={styles.dialog}
        {...panelProps}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="printer-dialog-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h2 id="printer-dialog-title" className={styles.titleText}>
            Impresora
          </h2>
          <button type="button" className={styles.titleClose} onClick={requestClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className={styles.body}>
          <fieldset className={styles.group}>
            <legend className={styles.groupTitle}>Impresora</legend>
            <div className={styles.fieldGrid}>
              <label htmlFor="printer-dialog-name">Nombre:</label>
              <WinSelect
                id="printer-dialog-name"
                className={styles.select}
                value={draftName}
                options={printerOptions}
                onChange={setDraftName}
                aria-label="Impresora"
              />

              <label>Estado:</label>
              <div className={styles.readonly}>{selected?.status ?? "—"}</div>

              <label>Tipo:</label>
              <div className={styles.readonly}>{selected?.description || "—"}</div>

              <label>Ubicación:</label>
              <div className={styles.readonly}>{selected?.portName || "—"}</div>

              <label>Comentario:</label>
              <div className={styles.readonly}>{selected?.comment || " "}</div>
            </div>
          </fieldset>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.footerBtn} disabled title="Próximamente">
            Red…
          </button>
          <div className={styles.footerRight}>
            <button type="button" className={`${styles.footerBtn} ${styles.footerBtnPrimary}`} onClick={handleOk}>
              Aceptar
            </button>
            <button type="button" className={styles.footerBtn} onClick={requestClose}>
              Cancelar
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
