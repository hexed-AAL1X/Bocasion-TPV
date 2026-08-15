import type { CashLimitMode, EmissionPointRecord } from "../data/emissionPoints";
import type { PcPointAssignmentRecord } from "../data/pcPointAssignments";
import { nextPcAssignmentCodigo } from "../data/pcPointAssignments";

export type EmissionPointFormValues = {
  codigo: string;
  habilitado: boolean;
  nombre: string;
  sucursal: string;
  tienda: string;
  modeloMaquina: string;
  nroSerie: string;
  hojaExcel: string;
  limiteEfectivoModo: CashLimitMode;
  limiteEfectivoMonto: number;
};

export type PcPointAssignmentFormValues = {
  codigo: string;
  nombrePc: string;
  puntoEmisionId: string;
  almacenPredeterminado: string;
  formatoImpresion: string;
  numCopias: number;
};

function formatMaqRegSerie(modelo: string, serie: string): string {
  if (modelo && serie) return `${modelo} / ${serie}`;
  return modelo || serie || "";
}

export function nextEmissionPointCodigo(existing: EmissionPointRecord[]): string {
  let max = 0;
  for (const row of existing) {
    const n = Number.parseInt(row.codigo, 10);
    if (!Number.isNaN(n)) max = Math.max(max, n);
  }
  return String(max + 1).padStart(2, "0");
}

export function emptyEmissionPointForm(existing: EmissionPointRecord[]): EmissionPointFormValues {
  return {
    codigo: nextEmissionPointCodigo(existing),
    habilitado: true,
    nombre: "",
    sucursal: "LIMA",
    tienda: "PRINCIPAL",
    modeloMaquina: "",
    nroSerie: "",
    hojaExcel: "",
    limiteEfectivoModo: "advertir",
    limiteEfectivoMonto: 500,
  };
}

export function emissionPointRecordToForm(record: EmissionPointRecord): EmissionPointFormValues {
  return {
    codigo: record.codigo,
    habilitado: record.habilitado,
    nombre: record.nombre,
    sucursal: record.sucursal,
    tienda: record.tienda,
    modeloMaquina: record.modeloMaquina,
    nroSerie: record.nroSerie,
    hojaExcel: record.hojaExcel,
    limiteEfectivoModo: record.limiteEfectivoModo,
    limiteEfectivoMonto: record.limiteEfectivoMonto,
  };
}

export function sanitizeEmissionPointForm(values: EmissionPointFormValues): EmissionPointFormValues {
  return {
    ...values,
    codigo: values.codigo.trim(),
    nombre: values.nombre.trim(),
    modeloMaquina: values.modeloMaquina.trim(),
    nroSerie: values.nroSerie.trim(),
    hojaExcel: values.hojaExcel.trim(),
    limiteEfectivoMonto: Math.max(0, values.limiteEfectivoMonto),
  };
}

export function emissionPointFormToRecord(
  values: EmissionPointFormValues,
  existing?: EmissionPointRecord,
): EmissionPointRecord {
  const sanitized = sanitizeEmissionPointForm(values);
  return {
    id: existing?.id ?? `ep-${Date.now()}`,
    codigo: sanitized.codigo,
    nombre: sanitized.nombre,
    sucursal: sanitized.sucursal,
    tienda: sanitized.tienda,
    habilitado: sanitized.habilitado,
    modeloMaquina: sanitized.modeloMaquina,
    nroSerie: sanitized.nroSerie,
    hojaExcel: sanitized.hojaExcel,
    limiteEfectivoModo: sanitized.limiteEfectivoModo,
    limiteEfectivoMonto: sanitized.limiteEfectivoMonto,
    maqRegSerie: formatMaqRegSerie(sanitized.modeloMaquina, sanitized.nroSerie),
  };
}

export function emptyPcPointAssignmentForm(
  existing: PcPointAssignmentRecord[],
  defaultPuntoId = "",
  defaultAlmacen = "",
): PcPointAssignmentFormValues {
  return {
    codigo: nextPcAssignmentCodigo(existing),
    nombrePc: "",
    puntoEmisionId: defaultPuntoId,
    almacenPredeterminado: defaultAlmacen,
    formatoImpresion: "TICKET 80mm",
    numCopias: 1,
  };
}

export function pcPointAssignmentRecordToForm(record: PcPointAssignmentRecord): PcPointAssignmentFormValues {
  return {
    codigo: record.codigo,
    nombrePc: record.nombrePc,
    puntoEmisionId: record.puntoEmisionId,
    almacenPredeterminado: record.almacenPredeterminado,
    formatoImpresion: record.formatoImpresion,
    numCopias: record.numCopias,
  };
}

export function pcPointAssignmentFormToRecord(
  values: PcPointAssignmentFormValues,
  puntoEmisionLabel: string,
  existing?: PcPointAssignmentRecord,
): PcPointAssignmentRecord {
  return {
    id: existing?.id ?? `pc-${Date.now()}`,
    codigo: values.codigo.trim(),
    nombrePc: values.nombrePc.trim(),
    puntoEmisionId: values.puntoEmisionId,
    puntoEmisionLabel,
    almacenPredeterminado: values.almacenPredeterminado,
    formatoImpresion: values.formatoImpresion,
    numCopias: Math.max(1, values.numCopias),
  };
}
