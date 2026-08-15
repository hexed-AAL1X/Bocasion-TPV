import { COMPANY_ADDRESS, COMPANY_NAME_REPORT } from "../config/brand";
import type { SalesReportExportData } from "./exportSalesReportXls";
import {
  buildThermalReceiptBodyHtml,
  THERMAL_RECEIPT_ROW_CSS,
  THERMAL_TOTAL_COLOR,
} from "./thermalReceiptBody";
import { buildPrintFontFaceCss } from "./printFontFaces";

export type PrintPreviewMeta = {
  branch: string;
  registerLabel: string;
  vendorLabel: string;
  saleDate: string;
  sessionStatus: "Abierto" | "Cerrado";
  sessionOpenedAt?: Date | null;
  sessionClosedAt?: Date | null;
  openedAtLabel: string;
  ruc: string;
};

export type RowVariant = "normal" | "total" | "section";

export { THERMAL_TOTAL_COLOR } from "./thermalReceiptBody";

export function formatThermalPrintTime(d: Date): string {
  const hours = d.getHours();
  const h12 = hours % 12 || 12;
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours < 12 ? "AM" : "PM";
  return `${String(h12).padStart(2, "0")}:${minutes} ${ampm}`;
}

export function formatThermalPrintDate(d: Date): string {
  return d.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatThermalPrintDateTime(d: Date): string {
  return `${formatThermalPrintDate(d)} · ${formatThermalPrintTime(d)}`;
}

export function formatThermalSessionTimeRange(
  openedAt?: Date | null,
  closedAt?: Date | null,
): string | undefined {
  if (!openedAt) return undefined;
  const open = formatThermalPrintTime(openedAt);
  if (!closedAt) return open;
  return `${open} - ${formatThermalPrintTime(closedAt)}`;
}

export type ListCellAlign = "left" | "center" | "right";

export type ListColWidth = {
  w: number;
  align?: ListCellAlign;
  /** Ancho de columna en el cuadro origen (px @ 11px), para alinear fuentes proporcionales. */
  widthPx?: number;
};

export type PreviewRow =
  | { kind: "blank" }
  | { kind: "header"; text: string; address?: boolean; title?: boolean }
  | { kind: "separator"; text: string }
  | { kind: "meta"; text: string; variant?: "total" }
  | { kind: "metaField"; label: string; value: string; timeRange?: string }
  | { kind: "decor"; style: "double" | "single" | "dotted"; text: string }
  | { kind: "fixed"; text: string; variant?: "total" }
  | { kind: "cols3"; c1: string; c2: string; c3: string; variant?: RowVariant }
  | {
      kind: "listCells";
      cells: string[];
      widthCh: number[];
      widthPx: number[];
      align: ListCellAlign[];
      layout?: "table" | "title";
      variant?: RowVariant;
      /** Línea monoespaciada para exportar TXT / imprimir. */
      plainText?: string;
    }
  | { kind: "listRule"; widthPx: number[]; plainChars: number; variant?: RowVariant }
  | { kind: "listMeta"; text: string; widthPx: number[]; variant?: RowVariant };

const LIST_CELL_GAP = 2;
/** Espacio fijo para export Word/LibreOffice (no colapsa como el espacio normal). */
const WORD_NBSP = "\u00A0";
/** Separación horizontal entre columnas del listado en pantalla (px). */
export const LIST_TABLE_COLUMN_GAP_PX = 7;
/** Fuente de la tabla Almacenes / listados en pantalla. */
export const LIST_TABLE_UI_FONT_PX = 11;
/** Caracteres monoespaciados → px aproximado cuando no hay ancho de columna. */
export const LIST_CHAR_FALLBACK_PX = 6.5;

export function formatListCellsLine(cells: string[], cols: ListColWidth[], gap = LIST_CELL_GAP): string {
  const gapStr = " ".repeat(gap);
  return cells
    .map((cell, i) => {
      const col = cols[i] ?? { w: 8, align: "left" as const };
      const text = cell.length > col.w ? cell.slice(0, col.w) : cell;
      return col.align === "right" ? text.padStart(col.w) : text.padEnd(col.w);
    })
    .join(gapStr);
}

/** Igual que formatListCellsLine pero con NBSP: LibreOffice no colapsa columnas al exportar Word. */
export function formatListCellsLineWord(cells: string[], cols: ListColWidth[], gap = LIST_CELL_GAP): string {
  const gapStr = WORD_NBSP.repeat(gap);
  return cells
    .map((cell, i) => {
      const col = cols[i] ?? { w: 8, align: "left" as const };
      const text = cell.length > col.w ? cell.slice(0, col.w) : cell;
      return col.align === "right"
        ? text.padStart(col.w, WORD_NBSP)
        : text.padEnd(col.w, WORD_NBSP);
    })
    .join(gapStr);
}

/** Convierte espacios de layout a NBSP para que Word/LibreOffice respeten columnas. */
export function preserveWordMonoSpaces(text: string): string {
  return text.replace(/ /g, WORD_NBSP);
}

export function listColumnWidthsPx(cols: ListColWidth[]): number[] {
  return cols.map((col) => Math.round(col.widthPx ?? col.w * LIST_CHAR_FALLBACK_PX));
}

export function listLineWidthChars(cells: string[], cols: ListColWidth[]): number {
  return formatListCellsLine(cells, cols).length;
}

export function formatListTitleLine(left: string, center: string, right: string, width: number): string {
  const clipLocal = (value: string, max: number) => (value.length > max ? value.slice(0, max) : value);
  const rightPart = clipLocal(right, 22);
  const leftPart = clipLocal(left, 28);
  const centerPart = center;
  const centerPos = Math.max(0, Math.floor((width - centerPart.length) / 2));
  const beforeCenter = Math.max(1, centerPos - leftPart.length);
  const afterCenter = Math.max(1, width - centerPos - centerPart.length - rightPart.length);
  return leftPart + " ".repeat(beforeCenter) + centerPart + " ".repeat(afterCenter) + rightPart;
}

export function listTitleRow(
  cells: [string, string, string],
  cols: ListColWidth[],
  plainChars: number,
): PreviewRow {
  const row = listCellsRow(cells, cols, { layout: "title" });
  if (row.kind !== "listCells") return row;
  return {
    ...row,
    align: ["left", "center", "right"],
    plainText: formatListTitleLine(cells[0], cells[1], cells[2], plainChars),
  };
}

export function listMetaRow(text: string, cols: ListColWidth[], variant?: RowVariant): PreviewRow {
  return { kind: "listMeta", text, widthPx: listColumnWidthsPx(cols), variant };
}

export function formatListReportDate(saleDate?: string): string {
  if (saleDate?.trim()) return saleDate.trim();
  return new Date().toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Línea 1: empresa (izq) + fecha (der), sin título en la misma fila. */
export function listCompanyDateRow(
  company: string,
  dateLabel: string,
  cols: ListColWidth[],
  plainChars: number,
  variant?: RowVariant,
): PreviewRow {
  return {
    kind: "listMeta",
    text: formatListTitleLine(company, "", dateLabel, plainChars),
    widthPx: listColumnWidthsPx(cols),
    variant,
  };
}

function centerLine(text: string, width: number): string {
  const t = text.trim();
  const pad = Math.max(0, Math.floor((width - t.length) / 2));
  return " ".repeat(pad) + t;
}

/** Encabezado ERP: empresa/fecha, PAG + filtro (der), título centrado. */
export function listReportHeadRows(
  reportTitle: string,
  saleDate: string,
  cols: ListColWidth[],
  plainChars: number,
  filterLabel?: string,
): PreviewRow[] {
  const filter = filterLabel?.trim();
  const filterText = filter ? `Filtro: ${filter}` : "";
  return [
    listCompanyDateRow(COMPANY_NAME_REPORT, `FECHA : ${saleDate}`, cols, plainChars, "section"),
    filterText
      ? listMetaRow(formatListTitleLine("PAG: 1", "", filterText, plainChars), cols, "section")
      : listMetaRow("PAG: 1", cols, "section"),
    listMetaRow(centerLine(reportTitle, plainChars), cols, "section"),
  ];
}

export function listRuleRow(
  cols: ListColWidth[],
  plainChars: number,
  variant?: RowVariant,
): PreviewRow {
  return { kind: "listRule", widthPx: listColumnWidthsPx(cols), plainChars, variant };
}

export function listCellsRow(
  cells: string[],
  cols: ListColWidth[],
  options?: { layout?: "table" | "title"; variant?: RowVariant },
): PreviewRow {
  const layout = options?.layout ?? "table";
  const listCols = cols.map((col) => ({
    w: col.w,
    widthPx: col.widthPx ?? Math.round(col.w * LIST_CHAR_FALLBACK_PX),
    align: col.align ?? ("left" as const),
  }));
  return {
    kind: "listCells",
    layout,
    cells: [...cells],
    widthCh: listCols.map((col) => col.w),
    widthPx: listCols.map((col) => col.widthPx),
    align: listCols.map((col) => col.align ?? "left"),
    variant: options?.variant,
    plainText: layout === "table" ? formatListCellsLine(cells, listCols) : undefined,
  };
}

/** Encabezados de columna siempre alineados a la izquierda en el reporte. */
export function listHeaderCols(cols: ListColWidth[]): ListColWidth[] {
  return cols.map((col) => ({ ...col, align: "left" as const }));
}

/** Ancho útil de texto (caracteres) dentro de márgenes laterales del ticket 80 mm. */
export const THERMAL_LINE_CHARS = 38;
export const THERMAL_SIDE_PAD_CH = 0;
export const THERMAL_SIDE_PAD_PX = 4;
export const THERMAL_LOGO_WIDTH_EM = 11;
export const THERMAL_LOGO_GAP_EM = 1.15;

const LABEL_W = 18;
const AMOUNT_W = 10;
const EXTRA_W = 10;
const THERMAL_RULE_CHAR = "-";

function clip(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

function wrapToLines(text: string, max = THERMAL_LINE_CHARS): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= max) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word.length > max ? word.slice(0, max) : word;
  }
  if (current) lines.push(current);
  return lines;
}

