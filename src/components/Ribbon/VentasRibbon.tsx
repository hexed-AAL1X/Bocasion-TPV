import {
  ventasCatalogos,
  ventasDespacho,
  ventasDocumentos,
  ventasKiosco,
  ventasMenuChevrons,
  ventasMostrador,
  ventasNotasContables,
} from "../../data/ventasRibbon";
import { openAppDialog } from "../../services/appDialogs";
import { ActionGroup, LargeAction } from "./RibbonActions";
import { RibbonToolbar } from "./RibbonToolbar";

export function VentasRibbon() {
  return (
    <RibbonToolbar>
      <ActionGroup label="Catálogos">
        {ventasCatalogos.map((action) => (
          <LargeAction key={action.id} action={action} chevron={ventasMenuChevrons[action.id]} />
        ))}
      </ActionGroup>

      <ActionGroup label="Mostrador">
        {ventasMostrador.map((action) => (
          <LargeAction key={action.id} action={action} />
        ))}
      </ActionGroup>

      <ActionGroup label="Despacho mercadería">
        {ventasDespacho.map((action) => (
          <LargeAction key={action.id} action={action} chevron={ventasMenuChevrons[action.id]} />
        ))}
      </ActionGroup>

      <ActionGroup label="Documentos venta">
        {ventasDocumentos.map((action) => (
          <LargeAction
            key={action.id}
            action={action}
            chevron={ventasMenuChevrons[action.id]}
            onClick={
              action.id === "boleta"
                ? () => openAppDialog("navaBoletas")
                : action.id === "factura"
                  ? () => openAppDialog("navaFacturas")
                  : action.id === "comanda"
                    ? () => openAppDialog("comanda")
                    : undefined
            }
          />
        ))}
      </ActionGroup>

      <ActionGroup label="Notas contables">
        {ventasNotasContables.map((action) => (
          <LargeAction key={action.id} action={action} />
        ))}
      </ActionGroup>

      <ActionGroup label="Kiosco">
        {ventasKiosco.map((action) => (
          <LargeAction key={action.id} action={action} />
        ))}
      </ActionGroup>
    </RibbonToolbar>
  );
}
