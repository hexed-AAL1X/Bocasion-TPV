import type { DriverRecord } from "../data/drivers";
import type { VehicleRecord } from "../data/vehicles";

export type VehicleFormValues = {
  placa: string;
  marca: string;
  placaCarreta: string;
  numConstInscrip: string;
  numCertifHabilitac: string;
  activo: boolean;
  largo: string;
  ancho: string;
  alto: string;
  volumen: string;
  pesoTotal: string;
  cargaUtil: string;
  choferId: string;
  choferDni: string;
  choferLicencia: string;
  usuario: string;
};

function formatNum(value: number): string {
  return value.toFixed(2);
}

function parseNum(value: string): number {
  const n = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function emptyVehicleForm(): VehicleFormValues {
  return {
    placa: "",
    marca: "",
    placaCarreta: "",
    numConstInscrip: "",
    numCertifHabilitac: "",
    activo: true,
    largo: "0.00",
    ancho: "0.00",
    alto: "0.00",
    volumen: "0.00",
    pesoTotal: "0.00",
    cargaUtil: "0.00",
    choferId: "",
    choferDni: "",
    choferLicencia: "",
    usuario: "",
  };
}

export function vehicleRecordToForm(record: VehicleRecord): VehicleFormValues {
  return {
    placa: record.placa,
    marca: record.marca,
    placaCarreta: record.placaCarreta,
    numConstInscrip: record.numConstInscrip,
    numCertifHabilitac: record.numCertifHabilitac,
    activo: record.activo,
    largo: formatNum(record.largo),
    ancho: formatNum(record.ancho),
    alto: formatNum(record.alto),
    volumen: formatNum(record.volumen),
    pesoTotal: formatNum(record.pesoTotal),
    cargaUtil: formatNum(record.cargaUtil),
    choferId: record.choferId,
    choferDni: record.choferDni,
    choferLicencia: record.choferLicencia,
    usuario: record.usuario,
  };
}

export function vehicleFormToRecord(
  values: VehicleFormValues,
  carrierCodigo: string,
  drivers: DriverRecord[],
  existing?: VehicleRecord,
): VehicleRecord {
  const driver = drivers.find((d) => d.id === values.choferId);
  return {
    id: existing?.id ?? `v-${Date.now()}`,
    carrierCodigo,
    placa: values.placa.trim(),
    marca: values.marca.trim(),
    placaCarreta: values.placaCarreta.trim(),
    numConstInscrip: values.numConstInscrip.trim(),
    numCertifHabilitac: values.numCertifHabilitac.trim(),
    largo: parseNum(values.largo),
    ancho: parseNum(values.ancho),
    alto: parseNum(values.alto),
    volumen: parseNum(values.volumen),
    pesoTotal: parseNum(values.pesoTotal),
    cargaUtil: parseNum(values.cargaUtil),
    choferId: values.choferId,
    chofer: driver?.nombre ?? existing?.chofer ?? "",
    choferDni: values.choferDni.trim(),
    choferLicencia: values.choferLicencia.trim(),
    usuario: values.usuario.trim(),
    activo: values.activo,
  };
}

export function driverFieldsFromId(
  choferId: string,
  drivers: DriverRecord[],
): Pick<VehicleFormValues, "choferDni" | "choferLicencia" | "usuario"> {
  const driver = drivers.find((d) => d.id === choferId);
  if (!driver) {
    return { choferDni: "", choferLicencia: "", usuario: "" };
  }
  return {
    choferDni: driver.dni,
    choferLicencia: driver.licencia,
    usuario: driver.usuario,
  };
}
