import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PRODUCT_FAMILIES } from "../../data/productFamilies";
import type { WarehouseRecord } from "../../data/warehouses";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { PickerPopup } from "../SalesDayMonitor/PickerPopup";
import { PickerCaret } from "../SalesDayMonitor/PickerCaret";
import shell from "../SalesDayMonitor/salesPickerShell.module.css";
import styles from "./WarehouseTransferDialog.module.css";

type Props = {
  targetWarehouse: WarehouseRecord;
  sourceCodigo?: string;
  sourceLabel?: string;
  onAccept: (families: string[]) => void;
  onClose: () => void;
};

function formatFamiliesLabel(selected: Set<string>): string {
  if (selected.size === 0) return "";
  return PRODUCT_FAMILIES.filter((family) => selected.has(family)).join(", ");
}

function TransferIcon() {
  return (
    <svg viewBox="0 0 32 32" width="32" height="32" className={styles.transferIcon} aria-hidden>
      <rect x="3" y="8" width="11" height="14" fill="#fff" stroke="#888" strokeWidth="1" />
      <rect x="18" y="8" width="11" height="14" fill="#fff" stroke="#888" strokeWidth="1" />
      <path d="M14 15h4M16 13l2 2-2 2" fill="none" stroke="#316ac5" strokeWidth="1.6" />
    </svg>
  );
}

export function WarehouseTransferDialog({
  targetWarehouse,
  sourceCodigo = "01",
  sourceLabel = "PRINCIPAL",
  onAccept,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const acceptBtnRef = useRef<HTMLButtonElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, { panelRef });
  const [selectedFamilies, setSelectedFamilies] = useState<Set<string>>(() => new Set());
  const [pickerOpen, setPickerOpen] = useState(false);

  const familiesLabel = useMemo(() => formatFamiliesLabel(selectedFamilies), [selectedFamilies]);

  const closePicker = useCallback(() => {
    setPickerOpen(false);
  }, []);

  const togglePicker = useCallback(() => {
    setPickerOpen((current) => !current);
  }, []);

  const toggleFamily = useCallback((family: string) => {
    setSelectedFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(family)) next.delete(family);
      else next.add(family);
      return next;
    });
  }, []);

  useEffect(() => {
    acceptBtnRef.current?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (pickerOpen) {
          closePicker();
          return;
        }
        requestClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closePicker, pickerOpen, requestClose]);

  const handleAccept = () => {
    onAccept([...selectedFamilies]);
  };

  return (
    <div className={styles.overlay} {...overlayProps} onClick={onBackdropClick} role="presentation">
      <div
        ref={panelRef}
        className={styles.dialog}
        {...panelProps}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="warehouse-transfer-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h2 id="warehouse-transfer-title" className={styles.titleText}>
            Transfiere productos al Almacen: {targetWarehouse.almacen}
          </h2>
          <button type="button" className={styles.titleClose} onClick={requestClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className={styles.body}>
          <section className={styles.section} aria-label="Descripción">
            <div className={styles.promptRow}>
              <TransferIcon />
              <p className={styles.message}>
                Transfiere productos del almacén <strong>{sourceLabel}</strong> (Codigo {sourceCodigo}) al
                almacén <strong>{targetWarehouse.almacen}</strong> (Codigo {targetWarehouse.codigo}), si alguno
                de los productos existiera no lo transfiere
              </p>
            </div>
          </section>

          <section className={styles.sectionFamilies} aria-label="Familias de producto">
            <h3 className={styles.sectionHeader}>Familias:</h3>
            <div className={styles.sectionBodyPicker}>
              <div className={[shell.shell, styles.pickerShell].join(" ")}>
                <button
                  ref={triggerRef}
                  id="wh-transfer-families"
                  type="button"
                  className={[
                    shell.trigger,
                    styles.triggerFamilies,
                    pickerOpen ? shell.triggerOpen : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-haspopup="listbox"
                  aria-expanded={pickerOpen}
                  aria-label="Familias seleccionadas"
                  title={familiesLabel || undefined}
                  onClick={togglePicker}
                >
                  <span className={shell.triggerText}>{familiesLabel || "—"}</span>
                  <PickerCaret />
                </button>

                <PickerPopup
                  open={pickerOpen}
                  onClose={closePicker}
                  anchorRef={triggerRef}
                  className={styles.popupFamilies}
                  estimatedHeight={220}
                  role="listbox"
                  ariaLabel="Familias de producto"
                >
                  <div className={styles.familyList}>
                    {PRODUCT_FAMILIES.map((family) => {
                      const checked = selectedFamilies.has(family);
                      return (
                        <button
                          key={family}
                          type="button"
                          role="option"
                          aria-selected={checked}
                          className={styles.familyOption}
                          onClick={() => toggleFamily(family)}
                        >
                          <input type="checkbox" checked={checked} readOnly tabIndex={-1} aria-hidden />
                          <span>{family}</span>
                        </button>
                      );
                    })}
                  </div>
                </PickerPopup>
              </div>
            </div>
          </section>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.footerBtn} onClick={requestClose}>
            Cancelar
          </button>
          <button
            ref={acceptBtnRef}
            type="button"
            className={[styles.footerBtn, styles.footerBtnPrimary].filter(Boolean).join(" ")}
            onClick={handleAccept}
          >
            Aceptar
          </button>
        </footer>
      </div>
    </div>
  );
}
