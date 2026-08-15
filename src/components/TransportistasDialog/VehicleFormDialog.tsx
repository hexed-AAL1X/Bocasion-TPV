import {useMemo, useState, type ReactNode, useRef } from "react";
import { driversForCarrier } from "../../data/drivers";
import { driverFieldsFromId, type VehicleFormValues } from "../../utils/vehicleFormUtils";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { WinSelect } from "../WinSelect/WinSelect";
import { ChoferesDialog } from "./ChoferesDialog";
import styles from "./VehicleFormDialog.module.css";

type Props = {
  mode: "add" | "edit";
  carrierCodigo: string;
  carrierName: string;
  initialValues: VehicleFormValues;
  onSave: (values: VehicleFormValues) => void;
  onClose: () => void;
};

export function VehicleFormDialog({ mode, carrierCodigo, carrierName, initialValues, onSave, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, { panelRef });
  const [form, setForm] = useState<VehicleFormValues>(() => initialValues);
  const [showChoferes, setShowChoferes] = useState(false);
  const drivers = useMemo(() => driversForCarrier(carrierCodigo), [carrierCodigo]);
  const title = mode === "edit" ? "Modificar registro" : "Nuevo registro";

  const choferOptions = useMemo(
    () => [
      { value: "", label: "" },
      ...drivers.map((driver) => ({ value: driver.id, label: driver.nombre })),
    ],
    [drivers],
  );

  const usuarioOptions = useMemo(
    () => [
      { value: "", label: "" },
      ...drivers
        .map((d) => d.usuario)
        .filter(Boolean)
        .map((usuario) => ({ value: usuario, label: usuario })),
    ],
    [drivers],
  );

  const canSave = useMemo(() => form.placa.trim().length > 0, [form.placa]);

  const patch = <K extends keyof VehicleFormValues>(key: K, value: VehicleFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleDriverChange = (choferId: string) => {
    const fields = driverFieldsFromId(choferId, drivers);
    setForm((prev) => ({ ...prev, choferId, ...fields }));
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
        aria-labelledby="vehicle-form-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h2 id="vehicle-form-title" className={styles.titleText}>
            {title}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={requestClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className={styles.body}>
          <section className={styles.section}>
            <h3 className={styles.sectionHeader}>Vehículo</h3>
            <div className={styles.sectionBody}>
              <div className={styles.placaRow}>
                <label className={styles.formLabel} htmlFor="veh-placa">
                  N° Placa
                </label>
                <input
                  id="veh-placa"
                  className={styles.field}
                  value={form.placa}
                  onChange={(e) => patch("placa", e.target.value)}
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

              <FormRow label="Marca" htmlFor="veh-marca">
                <input
                  id="veh-marca"
                  className={styles.field}
                  value={form.marca}
                  onChange={(e) => patch("marca", e.target.value)}
                />
              </FormRow>

              <FormRow label="N° Placa carreta" htmlFor="veh-carreta">
                <input
                  id="veh-carreta"
                  className={styles.field}
                  value={form.placaCarreta}
                  onChange={(e) => patch("placaCarreta", e.target.value)}
                />
              </FormRow>

              <FormRow label="N° Const. inscrip." htmlFor="veh-inscrip">
                <input
                  id="veh-inscrip"
                  className={styles.field}
                  value={form.numConstInscrip}
                  onChange={(e) => patch("numConstInscrip", e.target.value)}
                />
              </FormRow>

              <FormRow label="N° Certif. habilitac" htmlFor="veh-certif">
                <input
                  id="veh-certif"
                  className={styles.field}
                  value={form.numCertifHabilitac}
                  onChange={(e) => patch("numCertifHabilitac", e.target.value)}
                />
              </FormRow>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionHeader}>Más datos del vehículo</h3>
            <div className={styles.sectionBody}>
              <div className={styles.measuresGrid}>
                <MeasureRow label="Largo" htmlFor="veh-largo" value={form.largo} onChange={(v) => patch("largo", v)} unit="(Mt.)" />
                <MeasureRowRight label="Volumen" htmlFor="veh-volumen" value={form.volumen} onChange={(v) => patch("volumen", v)} />
                <MeasureRow label="Ancho" htmlFor="veh-ancho" value={form.ancho} onChange={(v) => patch("ancho", v)} unit="(Mt.)" />
                <MeasureRowRight label="Peso total" htmlFor="veh-peso" value={form.pesoTotal} onChange={(v) => patch("pesoTotal", v)} />
                <MeasureRow label="Alto" htmlFor="veh-alto" value={form.alto} onChange={(v) => patch("alto", v)} unit="(Mt.)" />
                <MeasureRowRight label="Carga util" htmlFor="veh-carga" value={form.cargaUtil} onChange={(v) => patch("cargaUtil", v)} />
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionHeader}>
              Chofer predeterminado:
              <span className={styles.sectionHeaderSpacer} />
              <button type="button" className={styles.choferesLink} onClick={() => setShowChoferes(true)}>
                Choferes...
              </button>
            </h3>
            <div className={styles.sectionBody}>
              <FormRow label="Nombre" htmlFor="veh-chofer">
                <WinSelect
                  id="veh-chofer"
                  className={styles.select}
                  value={form.choferId}
                  options={choferOptions}
                  onChange={handleDriverChange}
                  aria-label="Chofer predeterminado"
                />
              </FormRow>

              <div className={styles.dniRow}>
                <label className={styles.formLabel} htmlFor="veh-dni">
                  N° DNI
                </label>
                <input
                  id="veh-dni"
                  className={styles.field}
                  value={form.choferDni}
                  onChange={(e) => patch("choferDni", e.target.value)}
                />
                <label className={styles.inlineLabel} htmlFor="veh-licencia">
                  N° Licencia
                </label>
                <input
                  id="veh-licencia"
                  className={styles.field}
                  value={form.choferLicencia}
                  onChange={(e) => patch("choferLicencia", e.target.value)}
                />
              </div>

              <FormRow label="Usuario" htmlFor="veh-usuario">
                <WinSelect
                  id="veh-usuario"
                  className={styles.select}
                  value={form.usuario}
                  options={usuarioOptions}
                  onChange={(next) => patch("usuario", next)}
                  aria-label="Usuario"
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

      {showChoferes ? (
        <ChoferesDialog
          carrierCodigo={carrierCodigo}
          carrierName={carrierName}
          onClose={() => setShowChoferes(false)}
        />
      ) : null}
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

function MeasureRow({
  label,
  htmlFor,
  value,
  onChange,
  unit,
}: {
  label: string;
  htmlFor: string;
  value: string;
  onChange: (value: string) => void;
  unit: string;
}) {
  return (
    <div className={styles.measureRow}>
      <label className={styles.formLabel} htmlFor={htmlFor}>
        {label}
      </label>
      <input
        id={htmlFor}
        className={styles.numField}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
      />
      <span className={styles.unitHint}>{unit}</span>
    </div>
  );
}

function MeasureRowRight({
  label,
  htmlFor,
  value,
  onChange,
}: {
  label: string;
  htmlFor: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={styles.measureRowRight}>
      <label className={styles.formLabel} htmlFor={htmlFor}>
        {label}
      </label>
      <input
        id={htmlFor}
        className={styles.numField}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
      />
    </div>
  );
}
