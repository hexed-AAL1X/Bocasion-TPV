import { useCallback, useEffect, useState } from "react";
import type { Vendor } from "../data/vendors";
import { APP_LOGO_SRC } from "../config/brand";
import { authenticateVendor } from "../services/navaAuth";
import { ThemeToggleButton } from "../theme/ThemeToggleButton";
import styles from "./LoginScreen.module.css";

type Phase = "numpad" | "error";

interface Props {
  onAuthenticated: (vendor: Vendor) => void;
  /** Modo eficiente: avisa cuando empieza la pantalla de carga (para descargar AppShell ahí). */
  onLoadingStart?: () => void;
}

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

function CardHeader() {
  return (
    <>
      <img src={APP_LOGO_SRC} alt="Bocasión" className={styles.logo} width={56} height={56} decoding="async" />
      <h1 className={styles.brand}>Bocasión</h1>
      <p className={styles.subtitle}>Intranet — Sistema de Ventas</p>
    </>
  );
}

export function LoginScreen({ onAuthenticated, onLoadingStart }: Props) {
  const [phase, setPhase] = useState<Phase>("numpad");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [sqlError, setSqlError] = useState("");

  const addDigit = useCallback((d: string) => {
    if (busy) return;
    setCode((prev) => (prev.length < 20 ? prev + d : prev));
  }, [busy]);

  const backspace = useCallback(() => {
    if (busy) return;
    setCode((prev) => prev.slice(0, -1));
  }, [busy]);

  const clearCode = useCallback(() => {
    if (busy) return;
    setCode("");
  }, [busy]);

  const submitLogin = useCallback(() => {
    if (!code || busy) return;
    setBusy(true);
    void authenticateVendor(code)
      .then((vendor) => {
        onLoadingStart?.();
        onAuthenticated(vendor);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        setSqlError(/SQL|connect|Tailscale|1433|timeout|ETIMEOUT/i.test(msg) ? msg : "");
        setPhase("error");
      })
      .finally(() => {
        setBusy(false);
      });
  }, [busy, code, onAuthenticated, onLoadingStart]);

  const dismissError = useCallback(() => {
    setCode("");
    setSqlError("");
    setPhase("numpad");
  }, []);

  useEffect(() => {
    if (phase !== "numpad") return;

    const handler = (e: KeyboardEvent) => {
      if (/^[0-9a-zA-Z._-]$/.test(e.key) && e.key.length === 1) addDigit(e.key);
      else if (e.key === "Backspace") backspace();
      else if (e.key === "Enter") submitLogin();
      else if (e.key === "Escape") clearCode();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, addDigit, backspace, submitLogin, clearCode]);

  if (phase === "error") {
    return (
      <div className={styles.backdrop}>
        <div className={styles.errorCard}>
          <CardHeader />

          <div className={styles.errorIcon}>
            <XIcon />
          </div>

          <h2 className={styles.errorTitle}>{sqlError ? "Sin conexión SQL" : "Acceso Denegado"}</h2>
          <p className={styles.errorMsg}>
            {sqlError ? (
              sqlError
            ) : (
              <>
                Clave no válida.<br />
                Verifique e intente nuevamente.
              </>
            )}
          </p>

          <button className={styles.acceptBtn} onClick={dismissError}>Aceptar</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.backdrop}>
      <ThemeToggleButton floating />
      <div className={styles.numpadCard}>
        <CardHeader />

        <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 8px" }}>
          Ingrese su clave
        </p>

        <div className={styles.display}>
          {"*".repeat(code.length) || "\u00A0"}
        </div>

        <div className={styles.grid}>
          <button className={styles.numBtn} onClick={() => addDigit("7")}>7</button>
          <button className={styles.numBtn} onClick={() => addDigit("8")}>8</button>
          <button className={styles.numBtn} onClick={() => addDigit("9")}>9</button>
          <button className={styles.numBtn} onClick={() => addDigit("4")}>4</button>
          <button className={styles.numBtn} onClick={() => addDigit("5")}>5</button>
          <button className={styles.numBtn} onClick={() => addDigit("6")}>6</button>
          <button className={styles.numBtn} onClick={() => addDigit("1")}>1</button>
          <button className={styles.numBtn} onClick={() => addDigit("2")}>2</button>
          <button className={styles.numBtn} onClick={() => addDigit("3")}>3</button>
          <button className={styles.zeroBtn} onClick={() => addDigit("0")}>0</button>
          <button className={styles.backBtn} onClick={backspace}>Retro</button>
        </div>

        <div className={styles.passActions}>
          <button className={styles.primaryBtn} onClick={submitLogin} disabled={busy}>
            {busy ? "Validando…" : "Ingresar"}
          </button>
          <button className={styles.secondaryBtn} onClick={clearCode} disabled={busy}>Limpiar</button>
        </div>
      </div>
    </div>
  );
}
