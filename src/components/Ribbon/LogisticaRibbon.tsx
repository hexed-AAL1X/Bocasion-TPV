import {
  logisticaFacturas,
  logisticaOrdenCompra,
  logisticaProveedores,
} from "../../data/logisticaRibbon";
import { ActionGroup, LargeAction } from "./RibbonActions";
import { RibbonToolbar } from "./RibbonToolbar";

export function LogisticaRibbon() {
  return (
    <RibbonToolbar>
      <ActionGroup label="Proveedores">
        <LargeAction action={logisticaProveedores} />
      </ActionGroup>

      <ActionGroup label="Orden compra">
        <LargeAction action={logisticaOrdenCompra} />
      </ActionGroup>

      <ActionGroup label="Facturas">
        {logisticaFacturas.map((action) => (
          <LargeAction key={action.id} action={action} />
        ))}
      </ActionGroup>
    </RibbonToolbar>
  );
}
