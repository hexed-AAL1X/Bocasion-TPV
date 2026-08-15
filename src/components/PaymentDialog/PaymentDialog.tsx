import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { APP_LOGO_GRAY_SRC } from "../../config/brand";
import { USD_RATE } from "../../config/currency";
import type { PaymentConfirmPayload, PaymentMethod } from "../../types/sales";
import { imageUrl } from "../../utils/assetUrl";
import { useModalBackdrop } from "../ModalStack/ModalStackContext";
import { BankAccountDialog } from "./BankAccountDialog";
import { MixedPaymentDialog } from "./MixedPaymentDialog";
import styles from "./PaymentDialog.module.css";

export type PaymentDialogInitial = {
  method?: PaymentMethod;
  received?: number;
  cardProvider?: string;
  documentLabel?: string;
};

interface Props {
  total: number;
  onClose: () => void;
  onConfirm: (method: PaymentMethod, payment: PaymentConfirmPayload) => void;
  initial?: PaymentDialogInitial;
  elevated?: boolean;
}

/* ─── Icons ─── */
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  </svg>
);

const DollarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="6" x2="12" y2="18" /><path d="M15 9.5c0-.83-.67-1.5-1.5-1.5h-3C9.67 8 9 8.67 9 9.5S9.67 11 10.5 11h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3c-.83 0-1.5-.67-1.5-1.5" />
  </svg>
);

const CardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const MixIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 014-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 01-4 4H3" />
  </svg>
);

const CreditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /><path d="M6 15h4M14 15h4" />
  </svg>
);

const BankIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
  </svg>
);

const methods: { id: PaymentMethod; label: string; icon: () => React.ReactNode }[] = [
  { id: "soles",   label: "(S/) Soles",  icon: CashIcon },
  { id: "dolar",   label: "(US$) Dólar", icon: DollarIcon },
  { id: "tarjeta", label: "Tarjeta",     icon: CardIcon },
  { id: "mixto",   label: "Mixto",       icon: MixIcon },
  { id: "credito", label: "Crédito",     icon: CreditIcon },
  { id: "banco",   label: "Banco",       icon: BankIcon },
];

const denominations = [200, 100, 50, 20, 10];
export const PAYMENT_CARD_PROVIDERS = ["Calqui", "Niubiz", "Openpay", "Izipay"] as const;
const DEFAULT_TARJETA = PAYMENT_CARD_PROVIDERS[0];

function resolveInitialTarjeta(
  provider?: string,
): (typeof PAYMENT_CARD_PROVIDERS)[number] | null {
  if (!provider) return null;
  return PAYMENT_CARD_PROVIDERS.find((t) => t === provider) ?? DEFAULT_TARJETA;
}

/** Banco isométrico — Fluent Emoji Flat (MIT), azul BocaSoft */
const PagoCreditoIcon = () => (
  <img
    src={imageUrl("icons/bank-credito.svg")}
    alt=""
    className={styles.creditoIcon}
    width={56}
    height={56}
    draggable={false}
  />
);

