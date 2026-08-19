import { useCallback, useEffect, useState } from "react";
import { APP_LOGO_SRC } from "../../config/brand";
import { authenticateVendor } from "../../services/navaAuth";
import type { Vendor } from "../../data/vendors";
import loginStyles from "../LoginScreen.module.css";
import styles from "./ChangeSellerDialog.module.css";

type Phase = "numpad" | "error";

interface Props {
  currentVendor: Vendor;
  onConfirm: (vendor: Vendor) => void;
  onClose: () => void;
}

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export function ChangeSellerDialog({ currentVendor, onConfirm, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("numpad");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

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

  const submitChange = useCallback(() => {
    if (!code || busy) return;
    setBusy(true);
    void authenticateVendor(code)
      .then((vendor) => {
        onConfirm(vendor);
      })
      .catch(() => {
        setPhase("error");
      })
      .finally(() => {
        setBusy(false);
      });
  }, [busy, code, onConfirm]);

  const dismissError = useCallback(() => {
    setCode("");
    setPhase("numpad");
  }, []);

  useEffect(() => {
    if (phase !== "numpad") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (/^[0-9a-zA-Z._-]$/.test(e.key) && e.key.length === 1) addDigit(e.key);
      else if (e.key === "Backspace") backspace();
      else if (e.key === "Enter") submitChange();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, addDigit, backspace, submitChange, onClose]);

  if (phase === "error") {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={loginStyles.errorCard} onClick={(e) => e.stopPropagation()}>
          <div className={loginStyles.errorIcon}>
            <XIcon />
          </div>
          <h2 className={loginStyles.errorTitle}>Vendedor no válido</h2>
          <p className={loginStyles.errorMsg}>
            Clave incorrecta.
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

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${loginStyles.numpadCard} ${styles.numpadCard}`}
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
          <button type="button" className={loginStyles.primaryBtn} onClick={submitChange} disabled={busy}>
            {busy ? "Validando…" : "Ingresar"}
          </button>
          <button type="button" className={loginStyles.secondaryBtn} onClick={clearCode} disabled={busy}>
            Limpiar
          </button>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
