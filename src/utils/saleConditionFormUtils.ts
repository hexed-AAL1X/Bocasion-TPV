import {
  formatSaleConditionCodigo,
  nextSaleConditionCodigo,
  type SaleConditionKind,
  type SaleConditionRecord,
} from "../data/paymentConditions";

export type SaleConditionFormValues = {
  codigo: string;
  nombre: string;
  condicion: SaleConditionKind;
  nLetras: number;
  vencimiento: number;
  tasaGastoFinanc: number;
  incLpVta: number;
};

export function emptySaleConditionForm(existing: SaleConditionRecord[]): SaleConditionFormValues {
  return {
    codigo: nextSaleConditionCodigo(existing),
    nombre: "",
    condicion: "CREDITO",
    nLetras: 0,
    vencimiento: 0,
    tasaGastoFinanc: 0,
    incLpVta: 0,
  };
}

export function saleConditionRecordToForm(record: SaleConditionRecord): SaleConditionFormValues {
  return {
    codigo: record.codigo,
    nombre: record.nombre,
    condicion: record.condicion,
    nLetras: record.nLetras,
    vencimiento: record.vencimiento,
    tasaGastoFinanc: record.tasaGastoFinanc,
    incLpVta: record.incLpVta,
  };
}

export function saleConditionFormToRecord(
  values: SaleConditionFormValues,
  existing?: SaleConditionRecord,
): SaleConditionRecord {
  const codigo = formatSaleConditionCodigo(values.codigo, existing ? "edit" : "add");
  return {
    id: existing?.id ?? `cond-${codigo}-${Date.now()}`,
    codigo,
    nombre: values.nombre.trim().toUpperCase(),
    condicion: values.condicion,
    nLetras: Math.max(0, Math.trunc(values.nLetras) || 0),
    vencimiento: Math.max(0, Math.trunc(values.vencimiento) || 0),
    tasaGastoFinanc: Number.isFinite(values.tasaGastoFinanc) ? values.tasaGastoFinanc : 0,
    incLpVta: Number.isFinite(values.incLpVta) ? values.incLpVta : 0,
  };
}
