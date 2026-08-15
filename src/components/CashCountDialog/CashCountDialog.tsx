import {useCallback, useEffect, useState, useRef } from "react";
import {
  CASH_COUNT_ROWS,
  formatCashCountAmount,
  initialCashCountAmounts,
  type CashCountRow,
  type CashCountRowId,
} from "../../data/cashCountRows";
import { imageUrl } from "../../utils/assetUrl";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import styles from "./CashCountDialog.module.css";

type Props = {
  onClose: () => void;
  onReconcile?: (amounts: Record<CashCountRowId, number | null>) => void;
};

function RowIcon({ row }: { row: CashCountRow }) {
  if (row.icon === "cash") {
    return (
      <span className={styles.rowIcon}>
        <img src={imageUrl("iconos/menu-shell32-137.png")} alt="" draggable={false} />
      </span>
    );
  }
  if (row.icon === "bank") {
    return (
      <span className={styles.rowIcon}>
        <img src={imageUrl("icons/bank-credito.svg")} alt="" draggable={false} />
      </span>
    );
  }
  if (row.icon === "coupon") {
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
  if (row.icon === "card") {
    return <span className={styles.rowIcon} aria-hidden />;
  }
  return null;
}

export function CashCountDialog({ onClose, onReconcile }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, { panelRef });
  const [amounts, setAmounts] = useState(() => initialCashCountAmounts());
  const [editingId, setEditingId] = useState<CashCountRowId | null>(null);
  const [editStr, setEditStr] = useState("");

  const closeEdit = useCallback(() => {
    setEditingId(null);
    setEditStr("");
  }, []);

  const openEdit = useCallback(
    (id: CashCountRowId) => {
      const value = amounts[id];
      setEditingId(id);
      setEditStr(value !== null && value > 0 ? value.toFixed(2) : "");
    },
    [amounts],
  );

  const saveEdit = useCallback(() => {
    if (!editingId) return;
    const trimmed = editStr.trim();
    if (!trimmed) {
      setAmounts((prev) => ({ ...prev, [editingId]: null }));
    } else {
      const parsed = Math.max(0, parseFloat(trimmed) || 0);
      setAmounts((prev) => ({ ...prev, [editingId]: parsed }));
    }
    closeEdit();
  }, [closeEdit, editingId, editStr]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (editingId) {
          closeEdit();
          return;
        }
        requestClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closeEdit, requestClose, editingId]);

  const handleReconcile = () => {
    onReconcile?.(amounts);
    requestClose();
  };

  return (
    <>
      <div className={styles.overlay} {...overlayProps} onClick={onBackdropClick} role="presentation">
        <div
          ref={panelRef}
          className={styles.dialog}
          {...panelProps}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-labelledby="cash-count-title"
          aria-modal="true"
        >
          <header className={styles.titleBar}>
            <h2 id="cash-count-title" className={styles.titleText}>
              Arqueo de efectivo
            </h2>
            <button type="button" className={styles.closeBtn} onClick={requestClose} aria-label="Cerrar">
              ×
            </button>
          </header>

          <div className={styles.intro}>
            <img
              className={styles.introIcon}
              src={imageUrl("iconos/menu-shell32-137.png")}
              alt=""
              draggable={false}
            />
            <p className={styles.introText}>
              Pre-liquidación de caja.- Permite recepcionar el efectivo real para luego efectuar un
              comparativo con la liquidación de caja del sistema
            </p>
          </div>

          <div className={styles.tableWrap}>
            <div className={styles.tableHead}>
              <span className={styles.tableHeadSpacer} aria-hidden />
              <span className={styles.tableHeadLabel}>CAJA REAL</span>
              <span className={styles.tableHeadEdit} aria-hidden />
            </div>

            <div className={styles.list}>
              {CASH_COUNT_ROWS.map((row, index) => {
                const display = formatCashCountAmount(row, amounts[row.id]);
                return (
                  <div
                    key={row.id}
                    className={[styles.row, index === 0 ? styles.rowHighlight : ""].filter(Boolean).join(" ")}
                  >
                    <RowIcon row={row} />
                    <span className={styles.rowLabel}>{row.label}</span>
                    <span
                      className={[styles.rowAmount, !display ? styles.rowAmountEmpty : ""]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {display ?? "—"}
                    </span>
                    <div className={styles.editCell}>
                      <button
                        type="button"
                        className={styles.editBtn}
                        onClick={(event) => {
                          event.stopPropagation();
                          openEdit(row.id);
                        }}
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <footer className={styles.footer}>
            <button type="button" className={styles.footerBtn} onClick={requestClose}>
              Cancelar
            </button>
            <button type="button" className={`${styles.footerBtn} ${styles.footerBtnPrimary}`} onClick={handleReconcile}>
              Cotejar
            </button>
          </footer>
        </div>
      </div>

      {editingId ? (
        <div
          className={styles.editOverlay}
          onClick={closeEdit}
          role="presentation"
        >
          <div
            className={styles.editBox}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cash-count-edit-title"
          >
            <p id="cash-count-edit-title" className={styles.editTitle}>
              {CASH_COUNT_ROWS.find((row) => row.id === editingId)?.label}
            </p>
            <input
              className={styles.editInput}
              type="text"
              inputMode="decimal"
              value={editStr}
              onChange={(event) => setEditStr(event.target.value.replace(/[^\d.]/g, ""))}
              placeholder="0.00"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") saveEdit();
                if (event.key === "Escape") closeEdit();
              }}
            />
            <footer className={styles.editFooter}>
              <button type="button" className={styles.footerBtn} onClick={closeEdit}>
                Cancelar
              </button>
              <button type="button" className={`${styles.footerBtn} ${styles.footerBtnPrimary}`} onClick={saveEdit}>
                OK
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