function thermalLine(text: string): string {
  const clipped = clip(text, THERMAL_LINE_CHARS);
  return clipped.padEnd(THERMAL_LINE_CHARS);
}

function centerThermal(text: string): string {
  const t = clip(text.trim(), THERMAL_LINE_CHARS);
  const totalPad = Math.max(0, THERMAL_LINE_CHARS - t.length);
  const left = Math.floor(totalPad / 2);
  return " ".repeat(left) + t + " ".repeat(totalPad - left);
}

function thermalSeparatorLine(): string {
  return THERMAL_RULE_CHAR.repeat(THERMAL_LINE_CHARS);
}

function amt(value: number): string {
  return value.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function amtShort(value: number): string {
  const formatted = amt(value);
  return formatted.endsWith(",00") ? formatted.slice(0, -3) : formatted;
}

function correlativoShort(from: number, to: number): string {
  if (from === 0 && to === 0) return "0-0";
  return `${from}-${to}`;
}

function soles(value: number): string {
  return `S/ ${amt(value)}`;
}

function solesShort(value: number): string {
  return `S/ ${amtShort(value)}`;
}

function row3Text(label: string, mid: string, right: string): string {
  const trimmed = label.trim();
  if (!trimmed) {
    const pad = " ".repeat(LABEL_W);
    if (mid && right) {
      return pad + clip(mid, AMOUNT_W).padStart(AMOUNT_W) + clip(right, EXTRA_W).padStart(EXTRA_W);
    }
    if (mid && !right) {
      return pad + clip(mid, AMOUNT_W + EXTRA_W).padStart(AMOUNT_W + EXTRA_W);
    }
    if (!mid && right) {
      return pad + clip(right, AMOUNT_W + EXTRA_W).padStart(AMOUNT_W + EXTRA_W);
    }
    return pad;
  }

  const l = clip(trimmed, LABEL_W).padEnd(LABEL_W);
  const tailW = AMOUNT_W + EXTRA_W;

  if (mid && !right) {
    return l + clip(mid, tailW).padStart(tailW);
  }
  if (!mid && right) {
    return l + clip(right, tailW).padStart(tailW);
  }
  const m = clip(mid, AMOUNT_W).padStart(AMOUNT_W);
  const r = clip(right, EXTRA_W).padStart(EXTRA_W);
  return l + m + r;
}

function row3(
  rows: PreviewRow[],
  c1: string,
  c2: string,
  c3: string,
  variant: RowVariant = "normal",
): void {
  rows.push({ kind: "cols3", c1, c2, c3, variant });
}

/** Misma normalización que impresión ESC/POS (ASCII sin tildes). */
export function normalizeThermalPrintText(text: string): string {
  return text
    .replace(/[áàäâ]/gi, "a")
    .replace(/[éèëê]/gi, "e")
    .replace(/[íìïî]/gi, "i")
    .replace(/[óòöô]/gi, "o")
    .replace(/[úùüû]/gi, "u")
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "N");
}

