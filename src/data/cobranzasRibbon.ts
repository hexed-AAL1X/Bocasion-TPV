import { imageUrl } from "../utils/assetUrl";
import type { AlmacenLargeAction, AlmacenMenuAction } from "./almacenRibbon";

const ribbonIcon = (id: string) => imageUrl(`ribbon/${id}.png`);
const icon = (file: string) => imageUrl(`iconos/${file}`);

export const cobranzasMonedero: AlmacenLargeAction = {
  id: "monedero",
  label: "Monedero",
  image: icon("cobranzas-vistabusiness-650600.png"),
  badge: "B",
};

export const cobranzasCajaIngresosLarge: AlmacenLargeAction = {
  id: "cobranzas",
  label: "Cobranzas",
  image: ribbonIcon("cobranzas"),
};

export const cobranzasCajaIngresosMenu: AlmacenMenuAction[] = [
  { id: "amortizacion", label: "Amortización de documentos", image: icon("activo-notas-ingreso.png") },
  { id: "liquidacion-contado", label: "Liquidación venta contado", image: icon("clientes-imageres-130.png") },
  { id: "ingresos-diversos", label: "Ingresos diversos", image: icon("activo-cobranzas.png") },
];

export const cobranzasArqueo: AlmacenLargeAction[] = [
  { id: "consulta-cobranzas", label: "Consulta cobranzas", image: icon("menu-shell32-161.png") },
  { id: "arqueo-caja", label: "Arqueo de caja", image: icon("menu-shell32-137.png") },
];

export const cobranzasConsumo: AlmacenLargeAction = {
  id: "menu-lonchera",
  label: "Menu/Lonchera",
  image: icon("activo-menu.png"),
};
