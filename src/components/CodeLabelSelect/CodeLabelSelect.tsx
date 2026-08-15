import { useMemo, useRef, useState } from "react";
import { PickerCaretIcon } from "../SalesDayMonitor/PickerCaret";
import { PickerPopup } from "../SalesDayMonitor/PickerPopup";
import styles from "./codeLabelCombo.module.css";
import { useCodeLabelListAlignment } from "./useCodeLabelListAlignment";

export type CodeLabelSelectOption = {
  value: string;
  code: string;
  label: string;
  indent?: number;
};

type Props = {
  id?: string;
  value: string;
  options: CodeLabelSelectOption[];
  onChange: (value: string) => void;
  wideCode?: boolean;
  className?: string;
  "aria-label"?: string;
};

export function CodeLabelSelect({
  id,
  value,
  options,
  onChange,
  wideCode = false,
  className,
  "aria-label": ariaLabel,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pickerShellRef = useRef<HTMLDivElement>(null);
  const codeFieldRef = useRef<HTMLInputElement>(null);
  const descFieldRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  const code = selected?.code ?? "";
  const label = selected?.label ?? (value || "");

  const estimatedHeight = Math.min(options.length * 22 + 8, 280);
  const wideClass = wideCode ? styles.codeWide : "";

  useCodeLabelListAlignment({
    open,
    listRef,
    pickerShellRef,
    codeFieldRef,
    descFieldRef,
    deps: [options.length, wideCode],
  });

  const toggle = () => setOpen((current) => !current);

  const pick = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div ref={rootRef} className={[styles.root, wideClass, className].filter(Boolean).join(" ")}>
      <div
        ref={pickerShellRef}
        className={[styles.pickerShell, wideClass, open ? styles.pickerShellOpen : ""].filter(Boolean).join(" ")}
      >
        <input
          ref={codeFieldRef}
          className={[styles.codeField, open ? styles.codeFieldOpen : ""].filter(Boolean).join(" ")}
          data-win-combo-part="code"
          value={code}
          readOnly
          tabIndex={-1}
          aria-hidden="true"
        />
        <button
          ref={triggerRef}
          id={id}
          type="button"
          className={styles.dropBtn}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel}
          onClick={toggle}
        >
          <PickerCaretIcon />
        </button>
      </div>

      <input
        ref={descFieldRef}
        className={styles.descField}
        value={label} readOnly aria-label={`${ariaLabel ?? "Opción"} descripción`} tabIndex={-1} />

      <PickerPopup
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={rootRef}
        className={styles.popup}
        estimatedHeight={estimatedHeight}
        role="listbox"
        ariaLabel={ariaLabel}
      >
        <div ref={listRef} className={[styles.list, wideCode ? styles.listWide : ""].filter(Boolean).join(" ")}>
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={`${option.code}-${option.value}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={[styles.option, isSelected ? styles.optionSelected : ""].filter(Boolean).join(" ")}
                onClick={() => pick(option.value)}
              >
                <span className={styles.optionPicker}>
                  <span className={styles.optionCode}>{option.code}</span>
                  <span className={styles.optionBtnSpacer} aria-hidden="true" />
                  <span className={styles.optionLeadFill} aria-hidden="true" />
                </span>
                <span className={styles.optionDivider} aria-hidden="true" />
                <span
                  className={styles.optionDesc}
                  style={option.indent ? { paddingLeft: 6 + option.indent * 12 } : undefined}
                >
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </PickerPopup>
    </div>
  );
}