export function previewRowsToPlainText(rows: PreviewRow[]): string {
  const out: string[] = [];
  for (const row of rows) {
    if (row.kind === "blank") {
      out.push("");
    } else if (row.kind === "separator") {
      out.push(thermalSeparatorLine());
    } else if (row.kind === "header") {
      if (row.address) {
        for (const line of wrapToLines(row.text.trim(), THERMAL_LINE_CHARS).slice(0, 2)) {
          out.push(centerThermal(line));
        }
      } else {
        out.push(centerThermal(row.text.trim()));
      }
    } else if (row.kind === "meta" || row.kind === "fixed") {
      out.push(thermalLine(row.text));
    } else if (row.kind === "decor") {
      out.push(thermalLine(row.text));
    } else if (row.kind === "metaField") {
      const val = row.timeRange ? `${row.value} · ${row.timeRange}` : row.value;
      out.push(thermalLine(`${row.label}: ${val}`));
    } else if (row.kind === "listCells") {
      if (row.plainText) {
        out.push(row.plainText);
      } else if (row.layout === "title") {
        out.push(row.cells.join("  "));
      } else {
        out.push(
          formatListCellsLine(
            row.cells,
            row.widthCh.map((w, i) => ({ w, align: row.align[i] })),
          ),
        );
      }
    } else if (row.kind === "listRule") {
      out.push("-".repeat(row.plainChars));
    } else if (row.kind === "listMeta") {
      out.push(row.text);
    } else if (row.kind === "cols3") {
      out.push(thermalLine(row3Text(row.c1, row.c2, row.c3)));
    }
  }
  return out.join("\n");
}

