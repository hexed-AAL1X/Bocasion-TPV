import type { SaleDocType } from "../types/sales";

export type BatchPrintDocId = SaleDocType;

export type BatchPrintDocOption = {
  id: BatchPrintDocId;
  label: string;
  rangePrefix: string;
};

export const BATCH_PRINT_DOC_TYPES: BatchPrintDocOption[] = [
  { id: "boleta", label: "BOLETA VTA", rangePrefix: "B -" },
  { id: "factura", label: "FACTURA", rangePrefix: "F -" },
  { id: "nota", label: "NOTA VTA", rangePrefix: "NV -" },
];

const BATCH_DOC_SERIES: Record<BatchPrintDocId, string> = {
  boleta: "B034",
  factura: "F001",
  nota: "N001",
};

const BATCH_DOC_PICKER_TITLE: Record<BatchPrintDocId, string> = {
  boleta: "Boleta",
  factura: "Factura",
  nota: "Nota",
};

export function getBatchDocPickerTitle(id: BatchPrintDocId): string {
  return BATCH_DOC_PICKER_TITLE[id];
}

export function formatBatchDocListNumber(id: BatchPrintDocId, docNumber: number): string {
  return `${BATCH_DOC_SERIES[id]}-${String(docNumber).padStart(7, "0")}`;
}

export function formatBatchDocField(id: BatchPrintDocId, docNumber: number): string {
  const { rangePrefix } = getBatchPrintDoc(id);
  return `${rangePrefix}${String(docNumber).padStart(7, "0")}`;
}

export function getBatchPrintDoc(id: BatchPrintDocId): BatchPrintDocOption {
  return BATCH_PRINT_DOC_TYPES.find((item) => item.id === id) ?? BATCH_PRINT_DOC_TYPES[0];
}

export function formatBatchPrintDate(date: Date): string {
  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function toInputDateValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromInputDateValue(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}
