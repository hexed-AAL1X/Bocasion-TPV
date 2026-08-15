export type OtherFunctionActionId =
  | "open-sale-type"
  | "open-sales-day"
  | "open-cash-count"
  | "open-cash-opening"
  | "open-payment-edit";

export type OtherFunctionItem = {
  id: string;
  label: string;
  /** Archivo en public/images/iconos/ */
  iconFile: string;
  action?: OtherFunctionActionId;
};

/** Menú «Otras funciones» del TPV (referencia Smart Proactive / NavaSoft). */
export const OTHER_FUNCTIONS: OtherFunctionItem[] = [
  { id: "apertura-caja", label: "Apertura de caja", iconFile: "mostrador-shell32-281.png", action: "open-cash-opening" },
  { id: "conteo-efectivo", label: "Conteo de efectivo", iconFile: "menu-shell32-137.png", action: "open-cash-count" },
  { id: "editar-pago", label: "Editar forma de pago", iconFile: "clientes-shell32-289.png", action: "open-payment-edit" },
  {
    id: "cambiar-tipo-vta",
    label: "Cambiar tipo de venta",
    iconFile: "menu-shell32-166.png",
    action: "open-sale-type",
  },
  { id: "regularizar-docs", label: "Regularizar docs. vta.", iconFile: "activo-nota-vta.png" },
  { id: "egresos-caja", label: "Egresos de caja POS", iconFile: "activo-notas-salida.png" },
  { id: "anticipo-cliente", label: "Anticipo de cliente", iconFile: "clientes-imageres-145.png" },
  { id: "cobranza-creditos", label: "Cobranza créditos", iconFile: "activo-cobranzas.png" },
  { id: "reposicion-stock", label: "Reposición de stock", iconFile: "activo-productos.png" },
  { id: "operaciones-diversas", label: "Operaciones diversas", iconFile: "menu-shell32-46.png" },
  { id: "aparcar-ticket", label: "Aparcar ticket", iconFile: "activo-inbox.png" },
  { id: "recuperar-ticket", label: "Recuperar ticket", iconFile: "inbox-shell32-272.png" },
];

import { imageUrl } from "../utils/assetUrl";

export function otherFunctionIconSrc(iconFile: string): string {
  return imageUrl(`iconos/${iconFile}`);
}
