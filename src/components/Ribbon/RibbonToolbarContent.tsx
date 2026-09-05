import type { RibbonTabId } from "../../data/ribbon";
import { inicioActions } from "../../data/ribbon";
import { openAppDialog } from "../../services/appDialogs";
import { openPadronItemsTab } from "../../services/workspaceTabs";
import { EntidadesRibbon } from "./EntidadesRibbon";
import { AlmacenRibbon } from "./AlmacenRibbon";
import { LogisticaRibbon } from "./LogisticaRibbon";
import { VentasRibbon } from "./VentasRibbon";
import { CobranzasRibbon } from "./CobranzasRibbon";
import { HerramientasRibbon } from "./HerramientasRibbon";
import { SoporteRibbon } from "./SoporteRibbon";
import { RibbonToolbar } from "./RibbonToolbar";
import styles from "./Ribbon.module.css";

const inicioGroups = [...new Set(inicioActions.map((action) => action.group))];

type Props = {
  tab: RibbonTabId;
  onEntidadesAction?: (actionId: string) => void;
};

export function RibbonToolbarContent({ tab, onEntidadesAction }: Props) {
  switch (tab) {
    case "entidades":
      return <EntidadesRibbon onAction={onEntidadesAction} />;
    case "almacen":
      return <AlmacenRibbon />;
    case "logistica":
      return <LogisticaRibbon />;
    case "ventas":
      return <VentasRibbon />;
    case "cobranzas":
      return <CobranzasRibbon />;
    case "herramientas":
      return <HerramientasRibbon />;
    case "soporte":
      return <SoporteRibbon />;
    case "inicio":
      return (
        <RibbonToolbar>
          {inicioGroups.map((group) => (
            <div key={group} className={styles.group}>
              <div className={styles.groupActions}>
                {inicioActions
                  .filter((action) => action.group === group)
                  .map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      className={styles.action}
                      title={action.label}
                      onClick={() => {
                        if (action.id === "boleta") openAppDialog("navaBoletas");
                        else if (action.id === "factura") openAppDialog("navaFacturas");
                        else if (action.id === "comanda") openAppDialog("comanda");
                        else if (action.id === "productos") openPadronItemsTab();
                      }}
                    >
                      <span className={styles.actionIcon} aria-hidden>
                        <img
                          src={action.image}
                          alt=""
                          className={styles.actionImg}
                          width={36}
                          height={36}
                          draggable={false}
                        />
                      </span>
                      <span className={styles.actionLabel}>
                        <span className={styles.actionLabelText}>{action.label}</span>
                      </span>
                    </button>
                  ))}
              </div>
              <span className={styles.groupLabel}>{group}</span>
            </div>
          ))}
        </RibbonToolbar>
      );
    default:
      return null;
  }
}
