import { useEffect, useRef } from "react";
import { APP_NAME } from "../../config/brand";
import { formatOpenWindowsMessage } from "../../utils/openWindows";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import styles from "./ExitConfirmDialog.module.css";

type Props = {
  openWindows: string[];
  onConfirm: () => void;
  onCancel: () => void;
};

const YesIcon = () => (
  <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden>
    <circle cx="14" cy="14" r="12" fill="#5a9a5a" stroke="#3a703a" strokeWidth="1.2" />
    <path d="M9 14l3.5 3.5L19 10" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const NoIcon = () => (
  <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden>
    <circle cx="14" cy="14" r="12" fill="#c03030" stroke="#901818" strokeWidth="1.2" />
    <path d="M10 10l8 8M18 10l-8 8" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const WarningIcon = () => (
  <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden>
    <path d="M16 3L2 29h28L16 3z" fill="#ffff80" stroke="#c8a800" strokeWidth="1.2" strokeLinejoin="round" />
    <rect x="15" y="12" width="2" height="9" rx="1" fill="#000" />
    <circle cx="16" cy="24" r="1.5" fill="#000" />
  </svg>
);

export function ExitConfirmDialog({ openWindows, onConfirm, onCancel }: Props) {
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

  const windowsText = formatOpenWindowsMessage(openWindows);

  return (
    <div className={styles.overlay} {...overlayProps} onClick={onBackdropClick} role="presentation">
      <div
          ref={panelRef}
        className={styles.dialog}
        {...panelProps}
        onClick={(event) => event.stopPropagation()}
        role="alertdialog"
        aria-labelledby="exit-confirm-title"
        aria-describedby="exit-confirm-message"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h2 id="exit-confirm-title" className={styles.title}>
            {APP_NAME}
          </h2>
        </header>

        <div className={styles.body}>
          <WarningIcon />
          <p id="exit-confirm-message" className={styles.message}>
            Existen ventanas abiertas en el sistema: {windowsText}
            <span className={styles.question}>¿Salir de todas maneras?</span>
          </p>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.choiceBtn} onClick={onConfirm}>
            <span className={styles.choiceIcon}>
              <YesIcon />
            </span>
            <span className={styles.choiceLabel}>Si</span>
          </button>
          <button
            ref={noBtnRef}
            type="button"
            className={[styles.choiceBtn, styles.choiceBtnNo].join(" ")}
            onClick={requestClose}
          >
            <span className={styles.choiceIcon}>
              <NoIcon />
            </span>
            <span className={[styles.choiceLabel, styles.choiceLabelStrong].join(" ")}>No</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
