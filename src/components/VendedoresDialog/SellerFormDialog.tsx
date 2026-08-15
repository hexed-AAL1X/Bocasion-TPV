import { useMemo, useRef, useState, type ReactNode } from "react";
import { sellerCategoryNames, type SellerCategoryRecord } from "../../data/sellerCategories";
import {
  SELLER_AFFILIATION_GROUPS,
  SELLER_TIENDAS,
  SELLER_UBICACIONES,
  type SellerAffiliationGroup,
} from "../../data/sellers";
import type { SellerFormValues } from "../../utils/sellerFormUtils";
import { useAppDialogClose } from "../AppDialog/useAppDialogClose";
import { WinSelect } from "../WinSelect/WinSelect";
import { SellerCategoriesDialog } from "./SellerCategoriesDialog";
import styles from "./SellerFormDialog.module.css";

type Props = {
  mode: "add" | "edit";
  initialValues: SellerFormValues;
  categories: SellerCategoryRecord[];
  onCategoriesChange: (categories: SellerCategoryRecord[]) => void;
  onSave: (values: SellerFormValues) => void;
  onClose: () => void;
};

function CategoryGridIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
      <rect x="1" y="1" width="14" height="4" fill="#316ac5" stroke="#1a4080" strokeWidth="0.6" />
      <rect x="1" y="5.5" width="6.5" height="4.5" fill="#fff" stroke="#7a7a7a" strokeWidth="0.6" />
      <rect x="8.5" y="5.5" width="6.5" height="4.5" fill="#fff" stroke="#7a7a7a" strokeWidth="0.6" />
      <rect x="1" y="10.5" width="6.5" height="4.5" fill="#fff" stroke="#7a7a7a" strokeWidth="0.6" />
      <rect x="8.5" y="10.5" width="6.5" height="4.5" fill="#fff" stroke="#7a7a7a" strokeWidth="0.6" />
    </svg>
  );
}

function pctValue(value: number): string {
  return value.toFixed(2);
}

