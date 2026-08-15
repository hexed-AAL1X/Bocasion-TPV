export type VehicleRecord = {
  id: string;
  carrierCodigo: string;
  placa: string;
  marca: string;
  placaCarreta: string;
  numConstInscrip: string;
  numCertifHabilitac: string;
  largo: number;
  ancho: number;
  alto: number;
  volumen: number;
  pesoTotal: number;
  cargaUtil: number;
  choferId: string;
  chofer: string;
  choferDni: string;
  choferLicencia: string;
  usuario: string;
  activo: boolean;
};

/** Datos de referencia ERP — vehículos por transportista. */
export const VEHICLES: VehicleRecord[] = [
  {
    id: "v1",
    carrierCodigo: "T0001",
    placa: "CAS-747",
    marca: "SHINERAY",
    placaCarreta: "",
    numConstInscrip: "",
    numCertifHabilitac: "",
    largo: 0,
    ancho: 0,
    alto: 0,
    volumen: 0,
    pesoTotal: 0,
    cargaUtil: 0,
    choferId: "d1",
    chofer: "KEVIN EDUARDO HERRERA SOCA",
    choferDni: "73899609",
    choferLicencia: "Q73899609",
    usuario: "",
    activo: true,
  },
  {
    id: "v2",
    carrierCodigo: "T0001",
    placa: "CFV-815",
    marca: "HYUNDAI",
    placaCarreta: "",
    numConstInscrip: "",
    numCertifHabilitac: "",
    largo: 0,
    ancho: 0,
    alto: 0,
    volumen: 0,
    pesoTotal: 0,
    cargaUtil: 0,
    choferId: "",
    chofer: "",
    choferDni: "",
    choferLicencia: "",
    usuario: "",
    activo: true,
  },
  {
    id: "v3",
    carrierCodigo: "T0001",
    placa: "CFV815",
    marca: "HUINDAY",
    placaCarreta: "",
    numConstInscrip: "",
    numCertifHabilitac: "",
    largo: 0,
    ancho: 0,
    alto: 0,
    volumen: 0,
    pesoTotal: 0,
    cargaUtil: 0,
    choferId: "d2",
    chofer: "RODRIGUEZ YNFANTE ELVIS JHON",
    choferDni: "",
    choferLicencia: "",
    usuario: "",
    activo: true,
  },
  {
    id: "v4",
    carrierCodigo: "T0001",
    placa: "D6H761",
    marca: "CHEVROLET",
    placaCarreta: "",
    numConstInscrip: "",
    numCertifHabilitac: "",
    largo: 0,
    ancho: 0,
    alto: 0,
    volumen: 0,
    pesoTotal: 0,
    cargaUtil: 0,
    choferId: "d4",
    chofer: "GOMEZ ARRASCUE ALFREDO JOSE",
    choferDni: "",
    choferLicencia: "",
    usuario: "",
    activo: true,
  },
];

export function vehiclesForCarrier(codigo: string, source: VehicleRecord[] = VEHICLES): VehicleRecord[] {
  return source.filter((v) => v.carrierCodigo === codigo);
}
