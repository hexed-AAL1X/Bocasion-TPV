import { memo } from "react";
import { APP_LOGO_SRC, APP_NAME, APP_WEBSITE, APP_WEBSITE_URL, COMPANY_NAME } from "../../config/brand";
import { openExternalUrl } from "../../utils/openExternal";
import { adminActions } from "../../data/adminActions";
import styles from "./AdminPanel.module.css";

type Props = {
  onToggleRucDni: () => void;
  rucDniActive: boolean;
  onDelete: () => void;
  onFactura: () => void;
  onQuantity: () => void;
  onDscto: () => void;
  onProductCatalog: () => void;
  catalogActive?: boolean;
  saleTypeActive?: boolean;
  saleTypeLabel?: string;
  onChangeSeller: () => void;
  onSaleType: () => void;
  onSalesDay: () => void;
  onSalesDayHover?: () => void;
  onCierre: () => void;
  onBolsa: () => void;
  onNota: () => void;
  onOtrasFunc: () => void;
  otherFunctionsActive?: boolean;
  rucDniLoading?: boolean;
  hasProducts?: boolean;
};

export const AdminPanel = memo(function AdminPanel({
  onToggleRucDni,
  rucDniActive,
  onDelete,
  onFactura,
  onQuantity,
  onDscto,
  onProductCatalog,
  catalogActive,
  saleTypeActive,
  saleTypeLabel,
  onChangeSeller,
  onSaleType,
  onSalesDay,
  onSalesDayHover,
  onCierre,
  onBolsa,
  onNota,
  onOtrasFunc,
  otherFunctionsActive,
  rucDniLoading,
  hasProducts,
}: Props) {
  const getHandler = (id: string) => {
    if (id === "ruc") return onToggleRucDni;
    if (id === "delete") return onDelete;
    if (id === "doc") return onFactura;
    if (id === "qty") return onQuantity;
    if (id === "dscto") return onDscto;
    if (id === "lineas") return onProductCatalog;
    if (id === "vendedor") return onChangeSeller;
    if (id === "tipo-vta") return onSaleType;
    if (id === "ventas-dia") return onSalesDay;
    if (id === "cierre") return onCierre;
    if (id === "bolsa") return onBolsa;
    if (id === "nota") return onNota;
    if (id === "otras") return onOtrasFunc;
    return undefined;
  };

  return (
    <aside className={styles.panel} aria-label="Administración de caja">
      <div className={styles.brand}>
        <img src={APP_LOGO_SRC} alt="Bocasión" className={styles.logoImg} width={48} height={48} decoding="async" />
        <div className={styles.brandText}>
          <span className={styles.brandName}>{APP_NAME}</span>
          <span className={styles.brandCompany}>{COMPANY_NAME}</span>
          <a
            href={APP_WEBSITE_URL}
            className={styles.brandWeb}
            title="Abrir en el navegador"
            onClick={(e) => {
              e.preventDefault();
              void openExternalUrl(APP_WEBSITE_URL);
            }}
          >
            {APP_WEBSITE}
          </a>
        </div>
      </div>
      <h2 className={styles.title}>Administración</h2>

      <div className={styles.grid}>
        {adminActions.map((action) => {
          const isRuc = action.id === "ruc";
          const isDoc = action.id === "doc";
          const isLineas = action.id === "lineas";
          const isTipoVta = action.id === "tipo-vta";
          const isOtras = action.id === "otras";
          const disabled = (isRuc && rucDniLoading) || (isDoc && !hasProducts);
          const tipoVtaLabel = isTipoVta && saleTypeActive && saleTypeLabel
            ? saleTypeLabel
            : action.label;

          return (
            <button
              key={action.id}
              type="button"
              disabled={disabled}
              className={[
                styles.btn,
                action.variant === "primary" ? styles.btnPrimary : "",
                action.variant === "danger" ? styles.btnDanger : "",
                isRuc && rucDniActive ? styles.btnRucActive : "",
                isRuc && rucDniLoading ? styles.btnRucLoading : "",
                isLineas && catalogActive ? styles.btnLineasActive : "",
                isTipoVta && saleTypeActive ? styles.btnTipoVtaActive : "",
                isOtras && otherFunctionsActive ? styles.btnOtrasActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={getHandler(action.id)}
              onPointerEnter={action.id === "ventas-dia" ? onSalesDayHover : undefined}
              title={isTipoVta && saleTypeActive ? `Tipo activo: ${saleTypeLabel}` : undefined}
            >
              <span className={styles.btnIcon}>
                <img src={action.iconSrc} alt="" draggable={false} />
              </span>
              {isRuc && rucDniLoading ? "Consultando…" : tipoVtaLabel}
            </button>
          );
        })}
      </div>
    </aside>
  );
});
