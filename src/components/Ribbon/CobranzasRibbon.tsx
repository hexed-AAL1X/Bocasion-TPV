import {
  cobranzasArqueo,
  cobranzasCajaIngresosLarge,
  cobranzasCajaIngresosMenu,
  cobranzasConsumo,
  cobranzasMonedero,
} from "../../data/cobranzasRibbon";
import { ActionGroup, LargeAction, MenuAction } from "./RibbonActions";
import { RibbonToolbar } from "./RibbonToolbar";
import styles from "./Ribbon.module.css";

export function CobranzasRibbon() {
  return (
    <RibbonToolbar>
      <ActionGroup label="Monedero">
        <LargeAction action={cobranzasMonedero} />
      </ActionGroup>

      <ActionGroup label="Caja ingresos" mixed>
        <LargeAction action={cobranzasCajaIngresosLarge} />
        <div className={styles.almMenuStack}>
          {cobranzasCajaIngresosMenu.map((action) => (
            <MenuAction key={action.id} action={action} />
          ))}
        </div>
      </ActionGroup>

      <ActionGroup label="Arqueo de caja">
        {cobranzasArqueo.map((action) => (
          <LargeAction key={action.id} action={action} />
        ))}
      </ActionGroup>

      <ActionGroup label="Consumo">
        <LargeAction action={cobranzasConsumo} />
      </ActionGroup>
    </RibbonToolbar>
  );
}
