import type { WarehouseFormValues } from "../components/AlmacenesDialog/WarehouseFormDialog";
import { WAREHOUSE_TIPO_OPTIONS, type WarehouseRecord } from "../data/warehouses";

export function normalizeRecepManual(n: number): 0 | 1 {
  if (n === 1) return 1;
  if (n === 0) return 0;
  return (n & 1) !== 0 ? 1 : 0;
}

/** Columna «Recep. manual»: solo 0 = No, 1 = Sí. */
export function formatRecepManualSiNo(n: number): string {
  return normalizeRecepManual(n) === 1 ? "Sí" : "No";
}

export function recepManualFromForm(form: WarehouseFormValues): 0 | 1 {
  return form.recepManualTransf ? 1 : 0;
}

export function emptyWarehouseForm(nextCodigo: string): WarehouseFormValues {
  return {
    codigo: nextCodigo,
    habilitado: true,
    almacen: "",
    direccion: "",
    telefono: "",
    responsable: "",
    email: "",
    tipo: WAREHOUSE_TIPO_OPTIONS[0],
    subCCosto: "",
    sucursal: "LIMA",
    tienda: "PRINCIPAL",
    recepManualTransf: false,
    despachoAutomatico: false,
    asientoContableTransf: false,
    kardexCentralizado: false,
  };
}

export function warehouseRecordToForm(row: WarehouseRecord): WarehouseFormValues {
  return {
    codigo: row.codigo,
    habilitado: row.activo,
    almacen: row.almacen,
    direccion: row.direccion,
    telefono: row.telefono,
    responsable: row.responsable ?? "",
    email: row.email ?? "",
    tipo: row.tipo,
    subCCosto: row.subCCosto ?? "",
    sucursal: row.sucursal,
    tienda: row.tienda,
    recepManualTransf: row.recepManual === 1,
    despachoAutomatico: row.despachoAutomatico ?? false,
    asientoContableTransf: row.asientoContableTransf ?? false,
    kardexCentralizado: row.kardexCentralizado ?? false,
  };
}

export function sanitizeWarehouseRecord(row: WarehouseRecord): WarehouseRecord {
  return {
    ...row,
    recepManual: normalizeRecepManual(row.recepManual),
  };
}

export function warehouseFormToRecord(form: WarehouseFormValues, existingId?: string): WarehouseRecord {
  const codigo = form.codigo.trim();
  return {
    id: existingId ?? codigo,
    codigo,
    almacen: form.almacen.trim(),
    direccion: form.direccion.trim(),
    telefono: form.telefono.trim(),
    tipo: form.tipo,
    sucursal: form.sucursal,
    tienda: form.tienda,
    recepManual: recepManualFromForm(form),
    despachoAutomatico: form.despachoAutomatico,
    asientoContableTransf: form.asientoContableTransf,
    kardexCentralizado: form.kardexCentralizado,
    activo: form.habilitado,
    responsable: form.responsable.trim(),
    email: form.email.trim(),
    subCCosto: form.subCCosto.trim(),
  };
}
