import { COMPANY_ADDRESS, COMPANY_NAME_REPORT } from "../config/brand";
import { POS_BRANCH } from "../config/pos";
import type {
  ArticleSaleRow,
  DocSummary,
  GroupSaleRow,
} from "../types/sales";

export type SalesReportExportData = {
  saleDate: string;
  vendorLabel: string;
  docs: DocSummary;
  monetary: {
    contado: number;
    credito: number;
    tarjeta?: number;
    banco?: number;
    cards?: { label: string; total: number }[];
    total: number;
  };
  groups: GroupSaleRow[];
  articles: ArticleSaleRow[];
  grandTotal: number;
};

const COL = { MARGIN: 1, B: 2, C: 3, D: 4, E: 5 } as const;
const MERGE_TITLE = 3;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function correlativo(from: number, to: number): string {
  if (from === 0 && to === 0) return "0 al 0";
  return `${from} al ${to}`;
}

function formatMoneyCell(amount: number): string {
  const formatted = amount.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `S/  ${formatted}`;
}

function formatQtyCell(qty: number): string {
  return `${qty.toFixed(2)} UND`;
}

function formatPercentCell(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatCountCell(value: number): string {
  return String(value);
}

type CellValue = string | number | null;

type CellSpec = {
  value: CellValue;
  column: number;
  style?: string;
  mergeAcross?: number;
};

function cellXml(spec: CellSpec): string {
  const { value, column, style, mergeAcross } = spec;
  const indexAttr = ` ss:Index="${column}"`;
  const styleAttr = style ? ` ss:StyleID="${style}"` : "";
  const mergeAttr = mergeAcross ? ` ss:MergeAcross="${mergeAcross}"` : "";
  if (value === null) return `<Cell${indexAttr}${styleAttr}${mergeAttr}/>`;
  const type = typeof value === "number" ? "Number" : "String";
  return `<Cell${indexAttr}${styleAttr}${mergeAttr}><Data ss:Type="${type}">${escapeXml(String(value))}</Data></Cell>`;
}

function buildRow(cells: CellSpec[]): string {
  return `<Row>${cells.map(cellXml).join("")}</Row>`;
}

/** Fila de tabla: col. B–E con bordes (A = margen vacío). */
function tableRow(
  b: CellValue,
  c: CellValue,
  d: CellValue,
  e: CellValue,
  styles: { b?: string; c?: string; d?: string; e?: string } = {},
): string {
  return buildRow([
    { value: null, column: COL.MARGIN },
    { value: b, column: COL.B, style: styles.b ?? "BorderCell" },
    { value: c, column: COL.C, style: styles.c ?? "BorderCell" },
    { value: d, column: COL.D, style: styles.d ?? "BorderCell" },
    { value: e, column: COL.E, style: styles.e ?? "BorderCell" },
  ]);
}

function sectionHeader(b: CellValue, d: CellValue, e: CellValue | null = null): string {
  return tableRow(b, null, d, e, {
    b: "SectionHeader",
    c: "SectionHeader",
    d: "SectionHeaderCenter",
    e: e ? "SectionHeader" : "SectionHeader",
  });
}

function buildWorksheet(data: SalesReportExportData): string {
  const { docs, monetary, groups, articles, grandTotal, saleDate, vendorLabel } = data;
  const rows: string[] = [];

  rows.push(
    buildRow([
      { value: null, column: COL.MARGIN },
      { value: COMPANY_NAME_REPORT, column: COL.B, style: "Company" },
    ]),
  );
  rows.push(
    buildRow([
      { value: null, column: COL.MARGIN },
      { value: COMPANY_ADDRESS, column: COL.B, style: "Address" },
    ]),
  );
  rows.push(buildRow([{ value: null, column: COL.MARGIN }]));
  rows.push(
    buildRow([
      { value: null, column: COL.MARGIN },
      {
        value: "Cierre de Caja",
        column: COL.B,
        style: "TitleCenter",
        mergeAcross: MERGE_TITLE,
      },
    ]),
  );
  rows.push(
    buildRow([
      { value: null, column: COL.MARGIN },
      {
        value: `Tienda: ${POS_BRANCH} /Vendedor: ${vendorLabel} /Fecha: ${saleDate}`,
        column: COL.B,
        style: "MetaCenter",
        mergeAcross: MERGE_TITLE,
      },
    ]),
  );
  rows.push(buildRow([{ value: null, column: COL.MARGIN }]));

  rows.push(sectionHeader("DOCS. EMITIDOS", "Total", "Correlativo"));
  rows.push(
    tableRow(null, "Docs. boleta", formatCountCell(docs.boletas), correlativo(docs.boletaFrom, docs.boletaTo), {
      d: "BorderCellRight",
    }),
  );
  rows.push(
    tableRow(null, "Docs. nota vta.", formatCountCell(docs.notas), correlativo(docs.notaFrom, docs.notaTo), {
      d: "BorderCellRight",
    }),
  );
  rows.push(
    tableRow(null, "Docs. factura", formatCountCell(docs.facturas), correlativo(docs.facturaFrom, docs.facturaTo), {
      d: "BorderCellRight",
    }),
  );
  rows.push(
    tableRow(null, "Docs. anulados", formatCountCell(docs.anulados), null, {
      d: "BorderCellRight",
    }),
  );
  rows.push(
    tableRow(null, "Total docs. emitidos", formatCountCell(docs.total), null, {
      c: "TableTotal",
      d: "TableTotalRight",
      e: "TableTotal",
    }),
  );

  rows.push(sectionHeader("VENTA MONETARIA", "Total", null));
  rows.push(tableRow(null, "1. Por venta:", null, null, { c: "BorderCellBold" }));
  rows.push(
    tableRow(null, "Contado", formatMoneyCell(monetary.contado), null, {
      d: "BorderMoney",
    }),
  );
  rows.push(
    tableRow(null, "Tarjeta", formatMoneyCell(monetary.tarjeta ?? 0), null, {
      d: "BorderMoney",
    }),
  );
  for (const card of monetary.cards ?? []) {
    rows.push(
      tableRow(null, `  ${card.label}`, formatMoneyCell(card.total), null, {
        d: "BorderMoney",
      }),
    );
  }
  rows.push(
    tableRow(null, "Banco", formatMoneyCell(monetary.banco ?? 0), null, {
      d: "BorderMoney",
    }),
  );
  rows.push(
    tableRow(null, "Crédito", formatMoneyCell(monetary.credito), null, {
      d: "BorderMoney",
    }),
  );
  rows.push(
    tableRow(null, "TOTAL VENTA EN (S/.)", formatMoneyCell(monetary.total), null, {
      c: "TableTotal",
      d: "TableTotalMoney",
      e: "TableTotal",
    }),
  );

  rows.push(sectionHeader("VENTA LINEAS/GRUPO", "Total", "Porcentaje"));
  for (const g of groups) {
    rows.push(
      tableRow(null, g.group, formatMoneyCell(g.total), formatPercentCell(g.percent), {
        d: "BorderMoney",
        e: "BorderCellRight",
      }),
    );
  }
  rows.push(
    tableRow(
      null,
      "Total lineas",
      formatMoneyCell(grandTotal),
      formatPercentCell(grandTotal > 0 ? 100 : 0),
      {
        c: "TableTotal",
        d: "TableTotalMoney",
        e: "TableTotalRight",
      },
    ),
  );

  rows.push(sectionHeader("VENTA ARTICULOS", "Cantidad", "Total"));
  for (const a of articles) {
    rows.push(
      tableRow(null, a.description, formatQtyCell(a.qty), formatMoneyCell(a.total), {
        d: "BorderCellRight",
        e: "BorderMoney",
      }),
    );
  }
  rows.push(
    tableRow(null, "Total lineas", null, formatMoneyCell(grandTotal), {
      c: "TableTotal",
      d: "TableTotal",
      e: "TableTotalMoney",
    }),
  );

  rows.push(sectionHeader("TIPOS DE VENTA", "Importe", "Porcentaje"));
  rows.push(
    tableRow(null, "Mercaderia", formatMoneyCell(grandTotal), formatPercentCell(grandTotal > 0 ? 100 : 0), {
      d: "BorderMoney",
      e: "BorderCellRight",
    }),
  );
  rows.push(
    tableRow(null, "Total ventas", formatMoneyCell(grandTotal), formatPercentCell(grandTotal > 0 ? 100 : 0), {
      c: "TableTotal",
      d: "TableTotalMoney",
      e: "TableTotalRight",
    }),
  );

  rows.push(
    tableRow("C O M A N D A S:", null, null, null, {
      b: "SectionHeader",
      c: "SectionHeader",
      d: "SectionHeader",
      e: "SectionHeader",
    }),
  );
  rows.push(sectionHeader("ARTICULOS", "Cantidad", "Total"));
  rows.push(
    tableRow(null, "Total lineas", null, formatMoneyCell(0), {
      e: "BorderMoney",
    }),
  );

  const borderDef = `
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Arial" x:Family="Swiss" ss:Size="10"/>
  </Style>
  <Style ss:ID="Company">
   <Font ss:FontName="Arial" ss:Size="12" ss:Bold="1"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Address">
   <Font ss:FontName="Arial" ss:Size="10"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="TitleCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Arial" ss:Size="11" ss:Bold="1" ss:Underline="Single"/>
  </Style>
  <Style ss:ID="MetaCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/>
  </Style>
  <Style ss:ID="BorderCell">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Arial" ss:Size="10"/>
   <Borders>${borderDef}
   </Borders>
  </Style>
  <Style ss:ID="BorderCellBold">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/>
   <Borders>${borderDef}
   </Borders>
  </Style>
  <Style ss:ID="BorderCellRight">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Arial" ss:Size="10"/>
   <Borders>${borderDef}
   </Borders>
  </Style>
  <Style ss:ID="BorderMoney">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Arial" ss:Size="10"/>
   <Borders>${borderDef}
   </Borders>
  </Style>
  <Style ss:ID="SectionHeader">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/>
   <Interior ss:Color="#D4D0C8" ss:Pattern="Solid"/>
   <Borders>${borderDef}
   </Borders>
  </Style>
  <Style ss:ID="SectionHeaderCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/>
   <Interior ss:Color="#D4D0C8" ss:Pattern="Solid"/>
   <Borders>${borderDef}
   </Borders>
  </Style>
  <Style ss:ID="TableTotal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/>
   <Borders>${borderDef}
   </Borders>
  </Style>
  <Style ss:ID="TableTotalRight">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/>
   <Borders>${borderDef}
   </Borders>
  </Style>
  <Style ss:ID="TableTotalMoney">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/>
   <Borders>${borderDef}
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="Hoja1">
  <Table>
   <Column ss:Index="${COL.MARGIN}" ss:Width="20"/>
   <Column ss:Index="${COL.B}" ss:Width="130"/>
   <Column ss:Index="${COL.C}" ss:Width="240"/>
   <Column ss:Index="${COL.D}" ss:Width="100"/>
   <Column ss:Index="${COL.E}" ss:Width="110"/>
   ${rows.join("\n   ")}
  </Table>
 </Worksheet>
</Workbook>`;
}

export function getSalesReportXlsContent(data: SalesReportExportData): string {
  return buildWorksheet(data);
}

export function downloadSalesReportXls(data: SalesReportExportData, filename?: string): void {
  const xml = getSalesReportXlsContent(data);
  const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename ?? `cierre-caja-${data.saleDate.replace(/\//g, "-")}.xls`;
  anchor.click();
  URL.revokeObjectURL(url);
}
