import { useCallback, useEffect, useMemo, useState } from "react";
import { USD_RATE } from "../../config/currency";
import { imageUrl } from "../../utils/assetUrl";
import styles from "./MixedPaymentDialog.module.css";

export type MixedPaymentRowId =
  | "efectivo_sol"
  | "efectivo_usd"
  | "culqui"
  | "niubiz"
  | "openpay"
  | "izipay"
  | "new_credit"
  | "vales_sodexo"
  | "vales_empresa";

type MixedRow = {
  id: MixedPaymentRowId;
  label: string;
  currency: "S/" | "US$" | null;
  icon: "cash" | "card" | "bank" | "coupon";
};

const ROWS: MixedRow[] = [
  { id: "efectivo_sol", label: "EFECTIVO (S/.)", currency: "S/", icon: "cash" },
  { id: "efectivo_usd", label: "EFECTIVO (US$)", currency: "US$", icon: "cash" },
  { id: "culqui", label: "CULQUI", currency: "S/", icon: "card" },
  { id: "niubiz", label: "NIUBIZ", currency: "S/", icon: "card" },
  { id: "openpay", label: "OPENPAY", currency: "S/", icon: "card" },
  { id: "izipay", label: "IZIPAY", currency: "S/", icon: "card" },
  { id: "new_credit", label: "NEW CREDIT", currency: "S/", icon: "bank" },
  { id: "vales_sodexo", label: "VALES DE SODEXO", currency: "S/", icon: "coupon" },
  { id: "vales_empresa", label: "VALES DE LA EMPRESA", currency: "S/", icon: "coupon" },
];

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  </svg>
);

const CardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
    <rect x="1" y="4" width="22" height="16" rx="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

function RowIcon({ type }: { type: MixedRow["icon"] }) {
  if (type === "cash") {
    return (
      <span className={styles.rowIcon}>
        <CashIcon />
      </span>
    );
  }
  if (type === "bank") {
    return (
      <span className={styles.rowIcon}>
        <img src={imageUrl("icons/bank-credito.svg")} alt="" draggable={false} />
      </span>
    );
  }
  if (type === "coupon") {
    return (
      <span className={styles.rowIcon}>
        <span className={styles.couponIcon}>
          CUPON
          <br />
          DESC.
        </span>
      </span>
    );
  }
  return (
    <span className={styles.rowIcon}>
      <CardIcon />
    </span>
  );
}

function emptyAmounts(): Record<MixedPaymentRowId, number> {
  return ROWS.reduce(
    (acc, row) => {
      acc[row.id] = 0;
      return acc;
    },
    {} as Record<MixedPaymentRowId, number>,
  );
}

interface Props {
  total: number;
  onClose: () => void;
  onAccept: (receivedSoles: number) => void;
}

export function MixedPaymentDialog({ total, onClose, onAccept }: Props) {
  const [amounts, setAmounts] = useState(emptyAmounts);
  const [selectedId, setSelectedId] = useState<MixedPaymentRowId>("efectivo_sol");
  const [editingId, setEditingId] = useState<MixedPaymentRowId | null>(null);
  const [editStr, setEditStr] = useState("");
  const recibido = useMemo(() => {
    let sum = amounts.efectivo_sol;
    sum += amounts.efectivo_usd * USD_RATE;
    for (const row of ROWS) {
      if (row.id === "efectivo_sol" || row.id === "efectivo_usd") continue;
      sum += amounts[row.id];
    }
    return sum;
  }, [amounts]);

  const saldo = useMemo(() => Math.max(0, total - recibido), [total, recibido]);

  const formatRowAmount = (row: MixedRow) => {
    const n = amounts[row.id];
    if (row.id === "efectivo_sol") return `S/ ${n.toFixed(2)}`;
    if (n <= 0) return null;
    if (row.currency === "US$") return `US$ ${n.toFixed(2)}`;
    if (row.currency === "S/") return `S/ ${n.toFixed(2)}`;
    return null;
  };

  const openEdit = useCallback((id: MixedPaymentRowId) => {
    setSelectedId(id);
    setEditingId(id);
    setEditStr(amounts[id] > 0 ? amounts[id].toFixed(2) : "");
  }, [amounts]);

  const saveEdit = useCallback(() => {
    if (!editingId) return;
    const n = Math.max(0, parseFloat(editStr) || 0);
    setAmounts((prev) => ({ ...prev, [editingId]: n }));
    setEditingId(null);
    setEditStr("");
  }, [editingId, editStr]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingId) {
          setEditingId(null);
          return;
        }
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, editingId]);

  return (
    <>
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
          <div className={styles.header}>
            <h2 className={styles.title}>Cobranza mixta</h2>
            <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
              <CloseIcon />
            </button>
          </div>

          <div className={styles.listWrap}>
            <div className={styles.list}>
              {ROWS.map((row) => {
                const display = formatRowAmount(row);
                return (
                  <div
                    key={row.id}
                    className={`${styles.row} ${selectedId === row.id ? styles.rowSelected : ""}`}
                    onClick={() => setSelectedId(row.id)}
                  >
                    <RowIcon type={row.icon} />
                    <span className={styles.rowLabel}>{row.label}</span>
                    <span
                      className={`${styles.rowAmount} ${!display ? styles.rowAmountEmpty : ""}`}
                    >
                      {display ?? "—"}
                    </span>
                    <button
                      type="button"
                      className={styles.editBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(row.id);
                      }}
                    >
                      Editar
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.summary}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Por cobrar</span>
              <span className={styles.summaryValue}>S/ {total.toFixed(2)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Recibido</span>
              <span className={styles.summaryValue}>S/ {recibido.toFixed(2)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Saldo</span>
              <span className={`${styles.summaryValue} ${styles.summarySaldo}`}>
                S/ {saldo.toFixed(2)}
              </span>
            </div>
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className={styles.btnAccept}
              disabled={saldo > 0.009}
              onClick={() => onAccept(recibido)}
            >
              Aceptar
            </button>
          </div>
        </div>
      </div>

      {editingId && (
        <div className={styles.editOverlay} onClick={() => setEditingId(null)}>
          <div className={styles.editBox} onClick={(e) => e.stopPropagation()}>
            <p className={styles.editTitle}>
              {ROWS.find((r) => r.id === editingId)?.label}
            </p>
            <input
              className={styles.editInput}
              value={editStr}
              onChange={(e) => setEditStr(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder="0.00"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit();
                if (e.key === "Escape") setEditingId(null);
              }}
            />
            <div className={styles.editActions}>
              <button type="button" className={styles.btnCancel} onClick={() => setEditingId(null)}>
                Cancelar
              </button>
              <button type="button" className={styles.btnAccept} onClick={saveEdit}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
