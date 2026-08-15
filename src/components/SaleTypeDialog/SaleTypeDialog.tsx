import {useEffect, useRef } from "react";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import {
  ALL_SALE_TYPE_OPTIONS,
  DEFAULT_SALE_TYPE,
  isSpecialSaleType,
} from "../../data/saleTypes";
import styles from "./SaleTypeDialog.module.css";

type Props = {
  selectedType: string;
  onSelect: (label: string) => void;
  onClose: () => void;
};

export function SaleTypeDialog({ selectedType, onSelect, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, { panelRef });
  const specialActive = isSpecialSaleType(selectedType);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [requestClose]);

  const handleSelect = (label: string) => {
    onSelect(label);
    requestClose();
  };

  return (
    <div className={styles.overlay} {...overlayProps} onClick={onBackdropClick} role="presentation">
      <div
          ref={panelRef}
        className={styles.dialog}
        {...panelProps}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="sale-type-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h2 id="sale-type-title" className={styles.titleText}>
            Tipo de venta
          </h2>
          <button type="button" className={styles.titleClose} onClick={requestClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className={styles.content}>
          <fieldset
            className={[
              styles.statusGroup,
              specialActive ? styles.statusGroupSpecial : styles.statusGroupNormal,
            ].join(" ")}
          >
            <legend className={styles.groupLegend}>Estado actual</legend>
            <strong className={styles.statusValue}>{selectedType}</strong>
            <span className={styles.statusHint}>
              {specialActive
                ? "Modo especial activo. Elija Mercadería para volver a la venta normal."
                : "Venta en modo normal."}
            </span>
          </fieldset>

          <fieldset className={styles.optionGroup}>
            <legend className={styles.groupLegend}>Seleccionar tipo</legend>
            <div className={styles.optionList} role="listbox" aria-label="Tipos de venta">
              {ALL_SALE_TYPE_OPTIONS.map((option) => {
                const active = selectedType === option.label;
                const isNormal = option.label === DEFAULT_SALE_TYPE;
                const primaryText = active && isNormal ? option.hint : option.label;
                const showHint = !active || !isNormal;

                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={[
                      styles.optionCard,
                      active && isNormal ? styles.optionCardActiveNormal : "",
                      active && !isNormal ? styles.optionCardActiveSpecial : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => handleSelect(option.label)}
                  >
                    <span className={styles.optionMark} aria-hidden>
                      {active ? "●" : "○"}
                    </span>
                    <span className={styles.optionText}>
                      <span className={styles.optionTitle}>{primaryText}</span>
                      {showHint ? <span className={styles.optionHint}>{option.hint}</span> : null}
                    </span>
                    {active ? (
                      <span className={styles.optionBadge}>
                        {isNormal ? "Normal" : "Activo"}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.footerBtn} onClick={requestClose}>
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
}
