import {useEffect, useMemo, useState, useRef } from "react";
import {
  formatBatchPrintDate,
  formatBatchDocField,
  formatBatchDocListNumber,
  getBatchDocPickerTitle,
  type BatchPrintDocId,
} from "../../data/batchPrintConfig";
import { getSalesForRegisterAndDate } from "../../services/salesSession";
import { imageUrl } from "../../utils/assetUrl";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import styles from "./BatchDocPickerDialog.module.css";

type Props = {
  docType: BatchPrintDocId;
  registerId: string;
  issueDate: Date;
  onSelect: (value: string) => void;
  onClose: () => void;
};

const DOC_ICONS: Record<BatchPrintDocId, string> = {
  boleta: imageUrl("ribbon/boleta.png"),
  factura: imageUrl("ribbon/factura.png"),
  nota: imageUrl("ribbon/nota-vta.png"),
};

function DocFallbackIcon({ docType }: { docType: BatchPrintDocId }) {
  const color = docType === "factura" ? "#c03030" : docType === "nota" ? "#806020" : "#2060a0";
  return (
    <svg viewBox="0 0 16 16" width={16} height={16} className={styles.titleIcon} aria-hidden>
      <rect x="2" y="1.5" width="10" height="13" rx="0.5" fill="#fff" stroke={color} strokeWidth="1" />
      <line x1="4.5" y1="5" x2="9.5" y2="5" stroke={color} strokeWidth="0.8" />
      <line x1="4.5" y1="7.5" x2="9.5" y2="7.5" stroke={color} strokeWidth="0.8" />
      <line x1="4.5" y1="10" x2="8" y2="10" stroke={color} strokeWidth="0.8" />
    </svg>
  );
}

export function BatchDocPickerDialog({ docType, registerId, issueDate, onSelect, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, { panelRef });
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [iconFailed, setIconFailed] = useState(false);

  const rows = useMemo(() => {
    return getSalesForRegisterAndDate(registerId, issueDate)
      .filter((sale) => sale.docType === docType && sale.anulado === 0)
      .sort((a, b) => a.docNumber - b.docNumber)
      .map((sale) => ({
        docNumber: sale.docNumber,
        numero: formatBatchDocListNumber(docType, sale.docNumber),
        fecha: formatBatchPrintDate(sale.at),
      }));
  }, [docType, issueDate, registerId]);

  useEffect(() => {
    setSelectedNumber(rows[0]?.docNumber ?? null);
  }, [rows]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        requestClose();
        return;
      }
      if (event.key !== "Enter" || selectedNumber == null) return;
      onSelect(formatBatchDocField(docType, selectedNumber));
      requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [docType, onSelect, requestClose, selectedNumber]);

  const pick = (docNumber: number) => {
    onSelect(formatBatchDocField(docType, docNumber));
    requestClose();
  };

  const title = getBatchDocPickerTitle(docType);

  return (
    <div className={styles.overlay} {...overlayProps} onClick={onBackdropClick} role="presentation">
      <div
          ref={panelRef}
        className={styles.dialog}
        {...panelProps}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-doc-picker-title"
      >
        <header className={styles.titleBar}>
          {iconFailed ? (
            <DocFallbackIcon docType={docType} />
          ) : (
            <img
              src={DOC_ICONS[docType]}
              alt=""
              className={styles.titleIcon}
              onError={() => setIconFailed(true)}
            />
          )}
          <h2 id="batch-doc-picker-title" className={styles.titleText}>
            {title}
          </h2>
          <button type="button" className={styles.titleClose} onClick={requestClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.listShell} role="listbox" aria-label={`Lista de ${title.toLowerCase()}s`}>
            <div className={styles.listHead} aria-hidden>
              <span>Número</span>
              <span>Fecha</span>
            </div>
            <div className={styles.listScroll}>
              {rows.length === 0 ? (
                <p className={styles.emptyState}>No hay documentos para esta fecha y caja.</p>
              ) : (
                rows.map((row) => {
                  const selected = row.docNumber === selectedNumber;
                  return (
                    <button
                      key={row.docNumber}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={[styles.listRow, selected ? styles.listRowSelected : ""]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => setSelectedNumber(row.docNumber)}
                      onDoubleClick={() => pick(row.docNumber)}
                    >
                      <span>{row.numero}</span>
                      <span>{row.fecha}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
