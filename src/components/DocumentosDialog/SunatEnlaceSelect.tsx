import { useMemo, useRef, useState } from "react";
import { SUNAT_DOCUMENT_CODES, sunatDescription } from "../../data/sunatDocumentCodes";
import { PickerCaretIcon } from "../SalesDayMonitor/PickerCaret";
import { PickerPopup } from "../SalesDayMonitor/PickerPopup";
import styles from "../CodeLabelSelect/codeLabelCombo.module.css";
import { useCodeLabelListAlignment } from "../CodeLabelSelect/useCodeLabelListAlignment";

type Props = {
  id?: string;
  value: string;
  onChange: (codigo: string) => void;
  "aria-label"?: string;
};

export function SunatEnlaceSelect({ id, value, onChange, "aria-label": ariaLabel }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pickerShellRef = useRef<HTMLDivElement>(null);
  const codeFieldRef = useRef<HTMLInputElement>(null);
  const descFieldRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const codigo = value || "";
  const descripcion = codigo ? sunatDescription(codigo).toUpperCase() : "";

  const options = useMemo(() => SUNAT_DOCUMENT_CODES, []);

  const estimatedHeight = Math.min(options.length * 22 + 8, 280);

  useCodeLabelListAlignment({
    open,
    listRef,
    pickerShellRef,
    codeFieldRef,
    descFieldRef,
    deps: [options.length],
  });

  const toggle = () => setOpen((current) => !current);

  const pick = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div ref={rootRef} className={[styles.root, styles.codeNarrow].join(" ")}>
      <div
        ref={pickerShellRef}
        className={[styles.pickerShell, styles.codeNarrow, open ? styles.pickerShellOpen : ""].filter(Boolean).join(" ")}
      >
        <input
          ref={codeFieldRef}
          className={[styles.codeField, open ? styles.codeFieldOpen : ""].filter(Boolean).join(" ")}
          data-win-combo-part="code"
          value={codigo}
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
          aria-label={ariaLabel ?? "Cod.enlace"}
          onClick={toggle}
        >
          <PickerCaretIcon />
        </button>
      </div>

      <input
        ref={descFieldRef}
        className={[styles.descField, styles.descFieldUpper].join(" ")}
        value={descripcion}
        readOnly
        aria-label="Descripción SUNAT"
        tabIndex={-1}
      />

      <PickerPopup
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={rootRef}
        className={styles.popup}
        estimatedHeight={estimatedHeight}
        role="listbox"
        ariaLabel={ariaLabel ?? "Cod.enlace SUNAT"}
      >
        <div ref={listRef} className={[styles.list, styles.listNarrow].join(" ")}>
          {options.map((item) => {
            const selected = item.codigo === codigo;
            return (
              <button
                key={item.codigo}
                type="button"
                role="option"
                aria-selected={selected}
                className={[styles.option, selected ? styles.optionSelected : ""].filter(Boolean).join(" ")}
                onClick={() => pick(item.codigo)}
              >
                <span className={styles.optionPicker}>
                  <span className={styles.optionCode}>{item.codigo}</span>
                  <span className={styles.optionBtnSpacer} aria-hidden="true" />
                  <span className={styles.optionLeadFill} aria-hidden="true" />
                </span>
                <span className={styles.optionDivider} aria-hidden="true" />
                <span className={styles.optionDesc}>{item.descripcion}</span>
              </button>
            );
          })}
        </div>
      </PickerPopup>
    </div>
  );
}
