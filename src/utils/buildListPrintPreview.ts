import type { PreviewRow } from "./buildThermalPrintPreview";
import {
  formatListCellsLineWord,
  formatListReportDate,
  listCellsRow,
  listHeaderCols,
  listLineWidthChars,
  listMetaRow,
  listReportHeadRows,
  listRuleRow,
  preserveWordMonoSpaces,
  previewRowsToPlainText,
} from "./buildThermalPrintPreview";
import {
  resolveListPrintColumns,
  toListColWidths,
  type ListPrintColumn,
  type ResolvedListColDef,
} from "./listPrintColumns";

export type BuildListPrintPreviewOptions<T extends string, R extends Record<T, string | number | boolean>> = {
  reportTitle: string;
  saleDate?: string;
  columns?: ListPrintColumn<T>[];
  defaultColumns: ListPrintColumn<T>[];
  rightAlignKeys?: T[];
  rows: R[];
  filterLabel?: string;
  /** Líneas extra bajo el título (p. ej. transportista). */
  extraMetaLines?: string[];
  /** Línea de guiones al final del listado (vehículos/choferes). */
  trailingRule?: boolean;
  /** Columnas cuyo ancho crece si el contenido es más largo. */
  expandContentKeys?: T[];
  /** Formateo de celda al imprimir / exportar (p. ej. booleanos). */
  cellFormatters?: Partial<Record<T, (row: R) => string>>;
};

function expandContentColumnWidths<T extends string, R extends Record<T, string | number | boolean>>(
  cols: ResolvedListColDef<T>[],
  rows: R[],
  keys: T[],
  cellFormatters?: Partial<Record<T, (row: R) => string>>,
): ResolvedListColDef<T>[] {
  if (keys.length === 0) return cols;
  const keySet = new Set(keys);
  return cols.map((col) => {
    if (!keySet.has(col.key)) return col;
    const need = Math.max(
      col.w,
      ...rows.map((row) => rowCellValues(row, [col], cellFormatters)[0]?.length ?? 0),
    );
    return need > col.w ? { ...col, w: need } : col;
  });
}

function filterHeaderText(filterLabel?: string): string | null {
  const label = filterLabel?.trim();
  if (!label) return null;
  return `Filtro: ${label}`;
}

function rowCellValues<T extends string, R extends Record<T, string | number | boolean>>(
  row: R,
  cols: ResolvedListColDef<T>[],
  cellFormatters?: Partial<Record<T, (row: R) => string>>,
): string[] {
  return cols.map((col) => {
    const format = cellFormatters?.[col.key];
    if (format) return format(row);
    return String(row[col.key] ?? "");
  });
}

export function buildListPrintPreview<T extends string, R extends Record<T, string | number | boolean>>(
  options: BuildListPrintPreviewOptions<T, R>,
): PreviewRow[] {
  const {
    reportTitle,
    saleDate,
    columns,
    defaultColumns,
    rightAlignKeys = [],
    rows,
    filterLabel,
    extraMetaLines = [],
    trailingRule = false,
    expandContentKeys = [],
    cellFormatters,
  } = options;

  let cols = resolveListPrintColumns(columns, defaultColumns, rightAlignKeys);
  if (expandContentKeys.length > 0) {
    cols = expandContentColumnWidths(cols, rows, expandContentKeys, cellFormatters);
  }

  const listCols = toListColWidths(cols);
  const headerLabels = cols.map((c) => c.printLabel);
  const plainW = listLineWidthChars(headerLabels, listCols);
  const dateLabel = formatListReportDate(saleDate);
  const out: PreviewRow[] = [];

  out.push(...listReportHeadRows(reportTitle, dateLabel, listCols, plainW, filterLabel));
  for (const line of extraMetaLines) {
    if (line.trim()) out.push(listMetaRow(line.trim(), listCols));
  }
  out.push(listRuleRow(listCols, plainW));
  out.push(listCellsRow(headerLabels, listHeaderCols(listCols), { variant: "section" }));
  out.push(listRuleRow(listCols, plainW));

  for (const row of rows) {
    out.push(listCellsRow(rowCellValues(row, cols, cellFormatters), listCols));
  }

  if (trailingRule) {
    out.push(listRuleRow(listCols, plainW, "section"));
  }

  return out;
}

