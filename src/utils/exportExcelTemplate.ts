import { COMPANY_ADDRESS, COMPANY_NAME_REPORT } from "../config/brand";

/** Columna A = margen izquierdo (plantilla ERP). */
export const EXCEL_COL_MARGIN = 1;

const EXCEL_BORDER_DEF = `
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>`;

export function escapeExcelXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type ExcelCellSpec = {
  value: string | number | null;
  column: number;
  style?: string;
  mergeAcross?: number;
};

export function buildExcelRow(cells: ExcelCellSpec[]): string {
  return `<Row>${cells
    .map((spec) => {
      const { value, column, style, mergeAcross } = spec;
      const indexAttr = ` ss:Index="${column}"`;
      const styleAttr = style ? ` ss:StyleID="${style}"` : "";
      const mergeAttr = mergeAcross ? ` ss:MergeAcross="${mergeAcross}"` : "";
      if (value === null) return `<Cell${indexAttr}${styleAttr}${mergeAttr}/>`;
      const type = typeof value === "number" ? "Number" : "String";
      return `<Cell${indexAttr}${styleAttr}${mergeAttr}><Data ss:Type="${type}">${escapeExcelXml(String(value))}</Data></Cell>`;
    })
    .join("")}</Row>`;
}

export function getExcelStylesXml(): string {
  return `<Styles>
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
   <Borders>${EXCEL_BORDER_DEF}
   </Borders>
  </Style>
  <Style ss:ID="BorderCellBold">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/>
   <Borders>${EXCEL_BORDER_DEF}
   </Borders>
  </Style>
  <Style ss:ID="BorderCellRight">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Arial" ss:Size="10"/>
   <Borders>${EXCEL_BORDER_DEF}
   </Borders>
  </Style>
  <Style ss:ID="SectionHeader">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/>
   <Interior ss:Color="#D4D0C8" ss:Pattern="Solid"/>
   <Borders>${EXCEL_BORDER_DEF}
   </Borders>
  </Style>
  <Style ss:ID="SectionHeaderCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/>
   <Interior ss:Color="#D4D0C8" ss:Pattern="Solid"/>
   <Borders>${EXCEL_BORDER_DEF}
   </Borders>
  </Style>
  <Style ss:ID="TableTotal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/>
   <Borders>${EXCEL_BORDER_DEF}
   </Borders>
  </Style>
  <Style ss:ID="TableTotalRight">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/>
   <Borders>${EXCEL_BORDER_DEF}
   </Borders>
  </Style>
 </Styles>`;
}

export type ExcelListReportOptions = {
  sheetName: string;
  title: string;
  metaLines: string[];
  headers: string[];
  rows: string[][];
  /** Índices de columna (0-based) alineados a la derecha. */
  rightAlignIndices?: number[];
  columnWidths?: number[];
  footerLine?: string;
  hideGridlines?: boolean;
};

function defaultColumnWidths(headers: string[]): number[] {
  return headers.map((header) => Math.min(Math.max(header.length * 8, 56), 280));
}

function dataColumnStart(): number {
  return EXCEL_COL_MARGIN + 1;
}

export function buildExcelListReportContent(options: ExcelListReportOptions): string {
  const {
    sheetName,
    title,
    metaLines,
    headers,
    rows,
    rightAlignIndices = [],
    columnWidths = defaultColumnWidths(headers),
    footerLine,
    hideGridlines = false,
  } = options;

  const colStart = dataColumnStart();
  const mergeAcross = Math.max(headers.length - 1, 0);
  const rightAlign = new Set(rightAlignIndices);
  const bodyRows: string[] = [];

  bodyRows.push(
    buildExcelRow([
      { value: null, column: EXCEL_COL_MARGIN },
      { value: COMPANY_NAME_REPORT, column: colStart, style: "Company" },
    ]),
  );
  bodyRows.push(
    buildExcelRow([
      { value: null, column: EXCEL_COL_MARGIN },
      { value: COMPANY_ADDRESS, column: colStart, style: "Address" },
    ]),
  );
  bodyRows.push(buildExcelRow([{ value: null, column: EXCEL_COL_MARGIN }]));
  bodyRows.push(
    buildExcelRow([
      { value: null, column: EXCEL_COL_MARGIN },
      { value: title, column: colStart, style: "TitleCenter", mergeAcross },
    ]),
  );
  for (const line of metaLines) {
    if (!line.trim()) continue;
    bodyRows.push(
      buildExcelRow([
        { value: null, column: EXCEL_COL_MARGIN },
        { value: line, column: colStart, style: "MetaCenter", mergeAcross },
      ]),
    );
  }
  bodyRows.push(buildExcelRow([{ value: null, column: EXCEL_COL_MARGIN }]));

  bodyRows.push(
    buildExcelRow([
      { value: null, column: EXCEL_COL_MARGIN },
      ...headers.map((header, i) => ({
        value: header,
        column: colStart + i,
        style: rightAlign.has(i) ? "SectionHeaderCenter" : "SectionHeader",
      })),
    ]),
  );

  for (const row of rows) {
    bodyRows.push(
      buildExcelRow([
        { value: null, column: EXCEL_COL_MARGIN },
        ...row.map((cell, i) => ({
          value: cell,
          column: colStart + i,
          style: rightAlign.has(i) ? "BorderCellRight" : "BorderCell",
        })),
      ]),
    );
  }

  if (footerLine?.trim()) {
    bodyRows.push(buildExcelRow([{ value: null, column: EXCEL_COL_MARGIN }]));
    bodyRows.push(
      buildExcelRow([
        { value: null, column: EXCEL_COL_MARGIN },
        { value: footerLine, column: colStart, style: "Address", mergeAcross },
      ]),
    );
  }

  const columnDefs = [
    `<Column ss:Index="${EXCEL_COL_MARGIN}" ss:Width="20"/>`,
    ...columnWidths.map(
      (width, i) => `<Column ss:Index="${colStart + i}" ss:Width="${width}"/>`,
    ),
  ].join("\n   ");

  const worksheetOptions = hideGridlines
    ? `  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <DoNotDisplayGridlines/>
  </WorksheetOptions>
 `
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 ${getExcelStylesXml()}
 <Worksheet ss:Name="${escapeExcelXml(sheetName.slice(0, 31))}">
${worksheetOptions}  <Table>
   ${columnDefs}
   ${bodyRows.join("\n   ")}
  </Table>
 </Worksheet>
</Workbook>`;
}
