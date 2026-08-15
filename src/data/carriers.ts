export type CarrierRecord = {
  id: string;
  codigo: string;
  razonSocial: string;
  ruc: string;
  dni: string;
  direccion: string;
  telefono: string;
  contacto: string;
  email: string;
  ubicacionCodigo: string;
  ubicacionNombre: string;
  activo: boolean;
  tipoTransporte: "publico" | "privado";
  entidadEmisora: string;
  numAutorizacion: string;
  numRegistroMtc: string;
  vehiculos: number;
  choferes: number;
};

export const ENTIDAD_EMISORA_OPTIONS = [
  "",
  "MTC",
  "SUNAT",
  "GORE LIMA",
] as const;

/** Datos de referencia ERP — ventana Transportistas. */
export const CARRIERS: CarrierRecord[] = [
  {
    id: "T0000",
    codigo: "T0000",
    razonSocial: "CLIENTE RECOJE",
    ruc: "",
    dni: "",
    direccion: "",
    telefono: "",
    contacto: "",
    email: "",
    ubicacionCodigo: "",
    ubicacionNombre: "",
    activo: true,
    tipoTransporte: "publico",
    entidadEmisora: "",
    numAutorizacion: "",
    numRegistroMtc: "",
    vehiculos: 0,
    choferes: 0,
  },
  {
    id: "T0001",
    codigo: "T0001",
    razonSocial: "BOCASION SAC",
    ruc: "20610531491",
    dni: "",
    direccion: "AV. INTIHUATANA NRO. 459 URB. TAMBO MONTERRICO",
    telefono: "",
    contacto: "",
    email: "",
    ubicacionCodigo: "01150140",
    ubicacionNombre: "PERU-LIMA-LIMA-SANTIAGO DE SURCO",
    activo: true,
    tipoTransporte: "publico",
    entidadEmisora: "",
    numAutorizacion: "",
    numRegistroMtc: "",
    vehiculos: 4,
    choferes: 4,
  },
];

export function activeCarriers(rows: CarrierRecord[] = CARRIERS): CarrierRecord[] {
  return rows.filter((c) => c.activo);
}
