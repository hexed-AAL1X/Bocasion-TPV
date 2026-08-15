import {
  herramientasAplicacion,
  herramientasInterfase,
  herramientasMenuChevrons,
  herramientasOperaciones,
} from "../../data/herramientasRibbon";
import { ActionGroup, LargeAction } from "./RibbonActions";
import { RibbonToolbar } from "./RibbonToolbar";

export function HerramientasRibbon() {
  return (
    <RibbonToolbar>
      <ActionGroup label="Operaciones">
        {herramientasOperaciones.map((action) => (
          <LargeAction key={action.id} action={action} />
        ))}
      </ActionGroup>

      <ActionGroup label="Interfase">
        {herramientasInterfase.map((action) => (
          <LargeAction key={action.id} action={action} chevron={herramientasMenuChevrons[action.id]} />
        ))}
      </ActionGroup>

      <ActionGroup label="Aplicacion">
        {herramientasAplicacion.map((action) => (
          <LargeAction key={action.id} action={action} />
        ))}
      </ActionGroup>
    </RibbonToolbar>
  );
}
