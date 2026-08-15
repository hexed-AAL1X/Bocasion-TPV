import {useMemo, useState, type ReactNode, useRef } from "react";
import { ENTIDAD_EMISORA_OPTIONS } from "../../data/carriers";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { WinSelect } from "../WinSelect/WinSelect";
import styles from "./TransportistaFormDialog.module.css";

export type CarrierFormValues = {
  codigo: string;
  activo: boolean;
  nombre: string;
  direccion: string;
  ruc: string;
  dni: string;
  telefono: string;
  contacto: string;
  email: string;
  ubicacionCodigo: string;
  ubicacionNombre: string;
  tipoTransporte: "publico" | "privado";
  entidadEmisora: string;
  numAutorizacion: string;
  numRegistroMtc: string;
};

type Props = {
  mode: "add" | "edit";
  initialValues: CarrierFormValues;
  onSave: (values: CarrierFormValues) => void;
  onClose: () => void;
};

export function TransportistaFormDialog({ mode, initialValues, onSave, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, { panelRef });
  const [form, setForm] = useState<CarrierFormValues>(() => initialValues);
  const title = mode === "edit" ? "Modificar registro" : "Agregar registro";

  const entidadOptions = useMemo(
    () => ENTIDAD_EMISORA_OPTIONS.map((opt) => ({ value: opt, label: opt })),
    [],
  );

  const canSave = useMemo(() => form.nombre.trim().length > 0, [form.nombre]);

  const patch = <K extends keyof CarrierFormValues>(key: K, value: CarrierFormValues[K]) => {
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
        aria-labelledby="carrier-form-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h2 id="carrier-form-title" className={styles.titleText}>
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
                    id="car-codigo"
                    className={styles.inputCodigo}
                    value={form.codigo}
                    onChange={(e) => patch("codigo", e.target.value)}
                    maxLength={5}
                    aria-label="Código"
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

              <FormRow label="Nombre" htmlFor="car-nombre">
                <input
                  id="car-nombre"
                  className={styles.field}
                  value={form.nombre}
                  onChange={(e) => patch("nombre", e.target.value)}
                />
              </FormRow>

              <FormRow label="Dirección" htmlFor="car-direccion">
                <input
                  id="car-direccion"
                  className={styles.field}
                  value={form.direccion}
                  onChange={(e) => patch("direccion", e.target.value)}
                />
              </FormRow>

              <div className={styles.tripleRow}>
                <span className={styles.formLabel}>Ruc</span>
                <input
                  id="car-ruc"
                  className={styles.fieldThird}
                  value={form.ruc}
                  onChange={(e) => patch("ruc", e.target.value)}
                  aria-label="Ruc"
                />
                <span className={styles.inlineLabel}>DNI</span>
                <input
                  id="car-dni"
                  className={styles.fieldThird}
                  value={form.dni}
                  onChange={(e) => patch("dni", e.target.value)}
                  aria-label="DNI"
                />
                <span className={styles.inlineLabel}>Teléfono</span>
                <input
                  id="car-telefono"
                  className={styles.fieldThird}
                  value={form.telefono}
                  onChange={(e) => patch("telefono", e.target.value)}
                  aria-label="Teléfono"
                />
              </div>

              <FormRow label="Contacto" htmlFor="car-contacto">
                <input
                  id="car-contacto"
                  className={styles.field}
                  value={form.contacto}
                  onChange={(e) => patch("contacto", e.target.value)}
                />
              </FormRow>

              <FormRow label="E-Mail" htmlFor="car-email">
                <input
                  id="car-email"
                  className={styles.field}
                  type="email"
                  value={form.email}
                  onChange={(e) => patch("email", e.target.value)}
                />
              </FormRow>

              <div className={styles.ubicacionRow}>
                <span className={styles.formLabel}>Ubicación</span>
                <input
                  id="car-ubigeo-cod"
                  className={styles.ubigeoCod}
                  value={form.ubicacionCodigo}
                  onChange={(e) => patch("ubicacionCodigo", e.target.value)}
                  aria-label="Código ubigeo"
                />
                <input
                  id="car-ubigeo-nom"
                  className={styles.ubigeoNom}
                  value={form.ubicacionNombre}
                  onChange={(e) => patch("ubicacionNombre", e.target.value)}
                  aria-label="Nombre ubigeo"
                />
                <span className={styles.ubigeoHint}>Ubigeo</span>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionHeader}>Tipo de transporte:</h3>
            <div className={styles.sectionBody}>
              <div className={styles.radioRow}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="tipo-transporte"
                    checked={form.tipoTransporte === "publico"}
                    onChange={() => patch("tipoTransporte", "publico")}
                  />
                  Público
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="tipo-transporte"
                    checked={form.tipoTransporte === "privado"}
                    onChange={() => patch("tipoTransporte", "privado")}
                  />
                  Privado
                </label>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionHeader}>Autorización especial para el servicio de transporte:</h3>
            <div className={styles.sectionBody}>
              <FormRow label="Entidad emisora de la autorización" htmlFor="car-entidad">
                <WinSelect
                  id="car-entidad"
                  className={styles.select}
                  value={form.entidadEmisora}
                  options={entidadOptions}
                  onChange={(next) => patch("entidadEmisora", next)}
                  aria-label="Entidad emisora de la autorización"
                />
              </FormRow>

              <FormRow label="N° de autorización especial" htmlFor="car-num-auth">
                <input
                  id="car-num-auth"
                  className={styles.field}
                  value={form.numAutorizacion}
                  onChange={(e) => patch("numAutorizacion", e.target.value)}
                />
              </FormRow>

              <FormRow label="N° Registro MTC" htmlFor="car-mtc">
                <input
                  id="car-mtc"
                  className={styles.field}
                  value={form.numRegistroMtc}
                  onChange={(e) => patch("numRegistroMtc", e.target.value)}
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
