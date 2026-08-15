import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { PickerCaret } from "../SalesDayMonitor/PickerCaret";
import { PickerPopup } from "../SalesDayMonitor/PickerPopup";
import shell from "../SalesDayMonitor/salesPickerShell.module.css";
import styles from "./winSelect.module.css";

export type WinSelectOption = {
  value: string;
  label: string;
};

type Props = {
  id?: string;
  value: string;
  options: WinSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Ancho contenido (p. ej. filtros en toolbar). Por defecto ocupa todo el ancho del contenedor. */
  compact?: boolean;
  className?: string;
  "aria-label"?: string;
  /** Preferencia de apertura del menú (útil cuando hay controles debajo del selector). */
  menuPlacement?: "auto" | "up" | "down";
};

export function WinSelect({
  id,
  value,
  options,
  onChange,
  disabled = false,
  compact = false,
  className,
  "aria-label": ariaLabel,
  menuPlacement = "auto",
}: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(
    () => options.find((option) => option.value === value)?.label ?? value,
    [options, value],
  );

  const estimatedHeight = Math.min(options.length * 26 + 8, 280);

  useLayoutEffect(() => {
    if (!open || !listRef.current) return;

    const list = listRef.current;
    const syncScrollbarWidth = () => {
      const scrollbarWidth = list.offsetWidth - list.clientWidth;
      list.style.setProperty("--win-scrollbar-width", `${scrollbarWidth}px`);
    };

    syncScrollbarWidth();
    const observer = new ResizeObserver(syncScrollbarWidth);
    observer.observe(list);
    return () => observer.disconnect();
  }, [open, options]);

  const toggle = () => {
    if (disabled) return;
    setOpen((current) => !current);
  };

  const pick = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div
      className={[styles.root, compact ? styles.rootCompact : ""].filter(Boolean).join(" ")}
    >
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={[
          shell.trigger,
          styles.trigger,
          compact ? styles.triggerCompact : "",
          open ? shell.triggerOpen : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={toggle}
      >
        <span className={shell.triggerText}>{selectedLabel}</span>
        <PickerCaret />
      </button>

      <PickerPopup
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        className={styles.popup}
        estimatedHeight={estimatedHeight}
        placement={menuPlacement}
        role="listbox"
        ariaLabel={ariaLabel}
      >
        <div ref={listRef} className={styles.list}>
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                className={[styles.option, selected ? styles.optionSelected : ""].filter(Boolean).join(" ")}
                onClick={() => pick(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </PickerPopup>
    </div>
  );
}
