import { useMemo, useRef, useState } from "react";
import { formatSaleConditionCodigo } from "../../data/paymentConditions";
import type { SaleConditionFormValues } from "../../utils/saleConditionFormUtils";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import styles from "./CondicionVentaFormDialog.module.css";

type Props = {
  mode: "add" | "edit";
  initialValues: SaleConditionFormValues;
  onSave: (values: SaleConditionFormValues) => void;
  onClose: () => void;
};

function SaveIcon() {
  return (
    <svg className={styles.sideBtnIcon} viewBox="0 0 16 16" aria-hidden>
      <rect x="2" y="2" width="12" height="12" rx="1" fill="#3a7bd5" stroke="#1a3a6a" strokeWidth="0.8" />
      <rect x="4.5" y="2.5" width="7" height="4" fill="#dce9f8" stroke="#1a3a6a" strokeWidth="0.6" />
      <rect x="5" y="8" width="6" height="5" fill="#f4f8fc" stroke="#1a3a6a" strokeWidth="0.6" />
    </svg>
  );
}

function CancelIcon() {
  return (
    <svg className={styles.sideBtnIcon} viewBox="0 0 16 16" aria-hidden>
      <path
        d="M3 8h8M7 4l4 4-4 4"
        fill="none"
        stroke="#3a7bd5"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function parseNum(raw: string): number {
  const n = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function CondicionVentaFormDialog({ mode, initialValues, onSave, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, { panelRef });
  const [form, setForm] = useState<SaleConditionFormValues>(() => initialValues);
  const title = mode === "edit" ? "Modificar registro" : "Agregar registro";
  const canSave = form.nombre.trim().length > 0;
  const codigoLabel = useMemo(() => formatSaleConditionCodigo(form.codigo, mode), [form.codigo, mode]);

  const patch = <K extends keyof SaleConditionFormValues>(key: K, value: SaleConditionFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave(form);
  };

  return (
    <div className={styles.overlay} {...overlayProps} onClick={onBackdropClick} role="presentation">
      <div
        ref={panelRef}
        className={styles.dialog}
        {...panelProps}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="condicion-venta-form-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h2 id="condicion-venta-form-title" className={styles.titleText}>
            {title}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={requestClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.main}>
            <section className={styles.panel}>
              <div className={styles.formRow}>
                <label className={styles.formLabel} htmlFor="cond-codigo">
                  Código
                </label>
                <div className={styles.formControl}>
                  <input id="cond-codigo" className={styles.inputCodigo} value={codigoLabel} readOnly aria-label="Código" />
                </div>
              </div>

              <div className={styles.formRow}>
                <label className={styles.formLabel} htmlFor="cond-nombre">
                  Nombre
                </label>
                <div className={styles.formControl}>
                  <input
                    id="cond-nombre"
                    className={styles.fieldRequired}
                    value={form.nombre}
                    onChange={(event) => patch("nombre", event.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <span className={styles.formLabel}>Condición</span>
                <div className={styles.radioRow} role="radiogroup" aria-label="Condición">
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="cond-tipo"
                      checked={form.condicion === "CONTADO"}
                      onChange={() => patch("condicion", "CONTADO")}
                    />
                    Contado
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="cond-tipo"
                      checked={form.condicion === "CREDITO"}
                      onChange={() => patch("condicion", "CREDITO")}
                    />
                    Crédito
                  </label>
                </div>
              </div>
            </section>

            <hr className={styles.divider} />

            <section className={styles.panel}>
              <div className={styles.grid2}>
                <div className={styles.gridRow}>
                  <label className={styles.formLabel} htmlFor="cond-letras">
                    N° de letras
                  </label>
                  <input
                    id="cond-letras"
                    className={styles.inputNum}
                    value={String(form.nLetras)}
                    onChange={(event) => patch("nLetras", Math.trunc(parseNum(event.target.value)))}
                    inputMode="numeric"
                  />
                </div>
                <div className={styles.gridRow}>
                  <label className={styles.formLabel} htmlFor="cond-venc">
                    Vencimiento
                  </label>
                  <input
                    id="cond-venc"
                    className={styles.inputNum}
                    value={String(form.vencimiento)}
                    onChange={(event) => patch("vencimiento", Math.trunc(parseNum(event.target.value)))}
                    inputMode="numeric"
                  />
                </div>
                <div className={styles.gridRow}>
                  <label className={styles.formLabel} htmlFor="cond-tasa">
                    Tasa gasto financ.
                  </label>
                  <input
                    id="cond-tasa"
                    className={styles.inputNum}
                    value={form.tasaGastoFinanc.toFixed(2)}
                    onChange={(event) => patch("tasaGastoFinanc", parseNum(event.target.value))}
                    inputMode="decimal"
                  />
                </div>
                <div className={styles.gridRow}>
                  <label className={styles.formLabel} htmlFor="cond-inc">
                    Inc. L.P. Vta.
                  </label>
                  <input
                    id="cond-inc"
                    className={styles.inputNum}
                    value={`${form.incLpVta.toFixed(2)}%`}
                    onChange={(event) =>
                      patch("incLpVta", parseNum(event.target.value.replace("%", "")))
                    }
                    inputMode="decimal"
                  />
                </div>
              </div>
            </section>
          </div>

          <aside className={styles.sideActions}>
            <button
              type="button"
              className={styles.sideBtnPrimary}
              onClick={handleSave}
              disabled={!canSave}
            >
              <SaveIcon />
              Guardar
            </button>
            <button type="button" className={styles.sideBtn} onClick={requestClose}>
              <CancelIcon />
              Cancelar
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}
