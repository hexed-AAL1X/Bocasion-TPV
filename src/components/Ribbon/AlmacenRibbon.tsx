import {
  almacenArticulos,
  almacenDocs,
  almacenInventarioMenu,
  almacenKardex,
  almacenStockConsolidado,
} from "../../data/almacenRibbon";
import { openPadronItemsTab } from "../../services/workspaceTabs";
import { ActionGroup, LargeAction, MenuAction } from "./RibbonActions";
import { RibbonToolbar } from "./RibbonToolbar";
import styles from "./Ribbon.module.css";

export function AlmacenRibbon() {
  return (
    <RibbonToolbar>
      <ActionGroup label="Artículos">
        {almacenArticulos.map((action) => (
          <LargeAction
            key={action.id}
            action={action}
            onClick={action.id === "productos" ? () => openPadronItemsTab() : undefined}
          />
        ))}
      </ActionGroup>

      <ActionGroup label="Docs. almacén">
        {almacenDocs.map((action) => (
          <LargeAction key={action.id} action={action} />
        ))}
      </ActionGroup>

      <ActionGroup label="Kardex">
        {almacenKardex.map((action) => (
          <LargeAction key={action.id} action={action} />
        ))}
      </ActionGroup>

      <ActionGroup label="Toma de Inventarios" mixed>
        <div className={styles.almMenuStack}>
          {almacenInventarioMenu.map((action) => (
            <MenuAction key={action.id} action={action} />
          ))}
        </div>
        <LargeAction action={almacenStockConsolidado} />
      </ActionGroup>
    </RibbonToolbar>
  );
}
