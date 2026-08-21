import {useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  CASH_OPENING_CURRENCIES,
  formatOpeningAmount,
  getCashOpeningBalances,
  saveCashOpeningBalances,
  type CashOpeningBalance,
  type CashOpeningCurrency,
} from "../../data/cashOpeningBalances";
import { POS_REGISTERS, loadPosRegistersFromNava } from "../../data/posRegisters";
import type { Vendor } from "../../data/vendors";
import {
  getActiveRegisterId,
  getSessionOpenedAtForRegisterAndDate,
  isSessionClosedForRegisterAndDate,
} from "../../services/salesSession";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { WinSelect } from "../WinSelect/WinSelect";
import styles from "./CashOpeningDialog.module.css";

type Props = {
  vendor: Vendor;
  onClose: () => void;
};

const KeypadIcon = () => (
  <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden>
    <rect x="1" y="1" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.85" />
    <rect x="7.5" y="1" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.85" />
    <rect x="14" y="1" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.85" />
    <rect x="1" y="7.5" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.85" />
    <rect x="7.5" y="7.5" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.85" />
    <rect x="14" y="7.5" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.85" />
    <rect x="1" y="14" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.85" />
    <rect x="7.5" y="14" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.85" />
    <rect x="14" y="14" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.85" />
  </svg>
);

const UnlockedIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
    <rect x="5" y="11" width="14" height="10" rx="1.5" fill="#e8c840" stroke="#9a7200" strokeWidth="1.2" />
    <path d="M8 11V8.5a4 4 0 0 1 7.8-1.2" fill="none" stroke="#9a7200" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="16" r="1.8" fill="#9a7200" />
  </svg>
);

const LockedIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
    <rect x="5" y="11" width="14" height="10" rx="1.5" fill="#c0c0c0" stroke="#666" strokeWidth="1.2" />
    <path d="M8 11V8.5a4 4 0 0 1 8 0V11" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="16" r="1.8" fill="#666" />
  </svg>
);

const DrawerIcon = () => (
  <svg viewBox="0 0 40 32" width="36" height="28" aria-hidden>
    <rect x="2" y="6" width="36" height="22" rx="2" fill="#d8d4c8" stroke="#848078" strokeWidth="1.2" />
    <rect x="2" y="6" width="36" height="6" rx="2" fill="#c8c4b8" />
    <rect x="6" y="16" width="28" height="8" rx="1" fill="#fff" stroke="#848078" strokeWidth="1" />
    <rect x="10" y="19" width="8" height="2" rx="0.5" fill="#b8b4a8" />
    <path d="M32 20h4v2h-4z" fill="#9a7200" />
    <circle cx="34" cy="21" r="1" fill="#e8c840" stroke="#9a7200" strokeWidth="0.5" />
  </svg>
);

function formatOpeningDateTime(date: Date): string {
  const datePart = date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const hours = date.getHours();
  const h12 = hours % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours < 12 ? "AM" : "PM";
  return `${datePart} ${String(h12).padStart(2, "0")}:${minutes} ${ampm}`;
}

