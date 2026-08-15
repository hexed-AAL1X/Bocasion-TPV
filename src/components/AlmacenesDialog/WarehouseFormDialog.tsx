import { useMemo, useState, type ReactNode, useRef } from "react";
import {
  WAREHOUSE_SUCURSAL_SELECT_OPTIONS,
  WAREHOUSE_SUB_CCOSTO_SELECT_OPTIONS,
  WAREHOUSE_TIENDA_SELECT_OPTIONS,
  WAREHOUSE_TIPO_SELECT_OPTIONS,
  type CodeLabelSelectOption,
} from "../../data/warehouseCatalog";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { CodeLabelSelect } from "../CodeLabelSelect/CodeLabelSelect";
import styles from "./WarehouseFormDialog.module.css";

export type WarehouseFormValues = {
  codigo: string;
  habilitado: boolean;
  almacen: string;
  direccion: string;
  telefono: string;
  responsable: string;
  email: string;
  tipo: string;
  subCCosto: string;
  sucursal: string;
  tienda: string;
  recepManualTransf: boolean;
  despachoAutomatico: boolean;
  asientoContableTransf: boolean;
  kardexCentralizado: boolean;
};

type Props = {
  mode: "add" | "edit";
  initialValues: WarehouseFormValues;
  onSave: (values: WarehouseFormValues) => void;
  onClose: () => void;
};

