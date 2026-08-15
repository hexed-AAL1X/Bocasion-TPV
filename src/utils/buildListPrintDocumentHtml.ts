import { COMPANY_ADDRESS, COMPANY_NAME_REPORT } from "../config/brand";

const SECTION_BG = "#D4D0C8";
const BORDER = "#000000";

function escHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type ListDocumentHtmlOptions = {
  pageTitle: string;
  reportTitle: string;
  metaLines: string[];
  headers: string[];
  rows: string[][];
  rightAlignIndices?: number[];
  footerLine?: string;
};

/** HTML tabular (plantilla Cierre de Caja) para Excel/Word cuando se requiera formato de hoja. */
export function buildListDocumentHtml(options: ListDocumentHtmlOptions): string {
  const { pageTitle, reportTitle, metaLines, headers, rows, rightAlignIndices = [], footerLine } =
    options;
  const rightAlign = new Set(rightAlignIndices);
  const colCount = headers.length;
  const colgroup = `<colgroup>
  <col class="col-margin"/>
  ${headers.map((_, i) => `<col class="col-data col-${i}"/>`).join("\n  ")}
</colgroup>`;

  const headerCells = headers
    .map(
      (header, i) =>
        `<th class="${rightAlign.has(i) ? "num" : ""}" bgcolor="${SECTION_BG}">${escHtml(header)}</th>`,
    )
    .join("");

  const dataRows = rows
    .map(
      (row) =>
        `<tr><td class="margin"></td>${row
          .map(
            (cell, i) =>
              `<td class="${rightAlign.has(i) ? "num" : ""}">${escHtml(cell)}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("\n");

  const metaHtml = metaLines
    .filter((line) => line.trim())
    .map((line) => `<tr><td class="margin"></td><td colspan="${colCount}" class="meta">${escHtml(line)}</td></tr>`)
    .join("\n");

  const footerHtml = footerLine?.trim()
    ? `<tr class="spacer"><td class="margin"></td><td colspan="${colCount}"></td></tr>
<tr><td class="margin"></td><td colspan="${colCount}" class="footer">${escHtml(footerLine)}</td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>${escHtml(pageTitle)}</title>
<style>
  * { box-sizing: border-box; }
  @page { size: landscape; margin: 10mm 12mm; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10pt;
    color: #000;
    margin: 0;
    padding: 12px 16px;
    background: #fff;
  }
  .report-sheet {
    border-collapse: collapse;
    table-layout: auto;
    width: 100%;
  }
  .report-sheet col.col-margin { width: 20px; }
  .report-sheet td,
  .report-sheet th {
    border: 1px solid ${BORDER};
    padding: 2px 5px;
    vertical-align: middle;
    word-wrap: break-word;
    line-height: 1.25;
  }
  .report-sheet th {
    background: ${SECTION_BG};
    font-weight: 700;
    text-align: left;
  }
  .report-sheet th.num,
  .report-sheet td.num {
    text-align: right;
  }
  .report-sheet td.margin,
  .report-sheet th.margin {
    border: none;
    background: transparent;
    width: 20px;
    padding: 0;
  }
  .report-sheet tr.spacer td {
    border: none !important;
    height: 6pt;
    padding: 0;
    background: transparent !important;
  }
  .company { font-size: 12pt; font-weight: 700; border: none !important; }
  .address { font-size: 10pt; border: none !important; }
  .title {
    text-align: center;
    font-size: 11pt;
    font-weight: 700;
    text-decoration: underline;
    border: none !important;
    padding: 4px 0;
  }
  .meta {
    text-align: center;
    font-weight: 700;
    border: none !important;
    padding: 2px 0;
  }
  .footer { font-size: 9pt; border: none !important; }
</style>
</head>
<body>
<table class="report-sheet">
${colgroup}
<tr><td class="margin"></td><td colspan="${colCount}" class="company">${escHtml(COMPANY_NAME_REPORT)}</td></tr>
<tr><td class="margin"></td><td colspan="${colCount}" class="address">${escHtml(COMPANY_ADDRESS)}</td></tr>
<tr class="spacer"><td class="margin"></td><td colspan="${colCount}"></td></tr>
<tr><td class="margin"></td><td colspan="${colCount}" class="title">${escHtml(reportTitle)}</td></tr>
${metaHtml}
<tr class="spacer"><td class="margin"></td><td colspan="${colCount}"></td></tr>
<tr><td class="margin"></td>${headerCells}</tr>
${dataRows}
${footerHtml}
</table>
</body>
</html>`;
}
