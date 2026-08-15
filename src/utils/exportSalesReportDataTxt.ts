import type { SalesReportExportData } from "./exportSalesReportXls";

function row(section: string, field: string, value: string, number = ""): string {
  return [section, field, value, number].join("\t");
}

/** TXT orientado a datos (TSV) para sistemas externos. */
export function buildSalesReportDataTxt(data: SalesReportExportData): string {
  const lines = [
    row("META", "fecha", data.saleDate),
    row("META", "vendedor", data.vendorLabel),
    row("DOCS", "boleta", String(data.docs.boletas), `${data.docs.boletaFrom}-${data.docs.boletaTo}`),
    row("DOCS", "nota", String(data.docs.notas), `${data.docs.notaFrom}-${data.docs.notaTo}`),
    row("DOCS", "factura", String(data.docs.facturas), `${data.docs.facturaFrom}-${data.docs.facturaTo}`),
    row("DOCS", "anulados", String(data.docs.anulados)),
    row("DOCS", "total", String(data.docs.total)),
    row("VENTA", "contado", data.monetary.contado.toFixed(2)),
    row("VENTA", "credito", data.monetary.credito.toFixed(2)),
    row("VENTA", "total", data.monetary.total.toFixed(2)),
    row("TOTAL", "lineas", data.grandTotal.toFixed(2)),
  ];

  for (const group of data.groups) {
    lines.push(row("GRUPO", group.group, group.total.toFixed(2), group.percent.toFixed(2)));
  }
  for (const article of data.articles) {
    lines.push(
      row("ARTICULO", article.description, article.total.toFixed(2), article.qty.toFixed(2)),
    );
  }

  return `${lines.join("\n")}\n`;
}
