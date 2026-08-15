import { COMPANY_NAME_REPORT } from "../config/brand";
import type { PreviewRow } from "./buildThermalPrintPreview";
import { previewRowsToPlainText } from "./buildThermalPrintPreview";

export type DocsAnnexPrintRow = {
  fecreg: string;
  documento: string;
  cliente: string;
  total: number;
  contado: number;
  credito: number;
  otros: number;
  tipovta: string;
  forpago: string;
  nroCta: string;
  recibidoS: number;
  vueltoS: number;
  recibidoUs: number;
  vueltoUs: number;
  tarjeta: number;
  banco: number;
  montoS: number;
  tCamb: number;
  vendedor: string;
  anulado: number;
  nroOperacion: string;
};

export type DocsAnnexPrintTotals = Pick<
  DocsAnnexPrintRow,
  | "total"
  | "contado"
  | "credito"
  | "otros"
  | "recibidoS"
  | "vueltoS"
  | "recibidoUs"
  | "vueltoUs"
  | "tarjeta"
  | "banco"
  | "montoS"
  | "anulado"
>;

export type DocsAnnexPrintData = {
  branch: string;
  point: string;
  registerLabel: string;
  saleDate: string;
  rows: DocsAnnexPrintRow[];
  totals: DocsAnnexPrintTotals;
};

type ColDef = { label: string; w: number; align?: "left" | "right" };

/** Espacio visual entre columnas (monoespaciado). */
const COL_GAP = 2;

/** Columnas al estilo ERP legacy (referencia impresión anexo). */
const COLS: ColDef[] = [
  { label: "Fecreg", w: 22 },
  { label: "Documento", w: 17 },
  { label: "Cliente", w: 13 },
  { label: "Total", w: 8, align: "right" },
  { label: "Contado", w: 8, align: "right" },
  { label: "Crédito", w: 8, align: "right" },
  { label: "Otros", w: 8, align: "right" },
  { label: "Tipovta", w: 10 },
  { label: "Forpago", w: 13 },
  { label: "Recibido", w: 9, align: "right" },
  { label: "Vuelto", w: 9, align: "right" },
  { label: "Recibido", w: 9, align: "right" },
  { label: "Vuelto", w: 9, align: "right" },
  { label: "Tarjeta", w: 9, align: "right" },
  { label: "Banco", w: 9, align: "right" },
  { label: "Monto S/", w: 9, align: "right" },
  { label: "T.Camb", w: 8, align: "right" },
  { label: "Vendedor", w: 10 },
  { label: "Nro.Cta.", w: 9 },
];

/** Siempre visibles cuando hay filas (identificación + total + tipo/pago). */
const ALWAYS_VISIBLE_COL = new Set([0, 1, 2, 3, 7, 8]);

function padCol(value: string, col: ColDef, isLast: boolean): string {
  const text = clip(value, col.w);
  if (isLast) return text;
  return col.align === "right" ? text.padStart(col.w) : text.padEnd(col.w);
}

function formatTableLine(values: string[], colIndices: number[]): string {
  const gap = " ".repeat(COL_GAP);
  const lastPos = colIndices.length - 1;
  return colIndices
    .map((colIdx, pos) => padCol(values[colIdx], COLS[colIdx], pos === lastPos))
    .join(gap);
}

function tableLineWidth(colIndices: number[]): number {
  return formatTableLine(COLS.map((c) => c.label), colIndices).length;
}

