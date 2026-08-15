import { useCallback, useEffect, useMemo, useState } from "react";
import { imageUrl } from "../../utils/assetUrl";
import styles from "./BankAccountDialog.module.css";

function formatFechaDeposito(d: Date) {
  return d.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

interface Props {
  total: number;
  onClose: () => void;
  onContinue: (operationNumber: string) => void;
}

export function BankAccountDialog({ total, onClose, onContinue }: Props) {
  const [operacion, setOperacion] = useState("");
  const fechaDep = useMemo(() => formatFechaDeposito(new Date()), []);

  const addDigit = useCallback((d: string) => {
    setOperacion((prev) => prev + d);
  }, []);

  const addDot = useCallback(() => {
    setOperacion((prev) => (prev.includes(".") ? prev : prev + "."));
  }, []);

  const addDash = useCallback(() => {
    setOperacion((prev) => prev + "-");
  }, []);

  const backspace = useCallback(() => {
    setOperacion((prev) => prev.slice(0, -1));
  }, []);

  const handleContinue = useCallback(() => {
    if (operacion.trim()) onContinue(operacion.trim());
  }, [operacion, onContinue]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && operacion.trim()) handleContinue();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, handleContinue, operacion]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <h2 className={styles.title}>Seleccionar cta.cte.</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            <CloseIcon />
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <colgroup>
                <col className={styles.colLogo} />
                <col className={styles.colBanco} />
                <col className={styles.colMoneda} />
                <col className={styles.colCuenta} />
                <col className={styles.colOperacion} />
                <col className={styles.colMonto} />
                <col className={styles.colFecha} />
                <col className={styles.colLocal} />
              </colgroup>
              <thead>
                <tr>
                  <th aria-label="Entidad" />
                  <th>Banco</th>
                  <th>M</th>
                  <th>N° Cta.Cte.</th>
                  <th>N° Operación</th>
                  <th className={styles.thMonto}>Monto depositado</th>
                  <th>F. Dep.</th>
                  <th>Local</th>
                </tr>
              </thead>
              <tbody>
                <tr className={styles.dataRow}>
                  <td className={styles.tdLogo}>
                    <img
                      src={imageUrl("icons/bcp-logo.svg")}
                      alt="BCP"
                      className={styles.bankLogo}
                      draggable={false}
                    />
                  </td>
                  <td>CREDITO</td>
                  <td className={styles.mono}>S/</td>
                  <td className={`${styles.mono} ${styles.tdCuenta}`}>2456884273056</td>
                  <td className={styles.tdOper}>
                    <input
                      className={styles.operInput}
                      value={operacion}
                      onChange={(e) =>
                        setOperacion(e.target.value.replace(/[^\d.\-]/g, ""))
                      }
                      placeholder="N° operación"
                      autoFocus
                      aria-label="Número de operación"
                    />
                  </td>
                  <td className={`${styles.mono} ${styles.tdMonto}`}>
                    S/ {total.toFixed(2)}
                  </td>
                  <td className={styles.mono}>{fechaDep}</td>
                  <td>UPN CAJ</td>
                </tr>
              </tbody>
            </table>
          </div>

          <aside className={styles.numpadPanel} aria-label="Teclado numérico">
            <div className={styles.numpad}>
              <button type="button" className={styles.numBtn} onClick={() => addDigit("7")}>7</button>
              <button type="button" className={styles.numBtn} onClick={() => addDigit("8")}>8</button>
              <button type="button" className={styles.numBtn} onClick={() => addDigit("9")}>9</button>
              <button type="button" className={`${styles.numBtn} ${styles.numBtnBack}`} onClick={backspace}>
                Retro
              </button>

              <button type="button" className={styles.numBtn} onClick={() => addDigit("4")}>4</button>
              <button type="button" className={styles.numBtn} onClick={() => addDigit("5")}>5</button>
              <button type="button" className={styles.numBtn} onClick={() => addDigit("6")}>6</button>
              <button
                type="button"
                className={`${styles.numBtn} ${styles.numBtnEnter}`}
                onClick={handleContinue}
                disabled={!operacion.trim()}
              >
                Enter
              </button>

              <button type="button" className={styles.numBtn} onClick={() => addDigit("1")}>1</button>
              <button type="button" className={styles.numBtn} onClick={() => addDigit("2")}>2</button>
              <button type="button" className={styles.numBtn} onClick={() => addDigit("3")}>3</button>

              <button type="button" className={styles.numBtn} onClick={() => addDigit("0")}>0</button>
              <button type="button" className={`${styles.numBtn} ${styles.numBtnDot}`} onClick={addDot}>.</button>
              <button type="button" className={styles.numBtn} onClick={addDash}>−</button>
            </div>
          </aside>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.btnCancel} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className={styles.btnContinue}
            onClick={handleContinue}
            disabled={!operacion.trim()}
          >
            Continuar
          </button>
        </footer>
      </div>
    </div>
  );
}
