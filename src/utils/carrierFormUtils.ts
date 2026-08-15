import type { CarrierFormValues } from "../components/TransportistasDialog/TransportistaFormDialog";
import type { CarrierRecord } from "../data/carriers";

export function nextCarrierCodigo(rows: CarrierRecord[]): string {
  const nums = rows
    .map((row) => Number.parseInt(row.codigo.replace(/^T0*/i, ""), 10))
    .filter((n) => Number.isFinite(n));
  const max = nums.length > 0 ? Math.max(...nums) : -1;
  return `T${String(max + 1).padStart(4, "0")}`;
}

export function emptyCarrierForm(nextCodigo: string): CarrierFormValues {
  return {
    codigo: nextCodigo,
    activo: true,
    nombre: "",
    direccion: "",
    ruc: "",
    dni: "",
    telefono: "",
    contacto: "",
    email: "",
    ubicacionCodigo: "",
    ubicacionNombre: "",
    tipoTransporte: "publico",
    entidadEmisora: "",
    numAutorizacion: "",
    numRegistroMtc: "",
  };
}

export function carrierRecordToForm(row: CarrierRecord): CarrierFormValues {
  return {
    codigo: row.codigo,
    activo: row.activo,
    nombre: row.razonSocial,
    direccion: row.direccion,
    ruc: row.ruc,
    dni: row.dni,
    telefono: row.telefono,
    contacto: row.contacto,
    email: row.email,
    ubicacionCodigo: row.ubicacionCodigo,
    ubicacionNombre: row.ubicacionNombre,
    tipoTransporte: row.tipoTransporte,
    entidadEmisora: row.entidadEmisora,
    numAutorizacion: row.numAutorizacion,
    numRegistroMtc: row.numRegistroMtc,
  };
}

export function carrierFormToRecord(form: CarrierFormValues, existing?: CarrierRecord): CarrierRecord {
  const codigo = form.codigo.trim();
  return {
    id: existing?.id ?? codigo,
    codigo,
    razonSocial: form.nombre.trim(),
    ruc: form.ruc.trim(),
    dni: form.dni.trim(),
    direccion: form.direccion.trim(),
    telefono: form.telefono.trim(),
    contacto: form.contacto.trim(),
    email: form.email.trim(),
    ubicacionCodigo: form.ubicacionCodigo.trim(),
    ubicacionNombre: form.ubicacionNombre.trim(),
    activo: form.activo,
    tipoTransporte: form.tipoTransporte,
    entidadEmisora: form.entidadEmisora,
    numAutorizacion: form.numAutorizacion.trim(),
    numRegistroMtc: form.numRegistroMtc.trim(),
    vehiculos: existing?.vehiculos ?? 0,
    choferes: existing?.choferes ?? 0,
  };
}