function clip(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

function normalizeFecreg(value: string): string {
  return value
    .replace(/,\s*/, " ")
    .replace(/\s*a\.\s*m\.?/gi, " AM")
    .replace(/\s*p\.\s*m\.?/gi, " PM")
    .replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
}

function fmtNum(n: number): string {
  if (n === 0) return "";
  return n.toFixed(2);
}

function fmtTCamb(n: number): string {
  if (n === 0) return "";
  return n.toFixed(4);
}

function rowValues(r: DocsAnnexPrintRow): string[] {
  return [
    normalizeFecreg(r.fecreg),
    r.documento,
    r.cliente,
    fmtNum(r.total),
    fmtNum(r.contado),
    fmtNum(r.credito),
    fmtNum(r.otros),
    r.tipovta,
    r.forpago,
    fmtNum(r.recibidoS),
    fmtNum(r.vueltoS),
    fmtNum(r.recibidoUs),
    fmtNum(r.vueltoUs),
    fmtNum(r.tarjeta),
    fmtNum(r.banco),
    fmtNum(r.montoS),
    fmtTCamb(r.tCamb),
    r.vendedor,
    r.nroCta,
  ];
}

function totalValues(t: DocsAnnexPrintTotals): string[] {
  return [
    "",
    "",
    "TOTALES",
    fmtNum(t.total),
    fmtNum(t.contado),
    fmtNum(t.credito),
    fmtNum(t.otros),
    "",
    "",
    fmtNum(t.recibidoS),
    fmtNum(t.vueltoS),
    fmtNum(t.recibidoUs),
    fmtNum(t.vueltoUs),
    fmtNum(t.tarjeta),
    fmtNum(t.banco),
    fmtNum(t.montoS),
    "",
    "",
    "",
  ];
}

function activeColumnIndices(
  rows: DocsAnnexPrintRow[],
  totals: DocsAnnexPrintTotals,
): number[] {
  if (rows.length === 0) return COLS.map((_, i) => i);

  const allValues = [...rows.map(rowValues), totalValues(totals)];
  const indices: number[] = [];

  for (let i = 0; i < COLS.length; i++) {
    if (ALWAYS_VISIBLE_COL.has(i)) {
      indices.push(i);
      continue;
    }
    const hasData = allValues.some((vals) => vals[i]?.trim() !== "");
    if (hasData) indices.push(i);
  }

  return indices;
}

function fixed(text: string, variant?: "total"): PreviewRow {
  return { kind: "fixed", text, variant };
}

function formatLeftRightLine(left: string, right: string, width: number): string {
  const rightStr = clip(right, width);
  const leftMax = Math.max(0, width - rightStr.length);
  const leftStr = clip(left, leftMax).padEnd(leftMax);
  return leftStr + rightStr;
}

function formatCenteredLine(text: string, width: number): string {
  const content = clip(text, width);
  const pad = Math.max(0, Math.floor((width - content.length) / 2));
  return " ".repeat(pad) + content;
}

function formatAnnexMetaLine(
  branch: string,
  point: string,
  registerLabel: string,
  saleDate: string,
  width: number,
): string {
  const segments = [
    `Tienda: ${branch}`,
    `Caja: ${point}`,
    `Responsable: ${registerLabel}`,
    `Vta. del día: ${saleDate} 12:00 AM`,
  ];
  for (const gapSize of [8, 6, 4]) {
    const gap = " ".repeat(gapSize);
    const text = segments.join(gap);
    if (text.length <= width) {
      return formatCenteredLine(text, width);
    }
  }
  return clip(segments.join("   "), width);
}

export function buildDocsAnnexPrintPreview(data: DocsAnnexPrintData): PreviewRow[] {
  const { branch, point, registerLabel, saleDate, rows, totals } = data;
  const colIndices = activeColumnIndices(rows, totals);
  const totalW = tableLineWidth(colIndices);
  const out: PreviewRow[] = [];

  out.push(fixed(formatLeftRightLine(COMPANY_NAME_REPORT, `FECHA: ${saleDate}`, totalW)));
  out.push(fixed("PAG: 1"));
  out.push(
    fixed(formatAnnexMetaLine(branch, point, registerLabel, saleDate, totalW)),
  );
  out.push({ kind: "blank" });
  out.push(fixed(formatTableLine(COLS.map((c) => c.label), colIndices)));
  out.push({ kind: "blank" });

  for (const row of rows) {
    out.push(fixed(formatTableLine(rowValues(row), colIndices)));
  }

  if (rows.length > 0) {
    out.push({ kind: "blank" });
    out.push(fixed(formatTableLine(totalValues(totals), colIndices), "total"));
  }

  return out;
}

export function buildDocsAnnexPlainText(data: DocsAnnexPrintData): string {
  return previewRowsToPlainText(buildDocsAnnexPrintPreview(data));
}

function escHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildDocsAnnexHtml(data: DocsAnnexPrintData): string {
  const plain = buildDocsAnnexPlainText(data);
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Liquidación de venta - Anexo de documentos</title>
<style>
  @page { size: landscape; margin: 10mm; }
  body {
    font-family: "Courier New", Courier, monospace;
    font-size: 11pt;
    margin: 0;
    padding: 0;
    color: #000;
  }
  pre {
    margin: 0;
    white-space: pre;
    font: inherit;
    line-height: 1.35;
  }
</style>
</head>
<body><pre>${escHtml(plain)}</pre></body>
</html>`;
}
