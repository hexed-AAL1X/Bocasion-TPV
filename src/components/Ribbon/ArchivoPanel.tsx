import { useMemo, useRef, useState } from "react";
import {
  APP_LOGO_SRC,
  COMPANY_LOGO_SRC,
  COMPANY_NAME_REPORT,
} from "../../config/brand";
import {
  ARCHIVO_MENU,
  ARCHIVO_SESSION,
  archivoIconSrc,
  type ArchivoMenuItem,
  type ArchivoSectionId,
} from "../../data/archivoMenu";
import { ExitConfirmDialog } from "../ExitConfirmDialog/ExitConfirmDialog";
import { OpcionesView } from "./OpcionesView";
import styles from "./ArchivoPanel.module.css";

const MAIN_MENU = ARCHIVO_MENU.filter((item) => item.id !== "salir");
const SALIR_ITEM = ARCHIVO_MENU.find((item) => item.id === "salir");

type Props = {
  openWindows: string[];
  onExit: () => void;
  onOpenBatchPrint: () => void;
  onOpenPageSetup: () => void;
};

function formatFechaContable(date: Date): string {
  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function FieldChevron() {
  return (
    <svg
      className={styles.fieldChevron}
      viewBox="0 0 12 12"
      width={10}
      height={10}
      aria-hidden
    >
      <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

function InformacionView({ stagger }: { stagger?: boolean }) {
  const fechaContable = useMemo(() => formatFechaContable(new Date()), []);

  const fields = [
    {
      label: "Región",
      value: ARCHIVO_SESSION.region,
      iconFile: "activo-clientes.png",
      selectable: false,
    },
    {
      label: "Tienda",
      value: ARCHIVO_SESSION.tienda,
      iconFile: "mostrador-shell32-275.png",
      selectable: false,
    },
    {
      label: "Punto emisión de documentos",
      value: ARCHIVO_SESSION.puntoEmision,
      iconFile: "documentos-imageres-102-G.png",
      selectable: true,
    },
    {
      label: "Almacén predeterminado",
      value: ARCHIVO_SESSION.almacen,
      iconFile: "menu-shell32-161.png",
      selectable: true,
    },
    {
      label: "Fecha de transacción contable",
      value: fechaContable,
      iconFile: "mostrador-shell32-281.png",
      selectable: true,
    },
  ];

  return (
    <div
      className={[styles.informacion, stagger ? styles.informacionStagger : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <header className={styles.infoHero}>
        <img src={APP_LOGO_SRC} alt="" className={styles.infoHeroIcon} width={36} height={36} decoding="async" />
        <button type="button" className={styles.infoHeroSelector}>
          <div className={styles.infoHeroCopy}>
            <span className={styles.infoHeroEyebrow}>Empresa activa</span>
            <span className={styles.infoHeroTitle}>{COMPANY_NAME_REPORT}</span>
          </div>
          <FieldChevron />
        </button>
      </header>

      <div className={styles.infoBody}>
        <section className={styles.infoBlock}>
          <h3 className={styles.infoBlockTitle}>Datos de sesión</h3>
          <dl className={styles.fieldList}>
            {fields.map((field) => (
              <div key={field.label} className={styles.fieldRow}>
                <dt className={styles.fieldLabel}>
                  <span className={styles.fieldLabelMain}>
                    <img
                      src={archivoIconSrc(field.iconFile)}
                      alt=""
                      className={styles.fieldIcon}
                      width={24}
                      height={24}
                    />
                    <span>{field.label}</span>
                  </span>
                </dt>
                <dd>
                  {field.selectable ? (
                    <button type="button" className={styles.fieldValueBtn}>
                      <span>{field.value}</span>
                      <FieldChevron />
                    </button>
                  ) : (
                    field.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={styles.infoBlock}>
          <h3 className={styles.infoBlockTitle}>Información de cuentas</h3>
          <div className={styles.accountList}>
            <button type="button" className={styles.accountRow}>
              <span className={styles.accountRowMain}>
                <img
                  src={archivoIconSrc("clientes-imageres-130.png")}
                  alt=""
                  className={styles.fieldIcon}
                  width={24}
                  height={24}
                />
                <span className={styles.accountLabel}>{ARCHIVO_SESSION.cuentaPrincipal}</span>
              </span>
              <FieldChevron />
            </button>
          </div>
        </section>
      </div>

      <aside className={styles.infoBrand}>
        <h3 className={styles.infoBlockTitle}>Identidad visual</h3>

        <div className={styles.brandBlock}>
          <div className={styles.brandBlockHead}>
            <span className={styles.brandBlockLabel}>Logo corporativo</span>
            <span className={styles.brandBlockHint}>Comprobantes e informes</span>
          </div>
          <div className={styles.brandLogoStage}>
            <img
              src={COMPANY_LOGO_SRC}
              alt={COMPANY_NAME_REPORT}
              className={styles.brandLogoImg}
              decoding="async"
            />
          </div>
          <button type="button" className={styles.brandActionBtn}>
            Cambiar logo...
          </button>
        </div>

        <div className={styles.brandBlock}>
          <div className={styles.brandBlockHead}>
            <span className={styles.brandBlockLabel}>Icono de empresa</span>
            <span className={styles.brandBlockHint}>Cabecera y sesión activa</span>
          </div>
          <div className={styles.brandIconStage}>
            <img src={APP_LOGO_SRC} alt="" className={styles.brandIconImg} width={44} height={44} decoding="async" />
            <span className={styles.brandIconCaption}>{COMPANY_NAME_REPORT}</span>
          </div>
          <button type="button" className={styles.brandActionBtn}>
            Cambiar icono...
          </button>
        </div>
      </aside>
    </div>
  );
}

function SectionPlaceholder({ label }: { label: string }) {
  return (
    <div className={styles.placeholder}>
      <span>{label} — próximamente</span>
    </div>
  );
}

function getSectionIndex(sectionId: ArchivoSectionId): number {
  return MAIN_MENU.findIndex((item) => item.id === sectionId);
}

export function ArchivoPanel({ openWindows, onExit, onOpenBatchPrint, onOpenPageSetup }: Props) {
  const [activeSection, setActiveSection] = useState<ArchivoSectionId>("informacion");
  const [sectionDirection, setSectionDirection] = useState<1 | -1 | 0>(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const prevSectionRef = useRef<ArchivoSectionId>("informacion");
  const allowRichEnterRef = useRef(true);

  const handleSelect = (item: ArchivoMenuItem) => {
    if (item.id === "salir") {
      if (openWindows.length > 0) {
        setShowExitConfirm(true);
        return;
      }
      onExit();
      return;
    }
    if (item.id === "impresion-docs") {
      onOpenBatchPrint();
      return;
    }

    if (item.id === "configurar-pagina") {
      onOpenPageSetup();
      return;
    }

    if (item.id === activeSection) {
      return;
    }

    const prevIndex = getSectionIndex(prevSectionRef.current);
    const nextIndex = getSectionIndex(item.id);
    if (prevIndex !== -1 && nextIndex !== -1 && prevIndex !== nextIndex) {
      setSectionDirection(nextIndex > prevIndex ? 1 : -1);
    } else {
      setSectionDirection(0);
    }

    allowRichEnterRef.current = false;
    prevSectionRef.current = item.id;
    setActiveSection(item.id);
  };

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    onExit();
  };

  const activeLabel = ARCHIVO_MENU.find((item) => item.id === activeSection)?.label ?? "";

  const contentPaneClass = [
    styles.contentPane,
    sectionDirection === 1 ? styles.contentPaneFromDown : "",
    sectionDirection === -1 ? styles.contentPaneFromUp : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.panel}>
      <nav className={styles.sideNav} aria-label="Menú Archivo">
        <div className={styles.sideNavMain}>
          {MAIN_MENU.map((item) => (
            <button
              key={item.id}
              type="button"
              className={[
                styles.navItem,
                activeSection === item.id ? styles.navItemActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => handleSelect(item)}
            >
              {item.iconFile ? (
                <img
                  src={archivoIconSrc(item.iconFile)}
                  alt=""
                  className={styles.navIcon}
                  width={24}
                  height={24}
                  draggable={false}
                />
              ) : null}
              <span className={styles.navLabel}>{item.label}</span>
            </button>
          ))}
        </div>
        {SALIR_ITEM ? (
          <div className={styles.sideNavExit}>
            <button
              type="button"
              className={[styles.navItem, styles.navItemExit].join(" ")}
              onClick={() => handleSelect(SALIR_ITEM)}
            >
              {SALIR_ITEM.iconFile ? (
                <img
                  src={archivoIconSrc(SALIR_ITEM.iconFile)}
                  alt=""
                  className={styles.navIcon}
                  width={24}
                  height={24}
                  draggable={false}
                />
              ) : null}
              <span className={styles.navLabel}>{SALIR_ITEM.label}</span>
            </button>
          </div>
        ) : null}
      </nav>

      <div className={styles.content}>
        <div key={activeSection} className={contentPaneClass}>
          {activeSection === "informacion" ? (
            <InformacionView stagger={allowRichEnterRef.current} />
          ) : activeSection === "opciones" ? (
            <OpcionesView />
          ) : (
            <SectionPlaceholder label={activeLabel} />
          )}
        </div>
      </div>

      {showExitConfirm ? (
        <ExitConfirmDialog
          openWindows={openWindows}
          onConfirm={handleConfirmExit}
          onCancel={() => setShowExitConfirm(false)}
        />
      ) : null}
    </div>
  );
}
