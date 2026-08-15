import { COMPANY_ADDRESS, COMPANY_NAME_REPORT } from "../config/brand";
import { POS_BRANCH } from "../config/pos";
import type { SalesReportExportData } from "./exportSalesReportXls";

function correlativo(from: number, to: number): string {
  if (from === 0 && to === 0) return "0 al 0";
  return `${from} al ${to}`;
}

function money(n: number): string {
  return `S/  ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pct(n: number): string {
  return `${n.toFixed(2)}%`;
}

function escHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const REPORT_COL_GROUP = `<colgroup>
  <col class="col-margin"/>
  <col class="col-b"/>
  <col class="col-c"/>
  <col class="col-d"/>
  <col class="col-e"/>
</colgroup>`;

function htmlDataRow(
  label: string,
  d: string,
  e: string,
  rowClass = "",
  options?: { dNum?: boolean; eNum?: boolean; bold?: boolean },
): string {
  const cls = rowClass ? ` class="${rowClass}"` : "";
  const labelCls = options?.bold ? "label bold" : "label";
  const dCls = options?.dNum !== false && d ? "num" : "";
  const eCls = options?.eNum && e ? "num" : "";
  return `<tr${cls}>
    <td class="margin"></td>
    <td colspan="2" class="${labelCls}">${escHtml(label)}</td>
    <td${dCls ? ` class="${dCls}"` : ""}>${escHtml(d)}</td>
    <td${eCls ? ` class="${eCls}"` : ""}>${escHtml(e)}</td>
  </tr>`;
}

function htmlSectionRow(title: string, d: string, e: string): string {
  return `<tr class="section">
    <td class="margin"></td>
    <th class="section-title">${escHtml(title)}</th>
    <th class="section-fill"></th>
    <th class="num">${escHtml(d)}</th>
    <th class="${e ? "num" : "section-fill"}">${escHtml(e)}</th>
  </tr>`;
}

function htmlBannerRow(title: string): string {
  return `<tr class="section">
    <td class="margin"></td>
    <th class="section-title">${escHtml(title)}</th>
    <th class="section-fill"></th>
    <th class="section-fill"></th>
    <th class="section-fill"></th>
  </tr>`;
}

function htmlCompanyLine(text: string, className: string): string {
  return `<tr>
    <td class="margin"></td>
    <td class="${className}">${escHtml(text)}</td>
    <td colspan="3" class="header-fill"></td>
  </tr>`;
}

function htmlTitleLine(text: string, className: string): string {
  return `<tr>
    <td class="margin"></td>
    <td colspan="4" class="${className}">${escHtml(text)}</td>
  </tr>`;
}

function htmlSpacerRow(): string {
  return `<tr class="spacer"><td class="margin"></td><td colspan="4"></td></tr>`;
}

const REPORT_HTML_STYLES = `
  * { box-sizing: border-box; }
  @page { size: A4 portrait; margin: 10mm 12mm; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    color: #000;
    margin: 0;
    padding: 12px 16px;
    background: #fff;
  }
  .report-sheet {
    border-collapse: collapse;
    table-layout: fixed;
    width: 600px;
    max-width: 100%;
  }
  .report-sheet col.col-margin { width: 20px; }
  .report-sheet col.col-b { width: 130px; }
  .report-sheet col.col-c { width: 240px; }
  .report-sheet col.col-d { width: 100px; }
  .report-sheet col.col-e { width: 110px; }
  .report-sheet td,
  .report-sheet th {
    border: 1px solid #000;
    padding: 2px 5px;
    vertical-align: middle;
    word-wrap: break-word;
    line-height: 1.25;
  }
  .report-sheet .margin {
    border: none !important;
    padding: 0;
    background: transparent !important;
  }
  .report-sheet tr.spacer td {
    border: none !important;
    height: 8px;
    padding: 0;
    background: transparent !important;
  }
  .report-sheet .company {
    font-size: 12px;
    font-weight: 700;
    border: none !important;
    text-align: left;
    background: transparent !important;
  }
  .report-sheet .address {
    border: none !important;
    text-align: left;
    background: transparent !important;
    white-space: nowrap;
  }
  .report-sheet .title-center {
    border: none !important;
    text-align: center;
    font-weight: 700;
    text-decoration: underline;
    font-size: 11px;
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
    background: #d4d0c8;
    font-weight: 700;
    text-align: left;
  }
  .report-sheet th.section-title { width: 130px; }
  .report-sheet th.section-fill { background: #d4d0c8; }
  .report-sheet th.num { text-align: right; }
  .report-sheet .label { text-align: left; }
  .report-sheet .num { text-align: right; white-space: nowrap; }
  .report-sheet .bold { font-weight: 700; }
  .report-sheet tr.total td { font-weight: 700; }
  @media print {
    body { padding: 0; }
    .report-sheet { width: 600px; page-break-inside: avoid; }
  }
`;

export function buildSalesReportHtml(data: SalesReportExportData): string {
  const { docs, monetary, groups, articles, grandTotal, saleDate, vendorLabel } = data;
  const metaLine = `Tienda: ${POS_BRANCH} /Vendedor: ${vendorLabel} /Fecha: ${saleDate}`;

  const docRows = [
    ["Docs. boleta", String(docs.boletas), correlativo(docs.boletaFrom, docs.boletaTo)],
    ["Docs. nota vta.", String(docs.notas), correlativo(docs.notaFrom, docs.notaTo)],
    ["Docs. factura", String(docs.facturas), correlativo(docs.facturaFrom, docs.facturaTo)],
    ["Docs. anulados", String(docs.anulados), ""],
    ["Total docs. emitidos", String(docs.total), ""],
  ]
    .map(([label, total, corr], i) =>
      htmlDataRow(label, total, corr, i === 4 ? "total" : "", { dNum: true }),
    )
    .join("");

  const groupRows = groups
    .map((g) => htmlDataRow(g.group, money(g.total), pct(g.percent), "", { dNum: true, eNum: true }))
    .join("");

  const articleRows = articles
    .map((a) =>
      htmlDataRow(a.description, `${a.qty.toFixed(2)} UND`, money(a.total), "", {
        dNum: true,
        eNum: true,
      }),
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Cierre de Caja — ${escHtml(saleDate)}</title>
  <style>${REPORT_HTML_STYLES}</style>
</head>
<body>
  <table class="report-sheet">
    ${REPORT_COL_GROUP}
    <tbody>
      ${htmlCompanyLine(COMPANY_NAME_REPORT, "company")}
      ${htmlTitleLine(COMPANY_ADDRESS, "address")}
      ${htmlSpacerRow()}
      ${htmlTitleLine("Cierre de Caja", "title-center")}
      ${htmlTitleLine(metaLine, "meta-center")}
      ${htmlSpacerRow()}

      ${htmlSectionRow("DOCS. EMITIDOS", "Total", "Correlativo")}
      ${docRows}

      ${htmlSectionRow("VENTA MONETARIA", "Total", "")}
      ${htmlDataRow("1. Por venta:", "", "", "subsection", { bold: true, dNum: false })}
      ${htmlDataRow("Contado", money(monetary.contado), "", "", { dNum: true })}
      ${htmlDataRow("Tarjeta", money(monetary.tarjeta ?? 0), "", "", { dNum: true })}
      ${(monetary.cards ?? []).map((card) => htmlDataRow(`  ${card.label}`, money(card.total), "", "", { dNum: true })).join("")}
      ${htmlDataRow("Banco", money(monetary.banco ?? 0), "", "", { dNum: true })}
      ${htmlDataRow("Crédito", money(monetary.credito), "", "", { dNum: true })}
      ${htmlDataRow("TOTAL VENTA EN (S/.)", money(monetary.total), "", "total", { dNum: true })}

      ${htmlSectionRow("VENTA LINEAS/GRUPO", "Total", "Porcentaje")}
      ${groupRows}
      ${htmlDataRow(
        "Total lineas",
        money(grandTotal),
        pct(grandTotal > 0 ? 100 : 0),
        "total",
        { dNum: true, eNum: true },
      )}

      ${htmlSectionRow("VENTA ARTICULOS", "Cantidad", "Total")}
      ${articleRows}
      ${htmlDataRow("Total lineas", "", money(grandTotal), "total", { eNum: true })}

      ${htmlSectionRow("TIPOS DE VENTA", "Importe", "Porcentaje")}
      ${htmlDataRow("Mercaderia", money(grandTotal), pct(grandTotal > 0 ? 100 : 0), "", {
        dNum: true,
        eNum: true,
      })}
      ${htmlDataRow(
        "Total ventas",
        money(grandTotal),
        pct(grandTotal > 0 ? 100 : 0),
        "total",
        { dNum: true, eNum: true },
      )}

      ${htmlBannerRow("C O M A N D A S:")}
      ${htmlSectionRow("ARTICULOS", "Cantidad", "Total")}
      ${htmlDataRow("Total lineas", "", money(0), "total", { eNum: true })}
    </tbody>
  </table>
</body>
</html>`;
}

const TXT_COL = { label: 38, num: 14, extra: 16 } as const;

function txtPad(value: string, width: number, align: "left" | "right" = "left"): string {
  const text = value ?? "";
  if (text.length >= width) return text.slice(0, width);
  return align === "right" ? text.padStart(width) : text.padEnd(width);
}

function txtRow(
  label: string,
  col2 = "",
  col3 = "",
  col4 = "",
  options?: { bold?: boolean; col2Right?: boolean; col3Right?: boolean; col4Right?: boolean },
): string {
  const mark = options?.bold ? (s: string) => s.toUpperCase() : (s: string) => s;
  const parts = [
    txtPad(mark(label), TXT_COL.label),
    txtPad(col2, TXT_COL.num, options?.col2Right === false ? "left" : "right"),
  ];
  if (col3 || col4) {
    parts.push(txtPad(col3, TXT_COL.extra, options?.col3Right === false ? "left" : "right"));
  }
  if (col4) {
    parts.push(txtPad(col4, TXT_COL.num, options?.col4Right === false ? "left" : "right"));
  }
  return parts.join("  ");
}

function txtSectionHeader(title: string, col2: string, col3 = "", col4 = ""): string[] {
  const rule = "=".repeat(72);
  const lines = ["", rule, txtRow(title, col2, col3, col4, { bold: true }), rule];
  return lines;
}

export function buildSalesReportTxt(data: SalesReportExportData): string {
  const { docs, monetary, groups, articles, grandTotal, saleDate, vendorLabel } = data;
  const lines: string[] = [
    COMPANY_NAME_REPORT,
    COMPANY_ADDRESS,
    "",
    (() => {
      const title = "Cierre de Caja";
      const width = 72;
      return title.padStart(Math.floor((width - title.length) / 2) + title.length);
    })(),
    `Tienda: ${POS_BRANCH} / Vendedor: ${vendorLabel} / Fecha: ${saleDate}`,
  ];

  lines.push(...txtSectionHeader("DOCS. EMITIDOS", "Total", "Correlativo"));
  lines.push(txtRow("Docs. boleta", String(docs.boletas), correlativo(docs.boletaFrom, docs.boletaTo)));
  lines.push(txtRow("Docs. nota vta.", String(docs.notas), correlativo(docs.notaFrom, docs.notaTo)));
  lines.push(txtRow("Docs. factura", String(docs.facturas), correlativo(docs.facturaFrom, docs.facturaTo)));
  lines.push(txtRow("Docs. anulados", String(docs.anulados)));
  lines.push(txtRow("Total docs. emitidos", String(docs.total), "", "", { bold: true }));

  lines.push(...txtSectionHeader("VENTA MONETARIA", "Total"));
  lines.push(txtRow("1. Por venta:", "", "", "", { col2Right: false }));
  lines.push(txtRow("Contado", money(monetary.contado)));
  lines.push(txtRow("Tarjeta", money(monetary.tarjeta ?? 0)));
  for (const card of monetary.cards ?? []) {
    lines.push(txtRow(`  ${card.label}`, money(card.total)));
  }
  lines.push(txtRow("Banco", money(monetary.banco ?? 0)));
  lines.push(txtRow("Crédito", money(monetary.credito)));
  lines.push(txtRow("TOTAL VENTA EN (S/.)", money(monetary.total), "", "", { bold: true }));

  lines.push(...txtSectionHeader("VENTA LINEAS/GRUPO", "Total", "Porcentaje"));
  for (const g of groups) {
    lines.push(txtRow(g.group, money(g.total), pct(g.percent)));
  }
  lines.push(
    txtRow("Total lineas", money(grandTotal), pct(grandTotal > 0 ? 100 : 0), "", { bold: true }),
  );

  lines.push(...txtSectionHeader("VENTA ARTICULOS", "Cantidad", "Total"));
  for (const a of articles) {
    lines.push(txtRow(a.description, `${a.qty.toFixed(2)} UND`, money(a.total)));
  }
  lines.push(txtRow("Total lineas", "", money(grandTotal), "", { bold: true }));

  lines.push(...txtSectionHeader("TIPOS DE VENTA", "Importe", "Porcentaje"));
  lines.push(txtRow("Mercaderia", money(grandTotal), pct(grandTotal > 0 ? 100 : 0)));
  lines.push(
    txtRow("Total ventas", money(grandTotal), pct(grandTotal > 0 ? 100 : 0), "", { bold: true }),
  );

  lines.push(...txtSectionHeader("C O M A N D A S", "", ""));
  lines.push(...txtSectionHeader("ARTICULOS", "Cantidad", "Total"));
  lines.push(txtRow("Total lineas", "", money(0), "", { bold: true }));

  return `${lines.join("\n")}\n`;
}

export function downloadBlob(
  content: string | Uint8Array | ArrayBuffer,
  filename: string,
  mime: string,
): string {
  const blob =
    content instanceof Uint8Array
      ? new Blob([Uint8Array.from(content)], { type: mime })
      : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return url;
}

export function openBlobUrl(url: string): void {
  window.open(url, "_blank");
}

export function openReportPrintWindow(
  html: string,
  options?: { preview?: boolean; autoPrint?: boolean },
): Window | null {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return null;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  if (options?.autoPrint) {
    win.onload = () => {
      win.print();
      if (!options?.preview) {
        win.onafterprint = () => win.close();
      }
    };
    if (win.document.readyState === "complete") {
      win.print();
      if (!options?.preview) win.onafterprint = () => win.close();
    }
  }
  return win;
}
