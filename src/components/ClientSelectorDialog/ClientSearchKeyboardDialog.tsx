import {useCallback, useEffect, useState, useRef } from "react";
import { searchClients } from "../../data/clients";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import styles from "./ClientSearchKeyboardDialog.module.css";

type Props = {
  onConfirm: (query: string) => void;
  onClose: () => void;
};

const ROWS: string[][] = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "⌫"],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "↵"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ñ"],
  ["Z", "X", "C", "V", "B", "N", "M", "%", ".", "-", "✕"],
  ["SPACE"],
];

export function ClientSearchKeyboardDialog({ onConfirm, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, { panelRef });
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = useCallback(() => {
    const q = value.trim();
    if (!q) {
      setError("Ingrese un código o nombre para continuar.");
      return;
    }
    const results = searchClients(q);
    if (results.length === 0) {
      setError("No se encontró ningún cliente con ese código o nombre.");
      return;
    }
    setError(null);
    onConfirm(q);
  }, [value, onConfirm]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        requestClose();
        return;
      }
      if (e.key === "Backspace") {
        setValue((v) => v.slice(0, -1));
        return;
      }
      if (e.key === "Enter") {
        handleConfirm();
        return;
      }
      if (e.key === " ") {
        setValue((v) => v + " ");
        return;
      }
      if (e.key.length === 1) {
        setValue((v) => v + e.key.toUpperCase());
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleConfirm, requestClose]);

  const pressKey = useCallback(
    (key: string) => {
      setError(null);
      if (key === "⌫") {
        setValue((v) => v.slice(0, -1));
        return;
      }
      if (key === "↵") {
        handleConfirm();
        return;
      }
      if (key === "✕") {
        requestClose();
        return;
      }
      if (key === "SPACE") {
        setValue((v) => v + " ");
        return;
      }
      setValue((v) => v + key);
    },
    [handleConfirm, requestClose],
  );

  return (
    <div className={styles.overlay} {...overlayProps} onClick={onBackdropClick} role="presentation">
      <div
          ref={panelRef}
        className={styles.dialog}
        {...panelProps}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="kb-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h2 id="kb-title" className={styles.titleText}>
            Ingrese código/Nombre del alumno
          </h2>
          <button type="button" className={styles.titleClose} onClick={requestClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.displayWrap}>
            <input
              className={styles.display}
              type="text"
              value={value}
              readOnly
              aria-label="Texto ingresado"
            />
          </div>

          {error ? <p className={styles.error}>{error}</p> : null}

          <div className={styles.keyboard}>
            {ROWS.map((row, ri) => (
              <div
                key={ri}
                className={`${styles.row} ${row[0] === "SPACE" ? styles.rowSpace : ""}`}
              >
                {row.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={[
                      styles.key,
                      key === "⌫" || key === "↵" ? styles.keyWide : "",
                      key === "SPACE" ? styles.keySpace : "",
                      key === "✕" ? styles.keyClose : "",
                      key === "↵" ? styles.keyEnter : "",
                      key === "⌫" ? styles.keyBackspace : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => pressKey(key)}
                  >
                    {key === "SPACE" ? "S p a c e" : key}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