export function PaymentDialog({ total, onClose, onConfirm, initial, elevated }: Props) {
  const onStackBackdropClick = useModalBackdrop(onClose);
  const [method, setMethod] = useState<PaymentMethod>(initial?.method ?? "soles");
  const [selectedTarjeta, setSelectedTarjeta] = useState<
    (typeof PAYMENT_CARD_PROVIDERS)[number] | null
  >(() => {
    if (initial?.method === "tarjeta") {
      return resolveInitialTarjeta(initial.cardProvider);
    }
    return null;
  });
  const [receivedStr, setReceivedStr] = useState(() =>
    initial?.received !== undefined && initial.received > 0
      ? initial.received.toFixed(2)
      : "",
  );

  const selectMethod = useCallback((id: PaymentMethod) => {
    setMethod(id);
    setReceivedStr("");
    if (id === "tarjeta") {
      setSelectedTarjeta(DEFAULT_TARJETA);
    } else {
      setSelectedTarjeta(null);
    }
  }, []);

  const selectTarjeta = useCallback((t: (typeof PAYMENT_CARD_PROVIDERS)[number]) => {
    setMethod("tarjeta");
    setSelectedTarjeta(t);
  }, []);

  const isUsd = method === "dolar";
  const currencySymbol = isUsd ? "US$" : "S/";

  const activeTotal = useMemo(
    () => (isUsd ? total / USD_RATE : total),
    [isUsd, total],
  );

  const received = useMemo(() => parseFloat(receivedStr) || 0, [receivedStr]);
  const vuelto = useMemo(
    () => Math.max(0, received - activeTotal),
    [received, activeTotal],
  );
  const docNum = useMemo(
    () =>
      initial?.documentLabel ??
      `B039-${String(Math.floor(Math.random() * 9999999)).padStart(7, "0")}`,
    [initial?.documentLabel],
  );

  const addDigit = useCallback((d: string) => {
    setReceivedStr((prev) => prev + d);
  }, []);

  const addDot = useCallback(() => {
    setReceivedStr((prev) => (prev.includes(".") ? prev : prev + "."));
  }, []);

  const backspace = useCallback(() => {
    setReceivedStr((prev) => prev.slice(0, -1));
  }, []);

  const setExact = useCallback(() => {
    setReceivedStr(activeTotal.toFixed(2));
  }, [activeTotal]);

  const setDenom = useCallback((amount: number) => {
    setReceivedStr(amount.toFixed(2));
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(method, {
      received,
      vuelto,
      cardProvider: method === "tarjeta" ? selectedTarjeta ?? undefined : undefined,
    });
  }, [method, received, vuelto, selectedTarjeta, onConfirm]);

  const handleMixtoClose = useCallback(() => {
    selectMethod("soles");
  }, [selectMethod]);

  const handleMixtoAccept = useCallback(
    (receivedSoles: number) => {
      onConfirm("mixto", {
        received: receivedSoles,
        vuelto: Math.max(0, receivedSoles - total),
      });
    },
    [onConfirm, total],
  );

  const handleBancoClose = useCallback(() => {
    selectMethod("soles");
  }, [selectMethod]);

  const handleBancoContinue = useCallback(
    (operationNumber: string) => {
      onConfirm("banco", {
        received: total,
        vuelto: 0,
        operationNumber,
      });
    },
    [onConfirm, total],
  );

  const subDialogOpen = method === "mixto" || method === "banco";

  /* Close on Escape (solo si no hay sub-diálogo) */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !subDialogOpen) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, subDialogOpen]);

  const handleOverlayClick = elevated
    ? onStackBackdropClick
    : (e: MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        onClose();
      };

  return (
    <div
      className={`${styles.overlay} ${elevated ? styles.overlayElevated : ""}`}
      onClick={handleOverlayClick}
    >
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <img
            src={APP_LOGO_GRAY_SRC}
            alt=""
            className={styles.headerLogo}
            width={22}
            height={22}
            draggable={false}
            decoding="async"
          />
          <h2 className={styles.headerTitle}>Caja - Forma de pago</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        {/* Method tabs */}
        <div className={styles.methodTabs}>
          {methods.map((m) => (
            <button
              key={m.id}
              className={`${styles.methodTab} ${method === m.id ? styles.methodTabActive : ""}`}
              onClick={() => selectMethod(m.id)}
            >
              <m.icon />
              {m.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Left: amounts + numpad */}
          <div className={styles.formSide}>
            <div className={styles.formRow}>
              <span className={styles.formLabel}>Total a cobrar</span>
              <span className={styles.formCurrency}>{currencySymbol}</span>
              <input
                className={`${styles.formInput} ${styles.formInputTotal}`}
                value={activeTotal.toFixed(2)}
                readOnly
              />
            </div>

            <div className={styles.formRow}>
              <span className={styles.formLabel}>Total recibido</span>
              <span className={styles.formCurrency}>{currencySymbol}</span>
              <input
                className={styles.formInput}
                value={receivedStr}
                onChange={(e) => setReceivedStr(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="0.00"
                autoFocus
              />
            </div>

            <div className={styles.formRow}>
              <span className={styles.formLabel}>Vuelto</span>
              <span className={styles.formCurrency}>{currencySymbol}</span>
              <input
                className={`${styles.formInput} ${styles.formInputVuelto}`}
                value={vuelto.toFixed(2)}
                readOnly
              />
            </div>

            <div className={styles.docDisplay}>
              <span className={styles.docLabel}>Boleta Vta</span>
              <span className={styles.docNum}>N° {docNum}</span>
            </div>

            {/* Numpad */}
            <div className={styles.numpad}>
              {["7","8","9","4","5","6","1","2","3"].map((d) => (
                <button key={d} className={styles.numBtn} onClick={() => addDigit(d)}>{d}</button>
              ))}
              <button className={styles.numBtn} onClick={() => addDigit("0")}>0</button>
              <button className={`${styles.numBtn} ${styles.numBtnDot}`} onClick={addDot}>.</button>
              <button className={`${styles.numBtn} ${styles.numBtnBack}`} onClick={backspace}>Retro</button>
              <button
                className={`${styles.numBtn} ${styles.numBtnEnter}`}
                style={{ gridColumn: "1 / 3" }}
                onClick={handleConfirm}
                disabled={
                  received < activeTotal &&
                  (method === "soles" || method === "dolar")
                }
              >
                Confirmar
              </button>
              <button className={`${styles.numBtn} ${styles.numBtnCancel}`} onClick={onClose}>Cancelar</button>
            </div>
          </div>

          {/* Right: denominations + tarjetas */}
          <div className={styles.rightSide}>
            <div className={styles.rightSection}>
              <h3 className={styles.sectionTitle}>Efectivo</h3>
              <div className={styles.denomGrid}>
                {denominations.map((d) => (
                  <button key={d} className={styles.denomBtn} onClick={() => setDenom(d)}>
                    {currencySymbol} {d}
                  </button>
                ))}
                <button className={`${styles.denomBtn} ${styles.denomBtnExacto}`} onClick={setExact}>
                  Exacto
                </button>
              </div>
            </div>

            <div className={`${styles.rightSection} ${styles.tarjetasSection}`}>
              <h3 className={styles.sectionTitle}>Tarjetas</h3>
              <div className={styles.tarjetasBody}>
                <div className={styles.denomGrid}>
                  {PAYMENT_CARD_PROVIDERS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`${styles.tarjetaBtn} ${
                        method === "tarjeta" && selectedTarjeta === t ? styles.tarjetaBtnActive : ""
                      }`}
                      aria-pressed={method === "tarjeta" && selectedTarjeta === t}
                      onClick={() => selectTarjeta(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className={`${styles.creditoBtn} ${method === "credito" ? styles.creditoBtnActive : ""}`}
                  title="Pago al crédito"
                  aria-label="Pago al crédito"
                  onClick={() => selectMethod("credito")}
                >
                  <PagoCreditoIcon />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {method === "mixto" && (
        <MixedPaymentDialog
          total={total}
          onClose={handleMixtoClose}
          onAccept={handleMixtoAccept}
        />
      )}

      {method === "banco" && (
        <BankAccountDialog
          total={total}
          onClose={handleBancoClose}
          onContinue={handleBancoContinue}
        />
      )}
    </div>
  );
}
