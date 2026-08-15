import { useMemo, useState, type ReactNode, useRef } from "react";
import type { EmissionPointRecord } from "../../data/emissionPoints";
import { FE_FORMATO_OPTIONS } from "../../data/pcPointAssignments";
import { WAREHOUSES } from "../../data/warehouses";
import { formatCodeLabel } from "../../data/warehouseCatalog";
import type { PcPointAssignmentFormValues } from "../../utils/emissionPointFormUtils";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { WinSelect } from "../WinSelect/WinSelect";
import formStyles from "./EmissionPointFormDialog.module.css";

type Props = {
  mode: "add" | "edit";
  initialValues: PcPointAssignmentFormValues;
  emissionPoints: EmissionPointRecord[];
  onSave: (values: PcPointAssignmentFormValues) => void;
  onClose: () => void;
};

export function PcPointAssignmentFormDialog({
  mode,
  initialValues,
  emissionPoints,
  onSave,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, { panelRef });
  const [form, setForm] = useState<PcPointAssignmentFormValues>(() => initialValues);
  const title = mode === "edit" ? "Modificar registro" : "Agregar registro";

  const puntoOptions = useMemo(
    () =>
      emissionPoints.map((point) => ({
        value: point.id,
        label: `${point.codigo} - ${point.nombre}`,
      })),
    [emissionPoints],
  );

  const almacenOptions = useMemo(
    () =>
      WAREHOUSES.filter((wh) => wh.activo).map((wh) => ({
        value: formatCodeLabel(wh.codigo, wh.almacen),
        label: formatCodeLabel(wh.codigo, wh.almacen),
      })),
    [],
  );

  const canSave = useMemo(
    () => form.nombrePc.trim().length > 0 && form.codigo.trim().length > 0 && form.puntoEmisionId.length > 0,
    [form.codigo, form.nombrePc, form.puntoEmisionId],
  );

  const patch = <K extends keyof PcPointAssignmentFormValues>(key: K, value: PcPointAssignmentFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave(form);
  };

  return (
    <div className={formStyles.overlay} {...overlayProps} onClick={onBackdropClick} role="presentation">
      <div
        ref={panelRef}
        className={formStyles.dialog}
        {...panelProps}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="pc-assignment-form-title"
        aria-modal="true"
      >
        <header className={formStyles.titleBar}>
          <h2 id="pc-assignment-form-title" className={formStyles.titleText}>
            {title}
          </h2>
          <button type="button" className={formStyles.closeBtn} onClick={requestClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className={formStyles.body}>
          <section className={formStyles.section}>
            <div className={formStyles.sectionBody}>
              <FormRow label="Código" htmlFor="pc-codigo">
                <input
                  id="pc-codigo"
                  className={formStyles.inputCodigo}
                  value={form.codigo}
                  onChange={(event) => patch("codigo", event.target.value)}
                  maxLength={4}
                />
              </FormRow>

              <FormRow label="Equipo PC" htmlFor="pc-nombre">
                <input
                  id="pc-nombre"
                  className={formStyles.field}
                  value={form.nombrePc}
                  onChange={(event) => patch("nombrePc", event.target.value)}
                />
              </FormRow>

              <FormRow label="Punto emisión doc" htmlFor="pc-punto">
                <WinSelect
                  id="pc-punto"
                  className={formStyles.select}
                  value={form.puntoEmisionId}
                  options={puntoOptions}
                  onChange={(value) => patch("puntoEmisionId", value)}
                  aria-label="Punto emisión documento"
                />
              </FormRow>

              <FormRow label="Almacén predeterminado" htmlFor="pc-almacen">
                <WinSelect
                  id="pc-almacen"
                  className={formStyles.select}
                  value={form.almacenPredeterminado}
                  options={almacenOptions}
                  onChange={(value) => patch("almacenPredeterminado", value)}
                  aria-label="Almacén predeterminado"
                />
              </FormRow>

              <FormRow label="Formato impresión" htmlFor="pc-formato">
                <WinSelect
                  id="pc-formato"
                  className={formStyles.select}
                  value={form.formatoImpresion}
                  options={FE_FORMATO_OPTIONS}
                  onChange={(value) => patch("formatoImpresion", value)}
                  aria-label="Formato impresión"
                />
              </FormRow>

              <FormRow label="N° copias" htmlFor="pc-copias">
                <input
                  id="pc-copias"
                  className={formStyles.fieldShort}
                  type="number"
                  min={1}
                  max={9}
                  value={form.numCopias}
                  onChange={(event) => patch("numCopias", Number(event.target.value) || 1)}
                />
              </FormRow>
            </div>
          </section>
        </div>

        <footer className={formStyles.footer}>
          <button type="button" className={formStyles.footerBtn} onClick={requestClose}>
            Cancelar
          </button>
          <button type="button" className={formStyles.footerBtnPrimary} onClick={handleSave} disabled={!canSave}>
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
    <div className={formStyles.formRow}>
      <label className={formStyles.formLabel} htmlFor={htmlFor}>
        {label}
      </label>
      <div className={formStyles.formControl}>{children}</div>
    </div>
  );
}
