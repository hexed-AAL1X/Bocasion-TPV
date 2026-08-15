import { useEffect, useRef } from "react";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import styles from "./CarrierDeleteConfirmDialog.module.css";

type Props = {
  carrierName: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const QuestionIcon = () => (
  <svg viewBox="0 0 32 32" width="32" height="32" className={styles.questionIcon} aria-hidden>
    <circle cx="16" cy="16" r="14" fill="#316ac5" stroke="#1a4080" strokeWidth="1" />
    <text x="16" y="21" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="700" fontFamily="Segoe UI, sans-serif">
      ?
    </text>
  </svg>
);

export function CarrierDeleteConfirmDialog({ carrierName, onConfirm, onCancel }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onCancel, { panelRef });
  const noBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    noBtnRef.current?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [requestClose]);

  return (
    <div className={styles.overlay} {...overlayProps} onClick={onBackdropClick} role="presentation">
      <div
          ref={panelRef}
        className={styles.dialog}
        {...panelProps}
        onClick={(event) => event.stopPropagation()}
        role="alertdialog"
        aria-labelledby="carrier-delete-title"
        aria-describedby="carrier-delete-message"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h2 id="carrier-delete-title" className={styles.titleText}>
            Atención
          </h2>
          <button type="button" className={styles.closeBtn} onClick={requestClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className={styles.body}>
          <section className={styles.section}>
            <div className={styles.promptRow}>
              <QuestionIcon />
              <p id="carrier-delete-message" className={styles.message}>
                ¿Seguro de eliminar? {carrierName}
              </p>
            </div>
          </section>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.footerBtn} onClick={onConfirm}>
            Sí
          </button>
          <button
            ref={noBtnRef}
            type="button"
            className={[styles.footerBtn, styles.footerBtnPrimary].filter(Boolean).join(" ")}
            onClick={requestClose}
          >
            No
          </button>
        </footer>
      </div>
    </div>
  );
}
