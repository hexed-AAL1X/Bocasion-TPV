import { soporteAcciones } from "../../data/soporteRibbon";
import { ActionGroup, LargeAction } from "./RibbonActions";
import { RibbonToolbar } from "./RibbonToolbar";

export function SoporteRibbon() {
  return (
    <RibbonToolbar>
      <ActionGroup label="Soporte">
        {soporteAcciones.map((action) => (
          <LargeAction key={action.id} action={action} />
        ))}
      </ActionGroup>
    </RibbonToolbar>
  );
}
