export type DriverRecord = {
  id: string;
  carrierCodigo: string;
  codigo: string;
  nombre: string;
  dni: string;
  licencia: string;
  constInscrip: string;
  telefono: string;
  direccion: string;
  usuario: string;
  activo: boolean;
};

/** Datos de referencia ERP — choferes por transportista. */
export const DRIVERS: DriverRecord[] = [
  {
    id: "d1",
    carrierCodigo: "T0001",
    codigo: "00005",
    nombre: "KEVIN EDUARDO HERRERA SOCA",
    dni: "73899609",
    licencia: "Q73899609",
    constInscrip: "",
    telefono: "924-362-337",
    direccion: "",
    usuario: "",
    activo: true,
  },
  {
    id: "d2",
    carrierCodigo: "T0001",
    codigo: "00006",
    nombre: "RODRIGUEZ YNFANTE ELVIS JHON",
    dni: "42589763",
    licencia: "Q42589763",
    constInscrip: "",
    telefono: "",
    direccion: "",
    usuario: "",
    activo: true,
  },
  {
    id: "d4",
    carrierCodigo: "T0001",
    codigo: "00004",
    nombre: "GOMEZ ARRASCUE ALFREDO JOSE",
    dni: "45678901",
    licencia: "Q45678901",
    constInscrip: "",
    telefono: "",
    direccion: "",
    usuario: "",
    activo: true,
  },
  {
    id: "d5",
    carrierCodigo: "T0001",
    codigo: "00007",
    nombre: "HERRERA VARGAS LUIS MIGUEL",
    dni: "71234567",
    licencia: "Q71234567",
    constInscrip: "",
    telefono: "",
    direccion: "",
    usuario: "",
    activo: true,
  },
];

export function driversForCarrier(codigo: string, source: DriverRecord[] = DRIVERS): DriverRecord[] {
  return source.filter((d) => d.carrierCodigo === codigo);
}
