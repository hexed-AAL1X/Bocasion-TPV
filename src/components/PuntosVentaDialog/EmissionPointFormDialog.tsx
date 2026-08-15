import { useMemo, useState, type ReactNode, useRef } from "react";
import { CASH_LIMIT_MODE_OPTIONS } from "../../data/emissionPoints";
import {
  WAREHOUSE_SUCURSAL_SELECT_OPTIONS,
  WAREHOUSE_TIENDA_SELECT_OPTIONS,
  type CodeLabelSelectOption,
} from "../../data/warehouseCatalog";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { CodeLabelSelect } from "../CodeLabelSelect/CodeLabelSelect";
import { WinSelect } from "../WinSelect/WinSelect";
import type { EmissionPointFormValues } from "../../utils/emissionPointFormUtils";
import styles from "./EmissionPointFormDialog.module.css";

type Props = {
  mode: "add" | "edit";
  initialValues: EmissionPointFormValues;
  onSave: (values: EmissionPointFormValues) => void;
  onClose: () => void;
};

export function EmissionPointFormDialog({ mode, initialValues, onSave, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, { panelRef });
  const [form, setForm] = useState<EmissionPointFormValues>(() => initialValues);
  const title = mode === "edit" ? "Modificar registro" : "Agregar registro";

  const sucursalOptions = useMemo<CodeLabelSelectOption[]>(
    () =>
      WAREHOUSE_SUCURSAL_SELECT_OPTIONS.some((item) => item.value === form.sucursal)
        ? WAREHOUSE_SUCURSAL_SELECT_OPTIONS
        : [...WAREHOUSE_SUCURSAL_SELECT_OPTIONS, { value: form.sucursal, code: "", label: form.sucursal }],
    [form.sucursal],
  );

  const tiendaOptions = useMemo<CodeLabelSelectOption[]>(
    () =>
      WAREHOUSE_TIENDA_SELECT_OPTIONS.some((item) => item.value === form.tienda)
        ? WAREHOUSE_TIENDA_SELECT_OPTIONS
        : [...WAREHOUSE_TIENDA_SELECT_OPTIONS, { value: form.tienda, code: "", label: form.tienda }],
    [form.tienda],
  );

  const canSave = useMemo(() => form.nombre.trim().length > 0 && form.codigo.trim().length > 0, [form.codigo, form.nombre]);

  const patch = <K extends keyof EmissionPointFormValues>(key: K, value: EmissionPointFormValues[K]) => {
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
        aria-labelledby="emission-point-form-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h2 id="emission-point-form-title" className={styles.titleText}>
            {title}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={requestClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className={styles.body}>
          <section className={styles.section}>
            <div className={styles.sectionBody}>
              <div className={styles.codigoRow}>
                <span className={styles.formLabel}>Código</span>
                <div className={styles.codigoControls}>
                  <input
                    id="ep-codigo"
                    className={styles.inputCodigo}
                    value={form.codigo}
                    onChange={(event) => patch("codigo", event.target.value)}
                    maxLength={4}
                    aria-label="Código"
                  />
                  <label className={styles.checkInline}>
                    <input
                      type="checkbox"
                      checked={form.habilitado}
                      onChange={(event) => patch("habilitado", event.target.checked)}
                    />
                    Habilitado
                  </label>
                </div>
              </div>

              <FormRow label="Nombre" htmlFor="ep-nombre">
                <input
                  id="ep-nombre"
                  className={styles.field}
                  value={form.nombre}
                  onChange={(event) => patch("nombre", event.target.value)}
                />
              </FormRow>

              <FormRow label="Sucursal" htmlFor="ep-sucursal">
                <CodeLabelSelect
                  id="ep-sucursal"
                  className={styles.select}
                  value={form.sucursal}
                  options={sucursalOptions}
                  onChange={(value) => patch("sucursal", value)}
                  aria-label="Sucursal"
                />
              </FormRow>

              <FormRow label="Tienda" htmlFor="ep-tienda">
                <CodeLabelSelect
                  id="ep-tienda"
                  className={styles.select}
                  value={form.tienda}
                  options={tiendaOptions}
                  onChange={(value) => patch("tienda", value)}
                  aria-label="Tienda"
                />
              </FormRow>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionHeader}>Válido sólo para puntos de venta que emitan TICKET</h3>
            <div className={styles.sectionBody}>
              <FormRow label="Modelo máquina" htmlFor="ep-modelo">
                <input
                  id="ep-modelo"
                  className={styles.field}
                  value={form.modeloMaquina}
                  onChange={(event) => patch("modeloMaquina", event.target.value)}
                />
              </FormRow>

              <FormRow label="Nro serie" htmlFor="ep-serie">
                <input
                  id="ep-serie"
                  className={styles.field}
                  value={form.nroSerie}
                  onChange={(event) => patch("nroSerie", event.target.value)}
                />
              </FormRow>

              <FormRow label="Hoja Excel" htmlFor="ep-excel">
                <div className={styles.browseRow}>
                  <input
                    id="ep-excel"
                    className={styles.fieldBrowse}
                    value={form.hojaExcel}
                    onChange={(event) => patch("hojaExcel", event.target.value)}
                  />
                  <button type="button" className={styles.browseBtn} onClick={() => undefined}>
                    …
                  </button>
                </div>
              </FormRow>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionHeader}>Límite de efectivo en caja</h3>
            <div className={styles.sectionBody}>
              <div className={styles.formRow}>
                <span className={styles.formLabel}>Límite</span>
                <div className={styles.limiteRow}>
                  <WinSelect
                    id="ep-limite-modo"
                    className={styles.limiteSelect}
                    value={form.limiteEfectivoModo}
                    options={CASH_LIMIT_MODE_OPTIONS}
                    onChange={(value) => patch("limiteEfectivoModo", value as EmissionPointFormValues["limiteEfectivoModo"])}
                    aria-label="Modo límite de efectivo"
                  />
                  <input
                    id="ep-limite-monto"
                    className={styles.fieldShort}
                    type="number"
                    min={0}
                    step={1}
                    value={form.limiteEfectivoMonto}
                    onChange={(event) => patch("limiteEfectivoMonto", Number(event.target.value) || 0)}
                    aria-label="Monto límite de efectivo"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.footerBtn} onClick={requestClose}>
            Cancelar
          </button>
          <button type="button" className={styles.footerBtnPrimary} onClick={handleSave} disabled={!canSave}>
            Guardar
          </button>
        </footer>
      </div>
    </div>
  );
}

function FormRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.formRow}>
      <label className={styles.formLabel} htmlFor={htmlFor}>
        {label}
      </label>
      <div className={styles.formControl}>{children}</div>
    </div>
  );
}
