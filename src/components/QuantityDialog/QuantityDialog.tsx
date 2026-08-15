import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./QuantityDialog.module.css";

interface Props {
  currentQty: number;
  productName: string;
  onClose: () => void;
  onConfirm: (qty: number) => void;
}

export function QuantityDialog({ currentQty, productName, onClose, onConfirm }: Props) {
  const [value, setValue] = useState(String(currentQty));
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

  const handleConfirm = useCallback(() => {
    const qty = parseFloat(value) || 0;
    if (qty > 0) onConfirm(qty);
    else onClose();
  }, [value, onConfirm, onClose]);

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

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>Ingrese cantidad</span>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        <p className={styles.productName}>{productName}</p>

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
