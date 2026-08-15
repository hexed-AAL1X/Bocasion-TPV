import type { DocumentRecord } from "../data/documents";
import type { PreviewRow } from "./buildThermalPrintPreview";
import {
  buildListPlainText,
  buildListPrintHtmlFromRows,
  buildListPrintPreview,
  type BuildListPrintPreviewOptions,
} from "./buildListPrintPreview";
import type { ListPrintColumn } from "./listPrintColumns";

export type DocumentPrintColumnKey =
  | "codigo"
  | "nombre"
  | "registroCompra"
  | "ventaDirecta"
  | "codSunat";

export type DocumentPrintColumn = ListPrintColumn<DocumentPrintColumnKey>;

export type DocumentPrintRow = {
  codigo: string;
  nombre: string;
  registroCompra: string;
  ventaDirecta: string;
  codSunat: string;
};

export type DocumentsPrintData = {
  rows: DocumentRecord[];
  filterLabel?: string;
  saleDate?: string;
  columns?: DocumentPrintColumn[];
};

const DEFAULT_COLUMNS: DocumentPrintColumn[] = [
  { key: "codigo", label: "Codigo", widthPx: 48 },
  { key: "nombre", label: "Nombre", widthPx: 200 },
  { key: "registroCompra", label: "Reg.Compra", widthPx: 72 },
  { key: "ventaDirecta", label: "Vta. Directa", widthPx: 72 },
  { key: "codSunat", label: "Cod. Sunat", widthPx: 64 },
];

function toPrintRows(rows: DocumentRecord[]): DocumentPrintRow[] {
  return rows.map((row) => ({
    codigo: row.codigo,
    nombre: row.nombre,
    registroCompra: row.registroCompra ? "Si" : "",
    ventaDirecta: row.ventaDirecta ? "Si" : "",
    codSunat: row.codSunat,
  }));
}

export function documentListOptions(
  data: DocumentsPrintData,
): BuildListPrintPreviewOptions<DocumentPrintColumnKey, DocumentPrintRow> {
  return {
    reportTitle: "Documentos",
    saleDate: data.saleDate,
    columns: data.columns,
    defaultColumns: DEFAULT_COLUMNS,
    rows: toPrintRows(data.rows),
    filterLabel: data.filterLabel,
    trailingRule: true,
    expandContentKeys: ["nombre"],
  };
}

export function buildDocumentsPrintPreview(data: DocumentsPrintData): PreviewRow[] {
  return buildListPrintPreview(documentListOptions(data));
}

export function buildDocumentsPlainText(data: DocumentsPrintData): string {
  return buildListPlainText(documentListOptions(data));
}

export function buildDocumentsPrintHtml(data: DocumentsPrintData): string {
  return buildListPrintHtmlFromRows(
    "Documentos",
    buildDocumentsPrintPreview(data),
    { pageOrientation: "landscape" },
  );
}