export function maxPreviewRowChars(rows: PreviewRow[]): number {
  let max = 0;
  for (const row of rows) {
    if (row.kind === "fixed" || row.kind === "meta") {
      max = Math.max(max, row.text.length);
    } else if (row.kind === "metaField") {
      const rangeLen = row.timeRange ? 3 + row.timeRange.length : 0;
      max = Math.max(max, row.label.length + 2 + row.value.length + rangeLen);
    } else if (row.kind === "decor") {
      max = Math.max(max, row.text.length);
    } else if (row.kind === "header") {
      max = Math.max(max, row.text.trim().length);
    } else if (row.kind === "cols3") {
      max = Math.max(max, row.c1.length + row.c2.length + row.c3.length + 8);
    } else if (row.kind === "listCells") {
      if (row.layout === "title") {
        max = Math.max(max, row.plainText?.length ?? row.cells.reduce((sum, cell) => sum + cell.length + 2, 0));
      } else {
        max = Math.max(
          max,
          row.plainText?.length ??
            formatListCellsLine(
              row.cells,
              row.widthCh.map((w, i) => ({ w, align: row.align[i] })),
            ).length,
        );
      }
    } else if (row.kind === "listRule") {
      max = Math.max(max, row.plainChars);
    } else if (row.kind === "listMeta") {
      max = Math.max(max, row.text.length);
    }
  }
  return max || THERMAL_LINE_CHARS + THERMAL_SIDE_PAD_CH * 2;
}

