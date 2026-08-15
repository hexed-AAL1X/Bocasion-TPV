import { useMemo, useRef, useState } from "react";
import { formatCategoryCodigo } from "../../data/sellerCategories";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import styles from "./SellerCategoryFormDialog.module.css";

type Props = {
  mode: "add" | "edit";
  codigo: number;
  initialNombre: string;
  onSave: (nombre: string) => void;
  onClose: () => void;
};

export function SellerCategoryFormDialog({ mode, codigo, initialNombre, onSave, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, { panelRef });
  const [nombre, setNombre] = useState(initialNombre);
  const title = mode === "edit" ? "Modificar registro" : "Agregar registro";
  const canSave = nombre.trim().length > 0;
  const codigoLabel = useMemo(() => formatCategoryCodigo(codigo, mode), [codigo, mode]);

  const handleSave = () => {
    if (!canSave) return;
    onSave(nombre.trim());
  };

  return (
    <div className={styles.overlay} {...overlayProps} onClick={onBackdropClick} role="presentation">
      <div
        ref={panelRef}
        className={styles.dialog}
        {...panelProps}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="seller-category-form-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h2 id="seller-category-form-title" className={styles.titleText}>
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
                <label className={styles.formLabel} htmlFor="scat-codigo">
                  Código
                </label>
                <div className={styles.formControl}>
                  <input
                    id="scat-codigo"
                    className={styles.inputCodigo}
                    value={codigoLabel}
                    readOnly
                    aria-label="Código"
                  />
                </div>
              </div>
              <div className={styles.formRow}>
                <label className={styles.formLabel} htmlFor="scat-nombre">
                  Categoria
                </label>
                <div className={styles.formControl}>
                  <input
                    id="scat-nombre"
                    className={styles.fieldRequired}
                    value={nombre}
                    onChange={(event) => setNombre(event.target.value)}
                    autoFocus
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
