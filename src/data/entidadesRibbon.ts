import { imageUrl } from "../utils/assetUrl";
export type EntidadesRowAction = {
  id: string;
  label: string;
  image: string;
};

export type EntidadesLargeAction = {
  id: string;
  label: string;
  image: string;
  sublabel?: string;
};

const icon = (file: string) => imageUrl(`iconos/${file}`);

export const entidadesTipoCambio: EntidadesLargeAction = {
  id: "tipo-cambio",
  label: "T/C. Dolar",
  image: icon("cobranzas-vistabusiness-650600.png"),
};

/** Tres columnas × tres filas, como en el ERP de referencia. */
export const entidadesGestionColumns: EntidadesRowAction[][] = [
  [
    { id: "apertura-almacen", label: "Apertura de almacén", image: icon("activo-notas-ingreso.png") },
    { id: "transportistas", label: "Transportistas", image: icon("activo-remision.png") },
    { id: "vendedores", label: "Vendedores", image: icon("clientes-shell32-192.png") },
  ],
  [
    { id: "documentos", label: "Documentos", image: icon("documentos-imageres-102-G.png") },
    { id: "puntos-venta", label: "Puntos de venta", image: icon("mostrador-shell32-275.png") },
    { id: "correlativo-docs", label: "Correlativo docs.", image: icon("menu-shell32-151.png") },
  ],
  [
    { id: "condiciones-venta", label: "Condiciones venta", image: icon("menu-shell32-138.png") },
    { id: "categorias-cliente", label: "Categorías cliente", image: icon("activo-clientes.png") },
    { id: "tarjetas-pago", label: "Tarjetas de pago", image: icon("cobranzas-vistabusiness-650600.png") },
  ],
];

export const entidadesGestionHub: EntidadesLargeAction = {
  id: "entidades-gestion",
  label: "Entidades gestión...",
  image: icon("clientes-shell32-16715.png"),
};