export function WarehouseFormDialog({
  mode,
  initialValues,
  onSave,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, { panelRef });
  const [form, setForm] = useState<WarehouseFormValues>(() => initialValues);
  const title = mode === "edit" ? "Modificar registro" : "Agregar registro";

  const tipoOptions = useMemo<CodeLabelSelectOption[]>(
    () =>
      WAREHOUSE_TIPO_SELECT_OPTIONS.some((item) => item.value === form.tipo)
        ? WAREHOUSE_TIPO_SELECT_OPTIONS
        : [...WAREHOUSE_TIPO_SELECT_OPTIONS, { value: form.tipo, code: "", label: form.tipo }],
    [form.tipo],
  );

  const sucursalOptions = useMemo<CodeLabelSelectOption[]>(
    () =>
      WAREHOUSE_SUCURSAL_SELECT_OPTIONS.some((item) => item.value === form.sucursal)
        ? WAREHOUSE_SUCURSAL_SELECT_OPTIONS
        : [...WAREHOUSE_SUCURSAL_SELECT_OPTIONS, { value: form.sucursal, code: "", label: form.sucursal }],
    [form.sucursal],
  );

  const subCCostoOptions = useMemo<CodeLabelSelectOption[]>(
    () =>
      !form.subCCosto || WAREHOUSE_SUB_CCOSTO_SELECT_OPTIONS.some((item) => item.value === form.subCCosto)
        ? WAREHOUSE_SUB_CCOSTO_SELECT_OPTIONS
        : [...WAREHOUSE_SUB_CCOSTO_SELECT_OPTIONS, { value: form.subCCosto, code: form.subCCosto, label: form.subCCosto }],
    [form.subCCosto],
  );

  const tiendaOptions = useMemo<CodeLabelSelectOption[]>(
    () =>
      WAREHOUSE_TIENDA_SELECT_OPTIONS.some((item) => item.value === form.tienda)
        ? WAREHOUSE_TIENDA_SELECT_OPTIONS
        : [...WAREHOUSE_TIENDA_SELECT_OPTIONS, { value: form.tienda, code: "", label: form.tienda }],
    [form.tienda],
  );

  const canSave = useMemo(() => form.almacen.trim().length > 0, [form.almacen]);

  const patch = <K extends keyof WarehouseFormValues>(key: K, value: WarehouseFormValues[K]) => {
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
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="warehouse-form-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h2 id="warehouse-form-title" className={styles.titleText}>
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
                    id="wh-codigo"
                    className={styles.inputCodigo}
                    value={form.codigo}
                    onChange={(e) => patch("codigo", e.target.value)}
                    maxLength={4}
                    aria-label="Código"
                  />
                  <label className={styles.checkInline}>
                    <input
                      type="checkbox"
                      checked={form.habilitado}
                      onChange={(e) => patch("habilitado", e.target.checked)}
                    />
                    Habilitado
                  </label>
                </div>
              </div>

              <FormRow label="Almacén" htmlFor="wh-almacen">
                <input
                  id="wh-almacen"
                  className={styles.field}
                  value={form.almacen}
                  onChange={(e) => patch("almacen", e.target.value)}
                />
              </FormRow>

              <FormRow label="Dirección" htmlFor="wh-direccion">
                <input
                  id="wh-direccion"
                  className={styles.field}
                  value={form.direccion}
                  onChange={(e) => patch("direccion", e.target.value)}
                />
              </FormRow>

              <FormRow label="Teléfono" htmlFor="wh-telefono">
                <input
                  id="wh-telefono"
                  className={styles.fieldShort}
                  value={form.telefono}
                  onChange={(e) => patch("telefono", e.target.value)}
                />
              </FormRow>

              <FormRow label="Responsable" htmlFor="wh-responsable">
                <input
                  id="wh-responsable"
                  className={styles.field}
                  value={form.responsable}
                  onChange={(e) => patch("responsable", e.target.value)}
                />
              </FormRow>

              <FormRow label="E-mail" htmlFor="wh-email">
                <input
                  id="wh-email"
                  className={styles.field}
                  type="email"
                  value={form.email}
                  onChange={(e) => patch("email", e.target.value)}
                />
              </FormRow>

              <FormRow label="Tipo de Alm." htmlFor="wh-tipo">
                <CodeLabelSelect
                  id="wh-tipo"
                  value={form.tipo}
                  options={tipoOptions}
                  onChange={(next) => patch("tipo", next)}
                  aria-label="Tipo de almacén"
                />
              </FormRow>

              <FormRow label="Sub C. Costo" htmlFor="wh-subcc">
                <CodeLabelSelect
                  id="wh-subcc"
                  value={form.subCCosto}
                  options={[{ value: "", code: "", label: "" }, ...subCCostoOptions]}
                  onChange={(next) => patch("subCCosto", next)}
                  wideCode
                  aria-label="Sub centro de costo"
                />
              </FormRow>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionHeader}>Ubicación:</h3>
            <div className={styles.sectionBody}>
              <FormRow label="Sucursal" htmlFor="wh-sucursal">
                <CodeLabelSelect
                  id="wh-sucursal"
                  value={form.sucursal}
                  options={sucursalOptions}
                  onChange={(next) => patch("sucursal", next)}
                  aria-label="Sucursal"
                />
              </FormRow>

              <FormRow label="Tienda" htmlFor="wh-tienda">
                <CodeLabelSelect
                  id="wh-tienda"
                  value={form.tienda}
                  options={tiendaOptions}
                  onChange={(next) => patch("tienda", next)}
                  aria-label="Tienda"
                />
              </FormRow>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionHeader}>Alcance:</h3>
            <div className={styles.sectionBody}>
              <div className={styles.checkList}>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={form.recepManualTransf}
                    onChange={(e) => patch("recepManualTransf", e.target.checked)}
                  />
                  Recepción manual de transf. entre almac.
                </label>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={form.despachoAutomatico}
                    onChange={(e) => patch("despachoAutomatico", e.target.checked)}
                  />
                  Despacho automático de mercadería
                </label>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={form.asientoContableTransf}
                    onChange={(e) => patch("asientoContableTransf", e.target.checked)}
                  />
                  Generar asiento contable al recepcionar una transf. entre almac.
                </label>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={form.kardexCentralizado}
                    onChange={(e) => patch("kardexCentralizado", e.target.checked)}
                  />
                  Almacén formará parte del kardex centralizado
                </label>
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
