import { useCallback, useEffect, useRef, useState } from "react";
import { APP_LOGO_SRC } from "../../config/brand";
import { findVendorByCode } from "../../data/vendors";
import type { Vendor } from "../../data/vendors";
import loginStyles from "../LoginScreen.module.css";
import styles from "./ChangeSellerDialog.module.css";

type Phase = "numpad" | "password" | "error";

interface Props {
  currentVendor: Vendor;
  onConfirm: (vendor: Vendor) => void;
  onClose: () => void;
}

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

export function ChangeSellerDialog({ currentVendor, onConfirm, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("numpad");
  const [code, setCode] = useState("");
  const [numpadForPassword, setNumpadForPassword] = useState(false);
  const passRef = useRef<HTMLInputElement>(null);

  const addDigit = useCallback((d: string) => {
    setCode((prev) => (prev.length < 8 ? prev + d : prev));
  }, []);

  const backspace = useCallback(() => setCode((prev) => prev.slice(0, -1)), []);
  const clearCode = useCallback(() => setCode(""), []);

  const submitChange = useCallback(() => {
    if (!code) return;
    const vendor = findVendorByCode(code);
    if (vendor) {
      onConfirm(vendor);
      return;
    }
    setPhase("error");
  }, [code, onConfirm]);

  const submitFromNumpad = useCallback(() => {
    if (!code) return;
    if (numpadForPassword) {
      setNumpadForPassword(false);
      setPhase("password");
      submitChange();
      return;
    }
    setPhase("password");
  }, [code, numpadForPassword, submitChange]);

  const openNumpad = useCallback(() => {
    setNumpadForPassword(true);
    setPhase("numpad");
  }, []);

  const dismissError = useCallback(() => {
    setCode("");
    setNumpadForPassword(false);
    setPhase("numpad");
  }, []);

  useEffect(() => {
    if (phase !== "numpad") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key >= "0" && e.key <= "9") addDigit(e.key);
      else if (e.key === "Backspace") backspace();
      else if (e.key === "Enter") submitFromNumpad();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, addDigit, backspace, submitFromNumpad, onClose]);

  useEffect(() => {
    if (phase === "password") passRef.current?.focus();
  }, [phase]);

  useEffect(() => {
    if (phase !== "password") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter") {
        e.preventDefault();
        submitChange();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, submitChange, onClose]);

  const card = (children: React.ReactNode) => (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={
          phase === "error"
            ? loginStyles.errorCard
            : `${loginStyles.numpadCard} ${styles.numpadCard}`
        }
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="change-seller-title"
      >
        <button type="button" className={styles.closeFloating} onClick={onClose} aria-label="Cerrar">
          ×
        </button>
        <img src={APP_LOGO_SRC} alt="" className={loginStyles.logo} width={56} height={56} decoding="async" />
        <h1 id="change-seller-title" className={loginStyles.brand}>
          Cambiar vendedor
        </h1>
        <p className={styles.current}>
          Activo: <strong>{currentVendor.nombre}</strong> ({currentVendor.usuario})
        </p>
        {children}
      </div>
    </div>
  );

  if (phase === "numpad") {
    return card(
      <>
        <div className={loginStyles.display}>{"*".repeat(code.length) || "\u00A0"}</div>
        <div className={loginStyles.grid}>
          {["7", "8", "9", "4", "5", "6", "1", "2", "3"].map((d) => (
            <button key={d} type="button" className={loginStyles.numBtn} onClick={() => addDigit(d)}>
              {d}
            </button>
          ))}
          <button type="button" className={loginStyles.zeroBtn} onClick={() => addDigit("0")}>
            0
          </button>
          <button type="button" className={loginStyles.backBtn} onClick={backspace}>
            Retro
          </button>
        </div>
        <div className={loginStyles.passActions}>
          <button type="button" className={loginStyles.primaryBtn} onClick={submitFromNumpad}>
            Ingresar
          </button>
          <button type="button" className={loginStyles.secondaryBtn} onClick={clearCode}>
            Limpiar
          </button>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancelar
          </button>
        </div>
      </>,
    );
  }

  if (phase === "password") {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <form
          className={loginStyles.passCard}
          onClick={(e) => e.stopPropagation()}
          onSubmit={(e) => {
            e.preventDefault();
            submitChange();
          }}
        >
          <button type="button" className={styles.closeFloating} onClick={onClose} aria-label="Cerrar">
            ×
          </button>
          <img src={APP_LOGO_SRC} alt="" className={loginStyles.logo} width={56} height={56} decoding="async" />
          <h1 className={loginStyles.brand}>Cambiar vendedor</h1>
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 12px" }}>Clave de acceso</p>
          <div className={loginStyles.passRow}>
            <input
              ref={passRef}
              type="password"
              className={loginStyles.passInput}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              placeholder="****"
            />
            <button type="button" className={loginStyles.keypadBtn} onClick={openNumpad} title="Teclado numérico">
              <KeypadIcon />
            </button>
          </div>
          <div className={loginStyles.passActions}>
            <button type="submit" className={loginStyles.primaryBtn}>
              Aceptar
            </button>
            <button type="button" className={loginStyles.secondaryBtn} onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={loginStyles.errorCard} onClick={(e) => e.stopPropagation()}>
        <div className={loginStyles.errorIcon}>
          <XIcon />
        </div>
        <h2 className={loginStyles.errorTitle}>Vendedor no válido</h2>
        <p className={loginStyles.errorMsg}>
          Código o clave incorrectos.
          <br />
          Verifique e intente de nuevo.
        </p>
        <button type="button" className={loginStyles.acceptBtn} onClick={dismissError}>
          Aceptar
        </button>
      </div>
    </div>
  );
}
