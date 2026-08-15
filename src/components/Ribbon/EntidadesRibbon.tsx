import {
  entidadesGestionColumns,
  entidadesGestionHub,
  entidadesTipoCambio,
  type EntidadesLargeAction,
  type EntidadesRowAction,
} from "../../data/entidadesRibbon";
import { ENTIDADES_ACTION_TO_DIALOG, openAppDialog } from "../../services/appDialogs";
import { RibbonToolbar } from "./RibbonToolbar";
import styles from "./Ribbon.module.css";

function LargeAction({ action }: { action: EntidadesLargeAction }) {
  return (
    <button type="button" className={styles.entLargeAction} title={action.label}>
      <span className={styles.entLargeIcon} aria-hidden>
        <img src={action.image} alt="" width={36} height={36} draggable={false} />
      </span>
      <span className={styles.entLargeLabels}>
        <span>{action.label}</span>
        {action.sublabel ? <span className={styles.entLargeSub}>{action.sublabel}</span> : null}
      </span>
    </button>
  );
}

function RowAction({
  action,
  onAction,
}: {
  action: EntidadesRowAction;
  onAction?: (actionId: string) => void;
}) {
  return (
    <button
      type="button"
      className={styles.entRowAction}
      title={action.label}
      onClick={() => {
        const dialogId = ENTIDADES_ACTION_TO_DIALOG[action.id];
        if (dialogId) openAppDialog(dialogId);
        else onAction?.(action.id);
      }}
    >
      <img src={action.image} alt="" className={styles.entRowIcon} width={16} height={16} draggable={false} />
      <span className={styles.entRowLabel}>{action.label}</span>
    </button>
  );
}

export function EntidadesRibbon({ onAction }: { onAction?: (actionId: string) => void }) {
  return (
    <RibbonToolbar entidades>
      <div className={styles.entGroup}>
        <div className={styles.entGroupBody}>
          <LargeAction action={entidadesTipoCambio} />
        </div>
        <span className={styles.groupLabel}>Tipo cambio</span>
      </div>

      <div className={[styles.entGroup, styles.entGestionGroup].join(" ")}>
        <div className={styles.entGestionBody}>
          <div className={styles.entGestionColumns}>
            {entidadesGestionColumns.map((column, colIdx) => (
              <div key={colIdx} className={styles.entGestionColumn}>
                {column.map((action) => (
                  <RowAction key={action.id} action={action} onAction={onAction} />
                ))}
              </div>
            ))}
          </div>
          <LargeAction action={entidadesGestionHub} />
        </div>
        <span className={styles.groupLabel}>Entidades de gestión</span>
      </div>
    </RibbonToolbar>
  );
}
