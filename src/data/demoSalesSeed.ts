import { USD_RATE } from "../config/currency";
import { DEFAULT_REGISTER_ID } from "./posRegisters";

/** Vendedor demo (login DEMO). */
export const DEMO_VENDOR_USUARIO = "DEMO";

export type DemoSaleSeed = {
  id: string;
  atHour: number;
  atMinute: number;
  docType: "boleta" | "factura" | "nota";
  docNumber: number;
  clienteLabel: string;
  paymentMethod: "soles" | "dolar" | "tarjeta" | "mixto" | "credito" | "banco";
  lines: {
    id: string;
    code: string;
    description: string;
    group: string;
    qty: number;
    um: string;
    unitPrice: number;
    dscto: number;
  }[];
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
};

/** Ventas fijas de prueba — referencia anexo / arqueo / monitor del día. */
export const DEMO_SALES_STATIC: DemoSaleSeed[] = [
  {
    id: "demo-static-18143",
    atHour: 10,
    atMinute: 36,
    docType: "boleta",
    docNumber: 18143,
    clienteLabel: "Venta Contado",
    paymentMethod: "mixto",
    lines: [
      {
        id: "l-18143",
        code: "M001",
        description: "Menu Economico",
        group: "Mercaderia",
        qty: 1,
        um: "UND",
        unitPrice: 15,
        dscto: 0,
      },
    ],
    total: 15,
    receivedS: 15,
    vueltoS: 0,
    receivedUs: 0,
    vueltoUs: 0,
    forpagoLabel: "Multiz",
    nroOperacion: "",
    nroCta: "",
    anulado: 0,
    tipoVenta: "Mercaderia",
  },
  {
    id: "demo-static-18144",
    atHour: 11,
    atMinute: 12,
    docType: "boleta",
    docNumber: 18144,
    clienteLabel: "Venta Contado",
    paymentMethod: "soles",
    lines: [
      {
        id: "l-18144",
        code: "1029",
        description: "Coca Cola 500 Ml",
        group: "Gaseosas",
        qty: 2,
        um: "UND",
        unitPrice: 3.5,
        dscto: 0,
      },
    ],
    total: 7,
    receivedS: 10,
    vueltoS: 3,
    receivedUs: 0,
    vueltoUs: 0,
    forpagoLabel: "Efectivo S/.",
    nroOperacion: "",
    nroCta: "",
    anulado: 0,
    tipoVenta: "Mercaderia",
  },
  {
    id: "demo-static-18145",
    atHour: 11,
    atMinute: 48,
    docType: "boleta",
    docNumber: 18145,
    clienteLabel: "Venta Contado",
    paymentMethod: "dolar",
    lines: [
      {
        id: "l-18145",
        code: "M005",
        description: "Menu Completo Callao",
        group: "Mercaderia",
        qty: 1,
        um: "UND",
        unitPrice: 11,
        dscto: 0,
      },
    ],
    total: 11,
    receivedS: 0,
    vueltoS: 0,
    receivedUs: 3,
    vueltoUs: parseFloat((3 - 11 / USD_RATE).toFixed(2)),
    forpagoLabel: "Efectivo US$",
    nroOperacion: "",
    nroCta: "",
    anulado: 0,
    tipoVenta: "Mercaderia",
  },
  {
    id: "demo-static-18146",
    atHour: 12,
    atMinute: 5,
    docType: "boleta",
    docNumber: 18146,
    clienteLabel: "Venta Contado",
    paymentMethod: "tarjeta",
    lines: [
      {
        id: "l-18146",
        code: "P012",
        description: "Pollo a la brasa 1/4",
        group: "Platos",
        qty: 1,
        um: "UND",
        unitPrice: 18.5,
        dscto: 0,
      },
    ],
    total: 18.5,
    receivedS: 18.5,
    vueltoS: 0,
    receivedUs: 0,
    vueltoUs: 0,
    forpagoLabel: "Openpay",
    nroOperacion: "OP-88421",
    nroCta: "",
    anulado: 0,
    tipoVenta: "Mercaderia",
  },
  {
    id: "demo-static-18147",
    atHour: 12,
    atMinute: 22,
    docType: "boleta",
    docNumber: 18147,
    clienteLabel: "Venta Contado",
    paymentMethod: "tarjeta",
    lines: [
      {
        id: "l-18147",
        code: "P015",
        description: "Lomo saltado",
        group: "Platos",
        qty: 1,
        um: "UND",
        unitPrice: 22,
        dscto: 0,
      },
    ],
    total: 22,
    receivedS: 22,
    vueltoS: 0,
    receivedUs: 0,
    vueltoUs: 0,
    forpagoLabel: "Izipay",
    nroOperacion: "IZ-12093",
    nroCta: "",
    anulado: 0,
    tipoVenta: "Mercaderia",
  },
  {
    id: "demo-static-18148",
    atHour: 13,
    atMinute: 10,
    docType: "boleta",
    docNumber: 18148,
    clienteLabel: "Venta Contado",
    paymentMethod: "tarjeta",
    lines: [
      {
        id: "l-18148",
        code: "M002",
        description: "Menu Ejecutivo",
        group: "Mercaderia",
        qty: 2,
        um: "UND",
        unitPrice: 14,
        dscto: 0,
      },
    ],
    total: 28,
    receivedS: 28,
    vueltoS: 0,
    receivedUs: 0,
    vueltoUs: 0,
    forpagoLabel: "Niubiz",
    nroOperacion: "NB-55201",
    nroCta: "",
    anulado: 0,
    tipoVenta: "Mercaderia",
  },
  {
    id: "demo-static-18149",
    atHour: 14,
    atMinute: 3,
    docType: "boleta",
    docNumber: 18149,
    clienteLabel: "Venta Contado",
    paymentMethod: "tarjeta",
    lines: [
      {
        id: "l-18149",
        code: "G001",
        description: "Gaseosa 1.5L",
        group: "Gaseosas",
        qty: 3,
        um: "UND",
        unitPrice: 6.5,
        dscto: 0,
      },
    ],
    total: 19.5,
    receivedS: 19.5,
    vueltoS: 0,
    receivedUs: 0,
    vueltoUs: 0,
    forpagoLabel: "Culqui",
    nroOperacion: "CQ-77102",
    nroCta: "",
    anulado: 0,
    tipoVenta: "Mercaderia",
  },
  {
    id: "demo-static-18150",
    atHour: 15,
    atMinute: 18,
    docType: "factura",
    docNumber: 113,
    clienteLabel: "COMercial Lima SAC(RUC20100070970)",
    paymentMethod: "credito",
    lines: [
      {
        id: "l-18150",
        code: "C010",
        description: "Caja abarrotes surtida",
        group: "Mercaderia",
        qty: 1,
        um: "UND",
        unitPrice: 458.5,
        dscto: 0,
      },
    ],
    total: 458.5,
    receivedS: 0,
    vueltoS: 0,
    receivedUs: 0,
    vueltoUs: 0,
    forpagoLabel: "New Credit",
    nroOperacion: "",
    nroCta: "0000113",
    anulado: 0,
    tipoVenta: "Mercaderia",
  },
  {
    id: "demo-static-18151",
    atHour: 16,
    atMinute: 40,
    docType: "boleta",
    docNumber: 18151,
    clienteLabel: "Venta Contado",
    paymentMethod: "banco",
    lines: [
      {
        id: "l-18151",
        code: "M003",
        description: "Menu Familiar",
        group: "Mercaderia",
        qty: 1,
        um: "UND",
        unitPrice: 35,
        dscto: 0,
      },
    ],
    total: 35,
    receivedS: 35,
    vueltoS: 0,
    receivedUs: 0,
    vueltoUs: 0,
    forpagoLabel: "Banco",
    nroOperacion: "TR-99881",
    nroCta: "",
    anulado: 0,
    tipoVenta: "Mercaderia",
  },
];

export const DEMO_REGISTER_ID = DEFAULT_REGISTER_ID;

export const DEMO_SESSION_OPENED_AT = { hour: 7, minute: 11 };
