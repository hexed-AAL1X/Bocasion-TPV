import { buildSalesReportHtml } from "./salesReportDocument";
import type { SalesReportExportData } from "./exportSalesReportXls";

const REPORT_SECTION_BG = "#D4D0C8";
const REPORT_BORDER = "#000000";

export function fillEmptyTableCells(html: string): string {
  return html
    .replace(/<td([^>]*)><\/td>/gi, "<td$1>&nbsp;</td>")
    .replace(/<th([^>]*)><\/th>/gi, "<th$1>&nbsp;</th>");
}

/** LibreOffice ignora CSS de clases; los colores deben ir inline en cada celda. */
export function applyInlineReportStyles(html: string): string {
  const thStyle = `background-color:${REPORT_SECTION_BG};font-weight:700;border:1px solid ${REPORT_BORDER};`;
  const tdStyle = `border:1px solid ${REPORT_BORDER};`;

  const withHeaders = html.replace(/<th(\s[^>]*)?>/gi, (_match, attrs = "") => {
    if (/bgcolor=/i.test(attrs)) return `<th${attrs}>`;
    const styleMatch = attrs.match(/style="([^"]*)"/i);
    if (styleMatch) {
      const merged = `${thStyle}${styleMatch[1]}`;
      return `<th${attrs.replace(/style="[^"]*"/i, `style="${merged}"`)} bgcolor="${REPORT_SECTION_BG}">`;
    }
    return `<th${attrs} bgcolor="${REPORT_SECTION_BG}" style="${thStyle}">`;
  });

  return withHeaders.replace(/<td(\s[^>]*)?>/gi, (_match, attrs = "") => {
    if (/class="[^"]*margin/i.test(attrs)) return `<td${attrs}>`;
    if (/style="/i.test(attrs)) {
      const styleMatch = attrs.match(/style="([^"]*)"/i);
      if (!styleMatch) return `<td${attrs}>`;
      if (/border/i.test(styleMatch[1])) return `<td${attrs}>`;
      return `<td${attrs.replace(/style="([^"]*)"/i, `style="${tdStyle}$1"`)}>`;
    }
    return `<td${attrs} style="${tdStyle}">`;
  });
}

/** HTML optimizado para conversión LibreOffice → .doc (pt/cm, sin columna margen). */
export function prepareWordExportHtml(html: string): string {
  let out = html.replace(/<meta name="viewport"[^>]*>/, "");

  out = out.replace(/<col class="col-margin"\/>\s*/g, "");
  out = out.replace(/<td class="margin"><\/td>\s*/g, "");

  out = out.replace(
    /<style>[\s\S]*?<\/style>/,
    `<style>
  * { box-sizing: border-box; }
  @page { size: A4 portrait; margin: 10mm 12mm; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 8pt;
    color: #000;
    margin: 0;
    padding: 0;
    background: #fff;
  }
  .report-sheet {
    border-collapse: collapse;
    table-layout: fixed;
    width: 17cm;
  }
  .report-sheet col.col-b { width: 3.5cm; }
  .report-sheet col.col-c { width: 6.5cm; }
  .report-sheet col.col-d { width: 3cm; }
  .report-sheet col.col-e { width: 4cm; }
  .report-sheet td,
  .report-sheet th {
    border: 1px solid #000;
    padding: 1pt 2pt;
    vertical-align: middle;
    font-size: 8pt;
    line-height: 1.2;
  }
  .report-sheet tr.spacer td {
    border: none !important;
    height: 6pt;
    padding: 0;
    background: transparent !important;
  }
  .report-sheet .company {
    font-size: 9pt;
    font-weight: 700;
    border: none !important;
    text-align: left;
    background: transparent !important;
  }
  .report-sheet .address {
    border: none !important;
    text-align: left;
    background: transparent !important;
  }
  .report-sheet .title-center {
    border: none !important;
    text-align: center;
    font-weight: 700;
    text-decoration: underline;
    font-size: 8pt;
    background: transparent !important;
  }
  .report-sheet .meta-center {
    border: none !important;
    text-align: center;
    font-weight: 700;
    background: transparent !important;
  }
  .report-sheet .header-fill {
    border: none !important;
    padding: 0;
    background: transparent !important;
  }
  .report-sheet th {
    background: ${REPORT_SECTION_BG};
    font-weight: 700;
    text-align: left;
  }
  .report-sheet th.num { text-align: right; }
  .report-sheet .label { text-align: left; }
  .report-sheet .num { text-align: right; white-space: nowrap; }
  .report-sheet .bold { font-weight: 700; }
  .report-sheet tr.total td { font-weight: 700; }
</style>`,
  );

  return applyInlineReportStyles(fillEmptyTableCells(out));
}

export function getSalesReportWordHtml(data: SalesReportExportData): string {
  return prepareWordExportHtml(buildSalesReportHtml(data));
}
