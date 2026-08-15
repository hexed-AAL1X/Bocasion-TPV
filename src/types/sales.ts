import type { SaleLine } from "../components/POSTerminal/POSTerminal";

export type SaleDocType = "boleta" | "factura" | "nota";
export type PaymentMethod = "soles" | "dolar" | "tarjeta" | "mixto" | "credito" | "banco";

export type PaymentConfirmPayload = {
  received: number;
  vuelto: number;
  cardProvider?: string;
  operationNumber?: string;
};

export type CompletedSale = {
  id: string;
  at: Date;
  docType: SaleDocType;
  docNumber: number;
  /** Número Nava completo (ndocu), si viene de SQL. */
  docRef?: string;
  clienteLabel: string;
  vendedor: string;
  paymentMethod: PaymentMethod;
  lines: SaleLine[];
  total: number;
  receivedS: number;
  vueltoS: number;
  receivedUs: number;
  vueltoUs: number;
  forpagoLabel: string;
  nroOperacion: string;
  nroCta: string;
  anulado: number;
  tipoVenta: string;
  registerId?: string;
};

export type DocSummary = {
  boletas: number;
  boletaFrom: number;
  boletaTo: number;
  notas: number;
  notaFrom: number;
  notaTo: number;
  facturas: number;
  facturaFrom: number;
  facturaTo: number;
  anulados: number;
  total: number;
};

export type GroupSaleRow = {
  group: string;
  total: number;
  percent: number;
};

export type ArticleSaleRow = {
  description: string;
  qty: number;
  total: number;
};