function parsePct(raw: string): number {
  const normalized = raw.replace("%", "").replace(",", ".").trim();
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function SellerFormDialog({
  mode,
  initialValues,
  categories,
  onCategoriesChange,
  onSave,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { requestClose, onBackdropClick, overlayProps, panelProps } = useAppDialogClose(onClose, { panelRef });
  const [form, setForm] = useState<SellerFormValues>(() => initialValues);
  const [showCategoriesDialog, setShowCategoriesDialog] = useState(false);
  const title = mode === "edit" ? "Modificar registro" : "Agregar registro";
  const categoryNames = useMemo(() => sellerCategoryNames(categories), [categories]);

  const tiendaOptions = useMemo(
    () =>
      SELLER_TIENDAS.some((item) => item === form.tiendaAsignada)
        ? SELLER_TIENDAS.map((item) => ({ value: item, label: item }))
        : [
            ...SELLER_TIENDAS.map((item) => ({ value: item, label: item })),
            { value: form.tiendaAsignada, label: form.tiendaAsignada },
          ],
    [form.tiendaAsignada],
  );

  const categoriaOptions = useMemo(
    () =>
      categoryNames.some((item) => item === form.categoria)
        ? categoryNames.map((item) => ({ value: item, label: item }))
        : [
            ...categoryNames.map((item) => ({ value: item, label: item })),
            { value: form.categoria, label: form.categoria },
          ],
    [categoryNames, form.categoria],
  );

  const ubicacionOptions = useMemo(
    () =>
      SELLER_UBICACIONES.some((item) => item === form.ubicacion)
        ? SELLER_UBICACIONES.map((item) => ({ value: item, label: item }))
        : [
            ...SELLER_UBICACIONES.map((item) => ({ value: item, label: item })),
            { value: form.ubicacion, label: form.ubicacion },
          ],
    [form.ubicacion],
  );

  const canSave = useMemo(() => form.nombre.trim().length > 0, [form.nombre]);

  const patch = <K extends keyof SellerFormValues>(key: K, value: SellerFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCategoriesChange = (nextCategories: SellerCategoryRecord[]) => {
    onCategoriesChange(nextCategories);
    const names = sellerCategoryNames(nextCategories);
    if (names.length > 0 && !names.includes(form.categoria)) {
      patch("categoria", names[0]);
    }
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
        aria-labelledby="seller-form-title"
        aria-modal="true"
      >
        <header className={styles.titleBar}>
          <h2 id="seller-form-title" className={styles.titleText}>
            {title}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={requestClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className={styles.body}>
          <section className={styles.section}>
            <h3 className={styles.sectionHeader}>Vendedor</h3>
            <div className={styles.sectionBody}>
              <div className={styles.codigoRow}>
                <span className={styles.formLabel}>Código</span>
                <div className={styles.codigoControls}>
                  <input
                    id="sel-codigo"
                    className={styles.inputCodigo}
                    value={form.codigo}
                    onChange={(event) => patch("codigo", event.target.value)}
                    maxLength={5}
                    aria-label="Código"
                    readOnly={mode === "edit"}
                  />
                </div>
              </div>

              <FormRow label="Nombre" htmlFor="sel-nombre">
                <input
                  id="sel-nombre"
                  className={styles.fieldRequired}
                  value={form.nombre}
                  onChange={(event) => patch("nombre", event.target.value)}
                />
              </FormRow>

              <FormRow label="Telefono" htmlFor="sel-telefono">
                <input
                  id="sel-telefono"
                  className={styles.field}
                  value={form.telefono}
                  onChange={(event) => patch("telefono", event.target.value)}
                />
              </FormRow>

              <FormRow label="E-mail" htmlFor="sel-email">
                <input
                  id="sel-email"
                  className={styles.field}
                  type="email"
                  value={form.email}
                  onChange={(event) => patch("email", event.target.value)}
                />
              </FormRow>

              <div className={styles.codigoRow}>
                <span className={styles.formLabel}>Celular</span>
                <div className={styles.celularRow}>
                  <input
                    id="sel-celular"
                    className={styles.fieldShort}
                    value={form.celular}
                    onChange={(event) => patch("celular", event.target.value)}
                    aria-label="Celular"
                  />
                  <label className={styles.checkInline}>
                    <input
                      type="checkbox"
                      checked={form.objetivoVta}
                      onChange={(event) => patch("objetivoVta", event.target.checked)}
                    />
                    Pertenece al objetivo de VTA.
                  </label>
                </div>
              </div>

              <FormRow label="Cargo" htmlFor="sel-cargo">
                <input
                  id="sel-cargo"
                  className={styles.field}
                  value={form.cargo}
                  onChange={(event) => patch("cargo", event.target.value)}
                />
              </FormRow>

              <FormRow label="Msn" htmlFor="sel-msn">
                <input
                  id="sel-msn"
                  className={styles.field}
                  value={form.msn}
                  onChange={(event) => patch("msn", event.target.value)}
                />
              </FormRow>

              <FormRow label="Directo" htmlFor="sel-directo">
                <input
                  id="sel-directo"
                  className={styles.fieldShort}
                  value={form.directo}
                  onChange={(event) => patch("directo", event.target.value)}
                />
              </FormRow>

              <FormRow label="Rpc" htmlFor="sel-rpc">
                <input
                  id="sel-rpc"
                  className={styles.fieldShort}
                  value={form.rpc}
                  onChange={(event) => patch("rpc", event.target.value)}
                />
              </FormRow>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionHeader}>Tienda asignada</h3>
            <div className={styles.sectionBody}>
              <WinSelect
                id="sel-tienda"
                className={styles.select}
                value={form.tiendaAsignada}
                options={tiendaOptions}
                onChange={(value) => patch("tiendaAsignada", value)}
                aria-label="Tienda asignada"
              />
            </div>
          </section>

          <div className={styles.splitRow}>
            <section className={styles.section}>
              <h3 className={styles.sectionHeader}>% de comisión</h3>
              <div className={styles.sectionBody}>
                <div className={styles.commissionGrid}>
                  <span className={styles.formLabel}>Ventas</span>
                  <input
                    id="sel-com-ventas"
                    className={styles.fieldPct}
                    value={`${pctValue(form.comisionVentas)}%`}
                    onChange={(event) => patch("comisionVentas", parsePct(event.target.value))}
                    aria-label="Comisión ventas"
                  />
                  <span className={styles.formLabel}>Cobranza</span>
                  <input
                    id="sel-com-cobranza"
                    className={styles.fieldPct}
                    value={`${pctValue(form.comisionCobranza)}%`}
                    onChange={(event) => patch("comisionCobranza", parsePct(event.target.value))}
                    aria-label="Comisión cobranza"
                  />
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionHeader}>Estado</h3>
              <div className={styles.sectionBody}>
                <div className={styles.radioRow}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="seller-estado"
                      checked={form.activo}
                      onChange={() => patch("activo", true)}
                    />
                    Activo
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="seller-estado"
                      checked={!form.activo}
                      onChange={() => patch("activo", false)}
                    />
                    Inactivo
                  </label>
                </div>
              </div>
            </section>
          </div>

          <section className={styles.section}>
            <h3 className={styles.sectionHeader}>
              Categoria vendedor
              <span className={styles.sectionHeaderSpacer} aria-hidden="true" />
              <button
                type="button"
                className={styles.categoryCommissionBtn}
                title="Tabla de Categoría de Vendedores"
                onClick={() => setShowCategoriesDialog(true)}
              >
                Σ Asignar % Comision - Linea
              </button>
            </h3>
            <div className={styles.sectionBody}>
              <div className={styles.categoryPicker}>
                <div className={styles.categorySelect}>
                  <WinSelect
                    id="sel-categoria"
                    className={styles.select}
                    value={form.categoria}
                    options={categoriaOptions}
                    onChange={(value) => patch("categoria", value)}
                    aria-label="Categoría vendedor"
                  />
                </div>
                <button
                  type="button"
                  className={styles.categoryGridBtn}
                  title="Tabla de Categoría de Vendedores"
                  aria-label="Tabla de Categoría de Vendedores"
                  onClick={() => setShowCategoriesDialog(true)}
                >
                  <CategoryGridIcon />
                </button>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionHeader}>Pertenece al grupo</h3>
            <div className={styles.sectionBody}>
              <div className={styles.affiliationList}>
                {SELLER_AFFILIATION_GROUPS.map((group) => (
                  <div key={group} className={styles.affiliationItem}>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="seller-affiliation"
                        checked={form.affiliation === group}
                        onChange={() => patch("affiliation", group as SellerAffiliationGroup)}
                      />
                      {group}
                    </label>
                    {group === "Ventas" && form.affiliation === "Ventas" ? (
                      <div className={styles.affiliationExtras}>
                        <span className={styles.formLabel}>Ubicación</span>
                        <WinSelect
                          id="sel-ubicacion"
                          compact
                          className={`${styles.select} ${styles.ubicacionSelect}`}
                          value={form.ubicacion}
                          options={ubicacionOptions}
                          onChange={(value) => patch("ubicacion", value)}
                          aria-label="Ubicación"
                        />
                        <label className={styles.checkInline}>
                          <input
                            type="checkbox"
                            checked={form.crmRepresentante}
                            onChange={(event) => patch("crmRepresentante", event.target.checked)}
                          />
                          CRM representante
                        </label>
                      </div>
                    ) : null}
                  </div>
                ))}
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

      {showCategoriesDialog ? (
        <SellerCategoriesDialog
          categories={categories}
          onCategoriesChange={handleCategoriesChange}
          onClose={() => setShowCategoriesDialog(false)}
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
