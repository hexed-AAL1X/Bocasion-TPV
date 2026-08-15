import {
  almacenArticulos,
  almacenDocs,
  almacenInventarioMenu,
  almacenKardex,
  almacenStockConsolidado,
} from "../../data/almacenRibbon";
import { ActionGroup, LargeAction, MenuAction } from "./RibbonActions";
import { RibbonToolbar } from "./RibbonToolbar";
import styles from "./Ribbon.module.css";

export function AlmacenRibbon() {
  return (
    <RibbonToolbar>
      <ActionGroup label="Artículos">
        {almacenArticulos.map((action) => (
          <LargeAction key={action.id} action={action} />
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