export function buildListPlainText<T extends string, R extends Record<T, string | number | boolean>>(
  options: BuildListPrintPreviewOptions<T, R>,
): string {
  return previewRowsToPlainText(buildListPrintPreview(options));
}

export type ListExportTableData = {
  sheetName: string;
  title: string;
  metaLines: string[];
  headers: string[];
  rows: string[][];
  rightAlignIndices: number[];
  columnWidthsPx: number[];
  footerLine?: string;
};

export function buildListExportTableData<T extends string, R extends Record<T, string | number | boolean>>(
  options: BuildListPrintPreviewOptions<T, R> & { sheetName: string },
): ListExportTableData {
  const {
    reportTitle,
    saleDate,
    columns,
    defaultColumns,
    rightAlignKeys = [],
    rows,
    filterLabel,
    extraMetaLines = [],
    expandContentKeys = [],
    sheetName,
    cellFormatters,
  } = options;

  let cols = resolveListPrintColumns(columns, defaultColumns, rightAlignKeys);
  if (expandContentKeys.length > 0) {
    cols = expandContentColumnWidths(cols, rows, expandContentKeys, cellFormatters);
  }

  const dateLabel = formatListReportDate(saleDate);
  const filterText = filterHeaderText(filterLabel);
  const metaLines = [
    `FECHA : ${dateLabel}`,
    filterText ? `PAG: 1 — ${filterText}` : "PAG: 1",
    ...extraMetaLines.filter((l) => l.trim()),
  ];
  const rightAlignIndices = cols
    .map((col, i) => (col.align === "right" ? i : -1))
    .filter((i) => i >= 0);

  return {
    sheetName,
    title: reportTitle,
    metaLines,
    headers: cols.map((c) => c.printLabel),
    rows: rows.map((row) => rowCellValues(row, cols, cellFormatters)),
    rightAlignIndices,
    columnWidthsPx: cols.map((c) => c.widthPx),
  };
}

function escHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function previewRowsToPrintHtml(rows: PreviewRow[]): string {
  const out: string[] = [];
  for (const row of rows) {
    if (row.kind === "blank") {
      out.push("<div class=\"blank\"></div>");
    } else if (row.kind === "listRule") {
      const cls = row.variant === "section" ? "rule bold" : "rule";
      out.push(`<div class="${cls}">${escHtml("-".repeat(row.plainChars))}</div>`);
    } else if (row.kind === "listMeta") {
      const cls = row.variant === "section" ? "line bold" : "line";
      out.push(`<div class="${cls}">${escHtml(row.text)}</div>`);
    } else if (row.kind === "listCells") {
      const text =
        row.plainText ??
        row.cells.join("  ");
      const cls = row.variant === "section" ? "line bold" : "line";
      out.push(`<div class="${cls}">${escHtml(text)}</div>`);
    }
  }
  return out.join("\n");
}

function previewRowWordLine(row: PreviewRow): string | null {
  if (row.kind === "blank") return "";
  if (row.kind === "listRule") return preserveWordMonoSpaces("-".repeat(row.plainChars));
  if (row.kind === "listMeta") return preserveWordMonoSpaces(row.text);
  if (row.kind === "listCells") {
    const cols = row.widthCh.map((w, i) => ({ w, align: row.align[i] ?? "left" }));
    return formatListCellsLineWord(row.cells, cols);
  }
  return null;
}

/**
 * Calcula el ancho de página necesario para que todas las filas quepan sin wrap.
 * Courier New 9pt ≈ 1.9 mm/carácter; margen 12mm a cada lado.
 */
