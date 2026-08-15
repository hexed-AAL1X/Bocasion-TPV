import { useEffect, useRef, useState, type CSSProperties } from "react";
import { EXPORT_DROPDOWN_KINDS, EXPORT_FILE_CONFIG, type ExportFileKind } from "./exportFileConfig";
import { PickerCaretIcon } from "../SalesDayMonitor/PickerCaret";
import { ExcelActionIcon } from "./printDialogIcons";
import styles from "./PrintPropertiesDialog.module.css";

type Props = {
  disabled?: boolean;
  onSelect: (kind: ExportFileKind) => void;
};

export function ExportSplitButton({ disabled, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const [menuExpanded, setMenuExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    if (open) {
      setMenuMounted(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setMenuExpanded(true));
      });
      return () => cancelAnimationFrame(frame);
    }
    setMenuExpanded(false);
  }, [open]);

  const handleMenuTransitionEnd = (event: React.TransitionEvent<HTMLDivElement>) => {
    if (event.propertyName !== "opacity" || menuExpanded) return;
    setMenuMounted(false);
  };

  const pick = (kind: ExportFileKind) => {
    setOpen(false);
    onSelect(kind);
  };

  return (
    <div className={styles.exportMenu} ref={rootRef}>
      <div
        className={styles.exportSplitWrap}
        data-open={open ? "true" : undefined}
        data-disabled={disabled ? "true" : undefined}
      >
        <button
          type="button"
          className={`${styles.exportBtn} ${styles.exportSplitBtn}`}
          onClick={() => pick("excel")}
          disabled={disabled}
        >
          <span className={styles.exportActionIcon}>
            <ExcelActionIcon />
          </span>
          <span className={styles.exportActionLabel}>
            <span className={styles.exportMnemonic}>E</span>xcel
          </span>
        </button>
        <span className={styles.exportSplitDivider} aria-hidden="true" />
        <button
          type="button"
          className={styles.exportSplitCaret}
          onClick={() => setOpen((value) => !value)}
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Más formatos de exportación"
        >
          <PickerCaretIcon />
        </button>
      </div>

      {menuMounted && (
        <div
          className={styles.exportMenuList}
          data-open={menuExpanded ? "true" : "false"}
          role="menu"
          onTransitionEnd={handleMenuTransitionEnd}
        >
          {EXPORT_DROPDOWN_KINDS.map((kind, index) => {
            const { menuLabel, Icon } = EXPORT_FILE_CONFIG[kind];
            return (
              <button
                key={kind}
                type="button"
                className={styles.exportMenuItem}
                role="menuitem"
                style={{ "--export-item-delay": `${0.04 + index * 0.035}s` } as CSSProperties}
                onClick={() => pick(kind)}
              >
                <span className={styles.exportActionIcon}>
                  <Icon />
                </span>
                <span className={styles.exportActionLabel}>{menuLabel}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