export function buildThermalPrintPreview(
  data: SalesReportExportData,
  meta: PrintPreviewMeta,
  options?: { printedAt?: Date },
): PreviewRow[] {
  const { docs, monetary, groups, articles, grandTotal } = data;
  const printedAt = options?.printedAt ?? new Date();
  const rows: PreviewRow[] = [];

  const rule = () => rows.push({ kind: "separator", text: "" });
  const headerBlock = (text: string) => {
    for (const line of wrapToLines(text)) {
      rows.push({ kind: "header", text: line });
    }
  };
  const metaBlock = (text: string, variant?: "total") => {
    for (const line of wrapToLines(text)) {
      rows.push({ kind: "meta", text: line, variant });
    }
  };
  const metaField = (label: string, value: string, timeRange?: string) => {
    rows.push({ kind: "metaField", label, value, timeRange });
  };
  const section = (title: string, col2: string, col3: string) => {
    row3(rows, title, col2, col3, "section");
  };

  rows.push({ kind: "header", text: COMPANY_ADDRESS, address: true });
  headerBlock(`SUCURSAL: ${meta.branch}`);
  headerBlock(`RUC: ${meta.ruc}`);
  rule();
  rows.push({ kind: "header", text: "REPORTE DE VENTAS", title: true });
  metaField("FECHA VTA.", meta.saleDate);
  metaField(
    "HORA A/C.",
    formatThermalSessionTimeRange(meta.sessionOpenedAt, meta.sessionClosedAt) ?? "—",
  );
  metaField("PUNTO VTA.", meta.registerLabel);
  metaField("IMPRESIÓN", formatThermalPrintDateTime(printedAt));
  rule();

  section("DOCS. EMITIDOS", "Total", "Numero");
  row3(rows, "Docs. boleta", String(docs.boletas), correlativoShort(docs.boletaFrom, docs.boletaTo));
  row3(rows, "Docs. nota vta.", String(docs.notas), correlativoShort(docs.notaFrom, docs.notaTo));
  row3(rows, "Docs. factura", String(docs.facturas), correlativoShort(docs.facturaFrom, docs.facturaTo));
  row3(rows, "Docs. anulados", String(docs.anulados), "");
  row3(rows, "*Total docs.", String(docs.total), "", "total");
  rule();

  section("VENTA MONETARIA", "Total", "");
  metaBlock("*1. Por venta:", "total");
  row3(rows, "Contado", soles(monetary.contado), "");
  row3(rows, "Tarjeta", soles(monetary.tarjeta ?? 0), "");
  for (const card of monetary.cards ?? []) {
    row3(rows, card.label, soles(card.total), "");
  }
  row3(rows, "Banco", soles(monetary.banco ?? 0), "");
  row3(rows, "Credito", soles(monetary.credito), "");
  row3(rows, "*TOTAL VENTA", soles(monetary.total), "", "total");
  rule();

  section("VENTA LINEAS/GRUPO", "Total", "%");
  for (const g of groups) {
    row3(rows, g.group, soles(g.total), `${g.percent.toFixed(2)}%`);
  }
  row3(rows, "*Total lineas", soles(grandTotal), `${(grandTotal > 0 ? 100 : 0).toFixed(2)}%`, "total");
  rule();

  section("VENTA ARTICULOS", "Cantidad", "Total");
  for (const a of articles) {
    row3(rows, a.description, `${a.qty.toFixed(2)} UND`, soles(a.total));
  }
  row3(rows, "*Total lineas", "", solesShort(grandTotal), "total");
  rule();

  section("TIPOS DE VENTA", "Importe", "%");
  row3(rows, "Mercaderia", soles(grandTotal), `${grandTotal > 0 ? 100 : 0}%`);
  row3(
    rows,
    "*Total ventas",
    soles(grandTotal),
    `${(grandTotal > 0 ? 100 : 0).toFixed(2)}%`,
    "total",
  );
  rule();

  row3(rows, "COMANDAS:", "", "", "section");
  row3(rows, "ARTICULOS", "Cantidad", "Total", "section");
  row3(rows, "*Total lineas", "", soles(0), "total");

  return rows;
}

export const THERMAL_PAPER_WIDTH_MM = 80;
/** 80 mm a 96 dpi — ancho del ticket en pantalla/impresión. */
export const THERMAL_PAPER_WIDTH_PX = Math.round((THERMAL_PAPER_WIDTH_MM / 25.4) * 96);

/** Vista preliminar: márgenes simétricos y ancho legible en pantalla. */
export const THERMAL_PREVIEW_CONTENT_WIDTH_MM = 72;
export const THERMAL_PREVIEW_CONTENT_WIDTH_PX = Math.round(
  (THERMAL_PREVIEW_CONTENT_WIDTH_MM / 25.4) * 96,
);
export const THERMAL_PREVIEW_INSET_LEFT_PX = 10;
export const THERMAL_PREVIEW_INSET_RIGHT_PX = 10;

/** Impresión física: más margen derecho y desplazamiento para cabezal térmico. */
export const THERMAL_PRINT_CONTENT_WIDTH_MM = 68;
export const THERMAL_PRINT_CONTENT_WIDTH_PX = Math.round(
  (THERMAL_PRINT_CONTENT_WIDTH_MM / 25.4) * 96,
);
export const THERMAL_PRINT_INSET_LEFT_PX = 7;
export const THERMAL_PRINT_INSET_RIGHT_PX = 38;

