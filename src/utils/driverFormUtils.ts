import type { DriverRecord } from "../data/drivers";

export type DriverFormValues = {
  codigo: string;
  activo: boolean;
  nombre: string;
  dni: string;
  licencia: string;
  constInscrip: string;
  direccion: string;
  telefono: string;
};

export function nextDriverCodigo(existing: DriverRecord[]): string {
  let max = 0;
  for (const row of existing) {
    const n = Number.parseInt(row.codigo, 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return String(max + 1).padStart(5, "0");
}

export function emptyDriverForm(existing: DriverRecord[]): DriverFormValues {
  return {
    codigo: nextDriverCodigo(existing),
    activo: true,
    nombre: "",
    dni: "",
    licencia: "",
    constInscrip: "",
    direccion: "",
    telefono: "",
  };
}

export function driverRecordToForm(record: DriverRecord): DriverFormValues {
  return {
    codigo: record.codigo,
    activo: record.activo,
    nombre: record.nombre,
    dni: record.dni,
    licencia: record.licencia,
    constInscrip: record.constInscrip,
    direccion: record.direccion,
    telefono: record.telefono,
  };
}

export function driverFormToRecord(
  values: DriverFormValues,
  carrierCodigo: string,
  existing?: DriverRecord,
): DriverRecord {
  return {
    id: existing?.id ?? `d-${Date.now()}`,
    carrierCodigo,
    codigo: values.codigo.trim(),
    nombre: values.nombre.trim(),
    dni: values.dni.trim(),
    licencia: values.licencia.trim(),
    constInscrip: values.constInscrip.trim(),
    direccion: values.direccion.trim(),
    telefono: values.telefono.trim(),
    usuario: existing?.usuario ?? "",
    activo: values.activo,
  };
}
