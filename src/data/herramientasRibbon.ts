import { imageUrl } from "../utils/assetUrl";
import type { AlmacenLargeAction } from "./almacenRibbon";

const icon = (file: string) => imageUrl(`iconos/${file}`);

export const herramientasOperaciones: AlmacenLargeAction[] = [
  { id: "supervisar-almacen", label: "Supervisar\nalmacén", image: icon("menu-shell32-161.png") },
  { id: "ajuste-correlativos", label: "Ajuste\ncorrelativos", image: icon("documentos-imageres-102-G.png") },
];

export const herramientasInterfase: AlmacenLargeAction[] = [
  { id: "interfase-ventas", label: "Interfase ventas", image: icon("productos-shell32-259.png") },
  {
    id: "sincronizar-colegio",
    label: "Sincronizar Colegio - Oficina",
    image: icon("productos-shell32-259.png"),
    wide: true,
  },
];

export const herramientasAplicacion: AlmacenLargeAction[] = [
  { id: "aplicacion-comandas", label: "Aplicacion\nde comandas", image: icon("menu-shell32-138.png") },
];

export const herramientasMenuChevrons: Record<string, boolean> = {
  "interfase-ventas": true,
};