function wordPageSizeMm(rows: PreviewRow[]): { w: number; h: number } {
  let maxChars = 0;
  for (const row of rows) {
    if (row.kind === "listRule") maxChars = Math.max(maxChars, row.plainChars);
    else if (row.kind === "listMeta") maxChars = Math.max(maxChars, row.text.length);
  }
  if (maxChars === 0) maxChars = 80;
  const CHAR_MM = 2.0; // Courier New 9pt (con margen de seguridad)
  const MARGINS_MM = 28; // 14mm a cada lado
  const w = Math.max(Math.ceil(maxChars * CHAR_MM) + MARGINS_MM, 297); // mínimo A4 landscape
  const h = 210; // alto A4 fijo
  return { w, h };
}

/** Un bloque pre con NBSP: columnas fijas sin tablas HTML (LibreOffice/Word). */
function previewRowsToWordPreHtml(rows: PreviewRow[]): string {
  const STYLE =
    "margin:0;padding:0;font-family:'Courier New',Courier,monospace;font-size:9pt;" +
    "line-height:1.35;white-space:pre;mso-line-height-rule:exactly;";
  const parts: string[] = [];
  for (const row of rows) {
    if (row.kind === "blank") continue;
    const line = previewRowWordLine(row);
    if (line === null) continue;
    const escaped = escHtml(line);
    const bold = "variant" in row && row.variant === "section";
    parts.push(bold ? `<b>${escaped}</b>` : escaped);
  }
  return `<pre xml:space="preserve" style="${STYLE}">${parts.join("\n")}</pre>`;
}

/** HTML monoespaciado optimizado para LibreOffice / MS Word (negrita en encabezados). */
export function prepareListWordExportHtml(
  rows: PreviewRow[],
  title: string,
  options: ListPrintHtmlOptions = {},
): string {
  const { w, h } = wordPageSizeMm(rows);
  const usePortrait = options.pageOrientation === "portrait";
  const pageRule = usePortrait
    ? "size: A4 portrait; margin: 12mm"
    : `size: ${w}mm ${h}mm; margin: 12mm`;
  return `<!DOCTYPE html>
<html lang="es" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
<meta charset="UTF-8"/>
<meta name="ProgId" content="Word.Document"/>
<meta name="Generator" content="BocaSoft"/>
<meta name="BocaSoft-export" content="list-plain"/>
<title>${escHtml(title)}</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  @page { ${pageRule}; }
  body { margin: 0; color: #000; font-family: "Courier New", Courier, monospace; font-size: 9pt; }
  pre { margin: 0; padding: 0; white-space: pre; line-height: 1.35; }
</style>
</head>
<body>
${previewRowsToWordPreHtml(rows)}
</body>
</html>`;
}

/** HTML monoespaciado para imprimir / PDF / Word / HTML (mismo aspecto que vista preliminar). */
export type ListPrintHtmlOptions = {
  pageOrientation?: "portrait" | "landscape";
};

export function buildListPrintHtml(
  title: string,
  plainText: string,
  options: ListPrintHtmlOptions = {},
): string {
  const pageRule =
    options.pageOrientation === "portrait" ? "size: A4 portrait" : "size: landscape";
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>${escHtml(title)}</title>
<style>
  @page { ${pageRule}; margin: 12mm; }
  body { font-family: "Courier New", Courier, monospace; font-size: 9pt; margin: 0; color: #000; }
  pre { margin: 0; white-space: pre; line-height: 1.35; }
</style>
</head>
<body><pre>${escHtml(plainText)}</pre></body>
</html>`;
}

export function buildListPrintHtmlFromRows(
  title: string,
  rows: PreviewRow[],
  options: ListPrintHtmlOptions = {},
): string {
  const pageRule =
    options.pageOrientation === "portrait" ? "size: A4 portrait" : "size: landscape";
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>${escHtml(title)}</title>
<style>
  @page { ${pageRule}; margin: 12mm; }
  body { font-family: "Courier New", Courier, monospace; font-size: 9pt; margin: 0; color: #000; }
  .line { margin: 0; white-space: pre; line-height: 1.35; }
  .line.bold { font-weight: 700; }
  .rule { margin: 0; white-space: pre; line-height: 1.35; }
  .rule.bold { font-weight: 700; }
  .blank { height: 0.6em; }
</style>
</head>
<body>
${previewRowsToPrintHtml(rows)}
</body>
</html>`;
}