/** @deprecated Usar THERMAL_PREVIEW_* o THERMAL_PRINT_* */
export const THERMAL_CONTENT_WIDTH_MM = THERMAL_PRINT_CONTENT_WIDTH_MM;
export const THERMAL_CONTENT_WIDTH_PX = THERMAL_PRINT_CONTENT_WIDTH_PX;
export const THERMAL_BODY_INSET_LEFT_PX = THERMAL_PRINT_INSET_LEFT_PX;
export const THERMAL_BODY_INSET_RIGHT_PX = THERMAL_PRINT_INSET_RIGHT_PX;
/** 203 dpi típico en térmicas 80 mm (Star/Epson). */
export const THERMAL_PAPER_WIDTH_DOTS = Math.round((THERMAL_PAPER_WIDTH_MM / 25.4) * 203);

export function estimateThermalPageHeightMm(
  rows: PreviewRow[],
  lineHeight = 1.2,
  fontSizePt = 9,
): number {
  const plain = previewRowsToPlainText(rows);
  const lineCount = Math.max(1, plain.split("\n").length);
  const mmPerLine = (fontSizePt / 72) * 25.4 * lineHeight;
  const logoMm = (fontSizePt / 72) * 25.4 * (THERMAL_LOGO_WIDTH_EM * 0.5 + THERMAL_LOGO_GAP_EM + 1.2);
  return Math.min(1200, Math.ceil(lineCount * mmPerLine + logoMm + 12));
}

export type ReceiptPrintStyle = {
  fontFamily: string;
  fontSizePt: number;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  fontStretch?: string;
  letterSpacing?: string;
  lineHeight: number;
  maxWidthPx?: number;
  wideLayout?: boolean;
  logoSrc?: string;
  /** Ticket 80 mm centrado en hoja A4 (impresoras de oficina). */
  officePrint?: boolean;
};

function escReceiptHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function receiptRowVariantStyle(variant?: RowVariant): string {
  if (variant === "total") return `font-weight:700;color:${THERMAL_TOTAL_COLOR};`;
  if (variant === "section") return "font-weight:700;";
  return "";
}

export function buildReceiptPrintHtml(rows: PreviewRow[], style: ReceiptPrintStyle): string {
  if (!style.wideLayout) {
    return buildThermalPrePrintHtml(rows, style);
  }
  return buildWideReceiptPrintHtml(rows, style);
}

export const THERMAL_LOGO_PLACEHOLDER = "{{BOCASOFT_LOGO_URI}}";

