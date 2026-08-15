import { useCallback, useEffect, useRef, useState } from "react";
import { findVendorByCode } from "../data/vendors";
import type { Vendor } from "../data/vendors";
import { APP_LOGO_SRC } from "../config/brand";
import { ThemeToggleButton } from "../theme/ThemeToggleButton";
import styles from "./LoginScreen.module.css";

type Phase = "numpad" | "password" | "error";

interface Props {
  onAuthenticated: (vendor: Vendor) => void;
  /** Modo eficiente: avisa cuando empieza la pantalla de carga (para descargar AppShell ahí). */
  onLoadingStart?: () => void;
}

/* ─── SVG icons (inline to avoid extra deps) ─── */
const KeypadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="4" height="4" rx="1" />
    <rect x="10" y="3" width="4" height="4" rx="1" />
    <rect x="17" y="3" width="4" height="4" rx="1" />
    <rect x="3" y="10" width="4" height="4" rx="1" />
    <rect x="10" y="10" width="4" height="4" rx="1" />
    <rect x="17" y="10" width="4" height="4" rx="1" />
    <rect x="3" y="17" width="4" height="4" rx="1" />
    <rect x="10" y="17" width="4" height="4" rx="1" />
    <rect x="17" y="17" width="4" height="4" rx="1" />
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/* ─── Header shared by most cards ─── */
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
  const [numpadForPassword, setNumpadForPassword] = useState(false);
  const passRef = useRef<HTMLInputElement>(null);

  /* --- NumPad helpers --- */
  const addDigit = useCallback((d: string) => {
    setCode((prev) => (prev.length < 8 ? prev + d : prev));
  }, []);

  const backspace = useCallback(() => {
    setCode((prev) => prev.slice(0, -1));
  }, []);

  const clearCode = useCallback(() => {
    setCode("");
  }, []);

  const submitLogin = useCallback(() => {
    if (code.length === 0) return;
    const vendor = findVendorByCode(code);
    if (vendor) {
      onLoadingStart?.();
      onAuthenticated(vendor);
    } else {
      setPhase("error");
    }
  }, [code, onAuthenticated, onLoadingStart]);

  const submitFromNumpad = useCallback(() => {
    if (code.length === 0) return;
    if (numpadForPassword) {
      setNumpadForPassword(false);
      setPhase("password");
      submitLogin();
      return;
    }
    setPhase("password");
  }, [code, numpadForPassword, submitLogin]);

  /* --- Password card helpers --- */
  const openNumpad = useCallback(() => {
    setNumpadForPassword(true);
    setPhase("numpad");
  }, []);

  const dismissError = useCallback(() => {
    setCode("");
    setNumpadForPassword(false);
    setPhase("numpad");
  }, []);

  /* --- Keyboard support for numpad --- */
  useEffect(() => {
    if (phase !== "numpad") return;

    const handler = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") addDigit(e.key);
      else if (e.key === "Backspace") backspace();
      else if (e.key === "Enter") submitFromNumpad();
      else if (e.key === "Escape") clearCode();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, addDigit, backspace, submitFromNumpad, clearCode]);

  /* --- Focus password input when entering password phase --- */
  useEffect(() => {
    if (phase === "password") passRef.current?.focus();
  }, [phase]);

  /* --- Enter en pantalla de contraseña → iniciar sesión --- */
  useEffect(() => {
    if (phase !== "password") return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitLogin();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, submitLogin]);

  /* ────────── RENDERS ────────── */

  if (phase === "numpad") {
    return (
      <div className={styles.backdrop}>
        <ThemeToggleButton floating />
        <div className={styles.numpadCard}>
          <CardHeader />

          <div className={styles.display}>
            {"*".repeat(code.length) || "\u00A0"}
          </div>

          <div className={styles.grid}>
            {/* Row 1 */}
            <button className={styles.numBtn} onClick={() => addDigit("7")}>7</button>
            <button className={styles.numBtn} onClick={() => addDigit("8")}>8</button>
            <button className={styles.numBtn} onClick={() => addDigit("9")}>9</button>

            {/* Row 2 */}
            <button className={styles.numBtn} onClick={() => addDigit("4")}>4</button>
            <button className={styles.numBtn} onClick={() => addDigit("5")}>5</button>
            <button className={styles.numBtn} onClick={() => addDigit("6")}>6</button>

            {/* Row 3 */}
            <button className={styles.numBtn} onClick={() => addDigit("1")}>1</button>
            <button className={styles.numBtn} onClick={() => addDigit("2")}>2</button>
            <button className={styles.numBtn} onClick={() => addDigit("3")}>3</button>

            {/* Row 4 */}
            <button className={styles.zeroBtn} onClick={() => addDigit("0")}>0</button>
            <button className={styles.backBtn} onClick={backspace}>Retro</button>
          </div>

          <div className={styles.passActions}>
            <button className={styles.primaryBtn} onClick={submitFromNumpad}>Ingresar</button>
            <button className={styles.secondaryBtn} onClick={clearCode}>Limpiar</button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "password") {
    return (
      <div className={styles.backdrop}>
        <ThemeToggleButton floating />
        <form
          className={styles.passCard}
          onSubmit={(e) => {
            e.preventDefault();
            submitLogin();
          }}
        >
          <CardHeader />

          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 12px" }}>
            Clave de acceso
          </p>

          <div className={styles.passRow}>
            <input
              ref={passRef}
              type="password"
              className={styles.passInput}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="current-password"
              placeholder="****"
            />
            <button
              type="button"
              className={styles.keypadBtn}
              onClick={openNumpad}
              title="Abrir teclado numérico"
            >
              <KeypadIcon />
            </button>
          </div>

          <div className={styles.passActions}>
            <button type="submit" className={styles.primaryBtn}>
              Aceptar
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={dismissError}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className={styles.backdrop}>
        <div className={styles.errorCard}>
          <CardHeader />

          <div className={styles.errorIcon}>
            <XIcon />
          </div>

          <h2 className={styles.errorTitle}>Acceso Denegado</h2>
          <p className={styles.errorMsg}>
            Credenciales del usuario no válidas.<br />
            Verifique su clave e intente nuevamente.
          </p>

          <button className={styles.acceptBtn} onClick={dismissError}>Aceptar</button>
        </div>
      </div>
    );
  }

  return null;
}
