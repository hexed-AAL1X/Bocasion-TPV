import { imageUrl } from "../utils/assetUrl";
import type { AlmacenLargeAction } from "./almacenRibbon";

const ribbonIcon = (id: string) => imageUrl(`ribbon/${id}.png`);
const icon = (file: string) => imageUrl(`iconos/${file}`);

export const logisticaProveedores: AlmacenLargeAction = {
  id: "proveedores",
  label: "Proveedores",
  image: icon("clientes-imageres-145.png"),
};

export const logisticaOrdenCompra: AlmacenLargeAction = {
  id: "orden-compra",
  label: "Orden compra",
  image: ribbonIcon("orden-compra"),
};

export const logisticaFacturas: AlmacenLargeAction[] = [
  { id: "factura-mercaderia", label: "Factura mercadería", image: ribbonIcon("factura"), badge: "FC" },
  { id: "factura-flete", label: "Factura flete", image: ribbonIcon("factura"), badge: "FL" },
];
