import { useMemo, useState, type ReactNode, useRef } from "react";
import type { DriverFormValues } from "../../utils/driverFormUtils";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { WinSelect } from "../WinSelect/WinSelect";
import styles from "./DriverFormDialog.module.css";

type Props = {
  mode: "add" | "edit";
  carrierName: string;
  initialValues: DriverFormValues;
  onSave: (values: DriverFormValues) => void;
  onClose: () => void;
};

export function DriverFormDialog({ mode, carrierName, initialValues, onSave, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, { panelRef });
  const [form, setForm] = useState<DriverFormValues>(() => initialValues);
  const title = mode === "edit" ? "Modificar registro" : "Agregar registro";

  const transportistaOptions = useMemo(
    () => [{ value: carrierName, label: carrierName }],
    [carrierName],
  );

  const canSave = useMemo(
    () => form.nombre.trim().length > 0 && form.dni.trim().length > 0 && form.licencia.trim().length > 0,
    [form.dni, form.licencia, form.nombre],
  );

  const patch = <K extends keyof DriverFormValues>(key: K, value: DriverFormValues[K]) => {
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
        aria-labelledby="driver-form-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h2 id="driver-form-title" className={styles.titleText}>
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
                    id="drv-codigo"
                    className={styles.inputCodigo}
                    value={form.codigo}
                    onChange={(e) => patch("codigo", e.target.value)}
                    maxLength={5}
                    aria-label="Código"
                    readOnly={mode === "edit"}
                  />
                  <label className={styles.checkInline}>
                    <input
                      type="checkbox"
                      checked={form.activo}
                      onChange={(e) => patch("activo", e.target.checked)}
                    />
                    Activo
                  </label>
                </div>
              </div>

              <FormRow label="Nombre" htmlFor="drv-nombre">
                <input
                  id="drv-nombre"
                  className={styles.fieldRequired}
                  value={form.nombre}
                  onChange={(e) => patch("nombre", e.target.value)}
                />
              </FormRow>

              <FormRow label="N° DNI" htmlFor="drv-dni">
                <input
                  id="drv-dni"
                  className={styles.fieldRequired}
                  value={form.dni}
                  onChange={(e) => patch("dni", e.target.value)}
                />
              </FormRow>

              <FormRow label="N° Licencia" htmlFor="drv-licencia">
                <input
                  id="drv-licencia"
                  className={styles.fieldRequired}
                  value={form.licencia}
                  onChange={(e) => patch("licencia", e.target.value)}
                />
              </FormRow>

              <FormRow label="Const.Inscrip." htmlFor="drv-inscrip">
                <input
                  id="drv-inscrip"
                  className={styles.field}
                  value={form.constInscrip}
                  onChange={(e) => patch("constInscrip", e.target.value)}
                />
              </FormRow>

              <FormRow label="Dirección" htmlFor="drv-direccion">
                <input
                  id="drv-direccion"
                  className={styles.field}
                  value={form.direccion}
                  onChange={(e) => patch("direccion", e.target.value)}
                />
              </FormRow>

              <FormRow label="Teléfono" htmlFor="drv-telefono">
                <input
                  id="drv-telefono"
                  className={styles.field}
                  value={form.telefono}
                  onChange={(e) => patch("telefono", e.target.value)}
                />
              </FormRow>

              <FormRow label="Transportista" htmlFor="drv-transportista">
                <WinSelect
                  id="drv-transportista"
                  className={styles.select}
                  value={carrierName}
                  options={transportistaOptions}
                  onChange={() => {}}
                  aria-label="Transportista"
                  disabled
                />
              </FormRow>
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