function buildThermalPrePrintHtml(rows: PreviewRow[], style: ReceiptPrintStyle): string {
  const body = buildThermalReceiptBodyHtml(rows);
  const logoSrc = style.logoSrc ?? THERMAL_LOGO_PLACEHOLDER;
  const fontFaces = buildPrintFontFaceCss(style.fontFamily);
  const pageHeightMm = Math.max(
    80,
    estimateThermalPageHeightMm(rows, style.lineHeight, style.fontSizePt),
  );
  const ticketStyles = `
      .logo-wrap{width:100%;text-align:center;margin:0 0 ${THERMAL_LOGO_GAP_EM}em;line-height:0;}
      .logo{
        display:inline-block;
        width:${THERMAL_LOGO_WIDTH_EM}em;max-width:100%;height:auto;
        object-fit:contain;vertical-align:top;
      }
      .tr-body{
        width:100%;max-width:${THERMAL_PRINT_CONTENT_WIDTH_PX}px;
        font-family:${style.fontFamily};font-size:${style.fontSizePt}pt;
        font-weight:${style.fontWeight};font-style:${style.fontStyle};
        ${style.fontStretch ? `font-stretch:${style.fontStretch};` : ""}
        ${style.letterSpacing ? `letter-spacing:${style.letterSpacing};` : ""}
        line-height:${style.lineHeight};
      }
      ${THERMAL_RECEIPT_ROW_CSS}`;

  if (style.officePrint) {
    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
    <style>
      ${fontFaces}
      @page { size: A4 portrait; margin: 12mm; }
      html,body{margin:0;padding:0;}
      body{
        display:flex;justify-content:center;
        width:auto;max-width:none;
        color:#000;
        -webkit-print-color-adjust:exact;
        print-color-adjust:exact;
      }
      .ticket-sheet{
        box-sizing:border-box;
        width:${THERMAL_PAPER_WIDTH_PX}px;
        max-width:${THERMAL_PAPER_WIDTH_PX}px;
        padding:4px ${THERMAL_PRINT_INSET_RIGHT_PX}px 8px ${THERMAL_PRINT_INSET_LEFT_PX}px;
      }
      ${ticketStyles}
    </style></head><body>
    <div class="ticket-sheet">
    <div class="logo-wrap"><img class="logo" src="${logoSrc}" alt=""/></div>
    <div class="tr-body">${body}</div>
    </div></body></html>`;
  }

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
    <meta name="bocasoft-thermal-height-mm" content="${pageHeightMm}" />
    <style>
      ${fontFaces}
      @page { size: ${THERMAL_PAPER_WIDTH_MM}mm ${pageHeightMm}mm; margin: 0; }
      html,body{margin:0;padding:0;}
      @media print{
        html,body{height:auto!important;overflow:visible!important;}
      }
      body{
        margin:0;
        padding:4px ${THERMAL_PRINT_INSET_RIGHT_PX}px 8px ${THERMAL_PRINT_INSET_LEFT_PX}px;
        width:${THERMAL_PAPER_WIDTH_PX}px;
        max-width:${THERMAL_PAPER_WIDTH_PX}px;
        box-sizing:border-box;
        color:#000;
        font-size:${style.fontSizePt}pt;
        -webkit-print-color-adjust:exact;
        print-color-adjust:exact;
        -webkit-font-smoothing:antialiased;
        text-rendering:geometricPrecision;
      }
      ${ticketStyles}
    </style></head><body>
    <div class="logo-wrap"><img class="logo" src="${logoSrc}" alt=""/></div>
    <div class="tr-body">${body}</div></body></html>`;
}

function buildWideReceiptPrintHtml(rows: PreviewRow[], style: ReceiptPrintStyle): string {
  const esc = escReceiptHtml;
  const body = rows
    .map((row) => {
      if (row.kind === "blank") return "<div style='height:0.5em'></div>";
      if (row.kind === "header") {
        return `<div style="text-align:center;">${esc(row.text.trim())}</div>`;
      }
      if (row.kind === "separator" || row.kind === "listRule") {
        return "<div style='height:0.35em'></div>";
      }
      if (row.kind === "meta" || row.kind === "fixed" || row.kind === "listMeta") {
        const variant = row.variant;
        const nowrap = row.kind !== "meta" ? "white-space:pre;" : "";
        return `<div style="text-align:left;${receiptRowVariantStyle(variant)}${nowrap}">${esc(row.text)}</div>`;
      }
      if (row.kind === "cols3") {
        const variant = row.variant;
        return `<div style="white-space:pre;${receiptRowVariantStyle(variant)}">${esc(row3Text(row.c1, row.c2, row.c3))}</div>`;
      }
      if (row.kind === "listCells") {
        const variant = row.variant;
        if (row.plainText) {
          return `<div style="white-space:pre;${receiptRowVariantStyle(variant)}">${esc(row.plainText)}</div>`;
        }
        const cells = row.cells
          .map(
            (cell, j) =>
              `<span style="display:inline-block;${row.align[j] === "right" ? "text-align:right;" : row.align[j] === "center" ? "text-align:center;" : ""}">${esc(cell)}</span>`,
          )
          .join("");
        return `<div style="${receiptRowVariantStyle(variant)}">${cells}</div>`;
      }
      return "";
    })
    .join("");

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><style>
      @page { size: landscape; margin: 10mm; }
      html,body{margin:0;padding:0;height:auto;overflow:visible;}
      @media print{
        html,body{height:auto!important;overflow:visible!important;}
        body{page-break-before:avoid;page-break-after:avoid;page-break-inside:avoid;break-inside:avoid-page;}
        .receipt-sheet{page-break-inside:avoid;break-inside:avoid-page;}
      }
      body{margin:0;padding:4px 2px;font-family:${style.fontFamily};font-size:${style.fontSizePt}pt;font-weight:${style.fontWeight};font-style:${style.fontStyle};${style.fontStretch ? `font-stretch:${style.fontStretch};` : ""}${style.letterSpacing ? `letter-spacing:${style.letterSpacing};` : ""}line-height:${style.lineHeight};color:#000;max-width:none;}
    </style></head><body><div class="receipt-sheet">${body}</div></body></html>`;
}
