export type PcPointAssignmentRecord = {
  id: string;
  codigo: string;
  nombrePc: string;
  puntoEmisionId: string;
  puntoEmisionLabel: string;
  almacenPredeterminado: string;
  formatoImpresion: string;
  numCopias: number;
};

export const FE_FORMATO_OPTIONS: { value: string; label: string }[] = [
  { value: "A4", label: "A4" },
  { value: "TICKET 80mm", label: "TICKET 80mm" },
  { value: "TICKET 58mm", label: "TICKET 58mm" },
  { value: "A5", label: "A5" },
];

/** Asignaciones PC → punto de emisión y almacén fijo (demo). */
export const PC_POINT_ASSIGNMENTS: PcPointAssignmentRecord[] = [
  {
    id: "pc-01",
    codigo: "01",
    nombrePc: "CAJA-PLANTA-01",
    puntoEmisionId: "01",
    puntoEmisionLabel: "01 - PRINCIPAL",
    almacenPredeterminado: "01 - ALMACEN PLANTA",
    formatoImpresion: "TICKET 80mm",
    numCopias: 1,
  },
  {
    id: "pc-02",
    codigo: "02",
    nombrePc: "CAJA-SANISIDRO",
    puntoEmisionId: "02",
    puntoEmisionLabel: "02 - UPC SAN ISIDRO",
    almacenPredeterminado: "02 - UPC SAN ISIDRO",
    formatoImpresion: "A4",
    numCopias: 2,
  },
];

export function sortPcPointAssignments(rows: PcPointAssignmentRecord[]): PcPointAssignmentRecord[] {
  return [...rows].sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }));
}

export function nextPcAssignmentCodigo(existing: PcPointAssignmentRecord[]): string {
  let max = 0;
  for (const row of existing) {
    const n = Number.parseInt(row.codigo, 10);
    if (!Number.isNaN(n)) max = Math.max(max, n);
  }
  return String(max + 1).padStart(2, "0");
}
