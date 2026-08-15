import { COMPANY_NAME_REPORT } from "../config/brand";
import type { DocsAnnexPrintData } from "./buildDocsAnnexPrintPreview";
import { buildDocsAnnexHtml } from "./buildDocsAnnexPrintPreview";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function xlsCell(value: string, style = "Cell"): string {
  return `<Cell ss:StyleID="${style}"><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}

function xlsRow(cells: string[], style?: string): string {
  return `<Row>${cells.map((c) => xlsCell(c, style)).join("")}</Row>`;
}

const HEADERS = [
  "Fecreg",
  "Documento",
  "Cliente",
  "Total S/",
  "Contado",
  "Crédito",
  "Otros",
  "Tipovta",
  "Forpago",
  "Nro.Cta.",
  "Recibido S/",
  "Vuelto S/",
  "Recibido US$",
  "Vuelto US$",
  "Tarjeta",
  "Banco",
  "Monto S/",
  "T.Camb.",
  "Vendedor",
  "Anulado S/",
  "N° Operac.",
];

function fmtNum(n: number): string {
  if (n === 0) return "";
  return n.toFixed(2);
}

function rowCells(r: DocsAnnexPrintData["rows"][number]): string[] {
  return [
    r.fecreg,
    r.documento,
    r.cliente,
    fmtNum(r.total),
    fmtNum(r.contado),
    fmtNum(r.credito),
    fmtNum(r.otros),
    r.tipovta,
    r.forpago,
    r.nroCta,
    fmtNum(r.recibidoS),
    fmtNum(r.vueltoS),
    fmtNum(r.recibidoUs),
    fmtNum(r.vueltoUs),
    fmtNum(r.tarjeta),
    fmtNum(r.banco),
    fmtNum(r.montoS),
    r.tCamb > 0 ? r.tCamb.toFixed(3) : "",
    r.vendedor,
    fmtNum(r.anulado),
    r.nroOperacion,
  ];
}

function totalCells(t: DocsAnnexPrintData["totals"]): string[] {
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
    fmtNum(t.anulado),
    "",
  ];
}

export function getDocsAnnexXlsContent(data: DocsAnnexPrintData): string {
  const { branch, point, registerLabel, saleDate, rows, totals } = data;
  const tableRows: string[] = [];

  tableRows.push(xlsRow([COMPANY_NAME_REPORT], "Title"));
  tableRows.push(
    xlsRow([
      `Tienda: ${branch}  Caja: ${point}  Responsable: ${registerLabel}  Vta. del día: ${saleDate} 12:00 AM`,
    ]),
  );
  tableRows.push(xlsRow([""]));
  tableRows.push(xlsRow(HEADERS, "Header"));
  for (const row of rows) {
    tableRows.push(xlsRow(rowCells(row)));
  }
  if (rows.length > 0) {
    tableRows.push(xlsRow(totalCells(totals), "Total"));
  }

  const colWidths = HEADERS.map((_, i) => {
    const w = i === 2 ? 180 : i === 0 ? 120 : 72;
    return `<Column ss:Index="${i + 1}" ss:Width="${w}"/>`;
  }).join("\n   ");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Title"><Font ss:FontName="Arial" ss:Size="12" ss:Bold="1"/></Style>
  <Style ss:ID="Header"><Font ss:FontName="Arial" ss:Size="9" ss:Bold="1"/>
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/></Borders>
  </Style>
  <Style ss:ID="Cell"><Font ss:FontName="Courier New" ss:Size="8"/></Style>
  <Style ss:ID="Total"><Font ss:FontName="Courier New" ss:Size="8" ss:Bold="1" ss:Color="#1A7A1A"/></Style>
 </Styles>
 <Worksheet ss:Name="Anexo">
  <Table>
   ${colWidths}
   ${tableRows.join("\n   ")}
  </Table>
 </Worksheet>
</Workbook>`;
}

/** HTML del anexo reutilizable para Word. */
export function getDocsAnnexWordHtml(data: DocsAnnexPrintData): string {
  return buildDocsAnnexHtml(data);
}
