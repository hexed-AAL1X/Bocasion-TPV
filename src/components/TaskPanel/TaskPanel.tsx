import { APP_LOGO_GRAY_SRC, COMPANY_NAME } from "../../config/brand";
import styles from "./TaskPanel.module.css";

const companyDetails = [
  { label: "Región", value: "Lima" },
  { label: "Tienda", value: "Demo Tienda" },
  { label: "Punto emisión docs", value: "demo_caja" },
  { label: "Almacén predeterminado", value: "Almacén principal" },
  { label: "Fecha de transacción contable", value: "01/06/2026" },
];

type ModuleItem = {
  label: string;
  color?: "orange" | "blue" | "green";
};

const modulesCol1: ModuleItem[] = [
  { label: "Requerimientos internos" },
  { label: "Almacenes", color: "orange" },
  { label: "Logística", color: "orange" },
  { label: "Caja ingresos" },
  { label: "Ventas", color: "blue" },
  { label: "Cuentas por cobrar" },
  { label: "Cuentas por pagar" },
  { label: "Caja egresos y finanzas" },
  { label: "Caja chica" },
  { label: "Contabilidad" },
  { label: "Empleados", color: "green" },
  { label: "Obreros" },
  { label: "Activos fijos" },
  { label: "Importaciones" },
  { label: "Producción" },
];

const modulesCol2: ModuleItem[] = [
  { label: "Aniversarios de la semana", color: "orange" },
  { label: "Ventas del vendedor" },
  { label: "Llamadas y visitas" },
];

const modulesCol3: ModuleItem[] = [
  { label: "Actualizaciones desde Internet", color: "green" },
  { label: "Auditoría de transacciones", color: "orange" },
];

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const BuildingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><path d="M9 9h1" /><path d="M9 13h1" /><path d="M9 17h1" />
  </svg>
);

const WarningIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

function ModuleList({ items }: { items: ModuleItem[] }) {
  const colorClass = (c?: string) => {
    if (c === "orange") return styles.moduleIconColor;
    if (c === "blue") return styles.moduleIconBlue;
    if (c === "green") return styles.moduleIconGreen;
    return "";
  };
  return (
    <div className={styles.moduleCol}>
      {items.map((item) => (
        <button key={item.label} type="button" className={styles.moduleItem}>
          <span className={`${styles.moduleIcon} ${colorClass(item.color)}`}>
            <ArrowIcon />
          </span>
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function TaskPanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.top}>
        {/* Company info */}
        <div className={styles.company}>
          <div className={styles.companyHeader}>
            <BuildingIcon />
            Empresa
          </div>
          <div className={styles.companyName}>{COMPANY_NAME}</div>
          <div className={styles.companyLogo}>
            <img src={APP_LOGO_GRAY_SRC} alt="Bocasión" className={styles.companyLogoImg} decoding="async" />
            <div className={styles.companyDetails}>
              {companyDetails.map((d) => (
                <div key={d.label} className={styles.detailRow}>
                  <span>{d.label}</span>
                  <strong>{d.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modules col 1 */}
        <ModuleList items={modulesCol1} />

        {/* Modules col 2 */}
        <ModuleList items={modulesCol2} />

        {/* Modules col 3 */}
        <ModuleList items={modulesCol3} />
      </div>

      {/* Activities */}
      <div className={styles.activities}>
        <div className={styles.activitiesHeader}>
          <WarningIcon />
          Actividades pendientes
        </div>
        <div className={styles.activitiesEmpty}>
          No hay actividades pendientes.
        </div>
      </div>
    </div>
  );
}
