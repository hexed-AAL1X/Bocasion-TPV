export type SaleConditionKind = "CONTADO" | "CREDITO";

export type SaleConditionRecord = {
  id: string;
  codigo: string;
  nombre: string;
  condicion: SaleConditionKind;
  /** Días de vencimiento. */
  vencimiento: number;
  nLetras: number;
  tasaGastoFinanc: number;
  /** Inc. L.P. Vta. (porcentaje). */
  incLpVta: number;
};

/** Compatibilidad Comanda / selects legacy. */
export type PaymentCondition = {
  code: string;
  label: string;
};

type Seed = readonly [
  codigo: string,
  nombre: string,
  condicion: SaleConditionKind,
  vencimiento: number,
];

function seed([codigo, nombre, condicion, vencimiento]: Seed): SaleConditionRecord {
  return {
    id: `cond-${codigo}`,
    codigo,
    nombre,
    condicion,
    vencimiento,
    nLetras: 0,
    tasaGastoFinanc: 0,
    incLpVta: 0,
  };
}

/** Condiciones de venta del ERP de referencia. */
const SALE_CONDITION_SEEDS: Seed[] = [
  ["01", "CONTADO", "CONTADO", 0],
  ["02", "CONTRAENTREGA", "CONTADO", 0],
  ["03", "CREDITO", "CREDITO", 0],
  ["04", "CREDITO 10 DIAS", "CREDITO", 10],
  ["05", "CREDITO 30 DIAS", "CREDITO", 30],
  ["06", "CREDITO 60 DIAS", "CREDITO", 60],
  ["07", "CREDITO 90 DIAS", "CREDITO", 90],
  ["08", "CREDITO 8 DIAS", "CREDITO", 8],
  ["09", "CREDITO 15 DIAS", "CREDITO", 15],
  ["10", "CREDITO 75 DIAS", "CREDITO", 75],
  ["11", "CREDITO 7 DIAS", "CREDITO", 7],
];

export const SALE_CONDITIONS: SaleConditionRecord[] = SALE_CONDITION_SEEDS.map(seed);

export const PAYMENT_CONDITIONS: PaymentCondition[] = SALE_CONDITIONS.map((row) => ({
  code: row.codigo,
  label: row.nombre,
}));

export function paymentConditionByCode(code: string): PaymentCondition | undefined {
  return PAYMENT_CONDITIONS.find((c) => c.code === code);
}

export function sortSaleConditions(rows: SaleConditionRecord[]): SaleConditionRecord[] {
  return [...rows].sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }));
}

export function formatSaleConditionCodigo(codigo: string, mode: "add" | "edit"): string {
  const digits = codigo.replace(/\D/g, "");
  if (!digits) return mode === "add" ? "" : codigo;
  return digits.padStart(2, "0").slice(-2);
}

export function nextSaleConditionCodigo(existing: SaleConditionRecord[]): string {
  let max = 0;
  for (const row of existing) {
    const n = Number.parseInt(row.codigo.replace(/\D/g, ""), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return String(max + 1).padStart(2, "0");
}
