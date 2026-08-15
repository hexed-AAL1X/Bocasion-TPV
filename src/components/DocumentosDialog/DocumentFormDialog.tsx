import { useMemo, useRef, useState } from "react";
import { formatDocumentCodigo } from "../../data/documents";
import type { DocumentFormValues } from "../../utils/documentFormUtils";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { SunatEnlaceSelect } from "./SunatEnlaceSelect";
import styles from "./DocumentFormDialog.module.css";

type Props = {
  mode: "add" | "edit";
  initialValues: DocumentFormValues;
  onSave: (values: DocumentFormValues) => void;
  onClose: () => void;
};

export function DocumentFormDialog({ mode, initialValues, onSave, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, { panelRef });
  const [form, setForm] = useState<DocumentFormValues>(() => initialValues);
  const title = mode === "edit" ? "Modificar registro" : "Agregar registro";
  const canSave = form.nombre.trim().length > 0;
  const codigoLabel = useMemo(() => formatDocumentCodigo(form.codigo, mode), [form.codigo, mode]);

  const patch = <K extends keyof DocumentFormValues>(key: K, value: DocumentFormValues[K]) => {
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
        aria-labelledby="document-form-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h2 id="document-form-title" className={styles.titleText}>
            {title}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={requestClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className={styles.body}>
          <section className={styles.section}>
            <div className={styles.sectionBody}>
              <div className={styles.formRow}>
                <label className={styles.formLabel} htmlFor="doc-codigo">
                  Código
                </label>
                <div className={styles.formControl}>
                  <input id="doc-codigo" className={styles.inputCodigo} value={codigoLabel} readOnly aria-label="Código" />
                </div>
              </div>
              <div className={styles.formRow}>
                <label className={styles.formLabel} htmlFor="doc-nombre">
                  Descripción
                </label>
                <div className={styles.formControl}>
                  <input
                    id="doc-nombre"
                    className={styles.fieldRequired}
                    value={form.nombre}
                    onChange={(event) => patch("nombre", event.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              <div className={styles.radioBlock}>
                <span className={styles.radioQuestion}>Documento se va a incluir en el Registro de Compra</span>
                <div className={styles.radioRow}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="doc-reg-compra"
                      checked={!form.registroCompra}
                      onChange={() => patch("registroCompra", false)}
                    />
                    No
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="doc-reg-compra"
                      checked={form.registroCompra}
                      onChange={() => patch("registroCompra", true)}
                    />
                    Si
                  </label>
                </div>
              </div>

              <div className={styles.radioBlock}>
                <span className={styles.radioQuestion}>Documento se visualiza en el módulo Venta Directa</span>
                <div className={styles.radioRow}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="doc-vta-directa"
                      checked={!form.ventaDirecta}
                      onChange={() => patch("ventaDirecta", false)}
                    />
                    No
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="doc-vta-directa"
                      checked={form.ventaDirecta}
                      onChange={() => patch("ventaDirecta", true)}
                    />
                    Si
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionHeader}>Código de documento contable según SUNAT</h3>
            <div className={styles.sectionBody}>
              <div className={styles.formRow}>
                <label className={styles.formLabel} htmlFor="doc-sunat">
                  Cod.enlace:
                </label>
                <div className={styles.formControl}>
                  <SunatEnlaceSelect
                    id="doc-sunat"
                    value={form.codSunat}
                    onChange={(value) => patch("codSunat", value)}
                    aria-label="Cod.enlace SUNAT"
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
