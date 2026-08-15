import { useMemo, useRef, useState } from "react";
import { formatEntityCategoryCodigo } from "../../data/entityCategories";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import styles from "./CategoriaEntidadFormDialog.module.css";

type Props = {
  mode: "add" | "edit";
  codigo: string;
  initialNombre: string;
  onSave: (nombre: string) => void;
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

export function CategoriaEntidadFormDialog({ mode, codigo, initialNombre, onSave, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, { panelRef });
  const [nombre, setNombre] = useState(initialNombre);
  const title = mode === "edit" ? "Modificar registro" : "Agregar registro";
  const canSave = nombre.trim().length > 0;
  const codigoLabel = useMemo(() => formatEntityCategoryCodigo(codigo, mode), [codigo, mode]);

  const handleSave = () => {
    if (!canSave) return;
    onSave(nombre.trim().toUpperCase());
  };

  return (
    <div className={styles.overlay} {...overlayProps} onClick={onBackdropClick} role="presentation">
      <div
        ref={panelRef}
        className={styles.dialog}
        {...panelProps}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="categoria-entidad-form-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h2 id="categoria-entidad-form-title" className={styles.titleText}>
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
                <label className={styles.formLabel} htmlFor="cat-ent-codigo">
                  Código :
                </label>
                <div className={styles.formControl}>
                  <input
                    id="cat-ent-codigo"
                    className={styles.inputCodigo}
                    value={codigoLabel}
                    readOnly
                    aria-label="Código"
                  />
                </div>
              </div>
              <div className={styles.formRow}>
                <label className={styles.formLabel} htmlFor="cat-ent-nombre">
                  Descripción :
                </label>
                <div className={styles.formControl}>
                  <input
                    id="cat-ent-nombre"
                    className={styles.fieldRequired}
                    value={nombre}
                    onChange={(event) => setNombre(event.target.value)}
                    autoFocus
                  />
                </div>
              </div>
            </section>
          </div>

          <aside className={styles.sideActions}>
            <button type="button" className={styles.sideBtnPrimary} onClick={handleSave} disabled={!canSave}>
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