export function CashOpeningDialog({ vendor, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const editPanelRef = useRef<HTMLDivElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, { panelRef });
  const {
    requestClose: requestEditClose,
    onBackdropClick: onEditBackdropClick,
    overlayProps: editOverlayProps,
    panelProps: editPanelProps,
  } = useAppDialogClose(() => setEditingCurrency(null), { panelRef: editPanelRef });
  const today = useMemo(() => new Date(), []);
  const initialRegisterId = getActiveRegisterId();
  const [registerId, setRegisterId] = useState(initialRegisterId);
  const [savedRegisterId, setSavedRegisterId] = useState(initialRegisterId);
  const [editMode, setEditMode] = useState(false);
  const [balances, setBalances] = useState<CashOpeningBalance>(() =>
    getCashOpeningBalances(initialRegisterId),
  );
  const [savedBalances, setSavedBalances] = useState<CashOpeningBalance>(() =>
    getCashOpeningBalances(initialRegisterId),
  );
  const [editingCurrency, setEditingCurrency] = useState<CashOpeningCurrency | null>(null);
  const [editStr, setEditStr] = useState("");

  const openedAt = getSessionOpenedAtForRegisterAndDate(registerId, today) ?? today;
  const isClosed = isSessionClosedForRegisterAndDate(registerId, today);
  const dirty =
    JSON.stringify(balances) !== JSON.stringify(savedBalances) || registerId !== savedRegisterId;

  const [registerTick, setRegisterTick] = useState(0);
  const registerOptions = useMemo(
    () => POS_REGISTERS.map((item) => ({ value: item.id, label: item.point })),
    [registerTick],
  );

  useEffect(() => {
    void loadPosRegistersFromNava().then(() => setRegisterTick((n) => n + 1));
  }, []);

  const handleCancelEdit = useCallback(() => {
    setBalances(savedBalances);
    setRegisterId(savedRegisterId);
    setEditMode(false);
    setEditingCurrency(null);
    setEditStr("");
  }, [savedBalances, savedRegisterId]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (editingCurrency) {
          requestEditClose();
          setEditStr("");
          return;
        }
        if (editMode) {
          handleCancelEdit();
          return;
        }
        requestClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [requestClose, requestEditClose, editingCurrency, editMode, handleCancelEdit]);

  const handleRegisterChange = useCallback((nextId: string) => {
    setRegisterId(nextId);
    setBalances(getCashOpeningBalances(nextId));
  }, []);

  const openCurrencyEdit = useCallback(
    (currency: CashOpeningCurrency) => {
      if (!editMode) return;
      setEditingCurrency(currency);
      const value = balances[currency];
      setEditStr(value > 0 ? value.toFixed(2) : "");
    },
    [balances, editMode],
  );

  const saveCurrencyEdit = useCallback(() => {
    if (!editingCurrency) return;
    const trimmed = editStr.trim();
    const parsed = trimmed ? Math.max(0, parseFloat(trimmed) || 0) : 0;
    setBalances((prev) => ({ ...prev, [editingCurrency]: parsed }));
    requestEditClose();
    setEditStr("");
  }, [editStr, editingCurrency, requestEditClose]);

  const handleSave = useCallback(() => {
    saveCashOpeningBalances(registerId, balances);
    setSavedBalances(balances);
    setSavedRegisterId(registerId);
    setEditMode(false);
  }, [balances, registerId]);

  const handleSecondaryAction = useCallback(() => {
    if (editMode) {
      handleCancelEdit();
      return;
    }
    requestClose();
  }, [editMode, handleCancelEdit, requestClose]);

  const editingMeta = CASH_OPENING_CURRENCIES.find((item) => item.id === editingCurrency);

  return (
    <>
      <div className={styles.overlay} {...overlayProps} onClick={onBackdropClick} role="presentation">
        <div
          ref={panelRef}
          className={styles.dialog}
          {...panelProps}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-labelledby="cash-opening-title"
          aria-modal="true"
        >
          <header className={styles.titleBar}>
            <h2 id="cash-opening-title" className={styles.titleText}>
              Apertura de Caja
            </h2>
            <button type="button" className={styles.closeBtn} onClick={requestClose} aria-label="Cerrar">
              ×
            </button>
          </header>

          <div className={styles.body}>
            <section className={styles.section}>
              <h3 className={styles.sectionHeader}>Caja</h3>
              <div className={styles.cajaGrid}>
                <div className={styles.formRows}>
                  <div className={styles.formRow}>
                    <span className={styles.formLabel}>Caja</span>
                    <div className={styles.formControl}>
                      <WinSelect
                        className={styles.select}
                        value={registerId}
                        options={registerOptions}
                        disabled={!editMode}
                        onChange={handleRegisterChange}
                        aria-label="Caja"
                      />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <span className={styles.formLabel}>Vendedor responsable</span>
                    <div className={styles.formControl}>
                      <input
                        className={styles.readonlyField}
                        value={vendor.usuario}
                        readOnly
                        tabIndex={-1}
                      />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <span className={styles.formLabel}>Fecha apertura</span>
                    <div className={styles.formControl}>
                      <input
                        className={styles.readonlyField}
                        value={formatOpeningDateTime(openedAt)}
                        readOnly
                        tabIndex={-1}
                      />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <span className={styles.formLabel}>Estado de caja</span>
                    <div className={styles.formControl}>
                      <div className={styles.statusRow}>
                        {isClosed ? <LockedIcon /> : <UnlockedIcon />}
                        <span
                          className={[
                            styles.statusBadge,
                            isClosed ? styles.statusBadgeClosed : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {isClosed ? "Cerrado" : "Abierto"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button type="button" className={styles.drawerBtn} title="Abrir cajón">
                  <span className={styles.drawerIconWrap}>
                    <DrawerIcon />
                  </span>
                  <span className={styles.drawerLabel}>Abrir cajon</span>
                </button>
              </div>
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionHeader}>Saldo inicial</h3>
              <table className={styles.balanceTable}>
                <thead>
                  <tr>
                    {CASH_OPENING_CURRENCIES.map((currency) => (
                      <th key={currency.id}>
                        {currency.label}
                        <span className={styles.balanceSymbol}>{currency.symbol}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {CASH_OPENING_CURRENCIES.map((currency) => {
                      const amount = balances[currency.id];
                      const isZero = amount === 0;
                      return (
                        <td key={currency.id}>
                          <div
                            className={[
                              styles.balanceCell,
                              editMode ? styles.balanceCellEditable : styles.balanceCellDisabled,
                            ].join(" ")}
                            onClick={() => editMode && openCurrencyEdit(currency.id)}
                            onKeyDown={(event) => {
                              if (editMode && (event.key === "Enter" || event.key === " ")) {
                                event.preventDefault();
                                openCurrencyEdit(currency.id);
                              }
                            }}
                            role={editMode ? "button" : undefined}
                            tabIndex={editMode ? 0 : -1}
                          >
                            <span
                              className={[
                                styles.balanceAmount,
                                isZero && !editMode ? styles.balanceAmountEmpty : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              {formatOpeningAmount(amount)}
                            </span>
                            <button
                              type="button"
                              className={styles.keypadBtn}
                              disabled={!editMode}
                              onClick={(event) => {
                                event.stopPropagation();
                                openCurrencyEdit(currency.id);
                              }}
                              title="Teclado numérico"
                            >
                              <KeypadIcon />
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </section>
          </div>

          <footer className={styles.footer}>
            <div className={styles.footerLeft}>
              <button
                type="button"
                className={styles.footerBtn}
                onClick={() => setEditMode(true)}
                disabled={editMode}
              >
                Editar
              </button>
            </div>

            <div className={styles.footerRight}>
              <button type="button" className={styles.footerBtn} onClick={handleSecondaryAction}>
                {editMode ? "Cancelar" : "Cerrar"}
              </button>
              <button
                type="button"
                className={`${styles.footerBtn} ${styles.footerBtnPrimary}`}
                disabled={!editMode || !dirty}
                onClick={handleSave}
              >
                Guardar
              </button>
            </div>
          </footer>
        </div>
      </div>

      {editingCurrency && editingMeta ? (
        <div
          className={styles.editOverlay}
          {...editOverlayProps}
          onClick={onEditBackdropClick}
          role="presentation"
        >
          <div
            ref={editPanelRef}
            className={styles.editBox}
            {...editPanelProps}
            onClick={(event) => event.stopPropagation()}
          >
            <p className={styles.editTitle}>
              {editingMeta.label} ({editingMeta.symbol})
            </p>
            <input
              className={styles.editInput}
              value={editStr}
              onChange={(event) => setEditStr(event.target.value.replace(/[^\d.]/g, ""))}
              placeholder="0.00"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") saveCurrencyEdit();
                if (event.key === "Escape") requestEditClose();
              }}
            />
            <footer className={styles.editFooter}>
              <button type="button" className={styles.footerBtn} onClick={requestEditClose}>
                Cancelar
              </button>
              <button type="button" className={`${styles.footerBtn} ${styles.footerBtnPrimary}`} onClick={saveCurrencyEdit}>
                OK
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
