import {useState, useRef } from "react";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import styles from "./PrintPreviewDialog.module.css";

type Props = {
  lineCount: number;
  onGo: (line: number) => void;
  onClose: () => void;
};

export function GoToLineDialog({ lineCount, onGo, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, { panelRef });
  const [lineStr, setLineStr] = useState("1");

  const handleGo = () => {
    const n = Math.max(1, Math.min(lineCount, Number(lineStr) || 1));
    onGo(n);
  };

  return (
    <div className={styles.goToLineOverlay} {...overlayProps} onClick={onBackdropClick}>
      <div
          ref={panelRef}
        className={styles.goToLineDialog}
        {...panelProps}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="goto-line-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h2 id="goto-line-title" className={styles.titleText}>
            Ir a línea
          </h2>
          <button type="button" className={styles.titleClose} onClick={requestClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className={styles.goToLineBody}>
          <div className={styles.goToLineRow}>
            <label htmlFor="goto-line">Número de línea:</label>
            <input
              id="goto-line"
              className={styles.goToLineInput}
              type="number"
              min={1}
              max={lineCount}
              value={lineStr}
              onChange={(e) => setLineStr(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGo()}
              autoFocus
            />
          </div>
        </div>

        <div className={styles.goToLineActions}>
          <button type="button" className={styles.goToLineBtnPrimary} onClick={handleGo}>
            Ir
          </button>
          <button type="button" className={styles.goToLineBtn} onClick={requestClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
