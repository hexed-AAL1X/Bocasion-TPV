import { useCallback, useEffect, useRef, useState } from "react";
import type { SaleLine } from "../POSTerminal/POSTerminal";
import styles from "./DiscountDialog.module.css";

type Mode = "pct" | "amt";

interface Props {
  line: SaleLine;
  onClose: () => void;
  onConfirm: (dscto: number) => void;
}

export function DiscountDialog({ line, onClose, onConfirm }: Props) {
  const [mode, setMode] = useState<Mode>("pct");
  const [value, setValue] = useState("0");
  const [selected, setSelected] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const refocus = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const addDigit = useCallback((d: string) => {
    setValue((prev) => (selected ? d : prev === "0" ? d : prev + d));
    setSelected(false);
    refocus();
  }, [selected, refocus]);

  const addDot = useCallback(() => {
    setValue((prev) => (selected ? "0." : prev.includes(".") ? prev : prev + "."));
    setSelected(false);
    refocus();
  }, [selected, refocus]);

  const backspace = useCallback(() => {
    setValue((prev) => (prev.length <= 1 ? "0" : prev.slice(0, -1)));
    setSelected(false);
    refocus();
  }, [refocus]);

  const handleModeChange = useCallback((m: Mode) => {
    setMode(m);
    setValue("0");
    setSelected(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }, []);

  const handleConfirm = useCallback(() => {
    const raw = parseFloat(value) || 0;
    let pct: number;
    if (mode === "pct") {
      pct = Math.min(100, Math.max(0, raw));
    } else {
      const lineTotal = line.qty * line.unitPrice;
      pct = lineTotal > 0 ? Math.min(100, (raw / lineTotal) * 100) : 0;
    }
    onConfirm(Math.round(pct * 100) / 100);
  }, [value, mode, line, onConfirm]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!selected) return;
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      setValue(e.key);
      setSelected(false);
    } else if (e.key === ".") {
      e.preventDefault();
      setValue("0.");
      setSelected(false);
    } else if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      setValue("0");
      setSelected(false);
    }
  }, [selected]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter") handleConfirm();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, handleConfirm]);

  const displaySuffix = mode === "pct" ? "%" : "S/.";

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>Descuento</span>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        <div className={styles.modeToggle}>
          <button
            type="button"
            className={`${styles.modeBtn} ${mode === "pct" ? styles.modeBtnActive : ""}`}
            onClick={() => handleModeChange("pct")}
          >
            <span className={styles.modeBtnLabel}>Dscto.</span>
            <span className={styles.modeBtnUnit}>(%)</span>
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${mode === "amt" ? styles.modeBtnActiveAmt : ""}`}
            onClick={() => handleModeChange("amt")}
          >
            <span className={styles.modeBtnLabel}>Monto</span>
            <span className={styles.modeBtnUnit}>(S/.)</span>
          </button>
        </div>

        <p className={styles.productName}>{line.description}</p>

        <div className={styles.displayWrap}>
          <input
            ref={inputRef}
            className={styles.display}
            value={value}
            onChange={(e) => {
              setSelected(false);
              setValue(e.target.value.replace(/[^\d.]/g, ""));
            }}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <span className={styles.displaySuffix}>{displaySuffix}</span>
        </div>

        <div className={styles.numpad}>
          {["7", "8", "9"].map((d) => (
            <button key={d} className={styles.numBtn} onClick={() => addDigit(d)}>{d}</button>
          ))}
          <button className={`${styles.numBtn} ${styles.numBtnAction}`} onClick={backspace}>&lt;&lt; Retro</button>

          {["4", "5", "6"].map((d) => (
            <button key={d} className={styles.numBtn} onClick={() => addDigit(d)}>{d}</button>
          ))}
          <button className={`${styles.numBtn} ${styles.numBtnEnter}`} onClick={handleConfirm}>Enter</button>

          {["1", "2", "3"].map((d) => (
            <button key={d} className={styles.numBtn} onClick={() => addDigit(d)}>{d}</button>
          ))}
          <span />

          <button className={styles.numBtn} onClick={() => addDigit("0")}>0</button>
          <button className={styles.numBtn} onClick={addDot}>.</button>
          <button className={`${styles.numBtn} ${styles.numBtnCancel}`} onClick={onClose}>Cancel</button>
          <span />
        </div>
      </div>
    </div>
  );
}
